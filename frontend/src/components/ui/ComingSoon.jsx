"use client";

import { motion } from "framer-motion";
import { RiRocketLine, RiTimeLine } from "react-icons/ri";

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
};

export default function ComingSoon({ title, description }) {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-16 flex flex-col items-center justify-center min-h-[60vh] text-center">
      <motion.div 
        initial="hidden" 
        animate="visible" 
        variants={fadeIn}
        className="glass-card p-12 max-w-xl w-full relative overflow-hidden"
      >
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-amber-500/10 rounded-full blur-[60px] pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-blue-500/10 rounded-full blur-[60px] pointer-events-none" />
        
        <div className="relative z-10 flex flex-col items-center">
          <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-6 shadow-xl">
            <RiRocketLine className="w-8 h-8 text-amber-400" />
          </div>
          
          <h1 className="text-3xl font-bold mb-3" style={{ fontFamily: "var(--font-display)" }}>
            {title}
          </h1>
          
          <p className="text-zinc-400 mb-8 text-sm max-w-sm">
            {description}
          </p>
          
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-400/10 text-amber-400 border border-amber-400/20 text-sm font-medium">
            <RiTimeLine className="w-4 h-4" />
            Coming Soon
          </div>
        </div>
      </motion.div>
    </div>
  );
}
