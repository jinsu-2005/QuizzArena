import "dotenv/config";
import { Server } from "socket.io";
import { createServer } from "http";
import { db } from "../src/db/index";
import { rooms, players, questionRounds, buzzEvents, scoreEvents, questions } from "../src/db/schema";
import { eq, and, sql } from "drizzle-orm";

const httpServer = createServer((req, res) => {
  if (req.url === "/health" || req.url === "/") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "healthy", server: "BuzzArena WebSocket Server", port: 3001, timestamp: Date.now() }));
    return;
  }

  // Internal webhook to notify when a question is started via REST API
  if (req.method === "POST" && req.url === "/api/notify-start-question") {
    let body = "";
    req.on("data", (chunk) => { body += chunk; });
    req.on("end", async () => {
      try {
        const { roomCode, questionId, durationMs = 15000, question } = JSON.parse(body);
        const now = Date.now();

        const existing = activeRooms.get(roomCode);
        if (existing?.timeoutState) {
          clearTimeout(existing.timeoutState);
        }

        const timeout = setTimeout(() => {
          io.to(`room_${roomCode}`).emit("question_timeout");
          io.to(`room_host_${roomCode}`).emit("question_timeout");
          const r = activeRooms.get(roomCode);
          if (r) r.buzzerOpen = false;
        }, durationMs);

        activeRooms.set(roomCode, {
          status: "active",
          roomId: existing?.roomId || null,
          hostSessionToken: existing?.hostSessionToken || null,
          currentQuestionId: questionId,
          currentQuestionData: question,
          currentRoundId: existing?.currentRoundId || null,
          questionStartedAt: now,
          buzzerOpen: true,
          buzzedPlayers: new Set(),
          buzzerQueue: [],
          currentAnsweringIndex: 0,
          presetPoints: (question as any)?.pointsCorrect || (question as any)?.points || 100,
          penaltyPoints: (question as any)?.pointsWrong !== undefined ? (question as any)?.pointsWrong : 50,
          currentWinnerId: null,
          currentWinnerName: null,
          remainingTimeMs: durationMs,
          timerDurationMs: durationMs,
          timeoutState: timeout
        });

        io.to(`room_${roomCode}`).emit("question_started", {
          questionId,
          question,
          startedAt: now,
          durationMs
        });
        io.to(`room_host_${roomCode}`).emit("question_started", {
          questionId,
          question,
          startedAt: now,
          durationMs
        });

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: true }));
      } catch (err) {
        console.error("notify-start-question error:", err);
        res.writeHead(400);
        res.end();
      }
    });
    return;
  }

  // Internal webhook to notify host and players when ready state updates via REST API
  if (req.method === "POST" && req.url === "/api/notify-player-ready") {
    let body = "";
    req.on("data", (chunk) => { body += chunk; });
    req.on("end", async () => {
      try {
        const { roomCode, playerId, playerToken, ready } = JSON.parse(body);
        let resolvedPlayer: any = null;
        if (playerId) {
          const [p] = await db.select().from(players).where(eq(players.id, Number(playerId))).limit(1);
          resolvedPlayer = p;
        } else if (playerToken) {
          const [p] = await db.select().from(players).where(eq(players.sessionToken, playerToken)).limit(1);
          resolvedPlayer = p;
        }

        const isReady = Boolean(ready);
        const pid = resolvedPlayer ? resolvedPlayer.id : (playerId ? Number(playerId) : null);
        const playerPayload = resolvedPlayer ? {
          id: resolvedPlayer.id,
          displayName: resolvedPlayer.displayName,
          score: resolvedPlayer.score,
          ready: isReady,
          connected: true
        } : null;

        if (roomCode && pid) {
          io.to(`room_${roomCode}`).emit("player_ready_changed", {
            playerId: pid,
            ready: isReady,
            player: playerPayload
          });
          io.to(`room_host_${roomCode}`).emit("player_ready_changed", {
            playerId: pid,
            ready: isReady,
            player: playerPayload
          });
        }

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: true }));
      } catch (err) {
        console.error("notify-player-ready error:", err);
        res.writeHead(400);
        res.end();
      }
    });
    return;
  }

  // Internal webhook to notify host and players when all players are marked ready
  if (req.method === "POST" && req.url === "/api/notify-roster-ready") {
    let body = "";
    req.on("data", (chunk) => { body += chunk; });
    req.on("end", async () => {
      try {
        const { roomCode } = JSON.parse(body);
        if (roomCode) {
          const [room] = await db.select({ id: rooms.id }).from(rooms).where(eq(rooms.roomCode, roomCode)).limit(1);
          if (room) {
            const updatedPlayers = await db.select().from(players).where(eq(players.roomId, room.id));
            const formatted = updatedPlayers.map((p) => ({
              id: p.id,
              displayName: p.displayName,
              score: p.score,
              ready: p.ready,
              connected: p.connected
            }));
            io.to(`room_${roomCode}`).emit("roster_sync", { players: formatted });
            io.to(`room_host_${roomCode}`).emit("roster_sync", { players: formatted });
            for (const p of formatted) {
              io.to(`room_${roomCode}`).emit("player_ready_changed", { playerId: p.id, ready: true, player: p });
              io.to(`room_host_${roomCode}`).emit("player_ready_changed", { playerId: p.id, ready: true, player: p });
            }
          }
        }
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: true }));
      } catch (err) {
        console.error("notify-roster-ready error:", err);
        res.writeHead(400);
        res.end();
      }
    });
    return;
  }

  res.writeHead(404);
  res.end();
});
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

export interface BuzzerEntry {
  playerId: number;
  playerName: string;
  elapsedMs: number;
  position: number; // 1, 2, or 3
}

// Authoritative in-memory state for sub-millisecond atomic race conditions
interface RoomState {
  status: string;
  roomId: number | null;
  hostSessionToken: string | null;
  currentQuestionId: number | null;
  currentQuestionData: unknown;
  currentRoundId: number | null;
  questionStartedAt: number | null;
  buzzerOpen: boolean;
  buzzedPlayers: Set<number>;
  buzzerQueue: BuzzerEntry[]; // Up to top 3 contenders locked
  currentAnsweringIndex: number; // 0 for #1, 1 for #2, 2 for #3
  presetPoints: number; // Base points for #1 (e.g. 100)
  penaltyPoints: number; // Deduction for wrong answer (e.g. 50)
  currentWinnerId: number | null;
  currentWinnerName: string | null;
  remainingTimeMs: number;
  timerDurationMs: number;
  timeoutState: NodeJS.Timeout | null;
}

interface SocketSession {
  socketId: string;
  isHost?: boolean;
  hostToken?: string;
  playerId?: number;
  roomCode?: string;
}

const activeRooms = new Map<string, RoomState>();
const playerCache = new Map<number, { id: number; displayName: string; roomCode: string }>();
const socketSessions = new Map<string, SocketSession>();

// Verify that the socket or request carries valid host authorization
async function isAuthorizedHost(socketId: string, roomCode: string, providedHostToken?: string): Promise<boolean> {
  const session = socketSessions.get(socketId);
  if (session?.isHost && session.roomCode === roomCode) {
    return true;
  }
  const token = providedHostToken || session?.hostToken;
  if (!token) return false;

  const roomState = activeRooms.get(roomCode);
  if (roomState?.hostSessionToken && roomState.hostSessionToken === token) {
    return true;
  }

  try {
    const [room] = await db
      .select({ id: rooms.id, hostSessionToken: rooms.hostSessionToken })
      .from(rooms)
      .where(eq(rooms.roomCode, roomCode))
      .limit(1);

    if (room && room.hostSessionToken === token) {
      if (roomState) roomState.hostSessionToken = room.hostSessionToken;
      return true;
    }
  } catch (err) {
    console.error("Host auth check error:", err);
  }
  return false;
}

// Background cleanup for abandoned rooms older than 24 hours
async function cleanupStaleRooms() {
  try {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const staleRooms = await db
      .select({ id: rooms.id, roomCode: rooms.roomCode })
      .from(rooms)
      .where(
        and(
          sql`${rooms.createdAt} < ${cutoff}`,
          sql`${rooms.status} != 'ended'`
        )
      );

    if (staleRooms.length > 0) {
      for (const stale of staleRooms) {
        await db
          .update(rooms)
          .set({ status: "ended", endedAt: new Date() })
          .where(eq(rooms.id, stale.id));
        activeRooms.delete(stale.roomCode);
      }
      console.log(`[Cleaner] Closed ${staleRooms.length} stale arena room(s)`);
    }
  } catch (err) {
    console.warn("[Cleaner] Stale room cleanup warning:", err);
  }
}

// Run cleanup immediately and hourly
cleanupStaleRooms();
setInterval(cleanupStaleRooms, 60 * 60 * 1000);

io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  // Contender joins room
  socket.on("join_room", async ({ roomCode, sessionToken }) => {
    try {
      socket.join(`room_${roomCode}`);

      // Look up player in DB
      const [player] = await db
        .select()
        .from(players)
        .where(eq(players.sessionToken, sessionToken))
        .limit(1);

      if (player) {
        socketSessions.set(socket.id, {
          socketId: socket.id,
          playerId: player.id,
          roomCode,
          isHost: false
        });

        playerCache.set(player.id, {
          id: player.id,
          displayName: player.displayName,
          roomCode
        });

        // Mark player connected in DB
        await db
          .update(players)
          .set({ connected: true, lastSeenAt: new Date() })
          .where(eq(players.id, player.id));

        const playerPayload = {
          id: player.id,
          displayName: player.displayName,
          score: player.score,
          ready: Boolean(player.ready),
          connected: true
        };

        // Broadcast to host and room
        io.to(`room_${roomCode}`).emit("player_joined", { player: playerPayload });
        io.to(`room_host_${roomCode}`).emit("player_joined", { player: playerPayload });

        // If there is an active question in progress, synchronize the joining player immediately
        const activeState = activeRooms.get(roomCode);
        if (activeState && activeState.status === "active" && activeState.currentQuestionId) {
          const elapsed = activeState.questionStartedAt ? Date.now() - activeState.questionStartedAt : 0;
          const currentRemaining = Math.max(0, activeState.remainingTimeMs - elapsed);

          socket.emit("question_started", {
            questionId: activeState.currentQuestionId,
            question: activeState.currentQuestionData,
            durationMs: currentRemaining
          });

          if (activeState.buzzerQueue && activeState.buzzerQueue.length > 0) {
            const first = activeState.buzzerQueue[0];
            socket.emit("buzz_accepted", {
              playerId: first.playerId,
              playerName: first.playerName,
              elapsedMs: first.elapsedMs,
              position: first.position,
              buzzerQueue: activeState.buzzerQueue,
              currentAnsweringIndex: activeState.currentAnsweringIndex,
              currentAnsweringPlayer: activeState.buzzerQueue[activeState.currentAnsweringIndex],
              buzzerOpen: activeState.buzzerOpen && activeState.buzzerQueue.length < 3,
              remainingTimeMs: currentRemaining
            });
          }
        }
      }
    } catch (err) {
      console.error("Error in join_room:", err);
    }
  });

  // Player toggles ready state
  socket.on("player_ready", async ({ roomCode, playerId, playerToken, ready }) => {
    try {
      console.log(`[server] player_ready event: room=${roomCode}, playerId=${playerId}, ready=${ready}`);
      let resolvedPlayer = null;
      const isReady = Boolean(ready);

      if (playerId) {
        const [updatedPlayer] = await db
          .update(players)
          .set({ ready: isReady, connected: true, lastSeenAt: new Date() })
          .where(eq(players.id, Number(playerId)))
          .returning();
        resolvedPlayer = updatedPlayer;
      } else if (playerToken) {
        const [updatedPlayer] = await db
          .update(players)
          .set({ ready: isReady, connected: true, lastSeenAt: new Date() })
          .where(eq(players.sessionToken, playerToken))
          .returning();
        resolvedPlayer = updatedPlayer;
      }

      if (resolvedPlayer) {
        console.log(`[server] player ${resolvedPlayer.id} (${resolvedPlayer.displayName}) ready state updated to: ${isReady}`);
        const playerPayload = {
          id: resolvedPlayer.id,
          displayName: resolvedPlayer.displayName,
          score: resolvedPlayer.score,
          ready: isReady,
          connected: true
        };

        io.to(`room_${roomCode}`).emit("player_ready_changed", { 
          playerId: resolvedPlayer.id, 
          ready: isReady,
          player: playerPayload
        });
        io.to(`room_host_${roomCode}`).emit("player_ready_changed", { 
          playerId: resolvedPlayer.id, 
          ready: isReady,
          player: playerPayload
        });
      }
    } catch (err) {
      console.error("Error in player_ready:", err);
    }
  });

  // Host marks all contenders ready
  socket.on("host_ready_all", async ({ roomCode, hostToken }) => {
    try {
      const authorized = await isAuthorizedHost(socket.id, roomCode, hostToken);
      if (!authorized) return;

      const [room] = await db.select({ id: rooms.id }).from(rooms).where(eq(rooms.roomCode, roomCode)).limit(1);
      if (room) {
        await db.update(players).set({ ready: true, lastSeenAt: new Date() }).where(eq(players.roomId, room.id));
        const updatedPlayers = await db.select().from(players).where(eq(players.roomId, room.id));
        const formatted = updatedPlayers.map((p) => ({
          id: p.id,
          displayName: p.displayName,
          score: p.score,
          ready: p.ready,
          connected: p.connected
        }));

        io.to(`room_${roomCode}`).emit("roster_sync", { players: formatted });
        io.to(`room_host_${roomCode}`).emit("roster_sync", { players: formatted });
        for (const p of formatted) {
          io.to(`room_${roomCode}`).emit("player_ready_changed", { playerId: p.id, ready: true, player: p });
          io.to(`room_host_${roomCode}`).emit("player_ready_changed", { playerId: p.id, ready: true, player: p });
        }
      }
    } catch (err) {
      console.error("Error in host_ready_all:", err);
    }
  });

  // Host joins room with security verification
  socket.on("host_join", async ({ roomCode, hostToken }) => {
    try {
      const authorized = await isAuthorizedHost(socket.id, roomCode, hostToken);
      if (!authorized) {
        socket.emit("auth_error", { message: "Invalid host authorization token" });
        return;
      }

      socketSessions.set(socket.id, {
        socketId: socket.id,
        isHost: true,
        hostToken,
        roomCode
      });

      socket.join(`room_host_${roomCode}`);
      socket.join(`room_${roomCode}`);

      // Synchronize latest player roster directly from DB to host
      try {
        const [room] = await db
          .select({ id: rooms.id })
          .from(rooms)
          .where(eq(rooms.roomCode, roomCode))
          .limit(1);

        if (room) {
          const roomPlayers = await db
            .select({
              id: players.id,
              displayName: players.displayName,
              score: players.score,
              ready: players.ready,
              connected: players.connected
            })
            .from(players)
            .where(eq(players.roomId, room.id));

          socket.emit("roster_sync", { players: roomPlayers });
        }
      } catch (rosterErr) {
        console.warn("Could not sync roster in host_join:", rosterErr);
      }

      // Sync active room state to host
      const activeState = activeRooms.get(roomCode);
      if (activeState && activeState.currentQuestionId) {
        const elapsed = activeState.questionStartedAt ? Date.now() - activeState.questionStartedAt : 0;
        const currentRemaining = Math.max(0, activeState.remainingTimeMs - elapsed);

        if (activeState.buzzerQueue && activeState.buzzerQueue.length > 0) {
          const first = activeState.buzzerQueue[0];
          socket.emit("buzz_accepted", {
            playerId: first.playerId,
            playerName: first.playerName,
            elapsedMs: first.elapsedMs,
            position: first.position,
            buzzerQueue: activeState.buzzerQueue,
            currentAnsweringIndex: activeState.currentAnsweringIndex,
            currentAnsweringPlayer: activeState.buzzerQueue[activeState.currentAnsweringIndex],
            buzzerOpen: activeState.buzzerOpen && activeState.buzzerQueue.length < 3,
            remainingTimeMs: currentRemaining
          });
        }
      }
    } catch (err) {
      console.error("Error in host_join:", err);
    }
  });

  // Host starts a question (authenticated)
  socket.on("start_question", async ({ roomCode, questionId, durationMs = 15000, hostToken }) => {
    try {
      console.log("[server] start_question received:", { roomCode, questionId, durationMs, hasHostToken: !!hostToken });
      const authorized = await isAuthorizedHost(socket.id, roomCode, hostToken);
      console.log("[server] isAuthorizedHost result:", authorized);
      if (!authorized) {
        socket.emit("auth_error", { message: "Unauthorized: host token required" });
        return;
      }

      const now = Date.now();

      // Clear any prior timeout
      const existing = activeRooms.get(roomCode);
      if (existing?.timeoutState) {
        clearTimeout(existing.timeoutState);
      }

      // Query question details from Neon DB
      const [q] = await db
        .select()
        .from(questions)
        .where(eq(questions.id, questionId))
        .limit(1);

      // Create questionRound record in Neon DB and update room status to active
      let roundId = null;
      let internalRoomId = null;
      let roomRecord: any = null;
      try {
        const [room] = await db.select().from(rooms).where(eq(rooms.roomCode, roomCode)).limit(1);
        roomRecord = room;
        if (room) {
          internalRoomId = room.id;
          
          await db
            .update(rooms)
            .set({ 
              status: "active", 
              currentQuestionIndex: q?.orderIndex ?? 0 
            })
            .where(eq(rooms.id, room.id));

          const [insertedRound] = await db
            .insert(questionRounds)
            .values({
              roomId: room.id,
              questionId,
              status: "active",
              startedAt: new Date(now),
              remainingTimeMs: durationMs
            })
            .returning();
          roundId = insertedRound?.id;
        }
      } catch (dbErr) {
        console.warn("Could not insert questionRound:", dbErr);
      }

      const timeout = setTimeout(() => {
        io.to(`room_${roomCode}`).emit("question_timeout");
        io.to(`room_host_${roomCode}`).emit("question_timeout");
        const r = activeRooms.get(roomCode);
        if (r) r.buzzerOpen = false;
      }, durationMs);

      activeRooms.set(roomCode, {
        status: "active",
        roomId: internalRoomId,
        hostSessionToken: hostToken || existing?.hostSessionToken || null,
        currentQuestionId: questionId,
        currentQuestionData: q,
        currentRoundId: roundId,
        questionStartedAt: now,
        buzzerOpen: true,
        buzzedPlayers: new Set(),
        buzzerQueue: [],
        currentAnsweringIndex: 0,
        presetPoints: (q as any)?.pointsCorrect || (q as any)?.points || (roomRecord?.settings as any)?.presetPoints || 100,
        penaltyPoints: (q as any)?.pointsWrong !== undefined && (q as any)?.pointsWrong !== null ? (q as any)?.pointsWrong : ((roomRecord?.settings as any)?.penaltyPoints ?? 50),
        currentWinnerId: null,
        currentWinnerName: null,
        remainingTimeMs: durationMs,
        timerDurationMs: durationMs,
        timeoutState: timeout
      });

      io.to(`room_${roomCode}`).emit("question_started", {
        questionId,
        question: q,
        startedAt: now,
        durationMs
      });
      io.to(`room_host_${roomCode}`).emit("question_started", {
        questionId,
        question: q,
        startedAt: now,
        durationMs
      });
    } catch (err) {
      console.error("Error in start_question:", err);
    }
  });

  // Contender taps buzzer
  socket.on("buzz", async ({ roomCode, playerId }) => {
    const receiveTime = Date.now();
    const roomState = activeRooms.get(roomCode);

    if (!roomState || !roomState.buzzerOpen || roomState.buzzerQueue.length >= 3) {
      socket.emit("buzz_rejected", { reason: "buzzer_closed" });
      return;
    }

    if (roomState.buzzedPlayers.has(playerId)) {
      socket.emit("buzz_rejected", { reason: "already_buzzed" });
      return;
    }

    roomState.buzzedPlayers.add(playerId);

    const elapsed = receiveTime - (roomState.questionStartedAt || receiveTime);
    roomState.remainingTimeMs = Math.max(0, roomState.remainingTimeMs - elapsed);

    // Get player name from cache or DB
    const cached = playerCache.get(playerId);
    let playerName = cached?.displayName;

    if (!playerName) {
      const [p] = await db.select().from(players).where(eq(players.id, playerId)).limit(1);
      playerName = p?.displayName || `Contender #${playerId}`;
    }

    const position = roomState.buzzerQueue.length + 1;
    const entry: BuzzerEntry = {
      playerId,
      playerName,
      elapsedMs: elapsed,
      position
    };
    roomState.buzzerQueue.push(entry);

    if (position === 1) {
      roomState.currentWinnerId = playerId;
      roomState.currentWinnerName = playerName;
    }

    // Only allow the first 3 to lock the buzzer
    if (roomState.buzzerQueue.length >= 3) {
      roomState.buzzerOpen = false;
      if (roomState.timeoutState) {
        clearTimeout(roomState.timeoutState);
        roomState.timeoutState = null;
      }
    }

    // Persist buzz event in Neon DB
    if (roomState.currentRoundId) {
      try {
        await db.insert(buzzEvents).values({
          questionRoundId: roomState.currentRoundId,
          playerId,
          elapsedMs: elapsed,
          buzzPosition: position,
          accepted: true
        });
      } catch (dbErr) {
        console.warn("Could not insert buzzEvent:", dbErr);
      }
    }

    const payload = {
      playerId,
      playerName,
      elapsedMs: elapsed,
      position,
      buzzerQueue: roomState.buzzerQueue,
      currentAnsweringIndex: roomState.currentAnsweringIndex,
      currentAnsweringPlayer: roomState.buzzerQueue[roomState.currentAnsweringIndex],
      buzzerOpen: roomState.buzzerOpen && roomState.buzzerQueue.length < 3,
      remainingTimeMs: roomState.remainingTimeMs
    };

    // Broadcast buzz lock-in to everyone in the room
    io.to(`room_${roomCode}`).emit("buzz_accepted", payload);
    io.to(`room_host_${roomCode}`).emit("buzz_accepted", payload);
  });

  // Host evaluates answer (Correct / Wrong) (authenticated)
  socket.on("judge_answer", async ({ roomCode, playerId, correct, pointsAwarded, hostToken }) => {
    try {
      const authorized = await isAuthorizedHost(socket.id, roomCode, hostToken);
      if (!authorized) {
        socket.emit("auth_error", { message: "Unauthorized: host token required" });
        return;
      }

      const roomState = activeRooms.get(roomCode);
      if (!roomState) return;

      const currentContender = roomState.buzzerQueue[roomState.currentAnsweringIndex] || {
        playerId,
        playerName: roomState.currentWinnerName || "Contender",
        position: 1,
        elapsedMs: 0
      };
      const activePlayerId = currentContender.playerId || playerId;

      if (correct && activePlayerId) {
        // Contender #1 gets full preset points (e.g. 100)
        // Contender #2 or #3 gets half the preset score (e.g. 50)
        const isHalf = roomState.currentAnsweringIndex >= 1;
        const awarded = pointsAwarded !== undefined 
          ? pointsAwarded 
          : (isHalf ? Math.round(roomState.presetPoints / 2) : roomState.presetPoints);

        const numericPlayerId = Number(activePlayerId);

        // Update score in Neon DB
        const [updatedPlayer] = await db
          .update(players)
          .set({ score: sql`${players.score} + ${awarded}` })
          .where(eq(players.id, numericPlayerId))
          .returning();

        // Insert score event in Neon DB
        if (roomState.roomId) {
          try {
            await db.insert(scoreEvents).values({
              roomId: roomState.roomId,
              playerId: numericPlayerId,
              questionId: roomState.currentQuestionId,
              delta: awarded,
              reason: isHalf ? "correct_buzz_half" : "correct_buzz"
            });
          } catch (dbErr) {
            console.warn("Could not insert scoreEvent:", dbErr);
          }
        }

        // Broadcast updated score to all clients
        io.to(`room_${roomCode}`).emit("score_updated", {
          playerId: numericPlayerId,
          newScore: updatedPlayer?.score !== undefined ? updatedPlayer.score : awarded,
          pointsAwarded: awarded
        });

        roomState.buzzerOpen = false;

        // Conclude question
        if (roomState.currentQuestionId) {
          const [q] = await db
            .select()
            .from(questions)
            .where(eq(questions.id, roomState.currentQuestionId))
            .limit(1);

          io.to(`room_${roomCode}`).emit("question_ended", {
            correctAnswer: q?.correctAnswer,
            explanation: q?.explanation,
            winnerId: numericPlayerId,
            winnerName: currentContender.playerName,
            pointsAwarded: awarded
          });
        }
      } else if (!correct && activePlayerId) {
        const numericPlayerId = Number(activePlayerId);

        // Wrong answer: Host deducts wrong answer penalty
        const deduction = roomState.penaltyPoints ?? 50;

        const [updatedPlayer] = await db
          .update(players)
          .set({ score: sql`${players.score} - ${deduction}` })
          .where(eq(players.id, numericPlayerId))
          .returning();

        if (roomState.roomId) {
          try {
            await db.insert(scoreEvents).values({
              roomId: roomState.roomId,
              playerId: numericPlayerId,
              questionId: roomState.currentQuestionId,
              delta: -deduction,
              reason: "wrong_buzz_penalty"
            });
          } catch (dbErr) {
            console.warn("Could not insert scoreEvent:", dbErr);
          }
        }

        // Live score deduction broadcast
        io.to(`room_${roomCode}`).emit("score_updated", {
          playerId: numericPlayerId,
          newScore: updatedPlayer?.score !== undefined ? updatedPlayer.score : -deduction,
          pointsAwarded: -deduction
        });

        // Advance to player who pressed buzzer 2nd (or 3rd)
        roomState.currentAnsweringIndex++;

        if (roomState.currentAnsweringIndex < roomState.buzzerQueue.length) {
          const nextContender = roomState.buzzerQueue[roomState.currentAnsweringIndex];
          const halfPoints = Math.round(roomState.presetPoints / 2);

          const passPayload = {
            previousPlayerId: activePlayerId,
            activeContender: nextContender,
            currentAnsweringIndex: roomState.currentAnsweringIndex,
            buzzerQueue: roomState.buzzerQueue,
            halfPoints
          };

          io.to(`room_${roomCode}`).emit("buzzer_passed_to_next", passPayload);
          io.to(`room_host_${roomCode}`).emit("buzzer_passed_to_next", passPayload);
        } else {
          // Buzzer queue exhausted (all buzzed contenders answered wrong)
          roomState.buzzerOpen = false;

          let qAnswer = "";
          let qExplanation = "";
          if (roomState.currentQuestionId) {
            try {
              const [q] = await db
                .select()
                .from(questions)
                .where(eq(questions.id, roomState.currentQuestionId))
                .limit(1);
              qAnswer = q?.correctAnswer || "";
              qExplanation = q?.explanation || "";
            } catch (dbErr) {
              console.warn("Could not query question on queue exhausted:", dbErr);
            }
          }

          const exhaustedPayload = {
            lastPlayerId: activePlayerId,
            correctAnswer: qAnswer,
            explanation: qExplanation
          };

          io.to(`room_${roomCode}`).emit("buzzer_queue_exhausted", exhaustedPayload);
          io.to(`room_host_${roomCode}`).emit("buzzer_queue_exhausted", exhaustedPayload);
        }
      }
    } catch (err) {
      console.error("Error in judge_answer:", err);
    }
  });

  // Host reopens buzzer after incorrect answer (authenticated)
  socket.on("reopen_buzzer", async ({ roomCode, hostToken }) => {
    const authorized = await isAuthorizedHost(socket.id, roomCode, hostToken);
    if (!authorized) {
      socket.emit("auth_error", { message: "Unauthorized: host token required" });
      return;
    }

    const roomState = activeRooms.get(roomCode);
    if (!roomState) return;

    roomState.buzzerOpen = true;
    roomState.buzzerQueue = [];
    roomState.currentAnsweringIndex = 0;
    roomState.currentWinnerId = null;
    roomState.currentWinnerName = null;
    roomState.questionStartedAt = Date.now();

    roomState.timeoutState = setTimeout(() => {
      io.to(`room_${roomCode}`).emit("question_timeout");
      roomState.buzzerOpen = false;
    }, roomState.remainingTimeMs);

    io.to(`room_${roomCode}`).emit("buzzer_reopened", {
      resumeAt: roomState.questionStartedAt,
      remainingTimeMs: roomState.remainingTimeMs
    });
  });

  // Host kicks a player (authenticated)
  socket.on("kick_player", async ({ roomCode, playerId, hostToken }) => {
    try {
      const authorized = await isAuthorizedHost(socket.id, roomCode, hostToken);
      if (!authorized) {
        socket.emit("auth_error", { message: "Unauthorized: host token required" });
        return;
      }

      await db.delete(players).where(eq(players.id, Number(playerId)));
      io.to(`room_${roomCode}`).emit("player_kicked", { playerId: Number(playerId) });
      io.to(`room_host_${roomCode}`).emit("player_kicked", { playerId: Number(playerId) });
    } catch (err) {
      console.error("Error in kick_player:", err);
    }
  });

  // Finish game (authenticated)
  socket.on("finish_game", async ({ roomCode, hostToken }) => {
    try {
      const authorized = await isAuthorizedHost(socket.id, roomCode, hostToken);
      if (!authorized) {
        socket.emit("auth_error", { message: "Unauthorized: host token required" });
        return;
      }

      await db.update(rooms).set({ status: "ended", endedAt: new Date() }).where(eq(rooms.roomCode, roomCode));
      activeRooms.delete(roomCode);
      io.to(`room_${roomCode}`).emit("game_finished");
    } catch (err) {
      console.error("Error in finish_game:", err);
    }
  });

  // Disconnect handling for players and hosts
  socket.on("disconnect", async () => {
    const session = socketSessions.get(socket.id);
    socketSessions.delete(socket.id);

    if (session) {
      if (!session.isHost && session.playerId && session.roomCode) {
        console.log(`Contender #${session.playerId} disconnected from room ${session.roomCode}`);
        try {
          await db
            .update(players)
            .set({ connected: false, lastSeenAt: new Date() })
            .where(eq(players.id, session.playerId));

          io.to(`room_${session.roomCode}`).emit("player_disconnected", {
            playerId: session.playerId
          });
        } catch (dbErr) {
          console.warn("Could not mark player disconnected:", dbErr);
        }
      } else if (session.isHost && session.roomCode) {
        console.log(`Host disconnected from room ${session.roomCode}`);
        io.to(`room_${session.roomCode}`).emit("host_disconnected", {
          roomCode: session.roomCode
        });
      }
    } else {
      console.log("Client disconnected:", socket.id);
    }
  });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Authoritative Buzzer Websocket Server active on port ${PORT}`);
});
