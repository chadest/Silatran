/**
 * @file src/components/TalkToMotionModal.tsx
 * @description Bottom Sheet non-bloquant "Talk to Motion" ancré en bas de l'écran.
 * Permet de saisir un texte et de lancer la prononciation vocale (TTS), l'articulation labiale
 * et les gestes LSF tout en maintenant le personnage 3D/2D 100% visible en temps réel.
 * Inclut un poignée/bouton de masquage (ChevronDown) pour réduire ou fermer le panneau.
 */

import React, { useState, useEffect } from 'react';
import { Volume2, Mic, Play, X, Zap, MessageSquare, FastForward, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react';

interface TalkToMotionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSpeakAndSign: (text: string, options: { voiceIndex: number; rate: number }) => void;
  isPlaying: boolean;
}

export const TalkToMotionModal: React.FC<TalkToMotionModalProps> = ({
  isOpen,
  onClose,
  onSpeakAndSign,
  isPlaying,
}) => {
  const [inputText, setInputText] = useState('Bonjour, bienvenue sur Silatran !');
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceIndex, setSelectedVoiceIndex] = useState(0);
  const [speechRate, setSpeechRate] = useState(1.0);
  const [isMinimized, setIsMinimized] = useState(false);

  // Exemples de phrases prédéfinies
  const samplePhrases = [
    'Bonjour, bienvenue sur Silatran !',
    'Comment puis-je vous aider aujourd\'hui ?',
    'Je suis ravi de vous rencontrer.',
    'Merci beaucoup et à bientôt !',
    'S\'il vous plaît, pouvez-vous répéter ?',
  ];

  // Charger les voix Web Speech Synthesis disponibles
  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    const updateVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      const frenchVoices = availableVoices.filter((v) => v.lang.includes('fr'));
      const list = frenchVoices.length > 0 ? frenchVoices : availableVoices;
      setVoices(list);
    };

    updateVoices();
    window.speechSynthesis.onvoiceschanged = updateVoices;
  }, []);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onSpeakAndSign(inputText, { voiceIndex: selectedVoiceIndex, rate: speechRate });
  };

  const handleSelectSample = (phrase: string) => {
    setInputText(phrase);
    onSpeakAndSign(phrase, { voiceIndex: selectedVoiceIndex, rate: speechRate });
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 flex flex-col items-center pointer-events-none p-0 sm:p-2">
      {/* Poignée / Bouton de masquage haut du Bottom Sheet */}
      <div className="pointer-events-auto flex items-center space-x-2">
        <button
          type="button"
          onClick={() => setIsMinimized((prev) => !prev)}
          className="flex items-center space-x-1.5 px-3 py-1 mb-1 rounded-t-xl bg-slate-900 border-t border-x border-slate-800 text-xs text-slate-300 hover:text-white shadow-xl backdrop-blur-md transition-colors"
          title={isMinimized ? 'Afficher Talk to Motion' : 'Réduire Talk to Motion'}
        >
          {isMinimized ? (
            <>
              <ChevronUp className="w-3.5 h-3.5 text-sky-400" />
              <span className="font-semibold text-sky-400">Talk to Motion (Afficher)</span>
            </>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              <span>Masquer</span>
            </>
          )}
        </button>

        <button
          type="button"
          onClick={onClose}
          className="flex items-center space-x-1 px-2.5 py-1 mb-1 rounded-t-xl bg-slate-900/90 border-t border-x border-slate-800 text-xs text-slate-400 hover:text-rose-400 shadow-xl backdrop-blur-md transition-colors"
          title="Fermer Talk to Motion"
        >
          <X className="w-3.5 h-3.5" />
          <span>Fermer</span>
        </button>
      </div>

      {/* Conteneur principal Bottom Sheet non-bloquant */}
      <div
        className={`pointer-events-auto w-full max-w-3xl bg-slate-900/95 border-t sm:border border-slate-800 shadow-2xl rounded-t-2xl sm:rounded-2xl p-4 sm:p-5 text-slate-100 overflow-hidden backdrop-blur-md transition-all duration-300 ease-in-out ${
          isMinimized
            ? 'translate-y-full opacity-0 max-h-0 py-0 overflow-hidden'
            : 'translate-y-0 opacity-100'
        }`}
      >
        {/* Ligne de gradient d'accentuation */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-sky-500 via-indigo-500 to-emerald-500" />

        {/* En-tête compact */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400">
              <Mic className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-bold text-sm text-white">Talk to Motion</h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 font-semibold border border-sky-500/30">
                  Voix & Lip-Sync LSF
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsMinimized(true)}
            className="text-xs text-slate-400 hover:text-slate-200 flex items-center space-x-1"
          >
            <ChevronDown className="w-4 h-4" />
            <span className="hidden sm:inline">Réduire</span>
          </button>
        </div>

        {/* Formulaire & Saisie */}
        <form onSubmit={handleSubmit} className="space-y-3 pt-2.5">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
              <span className="flex items-center space-x-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-sky-400" />
                <span>Texte à prononcer et exprimer par le personnage :</span>
              </span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Ex: Bonjour, bienvenue sur Silatran !"
                className="flex-1 px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/50 font-sans"
              />
              <button
                type="submit"
                disabled={!inputText.trim()}
                className={`px-4 py-2 rounded-xl text-xs font-bold shadow-md flex items-center space-x-1.5 whitespace-nowrap transition-all ${
                  isPlaying
                    ? 'bg-amber-500 hover:bg-amber-600 text-white'
                    : 'bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white'
                }`}
              >
                {isPlaying ? (
                  <>
                    <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                    <span>Relancer</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-white" />
                    <span>Prononcer & Signer</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Phrases modèles rapides */}
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            <span className="text-[11px] text-slate-400 font-medium flex items-center space-x-1 mr-1">
              <Zap className="w-3 h-3 text-sky-400" />
              <span>Raccourcis :</span>
            </span>
            {samplePhrases.slice(0, 3).map((phrase, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelectSample(phrase)}
                className="px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700/60 text-[11px] text-slate-300 hover:text-white transition-all"
              >
                "{phrase}"
              </button>
            ))}
          </div>

          {/* Réglages voix & vitesse */}
          <div className="flex items-center justify-between gap-4 pt-1 text-xs border-t border-slate-800/60">
            {/* Voix FR */}
            {voices.length > 0 && (
              <div className="flex items-center space-x-2 flex-1">
                <Volume2 className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                <select
                  value={selectedVoiceIndex}
                  onChange={(e) => setSelectedVoiceIndex(Number(e.target.value))}
                  className="w-full px-2 py-1 rounded-lg bg-slate-950 border border-slate-700 text-xs text-slate-200 focus:outline-none"
                >
                  {voices.map((v, i) => (
                    <option key={i} value={i}>
                      {v.name} ({v.lang})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Vitesse */}
            <div className="flex items-center space-x-2 shrink-0">
              <FastForward className="w-3.5 h-3.5 text-sky-400" />
              <span className="text-slate-400 text-[11px]">Vitesse :</span>
              <span className="font-mono text-sky-400 font-bold text-[11px] w-8">{speechRate}x</span>
              <input
                type="range"
                min="0.7"
                max="1.4"
                step="0.1"
                value={speechRate}
                onChange={(e) => setSpeechRate(Number(e.target.value))}
                className="w-20 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-400"
              />
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
