import React, { useState, useEffect } from 'react';
import { 
  X, 
  Phone, 
  Video, 
  MessageSquare, 
  ShieldCheck, 
  Award, 
  TrendingUp, 
  Heart, 
  Flame, 
  Search, 
  Calendar, 
  Clock, 
  Check, 
  Edit3, 
  Save, 
  Camera, 
  Star,
  ExternalLink,
  Shield,
  Eye,
  Film
} from 'lucide-react';
import { openGoogleScout } from '../utils/googleScout.ts';

const POPULAR_CLUBS = [
  { name: 'CF Montréal', country: 'Canada', league: 'MLS', color: '#002B49' },
  { name: 'Arsenal', country: 'England', league: 'Premier League', color: '#EF0107' },
  { name: 'Real Madrid', country: 'Spain', league: 'La Liga', color: '#FEBE10' },
  { name: 'Barcelona', country: 'Spain', league: 'La Liga', color: '#A50044' },
  { name: 'Manchester City', country: 'England', league: 'Premier League', color: '#6CABDD' },
  { name: 'Liverpool', country: 'England', league: 'Premier League', color: '#C8102E' },
  { name: 'Chelsea', country: 'England', league: 'Premier League', color: '#034694' },
  { name: 'Bayern Munich', country: 'Germany', league: 'Bundesliga', color: '#DC052D' },
  { name: 'Paris Saint-Germain', country: 'France', league: 'Ligue 1', color: '#004170' },
  { name: 'Inter Miami', country: 'USA', league: 'MLS', color: '#F7B5CD' },
  { name: 'Juventus', country: 'Italy', league: 'Serie A', color: '#000000' },
  { name: 'Manchester United', country: 'England', league: 'Premier League', color: '#DA291C' }
];

interface OtherUserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: any;
  isCurrentUser?: boolean;
  onDialAudioCall?: (profile: any) => void;
  onDialVideoCall?: (profile: any) => void;
  onStartDirectChat?: (profile: any) => void;
  onViewStatus?: (status: any) => void;
  activeStatus?: any;
  onSaveProfile?: (updatedData: any) => Promise<void>;
}

export const OtherUserProfileModal: React.FC<OtherUserProfileModalProps> = ({
  isOpen,
  onClose,
  profile,
  isCurrentUser = false,
  onDialAudioCall,
  onDialVideoCall,
  onStartDirectChat,
  onViewStatus,
  activeStatus,
  onSaveProfile
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editClub, setEditClub] = useState('');
  const [editAvatar, setEditAvatar] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState(false);

  useEffect(() => {
    if (profile) {
      setEditName(profile.username || profile.display_name || 'Football Fan');
      setEditBio(profile.bio || profile.status_message || 'Passionate football enthusiast & match analyst.');
      setEditPhone(profile.phone || '+1 (514) 790-MTL9');
      setEditClub(profile.favorite_club || profile.favorite_team || 'CF Montréal');
      setEditAvatar(profile.avatar_url || '');
      setIsEditing(false);
    }
  }, [profile, isOpen]);

  if (!isOpen || !profile) return null;

  const avatar = profile.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${profile.id || profile.username || 'user'}`;
  const favoriteClub = profile.favorite_club || profile.favorite_team || 'CF Montréal';
  const phoneNumber = profile.phone || '+1 (514) 790-MTL9';
  const roleName = profile.is_global_admin || profile.is_admin ? 'GLOBAL ADMIN' : profile.role || 'VERIFIED PREDICTOR';

  const handleCopyPhone = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(phoneNumber);
      setCopiedPhone(true);
      setTimeout(() => setCopiedPhone(false), 2000);
    }
  };

  const handleSave = async () => {
    if (!onSaveProfile) return;
    setIsSaving(true);
    try {
      await onSaveProfile({
        username: editName.trim(),
        status_message: editBio.trim(),
        bio: editBio.trim(),
        phone: editPhone.trim(),
        favorite_club: editClub,
        avatar_url: editAvatar.trim()
      });
      setSaveSuccess(true);
      setIsEditing(false);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[150] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-in fade-in zoom-in-95 duration-200">
      <div className="bg-[#081120] border border-slate-700/80 rounded-3xl w-full max-w-lg max-h-[92vh] flex flex-col overflow-hidden shadow-2xl shadow-black/90 relative">
        
        {/* Top Cover Banner */}
        <div className="h-32 bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 relative p-4 flex items-start justify-between shrink-0">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-950/60 backdrop-blur-md border border-white/10 text-[11px] text-emerald-400 font-bold font-['Orbitron']">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>{isCurrentUser ? 'MY USER PROFILE' : 'DIALED USER PROFILE'}</span>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-950/60 hover:bg-slate-900 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer border border-white/10"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Avatar & Floating Header Info */}
        <div className="px-6 pb-2 -mt-14 flex flex-col sm:flex-row items-center sm:items-end justify-between gap-4 shrink-0">
          <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
            
            {/* Clickable Profile Photo with Status Ring if active */}
            <div className="relative group">
              <div 
                onClick={() => {
                  if (activeStatus && onViewStatus) {
                    onViewStatus(activeStatus);
                  }
                }}
                className={`w-24 h-24 rounded-full p-1 bg-gradient-to-tr ${
                  activeStatus 
                    ? 'from-emerald-400 via-cyan-400 to-teal-300 ring-4 ring-emerald-500/40 cursor-pointer shadow-lg shadow-emerald-900/50' 
                    : 'from-slate-700 to-slate-800'
                }`}
                title={activeStatus ? 'Watch match status story' : 'User avatar'}
              >
                <img
                  src={avatar}
                  alt={profile.username}
                  className="w-full h-full rounded-full object-cover bg-slate-900"
                />
              </div>

              {/* Online indicator */}
              <span className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-[#081120] shadow-md" />

              {/* Status Indicator Badge */}
              {activeStatus && (
                <span className="absolute -top-1 -right-1 px-1.5 py-0.5 rounded-full bg-emerald-500 text-slate-950 font-black text-[9px] font-['Orbitron'] border border-emerald-300 animate-pulse">
                  STATUS
                </span>
              )}
            </div>

            <div>
              <div className="flex items-center justify-center sm:justify-start gap-2">
                <h2 className="text-xl font-black text-white font-['Orbitron'] tracking-wide">
                  {profile.username || 'Football Fan'}
                </h2>
                <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[10px] font-black tracking-wider uppercase font-['Orbitron']">
                  {roleName}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                @{profile.username ? profile.username.toLowerCase().replace(/\s+/g, '_') : 'fan'}
              </p>
            </div>
          </div>

          {/* Edit Button for Current User */}
          {isCurrentUser && (
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>{isEditing ? 'Cancel' : 'Edit Profile'}</span>
            </button>
          )}
        </div>

        {/* Action Buttons: Dial Hotline, Video Call, Direct Chat */}
        {!isCurrentUser && (
          <div className="px-6 py-3 border-y border-slate-800/80 bg-[#070e1c] flex items-center justify-center gap-3 shrink-0">
            {/* 1. Dial Audio Call */}
            {onDialAudioCall && (
              <button
                onClick={() => {
                  onDialAudioCall(profile);
                  onClose();
                }}
                className="flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs font-['Orbitron'] flex items-center justify-center gap-2 shadow-md shadow-emerald-950/40 transition-all cursor-pointer active:scale-95"
              >
                <Phone className="w-4 h-4" />
                <span>DIAL CALL</span>
              </button>
            )}

            {/* 2. Dial Video Call */}
            {onDialVideoCall && (
              <button
                onClick={() => {
                  onDialVideoCall(profile);
                  onClose();
                }}
                className="flex-1 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-cyan-300 font-extrabold text-xs font-['Orbitron'] flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95"
              >
                <Video className="w-4 h-4 text-cyan-400" />
                <span>VIDEO</span>
              </button>
            )}

            {/* 3. Direct Message */}
            {onStartDirectChat && (
              <button
                onClick={() => {
                  onStartDirectChat(profile);
                  onClose();
                }}
                className="flex-1 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-extrabold text-xs font-['Orbitron'] flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95"
              >
                <MessageSquare className="w-4 h-4 text-emerald-400" />
                <span>CHAT</span>
              </button>
            )}
          </div>
        )}

        {/* Scrollable Body: Profile Details or Edit Form */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          
          {saveSuccess && (
            <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-2">
              <Check className="w-4 h-4" />
              <span>Profile updated and synchronized successfully!</span>
            </div>
          )}

          {isEditing && isCurrentUser ? (
            /* Edit Profile Mode */
            <div className="space-y-3.5 bg-[#060d1a] border border-slate-800 rounded-2xl p-4">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400 uppercase font-mono">Display Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400 uppercase font-mono">Bio / Motto</label>
                <textarea
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  rows={2}
                  className="w-full bg-slate-900 border border-slate-800 focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-white focus:outline-none resize-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400 uppercase font-mono">Phone / Hotline</label>
                <input
                  type="text"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-white focus:outline-none font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400 uppercase font-mono">Favorite Club</label>
                <select
                  value={editClub}
                  onChange={(e) => setEditClub(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                >
                  {POPULAR_CLUBS.map((c) => (
                    <option key={c.name} value={c.name}>{c.name} ({c.league})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400 uppercase font-mono">Avatar Image URL</label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/..."
                  value={editAvatar}
                  onChange={(e) => setEditAvatar(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                />
              </div>

              <button
                onClick={handleSave}
                disabled={isSaving}
                className="w-full mt-2 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs font-['Orbitron'] tracking-wider shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? 'SAVING...' : 'SAVE CHANGES'}</span>
              </button>
            </div>
          ) : (
            /* View Profile Details */
            <>
              {/* Bio Card */}
              <div className="p-4 rounded-2xl bg-[#060d1a] border border-slate-800/80 space-y-1.5">
                <span className="text-[10px] font-black text-emerald-400 uppercase tracking-wider font-mono">ABOUT / BIO</span>
                <p className="text-xs text-slate-200 leading-relaxed">
                  {profile.bio || profile.status_message || 'Passionate football fan. Analyzes MLS, Premier League and Champions League matches on MTL Football Hub.'}
                </p>
              </div>

              {/* Active WhatsApp/Match Status Card if present */}
              {activeStatus && (
                <div 
                  onClick={() => onViewStatus && onViewStatus(activeStatus)}
                  className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-slate-900 to-teal-950/40 border border-emerald-500/40 hover:border-emerald-400 transition-all cursor-pointer space-y-2 group shadow-lg"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="text-xs font-extrabold text-white font-['Orbitron']">ACTIVE MATCH STATUS</span>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-400 px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40">
                      Tap to Watch
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800">
                    <p className="text-xs font-bold text-emerald-300">{activeStatus.matchFixture || 'Match Prediction'}</p>
                    <p className="text-[11px] text-slate-300 mt-0.5">{activeStatus.predictionPick || activeStatus.caption}</p>
                  </div>
                </div>
              )}

              {/* Info Grid: Club, Phone, Win Rate */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Favorite Club */}
                <div className="p-3.5 rounded-2xl bg-[#060d1a] border border-slate-800/80 space-y-1">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-[10px] font-bold uppercase font-mono">FAVORITE CLUB</span>
                    <Heart className="w-3.5 h-3.5 text-rose-400" />
                  </div>
                  <p className="text-sm font-black text-white font-['Orbitron'] truncate">{favoriteClub}</p>
                  <button
                    onClick={() => openGoogleScout(`${favoriteClub} latest football news standings schedule`, 'all')}
                    className="text-[10px] text-emerald-400 hover:underline flex items-center gap-1 font-bold pt-0.5"
                  >
                    <span>Scout Club on Google</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </button>
                </div>

                {/* Hotline Phone */}
                <div className="p-3.5 rounded-2xl bg-[#060d1a] border border-slate-800/80 space-y-1">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-[10px] font-bold uppercase font-mono">HOTLINE / PHONE</span>
                    <Phone className="w-3.5 h-3.5 text-cyan-400" />
                  </div>
                  <p className="text-xs font-bold text-white font-mono truncate">{phoneNumber}</p>
                  <button
                    onClick={handleCopyPhone}
                    className="text-[10px] text-cyan-400 hover:underline flex items-center gap-1 font-bold pt-0.5 cursor-pointer"
                  >
                    <Check className={`w-2.5 h-2.5 ${copiedPhone ? 'text-emerald-400' : 'text-cyan-400'}`} />
                    <span>{copiedPhone ? 'Copied to Clipboard!' : 'Copy Hotline'}</span>
                  </button>
                </div>
              </div>

              {/* Football Prediction Stats Showcase */}
              <div className="p-4 rounded-2xl bg-[#060d1a] border border-slate-800/80 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider font-mono">PREDICTION STATS</span>
                  <div className="flex items-center gap-1 text-emerald-400 text-xs font-bold">
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>Verified Metrics</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
                    <p className="text-lg font-black text-emerald-400 font-['Orbitron']">
                      {profile.win_rate || '78%'}
                    </p>
                    <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">Win Rate</p>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
                    <p className="text-lg font-black text-cyan-400 font-['Orbitron']">
                      {profile.total_predictions || '142'}
                    </p>
                    <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">Total Tips</p>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
                    <p className="text-lg font-black text-amber-400 font-['Orbitron']">
                      {profile.reputation_points || '2,890'}
                    </p>
                    <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">Points</p>
                  </div>
                </div>
              </div>

              {/* Quick Dial Hotline Bar */}
              {!isCurrentUser && onDialAudioCall && (
                <div className="p-3 rounded-2xl bg-gradient-to-r from-emerald-950/60 to-slate-900 border border-emerald-500/30 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                      <Phone className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">Instant Voice Connect</p>
                      <p className="text-[10px] text-slate-400 font-mono">{phoneNumber}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      onDialAudioCall(profile);
                      onClose();
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-[11px] font-['Orbitron'] shadow-md cursor-pointer transition-all"
                  >
                    DIAL NOW
                  </button>
                </div>
              )}
            </>
          )}

        </div>

      </div>
    </div>
  );
};

export default OtherUserProfileModal;
