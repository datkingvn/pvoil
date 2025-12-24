"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useGameStore } from "@/lib/store";
import { soundManager } from "@/lib/sounds";
import { Bell } from "lucide-react";

interface BuzzButtonProps {
  playerId: "A" | "B" | "C" | "D";
  disabled?: boolean;
}

export function BuzzButton({ playerId, disabled = false }: BuzzButtonProps) {
  const { gameStatus, buzz, players, soundEnabled } = useGameStore();
  const [isPressed, setIsPressed] = useState(false);
  const [isLocked, setIsLocked] = useState(false);

  const canBuzz = gameStatus === "question-open" && !disabled && !isLocked;
  const player = players.find((p) => p.id === playerId);
  const isBuzzed = player?.status === "buzzed";

  const handleBuzz = () => {
    if (!canBuzz) return;

    setIsPressed(true);
    setIsLocked(true);

    if (soundEnabled) {
      soundManager.playBuzz();
    }

    buzz(playerId);

    // Lock for 2 seconds
    setTimeout(() => {
      setIsLocked(false);
      setIsPressed(false);
    }, 2000);
  };

  return (
    <motion.button
      onClick={handleBuzz}
      disabled={!canBuzz}
      className={`
        relative px-8 py-4 rounded-xl font-bold text-xl
        transition-all duration-200
        ${canBuzz
          ? "bg-gradient-to-br from-neon-blue to-neon-purple text-white cursor-pointer hover:shadow-lg"
          : "bg-gray-700 text-gray-400 cursor-not-allowed"
        }
        ${isBuzzed ? "ring-4 ring-neon-yellow ring-offset-4 ring-offset-black" : ""}
      `}
      whileHover={canBuzz ? { scale: 1.05 } : {}}
      whileTap={canBuzz ? { scale: 0.95 } : {}}
      animate={
        isBuzzed
          ? {
              boxShadow: [
                "0 0 20px rgba(255, 215, 0, 0.5)",
                "0 0 40px rgba(255, 215, 0, 0.8)",
                "0 0 20px rgba(255, 215, 0, 0.5)",
              ],
            }
          : {}
      }
      transition={{ duration: 0.5, repeat: isBuzzed ? Infinity : 0 }}
    >
      <div className="flex items-center gap-2">
        <Bell className="w-6 h-6" />
        <span>BẤM CHUÔNG</span>
      </div>
      {isPressed && (
        <motion.div
          className="absolute inset-0 bg-white/30 rounded-xl"
          initial={{ scale: 0 }}
          animate={{ scale: 1.5, opacity: 0 }}
          transition={{ duration: 0.3 }}
        />
      )}
    </motion.button>
  );
}

