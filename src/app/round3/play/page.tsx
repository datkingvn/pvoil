"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Round3State, Round3GameState, Round3Team, Round3QuestionStep } from "@/lib/round3/types";
import { useAuth } from "@/hooks/useAuth";
import { motion } from "framer-motion";

export default function Round3PlayPage() {
  const { team } = useAuth();
  const [state, setState] = useState<Round3State | null>(null);
  const [answerInput, setAnswerInput] = useState("");
  const [round3TeamId, setRound3TeamId] = useState<number | null>(null);
  const syncCounterRef = useRef(0);

  const loadState = useCallback(async () => {
    try {
      const res = await fetch("/api/round3/state");
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
      const round3Team = state.teams.find((t: any) => t.name === team.teamName);
      if (round3Team) {
        setRound3TeamId(round3Team.id);
      }
    }
  }, [team, state?.teams]);

  // Timer countdown
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

          fetch("/api/round3/state", {
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
          fetch("/api/round3/state", {
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

  // Reset answer input when question changes (only if no existing answer)
  const prevQuestionIdRef = useRef<number | null>(null);
  useEffect(() => {
    if (!state?.config || !state.gameState.activeQuestionId) {
      setAnswerInput("");
      prevQuestionIdRef.current = null;
      return;
    }
    
    // Chỉ reset khi chuyển sang câu hỏi mới và chưa có đáp án
    if (prevQuestionIdRef.current !== state.gameState.activeQuestionId) {
      const existingAnswer = state.gameState.teamAnswers?.find(
        (ta) => ta.teamId === round3TeamId
      );
      if (!existingAnswer) {
        setAnswerInput("");
      }
      prevQuestionIdRef.current = state.gameState.activeQuestionId;
    }
  }, [state?.gameState?.activeQuestionId, state?.config, round3TeamId, state?.gameState?.teamAnswers]);

  const handleAnswerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!state?.config || !state.gameState.activeQuestionId) return;
    if (state.gameState.status !== "question_open") return;
    if (!round3TeamId || !team) return;
    
    // For sap-xep questions, use the input directly (already formatted as ABCD)
    const finalAnswer = answerInput.trim().toUpperCase();
    
    if (!finalAnswer) return;

    const existingAnswer = state.gameState.teamAnswers.find(
      (ta) => ta.teamId === round3TeamId
    );
    if (existingAnswer) {
      return;
    }

    try {
      const res = await fetch("/api/round3/state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "submitAnswer",
          data: {
            teamId: round3TeamId,
            teamName: team.teamName,
            answer: finalAnswer,
          },
        }),
      });
      if (res.ok) {
        setAnswerInput("");
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

  if (!state || !state.config) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-white text-xl">Chưa có config. Vui lòng chờ MC tạo config.</div>
      </div>
    );
  }

  const { config, gameState, teams } = state;
  const activeQuestion = gameState.activeQuestionId
    ? config.questions.find((q) => q.id === gameState.activeQuestionId)
    : null;

  const myTeam = teams.find((t) => t.id === round3TeamId);
  const myAnswer = gameState.teamAnswers.find((ta) => ta.teamId === round3TeamId);
  const timeLeft = gameState.timeLeft || 0;
  const isTimeUp = timeLeft <= 0;

  // Tính thứ hạng của đội thi dựa trên thời gian submit
  const getMyRank = () => {
    if (!myAnswer || !gameState.questionStartTime) return null;
    const allAnswers = gameState.teamAnswers
      .filter((ta) => ta.submittedAt) // Chỉ lấy các đáp án đã submit
      .sort((a, b) => a.submittedAt - b.submittedAt); // Sắp xếp theo thời gian (nhanh nhất trước)
    const myIndex = allAnswers.findIndex((ta) => ta.teamId === round3TeamId);
    return myIndex >= 0 ? myIndex + 1 : null; // Thứ hạng (1-based)
  };
  
  const myRank = getMyRank();

  const getQuestionTypeLabel = (type: string) => {
    switch (type) {
      case "suy-luan":
        return "Câu hỏi suy luận";
      case "doan-bang":
        return "Câu hỏi đoạn băng";
      case "sap-xep":
        return "Câu hỏi sắp xếp";
      default:
        return "Câu hỏi";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 relative overflow-hidden">
      <div className="absolute inset-0 bg-radial-gradient bg-grid-soft opacity-80 pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-neon-blue/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-neon-purple/10 rounded-full blur-3xl" />

      <div className="relative z-10 p-6 space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-neon-blue mb-2">
            Vòng 3: Tăng tốc vận hành
          </h1>
          {myTeam && (
            <div className="text-lg text-neon-purple">
              Đội thi: {myTeam.name} - Điểm: {myTeam.score}
            </div>
          )}
        </div>

        {/* Question Display */}
        <div className="bg-slate-950/95 rounded-xl p-8 border-2 border-white/90 relative overflow-hidden">
          {gameState.status === "idle" && !gameState.activeQuestionId ? (
            <div className="text-center text-gray-400 text-xl">
              Chờ MC mở câu hỏi...
            </div>
          ) : gameState.status === "round_finished" ? (
            <div className="text-center text-neon-green text-2xl font-bold">
              🎉 Vòng thi đã kết thúc!
            </div>
          ) : activeQuestion ? (
            <div className="space-y-6">
              {/* Question Type */}
              <div className="text-center">
                <div className="inline-block px-4 py-2 bg-neon-blue/20 border border-neon-blue rounded-lg">
                  <span className="text-neon-blue font-semibold">
                    {getQuestionTypeLabel(activeQuestion.questionType)}
                  </span>
                </div>
              </div>

              {/* Question Text */}
              {activeQuestion.questionText && (
                <div className="text-white text-2xl leading-relaxed font-medium text-center mb-4">
                  {activeQuestion.questionText}
                </div>
              )}
              {!activeQuestion.questionText && (
                <div className="text-gray-400 text-xl leading-relaxed font-medium text-center mb-4 italic">
                  (Không có nội dung câu hỏi)
                </div>
              )}

              {/* Video for doan-bang questions */}
              {activeQuestion.questionType === "doan-bang" && (
                <>
                  {activeQuestion.videoUrl && activeQuestion.videoUrl.trim() !== "" ? (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3 }}
                      className="mb-6 flex justify-center"
                    >
                      <div className="relative w-full max-w-3xl">
                        <div className="absolute -inset-1 bg-gradient-to-r from-neon-blue via-neon-purple to-neon-blue rounded-xl blur opacity-30"></div>
                        <video
                          src={activeQuestion.videoUrl}
                          controls
                          className="relative w-full rounded-xl border-2 border-neon-blue/50 shadow-2xl shadow-neon-blue/20"
                          style={{ maxHeight: "500px" }}
                          onError={(e) => {
                            console.error("Video load error:", e);
                          }}
                        >
                          Trình duyệt của bạn không hỗ trợ video.
                        </video>
                      </div>
                    </motion.div>
                  ) : (
                    <div className="mb-6 p-4 bg-yellow-900/20 border border-yellow-500/30 rounded-lg">
                      <div className="text-yellow-400 text-center">
                        ⚠️ Câu hỏi đoạn băng chưa có video. Vui lòng liên hệ MC để upload video.
                      </div>
                      {process.env.NODE_ENV === "development" && (
                        <div className="text-yellow-300 text-xs mt-2 text-center">
                          Debug: videoUrl = {activeQuestion.videoUrl || "(undefined)"}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}

              {/* Steps for sap-xep questions */}
              {activeQuestion.questionType === "sap-xep" && activeQuestion.steps && activeQuestion.steps.length > 0 && (
                <div className="mb-6 space-y-3">
                  <div className="text-center text-white/80 text-sm mb-4">
                    Sắp xếp các bước theo thứ tự đúng:
                  </div>
                  {activeQuestion.steps.map((step, index) => (
                    <motion.div
                      key={`${step.label}-${index}`}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-center gap-3 p-4 bg-slate-800/50 border-2 border-slate-700 rounded-lg"
                    >
                      <div className="w-12 h-12 flex items-center justify-center bg-neon-blue/20 border-2 border-neon-blue rounded-lg font-bold text-neon-blue text-lg flex-shrink-0">
                        {step.label}
                      </div>
                      <div className="flex-1 text-white text-lg font-medium">
                        {step.text || `(Bước ${step.label} - chưa có nội dung)`}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
              {activeQuestion.questionType === "sap-xep" && (!activeQuestion.steps || activeQuestion.steps.length === 0) && (
                <div className="mb-6 p-4 bg-yellow-900/20 border border-yellow-500/30 rounded-lg">
                  <div className="text-yellow-400 text-center">
                    ⚠️ Câu hỏi sắp xếp chưa có các bước. Vui lòng liên hệ MC để cài đặt.
                  </div>
                </div>
              )}

              {/* Timer */}
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

              {/* Answer Input */}
              {gameState.status === "question_open" && round3TeamId && team && (
                <div className="mt-8">
                  {myAnswer ? (
                    <div className="p-6 bg-gradient-to-br from-slate-800/90 to-slate-900/90 border-2 border-green-500/50 rounded-lg shadow-lg shadow-green-500/20">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="text-green-400 text-xl">✓</div>
                        <div className="text-lg font-semibold text-green-400">
                          Đã gửi đáp án thành công!
                        </div>
                      </div>
                      <div className="text-sm text-gray-300 mb-2">Đáp án của bạn:</div>
                      <div className="text-white font-bold text-xl mb-3 p-3 bg-slate-700/50 rounded border border-slate-600">
                        {myAnswer.answer || "(Trống)"}
                      </div>
                      {gameState.questionStartTime && myAnswer.submittedAt && (
                        <div className="text-neon-blue text-sm font-mono mb-3 p-2 bg-neon-blue/10 rounded border border-neon-blue/30">
                          ⏱️ Thời gian nạp bài: {((myAnswer.submittedAt - gameState.questionStartTime) / 1000).toFixed(3)}s
                          {myRank !== null && (
                            <span className="ml-2 text-yellow-400 font-semibold">
                              (Thứ {myRank})
                            </span>
                          )}
                        </div>
                      )}
                      {myAnswer.isCorrect === true && (
                        <div className="flex items-center gap-2 text-green-400 text-sm font-semibold p-2 bg-green-500/20 rounded border border-green-500/50">
                          <span className="text-lg">✓</span>
                          <span>
                            {myAnswer.pointsAwarded > 0 ? (
                              <>Đúng - Bạn đã nhận được {myAnswer.pointsAwarded} điểm!</>
                            ) : (
                              <>Đúng - Chờ MC tính điểm (40-30-20-10)</>
                            )}
                          </span>
                        </div>
                      )}
                      {myAnswer.isCorrect === false && (
                        <div className="flex items-center gap-2 text-red-400 text-sm font-semibold p-2 bg-red-500/20 rounded border border-red-500/50">
                          <span className="text-lg">✗</span>
                          <span>Sai - Không nhận điểm</span>
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
                      {activeQuestion.questionType !== "sap-xep" ? (
                        <>
                          <div className="flex gap-3">
                            <input
                              type="text"
                              value={answerInput}
                              onChange={(e) => setAnswerInput(e.target.value)}
                              onCompositionStart={(e) => {
                                // Giữ nguyên giá trị khi bắt đầu composition (gõ tiếng Việt)
                                e.currentTarget.value = answerInput;
                              }}
                              onCompositionEnd={(e) => {
                                // Cập nhật giá trị sau khi hoàn thành composition
                                setAnswerInput(e.currentTarget.value);
                              }}
                              placeholder="Nhập câu trả lời (chú ý chính tả)..."
                              disabled={gameState.status !== "question_open" || isTimeUp}
                              className="flex-1 px-6 py-4 bg-slate-800/80 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-neon-blue disabled:opacity-50 disabled:cursor-not-allowed text-lg"
                              autoFocus
                            />
                            <button
                              type="submit"
                              disabled={
                                !answerInput.trim() ||
                                gameState.status !== "question_open" ||
                                isTimeUp
                              }
                              className="px-10 py-4 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold rounded-lg transition-all duration-200 shadow-lg shadow-green-500/50 hover:shadow-green-500/70 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 text-lg"
                            >
                              ✓ Gửi
                            </button>
                          </div>
                          <div className="text-xs text-gray-400 italic text-center">
                            💡 Câu trả lời phải chính xác về chính tả. Câu trả lời tương đồng cũng được chấp nhận.
                          </div>
                        </>
                      ) : (
                        <div className="space-y-4">
                          <div className="text-center text-white/80 text-sm mb-2">
                            Nhập thứ tự đúng của các bước (ví dụ: ACDB):
                          </div>
                          <div className="flex gap-3">
                            <input
                              type="text"
                              value={answerInput}
                              onChange={(e) => {
                                // Chỉ cho phép nhập A, B, C, D và tối đa 4 ký tự
                                const value = e.target.value.toUpperCase().replace(/[^ABCD]/g, "").slice(0, 4);
                                setAnswerInput(value);
                              }}
                              placeholder="VD: ACDB"
                              disabled={gameState.status !== "question_open" || isTimeUp}
                              className="flex-1 px-6 py-4 bg-slate-800/80 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-neon-blue disabled:opacity-50 disabled:cursor-not-allowed text-lg font-mono text-center"
                              autoFocus
                              maxLength={4}
                            />
                            <button
                              type="submit"
                              disabled={
                                !answerInput.trim() ||
                                answerInput.length !== activeQuestion.steps?.length ||
                                gameState.status !== "question_open" ||
                                isTimeUp
                              }
                              className="px-10 py-4 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold rounded-lg transition-all duration-200 shadow-lg shadow-green-500/50 hover:shadow-green-500/70 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 text-lg"
                            >
                              ✓ Gửi
                            </button>
                          </div>
                          <div className="text-xs text-gray-400 italic text-center">
                            💡 Nhập thứ tự đúng của các bước (ví dụ: ACDB nghĩa là A → C → D → B)
                          </div>
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
                      teamItem.id === round3TeamId
                        ? "bg-neon-blue/20 border-neon-blue"
                        : "bg-slate-800/50 border-slate-700"
                    }`}
                    whileHover={{ scale: 1.05 }}
                  >
                    <div
                      className={`text-sm font-medium mb-2 ${
                        teamItem.id === round3TeamId
                          ? "text-neon-blue"
                          : "text-gray-300"
                      }`}
                    >
                      {teamItem.name}
                    </div>
                    <div className="text-2xl font-bold text-white">
                      {teamItem.score}
                    </div>
                  </motion.div>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

