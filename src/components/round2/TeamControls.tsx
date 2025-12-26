"use client";

import { Round2Team } from "@/lib/round2/types";

interface TeamControlsProps {
  teams: Round2Team[];
  activeTeamId: number | null;
  onSelectTeam: (teamId: number) => void;
  onSelectTile: (tileId: 1 | 2 | 3 | 4) => void;
  availableTiles: number[];
  keywordInput: string;
  onKeywordInputChange: (value: string) => void;
  onGuessKeyword: () => void;
  disabled?: boolean;
}

export function TeamControls({
  teams,
  activeTeamId,
  onSelectTeam,
  onSelectTile,
  availableTiles,
  keywordInput,
  onKeywordInputChange,
  onGuessKeyword,
  disabled = false,
}: TeamControlsProps) {
  return (
    <div className="space-y-4">
      {/* Tile selector */}
      <div>
        <label className="block text-white text-sm font-medium mb-2">
          Chọn tile (1-4):
        </label>
        <div className="grid grid-cols-4 gap-2">
          {[1, 2, 3, 4].map((tileId) => {
            const isAvailable = availableTiles.includes(tileId);
            return (
              <button
                key={tileId}
                onClick={() => onSelectTile(tileId as 1 | 2 | 3 | 4)}
                disabled={disabled || !isAvailable || !activeTeamId}
                className={`px-4 py-2 rounded-lg font-bold transition-colors ${
                  isAvailable && activeTeamId
                    ? "bg-neon-blue hover:bg-neon-blue/80 text-white"
                    : "bg-slate-700 text-gray-400 cursor-not-allowed"
                } disabled:opacity-50`}
              >
                {tileId}
              </button>
            );
          })}
        </div>
      </div>

      {/* Keyword guess */}
      <div>
        <label className="block text-white text-sm font-medium mb-2">
          Đoán chướng ngại vật:
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={keywordInput}
            onChange={(e) => onKeywordInputChange(e.target.value)}
            placeholder="Nhập từ khóa..."
            disabled={disabled}
            className="flex-1 px-4 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-neon-blue disabled:opacity-50"
            onKeyDown={(e) => {
              if (e.key === "Enter" && keywordInput.trim() && !disabled) {
                onGuessKeyword();
              }
            }}
          />
          <button
            onClick={onGuessKeyword}
            disabled={disabled || !keywordInput.trim()}
            className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Đoán
          </button>
        </div>
      </div>
    </div>
  );
}

