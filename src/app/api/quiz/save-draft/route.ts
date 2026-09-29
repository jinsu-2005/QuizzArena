import { NextResponse } from "next/server";
import { db } from "@/db";
import { quizzes, questions } from "@/db/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { quiz, quizId } = body;

    if (!quiz || !quiz.title) {
      return NextResponse.json({ error: "Quiz title is required" }, { status: 400 });
    }

    let targetQuizId = quizId ? parseInt(quizId, 10) : null;

    if (targetQuizId && !isNaN(targetQuizId)) {
      // Update existing draft
      await db
        .update(quizzes)
        .set({
          title: quiz.title,
          status: "draft",
          updatedAt: new Date(),
        })
        .where(eq(quizzes.id, targetQuizId));

      // Replace questions
      await db.delete(questions).where(eq(questions.quizId, targetQuizId));
    } else {
      // Create new draft
      const hostToken = crypto.randomUUID();
      const [inserted] = await db
        .insert(quizzes)
        .values({
          title: quiz.title,
          hostSessionId: hostToken,
          hostUserId: null,
          hostUserEmail: null,
          status: "draft",
        })
        .returning({ id: quizzes.id });

      targetQuizId = inserted.id;
    }

    // Insert questions if any exist
    if (quiz.questions && quiz.questions.length > 0) {
      const qs = quiz.questions.map((q: any, i: number) => ({
        quizId: targetQuizId!,
        orderIndex: i,
        questionText: q.question || `Draft Question ${i + 1}`,
        questionType: q.type || "multiple_choice",
        options: q.options || [],
        correctAnswer: q.correctAnswer || (q.options ? q.options[0] : ""),
        explanation: q.explanation || "",
        timerSeconds: q.timerSeconds || 15,
        pointsCorrect: q.points || 100,
        pointsWrong: 0,
      }));
      await db.insert(questions).values(qs);
    }

    return NextResponse.json({ success: true, quizId: targetQuizId });
  } catch (error: any) {
    console.error("Save draft error:", error);
    return NextResponse.json({ error: "Failed to save draft" }, { status: 500 });
  }
}
