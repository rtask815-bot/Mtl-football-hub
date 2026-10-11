import React, { useState, useEffect, useRef } from 'react';
import { 
  Phone, 
  PhoneOff, 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  Video, 
  VideoOff, 
  MessageSquare, 
  ShieldCheck, 
  Sparkles,
  Maximize2
} from 'lucide-react';

interface CallScreenModalProps {
  isOpen: boolean;
  onClose: () => void;
  peer: {
    id: string;
    username: string;
    avatar_url?: string;
    phone?: string;
    club?: string;
  } | null;
  callType: 'audio' | 'video';
  onSendMessage?: (peerId: string) => void;
}

export const CallScreenModal: React.FC<CallScreenModalProps> = ({
  isOpen,
  onClose,
  peer,
  callType: initialCallType,
  onSendMessage
}) => {
  const [callStatus, setCallStatus] = useState<'connecting' | 'ringing' | 'connected' | 'ended'>('connecting');
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(initialCallType === 'video');
  const [callType, setCallType] = useState(initialCallType);

  const audioContextRef = useRef<AudioContext | null>(null);
  const ringOscillatorRef = useRef<any>(null);
  const timerIntervalRef = useRef<any>(null);

  // Play synthesized dialing ringtone
  const startRingtone = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      audioContextRef.current = ctx;

      // Play periodic European/WhatsApp double ringtone pulses
      const playTone = () => {
        if (ctx.state === 'closed') return;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, ctx.currentTime); // 440Hz / 480Hz mix
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 1.2);
      };

      playTone();
      const ringTimer = setInterval(playTone, 2800);
      ringOscillatorRef.current = ringTimer;
    } catch (e) {}
  };

  const stopRingtone = () => {
    if (ringOscillatorRef.current) {
      clearInterval(ringOscillatorRef.current);
      ringOscillatorRef.current = null;
    }
    if (audioContextRef.current) {
      try {
        audioContextRef.current.close();
      } catch (e) {}
      audioContextRef.current = null;
    }
  };

  const playEndCallTone = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(320, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(160, ctx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } catch (e) {}
  };

  useEffect(() => {
    if (isOpen && peer) {
      setCallStatus('connecting');
      setCallDuration(0);
      setIsVideoEnabled(initialCallType === 'video');
      setCallType(initialCallType);

      // Ring sequence
      startRingtone();
      const ringingTimer = setTimeout(() => {
        setCallStatus('ringing');
      }, 1500);

      // Connect sequence (connected after 3.8s)
      const connectTimer = setTimeout(() => {
        stopRingtone();
        setCallStatus('connected');
        timerIntervalRef.current = setInterval(() => {
          setCallDuration((prev) => prev + 1);
        }, 1000);
      }, 3800);

      return () => {
        clearTimeout(ringingTimer);
        clearTimeout(connectTimer);
        stopRingtone();
        if (timerIntervalRef.current) {
          clearInterval(timerIntervalRef.current);
          timerIntervalRef.current = null;
        }
      };
    }
  }, [isOpen, peer, initialCallType]);

  const handleEndCall = () => {
    stopRingtone();
    playEndCallTone();
    setCallStatus('ended');
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    setTimeout(() => {
      onClose();
    }, 900);
  };

  if (!isOpen || !peer) return null;

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const avatar = peer.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${peer.id || peer.username}`;

  return (
    <div className="fixed inset-0 z-[200] bg-slate-950/95 backdrop-blur-xl flex flex-col items-center justify-between p-6 sm:p-10 select-none animate-in fade-in duration-300">
      
      {/* Top Meta Bar */}
      <div className="w-full max-w-md flex items-center justify-between text-xs text-slate-400 z-10">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900/80 border border-slate-800 text-emerald-400 font-medium">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>MTL End-to-End Encrypted Hotline</span>
        </div>
        <div className="px-3 py-1.5 rounded-full bg-slate-900/80 border border-slate-800 font-mono text-slate-300">
          {callStatus === 'connected' ? formatTimer(callDuration) : callStatus.toUpperCase()}
        </div>
      </div>

      {/* Main Center Area: Audio Profile or Simulated Video Feed */}
      <div className="flex-1 flex flex-col items-center justify-center my-auto w-full max-w-md relative z-10">
        
        {isVideoEnabled && callStatus === 'connected' ? (
          /* Simulated Full Video Feed */
          <div className="w-full aspect-[4/3] sm:aspect-video rounded-3xl overflow-hidden relative border border-slate-800 shadow-2xl bg-slate-900 flex items-center justify-center">
            {/* Peer Background Video Frame */}
            <img 
              src={avatar} 
              alt={peer.username}
              className="w-full h-full object-cover filter blur-[2px] opacity-40 scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent flex flex-col items-center justify-center">
              <img 
                src={avatar} 
                alt={peer.username}
                className="w-24 h-24 rounded-full border-2 border-emerald-400 shadow-xl object-cover"
              />
              <p className="text-white font-extrabold mt-3 text-base font-['Orbitron']">{peer.username}</p>
              <span className="text-emerald-400 text-xs font-mono">HD 1080p Stream Active</span>
            </div>

            {/* PIP Self-Camera View */}
            <div className="absolute bottom-3 right-3 w-24 h-32 rounded-2xl bg-slate-950 border border-emerald-500/50 overflow-hidden shadow-xl flex items-center justify-center">
              <div className="w-full h-full bg-gradient-to-tr from-slate-900 to-emerald-950 flex flex-col items-center justify-center text-center p-1">
                <span className="text-[10px] text-emerald-400 font-bold">You</span>
                <span className="text-[9px] text-slate-400 font-mono">Live</span>
              </div>
            </div>
          </div>
        ) : (
          /* Audio Call Visualizer & Avatar */
          <div className="flex flex-col items-center text-center space-y-5">
            <div className="relative">
              {/* Outer Pulse Rings */}
              {callStatus !== 'ended' && (
                <>
                  <div className="absolute -inset-4 rounded-full bg-emerald-500/10 animate-ping [animation-duration:2.5s]" />
                  <div className="absolute -inset-8 rounded-full bg-cyan-500/10 animate-pulse [animation-duration:2s]" />
                </>
              )}

              {/* Avatar */}
              <div className="w-32 h-32 sm:w-36 sm:h-36 rounded-full p-1 bg-gradient-to-tr from-emerald-400 via-teal-400 to-cyan-500 shadow-2xl relative">
                <img
                  src={avatar}
                  alt={peer.username}
                  className="w-full h-full rounded-full object-cover bg-slate-900"
                />
                {callStatus === 'connected' && (
                  <div className="absolute bottom-1 right-1 w-6 h-6 rounded-full bg-emerald-500 border-2 border-slate-950 flex items-center justify-center">
                    <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-1">
              <h2 className="text-2xl font-black text-white font-['Orbitron'] tracking-wider">
                {peer.username}
              </h2>
              {peer.phone && (
                <p className="text-xs text-slate-400 font-mono">{peer.phone}</p>
              )}
              {peer.club && (
                <div className="inline-block mt-1 px-3 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-[11px] font-semibold text-emerald-300">
                  {peer.club} Fan
                </div>
              )}
              <p className="text-sm font-semibold text-emerald-400 pt-2 tracking-wide font-['Orbitron']">
                {callStatus === 'connecting' && 'CONNECTING ENCRYPTED HOTLINE...'}
                {callStatus === 'ringing' && 'RINGING PEER...'}
                {callStatus === 'connected' && formatTimer(callDuration)}
                {callStatus === 'ended' && 'CALL TERMINATED'}
              </p>
            </div>
          </div>
        )}

      </div>

      {/* Action Control Bar (WhatsApp / Telegram style) */}
      <div className="w-full max-w-md bg-[#0a1424]/90 border border-slate-800 rounded-3xl p-4 sm:p-5 shadow-2xl z-10">
        <div className="flex items-center justify-between gap-3">
          
          {/* Mute Mic */}
          <button
            onClick={() => setIsMuted(!isMuted)}
            className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all cursor-pointer ${
              isMuted
                ? 'bg-red-500/20 border border-red-500 text-red-400'
                : 'bg-slate-800 hover:bg-slate-700 text-white'
            }`}
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          {/* Toggle Video */}
          <button
            onClick={() => {
              setIsVideoEnabled(!isVideoEnabled);
              setCallType(isVideoEnabled ? 'audio' : 'video');
            }}
            className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all cursor-pointer ${
              isVideoEnabled
                ? 'bg-cyan-500/20 border border-cyan-400 text-cyan-300'
                : 'bg-slate-800 hover:bg-slate-700 text-white'
            }`}
            title={isVideoEnabled ? 'Switch to Audio' : 'Switch to Video'}
          >
            {isVideoEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
          </button>

          {/* Speaker Phone */}
          <button
            onClick={() => setIsSpeaker(!isSpeaker)}
            className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all cursor-pointer ${
              isSpeaker
                ? 'bg-emerald-500/20 border border-emerald-500 text-emerald-400'
                : 'bg-slate-800 hover:bg-slate-700 text-white'
            }`}
            title={isSpeaker ? 'Speaker On' : 'Speaker Off'}
          >
            {isSpeaker ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </button>

          {/* Quick Chat Switch */}
          {onSendMessage && (
            <button
              onClick={() => {
                onSendMessage(peer.id);
                handleEndCall();
              }}
              className="w-12 h-12 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center transition-all cursor-pointer"
              title="Open Chat with Peer"
            >
              <MessageSquare className="w-5 h-5 text-emerald-400" />
            </button>
          )}

          {/* END CALL BUTTON */}
          <button
            onClick={handleEndCall}
            className="w-14 h-14 rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white flex items-center justify-center shadow-lg shadow-red-950/60 active:scale-95 transition-all cursor-pointer"
            title="End Call"
          >
            <PhoneOff className="w-6 h-6" />
          </button>

        </div>
      </div>

    </div>
  );
};

export default CallScreenModal;
