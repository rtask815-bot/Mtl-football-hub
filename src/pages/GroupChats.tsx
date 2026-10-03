import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase as supabaseClient } from '../config/supabase.ts';
import { SyncService } from '../config/SyncService.ts';
import { openGoogleScout } from '../utils/googleScout.ts';
import FuturisticLoader from '../components/FuturisticLoader.tsx';
import UniversalFAB from '../components/UniversalFAB.tsx';
import { WallpaperPickerModal } from '../components/WallpaperPickerModal.tsx';
import { CallScreenModal } from '../components/CallScreenModal.tsx';
import { OtherUserProfileModal } from '../components/OtherUserProfileModal.tsx';
import { PollCreatorModal } from '../components/PollCreatorModal.tsx';
import { VoiceNoteRecorder } from '../components/VoiceNoteRecorder.tsx';
import { ChatMessageBubble, ChatMessage } from '../components/ChatMessageBubble.tsx';
import { GroupChatsStatusTab } from '../components/GroupChatsStatusTab.tsx';
import { GroupChatsCallsTab } from '../components/GroupChatsCallsTab.tsx';
import { StatusReel } from '../components/StatusReel.tsx';
import { StatusViewerModal } from '../components/StatusViewerModal.tsx';
import { CreateStatusModal } from '../components/CreateStatusModal.tsx';
import { subscribeUserStatuses, MatchCardStatus, saveUserMatchStatus, saveMessageReaction, saveChatMessage } from '../config/firebaseStore.ts';
import { 
  Users, 
  MessageSquare, 
  Search, 
  Plus, 
  Info, 
  Trash2, 
  Edit3, 
  Mic, 
  Send, 
  User, 
  ShieldCheck, 
  UserPlus, 
  X, 
  Lock, 
  Globe, 
  Settings, 
  Sparkles, 
  ChevronRight, 
  Menu,
  Bell,
  CheckCircle2,
  AlertCircle,
  Hash,
  Shield,
  Activity,
  Compass,
  UserX,
  ArrowRight,
  Clock,
  LogIn,
  Phone,
  Video,
  Palette,
  Pin,
  Paperclip,
  BarChart2,
  Zap,
  Volume2,
  Camera,
  Layers,
  PhoneCall,
  Reply
} from 'lucide-react';

/* ============================================================
   LOCAL STORAGE SYSTEM
   ============================================================ */
const LocalStore = {
  get: (key: string) => {
    try {
      const d = localStorage.getItem('mtl_hub_' + key);
      return d ? JSON.parse(d) : null;
    } catch (e) {
      return null;
    }
  },
  set: (key: string, val: any) => {
    try {
      localStorage.setItem('mtl_hub_' + key, JSON.stringify(val));
    } catch (e) {}
  }
};

/* ============================================================
   WHATSAPP-STYLE DATE DIVIDER UTILITY
   ============================================================ */
function getWhatsAppDateDivider(dateInput: string | Date): string {
  if (!dateInput) return '';
  const date = new Date(dateInput);
  const now = new Date();

  // Reset times to 00:00:00 for accurate calendar date comparison
  const dStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const nStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const diffTime = nStart.getTime() - dStart.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 3600 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays > 1 && diffDays < 7) {
    return date.toLocaleDateString([], { weekday: 'long' });
  }

  if (date.getFullYear() === now.getFullYear()) {
    return date.toLocaleDateString([], { month: 'long', day: 'numeric' });
  }

  return date.toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' });
}

/* ============================================================
   HASHTAG MESSAGE FORMATTER & GOOGLE SCOUT LINKER
   ============================================================ */
function renderMessageWithTags(content: string) {
  if (!content) return null;
  const parts = content.split(/(#[a-zA-Z0-9_-]+)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('#') && part.length > 1) {
          const tagClean = part.substring(1);
          return (
            <span
              key={i}
              onClick={(e) => {
                e.stopPropagation();
                openGoogleScout(`${tagClean} football match news schedule stats`, 'all');
              }}
              className="inline-flex items-center gap-1 px-1.5 py-0.5 mx-0.5 rounded-md bg-cyan-500/20 hover:bg-cyan-500 hover:text-slate-950 text-cyan-300 font-extrabold cursor-pointer border border-cyan-500/40 transition-all font-mono text-[11px] shadow-xs select-none"
              title={`Click to search #${tagClean} on Google`}
            >
              <span>{part}</span>
              <Search className="w-2.5 h-2.5 opacity-80" />
            </span>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

/* ============================================================
   AUDIO SYNTHESIZER FOR NOTIFICATIONS
   ============================================================ */
const playNotificationSound = () => {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1174.66, ctx.currentTime + 0.15);

    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.28);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.28);
  } catch (e) {}
};

export default function GroupChats() {
  const [chatTypeMode, setChatTypeMode] = useState<'groups' | 'direct'>('groups');
  const [activeMainView, setActiveMainView] = useState<'chats' | 'status' | 'calls' | 'userHub' | 'notifications'>('chats');

  // WhatsApp / Telegram / Lite Modes
  const [isLiteMode, setIsLiteMode] = useState<boolean>(() => {
    return Boolean(LocalStore.get('lite_mode'));
  });
  const [activeWallpaper, setActiveWallpaper] = useState<string>(() => {
    return LocalStore.get('wallpaper') || 'whatsapp_dark';
  });
  const [isWallpaperModalOpen, setIsWallpaperModalOpen] = useState(false);

  // Calling & Hotline Simulation
  const [callModalState, setCallModalState] = useState<{
    isOpen: boolean;
    peer: any;
    callType: 'audio' | 'video';
  }>({
    isOpen: false,
    peer: null,
    callType: 'audio'
  });

  // User Profile Containers (Self and Other Users)
  const [otherProfileModalState, setOtherProfileModalState] = useState<{
    isOpen: boolean;
    profile: any;
    isCurrentUser: boolean;
  }>({
    isOpen: false,
    profile: null,
    isCurrentUser: false
  });

  // Interactive Polls, Pinned Messages & Quoted Replies
  const [isPollModalOpen, setIsPollModalOpen] = useState(false);
  const [replyingToMessage, setReplyingToMessage] = useState<any>(null);
  const [pinnedMessage, setPinnedMessage] = useState<any>(null);
  const [searchInChat, setSearchInChat] = useState(false);
  const [searchInChatQuery, setSearchInChatQuery] = useState('');
  const [isVoiceRecorderOpen, setIsVoiceRecorderOpen] = useState(false);

  // Statuses (WhatsApp Story Reels & Match Predictions)
  const [allStatuses, setAllStatuses] = useState<MatchCardStatus[]>([]);
  const [viewStatusIndex, setViewStatusIndex] = useState<number | null>(null);
  const [isCreateStatusOpen, setIsCreateStatusOpen] = useState(false);

  // User & Profile State
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [currentProfile, setCurrentProfile] = useState<any>(null);
  const [userList, setUserList] = useState<any[]>([]);
  
  // Groups State
  const [groupsData, setGroupsData] = useState<any[]>([]);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [archivedGroupIds, setArchivedGroupIds] = useState<string[]>([]);
  
  // Active Chat State
  const [currentOpenGroup, setCurrentOpenGroup] = useState<any>(null);
  const [currentOpenDirectPeer, setCurrentOpenDirectPeer] = useState<any>(null);

  // Filters & Searching
  const [currentTabFilter, setCurrentTabFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(() => {
    const cached = LocalStore.get('groups');
    return !Array.isArray(cached) || cached.length === 0;
  });

  // Messages & Input
  const [messages, setMessages] = useState<any[]>([]);
  const [chatInputText, setChatInputText] = useState('');
  const [notifications, setNotifications] = useState<any[]>([]);

  // Real-time Typing State
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const presenceChannelRef = useRef<any>(null);
  const typingTimeoutRef = useRef<any>(null);

  // Voice Typing
  const [isListening, setIsListening] = useState(false);

  // URL Search Parameters for Direct Group Routing
  const [searchParams, setSearchParams] = useSearchParams();

  // Drawers & Modals
  const [isSideNavOpen, setIsSideNavOpen] = useState(false);
  const [modals, setModals] = useState({
    chatRoomModal: false,
    groupAboutModal: false,
    createGroupModal: false,
    editProfileModal: false,
    newDirectChatModal: false,
    pendingApprovalsModal: false,
    requestToJoinModal: false
  });

  const [targetJoinGroup, setTargetJoinGroup] = useState<any>(null);
  const [isJoining, setIsJoining] = useState(false);
  const [customPrompt, setCustomPrompt] = useState<any>(null);

  // Form Inputs
  const [editProfileName, setEditProfileName] = useState('');
  const [editProfileStatus, setEditProfileStatus] = useState('Online in Lounge');
  const [editProfileAvatar, setEditProfileAvatar] = useState('');
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [groupAboutMembers, setGroupAboutMembers] = useState<any[]>([]);

  // Inline Message Editing State
  const [editingMessageId, setEditingMessageId] = useState<any>(null);
  const [editingMessageText, setEditingMessageText] = useState('');

  // Refs
  const chatMessagesAreaRef = useRef<HTMLDivElement | null>(null);
  const currentOpenGroupRef = useRef(currentOpenGroup);
  const currentOpenDirectPeerRef = useRef(currentOpenDirectPeer);
  const chatTypeModeRef = useRef(chatTypeMode);
  const currentUserRef = useRef(currentUser);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    currentOpenGroupRef.current = currentOpenGroup;
    currentOpenDirectPeerRef.current = currentOpenDirectPeer;
    chatTypeModeRef.current = chatTypeMode;
    currentUserRef.current = currentUser;
  }, [currentOpenGroup, currentOpenDirectPeer, chatTypeMode, currentUser]);

  const openModal = (modalName: keyof typeof modals) => setModals(prev => ({ ...prev, [modalName]: true }));
  const closeModal = (modalName: keyof typeof modals) => setModals(prev => ({ ...prev, [modalName]: false }));

  /* ============================================================
     PROFILE ENRICHMENT UTILITIES (DECOUPLED FROM POSTGREST FK)
     ============================================================ */
  async function enrichMessagesWithProfiles(msgs: any[]): Promise<any[]> {
    if (!msgs || msgs.length === 0) return [];
    const senderIds = Array.from(new Set(msgs.map(m => m.sender_id).filter(Boolean)));
    if (senderIds.length === 0) return msgs;

    try {
      const { data: profiles } = await supabaseClient
        .from('profiles')
        .select('id, username, avatar_url')
        .in('id', senderIds);

      const profileMap: Record<string, any> = {};
      if (profiles) {
        profiles.forEach((p: any) => {
          profileMap[p.id] = p;
        });
      }

      return msgs.map(m => ({
        ...m,
        profiles: profileMap[m.sender_id] || m.profiles || { username: 'Football Fan', avatar_url: '' }
      }));
    } catch (e) {
      return msgs;
    }
  }

  /* ============================================================
     SUPABASE PRESENCE REAL-TIME TYPING INDICATORS
     ============================================================ */
  useEffect(() => {
    if (!currentUser || (!currentOpenGroup && !currentOpenDirectPeer)) return;

    const roomId = currentOpenGroup
      ? `group-${currentOpenGroup.id}`
      : `direct-${[currentUser.id, currentOpenDirectPeer.id].sort().join('-')}`;

    const channel = supabaseClient.channel(`room:${roomId}`, {
      config: {
        presence: { key: currentUser.id }
      }
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const typingList: string[] = [];
        Object.keys(state).forEach(key => {
          if (key !== currentUser.id) {
            const presences = state[key] as any[];
            presences.forEach(p => {
              if (p.isTyping && p.username) {
                typingList.push(p.username);
              }
            });
          }
        });
        setTypingUsers(typingList);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            username: currentProfile?.username || 'User',
            isTyping: false
          });
        }
      });

    presenceChannelRef.current = channel;

    return () => {
      supabaseClient.removeChannel(channel);
      presenceChannelRef.current = null;
    };
  }, [currentOpenGroup, currentOpenDirectPeer, currentUser, currentProfile]);

  /* ============================================================
     WEBSOCKET REAL-TIME SUBSCRIPTION & MULTI-LAYER SYNC
     ============================================================ */
  useEffect(() => {
    if (!currentUser) return;

    const channel = supabaseClient
      .channel('messages_realtime_channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, async (payload) => {
        const { eventType, new: newMsg, old: oldMsg } = payload;

        if (eventType === 'INSERT') {
          const isCurrentGroup = currentOpenGroupRef.current && newMsg.group_id === currentOpenGroupRef.current.id;
          const isCurrentDirect = currentOpenDirectPeerRef.current && 
            ((newMsg.sender_id === currentUser.id && newMsg.recipient_id === currentOpenDirectPeerRef.current.id) ||
             (newMsg.sender_id === currentOpenDirectPeerRef.current.id && newMsg.recipient_id === currentUser.id));

          if (isCurrentGroup || isCurrentDirect) {
            let senderProfile: any = null;
            try {
              const { data } = await supabaseClient
                .from('profiles')
                .select('username, avatar_url')
                .eq('id', newMsg.sender_id)
                .single();
              senderProfile = data;
            } catch (e) {}

            const messageWithProfile = {
              ...newMsg,
              profiles: senderProfile || { username: 'Fan', avatar_url: '' }
            };

            setMessages((prev) => {
              if (prev.some((m) => m.id === newMsg.id)) return prev;
              const updated = [...prev, messageWithProfile];
              if (isCurrentGroup && currentOpenGroupRef.current) {
                LocalStore.set('messages_' + currentOpenGroupRef.current.id, updated);
              } else if (isCurrentDirect && currentOpenDirectPeerRef.current) {
                const cacheKey = 'messages_direct_' + [currentUser.id, currentOpenDirectPeerRef.current.id].sort().join('_');
                LocalStore.set(cacheKey, updated);
              }
              return updated;
            });
            scrollToBottom();

            if (newMsg.sender_id !== currentUser.id) {
              playNotificationSound();
            }
          } else {
            if (newMsg.sender_id !== currentUser.id) {
              playNotificationSound();
              
              const targetId = newMsg.group_id || newMsg.sender_id;
              if (targetId) {
                setUnreadCounts((prev) => {
                  const updated = { ...prev, [targetId]: (prev[targetId] || 0) + 1 };
                  LocalStore.set('unread', updated);
                  return updated;
                });

                let senderName = 'Someone';
                try {
                  const { data } = await supabaseClient
                    .from('profiles')
                    .select('username')
                    .eq('id', newMsg.sender_id)
                    .single();
                  if (data?.username) senderName = data.username;
                } catch (e) {}

                addLocalNotification(
                  `New Message from ${senderName}`,
                  newMsg.content || newMsg.text || 'Sent a new message'
                );
              }
            }
          }
        } else if (eventType === 'UPDATE') {
          setMessages((prev) => {
            const updated = prev.map((m) => (m.id === newMsg.id ? { ...m, ...newMsg } : m));
            if (currentOpenGroupRef.current) {
              LocalStore.set('messages_' + currentOpenGroupRef.current.id, updated);
            }
            return updated;
          });
        } else if (eventType === 'DELETE') {
          setMessages((prev) => {
            const updated = prev.filter((m) => m.id !== oldMsg.id);
            if (currentOpenGroupRef.current) {
              LocalStore.set('messages_' + currentOpenGroupRef.current.id, updated);
            }
            return updated;
          });
        }
      })
      .subscribe();

    return () => {
      supabaseClient.removeChannel(channel);
    };
  }, [currentUser]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setChatInputText(val);

    if (presenceChannelRef.current && currentUser) {
      presenceChannelRef.current.track({
        username: currentProfile?.username || 'User',
        isTyping: val.trim().length > 0
      });

      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

      typingTimeoutRef.current = setTimeout(() => {
        if (presenceChannelRef.current) {
          presenceChannelRef.current.track({
            username: currentProfile?.username || 'User',
            isTyping: false
          });
        }
      }, 2000);
    }
  };

  /* ============================================================
     SPEECH RECOGNITION SETUP
     ============================================================ */
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }
        if (finalTranscript) {
          setChatInputText(prev => (prev ? prev + ' ' + finalTranscript : finalTranscript));
        }
      };

      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);
      recognitionRef.current = recognition;
    }
  }, []);

  // Real-time Statuses subscription
  useEffect(() => {
    const unsub = subscribeUserStatuses((list) => {
      if (Array.isArray(list)) {
        setAllStatuses(list);
      }
    });
    return unsub;
  }, []);

  // Open other user profile / dial
  const openOtherUserProfile = (targetUser: any) => {
    if (!targetUser) return;
    const isMe = targetUser.id === currentUser?.id;
    setOtherProfileModalState({
      isOpen: true,
      profile: isMe ? currentProfile : targetUser,
      isCurrentUser: isMe
    });
  };

  // Dial Call (Audio or Video)
  const handleDialCall = (targetPeer: any, callType: 'audio' | 'video' = 'audio') => {
    if (!targetPeer) return;
    setCallModalState({
      isOpen: true,
      peer: targetPeer,
      callType
    });
  };

  // Emoji reactions saved directly to Firebase Firestore and database
  const handleReactMessage = async (messageId: string | number, emoji: string) => {
    // 1. Optimistic UI update
    setMessages(prev => prev.map(m => {
      if (m.id === messageId) {
        const reactions = { ...(m.reactions || {}) };
        reactions[emoji] = (reactions[emoji] || 0) + 1;
        return { ...m, reactions };
      }
      return m;
    }));

    // 2. Persist to Firebase Firestore & backend database
    const uid = currentUser?.id || 'guest_user';
    const uname = currentProfile?.username || 'Fan';
    try {
      const updated = await saveMessageReaction(messageId, emoji, uid, uname);
      if (updated && Object.keys(updated).length > 0) {
        setMessages(prev => prev.map(m => m.id === messageId ? { ...m, reactions: updated } : m));
      }
    } catch (err) {
      console.warn('Message reaction save notice:', err);
    }
  };

  // Poll voting saved to backend and Firebase
  const handleVotePoll = async (messageId: string | number, optionIndex: number) => {
    if (!currentUser) return;
    setMessages(prev => prev.map(m => {
      if (m.id === messageId && m.poll) {
        const votedUsers = { ...(m.poll.votedUsers || {}) };
        if (votedUsers[currentUser.id] === optionIndex) return m;
        votedUsers[currentUser.id] = optionIndex;
        const votes = { ...(m.poll.votes || {}) };
        votes[optionIndex] = (votes[optionIndex] || 0) + 1;
        return { ...m, poll: { ...m.poll, votes, votedUsers } };
      }
      return m;
    }));

    try {
      await fetch(`/api/messages/${messageId}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ optionIndex, userId: currentUser.id })
      });
    } catch {}
  };

  // Create Poll Submit saved to Firebase
  const handleCreatePollSubmit = async (pollData: { question: string; options: string[] }) => {
    if (!currentUser) return;
    const initialVotes: Record<string, number> = {};
    pollData.options.forEach((_, i) => { initialVotes[i] = 0; });
    const newMsg: any = {
      id: 'poll_' + Date.now(),
      sender_id: currentUser.id,
      group_id: currentOpenGroup?.id,
      recipient_id: currentOpenDirectPeer?.id,
      content: `📊 Poll: ${pollData.question}`,
      created_at: new Date().toISOString(),
      poll: {
        question: pollData.question,
        options: pollData.options,
        votes: initialVotes,
        votedUsers: {}
      },
      profiles: {
        username: currentProfile?.username || 'You',
        avatar_url: currentProfile?.avatar_url || ''
      }
    };
    setMessages(prev => [...prev, newMsg]);
    scrollToBottom();

    // Save to Firebase Firestore & backend database
    try {
      await saveChatMessage(newMsg);
    } catch {}
  };

  // Real microphone voice note sender
  const handleSendVoiceNote = async (voiceNoteData: {
    audioUrl: string;
    duration: number;
    waveform: number[];
  }) => {
    if (!currentUser) return;
    const content = `🎙️ Voice Note (${Math.floor(voiceNoteData.duration)}s)`;
    const optimisticMsg: any = {
      id: 'voice_' + Date.now(),
      sender_id: currentUser.id,
      group_id: currentOpenGroup?.id,
      recipient_id: currentOpenDirectPeer?.id,
      content,
      created_at: new Date().toISOString(),
      voice_note: {
        audio_url: voiceNoteData.audioUrl,
        audioUrl: voiceNoteData.audioUrl,
        duration: voiceNoteData.duration,
        waveform: voiceNoteData.waveform
      },
      profiles: {
        username: currentProfile?.username || 'You',
        avatar_url: currentProfile?.avatar_url || ''
      }
    };

    setMessages((prev) => {
      const updated = [...prev, optimisticMsg];
      if (currentOpenGroup) {
        LocalStore.set('messages_' + currentOpenGroup.id, updated);
      } else if (currentOpenDirectPeer) {
        const cacheKey = 'messages_direct_' + [currentUser.id, currentOpenDirectPeer.id].sort().join('_');
        LocalStore.set(cacheKey, updated);
      }
      return updated;
    });
    scrollToBottom();
    setIsVoiceRecorderOpen(false);

    try {
      if (chatTypeMode === 'direct' && currentOpenDirectPeer) {
        await supabaseClient.from('messages').insert([{
          sender_id: currentUser.id,
          recipient_id: currentOpenDirectPeer.id,
          content,
          message_type: 'direct'
        }]);
      } else if (chatTypeMode === 'groups' && currentOpenGroup) {
        await supabaseClient.from('messages').insert([{
          group_id: currentOpenGroup.id,
          sender_id: currentUser.id,
          content,
          message_type: 'group'
        }]);
      }
    } catch (e) {}
  };

  // Lite mode toggle
  const toggleLiteMode = () => {
    setIsLiteMode(prev => {
      const next = !prev;
      LocalStore.set('lite_mode', next);
      return next;
    });
  };

  // Wallpaper selection
  const handleSelectWallpaper = (wallpaperId: string) => {
    setActiveWallpaper(wallpaperId);
    LocalStore.set('wallpaper', wallpaperId);
  };

  const toggleVoiceTyping = () => {
    if (!recognitionRef.current) return;
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        setIsListening(false);
      }
    }
  };

  /* ============================================================
     NOTIFICATIONS UTILITY
     ============================================================ */
  function addLocalNotification(title: string, message: string) {
    playNotificationSound();
    const currentNotifs = LocalStore.get('notifications') || [];
    const newNotif = {
      id: Date.now(),
      title,
      message,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    const updated = [newNotif, ...currentNotifs];
    LocalStore.set('notifications', updated);
    setNotifications(updated);
  }

  /* ============================================================
     INITIALIZATION & SHORT-INTERVAL BACKGROUND POLLING (1200ms)
     ============================================================ */
  useEffect(() => {
    loadCachedState();
    verifySessionAndInitialize().finally(() => {
      setIsLoading(false);
    });

    const syncInterval = setInterval(() => {
      syncBackgroundData();
    }, 1200);

    return () => clearInterval(syncInterval);
  }, []);

  async function syncBackgroundData() {
    try {
      const activeGrp = currentOpenGroupRef.current;
      const activePeer = currentOpenDirectPeerRef.current;
      const currentMode = chatTypeModeRef.current;
      const activeUser = currentUserRef.current;

      if (activeGrp && currentMode === 'groups') {
        const { data } = await supabaseClient
          .from('messages')
          .select('*')
          .eq('group_id', activeGrp.id)
          .order('created_at', { ascending: true });

        if (data) {
          const enriched = await enrichMessagesWithProfiles(data);
          setMessages(enriched);
          LocalStore.set('messages_' + activeGrp.id, enriched);
        }
      } else if (activePeer && currentMode === 'direct' && activeUser) {
        const cacheKey = 'messages_direct_' + [activeUser.id, activePeer.id].sort().join('_');
        const { data } = await supabaseClient
          .from('messages')
          .select('*')
          .or(`and(sender_id.eq.${activeUser.id},recipient_id.eq.${activePeer.id}),and(sender_id.eq.${activePeer.id},recipient_id.eq.${activeUser.id})`)
          .order('created_at', { ascending: true });

        if (data) {
          const enriched = await enrichMessagesWithProfiles(data);
          setMessages(enriched);
          LocalStore.set(cacheKey, enriched);
        }
      }

      // Sync groups and members
      const { data: groups } = await supabaseClient
        .from('chat_groups')
        .select('*')
        .order('created_at', { ascending: false });

      const { data: members } = await supabaseClient
        .from('group_members')
        .select('*');

      if (groups) {
        const membersByGroup: Record<string, any[]> = {};
        if (members) {
          members.forEach(m => {
            if (!membersByGroup[m.group_id]) membersByGroup[m.group_id] = [];
            membersByGroup[m.group_id].push(m);
          });
        }

        const fullGroups = groups.map(g => ({
          ...g,
          group_members: membersByGroup[g.id] || []
        }));

        setGroupsData(fullGroups);
        LocalStore.set('groups', fullGroups);
      }
    } catch (err) {}
  }

  function loadCachedState() {
    const arch = LocalStore.get('archived_groups') || [];
    const unread = LocalStore.get('unread') || {};
    const notifs = LocalStore.get('notifications') || [];
    const cachedGroups = LocalStore.get('groups') || [];
    const cachedUsers = LocalStore.get('all_users') || [];
    
    setArchivedGroupIds(arch);
    setUnreadCounts(unread);
    setNotifications(notifs);
    if (cachedGroups.length > 0) setGroupsData(cachedGroups);
    if (cachedUsers.length > 0) setUserList(cachedUsers);

    const cachedProfile = LocalStore.get('profile');
    if (cachedProfile) {
      setCurrentProfile(cachedProfile);
      setEditProfileName(cachedProfile.username || '');
      setEditProfileStatus(cachedProfile.status_message || 'Online in Lounge');
      setEditProfileAvatar(cachedProfile.avatar_url || '');
    }
  }

  async function verifySessionAndInitialize() {
    try {
      const { data: { session } } = await supabaseClient.auth.getSession();
      if (session?.user) {
        setCurrentUser(session.user);
        await fetchOrCreateProfile(session.user);
        await fetchGroups();
        await fetchUsersList(session.user.id);
      } else {
        await fetchGroups();
        await fetchUsersList();
      }
    } catch (err) {}
  }

  async function fetchOrCreateProfile(userObj: any) {
    if (!userObj) return;
    let profile: any = null;
    try {
      const { data } = await supabaseClient.from('profiles').select('*').eq('id', userObj.id).single();
      profile = data;
    } catch (e) {}

    if (!profile) {
      const fallbackName = userObj.email ? userObj.email.split('@')[0] : 'Fan_' + userObj.id.substring(0, 5);
      try {
        const { data: newProfile } = await supabaseClient
          .from('profiles')
          .insert([{ id: userObj.id, username: fallbackName }])
          .select()
          .single();
        profile = newProfile;
      } catch (e) {}
    }

    const finalProfile = profile || {
      id: userObj.id,
      username: userObj.email ? userObj.email.split('@')[0] : 'Fan',
      avatar_url: '',
      status_message: 'Online in Lounge',
      is_global_admin: false
    };

    setCurrentProfile(finalProfile);
    setEditProfileName(finalProfile.username || '');
    LocalStore.set('profile', finalProfile);
  }

  async function fetchGroups() {
    try {
      const { data: groups } = await supabaseClient
        .from('chat_groups')
        .select('*')
        .order('created_at', { ascending: false });

      const { data: members } = await supabaseClient
        .from('group_members')
        .select('*');

      if (groups) {
        const membersByGroup: Record<string, any[]> = {};
        if (members) {
          members.forEach(m => {
            if (!membersByGroup[m.group_id]) membersByGroup[m.group_id] = [];
            membersByGroup[m.group_id].push(m);
          });
        }

        const fullGroups = groups.map(g => ({
          ...g,
          group_members: membersByGroup[g.id] || []
        }));

        setGroupsData(fullGroups);
        LocalStore.set('groups', fullGroups);
      }
    } catch (e) {}
  }

  async function fetchUsersList(currentUserId?: string) {
    try {
      const { data, error } = await supabaseClient
        .from('profiles')
        .select('*')
        .order('username', { ascending: true });

      if (!error && data) {
        const targetId = currentUserId || currentUser?.id;
        const filtered = targetId ? data.filter(u => u.id !== targetId) : data;
        setUserList(filtered);
        LocalStore.set('all_users', filtered);
      }
    } catch (e) {}
  }

  /* ============================================================
     SELECTION & JOIN GUARD PROTOCOL
     ============================================================ */
  function isMember(group: any, userId: string) {
    if (!group || !userId) return false;
    return group.group_members?.some((m: any) => m.user_id === userId);
  }

  // Strict Join Guard: checks in-memory and Supabase database membership records
  async function checkJoinGuard(groupOrId: any): Promise<boolean> {
    const group = typeof groupOrId === 'string'
      ? (groupsData.find(g => g.id === groupOrId) || LocalStore.get('groups')?.find((g: any) => g.id === groupOrId))
      : groupOrId;

    if (!group) return false;

    if (!currentUser) {
      addLocalNotification("AUTHENTICATION REQUIRED", "Please sign in to access football lounges.");
      return false;
    }

    // Admins and creators always pass Join Guard
    if (currentProfile?.is_global_admin || group.creator_id === currentUser.id) {
      return true;
    }

    // In-memory member check
    if (isMember(group, currentUser.id)) {
      return true;
    }

    // Direct database validation check against group_members table
    try {
      const { data: memberRecord } = await supabaseClient
        .from('group_members')
        .select('id, role')
        .eq('group_id', group.id)
        .eq('user_id', currentUser.id)
        .maybeSingle();

      if (memberRecord) {
        return true;
      }
    } catch (e) {}

    // User is NOT in the group members table -> Trigger Request to Join Modal
    setTargetJoinGroup(group);
    openModal('requestToJoinModal');
    return false;
  }

  // URL Deep Link Navigation Guard Effect
  useEffect(() => {
    const targetGroupId = searchParams.get('group') || searchParams.get('channel') || searchParams.get('id');
    if (targetGroupId && groupsData.length > 0 && currentUser) {
      const targetGroup = groupsData.find(g => g.id === targetGroupId);
      if (targetGroup) {
        handleGroupCardClick(targetGroup);
        const newParams = new URLSearchParams(searchParams);
        newParams.delete('group');
        newParams.delete('channel');
        newParams.delete('id');
        setSearchParams(newParams, { replace: true });
      }
    }
  }, [searchParams, groupsData, currentUser]);

  async function handleGroupCardClick(group: any) {
    if (!currentUser) {
      addLocalNotification("AUTHENTICATION REQUIRED", "Please sign in to access football lounges.");
      return;
    }

    const hasAccess = await checkJoinGuard(group);
    if (hasAccess) {
      openChatRoom(group.id);
    }
  }

  async function handleJoinFromModal(groupId: string) {
    if (!currentUser) return;
    setIsJoining(true);
    try {
      await joinGroup(groupId);
      closeModal('requestToJoinModal');
      await openChatRoom(groupId);
    } finally {
      setIsJoining(false);
    }
  }

  async function openGroupAbout(groupId: string) {
    const group = groupsData.find(g => g.id === groupId) || currentOpenGroup;
    if (!group) return;
    setCurrentOpenGroup(group);
    await fetchGroupAboutMembers(group.id);
    openModal('groupAboutModal');
  }

  async function openChatRoom(groupId: string) {
    const group = groupsData.find(g => g.id === groupId);
    if (!group) return;

    // Join Guard Check: block if not a member
    const hasAccess = await checkJoinGuard(group);
    if (!hasAccess) return;

    setCurrentOpenGroup(group);
    setCurrentOpenDirectPeer(null);
    setChatTypeMode('groups');

    // Instant local cache display
    const cached = LocalStore.get('messages_' + groupId);
    if (cached && Array.isArray(cached)) {
      setMessages(cached);
      scrollToBottom();
    } else {
      setMessages([]);
    }

    setUnreadCounts(prev => {
      const updated = { ...prev, [groupId]: 0 };
      LocalStore.set('unread', updated);
      return updated;
    });

    openModal('chatRoomModal');
    await fetchGroupMessages(group.id);
    await fetchGroupAboutMembers(group.id);
  }

  async function openDirectChatWithUser(peerUser: any) {
    setCurrentOpenDirectPeer(peerUser);
    setCurrentOpenGroup(null);
    setChatTypeMode('direct');
    closeModal('newDirectChatModal');

    if (currentUser) {
      const cacheKey = 'messages_direct_' + [currentUser.id, peerUser.id].sort().join('_');
      const cached = LocalStore.get(cacheKey);
      if (cached && Array.isArray(cached)) {
        setMessages(cached);
        scrollToBottom();
      } else {
        setMessages([]);
      }
    }

    setUnreadCounts(prev => {
      const updated = { ...prev, [peerUser.id]: 0 };
      LocalStore.set('unread', updated);
      return updated;
    });

    openModal('chatRoomModal');
    if (peerUser?.id) {
      await fetchDirectMessages(peerUser.id);
    }
  }

  async function fetchGroupMessages(groupId: string) {
    const cached = LocalStore.get('messages_' + groupId);
    if (cached && Array.isArray(cached)) {
      setMessages(cached);
      scrollToBottom();
    }

    try {
      const { data, error } = await supabaseClient
        .from('messages')
        .select('*')
        .eq('group_id', groupId)
        .order('created_at', { ascending: true });

      if (!error && data) {
        const enriched = await enrichMessagesWithProfiles(data);
        setMessages(enriched);
        LocalStore.set('messages_' + groupId, enriched);
        scrollToBottom();
      }
    } catch (e) {}
  }

  async function fetchDirectMessages(peerId: string) {
    if (!currentUser) return;
    const cacheKey = 'messages_direct_' + [currentUser.id, peerId].sort().join('_');
    const cached = LocalStore.get(cacheKey);
    if (cached && Array.isArray(cached)) {
      setMessages(cached);
      scrollToBottom();
    }

    try {
      const { data, error } = await supabaseClient
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${currentUser.id},recipient_id.eq.${peerId}),and(sender_id.eq.${peerId},recipient_id.eq.${currentUser.id})`)
        .order('created_at', { ascending: true });

      if (!error && data) {
        const enriched = await enrichMessagesWithProfiles(data);
        setMessages(enriched);
        LocalStore.set(cacheKey, enriched);
        scrollToBottom();
      }
    } catch (e) {}
  }

  async function fetchGroupAboutMembers(groupId: string) {
    try {
      const { data: members, error } = await supabaseClient
        .from('group_members')
        .select('*')
        .eq('group_id', groupId);

      if (!error && members) {
        const userIds = Array.from(new Set(members.map(m => m.user_id).filter(Boolean)));
        let profileMap: Record<string, any> = {};

        if (userIds.length > 0) {
          const { data: profiles } = await supabaseClient
            .from('profiles')
            .select('id, username, avatar_url')
            .in('id', userIds);

          if (profiles) {
            profiles.forEach((p: any) => {
              profileMap[p.id] = p;
            });
          }
        }

        const enrichedMembers = members.map(m => ({
          ...m,
          profiles: profileMap[m.user_id] || { username: 'Member', avatar_url: '' }
        }));

        setGroupAboutMembers(enrichedMembers);
      }
    } catch (e) {}
  }

  const scrollToBottom = () => {
    setTimeout(() => {
      if (chatMessagesAreaRef.current) {
        chatMessagesAreaRef.current.scrollTop = chatMessagesAreaRef.current.scrollHeight;
      }
    }, 50);
  };

  /* ============================================================
     SEND, EDIT & DELETE MESSAGES (OPTIMISTIC RENDERING)
     ============================================================ */
  async function sendChatMessage() {
    const content = chatInputText.trim();
    if (!content || !currentUser) return;

    if (presenceChannelRef.current) {
      presenceChannelRef.current.track({
        username: currentProfile?.username || 'User',
        isTyping: false
      });
    }

    if (chatTypeMode === 'direct' && currentOpenDirectPeer) {
      const optimisticMsg = {
        id: 'opt_' + Date.now(),
        sender_id: currentUser.id,
        recipient_id: currentOpenDirectPeer.id,
        content,
        created_at: new Date().toISOString(),
        message_type: 'direct',
        profiles: { username: currentProfile?.username || 'You', avatar_url: currentProfile?.avatar_url || '' }
      };

      setMessages(prev => {
        const updated = [...prev, optimisticMsg];
        const cacheKey = 'messages_direct_' + [currentUser.id, currentOpenDirectPeer.id].sort().join('_');
        LocalStore.set(cacheKey, updated);
        return updated;
      });
      setChatInputText('');
      scrollToBottom();

      // Persist to Firebase Firestore
      saveChatMessage(optimisticMsg).catch(() => {});

      try {
        const { error } = await supabaseClient.from('messages').insert([{
          sender_id: currentUser.id,
          recipient_id: currentOpenDirectPeer.id,
          content,
          message_type: 'direct'
        }]);
        if (error) {
          SyncService.queuePendingOperation('send_direct_message', {
            sender_id: currentUser.id,
            recipient_id: currentOpenDirectPeer.id,
            content
          });
        }
      } catch (err) {
        SyncService.queuePendingOperation('send_direct_message', {
          sender_id: currentUser.id,
          recipient_id: currentOpenDirectPeer.id,
          content
        });
      }

      fetchDirectMessages(currentOpenDirectPeer.id);
    } else if (chatTypeMode === 'groups' && currentOpenGroup) {
      const optimisticMsg = {
        id: 'opt_' + Date.now(),
        group_id: currentOpenGroup.id,
        sender_id: currentUser.id,
        content,
        created_at: new Date().toISOString(),
        message_type: 'group',
        profiles: { username: currentProfile?.username || 'You', avatar_url: currentProfile?.avatar_url || '' }
      };

      setMessages(prev => {
        const updated = [...prev, optimisticMsg];
        LocalStore.set('messages_' + currentOpenGroup.id, updated);
        return updated;
      });
      setChatInputText('');
      scrollToBottom();

      // Persist to Firebase Firestore
      saveChatMessage(optimisticMsg).catch(() => {});

      try {
        const { error } = await supabaseClient.from('messages').insert([{
          group_id: currentOpenGroup.id,
          sender_id: currentUser.id,
          content,
          message_type: 'group'
        }]);
        if (error) {
          SyncService.queuePendingOperation('send_group_message', {
            group_id: currentOpenGroup.id,
            sender_id: currentUser.id,
            content
          });
        }
      } catch (err) {
        SyncService.queuePendingOperation('send_group_message', {
          group_id: currentOpenGroup.id,
          sender_id: currentUser.id,
          content
        });
      }

      fetchGroupMessages(currentOpenGroup.id);
    }
  }

  const handleSendMessage = sendChatMessage;

  async function handleDeleteMessage(msgId: number | string) {
    setMessages(prev => {
      const updated = prev.filter(m => m.id !== msgId);
      if (currentOpenGroup) {
        LocalStore.set('messages_' + currentOpenGroup.id, updated);
      } else if (currentOpenDirectPeer && currentUser) {
        const cacheKey = 'messages_direct_' + [currentUser.id, currentOpenDirectPeer.id].sort().join('_');
        LocalStore.set(cacheKey, updated);
      }
      return updated;
    });

    if (typeof msgId === 'number' || !String(msgId).startsWith('opt_')) {
      await supabaseClient.from('messages').delete().eq('id', msgId);
    }
  }

  async function handleSaveEditMessage(msgId: number | string) {
    if (!editingMessageText.trim()) return;
    const newContent = editingMessageText.trim();

    setMessages(prev => {
      const updated = prev.map(m => (m.id === msgId ? { ...m, content: newContent, is_edited: true } : m));
      if (currentOpenGroup) {
        LocalStore.set('messages_' + currentOpenGroup.id, updated);
      } else if (currentOpenDirectPeer && currentUser) {
        const cacheKey = 'messages_direct_' + [currentUser.id, currentOpenDirectPeer.id].sort().join('_');
        LocalStore.set(cacheKey, updated);
      }
      return updated;
    });

    setEditingMessageId(null);
    setEditingMessageText('');

    if (typeof msgId === 'number' || !String(msgId).startsWith('opt_')) {
      await supabaseClient
        .from('messages')
        .update({ content: newContent, is_edited: true })
        .eq('id', msgId);
    }
  }

  /* ============================================================
     ADMIN & ROSTER ACTIONS WITH STRICT PRIVILEGE CHECKS
     ============================================================ */
  function isGroupAdmin(group: any, userId: string) {
    if (!userId) return false;
    if (currentProfile?.is_global_admin) return true;
    if (group?.creator_id === userId) return true;

    const memberRecord = group?.group_members?.find((x: any) => x.user_id === userId);
    if (memberRecord?.role === 'admin') return true;

    const rosterRecord = groupAboutMembers.find((x: any) => x.user_id === userId);
    if (rosterRecord?.role === 'admin') return true;

    return false;
  }

  async function joinGroup(groupId: string) {
    if (!currentUser) return;
    await supabaseClient.from('group_members').insert([{ group_id: groupId, user_id: currentUser.id, role: 'member' }]);
    closeModal('groupAboutModal');
    addLocalNotification("LOUNGE JOINED", "You are now an active member of this lounge.");
    await fetchGroups();
    await fetchGroupAboutMembers(groupId);
  }

  async function exitGroup(groupId: string) {
    if (!currentUser) return;
    await supabaseClient.from('group_members').delete().eq('group_id', groupId).eq('user_id', currentUser.id);
    closeModal('groupAboutModal');
    closeModal('chatRoomModal');
    addLocalNotification("LOUNGE EXITED", "You left the lounge.");
    await fetchGroups();
  }

  async function deleteGroup(groupId: string) {
    await supabaseClient.from('chat_groups').delete().eq('id', groupId);
    closeModal('groupAboutModal');
    closeModal('chatRoomModal');
    addLocalNotification("CHANNEL DELETED", "The lounge channel was permanently deleted.");
    await fetchGroups();
  }

  async function promoteUser(groupId: string, userId: string) {
    await supabaseClient.from('group_members').update({ role: 'admin' }).eq('group_id', groupId).eq('user_id', userId);
    addLocalNotification("ADMIN ELEVATION", "User elevated to ADMIN clearance.");
    await fetchGroupAboutMembers(groupId);
    await fetchGroups();
  }

  async function demoteAdmin(groupId: string, userId: string) {
    await supabaseClient.from('group_members').update({ role: 'member' }).eq('group_id', groupId).eq('user_id', userId);
    addLocalNotification("ADMIN DEMOTION", "Clearance adjusted to standard MEMBER.");
    await fetchGroupAboutMembers(groupId);
    await fetchGroups();
  }

  function inviteMember(groupId: string) {
    const group = groupsData.find(g => g.id === groupId);
    const groupName = group ? group.name : 'Group';

    setCustomPrompt({
      type: 'input',
      title: 'GENERATE INVITATION LINK',
      titleColor: '#10b981',
      message: `Invite users to ${groupName} via User ID or Email:`,
      placeholder: 'Enter User ID or email address...',
      confirmText: 'GENERATE LINK',
      confirmBg: 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black',
      onConfirm: (target: string) => {
        if (target && target.trim() !== "") {
          const inviteLink = `${window.location.origin}${window.location.pathname}?group=${groupId}`;
          addLocalNotification("INVITATION DISPATCHED", `Invite link created for ${groupName} (${target.trim()}).`);
          if (navigator.clipboard) {
            navigator.clipboard.writeText(inviteLink).catch(() => {});
          }
        }
        setCustomPrompt(null);
      }
    });
  }

  function suspendMember(groupId: string, userId: string) {
    setCustomPrompt({
      type: 'number',
      title: 'SUSPEND MEMBER',
      titleColor: '#ef4444',
      message: 'Set suspension duration in hours (e.g. 24, 48):',
      defaultValue: '24',
      confirmText: 'Suspend User',
      confirmBg: 'bg-red-600 hover:bg-red-500 text-white',
      onConfirm: async (duration: number | string) => {
        const parsedDuration = Number(duration) || 24;
        const suspendedUntil = new Date(Date.now() + parsedDuration * 3600 * 1000).toISOString();
        await supabaseClient
          .from('group_members')
          .update({ is_suspended: true, suspended_until: suspendedUntil })
          .eq('group_id', groupId)
          .eq('user_id', userId);

        addLocalNotification("MEMBER SUSPENDED", `User access suspended for ${parsedDuration} hours.`);
        await fetchGroupAboutMembers(groupId);
        await fetchGroups();
        setCustomPrompt(null);
      }
    });
  }

  /* ============================================================
     1-ON-1 ENCRYPTED DIRECT CHAT REQUEST PROTOCOL LOGIC
     ============================================================ */
  function sendChatRequestPrompt(targetUser: any) {
    if (!currentUser) {
      addLocalNotification("SIGN IN REQUIRED", "Please sign in to start direct messaging.");
      return;
    }
    
    if (targetUser.id === currentUser.id) {
      addLocalNotification("ACTION DENIED", "You cannot initiate a direct chat with yourself.");
      return;
    }

    setCustomPrompt({
      type: 'input',
      title: 'INITIALIZE ENCRYPTED CHAT',
      titleColor: '#3b82f6',
      message: `Do you want to establish an end-to-end encrypted direct chat feed with ${targetUser.username}? Enter an optional greeting:`,
      placeholder: "Hello, let's connect on match tactics...",
      confirmText: 'ESTABLISH FEED',
      confirmBg: 'bg-blue-600 hover:bg-blue-500 text-white font-bold',
      onConfirm: async (messageText: string) => {
        if (messageText && messageText.trim() !== '') {
          await supabaseClient.from('messages').insert([{
            sender_id: currentUser.id,
            recipient_id: targetUser.id,
            content: `[DIRECT FEED REQUEST] ${messageText.trim()}`,
            message_type: 'direct'
          }]);
        }
        
        addLocalNotification("SECURE FEED INITIATED", `Secure 1-on-1 direct channel established with ${targetUser.username}.`);
        setCustomPrompt(null);
        openDirectChatWithUser(targetUser);
      }
    });
  }

  /* ============================================================
     GROUP CREATION & APPROVAL WORKFLOW LOGIC
     ============================================================ */
  async function createNewGroupSubmit() {
    if (!newGroupName.trim() || !currentUser) return;
    
    const isApproved = !!currentProfile?.is_global_admin;

    const { data, error } = await supabaseClient.from('chat_groups').insert([{
      name: newGroupName.trim(),
      description: newGroupDesc.trim(),
      creator_id: currentUser.id,
      is_approved: isApproved
    }]).select().single();

    if (!error && data) {
      await supabaseClient.from('group_members').insert([{ group_id: data.id, user_id: currentUser.id, role: 'admin' }]);
      closeModal('createGroupModal');
      setNewGroupName('');
      setNewGroupDesc('');
      addLocalNotification(
        "LOUNGE INITIALIZED", 
        isApproved ? "Lounge is active and public!" : "Lounge submitted and pending admin approval."
      );
      await fetchGroups();
    }
  }

  async function approveGroup(groupId: string) {
    const { error } = await supabaseClient
      .from('chat_groups')
      .update({ is_approved: true })
      .eq('id', groupId);

    if (!error) {
      addLocalNotification("LOUNGE APPROVED", "The lounge has been successfully approved and activated.");
      await fetchGroups();
    }
  }

  async function saveProfileChanges() {
    if (!currentUser) return;
    const newUsername = editProfileName.trim();
    const newStatus = editProfileStatus.trim();
    const newAvatar = editProfileAvatar.trim();

    const updatePayload: any = {
      username: newUsername,
      status_message: newStatus,
      updated_at: new Date().toISOString()
    };
    if (newAvatar) updatePayload.avatar_url = newAvatar;

    const { data } = await supabaseClient
      .from('profiles')
      .update(updatePayload)
      .eq('id', currentUser.id)
      .select()
      .single();

    if (data) {
      setCurrentProfile(data);
      LocalStore.set('profile', data);
      closeModal('editProfileModal');
      addLocalNotification("PROFILE UPDATED", "User identity successfully updated.");
    }
  }

  const currentAvatar = currentProfile?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150';

  let lastDateDivider = '';

  return (
    <div className="min-h-screen bg-transparent text-slate-100 font-['Rajdhani',sans-serif] flex flex-col relative overflow-x-hidden">
      <UniversalFAB />

      <FuturisticLoader active={isLoading} text="SYNCHRONIZING FOOTBALL CHAT HUBS..." />

      {/* OFF-SCREEN SIDE DRAWER BACKDROP */}
      {isSideNavOpen && (
        <div
          onClick={() => setIsSideNavOpen(false)}
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[90] transition-opacity duration-300"
        />
      )}

      {/* OFF-SCREEN SIDE DRAWER */}
      <aside
        className={`fixed top-0 left-0 bottom-0 z-[100] w-72 bg-[#091120] border-r border-slate-800/90 p-5 flex flex-col justify-between transform transition-transform duration-300 ease-out shadow-2xl ${
          isSideNavOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center font-black text-slate-950 text-xs font-['Orbitron'] shadow-md shadow-emerald-950/50">
                MTL
              </div>
              <span className="font-extrabold text-sm text-white font-['Orbitron'] tracking-wider">NAV MENU</span>
            </div>
            <button onClick={() => setIsSideNavOpen(false)} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <nav className="space-y-1.5">
            <button
              onClick={() => {
                setActiveMainView('chats');
                setIsSideNavOpen(false);
              }}
              className={`w-full p-3 rounded-xl border font-bold text-xs flex items-center gap-3 transition-all duration-200 cursor-pointer ${
                activeMainView === 'chats'
                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40 shadow-sm'
                  : 'bg-slate-900/40 border-slate-800/80 text-slate-300 hover:bg-slate-800/70 hover:text-white'
              }`}
            >
              <Users className="w-4 h-4 text-emerald-400" />
              <span>Group Lounges & Direct Chats</span>
            </button>

            <button
              onClick={() => {
                setActiveMainView('notifications');
                setIsSideNavOpen(false);
              }}
              className={`w-full p-3 rounded-xl border font-bold text-xs flex items-center gap-3 transition-all duration-200 cursor-pointer ${
                activeMainView === 'notifications'
                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40 shadow-sm'
                  : 'bg-slate-900/40 border-slate-800/80 text-slate-300 hover:bg-slate-800/70 hover:text-white'
              }`}
            >
              <Bell className="w-4 h-4 text-emerald-400" />
              <span>Notifications ({notifications.length})</span>
            </button>

            <button
              onClick={() => {
                setActiveMainView('userHub');
                setIsSideNavOpen(false);
              }}
              className={`w-full p-3 rounded-xl border font-bold text-xs flex items-center gap-3 transition-all duration-200 cursor-pointer ${
                activeMainView === 'userHub'
                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40 shadow-sm'
                  : 'bg-slate-900/40 border-slate-800/80 text-slate-300 hover:bg-slate-800/70 hover:text-white'
              }`}
            >
              <User className="w-4 h-4 text-emerald-400" />
              <span>User Profile Settings</span>
            </button>

            <button
              onClick={() => {
                openModal('createGroupModal');
                setIsSideNavOpen(false);
              }}
              className="w-full p-3 rounded-xl bg-slate-900/40 border border-slate-800/80 font-bold text-xs text-slate-300 hover:bg-slate-800/70 hover:text-white flex items-center gap-3 transition-all duration-200 cursor-pointer"
            >
              <Plus className="w-4 h-4 text-emerald-400" />
              <span>Create New Group</span>
            </button>
          </nav>
        </div>
      </aside>

      {/* MAIN TOP NAVBAR */}
      <header className="h-16 bg-[#08111e]/90 backdrop-blur-xl border-b border-slate-800/80 px-4 sm:px-6 flex items-center justify-between sticky top-16 z-30 shadow-lg shadow-black/30">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsSideNavOpen(true)}
            className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-emerald-400 hover:text-white hover:border-emerald-500/40 transition-colors cursor-pointer"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center font-black text-slate-950 font-['Orbitron'] shadow-md shadow-emerald-950/50">
              HUB
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-extrabold tracking-wider text-white uppercase font-['Orbitron'] flex items-center gap-2">
                FOOTBALL CHAT LOUNGE
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              </h1>
            </div>
          </div>
        </div>

        {/* Primary Navigation Tabs (WhatsApp / Telegram Style) */}
        <div className="hidden md:flex items-center gap-1 bg-[#060d18] p-1 rounded-2xl border border-slate-800/90 shadow-inner">
          <button
            onClick={() => setActiveMainView('chats')}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold font-['Orbitron'] tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
              activeMainView === 'chats'
                ? 'bg-emerald-500 text-slate-950 shadow-md font-black'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>CHATS</span>
            {Object.values(unreadCounts).reduce((a, b) => a + b, 0) > 0 && (
              <span className="px-1.5 py-0.2 bg-emerald-950 text-emerald-300 rounded-full text-[10px] font-mono">
                {Object.values(unreadCounts).reduce((a, b) => a + b, 0)}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveMainView('status')}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold font-['Orbitron'] tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
              activeMainView === 'status'
                ? 'bg-emerald-500 text-slate-950 shadow-md font-black'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>STATUS</span>
            {allStatuses.length > 0 && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            )}
          </button>

          <button
            onClick={() => setActiveMainView('calls')}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold font-['Orbitron'] tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
              activeMainView === 'calls'
                ? 'bg-emerald-500 text-slate-950 shadow-md font-black'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <PhoneCall className="w-3.5 h-3.5" />
            <span>CALLS</span>
          </button>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* LITE MODE TOGGLE */}
          <button
            onClick={toggleLiteMode}
            className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              isLiteMode
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm'
                : 'bg-slate-900/80 text-slate-300 border-slate-800 hover:border-emerald-500/40'
            }`}
            title={isLiteMode ? 'Switch to Full 4K Ultra Mode' : 'Switch to Ultra-fast Lite Mode'}
          >
            <Zap className={`w-3.5 h-3.5 ${isLiteMode ? 'text-amber-400 animate-pulse' : 'text-slate-400'}`} />
            <span className="hidden sm:inline">{isLiteMode ? 'Lite Mode' : '4K Mode'}</span>
          </button>

          {/* User Profile Dial / View Button */}
          <button
            onClick={() => openOtherUserProfile(currentProfile || currentUser)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-emerald-500/40 transition-all cursor-pointer shadow-sm group"
            title="Dial & Manage User Profile"
          >
            <div className="relative">
              <img src={currentAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'} alt="Profile" className="w-6 h-6 rounded-full object-cover border border-emerald-400 group-hover:scale-105 transition-transform" />
              <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400" />
            </div>
            <span className="text-xs font-bold text-slate-200 hidden sm:inline">{currentProfile?.username || 'My Profile'}</span>
          </button>
        </div>
      </header>

      {/* MOBILE SECONDARY TAB BAR */}
      <div className="md:hidden flex items-center justify-around bg-[#070e1a] border-b border-slate-800/80 px-2 py-2 sticky top-16 z-20">
        <button
          onClick={() => setActiveMainView('chats')}
          className={`flex-1 py-1.5 text-center text-xs font-bold font-['Orbitron'] border-b-2 transition-all cursor-pointer ${
            activeMainView === 'chats'
              ? 'text-emerald-400 border-emerald-400'
              : 'text-slate-400 border-transparent'
          }`}
        >
          CHATS
        </button>
        <button
          onClick={() => setActiveMainView('status')}
          className={`flex-1 py-1.5 text-center text-xs font-bold font-['Orbitron'] border-b-2 transition-all cursor-pointer ${
            activeMainView === 'status'
              ? 'text-emerald-400 border-emerald-400'
              : 'text-slate-400 border-transparent'
          }`}
        >
          STATUS ({allStatuses.length})
        </button>
        <button
          onClick={() => setActiveMainView('calls')}
          className={`flex-1 py-1.5 text-center text-xs font-bold font-['Orbitron'] border-b-2 transition-all cursor-pointer ${
            activeMainView === 'calls'
              ? 'text-emerald-400 border-emerald-400'
              : 'text-slate-400 border-transparent'
          }`}
        >
          CALLS
        </button>
      </div>

      {/* PAGE BODY WORKSPACE */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6 w-full flex-1">

        {/* VIEW 1: CHATS LIST & DIRECT MESSAGES */}
        {activeMainView === 'chats' && (
          <div className="space-y-6 animate-in fade-in-50 duration-300">

            {/* WHATSAPP MATCH STATUS REEL AT TOP OF CHATS */}
            <StatusReel
              statuses={allStatuses}
              currentUser={currentUser}
              userProfile={currentProfile}
              onRefreshStatuses={() => {}}
            />

            {/* SEGMENTED TAB SWITCHER & ACTION BUTTON */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#0a1424] border border-slate-800/80 p-2 rounded-2xl shadow-xl shadow-black/40">
              <div className="flex items-center gap-1.5 bg-[#060d18] p-1 rounded-xl border border-slate-800/60">
                <button
                  onClick={() => setChatTypeMode('groups')}
                  className={`flex-1 sm:flex-initial px-5 py-2.5 rounded-lg text-xs font-bold font-['Orbitron'] tracking-wider transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 ${
                    chatTypeMode === 'groups'
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black shadow-md shadow-emerald-950/50'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>GROUP LOUNGES ({groupsData.length})</span>
                </button>

                <button
                  onClick={() => {
                    setChatTypeMode('direct');
                    fetchUsersList();
                  }}
                  className={`flex-1 sm:flex-initial px-5 py-2.5 rounded-lg text-xs font-bold font-['Orbitron'] tracking-wider transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 ${
                    chatTypeMode === 'direct'
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black shadow-md shadow-emerald-950/50'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>DIRECT MESSAGES ({userList.length})</span>
                </button>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {currentProfile?.is_global_admin && chatTypeMode === 'groups' && (
                  <button
                    onClick={() => openModal('pendingApprovalsModal')}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 font-extrabold text-xs font-['Orbitron'] transition-all shadow-md cursor-pointer"
                  >
                    <ShieldCheck className="w-4 h-4 text-amber-400" />
                    <span>PENDING APPROVALS ({groupsData.filter(g => !g.is_approved).length})</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    if (chatTypeMode === 'groups') {
                      openModal('createGroupModal');
                    } else {
                      fetchUsersList();
                      openModal('newDirectChatModal');
                    }
                  }}
                  className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-extrabold text-xs font-['Orbitron'] transition-all shadow-md shadow-emerald-950/40 hover:-translate-y-0.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>{chatTypeMode === 'groups' ? 'CREATE PUBLIC LOUNGE' : 'START 1-ON-1 CHAT'}</span>
                </button>
              </div>
            </div>

            {/* SEARCH & FILTER CONTROLS */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder={chatTypeMode === 'groups' ? "Search public lounges by name or topic..." : "Search registered members for direct chat..."}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#0a1324] border border-slate-800/90 focus:border-emerald-500/60 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/30 transition-all"
                />
              </div>

              {chatTypeMode === 'groups' && (
                <div className="flex items-center gap-1.5 self-start sm:self-auto bg-[#0a1324] p-1 rounded-xl border border-slate-800/80">
                  {['all', 'my_groups', 'archived'].map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setCurrentTabFilter(tab)}
                      className={`px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase transition-all duration-200 cursor-pointer ${
                        currentTabFilter === tab
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {tab.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* SOLID PREMIUM CONTAINERS: GROUPS LIST */}
            {chatTypeMode === 'groups' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {groupsData
                  .filter(g => {
                    const isApproved = g.is_approved || currentProfile?.is_global_admin || g.creator_id === currentUser?.id;
                    if (!isApproved) return false;

                    const matchesSearch = (g.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                                          (g.description || '').toLowerCase().includes(searchQuery.toLowerCase());
                    if (currentTabFilter === 'my_groups') return matchesSearch && isMember(g, currentUser?.id);
                    if (currentTabFilter === 'archived') return matchesSearch && archivedGroupIds.includes(g.id);
                    return matchesSearch && !archivedGroupIds.includes(g.id);
                  })
                  .map(g => {
                    const joined = isMember(g, currentUser?.id);
                    const memberCount = g.group_members?.length || 1;
                    const unread = unreadCounts[g.id] || 0;

                    return (
                      <div
                        key={g.id}
                        onClick={() => handleGroupCardClick(g)}
                        className="group bg-gradient-to-b from-[#0e182a] to-[#0a1221] border border-slate-800/90 hover:border-emerald-500/40 rounded-2xl p-5 flex items-center justify-between cursor-pointer transition-all duration-200 hover:-translate-y-0.5 shadow-xl shadow-black/40 hover:shadow-emerald-950/20"
                      >
                        <div className="flex items-center gap-4">
                          <div className="relative">
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-slate-950 font-black text-sm font-['Orbitron'] shadow-md shadow-emerald-950/50 group-hover:scale-105 transition-transform">
                              {g.name ? g.name.substring(0, 2).toUpperCase() : 'FC'}
                            </div>
                            {unread > 0 && (
                              <span className="absolute -top-1 -right-1 px-1.5 py-0.5 bg-emerald-500 text-slate-950 font-black text-[10px] rounded-full animate-bounce shadow-md">
                                {unread}
                              </span>
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-bold text-white tracking-wide group-hover:text-emerald-300 transition-colors">
                                {g.name}
                              </h4>
                              {!g.is_approved && (
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase">
                                  Pending Approval
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">{g.description || 'Public Discussion Channel'}</p>
                            
                            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-1">
                              <span>Public Network</span>
                              <span aria-hidden="true">·</span>
                              <span>{memberCount} {memberCount === 1 ? 'member' : 'members'}</span>
                              <span aria-hidden="true">·</span>
                              <span className="text-emerald-400 font-medium">Active</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {joined ? (
                            <span className="px-3 py-1.5 rounded-xl bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[10px] font-extrabold uppercase tracking-wider">
                              OPEN CHAT
                            </span>
                          ) : (
                            <span className="px-3 py-1.5 rounded-xl bg-slate-800/80 group-hover:bg-emerald-500 group-hover:text-slate-950 text-slate-300 text-[10px] font-extrabold uppercase tracking-wider transition-colors border border-slate-700/60 flex items-center gap-1">
                              <LogIn className="w-3 h-3" />
                              JOIN
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}

            {/* SOLID PREMIUM CONTAINERS: DIRECT CHATS LIST */}
            {chatTypeMode === 'direct' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                  <span>ALL REGISTERED COMMUNITY MEMBERS ({userList.length})</span>
                  <button 
                    onClick={() => fetchUsersList()} 
                    className="text-emerald-400 hover:underline font-bold"
                  >
                    Refresh List ↻
                  </button>
                </div>

                {userList.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 bg-[#0a1221] border border-slate-800 rounded-2xl">
                    No other users registered yet.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {userList
                      .filter(u => (u.username || u.name || '').toLowerCase().includes(searchQuery.toLowerCase()))
                      .map(usr => {
                        const unread = unreadCounts[usr.id] || 0;
                        return (
                          <div
                            key={usr.id}
                            onClick={() => sendChatRequestPrompt(usr)}
                            className="group bg-gradient-to-b from-[#0e182a] to-[#0a1221] border border-slate-800/90 hover:border-emerald-500/40 rounded-2xl p-4.5 flex items-center justify-between cursor-pointer transition-all duration-200 hover:-translate-y-0.5 shadow-xl shadow-black/40 hover:shadow-emerald-950/20"
                          >
                            <div className="flex items-center gap-3.5">
                              <div className="relative w-11 h-11 rounded-full border-2 border-emerald-500/40 overflow-hidden shadow-md group-hover:border-emerald-400 transition-colors shrink-0">
                                <img
                                  src={usr.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                                  alt={usr.username || 'User'}
                                  className="w-full h-full object-cover"
                                />
                                {unread > 0 && (
                                  <span className="absolute -top-1 -right-1 px-1.5 py-0.5 bg-emerald-500 text-slate-950 font-black text-[9px] rounded-full">
                                    {unread}
                                  </span>
                                )}
                              </div>
                              <div>
                                <h4 className="text-sm font-bold text-white group-hover:text-emerald-300 transition-colors">{usr.username || usr.name || 'Member'}</h4>
                                <p className="text-[11px] text-slate-400 line-clamp-1">{usr.status_message || usr.favorite_club || 'Available on Hub'}</p>
                                <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-semibold mt-0.5">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                  <span>Active Fan</span>
                                </div>
                              </div>
                            </div>

                            <button className="px-3.5 py-1.5 rounded-xl bg-slate-800/90 group-hover:bg-emerald-500 text-slate-200 group-hover:text-slate-950 font-bold text-xs transition-colors border border-slate-700/60 shadow-sm">
                              Chat 💬
                            </button>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            )}

          </div>
        )}

        {/* VIEW 2: WHATSAPP-STYLE STATUS SECTION */}
        {activeMainView === 'status' && (
          <GroupChatsStatusTab
            currentUser={currentUser}
            userProfile={currentProfile}
          />
        )}

        {/* VIEW 3: WHATSAPP & TELEGRAM CALLS / HOTLINE TAB */}
        {activeMainView === 'calls' && (
          <GroupChatsCallsTab
            userList={userList}
            currentUser={currentUser}
            onDialCall={handleDialCall}
            onOpenProfile={openOtherUserProfile}
          />
        )}

        {/* VIEW 4: USER PROFILE HUB */}
        {activeMainView === 'userHub' && (
          <div className="space-y-4 animate-in fade-in-50 duration-300">
            <div className="bg-gradient-to-b from-[#0e182a] to-[#0a1221] border border-slate-800/90 rounded-2xl p-6 sm:p-7 flex flex-col sm:flex-row items-center justify-between gap-5 shadow-2xl shadow-black/50">
              <div className="flex items-center gap-5">
                <div className="relative w-16 h-16 rounded-full border-2 border-emerald-400 overflow-hidden shadow-lg shadow-emerald-950/40">
                  <img src={currentAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'} alt="Avatar" className="w-full h-full object-cover" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-black text-white font-['Orbitron']">{currentProfile?.username || 'User'}</h3>
                    {currentProfile?.is_global_admin && (
                      <span className="px-2 py-0.5 rounded-md bg-amber-500/20 border border-amber-500/40 text-[10px] font-black text-amber-300 uppercase tracking-wider font-['Orbitron']">
                        GLOBAL ADMIN
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">{currentProfile?.status_message || 'Online in Lounge'}</p>
                  <div className="flex items-center gap-2 text-[11px] text-emerald-400 font-medium mt-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Neural Authentication Active</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => openModal('editProfileModal')}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-extrabold text-xs font-['Orbitron'] transition-all shadow-md shadow-emerald-950/40 cursor-pointer"
              >
                Edit Identity Profile
              </button>
            </div>
          </div>
        )}

        {/* VIEW 3: NOTIFICATIONS VIEW */}
        {activeMainView === 'notifications' && (
          <div className="space-y-3 animate-in fade-in-50 duration-300">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-extrabold text-white font-['Orbitron']">SYSTEM NOTIFICATIONS</h3>
              <button
                onClick={() => {
                  LocalStore.set('notifications', []);
                  setNotifications([]);
                }}
                className="px-3 py-1.5 rounded-xl bg-red-500/15 text-red-400 border border-red-500/30 text-xs font-bold hover:bg-red-500 hover:text-white transition-colors cursor-pointer"
              >
                Clear All
              </button>
            </div>

            {notifications.length === 0 ? (
              <div className="p-8 text-center text-slate-500 bg-[#0a1221] border border-slate-800 rounded-2xl">
                No recent notifications recorded.
              </div>
            ) : (
              notifications.map(n => (
                <div key={n.id} className="p-4 rounded-xl bg-gradient-to-b from-[#0e182a] to-[#0a1221] border border-slate-800/80 space-y-1 shadow-md">
                  <h4 className="text-xs font-bold text-emerald-400">{n.title}</h4>
                  <p className="text-xs text-slate-300">{n.message}</p>
                  <span className="text-[10px] text-slate-500 block text-right">{n.time}</span>
                </div>
              ))
            )}
          </div>
        )}

      </div>

      {/* CHAT ROOM MODAL (DECORATED WITH WALLPAPERS, CALLS, SEARCH, PINNING, AND ADAPTIVE BUBBLES) */}
      {modals.chatRoomModal && (currentOpenGroup || currentOpenDirectPeer) && (
        <div className="fixed inset-0 top-16 z-[110] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="bg-[#081220] border border-slate-700/70 rounded-3xl w-full max-w-4xl h-[calc(100vh-5rem)] flex flex-col overflow-hidden shadow-2xl shadow-black/80 relative">
            
            {/* Header: WhatsApp & Telegram Style Top Bar */}
            <div className="h-16 px-4 sm:px-5 bg-[#0a1424] border-b border-slate-800 flex items-center justify-between shrink-0 shadow-md z-20">
              <div 
                onClick={() => {
                  if (chatTypeMode === 'direct' && currentOpenDirectPeer) {
                    openOtherUserProfile(currentOpenDirectPeer);
                  } else if (currentOpenGroup) {
                    openGroupAbout(currentOpenGroup.id);
                  }
                }}
                className="flex items-center gap-3 cursor-pointer group"
              >
                <div className="relative">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center font-black text-slate-950 font-['Orbitron'] shadow-sm group-hover:scale-105 transition-transform overflow-hidden">
                    {chatTypeMode === 'groups' ? (
                      currentOpenGroup?.name ? currentOpenGroup.name.substring(0, 2).toUpperCase() : 'FC'
                    ) : (
                      <img 
                        src={currentOpenDirectPeer?.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${currentOpenDirectPeer?.id}`} 
                        alt="Peer" 
                        className="w-full h-full object-cover" 
                      />
                    )}
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border border-slate-950" />
                </div>

                <div>
                  <h3 className="text-sm font-extrabold text-white font-['Orbitron'] group-hover:text-emerald-300 transition-colors flex items-center gap-1.5">
                    <span>{chatTypeMode === 'groups' ? currentOpenGroup?.name : currentOpenDirectPeer?.username}</span>
                    <span className="text-[10px] text-slate-500 font-mono hidden sm:inline">(Tap for profile)</span>
                  </h3>
                  <p className="text-[11px] text-emerald-400 font-medium flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>{chatTypeMode === 'groups' ? 'Encrypted Tactical Lounge' : 'Direct End-to-End Chat'}</span>
                  </p>
                </div>
              </div>

              {/* Action Toolbar: Dial Audio, Dial Video, Search, Wallpaper, Info */}
              <div className="flex items-center gap-1.5 sm:gap-2">
                {/* 1. Dial Audio Call */}
                <button
                  onClick={() => handleDialCall(currentOpenDirectPeer || { id: currentOpenGroup?.id, username: currentOpenGroup?.name }, 'audio')}
                  className="p-2 rounded-xl bg-slate-800/80 hover:bg-emerald-500 hover:text-slate-950 text-emerald-400 text-xs font-bold transition-all cursor-pointer border border-slate-700/60"
                  title="Dial Audio Hotline"
                >
                  <Phone className="w-4 h-4" />
                </button>

                {/* 2. Dial Video Call */}
                <button
                  onClick={() => handleDialCall(currentOpenDirectPeer || { id: currentOpenGroup?.id, username: currentOpenGroup?.name }, 'video')}
                  className="p-2 rounded-xl bg-slate-800/80 hover:bg-cyan-500 hover:text-slate-950 text-cyan-400 text-xs font-bold transition-all cursor-pointer border border-slate-700/60"
                  title="Dial Video Call"
                >
                  <Video className="w-4 h-4" />
                </button>

                {/* 3. In-Chat Message Search */}
                <button
                  onClick={() => setSearchInChat(!searchInChat)}
                  className={`p-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                    searchInChat ? 'bg-emerald-500 text-slate-950 border-emerald-400' : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 border-slate-700/60'
                  }`}
                  title="Search Messages in Chat"
                >
                  <Search className="w-4 h-4" />
                </button>

                {/* 4. Wallpaper Customizer */}
                <button
                  onClick={() => setIsWallpaperModalOpen(true)}
                  className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-purple-400 text-xs font-bold transition-all cursor-pointer border border-slate-700/60"
                  title="Change Wallpaper Theme"
                >
                  <Palette className="w-4 h-4" />
                </button>

                {/* 5. Channel Info / Roster */}
                {chatTypeMode === 'groups' && (
                  <button
                    onClick={() => openGroupAbout(currentOpenGroup.id)}
                    className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-emerald-400 text-xs font-bold transition-colors cursor-pointer border border-slate-700/60"
                    title="Specs & Roster"
                  >
                    <Info className="w-4 h-4" />
                  </button>
                )}

                {/* 6. Close Modal */}
                <button
                  onClick={() => closeModal('chatRoomModal')}
                  className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* TELEGRAM-STYLE PINNED MESSAGE BANNER */}
            {pinnedMessage && (
              <div className="px-4 py-2 bg-[#0c182c] border-b border-amber-500/30 flex items-center justify-between shrink-0 text-xs z-10 shadow-sm">
                <div className="flex items-center gap-2 truncate">
                  <Pin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span className="font-bold text-amber-300">Pinned:</span>
                  <span className="text-slate-200 truncate">{pinnedMessage.content}</span>
                </div>
                <button
                  onClick={() => setPinnedMessage(null)}
                  className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800"
                  title="Unpin Message"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* IN-CHAT MESSAGE SEARCH BAR */}
            {searchInChat && (
              <div className="px-4 py-2 bg-[#060e1c] border-b border-slate-800 flex items-center gap-2 shrink-0 z-10">
                <Search className="w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Find keyword in conversation..."
                  value={searchInChatQuery}
                  onChange={(e) => setSearchInChatQuery(e.target.value)}
                  className="flex-1 bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none"
                  autoFocus
                />
                {searchInChatQuery && (
                  <span className="text-[10px] text-slate-400 font-mono">
                    {messages.filter(m => (m.content || '').toLowerCase().includes(searchInChatQuery.toLowerCase())).length} found
                  </span>
                )}
                <button onClick={() => { setSearchInChat(false); setSearchInChatQuery(''); }} className="text-slate-400 hover:text-white p-1">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* DECORATED MESSAGES FEED WITH ACTIVE WALLPAPER */}
            <div 
              ref={chatMessagesAreaRef} 
              className={`flex-1 overflow-y-auto p-4 sm:p-5 space-y-2 wallpaper-${activeWallpaper} relative`}
            >
              {(() => {
                lastDateDivider = '';
                const filteredMsgs = searchInChatQuery
                  ? messages.filter(m => (m.content || '').toLowerCase().includes(searchInChatQuery.toLowerCase()))
                  : messages;

                if (filteredMsgs.length === 0) {
                  return (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-2">
                      <MessageSquare className="w-10 h-10 text-slate-600 animate-pulse" />
                      <p className="text-xs">
                        {searchInChatQuery ? 'No messages match search query.' : 'No messages in this channel yet. Start the conversation!'}
                      </p>
                    </div>
                  );
                }

                return filteredMsgs.map((m, idx) => {
                  const isOutgoing = m.sender_id === currentUser?.id;
                  const canAdminDelete = isGroupAdmin(currentOpenGroup, currentUser?.id);

                  const currentDivider = getWhatsAppDateDivider(m.created_at);
                  const showDateDivider = currentDivider !== lastDateDivider;
                  if (showDateDivider) {
                    lastDateDivider = currentDivider;
                  }

                  return (
                    <React.Fragment key={m.id || idx}>
                      {showDateDivider && (
                        <div className="flex justify-center my-3">
                          <span className="px-4 py-0.5 rounded-full bg-slate-900/90 border border-slate-800/90 backdrop-blur-md text-[10px] font-semibold text-slate-300 tracking-wider shadow-sm flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            {currentDivider}
                          </span>
                        </div>
                      )}

                      <ChatMessageBubble
                        message={m}
                        isOutgoing={isOutgoing}
                        isLiteMode={isLiteMode}
                        currentUser={currentUser}
                        canAdminDelete={canAdminDelete}
                        onOpenProfile={openOtherUserProfile}
                        onReply={(msg) => setReplyingToMessage(msg)}
                        onReact={handleReactMessage}
                        onPin={(msg) => setPinnedMessage(msg)}
                        onEdit={(id, currentText) => {
                          setEditingMessageId(id);
                          setEditingMessageText(currentText);
                        }}
                        onDelete={handleDeleteMessage}
                        onVotePoll={handleVotePoll}
                      />
                    </React.Fragment>
                  );
                });
              })()}

              {/* REAL-TIME TYPING INDICATOR */}
              {typingUsers.length > 0 && (
                <div className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-[#0a1526]/90 border border-emerald-500/30 text-xs text-emerald-300 font-medium w-fit my-2 shadow-sm animate-in fade-in duration-200">
                  <span className="flex gap-1 items-center">
                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce" />
                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce [animation-delay:0.18s]" />
                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce [animation-delay:0.36s]" />
                  </span>
                  <span>{typingUsers.join(', ')} {typingUsers.length === 1 ? 'is typing...' : 'are typing...'}</span>
                </div>
              )}
            </div>

            {/* QUOTED REPLY BANNER (WHATSAPP STYLE) */}
            {replyingToMessage && (
              <div className="px-4 py-2 bg-[#091424] border-t border-emerald-500/30 flex items-center justify-between text-xs shrink-0 z-20">
                <div className="flex items-center gap-2 truncate">
                  <Reply className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="text-emerald-400 font-bold">
                    Replying to {replyingToMessage.profiles?.username || 'Fan'}:
                  </span>
                  <span className="text-slate-300 truncate italic">
                    "{replyingToMessage.content}"
                  </span>
                </div>
                <button
                  onClick={() => setReplyingToMessage(null)}
                  className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* VOICE NOTE RECORDER CONTAINER (RECORD, PREVIEW, SEND) */}
            <VoiceNoteRecorder
              isOpen={isVoiceRecorderOpen}
              onClose={() => setIsVoiceRecorderOpen(false)}
              onSendVoiceNote={handleSendVoiceNote}
            />

            {/* FLOATING INPUT BAR SAFE FROM FAB OVERLAP (pr-16 sm:pr-4) */}
            <div className="p-3.5 bg-[#0a1424] border-t border-slate-800 flex items-center gap-2 shrink-0 z-[60] relative">
              <div className="flex-1 flex items-center gap-2 bg-[#060d18] border border-slate-800/90 focus-within:border-emerald-500/50 rounded-2xl px-3.5 py-1.5 pr-16 sm:pr-4 transition-all">
                
                {/* Telegram Poll / Attachment Action */}
                <button
                  onClick={() => setIsPollModalOpen(true)}
                  className="p-1.5 text-slate-400 hover:text-cyan-400 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Create Telegram-style Football Poll"
                >
                  <BarChart2 className="w-4 h-4" />
                </button>

                <input
                  type="text"
                  placeholder="Type message in encrypted stream... (use #match #tactics)"
                  value={chatInputText}
                  onChange={handleInputChange}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  className="w-full bg-transparent text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none py-1"
                />

                {/* Voice Note Recorder Toggle (Record, Preview & Send Voice Notes) */}
                <button
                  onClick={() => setIsVoiceRecorderOpen(!isVoiceRecorderOpen)}
                  className={`p-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                    isVoiceRecorderOpen
                      ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md shadow-emerald-950/50'
                      : 'bg-slate-900 text-emerald-400 border-slate-800 hover:bg-emerald-500/20 hover:border-emerald-500/40'
                  }`}
                  title="Record Voice Note"
                >
                  <Mic className="w-4 h-4" />
                </button>

                <button
                  onClick={handleSendMessage}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs transition-all cursor-pointer shrink-0 shadow-md shadow-emerald-950/40 active:scale-95"
                >
                  Send
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* GROUP SPECS & ROSTER MODAL */}
      <div className={`fixed inset-0 z-[120] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 ${modals.groupAboutModal ? 'flex' : 'hidden'}`}>
        <div className="bg-[#091222] border border-slate-700/80 rounded-3xl w-full max-w-md p-6 space-y-5 shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-xs font-extrabold text-white font-['Orbitron'] uppercase tracking-wider">CHANNEL SPECS & ROSTER</h3>
            <button onClick={() => closeModal('groupAboutModal')} className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>

          {currentOpenGroup && (
            <div className="space-y-4">
              <div className="bg-[#060d18] border border-slate-800 rounded-2xl p-4 space-y-1 shadow-inner">
                <h4 className="text-xs font-bold text-emerald-400">{currentOpenGroup.name}</h4>
                <p className="text-xs text-slate-300 leading-relaxed">{currentOpenGroup.description || 'Public channel for match tactics & discussion.'}</p>
              </div>

              <div className="flex gap-2">
                {isMember(currentOpenGroup, currentUser?.id) ? (
                  <>
                    <button onClick={() => inviteMember(currentOpenGroup.id)} className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700/80 font-bold text-xs text-white transition-colors cursor-pointer">Invite User</button>
                    <button onClick={() => exitGroup(currentOpenGroup.id)} className="flex-1 py-2.5 rounded-xl bg-red-500/15 text-red-400 border border-red-500/30 hover:bg-red-500 hover:text-white font-bold text-xs transition-colors cursor-pointer">Exit Group</button>
                  </>
                ) : (
                  <button onClick={() => joinGroup(currentOpenGroup.id)} className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black text-xs font-['Orbitron'] hover:from-emerald-400 hover:to-teal-400 transition-all shadow-md cursor-pointer">
                    JOIN GROUP
                  </button>
                )}
              </div>

              {isGroupAdmin(currentOpenGroup, currentUser?.id) && (
                <button onClick={() => deleteGroup(currentOpenGroup.id)} className="w-full py-2.5 rounded-xl bg-red-600/20 text-red-400 border border-red-600/40 hover:bg-red-600 hover:text-white font-bold text-xs transition-colors cursor-pointer">
                  DELETE CHANNEL
                </button>
              )}

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">MEMBERS ROSTER ({groupAboutMembers.length})</h4>
                  <button onClick={() => fetchGroupAboutMembers(currentOpenGroup.id)} className="text-[10px] text-emerald-400 hover:underline">Refresh</button>
                </div>
                
                {groupAboutMembers.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-500 bg-[#060d18] rounded-xl border border-slate-850">
                    Loading roster members...
                  </div>
                ) : (
                  <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                    {groupAboutMembers.map(m => (
                      <div key={m.user_id || m.id} className="p-3 bg-[#060d18] border border-slate-800/80 rounded-xl flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <img src={m.profiles?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'} alt="Avatar" className="w-7 h-7 rounded-full object-cover border border-slate-700" />
                          <div>
                            <span className="text-xs font-bold text-white block">{m.profiles?.username || 'Member'}</span>
                            <span className={`text-[9px] font-bold uppercase tracking-wider ${m.role === 'admin' ? 'text-amber-400' : 'text-slate-400'}`}>
                              {m.role || 'member'}
                            </span>
                          </div>
                        </div>

                        {isGroupAdmin(currentOpenGroup, currentUser?.id) && m.user_id !== currentUser?.id && (
                          <div className="flex gap-1.5">
                            {m.role === 'admin' ? (
                              <button onClick={() => demoteAdmin(currentOpenGroup.id, m.user_id)} className="px-2.5 py-1 bg-slate-800 text-[10px] text-slate-300 rounded-lg hover:bg-slate-700 transition-colors cursor-pointer">Demote</button>
                            ) : (
                              <button onClick={() => promoteUser(currentOpenGroup.id, m.user_id)} className="px-2.5 py-1 bg-emerald-500 text-[10px] text-slate-950 font-bold rounded-lg hover:bg-emerald-400 transition-colors cursor-pointer">Promote</button>
                            )}
                            <button onClick={() => suspendMember(currentOpenGroup.id, m.user_id)} className="px-2.5 py-1 bg-red-500/20 text-red-300 border border-red-500/30 text-[10px] rounded-lg hover:bg-red-500 hover:text-white transition-colors cursor-pointer">Suspend</button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* CREATE GROUP MODAL */}
      <div className={`fixed inset-0 z-[120] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 ${modals.createGroupModal ? 'flex' : 'hidden'}`}>
        <div className="bg-[#091222] border border-slate-700/80 rounded-3xl w-full max-w-md p-6 space-y-4 shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-xs font-extrabold text-white font-['Orbitron'] tracking-wider uppercase">CREATE PUBLIC LOUNGE</h3>
            <button onClick={() => closeModal('createGroupModal')} className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-3.5">
            <div>
              <label className="text-[11px] font-bold text-emerald-400 block mb-1 uppercase tracking-wider">CHANNEL NAME</label>
              <input
                type="text"
                placeholder="e.g. Champions League Lounge"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                className="w-full bg-[#060d18] border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-emerald-500/60"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-emerald-400 block mb-1 uppercase tracking-wider">DESCRIPTION</label>
              <textarea
                placeholder="Tactical focus, team discussion guidelines..."
                value={newGroupDesc}
                onChange={(e) => setNewGroupDesc(e.target.value)}
                className="w-full bg-[#060d18] border border-slate-800 rounded-xl p-3 text-xs text-white h-24 focus:outline-none focus:border-emerald-500/60 leading-relaxed"
              />
            </div>
            <button
              onClick={createNewGroupSubmit}
              className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs font-['Orbitron'] rounded-xl shadow-md transition-all cursor-pointer"
            >
              INITIALIZE LOUNGE
            </button>
          </div>
        </div>
      </div>

      {/* EDIT PROFILE MODAL */}
      <div className={`fixed inset-0 z-[120] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 ${modals.editProfileModal ? 'flex' : 'hidden'}`}>
        <div className="bg-[#091222] border border-slate-700/80 rounded-3xl w-full max-w-md p-6 space-y-4 shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-xs font-extrabold text-white font-['Orbitron'] tracking-wider uppercase">EDIT IDENTITY</h3>
            <button onClick={() => closeModal('editProfileModal')} className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-3.5">
            <div>
              <label className="text-[11px] font-bold text-emerald-400 block mb-1 uppercase tracking-wider">USERNAME</label>
              <input type="text" value={editProfileName} onChange={(e) => setEditProfileName(e.target.value)} className="w-full bg-[#060d18] border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-emerald-500/60" />
            </div>
            <div>
              <label className="text-[11px] font-bold text-emerald-400 block mb-1 uppercase tracking-wider">STATUS SIGNAL</label>
              <input type="text" value={editProfileStatus} onChange={(e) => setEditProfileStatus(e.target.value)} className="w-full bg-[#060d18] border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-emerald-500/60" />
            </div>
            <div>
              <label className="text-[11px] font-bold text-emerald-400 block mb-1 uppercase tracking-wider">AVATAR URL</label>
              <input type="text" value={editProfileAvatar} onChange={(e) => setEditProfileAvatar(e.target.value)} className="w-full bg-[#060d18] border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-emerald-500/60" />
            </div>
            <button onClick={saveProfileChanges} className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs font-['Orbitron'] rounded-xl shadow-md transition-all cursor-pointer">
              SAVE CHANGES
            </button>
          </div>
        </div>
      </div>

      {/* NEW DIRECT CHAT MODAL - COMPLETE ROSTER */}
      <div className={`fixed inset-0 z-[120] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 ${modals.newDirectChatModal ? 'flex' : 'hidden'}`}>
        <div className="bg-[#091222] border border-slate-700/80 rounded-3xl w-full max-w-md p-6 space-y-4 shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-xs font-extrabold text-white font-['Orbitron'] tracking-wider uppercase">START DIRECT 1-ON-1 CHAT</h3>
              <p className="text-[10px] text-slate-400">Select any community member to launch end-to-end chat</p>
            </div>
            <button onClick={() => closeModal('newDirectChatModal')} className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {userList.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-xs">
                No users found. Loading members...
              </div>
            ) : (
              userList.map(usr => (
                <div key={usr.id} onClick={() => sendChatRequestPrompt(usr)} className="p-3 bg-[#060d18] hover:bg-slate-800/80 rounded-2xl border border-slate-800/80 flex justify-between items-center cursor-pointer transition-colors">
                  <div className="flex items-center gap-3">
                    <img src={usr.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'} alt="Avatar" className="w-9 h-9 rounded-full object-cover border border-slate-700" />
                    <div>
                      <span className="text-xs font-bold text-white block">{usr.username || usr.name || 'Member'}</span>
                      <span className="text-[10px] text-slate-400 line-clamp-1">{usr.status_message || usr.favorite_club || 'Available'}</span>
                    </div>
                  </div>
                  <span className="text-[11px] text-emerald-400 font-bold">Start Chat →</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* PENDING APPROVALS DRAWER MODAL */}
      <div className={`fixed inset-0 z-[120] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 ${modals.pendingApprovalsModal ? 'flex' : 'hidden'}`}>
        <div className="bg-[#091222] border border-slate-700/80 rounded-3xl w-full max-w-md p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-xs font-extrabold text-white font-['Orbitron'] tracking-wider uppercase">PENDING LOUNGE APPROVALS</h3>
            <button onClick={() => closeModal('pendingApprovalsModal')} className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
            {groupsData.filter(g => !g.is_approved).length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">No lounges currently awaiting approval.</p>
            ) : (
              groupsData.filter(g => !g.is_approved).map(g => (
                <div key={g.id} className="p-3 bg-[#060d18] rounded-2xl border border-slate-800/80 flex justify-between items-center transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400 font-bold text-xs">
                      {g.name ? g.name.substring(0, 2).toUpperCase() : 'FC'}
                    </div>
                    <div>
                      <span className="text-xs font-bold text-white block">{g.name}</span>
                      <span className="text-[10px] text-slate-400 line-clamp-1">{g.description || 'No description'}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => approveGroup(g.id)}
                    className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-[10px] font-black rounded-lg transition-colors cursor-pointer"
                  >
                    APPROVE
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* DEDICATED REQUEST TO JOIN / JOIN GUARD MODAL */}
      {modals.requestToJoinModal && targetJoinGroup && (
        <div className="fixed inset-0 z-[200] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="bg-[#091222] border border-emerald-500/40 rounded-3xl w-full max-w-md p-6 space-y-5 shadow-2xl relative overflow-hidden">
            {/* Ambient Corner Glow */}
            <div className="absolute -top-16 -right-16 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-emerald-400">
                <Shield className="w-4 h-4" />
                <h3 className="text-xs font-black font-['Orbitron'] tracking-wider uppercase">JOIN GUARD • MEMBERSHIP REQUIRED</h3>
              </div>
              <button onClick={() => closeModal('requestToJoinModal')} className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Target Group Info Card */}
            <div className="bg-[#050b14] border border-slate-800/90 rounded-2xl p-4.5 space-y-3">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-slate-950 font-black text-sm font-['Orbitron'] shadow-md shadow-emerald-950/50">
                  {targetJoinGroup.name ? targetJoinGroup.name.substring(0, 2).toUpperCase() : 'FC'}
                </div>
                <div>
                  <h4 className="text-sm font-extrabold text-white font-['Orbitron']">{targetJoinGroup.name}</h4>
                  <div className="flex items-center gap-2 text-[11px] text-emerald-400 font-medium mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>{targetJoinGroup.group_members?.length || 1} Registered Members</span>
                  </div>
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed bg-[#08111e] p-3 rounded-xl border border-slate-800/80">
                {targetJoinGroup.description || 'Exclusive community football lounge for match discussions, tactics, and telemetry.'}
              </p>
            </div>

            {/* Security Notice */}
            <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-300 text-[11px] leading-relaxed">
              <Lock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>You must join this lounge to unlock encrypted messages and participate in community tactical feeds.</span>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2.5 pt-1">
              <button
                onClick={() => closeModal('requestToJoinModal')}
                className="flex-1 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors cursor-pointer border border-slate-700/80"
              >
                Cancel
              </button>
              <button
                onClick={() => handleJoinFromModal(targetJoinGroup.id)}
                disabled={isJoining}
                className="flex-2 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs font-['Orbitron'] transition-all shadow-md shadow-emerald-950/50 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                {isJoining ? (
                  <span>JOINING LOUNGE...</span>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>JOIN & ENTER LOUNGE</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CUSTOM PROMPT INTERACTIVE OVERLAY */}
      {customPrompt && (
        <div className="fixed inset-0 z-[350] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#091222] border border-slate-700/80 rounded-3xl w-full max-w-sm p-6 space-y-3.5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="text-xs font-bold font-['Orbitron']" style={{ color: customPrompt.titleColor || '#10b981' }}>{customPrompt.title}</h3>
              <button onClick={() => setCustomPrompt(null)} className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2.5">
              {customPrompt.message && <p className="text-xs text-slate-300 leading-relaxed">{customPrompt.message}</p>}
              
              {customPrompt.type === 'input' && (
                <input type="text" id="customPromptInput" placeholder={customPrompt.placeholder || ''} defaultValue={customPrompt.defaultValue || ''} className="w-full p-2.5 rounded-xl bg-[#060d18] border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500" />
              )}

              {customPrompt.type === 'number' && (
                <input type="number" id="customPromptInput" defaultValue={customPrompt.defaultValue || '24'} className="w-full p-2.5 rounded-xl bg-[#060d18] border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500" />
              )}

              {customPrompt.type === 'textarea' && (
                <textarea id="customPromptInput" defaultValue={customPrompt.defaultValue || ''} className="w-full p-2.5 rounded-xl bg-[#060d18] border border-slate-800 text-xs text-white h-20 focus:outline-none focus:border-emerald-500" />
              )}

              <div className="flex gap-2 pt-2">
                <button className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700/80 text-xs font-bold text-slate-300 transition-colors cursor-pointer" onClick={() => setCustomPrompt(null)}>Cancel</button>
                <button
                  className={`flex-1 py-2.5 rounded-xl font-bold text-xs transition-colors shadow-sm cursor-pointer ${customPrompt.confirmBg || 'bg-emerald-500 text-slate-950 hover:bg-emerald-400'}`}
                  onClick={() => {
                    const inputEl = document.getElementById('customPromptInput') as HTMLInputElement | HTMLTextAreaElement | null;
                    const val = inputEl ? inputEl.value : null;
                    customPrompt.onConfirm(val);
                  }}
                >
                  {customPrompt.confirmText || 'Confirm'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* WALLPAPER PICKER MODAL */}
      <WallpaperPickerModal
        isOpen={isWallpaperModalOpen}
        onClose={() => setIsWallpaperModalOpen(false)}
        currentWallpaper={activeWallpaper}
        onSelectWallpaper={handleSelectWallpaper}
      />

      {/* CALL SCREEN MODAL (AUDIO & VIDEO DIALING) */}
      <CallScreenModal
        isOpen={callModalState.isOpen}
        onClose={() => setCallModalState(prev => ({ ...prev, isOpen: false }))}
        peer={callModalState.peer}
        callType={callModalState.callType}
        onSendMessage={(peerId) => {
          const peer = userList.find(u => u.id === peerId);
          if (peer) sendChatRequestPrompt(peer);
        }}
      />

      {/* USER PROFILE MODAL (SELF & OTHER USERS) */}
      <OtherUserProfileModal
        isOpen={otherProfileModalState.isOpen}
        onClose={() => setOtherProfileModalState(prev => ({ ...prev, isOpen: false }))}
        profile={otherProfileModalState.profile}
        isCurrentUser={otherProfileModalState.isCurrentUser}
        onDialAudioCall={(p) => handleDialCall(p, 'audio')}
        onDialVideoCall={(p) => handleDialCall(p, 'video')}
        onStartDirectChat={(p) => sendChatRequestPrompt(p)}
        onViewStatus={(st) => {
          const idx = allStatuses.findIndex(s => s.id === st.id);
          setViewStatusIndex(idx >= 0 ? idx : 0);
        }}
        activeStatus={allStatuses.find(s => s.userId === otherProfileModalState.profile?.id)}
        onSaveProfile={async (updatedData) => {
          await supabaseClient.from('profiles').update(updatedData).eq('id', currentUser?.id);
          setCurrentProfile((prev: any) => ({ ...prev, ...updatedData }));
          LocalStore.set('profile', { ...currentProfile, ...updatedData });
        }}
      />

      {/* TELEGRAM POLL CREATOR MODAL */}
      <PollCreatorModal
        isOpen={isPollModalOpen}
        onClose={() => setIsPollModalOpen(false)}
        onCreatePoll={handleCreatePollSubmit}
      />

      {/* STATUS VIEWER MODAL */}
      <StatusViewerModal
        isOpen={viewStatusIndex !== null}
        onClose={() => setViewStatusIndex(null)}
        statuses={allStatuses}
        initialIndex={viewStatusIndex ?? 0}
        currentUserId={currentUser?.id}
      />

      {/* CREATE STATUS MODAL */}
      <CreateStatusModal
        isOpen={isCreateStatusOpen}
        onClose={() => setIsCreateStatusOpen(false)}
        currentUser={currentUser}
        userProfile={currentProfile}
        onStatusCreated={(newStatus) => {
          setAllStatuses(prev => [newStatus, ...prev.filter(s => s.id !== newStatus.id)]);
        }}
      />

    </div>
  );
}
