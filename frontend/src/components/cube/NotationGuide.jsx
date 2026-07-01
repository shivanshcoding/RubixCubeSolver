"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RiInformationLine, RiLightbulbFlashLine, RiPlayLine, RiArrowDownSLine } from "react-icons/ri";
import dynamic from "next/dynamic";

const Cube3D = dynamic(() => import("@/components/cube/Cube3D"), { ssr: false });

const FACES = [
  { id: "R", name: "Right", desc: "Right side of the cube", directParams: [[6, 0, 0], [4.5, 2.5, 4.5]] },
  { id: "L", name: "Left", desc: "Left side of the cube", directParams: [[-6, 0, 0], [-4.5, 2.5, 4.5]] },
  { id: "U", name: "Up", desc: "Top side of the cube", directParams: [[0, 6, 0], [3, 4.5, 4.5]] },
  { id: "D", name: "Down", desc: "Bottom side of the cube", directParams: [[0, -6, 0], [3, -4.5, 4.5]] },
  { id: "F", name: "Front", desc: "Front side facing you", directParams: [[0, 0, 6], [3, 2, 5]] },
  { id: "B", name: "Back", desc: "Back side facing away", directParams: [[0, 0, -6], [-3, 2, -5]] },
];

const MODIFIERS = [
  { id: "", name: "Clockwise", desc: "Turn 90° clockwise" },
  { id: "'", name: "Counter", desc: "Turn 90° counter-clockwise" },
  { id: "2", name: "180°", desc: "Double turn (180°)" },
];

export default function NotationGuide() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedFace, setSelectedFace] = useState("R");
  const [selectedMod, setSelectedMod] = useState("");
  
  // Animation states
  // phases: idle, toFace, toAngle, playing, resetting
  const [phase, setPhase] = useState("idle");
  const [cameraPos, setCameraPos] = useState([0, 0, 6]);
  const [progress, setProgress] = useState(0);

  const activeFaceObj = FACES.find(f => f.id === selectedFace);
  const activeMove = selectedFace + selectedMod;

  useEffect(() => {
    if (phase === "idle") return;

    let timer;
    if (phase === "toFace") {
      setCameraPos(activeFaceObj.directParams[0]); // Shift to face
      timer = setTimeout(() => setPhase("toAngle"), 800);
    } else if (phase === "toAngle") {
      setCameraPos(activeFaceObj.directParams[1]); // Shift back to isometric angle
      timer = setTimeout(() => setPhase("playing"), 800);
    } else if (phase === "playing") {
      let animationFrameId;
      let start;
      const duration = 800;
      const step = (timestamp) => {
        if (!start) start = timestamp;
        const elapsed = timestamp - start;
        const newProgress = Math.min(elapsed / duration, 1);
        
        const easeInOutCubic = newProgress < 0.5 
          ? 4 * newProgress * newProgress * newProgress 
          : 1 - Math.pow(-2 * newProgress + 2, 3) / 2;

        setProgress(easeInOutCubic);
        
        if (newProgress < 1) {
          animationFrameId = requestAnimationFrame(step);
        } else {
          timer = setTimeout(() => setPhase("resetting"), 1000);
        }
      };
      animationFrameId = requestAnimationFrame(step);
      return () => cancelAnimationFrame(animationFrameId);
    } else if (phase === "resetting") {
      setCameraPos([0, 0, 6]);
      setProgress(0);
      timer = setTimeout(() => setPhase("idle"), 1000);
    }

    return () => clearTimeout(timer);
  }, [phase, activeFaceObj]);

  const handlePlay = (face, mod) => {
    if (phase !== "idle") return;
    setSelectedFace(face);
    setSelectedMod(mod);
    setProgress(0);
    setPhase("toFace");
  };

  return (
    <div className="glass-card mt-6 border border-white/5 relative overflow-hidden group">
      {/* Header (Accordion Toggle) */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-5 hover:bg-white/[0.02] transition-colors relative z-10"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-400">
            <RiInformationLine className="w-5 h-5" />
          </div>
          <div className="text-left">
            <h3 className="text-base font-semibold text-zinc-200">Notation Guide & Interactive Preview</h3>
            <p className="text-xs text-zinc-500">Learn and visualize any Rubik's Cube move</p>
          </div>
        </div>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.3 }}
          className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center"
        >
          <RiArrowDownSLine className="w-5 h-5 text-zinc-400" />
        </motion.div>
      </button>

      {/* Accordion Content */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="p-6 pt-0 relative z-10">
              <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none group-hover:bg-amber-500/20 transition-all duration-700 -translate-y-1/2 translate-x-1/2" />
              <div className="h-px w-full bg-white/5 mb-6" />
              
              <div className="flex flex-col lg:flex-row gap-6 mb-2">
                {/* 3D Visualization */}
                <div className="lg:w-2/3 glass-card p-0 overflow-hidden bg-black/40 flex flex-col relative border-amber-500/10">
                  <div className="absolute top-4 left-4 z-10">
                    <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
                      Move Preview
                    </div>
                    <div className="text-2xl font-mono font-bold text-amber-400 drop-shadow-md flex items-center gap-2">
                      {activeMove}
                      {phase !== "idle" && (
                        <span className="text-[9px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 uppercase tracking-wider font-bold">
                          {phase === "playing" ? "Playing" : phase === "resetting" ? "Reset" : "Camera Shift"}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="relative min-h-[300px] w-full flex-1">
                    <div className="absolute pointer-events-none inset-0 flex items-center justify-center">
                      <Cube3D 
                        height="70%" 
                        autoRotate={false} 
                        animatingMove={phase === "playing" || (phase === "resetting" && progress > 0) ? activeMove : null}
                        animationProgress={progress}
                        cameraPosition={cameraPos}
                        enableControls={false}
                      />
                    </div>
                  </div>
                </div>

                {/* Move Selection Panel */}
                <div className="lg:w-1/3 flex flex-col gap-4">
                  <div>
                    <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">1. Select Face</h4>
                    <div className="grid grid-cols-3 gap-2">
                      {FACES.map(f => (
                        <button
                          key={f.id}
                          disabled={phase !== "idle"}
                          onClick={() => {
                            if (phase !== "idle") return;
                            setSelectedFace(f.id);
                          }}
                          className={`px-2 py-2 rounded-lg text-sm font-bold font-mono transition-all ${
                            selectedFace === f.id
                              ? "bg-amber-500/20 text-amber-400 border border-amber-500/50"
                              : "bg-white/5 text-zinc-400 border border-white/5 hover:bg-white/10 hover:text-zinc-200"
                          } disabled:opacity-50`}
                        >
                          {f.id}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">2. Play Move</h4>
                    <div className="flex flex-col gap-2">
                      {MODIFIERS.map(mod => {
                        const moveStr = selectedFace + mod.id;
                        const isThisPlaying = phase !== "idle" && selectedMod === mod.id;
                        
                        return (
                          <button
                            key={mod.id}
                            disabled={phase !== "idle"}
                            onClick={() => handlePlay(selectedFace, mod.id)}
                            className={`w-full px-4 py-2.5 rounded-lg text-sm font-mono font-medium transition-all flex items-center justify-between ${
                              isThisPlaying
                                ? "bg-gradient-to-r from-amber-500 to-orange-500 text-black shadow-lg shadow-amber-500/20"
                                : "bg-white/5 text-zinc-300 hover:bg-white/10 hover:text-white border border-white/5 hover:border-white/10"
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                          >
                            <span className="flex items-center gap-2">
                              <RiPlayLine className="w-4 h-4" />
                              {moveStr}
                            </span>
                            <span className={`text-[10px] ${isThisPlaying ? "text-black/70" : "text-zinc-500"}`}>
                              {mod.name}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Move Description */}
                  <div className="mt-auto bg-white/[0.02] border border-white/5 rounded-xl p-4">
                    <div className="flex items-start gap-2 mb-1">
                      <RiLightbulbFlashLine className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                      <div>
                        <span className="text-sm font-bold text-zinc-200 block mb-1">
                          {activeFaceObj.name} Face
                        </span>
                        <p className="text-xs text-zinc-400 leading-relaxed">
                          {activeFaceObj.desc}. Imagine looking directly at this face, then turn it {MODIFIERS.find(m => m.id === selectedMod)?.desc.toLowerCase()}.
                        </p>
                      </div>
                    </div>
                  </div>

                </div>
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
