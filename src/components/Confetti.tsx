"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

export function Confetti() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const handleConfetti = () => {
      setShow(true);
      setTimeout(() => setShow(false), 2000);
    };

    window.addEventListener("confetti" as any, handleConfetti);
    return () => window.removeEventListener("confetti" as any, handleConfetti);
  }, []);

  if (!show) return null;

  const particles = Array.from({ length: 50 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    delay: Math.random() * 0.5,
    duration: 1 + Math.random(),
    color: ["#00ff88", "#00f0ff", "#ffd700", "#ff00ff"][Math.floor(Math.random() * 4)],
  }));

  return (
    <div className="fixed inset-0 pointer-events-none z-40 overflow-hidden">
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className="absolute w-3 h-3 rounded-full"
          style={{
            backgroundColor: particle.color,
            left: `${particle.x}%`,
            top: "-10px",
          }}
          initial={{ y: 0, rotate: 0, opacity: 1 }}
          animate={{
            y: window.innerHeight + 100,
            rotate: 360,
            opacity: 0,
            x: (Math.random() - 0.5) * 200,
          }}
          transition={{
            duration: particle.duration,
            delay: particle.delay,
            ease: "easeOut",
          }}
        />
      ))}
    </div>
  );
}

// Helper function to trigger confetti
export function triggerConfetti() {
  window.dispatchEvent(new CustomEvent("confetti"));
}

