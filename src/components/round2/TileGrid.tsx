"use client";

import { Round2TileStatus } from "@/lib/round2/types";

interface TileGridProps {
  imageUrl: string;
  tiles: Array<{
    id: 1 | 2 | 3 | 4;
    status: Round2TileStatus;
  }>;
  onTileClick?: (tileId: 1 | 2 | 3 | 4) => void;
}

const tilePositions: Record<1 | 2 | 3 | 4, { x: string; y: string }> = {
  1: { x: "0%", y: "0%" },
  2: { x: "100%", y: "0%" },
  3: { x: "0%", y: "100%" },
  4: { x: "100%", y: "100%" },
};

export function TileGrid({ imageUrl, tiles, onTileClick }: TileGridProps) {
  const getTileStyles = (status: Round2TileStatus) => {
    const baseStyles: React.CSSProperties = {
      cursor: status === "hidden" ? "pointer" : "default",
      transition: "all 0.3s ease",
    };

    switch (status) {
      case "hidden":
        return {
          ...baseStyles,
          border: "3px solid rgba(255, 255, 255, 0.2)",
          boxShadow: "inset 0 0 50px rgba(0, 0, 0, 0.8)",
        };
      case "selected":
        return {
          ...baseStyles,
          border: "4px solid #00f0ff",
          boxShadow: "0 0 20px rgba(0, 240, 255, 0.6), inset 0 0 30px rgba(0, 240, 255, 0.2)",
        };
      case "revealed":
        return {
          ...baseStyles,
          border: "3px solid rgba(0, 255, 0, 0.5)",
          boxShadow: "0 0 15px rgba(0, 255, 0, 0.3)",
        };
      case "wrong":
        return {
          ...baseStyles,
          border: "3px solid rgba(239, 68, 68, 0.5)",
          boxShadow: "inset 0 0 50px rgba(239, 68, 68, 0.4)",
          opacity: 0.5,
        };
      default:
        return baseStyles;
    }
  };

  return (
    <div className="grid grid-cols-2 grid-rows-2 gap-4 w-full h-full">
      {tiles.map((tile) => {
        const pos = tilePositions[tile.id];
        const isClickable = tile.status === "hidden" && onTileClick;
        const isRevealed = tile.status === "revealed";

        return (
          <div
            key={tile.id}
            className="relative rounded-lg overflow-hidden bg-slate-900"
            style={{
              // Chỉ hiển thị background image khi revealed
              ...(isRevealed
                ? {
                    backgroundImage: `url(${imageUrl})`,
                    backgroundSize: "200% 200%",
                    backgroundPosition: `${pos.x} ${pos.y}`,
                  }
                : {}),
              ...getTileStyles(tile.status),
            }}
            onClick={() => isClickable && onTileClick?.(tile.id)}
            onMouseEnter={(e) => {
              if (isClickable) {
                e.currentTarget.style.transform = "scale(1.02)";
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "scale(1)";
            }}
          >
            {/* Overlay cho hidden, selected, và wrong - KHÔNG hiển thị hình ảnh */}
            {!isRevealed && (
              <div
                className="absolute inset-0 flex items-center justify-center"
                style={{
                  backgroundColor:
                    tile.status === "wrong"
                      ? "rgba(239, 68, 68, 0.9)"
                      : tile.status === "selected"
                      ? "rgba(0, 0, 0, 0.85)"
                      : "rgba(0, 0, 0, 0.9)",
                  border:
                    tile.status === "selected"
                      ? "4px solid #00f0ff"
                      : "none",
                }}
              >
                {/* Hiển thị số tile */}
                <div
                  className={`text-white font-bold ${
                    tile.status === "wrong" ? "text-6xl" : "text-8xl"
                  } opacity-90`}
                >
                  {tile.id}
                </div>
                {/* Hiển thị dấu X nếu wrong */}
                {tile.status === "wrong" && (
                  <div className="absolute text-white text-4xl font-bold">
                    ✗
                  </div>
                )}
              </div>
            )}

            {/* Label số tile khi revealed */}
            {isRevealed && (
              <div className="absolute top-2 left-2 bg-black/50 text-white px-2 py-1 rounded text-sm font-bold">
                {tile.id}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

