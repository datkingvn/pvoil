"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useGameStore } from "@/lib/store";
import { useBroadcastSync } from "@/hooks/useBroadcastSync";
import { useGameWebSocket } from "@/hooks/useGameWebSocket";
import { QuestionDisplay } from "@/components/QuestionDisplay";
import { TeamCard } from "@/components/TeamCard";
import { FlashOverlay } from "@/components/FlashOverlay";
import { Confetti } from "@/components/Confetti";
import { Logo } from "@/components/Logo";
import { TileGrid } from "@/components/round2/TileGrid";
import { ObstacleDisplay } from "@/components/round2/ObstacleDisplay";
import { roundNames } from "@/lib/questions";
import {
  Maximize2,
  Minimize2,
  Volume2,
  VolumeX,
  LogOut,
  Clock,
  Bell,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

/** ✅ UI-only: Chướng ngại vật 21 chữ cái (7–4–7–3) + cột 1–4 */
function ObstaclePuzzleUI() {
  const rows = [7, 4, 7, 3];

  return (
    <div
      className="bg-slate-950/95 rounded-xl p-4 border border-slate-700/50 relative overflow-hidden h-full"
      style={{
        background:
          "radial-gradient(1200px 500px at 20% 10%, rgba(56,189,248,.18), transparent 60%)," +
          "linear-gradient(135deg, rgba(2,6,23,.95), rgba(15,23,42,.92))",
      }}
    >
      {/* Banner */}
      <div className="rounded-lg px-4 py-2 text-center shadow-lg border border-sky-300/20 bg-sky-500/80">
        <h2 className="text-white font-bold text-base tracking-wide">
          CHƯỚNG NGẠI VẬT CÓ 21 CHỮ CÁI
        </h2>
      </div>

      <div className="mt-4 flex gap-6 h-[calc(100%-56px)]">
        {/* Left: 21 bubbles */}
        <div className="flex-1 flex flex-col justify-center">
          <div className="space-y-4">
            {rows.map((count, rIdx) => (
              <div key={rIdx} className="flex gap-3">
                {Array.from({ length: count }).map((_, i) => (
                  <div
                    key={`${rIdx}-${i}`}
                    className="w-14 h-14 rounded-full relative"
                    style={{
                      background:
                        "linear-gradient(145deg, rgba(226,232,240,.9), rgba(148,163,184,.6))",
                      padding: "3px",
                      boxShadow:
                        "0 10px 20px rgba(0,0,0,.35), inset 0 1px 0 rgba(255,255,255,.35)",
                    }}
                  >
                    <div
                      className="w-full h-full rounded-full"
                      style={{
                        background:
                          "radial-gradient(circle at 30% 30%, rgba(255,255,255,.75), rgba(125,211,252,.85) 35%, rgba(59,130,246,.75) 70%, rgba(30,58,138,.85) 100%)",
                        boxShadow:
                          "inset 0 10px 18px rgba(255,255,255,.18), inset 0 -10px 18px rgba(0,0,0,.25)",
                      }}
                    />
                    <div
                      className="absolute top-2 left-3 w-6 h-6 rounded-full"
                      style={{
                        background:
                          "radial-gradient(circle, rgba(255,255,255,.85), rgba(255,255,255,0) 70%)",
                        filter: "blur(.2px)",
                        opacity: 0.9,
                      }}
                    />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Right: 1-4 */}
        <div className="flex flex-col gap-4 justify-center flex-shrink-0">
          {[1, 2, 3, 4].map((num) => (
            <div
              key={num}
              className="w-16 h-16 rounded-xl flex items-center justify-center text-white text-2xl font-extrabold"
              style={{
                background:
                  "linear-gradient(145deg, rgba(30,58,138,.85), rgba(37,99,235,.75))",
                border: "1px solid rgba(186,230,253,.25)",
                boxShadow: "0 12px 22px rgba(0,0,0,.35)",
              }}
            >
              {num}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function StagePage() {
  useBroadcastSync(); // Sync với các tab cùng máy
  useGameWebSocket("stage"); // Sync qua WebSocket với các thiết bị khác
  const { team, logout } = useAuth();
  const router = useRouter();
  const [round2State, setRound2State] = useState<any>(null);
  const [round2AnswerInput, setRound2AnswerInput] = useState("");
  const [round2TeamId, setRound2TeamId] = useState<number | null>(null);
  const syncCounterRef = useRef(0); // Đếm số lần để sync với server mỗi 5 giây

  const {
    currentRound,
    currentQuestion,
    gameStatus,
    teams,
    soundEnabled,
    ambienceEnabled,
    khoiDongStarted,
    khoiDongActiveTeamId,
    khoiDongAnsweredCount,
    khoiDongSelectedPackage,
    khoiDongTeamPackages,
    toggleSound,
    toggleAmbience,
    loadTeams,
  } = useGameStore();

  // Load round2 state khi ở vòng 2
  useEffect(() => {
    if (currentRound === "vuot-chuong-ngai-vat") {
      const loadRound2State = async () => {
        try {
          const res = await fetch("/api/round2/state");
          const data = await res.json();
          setRound2State(data);
        } catch (error) {
          console.error("Error loading round2 state:", error);
        }
      };
      loadRound2State();
      // Poll state mỗi 2 giây để sync real-time (giảm từ 500ms để tránh giật UI)
      const interval = setInterval(loadRound2State, 2000);
      return () => clearInterval(interval);
    } else {
      setRound2State(null);
    }
  }, [currentRound]);

  // Tự động redirect sang trang vòng 2 khi MC chuyển round
  useEffect(() => {
    if (team && currentRound === "vuot-chuong-ngai-vat") {
      // Redirect đến trang vòng 2
      router.push("/round2/play");
    }
  }, [currentRound, team, router]);

  // Timer countdown cho round2 - tối ưu để tránh re-render không cần thiết
  useEffect(() => {
    if (currentRound !== "vuot-chuong-ngai-vat") return;
    if (!round2State?.gameState) return;
    if (round2State.gameState.status !== "question_open") return;
    if (round2State.gameState.timeLeft <= 0) {
      // Hết thời gian => chỉ dừng timer, không đổi status
      syncCounterRef.current = 0; // Reset counter khi timer dừng
      return;
    }

    // Reset counter khi timer mới bắt đầu
    syncCounterRef.current = 0;

    const timer = setInterval(() => {
      setRound2State((prev: any) => {
        if (!prev || prev.gameState.status !== "question_open") {
          clearInterval(timer);
          return prev;
        }

        const newTimeLeft = prev.gameState.timeLeft - 1;
        syncCounterRef.current++;

        if (newTimeLeft <= 0) {
          clearInterval(timer);
          syncCounterRef.current = 0;
          // Hết thời gian => chỉ cập nhật timeLeft = 0, giữ nguyên status "question_open"
          const updatedState = {
            ...prev,
            gameState: { ...prev.gameState, timeLeft: 0 },
          };

          // Sync với server khi hết thời gian
          fetch("/api/round2/state", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  action: "setGameState",
              data: { timeLeft: 0 },
                }),
          }).catch(console.error);

          return updatedState;
        }

        // Update local state immediately for UI responsiveness
        const updatedState = {
          ...prev,
          gameState: { ...prev.gameState, timeLeft: newTimeLeft },
        };

        // Sync với server mỗi 5 giây thay vì mỗi giây để giảm tải
        if (syncCounterRef.current >= 5) {
          syncCounterRef.current = 0;
          fetch("/api/round2/state", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "setGameState",
              data: { timeLeft: newTimeLeft },
            }),
          }).catch(console.error);
        }

        return updatedState;
      });
    }, 1000);

    return () => {
      clearInterval(timer);
      syncCounterRef.current = 0;
    };
    // Loại bỏ round2State?.gameState?.timeLeft khỏi dependencies để tránh vòng lặp re-render
  }, [currentRound, round2State?.gameState?.status]);

  useEffect(() => {
    loadTeams();
  }, [loadTeams]);

  // Map team từ DB sang Round2Team id
  useEffect(() => {
    if (team && round2State?.teams) {
      // Tìm team trong round2State.teams dựa vào teamName
      const round2Team = round2State.teams.find(
        (t: any) => t.name === team.teamName
      );
      if (round2Team) {
        setRound2TeamId(round2Team.id);
      }
    }
  }, [team, round2State?.teams]);

  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  const getStatusText = () => {
    switch (gameStatus) {
      case "waiting":
        return "Chờ MC mở câu hỏi";
      case "question-open":
        return "Đang mở câu";
      case "buzz-locked":
        return "Đã khóa chuông";
      case "answer-revealed":
        return "Đã hiển thị đáp án";
      default:
        return "";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 relative overflow-hidden">
      {/* Stage lighting effects */}
      <div className="absolute inset-0 bg-radial-gradient bg-grid-soft opacity-80 pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-neon-blue/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-neon-purple/10 rounded-full blur-3xl" />

      <FlashOverlay />
      <Confetti />

      <div
        className={`relative z-10 ${
          currentRound === "vuot-chuong-ngai-vat" ? "p-4" : "p-6"
        } ${currentRound === "vuot-chuong-ngai-vat" ? "" : "space-y-6"}`}
      >
        {/* Header - Compact khi ở vòng 2 */}
        {currentRound !== "vuot-chuong-ngai-vat" && (
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-start gap-6">
              <Logo logoClassName="w-32" textClassName="text-sm" />
              <div>
                <h1 className="text-3xl font-bold text-neon-blue mb-2">
                  {currentRound
                    ? (roundNames as any)[currentRound]
                    : "Chưa chọn vòng thi"}
                </h1>
                <div className="text-lg text-gray-400">{getStatusText()}</div>
                {team && (
                  <div className="text-sm text-neon-purple mt-1">
                    Đội thi: {team.teamName}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-4">
              {team && (
                <button
                  onClick={logout}
                  className="px-4 py-2 bg-red-600/20 border border-red-600 text-red-400 rounded-lg hover:bg-red-600/30 transition-colors flex items-center gap-2"
                  title="Đăng xuất"
                >
                  <LogOut className="w-4 h-4" />
                  Đăng xuất
                </button>
              )}

              <div className="flex gap-2">
                <button
                  onClick={toggleSound}
                  className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors"
                  title={soundEnabled ? "Tắt âm thanh" : "Bật âm thanh"}
                >
                  {soundEnabled ? (
                    <Volume2 className="w-5 h-5 text-neon-green" />
                  ) : (
                    <VolumeX className="w-5 h-5 text-gray-500" />
                  )}
                </button>

                <button
                  onClick={toggleAmbience}
                  className={`p-2 rounded-lg transition-colors ${
                    ambienceEnabled
                      ? "bg-neon-purple/20 text-neon-purple"
                      : "bg-gray-800 hover:bg-gray-700"
                  }`}
                  title={
                    ambienceEnabled
                      ? "Tắt âm thanh trường quay"
                      : "Bật âm thanh trường quay"
                  }
                >
                  <Volume2 className="w-5 h-5" />
                </button>

                <button
                  onClick={toggleFullscreen}
                  className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors"
                  title={isFullscreen ? "Thoát toàn màn hình" : "Toàn màn hình"}
                >
                  {isFullscreen ? (
                    <Minimize2 className="w-5 h-5" />
                  ) : (
                    <Maximize2 className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Title hiển thị rõ ở vòng 2 */}
        {currentRound === "vuot-chuong-ngai-vat" && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 text-center"
          >
            <h1 className="text-4xl font-bold text-neon-blue mb-2">
              {(roundNames as any)["vuot-chuong-ngai-vat"]}
            </h1>
          </motion.div>
        )}

        {/* Controls floating ở vòng 2 */}
        {currentRound === "vuot-chuong-ngai-vat" && (
          <div className="absolute top-4 right-4 z-50 flex gap-2">
            <button
              onClick={toggleSound}
              className="p-2 rounded-lg bg-gray-800/80 hover:bg-gray-700 transition-colors backdrop-blur-sm"
              title={soundEnabled ? "Tắt âm thanh" : "Bật âm thanh"}
            >
              {soundEnabled ? (
                <Volume2 className="w-5 h-5 text-neon-green" />
              ) : (
                <VolumeX className="w-5 h-5 text-gray-500" />
              )}
            </button>
            <button
              onClick={toggleAmbience}
              className={`p-2 rounded-lg transition-colors backdrop-blur-sm ${
                ambienceEnabled
                  ? "bg-neon-purple/30 text-neon-purple"
                  : "bg-gray-800/80 hover:bg-gray-700"
              }`}
              title={
                ambienceEnabled
                  ? "Tắt âm thanh trường quay"
                  : "Bật âm thanh trường quay"
              }
            >
              <Volume2 className="w-5 h-5" />
            </button>
            <button
              onClick={toggleFullscreen}
              className="p-2 rounded-lg bg-gray-800/80 hover:bg-gray-700 transition-colors backdrop-blur-sm"
              title={isFullscreen ? "Thoát toàn màn hình" : "Toàn màn hình"}
            >
              {isFullscreen ? (
                <Minimize2 className="w-5 h-5 text-white" />
              ) : (
                <Maximize2 className="w-5 h-5 text-white" />
              )}
            </button>
          </div>
        )}

        {/* LED Wall */}
        {currentRound === "vuot-chuong-ngai-vat" ? (
          <motion.div
            className="grid grid-cols-2 grid-rows-2 gap-4 h-[calc(100vh-180px)] min-h-[700px]"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            {/* Ô 1: Tile Grid */}
            {round2State?.config ? (
              <div className="bg-slate-950/95 rounded-xl p-4 border border-slate-700/50 relative overflow-hidden">
                <TileGrid
                  imageUrl={round2State.config.imageOriginalUrl}
                  tiles={round2State.config.questions.map((q: any) => ({
                    id: q.id,
                    status: q.tileStatus,
                  }))}
                />
              </div>
            ) : (
              <div className="bg-slate-950/95 rounded-xl p-4 border border-slate-700/50 relative overflow-hidden flex items-center justify-center">
                <div className="text-gray-400">Chờ MC tạo config...</div>
              </div>
            )}

            {/* Ô 2: Obstacle Display */}
            {round2State?.config ? (
              <div className="bg-slate-950/95 rounded-xl p-4 border border-slate-700/50 relative overflow-hidden">
              <ObstacleDisplay
                keywordLength={round2State.config.keywordLength}
                answerWordCounts={round2State.config.questions.map((q: any) => q.answerWordCount)}
                questions={round2State.config.questions}
                activeQuestionId={round2State.gameState?.activeQuestionId || null}
              />
              </div>
            ) : (
              <div className="bg-slate-950/95 rounded-xl p-4 border border-slate-700/50 relative overflow-hidden">
              <ObstaclePuzzleUI />
              </div>
            )}

            {/* Ô 3: Câu hỏi + Timer + Input đáp án */}
            <div
              className="bg-slate-950/95 rounded-xl p-6 border-2 border-white/90 relative overflow-hidden flex flex-col"
              style={{
                backgroundImage: `linear-gradient(to right, rgba(148, 163, 184, 0.08) 1px, transparent 1px),
                  linear-gradient(to bottom, rgba(148, 163, 184, 0.08) 1px, transparent 1px)`,
                backgroundSize: "40px 40px",
              }}
            >
              {/* Bảng điểm các đội - phía trên */}
              {round2State?.teams && round2State.teams.length > 0 && (
                <div className="mb-4 pb-4 border-b border-slate-700/50">
                  <div className="flex items-center justify-between gap-2">
                    {round2State.teams
                      .sort((a: any, b: any) => b.score - a.score)
                      .map((teamItem: any) => {
                        const buzzerPresses = round2State?.gameState?.buzzerPresses || [];
                        const isBuzzerTeam = buzzerPresses.some((bp: any) => bp.teamId === teamItem.id);
                        const isFirstBuzzer = buzzerPresses.length > 0 && buzzerPresses[0].teamId === teamItem.id;
                        
                        // Tìm thứ tự của đội này trong danh sách buzzer để áp dụng màu
                        const buzzerIndex = buzzerPresses.findIndex((bp: any) => bp.teamId === teamItem.id);
                        
                        // Màu khác nhau cho mỗi đội: cam, vàng, xanh lá, tím
                        const buzzerColors = [
                          { border: "border-orange-500", bg: "bg-orange-900/40", shadow: "shadow-orange-500/50", ring: "ring-orange-400", ping: "bg-orange-500/40", gradient: "from-orange-400/30 via-yellow-400/30 to-orange-500/30", text: "text-orange-300", badge: "bg-orange-500" },
                          { border: "border-yellow-500", bg: "bg-yellow-900/40", shadow: "shadow-yellow-500/50", ring: "ring-yellow-400", ping: "bg-yellow-500/40", gradient: "from-yellow-400/30 via-amber-400/30 to-yellow-500/30", text: "text-yellow-300", badge: "bg-yellow-500" },
                          { border: "border-green-500", bg: "bg-green-900/40", shadow: "shadow-green-500/50", ring: "ring-green-400", ping: "bg-green-500/40", gradient: "from-green-400/30 via-emerald-400/30 to-green-500/30", text: "text-green-300", badge: "bg-green-500" },
                          { border: "border-purple-500", bg: "bg-purple-900/40", shadow: "shadow-purple-500/50", ring: "ring-purple-400", ping: "bg-purple-500/40", gradient: "from-purple-400/30 via-pink-400/30 to-purple-500/30", text: "text-purple-300", badge: "bg-purple-500" },
                        ];
                        
                        const colorScheme = buzzerIndex >= 0 ? buzzerColors[buzzerIndex % buzzerColors.length] : null;
                        
                        return (
                          <div
                            key={teamItem.id}
                            className={`flex-1 flex flex-col items-center p-2 rounded-lg border transition-all relative ${
                              team && team.teamName === teamItem.name
                                ? "bg-neon-blue/20 border-neon-blue"
                                : "bg-slate-800/50 border-slate-700"
                            } ${isBuzzerTeam && colorScheme ? `${colorScheme.border} ${colorScheme.bg} shadow-lg ${colorScheme.shadow}` : ""} ${isFirstBuzzer && colorScheme ? `ring-2 ${colorScheme.ring} ring-offset-2 ring-offset-slate-950` : ""}`}
                          >
                            {/* Visual effect nhấp nháy liên tục khi đội này bấm chuông - màu khác nhau cho mỗi đội */}
                            {isBuzzerTeam && colorScheme && (
                              <>
                                <div className={`absolute inset-0 ${colorScheme.ping} rounded-lg animate-ping`} />
                                <div className={`absolute inset-0 bg-gradient-to-br ${colorScheme.gradient} rounded-lg animate-pulse`} />
                              </>
                            )}
                            {/* Hiệu ứng đặc biệt cho đội bấm trước */}
                            {isFirstBuzzer && colorScheme && (
                              <div className={`absolute -top-1 -right-1 ${colorScheme.badge} text-white text-xs font-bold px-2 py-1 rounded-full animate-bounce`}>
                                1ST
                              </div>
                            )}
                            <div
                              className={`text-xs font-medium mb-1 relative z-10 ${
                                team && team.teamName === teamItem.name
                                  ? "text-neon-blue"
                                  : isBuzzerTeam && colorScheme
                                  ? isFirstBuzzer
                                    ? `${colorScheme.text} font-bold drop-shadow-lg`
                                    : `${colorScheme.text} font-semibold`
                                  : "text-gray-300"
                              }`}
                            >
                              {teamItem.name}
                              {isBuzzerTeam && " 🔔"}
                              {isFirstBuzzer && " ⭐"}
                            </div>
                            <div className={`font-bold text-lg relative z-10 ${
                              isBuzzerTeam && colorScheme ? isFirstBuzzer ? `${colorScheme.text} drop-shadow-lg` : colorScheme.text : "text-white"
                            }`}>
                              {teamItem.score}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              <div className="flex-1 mb-4 pr-4 overflow-y-auto">
                {round2State?.gameState?.status === "tile_selected" && round2State?.gameState?.activeQuestionId ? (
                  <div className="text-gray-400 text-lg italic">
                    Chờ MC bấm "Bắt đầu" để mở câu hỏi...
                  </div>
                ) : round2State?.gameState?.status === "question_open" && round2State?.gameState?.activeQuestionId ? (
                  <div className="text-white text-lg leading-relaxed font-medium">
                    {round2State.config?.questions.find(
                      (q: any) => q.id === round2State.gameState.activeQuestionId
                    )?.questionText || "Đang tải câu hỏi..."}
                  </div>
                ) : round2State?.gameState?.status === "round_finished" ? (
                  <div className="text-neon-green text-lg font-bold">
                    🎉 Đã đoán đúng từ khóa! +80 điểm
                  </div>
                ) : (
                  <div className="text-gray-400 text-lg italic">
                    Chờ MC chọn tile...
                  </div>
                )}
              </div>

              {/* Input đáp án - chỉ hiển thị khi question_open và đội đã đăng nhập */}
              {round2State?.gameState?.status === "question_open" && 
               round2State?.gameState?.activeQuestionId && 
               round2TeamId && 
               team && (() => {
                 const myTeam = round2State?.teams?.find((t: any) => t.id === round2TeamId);
                 const isLocked = myTeam?.isLocked || false;
                 const timeLeft = round2State?.gameState?.timeLeft || 0;
                 const isTimeUp = timeLeft <= 0;
                 
                 return (
                <div className="mb-4 space-y-2">
                     {isLocked ? (
                       <div className="p-3 bg-red-900/30 border border-red-600 rounded-lg">
                         <div className="text-red-400 text-sm font-semibold">⚠️ Đội của bạn đã bị khóa</div>
                         <div className="text-gray-400 text-xs mt-1">Không thể trả lời câu hỏi và bấm chuông</div>
                       </div>
                     ) : isTimeUp ? (
                       <div className="p-3 bg-gray-900/30 border border-gray-600 rounded-lg">
                         <div className="text-gray-400 text-sm font-semibold">⏰ Đã hết thời gian</div>
                         <div className="text-gray-500 text-xs mt-1">Không thể gửi đáp án nữa</div>
                       </div>
                     ) : (
                       <>
                         {/* Kiểm tra xem đội đã submit đáp án chưa */}
                         {(() => {
                           const myAnswer = round2State?.gameState?.teamAnswers?.find(
                             (ta: any) => ta.teamId === round2TeamId
                           );
                          if (myAnswer) {
                            return (
                              <div className="p-4 bg-gradient-to-br from-slate-800/90 to-slate-900/90 border-2 border-green-500/50 rounded-lg shadow-lg shadow-green-500/20">
                                <div className="flex items-center gap-2 mb-2">
                                  <div className="text-green-400 text-lg">✓</div>
                                  <div className="text-sm font-semibold text-green-400">Đã gửi đáp án thành công!</div>
                                </div>
                                <div className="text-sm text-gray-300 mb-2">Đáp án của bạn:</div>
                                <div className="text-white font-bold text-lg mb-3 p-2 bg-slate-700/50 rounded border border-slate-600">
                                  {myAnswer.answer || "(Trống)"}
                                </div>
                                {myAnswer.isCorrect === true && (
                                  <div className="flex items-center gap-2 text-green-400 text-sm font-semibold p-2 bg-green-500/20 rounded border border-green-500/50">
                                    <span className="text-lg">✓</span>
                                    <span>Đúng - Bạn đã nhận được điểm!</span>
                                  </div>
                                )}
                                {myAnswer.isCorrect === false && (
                                  <div className="flex items-center gap-2 text-red-400 text-sm font-semibold p-2 bg-red-500/20 rounded border border-red-500/50">
                                    <span className="text-lg">✗</span>
                                    <span>Sai - Không mất điểm</span>
                                  </div>
                                )}
                                {myAnswer.isCorrect === null && (
                                  <div className="flex items-center gap-2 text-yellow-400 text-sm font-semibold p-2 bg-yellow-500/20 rounded border border-yellow-500/50 animate-pulse">
                                    <span className="text-lg">⏳</span>
                                    <span>Chờ MC chấm điểm...</span>
                                  </div>
                                )}
                              </div>
                            );
                          }
                           return (
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                                 if (!round2AnswerInput.trim() || !round2TeamId || isTimeUp) return;

                      try {
                        const res = await fetch("/api/round2/state", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                                       action: "submitAnswer",
                            data: {
                                         teamId: round2TeamId,
                                         teamName: team.teamName,
                                         answer: round2AnswerInput.trim(),
                            },
                          }),
                        });
                        if (res.ok) {
                          setRound2AnswerInput("");
                                     const loadRes = await fetch("/api/round2/state");
                                     const loadData = await loadRes.json();
                                     setRound2State(loadData);
                        } else {
                          // Xử lý lỗi nếu API trả về lỗi (ví dụ: đã submit rồi)
                          const errorData = await res.json();
                          console.error("Error submitting answer:", errorData.error);
                          // Reload state để cập nhật UI
                          const loadRes = await fetch("/api/round2/state");
                          const loadData = await loadRes.json();
                          setRound2State(loadData);
                        }
                      } catch (error) {
                        console.error("Error submitting answer:", error);
                      }
                    }}
                    className="flex flex-col gap-2"
                  >
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={round2AnswerInput}
                        onChange={(e) => setRound2AnswerInput(e.target.value)}
                        placeholder="Nhập câu trả lời..."
                                   disabled={round2State?.gameState?.status !== "question_open" || isTimeUp}
                                   className="flex-1 px-4 py-3 bg-slate-800/80 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-neon-blue disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                      <button
                        type="submit"
                                   disabled={!round2AnswerInput.trim() || round2State?.gameState?.status !== "question_open" || isTimeUp}
                        className="px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold rounded-lg transition-all duration-200 shadow-lg shadow-green-500/50 hover:shadow-green-500/70 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                      >
                        ✓ Gửi
                      </button>
                    </div>
                    {/* Thông báo hướng dẫn */}
                    <div className="text-xs text-gray-400 italic">
                      💡 Sau khi gửi, đáp án của bạn sẽ được hiển thị và chờ MC chấm điểm
                    </div>
                  </form>
                           );
                         })()}
                       </>
              )}
                   </div>
                 );
               })()}

              {/* Đồng hồ cát dạng thanh đứng dọc */}
              <div className="absolute bottom-6 left-6 flex items-end gap-3">
                <div className="flex flex-col items-center gap-2">
                  {/* Thanh đồng hồ cát */}
                  <div className="relative w-16 h-32 bg-slate-800/60 rounded-lg border-2 border-slate-600/50 overflow-hidden">
                    {/* Thanh progress tụt từ trên xuống */}
                    {round2State?.gameState?.timeLeft !== undefined && round2State.gameState.timeLeft > 0 ? (
                      <div
                        className={`absolute bottom-0 left-0 right-0 transition-all duration-1000 ease-linear ${
                          round2State.gameState.timeLeft <= 5
                            ? "bg-gradient-to-t from-red-500 to-red-400"
                            : round2State.gameState.timeLeft <= 10
                            ? "bg-gradient-to-t from-yellow-500 to-yellow-400"
                            : "bg-gradient-to-t from-neon-blue to-cyan-400"
                        }`}
                        style={{
                          height: `${(round2State.gameState.timeLeft / 15) * 100}%`,
                          boxShadow: round2State.gameState.timeLeft <= 5
                            ? "0 0 20px rgba(239, 68, 68, 0.8)"
                            : round2State.gameState.timeLeft <= 10
                            ? "0 0 15px rgba(234, 179, 8, 0.6)"
                            : "0 0 10px rgba(0, 240, 255, 0.5)",
                        }}
                      />
                    ) : null}
                    {/* Vạch chia */}
                    <div className="absolute inset-0 flex flex-col justify-between py-1">
                      {[0, 1, 2, 3, 4].map((i) => (
                        <div
                          key={i}
                          className="h-px bg-white/20"
                          style={{ marginTop: `${i * 25}%` }}
                        />
                      ))}
                    </div>
                  </div>
                  {/* Số giây còn lại */}
                  <div
                    className={`text-2xl font-mono font-bold tabular-nums ${
                      round2State?.gameState?.timeLeft && round2State.gameState.timeLeft <= 5
                        ? "text-red-400"
                        : round2State?.gameState?.timeLeft && round2State.gameState.timeLeft <= 10
                        ? "text-yellow-400"
                        : "text-neon-blue"
                    }`}
                    style={{
                      textShadow:
                        round2State?.gameState?.timeLeft && round2State.gameState.timeLeft <= 5
                          ? "0 0 10px rgba(239, 68, 68, 0.8)"
                          : round2State?.gameState?.timeLeft && round2State.gameState.timeLeft <= 10
                          ? "0 0 8px rgba(234, 179, 8, 0.6)"
                          : "0 0 8px rgba(0, 240, 255, 0.5)",
                    }}
                  >
                    {round2State?.gameState?.timeLeft !== undefined
                      ? String(round2State.gameState.timeLeft).padStart(2, "0")
                      : "00"}
                  </div>
                </div>
              </div>
            </div>

            {/* Ô 4: Nút rung chuông */}
            <div className="bg-slate-950/95 rounded-xl p-6 border border-slate-700/50 relative overflow-hidden flex flex-col items-center justify-center">
              {(() => {
                const myTeam = round2State?.teams?.find((t: any) => t.id === round2TeamId);
                const isLocked = myTeam?.isLocked || false;
                const buzzerPresses = round2State?.gameState?.buzzerPresses || [];
                const isMyBuzzer = buzzerPresses.some((bp: any) => bp.teamId === round2TeamId);
                const firstBuzzerTeam = buzzerPresses.length > 0 ? buzzerPresses[0] : null;
                // Cho phép bấm chuông ở mọi trạng thái (trừ khi bị khóa hoặc đã bấm rồi)
                const canPressBuzzer = !isLocked && !isMyBuzzer;
                
                return (
                  <>
                    {/* Visual effect khi đội này bấm chuông */}
                    {isMyBuzzer && (
                      <div className="absolute inset-0 bg-yellow-400/30 animate-pulse rounded-xl" />
                    )}
                    
                    <button
                      onClick={async () => {
                        if (!canPressBuzzer || !round2TeamId || !team) return;
                        
                        try {
                          const res = await fetch("/api/round2/state", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              action: "pressBuzzer",
                              data: {
                                teamId: round2TeamId,
                                teamName: team.teamName,
                              },
                            }),
                          });
                          if (res.ok) {
                            const loadRes = await fetch("/api/round2/state");
                            const loadData = await loadRes.json();
                            setRound2State(loadData);
                          } else {
                            const errorData = await res.json();
                            alert(errorData.error || "Không thể bấm chuông");
                          }
                        } catch (error) {
                          console.error("Error pressing buzzer:", error);
                          alert("Lỗi khi bấm chuông");
                        }
                      }}
                      disabled={!canPressBuzzer}
                      className={`group relative w-48 h-48 rounded-full shadow-2xl transition-all duration-300 flex items-center justify-center ${
                        isLocked
                          ? "bg-gray-600 cursor-not-allowed opacity-50"
                          : isMyBuzzer
                          ? "bg-gradient-to-br from-green-500 via-green-400 to-emerald-500 hover:shadow-green-500/50 hover:scale-105"
                          : "bg-gradient-to-br from-yellow-500 via-yellow-400 to-orange-500 hover:shadow-yellow-500/50 hover:scale-105 active:scale-95"
                      }`}
                    >
                      {/* Glow effect */}
                      {!isLocked && !isMyBuzzer && (
                        <div className="absolute inset-0 rounded-full bg-yellow-400/30 blur-xl group-hover:bg-yellow-400/50 transition-all duration-300" />
                      )}
                      {isMyBuzzer && (
                        <div className="absolute inset-0 rounded-full bg-green-400/50 blur-xl animate-pulse" />
                      )}
                      
                      {/* Bell icon */}
                      <Bell className={`w-24 h-24 text-white drop-shadow-lg ${isMyBuzzer ? "animate-bounce" : "group-hover:animate-pulse"}`} strokeWidth={2.5} />
                      
                      {/* Ripple effect */}
                      {!isLocked && !isMyBuzzer && (
                        <div className="absolute inset-0 rounded-full border-4 border-yellow-300/50 animate-ping opacity-0 group-hover:opacity-100" />
                      )}
                      {isMyBuzzer && (
                        <div className="absolute inset-0 rounded-full border-4 border-green-300/50 animate-ping" />
                      )}
                    </button>
                    
                    {/* Label */}
                    <div className="mt-6 text-center">
                      <div className={`text-xl font-bold mb-1 ${
                        isLocked ? "text-gray-500" : isMyBuzzer ? "text-green-400" : "text-white"
                      }`}>
                        {isLocked ? "ĐÃ BỊ KHÓA" : isMyBuzzer ? "ĐÃ BẤM CHUÔNG" : "RUNG CHUÔNG"}
                        </div>
                      <div className="text-gray-400 text-sm">
                        {isLocked ? "Không thể tham gia" : isMyBuzzer ? "Chờ MC chấm điểm" : firstBuzzerTeam ? `Đội bấm trước: ${firstBuzzerTeam.teamName}` : "Nhấn để rung chuông"}
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          </motion.div>
        ) : currentRound === "khoi-dong" &&
          khoiDongActiveTeamId &&
          !khoiDongSelectedPackage &&
          !khoiDongStarted ? (
          <div className="flex flex-col items-center justify-center space-y-8">
            <div className="w-full max-w-2xl">
              <div className="bg-gray-800/90 border border-white/20 rounded-lg p-8 text-center">
                <div className="text-5xl font-bold text-white mb-3">
                  {
                    teams.find((t) => t.teamId === khoiDongActiveTeamId)
                      ?.teamName
                  }
                </div>
                <div className="text-xl text-gray-300">
                  Đã được chọn để thi Vòng 1: Khơi nguồn năng lượng
                </div>
              </div>
            </div>

            <div className="w-full max-w-4xl">
              <h2 className="text-3xl font-bold text-white mb-2 text-center">
                Chọn gói câu hỏi
              </h2>
              <p className="text-lg text-gray-400 mb-6 text-center">
                Đang chờ MC chọn gói câu hỏi
              </p>
              <div className="grid grid-cols-2 gap-6">
                {[1, 2, 3, 4].map((packageNum) => {
                  const packageTakenBy = Object.entries(khoiDongTeamPackages).find(
                    ([teamId, pkg]) =>
                      pkg === packageNum &&
                      teamId !== String(khoiDongActiveTeamId)
                  );
                  const isTaken = !!packageTakenBy;

                  return (
                    <motion.div
                      key={packageNum}
                      className={`bg-gray-800/90 border border-white/20 rounded-lg p-8 text-center transition-all duration-300 ${
                        isTaken ? "text-gray-500 opacity-50" : "text-white"
                      }`}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: packageNum * 0.1 }}
                    >
                      <div className="text-4xl font-bold mb-2">
                        Gói {packageNum}
                      </div>
                      <div className="text-lg text-gray-300">12 câu hỏi</div>
                      {isTaken && (
                        <div className="text-sm text-red-400 mt-2">
                          Đã được chọn
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className="h-[400px] overflow-visible">
            <QuestionDisplay />
          </div>
        )}

        {/* Teams Score Board - Ẩn khi ở vòng 2 */}
        {currentRound !== "vuot-chuong-ngai-vat" && teams.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-neon-blue mb-2">Bảng điểm</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {teams
                .sort((a, b) => b.score - a.score)
                .map((team) => (
                  <TeamCard key={team.teamId} team={team} />
                ))}
            </div>
          </div>
        )}

        {/* Hiển thị thông tin vòng 1: Khơi nguồn năng lượng */}
        {currentRound === "khoi-dong" && khoiDongActiveTeamId && (
          <div className="bg-neon-blue/20 border-2 border-neon-blue rounded-xl p-6 text-center">
            {khoiDongStarted ? (
              <>
                <div className="text-2xl font-bold text-neon-blue mb-2">
                  Vòng 1: Khơi nguồn năng lượng -{" "}
                  {
                    teams.find((t) => t.teamId === khoiDongActiveTeamId)
                      ?.teamName
                  }
                </div>
                <div className="text-lg text-gray-300 mb-2">
                  Gói {khoiDongSelectedPackage} - Đã trả lời:{" "}
                  {khoiDongAnsweredCount} / 12 câu
                </div>
                <div className="text-sm text-gray-400 mt-2">
                  MC sẽ chấm điểm trực tiếp
                </div>
              </>
            ) : khoiDongSelectedPackage ? (
              <>
                <div className="text-2xl font-bold text-neon-blue mb-2">
                  {
                    teams.find((t) => t.teamId === khoiDongActiveTeamId)
                      ?.teamName
                  }
                </div>
                <div className="text-lg text-gray-300 mb-2">
                  Đã chọn: Gói {khoiDongSelectedPackage}
                </div>
                <div className="text-sm text-gray-400 mt-2">
                  Chờ MC bắt đầu vòng thi
                </div>
              </>
            ) : (
              <>
                <div className="text-2xl font-bold text-neon-blue mb-2">
                  {
                    teams.find((t) => t.teamId === khoiDongActiveTeamId)
                      ?.teamName
                  }
                </div>
                <div className="text-lg text-gray-300 mb-2">
                  Đã được chọn để thi Vòng 1: Khơi nguồn năng lượng
                </div>
                <div className="text-sm text-gray-400 mt-2">
                  Chờ MC chọn gói câu hỏi
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
