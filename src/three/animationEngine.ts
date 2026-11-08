/**
 * @file src/three/animationEngine.ts
 * @description Moteur d'interpolation d'animation pour la langue des signes, gestion du séquençage,
 * respiration procédurale, clignement d'yeux et rétroaction sonore Web Audio.
 */

import { CharacterPose, FingerJoints, HandPose, ArmPose, SequenceItem } from '../types/signs';
import { ALL_SIGNS, NEUTRAL_POSE } from '../utils/signDictionary';

// Fonctions d'interpolation et de bornage pures JS (sans dépendance Three.js)
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

// Fonction d'atténuation cubique douce (Ease In Out)
export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/**
 * Interpole un doigt entre deux configurations
 */
function interpolateFinger(a: FingerJoints, b: FingerJoints, t: number): FingerJoints {
  return {
    curl: lerp(a.curl, b.curl, t),
    spread: lerp(a.spread ?? 0, b.spread ?? 0, t),
  };
}

/**
 * Interpole une main entre deux poses
 */
function interpolateHand(a: HandPose, b: HandPose, t: number): HandPose {
  return {
    thumb: interpolateFinger(a.thumb, b.thumb, t),
    index: interpolateFinger(a.index, b.index, t),
    middle: interpolateFinger(a.middle, b.middle, t),
    ring: interpolateFinger(a.ring, b.ring, t),
    pinky: interpolateFinger(a.pinky, b.pinky, t),
    wristRotation: [
      lerp(a.wristRotation[0], b.wristRotation[0], t),
      lerp(a.wristRotation[1], b.wristRotation[1], t),
      lerp(a.wristRotation[2], b.wristRotation[2], t),
    ],
  };
}

/**
 * Interpole un bras entre deux poses
 */
function interpolateArm(a: ArmPose, b: ArmPose, t: number): ArmPose {
  return {
    shoulder: [
      lerp(a.shoulder[0], b.shoulder[0], t),
      lerp(a.shoulder[1], b.shoulder[1], t),
      lerp(a.shoulder[2], b.shoulder[2], t),
    ],
    elbow: [
      lerp(a.elbow[0], b.elbow[0], t),
      lerp(a.elbow[1], b.elbow[1], t),
      lerp(a.elbow[2], b.elbow[2], t),
    ],
  };
}

/**
 * Interpole deux poses complètes de personnage
 */
export function interpolatePose(a: CharacterPose, b: CharacterPose, tRaw: number): CharacterPose {
  const t = easeInOutCubic(clamp(tRaw, 0, 1));

  return {
    rightArm: interpolateArm(a.rightArm, b.rightArm, t),
    rightHand: interpolateHand(a.rightHand, b.rightHand, t),
    leftArm: interpolateArm(a.leftArm, b.leftArm, t),
    leftHand: interpolateHand(a.leftHand, b.leftHand, t),
    head: [
      lerp(a.head[0], b.head[0], t),
      lerp(a.head[1], b.head[1], t),
      lerp(a.head[2], b.head[2], t),
    ],
    face: {
      blink: lerp(a.face.blink, b.face.blink, t),
      eyebrows: lerp(a.face.eyebrows, b.face.eyebrows, t),
      smile: lerp(a.face.smile, b.face.smile, t),
    },
    torso: [
      lerp(a.torso[0], b.torso[0], t),
      lerp(a.torso[1], b.torso[1], t),
      lerp(a.torso[2], b.torso[2], t),
    ],
  };
}

/**
 * Générateur de son procédural doux (Web Audio API) pour le retour utilisateur sans fichier externe
 */
class SoundFeedback {
  private ctx: AudioContext | null = null;

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  // Petit carillon doux lors d'un nouveau signe
  playChime(pitch: number = 440) {
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(pitch, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(pitch * 1.5, ctx.currentTime + 0.08);

      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.13);
    } catch {
      // Audio silencieux si non autorisé
    }
  }
}

export const soundEffects = new SoundFeedback();

/**
 * Contrôleur d'animation gérant la lecture, l'interpolation temporelle et les calques procéduraux
 */
export class AnimationController {
  private sequence: SequenceItem[] = [];
  private currentIndex: number = 0;
  private itemElapsed: number = 0;
  private isPlaying: boolean = false;
  private speed: number = 1.0;
  private soundEnabled: boolean = true;

  // Variables pour idle / respiration / clignement
  private blinkTimer: number = 2.0;
  private isBlinking: boolean = false;
  private blinkProgress: number = 0;
  private totalTime: number = 0;

  // Dernier son joué pour éviter les répétitions
  private lastSoundIndex: number = -1;

  // Pose calculée courante (initialisée au repos naturel)
  private currentPose: CharacterPose = JSON.parse(JSON.stringify(NEUTRAL_POSE));

  // Indique si la lecture active a démarré (sinon reste au repos bras le long du corps)
  private hasStarted: boolean = false;

  // Callbacks
  private onIndexChange?: (index: number) => void;
  private onComplete?: () => void;

  constructor(
    onIndexChange?: (index: number) => void,
    onComplete?: () => void
  ) {
    this.onIndexChange = onIndexChange;
    this.onComplete = onComplete;
  }

  setSequence(sequence: SequenceItem[]) {
    this.sequence = sequence;
    this.currentIndex = 0;
    this.itemElapsed = 0;
    this.lastSoundIndex = -1;
    if (this.onIndexChange) {
      this.onIndexChange(this.currentIndex);
    }
  }

  setSpeed(speed: number) {
    this.speed = speed;
  }

  setSoundEnabled(enabled: boolean) {
    this.soundEnabled = enabled;
  }

  private speechLipSyncVal = 0;

  setSpeechLipSync(val: number) {
    this.speechLipSyncVal = Math.max(0, Math.min(1, val));
  }

  play() {
    this.hasStarted = true;
    this.isPlaying = true;
  }

  pause() {
    this.isPlaying = false;
  }

  reset() {
    this.hasStarted = false;
    this.isPlaying = false;
    this.currentIndex = 0;
    this.itemElapsed = 0;
    this.lastSoundIndex = -1;
    if (this.onIndexChange) {
      this.onIndexChange(this.currentIndex);
    }
  }

  jumpToIndex(index: number) {
    if (index >= 0 && index < this.sequence.length) {
      this.hasStarted = true;
      this.currentIndex = index;
      this.itemElapsed = 0;
      this.playChimeForIndex(index);
      if (this.onIndexChange) {
        this.onIndexChange(this.currentIndex);
      }
    }
  }

  getIsPlaying(): boolean {
    return this.isPlaying;
  }

  getCurrentIndex(): number {
    return this.currentIndex;
  }

  private playChimeForIndex(index: number) {
    if (!this.soundEnabled || index === this.lastSoundIndex) return;
    this.lastSoundIndex = index;
    const item = this.sequence[index];
    if (item && item.type !== 'space') {
      const basePitch = item.type === 'word' ? 520 : 440 + ((index % 8) * 40);
      soundEffects.playChime(basePitch);
    }
  }

  /**
   * Met à jour l'animation à chaque frame
   * @param delta Temps écoulé en secondes
   */
  update(delta: number): CharacterPose {
    this.totalTime += delta;

    // 1. Gestion du clignement naturel des yeux
    this.blinkTimer -= delta;
    if (this.blinkTimer <= 0) {
      if (!this.isBlinking) {
        this.isBlinking = true;
        this.blinkProgress = 0;
      }
    }

    let blinkVal = 0;
    if (this.isBlinking) {
      this.blinkProgress += delta * 7; // Clignement rapide de ~140ms
      if (this.blinkProgress >= 1) {
        this.isBlinking = false;
        this.blinkProgress = 0;
        this.blinkTimer = 2.5 + Math.random() * 3.5; // Prochain clignement dans 2.5 à 6 sec
      } else {
        // Courbe de clignement triangulaire (ouvre puis ferme)
        blinkVal = Math.sin(this.blinkProgress * Math.PI);
      }
    }

    // 2. Respiration procédurale subtile du torse
    const breath = Math.sin(this.totalTime * 1.8) * 0.015;

    // 3. Calcul de la pose : repos naturel vers le bas par défaut, animation active dès que démarré
    let targetPose = NEUTRAL_POSE;

    if (this.hasStarted && this.sequence.length > 0 && this.currentIndex < this.sequence.length) {
      const currentItem = this.sequence[this.currentIndex];

      if (this.isPlaying) {
        this.itemElapsed += delta * 1000 * this.speed;
        this.playChimeForIndex(this.currentIndex);

        // Passage à l'élément suivant
        if (this.itemElapsed >= currentItem.duration) {
          if (this.currentIndex < this.sequence.length - 1) {
            this.currentIndex++;
            this.itemElapsed = 0;
            if (this.onIndexChange) {
              this.onIndexChange(this.currentIndex);
            }
          } else {
            // Fin de la séquence : retour en douceur vers la posture de repos naturel
            this.isPlaying = false;
            this.hasStarted = false;
            if (this.onComplete) {
              this.onComplete();
            }
          }
        }
      }

      // Calcul de la pose correspondante au signe courant
      if (currentItem.signId === 'SPACE') {
        targetPose = NEUTRAL_POSE;
      } else {
        const signDef = ALL_SIGNS[currentItem.signId];
        if (signDef && signDef.keyframes.length > 0) {
          if (signDef.keyframes.length === 1) {
            targetPose = signDef.keyframes[0].pose;
          } else {
            // Signe multi-keyframes (ex: BONJOUR, MERCI, AU_REVOIR)
            const totalSignDuration = signDef.keyframes.reduce((acc, kf) => acc + kf.duration, 0);
            let timeInSign = (this.itemElapsed % totalSignDuration);
            let accumulatedTime = 0;
            let fromPose = signDef.keyframes[0].pose;
            let toPose = signDef.keyframes[0].pose;
            let tFraction = 0;

            for (let i = 0; i < signDef.keyframes.length; i++) {
              const kf = signDef.keyframes[i];
              if (timeInSign <= accumulatedTime + kf.duration) {
                fromPose = signDef.keyframes[i === 0 ? 0 : i - 1].pose;
                toPose = kf.pose;
                tFraction = (timeInSign - accumulatedTime) / kf.duration;
                break;
              }
              accumulatedTime += kf.duration;
            }

            targetPose = interpolatePose(fromPose, toPose, tFraction);
          }
        }
      }
    } else {
      targetPose = NEUTRAL_POSE;
    }

    // 4. Lissage continu de la pose globale pour éviter tout saut brutal
    const smoothFactor = Math.min(1, delta * 12 * this.speed);
    this.currentPose = interpolatePose(this.currentPose, targetPose, smoothFactor);

    // 5. Injection des calques procéduraux (respiration, clignement et lip-sync vocal)
    const resultPose = JSON.parse(JSON.stringify(this.currentPose)) as CharacterPose;
    resultPose.face.blink = Math.max(resultPose.face.blink, blinkVal);
    if (this.speechLipSyncVal > 0) {
      resultPose.face.mouthOpen = Math.max(resultPose.face.mouthOpen || 0, this.speechLipSyncVal);
    }
    resultPose.torso[0] += breath; // Léger mouvement de poitrine

    return resultPose;
  }
}
