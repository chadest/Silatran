/**
 * @file src/components/CharacterCustomizerModal.tsx
 * @description Modale de choix des modèles 3D enregistrés dans le projet et personnalisation.
 */

import React from 'react';
import { X, Palette, Check, UserCheck, Star, Box, PenTool } from 'lucide-react';
import { AvatarConfig } from '../types/signs';

interface CharacterCustomizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: AvatarConfig;
  onChangeConfig: (newConfig: AvatarConfig) => void;
  viewDimension?: '3d' | '2d';
  onToggleDimension?: (dimension: '3d' | '2d') => void;
}

const SKIN_TONES = [
  { label: 'Pêche', value: '#e6beab' },
  { label: 'Doré', value: '#d29c78' },
  { label: 'Caramel', value: '#aa724b' },
  { label: 'Ébène', value: '#66462c' },
];

const CLOTHING_COLORS = [
  { label: 'Bleu Marine', value: '#1e293b' },
  { label: 'Anthracite', value: '#334155' },
  { label: 'Émeraude', value: '#064e3b' },
  { label: 'Bordeaux', value: '#881337' },
  { label: 'Noir Onyx', value: '#0f172a' },
];

const HAIR_COLORS = [
  { label: 'Brun Profond', value: '#1c1917' },
  { label: 'Châtain', value: '#451a03' },
  { label: 'Blond Venitien', value: '#ca8a04' },
  { label: 'Gris Argent', value: '#64748b' },
];

export const CharacterCustomizerModal: React.FC<CharacterCustomizerModalProps> = ({
  isOpen,
  onClose,
  config,
  onChangeConfig,
  viewDimension = '3d',
  onToggleDimension,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden text-slate-100 flex flex-col max-h-[90vh]">
        {/* En-tête */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <div className="flex items-center space-x-2.5">
            <Palette className="w-5 h-5 text-emerald-400" />
            <h2 className="font-bold text-base text-white">
              Apparence & Mode du Présentateur
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Choix des modèles & dimensions */}
        <div className="p-5 space-y-5 overflow-y-auto">
          {/* Choix Dimension 3D / 2D */}
          {onToggleDimension && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2">
                Mode de rendu (Dimension)
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => onToggleDimension('3d')}
                  className={`p-3 rounded-lg border text-xs font-semibold flex items-center justify-center space-x-2 transition-all ${
                    viewDimension === '3d'
                      ? 'bg-sky-500/20 border-sky-500 text-sky-300 ring-1 ring-sky-500'
                      : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-white'
                  }`}
                >
                  <Box className="w-4 h-4 text-sky-400" />
                  <span>Modèle 3D Temps Réel</span>
                </button>
                <button
                  type="button"
                  onClick={() => onToggleDimension('2d')}
                  className={`p-3 rounded-lg border text-xs font-semibold flex items-center justify-center space-x-2 transition-all ${
                    viewDimension === '2d'
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 ring-1 ring-emerald-500'
                      : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-white'
                  }`}
                >
                  <PenTool className="w-4 h-4 text-emerald-400" />
                  <span>Dessin Vectoriel 2D</span>
                </button>
              </div>
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              Modèle 3D Réaliste (Enregistré dans le projet)
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() =>
                  onChangeConfig({
                    ...config,
                    modelType: 'glb_custom',
                    glbUrl: '/teen-boy/scene.gltf',
                    glbFileName: 'Personnage Réaliste (Teen Boy 3D)',
                    glbScale: 1.0,
                    glbOffsetY: 0.0,
                  })
                }
                className={`col-span-2 p-3 rounded-lg border text-left transition-all flex items-center space-x-3 ${
                  config.modelType === 'glb_custom' && config.glbUrl === '/teen-boy/scene.gltf'
                    ? 'bg-sky-500/20 border-sky-500 text-white ring-1 ring-sky-500'
                    : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <UserCheck className="w-5 h-5 text-sky-400 shrink-0" />
                <div>
                  <span className="font-semibold text-xs block text-white">Personnage Réaliste Teen Boy 3D</span>
                  <span className="text-[10px] text-slate-300 block">Modèle 3D complet avec textures & mains articulées</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() =>
                  onChangeConfig({
                    ...config,
                    modelType: 'glb_custom',
                    glbUrl: '/xbot.glb',
                    glbFileName: 'Mannequin Studio 3D (XBot)',
                    glbScale: 1.0,
                    glbOffsetY: 0.0,
                  })
                }
                className={`col-span-2 p-3 rounded-lg border text-left transition-all flex items-center space-x-3 ${
                  config.modelType === 'glb_custom' && config.glbUrl === '/xbot.glb'
                    ? 'bg-sky-500/20 border-sky-500 text-white ring-1 ring-sky-500'
                    : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <UserCheck className="w-5 h-5 text-sky-400 shrink-0" />
                <div>
                  <span className="font-semibold text-xs block">Mannequin Studio 3D (XBot)</span>
                  <span className="text-[10px] text-slate-400 block">Modèle 3D humanoïde articulé</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() =>
                  onChangeConfig({
                    ...config,
                    modelType: 'realistic',
                  })
                }
                className={`col-span-2 p-3 rounded-lg border text-left transition-all flex items-center space-x-3 ${
                  config.modelType === 'realistic'
                    ? 'bg-amber-500/20 border-amber-500 text-white ring-1 ring-amber-500'
                    : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <Star className="w-5 h-5 text-amber-400 shrink-0" />
                <div>
                  <span className="font-semibold text-xs block">Avatar Studio PBR Costume Pro</span>
                  <span className="text-[10px] text-slate-400 block">Sculpture PBR avec costume & textures peau</span>
                </div>
              </button>
            </div>
          </div>

          {/* Options de couleur pour l'avatar PBR */}
          {config.modelType === 'realistic' && (
            <>
              {/* Couleur de peau */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">
                  Teint de peau
                </label>
                <div className="flex items-center space-x-3">
                  {SKIN_TONES.map((tone) => {
                    const isSelected = config.skinColor === tone.value;
                    return (
                      <button
                        key={tone.value}
                        type="button"
                        onClick={() => onChangeConfig({ ...config, skinColor: tone.value })}
                        className="flex flex-col items-center space-y-1 group"
                      >
                        <div
                          style={{ backgroundColor: tone.value }}
                          className={`w-9 h-9 rounded-full border-2 flex items-center justify-center transition-transform ${
                            isSelected
                              ? 'border-sky-400 scale-110 shadow-md'
                              : 'border-slate-700 hover:border-slate-500'
                          }`}
                        >
                          {isSelected && <Check className="w-4 h-4 text-slate-900" />}
                        </div>
                        <span className="text-[10px] text-slate-400">{tone.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Veste de costume */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">
                  Couleur de la veste de costume
                </label>
                <div className="flex items-center space-x-2.5">
                  {CLOTHING_COLORS.map((col) => {
                    const isSelected = config.clothingColor === col.value;
                    return (
                      <button
                        key={col.value}
                        type="button"
                        onClick={() => onChangeConfig({ ...config, clothingColor: col.value })}
                        className="flex flex-col items-center space-y-1"
                      >
                        <div
                          style={{ backgroundColor: col.value }}
                          className={`w-9 h-9 rounded-full border-2 flex items-center justify-center transition-transform ${
                            isSelected
                              ? 'border-white scale-110 shadow-md'
                              : 'border-slate-700 hover:border-slate-500'
                          }`}
                        >
                          {isSelected && <Check className="w-4 h-4 text-white" />}
                        </div>
                        <span className="text-[10px] text-slate-400">{col.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Cheveux */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">
                  Couleur des cheveux
                </label>
                <div className="flex items-center space-x-2.5">
                  {HAIR_COLORS.map((hair) => {
                    const isSelected = config.hairColor === hair.value;
                    return (
                      <button
                        key={hair.value}
                        type="button"
                        onClick={() => onChangeConfig({ ...config, hairColor: hair.value })}
                        className="flex flex-col items-center space-y-1"
                      >
                        <div
                          style={{ backgroundColor: hair.value }}
                          className={`w-9 h-9 rounded-full border-2 flex items-center justify-center transition-transform ${
                            isSelected
                              ? 'border-sky-400 scale-110 shadow-md'
                              : 'border-slate-700 hover:border-slate-500'
                          }`}
                        >
                          {isSelected && <Check className="w-4 h-4 text-white" />}
                        </div>
                        <span className="text-[10px] text-slate-400">{hair.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Bouton de confirmation */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-900/60 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white text-xs font-semibold rounded-lg transition-colors"
          >
            Appliquer
          </button>
        </div>
      </div>
    </div>
  );
};
