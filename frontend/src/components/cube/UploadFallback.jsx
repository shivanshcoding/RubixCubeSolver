"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RiUploadCloud2Line, RiCameraLine, RiArrowLeftLine, RiErrorWarningLine, RiImageAddLine, RiImageEditLine } from "react-icons/ri";
import { api } from "@/services/api";

export default function UploadFallback({ face, palette, onCapture, onBack, onManualEntry }) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");
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

    try {
      const form = new FormData();
      form.append("image", file);
      if (palette) {
        form.append("palette", JSON.stringify(palette));
      }

      const res = await api.post("/api/cube/scan/single", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (res.data.success) {
        onCapture(res.data.stickers);
      } else {
        setError("Failed to extract stickers from the image.");
      }
    } catch (err) {
      setError(err.response?.data?.detail?.error || "Failed to process image.");
    } finally {
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

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="glass-card p-6 sm:p-8 flex flex-col items-center justify-center min-h-[450px] relative overflow-hidden"
    >
      {/* Background glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-32 bg-indigo-500/10 blur-[100px] pointer-events-none" />

      {/* Header */}
      <div className="w-full flex items-center justify-between mb-6 z-10">
        <button 
          onClick={onBack} 
          className="btn-ghost flex items-center gap-1.5 text-sm px-3 py-1.5"
        >
           <RiArrowLeftLine className="w-4 h-4" /> 
           <span className="hidden sm:inline">Camera</span>
        </button>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
            <RiImageAddLine className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold tracking-wide text-base sm:text-lg" style={{ fontFamily: "var(--font-display)" }}>
            Upload Face <span className="text-indigo-400">{face}</span>
          </span>
        </div>
        <div className="w-20" /> {/* Spacer for centering */}
      </div>
      
      {/* Warning Notice */}
      <div className="w-full max-w-md bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 mb-6 flex items-start gap-3 z-10">
        <RiErrorWarningLine className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <p className="text-xs text-amber-200/80 leading-relaxed">
          Uploads are less reliable than live scanning due to lighting and perspective distortion. Try to use a clear, glare-free image.
        </p>
      </div>

      {/* Drop Zone */}
      <div
        className={`w-full max-w-md aspect-[4/3] sm:aspect-video rounded-2xl border-2 border-dashed flex flex-col items-center justify-center transition-all duration-300 z-10 relative overflow-hidden group ${
          isDragging 
            ? "border-indigo-400 bg-indigo-500/10 scale-[1.02] shadow-[0_0_40px_rgba(99,102,241,0.2)]" 
            : "border-white/10 bg-black/40 hover:border-white/30 hover:bg-black/60 cursor-pointer"
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input 
          ref={fileInputRef} 
          type="file" 
          accept="image/png, image/jpeg, image/webp" 
          className="hidden" 
          onChange={(e) => processFile(e.target.files[0])}
        />
        
        <AnimatePresence mode="wait">
          {isUploading ? (
            <motion.div 
              key="uploading"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-col items-center gap-4"
            >
               <div className="relative">
                 <div className="w-12 h-12 border-2 border-indigo-500/30 rounded-full" />
                 <div className="w-12 h-12 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin absolute top-0 left-0" />
                 <RiUploadCloud2Line className="w-5 h-5 text-indigo-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
               </div>
               <div className="text-sm text-indigo-300 font-medium animate-pulse">Processing Image...</div>
            </motion.div>
          ) : (
            <motion.div 
              key="idle"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-col items-center gap-3 text-zinc-400 pointer-events-none p-6 text-center"
            >
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-2 shadow-inner transition-colors duration-300 ${isDragging ? 'bg-indigo-500/20' : 'bg-white/5 group-hover:bg-white/10'}`}>
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
