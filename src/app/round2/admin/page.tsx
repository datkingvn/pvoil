"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  normalizeKeyword,
  countKeywordLetters,
  countAnswerWords,
} from "@/lib/round2/helpers";
import { Round2Config, Round2Question } from "@/lib/round2/types";

export default function Round2AdminPage() {
  const router = useRouter();
  const [imageUrl, setImageUrl] = useState("");
  const [imagePreview, setImagePreview] = useState("");
  const [keywordAnswer, setKeywordAnswer] = useState("");
  const [questions, setQuestions] = useState<Round2Question[]>([
    { id: 1, questionText: "", answerText: "", answerWordCount: 0, tileStatus: "hidden" },
    { id: 2, questionText: "", answerText: "", answerWordCount: 0, tileStatus: "hidden" },
    { id: 3, questionText: "", answerText: "", answerWordCount: 0, tileStatus: "hidden" },
    { id: 4, questionText: "", answerText: "", answerWordCount: 0, tileStatus: "hidden" },
  ]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Load existing config và teams nếu có
  useEffect(() => {
    fetch("/api/round2/state")
      .then((res) => res.json())
      .then((data) => {
        if (data.config) {
          setImageUrl(data.config.imageOriginalUrl);
          setImagePreview(data.config.imageOriginalUrl);
          setKeywordAnswer(data.config.keywordAnswer);
          setQuestions(data.config.questions);
        }
        // Load teams nếu chưa có
        if (!data.teams || data.teams.length === 0) {
          fetch("/api/round2/state", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "loadTeams" }),
          }).catch(console.error);
        }
      })
      .catch(console.error);
  }, []);

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
      } else {
        alert(data.error || "Lỗi khi upload ảnh");
      }
    } catch (error) {
      console.error("Upload error:", error);
      alert("Lỗi khi upload ảnh");
    } finally {
      setUploading(false);
    }
  };

  const updateQuestion = (id: 1 | 2 | 3 | 4, field: "questionText" | "answerText", value: string) => {
    setQuestions((prev) =>
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

  const handleSave = async () => {
    if (!imageUrl) {
      alert("Vui lòng upload ảnh");
      return;
    }
    if (!keywordAnswer.trim()) {
      alert("Vui lòng nhập từ khóa đáp án");
      return;
    }
    if (questions.some((q) => !q.questionText.trim() || !q.answerText.trim())) {
      alert("Vui lòng điền đầy đủ 4 câu hỏi và đáp án");
      return;
    }

    setSaving(true);

    const keywordNormalized = normalizeKeyword(keywordAnswer);
    const keywordLength = countKeywordLetters(keywordAnswer);

    const config: Round2Config = {
      imageOriginalUrl: imageUrl,
      keywordAnswer: keywordAnswer.trim(),
      keywordNormalized,
      keywordLength,
      questions,
    };

    try {
      const res = await fetch("/api/round2/state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "setConfig", data: config }),
      });

      const data = await res.json();
      if (res.ok) {
        alert("Lưu thành công! Chuyển đến màn hình game...");
        router.push("/round2/play");
      } else {
        alert(data.error || "Lỗi khi lưu config");
      }
    } catch (error) {
      console.error("Save error:", error);
      alert("Lỗi khi lưu config");
    } finally {
      setSaving(false);
    }
  };

  const keywordLength = keywordAnswer ? countKeywordLetters(keywordAnswer) : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold text-neon-blue mb-6">
          Vòng 2: Hành trình giọt dầu - Admin Panel
        </h1>

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
            {questions.map((q) => (
              <div key={q.id} className="bg-slate-900/50 rounded-lg p-4 border border-slate-600">
                <h3 className="text-lg font-semibold text-neon-blue mb-3">
                  Tile {q.id}
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm text-gray-300 mb-1">Câu hỏi:</label>
                    <textarea
                      value={q.questionText}
                      onChange={(e) => updateQuestion(q.id, "questionText", e.target.value)}
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
                      onChange={(e) => updateQuestion(q.id, "answerText", e.target.value)}
                      placeholder="Nhập đáp án..."
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-neon-blue"
                    />
                    <div className="text-gray-400 text-xs mt-1">
                      Số từ: <span className="text-neon-blue font-bold">{q.answerWordCount}</span>
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
            onClick={() => router.push("/round2/play")}
            className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-lg transition-colors"
          >
            Xem màn hình game
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-3 bg-neon-blue hover:bg-neon-blue/80 text-white font-bold rounded-lg transition-colors disabled:opacity-50"
          >
            {saving ? "Đang lưu..." : "Lưu và chuyển đến game"}
          </button>
        </div>
      </div>
    </div>
  );
}

