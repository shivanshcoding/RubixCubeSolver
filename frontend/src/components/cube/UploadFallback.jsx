"use client";

import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { RiUploadCloud2Line, RiCameraLine, RiArrowLeftLine } from "react-icons/ri";
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
    <div className="manual-card flex flex-col items-center justify-center min-h-[400px]">
      <div className="w-full flex justify-between items-center mb-2">
        <button onClick={onBack} className="text-zinc-500 hover:text-white transition-colors flex items-center gap-1 text-sm">
           <RiArrowLeftLine /> Back to Camera
        </button>
        <div className="text-xs text-zinc-500 uppercase tracking-widest font-semibold">{face} Face Upload</div>
      </div>
      
      <p className="text-xs text-zinc-400 mb-6 max-w-sm text-center">
        Image upload is less reliable than the live webcam scanner due to lighting, perspective distortion, reflections, and image compression.
      </p>

      <div
        className={`w-full max-w-md aspect-video rounded-2xl border-2 border-dashed flex flex-col items-center justify-center transition-all ${
          isDragging 
            ? "border-blue-500 bg-blue-500/10 scale-105" 
            : "border-white/20 bg-black/20 hover:border-white/40 hover:bg-black/40 cursor-pointer"
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
        
        {isUploading ? (
          <div className="flex flex-col items-center gap-3">
             <span className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
             <div className="text-sm text-blue-400 font-medium">Processing Image...</div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 text-zinc-400 pointer-events-none">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-2">
              <RiUploadCloud2Line className="w-8 h-8 text-zinc-300" />
            </div>
            <div className="text-lg font-semibold text-zinc-200">Drag & Drop face image here</div>
            <div className="text-sm">or click to browse files</div>
            <div className="text-[10px] uppercase tracking-widest mt-4 opacity-50 font-semibold">
              Supported Formats: PNG, JPG, WEBP
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="mt-6 p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-sm max-w-md w-full text-center flex flex-col gap-4">
          <div className="text-red-400 font-medium">{error}</div>
          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <button onClick={() => {setError(""); fileInputRef.current?.click();}} className="btn-secondary text-xs px-3 py-1.5 flex-1 hover:bg-white/10">Upload Another</button>
            <button onClick={onBack} className="btn-secondary text-xs px-3 py-1.5 flex-1 hover:bg-white/10">Use Webcam</button>
            {onManualEntry && (
              <button onClick={onManualEntry} className="btn-secondary text-xs px-3 py-1.5 flex-1 hover:bg-white/10">Manual Entry</button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
