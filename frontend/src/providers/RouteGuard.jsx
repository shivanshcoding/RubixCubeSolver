"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";

const PROTECTED_ROUTES = ["/dashboard", "/profile", "/contest", "/settings"];

export default function RouteGuard({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [authorized, setAuthorized] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    
    // Check if the current route is protected
    const isProtected = PROTECTED_ROUTES.some(
      (route) => pathname === route || pathname.startsWith(route + "/")
    );

    if (isProtected && !isAuthenticated) {
      setAuthorized(false);
      router.replace("/signup");
    } else {
      setAuthorized(true);
    }
  }, [pathname, isAuthenticated, isHydrated, router]);

  // Prevent flicker of protected content
  if (!isHydrated || (!authorized && PROTECTED_ROUTES.some((route) => pathname === route || pathname.startsWith(route + "/")))) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  return children;
}
