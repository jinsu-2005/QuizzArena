"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { 
  Zap, 
  Plus, 
  Trash2, 
  Copy, 
  Save, 
  Play, 
  Clock, 
  Trophy, 
  Sparkles, 
  Shuffle, 
  ArrowLeft, 
  Check, 
  HelpCircle, 
  Wand2,
  RotateCcw,
  AlertCircle,
  CheckCircle2,
  Minus,
  X,
  Loader2,
  SlidersHorizontal,
  ChevronRight,
  Eye
} from "lucide-react";
import { toast } from "sonner";
import { sounds } from "@/lib/sound";

interface QuestionDraft {
  question: string;
  type: "multiple_choice" | "verbal";
  options: string[];
  correctAnswer: string;
  explanation: string;
  timerSeconds: number;
  points: number;
  verified?: boolean;
}

interface QuizDraft {
  title: string;
  questions: QuestionDraft[];
}

const createBlankQuestion = (): QuestionDraft => ({
  question: "",
  type: "multiple_choice",
  options: ["", "", "", ""],
  correctAnswer: "",
  explanation: "",
  timerSeconds: 15,
  points: 100,
  verified: false,
});

function QuizStudioContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const quizIdParam = searchParams.get("quizId");
  const isFromAiParam = searchParams.get("from") === "ai";

  const [quiz, setQuiz] = useState<QuizDraft>({
    title: "",
    questions: [createBlankQuestion()],
  });
  const [quizId, setQuizId] = useState<number | null>(quizIdParam ? parseInt(quizIdParam, 10) : null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [draftSaving, setDraftSaving] = useState(false);
  const [loadingQuiz, setLoadingQuiz] = useState(false);
  const [aiAssisting, setAiAssisting] = useState(false);

  // AI Prompt Generator Modal State
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiNumQuestions, setAiNumQuestions] = useState("5");
  const [aiDifficulty, setAiDifficulty] = useState("medium");
  const [aiType, setAiType] = useState("multiple_choice");
  const [aiAppendMode, setAiAppendMode] = useState<"replace" | "append">("replace");
  const [aiGeneratingDeck, setAiGeneratingDeck] = useState(false);

  // Global Tournament Deck Configuration (configured before publishing)
  const [globalTimer, setGlobalTimer] = useState<number>(15);
  const [globalPoints, setGlobalPoints] = useState<number>(100);
  const [globalPenalty, setGlobalPenalty] = useState<number>(50);

  const applyGlobalSettings = (timer?: number, points?: number, penalty?: number) => {
    const t = timer !== undefined ? timer : globalTimer;
    const p = points !== undefined ? points : globalPoints;
    const pen = penalty !== undefined ? penalty : globalPenalty;

    const updated = quiz.questions.map((q) => ({
      ...q,
      timerSeconds: t,
      points: p,
      pointsWrong: pen
    }));

    persistQuiz({ ...quiz, questions: updated });
    toast.success(`Applied to all ${updated.length} questions: ${t}s timer, +${p} correct, -${pen} wrong`);
  };

  // Review & Verification banner
  const [showVerificationBanner, setShowVerificationBanner] = useState(isFromAiParam);

  const saveDraftToDatabase = async () => {
    try {
      setDraftSaving(true);
      sounds.playTick();
      const res = await fetch("/api/quiz/save-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quiz: {
            ...quiz,
            title: quiz.title.trim() || "Untitled Draft Tournament",
          },
          quizId,
        }),
      });
      const data = await res.json();
      if (data.success && data.quizId) {
        setQuizId(data.quizId);
        sessionStorage.setItem("draft_quiz", JSON.stringify(quiz));
        toast.success("Draft saved to Neon Database!");
      } else {
        toast.error(data.error || "Failed to save draft");
      }
    } catch (err: any) {
      console.error("Draft save error:", err);
      toast.error("Failed to save draft");
    } finally {
      setDraftSaving(false);
    }
  };

  const loadSavedQuiz = async (id: string) => {
    try {
      setLoadingQuiz(true);
      const res = await fetch(`/api/quiz?id=${id}`);
      const data = await res.json();
      if (data.quiz) {
        setQuiz({
          title: data.quiz.title || "",
          questions: data.quiz.questions.map((q: any) => ({
            question: q.question || "",
            type: q.type || "multiple_choice",
            options: Array.isArray(q.options) && q.options.length > 0 ? q.options : ["", "", "", ""],
            correctAnswer: q.correctAnswer || "",
            explanation: q.explanation || "",
            timerSeconds: q.timerSeconds || 15,
            points: q.points || 100,
            verified: true,
          })),
        });
        toast.success(`Loaded "${data.quiz.title}" from database`);
      }
    } catch (err) {
      console.error("Failed to load quiz:", err);
      toast.error("Failed to load saved quiz from database");
    } finally {
      setLoadingQuiz(false);
    }
  };

  // Initialize from DB if editing, or from sessionStorage, or clean blank state
  useEffect(() => {
    if (quizIdParam) {
      loadSavedQuiz(quizIdParam);
      return;
    }

    const raw = sessionStorage.getItem("draft_quiz");
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        // Clean out legacy mock data if detected
        if (
          parsed.title === "Championship Trivia Tournament" ||
          parsed.questions?.[0]?.question?.includes("Red Planet")
        ) {
          sessionStorage.removeItem("draft_quiz");
          setQuiz({ title: "", questions: [createBlankQuestion()] });
          return;
        }

        if (parsed.questions && parsed.questions.length > 0) {
          setQuiz({
            title: parsed.title || "",
            questions: parsed.questions.map((q: any) => ({
              question: q.question || "",
              type: q.type || "multiple_choice",
              options: Array.isArray(q.options) && q.options.length > 0 ? q.options : ["", "", "", ""],
              correctAnswer: q.correctAnswer || "",
              explanation: q.explanation || "",
              timerSeconds: q.timerSeconds || 15,
              points: q.points || 100,
              verified: true,
            })),
          });
          if (isFromAiParam) setShowVerificationBanner(true);
          return;
        }
      } catch {
        // Fall through to clean blank state
      }
    }

    // Default clean blank quiz
    setQuiz({ title: "", questions: [createBlankQuestion()] });
  }, [quizIdParam, isFromAiParam]);

  const persistQuiz = (updated: QuizDraft) => {
    setQuiz(updated);
    sessionStorage.setItem("draft_quiz", JSON.stringify(updated));
  };

  const currentQ = quiz.questions[selectedIndex] || quiz.questions[0] || createBlankQuestion();

  const updateCurrentField = (field: keyof QuestionDraft, value: any) => {
    const updatedQuestions = [...quiz.questions];
    updatedQuestions[selectedIndex] = {
      ...updatedQuestions[selectedIndex],
      [field]: value,
      verified: true,
    };
    persistQuiz({ ...quiz, questions: updatedQuestions });
  };

  const updateOptionText = (optionIndex: number, text: string) => {
    const currentOptions = [...(currentQ.options || ["", "", "", ""])];
    const prevText = currentOptions[optionIndex];
    currentOptions[optionIndex] = text;

    const updatedQuestions = [...quiz.questions];
    let newCorrect = currentQ.correctAnswer;
    // Keep correct answer in sync if text changed
    if (newCorrect === prevText && prevText.trim() !== "") {
      newCorrect = text;
    }

    updatedQuestions[selectedIndex] = {
      ...currentQ,
      options: currentOptions,
      correctAnswer: newCorrect,
      verified: true,
    };
    persistQuiz({ ...quiz, questions: updatedQuestions });
  };

  const addOption = () => {
    if (currentQ.options.length >= 6) {
      toast.info("Maximum 6 options allowed");
      return;
    }
    sounds.playTick();
    const updatedOptions = [...currentQ.options, ""];
    updateCurrentField("options", updatedOptions);
  };

  const removeOption = (indexToRemove: number) => {
    if (currentQ.options.length <= 2) {
      toast.info("A multiple choice question needs at least 2 options");
      return;
    }
    sounds.playTick();
    const removedText = currentQ.options[indexToRemove];
    const updatedOptions = currentQ.options.filter((_, i) => i !== indexToRemove);
    let newCorrect = currentQ.correctAnswer;
    if (newCorrect === removedText) {
      newCorrect = "";
    }
    const updatedQuestions = [...quiz.questions];
    updatedQuestions[selectedIndex] = {
      ...currentQ,
      options: updatedOptions,
      correctAnswer: newCorrect,
      verified: true,
    };
    persistQuiz({ ...quiz, questions: updatedQuestions });
  };

  const setCorrectOption = (text: string) => {
    sounds.playTick();
    if (!text.trim()) {
      toast.error("Please enter option text before marking it as correct");
      return;
    }
    updateCurrentField("correctAnswer", text);
  };

  const addNewQuestion = () => {
    sounds.playLockIn();
    const newQ = createBlankQuestion();
    const updated = {
      ...quiz,
      questions: [...quiz.questions, newQ],
    };
    persistQuiz(updated);
    setSelectedIndex(updated.questions.length - 1);
    toast.success(`Question ${updated.questions.length} added`);
  };

  const duplicateQuestion = (idx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    sounds.playTick();
    const copy: QuestionDraft = JSON.parse(JSON.stringify(quiz.questions[idx]));
    if (copy.question) {
      copy.question = `${copy.question} (Copy)`;
    }
    const updatedQuestions = [
      ...quiz.questions.slice(0, idx + 1),
      copy,
      ...quiz.questions.slice(idx + 1),
    ];
    persistQuiz({ ...quiz, questions: updatedQuestions });
    setSelectedIndex(idx + 1);
    toast.info("Question duplicated");
  };

  const deleteQuestion = (idx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (quiz.questions.length <= 1) {
      toast.error("Quiz must have at least 1 question");
      return;
    }
    sounds.playTick();
    const updatedQuestions = quiz.questions.filter((_, i) => i !== idx);
    persistQuiz({ ...quiz, questions: updatedQuestions });
    setSelectedIndex(Math.max(0, idx - 1));
    toast.info("Question deleted");
  };

  const handleStartFresh = () => {
    sounds.playTick();
    sessionStorage.removeItem("draft_quiz");
    setQuiz({
      title: "",
      questions: [createBlankQuestion()],
    });
    setSelectedIndex(0);
    setShowVerificationBanner(false);
    toast.success("Started fresh clean quiz!");
  };

  const shuffleQuestions = () => {
    if (quiz.questions.length < 2) return;
    sounds.playTick();
    const shuffled = [...quiz.questions].sort(() => Math.random() - 0.5);
    persistQuiz({ ...quiz, questions: shuffled });
    setSelectedIndex(0);
    toast.success("Questions shuffled");
  };

  // AI Prompt Generator for Entire Deck
  const handleGenerateDeckFromPrompt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiPrompt.trim()) {
      toast.error("Please enter a prompt or topic");
      return;
    }

    setAiGeneratingDeck(true);
    sounds.playLockIn();
    const toastId = toast.loading("Gemini AI is crafting questions and allocating options...");

    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: aiPrompt.trim(),
          numQuestions: parseInt(aiNumQuestions, 10),
          difficulty: aiDifficulty,
          type: aiType,
          style: "competitive live buzzer tournament"
        })
      });

      const data = await res.json();
      if (!res.ok || !data.quiz?.questions) {
        throw new Error(data.error || "Failed to generate questions");
      }

      const allocatedQuestions: QuestionDraft[] = data.quiz.questions.map((q: any) => ({
        question: q.question || "",
        type: q.type || "multiple_choice",
        options: Array.isArray(q.options) && q.options.length > 0 ? q.options : ["Option 1", "Option 2", "Option 3", "Option 4"],
        correctAnswer: q.correctAnswer || (q.options ? q.options[0] : ""),
        explanation: q.explanation || "",
        timerSeconds: q.timerSeconds || 15,
        points: q.points || 100,
        verified: false,
      }));

      let newQuestions = allocatedQuestions;
      let newTitle = data.quiz.title || quiz.title || aiPrompt.trim();

      if (aiAppendMode === "append" && quiz.questions.length > 0 && quiz.questions[0].question.trim() !== "") {
        newQuestions = [...quiz.questions, ...allocatedQuestions];
        newTitle = quiz.title || newTitle;
      }

      const updatedQuiz: QuizDraft = {
        title: newTitle,
        questions: newQuestions,
      };

      persistQuiz(updatedQuiz);
      setSelectedIndex(aiAppendMode === "append" ? quiz.questions.length : 0);
      setShowAiModal(false);
      setShowVerificationBanner(true);
      sounds.playCorrect();
      toast.success(`✨ Allocated ${allocatedQuestions.length} questions into Quiz Studio! Please review and verify.`, { id: toastId });
    } catch (err: any) {
      sounds.playWrong();
      toast.error(err.message || "AI generation failed", { id: toastId });
    } finally {
      setAiGeneratingDeck(false);
    }
  };

  // AI Assistant for Single Current Question (Direct Answer or MCQ Options)
  const aiAssistCurrentQuestion = async (designatedAnswer?: string) => {
    const isVerbal = currentQ.type === "verbal";
    const promptToSend = currentQ.question.trim() || (isVerbal ? "engaging fast buzz trivia question" : "interesting general trivia");
    const answerToUse = designatedAnswer !== undefined ? designatedAnswer : currentQ.correctAnswer?.trim();

    setAiAssisting(true);
    const toastId = toast.loading(isVerbal ? "Gemini AI is generating direct factual answer..." : "Gemini AI is generating options & assigning answer key...");
    try {
      const existingFilledOptions = currentQ.options?.filter((o: string) => o.trim().length > 0) || [];
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: promptToSend,
          numQuestions: 1,
          difficulty: "medium",
          style: "competitive quiz",
          type: isVerbal ? "verbal" : "multiple_choice",
          userAnswer: answerToUse || undefined,
          userOptions: !isVerbal && existingFilledOptions.length > 0 ? existingFilledOptions : undefined,
          instructions: isVerbal 
            ? "Generate a direct factual answer for this verbal buzzer question. Set options to []. The correctAnswer must be exact and concise."
            : (answerToUse 
                ? `The user's designated correct answer is "${answerToUse}". You MUST include "${answerToUse}" in the 4 options and set correctAnswer to "${answerToUse}". Generate 3 realistic distractor options.`
                : "Generate 4 realistic options and designate the exact single correct answer.")
        })
      });
      const data = await res.json();
      if (!res.ok || !data.quiz?.questions?.[0]) {
        throw new Error(data.error || "AI assist failed");
      }

      const generated = data.quiz.questions[0];
      const updatedQuestions = [...quiz.questions];
      
      const assignedOptions = isVerbal ? [] : (generated.options && generated.options.length > 0 ? generated.options : currentQ.options);
      const assignedAnswer = generated.correctAnswer || answerToUse || "";

      updatedQuestions[selectedIndex] = {
        ...currentQ,
        question: currentQ.question.trim() ? currentQ.question : (generated.question || currentQ.question),
        type: isVerbal ? "verbal" : "multiple_choice",
        options: assignedOptions,
        correctAnswer: assignedAnswer,
        explanation: generated.explanation || "",
        verified: true,
      };
      persistQuiz({ ...quiz, questions: updatedQuestions });
      sounds.playCorrect();
      toast.success(isVerbal ? "✨ Direct answer generated for verbal buzz!" : "Options allocated & correct answer assigned! Please verify.", { id: toastId });
    } catch (err: any) {
      sounds.playWrong();
      toast.error(err.message || "AI assist failed", { id: toastId });
    } finally {
      setAiAssisting(false);
    }
  };

  const validateQuiz = (): boolean => {
    if (!quiz.title.trim()) {
      toast.error("Please enter a Quiz Title");
      return false;
    }

    for (let i = 0; i < quiz.questions.length; i++) {
      const q = quiz.questions[i];
      if (!q.question.trim()) {
        toast.error(`Question ${i + 1} has an empty prompt`);
        setSelectedIndex(i);
        return false;
      }

      if (q.type === "multiple_choice") {
        const nonEmptyOpts = q.options.filter(o => o.trim().length > 0);
        if (nonEmptyOpts.length < 2) {
          toast.error(`Question ${i + 1} needs at least 2 non-empty options`);
          setSelectedIndex(i);
          return false;
        }
        if (!q.correctAnswer.trim()) {
          toast.error(`Question ${i + 1} requires a designated correct answer. Click a checkmark next to the correct option.`);
          setSelectedIndex(i);
          return false;
        }
        if (!q.options.includes(q.correctAnswer.trim())) {
          toast.error(`Question ${i + 1}: The correct answer must match one of the options`);
          setSelectedIndex(i);
          return false;
        }
      } else {
        if (!q.correctAnswer.trim()) {
          toast.error(`Question ${i + 1} requires a correct answer for referee judging`);
          setSelectedIndex(i);
          return false;
        }
      }
    }
    return true;
  };

  const saveAndLaunchArena = async () => {
    if (!validateQuiz()) return;

    setSaving(true);
    sounds.playLockIn();
    const toastId = toast.loading("Publishing to Neon DB & provisioning live arena room...");

    try {
      const res = await fetch("/api/quiz/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          quiz, 
          quizId,
          settings: {
            timerSeconds: globalTimer,
            presetPoints: globalPoints,
            penaltyPoints: globalPenalty
          }
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create arena room");

      sounds.playCorrect();
      toast.success(`Arena Room #${data.roomCode} published & ready!`, { id: toastId });

      localStorage.setItem(`buzzarena_host_${data.roomCode}`, data.hostToken);
      sessionStorage.removeItem("draft_quiz");

      router.push(`/host/${data.roomCode}?hostToken=${data.hostToken}`);
    } catch (err: any) {
      sounds.playWrong();
      toast.error(err.message || "Failed to publish room", { id: toastId });
      setSaving(false);
    }
  };

  const totalEstTime = quiz.questions.reduce((acc, q) => acc + (q.timerSeconds || 15), 0);
  const totalPoints = quiz.questions.reduce((acc, q) => acc + (q.points || 100), 0);
  const verifiedCount = quiz.questions.filter(q => q.question.trim() && q.correctAnswer.trim()).length;

  if (loadingQuiz) {
    return (
      <div className="min-h-screen bg-[#070b14] text-white flex items-center justify-center">
        <Zap className="w-8 h-8 text-amber-400 animate-pulse mr-3" />
        <span className="font-heading font-semibold text-slate-400">Loading quiz from Neon Database...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070b14] text-[#dfe2f1] flex flex-col selection:bg-amber-500 selection:text-slate-950">
      
      {/* TOP HEADER */}
      <header className="sticky top-0 z-50 bg-[#070b14]/90 backdrop-blur-xl border-b border-slate-800/80 px-4 sm:px-6 lg:px-8 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="flex items-center gap-2 text-slate-400 hover:text-white text-xs font-semibold">
              <ArrowLeft className="w-4 h-4" />
              <span>Host Hub</span>
            </Link>
            <div className="h-4 w-px bg-slate-800 hidden sm:block" />
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-400 flex items-center justify-center shadow-md shadow-amber-500/20">
                <Zap className="w-4 h-4 text-slate-950 fill-slate-950" />
              </div>
              <span className="font-heading font-extrabold text-base text-white hidden sm:inline">
                Quiz<span className="text-amber-400">Studio</span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            {/* AI Prompt Generator Button */}
            <button
              onClick={() => setShowAiModal(true)}
              className="px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl bg-gradient-to-r from-amber-500/20 to-indigo-500/20 hover:from-amber-500/30 hover:to-indigo-500/30 border border-amber-500/40 text-amber-300 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-sm shrink-0"
              title="Generate a whole deck with AI prompt"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="hidden sm:inline">AI Magic Generator</span>
              <span className="sm:hidden text-[11px]">AI Magic</span>
            </button>

            <button
              onClick={handleStartFresh}
              className="p-1.5 sm:px-3 sm:py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-red-400 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shrink-0"
              title="Wipe draft and start with a clean slate"
            >
              <RotateCcw className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">Start Fresh</span>
            </button>

            <button
              onClick={saveDraftToDatabase}
              disabled={draftSaving}
              className="p-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50 shrink-0"
              title="Save draft"
            >
              <Save className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">{draftSaving ? "Saving..." : "Save Draft"}</span>
            </button>

            <button
              onClick={saveAndLaunchArena}
              disabled={saving}
              className="px-3 sm:px-5 py-1.5 sm:py-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-heading font-bold text-xs sm:text-sm shadow-lg shadow-amber-500/20 active:scale-95 transition-all flex items-center gap-1.5 sm:gap-2 disabled:opacity-50 cursor-pointer shrink-0"
            >
              <Play className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-slate-950 shrink-0" />
              <span className="hidden sm:inline">{saving ? "Publishing..." : "PUBLISH & LAUNCH"}</span>
              <span className="sm:hidden text-[11px] font-black">{saving ? "..." : "LAUNCH"}</span>
            </button>
          </div>
        </div>
      </header>

      {/* VERIFICATION / AI ALLOCATION RIBBON */}
      {showVerificationBanner && (
        <div className="bg-gradient-to-r from-amber-950/40 via-slate-900 to-indigo-950/40 border-b border-amber-500/30 px-4 py-3">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/40">
                <Sparkles className="w-4 h-4" />
              </div>
              <p className="text-xs sm:text-sm text-slate-200">
                <strong className="text-amber-300 font-semibold">AI Generated Question Deck:</strong> Options & answers have been automatically allocated into the editor. Review each card in your deck, tweak any wording, and click <strong className="text-white">Publish & Launch</strong> when satisfied!
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-900 border border-slate-700 text-amber-300">
                {verifiedCount} of {quiz.questions.length} Ready
              </span>
              <button
                onClick={() => setShowVerificationBanner(false)}
                className="text-slate-400 hover:text-white p-1"
                title="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MAIN TWO-PANEL WORKSPACE */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 lg:p-6 flex flex-col gap-6">
        
        {/* QUIZ TITLE & SUMMARY BANNER */}
        <div className="bg-[#0d1322]/90 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl backdrop-blur-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4 flex-1">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center justify-center flex-shrink-0">
              <Zap className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <input
                type="text"
                value={quiz.title}
                onChange={(e) => {
                  const updated = { ...quiz, title: e.target.value };
                  persistQuiz(updated);
                }}
                className="w-full bg-transparent font-heading font-extrabold text-xl sm:text-2xl text-white placeholder:text-slate-600 border-b border-transparent hover:border-slate-700 focus:border-amber-400 focus:outline-none transition pb-0.5"
                placeholder="Enter Quiz Title (e.g. Science Bowl Finals, Biology 101, Pop Culture Trivia)..."
              />
              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 mt-1.5 font-medium">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span>{totalEstTime}s Match Time</span>
                </span>
                <span className="flex items-center gap-1">
                  <Trophy className="w-3.5 h-3.5 text-amber-400" />
                  <span>{totalPoints} Total Points</span>
                </span>
                <span className="text-emerald-400 font-semibold flex items-center gap-1">
                  ● Real-time Buzzer Ready
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end md:self-center">
            <button
              onClick={shuffleQuestions}
              disabled={quiz.questions.length < 2}
              className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-40"
            >
              <Shuffle className="w-3.5 h-3.5 text-slate-400" />
              <span>Shuffle</span>
            </button>
            <button
              onClick={addNewQuestion}
              className="px-3.5 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-amber-400" />
              <span>Add Question</span>
            </button>
          </div>
        </div>

        {/* GLOBAL TOURNAMENT CONFIGURATION BAR (Configured before publishing across entire deck) */}
        <div className="bg-[#0d1322]/90 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl backdrop-blur-xl">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0">
                <SlidersHorizontal className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-heading font-extrabold text-sm sm:text-base text-white flex items-center gap-2">
                  <span>Global Deck Configuration</span>
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                    Applies to All {quiz.questions.length} Questions
                  </span>
                </h4>
                <p className="text-xs text-slate-400">
                  Configure countdown timer, correct answer points, and wrong deduction once before publishing.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 lg:flex lg:flex-wrap items-center gap-2.5 sm:gap-3 w-full lg:w-auto">
              {/* Global Timer Select */}
              <div className="flex items-center justify-between sm:justify-start gap-2 bg-slate-900 border border-slate-800 px-3.5 py-2.5 sm:py-2 rounded-xl shadow-inner w-full sm:w-auto">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="text-xs text-slate-400 font-medium">Timer:</span>
                </div>
                <select
                  value={globalTimer}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setGlobalTimer(val);
                    applyGlobalSettings(val, globalPoints, globalPenalty);
                  }}
                  className="bg-transparent text-white font-bold text-xs focus:outline-none cursor-pointer pr-1 text-right sm:text-left"
                >
                  <option value={10} className="bg-slate-900 text-white">10 Seconds</option>
                  <option value={15} className="bg-slate-900 text-white">15 Seconds</option>
                  <option value={20} className="bg-slate-900 text-white">20 Seconds</option>
                  <option value={30} className="bg-slate-900 text-white">30 Seconds</option>
                  <option value={45} className="bg-slate-900 text-white">45 Seconds</option>
                  <option value={60} className="bg-slate-900 text-white">60 Seconds</option>
                </select>
              </div>

              {/* Global Points Select */}
              <div className="flex items-center justify-between sm:justify-start gap-2 bg-slate-900 border border-slate-800 px-3.5 py-2.5 sm:py-2 rounded-xl shadow-inner w-full sm:w-auto">
                <div className="flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="text-xs text-slate-400 font-medium">Correct:</span>
                </div>
                <select
                  value={globalPoints}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setGlobalPoints(val);
                    applyGlobalSettings(globalTimer, val, globalPenalty);
                  }}
                  className="bg-transparent text-emerald-400 font-bold text-xs focus:outline-none cursor-pointer pr-1 text-right sm:text-left"
                >
                  <option value={50} className="bg-slate-900 text-white">+50 Pts</option>
                  <option value={100} className="bg-slate-900 text-white">+100 Pts (Standard)</option>
                  <option value={150} className="bg-slate-900 text-white">+150 Pts</option>
                  <option value={200} className="bg-slate-900 text-white">+200 Pts</option>
                  <option value={500} className="bg-slate-900 text-white">+500 Pts</option>
                </select>
              </div>

              {/* Global Wrong Deduction Select */}
              <div className="flex items-center justify-between sm:justify-start gap-2 bg-slate-900 border border-slate-800 px-3.5 py-2.5 sm:py-2 rounded-xl shadow-inner w-full sm:w-auto">
                <div className="flex items-center gap-2">
                  <Minus className="w-4 h-4 text-red-400 shrink-0" />
                  <span className="text-xs text-slate-400 font-medium">Wrong Deduction:</span>
                </div>
                <select
                  value={globalPenalty}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setGlobalPenalty(val);
                    applyGlobalSettings(globalTimer, globalPoints, val);
                  }}
                  className="bg-transparent text-red-400 font-bold text-xs focus:outline-none cursor-pointer pr-1 text-right sm:text-left"
                >
                  <option value={0} className="bg-slate-900 text-white">0 Pts (No Penalty)</option>
                  <option value={25} className="bg-slate-900 text-white">-25 Pts</option>
                  <option value={50} className="bg-slate-900 text-white">-50 Pts (Standard)</option>
                  <option value={100} className="bg-slate-900 text-white">-100 Pts</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* TWO-PANEL GRID: 4 COLS QUESTION DECK / 8 COLS EDITOR */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT 4 COLS: QUESTION DECK OUTLINE */}
          <aside className="lg:col-span-4 flex flex-col gap-3">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <span className="font-heading font-bold text-sm text-white">Question Deck</span>
                <span className="px-2 py-0.5 rounded-full bg-slate-800 text-amber-400 font-mono text-xs font-bold">
                  {quiz.questions.length}
                </span>
              </div>
              <span className="text-xs text-slate-500">Select to review & edit</span>
            </div>

            {/* Questions Card Stack */}
            <div className="flex flex-col gap-2.5 max-h-[640px] overflow-y-auto pr-1">
              {quiz.questions.map((q, idx) => {
                const isSelected = idx === selectedIndex;
                const isComplete = q.question.trim().length > 0 && q.correctAnswer.trim().length > 0;

                return (
                  <div
                    key={idx}
                    onClick={() => {
                      sounds.playTick();
                      setSelectedIndex(idx);
                    }}
                    className={`relative p-3.5 rounded-2xl border transition-all cursor-pointer ${
                      isSelected
                        ? "bg-[#0f172a] border-amber-500/80 shadow-[0_0_20px_rgba(245,158,11,0.15)]"
                        : "bg-[#0d1322]/80 border-slate-800 hover:border-slate-700 hover:bg-slate-900/60"
                    }`}
                  >
                    {/* Left active accent bar */}
                    {isSelected && (
                      <div className="absolute left-0 top-3 bottom-3 w-1.5 rounded-r bg-amber-400 shadow-[0_0_10px_#f59e0b]" />
                    )}

                    <div className="flex items-start justify-between gap-2 pl-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs text-amber-400">Q{idx + 1}</span>
                        <span className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-[10px] font-bold text-slate-400 uppercase">
                          {q.type === "multiple_choice" ? "MCQ" : "VERBAL"}
                        </span>
                        {isComplete ? (
                          <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-semibold">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Verified</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] text-amber-400 font-semibold">
                            <AlertCircle className="w-3 h-3" />
                            <span>Incomplete</span>
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => duplicateQuestion(idx, e)}
                          className="p-1 rounded-md text-slate-500 hover:text-white hover:bg-slate-800 transition"
                          title="Duplicate Question"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => deleteQuestion(idx, e)}
                          className="p-1 rounded-md text-slate-500 hover:text-red-400 hover:bg-slate-800 transition"
                          title="Delete Question"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <p className={`mt-2 pl-2 text-sm line-clamp-2 ${q.question.trim() ? "text-white font-medium" : "text-slate-500 italic"}`}>
                      {q.question.trim() || "Untitled Question (click to write prompt)"}
                    </p>

                    <div className="mt-3 pl-2 flex items-center justify-between text-[11px] text-slate-400">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-amber-400" />
                          <span>{q.timerSeconds || 15}s</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <Trophy className="w-3 h-3 text-amber-400" />
                          <span>{q.points || 100} pts</span>
                        </span>
                      </div>

                      {q.type === "multiple_choice" ? (
                        <span className="text-slate-400">
                          {q.options.length} Options
                        </span>
                      ) : (
                        <span className="text-cyan-400">Open Buzz</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Add question button */}
            <button
              onClick={addNewQuestion}
              className="w-full py-3 rounded-2xl bg-slate-900/80 hover:bg-slate-800 border border-dashed border-slate-700/80 text-slate-300 hover:text-white font-semibold text-xs flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <Plus className="w-4 h-4 text-amber-400" />
              <span>Add New Question</span>
            </button>
          </aside>

          {/* RIGHT 8 COLS: QUESTION EDITOR & VERIFICATION PANEL */}
          <div className="lg:col-span-8 bg-[#0d1322]/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl space-y-6">
            
            {/* Header for question */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <span className="font-heading font-extrabold text-xl text-white">
                  Question {selectedIndex + 1}
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-amber-400 text-xs font-bold uppercase">
                  {currentQ.type === "multiple_choice" ? "Multiple Choice" : "Verbal Buzzer"}
                </span>
                {currentQ.question.trim() && currentQ.correctAnswer.trim() && (
                  <span className="hidden sm:inline-flex items-center gap-1 text-xs text-emerald-400 font-semibold px-2 py-0.5 rounded-md bg-emerald-950/40 border border-emerald-500/40">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Verified
                  </span>
                )}
              </div>

              {/* Single Question AI Auto-Complete / Direct Answer Button */}
              <button
                type="button"
                onClick={() => aiAssistCurrentQuestion()}
                disabled={aiAssisting}
                className="px-3.5 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                title={currentQ.type === "verbal" ? "AI will generate direct answer for verbal buzzer" : "AI will generate 4 options and designate the correct answer"}
              >
                {aiAssisting ? <Wand2 className="w-3.5 h-3.5 animate-spin text-amber-400" /> : <Sparkles className="w-3.5 h-3.5 text-amber-400" />}
                <span>{currentQ.type === "verbal" ? "✨ AI Direct Answer" : "Auto-Allocate Options"}</span>
              </button>
            </div>

            {/* Question Prompt */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Question Prompt *
              </label>
              <textarea
                rows={3}
                value={currentQ.question}
                onChange={(e) => updateCurrentField("question", e.target.value)}
                placeholder="Type or verify your question prompt here..."
                className="w-full p-4 bg-slate-900 border border-slate-700/80 rounded-2xl text-white font-medium text-base placeholder:text-slate-600 focus:outline-none focus:border-amber-400 transition"
              />
            </div>

            {/* Format Toggle (MCQ vs Verbal) */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Question Format
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    sounds.playTick();
                    const opts = currentQ.options && currentQ.options.length >= 2 ? currentQ.options : ["", "", "", ""];
                    updateCurrentField("type", "multiple_choice");
                    updateCurrentField("options", opts);
                  }}
                  className={`p-3 rounded-2xl border text-sm font-semibold transition cursor-pointer ${
                    currentQ.type === "multiple_choice"
                      ? "bg-amber-500/15 border-amber-500 text-white shadow-[0_0_15px_rgba(245,158,11,0.2)]"
                      : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
                  }`}
                >
                  Multiple Choice
                </button>

                <button
                  type="button"
                  onClick={() => {
                    sounds.playTick();
                    updateCurrentField("type", "verbal");
                    updateCurrentField("options", []);
                  }}
                  className={`p-3 rounded-2xl border text-sm font-semibold transition cursor-pointer ${
                    currentQ.type === "verbal"
                      ? "bg-amber-500/15 border-amber-500 text-white shadow-[0_0_15px_rgba(245,158,11,0.2)]"
                      : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
                  }`}
                >
                  Verbal / Fast-Buzz
                </button>
              </div>
            </div>

            {/* Multiple Choice Options Matrix */}
            {currentQ.type === "multiple_choice" ? (
              <div className="space-y-4">
                {/* Manual Correct Answer & AI Distractor Allocation Helper */}
                <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  <div className="flex-1">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-amber-300 mb-1">
                      Your Correct Answer (Optional — AI will allocate 3 distractors & assign this option)
                    </label>
                    <input
                      type="text"
                      value={currentQ.correctAnswer}
                      onChange={(e) => updateCurrentField("correctAnswer", e.target.value)}
                      placeholder="e.g. Type correct answer (e.g. Canberra, Mitochondria, 144)..."
                      className="w-full px-3 py-2 bg-slate-900 border border-amber-500/40 rounded-xl text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => aiAssistCurrentQuestion()}
                    disabled={aiAssisting}
                    className="px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-extrabold flex items-center justify-center gap-1.5 transition cursor-pointer shrink-0 disabled:opacity-50 shadow-md self-end sm:self-auto"
                  >
                    {aiAssisting ? <Wand2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    <span>{currentQ.correctAnswer.trim() ? "AI Assign & Complete Distractors" : "AI Allocate 4 Options"}</span>
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Allocated Options (Click checkmark to set correct answer)
                  </label>
                  <span className={`text-xs font-semibold ${currentQ.correctAnswer ? "text-emerald-400" : "text-amber-400"}`}>
                    {currentQ.correctAnswer ? `✓ Assigned Correct: "${currentQ.correctAnswer}"` : "⚠ Please select or enter the correct answer"}
                  </span>
                </div>

                <div className="space-y-2.5">
                  {currentQ.options.map((optText, optIdx) => {
                    const letters = ["A", "B", "C", "D", "E", "F"];
                    const letter = letters[optIdx] || `${optIdx + 1}`;
                    const isCorrect = currentQ.correctAnswer === optText && optText.trim().length > 0;

                    return (
                      <div
                        key={optIdx}
                        className={`flex items-center gap-2 p-2 rounded-2xl border transition-all ${
                          isCorrect
                            ? "bg-emerald-950/40 border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.2)]"
                            : "bg-slate-900 border-slate-800 focus-within:border-slate-600"
                        }`}
                      >
                        <span className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                          isCorrect ? "bg-emerald-500 text-slate-950" : "bg-slate-800 text-slate-400"
                        }`}>
                          {letter}
                        </span>

                        <input
                          type="text"
                          value={optText}
                          onChange={(e) => updateOptionText(optIdx, e.target.value)}
                          placeholder={`Enter Option ${letter}...`}
                          className="flex-1 bg-transparent text-sm text-white placeholder:text-slate-600 focus:outline-none px-2"
                        />

                        {/* Set correct button */}
                        <button
                          type="button"
                          onClick={() => setCorrectOption(optText)}
                          className={`p-2 rounded-xl transition cursor-pointer flex items-center gap-1 text-xs font-bold ${
                            isCorrect
                              ? "bg-emerald-500 text-slate-950 shadow-md"
                              : "text-slate-500 hover:text-emerald-400 hover:bg-slate-800"
                          }`}
                          title="Mark this option as correct answer"
                        >
                          <Check className="w-4 h-4" />
                          <span className="hidden sm:inline">{isCorrect ? "Correct" : "Set Correct"}</span>
                        </button>

                        {/* Remove option button if > 2 */}
                        {currentQ.options.length > 2 && (
                          <button
                            type="button"
                            onClick={() => removeOption(optIdx)}
                            className="p-2 text-slate-600 hover:text-red-400 hover:bg-slate-800 rounded-xl transition cursor-pointer"
                            title="Remove this option"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>

                {currentQ.options.length < 6 && (
                  <button
                    type="button"
                    onClick={addOption}
                    className="text-xs font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1.5 pt-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Another Option ({currentQ.options.length}/6)</span>
                  </button>
                )}
              </div>
            ) : (
              /* Verbal Question Direct Answer Section with AI Generate Button */
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-cyan-950/20 border border-cyan-500/30 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shadow-md">
                  <div className="flex-1">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-cyan-300 mb-1">
                      Direct Answer (Host & Referee Answer Key) *
                    </label>
                    <input
                      type="text"
                      value={currentQ.correctAnswer}
                      onChange={(e) => updateCurrentField("correctAnswer", e.target.value)}
                      placeholder="e.g. Type direct answer (e.g. Mitochondria, Paris, 1969, Shakespeare)..."
                      className="w-full px-3 py-2.5 bg-slate-900 border border-cyan-500/40 rounded-xl text-white text-sm font-semibold placeholder:text-slate-500 focus:outline-none focus:border-cyan-400"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => aiAssistCurrentQuestion()}
                    disabled={aiAssisting}
                    className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-slate-950 text-xs font-extrabold flex items-center justify-center gap-1.5 transition cursor-pointer shrink-0 disabled:opacity-50 shadow-md self-end sm:self-auto"
                    title="Let AI generate the exact direct answer for this verbal question"
                  >
                    {aiAssisting ? <Wand2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 text-slate-950" />}
                    <span>✨ AI Generate Direct Answer</span>
                  </button>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400 space-y-1">
                  <p className="font-semibold text-cyan-300 flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5" />
                    <span>Verbal Fast-Buzz Rules:</span>
                  </p>
                  <p>• Player phones display <strong>ONLY the buzzer</strong> — no question text or options are revealed.</p>
                  <p>• Host reads or projects question on the projector.</p>
                  <p>• Only the top 3 fastest contenders lock in (#1, #2, #3). Contender #1 states answer verbally; if wrong, host deducts penalty and passes to #2 for half points!</p>
                </div>
              </div>
            )}

            {/* Round Settings Grid: Timer Duration & Points */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Timer Countdown (Seconds)
                </label>
                <div className="flex items-center gap-2">
                  {[10, 15, 20, 30, 45].map((sec) => (
                    <button
                      key={sec}
                      type="button"
                      onClick={() => {
                        sounds.playTick();
                        updateCurrentField("timerSeconds", sec);
                      }}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                        currentQ.timerSeconds === sec
                          ? "bg-amber-400 text-slate-950 border-amber-400"
                          : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
                      }`}
                    >
                      {sec}s
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Points Weight
                </label>
                <div className="flex items-center gap-2">
                  {[50, 100, 150, 200].map((pts) => (
                    <button
                      key={pts}
                      type="button"
                      onClick={() => {
                        sounds.playTick();
                        updateCurrentField("points", pts);
                      }}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                        currentQ.points === pts
                          ? "bg-amber-400 text-slate-950 border-amber-400"
                          : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
                      }`}
                    >
                      {pts}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Optional Explanation */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Explanation / Fun Fact (Optional)
              </label>
              <input
                type="text"
                value={currentQ.explanation}
                onChange={(e) => updateCurrentField("explanation", e.target.value)}
                placeholder="Revealed on host and player screens after judging..."
                className="w-full p-3 bg-slate-900 border border-slate-800 rounded-xl text-sm text-slate-300 placeholder:text-slate-600 focus:outline-none focus:border-amber-400 transition"
              />
            </div>

            {/* Bottom Question Navigation & Action Footer */}
            <div className="pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => {
                    sounds.playTick();
                    setSelectedIndex((prev) => Math.max(0, prev - 1));
                  }}
                  disabled={selectedIndex === 0}
                  className="flex-1 sm:flex-initial px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-xs font-semibold text-slate-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Previous</span>
                </button>

                <span className="font-mono text-xs font-bold text-slate-400 px-2 text-center">
                  {selectedIndex + 1} / {quiz.questions.length}
                </span>

                {selectedIndex < quiz.questions.length - 1 ? (
                  <button
                    type="button"
                    onClick={() => {
                      sounds.playTick();
                      setSelectedIndex((prev) => prev + 1);
                    }}
                    className="flex-1 sm:flex-initial px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-xs font-semibold text-slate-300 hover:text-white transition cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <span>Next</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={addNewQuestion}
                    className="flex-1 sm:flex-initial px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 text-xs font-bold text-amber-300 transition cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5 text-amber-400" />
                    <span>Add Question</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={saveDraftToDatabase}
                  disabled={draftSaving}
                  className="flex-1 sm:flex-initial px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{draftSaving ? "Saving..." : "Save Draft"}</span>
                </button>

                <button
                  type="button"
                  onClick={saveAndLaunchArena}
                  disabled={saving}
                  className="flex-1 sm:flex-initial px-5 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-heading font-bold text-xs shadow-md shadow-amber-500/20 active:scale-95 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 fill-slate-950" />
                  <span>{saving ? "Publishing..." : "Publish & Launch"}</span>
                </button>
              </div>
            </div>

          </div>
        </div>

      </main>

      {/* AI PROMPT GENERATOR MODAL */}
      {showAiModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0d1322] border border-slate-800 rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl space-y-6 relative animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setShowAiModal(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/40">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-heading font-extrabold text-xl text-white">
                  AI Quiz Prompt Generator
                </h3>
                <p className="text-xs text-slate-400">
                  Enter a prompt or paste notes. Gemini AI will generate questions and allocate options directly into your Studio editor.
                </p>
              </div>
            </div>

            <form onSubmit={handleGenerateDeckFromPrompt} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                  Quiz Prompt / Topic / Raw Q&A *
                </label>
                <textarea
                  required
                  rows={5}
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder={`Enter a topic, OR paste your questions, answers, and options!\n\nExamples:\n• "Generate 35 questions on World Geography and Capitals"\n• "1. What is the speed of light? Answer: 300,000 km/s"\n• "2. Which organ filters blood? Options: Heart, Kidney, Lungs, Brain. Correct: Kidney"`}
                  className="w-full p-3.5 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400 text-xs font-mono"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  💡 <strong>Manual Support:</strong> You can supply questions, correct answers, or options. AI will allocate 4 options and assign the correct option for each question directly into Studio!
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Questions Count
                  </label>
                  <select
                    value={aiNumQuestions}
                    onChange={(e) => setAiNumQuestions(e.target.value)}
                    className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-amber-400"
                  >
                    <option value="5">5 Questions</option>
                    <option value="10">10 Questions</option>
                    <option value="15">15 Questions</option>
                    <option value="20">20 Questions</option>
                    <option value="25">25 Questions</option>
                    <option value="30">30 Questions</option>
                    <option value="35">35 Questions</option>
                    <option value="40">40 Questions</option>
                    <option value="50">50 Questions</option>
                    <option value="60">60 Questions</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Difficulty
                  </label>
                  <select
                    value={aiDifficulty}
                    onChange={(e) => setAiDifficulty(e.target.value)}
                    className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-amber-400"
                  >
                    <option value="easy">Casual / School</option>
                    <option value="medium">College / Club</option>
                    <option value="hard">Pro Quiz Bowl</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Format
                  </label>
                  <select
                    value={aiType}
                    onChange={(e) => setAiType(e.target.value)}
                    className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-amber-400"
                  >
                    <option value="multiple_choice">Multiple Choice</option>
                    <option value="verbal">Verbal Fast-Buzz</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Deck Allocation Mode
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setAiAppendMode("replace")}
                    className={`p-2.5 rounded-xl border text-xs font-semibold transition cursor-pointer ${
                      aiAppendMode === "replace"
                        ? "bg-amber-400 text-slate-950 font-bold border-amber-400"
                        : "bg-slate-900 border-slate-700 text-slate-400 hover:text-white"
                    }`}
                  >
                    Replace Current Deck
                  </button>

                  <button
                    type="button"
                    onClick={() => setAiAppendMode("append")}
                    className={`p-2.5 rounded-xl border text-xs font-semibold transition cursor-pointer ${
                      aiAppendMode === "append"
                        ? "bg-amber-400 text-slate-950 font-bold border-amber-400"
                        : "bg-slate-900 border-slate-700 text-slate-400 hover:text-white"
                    }`}
                  >
                    Append to Existing ({quiz.questions.length})
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={aiGeneratingDeck}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-bold text-slate-950 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 shadow-lg shadow-amber-500/20 active:scale-[0.99] transition cursor-pointer disabled:opacity-50 mt-4"
              >
                {aiGeneratingDeck ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                    <span>Gemini is Allocating Questions & Options...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Generate & Allocate to Studio</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

export default function DraftQuizEditor() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#070b14] text-white flex items-center justify-center">
        <Zap className="w-8 h-8 text-amber-400 animate-pulse mr-3" />
        <span className="font-heading font-semibold text-slate-400">Loading Quiz Studio...</span>
      </div>
    }>
      <QuizStudioContent />
    </Suspense>
  );
}
