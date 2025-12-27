"use client";

import { useEffect, useState, useRef, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useHotkeys } from "react-hotkeys-hook";
import { useGameStore } from "@/lib/store";
import { useBroadcastSync } from "@/hooks/useBroadcastSync";
import { useGameWebSocket } from "@/hooks/useGameWebSocket";
import { roundNames } from "@/lib/questions";
import { RoundType } from "@/lib/types";
import { QuestionDisplay } from "@/components/QuestionDisplay";
import { TeamCard } from "@/components/TeamCard";
import { Toast } from "@/components/Toast";
import { Logo } from "@/components/Logo";
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

// Component timer riêng để tránh re-render control page mỗi giây
const ControlTimer = memo(() => {
  const timerSeconds = useGameStore((state) => state.timerSeconds);
  return (
    <div className="absolute bottom-4 right-4 bg-black/60 px-4 py-2 rounded-lg border border-neon-blue/40 shadow-lg shadow-black/40">
      <div
        className={`text-2xl font-bold tabular-nums ${
          timerSeconds <= 5 && timerSeconds > 0 ? "text-red-400" : "text-neon-blue"
        }`}
      >
        {String(Math.floor(timerSeconds / 60)).padStart(2, "0")}:
        {String(timerSeconds % 60).padStart(2, "0")}
      </div>
    </div>
  );
});
ControlTimer.displayName = "ControlTimer";

export default function ControlPage() {
  useBroadcastSync(); // Sync với các tab cùng máy
  useGameWebSocket("mc"); // Sync qua WebSocket với các thiết bị khác
  const { user, logout } = useMcAuth();
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const lastCheckedRoundRef = useRef<RoundType | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastToastRoundRef = useRef<RoundType | null>(null);
  const [showRound2ConfirmModal, setShowRound2ConfirmModal] = useState(false);
  const [showRound3ConfirmModal, setShowRound3ConfirmModal] = useState(false);
  const [round2State, setRound2State] = useState<any>(null);
  const [round3State, setRound3State] = useState<any>(null);

  const {
    currentRound,
    selectedQuestionId,
    currentQuestion,
    gameStatus,
    timerRunning,
    timerSeconds,
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
      // Poll state mỗi 2 giây để sync (tối ưu để tránh giật UI)
      const interval = setInterval(loadRound2State, 2000);
      return () => clearInterval(interval);
    } else {
      setRound2State(null);
    }
  }, [currentRound]);

  // Load round3 state khi ở vòng 3
  useEffect(() => {
    if (currentRound === "tang-toc") {
      const loadRound3State = async () => {
        try {
          const res = await fetch("/api/round3/state");
          const data = await res.json();
          setRound3State(data);
        } catch (error) {
          console.error("Error loading round3 state:", error);
        }
      };
      loadRound3State();
      // Poll state mỗi 2 giây để sync
      const interval = setInterval(loadRound3State, 2000);
      return () => clearInterval(interval);
    } else {
      setRound3State(null);
    }
  }, [currentRound]);

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
      // Vòng 2 sử dụng round2State.config.questions thay vì questions[currentRound]
      let hasQuestions = false;
      if (currentRound === "khoi-dong") {
        hasQuestions = khoiDongPackages.some((pkg) => pkg.length > 0);
      } else if (currentRound === "vuot-chuong-ngai-vat") {
        // Kiểm tra round2State.config.questions cho vòng 2
        hasQuestions = round2State?.config?.questions?.length > 0 && 
          round2State.config.questions.some((q: any) => q.questionText && q.questionText.trim() !== "");
      } else if (currentRound === "tang-toc") {
        // Kiểm tra round3State.config.questions cho vòng 3
        hasQuestions = round3State?.config?.questions?.length > 0 && 
          round3State.config.questions.some((q: any) => q.questionText && q.questionText.trim() !== "");
      } else {
        hasQuestions = questions[currentRound]?.length > 0;
      }

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
  }, [currentRound, khoiDongPackages, questions, round2State]);

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
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 relative overflow-hidden">
      <div className="absolute inset-0 bg-radial-gradient bg-grid-soft opacity-80 pointer-events-none" />
      <div className="max-w-7xl mx-auto relative z-10 p-6">
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

        <div className="flex items-center justify-between mb-6 panel-elevated px-6 py-4">
          <div className="flex items-center gap-6">
            <Logo logoClassName="w-32" textClassName="text-sm" />
            <div>
              <h1 className="text-3xl font-bold text-neon-blue">Điều khiển MC</h1>
              {user && (
                <p className="text-sm text-neon-purple mt-1">
                  Đăng nhập với: {user.username}
                </p>
              )}
            </div>
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
                    onClick={() => {
                      if (round === "vuot-chuong-ngai-vat" && currentRound !== "vuot-chuong-ngai-vat") {
                        // Hiển thị modal xác nhận khi chuyển sang vòng 2
                        setShowRound2ConfirmModal(true);
                      } else if (round === "tang-toc" && currentRound !== "tang-toc") {
                        // Hiển thị modal xác nhận khi chuyển sang vòng 3
                        setShowRound3ConfirmModal(true);
                      } else {
                        setRound(round);
                      }
                    }}
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

            {currentRound === "vuot-chuong-ngai-vat" ? (
              <div className="bg-gray-800 rounded-lg p-4 space-y-4 border border-gray-700">
                <h2 className="text-xl font-bold mb-4 text-white">Vòng 2: Vượt chướng ngại vật</h2>
                
                {/* Chọn đội thi - Bước 1 */}
                <div>
                  <h3 className="text-lg font-semibold mb-2 text-white">Bước 1: Chọn đội thi</h3>
                  {!round2State?.teams || round2State.teams.length === 0 ? (
                    <div className="text-gray-400 text-sm">Đang tải danh sách đội...</div>
                  ) : (
                    <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto">
                      {round2State.teams.map((team: any) => (
                        <button
                          key={team.id}
                          onClick={async () => {
                            try {
                              const res = await fetch("/api/round2/state", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                  action: "setGameState",
                                  data: { activeTeamId: team.id },
                                }),
                              });
                              // Reload state ngay sau khi chọn đội
                              if (res.ok) {
                                const data = await res.json();
                                setRound2State(data.state);
                              }
                            } catch (error) {
                              console.error("Error selecting team:", error);
                            }
                          }}
                          className={`p-3 rounded-lg font-semibold transition-all text-left border-2 ${
                            round2State?.gameState?.activeTeamId === team.id
                              ? "bg-neon-blue text-white border-neon-blue shadow-lg shadow-neon-blue/50"
                              : "bg-gray-700 text-gray-200 hover:bg-gray-600 border-gray-600"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-semibold">{team.name}</span>
                            <span className="text-sm opacity-80">{team.score} điểm</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Chọn tile - Bước 2 */}
                {round2State?.gameState?.activeTeamId && (
                  <div>
                    {!round2State?.config ? (
                      <div className="p-4 bg-yellow-900/30 border border-yellow-700 rounded-lg">
                        <div className="text-yellow-400 text-sm font-semibold mb-1">
                          ⚠️ Chưa có config
                        </div>
                        <div className="text-gray-400 text-xs">
                          Vui lòng tạo config trong trang Quản lý câu hỏi trước
                        </div>
                      </div>
                    ) : (
                      <>
                    <h3 className="text-lg font-semibold mb-2 text-white">Bước 2: Chọn tile (1-4)</h3>
                    <div className="grid grid-cols-4 gap-2">
                      {[1, 2, 3, 4].map((tileId) => {
                        const question = round2State.config.questions.find((q: any) => q.id === tileId);
                        const isAvailable = question?.tileStatus === "hidden";
                        const isSelected = round2State.gameState?.activeQuestionId === tileId;
                        const isRevealed = question?.tileStatus === "revealed";
                        const isWrong = question?.tileStatus === "wrong";
                        
                        return (
                          <button
                            key={tileId}
                            onClick={async () => {
                              if (!isAvailable) return;
                              
                              // KHÔNG thay đổi tileStatus, chỉ set gameState
                              // Tile vẫn giữ status "hidden" cho đến khi MC xác nhận đúng

                              try {
                                // Chỉ set tile_selected, không tự động mở câu hỏi
                                const res = await fetch("/api/round2/state", {
                                  method: "POST",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({
                                    action: "setGameState",
                                    data: {
                                      status: "tile_selected",
                                      activeQuestionId: tileId,
                                      timeLeft: 15,
                                      teamAnswers: [], // Reset đáp án khi chọn tile mới
                                    },
                                  }),
                                });
                                // Reload state ngay
                                if (res.ok) {
                                  const data = await res.json();
                                  setRound2State(data.state);
                                }
                              } catch (error) {
                                console.error("Error selecting tile:", error);
                              }
                            }}
                            disabled={!isAvailable}
                            className={`p-4 rounded-lg font-bold transition-all border-2 ${
                              isSelected
                                ? "bg-neon-purple text-white border-neon-purple shadow-lg shadow-neon-purple/50"
                                : isRevealed
                                ? "bg-green-700/50 text-green-300 border-green-600 cursor-not-allowed"
                                : isWrong
                                ? "bg-red-700/50 text-red-300 border-red-600 cursor-not-allowed"
                                : isAvailable
                                ? "bg-gray-700 text-gray-200 hover:bg-gray-600 border-gray-600"
                                : "bg-gray-800/50 text-gray-500 border-gray-700 opacity-60 cursor-not-allowed"
                            }`}
                            title={
                              isRevealed
                                ? "Tile đã được mở"
                                : isWrong
                                ? "Tile đã trả lời sai"
                                : isAvailable
                                ? `Chọn tile ${tileId}`
                                : "Tile không khả dụng"
                            }
                          >
                            <div className="text-2xl mb-1">{tileId}</div>
                            <div className="text-xs">
                              {isRevealed ? "✓" : isWrong ? "✗" : isAvailable ? "Chọn" : "Đã dùng"}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                    
                    {/* Hiển thị câu hỏi đã chọn và nút Bắt đầu */}
                    {round2State.gameState?.status === "tile_selected" && round2State.gameState?.activeQuestionId && (
                      <div className="mt-4 p-3 bg-gray-700 rounded-lg border border-gray-600">
                        <div className="text-sm text-gray-400 mb-1">Tile đã chọn:</div>
                        <div className="text-white font-medium mb-3">
                          {round2State.config.questions.find(
                            (q: any) => q.id === round2State.gameState.activeQuestionId
                          )?.questionText || "Đang tải..."}
                        </div>
                        <button
                          onClick={async () => {
                            try {
                              const res = await fetch("/api/round2/state", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                  action: "setGameState",
                                  data: {
                                    status: "question_open",
                                    timeLeft: 15,
                                    teamAnswers: [], // Reset đáp án khi bắt đầu câu hỏi mới
                                    buzzerPresses: [], // Reset buzzer khi bắt đầu câu hỏi mới
                                    buzzerTeamId: null,
                                    buzzerTeamName: null,
                                    buzzerTimestamp: null,
                                  },
                                }),
                              });
                              // Reload state ngay
                              if (res.ok) {
                                const data = await res.json();
                                setRound2State(data.state);
                              }
                            } catch (error) {
                              console.error("Error starting question:", error);
                            }
                          }}
                          className="w-full px-4 py-2 bg-neon-green text-white rounded-lg font-bold hover:bg-neon-green/80 transition-colors flex items-center justify-center gap-2"
                        >
                          <Play className="w-5 h-5" />
                          Bắt đầu (15s)
                        </button>
                      </div>
                    )}

                    {/* Hiển thị câu hỏi đang mở */}
                    {round2State.gameState?.status === "question_open" && round2State.gameState?.activeQuestionId && (
                      <div className="mt-4 p-3 bg-gray-700 rounded-lg border border-gray-600">
                        <div className="text-sm text-gray-400 mb-1">Câu hỏi đang mở:</div>
                        <div className="text-white font-medium">
                          {round2State.config.questions.find(
                            (q: any) => q.id === round2State.gameState.activeQuestionId
                          )?.questionText || "Đang tải..."}
                        </div>
                        <div className="text-sm text-gray-400 mt-2">
                          Thời gian: {round2State.gameState.timeLeft}s
                        </div>
                      </div>
                    )}

                      </>
                    )}
                        </div>
                )}

                {/* Thông tin trạng thái */}
                {round2State?.gameState && (
                  <div className="text-sm text-gray-400 mt-4">
                    Trạng thái: {round2State.gameState.status}
                    {round2State.gameState.guessedKeywordCorrect && (
                      <span className="text-green-400 ml-2">✓ Đã đoán đúng keyword</span>
                    )}
                        </div>
                )}

                {/* Duyệt câu trả lời của các đội - Vòng 2 */}
                {/* Hiển thị khi đang mở câu hỏi hoặc đã hết thời gian nhưng chưa chấm hết */}
                {/* QUAN TRỌNG: Hiển thị đáp án của TẤT CẢ các đội, không phụ thuộc vào activeTeamId */}
                {/* activeTeamId chỉ dùng để chọn tile, còn tất cả các đội đều có thể gửi đáp án */}
                {round2State?.gameState?.status === "question_open" && round2State?.gameState?.activeQuestionId && (
                  <div className="bg-gray-700 rounded-lg p-4 border border-gray-600 mt-4">
                    <h3 className="text-lg font-bold mb-3 text-white">Duyệt câu trả lời</h3>
                    <div className="space-y-2 max-h-[500px] overflow-y-auto">
                      {/* Hiển thị TẤT CẢ các đội: đội đã gửi đáp án trước, sau đó hiển thị các đội chưa gửi */}
                      {(() => {
                        // Lấy danh sách TẤT CẢ đội đã gửi đáp án (không lọc theo activeTeamId)
                        const teamsWithAnswers = round2State.gameState.teamAnswers?.map((ta: any) => {
                          const team = round2State.teams.find((t: any) => t.id === ta.teamId);
                          return {
                            teamId: ta.teamId,
                            teamName: ta.teamName || team?.name || `Đội ${ta.teamId}`, // Ưu tiên teamName từ answer
                            answer: ta,
                          };
                        }) || [];
                              
                        // Lấy danh sách TẤT CẢ đội chưa gửi đáp án (không lọc theo activeTeamId)
                        const teamsWithoutAnswers = round2State.teams.filter((team: any) => 
                          !round2State.gameState.teamAnswers?.some((ta: any) => ta.teamId === team.id)
                        );
                        
                        // Kết hợp: đội đã gửi trước, đội chưa gửi sau - HIỂN THỊ TẤT CẢ
                        return [...teamsWithAnswers, ...teamsWithoutAnswers.map((team: any) => ({
                          teamId: team.id,
                          teamName: team.name,
                          answer: null,
                        }))].map((item) => {
                          const teamAnswer = item.answer;
                          return (
                            <div
                              key={item.teamId}
                              className={`p-3 rounded-lg border-2 transition-all ${
                                teamAnswer?.isCorrect === true
                                  ? "bg-green-900/30 border-green-600"
                                  : teamAnswer?.isCorrect === false
                                  ? "bg-red-900/30 border-red-600"
                                  : teamAnswer
                                  ? "bg-yellow-900/30 border-yellow-600"
                                  : "bg-gray-700/50 border-gray-600"
                              }`}
                            >
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-semibold text-white">{item.teamName}</span>
                                {teamAnswer?.isCorrect === true && (
                                  <span className="text-green-400 text-sm">✓ Đúng</span>
                                )}
                                {teamAnswer?.isCorrect === false && (
                                  <span className="text-red-400 text-sm">✗ Sai</span>
                                )}
                                {teamAnswer && teamAnswer.isCorrect === null && (
                                  <span className="text-yellow-400 text-sm">⏳ Chờ chấm</span>
                                )}
                                {!teamAnswer && (
                                  <span className="text-gray-400 text-sm">Chưa gửi</span>
                                )}
                              </div>
                              {teamAnswer ? (
                                <div className="text-white text-sm mt-1">
                                  Đáp án: <span className="font-medium">{teamAnswer.answer || "(Trống)"}</span>
                                </div>
                              ) : (
                                <div className="text-gray-400 text-sm mt-1">Chưa có đáp án</div>
                              )}
                              {teamAnswer && teamAnswer.isCorrect === null && (
                                <div className="flex gap-2 mt-2">
                                  <button
                                    onClick={async () => {
                                      try {
                                const res = await fetch("/api/round2/state", {
                                  method: "POST",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({
                                            action: "markAnswer",
                                    data: {
                                              teamId: item.teamId,
                                              isCorrect: true,
                                    },
                                  }),
                                });
                                if (res.ok) {
                                  const data = await res.json();
                                  setRound2State(data.state);
                                }
                              } catch (error) {
                                        console.error("Error marking answer:", error);
                              }
                            }}
                                    className="flex-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded transition-colors"
                          >
                                    ✓ Đúng
                          </button>
                          <button
                            onClick={async () => {
                                      try {
                                const res = await fetch("/api/round2/state", {
                                  method: "POST",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({
                                            action: "markAnswer",
                                    data: {
                                              teamId: item.teamId,
                                              isCorrect: false,
                                    },
                                  }),
                                });
                                if (res.ok) {
                                  const data = await res.json();
                                  setRound2State(data.state);
                                }
                              } catch (error) {
                                        console.error("Error marking answer:", error);
                              }
                            }}
                                    className="flex-1 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded transition-colors"
                          >
                                    ✗ Sai
                          </button>
                      </div>
                    )}
                  </div>
                          );
                        });
                      })()}
                    </div>
                  </div>
                )}
              </div>
            ) : currentRound === "tang-toc" ? (
              <div className="bg-gray-800 rounded-lg p-4 space-y-4 border border-gray-700">
                <h2 className="text-xl font-bold mb-4 text-white">Vòng 3: Tăng tốc vận hành</h2>
                
                {!round3State?.config ? (
                  <div className="text-gray-400 text-center py-8">
                    Chưa có config. Vui lòng tạo config ở trang Quản lý câu hỏi.
                  </div>
                ) : (
                  <>
                    {/* Chọn câu hỏi */}
                    <div>
                      <h3 className="text-lg font-semibold mb-2 text-white">Chọn câu hỏi</h3>
                      <div className="grid grid-cols-2 gap-2">
                        {round3State.config.questions.map((q: any) => (
                          <button
                            key={q.id}
                            onClick={async () => {
                              try {
                                const res = await fetch("/api/round3/state", {
                                  method: "POST",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({
                                    action: "setGameState",
                                    data: {
                                      status: "idle",
                                      activeQuestionId: q.id,
                                      currentQuestionIndex: q.order - 1,
                                    },
                                  }),
                                });
                                if (res.ok) {
                                  const data = await res.json();
                                  setRound3State(data.state);
                                }
                              } catch (error) {
                                console.error("Error selecting question:", error);
                              }
                            }}
                            className={`p-3 rounded-lg font-semibold transition-all border-2 ${
                              round3State.gameState?.activeQuestionId === q.id
                                ? "bg-neon-blue text-white border-neon-blue shadow-lg shadow-neon-blue/50"
                                : "bg-gray-700 text-gray-200 hover:bg-gray-600 border-gray-600"
                            }`}
                          >
                            <div className="text-sm font-bold">Câu {q.order}</div>
                            <div className="text-xs mt-1 opacity-80">
                              {q.questionType === "suy-luan" ? "Suy luận" : 
                               q.questionType === "doan-bang" ? "Đoạn băng" : "Sắp xếp"}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Điều khiển câu hỏi */}
                    {round3State.gameState?.activeQuestionId && (
                      <div className="space-y-2">
                        {round3State.gameState.status === "idle" && (
                          <button
                            onClick={async () => {
                              try {
                                const res = await fetch("/api/round3/state", {
                                  method: "POST",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({
                                    action: "setGameState",
                                    data: {
                                      status: "question_open",
                                      timeLeft: 30,
                                    },
                                  }),
                                });
                                if (res.ok) {
                                  const data = await res.json();
                                  setRound3State(data.state);
                                }
                              } catch (error) {
                                console.error("Error opening question:", error);
                              }
                            }}
                            className="w-full p-3 bg-neon-blue text-white rounded-lg font-semibold hover:bg-neon-blue/90 flex items-center justify-center gap-2 border border-neon-blue shadow-md"
                          >
                            Mở câu hỏi (30 giây)
                          </button>
                        )}

                        {round3State.gameState.status === "question_open" && (
                          <>
                            <div className="p-3 bg-gray-700 rounded-lg border border-gray-600">
                              <div className="text-sm text-gray-400 mb-1">Thời gian còn lại:</div>
                              <div className="text-white font-bold text-2xl">
                                {round3State.gameState.timeLeft}s
                              </div>
                            </div>

                            <button
                              onClick={async () => {
                                try {
                                  // Tính điểm cho các đội trả lời đúng
                                  const res = await fetch("/api/round3/state", {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({
                                      action: "calculatePoints",
                                    }),
                                  });
                                  if (res.ok) {
                                    const data = await res.json();
                                    setRound3State(data.state);
                                  } else {
                                    const errorData = await res.json();
                                    alert(errorData.error || "Lỗi khi tính điểm");
                                  }
                                } catch (error) {
                                  console.error("Error calculating points:", error);
                                  alert("Lỗi khi tính điểm");
                                }
                              }}
                              disabled={
                                round3State.gameState.teamAnswers?.some(
                                  (ta: any) => ta.pointsAwarded > 0
                                ) || false
                              }
                              className="w-full p-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-green-600"
                            >
                              {round3State.gameState.teamAnswers?.some(
                                (ta: any) => ta.pointsAwarded > 0
                              ) ? (
                                "✓ Đã tính điểm"
                              ) : (
                                "Tính điểm (40-30-20-10)"
                              )}
                            </button>

                            <button
                              onClick={async () => {
                                try {
                                  const res = await fetch("/api/round3/state", {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({
                                      action: "setGameState",
                                      data: {
                                        status: "question_closed",
                                      },
                                    }),
                                  });
                                  if (res.ok) {
                                    const data = await res.json();
                                    setRound3State(data.state);
                                  }
                                } catch (error) {
                                    console.error("Error closing question:", error);
                                  }
                                }}
                              className="w-full p-3 bg-yellow-600 text-white rounded-lg font-semibold hover:bg-yellow-700 flex items-center justify-center gap-2"
                            >
                              Đóng câu hỏi
                            </button>
                          </>
                        )}

                        {round3State.gameState.status === "question_closed" && (
                          <button
                            onClick={async () => {
                              try {
                                const res = await fetch("/api/round3/state", {
                                  method: "POST",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({
                                    action: "nextQuestion",
                                  }),
                                });
                                if (res.ok) {
                                  const data = await res.json();
                                  setRound3State(data.state);
                                }
                              } catch (error) {
                                console.error("Error moving to next question:", error);
                              }
                            }}
                            className="w-full p-3 bg-neon-purple text-white rounded-lg font-semibold hover:bg-neon-purple/90 flex items-center justify-center gap-2"
                          >
                            Câu hỏi tiếp theo
                          </button>
                        )}

                        {round3State.gameState.status === "round_finished" && (
                          <div className="p-3 bg-green-900/30 border border-green-600 rounded-lg text-center">
                            <div className="text-green-400 font-bold text-lg">
                              🎉 Vòng thi đã kết thúc!
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Hiển thị câu hỏi đang mở */}
                    {round3State.gameState?.status === "question_open" && round3State.gameState?.activeQuestionId && (
                      <div className="mt-4 p-3 bg-gray-700 rounded-lg border border-gray-600">
                        <div className="text-sm text-gray-400 mb-1">Câu hỏi đang mở:</div>
                        <div className="text-white font-medium">
                          {round3State.config.questions.find(
                            (q: any) => q.id === round3State.gameState.activeQuestionId
                          )?.questionText || "Đang tải..."}
                        </div>
                        <div className="text-sm text-gray-400 mt-2">
                          Thời gian: {round3State.gameState.timeLeft}s
                        </div>
                      </div>
                    )}

                    {/* Duyệt câu trả lời của các đội */}
                    {round3State.gameState?.status === "question_open" && round3State.gameState?.activeQuestionId && (
                      <div className="bg-gray-700 rounded-lg p-4 border border-gray-600 mt-4">
                        <h3 className="text-lg font-bold mb-3 text-white">Duyệt câu trả lời</h3>
                        <div className="space-y-2 max-h-[500px] overflow-y-auto">
                          {(() => {
                            const questionStartTime = round3State.gameState.questionStartTime;
                            
                            // Sắp xếp tất cả đáp án theo thời gian submit (nhanh nhất trước) để tính thứ hạng
                            const allAnswersSorted = [...(round3State.gameState.teamAnswers || [])]
                              .filter((ta: any) => ta.submittedAt)
                              .sort((a: any, b: any) => a.submittedAt - b.submittedAt);
                            
                            const teamsWithAnswers = round3State.gameState.teamAnswers?.map((ta: any) => {
                              const team = round3State.teams.find((t: any) => t.id === ta.teamId);
                              // Tính thời gian từ khi mở câu hỏi đến khi submit (millisecond)
                              const submitTime = questionStartTime 
                                ? ((ta.submittedAt - questionStartTime) / 1000).toFixed(3)
                                : null;
                              // Tính thứ hạng (1-based)
                              const rank = allAnswersSorted.findIndex((a: any) => a.teamId === ta.teamId && a.submittedAt === ta.submittedAt) + 1;
                              return {
                                teamId: ta.teamId,
                                teamName: ta.teamName || team?.name || `Đội ${ta.teamId}`,
                                answer: ta,
                                submitTime: submitTime,
                                submittedAt: ta.submittedAt,
                                rank: rank > 0 ? rank : null,
                              };
                            }) || [];
                            
                            // Sắp xếp các đội đã submit theo thời gian (nhanh nhất trước)
                            teamsWithAnswers.sort((a: any, b: any) => {
                              if (!a.submittedAt || !b.submittedAt) return 0;
                              return a.submittedAt - b.submittedAt;
                            });
                            
                            const teamsWithoutAnswers = round3State.teams.filter((team: any) => 
                              !round3State.gameState.teamAnswers?.some((ta: any) => ta.teamId === team.id)
                            );
                            
                            return [...teamsWithAnswers, ...teamsWithoutAnswers.map((team: any) => ({
                              teamId: team.id,
                              teamName: team.name,
                              answer: null,
                              submitTime: null,
                            }))].map((item) => {
                              const teamAnswer = item.answer;
                              return (
                                <div
                                  key={item.teamId}
                                  className={`p-3 rounded-lg border-2 transition-all ${
                                    teamAnswer?.isCorrect === true
                                      ? "bg-green-900/30 border-green-600"
                                      : teamAnswer?.isCorrect === false
                                      ? "bg-red-900/30 border-red-600"
                                      : teamAnswer
                                      ? "bg-yellow-900/30 border-yellow-600"
                                      : "bg-gray-700/50 border-gray-600"
                                  }`}
                                >
                                  <div className="flex items-center justify-between mb-1">
                                    <div className="flex items-center gap-2">
                                      <span className="font-semibold text-white">{item.teamName}</span>
                                      {teamAnswer && (
                                        <span className="px-2 py-0.5 bg-green-500/20 border border-green-500/50 rounded text-green-400 text-xs font-semibold">
                                          ✓ Đã xong
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                      {teamAnswer?.isCorrect === true && (
                                        <span className="text-green-400 text-sm font-semibold">
                                          ✓ Đúng {teamAnswer.pointsAwarded > 0 ? `(+${teamAnswer.pointsAwarded})` : ""}
                                        </span>
                                      )}
                                      {teamAnswer?.isCorrect === false && (
                                        <span className="text-red-400 text-sm font-semibold">✗ Sai</span>
                                      )}
                                      {teamAnswer && teamAnswer.isCorrect === null && (
                                        <span className="text-yellow-400 text-sm font-semibold">⏳ Chờ chấm</span>
                                      )}
                                      {!teamAnswer && (
                                        <span className="text-gray-400 text-sm">Chưa gửi</span>
                                      )}
                                    </div>
                                  </div>
                                  {teamAnswer ? (
                                    <div className="space-y-1">
                                      <div className="text-white text-sm">
                                        Đáp án: <span className="font-medium">{teamAnswer.answer || "(Trống)"}</span>
                                      </div>
                                      {item.submitTime !== null && (
                                        <div className="text-neon-blue text-xs font-mono">
                                          ⏱️ Thời gian: {item.submitTime}s
                                          {item.rank !== null && (
                                            <span className="ml-2 text-yellow-400 font-semibold">
                                              (Thứ {item.rank})
                                            </span>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <div className="text-gray-400 text-sm mt-1">Chưa có đáp án</div>
                                  )}
                                </div>
                              );
                            });
                          })()}
                        </div>
                      </div>
                    )}

                    {/* Bảng điểm */}
                    <div className="bg-gray-700 rounded-lg p-4 border border-gray-600 mt-4">
                      <h3 className="text-lg font-bold mb-3 text-white">Bảng điểm</h3>
                      <div className="space-y-2">
                        {round3State.teams
                          .sort((a: any, b: any) => b.score - a.score)
                          .map((team: any) => (
                            <div
                              key={team.id}
                              className="flex items-center justify-between p-2 bg-gray-800 rounded border border-gray-600"
                            >
                              <span className="text-white font-medium">{team.name}</span>
                              <span className="text-neon-blue font-bold text-lg">{team.score}</span>
                            </div>
                          ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : currentRound === "khoi-dong" ? (
              <div className="bg-gray-800 rounded-lg p-4 space-y-4 border border-gray-700">
                <h2 className="text-xl font-bold mb-4 text-white">Vòng 1: Khơi nguồn năng lượng</h2>
                
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
              <div className="h-[300px] mb-4 relative">
                <QuestionDisplay hideQAType={true} />
                {/* Timer cho MC - dạng số, hiển thị gọn ở góc dưới bên phải */}
                <ControlTimer />
              </div>
              
              {/* Hiển thị ai bấm chuông và nút chấm điểm từ khóa */}
              {(() => {
                const buzzerPresses = round2State?.gameState?.buzzerPresses || [];
                const firstBuzzer = buzzerPresses.length > 0 ? buzzerPresses[0] : null;
                
                if (!firstBuzzer) return null;
                
                return (
                  <div className="mt-4 p-4 bg-yellow-900/30 border-2 border-yellow-500 rounded-lg animate-pulse">
                    <div className="text-yellow-400 font-bold text-lg mb-2">
                      🔔 {firstBuzzer.teamName} đã bấm chuông trước!
                    </div>
                    {buzzerPresses.length > 1 && (
                      <div className="text-orange-300 text-sm mb-2">
                        Các đội khác đã bấm: {buzzerPresses.slice(1).map((bp: any) => bp.teamName).join(", ")}
                      </div>
                    )}
                    <div className="text-white text-sm mb-3">
                      Chấm điểm từ khóa của đội bấm trước ({firstBuzzer.teamName}):
                    </div>
                    {(() => {
                      // Tính điểm dựa trên số hình đã mở
                      const revealedCount = round2State?.config?.questions?.filter(
                        (q: any) => q.tileStatus === "revealed"
                      ).length || 0;
                      
                      let points = 80;
                      if (revealedCount >= 4) {
                        points = 20;
                      } else if (revealedCount >= 3) {
                        points = 40;
                      } else if (revealedCount >= 2) {
                        points = 60;
                      } else {
                        points = 80; // 1 hình trở xuống
                      }
                      
                      return (
                        <div className="text-yellow-300 text-xs mb-2">
                          Số hình đã mở: {revealedCount} → Điểm: +{points}
                        </div>
                      );
                    })()}
                  <div className="flex gap-2">
                    <button
                      onClick={async () => {
                        try {
                          const res = await fetch("/api/round2/state", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              action: "judgeKeyword",
                              data: {
                                isCorrect: true,
                              },
                            }),
                          });
                          if (res.ok) {
                            const data = await res.json();
                            setRound2State(data.state);
                          }
                        } catch (error) {
                          console.error("Error judging keyword:", error);
                        }
                      }}
                      className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-bold rounded transition-colors"
                    >
                      ✓ Đúng
                    </button>
                    <button
                      onClick={async () => {
                        try {
                          const res = await fetch("/api/round2/state", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              action: "judgeKeyword",
                              data: {
                                isCorrect: false,
                              },
                            }),
                          });
                          if (res.ok) {
                            const data = await res.json();
                            setRound2State(data.state);
                          }
                        } catch (error) {
                          console.error("Error judging keyword:", error);
                        }
                      }}
                      className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded transition-colors"
                    >
                      ✗ Sai (Khóa đội)
                    </button>
                  </div>
                </div>
                );
              })()}
              
              {/* Hiển thị bảng điểm các đội ở dưới */}
              <div className="space-y-2 max-h-64 overflow-y-auto mt-4">
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
              onClick={async () => {
                resetGame();
                // Reset round2 state nếu đang ở vòng 2
                if (currentRound === "vuot-chuong-ngai-vat") {
                  try {
                    // Reset toàn bộ round2 state (game state + tile status)
                    await fetch("/api/round2/state", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ action: "resetAll" }),
                    });
                  } catch (error) {
                    console.error("Error resetting round2:", error);
                  }
                }
              }}
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

      {/* Round 2 Confirmation Modal */}
      <AnimatePresence>
        {showRound2ConfirmModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-gray-800 rounded-xl p-6 border-2 border-neon-blue max-w-md w-full shadow-2xl"
            >
            <h2 className="text-2xl font-bold text-white mb-4">
              Xác nhận chuyển sang Vòng 2
            </h2>
            <p className="text-gray-300 mb-6">
              Bạn có chắc chắn đã hoàn thành Vòng 1: Khơi nguồn năng lượng? 
              Khi xác nhận, màn hình của tất cả các đội thi sẽ tự động chuyển sang Vòng 2.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowRound2ConfirmModal(false)}
                className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-lg transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={() => {
                  setRound("vuot-chuong-ngai-vat");
                  setShowRound2ConfirmModal(false);
                  setToast({
                    message: "Đã chuyển sang Vòng 2: Vượt chướng ngại vật",
                    type: "success",
                  });
                }}
                className="px-6 py-2 bg-neon-blue hover:bg-neon-blue/80 text-white font-semibold rounded-lg transition-colors"
              >
                Xác nhận
              </button>
            </div>
          </motion.div>
          </div>
        )}

        {showRound3ConfirmModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-gray-800 rounded-xl p-6 border-2 border-neon-blue max-w-md w-full shadow-2xl"
            >
            <h2 className="text-2xl font-bold text-white mb-4">
              Xác nhận chuyển sang Vòng 3
            </h2>
            <p className="text-gray-300 mb-6">
              Bạn có chắc chắn đã hoàn thành:
              <br />• Vòng 1: Khơi nguồn năng lượng
              <br />• Vòng 2: Hành trình giọt dầu
              <br />
              <br />
              Khi xác nhận, màn hình của tất cả các đội thi sẽ tự động chuyển sang Vòng 3: Tăng tốc vận hành.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowRound3ConfirmModal(false)}
                className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-lg transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={() => {
                  setRound("tang-toc");
                  setShowRound3ConfirmModal(false);
                  setToast({
                    message: "Đã chuyển sang Vòng 3: Tăng tốc vận hành",
                    type: "success",
                  });
                }}
                className="px-6 py-2 bg-neon-blue hover:bg-neon-blue/80 text-white font-semibold rounded-lg transition-colors"
              >
                Xác nhận
              </button>
            </div>
          </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

