"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import Link from "next/link";
import {
  RiTrophyLine, RiTimeLine, RiCalendarLine,
  RiMedalLine, RiGlobalLine, RiArrowRightLine,
} from "react-icons/ri";
import { getDailyScramble, getWeekendContest, getGlobalLeaderboard } from "@/services/api";
import { useAuthStore } from "@/store/authStore";

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: (i) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.5 } }),
};

export default function ContestPage() {
  const { isAuthenticated } = useAuthStore();
  const [activeTab, setActiveTab] = useState("weekend");

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <motion.div initial="hidden" animate="visible" variants={fadeIn} custom={0}>
        <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: "var(--font-display)" }}>
          Competitions
        </h1>
        <p className="text-zinc-400 text-sm mb-6">
          Compete in weekend contests and climb the leaderboard.
        </p>
      </motion.div>

      {/* Tabs */}
      <div className="flex gap-2 mb-8">
        {[
          { id: "weekend", label: "Weekend Contest", icon: RiTrophyLine },
          { id: "leaderboard", label: "Leaderboard", icon: RiGlobalLine },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? "bg-amber-400/15 text-amber-400 border border-amber-400/30"
                  : "text-zinc-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Weekend Tab */}
      {activeTab === "weekend" && <WeekendSection />}

      {/* Leaderboard Tab */}
      {activeTab === "leaderboard" && <LeaderboardSection />}
    </div>
  );
}

function WeekendSection() {
  return (
    <motion.div initial="hidden" animate="visible" variants={fadeIn} custom={1}>
      <div className="glass-card p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center">
            <RiTrophyLine className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Weekend Contest</h2>
            <p className="text-sm text-zinc-400">Every Saturday & Sunday</p>
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-4 mb-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass p-4 rounded-xl">
              <div className="text-xs text-zinc-500 mb-1">Scramble {i}</div>
              <div className="text-xs font-mono text-zinc-300">Loading...</div>
            </div>
          ))}
        </div>

        <p className="text-sm text-zinc-400">
          Complete all 3 scrambles. Your total time determines your ranking.
          Rating changes based on ELO system.
        </p>
      </div>
    </motion.div>
  );
}

function LeaderboardSection() {
  return (
    <motion.div initial="hidden" animate="visible" variants={fadeIn} custom={1}>
      <div className="glass-card overflow-hidden">
        <div className="p-6 border-b border-white/5">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <RiGlobalLine className="w-5 h-5 text-amber-400" />
            Global Leaderboard
          </h2>
        </div>

        <div className="p-6">
          {/* Table Header */}
          <div className="grid grid-cols-5 gap-4 text-xs text-zinc-500 font-medium mb-4 px-4">
            <span>Rank</span>
            <span className="col-span-2">Player</span>
            <span>Rating</span>
            <span>Solves</span>
          </div>

          {/* Placeholder rows */}
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="grid grid-cols-5 gap-4 px-4 py-3 rounded-lg hover:bg-white/[0.03] transition-colors items-center"
            >
              <span className={`text-sm font-bold ${i < 3 ? "text-amber-400" : "text-zinc-500"}`}>
                #{i + 1}
              </span>
              <div className="col-span-2 flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-zinc-700 skeleton" />
                <div className="skeleton h-4 w-24 rounded" />
              </div>
              <div className="skeleton h-4 w-12 rounded" />
              <div className="skeleton h-4 w-8 rounded" />
            </div>
          ))}

          <p className="text-center text-sm text-zinc-500 mt-6">
            Sign in and start solving to appear on the leaderboard.
          </p>
        </div>
      </div>
    </motion.div>
  );
}
