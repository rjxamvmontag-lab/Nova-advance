/**
 * Background Execution & Keep-Alive Service
 * Enables continuous operation in background tab, PWA standalone, and screen-dimmed states
 * via Web Audio keep-alive, MediaSession API, WakeLock API, and Web Notifications.
 */

class BackgroundService {
  private audioCtx: AudioContext | null = null;
  private keepAliveGain: GainNode | null = null;
  private wakeLockSentinel: any = null;
  private isKeepAliveActive = false;
  private hasNotificationPermission = false;

  constructor() {
    this.checkNotificationPermission();
  }

  public async initKeepAlive(): Promise<boolean> {
    try {
      if (this.isKeepAliveActive) return true;

      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtxClass) return false;

      this.audioCtx = new AudioCtxClass();

      // Create an oscillator with negligible gain (inaudible carrier)
      // This maintains the mobile browser's media pipeline alive in background
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      // 440Hz at 0.0001 volume (virtually inaudible to human ear, but keeps audio thread active)
      osc.frequency.setValueAtTime(440, this.audioCtx.currentTime);
      gain.gain.setValueAtTime(0.00001, this.audioCtx.currentTime);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      osc.start();

      this.keepAliveGain = gain;
      this.isKeepAliveActive = true;

      // Register MediaSession metadata so mobile OS control center shows assistant active
      if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: 'LiveNova AI - Background Live Active',
          artist: 'Gemini Live Voice Assistant',
          album: 'Background Voice & Action Engine',
          artwork: [
            { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
            { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          ],
        });

        navigator.mediaSession.setActionHandler('play', () => {
          this.resumeAudio();
        });
        navigator.mediaSession.setActionHandler('pause', () => {
          // Keep active or pause
        });
        navigator.mediaSession.setActionHandler('stop', () => {
          this.stopKeepAlive();
        });
      }

      console.log('Background Keep-Alive initialized successfully');
      return true;
    } catch (e) {
      console.warn('Background Keep-Alive init warning:', e);
      return false;
    }
  }

  public async resumeAudio(): Promise<void> {
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      await this.audioCtx.resume();
    }
  }

  public stopKeepAlive(): void {
    if (this.audioCtx) {
      this.audioCtx.close();
      this.audioCtx = null;
    }
    this.isKeepAliveActive = false;
  }

  public getIsActive(): boolean {
    return this.isKeepAliveActive;
  }

  // Request Screen Wake Lock
  public async requestWakeLock(): Promise<boolean> {
    if ('wakeLock' in navigator) {
      try {
        this.wakeLockSentinel = await (navigator as any).wakeLock.request('screen');
        this.wakeLockSentinel.addEventListener('release', () => {
          this.wakeLockSentinel = null;
        });
        return true;
      } catch (err) {
        console.warn('Wake Lock request failed:', err);
        return false;
      }
    }
    return false;
  }

  public releaseWakeLock(): void {
    if (this.wakeLockSentinel) {
      this.wakeLockSentinel.release();
      this.wakeLockSentinel = null;
    }
  }

  public isWakeLockActive(): boolean {
    return this.wakeLockSentinel !== null;
  }

  // Push notifications for background alerts
  public async requestNotificationPermission(): Promise<boolean> {
    if (!('Notification' in window)) return false;
    if (Notification.permission === 'granted') {
      this.hasNotificationPermission = true;
      return true;
    }
    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      this.hasNotificationPermission = permission === 'granted';
      return this.hasNotificationPermission;
    }
    return false;
  }

  private checkNotificationPermission() {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      this.hasNotificationPermission = Notification.permission === 'granted';
    }
  }

  public sendNotification(title: string, body: string): void {
    if (this.hasNotificationPermission && typeof window !== 'undefined' && 'Notification' in window) {
      try {
        new Notification(title, {
          body,
          icon: '/pwa-192x192.png',
          badge: '/pwa-192x192.png',
        });
      } catch (e) {
        console.warn('Could not post notification:', e);
      }
    }
  }

  // Haptic feedback
  public vibrate(pattern: number | number[] = 100): void {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(pattern);
      } catch (e) {
        // ignore
      }
    }
  }
}

export const backgroundService = new BackgroundService();
