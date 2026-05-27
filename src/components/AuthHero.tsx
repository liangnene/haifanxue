"use client";

import { motion } from "motion/react";

export function AuthHero() {
  return (
    <div className="relative z-10 w-full max-w-[560px] text-white">
      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="leading-[1.1] text-white"
        style={{
          fontFamily: "'Instrument Serif', serif",
          fontSize: "clamp(28px, 4vw, 44px)",
        }}
      >
        以思考的速度学习
      </motion.h2>

      <motion.h1
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2, duration: 0.6 }}
        className="font-semibold tracking-tighter leading-[0.9] bg-clip-text text-transparent mt-3"
        style={{
          fontFamily: "'Instrument Sans', sans-serif",
          fontSize: "clamp(72px, 12vw, 136px)",
          backgroundImage: "linear-gradient(to bottom, #fff 0%, #fff 50%, #b4c0ff 100%)",
        }}
      >
        海翻学
      </motion.h1>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.75 }}
        transition={{ delay: 0.4, duration: 0.6 }}
        className="text-white max-w-md mt-8 leading-[1.65]"
        style={{
          fontFamily: "'Instrument Sans', sans-serif",
          fontSize: "clamp(15px, 1.5vw, 18px)",
        }}
      >
        上传日语教材，获得中文笔记，考过日本国家资格考试。
      </motion.p>
    </div>
  );
}
