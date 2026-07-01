import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * CubeVision — Auth Store (Zustand)
 *
 * Manages authentication state with localStorage persistence.
 */
export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,

      setAuth: (user, tokens) => {
        if (typeof window !== "undefined") {
          localStorage.setItem("cubevision_token", tokens.access_token);
          localStorage.setItem("cubevision_refresh_token", tokens.refresh_token);
        }
        set({
          user,
          token: tokens.access_token,
          refreshToken: tokens.refresh_token,
          isAuthenticated: true,
        });
      },

      setUser: (user) => set({ user }),

      logout: () => {
        if (typeof window !== "undefined") {
          localStorage.removeItem("cubevision_token");
          localStorage.removeItem("cubevision_refresh_token");
        }
        set({
          user: null,
          token: null,
          refreshToken: null,
          isAuthenticated: false,
        });
      },

      updateUser: (updates) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...updates } : null,
        })),
    }),
    {
      name: "cubevision-auth",
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
