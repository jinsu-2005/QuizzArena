import { NextResponse } from "next/server";
import { db } from "@/db";
import { rooms, players } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import crypto from "crypto";

const joinSchema = z.object({
  roomCode: z.string().min(6).max(6),
  displayName: z.string().min(1).max(20).trim()
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = joinSchema.safeParse(body);
    
    if (!result.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    
    const { roomCode, displayName } = result.data;
    
    // Find room
    const roomList = await db.select().from(rooms).where(eq(rooms.roomCode, roomCode)).limit(1);
    const room = roomList[0];
    
    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }
    
    if (room.status === "ended") {
      return NextResponse.json({ error: "This room has ended" }, { status: 400 });
    }
    
    // Parse settings for Late Joining
    const settings: any = room.settings || {};
    if (room.status === "active" && settings.lateJoining === false) {
      return NextResponse.json({ error: "This quiz has already started and is not accepting new players" }, { status: 400 });
    }
    
    // Check for duplicate name
    const existingPlayers = await db.select().from(players).where(
      and(eq(players.roomId, room.id), eq(players.displayName, displayName))
    );
    
    if (existingPlayers.length > 0) {
      return NextResponse.json({ error: "That name is already being used in this room" }, { status: 400 });
    }
    
    // Generate token
    const sessionToken = crypto.randomUUID();
    
    await db.insert(players).values({
      roomId: room.id,
      displayName,
      sessionToken,
      score: 0,
      ready: false,
      connected: true
    });
    
    return NextResponse.json({ 
      success: true, 
      roomCode: room.roomCode, 
      sessionToken 
    });
    
  } catch (error) {
    console.error("Join API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
