"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Zap, ArrowLeft, ArrowRight, User } from "lucide-react";
import { toast } from "sonner";
import { sounds } from "@/lib/sound";

const AVATARS = ["⚡", "🚀", "👑", "🔥", "🦁", "🦊", "🎯", "💎"];

export default function JoinPage() {
  const router = useRouter();
  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const [displayName, setDisplayName] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState(AVATARS[0]);
  const [loading, setLoading] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleDigitChange = (index: number, val: string) => {
    const char = val.slice(-1).toUpperCase();
    sounds.playTick();
    const newDigits = [...digits];
    newDigits[index] = char;
    setDigits(newDigits);

    if (char && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/[^a-zA-Z0-9]/g, "").slice(0, 6).toUpperCase();
    if (!pasted) return;
    const newDigits = [...digits];
    for (let i = 0; i < 6; i++) {
      newDigits[i] = pasted[i] || "";
    }
    setDigits(newDigits);
    inputRefs.current[Math.min(pasted.length, 5)]?.focus();
    sounds.playLockIn();
  };

  const roomCode = digits.join("");

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (roomCode.length < 4) {
      toast.error("Please enter a valid room PIN");
      return;
    }
    if (!displayName.trim()) {
      toast.error("Please enter your nickname");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          roomCode: roomCode.trim(), 
          displayName: `${selectedAvatar} ${displayName.trim()}` 
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Room not found or game already finished");

      sounds.playLockIn();
      sessionStorage.setItem(`buzzarena_player_${data.roomCode}`, data.sessionToken);
      localStorage.setItem(`buzzarena_player_${data.roomCode}`, data.sessionToken);
      router.push(`/play/${data.roomCode}?token=${data.sessionToken}`);
    } catch (err: any) {
      sounds.playWrong();
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-[#070b14] text-[#dfe2f1] flex flex-col justify-center items-center p-3.5 sm:p-4 relative selection:bg-indigo-500 selection:text-white overflow-x-hidden">
      {/* Background radial glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[140px] pointer-events-none" />

      {/* Top Header Link */}
      <div className="w-full max-w-md flex items-center justify-between mb-3 sm:absolute sm:top-6 sm:left-6 sm:mb-0 sm:w-auto">
        <Link href="/" className="inline-flex items-center gap-2 text-slate-400 hover:text-white text-xs sm:text-sm py-1.5 px-2.5 rounded-lg bg-slate-900/60 sm:bg-transparent border sm:border-0 border-slate-800 transition">
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </Link>
      </div>

      <div className="w-full max-w-md bg-[#0d1322]/95 border border-slate-800/90 rounded-2xl sm:rounded-3xl p-5 sm:p-8 shadow-2xl backdrop-blur-xl relative my-auto">
        {/* Brand header */}
        <div className="text-center mb-5 sm:mb-8">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-cyan-400 flex items-center justify-center mx-auto mb-2.5 sm:mb-3 shadow-[0_0_25px_rgba(99,102,241,0.4)]">
            <Zap className="w-6 h-6 text-white fill-white" />
          </div>
          <h1 className="font-heading font-extrabold text-xl sm:text-3xl text-white">Join Arena</h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-1">Enter the room PIN displayed on the host screen</p>
        </div>

        <form onSubmit={handleJoin} className="space-y-4 sm:space-y-6">
          {/* Segmented PIN Input */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5 sm:mb-2">
              Room PIN (6 Digits)
            </label>
            <div className="grid grid-cols-6 gap-1.5 sm:gap-2" onPaste={handlePaste}>
              {digits.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => { inputRefs.current[i] = el; }}
                  type="text"
                  inputMode="text"
                  maxLength={1}
                  autoCapitalize="characters"
                  autoCorrect="off"
                  spellCheck={false}
                  value={digit}
                  onChange={(e) => handleDigitChange(i, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(i, e)}
                  className="w-full h-12 sm:h-14 bg-slate-900 border border-slate-700/80 rounded-lg sm:rounded-xl text-center font-mono font-bold text-xl sm:text-2xl text-white focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition"
                />
              ))}
            </div>
          </div>

          {/* Nickname input */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5 sm:mb-2">
              Your Nickname
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <User className="w-5 h-5" />
              </div>
              <input
                type="text"
                maxLength={18}
                placeholder="e.g. SpeedDemon"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full h-12 sm:h-13 pl-11 pr-4 bg-slate-900 border border-slate-700/80 rounded-xl font-medium text-sm sm:text-base text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-400 transition"
              />
            </div>
          </div>

          {/* Emoji Avatar Selector */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5 sm:mb-2">
              Pick Your Arena Avatar
            </label>
            <div className="grid grid-cols-4 sm:flex sm:items-center sm:justify-between gap-2 p-2 bg-slate-900/60 rounded-xl border border-slate-800">
              {AVATARS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => {
                    setSelectedAvatar(emoji);
                    sounds.playTick();
                  }}
                  className={`h-11 sm:h-10 sm:w-10 rounded-lg flex items-center justify-center text-xl transition-all cursor-pointer ${
                    selectedAvatar === emoji
                      ? "bg-blue-600 scale-105 sm:scale-110 shadow-[0_0_15px_rgba(37,99,235,0.5)]"
                      : "hover:bg-slate-800 opacity-60 hover:opacity-100"
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full h-13 sm:h-14 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 text-white font-heading font-bold text-base sm:text-lg shadow-[0_0_30px_rgba(37,99,235,0.4)] hover:shadow-[0_0_40px_rgba(37,99,235,0.6)] hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            {loading ? (
              <span>Connecting to Arena...</span>
            ) : (
              <>
                <span>ENTER ARENA</span>
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
