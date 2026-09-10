import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Gift, Sparkles, DollarSign, CheckCircle2, ArrowRight, Trophy, Zap, Coins } from 'lucide-react';
import confetti from 'canvas-confetti';
import { soundManager } from '../lib/sound';

interface WelcomeGiftModalProps {
  userName?: string | null;
  demoBalance: number;
  onClose: () => void;
}

export const WelcomeGiftModal: React.FC<WelcomeGiftModalProps> = ({
  userName,
  demoBalance,
  onClose
}) => {
  const [isOpened, setIsOpened] = useState(false);
  const [displayedAmount, setDisplayedAmount] = useState(0);

  // Trigger sound and confetti on gift opening
  const handleOpenGift = () => {
    if (isOpened) return;
    setIsOpened(true);
    soundManager.playGiftReward();

    // Fire golden confetti burst
    const count = 200;
    const defaults = {
      origin: { y: 0.6 }
    };

    function fire(particleRatio: number, opts: confetti.Options) {
      confetti({
        ...defaults,
        ...opts,
        particleCount: Math.floor(count * particleRatio)
      });
    }

    fire(0.25, {
      spread: 26,
      startVelocity: 55,
      colors: ['#10B981', '#3B82F6', '#F59E0B']
    });
    fire(0.2, {
      spread: 60,
      colors: ['#F59E0B', '#10B981', '#EC4899']
    });
    fire(0.35, {
      spread: 100,
      decay: 0.91,
      scalar: 0.8
    });
    fire(0.1, {
      spread: 120,
      startVelocity: 25,
      decay: 0.92,
      colors: ['#3B82F6', '#10B981', '#F59E0B']
    });
    fire(0.1, {
      spread: 120,
      startVelocity: 45,
      colors: ['#10B981', '#F59E0B', '#6366F1']
    });

    // Fast counter animation from $0 to $10,000
    const target = demoBalance || 10000;
    const duration = 1200; // ms
    const startTime = performance.now();

    const animateCount = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Easing function (easeOutExpo)
      const easeProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      const currentVal = Math.floor(easeProgress * target);
      
      setDisplayedAmount(currentVal);

      if (progress < 1) {
        requestAnimationFrame(animateCount);
      } else {
        setDisplayedAmount(target);
      }
    };

    requestAnimationFrame(animateCount);
  };

  const handleClaim = () => {
    // Final burst on claim
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.8 },
      colors: ['#10B981', '#3B82F6', '#F59E0B']
    });
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl">
        {/* Animated Background Rays */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none flex items-center justify-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
            className="w-[600px] h-[600px] sm:w-[800px] sm:h-[800px] rounded-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-amber-500/15 via-emerald-500/10 to-transparent blur-2xl"
          />
        </div>

        {/* Modal Container */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.8, opacity: 0, y: 20 }}
          className="relative w-full max-w-md bg-gradient-to-b from-[#121820] via-[#0F1419] to-[#0A0D11] border border-amber-500/30 rounded-3xl p-6 sm:p-8 text-center shadow-[0_0_50px_rgba(245,158,11,0.2)] overflow-hidden"
        >
          {/* Top Decorative Banner */}
          <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-amber-500/20 via-emerald-500/20 to-amber-500/20 border border-amber-500/40 px-3.5 py-1.5 rounded-full text-xs font-black text-amber-300 uppercase tracking-widest mb-5 shadow-inner">
            <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
            <span>Welcome Demo Gift</span>
            <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            {userName ? `Welcome, ${userName.split(' ')[0]}!` : 'Welcome to SwiftTrade!'}
          </h2>
          <p className="text-xs text-gray-400 mt-1 max-w-xs mx-auto">
            Your exclusive signup gift has arrived! Open your gift box to reveal your starting virtual funds.
          </p>

          {/* Interactive Gift Box Area */}
          <div className="my-6 relative flex items-center justify-center min-h-[190px]">
            {!isOpened ? (
              <motion.button
                onClick={handleOpenGift}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                animate={{
                  y: [0, -8, 0],
                  rotate: [0, -2, 2, -2, 0]
                }}
                transition={{
                  duration: 2.5,
                  repeat: Infinity,
                  ease: 'easeInOut'
                }}
                className="group relative cursor-pointer focus:outline-none"
              >
                {/* Glow Ring */}
                <div className="absolute -inset-4 rounded-full bg-gradient-to-r from-amber-500/30 via-emerald-500/30 to-amber-500/30 blur-xl group-hover:opacity-100 transition-opacity animate-pulse" />
                
                {/* Gift Box Icon Container */}
                <div className="relative w-32 h-32 sm:w-36 sm:h-36 rounded-3xl bg-gradient-to-br from-amber-500 via-amber-600 to-emerald-600 p-1 shadow-[0_10px_30px_rgba(245,158,11,0.4)] flex items-center justify-center">
                  <div className="w-full h-full rounded-[22px] bg-gradient-to-b from-gray-900 via-[#151D28] to-gray-900 flex flex-col items-center justify-center border border-amber-400/30 relative overflow-hidden">
                    {/* Ribbon Cross overlay */}
                    <div className="absolute w-6 h-full bg-gradient-to-b from-amber-400 to-amber-600 opacity-90 shadow-sm" />
                    <div className="absolute h-6 w-full bg-gradient-to-r from-amber-400 to-amber-600 opacity-90 shadow-sm" />
                    
                    <Gift className="w-16 h-16 text-amber-300 relative z-10 drop-shadow-[0_4px_10px_rgba(0,0,0,0.8)] group-hover:scale-110 transition-transform" />
                  </div>
                </div>

                <div className="mt-4 inline-flex items-center space-x-1.5 text-xs font-black text-amber-400 uppercase tracking-wider bg-amber-500/10 border border-amber-500/30 px-3 py-1 rounded-lg">
                  <Zap className="w-3.5 h-3.5 text-amber-400 animate-bounce" />
                  <span>Tap Gift Box To Open!</span>
                </div>
              </motion.button>
            ) : (
              <motion.div
                initial={{ scale: 0.3, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="relative flex flex-col items-center justify-center"
              >
                {/* Flying Dollar particles */}
                <div className="absolute -top-10 left-1/2 -translate-x-1/2 flex space-x-4 pointer-events-none">
                  {[...Array(6)].map((_, i) => (
                    <motion.div
                      key={i}
                      initial={{ y: 20, opacity: 0, scale: 0.5 }}
                      animate={{
                        y: [-20, -70, -100],
                        opacity: [0, 1, 0],
                        x: (i % 2 === 0 ? 1 : -1) * (15 + i * 12),
                        rotate: (i % 2 === 0 ? 15 : -15) * (i + 1)
                      }}
                      transition={{ duration: 1.8, delay: i * 0.15 }}
                      className="text-emerald-400 font-black text-sm sm:text-base flex items-center gap-0.5 bg-emerald-950/80 border border-emerald-500/40 px-2 py-0.5 rounded-md shadow-lg"
                    >
                      <DollarSign className="w-4 h-4" />
                      <span>$10,000</span>
                    </motion.div>
                  ))}
                </div>

                {/* Opened Reward Box */}
                <div className="relative w-36 h-36 rounded-3xl bg-gradient-to-br from-emerald-500 via-teal-600 to-emerald-700 p-1 shadow-[0_0_40px_rgba(16,185,129,0.5)]">
                  <div className="w-full h-full rounded-[22px] bg-[#0D131A] flex flex-col items-center justify-center border border-emerald-400/40 p-2">
                    <Coins className="w-12 h-12 text-amber-400 animate-bounce mb-1" />
                    <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest">Demo Bonus</span>
                  </div>
                </div>

                {/* Animated Amount Counter */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4"
                >
                  <div className="text-3xl sm:text-4xl font-black text-emerald-400 font-mono tracking-tight drop-shadow-[0_0_15px_rgba(16,185,129,0.4)]">
                    ${displayedAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <span className="text-xs font-semibold text-gray-300 flex items-center justify-center gap-1 mt-1">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    Practice Funds Added to Demo Account
                  </span>
                </motion.div>
              </motion.div>
            )}
          </div>

          {/* Bottom Action Button */}
          {!isOpened ? (
            <button
              onClick={handleOpenGift}
              className="w-full py-4 bg-gradient-to-r from-amber-500 via-amber-600 to-emerald-600 hover:from-amber-400 hover:to-emerald-500 text-white font-black text-sm rounded-2xl shadow-[0_0_25px_rgba(245,158,11,0.4)] transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center space-x-2 border border-amber-300/30 uppercase tracking-wider"
            >
              <Gift className="w-5 h-5 text-amber-200" />
              <span>Open Welcome Gift Box</span>
            </button>
          ) : (
            <button
              onClick={handleClaim}
              className="w-full py-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-sm rounded-2xl shadow-[0_0_25px_rgba(16,185,129,0.5)] transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center space-x-2 border border-emerald-300/30 uppercase tracking-wider"
            >
              <span>Start Trading Now</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          )}

          <p className="text-[10px] text-gray-500 mt-4">
            Risk-free virtual demo balance for practicing live trades. Re-fillable anytime in settings!
          </p>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
