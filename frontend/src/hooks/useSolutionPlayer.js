import { useState, useCallback, useRef, useEffect } from "react";
import { animate } from "framer-motion";
import { applyMoveSequence } from "@/utils/cubeSimulator";

function invertMove(move) {
  if (move.includes("'")) return move.replace("'", "");
  if (move.includes("2")) return move; // Double moves are their own inverse
  return move + "'";
}

export function useSolutionPlayer(moves, initialFaces) {
  const [currentMoveIndex, setCurrentMoveIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [uiLocked, setUiLocked] = useState(false);
  const [animatingMove, setAnimatingMove] = useState(null);
  const [animationProgress, setAnimationProgress] = useState(0);
  
  const [currentFaces, setCurrentFaces] = useState(initialFaces);

  // We need refs to access latest state inside animation callbacks
  const stateRef = useRef({
    currentMoveIndex: -1,
    isPlaying: false,
    moves: [],
    speed: 1,
    currentFaces: initialFaces,
  });

  useEffect(() => {
    stateRef.current.moves = moves;
    stateRef.current.speed = speed;
    stateRef.current.isPlaying = isPlaying;
    stateRef.current.currentMoveIndex = currentMoveIndex;
    stateRef.current.currentFaces = currentFaces;
  }, [moves, speed, isPlaying, currentMoveIndex, currentFaces]);

  // Reset if initialFaces changes significantly (e.g. new solution)
  useEffect(() => {
    setCurrentFaces(initialFaces);
    setCurrentMoveIndex(-1);
    setIsPlaying(false);
    setUiLocked(false);
    setAnimatingMove(null);
    setAnimationProgress(0);
  }, [initialFaces]);

  const animateMove = useCallback((moveStr, onComplete) => {
    setUiLocked(true);
    setAnimatingMove(moveStr);
    setAnimationProgress(0);

    const controls = animate(0, 1, {
      duration: 0.6 / stateRef.current.speed,
      ease: "easeInOut",
      onUpdate: (v) => setAnimationProgress(v),
      onComplete: () => {
        setAnimatingMove(null);
        setAnimationProgress(0);
        setUiLocked(false);
        if (onComplete) onComplete();
      }
    });

    return () => controls.stop();
  }, []);

  const playNextLoop = useCallback(() => {
    const state = stateRef.current;
    if (!state.isPlaying || state.currentMoveIndex >= state.moves.length - 1) {
      setIsPlaying(false);
      return;
    }

    const nextIndex = state.currentMoveIndex + 1;
    const moveNotation = state.moves[nextIndex].notation;

    animateMove(moveNotation, () => {
      // 1. Update faces by applying the move we just animated
      const updatedFaces = applyMoveSequence(stateRef.current.currentFaces, [moveNotation]);
      setCurrentFaces(updatedFaces);
      
      // 2. Update index
      setCurrentMoveIndex(nextIndex);
      
      // 3. Loop if still playing
      if (stateRef.current.isPlaying) {
        // slight delay prevents call stack issues and gives visual separation
        setTimeout(playNextLoop, 50);
      }
    });
  }, [animateMove]);

  useEffect(() => {
    if (isPlaying && !uiLocked) {
      playNextLoop();
    }
  }, [isPlaying]); // only kick off when isPlaying becomes true

  const togglePlay = useCallback(() => {
    if (uiLocked && !isPlaying) return;
    setIsPlaying(p => {
      // If we are at the end, and we hit play, restart
      if (!p && stateRef.current.currentMoveIndex >= stateRef.current.moves.length - 1) {
        setCurrentMoveIndex(-1);
        setCurrentFaces(initialFaces);
      }
      return !p;
    });
  }, [uiLocked, isPlaying, initialFaces]);

  const next = useCallback(() => {
    if (uiLocked || currentMoveIndex >= moves.length - 1) return;
    
    setIsPlaying(false);
    
    const nextIndex = currentMoveIndex + 1;
    const moveNotation = moves[nextIndex].notation;

    animateMove(moveNotation, () => {
      const updatedFaces = applyMoveSequence(stateRef.current.currentFaces, [moveNotation]);
      setCurrentFaces(updatedFaces);
      setCurrentMoveIndex(nextIndex);
    });
  }, [uiLocked, currentMoveIndex, moves, animateMove]);

  const prev = useCallback(() => {
    if (uiLocked || currentMoveIndex < 0) return;
    
    setIsPlaying(false);

    const prevIndex = currentMoveIndex;
    const moveNotation = moves[prevIndex].notation;
    const invertedMove = invertMove(moveNotation);

    animateMove(invertedMove, () => {
      const updatedFaces = applyMoveSequence(stateRef.current.currentFaces, [invertedMove]);
      setCurrentFaces(updatedFaces);
      setCurrentMoveIndex(prevIndex - 1);
    });
  }, [uiLocked, currentMoveIndex, moves, animateMove]);

  const restart = useCallback(() => {
    setIsPlaying(false);
    setUiLocked(false);
    setAnimatingMove(null);
    setAnimationProgress(0);
    setCurrentMoveIndex(-1);
    setCurrentFaces(initialFaces);
  }, [initialFaces]);

  const jumpTo = useCallback((index) => {
    if (uiLocked) return;
    setIsPlaying(false);
    
    if (index < -1 || index >= moves.length) return;
    
    // Calculate new faces up to `index` instantly
    if (index === -1) {
      setCurrentFaces(initialFaces);
    } else {
      const movesToApply = moves.slice(0, index + 1).map(m => m.notation);
      setCurrentFaces(applyMoveSequence(initialFaces, movesToApply));
    }
    setCurrentMoveIndex(index);
  }, [uiLocked, moves, initialFaces]);

  return {
    currentMoveIndex,
    isPlaying,
    speed,
    setSpeed,
    uiLocked,
    animatingMove,
    animationProgress,
    currentFaces,
    play: togglePlay,
    pause: () => setIsPlaying(false),
    next,
    prev,
    restart,
    jumpTo,
  };
}
