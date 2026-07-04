"use client";

import { useEffect, useRef, useState } from "react";
import { getWsBaseUrl } from "@/services/api";
import { motion, AnimatePresence } from "framer-motion";
import { RiFlashlightLine, RiCameraLensLine, RiCheckLine } from "react-icons/ri";

export default function WebcamScanner({ 
  face, 
  palette, 
  sensitivity = "balanced",
  gridSize = 0.6, // percentage of container width
  onCapture, 
  onBack,
  onDiagnosticsUpdate,
  onUploadFallback // passed from page.js
}) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const wsRef = useRef(null);
  const gridRef = useRef(null);
  
  const [stream, setStream] = useState(null);
  const [hasCameraError, setHasCameraError] = useState(false);
  const [wsStatus, setWsStatus] = useState("connecting"); // connecting, connected, error
  const [wsError, setWsError] = useState("");
  const [isCameraActive, setIsCameraActive] = useState(false);
  
  const [fps, setFps] = useState(0);
  const frameCountRef = useRef(0);
  const lastFpsTimeRef = useRef(performance.now());
  
  const [stickers, setStickers] = useState(Array(9).fill({ color: "unknown", confidence: 0, stable: false }));
  
  // Use refs to avoid re-triggering WebSocket reconnects on state changes
  const fpsRef = useRef(fps);
  const paletteRef = useRef(palette);
  const sensitivityRef = useRef(sensitivity);
  const gridSizeRef = useRef(gridSize);
  
  useEffect(() => { fpsRef.current = fps; }, [fps]);
  useEffect(() => { paletteRef.current = palette; }, [palette]);
  useEffect(() => { sensitivityRef.current = sensitivity; }, [sensitivity]);
  useEffect(() => { gridSizeRef.current = gridSize; }, [gridSize]);

  // Animation & Flow states
  const [backendStatus, setBackendStatus] = useState("detecting"); // detecting, buffering
  const [bufferRemaining, setBufferRemaining] = useState(0);
  const [bufferProgress, setBufferProgress] = useState(0);
  const latestStickersRef = useRef(stickers);

  // Timeouts
  const [showEarlyHelp, setShowEarlyHelp] = useState(false);
  const startTimeRef = useRef(null);

  useEffect(() => {
    latestStickersRef.current = stickers;
  }, [stickers]);

  const onCaptureRef = useRef(onCapture);
  useEffect(() => {
    onCaptureRef.current = onCapture;
  }, [onCapture]);

// Timeout logic
  useEffect(() => {
    let timer20, timer60;
    if (isCameraActive && backendStatus === "detecting") {
      startTimeRef.current = Date.now();
      
      timer20 = setTimeout(() => {
        // Check if 0 stickers are stable
        const stableCount = latestStickersRef.current.filter(s => s.stable).length;
        if (stableCount === 0) {
          setShowEarlyHelp(true);
        }
      }, 20000);

      timer60 = setTimeout(() => {
        if (onUploadFallback) onUploadFallback();
      }, 60000);
    }

    return () => {
      clearTimeout(timer20);
      clearTimeout(timer60);
    };
  }, [isCameraActive, backendStatus, onUploadFallback]);

  const lastSentGridSizeRef = useRef(null);

  const calculateCoordinates = (sendCanvasWidth, sendCanvasHeight) => {
      if (!videoRef.current || !gridRef.current) return [];

      const videoRect = videoRef.current.getBoundingClientRect();
      const gridRect = gridRef.current.getBoundingClientRect();
      
      const vw = videoRef.current.videoWidth;
      const vh = videoRef.current.videoHeight;
      if (!vw || !vh) return [];

      const scale = Math.max(videoRect.width / vw, videoRect.height / vh);
      
      const renderedW = vw * scale;
      const renderedH = vh * scale;
      
      const videoX = (videoRect.width - renderedW) / 2;
      const videoY = (videoRect.height - renderedH) / 2;
      
      const gridX = gridRect.left - videoRect.left;
      const gridY = gridRect.top - videoRect.top;
      
      const pixelX = gridX - videoX;
      const pixelY = gridY - videoY;
      
      const intrinsicX = pixelX / scale;
      const intrinsicY = pixelY / scale;
      const intrinsicW = gridRect.width / scale;
      const intrinsicH = gridRect.height / scale;

      const canvasScale = sendCanvasWidth / vw;
      const finalX = intrinsicX * canvasScale;
      const finalY = intrinsicY * canvasScale;
      const finalW = intrinsicW * canvasScale;
      const finalH = intrinsicH * canvasScale;

      const sqW = finalW / 3;
      const sqH = finalH / 3;
      
      const coords = [];
      for (let r = 0; r < 3; r++) {
          for (let c = 0; c < 3; c++) {
              coords.push([
                  Math.round(finalX + c * sqW),
                  Math.round(finalY + r * sqH),
                  Math.round(sqW),
                  Math.round(sqH)
              ]);
          }
      }
      
      const diagnostics = {
         video: { vw, vh, rectW: videoRect.width, rectH: videoRect.height },
         grid: { pixelX, pixelY, intrinsicW, intrinsicH },
         canvasScale,
         containerScale: scale
      };
      
      return { coords, metrics: diagnostics };
  };

  const [flashOn, setFlashOn] = useState(false);
  const [hdOn, setHdOn] = useState(false);

  // Expose diagnostics via ref to avoid recreation of WS on every update
  const onDiagnosticsUpdateRef = useRef(onDiagnosticsUpdate);
  useEffect(() => {
    onDiagnosticsUpdateRef.current = onDiagnosticsUpdate;
  }, [onDiagnosticsUpdate]);

  useEffect(() => {
    if (!isCameraActive) return;

    let mediaStream = null;
    
    const startCamera = async () => {
      try {
        const constraints = {
          video: { 
            facingMode: "environment",
            width: hdOn ? { ideal: 1920 } : { ideal: 640 },
            height: hdOn ? { ideal: 1080 } : { ideal: 480 }
          }
        };
        mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
        
        if (flashOn) {
          const track = mediaStream.getVideoTracks()[0];
          const capabilities = track.getCapabilities();
          if (capabilities.torch) {
            await track.applyConstraints({
              advanced: [{ torch: true }]
            });
          }
        }

        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
        setHasCameraError(false);
      } catch (err) {
        console.error("Camera access error:", err);
        setHasCameraError(true);
      }
    };
    
    startCamera();
    
    return () => {
      if (mediaStream) {
        mediaStream.getTracks().forEach(t => t.stop());
      }
    };
  }, [isCameraActive, hdOn, flashOn]);

  useEffect(() => {
    if (!isCameraActive || !stream) return;

    let animationId;
    let ws = new WebSocket(getWsBaseUrl() + "/api/cube/scan/live");
    wsRef.current = ws;

    ws.onopen = () => {
      setWsStatus("connected");
      setWsError("");
    };

    ws.onclose = () => {
      setWsStatus("connecting");
    };

    ws.onerror = (e) => {
      console.error("WebSocket Error:", e);
      setWsStatus("error");
      setWsError("Connection failed");
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.error) {
          setWsStatus("error");
          setWsError(data.error);
          onDiagnosticsUpdateRef.current?.(null, false, "error", data.error);
          return;
        }

        if (data.stickers) {
            console.table(
                data.stickers.map((s, i) => ({
                    idx: i,
                    stable: s.stable,
                    confidence: s.confidence,
                    purity: s.purity,
                    label: s.label
                }))
            );
        }
                
        console.log(`[WS] Received payload - status: ${data.status}`);
        
        if (data.status === "buffering") {
           console.log(`[WS] Remaining: ${data.seconds_remaining} sec`);
        }
        
        if (data.stickers) {
          setStickers(data.stickers);
          console.log("[WS] Updated sticker state");
          
          if (data.stickers.every(s => s.stable)) {
            console.log("[WS] All squares stable");
          }
        }
        
        if (data.status === "captured") {
          console.log("[WS] Status is captured. Calling onCapture()");
          if (onCaptureRef.current) onCaptureRef.current(data.stickers);
          return;
        }
        
        setBackendStatus(data.status || "detecting");
        setBufferRemaining(data.seconds_remaining || 0);
        setBufferProgress(data.progress || 0);
        
        onDiagnosticsUpdateRef.current?.(data.diagnostics || null, data.face_stable || false, "connected", "");
      } catch (e) {
        console.error("Invalid WS message", e);
      }
    };
const processFrame = () => {
      if (
        wsRef.current?.readyState === WebSocket.OPEN && 
        videoRef.current && 
        videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA
      ) {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        
        frameCountRef.current++;
        const now = performance.now();
        if (now - lastFpsTimeRef.current >= 1000) {
          setFps(frameCountRef.current);
          frameCountRef.current = 0;
          lastFpsTimeRef.current = now;
        }

        const scale = Math.min(600 / canvas.width, 1);
        const sendCanvas = document.createElement("canvas");
        sendCanvas.width = canvas.width * scale;
        sendCanvas.height = canvas.height * scale;
        const sendCtx = sendCanvas.getContext("2d");
        sendCtx.drawImage(canvas, 0, 0, sendCanvas.width, sendCanvas.height);

        const quality = sensitivityRef.current === "fast" ? 0.6 : sensitivityRef.current === "high" ? 0.9 : 0.8;
        const dataUrl = sendCanvas.toDataURL("image/jpeg", quality);
        const base64 = dataUrl.split(",")[1];

        const projection = calculateCoordinates(sendCanvas.width, sendCanvas.height);
        const coords = projection.coords || [];
        const debug_info = projection.metrics || {};

        const payload = {
          frame: base64,
          palette: paletteRef.current,
          fps: fpsRef.current,
          debug_info: debug_info,
          overlay_coords: coords
        };

        wsRef.current.send(JSON.stringify(payload));
      }
      
      const delay = sensitivityRef.current === "fast" ? 100 : sensitivityRef.current === "high" ? 250 : 150;
      setTimeout(() => {
        if (wsRef.current && wsRef.current.readyState !== WebSocket.CLOSED) {
          animationId = requestAnimationFrame(processFrame);
        }
      }, delay);
    };
    
    animationId = requestAnimationFrame(processFrame);
    
    return () => {
      cancelAnimationFrame(animationId);
      if (ws.readyState === WebSocket.OPEN) ws.close();
    };
  }, [isCameraActive, stream]);

  if (hasCameraError) {
    return (
      <div className="glass-card flex flex-col items-center justify-center p-8 text-center h-full min-h-[400px]">
        <div className="w-16 h-16 rounded-2xl bg-red-500/20 flex items-center justify-center mb-4">
          <RiCameraLensLine className="w-8 h-8 text-red-400" />
        </div>
        <h3 className="text-lg font-semibold text-zinc-200 mb-2">Camera Access Denied</h3>
        <p className="text-sm text-zinc-400 mb-6 max-w-sm">
          Please allow camera permissions in your browser settings to use the live scanner, or upload an image instead.
        </p>
        <button onClick={onBack} className="btn-secondary">Go Back</button>
      </div>
    );
  }

  const allStickersReady = stickers.filter(s => s.stable).length;
  const isLightingGood = true;

  return (
    <div className="relative rounded-2xl overflow-hidden bg-black/50 border border-white/10 aspect-[4/3] w-full h-full min-h-[300px]">
      {!isCameraActive ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-20">
          <RiCameraLensLine className="w-12 h-12 text-zinc-500 mb-4" />
          <button 
            onClick={() => setIsCameraActive(true)}
            className="btn-primary flex items-center gap-2"
          >
            Start Camera Scanner
          </button>
        </div>
      ) : null}

      <video 
        ref={videoRef} 
        autoPlay 
        playsInline 
        muted 
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${flashOn ? "brightness-125" : ""} ${!isCameraActive ? "opacity-0" : "opacity-100"}`} 
      />
      <canvas ref={canvasRef} className="hidden" />
      
      {/* Connection overlay */}
      {isCameraActive && wsStatus === "connecting" && (
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-sm z-20">
          <div className="flex flex-col items-center gap-3">
            <span className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            <span className="text-sm font-medium text-white/70 tracking-widest uppercase">Connecting to Scanner API...</span>
          </div>
        </div>
      )}

      {/* Early Help Overlay */}
      <AnimatePresence>
        {showEarlyHelp && backendStatus === "detecting" && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur-xl border border-white/10 p-5 rounded-2xl z-30 w-[90%] max-w-sm shadow-2xl"
          >
            <h4 className="text-white font-bold mb-3 flex items-center gap-2">
              <RiCameraLensLine className="text-amber-400" /> Having trouble detecting?
            </h4>
            <ul className="text-xs text-zinc-300 space-y-2 mb-4">
              <li className="flex gap-2"><RiCheckLine className="text-green-400" /> Improve lighting (avoid warm light)</li>
              <li className="flex gap-2"><RiCheckLine className="text-green-400" /> Reduce reflections/glare</li>
              <li className="flex gap-2"><RiCheckLine className="text-green-400" /> Move cube closer to fill grid</li>
            </ul>
            <div className="flex gap-2">
              <button onClick={() => setShowEarlyHelp(false)} className="flex-1 py-2 rounded-lg bg-white/10 text-white text-xs font-semibold hover:bg-white/20 transition-colors">Continue Scanning</button>
              {onUploadFallback && (
                <button onClick={onUploadFallback} className="flex-1 py-2 rounded-lg border border-white/20 text-zinc-300 text-xs font-semibold hover:bg-white/5 transition-colors">Use Upload</button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Viewfinder overlay */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-10">
        <motion.div 
          ref={gridRef} 
          animate={{
             scale: 1
          }}
          className="relative aspect-square transition-all duration-200 ease-out" 
          style={{ width: `${gridSize * 100}%` }}
        >
          {/* 3x3 Grid Overlay */}
          <div className="absolute inset-0 grid grid-cols-3 grid-rows-3">
            {stickers.map((s, i) => {
              const isFilled = s.stable;
              return (
                <div key={i} className="flex items-center justify-center">
                   <motion.div 
                     animate={{
                       backgroundColor: isFilled ? "rgba(74, 222, 128, 0.2)" : "rgba(0, 0, 0, 0)",
                       borderColor: isFilled ? "rgb(74, 222, 128)" : "rgb(239, 68, 68)",
                     }}
                     className={`w-[55%] h-[55%] border-2 transition-colors duration-200`} 
                   />
                </div>
              );
            })}
          </div>
        </motion.div>
      </div>

        {/* Buffering Overlay */}
        <AnimatePresence>
          {backendStatus === "buffering" && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute inset-x-0 bottom-32 mx-auto w-64 z-20 flex flex-col items-center gap-2"
            >
              <div className="bg-black/80 backdrop-blur-md rounded-xl p-4 border border-green-500/30 text-center w-full shadow-2xl">
                <div className="flex items-center justify-center gap-2 text-green-400 font-bold mb-1">
                  <RiCheckLine size={20} />
                  <span>Face Locked</span>
                </div>
                <p className="text-zinc-300 text-sm mb-3">Hold still...</p>
                
                {/* Progress Bar */}
                <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                  <motion.div 
                    className="h-full bg-green-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${bufferProgress * 100}%` }}
                    transition={{ ease: "linear", duration: 0.1 }}
                  />
                </div>
                
                <p className="text-xs font-mono text-zinc-500 mt-2">{bufferRemaining}s</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      {/* Top Controls Overlay */}
      <div className="absolute top-4 left-4 right-4 flex justify-between items-start z-10">
        <div className="flex gap-2">
          {isCameraActive && (
            <button 
              onClick={() => setIsCameraActive(false)}
              className="px-3 h-10 rounded-full flex items-center justify-center backdrop-blur-md border border-red-500/50 bg-red-500/20 text-red-400 hover:bg-red-500/40 transition-colors text-xs font-bold tracking-wide"
              title="Stop Camera"
            >
              STOP
            </button>
          )}
          <button 
            onClick={() => setFlashOn(!flashOn)}
            className={`w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-md border transition-colors
              ${flashOn ? "bg-amber-400 text-black border-amber-400" : "bg-black/40 text-white/70 border-white/10 hover:bg-black/60"}`}
          >
            <RiFlashlightLine className="w-5 h-5" />
          </button>
          <button 
            onClick={() => setHdOn(!hdOn)}
            className={`w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-md border font-semibold text-xs transition-colors
              ${hdOn ? "bg-blue-500 text-white border-blue-500" : "bg-black/40 text-white/70 border-white/10 hover:bg-black/60"}`}
          >
            HD
          </button>
        </div>
        
        <div className="flex flex-col items-end gap-2 pointer-events-none">
          <div className="bg-black/60 backdrop-blur-md border border-white/10 rounded-full px-3 py-1.5 flex flex-col items-end">
            <div className="text-[10px] text-zinc-400 uppercase tracking-widest font-semibold flex items-center gap-1.5">
               <div className={`w-1.5 h-1.5 rounded-full ${wsStatus === "connected" ? "bg-green-500 shadow-[0_0_8px_#22c55e]" : "bg-red-500"}`} />
               {fps} FPS
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
