"""
CubeVision AI — Computer Vision Pipeline

Simplified and robust pipeline for exact color preservation.
Prioritizes center-cropping and raw color metrics over aggressive preprocessing.
"""

import cv2
import hashlib
import json
import time
import os
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

    # ── Pixel filtering (HSV-domain) ─────────────────────────────
    # Relaxed thresholds to preserve true colors.
    value_ceiling: int = 250        # discard extreme specular highlights
    value_floor: int = 15           # discard extreme shadows

    # ── Dynamic HSV Classification ───────────────────────────────
    hue_tolerance: int = 10
    saturation_tolerance: int = 60
    value_tolerance: int = 60
    white_saturation_offset: int = 40
    white_value_offset: int = 40
    min_valid_pixels: int = 15
    min_confidence_threshold: float = 0.6
    morph_kernel_size: int = 3

    # ── Palette validation (ΔE76 in CIE LAB) ────────────────────
    de_threshold_poor: float = 20.0
    de_threshold_acceptable: float = 35.0

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
    
    for face, hex_code in palette_hex.items():
        r, g, b = hex_to_rgb(hex_code)
        bgr_uint8 = np.array([[[b, g, r]]], dtype=np.uint8)
        hsv_cv = cv2.cvtColor(bgr_uint8, cv2.COLOR_BGR2HSV)[0, 0]
        h, s, v = int(hsv_cv[0]), int(hsv_cv[1]), int(hsv_cv[2])
        base_hsvs[face] = (h, s, v)
        
        if face == white_face:
            # White: low saturation, high value. Hue is ignored.
            s_max = min(255, s + config.white_saturation_offset)
            v_min = max(0, v - config.white_value_offset)
            lower = np.array([0, 0, v_min], dtype=np.uint8)
            upper = np.array([179, s_max, 255], dtype=np.uint8)
            ranges[face] = [(lower, upper)]
        else:
            h_tol = config.hue_tolerance
            
            # Widen blue tolerance, tighten red/orange tolerance
            if 100 <= h <= 140: # Blue/cyan range
                h_tol += 5
            elif (0 <= h <= 25) or (160 <= h <= 179): # Red/orange range
                h_tol = max(5, h_tol - 3)
                
            s_min = max(0, s - config.saturation_tolerance)
            s_max = min(255, s + config.saturation_tolerance)
            v_min = max(0, v - config.value_tolerance)
            v_max = min(255, v + config.value_tolerance)
            
            h_min = h - h_tol
            h_max = h + h_tol
            
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

    faces = list(labs.keys())
    distances: Dict[str, float] = {}
    all_dists: List[float] = []
    min_dist = float("inf")
    worst_pair: Optional[Tuple[str, str]] = None
    warnings: List[str] = []

    for i in range(len(faces)):
        for j in range(i + 1, len(faces)):
            f1, f2 = faces[i], faces[j]
            d = delta_e_76(labs[f1], labs[f2])
            distances[f"{f1}-{f2}"] = round(d, 1)
            all_dists.append(d)
            if d < min_dist:
                min_dist = d
                worst_pair = (f1, f2)
            if d < config.de_threshold_acceptable:
                label1 = FACE_LABELS.get(f1, f1)
                label2 = FACE_LABELS.get(f2, f2)
                warnings.append(
                    f"{label1} ({f1}) and {label2} ({f2}) are close "
                    f"(ΔE = {d:.1f}). Consider choosing more distinct shades."
                )

    avg_dist = float(np.mean(all_dists)) if all_dists else 0.0

    if min_dist < config.de_threshold_poor:
        status = "POOR"
        label1 = FACE_LABELS.get(worst_pair[0], worst_pair[0])
        label2 = FACE_LABELS.get(worst_pair[1], worst_pair[1])
        message = (
            f"The selected {label1} and {label2} colours are too similar "
            f"for reliable detection (ΔE = {min_dist:.1f}). "
            f"Please choose colours with greater visual separation."
        )
    elif min_dist < config.de_threshold_acceptable:
        status = "ACCEPTABLE"
        message = "Detection should work, but some colours are relatively close."
    else:
        status = "GOOD"
        message = "Palette is suitable for cube detection."

    return {
        "success": True,
        "status": status,
        "message": message,
        "minimum_distance": round(min_dist, 1),
        "average_distance": round(avg_dist, 1),
        "distances": distances,
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

def remove_glare_and_shadows(
    hsv_patch: np.ndarray,
    config: PipelineConfig = DEFAULT_CONFIG,
) -> np.ndarray:
    """Lightweight masking: only discard extreme highlights and extreme shadows."""
    v_ch = hsv_patch[:, :, 2]
    valid = np.ones(v_ch.shape, dtype=np.uint8) * 255
    valid[v_ch > config.value_ceiling] = 0   # extreme glare
    valid[v_ch < config.value_floor] = 0     # extreme shadow
    return valid


def preprocess_patch(
    patch: np.ndarray,
    config: PipelineConfig = DEFAULT_CONFIG,
) -> Tuple[np.ndarray, np.ndarray, Dict]:
    """Simplified preprocessing pipeline for a single center-cropped sticker patch.
    Returns:
        (bgr_patch, validity_mask, prep_stats)
    """
    stats = {}
    
    t0 = time.perf_counter()
    if config.median_blur_ksize > 0:
        p = cv2.medianBlur(patch, config.median_blur_ksize)
    else:
        p = patch.copy()
    stats["blur_ms"] = (time.perf_counter() - t0) * 1000
    stats["blur_ksize"] = config.median_blur_ksize
    
    t0 = time.perf_counter()
    hsv = cv2.cvtColor(p, cv2.COLOR_BGR2HSV)
    mask = remove_glare_and_shadows(hsv, config)
    stats["mask_ms"] = (time.perf_counter() - t0) * 1000
    
    return p, mask, stats


# ═══════════════════════════════════════════════════════════════════
#  Representative Colour (Median)
# ═══════════════════════════════════════════════════════════════════

def representative_color(
    bgr_patch: np.ndarray,
    mask: np.ndarray,
) -> Dict[str, np.ndarray]:
    """Compute the Median BGR of the valid pixels, then convert directly to LAB."""
    valid_pixels = bgr_patch[mask > 0]

    # Fallback if too few pixels survived masking
    if len(valid_pixels) < 5:
        valid_pixels = bgr_patch.reshape(-1, 3)

    # Simple median is robust to noise and slight glare/shadow variation
    bgr_med = np.median(valid_pixels, axis=0).astype(np.float64)
    
    # Convert BGR float to LAB float
    # We create a 1x1 uint8 image to use OpenCV's conversion, then scale correctly
    bgr_uint8 = np.array([[[int(bgr_med[0]), int(bgr_med[1]), int(bgr_med[2])]]], dtype=np.uint8)
    
    hsv_cv = cv2.cvtColor(bgr_uint8, cv2.COLOR_BGR2HSV)[0, 0]
    hsv_med = hsv_cv.astype(np.float64)
    
    lab_cv = cv2.cvtColor(bgr_uint8, cv2.COLOR_BGR2LAB)[0, 0]
    L = lab_cv[0] * (100.0 / 255.0)
    a = lab_cv[1] - 128.0
    b = lab_cv[2] - 128.0
    lab_float = np.array([L, a, b], dtype=np.float64)

    return {
        "bgr": bgr_med,
        "hsv": hsv_med,
        "lab": lab_float,
    }


# ═══════════════════════════════════════════════════════════════════
#  Classification
# ═══════════════════════════════════════════════════════════════════

def classify_patch_hsv(
    bgr_patch: np.ndarray,
    glare_mask: np.ndarray,
    hsv_ranges: Dict[str, List[Tuple[np.ndarray, np.ndarray]]],
    white_face: str,
    palette_labs: Dict[str, np.ndarray],
    config: PipelineConfig = DEFAULT_CONFIG,
) -> Dict:
    """Classify a sticker using dynamic HSV segmentation, morphological cleanup, and LAB tie-breaking."""
    hsv_patch = cv2.cvtColor(bgr_patch, cv2.COLOR_BGR2HSV)
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (config.morph_kernel_size, config.morph_kernel_size))
    
    pixel_counts = {}
    face_masks = {}
    
    total_valid_pixels = 0
    
    for face, ranges in hsv_ranges.items():
        face_mask = np.zeros(hsv_patch.shape[:2], dtype=np.uint8)
        for (lower, upper) in ranges:
            m = cv2.inRange(hsv_patch, lower, upper)
            face_mask = cv2.bitwise_or(face_mask, m)
            
        # Morphological Cleanup
        if config.morph_kernel_size > 0:
            face_mask = cv2.morphologyEx(face_mask, cv2.MORPH_OPEN, kernel)
            face_mask = cv2.morphologyEx(face_mask, cv2.MORPH_CLOSE, kernel)
            
        # Apply the glare/shadow mask
        face_mask = cv2.bitwise_and(face_mask, glare_mask)
        
        # Secondary check for white (a and b should be near 0 in LAB space)
        if face == white_face:
            white_pixels = bgr_patch[face_mask > 0]
            if len(white_pixels) > 0:
                bgr_mean = np.mean(white_pixels, axis=0)
                bgr_uint8 = np.array([[[int(bgr_mean[0]), int(bgr_mean[1]), int(bgr_mean[2])]]], dtype=np.uint8)
                lab_cv = cv2.cvtColor(bgr_uint8, cv2.COLOR_BGR2LAB)[0, 0]
                a = lab_cv[1] - 128.0
                b = lab_cv[2] - 128.0
                if abs(a) > 20 or abs(b) > 20:
                    face_mask[:] = 0 # Not neutral enough to be white
        
        count = int(np.sum(face_mask > 0))
        pixel_counts[face] = count
        face_masks[face] = face_mask
        total_valid_pixels += count
        
    sorted_faces = sorted(pixel_counts.keys(), key=lambda f: pixel_counts[f], reverse=True)
    winner = sorted_faces[0]
    runner_up = sorted_faces[1]
    
    winner_pixels = pixel_counts[winner]
    runner_up_pixels = pixel_counts[runner_up]
    
    if total_valid_pixels < config.min_valid_pixels or winner_pixels < config.min_valid_pixels:
        # Fallback to LAB if all HSV masks fail
        rep = representative_color(bgr_patch, glare_mask)
        dists = {f: delta_e_76(rep["lab"], ref) for f, ref in palette_labs.items()}
        sorted_lab = sorted(dists, key=dists.get)
        return {
            "face": sorted_lab[0],
            "runner_up": sorted_lab[1],
            "confidence": 0.5, # low confidence for fallback
            "pixel_counts": pixel_counts,
            "face_masks": face_masks,
            "reason": "HSV masks failed. LAB Fallback used."
        }
        
    winner_ratio = winner_pixels / total_valid_pixels
    margin = winner_pixels - runner_up_pixels
    
    confidence = winner_ratio * 0.7 + (margin / total_valid_pixels) * 0.3
    reason = "Dominant HSV mask."
    
    # LAB Tie-break if ambiguous
    if confidence < config.min_confidence_threshold and runner_up_pixels > 0:
        # Check LAB distance for winner and runner up
        winner_mask = face_masks[winner]
        runner_up_mask = face_masks[runner_up]
        
        w_pixels = bgr_patch[winner_mask > 0]
        r_pixels = bgr_patch[runner_up_mask > 0]
        
        if len(w_pixels) > 0 and len(r_pixels) > 0:
            w_bgr = np.mean(w_pixels, axis=0)
            r_bgr = np.mean(r_pixels, axis=0)
            
            w_bgr_uint8 = np.array([[[int(w_bgr[0]), int(w_bgr[1]), int(w_bgr[2])]]], dtype=np.uint8)
            r_bgr_uint8 = np.array([[[int(r_bgr[0]), int(r_bgr[1]), int(r_bgr[2])]]], dtype=np.uint8)
            
            w_lab_cv = cv2.cvtColor(w_bgr_uint8, cv2.COLOR_BGR2LAB)[0, 0]
            w_lab = np.array([w_lab_cv[0] * (100.0/255.0), w_lab_cv[1]-128.0, w_lab_cv[2]-128.0], dtype=np.float64)
            
            r_lab_cv = cv2.cvtColor(r_bgr_uint8, cv2.COLOR_BGR2LAB)[0, 0]
            r_lab = np.array([r_lab_cv[0] * (100.0/255.0), r_lab_cv[1]-128.0, r_lab_cv[2]-128.0], dtype=np.float64)
            
            d_winner = delta_e_76(w_lab, palette_labs[winner])
            d_runner = delta_e_76(r_lab, palette_labs[runner_up])
            
            if d_runner < d_winner - 5.0:
                # Runner up is significantly closer in LAB space, override!
                winner, runner_up = runner_up, winner
                reason = "LAB Tie-break override."
                confidence = 0.55 # Marginal confidence
                
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
    print("FOR EVERY PATCH")
    print("====================================")
    for i, diag in enumerate(sticker_diags):
        print(f"Patch Number : {i+1}")
        x, y, w, h = overlay_coords[i]
        print(f"Coordinates  : x={x}, y={y}")
        print(f"Width        : {w}")
        print(f"Height       : {h}")
        
        rep = reps[i]
        bgr = rep['bgr']
        hsv = rep['hsv']
        lab = rep['lab']
        print(f"Representative BGR : ({int(bgr[0])},{int(bgr[1])},{int(bgr[2])})")
        print(f"Representative HSV : ({int(hsv[0])},{int(hsv[1])},{int(hsv[2])})")
        print(f"Representative LAB : ({int(lab[0])},{int(lab[1])},{int(lab[2])})")
        
        cls = classifications[i]
        print("\nPIXEL COUNTS")
        # Ensure we map letters to names for counts
        face_names = {"U": "White", "D": "Yellow", "F": "Green", "B": "Blue", "R": "Red", "L": "Orange"}
        for f, count in cls["pixel_counts"].items():
            print(face_names.get(f, f))
            print(f"{count}")
            
        print("\nCLASSIFICATION")
        print(f"Winner       : {cls['face']}")
        print(f"Runner Up    : {cls['runner_up']}")
        print(f"Confidence   : {cls['confidence']:.2f}")
        print(f"Reason       : {cls.get('reason', 'Unknown')}")
        
        if "Fallback" in cls.get("reason", ""):
            print("HSV classification failed, LAB fallback triggered.")
            print("\nLAB FALLBACK")
            for f, dist in cls.get("all_dists", {}).items():
                print(f"Distance to {face_names.get(f, f)} : {dist:.1f}")
            print(f"Winner : {cls['face']}")
            
        t_dbg = temporal_debug[i]
        print("\nTEMPORAL SMOOTHER")
        print(f"History            : {' '.join(t_dbg['history'])}")
        print(f"Majority           : {t_dbg['majority']}")
        print(f"Majority %         : {t_dbg['majority_pct']:.1f}%")
        print(f"Average Confidence : {t_dbg['avg_conf']:.2f}")
        print(f"Stable             : {'YES' if t_dbg['stable'] else 'NO'}\n")
        print("-" * 40 + "\n")
        
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

    t0 = time.perf_counter()
    for i, c_patch in enumerate(center_patches):
        # 3. Preprocess (Blur + Glare/Shadow masking)
        bgr_cleaned, mask, prep_stats = preprocess_patch(c_patch, config)
        processed_patches.append(bgr_cleaned)
        masks.append(mask)
        
        # 4. Representative Colour (Median BGR of valid pixels)
        rep = representative_color(bgr_cleaned, mask)
        reps.append(rep)
        
        # 5. Classification
        cls = classify_patch_hsv(
            bgr_cleaned, mask, 
            hsv_ranges, white_face, 
            palette_labs, config
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
            bgr_cleaned, mask, _ = preprocess_patch(c_patch, config)
            rep = representative_color(bgr_cleaned, mask)
            
            cls = classify_patch_hsv(
                bgr_cleaned, mask,
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
        bgr_cleaned, mask, _ = preprocess_patch(centre_patch, config)
        rep = representative_color(bgr_cleaned, mask)
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

            bgr_cleaned, mask, _ = preprocess_patch(patch, config)
            cls = classify_patch_hsv(
                bgr_cleaned, mask,
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
