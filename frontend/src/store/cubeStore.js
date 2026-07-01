import { create } from "zustand";

/**
 * CubeVision — Cube State Store (Zustand)
 *
 * Central store for cube state management.
 * Maintains color mapping, face notation, and synchronization.
 */

const FACE_ORDER = ["U", "R", "F", "D", "L", "B"];

const DEFAULT_COLOR_MAPPING = {
  U: "#FFFFFF", // White
  D: "#FFFF00", // Yellow
  F: "#00FF00", // Green
  B: "#0000FF", // Blue
  R: "#FF0000", // Red
  L: "#FFA500", // Orange
};

const FACE_LABELS = {
  U: "Up",
  D: "Down",
  F: "Front",
  B: "Back",
  R: "Right",
  L: "Left",
};

/** Create an empty cube state (only centers painted) */
function createEmptyFaces() {
  const faces = {};
  for (const face of FACE_ORDER) {
    faces[face] = [
      ["unknown", "unknown", "unknown"],
      ["unknown", face, "unknown"],
      ["unknown", "unknown", "unknown"],
    ];
  }
  return faces;
}

/** Build reverse mapping: hex color → face letter */
function buildReverseMapping(colorMapping) {
  const reverse = {};
  for (const [face, color] of Object.entries(colorMapping)) {
    reverse[color.toUpperCase()] = face;
  }
  return reverse;
}

/** Convert face notation to Kociemba string */
function toKociembaString(faces) {
  const parts = [];
  for (const face of FACE_ORDER) {
    const grid = faces[face];
    if (!grid) return "";
    for (const row of grid) {
      for (const cell of row) {
        parts.push(cell);
      }
    }
  }
  return parts.join("");
}

/** Convert Kociemba string to face notation */
function fromKociembaString(cubeString) {
  if (!cubeString || cubeString.length !== 54) return createEmptyFaces();
  const faces = {};
  let i = 0;
  for (const face of FACE_ORDER) {
    faces[face] = [
      [cubeString[i], cubeString[i+1], cubeString[i+2]],
      [cubeString[i+3], cubeString[i+4], cubeString[i+5]],
      [cubeString[i+6], cubeString[i+7], cubeString[i+8]],
    ];
    i += 9;
  }
  return faces;
}

/** Get sticker counts per face letter */
function countStickers(faces) {
  const counts = { U: 0, R: 0, F: 0, D: 0, L: 0, B: 0 };
  for (const face of FACE_ORDER) {
    if (!faces[face]) continue;
    for (const row of faces[face]) {
      for (const cell of row) {
        if (counts[cell] !== undefined) counts[cell]++;
      }
    }
  }
  return counts;
}

/** Get palette as array for frontend */
function getPaletteList(colorMapping) {
  return FACE_ORDER.map((face) => ({
    face,
    color: colorMapping[face],
    label: `${FACE_LABELS[face]} (${face})`,
  }));
}

export const useCubeStore = create((set, get) => ({
  // ─── State ─────────────────────────────────────────
  faces: createEmptyFaces(),
  colorMapping: { ...DEFAULT_COLOR_MAPPING },
  reverseMapping: buildReverseMapping(DEFAULT_COLOR_MAPPING),
  activeColor: "U",
  isColorMappingSet: false,

  // Solve state
  solution: null,
  syntheticSolveTime: null,
  isSolving: false,
  isValidated: false,
  validationErrors: [],
  validationWarnings: [],
  source: null,

  // Scan state
  scanStep: 0, // 0-5 for each face
  scannedFaces: {},
  scanProgress: [],

  // ─── Color Mapping ─────────────────────────────────
  setColorMapping: (mapping) =>
    set({
      colorMapping: mapping,
      reverseMapping: buildReverseMapping(mapping),
      isColorMappingSet: true,
    }),

  setColorForFace: (face, color) =>
    set((state) => {
      const newMapping = { ...state.colorMapping, [face]: color };
      return {
        colorMapping: newMapping,
        reverseMapping: buildReverseMapping(newMapping),
      };
    }),

  // ─── Face Editing ──────────────────────────────────
  setFaces: (faces) =>
    set({
      faces,
      isValidated: false,
      validationErrors: [],
    }),

  loadKociembaString: (cubeString) =>
    set({
      faces: fromKociembaString(cubeString),
      isValidated: false,
      validationErrors: [],
    }),

  setSticker: (face, row, col, value) =>
    set((state) => {
      // Don't change centers
      if (row === 1 && col === 1) return state;

      const newFaces = { ...state.faces };
      newFaces[face] = state.faces[face].map((r, ri) =>
        r.map((c, ci) => (ri === row && ci === col ? value : c))
      );

      return {
        faces: newFaces,
        isValidated: false,
        validationErrors: [],
      };
    }),

  paintSticker: (face, row, col) =>
    set((state) => {
      if (row === 1 && col === 1) return state;

      const newFaces = { ...state.faces };
      newFaces[face] = state.faces[face].map((r, ri) =>
        r.map((c, ci) => (ri === row && ci === col ? state.activeColor : c))
      );

      return {
        faces: newFaces,
        isValidated: false,
        validationErrors: [],
      };
    }),

  setActiveColor: (color) => set({ activeColor: color }),

  // ─── Conversion ────────────────────────────────────
  colorToFace: (hexColor) => {
    const state = get();
    return state.reverseMapping[hexColor.toUpperCase()] || "?";
  },

  faceToColor: (face) => {
    const state = get();
    return state.colorMapping[face] || "#000000";
  },

  // ─── Computed ──────────────────────────────────────
  getKociembaString: () => {
    const state = get();
    return toKociembaString(state.faces);
  },

  getStickerCounts: () => {
    const state = get();
    return countStickers(state.faces);
  },

  getPalette: () => {
    const state = get();
    return getPaletteList(state.colorMapping);
  },

  isCountsValid: () => {
    const counts = get().getStickerCounts();
    return FACE_ORDER.every((f) => counts[f] === 9);
  },

  // ─── Validation ────────────────────────────────────
  setValidation: (isValid, errors = [], warnings = []) =>
    set({
      isValidated: isValid,
      validationErrors: errors,
      validationWarnings: warnings,
    }),

  // ─── Solution ──────────────────────────────────────
  setSolution: (solution) => set({ solution }),
  setSyntheticSolveTime: (time) => set({ syntheticSolveTime: time }),
  setIsSolving: (val) => set({ isSolving: val }),
  setSource: (source) => set({ source }),

  // ─── Scan State ────────────────────────────────────
  setScanStep: (step) => set({ scanStep: step }),
  addScannedFace: (face, grid) =>
    set((state) => ({
      scannedFaces: { ...state.scannedFaces, [face]: grid },
      scanProgress: [...new Set([...state.scanProgress, face])],
    })),

  // ─── Reset ─────────────────────────────────────────
  reset: () =>
    set({
      faces: createEmptyFaces(),
      activeColor: "U",
      isValidated: false,
      validationErrors: [],
      validationWarnings: [],
      solution: null,
      syntheticSolveTime: null,
      isSolving: false,
    }),

  resetAll: () =>
    set({
      faces: createEmptyFaces(),
      colorMapping: { ...DEFAULT_COLOR_MAPPING },
      reverseMapping: buildReverseMapping(DEFAULT_COLOR_MAPPING),
      activeColor: "U",
      isColorMappingSet: false,
      isValidated: false,
      validationErrors: [],
      validationWarnings: [],
      solution: null,
      syntheticSolveTime: null,
      isSolving: false,
      scanStep: 0,
      scannedFaces: {},
      scanProgress: [],
    }),
}));
