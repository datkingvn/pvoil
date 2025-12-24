import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface MCUser {
  id: string;
  username: string;
  role: "mc" | "admin";
}

export function useMcAuth() {
  const router = useRouter();
  const [user, setUser] = useState<MCUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const res = await fetch("/api/auth/mc/me");
      const data = await res.json();
      
      if (data.authenticated) {
        setUser(data.user);
        setAuthenticated(true);
      } else {
        setAuthenticated(false);
        setUser(null);
      }
    } catch (error) {
      setAuthenticated(false);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await fetch("/api/auth/mc/logout", { method: "POST" });
      setUser(null);
      setAuthenticated(false);
      router.push("/control/login");
    } catch (error) {
      console.error("MC logout error:", error);
    }
  };

  return { user, authenticated, loading, logout, checkAuth };
}

