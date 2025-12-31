"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Round4QuestionBank, Round4QuestionBankItem } from "@/lib/round4/types";
import { Plus, Trash2, ArrowLeft } from "lucide-react";

export default function Round4AdminPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<10 | 20 | 30>(10);
  const [questionBank, setQuestionBank] = useState<Round4QuestionBank>({
    questions10: [],
    questions20: [],
    questions30: [],
  });
  const [saving, setSaving] = useState(false);

  // Load existing question bank nếu có
  useEffect(() => {
    fetch("/api/round4/state")
      .then((res) => res.json())
      .then((data) => {
        if (data.questionBank) {
          setQuestionBank(data.questionBank);
        }
        // Load teams nếu chưa có
        if (!data.teams || data.teams.length === 0) {
          fetch("/api/round4/state", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "loadTeams" }),
          }).catch(console.error);
        }
      })
      .catch(console.error);
  }, []);

  const addQuestion = (points: 10 | 20 | 30) => {
    const newQuestion: Round4QuestionBankItem = {
      id: `q${points}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      questionText: "",
      answerText: "",
      points,
      timeLimitSec: points === 10 ? 10 : points === 20 ? 20 : 30,
      isUsed: false,
    };

    setQuestionBank((prev) => {
      if (points === 10) {
        return { ...prev, questions10: [...prev.questions10, newQuestion] };
      } else if (points === 20) {
        return { ...prev, questions20: [...prev.questions20, newQuestion] };
      } else {
        return { ...prev, questions30: [...prev.questions30, newQuestion] };
      }
    });
  };

  const removeQuestion = (points: 10 | 20 | 30, questionId: string) => {
    setQuestionBank((prev) => {
      if (points === 10) {
        return {
          ...prev,
          questions10: prev.questions10.filter((q) => q.id !== questionId),
        };
      } else if (points === 20) {
        return {
          ...prev,
          questions20: prev.questions20.filter((q) => q.id !== questionId),
        };
      } else {
        return {
          ...prev,
          questions30: prev.questions30.filter((q) => q.id !== questionId),
        };
      }
    });
  };

  const updateQuestion = (
    points: 10 | 20 | 30,
    questionId: string,
    field: "questionText" | "answerText" | "timeLimitSec",
    value: string | number
  ) => {
    setQuestionBank((prev) => {
      const updateArray = (arr: Round4QuestionBankItem[]) =>
        arr.map((q) =>
          q.id === questionId ? { ...q, [field]: value } : q
        );

      if (points === 10) {
        return { ...prev, questions10: updateArray(prev.questions10) };
      } else if (points === 20) {
        return { ...prev, questions20: updateArray(prev.questions20) };
      } else {
        return { ...prev, questions30: updateArray(prev.questions30) };
      }
    });
  };

  const handleSave = async () => {
    // Validate
    const allQuestions = [
      ...questionBank.questions10,
      ...questionBank.questions20,
      ...questionBank.questions30,
    ];

    for (const q of allQuestions) {
      if (!q.questionText.trim() || !q.answerText.trim()) {
        alert(`Vui lòng điền đầy đủ câu hỏi và đáp án cho tất cả câu hỏi`);
        return;
      }
    }

    // Kiểm tra số lượng câu hỏi tối thiểu
    const min10 = 3;
    const min20 = 2;
    const min30 = 3;

    if (questionBank.questions10.length < min10) {
      alert(`Cần tối thiểu ${min10} câu hỏi 10 điểm (hiện có ${questionBank.questions10.length})`);
      return;
    }
    if (questionBank.questions20.length < min20) {
      alert(`Cần tối thiểu ${min20} câu hỏi 20 điểm (hiện có ${questionBank.questions20.length})`);
      return;
    }
    if (questionBank.questions30.length < min30) {
      alert(`Cần tối thiểu ${min30} câu hỏi 30 điểm (hiện có ${questionBank.questions30.length})`);
      return;
    }

    setSaving(true);

    try {
      const res = await fetch("/api/round4/state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "setQuestionBank", data: questionBank }),
      });

      const data = await res.json();
      if (res.ok) {
        alert("Lưu ngân hàng câu hỏi thành công! Các đội có thể chọn gói và hệ thống sẽ tự động lấy câu hỏi từ ngân hàng.");
        router.push("/round4/play");
      } else {
        alert(data.error || "Lỗi khi lưu ngân hàng câu hỏi");
      }
    } catch (error) {
      console.error("Save error:", error);
      alert("Lỗi khi lưu ngân hàng câu hỏi");
    } finally {
      setSaving(false);
    }
  };

  const getCurrentQuestions = () => {
    if (activeTab === 10) return questionBank.questions10;
    if (activeTab === 20) return questionBank.questions20;
    return questionBank.questions30;
  };

  const getTabInfo = () => {
    if (activeTab === 10) {
      return {
        title: "Nhóm 10 điểm",
        minRequired: 3,
      };
    } else if (activeTab === 20) {
      return {
        title: "Nhóm 20 điểm",
        minRequired: 2,
      };
    } else {
      return {
        title: "Nhóm 30 điểm",
        minRequired: 3,
      };
    }
  };

  const currentQuestions = getCurrentQuestions();
  const tabInfo = getTabInfo();
  const usedCount = currentQuestions.filter((q) => q.isUsed).length;
  const availableCount = currentQuestions.length - usedCount;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Link
            href="/control/questions"
            className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-600 transition-colors"
            title="Quay lại"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-neon-blue mb-2">
              Vòng 4: Chinh phục đỉnh cao - Admin Panel
            </h1>
            <p className="text-gray-400">
              Tạo ngân hàng câu hỏi theo mức điểm. Hệ thống sẽ tự động lấy câu hỏi từ ngân hàng khi các đội chọn gói.
            </p>
          </div>
        </div>

        {/* Package Info */}
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
          <h3 className="text-lg font-bold text-white mb-2">Cấu hình gói câu hỏi:</h3>
          <ul className="text-gray-300 space-y-1 text-sm">
            <li>• <strong>Gói 40 điểm:</strong> 2 câu 10 điểm + 1 câu 20 điểm</li>
            <li>• <strong>Gói 60 điểm:</strong> 1 câu 10 điểm + 1 câu 20 điểm + 1 câu 30 điểm</li>
            <li>• <strong>Gói 80 điểm:</strong> 1 câu 20 điểm + 2 câu 30 điểm</li>
          </ul>
          <p className="text-yellow-400 text-sm mt-2">
            ⚠️ Mỗi câu hỏi chỉ được dùng 1 lần (không trùng giữa các gói/đội). Khi reset game, các câu hỏi sẽ trở về trạng thái chưa dùng.
          </p>
        </div>

        {/* Tabs */}
        <div className="bg-slate-800/50 rounded-xl border border-slate-700">
          <div className="flex border-b border-slate-700">
            {([10, 20, 30] as const).map((points) => {
              const questions = points === 10 ? questionBank.questions10 : points === 20 ? questionBank.questions20 : questionBank.questions30;
              const tabUsedCount = questions.filter((q) => q.isUsed).length;
              const tabAvailableCount = questions.length - tabUsedCount;
              
              return (
                <button
                  key={points}
                  onClick={() => setActiveTab(points)}
                  className={`flex-1 px-6 py-4 font-semibold transition-all border-b-2 ${
                    activeTab === points
                      ? "border-neon-blue text-neon-blue bg-slate-900/50"
                      : "border-transparent text-gray-400 hover:text-gray-300 hover:bg-slate-900/30"
                  }`}
                >
                  <div className="flex items-center justify-center gap-3">
                    <span className="text-xl">{points} điểm</span>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-green-400">({tabAvailableCount})</span>
                      {tabUsedCount > 0 && (
                        <span className="text-yellow-400">Đã dùng: {tabUsedCount}</span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Tab Content */}
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-white">{tabInfo.title}</h2>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="text-sm text-gray-400">Tổng: {currentQuestions.length}</div>
                  <div className="text-sm text-green-400">Còn: {availableCount}</div>
                  {usedCount > 0 && (
                    <div className="text-sm text-yellow-400">Đã dùng: {usedCount}</div>
                  )}
                </div>
                <button
                  onClick={() => addQuestion(activeTab)}
                  className="px-4 py-2 bg-neon-blue hover:bg-neon-blue/80 text-white font-bold rounded-lg transition-colors flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Thêm câu hỏi
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {currentQuestions.length === 0 ? (
                <div className="text-center text-gray-400 py-8">
                  Chưa có câu hỏi nào. Nhấn "Thêm câu hỏi" để bắt đầu.
                </div>
              ) : (
                currentQuestions.map((q) => (
                  <div
                    key={q.id}
                    className={`bg-slate-900/50 rounded-lg p-4 border ${
                      q.isUsed
                        ? "border-yellow-500/50 opacity-60"
                        : "border-slate-600"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <span className="px-3 py-1 bg-neon-blue/20 text-neon-blue rounded-lg font-semibold">
                          {q.points} điểm - {q.timeLimitSec}s
                        </span>
                        {q.isUsed && (
                          <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded text-xs">
                            Đã dùng
                          </span>
                        )}
                      </div>
                      {!q.isUsed && (
                        <button
                          onClick={() => removeQuestion(activeTab, q.id)}
                          className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                          title="Xóa câu hỏi"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm text-gray-300 mb-1">
                          Câu hỏi:
                        </label>
                        <textarea
                          value={q.questionText}
                          onChange={(e) =>
                            updateQuestion(activeTab, q.id, "questionText", e.target.value)
                          }
                          placeholder="Nhập câu hỏi..."
                          rows={3}
                          disabled={q.isUsed}
                          className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-neon-blue disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-300 mb-1">
                          Đáp án:
                        </label>
                        <input
                          type="text"
                          value={q.answerText}
                          onChange={(e) =>
                            updateQuestion(activeTab, q.id, "answerText", e.target.value)
                          }
                          placeholder="Nhập đáp án..."
                          disabled={q.isUsed}
                          className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-neon-blue disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-300 mb-1">
                          Thời gian (giây):
                        </label>
                        <select
                          value={q.timeLimitSec}
                          onChange={(e) =>
                            updateQuestion(activeTab, q.id, "timeLimitSec", parseInt(e.target.value))
                          }
                          disabled={q.isUsed}
                          className="px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-neon-blue disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {activeTab === 10 && (
                            <>
                              <option value={10}>10 giây</option>
                              <option value={15}>15 giây</option>
                            </>
                          )}
                          {activeTab === 20 && (
                            <>
                              <option value={15}>15 giây</option>
                              <option value={20}>20 giây</option>
                            </>
                          )}
                          {activeTab === 30 && (
                            <>
                              <option value={20}>20 giây</option>
                              <option value={30}>30 giây</option>
                            </>
                          )}
                        </select>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Save button */}
        <div className="flex justify-end gap-4">
          <button
            onClick={() => router.push("/round4/play")}
            className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-lg transition-colors"
          >
            Xem màn hình game
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-3 bg-neon-blue hover:bg-neon-blue/80 text-white font-bold rounded-lg transition-colors disabled:opacity-50"
          >
            {saving ? "Đang lưu..." : "Lưu ngân hàng câu hỏi"}
          </button>
        </div>
      </div>
    </div>
  );
}
