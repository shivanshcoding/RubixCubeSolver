"use client";

import { motion } from "framer-motion";
import { RiRefreshLine, RiCheckLine, RiInformationLine } from "react-icons/ri";
import { useCubeStore } from "@/store/cubeStore";

export default function FaceReviewPanel({ face, stickers, onAccept, onRescan, onEditSticker }) {
  const colorMapping = useCubeStore((state) => state.colorMapping);

  const renderSticker = (s, i) => {
    const isLocked = i === 4; // Center sticker is locked
    // s can be a string (label like "U") or object { label: "U", confidence: 0.95 }
    const label = typeof s === "string" ? s : (s.label || "unknown");
    const bgColor = label !== "unknown" ? colorMapping[label] : "#333";
    const confidence = typeof s === "object" ? s.confidence : 1;
    
    return (
      <div 
        key={i} 
        onClick={() => !isLocked && onEditSticker(i)}
        className={`relative rounded-sm overflow-hidden flex items-center justify-center border transition-all ${
          isLocked 
            ? "border-white/40 shadow-[inset_0_0_10px_rgba(255,255,255,0.2)]" 
            : "border-white/10 hover:border-white/50 cursor-pointer"
        }`}
        style={{ aspectRatio: "1/1", backgroundColor: bgColor }}
      >
        <span className="text-white/50 text-xs font-bold drop-shadow-md z-10 pointer-events-none">{label !== "unknown" ? label : "?"}</span>
        {isLocked && (
           <div className="absolute inset-0 flex items-center justify-center bg-black/20 pointer-events-none">
             {/* Note: The dot is hidden or kept subtle */}
           </div>
        )}
        {!isLocked && confidence < 0.9 && label !== "unknown" && (
           <div className="absolute top-1 right-1 text-red-500 text-[10px] bg-black/60 rounded px-1 font-bold z-20">!</div>
        )}
      </div>
    );
  };

  return (
    <div className="manual-card flex flex-col items-center max-w-md mx-auto w-full">
      <div className="text-sm font-semibold text-zinc-200 mb-1">{face} Face Captured</div>
      <div className="text-xs text-zinc-500 mb-6">Review the detected colors. Tap any sticker to correct it.</div>

      <div className="w-full max-w-[240px] aspect-square grid grid-cols-3 grid-rows-3 gap-1.5 p-2 bg-black/40 rounded-xl border border-white/5 mb-6">
        {stickers.map((s, i) => renderSticker(s, i))}
      </div>

      <div className="flex items-start gap-2 text-xs text-zinc-400 bg-blue-500/10 p-3 rounded-lg border border-blue-500/20 w-full mb-6">
        <RiInformationLine className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
        <p>
          Ensure all colors match your physical cube exactly. 
          Center stickers are locked to your calibration.
        </p>
      </div>

      <div className="flex gap-3 w-full">
        <button onClick={onRescan} className="btn-secondary flex-1 flex items-center justify-center gap-2">
          <RiRefreshLine className="w-4 h-4" />
          Retake
        </button>
        <button onClick={() => onAccept(stickers)} className="btn-primary flex-1 flex items-center justify-center gap-2">
          Accept
          <RiCheckLine className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
