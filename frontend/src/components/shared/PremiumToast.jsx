"use client";

import { toast } from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import { RiCheckLine, RiErrorWarningLine, RiCloseLine, RiInformationLine } from "react-icons/ri";

/**
 * Premium Glassmorphism Toast System
 */

const ToastContent = ({ t, title, message, type, metrics, warnings, actions }) => {
  const isError = type === "error";
  const isWarning = type === "warning";
  const isSuccess = type === "success";

  const borderColor = isError ? "border-red-500" : isWarning ? "border-orange-500" : isSuccess ? "border-green-500" : "border-blue-500";
  const bgGlow = isError ? "bg-red-500/10" : isWarning ? "bg-orange-500/10" : isSuccess ? "bg-green-500/10" : "bg-blue-500/10";
  const Icon = isError ? RiCloseLine : isWarning ? RiErrorWarningLine : isSuccess ? RiCheckLine : RiInformationLine;
  const iconColor = isError ? "text-red-400" : isWarning ? "text-orange-400" : isSuccess ? "text-green-400" : "text-blue-400";

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={`pointer-events-auto flex flex-col w-full max-w-sm overflow-hidden bg-black/60 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl border-l-4 ${borderColor}`}
    >
      <div className={`p-4 ${bgGlow} flex items-start gap-3`}>
        <div className={`shrink-0 p-1.5 rounded-full bg-black/40 border border-white/5 ${iconColor}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0 pt-0.5">
          <p className="text-sm font-semibold text-white tracking-wide">{title}</p>
          {message && <p className="mt-1 text-xs text-zinc-300 leading-relaxed">{message}</p>}
          
          {metrics && (
            <div className="mt-3 p-2 bg-black/40 rounded-lg border border-white/5">
              {metrics.map((m, i) => (
                <div key={i} className="flex justify-between items-center text-xs py-0.5">
                  <span className="text-zinc-400">{m.label}</span>
                  <span className="text-zinc-100 font-medium">{m.value}</span>
                </div>
              ))}
            </div>
          )}

          {warnings && warnings.length > 0 && (
            <div className="mt-3 flex flex-col gap-1.5">
              {warnings.map((w, i) => (
                <p key={i} className="text-xs text-orange-200/90 leading-tight">
                  <span className="text-orange-400 font-bold mr-1">⚠</span>
                  {w}
                </p>
              ))}
            </div>
          )}
          
          {actions && (
             <div className="mt-4 flex gap-2">
               {actions.map((act, i) => (
                 <button 
                   key={i}
                   onClick={() => {
                     if (act.onClick) act.onClick();
                     if (act.dismiss) toast.dismiss(t.id);
                   }}
                   className={`flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                     act.primary 
                       ? "bg-white/10 hover:bg-white/20 text-white" 
                       : "bg-transparent border border-white/10 hover:bg-white/5 text-zinc-300"
                   }`}
                 >
                   {act.label}
                 </button>
               ))}
             </div>
          )}
        </div>
        <button 
          onClick={() => toast.dismiss(t.id)}
          className="shrink-0 p-1 rounded-md text-zinc-500 hover:text-white hover:bg-white/10 transition-colors"
        >
          <RiCloseLine className="w-4 h-4" />
        </button>
      </div>
      
      {/* Animated progress bar at bottom */}
      {t.duration && t.duration !== Infinity && (
        <motion.div 
          initial={{ width: "100%" }}
          animate={{ width: "0%" }}
          transition={{ duration: t.duration / 1000, ease: "linear" }}
          className={`h-0.5 ${isError ? "bg-red-500" : isWarning ? "bg-orange-500" : isSuccess ? "bg-green-500" : "bg-blue-500"}`}
        />
      )}
    </motion.div>
  );
};

export const showPremiumToast = (options) => {
  const { title, message, type = "info", duration = 4000, metrics, warnings, actions, id } = options;
  return toast.custom(
    (t) => (
      <ToastContent 
        t={{...t, duration}} 
        title={title} 
        message={message} 
        type={type}
        metrics={metrics}
        warnings={warnings}
        actions={actions}
      />
    ),
    { duration, id }
  );
};
