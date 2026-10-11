import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  User,
  Mail,
  Shield,
  ShieldCheck,
  Edit3,
  KeyRound,
  CheckCircle2,
  Heart,
  TrendingUp,
  History,
  Activity,
  Plus,
  Trash2,
  Camera,
  Calendar,
  MapPin,
  Phone,
  Info,
  Sparkles,
  Lock,
  Eye,
  EyeOff,
  Flame,
  Award,
  ChevronRight,
  ExternalLink,
  Save,
  X,
  RefreshCw,
  Clock,
  Star,
  Film,
  Download,
  Upload,
  Copy,
  Check,
  Database,
  FileText
} from 'lucide-react';
import { supabase } from '../config/supabase.ts';
import { useAuthSession } from '../App.tsx';
import {
  MatchCardStatus,
  UserActivityItem,
  UserPredictionItem,
  MediaAsset,
  fetchUserStatuses,
  subscribeUserStatuses,
  fetchUserActivities,
  logUserActivity,
  fetchUserPersonalPredictions,
  saveUserPersonalPrediction,
  uploadDigitalMedia,
  fetchUserMedia,
  deleteMediaAsset,
  saveUserProfileDetails
} from '../config/firebaseStore.ts';
import StatusReel from '../components/StatusReel.tsx';
import StatusViewerModal from '../components/StatusViewerModal.tsx';
import CreateStatusModal from '../components/CreateStatusModal.tsx';
import UniversalFAB from '../components/UniversalFAB.tsx';

// Popular football clubs for quick selection
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
  { name: 'Manchester United', country: 'England', league: 'Premier League', color: '#DA291C' },
  { name: 'Borussia Dortmund', country: 'Germany', league: 'Bundesliga', color: '#FDE100' },
  { name: 'AC Milan', country: 'Italy', league: 'Serie A', color: '#FB090B' }
];

export default function UserProfile() {
  const navigate = useNavigate();
  const { user, userProfile, isAdmin, refreshAuthProfile } = useAuthSession();

  // Active Profile Navigation Tab
  const [activeTab, setActiveTab] = useState<'overview' | 'status' | 'media' | 'predictions' | 'history' | 'security'>('overview');

  // Real Database States (Zero Mock Data)
  const [statuses, setStatuses] = useState<MatchCardStatus[]>([]);
  const [activities, setActivities] = useState<UserActivityItem[]>([]);
  const [predictions, setPredictions] = useState<UserPredictionItem[]>([]);
  const [userMedia, setUserMedia] = useState<MediaAsset[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit Profile States (Stored in Supabase profiles)
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editInfo, setEditInfo] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editAvatarUrl, setEditAvatarUrl] = useState('');
  const [editFavoriteTeams, setEditFavoriteTeams] = useState<string[]>([]);
  const [customTeamInput, setCustomTeamInput] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [isSavingTeams, setIsSavingTeams] = useState(false);
  const [teamsSavedSuccess, setTeamsSavedSuccess] = useState(false);

  // Password Update Form (Supabase Auth)
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordStatus, setPasswordStatus] = useState<{ type: 'success' | 'error' | ''; msg: string }>({ type: '', msg: '' });
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  // Digital Media Upload States (Firebase Storage for Images & Videos)
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const avatarUploadRef = useRef<HTMLInputElement | null>(null);

  // Status Modals
  const [isCreateStatusOpen, setIsCreateStatusOpen] = useState(false);
  const [viewingStatusIndex, setViewingStatusIndex] = useState<number | null>(null);

  // Add Prediction Modal
  const [isAddPredictionOpen, setIsAddPredictionOpen] = useState(false);
  const [predForm, setPredForm] = useState({
    fixture: '',
    league: 'Premier League',
    pick: 'Home Win & Over 2.5',
    predictedScore: '2 - 1',
    odds: '1.95',
    matchDate: new Date().toISOString().split('T')[0]
  });

  // Load Real Data on Mount
  useEffect(() => {
    async function loadRealData() {
      if (!user) return;
      setLoading(true);
      const userId = user.id;

      try {
        // 1. Load real Supabase Profile details
        const { data: supaProfile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle();

        const activeName = supaProfile?.username || supaProfile?.full_name || user.user_metadata?.username || user.email?.split('@')[0] || '';
        const activeBio = supaProfile?.bio || user.user_metadata?.bio || '';
        const activeInfo = supaProfile?.info || user.user_metadata?.info || '';
        const activePhone = supaProfile?.phone || user.user_metadata?.phone || '';
        const activeLocation = supaProfile?.location || user.user_metadata?.location || 'Montreal, Canada';
        const activeAvatar = supaProfile?.avatar_url || user.user_metadata?.avatar_url || '';
        
        let activeTeams: string[] = [];
        if (Array.isArray(supaProfile?.favorite_teams)) {
          activeTeams = supaProfile.favorite_teams;
        } else if (typeof supaProfile?.favorite_teams === 'string') {
          try { activeTeams = JSON.parse(supaProfile.favorite_teams); } catch { activeTeams = []; }
        }

        setEditDisplayName(activeName);
        setEditBio(activeBio);
        setEditInfo(activeInfo);
        setEditPhone(activePhone);
        setEditLocation(activeLocation);
        setEditAvatarUrl(activeAvatar);
        setEditFavoriteTeams(activeTeams);

        // 2. Load real Firebase records: user_statuses, user_activities, user_predictions, media
        const [realStatuses, realActivities, realPredictions, realMedia] = await Promise.all([
          fetchUserStatuses(),
          fetchUserActivities(userId),
          fetchUserPersonalPredictions(userId),
          fetchUserMedia(userId)
        ]);

        setStatuses(realStatuses);
        setActivities(realActivities);
        setPredictions(realPredictions);
        setUserMedia(realMedia);
      } catch (err) {
        console.error('Error loading real database records:', err);
      } finally {
        setLoading(false);
      }
    }

    loadRealData();

    // Real-time status subscription across all registered users' screens
    const unsubStatuses = subscribeUserStatuses((updatedList) => {
      if (Array.isArray(updatedList)) {
        setStatuses(updatedList);
      }
    });

    return () => {
      unsubStatuses();
    };
  }, [user]);

  // Handle Save Profile Details (Supabase primary + Central Persistent DB + Firebase activity)
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSavingProfile(true);

    const userId = user.id;
    const profilePayload = {
      id: userId,
      username: editDisplayName.trim(),
      full_name: editDisplayName.trim(),
      avatar_url: editAvatarUrl.trim() || null,
      bio: editBio.trim() || null,
      info: editInfo.trim() || null,
      location: editLocation.trim() || null,
      phone: editPhone.trim() || null,
      favorite_teams: editFavoriteTeams,
      updated_at: new Date().toISOString()
    };

    // Instant optimistic visual feedback
    setSaveSuccessMsg('✓ Profile details saved to database!');
    setTimeout(() => setSaveSuccessMsg(null), 3000);

    try {
      await saveUserProfileDetails(userId, profilePayload);
      await logUserActivity(userId, {
        type: 'profile_update',
        title: 'Profile Details Saved',
        description: 'Saved user details and favourite clubs to database.',
      }).catch(() => {});

      // Refresh global context non-blockingly
      refreshAuthProfile().catch(() => {});
      fetchUserActivities(userId).then(acts => setActivities(acts)).catch(() => {});

      setIsEditingProfile(false);
    } catch (err: any) {
      console.warn('Profile save note:', err);
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Fast Save Favourite Teams
  const handleSaveFavoriteTeams = async () => {
    if (!user) return;
    setIsSavingTeams(true);
    const userId = user.id;

    // Instant optimistic visual feedback
    setTeamsSavedSuccess(true);
    setSaveSuccessMsg('✓ Favourite clubs updated successfully!');
    setTimeout(() => {
      setTeamsSavedSuccess(false);
      setSaveSuccessMsg(null);
    }, 3000);

    try {
      await Promise.allSettled([
        fetch(`/api/profile/${userId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ favorite_teams: editFavoriteTeams })
        }),
        supabase.from('profiles').upsert({
          id: userId,
          favorite_teams: editFavoriteTeams,
          updated_at: new Date().toISOString()
        }),
        supabase.auth.updateUser({
          data: { favorite_teams: editFavoriteTeams }
        }),
        logUserActivity(userId, {
          type: 'favorite_team',
          title: 'Updated Favourite Clubs',
          description: `Saved ${editFavoriteTeams.length} favourite clubs in profile.`,
        })
      ]);
      refreshAuthProfile().catch(() => {});
    } catch (err) {
      console.warn('Save favourite teams notice:', err);
    } finally {
      setIsSavingTeams(false);
    }
  };

  // Handle Password Update via Supabase Auth
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      setPasswordStatus({ type: 'error', msg: 'Password must be at least 6 characters long.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordStatus({ type: 'error', msg: 'Passwords do not match.' });
      return;
    }

    setIsUpdatingPassword(true);
    setPasswordStatus({ type: '', msg: '' });

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      if (user?.id) {
        await logUserActivity(user.id, {
          type: 'password_change',
          title: 'Account Password Updated',
          description: 'Secured account credentials in Supabase Auth.',
        });
        const updatedActs = await fetchUserActivities(user.id);
        setActivities(updatedActs);
      }

      setPasswordStatus({ type: 'success', msg: 'Password updated successfully in Supabase Auth!' });
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPasswordStatus({ type: 'error', msg: err.message || 'Failed to update password.' });
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  // Handle Digital Media Upload to Firebase Storage
  const handleUploadMediaFile = async () => {
    if (!uploadFile || !user) return;
    setIsUploading(true);
    setUploadProgress(0);

    try {
      const asset = await uploadDigitalMedia(
        uploadFile,
        uploadFile.name,
        user.id,
        (percent) => setUploadProgress(percent)
      );

      setUserMedia(prev => [asset, ...prev]);
      setUploadFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';

      // Refresh activity log
      fetchUserActivities(user.id).then(acts => setActivities(acts)).catch(() => {});

      setSaveSuccessMsg(`✓ File "${asset.name}" uploaded to Firebase Storage!`);
      setTimeout(() => setSaveSuccessMsg(null), 3000);
    } catch (err: any) {
      console.error('Media upload error:', err);
      setSaveSuccessMsg(`Notice: ${err.message || 'Error communicating with storage'}`);
      setTimeout(() => setSaveSuccessMsg(null), 4000);
    } finally {
      setIsUploading(false);
    }
  };

  // Handle Avatar Direct Upload to Firebase Storage
  const handleAvatarFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    try {
      setSaveSuccessMsg('Uploading avatar to Firebase Storage...');
      const asset = await uploadDigitalMedia(
        file,
        `avatar_${file.name}`,
        user.id
      );

      setEditAvatarUrl(asset.downloadUrl);

      // Auto update Supabase profile avatar & central database
      Promise.allSettled([
        fetch(`/api/profile/${user.id}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ avatar_url: asset.downloadUrl })
        }),
        supabase.from('profiles').upsert({
          id: user.id,
          avatar_url: asset.downloadUrl,
          updated_at: new Date().toISOString()
        }),
        supabase.auth.updateUser({
          data: { avatar_url: asset.downloadUrl }
        })
      ]).then(() => refreshAuthProfile().catch(() => {}));

      setSaveSuccessMsg('✓ Avatar uploaded to Firebase Storage and saved to profile!');
      setTimeout(() => setSaveSuccessMsg(null), 3500);
    } catch (err: any) {
      console.error('Avatar upload failed:', err);
      setSaveSuccessMsg(`Notice: ${err.message || 'Avatar upload failed'}`);
      setTimeout(() => setSaveSuccessMsg(null), 4000);
    }
  };

  // Delete Media Asset
  const handleDeleteMedia = async (asset: MediaAsset) => {
    if (!window.confirm(`Delete "${asset.name}" from Firebase Storage?`)) return;
    if (!user) return;

    await deleteMediaAsset(asset.id, user.id, asset.storagePath);
    setUserMedia(prev => prev.filter(m => m.id !== asset.id));
  };

  const copyMediaUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(url);
    setTimeout(() => setCopiedUrl(null), 2500);
  };

  // Toggle favorite team
  const toggleFavoriteTeam = (teamName: string) => {
    setEditFavoriteTeams(prev => {
      if (prev.includes(teamName)) {
        return prev.filter(t => t !== teamName);
      } else {
        return [...prev, teamName];
      }
    });
  };

  const handleAddCustomTeam = () => {
    if (!customTeamInput.trim()) return;
    if (!editFavoriteTeams.includes(customTeamInput.trim())) {
      setEditFavoriteTeams(prev => [...prev, customTeamInput.trim()]);
    }
    setCustomTeamInput('');
  };

  // Handle Add Personal Prediction (Stored in Firebase user_predictions)
  const handleAddPersonalPrediction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!predForm.fixture || !predForm.pick || !user) return;

    try {
      const newPred = await saveUserPersonalPrediction({
        userId: user.id,
        fixture: predForm.fixture.trim(),
        league: predForm.league.trim(),
        pick: predForm.pick.trim(),
        predictedScore: predForm.predictedScore.trim() || undefined,
        odds: parseFloat(predForm.odds) || 1.95,
        outcome: 'PENDING',
        matchDate: predForm.matchDate
      });

      setPredictions(prev => [newPred, ...prev]);
      setIsAddPredictionOpen(false);
      setPredForm({
        fixture: '',
        league: 'Premier League',
        pick: 'Home Win & Over 2.5',
        predictedScore: '2 - 1',
        odds: '1.95',
        matchDate: new Date().toISOString().split('T')[0]
      });
    } catch (err) {
      console.error('Failed to save prediction:', err);
    }
  };

  // Active status of the current user
  const myStatus = statuses.find(s => s.userId === user?.id);

  // Real Performance Stats (No fake win rates)
  const totalPreds = predictions.length;
  const wonPreds = predictions.filter(p => p.outcome === 'WON').length;
  const personalWinRate = totalPreds > 0 ? ((wonPreds / totalPreds) * 100).toFixed(1) : '0.0';
  const favoriteTeamsList = editFavoriteTeams;

  return (
    <div className="min-h-screen bg-[#060b14] bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(16,185,129,0.06),rgba(0,0,0,0))] font-['Plus_Jakarta_Sans',sans-serif] text-slate-100 pt-2 pb-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* RESPONSIVE TOAST NOTIFICATION BANNER */}
        {saveSuccessMsg && (
          <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[250] px-5 py-2.5 rounded-2xl bg-emerald-500 text-slate-950 font-black text-xs font-['Orbitron'] shadow-2xl flex items-center gap-2 border border-emerald-300 animate-in fade-in slide-in-from-top-4 duration-200">
            <CheckCircle2 className="w-4 h-4" />
            <span>{saveSuccessMsg}</span>
          </div>
        )}

        {/* ==================================================================== */}
        {/* 1. REAL MATCH STATUS REEL (COMMUNITY & PERSONAL) */}
        {/* ==================================================================== */}
        <StatusReel
          statuses={statuses}
          currentUser={user}
          userProfile={userProfile}
          onRefreshStatuses={async () => {
            const list = await fetchUserStatuses();
            setStatuses(list);
          }}
        />

        {/* ==================================================================== */}
        {/* 2. CLOUD NETWORK STATUS BANNER */}
        {/* ==================================================================== */}
        <div className="bg-[#091222] border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-cyan-500 flex items-center justify-center text-slate-950 font-black shadow-md">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-['Orbitron'] text-xs font-bold text-white uppercase tracking-wider">
                  HIGH-AVAILABILITY CLOUD NETWORK
                </span>
                <span className="text-[10px] px-2 py-0.2 rounded-full bg-emerald-500/20 text-emerald-400 font-mono font-bold">
                  SYNCHRONIZED
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                <strong>Profile Vault:</strong> User credentials & account details • <strong>Live Stream:</strong> Matches, news, match card statuses & media storage.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('media')}
              className="px-3 py-1.5 rounded-xl bg-cyan-950/40 border border-cyan-500/40 text-cyan-300 hover:text-white text-xs font-bold font-['Orbitron'] transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>UPLOAD MEDIA</span>
            </button>
          </div>
        </div>

        {/* ==================================================================== */}
        {/* 3. PROFILE HERO CARD (USER DETAILS & SYSTEM DATA) */}
        {/* ==================================================================== */}
        <div className="relative bg-gradient-to-b from-[#0e182a] to-[#0a1221] border border-slate-800/90 rounded-3xl p-6 sm:p-8 shadow-2xl overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-cyan-500 to-purple-500" />
          
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            
            {/* Left: Avatar with Upload Button + Core Details */}
            <div className="flex items-center gap-5 sm:gap-6 flex-wrap sm:flex-nowrap">
              <div className="relative group">
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl p-1 bg-gradient-to-tr from-emerald-500 via-cyan-400 to-teal-400 shadow-xl shadow-emerald-950/60 flex-shrink-0">
                  <img
                    src={
                      editAvatarUrl ||
                      userProfile?.avatar_url ||
                      user?.user_metadata?.avatar_url ||
                      `https://api.dicebear.com/7.x/bottts/svg?seed=${user?.id || 'me'}`
                    }
                    alt="Profile Avatar"
                    className="w-full h-full rounded-[22px] object-cover bg-slate-900 border-2 border-slate-950"
                  />
                </div>
                
                {/* Upload Avatar Overlay Button */}
                <button
                  onClick={() => avatarUploadRef.current?.click()}
                  className="absolute inset-0 rounded-3xl bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-[10px] font-bold cursor-pointer"
                  title="Upload avatar image to account storage"
                >
                  <Camera className="w-5 h-5 text-cyan-400 mb-0.5" />
                  <span>Change</span>
                </button>
                <input
                  type="file"
                  ref={avatarUploadRef}
                  accept="image/*"
                  onChange={handleAvatarFileSelected}
                  className="hidden"
                />

                <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 border-2 border-slate-950 flex items-center justify-center text-slate-950 shadow">
                  <ShieldCheck className="w-3.5 h-3.5 stroke-[3]" />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h1 className="text-xl sm:text-2xl font-black text-white font-['Orbitron'] tracking-wide">
                    {editDisplayName || userProfile?.username || user?.email?.split('@')[0] || 'MTL Footballer'}
                  </h1>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[10px] font-black uppercase tracking-wider font-['Orbitron']">
                    {isAdmin ? 'ADMINISTRATOR' : 'MEMBER'}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 text-[10px] font-mono font-bold">
                    ACCOUNT VERIFIED
                  </span>
                </div>

                <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-400 font-mono flex-wrap">
                  <span className="flex items-center gap-1.5 text-slate-300">
                    <Mail className="w-3.5 h-3.5 text-cyan-400" />
                    {user?.email || 'authenticated@mtl.hub'}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1.5 text-slate-400">
                    <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                    {editLocation || 'Montreal, Canada'}
                  </span>
                </div>

                {editBio ? (
                  <p className="text-xs sm:text-sm text-slate-300 max-w-xl line-clamp-2 italic pt-1">
                    "{editBio}"
                  </p>
                ) : (
                  <p className="text-xs text-slate-500 italic pt-1">
                    No bio added yet. Click "Edit Profile" to add your tactical profile.
                  </p>
                )}
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-3 w-full md:w-auto">
              <button
                onClick={() => setIsEditingProfile(true)}
                className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs border border-slate-700 transition-all cursor-pointer shadow-md"
              >
                <Edit3 className="w-4 h-4 text-cyan-400" />
                <span>EDIT PROFILE</span>
              </button>

              <button
                onClick={() => setActiveTab('security')}
                className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white font-bold text-xs transition-all cursor-pointer shadow-md"
              >
                <KeyRound className="w-4 h-4 text-emerald-400" />
                <span>PASSWORD</span>
              </button>
            </div>
          </div>

          {/* Real Metrics Bar inside Hero */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-800/80">
            <div className="bg-[#060c18] border border-slate-800/80 rounded-2xl p-3 text-center">
              <span className="text-[10px] uppercase font-bold text-slate-400 font-mono">PREDICTIONS LOGGED</span>
              <div className="text-lg font-black text-white font-['Orbitron']">{predictions.length}</div>
            </div>
            <div className="bg-[#060c18] border border-slate-800/80 rounded-2xl p-3 text-center">
              <span className="text-[10px] uppercase font-bold text-slate-400 font-mono">PERSONAL WIN RATE</span>
              <div className="text-lg font-black text-emerald-400 font-['Orbitron']">{personalWinRate}%</div>
            </div>
            <div className="bg-[#060c18] border border-slate-800/80 rounded-2xl p-3 text-center">
              <span className="text-[10px] uppercase font-bold text-slate-400 font-mono">FAVOURITE CLUBS</span>
              <div className="text-lg font-black text-cyan-400 font-['Orbitron']">{favoriteTeamsList.length}</div>
            </div>
            <div className="bg-[#060c18] border border-slate-800/80 rounded-2xl p-3 text-center">
              <span className="text-[10px] uppercase font-bold text-slate-400 font-mono">MEDIA ASSETS</span>
              <div className="text-lg font-black text-purple-400 font-['Orbitron']">{userMedia.length}</div>
            </div>
          </div>
        </div>

        {/* ==================================================================== */}
        {/* 4. NAVIGATION TABS */}
        {/* ==================================================================== */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none border-b border-slate-800">
          {[
            { id: 'overview', label: 'OVERVIEW & CLUBS', icon: User },
            { id: 'status', label: 'MATCH STATUS CARDS', icon: Sparkles, badge: myStatus ? 'ACTIVE' : undefined },
            { id: 'media', label: 'DIGITAL MEDIA & STORAGE', icon: Camera, count: userMedia.length },
            { id: 'predictions', label: 'PAST PREDICTIONS', icon: TrendingUp, count: predictions.length },
            { id: 'history', label: 'USER HISTORY', icon: History, count: activities.length },
            { id: 'security', label: 'EDIT DETAILS & PASSWORD', icon: KeyRound }
          ].map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-['Orbitron'] text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  active
                    ? 'bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-950 shadow-lg shadow-emerald-950/50'
                    : 'bg-slate-900/60 text-slate-300 hover:text-white hover:bg-slate-800/80 border border-slate-800/60'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-black ${
                    active ? 'bg-slate-950 text-emerald-400' : 'bg-emerald-500 text-slate-950 animate-pulse'
                  }`}>
                    {tab.badge}
                  </span>
                )}
                {typeof tab.count === 'number' && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-md font-mono font-bold ${
                    active ? 'bg-slate-950/20 text-slate-950' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ==================================================================== */}
        {/* TAB 1: OVERVIEW & FAVOURITE TEAMS (SUPABASE DETAILS) */}
        {/* ==================================================================== */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-150">
            
            {/* User Bio and Info Dossier */}
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-[#0b1322] border border-slate-800/90 rounded-3xl p-6 shadow-xl space-y-4">
                <h3 className="text-sm font-black text-white font-['Orbitron'] flex items-center gap-2 uppercase tracking-wider">
                  <Info className="w-4 h-4 text-cyan-400" />
                  MEMBER PROFILE DOSSIER
                </h3>

                <div className="space-y-3 text-xs">
                  <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800">
                    <span className="text-slate-400 block text-[10px] uppercase font-mono font-bold mb-1">BIO</span>
                    <p className="text-slate-200 leading-relaxed">
                      {editBio || 'No tactical bio added yet.'}
                    </p>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-mono font-bold">INFO & AFFILIATION</span>
                      <span className="text-white font-semibold">{editInfo || 'Montreal Supporter'}</span>
                    </div>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-mono font-bold">LOCATION</span>
                      <span className="text-white font-semibold">{editLocation || 'Montreal, Canada'}</span>
                    </div>
                    <MapPin className="w-4 h-4 text-emerald-400" />
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-mono font-bold">PHONE / HOTLINE</span>
                      <span className="text-white font-semibold font-mono">{editPhone || 'Not configured'}</span>
                    </div>
                    <Phone className="w-4 h-4 text-cyan-400" />
                  </div>
                </div>

                <button
                  onClick={() => setIsEditingProfile(true)}
                  className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Edit3 className="w-4 h-4 text-cyan-400" />
                  <span>Update Profile Details</span>
                </button>
              </div>

              {/* Media Vault Shortcut */}
              <div className="bg-gradient-to-br from-cyan-950/40 to-slate-900 border border-cyan-500/30 rounded-3xl p-5 shadow-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-['Orbitron'] font-bold text-cyan-400 uppercase tracking-wider">
                    <Camera className="w-4 h-4" />
                    DIGITAL STORAGE
                  </div>
                  <span className="text-[10px] font-mono text-slate-400 font-bold">{userMedia.length} files</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Store high-resolution images, match highlights, tactical recordings, and ticket screenshots directly in Firebase Storage.
                </p>
                <button
                  onClick={() => setActiveTab('media')}
                  className="w-full py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Open Media Vault</span>
                </button>
              </div>
            </div>

            {/* Favourite Teams Showcase */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-[#0b1322] border border-slate-800/90 rounded-3xl p-6 sm:p-7 shadow-xl space-y-5">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                      <Heart className="w-4 h-4 fill-emerald-400" />
                    </div>
                    <div>
                      <h2 className="text-base sm:text-lg font-black text-white font-['Orbitron'] uppercase tracking-wider">
                        USER FAVOURITE TEAMS ({favoriteTeamsList.length})
                      </h2>
                      <span className="text-xs text-slate-400">
                        Clubs saved in your real Supabase profile
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => setIsEditingProfile(true)}
                    className="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer"
                  >
                    <span>Manage Clubs</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                {/* Selected Clubs Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {favoriteTeamsList.map((teamName, i) => {
                    const matchClub = POPULAR_CLUBS.find(c => c.name.toLowerCase() === teamName.toLowerCase());
                    return (
                      <div
                        key={i}
                        className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800/90 hover:border-emerald-500/40 transition-all flex items-center justify-between shadow-md group"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs text-white shadow-inner font-['Orbitron']"
                            style={{ backgroundColor: matchClub?.color || '#0f766e' }}
                          >
                            {teamName.substring(0, 3).toUpperCase()}
                          </div>
                          <div>
                            <span className="font-bold text-white text-xs block group-hover:text-emerald-300 transition-colors">
                              {teamName}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {matchClub ? `${matchClub.league} • ${matchClub.country}` : 'Football Club'}
                            </span>
                          </div>
                        </div>

                        <Heart className="w-4 h-4 text-emerald-400 fill-emerald-400" />
                      </div>
                    );
                  })}
                </div>

                {favoriteTeamsList.length === 0 && (
                  <div className="text-center py-8 text-slate-400 text-xs bg-slate-900/40 rounded-2xl border border-dashed border-slate-800">
                    No favourite teams selected yet. Click "Manage Clubs" or select from discovery below!
                  </div>
                )}

                {/* Quick Add Popular Clubs */}
                <div className="pt-4 border-t border-slate-800/80">
                  <span className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider block mb-2 font-mono">
                    DISCOVER & ADD POPULAR CLUBS:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {POPULAR_CLUBS.filter(c => !favoriteTeamsList.includes(c.name)).slice(0, 8).map(club => (
                      <button
                        key={club.name}
                        onClick={async () => {
                          const updated = [...favoriteTeamsList, club.name];
                          setEditFavoriteTeams(updated);
                          if (user?.id) {
                            await supabase.from('profiles').upsert({
                              id: user.id,
                              favorite_teams: updated,
                              updated_at: new Date().toISOString()
                            });
                            await supabase.auth.updateUser({
                              data: { favorite_teams: updated }
                            });
                          }
                        }}
                        className="text-xs px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-emerald-500/50 transition-all cursor-pointer flex items-center gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5 text-emerald-400" />
                        <span>{club.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Quick Save Favourite Clubs Action Button */}
                <div className="pt-2 flex items-center justify-between border-t border-slate-800/80">
                  <span className="text-[11px] text-slate-400 font-mono">
                    {favoriteTeamsList.length} clubs selected
                  </span>
                  <button
                    type="button"
                    onClick={handleSaveFavoriteTeams}
                    disabled={isSavingTeams}
                    className={`px-4 py-2 rounded-xl text-xs font-bold font-['Orbitron'] tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
                      teamsSavedSuccess
                        ? 'bg-emerald-400 text-slate-950 font-black shadow-lg shadow-emerald-950/50'
                        : 'bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300'
                    }`}
                  >
                    {isSavingTeams ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-emerald-300 border-t-transparent rounded-full animate-spin" />
                        <span>SAVING...</span>
                      </>
                    ) : teamsSavedSuccess ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>✓ SAVED TO SUPABASE!</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-3.5 h-3.5" />
                        <span>SAVE CLUBS TO PROFILE</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Active Match Status Card */}
              {myStatus && (
                <div className="bg-gradient-to-r from-emerald-950/40 via-slate-900 to-black border border-emerald-500/40 rounded-3xl p-6 shadow-2xl space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="font-['Orbitron'] text-xs font-bold text-emerald-400 uppercase tracking-wider">
                        YOUR ACTIVE 24H MATCH STATUS CARD
                      </span>
                    </div>

                    <button
                      onClick={() => {
                        const idx = statuses.findIndex(s => s.id === myStatus.id);
                        setViewingStatusIndex(idx >= 0 ? idx : 0);
                      }}
                      className="px-3 py-1 rounded-xl bg-emerald-500 text-slate-950 text-xs font-black font-['Orbitron'] cursor-pointer shadow hover:bg-emerald-400 transition-colors"
                    >
                      VIEW STORY
                    </button>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-black/60 border border-slate-800">
                    <div>
                      <span className="text-[10px] text-slate-400 font-mono uppercase block">{myStatus.league}</span>
                      <h3 className="text-base font-black text-white font-['Orbitron']">{myStatus.matchFixture}</h3>
                      <p className="text-xs text-cyan-300 font-bold mt-1">Pick: {myStatus.predictionPick}</p>
                    </div>

                    {myStatus.predictedScore && (
                      <div className="text-center sm:text-right">
                        <span className="text-[10px] text-slate-400 font-mono uppercase block">Predicted Score</span>
                        <div className="text-2xl font-black text-emerald-400 font-['Orbitron']">{myStatus.predictedScore}</div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ==================================================================== */}
        {/* TAB 2: REAL MATCH STATUS CARDS (FIREBASE FIRESTORE) */}
        {/* ==================================================================== */}
        {activeTab === 'status' && (
          <div className="space-y-6 animate-in fade-in duration-150">
            <div className="bg-[#0b1322] border border-slate-800/90 rounded-3xl p-6 sm:p-7 shadow-xl space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-black text-white font-['Orbitron'] flex items-center gap-2.5 uppercase tracking-wider">
                    <Sparkles className="w-5 h-5 text-emerald-400" />
                    REAL MATCH STATUS CARDS (STORED IN FIREBASE)
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Every status is a verified match prediction card stored in Firestore and viewable like WhatsApp Stories for 24 hours.
                  </p>
                </div>

                <button
                  onClick={() => setIsCreateStatusOpen(true)}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-black text-xs font-['Orbitron'] tracking-wider shadow-lg shadow-emerald-950/40 transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>ADD MATCH STATUS</span>
                </button>
              </div>

              {/* My Status Spotlight */}
              {myStatus ? (
                <div className="p-6 rounded-3xl bg-gradient-to-br from-cyan-950/40 via-slate-900 to-black border border-cyan-500/40 shadow-xl space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
                      <span className="text-xs font-['Orbitron'] font-bold text-cyan-400 uppercase tracking-wider">
                        YOUR PUBLISHED STATUS IS LIVE IN FIREBASE
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      <span>Expires in 24 hours</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="sm:col-span-2 space-y-2">
                      <span className="text-[10px] text-slate-400 uppercase font-mono">{myStatus.league}</span>
                      <h3 className="text-xl font-black text-white font-['Orbitron']">{myStatus.matchFixture}</h3>
                      <div className="text-sm font-bold text-emerald-400 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4" />
                        <span>{myStatus.predictionPick}</span>
                      </div>
                      {myStatus.caption && (
                        <p className="text-xs text-slate-300 italic pt-1">"{myStatus.caption}"</p>
                      )}
                    </div>

                    {myStatus.predictedScore && (
                      <div className="bg-black/50 border border-slate-800 rounded-2xl p-4 flex flex-col items-center justify-center text-center">
                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">PREDICTED SCORE</span>
                        <div className="text-3xl font-black font-['Orbitron'] text-cyan-300 my-1">{myStatus.predictedScore}</div>
                        <span className="text-[10px] text-slate-400 font-mono">{myStatus.decimalOdds?.toFixed(2)}x Odds</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-slate-800/80">
                    <div className="flex items-center gap-3 text-xs text-slate-400">
                      <span className="flex items-center gap-1 text-cyan-300 font-semibold">
                        <Eye className="w-4 h-4 text-cyan-400" />
                        {myStatus.viewsCount || 1} Views
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1 text-rose-300 font-semibold">
                        <Heart className="w-4 h-4 text-rose-400 fill-rose-400" />
                        {myStatus.likesCount || 0} Likes
                      </span>
                    </div>

                    <button
                      onClick={() => {
                        const idx = statuses.findIndex(s => s.id === myStatus.id);
                        setViewingStatusIndex(idx >= 0 ? idx : 0);
                      }}
                      className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs font-['Orbitron'] transition-colors cursor-pointer"
                    >
                      WATCH STORY
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-10 px-4 rounded-3xl bg-slate-900/50 border border-dashed border-slate-800 space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-bold text-white uppercase font-['Orbitron']">
                    NO ACTIVE STATUS CARD PUBLISHED
                  </h3>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    Post your prediction for upcoming fixtures! It will be stored in Firebase and rendered across the community WhatsApp status reels.
                  </p>
                  <button
                    onClick={() => setIsCreateStatusOpen(true)}
                    className="px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs cursor-pointer hover:bg-emerald-400 transition-colors"
                  >
                    Post Match Status Now
                  </button>
                </div>
              )}

              {/* Real Status Cards List */}
              <div className="space-y-4 pt-4">
                <h3 className="text-xs font-black text-slate-300 font-['Orbitron'] uppercase tracking-wider">
                  ACTIVE COMMUNITY STATUSES ({statuses.length})
                </h3>

                {statuses.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {statuses.map((st, i) => (
                      <div
                        key={st.id || i}
                        onClick={() => setViewingStatusIndex(i)}
                        className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 hover:border-emerald-500/50 transition-all cursor-pointer shadow-lg space-y-3 group"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <img
                              src={st.userAvatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${st.userId}`}
                              alt={st.userName}
                              className="w-8 h-8 rounded-full object-cover bg-slate-800 border border-slate-700"
                            />
                            <span className="text-xs font-bold text-white truncate max-w-[120px]">{st.userName}</span>
                          </div>
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-slate-800 text-cyan-400 font-mono">
                            {st.predictedScore || 'PICK'}
                          </span>
                        </div>

                        <div className="space-y-1">
                          <span className="text-[10px] text-slate-400 font-mono block">{st.league}</span>
                          <h4 className="text-sm font-bold text-white group-hover:text-emerald-300 transition-colors line-clamp-1">
                            {st.matchFixture}
                          </h4>
                          <div className="text-xs text-emerald-400 font-semibold flex items-center gap-1.5">
                            <TrendingUp className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">{st.predictionPick}</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800/80">
                          <div className="flex items-center gap-2">
                            <span className="flex items-center gap-1">
                              <Eye className="w-3 h-3 text-cyan-400" />
                              {st.viewsCount || 1}
                            </span>
                            <span className="flex items-center gap-1">
                              <Heart className="w-3 h-3 text-rose-400" />
                              {st.likesCount || 0}
                            </span>
                          </div>
                          <span className="font-mono text-emerald-400 font-bold">{st.decimalOdds?.toFixed(2)}x</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-500 text-xs bg-slate-900/30 rounded-2xl border border-dashed border-slate-800">
                    No active community match statuses in the database. Be the first to publish one!
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ==================================================================== */}
        {/* TAB 3: DIGITAL MEDIA & ASSETS VAULT (FIREBASE STORAGE) */}
        {/* ==================================================================== */}
        {activeTab === 'media' && (
          <div className="space-y-6 animate-in fade-in duration-150">
            <div className="bg-[#0b1322] border border-slate-800/90 rounded-3xl p-6 sm:p-7 shadow-xl space-y-6">
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-black text-white font-['Orbitron'] flex items-center gap-2.5 uppercase tracking-wider">
                    <Camera className="w-5 h-5 text-cyan-400" />
                    DIGITAL IMAGE & VIDEO STORAGE (FIREBASE STORAGE)
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Upload, store, stream, and download high-resolution match photos, screenshots, and tactical video clips.
                  </p>
                </div>
              </div>

              {/* Upload Dropzone Container */}
              <div className="p-6 rounded-3xl bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-700/80 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <span className="text-xs font-bold text-white uppercase font-['Orbitron'] block">
                      UPLOAD DIGITAL MEDIA FILE
                    </span>
                    <span className="text-xs text-slate-400">
                      Supports PNG, JPG, WEBP, MP4, WEBM clips up to 50MB
                    </span>
                  </div>

                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*,video/*"
                    onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                    className="hidden"
                  />

                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center gap-2 border border-slate-700 cursor-pointer"
                  >
                    <Upload className="w-4 h-4 text-cyan-400" />
                    <span>Choose Image or Video</span>
                  </button>
                </div>

                {uploadFile && (
                  <div className="p-4 rounded-2xl bg-slate-950 border border-cyan-500/40 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {uploadFile.type.startsWith('video/') ? (
                          <Film className="w-6 h-6 text-purple-400" />
                        ) : (
                          <Camera className="w-6 h-6 text-emerald-400" />
                        )}
                        <div>
                          <span className="text-xs font-bold text-white block">{uploadFile.name}</span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {(uploadFile.size / (1024 * 1024)).toFixed(2)} MB • {uploadFile.type}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => setUploadFile(null)}
                        className="p-1 text-slate-400 hover:text-red-400 cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {uploadProgress > 0 && (
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                          <span>Uploading to Firebase Storage...</span>
                          <span>{uploadProgress}%</span>
                        </div>
                        <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-cyan-400 h-full transition-all duration-150"
                            style={{ width: `${uploadProgress}%` }}
                          />
                        </div>
                      </div>
                    )}

                    <button
                      onClick={handleUploadMediaFile}
                      disabled={isUploading}
                      className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 font-black text-xs font-['Orbitron'] tracking-wider shadow-lg cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      <Upload className="w-4 h-4" />
                      <span>{isUploading ? `UPLOADING (${uploadProgress}%)...` : 'START UPLOAD TO FIREBASE STORAGE'}</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Uploaded Media Gallery */}
              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black text-white font-['Orbitron'] uppercase tracking-wider">
                    STORED MEDIA ASSETS ({userMedia.length})
                  </h3>
                  <button
                    onClick={async () => {
                      if (user?.id) {
                        const m = await fetchUserMedia(user.id);
                        setUserMedia(m);
                      }
                    }}
                    className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>

                {userMedia.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {userMedia.map((m) => (
                      <div
                        key={m.id}
                        className="bg-slate-900 border border-slate-800 rounded-3xl p-4 shadow-lg space-y-3 flex flex-col justify-between"
                      >
                        <div className="space-y-2">
                          {/* Media Preview Box */}
                          <div className="w-full h-44 rounded-2xl bg-black overflow-hidden flex items-center justify-center border border-slate-800">
                            {m.mediaType === 'video' ? (
                              <video
                                src={m.downloadUrl}
                                controls
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <img
                                src={m.downloadUrl}
                                alt={m.name}
                                className="w-full h-full object-cover hover:scale-105 transition-transform"
                              />
                            )}
                          </div>

                          <div>
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-cyan-400 font-bold uppercase">
                                {m.mediaType}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                {(m.size / (1024 * 1024)).toFixed(2)} MB
                              </span>
                            </div>
                            <h4 className="text-xs font-bold text-white mt-1 truncate" title={m.name}>
                              {m.name}
                            </h4>
                            <span className="text-[10px] text-slate-500 font-mono block">
                              {new Date(m.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>

                        {/* Action buttons: Download, Copy Link, Delete */}
                        <div className="pt-2 border-t border-slate-800 flex items-center gap-2">
                          <a
                            href={m.downloadUrl}
                            download={m.name}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Download</span>
                          </a>

                          <button
                            onClick={() => copyMediaUrl(m.downloadUrl)}
                            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                            title="Copy Direct URL"
                          >
                            {copiedUrl === m.downloadUrl ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>

                          <button
                            onClick={() => handleDeleteMedia(m)}
                            className="p-2 rounded-xl bg-slate-800 hover:bg-red-950/60 text-slate-400 hover:text-red-400 transition-colors"
                            title="Delete file"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-10 px-4 rounded-3xl bg-slate-900/40 border border-dashed border-slate-800 space-y-2">
                    <Camera className="w-8 h-8 text-slate-600 mx-auto" />
                    <p className="text-xs text-slate-400">
                      No images or videos uploaded yet. Choose a file above to upload to Firebase Storage!
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ==================================================================== */}
        {/* TAB 4: REAL PAST PREDICTIONS (FIREBASE & SUPABASE) */}
        {/* ==================================================================== */}
        {activeTab === 'predictions' && (
          <div className="space-y-6 animate-in fade-in duration-150">
            
            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-[#0b1322] border border-slate-800 rounded-2xl p-5 space-y-1">
                <span className="text-xs font-['Orbitron'] font-bold text-cyan-400 uppercase">REAL LOGGED PICKS</span>
                <div className="text-2xl font-black text-white font-['Orbitron']">{predictions.length}</div>
                <p className="text-[11px] text-slate-400">Stored in Firebase user_predictions</p>
              </div>

              <div className="bg-[#0b1322] border border-slate-800 rounded-2xl p-5 space-y-1">
                <span className="text-xs font-['Orbitron'] font-bold text-emerald-400 uppercase">CALCULATED WIN RATE</span>
                <div className="text-2xl font-black text-emerald-400 font-['Orbitron']">{personalWinRate}%</div>
                <p className="text-[11px] text-slate-400">{wonPreds} verified winning slips</p>
              </div>

              <div className="bg-[#0b1322] border border-slate-800 rounded-2xl p-5 space-y-1">
                <span className="text-xs font-['Orbitron'] font-bold text-purple-400 uppercase">DATABASE STATUS</span>
                <div className="text-2xl font-black text-purple-400 font-['Orbitron']">LIVE SYNC ✅</div>
                <p className="text-[11px] text-slate-400">Real-time settlement validation</p>
              </div>
            </div>

            {/* Predictions List Container */}
            <div className="bg-[#0b1322] border border-slate-800/90 rounded-3xl p-6 sm:p-7 shadow-xl space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-base sm:text-lg font-black text-white font-['Orbitron'] flex items-center gap-2.5 uppercase tracking-wider">
                    <TrendingUp className="w-5 h-5 text-cyan-400" />
                    PAST PREDICTIONS ARCHIVE ({predictions.length})
                  </h2>
                  <p className="text-xs text-slate-400">
                    Your real prediction slips and settlement records
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsAddPredictionOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-black text-xs font-['Orbitron'] cursor-pointer shadow-md"
                  >
                    <Plus className="w-4 h-4" />
                    <span>LOG PREDICTION</span>
                  </button>
                  <Link
                    to="/past-predictions"
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white text-xs font-bold"
                  >
                    <span>Global Archive</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>

              {predictions.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left font-sans text-xs sm:text-sm">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 font-['Orbitron'] text-[11px] uppercase tracking-wider">
                        <th className="pb-3 px-4">Fixture</th>
                        <th className="pb-3 px-4">Pick</th>
                        <th className="pb-3 px-4">Predicted</th>
                        <th className="pb-3 px-4">Odds</th>
                        <th className="pb-3 px-4">Result</th>
                        <th className="pb-3 px-4">Status</th>
                        <th className="pb-3 px-4">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {predictions.map((p, idx) => (
                        <tr key={p.id || idx} className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-3.5 px-4 font-bold text-white">
                            <span>{p.fixture}</span>
                            <span className="block text-[10px] text-slate-400 font-normal">{p.league}</span>
                          </td>
                          <td className="py-3.5 px-4 text-cyan-300 font-semibold">{p.pick}</td>
                          <td className="py-3.5 px-4 font-mono font-bold text-slate-300">{p.predictedScore || '—'}</td>
                          <td className="py-3.5 px-4 font-mono font-bold text-emerald-400">{p.odds.toFixed(2)}x</td>
                          <td className="py-3.5 px-4 font-mono text-white font-extrabold">{p.finalScore || 'Pending'}</td>
                          <td className="py-3.5 px-4">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold tracking-wider ${
                              p.outcome === 'WON'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                : p.outcome === 'LOST'
                                ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                                : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            }`}>
                              {p.outcome}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-xs font-mono text-slate-400">{p.matchDate}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-10 text-slate-400 text-xs bg-slate-900/40 rounded-2xl border border-dashed border-slate-800">
                  No personal predictions logged yet. Click "LOG PREDICTION" to add your first real pick!
                </div>
              )}
            </div>
          </div>
        )}

        {/* ==================================================================== */}
        {/* TAB 5: REAL USER HISTORY TIMELINE */}
        {/* ==================================================================== */}
        {activeTab === 'history' && (
          <div className="space-y-6 animate-in fade-in duration-150">
            <div className="bg-[#0b1322] border border-slate-800/90 rounded-3xl p-6 sm:p-7 shadow-xl space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base sm:text-lg font-black text-white font-['Orbitron'] flex items-center gap-2.5 uppercase tracking-wider">
                    <History className="w-5 h-5 text-cyan-400" />
                    REAL USER ACTIVITY AUDIT TIMELINE
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Audited timeline events recorded directly in Firebase Firestore
                  </p>
                </div>

                <button
                  onClick={async () => {
                    if (user?.id) {
                      const updated = await fetchUserActivities(user.id);
                      setActivities(updated);
                    }
                  }}
                  className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white"
                  title="Refresh activity feed"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>

              {/* Timeline Items */}
              {activities.length > 0 ? (
                <div className="space-y-4 relative before:absolute before:left-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
                  {activities.map((act, i) => (
                    <div key={act.id || i} className="relative pl-10">
                      <div className="absolute left-2.5 top-1.5 -translate-x-1/2 w-4 h-4 rounded-full bg-slate-950 border-2 border-cyan-400 flex items-center justify-center">
                        <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                      </div>

                      <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <span className="font-bold text-white text-xs sm:text-sm font-['Plus_Jakarta_Sans']">
                            {act.title}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400">
                            {new Date(act.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed">{act.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 text-slate-400 text-xs bg-slate-900/40 rounded-2xl border border-dashed border-slate-800">
                  No activity history recorded yet. Actions like posting statuses, updating profiles, and uploading media will appear here in real time.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ==================================================================== */}
        {/* TAB 6: EDIT PROFILE DETAILS & PASSWORD (SUPABASE) */}
        {/* ==================================================================== */}
        {activeTab === 'security' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in duration-150">
            
            {/* Edit Profile Details Box */}
            <div className="bg-[#0b1322] border border-slate-800/90 rounded-3xl p-6 sm:p-7 shadow-xl space-y-5">
              <div className="flex items-center gap-2.5 border-b border-slate-800 pb-3">
                <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 font-bold">
                  <Edit3 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white font-['Orbitron'] uppercase tracking-wider">
                    EDIT PROFILE DETAILS
                  </h3>
                  <span className="text-[11px] text-slate-400">
                    Primary persistence to Supabase profiles table
                  </span>
                </div>
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div>
                  <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-1">
                    Display Name / Username *
                  </label>
                  <input
                    type="text"
                    required
                    value={editDisplayName}
                    onChange={(e) => setEditDisplayName(e.target.value)}
                    className="w-full bg-[#060c18] border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-1">
                    Bio / Tactical Analysis Quote
                  </label>
                  <textarea
                    rows={2}
                    value={editBio}
                    onChange={(e) => setEditBio(e.target.value)}
                    className="w-full bg-[#060c18] border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-1">
                      City / Location
                    </label>
                    <input
                      type="text"
                      value={editLocation}
                      onChange={(e) => setEditLocation(e.target.value)}
                      className="w-full bg-[#060c18] border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-1">
                      Phone / Hotline
                    </label>
                    <input
                      type="text"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      className="w-full bg-[#060c18] border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-1">
                    Avatar Image URL (or upload below)
                  </label>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={editAvatarUrl}
                    onChange={(e) => setEditAvatarUrl(e.target.value)}
                    className="w-full bg-[#060c18] border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSavingProfile}
                  className={`w-full py-3 rounded-xl font-black text-xs font-['Orbitron'] tracking-wider shadow-lg transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 ${
                    saveSuccessMsg
                      ? 'bg-emerald-400 text-slate-950 shadow-emerald-500/50 scale-[1.01]'
                      : 'bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 shadow-emerald-950/40'
                  }`}
                >
                  {isSavingProfile ? (
                    <>
                      <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                      <span>SAVING PROFILE...</span>
                    </>
                  ) : saveSuccessMsg ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-slate-950" />
                      <span>✓ SAVED TO ACCOUNT DATABASE!</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>SAVE DETAILS</span>
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Change Password Box */}
            <div className="bg-[#0b1322] border border-slate-800/90 rounded-3xl p-6 sm:p-7 shadow-xl space-y-5">
              <div className="flex items-center gap-2.5 border-b border-slate-800 pb-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 font-bold">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white font-['Orbitron'] uppercase tracking-wider">
                    UPDATE PASSWORD
                  </h3>
                  <span className="text-[11px] text-slate-400">
                    Secured by platform authentication encryption
                  </span>
                </div>
              </div>

              <form onSubmit={handleUpdatePassword} className="space-y-4">
                <div>
                  <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-1">
                    New Password *
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="Minimum 6 characters"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full bg-[#060c18] border border-slate-800 rounded-xl p-2.5 pr-10 text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(p => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-1">
                    Confirm New Password *
                  </label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Repeat password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-[#060c18] border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {passwordStatus.msg && (
                  <div className={`p-3 rounded-xl text-xs font-semibold ${
                    passwordStatus.type === 'success'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-red-500/20 text-red-300 border border-red-500/40'
                  }`}>
                    {passwordStatus.msg}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isUpdatingPassword}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 font-black text-xs font-['Orbitron'] tracking-wider shadow-lg shadow-cyan-950/40 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Lock className="w-4 h-4" />
                  <span>{isUpdatingPassword ? 'UPDATING...' : 'UPDATE PASSWORD'}</span>
                </button>
              </form>
            </div>
          </div>
        )}

      </div>

      {/* ==================================================================== */}
      {/* MODAL: EDIT PROFILE & CLUBS */}
      {/* ==================================================================== */}
      {isEditingProfile && (
        <div className="fixed inset-0 z-[150] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-[#0b1322] border border-slate-700/80 rounded-3xl w-full max-w-2xl p-6 sm:p-7 shadow-2xl my-8 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 font-bold">
                  <Edit3 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white font-['Orbitron'] uppercase tracking-wider">
                    EDIT USER PROFILE & CLUBS
                  </h3>
                  <span className="text-[11px] text-slate-400">
                    Saved directly to account database
                  </span>
                </div>
              </div>
              <button onClick={() => setIsEditingProfile(false)} className="text-slate-400 hover:text-white p-1 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-bold text-cyan-400 block mb-1 uppercase tracking-wider">
                    Display Name / Handle *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Alex Mercer or @alex_scout (Required display name)"
                    value={editDisplayName}
                    onChange={(e) => setEditDisplayName(e.target.value)}
                    className="w-full bg-[#060c18] border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-cyan-400 block mb-1 uppercase tracking-wider">
                    Location / City
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Montreal, Canada (Required location format)"
                    value={editLocation}
                    onChange={(e) => setEditLocation(e.target.value)}
                    className="w-full bg-[#060c18] border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-cyan-400 block mb-1 uppercase tracking-wider">
                  Bio / Tactical Philosophy
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Senior Match Analyst & Tactical Scout at MTL Hub... (Required profile bio)"
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  className="w-full bg-[#060c18] border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              {/* Favourite Teams Selector */}
              <div>
                <label className="text-[11px] font-bold text-cyan-400 block mb-1.5 uppercase tracking-wider">
                  Select Favourite Football Clubs:
                </label>
                <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto p-2 bg-[#060c18] border border-slate-800 rounded-xl">
                  {POPULAR_CLUBS.map(club => {
                    const isSelected = editFavoriteTeams.includes(club.name);
                    return (
                      <button
                        key={club.name}
                        type="button"
                        onClick={() => toggleFavoriteTeam(club.name)}
                        className={`text-xs px-3 py-1.5 rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 ${
                          isSelected
                            ? 'bg-emerald-500 text-slate-950 font-bold border-emerald-400 shadow'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        <Heart className={`w-3.5 h-3.5 ${isSelected ? 'fill-slate-950 text-slate-950' : 'text-slate-500'}`} />
                        <span>{club.name}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Custom Team Input */}
                <div className="flex items-center gap-2 mt-2">
                  <input
                    type="text"
                    placeholder="Add custom club (e.g. Celtic, Boca Juniors)..."
                    value={customTeamInput}
                    onChange={(e) => setCustomTeamInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCustomTeam();
                      }
                    }}
                    className="flex-1 bg-[#060c18] border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomTeam}
                    className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold"
                  >
                    + Add
                  </button>
                </div>
              </div>

              <div className="flex gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditingProfile(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingProfile}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-black text-xs font-['Orbitron'] shadow-md cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {isSavingProfile ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                      <span>SAVING...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>SAVE CHANGES</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL: ADD PERSONAL PREDICTION */}
      {/* ==================================================================== */}
      {isAddPredictionOpen && (
        <div className="fixed inset-0 z-[150] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-[#0b1322] border border-slate-700/80 rounded-3xl w-full max-w-lg p-6 shadow-2xl my-8 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-black text-white font-['Orbitron'] uppercase">LOG PERSONAL PREDICTION</h3>
              </div>
              <button onClick={() => setIsAddPredictionOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddPersonalPrediction} className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-slate-300 uppercase block mb-1">Fixture *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. CF Montréal vs Toronto FC"
                  value={predForm.fixture}
                  onChange={(e) => setPredForm({ ...predForm, fixture: e.target.value })}
                  className="w-full bg-[#060c18] border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-300 uppercase block mb-1">Pick *</label>
                  <input
                    type="text"
                    required
                    placeholder="Home Win / Over 2.5"
                    value={predForm.pick}
                    onChange={(e) => setPredForm({ ...predForm, pick: e.target.value })}
                    className="w-full bg-[#060c18] border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-300 uppercase block mb-1">Score</label>
                  <input
                    type="text"
                    placeholder="2 - 1"
                    value={predForm.predictedScore}
                    onChange={(e) => setPredForm({ ...predForm, predictedScore: e.target.value })}
                    className="w-full bg-[#060c18] border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono text-center font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-300 uppercase block mb-1">Odds</label>
                  <input
                    type="number"
                    step="0.05"
                    value={predForm.odds}
                    onChange={(e) => setPredForm({ ...predForm, odds: e.target.value })}
                    className="w-full bg-[#060c18] border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-300 uppercase block mb-1">Date</label>
                  <input
                    type="date"
                    value={predForm.matchDate}
                    onChange={(e) => setPredForm({ ...predForm, matchDate: e.target.value })}
                    className="w-full bg-[#060c18] border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddPredictionOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs font-['Orbitron']"
                >
                  SAVE RECORD TO FIREBASE
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* STATUS STORY VIEWER & CREATE STATUS MODALS */}
      {/* ==================================================================== */}
      {viewingStatusIndex !== null && (
        <StatusViewerModal
          statuses={statuses}
          initialIndex={viewingStatusIndex}
          isOpen={true}
          onClose={() => setViewingStatusIndex(null)}
          currentUserId={user?.id || 'guest'}
        />
      )}

      {isCreateStatusOpen && (
        <CreateStatusModal
          isOpen={isCreateStatusOpen}
          onClose={() => setIsCreateStatusOpen(false)}
          currentUser={user}
          userProfile={userProfile}
          onStatusCreated={(newStatus) => {
            setStatuses(prev => [newStatus, ...prev.filter(s => s.id !== newStatus.id)]);
            setSaveSuccessMsg('✓ Status published live across all registered users!');
            setTimeout(() => setSaveSuccessMsg(null), 3500);
            fetchUserStatuses().then(list => {
              if (Array.isArray(list)) setStatuses(list);
            });
          }}
        />
      )}

      {/* Floating Action Button */}
      <UniversalFAB
        showBackToDashboard={true}
        customActions={[
          {
            id: 'post_status',
            label: 'Post Match Status',
            description: 'Share 24h WhatsApp match card',
            icon: <Sparkles className="w-4 h-4 text-emerald-400" />,
            onClick: () => setIsCreateStatusOpen(true)
          },
          {
            id: 'upload_media',
            label: 'Upload Media Asset',
            description: 'Image or video to Firebase Storage',
            icon: <Camera className="w-4 h-4 text-purple-400" />,
            onClick: () => {
              setActiveTab('media');
              setTimeout(() => fileInputRef.current?.click(), 100);
            }
          },
          {
            id: 'edit_profile',
            label: 'Edit Profile Details',
            description: 'Update info & clubs',
            icon: <Edit3 className="w-4 h-4 text-cyan-400" />,
            onClick: () => setIsEditingProfile(true)
          }
        ]}
      />
    </div>
  );
}
