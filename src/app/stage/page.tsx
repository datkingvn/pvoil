"use client";

import { useEffect, useState } from "react";
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
  const [round2State, setRound2State] = useState<any>(null);
  const [round2AnswerInput, setRound2AnswerInput] = useState("");

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
      // Poll state mỗi 500ms để sync real-time
      const interval = setInterval(loadRound2State, 500);
      return () => clearInterval(interval);
    } else {
      setRound2State(null);
    }
  }, [currentRound]);

  // Timer countdown cho round2
  useEffect(() => {
    if (currentRound !== "vuot-chuong-ngai-vat") return;
    if (!round2State?.gameState) return;
    if (round2State.gameState.status !== "question_open") return;
    if (round2State.gameState.timeLeft <= 0) {
      // Hết thời gian => tự động submit với answer rỗng
      const handleTimeout = async () => {
        try {
          await fetch("/api/round2/state", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "setGameState",
              data: {
                lastAnswerInput: "",
                status: "waiting_confirmation",
              },
            }),
          });
        } catch (error) {
          console.error("Error handling timeout:", error);
        }
      };
      handleTimeout();
      return;
    }

    const timer = setInterval(() => {
      setRound2State((prev: any) => {
        if (!prev || prev.gameState.status !== "question_open") {
          clearInterval(timer);
          return prev;
        }

        const newTimeLeft = prev.gameState.timeLeft - 1;
        if (newTimeLeft <= 0) {
          clearInterval(timer);
          // Hết thời gian => tự động submit với answer rỗng
          const handleTimeout = async () => {
            try {
              await fetch("/api/round2/state", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  action: "setGameState",
                  data: {
                    lastAnswerInput: "",
                    status: "waiting_confirmation",
                  },
                }),
              });
            } catch (error) {
              console.error("Error handling timeout:", error);
            }
          };
          handleTimeout();
          return prev;
        }

        // Update local state immediately for UI responsiveness
        const updatedState = {
          ...prev,
          gameState: { ...prev.gameState, timeLeft: newTimeLeft },
        };

        // Sync với server mỗi giây
        fetch("/api/round2/state", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "setGameState",
            data: { timeLeft: newTimeLeft },
          }),
        }).catch(console.error);

        return updatedState;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [currentRound, round2State?.gameState?.status, round2State?.gameState?.timeLeft]);

  useEffect(() => {
    loadTeams();
  }, [loadTeams]);

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
            {/* Top-Left: Tile Grid */}
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

            {/* Top-Right: Obstacle Display */}
            {round2State?.config ? (
              <ObstacleDisplay
                keywordLength={round2State.config.keywordLength}
                answerWordCounts={round2State.config.questions.map((q: any) => q.answerWordCount)}
              />
            ) : (
              <ObstaclePuzzleUI />
            )}

            {/* Bottom-Left: Câu hỏi + Timer + Input đáp án */}
            <div
              className="bg-slate-950/95 rounded-xl p-6 border-2 border-white/90 relative overflow-hidden flex flex-col"
              style={{
                backgroundImage: `linear-gradient(to right, rgba(148, 163, 184, 0.08) 1px, transparent 1px),
                  linear-gradient(to bottom, rgba(148, 163, 184, 0.08) 1px, transparent 1px)`,
                backgroundSize: "40px 40px",
              }}
            >
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
                ) : round2State?.gameState?.status === "waiting_confirmation" ? (
                  <div className="text-yellow-400 text-lg font-semibold">
                    ⏳ Đã gửi đáp án. Chờ MC xác nhận...
                  </div>
                ) : round2State?.gameState?.status === "answered_correct" ? (
                  <div className="text-green-400 text-lg font-semibold">
                    ✓ Trả lời đúng! Chờ MC xác nhận...
                  </div>
                ) : round2State?.gameState?.status === "answered_wrong" ? (
                  <div className="text-red-400 text-lg font-semibold">
                    ✗ Trả lời sai. Chờ MC xác nhận...
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

              {/* Input đáp án - chỉ hiển thị khi question_open và chưa gửi đáp án */}
              {round2State?.gameState?.status === "question_open" && round2State?.gameState?.activeQuestionId && !round2State?.gameState?.lastAnswerInput && (
                <div className="mb-4 space-y-2">
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      if (!round2AnswerInput.trim()) return;

                      try {
                        const res = await fetch("/api/round2/state", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            action: "setGameState",
                            data: {
                              lastAnswerInput: round2AnswerInput.trim(),
                              status: "waiting_confirmation",
                            },
                          }),
                        });
                        if (res.ok) {
                          setRound2AnswerInput("");
                        }
                      } catch (error) {
                        console.error("Error submitting answer:", error);
                      }
                    }}
                    className="flex gap-2"
                  >
                    <input
                      type="text"
                      value={round2AnswerInput}
                      onChange={(e) => setRound2AnswerInput(e.target.value)}
                      placeholder="Nhập câu trả lời..."
                      disabled={round2State?.gameState?.status !== "question_open"}
                      className="flex-1 px-4 py-3 bg-slate-800/80 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-neon-blue disabled:opacity-50"
                    />
                    <button
                      type="submit"
                      disabled={!round2AnswerInput.trim() || round2State?.gameState?.status !== "question_open"}
                      className="px-6 py-3 bg-neon-blue hover:bg-neon-blue/80 text-white font-bold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Gửi
                    </button>
                  </form>
                </div>
              )}

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

            {/* Bottom-Right: Live studio feed (placeholder) */}
            <div
              className="bg-red-950/40 rounded-xl border-2 border-red-700/40 relative overflow-hidden"
              style={{
                background:
                  "linear-gradient(135deg, rgba(69, 10, 10, 0.5), rgba(127, 29, 29, 0.4), rgba(185, 28, 28, 0.3))",
                backgroundImage: `linear-gradient(to right, rgba(148, 163, 184, 0.05) 1px, transparent 1px),
                  linear-gradient(to bottom, rgba(148, 163, 184, 0.05) 1px, transparent 1px)`,
                backgroundSize: "40px 40px",
              }}
            >
              <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
                <div className="text-white text-3xl font-bold mb-6 tracking-wider">
                  PVOIL VŨNG ÁNG
                </div>

                <div className="flex gap-4 justify-center items-end flex-1 w-full max-w-5xl px-4">
                  {[60, 30, 65, 35, 40].map((score, index) => (
                    <div
                      key={index}
                      className="flex-1 max-w-[140px] bg-white/15 border border-white/25 rounded-xl flex flex-col items-center justify-end pb-4 pt-6 backdrop-blur-md shadow-xl"
                      style={{ height: "220px" }}
                    >
                      <div className="w-full h-14 bg-blue-600/90 rounded-lg mb-3 flex items-center justify-center border border-blue-400/30 shadow-inner">
                        <div className="text-white font-bold text-2xl">
                          {score}
                        </div>
                      </div>
                      <div className="w-full h-3 bg-gray-400/40 rounded-b-xl" />
                    </div>
                  ))}
                </div>
              </div>
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
