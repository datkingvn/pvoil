import { Round2State, Round2Config, Round2GameState, Round2Team } from "./types";

// In-memory store cho round2 state
let round2State: Round2State = {
  config: null,
  gameState: {
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
  },
  teams: [],
};

export function getRound2State(): Round2State {
  return round2State;
}

export function setRound2State(state: Partial<Round2State>): Round2State {
  round2State = { ...round2State, ...state };
  return round2State;
}

export function setRound2Config(config: Round2Config | null): void {
  round2State.config = config;
}

export function setRound2GameState(gameState: Partial<Round2GameState>): void {
  round2State.gameState = { ...round2State.gameState, ...gameState };
}

export function setRound2Teams(teams: Round2Team[]): void {
  round2State.teams = teams;
}

export function resetRound2GameState(): void {
  round2State.gameState = {
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
}

