"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Sparkles, ArrowLeft, ArrowRight, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { sounds } from "@/lib/sound";

const QUICK_TOPICS = [
  "Space & Astronomy",
  "World History & Legends",
  "JavaScript & Web Dev",
  "Cinema & Pop Culture",
  "Science & Chemistry",
  "Geography & Capitals"
];

export default function AIGeneratorPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [topic, setTopic] = useState("");
  const [numQuestions, setNumQuestions] = useState("10");
  const [difficulty, setDifficulty] = useState("medium");
  const [type, setType] = useState("multiple_choice");
  const [instructions, setInstructions] = useState("");

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) {
      toast.error("Please enter a topic.");
      return;
    }

    setLoading(true);
    sounds.playLockIn();
    const toastId = toast.loading("Gemini AI is crafting your buzzer tournament...");

    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic,
          numQuestions: parseInt(numQuestions, 10),
          difficulty,
          style: "competitive buzzer game",
          type,
          instructions
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Quiz generation failed");

      sounds.playCorrect();
      toast.success("Tournament quiz ready!", { id: toastId });

      sessionStorage.setItem("draft_quiz", JSON.stringify(data.quiz));
      router.push("/quiz/draft/edit?from=ai");
    } catch (err: any) {
      sounds.playWrong();
      toast.error(err.message, { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070b14] text-[#dfe2f1] flex flex-col justify-center items-center p-4 sm:p-6 relative selection:bg-indigo-500 selection:text-white">
      {/* Background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-fuchsia-600/10 rounded-full blur-[140px] pointer-events-none" />

      {/* Top back navigation */}
      <div className="absolute top-6 left-6">
        <Link href="/create" className="flex items-center gap-2 text-slate-400 hover:text-white text-sm transition">
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </Link>
      </div>

      <div className="w-full max-w-2xl bg-[#0d1322]/90 border border-slate-800/90 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl relative my-12">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-fuchsia-950/60 border border-fuchsia-500/40 text-fuchsia-400 flex items-center justify-center mx-auto mb-3 shadow-[0_0_25px_rgba(217,70,239,0.3)]">
            <Sparkles className="w-7 h-7" />
          </div>
          <h1 className="font-heading font-extrabold text-2xl sm:text-3xl text-white">
            AI Quiz Studio
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Powered by Google Gemini 2.5 • Instant questions, options & answer keys
          </p>
        </div>

        <form onSubmit={handleGenerate} className="space-y-6">
          {/* Topic Input */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              Topic, Theme, or Raw Questions & Answers *
            </label>
            <textarea
              rows={3}
              placeholder="e.g. 35 questions on Space & Astronomy, OR paste your questions, answers, and options (e.g. 1. What is the powerhouse of the cell? Answer: Mitochondria)"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="w-full p-3.5 bg-slate-900 border border-slate-700/80 rounded-xl text-white placeholder:text-slate-600 focus:outline-none focus:border-fuchsia-400 text-sm font-mono transition"
              required
            />
            <p className="text-[11px] text-slate-400 mt-1">
              💡 <strong>Manual Q&A Support:</strong> You can give questions with your designated correct answers; Gemini AI will allocate 4 options and assign correct options automatically.
            </p>

            {/* Quick Topic Chips */}
            <div className="flex flex-wrap gap-2 mt-3">
              {QUICK_TOPICS.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    setTopic(t);
                    sounds.playTick();
                  }}
                  className="px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs text-slate-400 hover:text-white hover:border-slate-700 transition"
                >
                  + {t}
                </button>
              ))}
            </div>
          </div>

          {/* Grid: Question Count & Difficulty */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Number of Questions
              </label>
              <select
                value={numQuestions}
                onChange={(e) => setNumQuestions(e.target.value)}
                className="w-full h-12 px-3 bg-slate-900 border border-slate-700/80 rounded-xl text-white focus:outline-none focus:border-fuchsia-400"
              >
                <option value="5">5 Questions (Fast Warmup)</option>
                <option value="10">10 Questions (Standard Match)</option>
                <option value="15">15 Questions (Championship)</option>
                <option value="20">20 Questions (Marathon)</option>
                <option value="25">25 Questions (Grand Arena)</option>
                <option value="30">30 Questions (Full Tournament)</option>
                <option value="35">35 Questions (Major Championship)</option>
                <option value="40">40 Questions (40 Qs Pro League)</option>
                <option value="50">50 Questions (50 Qs Ultimate Marathon)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Difficulty Level
              </label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                className="w-full h-12 px-3 bg-slate-900 border border-slate-700/80 rounded-xl text-white focus:outline-none focus:border-fuchsia-400"
              >
                <option value="easy">Easy (Casual & Fun)</option>
                <option value="medium">Medium (Balanced)</option>
                <option value="hard">Hard (Competitive Trivia)</option>
                <option value="mixed">Mixed (Progressive)</option>
              </select>
            </div>
          </div>

          {/* Question Type */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              Question Format
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => { setType("multiple_choice"); sounds.playTick(); }}
                className={`p-3.5 rounded-xl border text-left text-sm font-semibold transition ${
                  type === "multiple_choice"
                    ? "bg-fuchsia-950/40 border-fuchsia-500 text-white shadow-[0_0_15px_rgba(217,70,239,0.2)]"
                    : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
                }`}
              >
                <div>Multiple Choice (4 Options)</div>
                <span className="text-xs text-slate-400 font-normal">Standard 4-option screen display</span>
              </button>

              <button
                type="button"
                onClick={() => { setType("verbal"); sounds.playTick(); }}
                className={`p-3.5 rounded-xl border text-left text-sm font-semibold transition ${
                  type === "verbal"
                    ? "bg-fuchsia-950/40 border-fuchsia-500 text-white shadow-[0_0_15px_rgba(217,70,239,0.2)]"
                    : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
                }`}
              >
                <div>Verbal Fast-Buzz</div>
                <span className="text-xs text-slate-400 font-normal">Buzz in and answer out loud</span>
              </button>
            </div>
          </div>

          {/* Extra Notes */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              Special Instructions (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Focus on 21st century discoveries, avoid sports..."
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              className="w-full h-12 px-4 bg-slate-900 border border-slate-700/80 rounded-xl text-white placeholder:text-slate-600 focus:outline-none focus:border-fuchsia-400 text-sm"
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full h-14 rounded-xl bg-gradient-to-r from-fuchsia-600 via-purple-600 to-indigo-600 text-white font-heading font-bold text-lg shadow-[0_0_35px_rgba(217,70,239,0.4)] hover:shadow-[0_0_45px_rgba(217,70,239,0.6)] hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <Wand2 className="w-5 h-5 animate-spin" />
                <span>Generating Quiz with Gemini...</span>
              </div>
            ) : (
              <>
                <Sparkles className="w-5 h-5 text-fuchsia-300" />
                <span>GENERATE ARENA QUIZ</span>
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
