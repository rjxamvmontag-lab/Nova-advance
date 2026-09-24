import React from 'react';
import { Volume2, Sparkles, User, CheckCircle2, Bot, ArrowDownCircle, ExternalLink } from 'lucide-react';

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  actionExecuted?: string;
  timestamp: string;
}

interface VoiceTranscriptProps {
  messages: ChatMessage[];
  onSpeakText: (text: string) => void;
}

export const VoiceTranscript: React.FC<VoiceTranscriptProps> = ({ messages, onSpeakText }) => {
  const scrollRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="w-full text-center py-6 border border-dashed border-slate-800 rounded-2xl bg-slate-900/30">
        <Sparkles className="w-8 h-8 text-sky-400/60 mx-auto mb-2" />
        <p className="text-sm font-semibold text-slate-300">Live Voice & Text AI Ready Hai</p>
        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
          Niche box mein likhein ya upar Orb par tap karke bolein. Aapka sawal aur task (jaise Chrome search) turant pura hoga!
        </p>
      </div>
    );
  }

  return (
    <div className="w-full bg-slate-900/50 border border-slate-800/80 rounded-2xl p-4 shadow-xl">
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Bot className="w-4 h-4 text-sky-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Live AI Conversation & Answers
          </h3>
        </div>
        <span className="text-[10px] text-slate-500 font-mono">{messages.length} messages</span>
      </div>

      <div ref={scrollRef} className="space-y-4 max-h-80 overflow-y-auto pr-1">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div
              className={`max-w-[90%] sm:max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                msg.sender === 'user'
                  ? 'bg-gradient-to-r from-sky-600 to-indigo-600 text-white rounded-tr-none shadow-md shadow-sky-600/20'
                  : 'bg-slate-800/90 text-slate-100 rounded-tl-none border border-slate-700/70 shadow-md'
              }`}
            >
              <div className="flex items-center gap-1.5 mb-1.5 opacity-75 text-[10px]">
                {msg.sender === 'user' ? (
                  <>
                    <span className="font-medium">Aapka Sawal / Task</span>
                    <User className="w-3 h-3" />
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3 h-3 text-sky-400" />
                    <span className="text-sky-400 font-semibold">LiveNova AI (Direct Jawab)</span>
                  </>
                )}
                <span>•</span>
                <span>{msg.timestamp}</span>
              </div>

              {/* Text Answer */}
              <div className="text-[13.5px] font-normal whitespace-pre-wrap selection:bg-sky-400 selection:text-slate-950">
                {msg.text}
              </div>

              {/* Action Executed Badge */}
              {msg.actionExecuted && (
                <div className="mt-2.5 pt-2 border-t border-white/10 flex items-center justify-between text-[11px] font-semibold text-emerald-300">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{msg.actionExecuted}</span>
                  </div>
                </div>
              )}
            </div>

            {msg.sender === 'assistant' && (
              <div className="mt-1 flex items-center gap-3 px-2">
                <button
                  onClick={() => onSpeakText(msg.text)}
                  className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-sky-300 transition cursor-pointer"
                  title="Speak answer aloud"
                >
                  <Volume2 className="w-3 h-3" />
                  <span>Sunein (Voice)</span>
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
