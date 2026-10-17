import React, { useState, useEffect, useRef } from 'react';
import { Plus, Sparkles, TrendingUp, ChevronLeft, ChevronRight, Film, Camera, Zap } from 'lucide-react';
import { MatchCardStatus, subscribeUserStatuses, INITIAL_COMMUNITY_STATUSES } from '../config/firebaseStore.ts';
import StatusViewerModal from './StatusViewerModal.tsx';
import CreateStatusModal from './CreateStatusModal.tsx';
import { TactileButton } from './physical/TactileButton.tsx';

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
  const [liveStatuses, setLiveStatuses] = useState<MatchCardStatus[]>(() => {
    if (Array.isArray(propStatuses) && propStatuses.length > 0) return propStatuses;
    return INITIAL_COMMUNITY_STATUSES;
  });
  const [selectedStatusIndex, setSelectedStatusIndex] = useState<number | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Sync propStatuses
  useEffect(() => {
    if (propStatuses && propStatuses.length > 0) {
      setLiveStatuses(propStatuses);
    }
  }, [propStatuses]);

  // Real-time subscription across all registered users' screens
  useEffect(() => {
    const unsub = subscribeUserStatuses((updatedList) => {
      if (Array.isArray(updatedList) && updatedList.length > 0) {
        setLiveStatuses(updatedList);
      }
    });

    const handleLocalUpdate = (e: any) => {
      const created = e.detail;
      if (created && created.id) {
        setLiveStatuses(prev => [created, ...prev.filter(s => s.id !== created.id)]);
      }
    };
    window.addEventListener('mtl_status_updated', handleLocalUpdate);

    return () => {
      unsub();
      window.removeEventListener('mtl_status_updated', handleLocalUpdate);
    };
  }, []);

  const statuses = liveStatuses;

  // Determine effective user identity for status matching
  const effectiveUserId = currentUser?.id || userProfile?.email || userProfile?.username || 'guest';
  const effectiveUserName = userProfile?.username || userProfile?.full_name || currentUser?.user_metadata?.username || currentUser?.email?.split('@')[0] || '';

  // Check if current user has an active status
  const myStatus = statuses.find(s => {
    if (currentUser?.id && s.userId === currentUser.id) return true;
    if (effectiveUserName && s.userName && s.userName.toLowerCase() === effectiveUserName.toLowerCase()) return true;
    if (s.userId === 'guest' && (!currentUser?.id || currentUser.id === 'guest')) return true;
    return false;
  });
  const otherStatuses = statuses.filter(s => s.id !== myStatus?.id);

  const handleOpenStatus = (index: number) => {
    setSelectedStatusIndex(index);
  };

  const handleStatusCreated = (newStatus: MatchCardStatus) => {
    setLiveStatuses(prev => [newStatus, ...prev.filter(s => s.id !== newStatus.id)]);
    if (onRefreshStatuses) onRefreshStatuses();
  };

  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -220, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 220, behavior: 'smooth' });
    }
  };

  return (
    <div className="w-full bg-[#080d17] border border-[#1e293b] rounded-3xl p-4 sm:p-5 shadow-[0_1px_0_rgba(255,255,255,0.08)_inset,0_-1px_0_rgba(0,0,0,0.8)_inset,0_14px_40px_rgba(0,0,0,0.9)] relative overflow-hidden">
      {/* Precision Milled Top Chamfer */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-white/20 to-transparent" aria-hidden="true" />
      
      {/* Header with Physical Plaque Style */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-[#1e293b]">
        <div className="flex items-center gap-2.5">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_10px_#10b981]" />
          <div>
            <h3 className="text-xs sm:text-sm font-black text-white tracking-wider uppercase flex items-center gap-2">
              <span>MATCH PREDICTION STATUSES</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-[#070b14] text-emerald-400 border border-emerald-500/30 shadow-inner font-mono font-bold">
                {statuses.length} ACTIVE
              </span>
            </h3>
            <p className="text-[10px] text-slate-400 font-mono mt-0.5">
              Live 24h stories, scoreline predictions & tactical reels
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Scroll Navigation Chevrons */}
          <div className="hidden sm:flex items-center gap-1 mr-1">
            <button
              type="button"
              onClick={scrollLeft}
              className="p-1.5 rounded-lg bg-[#0e1626] border border-[#1e293b] text-slate-400 hover:text-white hover:border-slate-600 transition-colors cursor-pointer"
              aria-label="Scroll left"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={scrollRight}
              className="p-1.5 rounded-lg bg-[#0e1626] border border-[#1e293b] text-slate-400 hover:text-white hover:border-slate-600 transition-colors cursor-pointer"
              aria-label="Scroll right"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <TactileButton
            variant="gold"
            size="sm"
            onClick={() => setIsCreateModalOpen(true)}
            icon={<Plus className="w-3.5 h-3.5 stroke-[2.5]" />}
          >
            <span>POST STATUS</span>
          </TactileButton>
        </div>
      </div>

      {/* Horizontal Carousel with Recessed Compartments */}
      <div 
        ref={scrollContainerRef}
        className="flex items-center gap-4 overflow-x-auto pb-3 pt-1 px-1 scroll-smooth scrollbar-none"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {/* MY STATUS ITEM */}
        <div className="flex flex-col items-center gap-1.5 shrink-0 group">
          <div className="relative">
            {myStatus ? (
              <button
                type="button"
                onClick={() => {
                  const idx = statuses.findIndex(s => s.id === myStatus.id);
                  handleOpenStatus(idx >= 0 ? idx : 0);
                }}
                className="w-16 h-16 rounded-full p-0.5 bg-gradient-to-tr from-emerald-400 via-cyan-400 to-teal-300 shadow-lg shadow-emerald-900/40 cursor-pointer transition-transform group-hover:scale-105 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                title="View your active match prediction status"
              >
                <img
                  src={
                    userProfile?.avatar_url ||
                    currentUser?.user_metadata?.avatar_url ||
                    myStatus.userAvatar ||
                    `https://api.dicebear.com/7.x/bottts/svg?seed=${currentUser?.id || 'me'}`
                  }
                  alt="My Status"
                  referrerPolicy="no-referrer"
                  className="w-full h-full rounded-full object-cover bg-slate-900 border-2 border-slate-950"
                />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(true)}
                className="w-16 h-16 rounded-full p-0.5 border-2 border-dashed border-slate-700 hover:border-emerald-400 flex items-center justify-center bg-slate-900/90 shadow-md cursor-pointer transition-all group-hover:scale-105 focus:outline-none"
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
              type="button"
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
            <span className="block text-[9px] text-emerald-400 font-mono">
              {myStatus ? 'Active 24h' : 'Tap to post'}
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
              type="button"
              onClick={() => handleOpenStatus(actualIndex >= 0 ? actualIndex : 0)}
              className="flex flex-col items-center gap-1.5 shrink-0 group cursor-pointer text-left focus:outline-none"
            >
              <div className="relative">
                {/* Glowing ring with gradient */}
                <div className="w-16 h-16 rounded-full p-0.5 bg-gradient-to-tr from-cyan-400 via-emerald-400 to-indigo-500 shadow-md transition-transform group-hover:scale-105">
                  <img
                    src={st.userAvatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${st.userId}`}
                    alt={st.userName}
                    referrerPolicy="no-referrer"
                    className="w-full h-full rounded-full object-cover bg-slate-900 border-2 border-slate-950"
                  />
                </div>

                {/* Badge chip (Reel, Image or Score) */}
                {st.statusType === 'reel' || st.mediaType === 'video' ? (
                  <div className="absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded-full bg-purple-950 border border-purple-400 text-[8px] font-mono font-black text-purple-300 shadow flex items-center gap-0.5">
                    <Film className="w-2.5 h-2.5" />
                    <span>REEL</span>
                  </div>
                ) : st.statusType === 'image' || (st.mediaType === 'image' && !st.predictedScore) ? (
                  <div className="absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded-full bg-cyan-950 border border-cyan-400 text-[8px] font-mono font-black text-cyan-300 shadow flex items-center gap-0.5">
                    <Camera className="w-2.5 h-2.5" />
                    <span>IMG</span>
                  </div>
                ) : st.predictedScore ? (
                  <div className="absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded-full bg-slate-950 border border-emerald-400/60 text-[9px] font-mono font-black text-emerald-400 shadow">
                    {st.predictedScore}
                  </div>
                ) : null}
              </div>

              <div className="text-center w-20">
                <span className="block text-[11px] font-bold text-slate-200 group-hover:text-emerald-300 transition-colors truncate">
                  {st.userName}
                </span>
                <span className="block text-[9px] text-slate-400 truncate font-mono">
                  {st.matchFixture.split(' vs ')[0] || 'Match'}
                </span>
              </div>
            </button>
          );
        })}

        {otherStatuses.length === 0 && (
          <div className="flex items-center gap-2 text-xs text-slate-400 italic px-4">
            <span>Tap + to share your match prediction, photo, or highlight reel!</span>
          </div>
        )}
      </div>

      {/* QUICK STATUS UPDATE TRIGGER BAR */}
      <div className="mt-3 pt-3 border-t border-[#1e293b]/70 flex flex-wrap items-center justify-between gap-2.5">
        <button
          type="button"
          onClick={() => setIsCreateModalOpen(true)}
          className="flex-1 min-w-[200px] flex items-center gap-2 px-3 py-2 rounded-xl bg-[#060a14] border border-[#1e293b] hover:border-emerald-500/40 text-left text-xs text-slate-400 hover:text-slate-200 transition-all cursor-pointer shadow-inner"
        >
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="truncate">Share your score prediction or matchday highlight...</span>
        </button>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#0d1626] border border-[#1e293b] hover:border-cyan-400/50 text-[11px] font-semibold text-cyan-300 hover:text-cyan-200 transition-colors cursor-pointer"
          >
            <Camera className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Photo</span>
          </button>
          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#0d1626] border border-[#1e293b] hover:border-purple-400/50 text-[11px] font-semibold text-purple-300 hover:text-purple-200 transition-colors cursor-pointer"
          >
            <Film className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reel</span>
          </button>
          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#0d1626] border border-[#1e293b] hover:border-emerald-400/50 text-[11px] font-semibold text-emerald-300 hover:text-emerald-200 transition-colors cursor-pointer"
          >
            <Zap className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Score</span>
          </button>
        </div>
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
