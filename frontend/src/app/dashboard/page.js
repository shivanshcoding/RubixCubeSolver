"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useAuthStore } from "@/store/authStore";
import { getRecentSolutions } from "@/services/api";
import {
  RiBox3Line,
  RiCameraLine,
  RiTrophyLine,
  RiBookOpenLine,
  RiTimeLine,
  RiFireLine,
  RiStarLine,
  RiFlashlightLine,
  RiArrowRightLine,
  RiCheckboxCircleLine
} from "react-icons/ri";
import { formatDistanceToNow } from "date-fns";

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.5 },
  }),
};

const QUICK_ACTIONS = [
  { href: "/cube/manual", label: "Manual Entry", icon: RiBox3Line, desc: "Enter cube stickers manually", gradient: "from-amber-400 to-orange-500" },
  { href: "/cube/scanner", label: "Camera Scan", icon: RiCameraLine, desc: "Scan with your webcam", gradient: "from-blue-500 to-cyan-400" },
  { href: "/contest", label: "Daily Challenge", icon: RiTrophyLine, desc: "Compete today", gradient: "from-green-400 to-emerald-500" },
  { href: "/learn", label: "Learn", icon: RiBookOpenLine, desc: "Cube tutorials", gradient: "from-purple-500 to-pink-500" },
];

export default function DashboardPage() {
  const { user, isAuthenticated } = useAuthStore();
  const [recentActivity, setRecentActivity] = useState([]);
  const [isLoadingActivity, setIsLoadingActivity] = useState(true);

  useEffect(() => {
    if (isAuthenticated) {
      setIsLoadingActivity(true);
      getRecentSolutions(5)
        .then((data) => setRecentActivity(data.solutions || []))
        .catch((err) => console.error("Failed to load activity", err))
        .finally(() => setIsLoadingActivity(false));
    } else {
      setIsLoadingActivity(false);
      setRecentActivity([]);
    }
  }, [isAuthenticated]);

  const stats = [
    { label: "Cubes Solved", value: user?.total_solves || 0, icon: RiBox3Line, color: "text-amber-400" },
    { label: "Avg Moves", value: user?.avg_move_count || 0, icon: RiFlashlightLine, color: "text-blue-400" },
    { label: "Avg Time", value: user?.avg_solve_time_ms ? `${(user.avg_solve_time_ms).toFixed(1)}ms` : "—", icon: RiTimeLine, color: "text-green-400" },
    { label: "Rating", value: user?.contest_rating || 1200, icon: RiStarLine, color: "text-purple-400" },
    { label: "Daily Streak", value: user?.daily_streak || 0, icon: RiFireLine, color: "text-red-400" },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <motion.div
        className="mb-8"
        initial="hidden"
        animate="visible"
        variants={fadeIn}
        custom={0}
      >
        <h1 className="text-3xl font-bold mb-1" style={{ fontFamily: "var(--font-display)" }}>
          {isAuthenticated ? `Welcome back, ${user?.display_name || user?.username || "Cuber"}` : "Dashboard"}
        </h1>
        <p className="text-zinc-400 text-sm">
          {isAuthenticated ? "Here's your solving overview" : "Sign in to track your progress"}
        </p>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-10">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.label}
              className="glass-card p-5"
              initial="hidden"
              animate="visible"
              variants={fadeIn}
              custom={i + 1}
            >
              <div className="flex items-center gap-2 mb-2">
                <Icon className={`w-4 h-4 ${stat.color}`} />
                <span className="text-xs text-zinc-500 font-medium">{stat.label}</span>
              </div>
              <div className="text-2xl font-bold">{stat.value}</div>
            </motion.div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <motion.div
        className="mb-10"
        initial="hidden"
        animate="visible"
        variants={fadeIn}
        custom={6}
      >
        <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {QUICK_ACTIONS.map((action, i) => {
            const Icon = action.icon;
            return (
              <Link key={action.href} href={action.href}>
                <motion.div
                  className="glass-card p-5 group cursor-pointer h-full"
                  whileHover={{ y: -3 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                >
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${action.gradient} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="font-semibold text-sm mb-1">{action.label}</h3>
                  <p className="text-xs text-zinc-500">{action.desc}</p>
                  <div className="mt-3 flex items-center gap-1 text-xs text-amber-400 opacity-0 group-hover:opacity-100 transition-opacity">
                    Go <RiArrowRightLine className="w-3 h-3" />
                  </div>
                </motion.div>
              </Link>
            );
          })}
        </div>
      </motion.div>

      {/* Recent Activity */}
      <motion.div
        initial="hidden"
        animate="visible"
        variants={fadeIn}
        custom={7}
      >
        <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
        
        {!isAuthenticated ? (
          <div className="glass-card p-8 text-center">
            <RiTimeLine className="w-8 h-8 text-zinc-600 mx-auto mb-3" />
            <p className="text-sm text-zinc-500 mb-4">Sign in to see your activity history</p>
            <Link href="/login" className="btn-primary inline-block text-sm">
              Sign In
            </Link>
          </div>
        ) : isLoadingActivity ? (
          <div className="glass-card p-8 text-center">
            <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-zinc-500">Loading activity...</p>
          </div>
        ) : recentActivity.length === 0 ? (
          <div className="glass-card p-8 text-center">
            <RiTimeLine className="w-8 h-8 text-zinc-600 mx-auto mb-3" />
            <p className="text-sm text-zinc-500">No recent activity yet. Solve your first cube!</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {recentActivity.map((activity, idx) => (
              <div key={activity.id || idx} className="glass-card p-4 flex flex-col hover:bg-white/[0.04] transition-colors">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center shrink-0">
                      <RiCheckboxCircleLine className="w-5 h-5 text-green-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm text-zinc-200">Cube Solved</h3>
                      <p className="text-xs text-zinc-500">
                        {activity.created_at ? formatDistanceToNow(new Date(activity.created_at), { addSuffix: true }) : "Recently"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6 text-right">
                    <div>
                      <div className="text-xs text-zinc-500 font-medium">Moves</div>
                      <div className="font-mono text-amber-400 font-bold">{activity.move_count}</div>
                    </div>
                    <div>
                      <div className="text-xs text-zinc-500 font-medium">Time</div>
                      <div className="font-mono text-amber-400 font-bold">{activity.solve_time_ms}ms</div>
                    </div>
                  </div>
                </div>
                
                {activity.cube_string && (
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mt-2 pt-3 border-t border-white/5 gap-3">
                    <div className="flex-1">
                      <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1 font-bold">Configuration</div>
                      <div className="font-mono text-[10px] text-zinc-400 break-all bg-black/40 p-2 rounded border border-white/5 line-clamp-1" title={activity.cube_string}>
                        {activity.cube_string}
                      </div>
                    </div>
                    <Link 
                      href={`/cube/solution?state=${activity.cube_string}`} 
                      className="btn-ghost shrink-0 text-xs py-1.5 px-3 flex items-center gap-1.5 self-end sm:self-auto"
                    >
                      View Solution <RiArrowRightLine className="w-3 h-3" />
                    </Link>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
