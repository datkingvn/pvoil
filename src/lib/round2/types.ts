export type Round2TileStatus = "hidden" | "selected" | "revealed" | "wrong";

export interface Round2Question {
  id: 1 | 2 | 3 | 4;
  questionText: string;
  answerText: string;
  answerWordCount: number;
  tileStatus: Round2TileStatus;
}

export interface Round2Config {
  imageOriginalUrl: string;
  keywordAnswer: string;
  keywordNormalized: string;
  keywordLength: number;
  questions: Round2Question[];
}

export interface Round2Team {
  id: number;
  name: string;
  score: number;
}

export type Round2GameStatus =
  | "idle"
  | "tile_selected"
  | "question_open"
  | "waiting_confirmation"
  | "answered_correct"
  | "answered_wrong"
  | "round_finished";

export interface Round2GameState {
  status: Round2GameStatus;
  activeTeamId: number | null;
  activeQuestionId: 1 | 2 | 3 | 4 | null;
  timeLeft: number; // 0-15
  lastAnswerInput: string;
  guessedKeywordCorrect: boolean;
}

export interface Round2State {
  config: Round2Config | null;
  gameState: Round2GameState;
  teams: Round2Team[];
}

