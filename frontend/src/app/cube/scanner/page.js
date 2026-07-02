"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import dynamic from "next/dynamic";
import {
  RiCameraLine,
  RiRefreshLine,
  RiCheckLine,
  RiArrowRightLine,
  RiEditLine,
  RiUploadCloud2Line,
  RiPaletteLine,
  RiInformationLine,
  RiEraserLine
} from "react-icons/ri";
import { useCubeStore } from "@/store/cubeStore";
import { useUIStore } from "@/store/uiStore";
import { solveCube, validateCubeString } from "@/services/api";

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
    if (solution) {
      reset();
      setMode("CALIBRATING");
    } else if (isColorMappingSet) {
      setMode("SCANNING");
    }
  }, [isColorMappingSet, solution, reset]);

  // Handle particle background visibility
  const setShowParticles = useUIStore((state) => state.setShowParticles);
  useEffect(() => {
    if (mode === "SCANNING" || mode === "REVIEW" || mode === "UPLOAD") {
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
    toast.success("Calibration complete!");
  };

  const handleCapture = (stickers) => {
    setReviewStickers(stickers);
    setMode("REVIEW");
  };

  const handleAcceptFace = (stickers) => {
    stickers.forEach((s, i) => {
      const row = Math.floor(i / 3);
      const col = i % 3;
      const faceVal = typeof s === "object" ? s.color : s;
      setSticker(currentFace, row, col, faceVal);
    });

    const currIdx = FACE_ORDER.indexOf(currentFace);
    if (currIdx < 5) {
      setActiveScanFace(FACE_ORDER[currIdx + 1]);
      setMode("SCANNING");
    } else {
      setMode("COMPLETED");
      validateFinalCube();
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
        toast.success("Cube is valid and ready to solve!");
      } else {
        setValidation(false, [res.error || "Invalid cube configuration"]);
      }
    } catch (err) {
      setValidation(false, ["Validation failed. Check your cube state."]);
    }
  };

  const handleSolve = async () => {
    if (!isValidated) {
      toast.error("Cube state is invalid. Please correct it.");
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
        toast.error(result.error || "Solve failed");
        setIsSolving(false);
      }
    } catch (err) {
      toast.error("Failed to solve cube");
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
    const currentVal = typeof newStickers[index] === "object" ? newStickers[index].color : newStickers[index];
    
    let nextIdx = 0;
    if (currentVal !== "unknown") {
      const foundIdx = faceKeys.indexOf(currentVal);
      if (foundIdx !== -1) nextIdx = (foundIdx + 1) % 6;
    }
    
    newStickers[index] = faceKeys[nextIdx];
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
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold" style={{ fontFamily: "var(--font-display)" }}>
              Camera Scanner
            </h1>
            <p className="text-zinc-500 text-sm">
              Configure colors, scan faces, then solve.
            </p>
          </div>
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
                className={`manual-step-btn ${isActive ? "active" : ""}`}
              >
                <span className={`manual-step-num ${isActive ? "active" : ""}`}>
                  {isCompleted ? <RiCheckLine className="w-3.5 h-3.5" /> : s.num}
                </span>
                <s.icon className="w-4 h-4 hidden sm:block" />
                {s.label}
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
        {(mode === "SCANNING" || mode === "REVIEW" || mode === "UPLOAD") && (
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
               
               {isCountsValid() && mode !== "COMPLETED" && (
                 <button 
                   onClick={() => {
                     setMode("COMPLETED");
                     validateFinalCube();
                   }} 
                   className="btn-primary text-sm py-2 px-4 shadow-[0_0_15px_rgba(59,130,246,0.3)]"
                 >
                   Proceed to Solve
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
                {mode === "UPLOAD" && (
                  <UploadFallback 
                    face={activeScanFace}
                    palette={colorMapping}
                    onCapture={handleCapture}
                    onBack={() => setMode("SCANNING")}
                    onManualEntry={() => toast.success("Click a square on the 2D Live Map to manually enter colors.", { icon: "👆" })}
                  />
                )}
              </div>

              {/* Col 2: Editable 2D Live Map */}
              <div className="h-full">
                <div className="manual-card h-full flex flex-col !p-4">
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
                 <div className="manual-card">
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
                 <div className="manual-card">
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
              <div className="manual-card h-full flex flex-col">
                 <div className="text-sm font-semibold text-zinc-200 mb-4 flex items-center gap-2">
                   <RiCheckLine className="text-zinc-400" />
                   Final 2D Preview
                 </div>
                 <div className="flex-1 flex items-center justify-center p-4">
                    <div className="w-full max-w-[420px] mx-auto">
                      <CubeNet />
                    </div>
                 </div>
              </div>

              {/* 3D Map (40%) */}
              <div className="manual-card h-full flex flex-col">
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
