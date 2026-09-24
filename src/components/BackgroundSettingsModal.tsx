import React from 'react';
import {
  Settings,
  Bell,
  Sun,
  Radio,
  Globe,
  Volume2,
  X,
  CheckCircle,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { backgroundService } from '../services/backgroundService';

interface BackgroundSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  isKeepAlive: boolean;
  isWakeLock: boolean;
  language: string;
  onToggleKeepAlive: () => void;
  onToggleWakeLock: () => void;
  onChangeLanguage: (lang: string) => void;
}

export const BackgroundSettingsModal: React.FC<BackgroundSettingsModalProps> = ({
  isOpen,
  onClose,
  isKeepAlive,
  isWakeLock,
  language,
  onToggleKeepAlive,
  onToggleWakeLock,
  onChangeLanguage,
}) => {
  const [notificationStatus, setNotificationStatus] = React.useState<'default' | 'granted' | 'denied'>('default');

  React.useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotificationStatus(Notification.permission as any);
    }
  }, [isOpen]);

  const handleRequestNotifications = async () => {
    const granted = await backgroundService.requestNotificationPermission();
    setNotificationStatus(granted ? 'granted' : 'denied');
    if (granted) {
      backgroundService.sendNotification('LiveNova Background Active', 'Background notifications enabled!');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
      <div className="w-full max-w-md rounded-3xl bg-slate-900 border border-slate-700 p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-sky-400" />
            <h3 className="text-base font-bold text-white">Background & Voice Settings</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-5 space-y-4">
          {/* Background Audio Keep-Alive */}
          <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-white flex items-center gap-1.5">
                <Radio className="w-4 h-4 text-sky-400" />
                Background Keep-Alive Audio
              </div>
              <div className="text-xs text-slate-400 mt-0.5">
                Mobile screen lock ya tab minimize hone par audio thread active rakhta hai.
              </div>
            </div>
            <button
              onClick={onToggleKeepAlive}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                isKeepAlive
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                  : 'bg-slate-700 text-slate-300'
              }`}
            >
              {isKeepAlive ? 'ON' : 'OFF'}
            </button>
          </div>

          {/* Screen Wake Lock */}
          <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-white flex items-center gap-1.5">
                <Sun className="w-4 h-4 text-amber-400" />
                Screen Wake Lock (Always Awake)
              </div>
              <div className="text-xs text-slate-400 mt-0.5">
                Hands-free voice use ke dauran display ko sleep hone se rokta hai.
              </div>
            </div>
            <button
              onClick={onToggleWakeLock}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                isWakeLock
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'bg-slate-700 text-slate-300'
              }`}
            >
              {isWakeLock ? 'Active' : 'Disabled'}
            </button>
          </div>

          {/* Web Push Notifications */}
          <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-white flex items-center gap-1.5">
                <Bell className="w-4 h-4 text-purple-400" />
                Background Push Alerts
              </div>
              <div className="text-xs text-slate-400 mt-0.5">
                Timer poora hone par background notification pop-up.
              </div>
            </div>
            {notificationStatus === 'granted' ? (
              <span className="flex items-center gap-1 text-xs text-emerald-400 font-semibold px-2 py-1 bg-emerald-950/60 rounded-lg">
                <CheckCircle className="w-3.5 h-3.5" /> Allowed
              </span>
            ) : (
              <button
                onClick={handleRequestNotifications}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-purple-600 hover:bg-purple-500 text-white transition cursor-pointer"
              >
                Allow
              </button>
            )}
          </div>

          {/* Language Selector */}
          <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/60">
            <div className="text-sm font-semibold text-white flex items-center gap-1.5 mb-2">
              <Globe className="w-4 h-4 text-teal-400" />
              Voice Language (Bhasha)
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { code: 'hi-IN', label: 'Hindi / Hinglish (हिन्दी)' },
                { code: 'en-IN', label: 'English (India)' },
              ].map((item) => (
                <button
                  key={item.code}
                  onClick={() => onChangeLanguage(item.code)}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold text-center border transition cursor-pointer ${
                    language === item.code
                      ? 'bg-sky-500/20 border-sky-400 text-sky-300'
                      : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Device Hardware Boundary Note */}
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-[11px] text-slate-400 flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
            <span>
              <strong>Note:</strong> PWA & web browsers device hardware shutdown / reboot ko allow nahi karte
              hai security reasons se. Baaki torch, audio, alarms, apps, notes sab smoothly execute hote hain!
            </span>
          </div>
        </div>

        <button
          onClick={onClose}
          className="mt-6 w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-sm font-semibold transition"
        >
          Ho Gaya (Done)
        </button>
      </div>
    </div>
  );
};
