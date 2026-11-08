/**
 * @file src/components/WebcamSplitPanel.tsx
 * @description Panneau rétractable et redimensionnable de la caméra en direct.
 * Capture le flux vidéo webcam via MediaPipe Hands & TensorFlow.js WASM,
 * dessine la superstructure squelettique style OpenCV sur Canvas et synchronise les mouvements de mains en temps réel.
 */


import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Camera as CameraIcon,
  VideoOff,
  RefreshCw,
  AlertCircle,
  X,
  Activity,
} from 'lucide-react';
import {
  buildLiveCameraCharacterPose,
  MediaPipeLandmark,
} from '../utils/handKinematicsSolver';
import { CharacterPose } from '../types/signs';

export type MediaPipeResults = {
  image: HTMLVideoElement | HTMLCanvasElement;
  multiHandLandmarks?: MediaPipeLandmark[][];
  multiHandedness?: Array<{ label: string; score: number }>;
};

// Chargeur dynamique de scripts CDN MediaPipe
function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
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

interface WebcamSplitPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onPoseUpdate: (pose: CharacterPose | null) => void;
  panelWidth: number;
  onResizePanel: (newWidth: number) => void;
}

// Connections squelettiques MediaPipe des 21 repères de la main
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

// Couleurs OpenCV par doigt
const FINGER_COLORS = {
  thumb: '#f59e0b',  // Ambre / Jaune
  index: '#06b6d4',  // Cyan
  middle: '#3b82f6', // Bleu
  ring: '#8b5cf6',   // Violet
  pinky: '#ec4899',  // Rose
  palm: '#10b981',   // Émeraude
};

export const WebcamSplitPanel: React.FC<WebcamSplitPanelProps> = ({
  isOpen,
  onClose,
  onPoseUpdate,
  panelWidth,
  onResizePanel,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(true);
  const [isMirrored, setIsMirrored] = useState(true);
  const [showMeshOverlay, setShowMeshOverlay] = useState(true);
  const [fps, setFps] = useState(0);
  const [detectedHandCount, setDetectedHandCount] = useState(0);
  const [handLabels, setHandLabels] = useState<string[]>([]);

  // Lissage cinématique
  const [smoothingFactor, setSmoothingFactor] = useState(0.4);

  // Redimensionnement par glissement de la poignée
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(panelWidth);

  // Compteurs FPS & Références MediaPipe
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const frameCountRef = useRef(0);
  const lastFpsTimeRef = useRef(performance.now());
  const handsInstanceRef = useRef<any>(null);
  const cameraInstanceRef = useRef<any>(null);

  // Basculer l'état de synchronisation avec le modèle
  const handleToggleSync = () => {
    const nextState = !isSyncing;
    setIsSyncing(nextState);
    if (!nextState) {
      onPoseUpdate(null);
    }
  };

  // Chargement et initialisation de MediaPipe au montage
  useEffect(() => {
    let isMounted = true;

    async function initMediaPipe() {
      try {
        await loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js');
        await loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js');

        const HandsConstructor = (window as any).Hands;
        if (!HandsConstructor) throw new Error('Hands module not loaded');

        const hands = new HandsConstructor({
          locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
        });

        hands.setOptions({
          maxNumHands: 2,
          modelComplexity: 1,
          minDetectionConfidence: 0.55,
          minTrackingConfidence: 0.55,
        });

        hands.onResults((results: MediaPipeResults) => {
          if (!isMounted) return;
          // ... [Logique de rendu et poseUpdate inchangée] ...
          frameCountRef.current++;
          const now = performance.now();
          if (now - lastFpsTimeRef.current >= 1000) {
            setFps(Math.round((frameCountRef.current * 1000) / (now - lastFpsTimeRef.current)));
            frameCountRef.current = 0;
            lastFpsTimeRef.current = now;
          }

          drawOpenCVOverlay(results);

          let leftHand: MediaPipeLandmark[] | null = null;
          let rightHand: MediaPipeLandmark[] | null = null;
          const labels: string[] = [];

          if (results.multiHandLandmarks && results.multiHandedness) {
            setDetectedHandCount(results.multiHandLandmarks.length);
            results.multiHandedness.forEach((handedness, idx) => {
              const label = handedness.label;
              const landmarks = results.multiHandLandmarks?.[idx] as MediaPipeLandmark[] | undefined;
              if (!landmarks) return;
              labels.push(label === 'Left' ? 'Main Gauche' : 'Main Droite');
              if (label === 'Left') leftHand = landmarks;
              else rightHand = landmarks;
            });
            setHandLabels(labels);
          } else {
            setDetectedHandCount(0);
            setHandLabels([]);
          }

          if (leftHand || rightHand) {
            const rawPose = buildLiveCameraCharacterPose(leftHand, rightHand);
            if (isSyncing) onPoseUpdate(rawPose);
          } else if (isSyncing) {
            onPoseUpdate(null);
          }
        });

        handsInstanceRef.current = hands;
      } catch (err) {
        console.error('MediaPipe Init Error:', err);
      }
    }

    initMediaPipe();

    return () => {
      isMounted = false;
      if (handsInstanceRef.current) {
        handsInstanceRef.current.close().catch(console.error);
        handsInstanceRef.current = null;
      }
    };
  }, []);

  // Démarrer la webcam
  const startCamera = useCallback(async () => {
    setCameraError(null);
    try {
      const CameraConstructor = (window as any).Camera;
      if (!CameraConstructor) throw new Error('Camera module not loaded');

      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      if (videoRef.current && handsInstanceRef.current) {
        const camera = new CameraConstructor(videoRef.current, {
          onFrame: async () => {
            if (videoRef.current && handsInstanceRef.current) {
              await handsInstanceRef.current.send({ image: videoRef.current });
            }
          },
          width: 640,
          height: 480,
        });

        await camera.start();
        cameraInstanceRef.current = camera;
      }

      setIsCameraActive(true);
    } catch (err: unknown) {
      // ... [Gestion erreur inchangée] ...
      let msg = 'Accès caméra refusé. Veuillez autoriser la caméra dans les paramètres de votre navigateur.';
      if (err instanceof Error && (err as any).name === 'NotAllowedError') {
         msg = 'Accès à la caméra refusé. Cliquez sur l\'icône de caméra dans la barre d\'adresse pour autoriser l\'accès.';
      } else if (err instanceof Error) {
         msg = `Erreur caméra : ${err.message}`;
      }
      setCameraError(msg);
      setIsCameraActive(false);
    }
  }, [onPoseUpdate]);


  // Arrêter la caméra et détruire les instances
  const stopCamera = useCallback(() => {
    if (cameraInstanceRef.current) {
      try {
        cameraInstanceRef.current.stop();
      } catch {
        // Ignorer
      }
      cameraInstanceRef.current = null;
    }

    if (handsInstanceRef.current) {
      try {
        handsInstanceRef.current.close();
      } catch {
        // Ignorer
      }
      handsInstanceRef.current = null;
    }

    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }

    setHandLabels([]);
    setFps(0);
    onPoseUpdate(null);
  }, [onPoseUpdate]);

  // Démarrer/arrêter la caméra selon l'ouverture du panneau
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

  // Rendu Canvas OpenCV-style (Squelette vectoriel, jointures et métriques)
  const drawOpenCVOverlay = (results: MediaPipeResults) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    ctx.save();
    ctx.clearRect(0, 0, width, height);

    // Dessiner le flux vidéo en arrière-plan
    if (results.image) {
      ctx.save();
      if (isMirrored) {
        ctx.translate(width, 0);
        ctx.scale(-1, 1);
      }
      ctx.drawImage(results.image, 0, 0, width, height);
      ctx.restore();
    }

    // Filtre assombrissant léger pour faire ressortir le squelette OpenCV
    ctx.fillStyle = 'rgba(15, 23, 42, 0.35)';
    ctx.fillRect(0, 0, width, height);

    if (showMeshOverlay && results.multiHandLandmarks) {
      results.multiHandLandmarks.forEach((landmarks, hIdx) => {
        ctx.save();
        if (isMirrored) {
          ctx.translate(width, 0);
          ctx.scale(-1, 1);
        }

        // 1. Tracer les segments de connexion squelettiques
        HAND_CONNECTIONS.forEach(([i, j]) => {
          const pt1 = landmarks[i];
          const pt2 = landmarks[j];

          const x1 = pt1.x * width;
          const y1 = pt1.y * height;
          const x2 = pt2.x * width;
          const y2 = pt2.y * height;

          // Déterminer la couleur selon le doigt
          let strokeColor = FINGER_COLORS.palm;
          if (j <= 4) strokeColor = FINGER_COLORS.thumb;
          else if (j <= 8) strokeColor = FINGER_COLORS.index;
          else if (j <= 12) strokeColor = FINGER_COLORS.middle;
          else if (j <= 16) strokeColor = FINGER_COLORS.ring;
          else strokeColor = FINGER_COLORS.pinky;

          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.strokeStyle = strokeColor;
          ctx.lineWidth = 3.5;
          ctx.lineCap = 'round';
          ctx.stroke();
        });

        // 2. Tracer les points d'articulation (Joint Nodes)
        landmarks.forEach((pt, pIdx) => {
          const x = pt.x * width;
          const y = pt.y * height;
          const zDepth = pt.z || 0;
          const radius = Math.max(3, 6 - zDepth * 15);

          ctx.beginPath();
          ctx.arc(x, y, radius, 0, Math.PI * 2);
          ctx.fillStyle = pIdx === 0 ? '#38bdf8' : '#ffffff';
          ctx.fill();
          ctx.strokeStyle = '#0284c7';
          ctx.lineWidth = 1.5;
          ctx.stroke();

          // Afficher le numéro d'index de joint OpenCV sur les bouts de doigts
          if ([4, 8, 12, 16, 20].includes(pIdx)) {
            ctx.fillStyle = '#0f172a';
            ctx.font = 'bold 9px sans-serif';
            ctx.fillText(String(pIdx), x - 3, y + 3);
          }
        });

        // 3. Dessiner la boîte englobante (Bounding Box OpenCV)
        let minX = width;
        let minY = height;
        let maxX = 0;
        let maxY = 0;

        landmarks.forEach((pt) => {
          const px = pt.x * width;
          const py = pt.y * height;
          if (px < minX) minX = px;
          if (py < minY) minY = py;
          if (px > maxX) maxX = px;
          if (py > maxY) maxY = py;
        });

        const pad = 12;
        minX = Math.max(0, minX - pad);
        minY = Math.max(0, minY - pad);
        maxX = Math.min(width, maxX + pad);
        maxY = Math.min(height, maxY + pad);

        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(minX, minY, maxX - minX, maxY - minY);
        ctx.setLineDash([]);

        // Libellé de main sur le rectangle
        const handLabel = results.multiHandedness?.[hIdx]?.label === 'Left' ? 'MAIN GAUCHE' : 'MAIN DROITE';
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(minX, minY - 18, 90, 18);
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 10px sans-serif';
        ctx.fillText(handLabel, minX + 6, minY - 5);

        ctx.restore();
      });
    }

    ctx.restore();
  };

  // Gestion du glissement pour le redimensionnement du panneau
  const handleMouseDownResize = (e: React.MouseEvent) => {
    isDraggingRef.current = true;
    startXRef.current = e.clientX;
    startWidthRef.current = panelWidth;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const deltaX = startXRef.current - moveEvent.clientX;
      const newW = Math.max(280, Math.min(640, startWidthRef.current + deltaX));
      onResizePanel(newW);
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
      className="relative h-full bg-slate-900 border-l border-slate-800 flex flex-col shadow-2xl z-20 shrink-0 transition-all duration-75"
    >
      {/* Poignée de redimensionnement verticale à gauche */}
      <div
        onMouseDown={handleMouseDownResize}
        title="Glisser pour redimensionner le panneau caméra"
        className="absolute top-0 bottom-0 left-0 w-2 cursor-col-resize hover:bg-sky-500/50 active:bg-sky-400 z-30 transition-colors flex items-center justify-center group"
      >
        <div className="w-0.5 h-8 bg-slate-600 group-hover:bg-white rounded-full" />
      </div>

      {/* En-tête du panneau Caméra OpenCV & MediaPipe */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-950 border-b border-slate-800">
        <div className="flex items-center space-x-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
          <span className="font-bold text-sm text-slate-100 tracking-tight">Caméra Motion Capture</span>
        </div>

        <div className="flex items-center space-x-1.5">
          <button
            type="button"
            onClick={handleToggleSync}
            className={`px-2 py-1 rounded text-xs font-semibold flex items-center space-x-1 transition-colors ${
              isSyncing
                ? 'bg-sky-500 text-white shadow-xs'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
            title="Activer/Désactiver la synchronisation directe avec le modèle 3D/2D"
          >
            <Activity className="w-3 h-3" />
            <span>{isSyncing ? 'Synchro ON' : 'Synchro OFF'}</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Fermer le panneau caméra"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Zone vidéo et Canvas d'analyse cinématique */}
      <div className="relative flex-1 bg-slate-950 overflow-hidden flex items-center justify-center">
        {/* Élément Video masqué (utilisé pour alimenter MediaPipe) */}
        <video
          ref={videoRef}
          playsInline
          muted
          className="hidden"
          width={640}
          height={480}
        />

        {/* Canvas de dessin OpenCV Overlay */}
        <canvas
          ref={canvasRef}
          width={640}
          height={480}
          className="w-full h-auto object-contain bg-slate-950 aspect-[4/3]"
        />

        {/* Indicateur de chargement ou Erreur */}
        {!isCameraActive && !cameraError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/90 p-4 text-center space-y-3 z-10">
            <RefreshCw className="w-8 h-8 text-sky-400 animate-spin" />
            <p className="text-sm font-medium text-slate-200">Initialisation de la caméra & MediaPipe Hands...</p>
            <p className="text-xs text-slate-400">Chargement des modèles WASM TensorFlow.js</p>
          </div>
        )}

        {cameraError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/95 p-6 text-center space-y-4 z-10">
            <AlertCircle className="w-10 h-10 text-rose-500" />
            <div className="space-y-1">
              <p className="text-sm font-bold text-rose-300">Accès à la caméra refusé</p>
              <div className="text-xs text-slate-400 text-left max-w-xs space-y-2 mt-2">
                <p>Pour autoriser l'accès :</p>
                <ol className="list-decimal pl-4 space-y-1">
                  <li>Cliquez sur l'icône <span className="font-bold text-white">Cadenas</span> ou <span className="font-bold text-white">Caméra</span> dans la barre d'adresse.</li>
                  <li>Cherchez l'option <span className="font-bold text-white">Caméra</span>.</li>
                  <li>Passez-la sur <span className="font-bold text-white">Autoriser</span>.</li>
                  <li><span className="font-bold text-white">Actualisez</span> la page (F5).</li>
                </ol>
              </div>
            </div>
            
            <button
              type="button"
              onClick={startCamera}
              className="px-4 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-white text-xs font-semibold transition-colors"
            >
              Réessayer après autorisation
            </button>
          </div>
        )}

        {/* HUD des métriques OpenCV en superpesanteur haut-gauche */}
        {isCameraActive && (
          <div className="absolute top-2 left-2 z-10 bg-slate-900/85 backdrop-blur-xs border border-slate-800 rounded-md p-2 text-xs space-y-1 text-slate-300">
            <div className="flex items-center space-x-2 font-mono text-[11px]">
              <span className="text-sky-400 font-bold">OpenCV / MediaPipe</span>
              <span className="text-slate-500">|</span>
              <span className="text-emerald-400">{fps} FPS</span>
            </div>
            <div className="flex items-center space-x-1 text-[11px]">
              <span className="text-slate-400">Mains détectées:</span>
              <span className="font-bold text-white">{detectedHandCount}</span>
            </div>
            {handLabels.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-0.5">
                {handLabels.map((lbl, i) => (
                  <span key={i} className="px-1.5 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-800 text-[10px]">
                    {lbl}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Barre d'outils et réglages caméra bas de panneau */}
      <div className="p-3 bg-slate-950 border-t border-slate-800 space-y-2.5">
        <div className="flex items-center justify-between text-xs text-slate-300">
          <label className="flex items-center space-x-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={isMirrored}
              onChange={(e) => setIsMirrored(e.target.checked)}
              className="rounded border-slate-700 bg-slate-800 text-sky-500 focus:ring-0"
            />
            <span>Mode Miroir (Inverser)</span>
          </label>

          <label className="flex items-center space-x-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={showMeshOverlay}
              onChange={(e) => setShowMeshOverlay(e.target.checked)}
              className="rounded border-slate-700 bg-slate-800 text-sky-500 focus:ring-0"
            />
            <span>Superstructure OpenCV</span>
          </label>
        </div>

        {/* Curseur de lissage */}
        <div className="space-y-1">
          <div className="flex justify-between text-[11px] text-slate-400">
            <span>Sensibilité du mouvement</span>
            <span className="text-sky-400 font-mono">{Math.round(smoothingFactor * 100)}%</span>
          </div>
          <input
            type="range"
            min="0.1"
            max="1.0"
            step="0.05"
            value={smoothingFactor}
            onChange={(e) => setSmoothingFactor(parseFloat(e.target.value))}
            className="w-full accent-sky-500 bg-slate-800 h-1.5 rounded-lg cursor-pointer"
          />
        </div>

        {/* Bouton de relancement */}
        <button
          type="button"
          onClick={isCameraActive ? stopCamera : startCamera}
          className={`w-full py-2 rounded-lg text-xs font-bold flex items-center justify-center space-x-2 transition-colors ${
            isCameraActive
              ? 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30'
              : 'bg-sky-500 hover:bg-sky-400 text-white shadow-md'
          }`}
        >
          {isCameraActive ? (
            <>
              <VideoOff className="w-3.5 h-3.5" />
              <span>Désactiver la caméra</span>
            </>
          ) : (
            <>
              <CameraIcon className="w-3.5 h-3.5" />
              <span>Activer la caméra</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
};
