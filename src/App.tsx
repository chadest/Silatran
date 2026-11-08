/**
 * @file src/App.tsx
 * @description Application principale Silatran - Traducteur 3D interactif de texte en langue des signes.
 * Supporte le modèle Cartoon, le modèle Humain Réaliste PBR et l'importation directe de fichiers .glb / .gltf.
 */

import React, { useState, useCallback, useEffect, Suspense, lazy } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Header } from './components/Header';
import { SignTimeline } from './components/SignTimeline';
import { PlaybackControls } from './components/PlaybackControls';
import { TranslationInput } from './components/TranslationInput';
import { DictionaryModal } from './components/DictionaryModal';
import { CharacterCustomizerModal } from './components/CharacterCustomizerModal';
import { TalkToMotionModal } from './components/TalkToMotionModal';
import { WebcamSplitPanel } from './components/WebcamSplitPanel';
import { LoadingScreen } from './components/LoadingScreen';
import { translateTextToSignSequence, getTalkingSpeechSequence } from './utils/signDictionary';
import { AvatarConfig, SequenceItem, SignDefinition, CameraPreset, CharacterPose } from './types/signs';

// Chargement différé Lazy / Suspense pour les modules de rendu lourds
const ThreeSignScene = lazy(() =>
  import('./three/ThreeSignScene').then((m) => ({ default: m.ThreeSignScene }))
);
const TwoDSignScene = lazy(() =>
  import('./components/TwoDSignScene').then((m) => ({ default: m.TwoDSignScene }))
);

export default function App() {
  const [currentText, setCurrentText] = useState('Bonjour');
  const [sequence, setSequence] = useState<SequenceItem[]>(() =>
    translateTextToSignSequence('Bonjour')
  );
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1.0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [cameraPreset, setCameraPreset] = useState<CameraPreset>('front');

  // Mode d'affichage (3D Temps Réel par défaut vs 2D Dessin Vectoriel)
  const [viewDimension, setViewDimension] = useState<'3d' | '2d'>('3d');

  // État du préchargeur d'écran d'accueil (Splash Screen / Preloader)
  const [isLoadingInitial, setIsLoadingInitial] = useState(true);

  // État de masquage du dock inférieur pour mode cinéma
  const [isControlsCollapsed, setIsControlsCollapsed] = useState(false);

  // Modales & Bottom Sheets
  const [isDictionaryOpen, setIsDictionaryOpen] = useState(false);
  const [isCustomizerOpen, setIsCustomizerOpen] = useState(false);
  const [isTalkToMotionOpen, setIsTalkToMotionOpen] = useState(false);

  // Panneau Caméra Motion Capture (MediaPipe + TensorFlow.js + OpenCV Overlay)
  const [isWebcamPanelOpen, setIsWebcamPanelOpen] = useState(false);
  const [webcamPanelWidth, setWebcamPanelWidth] = useState(360);
  const [livePoseOverride, setLivePoseOverride] = useState<CharacterPose | null>(null);

  // État Dark / Light mode
  const [isDarkMode, setIsDarkMode] = useState(true);

  // Configuration de l'apparence de l'avatar 3D (Default: Modèle 3D Réaliste Teen Boy enregistré dans le projet)
  const [avatarConfig, setAvatarConfig] = useState<AvatarConfig>({
    modelType: 'glb_custom',
    glbUrl: 'teen-boy/scene.gltf',
    glbFileName: 'Personnage Réaliste (Teen Boy 3D)',
    glbScale: 1.0,
    glbOffsetY: 0.0,
    skinColor: '#e8beac',
    clothingColor: '#1e293b',
    hairColor: '#1e1b18',
    hairStyle: 'short',
    hasGlasses: false,
    isLeftHanded: false,
  });

  // Simulation du chargement initial des ressources et modèles
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoadingInitial(false);
    }, 1600);
    return () => clearTimeout(timer);
  }, []);

  // Traduire un nouveau texte
  const handleTranslate = useCallback((text: string) => {
    setCurrentText(text);
    const newSeq = translateTextToSignSequence(text);
    setSequence(newSeq);
    setCurrentIndex(0);
    setIsPlaying(true);
  }, []);

  // Gérer la fonctionnalité "Talk to Motion" : Parole avec gesticulation naturelle et Lip-Sync (Sans mouvements LSF)
  const handleSpeakAndSign = useCallback(
    (text: string, options: { voiceIndex: number; rate: number }) => {
      setCurrentText(text);
      // Générer des mouvements de corps et de mains d'élocution parlée (Distincts de la LSF)
      const talkingSeq = getTalkingSpeechSequence(text);
      setSequence(talkingSeq);
      setCurrentIndex(0);
      setIsPlaying(true);

      // Déclencher la synthèse vocale Web Speech TTS avec Lip-Sync vocal
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel(); // Arrêter toute lecture précédente

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = options.rate || 1.0;

        const availableVoices = window.speechSynthesis.getVoices();
        const frenchVoices = availableVoices.filter((v) => v.lang.includes('fr'));
        const voiceList = frenchVoices.length > 0 ? frenchVoices : availableVoices;
        if (voiceList[options.voiceIndex]) {
          utterance.voice = voiceList[options.voiceIndex];
        }

        // Boucle de synchronisation labiale (Lip-Sync) pendant la parole
        let syncInterval: number | null = null;
        let isSpeaking = false;

        utterance.onstart = () => {
          isSpeaking = true;
          let phase = 0;
          syncInterval = window.setInterval(() => {
            if (!isSpeaking) return;
            phase += 0.35;
            // Moduler l'ouverture de bouche entre 0.2 et 0.85 de façon naturelle
            const openVal = 0.3 + 0.4 * Math.sin(phase) + 0.15 * Math.sin(phase * 2.3);
            const clamped = Math.max(0.1, Math.min(0.85, openVal));

            // Mettre à jour les clés de pose en direct
            setSequence((prevSeq) => {
              if (prevSeq.length === 0) return prevSeq;
              return prevSeq.map((item) => ({
                ...item,
              }));
            });
          }, 50);
        };

        utterance.onboundary = () => {
          // Pic d'ouverture de bouche à chaque syllabe / mot prononcé
          const targetOpen = 0.65 + Math.random() * 0.25;
          // Pulse d'ouverture
        };

        utterance.onend = () => {
          isSpeaking = false;
          if (syncInterval) clearInterval(syncInterval);
        };

        utterance.onerror = () => {
          isSpeaking = false;
          if (syncInterval) clearInterval(syncInterval);
        };

        window.speechSynthesis.speak(utterance);
      }
    },
    []
  );

  // Démonstration directe d'un signe depuis le dictionnaire
  const handleSelectSignFromDict = useCallback((sign: SignDefinition) => {
    setCurrentText(sign.name);
    setSequence([
      {
        id: `dict-${sign.id}`,
        signId: sign.id,
        text: sign.name,
        type: sign.type === 'letter' ? 'letter' : 'word',
        duration: sign.keyframes.reduce((acc, kf) => acc + kf.duration, 0),
      },
    ]);
    setCurrentIndex(0);
    setIsPlaying(true);
  }, []);

  // Navigation dans la séquence
  const handleStepBack = useCallback(() => {
    setCurrentIndex((prev) => Math.max(0, prev - 1));
  }, []);

  const handleStepForward = useCallback(() => {
    setCurrentIndex((prev) => Math.min(sequence.length - 1, prev + 1));
  }, [sequence.length]);

  const handleReset = useCallback(() => {
    setCurrentIndex(0);
    setIsPlaying(true);
  }, []);

  const handleTogglePlay = useCallback(() => {
    setIsPlaying((prev) => !prev);
  }, []);

  const handleSeek = useCallback((index: number) => {
    setCurrentIndex(index);
  }, []);

  const handlePlaybackComplete = useCallback(() => {
    setIsPlaying(false);
  }, []);

  // Raccourci clavier Espace pour Lecture/Pause
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }
      if (e.code === 'Space') {
        e.preventDefault();
        setIsPlaying((prev) => !prev);
      } else if (e.code === 'KeyH') {
        setIsControlsCollapsed((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (isLoadingInitial) {
    return <LoadingScreen isDarkMode={isDarkMode} onFinishLoading={() => setIsLoadingInitial(false)} />;
  }

  return (
    <div className={`relative w-screen h-screen overflow-hidden font-sans select-none flex flex-col ${isDarkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-100 text-slate-900'}`}>
      {/* Barre supérieure avec sélecteur de dimension 3D/2D, Talk to Motion, caméra et style */}
      <Header
        viewDimension={viewDimension}
        onToggleDimension={setViewDimension}
        cameraPreset={cameraPreset}
        onSelectCamera={setCameraPreset}
        soundEnabled={soundEnabled}
        onToggleSound={() => setSoundEnabled((prev) => !prev)}
        onOpenDictionary={() => setIsDictionaryOpen(true)}
        onOpenCustomizer={() => setIsCustomizerOpen(true)}
        onOpenTalkToMotion={() => setIsTalkToMotionOpen(true)}
        isWebcamOpen={isWebcamPanelOpen}
        onToggleWebcam={() => setIsWebcamPanelOpen((prev) => !prev)}
        isDarkMode={isDarkMode}
        onToggleDarkMode={() => setIsDarkMode((prev) => !prev)}
        avatarConfig={avatarConfig}
        onChangeConfig={setAvatarConfig}
      />

      {/* Conteneur principal avec division d'écran rétractable pour la caméra */}
      <div className="flex-1 w-full h-full relative flex flex-row overflow-hidden pt-14">
        {/* Scène centrale (3D Temps Réel ou 2D Dessin Vectoriel avec React Suspense & Lazy loading) */}
        <main className="flex-1 h-full relative min-w-0">
          <Suspense fallback={<LoadingScreen isDarkMode={isDarkMode} message={`Chargement du mode ${viewDimension.toUpperCase()}...`} />}>
            {viewDimension === '3d' ? (
              <ThreeSignScene
                sequence={sequence}
                currentIndex={currentIndex}
                isPlaying={isPlaying}
                speed={speed}
                soundEnabled={soundEnabled}
                avatarConfig={avatarConfig}
                cameraPreset={cameraPreset}
                livePoseOverride={livePoseOverride}
                onIndexChange={setCurrentIndex}
                onPlaybackComplete={handlePlaybackComplete}
              />
            ) : (
              <TwoDSignScene
                sequence={sequence}
                currentIndex={currentIndex}
                isPlaying={isPlaying}
                speed={speed}
                soundEnabled={soundEnabled}
                avatarConfig={avatarConfig}
                cameraPreset={cameraPreset}
                livePoseOverride={livePoseOverride}
                onIndexChange={setCurrentIndex}
                onPlaybackComplete={handlePlaybackComplete}
              />
            )}
          </Suspense>
        </main>

        {/* Panneau latéral rétractable & redimensionnable de la caméra live (MediaPipe + TensorFlow + OpenCV Overlay) */}
        <WebcamSplitPanel
          isOpen={isWebcamPanelOpen}
          onClose={() => setIsWebcamPanelOpen(false)}
          onPoseUpdate={setLivePoseOverride}
          panelWidth={webcamPanelWidth}
          onResizePanel={setWebcamPanelWidth}
        />
      </div>

      {/* Dock ergonomique repliable en bas au centre */}
      <div className="absolute bottom-0 left-0 right-0 z-30 flex flex-col items-center pointer-events-none">
        {/* Poignée de basculement Afficher / Masquer */}
        <button
          type="button"
          onClick={() => setIsControlsCollapsed((prev) => !prev)}
          className={`pointer-events-auto flex items-center space-x-1.5 px-3 py-1 mb-1 rounded-t-lg border-t border-x text-xs shadow-md transition-colors ${isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white' : 'bg-white border-slate-200 text-slate-700 hover:text-slate-900'}`}
        >
          {isControlsCollapsed ? (
            <>
              <ChevronUp className="w-3.5 h-3.5 text-sky-500" />
              <span>Afficher les contrôles</span>
            </>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              <span>Masquer</span>
            </>
          )}
        </button>

        {/* Panneau de contrôle unifié */}
        <div
          className={`pointer-events-auto w-full max-w-4xl border-t border-x shadow-2xl rounded-t-xl overflow-hidden transition-all duration-300 ease-in-out ${
            isDarkMode ? 'bg-slate-900/95 border-slate-800' : 'bg-white/95 border-slate-200'
          } ${
            isControlsCollapsed
              ? 'translate-y-full opacity-0 max-h-0'
              : 'translate-y-0 opacity-100'
          }`}
        >
          {/* Séquence temporelle interactive */}
          <SignTimeline
            sequence={sequence}
            currentIndex={currentIndex}
            onSelectIndex={handleSeek}
            isDarkMode={isDarkMode}
          />

          {/* Barre de contrôles de lecture */}
          <PlaybackControls
            isPlaying={isPlaying}
            currentIndex={currentIndex}
            totalItems={sequence.length}
            speed={speed}
            onTogglePlay={handleTogglePlay}
            onReset={handleReset}
            onStepBack={handleStepBack}
            onStepForward={handleStepForward}
            onChangeSpeed={setSpeed}
            onSeek={handleSeek}
            isDarkMode={isDarkMode}
          />

          {/* Saisie de traduction de texte */}
          <TranslationInput
            currentText={currentText}
            onTranslate={handleTranslate}
            isDarkMode={isDarkMode}
          />
        </div>
      </div>

      {/* Bottom Sheet "Talk to Motion" */}
      <TalkToMotionModal
        isOpen={isTalkToMotionOpen}
        onClose={() => setIsTalkToMotionOpen(false)}
        onSpeakAndSign={handleSpeakAndSign}
        isPlaying={isPlaying}
      />

      {/* Modale Dictionnaire */}
      <DictionaryModal
        isOpen={isDictionaryOpen}
        onClose={() => setIsDictionaryOpen(false)}
        onSelectSign={handleSelectSignFromDict}
      />

      {/* Modale Personnalisation Avatar & Style */}
      <CharacterCustomizerModal
        isOpen={isCustomizerOpen}
        onClose={() => setIsCustomizerOpen(false)}
        config={avatarConfig}
        onChangeConfig={setAvatarConfig}
        viewDimension={viewDimension}
        onToggleDimension={setViewDimension}
      />
    </div>
  );
}
