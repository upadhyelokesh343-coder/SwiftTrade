import React, { useState, useEffect } from 'react';
import { db, auth } from '../lib/firebase';
import { collection, query, onSnapshot, doc, updateDoc, setDoc, orderBy, limit, getDocs, arrayUnion, addDoc, getDoc, Timestamp, where } from 'firebase/firestore';
import { Users, BarChart3, Wallet, Search, ArrowLeft, RefreshCw, Save, X, Activity, ShieldAlert, Settings, History, Trash2, RotateCcw, UserMinus, AlertTriangle, ShieldCheck, Headset, Send, MessageSquare, CheckCircle, Mail, User, CheckCheck, Phone, Video, Paperclip, Smile, ArrowUpRight, CheckCircle2, XCircle, Sliders, TrendingUp, TrendingDown, Zap, Gauge, Flame, Volume2, VolumeX, Bell } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { AssetLogo } from './AssetLogo';
import { BrandLogo, renderBrandName } from './BrandLogo';
import { normalizePlatformName } from '../hooks/useConfig';
import { soundManager } from '../lib/sound';
import { ALL_ASSETS_LIST, Asset } from '../types';

interface AdminUser {
  id: string;
  email?: string;
  displayName?: string;
  name?: string;
  demoBalance: number;
  realBalance: number;
  updatedAt?: any;
}

interface AdminDeposit {
  id: string;
  userId: string;
  userEmail: string;
  userName?: string;
  amountINR: number;
  amountUSD: number;
  paymentMethod: string;
  utrNumber: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: any;
}

interface AdminWithdrawal {
  id: string;
  userId: string;
  userEmail: string;
  userName?: string;
  amount: number;
  method: string;
  details: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: any;
}

interface AdminTrade {
  id: string;
  userId: string;
  asset: string;
  amount: number;
  action: string;
  status: string;
  profit?: number;
  createdAt: any;
}

interface AppSettings {
  platformName: string;
  defaultDemoBalance: number;
  soundEnabled: boolean;
  minWithdrawal: number;
  maxWithdrawal: number;
  apiSecretKey: string;
  isMaintenance: boolean;
  cryptomusMerchantId?: string;
  cryptomusApiKey?: string;
}

interface AdminSupportMessage {
  id: string;
  issue: string;
  message: string;
  userEmail: string;
  userId: string;
  userDisplayName?: string;
  timestamp: any;
  status: 'pending' | 'replied' | 'resolved';
  replies?: Array<{
    text: string;
    sender: 'admin' | 'user';
    timestamp: any;
  }>;
}

interface AdminPanelProps {
  onClose: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ onClose }) => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [recentTrades, setRecentTrades] = useState<AdminTrade[]>([]);
  const [deposits, setDeposits] = useState<AdminDeposit[]>([]);
  const [withdrawals, setWithdrawals] = useState<AdminWithdrawal[]>([]);
  const [supportMessages, setSupportMessages] = useState<AdminSupportMessage[]>([]);
  const [selectedSupport, setSelectedSupport] = useState<AdminSupportMessage | null>(null);
  const [adminReplyText, setAdminReplyText] = useState('');
  const [isReplying, setIsReplying] = useState(false);
  const [supportFilter, setSupportFilter] = useState('');

  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [historyUser, setHistoryUser] = useState<AdminUser | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ type: 'reset' | 'delete', user: AdminUser } | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'users' | 'trades' | 'deposits' | 'withdrawals' | 'settings' | 'support' | 'analytics' | 'market'>('dashboard');
  const [marketFilter, setMarketFilter] = useState('');
  const [marketControl, setMarketControl] = useState<{
    globalMode: 'NORMAL' | 'FORCE_UP' | 'FORCE_DOWN' | 'AUTO_HOUSE_WIN';
    assetModes: Record<string, 'NORMAL' | 'FORCE_UP' | 'FORCE_DOWN' | 'AUTO_HOUSE_WIN'>;
  }>({
    globalMode: 'NORMAL',
    assetModes: {}
  });

  // Listen to Firestore Market Control Configuration
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'market_control', 'config'), (snap) => {
      if (snap.exists()) {
        const data = snap.data() as any;
        setMarketControl({
          globalMode: data.globalMode || 'NORMAL',
          assetModes: data.assetModes || {}
        });
      }
    }, (err) => {
      console.warn("Market control listener error:", err);
    });
    return () => unsub();
  }, []);

  // Update Global Mode across ALL companies / assets
  const handleSetGlobalMarketMode = async (mode: 'NORMAL' | 'FORCE_UP' | 'FORCE_DOWN' | 'AUTO_HOUSE_WIN') => {
    try {
      const newAssetModes: Record<string, string> = {};
      ALL_ASSETS_LIST.forEach(a => {
        newAssetModes[a] = mode;
      });
      await setDoc(doc(db, 'market_control', 'config'), {
        globalMode: mode,
        assetModes: newAssetModes,
        updatedAt: Timestamp.now()
      }, { merge: true });
    } catch (err) {
      console.error("Failed to update global market mode:", err);
    }
  };

  // Update Specific Asset Mode
  const handleSetAssetMarketMode = async (asset: string, mode: 'NORMAL' | 'FORCE_UP' | 'FORCE_DOWN' | 'AUTO_HOUSE_WIN') => {
    try {
      const updatedAssetModes = { ...(marketControl.assetModes || {}), [asset]: mode };
      await setDoc(doc(db, 'market_control', 'config'), {
        assetModes: updatedAssetModes,
        updatedAt: Timestamp.now()
      }, { merge: true });
    } catch (err) {
      console.error("Failed to update asset market mode:", err);
    }
  };
  const [settings, setSettings] = useState<AppSettings>({
    platformName: 'SwiftTrade',
    defaultDemoBalance: 10000,
    soundEnabled: true,
    minWithdrawal: 50,
    maxWithdrawal: 10000,
    apiSecretKey: 'GT-PRO-QUAN-X-99',
    isMaintenance: false,
    cryptomusMerchantId: 'e0c85ddd-cc53-444a-b2cc-74f30d4c525c',
    cryptomusApiKey: ''
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [isSendingBroadcast, setIsSendingBroadcast] = useState(false);

  useEffect(() => {
    // Check if user is actually authorized (redundant check for safety)
    const currentEmail = auth.currentUser?.email?.toLowerCase() || '';
    if (currentEmail !== 'rajsjarma8@gmail.com' && currentEmail !== 'rajsharma8@gmail.com') {
      onClose();
      return;
    }

    const usersQuery = query(collection(db, 'users'), orderBy('demoBalance', 'desc'), limit(100));
    const tradesQuery = query(collection(db, 'trades'), orderBy('createdAt', 'desc'), limit(100));
    const depositsQuery = query(collection(db, 'deposits'), orderBy('createdAt', 'desc'), limit(100));
    const withdrawalsQuery = query(collection(db, 'withdrawals'), orderBy('createdAt', 'desc'), limit(100));
    const supportQuery = query(collection(db, 'support_messages'), orderBy('timestamp', 'desc'), limit(100));

    const unsubscribeUsers = onSnapshot(usersQuery, (snapshot) => {
      const usersData: AdminUser[] = [];
      snapshot.forEach((doc) => {
        usersData.push({ id: doc.id, ...doc.data() } as AdminUser);
      });
      setUsers(usersData);
      setLoading(false);
    }, (err) => {
      console.warn("Admin users listener error:", err);
      setLoading(false);
    });

    const unsubscribeTrades = onSnapshot(tradesQuery, (snapshot) => {
      const tradesData: AdminTrade[] = [];
      snapshot.forEach((doc) => {
        tradesData.push({ id: doc.id, ...doc.data() } as AdminTrade);
      });
      setRecentTrades(tradesData);
    }, (err) => {
      console.warn("Admin trades listener error:", err);
    });

    const unsubscribeDeposits = onSnapshot(depositsQuery, (snapshot) => {
      const depData: AdminDeposit[] = [];
      snapshot.forEach((doc) => {
        depData.push({ id: doc.id, ...doc.data() } as AdminDeposit);
      });
      setDeposits(depData);
    }, (err) => {
      console.warn("Admin deposits listener error:", err);
    });

    const unsubscribeWithdrawals = onSnapshot(withdrawalsQuery, (snapshot) => {
      const withData: AdminWithdrawal[] = [];
      snapshot.forEach((doc) => {
        withData.push({ id: doc.id, ...doc.data() } as AdminWithdrawal);
      });
      setWithdrawals(withData);
    }, (err) => {
      console.warn("Admin withdrawals listener error:", err);
    });

    const unsubscribeSupport = onSnapshot(supportQuery, (snapshot) => {
      const msgs: AdminSupportMessage[] = [];
      snapshot.forEach((doc) => {
        msgs.push({ id: doc.id, ...doc.data() } as AdminSupportMessage);
      });
      setSupportMessages(msgs);
    }, (err) => {
      console.warn("Admin support listener error:", err);
    });

    // Fetch Global Config
    let initialConfigLoaded = false;
    const unsubscribeConfig = onSnapshot(doc(db, 'config', 'app'), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        const cleanName = normalizePlatformName(data?.platformName);
        if (data?.platformName && (data.platformName.toLowerCase().includes('guru') || data.platformName.toLowerCase().includes('galaxy'))) {
          setDoc(doc(db, 'config', 'app'), { platformName: 'SwiftTrade' }, { merge: true }).catch(console.warn);
        }
        if (!initialConfigLoaded) {
          initialConfigLoaded = true;
          setSettings(prev => ({ 
            ...prev, 
            ...data,
            platformName: cleanName
          }));
        }
      } else {
        // Seed initial config to Firestore
        setDoc(doc(db, 'config', 'app'), {
          platformName: 'SwiftTrade',
          defaultDemoBalance: 10000,
          soundEnabled: true,
          minWithdrawal: 50,
          maxWithdrawal: 10000,
          apiSecretKey: 'GT-PRO-QUAN-X-99',
          isMaintenance: false,
          cryptomusMerchantId: 'e0c85ddd-cc53-444a-b2cc-74f30d4c525c',
          updatedAt: Timestamp.now()
        }, { merge: true }).catch(err => console.warn("Initial config seed note:", err));
      }
    }, (err) => {
      console.warn("Admin config listener error:", err);
    });

    return () => {
      unsubscribeUsers();
      unsubscribeTrades();
      unsubscribeDeposits();
      unsubscribeWithdrawals();
      unsubscribeSupport();
      unsubscribeConfig();
    };
  }, [onClose]);

  const handleApproveDeposit = async (dep: AdminDeposit) => {
    try {
      const depositAmt = Number(dep.amountUSD) > 0 
        ? Number(dep.amountUSD) 
        : (Number(dep.amountINR) > 0 ? Math.round(Number(dep.amountINR) / 85) : 0);

      if (depositAmt <= 0) {
        console.warn("Invalid deposit amount on approval:", dep);
        return;
      }

      // 1. Update deposit status to APPROVED in Firestore
      await updateDoc(doc(db, 'deposits', dep.id), { 
        status: 'APPROVED',
        approvedAt: Timestamp.now()
      });

      // 2. Identify target user document in Firestore
      let targetUserRef: any = null;
      let targetUserId = dep.userId;
      let targetUserData: any = null;

      // Try by userId first if it's not empty or 'anonymous'
      if (targetUserId && targetUserId !== 'anonymous') {
        const directRef = doc(db, 'users', targetUserId);
        const directSnap = await getDoc(directRef);
        if (directSnap.exists()) {
          targetUserRef = directRef;
          targetUserData = directSnap.data();
        }
      }

      // If not found by direct userId, try finding by email in Firestore
      if (!targetUserRef && dep.userEmail && dep.userEmail !== 'unregistered@swifttrade.com') {
        const cleanEmail = dep.userEmail.trim().toLowerCase();
        const emailQuery = query(collection(db, 'users'), where('email', '==', cleanEmail), limit(1));
        const emailSnap = await getDocs(emailQuery);
        if (!emailSnap.empty) {
          targetUserRef = emailSnap.docs[0].ref;
          targetUserId = emailSnap.docs[0].id;
          targetUserData = emailSnap.docs[0].data();
        }
      }

      // If still not found, search in-memory users list
      if (!targetUserRef) {
        const matchedUser = users.find(u => 
          (targetUserId && targetUserId !== 'anonymous' && u.id === targetUserId) ||
          (dep.userEmail && u.email && u.email.toLowerCase() === dep.userEmail.trim().toLowerCase())
        );
        if (matchedUser) {
          targetUserRef = doc(db, 'users', matchedUser.id);
          targetUserId = matchedUser.id;
          const snap = await getDoc(targetUserRef);
          if (snap.exists()) {
            targetUserData = snap.data();
          }
        }
      }

      // If user document does not exist yet, initialize it
      if (!targetUserRef) {
        const docId = targetUserId && targetUserId !== 'anonymous' 
          ? targetUserId 
          : (dep.userEmail ? dep.userEmail.toLowerCase().replace(/[^a-z0-9]/g, '_') : dep.id);
        targetUserRef = doc(db, 'users', docId);
        targetUserId = docId;
        targetUserData = {
          email: dep.userEmail || '',
          name: dep.userName || 'Trader',
          demoBalance: 10000,
          realBalance: 0
        };
      }

      const currentReal = Number(targetUserData?.realBalance) || 0;
      const newRealBalance = currentReal + depositAmt;
      const currentTotalDeposited = Number(targetUserData?.totalDepositedUSD) || 0;

      // 3. Atomically credit real balance to the user
      await setDoc(targetUserRef, {
        realBalance: newRealBalance,
        hasApprovedDeposit: true,
        totalDepositedUSD: currentTotalDeposited + depositAmt,
        updatedAt: Timestamp.now()
      }, { merge: true });

      // 4. Update local state immediately so Admin UI reflects the credited amount
      setUsers(prev => prev.map(u => {
        if (u.id === targetUserId || (u.email && dep.userEmail && u.email.toLowerCase() === dep.userEmail.toLowerCase())) {
          return { ...u, realBalance: newRealBalance };
        }
        return u;
      }));

      setDeposits(prev => prev.map(d => d.id === dep.id ? { ...d, status: 'APPROVED' } : d));

      // 5. Send Notification to User
      await addDoc(collection(db, 'notifications'), {
        userId: targetUserId,
        userEmail: dep.userEmail || '',
        title: 'Deposit Approved! 🎉',
        message: `Your deposit of ₹${(dep.amountINR || depositAmt * 85).toLocaleString()} ($${depositAmt}) has been approved and credited to your Real Balance! Current Real Balance: $${newRealBalance.toFixed(2)}`,
        read: false,
        createdAt: Timestamp.now()
      });

      soundManager.playWin();
    } catch (err) {
      console.error("Approve deposit error:", err);
    }
  };

  const handleRejectDeposit = async (dep: AdminDeposit) => {
    try {
      await updateDoc(doc(db, 'deposits', dep.id), { status: 'REJECTED' });

      setDeposits(prev => prev.map(d => d.id === dep.id ? { ...d, status: 'REJECTED' } : d));

      await addDoc(collection(db, 'notifications'), {
        userId: dep.userId,
        userEmail: dep.userEmail,
        title: 'Deposit Rejected',
        message: `Your deposit request of ₹${dep.amountINR.toLocaleString()} (UTR: ${dep.utrNumber}) could not be verified. Please contact support.`,
        read: false,
        createdAt: Timestamp.now()
      });
    } catch (err) {
      console.error("Reject deposit error:", err);
    }
  };

  const handleApproveWithdrawal = async (withItem: AdminWithdrawal) => {
    try {
      await updateDoc(doc(db, 'withdrawals', withItem.id), { status: 'APPROVED' });

      setWithdrawals(prev => prev.map(w => w.id === withItem.id ? { ...w, status: 'APPROVED' } : w));

      await addDoc(collection(db, 'notifications'), {
        userId: withItem.userId,
        userEmail: withItem.userEmail,
        title: 'Withdrawal Approved! 🚀',
        message: `Your withdrawal request of $${withItem.amount} via ${withItem.method} has been approved and transferred.`,
        read: false,
        createdAt: Timestamp.now()
      });
    } catch (err) {
      console.error("Approve withdrawal error:", err);
    }
  };

  const handleRejectWithdrawal = async (withItem: AdminWithdrawal) => {
    try {
      await updateDoc(doc(db, 'withdrawals', withItem.id), { status: 'REJECTED' });

      setWithdrawals(prev => prev.map(w => w.id === withItem.id ? { ...w, status: 'REJECTED' } : w));

      // Refund the real balance
      let userRef: any = null;
      if (withItem.userId && withItem.userId !== 'anonymous') {
        userRef = doc(db, 'users', withItem.userId);
      } else if (withItem.userEmail) {
        const qUser = query(collection(db, 'users'), where('email', '==', withItem.userEmail.trim().toLowerCase()), limit(1));
        const qSnap = await getDocs(qUser);
        if (!qSnap.empty) {
          userRef = qSnap.docs[0].ref;
        }
      }

      if (userRef) {
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const currentReal = Number((userSnap.data() as any)?.realBalance) || 0;
          await setDoc(userRef, { 
            realBalance: currentReal + Number(withItem.amount),
            updatedAt: Timestamp.now()
          }, { merge: true });
        }
      }

      await addDoc(collection(db, 'notifications'), {
        userId: withItem.userId,
        userEmail: withItem.userEmail,
        title: 'Withdrawal Refunded',
        message: `Your withdrawal request of $${withItem.amount} was rejected and refunded back to your Real Balance.`,
        read: false,
        createdAt: Timestamp.now()
      });
    } catch (err) {
      console.error("Reject withdrawal error:", err);
    }
  };

  const handleSendAdminReply = async () => {
    if (!selectedSupport || !adminReplyText.trim() || isReplying) return;

    setIsReplying(true);
    try {
      const msgRef = doc(db, 'support_messages', selectedSupport.id);
      const newReply = {
        text: adminReplyText.trim(),
        sender: 'admin' as const,
        timestamp: new Date()
      };

      await updateDoc(msgRef, {
        replies: arrayUnion(newReply),
        status: 'replied',
        updatedAt: new Date()
      });

      // Dispatch notification to the target user
      if (selectedSupport.userId) {
        try {
          await addDoc(collection(db, 'notifications'), {
            userId: selectedSupport.userId,
            userEmail: selectedSupport.userEmail || '',
            title: '💬 New Reply from Support Desk',
            message: adminReplyText.trim(),
            issue: selectedSupport.issue || 'Support Issue',
            ticketId: selectedSupport.id,
            read: false,
            createdAt: new Date()
          });
        } catch (notifErr) {
          console.error('Error sending user notification:', notifErr);
        }
      }

      // Update local state for immediate feedback
      setSelectedSupport(prev => prev ? {
        ...prev,
        status: 'replied',
        replies: [...(prev.replies || []), newReply]
      } : null);

      setAdminReplyText('');
    } catch (error) {
      console.error('Error sending admin reply:', error);
      alert('Failed to send reply. Please try again.');
    } finally {
      setIsReplying(false);
    }
  };

  const handleUpdateSupportStatus = async (msgId: string, status: 'pending' | 'replied' | 'resolved') => {
    try {
      const msgRef = doc(db, 'support_messages', msgId);
      await updateDoc(msgRef, { status });
      if (selectedSupport && selectedSupport.id === msgId) {
        setSelectedSupport(prev => prev ? { ...prev, status } : null);
      }
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const handleSaveUserBalances = async (userId: string, demoAmount: number, realAmount: number) => {
    try {
      const userRef = doc(db, 'users', userId);
      const safeDemo = isNaN(demoAmount) ? 10000 : Math.max(0, Number(demoAmount));
      const safeReal = isNaN(realAmount) ? 0 : Math.max(0, Number(realAmount));

      await setDoc(userRef, {
        demoBalance: safeDemo,
        realBalance: safeReal,
        hasApprovedDeposit: safeReal > 0,
        totalDepositedUSD: safeReal,
        updatedAt: Timestamp.now()
      }, { merge: true });

      setUsers(prev => prev.map(u => u.id === userId ? { ...u, demoBalance: safeDemo, realBalance: safeReal } : u));
      setEditingUser(null);
      soundManager.playWin();
    } catch (error) {
      console.error("Error updating balance:", error);
    }
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);
    setSaveSuccessMsg('');
    try {
      const cleanPayload = {
        platformName: settings.platformName?.trim() || 'SwiftTrade',
        apiSecretKey: settings.apiSecretKey || '',
        defaultDemoBalance: Number(settings.defaultDemoBalance) || 10000,
        minWithdrawal: Number(settings.minWithdrawal) || 50,
        maxWithdrawal: Number(settings.maxWithdrawal) || 10000,
        soundEnabled: Boolean(settings.soundEnabled),
        isMaintenance: Boolean(settings.isMaintenance),
        cryptomusMerchantId: settings.cryptomusMerchantId?.trim() || '',
        cryptomusApiKey: settings.cryptomusApiKey?.trim() || '',
        updatedAt: Timestamp.now()
      };

      const configRef = doc(db, 'config', 'app');
      await setDoc(configRef, cleanPayload, { merge: true });

      soundManager.setSoundEnabled(cleanPayload.soundEnabled);
      if (cleanPayload.soundEnabled) {
        soundManager.playTestSound();
      }

      try {
        localStorage.setItem('swifttrade_app_config', JSON.stringify(cleanPayload));
      } catch (e) {
        // ignore
      }

      setSettings(prev => ({ ...prev, ...cleanPayload }));
      setSaveSuccessMsg(`Settings saved successfully! Website: "${cleanPayload.platformName}" | Audio: ${cleanPayload.soundEnabled ? 'ON' : 'MUTED'}`);
      setTimeout(() => setSaveSuccessMsg(''), 4500);
    } catch (error: any) {
      console.error("Error saving settings:", error);
      setSaveSuccessMsg(`Error saving settings: ${error?.message || "Check permissions"}`);
    } finally {
      setTimeout(() => setIsSaving(false), 300);
    }
  };

  const handleSendBroadcast = async () => {
    if (!broadcastTitle.trim() || !broadcastMessage.trim() || isSendingBroadcast) return;
    setIsSendingBroadcast(true);
    try {
      await addDoc(collection(db, 'notifications'), {
        userId: 'ALL',
        title: broadcastTitle.trim(),
        message: broadcastMessage.trim(),
        read: false,
        createdAt: Timestamp.now()
      });
      soundManager.playNotification();
      setSaveSuccessMsg(`Notification "${broadcastTitle}" broadcasted successfully with chime sound!`);
      setBroadcastTitle('');
      setBroadcastMessage('');
      setTimeout(() => setSaveSuccessMsg(''), 4500);
    } catch (err: any) {
      console.error("Error broadcasting notification:", err);
      alert("Failed to send notification: " + (err?.message || "Check network"));
    } finally {
      setIsSendingBroadcast(false);
    }
  };

  const handleResetAccount = async (user: AdminUser) => {
    try {
      const userRef = doc(db, 'users', user.id);
      await updateDoc(userRef, {
        demoBalance: settings.defaultDemoBalance,
        realBalance: 0,
        updatedAt: new Date()
      });
      setConfirmAction(null);
    } catch (error) {
      console.error("Error resetting account:", error);
    }
  };

  const handleDeleteUser = async (user: AdminUser) => {
    // Note: In a real app, you might also want to delete their trades or use a cloud function to delete the Auth user
    try {
      // Simplified for demo: just removing from Firestore users collection
      const userRef = doc(db, 'users', user.id);
      // await deleteDoc(userRef); 
      // safer approach: just flag as blocked or set balances to 0 for demo purposes unless explicitly required
      await updateDoc(userRef, { blocked: true, demoBalance: 0, realBalance: 0 });
      setConfirmAction(null);
    } catch (error) {
      console.error("Error blocking user:", error);
    }
  };

  const filteredUsers = users.filter(u => 
    u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const userTrades = historyUser ? recentTrades.filter(t => t.userId === historyUser.id) : [];

  return (
    <div className="fixed inset-0 z-[99999] bg-[#05070A] text-white flex flex-col overflow-hidden font-sans">
      {/* Galaxy/Neon Background Effects */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-600/10 blur-[150px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-600/10 blur-[150px] rounded-full" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-10" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 p-3.5 sm:p-5 border-b border-purple-500/30 bg-[#0B0F1A]/95 backdrop-blur-2xl flex items-center justify-between gap-3 shrink-0 shadow-2xl pt-4 sm:pt-6">
        <div className="flex items-center space-x-2.5 sm:space-x-4">
          <button 
            onClick={activeTab === 'dashboard' ? onClose : () => setActiveTab('dashboard')}
            className="px-3 py-2 sm:px-4 sm:py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl transition-all border border-purple-300 active:scale-95 shadow-lg flex items-center gap-2 font-black text-xs sm:text-sm cursor-pointer"
            title="Back / Dashboard"
          >
            <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6 stroke-[3]" />
            <span>{activeTab === 'dashboard' ? 'Exit Admin' : 'Back to Main'}</span>
          </button>
          <div>
            <h1 className="text-base sm:text-xl font-black tracking-tighter flex items-center gap-2 italic text-white">
              <ShieldAlert className="w-5 h-5 sm:w-6 sm:h-6 text-cyan-400 animate-pulse shrink-0" />
              {renderBrandName(settings.platformName)} <span className="text-purple-400 ml-1">ADMIN</span>
            </h1>
            <p className="text-[9px] uppercase tracking-[0.2em] text-purple-300 font-bold">
              {activeTab === 'dashboard' ? 'Infrastructure Command Center' : `${activeTab.toUpperCase()} PROTOCOL`}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 sm:space-x-3">
          {activeTab !== 'dashboard' && (
            <button 
              onClick={() => setActiveTab('dashboard')}
              className="px-3 py-2 sm:px-4 sm:py-2.5 bg-purple-600/40 hover:bg-purple-600 border border-purple-400 text-white rounded-xl text-xs font-black transition-all uppercase tracking-wider cursor-pointer"
            >
              Main Deck
            </button>
          )}

          <button 
            onClick={onClose}
            className="px-3 py-2 sm:px-4 sm:py-2.5 bg-rose-600 hover:bg-rose-500 border border-rose-400 text-white rounded-xl transition-all active:scale-95 flex items-center gap-1.5 font-black text-xs uppercase tracking-wider cursor-pointer shadow-md"
            title="Exit Admin Panel"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]" />
            <span className="hidden sm:inline">Close Admin</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-1 overflow-y-auto p-3.5 sm:p-8">
        <div className="max-w-7xl mx-auto">
          
          {/* Top Back Navigation Bar for Sub-Pages */}
          {activeTab !== 'dashboard' && (
            <div className="mb-5 flex items-center justify-between bg-purple-950/60 border border-purple-500/40 p-3 sm:p-4 rounded-2xl backdrop-blur-md shadow-xl">
              <button
                onClick={() => setActiveTab('dashboard')}
                className="flex items-center space-x-2 bg-purple-600 hover:bg-purple-500 text-white font-black text-xs sm:text-sm px-4 py-2.5 rounded-xl transition shadow-lg active:scale-95 cursor-pointer border border-purple-300"
              >
                <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 stroke-[3]" />
                <span>← Back to Main Admin Dashboard</span>
              </button>
              <span className="text-[11px] font-black uppercase tracking-widest text-purple-200 hidden sm:inline">
                Current Module: <span className="text-white bg-purple-900/80 px-2 py-0.5 rounded border border-purple-500/30">{activeTab.toUpperCase()}</span>
              </span>
            </div>
          )}

          {activeTab === 'dashboard' && (
            <div className="space-y-8 animate-in fade-in duration-500">
              {/* Core Stats Overview */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: 'Total Nodes', val: users.length, icon: Users, color: 'text-purple-400' },
                  { label: 'Live Signal', val: recentTrades.filter(t => t.status === 'ACTIVE').length, icon: Activity, color: 'text-blue-400' },
                  { label: 'Volume Cap', val: `$${users.reduce((acc, u) => acc + (u.realBalance || 0), 0).toLocaleString()}`, icon: Wallet, color: 'text-green-400' },
                  { label: 'Active Sessions', val: '12', icon: ShieldCheck, color: 'text-amber-400' }
                ].map((s, idx) => (
                  <div key={idx} className="bg-gray-900/40 border border-white/10 p-5 rounded-[24px] backdrop-blur-md shadow-xl border-l-2 border-l-purple-500/30">
                    <div className="flex justify-between items-start mb-3">
                      <s.icon className={cn("w-5 h-5", s.color)} />
                      <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">{s.label}</span>
                    </div>
                    <div className="text-2xl font-black tracking-tighter">{s.val}</div>
                  </div>
                ))}
              </div>

              {/* Command Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[
                  { id: 'market', label: 'Candle & Market Control', desc: 'Control Green (Pump UP) / Red (Dump DOWN) candles for all companies & auto-rig house win.', icon: Sliders, color: 'from-emerald-500 to-teal-600' },
                  { id: 'support', label: 'Support Desk', desc: 'Read and reply to user support inquiries & emails.', icon: Headset, color: 'from-rose-600 to-pink-600', badge: supportMessages.filter(m => m.status === 'pending').length },
                  { id: 'users', label: 'Manage Users', desc: 'Scan and modify user matrix, balances and history.', icon: Users, color: 'from-purple-600 to-blue-600' },
                  { id: 'trades', label: 'Global Trade Flux', desc: 'Monitor real-time order flow and market entry signals.', icon: BarChart3, color: 'from-blue-600 to-cyan-500' },
                  { id: 'deposits', label: 'Deposit Requests', desc: 'Approve or reject incoming asset liquidity signals.', icon: Wallet, color: 'from-green-600 to-emerald-500' },
                  { id: 'withdrawals', label: 'Withdrawal Protocol', desc: 'Manage user asset extractions and verification.', icon: History, color: 'from-amber-600 to-orange-500' },
                  { id: 'settings', label: 'App Configuration', desc: 'Modify global platform parameters and security keys.', icon: Settings, color: 'from-gray-600 to-slate-500' },
                ].map((card) => (
                  <button
                    key={card.id}
                    onClick={() => setActiveTab(card.id as any)}
                    className="group relative bg-gray-900/40 border border-white/10 rounded-[32px] p-8 text-left transition-all hover:bg-white/5 hover:border-white/20 active:scale-[0.98] overflow-hidden"
                  >
                    {/* Hover Glow */}
                    <div className={cn("absolute inset-0 opacity-0 group-hover:opacity-10 bg-gradient-to-br transition-opacity", card.color)} />
                    
                    <div className="relative z-10 space-y-6">
                      <div className="flex items-center justify-between">
                        <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center bg-gradient-to-br shadow-xl group-hover:scale-110 transition-transform", card.color)}>
                          <card.icon className="w-7 h-7 text-white" />
                        </div>
                        {card.badge !== undefined && card.badge > 0 && (
                          <span className="px-3 py-1 rounded-full bg-rose-500 text-white font-black text-xs animate-pulse shadow-lg shadow-rose-500/50">
                            {card.badge} PENDING
                          </span>
                        )}
                      </div>
                      
                      <div>
                        <h3 className="text-xl font-black tracking-tighter uppercase italic mb-2">{card.label}</h3>
                        <p className="text-xs text-gray-500 font-bold leading-relaxed">{card.desc}</p>
                      </div>

                      <div className="flex items-center gap-2 pt-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                        <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Active Module</span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* CANDLE & MARKET CONTROL TAB */}
          {activeTab === 'market' && (
            <div className="space-y-8 animate-in slide-in-from-right duration-500">
              {/* Header Box */}
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-gradient-to-r from-purple-950/80 via-slate-900/90 to-emerald-950/80 p-6 rounded-[32px] border border-purple-500/30 backdrop-blur-md shadow-2xl">
                <div>
                  <h2 className="text-2xl sm:text-3xl font-black italic uppercase tracking-tight flex items-center gap-3 text-white">
                    <Sliders className="w-8 h-8 text-emerald-400 animate-pulse" />
                    Candle & Market Control Center
                  </h2>
                  <p className="text-xs text-purple-200 mt-1 font-medium">
                    Control Green (Pump UP) & Red (Dump DOWN) candles for all companies in real time based on active user bets.
                  </p>
                </div>

                <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 px-4 py-2 rounded-2xl text-emerald-300 font-mono text-xs font-bold shrink-0">
                  <Activity className="w-4 h-4 text-emerald-400 animate-spin" />
                  <span>LIVE FIRESTORE SYNC</span>
                </div>
              </div>

              {/* Real-time Betting Analytics Overview */}
              {(() => {
                const activeTradesList = recentTrades.filter(t => t.status === 'ACTIVE');
                const totalCallSum = activeTradesList.filter(t => t.action === 'CALL').reduce((a, b) => a + (Number(b.amount) || 0), 0);
                const totalPutSum = activeTradesList.filter(t => t.action === 'PUT').reduce((a, b) => a + (Number(b.amount) || 0), 0);
                const totalSum = totalCallSum + totalPutSum;
                const callPercent = totalSum > 0 ? Math.round((totalCallSum / totalSum) * 100) : 0;
                const putPercent = totalSum > 0 ? Math.round((totalPutSum / totalSum) * 100) : 0;

                return (
                  <div className="space-y-6">
                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Green Bets */}
                      <div className="bg-emerald-950/30 border border-emerald-500/40 p-5 rounded-3xl backdrop-blur-md relative overflow-hidden shadow-lg">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 blur-xl rounded-full" />
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-xs font-black text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-emerald-400" />
                            🟢 Green / CALL Bets
                          </span>
                          <span className="text-xs font-black text-emerald-300 bg-emerald-500/20 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                            {callPercent}%
                          </span>
                        </div>
                        <div className="text-3xl font-black text-white tracking-tight">${totalCallSum.toLocaleString()}</div>
                        <p className="text-[10px] text-emerald-300/80 font-bold mt-1 uppercase tracking-wider">
                          Money placed on Candle Upar Uthne (Green)
                        </p>
                      </div>

                      {/* Red Bets */}
                      <div className="bg-rose-950/30 border border-rose-500/40 p-5 rounded-3xl backdrop-blur-md relative overflow-hidden shadow-lg">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/10 blur-xl rounded-full" />
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-xs font-black text-rose-400 uppercase tracking-wider flex items-center gap-2">
                            <TrendingDown className="w-4 h-4 text-rose-400" />
                            🔴 Red / PUT Bets
                          </span>
                          <span className="text-xs font-black text-rose-300 bg-rose-500/20 px-2.5 py-0.5 rounded-full border border-rose-500/30">
                            {putPercent}%
                          </span>
                        </div>
                        <div className="text-3xl font-black text-white tracking-tight">${totalPutSum.toLocaleString()}</div>
                        <p className="text-[10px] text-rose-300/80 font-bold mt-1 uppercase tracking-wider">
                          Money placed on Candle Niche Girne (Red)
                        </p>
                      </div>

                      {/* Active Volume */}
                      <div className="bg-purple-950/30 border border-purple-500/40 p-5 rounded-3xl backdrop-blur-md relative overflow-hidden shadow-lg">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/10 blur-xl rounded-full" />
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-xs font-black text-purple-300 uppercase tracking-wider flex items-center gap-2">
                            <Gauge className="w-4 h-4 text-purple-400" />
                            ⚡ Total Active Exposure
                          </span>
                          <span className="text-xs font-black text-purple-200 bg-purple-500/20 px-2.5 py-0.5 rounded-full border border-purple-500/30">
                            {activeTradesList.length} Active
                          </span>
                        </div>
                        <div className="text-3xl font-black text-white tracking-tight">${totalSum.toLocaleString()}</div>
                        <p className="text-[10px] text-purple-300/80 font-bold mt-1 uppercase tracking-wider">
                          Combined Active Market Volume
                        </p>
                      </div>
                    </div>

                    {/* Visual Ratio Bar */}
                    <div className="bg-gray-900/60 p-4 rounded-2xl border border-white/10 space-y-2">
                      <div className="flex justify-between items-center text-xs font-black uppercase tracking-wider text-gray-300">
                        <span className="text-emerald-400 flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                          🟢 GREEN / CALL ({callPercent}%)
                        </span>
                        <span className="text-rose-400 flex items-center gap-1.5">
                          🔴 RED / PUT ({putPercent}%)
                          <div className="w-2 h-2 rounded-full bg-rose-400 animate-pulse" />
                        </span>
                      </div>
                      <div className="h-4 bg-gray-800 rounded-full overflow-hidden flex border border-white/10 p-0.5">
                        <div 
                          className="bg-gradient-to-r from-emerald-600 to-emerald-400 h-full rounded-l-full transition-all duration-500" 
                          style={{ width: `${Math.max(5, callPercent)}%` }} 
                        />
                        <div 
                          className="bg-gradient-to-r from-rose-400 to-rose-600 h-full rounded-r-full transition-all duration-500" 
                          style={{ width: `${Math.max(5, putPercent)}%` }} 
                        />
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Master Global Override Controls */}
              <div className="bg-gray-900/60 border border-purple-500/30 p-6 rounded-[32px] space-y-6 shadow-2xl backdrop-blur-md">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Flame className="w-5 h-5 text-amber-400 animate-bounce" />
                    <h3 className="text-xl font-black uppercase italic tracking-wider text-white">
                      MASTER GLOBAL OVERRIDE (ALL 22 COMPANIES)
                    </h3>
                  </div>
                  <p className="text-xs text-gray-400 font-bold">
                    Clicking any button below forces ALL companies' candles to move simultaneously across all connected user screens!
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Force ALL Green */}
                  <button
                    onClick={() => handleSetGlobalMarketMode('FORCE_UP')}
                    className={cn(
                      "p-5 rounded-2xl border transition-all text-left flex flex-col justify-between h-36 cursor-pointer active:scale-95 shadow-xl relative overflow-hidden group",
                      marketControl.globalMode === 'FORCE_UP'
                        ? "bg-emerald-600 text-white border-emerald-300 ring-4 ring-emerald-500/50"
                        : "bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-200 border-emerald-500/40"
                    )}
                  >
                    <div className="flex justify-between items-start">
                      <div className="p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-400/30">
                        <TrendingUp className="w-6 h-6 text-emerald-300" />
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-emerald-900/80 border border-emerald-400/30">
                        PUMP UP
                      </span>
                    </div>
                    <div>
                      <div className="font-black text-base uppercase tracking-tight">🟢 FORCE ALL GREEN</div>
                      <div className="text-[10px] opacity-80 font-bold uppercase tracking-wider mt-0.5">
                        Candle Upar Uthaao (All Companies)
                      </div>
                    </div>
                  </button>

                  {/* Force ALL Red */}
                  <button
                    onClick={() => handleSetGlobalMarketMode('FORCE_DOWN')}
                    className={cn(
                      "p-5 rounded-2xl border transition-all text-left flex flex-col justify-between h-36 cursor-pointer active:scale-95 shadow-xl relative overflow-hidden group",
                      marketControl.globalMode === 'FORCE_DOWN'
                        ? "bg-rose-600 text-white border-rose-300 ring-4 ring-rose-500/50"
                        : "bg-rose-950/40 hover:bg-rose-900/60 text-rose-200 border-rose-500/40"
                    )}
                  >
                    <div className="flex justify-between items-start">
                      <div className="p-2.5 rounded-xl bg-rose-500/20 border border-rose-400/30">
                        <TrendingDown className="w-6 h-6 text-rose-300" />
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-rose-900/80 border border-rose-400/30">
                        DUMP DOWN
                      </span>
                    </div>
                    <div>
                      <div className="font-black text-base uppercase tracking-tight">🔴 FORCE ALL RED</div>
                      <div className="text-[10px] opacity-80 font-bold uppercase tracking-wider mt-0.5">
                        Candle Niche Giraao (All Companies)
                      </div>
                    </div>
                  </button>

                  {/* Auto Rig / House Always Win */}
                  <button
                    onClick={() => handleSetGlobalMarketMode('AUTO_HOUSE_WIN')}
                    className={cn(
                      "p-5 rounded-2xl border transition-all text-left flex flex-col justify-between h-36 cursor-pointer active:scale-95 shadow-xl relative overflow-hidden group",
                      marketControl.globalMode === 'AUTO_HOUSE_WIN'
                        ? "bg-amber-600 text-white border-amber-300 ring-4 ring-amber-500/50"
                        : "bg-amber-950/40 hover:bg-amber-900/60 text-amber-200 border-amber-500/40"
                    )}
                  >
                    <div className="flex justify-between items-start">
                      <div className="p-2.5 rounded-xl bg-amber-500/20 border border-amber-400/30">
                        <Zap className="w-6 h-6 text-amber-300" />
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-amber-900/80 border border-amber-400/30">
                        SMART RIG
                      </span>
                    </div>
                    <div>
                      <div className="font-black text-base uppercase tracking-tight">⚡ AUTO-RIG (HOUSE WIN)</div>
                      <div className="text-[10px] opacity-80 font-bold uppercase tracking-wider mt-0.5">
                        Jyada Bet Wale Ko Haro (Alternating Organic Candles)
                      </div>
                    </div>
                  </button>

                  {/* Reset to Normal */}
                  <button
                    onClick={() => handleSetGlobalMarketMode('NORMAL')}
                    className={cn(
                      "p-5 rounded-2xl border transition-all text-left flex flex-col justify-between h-36 cursor-pointer active:scale-95 shadow-xl relative overflow-hidden group",
                      marketControl.globalMode === 'NORMAL'
                        ? "bg-purple-600 text-white border-purple-300 ring-4 ring-purple-500/50"
                        : "bg-gray-900 hover:bg-gray-800 text-gray-300 border-white/10"
                    )}
                  >
                    <div className="flex justify-between items-start">
                      <div className="p-2.5 rounded-xl bg-gray-800 border border-white/10">
                        <RotateCcw className="w-6 h-6 text-gray-300" />
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-gray-800 border border-white/10">
                        ORGANIC
                      </span>
                    </div>
                    <div>
                      <div className="font-black text-base uppercase tracking-tight">🔄 RESET TO NORMAL</div>
                      <div className="text-[10px] opacity-80 font-bold uppercase tracking-wider mt-0.5">
                        Normal Random Market Movement
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Individual Company Asset Grid */}
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-gray-900/40 p-4 sm:p-6 rounded-[28px] border border-white/10">
                  <div>
                    <h3 className="text-xl font-black uppercase italic tracking-wider text-white">
                      INDIVIDUAL COMPANY / ASSET RIGGING (22 COMPANIES)
                    </h3>
                    <p className="text-xs text-gray-400 font-medium">
                      Control individual asset trend behavior independently or monitor active live bets per company.
                    </p>
                  </div>

                  <div className="relative w-full sm:w-72">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                      type="text"
                      placeholder="Search company (e.g. Apple, Bitcoin, EUR/USD)..."
                      value={marketFilter}
                      onChange={(e) => setMarketFilter(e.target.value)}
                      className="w-full bg-black/50 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder:text-gray-500 focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {ALL_ASSETS_LIST.filter(a => a.toLowerCase().includes(marketFilter.toLowerCase())).map((asset) => {
                    const currentAssetMode = marketControl.assetModes?.[asset] || marketControl.globalMode || 'NORMAL';
                    
                    const activeTradesForAsset = recentTrades.filter(t => t.status === 'ACTIVE' && t.asset === asset);
                    const callSum = activeTradesForAsset.filter(t => t.action === 'CALL').reduce((a, b) => a + (Number(b.amount) || 0), 0);
                    const putSum = activeTradesForAsset.filter(t => t.action === 'PUT').reduce((a, b) => a + (Number(b.amount) || 0), 0);
                    const totalAssetSum = callSum + putSum;
                    const callRatio = totalAssetSum > 0 ? Math.round((callSum / totalAssetSum) * 100) : 0;
                    const putRatio = totalAssetSum > 0 ? Math.round((putSum / totalAssetSum) * 100) : 0;

                    return (
                      <div 
                        key={asset}
                        className={cn(
                          "p-5 rounded-3xl border backdrop-blur-md transition-all space-y-4 shadow-xl relative overflow-hidden",
                          currentAssetMode === 'FORCE_UP'
                            ? "bg-emerald-950/30 border-emerald-500/50"
                            : currentAssetMode === 'FORCE_DOWN'
                            ? "bg-rose-950/30 border-rose-500/50"
                            : currentAssetMode === 'AUTO_HOUSE_WIN'
                            ? "bg-amber-950/30 border-amber-500/50"
                            : "bg-gray-900/40 border-white/10"
                        )}
                      >
                        {/* Company Logo & Status Badge */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <AssetLogo asset={asset as any} size={32} />
                            <div>
                              <div className="font-black text-white text-sm leading-tight">{asset}</div>
                              <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Company / Asset</div>
                            </div>
                          </div>

                          <span className={cn(
                            "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border shadow-md",
                            currentAssetMode === 'FORCE_UP'
                              ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 animate-pulse"
                              : currentAssetMode === 'FORCE_DOWN'
                              ? "bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse"
                              : currentAssetMode === 'AUTO_HOUSE_WIN'
                              ? "bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse"
                              : "bg-gray-800 text-gray-400 border-white/10"
                          )}>
                            {currentAssetMode === 'FORCE_UP' && '🟢 FORCE GREEN (UP)'}
                            {currentAssetMode === 'FORCE_DOWN' && '🔴 FORCE RED (DOWN)'}
                            {currentAssetMode === 'AUTO_HOUSE_WIN' && '⚡ AUTO RIG'}
                            {currentAssetMode === 'NORMAL' && '🔄 NORMAL'}
                          </span>
                        </div>

                        {/* Live Bet Amounts Breakdown */}
                        <div className="bg-black/40 p-3 rounded-2xl border border-white/5 space-y-2">
                          <div className="flex justify-between items-center text-[11px] font-black">
                            <span className="text-emerald-400 flex items-center gap-1">
                              🟢 CALL: ${callSum.toLocaleString()} ({callRatio}%)
                            </span>
                            <span className="text-rose-400 flex items-center gap-1">
                              🔴 PUT: ${putSum.toLocaleString()} ({putRatio}%)
                            </span>
                          </div>

                          <div className="h-2.5 bg-gray-800 rounded-full overflow-hidden flex border border-white/10">
                            <div className="bg-emerald-500 h-full transition-all duration-300" style={{ width: `${callRatio}%` }} />
                            <div className="bg-rose-500 h-full transition-all duration-300" style={{ width: `${putRatio}%` }} />
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="grid grid-cols-2 gap-2 pt-1">
                          {/* Force UP */}
                          <button
                            onClick={() => handleSetAssetMarketMode(asset, 'FORCE_UP')}
                            className={cn(
                              "py-2.5 px-3 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 border",
                              currentAssetMode === 'FORCE_UP'
                                ? "bg-emerald-600 text-white border-emerald-300 shadow-lg shadow-emerald-600/30"
                                : "bg-emerald-950/40 hover:bg-emerald-600/30 text-emerald-300 border-emerald-500/30"
                            )}
                          >
                            <TrendingUp className="w-3.5 h-3.5" />
                            <span>🟢 GREEN (UP)</span>
                          </button>

                          {/* Force DOWN */}
                          <button
                            onClick={() => handleSetAssetMarketMode(asset, 'FORCE_DOWN')}
                            className={cn(
                              "py-2.5 px-3 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 border",
                              currentAssetMode === 'FORCE_DOWN'
                                ? "bg-rose-600 text-white border-rose-300 shadow-lg shadow-rose-600/30"
                                : "bg-rose-950/40 hover:bg-rose-600/30 text-rose-300 border-rose-500/30"
                            )}
                          >
                            <TrendingDown className="w-3.5 h-3.5" />
                            <span>🔴 RED (DOWN)</span>
                          </button>

                          {/* Auto Rig */}
                          <button
                            onClick={() => handleSetAssetMarketMode(asset, 'AUTO_HOUSE_WIN')}
                            className={cn(
                              "py-2.5 px-3 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 border",
                              currentAssetMode === 'AUTO_HOUSE_WIN'
                                ? "bg-amber-600 text-white border-amber-300 shadow-lg shadow-amber-600/30"
                                : "bg-amber-950/40 hover:bg-amber-600/30 text-amber-300 border-amber-500/30"
                            )}
                          >
                            <Zap className="w-3.5 h-3.5" />
                            <span>⚡ AUTO RIG</span>
                          </button>

                          {/* Reset */}
                          <button
                            onClick={() => handleSetAssetMarketMode(asset, 'NORMAL')}
                            className={cn(
                              "py-2.5 px-3 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 border",
                              currentAssetMode === 'NORMAL'
                                ? "bg-purple-600 text-white border-purple-300 shadow-lg shadow-purple-600/30"
                                : "bg-gray-800 hover:bg-gray-700 text-gray-300 border-white/10"
                            )}
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>🔄 RESET</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* SUPPORT DESK TAB */}
          {activeTab === 'support' && (
            <div className="space-y-6 animate-in slide-in-from-right duration-500">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-gray-900/40 p-6 rounded-[32px] border border-white/10 backdrop-blur-md">
                <div>
                  <h2 className="text-2xl font-black italic uppercase tracking-tight flex items-center gap-3">
                    <Headset className="w-7 h-7 text-rose-500" />
                    Customer Support Messages
                  </h2>
                  <p className="text-xs text-gray-400 mt-1">Review user issues, filter by email ID, and send replies directly</p>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <div className="relative flex-1 sm:w-72">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                      type="text"
                      placeholder="Filter by email or issue..."
                      value={supportFilter}
                      onChange={(e) => setSupportFilter(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder:text-gray-600 focus:outline-none focus:border-rose-500"
                    />
                  </div>
                </div>
              </div>

              {/* Messages List */}
              <div className="space-y-4">
                {supportMessages
                  .filter(m => 
                    !supportFilter || 
                    m.userEmail?.toLowerCase().includes(supportFilter.toLowerCase()) || 
                    m.issue?.toLowerCase().includes(supportFilter.toLowerCase()) ||
                    m.message?.toLowerCase().includes(supportFilter.toLowerCase())
                  )
                  .map((msg) => (
                    <div
                      key={msg.id}
                      className="bg-gray-900/40 border border-white/10 hover:border-rose-500/50 p-6 rounded-[28px] backdrop-blur-md transition-all space-y-4 group"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/5">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 font-bold">
                            <Mail className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="text-sm font-black text-white italic">{msg.userEmail || 'Guest User'}</span>
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-gray-400 font-mono">
                                ID: {msg.userId ? msg.userId.slice(0, 8) : 'N/A'}
                              </span>
                            </div>
                            <span className="text-xs text-rose-400 font-bold uppercase tracking-wider">{msg.issue}</span>
                          </div>
                        </div>

                        <div className="flex items-center space-x-3">
                          <span className={cn(
                            "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border",
                            msg.status === 'replied' ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" :
                            msg.status === 'resolved' ? "bg-blue-500/20 text-blue-400 border-blue-500/30" :
                            "bg-amber-500/20 text-amber-400 border-amber-500/30 animate-pulse"
                          )}>
                            {msg.status === 'replied' ? 'Replied' : msg.status === 'resolved' ? 'Resolved' : 'Pending Action'}
                          </span>
                          <span className="text-[11px] text-gray-500 font-medium">
                            {msg.timestamp?.toMillis ? new Date(msg.timestamp.toMillis()).toLocaleString() : 'Just now'}
                          </span>
                        </div>
                      </div>

                      <p className="text-sm text-gray-300 line-clamp-2 pl-2 border-l-2 border-rose-500/30 italic">
                        "{msg.message}"
                      </p>

                      <div className="flex items-center justify-between pt-2">
                        <div className="text-xs text-gray-500">
                          {msg.replies && msg.replies.length > 0 ? (
                            <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                              <MessageSquare className="w-3.5 h-3.5" />
                              {msg.replies.length} Reply Sent
                            </span>
                          ) : (
                            <span className="text-amber-400/80 font-medium">Awaiting Admin Response</span>
                          )}
                        </div>

                        <button
                          onClick={() => setSelectedSupport(msg)}
                          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white text-xs font-bold uppercase tracking-wider shadow-lg shadow-rose-500/20 transition-all active:scale-95 flex items-center gap-2"
                        >
                          <span>Open Full Page</span>
                          <MessageSquare className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}

                {supportMessages.length === 0 && (
                  <div className="text-center py-16 bg-gray-900/20 border border-white/5 rounded-[32px]">
                    <Headset className="w-12 h-12 text-gray-600 mx-auto mb-3 opacity-40" />
                    <p className="text-sm text-gray-400 font-bold uppercase tracking-wider">No support messages found</p>
                    <p className="text-xs text-gray-600 mt-1">User inquiries will appear here in real-time</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="space-y-8 animate-in slide-in-from-right duration-500">
              {/* User Matrix */}
              <div className="bg-gray-900/40 border border-white/10 rounded-[32px] overflow-hidden backdrop-blur-md shadow-2xl">
                <div className="p-6 border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-6 bg-white/5">
                  <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                    <input 
                      type="text" 
                      placeholder="SCAN USER MATRIX BY EMAIL, NAME, OR ID..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-xs font-black uppercase tracking-widest focus:outline-none focus:border-purple-500 transition-all placeholder:text-gray-700"
                    />
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-white/10 bg-white/5">
                        <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-500">Subject Identity & Email</th>
                        <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-500">Virtual Balance</th>
                        <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-500">Asset Liquidity</th>
                        <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-500 text-center">Protocol Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {filteredUsers.map(u => (
                        <tr key={u.id} className="hover:bg-white/10 transition-all group">
                          <td className="px-8 py-6">
                            <div className="font-black text-sm text-white flex items-center gap-2">
                              {u.displayName || u.name || (u.email ? u.email.split('@')[0] : 'User')}
                              {(u.email === 'rajsjarma8@gmail.com' || u.email === 'rajsharma8@gmail.com') && <ShieldCheck className="w-4 h-4 text-purple-500" />}
                            </div>
                            {u.email ? (
                              <div className="text-xs text-cyan-400 font-bold flex items-center gap-1.5 mt-1 font-mono">
                                <Mail className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                                <span className="select-all">{u.email}</span>
                              </div>
                            ) : (
                              <div className="text-xs text-amber-400/80 font-mono italic mt-0.5">No Email</div>
                            )}
                            <div className="text-[10px] text-gray-500 font-mono tracking-wider mt-0.5">ID: {u.id}</div>
                          </td>
                          <td className="px-8 py-6">
                            <div className="text-sm text-blue-400 font-black tracking-tighter">${u.demoBalance?.toLocaleString()}</div>
                            <div className="text-[8px] text-gray-600 font-black uppercase tracking-widest">Demo Vault</div>
                          </td>
                          <td className="px-8 py-6">
                            <div className="text-sm text-green-400 font-black tracking-tighter">${u.realBalance?.toLocaleString()}</div>
                            <div className="text-[8px] text-gray-600 font-black uppercase tracking-widest">Real Liquidity</div>
                          </td>
                          <td className="px-8 py-6">
                            <div className="flex items-center justify-center gap-2">
                              <button 
                                onClick={() => setEditingUser(u)}
                                className="p-2.5 bg-purple-500/10 hover:bg-purple-500 text-purple-400 hover:text-white rounded-xl transition-all border border-purple-500/20 shadow-lg active:scale-90"
                                title="Edit Balance"
                              >
                                <Wallet className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => setHistoryUser(u)}
                                className="p-2.5 bg-blue-500/10 hover:bg-blue-500 text-blue-400 hover:text-white rounded-xl transition-all border border-blue-500/20 shadow-lg active:scale-90"
                                title="View History"
                              >
                                <History className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => setConfirmAction({ type: 'reset', user: u })}
                                className="p-2.5 bg-amber-500/10 hover:bg-amber-500 text-amber-400 hover:text-white rounded-xl transition-all border border-amber-500/20 shadow-lg active:scale-90"
                                title="Reset Account"
                              >
                                <RotateCcw className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => setConfirmAction({ type: 'delete', user: u })}
                                className="p-2.5 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white rounded-xl transition-all border border-red-500/20 shadow-lg active:scale-90"
                                title="Delete User"
                              >
                                <UserMinus className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'trades' && (
            <div className="bg-gray-900/40 border border-white/10 rounded-[32px] overflow-hidden backdrop-blur-md shadow-2xl">
              <div className="p-6 bg-white/5 border-b border-white/10">
                <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-3 italic">
                  <BarChart3 className="w-5 h-5 text-purple-500 animate-pulse" />
                  Live Order Flux Pipeline
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-500">Temporal Index</th>
                      <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-500">Asset Vector</th>
                      <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-500">Logic Mode</th>
                      <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-500">Quantum Value</th>
                      <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-500">Settlement</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {recentTrades.map(t => (
                      <tr key={t.id} className="hover:bg-white/10 transition-all">
                        <td className="px-8 py-6 text-[10px] text-gray-500 font-black tracking-widest uppercase">
                          {t.createdAt?.toMillis ? new Date(t.createdAt.toMillis()).toLocaleString() : 'VOID'}
                        </td>
                        <td className="px-8 py-6 text-xs font-black text-white italic tracking-wider">{t.asset}</td>
                        <td className="px-8 py-6">
                          <span className={cn(
                            "text-[9px] font-black px-3 py-1 rounded-full border tracking-widest uppercase",
                            t.action === 'CALL' ? "text-green-400 bg-green-500/10 border-green-500/20" : "text-red-400 bg-red-500/10 border-red-500/20"
                          )}>
                            {t.action}
                          </span>
                        </td>
                        <td className="px-8 py-6 text-sm font-black text-white italic tracking-tighter">${t.amount}</td>
                        <td className="px-8 py-6">
                          <span className={cn(
                            "text-[9px] font-black px-3 py-1 rounded-full tracking-widest uppercase",
                            t.status === 'WIN' ? "bg-green-500 text-black shadow-[0_0_15px_rgba(34,197,94,0.5)]" : 
                            t.status === 'LOSS' ? "bg-red-500 text-white shadow-[0_0_15px_rgba(239,44,44,0.5)]" : "bg-blue-500 text-white animate-pulse"
                          )}>
                            {t.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="max-w-4xl mx-auto space-y-8 animate-in slide-in-from-right duration-500">
              {/* Notification Banner */}
              {saveSuccessMsg && (
                <div className="p-4 bg-emerald-500/20 border border-emerald-500/50 rounded-2xl flex items-center justify-between gap-3 text-emerald-300 text-xs font-bold animate-in fade-in slide-in-from-top-2 duration-300 shadow-lg shadow-emerald-500/10">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                    <span>{saveSuccessMsg}</span>
                  </div>
                  <button onClick={() => setSaveSuccessMsg('')} className="p-1 hover:text-white">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-black tracking-tighter uppercase italic">App Configuration</h2>
                  <p className="text-[10px] text-gray-500 font-black uppercase tracking-[0.3em]">Master Protocol Settings</p>
                </div>
                <button 
                  onClick={handleSaveSettings}
                  disabled={isSaving}
                  className={cn(
                    "px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all flex items-center gap-3 active:scale-95 cursor-pointer",
                    isSaving 
                      ? "bg-green-500 text-black shadow-[0_0_20px_rgba(34,197,94,0.5)]" 
                      : "bg-purple-600 text-white shadow-[0_0_20px_rgba(168,85,247,0.5)] hover:bg-purple-500"
                  )}
                >
                  {isSaving ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Quantum Sync...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Save Configuration
                    </>
                  )}
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Identity & Branding */}
                <div className="bg-gray-900/40 border border-white/10 rounded-[32px] p-8 space-y-6 backdrop-blur-md">
                  <div className="flex items-center justify-between text-purple-400">
                    <div className="flex items-center gap-3">
                      <ShieldAlert className="w-5 h-5" />
                      <h3 className="text-xs font-black uppercase tracking-widest">Platform Identity</h3>
                    </div>
                    <span className="text-[9px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-bold uppercase tracking-wider">
                      Live Branding
                    </span>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2 px-1">
                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block">Website Display Name</label>
                        <span className="text-[9px] text-cyan-400 font-bold uppercase">Two-Color Design</span>
                      </div>
                      <div className="flex gap-2">
                        <input 
                          type="text" 
                          value={settings.platformName}
                          onChange={(e) => setSettings(prev => ({ ...prev, platformName: e.target.value }))}
                          placeholder="e.g. SwiftTrade"
                          className="flex-1 bg-black/40 border border-white/10 rounded-2xl px-4 py-3.5 text-sm font-black italic focus:outline-none focus:border-cyan-500 transition-all text-white"
                        />
                        <button
                          type="button"
                          onClick={handleSaveSettings}
                          disabled={isSaving}
                          className="px-4 py-3.5 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white rounded-2xl text-xs font-black uppercase tracking-wider shadow-md shadow-cyan-500/20 active:scale-95 transition cursor-pointer shrink-0"
                          title="Save Name Now"
                        >
                          {isSaving ? "Saving..." : "Save Name"}
                        </button>
                      </div>

                      {/* Live Brand Preview */}
                      <div className="mt-3 p-3 bg-black/60 rounded-xl border border-white/10 flex items-center justify-between">
                        <span className="text-[9px] uppercase tracking-widest text-gray-500 font-bold">Logo Preview:</span>
                        <BrandLogo name={settings.platformName} />
                      </div>
                    </div>
                    <div>
                      <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest block mb-2 px-1">API Secret Key (Quantum)</label>
                      <input 
                        type="password" 
                        value={settings.apiSecretKey}
                        onChange={(e) => setSettings(prev => ({ ...prev, apiSecretKey: e.target.value }))}
                        className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-4 text-sm font-mono focus:outline-none focus:border-purple-500 transition-all text-purple-300"
                      />
                    </div>
                  </div>
                </div>

                {/* Monetary Protocols */}
                <div className="bg-gray-900/40 border border-white/10 rounded-[32px] p-8 space-y-6 backdrop-blur-md">
                  <div className="flex items-center gap-3 text-green-400">
                    <Wallet className="w-5 h-5" />
                    <h3 className="text-xs font-black uppercase tracking-widest">Monetary Protocols</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest block mb-2 px-1">Default Demo Balance</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-green-500">$</span>
                        <input 
                          type="number" 
                          value={settings.defaultDemoBalance === undefined || isNaN(settings.defaultDemoBalance) ? '' : settings.defaultDemoBalance}
                          onChange={(e) => {
                            const val = e.target.value;
                            setSettings(prev => ({ ...prev, defaultDemoBalance: val === '' ? ('' as any) : Number(val) }));
                          }}
                          className="w-full bg-black/40 border border-white/10 rounded-2xl pl-10 pr-4 py-4 text-sm font-black focus:outline-none focus:border-green-500 transition-all text-white"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest block mb-2 px-1">Min. Extraction</label>
                        <input 
                          type="number" 
                          value={settings.minWithdrawal === undefined || isNaN(settings.minWithdrawal) ? '' : settings.minWithdrawal}
                          onChange={(e) => {
                            const val = e.target.value;
                            setSettings(prev => ({ ...prev, minWithdrawal: val === '' ? ('' as any) : Number(val) }));
                          }}
                          className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-4 text-sm font-black focus:outline-none focus:border-green-500 transition-all text-white"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest block mb-2 px-1">Max. Cap</label>
                        <input 
                          type="number" 
                          value={settings.maxWithdrawal === undefined || isNaN(settings.maxWithdrawal) ? '' : settings.maxWithdrawal}
                          onChange={(e) => {
                            const val = e.target.value;
                            setSettings(prev => ({ ...prev, maxWithdrawal: val === '' ? ('' as any) : Number(val) }));
                          }}
                          className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-4 text-sm font-black focus:outline-none focus:border-green-500 transition-all text-white"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Cryptomus Gateway Protocol */}
                <div className="bg-gray-900/40 border border-purple-500/30 rounded-[32px] p-8 space-y-6 backdrop-blur-md md:col-span-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 text-purple-400">
                      <Wallet className="w-5 h-5 text-purple-400" />
                      <h3 className="text-xs font-black uppercase tracking-widest">Cryptomus Automated Crypto Gateway Setup</h3>
                    </div>
                    <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40">
                      USDT • BTC • ETH • SOL
                    </span>
                  </div>

                  <p className="text-xs text-gray-400">
                    Connect your official Cryptomus merchant credentials for instant automated crypto payments. If left empty or during testing, the app activates Sandbox Simulation mode to allow seamless zero-risk test approvals.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-2 px-1">
                        Cryptomus Merchant ID (UUID)
                      </label>
                      <input 
                        type="text" 
                        value={settings.cryptomusMerchantId || ''}
                        onChange={(e) => setSettings(prev => ({ ...prev, cryptomusMerchantId: e.target.value }))}
                        placeholder="e0c85ddd-cc53-444a-b2cc-74f30d4c525c"
                        className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-4 text-sm font-mono focus:outline-none focus:border-purple-500 transition-all text-white placeholder:text-gray-600"
                      />
                    </div>

                    <div>
                      <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-2 px-1">
                        Cryptomus Payment API Key
                      </label>
                      <input 
                        type="password" 
                        value={settings.cryptomusApiKey || ''}
                        onChange={(e) => setSettings(prev => ({ ...prev, cryptomusApiKey: e.target.value }))}
                        placeholder="Paste your Cryptomus API Key..."
                        className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-4 text-sm font-mono focus:outline-none focus:border-purple-500 transition-all text-purple-300 placeholder:text-gray-600"
                      />
                    </div>
                  </div>
                </div>

                {/* System Toggles */}
                <div className="bg-gray-900/40 border border-white/10 rounded-[32px] p-8 space-y-6 backdrop-blur-md md:col-span-2">
                  <div className="flex items-center gap-3 text-amber-400">
                    <Settings className="w-5 h-5" />
                    <h3 className="text-xs font-black uppercase tracking-widest">Global System Toggles</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="flex items-center gap-2">
                      <button 
                        type="button"
                        onClick={() => {
                          const next = !settings.soundEnabled;
                          setSettings(prev => ({ ...prev, soundEnabled: next }));
                          soundManager.setSoundEnabled(next);
                          if (next) soundManager.playTestSound();
                        }}
                        className={cn(
                          "flex-1 flex items-center justify-between p-5 rounded-2xl border transition-all cursor-pointer",
                          settings.soundEnabled ? "bg-purple-500/15 border-purple-500/40 text-white" : "bg-white/5 border-white/10 opacity-60 text-gray-400"
                        )}
                      >
                        <div className="text-left">
                          <div className="text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5">
                            {settings.soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-purple-400" /> : <VolumeX className="w-3.5 h-3.5 text-gray-400" />}
                            Trading SFX
                          </div>
                          <div className="text-[8px] text-gray-400 font-bold uppercase mt-0.5">
                            {settings.soundEnabled ? "Audio On" : "Audio Off"}
                          </div>
                        </div>
                        <div className={cn("w-10 h-6 rounded-full relative transition-all", settings.soundEnabled ? "bg-purple-500" : "bg-gray-800")}>
                          <div className={cn("absolute top-1 w-4 h-4 rounded-full bg-white transition-all shadow-sm", settings.soundEnabled ? "right-1" : "left-1")} />
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => soundManager.playTestSound()}
                        className="px-3 py-5 bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/40 rounded-2xl text-purple-300 font-bold text-xs uppercase tracking-wider transition cursor-pointer flex flex-col items-center justify-center shrink-0 active:scale-95"
                        title="Play Test Chime"
                      >
                        <Volume2 className="w-4 h-4 mb-0.5 text-purple-300" />
                        <span className="text-[8px] font-black">Test</span>
                      </button>
                    </div>

                    <button 
                      type="button"
                      onClick={() => setSettings(prev => ({ ...prev, isMaintenance: !prev.isMaintenance }))}
                      className={cn(
                        "flex items-center justify-between p-5 rounded-2xl border transition-all cursor-pointer",
                        settings.isMaintenance ? "bg-red-500/10 border-red-500/30" : "bg-white/5 border-white/10 opacity-50"
                      )}
                    >
                      <div className="text-left">
                        <div className="text-[10px] font-black uppercase tracking-widest text-white">Maintenance Mode</div>
                        <div className="text-[8px] text-gray-500 font-bold uppercase">Lock public access</div>
                      </div>
                      <div className={cn("w-10 h-6 rounded-full relative transition-all", settings.isMaintenance ? "bg-red-500" : "bg-gray-800")}>
                        <div className={cn("absolute top-1 w-4 h-4 rounded-full bg-white transition-all shadow-sm", settings.isMaintenance ? "right-1" : "left-1")} />
                      </div>
                    </button>

                    <div className="flex items-center justify-center p-5 rounded-2xl border border-white/5 bg-white/5 opacity-30 cursor-not-allowed">
                       <div className="text-center">
                        <div className="text-[10px] font-black uppercase tracking-widest">KYC Protocol</div>
                        <div className="text-[8px] text-gray-500 font-bold uppercase italic">V2 Quantum Required</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Real-Time Notification & Alert Dispatcher */}
                <div className="bg-gray-900/40 border border-white/10 rounded-[32px] p-8 space-y-6 backdrop-blur-md md:col-span-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 text-cyan-400">
                      <Bell className="w-5 h-5" />
                      <h3 className="text-xs font-black uppercase tracking-widest">Send Notification & Sound Alert to Users</h3>
                    </div>
                    <span className="text-[9px] text-emerald-400 font-bold uppercase tracking-wider flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      Live Real-Time
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block px-1">Alert Title</label>
                      <input 
                        type="text" 
                        value={broadcastTitle}
                        onChange={(e) => setBroadcastTitle(e.target.value)}
                        placeholder="e.g. SwiftTrade Announcement 🎉"
                        className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3.5 text-sm font-bold focus:outline-none focus:border-cyan-500 transition-all text-white"
                      />
                    </div>

                    <div className="space-y-1 md:col-span-2">
                      <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block px-1">Message Description</label>
                      <div className="flex gap-2">
                        <input 
                          type="text" 
                          value={broadcastMessage}
                          onChange={(e) => setBroadcastMessage(e.target.value)}
                          placeholder="e.g. Special deposit bonus is now active! Happy trading!"
                          className="flex-1 bg-black/40 border border-white/10 rounded-2xl px-4 py-3.5 text-sm focus:outline-none focus:border-cyan-500 transition-all text-white"
                        />
                        <button
                          type="button"
                          onClick={handleSendBroadcast}
                          disabled={!broadcastTitle.trim() || !broadcastMessage.trim() || isSendingBroadcast}
                          className="px-5 py-3.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-40 text-white rounded-2xl text-xs font-black uppercase tracking-wider shadow-lg shadow-cyan-500/20 active:scale-95 transition cursor-pointer shrink-0 flex items-center gap-1.5"
                        >
                          <Send className="w-3.5 h-3.5" />
                          {isSendingBroadcast ? "Sending..." : "Send Alert"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'analytics' && (
            <div className="space-y-8 animate-in slide-in-from-right duration-500">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-black tracking-tighter uppercase italic">Signal Analytics</h2>
                  <p className="text-[10px] text-gray-500 font-black uppercase tracking-[0.3em]">Neural Performance Metrics</p>
                </div>
                <div className="flex items-center gap-3 px-4 py-2 bg-purple-500/10 border border-purple-500/20 rounded-full">
                  <Activity className="w-4 h-4 text-purple-500" />
                  <span className="text-[10px] font-black text-purple-400 uppercase tracking-widest">Real-time Stream</span>
                </div>
              </div>

              {/* Analytics Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[
                  { 
                    label: 'Quantum Win Rate', 
                    val: recentTrades.filter(t => t.status !== 'ACTIVE').length > 0 
                      ? `${Math.round((recentTrades.filter(t => t.status === 'WIN').length / recentTrades.filter(t => t.status !== 'ACTIVE').length) * 100)}%` 
                      : '85%', 
                    desc: 'Global signal accuracy across all nodes.',
                    icon: ShieldCheck, 
                    color: 'text-green-400',
                    bg: 'bg-green-500/10'
                  },
                  { 
                    label: 'Cumulative Volume', 
                    val: `$${recentTrades.reduce((acc, t) => acc + t.amount, 0).toLocaleString()}`, 
                    desc: 'Total liquidity processed through signal flux.',
                    icon: Wallet, 
                    color: 'text-blue-400',
                    bg: 'bg-blue-500/10'
                  },
                  { 
                    label: 'Node Density', 
                    val: users.length, 
                    desc: 'Total verified identities in user matrix.',
                    icon: Users, 
                    color: 'text-purple-400',
                    bg: 'bg-purple-500/10'
                  },
                  { 
                    label: 'Dominant Asset', 
                    val: recentTrades.length > 0 ? [...new Set(recentTrades.map(t => t.asset))].sort((a,b) => 
                      recentTrades.filter(t => t.asset === b).length - recentTrades.filter(t => t.asset === a).length
                    )[0] : 'EUR/USD', 
                    desc: 'Highest frequency vector in trade flux.',
                    icon: BarChart3, 
                    color: 'text-amber-400',
                    bg: 'bg-amber-500/10'
                  },
                  { 
                    label: 'Active Signals', 
                    val: recentTrades.filter(t => t.status === 'ACTIVE').length, 
                    desc: 'Unresolved orders currently in the pipeline.',
                    icon: Activity, 
                    color: 'text-red-400',
                    bg: 'bg-red-500/10'
                  },
                  { 
                    label: 'System Uptime', 
                    val: '99.98%', 
                    desc: 'Infrastructure stability and node sync health.',
                    icon: RefreshCw, 
                    color: 'text-cyan-400',
                    bg: 'bg-cyan-500/10'
                  }
                ].map((stat, idx) => (
                  <div key={idx} className="bg-gray-900/40 border border-white/10 rounded-[32px] p-8 space-y-6 backdrop-blur-md relative overflow-hidden group">
                    <div className={cn("absolute top-0 right-0 w-24 h-24 blur-[50px] opacity-20", stat.bg)} />
                    <div className="relative z-10 flex items-center justify-between">
                      <div className={cn("p-3 rounded-2xl border border-white/5", stat.bg)}>
                        <stat.icon className={cn("w-6 h-6", stat.color)} />
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-black tracking-tighter italic">{stat.val}</div>
                        <div className="text-[9px] font-black text-gray-500 uppercase tracking-widest">{stat.label}</div>
                      </div>
                    </div>
                    <p className="text-[10px] text-gray-400 font-bold leading-relaxed">{stat.desc}</p>
                    <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                      <div className={cn("h-full w-2/3 rounded-full animate-pulse", stat.bg.replace('/10', ''))} />
                    </div>
                  </div>
                ))}
              </div>

              {/* Data Transparency Note */}
              <div className="bg-purple-500/5 border border-purple-500/10 rounded-2xl p-6 flex items-start gap-4">
                <ShieldAlert className="w-5 h-5 text-purple-500 shrink-0" />
                <div>
                  <h4 className="text-xs font-black uppercase tracking-widest mb-1">Quantum Sync Note</h4>
                  <p className="text-[10px] text-gray-500 font-bold leading-relaxed">Analytics are derived from the latest 100 signal packets. For deep historical audits, access the Cold Storage Database through the Infrastructure settings.</p>
                </div>
              </div>
            </div>
          )}

          {/* DEPOSIT REQUESTS MODULE */}
          {activeTab === 'deposits' && (
            <div className="space-y-6 animate-in slide-in-from-right duration-500">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-gray-900/40 p-6 rounded-[32px] border border-white/10 backdrop-blur-md">
                <div>
                  <h2 className="text-2xl font-black italic uppercase tracking-tight flex items-center gap-3 text-white">
                    <Wallet className="w-7 h-7 text-green-500" />
                    Deposit Requests ({deposits.filter(d => d.status === 'PENDING').length} Pending)
                  </h2>
                  <p className="text-xs text-gray-400 mt-1">Verify user UTR/Reference numbers and approve or reject deposit liquidity</p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-400 font-mono text-xs rounded-xl font-bold">
                    Pending: ₹{deposits.filter(d => d.status === 'PENDING').reduce((acc, d) => acc + (d.amountINR || 0), 0).toLocaleString()}
                  </span>
                  <span className="px-3 py-1 bg-green-500/10 border border-green-500/20 text-green-400 font-mono text-xs rounded-xl font-bold">
                    Total Approved: ${deposits.filter(d => d.status === 'APPROVED').reduce((acc, d) => acc + (d.amountUSD || 0), 0).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Deposit Cards / Table */}
              <div className="space-y-4">
                {deposits.map((dep) => (
                  <div
                    key={dep.id}
                    className="bg-gray-900/60 border border-white/10 hover:border-green-500/40 p-6 rounded-[28px] backdrop-blur-md transition-all space-y-4 shadow-xl"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
                      <div className="flex items-center space-x-3">
                        <div className={cn(
                          "w-12 h-12 rounded-2xl border flex items-center justify-center font-black text-lg",
                          dep.paymentMethod === 'cryptomus'
                            ? "bg-purple-500/20 border-purple-500/40 text-purple-300"
                            : "bg-green-500/20 border-green-500/30 text-green-400"
                        )}>
                          {dep.paymentMethod === 'cryptomus' ? '₮' : '₹'}
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="text-base font-black text-white">{dep.userEmail || dep.userName || 'User'}</span>
                            <span className={cn(
                              "text-[10px] px-2 py-0.5 rounded-full font-mono font-bold uppercase",
                              dep.paymentMethod === 'cryptomus' 
                                ? "bg-purple-500/30 text-purple-300 border border-purple-500/40"
                                : "bg-white/10 text-gray-300"
                            )}>
                              {dep.paymentMethod === 'cryptomus' 
                                ? `CRYPTOMUS (${(dep as any).currency || 'USDT'})` 
                                : (dep.paymentMethod?.toUpperCase() || 'UPI')}
                            </span>
                          </div>
                          <p className="text-xs text-gray-400 mt-0.5 font-mono">
                            {dep.paymentMethod === 'cryptomus' ? 'Invoice / Order ID: ' : 'UTR / Ref: '}
                            <span className="text-amber-400 font-bold select-all">
                              {(dep as any).invoiceId || (dep as any).orderId || dep.utrNumber || 'N/A'}
                            </span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <div className="text-xl font-black text-green-400">
                            ${dep.amountUSD || Math.round((dep.amountINR || 0) / 85) || 0} USD
                          </div>
                          <div className="text-xs text-gray-400 font-mono font-bold">
                            {dep.paymentMethod === 'cryptomus' 
                              ? `${(dep as any).cryptoAmount || ''} ${(dep as any).currency || 'USDT'}`
                              : `≈ ₹${dep.amountINR?.toLocaleString() || 0}`}
                          </div>
                        </div>

                        <span className={cn(
                          "px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider border",
                          dep.status === 'APPROVED' ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40" :
                          dep.status === 'REJECTED' ? "bg-rose-500/20 text-rose-400 border-rose-500/40" :
                          "bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse"
                        )}>
                          {dep.status}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      <span className="text-gray-400 font-mono">
                        Date: {dep.createdAt?.toMillis ? new Date(dep.createdAt.toMillis()).toLocaleString() : 'Just now'}
                      </span>

                      {dep.status === 'PENDING' && (
                        <div className="flex items-center space-x-3">
                          <button
                            onClick={() => handleRejectDeposit(dep)}
                            className="px-5 py-2.5 rounded-xl bg-rose-600/20 hover:bg-rose-600 border border-rose-500/40 text-rose-300 hover:text-white font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 active:scale-95"
                          >
                            <XCircle className="w-4 h-4" />
                            <span>Reject Request</span>
                          </button>

                          <button
                            onClick={() => handleApproveDeposit(dep)}
                            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-black uppercase tracking-wider shadow-lg shadow-green-500/30 transition-all flex items-center gap-2 active:scale-95"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Approve & Add Balance</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {deposits.length === 0 && (
                  <div className="text-center py-16 bg-gray-900/20 border border-white/5 rounded-[32px]">
                    <Wallet className="w-12 h-12 text-gray-600 mx-auto mb-3 opacity-40" />
                    <p className="text-sm text-gray-400 font-bold uppercase tracking-wider">No deposit requests yet</p>
                    <p className="text-xs text-gray-600 mt-1">User deposits via UPI / Card / Bank will show up here</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* WITHDRAWAL REQUESTS MODULE */}
          {activeTab === 'withdrawals' && (
            <div className="space-y-6 animate-in slide-in-from-right duration-500">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-gray-900/40 p-6 rounded-[32px] border border-white/10 backdrop-blur-md">
                <div>
                  <h2 className="text-2xl font-black italic uppercase tracking-tight flex items-center gap-3 text-white">
                    <History className="w-7 h-7 text-amber-500" />
                    Withdrawal Requests ({withdrawals.filter(w => w.status === 'PENDING').length} Pending)
                  </h2>
                  <p className="text-xs text-gray-400 mt-1">Process outgoing payout extractions to user bank accounts or UPI IDs</p>
                </div>
              </div>

              <div className="space-y-4">
                {withdrawals.map((w) => (
                  <div
                    key={w.id}
                    className="bg-gray-900/60 border border-white/10 hover:border-amber-500/40 p-6 rounded-[28px] backdrop-blur-md transition-all space-y-4 shadow-xl"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-base font-black text-white">{w.userEmail || w.userName || 'User'}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-gray-300 font-mono font-bold">
                            {w.method || 'Bank'}
                          </span>
                        </div>
                        <p className="text-xs text-amber-300 mt-1 font-mono">
                          Account/UPI: <span className="font-bold select-all">{w.details || 'N/A'}</span>
                        </p>
                      </div>

                      <div className="flex items-center space-x-4">
                        <div className="text-xl font-black text-amber-400">${w.amount?.toLocaleString() || 0}</div>
                        <span className={cn(
                          "px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider border",
                          w.status === 'APPROVED' ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40" :
                          w.status === 'REJECTED' ? "bg-rose-500/20 text-rose-400 border-rose-500/40" :
                          "bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse"
                        )}>
                          {w.status}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-400 font-mono">
                        Requested: {w.createdAt?.toMillis ? new Date(w.createdAt.toMillis()).toLocaleString() : 'Just now'}
                      </span>

                      {w.status === 'PENDING' && (
                        <div className="flex items-center space-x-3">
                          <button
                            onClick={() => handleRejectWithdrawal(w)}
                            className="px-5 py-2.5 rounded-xl bg-rose-600/20 hover:bg-rose-600 border border-rose-500/40 text-rose-300 hover:text-white font-bold uppercase tracking-wider transition-all active:scale-95"
                          >
                            Reject & Refund
                          </button>
                          <button
                            onClick={() => handleApproveWithdrawal(w)}
                            className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase tracking-wider transition-all active:scale-95"
                          >
                            Approve Payout
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {withdrawals.length === 0 && (
                  <div className="text-center py-16 bg-gray-900/20 border border-white/5 rounded-[32px]">
                    <History className="w-12 h-12 text-gray-600 mx-auto mb-3 opacity-40" />
                    <p className="text-sm text-gray-400 font-bold uppercase tracking-wider">No withdrawal requests yet</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* History Modal */}
      <AnimatePresence>
        {historyUser && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setHistoryUser(null)}
              className="absolute inset-0 bg-black/90 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 30 }}
              className="relative w-full max-w-2xl bg-[#0F1419] border border-white/10 rounded-[40px] overflow-hidden flex flex-col max-h-[80vh] shadow-[0_0_100px_rgba(168,85,247,0.15)]"
            >
              <div className="p-8 border-b border-white/10 bg-white/5 flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className="p-4 bg-blue-500/10 rounded-2xl border border-blue-500/20">
                    <History className="w-6 h-6 text-blue-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black tracking-tighter uppercase italic">User Signal History</h2>
                    {historyUser.email && (
                      <p className="text-xs text-cyan-400 font-mono font-bold flex items-center gap-1.5 mt-0.5">
                        <Mail className="w-3.5 h-3.5" />
                        <span>{historyUser.email}</span>
                      </p>
                    )}
                    <p className="text-[10px] text-gray-500 font-mono tracking-widest uppercase">{historyUser.displayName || historyUser.name || 'User'} // {historyUser.id}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setHistoryUser(null)}
                  className="p-3 hover:bg-white/10 rounded-2xl transition-all active:scale-90"
                >
                  <X className="w-6 h-6 text-gray-500" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {userTrades.length === 0 ? (
                  <div className="h-64 flex flex-col items-center justify-center text-gray-600">
                    <Activity className="w-12 h-12 mb-4 opacity-20" />
                    <span className="text-xs font-black uppercase tracking-widest">No signals recorded for this node</span>
                  </div>
                ) : (
                  userTrades.map(t => (
                    <div key={t.id} className="bg-white/5 border border-white/5 rounded-2xl p-4 flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="text-xs font-black text-white italic">{t.asset}</div>
                        <div className="text-[9px] text-gray-500 font-black uppercase tracking-widest">
                          {t.createdAt?.toMillis ? new Date(t.createdAt.toMillis()).toLocaleString() : 'N/A'}
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <div className="text-sm font-black text-white">${t.amount}</div>
                          <div className={cn(
                            "text-[8px] font-black uppercase tracking-[0.2em]",
                            t.action === 'CALL' ? "text-green-500" : "text-red-500"
                          )}>
                            {t.action}
                          </div>
                        </div>
                        <div className={cn(
                          "px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest",
                          t.status === 'WIN' ? "bg-green-500 text-black" : 
                          t.status === 'LOSS' ? "bg-red-500 text-white" : "bg-blue-500 text-white"
                        )}>
                          {t.status}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {confirmAction && (
          <div className="fixed inset-0 z-[130] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setConfirmAction(null)}
              className="absolute inset-0 bg-black/95 backdrop-blur-xl"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 40 }}
              className="relative w-full max-w-sm bg-[#0F1419] border border-red-500/30 rounded-[40px] p-10 text-center shadow-[0_0_50px_rgba(239,44,44,0.2)]"
            >
              <div className="w-20 h-20 bg-red-500/10 rounded-3xl flex items-center justify-center mx-auto mb-8 border border-red-500/20">
                <AlertTriangle className="w-10 h-10 text-red-500 animate-bounce" />
              </div>
              <h2 className="text-2xl font-black tracking-tighter uppercase italic mb-4">CRITICAL PROTOCOL</h2>
              <p className="text-xs text-gray-400 font-bold leading-relaxed mb-10">
                You are about to <span className="text-red-500 uppercase">{confirmAction.type}</span> the account for <span className="text-white">"{confirmAction.user.displayName}"</span>. This action is irreversible within the current block.
              </p>

              <div className="flex flex-col gap-4">
                <button 
                  onClick={() => confirmAction.type === 'reset' ? handleResetAccount(confirmAction.user) : handleDeleteUser(confirmAction.user)}
                  className="w-full bg-red-600 hover:bg-red-500 text-white font-black py-5 rounded-[24px] shadow-[0_0_30px_rgba(239,44,44,0.4)] transition-all uppercase tracking-[0.2em] text-xs active:scale-95"
                >
                  Confirm Execution
                </button>
                <button 
                  onClick={() => setConfirmAction(null)}
                  className="w-full bg-gray-900 text-gray-500 font-black py-5 rounded-[24px] border border-white/5 hover:text-white transition-all uppercase tracking-[0.2em] text-xs"
                >
                  Abord Action
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* FULL PAGE WHATSAPP-STYLE SUPPORT CHAT DESK FOR ADMIN */}
      <AnimatePresence>
        {selectedSupport && (
          <div className="fixed inset-0 z-[200] bg-[#0b141a] text-white flex flex-col w-full h-full overflow-hidden animate-in fade-in zoom-in-95 duration-200 font-sans">
            {/* WHATSAPP TOP HEADER */}
            <div className="flex items-center justify-between px-4 sm:px-8 py-3 bg-[#202c33] border-b border-gray-800 sticky top-0 z-20 shadow-md">
              <div className="flex items-center space-x-3 sm:space-x-4">
                <button
                  onClick={() => setSelectedSupport(null)}
                  className="p-2 rounded-full hover:bg-white/10 text-gray-300 hover:text-white transition-colors"
                >
                  <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>

                {/* User Avatar */}
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center text-white font-bold text-base shadow border border-white/10 uppercase">
                    {selectedSupport.userEmail ? selectedSupport.userEmail[0] : 'U'}
                  </div>
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-[#202c33] rounded-full" />
                </div>

                <div>
                  <h1 className="text-sm sm:text-base font-bold text-white flex items-center gap-2 leading-tight">
                    <span>{selectedSupport.userEmail || 'Guest User'}</span>
                    <span className="text-[10px] bg-[#00a884]/20 text-[#00a884] px-2 py-0.5 rounded font-mono font-bold uppercase">
                      📌 {selectedSupport.issue}
                    </span>
                  </h1>
                  <p className="text-[11px] text-gray-400 font-mono">
                    User ID: {selectedSupport.userId}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                {/* Status Switcher Buttons */}
                <div className="flex items-center space-x-1 p-1 bg-[#111b21] border border-gray-700/60 rounded-xl">
                  {(['pending', 'replied', 'resolved'] as const).map((st) => (
                    <button
                      key={st}
                      onClick={() => handleUpdateSupportStatus(selectedSupport.id, st)}
                      className={cn(
                        "px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all",
                        selectedSupport.status === st 
                          ? st === 'replied' ? "bg-[#00a884] text-white shadow"
                            : st === 'resolved' ? "bg-blue-600 text-white shadow"
                            : "bg-amber-500 text-black shadow"
                          : "text-gray-400 hover:text-white"
                      )}
                    >
                      {st}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => setSelectedSupport(null)}
                  className="p-2 rounded-full hover:bg-rose-500/20 hover:text-rose-400 text-gray-300 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* CHAT THREAD AREA */}
            <div className="flex-1 overflow-y-auto bg-[#0b141a] p-4 sm:p-8 relative flex flex-col justify-between"
                 style={{
                   backgroundImage: `radial-gradient(#1f2c34 1px, transparent 1px)`,
                   backgroundSize: '24px 24px'
                 }}>
              
              <div className="max-w-4xl w-full mx-auto space-y-4 flex-1 flex flex-col justify-between">
                <div>
                  {/* Encryption Header Banner */}
                  <div className="text-center my-1 mb-4">
                    <span className="inline-block px-3 py-1.5 rounded-lg bg-[#182229] border border-amber-500/20 text-amber-300 text-[11px] font-medium shadow">
                      🔒 WhatsApp Style Admin Desk • Chatting with {selectedSupport.userEmail}
                    </span>
                  </div>

                  {/* Selected Reason Header Tag */}
                  <div className="bg-[#182229] border-l-4 border-[#00a884] rounded-r-xl p-3 flex items-center justify-between shadow-md mb-4">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold text-gray-400">User's Selected Reason:</span>
                      <span className="text-xs font-black text-[#00a884] uppercase tracking-wide">
                        {selectedSupport.issue}
                      </span>
                    </div>
                    <span className="text-[10px] text-gray-500 font-mono">
                      Created: {selectedSupport.timestamp?.toMillis ? new Date(selectedSupport.timestamp.toMillis()).toLocaleString() : 'Recent'}
                    </span>
                  </div>

                  {/* CHAT BUBBLES */}
                  <div className="space-y-3 overflow-y-auto pr-1">
                    
                    {/* Original User Message Bubble (Left-aligned) */}
                    <div className="flex justify-start">
                      <div className="max-w-[85%] sm:max-w-[75%] rounded-2xl rounded-tl-none bg-[#202c33] p-3.5 text-gray-100 shadow-md space-y-1.5 border border-gray-700/50">
                        <div className="bg-[#182229] border-l-4 border-[#00a884] p-2 rounded text-xs">
                          <p className="text-[10px] text-[#00a884] font-bold uppercase">Attached Reason Category</p>
                          <p className="text-xs font-bold text-white">{selectedSupport.issue}</p>
                        </div>

                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{selectedSupport.message}</p>

                        <div className="flex items-center justify-end text-[10px] text-gray-400 font-medium pt-1">
                          <span>{selectedSupport.timestamp?.toMillis ? new Date(selectedSupport.timestamp.toMillis()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recent'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Thread Replies */}
                    {selectedSupport.replies && selectedSupport.replies.map((reply, idx) => (
                      <div
                        key={idx}
                        className={cn("flex", reply.sender === 'admin' ? "justify-end" : "justify-start")}
                      >
                        <div className={cn(
                          "max-w-[85%] sm:max-w-[75%] rounded-2xl p-3.5 shadow-md space-y-1 relative",
                          reply.sender === 'admin'
                            ? "bg-[#005c4b] text-white rounded-tr-none"
                            : "bg-[#202c33] text-gray-100 rounded-tl-none border border-gray-700/50"
                        )}>
                          <p className="text-[11px] font-bold flex items-center gap-1 text-[#00a884]">
                            {reply.sender === 'admin' ? '🛡️ Admin Support Desk' : `👤 User (${selectedSupport.userEmail})`}
                          </p>

                          <p className="text-sm leading-relaxed whitespace-pre-wrap">{reply.text}</p>

                          <div className="flex items-center justify-end space-x-1 text-[10px] text-gray-400 font-medium pt-1">
                            <span>
                              {reply.timestamp?.seconds
                                ? new Date(reply.timestamp.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                : reply.timestamp?.toMillis
                                ? new Date(reply.timestamp.toMillis()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                : 'Just now'}
                            </span>
                            {reply.sender === 'admin' && <CheckCheck className="w-3.5 h-3.5 text-blue-300" />}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* BOTTOM INPUT BAR FOR ADMIN - ELEVATED WITH PADDING */}
                <div className="pt-3 pb-8 sm:pb-12 px-2 bg-[#0b141a] sticky bottom-0 z-30 border-t border-gray-800/80 mt-4 shadow-[0_-10px_30px_rgba(0,0,0,0.8)]">
                  <div className="bg-[#202c33] p-2 sm:p-2.5 rounded-2xl border border-gray-700/60 flex items-center space-x-2.5 shadow-2xl">
                    <button className="p-2 text-gray-400 hover:text-white transition-colors shrink-0">
                      <Smile className="w-5 h-5 sm:w-6 sm:h-6" />
                    </button>
                    <button className="p-2 text-gray-400 hover:text-white transition-colors shrink-0">
                      <Paperclip className="w-5 h-5 sm:w-6 sm:h-6" />
                    </button>

                    <input
                      type="text"
                      value={adminReplyText}
                      onChange={(e) => setAdminReplyText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendAdminReply();
                        }
                      }}
                      placeholder={`Type reply to user... [Reason: ${selectedSupport.issue}]`}
                      className="flex-1 bg-[#2a3942] border-none text-xs sm:text-sm text-white placeholder:text-gray-400 rounded-xl px-4 py-3 focus:outline-none focus:ring-1 focus:ring-[#00a884]"
                    />

                    <button
                      onClick={() => handleSendAdminReply()}
                      disabled={!adminReplyText.trim() || isReplying}
                      className={cn(
                        "w-11 h-11 sm:w-12 sm:h-12 rounded-full shrink-0 flex items-center justify-center text-white transition-all active:scale-95 shadow-xl",
                        adminReplyText.trim() && !isReplying
                          ? "bg-[#00a884] hover:bg-[#008069] shadow-[#00a884]/30"
                          : "bg-gray-700 text-gray-500 cursor-not-allowed"
                      )}
                    >
                      {isReplying ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <Send className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>

              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit User Modal */}
      <AnimatePresence>
        {editingUser && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingUser(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-[#0F1419] border border-white/10 rounded-[40px] p-10 shadow-2xl shadow-purple-500/10 overflow-hidden"
            >
              {/* Modal Background Decor */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-purple-600/10 blur-[60px] rounded-full" />
              
              <h2 className="text-2xl font-black mb-10 flex items-center gap-3 uppercase italic tracking-tighter">
                <RefreshCw className="w-6 h-6 text-purple-500" />
                Modify Balance
              </h2>
              
              <div className="space-y-8">
                <div>
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] mb-3 block">User Probe Identity</label>
                  <div className="bg-black/60 p-4 rounded-2xl border border-white/5 backdrop-blur-md">
                    <div className="font-black text-white italic">{editingUser.displayName || editingUser.name || 'User'}</div>
                    {editingUser.email && (
                      <div className="text-xs text-cyan-400 font-mono font-bold flex items-center gap-1.5 mt-1">
                        <Mail className="w-3.5 h-3.5 text-cyan-400" />
                        <span className="select-all">{editingUser.email}</span>
                      </div>
                    )}
                    <div className="text-[10px] text-gray-500 font-mono truncate tracking-widest mt-1">ID: {editingUser.id}</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-6">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em] block px-1">Virtual Credit (Demo)</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-blue-500">$</span>
                      <input 
                        type="number"
                        value={isNaN(editingUser.demoBalance) ? '' : editingUser.demoBalance}
                        onChange={(e) => {
                          const val = e.target.value === '' ? 0 : parseFloat(e.target.value);
                          setEditingUser({...editingUser, demoBalance: isNaN(val) ? 0 : val});
                        }}
                        className="w-full bg-black/40 border border-white/10 rounded-2xl pl-10 pr-4 py-5 text-2xl font-black text-blue-400 focus:outline-none focus:border-blue-500 transition-all shadow-inner"
                      />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-green-500 uppercase tracking-[0.3em] block px-1">Asset Liquidity (Real)</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-green-500">$</span>
                      <input 
                        type="number"
                        value={isNaN(editingUser.realBalance) ? '' : editingUser.realBalance}
                        onChange={(e) => {
                          const val = e.target.value === '' ? 0 : parseFloat(e.target.value);
                          setEditingUser({...editingUser, realBalance: isNaN(val) ? 0 : val});
                        }}
                        className="w-full bg-black/40 border border-white/10 rounded-2xl pl-10 pr-4 py-5 text-2xl font-black text-green-400 focus:outline-none focus:border-green-500 transition-all shadow-inner"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-4 pt-6">
                  <button 
                    onClick={() => setEditingUser(null)}
                    className="flex-1 bg-gray-900 hover:bg-gray-800 text-gray-500 hover:text-white font-black py-5 rounded-[24px] border border-white/5 transition-all uppercase tracking-[0.2em] text-[10px]"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={() => {
                      handleSaveUserBalances(
                        editingUser.id,
                        isNaN(editingUser.demoBalance) ? 10000 : Number(editingUser.demoBalance),
                        isNaN(editingUser.realBalance) ? 0 : Number(editingUser.realBalance)
                      );
                    }}
                    className="flex-1 bg-purple-600 hover:bg-purple-500 text-white font-black py-5 rounded-[24px] shadow-[0_0_30px_rgba(168,85,247,0.4)] transition-all uppercase tracking-[0.2em] text-[10px] flex items-center justify-center gap-2 active:scale-95"
                  >
                    <Save className="w-4 h-4" />
                    Commit
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

