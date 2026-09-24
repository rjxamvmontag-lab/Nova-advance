/**
 * Voice Service: Speech Recognition & High-Quality Audio Synthesis
 */

class VoiceService {
  private recognition: any = null;
  private isListening = false;
  private continuousMode = true;
  private currentAudioSource: AudioBufferSourceNode | null = null;
  private audioCtx: AudioContext | null = null;
  private onTranscriptCallback: ((transcript: string, isFinal: boolean) => void) | null = null;
  private onListeningStateCallback: ((isListening: boolean) => void) | null = null;
  private onSpeakingStateCallback: ((isSpeaking: boolean) => void) | null = null;
  private isSpeaking = false;
  private selectedLanguage = 'hi-IN'; // Default Hindi / Hinglish

  constructor() {
    this.initRecognition();
  }

  private initRecognition() {
    if (typeof window === 'undefined') return;

    const SpeechRecognitionClass =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionClass) {
      console.warn('SpeechRecognition not supported in this browser environment');
      return;
    }

    try {
      this.recognition = new SpeechRecognitionClass();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = this.selectedLanguage;

      this.recognition.onstart = () => {
        this.isListening = true;
        this.onListeningStateCallback?.(true);
      };

      this.recognition.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }

        const text = (finalTranscript || interimTranscript).trim();
        if (text) {
          this.onTranscriptCallback?.(text, Boolean(finalTranscript));
        }
      };

      this.recognition.onerror = (event: any) => {
        console.warn('SpeechRecognition error:', event.error);
        if (event.error === 'not-allowed') {
          this.isListening = false;
          this.onListeningStateCallback?.(false);
        }
      };

      this.recognition.onend = () => {
        // Automatically restart if in continuous background mode and not manually stopped
        if (this.continuousMode && this.isListening) {
          try {
            this.recognition.start();
          } catch (e) {
            this.isListening = false;
            this.onListeningStateCallback?.(false);
          }
        } else {
          this.isListening = false;
          this.onListeningStateCallback?.(false);
        }
      };
    } catch (e) {
      console.warn('Speech recognition init failure:', e);
    }
  }

  public setLanguage(lang: string) {
    this.selectedLanguage = lang;
    if (this.recognition) {
      this.recognition.lang = lang;
      if (this.isListening) {
        this.stopListening();
        setTimeout(() => this.startListening(), 200);
      }
    }
  }

  public getLanguage(): string {
    return this.selectedLanguage;
  }

  public startListening(
    onTranscript?: (transcript: string, isFinal: boolean) => void,
    onStateChange?: (isListening: boolean) => void
  ) {
    if (onTranscript) this.onTranscriptCallback = onTranscript;
    if (onStateChange) this.onListeningStateCallback = onStateChange;

    // Interrupt any current speech playback
    this.stopSpeaking();

    if (!this.recognition) {
      this.initRecognition();
    }

    if (this.recognition) {
      try {
        this.continuousMode = true;
        this.recognition.start();
      } catch (err) {
        // If already started, ignore error
      }
    }
  }

  public stopListening() {
    this.continuousMode = false;
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (e) {
        // ignore
      }
    }
    this.isListening = false;
    this.onListeningStateCallback?.(false);
  }

  public toggleListening(
    onTranscript?: (transcript: string, isFinal: boolean) => void,
    onStateChange?: (isListening: boolean) => void
  ): boolean {
    if (this.isListening) {
      this.stopListening();
      return false;
    } else {
      this.startListening(onTranscript, onStateChange);
      return true;
    }
  }

  public getIsListening(): boolean {
    return this.isListening;
  }

  public setSpeakingListener(cb: (isSpeaking: boolean) => void) {
    this.onSpeakingStateCallback = cb;
  }

  // Play audio returned from Gemini TTS or fallback to SpeechSynthesis
  public async speak(text: string, base64PCM?: string): Promise<void> {
    this.stopSpeaking();

    if (base64PCM) {
      try {
        await this.playPCM24k(base64PCM);
        return;
      } catch (e) {
        console.warn('PCM playback failed, using Web Speech synthesis:', e);
      }
    }

    // High quality Web Speech API fallback
    if ('speechSynthesis' in window) {
      return new Promise((resolve) => {
        window.speechSynthesis.cancel();

        const cleanText = text
          .replace(/[#*`_~]/g, '')
          .replace(/https?:\/\/[^\s]+/g, 'link')
          .trim();

        if (!cleanText) {
          resolve();
          return;
        }

        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.rate = 1.05;
        utterance.pitch = 1.0;

        // Try to pick an Indian English or Hindi voice
        const voices = window.speechSynthesis.getVoices();
        const preferredVoice = voices.find(
          (v) =>
            (this.selectedLanguage.startsWith('hi') && v.lang.includes('hi')) ||
            v.lang.includes('en-IN') ||
            v.name.includes('Google') ||
            v.name.includes('India')
        );

        if (preferredVoice) {
          utterance.voice = preferredVoice;
        }

        utterance.onstart = () => {
          this.isSpeaking = true;
          this.onSpeakingStateCallback?.(true);
        };

        utterance.onend = () => {
          this.isSpeaking = false;
          this.onSpeakingStateCallback?.(false);
          resolve();
        };

        utterance.onerror = () => {
          this.isSpeaking = false;
          this.onSpeakingStateCallback?.(false);
          resolve();
        };

        window.speechSynthesis.speak(utterance);
      });
    }
  }

  // Decode and play 24000Hz PCM raw audio from Gemini TTS
  private async playPCM24k(base64: string): Promise<void> {
    const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtxClass) throw new Error('AudioContext unavailable');

    if (!this.audioCtx) {
      this.audioCtx = new AudioCtxClass({ sampleRate: 24000 });
    }

    if (this.audioCtx.state === 'suspended') {
      await this.audioCtx.resume();
    }

    const binary = atob(base64);
    const len = binary.length;
    // 16-bit PCM little-endian
    const samples = Math.floor(len / 2);
    const buffer = this.audioCtx.createBuffer(1, samples, 24000);
    const channelData = buffer.getChannelData(0);

    const int16Array = new Int16Array(samples);
    for (let i = 0; i < samples; i++) {
      const low = binary.charCodeAt(i * 2);
      const high = binary.charCodeAt(i * 2 + 1);
      int16Array[i] = (high << 8) | low;
      // Convert to -1.0 to 1.0 float
      channelData[i] = int16Array[i] / 32768.0;
    }

    return new Promise((resolve) => {
      const source = this.audioCtx!.createBufferSource();
      source.buffer = buffer;
      source.connect(this.audioCtx!.destination);

      this.currentAudioSource = source;
      this.isSpeaking = true;
      this.onSpeakingStateCallback?.(true);

      source.onended = () => {
        this.isSpeaking = false;
        this.onSpeakingStateCallback?.(false);
        this.currentAudioSource = null;
        resolve();
      };

      source.start();
    });
  }

  public stopSpeaking() {
    if (this.currentAudioSource) {
      try {
        this.currentAudioSource.stop();
      } catch (e) {
        // ignore
      }
      this.currentAudioSource = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    this.isSpeaking = false;
    this.onSpeakingStateCallback?.(false);
  }

  public getIsSpeaking(): boolean {
    return this.isSpeaking;
  }
}

export const voiceService = new VoiceService();
