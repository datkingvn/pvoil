"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Mic, Users, Trophy } from "lucide-react";
import { Logo } from "@/components/Logo";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-8 relative overflow-hidden">
      <div className="absolute inset-0 bg-radial-gradient bg-grid-soft opacity-80 pointer-events-none" />
      <div className="text-center space-y-8 max-w-2xl relative z-10 panel-elevated py-10 px-8">
        <Logo className="mb-8" logoClassName="w-48" />
        <motion.h1
          className="text-6xl font-bold bg-gradient-to-r from-neon-blue via-neon-purple to-neon-pink bg-clip-text text-transparent"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          Game Show
        </motion.h1>

        <motion.p
          className="text-xl text-gray-400"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          Chọn chế độ để bắt đầu
        </motion.p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
          <Link href="/login">
            <motion.div
              className="p-6 bg-gray-800 rounded-xl border-2 border-gray-700 hover:border-neon-blue transition-all cursor-pointer"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Users className="w-12 h-12 mx-auto mb-4 text-neon-blue" />
              <h2 className="text-xl font-bold mb-2">Màn hình thi</h2>
              <p className="text-sm text-gray-400">Các đội vào phòng thi</p>
            </motion.div>
          </Link>

          <Link href="/control/login">
            <motion.div
              className="p-6 bg-gray-800 rounded-xl border-2 border-gray-700 hover:border-neon-purple transition-all cursor-pointer"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Mic className="w-12 h-12 mx-auto mb-4 text-neon-purple" />
              <h2 className="text-xl font-bold mb-2">Điều khiển</h2>
              <p className="text-sm text-gray-400">Đăng nhập MC</p>
            </motion.div>
          </Link>

          <Link href="/scoreboard">
            <motion.div
              className="p-6 bg-gray-800 rounded-xl border-2 border-gray-700 hover:border-neon-green transition-all cursor-pointer"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Trophy className="w-12 h-12 mx-auto mb-4 text-neon-yellow" />
              <h2 className="text-xl font-bold mb-2">Bảng điểm</h2>
              <p className="text-sm text-gray-400">Xem kết quả</p>
            </motion.div>
          </Link>
        </div>
      </div>
    </div>
  );
}

