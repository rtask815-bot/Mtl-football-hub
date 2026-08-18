import React from 'react';
import { 
  Search, 
  Bell, 
  ArrowRight, 
  Activity, 
  Brain, 
  MessageSquare, 
  Target, 
  Calendar, 
  Clock, 
  Trophy, 
  User, 
  Newspaper,
  Mouse
} from 'lucide-react';

export default function FootballFansHub() {
  return (
    <div className="min-h-screen bg-[#05080c] text-white font-sans selection:bg-green-500 selection:text-black relative overflow-x-hidden">
      
      {/* Background Lighting & Glow Effects */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[600px] bg-gradient-to-b from-green-500/10 via-emerald-500/5 to-transparent pointer-events-none blur-3xl" />
      
      {/* ---------------- NAVIGATION BAR ---------------- */}
      <header className="relative z-50 border-b border-white/10 bg-black/40 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full border border-green-500/50 bg-green-950/30 flex items-center justify-center shadow-[0_0_15px_rgba(34,197,94,0.3)]">
              {/* Shield/Soccer Ball Logo */}
              <div className="w-6 h-6 border-2 border-green-400 rounded-lg flex items-center justify-center rotate-45">
                <div className="w-2 h-2 bg-green-400 rounded-full" />
              </div>
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-[10px] tracking-widest text-gray-400 font-semibold">MTL</span>
              <span className="text-lg font-black tracking-wider text-white">FOOTBALL</span>
              <span className="text-[9px] tracking-[0.2em] text-green-400 font-bold -mt-1">FANS HUB</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 text-xs font-semibold tracking-wider">
            <a href="#home" className="text-green-400 border-b-2 border-green-400 pb-1 font-bold">HOME</a>
            <a href="#live" className="text-gray-300 hover:text-white transition-colors">LIVE</a>
            <a href="#fixtures" className="text-gray-300 hover:text-white transition-colors">FIXTURES</a>
            <a href="#predictions" className="text-gray-300 hover:text-white transition-colors">PREDICTIONS</a>
            <a href="#community" className="text-gray-300 hover:text-white transition-colors">COMMUNITY</a>
          </nav>

          {/* Header Action Icons */}
          <div className="flex items-center gap-5">
            <button className="text-gray-300 hover:text-white transition-colors">
              <Search className="w-5 h-5" />
            </button>
            <button className="text-gray-300 hover:text-white transition-colors relative">
              <Bell className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-[#05080c]" />
            </button>
            <div className="w-9 h-9 rounded-full overflow-hidden border border-white/20">
              <img 
                src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80" 
                alt="User Profile" 
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </header>

      {/* ---------------- HERO SECTION ---------------- */}
      <section className="relative pt-12 pb-16 text-center px-4">
        {/* Welcome Tag */}
        <p className="text-xs font-bold tracking-[0.4em] text-green-400 uppercase mb-3">
          W E L C O M E &nbsp; T O
        </p>

        {/* Hero Title */}
        <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-wider uppercase leading-none">
          FOOTBALL
        </h1>
        <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-wider uppercase text-green-400 leading-tight drop-shadow-[0_0_35px_rgba(34,197,94,0.4)]">
          FANS HUB
        </h1>

        {/* Tagline */}
        <div className="flex items-center justify-center gap-4 mt-2 text-xs md:text-sm font-semibold tracking-[0.25em] text-gray-300">
          <span className="w-8 h-[1px] bg-gradient-to-r from-transparent to-green-500/50" />
          <span>LIVE IT. PREDICT IT. OWN IT.</span>
          <span className="w-8 h-[1px] bg-gradient-to-l from-transparent to-green-500/50" />
        </div>

        {/* Central glowing soccer ball artwork */}
        <div className="relative w-48 h-48 md:w-64 md:h-64 mx-auto mt-6 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-green-500/20 blur-2xl animate-pulse" />
          <div className="relative w-full h-full rounded-full border border-green-500/30 flex items-center justify-center bg-gradient-to-b from-green-500/10 to-transparent">
            {/* Holographic Glowing Ball */}
            <div className="w-36 h-36 md:w-48 md:h-48 rounded-full border-2 border-green-400/60 shadow-[0_0_50px_rgba(34,197,94,0.5)] flex items-center justify-center bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-emerald-400/30 via-green-950/80 to-black">
              <Activity className="w-20 h-20 text-green-400 opacity-80" />
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- 3x3 DASHBOARD GRID ---------------- */}
      <main className="max-w-6xl mx-auto px-4 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

          {/* CARD 01: LIVE */}
          <div className="group relative bg-[#0b1219]/80 rounded-2xl p-6 border border-green-500/20 hover:border-green-500/60 transition-all duration-300 hover:shadow-[0_0_30px_rgba(34,197,94,0.15)] flex flex-col justify-between min-h-[320px]">
            <div className="flex justify-between items-start">
              <span className="text-xs font-mono text-gray-400">01</span>
              <span className="bg-red-600/90 text-white text-[10px] font-bold px-2 py-0.5 rounded tracking-wider animate-pulse">
                LIVE
              </span>
            </div>

            <div className="my-auto text-center flex flex-col items-center">
              <div className="w-24 h-24 rounded-full bg-green-950/30 border border-green-500/40 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                <Activity className="w-12 h-12 text-green-400 drop-shadow-[0_0_10px_rgba(34,197,94,0.8)]" />
              </div>
              <h3 className="text-xl font-bold tracking-wider text-white">LIVE</h3>
              <p className="text-xs text-gray-400 mt-1 max-w-[200px]">
                Live Matches & Real Time Action
              </p>
            </div>

            <div className="text-center">
              <p className="text-xs font-bold text-green-400 tracking-wider">24 MATCHES LIVE</p>
              <button className="mt-3 w-8 h-8 rounded-full border border-white/10 hover:border-green-400 mx-auto flex items-center justify-center text-gray-400 hover:text-green-400 transition-colors">
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* CARD 02: AI FOOTBALL */}
          <div className="group relative bg-[#0b1219]/80 rounded-2xl p-6 border border-cyan-500/20 hover:border-cyan-500/60 transition-all duration-300 hover:shadow-[0_0_30px_rgba(6,182,212,0.15)] flex flex-col justify-between min-h-[320px]">
            <span className="text-xs font-mono text-gray-400">02</span>

            <div className="my-auto text-center flex flex-col items-center">
              <div className="w-24 h-24 rounded-full bg-cyan-950/30 border border-cyan-500/40 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                <Brain className="w-12 h-12 text-cyan-400 drop-shadow-[0_0_10px_rgba(6,182,212,0.8)]" />
              </div>
              <h3 className="text-xl font-bold tracking-wider text-white">AI FOOTBALL</h3>
              <p className="text-xs text-gray-400 mt-1 max-w-[200px]">
                AI Insights, Analysis & Smart Briefs
              </p>
            </div>

            <div className="text-center">
              <p className="text-xs font-bold text-cyan-400 tracking-wider">POWERED BY MTL AI</p>
              <button className="mt-3 w-8 h-8 rounded-full border border-white/10 hover:border-cyan-400 mx-auto flex items-center justify-center text-gray-400 hover:text-cyan-400 transition-colors">
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* CARD 03: CHAT */}
          <div className="group relative bg-[#0b1219]/80 rounded-2xl p-6 border border-purple-500/20 hover:border-purple-500/60 transition-all duration-300 hover:shadow-[0_0_30px_rgba(168,85,247,0.15)] flex flex-col justify-between min-h-[320px]">
            <span className="text-xs font-mono text-gray-400">03</span>

            <div className="my-auto text-center flex flex-col items-center">
              <div className="w-24 h-24 rounded-full bg-purple-950/30 border border-purple-500/40 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                <MessageSquare className="w-12 h-12 text-purple-400 drop-shadow-[0_0_10px_rgba(168,85,247,0.8)]" />
              </div>
              <h3 className="text-xl font-bold tracking-wider text-white">CHAT</h3>
              <p className="text-xs text-gray-400 mt-1 max-w-[200px]">
                Connect. Discuss. Celebrate.
              </p>
            </div>

            <div className="text-center">
              <p className="text-xs font-bold text-purple-400 tracking-wider">8.4K FANS ONLINE</p>
              <button className="mt-3 w-8 h-8 rounded-full border border-white/10 hover:border-purple-400 mx-auto flex items-center justify-center text-gray-400 hover:text-purple-400 transition-colors">
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* CARD 04: PREDICTIONS */}
          <div className="group relative bg-[#0b1219]/80 rounded-2xl p-6 border border-amber-500/20 hover:border-amber-500/60 transition-all duration-300 hover:shadow-[0_0_30px_rgba(245,158,11,0.15)] flex flex-col justify-between min-h-[320px]">
            <span className="text-xs font-mono text-gray-400">04</span>

            <div className="my-auto text-center flex flex-col items-center">
              <div className="w-24 h-24 rounded-full bg-amber-950/30 border border-amber-500/40 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                <Target className="w-12 h-12 text-amber-400 drop-shadow-[0_0_10px_rgba(245,158,11,0.8)]" />
              </div>
              <h3 className="text-xl font-bold tracking-wider text-white">PREDICTIONS</h3>
              <p className="text-xs text-gray-400 mt-1 max-w-[200px]">
                Predict Matches. Earn Points. Climb the Ranks.
              </p>
            </div>

            <div className="text-center">
              <p className="text-xs font-bold text-amber-400 tracking-wider">12.7K PREDICTIONS TODAY</p>
              <button className="mt-3 w-8 h-8 rounded-full border border-white/10 hover:border-amber-400 mx-auto flex items-center justify-center text-gray-400 hover:text-amber-400 transition-colors">
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* CARD 05: FIXTURES */}
          <div className="group relative bg-[#0b1219]/80 rounded-2xl p-6 border border-teal-500/20 hover:border-teal-500/60 transition-all duration-300 hover:shadow-[0_0_30px_rgba(20,184,166,0.15)] flex flex-col justify-between min-h-[320px]">
            <span className="text-xs font-mono text-gray-400">05</span>

            <div className="my-auto text-center flex flex-col items-center">
              <div className="w-24 h-24 rounded-full bg-teal-950/30 border border-teal-500/40 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                <Calendar className="w-12 h-12 text-teal-400 drop-shadow-[0_0_10px_rgba(20,184,166,0.8)]" />
              </div>
              <h3 className="text-xl font-bold tracking-wider text-white">FIXTURES</h3>
              <p className="text-xs text-gray-400 mt-1 max-w-[200px]">
                Upcoming Matches & Schedules
              </p>
            </div>

            <div className="text-center">
              <p className="text-xs font-bold text-teal-400 tracking-wider">128 MATCHES THIS WEEK</p>
              <button className="mt-3 w-8 h-8 rounded-full border border-white/10 hover:border-teal-400 mx-auto flex items-center justify-center text-gray-400 hover:text-teal-400 transition-colors">
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* CARD 06: PAST FIXTURES */}
          <div className="group relative bg-[#0b1219]/80 rounded-2xl p-6 border border-yellow-500/20 hover:border-yellow-500/60 transition-all duration-300 hover:shadow-[0_0_30px_rgba(234,179,8,0.15)] flex flex-col justify-between min-h-[320px]">
            <span className="text-xs font-mono text-gray-400">06</span>

            <div className="my-auto text-center flex flex-col items-center">
              <div className="w-24 h-24 rounded-full bg-yellow-950/30 border border-yellow-500/40 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                <Clock className="w-12 h-12 text-yellow-400 drop-shadow-[0_0_10px_rgba(234,179,8,0.8)]" />
              </div>
              <h3 className="text-xl font-bold tracking-wider text-white">PAST FIXTURES</h3>
              <p className="text-xs text-gray-400 mt-1 max-w-[200px]">
                Results, History & Legendary Matches
              </p>
            </div>

            <div className="text-center">
              <p className="text-xs font-bold text-yellow-400 tracking-wider">1900 → 3099</p>
              <button className="mt-3 w-8 h-8 rounded-full border border-white/10 hover:border-yellow-400 mx-auto flex items-center justify-center text-gray-400 hover:text-yellow-400 transition-colors">
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* CARD 07: CLUBS */}
          <div className="group relative bg-[#0b1219]/80 rounded-2xl p-6 border border-emerald-500/20 hover:border-emerald-500/60 transition-all duration-300 hover:shadow-[0_0_30px_rgba(16,185,129,0.15)] flex flex-col justify-between min-h-[320px]">
            <span className="text-xs font-mono text-gray-400">07</span>

            <div className="my-auto text-center flex flex-col items-center">
              <div className="w-24 h-24 rounded-full bg-emerald-950/30 border border-emerald-500/40 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                <Trophy className="w-12 h-12 text-emerald-400 drop-shadow-[0_0_10px_rgba(16,185,129,0.8)]" />
              </div>
              <h3 className="text-xl font-bold tracking-wider text-white">CLUBS</h3>
              <p className="text-xs text-gray-400 mt-1 max-w-[200px]">
                Explore Clubs, Stats, Squads & History
              </p>
            </div>

            <div className="text-center">
              <p className="text-xs font-bold text-emerald-400 tracking-wider">650+ CLUBS</p>
              <button className="mt-3 w-8 h-8 rounded-full border border-white/10 hover:border-emerald-400 mx-auto flex items-center justify-center text-gray-400 hover:text-emerald-400 transition-colors">
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* CARD 08: PLAYERS */}
          <div className="group relative bg-[#0b1219]/80 rounded-2xl p-6 border border-blue-500/20 hover:border-blue-500/60 transition-all duration-300 hover:shadow-[0_0_30px_rgba(59,130,246,0.15)] flex flex-col justify-between min-h-[320px]">
            <span className="text-xs font-mono text-gray-400">08</span>

            <div className="my-auto text-center flex flex-col items-center">
              <div className="w-24 h-24 rounded-full bg-blue-950/30 border border-blue-500/40 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                <User className="w-12 h-12 text-blue-400 drop-shadow-[0_0_10px_rgba(59,130,246,0.8)]" />
              </div>
              <h3 className="text-xl font-bold tracking-wider text-white">PLAYERS</h3>
              <p className="text-xs text-gray-400 mt-1 max-w-[200px]">
                Profiles, Stats, Rankings & Comparisons
              </p>
            </div>

            <div className="text-center">
              <p className="text-xs font-bold text-blue-400 tracking-wider">50K+ PLAYERS</p>
              <button className="mt-3 w-8 h-8 rounded-full border border-white/10 hover:border-blue-400 mx-auto flex items-center justify-center text-gray-400 hover:text-blue-400 transition-colors">
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* CARD 09: FOOTBALL IQ */}
          <div className="group relative bg-[#0b1219]/80 rounded-2xl p-6 border border-rose-500/20 hover:border-rose-500/60 transition-all duration-300 hover:shadow-[0_0_30px_rgba(244,63,94,0.15)] flex flex-col justify-between min-h-[320px]">
            <span className="text-xs font-mono text-gray-400">09</span>

            <div className="my-auto text-center flex flex-col items-center">
              <div className="w-24 h-24 rounded-full bg-rose-950/30 border border-rose-500/40 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                <Newspaper className="w-12 h-12 text-rose-400 drop-shadow-[0_0_10px_rgba(244,63,94,0.8)]" />
              </div>
              <h3 className="text-xl font-bold tracking-wider text-white">FOOTBALL IQ</h3>
              <p className="text-xs text-gray-400 mt-1 max-w-[200px]">
                News, Opinions, Transfers & Tactical Insights
              </p>
            </div>

            <div className="text-center">
              <p className="text-xs font-bold text-rose-400 tracking-wider">TRENDING NOW</p>
              <button className="mt-3 w-8 h-8 rounded-full border border-white/10 hover:border-rose-400 mx-auto flex items-center justify-center text-gray-400 hover:text-rose-400 transition-colors">
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

        </div>
      </main>

      {/* ---------------- FOOTER / EXPLORE MORE ---------------- */}
      <footer className="relative border-t border-white/5 py-8 text-center flex flex-col items-center gap-4">
        <p className="text-xs font-bold tracking-[0.3em] text-green-400 uppercase">
          EXPLORE THE FOOTBALL UNIVERSE
        </p>

        {/* Scroll Indicator */}
        <div className="w-6 h-10 border-2 border-green-500/50 rounded-full flex justify-center p-1">
          <div className="w-1.5 h-3 bg-green-400 rounded-full animate-bounce mt-1" />
        </div>
      </footer>

    </div>
  );
                    }
