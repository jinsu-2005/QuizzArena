import { NextResponse } from "next/server";
import { db } from "@/db";
import { rooms, players } from "@/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

const readyAllSchema = z.object({
  roomCode: z.string(),
  hostToken: z.string()
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = readyAllSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const { roomCode, hostToken } = result.data;

    const [room] = await db.select().from(rooms).where(eq(rooms.roomCode, roomCode)).limit(1);
    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    if (room.hostSessionToken !== hostToken) {
      return NextResponse.json({ error: "Unauthorized: Invalid host token" }, { status: 401 });
    }

    const updated = await db
      .update(players)
      .set({ ready: true, lastSeenAt: new Date() })
      .where(eq(players.roomId, room.id))
      .returning();

    // Notify local WS server (best effort)
    fetch("http://localhost:3001/api/notify-roster-ready", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomCode })
    }).catch(() => {});

    return NextResponse.json({ success: true, count: updated.length, players: updated });
  } catch (error: any) {
    console.error("Ready-all API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
