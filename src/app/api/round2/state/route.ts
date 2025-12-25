import { NextRequest, NextResponse } from "next/server";
import {
  getRound2State,
  setRound2State,
  setRound2Config,
  setRound2GameState,
  setRound2Teams,
  resetRound2GameState,
} from "@/lib/round2/store";
import { Round2Config, Round2GameState, Round2Team } from "@/lib/round2/types";
import { normalizeKeyword, countKeywordLetters, countAnswerWords } from "@/lib/round2/helpers";
import connectDB from "@/lib/mongodb";
import Team from "@/models/Team";

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
    }));
  } catch (error) {
    console.error("Error loading teams:", error);
  }
  return [];
}

// GET: Lấy state hiện tại
export async function GET() {
  try {
    const state = getRound2State();
    
    // Nếu chưa có teams, load từ DB
    if (state.teams.length === 0) {
      const teams = await loadTeamsFromDB();
      if (teams.length > 0) {
        setRound2Teams(teams);
        const updatedState = getRound2State();
        return NextResponse.json(updatedState);
      }
    }
    
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
        const config = data as Round2Config;
        const currentState = getRound2State();
        // Nếu đang có activeQuestionId, giữ nguyên game state (đang trong quá trình chơi)
        // Nếu không có activeQuestionId, reset game state (config mới)
        if (!currentState.gameState.activeQuestionId) {
          resetRound2GameState();
        }
        setRound2Config(config);
        return NextResponse.json({ success: true, state: getRound2State() });
      }

      case "setGameState": {
        const gameState = data as Partial<Round2GameState>;
        setRound2GameState(gameState);
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

