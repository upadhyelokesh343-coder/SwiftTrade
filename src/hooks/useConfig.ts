import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';

export interface AppSettings {
  platformName: string;
  defaultDemoBalance: number;
  soundEnabled: boolean;
  minWithdrawal: number;
  maxWithdrawal: number;
  isMaintenance: boolean;
}

const LOCAL_STORAGE_KEY = 'swifttrade_app_config';

export function normalizePlatformName(name?: string): string {
  if (name === undefined || name === null) return 'SwiftTrade';
  if (typeof name !== 'string') return 'SwiftTrade';
  const trimmed = name.trim();
  const lower = trimmed.toLowerCase();
  if (lower.includes('guru') || lower.includes('galaxy')) {
    return 'SwiftTrade';
  }
  return name;
}

export function useConfig() {
  const [config, setConfig] = useState<AppSettings>(() => {
    try {
      const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        return {
          defaultDemoBalance: 10000,
          soundEnabled: true,
          minWithdrawal: 50,
          maxWithdrawal: 10000,
          isMaintenance: false,
          ...parsed,
          platformName: normalizePlatformName(parsed.platformName)
        };
      }
    } catch {
      // ignore
    }
    return {
      platformName: 'SwiftTrade',
      defaultDemoBalance: 10000,
      soundEnabled: true,
      minWithdrawal: 50,
      maxWithdrawal: 10000,
      isMaintenance: false
    };
  });

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'config', 'app'), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as Partial<AppSettings>;
        const cleanName = normalizePlatformName(data.platformName);
        setConfig(prev => {
          const updated = { 
            ...prev, 
            ...data, 
            platformName: cleanName 
          };
          try {
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
          } catch {
            // ignore
          }
          return updated;
        });
      }
    }, (err) => {
      console.warn("Config listener error:", err);
    });

    return () => unsubscribe();
  }, []);

  return config;
}
