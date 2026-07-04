"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { showPremiumToast } from "@/components/shared/PremiumToast";
import dynamic from "next/dynamic";
import {
  RiCameraLine,
  RiRefreshLine,
  RiCheckLine,
  RiArrowRightLine,
  RiEditLine,
  RiQuestionLine,
  RiUploadCloud2Line,
  RiPaletteLine,
  RiInformationLine,
  RiEraserLine
} from "react-icons/ri";
import { useCubeStore } from "@/store/cubeStore";
import { useUIStore } from "@/store/uiStore";
import { solveCube, validateCubeString } from "@/services/api";

import CubeUnfold3D from "@/components/cube/CubeUnfold3D";
import ColorConfiguration from "@/components/cube/ColorConfiguration";
import WebcamScanner from "@/components/cube/WebcamScanner";
import FaceReviewPanel from "@/components/cube/FaceReviewPanel";
import UploadFallback from "@/components/cube/UploadFallback";
import CubeNet from "@/components/cube/CubeNet";
import InstructionAccordion from "@/components/cube/InstructionAccordion";

const Cube3D = dynamic(() => import("@/components/cube/Cube3D"), { ssr: false });
const SolvingOverlay = dynamic(() => import("@/components/cube/SolvingOverlay"), { ssr: false });

const FACE_ORDER = ["U", "R", "F", "D", "L", "B"];
const FACE_LABELS = {
  U: "Up",
  R: "Right",
  F: "Front",
  D: "Down",
  L: "Left",
  B: "Back",
};

const DIAGNOSTICS = [
  { key: "lighting", label: "Lighting" },
  { key: "sharpness", label: "Sharpness" },
  { key: "angle", label: "Angle" },
  { key: "glare", label: "Glare" }
];

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


export default function ScannerPage() {
  const router = useRouter();
  const { 
    faces, isColorMappingSet, colorMapping, setColorMapping,
    setSticker, isValidated, validationErrors, setValidation, 
    getKociembaString, isCountsValid, setSolution, setSource,
    activeColor, setActiveColor, getPalette, solution, reset
  } = useCubeStore();

  const [isMounted, setIsMounted] = useState(false);
  const [tempColors, setTempColors] = useState({ ...colorMapping });

  // State Machine
  // Modes: IDLE, CALIBRATING, SCANNING, UPLOAD, REVIEW, COMPLETED
  const [mode, setMode] = useState("CALIBRATING"); 
  const [activeScanFace, setActiveScanFace] = useState("U");
  const [reviewStickers, setReviewStickers] = useState(null);

  // Scanner settings and diagnostics
  const [gridSize, setGridSize] = useState(0.6); // 0.4 to 0.7
  const [sensitivity, setSensitivity] = useState("balanced");
  const [diagnostics, setDiagnostics] = useState(null);
  const [wsStatus, setWsStatus] = useState("connecting");
  const [wsError, setWsError] = useState("");

  // Solving state
  const [isSolving, setIsSolving] = useState(false);
  const [isSolveComplete, setIsSolveComplete] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const state = useCubeStore.getState();
    if (state.isCountsValid()) {
      setMode("COMPLETED");
    } else if (state.isColorMappingSet) {
      setMode("SCANNING");
    }
  }, []);

  // Handle particle background visibility
  const setShowParticles = useUIStore((state) => state.setShowParticles);
  useEffect(() => {
    if (mode === "SCANNING" || mode === "REVIEW" || mode === "UPLOAD" || mode === "MISMATCH_PROMPT") {
      setShowParticles(false);
    } else {
      setShowParticles(true);
    }
    return () => setShowParticles(true);
  }, [mode, setShowParticles]);

  if (!isMounted) return null;

  const currentFace = activeScanFace;
  const palette = getPalette();
  
  // ─── Actions ──────────────────────────────────────────────────

  const handleColorConfirm = () => {
    setColorMapping(tempColors);
    setMode("SCANNING");
    showPremiumToast({ title: "Calibration Complete", message: "Colors saved successfully.", type: "success" });
  };

  const handleCapture = (stickers) => {
    const centerSticker = stickers[4];
    const centerLabel = typeof centerSticker === "object" ? (centerSticker.label || centerSticker.color) : centerSticker;
    
    if (centerLabel && centerLabel !== "unknown" && centerLabel !== activeScanFace) {
       setReviewStickers(stickers);
       setMode("MISMATCH_PROMPT");
    } else {
       setReviewStickers(stickers);
       setMode("REVIEW");
    }
  };

  const handleAcceptFace = (stickers) => {
    stickers.forEach((s, i) => {
      const row = Math.floor(i / 3);
      const col = i % 3;
      const faceVal = typeof s === "object" ? (s.label || s.color) : s;
      setSticker(currentFace, row, col, faceVal);
    });

    // Check if we are done with all faces
    let hasUnknown = false;
    for (const face of FACE_ORDER) {
      if (face === currentFace) {
        // Check the stickers we just accepted
        stickers.forEach(s => {
           const faceVal = typeof s === "object" ? (s.label || s.color) : s;
           if (faceVal === "unknown") hasUnknown = true;
        });
      } else {
        // Check the store for other faces
        if (faces[face]) {
          for (const row of faces[face]) {
            for (const cell of row) {
              if (cell === "unknown") hasUnknown = true;
            }
          }
        }
      }
    }

    if (!hasUnknown) {
      setMode("SCANNING");
    } else {
      const currIdx = FACE_ORDER.indexOf(currentFace);
      // Find the next face that has 'unknown'
      let nextIdx = (currIdx + 1) % 6;
      for (let i = 0; i < 6; i++) {
        const checkFace = FACE_ORDER[nextIdx];
        let faceHasUnknown = false;
        if (faces[checkFace]) {
           for (const row of faces[checkFace]) {
              for (const cell of row) {
                 if (cell === "unknown") faceHasUnknown = true;
              }
           }
        }
        if (faceHasUnknown) {
           break;
        }
        nextIdx = (nextIdx + 1) % 6;
      }
      setActiveScanFace(FACE_ORDER[nextIdx]);
      setMode("SCANNING");
    }
  };

  const validateFinalCube = async () => {
    if (!isCountsValid()) {
      setValidation(false, ["Each color must be used exactly 9 times."]);
      return;
    }
    const cubeString = getKociembaString();
    try {
      const res = await validateCubeString(cubeString);
      if (res.valid) {
        setValidation(true);
        showPremiumToast({ title: "Cube Validated", message: "Cube is valid and ready to solve!", type: "success" });
      } else {
        setValidation(false, [res.error || "Invalid cube configuration"]);
      }
    } catch (err) {
      setValidation(false, ["Validation failed. Check your cube state."]);
    }
  };

  const handleSolve = async () => {
    if (!isValidated) {
      showPremiumToast({ title: "Invalid Cube", message: "Cube state is invalid. Please correct it.", type: "error" });
      return;
    }
    
    setIsSolving(true);
    setIsSolveComplete(false);
    setSource("/cube/scanner");

    await new Promise(requestAnimationFrame);

    try {
      const cubeString = getKociembaString();
      const result = await solveCube(cubeString);
      if (result.success) {
        setSolution(result);
        setIsSolveComplete(true);
      } else {
        showPremiumToast({ title: "Solve Failed", message: result.error || "Solve failed", type: "error" });
        setIsSolving(false);
      }
    } catch (err) {
      showPremiumToast({ title: "Solve Failed", message: "Failed to solve cube", type: "error" });
      setIsSolving(false);
    }
  };

  const handleOverlayComplete = () => {
    router.push("/cube/solution");
    setTimeout(() => {
      setIsSolving(false);
      setIsSolveComplete(false);
    }, 1000);
  };

  const handleEditSticker = (index) => {
    const faceKeys = Object.keys(colorMapping);
    const newStickers = [...reviewStickers];
    const currentSticker = newStickers[index];
    
    const currentVal = typeof currentSticker === "object" ? (currentSticker.label || currentSticker.color) : currentSticker;
    
    let nextIdx = 0;
    if (currentVal !== "unknown") {
      const foundIdx = faceKeys.indexOf(currentVal);
      if (foundIdx !== -1) nextIdx = (foundIdx + 1) % 6;
    }
    
    const nextLabel = faceKeys[nextIdx];
    
    newStickers[index] = {
      label: nextLabel,
      color: colorMapping[nextLabel] || nextLabel,
      confidence: 1,
      stable: true
    };
    
    setReviewStickers(newStickers);
  };

  // ─── Rendering Helpers ──────────────────────────────────────

  const renderStars = (score) => {
    const filled = Math.round(score / 20);
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map(i => (
          <span key={i} className={`text-xs ${i <= filled ? "text-amber-400" : "text-zinc-600"}`}>★</span>
        ))}
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center">
            <RiCameraLine className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold" style={{ fontFamily: "var(--font-display)" }}>
              Camera Scanner
            </h1>
            <p className="text-zinc-500 text-sm">
              Configure colors, scan faces, then solve.
            </p>
          </div>
          {mode !== "CALIBRATING" && (
            <button 
              onClick={() => {
              if (window.confirm("Are you sure you want to clear the current cube and start fresh?")) {
                useCubeStore.getState().resetAll();
                setMode("CALIBRATING");
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
            { num: 1, label: "Cube Colors", icon: RiPaletteLine, matchMode: ["CALIBRATING"] },
            { num: 2, label: "Scan Faces", icon: RiCameraLine, matchMode: ["SCANNING", "REVIEW", "UPLOAD"] },
            { num: 3, label: "Validation", icon: RiCheckLine, matchMode: ["COMPLETED"] },
          ].map((s) => {
            const isActive = s.matchMode.includes(mode);
            const isCompleted = s.num < (mode === "CALIBRATING" ? 1 : mode === "COMPLETED" ? 4 : 3) && !isActive;
            return (
              <button
                key={s.num}
                onClick={() => {
                  if (s.num === 1) setMode("CALIBRATING");
                  else if (isColorMappingSet && mode === "CALIBRATING") setMode("SCANNING");
                }}
                disabled={!isCompleted && !isActive}
                className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-medium transition-all duration-300 ${
                  isActive
                    ? "bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.1)]"
                    : isCompleted
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
          <div className="hidden sm:block flex-1 h-px bg-gradient-to-r from-white/10 to-transparent mx-2" />
        </div>
      </motion.div>

      <AnimatePresence mode="wait">
        
        {/* ─── Mode: Color Config ─── */}
        {mode === "CALIBRATING" && (
          <motion.div
            key="color_config"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <ColorConfiguration 
              tempColors={tempColors}
              setTempColors={setTempColors}
              onConfirm={handleColorConfirm}
            />
          </motion.div>
        )}

        {/* ─── Mode: Scanning ─── */}
        {(mode === "SCANNING" || mode === "REVIEW" || mode === "UPLOAD" || mode === "MISMATCH_PROMPT") && (
          <motion.div
            key="scan_workflow"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex flex-col gap-6"
          >
            {/* Face Selector Row */}
            <div className="flex justify-between items-center bg-black/20 border border-white/5 rounded-xl p-2">
               <div className="flex flex-wrap gap-2">
                 {FACE_ORDER.map(f => (
                   <button 
                     key={f}
                     onClick={() => {
                        setActiveScanFace(f);
                        if (mode === "REVIEW") setMode("SCANNING");
                     }}
                     className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all
                       ${activeScanFace === f ? "bg-white/10 text-white shadow-sm border border-white/10" : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5"}
                     `}
                   >
                     {FACE_LABELS[f]} ({f})
                   </button>
                 ))}
               </div>
               
               {(
                 <button 
                   disabled = {!isCountsValid()}
                   onClick={() => {
                     setMode("COMPLETED");
                     validateFinalCube();
                   }} 
                   className="btn-primary text-sm py-2 px-4 shadow-[0_0_15px_rgba(59,130,246,0.3)] disabled:opacity-50 disabled:cursor-not-allowed"
                 >
                  Validate Cube
                 </button>
               )}
            </div>

            {/* Top Zone: 2-Column Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-[42%_1fr] gap-6">
              
              {/* Col 1: Webcam/Review/Fallback */}
              <div className="h-full min-h-[300px]">
                {mode === "SCANNING" && (
                  <WebcamScanner 
                    face={activeScanFace}
                    palette={colorMapping}
                    sensitivity={sensitivity}
                    gridSize={gridSize}
                    onCapture={handleCapture}
                    onBack={() => setMode("UPLOAD")}
                    onUploadFallback={() => setMode("UPLOAD")}
                    onDiagnosticsUpdate={(diag, stable, status, err) => {
                       if (diag) setDiagnostics(diag);
                       setWsStatus(status);
                       if (err) setWsError(err);
                    }}
                  />
                )}
                {mode === "REVIEW" && (
                  <div className="h-full bg-black/40 border border-white/10 rounded-2xl flex items-center justify-center p-4">
                    <FaceReviewPanel 
                      face={activeScanFace}
                      stickers={reviewStickers}
                      onAccept={handleAcceptFace}
                      onRescan={() => setMode("SCANNING")}
                      onEditSticker={handleEditSticker}
                    />
                  </div>
                )}
                {mode === "MISMATCH_PROMPT" && (
                  <div className="h-full bg-black/80 backdrop-blur-md border border-white/10 rounded-2xl flex items-center justify-center p-6 relative overflow-hidden">
                    <div className="absolute inset-0 bg-red-500/10 pointer-events-none" />
                    <div className="relative z-10 flex flex-col items-center text-center max-w-sm">
                      <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mb-4">
                        <RiInformationLine className="w-8 h-8 text-red-400" />
                      </div>
                      <h3 className="text-xl font-bold text-white mb-2">Wrong Face Detected?</h3>
                      <p className="text-sm text-zinc-300 mb-6">
                        The detected center sticker is <strong className="text-white">{FACE_LABELS[typeof reviewStickers[4] === "object" ? (reviewStickers[4].label || reviewStickers[4].color) : reviewStickers[4]]}</strong>. You are currently scanning the <strong className="text-white">{FACE_LABELS[activeScanFace]}</strong> face.
                      </p>
                      <div className="flex flex-col gap-3 w-full">
                        <button 
                          onClick={() => {
                            setActiveScanFace(typeof reviewStickers[4] === "object" ? (reviewStickers[4].label || reviewStickers[4].color) : reviewStickers[4]);
                            setMode("REVIEW");
                          }} 
                          className="btn-primary py-3"
                        >
                          This is the {FACE_LABELS[typeof reviewStickers[4] === "object" ? (reviewStickers[4].label || reviewStickers[4].color) : reviewStickers[4]]} face
                        </button>
                        <button 
                          onClick={() => {
                            const newStickers = [...reviewStickers];
                            newStickers[4] = {
                                ...newStickers[4],
                                label: activeScanFace,
                                color: colorMapping[activeScanFace] || activeScanFace
                            };
                            setReviewStickers(newStickers);
                            setMode("REVIEW");
                          }} 
                          className="btn-secondary py-3 border-white/20 text-white"
                        >
                          Continue as {FACE_LABELS[activeScanFace]} face
                        </button>
                        <button 
                          onClick={() => setMode("SCANNING")} 
                          className="text-xs text-zinc-400 mt-2 hover:text-white"
                        >
                          Cancel and rescan
                        </button>
                      </div>
                    </div>
                  </div>
                )}
                {mode === "UPLOAD" && (
                  <UploadFallback 
                    face={activeScanFace}
                    palette={colorMapping}
                    onCapture={handleCapture}
                    onBack={() => setMode("SCANNING")}
                    onManualEntry={() => showPremiumToast({ title: "Manual Entry", message: "Click a square on the 2D Live Map to manually enter colors.", type: "info" })}
                  />
                )}
              </div>

              {/* Col 2: Editable 2D Live Map */}
              <div className="h-full">
                <div className="glass-card h-full flex flex-col !p-4">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
                     <div className="text-sm font-semibold text-zinc-200">2D Live Map</div>
                     
                     <div className="flex items-center gap-3">
                       <div className="text-[10px] text-zinc-500 text-left leading-tight max-w-[260px] hidden xl:block">
                         Paint missing stickers or click a center to scan.
                       </div>
                       <div className="flex gap-1 p-1 bg-black/30 rounded-lg border border-white/5">
                         {palette.map((item) => (
                           <button
                             key={item.face}
                             onClick={() => setActiveColor(item.face)}
                             className={`w-5 h-5 rounded-md border transition-all ${
                               activeColor === item.face 
                                 ? "border-white/80 shadow-[0_0_8px_rgba(255,255,255,0.2)] scale-110 z-10" 
                                 : "border-white/10 opacity-60 hover:opacity-100"
                             }`}
                             style={{ backgroundColor: item.color }}
                           />
                         ))}
                         <button
                           onClick={() => setActiveColor("unknown")}
                           className={`w-5 h-5 rounded-md border transition-all flex items-center justify-center ${
                             activeColor === "unknown" 
                               ? "border-white/80 shadow-[0_0_8px_rgba(255,255,255,0.2)] scale-110 z-10 bg-zinc-700" 
                               : "border-white/10 opacity-60 hover:opacity-100 bg-zinc-800"
                           }`}
                           title="Eraser"
                         >
                           <RiEraserLine className="w-3 h-3 text-white" />
                         </button>
                       </div>
                     </div>
                  </div>
                  
                  {/* 2D Net */}
                  <div className="flex-1 flex items-center justify-center min-h-[350px]">
                    <div className="w-full max-w-[470px] mx-auto">
                      <CubeNet 
                        onCenterClick={(faceKey) => {
                           setActiveScanFace(faceKey);
                           if (mode === "REVIEW") setMode("SCANNING");
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>

            </div>

            {/* Bottom Zone: Calibration & Diagnostics */}
            {mode === "SCANNING" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
                 
                 {/* Auto Calibration */}
                 <div className="glass-card p-6">
                   <h3 className="text-sm font-semibold text-zinc-200 flex items-center gap-2 mb-6">
                     <RiCameraLine className="w-4 h-4 text-zinc-400" />
                     Calibration
                   </h3>
                   
                   <div className="space-y-6">
                     {/* Grid Size Slider */}
                     <div>
                       <div className="flex justify-between text-xs text-zinc-400 mb-2">
                         <span>Adjust Grid Size</span>
                         <span className="font-mono text-amber-400">
                           {gridSize < 0.5 ? "Small" : gridSize > 0.6 ? "Large" : "Medium"}
                         </span>
                       </div>
                       <input 
                         type="range" 
                         min="0.3" 
                         max="0.8" 
                         step="0.05"
                         value={gridSize}
                         onChange={(e) => setGridSize(parseFloat(e.target.value))}
                         className="w-full accent-amber-400 h-1.5 bg-white/10 rounded-full appearance-none outline-none"
                       />
                       <p className="text-[10px] text-zinc-500 mt-1">Scale the grid to fit your physical cube</p>
                     </div>

                     {/* Sensitivity */}
                     <div>
                       <div className="text-xs text-zinc-400 mb-2">Detection Sensitivity</div>
                       <div className="flex gap-2">
                         {["fast", "balanced", "high"].map(s => (
                           <button 
                             key={s}
                             onClick={() => setSensitivity(s)}
                             className={`flex-1 py-1.5 text-xs rounded-md capitalize font-medium transition-colors ${
                               sensitivity === s 
                                 ? "bg-white/10 text-white border border-white/20" 
                                 : "bg-transparent text-zinc-500 hover:bg-white/5 border border-transparent"
                             }`}
                           >
                             {s}
                           </button>
                         ))}
                       </div>
                     </div>
                   </div>
                 </div>

                 {/* Diagnostics */}
                 <div className="glass-card p-6">
                   <div className="flex items-center justify-between mb-4">
                     <h3 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
                       <RiCheckLine className="w-4 h-4 text-zinc-400" />
                       Detection Status
                     </h3>
                     {wsStatus === "error" && (
                       <span className="text-xs text-red-400 font-medium bg-red-400/10 px-2 py-0.5 rounded-full">
                         Connection Error
                       </span>
                     )}
                   </div>
                   
                   <div className="space-y-4">
                     {DIAGNOSTICS.map(({ key, label }) => (
                       <div key={key} className="flex items-center justify-between">
                         <span className="text-sm text-zinc-300">{label}</span>
                         {renderStars(diagnostics?.[key] || 0)}
                       </div>
                     ))}
                   </div>
                   
                   {wsError && (
                     <div className="mt-4 p-2 rounded bg-red-500/10 border border-red-500/20 text-xs text-red-400">
                       {wsError}
                     </div>
                   )}
                 </div>

              </div>
            )}
            
            {/* Instructions Toggle */}
              <CubeUnfoldInstructions />
          </motion.div>
        )}

        {/* ─── Mode: Completed ─── */}
        {mode === "COMPLETED" && (
          <motion.div
            key="completed"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {/* Split layout 60/40 */}
            <div className="grid grid-cols-1 lg:grid-cols-[60%_1fr] gap-6 mb-8">
              {/* 2D Map (60%) */}
              <div className="glass-card p-6 h-full flex flex-col">
                 <div className="text-sm font-semibold text-zinc-200 mb-4 flex items-center gap-2">
                   <RiCheckLine className="text-zinc-400" />
                   Final 2D Preview
                 </div>
                 <div className="flex-1 flex items-center justify-center p-4">
                    <div className="w-full max-w-[420px] mx-auto">
                      <CubeNet readOnly={true} />
                    </div>
                 </div>
              </div>

              {/* 3D Map (40%) */}
              <div className="glass-card p-6 h-full flex flex-col">
                 <div className="text-sm font-semibold text-zinc-200 mb-4 flex items-center gap-2">
                   <RiCameraLine className="text-zinc-400" />
                   Final 3D Preview
                 </div>
                 <div className="flex-1 w-full flex items-center justify-center">
                   <div className="w-full aspect-square max-w-[320px] bg-black/40 rounded-xl border border-white/5 shadow-inner flex items-center justify-center overflow-hidden">
                      <Cube3D height="100%" autoRotate={true} />
                   </div>
                 </div>
              </div>
            </div>

            <div className="glass-card p-8 text-center max-w-2xl mx-auto mb-8 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-400 to-emerald-500" />
              <h2 className="text-2xl font-bold mb-2">Scan Complete</h2>
              
              {!isValidated && (
                <div className="mt-4 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-left">
                  <div className="text-sm font-semibold text-red-400 mb-2">Validation Errors</div>
                  <ul className="list-disc pl-5 text-sm text-red-400/90 space-y-1">
                    {validationErrors.map((e, i) => <li key={i}>{e}</li>)}
                  </ul>
                  <button 
                    onClick={() => setMode("SCANNING")}
                    className="btn-secondary mt-4 flex items-center gap-2"
                  >
                    <RiEditLine className="w-4 h-4" /> Go Back to Edit
                  </button>
                </div>
              )}

              {isValidated && (
                <p className="text-zinc-400 mb-8">
                  Your cube has been successfully scanned and validated. Ready to solve?
                </p>
              )}

              {isValidated && (
                <div className="flex gap-4 justify-center">
                  <button onClick={() => setMode("SCANNING")} className="btn-secondary">
                    Go Back
                  </button>
                  <button onClick={handleSolve} disabled={isSolving} className="btn-primary flex items-center gap-2">
                    {isSolving ? "Solving..." : "Solve Cube"}
                    <RiArrowRightLine className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
            
          </motion.div>
        )}

      </AnimatePresence>

      <SolvingOverlay 
        isVisible={isSolving} 
        isComplete={isSolveComplete} 
        onComplete={handleOverlayComplete} 
      />
    </div>
  );
}
