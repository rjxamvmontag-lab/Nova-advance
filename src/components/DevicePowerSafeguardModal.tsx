import React from 'react';
import { ShieldAlert, CheckCircle, PowerOff, X } from 'lucide-react';

interface DevicePowerSafeguardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DevicePowerSafeguardModal: React.FC<DevicePowerSafeguardModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
      <div className="w-full max-w-md rounded-3xl bg-slate-900 border border-slate-700 p-6 shadow-2xl relative overflow-hidden">
        {/* Ambient Top Glow */}
        <div className="absolute -top-12 -left-12 w-32 h-32 bg-amber-500/20 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-start justify-between">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <h3 className="text-lg font-bold text-white mt-4">
          Device Hardware Power Restriction
        </h3>

        <p className="text-sm text-slate-300 mt-2 leading-relaxed">
          Aapne mobile switch off / restart karne ko kaha. Mobile OS (Android & iOS) aur browser security
          sandboxes kisi bhi web ya PWA app ko <strong>phone hardware switch off / on</strong> karne ki anumati
          nahi dete hain taaki koi bhi app device ko bina permission lock na kar sake.
        </p>

        <div className="mt-4 p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700/80">
          <div className="text-xs font-semibold text-sky-400 mb-2 flex items-center gap-1.5">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            Par LiveNova baaki sab kuch execute kar sakta hai:
          </div>
          <ul className="text-xs text-slate-300 space-y-1.5 list-disc list-inside">
            <li>Flashlight / Torch chalu ya band karna</li>
            <li>Alarms aur Timers background mein bajana</li>
            <li>WhatsApp, YouTube, Maps, Dialer kholna</li>
            <li>Haptic vibration aur ambient sounds play karna</li>
            <li>Direct sawalon ka turant jawab bolna</li>
          </ul>
        </div>

        <button
          onClick={onClose}
          className="mt-5 w-full py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 text-white text-sm font-semibold hover:from-sky-400 hover:to-indigo-500 transition shadow-lg shadow-sky-500/20"
        >
          Samajh Gaya, Shuru Karein
        </button>
      </div>
    </div>
  );
};
