/**
 * @file src/components/PlaybackControls.tsx
 * @description Contrôles de lecture (Lecture, Pause, Précédent, Suivant, Rejouer, Vitesse) pour l'animation 3D.
 */

import React from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  SkipBack,
  SkipForward,
  Gauge,
} from 'lucide-react';

interface PlaybackControlsProps {
  isPlaying: boolean;
  currentIndex: number;
  totalItems: number;
  speed: number;
  onTogglePlay: () => void;
  onReset: () => void;
  onStepBack: () => void;
  onStepForward: () => void;
  onChangeSpeed: (speed: number) => void;
  onSeek: (index: number) => void;
  isDarkMode?: boolean;
}

const SPEED_OPTIONS = [0.5, 0.75, 1.0, 1.25, 1.5];

export const PlaybackControls: React.FC<PlaybackControlsProps> = ({
  isPlaying,
  currentIndex,
  totalItems,
  speed,
  onTogglePlay,
  onReset,
  onStepBack,
  onStepForward,
  onChangeSpeed,
  onSeek,
  isDarkMode = true,
}) => {
  const hasItems = totalItems > 0;

  return (
    <div className={`flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 border-t ${isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-800'}`}>
      {/* Boutons principaux de lecture */}
      <div className="flex items-center space-x-1.5">
        <button
          type="button"
          onClick={onReset}
          disabled={!hasItems}
          title="Recommencer depuis le début"
          className={`p-2 rounded-lg disabled:opacity-40 border transition-colors ${isDarkMode ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border-slate-700' : 'bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 border-slate-200'}`}
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={onStepBack}
          disabled={!hasItems || currentIndex <= 0}
          title="Signe précédent"
          className={`p-2 rounded-lg disabled:opacity-40 border transition-colors ${isDarkMode ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border-slate-700' : 'bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 border-slate-200'}`}
        >
          <SkipBack className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={onTogglePlay}
          disabled={!hasItems}
          title={isPlaying ? 'Mettre en pause' : 'Lancer l\'animation'}
          className={`flex items-center space-x-1.5 px-4 py-2 rounded-lg font-semibold text-sm transition-colors ${
            isPlaying
              ? 'bg-amber-500 hover:bg-amber-600 text-slate-950'
              : 'bg-sky-500 hover:bg-sky-600 text-white'
          } disabled:opacity-40`}
        >
          {isPlaying ? (
            <>
              <Pause className="w-4 h-4 fill-current" />
              <span>Pause</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-current" />
              <span>Lire</span>
            </>
          )}
        </button>

        <button
          type="button"
          onClick={onStepForward}
          disabled={!hasItems || currentIndex >= totalItems - 1}
          title="Signe suivant"
          className={`p-2 rounded-lg disabled:opacity-40 border transition-colors ${isDarkMode ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border-slate-700' : 'bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 border-slate-200'}`}
        >
          <SkipForward className="w-4 h-4" />
        </button>
      </div>

      {/* Barre de défilement temporelle */}
      <div className="flex-1 min-w-[120px] max-w-xs mx-2 flex items-center space-x-2">
        <input
          type="range"
          min={0}
          max={Math.max(0, totalItems - 1)}
          value={hasItems ? currentIndex : 0}
          onChange={(e) => onSeek(parseInt(e.target.value, 10))}
          disabled={!hasItems}
          className={`w-full accent-sky-500 cursor-pointer h-1.5 rounded-lg appearance-none ${isDarkMode ? 'bg-slate-700' : 'bg-slate-300'}`}
        />
      </div>

      {/* Sélecteur de vitesse d'animation */}
      <div className={`flex items-center space-x-1 p-0.5 rounded-lg border ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-200'}`}>
        <div className={`px-1.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
          <Gauge className="w-3.5 h-3.5" />
        </div>
        {SPEED_OPTIONS.map((val) => (
          <button
            key={val}
            type="button"
            onClick={() => onChangeSpeed(val)}
            className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
              speed === val
                ? 'bg-sky-500 text-white'
                : isDarkMode
                ? 'text-slate-400 hover:text-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {val}x
          </button>
        ))}
      </div>
    </div>
  );
};
