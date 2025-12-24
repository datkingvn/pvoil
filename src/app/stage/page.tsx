"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useGameStore } from "@/lib/store";
import { useBroadcastSync } from "@/hooks/useBroadcastSync";
import { Timer } from "@/components/Timer";
import { QuestionDisplay } from "@/components/QuestionDisplay";
import { PlayerCard } from "@/components/PlayerCard";
import { BuzzButton } from "@/components/BuzzButton";
import { FlashOverlay } from "@/components/FlashOverlay";
import { Confetti } from "@/components/Confetti";
import { roundNames } from "@/lib/questions";
import { Maximize2, Minimize2, Volume2, VolumeX } from "lucide-react";

export default function StagePage() {
  useBroadcastSync(); // Sync with other tabs

  const {
    currentRound,
    gameStatus,
    players,
    soundEnabled,
    ambienceEnabled,
    khoiDongStarted,
    khoiDongActivePlayerId,
    khoiDongAnsweredCount,
    toggleSound,
    toggleAmbience,
  } = useGameStore();
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
          </div>

          <div className="flex items-center gap-4">
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

        {/* LED Wall - Question Display */}
        <div className="h-[400px]">
          <QuestionDisplay />
        </div>

        {/* Players Grid */}
        <div className="grid grid-cols-4 gap-4">
          {players.map((player) => (
            <PlayerCard key={player.id} player={player} />
          ))}
        </div>

        {/* Buzz Buttons Row - Ẩn khi đang ở vòng Khởi động */}
        {!(currentRound === "khoi-dong" && khoiDongStarted) && (
          <div className="grid grid-cols-4 gap-4">
            {players.map((player) => (
              <div key={player.id} className="flex justify-center">
                <BuzzButton
                  playerId={player.id}
                  disabled={gameStatus !== "question-open" || player.status !== "ready"}
                />
              </div>
            ))}
          </div>
        )}

        {/* Hiển thị thông tin vòng Khởi động */}
        {currentRound === "khoi-dong" && khoiDongStarted && (
          <div className="bg-neon-blue/20 border-2 border-neon-blue rounded-xl p-6 text-center">
            <div className="text-2xl font-bold text-neon-blue mb-2">
              Vòng Khởi động - {players.find((p) => p.id === khoiDongActivePlayerId)?.name}
            </div>
            <div className="text-lg text-gray-300">
              Đã trả lời: {khoiDongAnsweredCount} / 12 câu
            </div>
            <div className="text-sm text-gray-400 mt-2">
              MC sẽ chấm điểm trực tiếp
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

