import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, 
  Search, 
  X, 
  RotateCw, 
  Copy, 
  Check, 
  ExternalLink, 
  Globe, 
  Trophy, 
  Newspaper, 
  Tv, 
  Image, 
  Zap,
  ArrowRight
} from 'lucide-react';
import { GoogleScoutTab } from '../utils/googleScout.ts';
import FloatingBackButton from './FloatingBackButton.tsx';

interface GoogleSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialQuery?: string;
  initialTab?: GoogleScoutTab;
}

const GEMINI_QUICK_TOPICS = [
  'Expected Goals (xG) & Probabilities',
  'Head-to-Head Record & Form',
  'Confirmed Lineups & Key Absences',
  'Tactical Formation & Key Matchups',
  'Live Standings & Match Predictions'
];

export const GoogleSearchModal: React.FC<GoogleSearchModalProps> = ({
  isOpen,
  onClose,
  initialQuery = 'CF Montreal football scores',
  initialTab = 'gemini'
}) => {
  const [activeTab, setActiveTab] = useState<GoogleScoutTab>(initialTab || 'gemini');
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [iframeUrl, setIframeUrl] = useState('');
  
  const inputRef = useRef<HTMLInputElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Generate Google Search URL for Search & Gemini AI Tabs
  const generateGoogleUrl = (query: string, tab: GoogleScoutTab) => {
    const encoded = encodeURIComponent(query.trim() || 'CF Montreal football scores');
    const baseUrl = 'https://www.google.com/search?igu=1';

    switch (tab) {
      case 'gemini':
        return `${baseUrl}&q=${encoded}`;
      case 'news':
        return `${baseUrl}&tbm=nws&q=${encoded}`;
      case 'videos':
        return `${baseUrl}&tbm=vid&q=${encoded}+highlights`;
      case 'scores':
        return `${baseUrl}&q=${encoded}+live+scores+schedule+fixtures`;
      case 'images':
        return `${baseUrl}&tbm=isch&q=${encoded}`;
      case 'all':
      default:
        return `${baseUrl}&q=${encoded}`;
    }
  };

  // Sync state whenever modal opens or initialQuery changes
  useEffect(() => {
    if (isOpen) {
      const q = initialQuery || 'CF Montreal football scores';
      const targetTab = initialTab || 'gemini';
      setSearchQuery(q);
      setInputMessage(q);
      setActiveTab(targetTab);
      setIsLoading(true);
      setIframeUrl(generateGoogleUrl(q, targetTab));

      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 200);
    }
  }, [isOpen, initialQuery, initialTab]);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Background scroll locking
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      const originalTouchAction = document.body.style.touchAction;
      const originalOverscroll = document.documentElement.style.overscrollBehavior;

      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';
      document.documentElement.style.overscrollBehavior = 'none';

      return () => {
        document.body.style.overflow = originalOverflow;
        document.body.style.touchAction = originalTouchAction;
        document.documentElement.style.overscrollBehavior = originalOverscroll;
      };
    }
  }, [isOpen]);

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = inputMessage.trim() || searchQuery.trim();
    if (!query) return;

    setSearchQuery(query);
    setIsLoading(true);
    setIframeUrl(generateGoogleUrl(query, activeTab));
  };

  const handleTabSelect = (tab: GoogleScoutTab) => {
    setActiveTab(tab);
    const query = searchQuery.trim() || inputMessage.trim() || 'CF Montreal football scores';
    setIsLoading(true);
    setIframeUrl(generateGoogleUrl(query, tab));
  };

  const handleQuickTopicClick = (topic: string) => {
    const fullQuery = `${searchQuery}: ${topic}`;
    setSearchQuery(fullQuery);
    setInputMessage(fullQuery);
    setIsLoading(true);
    setIframeUrl(generateGoogleUrl(fullQuery, activeTab));
  };

  const handleCopy = () => {
    const rawUrl = iframeUrl.replace('&igu=1', '');
    navigator.clipboard.writeText(rawUrl).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    });
  };

  if (!isOpen) return null;

  const rawWebUrl = iframeUrl.replace('&igu=1', '');

  return (
    <div 
      className="fixed inset-0 z-[99999] w-screen h-screen bg-[#030712] flex flex-col overflow-hidden font-['Plus_Jakarta_Sans',sans-serif] select-text"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 99999,
        isolation: 'isolate',
        overscrollBehavior: 'contain',
        touchAction: 'pan-y',
        transform: 'translateZ(0)',
        willChange: 'transform'
      }}
    >
      {/* Top Loading Pulse Bar */}
      <div className="h-1 w-full bg-slate-800 overflow-hidden relative shrink-0">
        {isLoading && (
          <div className="h-full bg-gradient-to-r from-cyan-400 via-indigo-500 to-emerald-400 animate-pulse w-full transition-all duration-500" />
        )}
      </div>

      {/* Top Main Navigation & Search Header */}
      <div className="px-4 sm:px-6 py-3 bg-gradient-to-r from-[#060c18] via-[#0b162c] to-[#060c18] border-b border-cyan-500/30 flex flex-col gap-2.5 shrink-0 shadow-xl z-20">
        
        {/* Row 1: Match Intelligence Search Branding & Controls */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-cyan-500 via-indigo-500 to-emerald-400 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-cyan-950/60 shrink-0">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-black text-white font-['Orbitron'] tracking-wider flex items-center gap-2">
                  <span>Match Intelligence Search</span>
                </h2>
                <span className="px-2 py-0.5 text-[9px] font-black bg-gradient-to-r from-cyan-500/20 to-indigo-500/20 text-cyan-300 border border-cyan-500/50 rounded-md font-['Orbitron'] hidden xs:inline flex items-center gap-1">
                  <Zap className="w-2.5 h-2.5 text-cyan-400" />
                  LIVE MATCH INTEL
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Real-time football intelligence, live scores, fixture schedules, and global football analytics.
              </p>
            </div>
          </div>

          {/* Action Controls & Visible Close Button */}
          <div className="flex items-center gap-2">
            {/* Copy Button */}
            <button
              onClick={handleCopy}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors cursor-pointer"
              title="Copy details"
            >
              {isCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>

            {/* Refresh / Re-query Button */}
            <button
              onClick={() => {
                setIsLoading(true);
                if (iframeRef.current) iframeRef.current.src = iframeUrl;
              }}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors cursor-pointer"
              title="Refresh / Re-query"
            >
              <RotateCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-cyan-400' : ''}`} />
            </button>

            {/* External Tab Link */}
            <a
              href={rawWebUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-bold border border-slate-700 transition-colors cursor-pointer"
              title="Open directly in new tab"
            >
              <ExternalLink className="w-4 h-4 text-cyan-400" />
              <span className="hidden sm:inline">Open Tab</span>
            </a>

            {/* PROMINENT VISIBLE CLOSE BUTTON */}
            <button
              onClick={onClose}
              className="flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl bg-red-500/20 hover:bg-red-500 text-red-300 hover:text-slate-950 font-black text-xs font-['Orbitron'] border border-red-500/50 shadow-lg shadow-red-950/40 transition-all cursor-pointer shrink-0"
              title="Close (Esc)"
            >
              <X className="w-4 h-4 stroke-[3]" />
              <span className="font-extrabold">CLOSE</span>
            </button>
          </div>
        </div>

        {/* Row 2: Omnibox Search Input */}
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
          <div className="relative flex-1 group">
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1 text-cyan-400 pointer-events-none">
              <Search className="w-4 h-4 text-cyan-400" />
            </div>
            <input
              ref={inputRef}
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="e.g. CF Montréal vs Toronto FC live scores or Real Madrid standings (Required query for live match search)"
              className="w-full pl-10 pr-10 py-2.5 rounded-2xl bg-[#02050e] border border-slate-700/90 focus:border-cyan-400 text-white placeholder-slate-500 text-xs sm:text-sm font-medium focus:outline-none focus:ring-1 focus:ring-cyan-400 transition-all shadow-inner"
            />
            {inputMessage && (
              <button
                type="button"
                onClick={() => setInputMessage('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-0.5 rounded cursor-pointer"
                title="Clear input"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading || !inputMessage.trim()}
            className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-cyan-500 via-indigo-500 to-emerald-400 hover:opacity-90 disabled:opacity-50 text-slate-950 font-black text-xs sm:text-sm font-['Orbitron'] transition-all shadow-md shadow-cyan-950/50 flex items-center gap-2 cursor-pointer shrink-0 disabled:cursor-not-allowed"
          >
            <span>SEARCH</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Row 3: Google Search Section Tabs with Gemini as the Primary Tab */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none text-xs">
          
          {/* PRIMARY GEMINI SECTION TAB */}
          <button
            type="button"
            onClick={() => handleTabSelect('gemini')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer shrink-0 text-xs ${
              activeTab === 'gemini'
                ? 'bg-gradient-to-r from-cyan-400 via-indigo-400 to-emerald-400 text-slate-950 font-black shadow-md shadow-cyan-950/60'
                : 'bg-slate-800/90 text-cyan-300 hover:text-white hover:bg-slate-700 border border-cyan-500/30'
            }`}
          >
            <Sparkles className={`w-3.5 h-3.5 ${activeTab === 'gemini' ? 'text-slate-950' : 'text-cyan-400'}`} />
            <span>Match Intel</span>
          </button>

          {/* ALL WEB TAB */}
          <button
            type="button"
            onClick={() => handleTabSelect('all')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer shrink-0 text-xs ${
              activeTab === 'all'
                ? 'bg-cyan-500 text-slate-950 font-extrabold shadow-sm'
                : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 border border-slate-700/60'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>All Results</span>
          </button>

          {/* SCORES TAB */}
          <button
            type="button"
            onClick={() => handleTabSelect('scores')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer shrink-0 text-xs ${
              activeTab === 'scores'
                ? 'bg-cyan-500 text-slate-950 font-extrabold shadow-sm'
                : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 border border-slate-700/60'
            }`}
          >
            <Trophy className="w-3.5 h-3.5" />
            <span>Fixtures & Scores</span>
          </button>

          {/* NEWS TAB */}
          <button
            type="button"
            onClick={() => handleTabSelect('news')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer shrink-0 text-xs ${
              activeTab === 'news'
                ? 'bg-cyan-500 text-slate-950 font-extrabold shadow-sm'
                : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 border border-slate-700/60'
            }`}
          >
            <Newspaper className="w-3.5 h-3.5" />
            <span>Football News</span>
          </button>

          {/* VIDEOS TAB */}
          <button
            type="button"
            onClick={() => handleTabSelect('videos')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer shrink-0 text-xs ${
              activeTab === 'videos'
                ? 'bg-cyan-500 text-slate-950 font-extrabold shadow-sm'
                : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 border border-slate-700/60'
            }`}
          >
            <Tv className="w-3.5 h-3.5" />
            <span>Videos & Highlights</span>
          </button>

          {/* IMAGES TAB */}
          <button
            type="button"
            onClick={() => handleTabSelect('images')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer shrink-0 text-xs ${
              activeTab === 'images'
                ? 'bg-cyan-500 text-slate-950 font-extrabold shadow-sm'
                : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 border border-slate-700/60'
            }`}
          >
            <Image className="w-3.5 h-3.5" />
            <span>Photos & Lineups</span>
          </button>
        </div>
      </div>

      {/* Main Display Container: Google Gemini Search Web Iframe */}
      <div className="relative flex-1 min-h-0 w-full bg-[#02050f] overflow-hidden flex flex-col">
        {iframeUrl ? (
          <iframe
            ref={iframeRef}
            src={iframeUrl}
            onLoad={() => setIsLoading(false)}
            title="Google Gemini Search Results"
            className="w-full border-none bg-white transition-opacity duration-300"
            style={{
              height: 'calc(100% + 122px)',
              marginTop: '-122px',
              width: '100%',
              display: 'block'
            }}
            sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-presentation"
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
            <Search className="w-12 h-12 text-cyan-400/40 mb-3" />
            <p className="text-sm font-semibold">Enter a search query above to view Google Gemini Search results.</p>
          </div>
        )}
      </div>

      {/* Static Footer with Quick Topics & Close Prompt */}
      <div className="px-4 sm:px-6 py-2.5 bg-[#050914] border-t border-slate-800/90 flex items-center justify-between gap-3 overflow-x-auto scrollbar-none text-[11px] shrink-0 z-20">
        <div className="flex items-center gap-2 shrink-0">
          <span className="font-extrabold text-cyan-400 uppercase tracking-wider flex items-center gap-1 shrink-0 font-['Orbitron'] text-[10px]">
            <Sparkles className="w-3 h-3 text-cyan-400" /> GEMINI TOPICS:
          </span>
          {GEMINI_QUICK_TOPICS.map((topic) => (
            <button
              key={topic}
              type="button"
              onClick={() => handleQuickTopicClick(topic)}
              className="px-2.5 py-1 rounded-xl bg-slate-900/90 hover:bg-cyan-950/60 text-slate-300 hover:text-cyan-300 border border-slate-800 hover:border-cyan-500/40 transition-colors whitespace-nowrap cursor-pointer text-[10px] font-medium flex items-center gap-1"
            >
              <Zap className="w-2.5 h-2.5 text-cyan-400" />
              <span>{topic}</span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={onClose}
            className="px-3 py-1 rounded-lg bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-slate-950 border border-red-500/30 text-[10px] font-extrabold font-['Orbitron'] transition-colors cursor-pointer"
          >
            ESC TO CLOSE
          </button>
        </div>
      </div>

      {/* Floating Back FAB for Google Search Modal */}
      <FloatingBackButton
        onClick={onClose}
        label="Exit Search"
        position="bottom-left"
        zIndex={100}
        isCloseAction={true}
      />

    </div>
  );
};

export default GoogleSearchModal;
