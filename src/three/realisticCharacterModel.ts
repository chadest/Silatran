/**
 * @file src/three/realisticCharacterModel.ts
 * @description Modèle 3D humanoïde ultra-réaliste pour la présentation Silatran.
 * Géométrie organique anatomique sans aucune forme bloc/cartoon/Minecraft,
 * avec textures PBR de peau, yeux détaillés, cheveux sculptés et costume sur mesure.
 */

import * as THREE from 'three';
import { AvatarConfig } from '../types/signs';
import { CharacterRig, HandRig, ArmRig, HeadRig } from './characterModel';

/**
 * Génère une texture PBR de grain de peau organique
 */
function generateRealisticSkinTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#f3dfd2';
    ctx.fillRect(0, 0, 512, 512);

    const imgData = ctx.getImageData(0, 0, 512, 512);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      const n = (Math.random() - 0.5) * 8;
      data[i] = Math.min(255, Math.max(0, data[i] + n));
      data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + n * 0.85));
      data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + n * 0.75));
    }
    ctx.putImageData(imgData, 0, 0);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(6, 6);
  return texture;
}

/**
 * Génère une texture d'iris réaliste avec motifs d'auéole et reflets
 */
function generateIrisTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const cx = 128;
    const cy = 128;
    const radius = 120;

    // Fond brun/noisette/bleu profond
    const grad = ctx.createRadialGradient(cx, cy, 10, cx, cy, radius);
    grad.addColorStop(0, '#0f172a');
    grad.addColorStop(0.25, '#1e3a8a');
    grad.addColorStop(0.6, '#0284c7');
    grad.addColorStop(1, '#0c4a6e');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();

    // Rayons d'iris
    ctx.strokeStyle = 'rgba(224, 242, 254, 0.25)';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 60; i++) {
      const angle = (i / 60) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(angle) * 30, cy + Math.sin(angle) * 30);
      ctx.lineTo(cx + Math.cos(angle) * 115, cy + Math.sin(angle) * 115);
      ctx.stroke();
    }

    // Pupille noire centrale
    ctx.fillStyle = '#020617';
    ctx.beginPath();
    ctx.arc(cx, cy, 40, 0, Math.PI * 2);
    ctx.fill();
  }
  return new THREE.CanvasTexture(canvas);
}

/**
 * Génère une texture de tissu de costume (laine peignée fine)
 */
function generateSuitFabricTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, 256, 256);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
    for (let x = 0; x < 256; x += 4) {
      ctx.fillRect(x, 0, 2, 256);
    }
    for (let y = 0; y < 256; y += 4) {
      ctx.fillRect(0, y, 256, 2);
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(8, 8);
  return texture;
}

/**
 * Construit le modèle d'avatar humain ultra-réaliste pour la présentation
 */
export function buildRealisticCharacterModel(config: AvatarConfig): CharacterRig {
  const root = new THREE.Group();

  const skinBumpMap = generateRealisticSkinTexture();
  const irisMap = generateIrisTexture();
  const suitFabricMap = generateSuitFabricTexture();

  // Matériau de peau physique réaliste (Physical SSS Subsurface)
  const skinMaterial = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(config.skinColor || '#e6beab'),
    bumpMap: skinBumpMap,
    bumpScale: 0.002,
    roughness: 0.45,
    metalness: 0.0,
    clearcoat: 0.1,
    clearcoatRoughness: 0.3,
  });

  // Veste de costume professionnelle sur mesure
  const suitMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color(config.clothingColor || '#1e293b'),
    map: suitFabricMap,
    roughness: 0.75,
    metalness: 0.05,
  });

  // Chemise de présentation blanche
  const shirtMaterial = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    roughness: 0.5,
  });

  // Cravate en soie
  const tieMaterial = new THREE.MeshStandardMaterial({
    color: 0x0284c7,
    roughness: 0.3,
    metalness: 0.2,
  });

  // Cheveux réalistes
  const hairMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color(config.hairColor || '#1c1917'),
    roughness: 0.55,
    metalness: 0.1,
  });

  // Yeux et lèvres
  const eyeWhiteMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.1 });
  const irisMaterial = new THREE.MeshStandardMaterial({ map: irisMap, roughness: 0.1 });
  const eyebrowMaterial = new THREE.MeshStandardMaterial({ color: 0x1c1917, roughness: 0.8 });
  const lipsMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color(config.skinColor || '#e6beab').multiplyScalar(0.75).add(new THREE.Color(0x7f1d1d).multiplyScalar(0.25)),
    roughness: 0.4,
  });

  // 1. Torse & Veste de costume sur mesure
  const torso = new THREE.Group();
  torso.position.y = 0.28;
  root.add(torso);

  const torsoLen = 0.68;

  // Buste galbé organique
  const jacketShape = new THREE.Shape();
  jacketShape.moveTo(-0.34, 0);
  jacketShape.quadraticCurveTo(-0.38, torsoLen * 0.5, -0.35, torsoLen);
  jacketShape.lineTo(0.35, torsoLen);
  jacketShape.quadraticCurveTo(0.38, torsoLen * 0.5, 0.34, 0);
  jacketShape.closePath();

  const jacketGeom = new THREE.CylinderGeometry(0.35, 0.29, torsoLen, 32);
  jacketGeom.scale(1.15, 1, 0.8);
  jacketGeom.translate(0, torsoLen / 2, 0);
  const jacketMesh = new THREE.Mesh(jacketGeom, suitMaterial);
  jacketMesh.castShadow = true;
  jacketMesh.receiveShadow = true;
  torso.add(jacketMesh);

  // Col en V de chemise blanche
  const shirtGeom = new THREE.CylinderGeometry(0.17, 0.15, torsoLen * 0.85, 20, 1, false, -Math.PI * 0.3, Math.PI * 0.6);
  shirtGeom.scale(1, 1, 0.85);
  shirtGeom.translate(0, torsoLen * 0.55, 0.06);
  const shirtMesh = new THREE.Mesh(shirtGeom, shirtMaterial);
  torso.add(shirtMesh);

  // Cravate ajustée
  const tiePath = new THREE.CurvePath<THREE.Vector3>();
  const tieCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, torsoLen - 0.05, 0.23),
    new THREE.Vector3(0, torsoLen - 0.22, 0.24),
    new THREE.Vector3(0, torsoLen - 0.42, 0.22),
  ]);
  tiePath.add(tieCurve);
  const tieGeom = new THREE.TubeGeometry(tieCurve, 12, 0.025, 8, false);
  tieGeom.scale(1.5, 1, 0.4);
  const tie = new THREE.Mesh(tieGeom, tieMaterial);
  tie.castShadow = true;
  torso.add(tie);

  // Revers de veste galbés
  const createLapel = (isLeft: boolean) => {
    const sideMul = isLeft ? -1 : 1;
    const lapelCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(sideMul * 0.08, torsoLen - 0.02, 0.22),
      new THREE.Vector3(sideMul * 0.16, torsoLen - 0.18, 0.23),
      new THREE.Vector3(sideMul * 0.06, torsoLen - 0.38, 0.21),
    ]);
    const geom = new THREE.TubeGeometry(lapelCurve, 12, 0.035, 8, false);
    geom.scale(1.8, 1, 0.4);
    const mesh = new THREE.Mesh(geom, suitMaterial);
    mesh.castShadow = true;
    return mesh;
  };
  torso.add(createLapel(true));
  torso.add(createLapel(false));

  // Cou anatomique avec lissage
  const neckGeom = new THREE.CylinderGeometry(0.105, 0.118, 0.17, 24);
  neckGeom.translate(0, 0.085, 0);
  const neck = new THREE.Mesh(neckGeom, skinMaterial);
  neck.position.y = torsoLen;
  neck.castShadow = true;
  torso.add(neck);

  // 2. Tête ultra-détaillée et organique
  const headGroup = new THREE.Group();

  // Ovale de tête anatomique
  const headGeom = new THREE.SphereGeometry(0.34, 36, 32);
  headGeom.scale(0.92, 1.15, 0.98);
  const headMesh = new THREE.Mesh(headGeom, skinMaterial);
  headMesh.castShadow = true;
  headGroup.add(headMesh);

  // Yeux vivants avec iris réalistes et cornée réfléchissante
  const createLivingEye = (isLeft: boolean) => {
    const eyeGroup = new THREE.Group();
    const sideMul = isLeft ? -1 : 1;

    // Globe oculaire
    const eyeWhiteGeom = new THREE.SphereGeometry(0.072, 20, 20);
    eyeWhiteGeom.scale(1, 1.05, 0.5);
    const eyeWhite = new THREE.Mesh(eyeWhiteGeom, eyeWhiteMaterial);
    eyeGroup.add(eyeWhite);

    // Iris & Pupille
    const irisGeom = new THREE.CircleGeometry(0.042, 24);
    const iris = new THREE.Mesh(irisGeom, irisMaterial);
    iris.position.set(0, 0, 0.036);
    eyeGroup.add(iris);

    // Dôme de cornée vitreuse
    const corneaGeom = new THREE.SphereGeometry(0.045, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.5);
    const corneaMat = new THREE.MeshPhysicalMaterial({
      transparent: true,
      opacity: 0.9,
      roughness: 0.0,
      clearcoat: 1.0,
      clearcoatRoughness: 0.0,
    });
    const cornea = new THREE.Mesh(corneaGeom, corneaMat);
    cornea.position.set(0, 0, 0.02);
    cornea.rotation.x = Math.PI / 2;
    eyeGroup.add(cornea);

    // Paupière pour les clignements
    const eyelidGeom = new THREE.SphereGeometry(0.075, 20, 16, 0, Math.PI * 2, 0, Math.PI / 2);
    eyelidGeom.scale(1.02, 1.08, 0.52);
    const eyelid = new THREE.Mesh(eyelidGeom, skinMaterial);
    eyelid.rotation.x = -Math.PI / 2;
    eyelid.visible = false;
    eyeGroup.add(eyelid);

    eyeGroup.position.set(sideMul * 0.115, 0.04, 0.3);
    eyeGroup.rotation.y = sideMul * 0.08;
    headGroup.add(eyeGroup);

    return { eyeGroup, eyelid };
  };

  const { eyeGroup: leftEye, eyelid: leftEyelid } = createLivingEye(true);
  const { eyeGroup: rightEye, eyelid: rightEyelid } = createLivingEye(false);

  // Sourcils naturels sculptés
  const createEyebrow = (isLeft: boolean) => {
    const sideMul = isLeft ? -1 : 1;
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(sideMul * 0.04, 0.15, 0.33),
      new THREE.Vector3(sideMul * 0.12, 0.17, 0.32),
      new THREE.Vector3(sideMul * 0.18, 0.14, 0.29),
    ]);
    const geom = new THREE.TubeGeometry(curve, 10, 0.012, 6, false);
    const mesh = new THREE.Mesh(geom, eyebrowMaterial);
    return mesh;
  };

  const leftEyebrow = createEyebrow(true);
  const rightEyebrow = createEyebrow(false);
  headGroup.add(leftEyebrow);
  headGroup.add(rightEyebrow);

  // Nez anatomique sculpté
  const noseCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.1, 0.32),
    new THREE.Vector3(0, 0.0, 0.36),
    new THREE.Vector3(0, -0.04, 0.35),
  ]);
  const noseGeom = new THREE.TubeGeometry(noseCurve, 8, 0.024, 8, false);
  const nose = new THREE.Mesh(noseGeom, skinMaterial);
  headGroup.add(nose);

  // Lèvres anatomiques 3D
  const upperLipCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.06, -0.13, 0.31),
    new THREE.Vector3(0, -0.12, 0.33),
    new THREE.Vector3(0.06, -0.13, 0.31),
  ]);
  const upperLipGeom = new THREE.TubeGeometry(upperLipCurve, 10, 0.012, 8, false);
  const upperLip = new THREE.Mesh(upperLipGeom, lipsMaterial);
  headGroup.add(upperLip);

  const lowerLipCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.05, -0.145, 0.31),
    new THREE.Vector3(0, -0.155, 0.325),
    new THREE.Vector3(0.05, -0.145, 0.31),
  ]);
  const lowerLipGeom = new THREE.TubeGeometry(lowerLipCurve, 10, 0.014, 8, false);
  const lowerLip = new THREE.Mesh(lowerLipGeom, lipsMaterial);
  headGroup.add(lowerLip);

  const mouth = lowerLip; // Référence pour l'animation faciale

  // Chevelure soignée de présentateur
  const hairGroup = new THREE.Group();
  const hairBaseGeom = new THREE.SphereGeometry(0.35, 28, 24);
  hairBaseGeom.scale(0.96, 1.12, 1.0);
  hairBaseGeom.translate(0, 0.06, -0.03);
  const hairBase = new THREE.Mesh(hairBaseGeom, hairMaterial);
  hairBase.castShadow = true;
  hairGroup.add(hairBase);

  // Mèches volumétriques naturelles
  for (let i = -3; i <= 3; i++) {
    const strandCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(i * 0.04, 0.34, 0.2),
      new THREE.Vector3(i * 0.05, 0.36, 0.3),
      new THREE.Vector3(i * 0.06, 0.32, 0.32),
    ]);
    const strandGeom = new THREE.TubeGeometry(strandCurve, 8, 0.02, 6, false);
    const strand = new THREE.Mesh(strandGeom, hairMaterial);
    strand.castShadow = true;
    hairGroup.add(strand);
  }
  headGroup.add(hairGroup);

  // Lunettes (si configurées)
  const glassesGroup = new THREE.Group();
  const glassesMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.8, roughness: 0.2 });
  const frameGeom = new THREE.TorusGeometry(0.075, 0.008, 8, 20);
  const leftLens = new THREE.Mesh(frameGeom, glassesMat);
  leftLens.position.set(-0.12, 0.04, 0.32);
  glassesGroup.add(leftLens);

  const rightLens = new THREE.Mesh(frameGeom, glassesMat);
  rightLens.position.set(0.12, 0.04, 0.32);
  glassesGroup.add(rightLens);

  const bridgeGeom = new THREE.CylinderGeometry(0.008, 0.008, 0.1);
  bridgeGeom.rotateZ(Math.PI / 2);
  const bridge = new THREE.Mesh(bridgeGeom, glassesMat);
  bridge.position.set(0, 0.04, 0.33);
  glassesGroup.add(bridge);

  glassesGroup.visible = config.hasGlasses;
  headGroup.add(glassesGroup);

  headGroup.position.y = torsoLen + 0.34;
  torso.add(headGroup);

  // 3. Bras fluides et anatomiques avec manchette de chemise
  const createOrganicArm = (isLeft: boolean): ArmRig => {
    const sideMul = isLeft ? -1 : 1;
    const shoulder = new THREE.Group();

    // Bras supérieur
    const upperArmLen = 0.44;
    const upperArmGeom = new THREE.CylinderGeometry(0.078, 0.068, upperArmLen, 20);
    upperArmGeom.translate(0, -upperArmLen / 2, 0);
    const upperArmMesh = new THREE.Mesh(upperArmGeom, suitMaterial);
    upperArmMesh.castShadow = true;
    shoulder.add(upperArmMesh);

    // Coude arrondi
    const elbowCapGeom = new THREE.SphereGeometry(0.072, 16, 16);
    elbowCapGeom.translate(0, -upperArmLen, 0);
    const elbowCap = new THREE.Mesh(elbowCapGeom, suitMaterial);
    shoulder.add(elbowCap);

    const elbow = new THREE.Group();
    elbow.position.y = -upperArmLen;
    shoulder.add(elbow);

    // Avant-bras
    const forearmLen = 0.42;
    const forearmGeom = new THREE.CylinderGeometry(0.066, 0.056, forearmLen, 20);
    forearmGeom.translate(0, -forearmLen / 2, 0);
    const forearmMesh = new THREE.Mesh(forearmGeom, suitMaterial);
    forearmMesh.castShadow = true;
    elbow.add(forearmMesh);

    // Manchette de chemise blanche
    const cuffGeom = new THREE.CylinderGeometry(0.058, 0.054, 0.04, 20);
    cuffGeom.translate(0, -forearmLen + 0.02, 0);
    const cuffMesh = new THREE.Mesh(cuffGeom, shirtMaterial);
    elbow.add(cuffMesh);

    const wrist = new THREE.Group();
    wrist.position.y = -forearmLen;
    elbow.add(wrist);

    // Main organique & 5 doigts articulés
    const handGroup = new THREE.Group();

    // Paume avec galbe du pouce (muscle thénar)
    const palmGeom = new THREE.SphereGeometry(0.1, 20, 16);
    palmGeom.scale(0.85, 1.05, 0.4);
    palmGeom.translate(0, 0.09, 0);
    const palmMesh = new THREE.Mesh(palmGeom, skinMaterial);
    palmMesh.castShadow = true;
    handGroup.add(palmMesh);

    const createOrganicFinger = (length: number, radius: number) => {
      const base = new THREE.Group();
      const mid = new THREE.Group();
      const tip = new THREE.Group();

      const s1 = length * 0.42;
      const s2 = length * 0.33;
      const s3 = length * 0.25;

      const g1 = new THREE.CylinderGeometry(radius * 0.9, radius, s1, 14);
      g1.translate(0, s1 / 2, 0);
      const m1 = new THREE.Mesh(g1, skinMaterial);
      m1.castShadow = true;
      base.add(m1);

      mid.position.y = s1;
      const g2 = new THREE.CylinderGeometry(radius * 0.8, radius * 0.9, s2, 14);
      g2.translate(0, s2 / 2, 0);
      const m2 = new THREE.Mesh(g2, skinMaterial);
      m2.castShadow = true;
      mid.add(m2);
      base.add(mid);

      tip.position.y = s2;
      const g3 = new THREE.CylinderGeometry(radius * 0.6, radius * 0.8, s3, 14);
      g3.translate(0, s3 / 2, 0);
      const m3 = new THREE.Mesh(g3, skinMaterial);
      m3.castShadow = true;
      tip.add(m3);

      // Bouts de doigts arrondis (ongles/empreintes)
      const capGeom = new THREE.SphereGeometry(radius * 0.6, 12, 12);
      capGeom.translate(0, s3, 0);
      const cap = new THREE.Mesh(capGeom, skinMaterial);
      tip.add(cap);

      mid.add(tip);

      return { base, mid, tip };
    };

    const r = 0.019;

    const index = createOrganicFinger(0.18, r);
    index.base.position.set(sideMul * 0.052, 0.19, 0);
    handGroup.add(index.base);

    const middle = createOrganicFinger(0.2, r * 1.05);
    middle.base.position.set(sideMul * 0.017, 0.195, 0);
    handGroup.add(middle.base);

    const ring = createOrganicFinger(0.175, r);
    ring.base.position.set(sideMul * -0.017, 0.19, 0);
    handGroup.add(ring.base);

    const pinky = createOrganicFinger(0.142, r * 0.85);
    pinky.base.position.set(sideMul * -0.052, 0.18, 0);
    handGroup.add(pinky.base);

    const thumb = createOrganicFinger(0.155, r * 1.1);
    thumb.base.position.set(sideMul * 0.075, 0.06, 0.02);
    thumb.base.rotation.z = sideMul * -0.58;
    thumb.base.rotation.y = sideMul * 0.35;
    thumb.base.rotation.x = 0.2;
    handGroup.add(thumb.base);

    // Aligner la main vers le bas au repos sur l'axe Z pour préserver l'orientation naturelle
    handGroup.rotation.z = Math.PI;
    wrist.add(handGroup);

    return {
      shoulder,
      upperArmMesh,
      elbow,
      forearmMesh,
      wrist,
      hand: {
        group: handGroup,
        palmMesh,
        thumb,
        index,
        middle,
        ring,
        pinky,
      },
    };
  };

  const shoulderOffsetX = 0.44;
  const shoulderOffsetY = torsoLen - 0.06;

  const leftArm = createOrganicArm(true);
  leftArm.shoulder.position.set(-shoulderOffsetX, shoulderOffsetY, 0);
  torso.add(leftArm.shoulder);

  const rightArm = createOrganicArm(false);
  rightArm.shoulder.position.set(shoulderOffsetX, shoulderOffsetY, 0);
  torso.add(rightArm.shoulder);

  // Épaulières arrondies pour adoucir la ligne de carrure
  const shoulderCapGeom = new THREE.SphereGeometry(0.11, 16, 16);
  const leftCap = new THREE.Mesh(shoulderCapGeom, suitMaterial);
  leftCap.position.set(-shoulderOffsetX, shoulderOffsetY, 0);
  torso.add(leftCap);

  const rightCap = new THREE.Mesh(shoulderCapGeom, suitMaterial);
  rightCap.position.set(shoulderOffsetX, shoulderOffsetY, 0);
  torso.add(rightCap);

  // Ombre de contact au sol douce
  const shadowCanvas = document.createElement('canvas');
  shadowCanvas.width = 128;
  shadowCanvas.height = 128;
  const sCtx = shadowCanvas.getContext('2d');
  if (sCtx) {
    const grad = sCtx.createRadialGradient(64, 64, 0, 64, 64, 60);
    grad.addColorStop(0, 'rgba(15, 23, 42, 0.65)');
    grad.addColorStop(1, 'rgba(15, 23, 42, 0)');
    sCtx.fillStyle = grad;
    sCtx.fillRect(0, 0, 128, 128);
  }
  const shadowTex = new THREE.CanvasTexture(shadowCanvas);
  const shadowMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(1.6, 1.6),
    new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, opacity: 0.65 })
  );
  shadowMesh.rotation.x = -Math.PI / 2;
  shadowMesh.position.y = 0.01;
  root.add(shadowMesh);

  return {
    root,
    torso,
    head: {
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
    },
    leftArm,
    rightArm,
    materials: {
      skin: skinMaterial as unknown as THREE.MeshStandardMaterial,
      clothing: suitMaterial,
      accent: shirtMaterial,
      hair: hairMaterial,
      eyeWhite: eyeWhiteMaterial,
      pupil: irisMaterial,
      mouth: lipsMaterial,
      eyebrow: eyebrowMaterial,
    },
  };
}
