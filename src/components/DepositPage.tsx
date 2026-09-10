import React, { useState } from 'react';
import { QrCode, CreditCard, Building2, CheckCircle, Copy, AlertCircle, ArrowRight, ShieldCheck, Wallet, ArrowDownCircle } from 'lucide-react';
import { cn } from '../lib/utils';
import { useConfig } from '../hooks/useConfig';
import { addDoc, collection, Timestamp } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';

interface DepositPageProps {
  onBackToTrade: () => void;
  onDepositSuccess?: (amountUSD: number) => void;
}

export const DepositPage: React.FC<DepositPageProps> = ({ onBackToTrade, onDepositSuccess }) => {
  const config = useConfig();
  const [selectedMethod, setSelectedMethod] = useState<'upi' | 'card' | 'bank'>('upi');
  const [selectedUSD, setSelectedUSD] = useState<number>(50);
  const [customUSD, setCustomUSD] = useState<string>('');
  const [utrNumber, setUtrNumber] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const quickUSD = [10, 25, 50, 100, 250, 500, 1000];
  const activeUSD = customUSD ? parseFloat(customUSD) || 0 : selectedUSD;
  // Convert USD to INR (1 USD = 85 INR)
  const equivalentINR = Math.round(activeUSD * 85);

  const upiId = "swifttrade.pay@upi";

  const handleCopyUPI = () => {
    navigator.clipboard.writeText(upiId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmitDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (activeUSD < 1) return;

    setIsSubmitting(true);
    try {
      const currentUser = auth.currentUser;
      await addDoc(collection(db, 'deposits'), {
        userId: currentUser?.uid || 'anonymous',
        userEmail: currentUser?.email || 'unregistered@swifttrade.com',
        userName: currentUser?.displayName || 'Active Trader',
        amountUSD: activeUSD,
        amountINR: equivalentINR,
        paymentMethod: selectedMethod,
        utrNumber: utrNumber || 'AUTOMATIC',
        status: 'PENDING',
        createdAt: Timestamp.now()
      });

      setStatus('success');
      if (onDepositSuccess) {
        onDepositSuccess(activeUSD);
      }
    } catch (err) {
      console.error("Failed to store deposit request:", err);
      setStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (status === 'success') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-6 animate-in zoom-in duration-500 bg-[#0B0E11]">
        <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center border border-green-500/30">
          <ShieldCheck className="w-10 h-10 text-green-400" />
        </div>
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-black tracking-tighter uppercase italic text-white">Deposit Initiated</h2>
          <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">
            Your deposit of <span className="text-green-400">${activeUSD}</span> is being processed.
          </p>
        </div>
        <div className="bg-gray-900/80 p-4 rounded-xl border border-gray-800 text-left text-xs space-y-2 text-gray-300 min-w-[280px]">
          <div className="flex justify-between">
            <span className="text-gray-400">Transaction Ref / UTR:</span>
            <span className="font-mono text-white font-bold">{utrNumber || 'AUTOMATIC'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Status:</span>
            <span className="text-emerald-400 font-bold uppercase">Pending Verification</span>
          </div>
        </div>
        <button 
          onClick={onBackToTrade}
          className="px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-[0_0_20px_rgba(37,99,235,0.4)]"
        >
          Return to Trade Flux
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col p-4 sm:p-8 space-y-8 overflow-y-auto bg-[#0B0E11]">
      <div className="max-w-xl mx-auto w-full space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <header className="space-y-2 text-center sm:text-left">
          <div className="flex items-center justify-center sm:justify-start gap-3 text-emerald-400">
            <ArrowDownCircle className="w-8 h-8" />
            <h1 className="text-3xl font-black tracking-tighter uppercase italic">Deposit Funds</h1>
          </div>
          <p className="text-[10px] text-gray-500 font-black uppercase tracking-[0.3em]">Capital Injection Protocol V2.4</p>
        </header>

        <form onSubmit={handleSubmitDeposit} className="bg-gray-900/40 border border-white/10 rounded-[32px] p-6 sm:p-8 space-y-8 backdrop-blur-md relative overflow-hidden">
          {/* Decorative glow */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-600/10 blur-[60px] rounded-full" />

          {/* Step 1: Select Amount */}
          <div className="space-y-4">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block px-1">
              1. Select Deposit Amount (USD $)
            </label>
            <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
              {quickUSD.map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => { setSelectedUSD(amt); setCustomUSD(''); }}
                  className={cn(
                    "py-3 px-1 rounded-xl text-xs font-black transition-all border cursor-pointer text-center",
                    selectedUSD === amt && !customUSD
                      ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.2)]"
                      : "bg-black/40 text-gray-400 border-white/5 hover:bg-white/5 hover:text-white"
                  )}
                >
                  ${amt}
                </button>
              ))}
            </div>

            <div className="flex items-center space-x-3">
              <span className="text-gray-500 font-bold text-xs uppercase tracking-wider">Or</span>
              <input
                type="number"
                placeholder="Enter custom USD"
                value={customUSD}
                onChange={(e) => setCustomUSD(e.target.value)}
                className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm font-medium text-white focus:outline-none focus:border-emerald-500/50 transition-all placeholder:text-gray-600"
              />
            </div>
            
            {activeUSD > 0 && (
              <div className="p-4 bg-emerald-900/20 rounded-xl border border-emerald-500/20 flex items-center justify-between animate-in fade-in">
                <span className="text-gray-400 text-xs font-bold uppercase tracking-wider">Equivalent (INR)</span>
                <span className="text-xl font-black text-emerald-400">₹{equivalentINR.toLocaleString()}</span>
              </div>
            )}
          </div>

          {/* Step 2: Payment Method */}
          <div className="space-y-4">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block px-1">
              2. Payment Method
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'upi', icon: QrCode, label: 'UPI / QR' },
                { id: 'card', icon: CreditCard, label: 'Credit Card' },
                { id: 'bank', icon: Building2, label: 'Bank Transfer' },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setSelectedMethod(m.id as any)}
                  className={cn(
                    "flex flex-col items-center justify-center p-4 rounded-xl border transition-all gap-2",
                    selectedMethod === m.id
                      ? "bg-emerald-500/10 border-emerald-500/50 text-emerald-400"
                      : "bg-black/40 border-white/5 text-gray-400 hover:bg-white/5"
                  )}
                >
                  <m.icon className="w-6 h-6 mb-1" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-center leading-tight">
                    {m.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Step 3: Instructions & Verification */}
          <div className="space-y-4 pt-4 border-t border-white/5">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block px-1">
              3. Complete Transaction
            </label>

            {selectedMethod === 'upi' ? (
              <div className="space-y-4">
                <div className="p-4 bg-black/40 rounded-xl border border-white/5 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-400">Official UPI ID:</span>
                    <button 
                      type="button"
                      onClick={handleCopyUPI}
                      className="flex items-center space-x-1.5 text-blue-400 hover:text-blue-300 bg-blue-500/10 px-2 py-1 rounded transition"
                    >
                      {copied ? <CheckCircle className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span className="text-xs font-bold">{copied ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                  <div className="text-lg font-black text-white text-center font-mono py-2 bg-gray-900 rounded-lg">
                    {upiId}
                  </div>
                  <p className="text-[10px] text-gray-500 text-center uppercase font-bold tracking-wider">
                    Please transfer exactly ₹{equivalentINR.toLocaleString()} to the UPI ID above.
                  </p>
                </div>
                
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block px-1">
                    Enter UTR / Reference Number
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 123456789012"
                    value={utrNumber}
                    onChange={(e) => setUtrNumber(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm font-medium text-white focus:outline-none focus:border-emerald-500/50 transition-all placeholder:text-gray-600"
                  />
                  <p className="text-[10px] text-amber-500/70 font-medium px-1 flex items-center gap-1 mt-1">
                    <AlertCircle className="w-3 h-3" />
                    Required for UPI verification
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-6 text-center space-y-3 bg-black/40 border border-white/5 rounded-xl">
                <AlertCircle className="w-8 h-8 text-amber-500 mx-auto opacity-80" />
                <h4 className="text-sm font-bold text-white">Method Temporarily Unavailable</h4>
                <p className="text-xs text-gray-500 leading-relaxed max-w-sm mx-auto">
                  Direct card and bank transfers are currently undergoing maintenance. Please use UPI for immediate processing.
                </p>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting || activeUSD < 1 || (selectedMethod === 'upi' && !utrNumber.trim()) || selectedMethod !== 'upi'}
            className={cn(
              "w-full py-5 rounded-[24px] font-black uppercase tracking-[0.2em] text-xs transition-all flex items-center justify-center gap-3 mt-4",
              isSubmitting || activeUSD < 1 || (selectedMethod === 'upi' && !utrNumber.trim()) || selectedMethod !== 'upi'
                ? "bg-gray-800 text-gray-600 cursor-not-allowed"
                : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_0_30px_rgba(16,185,129,0.4)] active:scale-95"
            )}
          >
            {isSubmitting ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <ShieldCheck className="w-5 h-5" />
                <span>Confirm Deposit of ${activeUSD}</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
