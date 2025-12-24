"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useGameStore } from "@/lib/store";
import { GameStatus } from "@/lib/types";
import { Timer } from "./Timer";

interface QuestionDisplayProps {
  hideQAType?: boolean;
}

export function QuestionDisplay({ hideQAType = false }: QuestionDisplayProps = {}) {
  const { currentQuestion, gameStatus, currentRound, khoiDongActiveTeamId, khoiDongStarted } = useGameStore();

  const getStatusText = (status: GameStatus) => {
    switch (status) {
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
    // Wrapper ngoài cùng: cho phép overflow visible để glow của Timer không bị cắt
    <div className="relative w-full h-full min-h-[400px] rounded-xl overflow-visible">
      {/* Lớp background + scanline + vignette nằm dưới, vẫn được clip theo border-radius */}
      <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-gray-900 via-gray-800 to-black border-2 border-neon-blue/30 overflow-hidden pointer-events-none">
        {/* Scanline effect */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-neon-blue/5 to-transparent animate-scanline" />
        </div>

        {/* Vignette */}
        <div className="absolute inset-0 bg-radial-gradient from-transparent via-transparent to-black/50" />
      </div>

      {/* Lớp nội dung phía trên, không bị overflow-hidden nên glow có thể tràn tự nhiên */}
      <div className="relative z-10 h-full rounded-xl overflow-visible">
        <AnimatePresence mode="wait">
          {!currentQuestion ? (
            <motion.div
              key="waiting"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex items-center justify-center h-full px-8"
            >
              <div className="text-center">
                <div className="text-4xl font-bold text-neon-blue mb-4">
                  {currentRound === "khoi-dong" && !khoiDongActiveTeamId
                    ? "Chờ MC chọn đội"
                    : getStatusText(gameStatus)}
                </div>
                <div className="text-gray-400 text-lg">
                  {currentRound === "khoi-dong" && !khoiDongActiveTeamId
                    ? "Vui lòng chờ MC chọn đội thi..."
                    : "Vui lòng chờ..."}
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
  key="question"
  initial={{ opacity: 0, y: 16, scale: 0.98 }}
  animate={{ opacity: 1, y: 0, scale: 1 }}
  exit={{ opacity: 0, y: -16, scale: 0.98 }}
  transition={{ duration: 0.4, ease: "easeOut" }}
  className="p-8 h-full flex flex-col overflow-visible"
>

              <div className="text-xl font-bold text-white mb-6 leading-relaxed">
                {currentQuestion.text}
              </div>

              {/* Câu hỏi hỏi đáp (không có options) */}
              {(!currentQuestion.options || currentQuestion.options.length === 0 || currentQuestion.isOpenEnded) ? (
                hideQAType ? null : (
                  <div className="flex-1 flex items-center justify-center overflow-visible">
                    <div className="text-center w-full overflow-visible">
                      {/* Timer được đặt trong layer không bị overflow-hidden nên glow không còn bị cắt */}
                      <Timer />
                    </div>
                  </div>
                )
              ) : (
                /* Câu hỏi trắc nghiệm (có options) */
                <div className="grid grid-cols-2 gap-4 flex-1">
                  {currentQuestion.options.map((option, index) => {
                    const isCorrect = index === currentQuestion.correctIndex;
                    const isRevealed = gameStatus === "answer-revealed";
                    const isSelected = false; // Could track selected answer

                    return (
                      <motion.button
                        key={option.label}
                        className={`
                          p-6 rounded-lg border-2 text-left
                          transition-all duration-300
                          ${
                            isRevealed
                              ? isCorrect
                                ? "bg-neon-green/20 border-neon-green text-neon-green"
                                : "bg-gray-800/50 border-gray-700 text-gray-500 opacity-50"
                              : "bg-gray-800/50 border-gray-700 text-white hover:border-neon-blue hover:bg-gray-800"
                          }
                          ${isSelected && !isRevealed ? "border-neon-yellow bg-neon-yellow/10" : ""}
                        `}
                        whileHover={!isRevealed ? { scale: 1.02 } : {}}
                        whileTap={!isRevealed ? { scale: 0.98 } : {}}
                      >
                        <div className="flex items-center gap-4">
                          <div
                            className={`
                              w-12 h-12 rounded-full flex items-center justify-center
                              font-bold text-xl
                              ${
                                isRevealed && isCorrect
                                  ? "bg-neon-green text-black"
                                  : "bg-gray-700 text-white"
                              }
                            `}
                          >
                            {option.label}
                          </div>
                          <div className="text-lg font-semibold">{option.text}</div>
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

