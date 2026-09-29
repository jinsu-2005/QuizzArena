"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  Zap, 
  Users, 
  Smartphone, 
  Sparkles, 
  BarChart3, 
  SlidersHorizontal, 
  Trophy, 
  Clock, 
  Laptop, 
  ArrowRight, 
  Volume2, 
  VolumeX, 
  ShieldCheck,
  CheckCircle2,
  Tv,
  GraduationCap,
  Building2,
  Gamepad2
} from "lucide-react";
import { sounds } from "@/lib/sound";
import { toast } from "sonner";

export default function Home() {
  const router = useRouter();
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [pinInput, setPinInput] = useState("");

  const toggleSound = () => {
    const next = sounds.toggleSound();
    setSoundEnabled(next);
    if (next) sounds.playLockIn();
  };

  const handleJoinByPin = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPin = pinInput.trim().toUpperCase();
    if (!cleanPin) {
      toast.error("Please enter a room PIN");
      return;
    }
    sounds.playLockIn();
    router.push(`/join/${cleanPin}`);
  };

  return (
    <div className="min-h-screen bg-[#070b14] text-[#dfe2f1] flex flex-col overflow-x-hidden selection:bg-indigo-500 selection:text-white">
      {/* Glow mesh background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[1000px] h-[550px] bg-gradient-to-b from-indigo-600/15 via-blue-600/10 to-transparent rounded-full blur-[140px]" />
        <div className="absolute top-96 left-1/6 w-[500px] h-[400px] bg-sky-500/10 rounded-full blur-[130px]" />
        <div className="absolute top-[800px] right-1/6 w-[450px] h-[450px] bg-purple-600/10 rounded-full blur-[140px]" />
      </div>

      {/* HEADER */}
      <header className="sticky top-0 z-50 bg-[#070b14]/80 backdrop-blur-xl border-b border-slate-800/80 transition-colors">
        <div className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between gap-2 sm:gap-4">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 sm:gap-2.5 group shrink-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-400 flex items-center justify-center shadow-[0_0_20px_rgba(99,102,241,0.4)] group-hover:scale-105 transition-transform shrink-0">
              <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-white fill-white" />
            </div>
            <div className="flex items-center">
              <span className="font-heading font-extrabold text-xl sm:text-2xl tracking-tight text-white">
                Buzz<span className="text-cyan-400">Arena</span>
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
            <Link href="/dashboard" className="text-amber-400 hover:text-amber-300 transition-colors font-semibold">Host Hub</Link>
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a>
            <a href="#use-cases" className="hover:text-white transition-colors">Use Cases</a>
          </nav>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Sound FX Toggle */}
            <button
              onClick={toggleSound}
              aria-label="Toggle sound FX"
              className="p-2 sm:p-2.5 rounded-xl bg-slate-800/70 border border-slate-700/60 text-slate-300 hover:text-white hover:bg-slate-700/60 transition-colors shrink-0"
              title={soundEnabled ? "Sound FX Enabled" : "Sound FX Muted"}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-cyan-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
            </button>

            <Link
              href="/create"
              className="inline-flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2 sm:py-2.5 rounded-full bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 text-white font-semibold text-xs sm:text-sm shadow-[0_0_25px_rgba(37,99,235,0.4)] hover:shadow-[0_0_35px_rgba(37,99,235,0.6)] hover:scale-[1.02] active:scale-[0.98] transition-all whitespace-nowrap shrink-0"
            >
              <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-white shrink-0" />
              <span>Host a Quiz</span>
            </Link>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="flex-1">
        {/* HERO SECTION */}
        <section className="relative pt-6 sm:pt-12 pb-10 sm:pb-20 px-3.5 sm:px-6 lg:px-8 max-w-7xl mx-auto flex flex-col items-center text-center">
          {/* Top Pill Badge */}
          <div className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1 sm:py-1.5 rounded-full bg-slate-900/90 border border-indigo-500/30 text-indigo-300 shadow-[0_0_20px_rgba(99,102,241,0.2)] mb-4 sm:mb-8">
            <Zap className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-cyan-400 fill-cyan-400 shrink-0" />
            <span className="text-[10px] sm:text-xs font-bold tracking-normal sm:tracking-widest uppercase whitespace-nowrap">
              <span className="hidden sm:inline">REAL-TIME • SERVER AUTHORITATIVE • NO APP DOWNLOAD</span>
              <span className="sm:hidden">REAL-TIME • ZERO LATENCY BUZZER</span>
            </span>
          </div>

          {/* Main Headline */}
          <h1 className="font-heading font-extrabold text-[27px] leading-[1.15] sm:text-6xl lg:text-7xl text-white tracking-tight sm:leading-[1.1] max-w-4xl mb-3 sm:mb-6">
            Real-Time Multiplayer <br className="hidden sm:inline" />
            <span className="relative inline-block mt-1 sm:mt-2">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-300 to-fuchsia-400">
                Quiz Buzzer Platform
              </span>
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-xs sm:text-xl text-slate-300/90 max-w-2xl leading-relaxed mb-5 sm:mb-10 px-2">
            <span className="hidden sm:inline">
              See Question ➔ Think ➔ Buzz First ➔ Earn Right to Answer ➔ Host Judges ➔ Points Awarded. Built for classrooms, competitions, team events, and casual trivia.
            </span>
            <span className="sm:hidden text-slate-300/80">
              See Question &bull; Buzz First &bull; Answer &bull; Win Points. Fast-paced live buzzer arena for any competition.
            </span>
          </p>

          {/* DUAL ACTION CARD: INSTANT PIN JOIN + CREATE ARENA */}
          <div className="w-full max-w-2xl bg-[#0d1322]/90 border border-slate-800 rounded-2xl sm:rounded-3xl p-4 sm:p-8 shadow-2xl backdrop-blur-xl mb-6 sm:mb-12">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 items-center">
              {/* Left Column: Direct PIN Join */}
              <div className="text-left flex flex-col">
                <span className="text-xs font-bold uppercase tracking-wider text-cyan-400 mb-1">
                  Have a Room PIN?
                </span>
                <h3 className="font-heading font-bold text-lg sm:text-xl text-white mb-2 sm:mb-3">
                  Join Live Match
                </h3>
                <form onSubmit={handleJoinByPin} className="space-y-3">
                  <div className="relative">
                    <input
                      type="text"
                      maxLength={6}
                      value={pinInput}
                      onChange={(e) => setPinInput(e.target.value.toUpperCase())}
                      placeholder="e.g. 674708"
                      inputMode="text"
                      autoCapitalize="characters"
                      autoCorrect="off"
                      spellCheck={false}
                      className="w-full h-11 sm:h-13 px-4 bg-slate-900 border border-slate-700/80 rounded-xl text-center font-mono font-black text-lg sm:text-xl tracking-widest text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-400 transition"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full h-11 sm:h-12 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-bold text-sm shadow-md hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>ENTER GAME</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
              </div>

              {/* Right Column: Host / Create Arena */}
              <div className="text-left flex flex-col p-3.5 sm:p-6 rounded-xl sm:rounded-2xl bg-slate-900/60 border border-slate-800/80">
                <span className="text-xs font-bold uppercase tracking-wider text-fuchsia-400 mb-1">
                  Host an Event?
                </span>
                <h3 className="font-heading font-bold text-lg sm:text-xl text-white mb-1.5 sm:mb-2">
                  Create Tournament
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed mb-3 sm:mb-4">
                  Generate questions instantly with Gemini AI or craft custom questions in the Quiz Studio.
                </p>
                <Link
                  href="/create"
                  className="w-full h-11 sm:h-12 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold text-sm flex items-center justify-center gap-2 transition-all"
                >
                  <Sparkles className="w-4 h-4 text-fuchsia-400" />
                  <span>Create Quiz & Room</span>
                </Link>
              </div>
            </div>
          </div>

          {/* Spec & Trust Badges */}
          <div className="flex flex-wrap items-center justify-center gap-x-4 sm:gap-x-8 gap-y-2 sm:gap-y-3 text-slate-400 text-[11px] sm:text-sm font-medium">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-cyan-400 fill-cyan-400 shrink-0" />
              <span>Sub-15ms Race Lock-in</span>
            </div>
            <div className="flex items-center gap-2">
              <Laptop className="w-4 h-4 text-indigo-400 shrink-0" />
              <span>Works on phones, tablets & projectors</span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Authoritative Neon PostgreSQL Backend</span>
            </div>
          </div>
        </section>

        {/* 4 FEATURE CARDS SECTION */}
        <section id="features" className="py-12 sm:py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-slate-800/80">
          <div className="text-center mb-8 sm:mb-16">
            <h2 className="font-heading font-extrabold text-2xl sm:text-5xl text-white tracking-tight mb-3 sm:mb-4">
              Engineered for High-Stakes Competition
            </h2>
            <p className="text-slate-400 text-sm sm:text-lg max-w-xl mx-auto">
              Every split second counts when bragging rights and tournament trophies are on the line.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {/* Card 1 */}
            <div className="bg-slate-900/60 border border-purple-500/20 hover:border-purple-500/50 p-5 sm:p-6 rounded-2xl backdrop-blur-xl transition-all duration-300 hover:shadow-[0_0_30px_rgba(168,85,247,0.15)] flex flex-col group">
              <div className="w-12 h-12 rounded-xl bg-purple-950/60 border border-purple-600/40 text-purple-400 flex items-center justify-center mb-4 sm:mb-5 group-hover:scale-110 transition-transform">
                <SlidersHorizontal className="w-6 h-6" />
              </div>
              <h3 className="font-heading font-bold text-base sm:text-lg text-white mb-2">
                Powerful Host Controls
              </h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Control questions, manage live timers, evaluate contestant answers, and keep the match running with complete referee authority.
              </p>
            </div>

            {/* Card 2 */}
            <div className="bg-slate-900/60 border border-cyan-500/20 hover:border-cyan-500/50 p-5 sm:p-6 rounded-2xl backdrop-blur-xl transition-all duration-300 hover:shadow-[0_0_30px_rgba(6,182,212,0.15)] flex flex-col group">
              <div className="w-12 h-12 rounded-xl bg-cyan-950/60 border border-cyan-600/40 text-cyan-400 flex items-center justify-center mb-4 sm:mb-5 group-hover:scale-110 transition-transform">
                <Smartphone className="w-6 h-6" />
              </div>
              <h3 className="font-heading font-bold text-base sm:text-lg text-white mb-2">
                Real-Time Mobile Buzzer
              </h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Contenders join with a 6-digit code or QR scan. Features full-screen tactile feedback, haptics, and millisecond reaction timestamps.
              </p>
            </div>

            {/* Card 3 */}
            <div className="bg-slate-900/60 border border-fuchsia-500/20 hover:border-fuchsia-500/50 p-5 sm:p-6 rounded-2xl backdrop-blur-xl transition-all duration-300 hover:shadow-[0_0_30px_rgba(217,70,239,0.15)] flex flex-col group">
              <div className="w-12 h-12 rounded-xl bg-fuchsia-950/60 border border-fuchsia-600/40 text-fuchsia-400 flex items-center justify-center mb-4 sm:mb-5 group-hover:scale-110 transition-transform">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="font-heading font-bold text-base sm:text-lg text-white mb-2">
                AI Quiz Generation
              </h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Generate full topic-specific tournaments in seconds powered by Google Gemini 2.5, or craft custom questions in the Quiz Studio.
              </p>
            </div>

            {/* Card 4 */}
            <div className="bg-slate-900/60 border border-emerald-500/20 hover:border-emerald-500/50 p-5 sm:p-6 rounded-2xl backdrop-blur-xl transition-all duration-300 hover:shadow-[0_0_30px_rgba(160,185,129,0.15)] flex flex-col group">
              <div className="w-12 h-12 rounded-xl bg-emerald-950/60 border border-emerald-600/40 text-emerald-400 flex items-center justify-center mb-4 sm:mb-5 group-hover:scale-110 transition-transform">
                <BarChart3 className="w-6 h-6" />
              </div>
              <h3 className="font-heading font-bold text-base sm:text-lg text-white mb-2">
                Live Leaderboard & Podium
              </h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Server-synchronized points tallying, instant position tracking, and an authentic 3-tier tournament podium finale.
              </p>
            </div>
          </div>
        </section>

        {/* HOW IT WORKS SECTION */}
        <section id="how-it-works" className="py-12 sm:py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-slate-800/80">
          <div className="text-center mb-8 sm:mb-16">
            <div className="inline-block px-3.5 py-1 rounded-full bg-slate-900 border border-slate-700/80 text-cyan-400 text-xs font-bold uppercase tracking-wider mb-3 sm:mb-4">
              TOURNAMENT WORKFLOW
            </div>
            <h2 className="font-heading font-extrabold text-2xl sm:text-5xl text-white tracking-tight mb-3 sm:mb-4">
              How It Works
            </h2>
            <p className="text-slate-400 text-sm sm:text-lg max-w-xl mx-auto">
              From room setup to crowning a tournament champion.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <div className="bg-slate-900/40 border border-slate-800 p-5 sm:p-6 rounded-2xl flex flex-col">
              <span className="w-7 h-7 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center mb-3 sm:mb-4">1</span>
              <h3 className="font-heading font-bold text-base sm:text-lg text-white mb-1.5 sm:mb-2">Create Room</h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Use AI generation or the Quiz Studio to prepare questions, set timers, and launch your match room.
              </p>
            </div>

            <div className="bg-slate-900/40 border border-slate-800 p-5 sm:p-6 rounded-2xl flex flex-col">
              <span className="w-7 h-7 rounded-full bg-cyan-600 text-white text-xs font-bold flex items-center justify-center mb-3 sm:mb-4">2</span>
              <h3 className="font-heading font-bold text-base sm:text-lg text-white mb-1.5 sm:mb-2">Players Join</h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Contenders enter the 6-digit PIN on any phone or laptop, pick an avatar, and mark ready in the lobby.
              </p>
            </div>

            <div className="bg-slate-900/40 border border-slate-800 p-5 sm:p-6 rounded-2xl flex flex-col">
              <span className="w-7 h-7 rounded-full bg-red-600 text-white text-xs font-bold flex items-center justify-center mb-3 sm:mb-4">3</span>
              <h3 className="font-heading font-bold text-base sm:text-lg text-white mb-1.5 sm:mb-2">Race to Buzz</h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Question opens with synchronized countdown. The fastest tap locks the buzzer atomically in milliseconds.
              </p>
            </div>

            <div className="bg-slate-900/40 border border-slate-800 p-5 sm:p-6 rounded-2xl flex flex-col">
              <span className="w-7 h-7 rounded-full bg-amber-600 text-white text-xs font-bold flex items-center justify-center mb-3 sm:mb-4">4</span>
              <h3 className="font-heading font-bold text-base sm:text-lg text-white mb-1.5 sm:mb-2">Judge & Score</h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Host awards points or reopens the buzzer. Live leaderboard updates in real-time until the victory podium.
              </p>
            </div>
          </div>
        </section>

        {/* USE CASES SECTION */}
        <section id="use-cases" className="py-12 sm:py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-slate-800/80">
          <div className="text-center mb-8 sm:mb-16">
            <h2 className="font-heading font-extrabold text-2xl sm:text-5xl text-white tracking-tight mb-3 sm:mb-4">
              Designed For Every Arena
            </h2>
            <p className="text-slate-400 text-sm sm:text-lg max-w-xl mx-auto">
              Engineered to support any competitive environment, from classrooms to auditorium projectors.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
            <div className="p-5 sm:p-6 rounded-2xl bg-[#0d1322]/80 border border-slate-800 flex flex-col">
              <div className="w-12 h-12 rounded-xl bg-blue-950/60 text-blue-400 border border-blue-600/40 flex items-center justify-center mb-3 sm:mb-4">
                <GraduationCap className="w-6 h-6" />
              </div>
              <h3 className="font-heading font-bold text-base sm:text-lg text-white mb-1.5 sm:mb-2">Classrooms & Colleges</h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Active learning buzzer battles. Project questions onto the classroom smartboard while students buzz in from their desks.
              </p>
            </div>

            <div className="p-5 sm:p-6 rounded-2xl bg-[#0d1322]/80 border border-slate-800 flex flex-col">
              <div className="w-12 h-12 rounded-xl bg-fuchsia-950/60 text-fuchsia-400 border border-fuchsia-600/40 flex items-center justify-center mb-3 sm:mb-4">
                <Building2 className="w-6 h-6" />
              </div>
              <h3 className="font-heading font-bold text-base sm:text-lg text-white mb-1.5 sm:mb-2">Corporate & All-Hands</h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Energize town halls and internal training. Host fast-paced knowledge showdowns with company-specific trivia.
              </p>
            </div>

            <div className="p-5 sm:p-6 rounded-2xl bg-[#0d1322]/80 border border-slate-800 flex flex-col">
              <div className="w-12 h-12 rounded-xl bg-emerald-950/60 text-emerald-400 border border-emerald-600/40 flex items-center justify-center mb-3 sm:mb-4">
                <Gamepad2 className="w-6 h-6" />
              </div>
              <h3 className="font-heading font-bold text-base sm:text-lg text-white mb-1.5 sm:mb-2">Pub Trivia & Game Nights</h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Replace clunky hardware buzzers with zero-setup browser links. Instant tie-break resolution and instant scoring.
              </p>
            </div>
          </div>
        </section>

        {/* BOTTOM CALL TO ACTION */}
        <section className="py-12 sm:py-20 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto text-center">
          <div className="bg-gradient-to-b from-indigo-950/40 to-slate-900/60 border border-indigo-500/30 rounded-3xl p-6 sm:p-12 shadow-[0_0_50px_rgba(99,102,241,0.15)] relative overflow-hidden">
            <h2 className="font-heading font-extrabold text-2xl sm:text-5xl text-white mb-3 sm:mb-4">
              Ready to Host Your Tournament?
            </h2>
            <p className="text-slate-300 text-sm sm:text-lg max-w-xl mx-auto mb-6 sm:mb-8">
              Launch a live arena match in under 30 seconds.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
              <Link
                href="/create"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 sm:px-8 py-3.5 sm:py-4 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 text-white font-bold text-sm sm:text-base shadow-xl hover:scale-105 transition-all"
              >
                <Zap className="w-5 h-5 fill-white" />
                <span>Host Tournament Now</span>
              </Link>
              <Link
                href="/join"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 sm:px-8 py-3.5 sm:py-4 rounded-xl bg-slate-800 text-white font-semibold text-sm sm:text-base hover:bg-slate-700 transition-all border border-slate-700"
              >
                <span>Join with PIN</span>
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-slate-800/80 bg-[#070b14] py-8 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 font-bold text-slate-400">
            <Zap className="w-4 h-4 text-cyan-400 fill-cyan-400" />
            <span>BuzzArena • Production Platform</span>
          </div>
          <div>Neon PostgreSQL • Drizzle ORM • Google Gemini AI • Authoritative WebSockets</div>
        </div>
      </footer>
    </div>
  );
}
