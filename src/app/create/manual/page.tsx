"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ManualCreatePage() {
  const router = useRouter();

  useEffect(() => {
    const isFresh = new URLSearchParams(window.location.search).get("fresh") === "true";
    const existing = sessionStorage.getItem("draft_quiz");

    if (isFresh || !existing) {
      // Start with a clean, blank quiz template with zero mock data
      const blankQuiz = {
        title: "",
        questions: [
          {
            question: "",
            type: "multiple_choice",
            options: ["", "", "", ""],
            correctAnswer: "",
            explanation: "",
            timerSeconds: 15,
            points: 100
          }
        ]
      };
      sessionStorage.setItem("draft_quiz", JSON.stringify(blankQuiz));
    }

    router.replace("/quiz/draft/edit");
  }, [router]);

  return (
    <div className="min-h-screen bg-[#070b14] text-white flex items-center justify-center">
      <div className="font-heading font-semibold text-slate-400 animate-pulse">
        Opening Clean Quiz Studio...
      </div>
    </div>
  );
}
