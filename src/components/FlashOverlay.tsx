"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";

type FlashType = "correct" | "wrong" | null;

export function FlashOverlay() {
  const [flash, setFlash] = useState<FlashType>(null);

  useEffect(() => {
    // Listen for flash events from store or custom events
    const handleFlash = (e: CustomEvent<FlashType>) => {
      setFlash(e.detail);
      setTimeout(() => setFlash(null), 200);
    };

    window.addEventListener("flash" as any, handleFlash as EventListener);
    return () => window.removeEventListener("flash" as any, handleFlash as EventListener);
  }, []);

  return (
    <AnimatePresence>
      {flash && (
        <motion.div
          className={`fixed inset-0 z-50 pointer-events-none ${
            flash === "correct" ? "bg-green-500/30" : "bg-red-500/30"
          }`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        />
      )}
    </AnimatePresence>
  );
}

// Helper function to trigger flash
export function triggerFlash(type: "correct" | "wrong") {
  window.dispatchEvent(new CustomEvent("flash", { detail: type }));
}

