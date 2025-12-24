"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGameStore } from "@/lib/store";
import { soundManager } from "@/lib/sounds";

export function Timer() {
  const { timerSeconds, timerRunning, timerInitial, soundEnabled, timerTick } = useGameStore();

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
  
  // Calculate progress percentage
  const progress = timerInitial > 0 ? (timerSeconds / timerInitial) * 100 : 0;
  
  // SVG circle parameters
  const size = 200;
  const strokeWidth = 12;
  const center = size / 2;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;
  
  const timerColor = isLowTime ? "#ef4444" : "#00f0ff";
  const shadowColor = isLowTime ? "rgba(239,68,68,0.8)" : "rgba(0,240,255,0.6)";

  return (
    <motion.div
      className="relative flex items-center justify-center p-12"
      animate={isLowTime && timerRunning ? { scale: [1, 1.05, 1] } : { scale: 1 }}
      transition={{ duration: 0.5, repeat: isLowTime && timerRunning ? Infinity : 0 }}
    >
      <div className="relative" style={{ width: size, height: size }}>
        {/* Background circle */}
        <svg width={size} height={size} className="transform -rotate-90" style={{ overflow: 'visible' }}>
          <circle
            cx={center}
            cy={center}
            r={radius}
            stroke="rgba(255,255,255,0.1)"
            strokeWidth={strokeWidth}
            fill="none"
          />
          {/* Progress circle */}
          <motion.circle
            cx={center}
            cy={center}
            r={radius}
            stroke={timerColor}
            strokeWidth={strokeWidth}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{
              filter: `drop-shadow(0 0 10px ${shadowColor})`,
            }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 0.3, ease: "linear" }}
          />
        </svg>
        
        {/* Timer text in center */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className={`text-4xl font-bold tabular-nums ${isLowTime ? "text-red-500" : "text-neon-blue"}`}
            style={{
              textShadow: `0 0 20px ${shadowColor}`,
            }}
          >
            {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
          </div>
        </div>
        
        {/* Pulsing effect when low time */}
        {isLowTime && timerRunning && (
          <motion.div
            className="absolute -inset-6 rounded-full pointer-events-none"
            style={{
              boxShadow: `0 0 40px ${shadowColor}`,
              backgroundColor: "transparent",
            }}
            animate={{ opacity: [0.3, 0.8, 0.3] }}
            transition={{ duration: 0.5, repeat: Infinity }}
          />
        )}
      </div>
    </motion.div>
  );
}

