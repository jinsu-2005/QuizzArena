"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { 
  Sparkles, 
  PlusCircle, 
  Play, 
  Database, 
  ShieldCheck, 
  HelpCircle, 
  Calendar, 
  Loader2, 
  Layers, 
  FileText,
  Clock,
  Trophy
} from "lucide-react";
import { toast } from "sonner";
import { sounds } from "@/lib/sound";

interface QuizItem {
  id: number;
  title: string;
  description: string | null;
  status: string;
  questionCount: number;
  createdAt: string;
}

const AI_TOPIC_PRESETS = [
  "General Knowledge & Trivia",
  "Computer Science & AI",
  "World History & Revolutions",
  "Science, Biology & Physics",
  "Cinema, Film & Oscars",
  "World Geography & Capitals"
];

export default function HostDashboardPage() {
  const router = useRouter();
  
  const [activeTab, setActiveTab] = useState<"saved" | "drafts" | "ai">("saved");
  const [quizzes, setQuizzes] = useState<QuizItem[]>([]);
  const [drafts, setDrafts] = useState<QuizItem[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [launchingId, setLaunchingId] = useState<number | null>(null);

  // AI Generator state in dashboard
  const [aiTopic, setAiTopic] = useState("");
  const [aiCount, setAiCount] = useState("10");
  const [aiDifficulty, setAiDifficulty] = useState("medium");
  const [aiType, setAiType] = useState("multiple_choice");
  const [aiGenerating, setAiGenerating] = useState(false);

  const fetchQuizzesAndDrafts = async () => {
    try {
      setLoadingData(true);
      const res = await fetch("/api/host/quizzes");
      const data = await res.json();
      if (data.quizzes) setQuizzes(data.quizzes);
      if (data.drafts) setDrafts(data.drafts);
    } catch (err) {
      console.error("Failed to load quizzes:", err);
      toast.error("Failed to load quizzes");
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    fetchQuizzesAndDrafts();
  }, []);

  const handleLaunchRoom = async (quizId: number) => {
    try {
      setLaunchingId(quizId);
      sounds.playLockIn();
      const res = await fetch("/api/host/quizzes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quizId }),
      });
      const data = await res.json();

      if (data.success && data.roomCode) {
        sounds.playCorrect();
        toast.success(`Arena Room #${data.roomCode} launched!`);
        localStorage.setItem(`buzzarena_host_${data.roomCode}`, data.hostToken);
        router.push(`/host/${data.roomCode}?hostToken=${data.hostToken}`);
      } else {
        sounds.playWrong();
        toast.error(data.error || "Failed to launch room");
      }
    } catch (err: any) {
      console.error("Room launch error:", err);
      toast.error("Failed to launch arena room");
    } finally {
      setLaunchingId(null);
    }
  };

  const handleGenerateAI = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiTopic.trim()) {
      toast.error("Please enter a quiz topic.");
      return;
    }

    setAiGenerating(true);
    sounds.playLockIn();
    const toastId = toast.loading("Gemini AI is crafting your buzzer tournament...");

    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: aiTopic.trim(),
          numQuestions: parseInt(aiCount, 10),
          difficulty: aiDifficulty,
          type: aiType,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "AI generation failed");

      sounds.playCorrect();
      toast.success("AI Tournament Quiz Generated!", { id: toastId });

      sessionStorage.setItem("draft_quiz", JSON.stringify(data.quiz));
      router.push("/quiz/draft/edit?from=ai");
    } catch (err: any) {
      sounds.playWrong();
      toast.error(err.message || "Failed to generate AI quiz", { id: toastId });
    } finally {
      setAiGenerating(false);
    }
  };

  const totalQuestions = quizzes.reduce((sum, q) => sum + (q.questionCount || 0), 0) +
    drafts.reduce((sum, q) => sum + (q.questionCount || 0), 0);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Host Welcome & Status Banner */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-slate-900/90 to-amber-950/30 border border-slate-800/80 p-6 sm:p-8">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Host Control Center</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
                Tournament Command Hub
              </h1>
              <p className="text-slate-400 text-sm max-w-2xl">
                Create quizzes, generate questions with Gemini AI, and launch live real-time buzzer battle arenas.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => setActiveTab("ai")}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-slate-950 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>AI Generator</span>
              </button>
              <Link
                href="/create/manual?fresh=true"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-200 bg-slate-800/90 hover:bg-slate-700/90 border border-slate-700 transition-all cursor-pointer"
              >
                <PlusCircle className="w-4 h-4 text-amber-400" />
                <span>New Blank Quiz</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/70">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
              <span>Saved Quizzes</span>
              <Layers className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-white">
              {quizzes.length}
            </div>
            <div className="text-xs text-slate-500 mt-1">Ready for arena</div>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/70">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
              <span>Saved Drafts</span>
              <FileText className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-cyan-400">
              {drafts.length}
            </div>
            <div className="text-xs text-slate-500 mt-1">In-progress tournaments</div>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/70">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
              <span>Total Questions</span>
              <HelpCircle className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-white">
              {totalQuestions}
            </div>
            <div className="text-xs text-slate-500 mt-1">Across all decks</div>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/70">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
              <span>Database Engine</span>
              <Database className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-xl sm:text-2xl font-bold text-white truncate">
              Neon PostgreSQL
            </div>
            <div className="text-xs text-emerald-400 font-medium mt-1 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Connected
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveTab("saved")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition cursor-pointer ${
                activeTab === "saved"
                  ? "bg-amber-400 text-slate-950 shadow-md shadow-amber-500/20"
                  : "text-slate-400 hover:text-white hover:bg-slate-900"
              }`}
            >
              <Trophy className="w-4 h-4" />
              <span>Saved Quizzes</span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                activeTab === "saved" ? "bg-slate-950/20 text-slate-950 font-black" : "bg-slate-800 text-slate-300"
              }`}>
                {quizzes.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("drafts")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition cursor-pointer ${
                activeTab === "drafts"
                  ? "bg-cyan-400 text-slate-950 shadow-md shadow-cyan-500/20"
                  : "text-slate-400 hover:text-white hover:bg-slate-900"
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Drafts</span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                activeTab === "drafts" ? "bg-slate-950/20 text-slate-950 font-black" : "bg-slate-800 text-slate-300"
              }`}>
                {drafts.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("ai")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition cursor-pointer ${
                activeTab === "ai"
                  ? "bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 shadow-md shadow-amber-500/20"
                  : "text-slate-400 hover:text-white hover:bg-slate-900"
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>AI Quiz Generator</span>
            </button>
          </div>

          <button
            onClick={fetchQuizzesAndDrafts}
            className="text-xs font-semibold text-amber-400 hover:text-amber-300 transition cursor-pointer"
          >
            Refresh
          </button>
        </div>

        {/* TAB 1: SAVED QUIZZES */}
        {activeTab === "saved" && (
          <div className="space-y-4">
            {loadingData ? (
              <div className="p-12 text-center rounded-2xl bg-slate-900/40 border border-slate-800">
                <Loader2 className="w-8 h-8 animate-spin text-amber-400 mx-auto mb-3" />
                <p className="text-sm text-slate-400">Loading saved quizzes from Neon PostgreSQL...</p>
              </div>
            ) : quizzes.length === 0 ? (
              <div className="p-12 text-center rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-slate-800/80 flex items-center justify-center mx-auto text-amber-400">
                  <Trophy className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">No published quizzes yet</h3>
                  <p className="text-sm text-slate-400 mt-1 max-w-md mx-auto">
                    Create a quiz manually or generate one with AI to launch your first tournament.
                  </p>
                </div>
                <div className="flex justify-center gap-3 pt-2">
                  <button
                    onClick={() => setActiveTab("ai")}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 transition cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Generate with AI</span>
                  </button>
                  <Link
                    href="/create/manual?fresh=true"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 transition"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>Create Blank Quiz</span>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {quizzes.map((quiz) => (
                  <div
                    key={quiz.id}
                    className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800/90 hover:border-slate-700/90 transition-all flex flex-col justify-between group"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs text-slate-400">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {new Date(quiz.createdAt).toLocaleDateString()}
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-amber-400/10 text-amber-300 font-semibold border border-amber-400/20">
                          {quiz.questionCount} {quiz.questionCount === 1 ? "Question" : "Questions"}
                        </span>
                      </div>

                      <h3 className="text-lg font-bold text-white group-hover:text-amber-400 transition-colors line-clamp-1">
                        {quiz.title}
                      </h3>
                      {quiz.description && (
                        <p className="text-xs text-slate-400 line-clamp-2">
                          {quiz.description}
                        </p>
                      )}
                    </div>

                    <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between gap-3">
                      <button
                        onClick={() => handleLaunchRoom(quiz.id)}
                        disabled={launchingId === quiz.id}
                        className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 transition-all cursor-pointer disabled:opacity-50"
                      >
                        {launchingId === quiz.id ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Launching...</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-3.5 h-3.5 fill-slate-950" />
                            <span>Launch Arena</span>
                          </>
                        )}
                      </button>

                      <Link
                        href={`/quiz/draft/edit?quizId=${quiz.id}`}
                        className="py-2 px-3 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition-all"
                      >
                        Edit
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: DRAFTS */}
        {activeTab === "drafts" && (
          <div className="space-y-4">
            {loadingData ? (
              <div className="p-12 text-center rounded-2xl bg-slate-900/40 border border-slate-800">
                <Loader2 className="w-8 h-8 animate-spin text-cyan-400 mx-auto mb-3" />
                <p className="text-sm text-slate-400">Loading drafts from Neon PostgreSQL...</p>
              </div>
            ) : drafts.length === 0 ? (
              <div className="p-12 text-center rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-slate-800/80 flex items-center justify-center mx-auto text-cyan-400">
                  <FileText className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">No drafts found</h3>
                  <p className="text-sm text-slate-400 mt-1 max-w-md mx-auto">
                    When you save a draft in Quiz Studio, it will be stored securely in your Neon database here.
                  </p>
                </div>
                <div className="pt-2">
                  <Link
                    href="/create/manual?fresh=true"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-slate-950 bg-cyan-400 hover:bg-cyan-300 transition"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>Create a Draft</span>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {drafts.map((draft) => (
                  <div
                    key={draft.id}
                    className="p-5 rounded-2xl bg-slate-900/80 border border-cyan-500/20 hover:border-cyan-500/50 transition-all flex flex-col justify-between group"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs text-slate-400">
                        <span className="flex items-center gap-1 text-slate-400">
                          <Clock className="w-3.5 h-3.5 text-cyan-400" />
                          <span>Last edited {new Date(draft.createdAt).toLocaleDateString()}</span>
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-cyan-400/10 text-cyan-300 font-semibold border border-cyan-400/20 text-[10px] uppercase">
                          Draft ({draft.questionCount} Qs)
                        </span>
                      </div>

                      <h3 className="text-lg font-bold text-white group-hover:text-cyan-400 transition-colors line-clamp-1">
                        {draft.title || "Untitled Draft"}
                      </h3>
                      <p className="text-xs text-slate-500">
                        Saved in Neon PostgreSQL. Ready to continue editing or deploy.
                      </p>
                    </div>

                    <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between gap-3">
                      <Link
                        href={`/quiz/draft/edit?quizId=${draft.id}`}
                        className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold text-slate-950 bg-cyan-400 hover:bg-cyan-300 transition-all"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Resume Editing</span>
                      </Link>

                      <button
                        onClick={() => handleLaunchRoom(draft.id)}
                        disabled={launchingId === draft.id}
                        className="py-2 px-3 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition-all cursor-pointer disabled:opacity-50"
                        title="Launch directly into arena"
                      >
                        Launch
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: INLINE AI GENERATOR */}
        {activeTab === "ai" && (
          <div className="bg-[#0d1322]/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
            <div className="max-w-2xl mx-auto space-y-6">
              <div className="text-center space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto">
                  <Sparkles className="w-6 h-6" />
                </div>
                <h2 className="text-2xl font-black text-white">
                  Generate Tournament with Gemini AI
                </h2>
                <p className="text-slate-400 text-sm">
                  Powered by Google Gemini 2.5 Flash. Enter any subject, textbook chapter, or event theme.
                </p>
              </div>

              {/* Quick Presets */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Popular Tournament Topics
                </label>
                <div className="flex flex-wrap gap-2">
                  {AI_TOPIC_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setAiTopic(preset)}
                      className={`text-xs px-3 py-1.5 rounded-xl border transition cursor-pointer ${
                        aiTopic === preset
                          ? "bg-amber-400 text-slate-950 font-bold border-amber-400"
                          : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-850"
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              <form onSubmit={handleGenerateAI} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Topic, Notes, or Raw Q&A Prompt *
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={aiTopic}
                    onChange={(e) => setAiTopic(e.target.value)}
                    placeholder="e.g. 35 questions on World Cup Champions, OR paste questions & answers: 1. What is the capital of Spain? Answer: Madrid"
                    className="w-full p-3.5 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-400 text-xs font-mono"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    💡 <strong>Manual Support:</strong> Enter questions with answers & options; AI allocates 4 options and assigns the correct option automatically.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                      Question Count
                    </label>
                    <select
                      value={aiCount}
                      onChange={(e) => setAiCount(e.target.value)}
                      className="w-full p-3 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-amber-400"
                    >
                      <option value="5">5 Questions (Quick Round)</option>
                      <option value="10">10 Questions (Standard)</option>
                      <option value="15">15 Questions (Championship)</option>
                      <option value="20">20 Questions (Grand Tournament)</option>
                      <option value="25">25 Questions (25 Qs Arena)</option>
                      <option value="30">30 Questions (30+ Major Tournament)</option>
                      <option value="35">35 Questions (35 Qs Championship)</option>
                      <option value="40">40 Questions (40 Qs Pro League)</option>
                      <option value="50">50 Questions (50 Qs Ultimate Marathon)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                      Difficulty Level
                    </label>
                    <select
                      value={aiDifficulty}
                      onChange={(e) => setAiDifficulty(e.target.value)}
                      className="w-full p-3 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-amber-400"
                    >
                      <option value="easy">Casual / School</option>
                      <option value="medium">College / Club</option>
                      <option value="hard">Pro Quiz Bowl</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                      Format
                    </label>
                    <select
                      value={aiType}
                      onChange={(e) => setAiType(e.target.value)}
                      className="w-full p-3 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-amber-400"
                    >
                      <option value="multiple_choice">Multiple Choice (4 Options)</option>
                      <option value="verbal">Verbal Fast-Buzz</option>
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={aiGenerating}
                  className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl text-sm font-bold text-slate-950 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 shadow-lg shadow-amber-500/20 active:scale-[0.99] transition cursor-pointer disabled:opacity-50 mt-4"
                >
                  {aiGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                      <span>Generating with Gemini AI...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Generate Tournament Deck</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
