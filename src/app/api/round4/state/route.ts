import { NextRequest, NextResponse } from "next/server";
import { Round4Config, Round4GameState, Round4Team, Round4State, Round4TeamAnswer, Round4GameStatus, Round4PackageType, Round4QuestionBank, Round4QuestionBankItem, Round4Question, Round4Package } from "@/lib/round4/types";
import connectDB from "@/lib/mongodb";
import Team from "@/models/Team";
import Round4ConfigModel from "@/models/Round4Config";
import Round4GameStateModel from "@/models/Round4GameState";
import Round4TeamsModel from "@/models/Round4Teams";
import Round4QuestionBankModel from "@/models/Round4QuestionBank";

export const runtime = "nodejs";

// Helper: Normalize string để so sánh
function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ");
}

// Helper: So sánh đáp án
function isAnswerCorrect(userAnswer: string, correctAnswer: string): boolean {
  const normalizedUser = normalizeString(userAnswer);
  const normalizedCorrect = normalizeString(correctAnswer);
  
  if (normalizedUser === normalizedCorrect) {
    return true;
  }
  
  if (normalizedUser.includes(normalizedCorrect) || normalizedCorrect.includes(normalizedUser)) {
    return true;
  }
  
  return false;
}

// Helper: Load gameState từ DB
async function loadGameStateFromDB(): Promise<Round4GameState> {
  await connectDB();
  const doc = await Round4GameStateModel.getCurrent();
  const gameState: Round4GameState = {
    status: doc.status as Round4GameStatus,
    currentPackageType: doc.currentPackageType as Round4PackageType | null,
    currentQuestionId: doc.currentQuestionId,
    currentMainTeamId: doc.currentMainTeamId,
    timeLeft: doc.timeLeft,
    questionStartTime: doc.questionStartTime,
    questionInitialTime: doc.questionInitialTime,
    buzzerWindowStartTime: doc.buzzerWindowStartTime,
    buzzerWindowTimeLeft: doc.buzzerWindowTimeLeft,
    buzzerPresses: doc.buzzerPresses || [],
    teamAnswers: doc.teamAnswers || [],
    hopeStarTeams: doc.hopeStarTeams || [],
    currentQuestionIndex: doc.currentQuestionIndex || 0,
    currentPackageIndex: doc.currentPackageIndex || 0,
  };
  
  // Tính toán timeLeft nếu status = "question_open"
  if (gameState.status === "question_open" && 
      gameState.questionStartTime !== null && 
      gameState.questionInitialTime !== null) {
    const elapsed = Math.floor((Date.now() - gameState.questionStartTime) / 1000);
    gameState.timeLeft = Math.max(0, gameState.questionInitialTime - elapsed);
  }
  
  // Tính toán buzzerWindowTimeLeft nếu status = "buzzer_window"
  if (gameState.status === "buzzer_window" && 
      gameState.buzzerWindowStartTime !== null) {
    const elapsed = Math.floor((Date.now() - gameState.buzzerWindowStartTime) / 1000);
    gameState.buzzerWindowTimeLeft = Math.max(0, 5 - elapsed);
  }
  
  return gameState;
}

// Helper: Save gameState vào DB
async function saveGameStateToDB(gameState: Partial<Round4GameState>): Promise<void> {
  await connectDB();
  await Round4GameStateModel.updateCurrent(gameState);
}

// Helper: Load teams từ DB
async function loadTeamsFromDB(): Promise<Round4Team[]> {
  try {
    await connectDB();
    const teams = await Team.find().select("-password").sort({ createdAt: -1 });
    return teams.map((team: any, index: number) => ({
      id: index + 1,
      name: team.teamName,
      score: 0,
      hasUsedHopeStar: false,
      selectedPackage: null,
      packageOrder: null,
    }));
  } catch (error) {
    console.error("Error loading teams:", error);
  }
  return [];
}

// Helper: Load Round4Teams từ DB
async function loadRound4TeamsFromDB(): Promise<Round4Team[]> {
  await connectDB();
  const doc = await Round4TeamsModel.getCurrent();
  if (doc.teams && doc.teams.length > 0) {
    return doc.teams;
  }
  return await loadTeamsFromDB();
}

// Helper: Save Round4Teams vào DB
async function saveRound4TeamsToDB(teams: Round4Team[]): Promise<void> {
  await connectDB();
  await Round4TeamsModel.updateCurrent(teams);
}

// Helper: Load config từ DB
async function loadConfigFromDB(): Promise<Round4Config | null> {
  try {
    await connectDB();
    const configDoc = await Round4ConfigModel.findOne().sort({ updatedAt: -1 });
    if (configDoc) {
      return {
        packages: configDoc.packages.map((pkg: any) => ({
          type: pkg.type,
          questions: pkg.questions.map((q: any) => ({
            id: q.id,
            questionText: q.questionText,
            answerText: q.answerText,
            points: q.points,
            timeLimitSec: q.timeLimitSec,
            order: q.order,
          })),
          selectedByTeamId: pkg.selectedByTeamId || null,
        })),
      };
    }
  } catch (error) {
    console.error("Error loading config from DB:", error);
  }
  return null;
}

// Helper: Load question bank từ DB
async function loadQuestionBankFromDB(): Promise<Round4QuestionBank | null> {
  try {
    await connectDB();
    const bankDoc = await Round4QuestionBankModel.getCurrent();
    return {
      questions10: (bankDoc.questions10 || []).map((q: any) => ({
        id: q.id,
        questionText: q.questionText,
        answerText: q.answerText,
        points: q.points,
        timeLimitSec: q.timeLimitSec,
        isUsed: q.isUsed || false,
        usedByPackageType: q.usedByPackageType || null,
        usedByTeamId: q.usedByTeamId || null,
      })),
      questions20: (bankDoc.questions20 || []).map((q: any) => ({
        id: q.id,
        questionText: q.questionText,
        answerText: q.answerText,
        points: q.points,
        timeLimitSec: q.timeLimitSec,
        isUsed: q.isUsed || false,
        usedByPackageType: q.usedByPackageType || null,
        usedByTeamId: q.usedByTeamId || null,
      })),
      questions30: (bankDoc.questions30 || []).map((q: any) => ({
        id: q.id,
        questionText: q.questionText,
        answerText: q.answerText,
        points: q.points,
        timeLimitSec: q.timeLimitSec,
        isUsed: q.isUsed || false,
        usedByPackageType: q.usedByPackageType || null,
        usedByTeamId: q.usedByTeamId || null,
      })),
    };
  } catch (error) {
    console.error("Error loading question bank from DB:", error);
  }
  return null;
}

// Helper: Save question bank vào DB
async function saveQuestionBankToDB(questionBank: Round4QuestionBank): Promise<void> {
  await connectDB();
  await Round4QuestionBankModel.updateCurrent({
    questions10: questionBank.questions10 as any,
    questions20: questionBank.questions20 as any,
    questions30: questionBank.questions30 as any,
  });
}

// Helper: Lấy câu hỏi từ ngân hàng theo điểm và đánh dấu đã dùng
async function getQuestionsFromBank(
  points: 10 | 20 | 30,
  count: number,
  packageType: Round4PackageType,
  teamId: number
): Promise<Round4Question[]> {
  await connectDB();
  const bankDoc = await Round4QuestionBankModel.getCurrent();
  
  let questionArray: any[] = [];
  let questionKey: "questions10" | "questions20" | "questions30";
  
  if (points === 10) {
    questionArray = [...(bankDoc.questions10 || [])];
    questionKey = "questions10";
  } else if (points === 20) {
    questionArray = [...(bankDoc.questions20 || [])];
    questionKey = "questions20";
  } else {
    questionArray = [...(bankDoc.questions30 || [])];
    questionKey = "questions30";
  }
  
  const availableQuestions = questionArray.filter((q: any) => !q.isUsed);
  
  if (availableQuestions.length < count) {
    throw new Error(`Không đủ câu hỏi ${points} điểm trong ngân hàng (cần ${count}, có ${availableQuestions.length})`);
  }
  
  // Lấy ngẫu nhiên số lượng cần thiết
  const selectedQuestions = availableQuestions
    .sort(() => Math.random() - 0.5)
    .slice(0, count);
  
  const selectedIds = selectedQuestions.map((q: any) => q.id);
  
  // Đánh dấu đã dùng trong mảng
  for (let i = 0; i < questionArray.length; i++) {
    if (selectedIds.includes(questionArray[i].id)) {
      questionArray[i] = {
        ...questionArray[i],
        isUsed: true,
        usedByPackageType: packageType,
        usedByTeamId: teamId,
      };
    }
  }
  
  // Lưu lại ngân hàng
  const updatedBank: any = {
    questions10: bankDoc.questions10 || [],
    questions20: bankDoc.questions20 || [],
    questions30: bankDoc.questions30 || [],
  };
  updatedBank[questionKey] = questionArray;
  
  await Round4QuestionBankModel.updateCurrent(updatedBank);
  
  // Trả về câu hỏi dạng Round4Question
  return selectedQuestions.map((q: any, index: number) => ({
    id: q.id,
    questionText: q.questionText,
    answerText: q.answerText,
    points: q.points,
    timeLimitSec: q.timeLimitSec,
    order: index + 1,
  }));
}

// Helper: Tạo gói câu hỏi từ ngân hàng
async function createPackageFromBank(
  packageType: Round4PackageType,
  teamId: number
): Promise<Round4Package> {
  let questions: Round4Question[] = [];
  
  if (packageType === 40) {
    // Gói 40 điểm = 2 câu 10đ + 1 câu 20đ
    const q10_1 = await getQuestionsFromBank(10, 1, packageType, teamId);
    const q10_2 = await getQuestionsFromBank(10, 1, packageType, teamId);
    const q20 = await getQuestionsFromBank(20, 1, packageType, teamId);
    questions = [
      { ...q10_1[0], order: 1 },
      { ...q10_2[0], order: 2 },
      { ...q20[0], order: 3 },
    ];
  } else if (packageType === 60) {
    // Gói 60 điểm = 1 câu 10đ + 1 câu 20đ + 1 câu 30đ
    const q10 = await getQuestionsFromBank(10, 1, packageType, teamId);
    const q20 = await getQuestionsFromBank(20, 1, packageType, teamId);
    const q30 = await getQuestionsFromBank(30, 1, packageType, teamId);
    questions = [
      { ...q10[0], order: 1 },
      { ...q20[0], order: 2 },
      { ...q30[0], order: 3 },
    ];
  } else if (packageType === 80) {
    // Gói 80 điểm = 1 câu 20đ + 2 câu 30đ
    const q20 = await getQuestionsFromBank(20, 1, packageType, teamId);
    const q30_1 = await getQuestionsFromBank(30, 1, packageType, teamId);
    const q30_2 = await getQuestionsFromBank(30, 1, packageType, teamId);
    questions = [
      { ...q20[0], order: 1 },
      { ...q30_1[0], order: 2 },
      { ...q30_2[0], order: 3 },
    ];
  }
  
  return {
    type: packageType,
    questions,
    selectedByTeamId: teamId,
  };
}

// Helper: Load full state từ DB
async function loadFullState(): Promise<Round4State> {
  await connectDB();
  const config = await loadConfigFromDB();
  const gameState = await loadGameStateFromDB();
  const questionBank = await loadQuestionBankFromDB();
  let teams = await loadRound4TeamsFromDB();
  
  if (teams.length === 0) {
    teams = await loadTeamsFromDB();
    if (teams.length > 0) {
      await saveRound4TeamsToDB(teams);
    }
  }
  
  return {
    config,
    gameState,
    teams,
    questionBank,
  };
}

// GET: Lấy state hiện tại
export async function GET() {
  try {
    await connectDB();
    
    const config = await loadConfigFromDB();
    const gameState = await loadGameStateFromDB();
    let teams = await loadRound4TeamsFromDB();
    
    if (teams.length === 0) {
      teams = await loadTeamsFromDB();
      if (teams.length > 0) {
        await saveRound4TeamsToDB(teams);
      }
    }
    
    const questionBank = await loadQuestionBankFromDB();
    
    const state: Round4State = {
      config,
      gameState,
      teams,
      questionBank,
    };
    
    return NextResponse.json(state);
  } catch (error) {
    console.error("Error getting round4 state:", error);
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
      case "setQuestionBank": {
        await connectDB();
        const questionBank = data as Round4QuestionBank;
        await saveQuestionBankToDB(questionBank);
        const state = await loadFullState();
        return NextResponse.json({ success: true, state });
      }

      case "setConfig": {
        await connectDB();
        const config = data as Round4Config;
        const currentGameState = await loadGameStateFromDB();
        
        if (!currentGameState.currentQuestionId) {
          const resetGameState: Round4GameState = {
            status: "idle",
            currentPackageType: null,
            currentQuestionId: null,
            currentMainTeamId: null,
            timeLeft: 20,
            questionStartTime: null,
            questionInitialTime: null,
            buzzerWindowStartTime: null,
            buzzerWindowTimeLeft: 5,
            buzzerPresses: [],
            teamAnswers: [],
            hopeStarTeams: [],
            currentQuestionIndex: 0,
            currentPackageIndex: 0,
          };
          await saveGameStateToDB(resetGameState);
        }
        
        await Round4ConfigModel.deleteMany({});
        await Round4ConfigModel.create({
          packages: config.packages,
        });
        
        const state = await loadFullState();
        return NextResponse.json({ success: true, state });
      }

      case "setGameState": {
        await connectDB();
        const currentGameState = await loadGameStateFromDB();
        const gameStateUpdates = data as Partial<Round4GameState>;
        
        // Reset teamAnswers khi chọn câu hỏi mới
        if (gameStateUpdates.currentQuestionId !== undefined && 
            gameStateUpdates.currentQuestionId !== currentGameState.currentQuestionId) {
          gameStateUpdates.teamAnswers = [];
          gameStateUpdates.buzzerPresses = [];
          gameStateUpdates.hopeStarTeams = [];
        }
        
        if (gameStateUpdates.status === "question_open" && currentGameState.status !== "question_open") {
          gameStateUpdates.questionStartTime = Date.now();
          gameStateUpdates.questionInitialTime = gameStateUpdates.timeLeft !== undefined ? gameStateUpdates.timeLeft : 20;
          gameStateUpdates.timeLeft = gameStateUpdates.timeLeft !== undefined ? gameStateUpdates.timeLeft : 20;
        }
        
        if (gameStateUpdates.status === "buzzer_window" && currentGameState.status !== "buzzer_window") {
          gameStateUpdates.buzzerWindowStartTime = Date.now();
          gameStateUpdates.buzzerWindowTimeLeft = 5;
        }
        
        if (gameStateUpdates.status !== undefined && 
            gameStateUpdates.status !== "question_open" && 
            currentGameState.status === "question_open") {
          gameStateUpdates.questionStartTime = null;
          gameStateUpdates.questionInitialTime = null;
        }
        
        if (gameStateUpdates.status !== undefined && 
            gameStateUpdates.status !== "buzzer_window" && 
            currentGameState.status === "buzzer_window") {
          gameStateUpdates.buzzerWindowStartTime = null;
          gameStateUpdates.buzzerWindowTimeLeft = 5;
        }
        
        const updatedGameState = { ...currentGameState, ...gameStateUpdates };
        await saveGameStateToDB(updatedGameState);
        
        const state = await loadFullState();
        return NextResponse.json({ success: true, state });
      }

      case "setTeams": {
        await connectDB();
        const teams = data as Round4Team[];
        await saveRound4TeamsToDB(teams);
        const state = await loadFullState();
        return NextResponse.json({ success: true, state });
      }

      case "loadTeams": {
        await connectDB();
        const teams = await loadTeamsFromDB();
        await saveRound4TeamsToDB(teams);
        const state = await loadFullState();
        return NextResponse.json({ success: true, state });
      }

      case "selectPackage": {
        await connectDB();
        const { teamId, packageType } = data;
        const teams = await loadRound4TeamsFromDB();
        let config = await loadConfigFromDB();
        const gameState = await loadGameStateFromDB();
        const questionBank = await loadQuestionBankFromDB();
        
        // Kiểm tra ngân hàng câu hỏi
        if (!questionBank) {
          return NextResponse.json(
            { error: "Chưa có ngân hàng câu hỏi. Vui lòng tạo ngân hàng câu hỏi trước." },
            { status: 400 }
          );
        }
        
        const team = teams.find((t) => t.id === teamId);
        if (!team) {
          return NextResponse.json(
            { error: "Không tìm thấy đội" },
            { status: 400 }
          );
        }
        
        if (team.selectedPackage !== null) {
          return NextResponse.json(
            { error: "Đội đã chọn gói rồi" },
            { status: 400 }
          );
        }
        
        // Bỏ kiểm tra "gói đã được chọn bởi đội khác" - nhiều đội có thể chọn cùng loại gói
        // Mỗi đội sẽ có package riêng với câu hỏi khác nhau từ question bank
        
        // Tạo gói câu hỏi từ ngân hàng
        let newPackage: Round4Package;
        try {
          newPackage = await createPackageFromBank(packageType, teamId);
        } catch (error: any) {
          return NextResponse.json(
            { error: error.message || "Không thể tạo gói câu hỏi từ ngân hàng" },
            { status: 400 }
          );
        }
        
        // Tìm thứ tự chọn gói (số đội đã chọn + 1)
        const selectedCount = teams.filter((t) => t.selectedPackage !== null).length;
        const packageOrder = selectedCount + 1;
        
        // Cập nhật đội
        const updatedTeams = teams.map((t) =>
          t.id === teamId
            ? { ...t, selectedPackage: packageType, packageOrder }
            : t
        );
        await saveRound4TeamsToDB(updatedTeams);
        
        // Cập nhật config - thêm package mới (có thể có nhiều package cùng type nhưng khác selectedByTeamId)
        if (!config) {
          config = {
            packages: [],
          };
        }
        
        // Xóa package cũ của đội này (nếu có) và thêm package mới
        config.packages = config.packages.filter((p) => p.selectedByTeamId !== teamId);
        config.packages.push(newPackage);
        
        await Round4ConfigModel.deleteMany({});
        await Round4ConfigModel.create({
          packages: config.packages,
        });
        
        // Nếu đã có 4 đội chọn, chuyển sang trạng thái chuẩn bị câu hỏi đầu tiên
        if (selectedCount + 1 === 4) {
          const firstTeam = updatedTeams.find((t) => t.packageOrder === 1);
          if (firstTeam) {
            await saveGameStateToDB({
              status: "question_preparing",
              currentPackageType: firstTeam.selectedPackage!,
              currentMainTeamId: firstTeam.id,
              currentPackageIndex: 0,
            });
          }
        } else {
          // Vẫn ở trạng thái chọn gói
          await saveGameStateToDB({
            status: "package_selection_by_mc",
          });
        }
        
        const state = await loadFullState();
        return NextResponse.json({ success: true, state });
      }

      case "setHopeStar": {
        await connectDB();
        const { teamId } = data;
        const teams = await loadRound4TeamsFromDB();
        const gameState = await loadGameStateFromDB();
        
        const team = teams.find((t) => t.id === teamId);
        if (!team) {
          return NextResponse.json(
            { error: "Không tìm thấy đội" },
            { status: 400 }
          );
        }
        
        if (team.hasUsedHopeStar) {
          return NextResponse.json(
            { error: "Đội đã sử dụng ngôi sao hy vọng rồi" },
            { status: 400 }
          );
        }
        
        // Chỉ cho phép đặt ngôi sao khi đang chuẩn bị câu hỏi
        if (gameState.status !== "question_preparing") {
          return NextResponse.json(
            { error: "Chỉ có thể đặt ngôi sao hy vọng trước khi câu hỏi được mở" },
            { status: 400 }
          );
        }
        
        // Thêm vào danh sách hopeStarTeams
        const updatedHopeStarTeams = [...gameState.hopeStarTeams];
        if (!updatedHopeStarTeams.includes(teamId)) {
          updatedHopeStarTeams.push(teamId);
        }
        
        await saveGameStateToDB({
          hopeStarTeams: updatedHopeStarTeams,
        });
        
        const state = await loadFullState();
        return NextResponse.json({ success: true, state });
      }

      case "submitAnswer": {
        await connectDB();
        const { teamId, teamName, answer } = data;
        const gameState = await loadGameStateFromDB();
        const teams = await loadRound4TeamsFromDB();
        const config = await loadConfigFromDB();
        
        if (gameState.status !== "question_open" && gameState.status !== "waiting_answer") {
          return NextResponse.json(
            { error: "Không thể gửi đáp án ở trạng thái này" },
            { status: 400 }
          );
        }

        if (!gameState.currentQuestionId || !config) {
          return NextResponse.json(
            { error: "Chưa có câu hỏi đang active" },
            { status: 400 }
          );
        }

        const isMainTeam = gameState.currentMainTeamId === teamId;
        const isBuzzerTeam = !isMainTeam && gameState.buzzerPresses.length > 0 && 
                            gameState.buzzerPresses[0].teamId === teamId;
        
        if (!isMainTeam && !isBuzzerTeam) {
          return NextResponse.json(
            { error: "Bạn không có quyền trả lời câu hỏi này" },
            { status: 400 }
          );
        }

        // Tìm câu hỏi hiện tại - tìm theo cả type và selectedByTeamId
        const currentPackage = config.packages.find(
          (p) => p.type === gameState.currentPackageType && p.selectedByTeamId === gameState.currentMainTeamId
        );
        if (!currentPackage) {
          return NextResponse.json(
            { error: "Không tìm thấy gói câu hỏi" },
            { status: 400 }
          );
        }
        
        const currentQuestion = currentPackage.questions.find(
          (q) => q.id === gameState.currentQuestionId
        );
        if (!currentQuestion) {
          return NextResponse.json(
            { error: "Không tìm thấy câu hỏi" },
            { status: 400 }
          );
        }

        // Kiểm tra đáp án đúng/sai
        const correct = isAnswerCorrect(answer.trim(), currentQuestion.answerText);
        const isHopeStar = gameState.hopeStarTeams.includes(teamId);

        // Xử lý đáp án của đội chính (có thể thay đổi)
        if (isMainTeam) {
          // Tìm đáp án cũ của đội chính (nếu có)
          const existingAnswerIndex = gameState.teamAnswers.findIndex(
            (ta) => ta.teamId === teamId && ta.isMainTeam
          );
          
          const newAnswer: Round4TeamAnswer = {
            teamId,
            teamName: teamName || teams.find((t) => t.id === teamId)?.name || `Đội ${teamId}`,
            answer: answer.trim(),
            isCorrect: null, // MC sẽ đánh giá sau
            submittedAt: Date.now(),
            isMainTeam: true,
            isHopeStar,
            pointsAwarded: 0, // Sẽ tính sau
            isFinalAnswer: true, // Đội chính: đáp án cuối cùng
          };
          
          let updatedAnswers = [...gameState.teamAnswers];
          if (existingAnswerIndex >= 0) {
            // Cập nhật đáp án cũ
            updatedAnswers[existingAnswerIndex] = newAnswer;
          } else {
            // Thêm đáp án mới
            updatedAnswers.push(newAnswer);
          }
          
          await saveGameStateToDB({
            teamAnswers: updatedAnswers,
            status: "waiting_mc_judgment", // Chờ MC đánh giá
          });
        } else {
          // Đội giành quyền: chỉ ghi nhận đáp án đầu tiên
          const existingAnswer = gameState.teamAnswers.find(
            (ta) => ta.teamId === teamId && !ta.isMainTeam
          );
          
          if (existingAnswer) {
            return NextResponse.json(
              { error: "Bạn đã gửi đáp án rồi. Đội giành quyền chỉ được gửi một lần." },
              { status: 400 }
            );
          }
          
          const newAnswer: Round4TeamAnswer = {
            teamId,
            teamName: teamName || teams.find((t) => t.id === teamId)?.name || `Đội ${teamId}`,
            answer: answer.trim(),
            isCorrect: correct,
            submittedAt: Date.now(),
            isMainTeam: false,
            isHopeStar: false, // Đội giành quyền không có ngôi sao
            pointsAwarded: 0,
            isFinalAnswer: false, // Đội giành quyền: đáp án đầu tiên
          };
          
          const updatedAnswers = [...gameState.teamAnswers, newAnswer];
          await saveGameStateToDB({
            teamAnswers: updatedAnswers,
            status: "waiting_mc_judgment", // Chờ MC đánh giá
          });
        }

        const state = await loadFullState();
        return NextResponse.json({ success: true, state });
      }

      case "selectTeam": {
        // MC chọn đội thi
        await connectDB();
        const { teamId } = data;
        const teams = await loadRound4TeamsFromDB();
        const gameState = await loadGameStateFromDB();
        
        // Cho phép chọn đội nếu status là idle, team_selection, hoặc round_finished
        // Hoặc nếu chưa có đội nào được chọn (currentMainTeamId = null)
        const canSelectTeam = 
          gameState.status === "idle" || 
          gameState.status === "team_selection" || 
          gameState.status === "round_finished" ||
          !gameState.currentMainTeamId;
        
        if (!canSelectTeam) {
          return NextResponse.json(
            { error: `Không thể chọn đội ở trạng thái này (${gameState.status}). Vui lòng reset game hoặc chờ vòng chơi kết thúc.` },
            { status: 400 }
          );
        }
        
        const team = teams.find((t) => t.id === teamId);
        if (!team) {
          return NextResponse.json(
            { error: "Không tìm thấy đội" },
            { status: 400 }
          );
        }
        
        // Kiểm tra xem đội này đã chọn gói chưa
        if (team.selectedPackage !== null) {
          return NextResponse.json(
            { error: "Đội này đã chọn gói rồi. Vui lòng chọn đội khác." },
            { status: 400 }
          );
        }
        
        await saveGameStateToDB({
          status: "package_selection_by_mc",
          currentMainTeamId: teamId,
        });
        
        const state = await loadFullState();
        return NextResponse.json({ success: true, state });
      }

      case "selectPackageForTeam": {
        // MC chọn gói cho đội đã chọn
        await connectDB();
        const { packageType } = data;
        const teams = await loadRound4TeamsFromDB();
        let config = await loadConfigFromDB();
        const gameState = await loadGameStateFromDB();
        const questionBank = await loadQuestionBankFromDB();
        
        // Cho phép chọn gói nếu đã có currentMainTeamId và status phù hợp
        // Hoặc nếu status là package_selection_by_mc
        if (!gameState.currentMainTeamId) {
          return NextResponse.json(
            { error: "Chưa chọn đội. Vui lòng chọn đội trước." },
            { status: 400 }
          );
        }
        
        // Kiểm tra xem đội đã chọn gói chưa
        const team = teams.find((t) => t.id === gameState.currentMainTeamId);
        if (team && team.selectedPackage !== null) {
          return NextResponse.json(
            { error: "Đội này đã chọn gói rồi" },
            { status: 400 }
          );
        }
        
        // Cho phép chọn gói nếu status là package_selection_by_mc hoặc team_selection
        // (có thể do race condition hoặc state chưa sync)
        if (gameState.status !== "package_selection_by_mc" && gameState.status !== "team_selection") {
          // Nếu đang trong game (question_preparing, question_open, etc), không cho chọn gói
          if (gameState.status !== "idle") {
            return NextResponse.json(
              { error: `Không thể chọn gói ở trạng thái này (${gameState.status}). Vui lòng reset game hoặc chờ vòng chơi kết thúc.` },
              { status: 400 }
            );
          }
        }
        
        // Kiểm tra ngân hàng câu hỏi
        if (!questionBank) {
          return NextResponse.json(
            { error: "Chưa có ngân hàng câu hỏi. Vui lòng tạo ngân hàng câu hỏi trước." },
            { status: 400 }
          );
        }
        
        // team đã được định nghĩa ở trên (dòng 828), kiểm tra lại nếu chưa có
        if (!team) {
          return NextResponse.json(
            { error: "Không tìm thấy đội" },
            { status: 400 }
          );
        }
        
        const teamId = gameState.currentMainTeamId;
        
        // Bỏ kiểm tra "gói đã được chọn bởi đội khác" - nhiều đội có thể chọn cùng loại gói
        // Mỗi đội sẽ có package riêng với câu hỏi khác nhau từ question bank
        
        // Tạo gói câu hỏi từ ngân hàng
        let newPackage: Round4Package;
        try {
          newPackage = await createPackageFromBank(packageType, teamId);
        } catch (error: any) {
          return NextResponse.json(
            { error: error.message || "Không thể tạo gói câu hỏi từ ngân hàng" },
            { status: 400 }
          );
        }
        
        // Tìm thứ tự chọn gói (số đội đã chọn + 1)
        const selectedCount = teams.filter((t) => t.selectedPackage !== null).length;
        const packageOrder = selectedCount + 1;
        
        // Cập nhật đội
        const updatedTeams = teams.map((t) =>
          t.id === teamId
            ? { ...t, selectedPackage: packageType, packageOrder }
            : t
        );
        await saveRound4TeamsToDB(updatedTeams);
        
        // Cập nhật config - thêm package mới (có thể có nhiều package cùng type nhưng khác selectedByTeamId)
        if (!config) {
          config = {
            packages: [],
          };
        }
        
        // Xóa package cũ của đội này (nếu có) và thêm package mới
        config.packages = config.packages.filter((p) => p.selectedByTeamId !== teamId);
        config.packages.push(newPackage);
        
        await Round4ConfigModel.deleteMany({});
        await Round4ConfigModel.create({
          packages: config.packages,
        });
        
        // Chuyển sang trạng thái chuẩn bị câu hỏi
        await saveGameStateToDB({
          status: "question_preparing",
          currentPackageType: packageType,
          currentPackageIndex: selectedCount,
        });
        
        const state = await loadFullState();
        return NextResponse.json({ success: true, state });
      }

      case "markAnswer": {
        // MC đánh giá đáp án: "correct", "incorrect", "no_answer"
        // Có thể đánh giá đáp án của đội chính hoặc đội giành quyền
        await connectDB();
        const { judgment, teamId } = data; // judgment: "correct" | "incorrect" | "no_answer", teamId: optional (nếu không có thì là đội chính)
        const gameState = await loadGameStateFromDB();
        const teams = await loadRound4TeamsFromDB();
        const config = await loadConfigFromDB();
        
        if (gameState.status !== "waiting_mc_judgment") {
          return NextResponse.json(
            { error: "Không thể đánh giá đáp án ở trạng thái này" },
            { status: 400 }
          );
        }
        
        if (!gameState.currentQuestionId || !config) {
          return NextResponse.json(
            { error: "Chưa có câu hỏi đang active" },
            { status: 400 }
          );
        }
        
        // Tìm đáp án cần đánh giá (đội chính hoặc đội giành quyền)
        const targetAnswer = teamId
          ? gameState.teamAnswers.find((ta) => ta.teamId === teamId && !ta.isMainTeam)
          : gameState.teamAnswers.find((ta) => ta.isMainTeam);
        
        if (!targetAnswer) {
          return NextResponse.json(
            { error: "Chưa có đáp án cần đánh giá" },
            { status: 400 }
          );
        }
        
        const currentPackage = config.packages.find(
          (p) => p.type === gameState.currentPackageType && p.selectedByTeamId === gameState.currentMainTeamId
        );
        if (!currentPackage) {
          return NextResponse.json(
            { error: "Không tìm thấy gói câu hỏi" },
            { status: 400 }
          );
        }
        
        const currentQuestion = currentPackage.questions.find(
          (q) => q.id === gameState.currentQuestionId
        );
        if (!currentQuestion) {
          return NextResponse.json(
            { error: "Không tìm thấy câu hỏi" },
            { status: 400 }
          );
        }
        
        const updatedAnswers = [...gameState.teamAnswers];
        const updatedTeams = [...teams];
        const points = currentQuestion.points;
        const isMainTeam = targetAnswer.isMainTeam;
        const isHopeStar = targetAnswer.isHopeStar;
        
        if (judgment === "correct") {
          // Trả lời đúng
          targetAnswer.isCorrect = true;
          const pointsToAward = isMainTeam && isHopeStar ? points * 2 : points;
          targetAnswer.pointsAwarded = pointsToAward;
          
          const teamIndex = updatedTeams.findIndex((t) => t.id === targetAnswer.teamId);
          if (teamIndex >= 0) {
            updatedTeams[teamIndex].score += pointsToAward;
            if (isMainTeam && isHopeStar) {
              updatedTeams[teamIndex].hasUsedHopeStar = true;
            }
          }
          
          // Nếu là đội giành quyền trả lời đúng, trừ điểm từ đội chính (nếu chưa trừ)
          if (!isMainTeam) {
            const mainTeamAnswer = updatedAnswers.find((ta) => ta.isMainTeam);
            if (mainTeamAnswer && mainTeamAnswer.isCorrect === false) {
              const mainTeamIndex = updatedTeams.findIndex((t) => t.id === mainTeamAnswer.teamId);
              if (mainTeamIndex >= 0 && !mainTeamAnswer.isHopeStar) {
                updatedTeams[mainTeamIndex].score -= points;
                mainTeamAnswer.pointsAwarded = -points;
              }
            }
          }
          
          await saveGameStateToDB({
            teamAnswers: updatedAnswers,
            status: "answer_revealed",
          });
        } else if (judgment === "incorrect" || judgment === "no_answer") {
          // Trả lời sai hoặc không trả lời
          targetAnswer.isCorrect = false;
          
          if (isMainTeam) {
            // Đội chính trả lời sai -> mở cửa sổ cướp điểm
            if (isHopeStar) {
              // Nếu có ngôi sao và trả lời sai, trừ điểm
              const pointsToDeduct = points;
              targetAnswer.pointsAwarded = -pointsToDeduct;
              
              const teamIndex = updatedTeams.findIndex((t) => t.id === targetAnswer.teamId);
              if (teamIndex >= 0) {
                updatedTeams[teamIndex].score -= pointsToDeduct;
                updatedTeams[teamIndex].hasUsedHopeStar = true;
              }
            } else {
              targetAnswer.pointsAwarded = 0;
            }
            
            // Mở cửa sổ cướp điểm (5 giây)
            await saveGameStateToDB({
              teamAnswers: updatedAnswers,
              status: "buzzer_window",
              buzzerWindowStartTime: Date.now(),
              buzzerWindowTimeLeft: 5,
              buzzerPresses: [],
            });
          } else {
            // Đội giành quyền trả lời sai -> trừ 1/2 điểm
            const pointsToDeduct = Math.floor(points / 2);
            targetAnswer.pointsAwarded = -pointsToDeduct;
            
            const teamIndex = updatedTeams.findIndex((t) => t.id === targetAnswer.teamId);
            if (teamIndex >= 0) {
              updatedTeams[teamIndex].score -= pointsToDeduct;
            }
            
            // Chuyển sang trạng thái hiển thị đáp án
            await saveGameStateToDB({
              teamAnswers: updatedAnswers,
              status: "answer_revealed",
            });
          }
        }
        
        await saveRound4TeamsToDB(updatedTeams);

        const state = await loadFullState();
        return NextResponse.json({ success: true, state });
      }

      case "pressBuzzer": {
        await connectDB();
        const { teamId, teamName } = data;
        const gameState = await loadGameStateFromDB();
        const teams = await loadRound4TeamsFromDB();
        
        if (gameState.status !== "buzzer_window") {
          return NextResponse.json(
            { error: "Không phải thời điểm bấm chuông" },
            { status: 400 }
          );
        }
        
        if (gameState.currentMainTeamId === teamId) {
          return NextResponse.json(
            { error: "Đội chính không thể bấm chuông" },
            { status: 400 }
          );
        }
        
        // Kiểm tra đã bấm chưa
        const alreadyPressed = gameState.buzzerPresses.some((bp) => bp.teamId === teamId);
        if (alreadyPressed) {
          return NextResponse.json(
            { error: "Bạn đã bấm chuông rồi" },
            { status: 400 }
          );
        }
        
        const newBuzzerPress = {
          teamId,
          teamName: teamName || teams.find((t) => t.id === teamId)?.name || `Đội ${teamId}`,
          timestamp: Date.now(),
        };
        
        const updatedBuzzerPresses = [...gameState.buzzerPresses, newBuzzerPress];
        await saveGameStateToDB({
          buzzerPresses: updatedBuzzerPresses,
        });
        
        const state = await loadFullState();
        return NextResponse.json({ success: true, state });
      }

      case "calculatePoints": {
        await connectDB();
        const gameState = await loadGameStateFromDB();
        const teams = await loadRound4TeamsFromDB();
        const config = await loadConfigFromDB();
        
        if (!gameState.currentQuestionId || !config) {
          return NextResponse.json(
            { error: "Chưa có câu hỏi đang active" },
            { status: 400 }
          );
        }
        
        const currentPackage = config.packages.find(
          (p) => p.type === gameState.currentPackageType && p.selectedByTeamId === gameState.currentMainTeamId
        );
        if (!currentPackage) {
          return NextResponse.json(
            { error: "Không tìm thấy gói câu hỏi" },
            { status: 400 }
          );
        }
        
        const currentQuestion = currentPackage.questions.find(
          (q) => q.id === gameState.currentQuestionId
        );
        if (!currentQuestion) {
          return NextResponse.json(
            { error: "Không tìm thấy câu hỏi" },
            { status: 400 }
          );
        }
        
        const updatedAnswers = [...gameState.teamAnswers];
        const updatedTeams = [...teams];
        
        // Tìm đáp án của đội chính
        const mainTeamAnswer = updatedAnswers.find((ta) => ta.isMainTeam);
        
        if (mainTeamAnswer) {
          const isHopeStar = mainTeamAnswer.isHopeStar;
          const points = currentQuestion.points;
          
          if (mainTeamAnswer.isCorrect === true) {
            // Đội chính trả lời đúng
            const pointsToAward = isHopeStar ? points * 2 : points;
            mainTeamAnswer.pointsAwarded = pointsToAward;
            
            const teamIndex = updatedTeams.findIndex((t) => t.id === mainTeamAnswer.teamId);
            if (teamIndex >= 0) {
              updatedTeams[teamIndex].score += pointsToAward;
            }
            
            // Đánh dấu đã dùng ngôi sao nếu có
            if (isHopeStar) {
              const teamIndex = updatedTeams.findIndex((t) => t.id === mainTeamAnswer.teamId);
              if (teamIndex >= 0) {
                updatedTeams[teamIndex].hasUsedHopeStar = true;
              }
            }
          } else if (mainTeamAnswer.isCorrect === false) {
            // Đội chính trả lời sai
            const pointsToDeduct = isHopeStar ? points : 0; // Nếu có ngôi sao thì trừ điểm
            mainTeamAnswer.pointsAwarded = -pointsToDeduct;
            
            const teamIndex = updatedTeams.findIndex((t) => t.id === mainTeamAnswer.teamId);
            if (teamIndex >= 0) {
              updatedTeams[teamIndex].score -= pointsToDeduct;
            }
            
            // Đánh dấu đã dùng ngôi sao nếu có
            if (isHopeStar) {
              const teamIndex = updatedTeams.findIndex((t) => t.id === mainTeamAnswer.teamId);
              if (teamIndex >= 0) {
                updatedTeams[teamIndex].hasUsedHopeStar = true;
              }
            }
            
            // Xử lý đội giành quyền (nếu có)
            if (gameState.buzzerPresses.length > 0) {
              const firstBuzzerTeam = gameState.buzzerPresses[0];
              const buzzerAnswer = updatedAnswers.find(
                (ta) => ta.teamId === firstBuzzerTeam.teamId && !ta.isMainTeam
              );
              
              if (buzzerAnswer) {
                if (buzzerAnswer.isCorrect === true) {
                  // Đội giành quyền trả lời đúng: giành điểm từ đội sai
                  buzzerAnswer.pointsAwarded = points;
                  
                  const buzzerTeamIndex = updatedTeams.findIndex((t) => t.id === buzzerAnswer.teamId);
                  if (buzzerTeamIndex >= 0) {
                    updatedTeams[buzzerTeamIndex].score += points;
                  }
                  
                  // Trừ điểm từ đội chính (nếu chưa trừ)
                  const mainTeamIndex = updatedTeams.findIndex((t) => t.id === mainTeamAnswer.teamId);
                  if (mainTeamIndex >= 0 && !isHopeStar) {
                    updatedTeams[mainTeamIndex].score -= points;
                    mainTeamAnswer.pointsAwarded = -points;
                  }
                } else if (buzzerAnswer.isCorrect === false) {
                  // Đội giành quyền trả lời sai: trừ 1/2 điểm
                  const pointsToDeduct = Math.floor(points / 2);
                  buzzerAnswer.pointsAwarded = -pointsToDeduct;
                  
                  const buzzerTeamIndex = updatedTeams.findIndex((t) => t.id === buzzerAnswer.teamId);
                  if (buzzerTeamIndex >= 0) {
                    updatedTeams[buzzerTeamIndex].score -= pointsToDeduct;
                  }
                }
              }
            }
          }
        }
        
        await saveGameStateToDB({ teamAnswers: updatedAnswers });
        await saveRound4TeamsToDB(updatedTeams);
        
        const state = await loadFullState();
        return NextResponse.json({ success: true, state });
      }

      case "nextQuestion": {
        await connectDB();
        const gameState = await loadGameStateFromDB();
        const config = await loadConfigFromDB();
        const teams = await loadRound4TeamsFromDB();
        
        if (!config) {
          return NextResponse.json(
            { error: "Chưa có config" },
            { status: 400 }
          );
        }
        
        const currentPackage = config.packages.find(
          (p) => p.type === gameState.currentPackageType && p.selectedByTeamId === gameState.currentMainTeamId
        );
        if (!currentPackage) {
          return NextResponse.json(
            { error: "Không tìm thấy gói câu hỏi" },
            { status: 400 }
          );
        }
        
        const nextQuestionIndex = gameState.currentQuestionIndex + 1;
        
        if (nextQuestionIndex >= currentPackage.questions.length) {
          // Hết câu hỏi trong gói, quay lại chọn đội mới
          const selectedCount = teams.filter((t) => t.selectedPackage !== null).length;
          
          if (selectedCount >= 4) {
            // Đã chơi hết 4 đội, kết thúc vòng
            await saveGameStateToDB({
              status: "round_finished",
              currentQuestionId: null,
              currentMainTeamId: null,
              teamAnswers: [],
              buzzerPresses: [],
              hopeStarTeams: [],
            });
          } else {
            // Quay lại chọn đội mới
              await saveGameStateToDB({
              status: "team_selection",
                currentQuestionId: null,
              currentMainTeamId: null,
              currentPackageType: null,
                currentQuestionIndex: 0,
                teamAnswers: [],
                buzzerPresses: [],
                hopeStarTeams: [],
              });
          }
        } else {
          // Chuyển sang câu hỏi tiếp theo trong cùng gói
          await saveGameStateToDB({
            status: "question_preparing",
            currentQuestionId: null,
            currentQuestionIndex: nextQuestionIndex,
            teamAnswers: [],
            buzzerPresses: [],
            hopeStarTeams: [],
          });
        }
        
        const state = await loadFullState();
        return NextResponse.json({ success: true, state });
      }

      case "reset": {
        await connectDB();
        const resetGameState: Round4GameState = {
          status: "idle",
          currentPackageType: null,
          currentQuestionId: null,
          currentMainTeamId: null,
          timeLeft: 20,
          questionStartTime: null,
          questionInitialTime: null,
          buzzerWindowStartTime: null,
          buzzerWindowTimeLeft: 5,
          buzzerPresses: [],
          teamAnswers: [],
          hopeStarTeams: [],
          currentQuestionIndex: 0,
          currentPackageIndex: 0,
        };
        await saveGameStateToDB(resetGameState);
        const state = await loadFullState();
        return NextResponse.json({ success: true, state });
      }

      case "resetAll": {
        await connectDB();
        const resetGameState: Round4GameState = {
          status: "idle",
          currentPackageType: null,
          currentQuestionId: null,
          currentMainTeamId: null,
          timeLeft: 20,
          questionStartTime: null,
          questionInitialTime: null,
          buzzerWindowStartTime: null,
          buzzerWindowTimeLeft: 5,
          buzzerPresses: [],
          teamAnswers: [],
          hopeStarTeams: [],
          currentQuestionIndex: 0,
          currentPackageIndex: 0,
        };
        await saveGameStateToDB(resetGameState);
        
        const currentTeams = await loadRound4TeamsFromDB();
        const resetTeams = currentTeams.map((team) => ({
          ...team,
          score: 0,
          hasUsedHopeStar: false,
          selectedPackage: null,
          packageOrder: null,
        }));
        await saveRound4TeamsToDB(resetTeams);
        
        // Reset question bank - đánh dấu tất cả câu hỏi chưa dùng
        const questionBank = await loadQuestionBankFromDB();
        if (questionBank) {
          const resetQuestionBank: Round4QuestionBank = {
            questions10: questionBank.questions10.map((q) => ({
              ...q,
              isUsed: false,
              usedByPackageType: null,
              usedByTeamId: null,
            })),
            questions20: questionBank.questions20.map((q) => ({
              ...q,
              isUsed: false,
              usedByPackageType: null,
              usedByTeamId: null,
            })),
            questions30: questionBank.questions30.map((q) => ({
              ...q,
              isUsed: false,
              usedByPackageType: null,
              usedByTeamId: null,
            })),
          };
          await saveQuestionBankToDB(resetQuestionBank);
        }
        
        // Reset config
        await Round4ConfigModel.deleteMany({});
        
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
    console.error("Error updating round4 state:", error);
    return NextResponse.json(
      { error: "Lỗi khi cập nhật state" },
      { status: 500 }
    );
  }
}

