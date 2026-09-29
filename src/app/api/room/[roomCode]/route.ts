import { NextResponse } from "next/server";
import { db } from "@/db";
import { rooms, quizzes, questions, players } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(req: Request, { params }: { params: Promise<{ roomCode: string }> }) {
  try {
    const { roomCode } = await params;
    const url = new URL(req.url);
    const hostToken = url.searchParams.get("hostToken");
    const playerToken = url.searchParams.get("playerToken");
    
    // Find room in database
    const [room] = await db.select().from(rooms).where(eq(rooms.roomCode, roomCode)).limit(1);
    
    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }
    
    // Check if host
    const isHost = hostToken === room.hostSessionToken;
    let isPlayer = false;
    let currentPlayer = null;
    
    if (playerToken) {
      const [player] = await db.select().from(players).where(eq(players.sessionToken, playerToken)).limit(1);
      if (player && player.roomId === room.id) {
        isPlayer = true;
        currentPlayer = player;
      }
    }
    
    if (!isHost && !isPlayer && room.status !== "ended") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const [quiz] = await db.select().from(quizzes).where(eq(quizzes.id, room.quizId)).limit(1);
    
    const allQuestions = await db
      .select()
      .from(questions)
      .where(eq(questions.quizId, room.quizId))
      .orderBy(questions.orderIndex);
    
    const allPlayers = await db
      .select()
      .from(players)
      .where(eq(players.roomId, room.id));
    
    // Format questions based on host vs player authorization
    const safeQuestions = allQuestions.map(q => {
      if (isHost) {
        return q;
      } else {
        // Obfuscate correct answer until revealed during gameplay
        return {
          id: q.id,
          orderIndex: q.orderIndex,
          questionText: q.questionText,
          questionType: q.questionType,
          options: q.options,
          timerSeconds: q.timerSeconds,
          pointsCorrect: q.pointsCorrect
        };
      }
    });
    
    // Format player roster
    const safePlayers = allPlayers.map(p => ({
      id: p.id,
      displayName: p.displayName,
      score: p.score,
      ready: p.ready,
      connected: p.connected
    }));
    
    return NextResponse.json({
      room: {
        id: room.id,
        roomCode: room.roomCode,
        status: room.status,
        currentQuestionIndex: room.currentQuestionIndex,
        settings: room.settings
      },
      quiz: {
        id: quiz?.id,
        title: quiz?.title || "Tournament Quiz",
        description: quiz?.description
      },
      questions: safeQuestions,
      players: safePlayers,
      currentPlayer: currentPlayer ? {
        id: currentPlayer.id,
        displayName: currentPlayer.displayName,
        score: currentPlayer.score,
        ready: currentPlayer.ready,
        connected: currentPlayer.connected
      } : null,
      isHost
    });
    
  } catch (error: any) {
    console.error("Room API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
