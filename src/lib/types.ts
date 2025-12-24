export type RoundType = "khoi-dong" | "vuot-chuong-ngai-vat" | "tang-toc" | "ve-dich";

export type PlayerId = "A" | "B" | "C" | "D";

export type GameStatus = "waiting" | "question-open" | "buzz-locked" | "answer-revealed";

export interface Option {
  label: string;
  text: string;
}

export interface Question {
  id: string;
  text: string;
  options: Option[];
  correctIndex: number;
  points: number;
  timeLimitSec: number;
  round: RoundType;
}

export interface Player {
  id: PlayerId;
  name: string;
  score: number;
  status: "ready" | "buzzed" | "answered" | "locked";
}

export interface LogEntry {
  id: string;
  timestamp: number;
  message: string;
}

export interface GameState {
  // Round & Question
  currentRound: RoundType | null;
  selectedQuestionId: string | null;
  currentQuestion: Question | null;
  gameStatus: GameStatus;
  
  // Timer
  timerSeconds: number;
  timerRunning: boolean;
  timerInitial: number;
  
  // Players
  players: Player[];
  selectedPlayerId: PlayerId | null;
  
  // Settings
  soundEnabled: boolean;
  ambienceEnabled: boolean;
  
  // Log
  log: LogEntry[];
}

