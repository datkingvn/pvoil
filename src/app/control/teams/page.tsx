"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Plus, Trash2, Users, X } from "lucide-react";
import Link from "next/link";
import { ToastContainer } from "@/components/Toast";

interface Team {
  id: string;
  teamName: string;
  username: string;
}

export default function TeamsManagementPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    teamName: "",
    username: "",
    password: "",
  });
  const [toasts, setToasts] = useState<Array<{ id: string; message: string; type: "success" | "error" }>>([]);

  const showToast = (message: string, type: "success" | "error") => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, message, type }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  useEffect(() => {
    fetchTeams();
  }, []);

  const fetchTeams = async () => {
    try {
      const res = await fetch("/api/teams");
      const data = await res.json();
      if (res.ok) {
        setTeams(data.teams);
      }
    } catch (error) {
      console.error("Error fetching teams:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.teamName || !formData.username || !formData.password) {
      showToast("Vui lòng điền đầy đủ thông tin", "error");
      return;
    }

    try {
      const res = await fetch("/api/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (res.ok) {
        showToast("Tạo đội thi thành công!", "success");
        setFormData({ teamName: "", username: "", password: "" });
        setShowModal(false);
        fetchTeams();
      } else {
        showToast(data.error || "Đã có lỗi xảy ra", "error");
      }
    } catch (error) {
      showToast("Đã có lỗi xảy ra khi tạo đội thi", "error");
    }
  };

  const handleDelete = async (id: string) => {
    if (!id || id === "undefined") {
      showToast("ID đội thi không hợp lệ", "error");
      return;
    }

    if (!confirm("Bạn có chắc chắn muốn xóa đội thi này?")) return;

    try {
      const res = await fetch(`/api/teams/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        showToast("Đã xóa đội thi thành công!", "success");
        fetchTeams();
      } else {
        const data = await res.json();
        showToast(data.error || "Đã có lỗi xảy ra", "error");
      }
    } catch (error) {
      showToast("Đã có lỗi xảy ra khi xóa đội thi", "error");
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-neon-blue mb-2">Quản lý đội thi</h1>
            <p className="text-gray-400">Tạo và quản lý tài khoản cho các đội thi</p>
          </div>
          <Link
            href="/control"
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
          >
            Quay lại điều khiển
          </Link>
        </div>

        {/* Danh sách đội thi */}
        <div className="bg-gray-800 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Danh sách đội thi</h2>
            <button
              onClick={() => {
                setShowModal(true);
              }}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg font-semibold transition-colors flex items-center gap-2 text-white"
            >
              <Plus className="w-5 h-5" />
              Tạo đội thi
            </button>
          </div>

          {loading ? (
            <div className="text-center py-8 text-gray-400">Đang tải...</div>
          ) : teams.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Users className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p>Chưa có đội thi nào. Hãy tạo đội thi đầu tiên!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {teams.map((team, index) => (
                <motion.div
                  key={team.id || `team-${index}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 bg-gray-700 rounded-lg border border-gray-600"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h3 className="text-lg font-bold text-neon-blue">
                        {team.teamName}
                      </h3>
                      <p className="text-sm text-gray-400">Tên đăng nhập: {team.username}</p>
                    </div>
                    <button
                      onClick={() => handleDelete(team.id)}
                      className="p-2 text-red-400 hover:text-red-300 hover:bg-red-600/20 rounded-lg transition-colors"
                      title="Xóa đội thi"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal tạo đội thi */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowModal(false);
              setError("");
            }
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-gray-800 rounded-xl border-2 border-gray-700 w-full max-w-md p-6 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-neon-blue">Tạo đội thi mới</h2>
              <button
                onClick={() => {
                  setShowModal(false);
                  setFormData({ teamName: "", username: "", password: "" });
                }}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>


            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-300">
                  Tên đội thi
                </label>
                <input
                  type="text"
                  value={formData.teamName}
                  onChange={(e) => setFormData({ ...formData, teamName: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-neon-blue focus:border-transparent text-white"
                  placeholder="Ví dụ: Đội A"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-300">
                  Tên đăng nhập
                </label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-neon-blue focus:border-transparent text-white"
                  placeholder="Ví dụ: doia"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-300">
                  Mật khẩu
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-neon-blue focus:border-transparent text-white"
                  placeholder="Tối thiểu 4 ký tự"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setFormData({ teamName: "", username: "", password: "" });
                  }}
                  className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg font-semibold transition-colors text-white"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 text-white"
                >
                  <Plus className="w-5 h-5" />
                  Tạo đội thi
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Toast Container */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}

