"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import dynamic from "next/dynamic";
import {
  RiCameraLine,
  RiRefreshLine,
  RiGridLine,
  RiCheckLine,
  RiArrowRightLine,
  RiEditLine,
} from "react-icons/ri";
import { useCubeStore } from "@/store/cubeStore";
import { scanCube, solveCube } from "@/services/api";


const Cube3D = dynamic(() => import("@/components/cube/Cube3D"), { ssr: false });
const SolvingOverlay = dynamic(() => import("@/components/cube/SolvingOverlay"), { ssr: false });

const FACE_ORDER = ["U", "L", "F", "R", "B", "D"];
const FACE_LABELS = {
  U: "Up (White)",
  L: "Left (Orange)",
  F: "Front (Green)",
  R: "Right (Red)",
  B: "Back (Blue)",
  D: "Down (Yellow)",
};

export default function ScannerPage() {
  const router = useRouter();
  const { setFaces, setColorMapping, setSolution, setSource } = useCubeStore();

  const [files, setFiles] = useState({ U: null, R: null, F: null, D: null, L: null, B: null });
  const [previews, setPreviews] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [scanResult, setScanResult] = useState(null);

  // Solving states
  const [isSolving, setIsSolving] = useState(false);
  const [isSolveComplete, setIsSolveComplete] = useState(false);

  const handleFile = (face, file) => {
    if (!file) return;
    setFiles((prev) => ({ ...prev, [face]: file }));
    const url = URL.createObjectURL(file);
    setPreviews((prev) => ({ ...prev, [face]: url }));
    setError("");
  };

  const handleSolve = async () => {
    if (!scanResult) return;
    
    setIsSolving(true);
    setIsSolveComplete(false);
    setSource("/cube/scanner"); // Track where we came from

    await new Promise(requestAnimationFrame);

    try {
      const result = await solveCube(scanResult.cube_string);
      if (result.success) {
        setSolution(result);
        setIsSolveComplete(true);
      } else {
        toast.error(result.error || "Solve failed");
        setIsSolving(false);
      }
    } catch (err) {
      toast.error("Failed to solve cube");
      setIsSolving(false);
    }
  };

  const handleOverlayComplete = () => {
    router.push("/cube/solution");
    setTimeout(() => {
      setIsSolving(false);
      setIsSolveComplete(false);
    }, 1000);
  };

  const handleScan = async () => {
    const missing = Object.entries(files).filter(([_, v]) => !v).map(([k]) => k);
    if (missing.length > 0) {
      toast.error(`Missing faces: ${missing.join(", ")}`);
      return;
    }

    setLoading(true);
    setError("");
    try {
      const result = await scanFaces(files);
      setScanResult(result);

      // Update cube store
      if (result.faces) {
        setFaces(result.faces);
      }
      if (result.palette) {
        const mapping = {};
        result.palette.forEach((p) => { mapping[p.face] = p.color; });
        setColorMapping(mapping);
      }

      toast.success(`Cube scanned via ${result.method === "llm" ? "AI" : "Computer Vision"}!`);
    } catch (err) {
      const msg = err?.response?.data?.detail?.error || err?.response?.data?.detail || "Scan failed";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const allUploaded = Object.values(files).every((f) => f !== null);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: "var(--font-display)" }}>
          Camera Scanner
        </h1>
        <p className="text-zinc-400 text-sm mb-6">
          Upload photos of each cube face for AI-powered color detection.
        </p>
      </motion.div>

      <AnimatePresence mode="wait">
        {!scanResult ? (
          <motion.div
            key="upload"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Upload Grid */}
            <div className="glass-card p-6 mb-6">
              <h2 className="text-sm font-semibold mb-4 text-zinc-300">Upload Face Photos</h2>
              <p className="text-xs text-zinc-500 mb-4">
                Take clear, centered photos of each face. Hold the cube steady with good lighting.
              </p>

              {/* Unfolded layout for upload */}
              <div
                className="inline-grid gap-3 mx-auto"
                style={{
                  gridTemplateColumns: "repeat(4, 120px)",
                  gridTemplateRows: "repeat(3, auto)",
                }}
              >
                {/* U */}
                <div className="col-start-2 row-start-1">
                  <FaceUpload face="U" file={files.U} preview={previews.U} onFile={handleFile} />
                </div>

                {/* L F R B */}
                <div className="col-start-1 row-start-2">
                  <FaceUpload face="L" file={files.L} preview={previews.L} onFile={handleFile} />
                </div>
                <div className="col-start-2 row-start-2">
                  <FaceUpload face="F" file={files.F} preview={previews.F} onFile={handleFile} />
                </div>
                <div className="col-start-3 row-start-2">
                  <FaceUpload face="R" file={files.R} preview={previews.R} onFile={handleFile} />
                </div>
                <div className="col-start-4 row-start-2">
                  <FaceUpload face="B" file={files.B} preview={previews.B} onFile={handleFile} />
                </div>

                {/* D */}
                <div className="col-start-2 row-start-3">
                  <FaceUpload face="D" file={files.D} preview={previews.D} onFile={handleFile} />
                </div>
              </div>
            </div>

            {error && (
              <div className="glass-card p-4 border-red-400/20 text-sm text-red-400 mb-4">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={handleScan}
                disabled={!allUploaded || loading}
                className="btn-primary flex items-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <RiCameraLine className="w-4 h-4" />
                    Analyze Cube
                  </>
                )}
              </button>

              <button
                onClick={() => {
                  setFiles({ U: null, R: null, F: null, D: null, L: null, B: null });
                  setPreviews({});
                }}
                className="btn-ghost flex items-center gap-1.5"
              >
                <RiRefreshLine className="w-4 h-4" />
                Clear All
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="result"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Scan Result */}
            <div className="glass-card p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Scan Result</h2>
                <span className="badge">
                  {scanResult.method === "llm" ? "AI Detected" : "CV Detected"}
                </span>
              </div>

              <div className="grid lg:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm text-zinc-400 mb-3">Detected Colors</h3>
                  <div className="grid grid-cols-6 gap-2 mb-4">
                    {scanResult.palette?.map((p) => (
                      <div key={p.face} className="text-center">
                        <div
                          className="w-8 h-8 rounded-lg mx-auto mb-1 border border-white/10"
                          style={{ backgroundColor: p.color }}
                        />
                        <div className="text-xs text-zinc-500">{p.face}</div>
                      </div>
                    ))}
                  </div>

                  <div className="text-xs text-zinc-500 font-mono break-all p-2 rounded bg-white/[0.03]">
                    {scanResult.cube_string}
                  </div>
                </div>

                <Cube3D height="300px" autoRotate={true} />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => router.push("/cube/manual")}
                className="btn-secondary flex items-center gap-2"
              >
                <RiEditLine className="w-4 h-4" />
                Edit Manually
              </button>
              <button
                onClick={handleSolve}
                disabled={isSolving}
                className="btn-primary flex items-center gap-2 disabled:opacity-50"
              >
                {isSolving ? (
                  <>
                    <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                    Solving...
                  </>
                ) : (
                  <>
                    Proceed to Solve
                    <RiArrowRightLine className="w-4 h-4" />
                  </>
                )}
              </button>
              <button
                onClick={() => { setScanResult(null); setError(""); }}
                className="btn-ghost flex items-center gap-1.5"
              >
                <RiRefreshLine className="w-4 h-4" />
                Rescan
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <SolvingOverlay 
        isVisible={isSolving} 
        isComplete={isSolveComplete} 
        onComplete={handleOverlayComplete} 
      />
    </div>
  );
}

function FaceUpload({ face, file, preview, onFile }) {
  const inputRef = useRef(null);

  return (
    <div>
      <div className="text-[10px] text-zinc-500 text-center mb-1 font-medium">
        {FACE_LABELS[face]}
      </div>
      <button
        onClick={() => inputRef.current?.click()}
        className={`w-[120px] h-[120px] rounded-xl border-2 border-dashed transition-all overflow-hidden ${
          file
            ? "border-green-400/40 bg-green-400/5"
            : "border-zinc-700 hover:border-zinc-500 bg-white/[0.02]"
        }`}
      >
        {preview ? (
          <img src={preview} alt={`Face ${face}`} className="w-full h-full object-cover" />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-zinc-600">
            <RiCameraLine className="w-6 h-6 mb-1" />
            <span className="text-[10px]">{face}</span>
          </div>
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => onFile(face, e.target.files?.[0] || null)}
      />
    </div>
  );
}
