"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  RiPaletteLine, RiArrowRightLine, RiLoader4Line, 
  RiCheckLine, RiErrorWarningLine, RiCloseLine, RiRefreshLine,
  RiContrastDrop2Line, RiRainbowLine, RiLineChartLine
} from "react-icons/ri";
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
        message: "Network error. Please try again.",
        warnings: ["Failed to reach validation server."],
      });
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <div className="glass-card p-3 lg:p-8 relative overflow-hidden flex flex-col gap-8">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
              <RiPaletteLine className="w-4 h-4 text-amber-400" />
            </div>
            <h2 className="text-xl font-bold text-white">Center Colors</h2>
          </div>
          <p className="text-sm text-zinc-400">
            Select the exact color of each face's center sticker. Center pieces never move and dictate the face color.
          </p>
        </div>
      </div>

      {/* Color Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {FACE_ORDER.map((face, i) => (
          <motion.div
            key={face}
            className="flex items-center gap-4 p-3 rounded-2xl bg-black/20 border border-white/5 hover:bg-white/5 hover:border-white/10 transition-all group"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <div className="relative w-12 h-12 rounded-xl overflow-hidden shrink-0 shadow-lg border border-white/10 group-hover:scale-105 transition-transform duration-300">
              <input
                type="color"
                value={tempColors[face]}
                onChange={(e) => handleColorChange(face, e.target.value)}
                className="absolute inset-[-10px] w-[200%] h-[200%] cursor-pointer opacity-0 z-10"
              />
              <div 
                className="absolute inset-0 pointer-events-none" 
                style={{ backgroundColor: tempColors[face] }}
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-zinc-200 group-hover:text-white transition-colors truncate">
                {FACE_LABELS[face]}
              </div>
              <div className="text-xs text-zinc-500 font-mono mt-0.5 truncate uppercase">
                {tempColors[face]}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Analysis & Actions */}
      <div className="pt-2 border-t border-white/5">
        <AnimatePresence mode="wait">
          {!valResult ? (
            <motion.button
              key="validate-btn"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              onClick={handleConfirm}
              disabled={isValidating}
              className="btn-primary w-full sm:w-auto px-8 py-3 flex items-center justify-center gap-2 mx-auto disabled:opacity-75"
              whileHover={isValidating ? {} : { scale: 1.02, boxShadow: "0 0 20px rgba(59,130,246,0.3)" }}
              whileTap={isValidating ? {} : { scale: 0.98 }}
            >
              {isValidating ? (
                <>
                  <RiLoader4Line className="w-5 h-5 animate-spin" />
                  Analyzing Palette...
                </>
              ) : (
                <>
                  Analyze Colors
                  <RiArrowRightLine className="w-5 h-5" />
                </>
              )}
            </motion.button>
          ) : (
            <motion.div
              key="analysis-result"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col gap-5 p-5 rounded-xl border border-white/10 bg-black/40 backdrop-blur-sm"
            >
              {/* Header Status */}
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${
                  valResult.status === "GOOD" ? "bg-green-500" : 
                  valResult.status === "ACCEPTABLE" ? "bg-yellow-500" : 
                  "bg-red-500"
                }`} />
                <div>
                  <h3 className="text-sm font-medium text-white">
                    {valResult.status === "GOOD" ? "Excellent Palette" : 
                     valResult.status === "ACCEPTABLE" ? "Acceptable Palette" : 
                     "Poor Contrast"}
                  </h3>
                </div>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-white/5 rounded-lg p-3">
                  <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1">Perceptual Dist</div>
                  <div className="flex items-end gap-1">
                    <span className="text-lg font-mono text-white">{valResult.minimum_distance?.toFixed(1) || "0.0"}</span>
                    <span className="text-[10px] text-zinc-500 mb-1">ΔE</span>
                  </div>
                </div>

                <div className="bg-white/5 rounded-lg p-3">
                  <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1">Hue Sep</div>
                  <div className="flex items-end gap-1">
                    <span className="text-lg font-mono text-white">{valResult.minimum_hue_distance?.toFixed(1) || "0.0"}</span>
                    <span className="text-[10px] text-zinc-500 mb-1">deg</span>
                  </div>
                </div>

                <div className="bg-white/5 rounded-lg p-3">
                  <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1">Overlap</div>
                  <div className="flex items-end gap-1">
                    <span className="text-lg font-mono text-white">{valResult.maximum_hue_overlap?.toFixed(1) || "0.0"}</span>
                    <span className="text-[10px] text-zinc-500 mb-1">deg</span>
                  </div>
                </div>
              </div>

              {/* Suggestions / Warnings */}
              {valResult.warnings && valResult.warnings.length > 0 && (
                <div className="border-t border-white/5 pt-4 mt-2">
                  <div className="space-y-2">
                    {valResult.warnings.map((w, i) => {
                      const isGood = w.includes("✓") || w.includes("excellent") || w.includes("Good");
                      const cleanW = w.replace(/^[^a-zA-Z]+/, "").trim();
                      return (
                        <div key={i} className="flex gap-2 text-sm">
                          {isGood ? (
                            <RiCheckLine className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />
                          ) : (
                            <RiErrorWarningLine className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                          )}
                          <span className={isGood ? "text-zinc-400" : "text-zinc-300"}>{cleanW}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t border-white/5 mt-2">
                <button 
                  onClick={() => setValResult(null)}
                  className="btn-ghost flex-1 py-2 text-xs uppercase tracking-wider"
                >
                  Adjust Colors
                </button>
                {valResult.success && (
                  <button 
                    onClick={onConfirm}
                    className="btn-primary flex-1 py-2 text-xs uppercase tracking-wider"
                  >
                    Confirm
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
