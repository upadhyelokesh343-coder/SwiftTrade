import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Wallet, ArrowUpCircle, ShieldCheck, AlertCircle, RefreshCw, Lock, Unlock, AlertTriangle, X, ArrowRight } from 'lucide-react';
import { cn } from '../lib/utils';
import { db, auth } from '../lib/firebase';
import { collection, addDoc, doc, updateDoc, getDoc, onSnapshot } from 'firebase/firestore';
import { AccountType } from '../types';
import { soundManager } from '../lib/sound';

export interface WithdrawalPageProps {
  balance: number;
  accountType?: AccountType | string;
  realBalance?: number;
  demoBalance?: number;
  onSwitchToReal?: () => void;
  onOpenDeposit?: () => void;
  onBackToTrade: () => void;
}

export const WithdrawalPage: React.FC<WithdrawalPageProps> = ({ 
  balance, 
  accountType = 'Demo Account',
  realBalance,
  demoBalance,
  onSwitchToReal,
  onOpenDeposit,
  onBackToTrade 
}) => {
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<'upi' | 'bank' | 'crypto'>('crypto');
  const [destinationAddress, setDestinationAddress] = useState('');
  const [cryptoNetwork, setCryptoNetwork] = useState('USDT_TRC20');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Live Firestore listener for synced balances
  const [liveRealBalance, setLiveRealBalance] = useState<number>(
    typeof realBalance === 'number' ? realBalance : 0
  );
  const [liveDemoBalance, setLiveDemoBalance] = useState<number>(
    typeof demoBalance === 'number' ? demoBalance : 10000
  );

  useEffect(() => {
    if (typeof realBalance === 'number') {
      setLiveRealBalance(realBalance);
    }
  }, [realBalance]);

  useEffect(() => {
    if (typeof demoBalance === 'number') {
      setLiveDemoBalance(demoBalance);
    }
  }, [demoBalance]);

  useEffect(() => {
    if (!auth.currentUser) return;
    const userRef = doc(db, 'users', auth.currentUser.uid);
    const unsub = onSnapshot(userRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (typeof data.realBalance === 'number') {
          setLiveRealBalance(data.realBalance);
        } else {
          setLiveRealBalance(0);
        }
        if (typeof data.demoBalance === 'number') {
          setLiveDemoBalance(data.demoBalance);
        } else {
          setLiveDemoBalance(10000);
        }
      }
    });
    return () => unsub();
  }, []);

  // Strict Balance Type Verification
  const isDemoMode = accountType === 'Demo Account' || (typeof accountType === 'string' && accountType.toLowerCase().includes('demo'));
  const isExplicitlyReal = !isDemoMode && (accountType === 'Real Account' || (typeof accountType === 'string' && accountType.toLowerCase().includes('real')));

  const currentAvailableReal = liveRealBalance;
  const currentDemoVirtual = liveDemoBalance;

  // Trigger standardized Demo block message
  const triggerDemoBlockedToast = () => {
    soundManager.playWarning();
    setToastMessage('Demo funds cannot be withdrawn. Please switch to a real account.');
  };

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    setToastMessage(null);

    // 1. Check Balance Type & Block Demo Withdrawals
    if (isDemoMode || !isExplicitlyReal) {
      triggerDemoBlockedToast();
      return;
    }

    // 2. Allow Real Withdrawals Only - verify explicitly real with positive withdrawable balance
    if (currentAvailableReal <= 0) {
      soundManager.playWarning();
      setToastMessage('Your real account has no available withdrawable balance. Please deposit real funds to withdraw.');
      return;
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      soundManager.playWarning();
      setToastMessage('Please enter a valid extraction amount.');
      return;
    }

    if (parsedAmount < 50) {
      soundManager.playWarning();
      setToastMessage('Minimum withdrawal amount is $50.00.');
      return;
    }

    if (parsedAmount > currentAvailableReal) {
      soundManager.playWarning();
      setToastMessage(`Extraction amount exceeds your available real balance of $${currentAvailableReal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}.`);
      return;
    }

    if (!destinationAddress.trim()) {
      soundManager.playWarning();
      setToastMessage('Please provide your destination payout address/details.');
      return;
    }

    setIsSubmitting(true);
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('User authentication session required.');
      }

      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);
      const userData = userSnap.data();
      const verifiedDbRealBalance = Number(userData?.realBalance ?? currentAvailableReal);

      // Verify database real balance strictly
      if (verifiedDbRealBalance < parsedAmount) {
        throw new Error(`Insufficient real balance on account. Verified balance is $${verifiedDbRealBalance.toFixed(2)}.`);
      }

      // Record withdrawal request with strict real verification tags
      await addDoc(collection(db, 'withdrawals'), {
        userId: user.uid,
        userEmail: user.email,
        amount: parsedAmount,
        currency: 'USD',
        accountType: 'Real Account',
        balanceType: 'real',
        method: method === 'crypto' ? `Crypto (${cryptoNetwork})` : method.toUpperCase(),
        details: destinationAddress.trim(),
        status: 'PENDING',
        createdAt: new Date(),
      });

      // Deduct ONLY from realBalance in Firestore
      await updateDoc(userRef, {
        realBalance: verifiedDbRealBalance - parsedAmount,
        updatedAt: new Date()
      });

      setStatus('success');
    } catch (error: any) {
      console.error('Withdrawal error:', error);
      soundManager.playWarning();
      setToastMessage(error.message || 'Withdrawal request failed. Please try again.');
      setStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (status === 'success') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-6 animate-in zoom-in duration-500">
        <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center border border-green-500/30 shadow-[0_0_30px_rgba(34,197,94,0.3)]">
          <ShieldCheck className="w-10 h-10 text-green-400" />
        </div>
        <div className="text-center space-y-2 max-w-sm">
          <h2 className="text-2xl font-black tracking-tighter uppercase italic text-white">Extraction Transmitted</h2>
          <p className="text-xs text-gray-400 font-medium leading-relaxed">
            Your real withdrawal request has been submitted to the settlement queue and will be processed within 24-48 hours.
          </p>
        </div>
        <button 
          onClick={onBackToTrade}
          className="px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-[0_0_20px_rgba(37,99,235,0.4)] cursor-pointer"
        >
          Return to Trade Flux
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col p-4 sm:p-8 space-y-8 overflow-y-auto bg-[#0B0E11] relative">
      {/* Dynamic Toast / Error Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-[600] w-[92%] max-w-md bg-gradient-to-r from-red-950/95 via-gray-900/95 to-red-950/95 border border-red-500/40 rounded-2xl p-4 shadow-[0_10px_40px_rgba(239,68,68,0.3)] backdrop-blur-xl flex items-start gap-3"
          >
            <div className="p-2 rounded-xl bg-red-500/20 border border-red-500/30 shrink-0 text-red-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-black uppercase tracking-wider text-red-400">Withdrawal Blocked</div>
              <p className="text-xs text-gray-200 mt-1 font-medium leading-relaxed">{toastMessage}</p>
              {isDemoMode && onSwitchToReal && (
                <button
                  type="button"
                  onClick={() => {
                    onSwitchToReal();
                    setToastMessage(null);
                  }}
                  className="mt-2.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 active:scale-95 shadow-md cursor-pointer"
                >
                  <Unlock className="w-3.5 h-3.5" />
                  <span>Switch to Real Account</span>
                </button>
              )}
            </div>
            <button 
              onClick={() => setToastMessage(null)}
              className="text-gray-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/5 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-md mx-auto w-full space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <header className="space-y-2">
          <div className="flex items-center gap-3 text-blue-400">
            <ArrowUpCircle className="w-8 h-8" />
            <h1 className="text-3xl font-black tracking-tighter uppercase italic">Asset Extraction</h1>
          </div>
          <p className="text-[10px] text-gray-500 font-black uppercase tracking-[0.3em]">Institutional Settlement Protocol</p>
        </header>

        {/* Demo Account Lock Warning Banner */}
        {isDemoMode && (
          <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/30 rounded-2xl p-4 sm:p-5 space-y-3 relative overflow-hidden backdrop-blur-md">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
                <Lock className="w-5 h-5 text-amber-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-black text-amber-400 uppercase tracking-wider">Demo Mode Active</span>
                  <span className="text-[9px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-black uppercase tracking-widest border border-amber-500/40 flex items-center gap-1">
                    <Lock className="w-2.5 h-2.5" /> Withdrawals Locked
                  </span>
                </div>
                <p className="text-xs text-gray-300 mt-1 font-medium leading-relaxed">
                  You are currently using virtual practice funds ($10,000 Demo Balance). Demo funds cannot be withdrawn to banks, UPI, or crypto wallets.
                </p>
              </div>
            </div>

            {onSwitchToReal && (
              <div className="pt-1 flex items-center justify-between border-t border-amber-500/20">
                <span className="text-[10px] text-gray-400 font-medium">Ready to withdraw real earnings?</span>
                <button
                  type="button"
                  onClick={onSwitchToReal}
                  className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)] active:scale-95 flex items-center gap-1.5 cursor-pointer"
                >
                  <Unlock className="w-3.5 h-3.5" />
                  <span>Switch to Real Account</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        )}

        <div className="bg-gray-900/40 border border-white/10 rounded-[32px] p-6 sm:p-8 space-y-6 backdrop-blur-md relative overflow-hidden shadow-2xl">
          {/* Decorative glow */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/10 blur-[60px] rounded-full pointer-events-none" />
          
          <div className="space-y-5">
            {/* Liquidity Card */}
            <div className={cn(
              "p-4 rounded-2xl border transition-all relative overflow-hidden",
              isDemoMode 
                ? "bg-amber-950/20 border-amber-500/30" 
                : "bg-white/5 border-white/5"
            )}>
              <div className="flex justify-between items-start mb-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">
                      {isDemoMode ? 'Active Balance (Virtual)' : 'Available Real Liquidity'}
                    </span>
                    {isDemoMode ? (
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-[8px] font-black text-amber-300 uppercase tracking-widest flex items-center gap-1">
                        <Lock className="w-2.5 h-2.5" /> Non-Withdrawable
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-[8px] font-black text-emerald-400 uppercase tracking-widest flex items-center gap-1">
                        <ShieldCheck className="w-2.5 h-2.5" /> Verified Real
                      </span>
                    )}
                  </div>
                  <div className={cn(
                    "text-2xl sm:text-3xl font-black italic tracking-tight font-mono",
                    isDemoMode ? "text-amber-400" : "text-white"
                  )}>
                    ${(isDemoMode ? currentDemoVirtual : currentAvailableReal).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
                <div className={cn(
                  "p-2 rounded-xl border",
                  isDemoMode ? "bg-amber-500/10 border-amber-500/20 text-amber-400" : "bg-blue-500/10 border-blue-500/20 text-blue-400"
                )}>
                  {isDemoMode ? <Lock className="w-6 h-6" /> : <Wallet className="w-6 h-6" />}
                </div>
              </div>

              {/* Sub-balance breakdown */}
              {isDemoMode && (
                <div className="pt-2 border-t border-amber-500/20 flex justify-between items-center text-[10px]">
                  <span className="text-gray-400 font-semibold">Withdrawable Real Balance:</span>
                  <span className="font-mono font-bold text-emerald-400">${currentAvailableReal.toFixed(2)}</span>
                </div>
              )}
            </div>

            <form onSubmit={handleWithdraw} className="space-y-6">
              {/* Amount Input */}
              <div className="space-y-3">
                <div className="flex justify-between items-center px-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">
                    Extraction Amount
                  </label>
                  {isDemoMode && (
                    <span className="text-[9px] text-amber-400 font-black uppercase tracking-wider flex items-center gap-1">
                      <Lock className="w-3 h-3" /> Locked
                    </span>
                  )}
                </div>

                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-blue-400">$</span>
                  <input 
                    type="number" 
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    disabled={isDemoMode}
                    className={cn(
                      "w-full bg-black/40 border rounded-2xl pl-10 pr-4 py-4 text-2xl font-black transition-all shadow-inner font-mono",
                      isDemoMode 
                        ? "border-amber-500/30 text-gray-500 cursor-not-allowed bg-black/60" 
                        : "border-white/10 text-white focus:outline-none focus:border-blue-500 placeholder:text-gray-700"
                    )}
                  />
                  {isDemoMode && (
                    <div 
                      onClick={triggerDemoBlockedToast}
                      className="absolute inset-0 cursor-not-allowed"
                      title="Demo funds cannot be withdrawn. Please switch to a real account."
                    />
                  )}
                </div>

                <div className="flex justify-between px-1 items-center">
                  <span className="text-[8px] text-gray-500 font-bold uppercase tracking-widest">Min: $50.00</span>
                  {isDemoMode ? (
                    <button 
                      type="button"
                      onClick={triggerDemoBlockedToast}
                      className="text-[8px] text-amber-500/80 font-black uppercase tracking-widest hover:text-amber-400 transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <Lock className="w-2.5 h-2.5" /> Max Real: $0.00
                    </button>
                  ) : (
                    <button 
                      type="button"
                      onClick={() => setAmount(currentAvailableReal.toString())}
                      className="text-[8px] text-blue-500 font-black uppercase tracking-widest hover:text-blue-400 transition-colors cursor-pointer"
                    >
                      Max Capacity (${currentAvailableReal.toFixed(2)})
                    </button>
                  )}
                </div>
              </div>

              {/* Settlement Method Selector */}
              <div className="space-y-3">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block px-1">Settlement Method</label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: 'upi', label: 'UPI' },
                    { id: 'bank', label: 'Bank' },
                    { id: 'crypto', label: 'Crypto' }
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setMethod(m.id as any)}
                      className={cn(
                        "py-3 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer",
                        method === m.id 
                          ? "bg-blue-600/10 border-blue-500 text-blue-400 shadow-[0_0_15px_rgba(37,99,235,0.2)]" 
                          : "bg-white/5 border-white/5 text-gray-500 hover:border-white/10"
                      )}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Crypto Details */}
              {method === 'crypto' && (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block px-1">Crypto Network</label>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { id: 'USDT_TRC20', label: 'USDT (TRC20)' },
                        { id: 'USDT_ERC20', label: 'USDT (ERC20)' },
                        { id: 'BTC', label: 'Bitcoin' },
                      ].map((net) => (
                        <button
                          key={net.id}
                          type="button"
                          onClick={() => setCryptoNetwork(net.id)}
                          className={cn(
                            "py-2.5 rounded-xl border text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer",
                            cryptoNetwork === net.id 
                              ? "bg-emerald-600/10 border-emerald-500 text-emerald-400" 
                              : "bg-white/5 border-white/5 text-gray-400 hover:border-white/10 hover:text-gray-300"
                          )}
                        >
                          {net.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block px-1">Wallet Address</label>
                    <input 
                      type="text" 
                      placeholder={`Enter your ${cryptoNetwork.split('_')[0]} destination address`}
                      value={destinationAddress}
                      onChange={(e) => setDestinationAddress(e.target.value)}
                      disabled={isDemoMode}
                      className={cn(
                        "w-full bg-black/40 border rounded-2xl px-4 py-4 text-sm font-medium transition-all shadow-inner font-mono",
                        isDemoMode 
                          ? "border-white/5 text-gray-600 cursor-not-allowed" 
                          : "border-white/10 text-white focus:outline-none focus:border-blue-500 placeholder:text-gray-700"
                      )}
                    />
                  </div>
                </div>
              )}

              {/* Fiat (UPI/Bank) Details */}
              {method !== 'crypto' && (
                <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block px-1">
                    {method === 'upi' ? 'UPI ID' : 'Bank Account Details'}
                  </label>
                  <input 
                    type="text" 
                    placeholder={method === 'upi' ? "e.g. username@upi" : "Account Number, IFSC Code, Holder Name"}
                    value={destinationAddress}
                    onChange={(e) => setDestinationAddress(e.target.value)}
                    disabled={isDemoMode}
                    className={cn(
                      "w-full bg-black/40 border rounded-2xl px-4 py-4 text-sm font-medium transition-all shadow-inner font-mono",
                      isDemoMode 
                        ? "border-white/5 text-gray-600 cursor-not-allowed" 
                        : "border-white/10 text-white focus:outline-none focus:border-blue-500 placeholder:text-gray-700"
                    )}
                  />
                </div>
              )}

              {/* Submit Button with UI Lock Indicator */}
              {isDemoMode ? (
                <div className="space-y-2">
                  <button 
                    type="button"
                    onClick={triggerDemoBlockedToast}
                    className="w-full py-5 rounded-[24px] font-black uppercase tracking-[0.2em] text-xs transition-all flex items-center justify-center gap-3 bg-amber-500/10 border border-amber-500/30 text-amber-400/80 cursor-not-allowed shadow-[0_0_20px_rgba(245,158,11,0.1)] active:scale-98"
                    title="Demo funds cannot be withdrawn. Please switch to a real account."
                  >
                    <Lock className="w-4 h-4 text-amber-400" />
                    <span>Demo Funds Non-Withdrawable (Locked)</span>
                  </button>

                  {onSwitchToReal && (
                    <button
                      type="button"
                      onClick={onSwitchToReal}
                      className="w-full py-3 rounded-xl font-black uppercase tracking-wider text-[10px] bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-400 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                    >
                      <Unlock className="w-3.5 h-3.5" />
                      <span>Switch to Real Account to Withdraw</span>
                    </button>
                  )}
                </div>
              ) : (
                <button 
                  type="submit"
                  disabled={
                    isSubmitting || 
                    !amount || 
                    parseFloat(amount) <= 0 || 
                    parseFloat(amount) > currentAvailableReal || 
                    !destinationAddress.trim() ||
                    currentAvailableReal <= 0
                  }
                  className={cn(
                    "w-full py-5 rounded-[24px] font-black uppercase tracking-[0.2em] text-xs transition-all flex items-center justify-center gap-3 cursor-pointer",
                    isSubmitting || !amount || parseFloat(amount) <= 0 || parseFloat(amount) > currentAvailableReal || !destinationAddress.trim() || currentAvailableReal <= 0
                      ? "bg-gray-800 text-gray-600 cursor-not-allowed border border-white/5"
                      : "bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_30px_rgba(37,99,235,0.4)] active:scale-95"
                  )}
                >
                  {isSubmitting ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <span>Initiate Extraction</span>
                      <ArrowUpCircle className="w-4 h-4" />
                    </>
                  )}
                </button>
              )}
            </form>
          </div>
        </div>

        {/* Security & Verification Card */}
        <div className="bg-blue-500/5 border border-blue-500/10 rounded-2xl p-6 flex items-start gap-4">
          <AlertCircle className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-400">Security & Compliance Guard</h4>
            <p className="text-[9px] text-gray-400 font-medium leading-relaxed">
              All asset extractions require verified real funds and undergo manual compliance review within 24-48 hours. Practice demo balances carry zero cash value and are barred from withdrawal channels.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

