"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { LogIn, UserPlus, Mic } from "lucide-react";
import { Logo } from "@/components/Logo";

export default function MCLoginPage() {
  const router = useRouter();
  const [isRegister, setIsRegister] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // Kiểm tra xem đã có MC nào chưa
    checkExistingMC();
    // Kiểm tra nếu đã đăng nhập rồi thì chuyển đến trang control
    checkAuth();
  }, []);

  const checkExistingMC = async () => {
    try {
      const res = await fetch("/api/auth/mc/check");
      const data = await res.json();
      
      // Nếu đã có MC thì hiển thị form đăng nhập, nếu chưa thì hiển thị đăng ký
      setIsRegister(!data.hasMC);
    } catch (error) {
      // Mặc định hiển thị đăng nhập
      setIsRegister(false);
    } finally {
      setChecking(false);
    }
  };

  const checkAuth = async () => {
    try {
      const res = await fetch("/api/auth/mc/me");
      const data = await res.json();
      if (data.authenticated) {
        router.push("/control");
      }
    } catch (error) {
      // Không làm gì nếu có lỗi
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const endpoint = isRegister ? "/api/auth/mc/register" : "/api/auth/mc/login";

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (res.ok) {
        // Đăng nhập/đăng ký thành công, chuyển đến trang control
        router.push("/control");
      } else {
        setError(data.error || "Đã có lỗi xảy ra");
        // Nếu đăng ký thành công nhưng có lỗi khác, chuyển sang form đăng nhập
        if (isRegister && res.status === 403) {
          setIsRegister(false);
        }
      }
    } catch (error) {
      setError("Đã có lỗi xảy ra");
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
        <div className="text-gray-400">Đang tải...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex flex-col items-center justify-center p-8 relative overflow-hidden">
      <div className="absolute inset-0 bg-radial-gradient bg-grid-soft opacity-80 pointer-events-none" />
      <Logo className="mb-8 relative z-10" logoClassName="w-40" textClassName="text-base" />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative z-10 panel-elevated"
      >
        <div className="p-8">
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring" }}
              className="inline-flex items-center justify-center w-16 h-16 bg-neon-purple/20 rounded-full mb-4"
            >
              <Mic className="w-8 h-8 text-neon-purple" />
            </motion.div>
            <h1 className="text-3xl font-bold text-white mb-2">
              {isRegister ? "Đăng ký MC" : "Đăng nhập MC"}
            </h1>
            <p className="text-gray-400">
              {isRegister
                ? "Tạo tài khoản MC đầu tiên"
                : "Vui lòng đăng nhập để vào trang điều khiển"}
            </p>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-4 bg-red-600/20 border border-red-600 rounded-lg text-red-400 text-sm"
            >
              {error}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-300">
                Tên đăng nhập
              </label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-neon-purple focus:border-transparent text-white"
                placeholder="Nhập tên đăng nhập"
                required
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-gray-300">Mật khẩu</label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-neon-purple focus:border-transparent text-white"
                placeholder="Nhập mật khẩu"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full px-4 py-3 bg-gradient-to-r from-neon-purple to-neon-blue text-white rounded-lg font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  {isRegister ? "Đang đăng ký..." : "Đang đăng nhập..."}
                </>
              ) : (
                <>
                  {isRegister ? (
                    <>
                      <UserPlus className="w-5 h-5" />
                      Đăng ký
                    </>
                  ) : (
                    <>
                      <LogIn className="w-5 h-5" />
                      Đăng nhập
                    </>
                  )}
                </>
              )}
            </button>
          </form>

          {!isRegister && (
            <div className="mt-4 text-center text-sm text-gray-400">
              <p>Lần đầu sử dụng? Hệ thống sẽ tự động chuyển sang đăng ký nếu chưa có MC nào.</p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

