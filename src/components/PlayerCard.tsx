"use client";

import { motion } from "framer-motion";
import { Player } from "@/lib/types";

interface PlayerCardProps {
  player: Player;
  isActive?: boolean;
}

export function PlayerCard({ player, isActive = false }: PlayerCardProps) {
  const statusColors = {
    ready: "bg-gray-800",
    buzzed: "bg-neon-yellow/20 ring-2 ring-neon-yellow",
    answered: "bg-neon-green/20",
    locked: "bg-gray-900 opacity-50",
  };

  const statusText = {
    ready: "Sẵn sàng",
    buzzed: "Đã bấm chuông",
    answered: "Đã trả lời",
    locked: "Khóa",
  };

  return (
    <motion.div
      className={`
        relative p-4 rounded-lg border-2
        ${statusColors[player.status]}
        ${isActive ? "border-neon-blue" : "border-gray-700"}
        transition-all duration-300
      `}
      animate={
        player.status === "buzzed"
          ? {
              scale: [1, 1.02, 1],
              boxShadow: [
                "0 0 10px rgba(255, 215, 0, 0.3)",
                "0 0 20px rgba(255, 215, 0, 0.6)",
                "0 0 10px rgba(255, 215, 0, 0.3)",
              ],
            }
          : {}
      }
      transition={{ duration: 0.5, repeat: player.status === "buzzed" ? Infinity : 0 }}
    >
      <div className="flex items-center gap-3">
        <div
          className={`
            w-12 h-12 rounded-full flex items-center justify-center
            font-bold text-xl
            ${isActive ? "bg-neon-blue text-black" : "bg-gray-700 text-white"}
          `}
        >
          {player.id}
        </div>
        <div className="flex-1">
          <div className="font-semibold text-white">{player.name}</div>
          <div className="text-sm text-gray-400">{statusText[player.status]}</div>
        </div>
        <motion.div
          className="text-2xl font-bold text-neon-green tabular-nums"
          key={player.score}
          initial={{ scale: 1.2, color: "#00ff88" }}
          animate={{ scale: 1, color: "#00ff88" }}
          transition={{ duration: 0.3 }}
        >
          {player.score}
        </motion.div>
      </div>
    </motion.div>
  );
}

