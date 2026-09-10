import React, { useState, useEffect } from 'react';
import { LogIn, Globe, Mail, Lock, Loader2, AlertCircle, User, Phone, CheckCircle2, ArrowLeft, RefreshCw, KeyRound } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useConfig } from '../hooks/useConfig';
import { renderBrandName, TradingHeroLogo } from './BrandLogo';
import { auth, db } from '../lib/firebase';
import { sendWelcomeEmail } from '../lib/emailService';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, Timestamp } from 'firebase/firestore';

interface LoginPageProps {
  onLogin: () => void;
  onEmailLogin?: (email: string, pass: string) => Promise<void>;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const config = useConfig();
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [step, setStep] = useState<'form' | 'otp'>('form');

  // Form Fields
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');

  // Status & Feedback
  const [isLoading, setIsLoading] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [resendCountdown, setResendCountdown] = useState<number>(0);

  // Resend Timer Countdown
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (resendCountdown > 0) {
      timer = setTimeout(() => setResendCountdown(resendCountdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resendCountdown]);

  // Request OTP via /send-otp endpoint
  const sendOtpEmail = async (targetEmail: string) => {
    setIsSendingOtp(true);
    setError(null);
    try {
      const response = await fetch('/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: targetEmail })
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to send OTP email.');
      }

      setSuccessMessage(`A 6-digit code has been sent to ${targetEmail}`);
      setResendCountdown(60);
      return true;
    } catch (err: any) {
      setError(err.message || 'Error connecting to OTP server.');
      return false;
    } finally {
      setIsSendingOtp(false);
    }
  };

  // Verify OTP via /verify-otp endpoint
  const verifyOtpCode = async (targetEmail: string, code: string) => {
    try {
      const response = await fetch('/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: targetEmail, otp: code })
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Invalid or expired OTP code.');
      }
      return true;
    } catch (err: any) {
      throw err;
    }
  };

  // Main Form Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      if (isLoginMode) {
        // Direct Sign In
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        // Sign Up with OTP flow
        if (password.length < 6) {
          throw new Error('Password must be at least 6 characters long.');
        }

        const sent = await sendOtpEmail(email);
        if (sent) {
          setStep('otp');
        }
      }
    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') {
        setError('An account with this email already exists. Please sign in.');
      } else if (err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
        setError('Invalid email or password.');
      } else {
        setError(err.message || 'Authentication failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Verify OTP and complete account creation
  const handleVerifyAndRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length < 6) {
      setError('Please enter the complete 6-digit OTP.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // 1. Verify OTP with Express backend
      await verifyOtpCode(email, otp);

      // 2. Create Firebase Auth account
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // 3. Save profile to Firestore 'users' collection
      const cleanEmail = email.trim().toLowerCase();
      const cleanName = name.trim() || cleanEmail.split('@')[0];

      await setDoc(doc(db, 'users', user.uid), {
        name: cleanName,
        mobile: mobile.trim(),
        email: cleanEmail,
        isEmailVerified: true,
        createdAt: Timestamp.now(),
        demoBalance: 10000,
        realBalance: 0,
        activeAsset: 'EUR/USD'
      }, { merge: true });

      // 4. Send Welcome Email via EmailJS
      sendWelcomeEmail(cleanName, cleanEmail);

      setSuccessMessage('Account created and verified successfully!');
    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') {
        setError('Account was verified, but this email is already registered. Please Sign In.');
      } else {
        setError(err.message || 'Verification failed. Please check the OTP and try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Google Sign-In with Error Interception
  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await onLogin();
    } catch (err: any) {
      if (err.code === 'auth/network-request-failed') {
        setError('Network request failed. Please check your internet connection or disable ad-blockers and try again.');
      } else if (err.code === 'auth/popup-closed-by-user') {
        setError('Google Sign-In popup was closed before completing login.');
      } else if (err.code === 'auth/popup-blocked') {
        setError('Sign-In popup was blocked by your browser. Please allow popups for this site.');
      } else if (err.code === 'auth/unauthorized-domain') {
        setError('This domain is not authorized in Firebase Auth settings.');
      } else if (err.code === 'auth/missing-initial-state' || (err.message && err.message.includes('missing initial state'))) {
        setError('Browser security blocked Google Sign-In inside this preview window. Please use Email/Password below, or click the "Open App in New Tab" (↗) icon at the top right of this screen to use Google Sign-In.');
      } else {
        setError(err.message || 'Google Sign-In failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#0B0E11] text-white p-6 relative overflow-y-auto">
      {/* Background Decorative Elements */}
      <div className="absolute inset-0 pointer-events-none fixed">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-600/10 rounded-full blur-[120px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-10" />
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="z-10 w-full max-w-md bg-[#0F1419]/85 border border-white/10 rounded-[32px] p-8 shadow-2xl backdrop-blur-xl text-center my-8"
      >
        <div className="mb-6">
          <TradingHeroLogo name={config.platformName} />
        </div>
        <p className="text-gray-400 text-xs mb-6 font-bold uppercase tracking-[0.2em]">
          {step === 'otp' 
            ? 'Email OTP Verification' 
            : isLoginMode 
              ? 'Sign in to continue' 
              : 'Create verified account'}
        </p>

        {/* OTP Verification Step */}
        {step === 'otp' ? (
          <motion.form 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            onSubmit={handleVerifyAndRegister} 
            className="space-y-4 text-left mb-6"
          >
            <div className="p-4 bg-blue-950/40 border border-blue-500/20 rounded-2xl flex items-start space-x-3">
              <Mail className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
              <div className="text-xs text-gray-300">
                A 6-digit OTP verification code has been dispatched via Brevo SMTP to <strong className="text-cyan-300">{email}</strong>.
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Enter 6-Digit OTP</label>
              <div className="relative">
                <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input 
                  type="text"
                  maxLength={6}
                  required
                  placeholder="000000"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  className="w-full bg-black/50 border border-cyan-500/30 rounded-2xl pl-12 pr-4 py-4 text-center font-mono text-2xl tracking-[0.4em] font-black text-cyan-300 focus:outline-none focus:border-cyan-400 transition-all placeholder:text-gray-700"
                />
              </div>
            </div>

            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center space-x-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-[10px] font-bold uppercase tracking-wider"
              >
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </motion.div>
            )}

            {successMessage && !error && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center space-x-2 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-[10px] font-bold uppercase tracking-wider"
              >
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{successMessage}</span>
              </motion.div>
            )}

            <button
              type="submit"
              disabled={isLoading || otp.length < 6}
              className="w-full flex items-center justify-center space-x-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 disabled:opacity-50 text-white px-6 py-4 rounded-[20px] font-black text-sm transition-all shadow-[0_0_25px_rgba(34,211,238,0.25)] active:scale-95 mt-2"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
              <span>{isLoading ? 'Verifying OTP...' : 'Verify & Create Account'}</span>
            </button>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => {
                  setStep('form');
                  setError(null);
                  setSuccessMessage(null);
                }}
                className="inline-flex items-center space-x-1.5 text-[11px] font-bold text-gray-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Change Email</span>
              </button>

              <button
                type="button"
                disabled={resendCountdown > 0 || isSendingOtp}
                onClick={() => sendOtpEmail(email)}
                className="inline-flex items-center space-x-1.5 text-[11px] font-bold text-cyan-400 hover:text-cyan-300 disabled:text-gray-600 transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSendingOtp ? 'animate-spin' : ''}`} />
                <span>{resendCountdown > 0 ? `Resend in ${resendCountdown}s` : 'Resend Code'}</span>
              </button>
            </div>
          </motion.form>
        ) : (
          /* Standard Login & Registration Form */
          <form onSubmit={handleSubmit} className="space-y-4 text-left mb-6">
            <AnimatePresence mode="popLayout">
              {!isLoginMode && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-4"
                >
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">Full Name</label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                      <input 
                        type="text"
                        required={!isLoginMode}
                        placeholder="Enter your name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-sm font-bold focus:outline-none focus:border-blue-500 transition-all placeholder:text-gray-700"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">Mobile Number</label>
                    <div className="relative">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                      <input 
                        type="tel"
                        required={!isLoginMode}
                        placeholder="Enter mobile number"
                        value={mobile}
                        onChange={(e) => setMobile(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-sm font-bold focus:outline-none focus:border-blue-500 transition-all placeholder:text-gray-700"
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input 
                    type="email"
                    required
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-sm font-bold focus:outline-none focus:border-blue-500 transition-all placeholder:text-gray-700"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input 
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-sm font-bold focus:outline-none focus:border-blue-500 transition-all placeholder:text-gray-700"
                  />
                </div>
              </div>
            </div>

            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center space-x-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-[10px] font-bold uppercase tracking-wider"
              >
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </motion.div>
            )}

            <button
              type="submit"
              disabled={isLoading || isSendingOtp}
              className="w-full flex items-center justify-center space-x-3 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 text-white px-6 py-4 rounded-[20px] font-black text-sm transition-all shadow-[0_0_20px_rgba(37,99,235,0.3)] active:scale-95 mt-2"
            >
              {isLoading || isSendingOtp ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <LogIn className="w-5 h-5" />
              )}
              <span>
                {isLoading || isSendingOtp 
                  ? 'Processing...' 
                  : isLoginMode 
                    ? 'Sign In' 
                    : 'Send OTP & Register'}
              </span>
            </button>
            
            <div className="text-center mt-4">
              <button
                type="button"
                onClick={() => {
                  setIsLoginMode(!isLoginMode);
                  setError(null);
                  setSuccessMessage(null);
                }}
                className="text-[11px] font-bold text-gray-400 hover:text-white transition-colors"
              >
                {isLoginMode ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}
              </button>
            </div>
          </form>
        )}

        {/* Google Login Button beneath */}
        <div className="relative flex items-center py-2 mb-6">
          <div className="flex-grow border-t border-white/10"></div>
          <span className="flex-shrink-0 mx-4 text-gray-500 text-[10px] font-bold uppercase tracking-widest">Or</span>
          <div className="flex-grow border-t border-white/10"></div>
        </div>

        <button
          onClick={handleGoogleSignIn}
          disabled={isLoading}
          className="w-full flex items-center justify-center space-x-3 bg-white hover:bg-gray-100 disabled:opacity-50 text-gray-900 px-6 py-4 rounded-[20px] font-black text-sm transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)] active:scale-95 group cursor-pointer"
        >
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin text-gray-900" />
          ) : (
            <img 
              src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" 
              alt="Google" 
              className="w-5 h-5"
            />
          )}
          <span>{isLoading ? 'Connecting to Google...' : 'Sign in with Google'}</span>
        </button>

        <div className="mt-8 pt-8 border-t border-white/5 flex items-center justify-center space-x-4 opacity-30 grayscale">
          <Globe className="w-4 h-4" />
          <span className="text-[9px] font-black uppercase tracking-[0.2em]">Institutional Grade Access</span>
        </div>
      </motion.div>

      <p className="mt-4 text-gray-700 text-[9px] font-black uppercase tracking-[0.3em] z-10 pb-4">
        Infrastructure Protected by Google & Brevo Security
      </p>
    </div>
  );
};

