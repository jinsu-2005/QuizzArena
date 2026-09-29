import { NextResponse } from "next/server";
import { db } from "@/db";
import { quizzes, questions, rooms } from "@/db/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";
import { z } from "zod";

const questionSchema = z.object({
  question: z.string(),
  type: z.enum(["verbal", "multiple_choice"]),
  options: z.array(z.string()).optional(),
  correctAnswer: z.string(),
  explanation: z.string().optional(),
  timerSeconds: z.number().default(15),
  points: z.number().default(100),
  pointsWrong: z.number().optional()
});

const quizSchema = z.object({
  title: z.string(),
  questions: z.array(questionSchema)
});

// Helper to generate unique 6 digit room code
async function generateUniqueRoomCode() {
  let attempts = 0;
  while (attempts < 10) {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const existing = await db.query.rooms.findFirst({
      where: (rooms, { eq, and, ne }) => and(eq(rooms.roomCode, code), ne(rooms.status, "ended"))
    });
    if (!existing) return code;
    attempts++;
  }
  throw new Error("Could not generate a unique room code");
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = quizSchema.safeParse(body.quiz);
    
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid quiz format" }, { status: 400 });
    }
    
    const quizData = parsed.data;
    const hostToken = crypto.randomUUID();

    const existingQuizId = body.quizId ? parseInt(body.quizId, 10) : null;
    let targetQuizId: number;

    if (existingQuizId && !isNaN(existingQuizId)) {
      // Update existing draft / quiz to published
      await db
        .update(quizzes)
        .set({
          title: quizData.title,
          status: "published",
          updatedAt: new Date(),
        })
        .where(eq(quizzes.id, existingQuizId));

      await db.delete(questions).where(eq(questions.quizId, existingQuizId));
      targetQuizId = existingQuizId;
    } else {
      // Create quiz in Neon DB
      const [insertedQuiz] = await db.insert(quizzes).values({
        title: quizData.title,
        hostSessionId: hostToken,
        hostUserId: null,
        hostUserEmail: null,
        status: "published",
      }).returning({ id: quizzes.id });
      targetQuizId = insertedQuiz.id;
    }
    
    // Insert questions
    if (quizData.questions.length > 0) {
      const qs = quizData.questions.map((q, i) => ({
        quizId: targetQuizId,
        orderIndex: i,
        questionText: q.question,
        questionType: q.type,
        options: q.options || [],
        correctAnswer: q.correctAnswer,
        explanation: q.explanation || "",
        timerSeconds: q.timerSeconds,
        pointsCorrect: q.points,
        pointsWrong: q.pointsWrong !== undefined ? q.pointsWrong : (body.settings?.penaltyPoints ?? 50)
      }));
      await db.insert(questions).values(qs);
    }
    
    // Create room
    const roomCode = await generateUniqueRoomCode();
    const roomSettings = {
      lateJoining: true,
      reopenBuzzer: true,
      penaltyPoints: body.settings?.penaltyPoints ?? 50,
      presetPoints: body.settings?.presetPoints ?? 100,
      timerSeconds: body.settings?.timerSeconds ?? 15,
      ...(body.settings || {})
    };
    
    await db.insert(rooms).values({
      roomCode,
      quizId: targetQuizId,
      hostSessionToken: hostToken,
      status: "lobby",
      settings: roomSettings
    });
    
    return NextResponse.json({ success: true, roomCode, hostToken });
    
  } catch (error: any) {
    console.error("Quiz creation error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
