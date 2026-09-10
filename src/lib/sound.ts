// Web Audio API Synthesizer for Trading Sound Effects & Notification Chimes

class SoundManager {
  private audioCtx: AudioContext | null = null;
  private isUnlocked: boolean = false;

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.audioCtx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.audioCtx = new AudioCtx();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
    return this.audioCtx;
  }

  public unlock(): void {
    if (this.isUnlocked) return;
    try {
      const ctx = this.getContext();
      if (ctx) {
        if (ctx.state === 'suspended') {
          ctx.resume().then(() => {
            this.isUnlocked = true;
          }).catch(() => {});
        } else {
          this.isUnlocked = true;
        }
      }
    } catch {
      // ignore
    }
  }

  public isSoundEnabled(): boolean {
    try {
      const setting = localStorage.getItem('trading_sim_sound_enabled');
      if (setting !== null) {
        return setting === 'true';
      }
      const appConfig = localStorage.getItem('swifttrade_app_config');
      if (appConfig) {
        const parsed = JSON.parse(appConfig);
        if (typeof parsed.soundEnabled === 'boolean') {
          return parsed.soundEnabled;
        }
      }
    } catch {
      // fallback
    }
    return true;
  }

  public setSoundEnabled(enabled: boolean): void {
    localStorage.setItem('trading_sim_sound_enabled', enabled ? 'true' : 'false');
    try {
      const appConfig = localStorage.getItem('swifttrade_app_config');
      if (appConfig) {
        const parsed = JSON.parse(appConfig);
        parsed.soundEnabled = enabled;
        localStorage.setItem('swifttrade_app_config', JSON.stringify(parsed));
      }
    } catch {
      // ignore
    }
  }

  // Countdown timer tick sound (short crisp blip)
  public playTick(isUrgent: boolean = false): void {
    if (!this.isSoundEnabled()) return;
    this.unlock();
    try {
      const ctx = this.getContext();
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(isUrgent ? 1100 : 750, ctx.currentTime);
      
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.05);
    } catch {
      // Ignore audio errors
    }
  }

  // Trade Execution sound
  public playTradeExecuted(): void {
    if (!this.isSoundEnabled()) return;
    this.unlock();
    try {
      const ctx = this.getContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(523.25, now);
      osc.frequency.exponentialRampToValueAtTime(659.25, now + 0.1);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.2);
    } catch {
      // Ignore audio errors
    }
  }

  // Trade Win sound
  public playWin(): void {
    if (!this.isSoundEnabled()) return;
    this.unlock();
    try {
      const ctx = this.getContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      [523.25, 659.25, 783.99, 1046.50].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);

        gain.gain.setValueAtTime(0.14, now + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.2);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 0.2);
      });
    } catch {
      // Ignore audio errors
    }
  }

  // Trade Loss sound
  public playLoss(): void {
    if (!this.isSoundEnabled()) return;
    this.unlock();
    try {
      const ctx = this.getContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      [380, 290, 210].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, now + idx * 0.09);

        gain.gain.setValueAtTime(0.08, now + idx * 0.09);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.09 + 0.22);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + idx * 0.09);
        osc.stop(now + idx * 0.09 + 0.22);
      });
    } catch {
      // Ignore audio errors
    }
  }

  // Notification chime (melodic bell for messages & alerts)
  public playNotification(): void {
    if (!this.isSoundEnabled()) return;
    this.unlock();
    try {
      const ctx = this.getContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      // High pleasant two-tone chime (F#5 to C#6)
      const notes = [
        { freq: 739.99, start: 0, dur: 0.25 },
        { freq: 1108.73, start: 0.12, dur: 0.45 }
      ];

      notes.forEach(({ freq, start, dur }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + start);

        gain.gain.setValueAtTime(0.18, now + start);
        gain.gain.exponentialRampToValueAtTime(0.001, now + start + dur);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + start);
        osc.stop(now + start + dur);
      });
    } catch {
      // Ignore audio errors
    }
  }

  // Warning / Alert tone (for insufficient balance or invalid operations)
  public playWarning(): void {
    if (!this.isSoundEnabled()) return;
    this.unlock();
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const now = ctx.currentTime;
      // Double low-mid warning tone
      [440, 370].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, now + idx * 0.12);

        gain.gain.setValueAtTime(0.09, now + idx * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.12 + 0.18);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + idx * 0.12);
        osc.stop(now + idx * 0.12 + 0.18);
      });
    } catch {
      // Ignore audio errors
    }
  }

  // Special Gift Reward Fanfare sound
  public playGiftReward(): void {
    if (!this.isSoundEnabled()) return;
    this.unlock();
    try {
      const ctx = this.getContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      // Majestic 6-tone ascending fanfare (C5, E5, G5, C6, E6, G6)
      const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51, 1567.98];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.09);

        gain.gain.setValueAtTime(0.18, now + idx * 0.09);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.09 + 0.35);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + idx * 0.09);
        osc.stop(now + idx * 0.09 + 0.35);
      });
    } catch {
      // Ignore
    }
  }

  // Test sound triggered when testing or toggling sound in admin/profile
  public playTestSound(): void {
    this.unlock();
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const now = ctx.currentTime;
      [587.33, 880, 1174.66].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);

        gain.gain.setValueAtTime(0.12, now + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.16);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 0.16);
      });
    } catch {
      // Ignore
    }
  }
}

export const soundManager = new SoundManager();

// Global auto-unlock on user's first click or touch
if (typeof window !== 'undefined') {
  const handleInteraction = () => {
    soundManager.unlock();
    window.removeEventListener('click', handleInteraction);
    window.removeEventListener('touchstart', handleInteraction);
    window.removeEventListener('keydown', handleInteraction);
  };
  window.addEventListener('click', handleInteraction, { passive: true });
  window.addEventListener('touchstart', handleInteraction, { passive: true });
  window.addEventListener('keydown', handleInteraction, { passive: true });
}
