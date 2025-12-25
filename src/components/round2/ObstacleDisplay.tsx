"use client";

interface ObstacleDisplayProps {
  keywordLength: number;
  answerWordCounts: number[];
}

export function ObstacleDisplay({
  keywordLength,
  answerWordCounts,
}: ObstacleDisplayProps) {
  // Render X ô tròn cho keyword
  const renderKeywordBubbles = () => {
    return Array.from({ length: keywordLength }).map((_, i) => (
      <div
        key={i}
        className="w-14 h-14 rounded-full relative"
        style={{
          background:
            "linear-gradient(145deg, rgba(226,232,240,.9), rgba(148,163,184,.6))",
          padding: "3px",
          boxShadow:
            "0 10px 20px rgba(0,0,0,.35), inset 0 1px 0 rgba(255,255,255,.35)",
        }}
      >
        <div
          className="w-full h-full rounded-full"
          style={{
            background:
              "radial-gradient(circle at 30% 30%, rgba(255,255,255,.75), rgba(125,211,252,.85) 35%, rgba(59,130,246,.75) 70%, rgba(30,58,138,.85) 100%)",
            boxShadow:
              "inset 0 10px 18px rgba(255,255,255,.18), inset 0 -10px 18px rgba(0,0,0,.25)",
          }}
        />
        <div
          className="absolute top-2 left-3 w-6 h-6 rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(255,255,255,.85), rgba(255,255,255,0) 70%)",
            filter: "blur(.2px)",
            opacity: 0.9,
          }}
        />
      </div>
    ));
  };

  return (
    <div
      className="bg-slate-950/95 rounded-xl p-4 border border-slate-700/50 relative overflow-hidden h-full"
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

      <div className="flex gap-6 h-[calc(100%-80px)]">
        {/* Left: Keyword bubbles */}
        <div className="flex-1 flex flex-col justify-center">
          <div className="flex flex-wrap gap-3 justify-center">
            {renderKeywordBubbles()}
          </div>
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
                {count} từ
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

