import React, { useState, useEffect } from 'react';
import { Search, X, Globe, ExternalLink, Sparkles, Tv, Newspaper, Trophy, Image, Compass, ArrowRight, Lightbulb } from 'lucide-react';

interface GoogleSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialQuery?: string;
}

type SearchTab = 'all' | 'scores' | 'news' | 'videos' | 'images';

const PROMPT_SUGGESTIONS = [
  'CF Montreal vs Inter Miami match analysis and odds',
  'Arsenal vs Manchester City expected goals and tactical preview',
  'Champions League live fixtures and betting probabilities',
  'MLS Eastern Conference live standings and xG stats',
  'Real Madrid vs Bayern Munich lineup injuries news'
];

export const GoogleSearchModal: React.FC<GoogleSearchModalProps> = ({
  isOpen,
  onClose,
  initialQuery = 'CF Montreal football scores'
}) => {
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [activeTab, setActiveTab] = useState<SearchTab>('all');
  const [iframeUrl, setIframeUrl] = useState('');

  // Update searchQuery when initialQuery changes
  useEffect(() => {
    if (initialQuery) {
      setSearchQuery(initialQuery);
    }
  }, [initialQuery]);

  // Generate Google Search URL based on query & active option tab
  const generateGoogleUrl = (query: string, tab: SearchTab) => {
    const encoded = encodeURIComponent(query.trim() || 'Football Match Intel');
    const baseUrl = 'https://www.google.com/search?igu=1'; // igu=1 enables iframe embedding

    switch (tab) {
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

  useEffect(() => {
    if (isOpen) {
      const q = searchQuery || 'CF Montreal football fixtures';
      setIframeUrl(generateGoogleUrl(q, activeTab));
    }
  }, [isOpen, activeTab]);

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;
    setIframeUrl(generateGoogleUrl(searchQuery, activeTab));
  };

  const handleQuickTagClick = (tag: string) => {
    setSearchQuery(tag);
    setIframeUrl(generateGoogleUrl(tag, activeTab));
  };

  const handleTabChange = (tab: SearchTab) => {
    setActiveTab(tab);
    setIframeUrl(generateGoogleUrl(searchQuery, tab));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Main Floating Search Container */}
      <div className="relative w-full max-w-5xl h-[90vh] max-h-[880px] bg-[#0c1424] border border-slate-700/80 rounded-2xl shadow-2xl shadow-black/90 flex flex-col overflow-hidden">
        
        {/* Top Control Bar */}
        <div className="px-4 py-3 bg-slate-900/95 border-b border-slate-800 flex flex-col gap-3 shrink-0">
          <div className="flex items-center justify-between gap-3">
            {/* Title & Badge */}
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 font-black shadow-md shadow-emerald-950/40">
                <Compass className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-extrabold text-white tracking-tight">Google Web & Football Scout</h3>
                  <span className="px-1.5 py-0.2 text-[9px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 rounded">
                    INTEL MATRIX
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 hidden sm:block">
                  Live real-time web intelligence, fixture telemetry, and breaking news search.
                </p>
              </div>
            </div>

            {/* Actions: Open External & Close */}
            <div className="flex items-center gap-2">
              <a
                href={iframeUrl.replace('&igu=1', '')}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700 transition-colors"
                title="Open directly on Google in a new browser tab"
              >
                <ExternalLink className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">Google Tab</span>
              </a>

              <button
                onClick={onClose}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-red-950/80 hover:text-red-300 text-slate-400 transition-colors border border-slate-700 cursor-pointer"
                title="Close Scout Modal (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Search Input Bar */}
          <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search match odds, team lineups, player statistics, or tactical debriefs..."
                className="w-full pl-10 pr-9 py-2 rounded-xl bg-slate-950 border border-slate-700/80 text-white placeholder-slate-500 text-xs sm:text-sm font-medium focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all shadow-inner"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs sm:text-sm transition-all shadow-md shadow-emerald-500/20 flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <span>Search</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>

          {/* Prompt Suggestions Carousel */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5">
            <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1 shrink-0">
              <Lightbulb className="w-3 h-3 text-amber-400" /> Prompts:
            </span>
            {PROMPT_SUGGESTIONS.map((prompt, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleQuickTagClick(prompt)}
                className="px-2.5 py-0.5 rounded-lg bg-slate-950/80 hover:bg-slate-800 text-slate-300 hover:text-emerald-400 text-[10px] font-medium border border-slate-800 transition-colors whitespace-nowrap cursor-pointer shrink-0"
              >
                "{prompt.length > 38 ? prompt.substring(0, 38) + '...' : prompt}"
              </button>
            ))}
          </div>

          {/* Real Google Search Filter Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-0.5 scrollbar-none text-xs">
            <button
              type="button"
              onClick={() => handleTabChange('all')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-bold transition-colors cursor-pointer shrink-0 ${
                activeTab === 'all'
                  ? 'bg-emerald-500 text-slate-950 shadow-xs'
                  : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700'
              }`}
            >
              <Globe className="w-3 h-3" />
              <span>All Web</span>
            </button>

            <button
              type="button"
              onClick={() => handleTabChange('scores')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-bold transition-colors cursor-pointer shrink-0 ${
                activeTab === 'scores'
                  ? 'bg-emerald-500 text-slate-950 shadow-xs'
                  : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700'
              }`}
            >
              <Trophy className="w-3 h-3" />
              <span>Match Scores & Tables</span>
            </button>

            <button
              type="button"
              onClick={() => handleTabChange('news')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-bold transition-colors cursor-pointer shrink-0 ${
                activeTab === 'news'
                  ? 'bg-emerald-500 text-slate-950 shadow-xs'
                  : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700'
              }`}
            >
              <Newspaper className="w-3 h-3" />
              <span>Football News</span>
            </button>

            <button
              type="button"
              onClick={() => handleTabChange('videos')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-bold transition-colors cursor-pointer shrink-0 ${
                activeTab === 'videos'
                  ? 'bg-emerald-500 text-slate-950 shadow-xs'
                  : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700'
              }`}
            >
              <Tv className="w-3 h-3" />
              <span>Video Highlights</span>
            </button>

            <button
              type="button"
              onClick={() => handleTabChange('images')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-bold transition-colors cursor-pointer shrink-0 ${
                activeTab === 'images'
                  ? 'bg-emerald-500 text-slate-950 shadow-xs'
                  : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700'
              }`}
            >
              <Image className="w-3 h-3" />
              <span>Lineups & Photos</span>
            </button>
          </div>
        </div>

        {/* Clean Google Frame Window (No blocking rotating loader) */}
        <div className="relative flex-1 w-full bg-[#0a0f1d] overflow-hidden">
          {iframeUrl && (
            <iframe
              src={iframeUrl}
              title="Google Search Live Frame"
              className="w-full h-full border-none bg-white rounded-b-2xl"
              sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox"
            />
          )}
        </div>

        {/* Quick Football Query Chips Footer */}
        <div className="px-4 py-2 bg-slate-950 border-t border-slate-800 flex items-center gap-2 overflow-x-auto scrollbar-none text-[11px] shrink-0">
          <span className="font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1 shrink-0">
            <Sparkles className="w-3 h-3" /> Quick Tags:
          </span>
          {[
            'CF Montreal Fixtures 2026',
            'Champions League Today',
            'MLS Live Standings',
            'Real Madrid Match Highlights',
            'Premier League Top Scorers',
            'Football Transfer Rumours'
          ].map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => handleQuickTagClick(tag)}
              className="px-2.5 py-0.5 rounded-full bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-emerald-400 border border-slate-800 transition-colors whitespace-nowrap cursor-pointer"
            >
              #{tag}
            </button>
          ))}
        </div>

      </div>
    </div>
  );
};

export default GoogleSearchModal;
