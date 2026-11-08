/**
 * @file src/components/TranslationInput.tsx
 * @description Champ de saisie de texte à traduire en langue des signes et suggestions rapides.
 */

import React, { useState } from 'react';
import { Lightbulb, X, ArrowRight } from 'lucide-react';

interface TranslationInputProps {
  currentText: string;
  onTranslate: (text: string) => void;
  isDarkMode?: boolean;
}

const SUGGESTIONS = [
  'Bonjour',
  'Merci',
  "S'il vous plaît",
  'Au revoir',
  'Aider',
  'Amour',
  'Paix',
  'Silatran',
];

export const TranslationInput: React.FC<TranslationInputProps> = ({
  currentText,
  onTranslate,
  isDarkMode = true,
}) => {
  const [inputText, setInputText] = useState(currentText);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputText.trim()) {
      onTranslate(inputText);
    }
  };

  const handleSelectSuggestion = (suggestion: string) => {
    setInputText(suggestion);
    onTranslate(suggestion);
  };

  const handleClear = () => {
    setInputText('');
  };

  return (
    <div className={`w-full px-4 py-3 border-t ${isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'}`}>
      <form onSubmit={handleSubmit} className="flex items-center space-x-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Tapez un mot ou une phrase (ex: Bonjour, Merci, Amitié)..."
            className={`w-full px-3.5 py-2.5 pr-9 border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-sky-500 ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-100 placeholder-slate-400 focus:border-sky-500' : 'bg-slate-50 border-slate-300 text-slate-950 placeholder-slate-500 focus:border-sky-500'}`}
          />
          {inputText && (
            <button
              type="button"
              onClick={handleClear}
              className={`absolute right-2.5 top-1/2 -translate-y-1/2 p-1 ${isDarkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-800'}`}
              title="Effacer le texte"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <button
          type="submit"
          className="flex items-center space-x-1.5 px-4 py-2.5 bg-sky-500 hover:bg-sky-600 text-white rounded-lg text-sm font-semibold transition-colors shrink-0 shadow-sm"
        >
          <span>Traduire</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </form>

      {/* Raccourcis et suggestions rapides */}
      <div className="flex items-center space-x-1.5 overflow-x-auto pt-2.5 pb-0.5 scrollbar-none text-xs">
        <span className={`flex items-center space-x-1 shrink-0 font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
          <Lightbulb className="w-3.5 h-3.5 text-sky-500" />
          <span>Exemples :</span>
        </span>
        {SUGGESTIONS.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => handleSelectSuggestion(item)}
            className={`shrink-0 px-2.5 py-1 rounded-md border transition-colors ${isDarkMode ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border-slate-700' : 'bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 border-slate-200'}`}
          >
            {item}
          </button>
        ))}
      </div>
    </div>
  );
};
