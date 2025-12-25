"use client";

import { useState, useEffect, useCallback } from "react";
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
import { compareAnswers, compareKeyword } from "@/lib/round2/helpers";

export default function Round2PlayPage() {
  const [state, setState] = useState<Round2State | null>(null);
  const [keywordInput, setKeywordInput] = useState("");
  const [answerInput, setAnswerInput] = useState("");

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
    // Poll state mỗi 500ms để sync real-time
    const interval = setInterval(loadState, 500);
    return () => clearInterval(interval);
  }, [loadState]);

  // Timer countdown
  useEffect(() => {
    if (!state?.gameState) return;
    if (state.gameState.status !== "question_open") return;
    if (state.gameState.timeLeft <= 0) {
      // Hết thời gian => auto mark wrong
      handleAnswerSubmit("");
      return;
    }

    const timer = setInterval(() => {
      setState((prev) => {
        if (!prev || prev.gameState.status !== "question_open") {
          clearInterval(timer);
          return prev;
        }
        
        const newTimeLeft = prev.gameState.timeLeft - 1;
        if (newTimeLeft <= 0) {
          clearInterval(timer);
          // Hết thời gian => auto mark wrong
          handleAnswerSubmit("");
          return prev;
        }
        
        // Update local state immediately for UI responsiveness
        const updatedState = {
          ...prev,
          gameState: { ...prev.gameState, timeLeft: newTimeLeft },
        };
        
        // Sync với server
        updateGameState({ timeLeft: newTimeLeft }).catch(console.error);
        
        return updatedState;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [state?.gameState?.status, state?.gameState?.timeLeft]);

  const updateGameState = async (updates: Partial<Round2GameState>) => {
    try {
      const res = await fetch("/api/round2/state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "setGameState", data: updates }),
      });
      if (res.ok) {
        loadState();
      }
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

    const question = state.config.questions.find(
      (q) => q.id === state.gameState.activeQuestionId
    );
    if (!question) return;

    // Lưu đáp án vào lastAnswerInput để MC xem
    // So sánh để set status (nhưng MC vẫn phải xác nhận)
    const isCorrect = answer.trim() ? compareAnswers(answer, question.answerText) : false;
    
    // Cập nhật game state với đáp án đã gửi
    await updateGameState({
      lastAnswerInput: answer.trim(),
      status: isCorrect ? "answered_correct" : "answered_wrong",
      timeLeft: 0,
    });

    // KHÔNG tự động cộng điểm, MC sẽ xác nhận và cộng điểm
    // KHÔNG tự động reveal tile, MC sẽ xác nhận mới reveal

    loadState();
  };

  const handleGuessKeyword = async () => {
    if (!state?.config || !keywordInput.trim()) return;

    const isCorrect = compareKeyword(keywordInput, state.config.keywordAnswer);
    if (isCorrect && state.gameState.activeTeamId) {
      await updateTeamScore(state.gameState.activeTeamId, 80);
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
  const activeQuestion = gameState.activeQuestionId
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

        <div className="grid grid-cols-3 gap-6 h-[calc(100vh-120px)]">
          {/* Left: Tile Grid */}
          <div className="col-span-2 space-y-4">
            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700 h-[60%]">
              <TileGrid
                imageUrl={config.imageOriginalUrl}
                tiles={config.questions.map((q) => ({
                  id: q.id,
                  status: q.tileStatus,
                }))}
                onTileClick={handleSelectTile}
              />
            </div>

            {/* Obstacle Display */}
            <div className="h-[40%]">
              <ObstacleDisplay
                keywordLength={config.keywordLength}
                answerWordCounts={answerWordCounts}
              />
            </div>
          </div>

          {/* Right: Controls & Question */}
          <div className="space-y-4">
            {/* Question Panel */}
            <div className="h-[50%]">
              <QuestionPanel
                questionText={activeQuestion?.questionText || null}
                timeLeft={gameState.timeLeft}
                onSubmitAnswer={handleAnswerSubmit}
                disabled={isDisabled || gameState.status !== "question_open"}
              />
            </div>

            {/* Team Controls */}
            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700 h-[50%] overflow-y-auto">
              <TeamControls
                teams={teams}
                activeTeamId={gameState.activeTeamId}
                onSelectTeam={handleSelectTeam}
                onSelectTile={handleSelectTile}
                availableTiles={availableTiles}
                keywordInput={keywordInput}
                onKeywordInputChange={setKeywordInput}
                onGuessKeyword={handleGuessKeyword}
                disabled={isDisabled}
              />

              {/* Status */}
              <div className="mt-4 pt-4 border-t border-slate-600">
                <div className="text-white text-sm">
                  <div>Trạng thái: {gameState.status}</div>
                  {gameState.activeTeamId && (
                    <div>
                      Đội đang chơi:{" "}
                      {teams.find((t) => t.id === gameState.activeTeamId)?.name}
                    </div>
                  )}
                  {gameState.guessedKeywordCorrect && (
                    <div className="text-green-400 font-bold mt-2">
                      ✓ Đã đoán đúng từ khóa!
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

