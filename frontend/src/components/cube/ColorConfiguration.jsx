"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RiPaletteLine, RiArrowRightLine, RiLoader4Line } from "react-icons/ri";
import { toast } from "react-hot-toast";
import { validatePalette } from "@/services/api";

const FACE_ORDER = ["U", "R", "F", "D", "L", "B"];
const FACE_LABELS = { U: "Up", D: "Down", F: "Front", B: "Back", R: "Right", L: "Left" };

export default function ColorConfiguration({ tempColors, setTempColors, onConfirm }) {
  const [error, setError] = useState("");
  const [similarityStatus, setSimilarityStatus] = useState("ready"); // ready, good, acceptable, poor
  const [isValidating, setIsValidating] = useState(false);

  const handleColorChange = (face, color) => {
    const newColors = { ...tempColors, [face]: color };
    setTempColors(newColors);
    if (error) setError("");
    setSimilarityStatus("ready");
  };

  const handleConfirm = async () => {
    setIsValidating(true);
    try {
      const res = await validatePalette(tempColors);
      
      if (res.status === "POOR") {
        setSimilarityStatus("poor");
        setError(res.message || "Colors are too similar.");
      } else if (res.status === "ACCEPTABLE") {
        setSimilarityStatus("acceptable");
        setError("");
        toast(res.message, { icon: "⚠️" });
        onConfirm();
      } else {
        setSimilarityStatus("good");
        setError("");
        onConfirm();
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to validate colors with the server.");
      setSimilarityStatus("poor");
      setError("Network error. Please try again.");
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
      
      <p className="text-sm text-zinc-500 mb-6 relative z-10">
        Every Rubik&apos;s Cube has unique center colors. Centers never move.
        Select the physical color of each face&apos;s center sticker.
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 relative z-10">
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

      <AnimatePresence>
        {error && (
          <motion.div 
            initial={{ opacity: 0, height: 0, marginTop: 0 }} 
            animate={{ opacity: 1, height: "auto", marginTop: 24 }}
            exit={{ opacity: 0, height: 0, marginTop: 0 }}
            className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 flex items-start gap-3 relative z-10 overflow-hidden"
          >
            <div className="w-5 h-5 rounded-full bg-red-500/20 flex items-center justify-center shrink-0 mt-0.5">
              <span className="text-red-400 text-xs font-bold">!</span>
            </div>
            <div>
              <div className="text-sm font-semibold text-red-400 mb-1">Colors Too Similar</div>
              <div className="text-xs text-red-400/80 leading-relaxed">{error}</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        onClick={handleConfirm}
        disabled={isValidating}
        className="btn-primary mt-6 flex items-center gap-2 relative z-10 disabled:opacity-75"
        whileHover={isValidating ? {} : { scale: 1.02 }}
        whileTap={isValidating ? {} : { scale: 0.98 }}
      >
        {isValidating ? (
          <>
            <RiLoader4Line className="w-4 h-4 animate-spin" />
            Validating...
          </>
        ) : (
          <>
            Continue
            <RiArrowRightLine className="w-4 h-4" />
          </>
        )}
      </motion.button>
    </div>
  );
}
