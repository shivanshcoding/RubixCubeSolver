"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { Toaster } from "react-hot-toast";
import dynamic from "next/dynamic";
import RouteGuard from "./RouteGuard";

const ParticleBackground = dynamic(
  () => import("@/components/shared/ParticleBackground"),
  { ssr: false }
);

/**
 * Root providers wrapper — React Query + Toast notifications + Global particles.
 */
export default function Providers({ children }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000, // 5 minutes
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ParticleBackground particleCount={50} />
      <RouteGuard>
        {children}
      </RouteGuard>
      <Toaster
        position="bottom-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: "rgba(15, 15, 19, 0.9)",
            color: "#fafafa",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            backdropFilter: "blur(20px)",
            borderRadius: "12px",
            fontSize: "0.875rem",
            padding: "12px 16px",
            boxShadow: "0 4px 30px rgba(0, 0, 0, 0.4)",
          },
          success: {
            iconTheme: {
              primary: "#22c55e",
              secondary: "#000",
            },
          },
          error: {
            iconTheme: {
              primary: "#ef4444",
              secondary: "#000",
            },
          },
        }}
      />
    </QueryClientProvider>
  );
}
