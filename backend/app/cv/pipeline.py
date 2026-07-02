"""
CubeVision AI — Computer Vision Pipeline

Simplified and robust pipeline for exact color preservation.
Prioritizes center-cropping and raw color metrics over aggressive preprocessing.
"""

from numpy.ma import masked
import cv2
import hashlib
import json
import time
import os
import contextlib
import numpy as np
from collections import deque
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple


# ═══════════════════════════════════════════════════════════════════
#  Debug Configuration
# ═══════════════════════════════════════════════════════════════════

DEBUG_MODE = True
DEBUG_FRAME = 500


@dataclass
class DebugState:
    """Tracks state per session so we only trigger debug output periodically."""
    last_debug_time: float = 0.0
    frame_counter: int = 0
    palette_logged: bool = False
    frontend_debug_info: Optional[Dict] = None


# ═══════════════════════════════════════════════════════════════════
#  Configuration
# ═══════════════════════════════════════════════════════════════════

@dataclass
class PipelineConfig:
    """All tunable CV parameters in one place."""

    # ── Cropping & Preprocessing ─────────────────────────────────
    center_crop_ratio: float = 0.55  # Crop the center 55% of the patch
    median_blur_ksize: int = 3       # Lightweight blur, 0 to disable

    # ── Dynamic HSV Classification ───────────────────────────────
    hue_tolerance: int = 15
    saturation_tolerance: int = 120
    value_tolerance: int = 120
    white_saturation_offset: int = 40
    white_value_offset: int = 40
    min_valid_pixels: int = 15
    min_confidence_threshold: float = 0.6
    morph_kernel_size: int = 3

    # ── Palette validation ───────────────────────────────────────
    de_threshold_poor: float = 30.0
    de_threshold_acceptable: float = 45.0
    hue_threshold_poor: float = 18.0

    # ── Temporal smoothing ───────────────────────────────────────
    temporal_window: int = 8        # rolling history length
    temporal_majority_weight: float = 0.65  # fraction of weighted sum required for stability

    # ── Upload / perspective warp ────────────────────────────────
    warp_size: int = 300            # warped face is warp_size × warp_size
    sticker_margin_ratio: float = 0.22  # margin inside each cell


DEFAULT_CONFIG = PipelineConfig()


# ═══════════════════════════════════════════════════════════════════
#  Color-Space Utilities
# ═══════════════════════════════════════════════════════════════════

def hex_to_rgb(hex_code: str) -> Tuple[int, int, int]:
    h = hex_code.lstrip("#")
    if len(h) != 6:
        raise ValueError(f"Invalid hex color: {hex_code}")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))

def hex_to_lab(hex_code: str) -> np.ndarray:
    """Convert a '#RRGGBB' hex string to CIE LAB (float64, properly scaled)."""
    r, g, b = hex_to_rgb(hex_code)
    bgr = np.array([[[b, g, r]]], dtype=np.uint8)
    lab_cv = cv2.cvtColor(bgr, cv2.COLOR_BGR2LAB)[0, 0]
    L = lab_cv[0] * (100.0 / 255.0)
    a = lab_cv[1] - 128.0
    b_val = lab_cv[2] - 128.0
    return np.array([L, a, b_val], dtype=np.float64)


def delta_e_76(lab1: np.ndarray, lab2: np.ndarray) -> float:
    """Euclidean distance in CIE LAB (ΔE76)."""
    return float(np.linalg.norm(lab1 - lab2))


# ═══════════════════════════════════════════════════════════════════
#  Palette Helpers
# ═══════════════════════════════════════════════════════════════════

def convert_palette_to_lab(palette_hex: Dict[str, str]) -> Dict[str, np.ndarray]:
    """Convert a hex palette dict to LAB palette dict."""
    return {face: hex_to_lab(hex_code) for face, hex_code in palette_hex.items()}


def _palette_hash(palette_hex: Dict[str, str]) -> str:
    """Deterministic hash of a palette for caching."""
    canonical = json.dumps(palette_hex, sort_keys=True)
    return hashlib.md5(canonical.encode()).hexdigest()


def generate_hsv_ranges(palette_hex: Dict[str, str], palette_labs: Dict[str, np.ndarray], config: PipelineConfig) -> Tuple[Dict[str, List[Tuple[np.ndarray, np.ndarray]]], str, Dict[str, Tuple[int, int, int]]]:
    """Generate dynamic HSV boundaries for each calibrated color, handling Hue wrap-around."""
    ranges = {}
    base_hsvs = {}
    
    # Identify the white face (closest to ideal white in LAB space)
    ideal_white_lab = np.array([100.0, 0.0, 0.0])
    white_face = min(palette_labs, key=lambda f: delta_e_76(palette_labs[f], ideal_white_lab))
    
    # We first need to compute base HSV for all faces
    for face, hex_code in palette_hex.items():
        r, g, b = hex_to_rgb(hex_code)
        bgr_uint8 = np.array([[[b, g, r]]], dtype=np.uint8)
        hsv_cv = cv2.cvtColor(bgr_uint8, cv2.COLOR_BGR2HSV)[0, 0]
        h, s, v = int(hsv_cv[0]), int(hsv_cv[1]), int(hsv_cv[2])
        base_hsvs[face] = (h, s, v)
        
    red_face = min([f for f in base_hsvs if f != white_face], key=lambda f: min(base_hsvs[f][0], 180 - base_hsvs[f][0]))
    
    for face, hex_code in palette_hex.items():
        h, s, v = base_hsvs[face]
        
        if face == white_face:
            # White: low saturation, high value. Hue is ignored.
            s_max = min(255, s + config.white_saturation_offset)
            v_min = max(0, v - config.white_value_offset)
            lower = np.array([0, 0, v_min], dtype=np.uint8)
            upper = np.array([179, s_max, 255], dtype=np.uint8)
            ranges[face] = [(lower, upper)]
        else:
            h_tol = config.hue_tolerance
            if 45 <= h <= 85: h_tol = 18 # Green
            elif 90 <= h <= 140: h_tol = 18 # Blue
            elif 25 <= h <= 45: h_tol = 18 # Yellow
            elif 10 < h < 25: h_tol = 15 # Orange
            elif (0 <= h <= 10) or (160 <= h <= 179): h_tol = 15 # Red
                
            is_red = (face == red_face)
            
            s_min = max(0, s - config.saturation_tolerance)
            s_max = min(255, s + config.saturation_tolerance)
            v_min = max(0, v - config.value_tolerance)
            v_max = min(255, v + config.value_tolerance)
            
            h_min = h - h_tol
            h_max = h + h_tol
            
            if is_red:
                if h_min < 0:
                    lower1 = np.array([0, s_min, v_min], dtype=np.uint8)
                    upper1 = np.array([h_max, s_max, v_max], dtype=np.uint8)
                    lower2 = np.array([180 + h_min, s_min, v_min], dtype=np.uint8)
                    upper2 = np.array([179, s_max, v_max], dtype=np.uint8)
                    ranges[face] = [(lower1, upper1), (lower2, upper2)]
                elif h_max > 179:
                    lower1 = np.array([h_min, s_min, v_min], dtype=np.uint8)
                    upper1 = np.array([179, s_max, v_max], dtype=np.uint8)
                    lower2 = np.array([0, s_min, v_min], dtype=np.uint8)
                    upper2 = np.array([h_max - 180, s_max, v_max], dtype=np.uint8)
                    ranges[face] = [(lower1, upper1), (lower2, upper2)]
                else:
                    lower = np.array([h_min, s_min, v_min], dtype=np.uint8)
                    upper = np.array([h_max, s_max, v_max], dtype=np.uint8)
                    ranges[face] = [(lower, upper)]
            else:
                h_min = max(0, h_min)
                h_max = min(179, h_max)
                lower = np.array([h_min, s_min, v_min], dtype=np.uint8)
                upper = np.array([h_max, s_max, v_max], dtype=np.uint8)
                ranges[face] = [(lower, upper)]
                
    # Validate Ranges
    for face, face_ranges in ranges.items():
        for (lower, upper) in face_ranges:
            if lower[0] > upper[0] or lower[1] > upper[1] or lower[2] > upper[2]:
                raise ValueError(f"Invalid HSV range generated for face {face}: {lower} -> {upper}")

    # Overlap Detection
    faces = list(ranges.keys())
    face_names = {"U": "WHITE", "D": "YELLOW", "F": "GREEN", "B": "BLUE", "R": "RED", "L": "ORANGE"}
    for i in range(len(faces)):
        for j in range(i + 1, len(faces)):
            f1, f2 = faces[i], faces[j]
            if f1 == white_face or f2 == white_face:
                continue
                
            for r1 in ranges[f1]:
                for r2 in ranges[f2]:
                    # Extract Hue ranges
                    h1_min, h1_max = int(r1[0][0]), int(r1[1][0])
                    h2_min, h2_max = int(r2[0][0]), int(r2[1][0])
                    
                    overlap_min = max(h1_min, h2_min)
                    overlap_max = min(h1_max, h2_max)
                    
                    if overlap_min <= overlap_max:
                        width = overlap_max - overlap_min
                        n1, n2 = face_names.get(f1, f1), face_names.get(f2, f2)
                        print(f"WARNING: {n1} overlaps {n2}")
                        print(f"Overlap H : {overlap_min}-{overlap_max}")
                        print(f"Overlap Width : {width}°\n")

    return ranges, white_face, base_hsvs


class PaletteCache:
    """Caches the HEX → LAB conversion and HSV ranges so it is not repeated every frame."""

    def __init__(self, config: PipelineConfig = DEFAULT_CONFIG) -> None:
        self._hash: Optional[str] = None
        self._config = config
        self._labs: Dict[str, np.ndarray] = {}
        self._hsv_ranges: Dict[str, List[Tuple[np.ndarray, np.ndarray]]] = {}
        self._white_face: str = ""
        self._base_hsvs: Dict[str, Tuple[int, int, int]] = {}

    def get(self, palette_hex: Dict[str, str]) -> Tuple[Dict[str, np.ndarray], Dict[str, List[Tuple[np.ndarray, np.ndarray]]], str, Dict[str, Tuple[int, int, int]]]:
        """Return cached LAB palette and HSV ranges."""
        h = _palette_hash(palette_hex)
        if h != self._hash:
            self._labs = convert_palette_to_lab(palette_hex)
            self._hsv_ranges, self._white_face, self._base_hsvs = generate_hsv_ranges(palette_hex, self._labs, self._config)
            self._hash = h
        return self._labs, self._hsv_ranges, self._white_face, self._base_hsvs


# ═══════════════════════════════════════════════════════════════════
#  Palette Validation
# ═══════════════════════════════════════════════════════════════════

def validate_palette(
    palette: Dict[str, str],
    config: PipelineConfig = DEFAULT_CONFIG,
) -> Dict:
    """Validate whether the six user-selected colours are suitable for CV."""
    FACE_LABELS = {"U": "Up", "D": "Down", "F": "Front", "B": "Back", "R": "Right", "L": "Left"}

    if not palette or len(palette) != 6:
        return {
            "success": False, "status": "POOR",
            "message": "Exactly six colours must be provided.",
            "minimum_distance": 0.0, "average_distance": 0.0,
            "distances": {}, "warnings": ["Expected exactly 6 colours."],
        }

    if len(set(palette.values())) != 6:
        return {
            "success": False, "status": "POOR",
            "message": "Duplicate colours detected.",
            "minimum_distance": 0.0, "average_distance": 0.0,
            "distances": {}, "warnings": ["Two or more faces share the same colour."],
        }

    try:
        labs = convert_palette_to_lab(palette)
    except ValueError as e:
        return {
            "success": False, "status": "POOR",
            "message": str(e),
            "minimum_distance": 0.0, "average_distance": 0.0,
            "distances": {}, "warnings": [str(e)],
        }
        
    # Get HSV representations for hue checking
    hsvs: Dict[str, Tuple[float, float, float]] = {}
    for face, hex_code in palette.items():
        r, g, b = hex_to_rgb(hex_code)
        bgr = np.array([[[b, g, r]]], dtype=np.uint8)
        hsv = cv2.cvtColor(bgr, cv2.COLOR_BGR2HSV)[0, 0]
        hsvs[face] = (float(hsv[0]), float(hsv[1]), float(hsv[2]))

    faces = list(labs.keys())
    min_dist_lab = float("inf")
    worst_pair_lab = None
    min_dist_hue = float("inf")
    
    warnings = []

    for i in range(len(faces)):
        for j in range(i + 1, len(faces)):
            f1, f2 = faces[i], faces[j]
            d_lab = delta_e_76(labs[f1], labs[f2])
            
            # OpenCV hue is 0-179, multiply by 2 for degrees
            h1 = hsvs[f1][0] * 2
            h2 = hsvs[f2][0] * 2
            d_hue = min(abs(h1 - h2), 360 - abs(h1 - h2))
            
            if d_lab < min_dist_lab:
                min_dist_lab = d_lab
                worst_pair_lab = (f1, f2)
                min_dist_hue = d_hue
                
            # Warnings based on common confusing pairs
            label1 = FACE_LABELS.get(f1, f1)
            label2 = FACE_LABELS.get(f2, f2)
            if (f1 == 'L' and f2 == 'R') or (f1 == 'R' and f2 == 'L'):
                if d_hue < 20: warnings.append(f"Warning: Orange and Red are very close (Hue diff: {d_hue:.1f}°)")
            if (f1 == 'U' and f2 == 'D') or (f1 == 'D' and f2 == 'U'):
                if d_lab < 35: warnings.append(f"Warning: White and Yellow are very close in brightness (LAB diff: {d_lab:.1f})")
            if (f1 == 'F' and f2 == 'D') or (f1 == 'D' and f2 == 'F'):
                if d_hue < 25: warnings.append(f"Warning: Green and Yellow are very close (Hue diff: {d_hue:.1f}°)")

    worst_l1 = FACE_LABELS.get(worst_pair_lab[0], worst_pair_lab[0])
    worst_l2 = FACE_LABELS.get(worst_pair_lab[1], worst_pair_lab[1])
    
    if min_dist_lab < config.de_threshold_poor or min_dist_hue < config.hue_threshold_poor:
        status = "POOR"
        suffix = "Colors are too similar for reliable detection. Please select more distinct shades."
    elif min_dist_lab < config.de_threshold_acceptable:
        status = "ACCEPTABLE"
        suffix = "Detection should work, but some colors are relatively close."
    else:
        status = "GOOD"
        suffix = "This palette is suitable for robust webcam detection."

    message = (
        f"Closest Pair: {worst_l1} ↔ {worst_l2}\n"
        f"LAB Distance: {min_dist_lab:.1f}\n"
        f"Hue Difference: {min_dist_hue:.1f}°\n\n"
        f"{suffix}"
    )
    if warnings:
        message += "\n\n" + "\n".join(warnings)

    return {
        "success": True,
        "status": status,
        "message": message,
        "minimum_distance": round(min_dist_lab, 1),
        "average_distance": 0.0,
        "distances": {},
        "warnings": warnings,
    }


# ═══════════════════════════════════════════════════════════════════
#  Patch Cropping
# ═══════════════════════════════════════════════════════════════════

def crop_patches(
    frame: np.ndarray,
    overlay_coords: List[List[int]],
) -> List[np.ndarray]:
    """Crop 9 sticker regions from a BGR frame using overlay coordinates."""
    if len(overlay_coords) != 9:
        raise ValueError(f"Expected 9 coordinate regions, got {len(overlay_coords)}.")

    h_img, w_img = frame.shape[:2]
    patches: List[np.ndarray] = []

    for (x, y, w, h) in overlay_coords:
        x1 = max(0, int(x))
        y1 = max(0, int(y))
        x2 = min(w_img, int(x + w))
        y2 = min(h_img, int(y + h))

        patch = frame[y1:y2, x1:x2]
        if patch.size == 0:
            patch = np.zeros((10, 10, 3), dtype=np.uint8)
        patches.append(patch)

    return patches

def _crop_center(patch: np.ndarray, config: PipelineConfig = DEFAULT_CONFIG) -> np.ndarray:
    """Crops the central region of the patch to exclude borders and shadows."""
    h, w = patch.shape[:2]
    ratio = config.center_crop_ratio
    
    new_h = int(h * ratio)
    new_w = int(w * ratio)
    
    start_y = (h - new_h) // 2
    start_x = (w - new_w) // 2
    
    center_patch = patch[start_y:start_y + new_h, start_x:start_x + new_w]
    if center_patch.size == 0:
        return np.zeros((5, 5, 3), dtype=np.uint8)
    return center_patch


# ═══════════════════════════════════════════════════════════════════
#  Patch Preprocessing
# ═══════════════════════════════════════════════════════════════════

def preprocess_patch(
    patch: np.ndarray,
    config: PipelineConfig = DEFAULT_CONFIG,
    patch_idx: int = 0,
    is_debug_frame: bool = False,
    debug_dir: str = "",
) -> Tuple[np.ndarray, np.ndarray, np.ndarray, Dict]:
    """Simplified preprocessing pipeline for a single center-cropped sticker patch.
    Returns:
        (bgr_patch, hsv_patch, validity_mask, prep_stats)
    """
    stats = {}
    
    t0 = time.perf_counter()
    if config.median_blur_ksize > 0:
        p = cv2.medianBlur(patch, config.median_blur_ksize)
    else:
        p = patch.copy()
    stats["Median Blur"] = (time.perf_counter() - t0) * 1000
    
    t0 = time.perf_counter()
    hsv = cv2.cvtColor(p, cv2.COLOR_BGR2HSV)
    stats["HSV Conversion"] = (time.perf_counter() - t0) * 1000
    
    # No more validity mask. All pixels are valid.
    mask = np.ones(hsv.shape[:2], dtype=np.uint8) * 255
    stats["Validity Mask"] = 0.0
    
    if is_debug_frame and debug_dir:
        patch_dir = os.path.join(debug_dir, f"patch_{patch_idx}")
        os.makedirs(patch_dir, exist_ok=True)
        cv2.imwrite(os.path.join(patch_dir, f"patch_{patch_idx}_original.jpg"), patch)
        cv2.imwrite(os.path.join(patch_dir, f"patch_{patch_idx}_hsv.jpg"), hsv)
    
    return p, hsv, mask, stats


# ═══════════════════════════════════════════════════════════════════
#  Representative Colour (Median)
# ═══════════════════════════════════════════════════════════════════

def representative_color(
    bgr_patch: np.ndarray,
    hsv_patch: np.ndarray,
    mask: np.ndarray,
) -> Dict[str, np.ndarray]:
    """Compute the Median BGR of the valid pixels, then convert directly to LAB."""
    valid_pixels = bgr_patch[mask > 0]
    valid_hsv = hsv_patch[mask > 0]

    # Handle case where no pixels survived masking
    if len(valid_pixels) == 0:
        return {
            "bgr": np.zeros(3, dtype=np.float64),
            "hsv": np.zeros(3, dtype=np.float64),
            "hsv_min": np.zeros(3, dtype=np.float64),
            "hsv_max": np.zeros(3, dtype=np.float64),
            "lab": np.zeros(3, dtype=np.float64),
            "valid_pixels": 0
        }

    # Simple median is robust to noise and slight glare/shadow variation
    bgr_med = np.median(valid_pixels, axis=0).astype(np.float64)
    
    hsv_min = np.min(valid_hsv, axis=0)
    hsv_max = np.max(valid_hsv, axis=0)
    hsv_med = np.median(valid_hsv, axis=0).astype(np.float64)
    
    # Convert BGR float to LAB float
    # We create a 1x1 uint8 image to use OpenCV's conversion, then scale correctly
    bgr_uint8 = np.array([[[int(bgr_med[0]), int(bgr_med[1]), int(bgr_med[2])]]], dtype=np.uint8)
    
    lab_cv = cv2.cvtColor(bgr_uint8, cv2.COLOR_BGR2LAB)[0, 0]
    L = lab_cv[0] * (100.0 / 255.0)
    a = lab_cv[1] - 128.0
    b = lab_cv[2] - 128.0
    lab_float = np.array([L, a, b], dtype=np.float64)

    return {
        "bgr": bgr_med,
        "hsv": hsv_med,
        "hsv_min": hsv_min,
        "hsv_max": hsv_max,
        "lab": lab_float,
        "valid_pixels": len(valid_pixels)
    }


# ═══════════════════════════════════════════════════════════════════
#  Classification
# ═══════════════════════════════════════════════════════════════════

def classify_patch_hsv(
    bgr_patch: np.ndarray,
    hsv_patch: np.ndarray,
    glare_mask: np.ndarray,
    hsv_ranges: Dict[str, List[Tuple[np.ndarray, np.ndarray]]],
    white_face: str,
    palette_labs: Dict[str, np.ndarray],
    base_hsvs: Dict[str, Tuple[int, int, int]],
    config: PipelineConfig = DEFAULT_CONFIG,
    patch_idx: int = 0,
    is_debug_frame: bool = False,
    debug_dir: str = "",
    raw_patch: Optional[np.ndarray] = None,
    center_patch: Optional[np.ndarray] = None,
) -> Dict:
    """Classify a sticker using dynamic HSV segmentation, morphological cleanup, and LAB tie-breaking."""
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (config.morph_kernel_size, config.morph_kernel_size))
    
    pixel_counts = {}
    face_masks = {}

    rep = representative_color(bgr_patch, hsv_patch, glare_mask)
    rep_hsv = rep['hsv']
    h, s, v = int(rep_hsv[0]), int(rep_hsv[1]), int(rep_hsv[2])

    if is_debug_frame:
        print("\n" + "=" * 70)
        print(f"PATCH {patch_idx}")
        print("=" * 70)
        print("\nRepresentative Colour")
        print("-" * 21)
        if rep["valid_pixels"] == 0:
            print("No valid pixels after masking.")
        else:
            print(f"Median BGR : ({int(rep['bgr'][0])}, {int(rep['bgr'][1])}, {int(rep['bgr'][2])})")
            print(f"Median HSV : ({int(rep['hsv'][0])}, {int(rep['hsv'][1])}, {int(rep['hsv'][2])})")
            print(f"Minimum HSV : ({int(rep['hsv_min'][0])}, {int(rep['hsv_min'][1])}, {int(rep['hsv_min'][2])})")
            print(f"Maximum HSV : ({int(rep['hsv_max'][0])}, {int(rep['hsv_max'][1])}, {int(rep['hsv_max'][2])})")
            print(f"Median LAB : ({int(rep['lab'][0])}, {int(rep['lab'][1])}, {int(rep['lab'][2])})")
            
        print("\nHue Histogram (Valid Pixels)")
        print("-" * 28)
        valid_hsv = hsv_patch[glare_mask > 0]
        if len(valid_hsv) > 0:
            valid_hues = valid_hsv[:, 0]
            for i in range(0, 180, 10):
                count = np.sum((valid_hues >= i) & (valid_hues < i + 10))
                if count > 0:
                    print(f"{i:3d} - {i+10:<3d} : {count} pixels")
        else:
            print("No valid pixels to histogram.")
        print("")

    if rep["valid_pixels"] == 0:
        if is_debug_frame:
            print("No valid pixels remained after preprocessing. Classification failed.")
        return {
            "face": "U",
            "confidence": 0.0,
            "reason": "No valid pixels after preprocessing",
            "classification_failed": True
        }

    face_names = {"U": "WHITE", "D": "YELLOW", "F": "GREEN", "B": "BLUE", "R": "RED", "L": "ORANGE"}

    patch_dir = os.path.join(debug_dir, f"patch_{patch_idx}") if is_debug_frame else ""
    if is_debug_frame and patch_dir:
        os.makedirs(patch_dir, exist_ok=True)
        if raw_patch is not None:
            cv2.imwrite(os.path.join(debug_dir, f"patch_{patch_idx}_raw.jpg"), raw_patch)
        if center_patch is not None:
            cv2.imwrite(os.path.join(debug_dir, f"patch_{patch_idx}_center.jpg"), center_patch)
        cv2.imwrite(os.path.join(debug_dir, f"patch_{patch_idx}_processed.jpg"), bgr_patch)
        
    mask_imgs = {}

    for face, ranges in hsv_ranges.items():
        name = face_names.get(face, face)
        if is_debug_frame:
            print("-" * 42)
            print(f"{name}")
            print("-" * 42)
            print("\nGenerated HSV Range(s)")
            for i, (lower, upper) in enumerate(ranges):
                print(f"\nRange {i+1}")
                print(f"H : {lower[0]}–{upper[0]}")
                print(f"S : {lower[1]}–{upper[1]}")
                print(f"V : {lower[2]}–{upper[2]}")

            h_pass, s_pass, v_pass = False, False, False
            for (lower, upper) in ranges:
                if lower[0] <= h <= upper[0]: h_pass = True
                if lower[1] <= s <= upper[1]: s_pass = True
                if lower[2] <= v <= upper[2]: v_pass = True
            
            if len(ranges) == 1 and ranges[0][0][0] == 0 and ranges[0][1][0] == 179:
                h_pass = True 
                
            print(f"\nHue {'PASS' if h_pass else 'FAIL'}")
            print(f"Saturation {'PASS' if s_pass else 'FAIL'}")
            print(f"Value {'PASS' if v_pass else 'FAIL'}")
            print(f"Overall {'PASS' if (h_pass and s_pass and v_pass) else 'FAIL'}\n")

        face_mask = np.zeros(hsv_patch.shape[:2], dtype=np.uint8)
        pixels_after_inrange = 0
        pixels_after_or = 0
        
        for (lower, upper) in ranges:
            m = cv2.inRange(hsv_patch, lower, upper)
            pixels_after_inrange = int(np.sum(m > 0))
            face_mask = cv2.bitwise_or(face_mask, m)
            
        pixels_after_or = int(np.sum(face_mask > 0))

        # Morphological Cleanup
        pixels_after_open = pixels_after_or
        pixels_after_close = pixels_after_or
        if config.morph_kernel_size > 0:
            face_mask = cv2.morphologyEx(face_mask, cv2.MORPH_OPEN, kernel)
            pixels_after_open = int(np.sum(face_mask > 0))
            face_mask = cv2.morphologyEx(face_mask, cv2.MORPH_CLOSE, kernel)
            pixels_after_close = int(np.sum(face_mask > 0))
            
        # Apply the glare/shadow mask
        face_mask = cv2.bitwise_and(face_mask, glare_mask)
        pixels_after_glare = int(np.sum(face_mask > 0))
        
        white_rejected = False
        white_reason = ""
        white_a = 0.0
        white_b = 0.0
        
        # Secondary check for white (a and b should be near 0 in LAB space)
        if face == white_face:
            white_pixels = bgr_patch[face_mask > 0]
            if len(white_pixels) > 0:
                bgr_mean = np.mean(white_pixels, axis=0)
                bgr_uint8 = np.array([[[int(bgr_mean[0]), int(bgr_mean[1]), int(bgr_mean[2])]]], dtype=np.uint8)
                lab_cv = cv2.cvtColor(bgr_uint8, cv2.COLOR_BGR2LAB)[0, 0]
                white_a = lab_cv[1] - 128.0
                white_b = lab_cv[2] - 128.0
                if abs(white_a) > 20 or abs(white_b) > 20:
                    face_mask[:] = 0 # Not neutral enough to be white
                    white_rejected = True
                    white_reason = "Not neutral enough."
                    pixels_after_glare = 0

        count = int(np.sum(face_mask > 0))
        pixel_counts[face] = count
        face_masks[face] = face_mask
        
        if is_debug_frame:
            print(f"Pixels after inRange : {pixels_after_inrange}")
            print(f"Pixels after OR : {pixels_after_or}")
            print(f"Pixels after Morph OPEN : {pixels_after_open}")
            print(f"Pixels after Morph CLOSE : {pixels_after_close}")
            print(f"Pixels after Validity Mask : {pixels_after_glare}")
            print(f"Final Pixel Count : {count}")
            
            if face == white_face:
                print("\nWhite Neutral Check")
                print(f"a = {white_a:.1f}")
                print(f"b = {white_b:.1f}")
                if white_rejected:
                    print("White rejected")
                    print(f"Reason: {white_reason}")
                else:
                    print("PASS")
                    
            # Save individual mask
            mask_bgr = cv2.cvtColor(face_mask, cv2.COLOR_GRAY2BGR)
            cv2.putText(mask_bgr, name, (5, 15), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (0, 255, 0), 1)
            mask_imgs[face] = mask_bgr
            cv2.imwrite(os.path.join(patch_dir, f"{name.lower()}_mask.png"), face_mask)

    if is_debug_frame and mask_imgs:
        face_order = ["U", "D", "F", "B", "L", "R"]
        ordered_masks = [mask_imgs.get(f, np.zeros_like(bgr_patch)) for f in face_order]
        row1 = np.hstack(ordered_masks[0:3])
        row2 = np.hstack(ordered_masks[3:6])
        collage = np.vstack([row1, row2])
        cv2.imwrite(os.path.join(debug_dir, f"patch_{patch_idx}_masks.jpg"), collage)

    sorted_faces = sorted(pixel_counts.keys(), key=lambda f: pixel_counts[f], reverse=True)
    winner = sorted_faces[0]
    runner_up = sorted_faces[1]
    
    winner_pixels = pixel_counts[winner]
    runner_up_pixels = pixel_counts[runner_up]
    
    dists = {f: delta_e_76(rep["lab"], ref) for f, ref in palette_labs.items()}
    sorted_lab = sorted(dists, key=dists.get)
    
    confidence = winner_pixels / (winner_pixels + runner_up_pixels + 1e-6)
    reason = "Dominant HSV mask."
    
    tie_detected = False
    if winner_pixels > 0 and (winner_pixels == runner_up_pixels or ((winner_pixels - runner_up_pixels) / winner_pixels < 0.05)):
        tie_detected = True
        
    d_winner = 0.0
    d_runner = 0.0
    d_hue_w = 0.0
    d_hue_r = 0.0
    
    orig_winner = winner
    orig_runner = runner_up
    
    if winner_pixels < config.min_valid_pixels:
        # Fallback to LAB if all HSV masks fail
        winner = sorted_lab[0]
        runner_up = sorted_lab[1]
        reason = "HSV masks failed. LAB Fallback used."
        confidence = 0.5
        tie_detected = False
    elif tie_detected:
        reason = "LAB Tie Break"
        d_winner = dists[orig_winner]
        d_runner = dists[orig_runner]
        
        if abs(d_winner - d_runner) < 3.0:
            reason = "Hue Tie Break"
            patch_hue = rep_hsv[0] * 2
            w_calib_hue = base_hsvs[orig_winner][0] * 2
            r_calib_hue = base_hsvs[orig_runner][0] * 2
            
            d_hue_w = min(abs(patch_hue - w_calib_hue), 360 - abs(patch_hue - w_calib_hue))
            d_hue_r = min(abs(patch_hue - r_calib_hue), 360 - abs(patch_hue - r_calib_hue))
            
            if d_hue_r < d_hue_w:
                winner, runner_up = orig_runner, orig_winner
        else:
            if d_runner < d_winner:
                winner, runner_up = orig_runner, orig_winner
                
    if is_debug_frame:
        print("\n------------------------------------------")
        print("FINAL PIXEL COUNTS")
        print("------------------------------------------")
        for f in ["U", "D", "F", "B", "R", "L"]:
            if f in pixel_counts:
                print(f"{face_names.get(f, f)} : {pixel_counts[f]}")
            
        print(f"\nTop Two")
        print(f"Winner : {face_names.get(orig_winner, orig_winner)}")
        print(f"Runner : {face_names.get(orig_runner, orig_runner)}")
        print(f"Tie ? {'YES' if tie_detected else 'NO'}")
        
        if tie_detected:
            print(f"\nLAB")
            print(f"{face_names.get(orig_winner, orig_winner)} : {d_winner:.1f}")
            print(f"{face_names.get(orig_runner, orig_runner)} : {d_runner:.1f}")
            
            if abs(d_winner - d_runner) < 3.0:
                print(f"\nHue Distance")
                print(f"{face_names.get(orig_winner, orig_winner)} : {d_hue_w:.1f}°")
                print(f"{face_names.get(orig_runner, orig_runner)} : {d_hue_r:.1f}°")
                
            print(f"\nFinal Winner : {face_names.get(winner, winner)}")
            print(f"Reason : {reason}")
        else:
            print(f"\nFinal Winner : {face_names.get(winner, winner)}")
            print(f"Reason : {reason}")

    return {
        "face": winner,
        "runner_up": runner_up,
        "confidence": min(1.0, confidence),
        "pixel_counts": pixel_counts,
        "face_masks": face_masks,
        "reason": reason
    }


# ═══════════════════════════════════════════════════════════════════
#  Temporal Smoothing (Weighted Voting)
# ═══════════════════════════════════════════════════════════════════

@dataclass
class _StickerFrame:
    """One temporal observation for a single sticker."""
    face: str
    confidence: float
    timestamp: float


class TemporalSmoother:
    """Per-sticker rolling-window weighted majority-vote stabilisation.
    Stability is determined exclusively by majority vote, disregarding confidence.
    """

    def __init__(self, config: PipelineConfig = DEFAULT_CONFIG) -> None:
        self.window = config.temporal_window
        self.majority_weight = config.temporal_majority_weight
        self._history: List[deque] = [deque(maxlen=self.window) for _ in range(9)]
        
        # Exponential weights, most recent = highest
        decay = 0.8
        self._weights = [decay ** i for i in reversed(range(self.window))]

    def update(
        self,
        classifications: List[Dict],
    ) -> Tuple[bool, List[bool], List[str], List[Dict]]:
        """Push a new frame and return stability results + debug info."""
        now = time.monotonic()

        if len(classifications) != 9:
            return False, [False] * 9, ["unknown"] * 9, []

        for i, cls in enumerate(classifications):
            self._history[i].append(_StickerFrame(
                face=cls["face"],
                confidence=cls["confidence"],
                timestamp=now,
            ))

        stable_flags: List[bool] = []
        stable_labels: List[str] = []
        debug_info: List[Dict] = []

        for i in range(9):
            buf = self._history[i]
            n = len(buf)
            if n < max(3, int(self.window * 0.5)):
                stable_flags.append(False)
                stable_labels.append(buf[-1].face if buf else "unknown")
                debug_info.append({"history": [e.face for e in buf], "majority": "unknown", "majority_pct": 0.0, "avg_conf": 0.0, "stable": False})
                continue

            # Align weights to current buffer size
            w = self._weights[-n:]
            total_weight = sum(w)
            
            # Weighted vote counting
            vote_weights: Dict[str, float] = {}
            vote_confs: Dict[str, List[float]] = {}
            
            for j, entry in enumerate(buf):
                vote_weights[entry.face] = vote_weights.get(entry.face, 0.0) + w[j]
                vote_confs.setdefault(entry.face, []).append(entry.confidence)

            # Find majority label by highest weighted sum
            best_label = max(vote_weights, key=vote_weights.get)
            label_weight = vote_weights[best_label]
            fraction = label_weight / total_weight
            avg_conf = float(np.mean(vote_confs[best_label]))

            # Stability depends purely on the voting fraction now
            is_stable = fraction >= self.majority_weight
            stable_flags.append(is_stable)
            stable_labels.append(best_label if is_stable else buf[-1].face)
            
            debug_info.append({
                "history": [e.face for e in buf],
                "majority": best_label,
                "majority_pct": fraction * 100.0,
                "avg_conf": avg_conf,
                "stable": is_stable
            })

        face_stable = all(stable_flags)
        return face_stable, stable_flags, stable_labels, debug_info

    def reset(self) -> None:
        """Clear all history."""
        for dq in self._history:
            dq.clear()


# ═══════════════════════════════════════════════════════════════════
#  Diagnostics
# ═══════════════════════════════════════════════════════════════════

def calculate_diagnostics(frame: np.ndarray) -> Dict[str, int]:
    """Calculate image-level quality diagnostics on a 0–100 scale."""
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

    mean_val = float(np.mean(gray))
    lighting = int(100 - abs(128 - mean_val) * (100 / 128))
    lighting = max(0, min(100, lighting))

    lap_var = float(cv2.Laplacian(gray, cv2.CV_64F).var())
    sharpness = min(100, int((lap_var / 500) * 100))

    glare_ratio = float(np.sum(gray > 240)) / gray.size
    glare = max(0, 100 - int(glare_ratio * 1000)) 

    return {
        "lighting": lighting,
        "sharpness": sharpness,
        "angle": 100,  
        "glare": glare,
    }


def _compute_color_stats(bgr_patch: np.ndarray, mask: Optional[np.ndarray] = None) -> Dict:
    """Computes median BGR for a given patch and optional mask."""
    if mask is not None:
        valid_pixels = bgr_patch[mask > 0]
        if len(valid_pixels) == 0:
            valid_pixels = bgr_patch.reshape(-1, 3)
    else:
        valid_pixels = bgr_patch.reshape(-1, 3)
        
    bgr_median = np.median(valid_pixels, axis=0)
    return {"bgr_median": bgr_median}


def _sticker_diagnostics(
    raw_patch: np.ndarray,
    bgr_patch: np.ndarray,
    mask: np.ndarray,
    rep: Dict[str, np.ndarray],
    classification: Dict,
    prep_stats: Dict
) -> Dict:
    """Detailed per-sticker diagnostics including medians and pixel retention."""
    total = mask.size
    valid = int(np.sum(mask > 0))
    
    raw_stats = _compute_color_stats(raw_patch)
    proc_stats = _compute_color_stats(bgr_patch, mask)

    return {
        "valid_pixels": valid,
        "total_pixels": total,
        "mask_ratio": round(valid / (total + 1e-6), 3),
        "delta_e": classification.get("delta_e", 0.0),
        "classified_face": classification.get("face", "unknown"),
        "raw_stats": raw_stats,
        "proc_stats": proc_stats,
        "prep_stats": prep_stats
    }


# ═══════════════════════════════════════════════════════════════════
#  Main Pipeline — process_patches()
# ═══════════════════════════════════════════════════════════════════

def _generate_debug_output(
    frame: np.ndarray,
    fps: float,
    debug_state: DebugState,
    palette_hex: Dict[str, str],
    palette_labs: Dict[str, np.ndarray],
    hsv_ranges: Dict[str, List[Tuple[np.ndarray, np.ndarray]]],
    base_hsvs: Dict[str, Tuple[int, int, int]],
    overlay_coords: List[List[int]],
    raw_patches: List[np.ndarray],
    center_patches: List[np.ndarray],
    processed_patches: List[np.ndarray],
    masks: List[np.ndarray],
    classifications: List[Dict],
    reps: List[Dict],
    sticker_diags: List[Dict],
    stable_labels: List[str],
    square_stable: List[bool],
    diagnostics: Dict[str, int],
    temporal_debug: List[Dict],
    timings: Dict[str, float]
):
    """Generates the extensive debug output in the terminal."""
    print("══════════════════════════════════════════════")
    print("CubeVision AI Debug")
    print(f"Frame {debug_state.frame_counter}")
    print("══════════════════════════════════════════════")
    
    h_img, w_img = frame.shape[:2]
    print("\nFRAME INFO")
    print(f"- Frame Number : {debug_state.frame_counter}")
    print(f"- FPS          : {fps:.1f}")
    print(f"- Resolution   : {w_img} x {h_img}")
    print(f"- Timestamp    : {time.time():.2f}")
    
    print("\n====================================")
    print("USER PALETTE")
    print("====================================")
    for face, hx in palette_hex.items():
        print(f"{face} : {hx}")
        
    print("\n====================================")
    print("PALETTE CONVERSIONS")
    print("====================================")
    for face, hx in palette_hex.items():
        rgb = hex_to_rgb(hx)
        bgr = rgb[::-1]
        lab = hex_to_lab(hx)
        hsv = cv2.cvtColor(np.array([[[bgr[0], bgr[1], bgr[2]]]], dtype=np.uint8), cv2.COLOR_BGR2HSV)[0, 0]
        
        print(f"{face}")
        print(f"HEX : {hx}")
        print(f"RGB : ({rgb[0]},{rgb[1]},{rgb[2]})")
        print(f"BGR : ({bgr[0]},{bgr[1]},{bgr[2]})")
        print(f"HSV : ({hsv[0]},{hsv[1]},{hsv[2]})")
        print(f"LAB : ({int(lab[0])},{int(lab[1])},{int(lab[2])})\n")
        
    print("====================================")
    print("GENERATED HSV RANGES")
    print("====================================")
    for face, ranges in hsv_ranges.items():
        # Map face letter to common name if possible (or just print the face)
        face_names = {"U": "WHITE", "D": "YELLOW", "F": "GREEN", "B": "BLUE", "R": "RED", "L": "ORANGE"}
        name = face_names.get(face, face)
        print(name)
        
        for i, (lower, upper) in enumerate(ranges):
            print("Lower")
            print(f"({lower[0]},{lower[1]},{lower[2]})")
            print("Upper")
            print(f"({upper[0]},{upper[1]},{upper[2]})")
        print("")
            
    print("====================================")
    print("FINAL OUTPUT")
    print("====================================")
    print("Generated Face")
    
    grid = [stable_labels[0:3], stable_labels[3:6], stable_labels[6:9]]
    for row in grid:
        print(" ".join(row))
        
    print("\nStable Squares")
    s_grid = [square_stable[0:3], square_stable[3:6], square_stable[6:9]]
    for row in s_grid:
        print(" ".join(["Y" if s else "N" for s in row]))
        
    print("\n====================================")
    print("SUMMARY")
    print("====================================")
    # Sum up all timings
    total_time = sum(timings.values())
    print(f"Total Processing Time : {total_time * 1000:.1f} ms")
    print(f"Crop Time             : {timings.get('Crop', 0) * 1000:.1f} ms")
    print(f"Preprocessing Time    : {timings.get('PreprocessingAndClassification', 0) * 1000:.1f} ms") # It's combined
    print(f"Classification Time   : 0.0 ms") 
    print(f"Temporal Time         : {timings.get('Temporal', 0) * 1000:.1f} ms")
    print(f"Diagnostics Time      : {timings.get('Diagnostics', 0) * 1000:.1f} ms")
    print("\n")
    # Images are now saved directly in classify_patch_hsv per the user's instructions.
    
def overlay_coords_overlay(frame, overlay_coords, center_patches):
    overlay_img = frame.copy()
    for i, (x, y, w, h) in enumerate(overlay_coords):
        cv2.rectangle(overlay_img, (x, y), (x+w, y+h), (0, 0, 255), 2)
        c_patch = center_patches[i]
        ch, cw = c_patch.shape[:2]
        cx = x + (w - cw) // 2
        cy = y + (h - ch) // 2
        cv2.rectangle(overlay_img, (cx, cy), (cx+cw, cy+ch), (0, 255, 0), 2)
    return overlay_img

def process_patches(
    frame: np.ndarray,
    overlay_coords: List[List[int]],
    palette_hex: Dict[str, str],
    smoother: TemporalSmoother,
    palette_cache: PaletteCache,
    config: PipelineConfig = DEFAULT_CONFIG,
    fps: float = 0.0,
    debug_state: Optional[DebugState] = None,
) -> Dict:
    """Unified pipeline used by both live scanning and upload scanning."""
    timings = {}
    
    t0 = time.perf_counter()
    palette_labs, hsv_ranges, white_face, base_hsvs = palette_cache.get(palette_hex)
    raw_patches = crop_patches(frame, overlay_coords)
    
    # 2. Extract Center 50-60%
    center_patches = [_crop_center(p, config) for p in raw_patches]
    timings["Crop"] = time.perf_counter() - t0

    classifications: List[Dict] = []
    sticker_diags: List[Dict] = []
    processed_patches: List[np.ndarray] = []
    masks: List[np.ndarray] = []
    reps: List[Dict] = []

    is_debug_frame = False
    debug_dir = ""
    if DEBUG_MODE and debug_state is not None:
        if debug_state.frame_counter + 1 == DEBUG_FRAME:
            is_debug_frame = True
            debug_dir = f"debug/frame_{DEBUG_FRAME}"
            os.makedirs(debug_dir, exist_ok=True)
            cv2.imwrite(os.path.join(debug_dir, "frame.jpg"), frame)
            cv2.imwrite(os.path.join(debug_dir, "overlay.jpg"), overlay_coords_overlay(frame, overlay_coords, center_patches))

    debug_f = None
    debug_ctx = None
    if is_debug_frame:
        debug_f = open(os.path.join(debug_dir, "debug_log.txt"), "w", encoding="utf-8")
        debug_ctx = contextlib.redirect_stdout(debug_f)
        debug_ctx.__enter__()

    try:
        t0 = time.perf_counter()
        for i, c_patch in enumerate(center_patches):
            # 3. Preprocess (Blur + Glare/Shadow masking)
            bgr_cleaned, hsv_cleaned, mask, prep_stats = preprocess_patch(
                c_patch, config, patch_idx=i+1, is_debug_frame=is_debug_frame, debug_dir=debug_dir
            )
            processed_patches.append(bgr_cleaned)
            masks.append(mask)
            
            # 4. Representative Colour (Median BGR of valid pixels)
            rep = representative_color(bgr_cleaned, hsv_cleaned, mask)
            reps.append(rep)
            
            # 5. Classification
            cls = classify_patch_hsv(
                bgr_cleaned, hsv_cleaned, mask, 
                hsv_ranges, white_face, 
                palette_labs, base_hsvs, config,
                patch_idx=i+1,
                is_debug_frame=is_debug_frame,
                debug_dir=debug_dir,
                raw_patch=raw_patches[i],
                center_patch=center_patches[i]
            )
            classifications.append(cls)
            
            # 6. Diagnostics
            diag = _sticker_diagnostics(raw_patches[i], bgr_cleaned, mask, rep, cls, prep_stats)
            sticker_diags.append(diag)
        timings["PreprocessingAndClassification"] = time.perf_counter() - t0

        t0 = time.perf_counter()
        # 7. Temporal Smoothing
        face_stable, square_stable, stable_labels, temporal_debug = smoother.update(classifications)
        timings["Temporal"] = time.perf_counter() - t0

        stickers = []
        for i, cls in enumerate(classifications):
            label = stable_labels[i] if square_stable[i] else cls["face"]
            stickers.append({
                "color": palette_hex.get(label, "unknown"),
                "confidence": cls["confidence"],
                "stable": square_stable[i],
                "diagnostics": sticker_diags[i],
            })

        t0 = time.perf_counter()
        diagnostics = calculate_diagnostics(frame)
        timings["Diagnostics"] = time.perf_counter() - t0
        
        # 8. Debugging
        if DEBUG_MODE and debug_state is not None:
            debug_state.frame_counter += 1
            if debug_state.frame_counter == DEBUG_FRAME:
                _generate_debug_output(
                    frame, fps, debug_state,
                    palette_hex, palette_labs, hsv_ranges, base_hsvs,
                    overlay_coords,
                    raw_patches, center_patches, processed_patches, masks,
                    classifications, reps, sticker_diags,
                    stable_labels, square_stable, diagnostics,
                    temporal_debug, timings
                )
    finally:
        if debug_ctx is not None:
            debug_ctx.__exit__(None, None, None)
        if debug_f is not None:
            debug_f.close()

    return {
        "status": "stable" if face_stable else "detecting",
        "stickers": stickers,
        "square_stable": square_stable,
        "face_stable": face_stable,
        "diagnostics": diagnostics,
    }


# ═══════════════════════════════════════════════════════════════════
#  Upload Scanning
# ═══════════════════════════════════════════════════════════════════

async def read_image(file) -> np.ndarray:
    """Read an uploaded file into a BGR numpy array."""
    data = await file.read()
    img = cv2.imdecode(np.frombuffer(data, np.uint8), cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError(f"Invalid image: {getattr(file, 'filename', 'unknown')}")
    return img


def _order_points(pts: np.ndarray) -> np.ndarray:
    """Order 4 corner points: TL, TR, BR, BL."""
    rect = np.zeros((4, 2), dtype="float32")
    s = pts.sum(axis=1)
    rect[0] = pts[np.argmin(s)]
    rect[2] = pts[np.argmax(s)]
    diff = np.diff(pts, axis=1)
    rect[1] = pts[np.argmin(diff)]
    rect[3] = pts[np.argmax(diff)]
    return rect


def _detect_face_contour(img: np.ndarray) -> Optional[np.ndarray]:
    """Find and validate the largest quadrilateral contour."""
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    edged = cv2.Canny(blurred, 50, 200)

    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
    edged = cv2.morphologyEx(edged, cv2.MORPH_CLOSE, kernel)

    contours, _ = cv2.findContours(edged, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not contours:
        return None

    contours = sorted(contours, key=cv2.contourArea, reverse=True)
    img_area = img.shape[0] * img.shape[1]

    for cnt in contours:
        peri = cv2.arcLength(cnt, True)
        approx = cv2.approxPolyDP(cnt, 0.02 * peri, True)
        
        if len(approx) == 4:
            area = cv2.contourArea(approx)
            
            # Check 1: Minimum area (must be at least 5% of image)
            if area < img_area * 0.05:
                continue
                
            # Check 2: Convexity
            if not cv2.isContourConvex(approx):
                continue
                
            # Check 3: Aspect Ratio (approx bounding box)
            x, y, w, h = cv2.boundingRect(approx)
            aspect_ratio = float(w) / max(1, h)
            if aspect_ratio < 0.5 or aspect_ratio > 2.0:
                continue
                
            return approx.reshape(4, 2)

    return None


def _extract_patches_from_image(
    img: np.ndarray,
    config: PipelineConfig = DEFAULT_CONFIG,
) -> Tuple[List[np.ndarray], List[List[int]]]:
    """Detect cube face, perspective-warp, extract 9 patches."""
    pts = _detect_face_contour(img)
    h, w = img.shape[:2]
    if pts is None:
        pts = np.array([[0, 0], [w, 0], [w, h], [0, h]], dtype="float32")

    rect = _order_points(pts.astype("float32"))
    sz = config.warp_size
    dst = np.array([[0, 0], [sz - 1, 0], [sz - 1, sz - 1], [0, sz - 1]], dtype="float32")
    M = cv2.getPerspectiveTransform(rect, dst)
    warped = cv2.warpPerspective(img, M, (sz, sz))

    step = sz // 3
    margin = int(step * config.sticker_margin_ratio)

    patches: List[np.ndarray] = []
    coords: List[List[int]] = []

    for row in range(3):
        for col in range(3):
            y1 = row * step + margin
            y2 = (row + 1) * step - margin
            x1 = col * step + margin
            x2 = (col + 1) * step - margin
            patches.append(warped[y1:y2, x1:x2])
            coords.append([x1, y1, x2 - x1, y2 - y1])

    return patches, coords


def scan_single_face(
    img: np.ndarray,
    palette_hex: Optional[Dict[str, str]] = None,
    config: PipelineConfig = DEFAULT_CONFIG,
) -> Dict:
    """Scan a single uploaded face image using the shared pipeline logic."""
    raw_patches, coords = _extract_patches_from_image(img, config)
    center_patches = [_crop_center(p, config) for p in raw_patches]

    if palette_hex:
        palette_labs = convert_palette_to_lab(palette_hex)
        hsv_ranges, white_face, _ = generate_hsv_ranges(palette_hex, palette_labs, config)

        stickers = []
        grid = [["" for _ in range(3)] for _ in range(3)]

        for i, c_patch in enumerate(center_patches):
            r, c = i // 3, i % 3
            bgr_cleaned, hsv_cleaned, mask, _ = preprocess_patch(c_patch, config)
            rep = representative_color(bgr_cleaned, hsv_cleaned, mask)
            
            cls = classify_patch_hsv(
                bgr_cleaned, hsv_cleaned, mask,
                hsv_ranges, white_face,
                palette_labs, config
            )

            face_label = cls["face"]
            grid[r][c] = face_label
            stickers.append({
                "color": palette_hex.get(face_label, "unknown"),
                "confidence": cls["confidence"],
            })
    else:
        stickers = []
        grid = [["" for _ in range(3)] for _ in range(3)]

        for i, c_patch in enumerate(center_patches):
            r, c = i // 3, i % 3
            bgr = np.median(c_patch.reshape(-1, 3), axis=0).astype(int)
            rgb = bgr[::-1]
            hex_color = "#{:02x}{:02x}{:02x}".format(*rgb)
            grid[r][c] = hex_color
            stickers.append({"color": hex_color, "confidence": 0.5})

    diagnostics = calculate_diagnostics(img)

    return {
        "stickers": stickers,
        "grid": grid,
        "diagnostics": diagnostics,
        "success": True,
    }


# ═══════════════════════════════════════════════════════════════════
#  Full 6-Image Upload Pipeline
# ═══════════════════════════════════════════════════════════════════

async def scan_cube_from_images(
    files: Dict,
    face_order: Optional[List[str]] = None,
    config: PipelineConfig = DEFAULT_CONFIG,
) -> Tuple[str, Dict, Dict, List]:
    """Full 6-image upload pipeline."""
    if face_order is None:
        face_order = ["U", "R", "F", "D", "L", "B"]

    images: Dict[str, np.ndarray] = {}
    for f in face_order:
        images[f] = await read_image(files[f])

    face_patches: Dict[str, List[np.ndarray]] = {}
    for f in face_order:
        raw_patches, _ = _extract_patches_from_image(images[f], config)
        center_patches = [_crop_center(p, config) for p in raw_patches]
        face_patches[f] = center_patches

    palette_hex: Dict[str, str] = {}
    palette_display: List[Dict] = []
    centre_labs: Dict[str, np.ndarray] = {}

    for f in face_order:
        centre_patch = face_patches[f][4]
        bgr_cleaned, hsv_cleaned, mask, _ = preprocess_patch(centre_patch, config)
        rep = representative_color(bgr_cleaned, hsv_cleaned, mask)
        centre_labs[f] = rep["lab"]

        bgr_int = rep["bgr"].astype(int)
        rgb = bgr_int[::-1]
        hex_color = "#{:02x}{:02x}{:02x}".format(*rgb)
        palette_hex[f] = hex_color
        palette_display.append({"face": f, "color": hex_color, "label": f"{f} Face (Calibrated)"})

    # Generate dynamic HSV ranges for the uploaded images' palette
    hsv_ranges, white_face, _ = generate_hsv_ranges(palette_hex, centre_labs, config)

    face_grids: Dict[str, List[List[str]]] = {}
    face_confs: Dict[str, List[List[float]]] = {}

    for f in face_order:
        grid = [["" for _ in range(3)] for _ in range(3)]
        confs = [[0.0 for _ in range(3)] for _ in range(3)]

        for i, patch in enumerate(face_patches[f]):
            row, col = i // 3, i % 3
            if row == 1 and col == 1:
                grid[row][col] = f
                confs[row][col] = 1.0
                continue

            bgr_cleaned, hsv_cleaned, mask, _ = preprocess_patch(patch, config)
            cls = classify_patch_hsv(
                bgr_cleaned, hsv_cleaned, mask,
                hsv_ranges, white_face,
                centre_labs, config
            )
            grid[row][col] = cls["face"]
            confs[row][col] = cls["confidence"]

        face_grids[f] = grid
        face_confs[f] = confs

    face_grids, face_confs = _enforce_global_constraints(face_grids, face_confs)

    cube_string = "".join(
        "".join(row) for f in face_order for row in face_grids[f]
    )

    all_confs = [
        face_confs[f][r][c]
        for f in face_order for r in range(3) for c in range(3)
    ]
    conf_stats = {
        "min": float(np.min(all_confs)) if all_confs else 0.0,
        "mean": float(np.mean(all_confs)) if all_confs else 0.0,
    }

    return cube_string, face_grids, conf_stats, palette_display


def _enforce_global_constraints(
    face_grids: Dict[str, List[List[str]]],
    confidences: Dict[str, List[List[float]]],
) -> Tuple[Dict[str, List[List[str]]], Dict[str, List[List[float]]]]:
    """Enforce exactly 9 stickers per face letter."""
    classes = ["U", "R", "F", "D", "L", "B"]
    items = []

    for f in face_grids:
        for r in range(3):
            for c in range(3):
                items.append({
                    "face": f, "r": r, "c": c,
                    "label": face_grids[f][r][c],
                    "conf": confidences[f][r][c],
                    "locked": (r == 1 and c == 1),
                })

    counts = {k: 0 for k in classes}
    for it in items:
        if it["label"] in counts:
            counts[it["label"]] += 1

    surplus = {k: max(0, counts[k] - 9) for k in classes}
    shortage = {k: max(0, 9 - counts[k]) for k in classes}

    pool = sorted(
        [it for it in items if not it["locked"]],
        key=lambda x: x["conf"],
    )

    for cls in classes:
        need = shortage[cls]
        i = 0
        while need > 0 and i < len(pool):
            cand = pool[i]
            if surplus.get(cand["label"], 0) > 0 and cand["label"] != cls:
                surplus[cand["label"]] -= 1
                cand["label"] = cls
                need -= 1
            i += 1
        shortage[cls] = need

    if any(shortage[k] > 0 for k in classes):
        raise ValueError("Cannot enforce global colour constraints")

    new_faces = {f: [["" for _ in range(3)] for _ in range(3)] for f in face_grids}
    new_confs = {f: [[0.0 for _ in range(3)] for _ in range(3)] for f in face_grids}

    for it in items:
        new_faces[it["face"]][it["r"]][it["c"]] = it["label"]
        new_confs[it["face"]][it["r"]][it["c"]] = 1.0 if it["locked"] else it["conf"]

    return new_faces, new_confs
