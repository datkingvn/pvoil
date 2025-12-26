import { NextRequest, NextResponse } from "next/server";
import {
  getRound2State,
  setRound2State,
  setRound2Config,
  setRound2GameState,
  setRound2Teams,
  resetRound2GameState,
} from "@/lib/round2/store";
import { Round2Config, Round2GameState, Round2Team, Round2TileStatus, Round2TeamAnswer, Round2BuzzerPress } from "@/lib/round2/types";
import { normalizeKeyword, countKeywordLetters, countAnswerWords } from "@/lib/round2/helpers";
import connectDB from "@/lib/mongodb";
import Team from "@/models/Team";
import Round2ConfigModel from "@/models/Round2Config";

export const runtime = "nodejs";

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

// GET: Lấy state hiện tại
export async function GET() {
  try {
    const state = getRound2State();
    
    // Nếu chưa có config trong memory, thử load từ DB
    if (!state.config) {
      const config = await loadConfigFromDB();
      if (config) {
        setRound2Config(config);
      }
    }
    
    // Nếu chưa có teams, load từ DB
    if (state.teams.length === 0) {
      const teams = await loadTeamsFromDB();
      if (teams.length > 0) {
        setRound2Teams(teams);
      }
    }
    
    const updatedState = getRound2State();
    
    // Tính toán timeLeft dựa trên questionStartTime nếu status = "question_open"
    if (updatedState.gameState.status === "question_open" && 
        updatedState.gameState.questionStartTime !== null && 
        updatedState.gameState.questionInitialTime !== null) {
      const elapsed = Math.floor((Date.now() - updatedState.gameState.questionStartTime) / 1000);
      const calculatedTimeLeft = Math.max(0, updatedState.gameState.questionInitialTime - elapsed);
      updatedState.gameState.timeLeft = calculatedTimeLeft;
    }
    
    return NextResponse.json(updatedState);
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
        const config = data as Round2Config;
        const currentState = getRound2State();
        // Nếu đang có activeQuestionId, giữ nguyên game state (đang trong quá trình chơi)
        // Nếu không có activeQuestionId, reset game state (config mới)
        if (!currentState.gameState.activeQuestionId) {
          resetRound2GameState();
        }
        
        // Lưu config vào memory
        setRound2Config(config);
        
        // Lưu config vào database để persist
        try {
          await connectDB();
          // Xóa config cũ và tạo mới (chỉ giữ 1 config mới nhất)
          await Round2ConfigModel.deleteMany({});
          await Round2ConfigModel.create({
            imageOriginalUrl: config.imageOriginalUrl,
            keywordAnswer: config.keywordAnswer,
            keywordNormalized: config.keywordNormalized,
            keywordLength: config.keywordLength,
            questions: config.questions,
          });
        } catch (error) {
          console.error("Error saving config to DB:", error);
          // Vẫn trả về success vì đã lưu vào memory
        }
        
        return NextResponse.json({ success: true, state: getRound2State() });
      }

      case "setGameState": {
        const gameState = data as Partial<Round2GameState>;
        const currentState = getRound2State();
        
        // Nếu status chuyển sang "question_open", lưu timestamp và initial time
        if (gameState.status === "question_open" && currentState.gameState.status !== "question_open") {
          gameState.questionStartTime = Date.now();
          gameState.questionInitialTime = gameState.timeLeft !== undefined ? gameState.timeLeft : 15;
          gameState.timeLeft = gameState.timeLeft !== undefined ? gameState.timeLeft : 15;
        }
        
        // Nếu status chuyển sang không phải "question_open", reset timestamp
        if (gameState.status !== undefined && gameState.status !== "question_open" && currentState.gameState.status === "question_open") {
          gameState.questionStartTime = null;
          gameState.questionInitialTime = null;
        }
        
        setRound2GameState(gameState);
        const updatedState = getRound2State();
        
        // Tính toán timeLeft nếu đang trong trạng thái question_open
        if (updatedState.gameState.status === "question_open" && 
            updatedState.gameState.questionStartTime !== null && 
            updatedState.gameState.questionInitialTime !== null) {
          const elapsed = Math.floor((Date.now() - updatedState.gameState.questionStartTime) / 1000);
          const calculatedTimeLeft = Math.max(0, updatedState.gameState.questionInitialTime - elapsed);
          setRound2GameState({ timeLeft: calculatedTimeLeft });
        }
        
        return NextResponse.json({ success: true, state: getRound2State() });
      }

      case "setTeams": {
        const teams = data as Round2Team[];
        setRound2Teams(teams);
        return NextResponse.json({ success: true, state: getRound2State() });
      }

      case "loadTeams": {
        const teams = await loadTeamsFromDB();
        setRound2Teams(teams);
        return NextResponse.json({ success: true, state: getRound2State() });
      }

      case "updateTeamScore": {
        const { teamId, delta } = data;
        const state = getRound2State();
        const updatedTeams = state.teams.map((team) =>
          team.id === teamId ? { ...team, score: team.score + delta } : team
        );
        setRound2Teams(updatedTeams);
        return NextResponse.json({ success: true, state: getRound2State() });
      }

      case "reset": {
        resetRound2GameState();
        return NextResponse.json({ success: true, state: getRound2State() });
      }

      case "resetAll": {
        // Reset cả game state và tile status về hidden
        const state = getRound2State();
        resetRound2GameState();
        
        // Reset locked teams về false
        const resetTeams = state.teams.map((team) => ({
          ...team,
          isLocked: false,
        }));
        setRound2Teams(resetTeams);
        
        // Reset tile status về hidden nếu có config
        if (state.config) {
          const resetQuestions = state.config.questions.map((q) => ({
            ...q,
            tileStatus: "hidden" as Round2TileStatus,
          }));
          setRound2Config({ ...state.config, questions: resetQuestions });
        }
        
        return NextResponse.json({ success: true, state: getRound2State() });
      }

      case "submitAnswer": {
        // Submit đáp án từ đội
        const { teamId, teamName, answer } = data; // teamId là Round2Team id (number), teamName là tên đội
        const state = getRound2State();
        
        if (state.gameState.status !== "question_open") {
          return NextResponse.json(
            { error: "Câu hỏi chưa được mở" },
            { status: 400 }
          );
        }

        if (!state.gameState.activeQuestionId) {
          return NextResponse.json(
            { error: "Chưa có câu hỏi đang active" },
            { status: 400 }
          );
        }

        // Lấy teamName từ state.teams nếu không được cung cấp
        let finalTeamName = teamName;
        if (!finalTeamName && teamId) {
          const team = state.teams.find((t) => t.id === teamId);
          finalTeamName = team?.name || `Đội ${teamId}`;
        }

        // Kiểm tra xem đội đã submit đáp án cho câu hỏi này chưa
        const existingAnswer = state.gameState.teamAnswers.find(
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
        const updatedAnswers = [...state.gameState.teamAnswers, newAnswer];

        // Cập nhật game state
        setRound2GameState({
          teamAnswers: updatedAnswers,
          // Giữ nguyên status "question_open" để các đội khác vẫn có thể submit
        });

        return NextResponse.json({ success: true, state: getRound2State() });
      }

      case "pressBuzzer": {
        // Đội bấm chuông - Cho phép bấm ngay cả khi chưa mở câu hỏi
        // Tất cả các đội đều có thể bấm, nhưng chỉ hiển thị đội bấm trước
        const { teamId, teamName } = data;
        const state = getRound2State();
        
        // Kiểm tra đội có bị khóa không
        const team = state.teams.find((t) => t.id === teamId);
        if (team?.isLocked) {
          return NextResponse.json(
            { error: "Đội của bạn đã bị khóa" },
            { status: 400 }
          );
        }
        
        // Kiểm tra đội này đã bấm chuông chưa
        const alreadyPressed = state.gameState.buzzerPresses?.some(
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
        
        const updatedPresses = [...(state.gameState.buzzerPresses || []), newPress];
        
        // Lưu thông tin đội bấm chuông
        // Đội đầu tiên (bấm trước) được lưu vào buzzerTeamId để backward compatibility
        const firstPress = updatedPresses[0];
        setRound2GameState({
          buzzerPresses: updatedPresses,
          buzzerTeamId: firstPress.teamId,
          buzzerTeamName: firstPress.teamName,
          buzzerTimestamp: firstPress.timestamp,
        });
        
        return NextResponse.json({ success: true, state: getRound2State() });
      }

      case "judgeKeyword": {
        // MC chấm từ khóa đúng/sai - Chấm cho đội bấm trước (đội đầu tiên)
        const { isCorrect } = data;
        const state = getRound2State();
        
        if (!state.gameState.buzzerPresses || state.gameState.buzzerPresses.length === 0) {
          return NextResponse.json(
            { error: "Chưa có đội nào bấm chuông" },
            { status: 400 }
          );
        }
        
        // Lấy đội bấm trước (đội đầu tiên)
        const firstPress = state.gameState.buzzerPresses[0];
        const buzzerTeamId = firstPress.teamId;
        
        if (isCorrect === true) {
          // Tính điểm dựa trên số hình đã mở (revealed)
          // Đếm số hình có tileStatus === "revealed"
          const revealedCount = state.config?.questions.filter(
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
          const updatedTeams = state.teams.map((team) =>
            team.id === buzzerTeamId ? { ...team, score: team.score + points } : team
          );
          setRound2Teams(updatedTeams);
          
          // Kết thúc vòng
          setRound2GameState({
            status: "round_finished",
            guessedKeywordCorrect: true,
            buzzerPresses: [],
            buzzerTeamId: null,
            buzzerTeamName: null,
            buzzerTimestamp: null,
          });
        } else {
          // Sai: Khóa đội bấm trước
          const updatedTeams = state.teams.map((team) =>
            team.id === buzzerTeamId ? { ...team, isLocked: true } : team
          );
          setRound2Teams(updatedTeams);
          
          // Xóa đội bị khóa khỏi danh sách buzzer, đội tiếp theo sẽ trở thành đội bấm trước
          const remainingPresses = state.gameState.buzzerPresses.filter(
            (bp) => bp.teamId !== buzzerTeamId
          );
          
          if (remainingPresses.length > 0) {
            const nextPress = remainingPresses[0];
            setRound2GameState({
              buzzerPresses: remainingPresses,
              buzzerTeamId: nextPress.teamId,
              buzzerTeamName: nextPress.teamName,
              buzzerTimestamp: nextPress.timestamp,
            });
          } else {
            // Không còn đội nào, reset buzzer
            setRound2GameState({
              buzzerPresses: [],
              buzzerTeamId: null,
              buzzerTeamName: null,
              buzzerTimestamp: null,
            });
          }
        }
        
        return NextResponse.json({ success: true, state: getRound2State() });
      }

      case "markAnswer": {
        // MC đánh dấu đáp án đúng/sai
        const { teamId, isCorrect } = data;
        const state = getRound2State();

        const answerIndex = state.gameState.teamAnswers.findIndex(
          (ta) => ta.teamId === teamId
        );

        if (answerIndex < 0) {
          return NextResponse.json(
            { error: "Không tìm thấy đáp án của đội này" },
            { status: 400 }
          );
        }

        // Kiểm tra xem đã chấm điểm chưa (tránh cộng điểm nhiều lần)
        const currentAnswer = state.gameState.teamAnswers[answerIndex];
        const wasAlreadyMarked = currentAnswer.isCorrect !== null;

        const updatedAnswers = [...state.gameState.teamAnswers];
        updatedAnswers[answerIndex] = {
          ...updatedAnswers[answerIndex],
          isCorrect,
        };

        // Nếu đánh dấu đúng và chưa từng chấm điểm trước đó, tự động cộng điểm
        if (isCorrect === true && !wasAlreadyMarked) {
          const updatedTeams = state.teams.map((team) =>
            team.id === teamId ? { ...team, score: team.score + 10 } : team
          );
          setRound2Teams(updatedTeams);
        }

        setRound2GameState({ teamAnswers: updatedAnswers });

        const updatedState = getRound2State();
        const activeQuestionId = updatedState.gameState.activeQuestionId;

        // Kiểm tra xem tất cả đội đã được chấm chưa
        const totalTeams = updatedState.teams.length;
        const teamsWithAnswers = updatedState.gameState.teamAnswers.length;
        
        // Kiểm tra xem tất cả đội đã gửi đáp án đều đã được chấm
        const allSubmittedAnswersMarked = updatedState.gameState.teamAnswers.every(
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
          state.config &&
          (teamsWithAnswers >= 2 || teamsWithAnswers === totalTeams);
        
        if (shouldClose && state.config && activeQuestionId) {
          // Kiểm tra xem có đội nào trả lời đúng không
          const hasCorrectAnswer = updatedState.gameState.teamAnswers.some(
            (ta) => ta.isCorrect === true
          );

          if (hasCorrectAnswer) {
            // Có ít nhất 1 đáp án đúng → reveal tile (hiển thị hình ảnh)
            const updatedQuestions = state.config.questions.map((q) =>
              q.id === activeQuestionId ? { ...q, tileStatus: "revealed" as Round2TileStatus } : q
            );
            const updatedConfig = { ...state.config, questions: updatedQuestions };
            setRound2Config(updatedConfig);
            
            // Lưu config đã cập nhật vào database
            try {
              await connectDB();
              await Round2ConfigModel.deleteMany({});
              await Round2ConfigModel.create({
                imageOriginalUrl: updatedConfig.imageOriginalUrl,
                keywordAnswer: updatedConfig.keywordAnswer,
                keywordNormalized: updatedConfig.keywordNormalized,
                keywordLength: updatedConfig.keywordLength,
                questions: updatedQuestions,
              });
            } catch (error) {
              console.error("Error saving updated config to DB:", error);
            }
          } else {
            // Tất cả đều sai → đánh dấu wrong (giữ che)
            const updatedQuestions = state.config.questions.map((q) =>
              q.id === activeQuestionId ? { ...q, tileStatus: "wrong" as Round2TileStatus } : q
            );
            const updatedConfig = { ...state.config, questions: updatedQuestions };
            setRound2Config(updatedConfig);
            
            // Lưu config đã cập nhật vào database
            try {
              await connectDB();
              await Round2ConfigModel.deleteMany({});
              await Round2ConfigModel.create({
                imageOriginalUrl: updatedConfig.imageOriginalUrl,
                keywordAnswer: updatedConfig.keywordAnswer,
                keywordNormalized: updatedConfig.keywordNormalized,
                keywordLength: updatedConfig.keywordLength,
                questions: updatedQuestions,
              });
            } catch (error) {
              console.error("Error saving updated config to DB:", error);
            }
          }
          
          // Reset game state về idle sau khi đã xử lý xong
          setRound2GameState({
            status: "idle",
            activeQuestionId: null,
            lastAnswerInput: "",
            teamAnswers: [],
          });
        }
        
        return NextResponse.json({ success: true, state: getRound2State() });
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

