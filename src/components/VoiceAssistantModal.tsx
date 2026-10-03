import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  Sparkles, 
  Bot, 
  Brain, 
  Radio, 
  Activity, 
  Send,
  Square
} from 'lucide-react';
import { AiHelperService } from '../config/aiHelper.ts';

interface VoiceAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTranscriptReceived?: (transcript: string) => void;
  initialQuery?: string;
}

export const VoiceAssistantModal: React.FC<VoiceAssistantModalProps> = ({
  isOpen,
  onClose,
  onTranscriptReceived,
  initialQuery = ''
}) => {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsPlayingSpeech] = useState(false);
  const [transcript, setTranscript] = useState(initialQuery);
  const [aiResponse, setAiResponse] = useState('');
  const [statusMsg, setStatusMsg] = useState('Tap the microphone to speak with Gemini AI Analyst');

  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (initialQuery && isOpen) {
      setTranscript(initialQuery);
      handleAnalyzeQuery(initialQuery);
    }
  }, [initialQuery, isOpen]);

  // Speech Recognition setup (Speech-to-Text)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onstart = () => {
          setIsListening(true);
          setStatusMsg('Listening to your voice command...');
        };

        recognition.onresult = (event: any) => {
          let currentText = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            currentText += event.results[i][0].transcript;
          }
          setTranscript(currentText);
        };

        recognition.onerror = (event: any) => {
          console.warn('Speech recognition error:', event.error);
          setIsListening(false);
          setStatusMsg('Speech recognition paused. Tap mic to retry.');
        };

        recognition.onend = () => {
          setIsListening(false);
          setStatusMsg('Voice capture complete. Tap Analyze or Speak.');
        };

        recognitionRef.current = recognition;
      }
    }
  }, []);

  if (!isOpen) return null;

  const startListening = () => {
    if (recognitionRef.current) {
      try {
        setTranscript('');
        setAiResponse('');
        recognitionRef.current.start();
      } catch {
        try { recognitionRef.current.stop(); } catch {}
        setTimeout(() => recognitionRef.current.start(), 200);
      }
    } else {
      setStatusMsg('Speech recognition not supported in this browser. Type query manually.');
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
    }
    setIsListening(false);
  };

  const handleAnalyzeQuery = async (queryToAnalyze?: string) => {
    const q = queryToAnalyze || transcript;
    if (!q.trim()) return;

    setStatusMsg('Querying Gemini AI Analyst...');
    setAiResponse('');

    if (onTranscriptReceived) {
      onTranscriptReceived(q);
    }

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: q }),
      });

      if (res.ok) {
        const data = await res.json();
        const replyText = data.reply || 'Analysis complete.';
        setAiResponse(replyText);
        setStatusMsg('Gemini response ready. Tap Speak to listen aloud.');

        // Auto-speak response
        setIsPlayingSpeech(true);
        await AiHelperService.speakText(replyText);
        setIsPlayingSpeech(false);
      }
    } catch (err: any) {
      setStatusMsg('Gemini service error: ' + (err.message || 'Unable to connect'));
    }
  };

  const handleSpeakAloud = async () => {
    if (!aiResponse && !transcript) return;
    const textToSpeak = aiResponse || transcript;
    setIsPlayingSpeech(true);
    await AiHelperService.speakText(textToSpeak);
    setIsPlayingSpeech(false);
  };

  const handleStopSpeech = () => {
    AiHelperService.stopSpeech();
    setIsPlayingSpeech(false);
  };

  return (
    <div className="fixed inset-0 z-[210] bg-black/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200">
      <div className="bg-[#08101d] border border-cyan-500/40 rounded-3xl w-full max-w-xl p-5 shadow-2xl my-auto flex flex-col gap-4 font-['Plus_Jakarta_Sans',sans-serif]">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 via-indigo-500 to-emerald-500 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-cyan-950/50">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black text-white font-['Orbitron'] tracking-wide uppercase flex items-center gap-2">
                <span>GEMINI VOICE AI ANALYST</span>
                <span className="text-[9px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                  LIVE STT/TTS
                </span>
              </h2>
              <span className="text-[11px] text-cyan-400 font-mono flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 animate-pulse" />
                {statusMsg}
              </span>
            </div>
          </div>

          <button
            onClick={() => {
              handleStopSpeech();
              onClose();
            }}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Central Audio Visualizer Ring & Mic */}
        <div className="flex flex-col items-center justify-center py-4 bg-gradient-to-b from-slate-950 to-[#050b15] rounded-2xl border border-slate-800 relative overflow-hidden">
          
          <div className="relative my-2">
            {/* Pulsating Orbit Rings */}
            <div className={`absolute -inset-4 rounded-full bg-gradient-to-r from-cyan-500/30 to-emerald-500/30 blur-md transition-all ${isListening ? 'animate-ping' : isSpeaking ? 'animate-pulse scale-110' : 'opacity-20'}`} />
            
            <button
              type="button"
              onClick={isListening ? stopListening : startListening}
              className={`relative z-10 w-20 h-20 rounded-full flex items-center justify-center shadow-2xl transition-all cursor-pointer ${
                isListening
                  ? 'bg-rose-600 text-white ring-4 ring-rose-400 animate-pulse scale-105'
                  : isSpeaking
                  ? 'bg-cyan-500 text-slate-950 ring-4 ring-cyan-300 scale-105'
                  : 'bg-gradient-to-tr from-emerald-500 via-cyan-500 to-indigo-500 text-slate-950 hover:scale-105'
              }`}
            >
              {isListening ? (
                <MicOff className="w-8 h-8" />
              ) : (
                <Mic className="w-8 h-8" />
              )}
            </button>
          </div>

          <span className="text-xs font-bold text-slate-300 mt-2 font-['Orbitron']">
            {isListening ? 'LISTENING (TAP TO STOP)' : isSpeaking ? 'GEMINI SPEAKING ALOUD' : 'TAP MIC TO START SPEECH-TO-TEXT'}
          </span>
        </div>

        {/* Transcript Box */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono">
            YOUR VOICE QUERY / TRANSCRIPT:
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder="e.g. Predict tonight's CF Montréal vs Toronto FC derby score..."
              className="flex-1 bg-[#050b15] border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-cyan-500"
            />
            <button
              type="button"
              onClick={() => handleAnalyzeQuery()}
              className="px-4 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-black text-xs font-['Orbitron'] flex items-center gap-1.5 cursor-pointer shadow-md"
            >
              <Send className="w-4 h-4" />
              <span>ANALYZE</span>
            </button>
          </div>
        </div>

        {/* AI Response Display */}
        {aiResponse && (
          <div className="p-4 rounded-2xl bg-cyan-950/40 border border-cyan-500/40 space-y-2 animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase text-cyan-400 tracking-wider font-mono flex items-center gap-1.5">
                <Brain className="w-3.5 h-3.5" /> GEMINI INTELLIGENCE ANALYSIS:
              </span>
              <div className="flex gap-2">
                {isSpeaking ? (
                  <button
                    type="button"
                    onClick={handleStopSpeech}
                    className="px-2.5 py-1 rounded-lg bg-rose-500/20 border border-rose-500/40 text-rose-300 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Square className="w-3 h-3 fill-rose-300" />
                    <span>Stop Voice</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleSpeakAloud}
                    className="px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Volume2 className="w-3 h-3" />
                    <span>Read Aloud</span>
                  </button>
                )}
              </div>
            </div>

            <p className="text-xs text-slate-200 leading-relaxed font-sans whitespace-pre-line">
              {aiResponse}
            </p>
          </div>
        )}

      </div>
    </div>
  );
};

export default VoiceAssistantModal;
