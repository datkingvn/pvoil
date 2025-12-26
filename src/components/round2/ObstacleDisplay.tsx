"use client";

import { Round2Question } from "@/lib/round2/types";

interface ObstacleDisplayProps {
  keywordLength: number;
  answerWordCounts: number[];
  questions: Round2Question[];
  activeQuestionId: 1 | 2 | 3 | 4 | null;
}

export function ObstacleDisplay({
  keywordLength,
  answerWordCounts,
  questions,
  activeQuestionId,
}: ObstacleDisplayProps) {
  // Render một ô tròn với chữ cái (nếu đã trả lời đúng) và màu sắc
  const renderBubble = (
    key: string | number,
    letter: string | null = null,
    isRevealed: boolean = false,
    isActive: boolean = false
  ) => {
    // Màu sắc: xám nếu đã revealed và không phải active, xanh nếu active hoặc chưa revealed
    const isGray = isRevealed && !isActive;
    
    return (
      <div
        key={key}
        className="w-10 h-10 rounded-full relative flex items-center justify-center"
        style={{
          background: isGray
            ? "linear-gradient(145deg, rgba(107,114,128,.9), rgba(75,85,99,.6))"
            : "linear-gradient(145deg, rgba(226,232,240,.9), rgba(148,163,184,.6))",
          padding: "2px",
          boxShadow:
            "0 8px 16px rgba(0,0,0,.35), inset 0 1px 0 rgba(255,255,255,.35)",
        }}
      >
        <div
          className="w-full h-full rounded-full flex items-center justify-center"
          style={{
            background: isGray
              ? "radial-gradient(circle at 30% 30%, rgba(156,163,175,.75), rgba(107,114,128,.85) 35%, rgba(75,85,99,.75) 70%, rgba(55,65,81,.85) 100%)"
              : "radial-gradient(circle at 30% 30%, rgba(255,255,255,.75), rgba(125,211,252,.85) 35%, rgba(59,130,246,.75) 70%, rgba(30,58,138,.85) 100%)",
            boxShadow:
              "inset 0 8px 14px rgba(255,255,255,.18), inset 0 -8px 14px rgba(0,0,0,.25)",
          }}
        >
          {letter && (
            <span className="text-white font-bold text-lg z-10 relative">
              {letter.toUpperCase()}
            </span>
          )}
        </div>
        {!isGray && (
          <div
            className="absolute top-1.5 left-2 w-4 h-4 rounded-full"
            style={{
              background:
                "radial-gradient(circle, rgba(255,255,255,.85), rgba(255,255,255,0) 70%)",
              filter: "blur(.2px)",
              opacity: 0.9,
            }}
          />
        )}
      </div>
    );
  };

  // Render một hàng ô tròn với số lượng cụ thể
  const renderBubbleRow = (count: number, rowIndex: number) => {
    const tileId = (rowIndex + 1) as 1 | 2 | 3 | 4;
    const question = questions.find((q) => q.id === tileId);
    const isRevealed = question?.tileStatus === "revealed";
    const isActive = activeQuestionId === tileId;
    const answerText = question?.answerText || "";
    
    // Parse answerText thành mảng chữ cái (loại bỏ khoảng trắng)
    const letters = answerText.replace(/\s+/g, "").split("");
    
    return (
      <div key={rowIndex} className="flex flex-wrap gap-2 justify-center">
        {Array.from({ length: count }).map((_, i) => {
          const letter = isRevealed && letters[i] ? letters[i] : null;
          return renderBubble(`${rowIndex}-${i}`, letter, isRevealed, isActive);
        })}
      </div>
    );
  };

  return (
    <div
      className="bg-slate-950/95 rounded-xl pt-0 pb-4 px-4 border border-slate-700/50 relative overflow-hidden h-full"
      style={{
        background:
          "radial-gradient(1200px 500px at 20% 10%, rgba(56,189,248,.18), transparent 60%)," +
          "linear-gradient(135deg, rgba(2,6,23,.95), rgba(15,23,42,.92))",
      }}
    >
      {/* Banner */}
      <div className="rounded-lg px-4 py-2 text-center shadow-lg border border-sky-300/20 bg-sky-500/80 mb-4">
        <h2 className="text-white font-bold text-base tracking-wide">
          CHƯỚNG NGẠI VẬT CÓ {keywordLength} CHỮ CÁI
        </h2>
      </div>

      <div className="flex gap-10 h-[calc(100%-80px)]">
        {/* Left: Keyword bubbles - hiển thị theo từng hàng tương ứng với số chữ cái của từng mục */}
        <div className="flex-1 flex flex-col justify-center gap-4">
          {answerWordCounts.map((count, index) => renderBubbleRow(count, index))}
        </div>

        {/* Right: Answer word counts (1-4) */}
        <div className="flex flex-col gap-4 justify-center flex-shrink-0">
          {answerWordCounts.map((count, index) => (
            <div
              key={index + 1}
              className="w-16 h-16 rounded-xl flex flex-col items-center justify-center text-white"
              style={{
                background:
                  "linear-gradient(145deg, rgba(30,58,138,.85), rgba(37,99,235,.75))",
                border: "1px solid rgba(186,230,253,.25)",
                boxShadow: "0 12px 22px rgba(0,0,0,.35)",
              }}
            >
              <div className="text-2xl font-extrabold">{index + 1}</div>
              <div className="text-xs font-medium opacity-80">
                {count} chữ cái
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

