"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RiPaletteLine, RiArrowRightLine, RiInformationLine } from "react-icons/ri";

const FACE_ORDER = ["U", "R", "F", "D", "L", "B"];
const FACE_LABELS = { U: "Up", D: "Down", F: "Front", B: "Back", R: "Right", L: "Left" };

// Basic HSV distance (not true Delta E, but sufficient for this context)
function hexToHsv(hex) {
  let r = 0, g = 0, b = 0;
  if (hex.length === 4) {
    r = parseInt(hex[1] + hex[1], 16);
    g = parseInt(hex[2] + hex[2], 16);
    b = parseInt(hex[3] + hex[3], 16);
  } else if (hex.length === 7) {
    r = parseInt(hex.substring(1, 3), 16);
    g = parseInt(hex.substring(3, 5), 16);
    b = parseInt(hex.substring(5, 7), 16);
  }
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, v = max;
  const d = max - min;
  s = max === 0 ? 0 : d / max;
  if (max === min) {
    h = 0; // achromatic
  } else {
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return [h * 360, s * 100, v * 100];
}

function getColorDistance(hex1, hex2) {
  const [h1, s1, v1] = hexToHsv(hex1);
  const [h2, s2, v2] = hexToHsv(hex2);
  
  // Cylinder distance approximation
  const dh = Math.min(Math.abs(h1 - h2), 360 - Math.abs(h1 - h2)) / 180.0;
  const ds = (s1 - s2) / 100.0;
  const dv = (v1 - v2) / 100.0;
  
  return Math.sqrt(dh*dh + ds*ds + dv*dv);
}

export default function ColorConfiguration({ tempColors, setTempColors, onConfirm }) {
  const [error, setError] = useState("");
  const [similarityStatus, setSimilarityStatus] = useState("good"); // good, acceptable, poor

  const checkSimilarity = (colors) => {
    let minDistance = 999;
    let worstPair = null;

    const faces = Object.keys(colors);
    for (let i = 0; i < faces.length; i++) {
      for (let j = i + 1; j < faces.length; j++) {
        const dist = getColorDistance(colors[faces[i]], colors[faces[j]]);
        if (dist < minDistance) {
          minDistance = dist;
          worstPair = { f1: faces[i], f2: faces[j], dist };
        }
      }
    }

    if (minDistance < 0.1) {
      setSimilarityStatus("poor");
      return `The selected ${FACE_LABELS[worstPair.f1]} and ${FACE_LABELS[worstPair.f2]} colors are too similar for reliable computer vision detection. Please choose more distinct shades.`;
    } else if (minDistance < 0.3) {
      setSimilarityStatus("acceptable");
      setError("");
      return null;
    } else {
      setSimilarityStatus("good");
      setError("");
      return null;
    }
  };

  const handleColorChange = (face, color) => {
    const newColors = { ...tempColors, [face]: color };
    setTempColors(newColors);
    checkSimilarity(newColors);
  };

  const handleConfirm = () => {
    const simError = checkSimilarity(tempColors);
    if (simError) {
      setError(simError);
      return;
    }
    onConfirm();
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
            similarityStatus === "good" ? "bg-green-500 shadow-[0_0_8px_#22c55e]" : 
            similarityStatus === "acceptable" ? "bg-yellow-500 shadow-[0_0_8px_#eab308]" : 
            "bg-red-500 shadow-[0_0_8px_#ef4444]"
          }`} />
          <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400">
            {similarityStatus === "good" ? "Colors Good" : similarityStatus === "acceptable" ? "Acceptable" : "Too Similar"}
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
        className="btn-primary mt-6 flex items-center gap-2 relative z-10"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        Continue
        <RiArrowRightLine className="w-4 h-4" />
      </motion.button>
    </div>
  );
}
