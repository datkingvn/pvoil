import { NextRequest, NextResponse } from "next/server";
import { Round2Config, Round2GameState, Round2Team, Round2TileStatus, Round2TeamAnswer, Round2BuzzerPress, Round2State } from "@/lib/round2/types";
import { normalizeKeyword, countKeywordLetters, countAnswerWords } from "@/lib/round2/helpers";
import connectDB from "@/lib/mongodb";
import Team from "@/models/Team";
import Round2ConfigModel from "@/models/Round2Config";
import Round2GameStateModel from "@/models/Round2GameState";
import Round2TeamsModel from "@/models/Round2Teams";

export const runtime = "nodejs";

// Helper: Load gameState từ DB
async function loadGameStateFromDB(): Promise<Round2GameState> {
  await connectDB();
  const doc = await Round2GameStateModel.getCurrent();
  const gameState: Round2GameState = {
    status: doc.status,
    activeTeamId: doc.activeTeamId,
    activeQuestionId: doc.activeQuestionId,
    timeLeft: doc.timeLeft,
    lastAnswerInput: doc.lastAnswerInput || "",
    teamAnswers: doc.teamAnswers || [],
    guessedKeywordCorrect: doc.guessedKeywordCorrect || false,
    buzzerPresses: doc.buzzerPresses || [],
    buzzerTeamId: doc.buzzerTeamId,
    buzzerTeamName: doc.buzzerTeamName,
    buzzerTimestamp: doc.buzzerTimestamp,
    questionStartTime: doc.questionStartTime,
    questionInitialTime: doc.questionInitialTime,
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
async function saveGameStateToDB(gameState: Partial<Round2GameState>): Promise<void> {
  await connectDB();
  await Round2GameStateModel.updateCurrent(gameState);
}

// Helper: Load teams từ DB và convert sang Round2Team format
async function loadTeamsFromDB(): Promise<Round2Team[]> {
  try {
    await connectDB();
    const teams = await Team.find().select("-password").sort({ createdAt: -1 });
    // Convert teams từ DB format sang Round2Team format
    return teams.map((team: any, index: number) => ({
      id: index + 1, // Round2Team dùng id số 1-4
      name: team.teamName,
      score: 0,
      isLocked: false, // Mặc định không bị khóa
    }));
  } catch (error) {
    console.error("Error loading teams:", error);
  }
  return [];
}

// Helper: Load Round2Teams từ DB (với score và isLocked)
async function loadRound2TeamsFromDB(): Promise<Round2Team[]> {
  await connectDB();
  const doc = await Round2TeamsModel.getCurrent();
  if (doc.teams && doc.teams.length > 0) {
    return doc.teams;
  }
  // Nếu chưa có, load từ Team model và init
  return await loadTeamsFromDB();
}

// Helper: Save Round2Teams vào DB
async function saveRound2TeamsToDB(teams: Round2Team[]): Promise<void> {
  await connectDB();
  await Round2TeamsModel.updateCurrent(teams);
}

// Helper: Load full state từ DB
async function loadFullState(): Promise<Round2State> {
  await connectDB();
  const config = await loadConfigFromDB();
  const gameState = await loadGameStateFromDB();
  let teams = await loadRound2TeamsFromDB();
  
  // Nếu teams chưa có trong Round2Teams, init từ Team model
  if (teams.length === 0) {
    teams = await loadTeamsFromDB();
    if (teams.length > 0) {
      await saveRound2TeamsToDB(teams);
    }
  }
  
  return {
    config,
    gameState,
    teams,
  };
}

// Helper: Map team từ DB (id string) sang Round2Team id (number)
async function getRound2TeamIdFromDbId(dbTeamId: string): Promise<number | null> {
  try {
    await connectDB();
    const teams = await Team.find().select("-password").sort({ createdAt: -1 });
    const index = teams.findIndex((team: any) => team._id.toString() === dbTeamId);
    return index >= 0 ? index + 1 : null;
  } catch (error) {
    console.error("Error mapping team id:", error);
    return null;
  }
}

// Helper: Load config từ DB
async function loadConfigFromDB(): Promise<Round2Config | null> {
  try {
    await connectDB();
    const configDoc = await Round2ConfigModel.findOne().sort({ updatedAt: -1 });
    if (configDoc) {
      return {
        imageOriginalUrl: configDoc.imageOriginalUrl,
        keywordAnswer: configDoc.keywordAnswer,
        keywordNormalized: configDoc.keywordNormalized,
        keywordLength: configDoc.keywordLength,
        questions: configDoc.questions.map((q: any) => ({
          id: q.id,
          questionText: q.questionText,
          answerText: q.answerText,
          answerWordCount: q.answerWordCount,
          tileStatus: q.tileStatus,
        })),
      };
    }
  } catch (error) {
    console.error("Error loading config from DB:", error);
  }
  return null;
}

// GET: Lấy state hiện tại - Load tất cả từ DB
export async function GET() {
  try {
    await connectDB();
    
    // Load tất cả từ DB
    const config = await loadConfigFromDB();
    const gameState = await loadGameStateFromDB();
    let teams = await loadRound2TeamsFromDB();
    
    // Nếu teams chưa có trong Round2Teams, init từ Team model
    if (teams.length === 0) {
      teams = await loadTeamsFromDB();
      if (teams.length > 0) {
        await saveRound2TeamsToDB(teams);
      }
    }
    
    const state: Round2State = {
      config,
      gameState,
      teams,
    };
    
    return NextResponse.json(state);
  } catch (error) {
    console.error("Error getting round2 state:", error);
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
        const config = data as Round2Config;
        const currentGameState = await loadGameStateFromDB();
        
        // Nếu đang có activeQuestionId, giữ nguyên game state (đang trong quá trình chơi)
        // Nếu không có activeQuestionId, reset game state (config mới)
        if (!currentGameState.activeQuestionId) {
          const resetGameState: Round2GameState = {
            status: "idle",
            activeTeamId: null,
            activeQuestionId: null,
            timeLeft: 15,
            lastAnswerInput: "",
            teamAnswers: [],
            guessedKeywordCorrect: false,
            buzzerPresses: [],
            buzzerTeamId: null,
            buzzerTeamName: null,
            buzzerTimestamp: null,
            questionStartTime: null,
            questionInitialTime: null,
          };
          await saveGameStateToDB(resetGameState);
        }
        
        // Lưu config vào database
        await Round2ConfigModel.deleteMany({});
        await Round2ConfigModel.create({
          imageOriginalUrl: config.imageOriginalUrl,
          keywordAnswer: config.keywordAnswer,
          keywordNormalized: config.keywordNormalized,
          keywordLength: config.keywordLength,
          questions: config.questions,
        });
        
        const state = await loadFullState();
        return NextResponse.json({ success: true, state });
      }

      case "setGameState": {
        await connectDB();
        const currentGameState = await loadGameStateFromDB();
        const gameStateUpdates = data as Partial<Round2GameState>;
        
        // Nếu status chuyển sang "question_open", lưu timestamp và initial time
        if (gameStateUpdates.status === "question_open" && currentGameState.status !== "question_open") {
          gameStateUpdates.questionStartTime = Date.now();
          gameStateUpdates.questionInitialTime = gameStateUpdates.timeLeft !== undefined ? gameStateUpdates.timeLeft : 15;
          gameStateUpdates.timeLeft = gameStateUpdates.timeLeft !== undefined ? gameStateUpdates.timeLeft : 15;
        }
        
        // Nếu status chuyển sang không phải "question_open", reset timestamp
        if (gameStateUpdates.status !== undefined && gameStateUpdates.status !== "question_open" && currentGameState.status === "question_open") {
          gameStateUpdates.questionStartTime = null;
          gameStateUpdates.questionInitialTime = null;
        }
        
        // Merge với current state và save
        const updatedGameState = { ...currentGameState, ...gameStateUpdates };
        await saveGameStateToDB(updatedGameState);
        
        // Load lại state để trả về (tính toán timeLeft nếu cần)
        const state = await loadFullState();
        return NextResponse.json({ success: true, state });
      }

      case "setTeams": {
        await connectDB();
        const teams = data as Round2Team[];
        await saveRound2TeamsToDB(teams);
        const state = await loadFullState();
        return NextResponse.json({ success: true, state });
      }

      case "loadTeams": {
        await connectDB();
        const teams = await loadTeamsFromDB();
        await saveRound2TeamsToDB(teams);
        const state = await loadFullState();
        return NextResponse.json({ success: true, state });
      }

      case "updateTeamScore": {
        await connectDB();
        const { teamId, delta } = data;
        const currentTeams = await loadRound2TeamsFromDB();
        const updatedTeams = currentTeams.map((team) =>
          team.id === teamId ? { ...team, score: team.score + delta } : team
        );
        await saveRound2TeamsToDB(updatedTeams);
        const state = await loadFullState();
        return NextResponse.json({ success: true, state });
      }

      case "reset": {
        await connectDB();
        const resetGameState: Round2GameState = {
          status: "idle",
          activeTeamId: null,
          activeQuestionId: null,
          timeLeft: 15,
          lastAnswerInput: "",
          teamAnswers: [],
          guessedKeywordCorrect: false,
          buzzerPresses: [],
          buzzerTeamId: null,
          buzzerTeamName: null,
          buzzerTimestamp: null,
          questionStartTime: null,
          questionInitialTime: null,
        };
        await saveGameStateToDB(resetGameState);
        const state = await loadFullState();
        return NextResponse.json({ success: true, state });
      }

      case "resetAll": {
        await connectDB();
        // Reset game state
        const resetGameState: Round2GameState = {
          status: "idle",
          activeTeamId: null,
          activeQuestionId: null,
          timeLeft: 15,
          lastAnswerInput: "",
          teamAnswers: [],
          guessedKeywordCorrect: false,
          buzzerPresses: [],
          buzzerTeamId: null,
          buzzerTeamName: null,
          buzzerTimestamp: null,
          questionStartTime: null,
          questionInitialTime: null,
        };
        await saveGameStateToDB(resetGameState);
        
        // Reset teams
        const currentTeams = await loadRound2TeamsFromDB();
        const resetTeams = currentTeams.map((team) => ({
          ...team,
          isLocked: false,
        }));
        await saveRound2TeamsToDB(resetTeams);
        
        // Reset tile status về hidden nếu có config
        const config = await loadConfigFromDB();
        if (config) {
          const resetQuestions = config.questions.map((q) => ({
            ...q,
            tileStatus: "hidden" as Round2TileStatus,
          }));
          const resetConfig = { ...config, questions: resetQuestions };
          await Round2ConfigModel.deleteMany({});
          await Round2ConfigModel.create({
            imageOriginalUrl: resetConfig.imageOriginalUrl,
            keywordAnswer: resetConfig.keywordAnswer,
            keywordNormalized: resetConfig.keywordNormalized,
            keywordLength: resetConfig.keywordLength,
            questions: resetQuestions,
          });
        }
        
        const state = await loadFullState();
        return NextResponse.json({ success: true, state });
      }

      case "submitAnswer": {
        await connectDB();
        // Submit đáp án từ đội
        const { teamId, teamName, answer } = data; // teamId là Round2Team id (number), teamName là tên đội
        const gameState = await loadGameStateFromDB();
        const teams = await loadRound2TeamsFromDB();
        
        if (gameState.status !== "question_open") {
          return NextResponse.json(
            { error: "Câu hỏi chưa được mở" },
            { status: 400 }
          );
        }

        if (!gameState.activeQuestionId) {
          return NextResponse.json(
            { error: "Chưa có câu hỏi đang active" },
            { status: 400 }
          );
        }

        // Lấy teamName từ teams nếu không được cung cấp
        let finalTeamName = teamName;
        if (!finalTeamName && teamId) {
          const team = teams.find((t) => t.id === teamId);
          finalTeamName = team?.name || `Đội ${teamId}`;
        }

        // Kiểm tra xem đội đã submit đáp án cho câu hỏi này chưa
        const existingAnswer = gameState.teamAnswers.find(
          (ta) => ta.teamId === teamId
        );

        // Không cho phép submit lại nếu đã submit rồi
        if (existingAnswer) {
          return NextResponse.json(
            { error: "Bạn đã gửi đáp án rồi. Mỗi câu hỏi chỉ được gửi một lần." },
            { status: 400 }
          );
        }

        const newAnswer: Round2TeamAnswer = {
          teamId,
          teamName: finalTeamName,
          answer: answer.trim(),
          isCorrect: null, // Chưa chấm
          submittedAt: Date.now(),
        };

        // Thêm đáp án mới
        const updatedAnswers = [...gameState.teamAnswers, newAnswer];

        // Cập nhật game state
        await saveGameStateToDB({
          teamAnswers: updatedAnswers,
          // Giữ nguyên status "question_open" để các đội khác vẫn có thể submit
        });

        const state = await loadFullState();
        return NextResponse.json({ success: true, state });
      }

      case "pressBuzzer": {
        await connectDB();
        // Đội bấm chuông - Cho phép bấm ngay cả khi chưa mở câu hỏi
        // Tất cả các đội đều có thể bấm, nhưng chỉ hiển thị đội bấm trước
        const { teamId, teamName } = data;
        const gameState = await loadGameStateFromDB();
        const teams = await loadRound2TeamsFromDB();
        
        // Kiểm tra đội có bị khóa không
        const team = teams.find((t) => t.id === teamId);
        if (team?.isLocked) {
          return NextResponse.json(
            { error: "Đội của bạn đã bị khóa" },
            { status: 400 }
          );
        }
        
        // Kiểm tra đội này đã bấm chuông chưa
        const alreadyPressed = gameState.buzzerPresses?.some(
          (bp) => bp.teamId === teamId
        );
        if (alreadyPressed) {
          return NextResponse.json(
            { error: "Đội của bạn đã bấm chuông rồi" },
            { status: 400 }
          );
        }
        
        // Thêm đội này vào danh sách các đội đã bấm chuông
        const newPress: Round2BuzzerPress = {
          teamId,
          teamName: teamName || team?.name || `Đội ${teamId}`,
          timestamp: Date.now(),
        };
        
        const updatedPresses = [...(gameState.buzzerPresses || []), newPress];
        
        // Lưu thông tin đội bấm chuông
        // Đội đầu tiên (bấm trước) được lưu vào buzzerTeamId để backward compatibility
        const firstPress = updatedPresses[0];
        await saveGameStateToDB({
          buzzerPresses: updatedPresses,
          buzzerTeamId: firstPress.teamId,
          buzzerTeamName: firstPress.teamName,
          buzzerTimestamp: firstPress.timestamp,
        });
        
        const state = await loadFullState();
        return NextResponse.json({ success: true, state });
      }

      case "judgeKeyword": {
        await connectDB();
        // MC chấm từ khóa đúng/sai - Chấm cho đội bấm trước (đội đầu tiên)
        const { isCorrect } = data;
        const gameState = await loadGameStateFromDB();
        const teams = await loadRound2TeamsFromDB();
        const config = await loadConfigFromDB();
        
        if (!gameState.buzzerPresses || gameState.buzzerPresses.length === 0) {
          return NextResponse.json(
            { error: "Chưa có đội nào bấm chuông" },
            { status: 400 }
          );
        }
        
        // Lấy đội bấm trước (đội đầu tiên)
        const firstPress = gameState.buzzerPresses[0];
        const buzzerTeamId = firstPress.teamId;
        
        if (isCorrect === true) {
          // Tính điểm dựa trên số hình đã mở (revealed)
          // Đếm số hình có tileStatus === "revealed"
          const revealedCount = config?.questions.filter(
            (q) => q.tileStatus === "revealed"
          ).length || 0;
          
          // Tính điểm: 1 hình trở xuống = 80, 2 hình = 60, 3 hình = 40, 4 hình = 20
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
          
          // Cộng điểm cho đội bấm trước
          const updatedTeams = teams.map((team) =>
            team.id === buzzerTeamId ? { ...team, score: team.score + points } : team
          );
          await saveRound2TeamsToDB(updatedTeams);
          
          // Kết thúc vòng
          await saveGameStateToDB({
            status: "round_finished",
            guessedKeywordCorrect: true,
            buzzerPresses: [],
            buzzerTeamId: null,
            buzzerTeamName: null,
            buzzerTimestamp: null,
          });
        } else {
          // Sai: Khóa đội bấm trước
          const updatedTeams = teams.map((team) =>
            team.id === buzzerTeamId ? { ...team, isLocked: true } : team
          );
          await saveRound2TeamsToDB(updatedTeams);
          
          // Xóa đội bị khóa khỏi danh sách buzzer, đội tiếp theo sẽ trở thành đội bấm trước
          const remainingPresses = gameState.buzzerPresses.filter(
            (bp) => bp.teamId !== buzzerTeamId
          );
          
          if (remainingPresses.length > 0) {
            const nextPress = remainingPresses[0];
            await saveGameStateToDB({
              buzzerPresses: remainingPresses,
              buzzerTeamId: nextPress.teamId,
              buzzerTeamName: nextPress.teamName,
              buzzerTimestamp: nextPress.timestamp,
            });
          } else {
            // Không còn đội nào, reset buzzer
            await saveGameStateToDB({
              buzzerPresses: [],
              buzzerTeamId: null,
              buzzerTeamName: null,
              buzzerTimestamp: null,
            });
          }
        }
        
        const state = await loadFullState();
        return NextResponse.json({ success: true, state });
      }

      case "markAnswer": {
        await connectDB();
        // MC đánh dấu đáp án đúng/sai
        const { teamId, isCorrect } = data;
        const gameState = await loadGameStateFromDB();
        const teams = await loadRound2TeamsFromDB();
        const config = await loadConfigFromDB();

        const answerIndex = gameState.teamAnswers.findIndex(
          (ta) => ta.teamId === teamId
        );

        if (answerIndex < 0) {
          return NextResponse.json(
            { error: "Không tìm thấy đáp án của đội này" },
            { status: 400 }
          );
        }

        // Kiểm tra xem đã chấm điểm chưa (tránh cộng điểm nhiều lần)
        const currentAnswer = gameState.teamAnswers[answerIndex];
        const wasAlreadyMarked = currentAnswer.isCorrect !== null;

        const updatedAnswers = [...gameState.teamAnswers];
        updatedAnswers[answerIndex] = {
          ...updatedAnswers[answerIndex],
          isCorrect,
        };

        // Nếu đánh dấu đúng và chưa từng chấm điểm trước đó, tự động cộng điểm
        if (isCorrect === true && !wasAlreadyMarked) {
          const updatedTeams = teams.map((team) =>
            team.id === teamId ? { ...team, score: team.score + 10 } : team
          );
          await saveRound2TeamsToDB(updatedTeams);
        }

        await saveGameStateToDB({ teamAnswers: updatedAnswers });

        // Load lại state để kiểm tra
        const updatedGameState = await loadGameStateFromDB();
        const updatedTeams = await loadRound2TeamsFromDB();
        const activeQuestionId = updatedGameState.activeQuestionId;

        // Kiểm tra xem tất cả đội đã được chấm chưa
        const totalTeams = updatedTeams.length;
        const teamsWithAnswers = updatedGameState.teamAnswers.length;
        
        // Kiểm tra xem tất cả đội đã gửi đáp án đều đã được chấm
        const allSubmittedAnswersMarked = updatedGameState.teamAnswers.every(
          (ta) => ta.isCorrect !== null
        );
        
        // Chỉ đóng khi:
        // 1. Tất cả đội đã gửi đáp án đều đã được chấm
        // 2. Có ít nhất 1 đội đã gửi đáp án
        // 3. Có activeQuestionId và config
        // 4. PHẢI có ít nhất 2 đội đã gửi đáp án HOẶC tất cả các đội trong danh sách đã được chấm
        // (Để tránh đóng sớm khi chỉ có 1 đội gửi và chấm xong)
        const shouldClose = allSubmittedAnswersMarked && 
          teamsWithAnswers > 0 && 
          activeQuestionId && 
          config &&
          (teamsWithAnswers >= 2 || teamsWithAnswers === totalTeams);
        
        if (shouldClose && config && activeQuestionId) {
          // Kiểm tra xem có đội nào trả lời đúng không
          const hasCorrectAnswer = updatedGameState.teamAnswers.some(
            (ta) => ta.isCorrect === true
          );

          if (hasCorrectAnswer) {
            // Có ít nhất 1 đáp án đúng → reveal tile (hiển thị hình ảnh)
            const updatedQuestions = config.questions.map((q) =>
              q.id === activeQuestionId ? { ...q, tileStatus: "revealed" as Round2TileStatus } : q
            );
            
            // Lưu config đã cập nhật vào database
            await Round2ConfigModel.deleteMany({});
            await Round2ConfigModel.create({
              imageOriginalUrl: config.imageOriginalUrl,
              keywordAnswer: config.keywordAnswer,
              keywordNormalized: config.keywordNormalized,
              keywordLength: config.keywordLength,
              questions: updatedQuestions,
            });
          } else {
            // Tất cả đều sai → đánh dấu wrong (giữ che)
            const updatedQuestions = config.questions.map((q) =>
              q.id === activeQuestionId ? { ...q, tileStatus: "wrong" as Round2TileStatus } : q
            );
            
            // Lưu config đã cập nhật vào database
            await Round2ConfigModel.deleteMany({});
            await Round2ConfigModel.create({
              imageOriginalUrl: config.imageOriginalUrl,
              keywordAnswer: config.keywordAnswer,
              keywordNormalized: config.keywordNormalized,
              keywordLength: config.keywordLength,
              questions: updatedQuestions,
            });
          }
          
          // Reset game state về idle sau khi đã xử lý xong
          await saveGameStateToDB({
            status: "idle",
            activeQuestionId: null,
            lastAnswerInput: "",
            teamAnswers: [],
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
    console.error("Error updating round2 state:", error);
    return NextResponse.json(
      { error: "Lỗi khi cập nhật state" },
      { status: 500 }
    );
  }
}

