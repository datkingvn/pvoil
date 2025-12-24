"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useGameStore } from "@/lib/store";
import { useBroadcastSync } from "@/hooks/useBroadcastSync";
import { Trophy, Medal } from "lucide-react";

export default function ScoreboardPage() {
  useBroadcastSync(); // Sync with other tabs

  const { players, log } = useGameStore();

  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0:
        return <Trophy className="w-8 h-8 text-neon-yellow" />;
      case 1:
        return <Medal className="w-8 h-8 text-gray-400" />;
      case 2:
        return <Medal className="w-8 h-8 text-amber-600" />;
      default:
        return <span className="text-2xl font-bold text-gray-500">{index + 1}</span>;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 p-8">
      <div className="max-w-4xl mx-auto">
        <motion.h1
          className="text-5xl font-bold text-center mb-8 bg-gradient-to-r from-neon-blue to-neon-purple bg-clip-text text-transparent"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          Bảng xếp hạng
        </motion.h1>

        {/* Leaderboard */}
        <div className="space-y-4 mb-8">
          <AnimatePresence>
            {sortedPlayers.map((player, index) => (
              <motion.div
                key={player.id}
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 50 }}
                transition={{ delay: index * 0.1 }}
                className={`
                  relative p-6 rounded-xl border-2
                  ${
                    index === 0
                      ? "bg-gradient-to-r from-neon-yellow/20 to-neon-yellow/10 border-neon-yellow"
                      : "bg-gray-800 border-gray-700"
                  }
                `}
              >
                <div className="flex items-center gap-4">
                  <div className="flex-shrink-0">{getRankIcon(index)}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div
                        className={`
                          w-12 h-12 rounded-full flex items-center justify-center
                          font-bold text-xl
                          ${
                            index === 0
                              ? "bg-neon-yellow text-black"
                              : "bg-gray-700 text-white"
                          }
                        `}
                      >
                        {player.id}
                      </div>
                      <div>
                        <div className="text-xl font-bold text-white">{player.name}</div>
                        <div className="text-sm text-gray-400">Thí sinh {player.id}</div>
                      </div>
                    </div>
                  </div>
                  <motion.div
                    className="text-4xl font-bold text-neon-green tabular-nums"
                    key={player.score}
                    initial={{ scale: 1.3, color: "#00ff88" }}
                    animate={{ scale: 1, color: "#00ff88" }}
                    transition={{ duration: 0.3 }}
                  >
                    {player.score}
                  </motion.div>
                </div>

                {index === 0 && (
                  <motion.div
                    className="absolute -top-2 -right-2 bg-neon-yellow text-black px-3 py-1 rounded-full text-sm font-bold"
                    animate={{ rotate: [0, 10, -10, 0] }}
                    transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 2 }}
                  >
                    🏆 TOP 1
                  </motion.div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Timeline Log */}
        <div className="bg-gray-800 rounded-xl p-6">
          <h2 className="text-2xl font-bold mb-4">Nhật ký trận đấu</h2>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            <AnimatePresence>
              {log.slice().reverse().map((entry) => (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="p-3 bg-gray-700 rounded-lg text-sm"
                >
                  <div className="text-gray-400 text-xs mb-1">
                    {new Date(entry.timestamp).toLocaleTimeString()}
                  </div>
                  <div className="text-white">{entry.message}</div>
                </motion.div>
              ))}
            </AnimatePresence>
            {log.length === 0 && (
              <div className="text-center text-gray-500 py-8">Chưa có hoạt động nào</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

