"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, FileText } from "lucide-react";
import { RoundType } from "@/lib/types";
import { roundNames } from "@/lib/questions";

export default function QuestionsPage() {
  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link
            href="/control"
            className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg border border-gray-700 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-white">Quản lý câu hỏi</h1>
            <p className="text-sm text-gray-400 mt-1">Chọn vòng thi để quản lý câu hỏi</p>
          </div>
        </div>

        {/* Round Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(Object.keys(roundNames) as RoundType[]).map((round) => (
            <Link
              key={round}
              href={`/control/questions/${round}`}
              className="group bg-gray-800 rounded-lg p-6 border-2 border-gray-700 hover:border-neon-blue transition-all hover:shadow-lg hover:shadow-neon-blue/20"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-neon-blue/20 flex items-center justify-center group-hover:bg-neon-blue/30 transition-colors">
                  <FileText className="w-6 h-6 text-neon-blue" />
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-white mb-1">
                    {roundNames[round]}
                  </h2>
                  <p className="text-sm text-gray-400">
                    {round === "khoi-dong"
                      ? "4 gói câu hỏi, mỗi gói 12 câu"
                      : round === "vuot-chuong-ngai-vat"
                      ? "Câu hỏi trắc nghiệm với 4 phương án"
                      : round === "tang-toc"
                      ? "Câu hỏi trắc nghiệm nhanh"
                      : "Câu hỏi trắc nghiệm cuối cùng"}
                  </p>
                </div>
                <div className="text-neon-blue group-hover:translate-x-1 transition-transform">
                  →
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
