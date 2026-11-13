/**
 * @file src/utils/handKinematicsSolver.ts
 * @description Solveur cinématique 3D haute précision pour MediaPipe Tasks Vision (HandLandmarker + PoseLandmarker).
 * - Calcule la flexion et l'écartement des doigts par angles vectoriels 3D réels (invariants à la distance).
 * - Calcule la posture complète du haut du corps (épaules, coudes, torse, tête) depuis PoseLandmarker.
 * - Intègre un filtre adaptatif One-Euro (anti-tremblement au repos, réactivité instantanée en mouvement).
 */

import { CharacterPose, HandPose, ArmPose } from '../types/signs';

export interface MediaPipeLandmark {
  x: number;
  y: number;
  z: number;
  visibility?: number;
}

interface Vec3 {
  x: number;
  y: number;
  z: number;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function sub(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

function dot(a: Vec3, b: Vec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

function cross(a: Vec3, b: Vec3): Vec3 {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

function len(v: Vec3): number {
  return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
}

function normalize(v: Vec3): Vec3 {
  const l = len(v);
  if (l < 1e-6) return { x: 0, y: 0, z: 0 };
  return { x: v.x / l, y: v.y / l, z: v.z / l };
}

function dist3D(a: Vec3, b: Vec3): number {
  return len(sub(a, b));
}

/**
 * Calcule l'angle 3D (en radians [0..PI]) au sommet B entre les segments BA et BC.
 * Retourne PI (~3.14 rad) lorsque le membre est parfaitement aligné/tendu.
 */
function angleAtJoint(a: Vec3, b: Vec3, c: Vec3): number {
  const ba = normalize(sub(a, b));
  const bc = normalize(sub(c, b));
  const cosTheta = clamp(dot(ba, bc), -1, 1);
  return Math.acos(cosTheta);
}

/**
 * Filtre passe-bas simple utilisé par le filtre One-Euro
 */
class LowPassFilter {
  private y: number | null = null;
  private s: number = 0;

  filter(value: number, alpha: number): number {
    if (this.y === null) {
      this.s = value;
    } else {
      this.s = alpha * value + (1 - alpha) * this.y;
    }
    this.y = this.s;
    return this.s;
  }

  lastValue(): number {
    return this.y ?? 0;
  }

  reset(): void {
    this.y = null;
    this.s = 0;
  }
}

/**
 * Filtre adaptatif One-Euro (Casiez et al.) :
 * Élimine totalement les micro-tremblements à faible vitesse tout en conservant une réponse instantanée lors des gestes LSF rapides.
 */
export class OneEuroFilter {
  private minCutoff: number;
  private beta: number;
  private dCutoff: number;
  private xFilter = new LowPassFilter();
  private dxFilter = new LowPassFilter();
  private lastTimeMs: number | null = null;

  constructor(minCutoff: number = 1.4, beta: number = 0.04, dCutoff: number = 1.0) {
    this.minCutoff = minCutoff;
    this.beta = beta;
    this.dCutoff = dCutoff;
  }

  private alpha(cutoff: number, dtSec: number): number {
    const tau = 1.0 / (2 * Math.PI * cutoff);
    return 1.0 / (1.0 + tau / dtSec);
  }

  filter(value: number, timestampMs: number): number {
    if (this.lastTimeMs === null) {
      this.lastTimeMs = timestampMs;
      this.dxFilter.filter(0, 1);
      return this.xFilter.filter(value, 1);
    }

    const dtSec = Math.max((timestampMs - this.lastTimeMs) / 1000, 1 / 120);
    this.lastTimeMs = timestampMs;

    const dValue = (value - this.xFilter.lastValue()) / dtSec;
    const edValue = this.dxFilter.filter(dValue, this.alpha(this.dCutoff, dtSec));
    const cutoff = this.minCutoff + this.beta * Math.abs(edValue);

    return this.xFilter.filter(value, this.alpha(cutoff, dtSec));
  }

  reset(): void {
    this.lastTimeMs = null;
    this.xFilter.reset();
    this.dxFilter.reset();
  }
}

/**
 * Lisseur complet pour l'ensemble des degrés de liberté de CharacterPose
 */
export class PoseSmoother {
  private filters = new Map<string, OneEuroFilter>();

  private getFilter(key: string, minCutoff: number, beta: number): OneEuroFilter {
    let f = this.filters.get(key);
    if (!f) {
      f = new OneEuroFilter(minCutoff, beta, 1.0);
      this.filters.set(key, f);
    }
    return f;
  }

  private smoothNum(key: string, value: number, ts: number, minCutoff = 1.6, beta = 0.05): number {
    return this.getFilter(key, minCutoff, beta).filter(value, ts);
  }

  private smoothTuple3(
    prefix: string,
    val: [number, number, number],
    ts: number,
    minCutoff = 1.4,
    beta = 0.04
  ): [number, number, number] {
    return [
      this.smoothNum(`${prefix}.0`, val[0], ts, minCutoff, beta),
      this.smoothNum(`${prefix}.1`, val[1], ts, minCutoff, beta),
      this.smoothNum(`${prefix}.2`, val[2], ts, minCutoff, beta),
    ];
  }

  private smoothHand(prefix: string, hand: HandPose, ts: number): HandPose {
    return {
      thumb: {
        curl: clamp(this.smoothNum(`${prefix}.thumb.c`, hand.thumb.curl, ts, 2.0, 0.06), 0, 1),
        spread: clamp(this.smoothNum(`${prefix}.thumb.s`, hand.thumb.spread ?? 0, ts, 1.8, 0.04), -1, 1),
      },
      index: {
        curl: clamp(this.smoothNum(`${prefix}.index.c`, hand.index.curl, ts, 2.2, 0.07), 0, 1),
        spread: clamp(this.smoothNum(`${prefix}.index.s`, hand.index.spread ?? 0, ts, 1.8, 0.04), -1, 1),
      },
      middle: {
        curl: clamp(this.smoothNum(`${prefix}.middle.c`, hand.middle.curl, ts, 2.2, 0.07), 0, 1),
        spread: clamp(this.smoothNum(`${prefix}.middle.s`, hand.middle.spread ?? 0, ts, 1.8, 0.04), -1, 1),
      },
      ring: {
        curl: clamp(this.smoothNum(`${prefix}.ring.c`, hand.ring.curl, ts, 2.2, 0.07), 0, 1),
        spread: clamp(this.smoothNum(`${prefix}.ring.s`, hand.ring.spread ?? 0, ts, 1.8, 0.04), -1, 1),
      },
      pinky: {
        curl: clamp(this.smoothNum(`${prefix}.pinky.c`, hand.pinky.curl, ts, 2.2, 0.07), 0, 1),
        spread: clamp(this.smoothNum(`${prefix}.pinky.s`, hand.pinky.spread ?? 0, ts, 1.8, 0.04), -1, 1),
      },
      wristRotation: this.smoothTuple3(`${prefix}.wrist`, hand.wristRotation, ts, 1.5, 0.04),
    };
  }

  smooth(pose: CharacterPose, timestampMs: number): CharacterPose {
    return {
      rightArm: {
        shoulder: this.smoothTuple3('rArm.sh', pose.rightArm.shoulder, timestampMs, 1.3, 0.04),
        elbow: this.smoothTuple3('rArm.el', pose.rightArm.elbow, timestampMs, 1.4, 0.04),
      },
      rightHand: this.smoothHand('rHand', pose.rightHand, timestampMs),
      leftArm: {
        shoulder: this.smoothTuple3('lArm.sh', pose.leftArm.shoulder, timestampMs, 1.3, 0.04),
        elbow: this.smoothTuple3('lArm.el', pose.leftArm.elbow, timestampMs, 1.4, 0.04),
      },
      leftHand: this.smoothHand('lHand', pose.leftHand, timestampMs),
      head: this.smoothTuple3('head', pose.head, timestampMs, 1.2, 0.03),
      torso: this.smoothTuple3('torso', pose.torso, timestampMs, 1.0, 0.02),
      face: {
        blink: pose.face.blink,
        eyebrows: pose.face.eyebrows,
        smile: pose.face.smile,
        mouthOpen: pose.face.mouthOpen,
      },
    };
  }

  reset(): void {
    this.filters.clear();
  }
}

/**
 * Calcule la flexion d'un doigt (0 = tendu, 1 = replié) à partir des angles 3D réels
 * des 3 articulations : MCP (base), PIP (milieu) et DIP (distale).
 * Totalement invariant à la distance caméra et à la perspective.
 */
function solveFingerCurlByAngles(
  wrist: MediaPipeLandmark,
  mcp: MediaPipeLandmark,
  pip: MediaPipeLandmark,
  dip: MediaPipeLandmark,
  tip: MediaPipeLandmark
): number {
  const mcpBend = Math.max(0, Math.PI - angleAtJoint(wrist, mcp, pip));
  const pipBend = Math.max(0, Math.PI - angleAtJoint(mcp, pip, dip));
  const dipBend = Math.max(0, Math.PI - angleAtJoint(pip, dip, tip));

  // Un doigt tendu totalise ~0.15 rad ; un poing fermé totalise ~3.8 à 4.5 rad
  const totalBend = mcpBend * 0.95 + pipBend * 1.15 + dipBend * 0.85;
  return clamp((totalBend - 0.28) / 3.4, 0, 1);
}

/**
 * Calcule l'écartement latéral d'un doigt projeté dans le plan anatomique de la paume.
 */
function solveFingerSpreadInPalmPlane(
  mcp: MediaPipeLandmark,
  pip: MediaPipeLandmark,
  palmAxisX: Vec3,
  palmAxisY: Vec3
): number {
  const fingerDir = normalize(sub(pip, mcp));
  const lateral = dot(fingerDir, palmAxisX);
  const forward = Math.max(0.2, Math.abs(dot(fingerDir, palmAxisY)));
  return clamp((lateral / forward) * 1.1, -0.8, 0.8);
}

/**
 * Convertit 21 repères 3D (worldLandmarks ou normalized landmarks) d'une main en HandPose
 */
export function solveMediaPipeHand(landmarks: MediaPipeLandmark[], isLeft: boolean): HandPose {
  if (!landmarks || landmarks.length < 21) {
    return createNeutralHandPose();
  }

  const wrist = landmarks[0];
  const thumbCmc = landmarks[1];
  const thumbMcp = landmarks[2];
  const thumbIp = landmarks[3];
  const thumbTip = landmarks[4];

  const indexMcp = landmarks[5];
  const indexPip = landmarks[6];
  const indexDip = landmarks[7];
  const indexTip = landmarks[8];

  const middleMcp = landmarks[9];
  const middlePip = landmarks[10];
  const middleDip = landmarks[11];
  const middleTip = landmarks[12];

  const ringMcp = landmarks[13];
  const ringPip = landmarks[14];
  const ringDip = landmarks[15];
  const ringTip = landmarks[16];

  const pinkyMcp = landmarks[17];
  const pinkyPip = landmarks[18];
  const pinkyDip = landmarks[19];
  const pinkyTip = landmarks[20];

  // Longueur de référence anatomique : taille de la paume (poignet -> base du majeur)
  const palmSize = Math.max(0.01, dist3D(wrist, middleMcp));

  // 1. Flexion des 4 doigts principaux via angles articulaires 3D
  const indexCurl = solveFingerCurlByAngles(wrist, indexMcp, indexPip, indexDip, indexTip);
  const middleCurl = solveFingerCurlByAngles(wrist, middleMcp, middlePip, middleDip, middleTip);
  const ringCurl = solveFingerCurlByAngles(wrist, ringMcp, ringPip, ringDip, ringTip);
  const pinkyCurl = solveFingerCurlByAngles(wrist, pinkyMcp, pinkyPip, pinkyDip, pinkyTip);

  // 2. Flexion et abduction du pouce normalisées par la taille de la paume
  const thumbMcpBend = Math.max(0, Math.PI - angleAtJoint(thumbCmc, thumbMcp, thumbIp));
  const thumbIpBend = Math.max(0, Math.PI - angleAtJoint(thumbMcp, thumbIp, thumbTip));
  const thumbOppositionRatio = dist3D(thumbTip, pinkyMcp) / palmSize;
  const thumbAngleCurl = clamp((thumbMcpBend + thumbIpBend - 0.2) / 1.9, 0, 1);
  const thumbOppCurl = clamp(1 - (thumbOppositionRatio - 0.45) / 0.85, 0, 1);
  const thumbCurl = clamp(thumbAngleCurl * 0.55 + thumbOppCurl * 0.45, 0, 1);

  const thumbSpreadRatio = dist3D(thumbTip, indexMcp) / palmSize;
  const thumbSpread = clamp((thumbSpreadRatio - 0.55) * 1.4, -0.5, 0.8);

  // 3. Repère orthonormé 3D de la paume pour écartement & rotation du poignet
  const palmUp = normalize(sub(middleMcp, wrist));
  const palmLatRaw = normalize(sub(indexMcp, pinkyMcp));
  const palmNormal = normalize(cross(palmUp, palmLatRaw));
  const palmAxisX = normalize(cross(palmNormal, palmUp));

  const sideSign = isLeft ? -1 : 1;
  const indexSpread = solveFingerSpreadInPalmPlane(indexMcp, indexPip, palmAxisX, palmUp) * sideSign;
  const ringSpread = solveFingerSpreadInPalmPlane(ringMcp, ringPip, palmAxisX, palmUp) * sideSign;
  const pinkySpread = solveFingerSpreadInPalmPlane(pinkyMcp, pinkyPip, palmAxisX, palmUp) * sideSign;

  // 4. Orientation du poignet (pitch / yaw / roll anatomiques)
  const pitch = clamp(Math.atan2(-palmUp.z, Math.sqrt(palmUp.x * palmUp.x + palmUp.y * palmUp.y)) * 0.85, -0.9, 0.9);
  const yaw = clamp(Math.atan2(palmNormal.x, -palmNormal.z) * 0.55 * sideSign, -0.8, 0.8);
  const roll = clamp(Math.atan2(palmLatRaw.y, len({ x: palmLatRaw.x, y: 0, z: palmLatRaw.z })) * 0.65 * sideSign, -0.8, 0.8);

  return {
    thumb: { curl: thumbCurl, spread: thumbSpread },
    index: { curl: indexCurl, spread: indexSpread },
    middle: { curl: middleCurl, spread: 0 },
    ring: { curl: ringCurl, spread: ringSpread },
    pinky: { curl: pinkyCurl, spread: pinkySpread },
    wristRotation: [pitch, yaw, roll],
  };
}

export function createNeutralHandPose(): HandPose {
  return {
    thumb: { curl: 0.15, spread: 0.1 },
    index: { curl: 0.15, spread: 0 },
    middle: { curl: 0.18, spread: 0 },
    ring: { curl: 0.2, spread: 0 },
    pinky: { curl: 0.22, spread: 0 },
    wristRotation: [0, 0, 0],
  };
}

/**
 * Calcule les rotations Euler épaule/coude d'un bras à partir des repères 3D PoseLandmarker.
 */
function solveArmFromPose(
  shoulderPt: MediaPipeLandmark,
  elbowPt: MediaPipeLandmark,
  wristPt: MediaPipeLandmark,
  isLeft: boolean
): ArmPose {
  const upperVec = normalize(sub(elbowPt, shoulderPt));

  // Dans le repère monde MediaPipe Pose : +Y est vers le bas, -Z est vers la caméra
  const down = upperVec.y;
  const forward = -upperVec.z;
  const lateralOut = isLeft ? upperVec.x : -upperVec.x;

  // Élévation de l'épaule (0 = bras le long du corps, ~0.8 = devant le buste, ~1.5 = à l'horizontale)
  const liftRaw = Math.atan2(Math.sqrt(forward * forward + Math.max(0, lateralOut) * Math.max(0, lateralOut)), Math.max(-0.5, down));
  const lift = clamp(liftRaw * 0.95, 0, 2.2);

  // Rapprochement vers l'axe central du buste
  const inward = -lateralOut;
  const forwardYaw = clamp(inward * 0.9, -0.85, 0.85) * (isLeft ? 1 : -1);

  // Abduction latérale extérieure
  const sideAbduct = clamp(lateralOut * 0.85, -0.4, 1.1) * (isLeft ? -1 : 1);

  // Angle réel du coude entre avant-bras et bras
  const elbowInteriorAngle = angleAtJoint(shoulderPt, elbowPt, wristPt);
  const elbowFlex = clamp((Math.PI - elbowInteriorAngle) * 1.05, 0.05, 2.25);

  // Orientation secondaire de l'avant-bras vers le centre du corps
  const foreVec = normalize(sub(wristPt, elbowPt));
  const foreInward = isLeft ? -foreVec.x : foreVec.x;
  const foreYaw = clamp(foreInward * 0.65, -0.8, 0.8) * (isLeft ? 1 : -1);
  const foreRoll = clamp(-foreVec.y * 0.35, -0.6, 0.6) * (isLeft ? -1 : 1);

  return {
    shoulder: [lift, forwardYaw, sideAbduct],
    elbow: [elbowFlex, foreYaw, foreRoll],
  };
}

/**
 * Calcule la pose complète du personnage (haut du corps + tête + mains) à partir de
 * PoseLandmarker + HandLandmarker.
 */
export function buildLiveCameraCharacterPose(
  leftHandLandmarks: MediaPipeLandmark[] | null,
  rightHandLandmarks: MediaPipeLandmark[] | null,
  poseLandmarks: MediaPipeLandmark[] | null = null
): CharacterPose {
  const leftHand = leftHandLandmarks
    ? solveMediaPipeHand(leftHandLandmarks, true)
    : createNeutralHandPose();

  const rightHand = rightHandLandmarks
    ? solveMediaPipeHand(rightHandLandmarks, false)
    : createNeutralHandPose();

  let rightArm: ArmPose = {
    shoulder: rightHandLandmarks ? [0.75, -0.25, 0.25] : [0, 0, 0],
    elbow: rightHandLandmarks ? [1.65, -0.35, 0.35] : [0.05, 0, 0],
  };

  let leftArm: ArmPose = {
    shoulder: leftHandLandmarks ? [0.60, 0.25, -0.25] : [0, 0, 0],
    elbow: leftHandLandmarks ? [1.55, 0.35, -0.35] : [0.05, 0, 0],
  };

  let head: [number, number, number] = [0, 0, 0];
  let torso: [number, number, number] = [0, 0, 0];

  if (poseLandmarks && poseLandmarks.length >= 25) {
    const nose = poseLandmarks[0];
    const leftEar = poseLandmarks[7];
    const rightEar = poseLandmarks[8];

    const leftShoulder = poseLandmarks[11];
    const rightShoulder = poseLandmarks[12];
    const leftElbow = poseLandmarks[13];
    const rightElbow = poseLandmarks[14];
    const leftWrist = poseLandmarks[15];
    const rightWrist = poseLandmarks[16];
    const leftHip = poseLandmarks[23];
    const rightHip = poseLandmarks[24];

    // Bras droit (si visible dans le champ caméra)
    if ((rightElbow.visibility ?? 1) > 0.35 && (rightShoulder.visibility ?? 1) > 0.35) {
      rightArm = solveArmFromPose(rightShoulder, rightElbow, rightWrist, false);
    }

    // Bras gauche (si visible dans le champ caméra)
    if ((leftElbow.visibility ?? 1) > 0.35 && (leftShoulder.visibility ?? 1) > 0.35) {
      leftArm = solveArmFromPose(leftShoulder, leftElbow, leftWrist, true);
    }

    // Inclinaison du torse basée sur la ligne des épaules et hanches
    const shoulderMid: Vec3 = {
      x: (leftShoulder.x + rightShoulder.x) / 2,
      y: (leftShoulder.y + rightShoulder.y) / 2,
      z: (leftShoulder.z + rightShoulder.z) / 2,
    };
    const hipMid: Vec3 = {
      x: (leftHip.x + rightHip.x) / 2,
      y: (leftHip.y + rightHip.y) / 2,
      z: (leftHip.z + rightHip.z) / 2,
    };

    const spineVec = normalize(sub(shoulderMid, hipMid));
    const shoulderLine = normalize(sub(leftShoulder, rightShoulder));
    const torsoPitch = clamp((-spineVec.z) * 0.45, -0.35, 0.35);
    const torsoYaw = clamp(-shoulderLine.z * 0.6, -0.45, 0.45);
    const torsoRoll = clamp(shoulderLine.y * 0.5, -0.35, 0.35);
    torso = [torsoPitch, torsoYaw, torsoRoll];

    // Orientation naturelle de la tête (nez + oreilles par rapport au centre des épaules)
    if ((nose.visibility ?? 1) > 0.4) {
      const earMidX = (leftEar.x + rightEar.x) / 2;
      const earMidY = (leftEar.y + rightEar.y) / 2;
      const headYaw = clamp((nose.x - earMidX) * 2.4, -0.55, 0.55);
      const headPitch = clamp((nose.y - earMidY) * 1.8, -0.4, 0.4);
      const headRoll = clamp((leftEar.y - rightEar.y) * 1.5, -0.35, 0.35);
      head = [headPitch, headYaw, headRoll];
    }
  }

  return {
    rightArm,
    rightHand,
    leftArm,
    leftHand,
    head,
    face: { blink: 0, eyebrows: 0.1, smile: 0.35 },
    torso,
  };
}

/**
 * Associe de façon fiable chaque main détectée (HandLandmarker) au côté Gauche/Droite réel
 * en croisant la proximité avec les poignets PoseLandmarker (15/16) puis la classification MediaPipe.
 */
export function assignHandsToSide(
  hands: MediaPipeLandmark[][],
  worldHands: MediaPipeLandmark[][],
  handednesses: Array<{ categoryName?: string; displayName?: string; score?: number }[]>,
  poseNormalizedLandmarks: MediaPipeLandmark[] | null
): {
  leftNorm: MediaPipeLandmark[] | null;
  rightNorm: MediaPipeLandmark[] | null;
  leftWorld: MediaPipeLandmark[] | null;
  rightWorld: MediaPipeLandmark[] | null;
  leftScore: number;
  rightScore: number;
  handSides: Array<{ isLeft: boolean; score: number }>;
} {
  let leftNorm: MediaPipeLandmark[] | null = null;
  let rightNorm: MediaPipeLandmark[] | null = null;
  let leftWorld: MediaPipeLandmark[] | null = null;
  let rightWorld: MediaPipeLandmark[] | null = null;
  let leftScore = 0;
  let rightScore = 0;
  const handSides: Array<{ isLeft: boolean; score: number }> = [];

  const poseLeftWrist =
    poseNormalizedLandmarks && poseNormalizedLandmarks.length > 16
      ? poseNormalizedLandmarks[15]
      : null;
  const poseRightWrist =
    poseNormalizedLandmarks && poseNormalizedLandmarks.length > 16
      ? poseNormalizedLandmarks[16]
      : null;

  hands.forEach((normLm, idx) => {
    const worldLm = worldHands[idx] || normLm;
    const cat = handednesses[idx]?.[0];
    const score = cat?.score ?? 0.8;
    const rawLabel = (cat?.categoryName || cat?.displayName || '').toLowerCase();

    // Par défaut dans MediaPipe Tasks Vision sur image brute non-miroir,
    // categoryName correspond à la main du sujet ("Left" / "Right").
    let isLeft = rawLabel === 'left';

    // Si PoseLandmarker a repéré les deux poignets avec bonne visibilité, valider par proximité 2D
    if (
      poseLeftWrist &&
      poseRightWrist &&
      (poseLeftWrist.visibility ?? 0) > 0.4 &&
      (poseRightWrist.visibility ?? 0) > 0.4
    ) {
      const handWrist = normLm[0];
      const dLeft = Math.hypot(handWrist.x - poseLeftWrist.x, handWrist.y - poseLeftWrist.y);
      const dRight = Math.hypot(handWrist.x - poseRightWrist.x, handWrist.y - poseRightWrist.y);
      if (Math.abs(dLeft - dRight) > 0.04) {
        isLeft = dLeft < dRight;
      }
    }

    handSides.push({ isLeft, score });

    if (isLeft) {
      if (!leftNorm || score >= leftScore) {
        leftNorm = normLm;
        leftWorld = worldLm;
        leftScore = score;
      }
    } else {
      if (!rightNorm || score >= rightScore) {
        rightNorm = normLm;
        rightWorld = worldLm;
        rightScore = score;
      }
    }
  });

  return {
    leftNorm,
    rightNorm,
    leftWorld,
    rightWorld,
    leftScore,
    rightScore,
    handSides,
  };
}
