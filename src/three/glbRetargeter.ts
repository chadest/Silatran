/**
 * @file src/three/glbRetargeter.ts
 * @description Chargeur et retargeter universel pour modèles 3D GLTF / GLB (Teen Boy, Mixamo, Ready Player Me, VRM).
 * Mappe automatiquement la séquence de langue des signes (LSF) aux os du squelette 3D importé.
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { CharacterPose } from '../types/signs';

export interface GLBBoneMap {
  spine?: THREE.Object3D;
  chest?: THREE.Object3D;
  neck?: THREE.Object3D;
  head?: THREE.Object3D;
  jaw?: THREE.Object3D;

  // Bras droit
  rightShoulder?: THREE.Object3D;
  rightArm?: THREE.Object3D;
  rightForeArm?: THREE.Object3D;
  rightHand?: THREE.Object3D;

  // Doigts main droite [Thumb1..4, Index1..4, Middle1..4, Ring1..4, Pinky1..4]
  rightThumb?: THREE.Object3D[];
  rightIndex?: THREE.Object3D[];
  rightMiddle?: THREE.Object3D[];
  rightRing?: THREE.Object3D[];
  rightPinky?: THREE.Object3D[];

  // Bras gauche
  leftShoulder?: THREE.Object3D;
  leftArm?: THREE.Object3D;
  leftForeArm?: THREE.Object3D;
  leftHand?: THREE.Object3D;

  // Doigts main gauche
  leftThumb?: THREE.Object3D[];
  leftIndex?: THREE.Object3D[];
  leftMiddle?: THREE.Object3D[];
  leftRing?: THREE.Object3D[];
  leftPinky?: THREE.Object3D[];
}

export interface LoadedGLBRig {
  container: THREE.Group;
  model: THREE.Object3D;
  boneMap: GLBBoneMap;
  animations: THREE.AnimationClip[];
  mixer?: THREE.AnimationMixer;
  initialRotations: Map<THREE.Object3D, THREE.Euler>;
  detectedBonesCount: number;
}

/**
 * Normalise un nom d'os pour la correspondance multi-convention
 */
function cleanBoneName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Analyse la hiérarchie 3D du fichier GLTF / GLB pour mapper les os du squelette
 */
export function buildGLBBoneMap(root: THREE.Object3D): { boneMap: GLBBoneMap; count: number } {
  const boneMap: GLBBoneMap = {};
  let count = 0;

  const rightThumbList: THREE.Object3D[] = [];
  const rightIndexList: THREE.Object3D[] = [];
  const rightMiddleList: THREE.Object3D[] = [];
  const rightRingList: THREE.Object3D[] = [];
  const rightPinkyList: THREE.Object3D[] = [];

  const leftThumbList: THREE.Object3D[] = [];
  const leftIndexList: THREE.Object3D[] = [];
  const leftMiddleList: THREE.Object3D[] = [];
  const leftRingList: THREE.Object3D[] = [];
  const leftPinkyList: THREE.Object3D[] = [];

  root.traverse((obj) => {
    const rawName = obj.name;
    const n = cleanBoneName(rawName);

    // Tête, mâchoire et buste (en évitant les nubs 'top' ou 'end')
    if (!boneMap.head && (n.includes('head') || n.includes('tete')) && !n.includes('top') && !n.includes('end')) {
      boneMap.head = obj;
      count++;
    } else if (!boneMap.jaw && (n.includes('jaw') || n.includes('machoire') || n.includes('mouth') || n.includes('chin'))) {
      boneMap.jaw = obj;
      count++;
    } else if (!boneMap.neck && n.includes('neck')) {
      boneMap.neck = obj;
      count++;
    } else if (!boneMap.chest && (n.includes('chest') || n.includes('spine2') || n.includes('upperspine'))) {
      boneMap.chest = obj;
      count++;
    } else if (!boneMap.spine && (n.includes('spine') || n.includes('torso'))) {
      boneMap.spine = obj;
      count++;
    }

    // Bras Droit (Right)
    const isRight = n.includes('right') || n.includes('_r') || n.endsWith('r') || n.includes('r_') || n.includes('mixamorigr');
    const isLeft = n.includes('left') || n.includes('_l') || n.endsWith('l') || n.includes('l_') || n.includes('mixamorigl');

    if (isRight && !isLeft) {
      if (!boneMap.rightShoulder && (n.includes('shoulder') || n.includes('clavicle'))) {
        boneMap.rightShoulder = obj;
        count++;
      } else if (!boneMap.rightArm && (n.includes('arm') && !n.includes('fore') && !n.includes('hand'))) {
        boneMap.rightArm = obj;
        count++;
      } else if (!boneMap.rightForeArm && (n.includes('forearm') || n.includes('lowerarm') || n.includes('elbow'))) {
        boneMap.rightForeArm = obj;
        count++;
      } else if (!boneMap.rightHand && (n.includes('hand') || n.includes('wrist')) && !n.includes('thumb') && !n.includes('index') && !n.includes('middle') && !n.includes('ring') && !n.includes('pinky')) {
        boneMap.rightHand = obj;
        count++;
      }

      // Doigts main droite
      if (n.includes('thumb')) rightThumbList.push(obj);
      else if (n.includes('index')) rightIndexList.push(obj);
      else if (n.includes('middle')) rightMiddleList.push(obj);
      else if (n.includes('ring')) rightRingList.push(obj);
      else if (n.includes('pinky') || n.includes('little')) rightPinkyList.push(obj);
    }

    // Bras Gauche (Left)
    if (isLeft && !isRight) {
      if (!boneMap.leftShoulder && (n.includes('shoulder') || n.includes('clavicle'))) {
        boneMap.leftShoulder = obj;
        count++;
      } else if (!boneMap.leftArm && (n.includes('arm') && !n.includes('fore') && !n.includes('hand'))) {
        boneMap.leftArm = obj;
        count++;
      } else if (!boneMap.leftForeArm && (n.includes('forearm') || n.includes('lowerarm') || n.includes('elbow'))) {
        boneMap.leftForeArm = obj;
        count++;
      } else if (!boneMap.leftHand && (n.includes('hand') || n.includes('wrist')) && !n.includes('thumb') && !n.includes('index') && !n.includes('middle') && !n.includes('ring') && !n.includes('pinky')) {
        boneMap.leftHand = obj;
        count++;
      }

      // Doigts main gauche
      if (n.includes('thumb')) leftThumbList.push(obj);
      else if (n.includes('index')) leftIndexList.push(obj);
      else if (n.includes('middle')) leftMiddleList.push(obj);
      else if (n.includes('ring')) leftRingList.push(obj);
      else if (n.includes('pinky') || n.includes('little')) leftPinkyList.push(obj);
    }
  });

  // Trier les phalanges par ordre hiérarchique numérique (1 -> 2 -> 3 -> 4)
  const sortFingers = (list: THREE.Object3D[]) =>
    list.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));

  boneMap.rightThumb = sortFingers(rightThumbList);
  boneMap.rightIndex = sortFingers(rightIndexList);
  boneMap.rightMiddle = sortFingers(rightMiddleList);
  boneMap.rightRing = sortFingers(rightRingList);
  boneMap.rightPinky = sortFingers(rightPinkyList);

  boneMap.leftThumb = sortFingers(leftThumbList);
  boneMap.leftIndex = sortFingers(leftIndexList);
  boneMap.leftMiddle = sortFingers(leftMiddleList);
  boneMap.leftRing = sortFingers(leftRingList);
  boneMap.leftPinky = sortFingers(leftPinkyList);

  count +=
    boneMap.rightThumb.length +
    boneMap.rightIndex.length +
    boneMap.rightMiddle.length +
    boneMap.rightRing.length +
    boneMap.rightPinky.length +
    boneMap.leftThumb.length +
    boneMap.leftIndex.length +
    boneMap.leftMiddle.length +
    boneMap.leftRing.length +
    boneMap.leftPinky.length;

  return { boneMap, count };
}

/**
 * Charge un fichier GLTF / GLB et prépare sa structure de retargeting
 */
export async function loadGLBModel(
  url: string,
  userScale: number = 1.0,
  userOffsetY: number = 0.0
): Promise<LoadedGLBRig> {
  const loader = new GLTFLoader();

  return new Promise((resolve, reject) => {
    loader.load(
      url,
      (gltf) => {
        const container = new THREE.Group();
        const model = gltf.scene;

        // Calcul du centrage et de la taille automatique
        model.updateMatrixWorld(true);
        const bbox = new THREE.Box3().setFromObject(model);
        const size = new THREE.Vector3();
        bbox.getSize(size);

        // Échelle recommandée pour que la personne mesure ~1.70m dans la scène Three.js
        const targetHeight = 1.70;
        const autoScale = size.y > 0 ? targetHeight / size.y : 1.0;
        const finalScale = autoScale * userScale;

        model.scale.set(finalScale, finalScale, finalScale);
        model.updateMatrixWorld(true);

        // Recalculer la boîte englobante après mise à l'échelle
        const updatedBox = new THREE.Box3().setFromObject(model);
        const minY = updatedBox.min.y;

        // Aligner les pieds au sol (Y = 0) et centrer en X/Z
        model.position.y = -minY + userOffsetY;
        model.position.x = -((updatedBox.min.x + updatedBox.max.x) / 2);
        model.position.z = -((updatedBox.min.z + updatedBox.max.z) / 2);
        model.updateMatrixWorld(true);

        // Ombres et configuration PBR
        model.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            const mesh = child as THREE.Mesh;
            if (mesh.material) {
              const mat = mesh.material as THREE.MeshStandardMaterial;
              if (mat.map) mat.map.colorSpace = THREE.SRGBColorSpace;
            }
          }
        });

        container.add(model);

        // Mapper les os du squelette
        const { boneMap, count } = buildGLBBoneMap(model);

        // Mémoriser les rotations initiales T-Pose pour calcul relatif fluide
        const initialRotations = new Map<THREE.Object3D, THREE.Euler>();
        model.traverse((obj) => {
          initialRotations.set(obj, obj.rotation.clone());
        });

        resolve({
          container,
          model,
          boneMap,
          animations: gltf.animations || [],
          initialRotations,
          detectedBonesCount: count,
        });
      },
      undefined,
      (err) => {
        reject(err);
      }
    );
  });
}

/**
 * Applique la flexion d'un doigt aux phalanges de l'os Mixamo (flexion naturelle vers la paume)
 */
function applyGLBFingerFlexion(
  fingerBones: THREE.Object3D[] | undefined,
  pose: { curl: number; spread?: number },
  isThumb: boolean = false
) {
  if (!fingerBones || fingerBones.length === 0) return;
  const curl = THREE.MathUtils.clamp(pose.curl, 0, 1);
  const spread = THREE.MathUtils.clamp(pose.spread ?? 0, -1, 1);

  fingerBones.forEach((bone, idx) => {
    if (idx === 0) {
      if (isThumb) {
        // Pouce (Phalange 1) : adduction vers la paume et flexion naturelle vers l'avant
        bone.rotation.x += curl * 0.6;
        bone.rotation.y -= curl * 0.4;
        bone.rotation.z -= (0.2 + spread * 0.25);
      } else {
        // Doigts 2 à 5 (Phalange 1) : flexion vers l'avant (paume) sur l'axe X
        bone.rotation.x += curl * 1.25;
        bone.rotation.z += spread * 0.2;
      }
    } else if (idx === 1 || idx === 2) {
      if (isThumb) {
        bone.rotation.x += curl * 0.8;
      } else {
        // Phalanges 2 et 3 : flexion vers la paume
        bone.rotation.x += curl * 1.3;
      }
    }
  });
}

/**
 * Applique la pose de la langue des signes au modèle 3D humain importé
 */
export function applyPoseToGLB(glbRig: LoadedGLBRig, pose: CharacterPose) {
  const { boneMap, initialRotations } = glbRig;

  // Réinitialiser vers l'état initial avant d'appliquer les deltas
  initialRotations.forEach((rot, obj) => {
    obj.rotation.copy(rot);
  });

  // Tête, mâchoire et cou (mouvements, inclinaisons et lip-sync 3D)
  if (boneMap.head) {
    boneMap.head.rotation.x += pose.head[0];
    boneMap.head.rotation.y += pose.head[1];
    boneMap.head.rotation.z += pose.head[2];
  }
  if (boneMap.neck) {
    boneMap.neck.rotation.x += pose.head[0] * 0.45;
    boneMap.neck.rotation.y += pose.head[1] * 0.45;
  }

  // Mâchoire et Lip-Sync Vocal 3D
  const mouthOpen = pose.face.mouthOpen || 0;
  if (boneMap.jaw) {
    boneMap.jaw.rotation.x += mouthOpen * 0.35;
  }

  // Application des Morph Targets (Blendshapes) de bouche sur les meshes 3D si présents
  if (glbRig.model) {
    glbRig.model.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        if (mesh.morphTargetInfluences && mesh.morphTargetDictionary) {
          const keys = ['mouthOpen', 'jawOpen', 'viseme_AA', 'viseme_E', 'O', 'MouthOpen', 'Mouth_Open'];
          keys.forEach((key) => {
            if (mesh.morphTargetDictionary![key] !== undefined) {
              mesh.morphTargetInfluences![mesh.morphTargetDictionary![key]] = mouthOpen;
            }
          });
        }
      }
    });
  }

  // Torse / Poitrine
  if (boneMap.chest || boneMap.spine) {
    const torsoBone = boneMap.chest || boneMap.spine;
    if (torsoBone) {
      torsoBone.rotation.x += pose.torso[0];
      torsoBone.rotation.y += pose.torso[1];
      torsoBone.rotation.z += pose.torso[2];
    }
  }

  // Bras droit (Retargeting Mixamo / GLB avec rapprochement frontal vers le buste)
  if (boneMap.rightArm) {
    const lift = pose.rightArm.shoulder[0];
    const forwardAngle = pose.rightArm.shoulder[1];
    const sideAngle = pose.rightArm.shoulder[2];

    // Alignement de l'épaule droite vers le centre du buste
    boneMap.rightArm.rotation.x += (1.35 - lift * 0.95);
    boneMap.rightArm.rotation.y += (0.35 + forwardAngle * 0.85);
    boneMap.rightArm.rotation.z -= (0.25 + sideAngle * 0.65);
  }

  if (boneMap.rightForeArm) {
    const elbowFlex = pose.rightArm.elbow[0];
    // Flexion du coude et orientation vers l'axe central
    boneMap.rightForeArm.rotation.z -= elbowFlex * 0.85;
    boneMap.rightForeArm.rotation.y += (0.40 + pose.rightArm.elbow[1] * 0.55);
    boneMap.rightForeArm.rotation.x += (0.10 + pose.rightArm.elbow[2] * 0.3);
  }

  if (boneMap.rightHand) {
    boneMap.rightHand.rotation.x += pose.rightHand.wristRotation[0];
    boneMap.rightHand.rotation.y += pose.rightHand.wristRotation[1];
    boneMap.rightHand.rotation.z += pose.rightHand.wristRotation[2];
  }

  // Doigts de la main droite (5 doigts complets)
  applyGLBFingerFlexion(boneMap.rightThumb, pose.rightHand.thumb, true);
  applyGLBFingerFlexion(boneMap.rightIndex, pose.rightHand.index, false);
  applyGLBFingerFlexion(boneMap.rightMiddle, pose.rightHand.middle, false);
  applyGLBFingerFlexion(boneMap.rightRing, pose.rightHand.ring, false);
  applyGLBFingerFlexion(boneMap.rightPinky, pose.rightHand.pinky, false);

  // Bras gauche (Mixamo rig symétrique se rapprochant du buste)
  if (boneMap.leftArm) {
    const lift = pose.leftArm.shoulder[0];
    const forwardAngle = pose.leftArm.shoulder[1];
    const sideAngle = pose.leftArm.shoulder[2];

    boneMap.leftArm.rotation.x += (1.35 - lift * 0.95);
    boneMap.leftArm.rotation.y -= (0.35 + forwardAngle * 0.85);
    boneMap.leftArm.rotation.z += (0.25 - sideAngle * 0.65);
  }

  if (boneMap.leftForeArm) {
    const elbowFlex = pose.leftArm.elbow[0];
    boneMap.leftForeArm.rotation.z += elbowFlex * 0.85;
    boneMap.leftForeArm.rotation.y -= (0.40 + pose.leftArm.elbow[1] * 0.55);
    boneMap.leftForeArm.rotation.x += (0.10 + pose.leftArm.elbow[2] * 0.3);
  }

  if (boneMap.leftHand) {
    boneMap.leftHand.rotation.x += pose.leftHand.wristRotation[0];
    boneMap.leftHand.rotation.y -= pose.leftHand.wristRotation[1];
    boneMap.leftHand.rotation.z -= pose.leftHand.wristRotation[2];
  }

  // Doigts de la main gauche
  applyGLBFingerFlexion(boneMap.leftThumb, pose.leftHand.thumb, true);
  applyGLBFingerFlexion(boneMap.leftIndex, pose.leftHand.index, false);
  applyGLBFingerFlexion(boneMap.leftMiddle, pose.leftHand.middle, false);
  applyGLBFingerFlexion(boneMap.leftRing, pose.leftHand.ring, false);
  applyGLBFingerFlexion(boneMap.leftPinky, pose.leftHand.pinky, false);
}
