"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { useCubeStore } from "@/store/cubeStore";

const FACE_ORDER = ["U", "R", "F", "D", "L", "B"];
const FACE_LABELS = { U: "Up", R: "Right", F: "Front", D: "Down", L: "Left", B: "Back" };

/**
 * CubeNet — Interactive 2D unfolded cube layout.
 *
 * Renders the standard unfolded layout:
 *     U
 *  L  F  R  B
 *     D
 *
 * Each sticker is clickable and updates the cube store.
 */
export default function CubeNet() {
  const { faces, colorMapping, activeColor, paintSticker, getStickerCounts } = useCubeStore();
  const counts = getStickerCounts();

  function handleClick(face, row, col) {
    paintSticker(face, row, col);
  }

  function FaceGrid({ face }) {
    return (
      <div className="p-1">
        <div className="text-[10px] text-zinc-500 text-center mb-1 font-medium tracking-wide">
          {FACE_LABELS[face]}
        </div>
        <div className="grid grid-cols-3 gap-[3px]">
          {faces[face].map((row, ri) =>
            row.map((cell, ci) => {
              const isCenter = ri === 1 && ci === 1;
              return (
                <motion.button
                  key={`${face}-${ri}-${ci}`}
                  onClick={() => handleClick(face, ri, ci)}
                  className={`cube-sticker ${isCenter ? "center" : ""} ${
                    cell === activeColor && !isCenter ? "active" : ""
                  }`}
                  style={{ backgroundColor: colorMapping[cell] || "#333" }}
                  whileHover={!isCenter ? { scale: 1.1 } : {}}
                  whileTap={!isCenter ? { scale: 0.95 } : {}}
                  aria-label={`Face ${face}, row ${ri}, col ${ci}: ${cell}`}
                  disabled={isCenter}
                />
              );
            })
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Unfolded cube layout */}
      <div
        className="inline-grid gap-1 w-full"
        style={{
          gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
          gridTemplateRows: "repeat(3, auto)",
        }}
      >
        <div className="col-start-2 row-start-1">
          <FaceGrid face="U" />
        </div>
        <div className="col-start-1 row-start-2">
          <FaceGrid face="L" />
        </div>
        <div className="col-start-2 row-start-2">
          <FaceGrid face="F" />
        </div>
        <div className="col-start-3 row-start-2">
          <FaceGrid face="R" />
        </div>
        <div className="col-start-4 row-start-2">
          <FaceGrid face="B" />
        </div>
        <div className="col-start-2 row-start-3">
          <FaceGrid face="D" />
        </div>
      </div>

      {/* Color counts */}
      <div className="mt-4 grid grid-cols-6 gap-2">
        {FACE_ORDER.map((f) => {
          const count = counts[f] || 0;
          const isValid = count === 9;
          return (
            <div
              key={f}
              className={`glass-card p-2 text-center text-xs font-medium ${
                isValid ? "text-green-400 border-green-400/20" : "text-zinc-400"
              } ${count > 9 ? "text-red-400 border-red-400/20" : ""}`}
            >
              <div
                className="w-3 h-3 rounded-sm mx-auto mb-1"
                style={{ backgroundColor: colorMapping[f] }}
              />
              {f}: {count}/9
            </div>
          );
        })}
      </div>
    </div>
  );
}
