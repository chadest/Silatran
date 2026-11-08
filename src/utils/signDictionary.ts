/**
 * @file src/utils/signDictionary.ts
 * @description Bibliothèque complète des poses et animations de la langue des signes (LSF / Alphabet Dactylologique / Mots usuels).
 */

import { CharacterPose, HandPose, SignDefinition, SequenceItem, ArmPose } from '../types/signs';

// Main relâchée / neutre au repos
export const RELAXED_HAND: HandPose = {
  thumb: { curl: 0.15, spread: 0.05 },
  index: { curl: 0.15, spread: 0 },
  middle: { curl: 0.18, spread: 0 },
  ring: { curl: 0.2, spread: -0.05 },
  pinky: { curl: 0.22, spread: -0.08 },
  wristRotation: [0, 0, 0],
};

// Poing fermé (S / A)
export const FIST_HAND: HandPose = {
  thumb: { curl: 0.8, spread: -0.2 },
  index: { curl: 0.95, spread: 0 },
  middle: { curl: 0.95, spread: 0 },
  ring: { curl: 0.95, spread: 0 },
  pinky: { curl: 0.95, spread: 0 },
  wristRotation: [0, 0, 0],
};

// Main plate ouverte (B)
export const OPEN_FLAT_HAND: HandPose = {
  thumb: { curl: 0.7, spread: -0.3 }, // Pouce replié sur la paume
  index: { curl: 0.05, spread: 0 },
  middle: { curl: 0.05, spread: 0 },
  ring: { curl: 0.05, spread: 0 },
  pinky: { curl: 0.05, spread: 0 },
  wristRotation: [0, 0, 0],
};

// Main complètement ouverte avec doigts écartés (5)
export const FULL_OPEN_HAND: HandPose = {
  thumb: { curl: 0.05, spread: 0.4 },
  index: { curl: 0.05, spread: 0.2 },
  middle: { curl: 0.05, spread: 0 },
  ring: { curl: 0.05, spread: -0.2 },
  pinky: { curl: 0.05, spread: -0.4 },
  wristRotation: [0, 0, 0],
};

// Index pointé (1 / D)
export const POINTING_HAND: HandPose = {
  thumb: { curl: 0.8, spread: -0.2 },
  index: { curl: 0.05, spread: 0 },
  middle: { curl: 0.9, spread: 0 },
  ring: { curl: 0.9, spread: 0 },
  pinky: { curl: 0.9, spread: 0 },
  wristRotation: [0, 0, 0],
};

// Signe Victoire / Paix / V (2)
export const PEACE_HAND: HandPose = {
  thumb: { curl: 0.85, spread: -0.2 },
  index: { curl: 0.05, spread: 0.25 },
  middle: { curl: 0.05, spread: -0.25 },
  ring: { curl: 0.95, spread: 0 },
  pinky: { curl: 0.95, spread: 0 },
  wristRotation: [0, 0, 0],
};

// Pose neutre au repos naturel (bras et mains le long du corps, orientés vers le bas)
export const NEUTRAL_POSE: CharacterPose = {
  rightArm: {
    shoulder: [0, 0, 0],
    elbow: [0.05, 0, 0],
  },
  rightHand: {
    ...RELAXED_HAND,
    wristRotation: [0, 0, 0],
  },
  leftArm: {
    shoulder: [0, 0, 0],
    elbow: [0.05, 0, 0],
  },
  leftHand: {
    ...RELAXED_HAND,
    wristRotation: [0, 0, 0],
  },
  head: [0, 0, 0],
  face: { blink: 0, eyebrows: 0, smile: 0.15 },
  torso: [0, 0, 0],
};

// Bras droit levé dans l'espace de signature frontal
const BASE_SIGNING_RIGHT_ARM: ArmPose = {
  shoulder: [0.75, -0.25, 0.25],
  elbow: [1.65, -0.35, 0.35],
};

// Bras gauche en position de soutien frontal dans l'espace de signature (mains rapprochées devant le buste comme l'image de référence)
const SIGNING_SPACE_LEFT_ARM: ArmPose = {
  shoulder: [0.60, 0.25, -0.25],
  elbow: [1.55, 0.35, -0.35],
};
const RESTING_LEFT_ARM: ArmPose = SIGNING_SPACE_LEFT_ARM;

/**
 * Créateur de pose dactylologique pour une lettre spécifique
 */
function createLetterPose(
  handConfig: HandPose,
  armMods: Partial<{ shoulder: [number, number, number]; elbow: [number, number, number] }> = {},
  headMods: Partial<{ head: [number, number, number]; smile: number }> = {}
): CharacterPose {
  return {
    rightArm: {
      shoulder: armMods.shoulder ?? BASE_SIGNING_RIGHT_ARM.shoulder,
      elbow: armMods.elbow ?? BASE_SIGNING_RIGHT_ARM.elbow,
    },
    rightHand: handConfig,
    leftArm: SIGNING_SPACE_LEFT_ARM,
    leftHand: {
      ...OPEN_FLAT_HAND,
      wristRotation: [-0.4, 0.2, -0.2],
    },
    head: headMods.head ?? [0.03, 0, 0],
    face: { blink: 0, eyebrows: 0.15, smile: headMods.smile ?? 0.35, mouthOpen: 0.25 },
    torso: [0, 0, 0],
  };
}

/**
 * Dictionnaire complet de l'alphabet dactylologique (A-Z)
 */
export const ALPHABET_SIGNS: Record<string, SignDefinition> = {
  A: {
    id: 'A',
    name: 'Lettre A',
    type: 'letter',
    description: 'Poing fermé avec le pouce plaqué dressé sur le côté.',
    keyframes: [
      {
        pose: createLetterPose({
          thumb: { curl: 0.1, spread: 0.4 }, // Pouce dressé
          index: { curl: 0.95, spread: 0 },
          middle: { curl: 0.95, spread: 0 },
          ring: { curl: 0.95, spread: 0 },
          pinky: { curl: 0.95, spread: 0 },
          wristRotation: [0, 0.3, 0],
        }),
        duration: 400,
      },
    ],
  },
  B: {
    id: 'B',
    name: 'Lettre B',
    type: 'letter',
    description: 'Quatre doigts dressés et serrés, pouce replié sur la paume.',
    keyframes: [
      {
        pose: createLetterPose({
          thumb: { curl: 0.85, spread: -0.3 },
          index: { curl: 0.05, spread: 0 },
          middle: { curl: 0.05, spread: 0 },
          ring: { curl: 0.05, spread: 0 },
          pinky: { curl: 0.05, spread: 0 },
          wristRotation: [0, 0.2, 0],
        }),
        duration: 400,
      },
    ],
  },
  C: {
    id: 'C',
    name: 'Lettre C',
    type: 'letter',
    description: 'Doigts et pouce incurvés dessinant un arc de cercle C.',
    keyframes: [
      {
        pose: createLetterPose({
          thumb: { curl: 0.4, spread: 0.3 },
          index: { curl: 0.45, spread: 0 },
          middle: { curl: 0.5, spread: 0 },
          ring: { curl: 0.5, spread: 0 },
          pinky: { curl: 0.5, spread: 0 },
          wristRotation: [0.1, -0.4, 0.2],
        }),
        duration: 400,
      },
    ],
  },
  D: {
    id: 'D',
    name: 'Lettre D',
    type: 'letter',
    description: 'Index pointé vers le haut, pouce et autres doigts en cercle.',
    keyframes: [
      {
        pose: createLetterPose({
          thumb: { curl: 0.65, spread: 0.1 },
          index: { curl: 0.05, spread: 0 },
          middle: { curl: 0.75, spread: 0 },
          ring: { curl: 0.8, spread: 0 },
          pinky: { curl: 0.85, spread: 0 },
          wristRotation: [0.1, 0.1, 0],
        }),
        duration: 400,
      },
    ],
  },
  E: {
    id: 'E',
    name: 'Lettre E',
    type: 'letter',
    description: 'Tous les doigts repliés avec leurs pointes reposant sur le pouce.',
    keyframes: [
      {
        pose: createLetterPose({
          thumb: { curl: 0.75, spread: -0.2 },
          index: { curl: 0.8, spread: 0 },
          middle: { curl: 0.8, spread: 0 },
          ring: { curl: 0.8, spread: 0 },
          pinky: { curl: 0.8, spread: 0 },
          wristRotation: [0, 0.2, 0],
        }),
        duration: 400,
      },
    ],
  },
  F: {
    id: 'F',
    name: 'Lettre F',
    type: 'letter',
    description: 'Pouce et index joints en boucle, trois autres doigts dressés (OK).',
    keyframes: [
      {
        pose: createLetterPose({
          thumb: { curl: 0.6, spread: 0 },
          index: { curl: 0.65, spread: 0 },
          middle: { curl: 0.05, spread: 0.1 },
          ring: { curl: 0.05, spread: 0 },
          pinky: { curl: 0.05, spread: -0.1 },
          wristRotation: [0, 0.3, 0],
        }),
        duration: 400,
      },
    ],
  },
  G: {
    id: 'G',
    name: 'Lettre G',
    type: 'letter',
    description: 'Index et pouce pointés parallèlement vers le côté gauche.',
    keyframes: [
      {
        pose: createLetterPose({
          thumb: { curl: 0.05, spread: 0.3 },
          index: { curl: 0.05, spread: 0 },
          middle: { curl: 0.95, spread: 0 },
          ring: { curl: 0.95, spread: 0 },
          pinky: { curl: 0.95, spread: 0 },
          wristRotation: [0.3, -0.6, 0.4],
        }),
        duration: 400,
      },
    ],
  },
  H: {
    id: 'H',
    name: 'Lettre H',
    type: 'letter',
    description: 'Index et majeur pointés horizontalement ensemble.',
    keyframes: [
      {
        pose: createLetterPose({
          thumb: { curl: 0.7, spread: -0.1 },
          index: { curl: 0.05, spread: 0.05 },
          middle: { curl: 0.05, spread: -0.05 },
          ring: { curl: 0.95, spread: 0 },
          pinky: { curl: 0.95, spread: 0 },
          wristRotation: [0.3, -0.7, 0.5],
        }),
        duration: 400,
      },
    ],
  },
  I: {
    id: 'I',
    name: 'Lettre I',
    type: 'letter',
    description: 'Auriculaire (petit doigt) dressé droit vers le haut, poing fermé.',
    keyframes: [
      {
        pose: createLetterPose({
          thumb: { curl: 0.8, spread: -0.2 },
          index: { curl: 0.95, spread: 0 },
          middle: { curl: 0.95, spread: 0 },
          ring: { curl: 0.95, spread: 0 },
          pinky: { curl: 0.05, spread: 0.1 },
          wristRotation: [0, 0.2, 0],
        }),
        duration: 400,
      },
    ],
  },
  J: {
    id: 'J',
    name: 'Lettre J',
    type: 'letter',
    description: 'Auriculaire dressé traçant la courbe du J dans l\'air.',
    keyframes: [
      {
        pose: createLetterPose({
          thumb: { curl: 0.8, spread: -0.2 },
          index: { curl: 0.95, spread: 0 },
          middle: { curl: 0.95, spread: 0 },
          ring: { curl: 0.95, spread: 0 },
          pinky: { curl: 0.05, spread: 0.1 },
          wristRotation: [0, 0.2, 0],
        }),
        duration: 250,
      },
      {
        pose: createLetterPose({
          thumb: { curl: 0.8, spread: -0.2 },
          index: { curl: 0.95, spread: 0 },
          middle: { curl: 0.95, spread: 0 },
          ring: { curl: 0.95, spread: 0 },
          pinky: { curl: 0.05, spread: 0.2 },
          wristRotation: [0.4, 0.6, -0.5],
        }),
        duration: 350,
      },
    ],
  },
  K: {
    id: 'K',
    name: 'Lettre K',
    type: 'letter',
    description: 'Index vers le haut, majeur incliné, pouce entre les deux.',
    keyframes: [
      {
        pose: createLetterPose({
          thumb: { curl: 0.2, spread: 0.2 },
          index: { curl: 0.05, spread: 0.1 },
          middle: { curl: 0.35, spread: 0 },
          ring: { curl: 0.95, spread: 0 },
          pinky: { curl: 0.95, spread: 0 },
          wristRotation: [0, 0.2, 0],
        }),
        duration: 400,
      },
    ],
  },
  L: {
    id: 'L',
    name: 'Lettre L',
    type: 'letter',
    description: 'Index vers le haut et pouce écarté horizontalement formant un L.',
    keyframes: [
      {
        pose: createLetterPose({
          thumb: { curl: 0.05, spread: 0.7 },
          index: { curl: 0.05, spread: 0 },
          middle: { curl: 0.95, spread: 0 },
          ring: { curl: 0.95, spread: 0 },
          pinky: { curl: 0.95, spread: 0 },
          wristRotation: [0, 0.1, 0],
        }),
        duration: 400,
      },
    ],
  },
  M: {
    id: 'M',
    name: 'Lettre M',
    type: 'letter',
    description: 'Trois doigts rabattus par-dessus le pouce.',
    keyframes: [
      {
        pose: createLetterPose({
          thumb: { curl: 0.7, spread: -0.3 },
          index: { curl: 0.85, spread: 0 },
          middle: { curl: 0.85, spread: 0 },
          ring: { curl: 0.85, spread: 0 },
          pinky: { curl: 0.95, spread: 0 },
          wristRotation: [0.2, 0.1, 0],
        }),
        duration: 400,
      },
    ],
  },
  N: {
    id: 'N',
    name: 'Lettre N',
    type: 'letter',
    description: 'Deux doigts (index et majeur) rabattus par-dessus le pouce.',
    keyframes: [
      {
        pose: createLetterPose({
          thumb: { curl: 0.7, spread: -0.2 },
          index: { curl: 0.85, spread: 0 },
          middle: { curl: 0.85, spread: 0 },
          ring: { curl: 0.95, spread: 0 },
          pinky: { curl: 0.95, spread: 0 },
          wristRotation: [0.2, 0.1, 0],
        }),
        duration: 400,
      },
    ],
  },
  O: {
    id: 'O',
    name: 'Lettre O',
    type: 'letter',
    description: 'Tous les doigts et le pouce se touchent formant un cercle O.',
    keyframes: [
      {
        pose: createLetterPose({
          thumb: { curl: 0.55, spread: 0.1 },
          index: { curl: 0.65, spread: 0 },
          middle: { curl: 0.7, spread: 0 },
          ring: { curl: 0.7, spread: 0 },
          pinky: { curl: 0.7, spread: 0 },
          wristRotation: [0, 0.1, 0],
        }),
        duration: 400,
      },
    ],
  },
  P: {
    id: 'P',
    name: 'Lettre P',
    type: 'letter',
    description: 'Configuration en K dirigée vers le bas.',
    keyframes: [
      {
        pose: createLetterPose({
          thumb: { curl: 0.2, spread: 0.2 },
          index: { curl: 0.05, spread: 0.1 },
          middle: { curl: 0.35, spread: 0 },
          ring: { curl: 0.95, spread: 0 },
          pinky: { curl: 0.95, spread: 0 },
          wristRotation: [1.1, -0.2, 0.3],
        }),
        duration: 400,
      },
    ],
  },
  Q: {
    id: 'Q',
    name: 'Lettre Q',
    type: 'letter',
    description: 'Configuration en G orientée vers le bas.',
    keyframes: [
      {
        pose: createLetterPose({
          thumb: { curl: 0.05, spread: 0.3 },
          index: { curl: 0.05, spread: 0 },
          middle: { curl: 0.95, spread: 0 },
          ring: { curl: 0.95, spread: 0 },
          pinky: { curl: 0.95, spread: 0 },
          wristRotation: [1.2, -0.4, 0.2],
        }),
        duration: 400,
      },
    ],
  },
  R: {
    id: 'R',
    name: 'Lettre R',
    type: 'letter',
    description: 'Index et majeur croisés.',
    keyframes: [
      {
        pose: createLetterPose({
          thumb: { curl: 0.8, spread: -0.2 },
          index: { curl: 0.05, spread: -0.1 }, // Croisement
          middle: { curl: 0.05, spread: 0.15 },
          ring: { curl: 0.95, spread: 0 },
          pinky: { curl: 0.95, spread: 0 },
          wristRotation: [0, 0.2, 0],
        }),
        duration: 400,
      },
    ],
  },
  S: {
    id: 'S',
    name: 'Lettre S',
    type: 'letter',
    description: 'Poing bien fermé avec le pouce replié devant les doigts.',
    keyframes: [
      {
        pose: createLetterPose({
          thumb: { curl: 0.9, spread: -0.4 },
          index: { curl: 0.95, spread: 0 },
          middle: { curl: 0.95, spread: 0 },
          ring: { curl: 0.95, spread: 0 },
          pinky: { curl: 0.95, spread: 0 },
          wristRotation: [0, 0.2, 0],
        }),
        duration: 400,
      },
    ],
  },
  T: {
    id: 'T',
    name: 'Lettre T',
    type: 'letter',
    description: 'Pouce calé entre l\'index et le majeur.',
    keyframes: [
      {
        pose: createLetterPose({
          thumb: { curl: 0.5, spread: -0.1 },
          index: { curl: 0.9, spread: 0.1 },
          middle: { curl: 0.95, spread: 0 },
          ring: { curl: 0.95, spread: 0 },
          pinky: { curl: 0.95, spread: 0 },
          wristRotation: [0, 0.2, 0],
        }),
        duration: 400,
      },
    ],
  },
  U: {
    id: 'U',
    name: 'Lettre U',
    type: 'letter',
    description: 'Index et majeur dressés et bien serrés côte à côte.',
    keyframes: [
      {
        pose: createLetterPose({
          thumb: { curl: 0.85, spread: -0.2 },
          index: { curl: 0.05, spread: 0 },
          middle: { curl: 0.05, spread: 0 },
          ring: { curl: 0.95, spread: 0 },
          pinky: { curl: 0.95, spread: 0 },
          wristRotation: [0, 0.2, 0],
        }),
        duration: 400,
      },
    ],
  },
  V: {
    id: 'V',
    name: 'Lettre V',
    type: 'letter',
    description: 'Index et majeur dressés et écartés en V.',
    keyframes: [
      {
        pose: createLetterPose({
          thumb: { curl: 0.85, spread: -0.2 },
          index: { curl: 0.05, spread: 0.3 },
          middle: { curl: 0.05, spread: -0.3 },
          ring: { curl: 0.95, spread: 0 },
          pinky: { curl: 0.95, spread: 0 },
          wristRotation: [0, 0.2, 0],
        }),
        duration: 400,
      },
    ],
  },
  W: {
    id: 'W',
    name: 'Lettre W',
    type: 'letter',
    description: 'Index, majeur et annulaire dressés et écartés en W.',
    keyframes: [
      {
        pose: createLetterPose({
          thumb: { curl: 0.85, spread: -0.2 },
          index: { curl: 0.05, spread: 0.3 },
          middle: { curl: 0.05, spread: 0 },
          ring: { curl: 0.05, spread: -0.3 },
          pinky: { curl: 0.95, spread: 0 },
          wristRotation: [0, 0.2, 0],
        }),
        duration: 400,
      },
    ],
  },
  X: {
    id: 'X',
    name: 'Lettre X',
    type: 'letter',
    description: 'Index courbé en crochet, autres doigts pliés.',
    keyframes: [
      {
        pose: createLetterPose({
          thumb: { curl: 0.85, spread: -0.2 },
          index: { curl: 0.5, spread: 0 },
          middle: { curl: 0.95, spread: 0 },
          ring: { curl: 0.95, spread: 0 },
          pinky: { curl: 0.95, spread: 0 },
          wristRotation: [0, 0.3, 0],
        }),
        duration: 400,
      },
    ],
  },
  Y: {
    id: 'Y',
    name: 'Lettre Y',
    type: 'letter',
    description: 'Pouce et auriculaire déployés (signe Shaka / Téléphone).',
    keyframes: [
      {
        pose: createLetterPose({
          thumb: { curl: 0.05, spread: 0.7 },
          index: { curl: 0.95, spread: 0 },
          middle: { curl: 0.95, spread: 0 },
          ring: { curl: 0.95, spread: 0 },
          pinky: { curl: 0.05, spread: 0.6 },
          wristRotation: [0, 0.2, 0],
        }),
        duration: 400,
      },
    ],
  },
  Z: {
    id: 'Z',
    name: 'Lettre Z',
    type: 'letter',
    description: 'Index pointé traçant la silhouette du Z dans l\'espace.',
    keyframes: [
      {
        pose: createLetterPose(
          {
            thumb: { curl: 0.85, spread: -0.2 },
            index: { curl: 0.05, spread: 0 },
            middle: { curl: 0.95, spread: 0 },
            ring: { curl: 0.95, spread: 0 },
            pinky: { curl: 0.95, spread: 0 },
            wristRotation: [0.1, 0, 0],
          },
          { shoulder: [0.85, -0.45, 0.2] }
        ),
        duration: 200,
      },
      {
        pose: createLetterPose(
          {
            thumb: { curl: 0.85, spread: -0.2 },
            index: { curl: 0.05, spread: 0 },
            middle: { curl: 0.95, spread: 0 },
            ring: { curl: 0.95, spread: 0 },
            pinky: { curl: 0.95, spread: 0 },
            wristRotation: [0.1, -0.3, 0],
          },
          { shoulder: [0.8, -0.15, 0.3] }
        ),
        duration: 250,
      },
      {
        pose: createLetterPose(
          {
            thumb: { curl: 0.85, spread: -0.2 },
            index: { curl: 0.05, spread: 0 },
            middle: { curl: 0.95, spread: 0 },
            ring: { curl: 0.95, spread: 0 },
            pinky: { curl: 0.95, spread: 0 },
            wristRotation: [0.1, 0.2, 0],
          },
          { shoulder: [0.7, -0.35, 0.2] }
        ),
        duration: 250,
      },
    ],
  },
};

/**
 * Dictionnaire des mots courants de la langue des signes (LSF / vocabulaire expressif)
 */
export const VOCABULARY_SIGNS: Record<string, SignDefinition> = {
  BONJOUR: {
    id: 'BONJOUR',
    name: 'Bonjour',
    type: 'word',
    description: 'Main droite ouverte partant des lèvres et s\'avançant vers l\'interlocuteur avec les deux mains dans l\'espace frontal.',
    keyframes: [
      // Étape 1 : main plate aux lèvres avec bouche ouverte (lip-sync "Bon-")
      {
        pose: {
          rightArm: { shoulder: [0.95, -0.25, 0.15], elbow: [2.15, -0.45, 0.35] },
          rightHand: {
            ...OPEN_FLAT_HAND,
            thumb: { curl: 0.3, spread: 0.2 },
            wristRotation: [-0.2, 0.3, -0.2],
          },
          leftArm: SIGNING_SPACE_LEFT_ARM,
          leftHand: { ...OPEN_FLAT_HAND, wristRotation: [-0.4, 0.2, -0.2] },
          head: [-0.08, 0, 0],
          face: { blink: 0, eyebrows: 0.4, smile: 0.7, mouthOpen: 0.6 },
          torso: [0.03, 0, 0],
        },
        duration: 350,
      },
      // Étape 2 : déploiement vers l'avant avec grand sourire ("-jour") et hochement
      {
        pose: {
          rightArm: { shoulder: [0.7, -0.15, 0.2], elbow: [1.25, -0.2, 0.2] },
          rightHand: {
            ...FULL_OPEN_HAND,
            wristRotation: [0.1, 0.1, 0],
          },
          leftArm: SIGNING_SPACE_LEFT_ARM,
          leftHand: { ...OPEN_FLAT_HAND, wristRotation: [-0.3, 0.1, -0.1] },
          head: [0.08, 0, 0],
          face: { blink: 0, eyebrows: 0.3, smile: 0.9, mouthOpen: 0.2 },
          torso: [-0.02, 0, 0],
        },
        duration: 500,
      },
    ],
  },

  MERCI: {
    id: 'MERCI',
    name: 'Merci',
    type: 'word',
    description: 'Bout des doigts touchant le menton puis s\'ouvrant vers l\'avant avec un hochement de gratitude.',
    keyframes: [
      // Étape 1 : doigts au menton ("Mer-")
      {
        pose: {
          rightArm: { shoulder: [0.9, -0.25, 0.15], elbow: [2.05, -0.4, 0.35] },
          rightHand: {
            ...OPEN_FLAT_HAND,
            thumb: { curl: 0.2, spread: 0.2 },
            wristRotation: [-0.3, 0.2, -0.1],
          },
          leftArm: SIGNING_SPACE_LEFT_ARM,
          leftHand: { ...OPEN_FLAT_HAND, wristRotation: [-0.4, 0.2, -0.2] },
          head: [-0.06, 0, 0],
          face: { blink: 0, eyebrows: 0.3, smile: 0.6, mouthOpen: 0.5 },
          torso: [0.02, 0, 0],
        },
        duration: 300,
      },
      // Étape 2 : projection douce vers l'avant ("-ci") avec hochement
      {
        pose: {
          rightArm: { shoulder: [0.65, -0.15, 0.15], elbow: [1.15, -0.15, 0.1] },
          rightHand: {
            ...OPEN_FLAT_HAND,
            wristRotation: [0.1, 0, 0],
          },
          leftArm: SIGNING_SPACE_LEFT_ARM,
          leftHand: { ...OPEN_FLAT_HAND, wristRotation: [-0.3, 0.1, -0.1] },
          head: [0.12, 0, 0], // Hochement de tête chaleureux
          face: { blink: 0, eyebrows: 0.2, smile: 0.8, mouthOpen: 0.2 },
          torso: [0, 0, 0],
        },
        duration: 450,
      },
    ],
  },

  SVP: {
    id: 'SVP',
    name: 'S\'il vous plaît',
    type: 'word',
    description: 'Main droite plate effectuant un mouvement circulaire sur le buste.',
    keyframes: [
      {
        pose: {
          rightArm: { shoulder: [0.55, -0.1, 0.1], elbow: [1.6, -0.3, 0.3] },
          rightHand: {
            ...OPEN_FLAT_HAND,
            wristRotation: [-0.2, 0.3, -0.3],
          },
          leftArm: SIGNING_SPACE_LEFT_ARM,
          leftHand: { ...OPEN_FLAT_HAND, wristRotation: [-0.4, 0.2, -0.2] },
          head: [0.05, 0, 0],
          face: { blink: 0, eyebrows: 0.4, smile: 0.6, mouthOpen: 0.4 },
          torso: [0, 0, 0],
        },
        duration: 320,
      },
      {
        pose: {
          rightArm: { shoulder: [0.6, -0.2, 0.15], elbow: [1.4, -0.2, 0.2] },
          rightHand: {
            ...OPEN_FLAT_HAND,
            wristRotation: [-0.1, 0.1, -0.1],
          },
          leftArm: SIGNING_SPACE_LEFT_ARM,
          leftHand: { ...OPEN_FLAT_HAND, wristRotation: [-0.3, 0.1, -0.1] },
          head: [0.02, 0, 0],
          face: { blink: 0, eyebrows: 0.3, smile: 0.6, mouthOpen: 0.2 },
          torso: [0, 0, 0],
        },
        duration: 320,
      },
    ],
  },

  OUI: {
    id: 'OUI',
    name: 'Oui',
    type: 'word',
    description: 'Poing fermé imitant un hochement de tête affirmatif.',
    keyframes: [
      {
        pose: {
          rightArm: { shoulder: [0.75, -0.25, 0.15], elbow: [1.55, -0.2, 0.2] },
          rightHand: { ...FIST_HAND, wristRotation: [-0.3, 0.1, 0] },
          leftArm: SIGNING_SPACE_LEFT_ARM,
          leftHand: { ...OPEN_FLAT_HAND, wristRotation: [-0.4, 0.2, -0.2] },
          head: [-0.12, 0, 0],
          face: { blink: 0, eyebrows: 0.2, smile: 0.6, mouthOpen: 0.5 },
          torso: [0, 0, 0],
        },
        duration: 250,
      },
      {
        pose: {
          rightArm: { shoulder: [0.75, -0.25, 0.15], elbow: [1.55, -0.2, 0.2] },
          rightHand: { ...FIST_HAND, wristRotation: [0.4, 0.1, 0] },
          leftArm: SIGNING_SPACE_LEFT_ARM,
          leftHand: { ...OPEN_FLAT_HAND, wristRotation: [-0.3, 0.1, -0.1] },
          head: [0.15, 0, 0], // Hochement de tête affirmatif
          face: { blink: 0, eyebrows: 0.2, smile: 0.7, mouthOpen: 0.2 },
          torso: [0, 0, 0],
        },
        duration: 250,
      },
      {
        pose: {
          rightArm: { shoulder: [0.75, -0.25, 0.15], elbow: [1.55, -0.2, 0.2] },
          rightHand: { ...FIST_HAND, wristRotation: [0.0, 0.1, 0] },
          leftArm: SIGNING_SPACE_LEFT_ARM,
          leftHand: { ...OPEN_FLAT_HAND, wristRotation: [-0.3, 0.1, -0.1] },
          head: [0.03, 0, 0],
          face: { blink: 0, eyebrows: 0.2, smile: 0.6, mouthOpen: 0.1 },
          torso: [0, 0, 0],
        },
        duration: 200,
      },
    ],
  },

  NON: {
    id: 'NON',
    name: 'Non',
    type: 'word',
    description: 'Index et majeur claquant rapidement contre le pouce comme un bec, accompagné d\'un mouvement négatif de tête.',
    keyframes: [
      {
        pose: {
          rightArm: { shoulder: [0.8, -0.3, 0.2], elbow: [1.5, -0.3, 0.3] },
          rightHand: {
            thumb: { curl: 0.1, spread: 0.3 },
            index: { curl: 0.1, spread: 0.1 },
            middle: { curl: 0.1, spread: -0.1 },
            ring: { curl: 0.95, spread: 0 },
            pinky: { curl: 0.95, spread: 0 },
            wristRotation: [0, 0.2, 0],
          },
          leftArm: RESTING_LEFT_ARM,
          leftHand: RELAXED_HAND,
          head: [0, 0.15, 0], // Hochement de tête gauche/droite
          face: { blink: 0, eyebrows: -0.2, smile: 0.0 },
          torso: [0, 0, 0],
        },
        duration: 250,
      },
      {
        pose: {
          rightArm: { shoulder: [0.8, -0.3, 0.2], elbow: [1.5, -0.3, 0.3] },
          rightHand: {
            thumb: { curl: 0.7, spread: 0 },
            index: { curl: 0.7, spread: 0 },
            middle: { curl: 0.7, spread: 0 },
            ring: { curl: 0.95, spread: 0 },
            pinky: { curl: 0.95, spread: 0 },
            wristRotation: [0, 0.2, 0],
          },
          leftArm: RESTING_LEFT_ARM,
          leftHand: RELAXED_HAND,
          head: [0, -0.15, 0],
          face: { blink: 0, eyebrows: -0.2, smile: 0.0 },
          torso: [0, 0, 0],
        },
        duration: 250,
      },
    ],
  },

  AIDER: {
    id: 'AIDER',
    name: 'Aider',
    type: 'word',
    description: 'Poing droit reposant sur la paume gauche ouverte et s\'élevant ensemble.',
    keyframes: [
      {
        pose: {
          rightArm: { shoulder: [0.65, -0.1, 0.1], elbow: [1.7, -0.2, 0.2] },
          rightHand: { ...FIST_HAND, thumb: { curl: 0.1, spread: 0.4 }, wristRotation: [0, 0, 0] },
          leftArm: { shoulder: [0.65, 0.1, -0.1], elbow: [1.7, 0.2, -0.2] },
          leftHand: { ...OPEN_FLAT_HAND, wristRotation: [-0.6, 0, 0] },
          head: [0.05, 0, 0],
          face: { blink: 0, eyebrows: 0.2, smile: 0.4 },
          torso: [0, 0, 0],
        },
        duration: 350,
      },
      {
        pose: {
          rightArm: { shoulder: [0.8, -0.1, 0.1], elbow: [1.5, -0.1, 0.2] },
          rightHand: { ...FIST_HAND, thumb: { curl: 0.1, spread: 0.4 }, wristRotation: [0, 0, 0] },
          leftArm: { shoulder: [0.8, 0.1, -0.1], elbow: [1.5, 0.1, -0.2] },
          leftHand: { ...OPEN_FLAT_HAND, wristRotation: [-0.5, 0, 0] },
          head: [0.08, 0, 0],
          face: { blink: 0, eyebrows: 0.3, smile: 0.6 },
          torso: [-0.02, 0, 0],
        },
        duration: 400,
      },
    ],
  },

  AMOUR: {
    id: 'AMOUR',
    name: 'Amour / Aimer',
    type: 'word',
    description: 'Bras croisés sur la poitrine en étreinte chaleureuse avec un sourire doux.',
    keyframes: [
      {
        pose: {
          rightArm: { shoulder: [0.75, 0.3, 0.3], elbow: [2.1, 0.4, -0.2] },
          rightHand: { ...FIST_HAND, wristRotation: [0.2, 0.2, 0] },
          leftArm: { shoulder: [0.75, -0.3, -0.3], elbow: [2.1, -0.4, 0.2] },
          leftHand: { ...FIST_HAND, wristRotation: [0.2, -0.2, 0] },
          head: [-0.05, 0.05, 0.05],
          face: { blink: 0, eyebrows: 0.2, smile: 0.9 },
          torso: [0.03, 0, 0],
        },
        duration: 650,
      },
    ],
  },

  AMI: {
    id: 'AMI',
    name: 'Ami',
    type: 'word',
    description: 'Index croisés et accrochés l\'un à l\'autre, symbolisant le lien d\'amitié.',
    keyframes: [
      {
        pose: {
          rightArm: { shoulder: [0.7, -0.1, 0.2], elbow: [1.6, -0.2, 0.3] },
          rightHand: {
            ...POINTING_HAND,
            index: { curl: 0.4, spread: 0 },
            wristRotation: [0.2, 0.4, 0],
          },
          leftArm: { shoulder: [0.7, 0.1, -0.2], elbow: [1.6, 0.2, -0.3] },
          leftHand: {
            ...POINTING_HAND,
            index: { curl: 0.4, spread: 0 },
            wristRotation: [0.2, -0.4, 0],
          },
          head: [0.05, 0, 0],
          face: { blink: 0, eyebrows: 0.2, smile: 0.7 },
          torso: [0, 0, 0],
        },
        duration: 550,
      },
    ],
  },

  AU_REVOIR: {
    id: 'AU_REVOIR',
    name: 'Au revoir',
    type: 'word',
    description: 'Main droite levée effectuant un balancement d\'au revoir.',
    keyframes: [
      {
        pose: {
          rightArm: { shoulder: [1.1, -0.45, 0.3], elbow: [1.8, -0.5, 0.4] },
          rightHand: { ...FULL_OPEN_HAND, wristRotation: [0, 0.4, -0.3] },
          leftArm: RESTING_LEFT_ARM,
          leftHand: RELAXED_HAND,
          head: [0, -0.05, 0.05],
          face: { blink: 0, eyebrows: 0.2, smile: 0.8 },
          torso: [0, 0, 0],
        },
        duration: 300,
      },
      {
        pose: {
          rightArm: { shoulder: [1.1, -0.45, 0.3], elbow: [1.8, -0.5, 0.4] },
          rightHand: { ...FULL_OPEN_HAND, wristRotation: [0, 0.4, 0.3] },
          leftArm: RESTING_LEFT_ARM,
          leftHand: RELAXED_HAND,
          head: [0, 0.05, -0.05],
          face: { blink: 0, eyebrows: 0.2, smile: 0.8 },
          torso: [0, 0, 0],
        },
        duration: 300,
      },
      {
        pose: {
          rightArm: { shoulder: [1.1, -0.45, 0.3], elbow: [1.8, -0.5, 0.4] },
          rightHand: { ...FULL_OPEN_HAND, wristRotation: [0, 0.4, -0.3] },
          leftArm: RESTING_LEFT_ARM,
          leftHand: RELAXED_HAND,
          head: [0, -0.05, 0.05],
          face: { blink: 0, eyebrows: 0.2, smile: 0.8 },
          torso: [0, 0, 0],
        },
        duration: 300,
      },
    ],
  },

  MAISON: {
    id: 'MAISON',
    name: 'Maison',
    type: 'word',
    description: 'Les deux mains plates se joignent par le bout des doigts pour former un toit.',
    keyframes: [
      {
        pose: {
          rightArm: { shoulder: [0.9, -0.15, 0.3], elbow: [1.6, -0.3, 0.4] },
          rightHand: { ...OPEN_FLAT_HAND, wristRotation: [-0.4, 0.4, -0.6] },
          leftArm: { shoulder: [0.9, 0.15, -0.3], elbow: [1.6, 0.3, -0.4] },
          leftHand: { ...OPEN_FLAT_HAND, wristRotation: [-0.4, -0.4, 0.6] },
          head: [0.05, 0, 0],
          face: { blink: 0, eyebrows: 0.2, smile: 0.4 },
          torso: [0, 0, 0],
        },
        duration: 550,
      },
    ],
  },

  MANGER: {
    id: 'MANGER',
    name: 'Manger',
    type: 'word',
    description: 'Bout des doigts pincés portés vers la bouche deux fois.',
    keyframes: [
      {
        pose: {
          rightArm: { shoulder: [0.85, -0.2, 0.2], elbow: [2.1, -0.4, 0.3] },
          rightHand: {
            thumb: { curl: 0.7, spread: 0 },
            index: { curl: 0.7, spread: 0 },
            middle: { curl: 0.7, spread: 0 },
            ring: { curl: 0.7, spread: 0 },
            pinky: { curl: 0.7, spread: 0 },
            wristRotation: [-0.4, 0.3, 0],
          },
          leftArm: RESTING_LEFT_ARM,
          leftHand: RELAXED_HAND,
          head: [-0.05, 0, 0],
          face: { blink: 0, eyebrows: 0.1, smile: 0.4 },
          torso: [0, 0, 0],
        },
        duration: 250,
      },
      {
        pose: {
          rightArm: { shoulder: [0.8, -0.2, 0.2], elbow: [1.7, -0.3, 0.3] },
          rightHand: {
            thumb: { curl: 0.7, spread: 0 },
            index: { curl: 0.7, spread: 0 },
            middle: { curl: 0.7, spread: 0 },
            ring: { curl: 0.7, spread: 0 },
            pinky: { curl: 0.7, spread: 0 },
            wristRotation: [-0.2, 0.3, 0],
          },
          leftArm: RESTING_LEFT_ARM,
          leftHand: RELAXED_HAND,
          head: [0.02, 0, 0],
          face: { blink: 0, eyebrows: 0.1, smile: 0.4 },
          torso: [0, 0, 0],
        },
        duration: 200,
      },
      {
        pose: {
          rightArm: { shoulder: [0.85, -0.2, 0.2], elbow: [2.1, -0.4, 0.3] },
          rightHand: {
            thumb: { curl: 0.7, spread: 0 },
            index: { curl: 0.7, spread: 0 },
            middle: { curl: 0.7, spread: 0 },
            ring: { curl: 0.7, spread: 0 },
            pinky: { curl: 0.7, spread: 0 },
            wristRotation: [-0.4, 0.3, 0],
          },
          leftArm: RESTING_LEFT_ARM,
          leftHand: RELAXED_HAND,
          head: [-0.05, 0, 0],
          face: { blink: 0, eyebrows: 0.1, smile: 0.4 },
          torso: [0, 0, 0],
        },
        duration: 250,
      },
    ],
  },

  BOIRE: {
    id: 'BOIRE',
    name: 'Boire',
    type: 'word',
    description: 'Main en forme de verre (C) portée à la bouche avec inclinaison.',
    keyframes: [
      {
        pose: {
          rightArm: { shoulder: [0.85, -0.2, 0.2], elbow: [2.05, -0.4, 0.3] },
          rightHand: {
            thumb: { curl: 0.4, spread: 0.4 },
            index: { curl: 0.45, spread: 0 },
            middle: { curl: 0.5, spread: 0 },
            ring: { curl: 0.5, spread: 0 },
            pinky: { curl: 0.5, spread: 0 },
            wristRotation: [-0.3, -0.3, 0.5],
          },
          leftArm: RESTING_LEFT_ARM,
          leftHand: RELAXED_HAND,
          head: [-0.1, 0, 0],
          face: { blink: 0, eyebrows: 0.1, smile: 0.4 },
          torso: [0, 0, 0],
        },
        duration: 500,
      },
    ],
  },

  PAIX: {
    id: 'PAIX',
    name: 'Paix',
    type: 'word',
    description: 'Signe V (paix) exécuté des deux mains se déployant vers l\'avant.',
    keyframes: [
      {
        pose: {
          rightArm: { shoulder: [0.8, -0.3, 0.2], elbow: [1.4, -0.2, 0.2] },
          rightHand: PEACE_HAND,
          leftArm: { shoulder: [0.8, 0.3, -0.2], elbow: [1.4, 0.2, -0.2] },
          leftHand: PEACE_HAND,
          head: [0, 0, 0],
          face: { blink: 0, eyebrows: 0.3, smile: 0.8 },
          torso: [0, 0, 0],
        },
        duration: 550,
      },
    ],
  },

  COMPRENDRE: {
    id: 'COMPRENDRE',
    name: 'Comprendre',
    type: 'word',
    description: 'Index qui jaillit près de la tempe comme une étincelle de compréhension.',
    keyframes: [
      {
        pose: {
          rightArm: { shoulder: [1.05, -0.25, 0.2], elbow: [2.2, -0.4, 0.3] },
          rightHand: { ...FIST_HAND, wristRotation: [0, 0.3, 0] },
          leftArm: RESTING_LEFT_ARM,
          leftHand: RELAXED_HAND,
          head: [0, 0, 0],
          face: { blink: 0, eyebrows: 0.2, smile: 0.3 },
          torso: [0, 0, 0],
        },
        duration: 250,
      },
      {
        pose: {
          rightArm: { shoulder: [1.05, -0.25, 0.2], elbow: [2.2, -0.4, 0.3] },
          rightHand: { ...POINTING_HAND, wristRotation: [0, 0.3, 0] },
          leftArm: RESTING_LEFT_ARM,
          leftHand: RELAXED_HAND,
          head: [0.1, 0, 0], // Hochement d'évidence
          face: { blink: 0, eyebrows: 0.5, smile: 0.8 },
          torso: [0, 0, 0],
        },
        duration: 400,
      },
    ],
  },

  SILATRAN: {
    id: 'SILATRAN',
    name: 'Silatran',
    type: 'word',
    description: 'Signe emblématique Silatran : main formant le S qui s\'épanouit en lumière ouverte.',
    keyframes: [
      {
        pose: {
          rightArm: { shoulder: [0.75, -0.2, 0.2], elbow: [1.5, -0.2, 0.2] },
          rightHand: { ...FIST_HAND, wristRotation: [0, 0.2, 0] },
          leftArm: RESTING_LEFT_ARM,
          leftHand: RELAXED_HAND,
          head: [0.02, 0, 0],
          face: { blink: 0, eyebrows: 0.2, smile: 0.6 },
          torso: [0, 0, 0],
        },
        duration: 350,
      },
      {
        pose: {
          rightArm: { shoulder: [0.85, -0.2, 0.2], elbow: [1.3, -0.2, 0.2] },
          rightHand: { ...FULL_OPEN_HAND, wristRotation: [0, 0.1, 0] },
          leftArm: RESTING_LEFT_ARM,
          leftHand: RELAXED_HAND,
          head: [0.06, 0, 0],
          face: { blink: 0, eyebrows: 0.4, smile: 0.9 },
          torso: [0, 0, 0],
        },
        duration: 500,
      },
    ],
  },
};

// Signes et mouvements de corps d'une personne qui PARLE (Conversational Speech Motion)
// Mouvements de mains naturels d'élocution (explications, paumes ouvertes) distincts de la LSF.
export const TALKING_CONVERSATIONAL_SIGNS: Record<string, SignDefinition> = {
  TALK_GESTURE_1: {
    id: 'TALK_GESTURE_1',
    name: 'Expression Vocale 1',
    type: 'word',
    description: 'Mouvements naturels des mains accompagnant la parole.',
    keyframes: [
      {
        pose: {
          rightArm: { shoulder: [0.45, -0.1, 0.15], elbow: [1.35, -0.2, 0.2] },
          rightHand: { ...OPEN_FLAT_HAND, wristRotation: [0, 0.2, -0.1] },
          leftArm: { shoulder: [0.45, 0.1, -0.15], elbow: [1.35, 0.2, -0.2] },
          leftHand: { ...OPEN_FLAT_HAND, wristRotation: [0, -0.2, 0.1] },
          head: [0.03, 0.02, 0],
          face: { blink: 0, eyebrows: 0.2, smile: 0.5, mouthOpen: 0.4 },
          torso: [0.02, 0, 0],
        },
        duration: 650,
      },
      {
        pose: {
          rightArm: { shoulder: [0.55, -0.15, 0.2], elbow: [1.2, -0.15, 0.1] },
          rightHand: { ...FULL_OPEN_HAND, wristRotation: [0.1, 0.1, 0] },
          leftArm: { shoulder: [0.55, 0.15, -0.2], elbow: [1.2, 0.15, -0.1] },
          leftHand: { ...FULL_OPEN_HAND, wristRotation: [0.1, -0.1, 0] },
          head: [-0.02, -0.02, 0],
          face: { blink: 0, eyebrows: 0.1, smile: 0.6, mouthOpen: 0.2 },
          torso: [-0.01, 0, 0],
        },
        duration: 700,
      },
    ],
  },
  TALK_GESTURE_2: {
    id: 'TALK_GESTURE_2',
    name: 'Expression Vocale 2',
    type: 'word',
    description: 'Gesticulation naturelle d\'explication orale avec hochements.',
    keyframes: [
      {
        pose: {
          rightArm: { shoulder: [0.5, -0.2, 0.1], elbow: [1.4, -0.3, 0.2] },
          rightHand: { ...RELAXED_HAND, wristRotation: [-0.1, 0.3, -0.1] },
          leftArm: { shoulder: [0.3, 0.05, -0.05], elbow: [0.8, 0.1, -0.1] },
          leftHand: { ...RELAXED_HAND, wristRotation: [0, 0, 0] },
          head: [0.05, -0.03, 0],
          face: { blink: 0, eyebrows: 0.3, smile: 0.5, mouthOpen: 0.5 },
          torso: [0.01, 0, 0],
        },
        duration: 700,
      },
      {
        pose: {
          rightArm: { shoulder: [0.4, -0.1, 0.05], elbow: [1.2, -0.1, 0.1] },
          rightHand: { ...OPEN_FLAT_HAND, wristRotation: [0, 0.1, 0] },
          leftArm: { shoulder: [0.3, 0.05, -0.05], elbow: [0.8, 0.1, -0.1] },
          leftHand: { ...RELAXED_HAND, wristRotation: [0, 0, 0] },
          head: [-0.03, 0.02, 0],
          face: { blink: 0, eyebrows: 0.15, smile: 0.5, mouthOpen: 0.3 },
          torso: [0, 0, 0],
        },
        duration: 650,
      },
    ],
  },
};

// Dictionnaire combiné pour recherche rapide
export const ALL_SIGNS: Record<string, SignDefinition> = {
  ...ALPHABET_SIGNS,
  ...VOCABULARY_SIGNS,
  ...TALKING_CONVERSATIONAL_SIGNS,
};

// Alias de mots pour correspondance intelligente
const WORD_ALIASES: Record<string, string> = {
  SALUT: 'BONJOUR',
  COUCOU: 'BONJOUR',
  HELLO: 'BONJOUR',
  HI: 'BONJOUR',
  REMERCIEMENTS: 'MERCI',
  THANKS: 'MERCI',
  PLEASE: 'SVP',
  "S'IL TE PLAÎT": 'SVP',
  "S'IL TE PLAIT": 'SVP',
  "S'IL VOUS PLAÎT": 'SVP',
  "S'IL VOUS PLAIT": 'SVP',
  YES: 'OUI',
  OUAIS: 'OUI',
  NO: 'NON',
  AIDE: 'AIDER',
  HELP: 'AIDER',
  AIME: 'AMOUR',
  AIMER: 'AMOUR',
  LOVE: 'AMOUR',
  COPEL: 'AMI',
  POTE: 'AMI',
  FRIEND: 'AMI',
  BYE: 'AU_REVOIR',
  TCHAO: 'AU_REVOIR',
  CIAO: 'AU_REVOIR',
  ADIEU: 'AU_REVOIR',
  HOME: 'MAISON',
  EAT: 'MANGER',
  DRINK: 'BOIRE',
  PEACE: 'PAIX',
  OK: 'COMPRENDRE',
  COMPRIS: 'COMPRENDRE',
};

/**
 * Nettoie une chaîne de caractères (retrait accents majuscules etc.)
 */
function normalizeText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .trim();
}

/**
 * Convertit un texte saisi en séquence d'animation de langue des signes.
 * Identifie les mots entiers correspondants et épelle le reste en dactylologie.
 */
export function translateTextToSignSequence(text: string): SequenceItem[] {
  if (!text || text.trim() === '') {
    return [];
  }

  const items: SequenceItem[] = [];
  const normalized = text.toUpperCase().trim();
  
  // Remplacer les expressions multi-mots d'abord
  let processed = normalized;
  const multiWordReplacements: [RegExp, string][] = [
    [/S'IL VOUS PLAIT|S'IL VOUS PLAÎT|SIL VOUS PLAIT/g, 'SVP'],
    [/S'IL TE PLAIT|S'IL TE PLAÎT|SIL TE PLAIT/g, 'SVP'],
    [/AU REVOIR|A BIENTOT|A PLUS/g, 'AU_REVOIR'],
  ];

  for (const [regex, replacement] of multiWordReplacements) {
    processed = processed.replace(regex, replacement);
  }

  // Découper en mots
  const tokens = processed.split(/\s+/);

  tokens.forEach((token, tokenIdx) => {
    // Retirer ponctuation périphérique
    const cleanWord = token.replace(/[^A-Z_0-9]/g, '');
    const cleanNormalized = normalizeText(cleanWord);

    // Vérifier si c'est un mot du dictionnaire ou un alias
    const matchedWordId = VOCABULARY_SIGNS[cleanWord]
      ? cleanWord
      : VOCABULARY_SIGNS[cleanNormalized]
      ? cleanNormalized
      : WORD_ALIASES[cleanWord] || WORD_ALIASES[cleanNormalized];

    if (matchedWordId && ALL_SIGNS[matchedWordId]) {
      // Mot complet reconnu
      const sign = ALL_SIGNS[matchedWordId];
      const totalDur = sign.keyframes.reduce((acc, kf) => acc + kf.duration, 0);
      items.push({
        id: `seq-${tokenIdx}-${matchedWordId}`,
        signId: matchedWordId,
        text: sign.name,
        type: 'word',
        duration: totalDur,
      });
    } else {
      // Épellation dactylologique lettre par lettre
      for (let i = 0; i < cleanNormalized.length; i++) {
        const char = cleanNormalized[i];
        if (ALPHABET_SIGNS[char]) {
          const sign = ALPHABET_SIGNS[char];
          const totalDur = sign.keyframes.reduce((acc, kf) => acc + kf.duration, 0);
          items.push({
            id: `seq-${tokenIdx}-char-${i}-${char}`,
            signId: char,
            text: char,
            type: 'letter',
            duration: totalDur,
          });
        }
      }
    }

    // Ajouter une courte transition/pause entre les mots si ce n'est pas le dernier
    if (tokenIdx < tokens.length - 1) {
      items.push({
        id: `seq-space-${tokenIdx}`,
        signId: 'SPACE',
        text: ' ',
        type: 'space',
        duration: 180,
      });
    }
  });

  return items;
}

/**
 * Génère une séquence de mouvements de gesticulation naturelle pour une personne qui PARLE.
 * Ne contient AUCUN signe de la langue des signes (LSF).
 * Les mains accompagnent la parole naturellement avec synchronisation labiale.
 */
export function getTalkingSpeechSequence(text: string): SequenceItem[] {
  if (!text || text.trim() === '') return [];

  const words = text.trim().split(/\s+/);
  const items: SequenceItem[] = [];

  words.forEach((word, idx) => {
    const gestureId = idx % 2 === 0 ? 'TALK_GESTURE_1' : 'TALK_GESTURE_2';
    const gestureDef = TALKING_CONVERSATIONAL_SIGNS[gestureId];
    const dur = gestureDef ? gestureDef.keyframes.reduce((a, b) => a + b.duration, 0) : 1300;

    items.push({
      id: `talk-${idx}-${gestureId}`,
      signId: gestureId,
      text: word,
      type: 'word',
      duration: dur,
    });
  });

  return items;
}
