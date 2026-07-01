"use client";

import { motion } from "framer-motion";
import { RiBox3Line } from "react-icons/ri";

/**
 * AuthLayout — Split-screen layout for login/signup pages.
 *
 * Left side: Engaging animated visual with branding.
 * Right side: Auth form content.
 */

const floatingCubeVariants = {
  animate: {
    y: [-10, 10, -10],
    rotateZ: [0, 5, -5, 0],
    transition: {
      y: { duration: 4, repeat: Infinity, ease: "easeInOut" },
      rotateZ: { duration: 6, repeat: Infinity, ease: "easeInOut" },
    },
  },
};

const orbitVariants = {
  animate: {
    rotate: 360,
    transition: { duration: 20, repeat: Infinity, ease: "linear" },
  },
};

const gridPatternVariants = {
  animate: {
    opacity: [0.03, 0.06, 0.03],
    transition: { duration: 8, repeat: Infinity, ease: "easeInOut" },
  },
};

function CubeFace({ color, delay = 0 }) {
  return (
    <motion.div
      className="w-6 h-6 rounded-sm"
      style={{ backgroundColor: color, boxShadow: `0 0 12px ${color}40` }}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay, duration: 0.4, type: "spring", stiffness: 200 }}
    />
  );
}

function AnimatedCube() {
  const faces = [
    ["#ef4444", "#ffffff", "#3b82f6"],
    ["#22c55e", "#f59e0b", "#ef4444"],
    ["#3b82f6", "#22c55e", "#ffffff"],
  ];

  return (
    <motion.div
      variants={floatingCubeVariants}
      animate="animate"
      className="relative"
    >
      {/* Outer glow */}
      <div className="absolute inset-0 -m-8 rounded-3xl bg-amber-500/5 blur-3xl" />
      <div className="absolute inset-0 -m-4 rounded-2xl bg-blue-500/5 blur-2xl" />

      {/* Cube grid */}
      <div className="relative z-10 p-1 rounded-xl border border-white/10 bg-black/30 backdrop-blur-sm">
        <div className="grid gap-1.5 p-2">
          {faces.map((row, ri) => (
            <div key={ri} className="flex gap-1.5">
              {row.map((color, ci) => (
                <CubeFace key={`${ri}-${ci}`} color={color} delay={ri * 0.15 + ci * 0.1} />
              ))}
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

function OrbitRing({ size, duration, color, opacity = 0.1 }) {
  return (
    <motion.div
      className="absolute rounded-full border"
      style={{
        width: size,
        height: size,
        borderColor: `rgba(${color}, ${opacity})`,
        top: "50%",
        left: "50%",
        marginTop: -size / 2,
        marginLeft: -size / 2,
      }}
      animate={{ rotate: 360 }}
      transition={{ duration, repeat: Infinity, ease: "linear" }}
    >
      {/* Orbiting dot */}
      <motion.div
        className="absolute w-2 h-2 rounded-full"
        style={{
          backgroundColor: `rgba(${color}, ${opacity * 3})`,
          boxShadow: `0 0 10px rgba(${color}, ${opacity * 2})`,
          top: -4,
          left: "50%",
          marginLeft: -4,
        }}
      />
    </motion.div>
  );
}

const stats = [
  { value: "50K+", label: "Cubes Solved" },
  { value: "3.2s", label: "Avg Solution" },
  { value: "12K+", label: "Active Users" },
];

export default function AuthLayout({ children, title, subtitle }) {
  return (
    <div className="min-h-screen flex relative overflow-hidden">

      {/* ─── LEFT: Visual Panel ─── */}
      <motion.div
        className="hidden lg:flex lg:w-1/2 xl:w-[55%] relative items-center justify-center"
        initial={{ opacity: 0, x: -40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* Animated gradient background for left panel */}
        <div className="absolute inset-0 animated-gradient" />

        {/* Grid pattern overlay */}
        <motion.div
          className="absolute inset-0"
          variants={gridPatternVariants}
          animate="animate"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)
            `,
            backgroundSize: "60px 60px",
          }}
        />

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center text-center px-12 max-w-lg">
          {/* Orbit rings */}
          <div className="relative w-64 h-64 flex items-center justify-center mb-12">
            <OrbitRing size={280} duration={20} color="245, 158, 11" opacity={0.08} />
            <OrbitRing size={220} duration={15} color="59, 130, 246" opacity={0.06} />
            <OrbitRing size={160} duration={25} color="139, 92, 246" opacity={0.05} />
            <AnimatedCube />
          </div>

          {/* Brand */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
          >
            <div className="flex items-center justify-center gap-3 mb-4">
              <RiBox3Line className="w-8 h-8 text-amber-400" />
              <h2
                className="text-3xl font-bold gradient-text"
                style={{ fontFamily: "var(--font-display)" }}
              >
                CubeVision AI
              </h2>
            </div>
            <p className="text-zinc-400 text-base leading-relaxed mb-8">
              Solve, learn, and compete with the most advanced
              <br />
              Rubik&apos;s Cube platform powered by AI.
            </p>
          </motion.div>

          {/* Stats bar */}
          <motion.div
            className="flex gap-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.6 }}
          >
            {stats.map((stat, i) => (
              <div key={i} className="text-center">
                <div className="text-xl font-bold text-amber-400" style={{ fontFamily: "var(--font-display)" }}>
                  {stat.value}
                </div>
                <div className="text-xs text-zinc-500 mt-0.5">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Decorative accent line */}
        <div className="absolute right-0 top-[15%] bottom-[15%] w-px bg-gradient-to-b from-transparent via-amber-500/20 to-transparent" />
      </motion.div>

      {/* ─── RIGHT: Form Panel ─── */}
      <motion.div
        className="flex-1 flex items-center justify-center px-6 py-12 relative z-10"
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
      >
        <div className="w-full max-w-md">{children}</div>
      </motion.div>
    </div>
  );
}
