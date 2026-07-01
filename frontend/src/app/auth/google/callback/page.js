"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { googleCallback } from "@/services/api";
import { useAuthStore } from "@/store/authStore";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import AuthLayout from "@/components/auth/AuthLayout";

export default function GoogleCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const code = searchParams.get("code");
  const { setAuth } = useAuthStore();
  const [status, setStatus] = useState("Processing Google Login...");

  useEffect(() => {
    if (!code) {
      toast.error("Invalid Google authentication response");
      router.push("/login");
      return;
    }

    const processLogin = async () => {
      try {
        const res = await googleCallback(code);
        setAuth(res.user, res.tokens);
        
        if (res.user.is_setup_complete === false || res.is_new_user) {
           setStatus("Redirecting to profile setup...");
           toast.success("Account created successfully!");
           router.push("/setup-profile");
        } else {
           setStatus("Login successful! Redirecting...");
           toast.success(`Welcome back, ${res.user.display_name || res.user.username}!`);
           router.push("/dashboard");
        }
      } catch (err) {
        toast.error(err?.response?.data?.detail || "Google login failed");
        router.push("/login");
      }
    };

    processLogin();
  }, [code, router, setAuth]);

  return (
    <AuthLayout>
      <div className="flex flex-col items-center justify-center h-[50vh]">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="p-12 flex flex-col items-center"
        >
          <div className="w-12 h-12 border-4 border-amber-400 border-t-transparent rounded-full animate-spin mb-6" />
          <h2 className="text-xl font-semibold text-white">{status}</h2>
          <p className="text-zinc-500 mt-2 text-sm">Please wait a moment.</p>
        </motion.div>
      </div>
    </AuthLayout>
  );
}
