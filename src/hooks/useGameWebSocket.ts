"use client";

import { useEffect, useRef } from "react";
import Pusher from "pusher-js";
import { useGameStore } from "@/lib/store";
import type { GameState } from "@/lib/types";

type Role = "mc" | "stage" | "viewer";

export function useGameWebSocket(role: Role) {
  const pusherRef = useRef<Pusher | null>(null);
  const channelRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const pusherKey = process.env.NEXT_PUBLIC_PUSHER_KEY;
    const pusherCluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER || "ap1";

    if (!pusherKey) {
      console.warn("[Pusher] NEXT_PUBLIC_PUSHER_KEY not set, WebSocket sync disabled");
      return;
    }

    // Khởi tạo Pusher client
    const pusher = new Pusher(pusherKey, {
      cluster: pusherCluster,
    });

    pusherRef.current = pusher;

    // Subscribe vào channel "game-sync"
    const channel = pusher.subscribe("game-sync");
    channelRef.current = channel;

    // Lắng nghe sự kiện "state-update"
    channel.bind("state-update", (data: { state: Partial<GameState> }) => {
      if (data.state) {
        const partialState = data.state;
        useGameStore.setState((state) => ({ ...state, ...partialState }));
      }
    });

    // Lắng nghe các sự kiện state từ store và gửi qua API route
    const handleWsStateUpdate = async (e: Event) => {
      const customEvent = e as CustomEvent<Partial<GameState>>;
      const state = customEvent.detail;

      if (!state) return;

      try {
        // Gọi API route để trigger Pusher event
        await fetch("/api/pusher/broadcast", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ state }),
        });
      } catch (err) {
        console.error("[Pusher] Failed to broadcast state", err);
      }
    };

    window.addEventListener("ws-state-update", handleWsStateUpdate as EventListener);

    return () => {
      window.removeEventListener("ws-state-update", handleWsStateUpdate as EventListener);
      if (channelRef.current) {
        channelRef.current.unbind_all();
        channelRef.current.unsubscribe();
      }
      if (pusherRef.current) {
        pusherRef.current.disconnect();
      }
    };
  }, [role]);
}
