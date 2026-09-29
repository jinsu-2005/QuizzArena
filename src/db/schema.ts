import { pgTable, text, timestamp, integer, json, boolean, serial } from "drizzle-orm/pg-core";

export const quizzes = pgTable("quizzes", {
  id: serial("id").primaryKey(),
  hostSessionId: text("host_session_id").notNull(),
  hostUserId: text("host_user_id"),
  hostUserEmail: text("host_user_email"),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status").default("published"), // "draft" | "published"
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const questions = pgTable("questions", {
  id: serial("id").primaryKey(),
  quizId: integer("quiz_id").references(() => quizzes.id).notNull(),
  orderIndex: integer("order_index").notNull(),
  questionText: text("question_text").notNull(),
  questionType: text("question_type").notNull(), // "verbal" | "multiple_choice"
  options: json("options"), // array of strings for multiple choice
  correctAnswer: text("correct_answer").notNull(),
  explanation: text("explanation"),
  timerSeconds: integer("timer_seconds").default(15).notNull(),
  pointsCorrect: integer("points_correct").default(1).notNull(),
  pointsWrong: integer("points_wrong").default(0).notNull(),
});

export const rooms = pgTable("rooms", {
  id: serial("id").primaryKey(),
  roomCode: text("room_code").notNull().unique(),
  quizId: integer("quiz_id").references(() => quizzes.id).notNull(),
  hostSessionToken: text("host_session_token").notNull(),
  status: text("status").notNull(), // "lobby" | "active" | "ended"
  currentQuestionIndex: integer("current_question_index").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  endedAt: timestamp("ended_at"),
  settings: json("settings"), // Game rules configuration
});

export const players = pgTable("players", {
  id: serial("id").primaryKey(),
  roomId: integer("room_id").references(() => rooms.id).notNull(),
  displayName: text("display_name").notNull(),
  sessionToken: text("session_token").notNull().unique(),
  score: integer("score").default(0).notNull(),
  ready: boolean("ready").default(false).notNull(),
  connected: boolean("connected").default(true).notNull(),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
  lastSeenAt: timestamp("last_seen_at").defaultNow().notNull(),
});

export const questionRounds = pgTable("question_rounds", {
  id: serial("id").primaryKey(),
  roomId: integer("room_id").references(() => rooms.id).notNull(),
  questionId: integer("question_id").references(() => questions.id).notNull(),
  status: text("status").notNull(), // "preparing" | "active" | "buzz_received" | "player_answering" | "ended"
  startedAt: timestamp("started_at"),
  pausedAt: timestamp("paused_at"),
  remainingTimeMs: integer("remaining_time_ms"),
  winnerPlayerId: integer("winner_player_id").references(() => players.id),
  endedAt: timestamp("ended_at"),
});

export const buzzEvents = pgTable("buzz_events", {
  id: serial("id").primaryKey(),
  questionRoundId: integer("question_round_id").references(() => questionRounds.id).notNull(),
  playerId: integer("player_id").references(() => players.id).notNull(),
  serverReceivedAt: timestamp("server_received_at").defaultNow().notNull(),
  elapsedMs: integer("elapsed_ms").notNull(),
  buzzPosition: integer("buzz_position"),
  accepted: boolean("accepted").default(false).notNull(),
});

export const scoreEvents = pgTable("score_events", {
  id: serial("id").primaryKey(),
  roomId: integer("room_id").references(() => rooms.id).notNull(),
  playerId: integer("player_id").references(() => players.id).notNull(),
  questionId: integer("question_id").references(() => questions.id),
  delta: integer("delta").notNull(),
  reason: text("reason"), // e.g. "correct_answer", "manual_adjustment"
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
