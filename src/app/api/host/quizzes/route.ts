import { NextResponse } from "next/server";
import { db } from "@/db";
import { quizzes, questions, rooms } from "@/db/schema";
import { auth } from "@/lib/auth/server";
import { eq, desc, or } from "drizzle-orm";
import crypto from "crypto";

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

export async function GET() {
  try {
    let sessionUser: { id: string; email?: string } | null = null;
    try {
      const sessionRes = await auth.getSession();
      if (sessionRes?.data?.user) {
        sessionUser = sessionRes.data.user;
      }
    } catch {
      // Guest
    }

    let userQuizzes = [];
    if (sessionUser) {
      userQuizzes = await db
        .select()
        .from(quizzes)
        .where(
          or(
            eq(quizzes.hostUserId, sessionUser.id),
            eq(quizzes.hostSessionId, sessionUser.id),
            sessionUser.email ? eq(quizzes.hostUserEmail, sessionUser.email) : undefined
          )
        )
        .orderBy(desc(quizzes.createdAt))
        .limit(50);
    } else {
      userQuizzes = await db
        .select()
        .from(quizzes)
        .orderBy(desc(quizzes.createdAt))
        .limit(20);
    }

    // Attach question counts
    const quizzesWithCounts = await Promise.all(
      userQuizzes.map(async (q) => {
        const qs = await db
          .select({ id: questions.id })
          .from(questions)
          .where(eq(questions.quizId, q.id));
        return {
          ...q,
          status: q.status || "published",
          questionCount: qs.length,
        };
      })
    );

    const publishedQuizzes = quizzesWithCounts.filter(q => q.status !== "draft");
    const draftQuizzes = quizzesWithCounts.filter(q => q.status === "draft");

    return NextResponse.json({
      authenticated: !!sessionUser,
      user: sessionUser,
      quizzes: publishedQuizzes,
      drafts: draftQuizzes,
      all: quizzesWithCounts,
    });
  } catch (error: any) {
    console.error("Host quizzes fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch quizzes" }, { status: 500 });
  }
}

// Launch an arena room from an existing quiz
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const quizId = parseInt(body.quizId, 10);
    if (!quizId || isNaN(quizId)) {
      return NextResponse.json({ error: "Valid quizId is required" }, { status: 400 });
    }

    const [quiz] = await db.select().from(quizzes).where(eq(quizzes.id, quizId)).limit(1);
    if (!quiz) {
      return NextResponse.json({ error: "Quiz not found in Neon database" }, { status: 404 });
    }

    const hostToken = crypto.randomUUID();
    const roomCode = await generateUniqueRoomCode();

    await db.insert(rooms).values({
      roomCode,
      quizId: quiz.id,
      hostSessionToken: hostToken,
      status: "lobby",
      settings: {
        lateJoining: true,
        reopenBuzzer: true,
      },
    });

    return NextResponse.json({ success: true, roomCode, hostToken });
  } catch (error: any) {
    console.error("Room launch from quiz error:", error);
    return NextResponse.json({ error: "Failed to launch room" }, { status: 500 });
  }
}
