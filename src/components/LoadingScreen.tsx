/**
 * @file src/components/LoadingScreen.tsx
 * @description Page de chargement minimaliste sur fond blanc affichant le GIF du logo Silatran-logo.gif et "Powered by Chades’t Creative".
 */

import React, { useEffect } from 'react';

interface LoadingScreenProps {
  progress?: number;
  message?: string;
  onFinishLoading?: () => void;
  isDarkMode?: boolean;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ onFinishLoading }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      if (onFinishLoading) {
        onFinishLoading();
      }
    }, 1800);
    return () => clearTimeout(timer);
  }, [onFinishLoading]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white select-none overflow-hidden p-6 space-y-6">
      <img
        src="/Silatran-logo.gif"
        alt="Silatran Logo"
        className="w-48 h-48 md:w-64 md:h-64 object-contain"
      />
      <p className="text-xs sm:text-sm font-medium text-slate-500 tracking-wider">
        Powered by Chades’t Creative
      </p>
    </div>
  );
};
