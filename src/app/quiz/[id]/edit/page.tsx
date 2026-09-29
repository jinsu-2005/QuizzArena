"use client";

import { useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { Zap } from "lucide-react";
import { toast } from "sonner";

export default function EditExistingQuizPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);

  useEffect(() => {
    const fetchQuiz = async () => {
      try {
        const res = await fetch(`/api/quiz?id=${id}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Quiz not found");

        sessionStorage.setItem("draft_quiz", JSON.stringify(data.quiz));
        router.replace(`/quiz/draft/edit?quizId=${id}`);
      } catch (err: any) {
        toast.error(err.message);
        router.replace("/create");
      }
    };

    fetchQuiz();
  }, [id, router]);

  return (
    <div className="min-h-screen bg-[#070b14] text-white flex items-center justify-center">
      <div className="flex items-center gap-2 text-slate-400 font-heading">
        <Zap className="w-5 h-5 text-cyan-400 animate-pulse" />
        <span>Loading Quiz #{id}...</span>
      </div>
    </div>
  );
}
