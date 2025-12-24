"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useGameStore } from "@/lib/store";
import { useBroadcastSync } from "@/hooks/useBroadcastSync";
import { Timer } from "@/components/Timer";
import { QuestionDisplay } from "@/components/QuestionDisplay";
import { TeamCard } from "@/components/TeamCard";
import { FlashOverlay } from "@/components/FlashOverlay";
import { Confetti } from "@/components/Confetti";
import { roundNames } from "@/lib/questions";
import { Maximize2, Minimize2, Volume2, VolumeX, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export default function StagePage() {
  useBroadcastSync(); // Sync with other tabs
  const { team, logout } = useAuth();

  const {
    currentRound,
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
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
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
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black relative overflow-hidden">
      {/* Stage lighting effects */}
      <div className="absolute inset-0 bg-radial-gradient pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-neon-blue/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-neon-purple/10 rounded-full blur-3xl" />

      <FlashOverlay />
      <Confetti />

      <div className="relative z-10 p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-neon-blue mb-2">
              {currentRound ? roundNames[currentRound] : "Chưa chọn vòng thi"}
            </h1>
            <div className="text-lg text-gray-400">{getStatusText()}</div>
            {team && (
              <div className="text-sm text-neon-purple mt-1">
                Đội thi: {team.teamName}
              </div>
            )}
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
            <Timer />

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
                title={ambienceEnabled ? "Tắt âm thanh trường quay" : "Bật âm thanh trường quay"}
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

        {/* LED Wall - Question Display hoặc Hiển thị gói câu hỏi */}
        {currentRound === "khoi-dong" && khoiDongActiveTeamId && !khoiDongSelectedPackage && !khoiDongStarted ? (
          <div className="flex flex-col items-center justify-center space-y-8">
            {/* Thông tin đội thi */}
            <div className="w-full max-w-2xl">
              <div className="bg-gray-800/90 border border-white/20 rounded-lg p-8 text-center">
                <div className="text-5xl font-bold text-white mb-3">
                  {teams.find((t) => t.teamId === khoiDongActiveTeamId)?.teamName}
                </div>
                <div className="text-xl text-gray-300">
                  Đã được chọn để thi vòng Khởi động
                </div>
                </div>
              </div>
              
            {/* Hiển thị gói câu hỏi (chỉ xem, không chọn được) */}
            <div className="w-full max-w-4xl">
              <h2 className="text-3xl font-bold text-white mb-2 text-center">
                Chọn gói câu hỏi
              </h2>
              <p className="text-lg text-gray-400 mb-6 text-center">
                Đang chờ MC chọn gói câu hỏi
              </p>
              <div className="grid grid-cols-2 gap-6">
                {[1, 2, 3, 4].map((packageNum) => {
                  // Kiểm tra gói đã được chọn bởi đội khác chưa
                  const packageTakenBy = Object.entries(khoiDongTeamPackages).find(
                    ([teamId, pkg]) => pkg === packageNum && teamId !== khoiDongActiveTeamId
                  );
                  const isTaken = !!packageTakenBy;
                  
                  return (
                    <motion.div
                      key={packageNum}
                      className={`
                        bg-gray-800/90 border border-white/20 rounded-lg p-8 text-center
                        transition-all duration-300
                        ${
                          isTaken
                            ? "text-gray-500 opacity-50"
                            : "text-white"
                        }
                      `}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: packageNum * 0.1 }}
                    >
                      <div className="text-4xl font-bold mb-2">Gói {packageNum}</div>
                      <div className="text-lg text-gray-300">12 câu hỏi</div>
                      {isTaken && (
                        <div className="text-sm text-red-400 mt-2">Đã được chọn</div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className="h-[400px]">
            <QuestionDisplay />
          </div>
        )}

        {/* Teams Score Board */}
        {teams.length > 0 && (
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

        {/* Hiển thị thông tin vòng Khởi động */}
        {currentRound === "khoi-dong" && khoiDongActiveTeamId && (
          <div className="bg-neon-blue/20 border-2 border-neon-blue rounded-xl p-6 text-center">
            {khoiDongStarted ? (
              <>
                <div className="text-2xl font-bold text-neon-blue mb-2">
                  Vòng Khởi động - {teams.find((t) => t.teamId === khoiDongActiveTeamId)?.teamName}
                </div>
                <div className="text-lg text-gray-300 mb-2">
                  Gói {khoiDongSelectedPackage} - Đã trả lời: {khoiDongAnsweredCount} / 12 câu
                </div>
                <div className="text-sm text-gray-400 mt-2">
                  MC sẽ chấm điểm trực tiếp
                </div>
              </>
            ) : khoiDongSelectedPackage ? (
              <>
                <div className="text-2xl font-bold text-neon-blue mb-2">
                  {teams.find((t) => t.teamId === khoiDongActiveTeamId)?.teamName}
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
                  {teams.find((t) => t.teamId === khoiDongActiveTeamId)?.teamName}
                </div>
                <div className="text-lg text-gray-300 mb-2">
                  Đã được chọn để thi vòng Khởi động
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

