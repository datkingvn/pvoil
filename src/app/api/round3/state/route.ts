import { NextRequest, NextResponse } from "next/server";
import { Round3Config, Round3GameState, Round3Team, Round3State, Round3TeamAnswer } from "@/lib/round3/types";
import connectDB from "@/lib/mongodb";
import Team from "@/models/Team";
import Round3ConfigModel from "@/models/Round3Config";
import Round3GameStateModel from "@/models/Round3GameState";
import Round3TeamsModel from "@/models/Round3Teams";

export const runtime = "nodejs";

// Helper: Normalize string để so sánh (bỏ dấu, lowercase, trim)
function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Bỏ dấu
    .replace(/[^\w\s]/g, "") // Bỏ ký tự đặc biệt
    .replace(/\s+/g, " "); // Chuẩn hóa khoảng trắng
}

// Helper: So sánh đáp án (chấp nhận tương đồng)
function isAnswerCorrect(userAnswer: string, correctAnswer: string): boolean {
  const normalizedUser = normalizeString(userAnswer);
  const normalizedCorrect = normalizeString(correctAnswer);
  
  // So sánh chính xác sau khi normalize
  if (normalizedUser === normalizedCorrect) {
    return true;
  }
  
  // Kiểm tra tương đồng (chứa đáp án đúng hoặc ngược lại)
  if (normalizedUser.includes(normalizedCorrect) || normalizedCorrect.includes(normalizedUser)) {
    return true;
  }
  
  return false;
}

// Helper: Load gameState từ DB
async function loadGameStateFromDB(): Promise<Round3GameState> {
  await connectDB();
  const doc = await Round3GameStateModel.getCurrent();
  const gameState: Round3GameState = {
    status: doc.status,
    activeQuestionId: doc.activeQuestionId,
    timeLeft: doc.timeLeft,
    teamAnswers: doc.teamAnswers || [],
    questionStartTime: doc.questionStartTime,
    questionInitialTime: doc.questionInitialTime,
    currentQuestionIndex: doc.currentQuestionIndex || 0,
  };
  
  // Tính toán timeLeft nếu status = "question_open"
  if (gameState.status === "question_open" && 
      gameState.questionStartTime !== null && 
      gameState.questionInitialTime !== null) {
    const elapsed = Math.floor((Date.now() - gameState.questionStartTime) / 1000);
    gameState.timeLeft = Math.max(0, gameState.questionInitialTime - elapsed);
  }
  
  return gameState;
}

// Helper: Save gameState vào DB
async function saveGameStateToDB(gameState: Partial<Round3GameState>): Promise<void> {
  await connectDB();
  await Round3GameStateModel.updateCurrent(gameState);
}

// Helper: Load teams từ DB và convert sang Round3Team format
async function loadTeamsFromDB(): Promise<Round3Team[]> {
  try {
    await connectDB();
    const teams = await Team.find().select("-password").sort({ createdAt: -1 });
    return teams.map((team: any, index: number) => ({
      id: index + 1,
      name: team.teamName,
      score: 0,
    }));
  } catch (error) {
    console.error("Error loading teams:", error);
  }
  return [];
}

// Helper: Load Round3Teams từ DB
async function loadRound3TeamsFromDB(): Promise<Round3Team[]> {
  await connectDB();
  const doc = await Round3TeamsModel.getCurrent();
  if (doc.teams && doc.teams.length > 0) {
    return doc.teams;
  }
  return await loadTeamsFromDB();
}

// Helper: Save Round3Teams vào DB
async function saveRound3TeamsToDB(teams: Round3Team[]): Promise<void> {
  await connectDB();
  await Round3TeamsModel.updateCurrent(teams);
}

// Helper: Load config từ DB
async function loadConfigFromDB(): Promise<Round3Config | null> {
  try {
    await connectDB();
    const configDoc = await Round3ConfigModel.findOne().sort({ updatedAt: -1 });
    if (configDoc) {
      return {
        questions: configDoc.questions.map((q: any) => ({
          id: q.id,
          questionText: q.questionText,
          answerText: q.answerText,
          questionType: q.questionType,
          order: q.order,
          videoUrl: q.videoUrl || undefined, // Include videoUrl
          steps: q.steps || undefined, // Include steps
        })),
      };
    }
  } catch (error) {
    console.error("Error loading config from DB:", error);
  }
  return null;
}

// Helper: Load full state từ DB
async function loadFullState(): Promise<Round3State> {
  await connectDB();
  const config = await loadConfigFromDB();
  const gameState = await loadGameStateFromDB();
  let teams = await loadRound3TeamsFromDB();
  
  if (teams.length === 0) {
    teams = await loadTeamsFromDB();
    if (teams.length > 0) {
      await saveRound3TeamsToDB(teams);
    }
  }
  
  return {
    config,
    gameState,
    teams,
  };
}

// GET: Lấy state hiện tại
export async function GET() {
  try {
    await connectDB();
    
    const config = await loadConfigFromDB();
    const gameState = await loadGameStateFromDB();
    let teams = await loadRound3TeamsFromDB();
    
    if (teams.length === 0) {
      teams = await loadTeamsFromDB();
      if (teams.length > 0) {
        await saveRound3TeamsToDB(teams);
      }
    }
    
    const state: Round3State = {
      config,
      gameState,
      teams,
    };
    
    return NextResponse.json(state);
  } catch (error) {
    console.error("Error getting round3 state:", error);
    return NextResponse.json(
      { error: "Lỗi khi lấy state" },
      { status: 500 }
    );
  }
}

// POST: Cập nhật state hoặc config
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, data } = body;

    switch (action) {
      case "setConfig": {
        await connectDB();
        const config = data as Round3Config;
        const currentGameState = await loadGameStateFromDB();
        
        if (!currentGameState.activeQuestionId) {
          const resetGameState: Round3GameState = {
            status: "idle",
            activeQuestionId: null,
            timeLeft: 30,
            teamAnswers: [],
            questionStartTime: null,
            questionInitialTime: null,
            currentQuestionIndex: 0,
          };
          await saveGameStateToDB(resetGameState);
        }
        
        await Round3ConfigModel.deleteMany({});
        await Round3ConfigModel.create({
          questions: config.questions,
        });
        
        const state = await loadFullState();
        return NextResponse.json({ success: true, state });
      }

      case "setGameState": {
        await connectDB();
        const currentGameState = await loadGameStateFromDB();
        const gameStateUpdates = data as Partial<Round3GameState>;
        
        // Reset teamAnswers khi chọn câu hỏi mới (activeQuestionId thay đổi)
        if (gameStateUpdates.activeQuestionId !== undefined && 
            gameStateUpdates.activeQuestionId !== currentGameState.activeQuestionId) {
          gameStateUpdates.teamAnswers = [];
        }
        
        if (gameStateUpdates.status === "question_open" && currentGameState.status !== "question_open") {
          gameStateUpdates.questionStartTime = Date.now();
          gameStateUpdates.questionInitialTime = gameStateUpdates.timeLeft !== undefined ? gameStateUpdates.timeLeft : 30;
          gameStateUpdates.timeLeft = gameStateUpdates.timeLeft !== undefined ? gameStateUpdates.timeLeft : 30;
          // Reset teamAnswers khi mở câu hỏi mới
          if (gameStateUpdates.activeQuestionId !== currentGameState.activeQuestionId) {
            gameStateUpdates.teamAnswers = [];
          }
        }
        
        if (gameStateUpdates.status !== undefined && gameStateUpdates.status !== "question_open" && currentGameState.status === "question_open") {
          gameStateUpdates.questionStartTime = null;
          gameStateUpdates.questionInitialTime = null;
        }
        
        const updatedGameState = { ...currentGameState, ...gameStateUpdates };
        await saveGameStateToDB(updatedGameState);
        
        const state = await loadFullState();
        return NextResponse.json({ success: true, state });
      }

      case "setTeams": {
        await connectDB();
        const teams = data as Round3Team[];
        await saveRound3TeamsToDB(teams);
        const state = await loadFullState();
        return NextResponse.json({ success: true, state });
      }

      case "loadTeams": {
        await connectDB();
        const teams = await loadTeamsFromDB();
        await saveRound3TeamsToDB(teams);
        const state = await loadFullState();
        return NextResponse.json({ success: true, state });
      }

      case "updateTeamScore": {
        await connectDB();
        const { teamId, delta } = data;
        const currentTeams = await loadRound3TeamsFromDB();
        const updatedTeams = currentTeams.map((team) =>
          team.id === teamId ? { ...team, score: team.score + delta } : team
        );
        await saveRound3TeamsToDB(updatedTeams);
        const state = await loadFullState();
        return NextResponse.json({ success: true, state });
      }

      case "reset": {
        await connectDB();
        const resetGameState: Round3GameState = {
          status: "idle",
          activeQuestionId: null,
          timeLeft: 30,
          teamAnswers: [],
          questionStartTime: null,
          questionInitialTime: null,
          currentQuestionIndex: 0,
        };
        await saveGameStateToDB(resetGameState);
        const state = await loadFullState();
        return NextResponse.json({ success: true, state });
      }

      case "resetAll": {
        await connectDB();
        const resetGameState: Round3GameState = {
          status: "idle",
          activeQuestionId: null,
          timeLeft: 30,
          teamAnswers: [],
          questionStartTime: null,
          questionInitialTime: null,
          currentQuestionIndex: 0,
        };
        await saveGameStateToDB(resetGameState);
        
        const currentTeams = await loadRound3TeamsFromDB();
        const resetTeams = currentTeams.map((team) => ({
          ...team,
          score: 0,
        }));
        await saveRound3TeamsToDB(resetTeams);
        
        const state = await loadFullState();
        return NextResponse.json({ success: true, state });
      }

      case "submitAnswer": {
        await connectDB();
        const { teamId, teamName, answer } = data;
        const gameState = await loadGameStateFromDB();
        const teams = await loadRound3TeamsFromDB();
        const config = await loadConfigFromDB();
        
        if (gameState.status !== "question_open") {
          return NextResponse.json(
            { error: "Câu hỏi chưa được mở" },
            { status: 400 }
          );
        }

        if (!gameState.activeQuestionId || !config) {
          return NextResponse.json(
            { error: "Chưa có câu hỏi đang active" },
            { status: 400 }
          );
        }

        let finalTeamName = teamName;
        if (!finalTeamName && teamId) {
          const team = teams.find((t) => t.id === teamId);
          finalTeamName = team?.name || `Đội ${teamId}`;
        }

        const existingAnswer = gameState.teamAnswers.find(
          (ta) => ta.teamId === teamId
        );

        if (existingAnswer) {
          return NextResponse.json(
            { error: "Bạn đã gửi đáp án rồi. Mỗi câu hỏi chỉ được gửi một lần." },
            { status: 400 }
          );
        }

        // Tìm câu hỏi hiện tại
        const currentQuestion = config.questions.find(
          (q) => q.id === gameState.activeQuestionId
        );

        if (!currentQuestion) {
          return NextResponse.json(
            { error: "Không tìm thấy câu hỏi" },
            { status: 400 }
          );
        }

        // Kiểm tra đáp án đúng/sai
        const correct = isAnswerCorrect(answer.trim(), currentQuestion.answerText);

        const newAnswer: Round3TeamAnswer = {
          teamId,
          teamName: finalTeamName,
          answer: answer.trim(),
          isCorrect: correct,
          submittedAt: Date.now(),
          pointsAwarded: 0, // Sẽ được tính sau khi tất cả đội submit
        };

        const updatedAnswers = [...gameState.teamAnswers, newAnswer];
        await saveGameStateToDB({
          teamAnswers: updatedAnswers,
        });

        const state = await loadFullState();
        return NextResponse.json({ success: true, state });
      }

      case "calculatePoints": {
        await connectDB();
        // Tính điểm cho các đội trả lời đúng dựa trên thứ tự nhanh nhất
        const gameState = await loadGameStateFromDB();
        const teams = await loadRound3TeamsFromDB();
        const config = await loadConfigFromDB();
        
        if (!gameState.activeQuestionId || !config) {
          return NextResponse.json(
            { error: "Chưa có câu hỏi đang active" },
            { status: 400 }
          );
        }

        // Kiểm tra xem đã tính điểm chưa (nếu có bất kỳ đáp án nào có pointsAwarded > 0)
        const hasCalculatedPoints = gameState.teamAnswers.some(
          (ta) => ta.pointsAwarded > 0
        );
        
        if (hasCalculatedPoints) {
          return NextResponse.json(
            { error: "Đã tính điểm rồi. Không thể tính lại." },
            { status: 400 }
          );
        }

        // Lọc các đáp án đúng và sắp xếp theo thời gian submit
        const correctAnswers = gameState.teamAnswers
          .filter((ta) => ta.isCorrect === true)
          .sort((a, b) => a.submittedAt - b.submittedAt);

        // Phân phối điểm: 40, 30, 20, 10
        const points = [40, 30, 20, 10];
        const updatedAnswers = [...gameState.teamAnswers];
        const updatedTeams = [...teams];

        // Xử lý các đội cùng thời gian (trong cùng 1 giây)
        let currentRank = 0;
        let currentPointsIndex = 0;
        
        for (let i = 0; i < correctAnswers.length; i++) {
          const answer = correctAnswers[i];
          const answerIndex = updatedAnswers.findIndex(
            (ta) => ta.teamId === answer.teamId && ta.submittedAt === answer.submittedAt
          );
          
          if (answerIndex >= 0) {
            // Kiểm tra xem có đội nào submit cùng thời gian không (trong cùng 1 giây)
            const sameTimeAnswers = correctAnswers.filter(
              (a) => Math.abs(a.submittedAt - answer.submittedAt) < 1000
            );
            
            if (sameTimeAnswers.length > 1 && i === correctAnswers.findIndex(a => a.teamId === answer.teamId)) {
              // Nhiều đội cùng thời gian - cùng nhận điểm theo mức độ
              const avgPoints = sameTimeAnswers.length > 0 
                ? Math.floor(points.slice(currentPointsIndex, currentPointsIndex + sameTimeAnswers.length).reduce((a, b) => a + b, 0) / sameTimeAnswers.length)
                : 0;
              
              sameTimeAnswers.forEach((sameTimeAnswer) => {
                const sameTimeIndex = updatedAnswers.findIndex(
                  (ta) => ta.teamId === sameTimeAnswer.teamId && ta.submittedAt === sameTimeAnswer.submittedAt
                );
                if (sameTimeIndex >= 0) {
                  updatedAnswers[sameTimeIndex].pointsAwarded = avgPoints;
                  const teamIndex = updatedTeams.findIndex((t) => t.id === sameTimeAnswer.teamId);
                  if (teamIndex >= 0) {
                    updatedTeams[teamIndex].score += avgPoints;
                  }
                }
              });
              
              currentPointsIndex += sameTimeAnswers.length;
              i += sameTimeAnswers.length - 1; // Skip các đội đã xử lý
            } else {
              // Độc lập - nhận điểm theo thứ tự
              const pointsToAward = currentPointsIndex < points.length ? points[currentPointsIndex] : 0;
              updatedAnswers[answerIndex].pointsAwarded = pointsToAward;
              const teamIndex = updatedTeams.findIndex((t) => t.id === answer.teamId);
              if (teamIndex >= 0) {
                updatedTeams[teamIndex].score += pointsToAward;
              }
              currentPointsIndex++;
            }
          }
        }

        await saveGameStateToDB({ teamAnswers: updatedAnswers });
        await saveRound3TeamsToDB(updatedTeams);

        const state = await loadFullState();
        return NextResponse.json({ success: true, state });
      }

      case "nextQuestion": {
        await connectDB();
        const gameState = await loadGameStateFromDB();
        const config = await loadConfigFromDB();
        
        if (!config) {
          return NextResponse.json(
            { error: "Chưa có config" },
            { status: 400 }
          );
        }

        const nextIndex = gameState.currentQuestionIndex + 1;
        
        if (nextIndex >= config.questions.length) {
          // Kết thúc vòng
          await saveGameStateToDB({
            status: "round_finished",
            activeQuestionId: null,
            teamAnswers: [],
            questionStartTime: null,
            questionInitialTime: null,
          });
        } else {
          // Chuyển sang câu hỏi tiếp theo
          const nextQuestion = config.questions[nextIndex];
          await saveGameStateToDB({
            status: "idle",
            activeQuestionId: null,
            timeLeft: 30,
            teamAnswers: [],
            questionStartTime: null,
            questionInitialTime: null,
            currentQuestionIndex: nextIndex,
          });
        }

        const state = await loadFullState();
        return NextResponse.json({ success: true, state });
      }

      default:
        return NextResponse.json(
          { error: "Action không hợp lệ" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Error updating round3 state:", error);
    return NextResponse.json(
      { error: "Lỗi khi cập nhật state" },
      { status: 500 }
    );
  }
}

