"""
CubeVision AI — Computer Vision Pipeline

Single source of truth for all CV operations:
palette validation, patch cropping, preprocessing, color classification,
temporal stabilization, and diagnostics.

Both the live webcam scanner and upload image scanner share this pipeline.
"""

import cv2
import hashlib
import json
import time
import numpy as np
from collections import deque
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple


# ═══════════════════════════════════════════════════════════════════
#  Configuration
# ═══════════════════════════════════════════════════════════════════

@dataclass
class PipelineConfig:
    """All tunable CV parameters in one place."""

    # ── Patch preprocessing ──────────────────────────────────────
    median_blur_ksize: int = 5
    clahe_clip_limit: float = 2.0
    clahe_tile_size: Tuple[int, int] = (4, 4)
    gamma: float = 1.0  # 1.0 = no correction

    # ── Pixel filtering (HSV-domain) ─────────────────────────────
    saturation_floor: int = 25      # discard near-grey pixels
    value_ceiling: int = 245        # discard specular highlights
    value_floor: int = 20           # discard deep shadows

    # ── Palette validation (ΔE76 in CIE LAB) ────────────────────
    de_threshold_poor: float = 20.0
    de_threshold_acceptable: float = 35.0

    # ── Temporal smoothing ───────────────────────────────────────
    temporal_window: int = 8        # rolling history length
    temporal_majority: float = 0.6  # fraction required for stability
    confidence_floor: float = 0.45  # minimum avg confidence for stable

    # ── Upload / perspective warp ────────────────────────────────
    warp_size: int = 300            # warped face is warp_size × warp_size
    sticker_margin_ratio: float = 0.22  # margin inside each cell


DEFAULT_CONFIG = PipelineConfig()


# ═══════════════════════════════════════════════════════════════════
#  Color-Space Utilities
# ═══════════════════════════════════════════════════════════════════

def hex_to_lab(hex_code: str) -> np.ndarray:
    """Convert a '#RRGGBB' hex string to CIE LAB (float64, properly scaled).

    OpenCV stores LAB as uint8 with L in [0, 255], a/b in [0, 255] centred
    at 128.  We convert to standard CIE ranges: L [0, 100], a/b [−128, 127].
    """
    h = hex_code.lstrip("#")
    if len(h) != 6:
        raise ValueError(f"Invalid hex color: {hex_code}")
    r, g, b = (int(h[i:i + 2], 16) for i in (0, 2, 4))
    bgr = np.array([[[b, g, r]]], dtype=np.uint8)
    lab_cv = cv2.cvtColor(bgr, cv2.COLOR_BGR2LAB)[0, 0]
    L = lab_cv[0] * (100.0 / 255.0)
    a = lab_cv[1] - 128.0
    b_val = lab_cv[2] - 128.0
    return np.array([L, a, b_val], dtype=np.float64)


def delta_e_76(lab1: np.ndarray, lab2: np.ndarray) -> float:
    """Euclidean distance in CIE LAB (ΔE76).

    Computationally cheap and sufficient when palette colours are well-
    separated.  For colours within ΔE < 5 the perceptual non-linearity
    matters, but our palette validation rejects palettes that close.
    """
    return float(np.linalg.norm(lab1 - lab2))


def _bgr_to_lab_float(bgr: np.ndarray) -> np.ndarray:
    """Convert a single BGR pixel (uint8 or float) to CIE LAB float64."""
    pixel = np.array([[bgr[:3]]], dtype=np.uint8)
    lab_cv = cv2.cvtColor(pixel, cv2.COLOR_BGR2LAB)[0, 0]
    L = lab_cv[0] * (100.0 / 255.0)
    a = lab_cv[1] - 128.0
    b = lab_cv[2] - 128.0
    return np.array([L, a, b], dtype=np.float64)


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


class PaletteCache:
    """Caches the HEX → LAB conversion so it is not repeated every frame."""

    def __init__(self) -> None:
        self._hash: Optional[str] = None
        self._labs: Dict[str, np.ndarray] = {}

    def get(self, palette_hex: Dict[str, str]) -> Dict[str, np.ndarray]:
        """Return cached LAB palette, recomputing only when the palette changes."""
        h = _palette_hash(palette_hex)
        if h != self._hash:
            self._labs = convert_palette_to_lab(palette_hex)
            self._hash = h
        return self._labs


# ═══════════════════════════════════════════════════════════════════
#  Palette Validation
# ═══════════════════════════════════════════════════════════════════

def validate_palette(
    palette: Dict[str, str],
    config: PipelineConfig = DEFAULT_CONFIG,
) -> Dict:
    """Validate whether the six user-selected colours are suitable for CV.

    Converts HEX → LAB, computes all 15 pairwise ΔE76 distances, and
    returns status / diagnostics.
    """
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

    # Convert
    try:
        labs = convert_palette_to_lab(palette)
    except ValueError as e:
        return {
            "success": False, "status": "POOR",
            "message": str(e),
            "minimum_distance": 0.0, "average_distance": 0.0,
            "distances": {}, "warnings": [str(e)],
        }

    # Pairwise distances
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
    """Crop 9 sticker regions from a BGR frame using overlay coordinates.

    Each entry in *overlay_coords* is ``[x, y, w, h]``.
    No preprocessing — pure cropping only.
    """
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
            # Fallback: tiny black patch so downstream never crashes
            patch = np.zeros((10, 10, 3), dtype=np.uint8)
        patches.append(patch)

    return patches


# ═══════════════════════════════════════════════════════════════════
#  Patch Preprocessing  (split into reusable sub-functions)
# ═══════════════════════════════════════════════════════════════════

def white_balance(patch: np.ndarray) -> np.ndarray:
    """Gray-world white balance on a BGR patch."""
    result = patch.astype(np.float32)
    avg_b = np.mean(result[:, :, 0])
    avg_g = np.mean(result[:, :, 1])
    avg_r = np.mean(result[:, :, 2])
    avg = (avg_b + avg_g + avg_r) / 3.0

    result[:, :, 0] *= avg / (avg_b + 1e-6)
    result[:, :, 1] *= avg / (avg_g + 1e-6)
    result[:, :, 2] *= avg / (avg_r + 1e-6)

    return np.clip(result, 0, 255).astype(np.uint8)


def normalize_brightness(patch: np.ndarray, config: PipelineConfig = DEFAULT_CONFIG) -> np.ndarray:
    """CLAHE on the L channel for local brightness normalization."""
    lab = cv2.cvtColor(patch, cv2.COLOR_BGR2LAB)
    l_ch, a_ch, b_ch = cv2.split(lab)
    clahe = cv2.createCLAHE(
        clipLimit=config.clahe_clip_limit,
        tileGridSize=config.clahe_tile_size,
    )
    l_ch = clahe.apply(l_ch)
    lab = cv2.merge([l_ch, a_ch, b_ch])
    return cv2.cvtColor(lab, cv2.COLOR_LAB2BGR)


def gamma_correct(patch: np.ndarray, gamma: float = 1.0) -> np.ndarray:
    """Apply gamma correction.  gamma=1.0 is a no-op."""
    if abs(gamma - 1.0) < 1e-4:
        return patch
    inv_gamma = 1.0 / gamma
    table = np.array(
        [(i / 255.0) ** inv_gamma * 255 for i in range(256)],
        dtype=np.uint8,
    )
    return cv2.LUT(patch, table)


def remove_glare_and_shadows(
    patch: np.ndarray,
    config: PipelineConfig = DEFAULT_CONFIG,
) -> Tuple[np.ndarray, np.ndarray]:
    """Mask out specular highlights and deep shadows in HSV domain.

    Returns (masked_patch, validity_mask) where masked pixels are zeroed
    and validity_mask is uint8 with 255 = valid, 0 = rejected.
    """
    hsv = cv2.cvtColor(patch, cv2.COLOR_BGR2HSV)
    v_ch = hsv[:, :, 2]

    valid = np.ones(v_ch.shape, dtype=np.uint8) * 255
    valid[v_ch > config.value_ceiling] = 0   # glare
    valid[v_ch < config.value_floor] = 0     # deep shadow

    masked = cv2.bitwise_and(patch, patch, mask=valid)
    return masked, valid


def remove_low_saturation(
    patch: np.ndarray,
    mask: np.ndarray,
    config: PipelineConfig = DEFAULT_CONFIG,
) -> Tuple[np.ndarray, np.ndarray]:
    """Further mask out near-grey (low saturation) pixels.

    Operates on an already-masked patch; updates the validity mask in place.
    """
    hsv = cv2.cvtColor(patch, cv2.COLOR_BGR2HSV)
    s_ch = hsv[:, :, 1]

    low_sat = s_ch < config.saturation_floor
    mask[low_sat] = 0

    masked = cv2.bitwise_and(patch, patch, mask=mask)
    return masked, mask


def preprocess_patch(
    patch: np.ndarray,
    config: PipelineConfig = DEFAULT_CONFIG,
) -> Tuple[np.ndarray, np.ndarray]:
    """Full preprocessing pipeline for a single sticker patch.

    Pipeline:
        Median Blur → White Balance → Brightness Normalization →
        Gamma Correction → Remove Glare / Shadows → Remove Low Saturation

    Returns:
        (cleaned_patch, validity_mask)
        where validity_mask has 255 for usable pixels, 0 for rejected.
    """
    p = cv2.medianBlur(patch, config.median_blur_ksize)
    p = white_balance(p)
    p = normalize_brightness(p, config)
    p = gamma_correct(p, config.gamma)
    p, mask = remove_glare_and_shadows(p, config)
    p, mask = remove_low_saturation(p, mask, config)
    return p, mask


# ═══════════════════════════════════════════════════════════════════
#  Representative Colour
# ═══════════════════════════════════════════════════════════════════

def representative_color(
    patch: np.ndarray,
    mask: np.ndarray,
) -> Dict[str, np.ndarray]:
    """Compute one representative colour from the valid (unmasked) pixels.

    Uses **median** (robust to outliers) instead of mean.
    Returns ``{"bgr": ..., "hsv": ..., "lab": ...}`` as float64 arrays.
    """
    valid_pixels = patch[mask > 0]

    if len(valid_pixels) < 5:
        # Fallback: use all pixels if mask rejected too many
        valid_pixels = patch.reshape(-1, 3)

    bgr_med = np.median(valid_pixels, axis=0).astype(np.uint8)

    # Convert representative pixel to HSV & LAB
    pixel_bgr = np.array([[bgr_med]], dtype=np.uint8)
    hsv_med = cv2.cvtColor(pixel_bgr, cv2.COLOR_BGR2HSV)[0, 0]
    lab_float = _bgr_to_lab_float(bgr_med)

    return {
        "bgr": bgr_med.astype(np.float64),
        "hsv": hsv_med.astype(np.float64),
        "lab": lab_float,
    }


# ═══════════════════════════════════════════════════════════════════
#  Classification
# ═══════════════════════════════════════════════════════════════════

def classify_patch(
    rep_lab: np.ndarray,
    palette_labs: Dict[str, np.ndarray],
) -> Dict:
    """Classify a sticker into one of U/R/F/D/L/B via nearest palette colour.

    Confidence = (d2 − d1) / (d2 + d1 + ε)
    where d1, d2 are distances to nearest and second-nearest.
    Result is 0 when equidistant, approaches 1 when d1 ≪ d2.
    """
    dists = {face: delta_e_76(rep_lab, ref) for face, ref in palette_labs.items()}
    sorted_faces = sorted(dists, key=dists.get)

    d1 = dists[sorted_faces[0]]
    d2 = dists[sorted_faces[1]] if len(sorted_faces) > 1 else d1 + 1.0

    confidence = (d2 - d1) / (d2 + d1 + 1e-6)
    confidence = max(0.0, min(1.0, confidence))

    return {
        "face": sorted_faces[0],
        "confidence": round(confidence, 3),
        "delta_e": round(d1, 1),
    }


# ═══════════════════════════════════════════════════════════════════
#  Temporal Smoothing
# ═══════════════════════════════════════════════════════════════════

@dataclass
class _StickerFrame:
    """One temporal observation for a single sticker."""
    face: str
    confidence: float
    timestamp: float


class TemporalSmoother:
    """Per-sticker rolling-window majority-vote stabilisation.

    Stores ``{face, confidence, timestamp}`` per sticker per frame.
    A sticker is stable when:
      1. The most-frequent label has ≥ ``majority`` fraction of the window.
      2. The average confidence of those agreeing frames ≥ ``confidence_floor``.
    """

    def __init__(self, config: PipelineConfig = DEFAULT_CONFIG) -> None:
        self.window = config.temporal_window
        self.majority = config.temporal_majority
        self.conf_floor = config.confidence_floor
        # 9 independent deques, one per sticker position
        self._history: List[deque] = [deque(maxlen=self.window) for _ in range(9)]

    def update(
        self,
        classifications: List[Dict],
    ) -> Tuple[bool, List[bool], List[str]]:
        """Push a new frame and return stability results.

        Args:
            classifications: list of 9 dicts with keys ``face``, ``confidence``.

        Returns:
            (face_stable, [sticker_stable × 9], [stable_label × 9])
        """
        now = time.monotonic()

        if len(classifications) != 9:
            return False, [False] * 9, ["unknown"] * 9

        for i, cls in enumerate(classifications):
            self._history[i].append(_StickerFrame(
                face=cls["face"],
                confidence=cls["confidence"],
                timestamp=now,
            ))

        stable_flags: List[bool] = []
        stable_labels: List[str] = []

        for i in range(9):
            buf = self._history[i]
            if len(buf) < max(3, int(self.window * self.majority)):
                stable_flags.append(False)
                stable_labels.append(buf[-1].face if buf else "unknown")
                continue

            # Count occurrences
            counts: Dict[str, List[float]] = {}
            for entry in buf:
                counts.setdefault(entry.face, []).append(entry.confidence)

            # Find majority label
            best_label = max(counts, key=lambda k: len(counts[k]))
            best_count = len(counts[best_label])
            fraction = best_count / len(buf)
            avg_conf = float(np.mean(counts[best_label]))

            is_stable = fraction >= self.majority and avg_conf >= self.conf_floor
            stable_flags.append(is_stable)
            stable_labels.append(best_label if is_stable else buf[-1].face)

        face_stable = all(stable_flags)
        return face_stable, stable_flags, stable_labels

    def reset(self) -> None:
        """Clear all history."""
        for dq in self._history:
            dq.clear()


# ═══════════════════════════════════════════════════════════════════
#  Diagnostics
# ═══════════════════════════════════════════════════════════════════

def calculate_diagnostics(frame: np.ndarray) -> Dict[str, int]:
    """Calculate image-level quality diagnostics on a 0–100 scale.

    No contour detection required — operates on the raw frame.
    """
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

    # Lighting: deviation from ideal mid-grey (128)
    mean_val = float(np.mean(gray))
    lighting = int(100 - abs(128 - mean_val) * (100 / 128))
    lighting = max(0, min(100, lighting))

    # Sharpness: variance of Laplacian
    lap_var = float(cv2.Laplacian(gray, cv2.CV_64F).var())
    sharpness = min(100, int((lap_var / 500) * 100))

    # Glare: fraction of overexposed pixels
    glare_ratio = float(np.sum(gray > 240)) / gray.size
    glare = max(0, 100 - int(glare_ratio * 1000))  # 10 % glare → score 0

    return {
        "lighting": lighting,
        "sharpness": sharpness,
        "angle": 100,  # no contour-based angle check for live scanning
        "glare": glare,
    }


def _sticker_diagnostics(
    patch: np.ndarray,
    mask: np.ndarray,
    classification: Dict,
) -> Dict:
    """Per-sticker diagnostics for backend debugging.

    These are returned in the response but the frontend may ignore them.
    """
    total = mask.size
    valid = int(np.sum(mask > 0))
    return {
        "valid_pixels": valid,
        "total_pixels": total,
        "mask_ratio": round(valid / (total + 1e-6), 3),
        "delta_e": classification.get("delta_e", 0.0),
    }


# ═══════════════════════════════════════════════════════════════════
#  Main Pipeline — process_patches()
# ═══════════════════════════════════════════════════════════════════

def process_patches(
    frame: np.ndarray,
    overlay_coords: List[List[int]],
    palette_hex: Dict[str, str],
    smoother: TemporalSmoother,
    palette_cache: PaletteCache,
    config: PipelineConfig = DEFAULT_CONFIG,
) -> Dict:
    """Unified pipeline used by both live scanning and upload scanning.

    1. Crop patches from the frame.
    2. Preprocess each patch.
    3. Extract representative colour.
    4. Classify against the palette.
    5. Temporal update.
    6. Compute diagnostics.

    Returns a dict ready to be JSON-serialised and sent to the frontend.
    """
    # Palette (cached conversion)
    palette_labs = palette_cache.get(palette_hex)

    # Crop
    patches = crop_patches(frame, overlay_coords)

    # Per-sticker processing
    classifications: List[Dict] = []
    sticker_diags: List[Dict] = []

    for patch in patches:
        cleaned, mask = preprocess_patch(patch, config)
        rep = representative_color(cleaned, mask)
        cls = classify_patch(rep["lab"], palette_labs)
        classifications.append(cls)
        sticker_diags.append(_sticker_diagnostics(patch, mask, cls))

    # Temporal smoothing
    face_stable, square_stable, stable_labels = smoother.update(classifications)

    # Build sticker response (matches existing frontend contract)
    stickers = []
    for i, cls in enumerate(classifications):
        label = stable_labels[i] if square_stable[i] else cls["face"]
        stickers.append({
            "color": palette_hex.get(label, "unknown"),
            "confidence": cls["confidence"],
            "stable": square_stable[i],
            "diagnostics": sticker_diags[i],
        })

    # Frame-level diagnostics
    diagnostics = calculate_diagnostics(frame)

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
    """Find the largest quadrilateral contour in the image."""
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    edged = cv2.Canny(blurred, 50, 200)

    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
    edged = cv2.morphologyEx(edged, cv2.MORPH_CLOSE, kernel)

    contours, _ = cv2.findContours(edged, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not contours:
        return None

    contours = sorted(contours, key=cv2.contourArea, reverse=True)
    for cnt in contours:
        peri = cv2.arcLength(cnt, True)
        approx = cv2.approxPolyDP(cnt, 0.02 * peri, True)
        if len(approx) == 4:
            return approx.reshape(4, 2)

    return None


def _extract_patches_from_image(
    img: np.ndarray,
    config: PipelineConfig = DEFAULT_CONFIG,
) -> Tuple[List[np.ndarray], List[List[int]]]:
    """Detect cube face in an image, perspective-warp, extract 9 patches.

    Returns (patches, overlay_coords) where overlay_coords are synthetic
    coordinates within the warped image so that process_patches() can be
    reused.
    """
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
    """Scan a single uploaded face image.

    Detect face → Perspective Warp → Generate 9 patches →
    Preprocess → Classify (reuses the same pipeline as live scanning).

    Returns ``{"stickers": [...], "grid": [...], "diagnostics": {...}, "success": bool}``.
    """
    patches, coords = _extract_patches_from_image(img, config)

    if palette_hex:
        palette_labs = convert_palette_to_lab(palette_hex)

        stickers = []
        grid = [["" for _ in range(3)] for _ in range(3)]

        for i, patch in enumerate(patches):
            r, c = i // 3, i % 3
            cleaned, mask = preprocess_patch(patch, config)
            rep = representative_color(cleaned, mask)
            cls = classify_patch(rep["lab"], palette_labs)

            face_label = cls["face"]
            grid[r][c] = face_label
            stickers.append({
                "color": palette_hex.get(face_label, "unknown"),
                "confidence": cls["confidence"],
            })
    else:
        # No palette — return raw average colours
        stickers = []
        grid = [["" for _ in range(3)] for _ in range(3)]

        for i, patch in enumerate(patches):
            r, c = i // 3, i % 3
            bgr = np.median(patch.reshape(-1, 3), axis=0).astype(int)
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
    """Full 6-image upload pipeline.

    Reads 6 face images → detects faces → extracts stickers →
    calibrates centres → classifies → enforces global constraints.

    Returns ``(cube_string, face_grids, confidence_stats, palette)``.
    """
    if face_order is None:
        face_order = ["U", "R", "F", "D", "L", "B"]

    # Read images
    images: Dict[str, np.ndarray] = {}
    for f in face_order:
        images[f] = await read_image(files[f])

    # Extract patches and calibrate from centres
    face_patches: Dict[str, List[np.ndarray]] = {}
    for f in face_order:
        patches, _ = _extract_patches_from_image(images[f], config)
        face_patches[f] = patches

    # Build palette from centre stickers (index 4 = row 1 col 1)
    palette_hex: Dict[str, str] = {}
    palette_display: List[Dict] = []
    centre_labs: Dict[str, np.ndarray] = {}

    for f in face_order:
        centre_patch = face_patches[f][4]
        cleaned, mask = preprocess_patch(centre_patch, config)
        rep = representative_color(cleaned, mask)
        centre_labs[f] = rep["lab"]

        bgr_int = rep["bgr"].astype(int)
        rgb = bgr_int[::-1]
        hex_color = "#{:02x}{:02x}{:02x}".format(*rgb)
        palette_hex[f] = hex_color
        palette_display.append({"face": f, "color": hex_color, "label": f"{f} Face (Calibrated)"})

    # Classify all stickers
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

            cleaned, mask = preprocess_patch(patch, config)
            rep = representative_color(cleaned, mask)
            cls = classify_patch(rep["lab"], centre_labs)
            grid[row][col] = cls["face"]
            confs[row][col] = cls["confidence"]

        face_grids[f] = grid
        face_confs[f] = confs

    # Global constraint enforcement
    face_grids, face_confs = _enforce_global_constraints(face_grids, face_confs)

    # Build Kociemba string
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
    """Enforce exactly 9 stickers per face letter.

    Reassigns lowest-confidence surplus stickers to deficit faces.
    """
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
