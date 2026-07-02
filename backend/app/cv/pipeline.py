"""
CubeVision AI — Computer Vision Pipeline

Image preprocessing, contour detection, color classification,
and face extraction using OpenCV. Evolved from RubixCubeSolver.
"""

import cv2
import numpy as np
from typing import Dict, List, Tuple, Optional


def calculate_diagnostics(img: np.ndarray, pts: Optional[np.ndarray]) -> Dict[str, int]:
    """Calculate image quality diagnostics (0-100 scale)."""
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    
    # Lighting: 0=too dark/bright, 100=perfect (around 128)
    mean_val = np.mean(gray)
    lighting = int(100 - abs(128 - mean_val) * (100/128))
    lighting = max(0, min(100, lighting))

    # Sharpness: Variance of Laplacian (scale arbitrarily, assume >100 is sharp)
    lap_var = cv2.Laplacian(gray, cv2.CV_64F).var()
    sharpness = min(100, int((lap_var / 500) * 100))

    # Angle: based on contour if available
    angle = 100
    if pts is not None and len(pts) == 4:
        # Calculate aspect ratio and squareness
        d1 = np.linalg.norm(pts[0] - pts[1])
        d2 = np.linalg.norm(pts[1] - pts[2])
        if d1 > 0 and d2 > 0:
            ratio = min(d1, d2) / max(d1, d2)
            angle = int(ratio * 100)

    # Glare: Percentage of overexposed pixels
    glare_pixels = np.sum(gray > 240)
    total_pixels = gray.size
    glare_ratio = glare_pixels / total_pixels
    glare = max(0, 100 - int(glare_ratio * 1000)) # 10% glare = 0 score

    return {
        "lighting": lighting,
        "sharpness": sharpness,
        "angle": angle,
        "glare": glare
    }

# ─── Image Preprocessing ─────────────────────────────────────────

def preprocess_image(img: np.ndarray) -> np.ndarray:
    """
    Apply preprocessing pipeline:
    - Resize for consistent processing
    - Gaussian blur for noise reduction
    - Brightness normalization
    - White balance compensation
    """
    # Resize to consistent width
    h, w = img.shape[:2]
    target_width = 600
    scale = target_width / w
    img = cv2.resize(img, (target_width, int(h * scale)))

    # Apply CLAHE for brightness normalization
    lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)
    l_channel, a_channel, b_channel = cv2.split(lab)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    l_channel = clahe.apply(l_channel)
    lab = cv2.merge([l_channel, a_channel, b_channel])
    img = cv2.cvtColor(lab, cv2.COLOR_LAB2BGR)

    # Simple white balance (gray world assumption)
    img = white_balance(img)

    return img


def white_balance(img: np.ndarray) -> np.ndarray:
    """Apply gray world white balance."""
    result = img.copy().astype(np.float32)
    avg_b = np.mean(result[:, :, 0])
    avg_g = np.mean(result[:, :, 1])
    avg_r = np.mean(result[:, :, 2])
    avg = (avg_b + avg_g + avg_r) / 3.0

    result[:, :, 0] *= avg / (avg_b + 1e-6)
    result[:, :, 1] *= avg / (avg_g + 1e-6)
    result[:, :, 2] *= avg / (avg_r + 1e-6)

    return np.clip(result, 0, 255).astype(np.uint8)


# ─── Contour Detection ───────────────────────────────────────────

def order_points(pts: np.ndarray) -> np.ndarray:
    """Order points: top-left, top-right, bottom-right, bottom-left."""
    rect = np.zeros((4, 2), dtype="float32")
    s = pts.sum(axis=1)
    rect[0] = pts[np.argmin(s)]
    rect[2] = pts[np.argmax(s)]
    diff = np.diff(pts, axis=1)
    rect[1] = pts[np.argmin(diff)]
    rect[3] = pts[np.argmax(diff)]
    return rect


def detect_face_contour(img: np.ndarray) -> Optional[np.ndarray]:
    """Find the largest 4-sided polygon (the cube face)."""
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    edged = cv2.Canny(blurred, 50, 200)

    # Morphological operations to close gaps
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
    edged = cv2.morphologyEx(edged, cv2.MORPH_CLOSE, kernel)

    contours, _ = cv2.findContours(
        edged, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
    )

    if not contours:
        return None

    contours = sorted(contours, key=cv2.contourArea, reverse=True)

    for cnt in contours:
        peri = cv2.arcLength(cnt, True)
        approx = cv2.approxPolyDP(cnt, 0.02 * peri, True)
        if len(approx) == 4:
            return approx.reshape(4, 2)

    # Fallback: use image bounds
    h, w = img.shape[:2]
    return np.array([[0, 0], [w, 0], [w, h], [0, h]], dtype="float32")


# ─── Sticker Extraction ──────────────────────────────────────────

def extract_stickers(img: np.ndarray) -> Tuple[List[np.ndarray], Optional[np.ndarray]]:
    """
    Warp detected face to flat 300x300 square and extract 9 patches.
    Uses perspective correction for angled photos.
    Returns (patches, pts).
    """
    pts = detect_face_contour(img)
    if pts is None:
        h, w = img.shape[:2]
        pts = np.array([[0, 0], [w, 0], [w, h], [0, h]], dtype="float32")

    rect = order_points(pts.astype("float32"))
    dst_size = 300
    dst = np.array([
        [0, 0],
        [dst_size - 1, 0],
        [dst_size - 1, dst_size - 1],
        [0, dst_size - 1],
    ], dtype="float32")

    M = cv2.getPerspectiveTransform(rect, dst)
    warped = cv2.warpPerspective(img, M, (dst_size, dst_size))

    # Extract 9 patches with margin to avoid borders
    step = dst_size // 3
    margin = int(step * 0.22)
    patches = []

    for y in range(3):
        for x in range(3):
            y_start = y * step + margin
            y_end = (y + 1) * step - margin
            x_start = x * step + margin
            x_end = (x + 1) * step - margin
            patch = warped[y_start:y_end, x_start:x_end]
            patches.append(patch)

    if len(patches) != 9:
        raise ValueError("Failed to extract 9 sticker regions")

    return patches, pts

def crop_stickers_from_coords(img: np.ndarray, coords: List[List[int]]) -> List[np.ndarray]:
    """
    Crop 9 regions directly from image based on coordinates [x, y, w, h].
    """
    if len(coords) != 9:
        raise ValueError("Expected exactly 9 coordinate regions.")
    
    patches = []
    h_img, w_img = img.shape[:2]
    
    for (x, y, w, h) in coords:
        x1 = max(0, int(x))
        y1 = max(0, int(y))
        x2 = min(w_img, int(x + w))
        y2 = min(h_img, int(y + h))
        
        patch = img[y1:y2, x1:x2]
        if patch.size == 0:
            patch = np.zeros((10, 10, 3), dtype=np.uint8)
        patches.append(patch)
        
    return patches


# ─── Color Classification ────────────────────────────────────────

def get_dominant_color_lab(patch: np.ndarray) -> np.ndarray:
    """Get mean color of a patch in LAB space (perceptually uniform)."""
    lab_patch = cv2.cvtColor(patch, cv2.COLOR_BGR2LAB)
    return np.mean(lab_patch.reshape(-1, 3), axis=0)


def get_dominant_color_hsv(patch: np.ndarray) -> np.ndarray:
    """Get mean color in HSV space for hue-based classification."""
    hsv_patch = cv2.cvtColor(patch, cv2.COLOR_BGR2HSV)
    return np.mean(hsv_patch.reshape(-1, 3), axis=0)


def classify_color_lab(
    lab: np.ndarray,
    center_labs: Dict[str, np.ndarray],
) -> Tuple[str, float]:
    """
    Classify a color by nearest center in LAB space.
    Returns (face_letter, confidence).
    """
    dists = {
        face: np.linalg.norm(lab - ref)
        for face, ref in center_labs.items()
    }
    sorted_faces = sorted(dists, key=dists.get)
    best_face = sorted_faces[0]

    # Confidence: ratio between best and second-best distance
    d1 = dists[sorted_faces[0]]
    d2 = dists[sorted_faces[1]]
    confidence = 1.0 - (d1 / (d2 + 1e-6))
    confidence = max(0.0, min(1.0, confidence))

    return best_face, confidence


# ─── HSV Color Classification ────────────────────────────────────

# Configurable HSV thresholds for each standard Rubik's cube color
HSV_RANGES = {
    "red":    [((0, 100, 80), (10, 255, 255)), ((160, 100, 80), (180, 255, 255))],
    "orange": [((10, 100, 80), (25, 255, 255))],
    "yellow": [((25, 80, 80), (40, 255, 255))],
    "green":  [((40, 50, 50), (85, 255, 255))],
    "blue":   [((85, 50, 50), (130, 255, 255))],
    "white":  [((0, 0, 180), (180, 50, 255))],
}


def classify_color_hsv(patch: np.ndarray) -> Tuple[str, float]:
    """
    Classify color using HSV ranges.
    Returns (color_name, confidence).
    """
    hsv = cv2.cvtColor(patch, cv2.COLOR_BGR2HSV)

    best_color = "unknown"
    best_ratio = 0.0
    total_pixels = hsv.shape[0] * hsv.shape[1]

    for color_name, ranges in HSV_RANGES.items():
        mask = np.zeros(hsv.shape[:2], dtype=np.uint8)
        for lower, upper in ranges:
            mask |= cv2.inRange(hsv, np.array(lower), np.array(upper))

        ratio = np.sum(mask > 0) / total_pixels
        if ratio > best_ratio:
            best_ratio = ratio
            best_color = color_name

    return best_color, best_ratio


# ─── Global Constraint Enforcement ───────────────────────────────

def enforce_global_constraints(
    face_grids: Dict[str, List[List[str]]],
    confidences: Dict[str, List[List[float]]],
) -> Tuple[Dict[str, List[List[str]]], Dict[str, List[List[float]]]]:
    """
    Enforce exactly 9 stickers per face letter.
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
        counts[it["label"]] += 1

    surplus = {k: max(0, counts[k] - 9) for k in classes}
    shortage = {k: max(0, 9 - counts[k]) for k in classes}

    # Sort unlocked items by confidence (lowest first = most uncertain)
    pool = [it for it in items if not it["locked"]]
    pool.sort(key=lambda x: x["conf"])

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
        raise ValueError("Cannot enforce global color constraints")

    # Rebuild grids
    new_faces = {f: [["" for _ in range(3)] for _ in range(3)] for f in face_grids}
    new_confs = {f: [[0.0 for _ in range(3)] for _ in range(3)] for f in face_grids}

    for it in items:
        new_faces[it["face"]][it["r"]][it["c"]] = it["label"]
        new_confs[it["face"]][it["r"]][it["c"]] = (
            1.0 if it["locked"] else it["conf"]
        )

    return new_faces, new_confs


# ─── Temporal Smoothing ──────────────────────────────────────────

class TemporalSmoother:
    """
    Smooths color detection over multiple frames on a per-sticker basis.
    Accepts a sticker when its color is stable for N consecutive frames with >= 75% confidence.
    """

    def __init__(self, required_stable_frames: int = 5, min_confidence: float = 0.75):
        self.required_stable_frames = required_stable_frames
        self.min_confidence = min_confidence
        self.history: List[List[Dict]] = []

    def add_frame(self, flat_stickers: List[Dict]) -> Tuple[bool, List[bool]]:
        """
        Add a frame detection result (list of 9 {"color": str, "confidence": float}).
        Returns (face_stable, [square_stable_1, ..., square_stable_9])
        """
        if len(flat_stickers) != 9:
            return False, [False] * 9

        self.history.append(flat_stickers)

        if len(self.history) > self.required_stable_frames:
            self.history.pop(0)

        if len(self.history) < self.required_stable_frames:
            return False, [False] * 9

        stable_flags = []
        for i in range(9):
            ref_color = self.history[0][i].get("color", "unknown")
            if ref_color == "unknown":
                stable_flags.append(False)
                continue
                
            is_stable = True
            for frame in self.history:
                if frame[i].get("color") != ref_color or frame[i].get("confidence", 0) < self.min_confidence:
                    is_stable = False
                    break
            stable_flags.append(is_stable)

        return all(stable_flags), stable_flags

    def reset(self):
        """Reset smoothing history."""
        self.history = []


# ─── Main Pipeline ────────────────────────────────────────────────

async def read_image(file) -> np.ndarray:
    """Read an uploaded file into an OpenCV image."""
    data = await file.read()
    img = cv2.imdecode(np.frombuffer(data, np.uint8), cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError(f"Invalid image: {file.filename}")
    return img


async def scan_cube_from_images(
    files: Dict,
    face_order: List[str] = None,
) -> Tuple[str, Dict, Dict, List]:
    """
    Full CV pipeline: read images → preprocess → extract stickers →
    calibrate centers → classify colors → enforce constraints.

    Returns:
        (cube_string, face_grids, confidence_stats, palette)
    """
    if face_order is None:
        face_order = ["U", "R", "F", "D", "L", "B"]

    # 1. Read and preprocess images
    faces = {}
    for f in face_order:
        img = await read_image(files[f])
        faces[f] = preprocess_image(img)

    # 2. Extract sticker patches
    face_patches = {}
    for f in face_order:
        patches, _ = extract_stickers(faces[f])
        face_patches[f] = patches

    # 3. Calibrate colors from center stickers (LAB space)
    center_labs = {}
    palette = []

    for f in face_order:
        center_patch = face_patches[f][4]  # Index 4 = center (1,1)
        lab = get_dominant_color_lab(center_patch)
        center_labs[f] = lab

        # Get RGB for frontend display
        bgr_mean = np.mean(center_patch.reshape(-1, 3), axis=0)
        rgb = bgr_mean[::-1].astype(int)
        hex_color = "#{:02x}{:02x}{:02x}".format(*rgb)

        palette.append({
            "face": f,
            "color": hex_color,
            "label": f"{f} Face (Calibrated)",
        })

    # 4. Classify all stickers
    face_grids = {}
    face_confs = {}

    for f in face_order:
        grid = [["" for _ in range(3)] for _ in range(3)]
        confs = [[0.0 for _ in range(3)] for _ in range(3)]

        for i, patch in enumerate(face_patches[f]):
            row, col = i // 3, i % 3

            # Center is always the face itself
            if row == 1 and col == 1:
                grid[row][col] = f
                confs[row][col] = 1.0
                continue

            lab = get_dominant_color_lab(patch)
            best_face, confidence = classify_color_lab(lab, center_labs)

            grid[row][col] = best_face
            confs[row][col] = confidence

        face_grids[f] = grid
        face_confs[f] = confs

    # 5. Enforce global constraints
    face_grids, face_confs = enforce_global_constraints(face_grids, face_confs)

    # 6. Build Kociemba string
    cube_string = "".join(
        "".join(row) for f in face_order for row in face_grids[f]
    )

    all_confs = [
        face_confs[f][r][c]
        for f in face_order
        for r in range(3)
        for c in range(3)
    ]
    conf_stats = {
        "min": float(np.min(all_confs)) if all_confs else 0.0,
        "mean": float(np.mean(all_confs)) if all_confs else 0.0,
    }

    return cube_string, face_grids, conf_stats, palette
