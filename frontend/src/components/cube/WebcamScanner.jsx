"use client";

import { useEffect, useRef, useState } from "react";
import { getWsBaseUrl } from "@/services/api";
import { motion, AnimatePresence } from "framer-motion";
import { RiFlashlightLine, RiCameraLensLine } from "react-icons/ri";

export default function WebcamScanner({ 
  face, 
  palette, 
  sensitivity = "balanced",
  gridSize = 0.6, // percentage of container width
  onCapture, 
  onBack,
  onDiagnosticsUpdate 
}) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const wsRef = useRef(null);
  
  const [stream, setStream] = useState(null);
  const [hasCameraError, setHasCameraError] = useState(false);
  const [wsStatus, setWsStatus] = useState("connecting"); // connecting, connected, error
  const [wsError, setWsError] = useState("");
  const [isCameraActive, setIsCameraActive] = useState(false); // start stopped
  
  const [fps, setFps] = useState(0);
  const frameCountRef = useRef(0);
  const lastFpsTimeRef = useRef(performance.now());
  
  const [stickers, setStickers] = useState(Array(9).fill({ color: "unknown", confidence: 0 }));
  const [isStable, setIsStable] = useState(false);
  
  const [countdown, setCountdown] = useState(null); // null, 3, 2, 1
  const countdownRef = useRef(null);

  // Simulating hardware toggles
  const [flashOn, setFlashOn] = useState(false);
  const [hdOn, setHdOn] = useState(false);

  // Setup Webcam
  useEffect(() => {
    let activeStream = null;
    const initCamera = async () => {
      if (!isCameraActive) {
        if (videoRef.current) videoRef.current.srcObject = null;
        setStream(null);
        return;
      }
      try {
        const constraints = {
          video: {
            facingMode: "environment",
            width: hdOn ? { ideal: 1920 } : { ideal: 1280 },
            height: hdOn ? { ideal: 1080 } : { ideal: 720 },
          }
        };
        activeStream = await navigator.mediaDevices.getUserMedia(constraints);
        if (videoRef.current) {
          videoRef.current.srcObject = activeStream;
        }
        setStream(activeStream);
        setHasCameraError(false);
      } catch (err) {
        setHasCameraError(true);
      }
    };
    initCamera();

    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [hdOn, isCameraActive]);

  // Use a ref for the callback so it doesn't trigger effect re-runs
  const onDiagnosticsUpdateRef = useRef(onDiagnosticsUpdate);
  useEffect(() => {
    onDiagnosticsUpdateRef.current = onDiagnosticsUpdate;
  }, [onDiagnosticsUpdate]);

  // Setup WebSocket
  useEffect(() => {
    if (!isCameraActive) {
      setWsStatus("stopped");
      onDiagnosticsUpdateRef.current?.(null, false, "stopped", "");
      return;
    }

    const wsUrl = `${getWsBaseUrl()}/api/cube/scan/live`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setWsStatus("connected");
      onDiagnosticsUpdateRef.current?.(null, false, "connected", "");
    };
    
    ws.onerror = () => {
      setWsStatus("error");
      setWsError("Failed to connect to scanner service.");
      onDiagnosticsUpdateRef.current?.(null, false, "error", "Failed to connect to scanner service.");
    };
    
    ws.onclose = () => {
      setWsStatus("error");
      onDiagnosticsUpdateRef.current?.(null, false, "error", "");
    };
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.error) {
          setWsError(data.error);
          onDiagnosticsUpdateRef.current?.(null, false, "error", data.error);
          return;
        }
        
        if (data.stickers) setStickers(data.stickers);
        if (data.stable !== undefined) setIsStable(data.stable);
        
        // Pass diagnostics up to parent
        onDiagnosticsUpdateRef.current?.(data.diagnostics || null, data.stable || false, "connected", "");
      } catch (e) {
        console.error("Invalid WS message", e);
      }
    };

    return () => {
      ws.onclose = null;
      ws.onerror = null;
      ws.close();
    };
  }, [isCameraActive]);

  // Frame processing loop
  useEffect(() => {
    let animationId;
    const processFrame = () => {
      if (
        videoRef.current && 
        videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA &&
        wsRef.current?.readyState === WebSocket.OPEN
      ) {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        
        // Match canvas size to video size
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        
        // Calculate FPS
        frameCountRef.current++;
        const now = performance.now();
        if (now - lastFpsTimeRef.current >= 1000) {
          setFps(frameCountRef.current);
          frameCountRef.current = 0;
          lastFpsTimeRef.current = now;
        }

        // Downscale to save bandwidth (max 600px width)
        const scale = Math.min(600 / canvas.width, 1);
        const sendCanvas = document.createElement("canvas");
        sendCanvas.width = canvas.width * scale;
        sendCanvas.height = canvas.height * scale;
        const sendCtx = sendCanvas.getContext("2d");
        sendCtx.drawImage(canvas, 0, 0, sendCanvas.width, sendCanvas.height);

        // Convert to Base64 (JPEG, quality depends on sensitivity)
        const quality = sensitivity === "fast" ? 0.6 : sensitivity === "high" ? 0.9 : 0.8;
        const dataUrl = sendCanvas.toDataURL("image/jpeg", quality);
        const base64 = dataUrl.split(",")[1];

        // Only send if we're not currently locked in countdown
        if (countdown === null) {
          wsRef.current.send(JSON.stringify({
            frame: base64,
            use_calibration: true,
            palette: palette,
            fps: fps
          }));
        }
      }
      
      // Throttle framerate depending on sensitivity
      const delay = sensitivity === "fast" ? 100 : sensitivity === "high" ? 250 : 150;
      setTimeout(() => {
        animationId = requestAnimationFrame(processFrame);
      }, delay);
    };
    
    animationId = requestAnimationFrame(processFrame);
    return () => cancelAnimationFrame(animationId);
  }, [palette, sensitivity, fps, countdown, isCameraActive]);

  // Handle countdown
  useEffect(() => {
    if (isStable && countdown === null) {
      setCountdown(3);
    } else if (!isStable && countdown !== null) {
      setCountdown(null);
      if (countdownRef.current) clearInterval(countdownRef.current);
    }
  }, [isStable, countdown]);

  useEffect(() => {
    if (countdown !== null) {
      countdownRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(countdownRef.current);
            onCapture(stickers);
            return null;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [countdown, stickers, onCapture]);

  if (hasCameraError) {
    return (
      <div className="manual-card flex flex-col items-center justify-center p-8 text-center h-full min-h-[400px]">
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

      {/* Viewfinder overlay */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-10">
        <div className="relative aspect-square transition-all duration-200 ease-out" style={{ width: `${gridSize * 100}%` }}>
          {/* Guide corners */}
          <div className={`absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 ${isStable ? 'border-green-400' : 'border-white/50'} transition-colors`} />
          <div className={`absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 ${isStable ? 'border-green-400' : 'border-white/50'} transition-colors`} />
          <div className={`absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 ${isStable ? 'border-green-400' : 'border-white/50'} transition-colors`} />
          <div className={`absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 ${isStable ? 'border-green-400' : 'border-white/50'} transition-colors`} />
          
          {/* 3x3 Grid Overlay */}
          <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 p-1 gap-0.5">
            {stickers.map((s, i) => (
              <div key={i} className="border border-white/20 flex items-center justify-center relative overflow-hidden">
                 {/* Sticker color preview fill */}
                 {s.color !== "unknown" && (
                   <div 
                      className="absolute inset-0 opacity-40 transition-colors duration-200"
                      style={{ backgroundColor: s.color }}
                   />
                 )}
                 {/* Confidence indicator */}
                 {s.confidence > 0 && (
                   <div className="absolute bottom-1 right-1 text-[8px] font-mono text-white/80 bg-black/50 px-1 rounded">
                     {Math.round(s.confidence * 100)}%
                   </div>
                 )}
              </div>
            ))}
          </div>
          
          {/* Center target indicator */}
          <div className="absolute inset-0 flex items-center justify-center">
             <div className="w-1.5 h-1.5 rounded-full bg-white/40 backdrop-blur-sm" />
          </div>
        </div>
      </div>

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
        <div className="bg-black/60 backdrop-blur-md border border-white/10 rounded-full px-3 py-1.5 flex flex-col items-end">
          <div className="text-[10px] text-zinc-400 uppercase tracking-widest font-semibold flex items-center gap-1.5">
             <div className={`w-1.5 h-1.5 rounded-full ${wsStatus === "connected" ? "bg-green-500 shadow-[0_0_8px_#22c55e]" : "bg-red-500"}`} />
             {fps} FPS
          </div>
          <div className="text-xs font-mono text-white mt-0.5">{face} FACE</div>
        </div>
      </div>

      {/* Countdown Overlay */}
      <AnimatePresence>
        {countdown !== null && (
          <motion.div 
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 1.5, opacity: 0 }}
            className="absolute inset-0 z-30 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          >
            <motion.div 
              key={countdown}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.2, opacity: 0 }}
              className="text-8xl font-bold text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.5)]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {countdown}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
