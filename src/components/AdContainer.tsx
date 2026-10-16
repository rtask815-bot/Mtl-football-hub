import React, { useState, useEffect } from 'react';
import { Sparkles, ArrowRight, X, ExternalLink, ShieldCheck } from 'lucide-react';

export interface DynamicAdCampaign {
  id: string;
  adUnitId: string;
  title: string;
  subtitle: string;
  badge: string;
  badgeColor?: string;
  ctaText: string;
  targetUrl?: string;
  internalRoute?: string;
  sponsorName: string;
  verified: boolean;
}

// Official Google AdMob Banner Inventory (App ID: ca-app-pub-8672251077600763~3212778192)
export const ADMOB_INVENTORY: Record<string, DynamicAdCampaign[]> = {
  'ca-app-pub-8672251077600763/5784110379': [
    {
      id: 'ad-mob-01',
      adUnitId: 'ca-app-pub-8672251077600763/5784110379',
      title: 'Official MTL VIP Matchpass & Real-time Live Commentary',
      subtitle: 'Verified AI win-rate modeling, premium stream quality, and instant goal notifications.',
      badge: 'ADMOB BANNER',
      ctaText: 'Explore Pro Pass',
      internalRoute: '/tv',
      sponsorName: 'MTL Sports Network',
      verified: true,
    },
    {
      id: 'ad-mob-02',
      adUnitId: 'ca-app-pub-8672251077600763/5784110379',
      title: 'Zero-Margin Betting Exchange & Instant Liquidity',
      subtitle: 'Trade top Premier League & Champions League lines with 0% withdrawal fees.',
      badge: 'ADMOB PARTNER',
      ctaText: 'Claim 100% Bonus',
      targetUrl: 'https://www.betika.com.gh',
      sponsorName: 'Betika Pro Global',
      verified: true,
    },
    {
      id: 'ad-mob-03',
      adUnitId: 'ca-app-pub-8672251077600763/5784110379',
      title: 'EA FC Tactical Hub & Daily Pro Tournament Circuit',
      subtitle: 'Compete in weekly esports cups with live score leaderboards and prize pools.',
      badge: 'ESPORTS ARENA',
      ctaText: 'Join Tournament',
      internalRoute: '/group-chats',
      sponsorName: 'EA Sports Cup',
      verified: true,
    }
  ]
};

export interface AdContainerProps {
  adUnitId?: string;
  title?: string;
  subtitle?: string;
  badge?: string;
  ctaText?: string;
  onAction?: () => void;
  autoRotateInterval?: number;
  className?: string;
}

export const AdContainer: React.FC<AdContainerProps> = ({
  adUnitId = 'ca-app-pub-8672251077600763/5784110379',
  title,
  subtitle,
  badge,
  ctaText,
  onAction,
  autoRotateInterval = 12000,
  className = '',
}) => {
  const [dismissed, setDismissed] = useState(false);
  const [adIndex, setAdIndex] = useState(0);
  const [fadeAnim, setFadeAnim] = useState(true);

  const availableAds = ADMOB_INVENTORY[adUnitId] || ADMOB_INVENTORY['ca-app-pub-8672251077600763/5784110379'];

  useEffect(() => {
    if (!availableAds || availableAds.length <= 1) return;

    const interval = setInterval(() => {
      setFadeAnim(false);
      setTimeout(() => {
        setAdIndex((prev) => (prev + 1) % availableAds.length);
        setFadeAnim(true);
      }, 250);
    }, autoRotateInterval);

    return () => clearInterval(interval);
  }, [availableAds, autoRotateInterval]);

  if (dismissed) return null;

  const currentAd = availableAds[adIndex] || availableAds[0];

  const displayTitle = title || currentAd.title;
  const displaySubtitle = subtitle || currentAd.subtitle;
  const displayBadge = badge || currentAd.badge;
  const displayCta = ctaText || currentAd.ctaText;

  const handleCtaClick = () => {
    if (onAction) {
      onAction();
      return;
    }
    if (currentAd.targetUrl) {
      window.open(currentAd.targetUrl, '_blank', 'noopener,noreferrer');
    } else if (currentAd.internalRoute) {
      window.location.href = currentAd.internalRoute;
    }
  };

  return (
    <div
      className={`w-full min-h-[96px] sm:min-h-[104px] overflow-hidden flex items-center justify-center relative rounded-2xl bg-[#0c1424] border border-emerald-500/30 shadow-xl shadow-black/40 transition-all duration-300 hover:border-emerald-500/60 my-4 ${className}`}
      data-admob-publisher-id="ca-app-pub-8672251077600763~3212778192"
      data-admob-unit-id={adUnitId}
      data-admob-campaign={currentAd.id}
    >
      {/* Dismiss Button */}
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="absolute top-2.5 right-2.5 sm:top-3.5 sm:right-3.5 p-1.5 text-slate-400 hover:text-white rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-700/80 transition-colors cursor-pointer z-20"
        title="Dismiss AdMob banner"
        aria-label="Dismiss AdMob banner"
      >
        <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
      </button>

      {/* Main Banner Content */}
      <div
        className={`w-full p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 pr-8 sm:pr-10 md:pr-4 transition-opacity duration-200 ${
          fadeAnim ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {/* Left Information */}
        <div className="space-y-1.5 max-w-2xl">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-extrabold text-[10px] uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              {displayBadge}
            </span>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-500/70" />
              ADMOB SDK • {currentAd.sponsorName}
            </span>
          </div>

          <h3 className="text-sm sm:text-base md:text-lg font-extrabold text-white tracking-tight leading-snug">
            {displayTitle}
          </h3>

          <p className="text-xs text-slate-400 leading-relaxed line-clamp-2 sm:line-clamp-none">
            {displaySubtitle}
          </p>
        </div>

        {/* Right CTA Button */}
        <div className="flex items-center shrink-0 pt-1 md:pt-0">
          <button
            type="button"
            onClick={handleCtaClick}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-xs sm:text-sm tracking-wide transition-all shadow-md shadow-emerald-950/40 flex items-center justify-center gap-2 cursor-pointer active:scale-95 shrink-0"
          >
            <span>{displayCta}</span>
            {currentAd.targetUrl ? (
              <ExternalLink className="w-4 h-4" />
            ) : (
              <ArrowRight className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdContainer;
