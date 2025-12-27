"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Plus, Edit2, Trash2, Save, X, Video, Upload, Loader2, Trash } from "lucide-react";
import { Toast } from "@/components/Toast";
import { RoundType } from "@/lib/types";
import { roundNames } from "@/lib/questions";
import {
  normalizeKeyword,
  countKeywordLetters,
  countAnswerWords,
} from "@/lib/round2/helpers";
import { Round2Config, Round2Question } from "@/lib/round2/types";
import { Round3Config, Round3Question } from "@/lib/round3/types";

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
  const isVuotChuongNgaiVat = round === "vuot-chuong-ngai-vat";
  const isTangToc = round === "tang-toc";

  // Round2 state
  const [imageUrl, setImageUrl] = useState("");
  const [imagePreview, setImagePreview] = useState("");
  const [keywordAnswer, setKeywordAnswer] = useState("");
  const [round2Questions, setRound2Questions] = useState<Round2Question[]>([
    { id: 1, questionText: "", answerText: "", answerWordCount: 0, tileStatus: "hidden" },
    { id: 2, questionText: "", answerText: "", answerWordCount: 0, tileStatus: "hidden" },
    { id: 3, questionText: "", answerText: "", answerWordCount: 0, tileStatus: "hidden" },
    { id: 4, questionText: "", answerText: "", answerWordCount: 0, tileStatus: "hidden" },
  ]);
  const [uploading, setUploading] = useState(false);
  const [savingRound2, setSavingRound2] = useState(false);

  // Round3 state
  const [round3Questions, setRound3Questions] = useState<Round3Question[]>([
    { id: 1, questionText: "", answerText: "", questionType: "suy-luan", order: 1, steps: [] },
    { id: 2, questionText: "", answerText: "", questionType: "suy-luan", order: 2, steps: [] },
    { id: 3, questionText: "", answerText: "", questionType: "suy-luan", order: 3, steps: [] },
    { id: 4, questionText: "", answerText: "", questionType: "suy-luan", order: 4, steps: [] },
  ]);
  const [savingRound3, setSavingRound3] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState<Record<number, boolean>>({});

  useEffect(() => {
    if (!round || !["khoi-dong", "vuot-chuong-ngai-vat", "tang-toc", "ve-dich"].includes(round)) {
      router.push("/control/questions");
      return;
    }
    
    if (isVuotChuongNgaiVat) {
      loadRound2Config();
    } else if (isTangToc) {
      loadRound3Config();
    } else {
      loadQuestions();
    }
  }, [round]);

  const loadRound2Config = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/round2/state");
      const data = await res.json();
      if (res.ok && data.config) {
        setImageUrl(data.config.imageOriginalUrl);
        setImagePreview(data.config.imageOriginalUrl);
        setKeywordAnswer(data.config.keywordAnswer);
        setRound2Questions(data.config.questions);
      }
      // Load teams nếu chưa có
      if (!data.teams || data.teams.length === 0) {
        fetch("/api/round2/state", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "loadTeams" }),
        }).catch(console.error);
      }
    } catch (error) {
      console.error("Error loading round2 config:", error);
      showToast("Đã có lỗi xảy ra khi tải config", "error");
    } finally {
      setLoading(false);
    }
  };

  const loadRound3Config = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/round3/state");
      const data = await res.json();
      if (res.ok && data.config) {
        setRound3Questions(data.config.questions);
      }
      // Load teams nếu chưa có
      if (!data.teams || data.teams.length === 0) {
        fetch("/api/round3/state", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "loadTeams" }),
        }).catch(console.error);
      }
    } catch (error) {
      console.error("Error loading round3 config:", error);
      showToast("Đã có lỗi xảy ra khi tải config", "error");
    } finally {
      setLoading(false);
    }
  };

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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/round2/upload-image", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (res.ok) {
        setImageUrl(data.url);
        setImagePreview(data.url);
        showToast("Upload ảnh thành công", "success");
      } else {
        showToast(data.error || "Lỗi khi upload ảnh", "error");
      }
    } catch (error) {
      console.error("Upload error:", error);
      showToast("Lỗi khi upload ảnh", "error");
    } finally {
      setUploading(false);
    }
  };

  const updateRound2Question = (id: 1 | 2 | 3 | 4, field: "questionText" | "answerText", value: string) => {
    setRound2Questions((prev) =>
      prev.map((q) => {
        if (q.id === id) {
          const updated = { ...q, [field]: value };
          if (field === "answerText") {
            updated.answerWordCount = countAnswerWords(value);
          }
          return updated;
        }
        return q;
      })
    );
  };

  const updateRound3Question = (id: 1 | 2 | 3 | 4, field: "questionText" | "answerText" | "questionType" | "videoUrl", value: string) => {
    setRound3Questions((prev) =>
      prev.map((q) => {
        if (q.id === id) {
          const updated = { ...q, [field]: value };
          // Nếu đổi loại câu hỏi, reset steps nếu không phải sap-xep
          if (field === "questionType" && value !== "sap-xep") {
            updated.steps = [];
          }
          // Nếu đổi sang sap-xep và chưa có steps, khởi tạo
          if (field === "questionType" && value === "sap-xep" && (!updated.steps || updated.steps.length === 0)) {
            updated.steps = [
              { label: "A", text: "" },
              { label: "B", text: "" },
              { label: "C", text: "" },
              { label: "D", text: "" },
            ];
          }
          return updated;
        }
        return q;
      })
    );
  };

  const updateRound3QuestionStep = (questionId: 1 | 2 | 3 | 4, stepIndex: number, field: "label" | "text", value: string) => {
    setRound3Questions((prev) =>
      prev.map((q) => {
        if (q.id === questionId && q.steps) {
          const newSteps = [...q.steps];
          newSteps[stepIndex] = { ...newSteps[stepIndex], [field]: value };
          return { ...q, steps: newSteps };
        }
        return q;
      })
    );
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>, questionId: 1 | 2 | 3 | 4) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingVideo((prev) => ({ ...prev, [questionId]: true }));
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/round3/upload-video", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (res.ok) {
        updateRound3Question(questionId, "videoUrl", data.url);
        showToast("Upload video thành công", "success");
      } else {
        showToast(data.error || "Lỗi khi upload video", "error");
      }
    } catch (error) {
      console.error("Upload error:", error);
      showToast("Lỗi khi upload video", "error");
    } finally {
      setUploadingVideo((prev) => ({ ...prev, [questionId]: false }));
    }
  };

  const handleSaveRound2 = async () => {
    if (!imageUrl) {
      showToast("Vui lòng upload ảnh", "error");
      return;
    }
    if (!keywordAnswer.trim()) {
      showToast("Vui lòng nhập từ khóa đáp án", "error");
      return;
    }
    if (round2Questions.some((q) => !q.questionText.trim() || !q.answerText.trim())) {
      showToast("Vui lòng điền đầy đủ 4 câu hỏi và đáp án", "error");
      return;
    }

    setSavingRound2(true);

    const keywordNormalized = normalizeKeyword(keywordAnswer);
    const keywordLength = countKeywordLetters(keywordAnswer);

    // Đảm bảo tất cả tiles đều có status = "hidden" khi tạo config mới
    const config: Round2Config = {
      imageOriginalUrl: imageUrl,
      keywordAnswer: keywordAnswer.trim(),
      keywordNormalized,
      keywordLength,
      questions: round2Questions.map((q) => ({
        ...q,
        tileStatus: "hidden" as const,
      })),
    };

    try {
      const res = await fetch("/api/round2/state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "setConfig", data: config }),
      });

      const data = await res.json();
      if (res.ok) {
        showToast("Lưu config thành công!", "success");
        // Trigger store reload
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("questions-updated", { detail: { round } }));
        }
      } else {
        showToast(data.error || "Lỗi khi lưu config", "error");
      }
    } catch (error) {
      console.error("Save error:", error);
      showToast("Lỗi khi lưu config", "error");
    } finally {
      setSavingRound2(false);
    }
  };

  const handleSaveRound3 = async () => {
    // Validate
    if (round3Questions.some((q) => !q.questionText.trim() || !q.answerText.trim())) {
      showToast("Vui lòng điền đầy đủ câu hỏi và đáp án cho tất cả 4 câu", "error");
      return;
    }

    setSavingRound3(true);
    try {
      const config: Round3Config = {
        questions: round3Questions,
      };

      const res = await fetch("/api/round3/state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "setConfig",
          data: config,
        }),
      });

      if (res.ok) {
        showToast("Đã lưu config thành công!", "success");
        // Dispatch event để control page reload
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("questions-updated", { detail: { round } }));
        }
      } else {
        const errorData = await res.json();
        showToast(errorData.error || "Lỗi khi lưu config", "error");
      }
    } catch (error) {
      console.error("Error saving round3 config:", error);
      showToast("Đã có lỗi xảy ra khi lưu config", "error");
    } finally {
      setSavingRound3(false);
    }
  };

  const currentQuestions = isKhoiDong
    ? (packages[selectedPackage] || []).sort((a, b) => a.order - b.order)
    : questions.sort((a, b) => a.order - b.order);

  const keywordLength = keywordAnswer ? countKeywordLetters(keywordAnswer) : 0;

  // Render Round2 admin UI
  if (isVuotChuongNgaiVat) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center gap-4 mb-6">
            <Link
              href="/control/questions"
              className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg border border-gray-700 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-white" />
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-neon-blue">
                Quản lý câu hỏi - {roundNames[round]}
              </h1>
              <p className="text-sm text-gray-400 mt-1">
                Vòng 2: Hành trình giọt dầu - Upload ảnh và tạo 4 câu hỏi
              </p>
            </div>
          </div>

          {/* Image upload */}
          <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
            <h2 className="text-xl font-bold text-white mb-4">Upload ảnh gốc</h2>
            <div className="space-y-4">
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleImageUpload}
                disabled={uploading}
                className="block w-full text-sm text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-neon-blue file:text-white hover:file:bg-neon-blue/80 disabled:opacity-50"
              />
              {uploading && <div className="text-gray-400">Đang upload...</div>}
              {imagePreview && (
                <div className="mt-4">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="max-w-md rounded-lg border border-slate-600"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Keyword answer */}
          <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
            <h2 className="text-xl font-bold text-white mb-4">Từ khóa đáp án (Chướng ngại vật)</h2>
            <div className="space-y-2">
              <input
                type="text"
                value={keywordAnswer}
                onChange={(e) => setKeywordAnswer(e.target.value)}
                placeholder="VD: PVOIL VUNG ANG"
                className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-neon-blue"
              />
              <div className="text-gray-400 text-sm">
                Số chữ cái: <span className="text-neon-blue font-bold">{keywordLength}</span>
              </div>
            </div>
          </div>

          {/* Questions */}
          <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
            <h2 className="text-xl font-bold text-white mb-4">4 Câu hỏi (tương ứng tile 1-4)</h2>
            <div className="space-y-6">
              {round2Questions.map((q) => (
                <div key={q.id} className="bg-slate-900/50 rounded-lg p-4 border border-slate-600">
                  <h3 className="text-lg font-semibold text-neon-blue mb-3">
                    Tile {q.id}
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm text-gray-300 mb-1">Câu hỏi:</label>
                      <textarea
                        value={q.questionText}
                        onChange={(e) => updateRound2Question(q.id, "questionText", e.target.value)}
                        placeholder="Nhập câu hỏi..."
                        rows={2}
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-neon-blue"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-300 mb-1">Đáp án:</label>
                      <input
                        type="text"
                        value={q.answerText}
                        onChange={(e) => updateRound2Question(q.id, "answerText", e.target.value)}
                        placeholder="Nhập đáp án..."
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-neon-blue"
                      />
                      <div className="text-gray-400 text-xs mt-1">
                        Số chữ cái: <span className="text-neon-blue font-bold">{q.answerWordCount}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Save button */}
          <div className="flex justify-end gap-4">
            <button
              onClick={() => {
                // Mở màn hình stage (cho các đội thi xem) trong tab mới
                window.open("/stage", "_blank");
              }}
              disabled={!imageUrl || !keywordAnswer.trim()}
              className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title={!imageUrl || !keywordAnswer.trim() ? "Vui lòng upload ảnh và nhập keyword trước" : "Mở màn hình stage (cho các đội thi) trong tab mới"}
            >
              Xem màn hình stage
            </button>
            <button
              onClick={() => {
                // Mở màn hình control/play riêng cho MC trong tab mới
                window.open("/round2/play", "_blank");
              }}
              disabled={!imageUrl || !keywordAnswer.trim()}
              className="px-6 py-3 bg-purple-700 hover:bg-purple-600 text-white font-bold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title={!imageUrl || !keywordAnswer.trim() ? "Vui lòng upload ảnh và nhập keyword trước" : "Mở màn hình control (cho MC) trong tab mới"}
            >
              Màn hình control
            </button>
            <button
              onClick={handleSaveRound2}
              disabled={savingRound2}
              className="px-6 py-3 bg-neon-blue hover:bg-neon-blue/80 text-white font-bold rounded-lg transition-colors disabled:opacity-50"
            >
              {savingRound2 ? "Đang lưu..." : "Lưu config"}
            </button>
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

  // Render Round3 admin UI
  if (isTangToc) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center gap-4 mb-6">
            <Link
              href="/control/questions"
              className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg border border-gray-700 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-white" />
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-neon-blue">
                Quản lý câu hỏi - {roundNames[round]}
              </h1>
              <p className="text-sm text-gray-400 mt-1">
                Vòng 3: Tăng tốc vận hành - Tạo 4 câu hỏi (30 giây mỗi câu)
              </p>
            </div>
          </div>

          {/* Questions */}
          <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
            <h2 className="text-xl font-bold text-white mb-4">4 Câu hỏi</h2>
            <div className="space-y-6">
              {round3Questions.map((q) => (
                <div key={q.id} className="bg-slate-900/50 rounded-lg p-4 border border-slate-600">
                  <h3 className="text-lg font-semibold text-neon-blue mb-3">
                    Câu {q.order}
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm text-gray-300 mb-1">Loại câu hỏi:</label>
                      <select
                        value={q.questionType}
                        onChange={(e) => updateRound3Question(q.id, "questionType", e.target.value)}
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-neon-blue"
                      >
                        <option value="suy-luan">Câu hỏi suy luận</option>
                        <option value="doan-bang">Câu hỏi đoạn băng</option>
                        <option value="sap-xep">Câu hỏi sắp xếp</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-300 mb-1">Câu hỏi:</label>
                      <textarea
                        value={q.questionText}
                        onChange={(e) => updateRound3Question(q.id, "questionText", e.target.value)}
                        placeholder="Nhập câu hỏi..."
                        rows={3}
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-neon-blue"
                      />
                    </div>
                    {q.questionType !== "sap-xep" && (
                      <div>
                        <label className="block text-sm text-gray-300 mb-1">Đáp án:</label>
                        <input
                          type="text"
                          value={q.answerText}
                          onChange={(e) => updateRound3Question(q.id, "answerText", e.target.value)}
                          placeholder="Nhập đáp án chính xác (chú ý chính tả)..."
                          className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-neon-blue"
                        />
                        <div className="text-gray-400 text-xs mt-1">
                          💡 Câu trả lời phải chính xác về chính tả. Câu trả lời tương đồng cũng được chấp nhận.
                        </div>
                      </div>
                    )}
                    {q.questionType === "doan-bang" && (
                      <div className="mt-4 p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                        <label className="flex items-center gap-2 text-sm font-semibold text-neon-blue mb-3">
                          <Video className="w-4 h-4" />
                          Video đoạn băng
                        </label>
                        <div className="space-y-3">
                          {!q.videoUrl ? (
                            <div className="relative">
                              <input
                                type="file"
                                accept="video/mp4,video/webm,video/quicktime,video/x-msvideo"
                                onChange={(e) => handleVideoUpload(e, q.id)}
                                disabled={uploadingVideo[q.id]}
                                id={`video-upload-${q.id}`}
                                className="hidden"
                              />
                              <label
                                htmlFor={`video-upload-${q.id}`}
                                className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer transition-all ${
                                  uploadingVideo[q.id]
                                    ? "border-yellow-500 bg-yellow-500/10"
                                    : "border-neon-blue/50 bg-slate-900/50 hover:border-neon-blue hover:bg-slate-900/70"
                                }`}
                              >
                                {uploadingVideo[q.id] ? (
                                  <div className="flex flex-col items-center gap-2">
                                    <Loader2 className="w-8 h-8 text-yellow-400 animate-spin" />
                                    <span className="text-sm text-yellow-400 font-medium">
                                      Đang upload video...
                                    </span>
                                  </div>
                                ) : (
                                  <div className="flex flex-col items-center gap-2">
                                    <div className="p-3 bg-neon-blue/20 rounded-full">
                                      <Upload className="w-6 h-6 text-neon-blue" />
                                    </div>
                                    <div className="text-center">
                                      <span className="text-sm font-medium text-white">
                                        Nhấn để chọn video
                                      </span>
                                      <p className="text-xs text-gray-400 mt-1">
                                        MP4, WebM, MOV, AVI (tối đa 100MB)
                                      </p>
                                    </div>
                                  </div>
                                )}
                              </label>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              <div className="relative group">
                                <video
                                  src={q.videoUrl}
                                  controls
                                  className="w-full rounded-lg border-2 border-neon-blue/30 shadow-lg shadow-neon-blue/10"
                                  style={{ maxHeight: "400px" }}
                                >
                                  Trình duyệt của bạn không hỗ trợ video.
                                </video>
                                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button
                                    type="button"
                                    onClick={() => updateRound3Question(q.id, "videoUrl", "")}
                                    className="p-2 bg-red-600/90 hover:bg-red-600 text-white rounded-lg shadow-lg transition-colors flex items-center gap-1"
                                    title="Xóa video"
                                  >
                                    <Trash className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                              <div className="flex items-center justify-between p-2 bg-green-900/20 border border-green-500/30 rounded-lg">
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                                  <span className="text-xs text-green-400 font-medium">
                                    Video đã được tải lên
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => updateRound3Question(q.id, "videoUrl", "")}
                                  className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 transition-colors"
                                >
                                  <Trash className="w-3 h-3" />
                                  Xóa
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    {q.questionType === "sap-xep" && (
                      <div className="mt-4 p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                        <label className="flex items-center gap-2 text-sm font-semibold text-neon-blue mb-3">
                          <span>📋</span>
                          Các bước cần sắp xếp
                        </label>
                        <div className="space-y-3">
                          {q.steps && q.steps.length > 0 ? (
                            q.steps.map((step, stepIndex) => (
                              <div key={stepIndex} className="flex items-center gap-3">
                                <div className="w-10 h-10 flex items-center justify-center bg-neon-blue/20 border border-neon-blue rounded-lg font-bold text-neon-blue flex-shrink-0">
                                  {step.label}
                                </div>
                                <input
                                  type="text"
                                  value={step.text}
                                  onChange={(e) => updateRound3QuestionStep(q.id, stepIndex, "text", e.target.value)}
                                  placeholder={`Nhập nội dung bước ${step.label}...`}
                                  className="flex-1 px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-neon-blue"
                                />
                              </div>
                            ))
                          ) : (
                            <div className="text-gray-400 text-sm italic">
                              Chọn loại "Câu hỏi sắp xếp" để hiển thị các bước
                            </div>
                          )}
                          {q.steps && q.steps.length > 0 && (
                            <div className="mt-4 pt-4 border-t border-slate-700">
                              <label className="block text-sm font-semibold text-neon-blue mb-2">
                                Đáp án (thứ tự đúng):
                              </label>
                              <input
                                type="text"
                                value={q.answerText}
                                onChange={(e) => updateRound3Question(q.id, "answerText", e.target.value.toUpperCase().replace(/[^ABCD]/g, ""))}
                                placeholder="VD: ACDB"
                                maxLength={4}
                                className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-neon-blue font-mono text-lg"
                              />
                              <div className="text-gray-400 text-xs mt-2">
                                💡 Nhập thứ tự đúng của các bước (ví dụ: ACDB nghĩa là A → C → D → B)
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-4">
            <button
              onClick={handleSaveRound3}
              disabled={savingRound3}
              className="px-6 py-3 bg-neon-blue hover:bg-neon-blue/80 text-white font-bold rounded-lg transition-colors disabled:opacity-50"
            >
              {savingRound3 ? "Đang lưu..." : "Lưu config"}
            </button>
          </div>

          {toast && (
            <Toast
              message={toast.message}
              type={toast.type}
              onClose={() => setToast(null)}
            />
          )}
        </div>
      </div>
    );
  }

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

