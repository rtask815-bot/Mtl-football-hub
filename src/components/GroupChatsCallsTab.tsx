import React, { useState } from 'react';
import { 
  Phone, 
  Video, 
  PhoneCall, 
  Clock, 
  Delete, 
  Search, 
  ShieldCheck, 
  Sparkles,
  ArrowUpRight,
  ArrowDownLeft,
  User
} from 'lucide-react';

interface GroupChatsCallsTabProps {
  userList: any[];
  currentUser: any;
  onDialCall: (user: any, callType: 'audio' | 'video') => void;
  onOpenProfile: (user: any) => void;
}

export interface CallRecord {
  id: string;
  peerName: string;
  peerPhone: string;
  avatar: string;
  type: 'audio' | 'video';
  direction: 'outgoing' | 'incoming';
  time: string;
  duration: string;
}

export const GroupChatsCallsTab: React.FC<GroupChatsCallsTabProps> = ({
  userList,
  currentUser,
  onDialCall,
  onOpenProfile
}) => {
  const [dialPadNumber, setDialPadNumber] = useState('');
  const [searchMember, setSearchMember] = useState('');

  // Sample call history persisted locally or initialized
  const [callHistory, setCallHistory] = useState<CallRecord[]>([
    {
      id: '1',
      peerName: 'CF Montréal Tactical Lounge',
      peerPhone: '+1 (514) 790-MTL9',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      type: 'audio',
      direction: 'outgoing',
      time: 'Today, 10:14 AM',
      duration: '04:12'
    },
    {
      id: '2',
      peerName: 'Premier League Match Desk',
      peerPhone: '+44 20 7946 0192',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
      type: 'video',
      direction: 'incoming',
      time: 'Yesterday, 8:45 PM',
      duration: '12:08'
    }
  ]);

  const handleDialPadPress = (val: string) => {
    if (dialPadNumber.length < 15) {
      setDialPadNumber(prev => prev + val);
    }
  };

  const handleBackspace = () => {
    setDialPadNumber(prev => prev.slice(0, -1));
  };

  const handleDialCustom = (callType: 'audio' | 'video') => {
    if (!dialPadNumber.trim()) return;
    const targetPeer = userList.find(u => (u.phone || '').includes(dialPadNumber)) || {
      id: 'hotline_' + dialPadNumber,
      username: `Fan (${dialPadNumber})`,
      phone: dialPadNumber
    };

    onDialCall(targetPeer, callType);

    // Record in history
    setCallHistory(prev => [
      {
        id: String(Date.now()),
        peerName: targetPeer.username,
        peerPhone: dialPadNumber,
        avatar: targetPeer.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${dialPadNumber}`,
        type: callType,
        direction: 'outgoing',
        time: 'Just now',
        duration: 'Active'
      },
      ...prev
    ]);
  };

  const KEYPAD_BUTTONS = [
    { num: '1', sub: '' },
    { num: '2', sub: 'ABC' },
    { num: '3', sub: 'DEF' },
    { num: '4', sub: 'GHI' },
    { num: '5', sub: 'JKL' },
    { num: '6', sub: 'MNO' },
    { num: '7', sub: 'PQRS' },
    { num: '8', sub: 'TUV' },
    { num: '9', sub: 'WXYZ' },
    { num: '*', sub: '' },
    { num: '0', sub: '+' },
    { num: '#', sub: '' }
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in duration-200">
      
      {/* LEFT: HOTLINE DIALPAD */}
      <div className="lg:col-span-5 bg-[#091220] border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2">
            <PhoneCall className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-black text-white font-['Orbitron'] tracking-wider">
              HOTLINE DIALPAD
            </h3>
          </div>
          <span className="text-[10px] text-emerald-400 font-mono">ENCRYPTED</span>
        </div>

        {/* Display Screen */}
        <div className="bg-[#050b14] border border-slate-800/90 rounded-2xl p-4 flex items-center justify-between">
          <input
            type="text"
            readOnly
            placeholder="Dial number or select user..."
            value={dialPadNumber}
            className="w-full bg-transparent text-lg sm:text-xl font-mono text-emerald-400 font-bold focus:outline-none placeholder-slate-600"
          />
          {dialPadNumber && (
            <button
              onClick={handleBackspace}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <Delete className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Phone Keypad Grid */}
        <div className="grid grid-cols-3 gap-2.5">
          {KEYPAD_BUTTONS.map((k) => (
            <button
              key={k.num}
              onClick={() => handleDialPadPress(k.num)}
              className="h-13 rounded-2xl bg-[#0e192c] hover:bg-[#14233e] active:scale-95 border border-slate-800/80 hover:border-emerald-500/40 text-white font-bold transition-all flex flex-col items-center justify-center cursor-pointer shadow-sm"
            >
              <span className="text-lg font-['Orbitron'] leading-none">{k.num}</span>
              {k.sub && <span className="text-[8px] text-slate-400 font-mono leading-none mt-0.5">{k.sub}</span>}
            </button>
          ))}
        </div>

        {/* Dial Buttons */}
        <div className="flex gap-2.5 pt-2">
          <button
            onClick={() => handleDialCustom('audio')}
            disabled={!dialPadNumber}
            className="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs font-['Orbitron'] tracking-wider shadow-md shadow-emerald-950/50 transition-all cursor-pointer disabled:opacity-40 flex items-center justify-center gap-2 active:scale-95"
          >
            <Phone className="w-4 h-4" />
            <span>DIAL AUDIO</span>
          </button>

          <button
            onClick={() => handleDialCustom('video')}
            disabled={!dialPadNumber}
            className="py-3.5 px-4 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-cyan-300 font-bold text-xs font-['Orbitron'] transition-all cursor-pointer disabled:opacity-40 flex items-center justify-center gap-1.5 active:scale-95"
          >
            <Video className="w-4 h-4 text-cyan-400" />
            <span>VIDEO</span>
          </button>
        </div>
      </div>

      {/* RIGHT: CALL LOGS & QUICK CONNECT ROSTER */}
      <div className="lg:col-span-7 space-y-6">
        
        {/* QUICK DIAL COMMUNITY MEMBERS */}
        <div className="bg-[#091220] border border-slate-800 rounded-3xl p-5 shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black text-white font-['Orbitron'] tracking-wider uppercase">
              QUICK DIAL MEMBERS ({userList.length})
            </h3>
            <div className="relative w-44">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search..."
                value={searchMember}
                onChange={(e) => setSearchMember(e.target.value)}
                className="w-full bg-[#060d18] border border-slate-800 rounded-xl pl-8 pr-2 py-1 text-xs text-white focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-56 overflow-y-auto pr-1">
            {userList
              .filter(u => (u.username || '').toLowerCase().includes(searchMember.toLowerCase()))
              .slice(0, 8)
              .map((usr) => (
                <div
                  key={usr.id}
                  className="p-2.5 rounded-xl bg-[#060d18] border border-slate-800/80 hover:border-emerald-500/40 flex items-center justify-between transition-colors"
                >
                  <div 
                    onClick={() => onOpenProfile(usr)}
                    className="flex items-center gap-2 cursor-pointer truncate mr-2"
                  >
                    <img
                      src={usr.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${usr.id}`}
                      alt={usr.username}
                      className="w-8 h-8 rounded-full object-cover border border-slate-700 shrink-0"
                    />
                    <div className="truncate">
                      <p className="text-xs font-bold text-white truncate hover:underline">{usr.username}</p>
                      <p className="text-[10px] text-slate-400 font-mono truncate">{usr.phone || '+1 (514) 790-MTL9'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => onDialCall(usr, 'audio')}
                      className="p-1.5 rounded-lg bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500 hover:text-slate-950 transition-colors"
                      title="Audio Call"
                    >
                      <Phone className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onDialCall(usr, 'video')}
                      className="p-1.5 rounded-lg bg-cyan-500/15 text-cyan-400 hover:bg-cyan-500 hover:text-slate-950 transition-colors"
                      title="Video Call"
                    >
                      <Video className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* CALL LOG HISTORY */}
        <div className="bg-[#091220] border border-slate-800 rounded-3xl p-5 shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black text-white font-['Orbitron'] tracking-wider uppercase">
              CALL LOG HISTORY
            </h3>
            <button
              onClick={() => setCallHistory([])}
              className="text-[10px] text-slate-500 hover:text-slate-300 font-bold"
            >
              Clear Logs
            </button>
          </div>

          <div className="space-y-2">
            {callHistory.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-4">No recent call records.</p>
            ) : (
              callHistory.map((c) => (
                <div
                  key={c.id}
                  className="p-3 rounded-2xl bg-[#060d18] border border-slate-800/80 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <img src={c.avatar} alt={c.peerName} className="w-9 h-9 rounded-full object-cover border border-slate-700" />
                    <div>
                      <h4 className="text-xs font-bold text-white">{c.peerName}</h4>
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-0.5">
                        {c.direction === 'outgoing' ? (
                          <span className="text-emerald-400 flex items-center gap-0.5">
                            <ArrowUpRight className="w-3 h-3" />
                            <span>Outgoing</span>
                          </span>
                        ) : (
                          <span className="text-cyan-400 flex items-center gap-0.5">
                            <ArrowDownLeft className="w-3 h-3" />
                            <span>Incoming</span>
                          </span>
                        )}
                        <span>•</span>
                        <span>{c.time}</span>
                        <span>•</span>
                        <span className="font-mono text-slate-300">{c.duration}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => onDialCall({ username: c.peerName, phone: c.peerPhone, avatar_url: c.avatar, id: c.id }, c.type)}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-emerald-500 hover:text-slate-950 text-emerald-400 transition-colors cursor-pointer"
                  >
                    {c.type === 'video' ? <Video className="w-4 h-4" /> : <Phone className="w-4 h-4" />}
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

    </div>
  );
};

export default GroupChatsCallsTab;
