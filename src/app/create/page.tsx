import Link from "next/link";
import { Zap, Sparkles, PenTool, ArrowLeft, ArrowRight } from "lucide-react";

export default function CreateChoicePage() {
  return (
    <div className="min-h-screen bg-[#070b14] text-[#dfe2f1] flex flex-col justify-center items-center p-4 sm:p-6 relative selection:bg-indigo-500 selection:text-white">
      {/* Glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-indigo-600/10 rounded-full blur-[140px] pointer-events-none" />

      {/* Top back navigation */}
      <div className="absolute top-6 left-6">
        <Link href="/" className="flex items-center gap-2 text-slate-400 hover:text-white text-sm transition">
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </Link>
      </div>

      <div className="max-w-3xl w-full text-center relative">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900 border border-indigo-500/30 text-indigo-300 text-xs font-bold uppercase tracking-wider mb-6">
          <Zap className="w-3.5 h-3.5 text-cyan-400 fill-cyan-400" />
          <span>QUIZ CREATOR HUB</span>
        </div>

        <h1 className="font-heading font-extrabold text-3xl sm:text-5xl text-white tracking-tight mb-4">
          How do you want to build your quiz?
        </h1>
        <p className="text-slate-400 text-base max-w-lg mx-auto mb-10">
          Choose automated generation powered by Google Gemini AI, or craft your questions by hand.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
          {/* Option 1: AI Quiz Generator */}
          <Link
            href="/create/ai"
            className="group p-8 rounded-3xl bg-[#0d1322]/90 border border-fuchsia-500/30 hover:border-fuchsia-500/80 transition-all duration-300 hover:shadow-[0_0_40px_rgba(217,70,239,0.2)] flex flex-col justify-between backdrop-blur-xl"
          >
            <div>
              <div className="w-14 h-14 rounded-2xl bg-fuchsia-950/60 border border-fuchsia-600/40 text-fuchsia-400 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-lg">
                <Sparkles className="w-7 h-7" />
              </div>
              <div className="inline-block px-2.5 py-0.5 rounded-full bg-fuchsia-500/20 text-fuchsia-300 text-[10px] font-bold uppercase tracking-wider mb-2">
                Recommended • Fast
              </div>
              <h2 className="font-heading font-bold text-2xl text-white mb-2">Generate with AI</h2>
              <p className="text-slate-400 text-sm leading-relaxed">
                Describe any topic or paste notes. Google Gemini AI crafts questions, multiple choices, and verified answers in seconds.
              </p>
            </div>
            <div className="mt-8 flex items-center gap-2 text-fuchsia-400 font-bold text-sm group-hover:translate-x-1 transition-transform">
              <span>Launch AI Studio</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </Link>

          {/* Option 2: Manual Builder */}
          <Link
            href="/create/manual?fresh=true"
            className="group p-8 rounded-3xl bg-[#0d1322]/90 border border-cyan-500/30 hover:border-cyan-500/80 transition-all duration-300 hover:shadow-[0_0_40px_rgba(6,182,212,0.2)] flex flex-col justify-between backdrop-blur-xl"
          >
            <div>
              <div className="w-14 h-14 rounded-2xl bg-cyan-950/60 border border-cyan-600/40 text-cyan-400 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-lg">
                <PenTool className="w-7 h-7" />
              </div>
              <div className="inline-block px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 text-[10px] font-bold uppercase tracking-wider mb-2">
                Precision Custom
              </div>
              <h2 className="font-heading font-bold text-2xl text-white mb-2">Manual Builder</h2>
              <p className="text-slate-400 text-sm leading-relaxed">
                Full referee control. Type custom questions, set countdown timer seconds, configure points, and define exact answer keys.
              </p>
            </div>
            <div className="mt-8 flex items-center gap-2 text-cyan-400 font-bold text-sm group-hover:translate-x-1 transition-transform">
              <span>Open Question Editor</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </Link>
        </div>

        <div className="mt-10 pt-6 border-t border-slate-800/80 text-center">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-sm text-amber-400 hover:text-amber-300 font-semibold transition-colors"
          >
            <span>Already have saved tournaments? Open Host Hub</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
