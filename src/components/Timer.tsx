"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGameStore } from "@/lib/store";
import { soundManager } from "@/lib/sounds";

export function Timer() {
  const { timerSeconds, timerRunning, soundEnabled, timerTick } = useGameStore();

  useEffect(() => {
    if (!timerRunning) return;

    const interval = setInterval(() => {
      timerTick();
      
      if (timerSeconds <= 5 && timerSeconds > 0 && soundEnabled) {
        soundManager.playCountdown();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [timerRunning, timerSeconds, timerTick, soundEnabled]);

  const isLowTime = timerSeconds <= 5;
  const minutes = Math.floor(timerSeconds / 60);
  const seconds = timerSeconds % 60;

  return (
    <motion.div
      className={`relative flex items-center justify-center ${
        isLowTime ? "text-red-500" : "text-neon-blue"
      }`}
      animate={isLowTime && timerRunning ? { scale: [1, 1.05, 1] } : {}}
      transition={{ duration: 0.5, repeat: Infinity }}
    >
      <div
        className={`text-6xl font-bold tabular-nums ${
          isLowTime ? "drop-shadow-[0_0_20px_rgba(239,68,68,0.8)]" : "drop-shadow-[0_0_20px_rgba(0,240,255,0.6)]"
        }`}
      >
        {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
      </div>
      {isLowTime && timerRunning && (
        <motion.div
          className="absolute inset-0 bg-red-500/20 rounded-lg blur-xl"
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 0.5, repeat: Infinity }}
        />
      )}
    </motion.div>
  );
}

