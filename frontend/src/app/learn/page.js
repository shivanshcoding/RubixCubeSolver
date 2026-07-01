"use client";

import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import {
  RiBookOpenLine, RiArrowRightLine, RiInformationLine,
} from "react-icons/ri";

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: (i) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.5 } }),
};

const NOTATION = [
  { move: "R", desc: "Right face 90° clockwise", color: "#ef4444" },
  { move: "R'", desc: "Right face 90° counter-clockwise", color: "#ef4444" },
  { move: "R2", desc: "Right face 180°", color: "#ef4444" },
  { move: "L", desc: "Left face 90° clockwise", color: "#f97316" },
  { move: "L'", desc: "Left face 90° counter-clockwise", color: "#f97316" },
  { move: "U", desc: "Up face 90° clockwise", color: "#ffffff" },
  { move: "U'", desc: "Up face 90° counter-clockwise", color: "#ffffff" },
  { move: "D", desc: "Down face 90° clockwise", color: "#ffff00" },
  { move: "D'", desc: "Down face 90° counter-clockwise", color: "#ffff00" },
  { move: "F", desc: "Front face 90° clockwise", color: "#22c55e" },
  { move: "F'", desc: "Front face 90° counter-clockwise", color: "#22c55e" },
  { move: "B", desc: "Back face 90° clockwise", color: "#3b82f6" },
  { move: "B'", desc: "Back face 90° counter-clockwise", color: "#3b82f6" },
];

const BEGINNER_STEPS = [
  { title: "White Cross", desc: "Form a cross on the white face, aligning edge colors with center pieces." },
  { title: "White Corners", desc: "Insert the four corner pieces to complete the white face." },
  { title: "Middle Layer", desc: "Solve the middle layer edges using insertion algorithms." },
  { title: "Yellow Cross", desc: "Form a cross on the yellow face (may need F R U R' U' F')." },
  { title: "Yellow Face", desc: "Orient all yellow pieces on the top face." },
  { title: "Position Corners", desc: "Move corners to correct positions." },
  { title: "Position Edges", desc: "Cycle the last edges to complete the cube." },
];

import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";

export default function LearnPage() {
  const [activeTab, setActiveTab] = useState("notation");
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const { isAuthenticated } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) {
      const timer = setTimeout(() => {
        setShowLoginPrompt(true);
      }, 10000); // 10 seconds delay
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated]);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <motion.div initial="hidden" animate="visible" variants={fadeIn} custom={0}>
        <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: "var(--font-display)" }}>
          Learning Center
        </h1>
        <p className="text-zinc-400 text-sm mb-6">Master Rubik&apos;s Cube notation and solving techniques.</p>
      </motion.div>

      {/* Tab Switcher */}
      <div className="flex gap-2 mb-8">
        {[
          { id: "notation", label: "Cube Notation" },
          { id: "beginner", label: "Beginner Guide" },
          { id: "advanced", label: "Advanced Tips" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.id
                ? "bg-amber-400/15 text-amber-400 border border-amber-400/30"
                : "text-zinc-400 hover:text-white hover:bg-white/5"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Notation Tab */}
      {activeTab === "notation" && (
        <motion.div initial="hidden" animate="visible" variants={fadeIn} custom={1}>
          <div className="glass-card p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <RiInformationLine className="w-5 h-5 text-amber-400" />
              <h2 className="text-lg font-semibold">Cube Notation Guide</h2>
            </div>
            <p className="text-sm text-zinc-400 mb-2">
              Standard notation uses letters for each face. A letter alone means 90° clockwise.
              A prime (&apos;) means counter-clockwise. A 2 means 180°.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {NOTATION.map((item, i) => (
              <motion.div
                key={item.move}
                className="glass-card p-4 flex items-center gap-3"
                initial="hidden"
                animate="visible"
                variants={fadeIn}
                custom={i * 0.5}
              >
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-black font-bold font-mono text-sm"
                  style={{ backgroundColor: item.color }}
                >
                  {item.move}
                </div>
                <div className="text-xs text-zinc-400">{item.desc}</div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Beginner Tab */}
      {activeTab === "beginner" && (
        <motion.div initial="hidden" animate="visible" variants={fadeIn} custom={1}>
          <div className="glass-card p-6 mb-6">
            <h2 className="text-lg font-semibold mb-2">Layer-by-Layer Method</h2>
            <p className="text-sm text-zinc-400">
              The simplest method to solve a Rubik&apos;s Cube. Solve one layer at a time, from bottom to top.
            </p>
          </div>

          <div className="space-y-4">
            {BEGINNER_STEPS.map((step, i) => (
              <motion.div
                key={i}
                className="glass-card p-5 flex items-start gap-4"
                initial="hidden"
                animate="visible"
                variants={fadeIn}
                custom={i}
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-black font-bold text-sm shrink-0">
                  {i + 1}
                </div>
                <div>
                  <h3 className="font-semibold text-sm mb-1">{step.title}</h3>
                  <p className="text-xs text-zinc-400">{step.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Advanced Tab */}
      {activeTab === "advanced" && (
        <motion.div initial="hidden" animate="visible" variants={fadeIn} custom={1}>
          <div className="space-y-4">
            {[
              { title: "CFOP Method", desc: "Cross → F2L → OLL → PLL. The most popular speedcubing method used by world champions." },
              { title: "Roux Method", desc: "Block-building approach: two 1×2×3 blocks, then orient and permute remaining pieces." },
              { title: "ZZ Method", desc: "Edge orientation first, then blockbuilding. Reduces move count significantly." },
              { title: "Finger Tricks", desc: "Learn efficient finger movements to execute algorithms faster. Focus on R, U, F triggers." },
              { title: "Look-Ahead", desc: "While executing one step, plan the next. Reduces pauses between algorithms." },
            ].map((item, i) => (
              <motion.div key={i} className="glass-card p-5" initial="hidden" animate="visible" variants={fadeIn} custom={i}>
                <h3 className="font-semibold mb-1">{item.title}</h3>
                <p className="text-sm text-zinc-400">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}
      
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
              <RiInformationLine className="w-6 h-6 text-amber-400" />
            </div>
            
            <h3 className="text-xl font-bold text-white mb-2">Track Your Progress</h3>
            <p className="text-zinc-400 text-sm mb-6">
              Create an account or log in to track your learning progress, unlock advanced modules, and save your preferences!
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
              Continue as Guest
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
}
