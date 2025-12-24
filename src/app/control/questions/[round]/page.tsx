"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Plus, Edit2, Trash2, Save, X } from "lucide-react";
import { Toast } from "@/components/Toast";
import { RoundType } from "@/lib/types";
import { roundNames } from "@/lib/questions";

interface Question {
  id: string;
  text: string;
  options?: Array<{ label: string; text: string }>;
  correctIndex?: number;
  points: number;
  timeLimitSec: number;
  packageNumber?: number;
  order: number;
}

export default function RoundQuestionsPage() {
  const params = useParams();
  const router = useRouter();
  const round = params.round as RoundType;

  const [packages, setPackages] = useState<Record<number, Question[]>>({
    1: [],
    2: [],
    3: [],
    4: [],
  });
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPackage, setSelectedPackage] = useState<number>(1);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const [formData, setFormData] = useState({
    text: "",
    options: [
      { label: "A", text: "" },
      { label: "B", text: "" },
      { label: "C", text: "" },
      { label: "D", text: "" },
    ],
    correctIndex: 0,
    points: round === "khoi-dong" ? 10 : round === "vuot-chuong-ngai-vat" ? 20 : round === "tang-toc" ? 30 : 40,
    timeLimitSec: round === "khoi-dong" ? 15 : round === "vuot-chuong-ngai-vat" ? 30 : round === "tang-toc" ? 20 : 30,
    packageNumber: 1,
    order: 1,
  });

  const isKhoiDong = round === "khoi-dong";

  useEffect(() => {
    if (!round || !["khoi-dong", "vuot-chuong-ngai-vat", "tang-toc", "ve-dich"].includes(round)) {
      router.push("/control/questions");
      return;
    }
    loadQuestions();
  }, [round]);

  const loadQuestions = async () => {
    try {
      setLoading(true);
      const url = isKhoiDong
        ? `/api/questions?round=${round}&packageNumber=${selectedPackage}`
        : `/api/questions?round=${round}`;
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok) {
        if (isKhoiDong) {
          setPackages(data.packages || { 1: [], 2: [], 3: [], 4: [] });
        } else {
          setQuestions(data.questions || []);
        }
      }
    } catch (error) {
      console.error("Error loading questions:", error);
      showToast("Đã có lỗi xảy ra khi tải câu hỏi", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isKhoiDong) {
      loadQuestions();
    }
  }, [selectedPackage]);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleAdd = async () => {
    try {
      const payload: any = {
        text: formData.text,
        points: formData.points,
        timeLimitSec: formData.timeLimitSec,
        round,
      };

      if (isKhoiDong) {
        payload.packageNumber = selectedPackage;
        payload.order = formData.order || getNextOrder(selectedPackage);
      } else {
        payload.options = formData.options;
        payload.correctIndex = formData.correctIndex;
        payload.order = questions.length + 1;
      }

      const res = await fetch("/api/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok) {
        showToast("Tạo câu hỏi thành công", "success");
        setShowAddForm(false);
        resetForm();
        await loadQuestions();
        // Trigger store reload by dispatching event
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("questions-updated", { detail: { round } }));
        }
      } else {
        showToast(data.error || "Đã có lỗi xảy ra", "error");
      }
    } catch (error) {
      showToast("Đã có lỗi xảy ra khi tạo câu hỏi", "error");
    }
  };

  const handleUpdate = async (id: string, updates: Partial<Question>) => {
    try {
      const res = await fetch(`/api/questions/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });

      const data = await res.json();
      if (res.ok) {
        showToast("Cập nhật câu hỏi thành công", "success");
        setEditingId(null);
        await loadQuestions();
        // Trigger store reload by dispatching event
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("questions-updated", { detail: { round } }));
        }
      } else {
        showToast(data.error || "Đã có lỗi xảy ra", "error");
      }
    } catch (error) {
      showToast("Đã có lỗi xảy ra khi cập nhật câu hỏi", "error");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bạn có chắc muốn xóa câu hỏi này?")) return;

    try {
      const res = await fetch(`/api/questions/${id}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (res.ok) {
        showToast("Xóa câu hỏi thành công", "success");
        await loadQuestions();
        // Trigger store reload by dispatching event
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("questions-updated", { detail: { round } }));
        }
      } else {
        showToast(data.error || "Đã có lỗi xảy ra", "error");
      }
    } catch (error) {
      showToast("Đã có lỗi xảy ra khi xóa câu hỏi", "error");
    }
  };

  const getNextOrder = (packageNum: number) => {
    const pkgQuestions = packages[packageNum] || [];
    if (pkgQuestions.length === 0) return 1;
    return Math.max(...pkgQuestions.map((q) => q.order)) + 1;
  };

  const resetForm = () => {
    setFormData({
      text: "",
      options: [
        { label: "A", text: "" },
        { label: "B", text: "" },
        { label: "C", text: "" },
        { label: "D", text: "" },
      ],
      correctIndex: 0,
      points: round === "khoi-dong" ? 10 : round === "vuot-chuong-ngai-vat" ? 20 : round === "tang-toc" ? 30 : 40,
      timeLimitSec: round === "khoi-dong" ? 15 : round === "vuot-chuong-ngai-vat" ? 30 : round === "tang-toc" ? 20 : 30,
      packageNumber: 1,
      order: 1,
    });
  };

  const currentQuestions = isKhoiDong
    ? (packages[selectedPackage] || []).sort((a, b) => a.order - b.order)
    : questions.sort((a, b) => a.order - b.order);

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link
              href="/control/questions"
              className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg border border-gray-700 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-white" />
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-white">
                Quản lý câu hỏi - {roundNames[round]}
              </h1>
              <p className="text-sm text-gray-400 mt-1">
                {isKhoiDong
                  ? "Quản lý câu hỏi cho 4 gói Vòng 1: Khơi nguồn năng lượng"
                  : "Quản lý câu hỏi trắc nghiệm"}
              </p>
            </div>
          </div>
        </div>

        {/* Package Selector (chỉ cho vòng khởi động) */}
        {isKhoiDong && (
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 mb-6">
            <h2 className="text-lg font-semibold text-white mb-3">Chọn gói câu hỏi</h2>
            <div className="grid grid-cols-4 gap-2">
              {[1, 2, 3, 4].map((pkg) => (
                <button
                  key={pkg}
                  onClick={() => {
                    setSelectedPackage(pkg);
                    setShowAddForm(false);
                    setEditingId(null);
                  }}
                  className={`p-3 rounded-lg font-semibold transition-all border-2 ${
                    selectedPackage === pkg
                      ? "bg-neon-blue text-white border-neon-blue shadow-lg shadow-neon-blue/50"
                      : "bg-gray-700 text-gray-200 hover:bg-gray-600 border-gray-600"
                  }`}
                >
                  Gói {pkg}
                  <div className="text-xs mt-1 opacity-80">
                    {packages[pkg]?.length || 0} / 12 câu
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Add Question Form */}
        {showAddForm && (
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 mb-6">
            <h2 className="text-lg font-semibold text-white mb-4">Thêm câu hỏi mới</h2>
            <QuestionForm
              formData={formData}
              setFormData={setFormData}
              isKhoiDong={isKhoiDong}
              selectedPackage={selectedPackage}
              nextOrder={isKhoiDong ? getNextOrder(selectedPackage) : questions.length + 1}
              onSave={handleAdd}
              onCancel={() => {
                setShowAddForm(false);
                resetForm();
              }}
            />
          </div>
        )}

        {/* Questions List */}
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">
              {isKhoiDong
                ? `Danh sách câu hỏi - Gói ${selectedPackage}`
                : "Danh sách câu hỏi"}
            </h2>
            {!showAddForm && (
              <button
                onClick={() => {
                  setShowAddForm(true);
                  if (isKhoiDong) {
                    setFormData({
                      ...formData,
                      packageNumber: selectedPackage,
                      order: getNextOrder(selectedPackage),
                    });
                  }
                }}
                className="px-4 py-2 bg-neon-purple text-white rounded-lg font-semibold hover:bg-neon-purple/90 flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Thêm câu hỏi
              </button>
            )}
          </div>

          {loading ? (
            <div className="text-center text-gray-400 py-8">Đang tải...</div>
          ) : currentQuestions.length === 0 ? (
            <div className="text-center text-gray-400 py-8">
              {isKhoiDong
                ? `Chưa có câu hỏi nào trong gói ${selectedPackage}`
                : "Chưa có câu hỏi nào"}
            </div>
          ) : (
            <div className="space-y-2">
              {currentQuestions.map((question) => (
                <QuestionItem
                  key={question.id}
                  question={question}
                  isEditing={editingId === question.id}
                  isKhoiDong={isKhoiDong}
                  onEdit={() => setEditingId(question.id)}
                  onCancel={() => setEditingId(null)}
                  onUpdate={(updates) => handleUpdate(question.id, updates)}
                  onDelete={() => handleDelete(question.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}

interface QuestionFormProps {
  formData: any;
  setFormData: (data: any) => void;
  isKhoiDong: boolean;
  selectedPackage?: number;
  nextOrder: number;
  onSave: () => void;
  onCancel: () => void;
}

function QuestionForm({
  formData,
  setFormData,
  isKhoiDong,
  selectedPackage,
  nextOrder,
  onSave,
  onCancel,
}: QuestionFormProps) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Nội dung câu hỏi
        </label>
        <textarea
          value={formData.text}
          onChange={(e) => setFormData({ ...formData, text: e.target.value })}
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-neon-blue"
          rows={3}
          placeholder="Nhập nội dung câu hỏi..."
        />
      </div>

      {!isKhoiDong && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Phương án trả lời
            </label>
            <div className="space-y-2">
              {formData.options.map((option: any, index: number) => (
                <div key={index} className="flex items-center gap-2">
                  <span className="w-8 text-center font-semibold text-gray-400">
                    {option.label}:
                  </span>
                  <input
                    type="text"
                    value={option.text}
                    onChange={(e) => {
                      const newOptions = [...formData.options];
                      newOptions[index].text = e.target.value;
                      setFormData({ ...formData, options: newOptions });
                    }}
                    className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-neon-blue"
                    placeholder={`Nhập phương án ${option.label}...`}
                  />
                </div>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Đáp án đúng
            </label>
            <select
              value={formData.correctIndex}
              onChange={(e) =>
                setFormData({ ...formData, correctIndex: parseInt(e.target.value) })
              }
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-neon-blue"
            >
              {formData.options.map((option: any, index: number) => (
                <option key={index} value={index}>
                  {option.label}: {option.text || `Phương án ${option.label}`}
                </option>
              ))}
            </select>
          </div>
        </>
      )}

      <div className={`grid ${isKhoiDong ? "grid-cols-2" : "grid-cols-3"} gap-4`}>
        {isKhoiDong && (
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Thứ tự
            </label>
            <input
              type="number"
              min="1"
              max="12"
              value={formData.order || nextOrder}
              onChange={(e) =>
                setFormData({ ...formData, order: parseInt(e.target.value) || 1 })
              }
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-neon-blue"
            />
          </div>
        )}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Điểm
          </label>
          <input
            type="number"
            min="1"
            value={formData.points}
            onChange={(e) =>
              setFormData({ ...formData, points: parseInt(e.target.value) || 10 })
            }
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-neon-blue"
          />
        </div>
        {!isKhoiDong && (
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Thời gian (giây)
          </label>
          <input
            type="number"
            min="1"
            value={formData.timeLimitSec}
            onChange={(e) =>
              setFormData({ ...formData, timeLimitSec: parseInt(e.target.value) || 15 })
            }
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-neon-blue"
          />
        </div>
        )}
      </div>
      <div className="flex gap-2">
        <button
          onClick={onSave}
          className="px-4 py-2 bg-neon-green text-white rounded-lg font-semibold hover:bg-neon-green/90 flex items-center gap-2 border-2 border-neon-green shadow-lg shadow-neon-green/30 transition-all"
        >
          <Save className="w-4 h-4" />
          Lưu
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-2 bg-gray-700 text-white rounded-lg font-semibold hover:bg-gray-600 flex items-center gap-2 border border-gray-600"
        >
          <X className="w-4 h-4" />
          Hủy
        </button>
      </div>
    </div>
  );
}

interface QuestionItemProps {
  question: Question;
  isEditing: boolean;
  isKhoiDong: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onUpdate: (updates: Partial<Question>) => void;
  onDelete: () => void;
}

function QuestionItem({
  question,
  isEditing,
  isKhoiDong,
  onEdit,
  onCancel,
  onUpdate,
  onDelete,
}: QuestionItemProps) {
  const [editData, setEditData] = useState(question);

  useEffect(() => {
    setEditData(question);
  }, [question]);

  if (isEditing) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-gray-700 rounded-lg p-4 border border-gray-600"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Nội dung câu hỏi
            </label>
            <textarea
              value={editData.text}
              onChange={(e) => setEditData({ ...editData, text: e.target.value })}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-neon-blue"
              rows={2}
            />
          </div>

          {!isKhoiDong && editData.options && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Phương án trả lời
                </label>
                <div className="space-y-2">
                  {editData.options.map((option, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <span className="w-8 text-center font-semibold text-gray-400">
                        {option.label}:
                      </span>
                      <input
                        type="text"
                        value={option.text}
                        onChange={(e) => {
                          const newOptions = [...editData.options!];
                          newOptions[index].text = e.target.value;
                          setEditData({ ...editData, options: newOptions });
                        }}
                        className="flex-1 px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-neon-blue"
                      />
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Đáp án đúng
                </label>
                <select
                  value={editData.correctIndex}
                  onChange={(e) =>
                    setEditData({ ...editData, correctIndex: parseInt(e.target.value) })
                  }
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-neon-blue"
                >
                  {editData.options.map((option, index) => (
                    <option key={index} value={index}>
                      {option.label}: {option.text}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          <div className={`grid ${isKhoiDong ? "grid-cols-2" : "grid-cols-3"} gap-4`}>
            {isKhoiDong && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Thứ tự
                </label>
                <input
                  type="number"
                  min="1"
                  max="12"
                  value={editData.order}
                  onChange={(e) =>
                    setEditData({ ...editData, order: parseInt(e.target.value) || 1 })
                  }
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-neon-blue"
                />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Điểm
              </label>
              <input
                type="number"
                min="1"
                value={editData.points}
                onChange={(e) =>
                  setEditData({ ...editData, points: parseInt(e.target.value) || 10 })
                }
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-neon-blue"
              />
            </div>
            {!isKhoiDong && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Thời gian (giây)
              </label>
              <input
                type="number"
                min="1"
                value={editData.timeLimitSec}
                onChange={(e) =>
                  setEditData({ ...editData, timeLimitSec: parseInt(e.target.value) || 15 })
                }
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-neon-blue"
              />
            </div>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => onUpdate(editData)}
              className="px-4 py-2 bg-neon-green text-white rounded-lg font-semibold hover:bg-neon-green/90 flex items-center gap-2 border-2 border-neon-green shadow-lg shadow-neon-green/30 transition-all"
            >
              <Save className="w-4 h-4" />
              Lưu
            </button>
            <button
              onClick={onCancel}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg font-semibold hover:bg-gray-500 flex items-center gap-2 border border-gray-500"
            >
              <X className="w-4 h-4" />
              Hủy
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="bg-gray-700 rounded-lg p-4 border border-gray-600 hover:border-gray-500 transition-all"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            {isKhoiDong && (
              <span className="px-2 py-1 bg-neon-blue/20 text-neon-blue rounded text-xs font-semibold">
                #{question.order}
              </span>
            )}
            <span className="text-sm text-gray-400">
              {question.points} điểm
              {!isKhoiDong && ` • ${question.timeLimitSec}s`}
            </span>
            {!isKhoiDong && question.correctIndex !== undefined && (
              <span className="px-2 py-1 bg-neon-green/20 text-neon-green rounded text-xs font-semibold">
                Đáp án: {question.options?.[question.correctIndex]?.label || "N/A"}
              </span>
            )}
          </div>
          <p className="text-white mb-2">{question.text}</p>
          {!isKhoiDong && question.options && (
            <div className="space-y-1 mt-2">
              {question.options.map((option, index) => (
                <div
                  key={index}
                  className={`text-sm px-2 py-1 rounded ${
                    index === question.correctIndex
                      ? "bg-neon-green/20 text-neon-green border border-neon-green"
                      : "text-gray-400"
                  }`}
                >
                  {option.label}: {option.text}
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={onEdit}
            className="p-2 bg-gray-600 hover:bg-gray-500 rounded-lg transition-colors"
            title="Sửa"
          >
            <Edit2 className="w-4 h-4 text-white" />
          </button>
          <button
            onClick={onDelete}
            className="p-2 bg-red-600/20 hover:bg-red-600/30 rounded-lg transition-colors border border-red-600"
            title="Xóa"
          >
            <Trash2 className="w-4 h-4 text-red-400" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

