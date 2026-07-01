"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { RiHome4Line } from "react-icons/ri";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 animated-gradient">
      <motion.div
        className="text-center"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        {/* Scrambled cube visual */}
        <div className="relative w-32 h-32 mx-auto mb-8 animate-float">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-400/20 to-red-500/20 rounded-2xl rotate-12 blur-xl" />
          <div className="relative glass-card p-3 rotate-12">
            <div className="grid grid-cols-3 gap-1">
              {["#ef4444", "#3b82f6", "#f59e0b", "#22c55e", "#ffffff", "#ef4444", "#f97316", "#ffff00", "#3b82f6"]
                .map((color, i) => (
                  <div
                    key={i}
                    className="w-7 h-7 rounded-sm border border-white/10"
                    style={{ backgroundColor: color }}
                  />
                ))}
            </div>
          </div>
        </div>

        <h1 className="text-7xl font-extrabold gradient-text mb-4" style={{ fontFamily: "var(--font-display)" }}>
          404
        </h1>
        <h2 className="text-xl font-semibold text-white mb-2">
          Lost in the Cube
        </h2>
        <p className="text-zinc-400 max-w-sm mx-auto mb-8">
          This page seems to be in a scrambled state. Let&apos;s get you back to the solved side.
        </p>

        <Link href="/" className="btn-primary inline-flex items-center gap-2">
          <RiHome4Line className="w-4 h-4" />
          Back to Home
        </Link>
      </motion.div>
    </div>
  );
}
