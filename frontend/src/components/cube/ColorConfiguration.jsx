"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  RiPaletteLine, RiArrowRightLine, RiLoader4Line, 
  RiCheckLine, RiErrorWarningLine, RiCloseLine, RiRefreshLine
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
              className={`flex flex-col gap-5 p-5 rounded-2xl border bg-black/40 backdrop-blur-md overflow-hidden ${
                valResult.status === "GOOD" ? "border-green-500/30" : 
                valResult.status === "ACCEPTABLE" ? "border-yellow-500/30" : 
                "border-red-500/30"
              }`}
            >
              {/* Header Status */}
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                  valResult.status === "GOOD" ? "bg-green-500/20 text-green-400" : 
                  valResult.status === "ACCEPTABLE" ? "bg-yellow-500/20 text-yellow-400" : 
                  "bg-red-500/20 text-red-400"
                }`}>
                  {valResult.status === "GOOD" ? <RiCheckLine className="w-5 h-5" /> : <RiErrorWarningLine className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {valResult.status === "GOOD" ? "Excellent Palette!" : 
                     valResult.status === "ACCEPTABLE" ? "Acceptable Palette" : 
                     "Poor Palette Contrast"}
                  </h3>
                  <p className="text-sm text-zinc-400 mt-0.5">
                    {valResult.status === "GOOD" ? "Colors are easily distinguishable." : 
                     valResult.status === "ACCEPTABLE" ? "Some colors are similar, but usable." : 
                     "Colors are too similar for reliable detection."}
                  </p>
                </div>
              </div>

              {/* Simplified Warnings */}
              {valResult.status !== "GOOD" && valResult.warnings && valResult.warnings.length > 0 && (
                <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                  <div className="text-xs uppercase tracking-wider text-zinc-500 font-bold mb-3">Suggestions</div>
                  <div className="space-y-2">
                    {valResult.warnings.map((w, i) => {
                      const isGood = w.includes("✓") || w.includes("excellent") || w.includes("Good");
                      const cleanW = w.replace(/^[^a-zA-Z]+/, "").trim();
                      if (isGood) return null; // Only show issues
                      return (
                        <div key={i} className="flex gap-2 text-sm text-zinc-300">
                          <RiErrorWarningLine className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
                          <span>{cleanW}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button 
                  onClick={() => setValResult(null)}
                  className="btn-ghost flex-1 flex justify-center items-center gap-2 py-2.5"
                >
                  <RiRefreshLine className="w-4 h-4" />
                  Adjust Colors
                </button>
                {valResult.success && (
                  <button 
                    onClick={onConfirm}
                    className="btn-primary flex-1 py-2.5 shadow-[0_0_15px_rgba(59,130,246,0.2)]"
                  >
                    Confirm & Continue
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
