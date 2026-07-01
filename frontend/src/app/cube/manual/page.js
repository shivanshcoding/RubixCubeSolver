"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";
import toast from "react-hot-toast";
import {
  RiArrowLeftLine,
  RiArrowRightLine,
  RiCheckLine,
  RiRefreshLine,
  RiFlashlightLine,
  RiPaletteLine,
  RiGridLine,
  RiMagicLine,
  RiQuestionLine,
} from "react-icons/ri";
import CubeNet from "@/components/cube/CubeNet";
import SolvingOverlay from "@/components/cube/SolvingOverlay";
import { useCubeStore } from "@/store/cubeStore";
import { solveCube, validateCubeString } from "@/services/api";

const Cube3D = dynamic(() => import("@/components/cube/Cube3D"), { ssr: false });
const CubeUnfold3D = dynamic(() => import("@/components/cube/CubeUnfold3D"), { ssr: false });

const FACE_ORDER = ["U", "R", "F", "D", "L", "B"];
const FACE_LABELS = { U: "Up", D: "Down", F: "Front", B: "Back", R: "Right", L: "Left" };

// ─── 3D → 2D INSTRUCTIONS ──────────────────────────────────────
function CubeUnfoldInstructions() {
  const [isOpen, setIsOpen] = useState(false);

  const FACE_COLORS = {
    U: { bg: "#FFFFFF", text: "#000" },
    D: { bg: "#FFFF00", text: "#000" },
    F: { bg: "#00CC00", text: "#fff" },
    B: { bg: "#0044FF", text: "#fff" },
    R: { bg: "#FF0000", text: "#fff" },
    L: { bg: "#FF8800", text: "#fff" },
  };

  return (
    <div className="manual-card overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-5 py-4 group"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
            <RiQuestionLine className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-left">
            <div className="text-sm font-semibold text-zinc-200">How to enter your cube</div>
            <div className="text-xs text-zinc-500">See how the 3D cube maps to the 2D net</div>
          </div>
        </div>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="text-zinc-500"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </motion.div>
      </button>

      <motion.div
        initial={false}
        animate={{ height: isOpen ? "auto" : 0, opacity: isOpen ? 1 : 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="overflow-hidden"
        style={{ pointerEvents: isOpen ? "auto" : "none" }}
      >
        <div className="p-5">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center mb-6">
            
            {/* Left Column: Text Instructions */}
            <div className="space-y-6">
              {/* Step 1: Hold the cube */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-5 h-5 rounded-full bg-amber-400/20 text-amber-400 text-[10px] font-bold flex items-center justify-center shadow-[0_0_10px_rgba(251,191,36,0.2)]">1</span>
                  <span className="text-sm font-medium text-zinc-200">Hold the cube facing you</span>
                </div>
                <p className="text-xs text-zinc-400 ml-7 leading-relaxed">
                  Pick any face as the Front. The face directly looking at you is <strong className="text-green-400">Front (F)</strong>.
                  The face on top is <strong className="text-white">Up (U)</strong>.
                </p>
              </div>

              {/* Step 2: The cube unfolds into a cross */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-5 h-5 rounded-full bg-amber-400/20 text-amber-400 text-[10px] font-bold flex items-center justify-center shadow-[0_0_10px_rgba(251,191,36,0.2)]">2</span>
                  <span className="text-sm font-medium text-zinc-200">The cube unfolds into a cross</span>
                </div>
                <p className="text-xs text-zinc-400 ml-7 leading-relaxed">
                  Imagine unfolding the cube flat. The <strong className="text-white">Up</strong> face goes on top,
                  the <strong className="text-green-400">Front</strong> face stays center,
                  and the rest wrap around it.
                </p>
              </div>

              {/* Step 3: Fill in stickers */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-5 h-5 rounded-full bg-amber-400/20 text-amber-400 text-[10px] font-bold flex items-center justify-center shadow-[0_0_10px_rgba(251,191,36,0.2)]">3</span>
                  <span className="text-sm font-medium text-zinc-200">Paint the stickers</span>
                </div>
                <div className="ml-7 space-y-2 text-xs text-zinc-400 leading-relaxed">
                  <p>Select a color from the palette, then click each sticker on the 2D net.</p>
                  <p>The <strong className="text-zinc-200">center stickers are fixed</strong> — they define the face identity.</p>
                  <p>Fill in all 54 stickers to match your physical cube.</p>
                </div>
              </div>
            </div>

            {/* Right Column: Animated 3D to 2D Net Visualization */}
            <div className="relative">
              {/* Subtle glowing background behind the glass */}
              <div className="absolute inset-0 bg-gradient-to-tr from-amber-500/10 via-transparent to-blue-500/10 rounded-2xl blur-2xl" />
              
              {/* Glassmorphic container */}
              <div className="relative bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl">
                <CubeUnfold3D height="330px" />
                <div className="mt-4 flex items-center justify-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)] animate-pulse" />
                  <p className="text-center text-[10px] text-zinc-400 uppercase tracking-widest font-medium">
                    Interactive Preview
                  </p>
                </div>
              </div>
            </div>

          </div>

          {/* Face Reference Table */}
          <div className="bg-black/20 backdrop-blur-sm rounded-xl p-4 border border-white/5">
            <div className="text-[10px] text-zinc-500 uppercase tracking-widest mb-3 font-semibold">Quick Reference</div>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
              {Object.entries(FACE_LABELS).map(([key, label]) => (
                <div key={key} className="flex items-center gap-2">
                  <div className="w-3.5 h-3.5 rounded-sm shadow-[0_2px_4px_rgba(0,0,0,0.4)]" style={{ backgroundColor: FACE_COLORS[key].bg }} />
                  <span className="text-xs text-zinc-400 font-medium"><strong className="text-zinc-200">{key}</strong></span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default function ManualEntryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    faces, colorMapping, activeColor, isColorMappingSet,
    setColorMapping, setColorForFace, setActiveColor,
    isValidated, validationErrors, setValidation,
    getKociembaString, isCountsValid, reset, getPalette,
    isSolving, setIsSolving, setSolution,
    loadKociembaString,
  } = useCubeStore();

  const [step, setStep] = useState(1);
  const [tempColors, setTempColors] = useState({
    U: "#FFFFFF",
    D: "#FFFF00",
    F: "#00CC00",
    B: "#0044FF",
    R: "#FF0000",
    L: "#FF8800",
  });
  const [isSolveComplete, setIsSolveComplete] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    setTempColors({ ...colorMapping });
    
    const stateParam = searchParams.get("state");
    if (stateParam && stateParam.length === 54) {
      loadKociembaString(stateParam);
      setStep(2); // Jump directly to paint step
    } else if (isColorMappingSet) {
      setStep(2);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const palette = getPalette();

  // Prevent full rendering mismatch until hydration is complete
  if (!isMounted) return null;

  // ─── Step 1: Color Selection ───────────────────────
  const handleColorChange = (face, color) => {
    setTempColors((prev) => ({ ...prev, [face]: color }));
  };

  const confirmColors = () => {
    setColorMapping(tempColors);
    setStep(2);
    toast.success("Colors configured!");
  };

  // ─── Step 2: Validation ────────────────────────────
  const handleValidate = async () => {
    if (!isCountsValid()) {
      setValidation(false, ["Each color must be used exactly 9 times."]);
      toast.error("Please paint all 54 stickers properly");
      return;
    }

    const cubeString = getKociembaString();
    try {
      const res = await validateCubeString(cubeString);
      if (res.valid) {
        setValidation(true);
        toast.success("Cube is valid!");
      } else {
        setValidation(false, [res.error || "Invalid cube configuration"]);
        toast.error(res.error || "Invalid cube");
      }
    } catch (err) {
      setValidation(false, ["Validation failed. Check your cube state."]);
      toast.error("Validation error");
    }
  };

  // ─── Step 2: Solve ─────────────────────────────────
  const handleSolve = async () => {
    if (!isValidated) {
      toast.error("Validate the cube first");
      return;
    }

    setIsSolving(true);
    setIsSolveComplete(false);
    
    // Wait one frame so React can paint the overlay before we block with API or delay
    await new Promise(requestAnimationFrame);

    const cubeString = getKociembaString();

    try {
      const result = await solveCube(cubeString);
      if (result.success) {
        setSolution(result);
        setIsSolveComplete(true);
        // We do NOT navigate here. The onComplete callback from SolvingOverlay will do it!
      } else {
        toast.error(result.error || "Solve failed");
        setIsSolving(false);
      }
    } catch (err) {
      toast.error("Failed to solve cube");
      setIsSolving(false);
    }
  };

  const handleOverlayComplete = () => {
    // Start routing to solution page immediately
    router.push("/cube/solution");

    // Clean up the global states AFTER the route transition is guaranteed to have started/completed,
    // so we don't accidentally reveal the manual page underneath during the Next.js routing pause.
    setTimeout(() => {
      setIsSolving(false);
      setIsSolveComplete(false);
    }, 1000);
  };

  const handleReset = () => {
    reset();
    setValidation(false);
    toast("Cube reset", { icon: "🔄" });
  };

  return (
    <div className="relative min-h-screen">
      <SolvingOverlay 
        isVisible={isSolving} 
        isComplete={isSolveComplete} 
        onComplete={handleOverlayComplete} 
      />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
              <RiGridLine className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold" style={{ fontFamily: "var(--font-display)" }}>
                Manual Cube Entry
              </h1>
              <p className="text-zinc-500 text-sm">
                Configure colors, paint stickers, then solve.
              </p>
            </div>
          </div>

          {/* Step Indicator */}
          <div className="flex items-center gap-2 mt-5">
            {[
              { num: 1, label: "Cube Colors", icon: RiPaletteLine },
              { num: 2, label: "Enter Stickers", icon: RiGridLine },
            ].map((s) => (
              <button
                key={s.num}
                onClick={() => s.num === 1 || isColorMappingSet ? setStep(s.num) : null}
                className={`manual-step-btn ${step === s.num ? "active" : ""}`}
              >
                <span className={`manual-step-num ${step === s.num ? "active" : ""}`}>
                  {step > s.num ? <RiCheckLine className="w-3.5 h-3.5" /> : s.num}
                </span>
                <s.icon className="w-4 h-4 hidden sm:block" />
                {s.label}
              </button>
            ))}

            {/* Connecting line */}
            <div className="hidden sm:block flex-1 h-px bg-gradient-to-r from-white/10 to-transparent mx-2" />
          </div>
        </motion.div>

        <AnimatePresence mode="wait">
          {/* ─── Step 1: Color Selection ────────────────── */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 30 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="manual-card">
                <div className="flex items-center gap-2 mb-2">
                  <RiPaletteLine className="w-5 h-5 text-amber-400" />
                  <h2 className="text-lg font-semibold">Select Your Cube Colors</h2>
                </div>
                <p className="text-sm text-zinc-500 mb-6">
                  Every Rubik&apos;s Cube has unique center colors. Centers never move.
                  Select the physical color of each face&apos;s center sticker.
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {FACE_ORDER.map((face, i) => (
                    <motion.div
                      key={face}
                      className="manual-color-picker"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.06 }}
                    >
                      <input
                        type="color"
                        value={tempColors[face]}
                        onChange={(e) => handleColorChange(face, e.target.value)}
                        className="manual-color-input"
                      />
                      <div>
                        <div className="text-sm font-medium text-zinc-200">
                          {FACE_LABELS[face]} ({face})
                        </div>
                        <div className="text-xs text-zinc-600 font-mono">{tempColors[face]}</div>
                      </div>
                    </motion.div>
                  ))}
                </div>

                <motion.button
                  onClick={confirmColors}
                  className="btn-primary mt-6 flex items-center gap-2"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Continue
                  <RiArrowRightLine className="w-4 h-4" />
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* ─── Step 2: Sticker Painting ───────────────── */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="space-y-5"
            >
              {/* Instructions Toggle */}
              <CubeUnfoldInstructions />

              {/* Color Palette Selector */}
              <div className="manual-card !p-4">
                <div className="text-xs text-zinc-500 mb-2.5 font-medium uppercase tracking-wider">
                  Select a color to paint
                </div>
                <div className="flex flex-wrap gap-2">
                  {palette.map((item) => (
                    <motion.button
                      key={item.face}
                      onClick={() => setActiveColor(item.face)}
                      className={`manual-palette-btn ${activeColor === item.face ? "active" : ""}`}
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.96 }}
                    >
                      <div
                        className="w-5 h-5 rounded-md border border-white/20 shadow-sm"
                        style={{ backgroundColor: item.color }}
                      />
                      <span>{item.label}</span>
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Cube Net + 3D Preview */}
              <div className="grid lg:grid-cols-5 gap-5 items-start">
                <div className="manual-card lg:col-span-3">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
                      <RiGridLine className="w-4 h-4 text-amber-400/70" />
                      2D Cube Net
                    </h3>
                    <span className="text-xs text-zinc-600">Click stickers to paint</span>
                  </div>
                  <div className="manual-cubenet-container">
                    <CubeNet />
                  </div>
                </div>

                <div className="manual-card lg:col-span-2">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
                      <RiMagicLine className="w-4 h-4 text-blue-400/70" />
                      3D Preview
                    </h3>
                    <span className="text-xs text-zinc-600">Drag to rotate</span>
                  </div>
                  <Cube3D height="350px" autoRotate={true} />
                </div>
              </div>

              {/* Validation Errors */}
              <AnimatePresence>
                {validationErrors.length > 0 && (
                  <motion.div
                    className="manual-card !border-red-500/20 !bg-red-500/5"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <div className="text-sm text-red-400 font-medium mb-1">Validation Errors</div>
                    {validationErrors.map((err, i) => (
                      <div key={i} className="text-xs text-red-300/80">&bull; {err}</div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Actions */}
              <div className="manual-actions">
                <motion.button
                  onClick={() => setStep(1)}
                  className="btn-ghost flex items-center gap-1.5"
                  whileTap={{ scale: 0.95 }}
                >
                  <RiArrowLeftLine className="w-4 h-4" />
                  Colors
                </motion.button>

                {!isValidated ? (
                  <motion.button
                    onClick={handleValidate}
                    className="btn-primary flex items-center gap-2"
                    whileHover={{ scale: 1.02, boxShadow: "0 0 25px rgba(245,158,11,0.25)" }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <RiCheckLine className="w-4 h-4" />
                    Validate Cube
                  </motion.button>
                ) : (
                  <motion.button
                    onClick={handleSolve}
                    disabled={isSolving}
                    className="btn-primary flex items-center gap-2 disabled:opacity-50"
                    whileHover={{ scale: 1.02, boxShadow: "0 0 30px rgba(245,158,11,0.3)" }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {isSolving ? (
                      <>
                        <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                        Solving...
                      </>
                    ) : (
                      <>
                        <RiFlashlightLine className="w-4 h-4" />
                        Solve Cube
                      </>
                    )}
                  </motion.button>
                )}

                {isValidated && (
                  <motion.span
                    className="badge-success flex items-center gap-1 self-center"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: "spring", stiffness: 400 }}
                  >
                    <RiCheckLine className="w-3 h-3" />
                    Valid
                  </motion.span>
                )}

                <motion.button
                  onClick={handleReset}
                  className="btn-ghost flex items-center gap-1.5 ml-auto"
                  whileTap={{ scale: 0.95 }}
                >
                  <RiRefreshLine className="w-4 h-4" />
                  Reset
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
