"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RiPaletteLine, RiArrowRightLine, RiLoader4Line, RiCheckLine, RiErrorWarningLine, RiCloseLine, RiLightbulbFlashLine } from "react-icons/ri";
import { validatePalette } from "@/services/api";

const FACE_ORDER = ["U", "R", "F", "D", "L", "B"];
const FACE_LABELS = { U: "Up", D: "Down", F: "Front", B: "Back", R: "Right", L: "Left" };

export default function ColorConfiguration({ tempColors, setTempColors, onConfirm }) {
  const [similarityStatus, setSimilarityStatus] = useState("ready"); // ready, good, acceptable, poor
  const [isValidating, setIsValidating] = useState(false);
  const [valResult, setValResult] = useState(null);

  const handleColorChange = (face, color) => {
    const newColors = { ...tempColors, [face]: color };
    setTempColors(newColors);
    setSimilarityStatus("ready");
    setValResult(null);
  };

  const handleConfirm = async () => {
    setIsValidating(true);
    try {
      const res = await validatePalette(tempColors);
      setValResult(res);
      if (res.status === "POOR") {
        setSimilarityStatus("poor");
      } else if (res.status === "ACCEPTABLE") {
        setSimilarityStatus("acceptable");
      } else {
        setSimilarityStatus("good");
      }
    } catch (err) {
      console.error(err);
      setSimilarityStatus("poor");
      setValResult({
        success: false,
        status: "POOR",
        score: 0,
        message: "Network error. Please try again.",
        warnings: ["Failed to reach validation server."],
        color_metrics: {}
      });
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <div className="manual-card relative overflow-hidden">
      <div className="flex items-center justify-between mb-2 relative z-10">
        <div className="flex items-center gap-2">
          <RiPaletteLine className="w-5 h-5 text-amber-400" />
          <h2 className="text-lg font-semibold">Select Your Cube Colors</h2>
        </div>
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-white/5 border border-white/10">
          <div className={`w-2 h-2 rounded-full ${
            similarityStatus === "ready" ? "bg-zinc-500 shadow-none" :
            similarityStatus === "good" ? "bg-green-500 shadow-[0_0_8px_#22c55e]" : 
            similarityStatus === "acceptable" ? "bg-yellow-500 shadow-[0_0_8px_#eab308]" : 
            "bg-red-500 shadow-[0_0_8px_#ef4444]"
          }`} />
          <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400">
            {similarityStatus === "ready" ? "Pending Check" : 
             similarityStatus === "good" ? "Colors Good" : 
             similarityStatus === "acceptable" ? "Acceptable" : "Too Similar"}
          </span>
        </div>
      </div>
      
      {!valResult && (
        <p className="text-sm text-zinc-500 mb-6 relative z-10">
          Every Rubik&apos;s Cube has unique center colors. Centers never move.
          Select the physical color of each face&apos;s center sticker.
        </p>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 relative z-10 mb-6">
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

      <AnimatePresence mode="wait">
        {!valResult ? (
          <motion.button
            key="validate-btn"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            onClick={handleConfirm}
            disabled={isValidating}
            className="btn-primary flex items-center gap-2 relative z-10 w-full justify-center disabled:opacity-75"
            whileHover={isValidating ? {} : { scale: 1.02 }}
            whileTap={isValidating ? {} : { scale: 0.98 }}
          >
            {isValidating ? (
              <>
                <RiLoader4Line className="w-4 h-4 animate-spin" />
                Validating Palette...
              </>
            ) : (
              <>
                Analyze Palette
                <RiArrowRightLine className="w-4 h-4" />
              </>
            )}
          </motion.button>
        ) : (
          <motion.div
            key="validation-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative z-10 flex flex-col gap-4 p-4 rounded-xl border bg-black/40 backdrop-blur-md overflow-hidden"
            style={{
              borderColor: valResult.status === "GOOD" ? "rgba(34, 197, 94, 0.3)" : 
                           valResult.status === "ACCEPTABLE" ? "rgba(234, 179, 8, 0.3)" : 
                           "rgba(239, 68, 68, 0.3)"
            }}
          >
            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  Palette Analysis
                  <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider
                    ${valResult.status === "GOOD" ? "bg-green-500/20 text-green-400" : 
                      valResult.status === "ACCEPTABLE" ? "bg-yellow-500/20 text-yellow-400" : 
                      "bg-red-500/20 text-red-400"}`}
                  >
                    {valResult.status === "GOOD" ? "Excellent" : valResult.status === "ACCEPTABLE" ? "Acceptable" : "Poor"}
                  </span>
                </h3>
                <div className="text-xs text-zinc-400 mt-1">Score: <strong className="text-zinc-200">{valResult.score} / 100</strong></div>
                <div className="text-xs text-zinc-400">Expected Accuracy: <strong className="text-zinc-200">{valResult.expected_accuracy || (valResult.score > 85 ? "Excellent" : valResult.score > 70 ? "Good" : "Unreliable")}</strong></div>
              </div>
            </div>

            {/* Quality Bars */}
            {valResult.color_metrics && Object.keys(valResult.color_metrics).length > 0 && (
              <div className="bg-black/30 rounded-lg p-3 border border-white/5 space-y-2">
                <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold mb-2">Color Quality</div>
                {Object.entries(valResult.color_metrics).map(([face, metric]) => (
                  <div key={face} className="flex items-center gap-3">
                    <div className="w-12 text-xs font-medium text-zinc-300">{metric.name}</div>
                    <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${metric.quality}%` }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className={`h-full rounded-full ${metric.quality > 85 ? "bg-zinc-300" : metric.quality > 70 ? "bg-yellow-500" : "bg-red-500"}`}
                      />
                    </div>
                    <div className="w-10 text-right text-xs font-mono text-zinc-400 flex justify-end gap-1 items-center">
                      {metric.quality}
                      {metric.quality <= 85 && <RiErrorWarningLine className={metric.quality <= 70 ? "text-red-400" : "text-yellow-400"} />}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Warnings */}
            {valResult.warnings && valResult.warnings.length > 0 && (
              <div className="space-y-1.5">
                <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">Warnings</div>
                {valResult.warnings.map((w, i) => {
                  const isGood = w.includes("✓") || w.includes("excellent") || w.includes("Good");
                  const cleanW = w.replace(/^[^a-zA-Z]+/, "").trim();
                  return (
                    <div key={i} className={`flex gap-2 text-xs leading-tight ${isGood ? "text-green-300" : "text-orange-300"}`}>
                      <span className="shrink-0">{isGood ? "✓" : "⚠"}</span>
                      <span>{cleanW}</span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Recommendations */}
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 mt-1">
               <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-blue-400 font-bold mb-1.5">
                 <RiLightbulbFlashLine /> Recommendations
               </div>
               <ul className="text-xs text-blue-200/80 space-y-1 pl-1">
                 <li className="flex gap-1.5"><RiCheckLine className="w-3.5 h-3.5 text-blue-400" /> Use brighter, neutral lighting</li>
                 <li className="flex gap-1.5"><RiCheckLine className="w-3.5 h-3.5 text-blue-400" /> Keep cube close to camera</li>
                 <li className="flex gap-1.5"><RiCheckLine className="w-3.5 h-3.5 text-blue-400" /> Avoid harsh reflections</li>
               </ul>
            </div>

            {/* Actions */}
            <div className="flex gap-2 mt-2">
              <button 
                onClick={() => setValResult(null)}
                className="flex-1 py-2 rounded-md border border-white/10 text-xs font-bold text-zinc-300 hover:bg-white/5 transition-colors"
              >
                Tweak Colors
              </button>
              {valResult.success && (
                <button 
                  onClick={onConfirm}
                  className="flex-1 py-2 rounded-md bg-white/10 border border-white/20 text-xs font-bold text-white hover:bg-white/20 transition-colors shadow-lg"
                >
                  Confirm & Scan
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
