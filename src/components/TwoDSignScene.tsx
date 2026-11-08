/**
 * @file src/components/TwoDSignScene.tsx
 * @description Scène 2D Vectorielle animée pour le présentateur Silatran en Langue des Signes (LSF).
 * Effectue la cinématique directe 2D des bras, des poignets et des 5 doigts articulés de chaque main,
 * ainsi que l'animation du visage (clignement, sourcils, sourire, chevelure vectorielle, vêtements).
 */

import React, { useEffect, useRef } from 'react';
import { AvatarConfig, SequenceItem, CharacterPose, FingerJoints } from '../types/signs';
import { AnimationController } from '../three/animationEngine';
import { CameraPreset } from '../three/ThreeSignScene';

interface TwoDSignSceneProps {
  sequence: SequenceItem[];
  currentIndex: number;
  isPlaying: boolean;
  speed: number;
  soundEnabled: boolean;
  avatarConfig: AvatarConfig;
  cameraPreset: CameraPreset;
  livePoseOverride?: CharacterPose | null;
  onIndexChange: (index: number) => void;
  onPlaybackComplete: () => void;
}

export const TwoDSignScene: React.FC<TwoDSignSceneProps> = ({
  sequence,
  currentIndex,
  isPlaying,
  speed,
  soundEnabled,
  avatarConfig,
  cameraPreset,
  livePoseOverride,
  onIndexChange,
  onPlaybackComplete,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const controllerRef = useRef<AnimationController | null>(null);
  const livePoseRef = useRef<CharacterPose | null>(null);

  useEffect(() => {
    livePoseRef.current = livePoseOverride || null;
  }, [livePoseOverride]);

  // Synchroniser la séquence avec le contrôleur d'animation
  useEffect(() => {
    if (controllerRef.current) {
      controllerRef.current.setSequence(sequence);
    }
  }, [sequence]);

  useEffect(() => {
    if (controllerRef.current) {
      if (isPlaying) controllerRef.current.play();
      else controllerRef.current.pause();
    }
  }, [isPlaying]);

  useEffect(() => {
    if (controllerRef.current) {
      controllerRef.current.setSpeed(speed);
    }
  }, [speed]);

  useEffect(() => {
    if (controllerRef.current) {
      controllerRef.current.setSoundEnabled(soundEnabled);
    }
  }, [soundEnabled]);

  useEffect(() => {
    if (controllerRef.current && controllerRef.current.getCurrentIndex() !== currentIndex) {
      controllerRef.current.jumpToIndex(currentIndex);
    }
  }, [currentIndex]);

  // Boucle d'animation 2D Canvas vectorielle à 60 FPS
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Instancier le contrôleur d'animation LSF
    const controller = new AnimationController(
      (newIdx) => onIndexChange(newIdx),
      () => onPlaybackComplete()
    );
    controller.setSequence(sequence);
    controller.setSpeed(speed);
    controller.setSoundEnabled(soundEnabled);
    if (isPlaying) controller.play();
    controllerRef.current = controller;

    let animationFrameId = 0;
    let lastTime = performance.now();

    function render(now: number) {
      if (!canvas || !ctx) return;

      const delta = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      // Dimensionnement haute définition Retina/DPI
      const width = canvas.parentElement?.clientWidth || 800;
      const height = canvas.parentElement?.clientHeight || 600;
      const dpr = window.devicePixelRatio || 1;

      if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
        canvas.width = width * dpr;
        canvas.height = height * dpr;
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);

      // Fond de scène studio vectoriel épuré (arrière-plan clair style illustration)
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(0, 0, width, height);

      // Ombre portée douce sous le personnage
      const stageCenterX = width / 2;
      const stageCenterY = height * 0.90;
      
      ctx.beginPath();
      ctx.ellipse(stageCenterX, stageCenterY, width * 0.32, height * 0.05, 0, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(203, 213, 225, 0.45)';
      ctx.fill();

      // Obtenir la pose (soit live pose webcam, soit interpolée LSF)
      const pose: CharacterPose = livePoseRef.current || controller.update(delta);

      // Appliquer les transformations de caméra (Buste, Zoom Main, Profil)
      ctx.save();
      if (cameraPreset === 'hand') {
        ctx.translate(width * 0.15, height * 0.18);
        ctx.scale(1.45, 1.45);
      } else if (cameraPreset === 'angle') {
        ctx.translate(width * 0.05, 0);
      }

      // Dessiner le personnage vectoriel 2D fidèle à l'illustration de référence
      draw2DCharacter(ctx, width, height, pose, avatarConfig);

      ctx.restore();
      ctx.restore();

      animationFrameId = requestAnimationFrame(render);
    }

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [avatarConfig, cameraPreset]);

  return (
    <div className="relative w-full h-full min-h-[460px] overflow-hidden select-none bg-slate-50 flex items-center justify-center">
      <canvas ref={canvasRef} className="w-full h-full block" />
    </div>
  );
};

/**
 * Rendu vectoriel du personnage 2D basé exactement sur l'illustration de référence (image_daf09535.png)
 */
function draw2DCharacter(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  pose: CharacterPose,
  config: AvatarConfig
) {
  const cx = width / 2;
  const cy = height * 0.40;

  // Palette de couleurs fidèle à l'image vectorielle de référence
  const skinColor = config.skinColor && config.skinColor !== '#e8beac' ? config.skinColor : '#e09981';
  const clothingColor = config.clothingColor && config.clothingColor !== '#1e293b' ? config.clothingColor : '#fbaea1';
  const hairColor = config.hairColor && config.hairColor !== '#1e1b18' ? config.hairColor : '#15182b';
  const skinLineColor = '#be705b';
  const shirtSeamColor = '#f29384';

  const shoulderY = cy + 125;
  const shoulderOffsetX = 90;
  const torsoY = shoulderY + 230;

  // 1. CHEVELURE ARRIÈRE (Volume de cheveux sombres tombant derrière les épaules)
  ctx.beginPath();
  ctx.moveTo(cx - 75, cy - 30);
  ctx.bezierCurveTo(cx - 135, cy + 20, cx - 130, cy + 160, cx - 70, cy + 190);
  ctx.bezierCurveTo(cx - 20, cy + 210, cx + 70, cy + 210, cx + 115, cy + 165);
  ctx.bezierCurveTo(cx + 140, cy + 100, cx + 125, cy - 10, cx + 75, cy - 30);
  ctx.closePath();
  ctx.fillStyle = hairColor;
  ctx.fill();

  // 2. TORSE & T-SHIRT ROSE PEAU
  ctx.beginPath();
  ctx.moveTo(cx - shoulderOffsetX, shoulderY);
  ctx.lineTo(cx + shoulderOffsetX, shoulderY);
  ctx.lineTo(cx + shoulderOffsetX - 12, torsoY);
  ctx.lineTo(cx - shoulderOffsetX + 12, torsoY);
  ctx.closePath();
  ctx.fillStyle = clothingColor;
  ctx.fill();

  // Coutures latérales légères sur le t-shirt
  ctx.beginPath();
  ctx.moveTo(cx - shoulderOffsetX + 28, shoulderY + 35);
  ctx.lineTo(cx - shoulderOffsetX + 20, torsoY);
  ctx.moveTo(cx + shoulderOffsetX - 28, shoulderY + 35);
  ctx.lineTo(cx + shoulderOffsetX - 20, torsoY);
  ctx.strokeStyle = shirtSeamColor;
  ctx.lineWidth = 1.8;
  ctx.stroke();

  // 3. COU (Teinte chair avec ombre sous le menton)
  const neckW = 44;
  const neckH = 55;
  ctx.beginPath();
  ctx.rect(cx - neckW / 2, cy + 50, neckW, neckH);
  ctx.fillStyle = skinColor;
  ctx.fill();

  // Ombre/plis légers sur le cou
  ctx.beginPath();
  ctx.arc(cx, cy + 68, 14, 0.1 * Math.PI, 0.9 * Math.PI);
  ctx.strokeStyle = skinLineColor;
  ctx.lineWidth = 1.8;
  ctx.stroke();

  // Col de T-shirt arrondi (Crew neck)
  ctx.beginPath();
  ctx.ellipse(cx, shoulderY - 8, 38, 16, 0, 0, Math.PI);
  ctx.fillStyle = skinColor;
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(cx, shoulderY - 8, 38, 16, 0, 0, Math.PI);
  ctx.strokeStyle = shirtSeamColor;
  ctx.lineWidth = 3.5;
  ctx.stroke();

  // 4. TÊTE & OREILLE (avec soutien des mouvements et inclinaisons de tête pose.head)
  const headRadiusX = 52;
  const headRadiusY = 66;

  // Calcul des décalages d'inclinaison et hochements de tête LSF
  const headPitch = pose.head[0] * 25; // Hochement haut/bas
  const headYaw = pose.head[1] * 28;   // Pivotement gauche/droite
  const headY = cy + 10 + headPitch;
  const headX = cx + headYaw;

  // Oreille droite visible
  ctx.beginPath();
  ctx.ellipse(headX + headRadiusX - 2, headY + 5, 10, 14, 0, 0, Math.PI * 2);
  ctx.fillStyle = skinColor;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(headX + headRadiusX - 2, headY + 5, 5, 0.2 * Math.PI, 0.8 * Math.PI);
  ctx.strokeStyle = skinLineColor;
  ctx.lineWidth = 1.8;
  ctx.stroke();

  // Visage
  ctx.beginPath();
  ctx.ellipse(headX, headY, headRadiusX, headRadiusY, 0, 0, Math.PI * 2);
  ctx.fillStyle = skinColor;
  ctx.fill();

  // 5. YEUX, SOURCILS ET ARTICULATION DE LA BOUCHE (mouvements faciaux)
  const eyeOffsetY = -4;
  const eyeOffsetX = 22;
  const isBlinking = pose.face.blink > 0.3;

  if (isBlinking) {
    // Yeux fermés en arche douce
    ctx.beginPath();
    ctx.arc(headX - eyeOffsetX, headY + eyeOffsetY, 7, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.arc(headX + eyeOffsetX, headY + eyeOffsetY, 7, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.strokeStyle = hairColor;
    ctx.lineWidth = 3;
    ctx.stroke();
  } else {
    // Yeux noirs ovales fidèles à l'image
    ctx.beginPath();
    ctx.ellipse(headX - eyeOffsetX, headY + eyeOffsetY, 5.5, 7.5, 0, 0, Math.PI * 2);
    ctx.ellipse(headX + eyeOffsetX, headY + eyeOffsetY, 5.5, 7.5, 0, 0, Math.PI * 2);
    ctx.fillStyle = hairColor;
    ctx.fill();
  }

  // Sourcils noirs courbés (expression modulée par pose.face.eyebrows)
  const browOffsetY = -24 + pose.face.eyebrows * -6;
  ctx.beginPath();
  ctx.moveTo(headX - eyeOffsetX - 12, headY + browOffsetY + 2);
  ctx.quadraticCurveTo(headX - eyeOffsetX, headY + browOffsetY - 4, headX - eyeOffsetX + 10, headY + browOffsetY + 1);
  ctx.moveTo(headX + eyeOffsetX - 10, headY + browOffsetY + 1);
  ctx.quadraticCurveTo(headX + eyeOffsetX, headY + browOffsetY - 4, headX + eyeOffsetX + 12, headY + browOffsetY + 2);
  ctx.strokeStyle = hairColor;
  ctx.lineWidth = 3.5;
  ctx.stroke();

  // Nez vectoriel discret
  ctx.beginPath();
  ctx.moveTo(headX - 2, headY + 8);
  ctx.lineTo(headX + 3, headY + 22);
  ctx.lineTo(headX - 3, headY + 24);
  ctx.strokeStyle = skinLineColor;
  ctx.lineWidth = 1.8;
  ctx.stroke();

  // Bouche articulée (sourire + articulation des mots lip-sync pose.face.mouthOpen)
  const mouthOpen = pose.face.mouthOpen || 0;
  const mouthHeight = 12 + mouthOpen * 16;
  ctx.beginPath();
  ctx.moveTo(headX - 16, headY + 36);
  ctx.quadraticCurveTo(headX, headY + 36 + mouthHeight, headX + 16, headY + 36);
  ctx.quadraticCurveTo(headX, headY + 34 - mouthOpen * 4, headX - 16, headY + 36);
  ctx.closePath();
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.strokeStyle = hairColor;
  ctx.lineWidth = 2.2;
  ctx.stroke();

  // 6. CHEVELURE AVANT (Mèches longues encadrant le visage)
  ctx.beginPath();
  // Cheveux supérieurs
  ctx.moveTo(cx - headRadiusX - 4, headY);
  ctx.bezierCurveTo(cx - headRadiusX, headY - 60, cx + headRadiusX, headY - 60, cx + headRadiusX + 4, headY);
  ctx.bezierCurveTo(cx + headRadiusX - 10, headY - 45, cx - headRadiusX + 10, headY - 45, cx - headRadiusX - 4, headY);
  ctx.fillStyle = hairColor;
  ctx.fill();

  // Mèche tombante à gauche de l'épaule
  ctx.beginPath();
  ctx.moveTo(cx - 28, headY - 48);
  ctx.bezierCurveTo(cx - 75, headY - 20, cx - 105, headY + 50, cx - 90, headY + 120);
  ctx.bezierCurveTo(cx - 75, headY + 155, cx - 40, headY + 140, cx - 55, headY + 90);
  ctx.bezierCurveTo(cx - 65, headY + 50, cx - 45, headY, cx - 15, headY - 40);
  ctx.closePath();
  ctx.fillStyle = hairColor;
  ctx.fill();

  // 7. CINÉMATIQUE DES BRAS ET DES MAINS EN 2D (Kinematics)
  const upperArmLen = 105;
  const forearmLen = 95;

  // Bras Droit
  draw2DArm(
    ctx,
    cx + shoulderOffsetX - 15,
    shoulderY + 5,
    pose.rightArm,
    pose.rightHand,
    skinColor,
    clothingColor,
    shirtSeamColor,
    skinLineColor,
    upperArmLen,
    forearmLen,
    false
  );

  // Bras Gauche
  draw2DArm(
    ctx,
    cx - shoulderOffsetX + 15,
    shoulderY + 5,
    pose.leftArm,
    pose.leftHand,
    skinColor,
    clothingColor,
    shirtSeamColor,
    skinLineColor,
    upperArmLen,
    forearmLen,
    true
  );
}

/**
 * Dessine un bras articulé vectoriel en 2D avec manches courtes et 5 doigts
 */
function draw2DArm(
  ctx: CanvasRenderingContext2D,
  shoulderX: number,
  shoulderY: number,
  armPose: { shoulder: [number, number, number]; elbow: [number, number, number] },
  handPose: CharacterPose['rightHand'],
  skinColor: string,
  clothingColor: string,
  shirtSeamColor: string,
  skinLineColor: string,
  upperArmLen: number,
  forearmLen: number,
  isLeft: boolean
) {
  const sideMul = isLeft ? -1 : 1;

  const lift = armPose.shoulder[0];
  const forwardAngle = armPose.shoulder[1];
  const sideAngle = armPose.shoulder[2];

  // Angle de repos du bras (vers le bas)
  const baseArmAngle = Math.PI / 2;
  const upperAngle = baseArmAngle - sideMul * (lift * 1.35 - sideAngle * 0.4) - forwardAngle * 0.2;

  // Coude
  const elbowX = shoulderX + upperArmLen * Math.cos(upperAngle);
  const elbowY = shoulderY + upperArmLen * Math.sin(upperAngle);

  // Flexion du coude
  const elbowFlex = armPose.elbow[0];
  const forearmAngle = upperAngle - sideMul * elbowFlex * 0.95;

  // Poignet
  const wristX = elbowX + forearmLen * Math.cos(forearmAngle);
  const wristY = elbowY + forearmLen * Math.sin(forearmAngle);

  // Orientation de la main
  const wristRot = handPose.wristRotation[0] * 0.8;
  const handAngle = forearmAngle + sideMul * wristRot;

  // 1. Manche courte du T-Shirt rose
  const sleeveLen = 42;
  const sleeveEndX = shoulderX + sleeveLen * Math.cos(upperAngle);
  const sleeveEndY = shoulderY + sleeveLen * Math.sin(upperAngle);

  ctx.beginPath();
  ctx.moveTo(shoulderX, shoulderY);
  ctx.lineTo(sleeveEndX, sleeveEndY);
  ctx.strokeStyle = clothingColor;
  ctx.lineWidth = 32;
  ctx.lineCap = 'butt';
  ctx.stroke();

  // Revers de manche plié
  ctx.beginPath();
  ctx.arc(sleeveEndX, sleeveEndY, 16, upperAngle - Math.PI / 2, upperAngle + Math.PI / 2);
  ctx.strokeStyle = shirtSeamColor;
  ctx.lineWidth = 4;
  ctx.stroke();

  // 2. Bras & Avant-bras (Peau chair)
  ctx.beginPath();
  ctx.moveTo(sleeveEndX, sleeveEndY);
  ctx.lineTo(elbowX, elbowY);
  ctx.lineTo(wristX, wristY);
  ctx.strokeStyle = skinColor;
  ctx.lineWidth = 24;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke();

  // 3. Main vectorielle articulée avec 5 doigts
  draw2DHand(ctx, wristX, wristY, handAngle, handPose, skinColor, skinLineColor, isLeft);
}

/**
 * Dessine une main vectorielle 2D avec ses 5 doigts flexibles (LSF)
 */
function draw2DHand(
  ctx: CanvasRenderingContext2D,
  wristX: number,
  wristY: number,
  handAngle: number,
  handPose: CharacterPose['rightHand'],
  skinColor: string,
  skinLineColor: string,
  isLeft: boolean
) {
  const sideMul = isLeft ? -1 : 1;
  const palmLen = 30;

  // Paume vectorielle
  const palmCenterX = wristX + (palmLen / 2) * Math.cos(handAngle);
  const palmCenterY = wristY + (palmLen / 2) * Math.sin(handAngle);

  ctx.beginPath();
  ctx.arc(palmCenterX, palmCenterY, 14, 0, Math.PI * 2);
  ctx.fillStyle = skinColor;
  ctx.fill();

  // Pli de la paume de main
  ctx.beginPath();
  ctx.arc(palmCenterX, palmCenterY, 9, handAngle - 0.5, handAngle + 0.8);
  ctx.strokeStyle = skinLineColor;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Les 4 doigts principaux (Index, Majeur, Annulaire, Auriculaire)
  const fingers = [
    { pose: handPose.index, len: 32, offset: -10.5 },
    { pose: handPose.middle, len: 35, offset: -3.5 },
    { pose: handPose.ring, len: 31, offset: 3.5 },
    { pose: handPose.pinky, len: 26, offset: 10.5 },
  ];

  fingers.forEach(({ pose: fPose, len, offset }) => {
    draw2DFinger(ctx, wristX, wristY, handAngle, fPose, len, offset * sideMul, skinColor, skinLineColor);
  });

  // Pouce articulé
  draw2DThumb(ctx, wristX, wristY, handAngle, handPose.thumb, skinColor, skinLineColor, isLeft);
}

/**
 * Dessine un doigt vectoriel 2D articulé
 */
function draw2DFinger(
  ctx: CanvasRenderingContext2D,
  wristX: number,
  wristY: number,
  handAngle: number,
  pose: FingerJoints,
  length: number,
  sideOffset: number,
  skinColor: string,
  skinLineColor: string
) {
  const palmLen = 26;
  const curl = pose.curl || 0;
  const spread = pose.spread || 0;

  const perpAngle = handAngle + Math.PI / 2;
  const baseKx = wristX + palmLen * Math.cos(handAngle) + sideOffset * Math.cos(perpAngle);
  const baseKy = wristY + palmLen * Math.sin(handAngle) + sideOffset * Math.sin(perpAngle);

  const f1Len = length * 0.42;
  const f2Len = length * 0.33;
  const f3Len = length * 0.25;

  const f1Angle = handAngle + spread * 0.2;
  const f2Angle = f1Angle + curl * 1.15;
  const f3Angle = f2Angle + curl * 0.95;

  const f1x = baseKx + f1Len * Math.cos(f1Angle);
  const f1y = baseKy + f1Len * Math.sin(f1Angle);

  const f2x = f1x + f2Len * Math.cos(f2Angle);
  const f2y = f1y + f2Len * Math.sin(f2Angle);

  const f3x = f2x + f3Len * Math.cos(f3Angle);
  const f3y = f2y + f3Len * Math.sin(f3Angle);

  // Doigt
  ctx.beginPath();
  ctx.moveTo(baseKx, baseKy);
  ctx.lineTo(f1x, f1y);
  ctx.lineTo(f2x, f2y);
  ctx.lineTo(f3x, f3y);

  ctx.strokeStyle = skinColor;
  ctx.lineWidth = 6.5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke();

  // Contour/lignes d'articulation
  ctx.beginPath();
  ctx.moveTo(f1x, f1y);
  ctx.lineTo(f2x, f2y);
  ctx.strokeStyle = skinLineColor;
  ctx.lineWidth = 1.2;
  ctx.stroke();
}

/**
 * Dessine un pouce vectoriel 2D articulé
 */
function draw2DThumb(
  ctx: CanvasRenderingContext2D,
  wristX: number,
  wristY: number,
  handAngle: number,
  pose: FingerJoints,
  skinColor: string,
  skinLineColor: string,
  isLeft: boolean
) {
  const sideMul = isLeft ? -1 : 1;
  const curl = pose.curl || 0;
  const spread = pose.spread || 0;

  const thumbBaseX = wristX + 12 * Math.cos(handAngle) - sideMul * 12 * Math.sin(handAngle);
  const thumbBaseY = wristY + 12 * Math.sin(handAngle) + sideMul * 12 * Math.cos(handAngle);

  const t1Len = 15;
  const t2Len = 13;

  const t1Angle = handAngle - sideMul * (0.6 + spread * 0.3);
  const t2Angle = t1Angle + sideMul * curl * 1.0;

  const t1x = thumbBaseX + t1Len * Math.cos(t1Angle);
  const t1y = thumbBaseY + t1Len * Math.sin(t1Angle);

  const t2x = t1x + t2Len * Math.cos(t2Angle);
  const t2y = t1y + t2Len * Math.sin(t2Angle);

  ctx.beginPath();
  ctx.moveTo(thumbBaseX, thumbBaseY);
  ctx.lineTo(t1x, t1y);
  ctx.lineTo(t2x, t2y);

  ctx.strokeStyle = skinColor;
  ctx.lineWidth = 7.5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke();
}

