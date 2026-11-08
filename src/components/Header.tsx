/**
 * @file src/components/Header.tsx
 * @description Barre supérieure de Silatran avec sélection de vue caméra, dictionnaire et style de l'avatar.
 */

import React from 'react';
import {
  BookOpen,
  Palette,
  Volume2,
  VolumeX,
  Camera,
  Layers,
  ZoomIn,
  Box,
  PenTool,
  Mic,
  Video,
  Sun,
  Moon,
} from 'lucide-react';
import { CameraPreset } from '../three/ThreeSignScene';
import { AvatarConfig } from '../types/signs';

interface HeaderProps {
  viewDimension: '3d' | '2d';
  onToggleDimension: (dimension: '3d' | '2d') => void;
  cameraPreset: CameraPreset;
  onSelectCamera: (preset: CameraPreset) => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onOpenDictionary: () => void;
  onOpenCustomizer: () => void;
  onOpenTalkToMotion: () => void;
  isWebcamOpen: boolean;
  onToggleWebcam: () => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  avatarConfig: AvatarConfig;
  onChangeConfig: (newConfig: AvatarConfig) => void;
}

export const Header: React.FC<HeaderProps> = ({
  viewDimension,
  onToggleDimension,
  cameraPreset,
  onSelectCamera,
  soundEnabled,
  onToggleSound,
  onOpenDictionary,
  onOpenCustomizer,
  onOpenTalkToMotion,
  isWebcamOpen,
  onToggleWebcam,
  isDarkMode,
  onToggleDarkMode,
}) => {
  return (
    <header className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-4 sm:px-6 py-3 bg-slate-900/90 border-b border-slate-800 text-slate-100 backdrop-blur-xs">
      {/* Logo Silatran responsive */}
      <div className="flex items-center min-w-0 pr-2">
        <img
          src="/Silatran-logo.png"
          alt="Silatran"
          className="h-7 sm:h-8 md:h-10 max-w-[120px] sm:max-w-[160px] md:max-w-[200px] w-auto object-contain shrink-0"
        />
      </div>

      {/* Boutons de contrôle */}
      <div className="flex items-center space-x-1.5 sm:space-x-2">
        {/* Sélecteur de Mode 3D / 2D Vectoriel */}
        <div className="flex items-center p-0.5 bg-slate-800 rounded-lg border border-slate-700">
          <button
            type="button"
            onClick={() => onToggleDimension('3d')}
            title="Mode Présentateur 3D Réaliste"
            className={`flex items-center space-x-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
              viewDimension === '3d'
                ? 'bg-sky-500 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Box className="w-3.5 h-3.5" />
            <span>3D</span>
          </button>
          <button
            type="button"
            onClick={() => onToggleDimension('2d')}
            title="Mode Dessin Vectoriel 2D"
            className={`flex items-center space-x-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
              viewDimension === '2d'
                ? 'bg-emerald-500 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <PenTool className="w-3.5 h-3.5" />
            <span>2D</span>
          </button>
        </div>

        {/* Sélecteurs de vue caméra */}
        <div className="flex items-center p-0.5 bg-slate-800 rounded-lg border border-slate-700">
          <button
            type="button"
            onClick={() => onSelectCamera('front')}
            title="Vue Buste"
            className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
              cameraPreset === 'front'
                ? 'bg-sky-500 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Buste</span>
          </button>
          <button
            type="button"
            onClick={() => onSelectCamera('hand')}
            title="Zoom sur la main"
            className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
              cameraPreset === 'hand'
                ? 'bg-sky-500 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ZoomIn className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Main</span>
          </button>
          <button
            type="button"
            onClick={() => onSelectCamera('angle')}
            title="Vue de profil 3/4"
            className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
              cameraPreset === 'angle'
                ? 'bg-sky-500 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Profil</span>
          </button>
        </div>

        {/* Bouton Caméra Live Motion Capture */}
        <button
          type="button"
          onClick={onToggleWebcam}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
            isWebcamOpen
              ? 'bg-emerald-500 hover:bg-emerald-400 text-white border-emerald-400 shadow-md'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
          }`}
          title="Ouvrir le panneau résonnant de la caméra en direct pour capturer vos mouvements de mains (MediaPipe & TensorFlow)"
        >
          <Video className="w-3.5 h-3.5 text-emerald-400" />
          <span className="hidden sm:inline">Caméra Live</span>
        </button>

        {/* Bouton Talk to Motion */}
        <button
          type="button"
          onClick={onOpenTalkToMotion}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white text-xs font-bold shadow-sm transition-all"
          title="Parler et exprimer en langue des signes avec synthèse vocale & lip-sync"
        >
          <Mic className="w-3.5 h-3.5 animate-pulse" />
          <span>Talk to Motion</span>
        </button>

        {/* Bouton Dictionnaire */}
        <button
          type="button"
          onClick={onOpenDictionary}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors"
        >
          <BookOpen className="w-3.5 h-3.5 text-sky-400" />
          <span className="hidden sm:inline">Dictionnaire</span>
        </button>

        {/* Bouton Personnaliser Avatar */}
        <button
          type="button"
          onClick={onOpenCustomizer}
          className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors flex items-center space-x-1"
          title="Apparence du présentateur"
        >
          <Palette className="w-4 h-4 text-emerald-400" />
          <span className="hidden md:inline">Style Présentateur</span>
        </button>

        {/* Bouton Dark / Light Mode */}
        <button
          type="button"
          onClick={onToggleDarkMode}
          className="p-1.5 sm:p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors"
          title={isDarkMode ? 'Passer en mode Jour (Light)' : 'Passer en mode Nuit (Dark)'}
        >
          {isDarkMode ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-indigo-400" />
          )}
        </button>

        {/* Son on/off */}
        <button
          type="button"
          onClick={onToggleSound}
          className="p-1.5 sm:p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors"
          title={soundEnabled ? 'Désactiver le son' : 'Activer le son'}
        >
          {soundEnabled ? (
            <Volume2 className="w-4 h-4 text-sky-400" />
          ) : (
            <VolumeX className="w-4 h-4 text-slate-500" />
          )}
        </button>
      </div>
    </header>
  );
};
