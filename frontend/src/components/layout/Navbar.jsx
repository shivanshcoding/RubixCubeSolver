"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { useCubeStore } from "@/store/cubeStore";
import {
  RiDashboardLine,
  RiBox3Line,
  RiCameraLine,
  RiBookOpenLine,
  RiTrophyLine,
  RiUser3Line,
  RiSettings4Line,
  RiLoginBoxLine,
  RiMenuLine,
  RiCloseLine,
  RiFireLine,
} from "react-icons/ri";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: RiDashboardLine, auth: true },
  { href: "/cube/manual", label: "Manual Entry", icon: RiBox3Line, auth: false },
  { href: "/cube/scanner", label: "Camera Scan", icon: RiCameraLine, auth: false },
  { href: "/learn", label: "Learn", icon: RiBookOpenLine, auth: false },
  { href: "/contest", label: "Contest", icon: RiTrophyLine, auth: false },
  { href: "/daily", label: "Daily", icon: RiFireLine, auth: false },
];

export default function Navbar() {
  const pathname = usePathname();
  const { isAuthenticated, user, logout } = useAuthStore();
  const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Restricted pages should not show the user profile or dashboard links
  const isRestrictedPage = ["/", "/login", "/signup"].includes(pathname);

  return (
    <nav className="glass-nav fixed top-0 left-0 right-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="relative w-8 h-8">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-400 to-orange-500 rounded-lg rotate-12 group-hover:rotate-45 transition-transform duration-500" />
              <div className="absolute inset-0.5 bg-surface-900 rounded-lg rotate-12 group-hover:rotate-45 transition-transform duration-500 flex items-center justify-center">
                <span className="text-amber-400 font-bold text-xs -rotate-12 group-hover:-rotate-45 transition-transform duration-500">
                  CV
                </span>
              </div>
            </div>
            <span className="text-lg font-bold tracking-tight">
              <span className="gradient-text">CubeVision</span>
              <span className="text-text-muted text-sm ml-1 font-normal">AI</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            {NAV_ITEMS.map((item) => {
              if (item.auth && (!isAuthenticated || isRestrictedPage)) return null;
              const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");
              const Icon = item.icon;

              const isCubePage = item.href === "/cube/manual" || item.href === "/cube/scanner";
              
              const handleClick = () => {
                if (isCubePage) {
                  useCubeStore.getState().resetAll();
                }
              };

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={handleClick}
                  className={`relative flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? "text-amber-400"
                      : "text-zinc-400 hover:text-zinc-200 hover:bg-white/5"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                  {isActive && (
                    <motion.div
                      layoutId="navbar-indicator"
                      className="absolute inset-0 bg-amber-400/10 border border-amber-400/20 rounded-lg"
                      transition={{ type: "spring", stiffness: 350, damping: 30 }}
                    />
                  )}
                </Link>
              );
            })}
          </div>

          {/* Right Side */}
          <div className="hidden md:flex items-center gap-3">
            {!isRestrictedPage && isAuthenticated ? (
                <div className="flex items-center gap-3">
                  <Link
                    href="/profile"
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-zinc-300 hover:text-white hover:bg-white/5 transition-all"
                  >
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                      <span className="text-xs font-bold text-black">
                        {user?.username?.charAt(0).toUpperCase() || "U"}
                      </span>
                    </div>
                    <span className="font-medium">{user?.username || "User"}</span>
                  </Link>
                  <button onClick={logout} className="btn-ghost text-xs">
                    Logout
                  </button>
                </div>
              ) : !isAuthenticated && (
              <div className="flex items-center gap-2">
                <Link href="/login" className="btn-ghost flex items-center gap-1.5 text-sm">
                  <RiLoginBoxLine className="w-4 h-4" />
                  Login
                </Link>
                <Link href="/signup" className="btn-primary text-sm">
                  Sign Up
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <button
            className="md:hidden p-2 text-zinc-400 hover:text-white"
            onClick={() => setMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? (
              <RiCloseLine className="w-6 h-6" />
            ) : (
              <RiMenuLine className="w-6 h-6" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden glass border-t border-white/5"
          >
            <div className="px-4 py-4 space-y-1">
              {NAV_ITEMS.map((item) => {
                if (item.auth && (!isAuthenticated || isRestrictedPage)) return null;
                const isActive = pathname === item.href;
                const Icon = item.icon;
                const isCubePage = item.href === "/cube/manual" || item.href === "/cube/scanner";

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                      isActive
                        ? "text-amber-400 bg-amber-400/10"
                        : "text-zinc-400 hover:text-white hover:bg-white/5"
                    }`}
                    onClick={() => {
                      if (isCubePage) useCubeStore.getState().resetAll();
                      setMobileMenuOpen(false);
                    }}
                  >
                    <Icon className="w-5 h-5" />
                    {item.label}
                  </Link>
                );
              })}

              {!isRestrictedPage && isAuthenticated ? (
                <div className="border-t border-white/5 pt-3 mt-3">
                  <button onClick={logout} className="w-full text-left px-4 py-3 text-sm text-zinc-400 hover:text-white rounded-lg hover:bg-white/5">
                    Logout
                  </button>
                </div>
              ) : !isAuthenticated && (
                <div className="border-t border-white/5 pt-3 mt-3">
                  <div className="space-y-2">
                    <Link href="/login" className="block px-4 py-3 text-sm text-zinc-300 hover:text-white rounded-lg hover:bg-white/5">
                      Login
                    </Link>
                    <Link href="/signup" className="block px-4 py-3 text-sm text-center btn-primary">
                      Sign Up
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
