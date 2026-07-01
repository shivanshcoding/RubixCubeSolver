"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from "framer-motion";
import { useCubeStore } from "@/store/cubeStore";
import { useAuthStore } from "@/store/authStore";
import { saveSolution } from "@/services/api";

/**
 * SolvingOverlay — Hyper-Premium AI Inference Screen
 * Inspired by OpenAI, Cursor, Vercel, and Apple.
 *
 * Features:
 *   - Extremely subtle ambient background with SVG noise and radial lights.
 *   - Dynamic typography with blur/letter-spacing transitions.
 *   - Pure CSS 3D Rubik's Cube with all 6 faces.
 *   - Spring-based progressive tumbling and snapping to solved state.
 *   - Variable organic phasing via min/max durations.
 *   - Sleek SVG checkmark morph on success.
 */

const PHASES = [
  {
    title: "Scanning",
    subtitle: "Understanding the cube from every possible angle...",
    progress: 10,
    minDuration: 800,
    maxDuration: 1200,
  },
  {
    title: "Reading Patterns",
    subtitle: "Finding structure within the scramble...",
    progress: 24,
    minDuration: 1000,
    maxDuration: 1400,
  },
  {
    title: "Visualizing",
    subtitle: "Mentally unfolding future move sequences...",
    progress: 42,
    minDuration: 500,
    maxDuration: 1600,
  },
  {
    title: "Reasoning",
    subtitle: "Comparing thousands of possible solving paths...",
    progress: 60,
    minDuration: 800,
    maxDuration: 1800,
  },
  {
    title: "Optimizing",
    subtitle: "Keeping every move smooth, efficient, and intentional...",
    progress: 78,
    minDuration: 700,
    maxDuration: 1200,
  },
  {
    title: "Perfecting",
    subtitle: "Double-checking the complete solve sequence...",
    progress: 96,
    minDuration: 900,
    maxDuration: 1800,
  }
];

const SOLVED_FACES = {
  F: "#ef4444", // Red
  B: "#f97316", // Orange
  L: "#22c55e", // Green
  R: "#3b82f6", // Blue
  U: "#ffffff", // White
  D: "#eab308", // Yellow
};

const ALL_COLORS = Object.values(SOLVED_FACES);

// ─── 3D CSS CUBE ───────────────────────────────────────────────
function Premium3DCube({ phaseIndex, isSuccess }) {
  // If phase is >= 4, it's considered visually "solved"
  const isSolved = phaseIndex >= 4 || isSuccess;
  
  const [snapRot, setSnapRot] = useState({ x: 0, y: 0, z: 0 });
  const [stickers, setStickers] = useState({});

  // Generate scrambled or solved stickers
  useEffect(() => {
    const newStickers = {};
    Object.keys(SOLVED_FACES).forEach((face) => {
      newStickers[face] = Array.from({ length: 9 }).map(() => 
        isSolved ? SOLVED_FACES[face] : ALL_COLORS[Math.floor(Math.random() * ALL_COLORS.length)]
      );
    });
    setStickers(newStickers);
  }, [isSolved]);

  // Occasional 3D tumbling to simulate AI "manipulating" the cube
  useEffect(() => {
    if (isSolved || isSuccess) {
      // Return to a neutral 0,0,0 state relative to the isometric wrapper
      setSnapRot({ x: 0, y: 0, z: 0 });
      return;
    }

    const interval = setInterval(() => {
      setSnapRot((prev) => {
        const axis = Math.floor(Math.random() * 3);
        const dir = Math.random() > 0.5 ? 90 : -90;
        return {
          x: prev.x + (axis === 0 ? dir : 0),
          y: prev.y + (axis === 1 ? dir : 0),
          z: prev.z + (axis === 2 ? dir : 0),
        };
      });
    }, 1200);
    return () => clearInterval(interval);
  }, [isSolved, isSuccess]);

  const faces = [
    { label: "F", transform: "rotateY(0deg) translateZ(48px)" },
    { label: "B", transform: "rotateY(180deg) translateZ(48px)" },
    { label: "L", transform: "rotateY(-90deg) translateZ(48px)" },
    { label: "R", transform: "rotateY(90deg) translateZ(48px)" },
    { label: "U", transform: "rotateX(90deg) translateZ(48px)" },
    { label: "D", transform: "rotateX(-90deg) translateZ(48px)" },
  ];

  return (
    <motion.div
      className="relative w-24 h-24"
      style={{ transformStyle: "preserve-3d" }}
      // Continuous slow orbital rotation to keep it alive
      animate={{ rotateX: -15, rotateY: 45 }}
      transition={{ duration: 0 }}
    >
      <motion.div
        className="w-full h-full"
        style={{ transformStyle: "preserve-3d" }}
        animate={{ rotateX: snapRot.x, rotateY: snapRot.y, rotateZ: snapRot.z }}
        transition={{ type: "spring", stiffness: 120, damping: 20 }}
      >
        {faces.map(({ label, transform }) => (
          <div
            key={label}
            className="absolute inset-0 grid grid-cols-3 gap-[2px] bg-black p-[2px] border border-white/5"
            style={{ transform, transformStyle: "preserve-3d", backfaceVisibility: "hidden" }}
          >
            {stickers[label]?.map((color, i) => (
              <motion.div
                key={i}
                className="w-full h-full rounded-[2px]"
                animate={{ backgroundColor: color }}
                transition={{ duration: 0.6, ease: "easeInOut" }}
              />
            ))}
          </div>
        ))}
      </motion.div>
    </motion.div>
  );
}

// ─── AMBIENT BACKGROUND ────────────────────────────────────────
function AmbientBackground({ isSuccess }) {
  return (
    <>
      <div className="absolute inset-0 bg-[#0a0a0a]" />
      
      {/* SVG Noise Grain */}
      <svg className="pointer-events-none absolute inset-0 z-0 h-full w-full opacity-[0.15] mix-blend-overlay">
        <filter id="noise">
          <feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="3" stitchTiles="stitch" />
        </filter>
        <rect width="100%" height="100%" filter="url(#noise)" />
      </svg>

      {/* Moving Radial Lights */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none flex items-center justify-center mix-blend-screen">
        <motion.div
          className="w-[800px] h-[800px] rounded-full opacity-30"
          style={{
            background: isSuccess 
              ? "radial-gradient(circle, rgba(16,185,129,0.15) 0%, transparent 60%)"
              : "radial-gradient(circle, rgba(255,255,255,0.05) 0%, transparent 60%)",
          }}
          animate={{
            scale: isSuccess ? [1, 1.2, 1] : [1, 1.1, 1],
            x: isSuccess ? 0 : [0, 20, -20, 0],
            y: isSuccess ? 0 : [0, -20, 20, 0],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>
    </>
  );
}

// ─── ADVANCED TYPEWRITER ───────────────────────────────────────
function AdvancedTypewriter({ text, minDuration, maxDuration, onPhaseComplete }) {
  const [displayed, setDisplayed] = useState("");
  const isCancelled = useRef(false);

  useEffect(() => {
    isCancelled.current = false;
    let currentString = "";
    let timeoutId;

    const runSequence = async () => {
      // 1. Typing
      for (let i = 0; i < text.length; i++) {
        if (isCancelled.current) return;
        
        // Occasional pause (10% chance) to simulate ChatGPT-like thinking
        if (Math.random() < 0.1 && i > 0 && text[i-1] === " ") {
            await new Promise(r => { timeoutId = setTimeout(r, 250); });
        }

        currentString += text[i];
        setDisplayed(currentString);
        
        const typeSpeed = 25 + Math.random() * 30; // 25-55ms
        await new Promise(r => { timeoutId = setTimeout(r, typeSpeed); });
      }

      // 2. Hold
      const holdTime = minDuration + Math.random() * (maxDuration - minDuration);
      await new Promise(r => { timeoutId = setTimeout(r, holdTime); });

      if (isCancelled.current) return;

      // 3. Untyping
      for (let i = currentString.length; i >= 0; i--) {
        if (isCancelled.current) return;
        
        currentString = currentString.slice(0, -1);
        setDisplayed(currentString);
        
        const deleteSpeed = 8 + Math.random() * 12; // 8-20ms
        await new Promise(r => { timeoutId = setTimeout(r, deleteSpeed); });
      }
      
      if (isCancelled.current) return;

      // 4. Callback to trigger next phase
      if (onPhaseComplete) onPhaseComplete();
    };

    runSequence();

    return () => {
      isCancelled.current = true;
      clearTimeout(timeoutId);
    };
  }, [text, minDuration, maxDuration, onPhaseComplete]);

  return (
    <div className="flex items-center justify-center h-6">
      <span className="text-sm text-zinc-400 tracking-wide font-light">
        {displayed}
      </span>
      <motion.span
        animate={{ opacity: [1, 0] }}
        transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
        className="ml-[2px] inline-block w-1.5 h-3.5 bg-zinc-500 translate-y-0.5"
      />
    </div>
  );
}

// ─── MAIN OVERLAY COMPONENT ────────────────────────────────────
export default function SolvingOverlay({ isVisible, isComplete, onComplete }) {
  const { solution, faces, colorMapping, setSyntheticSolveTime } = useCubeStore();
  const { isAuthenticated } = useAuthStore();
  
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [isSuccess, setIsSuccess] = useState(false);
  const [syntheticTime, setSyntheticTime] = useState("0.0");
  const [refreshKey, setRefreshKey] = useState(0); // Used to re-trigger typewriter if stalling
  const hasSavedSolution = useRef(false);

  // Framer Motion Values
  const progressRaw = useMotionValue(0);
  const progressSpring = useSpring(progressRaw, { stiffness: 60, damping: 15 });
  const progressText = useTransform(progressSpring, (val) => `${Math.round(val)}%`);
  const progressWidth = useTransform(progressSpring, (val) => `${val}%`);

  // Reset state on mount
  useEffect(() => {
    if (!isVisible) {
      setPhaseIndex(0);
      setIsSuccess(false);
      progressRaw.set(0);
      hasSavedSolution.current = false;
      return;
    }
    const time = (20 + Math.random() * 80).toFixed(1);
    setSyntheticTime(time);
    setSyntheticSolveTime(parseFloat(time));
  }, [isVisible, progressRaw, setSyntheticSolveTime]);

  // Update progress bar on phase change
  useEffect(() => {
    if (isVisible && !isSuccess && phaseIndex < PHASES.length) {
      progressRaw.set(PHASES[phaseIndex].progress);
    }
  }, [phaseIndex, isVisible, isSuccess, progressRaw]);

  // Handle phase completion from the typewriter
  const handlePhaseComplete = () => {
    if (isComplete && phaseIndex >= PHASES.length - 1) {
      // Backend is done, trigger success
      progressRaw.set(100);
      setIsSuccess(true);
      
      // Save solution in background if authenticated
      if (isAuthenticated && solution && faces && colorMapping && !hasSavedSolution.current) {
        hasSavedSolution.current = true;
        saveSolution({
          faces: faces,
          color_mapping: colorMapping,
          moves: solution.moves.map(m => typeof m === 'string' ? m : m.notation),
          move_count: solution.move_count,
          solve_time_ms: parseInt(syntheticTime),
          difficulty: solution.difficulty,
          solver_used: solution.solver_used || "kociemba"
        }).then(async () => {
          // Fetch updated user profile so dashboard stats reflect immediately
          const { getMe } = await import("@/services/api");
          const { user } = await getMe();
          if (user) {
            useAuthStore.getState().updateUser(user);
          }
        }).catch(err => {
          console.error("Failed to save solution to DB", err);
          hasSavedSolution.current = false;
        });
      }

      setTimeout(() => {
        if (onComplete) onComplete();
      }, 2500); // 2.5s hold on success screen
    } else if (phaseIndex < PHASES.length - 1) {
      // Move to next phase
      setPhaseIndex((prev) => prev + 1);
    } else {
      // Reached the end of phases but backend is NOT complete yet
      // Re-trigger the same phase to keep typing/untyping loop alive
      setRefreshKey(k => k + 1);
    }
  };

  const currentPhase = PHASES[phaseIndex] || PHASES[PHASES.length - 1];
  const currentTitle = isSuccess ? "Solution Ready" : currentPhase.title;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center font-sans"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <AmbientBackground isSuccess={isSuccess} />

          {/* Main Content Container */}
          <motion.div
            className="relative z-10 w-full max-w-md flex flex-col items-center"
            initial={{ opacity: 0, scale: 0.98, y: 10, filter: "blur(10px)" }}
            animate={{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, scale: 0.98, y: -10, filter: "blur(10px)" }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
          >
            {/* Visual Element (Cube -> Checkmark) */}
            <div className="h-48 flex items-center justify-center">
              <AnimatePresence mode="wait">
                {!isSuccess ? (
                  <motion.div
                    key="cube"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.5, filter: "blur(8px)" }}
                    transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <Premium3DCube phaseIndex={phaseIndex} isSuccess={isSuccess} />
                  </motion.div>
                ) : (
                  <motion.div
                    key="checkmark"
                    initial={{ opacity: 0, scale: 0.5, filter: "blur(10px)" }}
                    animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                    transition={{ type: "spring", stiffness: 200, damping: 20 }}
                    className="w-24 h-24 rounded-full bg-emerald-500/5 border border-emerald-500/20 flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.1)] mb-8"
                  >
                    <svg className="w-10 h-10 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <motion.path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        d="M5 13l4 4L19 7" 
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ duration: 0.8, ease: "easeOut", delay: 0.3 }}
                      />
                    </svg>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Percentage */}
            <AnimatePresence mode="wait">
              {!isSuccess && (
                <motion.div
                  key="percent"
                  className="text-4xl font-light text-zinc-100 mb-8 font-mono tracking-tighter"
                  exit={{ opacity: 0, filter: "blur(4px)" }}
                  transition={{ duration: 0.3 }}
                >
                  <motion.span>{progressText}</motion.span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Typography / Text Container */}
            <div className="h-[72px] flex flex-col items-center justify-center mb-6 w-full">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentTitle}
                  className="flex flex-col items-center"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                >
                  <h2 className="text-lg font-medium text-white tracking-tight mb-2">
                    {currentTitle}
                  </h2>
                </motion.div>
              </AnimatePresence>
              
              {!isSuccess && (
                <AdvancedTypewriter
                  key={`${phaseIndex}-${refreshKey}`}
                  text={currentPhase.subtitle}
                  minDuration={currentPhase.minDuration}
                  maxDuration={currentPhase.maxDuration}
                  onPhaseComplete={handlePhaseComplete}
                />
              )}
            </div>

            {/* Stats Panel (Success Only) */}
            <AnimatePresence>
              {isSuccess && (
                <motion.div 
                  className="flex items-center gap-6 mb-8"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <motion.div
                    initial={{ opacity: 0, y: 15, filter: "blur(4px)" }}
                    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                    transition={{ duration: 0.5, delay: 0.6, ease: [0.22, 1, 0.36, 1] }}
                    className="flex flex-col items-center"
                  >
                    <span className="text-white font-mono text-xl tracking-tight">{solution?.move_count || 0} Moves</span>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.4, delay: 0.7 }}
                    className="w-1 h-1 rounded-full bg-zinc-600"
                  />

                  <motion.div
                    initial={{ opacity: 0, y: 15, filter: "blur(4px)" }}
                    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                    transition={{ duration: 0.5, delay: 0.75, ease: [0.22, 1, 0.36, 1] }}
                    className="flex flex-col items-center"
                  >
                    <span className="text-zinc-400 font-mono text-xl tracking-tight">{syntheticTime} ms</span>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Ultra-Minimal Progress Bar */}
            <div className="w-64 h-[2px] bg-white/10 overflow-hidden rounded-full">
              <motion.div
                className="h-full"
                style={{
                  width: progressWidth,
                  backgroundColor: isSuccess ? "#10b981" : "#ffffff",
                }}
                animate={{
                  backgroundColor: isSuccess ? "#10b981" : "#ffffff",
                }}
                transition={{ duration: 0.4 }}
              />
            </div>

          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
