"use client";

import { useState, useEffect } from "react";
import { Round4Team, Round4PackageType, Round4Question, Round4Config, Round4State } from "@/lib/round4/types";

// Types cho local state
type Round4MCStatus = "IDLE" | "ASKING_MAIN" | "STEALING" | "RESOLVED";

type MainAnswerResult = "CORRECT" | "WRONG" | "NO_ANSWER" | null;

interface StealState {
  enabled: boolean;
  buzzWinnerTeamId: number | null;
  result: "CORRECT" | "WRONG" | null;
}

// Helper functions
function halfPoints(points: 10 | 20 | 30): number {
  return points / 2;
}

function applyMainResult(
  teams: Round4Team[],
  teamId: number,
  result: "CORRECT" | "WRONG" | "NO_ANSWER",
  questionPoints: 10 | 20 | 30
): Round4Team[] {
  const updatedTeams = [...teams];
  const teamIndex = updatedTeams.findIndex((t) => t.id === teamId);
  
  if (teamIndex === -1) return teams;
  
  if (result === "CORRECT") {
    updatedTeams[teamIndex].score += questionPoints;
  }
  // WRONG và NO_ANSWER không cộng điểm (sẽ mở cướp điểm)
  
  return updatedTeams;
}

function applyStealResult(
  teams: Round4Team[],
  stealTeamId: number,
  stealResult: "CORRECT" | "WRONG",
  mainTeamId: number,
  questionPoints: 10 | 20 | 30
): Round4Team[] {
  const updatedTeams = [...teams];
  const stealTeamIndex = updatedTeams.findIndex((t) => t.id === stealTeamId);
  const mainTeamIndex = updatedTeams.findIndex((t) => t.id === mainTeamId);
  
  if (stealResult === "CORRECT") {
    // Đội cướp +Q điểm
    if (stealTeamIndex !== -1) {
      updatedTeams[stealTeamIndex].score += questionPoints;
    }
    // Đội chính -Q điểm
    if (mainTeamIndex !== -1) {
      updatedTeams[mainTeamIndex].score -= questionPoints;
    }
  } else {
    // Đội cướp - (Q/2) điểm
    const deductPoints = halfPoints(questionPoints);
    if (stealTeamIndex !== -1) {
      updatedTeams[stealTeamIndex].score -= deductPoints;
    }
    // Đội chính không bị trừ thêm
  }
  
  return updatedTeams;
}

// Helper để lấy câu hỏi từ package
function getQuestionFromPackage(
  packageType: Round4PackageType,
  questions: Round4Question[],
  currentIndex: number
): Round4Question | null {
  if (questions.length === 0 || currentIndex >= questions.length) return null;
  return questions[currentIndex];
}

interface Round4ControlProps {
  round4State: Round4State | null;
  onStateUpdate?: (state: Round4State) => void;
}

export function Round4Control({ round4State, onStateUpdate }: Round4ControlProps) {
  const [teams, setTeams] = useState<Round4Team[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<Round4PackageType | null>(null);
  const [packageQuestions, setPackageQuestions] = useState<Round4Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [status, setStatus] = useState<Round4MCStatus>("IDLE");
  const [mainAnswerResult, setMainAnswerResult] = useState<MainAnswerResult>(null);
  const [steal, setSteal] = useState<StealState>({
    enabled: false,
    buzzWinnerTeamId: null,
    result: null,
  });
  const [config, setConfig] = useState<Round4Config | null>(null);

  // Sync với round4State từ parent
  useEffect(() => {
    if (round4State) {
      if (round4State.teams && round4State.teams.length > 0) {
        setTeams(round4State.teams);
      }
      
      // Load state hiện tại nếu có
      if (round4State.gameState) {
        if (round4State.gameState.currentMainTeamId) {
          setSelectedTeamId(round4State.gameState.currentMainTeamId);
        } else {
          setSelectedTeamId(null);
        }
        if (round4State.gameState.currentPackageType) {
          setSelectedPackage(round4State.gameState.currentPackageType);
        } else {
          setSelectedPackage(null);
        }
        if (round4State.gameState.currentQuestionIndex !== undefined) {
          setCurrentQuestionIndex(round4State.gameState.currentQuestionIndex);
        } else {
          setCurrentQuestionIndex(0);
        }
      }
      
      // Load config
      if (round4State.config) {
        setConfig(round4State.config);
        
        // Load package questions từ config nếu có
        if (round4State.config.packages && round4State.gameState?.currentMainTeamId) {
          const teamId = round4State.gameState.currentMainTeamId;
          const teamPackage = round4State.config.packages.find(
            (p: any) => p.selectedByTeamId === teamId
          );
          if (teamPackage && teamPackage.questions) {
            setPackageQuestions(teamPackage.questions);
          }
        }
      }
    }
  }, [round4State]);

  // Chọn đội
  const handleSelectTeam = async (teamId: number) => {
    try {
      const res = await fetch("/api/round4/state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "selectTeam",
          data: { teamId },
        }),
      });
      
      const result = await res.json();
      
      if (!res.ok) {
        // Nếu lỗi do status không hợp lệ, tự động reset rồi thử lại
        if (result.error && result.error.includes("trạng thái này")) {
          const resetRes = await fetch("/api/round4/state", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "reset" }),
          });
          
          if (resetRes.ok) {
            // Reset local state
            setSelectedTeamId(null);
            setSelectedPackage(null);
            setPackageQuestions([]);
            setCurrentQuestionIndex(0);
            setStatus("IDLE");
            setMainAnswerResult(null);
            setSteal({ enabled: false, buzzWinnerTeamId: null, result: null });
            
            // Thử chọn đội lại
            const retryRes = await fetch("/api/round4/state", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                action: "selectTeam",
                data: { teamId },
              }),
            });
            
            const retryResult = await retryRes.json();
            if (retryRes.ok && retryResult.state) {
              setSelectedTeamId(teamId);
              setSelectedPackage(null);
              setPackageQuestions([]);
              setCurrentQuestionIndex(0);
              setStatus("IDLE");
              setMainAnswerResult(null);
              setSteal({ enabled: false, buzzWinnerTeamId: null, result: null });
              
              if (retryResult.state.teams) {
                setTeams(retryResult.state.teams);
              }
              
              if (onStateUpdate && retryResult.state) {
                onStateUpdate(retryResult.state);
              }
              
              return;
            }
          }
        }
        
        alert(result.error || "Lỗi khi chọn đội");
        return;
      }
      
      // Cập nhật state
      setSelectedTeamId(teamId);
      setSelectedPackage(null);
      setPackageQuestions([]);
      setCurrentQuestionIndex(0);
      setStatus("IDLE");
      setMainAnswerResult(null);
      setSteal({ enabled: false, buzzWinnerTeamId: null, result: null });
      
      if (result.state && result.state.teams) {
        setTeams(result.state.teams);
      }
      
      if (onStateUpdate && result.state) {
        onStateUpdate(result.state);
      }
    } catch (error) {
      console.error("Error selecting team:", error);
      alert("Lỗi khi chọn đội");
    }
  };

  // Chọn gói câu hỏi
  const handleSelectPackage = async (packageType: Round4PackageType) => {
    if (!selectedTeamId) return;
    
    try {
      const res = await fetch("/api/round4/state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "selectPackageForTeam",
          data: { packageType },
        }),
      });
      
      const result = await res.json();
      
      if (!res.ok) {
        alert(result.error || "Lỗi khi chọn gói câu hỏi");
        return;
      }
      
      // Cập nhật state từ API response
      if (result.state) {
        if (result.state.teams) {
          setTeams(result.state.teams);
        }
        
        // Lấy questions từ config
        if (result.state.config) {
          setConfig(result.state.config);
          
          if (result.state.config.packages) {
            const teamPackage = result.state.config.packages.find(
              (p: any) => p.selectedByTeamId === selectedTeamId && p.type === packageType
            );
            if (teamPackage && teamPackage.questions) {
              setPackageQuestions(teamPackage.questions);
              setSelectedPackage(packageType);
              setCurrentQuestionIndex(0);
              setStatus("IDLE");
              setMainAnswerResult(null);
              setSteal({ enabled: false, buzzWinnerTeamId: null, result: null });
            }
          }
        }
      }
      
      if (onStateUpdate && result.state) {
        onStateUpdate(result.state);
      }
    } catch (error) {
      console.error("Error selecting package:", error);
      alert("Lỗi khi chọn gói câu hỏi");
    }
  };

  // Hiển thị câu hỏi tiếp theo
  const handleNextQuestion = async () => {
    if (currentQuestionIndex < packageQuestions.length - 1) {
      const nextIndex = currentQuestionIndex + 1;
      const question = packageQuestions[nextIndex];
      if (!question) return;
      
      try {
        const res = await fetch("/api/round4/state", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "setGameState",
            data: {
              status: "question_open",
              currentQuestionId: question.id,
              currentQuestionIndex: nextIndex,
              timeLeft: question.timeLimitSec,
            },
          }),
        });
        
        const result = await res.json();
        
        if (!res.ok) {
          alert(result.error || "Lỗi khi chuyển câu hỏi");
          return;
        }
        
        setCurrentQuestionIndex(nextIndex);
        setStatus("ASKING_MAIN");
        setMainAnswerResult(null);
        setSteal({ enabled: false, buzzWinnerTeamId: null, result: null });
        
        if (onStateUpdate && result.state) {
          onStateUpdate(result.state);
        }
      } catch (error) {
        console.error("Error moving to next question:", error);
        alert("Lỗi khi chuyển câu hỏi");
      }
    } else {
      // Hết câu trong gói
      try {
        const res = await fetch("/api/round4/state", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "setGameState",
            data: {
              status: "idle",
            },
          }),
        });
        
        const result = await res.json();
        
        if (res.ok) {
          setStatus("IDLE");
          if (onStateUpdate && result.state) {
            onStateUpdate(result.state);
          }
        }
      } catch (error) {
        console.error("Error finishing package:", error);
      }
    }
  };

  // Bắt đầu hỏi câu (có thể bắt đầu từ bất kỳ câu nào)
  const handleStartQuestion = async (questionIndex?: number) => {
    const indexToUse = questionIndex !== undefined ? questionIndex : currentQuestionIndex;
    if (packageQuestions.length === 0 || !selectedTeamId || indexToUse >= packageQuestions.length || indexToUse < 0) return;
    
    const question = packageQuestions[indexToUse];
    if (!question) return;
    
    try {
      const res = await fetch("/api/round4/state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "setGameState",
          data: {
            status: "question_open",
            currentQuestionId: question.id,
            currentQuestionIndex: indexToUse,
            timeLeft: question.timeLimitSec,
          },
        }),
      });
      
      const result = await res.json();
      
      if (!res.ok) {
        alert(result.error || "Lỗi khi mở câu hỏi");
        return;
      }
      
      // Cập nhật local state sau khi API thành công
      setCurrentQuestionIndex(indexToUse);
      setStatus("ASKING_MAIN");
      setMainAnswerResult(null);
      setSteal({ enabled: false, buzzWinnerTeamId: null, result: null });
      
      if (onStateUpdate && result.state) {
        onStateUpdate(result.state);
      }
    } catch (error) {
      console.error("Error starting question:", error);
      alert("Lỗi khi mở câu hỏi");
    }
  };

  // MC chấm điểm cho đội chính
  const handleMainTeamJudgment = async (result: "CORRECT" | "WRONG" | "NO_ANSWER") => {
    if (!selectedTeamId || packageQuestions.length === 0) return;
    
    // Sử dụng currentQuestionIndex trực tiếp từ state hiện tại
    if (currentQuestionIndex >= packageQuestions.length || currentQuestionIndex < 0) return;
    const currentQ = packageQuestions[currentQuestionIndex];
    if (!currentQ) return;
    
    try {
      // Đảm bảo status là "waiting_mc_judgment" trước khi chấm
      // Nếu chưa có answer, tạo một answer giả trước
      const res = await fetch("/api/round4/state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "markAnswer",
          data: {
            judgment: result === "CORRECT" ? "correct" : result === "WRONG" ? "incorrect" : "no_answer",
          },
        }),
      });
      
      const apiResult = await res.json();
      
      if (!res.ok) {
        // Nếu lỗi do chưa có answer, tạo answer trước
        if (apiResult.error && apiResult.error.includes("đáp án")) {
          // Tạo answer giả trước khi chấm
          const submitRes = await fetch("/api/round4/state", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "submitAnswer",
              data: {
                teamId: selectedTeamId,
                teamName: teams.find((t) => t.id === selectedTeamId)?.name || `Đội ${selectedTeamId}`,
                answer: result === "NO_ANSWER" ? "" : "(MC chấm trực tiếp)",
              },
            }),
          });
          
          if (submitRes.ok) {
            // Thử chấm lại
            const retryRes = await fetch("/api/round4/state", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                action: "markAnswer",
                data: {
                  judgment: result === "CORRECT" ? "correct" : result === "WRONG" ? "incorrect" : "no_answer",
                },
              }),
            });
            
            const retryResult = await retryRes.json();
            if (retryRes.ok && retryResult.state) {
              setMainAnswerResult(result);
              if (result === "CORRECT") {
                setStatus("RESOLVED");
              } else {
                setStatus("STEALING");
                setSteal({ enabled: true, buzzWinnerTeamId: null, result: null });
              }
              if (retryResult.state.teams) {
                setTeams(retryResult.state.teams);
              }
              if (onStateUpdate && retryResult.state) {
                onStateUpdate(retryResult.state);
              }
              return;
            }
          }
        }
        
        alert(apiResult.error || "Lỗi khi chấm điểm");
        return;
      }
      
      // Cập nhật local state sau khi API thành công
      setMainAnswerResult(result);
      if (result === "CORRECT") {
        setStatus("RESOLVED");
      } else {
        setStatus("STEALING");
        setSteal({ enabled: true, buzzWinnerTeamId: null, result: null });
      }
      
      if (apiResult.state && apiResult.state.teams) {
        setTeams(apiResult.state.teams);
      }
      
      if (onStateUpdate && apiResult.state) {
        onStateUpdate(apiResult.state);
      }
    } catch (error) {
      console.error("Error judging answer:", error);
      alert("Lỗi khi chấm điểm");
    }
  };

  // Đội rung chuông
  const handleTeamBuzz = async (teamId: number) => {
    if (steal.buzzWinnerTeamId !== null) return; // Đã có đội rung chuông
    
    try {
      const res = await fetch("/api/round4/state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "pressBuzzer",
          data: {
            teamId,
            teamName: teams.find((t) => t.id === teamId)?.name || `Đội ${teamId}`,
          },
        }),
      });
      
      const result = await res.json();
      
      if (!res.ok) {
        alert(result.error || "Lỗi khi rung chuông");
        return;
      }
      
      setSteal((prev) => ({ ...prev, buzzWinnerTeamId: teamId }));
      
      if (onStateUpdate && result.state) {
        onStateUpdate(result.state);
      }
    } catch (error) {
      console.error("Error pressing buzzer:", error);
      alert("Lỗi khi rung chuông");
    }
  };

  // MC chấm kết quả cướp điểm
  const handleStealJudgment = async (result: "CORRECT" | "WRONG") => {
    if (!selectedTeamId || !steal.buzzWinnerTeamId || packageQuestions.length === 0) return;
    
    // Sử dụng currentQuestionIndex trực tiếp từ state hiện tại
    if (currentQuestionIndex >= packageQuestions.length || currentQuestionIndex < 0) return;
    const currentQ = packageQuestions[currentQuestionIndex];
    if (!currentQ) return;
    
    try {
      const res = await fetch("/api/round4/state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "markAnswer",
          data: {
            judgment: result === "CORRECT" ? "correct" : "incorrect",
            teamId: steal.buzzWinnerTeamId,
          },
        }),
      });
      
      const apiResult = await res.json();
      
      if (!res.ok) {
        // Nếu lỗi do chưa có answer, tạo answer trước
        if (apiResult.error && apiResult.error.includes("đáp án")) {
          const submitRes = await fetch("/api/round4/state", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "submitAnswer",
              data: {
                teamId: steal.buzzWinnerTeamId,
                teamName: teams.find((t) => t.id === steal.buzzWinnerTeamId)?.name || `Đội ${steal.buzzWinnerTeamId}`,
                answer: "(MC chấm trực tiếp)",
              },
            }),
          });
          
          if (submitRes.ok) {
            // Thử chấm lại
            const retryRes = await fetch("/api/round4/state", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                action: "markAnswer",
                data: {
                  judgment: result === "CORRECT" ? "correct" : "incorrect",
                  teamId: steal.buzzWinnerTeamId,
                },
              }),
            });
            
            const retryResult = await retryRes.json();
            if (retryRes.ok && retryResult.state) {
              setSteal((prev) => ({ ...prev, result }));
              setStatus("RESOLVED");
              if (retryResult.state.teams) {
                setTeams(retryResult.state.teams);
              }
              if (onStateUpdate && retryResult.state) {
                onStateUpdate(retryResult.state);
              }
              return;
            }
          }
        }
        
        alert(apiResult.error || "Lỗi khi chấm điểm cướp");
        return;
      }
      
      // Cập nhật local state sau khi API thành công
      setSteal((prev) => ({ ...prev, result }));
      setStatus("RESOLVED");
      
      if (apiResult.state && apiResult.state.teams) {
        setTeams(apiResult.state.teams);
      }
      
      if (onStateUpdate && apiResult.state) {
        onStateUpdate(apiResult.state);
      }
    } catch (error) {
      console.error("Error judging steal:", error);
      alert("Lỗi khi chấm điểm cướp");
    }
  };

  // Get current question
  const getCurrentQuestion = (): Round4Question | null => {
    return getQuestionFromPackage(selectedPackage!, packageQuestions, currentQuestionIndex);
  };

  const currentQuestion = getCurrentQuestion();
  const otherTeams = teams.filter((t) => t.id !== selectedTeamId);

  return (
    <div className="bg-gray-800 rounded-lg p-4 space-y-4 border border-gray-700">
      <h2 className="text-xl font-bold mb-4 text-white">Vòng 4: Chinh phục đỉnh cao</h2>
      
      {/* Team Selector */}
      <div>
        <h3 className="text-lg font-semibold mb-2 text-white">Chọn đội chính</h3>
        {teams.length === 0 ? (
          <div className="text-center text-gray-400 py-4 text-sm">
            Chưa có đội nào. Vui lòng tạo đội trước.
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {teams.map((team) => {
              const teamPackage = config?.packages.find(
                (p) => p.selectedByTeamId === team.id
              );
              
              const isCurrentlyPlaying = selectedTeamId === team.id;
              
              const hasFinishedLastQuestion = isCurrentlyPlaying && 
                currentQuestionIndex === 2 && 
                status === "RESOLVED" &&
                packageQuestions.length === 3;
              
              const hasCompletedPackage = team.selectedPackage !== null && 
                teamPackage !== undefined &&
                teamPackage.questions.length === 3 &&
                (!isCurrentlyPlaying || hasFinishedLastQuestion);
              
              const isDisabled = hasCompletedPackage || (status !== "IDLE" && status !== "RESOLVED");
              
              return (
                <button
                  key={team.id}
                  onClick={() => handleSelectTeam(team.id)}
                  disabled={isDisabled}
                  className={`p-3 rounded-lg border transition-all text-center text-sm ${
                    selectedTeamId === team.id && !hasCompletedPackage
                      ? "bg-neon-blue/20 border-neon-blue ring-2 ring-neon-blue"
                      : hasCompletedPackage
                      ? "bg-green-900/20 border-green-600/50 opacity-75"
                      : "bg-gray-700 border-gray-600 hover:bg-gray-600"
                  } ${isDisabled ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  <div className="font-semibold text-white mb-1">{team.name}</div>
                  <div className="text-xs text-gray-400">Điểm: {team.score}</div>
                  {selectedTeamId === team.id && !hasCompletedPackage && (
                    <div className="mt-1 px-2 py-0.5 bg-neon-blue text-white rounded text-xs font-bold">
                      ĐÃ CHỌN
                    </div>
                  )}
                  {hasCompletedPackage && (
                    <div className="mt-1 px-2 py-0.5 bg-green-600 text-white rounded text-xs font-bold">
                      ĐÃ THI
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Package Selector - Chỉ hiển thị khi đã chọn đội */}
      {selectedTeamId && (
        <div>
          <h3 className="text-lg font-semibold mb-2 text-white">Chọn gói câu hỏi</h3>
          <div className="space-y-2">
            {([40, 60, 80] as Round4PackageType[]).map((pkg) => (
              <button
                key={pkg}
                onClick={() => handleSelectPackage(pkg)}
                disabled={!selectedTeamId || (status !== "IDLE" && status !== "RESOLVED")}
                className={`w-full p-3 rounded-lg border transition-all ${
                  selectedPackage === pkg
                    ? "bg-neon-purple/20 border-neon-purple ring-2 ring-neon-purple"
                    : "bg-gray-700 border-gray-600 hover:bg-gray-600"
                } ${!selectedTeamId || (status !== "IDLE" && status !== "RESOLVED") ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <div className="font-bold text-white">{pkg} điểm</div>
                <div className="text-xs text-gray-400 mt-1">
                  {pkg === 40 && "2 câu 10đ + 1 câu 20đ"}
                  {pkg === 60 && "1 câu 10đ + 1 câu 20đ + 1 câu 30đ"}
                  {pkg === 80 && "1 câu 20đ + 2 câu 30đ"}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Questions List */}
      {packageQuestions.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-2 text-white">Danh sách câu hỏi</h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {packageQuestions.map((question, index) => {
              const isCompleted = index < currentQuestionIndex || (index === currentQuestionIndex && status === "RESOLVED");
              const isCurrentQuestion = index === currentQuestionIndex && (status === "ASKING_MAIN" || status === "STEALING") && !isCompleted;
              
              return (
                <div
                  key={`${question.id}-${index}-${selectedTeamId}`}
                  className={`bg-gray-700 rounded-lg p-3 border transition-all ${
                    isCurrentQuestion
                      ? "border-neon-blue ring-2 ring-neon-blue bg-neon-blue/10"
                      : isCompleted
                      ? "border-green-600/50 opacity-75"
                      : "border-gray-600"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${
                      isCurrentQuestion
                        ? "bg-neon-blue text-white"
                        : isCompleted
                        ? "bg-green-600/30 text-green-400"
                        : "bg-neon-yellow/20 text-neon-yellow"
                    }`}>
                      Câu {index + 1}: {question.points} điểm
                    </span>
                    {isCurrentQuestion && (
                      <span className="px-2 py-0.5 bg-neon-blue text-white rounded text-xs font-bold">
                        ĐANG CHƠI
                      </span>
                    )}
                    {isCompleted && (
                      <span className="px-2 py-0.5 bg-green-600 text-white rounded text-xs font-bold">
                        ✓ HOÀN THÀNH
                      </span>
                    )}
                  </div>
                  <div className="text-white text-sm whitespace-pre-wrap mb-2">
                    {question.questionText || "Câu hỏi chưa có nội dung"}
                  </div>
                  {status === "IDLE" && !isCompleted && (
                    <button
                      onClick={() => handleStartQuestion(index)}
                      className="w-full px-3 py-1.5 bg-neon-blue hover:bg-neon-blue/80 text-white font-bold rounded text-xs transition-colors"
                    >
                      Bắt đầu câu này
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Current Question Detail (for when playing) */}
      {status !== "IDLE" && currentQuestion && (
        <div>
          <h3 className="text-lg font-semibold mb-2 text-white">Câu hỏi đang chơi</h3>
          <div className="bg-gray-700 rounded-lg p-3 border border-gray-600">
            <div className="flex items-center justify-between mb-2">
              <span className="px-2 py-1 bg-neon-yellow/20 text-neon-yellow rounded text-xs font-bold">
                {currentQuestion.points} điểm
              </span>
              <span className="text-xs text-gray-400">
                Thời gian: {currentQuestion.timeLimitSec}s
              </span>
            </div>
            <div className="text-white text-sm whitespace-pre-wrap">
              {currentQuestion.questionText || "Câu hỏi chưa có nội dung"}
            </div>
          </div>
        </div>
      )}

      {/* Navigation buttons */}
      {status === "RESOLVED" && currentQuestionIndex < packageQuestions.length - 1 && (
        <button
          onClick={handleNextQuestion}
          className="w-full px-4 py-2 bg-neon-green hover:bg-neon-green/80 text-white font-bold rounded-lg transition-colors text-sm"
        >
          Câu tiếp theo ({currentQuestionIndex + 1}/{packageQuestions.length})
        </button>
      )}

      {/* MC Actions - Main Team Judgment */}
      {status === "ASKING_MAIN" && (
        <div>
          <h3 className="text-lg font-semibold mb-2 text-white">Chấm điểm đội chính</h3>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => handleMainTeamJudgment("CORRECT")}
              className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white font-bold rounded text-sm transition-colors"
            >
              Đúng
            </button>
            <button
              onClick={() => handleMainTeamJudgment("WRONG")}
              className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded text-sm transition-colors"
            >
              Sai
            </button>
            <button
              onClick={() => handleMainTeamJudgment("NO_ANSWER")}
              className="px-3 py-2 bg-yellow-600 hover:bg-yellow-700 text-white font-bold rounded text-sm transition-colors"
            >
              Không trả lời
            </button>
          </div>
          {mainAnswerResult && (
            <div className="mt-2 p-2 bg-gray-700 rounded border border-gray-600">
              <div className="text-xs text-gray-400">
                Kết quả:{" "}
                <span className="font-bold text-white">
                  {mainAnswerResult === "CORRECT"
                    ? "ĐÚNG"
                    : mainAnswerResult === "WRONG"
                    ? "SAI"
                    : "KHÔNG TRẢ LỜI"}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Steal Section */}
      {status === "STEALING" && (
        <div className="bg-red-900/30 rounded-lg p-3 border border-red-500">
          <h3 className="text-lg font-bold text-red-400 mb-2">⚡ Cướp điểm</h3>
          
          {steal.buzzWinnerTeamId === null ? (
            <div>
              <p className="text-gray-300 text-sm mb-2">Các đội còn lại rung chuông:</p>
              <div className="space-y-2">
                {otherTeams.map((team) => (
                  <button
                    key={team.id}
                    onClick={() => handleTeamBuzz(team.id)}
                    className="w-full p-2 bg-gray-700 hover:bg-gray-600 border border-gray-600 rounded text-left transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-white text-sm">{team.name}</span>
                      <span className="px-2 py-1 bg-red-500 text-white rounded text-xs font-bold">
                        RUNG CHUÔNG
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div>
              <div className="mb-2 p-2 bg-yellow-500/20 border border-yellow-500 rounded">
                <div className="font-bold text-yellow-400 text-sm">
                  Đội {teams.find((t) => t.id === steal.buzzWinnerTeamId)?.name} đã rung chuông đầu tiên
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleStealJudgment("CORRECT")}
                  className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white font-bold rounded text-sm transition-colors"
                >
                  Cướp đúng
                </button>
                <button
                  onClick={() => handleStealJudgment("WRONG")}
                  className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded text-sm transition-colors"
                >
                  Cướp sai
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Resolved Status */}
      {status === "RESOLVED" && (
        <div className="bg-green-900/30 rounded-lg p-3 border border-green-600">
          <h3 className="text-lg font-bold text-green-400 mb-2">✓ Câu hỏi đã hoàn thành</h3>
          <div className="space-y-1 text-xs">
            {mainAnswerResult === "CORRECT" && (
              <div className="text-gray-300">
                Đội chính trả lời đúng: +{currentQuestion?.points} điểm
              </div>
            )}
            {mainAnswerResult && mainAnswerResult !== "CORRECT" && steal.buzzWinnerTeamId && (
              <div className="text-gray-300">
                {steal.result === "CORRECT" ? (
                  <>
                    Đội {teams.find((t) => t.id === steal.buzzWinnerTeamId)?.name} cướp đúng: +{currentQuestion?.points} điểm
                    <br />
                    Đội chính bị trừ: -{currentQuestion?.points} điểm
                  </>
                ) : (
                  <>
                    Đội {teams.find((t) => t.id === steal.buzzWinnerTeamId)?.name} cướp sai: -{halfPoints(currentQuestion?.points || 10)} điểm
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

