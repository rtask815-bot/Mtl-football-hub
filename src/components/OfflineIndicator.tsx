import React, { useEffect, useState } from 'react';
import { 
  WifiOff, 
  Wifi, 
  RefreshCw, 
  Database, 
  Clock, 
  ChevronDown, 
  ChevronUp, 
  Zap, 
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { SyncService, ConnectivityState } from '../config/SyncService.ts';

export const OfflineIndicator: React.FC = () => {
  const [connState, setConnState] = useState<ConnectivityState>(() => SyncService.getConnectivityState());
  const [showRestoredBanner, setShowRestoredBanner] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [timeAgoText, setTimeAgoText] = useState('Just now');

  useEffect(() => {
    let wasOffline = !connState.isOnline;

    const unsubscribe = SyncService.subscribeConnectivity((newState) => {
      setConnState(newState);

      // Reconnection detection trigger
      if (wasOffline && newState.isOnline) {
        setShowRestoredBanner(true);
        const timer = setTimeout(() => {
          setShowRestoredBanner(false);
        }, 4000);
        return () => clearTimeout(timer);
      }
      wasOffline = !newState.isOnline;
    });

    return () => unsubscribe();
  }, []);

  // Update time elapsed since last successful heartbeat sync
  useEffect(() => {
    const updateTimer = () => {
      if (!connState.lastSyncTimestamp) {
        setTimeAgoText('Just now');
        return;
      }
      const diffSec = Math.floor((Date.now() - connState.lastSyncTimestamp) / 1000);
      if (diffSec < 10) setTimeAgoText('Just now');
      else if (diffSec < 60) setTimeAgoText(`${diffSec}s ago`);
      else if (diffSec < 3600) setTimeAgoText(`${Math.floor(diffSec / 60)}m ago`);
      else setTimeAgoText(`${Math.floor(diffSec / 3600)}h ago`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 5000);
    return () => clearInterval(interval);
  }, [connState.lastSyncTimestamp]);

  const handleManualSync = async () => {
    await SyncService.syncAll();
  };

  // Only display if offline, syncing, has pending sync items, or showing restoration badge
  const isOffline = !connState.isOnline;
  if (!isOffline && !showRestoredBanner && connState.pendingSyncCount === 0 && !connState.isSyncing) {
    return null;
  }

  return (
    <div className="sticky top-16 z-40 w-full transition-all duration-300 ease-in-out px-3 sm:px-6 pt-2 pb-1 pointer-events-auto">
      <div className="max-w-6xl mx-auto">
        {/* RECONNECTION SUCCESS TOAST BANNER */}
        {showRestoredBanner && !isOffline && (
          <div className="bg-emerald-950/90 border border-emerald-500/50 text-emerald-300 rounded-2xl px-4 py-2.5 flex items-center justify-between shadow-lg shadow-emerald-950/50 animate-in fade-in slide-in-from-top-2 duration-300 backdrop-blur-md">
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <span className="font-extrabold text-xs font-['Orbitron'] tracking-wider">
                  CONNECTION RESTORED
                </span>
                <span className="text-[11px] text-emerald-400/80 ml-2 hidden sm:inline">
                  Quantum data stream re-synchronized with Supabase cloud.
                </span>
              </div>
            </div>
            <span className="text-[10px] font-bold text-emerald-400 font-['Orbitron'] uppercase px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20">
              SYNCED
            </span>
          </div>
        )}

        {/* PERSISTENT OFFLINE MODE BAR */}
        {isOffline && (
          <div className="bg-gradient-to-r from-[#170e06]/95 via-[#1a1208]/95 to-[#150c05]/95 border border-amber-500/40 text-amber-200 rounded-2xl p-3 shadow-2xl shadow-black/80 backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              {/* Left Status Alert */}
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
                    <WifiOff className="w-4 h-4 animate-pulse" />
                  </div>
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping opacity-75" />
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-black text-xs sm:text-sm font-['Orbitron'] tracking-wider text-amber-300 uppercase flex items-center gap-1.5">
                      <span>OFFLINE MODE ACTIVE</span>
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                    </h4>
                    <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[9px] font-black font-['Orbitron']">
                      LOCAL CACHE
                    </span>
                  </div>
                  <p className="text-[11px] text-amber-300/80 mt-0.5">
                    Operating seamlessly from local cache backup. Matches, predictions, news & chats are preserved.
                  </p>
                </div>
              </div>

              {/* Right Action & Telemetry Controls */}
              <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-black/40 border border-amber-500/20 text-[10px] text-amber-300/90 font-['Orbitron']">
                  <Clock className="w-3 h-3 text-amber-400" />
                  <span>Synced {timeAgoText}</span>
                </div>

                {connState.pendingSyncCount > 0 && (
                  <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-500/15 border border-amber-500/30 text-[10px] text-amber-300 font-bold font-['Orbitron']">
                    <Zap className="w-3 h-3 text-amber-400" />
                    <span>{connState.pendingSyncCount} Queued</span>
                  </div>
                )}

                <button
                  onClick={handleManualSync}
                  disabled={connState.isSyncing}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs font-['Orbitron'] transition-all shadow-md active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${connState.isSyncing ? 'animate-spin' : ''}`} />
                  <span>{connState.isSyncing ? 'RETRYING...' : 'RE-SYNC'}</span>
                </button>

                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="p-1.5 rounded-xl bg-black/40 hover:bg-black/60 text-amber-400 border border-amber-500/20 transition-colors"
                  title="Toggle Telemetry"
                >
                  {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* EXPANDABLE TELEMETRY DETAILS PANEL */}
            {isExpanded && (
              <div className="mt-3 pt-3 border-t border-amber-500/20 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-amber-300/80 animate-in fade-in duration-200">
                <div className="p-2 rounded-xl bg-black/40 border border-amber-500/10 flex items-center gap-2">
                  <Database className="w-4 h-4 text-amber-400" />
                  <div>
                    <span className="text-[10px] text-amber-400/60 block font-['Orbitron']">LOCAL STORAGE</span>
                    <span className="font-bold text-white text-[11px]">Active (Encrypted)</span>
                  </div>
                </div>

                <div className="p-2 rounded-xl bg-black/40 border border-amber-500/10 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-400" />
                  <div>
                    <span className="text-[10px] text-amber-400/60 block font-['Orbitron']">AUTO-RETRY INTERVAL</span>
                    <span className="font-bold text-white text-[11px]">30s Quantum Heartbeat</span>
                  </div>
                </div>

                <div className="p-2 rounded-xl bg-black/40 border border-amber-500/10 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <div>
                    <span className="text-[10px] text-amber-400/60 block font-['Orbitron']">QUEUED CHANGES</span>
                    <span className="font-bold text-white text-[11px]">
                      {connState.pendingSyncCount === 0 ? 'All Data Stored Locally' : `${connState.pendingSyncCount} operations pending`}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default OfflineIndicator;
