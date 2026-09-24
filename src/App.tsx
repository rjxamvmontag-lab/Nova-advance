/**
 * LiveNova AI - Smart Background Voice & Text Assistant
 * Powered by Gemini Live, Background Keep-Alive, PWA, and Device Action Execution
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Settings,
  Shield,
  Volume2,
  VolumeX,
  Sparkles,
  Radio,
  Sun,
  Timer as TimerIcon,
  StickyNote,
  Send,
  HelpCircle,
  Lightbulb,
  Search,
  Globe,
  Bot,
  Command,
} from 'lucide-react';
import { VoiceVisualizer } from './components/VoiceVisualizer';
import { ActionCards } from './components/ActionCards';
import { VoiceTranscript, ChatMessage } from './components/VoiceTranscript';
import { PWAInstallButton } from './components/PWAInstallButton';
import { OfflineIndicator } from './components/OfflineIndicator';
import { BackgroundSettingsModal } from './components/BackgroundSettingsModal';
import { DevicePowerSafeguardModal } from './components/DevicePowerSafeguardModal';
import { voiceService } from './services/voiceService';
import { backgroundService } from './services/backgroundService';
import { actionExecutor, TimerItem, NoteItem } from './services/actionExecutor';

export default function App() {
  const [voiceState, setVoiceState] = useState<'idle' | 'listening' | 'thinking' | 'speaking'>('idle');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    return [
      {
        id: '1',
        sender: 'assistant',
        text: 'Namaste! Main LiveNova Advanced AI hoon. Niche box mein likhein ya voice se bolein — main seedha text ke roop mein jawab doonga aur Chrome open karke search karna, Torch, Timers, WhatsApp, ya Notes jaise saare tasks turant execute kar doonga!',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ];
  });

  const [timers, setTimers] = useState<TimerItem[]>([]);
  const [notes, setNotes] = useState<NoteItem[]>(() => {
    try {
      const saved = localStorage.getItem('livenova_notes');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [isTorchOn, setIsTorchOn] = useState(false);
  const [screenTorchMode, setScreenTorchMode] = useState(false);
  const [activeSound, setActiveSound] = useState<string | null>(null);
  const [isKeepAlive, setIsKeepAlive] = useState(false);
  const [isWakeLock, setIsWakeLock] = useState(false);
  const [language, setLanguage] = useState('hi-IN');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSafeguardOpen, setIsSafeguardOpen] = useState(false);
  const [textInput, setTextInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Save notes to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('livenova_notes', JSON.stringify(notes));
    } catch {
      // ignore
    }
  }, [notes]);

  // Timers countdown ticker
  useEffect(() => {
    const interval = setInterval(() => {
      setTimers((prevTimers) => {
        let hasUpdated = false;
        const nextTimers = prevTimers.map((t) => {
          if (t.isRunning && t.remainingSeconds > 0) {
            hasUpdated = true;
            const remaining = t.remainingSeconds - 1;
            if (remaining === 0) {
              actionExecutor.playSoundEffect('alert');
              backgroundService.vibrate([200, 100, 200, 100, 300]);
              backgroundService.sendNotification('Timer Finished!', `${t.label || 'Timer'} poora ho gaya!`);
              voiceService.speak(`Aapka timer "${t.label || ''}" poora ho gaya hai!`);
            }
            return { ...t, remainingSeconds: remaining };
          }
          return t;
        });
        return hasUpdated ? nextTimers : prevTimers;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Listen to voiceService speaking state
  useEffect(() => {
    voiceService.setSpeakingListener((speaking) => {
      setVoiceState((prev) => {
        if (speaking) return 'speaking';
        return prev === 'speaking' ? 'idle' : prev;
      });
    });
  }, []);

  // Start background keep-alive on first interaction
  const ensureBackgroundReady = async () => {
    if (!isKeepAlive) {
      const ok = await backgroundService.initKeepAlive();
      if (ok) setIsKeepAlive(true);
    }
  };

  // Toggle Live Voice Listening
  const handleToggleListening = async () => {
    await ensureBackgroundReady();

    if (voiceState === 'speaking') {
      voiceService.stopSpeaking();
    }

    if (voiceState === 'listening') {
      voiceService.stopListening();
      setVoiceState('idle');
      setInterimTranscript('');
      return;
    }

    let speechTimer: any = null;

    voiceService.startListening(
      (transcript, isFinal) => {
        setInterimTranscript(transcript);

        if (speechTimer) clearTimeout(speechTimer);

        if (isFinal) {
          processUserPrompt(transcript);
          setInterimTranscript('');
        } else {
          speechTimer = setTimeout(() => {
            if (transcript && transcript.trim().length > 1) {
              voiceService.stopListening();
              processUserPrompt(transcript);
              setInterimTranscript('');
            }
          }, 1800);
        }
      },
      (listening) => {
        setVoiceState(listening ? 'listening' : 'idle');
      }
    );
  };

  // Process prompt via Gemini API or Direct Intent Engine
  const processUserPrompt = async (promptText: string) => {
    if (!promptText || !promptText.trim()) return;

    const trimmed = promptText.trim();
    setTextInput('');
    setVoiceState('thinking');

    // Add user message to transcript
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text: trimmed,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: trimmed,
          conversationHistory: messages.slice(-4).map((m) => ({
            role: m.sender,
            text: m.text,
          })),
        }),
      });

      const data = await res.json();

      let replyText = data.text || 'Ho gaya!';
      let executedActionLabel = '';

      // Execute tool calls returned by Gemini or Direct Intent Engine
      if (Array.isArray(data.functionCalls) && data.functionCalls.length > 0) {
        for (const call of data.functionCalls) {
          const { name, args } = call;

          if (name === 'search_web') {
            const query = args.query || trimmed;
            const result = actionExecutor.searchWeb(query);
            executedActionLabel = result.message;
          } else if (name === 'open_app') {
            const result = actionExecutor.openApp(args.target, args.query);
            executedActionLabel = result.message;
          } else if (name === 'set_timer') {
            const secs = Number(args.seconds) || 60;
            const label = args.label || 'Timer';
            const newTimer: TimerItem = {
              id: Date.now().toString(),
              label,
              totalSeconds: secs,
              remainingSeconds: secs,
              isRunning: true,
              createdAt: Date.now(),
            };
            setTimers((prev) => [...prev, newTimer]);
            executedActionLabel = `Timer set: ${label} (${secs}s)`;
            backgroundService.vibrate(80);
          } else if (name === 'create_note') {
            const newNote: NoteItem = {
              id: Date.now().toString(),
              title: args.title || 'Note',
              content: args.content || '',
              category: args.category || 'General',
              createdAt: Date.now(),
            };
            setNotes((prev) => [newNote, ...prev]);
            executedActionLabel = `Note saved: ${newNote.title}`;
            backgroundService.vibrate(80);
          } else if (name === 'toggle_torch') {
            const target = args.action || 'toggle';
            const result = await actionExecutor.toggleTorch(target as any);
            setIsTorchOn(result.state);
            executedActionLabel = result.message;
          } else if (name === 'play_ambient_sound') {
            const sound = args.soundType;
            actionExecutor.playSoundEffect(sound);
            setActiveSound(sound === 'stop' ? null : sound);
            executedActionLabel = `Sound: ${sound}`;
          } else if (name === 'device_vibrate') {
            actionExecutor.triggerVibration(args.pattern || 'short');
            executedActionLabel = 'Haptic vibration';
          } else if (name === 'device_power_request') {
            setIsSafeguardOpen(true);
            executedActionLabel = 'Mobile Power Safety Warning';
          }
        }
      }

      // Add assistant response to transcript
      const assistantMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'assistant',
        text: replyText,
        actionExecuted: executedActionLabel,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, assistantMsg]);
      setVoiceState('idle');

      // Speak response aloud via Native Web Speech
      speakResponse(replyText);
    } catch (err: any) {
      console.error('Processing error:', err);
      const errorMsg = 'Maaf kijiye, main abhi process nahi kar paya. Dobara bolkar ya likhkar try karein.';
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          sender: 'assistant',
          text: errorMsg,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
      setVoiceState('idle');
      speakResponse(errorMsg);
    }
  };

  // Speak response aloud (Native Browser Web Speech engine for 0ms latency & 0 API quota usage)
  const speakResponse = async (text: string) => {
    try {
      await voiceService.speak(text);
    } catch (e) {
      console.warn('Voice playback failed:', e);
    }
  };

  // Torch Toggle
  const handleToggleTorch = async () => {
    await ensureBackgroundReady();
    const result = await actionExecutor.toggleTorch();
    setIsTorchOn(result.state);
  };

  // Sound Player
  const handlePlaySound = (sound: string) => {
    ensureBackgroundReady();
    actionExecutor.playSoundEffect(sound);
    setActiveSound(sound === 'stop' ? null : sound);
  };

  // Timer controls
  const handleToggleTimer = (id: string) => {
    setTimers((prev) =>
      prev.map((t) => (t.id === id ? { ...t, isRunning: !t.isRunning } : t))
    );
  };

  const handleDeleteTimer = (id: string) => {
    setTimers((prev) => prev.filter((t) => t.id !== id));
  };

  const handleDeleteNote = (id: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
  };

  // Wake lock toggle
  const handleToggleWakeLock = async () => {
    if (isWakeLock) {
      backgroundService.releaseWakeLock();
      setIsWakeLock(false);
    } else {
      const ok = await backgroundService.requestWakeLock();
      setIsWakeLock(ok);
    }
  };

  // Keep alive toggle
  const handleToggleKeepAlive = async () => {
    if (isKeepAlive) {
      backgroundService.stopKeepAlive();
      setIsKeepAlive(false);
    } else {
      const ok = await backgroundService.initKeepAlive();
      setIsKeepAlive(ok);
    }
  };

  // Language toggle
  const handleChangeLanguage = (lang: string) => {
    setLanguage(lang);
    voiceService.setLanguage(lang);
  };

  return (
    <div className="min-h-screen bg-[#070a12] text-slate-100 flex flex-col relative selection:bg-sky-500 selection:text-white pb-28">
      {/* Screen Flashlight Mode */}
      {screenTorchMode && (
        <div
          onClick={() => setScreenTorchMode(false)}
          className="fixed inset-0 z-50 bg-white flex flex-col items-center justify-center cursor-pointer"
        >
          <div className="p-4 rounded-2xl bg-black/80 text-black text-center font-bold text-sm">
            Screen Flashlight ON - Tap anywhere to turn off
          </div>
        </div>
      )}

      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-30 backdrop-blur-xl bg-[#070a12]/90 border-b border-slate-800/80 px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center shadow-md shadow-sky-500/20">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-sm font-extrabold tracking-tight text-white">LiveNova AI</h1>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-sky-500/10 text-sky-400 border border-sky-500/30">
                  ADVANCED
                </span>
              </div>
              <p className="text-[10px] text-slate-400">Background Voice, Text & Action Engine</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Background Status Indicator */}
            <button
              onClick={handleToggleKeepAlive}
              title="Background Keep-Alive Audio"
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border transition cursor-pointer ${
                isKeepAlive
                  ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Radio className={`w-3 h-3 ${isKeepAlive ? 'text-emerald-400 animate-pulse' : ''}`} />
              <span className="hidden sm:inline">Background:</span>
              <span>{isKeepAlive ? 'ON' : 'OFF'}</span>
            </button>

            {/* PWA Install Button */}
            <PWAInstallButton />

            {/* Settings Modal Toggle */}
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition cursor-pointer"
              title="Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-3xl w-full mx-auto p-4 sm:p-6 flex flex-col space-y-6">
        {/* Safety Boundary Notice Pill */}
        <div
          onClick={() => setIsSafeguardOpen(true)}
          className="flex items-center justify-between px-3.5 py-2 rounded-2xl bg-slate-900/60 border border-slate-800/80 text-xs text-slate-300 hover:border-sky-500/30 transition cursor-pointer group"
        >
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-sky-400 group-hover:scale-110 transition-transform" />
            <span>
              <strong>Capabilities:</strong> Chrome Search, Voice, Torch, Timers, Notes, Apps execute direct{' '}
              <span className="text-slate-400">(except phone power off/on)</span>
            </span>
          </div>
          <HelpCircle className="w-3.5 h-3.5 text-slate-500 group-hover:text-sky-400" />
        </div>

        {/* Central Voice Visualizer & Voice Orb */}
        <VoiceVisualizer
          state={voiceState}
          onToggleListening={handleToggleListening}
          interimTranscript={interimTranscript}
        />

        {/* Action Cards, Device Toggles, & Notes */}
        <ActionCards
          timers={timers}
          notes={notes}
          isTorchOn={isTorchOn}
          activeSound={activeSound}
          onToggleTorch={handleToggleTorch}
          onDeleteTimer={handleDeleteTimer}
          onToggleTimer={handleToggleTimer}
          onDeleteNote={handleDeleteNote}
          onPlaySound={handlePlaySound}
          onQuickPrompt={(prompt) => processUserPrompt(prompt)}
        />

        {/* Voice & Text Conversation History Transcript */}
        <VoiceTranscript
          messages={messages}
          onSpeakText={(text) => speakResponse(text)}
        />
      </main>

      {/* Sticky Bottom Advanced Input Box (Prominent User Text Box) */}
      <div className="fixed bottom-0 left-0 right-0 z-40 p-3 sm:p-4 bg-gradient-to-t from-[#070a12] via-[#070a12]/95 to-transparent backdrop-blur-lg border-t border-slate-800/60">
        <div className="max-w-3xl mx-auto">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (textInput.trim()) processUserPrompt(textInput);
            }}
            className="flex items-center gap-2 bg-slate-900/90 border-2 border-slate-700/80 hover:border-sky-500/60 focus-within:border-sky-400 focus-within:ring-4 focus-within:ring-sky-500/20 rounded-2xl p-2 shadow-2xl transition-all"
          >
            {/* Mic trigger inside input bar */}
            <button
              type="button"
              onClick={handleToggleListening}
              className={`p-2.5 rounded-xl transition cursor-pointer flex items-center justify-center shrink-0 ${
                voiceState === 'listening'
                  ? 'bg-rose-500 text-white animate-pulse'
                  : 'bg-slate-800 text-sky-400 hover:bg-slate-700'
              }`}
              title="Voice Input"
            >
              <Mic className="w-5 h-5" />
            </button>

            {/* Main Text Input Field */}
            <input
              ref={inputRef}
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Yahan kuch bhi likhein (jaise: 'Chrome open karo aur weather search karo', 'Note likho', sawal)..."
              className="flex-1 bg-transparent px-2.5 py-1.5 text-sm sm:text-base text-slate-100 placeholder:text-slate-500 focus:outline-none font-medium"
            />

            {/* Send Button */}
            <button
              type="submit"
              disabled={!textInput.trim()}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 text-white font-semibold text-sm hover:from-sky-400 hover:to-indigo-500 transition disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1.5 shadow-md shadow-sky-500/20 active:scale-95 shrink-0"
            >
              <span>Bhejo</span>
              <Send className="w-4 h-4" />
            </button>
          </form>

          {/* Quick hint beneath input box */}
          <div className="flex items-center justify-between px-3 mt-1.5 text-[10px] text-slate-500">
            <span className="flex items-center gap-1">
              <Command className="w-3 h-3 text-sky-400" />
              Sawal pucho ya koi bhi task do (e.g. Chrome search, WhatsApp, Torch, Timer, Math)
            </span>
            <span className="hidden sm:inline">Direct Text & Voice AI</span>
          </div>
        </div>
      </div>

      {/* Offline Alert Badge */}
      <OfflineIndicator />

      {/* Settings Modal */}
      <BackgroundSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        isKeepAlive={isKeepAlive}
        isWakeLock={isWakeLock}
        language={language}
        onToggleKeepAlive={handleToggleKeepAlive}
        onToggleWakeLock={handleToggleWakeLock}
        onChangeLanguage={handleChangeLanguage}
      />

      {/* Device Power Safeguard Modal */}
      <DevicePowerSafeguardModal
        isOpen={isSafeguardOpen}
        onClose={() => setIsSafeguardOpen(false)}
      />
    </div>
  );
}
