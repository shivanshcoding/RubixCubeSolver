"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  RiCameraLine,
  RiBox3Line,
  RiBrainLine,
  RiTrophyLine,
  RiSpeedLine,
  RiEyeLine,
  RiArrowRightLine,
  RiStarFill,
  RiGithubFill,
} from "react-icons/ri";


import { useAuthStore } from "@/store/authStore";
import toast from "react-hot-toast";

const fadeIn = {
  hidden: { opacity: 0, y: 30 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.6, ease: [0.4, 0, 0.2, 1] },
  }),
};

const FEATURES = [
  {
    icon: RiCameraLine,
    title: "Computer Vision",
    desc: "Scan your cube with your webcam. Real-time color detection with OpenCV and configurable HSV thresholds.",
    gradient: "from-blue-500 to-cyan-400",
  },
  {
    icon: RiBox3Line,
    title: "3D Visualization",
    desc: "Interactive Three.js cube with smooth move animations, camera controls, and real-time state sync.",
    gradient: "from-amber-400 to-orange-500",
  },
  {
    icon: RiBrainLine,
    title: "Multiple Solvers",
    desc: "Kociemba two-phase algorithm produces near-optimal solutions. Pluggable solver architecture for future algorithms.",
    gradient: "from-purple-500 to-pink-500",
  },
  {
    icon: RiTrophyLine,
    title: "Competitions",
    desc: "Daily scrambles, weekend contests, ELO rating system, global leaderboards, and achievement badges.",
    gradient: "from-green-400 to-emerald-500",
  },
  {
    icon: RiSpeedLine,
    title: "Solution Player",
    desc: "Premium animated solution viewer with play/pause, speed control, move notation, and timeline scrubbing.",
    gradient: "from-red-500 to-rose-400",
  },
  {
    icon: RiEyeLine,
    title: "Learning Mode",
    desc: "Step-by-step move explanations, cube notation guide, interactive tutorials for beginners and advanced.",
    gradient: "from-indigo-500 to-blue-400",
  },
];

const STEPS = [
  { num: "01", title: "Input Your Cube", desc: "Use the manual editor or scan with your webcam" },
  { num: "02", title: "Validate & Preview", desc: "3D preview with full validation of cube state" },
  { num: "03", title: "Solve & Learn", desc: "Watch animated solutions and learn each move" },
];

const TESTIMONIALS = [
  { name: "Alex Chen", role: "Speedcuber", text: "The scanner accuracy is incredible. It detected my cube state perfectly on the first try.", rating: 5 },
  { name: "Sarah Miller", role: "CS Student", text: "The 3D solution player is the best I've seen. Smooth animations and great controls.", rating: 5 },
  { name: "David Park", role: "Educator", text: "Learning mode explains every move clearly. My students love it for understanding algorithms.", rating: 5 },
];

export default function LandingPage() {
  const { isAuthenticated } = useAuthStore();
  const [isHydrated, setIsHydrated] = useState(false);
  
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const handleAuthClick = () => {
    if (isAuthenticated) {
      toast.success("You've already logged in!");
    }
  };

  return (
    <div className="relative overflow-hidden">
      {/* Background Blobs for Premium Feel */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-amber-500/10 rounded-full blur-[120px] -z-10 animate-pulse pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-orange-600/10 rounded-full blur-[150px] -z-10 animate-pulse pointer-events-none" />

      {/* ─── Hero Section ──────────────────────────────────── */}
      <section className="relative min-h-[90vh] flex items-center justify-center px-4 pt-8">
        <div className="max-w-5xl mx-auto text-center relative z-10">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeIn}
            custom={0}
          >
            <span className="badge mb-6 inline-flex shadow-lg shadow-amber-500/10 border-amber-500/20">
              <RiStarFill className="w-3 h-3 text-amber-400" />
              Production-Grade Rubik&apos;s Cube Platform
            </span>
          </motion.div>

          <motion.h1
            className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-extrabold tracking-tight leading-[0.9] mb-6"
            initial="hidden"
            animate="visible"
            variants={fadeIn}
            custom={1}
            style={{ fontFamily: "var(--font-display)" }}
          >
            <span className="gradient-text drop-shadow-sm">CubeVision</span>
            <br />
            <span className="text-white/90 drop-shadow-sm">AI</span>
          </motion.h1>

          <motion.p
            className="text-lg sm:text-xl text-zinc-400 max-w-2xl mx-auto mb-10 leading-relaxed font-light"
            initial="hidden"
            animate="visible"
            variants={fadeIn}
            custom={2}
          >
            Computer vision powered cube scanner, algorithmic solver,
            interactive 3D visualization, and competitive gamification -
            all in one premium platform.
          </motion.p>

          <motion.div
            className="flex flex-col sm:flex-row items-center justify-center gap-4 h-14"
            initial="hidden"
            animate="visible"
            variants={fadeIn}
            custom={3}
          >
            {isHydrated && (
              <>
                <Link 
                  href={isAuthenticated ? "/dashboard" : "/cube/manual"} 
                  onClick={handleAuthClick}
                  className="btn-primary text-base px-8 py-3 flex items-center gap-2 group shadow-xl shadow-amber-500/20 hover:shadow-amber-500/40 transition-all"
                >
                  {isAuthenticated ? "Go to Dashboard" : "Start Solving"}
                  <RiArrowRightLine className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
                
                {!isAuthenticated && (
                  <Link 
                    href="/signup" 
                    className="btn-secondary text-base px-8 py-3 bg-white/5 hover:bg-white/10 backdrop-blur-sm border-white/10"
                  >
                    Create Account
                  </Link>
                )}
              </>
            )}
          </motion.div>

          {/* Floating 3D cube placeholder */}
          <motion.div
            className="mt-20 flex justify-center"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5, duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
          >
            <div className="relative w-40 h-40 animate-float">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-400/20 to-orange-500/20 rounded-2xl rotate-12 blur-xl" />
              <div className="absolute inset-0 glass-card flex items-center justify-center rotate-12 hover:rotate-0 transition-transform duration-700">
                <div className="grid grid-cols-3 gap-1 p-4 -rotate-12 hover:rotate-0 transition-transform duration-700">
                  {["#ef4444", "#ffffff", "#3b82f6", "#f59e0b", "#22c55e", "#ef4444", "#ffffff", "#f97316", "#ffff00"]
                    .map((color, i) => (
                      <div
                        key={i}
                        className="w-8 h-8 rounded-md border border-white/10"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── Features ──────────────────────────────────────── */}
      <section className="relative z-10 py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <motion.div
            className="text-center mb-16"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={fadeIn}
          >
            <h2 className="text-3xl sm:text-4xl font-bold mb-4" style={{ fontFamily: "var(--font-display)" }}>
              Everything You Need
            </h2>
            <p className="text-zinc-400 max-w-xl mx-auto">
              A complete platform for scanning, solving, learning, and competing — built with modern engineering.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((feature, i) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={feature.title}
                  className="glass-card p-6 group"
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  variants={fadeIn}
                  custom={i}
                >
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2 text-white">{feature.title}</h3>
                  <p className="text-sm text-zinc-400 leading-relaxed">{feature.desc}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── How It Works ──────────────────────────────────── */}
      <section className="relative z-10 py-24 px-4">
        <div className="max-w-4xl mx-auto">
          <motion.div
            className="text-center mb-16"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeIn}
          >
            <h2 className="text-3xl sm:text-4xl font-bold mb-4" style={{ fontFamily: "var(--font-display)" }}>
              How It Works
            </h2>
            <p className="text-zinc-400">Three simple steps to solve any cube.</p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {STEPS.map((step, i) => (
              <motion.div
                key={step.num}
                className="text-center"
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeIn}
                custom={i}
              >
                <div className="text-5xl font-bold gradient-text-gold mb-4" style={{ fontFamily: "var(--font-display)" }}>
                  {step.num}
                </div>
                <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
                <p className="text-sm text-zinc-400">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Testimonials ──────────────────────────────────── */}
      <section className="relative z-10 py-24 px-4">
        <div className="max-w-5xl mx-auto">
          <motion.div
            className="text-center mb-16"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeIn}
          >
            <h2 className="text-3xl sm:text-4xl font-bold mb-4" style={{ fontFamily: "var(--font-display)" }}>
              What People Say
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-5">
            {TESTIMONIALS.map((t, i) => (
              <motion.div
                key={t.name}
                className="glass-card p-6"
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeIn}
                custom={i}
              >
                <div className="flex gap-1 mb-4">
                  {Array.from({ length: t.rating }).map((_, j) => (
                    <RiStarFill key={j} className="w-4 h-4 text-amber-400" />
                  ))}
                </div>
                <p className="text-sm text-zinc-300 mb-4 leading-relaxed">&ldquo;{t.text}&rdquo;</p>
                <div>
                  <div className="font-semibold text-sm">{t.name}</div>
                  <div className="text-xs text-zinc-500">{t.role}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ───────────────────────────────────────────── */}
      <section className="relative z-10 py-24 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeIn}
          >
            <h2 className="text-3xl sm:text-4xl font-bold mb-4" style={{ fontFamily: "var(--font-display)" }}>
              Ready to Solve?
            </h2>
            <p className="text-zinc-400 mb-8">
              Join thousands of cubers using CubeVision AI to scan, solve, and compete.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/signup" className="btn-primary text-base px-8 py-3">
                Get Started Free
              </Link>
              <Link href="/cube/manual" className="btn-secondary text-base px-8 py-3">
                Try Without Account
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
