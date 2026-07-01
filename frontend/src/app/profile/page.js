"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import {
  RiUser3Line,
  RiSettings4Line,
  RiHistoryLine,
  RiGlobalLine,
  RiEditLine,
  RiSaveLine,
  RiCloseLine,
  RiAwardLine,
  RiArrowRightLine,
} from "react-icons/ri";
import { getMe, updateProfile, getCubeHistory } from "@/services/api";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useAuthStore } from "@/store/authStore";
import Link from "next/link";

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.5 },
  }),
};

export default function ProfilePage() {
  const router = useRouter();
  const { user, setUser, isAuthenticated, logout } = useAuthStore();
  
  const [activeTab, setActiveTab] = useState("overview");
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    display_name: "",
    country: "",
    bio: "",
  });
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }

    if (user) {
      setFormData({
        display_name: user.display_name || "",
        country: user.country || "",
        bio: user.bio || "",
      });
    }

    fetchHistory();
  }, [isAuthenticated, user, router]);

  const fetchHistory = async () => {
    try {
      setHistoryLoading(true);
      const res = await getCubeHistory(10, 0);
      setHistory(res.cubes || []);
    } catch (err) {
      console.error("Failed to fetch history:", err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    setLoading(true);
    try {
      const res = await updateProfile(formData);
      setUser(res.user);
      setIsEditing(false);
      toast.success("Profile updated");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated || !user) return null;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      {/* Header section */}
      <motion.div
        className="glass-card p-8 mb-8 relative overflow-hidden"
        initial="hidden"
        animate="visible"
        variants={fadeIn}
        custom={0}
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-amber-400/20 to-orange-500/0 rounded-bl-full pointer-events-none" />
        
        <div className="flex flex-col md:flex-row items-start md:items-center gap-6 relative z-10">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-4xl font-bold text-black border-4 border-surface-900 shadow-xl">
            {user.username.charAt(0).toUpperCase()}
          </div>
          
          <div className="flex-1">
            <h1 className="text-3xl font-bold font-display flex items-center gap-3">
              {user.display_name || user.username}
              {user.contest_rating >= 1400 && (
                <span className="badge" title="Elite Cuber">⭐</span>
              )}
            </h1>
            <div className="text-zinc-400 mt-1 flex flex-wrap gap-4 items-center text-sm">
              <span className="flex items-center gap-1">
                <RiUser3Line className="w-4 h-4" /> @{user.username}
              </span>
              {user.country && (
                <span className="flex items-center gap-1">
                  <RiGlobalLine className="w-4 h-4" /> {user.country}
                </span>
              )}
              <span className="flex items-center gap-1 text-amber-400">
                <RiAwardLine className="w-4 h-4" /> Rating: {user.contest_rating}
              </span>
            </div>
            {user.bio && (
              <div className="mt-3 text-sm text-zinc-300 max-w-2xl">
                <ReactMarkdown 
                  remarkPlugins={[remarkGfm]}
                  components={{
                    p: ({node, ...props}) => <p className="mb-2" {...props} />,
                    a: ({node, ...props}) => <a className="text-amber-400 hover:underline" {...props} />,
                    ul: ({node, ...props}) => <ul className="list-disc pl-5 mb-2" {...props} />,
                    ol: ({node, ...props}) => <ol className="list-decimal pl-5 mb-2" {...props} />,
                    h1: ({node, ...props}) => <h1 className="text-xl font-bold mb-2 mt-4 text-white" {...props} />,
                    h2: ({node, ...props}) => <h2 className="text-lg font-bold mb-2 mt-3 text-white" {...props} />,
                    h3: ({node, ...props}) => <h3 className="text-base font-bold mb-1 mt-2 text-white" {...props} />,
                    blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-amber-500/50 pl-4 italic my-2 text-zinc-400" {...props} />,
                    code: ({node, inline, ...props}) => inline ? <code className="bg-white/10 px-1 py-0.5 rounded text-amber-200 font-mono text-xs" {...props} /> : <div className="bg-black/50 p-3 rounded-lg my-2 overflow-x-auto"><code className="text-xs text-amber-200 font-mono" {...props} /></div>
                  }}
                >
                  {user.bio}
                </ReactMarkdown>
              </div>
            )}
          </div>
          
          <div className="flex gap-3 mt-4 md:mt-0">
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="btn-secondary flex items-center gap-2"
              >
                <RiEditLine className="w-4 h-4" /> Edit Profile
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={() => setIsEditing(false)}
                  className="btn-ghost"
                >
                  <RiCloseLine className="w-4 h-4" />
                </button>
                <button
                  onClick={handleSaveProfile}
                  disabled={loading}
                  className="btn-primary flex items-center gap-2"
                >
                  <RiSaveLine className="w-4 h-4" /> {loading ? "Saving..." : "Save"}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Edit Form Inline */}
        {isEditing && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="mt-6 pt-6 border-t border-white/10 grid md:grid-cols-2 gap-4"
          >
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">Display Name</label>
              <input
                type="text"
                value={formData.display_name}
                onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                className="input-field"
                placeholder="How you appear to others"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">Country</label>
              <input
                type="text"
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                className="input-field"
                placeholder="Where are you from?"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-zinc-400 mb-1">Bio</label>
              <textarea
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                className="input-field resize-none h-20"
                placeholder="Tell us about your cubing journey..."
              />
            </div>
          </motion.div>
        )}
      </motion.div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-white/5 pb-2">
        <button
          onClick={() => setActiveTab("overview")}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "overview" ? "text-amber-400 border-b-2 border-amber-400" : "text-zinc-400 hover:text-white"
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "history" ? "text-amber-400 border-b-2 border-amber-400" : "text-zinc-400 hover:text-white"
          }`}
        >
          Scan History
        </button>
        <button
          onClick={() => setActiveTab("settings")}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "settings" ? "text-amber-400 border-b-2 border-amber-400" : "text-zinc-400 hover:text-white"
          }`}
        >
          Account Settings
        </button>
      </div>

      {/* Tab Content */}
      <div className="grid lg:grid-cols-3 gap-6">
        {activeTab === "overview" && (
          <>
            <motion.div className="lg:col-span-2 space-y-6" initial="hidden" animate="visible" variants={fadeIn} custom={1}>
              <div className="glass-card p-6">
                <h2 className="text-lg font-semibold mb-4">Achievements</h2>
                {user.achievements?.length > 0 ? (
                  <div className="grid sm:grid-cols-2 gap-4">
                    {user.achievements.map((ach) => (
                      <div key={ach} className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.03] border border-white/5">
                        <div className="w-10 h-10 rounded-full bg-amber-400/20 flex items-center justify-center text-amber-400 text-xl">
                          🏆
                        </div>
                        <div>
                          <div className="text-sm font-semibold">{ach.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}</div>
                          <div className="text-xs text-zinc-400">Unlocked</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-zinc-500">No achievements yet. Keep solving!</p>
                )}
              </div>
            </motion.div>
            
            <motion.div className="space-y-6" initial="hidden" animate="visible" variants={fadeIn} custom={2}>
              <div className="glass-card p-6">
                <h2 className="text-lg font-semibold mb-4">Stats Summary</h2>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-zinc-400">Total Solves</span>
                    <span className="font-mono">{user.total_solves}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-zinc-400">Avg Time</span>
                    <span className="font-mono">{(user.avg_solve_time_ms / 1000).toFixed(2)}s</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-zinc-400">Avg Moves</span>
                    <span className="font-mono">{user.avg_move_count}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-zinc-400">Best Streak</span>
                    <span className="font-mono text-amber-400">{user.best_streak} days</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}

        {activeTab === "history" && (
          <motion.div className="lg:col-span-3 glass-card p-6" initial="hidden" animate="visible" variants={fadeIn} custom={1}>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <RiHistoryLine className="w-5 h-5 text-amber-400" /> Recent Scans
            </h2>
            
            {historyLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <div key={i} className="h-16 skeleton rounded-lg" />)}
              </div>
            ) : history.length > 0 ? (
              <div className="space-y-3">
                {history.map((item) => (
                  <div key={item.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-lg bg-white/[0.03] border border-white/5 hover:bg-white/[0.06] transition-colors gap-4">
                    <div className="flex-1 w-full">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-sm font-semibold capitalize">{item.source} Scan</div>
                        <div className="text-xs text-zinc-400 sm:hidden">
                          {new Date(item.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="font-mono text-[10px] text-zinc-400 break-all bg-black/40 p-2 rounded border border-white/5" title={item.cube_string}>
                        {item.cube_string}
                      </div>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-4">
                      <div className="text-xs text-zinc-400 hidden sm:block">
                        {new Date(item.created_at).toLocaleDateString()}
                      </div>
                      <Link 
                        href={`/cube/manual?state=${item.cube_string}`}
                        className="btn-ghost shrink-0 text-xs py-1.5 px-3 flex items-center gap-1.5"
                      >
                        Load in Manual <RiArrowRightLine className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-zinc-500 text-sm">No saved cube states found.</p>
                <Link href="/cube/scanner" className="btn-secondary text-sm mt-4 inline-block">
                  Scan a Cube
                </Link>
              </div>
            )}
          </motion.div>
        )}

        {activeTab === "settings" && (
          <motion.div className="lg:col-span-3 glass-card p-6" initial="hidden" animate="visible" variants={fadeIn} custom={1}>
            <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
              <RiSettings4Line className="w-5 h-5 text-amber-400" /> Account Settings
            </h2>
            
            <div className="max-w-md space-y-6">
              <div>
                <h3 className="text-sm font-medium text-zinc-300 mb-2">Change Password</h3>
                <Link href="/forgot-password" className="text-sm text-amber-400 hover:underline">
                  Reset password via email
                </Link>
              </div>

              <div className="pt-6 border-t border-white/10">
                <h3 className="text-sm font-medium text-red-400 mb-2">Danger Zone</h3>
                <button
                  onClick={() => {
                    if (confirm("Are you sure you want to sign out?")) {
                      logout();
                      router.push("/");
                    }
                  }}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-red-400 bg-red-400/10 hover:bg-red-400/20 border border-red-400/20 transition-colors"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
