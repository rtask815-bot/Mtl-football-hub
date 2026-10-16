/**
 * MTL Football Hub - Central Physical Visuals & Assets Registry
 * High-definition generated assets, physical team badges, status presets & reaction visuals.
 */

export const APP_GENERATED_IMAGES = {
  crestMtlGold: '/src/assets/images/crest_mtl_gold_1791727567919.jpg',
  crestEuroShield: '/src/assets/images/crest_euro_shield_1791727580565.jpg',
  newsTacticalMastery: '/src/assets/images/hub_feature_32.jpg',
  newsTransferBreaking: '/src/assets/images/hub_feature_31.jpg',
  statusMatchdayElectric: '/src/assets/images/hub_feature_33.jpg',
  heroPhysicalShowcase: '/src/assets/images/hero_physical_showcase_1791684418843.jpg',
  statusSquare: '/src/assets/images/hub_feature_34.jpg',
  matchFixtureDuel: '/src/assets/images/hub_feature_33.jpg',
  tacticalClash: '/src/assets/images/hub_feature_32.jpg',
  newsWire: '/src/assets/images/hub_feature_31.jpg',
  advertVip: '/src/assets/images/hub_feature_30.jpg',
  matchCardBg: '/src/assets/images/hub_feature_29.jpg',
  advertPartner: '/src/assets/images/hub_feature_28.jpg',
  statusReelStory: '/src/assets/images/hub_feature_27.jpg'
};

export interface IntelligentHubAsset {
  id: string;
  url: string;
  onlineUrl: string;
  sourceIbb: string;
  title: string;
  role: 'news' | 'status' | 'advert' | 'fixture' | 'match_card';
}

/**
 * Intelligent Image Registry mapping user provided high-impact graphics:
 * 1. https://ibb.co/dJ7rXkgt -> hub_feature_34.jpg (Square Status Avatar / Matchday Hero)
 * 2. https://ibb.co/v4LYvfzc -> hub_feature_33.jpg (Electric Pitch Match & Fixture Background)
 * 3. https://ibb.co/HfGpRs7q -> hub_feature_32.jpg (Tactical Duel & Tactical Analysis Wire)
 * 4. https://ibb.co/6Q7FVwJ  -> hub_feature_31.jpg (Breaking Football Transfer & News Wire)
 * 5. https://ibb.co/fd9vwCBc -> hub_feature_30.jpg (VIP Matchpass & Pro Circuit Advert Backdrop)
 * 6. https://ibb.co/xS2mtcnz -> hub_feature_29.jpg (Championship Fixture & Match Card Background)
 * 7. https://ibb.co/ZpYZrJ0S -> hub_feature_28.jpg (Partner Betting Exchange & Stadium Advert)
 * 8. https://ibb.co/LzQBQZBR -> hub_feature_27.jpg (Goal Celebration & 24H Match Story Reel)
 */
export const HUB_INTELLIGENT_ASSETS: Record<string, IntelligentHubAsset> = {
  statusSquare: {
    id: 'status-sq-34',
    url: '/src/assets/images/hub_feature_34.jpg',
    onlineUrl: 'https://i.ibb.co/M59sKP6f/images-34.jpg',
    sourceIbb: 'https://ibb.co/dJ7rXkgt',
    title: 'Matchday Striker Pulse',
    role: 'status'
  },
  matchFixtureDuel: {
    id: 'fixture-duel-33',
    url: '/src/assets/images/hub_feature_33.jpg',
    onlineUrl: 'https://i.ibb.co/xqzH8w52/images-33.jpg',
    sourceIbb: 'https://ibb.co/v4LYvfzc',
    title: 'Electric Pitch Derby Clash',
    role: 'fixture'
  },
  tacticalClash: {
    id: 'tactical-wire-32',
    url: '/src/assets/images/hub_feature_32.jpg',
    onlineUrl: 'https://i.ibb.co/ksq6zfKX/images-32.jpg',
    sourceIbb: 'https://ibb.co/HfGpRs7q',
    title: 'Tactical Duel Matrix',
    role: 'match_card'
  },
  newsWire: {
    id: 'news-wire-31',
    url: '/src/assets/images/hub_feature_31.jpg',
    onlineUrl: 'https://i.ibb.co/fJzHBFG/images-31.jpg',
    sourceIbb: 'https://ibb.co/6Q7FVwJ',
    title: 'Breaking Transfer & News Wire',
    role: 'news'
  },
  advertVip: {
    id: 'ad-vip-30',
    url: '/src/assets/images/hub_feature_30.jpg',
    onlineUrl: 'https://i.ibb.co/5hkFH5t7/images-30.jpg',
    sourceIbb: 'https://ibb.co/fd9vwCBc',
    title: 'VIP Matchpass & Pro Pass',
    role: 'advert'
  },
  matchCardBg: {
    id: 'card-bg-29',
    url: '/src/assets/images/hub_feature_29.jpg',
    onlineUrl: 'https://i.ibb.co/BVf457hT/images-29.jpg',
    sourceIbb: 'https://ibb.co/xS2mtcnz',
    title: 'Championship Matchday Glow',
    role: 'match_card'
  },
  advertPartner: {
    id: 'ad-partner-28',
    url: '/src/assets/images/hub_feature_28.jpg',
    onlineUrl: 'https://i.ibb.co/C3Mrytf6/images-28.jpg',
    sourceIbb: 'https://ibb.co/ZpYZrJ0S',
    title: 'Arena & Betting Exchange Partner',
    role: 'advert'
  },
  statusReelStory: {
    id: 'status-reel-27',
    url: '/src/assets/images/hub_feature_27.jpg',
    onlineUrl: 'https://i.ibb.co/mCvdvcdT/images-27.jpg',
    sourceIbb: 'https://ibb.co/LzQBQZBR',
    title: '24H Matchday Story & Celebration',
    role: 'status'
  }
};

export interface CyberFootballBackground {
  id: string;
  url: string;
  onlineUrl: string;
  sourceIbb: string;
  title: string;
}

export const CYBER_FOOTBALL_BACKGROUNDS: CyberFootballBackground[] = [
  {
    id: 'cyber-striker-33',
    url: '/src/assets/images/hub_feature_33.jpg',
    onlineUrl: 'https://i.ibb.co/xqzH8w52/images-33.jpg',
    sourceIbb: 'https://ibb.co/v4LYvfzc',
    title: 'Electric Pitch Derby Clash'
  },
  {
    id: 'cyber-striker-32',
    url: '/src/assets/images/hub_feature_32.jpg',
    onlineUrl: 'https://i.ibb.co/ksq6zfKX/images-32.jpg',
    sourceIbb: 'https://ibb.co/HfGpRs7q',
    title: 'Tactical Clash Arena'
  },
  {
    id: 'cyber-striker-29',
    url: '/src/assets/images/hub_feature_29.jpg',
    onlineUrl: 'https://i.ibb.co/BVf457hT/images-29.jpg',
    sourceIbb: 'https://ibb.co/xS2mtcnz',
    title: 'Championship Matchday Glow'
  },
  {
    id: 'cyber-striker-31',
    url: '/src/assets/images/hub_feature_31.jpg',
    onlineUrl: 'https://i.ibb.co/fJzHBFG/images-31.jpg',
    sourceIbb: 'https://ibb.co/6Q7FVwJ',
    title: 'Live Breaking Wire Dynamic'
  },
  {
    id: 'cyber-striker-27',
    url: '/src/assets/images/hub_feature_27.jpg',
    onlineUrl: 'https://i.ibb.co/mCvdvcdT/images-27.jpg',
    sourceIbb: 'https://ibb.co/LzQBQZBR',
    title: 'Goal Flare Stadium Roar'
  },
  {
    id: 'cyber-striker-1',
    url: '/src/assets/images/bg_cyber_football_1.jpg',
    onlineUrl: 'https://i.ibb.co/PsRdnrm0/images-16.jpg',
    sourceIbb: 'https://ibb.co/Q7Z4RJbt',
    title: 'Cyber Striker Motion'
  },
  {
    id: 'cyber-striker-2',
    url: '/src/assets/images/bg_cyber_football_2.jpg',
    onlineUrl: 'https://i.ibb.co/LzkxxcfS/images-26.jpg',
    sourceIbb: 'https://ibb.co/DDV99vn4',
    title: 'Neon Pitch Dynamo'
  }
];

export interface TeamVisual {
  name: string;
  shortCode: string;
  logoUrl: string;
  accentColor: string;
  glowColor: string;
  countryOrCity: string;
}

// Comprehensive registry of official and physical team logos
export const TEAM_VISUALS_REGISTRY: Record<string, TeamVisual> = {
  'cf montréal': {
    name: 'CF Montréal',
    shortCode: 'MTL',
    logoUrl: APP_GENERATED_IMAGES.crestMtlGold,
    accentColor: '#f59e0b',
    glowColor: 'rgba(245, 158, 11, 0.4)',
    countryOrCity: 'Montreal, Canada'
  },
  'montreal': {
    name: 'CF Montréal',
    shortCode: 'MTL',
    logoUrl: APP_GENERATED_IMAGES.crestMtlGold,
    accentColor: '#f59e0b',
    glowColor: 'rgba(245, 158, 11, 0.4)',
    countryOrCity: 'Montreal, Canada'
  },
  'toronto fc': {
    name: 'Toronto FC',
    shortCode: 'TFC',
    logoUrl: 'https://images.fotmob.com/image_resources/logo/teamlogo/9796.png',
    accentColor: '#e11d48',
    glowColor: 'rgba(225, 29, 72, 0.4)',
    countryOrCity: 'Toronto, Canada'
  },
  'arsenal': {
    name: 'Arsenal',
    shortCode: 'ARS',
    logoUrl: 'https://images.fotmob.com/image_resources/logo/teamlogo/9825.png',
    accentColor: '#ef4444',
    glowColor: 'rgba(239, 68, 68, 0.4)',
    countryOrCity: 'London, England'
  },
  'manchester city': {
    name: 'Manchester City',
    shortCode: 'MCI',
    logoUrl: 'https://images.fotmob.com/image_resources/logo/teamlogo/8456.png',
    accentColor: '#38bdf8',
    glowColor: 'rgba(56, 189, 248, 0.4)',
    countryOrCity: 'Manchester, England'
  },
  'real madrid': {
    name: 'Real Madrid',
    shortCode: 'RMA',
    logoUrl: 'https://images.fotmob.com/image_resources/logo/teamlogo/8633.png',
    accentColor: '#facc15',
    glowColor: 'rgba(250, 204, 21, 0.4)',
    countryOrCity: 'Madrid, Spain'
  },
  'barcelona': {
    name: 'Barcelona',
    shortCode: 'FCB',
    logoUrl: 'https://images.fotmob.com/image_resources/logo/teamlogo/8634.png',
    accentColor: '#a855f7',
    glowColor: 'rgba(168, 85, 247, 0.4)',
    countryOrCity: 'Barcelona, Spain'
  },
  'chelsea': {
    name: 'Chelsea',
    shortCode: 'CHE',
    logoUrl: 'https://images.fotmob.com/image_resources/logo/teamlogo/8455.png',
    accentColor: '#3b82f6',
    glowColor: 'rgba(59, 130, 246, 0.4)',
    countryOrCity: 'London, England'
  },
  'liverpool': {
    name: 'Liverpool',
    shortCode: 'LIV',
    logoUrl: 'https://images.fotmob.com/image_resources/logo/teamlogo/8650.png',
    accentColor: '#dc2626',
    glowColor: 'rgba(220, 38, 38, 0.4)',
    countryOrCity: 'Liverpool, England'
  },
  'bayern munich': {
    name: 'Bayern Munich',
    shortCode: 'BAY',
    logoUrl: 'https://images.fotmob.com/image_resources/logo/teamlogo/9823.png',
    accentColor: '#e11d48',
    glowColor: 'rgba(225, 29, 72, 0.4)',
    countryOrCity: 'Munich, Germany'
  },
  'dortmund': {
    name: 'Borussia Dortmund',
    shortCode: 'BVB',
    logoUrl: 'https://images.fotmob.com/image_resources/logo/teamlogo/9789.png',
    accentColor: '#eab308',
    glowColor: 'rgba(234, 179, 8, 0.4)',
    countryOrCity: 'Dortmund, Germany'
  },
  'inter miami': {
    name: 'Inter Miami CF',
    shortCode: 'MIA',
    logoUrl: 'https://images.fotmob.com/image_resources/logo/teamlogo/1157176.png',
    accentColor: '#f472b6',
    glowColor: 'rgba(244, 114, 182, 0.4)',
    countryOrCity: 'Miami, USA'
  },
  'psg': {
    name: 'Paris Saint-Germain',
    shortCode: 'PSG',
    logoUrl: 'https://images.fotmob.com/image_resources/logo/teamlogo/9847.png',
    accentColor: '#1d4ed8',
    glowColor: 'rgba(29, 78, 216, 0.4)',
    countryOrCity: 'Paris, France'
  },
  'juventus': {
    name: 'Juventus',
    shortCode: 'JUV',
    logoUrl: 'https://images.fotmob.com/image_resources/logo/teamlogo/9885.png',
    accentColor: '#f8fafc',
    glowColor: 'rgba(248, 250, 252, 0.4)',
    countryOrCity: 'Turin, Italy'
  }
};

/**
 * Intelligent Team Logo resolver with physical fallbacks
 */
export function getTeamVisual(teamNameOrFixture: string): TeamVisual {
  if (!teamNameOrFixture) {
    return {
      name: 'MTL Club',
      shortCode: 'MTL',
      logoUrl: APP_GENERATED_IMAGES.crestMtlGold,
      accentColor: '#f59e0b',
      glowColor: 'rgba(245, 158, 11, 0.4)',
      countryOrCity: 'Montreal, Canada'
    };
  }

  const query = teamNameOrFixture.toLowerCase().trim();

  // 1. Direct match
  for (const [key, val] of Object.entries(TEAM_VISUALS_REGISTRY)) {
    if (query.includes(key)) {
      return val;
    }
  }

  // 2. Derive initials and fallback to Euro or MTL Shield
  const clean = teamNameOrFixture.replace(/\s+vs\.?\s+.*/i, '').trim();
  const words = clean.split(/\s+/).filter(Boolean);
  const code = words.length >= 2 ? (words[0][0] + words[1][0]).toUpperCase() : clean.substring(0, 3).toUpperCase();

  return {
    name: clean,
    shortCode: code || 'FC',
    logoUrl: APP_GENERATED_IMAGES.crestEuroShield,
    accentColor: '#f59e0b',
    glowColor: 'rgba(245, 158, 11, 0.3)',
    countryOrCity: 'Football Club'
  };
}

/**
 * Resolves both teams in a fixture string (e.g. "Arsenal vs Chelsea")
 */
export function getFixtureTeamsVisuals(fixtureString: string): { home: TeamVisual; away: TeamVisual } {
  if (!fixtureString) {
    return {
      home: getTeamVisual('CF Montréal'),
      away: getTeamVisual('Toronto FC')
    };
  }

  const parts = fixtureString.split(/\s+(?:vs\.?|v)\s+/i);
  const homeName = parts[0]?.trim() || 'Home Team';
  const awayName = parts[1]?.trim() || 'Away Team';

  return {
    home: getTeamVisual(homeName),
    away: getTeamVisual(awayName)
  };
}

/**
 * Presets for Status Reels and Match Story Visuals
 */
export const STATUS_VISUALS_PRESETS = [
  {
    id: 'status_striker_pulse',
    title: 'Striker Pulse 24H',
    description: 'High-intensity striker action under stadium floodlights',
    url: HUB_INTELLIGENT_ASSETS.statusSquare.url,
    onlineUrl: HUB_INTELLIGENT_ASSETS.statusSquare.onlineUrl,
    type: 'image' as const,
    aspect: '1:1',
    tag: 'OFFICIAL HERO'
  },
  {
    id: 'status_dynamic_striker',
    title: 'Electric Matchday Strike',
    description: 'Dynamic striker volley with electric turf particles under floodlights',
    url: HUB_INTELLIGENT_ASSETS.matchFixtureDuel.url,
    onlineUrl: HUB_INTELLIGENT_ASSETS.matchFixtureDuel.onlineUrl,
    type: 'image' as const,
    aspect: '16:9',
    tag: 'MATCHDAY 24H'
  },
  {
    id: 'status_matchday_glow',
    title: 'Championship Matchday Glow',
    description: 'Neon stadium atmosphere with electric match energy',
    url: HUB_INTELLIGENT_ASSETS.matchCardBg.url,
    onlineUrl: HUB_INTELLIGENT_ASSETS.matchCardBg.onlineUrl,
    type: 'image' as const,
    aspect: '16:9',
    tag: 'CHAMPIONS'
  },
  {
    id: 'status_tactical_duel',
    title: 'Tactical Clash Matrix',
    description: 'Intense tactical duel and tactical breakdown',
    url: HUB_INTELLIGENT_ASSETS.tacticalClash.url,
    onlineUrl: HUB_INTELLIGENT_ASSETS.tacticalClash.onlineUrl,
    type: 'image' as const,
    aspect: '16:9',
    tag: 'TACTICAL xG'
  },
  {
    id: 'status_goal_celebration_reel',
    title: '24H Goal Celebration Reel',
    description: 'Electric stadium jubilation and goal eruption',
    url: HUB_INTELLIGENT_ASSETS.statusReelStory.url,
    onlineUrl: HUB_INTELLIGENT_ASSETS.statusReelStory.onlineUrl,
    type: 'image' as const,
    aspect: '4:3',
    tag: 'STADIUM PULSE'
  },
  {
    id: 'status_mtl_gold',
    title: 'MTL Gold Sovereign Crest',
    description: 'Luxury sculpted physical 3D gold club emblem on carbon plate',
    url: APP_GENERATED_IMAGES.crestMtlGold,
    type: 'image' as const,
    aspect: '1:1',
    tag: 'OFFICIAL CLUB'
  },
  {
    id: 'status_euro_champions',
    title: 'Championship Shield',
    description: 'Obsidian carved European champions shield with metallic stars',
    url: APP_GENERATED_IMAGES.crestEuroShield,
    type: 'image' as const,
    aspect: '1:1',
    tag: 'TROPHY RACE'
  },
  {
    id: 'status_goal_celebration_gif',
    title: 'Sensational Goal Flare (Action GIF)',
    description: 'High adrenaline goal celebration with stadium flares and crowd roar',
    url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExOHp1cWwzYnBqYm13bjZ6bnVzNHd0cXZ4Y2N4YnF4NmR3eGxvbnpkayZlcD12MV9naWZzX3NlYXJjaCZjdD1n/3o7TKSx0g720ED0K7e/giphy.gif',
    type: 'image' as const,
    aspect: '16:9',
    tag: 'ACTION GIF'
  },
  {
    id: 'status_ball_fire_gif',
    title: 'Top Bins Curler (Goal GIF)',
    description: 'Upper 90 curling free kick into the back of the net',
    url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExOHp1cWwzYnBqYm13bjZ6bnVzNHd0cXZ4Y2N4YnF4NmR3eGxvbnpkayZlcD12MV9naWZzX3NlYXJjaCZjdD1n/l2JhIq7eB8o39f2Wk/giphy.gif',
    type: 'image' as const,
    aspect: '16:9',
    tag: 'FIRE GIF'
  }
];

/**
 * Editorial News Visual Presets
 */
export const NEWS_VISUALS_PRESETS = [
  {
    category: 'transfers',
    url: HUB_INTELLIGENT_ASSETS.newsWire.url,
    onlineUrl: HUB_INTELLIGENT_ASSETS.newsWire.onlineUrl,
    badgeText: 'TRANSFER WIRE',
    badgeColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
  },
  {
    category: 'tactical',
    url: HUB_INTELLIGENT_ASSETS.tacticalClash.url,
    onlineUrl: HUB_INTELLIGENT_ASSETS.tacticalClash.onlineUrl,
    badgeText: 'TACTICAL MATRIX',
    badgeColor: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40'
  },
  {
    category: 'match_reports',
    url: HUB_INTELLIGENT_ASSETS.matchFixtureDuel.url,
    onlineUrl: HUB_INTELLIGENT_ASSETS.matchFixtureDuel.onlineUrl,
    badgeText: 'MATCHDAY LIVE',
    badgeColor: 'bg-rose-500/20 text-rose-400 border-rose-500/40'
  },
  {
    category: 'champions_league',
    url: HUB_INTELLIGENT_ASSETS.matchCardBg.url,
    onlineUrl: HUB_INTELLIGENT_ASSETS.matchCardBg.onlineUrl,
    badgeText: 'EURO CLASH',
    badgeColor: 'bg-amber-500/20 text-amber-400 border-amber-500/40'
  },
  {
    category: 'club_official',
    url: HUB_INTELLIGENT_ASSETS.advertVip.url,
    onlineUrl: HUB_INTELLIGENT_ASSETS.advertVip.onlineUrl,
    badgeText: 'MTL EXCLUSIVE',
    badgeColor: 'bg-amber-500/25 text-amber-300 border-amber-400/50'
  }
];

/**
 * Football Reaction & Celebrations GIFs
 */
export const FOOTBALL_GIFS_CATALOG = [
  {
    id: 'gif-celebrate-1',
    title: 'Kneeslide Goal Celebration',
    url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExOHp1cWwzYnBqYm13bjZ6bnVzNHd0cXZ4Y2N4YnF4NmR3eGxvbnpkayZlcD12MV9naWZzX3NlYXJjaCZjdD1n/3o7TKSx0g720ED0K7e/giphy.gif'
  },
  {
    id: 'gif-ball-net',
    title: 'Thunderbolt Top Corner',
    url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExOHp1cWwzYnBqYm13bjZ6bnVzNHd0cXZ4Y2N4YnF4NmR3eGxvbnpkayZlcD12MV9naWZzX3NlYXJjaCZjdD1n/l2JhIq7eB8o39f2Wk/giphy.gif'
  },
  {
    id: 'gif-stadium-cheer',
    title: 'Stadium Pyro Flare',
    url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExbms1YmI5aXlyM25va2Z4cWVqZWhudDgyZnF0ODc0dXpudWN2enlycCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/l0MYH8Q83CXvKzXyM/giphy.gif'
  },
  {
    id: 'gif-skill-dribble',
    title: 'Elite Stepover Dribble',
    url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExZ3NnNmhpbHN3NHNvdnBwdG5sYTY3enBvZGZtd3pkYmdwN3FhZzJvbyZlcD12MV9naWZzX3NlYXJjaCZjdD1n/26gsjCZpPolPr3sBy/giphy.gif'
  }
];

/**
 * Intelligent Resolvers for App Elements
 */

// 1. Default News Update Images
export function getDefaultNewsImage(category?: string): string {
  const cat = (category || '').toLowerCase();
  if (cat.includes('transfer') || cat.includes('sign') || cat.includes('rumor')) {
    return HUB_INTELLIGENT_ASSETS.newsWire.url;
  }
  if (cat.includes('tact') || cat.includes('analysis') || cat.includes('xg') || cat.includes('lineup')) {
    return HUB_INTELLIGENT_ASSETS.tacticalClash.url;
  }
  if (cat.includes('report') || cat.includes('live') || cat.includes('derby') || cat.includes('match')) {
    return HUB_INTELLIGENT_ASSETS.matchFixtureDuel.url;
  }
  if (cat.includes('official') || cat.includes('vip') || cat.includes('club') || cat.includes('board')) {
    return HUB_INTELLIGENT_ASSETS.advertVip.url;
  }
  if (cat.includes('euro') || cat.includes('champions') || cat.includes('league')) {
    return HUB_INTELLIGENT_ASSETS.matchCardBg.url;
  }
  return HUB_INTELLIGENT_ASSETS.newsWire.url;
}

// 2. Default Status Update Images
export function getDefaultStatusImage(index = 0): string {
  const statusPool = [
    HUB_INTELLIGENT_ASSETS.statusSquare.url,
    HUB_INTELLIGENT_ASSETS.statusReelStory.url,
    HUB_INTELLIGENT_ASSETS.matchFixtureDuel.url,
    HUB_INTELLIGENT_ASSETS.matchCardBg.url,
    HUB_INTELLIGENT_ASSETS.tacticalClash.url
  ];
  return statusPool[index % statusPool.length];
}

// 3. Advert Images
export function getAdvertBgImage(adUnitOrCampaignId?: string): string {
  const id = (adUnitOrCampaignId || '').toLowerCase();
  if (id.includes('bet') || id.includes('exchange') || id.includes('02')) {
    return HUB_INTELLIGENT_ASSETS.advertPartner.url;
  }
  if (id.includes('cup') || id.includes('esports') || id.includes('03')) {
    return HUB_INTELLIGENT_ASSETS.statusReelStory.url;
  }
  return HUB_INTELLIGENT_ASSETS.advertVip.url;
}

// 4. Match & Fixture Card Backgrounds
export function getMatchCardBg(matchIdOrTeams = ''): string {
  const str = matchIdOrTeams.toLowerCase();
  // Deterministic rotation based on string hash
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  const matchBackgrounds = [
    HUB_INTELLIGENT_ASSETS.matchCardBg.url,
    HUB_INTELLIGENT_ASSETS.matchFixtureDuel.url,
    HUB_INTELLIGENT_ASSETS.tacticalClash.url,
    HUB_INTELLIGENT_ASSETS.statusSquare.url
  ];
  return matchBackgrounds[Math.abs(hash) % matchBackgrounds.length];
}

export function getFixtureCardBg(fixtureIdOrTeams = ''): string {
  const str = fixtureIdOrTeams.toLowerCase();
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  const fixtureBackgrounds = [
    HUB_INTELLIGENT_ASSETS.matchFixtureDuel.url,
    HUB_INTELLIGENT_ASSETS.matchCardBg.url,
    HUB_INTELLIGENT_ASSETS.tacticalClash.url
  ];
  return fixtureBackgrounds[Math.abs(hash) % fixtureBackgrounds.length];
}
