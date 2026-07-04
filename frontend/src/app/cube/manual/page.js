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
  RiEraserLine,
} from "react-icons/ri";
import CubeNet from "@/components/cube/CubeNet";
import SolvingOverlay from "@/components/cube/SolvingOverlay";
import ColorConfiguration from "@/components/cube/ColorConfiguration";
import InstructionAccordion from "@/components/cube/InstructionAccordion";
import { useCubeStore } from "@/store/cubeStore";
import { solveCube, validateCubeString } from "@/services/api";

const Cube3D = dynamic(() => import("@/components/cube/Cube3D"), { ssr: false });
const CubeUnfold3D = dynamic(() => import("@/components/cube/CubeUnfold3D"), { ssr: false });

const FACE_ORDER = ["U", "R", "F", "D", "L", "B"];
const FACE_LABELS = { U: "Up", D: "Down", F: "Front", B: "Back", R: "Right", L: "Left" };

// ─── 3D → 2D INSTRUCTIONS ──────────────────────────────────────
function CubeUnfoldInstructions() {
  const FACE_COLORS = {
    U: { bg: "#FFFFFF", text: "#000" },
    D: { bg: "#FFFF00", text: "#000" },
    F: { bg: "#00CC00", text: "#fff" },
    B: { bg: "#0044FF", text: "#fff" },
    R: { bg: "#FF0000", text: "#fff" },
    L: { bg: "#FF8800", text: "#fff" },
  };

  return (
    <InstructionAccordion 
      title="How to enter your cube" 
      subtitle="See how the 3D cube maps to the 2D net"
      icon={RiQuestionLine}
    >
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
    </InstructionAccordion>
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
    isSolving, setIsSolving, setSolution, setSource,
    solution, loadKociembaString,
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
    setSource("/cube/manual");
    
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
            <div className="flex-1">
              <h1 className="text-2xl sm:text-3xl font-bold" style={{ fontFamily: "var(--font-display)" }}>
                Manual Cube Entry
              </h1>
              <p className="text-zinc-500 text-sm">
                Configure colors, paint stickers, then solve.
              </p>
            </div>
            {step !== 1 && (
              <button 
                onClick={() => {
                if (window.confirm("Are you sure you want to clear the current cube and start fresh?")) {
                  useCubeStore.getState().resetAll();
                  setStep(1);
                }
              }} 
              className="btn-secondary text-xs flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20"
              title="Start Fresh"
            >
                <RiRefreshLine className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Reset</span>
              </button>
            )}
          </div>

          {/* Step Indicator */}
          <div className="flex items-center gap-2 mt-5">
            {[
              { num: 1, label: "Cube Colors", icon: RiPaletteLine },
              { num: 2, label: "Enter Stickers", icon: RiGridLine },
            ].map((s) => {
              const isActive = step === s.num;
              const isCompleted = step > s.num;
              return (
                <button
                  key={s.num}
                  onClick={() => s.num === 1 || isColorMappingSet ? setStep(s.num) : null}
                  disabled={!isCompleted && !isActive && !isColorMappingSet}
                  className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-medium transition-all duration-300 ${
                    isActive
                      ? "bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.1)]"
                      : (isCompleted || isColorMappingSet)
                      ? "bg-white/5 text-zinc-300 hover:bg-white/10 hover:text-white border border-transparent cursor-pointer"
                      : "bg-transparent text-zinc-600 cursor-not-allowed border border-transparent"
                  }`}
                >
                  <span
                    className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-bold transition-colors ${
                      isActive
                        ? "bg-amber-500 text-white"
                        : isCompleted
                        ? "bg-zinc-700 text-zinc-300"
                        : "bg-zinc-800 text-zinc-600"
                    }`}
                  >
                    {isCompleted ? <RiCheckLine className="w-3 h-3" /> : s.num}
                  </span>
                  <span className="hidden sm:inline">{s.label}</span>
                  <span className="sm:hidden">{s.label.split(' ')[0]}</span>
                </button>
              );
            })}

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
              <ColorConfiguration 
                tempColors={tempColors}
                setTempColors={setTempColors}
                onConfirm={confirmColors}
              />
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
              {/* Color Palette Selector & Actions */}
              <div className="flex justify-between items-center bg-black/20 border border-white/5 rounded-xl p-2">
                <div className="flex flex-wrap gap-2">
                  {palette.map((item) => (
                    <motion.button
                      key={item.face}
                      onClick={() => setActiveColor(item.face)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${activeColor === item.face ? "bg-amber-500/10 border border-amber-500/30 text-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.1)]" : "bg-white/5 border border-white/10 text-zinc-400 hover:bg-white/10 hover:border-white/20"}`}
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.96 }}
                    >
                      <div
                        className="w-5 h-5 rounded-md border border-white/20 shadow-sm"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="hidden sm:inline">{item.label}</span>
                    </motion.button>
                  ))}
                  <motion.button
                    onClick={() => setActiveColor("unknown")}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${activeColor === "unknown" ? "bg-amber-500/10 border border-amber-500/30 text-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.1)]" : "bg-white/5 border border-white/10 text-zinc-400 hover:bg-white/10 hover:border-white/20"}`}
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.96 }}
                  >
                    <div className="w-5 h-5 rounded-md border border-white/20 shadow-sm flex items-center justify-center bg-zinc-800">
                      <RiEraserLine className="w-3 h-3 text-zinc-300" />
                    </div>
                    <span className="hidden sm:inline">Eraser</span>
                  </motion.button>
                </div>
                
                <div className="flex items-center ml-2">
                  {!isValidated ? (
                    <button 
                      disabled={!isCountsValid()}
                      onClick={handleValidate}
                      className="btn-primary text-sm py-2 px-4 shadow-[0_0_15px_rgba(245,158,11,0.3)] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Validate Cube
                    </button>
                  ) : (
                    <button
                      onClick={handleSolve}
                      disabled={isSolving}
                      className="btn-primary flex items-center gap-2 text-sm py-2 px-4 shadow-[0_0_15px_rgba(245,158,11,0.3)] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSolving ? "Solving..." : "Solve Cube"}
                      {!isSolving && <RiArrowRightLine className="w-4 h-4" />}
                    </button>
                  )}
                </div>
              </div>

              {/* Cube Net + 3D Preview */}
              <div className="grid lg:grid-cols-5 gap-5 items-start">
                <div className="glass-card p-6 lg:col-span-3">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
                      <RiGridLine className="w-4 h-4 text-amber-400/70" />
                      2D Cube Net
                    </h3>
                    <span className="text-xs text-zinc-600">Click stickers to paint</span>
                  </div>
                  <div className="flex justify-center w-full [&>div]:w-full [&>div]:max-w-[500px]">
                    <CubeNet />
                  </div>
                </div>

                <div className="glass-card p-6 lg:col-span-2">
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

              {/* Instructions Toggle */}
              <CubeUnfoldInstructions />

            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
