/**
 * @file src/types/signs.ts
 * @description Types et structures de données pour les poses de la langue des signes et l'animation 3D.
 */

// Représentation de la flexion et de l'écartement d'un doigt
export interface FingerJoints {
  // Flexion de 0 (tendu) à 1 (replié au maximum)
  curl: number;
  // Écartement latéral de -1 (vers l'intérieur) à +1 (vers l'extérieur)
  spread?: number;
}

// État d'une main complète (5 doigts)
export interface HandPose {
  thumb: FingerJoints;
  index: FingerJoints;
  middle: FingerJoints;
  ring: FingerJoints;
  pinky: FingerJoints;
  // Rotation du poignet en radians [x, y, z]
  wristRotation: [number, number, number];
}

// État d'un bras (épaule et coude)
export interface ArmPose {
  // Rotation de l'épaule [pitch, yaw, roll] en radians
  shoulder: [number, number, number];
  // Flexion du coude [pitch, yaw, roll] en radians
  elbow: [number, number, number];
  // Position globale de compensation si nécessaire
  positionOffset?: [number, number, number];
}

// Pose globale du personnage pour une frame d'animation
export interface CharacterPose {
  rightArm: ArmPose;
  rightHand: HandPose;
  leftArm: ArmPose;
  leftHand: HandPose;
  // Rotation de la tête [pitch, yaw, roll]
  head: [number, number, number];
  // Expression du visage : yeux ouverts/fermés, sourcils, sourire, ouverture de la bouche (lip-sync)
  face: {
    blink: number; // 0 = yeux ouverts, 1 = yeux fermés
    eyebrows: number; // -1 = froncés, 0 = neutres, +1 = relevés
    smile: number; // 0 = neutre, 1 = sourire
    mouthOpen?: number; // 0 = bouche fermée, 1 = bouche ouverte (lip-sync / articulation LSF)
  };
  // Inclinaison du torse [pitch, yaw, roll]
  torso: [number, number, number];
}

// Image clé au sein d'un signe
export interface SignKeyframe {
  pose: CharacterPose;
  duration: number; // Durée en millisecondes
}

// Définition d'un signe (mot ou lettre)
export interface SignDefinition {
  id: string;
  name: string;
  type: 'letter' | 'word' | 'gesture';
  description: string;
  keyframes: SignKeyframe[];
}

// Élément d'une séquence de traduction
export interface SequenceItem {
  id: string;
  signId: string;
  text: string;
  type: 'word' | 'letter' | 'space';
  duration: number;
}

// Paramètres de cadrage caméra
export type CameraPreset = 'front' | 'hand' | 'angle';

// Paramètres d'apparence et type de modèle de l'avatar 3D
export interface AvatarConfig {
  modelType: 'cartoon' | 'realistic' | 'glb_custom';
  skinColor: string;
  clothingColor: string;
  hairColor: string;
  hairStyle: 'short' | 'curly' | 'cap';
  hasGlasses: boolean;
  isLeftHanded: boolean;
  gender?: 'male' | 'female';
  glbUrl?: string | null;
  glbFileName?: string | null;
  glbScale?: number;
  glbOffsetY?: number;
}
