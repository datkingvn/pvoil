"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { useHotkeys } from "react-hotkeys-hook";
import { useGameStore } from "@/lib/store";
import { useBroadcastSync } from "@/hooks/useBroadcastSync";
import { questions, roundNames } from "@/lib/questions";
import { RoundType, PlayerId } from "@/lib/types";
import { Timer } from "@/components/Timer";
import { QuestionDisplay } from "@/components/QuestionDisplay";
import { PlayerCard } from "@/components/PlayerCard";
import {
  Play,
  Pause,
  RotateCcw,
  Lock,
  Eye,
  ArrowRight,
  Plus,
  Minus,
  RotateCw,
} from "lucide-react";

export default function ControlPage() {
  useBroadcastSync(); // Sync with other tabs

  const {
    currentRound,
    selectedQuestionId,
    currentQuestion,
    gameStatus,
    timerRunning,
    players,
    selectedPlayerId,
    setRound,
    selectQuestion,
    openQuestion,
    lockBuzz,
    revealAnswer,
    nextQuestion,
    timerStart,
    timerPause,
    timerReset,
    scoreAdd,
    scoreSet,
    setSelectedPlayer,
    resetGame,
  } = useGameStore();

  // Hotkeys
  useHotkeys("space", (e) => {
    e.preventDefault();
    if (timerRunning) timerPause();
    else timerStart();
  });

  useHotkeys("o", (e) => {
    e.preventDefault();
    if (currentQuestion && gameStatus === "waiting") openQuestion();
  });

  useHotkeys("l", (e) => {
    e.preventDefault();
    if (gameStatus === "question-open") lockBuzz();
  });

  useHotkeys("r", (e) => {
    e.preventDefault();
    if (gameStatus === "buzz-locked" || gameStatus === "question-open") revealAnswer();
  });

  useHotkeys("n", (e) => {
    e.preventDefault();
    nextQuestion();
  });

  useHotkeys("1", () => setSelectedPlayer("A"));
  useHotkeys("2", () => setSelectedPlayer("B"));
  useHotkeys("3", () => setSelectedPlayer("C"));
  useHotkeys("4", () => setSelectedPlayer("D"));

  useHotkeys("=", () => {
    if (selectedPlayerId) scoreAdd(selectedPlayerId, 5);
  });

  useHotkeys("-", () => {
    if (selectedPlayerId) scoreAdd(selectedPlayerId, -5);
  });

  const currentRoundQuestions = currentRound ? questions[currentRound] : [];

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-neon-blue mb-6">Điều khiển MC</h1>

        <div className="grid grid-cols-3 gap-6">
          {/* Left: Round & Questions */}
          <div className="space-y-4">
            <div className="bg-gray-800 rounded-lg p-4">
              <h2 className="text-xl font-bold mb-4">Chọn vòng thi</h2>
              <div className="grid grid-cols-2 gap-2">
                {(Object.keys(roundNames) as RoundType[]).map((round) => (
                  <button
                    key={round}
                    onClick={() => setRound(round)}
                    className={`p-3 rounded-lg text-sm font-semibold transition-all ${
                      currentRound === round
                        ? "bg-neon-blue text-black"
                        : "bg-gray-700 hover:bg-gray-600"
                    }`}
                  >
                    {roundNames[round]}
                  </button>
                ))}
              </div>
            </div>

            {currentRound && (
              <div className="bg-gray-800 rounded-lg p-4">
                <h2 className="text-xl font-bold mb-4">Danh sách câu hỏi</h2>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {currentRoundQuestions.map((q) => (
                    <button
                      key={q.id}
                      onClick={() => selectQuestion(q.id)}
                      className={`w-full p-3 rounded-lg text-left transition-all ${
                        selectedQuestionId === q.id
                          ? "bg-neon-purple text-white"
                          : "bg-gray-700 hover:bg-gray-600"
                      }`}
                    >
                      <div className="font-semibold">{q.text.substring(0, 40)}...</div>
                      <div className="text-xs text-gray-400 mt-1">
                        {q.points} điểm • {q.timeLimitSec}s
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Center: Preview */}
          <div className="space-y-4">
            <div className="bg-gray-800 rounded-lg p-4">
              <h2 className="text-xl font-bold mb-4">Preview Stage</h2>
              <div className="h-[300px] mb-4">
                <QuestionDisplay />
              </div>
              <div className="flex items-center justify-center mb-4">
                <Timer />
              </div>
              <div className="grid grid-cols-2 gap-2">
                {players.map((player) => (
                  <PlayerCard key={player.id} player={player} />
                ))}
              </div>
            </div>
          </div>

          {/* Right: Controls */}
          <div className="space-y-4">
            <div className="bg-gray-800 rounded-lg p-4">
              <h2 className="text-xl font-bold mb-4">Điều khiển</h2>
              <div className="space-y-2">
                <button
                  onClick={openQuestion}
                  disabled={!currentQuestion || gameStatus !== "waiting"}
                  className="w-full p-3 bg-neon-blue text-black rounded-lg font-semibold hover:bg-neon-blue/80 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Eye className="w-5 h-5" />
                  Mở câu hỏi (O)
                </button>

                <button
                  onClick={lockBuzz}
                  disabled={gameStatus !== "question-open"}
                  className="w-full p-3 bg-neon-yellow text-black rounded-lg font-semibold hover:bg-neon-yellow/80 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Lock className="w-5 h-5" />
                  Khóa chuông (L)
                </button>

                <button
                  onClick={revealAnswer}
                  disabled={gameStatus === "waiting" || gameStatus === "answer-revealed"}
                  className="w-full p-3 bg-neon-green text-black rounded-lg font-semibold hover:bg-neon-green/80 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Eye className="w-5 h-5" />
                  Hiện đáp án (R)
                </button>

                <button
                  onClick={nextQuestion}
                  className="w-full p-3 bg-neon-purple text-white rounded-lg font-semibold hover:bg-neon-purple/80 flex items-center justify-center gap-2"
                >
                  <ArrowRight className="w-5 h-5" />
                  Câu tiếp theo (N)
                </button>

                <div className="border-t border-gray-700 my-4" />

                <div className="flex gap-2">
                  <button
                    onClick={timerStart}
                    disabled={timerRunning}
                    className="flex-1 p-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <Play className="w-4 h-4" />
                    Start
                  </button>
                  <button
                    onClick={timerPause}
                    disabled={!timerRunning}
                    className="flex-1 p-3 bg-yellow-600 text-white rounded-lg font-semibold hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <Pause className="w-4 h-4" />
                    Pause
                  </button>
                  <button
                    onClick={timerReset}
                    className="flex-1 p-3 bg-gray-600 text-white rounded-lg font-semibold hover:bg-gray-700 flex items-center justify-center gap-2"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Reset
                  </button>
                </div>
              </div>
            </div>

            {/* Score Control */}
            <div className="bg-gray-800 rounded-lg p-4">
              <h2 className="text-xl font-bold mb-4">Chấm điểm</h2>
              <div className="space-y-2">
                {players.map((player) => (
                  <div
                    key={player.id}
                    className={`p-3 rounded-lg border-2 transition-all ${
                      selectedPlayerId === player.id
                        ? "border-neon-blue bg-neon-blue/10"
                        : "border-gray-700 bg-gray-700/50"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold">
                        {player.id}: {player.name}
                      </span>
                      <span className="text-neon-green font-bold">{player.score}</span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setSelectedPlayer(player.id)}
                        className="flex-1 px-2 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-500"
                      >
                        Chọn
                      </button>
                      <button
                        onClick={() => scoreAdd(player.id, 5)}
                        className="px-2 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                      >
                        +5
                      </button>
                      <button
                        onClick={() => scoreAdd(player.id, 10)}
                        className="px-2 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                      >
                        +10
                      </button>
                      <button
                        onClick={() => scoreAdd(player.id, 20)}
                        className="px-2 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                      >
                        +20
                      </button>
                      <button
                        onClick={() => scoreAdd(player.id, -5)}
                        className="px-2 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                      >
                        -5
                      </button>
                    </div>
                    {selectedPlayerId === player.id && (
                      <div className="mt-2 flex gap-2">
                        <input
                          type="number"
                          placeholder="Set điểm"
                          className="flex-1 px-2 py-1 bg-gray-700 rounded text-sm"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              const value = parseInt(e.currentTarget.value);
                              if (!isNaN(value)) scoreSet(player.id, value);
                              e.currentTarget.value = "";
                            }
                          }}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Reset */}
            <button
              onClick={resetGame}
              className="w-full p-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 flex items-center justify-center gap-2"
            >
              <RotateCw className="w-5 h-5" />
              Reset Game
            </button>
          </div>
        </div>

        {/* Hotkeys Help */}
        <div className="mt-6 bg-gray-800 rounded-lg p-4">
          <h2 className="text-lg font-bold mb-2">Phím tắt:</h2>
          <div className="grid grid-cols-4 gap-2 text-sm text-gray-400">
            <div>Space: Start/Pause timer</div>
            <div>O: Mở câu hỏi</div>
            <div>L: Khóa chuông</div>
            <div>R: Hiện đáp án</div>
            <div>N: Câu tiếp theo</div>
            <div>1/2/3/4: Chọn thí sinh</div>
            <div>+/-: Cộng/trừ điểm</div>
          </div>
        </div>
      </div>
    </div>
  );
}

