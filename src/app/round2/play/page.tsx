"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { TileGrid } from "@/components/round2/TileGrid";
import { ObstacleDisplay } from "@/components/round2/ObstacleDisplay";
import { QuestionPanel } from "@/components/round2/QuestionPanel";
import { TeamControls } from "@/components/round2/TeamControls";
import {
  Round2State,
  Round2Config,
  Round2GameState,
  Round2Team,
  Round2TileStatus,
} from "@/lib/round2/types";
import { compareKeyword } from "@/lib/round2/helpers";
import { useAuth } from "@/hooks/useAuth";
import { Bell } from "lucide-react";

export default function Round2PlayPage() {
  const { team } = useAuth(); // Lấy thông tin đội đang đăng nhập
  const [state, setState] = useState<Round2State | null>(null);
  const [keywordInput, setKeywordInput] = useState("");
  const [answerInput, setAnswerInput] = useState("");
  const [round2TeamId, setRound2TeamId] = useState<number | null>(null); // Map team từ DB sang Round2Team id
  const syncCounterRef = useRef(0); // Đếm số lần để sync với server mỗi 5 giây

  // Load state từ API
  const loadState = useCallback(async () => {
    try {
      const res = await fetch("/api/round2/state");
      const data = await res.json();
      setState(data);
    } catch (error) {
      console.error("Error loading state:", error);
    }
  }, []);

  useEffect(() => {
    loadState();
    // Poll state mỗi 2 giây để sync real-time (giảm từ 500ms để tránh giật UI)
    const interval = setInterval(loadState, 2000);
    return () => clearInterval(interval);
  }, [loadState]);

  // Map team từ DB sang Round2Team id
  useEffect(() => {
    if (team && state?.teams) {
      // Tìm team trong state.teams dựa vào teamName
      const round2Team = state.teams.find(
        (t: any) => t.name === team.teamName
      );
      if (round2Team) {
        setRound2TeamId(round2Team.id);
      }
    }
  }, [team, state?.teams]);

  // Timer countdown - tối ưu để tránh re-render không cần thiết
  useEffect(() => {
    if (!state?.gameState) return;
    if (state.gameState.status !== "question_open") return;
    if (state.gameState.timeLeft <= 0) {
      // Hết thời gian => chỉ dừng timer, không tự động submit
      syncCounterRef.current = 0; // Reset counter khi timer dừng
      return;
    }

    // Reset counter khi timer mới bắt đầu
    syncCounterRef.current = 0;

    const timer = setInterval(() => {
      setState((prev) => {
        if (!prev || prev.gameState.status !== "question_open") {
          clearInterval(timer);
          return prev;
        }
        
        const newTimeLeft = prev.gameState.timeLeft - 1;
        syncCounterRef.current++;

        if (newTimeLeft <= 0) {
          clearInterval(timer);
          syncCounterRef.current = 0;
          // Hết thời gian => chỉ cập nhật timeLeft = 0, giữ nguyên status
          const updatedState = {
            ...prev,
            gameState: { ...prev.gameState, timeLeft: 0 },
          };
          
          // Sync với server khi hết thời gian
          updateGameState({ timeLeft: 0 }).catch(console.error);
          
          return updatedState;
        }
        
        // Update local state immediately for UI responsiveness
        const updatedState = {
          ...prev,
          gameState: { ...prev.gameState, timeLeft: newTimeLeft },
        };
        
        // Sync với server mỗi 5 giây thay vì mỗi giây để giảm tải
        if (syncCounterRef.current >= 5) {
          syncCounterRef.current = 0;
          updateGameState({ timeLeft: newTimeLeft }).catch(console.error);
        }
        
        return updatedState;
      });
    }, 1000);

    return () => {
      clearInterval(timer);
      syncCounterRef.current = 0;
    };
    // Loại bỏ state?.gameState?.timeLeft khỏi dependencies để tránh vòng lặp re-render
  }, [state?.gameState?.status]);

  const updateGameState = async (updates: Partial<Round2GameState>) => {
    try {
      const res = await fetch("/api/round2/state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "setGameState", data: updates }),
      });
      // Không gọi loadState() ngay lập tức để tránh re-render không cần thiết
      // State sẽ được sync qua polling interval
    } catch (error) {
      console.error("Error updating game state:", error);
    }
  };

  const updateTeamScore = async (teamId: number, delta: number) => {
    try {
      const res = await fetch("/api/round2/state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "updateTeamScore", data: { teamId, delta } }),
      });
      if (res.ok) {
        loadState();
      }
    } catch (error) {
      console.error("Error updating score:", error);
    }
  };

  const handleSelectTeam = async (teamId: number) => {
    await updateGameState({ activeTeamId: teamId });
  };

  const handleSelectTile = async (tileId: 1 | 2 | 3 | 4) => {
    if (!state?.config) return;
    const question = state.config.questions.find((q) => q.id === tileId);
    if (!question) return;

    // Chỉ chọn được nếu tile status = hidden
    if (question.tileStatus !== "hidden") return;

    // KHÔNG thay đổi tileStatus, chỉ set gameState
    // Tile vẫn giữ status "hidden" cho đến khi MC xác nhận đúng

    try {
      // Chỉ set tile_selected, không tự động mở câu hỏi
      await updateGameState({
        status: "tile_selected",
        activeQuestionId: tileId,
        timeLeft: 15,
      });
      loadState();
    } catch (error) {
      console.error("Error selecting tile:", error);
    }
  };

  const handleAnswerSubmit = async (answer: string) => {
    if (!state?.config || !state.gameState.activeQuestionId) return;
    // Nếu đã kết thúc vòng, không cho submit
    if (state.gameState.status === "round_finished") return;
    if (state.gameState.status !== "question_open") return; // Chỉ submit khi question_open
    if (!round2TeamId || !team) return; // Phải có team đăng nhập

    // Kiểm tra xem đội đã submit đáp án cho câu hỏi này chưa
    const existingAnswer = state.gameState.teamAnswers.find(
      (ta) => ta.teamId === round2TeamId
    );
    if (existingAnswer) {
      // Đã submit rồi, không cho submit lại
      return;
    }

    // Submit đáp án qua API - API sẽ xử lý lưu vào teamAnswers
    // Không tự động đánh giá, chỉ lưu đáp án để MC chấm
    // Dùng round2TeamId (đội đang đăng nhập) thay vì activeTeamId (đội MC chọn)
    try {
      const res = await fetch("/api/round2/state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "submitAnswer",
          data: {
            teamId: round2TeamId, // Dùng teamId của đội đang đăng nhập
            teamName: team.teamName, // Gửi teamName để đảm bảo hiển thị đúng
            answer: answer.trim(),
          },
        }),
      });
      if (res.ok) {
    loadState();
      } else {
        // Xử lý lỗi nếu API trả về lỗi (ví dụ: đã submit rồi)
        const errorData = await res.json();
        console.error("Error submitting answer:", errorData.error);
      }
    } catch (error) {
      console.error("Error submitting answer:", error);
    }
  };

  const handleGuessKeyword = async () => {
    if (!state?.config || !keywordInput.trim()) return;
    if (!round2TeamId) return; // Phải có team đăng nhập

    const isCorrect = compareKeyword(keywordInput, state.config.keywordAnswer);
    if (isCorrect) {
      await updateTeamScore(round2TeamId, 80); // Dùng round2TeamId của đội đang đăng nhập
      await updateGameState({
        status: "round_finished",
        guessedKeywordCorrect: true,
      });
      setKeywordInput("");
    } else {
      alert("Sai! Thử lại.");
    }
    loadState();
  };

  if (!state || !state.config) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-white text-xl">Chưa có config. Vui lòng tạo config ở /round2/admin</div>
      </div>
    );
  }

  const { config, gameState, teams } = state;
  // Chỉ lấy câu hỏi khi status = "question_open", không lấy khi "tile_selected"
  const activeQuestion = gameState.status === "question_open" && gameState.activeQuestionId
    ? config.questions.find((q) => q.id === gameState.activeQuestionId)
    : null;

  const availableTiles = config.questions
    .filter((q) => q.tileStatus === "hidden")
    .map((q) => q.id);

  const answerWordCounts = config.questions.map((q) => q.answerWordCount);

  const isDisabled = gameState.status === "round_finished";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6">
      <div className="max-w-[1800px] mx-auto">
        <h1 className="text-3xl font-bold text-neon-blue mb-6 text-center">
          Vòng 2: Hành trình giọt dầu
        </h1>

        <div className="grid grid-cols-2 grid-rows-2 gap-4 h-[calc(100vh-120px)] min-h-[700px]">
          {/* Ô 1: Tile Grid */}
          <div className="bg-slate-950/95 rounded-xl p-4 border border-slate-700/50 relative overflow-hidden">
              <TileGrid
                imageUrl={config.imageOriginalUrl}
                tiles={config.questions.map((q) => ({
                  id: q.id,
                  status: q.tileStatus,
                }))}
                onTileClick={handleSelectTile}
              />
            </div>

          {/* Ô 2: Obstacle Display */}
          <div className="bg-slate-950/95 rounded-xl p-4 border border-slate-700/50 relative overflow-hidden">
              <ObstacleDisplay
                keywordLength={config.keywordLength}
                answerWordCounts={answerWordCounts}
                questions={config.questions}
                activeQuestionId={gameState.activeQuestionId}
              />
          </div>

          {/* Ô 3: Câu hỏi + Timer + Input đáp án */}
          <div className="bg-slate-950/95 rounded-xl p-6 border-2 border-white/90 relative overflow-hidden flex flex-col">
            {/* Bảng điểm các đội - phía trên */}
            {teams && teams.length > 0 && (
              <div className="mb-4 pb-4 border-b border-slate-700/50">
                <div className="flex items-center justify-between gap-2">
                    {teams
                    .sort((a, b) => b.score - a.score)
                    .map((teamItem) => {
                      const buzzerPresses = state?.gameState?.buzzerPresses || [];
                      const isBuzzerTeam = buzzerPresses.some((bp: any) => bp.teamId === teamItem.id);
                      const isFirstBuzzer = buzzerPresses.length > 0 && buzzerPresses[0].teamId === teamItem.id;
                      
                      // Tìm thứ tự của đội này trong danh sách buzzer để áp dụng màu
                      const buzzerIndex = buzzerPresses.findIndex((bp: any) => bp.teamId === teamItem.id);
                      
                      // Màu khác nhau cho mỗi đội: cam, vàng, xanh lá, tím, hồng
                      const buzzerColors = [
                        { border: "border-orange-500", bg: "bg-orange-900/40", shadow: "shadow-orange-500/50", ring: "ring-orange-400", ping: "bg-orange-500/40", gradient: "from-orange-400/30 via-yellow-400/30 to-orange-500/30", text: "text-orange-300", badge: "bg-orange-500" },
                        { border: "border-yellow-500", bg: "bg-yellow-900/40", shadow: "shadow-yellow-500/50", ring: "ring-yellow-400", ping: "bg-yellow-500/40", gradient: "from-yellow-400/30 via-amber-400/30 to-yellow-500/30", text: "text-yellow-300", badge: "bg-yellow-500" },
                        { border: "border-green-500", bg: "bg-green-900/40", shadow: "shadow-green-500/50", ring: "ring-green-400", ping: "bg-green-500/40", gradient: "from-green-400/30 via-emerald-400/30 to-green-500/30", text: "text-green-300", badge: "bg-green-500" },
                        { border: "border-purple-500", bg: "bg-purple-900/40", shadow: "shadow-purple-500/50", ring: "ring-purple-400", ping: "bg-purple-500/40", gradient: "from-purple-400/30 via-pink-400/30 to-purple-500/30", text: "text-purple-300", badge: "bg-purple-500" },
                      ];
                      
                      const colorScheme = buzzerIndex >= 0 ? buzzerColors[buzzerIndex % buzzerColors.length] : null;
                      
                      return (
                        <div
                          key={teamItem.id}
                          className={`flex-1 flex flex-col items-center p-2 rounded-lg border transition-all relative ${
                            team && team.teamName === teamItem.name
                              ? "bg-neon-blue/20 border-neon-blue"
                              : "bg-slate-800/50 border-slate-700"
                          } ${isBuzzerTeam && colorScheme ? `${colorScheme.border} ${colorScheme.bg} shadow-lg ${colorScheme.shadow}` : ""} ${isFirstBuzzer && colorScheme ? `ring-2 ${colorScheme.ring} ring-offset-2 ring-offset-slate-950` : ""}`}
                        >
                          {/* Visual effect nhấp nháy liên tục khi đội này bấm chuông - màu khác nhau cho mỗi đội */}
                          {isBuzzerTeam && colorScheme && (
                            <>
                              <div className={`absolute inset-0 ${colorScheme.ping} rounded-lg animate-ping`} />
                              <div className={`absolute inset-0 bg-gradient-to-br ${colorScheme.gradient} rounded-lg animate-pulse`} />
                            </>
                          )}
                          {/* Hiệu ứng đặc biệt cho đội bấm trước */}
                          {isFirstBuzzer && colorScheme && (
                            <div className={`absolute -top-1 -right-1 ${colorScheme.badge} text-white text-xs font-bold px-2 py-1 rounded-full animate-bounce`}>
                              1ST
                            </div>
                          )}
                          <div
                            className={`text-xs font-medium mb-1 relative z-10 ${
                              team && team.teamName === teamItem.name
                                ? "text-neon-blue"
                                : isBuzzerTeam && colorScheme
                                ? isFirstBuzzer
                                  ? `${colorScheme.text} font-bold drop-shadow-lg`
                                  : `${colorScheme.text} font-semibold`
                                : "text-gray-300"
                            }`}
                          >
                            {teamItem.name}
                            {isBuzzerTeam && " 🔔"}
                            {isFirstBuzzer && " ⭐"}
                          </div>
                          <div className={`font-bold text-lg relative z-10 ${
                            isBuzzerTeam && colorScheme ? isFirstBuzzer ? `${colorScheme.text} drop-shadow-lg` : colorScheme.text : "text-white"
                          }`}>
                            {teamItem.score}
                          </div>
                        </div>
                      );
                    })}
            </div>
          </div>
            )}

            {gameState.status === "tile_selected" && gameState.activeQuestionId ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-gray-400 text-lg italic">
                  Chờ MC bấm "Bắt đầu" để mở câu hỏi...
                </div>
              </div>
            ) : (
              <QuestionPanel
                questionText={activeQuestion?.questionText || null}
                timeLeft={gameState.timeLeft}
                onSubmitAnswer={handleAnswerSubmit}
                disabled={
                  isDisabled ||
                  gameState.status !== "question_open" ||
                  !!gameState.teamAnswers.find((ta) => ta.teamId === round2TeamId)
                }
                submittedAnswer={
                  gameState.teamAnswers.find((ta) => ta.teamId === round2TeamId) || null
                }
              />
            )}
            </div>

          {/* Ô 4: Nút rung chuông */}
          <div className="bg-slate-950/95 rounded-xl p-6 border border-slate-700/50 relative overflow-hidden flex flex-col items-center justify-center">
            {(() => {
              const myTeam = teams.find((t) => t.id === round2TeamId);
              const isLocked = myTeam?.isLocked || false;
              const buzzerPresses = state?.gameState?.buzzerPresses || [];
              const isMyBuzzer = buzzerPresses.some((bp: any) => bp.teamId === round2TeamId);
              const firstBuzzerTeam = buzzerPresses.length > 0 ? buzzerPresses[0] : null;
              // Cho phép bấm chuông ở mọi trạng thái (trừ khi bị khóa hoặc đã bấm rồi)
              const canPressBuzzer = !isLocked && !isMyBuzzer;
              
              return (
                <>
                  {/* Visual effect khi đội này bấm chuông */}
                  {isMyBuzzer && (
                    <div className="absolute inset-0 bg-yellow-400/30 animate-pulse rounded-xl" />
                  )}
                  
                  <button
                    onClick={async () => {
                      if (!canPressBuzzer || !round2TeamId || !team) return;
                      
                      try {
                        const res = await fetch("/api/round2/state", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            action: "pressBuzzer",
                            data: {
                              teamId: round2TeamId,
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
                    }}
                    disabled={!canPressBuzzer}
                    className={`group relative w-48 h-48 rounded-full shadow-2xl transition-all duration-300 flex items-center justify-center ${
                      isLocked
                        ? "bg-gray-600 cursor-not-allowed opacity-50"
                        : isMyBuzzer
                        ? "bg-gradient-to-br from-green-500 via-green-400 to-emerald-500 hover:shadow-green-500/50 hover:scale-105"
                        : "bg-gradient-to-br from-yellow-500 via-yellow-400 to-orange-500 hover:shadow-yellow-500/50 hover:scale-105 active:scale-95"
                    }`}
                  >
                    {/* Glow effect */}
                    {!isLocked && !isMyBuzzer && (
                      <div className="absolute inset-0 rounded-full bg-yellow-400/30 blur-xl group-hover:bg-yellow-400/50 transition-all duration-300" />
                    )}
                    {isMyBuzzer && (
                      <div className="absolute inset-0 rounded-full bg-green-400/50 blur-xl animate-pulse" />
                    )}
                    
                    {/* Bell icon */}
                    <Bell className={`w-24 h-24 text-white drop-shadow-lg ${isMyBuzzer ? "animate-bounce" : "group-hover:animate-pulse"}`} strokeWidth={2.5} />
                    
                    {/* Ripple effect */}
                    {!isLocked && !isMyBuzzer && (
                      <div className="absolute inset-0 rounded-full border-4 border-yellow-300/50 animate-ping opacity-0 group-hover:opacity-100" />
                  )}
                    {isMyBuzzer && (
                      <div className="absolute inset-0 rounded-full border-4 border-green-300/50 animate-ping" />
                    )}
                  </button>
                  
                  {/* Label */}
                  <div className="mt-6 text-center">
                    <div className={`text-xl font-bold mb-1 ${
                      isLocked ? "text-gray-500" : isMyBuzzer ? "text-green-400" : "text-white"
                    }`}>
                      {isLocked ? "ĐÃ BỊ KHÓA" : isMyBuzzer ? "ĐÃ BẤM CHUÔNG" : "RUNG CHUÔNG"}
                    </div>
                    <div className="text-gray-400 text-sm">
                      {isLocked ? "Không thể tham gia" : isMyBuzzer ? "Chờ MC chấm điểm" : firstBuzzerTeam ? `Đội bấm trước: ${firstBuzzerTeam.teamName}` : "Nhấn để rung chuông"}
                </div>
              </div>
                </>
              );
            })()}
          </div>
        </div>
      </div>
    </div>
  );
}

