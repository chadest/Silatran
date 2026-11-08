/**
 * @file src/three/characterModel.ts
 * @description Modèle 3D cartoon complet et articulé de l'avatar pour la langue des signes (Three.js).
 * Comprend torse, tête expressive (yeux qui clignent, bouche, sourcils), bras, avant-bras et mains à 5 doigts articulés.
 */

import * as THREE from 'three';
import { AvatarConfig, CharacterPose, FingerJoints, HandPose } from '../types/signs';

// Interface pour manipuler les articulations d'un doigt
export interface FingerRig {
  base: THREE.Group;
  mid: THREE.Group;
  tip: THREE.Group;
}

// Interface pour manipuler une main complète et ses 5 doigts
export interface HandRig {
  group: THREE.Group;
  palmMesh: THREE.Mesh;
  thumb: FingerRig;
  index: FingerRig;
  middle: FingerRig;
  ring: FingerRig;
  pinky: FingerRig;
}

// Interface pour manipuler un bras
export interface ArmRig {
  shoulder: THREE.Group;
  upperArmMesh: THREE.Mesh;
  elbow: THREE.Group;
  forearmMesh: THREE.Mesh;
  wrist: THREE.Group;
  hand: HandRig;
}

// Interface pour manipuler la tête et les expressions faciales
export interface HeadRig {
  group: THREE.Group;
  headMesh: THREE.Mesh;
  leftEye: THREE.Group;
  rightEye: THREE.Group;
  leftEyelid: THREE.Mesh;
  rightEyelid: THREE.Mesh;
  leftEyebrow: THREE.Mesh;
  rightEyebrow: THREE.Mesh;
  mouth: THREE.Mesh;
  glassesGroup: THREE.Group;
  hairGroup: THREE.Group;
}

// Interface globale de l'avatar 3D
export interface CharacterRig {
  root: THREE.Group;
  torso: THREE.Group;
  head: HeadRig;
  leftArm: ArmRig;
  rightArm: ArmRig;
  materials: {
    skin: THREE.MeshStandardMaterial;
    clothing: THREE.MeshStandardMaterial;
    accent: THREE.MeshStandardMaterial;
    hair: THREE.MeshStandardMaterial;
    eyeWhite: THREE.MeshStandardMaterial;
    pupil: THREE.MeshStandardMaterial;
    mouth: THREE.MeshStandardMaterial;
    eyebrow: THREE.MeshStandardMaterial;
  };
}

/**
 * Crée un doigt articulé à 3 phalanges
 */
function createFinger(
  length: number,
  radius: number,
  skinMaterial: THREE.Material,
  isThumb: boolean = false
): FingerRig {
  const base = new THREE.Group();
  const mid = new THREE.Group();
  const tip = new THREE.Group();

  const seg1Len = length * 0.42;
  const seg2Len = length * 0.33;
  const seg3Len = length * 0.25;

  // Phalange 1 (proximale)
  const geom1 = new THREE.CylinderGeometry(radius * 0.9, radius, seg1Len, 10);
  geom1.translate(0, seg1Len / 2, 0);
  const mesh1 = new THREE.Mesh(geom1, skinMaterial);
  mesh1.castShadow = true;
  base.add(mesh1);

  // Articulation 2
  mid.position.y = seg1Len;
  const geom2 = new THREE.CylinderGeometry(radius * 0.8, radius * 0.9, seg2Len, 10);
  geom2.translate(0, seg2Len / 2, 0);
  const mesh2 = new THREE.Mesh(geom2, skinMaterial);
  mesh2.castShadow = true;
  mid.add(mesh2);
  base.add(mid);

  // Articulation 3 (distale)
  tip.position.y = seg2Len;
  const geom3 = new THREE.CylinderGeometry(radius * 0.6, radius * 0.8, seg3Len, 10);
  geom3.translate(0, seg3Len / 2, 0);
  const mesh3 = new THREE.Mesh(geom3, skinMaterial);
  mesh3.castShadow = true;
  tip.add(mesh3);

  // Bout arrondi du doigt
  const capGeom = new THREE.SphereGeometry(radius * 0.6, 8, 8);
  capGeom.translate(0, seg3Len, 0);
  const capMesh = new THREE.Mesh(capGeom, skinMaterial);
  tip.add(capMesh);

  mid.add(tip);

  return { base, mid, tip };
}

/**
 * Crée une main complète (paume + 5 doigts articulés)
 */
function createHand(skinMaterial: THREE.Material, isLeft: boolean): HandRig {
  const handGroup = new THREE.Group();
  const sideMul = isLeft ? -1 : 1;

  // Paume de la main stylisée
  const palmGeom = new THREE.BoxGeometry(0.18, 0.22, 0.08);
  // Arrondir visuellement la base
  palmGeom.translate(0, 0.11, 0);
  const palmMesh = new THREE.Mesh(palmGeom, skinMaterial);
  palmMesh.castShadow = true;
  palmMesh.receiveShadow = true;
  handGroup.add(palmMesh);

  // Doigts principaux attachés en haut de la paume (Y = 0.22)
  const fingerRadius = 0.022;

  // Index
  const index = createFinger(0.19, fingerRadius, skinMaterial);
  index.base.position.set(sideMul * 0.06, 0.22, 0);
  handGroup.add(index.base);

  // Majeur
  const middle = createFinger(0.21, fingerRadius * 1.05, skinMaterial);
  middle.base.position.set(sideMul * 0.02, 0.22, 0);
  handGroup.add(middle.base);

  // Annulaire
  const ring = createFinger(0.18, fingerRadius, skinMaterial);
  ring.base.position.set(sideMul * -0.02, 0.22, 0);
  handGroup.add(ring.base);

  // Auriculaire (petit doigt)
  const pinky = createFinger(0.15, fingerRadius * 0.85, skinMaterial);
  pinky.base.position.set(sideMul * -0.06, 0.21, 0);
  handGroup.add(pinky.base);

  // Pouce attaché sur le côté et légèrement avancé
  const thumb = createFinger(0.16, fingerRadius * 1.15, skinMaterial, true);
  thumb.base.position.set(sideMul * 0.085, 0.07, 0.025);
  // Orientation de repos naturelle du pouce
  thumb.base.rotation.z = sideMul * -0.6;
  thumb.base.rotation.y = sideMul * 0.4;
  thumb.base.rotation.x = 0.2;
  handGroup.add(thumb.base);

  return {
    group: handGroup,
    palmMesh,
    thumb,
    index,
    middle,
    ring,
    pinky,
  };
}

/**
 * Crée un bras complet articulé (épaule -> coude -> poignet -> main)
 */
function createArm(
  skinMaterial: THREE.Material,
  clothingMaterial: THREE.Material,
  accentMaterial: THREE.Material,
  isLeft: boolean
): ArmRig {
  const sideMul = isLeft ? -1 : 1;
  const shoulder = new THREE.Group();

  // Bras supérieur (manche de sweat)
  const upperArmLen = 0.45;
  const upperArmGeom = new THREE.CylinderGeometry(0.085, 0.075, upperArmLen, 12);
  upperArmGeom.translate(0, -upperArmLen / 2, 0);
  const upperArmMesh = new THREE.Mesh(upperArmGeom, clothingMaterial);
  upperArmMesh.castShadow = true;
  shoulder.add(upperArmMesh);

  // Jointure coude
  const elbow = new THREE.Group();
  elbow.position.y = -upperArmLen;
  shoulder.add(elbow);

  // Avant-bras
  const forearmLen = 0.42;
  const forearmGeom = new THREE.CylinderGeometry(0.072, 0.06, forearmLen, 12);
  forearmGeom.translate(0, -forearmLen / 2, 0);
  const forearmMesh = new THREE.Mesh(forearmGeom, clothingMaterial);
  forearmMesh.castShadow = true;
  elbow.add(forearmMesh);

  // Poignet (manchette de sweat)
  const cuffGeom = new THREE.CylinderGeometry(0.068, 0.065, 0.05, 12);
  cuffGeom.translate(0, -forearmLen + 0.02, 0);
  const cuffMesh = new THREE.Mesh(cuffGeom, accentMaterial);
  elbow.add(cuffMesh);

  // Articulation du poignet
  const wrist = new THREE.Group();
  wrist.position.y = -forearmLen;
  elbow.add(wrist);

  // Main
  const hand = createHand(skinMaterial, isLeft);
  // Aligner la main vers le bas par défaut (rotation sur Z pour préserver l'orientation avant de la paume)
  hand.group.rotation.z = Math.PI;
  wrist.add(hand.group);

  return {
    shoulder,
    upperArmMesh,
    elbow,
    forearmMesh,
    wrist,
    hand,
  };
}

/**
 * Crée la tête expressive de l'avatar cartoon
 */
function createHead(
  skinMaterial: THREE.MeshStandardMaterial,
  hairMaterial: THREE.MeshStandardMaterial,
  eyeWhiteMaterial: THREE.MeshStandardMaterial,
  pupilMaterial: THREE.MeshStandardMaterial,
  eyebrowMaterial: THREE.MeshStandardMaterial,
  mouthMaterial: THREE.MeshStandardMaterial,
  config: AvatarConfig
): HeadRig {
  const headGroup = new THREE.Group();

  // Volume de la tête cartoon
  const headGeom = new THREE.SphereGeometry(0.38, 24, 20);
  headGeom.scale(1.0, 1.15, 1.05);
  const headMesh = new THREE.Mesh(headGeom, skinMaterial);
  headMesh.castShadow = true;
  headGroup.add(headMesh);

  // Joues roses cartoon (subtile touche de couleur)
  const blushGeom = new THREE.SphereGeometry(0.09, 12, 12);
  blushGeom.scale(1, 0.5, 0.3);
  const blushMat = new THREE.MeshBasicMaterial({ color: 0xff8c94, transparent: true, opacity: 0.35 });
  
  const leftBlush = new THREE.Mesh(blushGeom, blushMat);
  leftBlush.position.set(-0.25, -0.06, 0.34);
  headGroup.add(leftBlush);

  const rightBlush = new THREE.Mesh(blushGeom, blushMat);
  rightBlush.position.set(0.25, -0.06, 0.34);
  headGroup.add(rightBlush);

  // Yeux cartoon
  const createEye = (isLeft: boolean) => {
    const eyeGroup = new THREE.Group();
    const sideMul = isLeft ? -1 : 1;

    // Blanc de l'œil
    const eyeWhiteGeom = new THREE.SphereGeometry(0.085, 16, 16);
    eyeWhiteGeom.scale(1, 1.25, 0.6);
    const eyeWhite = new THREE.Mesh(eyeWhiteGeom, eyeWhiteMaterial);
    eyeGroup.add(eyeWhite);

    // Pupille / Iris
    const pupilGeom = new THREE.SphereGeometry(0.05, 14, 14);
    pupilGeom.scale(0.9, 1.1, 0.3);
    const pupil = new THREE.Mesh(pupilGeom, pupilMaterial);
    pupil.position.set(0, 0, 0.045);
    eyeGroup.add(pupil);

    // Reflet brillant cartoon
    const shineGeom = new THREE.SphereGeometry(0.018, 8, 8);
    const shineMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const shine = new THREE.Mesh(shineGeom, shineMat);
    shine.position.set(0.015, 0.025, 0.06);
    eyeGroup.add(shine);

    // Paupière pour le clignement
    const eyelidGeom = new THREE.SphereGeometry(0.088, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2);
    eyelidGeom.scale(1.02, 1.27, 0.62);
    const eyelid = new THREE.Mesh(eyelidGeom, skinMaterial);
    eyelid.rotation.x = -Math.PI / 2;
    eyelid.visible = false; // Activée par morph/scale pendant le blink
    eyeGroup.add(eyelid);

    eyeGroup.position.set(sideMul * 0.14, 0.04, 0.34);
    eyeGroup.rotation.y = sideMul * 0.12;
    headGroup.add(eyeGroup);

    return { eyeGroup, eyelid };
  };

  const { eyeGroup: leftEye, eyelid: leftEyelid } = createEye(true);
  const { eyeGroup: rightEye, eyelid: rightEyelid } = createEye(false);

  // Sourcils expressifs
  const browGeom = new THREE.BoxGeometry(0.12, 0.025, 0.03);
  browGeom.translate(0, 0, 0);

  const leftEyebrow = new THREE.Mesh(browGeom, eyebrowMaterial);
  leftEyebrow.position.set(-0.14, 0.18, 0.37);
  leftEyebrow.rotation.z = -0.05;
  headGroup.add(leftEyebrow);

  const rightEyebrow = new THREE.Mesh(browGeom, eyebrowMaterial);
  rightEyebrow.position.set(0.14, 0.18, 0.37);
  rightEyebrow.rotation.z = 0.05;
  headGroup.add(rightEyebrow);

  // Petit nez stylisé
  const noseGeom = new THREE.SphereGeometry(0.04, 12, 12);
  noseGeom.scale(0.8, 0.9, 1);
  const nose = new THREE.Mesh(noseGeom, skinMaterial);
  nose.position.set(0, -0.03, 0.4);
  headGroup.add(nose);

  // Bouche expressive (courbe douce de sourire)
  const mouthGeom = new THREE.TorusGeometry(0.06, 0.016, 8, 16, Math.PI * 0.7);
  mouthGeom.rotateZ(Math.PI * 0.65);
  const mouth = new THREE.Mesh(mouthGeom, mouthMaterial);
  mouth.position.set(0, -0.16, 0.38);
  mouth.rotation.x = 0.15;
  headGroup.add(mouth);

  // Chevelure cartoon
  const hairGroup = new THREE.Group();
  if (config.hairStyle === 'cap') {
    // Casquette stylisée
    const capDomeGeom = new THREE.SphereGeometry(0.42, 20, 16, 0, Math.PI * 2, 0, Math.PI * 0.55);
    const capMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.6 });
    const capDome = new THREE.Mesh(capDomeGeom, capMat);
    capDome.position.y = 0.05;
    hairGroup.add(capDome);

    // Visière de casquette
    const visorGeom = new THREE.CylinderGeometry(0.44, 0.44, 0.025, 16, 1, false, -Math.PI * 0.3, Math.PI * 0.6);
    visorGeom.rotateX(-0.1);
    const visor = new THREE.Mesh(visorGeom, capMat);
    visor.position.set(0, 0.15, 0.12);
    hairGroup.add(visor);
  } else {
    // Coupe sculptée stylisée
    const hairDomeGeom = new THREE.SphereGeometry(0.41, 20, 16);
    hairDomeGeom.scale(1.03, 1.18, 1.05);
    hairDomeGeom.translate(0, 0.08, -0.04);
    const hairDome = new THREE.Mesh(hairDomeGeom, hairMaterial);
    hairDome.castShadow = true;
    hairGroup.add(hairDome);

    // Mèches frontales cartoon
    const tuftGeom = new THREE.ConeGeometry(0.1, 0.22, 6);
    tuftGeom.rotateX(Math.PI * 0.6);
    const tuft1 = new THREE.Mesh(tuftGeom, hairMaterial);
    tuft1.position.set(-0.12, 0.38, 0.32);
    tuft1.rotation.z = -0.3;
    hairGroup.add(tuft1);

    const tuft2 = new THREE.Mesh(tuftGeom, hairMaterial);
    tuft2.position.set(0.08, 0.4, 0.33);
    tuft2.rotation.z = 0.2;
    hairGroup.add(tuft2);
  }
  headGroup.add(hairGroup);

  // Lunettes (activables via AvatarConfig)
  const glassesGroup = new THREE.Group();
  const glassesMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.3, metalness: 0.8 });
  const frameGeom = new THREE.TorusGeometry(0.09, 0.012, 8, 16);
  
  const leftLens = new THREE.Mesh(frameGeom, glassesMat);
  leftLens.position.set(-0.15, 0.04, 0.38);
  glassesGroup.add(leftLens);

  const rightLens = new THREE.Mesh(frameGeom, glassesMat);
  rightLens.position.set(0.15, 0.04, 0.38);
  glassesGroup.add(rightLens);

  const bridgeGeom = new THREE.CylinderGeometry(0.01, 0.01, 0.12);
  bridgeGeom.rotateZ(Math.PI / 2);
  const bridge = new THREE.Mesh(bridgeGeom, glassesMat);
  bridge.position.set(0, 0.04, 0.39);
  glassesGroup.add(bridge);

  glassesGroup.visible = config.hasGlasses;
  headGroup.add(glassesGroup);

  return {
    group: headGroup,
    headMesh,
    leftEye,
    rightEye,
    leftEyelid,
    rightEyelid,
    leftEyebrow,
    rightEyebrow,
    mouth,
    glassesGroup,
    hairGroup,
  };
}

/**
 * Construit l'avatar 3D complet avec son squelette et ses maillages
 */
export function buildCharacterModel(config: AvatarConfig): CharacterRig {
  const root = new THREE.Group();

  // Matériaux PBR stylisés
  const skin = new THREE.MeshStandardMaterial({
    color: new THREE.Color(config.skinColor),
    roughness: 0.65,
    metalness: 0.05,
  });

  const clothing = new THREE.MeshStandardMaterial({
    color: new THREE.Color(config.clothingColor),
    roughness: 0.75,
    metalness: 0.05,
  });

  // Couleur d'accent (cordons de capuche, col, poignets)
  const accent = new THREE.MeshStandardMaterial({
    color: 0xf1f5f9,
    roughness: 0.5,
    metalness: 0.1,
  });

  const hair = new THREE.MeshStandardMaterial({
    color: new THREE.Color(config.hairColor),
    roughness: 0.6,
    metalness: 0.1,
  });

  const eyeWhite = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    roughness: 0.3,
  });

  const pupil = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    roughness: 0.2,
  });

  const mouth = new THREE.MeshStandardMaterial({
    color: 0xb91c1c,
    roughness: 0.5,
  });

  const eyebrow = new THREE.MeshStandardMaterial({
    color: new THREE.Color(config.hairColor).multiplyScalar(0.7),
    roughness: 0.8,
  });

  // 1. Base inférieure / Bassin assis ou ancré
  const lowerBody = new THREE.Group();
  const pantsMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.8 });
  const pelvisGeom = new THREE.CylinderGeometry(0.32, 0.28, 0.28, 16);
  pelvisGeom.translate(0, 0.14, 0);
  const pelvis = new THREE.Mesh(pelvisGeom, pantsMat);
  pelvis.castShadow = true;
  lowerBody.add(pelvis);
  root.add(lowerBody);

  // 2. Torso / Sweat à capuche stylisé
  const torso = new THREE.Group();
  torso.position.y = 0.28; // Pivot au niveau de la taille
  root.add(torso);

  const torsoLen = 0.65;
  const torsoGeom = new THREE.CylinderGeometry(0.38, 0.32, torsoLen, 16);
  torsoGeom.scale(1.15, 1, 0.85); // Légèrement aplati d'avant en arrière
  torsoGeom.translate(0, torsoLen / 2, 0);
  const torsoMesh = new THREE.Mesh(torsoGeom, clothing);
  torsoMesh.castShadow = true;
  torsoMesh.receiveShadow = true;
  torso.add(torsoMesh);

  // Poche kangourou du sweat
  const pocketGeom = new THREE.BoxGeometry(0.42, 0.22, 0.08);
  pocketGeom.translate(0, 0.18, 0.22);
  const pocket = new THREE.Mesh(pocketGeom, clothing);
  pocket.castShadow = true;
  torso.add(pocket);

  // Capuche repliée dans le dos
  const hoodBackGeom = new THREE.SphereGeometry(0.3, 14, 12, 0, Math.PI * 2, 0, Math.PI * 0.6);
  hoodBackGeom.scale(1.2, 0.6, 0.9);
  hoodBackGeom.rotateX(0.7);
  const hoodBack = new THREE.Mesh(hoodBackGeom, clothing);
  hoodBack.position.set(0, torsoLen - 0.05, -0.16);
  torso.add(hoodBack);

  // Col du sweat
  const collarGeom = new THREE.TorusGeometry(0.2, 0.04, 8, 16);
  collarGeom.rotateX(Math.PI / 2);
  const collar = new THREE.Mesh(collarGeom, accent);
  collar.position.set(0, torsoLen, 0);
  torso.add(collar);

  // Cordons de serrage de la capuche
  const cordGeom = new THREE.CylinderGeometry(0.012, 0.012, 0.24, 8);
  cordGeom.translate(0, -0.12, 0);

  const leftCord = new THREE.Mesh(cordGeom, accent);
  leftCord.position.set(-0.08, torsoLen - 0.02, 0.22);
  torso.add(leftCord);

  const rightCord = new THREE.Mesh(cordGeom, accent);
  rightCord.position.set(0.08, torsoLen - 0.02, 0.22);
  torso.add(rightCord);

  // 3. Cou et Tête
  const neckGeom = new THREE.CylinderGeometry(0.12, 0.14, 0.16, 12);
  neckGeom.translate(0, 0.08, 0);
  const neck = new THREE.Mesh(neckGeom, skin);
  neck.position.y = torsoLen;
  neck.castShadow = true;
  torso.add(neck);

  const head = createHead(skin, hair, eyeWhite, pupil, eyebrow, mouth, config);
  head.group.position.y = torsoLen + 0.38;
  torso.add(head.group);

  // 4. Bras gauche et bras droit
  const shoulderOffsetY = torsoLen - 0.08;
  const shoulderOffsetX = 0.44;

  const leftArm = createArm(skin, clothing, accent, true);
  leftArm.shoulder.position.set(-shoulderOffsetX, shoulderOffsetY, 0);
  torso.add(leftArm.shoulder);

  const rightArm = createArm(skin, clothing, accent, false);
  rightArm.shoulder.position.set(shoulderOffsetX, shoulderOffsetY, 0);
  torso.add(rightArm.shoulder);

  // Épaulière stylisée pour adoucir la jonction d'épaule
  const shoulderCapGeom = new THREE.SphereGeometry(0.12, 12, 12);
  const leftCap = new THREE.Mesh(shoulderCapGeom, clothing);
  leftCap.position.set(-shoulderOffsetX, shoulderOffsetY, 0);
  torso.add(leftCap);

  const rightCap = new THREE.Mesh(shoulderCapGeom, clothing);
  rightCap.position.set(shoulderOffsetX, shoulderOffsetY, 0);
  torso.add(rightCap);

  // Ombre de contact au sol
  const shadowCanvas = document.createElement('canvas');
  shadowCanvas.width = 128;
  shadowCanvas.height = 128;
  const sCtx = shadowCanvas.getContext('2d');
  if (sCtx) {
    const gradient = sCtx.createRadialGradient(64, 64, 0, 64, 64, 60);
    gradient.addColorStop(0, 'rgba(15, 23, 42, 0.55)');
    gradient.addColorStop(0.5, 'rgba(15, 23, 42, 0.25)');
    gradient.addColorStop(1, 'rgba(15, 23, 42, 0)');
    sCtx.fillStyle = gradient;
    sCtx.fillRect(0, 0, 128, 128);
  }
  const shadowTex = new THREE.CanvasTexture(shadowCanvas);
  const shadowPlaneGeom = new THREE.PlaneGeometry(1.6, 1.6);
  const shadowPlaneMat = new THREE.MeshBasicMaterial({
    map: shadowTex,
    transparent: true,
    depthWrite: false,
    opacity: 0.6,
  });
  const shadowMesh = new THREE.Mesh(shadowPlaneGeom, shadowPlaneMat);
  shadowMesh.rotation.x = -Math.PI / 2;
  shadowMesh.position.y = 0.01;
  root.add(shadowMesh);

  return {
    root,
    torso,
    head,
    leftArm,
    rightArm,
    materials: {
      skin,
      clothing,
      accent,
      hair,
      eyeWhite,
      pupil,
      mouth,
      eyebrow,
    },
  };
}

/**
 * Applique une posture de doigt à ses 3 articulations (base, mi, bout)
 */
function applyFingerPose(rig: FingerRig, pose: FingerJoints, isThumb: boolean = false) {
  const curl = THREE.MathUtils.clamp(pose.curl, 0, 1);
  const spread = THREE.MathUtils.clamp(pose.spread ?? 0, -1, 1);

  if (isThumb) {
    // Le pouce pivote vers l'intérieur pour fermer la pince
    rig.base.rotation.x = 0.2 + curl * 0.9;
    rig.base.rotation.y = 0.4 + spread * 0.5;
    rig.mid.rotation.x = curl * 0.8;
    rig.tip.rotation.x = curl * 0.7;
  } else {
    // Doigts 2 à 5 : flexion vers la paume sur l'axe X, écartement sur Z
    rig.base.rotation.x = curl * (Math.PI * 0.52);
    rig.base.rotation.z = spread * 0.28;
    rig.mid.rotation.x = curl * (Math.PI * 0.55);
    rig.tip.rotation.x = curl * (Math.PI * 0.45);
  }
}

/**
 * Applique une pose de main complète aux 5 doigts et à l'orientation du poignet
 */
export function applyHandPose(handRig: HandRig, pose: HandPose, isLeft: boolean) {
  const sideMul = isLeft ? -1 : 1;

  // Rotation globale du poignet (orienté vers le bas au repos)
  handRig.group.rotation.x = pose.wristRotation[0];
  handRig.group.rotation.y = sideMul * pose.wristRotation[1];
  handRig.group.rotation.z = Math.PI + sideMul * pose.wristRotation[2];

  // Flexion de chaque doigt
  applyFingerPose(handRig.thumb, pose.thumb, true);
  applyFingerPose(handRig.index, pose.index, false);
  applyFingerPose(handRig.middle, pose.middle, false);
  applyFingerPose(handRig.ring, pose.ring, false);
  applyFingerPose(handRig.pinky, pose.pinky, false);
}

/**
 * Applique une pose complète au personnage cartoon 3D (bras, mains, tête, torse, visage)
 */
export function applyPoseToCharacter(character: CharacterRig, pose: CharacterPose) {
  // Bras droit
  character.rightArm.shoulder.rotation.x = pose.rightArm.shoulder[0];
  character.rightArm.shoulder.rotation.y = pose.rightArm.shoulder[1];
  character.rightArm.shoulder.rotation.z = pose.rightArm.shoulder[2];

  character.rightArm.elbow.rotation.x = pose.rightArm.elbow[0];
  character.rightArm.elbow.rotation.y = pose.rightArm.elbow[1];
  character.rightArm.elbow.rotation.z = pose.rightArm.elbow[2];

  applyHandPose(character.rightArm.hand, pose.rightHand, false);

  // Bras gauche
  character.leftArm.shoulder.rotation.x = pose.leftArm.shoulder[0];
  character.leftArm.shoulder.rotation.y = pose.leftArm.shoulder[1];
  character.leftArm.shoulder.rotation.z = pose.leftArm.shoulder[2];

  character.leftArm.elbow.rotation.x = pose.leftArm.elbow[0];
  character.leftArm.elbow.rotation.y = pose.leftArm.elbow[1];
  character.leftArm.elbow.rotation.z = pose.leftArm.elbow[2];

  applyHandPose(character.leftArm.hand, pose.leftHand, true);

  // Tête
  character.head.group.rotation.x = pose.head[0];
  character.head.group.rotation.y = pose.head[1];
  character.head.group.rotation.z = pose.head[2];

  // Torse
  character.torso.rotation.x = pose.torso[0];
  character.torso.rotation.y = pose.torso[1];
  character.torso.rotation.z = pose.torso[2];

  // Expressions faciales : Clignement des yeux
  const blink = THREE.MathUtils.clamp(pose.face.blink, 0, 1);
  const eyeScaleY = 1 - blink * 0.9;
  character.head.leftEye.scale.set(1, eyeScaleY, 1);
  character.head.rightEye.scale.set(1, eyeScaleY, 1);

  // Sourcils
  const browOffset = pose.face.eyebrows * 0.04;
  character.head.leftEyebrow.position.y = 0.18 + browOffset;
  character.head.rightEyebrow.position.y = 0.18 + browOffset;

  // Sourire (échelle et orientation de la bouche)
  const smile = THREE.MathUtils.clamp(pose.face.smile, 0, 1);
  character.head.mouth.scale.set(1 + smile * 0.3, 1 + smile * 0.2, 1);
}
