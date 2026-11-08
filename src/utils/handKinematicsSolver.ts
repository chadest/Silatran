/**
 * @file src/utils/handKinematicsSolver.ts
 * @description Analyseur cinématique convertissant les 21 points 3D de MediaPipe Hands
 * en flexion de doigts (curl), écartement (spread), rotation de poignet et orientation de bras pour le modèle.
 */

import { CharacterPose, HandPose, FingerJoints } from '../types/signs';

export interface MediaPipeLandmark {
  x: number;
  y: number;
  z: number;
}

/**
 * Calcule la distance 3D entre deux repères
 */
function dist3D(a: MediaPipeLandmark, b: MediaPipeLandmark): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Calcule l'angle de flexion d'un doigt en fonction de la distance relative entre bout et paume
 */
function solveFingerCurl(
  wrist: MediaPipeLandmark,
  mcp: MediaPipeLandmark,
  pip: MediaPipeLandmark,
  tip: MediaPipeLandmark
): number {
  const maxLen = dist3D(mcp, pip) + dist3D(pip, tip);
  const currentDist = dist3D(mcp, tip);
  if (maxLen === 0) return 0;

  const ratio = currentDist / maxLen;
  // ratio = 1 (tendu), ratio < 0.4 (replié)
  const curl = 1 - (ratio - 0.35) / 0.55;
  return Math.max(0, Math.min(1, curl));
}

/**
 * Calcule l'écartement latéral d'un doigt (spread)
 */
function solveFingerSpread(
  mcp: MediaPipeLandmark,
  middleMcp: MediaPipeLandmark
): number {
  const dx = mcp.x - middleMcp.x;
  return Math.max(-0.8, Math.min(0.8, dx * 3));
}

/**
 * Convertit 21 repères MediaPipe d'une main en HandPose
 */
export function solveMediaPipeHand(landmarks: MediaPipeLandmark[], isLeft: boolean): HandPose {
  if (!landmarks || landmarks.length < 21) {
    return {
      thumb: { curl: 0.1, spread: 0 },
      index: { curl: 0.1, spread: 0 },
      middle: { curl: 0.1, spread: 0 },
      ring: { curl: 0.1, spread: 0 },
      pinky: { curl: 0.1, spread: 0 },
      wristRotation: [0, 0, 0] as [number, number, number],
    };
  }

  const wrist = landmarks[0];
  const thumbMcp = landmarks[2];
  const thumbTip = landmarks[4];

  const indexMcp = landmarks[5];
  const indexPip = landmarks[6];
  const indexTip = landmarks[8];

  const middleMcp = landmarks[9];
  const middlePip = landmarks[10];
  const middleTip = landmarks[12];

  const ringMcp = landmarks[13];
  const ringPip = landmarks[14];
  const ringTip = landmarks[16];

  const pinkyMcp = landmarks[17];
  const pinkyPip = landmarks[18];
  const pinkyTip = landmarks[20];

  // Flexions
  const indexCurl = solveFingerCurl(wrist, indexMcp, indexPip, indexTip);
  const middleCurl = solveFingerCurl(wrist, middleMcp, middlePip, middleTip);
  const ringCurl = solveFingerCurl(wrist, ringMcp, ringPip, ringTip);
  const pinkyCurl = solveFingerCurl(wrist, pinkyMcp, pinkyPip, pinkyTip);

  // Pouce
  const thumbDist = dist3D(thumbTip, indexMcp);
  const thumbCurl = Math.max(0, Math.min(1, 1 - thumbDist * 3));

  // Écartements
  const indexSpread = solveFingerSpread(indexMcp, middleMcp);
  const ringSpread = solveFingerSpread(ringMcp, middleMcp);
  const pinkySpread = solveFingerSpread(pinkyMcp, middleMcp);

  // Orientation du poignet basée sur le vecteur poignet -> majeur
  const dirX = middleMcp.x - wrist.x;
  const dirY = middleMcp.y - wrist.y;
  const dirZ = middleMcp.z - wrist.z;

  const pitch = Math.atan2(dirY, Math.sqrt(dirX * dirX + dirZ * dirZ));
  const yaw = Math.atan2(dirX, dirZ);
  const sideMul = isLeft ? -1 : 1;

  return {
    thumb: { curl: thumbCurl, spread: 0.3 },
    index: { curl: indexCurl, spread: indexSpread },
    middle: { curl: middleCurl, spread: 0 },
    ring: { curl: ringCurl, spread: ringSpread },
    pinky: { curl: pinkyCurl, spread: pinkySpread },
    wristRotation: [pitch * 0.5, yaw * sideMul * 0.5, 0],
  };
}

/**
 * Calcule la pose globale du personnage en direct depuis les détections mains gauche et droite
 */
export function buildLiveCameraCharacterPose(
  leftHandLandmarks: MediaPipeLandmark[] | null,
  rightHandLandmarks: MediaPipeLandmark[] | null
): CharacterPose {
  const leftHand: HandPose = leftHandLandmarks
    ? solveMediaPipeHand(leftHandLandmarks, true)
    : {
        thumb: { curl: 0.1, spread: 0 },
        index: { curl: 0.1, spread: 0 },
        middle: { curl: 0.1, spread: 0 },
        ring: { curl: 0.1, spread: 0 },
        pinky: { curl: 0.1, spread: 0 },
        wristRotation: [0, 0, 0] as [number, number, number],
      };

  const rightHand: HandPose = rightHandLandmarks
    ? solveMediaPipeHand(rightHandLandmarks, false)
    : {
        thumb: { curl: 0.1, spread: 0 },
        index: { curl: 0.1, spread: 0 },
        middle: { curl: 0.1, spread: 0 },
        ring: { curl: 0.1, spread: 0 },
        pinky: { curl: 0.1, spread: 0 },
        wristRotation: [0, 0, 0] as [number, number, number],
      };

  // Calcul des positions d'épaules et coudes selon la présence des mains
  const rightActive = !!rightHandLandmarks;
  const leftActive = !!leftHandLandmarks;

  return {
    rightArm: {
      shoulder: rightActive ? [0.75, -0.25, 0.25] : [0, 0, 0],
      elbow: rightActive ? [1.65, -0.35, 0.35] : [0.05, 0, 0],
    },
    rightHand,
    leftArm: {
      shoulder: leftActive ? [0.60, 0.25, -0.25] : [0, 0, 0],
      elbow: leftActive ? [1.55, 0.35, -0.35] : [0.05, 0, 0],
    },
    leftHand,
    head: [0, 0, 0],
    face: { blink: 0, eyebrows: 0.1, smile: 0.4 },
    torso: [0, 0, 0],
  };
}
