import React, { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Layers,
  Sparkles,
  TrendingUp,
  Cpu,
  Tv,
  Gamepad2,
  ExternalLink,
  Search,
  Filter,
  Maximize2,
  Minimize2,
  RefreshCw,
  X,
  ArrowLeft,
  Wifi,
  ChevronRight,
  Flame,
  Award,
  Zap,
  Globe,
  Sliders,
  CheckCircle2,
  ShieldCheck,
  Compass
} from "lucide-react";
import UniversalFAB from "../components/UniversalFAB.tsx";
import FloatingBackButton from "../components/FloatingBackButton.tsx";

// -----------------------------------------------------------------------------
// 1. DATASET: 30 PREMIER SPORTS BETTING SITES
// -----------------------------------------------------------------------------
const BETTING_SITES = [
  {
    id: "betika",
    name: "Betika",
    category: "Betting",
    region: "Kenya / Ghana / Africa",
    tagline: "Leading sportsbook with Sababisha Jackpots, live cashout & Shikisha bet builder.",
    url: "https://www.betika.com/",
    badge: "BTK",
    color: "from-yellow-400 to-green-600",
    tags: ["Jackpots", "Live Cashout", "Aviator", "High Odds"]
  },
  {
    id: "1xbet",
    name: "1xBet",
    category: "Betting",
    region: "Global / International",
    tagline: "Massive international sports catalog, high odds, live multi-streaming & crypto.",
    url: "https://1xbet.com/",
    badge: "1XB",
    color: "from-blue-500 to-cyan-600",
    tags: ["1,000+ Daily Events", "Live Video", "Casino", "Crypto"]
  },
  {
    id: "odibets",
    name: "OdiBets",
    category: "Betting",
    region: "Kenya / Africa",
    tagline: "Ultra-fast mobile betting, daily freebets, OdiLeague and fast M-Pesa deposits.",
    url: "https://odibets.com/",
    badge: "ODI",
    color: "from-yellow-500 to-emerald-500",
    tags: ["Daily Freebet", "Mobile First", "OdiLeague", "Instant M-Pesa"]
  },
  {
    id: "sportybet",
    name: "SportyBet",
    category: "Betting",
    region: "Nigeria / Ghana / Kenya",
    tagline: "Lightning-fast live in-play betting, live match tracker & instant withdrawals.",
    url: "https://www.sportybet.com/",
    badge: "SPT",
    color: "from-red-500 to-rose-600",
    tags: ["Instant Cashout", "Live Tracker", "Virtuals", "App"]
  },
  {
    id: "betway",
    name: "Betway",
    category: "Betting",
    region: "Global / UK / Africa",
    tagline: "Official Premier League partner, Betway WinBoost, bet builder & secure payouts.",
    url: "https://www.betway.com/",
    badge: "BTW",
    color: "from-neutral-800 to-emerald-600",
    tags: ["EPL Sponsor", "WinBoost", "Esports", "Licensed"]
  },
  {
    id: "sportpesa",
    name: "SportPesa",
    category: "Betting",
    region: "Kenya / UK / Global",
    tagline: "Mega Jackpot pioneer with comprehensive global football markets and live scores.",
    url: "https://www.sportpesa.com/",
    badge: "SPS",
    color: "from-blue-600 to-indigo-800",
    tags: ["Mega Jackpot", "Global Markets", "Trusted", "Cashout"]
  },
  {
    id: "22bet",
    name: "22Bet",
    category: "Betting",
    region: "Global / Europe / Africa",
    tagline: "Over 1,000 daily sports fixtures, thousands of betting markets and multi-currency.",
    url: "https://22bet.com/",
    badge: "22B",
    color: "from-teal-600 to-emerald-700",
    tags: ["Multi-Currency", "High Odds", "Live Streams", "Accumulator"]
  },
  {
    id: "mozzartbet",
    name: "Mozzart Bet",
    category: "Betting",
    region: "Europe / Kenya / Africa",
    tagline: "World's biggest odds, live virtual games, Super Grand Jackpot and instant tickets.",
    url: "https://www.mozzartbet.co.ke/",
    badge: "MOZ",
    color: "from-yellow-400 to-blue-700",
    tags: ["Biggest Odds", "Super Grand Jackpot", "Virtuals", "Lucky Super 6"]
  },
  {
    id: "bet9ja",
    name: "Bet9ja",
    category: "Betting",
    region: "Nigeria / West Africa",
    tagline: "Nigeria's flagship sports betting brand, live stadium betting and 170% win bonus.",
    url: "https://www.bet9ja.com/",
    badge: "9JA",
    color: "from-green-600 to-emerald-800",
    tags: ["170% Bonus", "Bet9ja League", "Live Stadium", "Cashout"]
  },
  {
    id: "betking",
    name: "BetKing",
    category: "Betting",
    region: "Nigeria / Kenya / Ghana",
    tagline: "The Playground for Kings - KingMaker jackpot, competitive odds and high payout caps.",
    url: "https://www.betking.com/",
    badge: "BKG",
    color: "from-blue-600 to-yellow-500",
    tags: ["KingMaker", "225% Accumulator", "Virtuals", "Fast Settlement"]
  },
  {
    id: "parimatch",
    name: "Parimatch",
    category: "Betting",
    region: "International / Global",
    tagline: "Top international bookmaker, esports betting, UFC partner and live broadcast feeds.",
    url: "https://parimatch.com/",
    badge: "PMT",
    color: "from-amber-400 to-yellow-600",
    tags: ["UFC Official", "Esports", "Live Broadcast", "Cashout"]
  },
  {
    id: "bet365",
    name: "Bet365",
    category: "Betting",
    region: "Global / UK / Europe",
    tagline: "World's favorite online sports betting company with in-play streaming & early payout.",
    url: "https://www.bet365.com/",
    badge: "365",
    color: "from-emerald-700 to-teal-900",
    tags: ["In-Play Video", "2 Goals Ahead Early Payout", "Bet Builder", "Global #1"]
  },
  {
    id: "betpawa",
    name: "Betpawa",
    category: "Betting",
    region: "Uganda / Ghana / Kenya / Nigeria",
    tagline: "Bet small win BIG - up to 1000% win bonus, zero-fee withdrawals and low stake limits.",
    url: "https://www.betpawa.com/",
    badge: "PAW",
    color: "from-lime-500 to-emerald-600",
    tags: ["1000% Win Bonus", "Small Stake", "Zero Fees", "pawa6"]
  },
  {
    id: "melbet",
    name: "Melbet",
    category: "Betting",
    region: "International",
    tagline: "Over 200 live matches daily, accumulator of the day, multi-live streaming & esports.",
    url: "https://melbet.com/",
    badge: "MEL",
    color: "from-amber-500 to-yellow-600",
    tags: ["Multi-Live", "Fast Registration", "Casino", "Weekly Cashback"]
  },
  {
    id: "1win",
    name: "1Win",
    category: "Betting",
    region: "Global / LatAm / CIS",
    tagline: "500% deposit bonus, thousands of sports events, live dealer games and crash titles.",
    url: "https://1win.pro/",
    badge: "1WN",
    color: "from-blue-600 to-indigo-700",
    tags: ["500% Bonus", "Lucky Jet", "Live Casino", "Crypto"]
  },
  {
    id: "betano",
    name: "Betano",
    category: "Betting",
    region: "Europe / LatAm",
    tagline: "Award-winning sportsbook with SuperOdds, Missions, 2 Goals Ahead early payout.",
    url: "https://www.betano.com/",
    badge: "BTO",
    color: "from-orange-500 to-red-600",
    tags: ["SuperOdds", "Missions", "Early Payout", "UEFA Sponsor"]
  },
  {
    id: "premierbet",
    name: "Premier Bet",
    category: "Betting",
    region: "Central & West Africa",
    tagline: "Premier sports betting and lotto across Africa with local mobile money integration.",
    url: "https://www.premierbet.com/",
    badge: "PBT",
    color: "from-green-600 to-lime-600",
    tags: ["African Leader", "Mega Lotto", "Win Bonus", "Mobile Money"]
  },
  {
    id: "hollywoodbets",
    name: "Hollywoodbets",
    category: "Betting",
    region: "South Africa / UK / Ireland",
    tagline: "South Africa's premier betting operator for football, horse racing, Spina Zonke & lucky numbers.",
    url: "https://www.hollywoodbets.net/",
    badge: "HWB",
    color: "from-purple-600 to-pink-600",
    tags: ["Horse Racing", "Spina Zonke", "Lucky Numbers", "Premier League"]
  },
  {
    id: "betwinner",
    name: "BetWinner",
    category: "Betting",
    region: "Global",
    tagline: "Competitive odds, advanced multi-live interface, betting exchange & 24/7 support.",
    url: "https://betwinner.com/",
    badge: "BWN",
    color: "from-green-500 to-emerald-700",
    tags: ["Multi-Live", "Bet Constructor", "Big Payouts", "Mobile App"]
  },
  {
    id: "bangbet",
    name: "Bangbet",
    category: "Betting",
    region: "East & West Africa",
    tagline: "Instant registration, high odds on popular leagues and daily free prediction prizes.",
    url: "https://www.bangbet.com/",
    badge: "BNG",
    color: "from-yellow-400 to-amber-600",
    tags: ["Free Cash", "Bang Casino", "Daily Jackpot", "Live Stream"]
  },
  {
    id: "betsson",
    name: "Betsson",
    category: "Betting",
    region: "Nordics / Europe / LatAm",
    tagline: "Swedish gaming giant with 50+ years of sportsbook heritage and top player safety.",
    url: "https://www.betsson.com/",
    badge: "BSN",
    color: "from-orange-500 to-amber-600",
    tags: ["European Heritage", "High Security", "Cashout", "Bet Builder"]
  },
  {
    id: "bwin",
    name: "Bwin",
    category: "Betting",
    region: "Europe / UK / Global",
    tagline: "Pioneer in digital football betting, UEFA Europa League partner & live in-play audio.",
    url: "https://sports.bwin.com/",
    badge: "BWN",
    color: "from-yellow-400 to-neutral-900",
    tags: ["UEFA Partner", "In-Play Audio", "Edit My Bet", "Cash Out"]
  },
  {
    id: "unibet",
    name: "Unibet",
    category: "Betting",
    region: "Europe / UK / Australia",
    tagline: "By players, for players - in-depth betting statistics, Unibet TV and expert tips.",
    url: "https://www.unibet.com/",
    badge: "UBT",
    color: "from-emerald-600 to-green-800",
    tags: ["Unibet TV", "Player Safety", "Deep Statistics", "Racing"]
  },
  {
    id: "dafabet",
    name: "Dafabet",
    category: "Betting",
    region: "Asia / UK / Global",
    tagline: "Asia's leading sportsbook, major European club sponsor and live casino dealer.",
    url: "https://www.dafabet.com/",
    badge: "DAF",
    color: "from-red-600 to-yellow-500",
    tags: ["Celtic Sponsor", "Asian Handicap", "Speed Payouts", "VIP Club"]
  },
  {
    id: "stake",
    name: "Stake",
    category: "Betting",
    region: "Global (Crypto)",
    tagline: "The world's biggest crypto sportsbook and casino, Everton FC & UFC partner.",
    url: "https://stake.com/",
    badge: "STK",
    color: "from-slate-700 to-slate-900",
    tags: ["Crypto Betting", "Everton FC", "Instant Cashout", "VIP Rakeback"]
  },
  {
    id: "888sport",
    name: "888sport",
    category: "Betting",
    region: "UK / Europe / Global",
    tagline: "Daily enhanced odds, Acca Club free bets, live in-play and comprehensive football feeds.",
    url: "https://www.888sport.com/",
    badge: "888",
    color: "from-orange-500 to-neutral-900",
    tags: ["Acca Club", "Enhanced Odds", "Live Stats", "Bet Finder"]
  },
  {
    id: "betvictor",
    name: "BetVictor",
    category: "Betting",
    region: "UK / Europe / Canada",
    tagline: "Consistently rated top for best odds on Premier League football and #PriceItUp.",
    url: "https://www.betvictor.com/",
    badge: "BVR",
    color: "from-blue-500 to-indigo-800",
    tags: ["#PriceItUp", "Best Odds Guaranteed", "Fast Payouts", "UK Licensed"]
  },
  {
    id: "marathonbet",
    name: "Marathonbet",
    category: "Betting",
    region: "Global",
    tagline: "Famous for zero-margin odds on major football events, giving the highest returns.",
    url: "https://www.marathonbet.com/",
    badge: "MAR",
    color: "from-cyan-600 to-blue-800",
    tags: ["Zero Margin", "Highest Returns", "Asian Odds", "Live Center"]
  },
  {
    id: "betfair",
    name: "Betfair",
    category: "Betting",
    region: "UK / Global",
    tagline: "World's biggest betting exchange - back and lay bets against other players.",
    url: "https://www.betfair.com/",
    badge: "BFR",
    color: "from-yellow-400 to-amber-500",
    tags: ["Betting Exchange", "Lay Bets", "Cash Out+", "Exchange Odds"]
  },
  {
    id: "williamhill",
    name: "William Hill",
    category: "Betting",
    region: "UK / Global",
    tagline: "Heritage British bookmaker with live audio commentary, Scratch of the Day & Build #YourOdds.",
    url: "https://sports.williamhill.com/",
    badge: "WHM",
    color: "from-blue-700 to-yellow-500",
    tags: ["British Heritage", "Build #YourOdds", "Live Radio", "Top Security"]
  }
];

// -----------------------------------------------------------------------------
// 2. DATASET: 18 BET PREDICTION SITES (AI & STATISTICAL)
// -----------------------------------------------------------------------------
const PREDICTION_SITES = [
  {
    id: "forebet",
    name: "Forebet",
    category: "Prediction",
    type: "AI & Mathematical Model",
    tagline: "Mathematical football predictions, probabilities and deep algorithms for 500+ leagues.",
    url: "https://www.forebet.com/",
    badge: "FOR",
    color: "from-emerald-500 to-teal-700",
    tags: ["Mathematical AI", "Score Prediction", "xG Models", "Over/Under"]
  },
  {
    id: "predictz",
    name: "PredictZ",
    category: "Prediction",
    type: "Form & Statistical Tips",
    tagline: "Free football predictions, betting tips, league tables, results and form analysis.",
    url: "https://www.predictz.com/",
    badge: "PRZ",
    color: "from-blue-500 to-indigo-700",
    tags: ["Free Tips", "Form Guide", "League Tables", "Correct Scores"]
  },
  {
    id: "statarea",
    name: "Statarea",
    category: "Prediction",
    type: "Statistical Probability Matrix",
    tagline: "Advanced statistical algorithmic football outcome probabilities, percentages & odds comparison.",
    url: "https://www.statarea.com/",
    badge: "STA",
    color: "from-cyan-500 to-blue-700",
    tags: ["Probabilities %", "Head to Head", "Team Comparison", "Algorithmic"]
  },
  {
    id: "windrawwin",
    name: "WinDrawWin",
    category: "Prediction",
    type: "Tips, Streaks & Trends",
    tagline: "Free football predictions, statistics, betting trends, league tables and winning streaks.",
    url: "https://www.windrawwin.com/",
    badge: "WDW",
    color: "from-green-500 to-emerald-700",
    tags: ["Winning Streaks", "BTTS Tips", "Corner Stats", "Over 2.5"]
  },
  {
    id: "vitibet",
    name: "Vitibet",
    category: "Prediction",
    type: "Computer Predictive Index",
    tagline: "Computer-generated probability ratings, goals index and outcome tips for the next 6 days.",
    url: "https://www.vitibet.com/",
    badge: "VIT",
    color: "from-orange-500 to-amber-700",
    tags: ["Computer Index", "6-Day Forecast", "Exact Scores", "Goal Expectancy"]
  },
  {
    id: "betensured",
    name: "Betensured",
    category: "Prediction",
    type: "Analyst & Expert Previews",
    tagline: "Top-tier football analytics, match previews and data-backed low-risk betting selections.",
    url: "https://www.betensured.com/",
    badge: "BEN",
    color: "from-teal-500 to-emerald-800",
    tags: ["Expert Previews", "Super Weekend", "Double Chance", "Low Risk"]
  },
  {
    id: "footballwhispers",
    name: "Football Whispers",
    category: "Prediction",
    type: "Tactical & Match Previews",
    tagline: "Data-backed previews, team news, lineup confirmations and expert tactical predictions.",
    url: "https://footballwhispers.com/",
    badge: "FWH",
    color: "from-indigo-500 to-purple-700",
    tags: ["Tactical Analysis", "Team News", "Player Props", "EPL Tips"]
  },
  {
    id: "soccervista",
    name: "SoccerVista",
    category: "Prediction",
    type: "Classic Pick Archive",
    tagline: "Pioneering soccer betting tips, match picks of the day and comprehensive league rosters.",
    url: "https://www.soccervista.com/",
    badge: "SV",
    color: "from-blue-600 to-sky-700",
    tags: ["Pick of the Day", "Classic Engine", "Head 2 Head", "Draw Predictions"]
  },
  {
    id: "zulubet",
    name: "ZuluBet",
    category: "Prediction",
    type: "Algorithmic Soccer Picks",
    tagline: "Automated daily football predictions based on statistical metrics and match probability algorithms.",
    url: "https://www.zulubet.com/",
    badge: "ZLU",
    color: "from-emerald-600 to-green-700",
    tags: ["Algorithmic", "Daily Matches", "Win Chances", "Simplified Picks"]
  },
  {
    id: "betexplorer",
    name: "BetExplorer",
    category: "Prediction",
    type: "Odds & Streak Comparison",
    tagline: "Comprehensive odds comparison, streaks, winning sequences and statistical form tables.",
    url: "https://www.betexplorer.com/",
    badge: "BEX",
    color: "from-slate-600 to-slate-800",
    tags: ["Odds Comparison", "Streaks", "Dropping Odds", "Form Tables"]
  },
  {
    id: "overlyzer",
    name: "Overlyzer",
    category: "Prediction",
    type: "Real-Time Pressure AI",
    tagline: "Real-time match pressure graphs, xG momentum & live betting edge across 800+ leagues.",
    url: "https://www.overlyzer.com/",
    badge: "OVL",
    color: "from-rose-500 to-red-700",
    tags: ["Pressure Graphs", "Live Momentum", "Next Goal AI", "Over/Under"]
  },
  {
    id: "tips180",
    name: "Tips180",
    category: "Prediction",
    type: "Risk Management Tips",
    tagline: "Smart football predictions, 50+ leagues, roller tips and risk management strategy.",
    url: "https://www.tips180.com/",
    badge: "T80",
    color: "from-amber-500 to-orange-700",
    tags: ["Rollover Tips", "50+ Leagues", "Risk Managed", "Banker Tips"]
  },
  {
    id: "mightytips",
    name: "MightyTips",
    category: "Prediction",
    type: "Editorial Expert Tips",
    tagline: "Expert match predictions, bookmaker odds analysis and daily accumulator recommendations.",
    url: "https://www.mightytips.com/",
    badge: "MTY",
    color: "from-violet-600 to-purple-800",
    tags: ["Acca Picks", "Odds Comparison", "Expert Previews", "Daily Tips"]
  },
  {
    id: "footystats",
    name: "FootyStats",
    category: "Prediction",
    type: "Deep Football Analytics",
    tagline: "In-depth football stats, xG, corners, cards, form streaks & over/under mathematical models.",
    url: "https://footystats.org/",
    badge: "FST",
    color: "from-emerald-500 to-green-800",
    tags: ["Expected Goals (xG)", "Corner Stats", "Card Stats", "Deep Form"]
  },
  {
    id: "sofascore",
    name: "Sofascore",
    category: "Prediction",
    type: "Player Ratings & Heatmaps",
    tagline: "Live ratings, tactical heatmaps, attack momentum, head-to-head analysis & player performance.",
    url: "https://www.sofascore.com/",
    badge: "SFA",
    color: "from-blue-500 to-cyan-700",
    tags: ["Attack Momentum", "Player Ratings", "Heatmaps", "Live Scores"]
  },
  {
    id: "flashscore",
    name: "Flashscore",
    category: "Prediction",
    type: "Live Scores & Odds",
    tagline: "Instant live scores, H2H statistics, standings, lineups and live market odds movements.",
    url: "https://www.flashscore.com/",
    badge: "FLS",
    color: "from-red-600 to-rose-700",
    tags: ["Fastest Scores", "H2H Records", "Lineup Confirmations", "Odds Drops"]
  },
  {
    id: "kickoff",
    name: "KickOff",
    category: "Prediction",
    type: "Smart Accumulator Engine",
    tagline: "Algorithmic football tips, custom accumulator builder and smart probability calculators.",
    url: "https://kickoff.co.uk/",
    badge: "KOF",
    color: "from-sky-500 to-blue-700",
    tags: ["Smart Accas", "Both Teams to Score", "Over 1.5 Goals", "Form Streaks"]
  },
  {
    id: "feedinco",
    name: "Feedinco",
    category: "Prediction",
    type: "AI Football Projections",
    tagline: "AI and mathematical football betting predictions across global leagues and tournaments.",
    url: "https://www.feedinco.com/",
    badge: "FDC",
    color: "from-amber-400 to-emerald-600",
    tags: ["AI Machine Models", "BTTS Tips", "1X2 Predictions", "Asian Lines"]
  }
];

// -----------------------------------------------------------------------------
// 3. DATASET: 14 GAMBLING, AVIATOR & 'VIRTUAL' GAMES
// -----------------------------------------------------------------------------
const VIRTUAL_GAMES = [
  {
    id: "spribe-aviator",
    name: "Aviator Official (Spribe)",
    category: "Virtual & Crash",
    type: "Crash / Flight Game",
    tagline: "The world's #1 social multiplayer crash game - cash out before the lucky red plane flies away!",
    url: "https://spribe.co/games/aviator",
    badge: "✈️ AVI",
    color: "from-red-600 via-rose-600 to-amber-500",
    tags: ["Official Spribe", "Multiplayer", "Live Multiplier", "Provably Fair"]
  },
  {
    id: "betika-aviator",
    name: "Betika Aviator",
    category: "Virtual & Crash",
    type: "Live Aviator Arena",
    tagline: "Play Aviator live with instant mobile cashouts, fast M-Pesa payouts and daily rain freebets.",
    url: "https://www.betika.com/en-ke/aviator",
    badge: "✈️ BTK",
    color: "from-yellow-500 to-red-600",
    tags: ["Instant Cashout", "Free Rain", "Live Chat", "Fast Flight"]
  },
  {
    id: "odibets-aviator",
    name: "Odibets Aviator",
    category: "Virtual & Crash",
    type: "High-Frequency Flight",
    tagline: "Fly high with Odibets Aviator - fast multiplier crash game with round-the-clock flights.",
    url: "https://odibets.com/aviator",
    badge: "✈️ ODI",
    color: "from-amber-400 to-red-600",
    tags: ["High Multiplier", "Mobile Optimized", "Auto Cashout", "Provably Fair"]
  },
  {
    id: "sportybet-virtuals",
    name: "SportyBet Instant Virtuals",
    category: "Virtual & Crash",
    type: "Virtual Football League",
    tagline: "High-speed simulated virtual football leagues every 3 minutes with real-time video highlights.",
    url: "https://www.sportybet.com/ke/virtual/",
    badge: "⚽ SPT",
    color: "from-red-500 to-rose-700",
    tags: ["3-Min Matches", "Virtual Premier", "Instant Settlement", "Highlights"]
  },
  {
    id: "1xbet-virtuals",
    name: "1xBet Virtual Sports Arena",
    category: "Virtual & Crash",
    type: "Multi-Provider Virtuals",
    tagline: "Golden Race, Leap Gaming & Global Bet 3D photorealistic virtual football and basketball matches.",
    url: "https://1xbet.com/en/virtualsports",
    badge: "🎮 1XB",
    color: "from-blue-600 to-cyan-600",
    tags: ["Golden Race", "Leap Gaming", "Global Bet", "24/7 Action"]
  },
  {
    id: "betway-virtuals",
    name: "Betway Virtual Sports",
    category: "Virtual & Crash",
    type: "Virtual Premier & Horses",
    tagline: "Non-stop virtual football league and photorealistic horse racing simulation with fast settlements.",
    url: "https://www.betway.com/virtual-sports",
    badge: "🐎 BTW",
    color: "from-neutral-800 to-emerald-600",
    tags: ["Virtual League", "Horses", "Greyhounds", "Instant Results"]
  },
  {
    id: "betpawa-virtuals",
    name: "Betpawa Virtuals Championship",
    category: "Virtual & Crash",
    type: "Continuous Simulated League",
    tagline: "Continuous 24/7 virtual league matches, fast settlement and massive accumulator win bonuses.",
    url: "https://www.betpawa.com/virtuals",
    badge: "🏆 PAW",
    color: "from-lime-500 to-emerald-700",
    tags: ["Continuous Play", "High Bonus", "Fast Result", "Low Minimum"]
  },
  {
    id: "mozzart-virtuals",
    name: "Mozzart Virtual Arena",
    category: "Virtual & Crash",
    type: "Golden Race & Lucky 6",
    tagline: "Golden Race football, virtual motorbikes, dog races, roulette & Lucky Super 6 numbers.",
    url: "https://www.mozzartbet.co.ke/en/virtual-games",
    badge: "🎲 MOZ",
    color: "from-yellow-400 to-blue-700",
    tags: ["Lucky Super 6", "Golden Race", "Virtual Dogs", "Live Animation"]
  },
  {
    id: "kiron-virtuals",
    name: "Kiron Interactive Virtuals",
    category: "Virtual & Crash",
    type: "Award-Winning 3D Physics",
    tagline: "Award-winning photorealistic virtual football, basketball, racing and archery game engines.",
    url: "https://kironinteractive.com/games/",
    badge: "🎯 KIR",
    color: "from-cyan-600 to-blue-700",
    tags: ["Photorealistic 3D", "Global Physics", "Football", "Racing Engine"]
  },
  {
    id: "golden-race",
    name: "Golden Race 3D Virtuals",
    category: "Virtual & Crash",
    type: "Market-Leading 3D Sports",
    tagline: "Market-leading 3D virtual football leagues, cup tournaments and live animated dog races.",
    url: "https://goldenrace.com/games",
    badge: "🥇 GDR",
    color: "from-amber-400 to-yellow-600",
    tags: ["World Leader", "Full 3D Engine", "All Leagues", "Realistic Odds"]
  },
  {
    id: "spribe-turbo",
    name: "Spribe Turbo Games Hub",
    category: "Virtual & Crash",
    type: "Mines, Dice & Plinko",
    tagline: "Next-gen arcade gambling: Mines, Dice, Plinko, Mini Roulette, Keno and Hi-Lo titles.",
    url: "https://spribe.co/games/mines",
    badge: "💣 SPR",
    color: "from-emerald-500 to-teal-700",
    tags: ["Mines", "Dice", "Plinko", "Provably Fair Arcade"]
  },
  {
    id: "pragmatic-virtuals",
    name: "Pragmatic Play Virtual Sports",
    category: "Virtual & Crash",
    type: "3D Penalty & Greyhounds",
    tagline: "Ultra-realistic 3D football penalty shootout, horseracing and steeple-chase games.",
    url: "https://www.pragmaticplay.com/en/games/virtual-sports/",
    badge: "🎰 PRG",
    color: "from-orange-500 to-amber-700",
    tags: ["Penalty Shootout", "Greyhounds", "Top Visuals", "RNG Certified"]
  },
  {
    id: "1win-crash",
    name: "1Win Crash & JetX Arena",
    category: "Virtual & Crash",
    type: "JetX & Lucky Jet Crash",
    tagline: "JetX, Lucky Jet, Speed & Cash high-multiplier crash titles with massive winning potential.",
    url: "https://1win.pro/casino",
    badge: "🚀 1WN",
    color: "from-blue-600 to-purple-700",
    tags: ["JetX", "Lucky Jet", "Speed & Cash", "Instant Win"]
  },
  {
    id: "betking-virtuals",
    name: "BetKing King's Virtual League",
    category: "Virtual & Crash",
    type: "Scheduled Rapid Leagues",
    tagline: "Continuous virtual football leagues with high-definition animations and rapid bet settlements.",
    url: "https://www.betking.com/virtuals",
    badge: "👑 BKG",
    color: "from-blue-500 to-indigo-700",
    tags: ["Kings League", "Fast Settlement", "Continuous Action", "HD Video"]
  }
];

export default function OtherApps() {
  const navigate = useNavigate();
  const location = useLocation();

  // Active Dialed App (For Fullscreen Container similar to Famelack)
  const [activeApp, setActiveApp] = useState(null);
  const [isIframeLoading, setIsIframeLoading] = useState(false);
  const [isNativeFullscreen, setIsNativeFullscreen] = useState(false);
  const [ping, setPing] = useState(15);
  const containerRef = useRef(null);
  const iframeRef = useRef(null);

  // Search & Filtering States
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all"); // 'all', 'betting', 'prediction', 'virtual'

  // Latency ping simulation
  useEffect(() => {
    const interval = setInterval(() => {
      setPing(prev => Math.max(11, Math.min(35, prev + (Math.floor(Math.random() * 5) - 2))));
    }, 4500);

    const onFullscreenChange = () => {
      setIsNativeFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);

    const onKeyDown = (e) => {
      if (e.key === "Escape" && activeApp) {
        closeAppContainer();
      }
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      clearInterval(interval);
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [activeApp]);

  // Open App in the In-App Fullscreen Container (similar to Famelack)
  const dialApp = (app) => {
    setIsIframeLoading(true);
    setActiveApp(app);
    setPing(Math.floor(Math.random() * 8) + 12);

    setTimeout(() => {
      setIsIframeLoading(false);
    }, 700);
  };

  // Close the in-app container
  const closeAppContainer = () => {
    setActiveApp(null);
    setIsIframeLoading(false);
  };

  // Reload current iframe
  const reloadCurrentApp = () => {
    if (!activeApp) return;
    setIsIframeLoading(true);
    if (iframeRef.current) {
      const currentUrl = activeApp.url;
      iframeRef.current.src = "about:blank";
      setTimeout(() => {
        if (iframeRef.current) {
          iframeRef.current.src = currentUrl;
        }
        setIsIframeLoading(false);
      }, 300);
    } else {
      setIsIframeLoading(false);
    }
  };

  // Native fullscreen request
  const toggleNativeFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => {
        setIsNativeFullscreen(true);
      }).catch(err => {
        console.warn("Native fullscreen request warning:", err);
      });
    } else {
      document.exitFullscreen().then(() => {
        setIsNativeFullscreen(false);
      }).catch(() => {});
    }
  };

  // Filtered Lists
  const filteredBetting = useMemo(() => {
    return BETTING_SITES.filter(app => {
      const q = searchQuery.toLowerCase().trim();
      if (!q) return true;
      return (
        app.name.toLowerCase().includes(q) ||
        app.region.toLowerCase().includes(q) ||
        app.tagline.toLowerCase().includes(q) ||
        app.tags.some(t => t.toLowerCase().includes(q))
      );
    });
  }, [searchQuery]);

  const filteredPredictions = useMemo(() => {
    return PREDICTION_SITES.filter(app => {
      const q = searchQuery.toLowerCase().trim();
      if (!q) return true;
      return (
        app.name.toLowerCase().includes(q) ||
        app.type.toLowerCase().includes(q) ||
        app.tagline.toLowerCase().includes(q) ||
        app.tags.some(t => t.toLowerCase().includes(q))
      );
    });
  }, [searchQuery]);

  const filteredVirtuals = useMemo(() => {
    return VIRTUAL_GAMES.filter(app => {
      const q = searchQuery.toLowerCase().trim();
      if (!q) return true;
      return (
        app.name.toLowerCase().includes(q) ||
        app.type.toLowerCase().includes(q) ||
        app.tagline.toLowerCase().includes(q) ||
        app.tags.some(t => t.toLowerCase().includes(q))
      );
    });
  }, [searchQuery]);

  const totalResults = filteredBetting.length + filteredPredictions.length + filteredVirtuals.length;

  return (
    <div className="page-container font-['Plus_Jakarta_Sans',sans-serif] min-h-screen bg-[#060b14] bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(16,185,129,0.06),rgba(0,0,0,0))] text-slate-100 pb-20">

      {/* ------------------------------------------------------------- */}
      {/* FULLSCREEN IN-APP CONTAINER (IDENTICAL TO FAMELACK EXPERIENCE)  */}
      {/* ------------------------------------------------------------- */}
      {activeApp && (
        <div 
          ref={containerRef}
          className="fixed inset-0 z-[9999] bg-black flex flex-col w-screen h-screen overflow-hidden animate-in fade-in duration-200"
        >
          {/* Custom MTL In-App Top Bar */}
          <div className="h-14 shrink-0 bg-[#0a0f1d]/95 backdrop-blur-md border-b border-emerald-500/25 z-50 flex items-center justify-between px-3 sm:px-5 shadow-2xl">
            {/* Left: Back to Catalog & App Branding */}
            <div className="flex items-center gap-3">
              <button
                onClick={closeAppContainer}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80 transition-all cursor-pointer text-xs font-bold active:scale-95"
                title="Return to Other Apps Catalog (Esc)"
              >
                <ArrowLeft className="w-4 h-4 text-emerald-400" />
                <span className="hidden sm:inline">Back to Apps</span>
              </button>

              <div className={`w-8 h-8 rounded-xl bg-gradient-to-tr ${activeApp.color || 'from-emerald-500 to-teal-400'} flex items-center justify-center text-slate-950 font-black text-xs shadow-lg`}>
                {activeApp.badge?.slice(0, 3) || "APP"}
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xs sm:text-sm font-black font-['Orbitron'] text-white tracking-wide">
                    {activeApp.name}
                  </h2>
                  <span className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[9px] font-extrabold uppercase font-mono">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    IN-APP PORTAL
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 truncate max-w-xs hidden sm:block">
                  {activeApp.url}
                </p>
              </div>
            </div>

            {/* Right: Quick Tools & Actions */}
            <div className="flex items-center gap-2">
              {/* Latency Pill */}
              <div className="hidden lg:flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-[10px] font-mono text-emerald-400">
                <Wifi className="w-3 h-3" />
                <span>{ping}ms</span>
              </div>

              {/* Reload Button */}
              <button
                onClick={reloadCurrentApp}
                className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80 transition-colors"
                title="Reload Portal Screen"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${isIframeLoading ? 'animate-spin' : ''}`} />
              </button>

              {/* Direct External Link */}
              <a
                href={activeApp.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-cyan-300 hover:text-white border border-cyan-500/30 text-xs font-bold transition-all shadow"
                title="Open in a new browser tab"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Open Browser</span>
              </a>

              {/* Native Fullscreen Button */}
              <button
                onClick={toggleNativeFullscreen}
                className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80 transition-colors hidden sm:block"
                title={isNativeFullscreen ? "Exit Fullscreen" : "Native Fullscreen"}
              >
                {isNativeFullscreen ? <Minimize2 className="w-3.5 h-3.5 text-amber-400" /> : <Maximize2 className="w-3.5 h-3.5 text-emerald-400" />}
              </button>

              {/* Close Button */}
              <button
                onClick={closeAppContainer}
                className="p-2 rounded-xl bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white border border-red-500/40 transition-all cursor-pointer active:scale-95"
                title="Close Container (Esc)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Iframe Viewport: Exact remaining height */}
          <div className="flex-1 w-full min-h-0 bg-black relative overflow-hidden">
            {isIframeLoading && (
              <div className="absolute inset-0 z-30 bg-slate-950/95 backdrop-blur-md flex flex-col items-center justify-center gap-3">
                <div className="w-12 h-12 rounded-2xl border-2 border-emerald-500/30 border-t-emerald-400 animate-spin flex items-center justify-center">
                  <Globe className="w-5 h-5 text-emerald-400" />
                </div>
                <span className="text-xs font-bold font-['Orbitron'] tracking-widest text-emerald-400 uppercase">
                  CONNECTING TO {activeApp.name}...
                </span>
                <span className="text-[11px] text-slate-500">
                  Establishing encrypted gateway proxy ({ping}ms)
                </span>
              </div>
            )}

            {/* Embedded Target Iframe */}
            <iframe
              ref={iframeRef}
              src={activeApp.url}
              title={`${activeApp.name} Portal View`}
              allow="autoplay; fullscreen; encrypted-media; picture-in-picture; display-capture; clipboard-write; microphone; camera; geolocation; web-share"
              allowFullScreen
              referrerPolicy="no-referrer-when-downgrade"
              className="w-full h-full border-0 bg-black block absolute inset-0"
            />
          </div>

          {/* Subtle Fallback Assist Footer Banner */}
          <div className="h-8 shrink-0 bg-[#0a0f1d] border-t border-slate-800/80 px-4 flex items-center justify-between text-[11px] text-slate-400 z-20">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Running inside MTL App Container. If {activeApp.name} restricts in-frame loading, tap</span>
              <a 
                href={activeApp.url} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-cyan-400 font-bold hover:underline inline-flex items-center gap-1"
              >
                <span>Open Browser Tab</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </span>
            <span className="hidden sm:inline text-slate-500 font-mono">SECURE SANDBOX ACTIVE</span>
          </div>

          {/* Dedicated Floating FAB Back Button right on top of the iframe */}
          <FloatingBackButton
            onClick={closeAppContainer}
            label="Exit Portal"
            position="bottom-left"
            zIndex={10001}
            isCloseAction={true}
          />
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* PAGE HERO HEADER                                              */}
      {/* ------------------------------------------------------------- */}
      <div className="page-header flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-[#0a1221] border border-slate-800/90 rounded-2xl p-6 shadow-xl mb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-orbitron text-xs tracking-widest text-emerald-400 uppercase font-bold">
              ALL-IN-ONE SPORTS, BETTING & GAMING HUB
            </span>
          </div>
          <h1 className="page-title flex items-center gap-3 text-2xl sm:text-3xl font-black text-white font-['Orbitron']">
            <Layers className="w-8 h-8 text-emerald-400" />
            OTHER APPS
          </h1>
          <p className="page-subtitle text-xs sm:text-sm text-slate-400 max-w-2xl mt-1">
            Curated portal providing direct full-screen in-app access to 30+ top sports betting platforms, advanced AI prediction engines, and high-multiplier Aviator / virtual games.
          </p>
        </div>

        {/* Quick Category Jump Badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold text-slate-300">
            <span className="text-emerald-400 font-black">{BETTING_SITES.length}</span> Betting
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold text-slate-300">
            <span className="text-cyan-400 font-black">{PREDICTION_SITES.length}</span> Predictions
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold text-slate-300">
            <span className="text-rose-400 font-black">{VIRTUAL_GAMES.length}</span> Virtuals
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* SEARCH BAR & CATEGORY SWITCHER FILTER                         */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-[#0a1221] border border-slate-800/90 rounded-2xl p-4 sm:p-5 shadow-xl mb-8 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          {/* Real-time Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search 60+ apps by name, country (Kenya, Nigeria, UK), aviator, AI, virtuals..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#060c18] border border-slate-700/80 rounded-xl pl-9 pr-9 py-2.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition-all shadow-inner"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-bold overflow-x-auto">
            <button
              onClick={() => setActiveCategory("all")}
              className={`px-3 py-1.5 rounded-lg transition-all shrink-0 ${
                activeCategory === "all"
                  ? "bg-emerald-500 text-slate-950 font-black shadow"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              All Portals ({totalResults})
            </button>
            <button
              onClick={() => setActiveCategory("betting")}
              className={`px-3 py-1.5 rounded-lg transition-all shrink-0 ${
                activeCategory === "betting"
                  ? "bg-emerald-500 text-slate-950 font-black shadow"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              🎰 Betting Sites ({filteredBetting.length})
            </button>
            <button
              onClick={() => setActiveCategory("prediction")}
              className={`px-3 py-1.5 rounded-lg transition-all shrink-0 ${
                activeCategory === "prediction"
                  ? "bg-cyan-500 text-slate-950 font-black shadow"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              🔮 AI & Predictions ({filteredPredictions.length})
            </button>
            <button
              onClick={() => setActiveCategory("virtual")}
              className={`px-3 py-1.5 rounded-lg transition-all shrink-0 ${
                activeCategory === "virtual"
                  ? "bg-rose-500 text-white font-black shadow"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              🚀 Aviator & Virtuals ({filteredVirtuals.length})
            </button>
          </div>
        </div>

        {/* Quick Instructions banner */}
        <div className="flex items-center gap-2 text-[11px] text-slate-400 border-t border-slate-800/80 pt-3">
          <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span>Tap any card to dial and launch the platform directly inside the fullscreen MTL in-app container.</span>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* SECTION 1: 🎰 SPORTS BETTING SITES (30 SITES)                  */}
      {/* ------------------------------------------------------------- */}
      {(activeCategory === "all" || activeCategory === "betting") && (
        <section className="mb-12 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 font-bold">
                🎰
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-black font-['Orbitron'] text-white tracking-wide">
                  SPORTS BETTING SITES ({filteredBetting.length})
                </h2>
                <p className="text-xs text-slate-400">
                  Leading licensed sportsbooks, high odds, live betting and fast cashout portals.
                </p>
              </div>
            </div>
            <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold">
              30+ BOOKMAKERS
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredBetting.map((app) => (
              <div
                key={app.id}
                onClick={() => dialApp(app)}
                className="group p-4 rounded-2xl bg-gradient-to-b from-[#0e182a] to-[#0a1221] border border-slate-800/90 hover:border-emerald-500/60 shadow-xl hover:shadow-emerald-950/30 transition-all cursor-pointer flex flex-col justify-between space-y-3 relative overflow-hidden active:scale-[0.99]"
              >
                {/* Header: Badge & Region */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${app.color} flex items-center justify-center text-slate-950 font-black text-xs font-['Orbitron'] shadow-md`}>
                      {app.badge}
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-white font-['Orbitron'] group-hover:text-emerald-400 transition-colors">
                        {app.name}
                      </h3>
                      <span className="text-[10px] text-slate-400 block font-semibold">
                        {app.region}
                      </span>
                    </div>
                  </div>

                  <span className="text-[9px] font-black font-mono px-2 py-0.5 rounded bg-slate-800 text-emerald-400 border border-slate-700 uppercase">
                    DIAL
                  </span>
                </div>

                {/* Tagline Description */}
                <p className="text-xs text-slate-300 leading-relaxed font-normal">
                  {app.tagline}
                </p>

                {/* Feature Tags & Action Link */}
                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px]">
                  <div className="flex items-center gap-1 flex-wrap">
                    {app.tags.slice(0, 2).map((t, idx) => (
                      <span key={idx} className="px-1.5 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800">
                        {t}
                      </span>
                    ))}
                  </div>

                  <span className="text-emerald-400 font-bold group-hover:translate-x-1 transition-transform flex items-center gap-1 font-['Orbitron']">
                    <span>LAUNCH</span>
                    <ChevronRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            ))}
          </div>

          {filteredBetting.length === 0 && (
            <div className="p-8 text-center text-slate-500 bg-[#091120] border border-slate-800 rounded-2xl text-xs">
              No betting sites found matching your search. Try another keyword.
            </div>
          )}
        </section>
      )}

      {/* ------------------------------------------------------------- */}
      {/* SECTION 2: 🔮 BET PREDICTION SITES (AI & STATISTICAL - 18)     */}
      {/* ------------------------------------------------------------- */}
      {(activeCategory === "all" || activeCategory === "prediction") && (
        <section className="mb-12 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 font-bold">
                🔮
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-black font-['Orbitron'] text-white tracking-wide">
                  BET PREDICTION SITES ({filteredPredictions.length})
                </h2>
                <p className="text-xs text-slate-400">
                  Mathematical football algorithms, predictive match models, probability matrices and form tips.
                </p>
              </div>
            </div>
            <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 font-bold">
              MATCH ANALYTICS
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredPredictions.map((app) => (
              <div
                key={app.id}
                onClick={() => dialApp(app)}
                className="group p-4 rounded-2xl bg-gradient-to-b from-[#0e182a] to-[#0a1221] border border-slate-800/90 hover:border-cyan-500/60 shadow-xl hover:shadow-cyan-950/30 transition-all cursor-pointer flex flex-col justify-between space-y-3 relative overflow-hidden active:scale-[0.99]"
              >
                {/* Header: Badge & Model Type */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${app.color} flex items-center justify-center text-slate-950 font-black text-xs font-['Orbitron'] shadow-md`}>
                      {app.badge}
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-white font-['Orbitron'] group-hover:text-cyan-400 transition-colors">
                        {app.name}
                      </h3>
                      <span className="text-[10px] text-cyan-300 block font-semibold truncate max-w-[130px]">
                        {app.type}
                      </span>
                    </div>
                  </div>

                  <span className="text-[9px] font-black font-mono px-2 py-0.5 rounded bg-slate-800 text-cyan-400 border border-slate-700 uppercase">
                    AI
                  </span>
                </div>

                {/* Tagline Description */}
                <p className="text-xs text-slate-300 leading-relaxed font-normal">
                  {app.tagline}
                </p>

                {/* Feature Tags & Action Link */}
                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px]">
                  <div className="flex items-center gap-1 flex-wrap">
                    {app.tags.slice(0, 2).map((t, idx) => (
                      <span key={idx} className="px-1.5 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800">
                        {t}
                      </span>
                    ))}
                  </div>

                  <span className="text-cyan-400 font-bold group-hover:translate-x-1 transition-transform flex items-center gap-1 font-['Orbitron']">
                    <span>ANALYZE</span>
                    <ChevronRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            ))}
          </div>

          {filteredPredictions.length === 0 && (
            <div className="p-8 text-center text-slate-500 bg-[#091120] border border-slate-800 rounded-2xl text-xs">
              No prediction sites found matching your search.
            </div>
          )}
        </section>
      )}

      {/* ------------------------------------------------------------- */}
      {/* SECTION 3: 🎮 GAMBLING, AVIATOR & 'VIRTUAL' GAMES (14 SITES)    */}
      {/* ------------------------------------------------------------- */}
      {(activeCategory === "all" || activeCategory === "virtual") && (
        <section className="mb-12 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 font-bold">
                🚀
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-black font-['Orbitron'] text-white tracking-wide">
                  AVIATOR, GAMBLING & 'VIRTUAL' GAMES ({filteredVirtuals.length})
                </h2>
                <p className="text-xs text-slate-400">
                  Crash multiplier games (Aviator, JetX), 3D simulated football leagues, Spribe arcade and instant virtual matches.
                </p>
              </div>
            </div>
            <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/30 font-bold">
              CRASH & VIRTUALS
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredVirtuals.map((app) => (
              <div
                key={app.id}
                onClick={() => dialApp(app)}
                className="group p-4 rounded-2xl bg-gradient-to-b from-[#0e182a] to-[#0a1221] border border-slate-800/90 hover:border-rose-500/60 shadow-xl hover:shadow-rose-950/30 transition-all cursor-pointer flex flex-col justify-between space-y-3 relative overflow-hidden active:scale-[0.99]"
              >
                {/* Header: Badge & Game Type */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${app.color} flex items-center justify-center text-white font-black text-xs font-['Orbitron'] shadow-md`}>
                      {app.badge?.slice(0, 5)}
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-white font-['Orbitron'] group-hover:text-rose-400 transition-colors">
                        {app.name}
                      </h3>
                      <span className="text-[10px] text-rose-300 block font-semibold truncate max-w-[130px]">
                        {app.type}
                      </span>
                    </div>
                  </div>

                  <span className="text-[9px] font-black font-mono px-2 py-0.5 rounded bg-slate-800 text-rose-400 border border-slate-700 uppercase">
                    PLAY
                  </span>
                </div>

                {/* Tagline Description */}
                <p className="text-xs text-slate-300 leading-relaxed font-normal">
                  {app.tagline}
                </p>

                {/* Feature Tags & Action Link */}
                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px]">
                  <div className="flex items-center gap-1 flex-wrap">
                    {app.tags.slice(0, 2).map((t, idx) => (
                      <span key={idx} className="px-1.5 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800">
                        {t}
                      </span>
                    ))}
                  </div>

                  <span className="text-rose-400 font-bold group-hover:translate-x-1 transition-transform flex items-center gap-1 font-['Orbitron']">
                    <span>ENTER</span>
                    <ChevronRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            ))}
          </div>

          {filteredVirtuals.length === 0 && (
            <div className="p-8 text-center text-slate-500 bg-[#091120] border border-slate-800 rounded-2xl text-xs">
              No virtual or crash games found matching your search.
            </div>
          )}
        </section>
      )}

      {/* Floating Action Button */}
      <UniversalFAB
        showBackToDashboard={true}
        onNewAction={() => dialApp(BETTING_SITES[0])}
        newActionLabel="Launch Betika"
        customActions={[
          {
            id: 'predictions',
            label: 'Predictions Hub',
            description: 'Check tactical odds',
            icon: <TrendingUp className="w-4 h-4 text-emerald-400" />,
            onClick: () => navigate('/predictions'),
          },
          {
            id: 'tv_live',
            label: 'Watch Live TV',
            description: 'Famelack Worldwide Stream',
            icon: <Tv className="w-4 h-4 text-cyan-400" />,
            onClick: () => navigate('/tv'),
          },
          {
            id: 'ai_preds',
            label: 'AI Predictions',
            description: 'Neural win-loss analytics',
            icon: <Cpu className="w-4 h-4 text-amber-400" />,
            onClick: () => navigate('/ai-predictions'),
          }
        ]}
      />

    </div>
  );
}
