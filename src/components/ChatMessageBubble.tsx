import React, { useState, useRef, useEffect } from 'react';
import { 
  Check, 
  CheckCheck, 
  Edit3, 
  Trash2, 
  Reply, 
  Smile, 
  Pin, 
  Play, 
  Pause, 
  BarChart2, 
  Phone,
  Flame,
  Search,
  X,
  Save,
  Volume2
} from 'lucide-react';
import { openGoogleScout } from '../utils/googleScout.ts';

export interface ChatMessage {
  id: string | number;
  sender_id: string;
  group_id?: string;
  recipient_id?: string;
  content?: string;
  text?: string;
  created_at: string;
  is_edited?: boolean;
  is_pinned?: boolean;
  reply_to?: {
    id: string | number;
    sender_name: string;
    text: string;
  };
  poll?: {
    question: string;
    options: string[];
    votes: Record<string, number>;
    votedUsers?: Record<string, number>;
  };
  voice_note?: {
    audio_url?: string;
    audioUrl?: string;
    duration: number;
    waveform: number[];
  };
  media_url?: string;
  reactions?: Record<string, number>;
  profiles?: {
    id?: string;
    username?: string;
    avatar_url?: string;
    favorite_club?: string;
    phone?: string;
  };
}

const EMOJI_REACTIONS = ['⚽', '🔥', '❤️', '👍', '😂', '😮', '🏆'];

interface ChatMessageBubbleProps {
  message: ChatMessage;
  isOutgoing: boolean;
  isLiteMode: boolean;
  currentUser: any;
  canAdminDelete: boolean;
  onOpenProfile: (profile: any) => void;
  onReply: (message: ChatMessage) => void;
  onReact: (messageId: string | number, emoji: string) => void;
  onPin?: (message: ChatMessage) => void;
  onEdit?: (messageId: string | number, newContent: string) => void;
  onDelete?: (messageId: string | number) => void;
  onVotePoll?: (messageId: string | number, optionIndex: number) => void;
}

export const ChatMessageBubble: React.FC<ChatMessageBubbleProps> = ({
  message,
  isOutgoing,
  isLiteMode,
  currentUser,
  canAdminDelete,
  onOpenProfile,
  onReply,
  onReact,
  onPin,
  onEdit,
  onDelete,
  onVotePoll
}) => {
  const [showReactionBar, setShowReactionBar] = useState(false);
  
  // Inline Editing State
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState(message.content || message.text || '');

  // Voice Note Audio Player State
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [currentPlayTime, setCurrentPlayTime] = useState('0:00');
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  const senderName = message.profiles?.username || (isOutgoing ? 'You' : 'Fan');
  const avatar = message.profiles?.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${message.sender_id || 'user'}`;
  const timestamp = message.created_at
    ? new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : 'Just now';

  const audioSource = message.voice_note?.audio_url || message.voice_note?.audioUrl;

  // Cleanup audio player on unmount
  useEffect(() => {
    return () => {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
        audioPlayerRef.current = null;
      }
    };
  }, []);

  const formatSeconds = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${mins}:${s.toString().padStart(2, '0')}`;
  };

  const handleTogglePlay = () => {
    if (!audioSource) {
      // Simulated playback for demo notes without url
      setIsPlayingAudio(!isPlayingAudio);
      return;
    }

    if (!audioPlayerRef.current) {
      const audio = new Audio(audioSource);
      audio.playbackRate = playbackSpeed;

      audio.ontimeupdate = () => {
        if (audio.duration && !isNaN(audio.duration)) {
          setAudioProgress((audio.currentTime / audio.duration) * 100);
          setCurrentPlayTime(formatSeconds(audio.currentTime));
        }
      };

      audio.onended = () => {
        setIsPlayingAudio(false);
        setAudioProgress(0);
        setCurrentPlayTime('0:00');
      };

      audioPlayerRef.current = audio;
    }

    if (isPlayingAudio) {
      audioPlayerRef.current.pause();
      setIsPlayingAudio(false);
    } else {
      audioPlayerRef.current.playbackRate = playbackSpeed;
      audioPlayerRef.current.play()
        .then(() => setIsPlayingAudio(true))
        .catch(() => setIsPlayingAudio(false));
    }
  };

  const handleToggleSpeed = () => {
    const speeds = [1, 1.5, 2];
    const nextIdx = (speeds.indexOf(playbackSpeed) + 1) % speeds.length;
    const nextSpeed = speeds[nextIdx];
    setPlaybackSpeed(nextSpeed);
    if (audioPlayerRef.current) {
      audioPlayerRef.current.playbackRate = nextSpeed;
    }
  };

  const handleSaveEdit = () => {
    if (!editedText.trim()) return;
    if (onEdit) {
      onEdit(message.id, editedText.trim());
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditedText(message.content || message.text || '');
    setIsEditing(false);
  };

  // Hashtag parser with Google Scout
  const renderContent = (content: string) => {
    if (!content) return null;
    const parts = content.split(/(#[a-zA-Z0-9_-]+)/g);
    return parts.map((part, i) => {
      if (part.startsWith('#') && part.length > 1) {
        const tag = part.substring(1);
        return (
          <span
            key={i}
            onClick={(e) => {
              e.stopPropagation();
              openGoogleScout(`${tag} football stats schedule news`, 'all');
            }}
            className="inline-flex items-center gap-0.5 px-1 py-0.2 mx-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold cursor-pointer hover:bg-emerald-500 hover:text-slate-950 transition-colors text-[11px] font-mono select-none"
            title={`Search #${tag} on Google`}
          >
            <span>{part}</span>
            <Search className="w-2.5 h-2.5 opacity-80" />
          </span>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <div
      className={`group relative flex items-end gap-2 my-2.5 ${
        isOutgoing ? 'justify-end' : 'justify-start'
      }`}
      onMouseLeave={() => setShowReactionBar(false)}
    >
      {/* Incoming Sender Avatar (Clickable to Dial / View Profile) */}
      {!isOutgoing && (
        <button
          onClick={() => onOpenProfile(message.profiles || { id: message.sender_id, username: senderName })}
          className="relative w-8 h-8 rounded-full shrink-0 p-0.5 bg-gradient-to-tr from-emerald-500 to-teal-400 cursor-pointer shadow-sm hover:scale-110 transition-transform mb-1"
          title={`Click to view profile & dial ${senderName}`}
        >
          <img src={avatar} alt={senderName} className="w-full h-full rounded-full object-cover bg-slate-900" />
          <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-400 border border-slate-950" />
        </button>
      )}

      {/* Main Message Bubble */}
      <div
        className={`relative max-w-[88%] sm:max-w-[74%] p-3.5 text-xs sm:text-sm leading-relaxed transition-all shadow-md ${
          isOutgoing
            ? isLiteMode
              ? 'bg-emerald-700 text-white rounded-2xl chat-bubble-outgoing'
              : 'bg-gradient-to-r from-emerald-600 to-teal-700 text-white rounded-2xl chat-bubble-outgoing border border-emerald-400/25 shadow-emerald-950/20'
            : isLiteMode
              ? 'bg-[#182333] text-slate-100 rounded-2xl chat-bubble-incoming border border-slate-700'
              : 'bg-[#0f192b]/95 backdrop-blur-md text-slate-100 rounded-2xl chat-bubble-incoming border border-slate-700/80 shadow-black/40'
        }`}
      >
        {/* Incoming Sender Name with Dial Hotline action */}
        {!isOutgoing && (
          <div className="flex items-center justify-between gap-2 mb-1.5 border-b border-white/10 pb-1">
            <button
              onClick={() => onOpenProfile(message.profiles || { id: message.sender_id, username: senderName })}
              className="font-bold text-[11px] text-emerald-400 hover:text-emerald-300 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>{senderName}</span>
              {message.profiles?.favorite_club && (
                <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-slate-800 text-slate-300 font-normal">
                  {message.profiles.favorite_club}
                </span>
              )}
            </button>
            <button
              onClick={() => onOpenProfile(message.profiles || { id: message.sender_id, username: senderName })}
              className="text-[10px] text-cyan-400 hover:text-cyan-300 flex items-center gap-0.5 opacity-80 hover:opacity-100 transition-opacity"
              title="Dial hotline"
            >
              <Phone className="w-2.5 h-2.5" />
              <span>Dial</span>
            </button>
          </div>
        )}

        {/* Quoted Message / Reply Preview Banner (WhatsApp style) */}
        {message.reply_to && (
          <div className="mb-2 p-2 rounded-xl bg-black/35 border-l-4 border-emerald-400 text-[11px] space-y-0.5 text-slate-200">
            <span className="font-bold text-emerald-300 text-[10px] block">
              {message.reply_to.sender_name}
            </span>
            <p className="line-clamp-1 italic text-slate-300">{message.reply_to.text}</p>
          </div>
        )}

        {/* Pinned Indicator */}
        {message.is_pinned && (
          <div className="flex items-center gap-1 text-[10px] text-amber-300 font-bold mb-1.5">
            <Pin className="w-3 h-3 text-amber-400" />
            <span>Pinned Message</span>
          </div>
        )}

        {/* Message Media Image if present */}
        {message.media_url && (
          <div className="mb-2 rounded-xl overflow-hidden max-h-64 border border-white/10">
            <img src={message.media_url} alt="Shared media" className="w-full h-full object-cover" />
          </div>
        )}

        {/* Real Interactive Voice Note Player (WhatsApp Style) */}
        {message.voice_note && (
          <div className="flex flex-col gap-1.5 p-2.5 rounded-2xl bg-black/30 border border-white/10 mb-2">
            <div className="flex items-center gap-3">
              {/* Play / Pause Button */}
              <button
                onClick={handleTogglePlay}
                className="w-9 h-9 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center justify-center shrink-0 cursor-pointer shadow-md transition-transform hover:scale-105 active:scale-95"
                title={isPlayingAudio ? 'Pause Voice Note' : 'Play Voice Note'}
              >
                {isPlayingAudio ? (
                  <Pause className="w-4 h-4 fill-slate-950" />
                ) : (
                  <Play className="w-4 h-4 fill-slate-950 ml-0.5" />
                )}
              </button>

              {/* Scrubber & Waveform */}
              <div className="flex-1 space-y-1">
                {/* Waveform Bars */}
                <div className="flex items-center gap-1 h-6">
                  {(message.voice_note.waveform?.length > 0
                    ? message.voice_note.waveform
                    : [40, 70, 30, 90, 60, 100, 45, 80, 50, 65, 35, 85]
                  ).map((h, i) => (
                    <span
                      key={i}
                      className={`w-1 rounded-full transition-all duration-150 ${
                        isPlayingAudio ? 'bg-emerald-400 animate-pulse' : 'bg-slate-400/80'
                      }`}
                      style={{ height: `${h}%` }}
                    />
                  ))}
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-400 transition-all duration-100"
                    style={{ width: `${audioProgress}%` }}
                  />
                </div>
              </div>

              {/* Playback Speed Pill */}
              <button
                onClick={handleToggleSpeed}
                className="px-2 py-0.5 rounded-md bg-white/10 hover:bg-white/20 text-[10px] font-mono font-bold text-slate-200 transition-colors cursor-pointer"
                title="Change Playback Speed"
              >
                {playbackSpeed}x
              </button>
            </div>

            <div className="flex justify-between items-center text-[10px] text-slate-300 font-mono px-1">
              <span>{isPlayingAudio ? currentPlayTime : 'Voice Note'}</span>
              <span>{formatSeconds(message.voice_note.duration || 10)}</span>
            </div>
          </div>
        )}

        {/* Interactive Football Poll Card (Telegram style) */}
        {message.poll && (
          <div className="p-3 rounded-xl bg-black/35 border border-white/10 space-y-2 mb-1.5">
            <div className="flex items-center gap-1.5 text-cyan-300 font-bold text-xs">
              <BarChart2 className="w-3.5 h-3.5 text-cyan-400" />
              <span>{message.poll.question}</span>
            </div>
            <div className="space-y-1.5">
              {message.poll.options.map((opt, idx) => {
                const voteCount = message.poll?.votes?.[idx] || 0;
                const totalVotes = Object.values(message.poll?.votes || {}).reduce((a, b) => a + b, 0) || 1;
                const pct = Math.round((voteCount / totalVotes) * 100);
                const hasVoted = message.poll?.votedUsers?.[currentUser?.id] === idx;

                return (
                  <button
                    key={idx}
                    onClick={() => onVotePoll && onVotePoll(message.id, idx)}
                    className={`w-full p-2 rounded-lg text-left text-xs relative overflow-hidden border transition-all cursor-pointer ${
                      hasVoted
                        ? 'border-cyan-400 bg-cyan-950/40 text-white'
                        : 'border-white/10 bg-slate-900/60 hover:border-slate-600 text-slate-200'
                    }`}
                  >
                    <div
                      className="absolute inset-y-0 left-0 bg-cyan-500/20 transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                    <div className="relative flex justify-between items-center z-10">
                      <span className="font-medium truncate">{opt}</span>
                      <span className="font-mono text-[10px] font-bold text-cyan-300">{pct}%</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* INLINE EDITING CONTAINER */}
        {isEditing ? (
          <div className="space-y-2 my-1 bg-black/40 p-2.5 rounded-xl border border-emerald-400/50">
            <textarea
              value={editedText}
              onChange={(e) => setEditedText(e.target.value)}
              rows={2}
              className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-400 rounded-lg p-2 text-xs text-white focus:outline-none resize-none"
              autoFocus
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={handleCancelEdit}
                className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-[11px] font-bold rounded-lg text-slate-300 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <X className="w-3 h-3" />
                <span>Cancel</span>
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-3 py-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-[11px] font-['Orbitron'] rounded-lg transition-colors flex items-center gap-1 cursor-pointer shadow-sm"
              >
                <Save className="w-3 h-3" />
                <span>Save</span>
              </button>
            </div>
          </div>
        ) : (
          /* Regular Message Text */
          message.content && (
            <div className="break-words leading-relaxed select-text font-['Inter',sans-serif]">
              {renderContent(message.content)}
            </div>
          )
        )}

        {/* Bottom Metadata: Timestamp + Read Status */}
        <div className="flex items-center justify-between gap-3 text-[10px] text-slate-300/80 mt-1.5 pt-1 border-t border-white/10">
          
          {/* PROFESSIONAL & VISIBLE ACTION BUTTONS (EDIT, DELETE, REPLY, REACT) */}
          <div className="flex items-center gap-1.5">
            {/* 1. Visible Edit Button for Outgoing Messages */}
            {isOutgoing && onEdit && !isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="px-2 py-0.5 rounded-md bg-emerald-500/20 hover:bg-emerald-500 hover:text-slate-950 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                title="Edit this message"
              >
                <Edit3 className="w-2.5 h-2.5" />
                <span>Edit</span>
              </button>
            )}

            {/* 2. Visible Delete Button for Outgoing Messages or Group Admin */}
            {(isOutgoing || canAdminDelete) && onDelete && (
              <button
                onClick={() => onDelete(message.id)}
                className="px-2 py-0.5 rounded-md bg-rose-500/20 hover:bg-rose-600 hover:text-white text-rose-300 border border-rose-500/40 text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                title="Delete this message"
              >
                <Trash2 className="w-2.5 h-2.5" />
                <span>Delete</span>
              </button>
            )}

            {/* 3. Reply Button */}
            <button
              onClick={() => onReply(message)}
              className="px-1.5 py-0.5 rounded-md bg-white/5 hover:bg-white/15 text-slate-300 text-[10px] flex items-center gap-0.5 transition-colors cursor-pointer"
              title="Reply to message"
            >
              <Reply className="w-2.5 h-2.5" />
              <span className="hidden sm:inline">Reply</span>
            </button>

            {/* 4. Reaction Button */}
            <button
              onClick={() => setShowReactionBar(!showReactionBar)}
              className="p-1 rounded-md bg-white/5 hover:bg-white/15 text-slate-300 transition-colors cursor-pointer"
              title="React with Emoji"
            >
              <Smile className="w-2.5 h-2.5" />
            </button>
          </div>

          {/* Timestamp and Read Receipts */}
          <div className="flex items-center gap-1 shrink-0 font-mono text-[10px]">
            <span>{timestamp}</span>
            {message.is_edited && <span className="italic text-[9px]">(edited)</span>}
            {isOutgoing && (
              <span className="text-cyan-300" title="Delivered & Seen">
                <CheckCheck className="w-3.5 h-3.5 stroke-[2.5]" />
              </span>
            )}
          </div>
        </div>

        {/* Reactions Counter Ribbon (Underneath Bubble) */}
        {message.reactions && Object.keys(message.reactions).length > 0 && (
          <div className="absolute -bottom-2.5 right-2 flex items-center gap-1 bg-[#0a1220] border border-slate-700/80 rounded-full px-2 py-0.5 shadow-md">
            {Object.entries(message.reactions).map(([emoji, count]) => (
              <span key={emoji} className="text-[10px] flex items-center gap-0.5 font-bold text-slate-200">
                <span>{emoji}</span>
                <span>{count}</span>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Quick Emoji Reaction Popover */}
      {showReactionBar && (
        <div className="absolute -top-9 z-20 flex items-center gap-1.5 p-1 bg-[#0a1424] border border-slate-700 rounded-full shadow-2xl animate-in zoom-in-95 duration-150">
          {EMOJI_REACTIONS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => {
                onReact(message.id, emoji);
                setShowReactionBar(false);
              }}
              className="text-sm p-1 rounded-full hover:bg-slate-800 hover:scale-125 transition-transform cursor-pointer"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default ChatMessageBubble;
