"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Round4State, Round4GameState, Round4Team, Round4PackageType } from "@/lib/round4/types";
import { useAuth } from "@/hooks/useAuth";
import { motion } from "framer-motion";
import { Bell, Star } from "lucide-react";

export default function Round4PlayPage() {
  const { team } = useAuth();
  const [state, setState] = useState<Round4State | null>(null);
  const [answerInput, setAnswerInput] = useState("");
  const [round4TeamId, setRound4TeamId] = useState<number | null>(null);
  const syncCounterRef = useRef(0);
  const buzzerSyncCounterRef = useRef(0);

  const loadState = useCallback(async () => {
    try {
      const res = await fetch("/api/round4/state");
      const data = await res.json();
      setState((prev: any) => {
        if (!prev || prev.gameState?.status !== data?.gameState?.status) {
          return data;
        }
        if (prev.gameState?.status === "question_open" && data?.gameState?.status === "question_open") {
          return {
            ...data,
            gameState: {
              ...data.gameState,
              timeLeft: prev.gameState.timeLeft,
            },
          };
        }
        if (prev.gameState?.status === "buzzer_window" && data?.gameState?.status === "buzzer_window") {
          return {
            ...data,
            gameState: {
              ...data.gameState,
              buzzerWindowTimeLeft: prev.gameState.buzzerWindowTimeLeft,
            },
          };
        }
        return data;
      });
    } catch (error) {
      console.error("Error loading state:", error);
    }
  }, []);

  useEffect(() => {
    loadState();
    const interval = setInterval(loadState, 1000);
    return () => clearInterval(interval);
  }, [loadState]);

  useEffect(() => {
    if (team && state?.teams) {
      const round4Team = state.teams.find((t: any) => t.name === team.teamName);
      if (round4Team) {
        setRound4TeamId(round4Team.id);
      }
    }
  }, [team, state?.teams]);

  // Timer countdown cho câu hỏi
  useEffect(() => {
    if (!state?.gameState) return;
    if (state.gameState.status !== "question_open") return;
    if (state.gameState.timeLeft <= 0) {
      syncCounterRef.current = 0;
      return;
    }

    syncCounterRef.current = 0;

    const timer = setInterval(() => {
      setState((prev: any) => {
        if (!prev || prev.gameState.status !== "question_open") {
          clearInterval(timer);
          return prev;
        }

        const newTimeLeft = prev.gameState.timeLeft - 1;
        syncCounterRef.current++;

        if (newTimeLeft <= 0) {
          clearInterval(timer);
          syncCounterRef.current = 0;
          const updatedState = {
            ...prev,
            gameState: { ...prev.gameState, timeLeft: 0 },
          };

          fetch("/api/round4/state", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "setGameState",
              data: { timeLeft: 0 },
            }),
          }).catch(console.error);

          return updatedState;
        }

        const updatedState = {
          ...prev,
          gameState: { ...prev.gameState, timeLeft: newTimeLeft },
        };

        if (syncCounterRef.current >= 5) {
          syncCounterRef.current = 0;
          fetch("/api/round4/state", {
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
  }, [state?.gameState?.status]);

  // Timer countdown cho cửa sổ bấm chuông
  useEffect(() => {
    if (!state?.gameState) return;
    if (state.gameState.status !== "buzzer_window") return;
    if (state.gameState.buzzerWindowTimeLeft <= 0) {
      buzzerSyncCounterRef.current = 0;
      return;
    }

    buzzerSyncCounterRef.current = 0;

    const timer = setInterval(() => {
      setState((prev: any) => {
        if (!prev || prev.gameState.status !== "buzzer_window") {
          clearInterval(timer);
          return prev;
        }

        const newTimeLeft = prev.gameState.buzzerWindowTimeLeft - 1;
        buzzerSyncCounterRef.current++;

        if (newTimeLeft <= 0) {
          clearInterval(timer);
          buzzerSyncCounterRef.current = 0;
          const updatedState = {
            ...prev,
            gameState: { ...prev.gameState, buzzerWindowTimeLeft: 0 },
          };

          fetch("/api/round4/state", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "setGameState",
              data: { buzzerWindowTimeLeft: 0 },
            }),
          }).catch(console.error);

          return updatedState;
        }

        const updatedState = {
          ...prev,
          gameState: { ...prev.gameState, buzzerWindowTimeLeft: newTimeLeft },
        };

        if (buzzerSyncCounterRef.current >= 1) {
          buzzerSyncCounterRef.current = 0;
          fetch("/api/round4/state", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "setGameState",
              data: { buzzerWindowTimeLeft: newTimeLeft },
            }),
          }).catch(console.error);
        }

        return updatedState;
      });
    }, 1000);

    return () => {
      clearInterval(timer);
      buzzerSyncCounterRef.current = 0;
    };
  }, [state?.gameState?.status]);

  // Reset answer input khi chuyển câu hỏi
  const prevQuestionIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!state?.config || !state.gameState.currentQuestionId) {
      setAnswerInput("");
      prevQuestionIdRef.current = null;
      return;
    }
    
    if (prevQuestionIdRef.current !== state.gameState.currentQuestionId) {
      const existingAnswer = state.gameState.teamAnswers?.find(
        (ta) => ta.teamId === round4TeamId
      );
      if (!existingAnswer || !existingAnswer.isFinalAnswer) {
        setAnswerInput("");
      } else {
        setAnswerInput(existingAnswer.answer);
      }
      prevQuestionIdRef.current = state.gameState.currentQuestionId;
    }
  }, [state?.gameState?.currentQuestionId, state?.config, round4TeamId, state?.gameState?.teamAnswers]);

  // Đội không tự chọn gói nữa - MC sẽ chọn

  const handleSetHopeStar = async () => {
    if (!round4TeamId) return;
    
    try {
      const res = await fetch("/api/round4/state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "setHopeStar",
          data: { teamId: round4TeamId },
        }),
      });
      if (res.ok) {
        loadState();
      } else {
        const errorData = await res.json();
        alert(errorData.error || "Không thể đặt ngôi sao hy vọng");
      }
    } catch (error) {
      console.error("Error setting hope star:", error);
      alert("Lỗi khi đặt ngôi sao hy vọng");
    }
  };

  const handleAnswerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!state?.config || !state.gameState.currentQuestionId) return;
    if (state.gameState.status !== "question_open" && state.gameState.status !== "waiting_answer") return;
    if (!round4TeamId || !team) return;
    
    const finalAnswer = answerInput.trim();
    if (!finalAnswer) return;

    try {
      const res = await fetch("/api/round4/state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "submitAnswer",
          data: {
            teamId: round4TeamId,
            teamName: team.teamName,
            answer: finalAnswer,
          },
        }),
      });
      if (res.ok) {
        loadState();
      } else {
        const errorData = await res.json();
        console.error("Error submitting answer:", errorData.error);
        loadState();
      }
    } catch (error) {
      console.error("Error submitting answer:", error);
    }
  };

  const handlePressBuzzer = async () => {
    if (!round4TeamId || !team) return;
    
    try {
      const res = await fetch("/api/round4/state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "pressBuzzer",
          data: {
            teamId: round4TeamId,
            teamName: team.teamName,
          },
        }),
      });
      if (res.ok) {
        loadState();
      } else {
        const errorData = await res.json();
        alert(errorData.error || "Không thể bấm chuông");
      }
    } catch (error) {
      console.error("Error pressing buzzer:", error);
      alert("Lỗi khi bấm chuông");
    }
  };

  if (!state) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-white text-xl">Đang tải...</div>
      </div>
    );
  }

  // Kiểm tra questionBank thay vì config (vì config chỉ được tạo khi đội chọn gói)
  if (!state.questionBank) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-white text-xl">Chưa có ngân hàng câu hỏi. Vui lòng tạo ngân hàng câu hỏi trong trang /round4/admin.</div>
      </div>
    );
  }

  const { config, gameState, teams, questionBank } = state;
  
  // Tạo config mặc định với 3 gói nếu chưa có config (chưa có đội nào chọn gói)
  const defaultPackages = [
    { type: 40 as Round4PackageType, questions: [], selectedByTeamId: null },
    { type: 60 as Round4PackageType, questions: [], selectedByTeamId: null },
    { type: 80 as Round4PackageType, questions: [], selectedByTeamId: null },
  ];
  const displayConfig = config || { packages: defaultPackages };
  
  // Config có thể null nếu chưa có đội nào chọn gói
  const currentPackage = displayConfig.packages.find((p) => p.type === gameState.currentPackageType);
  const activeQuestion = currentPackage?.questions?.find((q) => q.id === gameState.currentQuestionId) || null;

  const myTeam = teams.find((t) => t.id === round4TeamId);
  const myAnswer = gameState.teamAnswers.find((ta) => ta.teamId === round4TeamId);
  const isMainTeam = gameState.currentMainTeamId === round4TeamId;
  const isBuzzerTeam = !isMainTeam && gameState.buzzerPresses.length > 0 && 
                       gameState.buzzerPresses[0].teamId === round4TeamId;
  const hasPressedBuzzer = gameState.buzzerPresses.some((bp) => bp.teamId === round4TeamId);
  const hasHopeStar = gameState.hopeStarTeams.includes(round4TeamId || -1);
  const timeLeft = gameState.timeLeft || 0;
  const isTimeUp = timeLeft <= 0;
  const buzzerTimeLeft = gameState.buzzerWindowTimeLeft || 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 relative overflow-hidden">
      <div className="absolute inset-0 bg-radial-gradient bg-grid-soft opacity-80 pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-neon-blue/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-neon-purple/10 rounded-full blur-3xl" />

      <div className="relative z-10 p-6 space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-neon-blue mb-2">
            Vòng 4: Chinh phục đỉnh cao
          </h1>
          {myTeam && (
            <div className="text-lg text-neon-purple">
              Đội thi: {myTeam.name} - Điểm: {myTeam.score}
              {myTeam.hasUsedHopeStar && (
                <span className="ml-2 text-yellow-400">⭐ Đã dùng ngôi sao</span>
              )}
            </div>
          )}
        </div>

        {/* Package Selection - Đã bỏ, MC sẽ chọn gói */}
        {gameState.status === "package_selection_by_mc" && round4TeamId && (
          <div className="bg-slate-950/95 rounded-xl p-8 border-2 border-white/90">
            <h2 className="text-2xl font-bold text-white mb-6 text-center">
              Chờ MC chọn gói câu hỏi
            </h2>
          </div>
        )}

        {/* Team Selection - Chờ MC chọn đội */}
        {gameState.status === "team_selection" && (
          <div className="bg-slate-950/95 rounded-xl p-8 border-2 border-white/90">
            <h2 className="text-2xl font-bold text-white mb-6 text-center">
              Chờ MC chọn đội thi
            </h2>
          </div>
        )}

        {/* Package Selection by MC - Chờ MC chọn gói */}
        {gameState.status === "package_selection_by_mc" && (
          <div className="bg-slate-950/95 rounded-xl p-8 border-2 border-white/90">
            <h2 className="text-2xl font-bold text-white mb-6 text-center">
              MC đang chọn gói câu hỏi cho đội{" "}
              {teams.find((t) => t.id === gameState.currentMainTeamId)?.name}
            </h2>
          </div>
        )}


        {/* Hope Star Button */}
        {gameState.status === "question_preparing" && 
         round4TeamId && 
         myTeam && 
         !myTeam.hasUsedHopeStar && 
         !hasHopeStar && (
          <div className="bg-slate-950/95 rounded-xl p-6 border-2 border-yellow-500/50">
            <div className="text-center">
              <h3 className="text-xl font-bold text-yellow-400 mb-4">
                ⭐ Ngôi sao hy vọng
              </h3>
              <p className="text-gray-300 mb-4">
                Đặt ngôi sao hy vọng trước khi câu hỏi được mở. Nếu trả lời đúng, điểm sẽ được gấp đôi. Nếu trả lời sai, sẽ bị trừ điểm.
              </p>
              <button
                onClick={handleSetHopeStar}
                className="px-8 py-4 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-bold rounded-lg transition-all duration-200 shadow-lg shadow-yellow-500/50 hover:shadow-yellow-500/70 hover:scale-105"
              >
                <Star className="inline w-5 h-5 mr-2" />
                Đặt ngôi sao hy vọng
              </button>
            </div>
          </div>
        )}

        {/* Question Display */}
        {(gameState.status === "question_preparing" || 
          gameState.status === "question_open" || 
          gameState.status === "buzzer_window" ||
          gameState.status === "waiting_answer" ||
          gameState.status === "answer_revealed" ||
          gameState.status === "round_finished") && (
          <div className="bg-slate-950/95 rounded-xl p-8 border-2 border-white/90 relative overflow-hidden">
            {gameState.status === "question_preparing" && !activeQuestion ? (
              <div className="text-center text-gray-400 text-xl">
                Chờ MC mở câu hỏi...
              </div>
            ) : gameState.status === "round_finished" ? (
              <div className="text-center text-neon-green text-2xl font-bold">
                🎉 Vòng thi đã kết thúc!
              </div>
            ) : activeQuestion ? (
              <div className="space-y-6">
                {/* Question Info */}
                <div className="text-center">
                  <div className="inline-block px-4 py-2 bg-neon-blue/20 border border-neon-blue rounded-lg">
                    <span className="text-neon-blue font-semibold">
                      {activeQuestion.points} điểm - {activeQuestion.timeLimitSec} giây
                    </span>
                  </div>
                  {hasHopeStar && (
                    <div className="mt-2 text-yellow-400 font-semibold">
                      ⭐ Ngôi sao hy vọng đã được đặt
                    </div>
                  )}
                </div>

                {/* Question Text */}
                <div className="text-white text-2xl leading-relaxed font-medium text-center mb-4">
                  {activeQuestion.questionText}
                </div>

                {/* Timer */}
                {(gameState.status === "question_open" || gameState.status === "waiting_answer") && (
                  <div className="flex items-center justify-center gap-4">
                    <div className="text-white/80 text-lg">Thời gian còn lại:</div>
                    <div
                      className={`text-4xl font-mono font-bold tabular-nums ${
                        timeLeft <= 5
                          ? "text-red-400"
                          : timeLeft <= 10
                          ? "text-yellow-400"
                          : "text-neon-blue"
                      }`}
                      style={{
                        textShadow:
                          timeLeft <= 5
                            ? "0 0 10px rgba(239, 68, 68, 0.8)"
                            : timeLeft <= 10
                            ? "0 0 8px rgba(234, 179, 8, 0.6)"
                            : "0 0 8px rgba(0, 240, 255, 0.5)",
                      }}
                    >
                      {String(timeLeft).padStart(2, "0")}
                    </div>
                  </div>
                )}

                {/* Buzzer Window */}
                {gameState.status === "buzzer_window" && (
                  <div className="bg-yellow-900/20 border-2 border-yellow-500 rounded-lg p-6 text-center">
                    <div className="text-yellow-400 text-xl font-bold mb-2">
                      Đội chính trả lời sai! Bấm chuông trong 5 giây!
                    </div>
                    <div className="text-3xl font-mono font-bold text-yellow-400 mb-4">
                      {String(buzzerTimeLeft).padStart(2, "0")}
                    </div>
                    {!isMainTeam && !hasPressedBuzzer && (
                      <button
                        onClick={handlePressBuzzer}
                        className="px-8 py-4 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-bold rounded-lg transition-all duration-200 shadow-lg shadow-yellow-500/50 hover:shadow-yellow-500/70 hover:scale-105"
                      >
                        <Bell className="inline w-5 h-5 mr-2" />
                        Bấm chuông
                      </button>
                    )}
                    {hasPressedBuzzer && (
                      <div className="text-green-400 font-semibold">
                        ✓ Đã bấm chuông - Chờ MC cho phép trả lời
                      </div>
                    )}
                    {gameState.buzzerPresses.length > 0 && (
                      <div className="mt-4 text-gray-300 text-sm">
                        Đội bấm trước: {gameState.buzzerPresses[0].teamName}
                      </div>
                    )}
                  </div>
                )}

                {/* Answer Input */}
                {((gameState.status === "question_open" && (isMainTeam || isBuzzerTeam)) ||
                  (gameState.status === "waiting_answer" && (isMainTeam || isBuzzerTeam))) && (
                  <div className="mt-8">
                    {myAnswer ? (
                      <div className="p-6 bg-gradient-to-br from-slate-800/90 to-slate-900/90 border-2 border-green-500/50 rounded-lg shadow-lg shadow-green-500/20">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="text-green-400 text-xl">✓</div>
                          <div className="text-lg font-semibold text-green-400">
                            {isMainTeam ? "Đã gửi đáp án (có thể thay đổi)" : "Đã gửi đáp án"}
                          </div>
                        </div>
                        <div className="text-sm text-gray-300 mb-2">Đáp án của bạn:</div>
                        <div className="text-white font-bold text-xl mb-3 p-3 bg-slate-700/50 rounded border border-slate-600">
                          {myAnswer.answer || "(Trống)"}
                        </div>
                        {myAnswer.isCorrect === true && (
                          <div className="flex items-center gap-2 text-green-400 text-sm font-semibold p-2 bg-green-500/20 rounded border border-green-500/50">
                            <span className="text-lg">✓</span>
                            <span>
                              Đúng - {myAnswer.pointsAwarded > 0 ? `+${myAnswer.pointsAwarded}` : myAnswer.pointsAwarded} điểm
                            </span>
                          </div>
                        )}
                        {myAnswer.isCorrect === false && (
                          <div className="flex items-center gap-2 text-red-400 text-sm font-semibold p-2 bg-red-500/20 rounded border border-red-500/50">
                            <span className="text-lg">✗</span>
                            <span>
                              Sai - {myAnswer.pointsAwarded < 0 ? `${myAnswer.pointsAwarded}` : "0"} điểm
                            </span>
                          </div>
                        )}
                        {myAnswer.isCorrect === null && (
                          <div className="flex items-center gap-2 text-yellow-400 text-sm font-semibold p-2 bg-yellow-500/20 rounded border border-yellow-500/50 animate-pulse">
                            <span className="text-lg">⏳</span>
                            <span>Chờ MC chấm điểm...</span>
                          </div>
                        )}
                      </div>
                    ) : isTimeUp ? (
                      <div className="p-4 bg-gray-900/30 border border-gray-600 rounded-lg">
                        <div className="text-gray-400 text-lg font-semibold">⏰ Đã hết thời gian</div>
                        <div className="text-gray-500 text-sm mt-1">
                          Không thể gửi đáp án nữa
                        </div>
                      </div>
                    ) : (
                      <form onSubmit={handleAnswerSubmit} className="space-y-4">
                        <div className="flex gap-3">
                          <input
                            type="text"
                            value={answerInput}
                            onChange={(e) => setAnswerInput(e.target.value)}
                            placeholder="Nhập câu trả lời..."
                            disabled={gameState.status !== "question_open" && gameState.status !== "waiting_answer" || isTimeUp}
                            className="flex-1 px-6 py-4 bg-slate-800/80 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-neon-blue disabled:opacity-50 disabled:cursor-not-allowed text-lg"
                            autoFocus
                          />
                          <button
                            type="submit"
                            disabled={
                              !answerInput.trim() ||
                              (gameState.status !== "question_open" && gameState.status !== "waiting_answer") ||
                              isTimeUp
                            }
                            className="px-10 py-4 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold rounded-lg transition-all duration-200 shadow-lg shadow-green-500/50 hover:shadow-green-500/70 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 text-lg"
                          >
                            ✓ {isMainTeam ? "Gửi/Cập nhật" : "Gửi"}
                          </button>
                        </div>
                        {isMainTeam && (
                          <div className="text-xs text-gray-400 italic text-center">
                            💡 Bạn có thể thay đổi đáp án nhiều lần. Đáp án cuối cùng sẽ được ghi nhận.
                          </div>
                        )}
                        {isBuzzerTeam && (
                          <div className="text-xs text-gray-400 italic text-center">
                            💡 Bạn chỉ có thể gửi đáp án một lần. Đáp án đầu tiên sẽ được ghi nhận.
                          </div>
                        )}
                      </form>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center text-gray-400 text-xl">
                Chờ MC mở câu hỏi...
              </div>
            )}
          </div>
        )}

        {/* Teams Scoreboard */}
        {teams.length > 0 && (
          <div className="bg-slate-950/95 rounded-xl p-6 border border-slate-700/50">
            <h2 className="text-xl font-bold text-neon-blue mb-4 text-center">
              Bảng điểm
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {teams
                .sort((a, b) => b.score - a.score)
                .map((teamItem) => (
                  <motion.div
                    key={teamItem.id}
                    className={`p-4 rounded-lg border-2 ${
                      teamItem.id === round4TeamId
                        ? "bg-neon-blue/20 border-neon-blue"
                        : "bg-slate-800/50 border-slate-700"
                    }`}
                    whileHover={{ scale: 1.05 }}
                  >
                    <div
                      className={`text-sm font-medium mb-2 ${
                        teamItem.id === round4TeamId
                          ? "text-neon-blue"
                          : "text-gray-300"
                      }`}
                    >
                      {teamItem.name}
                      {teamItem.hasUsedHopeStar && (
                        <span className="ml-1 text-yellow-400">⭐</span>
                      )}
                    </div>
                    <div className="text-2xl font-bold text-white">
                      {teamItem.score}
                    </div>
                    {teamItem.selectedPackage && (
                      <div className="text-xs text-gray-400 mt-1">
                        Gói {teamItem.selectedPackage} điểm
                      </div>
                    )}
                  </motion.div>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

