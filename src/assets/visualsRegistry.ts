/**
 * MTL Football Hub - Central Physical Visuals & Assets Registry
 * High-definition generated assets, physical team badges, status presets & reaction visuals.
 */

export const APP_GENERATED_IMAGES = {
  crestMtlGold: '/src/assets/images/crest_mtl_gold_1791727567919.jpg',
  crestEuroShield: '/src/assets/images/crest_euro_shield_1791727580565.jpg',
  newsTacticalMastery: '/src/assets/images/news_tactical_mastery_1791727591916.jpg',
  newsTransferBreaking: '/src/assets/images/news_transfer_breaking_1791727603290.jpg',
  statusMatchdayElectric: '/src/assets/images/status_matchday_electric_1791727612787.jpg',
  heroPhysicalShowcase: '/src/assets/images/hero_physical_showcase_1791684418843.jpg'
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
  },
  {
    id: 'cyber-striker-3',
    url: '/src/assets/images/bg_cyber_football_3.jpg',
    onlineUrl: 'https://i.ibb.co/zVP0z819/futuristic-football-soccer-player-with-glowing-lights-23-2151153061.jpg',
    sourceIbb: 'https://ibb.co/SwV9zQ2Y',
    title: 'Futuristic Football Player Glowing Lights'
  },
  {
    id: 'cyber-striker-4',
    url: '/src/assets/images/bg_cyber_football_4.jpg',
    onlineUrl: 'https://i.ibb.co/VcJBSbPp/futuristic-football-game-player-23-2151152988.jpg',
    sourceIbb: 'https://ibb.co/21WKtRfY',
    title: 'Futuristic Football Game Player'
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
    id: 'status_dynamic_striker',
    title: 'Electric Matchday Strike',
    description: 'Dynamic striker volley with electric turf particles under floodlights',
    url: APP_GENERATED_IMAGES.statusMatchdayElectric,
    type: 'image' as const,
    aspect: '9:16',
    tag: 'MATCHDAY 24H'
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
    id: 'status_tunnel_walk',
    title: 'Star Player Tunnel Spotlight',
    description: 'Dramatic stadium tunnel entry with stadium pyro smoke',
    url: APP_GENERATED_IMAGES.newsTransferBreaking,
    type: 'image' as const,
    aspect: '16:9',
    tag: 'STADIUM PULSE'
  },
  {
    id: 'status_tactical_board',
    title: 'Holographic Tactical Pitch',
    description: 'Cybernetic pitch analytics glowing above night pitch',
    url: APP_GENERATED_IMAGES.newsTacticalMastery,
    type: 'image' as const,
    aspect: '16:9',
    tag: 'TACTICAL xG'
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
    url: APP_GENERATED_IMAGES.newsTransferBreaking,
    badgeText: 'TRANSFER WIRE',
    badgeColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
  },
  {
    category: 'tactical',
    url: APP_GENERATED_IMAGES.newsTacticalMastery,
    badgeText: 'TACTICAL MATRIX',
    badgeColor: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40'
  },
  {
    category: 'champions_league',
    url: APP_GENERATED_IMAGES.crestEuroShield,
    badgeText: 'EURO CLASH',
    badgeColor: 'bg-amber-500/20 text-amber-400 border-amber-500/40'
  },
  {
    category: 'club_official',
    url: APP_GENERATED_IMAGES.crestMtlGold,
    badgeText: 'MTL EXCLUSIVE',
    badgeColor: 'bg-amber-500/25 text-amber-300 border-amber-400/50'
  },
  {
    category: 'match_day',
    url: APP_GENERATED_IMAGES.statusMatchdayElectric,
    badgeText: 'MATCHDAY LIVE',
    badgeColor: 'bg-rose-500/20 text-rose-400 border-rose-500/40'
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
