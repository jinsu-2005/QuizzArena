"use client";

import { useEffect, useState, useRef, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  Zap, 
  Users, 
  Play, 
  Pause, 
  SkipForward, 
  CheckCircle2, 
  XCircle, 
  RotateCcw, 
  Eye, 
  EyeOff, 
  Copy, 
  Check, 
  QrCode, 
  Trophy, 
  Volume2, 
  VolumeX, 
  Crown,
  Monitor,
  UserX,
  ExternalLink,
  Clock,
  AlertCircle,
  X
} from "lucide-react";
import QRCode from "react-qr-code";
import { toast } from "sonner";
import { getSocket } from "@/lib/socket";
import { sounds } from "@/lib/sound";

export default function HostDashboard({ params }: { params: Promise<{ roomCode: string }> }) {
  const router = useRouter();
  const { roomCode } = use(params);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const socketRef = useRef<any>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [projectorMode, setProjectorMode] = useState(false);
  const [revealAnswer, setRevealAnswer] = useState(false);
  const hostTokenRef = useRef<string | null>(null);

  // Active question and buzz state
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [gameState, setGameState] = useState<any>({
    status: "lobby", // lobby, question_active, buzzed, round_done
    timerRemaining: 0,
    timerRunning: false,
    buzzerWinnerId: null,
    buzzerWinnerName: null,
    buzzDeltaMs: 0,
    buzzerOpen: false,
    buzzerQueue: [],
    currentAnsweringIndex: 0,
    activeContender: null,
    halfPoints: 50
  });

  const [leaderboard, setLeaderboard] = useState<any[]>([]);

  useEffect(() => {
    let timerInterval: any = null;

    const fetchRoom = async () => {
      let hostToken = localStorage.getItem(`buzzarena_host_${roomCode}`);
      if (!hostToken && typeof window !== "undefined") {
        hostToken = new URLSearchParams(window.location.search).get("hostToken");
        if (hostToken) {
          localStorage.setItem(`buzzarena_host_${roomCode}`, hostToken);
        }
      }

      hostTokenRef.current = hostToken;

      if (!hostToken) {
        toast.error("Host authorization required to manage this arena");
        router.push("/dashboard");
        return;
      }
      
      try {
        const res = await fetch(`/api/room/${roomCode}?hostToken=${hostToken}`);
        const resData = await res.json();
        
        if (!res.ok) throw new Error(resData.error || "Failed to load room");
        setData(resData);
        setLeaderboard(resData.players || []);
        
        // Connect socket
        const socket = getSocket();
        socketRef.current = socket;
        
        const emitHostJoin = () => {
          socket.emit("host_join", { roomCode, hostToken });
        };

        if (socket.connected) {
          emitHostJoin();
        }
        socket.on("connect", emitHostJoin);
        socket.on("reconnect", emitHostJoin);
        
        // Synchronize full roster directly from server
        socket.on("roster_sync", ({ players }: any) => {
          if (Array.isArray(players)) {
            setLeaderboard(players);
          }
        });

        // New player joined or reconnected
        socket.on("player_joined", ({ player }: any) => {
          sounds.playLockIn();
          toast.info(`${player.displayName} connected`);
          setLeaderboard((prev) => {
            const numId = Number(player.id);
            const exists = prev.find((p) => Number(p.id) === numId);
            if (exists) {
              return prev.map((p) => (Number(p.id) === numId ? { ...p, ...player, connected: true } : p));
            }
            return [...prev, player];
          });
        });

        // Player disconnected
        socket.on("player_disconnected", ({ playerId }: any) => {
          const numId = Number(playerId);
          setLeaderboard((prev) =>
            prev.map((p) => (Number(p.id) === numId ? { ...p, connected: false } : p))
          );
        });

        // Player ready toggle
        socket.on("player_ready_changed", ({ playerId, ready, player }: any) => {
          sounds.playLockIn();
          const numId = Number(playerId);
          setLeaderboard((prev) => {
            const exists = prev.find((p) => Number(p.id) === numId);
            if (exists) {
              return prev.map((p) => (Number(p.id) === numId ? { ...p, ready } : p));
            }
            if (player) {
              return [...prev, player];
            }
            return prev;
          });
        });
        
        // Buzzer pressed by player (top 3 locked in queue)
        socket.on("buzz_accepted", ({ playerId, playerName, elapsedMs, position, buzzerQueue, currentAnsweringIndex, currentAnsweringPlayer, remainingTimeMs, buzzerOpen }: any) => {
          sounds.playBuzzer();
          const queue = buzzerQueue || [{ playerId, playerName, elapsedMs, position: position || 1 }];
          const activeIndex = currentAnsweringIndex ?? 0;
          const active = currentAnsweringPlayer || queue[activeIndex] || queue[0];

          setGameState((prev: any) => ({
            ...prev,
            status: "buzzed",
            buzzerWinnerId: active?.playerId || playerId,
            buzzerWinnerName: active?.playerName || playerName,
            buzzDeltaMs: active?.elapsedMs || elapsedMs,
            buzzerQueue: queue,
            currentAnsweringIndex: activeIndex,
            activeContender: active,
            timerRemaining: remainingTimeMs !== undefined ? remainingTimeMs : prev.timerRemaining,
            timerRunning: false,
            buzzerOpen: Boolean(buzzerOpen)
          }));
        });

        // Turn passed to 2nd or 3rd contender after wrong answer
        socket.on("buzzer_passed_to_next", ({ previousPlayerId, activeContender, currentAnsweringIndex, buzzerQueue, halfPoints }: any) => {
          sounds.playLockIn();
          toast.warning(`Turn passed to #${activeContender.position} (${activeContender.playerName}) for 50% points!`);
          setGameState((prev: any) => ({
            ...prev,
            status: "buzzed",
            buzzerWinnerId: activeContender.playerId,
            buzzerWinnerName: activeContender.playerName,
            buzzDeltaMs: activeContender.elapsedMs,
            buzzerQueue: buzzerQueue || prev.buzzerQueue,
            currentAnsweringIndex,
            activeContender,
            halfPoints: halfPoints || 50
          }));
        });

        // Queue exhausted: All buzzed contenders were wrong
        socket.on("buzzer_queue_exhausted", () => {
          sounds.playWrong();
          toast.info("All contenders in queue answered incorrectly. Move to next question or reopen buzzer.");
          setGameState((prev: any) => ({
            ...prev,
            status: "round_done",
            buzzerOpen: false
          }));
          setRevealAnswer(true);
        });

        // Question ended
        socket.on("question_ended", ({ correctAnswer, winnerName, pointsAwarded }: any) => {
          setGameState((prev: any) => ({
            ...prev,
            status: "round_done",
            buzzerOpen: false
          }));
          setRevealAnswer(true);
          if (winnerName) {
            toast.success(`🎉 ${winnerName} won this round (+${pointsAwarded} pts)!`);
          }
        });
        
        // Buzzer reopened
        socket.on("buzzer_reopened", ({ remainingTimeMs }: any) => {
          sounds.playTick();
          setGameState((prev: any) => ({
            ...prev,
            status: "question_active",
            buzzerWinnerId: null,
            buzzerWinnerName: null,
            buzzerQueue: [],
            currentAnsweringIndex: 0,
            activeContender: null,
            timerRemaining: remainingTimeMs,
            timerRunning: true,
            buzzerOpen: true
          }));
        });

        // Score updated
        socket.on("score_updated", ({ playerId, newScore }: any) => {
          setLeaderboard((prev) =>
            prev.map((p) => (p.id === playerId ? { ...p, score: newScore } : p))
          );
        });

        // Player kicked / removed
        socket.on("player_kicked", ({ playerId }: any) => {
          setLeaderboard((prev) => prev.filter((p) => Number(p.id) !== Number(playerId)));
        });
        
      } catch (err: any) {
        toast.error(err.message);
        router.push("/create");
      } finally {
        setLoading(false);
      }
    };
    
    fetchRoom();

    // 2-second dual-sync polling fallback while in lobby to ensure ready states & new players are 100% visible
    const pollInterval = setInterval(async () => {
      const token = hostTokenRef.current;
      if (!token) return;

      try {
        const res = await fetch(`/api/room/${roomCode}?hostToken=${token}`);
        if (!res.ok) return;
        const resData = await res.json();
        if (resData?.players && Array.isArray(resData.players)) {
          setLeaderboard((prev) => {
            const playerMap = new Map<number, any>();
            resData.players.forEach((p: any) => {
              playerMap.set(Number(p.id), { ...p, id: Number(p.id) });
            });
            // Merge existing local states if socket marked them connected
            prev.forEach((oldP: any) => {
              const numId = Number(oldP.id);
              if (playerMap.has(numId)) {
                const fresh = playerMap.get(numId);
                playerMap.set(numId, {
                  ...fresh,
                  connected: oldP.connected !== undefined ? oldP.connected : fresh.connected
                });
              }
            });
            return Array.from(playerMap.values());
          });
        }
      } catch {
        // silent polling catch
      }
    }, 1000);

    // Timer countdown ticker
    timerInterval = setInterval(() => {
      setGameState((prev: any) => {
        if (prev.timerRunning && prev.timerRemaining > 0) {
          const next = Math.max(0, prev.timerRemaining - 100);
          if (next <= 3000 && next > 0 && Math.floor(next) % 1000 < 100) {
            sounds.playTick();
          }
          if (next === 0) {
            sounds.playWrong();
            return { ...prev, timerRemaining: 0, timerRunning: false, buzzerOpen: false };
          }
          return { ...prev, timerRemaining: next };
        }
        return prev;
      });
    }, 100);

    return () => {
      clearInterval(timerInterval);
      clearInterval(pollInterval);
      if (socketRef.current) {
        socketRef.current.off("roster_sync");
        socketRef.current.off("player_joined");
        socketRef.current.off("player_disconnected");
        socketRef.current.off("player_ready_changed");
        socketRef.current.off("player_kicked");
        socketRef.current.off("buzz_accepted");
        socketRef.current.off("buzzer_reopened");
        socketRef.current.off("score_updated");
      }
    };
  }, [roomCode, router]);

  const toggleSound = () => {
    const s = sounds.toggleSound();
    setSoundOn(s);
  };

  const copyJoinUrl = () => {
    const url = `${typeof window !== "undefined" ? window.location.origin : ""}/join/${roomCode}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    toast.success("Player Join Link copied!");
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const kickPlayer = (playerId: number, displayName: string) => {
    if (!confirm(`Remove "${displayName}" from this session?`)) return;
    const socket = socketRef.current || getSocket();
    socket.emit("kick_player", {
      roomCode,
      playerId,
      hostToken: hostTokenRef.current
    });
    setLeaderboard((prev) => prev.filter((p) => Number(p.id) !== Number(playerId)));
    toast.info(`Removed ${displayName}`);
  };

  const handleReadyAll = async () => {
    sounds.playLockIn();
    const token = hostTokenRef.current;
    const socket = socketRef.current || getSocket();
    socket.emit("host_ready_all", { roomCode, hostToken: token });

    setLeaderboard((prev) => prev.map((p) => ({ ...p, ready: true })));

    try {
      const res = await fetch("/api/room/ready-all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomCode, hostToken: token })
      });
      if (res.ok) {
        toast.success("All contenders marked ready!");
      }
    } catch (err) {
      console.warn("Ready all REST notice:", err);
    }
  };

  const startQuestion = (index: number) => {
    if (!data?.questions || index >= data.questions.length) return;
    
    const q = data.questions[index];
    setCurrentQIndex(index);
    setRevealAnswer(false);
    
    const durationMs = (q.timerSeconds || 15) * 1000;
    
    setGameState({
      status: "question_active",
      timerRemaining: durationMs,
      timerRunning: true,
      buzzerWinnerId: null,
      buzzerWinnerName: null,
      buzzDeltaMs: 0,
      buzzerOpen: true,
      buzzerQueue: [],
      currentAnsweringIndex: 0,
      activeContender: null,
      halfPoints: Math.round(((q.pointsCorrect || q.points || 100)) / 2)
    });

    const s = socketRef.current || getSocket();
    s.emit("start_question", {
      roomCode,
      questionId: q.id,
      durationMs,
      hostToken: hostTokenRef.current
    });

    // Dual-sync fallback via REST API to guarantee question launch even if socket drops
    fetch("/api/room/start-question", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        roomCode,
        questionId: q.id,
        durationMs,
        hostToken: hostTokenRef.current
      })
    }).catch((err) => {
      console.warn("REST start-question fallback notice:", err);
    });
  };

  const toggleTimer = () => {
    setGameState((prev: any) => ({ ...prev, timerRunning: !prev.timerRunning }));
    sounds.playTick();
  };

  const handleJudge = (correct: boolean) => {
    const q = data.questions[currentQIndex];
    const isHalf = (gameState.currentAnsweringIndex || 0) >= 1;
    const presetPoints = q?.pointsCorrect || q?.points || 100;
    const points = isHalf ? Math.round(presetPoints / 2) : presetPoints;
    const penaltyPoints = q?.pointsWrong ?? (data?.room?.settings?.penaltyPoints ?? 50);

    const activeId = gameState.activeContender?.playerId || gameState.buzzerWinnerId;

    if (correct) {
      sounds.playCorrect();
      toast.success(`✓ Correct! Awarded ${points} points to ${gameState.buzzerWinnerName}!`);
    } else {
      sounds.playWrong();
      toast.error(`✕ Wrong! Deducted ${penaltyPoints} points.`);
    }

    socketRef.current?.emit("judge_answer", {
      roomCode,
      playerId: activeId,
      correct,
      pointsAwarded: points,
      hostToken: hostTokenRef.current
    });

    if (correct) {
      setGameState((prev: any) => ({ ...prev, status: "round_done", buzzerOpen: false }));
      setRevealAnswer(true);
    }
  };

  const handleReopenBuzzer = () => {
    sounds.playTick();
    socketRef.current?.emit("reopen_buzzer", { 
      roomCode,
      hostToken: hostTokenRef.current
    });
  };

  const handleNextQuestion = () => {
    if (currentQIndex + 1 < data.questions.length) {
      startQuestion(currentQIndex + 1);
    } else {
      handleEndGame();
    }
  };

  const handleEndGame = () => {
    sounds.playCorrect();
    socketRef.current?.emit("finish_game", { 
      roomCode,
      hostToken: hostTokenRef.current
    });
    router.push(`/results/${roomCode}`);
  };

  const handleKickPlayer = (playerId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    sounds.playTick();
    socketRef.current?.emit("kick_player", { 
      roomCode, 
      playerId,
      hostToken: hostTokenRef.current
    });
    setLeaderboard((prev) => prev.filter((p) => p.id !== playerId));
    toast.info("Contender removed from room");
  };

  if (loading || !data) {
    return (
      <div className="min-h-screen bg-[#070b14] text-white flex flex-col items-center justify-center gap-3">
        <Zap className="w-10 h-10 text-cyan-400 animate-pulse" />
        <span className="font-heading font-semibold text-slate-400">Loading Host Arena...</span>
      </div>
    );
  }

  const joinUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/join/${roomCode}`;
  const currentQuestion = data.questions[currentQIndex];
  const sortedPlayers = [...leaderboard].sort((a, b) => (b.score || 0) - (a.score || 0));

  return (
    <div className={`min-h-screen bg-[#070b14] text-[#dfe2f1] flex flex-col ${projectorMode ? "p-6" : ""}`}>
      {/* HOST MASTER HEADER */}
      <header className="sticky top-0 z-50 bg-[#070b14]/90 backdrop-blur-xl border-b border-slate-800/80 px-4 lg:px-8 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Logo & Room PIN */}
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-400 flex items-center justify-center shadow-lg">
                <Zap className="w-5 h-5 text-white fill-white" />
              </div>
              <span className="font-heading font-extrabold text-xl text-white hidden sm:inline">
                Buzz<span className="text-cyan-400">Arena</span>
              </span>
            </Link>

            {/* Room PIN Pill with click to copy */}
            <button
              onClick={copyJoinUrl}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900 border border-slate-700/80 text-xs font-mono font-bold hover:border-slate-500 transition shadow-inner"
              title="Click to copy join link"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-slate-400 font-sans">PIN:</span>
              <span className="text-white tracking-widest text-sm">{roomCode}</span>
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
            </button>

            {/* Contenders badge */}
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs text-slate-300">
              <Users className="w-3.5 h-3.5 text-cyan-400" />
              <span className="font-bold">{leaderboard.length}</span> Contenders
            </div>
          </div>

          {/* Action buttons on right */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Projector Mode Toggle */}
            <button
              onClick={() => setProjectorMode(!projectorMode)}
              className={`p-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition ${
                projectorMode
                  ? "bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.3)]"
                  : "bg-slate-900 border-slate-800 text-slate-300 hover:text-white"
              }`}
              title="Toggle Projector Display Mode"
            >
              <Monitor className="w-4 h-4" />
              <span className="hidden sm:inline">Projector</span>
            </button>

            {/* QR Code Modal Toggle */}
            <button
              onClick={() => setShowQR(!showQR)}
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white transition"
              title="Show Join QR Code"
            >
              <QrCode className="w-4 h-4" />
            </button>

            {/* Sound Toggle */}
            <button
              onClick={toggleSound}
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white transition"
              title={soundOn ? "Mute sounds" : "Enable sounds"}
            >
              {soundOn ? <Volume2 className="w-4 h-4 text-cyan-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
            </button>

            <button
              onClick={handleEndGame}
              className="px-3 py-1.5 rounded-xl bg-red-600/20 border border-red-500/30 text-red-400 hover:bg-red-600/30 text-xs font-bold transition cursor-pointer"
            >
              End Game
            </button>
          </div>
        </div>
      </header>

      {/* QR CODE & JOIN URL OVERLAY MODAL */}
      {showQR && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0d1322] border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-xl w-full text-center sm:text-left relative animate-in zoom-in-95 shadow-2xl">
            <button
              onClick={() => setShowQR(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white text-lg font-bold p-1 cursor-pointer"
            >
              ✕
            </button>
            
            <h3 className="font-heading font-extrabold text-2xl text-white mb-1">
              Join Buzzer Arena
            </h3>
            <p className="text-slate-400 text-xs mb-6">
              Contenders can scan the QR code with any phone camera or open the direct join link in any browser.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center">
              {/* QR Code */}
              <div className="flex flex-col items-center justify-center bg-slate-900/80 p-5 rounded-2xl border border-slate-800">
                <div className="bg-white p-3.5 rounded-2xl shadow-xl">
                  <QRCode value={joinUrl} size={175} />
                </div>
                <span className="text-[11px] text-slate-400 mt-2.5 font-medium">Point phone camera to join</span>
              </div>

              {/* Direct Join Link & PIN Details */}
              <div className="space-y-4">
                <div>
                  <span className="text-xs uppercase tracking-wider text-slate-400 font-bold block mb-1">
                    Tournament Game PIN
                  </span>
                  <div className="font-mono font-black text-4xl text-cyan-400 tracking-widest bg-slate-900/90 py-2 px-4 rounded-xl border border-slate-800 text-center">
                    {roomCode}
                  </div>
                </div>

                <div>
                  <span className="text-xs uppercase tracking-wider text-slate-400 font-bold block mb-1">
                    Direct Join URL
                  </span>
                  <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl text-xs font-mono text-cyan-300 break-all select-all">
                    {joinUrl}
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={copyJoinUrl}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer"
                  >
                    {copiedLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedLink ? "Copied!" : "Copy Link"}</span>
                  </button>

                  <a
                    href={joinUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="py-2.5 px-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition"
                    title="Open join page in new tab"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>Open</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MAIN HOST ARENA CONTENT */}
      <main className={`flex-1 w-full mx-auto p-4 lg:p-6 grid grid-cols-1 ${projectorMode ? "max-w-5xl" : "max-w-7xl lg:grid-cols-12"} gap-6 items-start`}>
        {/* COMMAND DECK / QUESTION STAGE */}
        <div className={projectorMode ? "w-full flex flex-col gap-6" : "lg:col-span-8 flex flex-col gap-6"}>
          {/* STAGE 1: LOBBY WAITING ROOM */}
          {gameState.status === "lobby" ? (
            <div className="bg-[#0d1322]/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl text-center relative overflow-hidden">
              <div className="w-16 h-16 rounded-2xl bg-blue-600/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center mx-auto mb-4 shadow-[0_0_30px_rgba(6,182,212,0.2)]">
                <Users className="w-8 h-8" />
              </div>
              <h2 className="font-heading font-extrabold text-2xl sm:text-4xl text-white mb-2">
                {data.quiz.title}
              </h2>
              <p className="text-slate-400 text-sm max-w-md mx-auto mb-8">
                Contenders can scan the QR code or visit the live join URL below. Once your players are ready, launch Question 1!
              </p>

              {/* Central QR Code & Live Join URL Display */}
              <div className="p-6 rounded-3xl bg-slate-900/70 border border-slate-800 max-w-xl mx-auto mb-8 shadow-xl">
                <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                  {/* High Quality QR */}
                  <div className="bg-white p-3.5 rounded-2xl shadow-xl shrink-0">
                    <QRCode value={joinUrl} size={140} />
                  </div>
                  
                  {/* URL and PIN Details */}
                  <div className="text-center sm:text-left flex flex-col gap-2 w-full">
                    <div>
                      <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">GAME ROOM PIN</span>
                      <div className="font-mono font-black text-3xl sm:text-4xl text-cyan-400 tracking-widest">
                        {roomCode}
                      </div>
                    </div>

                    <div>
                      <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold block mb-1">JOIN URL</span>
                      <div className="p-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-xs font-mono text-cyan-300 break-all select-all">
                        {joinUrl}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={copyJoinUrl}
                        className="flex-1 py-2 px-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                      >
                        {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedLink ? "Link Copied!" : "Copy Join URL"}</span>
                      </button>

                      <a
                        href={joinUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-xs flex items-center justify-center gap-1.5 transition"
                        title="Open in new window"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Open</span>
                      </a>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                  <span>Questions in Deck: <strong className="text-white">{data.questions.length}</strong></span>
                  <span>Joined Contenders: <strong className="text-cyan-400">{leaderboard.length}</strong></span>
                </div>
              </div>

              {/* LIVE LOBBY CONTENDERS ROSTER */}
              <div className="w-full max-w-xl mx-auto mb-8 text-left bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 sm:p-5">
                <div className="flex items-center justify-between mb-3 border-b border-slate-800/80 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                      Joined Contenders ({leaderboard.length})
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {leaderboard.length > 0 && leaderboard.filter((p) => p.ready).length < leaderboard.length && (
                      <button
                        type="button"
                        onClick={handleReadyAll}
                        className="px-2.5 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-[11px] font-bold transition cursor-pointer flex items-center gap-1"
                        title="Mark all contenders ready"
                      >
                        <Zap className="w-3 h-3 fill-cyan-300" />
                        <span>Ready All</span>
                      </button>
                    )}
                    <span className={`text-xs font-semibold ${leaderboard.length > 0 && leaderboard.filter((p) => p.ready).length === leaderboard.length ? "text-emerald-400 font-bold" : "text-amber-400"}`}>
                      {leaderboard.filter((p) => p.ready).length} / {leaderboard.length} Ready
                    </span>
                  </div>
                </div>

                {leaderboard.length === 0 ? (
                  <div className="py-6 text-center text-slate-500 text-xs">
                    <Users className="w-6 h-6 mx-auto mb-2 opacity-30 animate-pulse text-cyan-400" />
                    <span>No contenders joined yet. Waiting for players to enter PIN <strong className="text-cyan-400 font-mono">{roomCode}</strong></span>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-56 overflow-y-auto pr-1">
                    {leaderboard.map((player: any) => {
                      const isReady = !!player.ready;
                      const isOffline = player.connected === false;
                      return (
                        <div
                          key={player.id}
                          className={`group relative flex items-center justify-between p-2.5 rounded-xl border text-xs transition-all ${
                            isOffline
                              ? "bg-slate-950/40 border-slate-800/50 opacity-60 text-slate-500"
                              : isReady
                              ? "bg-emerald-950/40 border-emerald-500/50 text-white shadow-[0_0_12px_rgba(16,185,129,0.15)] ring-1 ring-emerald-500/30"
                              : "bg-slate-900/90 border-slate-800 text-slate-300"
                          }`}
                        >
                          <span className="font-heading font-bold truncate mr-1.5" title={player.displayName}>
                            {player.displayName}
                          </span>
                          <div className="flex items-center gap-1 shrink-0">
                            {isOffline ? (
                              <span className="text-[10px] text-slate-500 font-medium">Off</span>
                            ) : isReady ? (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30">
                                Ready ✓
                              </span>
                            ) : (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-400 font-medium animate-pulse">
                                Wait...
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                kickPlayer(player.id, player.displayName);
                              }}
                              className="opacity-0 group-hover:opacity-100 hover:text-red-400 p-0.5 text-slate-500 transition cursor-pointer"
                              title="Remove player"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Start Quiz Action Button with Supreme Host Control */}
              {(() => {
                const totalPlayers = leaderboard.length;
                const readyPlayers = leaderboard.filter((p) => Boolean(p.ready));
                const readyCount = readyPlayers.length;
                const allReady = totalPlayers > 0 && readyCount === totalPlayers;
                const hasQuestions = (data.questions?.length || 0) > 0;

                return (
                  <div className="flex flex-col items-center gap-3 w-full max-w-lg mx-auto">
                    {allReady && totalPlayers > 0 ? (
                      <button
                        onClick={() => startQuestion(0)}
                        className="w-full inline-flex items-center justify-center gap-3 px-8 py-5 rounded-2xl font-heading font-black text-lg sm:text-xl transition-all select-none bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 text-slate-950 shadow-[0_0_40px_rgba(16,185,129,0.5)] hover:scale-105 active:scale-95 cursor-pointer ring-2 ring-emerald-400"
                      >
                        <Play className="w-6 h-6 fill-slate-950" />
                        <span>START QUIZ (ALL {totalPlayers} READY!)</span>
                      </button>
                    ) : totalPlayers > 0 ? (
                      <button
                        onClick={() => startQuestion(0)}
                        className="w-full inline-flex items-center justify-center gap-3 px-8 py-5 rounded-2xl font-heading font-black text-lg sm:text-xl transition-all select-none bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 text-white shadow-[0_0_35px_rgba(37,99,235,0.4)] hover:shadow-[0_0_45px_rgba(37,99,235,0.6)] hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                      >
                        <Play className="w-6 h-6 fill-white" />
                        <span>START QUIZ NOW ({readyCount}/{totalPlayers} READY)</span>
                      </button>
                    ) : (
                      <button
                        disabled={!hasQuestions}
                        onClick={() => startQuestion(0)}
                        className="w-full inline-flex items-center justify-center gap-3 px-8 py-5 rounded-2xl font-heading font-black text-lg sm:text-xl transition-all select-none bg-slate-800/80 border border-slate-700/80 text-slate-400 hover:text-white hover:border-slate-500 cursor-pointer disabled:cursor-not-allowed"
                      >
                        <Users className="w-6 h-6 text-cyan-400" />
                        <span>LAUNCH QUESTION 1 (0 CONTENDERS)</span>
                      </button>
                    )}

                    {totalPlayers > 0 && !allReady && (
                      <p className="text-xs text-amber-400/90 font-medium text-center">
                        Contenders are locking in ({readyCount}/{totalPlayers}). You can launch now or wait for everyone!
                      </p>
                    )}

                    {allReady && totalPlayers > 0 && (
                      <p className="text-xs text-emerald-400 font-semibold flex items-center justify-center gap-1.5 animate-bounce">
                        <CheckCircle2 className="w-4 h-4" />
                        All contenders are ready! Click above to launch Question 1.
                      </p>
                    )}

                    {!hasQuestions && (
                      <p className="text-xs text-red-400 font-semibold flex items-center justify-center gap-1.5">
                        <AlertCircle className="w-4 h-4" />
                        No questions in deck. Add questions to start the quiz.
                      </p>
                    )}
                  </div>
                );
              })()}
            </div>
          ) : (
            /* STAGE 2: LIVE QUESTION COMMAND CENTER */
            <div className="bg-[#0d1322]/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl relative">
              {/* Question Header Status */}
              <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-800/80">
                <div className="flex items-center gap-3">
                  <span className="px-3 py-1 rounded-full bg-blue-900/40 text-cyan-300 border border-blue-700/50 text-xs font-bold uppercase tracking-wider">
                    Question {currentQIndex + 1} of {data.questions.length}
                  </span>
                  <span className="text-xs font-semibold text-slate-400">
                    {currentQuestion?.points || currentQuestion?.pointsCorrect || 100} Pts
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold ${
                    gameState.status === "buzzed" 
                      ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                      : gameState.buzzerOpen 
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                        : "bg-slate-800 text-slate-400"
                  }`}>
                    <span className={`w-2 h-2 rounded-full ${gameState.buzzerOpen ? "bg-emerald-400 animate-pulse" : "bg-amber-400"}`} />
                    <span>{gameState.status === "buzzed" ? "BUZZ LOCKED" : gameState.buzzerOpen ? "BUZZER OPEN" : "PAUSED"}</span>
                  </div>
                </div>
              </div>

              {/* Live Question Headline + Timer */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 mb-8">
                <h2 className="font-heading font-extrabold text-2xl sm:text-3xl text-white leading-tight flex-1">
                  {currentQuestion?.questionText || currentQuestion?.question}
                </h2>

                {/* Circular Countdown Ring */}
                <div className="relative w-20 h-20 flex-shrink-0 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 64 64">
                    <circle cx="32" cy="32" r="26" fill="none" stroke="#1e293b" strokeWidth="4" />
                    <circle
                      cx="32"
                      cy="32"
                      r="26"
                      fill="none"
                      stroke="#06b6d4"
                      strokeWidth="4"
                      strokeDasharray="163.36"
                      strokeDashoffset={163.36 - (163.36 * (gameState.timerRemaining / ((currentQuestion?.timerSeconds || 15) * 1000)))}
                      strokeLinecap="round"
                      className="radial-timer-ring"
                    />
                  </svg>
                  <span className="absolute font-mono font-black text-xl text-white">
                    {Math.ceil(gameState.timerRemaining / 1000)}s
                  </span>
                </div>
              </div>

              {/* Options Matrix (if Multiple Choice) OR Verbal Projector Display */}
              {currentQuestion?.options && Array.isArray(currentQuestion.options) && currentQuestion.options.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
                  {currentQuestion.options.map((opt: string, i: number) => {
                    const letter = ["A", "B", "C", "D"][i] || `${i + 1}`;
                    const isCorrect = revealAnswer && opt === currentQuestion.correctAnswer;
                    return (
                      <div
                        key={i}
                        className={`flex items-center gap-3 p-4 rounded-2xl border transition-all ${
                          isCorrect
                            ? "bg-emerald-950/60 border-emerald-500/80 text-white shadow-[0_0_20px_rgba(16,185,129,0.3)]"
                            : "bg-slate-900/60 border-slate-800 text-slate-300"
                        }`}
                      >
                        <span className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-sm ${
                          isCorrect ? "bg-emerald-600 text-white" : "bg-slate-800 text-slate-400"
                        }`}>
                          {letter}
                        </span>
                        <span className="font-semibold text-base truncate">{opt}</span>
                        {isCorrect && <Check className="w-5 h-5 text-emerald-400 ml-auto" />}
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* Verbal Fast-Buzz Mode Projector Banner */
                <div className="p-4 rounded-2xl bg-cyan-950/30 border border-cyan-500/40 text-cyan-200 mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 flex items-center justify-center shrink-0">
                      <Zap className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-heading font-bold text-sm text-white flex items-center gap-2">
                        <span>Verbal Fast-Buzz Question</span>
                        <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30">
                          Projector Only
                        </span>
                      </h4>
                      <p className="text-xs text-slate-400">
                        Player devices display only buzzers. Top 3 contenders lock in; active contender speaks answer verbally.
                      </p>
                    </div>
                  </div>
                  <div className="p-2.5 px-3.5 rounded-xl bg-slate-900/90 border border-slate-800 shrink-0">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Host Answer Key</span>
                    <span className="text-emerald-400 font-bold text-sm sm:text-base font-mono">
                      {currentQuestion?.correctAnswer || "Refer to question sheet"}
                    </span>
                  </div>
                </div>
              )}

              {/* BUZZER LOCK-IN BANNER & TOP-3 QUEUE REFEREE CONTROLS */}
              {gameState.status === "buzzed" ? (
                <div className="p-5 rounded-2xl bg-amber-950/30 border-2 border-amber-500/60 shadow-[0_0_30px_rgba(245,158,11,0.2)] mb-6 animate-in zoom-in-95 space-y-4">
                  {/* Active Contender Header */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center shadow-lg shrink-0">
                        <Crown className="w-6 h-6 animate-bounce" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-heading font-extrabold text-xl text-white">
                            {gameState.buzzerWinnerName}
                          </span>
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            (gameState.currentAnsweringIndex || 0) === 0
                              ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                              : "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                          }`}>
                            {(gameState.currentAnsweringIndex || 0) === 0 ? "BUZZED #1 (FULL POINTS)" : `BUZZED #${(gameState.currentAnsweringIndex || 0) + 1} (50% POINTS)`}
                          </span>
                        </div>
                        <span className="font-mono text-xs text-cyan-400">
                          Reaction speed: {(gameState.buzzDeltaMs / 1000).toFixed(3)}s
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => setRevealAnswer(!revealAnswer)}
                      className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5"
                    >
                      {revealAnswer ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      <span>{revealAnswer ? "Hide Correct Answer" : "Show Correct Answer"}</span>
                    </button>
                  </div>

                  {/* Top-3 Locked Queue Indicators */}
                  {gameState.buzzerQueue && gameState.buzzerQueue.length > 0 && (
                    <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 block">
                        Locked Buzzer Queue (Top 3):
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        {gameState.buzzerQueue.map((entry: any, qIdx: number) => {
                          const isActive = qIdx === (gameState.currentAnsweringIndex || 0);
                          const isPast = qIdx < (gameState.currentAnsweringIndex || 0);
                          return (
                            <div
                              key={entry.playerId}
                              className={`p-2.5 rounded-xl border flex items-center justify-between text-xs ${
                                isActive
                                  ? "bg-amber-500/20 border-amber-400 text-white font-bold ring-1 ring-amber-400"
                                  : isPast
                                    ? "bg-red-950/30 border-red-500/30 text-slate-500 line-through"
                                    : "bg-slate-900 border-slate-800 text-slate-300"
                              }`}
                            >
                              <div className="flex items-center gap-2 truncate">
                                <span className={`w-5 h-5 rounded-md flex items-center justify-center font-bold text-[10px] ${
                                  isActive ? "bg-amber-400 text-slate-950" : "bg-slate-800 text-slate-400"
                                }`}>
                                  #{entry.position}
                                </span>
                                <span className="truncate">{entry.playerName}</span>
                              </div>
                              <span className="text-[10px] font-mono text-cyan-400 shrink-0">
                                {entry.position === 1 ? "100% pts" : "50% pts"}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {revealAnswer && (
                    <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 text-sm">
                      <span className="text-slate-400 font-semibold">Correct Answer: </span>
                      <span className="text-emerald-400 font-bold">{currentQuestion?.correctAnswer}</span>
                    </div>
                  )}

                  {/* Referee Decision Controls */}
                  {(() => {
                    const isHalf = (gameState.currentAnsweringIndex || 0) >= 1;
                    const presetPts = currentQuestion?.pointsCorrect || currentQuestion?.points || 100;
                    const awardPts = isHalf ? Math.round(presetPts / 2) : presetPts;
                    const penaltyPts = currentQuestion?.pointsWrong ?? (data?.room?.settings?.penaltyPoints ?? 50);

                    return (
                      <div className="space-y-3 pt-2">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <button
                            onClick={() => handleJudge(true)}
                            className="h-13 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-heading font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 transition active:scale-95 cursor-pointer"
                          >
                            <CheckCircle2 className="w-5 h-5" />
                            <span>CORRECT (+{awardPts} PTS{isHalf ? " - 50%" : ""})</span>
                          </button>

                          <button
                            onClick={() => handleJudge(false)}
                            className="h-13 rounded-xl bg-red-600/20 hover:bg-red-600/30 border border-red-500/40 text-red-300 font-heading font-bold text-sm flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer"
                          >
                            <XCircle className="w-5 h-5" />
                            <span>WRONG (-{penaltyPts} PTS)</span>
                          </button>

                          <button
                            onClick={handleReopenBuzzer}
                            className="h-13 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-heading font-semibold text-sm flex items-center justify-center gap-2 transition cursor-pointer"
                          >
                            <RotateCcw className="w-4 h-4" />
                            <span>REOPEN BUZZER</span>
                          </button>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-amber-500/20">
                          <span className="text-xs text-slate-400">
                            Move immediately to next question?
                          </span>
                          <button
                            onClick={handleNextQuestion}
                            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 hover:text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer border border-slate-700 hover:border-cyan-500/40"
                          >
                            <span>{currentQIndex + 1 < data.questions.length ? "Next Question" : "Finish Quiz"}</span>
                            <SkipForward className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              ) : (
                /* Timer & Skip Controls when buzzer is armed */
                <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-slate-900/60 border border-slate-800 mb-6">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={toggleTimer}
                      className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs flex items-center gap-1.5 transition"
                    >
                      {gameState.timerRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                      <span>{gameState.timerRunning ? "Pause Timer" : "Resume Timer"}</span>
                    </button>

                    <button
                      onClick={() => setRevealAnswer(!revealAnswer)}
                      className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-medium text-xs flex items-center gap-1.5 transition"
                    >
                      {revealAnswer ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      <span>{revealAnswer ? "Hide Answer" : "Peek Answer"}</span>
                    </button>
                  </div>

                  <button
                    onClick={handleNextQuestion}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-bold text-xs flex items-center gap-2 shadow-md hover:scale-105 transition"
                  >
                    <span>{currentQIndex + 1 < data.questions.length ? "Next Question" : "Finish Quiz"}</span>
                    <SkipForward className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Reveal answer banner if toggled */}
              {revealAnswer && gameState.status !== "buzzed" && (
                <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 text-sm mb-4">
                  <span className="text-slate-400 font-semibold">Answer: </span>
                  <span className="text-emerald-400 font-bold">{currentQuestion?.correctAnswer}</span>
                  {currentQuestion?.explanation && (
                    <p className="text-xs text-slate-400 mt-1">{currentQuestion.explanation}</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* RIGHT 4 COLS: LEADERBOARD & ARENA ROSTER */}
        <div className={`${projectorMode ? "hidden" : "lg:col-span-4"} bg-[#0d1322]/90 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl backdrop-blur-xl`}>
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-400" />
              <h3 className="font-heading font-extrabold text-base text-white">Live Leaderboard</h3>
            </div>
            <span className="text-xs font-mono text-cyan-400 font-bold">{sortedPlayers.length} Active</span>
          </div>

          {/* Player list */}
          {sortedPlayers.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-xs">
              Waiting for contenders to join with code <span className="font-mono text-cyan-400 font-bold">{roomCode}</span>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5 max-h-[500px] overflow-y-auto pr-1">
              {sortedPlayers.map((player: any, idx: number) => {
                const isTop1 = idx === 0 && (player.score || 0) > 0;
                return (
                  <div
                    key={player.id}
                    className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${
                      isTop1
                        ? "bg-amber-500/10 border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.15)]"
                        : "bg-slate-900/50 border-slate-800"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        idx === 0 ? "bg-amber-500 text-slate-950" : idx === 1 ? "bg-slate-400 text-slate-950" : idx === 2 ? "bg-amber-700 text-white" : "bg-slate-800 text-slate-400"
                      }`}>
                        {idx + 1}
                      </span>
                      <div className="flex flex-col">
                        <span className="font-heading font-bold text-sm text-white truncate max-w-[140px]">
                          {player.displayName}
                        </span>
                        <div className="flex items-center gap-1.5">
                          {player.connected === false ? (
                            <span className="text-[10px] text-slate-500 font-semibold flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-600 inline-block" /> Offline
                            </span>
                          ) : player.ready && gameState.status === "lobby" ? (
                            <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse" /> Ready
                            </span>
                          ) : (
                            <span className="text-[10px] text-cyan-400/80 font-semibold flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" /> Live
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="font-heading font-bold text-cyan-400 text-sm">
                        {player.score || 0} pts
                      </div>
                      <button
                        onClick={(e) => handleKickPlayer(player.id, e)}
                        className="p-1 rounded-md text-slate-500 hover:text-red-400 hover:bg-slate-800 transition"
                        title="Remove contender from match"
                      >
                        <UserX className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
