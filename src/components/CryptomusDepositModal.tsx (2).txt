import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  ShieldCheck, 
  ArrowRight, 
  Copy, 
  CheckCircle2, 
  ExternalLink, 
  QrCode as QrCodeIcon, 
  RefreshCw, 
  Zap, 
  Sparkles,
  Info,
  Clock,
  Wallet
} from 'lucide-react';
import QRCode from 'qrcode';
import confetti from 'canvas-confetti';
import { db, auth } from '../lib/firebase';
import { doc, getDoc, setDoc, addDoc, collection, Timestamp } from 'firebase/firestore';
import { soundManager } from '../lib/sound';
import { cn } from '../lib/utils';

export type CryptoCurrencyOption = 'USDT TRC20' | 'BTC' | 'ETH' | 'SOL';

interface CryptoDetail {
  id: CryptoCurrencyOption;
  name: string;
  symbol: string;
  network: string;
  color: string;
  badge?: string;
  iconBg: string;
  rateUSD: number;
}

const CRYPTO_OPTIONS: CryptoDetail[] = [
  {
    id: 'USDT TRC20',
    name: 'Tether USD',
    symbol: 'USDT',
    network: 'TRC-20 (Tron)',
    color: '#26A17B',
    badge: 'Recommended • Fast',
    iconBg: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    rateUSD: 1.0
  },
  {
    id: 'BTC',
    name: 'Bitcoin',
    symbol: 'BTC',
    network: 'Bitcoin Network',
    color: '#F7931A',
    badge: 'Gold Standard',
    iconBg: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    rateUSD: 88500.0
  },
  {
    id: 'ETH',
    name: 'Ethereum',
    symbol: 'ETH',
    network: 'ERC-20 (Ethereum)',
    color: '#627EEA',
    badge: 'Smart Capital',
    iconBg: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
    rateUSD: 2250.0
  },
  {
    id: 'SOL',
    name: 'Solana',
    symbol: 'SOL',
    network: 'Solana Network',
    color: '#14F195',
    badge: 'Ultra Low Gas',
    iconBg: 'bg-teal-500/20 text-teal-400 border-teal-500/30',
    rateUSD: 135.0
  }
];

const PRESET_AMOUNTS = [25, 50, 100, 250, 500, 1000, 2500];

interface CryptomusDepositModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  onDepositSuccess: (amountUSD: number) => void;
}

interface InvoiceData {
  uuid: string;
  order_id: string;
  amount: string;
  payment_amount: string;
  payer_currency: string;
  currency: string;
  network: string;
  address: string;
  url: string;
  expired_at: number;
  status: string;
  is_simulated?: boolean;
}

export const CryptomusDepositModal: React.FC<CryptomusDepositModalProps> = ({
  isOpen,
  onClose,
  user,
  onDepositSuccess
}) => {
  const [selectedCrypto, setSelectedCrypto] = useState<CryptoCurrencyOption>('USDT TRC20');
  const [amountUSD, setAmountUSD] = useState<number>(100);
  const [customUSD, setCustomUSD] = useState<string>('');
  
  const [step, setStep] = useState<'config' | 'invoice' | 'success'>('config');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  
  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [timeLeft, setTimeLeft] = useState<number>(3600);
  const [copiedAddress, setCopiedAddress] = useState<boolean>(false);
  const [copiedAmount, setCopiedAmount] = useState<boolean>(false);

  const [confirmedAmount, setConfirmedAmount] = useState<number>(0);
  const [newRealBalance, setNewRealBalance] = useState<number>(0);

  const effectiveUSD = customUSD ? Math.max(0, parseFloat(customUSD) || 0) : amountUSD;
  const currentCrypto = CRYPTO_OPTIONS.find(c => c.id === selectedCrypto) || CRYPTO_OPTIONS[0];
  const cryptoAmountEstimate = (effectiveUSD / currentCrypto.rateUSD).toFixed(
    selectedCrypto === 'BTC' ? 6 : (selectedCrypto === 'ETH' ? 4 : 2)
  );

  // Timer countdown for invoice
  useEffect(() => {
    if (step !== 'invoice' || !invoice) return;
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [step, invoice]);

  if (!isOpen) return null;

  const handleGenerateInvoice = async () => {
    if (effectiveUSD < 1) {
      setErrorMsg('Please enter an amount of at least $1.00 USD');
      return;
    }

    setErrorMsg('');
    setIsGenerating(true);

    try {
      const u = user || auth.currentUser;
      const uid = u?.uid || 'anonymous';
      const email = (u?.email || 'trader@swifttrade.com').toLowerCase();
      const displayName = u?.displayName || 'Active Trader';

      const resp = await fetch('/api/cryptomus/create-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: effectiveUSD,
          cryptoCurrency: selectedCrypto,
          userId: uid,
          userEmail: email,
          userName: displayName
        })
      });

      const data = await resp.json();

      if (!resp.ok || !data.success || !data.invoice) {
        throw new Error(data.message || 'Failed to generate Cryptomus invoice.');
      }

      const inv: InvoiceData = data.invoice;
      setInvoice(inv);

      // Generate QR Code for the deposit address or payment URL
      const qrData = inv.address || inv.url;
      try {
        if (typeof QRCode !== 'undefined') {
          const qrFn = (QRCode as any).toDataURL || ((QRCode as any).default && (QRCode as any).default.toDataURL);
          if (qrFn) {
            const qrUrl = await qrFn(qrData, {
              width: 280,
              margin: 1,
              color: {
                dark: '#000000',
                light: '#FFFFFF'
              }
            });
            setQrCodeDataUrl(qrUrl);
          } else {
            setQrCodeDataUrl(`https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(qrData)}&margin=1`);
          }
        } else {
          setQrCodeDataUrl(`https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(qrData)}&margin=1`);
        }
      } catch (qrErr) {
        console.warn('QR Code generation notice, using high-reliability fallback:', qrErr);
        setQrCodeDataUrl(`https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(qrData)}&margin=1`);
      }

      setTimeLeft(3600);
      setStep('invoice');
    } catch (err: any) {
      console.error('Invoice generation failed:', err);
      setErrorMsg(err.message || 'Payment gateway connection error. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleConfirmPayment = async (isSimulatedTest: boolean = false) => {
    if (!invoice) return;
    setIsChecking(true);
    setErrorMsg('');

    try {
      const u = user || auth.currentUser;
      const uid = u?.uid || 'anonymous';
      const email = (u?.email || 'trader@swifttrade.com').toLowerCase();
      const depositAmt = Number(invoice.amount) || effectiveUSD;

      // 1. Call verification endpoint
      const resp = await fetch('/api/cryptomus/verify-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uuid: invoice.uuid,
          orderId: invoice.order_id,
          simulate: isSimulatedTest
        })
      });

      const verifyData = await resp.json();
      if (!resp.ok || !verifyData.success) {
        throw new Error(verifyData.message || 'Payment verification pending.');
      }

      // 2. Persist Real Balance directly to Firestore database
      let targetUserRef: any = null;
      let currentReal = 0;
      let currentTotalDeposited = 0;

      if (uid && uid !== 'anonymous') {
        targetUserRef = doc(db, 'users', uid);
        const userSnap = await getDoc(targetUserRef);
        if (userSnap.exists()) {
          const uData = userSnap.data() as any;
          currentReal = Number(uData.realBalance) || 0;
          currentTotalDeposited = Number(uData.totalDepositedUSD) || 0;
        }
      } else if (email) {
        const docId = email.replace(/[^a-z0-9]/g, '_');
        targetUserRef = doc(db, 'users', docId);
      }

      const finalRealBalance = currentReal + depositAmt;

      if (targetUserRef) {
        await setDoc(targetUserRef, {
          realBalance: finalRealBalance,
          hasApprovedDeposit: true,
          totalDepositedUSD: currentTotalDeposited + depositAmt,
          updatedAt: Timestamp.now()
        }, { merge: true });
      }

      // 3. Record in deposits collection
      await addDoc(collection(db, 'deposits'), {
        userId: uid,
        userEmail: email,
        userName: u?.displayName || 'Active Trader',
        amountUSD: depositAmt,
        amountCrypto: Number(invoice.payment_amount),
        cryptoCurrency: selectedCrypto,
        paymentMethod: 'cryptomus',
        invoiceId: invoice.uuid,
        orderId: invoice.order_id,
        txAddress: invoice.address,
        status: 'APPROVED',
        createdAt: Timestamp.now()
      });

      // 4. Send Celebration Notification
      await addDoc(collection(db, 'notifications'), {
        userId: uid,
        userEmail: email,
        title: 'Cryptomus Deposit Confirmed! 🎉',
        message: `Your deposit of $${depositAmt.toFixed(2)} (${invoice.payment_amount} ${currentCrypto.symbol}) via Cryptomus Gateway has been credited to your Real Account!`,
        read: false,
        createdAt: Timestamp.now()
      });

      // 5. Celebration FX & State
      setConfirmedAmount(depositAmt);
      setNewRealBalance(finalRealBalance);
      setStep('success');
      soundManager.playWin();

      confetti({
        particleCount: 120,
        spread: 70,
        origin: { y: 0.6 }
      });

      // Update parent handler to switch to Real balance immediately
      onDepositSuccess(depositAmt);
    } catch (err: any) {
      console.error('Payment confirmation error:', err);
      setErrorMsg(err.message || 'Payment not yet confirmed on blockchain. Please try again.');
    } finally {
      setIsChecking(false);
    }
  };

  const handleCopy = (text: string, type: 'address' | 'amount') => {
    navigator.clipboard.writeText(text);
    if (type === 'address') {
      setCopiedAddress(true);
      setTimeout(() => setCopiedAddress(false), 2000);
    } else {
      setCopiedAmount(true);
      setTimeout(() => setCopiedAmount(false), 2000);
    }
  };

  const formatTimer = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainingSecs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-[#0E1217] border border-gray-800 rounded-3xl shadow-[0_20px_70px_rgba(0,0,0,0.9)] overflow-hidden my-auto">
        
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800/80 bg-gradient-to-r from-gray-900/80 to-black/60">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
              <Wallet className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-black tracking-wide text-white uppercase">Cryptomus Gateway</span>
                <span className="text-[9px] font-black uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                  Instant Credit
                </span>
              </div>
              <p className="text-[10px] text-gray-400 font-medium">Institutional Grade Crypto Settlement</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-800/80 hover:bg-gray-700 text-gray-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Real Balance Separation Guarantee Notice */}
        <div className="bg-blue-950/25 border-b border-blue-500/20 px-6 py-2.5 flex items-center justify-between text-[11px]">
          <div className="flex items-center space-x-2 text-blue-300">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Target: <strong className="text-white font-mono font-bold">Real Account (Vault)</strong></span>
          </div>
          <span className="text-[10px] text-gray-400 font-mono">
            Demo $10,000 Unaffected
          </span>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-6">

          {/* Error Banner */}
          {errorMsg && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-400 font-medium flex items-center space-x-2 animate-in fade-in">
              <Info className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* STEP 1: CONFIGURATION */}
          {step === 'config' && (
            <div className="space-y-6 animate-in fade-in">
              
              {/* Crypto Currency Selection */}
              <div className="space-y-2.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-gray-400 block px-0.5">
                  1. Select Settlement Cryptocurrency
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {CRYPTO_OPTIONS.map((crypto) => {
                    const isSelected = selectedCrypto === crypto.id;
                    return (
                      <button
                        key={crypto.id}
                        type="button"
                        onClick={() => setSelectedCrypto(crypto.id)}
                        className={cn(
                          "flex flex-col items-start p-3 rounded-2xl border transition-all text-left relative cursor-pointer group",
                          isSelected
                            ? "bg-blue-600/15 border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.25)] ring-1 ring-blue-500"
                            : "bg-gray-900/50 border-gray-800 hover:border-gray-700 hover:bg-gray-800/40"
                        )}
                      >
                        <div className="flex items-center justify-between w-full mb-2">
                          <span className={cn("text-xs font-black px-2 py-0.5 rounded-lg border", crypto.iconBg)}>
                            {crypto.symbol}
                          </span>
                          {isSelected && (
                            <div className="w-2 h-2 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.8)]" />
                          )}
                        </div>
                        <span className="text-xs font-bold text-white block">{crypto.id}</span>
                        <span className="text-[9px] text-gray-400 truncate w-full mt-0.5">{crypto.network}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Amount Selection */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black uppercase tracking-wider text-gray-400 block px-0.5">
                    2. Deposit Amount (USD $)
                  </label>
                  <span className="text-[10px] text-emerald-400 font-mono font-bold">
                    Est. {cryptoAmountEstimate} {currentCrypto.symbol}
                  </span>
                </div>

                {/* Preset Pills */}
                <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
                  {PRESET_AMOUNTS.map((amt) => {
                    const isChosen = amountUSD === amt && !customUSD;
                    return (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => { setAmountUSD(amt); setCustomUSD(''); }}
                        className={cn(
                          "py-2.5 px-1 rounded-xl text-xs font-black transition-all border text-center cursor-pointer",
                          isChosen
                            ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/60 shadow-[0_0_12px_rgba(16,185,129,0.3)]"
                            : "bg-gray-900/60 text-gray-400 border-gray-800 hover:text-white hover:bg-gray-800"
                        )}
                      >
                        ${amt}
                      </button>
                    );
                  })}
                </div>

                {/* Custom Amount Input */}
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">$</span>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    placeholder="Enter custom USD amount (Min $10)"
                    value={customUSD}
                    onChange={(e) => setCustomUSD(e.target.value)}
                    className="w-full bg-black/60 border border-gray-800 focus:border-blue-500 rounded-2xl pl-9 pr-24 py-3.5 text-sm font-semibold text-white placeholder:text-gray-600 focus:outline-none transition-all"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-gray-400">
                    USD
                  </div>
                </div>
              </div>

              {/* Summary Card */}
              <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-4 space-y-2.5">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">Fiat Equivalent:</span>
                  <span className="text-white font-mono font-bold">${effectiveUSD.toFixed(2)} USD</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">Estimated Crypto:</span>
                  <span className="text-emerald-400 font-mono font-bold">~{cryptoAmountEstimate} {currentCrypto.symbol}</span>
                </div>
                <div className="flex justify-between text-xs border-t border-gray-800/80 pt-2">
                  <span className="text-gray-400">Payment Engine:</span>
                  <span className="text-blue-400 font-bold">Cryptomus API Protocol</span>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="button"
                onClick={handleGenerateInvoice}
                disabled={isGenerating || effectiveUSD < 1}
                className={cn(
                  "w-full py-4 rounded-2xl font-black uppercase tracking-wider text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg",
                  isGenerating || effectiveUSD < 1
                    ? "bg-gray-800 text-gray-600 cursor-not-allowed"
                    : "bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_25px_rgba(37,99,235,0.4)] active:scale-98"
                )}
              >
                {isGenerating ? (
                  <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Generate Cryptomus Invoice</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          )}

          {/* STEP 2: INVOICE & PAYMENT */}
          {step === 'invoice' && invoice && (
            <div className="space-y-5 animate-in fade-in">
              {/* Invoice Status & Expiry */}
              <div className="flex items-center justify-between bg-gray-900/60 border border-gray-800 rounded-2xl p-3 px-4">
                <div className="flex items-center space-x-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
                  <span className="text-xs font-bold text-white uppercase tracking-wider">Awaiting Payment</span>
                </div>
                <div className="flex items-center space-x-1.5 text-xs text-amber-400 font-mono font-bold">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{formatTimer(timeLeft)}</span>
                </div>
              </div>

              {/* QR Code and Instructions */}
              <div className="flex flex-col sm:flex-row items-center gap-4 bg-black/40 border border-gray-800/80 rounded-2xl p-4">
                {qrCodeDataUrl ? (
                  <div className="bg-white p-2 rounded-2xl shrink-0 shadow-md">
                    <img 
                      src={qrCodeDataUrl} 
                      alt="Cryptomus Payment QR" 
                      className="w-32 h-32 object-contain"
                      onError={() => {
                        const qrData = invoice?.address || invoice?.url;
                        if (qrData) {
                          setQrCodeDataUrl(`https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(qrData)}&margin=1`);
                        }
                      }}
                    />
                  </div>
                ) : (
                  <div className="w-32 h-32 bg-gray-900 rounded-2xl flex items-center justify-center text-gray-600 shrink-0">
                    <QrCodeIcon className="w-10 h-10" />
                  </div>
                )}

                <div className="space-y-2 text-center sm:text-left flex-1 min-w-0">
                  <div className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                    Scan with any {currentCrypto.symbol} / {currentCrypto.network} Wallet
                  </div>
                  <div className="text-xl font-black text-white font-mono">
                    ${effectiveUSD.toFixed(2)} <span className="text-xs text-emerald-400">({invoice.payment_amount} {currentCrypto.symbol})</span>
                  </div>
                  <p className="text-[11px] text-gray-400 leading-relaxed">
                    Send exact amount to the generated Cryptomus address below. Real balance credits automatically upon network broadcast.
                  </p>
                </div>
              </div>

              {/* Deposit Address Box */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-gray-400 px-0.5">
                  Deposit Address ({currentCrypto.network})
                </label>
                <div className="flex items-center bg-black/60 border border-gray-800 rounded-xl p-2 px-3">
                  <span className="font-mono text-xs text-white truncate flex-1 select-all mr-2">
                    {invoice.address}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy(invoice.address, 'address')}
                    className="p-1.5 px-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white text-xs font-semibold flex items-center space-x-1 shrink-0 transition-colors cursor-pointer"
                  >
                    {copiedAddress ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedAddress ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>

              {/* Exact Amount Box */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-gray-400 px-0.5">
                  Exact Crypto Amount
                </label>
                <div className="flex items-center bg-black/60 border border-gray-800 rounded-xl p-2 px-3">
                  <span className="font-mono text-xs text-emerald-400 font-bold truncate flex-1 select-all mr-2">
                    {invoice.payment_amount} {currentCrypto.symbol}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy(invoice.payment_amount, 'amount')}
                    className="p-1.5 px-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white text-xs font-semibold flex items-center space-x-1 shrink-0 transition-colors cursor-pointer"
                  >
                    {copiedAmount ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedAmount ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-2">
                {/* Cryptomus Hosted URL Link */}
                {invoice.url && (
                  <a
                    href={invoice.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-3 rounded-xl bg-gray-800/80 hover:bg-gray-700 border border-gray-700/80 text-white text-xs font-bold flex items-center justify-center space-x-2 transition-all cursor-pointer"
                  >
                    <span>Open Official Cryptomus Payment Page</span>
                    <ExternalLink className="w-3.5 h-3.5 text-blue-400" />
                  </a>
                )}

                {/* Confirm / Check Status */}
                <button
                  type="button"
                  onClick={() => handleConfirmPayment(false)}
                  disabled={isChecking}
                  className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center space-x-2 shadow-[0_0_25px_rgba(16,185,129,0.3)] active:scale-98 cursor-pointer"
                >
                  {isChecking ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4" />
                      <span>Verify & Confirm Blockchain Deposit</span>
                    </>
                  )}
                </button>

                {/* Instant Dev / Sandbox Approval Button */}
                <button
                  type="button"
                  onClick={() => handleConfirmPayment(true)}
                  disabled={isChecking}
                  className="w-full py-2.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 text-purple-300 text-[10px] font-bold flex items-center justify-center space-x-1.5 transition-all cursor-pointer"
                >
                  <Zap className="w-3.5 h-3.5 text-purple-400" />
                  <span>Instant Dev/Sandbox Approval (Test Credit +${effectiveUSD})</span>
                </button>
              </div>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setStep('config')}
                  className="text-xs text-gray-500 hover:text-gray-300 transition-colors cursor-pointer underline"
                >
                  Change amount or cryptocurrency
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: SUCCESS CELEBRATION */}
          {step === 'success' && (
            <div className="py-6 text-center space-y-6 animate-in zoom-in-95 duration-300">
              <div className="w-20 h-20 bg-emerald-500/20 border-2 border-emerald-500/50 rounded-full flex items-center justify-center mx-auto shadow-[0_0_40px_rgba(16,185,129,0.4)]">
                <CheckCircle2 className="w-10 h-10 text-emerald-400" />
              </div>

              <div className="space-y-1.5">
                <h3 className="text-2xl font-black uppercase tracking-tight text-white italic">
                  Deposit Successful!
                </h3>
                <p className="text-xs text-gray-400 font-medium">
                  Cryptomus payment verified & settled on blockchain.
                </p>
              </div>

              {/* Amount Credited Card */}
              <div className="bg-emerald-950/25 border border-emerald-500/30 rounded-2xl p-5 space-y-3">
                <div className="text-[10px] font-black uppercase tracking-widest text-emerald-400">
                  Real Account Balance Updated
                </div>
                <div className="text-3xl font-black font-mono text-white">
                  +${confirmedAmount.toFixed(2)} <span className="text-xs font-normal text-emerald-400 font-sans">USD</span>
                </div>
                <div className="text-xs text-gray-300 font-mono pt-2 border-t border-emerald-500/20 flex justify-between">
                  <span>New Real Balance:</span>
                  <strong className="text-emerald-400">${newRealBalance.toFixed(2)}</strong>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  setStep('config');
                }}
                className="w-full py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase tracking-wider transition-all shadow-[0_0_30px_rgba(16,185,129,0.4)] active:scale-98 cursor-pointer"
              >
                Trade Now with Real Balance
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
