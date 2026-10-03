import React, { useState } from 'react';
import { 
  X, 
  Sparkles, 
  TrendingUp, 
  Star, 
  Send, 
  Camera, 
  Film, 
  Upload, 
  Check, 
  ChevronRight, 
  ChevronLeft,
  Eye,
  Play,
  RotateCcw,
  Zap,
  Info
} from 'lucide-react';
import { saveUserMatchStatus, MatchCardStatus, uploadDigitalMedia, StatusType } from '../config/firebaseStore.ts';
import { AiAutoCompleteButton } from './AiAutoCompleteButton.tsx';

interface CreateStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: any;
  userProfile: any;
  onStatusCreated: (newStatus: MatchCardStatus) => void;
}

const PRESET_FIXTURES = [
  { match: 'CF Montréal vs Toronto FC', league: 'MLS Canadian Classique' },
  { match: 'Arsenal vs Chelsea', league: 'Premier League London Derby' },
  { match: 'Real Madrid vs Barcelona', league: 'La Liga El Clásico' },
  { match: 'Liverpool vs Manchester City', league: 'Premier League Title Clash' },
  { match: 'Bayern Munich vs Dortmund', league: 'Bundesliga Der Klassiker' },
  { match: 'Inter Miami vs NYCFC', league: 'MLS Eastern Conference' }
];

const PRESET_PICKS = [
  'Home Win & Over 2.5 Goals',
  'Both Teams To Score (BTTS: Yes)',
  'Over 2.5 Total Match Goals',
  'Exact Scoreline: 2 - 1',
  'Draw / Under 2.5 Goals',
  'Away Win (Draw No Bet)'
];

const THEME_OPTIONS = [
  { id: 'emerald', label: 'Neon Emerald', bg: 'bg-emerald-500', border: 'border-emerald-400' },
  { id: 'cyan', label: 'Cyber Cyan', bg: 'bg-cyan-500', border: 'border-cyan-400' },
  { id: 'purple', label: 'Cosmic Purple', bg: 'bg-purple-500', border: 'border-purple-400' },
  { id: 'amber', label: 'Solar Gold', bg: 'bg-amber-500', border: 'border-amber-400' },
  { id: 'rose', label: 'Crimson Fire', bg: 'bg-rose-500', border: 'border-rose-400' },
];

// Sample media presets so users can test Reel & Image statuses instantly
const SAMPLE_REEL_VIDEO = 'https://assets.mixkit.co/videos/preview/mixkit-soccer-player-kicking-ball-in-stadium-41126-large.mp4';
const SAMPLE_IMAGE_PHOTO = 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=1000&q=80';

export const CreateStatusModal: React.FC<CreateStatusModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  userProfile,
  onStatusCreated
}) => {
  // Separate Container Cards Navigation (Card 1: Format & Match, Card 2: Prediction / Score, Card 3: Media Vault, Card 4: Banter & Preview)
  const [activeCard, setActiveCard] = useState<1 | 2 | 3 | 4>(1);

  // Status format: 'match_card' | 'reel' | 'image'
  const [statusType, setStatusType] = useState<StatusType>('match_card');

  // Form Fields
  const [fixture, setFixture] = useState('CF Montréal vs Toronto FC');
  const [league, setLeague] = useState('MLS Canadian Classique');
  const [predictionPick, setPredictionPick] = useState('Home Win & Over 2.5 Goals');
  const [predictedScore, setPredictedScore] = useState('2 - 1');
  const [decimalOdds, setDecimalOdds] = useState('2.15');
  const [confidenceStars, setConfidenceStars] = useState(5);
  const [caption, setCaption] = useState('');
  const [themeColor, setThemeColor] = useState('emerald');

  // Digital Media Vault States (Reel Video or Match Image)
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [mediaPreviewUrl, setMediaPreviewUrl] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video' | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState('');

  if (!isOpen) return null;

  const handleAiComplete = (res: any) => {
    if (res.fixture) setFixture(res.fixture);
    if (res.league) setLeague(res.league);
    if (res.predictionPick) setPredictionPick(res.predictionPick);
    if (res.predictedScore) setPredictedScore(res.predictedScore);
    if (res.decimalOdds) setDecimalOdds(String(res.decimalOdds));
    if (res.confidenceStars) setConfidenceStars(res.confidenceStars);
    if (res.caption) setCaption(res.caption);
    setFeedbackMsg('✨ Gemini AI auto-filled status details with high-accuracy tactical data!');
  };

  const handleSelectPresetFixture = (item: typeof PRESET_FIXTURES[0]) => {
    setFixture(item.match);
    setLeague(item.league);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAttachedFile(file);
    const isVid = file.type.startsWith('video/');
    setMediaType(isVid ? 'video' : 'image');
    setMediaPreviewUrl(URL.createObjectURL(file));

    if (isVid) {
      setStatusType('reel');
      if (themeColor === 'emerald') setThemeColor('purple');
    } else {
      if (statusType === 'match_card' && !predictedScore) {
        setStatusType('image');
      }
    }
  };

  const applySampleReel = () => {
    setAttachedFile(null);
    setMediaPreviewUrl(SAMPLE_REEL_VIDEO);
    setMediaType('video');
    setStatusType('reel');
    setThemeColor('purple');
    if (!caption) setCaption('Sensational counter-attack strike in the 88th minute! 🚀⚽');
  };

  const applySampleImage = () => {
    setAttachedFile(null);
    setMediaPreviewUrl(SAMPLE_IMAGE_PHOTO);
    setMediaType('image');
    setStatusType('image');
    setThemeColor('cyan');
    if (!caption) setCaption('Electric matchday atmosphere under the floodlights tonight! 🔥🏟️');
  };

  const removeAttachedFile = () => {
    setAttachedFile(null);
    setMediaPreviewUrl(null);
    setMediaType(null);
    setUploadProgress(0);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!fixture.trim()) {
      setActiveCard(1);
      setFeedbackMsg('Please specify a match fixture title.');
      return;
    }

    setIsSubmitting(true);
    setFeedbackMsg('Saving status to database across all registered users...');

    try {
      const authorName = 
        userProfile?.username || 
        userProfile?.full_name || 
        currentUser?.user_metadata?.username || 
        currentUser?.user_metadata?.full_name || 
        currentUser?.email?.split('@')[0] || 
        'MTL Footballer';

      const authorAvatar = 
        userProfile?.avatar_url || 
        currentUser?.user_metadata?.avatar_url || 
        `https://api.dicebear.com/7.x/bottts/svg?seed=${currentUser?.id || 'mtl'}`;

      let uploadedMediaUrl: string | undefined = mediaPreviewUrl || undefined;
      let uploadedMediaType: 'image' | 'video' | undefined = mediaType || undefined;

      // Upload file to Firebase Storage if a real local file is selected
      if (attachedFile) {
        try {
          const asset = await uploadDigitalMedia(
            attachedFile,
            attachedFile.name,
            currentUser?.id || 'guest',
            (pct) => setUploadProgress(pct)
          );
          uploadedMediaUrl = asset.downloadUrl;
          uploadedMediaType = asset.mediaType;
        } catch (uploadErr) {
          console.warn('Media upload warning, using local preview url:', uploadErr);
        }
      }

      const newStatus = await saveUserMatchStatus({
        userId: currentUser?.id || 'guest',
        userName: authorName,
        userAvatar: authorAvatar,
        statusType,
        matchFixture: fixture.trim(),
        league: league.trim() || 'Football League',
        predictionPick: predictionPick.trim() || (statusType === 'reel' ? 'Match Reel Highlight' : statusType === 'image' ? 'Matchday Photo' : 'Match Prediction Pick'),
        predictedScore: statusType === 'match_card' ? (predictedScore.trim() || undefined) : (predictedScore.trim() || undefined),
        decimalOdds: parseFloat(decimalOdds) || 2.0,
        confidenceStars: Number(confidenceStars),
        caption: caption.trim() || undefined,
        mediaUrl: uploadedMediaUrl,
        mediaType: uploadedMediaType,
        themeColor,
      });

      onStatusCreated(newStatus);
      onClose();
    } catch (err: any) {
      console.error('Failed to publish match status:', err);
      setFeedbackMsg('Failed to save status: ' + (err.message || 'Check network connection'));
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[160] bg-black/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-[#08101d] border border-slate-700/80 rounded-3xl w-full max-w-2xl p-4 sm:p-6 shadow-2xl my-auto flex flex-col gap-4">
        
        {/* ================================================================== */}
        {/* MODAL HEADER */}
        {/* ================================================================== */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 via-cyan-500 to-indigo-500 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-emerald-950/50">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black text-white font-['Orbitron'] tracking-wide uppercase">
                POST 24H COMMUNITY STATUS
              </h2>
              <span className="text-[11px] text-emerald-400 font-mono flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
                Live on all registered users' screens
              </span>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ================================================================== */}
        {/* SEPARATE CONTAINER CARDS SELECTOR (NO CRAMPED SCROLLING) */}
        {/* ================================================================== */}
        <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
          {[
            { num: 1, label: 'Fixture', full: '1. Format & Match', icon: <TrendingUp className="w-3.5 h-3.5" /> },
            { num: 2, label: 'Prediction', full: '2. Tip & Score', icon: <Zap className="w-3.5 h-3.5" /> },
            { num: 3, label: 'Media', full: '3. Reel / Image', icon: <Film className="w-3.5 h-3.5" /> },
            { num: 4, label: 'Preview', full: '4. Theme & Post', icon: <Eye className="w-3.5 h-3.5" /> }
          ].map(c => {
            const isActive = activeCard === c.num;
            return (
              <button
                key={c.num}
                type="button"
                onClick={() => setActiveCard(c.num as any)}
                className={`py-2 px-2 rounded-xl border text-[11px] font-bold font-['Orbitron'] transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  isActive
                    ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 shadow-lg shadow-emerald-950/40'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                {c.icon}
                <span className="hidden sm:inline">{c.full}</span>
                <span className="sm:hidden">{c.label}</span>
              </button>
            );
          })}
        </div>

        {/* Feedback message banner if needed */}
        {feedbackMsg && (
          <div className="px-3 py-1.5 rounded-xl bg-cyan-950/60 border border-cyan-500/40 text-[11px] text-cyan-300 flex items-center gap-2">
            <Info className="w-4 h-4 shrink-0" />
            <span>{feedbackMsg}</span>
          </div>
        )}

        {/* ================================================================== */}
        {/* CONTAINER CARD 1: STATUS FORMAT & MATCH FIXTURE */}
        {/* ================================================================== */}
        {activeCard === 1 && (
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-[#0c1626] to-[#08101d] border border-slate-700/80 shadow-xl space-y-4 animate-in fade-in duration-150">
            
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
              <span className="text-[11px] font-black text-cyan-400 uppercase tracking-wider font-mono">
                CARD 1: CHOOSE PRESENTATION FORMAT & FIXTURE
              </span>
              <div className="flex items-center gap-2">
                <AiAutoCompleteButton
                  type="match_card"
                  contextText={fixture}
                  onComplete={handleAiComplete}
                  label="Gemini AI Auto-Fill"
                  variant="inline"
                />
                <span className="text-[10px] text-slate-400 font-mono">Step 1 of 4</span>
              </div>
            </div>

            {/* Format Tiles */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setStatusType('match_card');
                  setThemeColor('emerald');
                }}
                className={`p-3 rounded-xl border flex flex-col items-start gap-1 transition-all cursor-pointer text-left ${
                  statusType === 'match_card'
                    ? 'bg-emerald-500/20 border-emerald-400 text-white shadow-md shadow-emerald-950/50 ring-1 ring-emerald-400'
                    : 'bg-slate-900/70 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  {statusType === 'match_card' && <Check className="w-4 h-4 text-emerald-400" />}
                </div>
                <span className="font-bold text-xs text-white">Match Prediction</span>
                <span className="text-[10px] text-slate-400 leading-tight">Card with fixture, scoreline & odds</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setStatusType('reel');
                  setThemeColor('purple');
                  if (!mediaPreviewUrl) applySampleReel();
                }}
                className={`p-3 rounded-xl border flex flex-col items-start gap-1 transition-all cursor-pointer text-left ${
                  statusType === 'reel'
                    ? 'bg-purple-500/20 border-purple-400 text-white shadow-md shadow-purple-950/50 ring-1 ring-purple-400'
                    : 'bg-slate-900/70 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <div className="w-7 h-7 rounded-lg bg-purple-500/20 flex items-center justify-center text-purple-400 font-bold">
                    <Film className="w-4 h-4" />
                  </div>
                  {statusType === 'reel' && <Check className="w-4 h-4 text-purple-400" />}
                </div>
                <span className="font-bold text-xs text-white">Video Reel Status</span>
                <span className="text-[10px] text-slate-400 leading-tight">Highlight video clip with player</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setStatusType('image');
                  setThemeColor('cyan');
                  if (!mediaPreviewUrl) applySampleImage();
                }}
                className={`p-3 rounded-xl border flex flex-col items-start gap-1 transition-all cursor-pointer text-left ${
                  statusType === 'image'
                    ? 'bg-cyan-500/20 border-cyan-400 text-white shadow-md shadow-cyan-950/50 ring-1 ring-cyan-400'
                    : 'bg-slate-900/70 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <div className="w-7 h-7 rounded-lg bg-cyan-500/20 flex items-center justify-center text-cyan-400 font-bold">
                    <Camera className="w-4 h-4" />
                  </div>
                  {statusType === 'image' && <Check className="w-4 h-4 text-cyan-400" />}
                </div>
                <span className="font-bold text-xs text-white">Image Status</span>
                <span className="text-[10px] text-slate-400 leading-tight">Photo, match ticket or stadium snap</span>
              </button>
            </div>

            {/* Preset Fixture Chips */}
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5 font-mono">
                QUICK SELECT DERBY / MATCH FIXTURE:
              </span>
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
                {PRESET_FIXTURES.map((p, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleSelectPresetFixture(p)}
                    className={`px-2.5 py-1 rounded-lg text-xs whitespace-nowrap border transition-all cursor-pointer ${
                      fixture === p.match
                        ? 'bg-cyan-500 text-slate-950 font-bold border-cyan-400 shadow'
                        : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white hover:border-slate-700'
                    }`}
                  >
                    {p.match.split(' vs ')[0]}
                  </button>
                ))}
              </div>
            </div>

            {/* Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-300 uppercase block mb-1">
                  Match Fixture *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. CF Montréal vs Toronto FC"
                  value={fixture}
                  onChange={(e) => setFixture(e.target.value)}
                  className="w-full bg-[#050b15] border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-300 uppercase block mb-1">
                  League / Competition
                </label>
                <input
                  type="text"
                  placeholder="e.g. MLS Canadian Classique"
                  value={league}
                  onChange={(e) => setLeague(e.target.value)}
                  className="w-full bg-[#050b15] border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            {/* Card Navigation */}
            <div className="flex justify-between items-center pt-2 border-t border-slate-800/80">
              <span className="text-[10px] text-slate-500 font-mono">Separate card container</span>
              <button
                type="button"
                onClick={() => setActiveCard(2)}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-950 font-black text-xs font-['Orbitron'] flex items-center gap-1.5 cursor-pointer hover:from-emerald-400 hover:to-cyan-400 shadow-md"
              >
                <span>NEXT: TIP & SCORELINE</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ================================================================== */}
        {/* CONTAINER CARD 2: PREDICTION TIP, SCORELINE & ODDS */}
        {/* ================================================================== */}
        {activeCard === 2 && (
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-[#0c1626] to-[#08101d] border border-slate-700/80 shadow-xl space-y-4 animate-in fade-in duration-150">
            
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
              <span className="text-[11px] font-black text-cyan-400 uppercase tracking-wider font-mono">
                CARD 2: TACTICAL PREDICTION & SCORELINE
              </span>
              <div className="flex items-center gap-2">
                <AiAutoCompleteButton
                  type="match_card"
                  contextText={fixture + ' ' + predictionPick}
                  onComplete={handleAiComplete}
                  label="Suggest Tip & Score"
                  variant="inline"
                />
                <span className="text-[10px] text-slate-400 font-mono">Step 2 of 4</span>
              </div>
            </div>

            {/* Prediction Pick Input */}
            <div>
              <label className="text-[11px] font-bold text-slate-300 uppercase block mb-1">
                Prediction Pick / Headline *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Home Win & Over 2.5 Goals"
                value={predictionPick}
                onChange={(e) => setPredictionPick(e.target.value)}
                className="w-full bg-[#050b15] border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            {/* Preset Pick Chips */}
            <div className="flex flex-wrap gap-1.5">
              {PRESET_PICKS.map((pick, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setPredictionPick(pick)}
                  className={`text-[10px] px-2 py-1 rounded-lg border transition-colors cursor-pointer ${
                    predictionPick === pick
                      ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 font-bold'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  + {pick}
                </button>
              ))}
            </div>

            {/* Scoreline, Odds & Stars */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div>
                <label className="text-[11px] font-bold text-slate-300 uppercase block mb-1">
                  Predicted Score
                </label>
                <input
                  type="text"
                  placeholder="e.g. 2 - 1"
                  value={predictedScore}
                  onChange={(e) => setPredictedScore(e.target.value)}
                  className="w-full bg-[#050b15] border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono text-center font-bold text-emerald-400 text-sm"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-300 uppercase block mb-1">
                  Decimal Odds
                </label>
                <input
                  type="number"
                  step="0.05"
                  placeholder="2.15"
                  value={decimalOdds}
                  onChange={(e) => setDecimalOdds(e.target.value)}
                  className="w-full bg-[#050b15] border border-slate-800 rounded-xl p-2.5 text-xs text-white font-mono focus:outline-none focus:border-cyan-500 text-center"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-300 uppercase block mb-1 text-center">
                  Confidence ({confidenceStars} Stars)
                </label>
                <div className="flex items-center gap-1.5 p-2 bg-[#050b15] border border-slate-800 rounded-xl justify-center h-[42px]">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setConfidenceStars(star)}
                      className="cursor-pointer transition-transform hover:scale-110"
                    >
                      <Star
                        className={`w-4 h-4 ${
                          star <= confidenceStars
                            ? 'text-amber-400 fill-amber-400'
                            : 'text-slate-600'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Card Navigation */}
            <div className="flex justify-between items-center pt-2 border-t border-slate-800/80">
              <button
                type="button"
                onClick={() => setActiveCard(1)}
                className="px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 font-bold text-xs flex items-center gap-1.5 cursor-pointer hover:bg-slate-800"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>BACK</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveCard(3)}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-950 font-black text-xs font-['Orbitron'] flex items-center gap-1.5 cursor-pointer hover:from-emerald-400 hover:to-cyan-400 shadow-md"
              >
                <span>NEXT: MEDIA VAULT</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ================================================================== */}
        {/* CONTAINER CARD 3: DIGITAL MEDIA VAULT (REEL VIDEO & MATCH IMAGE) */}
        {/* ================================================================== */}
        {activeCard === 3 && (
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-[#0c1626] to-[#08101d] border border-slate-700/80 shadow-xl space-y-4 animate-in fade-in duration-150">
            
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
              <span className="text-[11px] font-black text-purple-400 uppercase tracking-wider font-mono flex items-center gap-1.5">
                <Film className="w-4 h-4" /> CARD 3: DIGITAL MEDIA ATTACHMENT VAULT
              </span>
              <span className="text-[10px] text-slate-400 font-mono">Step 3 of 4</span>
            </div>

            {/* Media Upload Box or Preview */}
            {!mediaPreviewUrl ? (
              <div className="space-y-3">
                <label className="flex flex-col items-center justify-center gap-2 p-6 rounded-2xl border-2 border-dashed border-slate-700 hover:border-cyan-400 bg-slate-900/50 hover:bg-slate-900/80 cursor-pointer transition-all">
                  <div className="w-12 h-12 rounded-full bg-slate-800/80 flex items-center justify-center text-cyan-400">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div className="text-center">
                    <span className="text-xs font-bold text-slate-200 block">
                      Choose Video Reel (MP4/WEBM) or Match Photo (JPG/PNG)
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      Stored in Firebase Storage and central database
                    </span>
                  </div>
                  <input
                    type="file"
                    accept="video/*,image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>

                {/* Instant 1-Click Sample Media Buttons */}
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between gap-3">
                  <span className="text-[10px] text-slate-400 font-mono uppercase">
                    No file ready? Test sample:
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={applySampleReel}
                      className="px-2.5 py-1 rounded-lg bg-purple-950/60 border border-purple-500/40 hover:bg-purple-900/60 text-purple-300 text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <Film className="w-3 h-3" />
                      <span>Sample 4K Reel</span>
                    </button>
                    <button
                      type="button"
                      onClick={applySampleImage}
                      className="px-2.5 py-1 rounded-lg bg-cyan-950/60 border border-cyan-500/40 hover:bg-cyan-900/60 text-cyan-300 text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <Camera className="w-3 h-3" />
                      <span>Sample Photo</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-3.5 rounded-2xl bg-black/60 border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {mediaType === 'video' ? (
                      <span className="px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-400 border border-purple-500/30 text-[10px] font-bold font-mono">
                        VIDEO REEL ACTIVE
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-md bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-[10px] font-bold font-mono">
                        IMAGE ACTIVE
                      </span>
                    )}
                    <span className="text-[10px] text-slate-400 font-mono truncate max-w-[200px]">
                      {attachedFile?.name || (mediaType === 'video' ? 'Sample Football Reel' : 'Sample Stadium Photo')}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (mediaType === 'video') applySampleImage();
                        else applySampleReel();
                      }}
                      className="text-[10px] text-slate-400 hover:text-cyan-400 font-mono flex items-center gap-1 cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" /> Switch Sample
                    </button>
                    <button
                      type="button"
                      onClick={removeAttachedFile}
                      className="p-1 rounded-lg bg-slate-900 text-slate-400 hover:text-red-400 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Instant Media Player Preview */}
                <div className="w-full h-36 rounded-xl bg-black overflow-hidden flex items-center justify-center border border-slate-800 relative">
                  {mediaType === 'video' ? (
                    <video
                      src={mediaPreviewUrl}
                      controls
                      autoPlay
                      muted
                      loop
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <img
                      src={mediaPreviewUrl}
                      alt="Attachment Preview"
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
              </div>
            )}

            {/* Card Navigation */}
            <div className="flex justify-between items-center pt-2 border-t border-slate-800/80">
              <button
                type="button"
                onClick={() => setActiveCard(2)}
                className="px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 font-bold text-xs flex items-center gap-1.5 cursor-pointer hover:bg-slate-800"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>BACK</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveCard(4)}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-950 font-black text-xs font-['Orbitron'] flex items-center gap-1.5 cursor-pointer hover:from-emerald-400 hover:to-cyan-400 shadow-md"
              >
                <span>NEXT: PREVIEW & PUBLISH</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ================================================================== */}
        {/* CONTAINER CARD 4: BANTER, THEME & INTERACTIVE LIVE PREVIEW */}
        {/* ================================================================== */}
        {activeCard === 4 && (
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-[#0c1626] to-[#08101d] border border-slate-700/80 shadow-xl space-y-4 animate-in fade-in duration-150">
            
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
              <span className="text-[11px] font-black text-emerald-400 uppercase tracking-wider font-mono flex items-center gap-1.5">
                <Eye className="w-4 h-4" /> CARD 4: BANTER COMMENTARY & LIVE PREVIEW
              </span>
              <span className="text-[10px] text-slate-400 font-mono">Step 4 of 4</span>
            </div>

            {/* Commentary Input */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-bold text-slate-300 uppercase block">
                  Banter / Tactical Analysis Commentary
                </label>
                <AiAutoCompleteButton
                  type="match_card"
                  contextText={fixture + ' ' + predictionPick}
                  onComplete={(res) => { if (res.caption) setCaption(res.caption); }}
                  label="Generate Banter"
                  variant="inline"
                />
              </div>
              <textarea
                rows={2}
                placeholder="Share your tactical breakdown or derby banter with the community..."
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                className="w-full bg-[#050b15] border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-cyan-500 resize-none"
              />
            </div>

            {/* Color Theme Selector */}
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5 font-mono">
                SELECT VISUAL THEME ACCENT:
              </label>
              <div className="flex flex-wrap gap-2">
                {THEME_OPTIONS.map((theme) => (
                  <button
                    key={theme.id}
                    type="button"
                    onClick={() => setThemeColor(theme.id)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-[11px] font-bold transition-all cursor-pointer ${
                      themeColor === theme.id
                        ? 'bg-slate-800 border-white text-white shadow-md'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <span className={`w-2.5 h-2.5 rounded-full ${theme.bg}`} />
                    <span>{theme.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* LIVE CARD PREVIEW CONTAINER */}
            <div className="p-3.5 rounded-2xl bg-black/80 border border-slate-800 shadow-inner space-y-2">
              <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                <span className="flex items-center gap-1 text-emerald-400 font-bold">
                  <Eye className="w-3.5 h-3.5" /> LIVE PREVIEW (HOW ALL USERS WILL SEE THIS)
                </span>
                <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[9px] font-black uppercase text-cyan-400">
                  {statusType === 'reel' ? '🎬 REEL' : statusType === 'image' ? '📸 IMAGE' : '📈 PREDICTION'}
                </span>
              </div>

              {/* Card Rendering */}
              <div className="p-3.5 rounded-xl bg-gradient-to-r from-slate-900 to-slate-950 border border-slate-800 flex items-center justify-between gap-3">
                <div className="space-y-1 overflow-hidden">
                  <span className="text-[9px] text-slate-400 font-mono uppercase block">{league}</span>
                  <h4 className="text-xs sm:text-sm font-black text-white font-['Orbitron'] truncate">{fixture}</h4>
                  <span className="text-[11px] text-emerald-400 font-bold block truncate">{predictionPick}</span>
                  {caption && <p className="text-[10px] text-slate-300 italic truncate">"{caption}"</p>}
                </div>

                {mediaPreviewUrl ? (
                  <div className="w-16 h-16 rounded-xl bg-black overflow-hidden shrink-0 border border-slate-700 relative">
                    {mediaType === 'video' ? (
                      <>
                        <video src={mediaPreviewUrl} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                          <Play className="w-4 h-4 text-white fill-white" />
                        </div>
                      </>
                    ) : (
                      <img src={mediaPreviewUrl} alt="Preview" className="w-full h-full object-cover" />
                    )}
                  </div>
                ) : predictedScore ? (
                  <div className="text-center bg-black/70 p-2.5 rounded-xl border border-slate-800 shrink-0 min-w-[70px]">
                    <span className="text-[8px] uppercase font-bold text-slate-500 block">SCORE</span>
                    <div className="text-lg font-black font-['Orbitron'] text-cyan-400">{predictedScore}</div>
                    <span className="text-[9px] text-slate-400 font-mono">{decimalOdds}x</span>
                  </div>
                ) : null}
              </div>
            </div>

            {/* Upload progress if active */}
            {uploadProgress > 0 && uploadProgress < 100 && (
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                  <span>Uploading to Firebase Storage...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-emerald-400 h-full transition-all duration-150"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center gap-2 pt-2 border-t border-slate-800/80">
              <button
                type="button"
                onClick={() => setActiveCard(3)}
                className="px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 font-bold text-xs flex items-center gap-1.5 cursor-pointer hover:bg-slate-800"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>BACK</span>
              </button>
              <button
                type="button"
                onClick={() => handleSubmit()}
                disabled={isSubmitting}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 via-cyan-500 to-indigo-500 hover:from-emerald-400 hover:to-indigo-400 text-slate-950 font-black text-xs font-['Orbitron'] tracking-wider shadow-lg shadow-emerald-950/40 transition-all cursor-pointer disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                <span>{isSubmitting ? 'SAVING TO DATABASE...' : 'PUBLISH STATUS TO ALL USERS (24H)'}</span>
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default CreateStatusModal;
