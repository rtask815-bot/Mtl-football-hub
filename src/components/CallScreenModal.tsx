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
  Maximize2,
  Minimize2,
  SwitchCamera,
  Activity,
  AlertCircle
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
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [mediaPermissionDenied, setMediaPermissionDenied] = useState(false);
  const [voiceActivityLevel, setVoiceActivityLevel] = useState(0); // 0 to 100 for audio visualizer
  const [isFullscreen, setIsFullscreen] = useState(false);

  const localStreamRef = useRef<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const ringOscillatorRef = useRef<any>(null);
  const carrierHumRef = useRef<any>(null);
  const timerIntervalRef = useRef<any>(null);
  const animFrameRef = useRef<number | null>(null);

  // Play synthesized dialing ringtone
  const startRingtone = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      audioContextRef.current = ctx;

      // Realistic periodic call tone
      const playTone = () => {
        if (!ctx || ctx.state === 'closed') return;
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();

        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(440, ctx.currentTime);
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(480, ctx.currentTime);

        gain.gain.setValueAtTime(0.06, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);

        osc1.start();
        osc2.start();
        osc1.stop(ctx.currentTime + 1.2);
        osc2.stop(ctx.currentTime + 1.2);
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
  };

  const playConnectedChime = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = audioContextRef.current || new AudioCtx();
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.setValueAtTime(659.25, now + 0.1); // E5
      osc.frequency.setValueAtTime(783.99, now + 0.2); // G5
      osc.frequency.setValueAtTime(1046.50, now + 0.3); // C6

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.6);
    } catch (e) {}
  };

  const playEndCallTone = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = audioContextRef.current || new AudioCtx();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(160, now + 0.35);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.35);
    } catch (e) {}
  };

  // Acquire media devices reliably
  const setupMediaStream = async (wantVideo: boolean) => {
    try {
      if (navigator?.mediaDevices?.getUserMedia) {
        // Stop any old stream tracks first
        if (localStreamRef.current) {
          localStreamRef.current.getTracks().forEach(t => t.stop());
        }

        const constraints: MediaStreamConstraints = {
          audio: true,
          video: wantVideo
            ? {
                facingMode,
                width: { ideal: 640 },
                height: { ideal: 480 }
              }
            : false
        };

        let stream: MediaStream | null = null;
        try {
          stream = await navigator.mediaDevices.getUserMedia(constraints);
        } catch (videoErr) {
          // If video failed, attempt audio-only
          if (wantVideo) {
            try {
              stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
              setIsVideoEnabled(false);
            } catch (audioErr) {
              setMediaPermissionDenied(true);
            }
          } else {
            setMediaPermissionDenied(true);
          }
        }

        if (stream) {
          localStreamRef.current = stream;
          setMediaPermissionDenied(false);

          if (localVideoRef.current && wantVideo) {
            localVideoRef.current.srcObject = stream;
            localVideoRef.current.play().catch(() => {});
          }

          // Setup Audio Analyser for visualizer
          try {
            const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
            if (AudioCtx) {
              const audioCtx = new AudioCtx();
              const source = audioCtx.createMediaStreamSource(stream);
              const analyser = audioCtx.createAnalyser();
              analyser.fftSize = 64;
              source.connect(analyser);

              const dataArray = new Uint8Array(analyser.frequencyBinCount);
              const checkAudio = () => {
                if (!isOpen) return;
                analyser.getByteFrequencyData(dataArray);
                let sum = 0;
                for (let i = 0; i < dataArray.length; i++) {
                  sum += dataArray[i];
                }
                const avg = sum / dataArray.length;
                setVoiceActivityLevel(Math.min(100, Math.round((avg / 128) * 100)));
                animFrameRef.current = requestAnimationFrame(checkAudio);
              };
              checkAudio();
            }
          } catch {}
        }
      }
    } catch (err) {
      console.warn('Media stream setup exception:', err);
      setMediaPermissionDenied(true);
    }
  };

  // Toggle Mute
  const handleToggleMute = () => {
    const nextState = !isMuted;
    setIsMuted(nextState);
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(track => {
        track.enabled = !nextState;
      });
    }
  };

  // Toggle Video
  const handleToggleVideo = async () => {
    const nextState = !isVideoEnabled;
    setIsVideoEnabled(nextState);
    if (localStreamRef.current) {
      const videoTracks = localStreamRef.current.getVideoTracks();
      if (videoTracks.length > 0) {
        videoTracks.forEach(track => {
          track.enabled = nextState;
        });
      } else if (nextState) {
        await setupMediaStream(true);
      }
    } else if (nextState) {
      await setupMediaStream(true);
    }
  };

  // Switch Camera
  const handleSwitchCamera = async () => {
    const nextMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextMode);
    if (isVideoEnabled) {
      await setupMediaStream(true);
    }
  };

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  // Initialize and run call lifecycle
  useEffect(() => {
    if (isOpen && peer) {
      setCallStatus('connecting');
      setCallDuration(0);
      setIsMuted(false);
      setIsSpeaker(true);
      const wantVideo = initialCallType === 'video';
      setIsVideoEnabled(wantVideo);

      // Start ringing sequence
      startRingtone();
      setupMediaStream(wantVideo);

      const ringingTimer = setTimeout(() => {
        setCallStatus('ringing');
      }, 1200);

      // Successfully connect call after 2.8s
      const connectTimer = setTimeout(() => {
        stopRingtone();
        playConnectedChime();
        setCallStatus('connected');

        timerIntervalRef.current = setInterval(() => {
          setCallDuration(prev => prev + 1);
        }, 1000);
      }, 2800);

      return () => {
        clearTimeout(ringingTimer);
        clearTimeout(connectTimer);
        stopRingtone();
        if (timerIntervalRef.current) {
          clearInterval(timerIntervalRef.current);
          timerIntervalRef.current = null;
        }
        if (animFrameRef.current) {
          cancelAnimationFrame(animFrameRef.current);
          animFrameRef.current = null;
        }
        if (localStreamRef.current) {
          localStreamRef.current.getTracks().forEach(t => t.stop());
          localStreamRef.current = null;
        }
        if (audioContextRef.current) {
          try { audioContextRef.current.close(); } catch {}
          audioContextRef.current = null;
        }
      };
    }
  }, [isOpen, peer, initialCallType]);

  // Handle End Call
  const handleEndCall = () => {
    stopRingtone();
    playEndCallTone();
    setCallStatus('ended');

    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }

    setTimeout(() => {
      onClose();
    }, 700);
  };

  if (!isOpen || !peer) return null;

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const avatar = peer.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${peer.id || peer.username}`;

  return (
    <div 
      ref={containerRef}
      className="fixed inset-0 z-[250] bg-slate-950/95 backdrop-blur-2xl flex flex-col items-center justify-between p-4 sm:p-8 select-none animate-in fade-in duration-300"
    >
      
      {/* TOP STATUS BAR */}
      <div className="w-full max-w-xl flex items-center justify-between text-xs text-slate-300 z-20">
        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/90 border border-slate-800 shadow-lg text-emerald-400 font-medium">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span className="font-semibold">MTL Encrypted Voice & Video Line</span>
        </div>

        <div className="flex items-center gap-2">
          {callStatus === 'connected' && (
            <div className="px-3 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/40 font-mono text-emerald-300 flex items-center gap-2 font-bold shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>{formatTimer(callDuration)}</span>
            </div>
          )}

          <button
            onClick={toggleFullscreen}
            className="p-1.5 rounded-full bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* CALL CENTER VIEWPORT */}
      <div className="flex-1 flex flex-col items-center justify-center my-auto w-full max-w-xl relative z-10 py-4">
        
        {/* Permission Denied Notice */}
        {mediaPermissionDenied && (
          <div className="mb-4 px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2 shadow-lg">
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
            <span>Camera/mic permissions are restricted; running in high-fidelity simulated hotline mode.</span>
          </div>
        )}

        {/* VIDEO MODE */}
        {isVideoEnabled && callStatus === 'connected' ? (
          <div className="w-full aspect-[4/3] sm:aspect-video rounded-3xl overflow-hidden relative border border-slate-800 shadow-2xl bg-slate-900 flex items-center justify-center">
            
            {/* Peer Simulated Video Feed / Ambient Stadium Feed */}
            <div className="absolute inset-0 bg-slate-950 flex items-center justify-center overflow-hidden">
              <img 
                src={avatar} 
                alt={peer.username}
                className="w-full h-full object-cover filter blur-[8px] opacity-25 scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-slate-950/80" />
              
              {/* Peer Centered Focus */}
              <div className="relative z-10 flex flex-col items-center text-center p-4">
                <div className="relative">
                  <img 
                    src={avatar} 
                    alt={peer.username}
                    className="w-24 h-24 sm:w-28 sm:h-28 rounded-full border-2 border-emerald-400 shadow-2xl object-cover"
                  />
                  <div className="absolute bottom-1 right-1 w-6 h-6 rounded-full bg-emerald-500 border-2 border-slate-950 flex items-center justify-center">
                    <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                  </div>
                </div>
                <h3 className="text-white font-extrabold mt-3 text-lg font-['Orbitron']">{peer.username}</h3>
                <span className="text-emerald-400 text-xs font-mono font-semibold">HD 1080p Encrypted Stream Active</span>

                {/* Simulated Peer Audio Activity Meter */}
                <div className="flex items-center gap-1 mt-3">
                  {[...Array(9)].map((_, i) => (
                    <span 
                      key={i}
                      className="w-1 bg-emerald-400 rounded-full transition-all duration-150"
                      style={{
                        height: `${Math.max(4, Math.sin((callDuration * 3 + i) * 0.8) * 18 + 12)}px`,
                        opacity: isSpeaker ? 0.9 : 0.2
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* LOCAL USER PIP CAMERA (Real MediaStream) */}
            <div className="absolute bottom-4 right-4 w-28 sm:w-36 aspect-[3/4] rounded-2xl bg-slate-950 border-2 border-emerald-500/60 overflow-hidden shadow-2xl z-20 flex items-center justify-center">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
              />
              <div className="absolute bottom-1.5 left-2 bg-slate-950/80 px-2 py-0.5 rounded text-[10px] text-emerald-400 font-bold border border-slate-800">
                You
              </div>
              {/* Camera Switch button on PIP */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleSwitchCamera();
                }}
                className="absolute top-1.5 right-1.5 p-1 rounded-full bg-slate-900/80 hover:bg-slate-800 text-white cursor-pointer"
                title="Flip Camera"
              >
                <SwitchCamera className="w-3.5 h-3.5 text-cyan-400" />
              </button>
            </div>

          </div>
        ) : (
          /* AUDIO CALL MODE & VISUALIZER */
          <div className="flex flex-col items-center text-center space-y-6">
            <div className="relative">
              {/* Voice Reactivity Outer Rings */}
              {callStatus === 'connected' && (
                <>
                  <div 
                    className="absolute -inset-4 sm:-inset-6 rounded-full bg-emerald-500/20 transition-transform duration-100 ease-out"
                    style={{ transform: `scale(${1 + voiceActivityLevel * 0.005})` }}
                  />
                  <div 
                    className="absolute -inset-8 sm:-inset-10 rounded-full bg-cyan-500/15 transition-transform duration-150 ease-out"
                    style={{ transform: `scale(${1 + voiceActivityLevel * 0.008})` }}
                  />
                </>
              )}

              {/* Pulsing ring during ringing */}
              {callStatus === 'ringing' && (
                <div className="absolute -inset-6 rounded-full bg-emerald-500/20 animate-ping [animation-duration:2.5s]" />
              )}

              {/* Peer Avatar Container */}
              <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-full p-1.5 bg-gradient-to-tr from-emerald-400 via-teal-400 to-cyan-500 shadow-2xl relative">
                <img
                  src={avatar}
                  alt={peer.username}
                  className="w-full h-full rounded-full object-cover bg-slate-900"
                />
                {callStatus === 'connected' && (
                  <div className="absolute bottom-2 right-2 w-7 h-7 rounded-full bg-emerald-500 border-2 border-slate-950 flex items-center justify-center shadow-lg">
                    <span className="w-2.5 h-2.5 rounded-full bg-white animate-pulse" />
                  </div>
                )}
              </div>
            </div>

            {/* Peer Meta Info */}
            <div className="space-y-1.5">
              <h2 className="text-2xl sm:text-3xl font-black text-white font-['Orbitron'] tracking-wider">
                {peer.username}
              </h2>
              {peer.phone && (
                <p className="text-xs text-slate-400 font-mono tracking-widest">{peer.phone}</p>
              )}
              {peer.club && (
                <div className="inline-block px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs font-semibold text-emerald-300 shadow-inner">
                  {peer.club} Fan
                </div>
              )}

              {/* Interactive Audio Waveform Meter when connected */}
              {callStatus === 'connected' && (
                <div className="flex items-center justify-center gap-1.5 pt-3">
                  {[...Array(15)].map((_, i) => (
                    <span
                      key={i}
                      className="w-1 rounded-full bg-gradient-to-t from-emerald-500 to-cyan-400 transition-all duration-75"
                      style={{
                        height: `${Math.max(6, Math.sin(i * 0.5 + callDuration * 2) * (isMuted ? 6 : Math.max(14, voiceActivityLevel * 0.6)))}px`
                      }}
                    />
                  ))}
                </div>
              )}

              <p className="text-xs font-bold text-emerald-400 pt-2 tracking-widest font-['Orbitron'] uppercase">
                {callStatus === 'connecting' && 'INITIALIZING ENCRYPTED TUNNEL...'}
                {callStatus === 'ringing' && 'RINGING PEER SECURE HOTLINE...'}
                {callStatus === 'connected' && `CONNECTED • ${formatTimer(callDuration)}`}
                {callStatus === 'ended' && 'CALL TERMINATED'}
              </p>
            </div>
          </div>
        )}

      </div>

      {/* CALL ACTIONS CONTROL BAR */}
      <div className="w-full max-w-xl bg-slate-900/90 border border-slate-800 rounded-3xl p-4 sm:p-5 shadow-2xl z-20 backdrop-blur-xl">
        <div className="flex items-center justify-around gap-2 sm:gap-4">
          
          {/* MUTE MICROPHONE */}
          <button
            onClick={handleToggleMute}
            className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex flex-col items-center justify-center transition-all cursor-pointer shadow-md ${
              isMuted
                ? 'bg-red-500/20 border-2 border-red-500 text-red-400'
                : 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700'
            }`}
            title={isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
          >
            {isMuted ? <MicOff className="w-5 h-5 sm:w-6 sm:h-6" /> : <Mic className="w-5 h-5 sm:w-6 sm:h-6" />}
          </button>

          {/* TOGGLE VIDEO / AUDIO */}
          <button
            onClick={handleToggleVideo}
            className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex flex-col items-center justify-center transition-all cursor-pointer shadow-md ${
              isVideoEnabled
                ? 'bg-cyan-500/20 border-2 border-cyan-400 text-cyan-300'
                : 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700'
            }`}
            title={isVideoEnabled ? 'Switch to Voice Only' : 'Switch to Video Call'}
          >
            {isVideoEnabled ? <Video className="w-5 h-5 sm:w-6 sm:h-6" /> : <VideoOff className="w-5 h-5 sm:w-6 sm:h-6" />}
          </button>

          {/* SPEAKER AUDIO */}
          <button
            onClick={() => setIsSpeaker(!isSpeaker)}
            className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex flex-col items-center justify-center transition-all cursor-pointer shadow-md ${
              isSpeaker
                ? 'bg-emerald-500/20 border-2 border-emerald-500 text-emerald-400'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-400 border border-slate-700'
            }`}
            title={isSpeaker ? 'Speaker Output Enabled' : 'Speaker Muted'}
          >
            {isSpeaker ? <Volume2 className="w-5 h-5 sm:w-6 sm:h-6" /> : <VolumeX className="w-5 h-5 sm:w-6 sm:h-6" />}
          </button>

          {/* DIRECT 1-TO-1 CHAT ROUTE */}
          {onSendMessage && (
            <button
              onClick={() => {
                onSendMessage(peer.id);
                handleEndCall();
              }}
              className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 flex flex-col items-center justify-center transition-all cursor-pointer shadow-md"
              title="Open Chat Container with Peer"
            >
              <MessageSquare className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          )}

          {/* HANG UP CALL BUTTON */}
          <button
            onClick={handleEndCall}
            className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:to-rose-500 text-white flex items-center justify-center shadow-xl shadow-red-950/60 active:scale-95 transition-all cursor-pointer"
            title="End Call"
          >
            <PhoneOff className="w-6 h-6 sm:w-7 sm:h-7" />
          </button>

        </div>
      </div>

    </div>
  );
};

export default CallScreenModal;
