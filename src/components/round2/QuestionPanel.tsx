"use client";

import { useState } from "react";

interface SubmittedAnswer {
  answer: string;
  isCorrect: boolean | null;
}

interface QuestionPanelProps {
  questionText: string | null;
  timeLeft: number;
  onSubmitAnswer: (answer: string) => void;
  disabled?: boolean;
  submittedAnswer?: SubmittedAnswer | null;
}

export function QuestionPanel({
  questionText,
  timeLeft,
  onSubmitAnswer,
  disabled = false,
  submittedAnswer = null,
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
        {submittedAnswer ? (
          // Hiển thị UI khi đã submit đáp án
          <div className="p-4 bg-gradient-to-br from-slate-800/90 to-slate-900/90 border-2 border-green-500/50 rounded-lg shadow-lg shadow-green-500/20">
            <div className="flex items-center gap-2 mb-3">
              <div className="text-green-400 text-lg">✓</div>
              <div className="text-sm font-semibold text-green-400">Đã gửi đáp án thành công!</div>
            </div>
            {submittedAnswer.isCorrect === true ? (
              <div className="flex items-center gap-2 text-green-400 text-sm font-semibold p-2 bg-green-500/20 rounded border border-green-500/50">
                <span className="text-lg">✓</span>
                <span>Đúng - Bạn đã nhận được điểm!</span>
              </div>
            ) : submittedAnswer.isCorrect === false ? (
              <div className="flex items-center gap-2 text-red-400 text-sm font-semibold p-2 bg-red-500/20 rounded border border-red-500/50">
                <span className="text-lg">✗</span>
                <span>Sai - Không mất điểm</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-yellow-400 text-sm font-semibold p-2 bg-yellow-500/20 rounded border border-yellow-500/50 animate-pulse">
                <span className="text-lg">⏳</span>
                <span>Chờ MC chấm điểm...</span>
              </div>
            )}
          </div>
        ) : timeLeft <= 0 ? (
          <div className="p-3 bg-gray-900/30 border border-gray-600 rounded-lg">
            <div className="text-gray-400 text-sm font-semibold">⏰ Đã hết thời gian</div>
            <div className="text-gray-500 text-xs mt-1">Không thể gửi đáp án nữa</div>
          </div>
        ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-2">
          <div className="flex gap-3">
            <input
              type="text"
              value={answerInput}
              onChange={(e) => setAnswerInput(e.target.value)}
              placeholder="Nhập câu trả lời..."
                disabled={disabled || !questionText || timeLeft <= 0}
              className="flex-1 px-4 py-3 bg-slate-800/80 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-neon-blue disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <button
              type="submit"
                disabled={disabled || !questionText || !answerInput.trim() || timeLeft <= 0}
              className="px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold rounded-lg transition-all duration-200 shadow-lg shadow-green-500/50 hover:shadow-green-500/70 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              ✓ Gửi
            </button>
          </div>
          {/* Thông báo hướng dẫn */}
          <div className="text-xs text-gray-400 italic">
            💡 Sau khi gửi, đáp án của bạn sẽ được hiển thị và chờ MC chấm điểm
          </div>
        </form>
        )}

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

