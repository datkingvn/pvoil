"use client";

import { useState } from "react";

interface QuestionPanelProps {
  questionText: string | null;
  timeLeft: number;
  onSubmitAnswer: (answer: string) => void;
  disabled?: boolean;
}

export function QuestionPanel({
  questionText,
  timeLeft,
  onSubmitAnswer,
  disabled = false,
}: QuestionPanelProps) {
  const [answerInput, setAnswerInput] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (answerInput.trim() && !disabled) {
      onSubmitAnswer(answerInput.trim());
      setAnswerInput("");
    }
  };

  return (
    <div
      className="bg-slate-950/95 rounded-xl p-6 border-2 border-white/90 relative overflow-hidden h-full flex flex-col"
      style={{
        backgroundImage: `linear-gradient(to right, rgba(148, 163, 184, 0.08) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(148, 163, 184, 0.08) 1px, transparent 1px)`,
        backgroundSize: "40px 40px",
      }}
    >
      {/* Question text */}
      <div className="flex-1 mb-4 pr-4 overflow-y-auto">
        {questionText ? (
          <div className="text-white text-lg leading-relaxed font-medium">
            {questionText}
          </div>
        ) : (
          <div className="text-gray-400 text-lg italic">
            Chờ câu hỏi...
          </div>
        )}
      </div>

      {/* Answer input và timer */}
      <div className="mt-auto space-y-4">
        <form onSubmit={handleSubmit} className="flex gap-3">
          <input
            type="text"
            value={answerInput}
            onChange={(e) => setAnswerInput(e.target.value)}
            placeholder="Nhập câu trả lời..."
            disabled={disabled || !questionText}
            className="flex-1 px-4 py-3 bg-slate-800/80 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-neon-blue disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <button
            type="submit"
            disabled={disabled || !questionText || !answerInput.trim()}
            className="px-6 py-3 bg-neon-blue hover:bg-neon-blue/80 text-white font-bold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Gửi
          </button>
        </form>

        {/* Timer */}
        <div className="flex items-center gap-2">
          <div className="text-white/80 text-sm">Thời gian:</div>
          <div className="text-white text-3xl font-mono font-bold tabular-nums">
            {String(Math.floor(timeLeft / 60)).padStart(2, "0")}:
            {String(timeLeft % 60).padStart(2, "0")}
          </div>
        </div>
      </div>
    </div>
  );
}

