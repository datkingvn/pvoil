import { create } from "zustand";
import { persist } from "zustand/middleware";
import { GameState, RoundType, PlayerId, Question, LogEntry } from "./types";
import { questions } from "./questions";

interface GameStore extends GameState {
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
  buzz: (playerId: PlayerId) => void;
  answer: (playerId: PlayerId, optionIndex: number) => void;
  scoreAdd: (playerId: PlayerId, delta: number) => void;
  scoreSet: (playerId: PlayerId, value: number) => void;
  toggleSound: () => void;
  toggleAmbience: () => void;
  resetGame: () => void;
  addLogEntry: (message: string) => void;
  setSelectedPlayer: (playerId: PlayerId | null) => void;
}

const initialPlayers = [
  { id: "A" as PlayerId, name: "Thí sinh A", score: 0, status: "ready" as const },
  { id: "B" as PlayerId, name: "Thí sinh B", score: 0, status: "ready" as const },
  { id: "C" as PlayerId, name: "Thí sinh C", score: 0, status: "ready" as const },
  { id: "D" as PlayerId, name: "Thí sinh D", score: 0, status: "ready" as const },
];

const initialState: GameState = {
  currentRound: null,
  selectedQuestionId: null,
  currentQuestion: null,
  gameStatus: "waiting",
  timerSeconds: 0,
  timerRunning: false,
  timerInitial: 0,
  players: initialPlayers,
  selectedPlayerId: null,
  soundEnabled: true,
  ambienceEnabled: false,
  log: [],
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

      setRound: (round) => {
        set({ currentRound: round, selectedQuestionId: null, currentQuestion: null });
        broadcastState({ currentRound: round });
      },

      selectQuestion: (questionId) => {
        const state = get();
        const round = state.currentRound;
        if (!round) return;

        const question = questions[round].find((q) => q.id === questionId);
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
          players: state.players.map((p) => ({ ...p, status: "ready" as const })),
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
          players: get().players.map((p) => ({ ...p, status: "ready" as const })),
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
          set({ timerSeconds: state.timerSeconds - 1 });
          broadcastState({ timerSeconds: state.timerSeconds - 1 });
        } else if (state.timerSeconds === 0 && state.timerRunning) {
          set({ timerRunning: false });
          broadcastState({ timerRunning: false });
        }
      },

      buzz: (playerId) => {
        const state = get();
        if (state.gameStatus !== "question-open") return;
        if (state.players.find((p) => p.id === playerId)?.status !== "ready") return;

        set({
          players: state.players.map((p) =>
            p.id === playerId ? { ...p, status: "buzzed" as const } : p
          ),
        });
        get().addLogEntry(`Thí sinh ${playerId} bấm chuông`);
        broadcastState({
          players: state.players.map((p) =>
            p.id === playerId ? { ...p, status: "buzzed" as const } : p
          ),
        });
      },

      answer: (playerId, optionIndex) => {
        const state = get();
        const player = state.players.find((p) => p.id === playerId);
        if (!player || player.status !== "buzzed") return;

        const isCorrect = state.currentQuestion?.correctIndex === optionIndex;
        set({
          players: state.players.map((p) =>
            p.id === playerId ? { ...p, status: "answered" as const } : p
          ),
        });

        if (isCorrect && state.currentQuestion) {
          get().scoreAdd(playerId, state.currentQuestion.points);
          get().addLogEntry(`Thí sinh ${playerId} trả lời đúng +${state.currentQuestion.points}`);
          
          // Trigger flash and confetti
          if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("flash", { detail: "correct" }));
            window.dispatchEvent(new CustomEvent("confetti"));
          }
        } else {
          get().addLogEntry(`Thí sinh ${playerId} trả lời sai`);
          
          // Trigger wrong flash
          if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("flash", { detail: "wrong" }));
          }
        }

        broadcastState({
          players: state.players.map((p) =>
            p.id === playerId ? { ...p, status: "answered" as const } : p
          ),
        });
      },

      scoreAdd: (playerId, delta) => {
        const state = get();
        set({
          players: state.players.map((p) =>
            p.id === playerId ? { ...p, score: p.score + delta } : p
          ),
        });
        broadcastState({
          players: state.players.map((p) =>
            p.id === playerId ? { ...p, score: p.score + delta } : p
          ),
        });
      },

      scoreSet: (playerId, value) => {
        const state = get();
        set({
          players: state.players.map((p) =>
            p.id === playerId ? { ...p, score: value } : p
          ),
        });
        get().addLogEntry(`Thí sinh ${playerId}: ${value} điểm`);
        broadcastState({
          players: state.players.map((p) =>
            p.id === playerId ? { ...p, score: value } : p
          ),
        });
      },

      toggleSound: () => {
        set((state) => ({ soundEnabled: !state.soundEnabled }));
      },

      toggleAmbience: () => {
        set((state) => ({ ambienceEnabled: !state.ambienceEnabled }));
      },

      resetGame: () => {
        set({
          ...initialState,
          players: initialPlayers,
        });
        get().addLogEntry("Khởi động lại game");
        broadcastState(initialState);
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

      setSelectedPlayer: (playerId) => {
        set({ selectedPlayerId: playerId });
      },
    }),
    {
      name: "game-storage",
    }
  )
);


