/**
 * @file src/components/WebcamSplitPanel.tsx
 * @description Panneau de capture caméra en direct avec IA MediaPipe Hands.
 * Affiche directement le flux vidéo webcam réel via un rendu Canvas 60 FPS garanti
 * et superpose le squelette de détection des mains (style OpenCV avec repères articulaires).
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Camera as CameraIcon,
  VideoOff,
  RefreshCw,
  AlertCircle,
  X,
  Activity,
  Layers,
  FlipHorizontal,
  Lock,
  CheckCircle2,
} from 'lucide-react';
import {
  buildLiveCameraCharacterPose,
  MediaPipeLandmark,
} from '../utils/handKinematicsSolver';
import { CharacterPose } from '../types/signs';

// Version stable figée de MediaPipe Hands
const MEDIAPIPE_HANDS_VERSION = '0.4.1675469240';

export interface MediaPipeResults {
  multiHandLandmarks?: MediaPipeLandmark[][];
  multiHandedness?: Array<{ label: string; score: number }>;
}

interface WebcamSplitPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onPoseUpdate: (pose: CharacterPose | null) => void;
  panelWidth: number;
  onResizePanel: (newWidth: number) => void;
}

// Connexions squelettiques standard MediaPipe (21 points)
const HAND_CONNECTIONS: Array<[number, number]> = [
  // Pouce
  [0, 1], [1, 2], [2, 3], [3, 4],
  // Index
  [0, 5], [5, 6], [6, 7], [7, 8],
  // Majeur
  [9, 10], [10, 11], [11, 12],
  // Annulaire
  [13, 14], [14, 15], [15, 16],
  // Auriculaire
  [0, 17], [17, 18], [18, 19], [19, 20],
  // Paume
  [5, 9], [9, 13], [13, 17],
];

// Palette de couleurs pour chaque doigt (style OpenCV)
const FINGER_COLORS = {
  thumb: '#f59e0b',   // Ambre
  index: '#06b6d4',   // Cyan
  middle: '#3b82f6',  // Bleu
  ring: '#8b5cf6',    // Violet
  pinky: '#ec4899',   // Rose
  palm: '#10b981',    // Émeraude
};

// Helper pour charger dynamiquement un script dans le DOM si nécessaire
function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window !== 'undefined' && (window as any).Hands) {
      resolve();
      return;
    }
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`);
    if (existing) {
      if ((window as any).Hands) {
        resolve();
      } else {
        existing.addEventListener('load', () => resolve(), { once: true });
        existing.addEventListener('error', (err) => reject(err), { once: true });
        const checkInterval = setInterval(() => {
          if ((window as any).Hands) {
            clearInterval(checkInterval);
            resolve();
          }
        }, 50);
        setTimeout(() => clearInterval(checkInterval), 6000);
      }
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.crossOrigin = 'anonymous';
    script.onload = () => resolve();
    script.onerror = (err) => reject(err);
    document.head.appendChild(script);
  });
}

export const WebcamSplitPanel: React.FC<WebcamSplitPanelProps> = ({
  isOpen,
  onClose,
  onPoseUpdate,
  panelWidth,
  onResizePanel,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // États du flux vidéo
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [isStreamReady, setIsStreamReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isPermissionDenied, setIsPermissionDenied] = useState(false);
  const [isModelLoading, setIsModelLoading] = useState(false);
  const [modelReady, setModelReady] = useState(false);

  // Options d'affichage
  const [isSyncing, setIsSyncing] = useState(true);
  const [isMirrored, setIsMirrored] = useState(true);
  const [showMeshOverlay, setShowMeshOverlay] = useState(true);

  // Métriques en temps réel
  const [fps, setFps] = useState(0);
  const [detectedHands, setDetectedHands] = useState<string[]>([]);

  // Références d'exécution et de rendu
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const handsInstanceRef = useRef<any>(null);
  const isDetectingRef = useRef(false);
  const renderLoopIdRef = useRef<number | null>(null);
  const lastResultsRef = useRef<MediaPipeResults | null>(null);
  const frameCountRef = useRef(0);
  const lastFpsTimestampRef = useRef(performance.now());

  // Références stables pour éviter les cycles de closure
  const isSyncingRef = useRef(isSyncing);
  useEffect(() => {
    isSyncingRef.current = isSyncing;
  }, [isSyncing]);

  const onPoseUpdateRef = useRef(onPoseUpdate);
  useEffect(() => {
    onPoseUpdateRef.current = onPoseUpdate;
  }, [onPoseUpdate]);

  const showMeshOverlayRef = useRef(showMeshOverlay);
  useEffect(() => {
    showMeshOverlayRef.current = showMeshOverlay;
  }, [showMeshOverlay]);

  // Redimensionnement de la poignée latérale
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(panelWidth);

  /**
   * 1. Charger et initialiser le moteur IA MediaPipe Hands
   */
  const initMediaPipeHands = useCallback(async () => {
    if (handsInstanceRef.current) return handsInstanceRef.current;

    setIsModelLoading(true);
    try {
      if (!(window as any).Hands) {
        await loadScript(
          `https://cdn.jsdelivr.net/npm/@mediapipe/hands@${MEDIAPIPE_HANDS_VERSION}/hands.js`
        );
      }

      const HandsConstructor = (window as any).Hands;
      if (!HandsConstructor) {
        throw new Error('Constructeur MediaPipe Hands non disponible.');
      }

      const hands = new HandsConstructor({
        locateFile: (file: string) => {
          if (file.startsWith('http://') || file.startsWith('https://')) return file;
          return `https://cdn.jsdelivr.net/npm/@mediapipe/hands@${MEDIAPIPE_HANDS_VERSION}/${file}`;
        },
      });

      // Modèle allégé ultra-rapide (modelComplexity: 0) avec confiance équilibrée pour webcam
      hands.setOptions({
        maxNumHands: 2,
        modelComplexity: 0,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      hands.onResults((results: MediaPipeResults) => {
        lastResultsRef.current = results;

        let leftHandLandmarks: MediaPipeLandmark[] | null = null;
        let rightHandLandmarks: MediaPipeLandmark[] | null = null;
        const labels: string[] = [];

        if (
          results.multiHandLandmarks &&
          results.multiHandedness &&
          results.multiHandLandmarks.length > 0
        ) {
          results.multiHandLandmarks.forEach((landmarks, index) => {
            const handedness = results.multiHandedness?.[index];
            const label = handedness?.label || 'Hand';
            labels.push(label === 'Left' ? 'Main Gauche' : 'Main Droite');

            if (label === 'Left') {
              leftHandLandmarks = landmarks;
            } else {
              rightHandLandmarks = landmarks;
            }
          });

          setDetectedHands(labels);

          // Transmission cinématique temps réel vers l'avatar 3D / 2D
          if (leftHandLandmarks || rightHandLandmarks) {
            const characterPose = buildLiveCameraCharacterPose(
              leftHandLandmarks,
              rightHandLandmarks
            );
            if (isSyncingRef.current) {
              onPoseUpdateRef.current(characterPose);
            }
          }
        } else {
          setDetectedHands([]);
          if (isSyncingRef.current) {
            onPoseUpdateRef.current(null);
          }
        }
      });

      // Initialisation explicite du graphe WASM et du modèle IA
      await hands.initialize();

      handsInstanceRef.current = hands;
      setIsModelLoading(false);
      setModelReady(true);
      return hands;
    } catch (err) {
      console.warn('Initialisation MediaPipe reportée:', err);
      setIsModelLoading(false);
      setModelReady(false);
      return null;
    }
  }, []);

  /**
   * 2. Dessiner le squelette vectoriel des mains (style OpenCV)
   */
  const drawSkeletalMesh = (
    ctx: CanvasRenderingContext2D,
    results: MediaPipeResults,
    width: number,
    height: number
  ) => {
    if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) return;

    results.multiHandLandmarks.forEach((landmarks, index) => {
      const handedness = results.multiHandedness?.[index];
      const isLeft = handedness?.label === 'Left';

      // 1. Tracer les segments de connexion articulaires
      HAND_CONNECTIONS.forEach(([startIndex, endIndex]) => {
        const start = landmarks[startIndex];
        const end = landmarks[endIndex];
        if (!start || !end) return;

        let strokeColor = FINGER_COLORS.palm;
        if (endIndex <= 4) strokeColor = FINGER_COLORS.thumb;
        else if (endIndex <= 8) strokeColor = FINGER_COLORS.index;
        else if (endIndex <= 12) strokeColor = FINGER_COLORS.middle;
        else if (endIndex <= 16) strokeColor = FINGER_COLORS.ring;
        else strokeColor = FINGER_COLORS.pinky;

        ctx.beginPath();
        ctx.moveTo(start.x * width, start.y * height);
        ctx.lineTo(end.x * width, end.y * height);
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 3.5;
        ctx.lineCap = 'round';
        ctx.stroke();
      });

      // 2. Tracer les 21 points d'articulation avec halo OpenCV
      landmarks.forEach((point, pIdx) => {
        const px = point.x * width;
        const py = point.y * height;

        // Disque externe coloré
        ctx.beginPath();
        ctx.arc(px, py, pIdx === 0 ? 6 : 4.5, 0, 2 * Math.PI);
        ctx.fillStyle = pIdx === 0 ? '#38bdf8' : '#ffffff';
        ctx.fill();
        ctx.strokeStyle = '#0284c7';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      });

      // 3. Boîte englobante OpenCV (Bounding Box)
      let minX = width;
      let minY = height;
      let maxX = 0;
      let maxY = 0;

      landmarks.forEach((p) => {
        const px = p.x * width;
        const py = p.y * height;
        if (px < minX) minX = px;
        if (py < minY) minY = py;
        if (px > maxX) maxX = px;
        if (py > maxY) maxY = py;
      });

      const pad = 14;
      minX = Math.max(0, minX - pad);
      minY = Math.max(0, minY - pad);
      maxX = Math.min(width, maxX + pad);
      maxY = Math.min(height, maxY + pad);

      ctx.strokeStyle = isLeft ? '#06b6d4' : '#10b981';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(minX, minY, maxX - minX, maxY - minY);
      ctx.setLineDash([]);

      // Étiquette OpenCV sur la main
      const labelText = isLeft ? 'Main Gauche (LSF)' : 'Main Droite (LSF)';
      ctx.font = 'bold 11px sans-serif';
      const textWidth = ctx.measureText(labelText).width;
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(minX, Math.max(0, minY - 20), textWidth + 10, 18);
      ctx.fillStyle = isLeft ? '#38bdf8' : '#34d399';
      ctx.fillText(labelText, minX + 5, Math.max(13, minY - 6));
    });
  };

  /**
   * 3. Réticule de détection visuel lorsque les mains entrent dans le champ
   */
  const drawDetectionGuide = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number
  ) => {
    // Coins de repère de ciblage
    const marginX = width * 0.15;
    const marginY = height * 0.15;
    const cornerSize = 24;

    ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
    ctx.lineWidth = 2;

    // Haut-Gauche
    ctx.beginPath();
    ctx.moveTo(marginX, marginY + cornerSize);
    ctx.lineTo(marginX, marginY);
    ctx.lineTo(marginX + cornerSize, marginY);
    ctx.stroke();

    // Haut-Droite
    ctx.beginPath();
    ctx.moveTo(width - marginX - cornerSize, marginY);
    ctx.lineTo(width - marginX, marginY);
    ctx.lineTo(width - marginX, marginY + cornerSize);
    ctx.stroke();

    // Bas-Gauche
    ctx.beginPath();
    ctx.moveTo(marginX, height - marginY - cornerSize);
    ctx.lineTo(marginX, height - marginY);
    ctx.lineTo(marginX + cornerSize, height - marginY);
    ctx.stroke();

    // Bas-Droite
    ctx.beginPath();
    ctx.moveTo(width - marginX - cornerSize, height - marginY);
    ctx.lineTo(width - marginX, height - marginY);
    ctx.lineTo(width - marginX, height - marginY - cornerSize);
    ctx.stroke();
  };

  /**
   * 4. Boucle de rendu Canvas 60 FPS permanente
   */
  const startRenderLoop = useCallback(() => {
    if (renderLoopIdRef.current) {
      cancelAnimationFrame(renderLoopIdRef.current);
      renderLoopIdRef.current = null;
    }

    const tick = () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (video && canvas && video.readyState >= 2) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          // Ajuster les dimensions du canvas au flux caméra
          if (video.videoWidth > 0 && video.videoHeight > 0) {
            if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
              canvas.width = video.videoWidth;
              canvas.height = video.videoHeight;
            }
          }

          // A. Dessin du flux réel webcam
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

          // B. Dessin du squelette des mains ou du réticule de ciblage
          if (
            showMeshOverlayRef.current &&
            lastResultsRef.current?.multiHandLandmarks &&
            lastResultsRef.current.multiHandLandmarks.length > 0
          ) {
            drawSkeletalMesh(ctx, lastResultsRef.current, canvas.width, canvas.height);
          } else if (showMeshOverlayRef.current) {
            drawDetectionGuide(ctx, canvas.width, canvas.height);
          }

          // C. Calcul du taux FPS réel
          frameCountRef.current++;
          const now = performance.now();
          if (now - lastFpsTimestampRef.current >= 1000) {
            setFps(
              Math.round(
                (frameCountRef.current * 1000) / (now - lastFpsTimestampRef.current)
              )
            );
            frameCountRef.current = 0;
            lastFpsTimestampRef.current = now;
          }

          setIsStreamReady(true);
        }

        // D. Transmission de trames vers l'IA MediaPipe
        const hands = handsInstanceRef.current;
        if (hands && !isDetectingRef.current && !video.paused && !video.ended) {
          isDetectingRef.current = true;
          hands
            .send({ image: video })
            .catch(() => {
              // Repli d'image via canvas si nécessaire
              if (canvas) {
                return hands.send({ image: canvas }).catch(() => {});
              }
            })
            .finally(() => {
              isDetectingRef.current = false;
            });
        }
      }

      renderLoopIdRef.current = requestAnimationFrame(tick);
    };

    renderLoopIdRef.current = requestAnimationFrame(tick);
  }, []);

  /**
   * 5. Démarrer le flux caméra matériel via getUserMedia
   */
  const startCamera = useCallback(async () => {
    setCameraError(null);
    setIsPermissionDenied(false);
    setIsStarting(true);
    setIsStreamReady(false);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("L'API vidéo n'est pas supportée dans ce navigateur.");
      }

      // Nettoyer toute piste active précédente
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: 'user',
          },
          audio: false,
        });
      } catch (firstErr) {
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }

      // Activer explicitement toutes les pistes vidéo
      stream.getVideoTracks().forEach((t) => {
        t.enabled = true;
      });

      streamRef.current = stream;

      const video = videoRef.current;
      if (video) {
        video.muted = true;
        video.defaultMuted = true;
        video.playsInline = true;
        video.setAttribute('playsinline', 'true');
        video.setAttribute('muted', 'true');
        video.setAttribute('autoplay', 'true');
        video.srcObject = stream;

        // Attente de l'état prêt des trames
        await new Promise<void>((resolve) => {
          const onReady = () => {
            video.removeEventListener('loadeddata', onReady);
            video.removeEventListener('canplay', onReady);
            resolve();
          };
          if (video.readyState >= 2) {
            resolve();
          } else {
            video.addEventListener('loadeddata', onReady, { once: true });
            video.addEventListener('canplay', onReady, { once: true });
            setTimeout(resolve, 800);
          }
        });

        try {
          await video.play();
        } catch (playErr) {
          console.warn('Lecture vidéo différée:', playErr);
        }
      }

      setIsCameraActive(true);
      setIsStarting(false);

      // Démarrage instantané de l'affichage vidéo 60 FPS
      startRenderLoop();

      // Démarrage du modèle IA MediaPipe
      initMediaPipeHands().catch((mpErr) => {
        console.warn('MediaPipe initialisation différée:', mpErr);
      });
    } catch (err: unknown) {
      setIsStarting(false);
      setIsCameraActive(false);
      setIsStreamReady(false);

      let msg = 'Impossible d’accéder à la caméra.';
      let permissionDenied = false;

      if (err instanceof Error) {
        if (
          err.name === 'NotAllowedError' ||
          err.name === 'PermissionDeniedError' ||
          err.message.toLowerCase().includes('permission')
        ) {
          permissionDenied = true;
          msg = 'Autorisation requise : veuillez autoriser l’accès à la caméra pour activer le suivi en direct.';
          console.warn('Accès caméra en attente d’autorisation:', err.message);
        } else if (
          err.name === 'NotFoundError' ||
          err.name === 'DevicesNotFoundError'
        ) {
          msg = 'Aucun périphérique caméra détecté sur cet appareil.';
          console.warn('Caméra non détectée:', err.message);
        } else if (
          err.name === 'NotReadableError' ||
          err.name === 'TrackStartError'
        ) {
          msg = 'La caméra est déjà utilisée par une autre application.';
          console.warn('Périphérique caméra occupé:', err.message);
        } else {
          msg = err.message;
          console.warn('Erreur accès caméra:', err.message);
        }
      } else {
        console.warn('Erreur inconnue caméra:', err);
      }

      setIsPermissionDenied(permissionDenied);
      setCameraError(msg);
    }
  }, [initMediaPipeHands, startRenderLoop]);

  /**
   * 6. Arrêter la caméra et libérer les périphériques
   */
  const stopCamera = useCallback(() => {
    if (renderLoopIdRef.current) {
      cancelAnimationFrame(renderLoopIdRef.current);
      renderLoopIdRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.stop();
      });
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
    }

    lastResultsRef.current = null;
    setIsCameraActive(false);
    setIsStarting(false);
    setIsStreamReady(false);
    setCameraError(null);
    setIsPermissionDenied(false);
    setDetectedHands([]);
    setFps(0);
    onPoseUpdateRef.current(null);
  }, []);

  // Cycle de vie selon l'ouverture du volet
  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, startCamera, stopCamera]);

  // Nettoyage au démontage final
  useEffect(() => {
    return () => {
      if (renderLoopIdRef.current) {
        cancelAnimationFrame(renderLoopIdRef.current);
      }
      if (handsInstanceRef.current) {
        try {
          handsInstanceRef.current.close();
        } catch {
          // Ignorer
        }
        handsInstanceRef.current = null;
      }
    };
  }, []);

  /**
   * Redimensionnement par glissement latéral
   */
  const handleMouseDownResize = (e: React.MouseEvent) => {
    isDraggingRef.current = true;
    startXRef.current = e.clientX;
    startWidthRef.current = panelWidth;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const deltaX = startXRef.current - moveEvent.clientX;
      const newWidth = Math.max(280, Math.min(720, startWidthRef.current + deltaX));
      onResizePanel(newWidth);
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  if (!isOpen) return null;

  return (
    <aside
      style={{ width: `${panelWidth}px` }}
      className="relative h-full bg-slate-900 border-l border-slate-800 flex flex-col shadow-2xl z-20 shrink-0 transition-all duration-75 select-none"
    >
      {/* Poignée de redimensionnement */}
      <div
        onMouseDown={handleMouseDownResize}
        title="Glisser pour redimensionner"
        className="absolute top-0 bottom-0 left-0 w-2 cursor-col-resize hover:bg-sky-500/50 z-30 transition-colors flex items-center justify-center group"
      >
        <div className="w-0.5 h-8 bg-slate-600 group-hover:bg-white rounded-full" />
      </div>

      {/* En-tête du panneau */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-950 border-b border-slate-800 shrink-0">
        <div className="flex items-center space-x-2">
          <div
            className={`w-2.5 h-2.5 rounded-full ${
              isCameraActive && isStreamReady
                ? 'bg-emerald-500 animate-pulse'
                : 'bg-slate-500'
            }`}
          />
          <span className="font-bold text-xs text-slate-100 uppercase tracking-wider">
            Caméra Live LSF
          </span>
        </div>

        <div className="flex items-center space-x-1.5">
          <button
            type="button"
            onClick={() => {
              const next = !isSyncing;
              setIsSyncing(next);
              if (!next) onPoseUpdate(null);
            }}
            className={`px-2 py-1 rounded text-[10px] font-bold transition-colors flex items-center space-x-1 ${
              isSyncing ? 'bg-sky-500 text-white' : 'bg-slate-800 text-slate-400'
            }`}
            title="Activer ou suspendre la synchronisation avec l'avatar 3D"
          >
            <Activity className="w-3 h-3" />
            <span>{isSyncing ? 'SYNCHRO ON' : 'SYNCHRO OFF'}</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Fermer le panneau caméra"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Zone d'affichage vidéo et squelette OpenCV */}
      <div className="relative flex-1 min-h-0 w-full bg-black overflow-hidden flex items-center justify-center">
        {/* Conteneur avec effet miroir CSS synchronisé */}
        <div
          className={`relative w-full h-full flex items-center justify-center ${
            isMirrored ? 'scale-x-[-1]' : ''
          }`}
        >
          {/* Vidéo source de capture matérielle (non-masquée pour garantir le décodage GPU WebGL) */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="absolute inset-0 w-full h-full object-cover pointer-events-none -z-10"
          />

          {/* Canvas principal composite (Affiche le flux webcam réel + le squelette OpenCV) */}
          <canvas
            ref={canvasRef}
            width={640}
            height={480}
            className="w-full h-full object-cover"
          />
        </div>

        {/* Chargement initial lors de l'accès caméra */}
        {(isStarting || (!isStreamReady && isCameraActive && !cameraError)) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/90 space-y-3 z-10 p-4 text-center">
            <RefreshCw className="w-7 h-7 text-sky-400 animate-spin" />
            <p className="text-xs font-semibold text-slate-200">
              Connexion au flux vidéo caméra...
            </p>
            <p className="text-[10px] text-slate-400">Activation du capteur webcam réel</p>
          </div>
        )}

        {/* État de chargement du modèle IA en tâche de fond */}
        {isCameraActive && isStreamReady && isModelLoading && (
          <div className="absolute bottom-3 left-3 z-10 bg-slate-950/85 border border-slate-800 px-2.5 py-1.5 rounded text-[10px] text-sky-400 flex items-center space-x-1.5 backdrop-blur-xs">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            <span>Chargement IA MediaPipe Hands...</span>
          </div>
        )}

        {/* Gestion des erreurs de permission */}
        {cameraError && !isStarting && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/95 p-6 text-center space-y-4 z-10">
            {isPermissionDenied ? (
              <Lock className="w-10 h-10 text-amber-400" />
            ) : (
              <AlertCircle className="w-10 h-10 text-rose-500" />
            )}
            <div className="space-y-1.5">
              <p
                className={`text-xs font-bold uppercase tracking-wide ${
                  isPermissionDenied ? 'text-amber-300' : 'text-rose-300'
                }`}
              >
                {isPermissionDenied ? 'Autorisation caméra requise' : 'Accès caméra indisponible'}
              </p>
              <p className="text-xs text-slate-300 max-w-xs">{cameraError}</p>

              {isPermissionDenied && (
                <div className="text-[11px] text-slate-400 text-left bg-slate-900 p-3 rounded-lg border border-slate-800 space-y-1 mt-3">
                  <p className="font-semibold text-slate-200">Pour autoriser la caméra :</p>
                  <ol className="list-decimal pl-4 space-y-1 text-slate-400">
                    <li>
                      Cliquez sur le bouton ci-dessous pour déclencher la demande du navigateur.
                    </li>
                    <li>
                      Si bloquée, cliquez sur le <strong className="text-white">cadenas</strong> dans l’adresse du navigateur et choisissez <strong className="text-emerald-400">Autoriser</strong>.
                    </li>
                  </ol>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={startCamera}
              className="px-4 py-2.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-white text-xs font-bold transition-all shadow-md shadow-sky-500/20 flex items-center space-x-2"
            >
              <CameraIcon className="w-4 h-4" />
              <span>{isPermissionDenied ? 'Autoriser et activer la caméra' : 'Réessayer d’activer la caméra'}</span>
            </button>
          </div>
        )}

        {/* HUD Métriques en haut à gauche */}
        {isCameraActive && isStreamReady && !cameraError && (
          <div className="absolute top-3 left-3 z-10 bg-slate-950/80 backdrop-blur-sm border border-slate-800 px-2.5 py-1.5 rounded-lg text-slate-300 space-y-1">
            <div className="flex items-center space-x-2 text-[10px] font-mono">
              <span className="text-sky-400 font-bold">{fps} FPS</span>
              <span className="text-slate-600">|</span>
              <div className="flex items-center space-x-1">
                {modelReady && <CheckCircle2 className="w-3 h-3 text-emerald-400 inline" />}
                <span className={detectedHands.length > 0 ? 'text-emerald-400 font-bold' : 'text-slate-400'}>
                  {detectedHands.length > 0 ? detectedHands.join(' + ') : 'Placez vos mains face caméra'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Barre de contrôles inférieure */}
      <div className="p-3 bg-slate-950 border-t border-slate-800 space-y-3 shrink-0">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <label className="flex items-center space-x-1.5 cursor-pointer hover:text-slate-200 transition-colors">
            <input
              type="checkbox"
              checked={isMirrored}
              onChange={(e) => setIsMirrored(e.target.checked)}
              className="rounded border-slate-700 bg-slate-800 text-sky-500 focus:ring-0"
            />
            <FlipHorizontal className="w-3.5 h-3.5" />
            <span className="text-[11px]">Mode Miroir</span>
          </label>

          <label className="flex items-center space-x-1.5 cursor-pointer hover:text-slate-200 transition-colors">
            <input
              type="checkbox"
              checked={showMeshOverlay}
              onChange={(e) => setShowMeshOverlay(e.target.checked)}
              className="rounded border-slate-700 bg-slate-800 text-sky-500 focus:ring-0"
            />
            <Layers className="w-3.5 h-3.5" />
            <span className="text-[11px]">Squelette OpenCV</span>
          </label>
        </div>

        {/* Bouton bascule Activer / Désactiver caméra */}
        <button
          type="button"
          onClick={isCameraActive ? stopCamera : startCamera}
          className={`w-full py-2.5 rounded-lg text-xs font-bold flex items-center justify-center space-x-2 transition-all ${
            isCameraActive
              ? 'bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 border border-rose-500/30'
              : 'bg-sky-500 hover:bg-sky-400 text-white shadow-lg shadow-sky-500/20'
          }`}
        >
          {isCameraActive ? (
            <>
              <VideoOff className="w-4 h-4" />
              <span>Désactiver la caméra</span>
            </>
          ) : (
            <>
              <CameraIcon className="w-4 h-4" />
              <span>Activer la caméra</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
};
