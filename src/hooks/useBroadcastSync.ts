"use client";

import { useEffect } from "react";
import { useGameStore } from "@/lib/store";
import { GameState } from "@/lib/types";

let broadcastChannel: BroadcastChannel | null = null;

if (typeof window !== "undefined") {
  try {
    broadcastChannel = new BroadcastChannel("game-sync");
  } catch (e) {
    console.warn("BroadcastChannel not supported, falling back to localStorage events");
  }
}

export function useBroadcastSync() {
  useEffect(() => {
    if (!broadcastChannel) {
      // Fallback to localStorage events
      const handleStorageChange = (e: StorageEvent) => {
        if (e.key === "game-storage" && e.newValue) {
          try {
            const newState = JSON.parse(e.newValue);
            if (newState.state) {
              useGameStore.setState(newState.state);
            }
          } catch (err) {
            console.warn("Failed to parse storage state", err);
          }
        }
      };

      window.addEventListener("storage", handleStorageChange);
      return () => window.removeEventListener("storage", handleStorageChange);
    }

    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === "state-update") {
        const partialState = event.data.state as Partial<GameState>;
        // Use functional update to ensure state is properly merged
        useGameStore.setState((state) => ({ ...state, ...partialState }));
      }
    };

    broadcastChannel.addEventListener("message", handleMessage);
    return () => broadcastChannel?.removeEventListener("message", handleMessage);
  }, []);
}

