"use client";

import Image from "next/image";
import { motion } from "framer-motion";

interface LogoProps {
  className?: string;
  logoClassName?: string;
  textClassName?: string;
  showText?: boolean;
}

export function Logo({ 
  className = "", 
  logoClassName = "", 
  textClassName = "",
  showText = true 
}: LogoProps) {
  return (
    <motion.div
      className={`flex flex-col items-center justify-center ${className}`}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className={`relative ${logoClassName}`}>
        <Image
          src="/logo.png"
          alt="PVOIL Logo"
          width={200}
          height={100}
          className="object-contain"
          priority
        />
      </div>
      {showText && (
        <motion.p
          className={`text-lg font-semibold text-white mt-2 ${textClassName}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          PVOIL VŨNG ÁNG
        </motion.p>
      )}
    </motion.div>
  );
}

