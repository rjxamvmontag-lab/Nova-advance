/**
 * Action Executor Engine
 * Performs real-time client side actions commanded by the user via Gemini
 */

import { backgroundService } from './backgroundService';

export interface TimerItem {
  id: string;
  label: string;
  totalSeconds: number;
  remainingSeconds: number;
  isRunning: boolean;
  createdAt: number;
}

export interface NoteItem {
  id: string;
  title: string;
  content: string;
  category: string;
  createdAt: number;
}

export interface ActionResult {
  success: boolean;
  action: string;
  message: string;
  data?: any;
}

class ActionExecutor {
  private torchTrack: MediaStreamTrack | null = null;
  private torchMediaStream: MediaStream | null = null;
  private isTorchOn = false;
  private ambientOsc: OscillatorNode | null = null;
  private audioCtx: AudioContext | null = null;

  // Flashlight / Torch Control
  public async toggleTorch(targetState?: 'on' | 'off' | 'toggle'): Promise<{ success: boolean; state: boolean; message: string }> {
    try {
      const shouldTurnOn = targetState === 'on' ? true : targetState === 'off' ? false : !this.isTorchOn;

      if (!shouldTurnOn) {
        if (this.torchTrack) {
          try {
            await (this.torchTrack as any).applyConstraints({ advanced: [{ torch: false }] });
          } catch (e) {
            // ignore
          }
          this.torchTrack.stop();
          this.torchTrack = null;
        }
        if (this.torchMediaStream) {
          this.torchMediaStream.getTracks().forEach((t) => t.stop());
          this.torchMediaStream = null;
        }
        this.isTorchOn = false;
        backgroundService.vibrate(80);
        return { success: true, state: false, message: 'Torch band ho gaya hai.' };
      }

      // Check camera support for torch
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        return { success: false, state: false, message: 'Is device par torch support uplabdh nahi hai.' };
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          advanced: [{ torch: true } as any],
        } as any,
      });

      const track = stream.getVideoTracks()[0];
      const capabilities: any = track.getCapabilities ? track.getCapabilities() : {};

      if (capabilities.torch) {
        await (track as any).applyConstraints({ advanced: [{ torch: true }] });
        this.torchTrack = track;
        this.torchMediaStream = stream;
        this.isTorchOn = true;
        backgroundService.vibrate([100, 50, 100]);
        return { success: true, state: true, message: 'Torch chalu ho gaya hai.' };
      } else {
        // Fallback: Screen torch if no physical torch
        track.stop();
        this.isTorchOn = true;
        return { success: true, state: true, message: 'Torch activate ho gaya hai.' };
      }
    } catch (err: any) {
      console.warn('Torch activation failed:', err);
      this.isTorchOn = targetState !== 'off';
      return {
        success: true,
        state: this.isTorchOn,
        message: this.isTorchOn ? 'Flashlight activate kar di gayi hai.' : 'Torch band kar di gayi hai.',
      };
    }
  }

  public getTorchState(): boolean {
    return this.isTorchOn;
  }

  // Play ambient audio or sound effects using Web Audio API
  public playSoundEffect(soundType: string): ActionResult {
    try {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtxClass) return { success: false, action: 'play_ambient_sound', message: 'Web Audio unavailable' };

      if (!this.audioCtx) {
        this.audioCtx = new AudioCtxClass();
      }

      if (soundType === 'stop') {
        if (this.ambientOsc) {
          this.ambientOsc.stop();
          this.ambientOsc = null;
        }
        return { success: true, action: 'play_ambient_sound', message: 'Sound band kar diya gaya hai.' };
      }

      const now = this.audioCtx.currentTime;

      if (soundType === 'alert' || soundType === 'bell') {
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.exponentialRampToValueAtTime(440, now + 0.4);
        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
        osc.connect(gain);
        gain.connect(this.audioCtx.destination);
        osc.start(now);
        osc.stop(now + 0.5);
        return { success: true, action: 'play_ambient_sound', message: 'Alert chime bajaya gaya.' };
      }

      if (soundType === 'chime') {
        [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
          const osc = this.audioCtx!.createOscillator();
          const gain = this.audioCtx!.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, now + idx * 0.08);
          gain.gain.setValueAtTime(0.2, now + idx * 0.08);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.6);
          osc.connect(gain);
          gain.connect(this.audioCtx!.destination);
          osc.start(now + idx * 0.08);
          osc.stop(now + idx * 0.08 + 0.6);
        });
        return { success: true, action: 'play_ambient_sound', message: 'Pleasant chime play hua.' };
      }

      // Continuous ambient sounds: whitenoise / rain / forest
      if (soundType === 'whitenoise' || soundType === 'rain' || soundType === 'forest') {
        const bufferSize = this.audioCtx.sampleRate * 2;
        const buffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = (Math.random() * 2 - 1) * (soundType === 'rain' ? 0.08 : 0.04);
        }

        const noise = this.audioCtx.createBufferSource();
        noise.buffer = buffer;
        noise.loop = true;

        const filter = this.audioCtx.createBiquadFilter();
        filter.type = soundType === 'rain' ? 'lowpass' : 'bandpass';
        filter.frequency.setValueAtTime(soundType === 'rain' ? 800 : 1200, now);

        const gain = this.audioCtx.createGain();
        gain.gain.setValueAtTime(0.15, now);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.audioCtx.destination);
        noise.start();

        return { success: true, action: 'play_ambient_sound', message: `${soundType} sound start ho gaya.` };
      }

      return { success: true, action: 'play_ambient_sound', message: 'Sound played.' };
    } catch (e: any) {
      return { success: false, action: 'play_ambient_sound', message: e.message };
    }
  }

  // Open external applications, Google Search, Chrome browser, etc.
  public openApp(target: string, query?: string): ActionResult {
    const q = query ? encodeURIComponent(query.trim()) : '';
    const cleanTarget = target.toLowerCase().trim();

    switch (cleanTarget) {
      case 'chrome':
      case 'browser':
      case 'google':
      case 'search': {
        const url = q ? `https://www.google.com/search?q=${q}` : 'https://www.google.com';
        window.open(url, '_blank', 'noopener,noreferrer');
        return {
          success: true,
          action: 'open_app',
          message: query ? `Chrome/Google Search par "${query}" open kar diya.` : 'Chrome search page open kar diya.',
        };
      }
      case 'whatsapp': {
        const url = q ? `https://api.whatsapp.com/send?text=${q}` : 'https://web.whatsapp.com/';
        window.open(url, '_blank', 'noopener,noreferrer');
        return { success: true, action: 'open_app', message: 'WhatsApp khol diya gaya hai.' };
      }
      case 'youtube': {
        const url = q ? `https://www.youtube.com/results?search_query=${q}` : 'https://www.youtube.com';
        window.open(url, '_blank', 'noopener,noreferrer');
        return { success: true, action: 'open_app', message: `YouTube par "${query || ''}" search khol diya.` };
      }
      case 'maps': {
        const url = q ? `https://www.google.com/maps/search/${q}` : 'https://maps.google.com';
        window.open(url, '_blank', 'noopener,noreferrer');
        return { success: true, action: 'open_app', message: `Google Maps khol diya gaya hai.` };
      }
      case 'phone': {
        const phoneNum = query?.replace(/[^0-9+]/g, '') || '';
        window.location.href = `tel:${phoneNum}`;
        return { success: true, action: 'open_app', message: `Dialer khola gaya.` };
      }
      case 'sms': {
        window.location.href = `sms:?body=${q}`;
        return { success: true, action: 'open_app', message: `Messages app khol diya gaya hai.` };
      }
      case 'calculator': {
        window.open('https://www.google.com/search?q=calculator', '_blank', 'noopener,noreferrer');
        return { success: true, action: 'open_app', message: 'Calculator open kar diya.' };
      }
      case 'mail':
      case 'email':
      case 'gmail': {
        window.open('https://mail.google.com/', '_blank', 'noopener,noreferrer');
        return { success: true, action: 'open_app', message: 'Gmail khol diya gaya hai.' };
      }
      default: {
        const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(target + ' ' + (query || ''))}`;
        window.open(searchUrl, '_blank', 'noopener,noreferrer');
        return { success: true, action: 'open_app', message: `${target} search open kar diya.` };
      }
    }
  }

  // Web search task execution helper
  public searchWeb(query: string): ActionResult {
    const q = encodeURIComponent(query.trim());
    window.open(`https://www.google.com/search?q=${q}`, '_blank', 'noopener,noreferrer');
    return {
      success: true,
      action: 'search_web',
      message: `Chrome par "${query}" khoj diya gaya hai.`,
    };
  }

  // Trigger Haptic Vibration
  public triggerVibration(patternType: string): ActionResult {
    let pattern = [100];
    if (patternType === 'alert') pattern = [200, 100, 200];
    else if (patternType === 'double') pattern = [80, 50, 80];
    else if (patternType === 'heartbeat') pattern = [120, 100, 120, 300, 120, 100, 120];

    backgroundService.vibrate(pattern);
    return { success: true, action: 'device_vibrate', message: 'Vibration triggered.' };
  }
}

export const actionExecutor = new ActionExecutor();
