import React, { useEffect, useRef, useState } from 'react';
import { supabase as supabaseClient } from '../config/supabase.ts';
import FuturisticLoader from '../components/FuturisticLoader.tsx';
import UniversalFAB from '../components/UniversalFAB.tsx';
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
  Compass
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
  const [activeMainView, setActiveMainView] = useState<'chats' | 'userHub' | 'notifications'>('chats');

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
  const [isLoading, setIsLoading] = useState(true);

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

  // Drawers & Modals
  const [isSideNavOpen, setIsSideNavOpen] = useState(false);
  const [modals, setModals] = useState({
    chatRoomModal: false,
    groupAboutModal: false,
    createGroupModal: false,
    editProfileModal: false,
    newDirectChatModal: false,
    pendingApprovalsModal: false
  });

  const [customPrompt, setCustomPrompt] = useState<any>(null);

  // Form Inputs
  const [editProfileName, setEditProfileName] = useState('');
  const [editProfileStatus, setEditProfileStatus] = useState('Online in Lounge');
  const [editProfileAvatar, setEditProfileAvatar] = useState('');
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [selectedNewGroupType, setSelectedNewGroupType] = useState('Public');
  const [groupAboutMembers, setGroupAboutMembers] = useState<any[]>([]);

  // Inline Message Editing State
  const [editingMessageId, setEditingMessageId] = useState<any>(null);
  const [editingMessageText, setEditingMessageText] = useState('');

  // Refs
  const chatMessagesAreaRef = useRef<HTMLDivElement | null>(null);
  const currentOpenGroupRef = useRef(currentOpenGroup);
  const currentOpenDirectPeerRef = useRef(currentOpenDirectPeer);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    currentOpenGroupRef.current = currentOpenGroup;
    currentOpenDirectPeerRef.current = currentOpenDirectPeer;
  }, [currentOpenGroup, currentOpenDirectPeer]);

  const openModal = (modalName: keyof typeof modals) => setModals(prev => ({ ...prev, [modalName]: true }));
  const closeModal = (modalName: keyof typeof modals) => setModals(prev => ({ ...prev, [modalName]: false }));

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

  // Real-time Message Subscription & Sync Integration
  useEffect(() => {
    if (!currentUser) return;

    const channel = supabaseClient
      .channel('messages_realtime_channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, async (payload) => {
        const { eventType, new: newMsg, old: oldMsg } = payload;

        if (eventType === 'INSERT') {
          // Check if message is for the currently open group
          const isCurrentGroup = currentOpenGroupRef.current && newMsg.group_id === currentOpenGroupRef.current.id;
          // Check if message is for the currently open direct chat
          const isCurrentDirect = currentOpenDirectPeerRef.current && 
            ((newMsg.sender_id === currentUser.id && newMsg.recipient_id === currentOpenDirectPeerRef.current.id) ||
             (newMsg.sender_id === currentOpenDirectPeerRef.current.id && newMsg.recipient_id === currentUser.id));

          if (isCurrentGroup || isCurrentDirect) {
            // Fetch sender profile details to keep display consistent with avatar & username
            const { data: senderProfile } = await supabaseClient
              .from('profiles')
              .select('username, avatar_url')
              .eq('id', newMsg.sender_id)
              .single();

            const messageWithProfile = {
              ...newMsg,
              profiles: senderProfile || null
            };

            setMessages((prev) => {
              if (prev.some((m) => m.id === newMsg.id)) return prev;
              const updated = [...prev, messageWithProfile];
              // Update cache
              if (isCurrentGroup) {
                LocalStore.set('messages_' + currentOpenGroupRef.current.id, updated);
              } else {
                const cacheKey = 'messages_direct_' + [currentUser.id, currentOpenDirectPeerRef.current.id].sort().join('_');
                LocalStore.set(cacheKey, updated);
              }
              return updated;
            });
            scrollToBottom();

            // Play sound if sender is someone else
            if (newMsg.sender_id !== currentUser.id) {
              playNotificationSound();
            }
          } else {
            // Message is for another room (un-focused)
            if (newMsg.sender_id !== currentUser.id) {
              playNotificationSound();
              
              // Increment unread counts
              const targetId = newMsg.group_id || newMsg.sender_id;
              if (targetId) {
                setUnreadCounts((prev) => {
                  const updated = { ...prev, [targetId]: (prev[targetId] || 0) + 1 };
                  LocalStore.set('unread', updated);
                  return updated;
                });

                // Add a local notification
                const { data: senderProfile } = await supabaseClient
                  .from('profiles')
                  .select('username')
                  .eq('id', newMsg.sender_id)
                  .single();
                
                const senderName = senderProfile?.username || 'Someone';
                addLocalNotification(
                  `New Message from ${senderName}`,
                  newMsg.content || 'Sent an attachment'
                );
              }
            }
          }
        } else if (eventType === 'UPDATE') {
          setMessages((prev) =>
            prev.map((m) => (m.id === newMsg.id ? { ...m, ...newMsg } : m))
          );
        } else if (eventType === 'DELETE') {
          setMessages((prev) => prev.filter((m) => m.id !== oldMsg.id));
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
     INITIALIZATION & REAL-TIME SYNC
     ============================================================ */
  useEffect(() => {
    setIsLoading(true);
    loadCachedState();
    verifySessionAndInitialize().finally(() => {
      setTimeout(() => setIsLoading(false), 500);
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

      if (activeGrp && chatTypeMode === 'groups') {
        const { data } = await supabaseClient
          .from('messages')
          .select(`*, profiles:sender_id (username, avatar_url)`)
          .eq('group_id', activeGrp.id)
          .order('created_at', { ascending: true });

        if (data) {
          setMessages(data);
          LocalStore.set('messages_' + activeGrp.id, data);
        }
      } else if (activePeer && chatTypeMode === 'direct') {
        fetchDirectMessages(activePeer.id);
      }

      const { data: groupsList } = await supabaseClient
        .from('chat_groups')
        .select(`*, group_members (user_id, role, is_suspended, suspended_until)`)
        .order('created_at', { ascending: false });

      if (groupsList) setGroupsData(groupsList);
    } catch (err) {}
  }

  function loadCachedState() {
    const arch = LocalStore.get('archived_groups') || [];
    const unread = LocalStore.get('unread') || {};
    const notifs = LocalStore.get('notifications') || [];
    setArchivedGroupIds(arch);
    setUnreadCounts(unread);
    setNotifications(notifs);

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
        await fetchUsersList();
      }
    } catch (err) {}
  }

  async function fetchOrCreateProfile(userObj: any) {
    if (!userObj) return;
    let { data: profile } = await supabaseClient.from('profiles').select('*').eq('id', userObj.id).single();

    if (!profile) {
      let fallbackName = userObj.email ? userObj.email.split('@')[0] : 'User_' + userObj.id.substring(0, 5);
      const { data: newProfile } = await supabaseClient
        .from('profiles')
        .insert([{ id: userObj.id, username: fallbackName }])
        .select()
        .single();
      profile = newProfile;
    }

    const finalProfile = profile || {
      id: userObj.id,
      username: userObj.email ? userObj.email.split('@')[0] : 'User',
      avatar_url: '',
      status_message: 'Online in Lounge',
      is_global_admin: false
    };

    setCurrentProfile(finalProfile);
    setEditProfileName(finalProfile.username || '');
    LocalStore.set('profile', finalProfile);
  }

  async function fetchGroups() {
    const { data } = await supabaseClient
      .from('chat_groups')
      .select(`*, group_members (user_id, role, is_suspended, suspended_until)`)
      .order('created_at', { ascending: false });

    if (data) {
      setGroupsData(data);
      LocalStore.set('groups', data);
    }
  }

  async function fetchUsersList() {
    const { data } = await supabaseClient
      .from('profiles')
      .select('*')
      .neq('id', currentUser?.id || '')
      .limit(30);

    if (data) setUserList(data);
  }

  /* ============================================================
     SELECTION & CHAT ACTIONS
     ============================================================ */
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
    setCurrentOpenGroup(group);
    setCurrentOpenDirectPeer(null);
    setChatTypeMode('groups');

    setUnreadCounts(prev => {
      const updated = { ...prev, [groupId]: 0 };
      LocalStore.set('unread', updated);
      return updated;
    });

    await fetchGroupMessages(group.id);
    await fetchGroupAboutMembers(group.id);
    openModal('chatRoomModal');
  }

  async function openDirectChatWithUser(peerUser: any) {
    setCurrentOpenDirectPeer(peerUser);
    setCurrentOpenGroup(null);
    setChatTypeMode('direct');
    closeModal('newDirectChatModal');

    await fetchDirectMessages(peerUser.id);
    openModal('chatRoomModal');
  }

  async function fetchGroupMessages(groupId: string) {
    const cached = LocalStore.get('messages_' + groupId);
    if (cached) {
      setMessages(cached);
      scrollToBottom();
    }

    const { data } = await supabaseClient
      .from('messages')
      .select(`*, profiles:sender_id (username, avatar_url)`)
      .eq('group_id', groupId)
      .order('created_at', { ascending: true });

    if (data) {
      setMessages(data);
      LocalStore.set('messages_' + groupId, data);
      scrollToBottom();
    }
  }

  async function fetchDirectMessages(peerId: string) {
    if (!currentUser) return;
    const cacheKey = 'messages_direct_' + [currentUser.id, peerId].sort().join('_');
    const cached = LocalStore.get(cacheKey);
    if (cached) {
      setMessages(cached);
      scrollToBottom();
    }

    const { data } = await supabaseClient
      .from('messages')
      .select(`*, profiles:sender_id (username, avatar_url)`)
      .or(`and(sender_id.eq.${currentUser.id},recipient_id.eq.${peerId}),and(sender_id.eq.${peerId},recipient_id.eq.${currentUser.id})`)
      .order('created_at', { ascending: true });

    if (data) {
      setMessages(data);
      LocalStore.set(cacheKey, data);
      scrollToBottom();
    }
  }

  async function fetchGroupAboutMembers(groupId: string) {
    const { data } = await supabaseClient
      .from('group_members')
      .select(`*, profiles:user_id (username, avatar_url)`)
      .eq('group_id', groupId);

    if (data) setGroupAboutMembers(data);
  }

  const scrollToBottom = () => {
    setTimeout(() => {
      if (chatMessagesAreaRef.current) {
        chatMessagesAreaRef.current.scrollTop = chatMessagesAreaRef.current.scrollHeight;
      }
    }, 50);
  };

  /* ============================================================
     SEND, EDIT & DELETE MESSAGES
     ============================================================ */
  async function handleSendMessage() {
    const content = chatInputText.trim();
    if (!content || !currentUser) return;

    // Reset typing indicator state
    if (presenceChannelRef.current) {
      presenceChannelRef.current.track({
        username: currentProfile?.username || 'User',
        isTyping: false
      });
    }

    if (chatTypeMode === 'direct' && currentOpenDirectPeer) {
      const newMsg = {
        id: Date.now(),
        sender_id: currentUser.id,
        recipient_id: currentOpenDirectPeer.id,
        content,
        created_at: new Date().toISOString(),
        profiles: { username: currentProfile?.username || 'You', avatar_url: currentProfile?.avatar_url || '' }
      };

      setMessages(prev => [...prev, newMsg]);
      setChatInputText('');
      scrollToBottom();

      await supabaseClient.from('messages').insert([{
        sender_id: currentUser.id,
        recipient_id: currentOpenDirectPeer.id,
        content,
        message_type: 'direct'
      }]);

      fetchDirectMessages(currentOpenDirectPeer.id);
    } else if (chatTypeMode === 'groups' && currentOpenGroup) {
      const newMsg = {
        id: Date.now(),
        group_id: currentOpenGroup.id,
        sender_id: currentUser.id,
        content,
        created_at: new Date().toISOString(),
        profiles: { username: currentProfile?.username || 'You', avatar_url: currentProfile?.avatar_url || '' }
      };

      setMessages(prev => [...prev, newMsg]);
      setChatInputText('');
      scrollToBottom();

      await supabaseClient.from('messages').insert([{
        group_id: currentOpenGroup.id,
        sender_id: currentUser.id,
        content,
        message_type: 'group'
      }]);

      fetchGroupMessages(currentOpenGroup.id);
    }
  }

  async function handleDeleteMessage(msgId: number | string) {
    setMessages(prev => prev.filter(m => m.id !== msgId));
    await supabaseClient.from('messages').delete().eq('id', msgId);
  }

  async function handleSaveEditMessage(msgId: number | string) {
    if (!editingMessageText.trim()) return;
    setMessages(prev =>
      prev.map(m => (m.id === msgId ? { ...m, content: editingMessageText.trim(), is_edited: true } : m))
    );

    setEditingMessageId(null);
    setEditingMessageText('');

    await supabaseClient
      .from('messages')
      .update({ content: editingMessageText.trim(), is_edited: true })
      .eq('id', msgId);
  }

  /* ============================================================
     ADMIN & ROSTER ACTIONS
     ============================================================ */
  function isMember(group: any, userId: string) {
    return group?.group_members?.some((m: any) => m.user_id === userId);
  }

  function isGroupAdmin(group: any, userId: string) {
    if (currentProfile?.is_global_admin) return true;
    const m = group?.group_members?.find((x: any) => x.user_id === userId);
    return m?.role === 'admin';
  }

  async function joinGroup(groupId: string) {
    if (!currentUser) return;
    await supabaseClient.from('group_members').insert([{ group_id: groupId, user_id: currentUser.id, role: 'member' }]);
    closeModal('groupAboutModal');
    fetchGroups();
  }

  async function exitGroup(groupId: string) {
    if (!currentUser) return;
    await supabaseClient.from('group_members').delete().eq('group_id', groupId).eq('user_id', currentUser.id);
    closeModal('groupAboutModal');
    closeModal('chatRoomModal');
    fetchGroups();
  }

  async function deleteGroup(groupId: string) {
    await supabaseClient.from('chat_groups').delete().eq('id', groupId);
    closeModal('groupAboutModal');
    closeModal('chatRoomModal');
    fetchGroups();
  }

  async function promoteUser(groupId: string, userId: string) {
    await supabaseClient.from('group_members').update({ role: 'admin' }).eq('group_id', groupId).eq('user_id', userId);
    addLocalNotification("ADMIN ELEVATION", "User elevated to ADMIN.");
    fetchGroupAboutMembers(groupId);
  }

  async function demoteAdmin(groupId: string, userId: string) {
    await supabaseClient.from('group_members').update({ role: 'member' }).eq('group_id', groupId).eq('user_id', userId);
    addLocalNotification("ADMIN DEMOTION", "ADMIN clearance adjusted to MEMBER.");
    fetchGroupAboutMembers(groupId);
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
      confirmText: 'INVITE',
      confirmBg: 'bg-emerald-500',
      confirmColor: '#000',
      onConfirm: (target: string) => {
        if (target && target.trim() !== "") {
          const inviteLink = `${window.location.origin}${window.location.pathname}?group=${groupId}`;
          addLocalNotification("INVITATION DISPATCHED", `Invite link created for ${groupName}.`);
          alert(`Invite URL generated:\n${inviteLink}`);
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
      message: 'Set suspension duration in hours:',
      defaultValue: '24',
      confirmText: 'Suspend User',
      confirmBg: 'bg-red-600',
      confirmColor: '#fff',
      onConfirm: async (duration: number) => {
        if (duration) {
          const suspendedUntil = new Date(Date.now() + duration * 3600 * 1000).toISOString();
          await supabaseClient
            .from('group_members')
            .update({ is_suspended: true, suspended_until: suspendedUntil })
            .eq('group_id', groupId)
            .eq('user_id', userId);

          addLocalNotification("MEMBER SUSPENDED", `User suspended for ${duration} hours.`);
          fetchGroupAboutMembers(groupId);
        }
        setCustomPrompt(null);
      }
    });
  }

  function sendChatRequestPrompt(targetUser: any) {
    if (!currentUser) return;
    if (targetUser.id === currentUser.id) {
      addLocalNotification("ACTION DENIED", "You cannot initiate a direct chat with yourself.");
      return;
    }

    setCustomPrompt({
      type: 'input',
      title: 'INITIALIZE ENCRYPTED CHAT',
      titleColor: '#3b82f6',
      message: `Do you want to establish an end-to-end encrypted direct chat feed with ${targetUser.username}? Enter an optional invitation message:`,
      placeholder: "Hello, let's synchronize our notes...",
      confirmText: 'ESTABLISH FEED',
      confirmBg: 'bg-blue-600 hover:bg-blue-500',
      confirmColor: '#fff',
      onConfirm: async (messageText: string) => {
        if (messageText && messageText.trim() !== '') {
          await supabaseClient.from('messages').insert([{
            sender_id: currentUser.id,
            recipient_id: targetUser.id,
            content: `[DIRECT FEED REQUEST] ${messageText.trim()}`,
            message_type: 'direct'
          }]);
        }
        
        addLocalNotification("SECURE FEED INITIATED", `Secure 1-on-1 direct channel request confirmed with ${targetUser.username}.`);
        setCustomPrompt(null);
        openDirectChatWithUser(targetUser);
      }
    });
  }

  async function approveGroup(groupId: string) {
    const { error } = await supabaseClient
      .from('chat_groups')
      .update({ is_approved: true })
      .eq('id', groupId);

    if (!error) {
      addLocalNotification("LOUNGE APPROVED", "The lounge has been successfully activated.");
      fetchGroups();
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

  // Helper variable for message rendering date divider comparison
  let lastDateDivider = '';

  return (
    <div className="min-h-screen bg-[#060b14] bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(16,185,129,0.06),rgba(0,0,0,0))] text-slate-100 font-['Rajdhani',sans-serif] flex flex-col relative overflow-x-hidden">
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
      <header className="h-16 bg-[#08111e]/90 backdrop-blur-xl border-b border-slate-800/80 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-lg shadow-black/30">
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

        <div className="flex items-center gap-3">
          <button
            onClick={() => openModal('editProfileModal')}
            className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-emerald-500/40 transition-all cursor-pointer shadow-sm"
          >
            <img src={currentAvatar} alt="Profile" className="w-6 h-6 rounded-full object-cover border border-emerald-400" />
            <span className="text-xs font-bold text-slate-200 hidden sm:inline">{currentProfile?.username || 'Profile'}</span>
          </button>
        </div>
      </header>

      {/* PAGE BODY WORKSPACE */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6 w-full flex-1">

        {/* VIEW 1: CHATS LIST & DIRECT MESSAGES */}
        {activeMainView === 'chats' && (
          <div className="space-y-6 animate-in fade-in-50 duration-300">

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
                  onClick={() => setChatTypeMode('direct')}
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
                  onClick={() => openModal(chatTypeMode === 'groups' ? 'createGroupModal' : 'newDirectChatModal')}
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

                    const matchesSearch = g.name.toLowerCase().includes(searchQuery.toLowerCase());
                    if (currentTabFilter === 'my_groups') return matchesSearch && isMember(g, currentUser?.id);
                    if (currentTabFilter === 'archived') return matchesSearch && archivedGroupIds.includes(g.id);
                    return matchesSearch && !archivedGroupIds.includes(g.id);
                  })
                  .map(g => {
                    const joined = isMember(g, currentUser?.id);
                    const memberCount = g.group_members?.length || 1;
                    return (
                      <div
                        key={g.id}
                        onClick={() => openChatRoom(g.id)}
                        className="group bg-gradient-to-b from-[#0e182a] to-[#0a1221] border border-slate-800/90 hover:border-emerald-500/40 rounded-2xl p-5 flex items-center justify-between cursor-pointer transition-all duration-200 hover:-translate-y-0.5 shadow-xl shadow-black/40 hover:shadow-emerald-950/20"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-slate-950 font-black text-sm font-['Orbitron'] shadow-md shadow-emerald-950/50 group-hover:scale-105 transition-transform">
                            {g.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-white tracking-wide group-hover:text-emerald-300 transition-colors">
                              {g.name}
                            </h4>
                            <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">{g.description || 'Public Discussion Channel'}</p>
                            
                            {/* Clean unboxed metadata with subtle separator */}
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
                              JOINED
                            </span>
                          ) : (
                            <span className="px-3 py-1.5 rounded-xl bg-slate-800/80 group-hover:bg-emerald-500 group-hover:text-slate-950 text-slate-300 text-[10px] font-extrabold uppercase tracking-wider transition-colors border border-slate-700/60">
                              ENTER
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {userList
                  .filter(u => u.username?.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map(usr => (
                    <div
                      key={usr.id}
                      onClick={() => sendChatRequestPrompt(usr)}
                      className="group bg-gradient-to-b from-[#0e182a] to-[#0a1221] border border-slate-800/90 hover:border-emerald-500/40 rounded-2xl p-4.5 flex items-center justify-between cursor-pointer transition-all duration-200 hover:-translate-y-0.5 shadow-xl shadow-black/40 hover:shadow-emerald-950/20"
                    >
                      <div className="flex items-center gap-3.5">
                        <div className="relative w-11 h-11 rounded-full border-2 border-emerald-500/40 overflow-hidden shadow-md group-hover:border-emerald-400 transition-colors shrink-0">
                          <img
                            src={usr.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                            alt={usr.username}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-white group-hover:text-emerald-300 transition-colors">{usr.username}</h4>
                          <p className="text-[11px] text-slate-400 line-clamp-1">{usr.status_message || 'Available on Hub'}</p>
                          <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-semibold mt-0.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            <span>Online</span>
                          </div>
                        </div>
                      </div>

                      <button className="px-3.5 py-1.5 rounded-xl bg-slate-800/90 group-hover:bg-emerald-500 text-slate-200 group-hover:text-slate-950 font-bold text-xs transition-colors border border-slate-700/60 shadow-sm">
                        Chat 💬
                      </button>
                    </div>
                  ))}
              </div>
            )}

          </div>
        )}

        {/* VIEW 2: USER PROFILE HUB */}
        {activeMainView === 'userHub' && (
          <div className="space-y-4 animate-in fade-in-50 duration-300">
            <div className="bg-gradient-to-b from-[#0e182a] to-[#0a1221] border border-slate-800/90 rounded-2xl p-6 sm:p-7 flex flex-col sm:flex-row items-center justify-between gap-5 shadow-2xl shadow-black/50">
              <div className="flex items-center gap-5">
                <div className="relative w-16 h-16 rounded-full border-2 border-emerald-400 overflow-hidden shadow-lg shadow-emerald-950/40">
                  <img src={currentAvatar} alt="Avatar" className="w-full h-full object-cover" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white font-['Orbitron']">{currentProfile?.username || 'User'}</h3>
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
                className="px-3 py-1.5 rounded-xl bg-red-500/15 text-red-400 border border-red-500/30 text-xs font-bold hover:bg-red-500 hover:text-white transition-colors"
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

      {/* CHAT ROOM MODAL (WITH WHATSAPP DATE DIVIDERS & PRESENCE TYPING INDICATORS) */}
      {modals.chatRoomModal && (currentOpenGroup || currentOpenDirectPeer) && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="bg-[#081220] border border-slate-700/70 rounded-3xl w-full max-w-4xl h-[88vh] flex flex-col overflow-hidden shadow-2xl shadow-black/80 relative">
            
            {/* Header */}
            <div className="h-16 px-5 bg-[#0a1424] border-b border-slate-800 flex items-center justify-between shrink-0 shadow-md">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center font-black text-slate-950 font-['Orbitron'] shadow-sm">
                  {chatTypeMode === 'groups' ? currentOpenGroup?.name?.substring(0, 2).toUpperCase() : currentOpenDirectPeer?.username?.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-white font-['Orbitron']">
                    {chatTypeMode === 'groups' ? currentOpenGroup?.name : currentOpenDirectPeer?.username}
                  </h3>
                  <p className="text-[11px] text-emerald-400 font-medium flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    {chatTypeMode === 'groups' ? 'Encrypted Group Channel' : 'End-to-End Direct Chat'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {chatTypeMode === 'groups' && (
                  <button
                    onClick={() => openGroupAbout(currentOpenGroup.id)}
                    className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-emerald-400 text-xs font-bold transition-colors cursor-pointer border border-slate-700/60"
                    title="Specs & Roster"
                  >
                    <Info className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => closeModal('chatRoomModal')}
                  className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Messages Feed */}
            <div ref={chatMessagesAreaRef} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5 bg-[#050b14]">
              {(() => {
                lastDateDivider = '';
                return messages.map((m, idx) => {
                  const isOutgoing = m.sender_id === currentUser?.id;
                  const canAdminDelete = isGroupAdmin(currentOpenGroup, currentUser?.id);
                  const isEditing = editingMessageId === m.id;

                  // WhatsApp style date divider evaluation
                  const currentDivider = getWhatsAppDateDivider(m.created_at);
                  const showDateDivider = currentDivider !== lastDateDivider;
                  if (showDateDivider) {
                    lastDateDivider = currentDivider;
                  }

                  return (
                    <React.Fragment key={m.id || idx}>
                      {showDateDivider && (
                        <div className="flex justify-center my-3.5">
                          <span className="px-4 py-1 rounded-full bg-slate-900/90 border border-slate-800/90 backdrop-blur-md text-[11px] font-semibold text-slate-300 tracking-wider shadow-sm flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            {currentDivider}
                          </span>
                        </div>
                      )}

                      <div
                        className={`group max-w-[85%] sm:max-w-[72%] p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed transition-all shadow-md ${
                          isOutgoing
                            ? 'ml-auto bg-gradient-to-r from-emerald-600 to-teal-700 text-white rounded-br-xs border border-emerald-400/20'
                            : 'mr-auto bg-[#0d1728] border border-slate-800/90 text-slate-200 rounded-bl-xs'
                        }`}
                      >
                        {!isOutgoing && (
                          <div 
                            onClick={() => {
                              if (m.sender_id) {
                                sendChatRequestPrompt({
                                  id: m.sender_id,
                                  username: m.profiles?.username || 'User',
                                  avatar_url: m.profiles?.avatar_url || ''
                                });
                              }
                            }}
                            className="text-[11px] font-bold text-emerald-400 mb-1 cursor-pointer hover:underline"
                          >
                            {m.profiles?.username || 'User'}
                          </div>
                        )}

                        {isEditing ? (
                          <div className="space-y-2">
                            <input
                              type="text"
                              value={editingMessageText}
                              onChange={(e) => setEditingMessageText(e.target.value)}
                              className="w-full bg-slate-950 border border-emerald-400 rounded-xl p-2 text-xs text-white focus:outline-none"
                            />
                            <div className="flex gap-2 justify-end">
                              <button onClick={() => setEditingMessageId(null)} className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-[10px] font-bold rounded-lg transition-colors">Cancel</button>
                              <button onClick={() => handleSaveEditMessage(m.id)} className="px-3 py-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-[10px] rounded-lg transition-colors">Save</button>
                            </div>
                          </div>
                        ) : (
                          <div>{m.content}</div>
                        )}

                        <div className="flex items-center justify-between gap-3 text-[10px] text-slate-400 mt-1.5 pt-1 border-t border-white/10">
                          <span>
                            {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            {m.is_edited ? ' (edited)' : ''}
                          </span>

                          {(isOutgoing || canAdminDelete) && !isEditing && (
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5">
                              {isOutgoing && (
                                <button
                                  onClick={() => {
                                    setEditingMessageId(m.id);
                                    setEditingMessageText(m.content);
                                  }}
                                  className="px-2 py-0.5 rounded-md bg-slate-800/90 hover:bg-slate-700 text-slate-200 text-[10px] font-semibold flex items-center gap-1 border border-slate-700 shadow-sm transition-colors cursor-pointer"
                                >
                                  <Edit3 className="w-3 h-3 text-emerald-400" />
                                  <span>Edit</span>
                                </button>
                              )}
                              <button
                                onClick={() => handleDeleteMessage(m.id)}
                                className="px-2 py-0.5 rounded-md bg-red-950/50 hover:bg-red-900/60 text-red-300 text-[10px] font-semibold flex items-center gap-1 border border-red-800/50 shadow-sm transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3 h-3 text-red-400" />
                                <span>Delete</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </React.Fragment>
                  );
                });
              })()}

              {/* REAL-TIME TYPING INDICATOR */}
              {typingUsers.length > 0 && (
                <div className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-[#0a1526] border border-emerald-500/30 text-xs text-emerald-300 font-medium w-fit my-2 shadow-sm animate-in fade-in duration-200">
                  <span className="flex gap-1 items-center">
                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce" />
                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce [animation-delay:0.18s]" />
                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce [animation-delay:0.36s]" />
                  </span>
                  <span>{typingUsers.join(', ')} {typingUsers.length === 1 ? 'is typing...' : 'are typing...'}</span>
                </div>
              )}
            </div>

            {/* FLOATING INPUT BAR SAFE FROM FAB OVERLAP (pr-16 sm:pr-4) */}
            <div className="p-3.5 bg-[#0a1424] border-t border-slate-800 flex items-center gap-2 shrink-0 z-[60] relative">
              <div className="flex-1 flex items-center gap-2 bg-[#060d18] border border-slate-800/90 focus-within:border-emerald-500/50 rounded-2xl px-4 py-2 pr-16 sm:pr-4 transition-all">
                <input
                  type="text"
                  placeholder="Type message in encrypted stream..."
                  value={chatInputText}
                  onChange={handleInputChange}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  className="w-full bg-transparent text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none py-1"
                />

                <button
                  onClick={toggleVoiceTyping}
                  className={`p-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                    isListening ? 'bg-red-500/20 text-red-400 border-red-500 animate-pulse shadow-md shadow-red-950/50' : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                  }`}
                  title="Voice Input"
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
            <button onClick={() => closeModal('groupAboutModal')} className="text-slate-400 hover:text-white p-1 rounded-lg">
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
                    <button onClick={() => inviteMember(currentOpenGroup.id)} className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700/80 font-bold text-xs text-white transition-colors">Invite User</button>
                    <button onClick={() => exitGroup(currentOpenGroup.id)} className="flex-1 py-2.5 rounded-xl bg-red-500/15 text-red-400 border border-red-500/30 hover:bg-red-500 hover:text-white font-bold text-xs transition-colors">Exit Group</button>
                  </>
                ) : (
                  <button onClick={() => joinGroup(currentOpenGroup.id)} className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black text-xs font-['Orbitron'] hover:from-emerald-400 hover:to-teal-400 transition-all shadow-md">
                    JOIN GROUP
                  </button>
                )}
              </div>

              {isGroupAdmin(currentOpenGroup, currentUser?.id) && (
                <button onClick={() => deleteGroup(currentOpenGroup.id)} className="w-full py-2.5 rounded-xl bg-red-600/20 text-red-400 border border-red-600/40 hover:bg-red-600 hover:text-white font-bold text-xs transition-colors">
                  DELETE CHANNEL
                </button>
              )}

              <div className="space-y-2">
                <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">MEMBERS ROSTER ({groupAboutMembers.length})</h4>
                <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                  {groupAboutMembers.map(m => (
                    <div key={m.user_id} className="p-3 bg-[#060d18] border border-slate-800/80 rounded-xl flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <img src={m.profiles?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'} alt="Avatar" className="w-7 h-7 rounded-full object-cover border border-slate-700" />
                        <div>
                          <span className="text-xs font-bold text-white block">{m.profiles?.username || 'User'}</span>
                          <span className={`text-[9px] font-bold uppercase tracking-wider ${m.role === 'admin' ? 'text-amber-400' : 'text-slate-400'}`}>
                            {m.role}
                          </span>
                        </div>
                      </div>

                      {isGroupAdmin(currentOpenGroup, currentUser?.id) && m.user_id !== currentUser?.id && (
                        <div className="flex gap-1.5">
                          {m.role === 'admin' ? (
                            <button onClick={() => demoteAdmin(currentOpenGroup.id, m.user_id)} className="px-2.5 py-1 bg-slate-800 text-[10px] text-slate-300 rounded-lg hover:bg-slate-700 transition-colors">Demote</button>
                          ) : (
                            <button onClick={() => promoteUser(currentOpenGroup.id, m.user_id)} className="px-2.5 py-1 bg-emerald-500 text-[10px] text-slate-950 font-bold rounded-lg hover:bg-emerald-400 transition-colors">Promote</button>
                          )}
                          <button onClick={() => suspendMember(currentOpenGroup.id, m.user_id)} className="px-2.5 py-1 bg-red-500/20 text-red-300 border border-red-500/30 text-[10px] rounded-lg hover:bg-red-500 hover:text-white transition-colors">Suspend</button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
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
            <button onClick={() => closeModal('createGroupModal')} className="text-slate-400 hover:text-white p-1 rounded-lg">
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
              onClick={async () => {
                if (!newGroupName.trim() || !currentUser) return;
                const isApproved = currentProfile?.is_global_admin ? true : false;
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
                  addLocalNotification("LOUNGE INITIALIZED", isApproved ? "Lounge is active!" : "Lounge is pending admin approval.");
                  fetchGroups();
                }
              }}
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
            <button onClick={() => closeModal('editProfileModal')} className="text-slate-400 hover:text-white p-1 rounded-lg">
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

      {/* NEW DIRECT CHAT MODAL */}
      <div className={`fixed inset-0 z-[120] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 ${modals.newDirectChatModal ? 'flex' : 'hidden'}`}>
        <div className="bg-[#091222] border border-slate-700/80 rounded-3xl w-full max-w-md p-6 space-y-4 shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-xs font-extrabold text-white font-['Orbitron'] tracking-wider uppercase">START DIRECT 1-ON-1 CHAT</h3>
            <button onClick={() => closeModal('newDirectChatModal')} className="text-slate-400 hover:text-white p-1 rounded-lg">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {userList.map(usr => (
              <div key={usr.id} onClick={() => sendChatRequestPrompt(usr)} className="p-3 bg-[#060d18] hover:bg-slate-800/80 rounded-2xl border border-slate-800/80 flex justify-between items-center cursor-pointer transition-colors">
                <div className="flex items-center gap-3">
                  <img src={usr.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'} alt="Avatar" className="w-9 h-9 rounded-full object-cover border border-slate-700" />
                  <div>
                    <span className="text-xs font-bold text-white block">{usr.username}</span>
                    <span className="text-[10px] text-slate-400 line-clamp-1">{usr.status_message || 'Available'}</span>
                  </div>
                </div>
                <span className="text-[11px] text-emerald-400 font-bold">Start Chat →</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* PENDING APPROVALS MODAL */}
      <div className={`fixed inset-0 z-[120] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 ${modals.pendingApprovalsModal ? 'flex' : 'hidden'}`}>
        <div className="bg-[#091222] border border-slate-700/80 rounded-3xl w-full max-w-md p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-xs font-extrabold text-white font-['Orbitron'] tracking-wider uppercase">PENDING LOUNGE APPROVALS</h3>
            <button onClick={() => closeModal('pendingApprovalsModal')} className="text-slate-400 hover:text-white p-1 rounded-lg">
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
                      {g.name.substring(0, 2).toUpperCase()}
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

      {/* CUSTOM PROMPT INTERACTIVE OVERLAY */}
      {customPrompt && (
        <div className="fixed inset-0 z-[350] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#091222] border border-slate-700/80 rounded-3xl w-full max-w-sm p-6 space-y-3.5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="text-xs font-bold font-['Orbitron']" style={{ color: customPrompt.titleColor || '#10b981' }}>{customPrompt.title}</h3>
              <button onClick={() => setCustomPrompt(null)} className="text-slate-400 hover:text-white p-1 rounded-lg">
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
                <button className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700/80 text-xs font-bold text-slate-300 transition-colors" onClick={() => setCustomPrompt(null)}>Cancel</button>
                <button
                  className={`flex-1 py-2.5 rounded-xl font-bold text-xs transition-colors shadow-sm ${customPrompt.confirmBg || 'bg-emerald-500 text-slate-950 hover:bg-emerald-400'}`}
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
    </div>
  );
}
