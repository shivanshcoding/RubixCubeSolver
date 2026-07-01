"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import {
  RiUserLine,
  RiMailLine,
  RiLockLine,
  RiEyeLine,
  RiEyeOffLine,
  RiGlobalLine,
  RiArrowRightLine,
  RiCheckLine,
  RiCloseLine,
  RiLoader4Line,
} from "react-icons/ri";
import { signup as signupApi, googleAuth, checkUsername, checkEmail } from "@/services/api";
import { useAuthStore } from "@/store/authStore";
import AuthLayout from "@/components/auth/AuthLayout";
import GoogleSignInButton from "@/components/auth/GoogleSignInButton";
import PasswordStrength, { isPasswordStrong } from "@/components/auth/PasswordStrength";

// Debounce helper
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}

export default function SignupPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    country: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [focusedField, setFocusedField] = useState(null);

  // Uniqueness validation state
  const [usernameStatus, setUsernameStatus] = useState(null); // null | "checking" | "available" | "taken" | "invalid"
  const [emailStatus, setEmailStatus] = useState(null);

  const debouncedUsername = useDebounce(form.username, 500);
  const debouncedEmail = useDebounce(form.email, 500);

  // Check username availability
  useEffect(() => {
    if (!debouncedUsername || debouncedUsername.length < 3) {
      setUsernameStatus(debouncedUsername.length > 0 && debouncedUsername.length < 3 ? "invalid" : null);
      return;
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(debouncedUsername)) {
      setUsernameStatus("invalid");
      return;
    }

    setUsernameStatus("checking");
    checkUsername(debouncedUsername)
      .then((res) => setUsernameStatus(res.available ? "available" : "taken"))
      .catch(() => setUsernameStatus(null)); // Silently fail — backend might not be up
  }, [debouncedUsername]);

  // Check email availability
  useEffect(() => {
    if (!debouncedEmail) {
      setEmailStatus(null);
      return;
    }
    // Basic email format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(debouncedEmail)) {
      setEmailStatus("invalid");
      return;
    }

    setEmailStatus("checking");
    checkEmail(debouncedEmail)
      .then((res) => setEmailStatus(res.available ? "available" : "taken"))
      .catch(() => setEmailStatus(null));
  }, [debouncedEmail]);

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

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!form.username || !form.email || !form.password) {
      toast.error("Please fill in all required fields");
      return;
    }
    if (form.username.length < 3) {
      toast.error("Username must be at least 3 characters");
      return;
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(form.username)) {
      toast.error("Username can only contain letters, numbers, _ and -");
      return;
    }
    if (usernameStatus === "taken") {
      toast.error("This username is already taken");
      return;
    }
    if (emailStatus === "taken") {
      toast.error("An account with this email already exists");
      return;
    }
    if (!isPasswordStrong(form.password)) {
      toast.error("Please use a stronger password");
      return;
    }
    if (form.password !== form.confirmPassword) {
      toast.error("Passwords don't match");
      return;
    }

    setLoading(true);
    try {
      const res = await signupApi({
        username: form.username,
        email: form.email,
        password: form.password,
        country: form.country || undefined,
      });
      setAuth(res.user, res.tokens);
      toast.success("Account created! Welcome to CubeVision!");
      router.push("/dashboard");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  function StatusIndicator({ status }) {
    if (!status) return null;

    const config = {
      checking: { icon: <RiLoader4Line className="w-3.5 h-3.5 animate-spin" />, color: "text-zinc-400" },
      available: { icon: <RiCheckLine className="w-3.5 h-3.5" />, color: "text-emerald-400" },
      taken: { icon: <RiCloseLine className="w-3.5 h-3.5" />, color: "text-red-400" },
      invalid: { icon: <RiCloseLine className="w-3.5 h-3.5" />, color: "text-red-400" },
    };

    const c = config[status];
    if (!c) return null;

    return (
      <motion.span
        className={`absolute right-3 top-1/2 -translate-y-1/2 ${c.color}`}
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 500, damping: 20 }}
      >
        {c.icon}
      </motion.span>
    );
  }

  function StatusMessage({ status, field }) {
    const messages = {
      username: {
        checking: "Checking availability...",
        available: "Username is available!",
        taken: "This username is already taken",
        invalid: "Must be 3+ chars, letters/numbers/_/- only",
      },
      email: {
        checking: "Checking availability...",
        available: "Email is available!",
        taken: "An account with this email already exists",
        invalid: "Please enter a valid email address",
      },
    };

    if (!status || !messages[field]?.[status]) return null;

    const colorMap = {
      checking: "text-zinc-500",
      available: "text-emerald-400/70",
      taken: "text-red-400/80",
      invalid: "text-red-400/80",
    };

    return (
      <motion.p
        className={`text-xs mt-1.5 ${colorMap[status]}`}
        initial={{ opacity: 0, y: -5 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -5 }}
        transition={{ duration: 0.2 }}
      >
        {messages[field][status]}
      </motion.p>
    );
  }

  return (
    <AuthLayout>
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
      >
        {/* Header */}
        <div className="mb-6">
          <motion.h1
            className="text-3xl font-bold gradient-text mb-2"
            style={{ fontFamily: "var(--font-display)" }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            Create Account
          </motion.h1>
          <motion.p
            className="text-zinc-400 text-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            Join the CubeVision community
          </motion.p>
        </div>

        {/* Google Sign-In */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
        >
          <GoogleSignInButton
            onClick={handleGoogleSignIn}
            loading={googleLoading}
            label="Sign up with Google"
          />
        </motion.div>

        {/* Divider */}
        <motion.div
          className="auth-divider"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <span>or create an account with email</span>
        </motion.div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Username */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55 }}
          >
            <label className="auth-label">
              Username <span className="text-amber-400/60">*</span>
            </label>
            <div className={`auth-input-wrapper ${focusedField === "username" ? "focused" : ""} ${usernameStatus === "taken" || usernameStatus === "invalid" ? "error" : ""} ${usernameStatus === "available" ? "success" : ""}`}>
              <RiUserLine className="auth-input-icon" />
              <input
                type="text"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                onFocus={() => setFocusedField("username")}
                onBlur={() => setFocusedField(null)}
                className="auth-input"
                placeholder="cubepro42"
                autoComplete="username"
              />
              <StatusIndicator status={usernameStatus} />
            </div>
            <AnimatePresence>
              <StatusMessage status={usernameStatus} field="username" />
            </AnimatePresence>
          </motion.div>

          {/* Email */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <label className="auth-label">
              Email <span className="text-amber-400/60">*</span>
            </label>
            <div className={`auth-input-wrapper ${focusedField === "email" ? "focused" : ""} ${emailStatus === "taken" || emailStatus === "invalid" ? "error" : ""} ${emailStatus === "available" ? "success" : ""}`}>
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
              <StatusIndicator status={emailStatus} />
            </div>
            <AnimatePresence>
              <StatusMessage status={emailStatus} field="email" />
            </AnimatePresence>
          </motion.div>

          {/* Password */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.65 }}
          >
            <label className="auth-label">
              Password <span className="text-amber-400/60">*</span>
            </label>
            <div className={`auth-input-wrapper ${focusedField === "password" ? "focused" : ""}`}>
              <RiLockLine className="auth-input-icon" />
              <input
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                onFocus={() => setFocusedField("password")}
                onBlur={() => setFocusedField(null)}
                className="auth-input with-toggle"
                placeholder="Create a strong password"
                autoComplete="new-password"
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
            <PasswordStrength password={form.password} />
          </motion.div>

          {/* Confirm Password */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
          >
            <label className="auth-label">
              Confirm Password <span className="text-amber-400/60">*</span>
            </label>
            <div className={`auth-input-wrapper ${focusedField === "confirmPassword" ? "focused" : ""} ${form.confirmPassword && form.password !== form.confirmPassword ? "error" : ""} ${form.confirmPassword && form.password === form.confirmPassword && form.confirmPassword.length > 0 ? "success" : ""}`}>
              <RiLockLine className="auth-input-icon" />
              <input
                type={showConfirmPassword ? "text" : "password"}
                value={form.confirmPassword}
                onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                onFocus={() => setFocusedField("confirmPassword")}
                onBlur={() => setFocusedField(null)}
                className="auth-input with-toggle"
                placeholder="Repeat your password"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="auth-toggle-btn"
                tabIndex={-1}
              >
                {showConfirmPassword ? <RiEyeOffLine /> : <RiEyeLine />}
              </button>
            </div>
            <AnimatePresence>
              {form.confirmPassword && form.password !== form.confirmPassword && (
                <motion.p
                  className="text-xs mt-1.5 text-red-400/80"
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                >
                  Passwords don&apos;t match
                </motion.p>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Country */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.75 }}
          >
            <label className="auth-label">Country <span className="text-zinc-600 text-xs font-normal">(optional)</span></label>
            <div className={`auth-input-wrapper ${focusedField === "country" ? "focused" : ""}`}>
              <RiGlobalLine className="auth-input-icon" />
              <input
                type="text"
                value={form.country}
                onChange={(e) => setForm({ ...form, country: e.target.value })}
                onFocus={() => setFocusedField("country")}
                onBlur={() => setFocusedField(null)}
                className="auth-input"
                placeholder="India"
                autoComplete="country-name"
              />
            </div>
          </motion.div>

          {/* Submit */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="pt-1"
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
                  Creating account...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  Create Account
                  <RiArrowRightLine className="w-4 h-4" />
                </span>
              )}
            </motion.button>
          </motion.div>
        </form>

        {/* Footer */}
        <motion.p
          className="text-center text-sm text-zinc-500 mt-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
        >
          Already have an account?{" "}
          <Link
            href="/login"
            className="text-amber-400 hover:text-amber-300 font-semibold transition-colors"
          >
            Sign in
          </Link>
        </motion.p>
      </motion.div>
    </AuthLayout>
  );
}
