"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { RiCheckLine, RiCloseLine } from "react-icons/ri";

/**
 * Password strength meter with animated bars and requirement checklist.
 */

const REQUIREMENTS = [
  { key: "length", label: "At least 8 characters", test: (pw) => pw.length >= 8 },
  { key: "upper", label: "One uppercase letter", test: (pw) => /[A-Z]/.test(pw) },
  { key: "lower", label: "One lowercase letter", test: (pw) => /[a-z]/.test(pw) },
  { key: "number", label: "One number", test: (pw) => /[0-9]/.test(pw) },
  { key: "special", label: "One special character (!@#$...)", test: (pw) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(pw) },
];

const STRENGTH_CONFIG = [
  { label: "Very Weak", color: "#ef4444", barColor: "bg-red-500", width: "20%" },
  { label: "Weak", color: "#f97316", barColor: "bg-orange-500", width: "40%" },
  { label: "Fair", color: "#eab308", barColor: "bg-yellow-500", width: "60%" },
  { label: "Strong", color: "#22c55e", barColor: "bg-green-500", width: "80%" },
  { label: "Very Strong", color: "#10b981", barColor: "bg-emerald-500", width: "100%" },
];

export function getPasswordStrength(password) {
  if (!password) return -1;
  const passedCount = REQUIREMENTS.filter((r) => r.test(password)).length;
  return Math.min(passedCount - 1, 4);
}

export function isPasswordStrong(password) {
  return REQUIREMENTS.every((r) => r.test(password));
}

export default function PasswordStrength({ password }) {
  const results = useMemo(
    () => REQUIREMENTS.map((r) => ({ ...r, passed: r.test(password) })),
    [password]
  );

  const strength = useMemo(() => getPasswordStrength(password), [password]);

  if (!password) return null;

  const config = STRENGTH_CONFIG[Math.max(strength, 0)];

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.3 }}
      className="mt-2 space-y-2"
    >
      {/* Strength bar */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ backgroundColor: config.color }}
            initial={{ width: 0 }}
            animate={{ width: config.width }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          />
        </div>
        <span className="text-xs font-medium min-w-[80px] text-right" style={{ color: config.color }}>
          {config.label}
        </span>
      </div>

      {/* Requirements checklist */}
      <div className="grid grid-cols-1 gap-1">
        {results.map((req) => (
          <motion.div
            key={req.key}
            className="flex items-center gap-2 text-xs"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2 }}
          >
            {req.passed ? (
              <RiCheckLine className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            ) : (
              <RiCloseLine className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
            )}
            <span className={req.passed ? "text-emerald-400/80" : "text-zinc-600"}>
              {req.label}
            </span>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
