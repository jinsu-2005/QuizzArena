# 🎯 BuzzArena

**Real-time quiz & buzzer battle platform** — host live quizzes, verbal buzz battles, and MCQ tournaments with AI-generated questions and live leaderboards.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/jinsu-2005/BuzzArena)

## ✨ Features

- **🧠 AI Question Generation** — Powered by Google Gemini, auto-generate quiz questions by topic
- **⚡ Verbal Buzz Mode** — Physical buzzer-style rapid-fire with queue-based answer passing
- **📊 MCQ Mode** — Standard multiple-choice quiz with timed rounds
- **🏆 Live Leaderboard** — Real-time scoring with animated podium
- **📱 Mobile-First** — Fully responsive for phones, tablets, and projectors
- **🎨 Beautiful UI** — Dark glassmorphic design with smooth animations

## 🏗️ Architecture

| Service | Technology | Hosting |
|---------|-----------|---------|
| Frontend + API | Next.js 16 (App Router) | Vercel |
| WebSocket Server | Socket.io + Node.js | Render |
| Database | PostgreSQL (Drizzle ORM) | Neon |
| AI | Google Gemini API | — |

## 🚀 Local Development

```bash
# 1. Install dependencies
npm install

# 2. Copy env vars
cp .env.example .env.local
# Fill in DATABASE_URL, GEMINI_API_KEY, NEXT_PUBLIC_WS_URL

# 3. Run migrations
npx drizzle-kit push

# 4. Start both servers
npm run dev
```

App runs on `http://localhost:3000`, WebSocket on `http://localhost:3001`.

## 🌐 Deployment

### Frontend → Vercel
1. Connect this GitHub repo to Vercel
2. Add environment variables in Vercel dashboard:
   - `DATABASE_URL` (Neon connection string)
   - `GEMINI_API_KEY`
   - `NEXT_PUBLIC_APP_URL` (your Vercel URL)
   - `NEXT_PUBLIC_WS_URL` (your Render WebSocket URL)

### WebSocket Backend → Render
1. Create a new **Web Service** on Render
2. Connect this repo and point to `server/Dockerfile`
3. Add `DATABASE_URL` env var
4. Set health check path to `/health`

## 📁 Project Structure

```
├── src/
│   ├── app/           # Next.js pages & API routes
│   ├── components/    # Reusable UI components
│   ├── db/            # Drizzle ORM schema & client
│   └── lib/           # Utilities (socket, sound, auth)
├── server/
│   ├── index.ts       # Socket.io WebSocket server
│   └── Dockerfile     # Container for Render deployment
└── render.yaml        # Render deployment config
```

## 🎮 How to Play

1. **Host** creates a quiz and starts a room → gets a room code
2. **Players** join via `/join` or QR code on their phones
3. Everyone marks **Ready** → Host starts the quiz
4. In **Verbal Buzz** mode: players buzz first, host judges answers
5. In **MCQ** mode: players select answers within the timer
6. **Leaderboard** updates live after each question

---

Made with ❤️ by [Jinsu J](https://github.com/jinsu-2005)
