"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  RiUploadCloud2Line, RiArrowLeftLine, RiErrorWarningLine, 
  RiImageAddLine, RiImageEditLine, RiCpuLine, RiBrainLine,
  RiCheckDoubleLine
} from "react-icons/ri";
import { api } from "@/services/api";

const CV_STEPS = [
  { id: "original", label: "Analyzing Image...", desc: "Loading the uploaded image for processing." },
  { id: "warped", label: "Detecting Cube Face...", desc: "Applying perspective transformation." },
  { id: "grid", label: "Extracting 3x3 Grid...", desc: "Locating the 9 sticker boundaries." },
  { id: "classified", label: "Classifying Colors...", desc: "Mapping stickers to the color palette." },
];

export default function UploadFallback({ face, palette, onCapture, onBack, onManualEntry }) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");
  
  // Method selection: 'cv' or 'llm'
  const [method, setMethod] = useState("cv");
  
  // Progress states for CV simulation
  const [progressStep, setProgressStep] = useState(null); // 0 to 3
  const [debugImages, setDebugImages] = useState(null);
  
  const fileInputRef = useRef(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setIsDragging(true);
    else if (e.type === "dragleave") setIsDragging(false);
  };

  const processFile = async (file) => {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setError("File size exceeds 10 MB limit.");
      return;
    }
    
    setIsUploading(true);
    setError("");
    setProgressStep(null);
    setDebugImages(null);

    try {
      const form = new FormData();
      form.append("image", file);
      form.append("method", method);
      if (palette) {
        form.append("palette", JSON.stringify(palette));
      }

      const res = await api.post("/api/cube/scan/single", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (res.data.success) {
        if (res.data.method === "cv" && res.data.debug_images) {
          // Play the animation sequence
          setDebugImages(res.data.debug_images);
          
          for (let i = 0; i < CV_STEPS.length; i++) {
            setProgressStep(i);
            // Wait 1.5 seconds per step for the user to see the visualization
            await new Promise((resolve) => setTimeout(resolve, 1500));
          }
          
          // Complete
          onCapture(res.data.stickers);
        } else {
          // LLM or fallback without debug images
          onCapture(res.data.stickers);
        }
      } else {
        setError("Failed to extract stickers from the image.");
        setIsUploading(false);
      }
    } catch (err) {
      setError(err.response?.data?.detail?.error || "Failed to process image.");
      setIsUploading(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  // Render the current debug image based on the step
  const renderProgressVisual = () => {
    if (progressStep === null || !debugImages) return null;
    const stepId = CV_STEPS[progressStep].id;
    const imgData = debugImages[stepId];
    
    return (
      <motion.div 
        key={stepId}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 1.05 }}
        className="absolute inset-0 flex flex-col items-center justify-center p-4 bg-black/80 backdrop-blur-md rounded-2xl z-20"
      >
        <div className="text-center mb-6 w-full">
          <div className="flex items-center justify-center gap-3 mb-2">
            <span className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin flex-shrink-0" />
            <h3 className="text-xl font-bold text-white tracking-wide">{CV_STEPS[progressStep].label}</h3>
          </div>
          <p className="text-sm text-indigo-200/70">{CV_STEPS[progressStep].desc}</p>
        </div>
        
        <div className="relative w-full max-w-[240px] aspect-square rounded-xl overflow-hidden border border-white/20 shadow-[0_0_40px_rgba(99,102,241,0.3)]">
           <img src={imgData} alt={stepId} className="w-full h-full object-cover" />
           <div className="absolute inset-0 ring-1 ring-inset ring-white/10 rounded-xl" />
        </div>

        {/* Progress indicators */}
        <div className="flex gap-2 mt-8">
          {CV_STEPS.map((_, idx) => (
            <div 
              key={idx} 
              className={`h-1.5 rounded-full transition-all duration-500 ${
                idx === progressStep ? "w-8 bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.8)]" : 
                idx < progressStep ? "w-4 bg-indigo-500/50" : "w-4 bg-white/10"
              }`}
            />
          ))}
        </div>
      </motion.div>
    );
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="glass-card p-6 sm:p-8 flex flex-col items-center justify-center min-h-[500px] relative overflow-hidden w-full max-w-2xl mx-auto"
    >
      {/* Background glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-32 bg-indigo-500/10 blur-[100px] pointer-events-none" />

      {/* Header */}
      <div className="w-full flex items-center justify-between mb-8 z-10">
        <button 
          onClick={onBack} 
          className="btn-ghost flex items-center gap-1.5 text-sm px-3 py-1.5"
          disabled={isUploading}
        >
           <RiArrowLeftLine className="w-4 h-4" /> 
           <span className="hidden sm:inline">Camera</span>
        </button>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg border border-white/10">
            <RiImageAddLine className="w-5 h-5 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-widest text-zinc-400 font-semibold mb-0.5">Upload Image</span>
            <span className="font-bold tracking-wide text-lg sm:text-xl leading-none" style={{ fontFamily: "var(--font-display)" }}>
              Face <span className="text-indigo-400">{face}</span>
            </span>
          </div>
        </div>
        <div className="w-20" /> {/* Spacer for centering */}
      </div>

      {/* Method Selection */}
      <div className="w-full max-w-md grid grid-cols-2 gap-3 mb-6 z-10 pointer-events-auto">
        <button
          onClick={() => setMethod("cv")}
          disabled={isUploading}
          className={`flex flex-col items-center text-center p-4 rounded-xl border-2 transition-all duration-300 relative overflow-hidden ${
            method === "cv" 
              ? "border-indigo-500 bg-indigo-500/10 shadow-[0_0_20px_rgba(99,102,241,0.2)]" 
              : "border-white/10 bg-black/20 hover:bg-black/40 hover:border-white/20"
          }`}
        >
          {method === "cv" && <div className="absolute top-2 right-2"><RiCheckDoubleLine className="text-indigo-400 w-4 h-4" /></div>}
          <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${method === "cv" ? "bg-indigo-500 text-white" : "bg-white/5 text-zinc-400"}`}>
            <RiCpuLine className="w-5 h-5" />
          </div>
          <span className={`text-sm font-bold ${method === "cv" ? "text-white" : "text-zinc-300"}`}>Classical CV</span>
          <span className="text-[10px] text-zinc-500 mt-1">Fast & analytical</span>
        </button>

        <button
          onClick={() => setMethod("llm")}
          disabled={isUploading}
          className={`flex flex-col items-center text-center p-4 rounded-xl border-2 transition-all duration-300 relative overflow-hidden ${
            method === "llm" 
              ? "border-fuchsia-500 bg-fuchsia-500/10 shadow-[0_0_20px_rgba(217,70,239,0.2)]" 
              : "border-white/10 bg-black/20 hover:bg-black/40 hover:border-white/20"
          }`}
        >
          {method === "llm" && <div className="absolute top-2 right-2"><RiCheckDoubleLine className="text-fuchsia-400 w-4 h-4" /></div>}
          <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${method === "llm" ? "bg-fuchsia-500 text-white" : "bg-white/5 text-zinc-400"}`}>
            <RiBrainLine className="w-5 h-5" />
          </div>
          <span className={`text-sm font-bold ${method === "llm" ? "text-white" : "text-zinc-300"}`}>Multimodal AI</span>
          <span className="text-[10px] text-zinc-500 mt-1">Robust & intelligent</span>
        </button>
      </div>

      {/* Drop Zone */}
      <div
        className={`w-full max-w-md aspect-[4/3] sm:aspect-video rounded-2xl border-2 border-dashed flex flex-col items-center justify-center transition-all duration-300 z-10 relative overflow-hidden group ${
          isDragging 
            ? "border-indigo-400 bg-indigo-500/10 scale-[1.02] shadow-[0_0_40px_rgba(99,102,241,0.2)]" 
            : "border-white/10 bg-black/40 hover:border-white/30 hover:bg-black/60"
        } ${isUploading ? "pointer-events-none" : "cursor-pointer"}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => { if (!isUploading) fileInputRef.current?.click(); }}
      >
        <input 
          ref={fileInputRef} 
          type="file" 
          accept="image/png, image/jpeg, image/webp" 
          className="hidden" 
          onChange={(e) => processFile(e.target.files[0])}
        />
        
        <AnimatePresence mode="wait">
          {progressStep !== null ? (
            // Visual Progress Simulation
            renderProgressVisual()
          ) : isUploading ? (
            // Basic LLM loading state
            <motion.div 
              key="uploading_llm"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-col items-center gap-4"
            >
               <div className="relative">
                 <div className={`w-12 h-12 border-2 rounded-full ${method === "cv" ? "border-indigo-500/30" : "border-fuchsia-500/30"}`} />
                 <div className={`w-12 h-12 border-2 border-t-transparent rounded-full animate-spin absolute top-0 left-0 ${method === "cv" ? "border-indigo-500" : "border-fuchsia-500"}`} />
                 {method === "cv" ? (
                   <RiCpuLine className="w-5 h-5 text-indigo-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                 ) : (
                   <RiBrainLine className="w-5 h-5 text-fuchsia-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                 )}
               </div>
               <div className={`text-sm font-medium animate-pulse ${method === "cv" ? "text-indigo-300" : "text-fuchsia-300"}`}>
                 {method === "cv" ? "Initializing CV Pipeline..." : "AI is analyzing image..."}
               </div>
            </motion.div>
          ) : (
            // Idle State
            <motion.div 
              key="idle"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-col items-center gap-3 text-zinc-400 pointer-events-none p-6 text-center"
            >
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-2 shadow-inner transition-colors duration-300 ${
                isDragging ? 'bg-indigo-500/20' : 'bg-white/5 group-hover:bg-white/10'
              }`}>
                <RiUploadCloud2Line className={`w-8 h-8 ${isDragging ? "text-indigo-400" : "text-zinc-300"}`} />
              </div>
              <div className="text-base sm:text-lg font-semibold text-zinc-200">
                {isDragging ? "Drop image here" : "Drag & Drop face image here"}
              </div>
              <div className="text-sm text-zinc-500">or click to browse files</div>
              <div className="text-[10px] uppercase tracking-widest mt-4 text-zinc-600 font-semibold bg-white/5 px-3 py-1 rounded-full">
                PNG • JPG • WEBP
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Error State */}
      <AnimatePresence>
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: 10, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="w-full max-w-md z-10 overflow-hidden mt-4"
          >
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-sm w-full text-center flex flex-col gap-4 shadow-[0_0_20px_rgba(239,68,68,0.1)]">
              <div className="text-red-400 font-medium flex items-center justify-center gap-2">
                <RiErrorWarningLine className="w-5 h-5 shrink-0" /> {error}
              </div>
              <div className="flex flex-col sm:flex-row gap-2 justify-center">
                <button 
                  onClick={() => {setError(""); fileInputRef.current?.click();}} 
                  className="btn-secondary text-xs px-4 py-2 flex-1 hover:bg-white/10 transition-colors"
                >
                  Try Another Image
                </button>
                {onManualEntry && (
                  <button 
                    onClick={onManualEntry} 
                    className="btn-primary text-xs px-4 py-2 flex-1 flex items-center justify-center gap-1.5"
                  >
                    <RiImageEditLine /> Manual Entry
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
