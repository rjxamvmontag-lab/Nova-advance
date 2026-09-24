import React from 'react';
import { Mic, MicOff, Volume2, Sparkles, Loader2 } from 'lucide-react';

interface VoiceVisualizerProps {
  state: 'idle' | 'listening' | 'thinking' | 'speaking';
  onToggleListening: () => void;
  interimTranscript?: string;
}

export const VoiceVisualizer: React.FC<VoiceVisualizerProps> = ({
  state,
  onToggleListening,
  interimTranscript,
}) => {
  return (
    <div className="relative flex flex-col items-center justify-center my-6">
      {/* Dynamic Ambient Background Aura */}
      <div
        className={`absolute -inset-10 rounded-full blur-3xl transition-all duration-700 pointer-events-none opacity-40 ${
          state === 'listening'
            ? 'bg-sky-500/50 scale-125'
            : state === 'speaking'
            ? 'bg-indigo-500/60 scale-120'
            : state === 'thinking'
            ? 'bg-amber-500/40 scale-110'
            : 'bg-cyan-900/20 scale-90'
        }`}
      />

      {/* Ripple Rings when Listening */}
      {state === 'listening' && (
        <>
          <div className="absolute w-52 h-52 rounded-full border-2 border-sky-400/40 animate-ripple pointer-events-none" />
          <div
            className="absolute w-52 h-52 rounded-full border border-cyan-300/30 animate-ripple pointer-events-none"
            style={{ animationDelay: '0.8s' }}
          />
        </>
      )}

      {/* Ripple Rings when Speaking */}
      {state === 'speaking' && (
        <div className="absolute w-56 h-56 rounded-full border-2 border-purple-400/30 animate-pulse-glow pointer-events-none" />
      )}

      {/* Main Interactive Glowing Voice Orb */}
      <button
        onClick={onToggleListening}
        aria-label="Toggle Live Voice"
        className={`relative z-10 w-44 h-44 rounded-full flex flex-col items-center justify-center p-2 cursor-pointer transition-all duration-500 shadow-2xl active:scale-95 group ${
          state === 'listening'
            ? 'bg-gradient-to-tr from-sky-600 via-cyan-500 to-indigo-500 ring-4 ring-sky-300/60 shadow-sky-500/50'
            : state === 'speaking'
            ? 'bg-gradient-to-tr from-purple-600 via-indigo-500 to-cyan-400 ring-4 ring-purple-300/60 shadow-purple-500/50 animate-pulse'
            : state === 'thinking'
            ? 'bg-gradient-to-tr from-amber-600 via-indigo-600 to-sky-500 ring-4 ring-amber-300/60 shadow-amber-500/40'
            : 'bg-gradient-to-tr from-slate-900 via-slate-800 to-sky-950 border border-sky-500/30 ring-1 ring-white/10 hover:border-sky-400'
        }`}
      >
        {/* Inner Glass Layer */}
        <div className="w-full h-full rounded-full bg-black/25 backdrop-blur-sm flex flex-col items-center justify-center relative overflow-hidden border border-white/10">
          {/* Animated Waveform Bars in Center */}
          <div className="flex items-center justify-center gap-1.5 h-12 mb-1">
            {state === 'listening' && (
              <>
                <span className="w-1.5 bg-white rounded-full animate-soundwave" style={{ animationDelay: '0s' }} />
                <span className="w-1.5 bg-white rounded-full animate-soundwave" style={{ animationDelay: '0.2s', height: '24px' }} />
                <span className="w-1.5 bg-white rounded-full animate-soundwave" style={{ animationDelay: '0.4s', height: '36px' }} />
                <span className="w-1.5 bg-white rounded-full animate-soundwave" style={{ animationDelay: '0.1s', height: '20px' }} />
                <span className="w-1.5 bg-white rounded-full animate-soundwave" style={{ animationDelay: '0.3s' }} />
              </>
            )}

            {state === 'speaking' && (
              <div className="flex items-center gap-1 text-white">
                <Volume2 className="w-8 h-8 animate-bounce" />
              </div>
            )}

            {state === 'thinking' && (
              <Loader2 className="w-8 h-8 text-amber-300 animate-spin" />
            )}

            {state === 'idle' && (
              <div className="flex items-center justify-center text-sky-400 group-hover:scale-110 transition-transform">
                <Mic className="w-10 h-10" />
              </div>
            )}
          </div>

          {/* Status Label Inside Orb */}
          <span className="text-[11px] font-semibold tracking-wider uppercase text-white/90">
            {state === 'listening'
              ? 'Suno Raha Hoon...'
              : state === 'speaking'
              ? 'Bol Raha Hoon...'
              : state === 'thinking'
              ? 'Soch Raha Hoon...'
              : 'Tap to Speak'}
          </span>

          <span className="text-[9px] text-white/60 mt-0.5">
            {state === 'idle' ? 'Gemini Live Ready' : 'Tap to Stop'}
          </span>
        </div>
      </button>

      {/* Live Interim Speech Feedback */}
      <div className="mt-4 min-h-[32px] max-w-sm text-center px-4">
        {interimTranscript ? (
          <p className="text-sm font-medium text-sky-300 animate-pulse bg-sky-950/60 border border-sky-500/20 px-4 py-1.5 rounded-full shadow-inner">
            "{interimTranscript}"
          </p>
        ) : (
          <p className="text-xs text-slate-400">
            {state === 'listening'
              ? 'Kahiye: "Timer lagao", "Torch jalao", "WhatsApp kholo", "Sawal pucho"'
              : state === 'idle'
              ? 'Background listening support & direct answers enabled'
              : ''}
          </p>
        )}
      </div>
    </div>
  );
};
