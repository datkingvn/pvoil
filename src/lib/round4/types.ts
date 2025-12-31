// Round 4: Chinh phục đỉnh cao

export type Round4PackageType = 40 | 60 | 80;

export interface Round4Question {
  id: string;
  questionText: string;
  answerText: string; // Đáp án chính xác
  points: 10 | 20 | 30; // Điểm của câu hỏi
  timeLimitSec: number; // 10, 15, 20, hoặc 30 giây
  order: number; // Thứ tự trong gói (1, 2, 3)
}

export interface Round4Package {
  type: Round4PackageType; // 40, 60, hoặc 80
  questions: Round4Question[]; // 3 câu hỏi
  selectedByTeamId: number | null; // Đội nào đã chọn gói này
}

export interface Round4Config {
  packages: Round4Package[]; // 3 gói: 40, 60, 80
}

export interface Round4Team {
  id: number;
  name: string;
  score: number;
  hasUsedHopeStar: boolean; // Đã dùng ngôi sao hy vọng chưa
  selectedPackage: Round4PackageType | null; // Gói đã chọn
  packageOrder: number | null; // Thứ tự chọn gói (1-4)
}

export type Round4GameStatus =
  | "idle" // Chưa bắt đầu
  | "team_selection" // MC đang chọn đội thi
  | "package_selection_by_mc" // MC đang chọn gói cho đội đã chọn
  | "question_preparing" // Đang chuẩn bị câu hỏi (cho phép đặt ngôi sao)
  | "question_open" // Câu hỏi đang mở
  | "waiting_mc_judgment" // Chờ MC đánh giá đáp án (đúng/sai/không trả lời)
  | "buzzer_window" // Cửa sổ 5 giây cho các đội khác bấm chuông (cướp điểm)
  | "waiting_answer" // Chờ đội trả lời
  | "answer_revealed" // Đã hiển thị đáp án
  | "round_finished"; // Kết thúc vòng

export interface Round4TeamAnswer {
  teamId: number;
  teamName: string;
  answer: string;
  isCorrect: boolean | null; // null = chưa chấm, true = đúng, false = sai
  submittedAt: number; // timestamp
  isMainTeam: boolean; // true = đội chính, false = đội giành quyền
  isHopeStar: boolean; // Có dùng ngôi sao hy vọng không
  pointsAwarded: number; // Điểm được trao (có thể âm nếu sai)
  isFinalAnswer: boolean; // true = đáp án cuối cùng (đội chính), false = đáp án đầu tiên (đội giành quyền)
}

export interface Round4BuzzerPress {
  teamId: number;
  teamName: string;
  timestamp: number;
}

export interface Round4GameState {
  status: Round4GameStatus;
  currentPackageType: Round4PackageType | null; // Gói đang chơi
  currentQuestionId: string | null; // Câu hỏi hiện tại
  currentMainTeamId: number | null; // Đội chính đang trả lời
  timeLeft: number; // Thời gian còn lại
  questionStartTime: number | null; // Timestamp khi câu hỏi bắt đầu
  questionInitialTime: number | null; // Thời gian ban đầu
  buzzerWindowStartTime: number | null; // Timestamp khi bắt đầu cửa sổ bấm chuông
  buzzerWindowTimeLeft: number; // Thời gian còn lại cho cửa sổ bấm chuông (5 giây)
  buzzerPresses: Round4BuzzerPress[]; // Danh sách đội bấm chuông
  teamAnswers: Round4TeamAnswer[]; // Đáp án của các đội
  hopeStarTeams: number[]; // Danh sách teamId đã đặt ngôi sao hy vọng cho câu hỏi này
  currentQuestionIndex: number; // 0, 1, 2 (thứ tự câu hỏi trong gói)
  currentPackageIndex: number; // 0, 1, 2, 3 (thứ tự gói đang chơi)
}

export interface Round4QuestionBankItem {
  id: string;
  questionText: string;
  answerText: string;
  points: 10 | 20 | 30;
  timeLimitSec: number;
  isUsed: boolean; // Đã được sử dụng chưa
  usedByPackageType?: 40 | 60 | 80 | null; // Gói nào đã dùng
  usedByTeamId?: number | null; // Đội nào đã dùng
}

export interface Round4QuestionBank {
  questions10: Round4QuestionBankItem[]; // Ngân hàng câu hỏi 10 điểm
  questions20: Round4QuestionBankItem[]; // Ngân hàng câu hỏi 20 điểm
  questions30: Round4QuestionBankItem[]; // Ngân hàng câu hỏi 30 điểm
}

export interface Round4State {
  config: Round4Config | null;
  gameState: Round4GameState;
  teams: Round4Team[];
  questionBank: Round4QuestionBank | null; // Ngân hàng câu hỏi
}

