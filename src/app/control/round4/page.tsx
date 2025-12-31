"use client";

import { useState, useEffect } from "react";
import { Round4Team, Round4PackageType, Round4Question, Round4Config } from "@/lib/round4/types";

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


export default function Round4MCPage() {
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
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<Round4Config | null>(null);

  // Load data từ API
  useEffect(() => {
    const loadState = async () => {
      try {
        const res = await fetch("/api/round4/state");
        const data = await res.json();
        
        if (data.teams && data.teams.length > 0) {
          setTeams(data.teams);
        }
        
        // Load state hiện tại nếu có
        if (data.gameState) {
          if (data.gameState.currentMainTeamId) {
            setSelectedTeamId(data.gameState.currentMainTeamId);
          } else {
            setSelectedTeamId(null);
          }
          if (data.gameState.currentPackageType) {
            setSelectedPackage(data.gameState.currentPackageType);
          } else {
            setSelectedPackage(null);
          }
          if (data.gameState.currentQuestionIndex !== undefined) {
            setCurrentQuestionIndex(data.gameState.currentQuestionIndex);
          } else {
            setCurrentQuestionIndex(0);
          }
        }
        
        // Load config
        if (data.config) {
          setConfig(data.config);
        }
        
        // Load package questions từ config nếu có
        if (data.config && data.config.packages && data.gameState?.currentMainTeamId) {
          const teamId = data.gameState.currentMainTeamId;
          const teamPackage = data.config.packages.find(
            (p: any) => p.selectedByTeamId === teamId
          );
          if (teamPackage && teamPackage.questions) {
            setPackageQuestions(teamPackage.questions);
          }
        }
      } catch (error) {
        console.error("Error loading round4 state:", error);
      } finally {
        setLoading(false);
      }
    };
    
    loadState();
  }, []);

  // Reset game state
  const handleReset = async () => {
    if (!confirm("Bạn có chắc muốn reset game? Tất cả tiến trình hiện tại sẽ bị xóa.")) {
      return;
    }
    
    try {
      const res = await fetch("/api/round4/state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reset",
        }),
      });
      
      const result = await res.json();
      
      if (!res.ok) {
        alert(result.error || "Lỗi khi reset");
        return;
      }
      
      // Reset local state
      setSelectedTeamId(null);
      setSelectedPackage(null);
      setPackageQuestions([]);
      setCurrentQuestionIndex(0);
      setStatus("IDLE");
      setMainAnswerResult(null);
      setSteal({ enabled: false, buzzWinnerTeamId: null, result: null });
      
      if (result.state && result.state.teams) {
        setTeams(result.state.teams);
      }
    } catch (error) {
      console.error("Error resetting:", error);
      alert("Lỗi khi reset");
    }
  };

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
    } catch (error) {
      console.error("Error selecting package:", error);
      alert("Lỗi khi chọn gói câu hỏi");
    }
  };

  // Hiển thị câu hỏi tiếp theo
  const handleNextQuestion = () => {
    if (currentQuestionIndex < packageQuestions.length - 1) {
      const nextIndex = currentQuestionIndex + 1;
      setCurrentQuestionIndex(nextIndex);
      setStatus("ASKING_MAIN");
      setMainAnswerResult(null);
      setSteal({ enabled: false, buzzWinnerTeamId: null, result: null });
      
      const nextQ = packageQuestions[nextIndex];
      
      // TODO: Call API
      // fetch("/api/round4/state", {
      //   method: "POST",
      //   headers: { "Content-Type": "application/json" },
      //   body: JSON.stringify({
      //     action: "nextQuestion",
      //   }),
      // });
    } else {
      // Hết câu trong gói
      setStatus("IDLE");
    }
  };

  // Bắt đầu hỏi câu (có thể bắt đầu từ bất kỳ câu nào)
  const handleStartQuestion = (questionIndex?: number) => {
    const indexToUse = questionIndex !== undefined ? questionIndex : currentQuestionIndex;
    if (packageQuestions.length === 0 || !selectedTeamId || indexToUse >= packageQuestions.length || indexToUse < 0) return;
    
    setCurrentQuestionIndex(indexToUse);
    setStatus("ASKING_MAIN");
    setMainAnswerResult(null);
    setSteal({ enabled: false, buzzWinnerTeamId: null, result: null });
    
    // TODO: Call API để set status = "question_open"
    // fetch("/api/round4/state", {
    //   method: "POST",
    //   headers: { "Content-Type": "application/json" },
    //   body: JSON.stringify({
    //     action: "setGameState",
    //     data: {
    //       status: "question_open",
    //       currentQuestionId: firstQ.id,
    //     },
    //   }),
    // });
  };

  // MC chấm điểm cho đội chính
  const handleMainTeamJudgment = (result: "CORRECT" | "WRONG" | "NO_ANSWER") => {
    if (!selectedTeamId || packageQuestions.length === 0) return;
    
    // Sử dụng currentQuestionIndex trực tiếp từ state hiện tại
    if (currentQuestionIndex >= packageQuestions.length || currentQuestionIndex < 0) return;
    const currentQ = packageQuestions[currentQuestionIndex];
    if (!currentQ) return;
    
    setMainAnswerResult(result);
    
    if (result === "CORRECT") {
      // Đội chính +Q điểm
      setTeams((prev) => applyMainResult(prev, selectedTeamId, result, currentQ.points));
      setStatus("RESOLVED");
    } else {
      // WRONG hoặc NO_ANSWER -> mở cướp điểm
      setStatus("STEALING");
      setSteal({ enabled: true, buzzWinnerTeamId: null, result: null });
    }
    
    // TODO: Call API
    // fetch("/api/round4/state", {
    //   method: "POST",
    //   headers: { "Content-Type": "application/json" },
    //   body: JSON.stringify({
    //     action: "markAnswer",
    //     data: {
    //       judgment: result === "CORRECT" ? "correct" : result === "WRONG" ? "incorrect" : "no_answer",
    //     },
    //   }),
    // });
  };

  // Đội rung chuông
  const handleTeamBuzz = (teamId: number) => {
    if (steal.buzzWinnerTeamId !== null) return; // Đã có đội rung chuông
    
    setSteal((prev) => ({ ...prev, buzzWinnerTeamId: teamId }));
    
    // TODO: Call API
    // fetch("/api/round4/state", {
    //   method: "POST",
    //   headers: { "Content-Type": "application/json" },
    //   body: JSON.stringify({
    //     action: "pressBuzzer",
    //     data: { teamId, teamName: teams.find((t) => t.id === teamId)?.name },
    //   }),
    // });
  };

  // MC chấm kết quả cướp điểm
  const handleStealJudgment = (result: "CORRECT" | "WRONG") => {
    if (!selectedTeamId || !steal.buzzWinnerTeamId || packageQuestions.length === 0) return;
    
    // Sử dụng currentQuestionIndex trực tiếp từ state hiện tại
    if (currentQuestionIndex >= packageQuestions.length || currentQuestionIndex < 0) return;
    const currentQ = packageQuestions[currentQuestionIndex];
    if (!currentQ) return;
    
    setSteal((prev) => ({ ...prev, result }));
    setStatus("RESOLVED");
    
    // Áp dụng điểm
    setTeams((prev) =>
      applyStealResult(prev, steal.buzzWinnerTeamId!, result, selectedTeamId, currentQ.points)
    );
    
    if (result === "CORRECT") {
      // Cướp đúng
    } else {
      // Cướp sai
      const deductPoints = halfPoints(currentQ.points);
    }
    
    // TODO: Call API
    // fetch("/api/round4/state", {
    //   method: "POST",
    //   headers: { "Content-Type": "application/json" },
    //   body: JSON.stringify({
    //     action: "markAnswer",
    //     data: {
    //       judgment: result === "CORRECT" ? "correct" : "incorrect",
    //       teamId: steal.buzzWinnerTeamId,
    //     },
    //   }),
    // });
  };

  // Get current question
  const getCurrentQuestion = (): Round4Question | null => {
    return getQuestionFromPackage(selectedPackage!, packageQuestions, currentQuestionIndex);
  };

  const currentQuestion = getCurrentQuestion();
  const otherTeams = teams.filter((t) => t.id !== selectedTeamId);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="text-neon-blue text-xl font-bold mb-2">Đang tải...</div>
          <div className="text-gray-400">Vui lòng chờ</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-neon-blue mb-2">Vòng 4 – MC Control</h1>
              <p className="text-gray-400">Quản lý và điều khiển vòng 4 - Chinh phục đỉnh cao</p>
            </div>
            <button
              onClick={handleReset}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-colors"
            >
              Reset Game
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column: Team & Package Selection */}
          <div className="space-y-6">
            {/* Team Selector */}
            <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
              <h2 className="text-xl font-bold text-white mb-4">Chọn đội chính</h2>
              {teams.length === 0 ? (
                <div className="text-center text-gray-400 py-8">
                  Chưa có đội nào. Vui lòng tạo đội trước.
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-3">
                  {teams.map((team) => {
                    // Kiểm tra đội đã thi xong chưa
                    // Đội đã thi xong khi:
                    // 1. Đã chọn package
                    // 2. Có package trong config với đủ 3 câu hỏi
                    // 3. Không phải đội đang chơi (hoặc đã hoàn thành câu hỏi cuối cùng - index 2 và status RESOLVED)
                    const teamPackage = config?.packages.find(
                      (p) => p.selectedByTeamId === team.id
                    );
                    
                    const isCurrentlyPlaying = selectedTeamId === team.id;
                    
                    // Đội đã thi xong khi:
                    // 1. Đã chọn package
                    // 2. Có package trong config với đủ 3 câu hỏi
                    // 3. VÀ (không phải đội đang chơi HOẶC đã hoàn thành câu hỏi cuối cùng - index 2 và status RESOLVED)
                    // Kiểm tra xem đội có đang ở câu hỏi cuối cùng và đã RESOLVED không
                    const hasFinishedLastQuestion = isCurrentlyPlaying && 
                      currentQuestionIndex === 2 && 
                      status === "RESOLVED" &&
                      packageQuestions.length === 3;
                    
                    // Đội đã thi xong nếu:
                    // - Đã chọn package
                    // - Có package với đủ 3 câu hỏi
                    // - VÀ (không phải đội đang chơi HOẶC đã hoàn thành câu hỏi cuối cùng)
                    const hasCompletedPackage = team.selectedPackage !== null && 
                      teamPackage !== undefined &&
                      teamPackage.questions.length === 3 &&
                      (!isCurrentlyPlaying || hasFinishedLastQuestion);
                    
                    
                    // Disable button nếu đội đã thi xong hoặc đang trong trạng thái không cho phép chọn
                    const isDisabled = hasCompletedPackage || (status !== "IDLE" && status !== "RESOLVED");
                    
                    return (
                      <button
                        key={team.id}
                        onClick={() => handleSelectTeam(team.id)}
                        disabled={isDisabled}
                        className={`p-4 rounded-lg border transition-all text-center ${
                          selectedTeamId === team.id && !hasCompletedPackage
                            ? "bg-neon-blue/20 border-neon-blue ring-2 ring-neon-blue"
                            : hasCompletedPackage
                            ? "bg-green-900/20 border-green-600/50 opacity-75"
                            : "bg-slate-900/50 border-slate-600 hover:border-slate-500"
                        } ${isDisabled ? "opacity-50 cursor-not-allowed" : ""}`}
                      >
                        <div className="font-semibold text-white mb-1">{team.name}</div>
                        <div className="text-sm text-gray-400">Điểm: {team.score}</div>
                        {selectedTeamId === team.id && !hasCompletedPackage && (
                          <div className="mt-2 px-2 py-1 bg-neon-blue text-slate-950 rounded-lg font-bold text-xs">
                            ĐÃ CHỌN
                          </div>
                        )}
                        {hasCompletedPackage && (
                          <div className="mt-2 px-2 py-1 bg-green-600 text-white rounded-lg font-bold text-xs">
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
              <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
                <h2 className="text-xl font-bold text-white mb-4">Chọn gói câu hỏi</h2>
                <div className="space-y-3">
                  {([40, 60, 80] as Round4PackageType[]).map((pkg) => (
                    <button
                      key={pkg}
                      onClick={() => handleSelectPackage(pkg)}
                      disabled={!selectedTeamId || (status !== "IDLE" && status !== "RESOLVED")}
                      className={`w-full p-4 rounded-lg border transition-all ${
                        selectedPackage === pkg
                          ? "bg-neon-purple/20 border-neon-purple ring-2 ring-neon-purple"
                          : "bg-slate-900/50 border-slate-600 hover:border-slate-500"
                      } ${!selectedTeamId || (status !== "IDLE" && status !== "RESOLVED") ? "opacity-50 cursor-not-allowed" : ""}`}
                    >
                      <div className="font-bold text-white text-lg">{pkg} điểm</div>
                      <div className="text-sm text-gray-400 mt-1">
                        {pkg === 40 && "2 câu 10đ + 1 câu 20đ"}
                        {pkg === 60 && "1 câu 10đ + 1 câu 20đ + 1 câu 30đ"}
                        {pkg === 80 && "1 câu 20đ + 2 câu 30đ"}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Middle Column: Question & Actions */}
          <div className="space-y-6">
            {/* Questions List */}
            <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-white">Danh sách câu hỏi</h2>
                {packageQuestions.length > 0 && (
                  <div className="text-sm text-gray-400">
                    {packageQuestions.length} câu hỏi
                  </div>
                )}
              </div>

              {packageQuestions.length > 0 ? (
                <div className="space-y-4">
                  {packageQuestions.map((question, index) => {
                    const isCompleted = index < currentQuestionIndex || (index === currentQuestionIndex && status === "RESOLVED");
                    const isCurrentQuestion = index === currentQuestionIndex && (status === "ASKING_MAIN" || status === "STEALING") && !isCompleted;
                    
                    return (
                      <div
                        key={`${question.id}-${index}-${selectedTeamId}`}
                        className={`bg-slate-900/50 rounded-lg p-4 border transition-all ${
                          isCurrentQuestion
                            ? "border-neon-blue ring-2 ring-neon-blue bg-neon-blue/10"
                            : isCompleted
                            ? "border-green-600/50 opacity-75"
                            : "border-slate-600"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <span className={`px-3 py-1 rounded-lg font-bold ${
                              isCurrentQuestion
                                ? "bg-neon-blue text-white"
                                : isCompleted
                                ? "bg-green-600/30 text-green-400"
                                : "bg-neon-yellow/20 text-neon-yellow"
                            }`}>
                              Câu {index + 1}: {question.points} điểm
                            </span>
                            {isCurrentQuestion && (
                              <span className="px-2 py-1 bg-neon-blue text-white rounded text-xs font-bold">
                                ĐANG CHƠI
                              </span>
                            )}
                            {isCompleted && (
                              <span className="px-2 py-1 bg-green-600 text-white rounded text-xs font-bold">
                                ✓ HOÀN THÀNH
                              </span>
                            )}
                          </div>
                          <span className="text-sm text-gray-400">
                            {question.timeLimitSec}s
                          </span>
                        </div>
                        <div className="text-white text-base whitespace-pre-wrap mb-3">
                          {question.questionText || "Câu hỏi chưa có nội dung"}
                        </div>
                        {status === "IDLE" && !isCompleted && (
                          <button
                            onClick={() => handleStartQuestion(index)}
                            className="w-full px-4 py-2 bg-neon-blue hover:bg-neon-blue/80 text-white font-bold rounded-lg transition-colors text-sm"
                          >
                            Bắt đầu câu này
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center text-gray-400 py-8">
                  {!selectedPackage
                    ? "Vui lòng chọn gói câu hỏi"
                    : "Chưa có câu hỏi. Vui lòng chọn gói để tải câu hỏi."}
                </div>
              )}
            </div>

            {/* Current Question Detail (for when playing) */}
            {status !== "IDLE" && currentQuestion && (
              <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-white">Câu hỏi đang chơi</h2>
                  <div className="text-sm text-gray-400">
                    Câu {currentQuestionIndex + 1}/{packageQuestions.length}
                  </div>
                </div>
                <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-600">
                  <div className="flex items-center justify-between mb-3">
                    <span className="px-3 py-1 bg-neon-yellow/20 text-neon-yellow rounded-lg font-bold">
                      {currentQuestion.points} điểm
                    </span>
                    <span className="text-sm text-gray-400">
                      Thời gian: {currentQuestion.timeLimitSec}s
                    </span>
                  </div>
                  <div className="text-white text-lg whitespace-pre-wrap">
                    {currentQuestion.questionText || "Câu hỏi chưa có nội dung"}
                  </div>
                </div>
              </div>
            )}

            {/* Navigation buttons */}
            {status === "RESOLVED" && currentQuestionIndex < packageQuestions.length - 1 && (
              <button
                onClick={handleNextQuestion}
                className="w-full px-4 py-3 bg-neon-green hover:bg-neon-green/80 text-white font-bold rounded-lg transition-colors"
              >
                Câu tiếp theo ({currentQuestionIndex + 1}/{packageQuestions.length})
              </button>
            )}

            {/* MC Actions - Main Team Judgment */}
            {status === "ASKING_MAIN" && (
              <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
                <h2 className="text-xl font-bold text-white mb-4">Chấm điểm đội chính</h2>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    onClick={() => handleMainTeamJudgment("CORRECT")}
                    className="px-4 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg transition-colors"
                  >
                    Trả lời đúng
                  </button>
                  <button
                    onClick={() => handleMainTeamJudgment("WRONG")}
                    className="px-4 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-colors"
                  >
                    Trả lời sai
                  </button>
                  <button
                    onClick={() => handleMainTeamJudgment("NO_ANSWER")}
                    className="px-4 py-3 bg-yellow-600 hover:bg-yellow-700 text-white font-bold rounded-lg transition-colors"
                  >
                    Không trả lời
                  </button>
                </div>
                {mainAnswerResult && (
                  <div className="mt-4 p-3 bg-slate-900/50 rounded-lg border border-slate-600">
                    <div className="text-sm text-gray-400">
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
              <div className="bg-slate-800/50 rounded-xl p-6 border border-red-500">
                <h2 className="text-xl font-bold text-red-400 mb-4">⚡ Cướp điểm</h2>
                
                {steal.buzzWinnerTeamId === null ? (
                  <div>
                    <p className="text-gray-300 mb-4">Các đội còn lại rung chuông:</p>
                    <div className="space-y-2">
                      {otherTeams.map((team) => (
                        <button
                          key={team.id}
                          onClick={() => handleTeamBuzz(team.id)}
                          className="w-full p-3 bg-slate-900/50 hover:bg-slate-800 border border-slate-600 rounded-lg text-left transition-all"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-white">{team.name}</span>
                            <span className="px-3 py-1 bg-red-500 text-white rounded-lg font-bold text-sm">
                              RUNG CHUÔNG
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="mb-4 p-3 bg-yellow-500/20 border border-yellow-500 rounded-lg">
                      <div className="font-bold text-yellow-400">
                        Đội {teams.find((t) => t.id === steal.buzzWinnerTeamId)?.name} đã rung chuông đầu tiên
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => handleStealJudgment("CORRECT")}
                        className="px-4 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg transition-colors"
                      >
                        Cướp đúng
                      </button>
                      <button
                        onClick={() => handleStealJudgment("WRONG")}
                        className="px-4 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-colors"
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
              <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
                <h2 className="text-xl font-bold text-green-400 mb-4">✓ Câu hỏi đã hoàn thành</h2>
                <div className="space-y-2 text-sm">
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

          {/* Right Column: Teams Score Summary */}
          <div className="space-y-6">
            {/* Teams Score Summary */}
            <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
              <h2 className="text-xl font-bold text-white mb-4">Bảng điểm</h2>
              <div className="space-y-2">
                {teams
                  .sort((a, b) => b.score - a.score)
                  .map((team) => (
                    <div
                      key={team.id}
                      className={`p-3 rounded-lg border ${
                        selectedTeamId === team.id
                          ? "bg-neon-blue/20 border-neon-blue"
                          : "bg-slate-900/50 border-slate-600"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-white">{team.name}</span>
                        <span className="font-bold text-neon-yellow">{team.score} điểm</span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
