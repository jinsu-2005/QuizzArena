import { NextResponse } from "next/server";
import { db } from "@/db";
import { players, rooms } from "@/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

const readySchema = z.object({
  playerToken: z.string(),
  ready: z.boolean()
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = readySchema.safeParse(body);
    
    if (!result.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    
    const { playerToken, ready } = result.data;
    
    const [updatedPlayer] = await db
      .update(players)
      .set({ ready, connected: true, lastSeenAt: new Date() })
      .where(eq(players.sessionToken, playerToken))
      .returning();

    if (updatedPlayer) {
      // Find roomCode to notify websocket server
      const [room] = await db
        .select({ roomCode: rooms.roomCode })
        .from(rooms)
        .where(eq(rooms.id, updatedPlayer.roomId))
        .limit(1);

      if (room?.roomCode) {
        // Asynchronously notify the WS server on port 3001 (best-effort dual broadcast)
        fetch("http://localhost:3001/api/notify-player-ready", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            roomCode: room.roomCode,
            playerId: updatedPlayer.id,
            playerToken,
            ready
          })
        }).catch((err) => {
          console.warn("Could not notify local WS server from ready route:", err?.message);
        });
      }
    }
      
    return NextResponse.json({ success: true, player: updatedPlayer });
    
  } catch (error: any) {
    console.error("Player ready API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
