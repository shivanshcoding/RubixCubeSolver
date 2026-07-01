"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import toast from "react-hot-toast";
import { RiUserLine, RiGlobalLine, RiAlignLeft, RiCheckLine, RiLoader4Line } from "react-icons/ri";

import { useAuthStore } from "@/store/authStore";
import { checkUsername, setupProfile } from "@/services/api";

const schema = yup.object({
  username: yup
    .string()
    .required("Username is required")
    .min(3, "Must be at least 3 characters")
    .max(30, "Must be at most 30 characters")
    .matches(/^[a-zA-Z0-9_]+$/, "Only letters, numbers, and underscores allowed"),
  country: yup.string().max(50, "Country name is too long"),
  bio: yup.string().max(500, "Bio cannot exceed 500 characters"),
});

export default function SetupProfilePage() {
  const router = useRouter();
  const { user, setAuth } = useAuthStore();
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      username: "",
      country: "",
      bio: "",
    },
  });

  const usernameValue = watch("username");

  useEffect(() => {
    if (!user) {
      router.push("/login");
      return;
    }
    if (user.is_setup_complete) {
      router.push("/dashboard");
    }
  }, [user, router]);

  useEffect(() => {
    const checkAvailability = async () => {
      if (usernameValue.length < 3) {
        setUsernameAvailable(null);
        return;
      }

      setIsCheckingUsername(true);
      try {
        const { available } = await checkUsername(usernameValue);
        setUsernameAvailable(available);
      } catch (err) {
        setUsernameAvailable(null);
      } finally {
        setIsCheckingUsername(false);
      }
    };

    const timer = setTimeout(checkAvailability, 500);
    return () => clearTimeout(timer);
  }, [usernameValue]);

  const onSubmit = async (data) => {
    if (usernameAvailable === false) {
      toast.error("Please choose an available username");
      return;
    }

    try {
      const updatedUser = await setupProfile({
        username: data.username,
        country: data.country || undefined,
        bio: data.bio || undefined,
      });
      
      // Update local store (preserve tokens)
      const currentTokens = useAuthStore.getState().tokens;
      setAuth(updatedUser, currentTokens);
      
      toast.success("Profile setup complete!");
      router.push("/dashboard");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to setup profile");
    }
  };

  if (!user || user.is_setup_complete) return null;

  return (
    <div className="min-h-screen pt-24 pb-12 flex items-center justify-center px-4 sm:px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-lg"
      >
        <div className="glass-card p-8 sm:p-10 relative overflow-hidden">
          {/* Background Glow */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-[80px] pointer-events-none" />

          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold gradient-text mb-2" style={{ fontFamily: "var(--font-display)" }}>
              Complete Your Profile
            </h1>
            <p className="text-zinc-400 text-sm">
              Just a few more details to set up your account.
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Username */}
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Choose a Username *
              </label>
              <div className="relative">
                <RiUserLine className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  type="text"
                  {...register("username")}
                  className={`w-full bg-black/50 border pl-10 pr-10 py-3 rounded-xl text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:border-transparent transition-all ${
                    errors.username
                      ? "border-red-500/50 focus:ring-red-500/50"
                      : usernameAvailable === true
                      ? "border-green-500/50 focus:ring-green-500/50"
                      : "border-white/10 focus:ring-amber-500/50"
                  }`}
                  placeholder="cube_master_99"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {isCheckingUsername ? (
                    <RiLoader4Line className="w-5 h-5 text-amber-500 animate-spin" />
                  ) : usernameAvailable === true ? (
                    <RiCheckLine className="w-5 h-5 text-green-500" />
                  ) : null}
                </div>
              </div>
              {errors.username ? (
                <p className="text-red-400 text-xs mt-1">{errors.username.message}</p>
              ) : usernameAvailable === false ? (
                <p className="text-red-400 text-xs mt-1">Username is already taken</p>
              ) : null}
            </div>

            {/* Country */}
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Country (Optional)
              </label>
              <div className="relative">
                <RiGlobalLine className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  type="text"
                  {...register("country")}
                  className="w-full bg-black/50 border border-white/10 pl-10 pr-4 py-3 rounded-xl text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-transparent transition-all"
                  placeholder="United States"
                />
              </div>
              {errors.country && <p className="text-red-400 text-xs mt-1">{errors.country.message}</p>}
            </div>

            {/* Bio */}
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Bio (Optional, Markdown Supported)
              </label>
              <div className="relative">
                <RiAlignLeft className="absolute left-3 top-4 text-zinc-500" />
                <textarea
                  {...register("bio")}
                  rows={4}
                  className="w-full bg-black/50 border border-white/10 pl-10 pr-4 py-3 rounded-xl text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-transparent transition-all resize-none"
                  placeholder="I speedsolve 3x3x3 in under 15 seconds..."
                />
              </div>
              {errors.bio && <p className="text-red-400 text-xs mt-1">{errors.bio.message}</p>}
            </div>

            {/* Submit Button */}
            <motion.button
              type="submit"
              disabled={isSubmitting || usernameAvailable === false}
              className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-black font-semibold py-3 rounded-xl flex justify-center items-center gap-2 hover:shadow-[0_0_20px_rgba(245,158,11,0.4)] transition-shadow disabled:opacity-50 disabled:cursor-not-allowed"
              whileTap={{ scale: 0.98 }}
            >
              {isSubmitting ? (
                <RiLoader4Line className="w-5 h-5 animate-spin" />
              ) : (
                "Complete Setup"
              )}
            </motion.button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
