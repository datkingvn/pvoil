import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Team {
  id: string;
  teamName: string;
  username: string;
}

export function useAuth() {
  const router = useRouter();
  const [team, setTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const res = await fetch("/api/auth/me");
      const data = await res.json();
      
      if (data.authenticated) {
        setTeam(data.team);
        setAuthenticated(true);
      } else {
        setAuthenticated(false);
        setTeam(null);
      }
    } catch (error) {
      setAuthenticated(false);
      setTeam(null);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setTeam(null);
      setAuthenticated(false);
      router.push("/login");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return { team, authenticated, loading, logout, checkAuth };
}

