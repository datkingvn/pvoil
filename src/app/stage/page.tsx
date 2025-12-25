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
            {/* Top-Left: Bảng game 4 ô số + ô trung tâm */}
            <div
              className="bg-slate-950/95 rounded-xl p-4 border border-slate-700/50 relative overflow-hidden"
              style={{
                backgroundImage: `linear-gradient(to right, rgba(148, 163, 184, 0.08) 1px, transparent 1px),
                  linear-gradient(to bottom, rgba(148, 163, 184, 0.08) 1px, transparent 1px)`,
                backgroundSize: "40px 40px",
              }}
            >
              <div className="absolute top-3 left-4 text-white font-bold text-sm z-20">
                Trực tiếp
              </div>
              <div className="h-full flex items-center justify-center pt-8">
                <div className="relative w-full h-full max-w-md max-h-md flex items-center justify-center">
                  <div className="grid grid-cols-2 gap-4 w-full h-full">
                    {[1, 2, 3, 4].map((num) => (
                      <div
                        key={num}
                        className="bg-blue-950 border-2 border-blue-700 rounded-xl flex items-center justify-center text-white text-8xl font-bold shadow-2xl hover:border-blue-500 transition-colors"
                        style={{
                          background:
                            "linear-gradient(135deg, rgba(30, 58, 138, 0.9), rgba(30, 64, 175, 0.9))",
                        }}
                      >
                        {num}
                      </div>
                    ))}
                  </div>

                  <div
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-blue-950 border-2 border-blue-700 rounded-xl flex items-center justify-center shadow-2xl z-10"
                    style={{
                      background:
                        "linear-gradient(135deg, rgba(30, 58, 138, 0.95), rgba(30, 64, 175, 0.95))",
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Top-Right: ✅ UI theo ảnh (chưa có logic) */}
            <ObstaclePuzzleUI />

            {/* Bottom-Left: Câu hỏi + Timer mock */}
            <div
              className="bg-slate-950/95 rounded-xl p-6 border-2 border-white/90 relative overflow-hidden"
              style={{
                backgroundImage: `linear-gradient(to right, rgba(148, 163, 184, 0.08) 1px, transparent 1px),
                  linear-gradient(to bottom, rgba(148, 163, 184, 0.08) 1px, transparent 1px)`,
                backgroundSize: "40px 40px",
              }}
            >
              <div className="h-full mb-28 pr-4">
                {currentQuestion ? (
                  <div className="text-white text-lg leading-relaxed font-medium">
                    {currentQuestion.text}
                  </div>
                ) : (
                  <div className="text-gray-400 text-lg italic">
                    Chờ câu hỏi...
                  </div>
                )}
              </div>

              <div className="absolute bottom-6 left-6 flex items-center gap-2">
                <Clock className="w-6 h-6 text-white/80" />
                <div className="text-white text-5xl font-mono font-bold tabular-nums">
                  09:25
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
                  THACO
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
