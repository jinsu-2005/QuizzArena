"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { Trophy, Zap, Award } from "lucide-react";
import { sounds } from "@/lib/sound";

export default function ResultsPage({ params }: { params: Promise<{ roomCode: string }> }) {
  const { roomCode } = use(params);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isHostUser, setIsHostUser] = useState(false);

  useEffect(() => {
    const fetchRoom = async () => {
      let hostToken = localStorage.getItem(`buzzarena_host_${roomCode}`);
      if (!hostToken && typeof window !== "undefined") {
        hostToken = new URLSearchParams(window.location.search).get("hostToken");
        if (hostToken) localStorage.setItem(`buzzarena_host_${roomCode}`, hostToken);
      }
      setIsHostUser(!!hostToken);

      let playerToken = localStorage.getItem(`buzzarena_player_${roomCode}`);
      if (!playerToken && typeof window !== "undefined") {
        playerToken = new URLSearchParams(window.location.search).get("playerToken");
        if (playerToken) localStorage.setItem(`buzzarena_player_${roomCode}`, playerToken);
      }

      const tokenQuery = hostToken ? `hostToken=${hostToken}` : (playerToken ? `playerToken=${playerToken}` : "");
      
      try {
        const res = await fetch(`/api/room/${roomCode}?${tokenQuery}`);
        const resData = await res.json();
        
        if (!res.ok) throw new Error(resData.error || "Failed to load tournament results");
        setData(resData);
        sounds.playCorrect();
      } catch (err: any) {
        console.error("Results fetch error:", err);
        setErrorMsg(err.message || "Failed to load tournament results");
      } finally {
        setLoading(false);
      }
    };
    
    fetchRoom();
  }, [roomCode]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#070b14] text-white flex flex-col items-center justify-center gap-3">
        <Zap className="w-10 h-10 text-cyan-400 animate-pulse" />
        <span className="font-heading font-semibold text-slate-400">Tallying Tournament Scores...</span>
      </div>
    );
  }

  if (errorMsg || !data) {
    return (
      <div className="min-h-screen bg-[#070b14] text-white flex flex-col items-center justify-center p-4 text-center">
        <div className="max-w-md w-full bg-[#0d1322] border border-slate-800 p-8 rounded-3xl shadow-2xl space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-red-600/20 text-red-400 border border-red-500/30 flex items-center justify-center mx-auto">
            <Trophy className="w-6 h-6" />
          </div>
          <h2 className="font-heading font-bold text-xl text-white">Tournament Results Unavailable</h2>
          <p className="text-slate-400 text-xs">{errorMsg || "Room not found or still in progress."}</p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <Link
              href="/"
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition"
            >
              Return Home
            </Link>
            <Link
              href="/join"
              className="px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold transition"
            >
              Join Arena
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const sortedPlayers = (data.players || []).sort((a: any, b: any) => (b.score || 0) - (a.score || 0));
  const first = sortedPlayers[0];
  const second = sortedPlayers[1];
  const third = sortedPlayers[2];

  return (
    <div className="min-h-screen bg-[#070b14] text-[#dfe2f1] p-3 sm:p-8 flex flex-col items-center justify-center relative selection:bg-indigo-500 selection:text-white overflow-x-hidden">
      {/* Background celebration glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-amber-500/10 rounded-full blur-[160px] pointer-events-none" />

      <div className="w-full max-w-4xl flex flex-col items-center text-center relative my-4 sm:my-8">
        <div className="inline-flex items-center gap-2 px-3 sm:px-3.5 py-1.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] sm:text-xs font-bold uppercase tracking-wider mb-3 sm:mb-4 shadow-[0_0_20px_rgba(245,158,11,0.2)]">
          <Trophy className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" />
          <span>TOURNAMENT COMPLETE</span>
        </div>

        <h1 className="font-heading font-extrabold text-3xl sm:text-6xl text-white tracking-tight mb-1 sm:mb-2">
          Victory Podium
        </h1>
        <p className="text-slate-400 text-xs sm:text-base max-w-md mx-auto mb-6 sm:mb-12 px-2">
          {data.quiz?.title || "BuzzArena Match"}
        </p>

        {/* 3-TIER PODIUM DISPLAY */}
        <div className="w-full max-w-2xl grid grid-cols-3 gap-2 sm:gap-4 items-end mb-8 sm:mb-12 px-1 sm:px-0">
          {/* 2nd Place */}
          <div className="flex flex-col items-center">
            {second ? (
              <>
                <div className="w-11 h-11 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-slate-800 border-2 border-slate-400 text-slate-300 flex items-center justify-center font-bold text-lg sm:text-xl mb-2 sm:mb-3 shadow-lg">
                  🥈
                </div>
                <span className="font-heading font-bold text-[11px] sm:text-sm text-white truncate max-w-[85px] sm:max-w-none">
                  {second.displayName}
                </span>
                <span className="font-mono text-cyan-400 font-bold text-[10px] sm:text-sm mb-1.5 sm:mb-2">
                  {second.score} pts
                </span>
              </>
            ) : (
              <div className="h-16 sm:h-20" />
            )}
            <div className="w-full h-24 sm:h-36 rounded-t-xl sm:rounded-t-2xl bg-slate-900 border-t-2 border-x-2 border-slate-700/80 flex items-center justify-center font-heading font-black text-2xl sm:text-4xl text-slate-500">
              2
            </div>
          </div>

          {/* 1st Place (Champion) */}
          <div className="flex flex-col items-center">
            {first ? (
              <>
                <div className="relative mb-2 sm:mb-3">
                  <div className="w-14 h-14 sm:w-22 sm:h-22 rounded-2xl sm:rounded-3xl bg-gradient-to-tr from-amber-600 via-amber-500 to-yellow-300 text-slate-950 flex items-center justify-center font-black text-2xl sm:text-4xl shadow-[0_0_40px_rgba(245,158,11,0.5)]">
                    👑
                  </div>
                  <Award className="w-5 h-5 sm:w-6 sm:h-6 text-amber-300 absolute -top-1.5 -right-1.5 sm:-top-2 sm:-right-2 animate-bounce" />
                </div>
                <span className="font-heading font-extrabold text-xs sm:text-lg text-white truncate max-w-[95px] sm:max-w-none">
                  {first.displayName}
                </span>
                <span className="font-mono text-amber-400 font-extrabold text-xs sm:text-base mb-1.5 sm:mb-2">
                  {first.score} pts
                </span>
              </>
            ) : (
              <div className="h-20 sm:h-24" />
            )}
            <div className="w-full h-32 sm:h-48 rounded-t-xl sm:rounded-t-2xl bg-gradient-to-b from-amber-500/30 to-slate-900 border-t-2 border-x-2 border-amber-500/80 flex items-center justify-center font-heading font-black text-3xl sm:text-5xl text-amber-400 shadow-[0_0_30px_rgba(245,158,11,0.2)]">
              1
            </div>
          </div>

          {/* 3rd Place */}
          <div className="flex flex-col items-center">
            {third ? (
              <>
                <div className="w-11 h-11 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-slate-800 border-2 border-amber-700 text-amber-600 flex items-center justify-center font-bold text-lg sm:text-xl mb-2 sm:mb-3 shadow-lg">
                  🥉
                </div>
                <span className="font-heading font-bold text-[11px] sm:text-sm text-white truncate max-w-[85px] sm:max-w-none">
                  {third.displayName}
                </span>
                <span className="font-mono text-cyan-400 font-bold text-[10px] sm:text-sm mb-1.5 sm:mb-2">
                  {third.score} pts
                </span>
              </>
            ) : (
              <div className="h-14 sm:h-16" />
            )}
            <div className="w-full h-18 sm:h-28 rounded-t-xl sm:rounded-t-2xl bg-slate-900 border-t-2 border-x-2 border-slate-800 flex items-center justify-center font-heading font-black text-xl sm:text-3xl text-slate-600">
              3
            </div>
          </div>
        </div>

        {/* FULL LEADERBOARD LIST */}
        <div className="w-full max-w-lg bg-[#0d1322]/90 border border-slate-800 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-2xl backdrop-blur-xl mb-6 sm:mb-8 text-left">
          <h3 className="font-heading font-extrabold text-sm sm:text-base text-white uppercase tracking-wider mb-3 sm:mb-4 border-b border-slate-800 pb-2.5 sm:pb-3">
            Final Standings
          </h3>
          <div className="space-y-2 max-h-56 sm:max-h-60 overflow-y-auto pr-1">
            {sortedPlayers.map((p: any, idx: number) => (
              <div
                key={p.id}
                className="flex justify-between items-center p-2.5 sm:p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 text-xs sm:text-sm"
              >
                <div className="flex items-center gap-2.5 sm:gap-3 truncate mr-2">
                  <span className="font-mono font-bold text-slate-500 w-4 sm:w-5 shrink-0">{idx + 1}.</span>
                  <span className="font-semibold text-white truncate">{p.displayName}</span>
                </div>
                <span className="font-mono font-bold text-cyan-400 shrink-0">{p.score} pts</span>
              </div>
            ))}
          </div>
        </div>

        {/* RETURN HOME / NEW GAME */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-2.5 sm:gap-3 w-full sm:w-auto px-4 sm:px-0">
          {isHostUser ? (
            <>
              <Link
                href="/dashboard"
                className="px-6 py-3.5 sm:py-3 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-bold text-xs sm:text-sm shadow-lg hover:scale-105 transition text-center"
              >
                Host Hub Dashboard
              </Link>
              <Link
                href="/create"
                className="px-6 py-3.5 sm:py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 font-semibold text-xs sm:text-sm border border-slate-800 transition text-center"
              >
                New Tournament
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/join"
                className="px-6 py-3.5 sm:py-3 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-bold text-xs sm:text-sm shadow-lg hover:scale-105 transition text-center"
              >
                Join Another Match
              </Link>
              <Link
                href="/create"
                className="px-6 py-3.5 sm:py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 font-semibold text-xs sm:text-sm border border-slate-800 transition text-center"
              >
                Host a Quiz
              </Link>
            </>
          )}
          <Link
            href="/"
            className="px-5 py-3.5 sm:py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white font-semibold text-xs sm:text-sm border border-slate-800 transition text-center"
          >
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}
