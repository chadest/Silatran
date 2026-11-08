/**
 * @file src/components/SignTimeline.tsx
 * @description Barre de séquence interactive affichant les mots et lettres traduits, avec saut au clic.
 */

import React, { useRef, useEffect } from 'react';
import { SequenceItem } from '../types/signs';
import { ALL_SIGNS } from '../utils/signDictionary';

interface SignTimelineProps {
  sequence: SequenceItem[];
  currentIndex: number;
  onSelectIndex: (index: number) => void;
  isDarkMode?: boolean;
}

export const SignTimeline: React.FC<SignTimelineProps> = ({
  sequence,
  currentIndex,
  onSelectIndex,
  isDarkMode = true,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const activeItemRef = useRef<HTMLButtonElement>(null);

  // Défilement automatique vers le signe actif
  useEffect(() => {
    if (activeItemRef.current && containerRef.current) {
      activeItemRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      });
    }
  }, [currentIndex]);

  if (sequence.length === 0) {
    return null;
  }

  const currentItem = sequence[currentIndex];
  const currentSignDef = currentItem && currentItem.signId !== 'SPACE' ? ALL_SIGNS[currentItem.signId] : null;

  return (
    <div className={`w-full border-t px-4 py-2 ${isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-800'}`}>
      {/* Description brève du signe en cours */}
      {currentSignDef && (
        <div className="flex items-center justify-between mb-2 text-xs">
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-sky-500 uppercase tracking-wide">
              {currentSignDef.name}
            </span>
            <span className={isDarkMode ? 'text-slate-500' : 'text-slate-400'}>·</span>
            <span className={isDarkMode ? 'text-slate-300 truncate max-w-md' : 'text-slate-600 truncate max-w-md'}>
              {currentSignDef.description}
            </span>
          </div>
          <span className={`text-[11px] font-mono ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
            {currentIndex + 1} / {sequence.length}
          </span>
        </div>
      )}

      {/* Bande de défilement horizontal des signes */}
      <div
        ref={containerRef}
        className="flex items-center space-x-1.5 overflow-x-auto py-1 scrollbar-none"
      >
        {sequence.map((item, idx) => {
          const isActive = idx === currentIndex;
          const isSpace = item.type === 'space';

          if (isSpace) {
            return (
              <div
                key={item.id}
                className={`w-2.5 h-6 rounded flex items-center justify-center shrink-0 ${isDarkMode ? 'bg-slate-800/80' : 'bg-slate-200'}`}
                title="Espace"
              />
            );
          }

          return (
            <button
              key={item.id}
              ref={isActive ? activeItemRef : null}
              type="button"
              onClick={() => onSelectIndex(idx)}
              className={`shrink-0 flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
                isActive
                  ? 'bg-sky-500 text-white border-sky-400 shadow-sm'
                  : isDarkMode
                  ? 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700 hover:text-white'
                  : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200 hover:text-slate-900'
              }`}
            >
              <span className="font-bold">{item.text}</span>
              <span
                className={`text-[10px] px-1 rounded uppercase ${
                  isActive
                    ? 'bg-sky-600 text-sky-100'
                    : isDarkMode
                    ? 'bg-slate-700 text-slate-400'
                    : 'bg-slate-200 text-slate-600'
                }`}
              >
                {item.type === 'word' ? 'mot' : 'lettre'}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
