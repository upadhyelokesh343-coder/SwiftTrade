import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, Smartphone, X, CheckCircle2 } from 'lucide-react';

export const PWAInstallButton: React.FC<{ className?: string }> = ({ className }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already running inside installed APK or standalone PWA, hide button
  if (isInstalled) {
    return null;
  }

  return (
    <>
      {isInstallable && (
        <button
          onClick={install}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold text-xs shadow-lg shadow-blue-600/30 transition-all active:scale-95 border border-blue-400/40 cursor-pointer ${className}`}
          title="Install App as APK / PWA"
        >
          <Download className="w-3.5 h-3.5 animate-bounce" />
          <span>Install App</span>
        </button>
      )}

      {isIOS && !isInstallable && (
        <button
          onClick={() => setShowIOSGuide(true)}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-white font-bold text-xs border border-gray-700 cursor-pointer ${className}`}
        >
          <Smartphone className="w-3.5 h-3.5 text-blue-400" />
          <span>Install App</span>
        </button>
      )}

      {showIOSGuide && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-2xl bg-[#12171D] border border-gray-700/80 p-5 shadow-2xl text-white space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-gray-800">
              <div className="flex items-center space-x-2">
                <Smartphone className="w-5 h-5 text-blue-400" />
                <h3 className="text-sm font-bold">Install on iPhone / iPad</h3>
              </div>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="p-1 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-gray-300">
              <p className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center shrink-0 text-[10px]">1</span>
                <span>Tap the <strong className="text-white">Share</strong> button at the bottom of Safari browser.</span>
              </p>
              <p className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center shrink-0 text-[10px]">2</span>
                <span>Scroll down and select <strong className="text-white">Add to Home Screen</strong>.</span>
              </p>
              <p className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center shrink-0 text-[10px]">3</span>
                <span>Launch SwiftTrade directly from your home screen like a native app.</span>
              </p>
            </div>

            <button
              onClick={() => setShowIOSGuide(false)}
              className="w-full rounded-xl bg-blue-600 hover:bg-blue-500 py-2.5 text-xs font-bold text-white transition cursor-pointer"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
};
