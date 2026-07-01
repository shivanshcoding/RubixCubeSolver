"use client";

import { motion } from "framer-motion";
import { useAuthStore } from "@/store/authStore";
import { RiCalendarLine, RiArrowRightLine, RiLoginBoxLine } from "react-icons/ri";
import Link from "next/link";
import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.5 } }),
};

export default function DailyPage() {
  const { isAuthenticated } = useAuthStore();
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const router = useRouter();

  const handleStartChallenge = () => {
    if (!isAuthenticated) {
      setShowLoginPrompt(true);
      return;
    }
    // Handle starting challenge for authenticated users
    toast.success("Starting daily challenge...");
    // router.push("/cube/manual?scramble=...")
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 relative">
      <motion.div initial="hidden" animate="visible" variants={fadeIn} custom={0}>
        <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: "var(--font-display)" }}>
          Daily Scramble
        </h1>
        <p className="text-zinc-400 text-sm mb-8">
          A new challenge every day. Solve it and see where you rank.
        </p>
      </motion.div>

      <motion.div initial="hidden" animate="visible" variants={fadeIn} custom={1}>
        <div className="glass-card p-8 relative overflow-hidden">
          {/* Background glow */}
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-amber-500/10 rounded-full blur-[80px] pointer-events-none" />

          <div className="flex items-center gap-4 mb-8">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/20">
              <RiCalendarLine className="w-7 h-7 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Today's Scramble</h2>
              <p className="text-sm text-zinc-400">
                {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
              </p>
            </div>
          </div>

          <div className="bg-black/40 backdrop-blur-md border border-white/10 p-6 rounded-xl mb-8 relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-amber-500/0 via-amber-500/5 to-amber-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="text-xs text-zinc-500 mb-3 font-medium uppercase tracking-wider">Algorithm</div>
            <div className="text-lg font-mono text-amber-400 leading-relaxed">
              R U R' U' R' F R2 U' R' U' R U R' F'
            </div>
          </div>

          <p className="text-base text-zinc-300 mb-8 max-w-2xl leading-relaxed">
            Apply this scramble sequence to a solved cube (white on top, green in front), then time your solve.
          </p>

          <button 
            onClick={handleStartChallenge}
            className="btn-primary py-3 px-8 text-base flex items-center gap-2 shadow-lg shadow-amber-500/20"
          >
            Start Challenge
            <RiArrowRightLine className="w-5 h-5" />
          </button>
        </div>
      </motion.div>

      {/* Login Prompt Overlay */}
      {showLoginPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card max-w-md w-full p-8 relative"
          >
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-amber-500/20 rounded-full blur-[40px] pointer-events-none" />
            
            <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mb-6">
              <RiLoginBoxLine className="w-6 h-6 text-amber-400" />
            </div>
            
            <h3 className="text-xl font-bold text-white mb-2">Login Required</h3>
            <p className="text-zinc-400 text-sm mb-6">
              Create an account or log in to track your time, submit your results to the leaderboard, and save your daily streak!
            </p>
            
            <div className="flex items-center gap-3">
              <button 
                onClick={() => router.push("/login")}
                className="btn-primary flex-1 py-2.5"
              >
                Log In
              </button>
              <button 
                onClick={() => router.push("/signup")}
                className="btn-secondary flex-1 py-2.5 bg-white/5 hover:bg-white/10"
              >
                Sign Up
              </button>
            </div>
            
            <button 
              onClick={() => setShowLoginPrompt(false)}
              className="mt-4 w-full text-center text-sm text-zinc-500 hover:text-white transition-colors"
            >
              Cancel
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
}
