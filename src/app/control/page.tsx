"use client";

import { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import { useHotkeys } from "react-hotkeys-hook";
import { useGameStore } from "@/lib/store";
import { useBroadcastSync } from "@/hooks/useBroadcastSync";
import { roundNames } from "@/lib/questions";
import { RoundType } from "@/lib/types";
import { Timer } from "@/components/Timer";
import { QuestionDisplay } from "@/components/QuestionDisplay";
import { TeamCard } from "@/components/TeamCard";
import { Toast } from "@/components/Toast";
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
  CheckCircle,
  XCircle,
  Users,
  LogOut,
  FileText,
} from "lucide-react";
import Link from "next/link";
import { useMcAuth } from "@/hooks/useMcAuth";

export default function ControlPage() {
  useBroadcastSync(); // Sync with other tabs
  const { user, logout } = useMcAuth();
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const lastCheckedRoundRef = useRef<RoundType | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastToastRoundRef = useRef<RoundType | null>(null);

  const {
    currentRound,
    selectedQuestionId,
    currentQuestion,
    gameStatus,
    timerRunning,
    teams,
    selectedTeamId,
    khoiDongActiveTeamId,
    khoiDongQuestionIndex,
    khoiDongAnsweredCount,
    khoiDongStarted,
    khoiDongSelectedPackage,
    khoiDongTeamPackages,
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
    setSelectedTeam,
    resetGame,
    loadTeams,
    setKhoiDongTeam,
    selectKhoiDongPackage,
    startKhoiDong,
    markKhoiDongAnswer,
    loadQuestions,
    questions,
    khoiDongPackages,
  } = useGameStore();

  useEffect(() => {
    loadTeams();
  }, [loadTeams]);

  // Listen for questions updated event from questions management page
  useEffect(() => {
    const handleQuestionsUpdated = (event: CustomEvent) => {
      const { round } = event.detail;
      if (round && round === currentRound) {
        loadQuestions(round);
      }
    };

    window.addEventListener("questions-updated" as any, handleQuestionsUpdated);
    return () => {
      window.removeEventListener("questions-updated" as any, handleQuestionsUpdated);
    };
  }, [currentRound, loadQuestions]);

  useEffect(() => {
    if (currentRound && currentRound !== lastCheckedRoundRef.current) {
      lastCheckedRoundRef.current = currentRound;
      loadQuestions(currentRound);
    }
  }, [currentRound, loadQuestions]);

  useEffect(() => {
    if (currentRound) {
      // Check if questions are loaded after loadQuestions completes
      const hasQuestions = currentRound === "khoi-dong"
        ? khoiDongPackages.some((pkg) => pkg.length > 0)
        : questions[currentRound]?.length > 0;

      // Only show toast if we haven't shown it for this round yet, or if questions changed
      if (!hasQuestions && currentRound === lastCheckedRoundRef.current && currentRound !== lastToastRoundRef.current) {
        // Clear any existing toast timeout
        if (toastTimeoutRef.current) {
          clearTimeout(toastTimeoutRef.current);
        }
        
        lastToastRoundRef.current = currentRound;
        setToast({
          message: `Chưa có câu hỏi nào cho vòng ${roundNames[currentRound]}. Vui lòng thêm câu hỏi trong trang Quản lý câu hỏi.`,
          type: "error",
        });
        
        toastTimeoutRef.current = setTimeout(() => {
          setToast(null);
          toastTimeoutRef.current = null;
        }, 5000);
      } else if (hasQuestions && currentRound === lastToastRoundRef.current) {
        // Clear toast nếu đã có câu hỏi cho round đã hiển thị toast
        lastToastRoundRef.current = null;
        if (toastTimeoutRef.current) {
          clearTimeout(toastTimeoutRef.current);
          toastTimeoutRef.current = null;
        }
        setToast(null);
      }
    } else {
      // Reset toast round ref when no round is selected
      lastToastRoundRef.current = null;
    }
    
    // Cleanup timeout on unmount
    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, [currentRound, khoiDongPackages, questions]);

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

  useHotkeys("=", () => {
    if (selectedTeamId) scoreAdd(selectedTeamId, 5);
  });

  useHotkeys("-", () => {
    if (selectedTeamId) scoreAdd(selectedTeamId, -5);
  });

  const currentRoundQuestions = currentRound ? (questions[currentRound] || []) : [];

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Toast Notification - Fixed at top */}
        {toast && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50">
            <Toast
              message={toast.message}
              type={toast.type}
              onClose={() => setToast(null)}
            />
          </div>
        )}

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-neon-blue">Điều khiển MC</h1>
            {user && (
              <p className="text-sm text-neon-purple mt-1">
                Đăng nhập với: {user.username}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/control/questions"
              className="px-4 py-2 bg-gray-800 border-2 border-neon-yellow text-neon-yellow rounded-lg font-semibold hover:bg-gray-700 flex items-center gap-2"
            >
              <FileText className="w-5 h-5 text-neon-yellow" />
              Quản lý câu hỏi
            </Link>
            <Link
              href="/control/teams"
              className="px-4 py-2 bg-neon-purple text-white rounded-lg font-semibold hover:bg-neon-purple/80 flex items-center gap-2"
            >
              <Users className="w-5 h-5" />
              Quản lý đội thi
            </Link>
            {user && (
              <button
                onClick={logout}
                className="px-4 py-2 bg-red-600/20 border border-red-600 text-red-400 rounded-lg hover:bg-red-600/30 transition-colors flex items-center gap-2"
                title="Đăng xuất"
              >
                <LogOut className="w-5 h-5" />
                Đăng xuất
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Left: Round & Questions */}
          <div className="space-y-4">
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <h2 className="text-xl font-bold mb-4 text-white">Chọn vòng thi</h2>
              <div className="grid grid-cols-2 gap-2">
                {(Object.keys(roundNames) as RoundType[]).map((round) => (
                  <button
                    key={round}
                    onClick={() => setRound(round)}
                    className={`p-3 rounded-lg text-sm font-semibold transition-all ${
                      currentRound === round
                        ? "bg-neon-blue text-white border-2 border-neon-blue shadow-lg shadow-neon-blue/50"
                        : "bg-gray-700 text-gray-200 hover:bg-gray-600 border-2 border-gray-600"
                    }`}
                  >
                    {roundNames[round]}
                  </button>
                ))}
              </div>
            </div>

            {currentRound === "khoi-dong" ? (
              <div className="bg-gray-800 rounded-lg p-4 space-y-4 border border-gray-700">
                <h2 className="text-xl font-bold mb-4 text-white">Vòng Khởi động</h2>
                
                {/* Chọn đội thi - Bước 1 */}
                <div>
                  <h3 className="text-lg font-semibold mb-2 text-white">Bước 1: Chọn đội thi</h3>
                  <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto">
                    {teams.map((team) => {
                      const teamPackage = khoiDongTeamPackages[team.teamId];
                      return (
                        <button
                          key={team.teamId}
                          onClick={() => setKhoiDongTeam(team.teamId)}
                          className={`p-3 rounded-lg font-semibold transition-all text-left border-2 ${
                            khoiDongActiveTeamId === team.teamId
                              ? "bg-neon-blue text-white border-neon-blue shadow-lg shadow-neon-blue/50"
                              : "bg-gray-700 text-gray-200 hover:bg-gray-600 border-gray-600"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-semibold">{team.teamName}</span>
                            {teamPackage && (
                              <span className="text-xs bg-neon-green/20 text-neon-green px-2 py-1 rounded border border-neon-green">
                                Đã chọn: Gói {teamPackage}
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Chọn gói câu hỏi - Bước 2 */}
                {khoiDongActiveTeamId && !khoiDongStarted && (
                  <div>
                    <h3 className="text-lg font-semibold mb-2 text-white">Bước 2: Chọn gói câu hỏi</h3>
                    <div className="grid grid-cols-2 gap-2">
                      {[1, 2, 3, 4].map((packageNum) => {
                        // Kiểm tra gói đã được chọn bởi đội khác chưa
                        const packageTakenBy = Object.entries(khoiDongTeamPackages).find(
                          ([teamId, pkg]) => pkg === packageNum && teamId !== khoiDongActiveTeamId
                        );
                        const isTaken = !!packageTakenBy;
                        const isSelected = khoiDongSelectedPackage === packageNum;
                        const currentTeamPackage = khoiDongTeamPackages[khoiDongActiveTeamId];
                        
                        return (
                          <button
                            key={packageNum}
                            onClick={() => !isTaken && selectKhoiDongPackage(packageNum)}
                            disabled={isTaken}
                            className={`p-3 rounded-lg font-semibold transition-all border-2 ${
                              isSelected
                                ? "bg-neon-purple text-white border-neon-purple shadow-lg shadow-neon-purple/50"
                                : isTaken
                                ? "bg-gray-800/50 text-gray-500 border-gray-700 opacity-60 cursor-not-allowed"
                                : "bg-gray-700 text-gray-200 hover:bg-gray-600 border-gray-600"
                            }`}
                            title={isTaken ? `Gói này đã được chọn bởi đội khác` : ""}
                          >
                            Gói {packageNum}
                            {isTaken && " (Đã chọn)"}
                            {isSelected && !isTaken && " ✓"}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Bắt đầu */}
                {khoiDongSelectedPackage && khoiDongActiveTeamId && !khoiDongStarted && (
                  <div className="space-y-2">
                    {!khoiDongStarted ? (
                      <button
                        onClick={() => {
                          const packageIndex = khoiDongSelectedPackage - 1;
                          const packageQuestions = khoiDongPackages[packageIndex];
                          if (!packageQuestions || packageQuestions.length === 0) {
                            // Clear any existing toast timeout
                            if (toastTimeoutRef.current) {
                              clearTimeout(toastTimeoutRef.current);
                            }
                            
                            setToast({
                              message: `Gói ${khoiDongSelectedPackage} chưa có câu hỏi. Vui lòng thêm câu hỏi trong trang Quản lý câu hỏi.`,
                              type: "error",
                            });
                            
                            toastTimeoutRef.current = setTimeout(() => {
                              setToast(null);
                              toastTimeoutRef.current = null;
                            }, 5000);
                            return;
                          }
                          startKhoiDong();
                        }}
                        className="w-full p-3 bg-neon-green text-white rounded-lg font-bold hover:bg-neon-green/90 flex items-center justify-center gap-2 border-2 border-neon-green shadow-lg shadow-neon-green/40 transition-all"
                      >
                        <Play className="w-5 h-5 text-white" />
                        Bắt đầu
                      </button>
                    ) : (
                      <div className="text-sm text-neon-green font-semibold text-center">
                        Đang thi: {teams.find((t) => t.teamId === khoiDongActiveTeamId)?.teamName} - Gói {khoiDongSelectedPackage}
                      </div>
                    )}
                    {khoiDongStarted && (
                      <div className="text-sm text-gray-400 text-center">
                        Đã trả lời: {khoiDongAnsweredCount} / 12 câu
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              currentRound && (
                <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                  <h2 className="text-xl font-bold mb-4 text-white">Danh sách câu hỏi</h2>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {currentRoundQuestions.map((q) => (
                      <button
                        key={q.id}
                      onClick={() => selectQuestion(q.id)}
                      className={`w-full p-3 rounded-lg text-left transition-all border ${
                        selectedQuestionId === q.id
                          ? "bg-neon-purple text-white border-neon-purple shadow-md"
                          : "bg-gray-700 text-gray-200 hover:bg-gray-600 border-gray-600"
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
              )
            )}
          </div>

          {/* Center: Preview */}
          <div className="space-y-4">
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <h2 className="text-xl font-bold mb-4 text-white">Preview Stage</h2>
              <div className="h-[300px] mb-4">
                <QuestionDisplay hideQAType={true} />
              </div>
              <div className="flex items-center justify-center mb-6">
                <Timer />
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {teams.map((team) => (
                  <TeamCard key={team.teamId} team={team} />
                ))}
              </div>
            </div>
          </div>

          {/* Right: Controls */}
          <div className="space-y-4">
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <h2 className="text-xl font-bold mb-4 text-white">Điều khiển</h2>
              <div className="space-y-2">
                {currentRound === "khoi-dong" && khoiDongStarted ? (
                  <>
                    <div className="text-sm text-gray-400 mb-2 text-center">
                      Câu {khoiDongAnsweredCount + 1} / 12
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => markKhoiDongAnswer(true)}
                        disabled={khoiDongAnsweredCount >= 12}
                        className="p-4 bg-neon-green text-white rounded-lg font-semibold hover:bg-neon-green/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 border border-neon-green shadow-md"
                      >
                        <CheckCircle className="w-5 h-5" />
                        Đúng (+10)
                      </button>
                      <button
                        onClick={() => markKhoiDongAnswer(false)}
                        disabled={khoiDongAnsweredCount >= 12}
                        className="p-4 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 border border-red-500 shadow-md"
                      >
                        <XCircle className="w-5 h-5" />
                        Sai
                      </button>
                    </div>
                    {khoiDongAnsweredCount >= 12 && (
                      <div className="text-center text-neon-yellow font-semibold mt-2">
                        Đã hoàn thành 12 câu!
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => {
                        if (!currentQuestion) {
                          // Clear any existing toast timeout
                          if (toastTimeoutRef.current) {
                            clearTimeout(toastTimeoutRef.current);
                          }
                          
                          setToast({
                            message: "Vui lòng chọn câu hỏi trước",
                            type: "error",
                          });
                          
                          toastTimeoutRef.current = setTimeout(() => {
                            setToast(null);
                            toastTimeoutRef.current = null;
                          }, 3000);
                          return;
                        }
                        if (gameStatus !== "waiting") {
                          return;
                        }
                        openQuestion();
                      }}
                      disabled={!currentQuestion || gameStatus !== "waiting"}
                      className="w-full p-3 bg-neon-blue text-white rounded-lg font-semibold hover:bg-neon-blue/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 border border-neon-blue shadow-md"
                    >
                      <Eye className="w-5 h-5" />
                      Mở câu hỏi (O)
                    </button>

                    <button
                      onClick={lockBuzz}
                      disabled={gameStatus !== "question-open"}
                      className="w-full p-3 bg-neon-yellow text-black rounded-lg font-semibold hover:bg-neon-yellow/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 border border-neon-yellow shadow-md"
                    >
                      <Lock className="w-5 h-5" />
                      Khóa chuông (L)
                    </button>

                    <button
                      onClick={revealAnswer}
                      disabled={gameStatus === "waiting" || gameStatus === "answer-revealed"}
                      className="w-full p-3 bg-neon-green text-white rounded-lg font-semibold hover:bg-neon-green/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 border border-neon-green shadow-md"
                    >
                      <Eye className="w-5 h-5" />
                      Hiện đáp án (R)
                    </button>

                    <button
                      onClick={nextQuestion}
                      className="w-full p-3 bg-neon-purple text-white rounded-lg font-semibold hover:bg-neon-purple/90 flex items-center justify-center gap-2 border border-neon-purple shadow-md"
                    >
                      <ArrowRight className="w-5 h-5" />
                      Câu tiếp theo (N)
                    </button>
                  </>
                )}

                <div className="border-t border-gray-700 my-4" />

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      if (timerRunning) {
                        timerPause();
                      } else {
                        timerStart();
                      }
                    }}
                    className="flex-1 p-3 bg-yellow-600 text-white rounded-lg font-semibold hover:bg-yellow-700 flex items-center justify-center gap-2"
                  >
                    {timerRunning ? (
                      <>
                        <Pause className="w-4 h-4" />
                        Tạm dừng
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4" />
                        Tiếp tục
                      </>
                    )}
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

            {/* Score Control - Ẩn trong phần thi khởi động */}
            {currentRound !== "khoi-dong" && (
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <h2 className="text-xl font-bold mb-4 text-white">Chấm điểm</h2>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {teams.map((team) => (
                  <div
                    key={team.teamId}
                    className={`p-3 rounded-lg border-2 transition-all ${
                      selectedTeamId === team.teamId
                        ? "border-neon-blue bg-neon-blue/20 shadow-md shadow-neon-blue/30"
                        : "border-gray-600 bg-gray-700/70"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-white">
                        {team.teamName}
                      </span>
                      <span className="text-neon-green font-bold text-xl">{team.score}</span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setSelectedTeam(team.teamId)}
                        className="flex-1 px-2 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-500"
                      >
                        Chọn
                      </button>
                      <button
                        onClick={() => scoreAdd(team.teamId, 5)}
                        className="px-2 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                      >
                        +5
                      </button>
                      <button
                        onClick={() => scoreAdd(team.teamId, 10)}
                        className="px-2 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                      >
                        +10
                      </button>
                      <button
                        onClick={() => scoreAdd(team.teamId, 20)}
                        className="px-2 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                      >
                        +20
                      </button>
                      <button
                        onClick={() => scoreAdd(team.teamId, -5)}
                        className="px-2 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                      >
                        -5
                      </button>
                    </div>
                    {selectedTeamId === team.teamId && (
                      <div className="mt-2 flex gap-2">
                        <input
                          type="number"
                          placeholder="Set điểm"
                          className="flex-1 px-2 py-1 bg-gray-700 rounded text-sm"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              const value = parseInt(e.currentTarget.value);
                              if (!isNaN(value)) scoreSet(team.teamId, value);
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
            )}

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
        <div className="mt-6 bg-gray-800 rounded-lg p-4 border border-gray-700">
          <h2 className="text-lg font-bold mb-2 text-white">Phím tắt:</h2>
          <div className="grid grid-cols-4 gap-2 text-sm text-gray-300">
            <div>Space: Start/Pause timer</div>
            <div>O: Mở câu hỏi</div>
            <div>L: Khóa chuông</div>
            <div>R: Hiện đáp án</div>
            <div>N: Câu tiếp theo</div>
            <div>+/-: Cộng/trừ điểm (khi đã chọn đội thi)</div>
          </div>
        </div>
      </div>
    </div>
  );
}

