import { create } from "zustand";

export const useUIStore = create((set) => ({
  showParticles: true,
  setShowParticles: (show) => set({ showParticles: show }),
}));
