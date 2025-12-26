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
  isLocked: boolean; // Đội bị khóa (trả lời từ khóa sai)
}

export type Round2GameStatus =
  | "idle"
  | "tile_selected"
  | "question_open"
  | "waiting_confirmation"
  | "answered_correct"
  | "answered_wrong"
  | "round_finished";

export interface Round2TeamAnswer {
  teamId: number;
  teamName: string; // Lưu tên đội để hiển thị đúng, không phụ thuộc vào teamId
  answer: string;
  isCorrect: boolean | null; // null = chưa chấm, true = đúng, false = sai
  submittedAt: number; // timestamp
}

export interface Round2BuzzerPress {
  teamId: number;
  teamName: string;
  timestamp: number;
}

export interface Round2GameState {
  status: Round2GameStatus;
  activeTeamId: number | null;
  activeQuestionId: 1 | 2 | 3 | 4 | null;
  timeLeft: number; // 0-15 (initial time, calculated from questionStartTime on GET)
  lastAnswerInput: string; // Giữ lại để backward compatibility
  teamAnswers: Round2TeamAnswer[]; // Đáp án của các đội cho câu hỏi hiện tại
  guessedKeywordCorrect: boolean;
  // Buzzer state - Lưu danh sách các đội đã bấm chuông theo thứ tự
  buzzerPresses: Round2BuzzerPress[]; // Danh sách các đội đã bấm chuông
  // Backward compatibility - Đội bấm đầu tiên
  buzzerTeamId: number | null; // Đội nào bấm chuông trước (đội đầu tiên)
  buzzerTeamName: string | null; // Tên đội bấm chuông trước
  buzzerTimestamp: number | null; // Thời điểm bấm chuông trước
  questionStartTime: number | null; // Timestamp khi câu hỏi bắt đầu (status = "question_open")
  questionInitialTime: number | null; // Thời gian ban đầu khi bắt đầu câu hỏi (thường là 15)
}

export interface Round2State {
  config: Round2Config | null;
  gameState: Round2GameState;
  teams: Round2Team[];
}

