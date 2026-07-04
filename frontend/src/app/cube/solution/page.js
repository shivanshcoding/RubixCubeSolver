"use client";

import { useMemo, useState, useCallback, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, animate } from "framer-motion";
import dynamic from "next/dynamic";
import {
  RiPlayLine,
  RiPauseLine,
  RiSkipForwardLine,
  RiSkipBackLine,
  RiRestartLine,
  RiArrowLeftLine,
  RiSpeedLine,
} from "react-icons/ri";
import { useCubeStore } from "@/store/cubeStore";
import { solveCube } from "@/services/api";
import { applyMoveSequence } from "@/utils/cubeSimulator";
import { useSolutionPlayer } from "@/hooks/useSolutionPlayer";
import NotationGuide from "@/components/cube/NotationGuide";

const Cube3D = dynamic(() => import("@/components/cube/Cube3D"), { ssr: false });

export default function SolutionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlSource = searchParams.get("source");
  const { solution, faces, colorMapping, getPalette, syntheticSolveTime, source: storeSource, loadKociembaString, setSolution } = useCubeStore();
  const palette = getPalette();
  
  const source = urlSource || storeSource || "/cube/manual";

  const moves = useMemo(() => {
    if (!solution?.moves) return [];
    return solution.moves.map(m => {
      if (typeof m === "string") {
        return {
          notation: m,
          face: m.charAt(0),
          direction: m.includes("'") ? "counterclockwise" : m.includes("2") ? "double" : "clockwise",
          explanation: `Rotate ${m}`
        };
      }
      return m;
    });
  }, [solution]);

  const {
    currentMoveIndex: currentMove,
    isPlaying,
    speed,
    setSpeed,
    uiLocked,
    animatingMove,
    animationProgress,
    currentFaces,
    play: togglePlay,
    next,
    prev,
    restart,
    jumpTo,
  } = useSolutionPlayer(moves, faces);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore if typing in input
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
      
      switch (e.key) {
        case "ArrowRight":
          if (!uiLocked && !isPlaying && currentMove < moves.length - 1) next();
          break;
        case "ArrowLeft":
          if (!uiLocked && !isPlaying && currentMove >= 0) prev();
          break;
        case " ":
          e.preventDefault();
          if (!uiLocked) togglePlay();
          break;
        case "r":
        case "R":
          if (!uiLocked) restart();
          break;
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [uiLocked, isPlaying, currentMove, moves.length, next, prev, togglePlay, restart]);

  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const stateParam = searchParams.get("state");
    if (!solution && stateParam && stateParam.length === 54) {
      const fetchSolution = async () => {
        setIsLoading(true);
        loadKociembaString(stateParam);
        try {
          const result = await solveCube(stateParam);
          if (result.success) {
            setSolution(result);
          }
        } catch (e) {
          console.error("Failed to solve cube from URL state:", e);
        } finally {
          setIsLoading(false);
        }
      };
      fetchSolution();
    }
  }, [searchParams, solution, loadKociembaString, setSolution]);

  if (!solution) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <div className="glass-card p-12">
          {isLoading ? (
            <>
              <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Re-calculating Solution...</h2>
              <p className="text-zinc-400">Please wait while we process this cube state.</p>
            </>
          ) : (
            <>
              <h2 className="text-xl font-semibold mb-4">No Solution Available</h2>
              <p className="text-zinc-400 mb-6">Solve a cube first to see the solution here.</p>
              <button onClick={() => router.push(source || "/cube/manual")} className="btn-primary">
                Go Back
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  const progress = moves.length > 0 ? ((currentMove + 1) / moves.length) * 100 : 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold" style={{ fontFamily: "var(--font-display)" }}>
              Solution Viewer
            </h1>
            <div className="flex items-center gap-4 mt-1 text-sm text-zinc-400">
              <span>{solution.move_count} moves</span>
              <span>•</span>
              <span>{syntheticSolveTime != null ? `${syntheticSolveTime} ms` : `${solution.solve_time_ms}ms`} solve time</span>
              <span>•</span>
              <span className={`badge ${
                solution.difficulty === 'hard' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                solution.difficulty === 'medium' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' :
                'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
              }`}>
                {solution.difficulty ? solution.difficulty.charAt(0).toUpperCase() + solution.difficulty.slice(1) : ''}
              </span>
            </div>
          </div>
          <button
            onClick={() => router.push(source)}
            className="btn-ghost flex items-center gap-1.5"
          >
            <RiArrowLeftLine className="w-4 h-4" />
            Back
          </button>
        </div>

        <div className="grid lg:grid-cols-5 gap-6">
          {/* 3D Cube (larger) */}
          <div className="lg:col-span-3 glass-card p-6 relative">
            <Cube3D 
              height="350px" 
              autoRotate={false} 
              faces={currentFaces} 
              animatingMove={animatingMove}
              animationProgress={animationProgress}
            />

            {/* Progress Bar */}
            <div className="mt-4">
              <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full"
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.2 }}
                />
              </div>
              <div className="flex justify-between text-xs text-zinc-500 mt-1">
                <span>Move {Math.max(0, currentMove + 1)} / {moves.length}</span>
                <span>{Math.round(progress)}%</span>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center gap-3 mt-4">
              <button onClick={restart} disabled={uiLocked} className="btn-ghost p-2 disabled:opacity-50" title="Restart (R)">
                <RiRestartLine className="w-5 h-5" />
              </button>
              <button onClick={prev} disabled={uiLocked || isPlaying || currentMove < 0} className="btn-ghost p-2 disabled:opacity-50" title="Previous (←)">
                <RiSkipBackLine className="w-5 h-5" />
              </button>
              <button
                onClick={togglePlay}
                disabled={uiLocked && !isPlaying}
                className="btn-primary p-3 rounded-full disabled:opacity-50 disabled:cursor-not-allowed"
                title="Play/Pause (Space)"
              >
                {isPlaying ? (
                  <RiPauseLine className="w-6 h-6" />
                ) : (
                  <RiPlayLine className="w-6 h-6" />
                )}
              </button>
              <button onClick={next} disabled={uiLocked || isPlaying || currentMove >= moves.length - 1} className="btn-ghost p-2 disabled:opacity-50" title="Next (→)">
                <RiSkipForwardLine className="w-5 h-5" />
              </button>

              {/* Speed Control */}
              <div className="flex items-center gap-1.5 ml-4">
                <RiSpeedLine className="w-4 h-4 text-zinc-500" />
                {[0.25, 0.5, 1, 2].map((s) => (
                  <button
                    key={s}
                    onClick={() => setSpeed(s)}
                    className={`px-2 py-1 rounded-md text-xs font-mono font-medium transition-all ${
                      speed === s
                        ? "bg-amber-400 text-black"
                        : "bg-white/[0.05] text-zinc-400 hover:bg-white/10"
                    }`}
                  >
                    {s}x
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Move List */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            <div className="glass-card p-6 relative overflow-hidden flex flex-col max-h-[450px]">
              {/* Decorative top fade */}
              <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-black/20 to-transparent pointer-events-none" />
              
              <h3 className="text-sm font-semibold mb-4 text-zinc-300 flex items-center gap-2 relative z-10">
                Move Sequence
                <span className="badge-primary ml-auto text-xs">{moves.length} steps</span>
              </h3>

              <div className="grid grid-cols-5 gap-2.5 overflow-y-auto pr-2 custom-scrollbar relative z-10 pb-4">
                {moves.length === 0 ? (
                  <div className="col-span-5 text-center py-8 text-zinc-400">
                    <h4 className="text-lg font-medium text-amber-500 mb-2">Cube is already solved!</h4>
                    <p className="text-sm">No moves are required. Great job!</p>
                  </div>
                ) : (
                  moves.map((move, i) => (
                    <button
                      key={i}
                      disabled={uiLocked || isPlaying}
                      onClick={() => jumpTo(i)}
                      className={`
                        relative group overflow-hidden px-2 py-3 rounded-xl text-sm font-mono font-medium transition-all duration-300
                        ${
                          i === currentMove
                            ? "bg-gradient-to-br from-amber-400 to-orange-500 text-black shadow-lg shadow-amber-500/20 scale-105 z-10"
                            : i < currentMove
                            ? "bg-white/10 text-white/90 shadow-sm border border-white/5"
                            : "bg-white/[0.02] text-zinc-500 hover:bg-white/[0.06] hover:text-zinc-300 border border-transparent hover:border-white/10"
                        } disabled:opacity-50
                      `}
                    >
                      {/* Active state inner glow */}
                      {i === currentMove && (
                        <div className="absolute inset-0 bg-white/20 blur-md pointer-events-none" />
                      )}
                      <span className="relative z-10">{move.notation}</span>
                    </button>
                  ))
                )}
              </div>

              {/* Current Move Explanation */}
              {currentMove >= 0 && moves[currentMove] && (
                <motion.div
                  key={currentMove}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 p-4 rounded-xl bg-gradient-to-r from-amber-500/10 to-orange-500/5 border border-amber-500/20 backdrop-blur-md relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/20 blur-3xl rounded-full pointer-events-none -translate-y-1/2 translate-x-1/2" />
                  
                  <div className="flex items-center gap-3 relative z-10">
                    <div className="w-10 h-10 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 font-mono font-bold text-lg shadow-inner">
                      {moves[currentMove].notation}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-amber-500/90 mb-0.5">
                        {moves[currentMove].explanation}
                      </div>
                      <div className="text-xs text-zinc-400 font-medium">
                        {moves[currentMove].face} face • {moves[currentMove].direction}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Alternative Solutions */}
            <div className="glass-card p-6 border-dashed border-white/10 bg-white/[0.01]">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-zinc-400">Alternative Solutions</h3>
                <span className="text-[10px] font-bold tracking-wider text-amber-500/70 uppercase bg-amber-500/10 px-2 py-0.5 rounded">Coming Soon</span>
              </div>
              <p className="text-xs text-zinc-500">
                In the next update, view solutions optimized for speed, fewest moves, or beginner CFOP methods.
              </p>
            </div>
            
            {/* Keyboard Shortcuts Overview */}
            <div className="px-2 text-xs text-zinc-500/80 flex items-center justify-center gap-4">
              <span><kbd className="font-mono bg-white/5 px-1 py-0.5 rounded">Space</kbd> Play/Pause</span>
              <span><kbd className="font-mono bg-white/5 px-1 py-0.5 rounded">←</kbd> / <kbd className="font-mono bg-white/5 px-1 py-0.5 rounded">→</kbd> Step</span>
              <span><kbd className="font-mono bg-white/5 px-1 py-0.5 rounded">R</kbd> Restart</span>
            </div>
          </div>
        </div>

        {/* Notation Guide */}
        <NotationGuide />
      </motion.div>
    </div>
  );
}
