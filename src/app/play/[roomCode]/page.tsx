"use client";

import { useEffect, useState, useRef, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  Zap, 
  ArrowLeft, 
  Volume2, 
  VolumeX, 
  Clock, 
  Crown, 
  CheckCircle2, 
  Lock, 
  AlertCircle,
  HelpCircle,
  Vibrate,
  Radio
} from "lucide-react";
import { toast } from "sonner";
import { getSocket } from "@/lib/socket";
import { sounds } from "@/lib/sound";

export default function PlayerDashboard({ params }: { params: Promise<{ roomCode: string }> }) {
  const router = useRouter();
  const { roomCode } = use(params);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const socketRef = useRef<any>(null);
  const playerTokenRef = useRef<string | null>(null);
  const [ready, setReady] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  
  // Realtime game state
  const [gameState, setGameState] = useState<any>({
    status: "lobby", // lobby, active, won_buzz, queued_2, queued_3, locked, eliminated, round_over
    currentQuestion: null,
    buzzerWinnerId: null,
    buzzerWinnerName: null,
    myPosition: null,
    buzzerQueue: [],
    currentAnsweringIndex: 0,
    activeContender: null,
    halfPoints: 50,
    timerRemaining: 0,
    myBuzzTime: null,
    rank: 1,
    revealedAnswer: null
  });

  const [buzzDisabled, setBuzzDisabled] = useState(false);
  const gameStateRef = useRef(gameState);
  gameStateRef.current = gameState;

  useEffect(() => {
    let timerInterval: any = null;
    let pollLobbyInterval: any = null;

    const fetchRoom = async () => {
      const searchParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
      const urlToken = searchParams?.get("token");
      const sessionToken = typeof window !== "undefined" ? sessionStorage.getItem(`buzzarena_player_${roomCode}`) : null;
      const localToken = typeof window !== "undefined" ? localStorage.getItem(`buzzarena_player_${roomCode}`) : null;

      const playerToken = urlToken || sessionToken || localToken;
      if (!playerToken) {
        router.push(`/join/${roomCode}`);
        return;
      }
      playerTokenRef.current = playerToken;

      // Persist to current tab's sessionStorage (isolated per tab) and scoped localStorage
      if (typeof window !== "undefined") {
        sessionStorage.setItem(`buzzarena_player_${roomCode}`, playerToken);
        localStorage.setItem(`buzzarena_player_${roomCode}`, playerToken);
        localStorage.setItem(`buzzarena_player_token_${roomCode}_${playerToken}`, playerToken);
        localStorage.removeItem(`buzzarena_player_ready_${roomCode}`); // clean legacy un-scoped key
      }
      
      try {
        const res = await fetch(`/api/room/${roomCode}?playerToken=${playerToken}`);
        const resData = await res.json();
        
        if (!res.ok) throw new Error(resData.error || "Failed to load room");
        
        if (resData.room?.status === "ended") {
          router.push(`/results/${roomCode}`);
          return;
        }

        setData(resData);
        
        // Scope ready cache strictly to this playerToken so multiple tabs never share/corrupt ready state
        const isLocallyReady = typeof window !== "undefined" && (
          localStorage.getItem(`buzzarena_player_ready_${roomCode}_${playerToken}`) === "true" ||
          sessionStorage.getItem(`buzzarena_player_ready_${roomCode}_${playerToken}`) === "true"
        );
        const serverReady = Boolean(resData.currentPlayer?.ready);
        setReady(serverReady || isLocallyReady);

        // If room is already active, immediately transition to active question
        if (resData.room?.status === "active") {
          const qIndex = resData.room.currentQuestionIndex || 0;
          const activeQ = resData.questions?.[qIndex] || resData.questions?.[0];
          if (activeQ) {
            setBuzzDisabled(false);
            setGameState({
              status: "active",
              currentQuestion: activeQ,
              buzzerWinnerId: null,
              buzzerWinnerName: null,
              timerRemaining: (activeQ.timerSeconds || 15) * 1000,
              myBuzzTime: null,
              revealedAnswer: null
            });
          }
        }
        
        // Connect socket
        const socket = getSocket();
        socketRef.current = socket;
        
        const emitJoin = () => {
          socket.emit("join_room", { roomCode, sessionToken: playerToken });
        };

        if (socket.connected) {
          emitJoin();
        }
        socket.on("connect", emitJoin);
        socket.on("reconnect", emitJoin);
        
        // Host started a question
        socket.on("question_started", ({ questionId, question, durationMs }: any) => {
          sounds.playLockIn();
          const q = question || resData.questions?.find((x: any) => x.id === questionId);
          setBuzzDisabled(false);
          setGameState({
            status: "active",
            currentQuestion: q,
            buzzerWinnerId: null,
            buzzerWinnerName: null,
            myPosition: null,
            buzzerQueue: [],
            currentAnsweringIndex: 0,
            activeContender: null,
            timerRemaining: durationMs || 15000,
            myBuzzTime: null,
            revealedAnswer: null
          });
        });
        
        // Contender buzzed (Top 3 locked in queue)
        socket.on("buzz_accepted", ({ playerId, playerName, elapsedMs, position, buzzerQueue, currentAnsweringIndex, currentAnsweringPlayer, remainingTimeMs, buzzerOpen }: any) => {
          const myId = resData.currentPlayer.id;
          const isMe = playerId === myId;
          const queue = buzzerQueue || [];
          const myEntry = queue.find((e: any) => e.playerId === myId);
          const pos = myEntry ? myEntry.position : (isMe ? position : null);
          const activeIndex = currentAnsweringIndex ?? 0;
          const active = currentAnsweringPlayer || queue[activeIndex] || queue[0];

          if (isMe) {
            sounds.playCorrect();
            if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
            if (pos === 1) toast.success("⚡ You buzzed #1! State your answer verbally to the host!");
            else toast.success(`⚡ You buzzed #${pos}! Locked in top 3 queue.`);
          } else {
            sounds.playLockIn();
          }

          setGameState((prev: any) => {
            let nextStatus = prev.status;
            if (myEntry || isMe) {
              if (pos === 1) nextStatus = "won_buzz";
              else if (pos === 2) nextStatus = "queued_2";
              else if (pos === 3) nextStatus = "queued_3";
            } else if (!buzzerOpen || queue.length >= 3) {
              nextStatus = "locked";
            } else {
              nextStatus = "active";
            }

            return {
              ...prev,
              status: nextStatus,
              buzzerWinnerId: active?.playerId || playerId,
              buzzerWinnerName: active?.playerName || playerName,
              myPosition: pos || prev.myPosition,
              buzzerQueue: queue,
              currentAnsweringIndex: activeIndex,
              activeContender: active,
              timerRemaining: remainingTimeMs !== undefined ? remainingTimeMs : prev.timerRemaining,
              myBuzzTime: isMe ? elapsedMs : prev.myBuzzTime
            };
          });
        });

        // Host marked answer wrong and passed turn to 2nd or 3rd contender
        socket.on("buzzer_passed_to_next", ({ previousPlayerId, activeContender, currentAnsweringIndex, buzzerQueue, halfPoints }: any) => {
          const myId = resData.currentPlayer.id;
          const isMyTurnNow = activeContender?.playerId === myId;
          const wasMeIncorrect = previousPlayerId === myId;

          if (isMyTurnNow) {
            sounds.playCorrect();
            if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
            toast.success("🌟 YOUR TURN! State your answer verbally to the host for 50% points!");
          } else if (wasMeIncorrect) {
            sounds.playWrong();
            toast.error("Answer marked incorrect. Penalty points deducted.");
          } else {
            sounds.playLockIn();
          }

          setGameState((prev: any) => ({
            ...prev,
            status: isMyTurnNow ? "won_buzz" : (wasMeIncorrect ? "eliminated" : prev.status),
            buzzerWinnerId: activeContender.playerId,
            buzzerWinnerName: activeContender.playerName,
            currentAnsweringIndex,
            activeContender,
            buzzerQueue: buzzerQueue || prev.buzzerQueue,
            halfPoints
          }));
        });

        // All buzzed contenders in queue answered incorrectly
        socket.on("buzzer_queue_exhausted", ({ correctAnswer }: any) => {
          sounds.playWrong();
          setGameState((prev: any) => ({
            ...prev,
            status: "round_over",
            revealedAnswer: correctAnswer || prev.revealedAnswer
          }));
        });
        
        // Buzzer reopened by host (after incorrect answer or pass)
        socket.on("buzzer_reopened", ({ remainingTimeMs }: any) => {
          sounds.playTick();
          setBuzzDisabled(false);
          setGameState((prev: any) => {
            const wasWinner = prev.status === "won_buzz";
            return {
              ...prev,
              status: wasWinner ? "eliminated" : "active",
              buzzerWinnerId: null,
              buzzerWinnerName: null,
              myPosition: null,
              buzzerQueue: [],
              currentAnsweringIndex: 0,
              activeContender: null,
              timerRemaining: remainingTimeMs
            };
          });
        });

        // Question ended or answer revealed
        socket.on("question_ended", ({ correctAnswer, winnerName, pointsAwarded }: any) => {
          setGameState((prev: any) => ({
            ...prev,
            status: "round_over",
            revealedAnswer: correctAnswer
          }));
          if (winnerName) {
            toast.info(`Round finished! Winner: ${winnerName} (+${pointsAwarded} pts)`);
          }
        });

        // Score update (live updates)
        socket.on("score_updated", ({ playerId, newScore, pointsAwarded }: any) => {
          if (playerId === resData.currentPlayer.id) {
            if (pointsAwarded > 0) {
              sounds.playCorrect();
              toast.success(`+${pointsAwarded} points awarded!`);
            } else if (pointsAwarded < 0) {
              sounds.playWrong();
              toast.error(`${pointsAwarded} points deducted.`);
            }
            setData((prev: any) => ({
              ...prev,
              currentPlayer: { ...prev.currentPlayer, score: newScore }
            }));
          }
        });

        // Game over
        socket.on("game_finished", () => {
          sounds.playCorrect();
          router.push(`/results/${roomCode}`);
        });
        // Player was removed/kicked by host
        socket.on("player_kicked", ({ playerId }: any) => {
          if (playerId === resData.currentPlayer.id) {
            sounds.playWrong();
            toast.error("You were removed from the room by the host");
            localStorage.removeItem(`buzzarena_player_${roomCode}`);
            sessionStorage.removeItem(`buzzarena_player_${roomCode}`);
            if (playerToken) {
              localStorage.removeItem(`buzzarena_player_ready_${roomCode}_${playerToken}`);
              sessionStorage.removeItem(`buzzarena_player_ready_${roomCode}_${playerToken}`);
            }
            router.push("/join");
          }
        });

        // Listen for ready state updates from server / host
        socket.on("player_ready_changed", ({ playerId, ready }: any) => {
          if (resData.currentPlayer && Number(playerId) === Number(resData.currentPlayer.id)) {
            setReady(Boolean(ready));
            if (playerToken) {
              localStorage.setItem(`buzzarena_player_ready_${roomCode}_${playerToken}`, String(ready));
              sessionStorage.setItem(`buzzarena_player_ready_${roomCode}_${playerToken}`, String(ready));
            }
          }
        });

        // Listen for full roster sync from server / host
        socket.on("roster_sync", ({ players }: any) => {
          if (Array.isArray(players) && resData.currentPlayer) {
            const me = players.find((p: any) => Number(p.id) === Number(resData.currentPlayer.id));
            if (me) {
              setReady(Boolean(me.ready));
              if (playerToken) {
                localStorage.setItem(`buzzarena_player_ready_${roomCode}_${playerToken}`, String(me.ready));
                sessionStorage.setItem(`buzzarena_player_ready_${roomCode}_${playerToken}`, String(me.ready));
              }
            }
          }
        });
        
      } catch (err: any) {
        toast.error(err.message);
        router.push("/join");
      } finally {
        setLoading(false);
      }
    };
    
    fetchRoom();

    // Fast polling fallback while in lobby (every 1.0 second) to catch question launch & ready state
    pollLobbyInterval = setInterval(async () => {
      if (gameStateRef.current?.status !== "lobby") return;
      const playerToken = playerTokenRef.current || 
        (typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("token") : null) || 
        (typeof window !== "undefined" ? (sessionStorage.getItem(`buzzarena_player_${roomCode}`) || localStorage.getItem(`buzzarena_player_${roomCode}`)) : null);
      if (!playerToken) return;

      try {
        const res = await fetch(`/api/room/${roomCode}?playerToken=${playerToken}`);
        if (!res.ok) return;
        const freshData = await res.json();

        // Keep ready state synchronized with database
        if (freshData?.currentPlayer?.ready !== undefined) {
          setReady((prev) => prev || Boolean(freshData.currentPlayer.ready));
        }

        if (freshData?.room?.status === "active") {
          const qIndex = freshData.room.currentQuestionIndex || 0;
          const activeQ = freshData.questions?.[qIndex] || freshData.questions?.[0];
          if (activeQ) {
            sounds.playLockIn();
            setBuzzDisabled(false);
            setGameState({
              status: "active",
              currentQuestion: activeQ,
              buzzerWinnerId: null,
              buzzerWinnerName: null,
              timerRemaining: (activeQ.timerSeconds || 15) * 1000,
              myBuzzTime: null,
              revealedAnswer: null
            });
          }
        }
      } catch {
        // silent polling catch
      }
    }, 1000);
    
    // Smooth client countdown timer
    timerInterval = setInterval(() => {
      setGameState((prev: any) => {
        if (prev.status === "active" && prev.timerRemaining > 0) {
          const next = Math.max(0, prev.timerRemaining - 100);
          if (next <= 3000 && next > 0 && Math.floor(next) % 1000 < 100) {
            sounds.playTick();
          }
          return { ...prev, timerRemaining: next };
        }
        return prev;
      });
    }, 100);

    return () => {
      clearInterval(timerInterval);
      clearInterval(pollLobbyInterval);
      if (socketRef.current) {
        socketRef.current.off("question_started");
        socketRef.current.off("buzz_accepted");
        socketRef.current.off("buzzer_passed_to_next");
        socketRef.current.off("buzzer_queue_exhausted");
        socketRef.current.off("buzzer_reopened");
        socketRef.current.off("question_ended");
        socketRef.current.off("score_updated");
        socketRef.current.off("game_finished");
        socketRef.current.off("player_kicked");
        socketRef.current.off("player_ready_changed");
        socketRef.current.off("roster_sync");
      }
    };
  }, [roomCode, router]);

  const toggleSound = () => {
    sounds.unlockAudio();
    const s = sounds.toggleSound();
    setSoundOn(s);
  };

  const [markingReady, setMarkingReady] = useState(false);

  const markReady = async () => {
    if (ready || markingReady) return;
    setMarkingReady(true);
    setReady(true);

    const token = playerTokenRef.current || 
      (typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("token") : null) || 
      (typeof window !== "undefined" ? (sessionStorage.getItem(`buzzarena_player_${roomCode}`) || localStorage.getItem(`buzzarena_player_${roomCode}`)) : null);

    if (token) {
      try {
        localStorage.setItem(`buzzarena_player_ready_${roomCode}_${token}`, "true");
        sessionStorage.setItem(`buzzarena_player_ready_${roomCode}_${token}`, "true");
      } catch {}
    }

    try {
      sounds.unlockAudio();
      sounds.playLockIn();
    } catch {
      // Audio safe
    }

    const socket = socketRef.current || getSocket();
    const playerId = data?.currentPlayer?.id;

    if (socket) {
      try {
        socket.emit("player_ready", {
          roomCode,
          playerId,
          playerToken: token,
          ready: true
        });
      } catch (err) {
        console.warn("Socket player_ready emit warning:", err);
      }
    }

    if (token) {
      try {
        const res = await fetch("/api/player/ready", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            playerToken: token,
            ready: true
          })
        });
        const resJson = await res.json();
        if (resJson?.player?.ready) {
          setReady(true);
        }
      } catch (e) {
        console.error("Player ready fetch error:", e);
      }
    }

    setMarkingReady(false);
    toast.success("Ready! Waiting for host to start.");
  };

  const handleBuzz = () => {
    sounds.unlockAudio();
    if (gameState.status !== "active" || buzzDisabled) return;
    
    // Play instant tactile sound and haptics
    sounds.playBuzzer();
    if (navigator.vibrate) navigator.vibrate(120);

    setBuzzDisabled(true);
    setGameState((prev: any) => ({ ...prev, status: "buzzing" }));
    
    socketRef.current?.emit("buzz", {
      roomCode: roomCode,
      playerId: data.currentPlayer.id
    });
  };

  if (loading || !data) {
    return (
      <div className="min-h-screen bg-[#070b14] text-white flex flex-col items-center justify-center gap-3">
        <Zap className="w-10 h-10 text-cyan-400 animate-pulse" />
        <span className="font-heading font-semibold text-slate-400">Entering BuzzArena...</span>
      </div>
    );
  }

  // LOBBY VIEW
  if (gameState.status === "lobby") {
    return (
      <div 
        className="min-h-[100dvh] h-[100dvh] bg-[#070b14] text-[#dfe2f1] flex flex-col justify-between p-4 sm:p-6 pb-safe pt-safe relative selection:bg-indigo-500 selection:text-white overflow-hidden"
      >
        {/* Glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-80 sm:w-96 h-80 sm:h-96 bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />

        {/* Top bar */}
        <div className="flex justify-between items-center pb-3 sm:pb-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-400 flex items-center justify-center shadow-md">
              <Zap className="w-4 h-4 text-white fill-white" />
            </div>
            <span className="font-heading font-extrabold text-base sm:text-lg text-white">
              Buzz<span className="text-cyan-400">Arena</span>
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button onClick={toggleSound} className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white">
              {soundOn ? <Volume2 className="w-4 h-4 text-cyan-400" /> : <VolumeX className="w-4 h-4" />}
            </button>
            <div className="px-2.5 sm:px-3 py-1 rounded-full bg-slate-900 border border-slate-800 font-mono text-[11px] sm:text-xs text-cyan-400 font-bold">
              PIN {roomCode}
            </div>
          </div>
        </div>

        {/* Center Card */}
        <div className="flex-1 flex flex-col items-center justify-center max-w-sm mx-auto w-full text-center my-auto py-4">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl sm:rounded-3xl bg-slate-900 border border-slate-700/80 flex items-center justify-center text-3xl sm:text-4xl mb-3 sm:mb-4 shadow-xl">
            {data.currentPlayer?.displayName?.split(" ")[0] || "⚡"}
          </div>

          <h1 className="font-heading font-extrabold text-xl sm:text-2xl text-white mb-1 px-2 line-clamp-2">
            {data.quiz?.title || "Live Arena Showdown"}
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm mb-6 sm:mb-8">
            Contender: <span className="text-white font-bold">{data.currentPlayer?.displayName}</span>
          </p>

          {!ready ? (
            <button
              type="button"
              onClick={markReady}
              disabled={ready || markingReady}
              className="w-full h-14 sm:h-16 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 text-white font-heading font-black text-lg sm:text-xl shadow-[0_0_35px_rgba(37,99,235,0.4)] active:scale-95 active:brightness-110 transition-transform cursor-pointer touch-manipulation select-none disabled:opacity-80 flex items-center justify-center gap-2"
            >
              <span>{markingReady ? "LOCKING IN..." : "I'M READY"}</span>
            </button>
          ) : (
            <div className="w-full bg-slate-900/90 border border-emerald-500/40 rounded-2xl p-5 sm:p-6 text-center animate-in zoom-in-95 shadow-[0_0_30px_rgba(16,185,129,0.15)]">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 rounded-full flex items-center justify-center mx-auto mb-2.5 sm:mb-3">
                <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <h3 className="font-heading font-bold text-base sm:text-lg text-emerald-400">Locked & Ready</h3>
              <p className="text-[11px] sm:text-xs text-slate-400 mt-1">Waiting for the host to launch Question 1...</p>
            </div>
          )}
        </div>

        {/* Footer Score Pill */}
        <div className="text-center text-[11px] sm:text-xs text-slate-500 shrink-0">
          Tip: Tap the buzzer immediately when you know the answer!
        </div>
      </div>
    );
  }

  // LIVE IN-GAME VIEW
  const q = gameState.currentQuestion;
  const isVerbal = q?.questionType === "verbal" || q?.type === "verbal" || !q?.options?.length;
  const isWinner = gameState.status === "won_buzz";
  const isQueued2 = gameState.status === "queued_2";
  const isQueued3 = gameState.status === "queued_3";
  const isLocked = gameState.status === "locked";
  const isEliminated = gameState.status === "eliminated";
  const timerSecs = Math.max(0, (gameState.timerRemaining / 1000)).toFixed(1);

  return (
    <div 
      onTouchStart={() => sounds.unlockAudio()}
      onClick={() => sounds.unlockAudio()}
      className="min-h-[100dvh] h-[100dvh] bg-[#070b14] text-[#dfe2f1] flex flex-col justify-between select-none touch-manipulation relative overflow-hidden pb-safe pt-safe"
    >
      {/* Background glow when active vs won */}
      {isWinner ? (
        <div className="absolute inset-0 bg-emerald-500/10 pointer-events-none animate-pulse" />
      ) : isQueued2 || isQueued3 ? (
        <div className="absolute inset-0 bg-cyan-500/10 pointer-events-none" />
      ) : (
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-80 h-80 bg-red-600/10 rounded-full blur-[140px] pointer-events-none" />
      )}

      {/* TOP HUD BAR */}
      <header className="p-2.5 sm:p-4 bg-[#0d1322]/90 border-b border-slate-800/80 backdrop-blur-xl flex items-center justify-between sticky top-0 z-30 shrink-0">
        <div className="flex items-center gap-2 sm:gap-2.5">
          <Link href="/" className="w-8 h-8 rounded-lg bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex flex-col">
            <span className="font-heading font-bold text-xs text-white truncate max-w-[130px] sm:max-w-xs">
              {data.currentPlayer.displayName}
            </span>
            <span className="text-[10px] font-mono text-cyan-400">PIN {roomCode}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Timer capsule */}
          <div className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full bg-slate-900 border border-slate-700 font-mono text-[11px] sm:text-xs font-bold text-white shadow-inner">
            <Clock className={`w-3.5 h-3.5 ${gameState.timerRemaining <= 3000 ? "text-red-400 animate-pulse" : "text-cyan-400"}`} />
            <span className={gameState.timerRemaining <= 3000 ? "text-red-400" : "text-white"}>
              {timerSecs}s
            </span>
          </div>

          <button onClick={toggleSound} className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white">
            {soundOn ? <Volume2 className="w-4 h-4 text-cyan-400" /> : <VolumeX className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* QUESTION DISPLAY: IN VERBAL MODE, DISPLAY ONLY BUZZER STATUS (NO QUESTION/OPTIONS) */}
      {isVerbal ? (
        <div className="px-3 pt-2 pb-1 sm:p-4 max-w-md mx-auto w-full shrink-0">
          <div className="bg-gradient-to-r from-blue-950/50 via-slate-900 to-indigo-950/50 border border-cyan-500/40 rounded-2xl p-3.5 shadow-xl backdrop-blur-md flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 flex items-center justify-center shrink-0">
                <Radio className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-cyan-400 tracking-wider block">Verbal Fast-Buzz Mode</span>
                <p className="text-xs sm:text-sm text-white font-semibold">Watch host projector for the question!</p>
              </div>
            </div>
            <div className="text-right shrink-0">
              <span className="text-[10px] text-slate-400 font-mono block">Top 3 Lock</span>
              <span className="text-amber-400 font-bold text-xs">+{q?.points || q?.pointsCorrect || 100} pts</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="px-3 pt-2 pb-1 sm:p-4 max-w-md mx-auto w-full shrink-0">
          <div className="bg-[#0d1322]/90 border border-slate-800 rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-xl backdrop-blur-md">
            <div className="flex items-center justify-between text-[11px] sm:text-xs text-slate-400 font-semibold mb-1">
              <span className="text-cyan-400 uppercase tracking-wider font-bold">Active Question</span>
              <span>{q?.points || 100} Pts</span>
            </div>
            <h2 className="font-heading font-bold text-sm sm:text-lg text-white leading-snug line-clamp-2 sm:line-clamp-none">
              {q?.questionText || "Listen to host question..."}
            </h2>

            {/* Multiple choice pills if question has options */}
            {q?.options && Array.isArray(q.options) && q.options.length > 0 && (
              <div className="grid grid-cols-2 gap-1.5 sm:gap-2 mt-2 pt-2 sm:mt-3 sm:pt-3 border-t border-slate-800/80">
                {q.options.map((opt: string, i: number) => {
                  const letter = ["A", "B", "C", "D"][i] || `${i + 1}`;
                  const isRevealedCorrect = gameState.status === "round_over" && gameState.revealedAnswer === opt;
                  return (
                    <div
                      key={i}
                      className={`flex items-center gap-1.5 sm:gap-2 p-1.5 sm:p-2 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-medium border ${
                        isRevealedCorrect
                          ? "bg-emerald-950/60 border-emerald-500 text-emerald-300 font-bold shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                          : "bg-slate-900/60 border-slate-800 text-slate-300"
                      }`}
                    >
                      <span className="w-4 h-4 sm:w-5 sm:h-5 rounded bg-slate-800 flex items-center justify-center font-bold text-slate-400 text-[9px] sm:text-[10px] shrink-0">
                        {letter}
                      </span>
                      <span className="truncate">{opt}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* CENTER TACTILE BUZZER STAGE */}
      <div className="flex-1 flex flex-col items-center justify-center px-3 py-2 sm:p-4 max-w-md mx-auto w-full min-h-0 overflow-y-auto sm:overflow-visible">
        {/* STATE 1: ACTIVE BUZZER ARMED */}
        {gameState.status === "active" && (
          <div className="flex flex-col items-center text-center my-auto">
            {gameState.buzzerQueue && gameState.buzzerQueue.length > 0 && (
              <div className="mb-2 sm:mb-3 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[11px] font-bold animate-pulse">
                ⚡ {gameState.buzzerQueue.length} of 3 Slots Locked! Buzz Now!
              </div>
            )}
            <div className="relative flex items-center justify-center w-52 h-52 sm:w-72 sm:h-72">
              {/* Outer halo waves */}
              <div className="absolute inset-0 rounded-full bg-red-600/20 animate-ping pointer-events-none" />
              <div className="absolute -inset-4 sm:-inset-6 rounded-full bg-red-600/15 blur-2xl pointer-events-none" />
              <div className="absolute inset-1.5 sm:inset-2 rounded-full bg-slate-900 shadow-2xl" />

              {/* Giant Red Skeuomorphic Button */}
              <button
                type="button"
                onClick={handleBuzz}
                aria-label="Tap to Buzz"
                className="relative z-10 w-44 h-44 sm:w-64 sm:h-64 rounded-full buzz-btn-outer flex flex-col items-center justify-center cursor-pointer select-none active:scale-95 transition-transform touch-manipulation shadow-2xl"
              >
                <div className="w-36 h-36 sm:w-52 sm:h-52 rounded-full buzz-btn-inner flex flex-col items-center justify-center shadow-inner">
                  <Zap className="w-11 h-11 sm:w-16 sm:h-16 text-white fill-white drop-shadow-lg mb-0.5 sm:mb-1" />
                  <span className="font-heading font-black text-2xl sm:text-4xl text-white tracking-widest drop-shadow-md">
                    BUZZ
                  </span>
                  <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-red-100/90 mt-0.5 sm:mt-1">
                    Fastest Reflex
                  </span>
                </div>
              </button>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-400 mt-2 sm:mt-4 font-medium">
              Tap as fast as you can to lock your buzzer!
            </p>
          </div>
        )}

        {/* STATE 2: YOU WON THE BUZZ / YOUR TURN TO ANSWER */}
        {isWinner && (
          <div className="w-full bg-[#0d1322] border-2 border-emerald-500/80 rounded-2xl sm:rounded-3xl p-5 sm:p-8 text-center shadow-[0_0_50px_rgba(16,185,129,0.3)] animate-in zoom-in-95 my-auto">
            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto mb-3 sm:mb-4 shadow-[0_0_20px_rgba(16,185,129,0.4)]">
              <Crown className="w-6 h-6 sm:w-8 sm:h-8 animate-bounce" />
            </div>
            <div className="inline-block px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] sm:text-xs font-bold uppercase tracking-wider mb-2">
              {gameState.myPosition === 1 ? "⚡ Buzz Registered #1" : `⚡ Turn Passed To You (#${gameState.myPosition || 2})`}
            </div>
            <h3 className="font-heading font-extrabold text-xl sm:text-3xl text-white">
              {gameState.myPosition === 1 ? "YOU BUZZED FIRST!" : "YOUR TURN TO ANSWER!"}
            </h3>
            <p className="font-mono text-cyan-400 font-bold text-base sm:text-lg my-1.5 sm:my-2">
              {gameState.myPosition === 1 ? "+100% Points Eligible" : "+50% Points Eligible"}
            </p>
            <div className="p-2.5 sm:p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs sm:text-sm font-semibold text-slate-200 mt-3 sm:mt-4">
              State your answer verbally to the host now!
            </div>
          </div>
        )}

        {/* STATE 3A: QUEUED #2 (STANDBY FOR 50% POINTS) */}
        {isQueued2 && (
          <div className="w-full bg-[#0d1322] border-2 border-cyan-500/60 rounded-2xl sm:rounded-3xl p-5 sm:p-7 text-center shadow-[0_0_35px_rgba(6,182,212,0.2)] animate-in zoom-in-95 my-auto">
            <div className="w-12 h-12 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center mx-auto mb-3 border border-cyan-500/40">
              <span className="font-black text-xl">#2</span>
            </div>
            <div className="inline-block px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-300 text-[10px] sm:text-xs font-bold uppercase tracking-wider mb-2">
              Buzzer Locked Position #2
            </div>
            <h3 className="font-heading font-extrabold text-lg sm:text-2xl text-white">
              STAND BY FOR 50% POINTS!
            </h3>
            <p className="text-slate-300 text-xs sm:text-sm mt-2 max-w-xs mx-auto">
              Contender #1 is answering. If the host marks their answer wrong, the floor passes immediately to you!
            </p>
          </div>
        )}

        {/* STATE 3B: QUEUED #3 (STANDBY) */}
        {isQueued3 && (
          <div className="w-full bg-[#0d1322] border-2 border-indigo-500/60 rounded-2xl sm:rounded-3xl p-5 sm:p-7 text-center shadow-[0_0_35px_rgba(99,102,241,0.2)] animate-in zoom-in-95 my-auto">
            <div className="w-12 h-12 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto mb-3 border border-indigo-500/40">
              <span className="font-black text-xl">#3</span>
            </div>
            <div className="inline-block px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] sm:text-xs font-bold uppercase tracking-wider mb-2">
              Buzzer Locked Position #3
            </div>
            <h3 className="font-heading font-extrabold text-lg sm:text-2xl text-white">
              LOCKED IN TOP 3!
            </h3>
            <p className="text-slate-300 text-xs sm:text-sm mt-2 max-w-xs mx-auto">
              You locked position #3. Stand by while earlier contenders answer!
            </p>
          </div>
        )}

        {/* STATE 4: LOCKED (SOMEONE ELSE BUZZED TOP 3) */}
        {isLocked && (
          <div className="w-full bg-slate-900/90 border border-slate-800 rounded-2xl sm:rounded-3xl p-5 sm:p-6 text-center shadow-xl animate-in fade-in my-auto">
            <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-full bg-slate-800 text-amber-400 flex items-center justify-center mx-auto mb-2.5 sm:mb-3">
              <Lock className="w-5 h-5 sm:w-7 sm:h-7" />
            </div>
            <h3 className="font-heading font-bold text-lg sm:text-xl text-white truncate max-w-xs mx-auto">
              Top 3 Buzzers Locked
            </h3>
            <p className="text-slate-400 text-xs mt-1">
              Host is listening to verbal answers from buzzed contenders...
            </p>
          </div>
        )}

        {/* STATE 5: ELIMINATED FROM THIS QUESTION */}
        {isEliminated && (
          <div className="w-full bg-slate-900/90 border border-red-500/30 rounded-2xl sm:rounded-3xl p-5 sm:p-6 text-center shadow-xl animate-in fade-in my-auto">
            <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-full bg-red-950/60 text-red-400 flex items-center justify-center mx-auto mb-2.5 sm:mb-3">
              <AlertCircle className="w-5 h-5 sm:w-7 sm:h-7" />
            </div>
            <h3 className="font-heading font-bold text-lg sm:text-xl text-red-300">Answer Marked Incorrect</h3>
            <p className="text-slate-400 text-xs mt-1">
              Wrong answer penalty deducted. Stand by for the next question!
            </p>
          </div>
        )}

        {/* STATE 6: ROUND OVER */}
        {gameState.status === "round_over" && (
          <div className="w-full bg-slate-900/90 border border-indigo-500/40 rounded-2xl sm:rounded-3xl p-5 sm:p-6 text-center shadow-xl animate-in zoom-in-95 my-auto">
            <h3 className="font-heading font-bold text-lg sm:text-xl text-white mb-2">Round Finished</h3>
            {gameState.revealedAnswer && (
              <div className="p-2.5 sm:p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 font-bold text-xs sm:text-sm">
                Correct Answer: {gameState.revealedAnswer}
              </div>
            )}
            <p className="text-xs text-slate-400 mt-2 sm:mt-3">Waiting for next question from host...</p>
          </div>
        )}
      </div>

      {/* BOTTOM PLAYER SCORE STRIP */}
      <footer className="p-2.5 sm:p-4 pb-safe bg-[#0d1322]/90 border-t border-slate-800/80 backdrop-blur-xl flex items-center justify-between text-xs shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-slate-400 text-[11px] sm:text-xs">Connected</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-slate-400 text-[11px] sm:text-xs">Your Score:</span>
          <span className="font-heading font-bold text-cyan-400 text-xs sm:text-sm">{data.currentPlayer.score} Pts</span>
        </div>
      </footer>
    </div>
  );
}
