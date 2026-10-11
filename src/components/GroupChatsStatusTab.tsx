import React, { useState, useEffect } from 'react';
import { Plus, Camera, Sparkles, TrendingUp, Eye, Heart, Clock, Film } from 'lucide-react';
import { MatchCardStatus, subscribeUserStatuses } from '../config/firebaseStore.ts';
import StatusViewerModal from './StatusViewerModal.tsx';
import CreateStatusModal from './CreateStatusModal.tsx';

interface GroupChatsStatusTabProps {
  currentUser: any;
  userProfile: any;
}

export const GroupChatsStatusTab: React.FC<GroupChatsStatusTabProps> = ({
  currentUser,
  userProfile
}) => {
  const [statuses, setStatuses] = useState<MatchCardStatus[]>([]);
  const [selectedStatusIndex, setSelectedStatusIndex] = useState<number | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  useEffect(() => {
    const unsub = subscribeUserStatuses((list) => {
      if (Array.isArray(list)) {
        setStatuses(list);
      }
    });
    return unsub;
  }, []);

  const myStatus = statuses.find((s) => s.userId === currentUser?.id);
  const otherStatuses = statuses.filter((s) => s.userId !== currentUser?.id);

  const handleStatusCreated = (newStatus: MatchCardStatus) => {
    setStatuses((prev) => [newStatus, ...prev.filter((s) => s.id !== newStatus.id)]);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Top Banner with Post Status CTA */}
      <div className="bg-gradient-to-r from-emerald-950/60 via-slate-900 to-teal-950/60 border border-slate-800 rounded-3xl p-5 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-4 text-center sm:text-left">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-emerald-950/50">
            <Camera className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black text-white font-['Orbitron'] tracking-wider">
              MATCH PREDICTION REELS
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Share 24-hour match predictions, video reels, stadium photos & tactical insights
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs font-['Orbitron'] tracking-wider shadow-md shadow-emerald-950/40 transition-all cursor-pointer flex items-center gap-2 active:scale-95"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>POST NEW STATUS</span>
        </button>
      </div>

      {/* MY STATUS CARD */}
      <div className="bg-[#091220] border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg">
        <h3 className="text-xs font-bold text-slate-400 uppercase font-mono tracking-wider mb-3">
          MY STATUS
        </h3>

        <div className="flex items-center justify-between">
          <div
            onClick={() => {
              if (myStatus) {
                const idx = statuses.findIndex((s) => s.id === myStatus.id);
                setSelectedStatusIndex(idx >= 0 ? idx : 0);
              } else {
                setIsCreateModalOpen(true);
              }
            }}
            className="flex items-center gap-3.5 cursor-pointer group"
          >
            <div className="relative">
              <div
                className={`w-14 h-14 rounded-full p-0.5 ${
                  myStatus
                    ? 'bg-gradient-to-tr from-emerald-400 via-cyan-400 to-teal-300 ring-2 ring-emerald-500/50'
                    : 'bg-slate-700'
                }`}
              >
                <img
                  src={
                    userProfile?.avatar_url ||
                    currentUser?.user_metadata?.avatar_url ||
                    `https://api.dicebear.com/7.x/bottts/svg?seed=${currentUser?.id || 'me'}`
                  }
                  alt="My Status"
                  className="w-full h-full rounded-full object-cover bg-slate-900"
                />
              </div>

              {!myStatus && (
                <div className="absolute bottom-0 right-0 w-5 h-5 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center border-2 border-[#091220] shadow-md">
                  <Plus className="w-3 h-3 stroke-[3]" />
                </div>
              )}
            </div>

            <div>
              <h4 className="text-sm font-bold text-white group-hover:text-emerald-300 transition-colors">
                My Status
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">
                {myStatus ? (
                  <span className="text-emerald-400 font-medium">
                    Active • {myStatus.matchFixture || myStatus.caption || 'Tap to view'}
                  </span>
                ) : (
                  'Tap to add status update'
                )}
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 transition-colors cursor-pointer"
            title="Create status"
          >
            <Camera className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* COMMUNITY UPDATES SECTION */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-slate-400 uppercase font-mono tracking-wider px-1">
          RECENT FAN UPDATES ({otherStatuses.length})
        </h3>

        {otherStatuses.length === 0 ? (
          <div className="p-8 text-center text-slate-400 bg-[#091220] border border-slate-800 rounded-2xl">
            <Sparkles className="w-8 h-8 text-slate-600 mx-auto mb-2 animate-pulse" />
            <p className="text-xs">No community fan statuses active right now.</p>
            <p className="text-[11px] text-slate-500 mt-1">Be the first to share tonight's match prediction!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {otherStatuses.map((st) => {
              const globalIndex = statuses.findIndex((s) => s.id === st.id);
              const avatar = st.userAvatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${st.userId}`;

              return (
                <div
                  key={st.id}
                  onClick={() => setSelectedStatusIndex(globalIndex >= 0 ? globalIndex : 0)}
                  className="p-4 rounded-2xl bg-[#091220] hover:bg-[#0c182b] border border-slate-800 hover:border-emerald-500/40 transition-all cursor-pointer group shadow-lg flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="relative w-12 h-12 rounded-full p-0.5 bg-gradient-to-tr from-emerald-400 via-cyan-400 to-teal-300 ring-2 ring-emerald-500/40 shrink-0">
                      <img
                        src={avatar}
                        alt={st.userName}
                        className="w-full h-full rounded-full object-cover bg-slate-900"
                      />
                      {st.statusType === 'reel' && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-cyan-500 text-slate-950 flex items-center justify-center">
                          <Film className="w-2.5 h-2.5" />
                        </div>
                      )}
                    </div>

                    <div>
                      <h4 className="text-xs font-bold text-white group-hover:text-emerald-300 transition-colors">
                        {st.userName || 'Football Fan'}
                      </h4>
                      <p className="text-[11px] text-emerald-400 font-medium truncate max-w-[140px] mt-0.5">
                        {st.matchFixture || st.predictionPick || 'Match Story'}
                      </p>
                      <span className="text-[10px] text-slate-500 block">
                        {st.createdAt ? new Date(st.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Today'}
                      </span>
                    </div>
                  </div>

                  <span className="text-[10px] font-bold text-emerald-400 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 group-hover:bg-emerald-500 group-hover:text-slate-950 transition-colors">
                    View
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* STATUS VIEWER MODAL */}
      <StatusViewerModal
        isOpen={selectedStatusIndex !== null}
        onClose={() => setSelectedStatusIndex(null)}
        statuses={statuses}
        initialIndex={selectedStatusIndex ?? 0}
        currentUserId={currentUser?.id}
      />

      {/* CREATE STATUS MODAL */}
      <CreateStatusModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        currentUser={currentUser}
        userProfile={userProfile}
        onStatusCreated={handleStatusCreated}
      />

    </div>
  );
};

export default GroupChatsStatusTab;
