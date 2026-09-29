import { NextResponse } from "next/server";
import { db } from "@/db";
import { rooms, questions, questionRounds } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: Request) {
  try {
    const { roomCode, questionId, durationMs = 15000, hostToken } = await req.json();

    if (!roomCode || !questionId) {
      return NextResponse.json({ error: "Missing roomCode or questionId" }, { status: 400 });
    }

    const [room] = await db
      .select()
      .from(rooms)
      .where(eq(rooms.roomCode, roomCode))
      .limit(1);

    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    if (room.hostSessionToken !== hostToken) {
      return NextResponse.json({ error: "Unauthorized: invalid host token" }, { status: 401 });
    }

    const [q] = await db
      .select()
      .from(questions)
      .where(eq(questions.id, Number(questionId)))
      .limit(1);

    if (!q) {
      return NextResponse.json({ error: "Question not found" }, { status: 404 });
    }

    const now = new Date();

    // Update room to active
    await db
      .update(rooms)
      .set({
        status: "active",
        currentQuestionIndex: q.orderIndex ?? 0
      })
      .where(eq(rooms.id, room.id));

    // Record question round
    await db.insert(questionRounds).values({
      roomId: room.id,
      questionId: q.id,
      status: "active",
      startedAt: now,
      remainingTimeMs: durationMs
    });

    // Notify WebSocket server on port 3001 asynchronously
    fetch("http://localhost:3001/api/notify-start-question", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        roomCode,
        questionId: q.id,
        durationMs,
        question: q
      })
    }).catch((err) => {
      console.warn("Could not notify ws server about start-question:", err);
    });

    return NextResponse.json({ success: true, question: q });
  } catch (err: any) {
    console.error("start-question error:", err);
    return NextResponse.json({ error: err.message || "Failed to start question" }, { status: 500 });
  }
}
