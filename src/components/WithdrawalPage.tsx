import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Wallet, ArrowUpCircle, ShieldCheck, AlertCircle, RefreshCw } from 'lucide-react';
import { cn } from '../lib/utils';
import { db, auth } from '../lib/firebase';
import { collection, addDoc, doc, updateDoc } from 'firebase/firestore';

interface WithdrawalPageProps {
  balance: number;
  onBackToTrade: () => void;
}

export const WithdrawalPage: React.FC<WithdrawalPageProps> = ({ balance, onBackToTrade }) => {
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<'upi' | 'bank' | 'crypto'>('crypto');
  const [destinationAddress, setDestinationAddress] = useState('');
  const [cryptoNetwork, setCryptoNetwork] = useState('USDT_TRC20');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0 || parseFloat(amount) > balance) return;
    if (method === 'crypto' && !destinationAddress.trim()) return;
    if (method !== 'crypto' && !destinationAddress.trim()) return;

    setIsSubmitting(true);
    try {
      const parsedAmount = parseFloat(amount);
      const userRef = doc(db, 'users', auth.currentUser!.uid);

      await addDoc(collection(db, 'withdrawals'), {
        userId: auth.currentUser?.uid,
        userEmail: auth.currentUser?.email,
        amount: parsedAmount,
        method: method === 'crypto' ? `Crypto (${cryptoNetwork})` : method,
        details: destinationAddress,
        status: 'PENDING',
        createdAt: new Date(),
      });

      // Deduct balance from user
      await updateDoc(userRef, {
        realBalance: balance - parsedAmount,
        updatedAt: new Date()
      });

      setStatus('success');
    } catch (error) {
      console.error('Withdrawal error:', error);
      setStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (status === 'success') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-6 animate-in zoom-in duration-500">
        <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center border border-green-500/30">
          <ShieldCheck className="w-10 h-10 text-green-400" />
        </div>
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-black tracking-tighter uppercase italic text-white">Request Transmitted</h2>
          <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">Your withdrawal signal is now in the settlement pipeline.</p>
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
      <div className="max-w-md mx-auto w-full space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <header className="space-y-2">
          <div className="flex items-center gap-3 text-blue-400">
            <ArrowUpCircle className="w-8 h-8" />
            <h1 className="text-3xl font-black tracking-tighter uppercase italic">Asset Extraction</h1>
          </div>
          <p className="text-[10px] text-gray-500 font-black uppercase tracking-[0.3em]">Withdrawal Protocol V2.4</p>
        </header>

        <div className="bg-gray-900/40 border border-white/10 rounded-[32px] p-6 sm:p-8 space-y-8 backdrop-blur-md relative overflow-hidden">
          {/* Decorative glow */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/10 blur-[60px] rounded-full" />
          
          <div className="space-y-4">
            <div className="p-4 bg-white/5 rounded-2xl border border-white/5 flex justify-between items-center">
              <div className="space-y-1">
                <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Available Liquidity</span>
                <div className="text-2xl font-black text-white italic">${balance.toLocaleString()}</div>
              </div>
              <Wallet className="w-8 h-8 text-blue-500/50" />
            </div>

            <form onSubmit={handleWithdraw} className="space-y-6">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block px-1">Extraction Amount</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-blue-400">$</span>
                  <input 
                    type="number" 
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-2xl pl-10 pr-4 py-5 text-2xl font-black text-white focus:outline-none focus:border-blue-500 transition-all shadow-inner placeholder:text-gray-800"
                  />
                </div>
                <div className="flex justify-between px-1">
                  <span className="text-[8px] text-gray-600 font-bold uppercase tracking-widest">Min: $50.00</span>
                  <button 
                    type="button"
                    onClick={() => setAmount(balance.toString())}
                    className="text-[8px] text-blue-500 font-black uppercase tracking-widest hover:text-blue-400 transition-colors"
                  >
                    Max Capacity
                  </button>
                </div>
              </div>

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
                        "py-3 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all",
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
                            "py-2.5 rounded-xl border text-[10px] font-bold uppercase tracking-wider transition-all",
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
                      className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-4 text-sm font-medium text-white focus:outline-none focus:border-blue-500 transition-all shadow-inner placeholder:text-gray-700"
                    />
                  </div>
                </div>
              )}

              {method !== 'crypto' && (
                <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block px-1">
                    {method === 'upi' ? 'UPI ID' : 'Bank Account Details'}
                  </label>
                  <input 
                    type="text" 
                    placeholder={method === 'upi' ? "e.g. username@upi" : "Account Number, IFSC Code"}
                    value={destinationAddress}
                    onChange={(e) => setDestinationAddress(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-4 text-sm font-medium text-white focus:outline-none focus:border-blue-500 transition-all shadow-inner placeholder:text-gray-700"
                  />
                </div>
              )}

              <button 
                type="submit"
                disabled={isSubmitting || !amount || parseFloat(amount) <= 0 || parseFloat(amount) > balance || !destinationAddress.trim()}
                className={cn(
                  "w-full py-5 rounded-[24px] font-black uppercase tracking-[0.2em] text-xs transition-all flex items-center justify-center gap-3",
                  isSubmitting || !amount || parseFloat(amount) <= 0 || parseFloat(amount) > balance || !destinationAddress.trim()
                    ? "bg-gray-800 text-gray-600 cursor-not-allowed"
                    : "bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_30px_rgba(37,99,235,0.4)] active:scale-95"
                )}
              >
                {isSubmitting ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    Initiate Extraction
                    <ArrowUpCircle className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        <div className="bg-blue-500/5 border border-blue-500/10 rounded-2xl p-6 flex items-start gap-4">
          <AlertCircle className="w-5 h-5 text-blue-500 shrink-0" />
          <div className="space-y-1">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-400">Security Note</h4>
            <p className="text-[9px] text-gray-500 font-bold leading-relaxed">All extractions undergo manual verification within 24-48 hours. Ensure your payout destination is verified.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
