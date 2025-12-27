export type Round3QuestionType = "suy-luan" | "doan-bang" | "sap-xep";

export interface Round3QuestionStep {
  label: string; // A, B, C, D
  text: string; // Nội dung bước
}

export interface Round3Question {
  id: 1 | 2 | 3 | 4;
  questionText: string;
  answerText: string; // Đáp án chính xác (ví dụ: "ACDB" cho câu hỏi sắp xếp)
  questionType: Round3QuestionType; // Loại câu hỏi
  order: number; // Thứ tự câu hỏi (1-4)
  videoUrl?: string; // URL video (chỉ dùng cho câu hỏi đoạn băng)
  steps?: Round3QuestionStep[]; // Các bước cho câu hỏi sắp xếp (A, B, C, D)
}

export interface Round3Config {
  questions: Round3Question[];
}

export interface Round3Team {
  id: number;
  name: string;
  score: number;
}

export type Round3GameStatus =
  | "idle"
  | "question_open"
  | "question_closed"
  | "round_finished";

export interface Round3TeamAnswer {
  teamId: number;
  teamName: string;
  answer: string;
  isCorrect: boolean | null; // null = chưa chấm, true = đúng, false = sai
  submittedAt: number; // timestamp - dùng để xếp hạng tốc độ
  pointsAwarded: number; // Điểm được trao (40, 30, 20, 10, hoặc 0)
}

export interface Round3GameState {
  status: Round3GameStatus;
  activeQuestionId: 1 | 2 | 3 | 4 | null;
  timeLeft: number; // 0-30 (initial time, calculated from questionStartTime on GET)
  teamAnswers: Round3TeamAnswer[]; // Đáp án của các đội cho câu hỏi hiện tại
  questionStartTime: number | null; // Timestamp khi câu hỏi bắt đầu (status = "question_open")
  questionInitialTime: number | null; // Thời gian ban đầu khi bắt đầu câu hỏi (30 giây)
  currentQuestionIndex: number; // 0-3 (câu hỏi hiện tại)
}

export interface Round3State {
  config: Round3Config | null;
  gameState: Round3GameState;
  teams: Round3Team[];
}

