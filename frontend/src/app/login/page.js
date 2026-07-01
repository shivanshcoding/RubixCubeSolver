"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { RiMailLine, RiLockLine, RiEyeLine, RiEyeOffLine, RiArrowRightLine } from "react-icons/ri";
import { login as loginApi, googleAuth } from "@/services/api";
import { useAuthStore } from "@/store/authStore";
import AuthLayout from "@/components/auth/AuthLayout";
import GoogleSignInButton from "@/components/auth/GoogleSignInButton";

export default function LoginPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [form, setForm] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [focusedField, setFocusedField] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) {
      toast.error("Please fill in all fields");
      return;
    }

    setLoading(true);
    try {
      const res = await loginApi(form);
      setAuth(res.user, res.tokens);
      toast.success("Welcome back!");
      router.push("/dashboard");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      const { auth_url } = await googleAuth();
      window.location.href = auth_url;
    } catch (err) {
      toast.error("Google sign-in unavailable. Try again later.");
      setGoogleLoading(false);
    }
  };

  return (
    <AuthLayout>
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
      >
        {/* Header */}
        <div className="mb-8">
          <motion.h1
            className="text-3xl font-bold gradient-text mb-2"
            style={{ fontFamily: "var(--font-display)" }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            Welcome Back
          </motion.h1>
          <motion.p
            className="text-zinc-400 text-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            Sign in to your CubeVision account
          </motion.p>
        </div>

        {/* Google Sign-In */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
        >
          <GoogleSignInButton onClick={handleGoogleSignIn} loading={googleLoading} />
        </motion.div>

        {/* Divider */}
        <motion.div
          className="auth-divider"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <span>or sign in with email</span>
        </motion.div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Email */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55 }}
          >
            <label className="auth-label">Email</label>
            <div className={`auth-input-wrapper ${focusedField === "email" ? "focused" : ""}`}>
              <RiMailLine className="auth-input-icon" />
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                onFocus={() => setFocusedField("email")}
                onBlur={() => setFocusedField(null)}
                className="auth-input"
                placeholder="you@example.com"
                autoComplete="email"
              />
            </div>
          </motion.div>

          {/* Password */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <label className="auth-label">Password</label>
            <div className={`auth-input-wrapper ${focusedField === "password" ? "focused" : ""}`}>
              <RiLockLine className="auth-input-icon" />
              <input
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                onFocus={() => setFocusedField("password")}
                onBlur={() => setFocusedField(null)}
                className="auth-input"
                placeholder="Enter your password"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="auth-toggle-btn"
                tabIndex={-1}
              >
                {showPassword ? <RiEyeOffLine /> : <RiEyeLine />}
              </button>
            </div>
          </motion.div>

          {/* Remember / Forgot */}
          <motion.div
            className="flex items-center justify-between text-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.65 }}
          >
            <label className="flex items-center gap-2 text-zinc-400 cursor-pointer select-none">
              <input type="checkbox" className="auth-checkbox" />
              Remember me
            </label>
            <Link
              href="/forgot-password"
              className="text-amber-400/80 hover:text-amber-300 transition-colors text-xs font-medium"
            >
              Forgot password?
            </Link>
          </motion.div>

          {/* Submit */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
          >
            <motion.button
              type="submit"
              disabled={loading}
              className="auth-submit-btn"
              whileHover={{ scale: 1.01, boxShadow: "0 0 30px rgba(245, 158, 11, 0.3)" }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: "spring", stiffness: 400, damping: 15 }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                  Signing in...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  Sign In
                  <RiArrowRightLine className="w-4 h-4" />
                </span>
              )}
            </motion.button>
          </motion.div>
        </form>

        {/* Footer */}
        <motion.p
          className="text-center text-sm text-zinc-500 mt-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          Don&apos;t have an account?{" "}
          <Link
            href="/signup"
            className="text-amber-400 hover:text-amber-300 font-semibold transition-colors"
          >
            Create one
          </Link>
        </motion.p>
      </motion.div>
    </AuthLayout>
  );
}
