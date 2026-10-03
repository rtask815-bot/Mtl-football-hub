import React, { useState, useEffect } from 'react';
import { Plus, Sparkles, TrendingUp, ShieldCheck, Eye, Flame, Film, Camera } from 'lucide-react';
import { MatchCardStatus, subscribeUserStatuses } from '../config/firebaseStore.ts';
import StatusViewerModal from './StatusViewerModal.tsx';
import CreateStatusModal from './CreateStatusModal.tsx';

interface StatusReelProps {
  statuses: MatchCardStatus[];
  currentUser: any;
  userProfile: any;
  onRefreshStatuses?: () => void;
}

export const StatusReel: React.FC<StatusReelProps> = ({
  statuses: propStatuses,
  currentUser,
  userProfile,
  onRefreshStatuses
}) => {
  const [liveStatuses, setLiveStatuses] = useState<MatchCardStatus[]>(propStatuses);
  const [selectedStatusIndex, setSelectedStatusIndex] = useState<number | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Sync propStatuses
  useEffect(() => {
    if (propStatuses && propStatuses.length > 0) {
      setLiveStatuses(propStatuses);
    }
  }, [propStatuses]);

  // Real-time subscription across all registered users' screens
  useEffect(() => {
    const unsub = subscribeUserStatuses((updatedList) => {
      if (Array.isArray(updatedList)) {
        setLiveStatuses(updatedList);
      }
    });
    return unsub;
  }, []);

  const statuses = liveStatuses;

  // Check if current user has an active status
  const myStatus = statuses.find(s => s.userId === currentUser?.id);
  const otherStatuses = statuses.filter(s => s.userId !== currentUser?.id);

  const handleOpenStatus = (index: number) => {
    setSelectedStatusIndex(index);
  };

  const handleStatusCreated = (newStatus: MatchCardStatus) => {
    setLiveStatuses(prev => [newStatus, ...prev.filter(s => s.id !== newStatus.id)]);
    if (onRefreshStatuses) onRefreshStatuses();
  };

  return (
    <div className="w-full bg-[#08101d] border border-slate-800/80 rounded-3xl p-4 sm:p-5 shadow-xl relative overflow-hidden">
      
      {/* Header with Title and Add Status CTA */}
      <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-800/60">
        <div className="flex items-center gap-2.5">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <h3 className="text-xs sm:text-sm font-black text-white font-['Orbitron'] tracking-wider uppercase flex items-center gap-2">
            <span>MATCH PREDICTION STATUSES</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              MATCH STORIES REEL
            </span>
          </h3>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-black text-[11px] font-['Orbitron'] tracking-wide shadow-md shadow-emerald-950/40 transition-all cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">ADD STATUS</span>
          <span className="sm:hidden">POST</span>
        </button>
      </div>

      {/* Horizontal Carousel */}
      <div className="flex items-center gap-4 overflow-x-auto pb-2 pt-1 scrollbar-thin">
        
        {/* MY STATUS ITEM */}
        <div className="flex flex-col items-center gap-1.5 shrink-0 group">
          <div className="relative">
            {myStatus ? (
              <button
                onClick={() => {
                  const idx = statuses.findIndex(s => s.id === myStatus.id);
                  handleOpenStatus(idx >= 0 ? idx : 0);
                }}
                className="w-16 h-16 rounded-full p-0.5 bg-gradient-to-tr from-emerald-400 via-cyan-400 to-teal-300 shadow-lg shadow-emerald-900/40 cursor-pointer transition-transform group-hover:scale-105"
                title="View your active match prediction status"
              >
                <img
                  src={
                    userProfile?.avatar_url ||
                    currentUser?.user_metadata?.avatar_url ||
                    `https://api.dicebear.com/7.x/bottts/svg?seed=${currentUser?.id || 'me'}`
                  }
                  alt="My Status"
                  className="w-full h-full rounded-full object-cover bg-slate-900 border-2 border-slate-950"
                />
              </button>
            ) : (
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="w-16 h-16 rounded-full p-0.5 border-2 border-dashed border-slate-700 hover:border-emerald-400 flex items-center justify-center bg-slate-900/90 shadow-md cursor-pointer transition-all group-hover:scale-105"
                title="Post new match prediction status"
              >
                <img
                  src={
                    userProfile?.avatar_url ||
                    currentUser?.user_metadata?.avatar_url ||
                    `https://api.dicebear.com/7.x/bottts/svg?seed=${currentUser?.id || 'me'}`
                  }
                  alt="My Profile"
                  className="w-full h-full rounded-full object-cover opacity-60"
                />
              </button>
            )}

            {/* Plus / Active status badge */}
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center justify-center shadow-md cursor-pointer border-2 border-slate-950 transition-transform hover:scale-110"
              title="Add new match status"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
            </button>
          </div>

          <div className="text-center w-20">
            <span className="block text-[11px] font-bold text-white truncate">
              {myStatus ? 'My Status' : 'Add Status'}
            </span>
            <span className="block text-[9px] text-slate-400 font-mono">
              {myStatus ? 'Active 24h' : 'Tap to share'}
            </span>
          </div>
        </div>

        {/* Divider */}
        <div className="w-px h-12 bg-slate-800 shrink-0" />

        {/* OTHER COMMUNITY STATUSES */}
        {otherStatuses.map((st, i) => {
          const actualIndex = statuses.findIndex(s => s.id === st.id);
          return (
            <button
              key={st.id || i}
              onClick={() => handleOpenStatus(actualIndex >= 0 ? actualIndex : 0)}
              className="flex flex-col items-center gap-1.5 shrink-0 group cursor-pointer text-left focus:outline-none"
            >
              <div className="relative">
                {/* Glowing ring with gradient */}
                <div className="w-16 h-16 rounded-full p-0.5 bg-gradient-to-tr from-cyan-400 via-emerald-400 to-indigo-500 shadow-md transition-transform group-hover:scale-105">
                  <img
                    src={st.userAvatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${st.userId}`}
                    alt={st.userName}
                    className="w-full h-full rounded-full object-cover bg-slate-900 border-2 border-slate-950"
                  />
                </div>

                {/* Badge chip (Reel, Image or Score) */}
                {st.statusType === 'reel' || st.mediaType === 'video' ? (
                  <div className="absolute -bottom-1 -right-1 px-1.5 py-0.2 rounded-full bg-purple-950 border border-purple-400 text-[8px] font-mono font-black text-purple-300 shadow flex items-center gap-0.5">
                    <Film className="w-2.5 h-2.5" />
                    <span>REEL</span>
                  </div>
                ) : st.statusType === 'image' || (st.mediaType === 'image' && !st.predictedScore) ? (
                  <div className="absolute -bottom-1 -right-1 px-1.5 py-0.2 rounded-full bg-cyan-950 border border-cyan-400 text-[8px] font-mono font-black text-cyan-300 shadow flex items-center gap-0.5">
                    <Camera className="w-2.5 h-2.5" />
                    <span>IMG</span>
                  </div>
                ) : st.predictedScore ? (
                  <div className="absolute -bottom-1 -right-1 px-1.5 py-0.2 rounded-full bg-slate-950 border border-emerald-400/60 text-[9px] font-mono font-black text-emerald-400 shadow">
                    {st.predictedScore}
                  </div>
                ) : null}
              </div>

              <div className="text-center w-20">
                <span className="block text-[11px] font-bold text-slate-200 group-hover:text-emerald-300 transition-colors truncate">
                  {st.userName}
                </span>
                <span className="block text-[9px] text-slate-400 truncate">
                  {st.matchFixture.split(' vs ')[0] || 'Match'}
                </span>
              </div>
            </button>
          );
        })}

        {otherStatuses.length === 0 && (
          <div className="flex items-center gap-2 text-xs text-slate-400 italic px-4">
            <span>No other statuses posted yet. Be the first to share your match prediction!</span>
          </div>
        )}
      </div>

      {/* Fullscreen WhatsApp-style story viewer modal */}
      {selectedStatusIndex !== null && (
        <StatusViewerModal
          statuses={statuses}
          initialIndex={selectedStatusIndex}
          isOpen={true}
          onClose={() => setSelectedStatusIndex(null)}
          currentUserId={currentUser?.id || 'guest'}
          onStatusUpdated={onRefreshStatuses}
        />
      )}

      {/* Create Status Modal */}
      {isCreateModalOpen && (
        <CreateStatusModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          currentUser={currentUser}
          userProfile={userProfile}
          onStatusCreated={handleStatusCreated}
        />
      )}
    </div>
  );
};

export default StatusReel;
