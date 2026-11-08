/**
 * @file src/components/DictionaryModal.tsx
 * @description Fenêtre modale du dictionnaire de langue des signes (Alphabet dactylologique A-Z et vocabulaire usuel).
 */

import React, { useState } from 'react';
import { X, Search, BookOpen, Layers } from 'lucide-react';
import { ALPHABET_SIGNS, VOCABULARY_SIGNS } from '../utils/signDictionary';
import { SignDefinition } from '../types/signs';

interface DictionaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSign: (sign: SignDefinition) => void;
}

export const DictionaryModal: React.FC<DictionaryModalProps> = ({
  isOpen,
  onClose,
  onSelectSign,
}) => {
  const [activeTab, setActiveTab] = useState<'alphabet' | 'vocabulaire'>('alphabet');
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  const currentDict = activeTab === 'alphabet' ? ALPHABET_SIGNS : VOCABULARY_SIGNS;
  const signsList = Object.values(currentDict);

  const filteredSigns = signsList.filter((sign) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      sign.name.toLowerCase().includes(q) ||
      sign.description.toLowerCase().includes(q)
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden text-slate-100">
        {/* En-tête */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <div className="flex items-center space-x-2.5">
            <BookOpen className="w-5 h-5 text-sky-400" />
            <h2 className="font-bold text-base text-white">
              Dictionnaire de Langue des Signes
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

        {/* Barre d'onglets & Recherche */}
        <div className="px-5 py-3 border-b border-slate-800 flex flex-col sm:flex-row gap-2.5 items-center justify-between bg-slate-900/60">
          <div className="flex items-center p-0.5 bg-slate-800 rounded-lg border border-slate-700 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setActiveTab('alphabet')}
              className={`flex-1 sm:flex-initial px-4 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                activeTab === 'alphabet'
                  ? 'bg-sky-500 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Alphabet (A - Z)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('vocabulaire')}
              className={`flex-1 sm:flex-initial px-4 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                activeTab === 'vocabulaire'
                  ? 'bg-sky-500 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Vocabulaire ({Object.keys(VOCABULARY_SIGNS).length})
            </button>
          </div>

          <div className="relative w-full sm:w-60">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher un signe..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:border-sky-500"
            />
          </div>
        </div>

        {/* Liste des signes */}
        <div className="flex-1 overflow-y-auto p-5 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {filteredSigns.length === 0 ? (
            <div className="col-span-full py-12 text-center text-slate-400 text-xs">
              Aucun signe correspondant trouvé.
            </div>
          ) : (
            filteredSigns.map((sign) => (
              <button
                key={sign.id}
                type="button"
                onClick={() => {
                  onSelectSign(sign);
                  onClose();
                }}
                className="text-left p-3 rounded-lg bg-slate-800/80 hover:bg-slate-800 border border-slate-700 hover:border-sky-500/60 transition-colors flex items-start space-x-3 group"
              >
                <div className="w-9 h-9 rounded-md bg-slate-700 flex items-center justify-center font-bold text-sky-400 text-sm group-hover:bg-sky-500 group-hover:text-white transition-colors shrink-0">
                  {sign.id.length <= 2 ? sign.id : <Layers className="w-4 h-4" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-xs text-slate-100 truncate">
                      {sign.name}
                    </h3>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-700 text-slate-300 uppercase font-mono">
                      {sign.type}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                    {sign.description}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
