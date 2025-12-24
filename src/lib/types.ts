export type RoundType = "khoi-dong" | "vuot-chuong-ngai-vat" | "tang-toc" | "ve-dich";

export type GameStatus = "waiting" | "question-open" | "buzz-locked" | "answer-revealed";

export interface Option {
  label: string;
  text: string;
}

export interface Question {
  id: string;
  text: string;
  options?: Option[]; // Optional - không có options cho câu hỏi hỏi đáp
  correctIndex?: number; // Optional - không cần cho câu hỏi hỏi đáp
  points: number;
  timeLimitSec: number;
  round: RoundType;
  isOpenEnded?: boolean; // true cho câu hỏi hỏi đáp
}

export interface TeamScore {
  teamId: string;
  teamName: string;
  score: number;
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
  
  // Teams (đội thi với điểm số)
  teams: TeamScore[];
  selectedTeamId: string | null;
  
  // Khởi động round specific
  khoiDongActiveTeamId: string | null;
  khoiDongQuestionIndex: number;
  khoiDongAnsweredCount: number;
  khoiDongStarted: boolean;
  khoiDongSelectedPackage: number | null; // 1, 2, 3, hoặc 4
  khoiDongTeamPackages: Record<string, number>; // Lưu đội nào đã chọn gói nào (teamId -> packageNumber)
  
  // Settings
  soundEnabled: boolean;
  ambienceEnabled: boolean;
  
  // Log
  log: LogEntry[];
}

