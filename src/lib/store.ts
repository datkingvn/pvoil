import { create } from "zustand";
import { persist } from "zustand/middleware";
import { GameState, RoundType, Question, LogEntry, TeamScore } from "./types";

interface GameStore extends GameState {
  // Questions from database
  questions: Record<RoundType, Question[]>;
  khoiDongPackages: Question[][]; // 4 packages for khoi-dong
  
  // Actions
  setRound: (round: RoundType | null) => void;
  selectQuestion: (questionId: string) => void;
  openQuestion: () => void;
  lockBuzz: () => void;
  revealAnswer: () => void;
  nextQuestion: () => void;
  timerStart: () => void;
  timerPause: () => void;
  timerReset: () => void;
  timerTick: () => void;
  scoreAdd: (teamId: string, delta: number) => void;
  scoreSet: (teamId: string, value: number) => void;
  toggleSound: () => void;
  toggleAmbience: () => void;
  resetGame: () => void;
  addLogEntry: (message: string) => void;
  setSelectedTeam: (teamId: string | null) => void;
  loadTeams: () => Promise<void>;
  loadQuestions: (round: RoundType) => Promise<void>;
  // Khởi động actions
  setKhoiDongTeam: (teamId: string | null) => void;
  selectKhoiDongPackage: (packageNumber: number) => void;
  startKhoiDong: () => void;
  markKhoiDongAnswer: (isCorrect: boolean) => void;
}

const initialState: GameState = {
  currentRound: null,
  selectedQuestionId: null,
  currentQuestion: null,
  gameStatus: "waiting",
  timerSeconds: 0,
  timerRunning: false,
  timerInitial: 0,
  teams: [],
  selectedTeamId: null,
  khoiDongActiveTeamId: null,
  khoiDongQuestionIndex: 0,
  khoiDongAnsweredCount: 0,
  khoiDongStarted: false,
  khoiDongSelectedPackage: null,
  khoiDongTeamPackages: {},
  soundEnabled: true,
  ambienceEnabled: false,
  log: [],
};

const initialQuestions: Record<RoundType, Question[]> = {
  "khoi-dong": [],
  "vuot-chuong-ngai-vat": [],
  "tang-toc": [],
  "ve-dich": [],
};

// BroadcastChannel for cross-tab sync
let broadcastChannel: BroadcastChannel | null = null;
if (typeof window !== "undefined") {
  try {
    broadcastChannel = new BroadcastChannel("game-sync");
  } catch (e) {
    console.warn("BroadcastChannel not supported");
  }
}

const broadcastState = (state: Partial<GameState>) => {
  if (broadcastChannel) {
    try {
      // BroadcastChannel uses structured clone algorithm, so it handles serialization automatically
      broadcastChannel.postMessage({ type: "state-update", state });
    } catch (e) {
      console.warn("Failed to broadcast state", e);
    }
  }
};

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      ...initialState,
      questions: initialQuestions,
      khoiDongPackages: [[], [], [], []],

      loadTeams: async () => {
        try {
          const res = await fetch("/api/teams");
          const data = await res.json();
          if (res.ok && data.teams) {
            const teamsWithScore: TeamScore[] = data.teams.map((team: any) => ({
              teamId: team.id,
              teamName: team.teamName,
              score: 0,
            }));
            set({ teams: teamsWithScore });
            broadcastState({ teams: teamsWithScore });
          }
        } catch (error) {
          console.error("Error loading teams:", error);
        }
      },

      loadQuestions: async (round: RoundType) => {
        try {
          if (round === "khoi-dong") {
            // Load all packages for khoi-dong
            const res = await fetch("/api/questions?round=khoi-dong");
            const data = await res.json();
            if (res.ok && data.packages) {
              const packages: Question[][] = [
                (data.packages[1] || []).map((q: any) => ({
                  id: q.id,
                  text: q.text,
                  points: q.points,
                  timeLimitSec: q.timeLimitSec,
                  round: q.round,
                  isOpenEnded: q.isOpenEnded,
                })),
                (data.packages[2] || []).map((q: any) => ({
                  id: q.id,
                  text: q.text,
                  points: q.points,
                  timeLimitSec: q.timeLimitSec,
                  round: q.round,
                  isOpenEnded: q.isOpenEnded,
                })),
                (data.packages[3] || []).map((q: any) => ({
                  id: q.id,
                  text: q.text,
                  points: q.points,
                  timeLimitSec: q.timeLimitSec,
                  round: q.round,
                  isOpenEnded: q.isOpenEnded,
                })),
                (data.packages[4] || []).map((q: any) => ({
                  id: q.id,
                  text: q.text,
                  points: q.points,
                  timeLimitSec: q.timeLimitSec,
                  round: q.round,
                  isOpenEnded: q.isOpenEnded,
                })),
              ];
              set({ khoiDongPackages: packages });
              // Note: khoiDongPackages is not part of GameState, so we don't broadcast it
              // Each tab should load questions independently when needed
            }
          } else {
            // Load questions for other rounds
            const res = await fetch(`/api/questions?round=${round}`);
            const data = await res.json();
            if (res.ok && data.questions) {
              const mappedQuestions: Question[] = data.questions.map((q: any) => ({
                id: q.id,
                text: q.text,
                options: q.options,
                correctIndex: q.correctIndex,
                points: q.points,
                timeLimitSec: q.timeLimitSec,
                round: q.round,
                isOpenEnded: q.isOpenEnded,
              }));
              const updatedQuestions = { ...get().questions, [round]: mappedQuestions };
              set({ questions: updatedQuestions });
              // Questions are loaded per tab; no need to broadcast them via BroadcastChannel
            }
          }
        } catch (error) {
          console.error("Error loading questions:", error);
        }
      },

      setRound: (round) => {
        set({
          currentRound: round,
          selectedQuestionId: null,
          currentQuestion: null,
          khoiDongActiveTeamId: null,
          khoiDongQuestionIndex: 0,
          khoiDongAnsweredCount: 0,
          khoiDongStarted: false,
          khoiDongSelectedPackage: null,
          khoiDongTeamPackages: round === "khoi-dong" ? get().khoiDongTeamPackages : {},
        });
        broadcastState({
          currentRound: round,
          khoiDongActiveTeamId: null,
          khoiDongQuestionIndex: 0,
          khoiDongAnsweredCount: 0,
          khoiDongStarted: false,
          khoiDongSelectedPackage: null,
        });
      },

      selectQuestion: (questionId) => {
        const state = get();
        const round = state.currentRound;
        if (!round) return;

        let question: Question | undefined;
        
        if (round === "khoi-dong") {
          // For khoi-dong, questions are in packages
          // This is handled in startKhoiDong, so we don't need to handle it here
          return;
        } else {
          question = state.questions[round]?.find((q) => q.id === questionId);
        }

        if (question) {
          set({
            selectedQuestionId: questionId,
            currentQuestion: question,
            timerInitial: question.timeLimitSec,
            timerSeconds: question.timeLimitSec,
          });
          broadcastState({ selectedQuestionId: questionId, currentQuestion: question });
        }
      },

      openQuestion: () => {
        const state = get();
        if (!state.currentQuestion) return;

        set({
          gameStatus: "question-open",
          timerRunning: true,
          timerSeconds: state.currentQuestion.timeLimitSec,
        });
        get().addLogEntry(`Mở câu hỏi: ${state.currentQuestion.text.substring(0, 30)}...`);
        broadcastState({ gameStatus: "question-open", timerRunning: true });
      },

      lockBuzz: () => {
        set({ gameStatus: "buzz-locked" });
        broadcastState({ gameStatus: "buzz-locked" });
      },

      revealAnswer: () => {
        set({ gameStatus: "answer-revealed" });
        get().addLogEntry("Hiển thị đáp án");
        broadcastState({ gameStatus: "answer-revealed" });
      },

      nextQuestion: () => {
        set({
          gameStatus: "waiting",
          selectedQuestionId: null,
          currentQuestion: null,
          timerRunning: false,
          timerSeconds: 0,
        });
        broadcastState({
          gameStatus: "waiting",
          selectedQuestionId: null,
          currentQuestion: null,
          timerRunning: false,
        });
      },

      timerStart: () => {
        set({ timerRunning: true });
        broadcastState({ timerRunning: true });
      },

      timerPause: () => {
        set({ timerRunning: false });
        broadcastState({ timerRunning: false });
      },

      timerReset: () => {
        const state = get();
        set({ timerSeconds: state.timerInitial, timerRunning: false });
        broadcastState({ timerSeconds: state.timerInitial, timerRunning: false });
      },

      timerTick: () => {
        const state = get();
        if (state.timerRunning && state.timerSeconds > 0) {
          const newSeconds = state.timerSeconds - 1;
          set({ timerSeconds: newSeconds });
          broadcastState({ timerSeconds: newSeconds });
          
          // Nếu hết thời gian trong vòng khởi động, kết thúc vòng thi
          if (newSeconds === 0 && state.currentRound === "khoi-dong" && state.khoiDongStarted && state.khoiDongActiveTeamId) {
            const team = state.teams.find((t) => t.teamId === state.khoiDongActiveTeamId);
            set({
              timerRunning: false,
              khoiDongStarted: false,
              gameStatus: "answer-revealed",
              currentQuestion: null,
            });
            get().addLogEntry(`Kết thúc vòng Khởi động - ${team?.teamName || "Đội thi"} - Hết thời gian (${state.khoiDongAnsweredCount}/12 câu)`);
            broadcastState({
              timerRunning: false,
              khoiDongStarted: false,
              gameStatus: "answer-revealed",
              currentQuestion: null,
            });
          }
        } else if (state.timerSeconds === 0 && state.timerRunning) {
          set({ timerRunning: false });
          broadcastState({ timerRunning: false });
        }
      },

      scoreAdd: (teamId, delta) => {
        const state = get();
        const updatedTeams = state.teams.map((team) =>
          team.teamId === teamId ? { ...team, score: team.score + delta } : team
        );
        set({ teams: updatedTeams });
        const team = updatedTeams.find((t) => t.teamId === teamId);
        if (team) {
          get().addLogEntry(`${team.teamName}: ${delta > 0 ? "+" : ""}${delta} điểm`);
        }
        broadcastState({ teams: updatedTeams });
      },

      scoreSet: (teamId, value) => {
        const state = get();
        const updatedTeams = state.teams.map((team) =>
          team.teamId === teamId ? { ...team, score: value } : team
        );
        set({ teams: updatedTeams });
        const team = updatedTeams.find((t) => t.teamId === teamId);
        if (team) {
          get().addLogEntry(`${team.teamName}: ${value} điểm`);
        }
        broadcastState({ teams: updatedTeams });
      },

      toggleSound: () => {
        set((state) => ({ soundEnabled: !state.soundEnabled }));
      },

      toggleAmbience: () => {
        set((state) => ({ ambienceEnabled: !state.ambienceEnabled }));
      },

      resetGame: () => {
        const state = get();
        set({
          ...initialState,
          teams: state.teams.map((team) => ({ ...team, score: 0 })),
        });
        get().addLogEntry("Khởi động lại game");
        broadcastState({
          ...initialState,
          teams: state.teams.map((team) => ({ ...team, score: 0 })),
        });
      },

      addLogEntry: (message) => {
        const entry: LogEntry = {
          id: Date.now().toString(),
          timestamp: Date.now(),
          message,
        };
        set((state) => ({
          log: [...state.log, entry].slice(-50), // Keep last 50 entries
        }));
      },

      setSelectedTeam: (teamId) => {
        set({ selectedTeamId: teamId });
      },

      // Khởi động actions
      setKhoiDongTeam: (teamId) => {
        set({ 
          khoiDongActiveTeamId: teamId,
          khoiDongStarted: false,
          khoiDongSelectedPackage: null,
        });
        broadcastState({ 
          khoiDongActiveTeamId: teamId,
          khoiDongStarted: false,
          khoiDongSelectedPackage: null,
        });
      },

      selectKhoiDongPackage: (packageNumber) => {
        const state = get();
        if (state.currentRound !== "khoi-dong" || !state.khoiDongActiveTeamId) return;
        
        // Kiểm tra gói đã được chọn bởi đội khác chưa
        const packageTakenBy = Object.entries(state.khoiDongTeamPackages).find(
          ([teamId, pkg]) => pkg === packageNumber && teamId !== state.khoiDongActiveTeamId
        );
        if (packageTakenBy) return; // Gói đã được chọn bởi đội khác

        // Lưu gói cho đội này
        const updatedTeamPackages = {
          ...state.khoiDongTeamPackages,
          [state.khoiDongActiveTeamId]: packageNumber,
        };
        
        set({ 
          khoiDongSelectedPackage: packageNumber,
          khoiDongTeamPackages: updatedTeamPackages,
        });
        broadcastState({ 
          khoiDongSelectedPackage: packageNumber,
          khoiDongTeamPackages: updatedTeamPackages,
        });
      },

      startKhoiDong: () => {
        const state = get();
        if (state.currentRound !== "khoi-dong" || !state.khoiDongActiveTeamId || !state.khoiDongSelectedPackage) return;

        const packageIndex = state.khoiDongSelectedPackage - 1; // packageNumber là 1-4, index là 0-3
        const packageQuestions = state.khoiDongPackages[packageIndex];
        if (!packageQuestions || packageQuestions.length === 0) {
          console.warn(`Không có câu hỏi trong gói ${state.khoiDongSelectedPackage}`);
          return;
        }

        const firstQuestion = packageQuestions[0];
        const team = state.teams.find((t) => t.teamId === state.khoiDongActiveTeamId);
        set({
          khoiDongStarted: true,
          khoiDongQuestionIndex: 0,
          khoiDongAnsweredCount: 0,
          selectedQuestionId: firstQuestion.id,
          currentQuestion: firstQuestion,
          gameStatus: "question-open",
          timerSeconds: 60,
          timerInitial: 60,
          timerRunning: true,
        });
        get().addLogEntry(`Bắt đầu vòng Khởi động - ${team?.teamName || "Đội thi"} - Gói ${state.khoiDongSelectedPackage}`);
        broadcastState({
          khoiDongStarted: true,
          khoiDongQuestionIndex: 0,
          khoiDongAnsweredCount: 0,
          selectedQuestionId: firstQuestion.id,
          currentQuestion: firstQuestion,
          gameStatus: "question-open",
          timerSeconds: 60,
          timerInitial: 60,
          timerRunning: true,
        });
      },

      markKhoiDongAnswer: (isCorrect) => {
        const state = get();
        if (state.currentRound !== "khoi-dong" || !state.khoiDongStarted || !state.khoiDongActiveTeamId || !state.khoiDongSelectedPackage) return;
        if (state.khoiDongAnsweredCount >= 12) return; // Tối đa 12 câu

        const packageIndex = state.khoiDongSelectedPackage - 1;
        const packageQuestions = state.khoiDongPackages[packageIndex];
        if (!packageQuestions) return;

        const team = state.teams.find((t) => t.teamId === state.khoiDongActiveTeamId);

        if (isCorrect) {
          // Trả lời đúng: +10 điểm, tự động chuyển câu tiếp
          get().scoreAdd(state.khoiDongActiveTeamId, 10);
          get().addLogEntry(`${team?.teamName || "Đội thi"} trả lời đúng +10 điểm`);

          // Trigger flash and confetti
          if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("flash", { detail: "correct" }));
            window.dispatchEvent(new CustomEvent("confetti"));
          }

          const newAnsweredCount = state.khoiDongAnsweredCount + 1;
          const nextIndex = state.khoiDongQuestionIndex + 1;

          // Nếu đã trả lời đủ 12 câu, kết thúc vòng thi
          if (newAnsweredCount >= 12) {
            set({
              khoiDongAnsweredCount: 12,
              gameStatus: "answer-revealed",
              khoiDongStarted: false,
              currentQuestion: null,
              timerRunning: false,
            });
            get().addLogEntry(`Kết thúc vòng Khởi động - ${team?.teamName || "Đội thi"} - Gói ${state.khoiDongSelectedPackage} (12/12 câu)`);
            broadcastState({
              khoiDongAnsweredCount: 12,
              gameStatus: "answer-revealed",
              khoiDongStarted: false,
              currentQuestion: null,
              timerRunning: false,
            });
            return;
          }

          // Chuyển câu hỏi tiếp theo
          const nextQuestion = packageQuestions[nextIndex];
          if (!nextQuestion) return;
          
          set({
            khoiDongQuestionIndex: nextIndex,
            khoiDongAnsweredCount: newAnsweredCount,
            selectedQuestionId: nextQuestion.id,
            currentQuestion: nextQuestion,
            gameStatus: "question-open",
          });
          broadcastState({
            khoiDongQuestionIndex: nextIndex,
            khoiDongAnsweredCount: newAnsweredCount,
            selectedQuestionId: nextQuestion.id,
            currentQuestion: nextQuestion,
            gameStatus: "question-open",
          });
        } else {
          // Trả lời sai: không mất điểm, nhưng vẫn chuyển câu tiếp theo
          get().addLogEntry(`${team?.teamName || "Đội thi"} trả lời sai (không mất điểm)`);

          // Trigger wrong flash
          if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("flash", { detail: "wrong" }));
          }

          const newAnsweredCount = state.khoiDongAnsweredCount + 1;
          const nextIndex = state.khoiDongQuestionIndex + 1;

          // Nếu đã trả lời đủ 12 câu, kết thúc vòng thi
          if (newAnsweredCount >= 12) {
            set({
              khoiDongAnsweredCount: 12,
              gameStatus: "answer-revealed",
              khoiDongStarted: false,
              currentQuestion: null,
              timerRunning: false,
            });
            get().addLogEntry(`Kết thúc vòng Khởi động - ${team?.teamName || "Đội thi"} - Gói ${state.khoiDongSelectedPackage} (12/12 câu)`);
            broadcastState({
              khoiDongAnsweredCount: 12,
              gameStatus: "answer-revealed",
              khoiDongStarted: false,
              currentQuestion: null,
              timerRunning: false,
            });
            return;
          }

          // Chuyển câu hỏi tiếp theo
          const nextQuestion = packageQuestions[nextIndex];
          if (!nextQuestion) return;
          
          set({
            khoiDongQuestionIndex: nextIndex,
            khoiDongAnsweredCount: newAnsweredCount,
            selectedQuestionId: nextQuestion.id,
            currentQuestion: nextQuestion,
            gameStatus: "question-open",
          });
          broadcastState({
            khoiDongQuestionIndex: nextIndex,
            khoiDongAnsweredCount: newAnsweredCount,
            selectedQuestionId: nextQuestion.id,
            currentQuestion: nextQuestion,
            gameStatus: "question-open",
          });
        }
      },
    }),
    {
      name: "game-storage",
      partialize: (state) => ({
        // Don't persist questions and packages, they will be loaded from API
        currentRound: state.currentRound,
        selectedQuestionId: state.selectedQuestionId,
        currentQuestion: state.currentQuestion,
        gameStatus: state.gameStatus,
        timerSeconds: state.timerSeconds,
        timerRunning: state.timerRunning,
        timerInitial: state.timerInitial,
        teams: state.teams,
        selectedTeamId: state.selectedTeamId,
        khoiDongActiveTeamId: state.khoiDongActiveTeamId,
        khoiDongQuestionIndex: state.khoiDongQuestionIndex,
        khoiDongAnsweredCount: state.khoiDongAnsweredCount,
        khoiDongStarted: state.khoiDongStarted,
        khoiDongSelectedPackage: state.khoiDongSelectedPackage,
        khoiDongTeamPackages: state.khoiDongTeamPackages,
        soundEnabled: state.soundEnabled,
        ambienceEnabled: state.ambienceEnabled,
        log: state.log,
      }),
    }
  )
);
