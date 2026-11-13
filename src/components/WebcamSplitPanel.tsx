/**
 * @file src/components/WebcamSplitPanel.tsx
 * @description Panneau caméra en direct propulsé par @mediapipe/tasks-vision (GPU WebGL).
 * Combine HandLandmarker (21 points/main) + PoseLandmarker (haut du corps : épaules, coudes, torse, tête),
 * capture HD 720p, miroir Canvas corrigé (étiquettes lisibles), lissage One-Euro anti-tremblement et persistance temporelle.
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
  Cpu,
} from 'lucide-react';
import {
  FilesetResolver,
  HandLandmarker,
  PoseLandmarker,
  HandLandmarkerResult,
  PoseLandmarkerResult,
} from '@mediapipe/tasks-vision';
import {
  buildLiveCameraCharacterPose,
  assignHandsToSide,
  PoseSmoother,
  MediaPipeLandmark,
} from '../utils/handKinematicsSolver';
import { CharacterPose } from '../types/signs';

// Version WASM alignée avec @mediapipe/tasks-vision@1.2.3
const TASKS_VISION_WASM_URL =
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.2.3/wasm';
const HAND_MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';
const POSE_MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task';

// Délai de grâce (ms) pour éviter le clignotement si une frame est perdue en mouvement rapide
const POSE_PERSISTENCE_MS = 220;

interface WebcamSplitPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onPoseUpdate: (pose: CharacterPose | null) => void;
  panelWidth: number;
  onResizePanel: (newWidth: number) => void;
}

// Connexions squelettiques standard des mains (21 points)
const HAND_CONNECTIONS: Array<[number, number]> = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [9, 10], [10, 11], [11, 12],
  [13, 14], [14, 15], [15, 16],
  [0, 17], [17, 18], [18, 19], [19, 20],
  [5, 9], [9, 13], [13, 17],
];

// Connexions squelettiques du haut du corps (PoseLandmarker)
const UPPER_BODY_CONNECTIONS: Array<[number, number]> = [
  [11, 12], // Ligne d'épaules
  [11, 13], // Bras gauche
  [13, 15], // Avant-bras gauche
  [12, 14], // Bras droit
  [14, 16], // Avant-bras droit
  [11, 23], // Flanc gauche
  [12, 24], // Flanc droit
  [23, 24], // Bassin
  [7, 0],   // Oreille gauche -> nez
  [8, 0],   // Oreille droite -> nez
];

const UPPER_BODY_JOINTS = [0, 7, 8, 11, 12, 13, 14, 15, 16, 23, 24];

const FINGER_COLORS = {
  thumb: '#f59e0b',
  index: '#06b6d4',
  middle: '#3b82f6',
  ring: '#8b5cf6',
  pinky: '#ec4899',
  palm: '#10b981',
};

interface DetectedHandDisplay {
  label: string;
  score: number;
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

  // États du flux vidéo et des modèles IA
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [isStreamReady, setIsStreamReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isPermissionDenied, setIsPermissionDenied] = useState(false);
  const [isModelLoading, setIsModelLoading] = useState(false);
  const [modelReady, setModelReady] = useState(false);
  const [activeDelegate, setActiveDelegate] = useState<'GPU' | 'CPU'>('GPU');

  // Options d'affichage
  const [isSyncing, setIsSyncing] = useState(true);
  const [isMirrored, setIsMirrored] = useState(true);
  const [showMeshOverlay, setShowMeshOverlay] = useState(true);
  const [lowLightBoost, setLowLightBoost] = useState(false);

  // Métriques en temps réel
  const [fps, setFps] = useState(0);
  const [resolutionLabel, setResolutionLabel] = useState('');
  const [detectedHands, setDetectedHands] = useState<DetectedHandDisplay[]>([]);
  const [isPoseDetected, setIsPoseDetected] = useState(false);

  // Références d'exécution Tasks Vision
  const handLandmarkerRef = useRef<HandLandmarker | null>(null);
  const poseLandmarkerRef = useRef<PoseLandmarker | null>(null);
  const smootherRef = useRef<PoseSmoother>(new PoseSmoother());
  const renderLoopIdRef = useRef<number | null>(null);

  // Horodatage monotone strict requis par detectForVideo
  const lastVideoTimeRef = useRef<number>(-1);
  const lastTimestampMsRef = useRef<number>(0);

  // Cache de persistance temporelle pour éviter les coupures sur 1-2 frames
  const lastHandResultRef = useRef<HandLandmarkerResult | null>(null);
  const lastPoseResultRef = useRef<PoseLandmarkerResult | null>(null);
  const lastValidDetectionMsRef = useRef<number>(0);

  // Compteur FPS et signatures d'état pour éviter les re-rendus React inutiles à 60 FPS
  const frameCountRef = useRef(0);
  const lastFpsTimestampRef = useRef(performance.now());
  const lastHudSigRef = useRef('');
  const streamReadyFlagRef = useRef(false);

  // Références stables pour éviter les closures obsolètes dans requestAnimationFrame
  const isSyncingRef = useRef(isSyncing);
  useEffect(() => {
    isSyncingRef.current = isSyncing;
  }, [isSyncing]);

  const isMirroredRef = useRef(isMirrored);
  useEffect(() => {
    isMirroredRef.current = isMirrored;
  }, [isMirrored]);

  const showMeshOverlayRef = useRef(showMeshOverlay);
  useEffect(() => {
    showMeshOverlayRef.current = showMeshOverlay;
  }, [showMeshOverlay]);

  const lowLightBoostRef = useRef(lowLightBoost);
  useEffect(() => {
    lowLightBoostRef.current = lowLightBoost;
  }, [lowLightBoost]);

  const onPoseUpdateRef = useRef(onPoseUpdate);
  useEffect(() => {
    onPoseUpdateRef.current = onPoseUpdate;
  }, [onPoseUpdate]);

  // Redimensionnement de la poignée latérale
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(panelWidth);

  /**
   * 1. Initialiser MediaPipe Tasks Vision (HandLandmarker + PoseLandmarker sur GPU WebGL avec repli CPU)
   */
  const initVisionTasks = useCallback(async () => {
    if (handLandmarkerRef.current && poseLandmarkerRef.current) {
      return true;
    }

    setIsModelLoading(true);
    try {
      const vision = await FilesetResolver.forVisionTasks(TASKS_VISION_WASM_URL);

      const createLandmarkers = async (delegate: 'GPU' | 'CPU') => {
        const [handLm, poseLm] = await Promise.all([
          HandLandmarker.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath: HAND_MODEL_URL,
              delegate,
            },
            runningMode: 'VIDEO',
            numHands: 2,
            minHandDetectionConfidence: 0.35,
            minHandPresenceConfidence: 0.35,
            minTrackingConfidence: 0.35,
          }),
          PoseLandmarker.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath: POSE_MODEL_URL,
              delegate,
            },
            runningMode: 'VIDEO',
            numPoses: 1,
            minPoseDetectionConfidence: 0.4,
            minPosePresenceConfidence: 0.4,
            minTrackingConfidence: 0.4,
          }),
        ]);
        return { handLm, poseLm, delegate };
      };

      let result;
      try {
        result = await createLandmarkers('GPU');
      } catch (gpuErr) {
        console.warn('Délégation GPU indisponible, bascule automatique sur CPU:', gpuErr);
        result = await createLandmarkers('CPU');
      }

      handLandmarkerRef.current = result.handLm;
      poseLandmarkerRef.current = result.poseLm;
      setActiveDelegate(result.delegate);
      setModelReady(true);
      setIsModelLoading(false);
      return true;
    } catch (err) {
      console.warn('Erreur initialisation Tasks Vision:', err);
      setIsModelLoading(false);
      setModelReady(false);
      return false;
    }
  }, []);

  /**
   * 2. Dessiner le squelette complet (Corps + Mains) avec étiquettes lisibles même en mode miroir
   */
  const drawOverlay = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    mirrored: boolean,
    poseResult: PoseLandmarkerResult | null,
    handResult: HandLandmarkerResult | null,
    handSides: Array<{ isLeft: boolean; score: number }>
  ) => {
    const mapX = (nx: number) => (mirrored ? (1 - nx) * width : nx * width);
    const mapY = (ny: number) => ny * height;

    // A. Squelette du haut du corps (PoseLandmarker)
    const poseLms = poseResult?.landmarks?.[0];
    if (poseLms && poseLms.length >= 25) {
      ctx.save();
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.72)';
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';

      UPPER_BODY_CONNECTIONS.forEach(([a, b]) => {
        const pA = poseLms[a];
        const pB = poseLms[b];
        if (!pA || !pB) return;
        if ((pA.visibility ?? 1) < 0.3 || (pB.visibility ?? 1) < 0.3) return;

        ctx.beginPath();
        ctx.moveTo(mapX(pA.x), mapY(pA.y));
        ctx.lineTo(mapX(pB.x), mapY(pB.y));
        ctx.stroke();
      });

      UPPER_BODY_JOINTS.forEach((idx) => {
        const p = poseLms[idx];
        if (!p || (p.visibility ?? 1) < 0.3) return;
        ctx.beginPath();
        ctx.arc(mapX(p.x), mapY(p.y), idx === 0 ? 4 : 5, 0, Math.PI * 2);
        ctx.fillStyle = '#0ea5e9';
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      });
      ctx.restore();
    }

    // B. Squelettes des mains (21 points par main)
    if (handResult && handResult.landmarks && handResult.landmarks.length > 0) {
      handResult.landmarks.forEach((landmarks, idx) => {
        const sideInfo = handSides[idx] || { isLeft: false, score: 0.85 };
        const isLeft = sideInfo.isLeft;
        const pct = Math.round(sideInfo.score * 100);

        // Segments articulaires colorés par doigt
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
          ctx.moveTo(mapX(start.x), mapY(start.y));
          ctx.lineTo(mapX(end.x), mapY(end.y));
          ctx.strokeStyle = strokeColor;
          ctx.lineWidth = 3.2;
          ctx.lineCap = 'round';
          ctx.stroke();
        });

        // Points articulaires
        landmarks.forEach((pt, pIdx) => {
          const px = mapX(pt.x);
          const py = mapY(pt.y);

          ctx.beginPath();
          ctx.arc(px, py, pIdx === 0 ? 5.5 : 3.8, 0, Math.PI * 2);
          ctx.fillStyle = pIdx === 0 ? '#38bdf8' : '#ffffff';
          ctx.fill();
          ctx.strokeStyle = '#0284c7';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        });

        // Boîte englobante
        let minX = width;
        let minY = height;
        let maxX = 0;
        let maxY = 0;

        landmarks.forEach((p) => {
          const px = mapX(p.x);
          const py = mapY(p.y);
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

        // Étiquette toujours droite et lisible (indépendante du miroir)
        const labelText = `${isLeft ? 'Main Gauche' : 'Main Droite'} · ${pct}%`;
        ctx.font = 'bold 11px sans-serif';
        const textWidth = ctx.measureText(labelText).width;
        const boxY = Math.max(4, minY - 22);
        ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
        ctx.fillRect(minX, boxY, textWidth + 12, 18);
        ctx.fillStyle = isLeft ? '#38bdf8' : '#34d399';
        ctx.fillText(labelText, minX + 6, boxY + 13);
      });
    } else if (!poseLms) {
      // Réticule de cadrage quand ni corps ni main ne sont dans le champ
      const marginX = width * 0.16;
      const marginY = height * 0.14;
      const corner = 24;

      ctx.strokeStyle = 'rgba(56, 189, 248, 0.45)';
      ctx.lineWidth = 2;

      ctx.beginPath();
      ctx.moveTo(marginX, marginY + corner);
      ctx.lineTo(marginX, marginY);
      ctx.lineTo(marginX + corner, marginY);

      ctx.moveTo(width - marginX - corner, marginY);
      ctx.lineTo(width - marginX, marginY);
      ctx.lineTo(width - marginX, marginY + corner);

      ctx.moveTo(marginX, height - marginY - corner);
      ctx.lineTo(marginX, height - marginY);
      ctx.lineTo(marginX + corner, height - marginY);

      ctx.moveTo(width - marginX - corner, height - marginY);
      ctx.lineTo(width - marginX, height - marginY);
      ctx.lineTo(width - marginX, height - marginY - corner);
      ctx.stroke();
    }
  };

  /**
   * 3. Boucle principale vidéo + inférence GPU + lissage One-Euro
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
          if (video.videoWidth > 0 && video.videoHeight > 0) {
            if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
              canvas.width = video.videoWidth;
              canvas.height = video.videoHeight;
              setResolutionLabel(`${video.videoWidth}×${video.videoHeight}`);
            }
          }

          const nowMs = performance.now();
          const mirrored = isMirroredRef.current;

          // A. Dessin vidéo sur le Canvas (miroir géré proprement sans retourner les textes)
          ctx.save();
          if (lowLightBoostRef.current) {
            ctx.filter = 'brightness(1.22) contrast(1.16)';
          }
          if (mirrored) {
            ctx.translate(canvas.width, 0);
            ctx.scale(-1, 1);
          }
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          ctx.restore();

          // B. Inférence synchrone GPU sur les nouvelles trames décodées uniquement
          const handLm = handLandmarkerRef.current;
          const poseLm = poseLandmarkerRef.current;

          if ((handLm || poseLm) && !video.paused && !video.ended && video.currentTime !== lastVideoTimeRef.current) {
            lastVideoTimeRef.current = video.currentTime;
            const monotonicTs = Math.max(Math.round(nowMs), lastTimestampMsRef.current + 1);
            lastTimestampMsRef.current = monotonicTs;

            let poseRes: PoseLandmarkerResult | null = lastPoseResultRef.current;
            let handRes: HandLandmarkerResult | null = lastHandResultRef.current;

            if (poseLm) {
              try {
                poseRes = poseLm.detectForVideo(video, monotonicTs);
              } catch {
                // Ignore frame transitoire
              }
            }

            if (handLm) {
              try {
                handRes = handLm.detectForVideo(video, monotonicTs);
              } catch {
                // Ignore frame transitoire
              }
            }

            const hasHands = !!(handRes && handRes.landmarks && handRes.landmarks.length > 0);
            const hasPose = !!(poseRes && poseRes.landmarks && poseRes.landmarks.length > 0);

            if (hasHands || hasPose) {
              lastValidDetectionMsRef.current = nowMs;
              lastHandResultRef.current = handRes;
              lastPoseResultRef.current = poseRes;
            } else if (nowMs - lastValidDetectionMsRef.current > POSE_PERSISTENCE_MS) {
              lastHandResultRef.current = null;
              lastPoseResultRef.current = null;
              smootherRef.current.reset();
            }
          }

          // C. Exploitation des résultats (courants ou maintenus par persistance temporelle)
          const activeHandRes = lastHandResultRef.current;
          const activePoseRes = lastPoseResultRef.current;

          const poseNormLms = (activePoseRes?.landmarks?.[0] as MediaPipeLandmark[] | undefined) || null;
          const poseWorldLms = (activePoseRes?.worldLandmarks?.[0] as MediaPipeLandmark[] | undefined) || poseNormLms;

          const handsNorm = (activeHandRes?.landmarks as MediaPipeLandmark[][] | undefined) || [];
          const handsWorld = (activeHandRes?.worldLandmarks as MediaPipeLandmark[][] | undefined) || [];
          const handednesses = activeHandRes?.handedness || [];

          const assigned = assignHandsToSide(handsNorm, handsWorld, handednesses, poseNormLms);

          // Mettre à jour les badges HUD uniquement si la détection change
          const poseActive = Boolean(poseNormLms && poseNormLms.length >= 25);
          const hudLabels: DetectedHandDisplay[] = [];
          if (assigned.leftNorm) {
            hudLabels.push({ label: 'G', score: Math.round(assigned.leftScore * 100) });
          }
          if (assigned.rightNorm) {
            hudLabels.push({ label: 'D', score: Math.round(assigned.rightScore * 100) });
          }
          const sig = `${poseActive ? 1 : 0}|${hudLabels.map((h) => `${h.label}:${h.score}`).join(',')}`;
          if (sig !== lastHudSigRef.current) {
            lastHudSigRef.current = sig;
            setIsPoseDetected(poseActive);
            setDetectedHands(hudLabels);
          }

          // Dessiner le squelette OpenCV (Corps + Mains)
          if (showMeshOverlayRef.current) {
            drawOverlay(
              ctx,
              canvas.width,
              canvas.height,
              mirrored,
              activePoseRes,
              activeHandRes,
              assigned.handSides
            );
          }

          // D. Calcul cinématique 3D + lissage One-Euro -> Avatar 3D/2D
          if (isSyncingRef.current) {
            if (assigned.leftWorld || assigned.rightWorld || poseWorldLms) {
              const rawPose = buildLiveCameraCharacterPose(
                assigned.leftWorld,
                assigned.rightWorld,
                poseWorldLms
              );
              const smoothedPose = smootherRef.current.smooth(rawPose, nowMs);
              onPoseUpdateRef.current(smoothedPose);
            } else if (nowMs - lastValidDetectionMsRef.current > POSE_PERSISTENCE_MS) {
              onPoseUpdateRef.current(null);
            }
          }

          // E. FPS réel
          frameCountRef.current++;
          if (nowMs - lastFpsTimestampRef.current >= 1000) {
            setFps(
              Math.round((frameCountRef.current * 1000) / (nowMs - lastFpsTimestampRef.current))
            );
            frameCountRef.current = 0;
            lastFpsTimestampRef.current = nowMs;
          }

          if (!streamReadyFlagRef.current) {
            streamReadyFlagRef.current = true;
            setIsStreamReady(true);
          }
        }
      }

      renderLoopIdRef.current = requestAnimationFrame(tick);
    };

    renderLoopIdRef.current = requestAnimationFrame(tick);
  }, []);

  /**
   * 4. Démarrer la caméra en 720p HD avec repli progressif
   */
  const startCamera = useCallback(async () => {
    setCameraError(null);
    setIsPermissionDenied(false);
    setIsStarting(true);
    setIsStreamReady(false);
    streamReadyFlagRef.current = false;
    lastHudSigRef.current = '';

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("L'API vidéo n'est pas supportée dans ce navigateur.");
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }

      let stream: MediaStream;
      try {
        // Priorité HD 720p pour maximiser le nombre de pixels par doigt
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            frameRate: { ideal: 30 },
            facingMode: 'user',
          },
          audio: false,
        });
      } catch (hdErr) {
        const isConstraintIssue =
          hdErr instanceof DOMException &&
          (hdErr.name === 'OverconstrainedError' ||
            hdErr.name === 'ConstraintNotSatisfiedError');
        if (!isConstraintIssue) {
          throw hdErr;
        }
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }

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
            setTimeout(resolve, 900);
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

      startRenderLoop();
      initVisionTasks().catch((err) => {
        console.warn('Chargement Tasks Vision différé:', err);
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
          msg =
            'Autorisation requise : veuillez autoriser l’accès à la caméra pour activer le suivi en direct.';
          console.warn('Accès caméra en attente d’autorisation:', err.message);
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          msg = 'Aucun périphérique caméra détecté sur cet appareil.';
        } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
          msg = 'La caméra est déjà utilisée par une autre application.';
        } else {
          msg = err.message;
        }
      }

      setIsPermissionDenied(permissionDenied);
      setCameraError(msg);
    }
  }, [initVisionTasks, startRenderLoop]);

  /**
   * 5. Arrêter la caméra et réinitialiser l'état
   */
  const stopCamera = useCallback(() => {
    if (renderLoopIdRef.current) {
      cancelAnimationFrame(renderLoopIdRef.current);
      renderLoopIdRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
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

    lastHandResultRef.current = null;
    lastPoseResultRef.current = null;
    lastVideoTimeRef.current = -1;
    lastHudSigRef.current = '';
    streamReadyFlagRef.current = false;
    smootherRef.current.reset();

    setIsCameraActive(false);
    setIsStarting(false);
    setIsStreamReady(false);
    setCameraError(null);
    setIsPermissionDenied(false);
    setDetectedHands([]);
    setIsPoseDetected(false);
    setFps(0);
    setResolutionLabel('');
    onPoseUpdateRef.current(null);
  }, []);

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

  useEffect(() => {
    return () => {
      if (renderLoopIdRef.current) {
        cancelAnimationFrame(renderLoopIdRef.current);
      }
      if (handLandmarkerRef.current) {
        try {
          handLandmarkerRef.current.close();
        } catch {
          // Ignorer
        }
        handLandmarkerRef.current = null;
      }
      if (poseLandmarkerRef.current) {
        try {
          poseLandmarkerRef.current.close();
        } catch {
          // Ignorer
        }
        poseLandmarkerRef.current = null;
      }
    };
  }, []);

  /**
   * Redimensionnement latéral du panneau
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
          >
            <Activity className="w-3 h-3" />
            <span>{isSyncing ? 'SYNCHRO ON' : 'SYNCHRO OFF'}</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Zone vidéo + superposition squelettique */}
      <div className="relative flex-1 min-h-0 w-full bg-black overflow-hidden flex items-center justify-center">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="absolute inset-0 w-full h-full object-cover pointer-events-none -z-10"
        />

        <canvas
          ref={canvasRef}
          width={1280}
          height={720}
          className="w-full h-full object-cover"
        />

        {/* Chargement capteur */}
        {(isStarting || (!isStreamReady && isCameraActive && !cameraError)) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/90 space-y-3 z-10 p-4 text-center">
            <RefreshCw className="w-7 h-7 text-sky-400 animate-spin" />
            <p className="text-xs font-semibold text-slate-200">
              Connexion au flux vidéo HD...
            </p>
          </div>
        )}

        {/* Chargement modèles IA */}
        {isCameraActive && isStreamReady && isModelLoading && (
          <div className="absolute bottom-3 left-3 z-10 bg-slate-950/90 border border-slate-800 px-2.5 py-1.5 rounded text-[10px] text-sky-400 flex items-center space-x-1.5">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            <span>Chargement IA Corps + Mains (WebGL)...</span>
          </div>
        )}

        {/* Erreur caméra / permission */}
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
            </div>

            <button
              type="button"
              onClick={startCamera}
              className="px-4 py-2.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-white text-xs font-bold transition-all flex items-center space-x-2"
            >
              <CameraIcon className="w-4 h-4" />
              <span>
                {isPermissionDenied
                  ? 'Autoriser et activer la caméra'
                  : 'Réessayer d’activer la caméra'}
              </span>
            </button>
          </div>
        )}

        {/* HUD Métriques temps réel */}
        {isCameraActive && isStreamReady && !cameraError && (
          <div className="absolute top-3 left-3 right-3 z-10 flex items-center justify-between pointer-events-none">
            <div className="bg-slate-950/85 border border-slate-800 px-2.5 py-1.5 rounded-lg text-slate-300 flex items-center space-x-2 text-[10px] font-mono">
              <span className="text-sky-400 font-bold">{fps} FPS</span>
              {resolutionLabel && (
                <>
                  <span className="text-slate-700">|</span>
                  <span className="text-slate-400">{resolutionLabel}</span>
                </>
              )}
              <span className="text-slate-700">|</span>
              <span className="flex items-center space-x-1">
                {modelReady && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
                <span className={isPoseDetected ? 'text-sky-300 font-semibold' : 'text-slate-500'}>
                  Corps
                </span>
                <span className="text-slate-600">+</span>
                {detectedHands.length > 0 ? (
                  <span className="text-emerald-400 font-bold">
                    {detectedHands.map((h) => `${h.label}:${h.score}%`).join(' ')}
                  </span>
                ) : (
                  <span className="text-slate-500">Mains: 0</span>
                )}
              </span>
            </div>

            {modelReady && (
              <div className="bg-slate-950/85 border border-slate-800 px-2 py-1 rounded text-[10px] font-mono text-emerald-400 flex items-center space-x-1">
                <Cpu className="w-3 h-3" />
                <span>{activeDelegate}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Contrôles inférieurs */}
      <div className="p-3 bg-slate-950 border-t border-slate-800 space-y-3 shrink-0">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
          <label className="flex items-center space-x-1.5 cursor-pointer hover:text-slate-200 transition-colors">
            <input
              type="checkbox"
              checked={isMirrored}
              onChange={(e) => setIsMirrored(e.target.checked)}
              className="rounded border-slate-700 bg-slate-800 text-sky-500 focus:ring-0"
            />
            <FlipHorizontal className="w-3.5 h-3.5" />
            <span className="text-[11px]">Miroir</span>
          </label>

          <label className="flex items-center space-x-1.5 cursor-pointer hover:text-slate-200 transition-colors">
            <input
              type="checkbox"
              checked={showMeshOverlay}
              onChange={(e) => setShowMeshOverlay(e.target.checked)}
              className="rounded border-slate-700 bg-slate-800 text-sky-500 focus:ring-0"
            />
            <Layers className="w-3.5 h-3.5" />
            <span className="text-[11px]">Squelette</span>
          </label>

          <label className="flex items-center space-x-1.5 cursor-pointer hover:text-slate-200 transition-colors">
            <input
              type="checkbox"
              checked={lowLightBoost}
              onChange={(e) => setLowLightBoost(e.target.checked)}
              className="rounded border-slate-700 bg-slate-800 text-sky-500 focus:ring-0"
            />
            <span className="text-[11px]">Luminosité +</span>
          </label>
        </div>

        <button
          type="button"
          onClick={isCameraActive ? stopCamera : startCamera}
          className={`w-full py-2.5 rounded-lg text-xs font-bold flex items-center justify-center space-x-2 transition-all ${
            isCameraActive
              ? 'bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 border border-rose-500/30'
              : 'bg-sky-500 hover:bg-sky-400 text-white'
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
