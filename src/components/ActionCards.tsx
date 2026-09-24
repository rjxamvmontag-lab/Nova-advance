import React from 'react';
import {
  Timer,
  Flashlight,
  StickyNote,
  Volume2,
  Trash2,
  Play,
  Pause,
  Copy,
  Check,
  Radio,
  Zap,
  Globe,
  Search,
} from 'lucide-react';
import { TimerItem, NoteItem } from '../services/actionExecutor';

interface ActionCardsProps {
  timers: TimerItem[];
  notes: NoteItem[];
  isTorchOn: boolean;
  activeSound: string | null;
  onToggleTorch: () => void;
  onDeleteTimer: (id: string) => void;
  onToggleTimer: (id: string) => void;
  onDeleteNote: (id: string) => void;
  onPlaySound: (sound: string) => void;
  onQuickPrompt: (prompt: string) => void;
}

export const ActionCards: React.FC<ActionCardsProps> = ({
  timers,
  notes,
  isTorchOn,
  activeSound,
  onToggleTorch,
  onDeleteTimer,
  onToggleTimer,
  onDeleteNote,
  onPlaySound,
  onQuickPrompt,
}) => {
  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  const copyNote = (note: NoteItem) => {
    navigator.clipboard.writeText(`${note.title}: ${note.content}`);
    setCopiedId(note.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-full space-y-4">
      {/* Quick Action Control Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {/* Chrome Web Search Task */}
        <button
          onClick={() => onQuickPrompt('Chrome open karo aur trending news search karo')}
          className="flex items-center gap-2.5 p-3 rounded-2xl border bg-slate-900/80 border-slate-800 text-slate-300 hover:border-sky-500/50 hover:bg-sky-950/20 transition-all cursor-pointer text-left group"
        >
          <div className="w-9 h-9 rounded-xl bg-sky-950/80 text-sky-400 flex items-center justify-center group-hover:bg-sky-500 group-hover:text-slate-950 transition-colors">
            <Globe className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-semibold">Chrome Search</div>
            <div className="text-[10px] text-slate-400">Open Browser</div>
          </div>
        </button>

        {/* Torch Toggle */}
        <button
          onClick={onToggleTorch}
          className={`flex items-center gap-2.5 p-3 rounded-2xl border transition-all cursor-pointer text-left ${
            isTorchOn
              ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow-lg shadow-amber-500/20'
              : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:border-slate-700'
          }`}
        >
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center ${
              isTorchOn ? 'bg-amber-400 text-slate-950 font-bold' : 'bg-slate-800 text-slate-400'
            }`}
          >
            <Flashlight className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-semibold">Flashlight / Torch</div>
            <div className="text-[10px] text-slate-400">{isTorchOn ? 'CHALU (ON)' : 'BAND (OFF)'}</div>
          </div>
        </button>

        {/* Quick App Shortcut: WhatsApp */}
        <button
          onClick={() => onQuickPrompt('WhatsApp kholo')}
          className="flex items-center gap-2.5 p-3 rounded-2xl border bg-slate-900/80 border-slate-800 text-slate-300 hover:border-emerald-500/40 hover:bg-emerald-950/20 transition-all cursor-pointer text-left group"
        >
          <div className="w-9 h-9 rounded-xl bg-emerald-950/80 text-emerald-400 flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-slate-950 transition-colors">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-semibold">Open WhatsApp</div>
            <div className="text-[10px] text-slate-400">Direct Command</div>
          </div>
        </button>

        {/* Ambient Sound Player */}
        <button
          onClick={() => onPlaySound(activeSound ? 'stop' : 'rain')}
          className={`flex items-center gap-2.5 p-3 rounded-2xl border transition-all cursor-pointer text-left ${
            activeSound
              ? 'bg-indigo-500/20 border-indigo-400 text-indigo-300 shadow-lg shadow-indigo-500/20'
              : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:border-slate-700'
          }`}
        >
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center ${
              activeSound ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-slate-400'
            }`}
          >
            <Volume2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-semibold">Ambient Audio</div>
            <div className="text-[10px] text-slate-400">
              {activeSound ? `${activeSound} playing` : 'Rain / Focus'}
            </div>
          </div>
        </button>
      </div>

      {/* Suggested Quick Tasks */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <span className="text-[11px] font-semibold text-slate-400 uppercase shrink-0">Try Tasks:</span>
        {[
          'Chrome me iPhone 16 price search karo',
          'Chai timer 2 min',
          'Torch on karo',
          'WhatsApp kholo',
          'YouTube par trending gaane dikhao',
          '18% GST on 4500 kitna hoga?',
          'Note likho: Kal meeting 10 baje hai',
        ].map((sample, idx) => (
          <button
            key={idx}
            onClick={() => onQuickPrompt(sample)}
            className="shrink-0 px-3 py-1 rounded-full bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 text-slate-300 text-xs transition cursor-pointer hover:border-sky-400"
          >
            "{sample}"
          </button>
        ))}
      </div>

      {/* Active Timers List */}
      {timers.length > 0 && (
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
              <Timer className="w-4 h-4" />
              Active Timers ({timers.length})
            </h3>
            <span className="text-[10px] text-slate-400">Background buzzer alerts enabled</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {timers.map((t) => (
              <div
                key={t.id}
                className={`p-3 rounded-xl border flex items-center justify-between ${
                  t.remainingSeconds === 0
                    ? 'bg-rose-950/40 border-rose-500/50 animate-pulse'
                    : 'bg-slate-800/60 border-slate-700/60'
                }`}
              >
                <div>
                  <div className="font-semibold text-sm text-white">{t.label || 'Timer'}</div>
                  <div className="text-2xl font-mono font-bold text-sky-300 mt-0.5">
                    {formatTime(t.remainingSeconds)}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onToggleTimer(t.id)}
                    className="p-2 rounded-lg bg-slate-700/80 hover:bg-slate-600 text-slate-200 transition cursor-pointer"
                  >
                    {t.isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => onDeleteTimer(t.id)}
                    className="p-2 rounded-lg bg-rose-950/40 hover:bg-rose-900 text-rose-300 transition cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Notes & Tasks */}
      {notes.length > 0 && (
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <StickyNote className="w-4 h-4" />
              Saved Notes & Tasks ({notes.length})
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {notes.map((n) => (
              <div
                key={n.id}
                className="p-3 rounded-xl border border-slate-800 bg-slate-850/60 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-200">{n.title}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                      {n.category || 'General'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-1.5 whitespace-pre-wrap">{n.content}</p>
                </div>

                <div className="flex items-center justify-end gap-2 mt-3 pt-2 border-t border-slate-800/60">
                  <button
                    onClick={() => copyNote(n)}
                    className="p-1.5 rounded-md hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition cursor-pointer"
                    title="Copy note"
                  >
                    {copiedId === n.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    onClick={() => onDeleteNote(n.id)}
                    className="p-1.5 rounded-md hover:bg-rose-900/50 text-slate-400 hover:text-rose-400 transition cursor-pointer"
                    title="Delete note"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
