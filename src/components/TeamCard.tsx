"use client";

import { memo } from "react";
import { motion } from "framer-motion";
import { TeamScore } from "@/lib/types";

interface TeamCardProps {
  team: TeamScore;
  isActive?: boolean;
}

export const TeamCard = memo(function TeamCard({ team, isActive = false }: TeamCardProps) {
  return (
    <motion.div
      className={`
        relative p-3 rounded-lg border-2
        bg-gray-800
        ${isActive ? "border-neon-blue shadow-lg shadow-neon-blue/30" : "border-gray-600"}
        transition-all duration-300
      `}
    >
      <div className="flex items-center gap-2.5">
        <div
          className={`
            w-10 h-10 rounded-full flex items-center justify-center
            font-bold text-lg
            ${isActive ? "bg-neon-blue text-white" : "bg-gray-700 text-white"}
          `}
        >
          {team.teamName.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1">
          <div className="font-semibold text-white text-sm">{team.teamName}</div>
        </div>
        <motion.div
          className="text-xl font-bold text-neon-green tabular-nums"
          key={team.score}
          initial={{ scale: 1.2, color: "#00ff88" }}
          animate={{ scale: 1, color: "#00ff88" }}
          transition={{ duration: 0.3 }}
        >
          {team.score}
        </motion.div>
      </div>
    </motion.div>
  );
});

