import React, { useState, useRef, useEffect } from 'react';
import { 
  Mic, 
  Square, 
  Trash2, 
  Send, 
  Play, 
  Pause, 
  X, 
  Volume2,
  RotateCcw
} from 'lucide-react';

interface VoiceNoteRecorderProps {
  isOpen: boolean;
  onClose: () => void;
  onSendVoiceNote: (voiceNoteData: {
    audioUrl: string;
    duration: number;
    waveform: number[];
  }) => void;
}

export const VoiceNoteRecorder: React.FC<VoiceNoteRecorderProps> = ({
  isOpen,
  onClose,
  onSendVoiceNote
}) => {
  const [recordingState, setRecordingState] = useState<'idle' | 'recording' | 'preview'>('idle');
  const [recordDuration, setRecordDuration] = useState(0);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [previewProgress, setPreviewProgress] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [waveformSamples, setWaveformSamples] = useState<number[]>([]);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<any>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);

  // Auto-start recording when modal/bar opens
  useEffect(() => {
    if (isOpen) {
      startRecording();
    } else {
      cleanupRecording();
    }
    return () => {
      cleanupRecording();
    };
  }, [isOpen]);

  const cleanupRecording = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {}
    }
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach((track) => track.stop());
      audioStreamRef.current = null;
    }
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current = null;
    }
    setRecordingState('idle');
    setRecordDuration(0);
    setIsPlayingPreview(false);
    setPreviewProgress(0);
    setAudioUrl(null);
  };

  const startRecording = async () => {
    setPermissionError(null);
    audioChunksRef.current = [];
    setRecordDuration(0);
    setWaveformSamples([]);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Microphone access is not supported in this browser.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;

      // Select supported mimeType
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : MediaRecorder.isTypeSupported('audio/mp4')
        ? 'audio/mp4'
        : 'audio/ogg';

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64Audio = reader.result as string;
          setAudioUrl(base64Audio);
          setRecordingState('preview');
        };
        reader.readAsDataURL(audioBlob);
      };

      recorder.start(100);
      setRecordingState('recording');

      // Timer and waveform simulation
      timerIntervalRef.current = setInterval(() => {
        setRecordDuration((prev) => {
          const next = prev + 1;
          setWaveformSamples((samples) => {
            const randomHeight = Math.floor(Math.random() * 65) + 30;
            return [...samples.slice(-24), randomHeight];
          });
          return next;
        });
      }, 1000);
    } catch (err: any) {
      console.warn('Microphone permission error:', err);
      setPermissionError(err.message || 'Microphone access denied. Please allow microphone permission.');
      setRecordingState('idle');
    }
  };

  const stopAndPreview = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach((track) => track.stop());
      audioStreamRef.current = null;
    }
  };

  const togglePlayPreview = () => {
    if (!audioUrl) return;

    if (!previewAudioRef.current) {
      const audio = new Audio(audioUrl);
      previewAudioRef.current = audio;

      audio.ontimeupdate = () => {
        if (audio.duration) {
          setPreviewProgress((audio.currentTime / audio.duration) * 100);
        }
      };

      audio.onended = () => {
        setIsPlayingPreview(false);
        setPreviewProgress(0);
      };
    }

    if (isPlayingPreview) {
      previewAudioRef.current.pause();
      setIsPlayingPreview(false);
    } else {
      previewAudioRef.current.play();
      setIsPlayingPreview(true);
    }
  };

  const handleSend = () => {
    if (!audioUrl) return;
    const finalSamples = waveformSamples.length > 0 
      ? waveformSamples 
      : [40, 75, 30, 90, 60, 100, 45, 80, 50, 65, 35, 85, 55, 70, 95];

    onSendVoiceNote({
      audioUrl,
      duration: Math.max(recordDuration, 1),
      waveform: finalSamples
    });
    cleanupRecording();
    onClose();
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  return (
    <div className="w-full bg-[#070e1c] border-t border-emerald-500/40 p-3 sm:p-4 animate-in slide-in-from-bottom-3 duration-200 z-30 shadow-2xl">
      <div className="max-w-2xl mx-auto">
        
        {/* Permission Error State */}
        {permissionError ? (
          <div className="flex items-center justify-between gap-3 p-3 bg-red-950/40 border border-red-500/40 rounded-2xl text-xs text-red-200">
            <div className="flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-red-400 shrink-0" />
              <span>{permissionError}</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={startRecording}
                className="px-3 py-1 bg-red-800 hover:bg-red-700 text-white rounded-lg font-bold transition-colors cursor-pointer"
              >
                Retry
              </button>
              <button
                onClick={onClose}
                className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : recordingState === 'recording' ? (
          /* Live Recording Screen */
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {/* Red Blinking Pulse Indicator */}
              <div className="relative flex items-center justify-center">
                <span className="w-4 h-4 rounded-full bg-red-500 animate-ping absolute" />
                <span className="w-3.5 h-3.5 rounded-full bg-red-600 relative z-10" />
              </div>

              {/* Timer */}
              <div className="font-mono text-sm sm:text-base font-black text-white tracking-wider">
                {formatTimer(recordDuration)}
              </div>

              {/* Live Waveform Simulation */}
              <div className="hidden sm:flex items-center gap-1 h-6 px-2">
                {(waveformSamples.length > 0 ? waveformSamples : [40, 60, 30, 80, 50, 90, 45, 70]).map((h, i) => (
                  <span
                    key={i}
                    className="w-1 bg-emerald-400 rounded-full transition-all duration-150 animate-pulse"
                    style={{ height: `${h}%` }}
                  />
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Cancel Button */}
              <button
                onClick={() => {
                  cleanupRecording();
                  onClose();
                }}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5 text-red-400" />
                <span className="hidden sm:inline">Cancel</span>
              </button>

              {/* Stop & Preview Button */}
              <button
                onClick={stopAndPreview}
                className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs font-['Orbitron'] tracking-wider shadow-md shadow-emerald-950/50 flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
              >
                <Square className="w-3.5 h-3.5 fill-slate-950" />
                <span>STOP & PREVIEW</span>
              </button>
            </div>
          </div>
        ) : (
          /* Preview Mode Before Sending */
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-1 mr-2">
              {/* Play / Pause Preview Button */}
              <button
                onClick={togglePlayPreview}
                className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 flex items-center justify-center shadow-md cursor-pointer hover:scale-105 active:scale-95 transition-all shrink-0"
              >
                {isPlayingPreview ? (
                  <Pause className="w-4 h-4 fill-slate-950" />
                ) : (
                  <Play className="w-4 h-4 fill-slate-950 ml-0.5" />
                )}
              </button>

              {/* Progress Scrubber */}
              <div className="flex-1 space-y-1">
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden relative cursor-pointer">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-100"
                    style={{ width: `${previewProgress}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                  <span>Voice Note Preview</span>
                  <span>{formatTimer(recordDuration)}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {/* Re-record Button */}
              <button
                onClick={startRecording}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                title="Record Again"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              {/* Discard Button */}
              <button
                onClick={() => {
                  cleanupRecording();
                  onClose();
                }}
                className="p-2 rounded-xl bg-red-950/40 hover:bg-red-900/60 border border-red-800/40 text-red-300 transition-colors cursor-pointer"
                title="Discard Voice Note"
              >
                <Trash2 className="w-4 h-4" />
              </button>

              {/* Send Voice Note Button */}
              <button
                onClick={handleSend}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs font-['Orbitron'] tracking-wide shadow-md shadow-emerald-950/50 flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
              >
                <Send className="w-3.5 h-3.5 fill-slate-950" />
                <span>SEND</span>
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default VoiceNoteRecorder;
