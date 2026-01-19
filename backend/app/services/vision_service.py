import cv2, os
import numpy as np
import imutils
from typing import Dict, List, Tuple

# ---------- Image IO ----------
async def read_image(file) -> np.ndarray:
    data = await file.read()
    img = cv2.imdecode(np.frombuffer(data, np.uint8), cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError(f"Invalid image uploaded: {file.filename}")
    return img

# ---------- Geometry Helpers ----------
def order_points(pts):
    """
    Orders coordinates in format: top-left, top-right, bottom-right, bottom-left
    """
    rect = np.zeros((4, 2), dtype="float32")
    
    # Top-left has smallest sum, Bottom-right has largest sum
    s = pts.sum(axis=1)
    rect[0] = pts[np.argmin(s)]
    rect[2] = pts[np.argmax(s)]
    
    # Top-right has smallest diff, Bottom-left has largest diff
    diff = np.diff(pts, axis=1)
    rect[1] = pts[np.argmin(diff)]
    rect[3] = pts[np.argmax(diff)]
    
    return rect

def get_face_contour(img):
    """
    Finds the largest 4-sided polygon in the image (the cube face).
    """
    # 1. Preprocessing
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    
    # 2. Edge Detection (Adaptive Threshold is often better than Canny for varying light)
    edged = cv2.Canny(blurred, 50, 200)
    
    # 3. Find Contours
    cnts = cv2.findContours(edged.copy(), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    cnts = imutils.grab_contours(cnts)
    
    if not cnts:
        return None

    # Sort by area (largest first)
    cnts = sorted(cnts, key=cv2.contourArea, reverse=True)

    for c in cnts:
        # Approximate contour
        peri = cv2.arcLength(c, True)
        approx = cv2.approxPolyDP(c, 0.02 * peri, True)

        # If it has 4 points, we assume it's the face
        if len(approx) == 4:
            return approx.reshape(4, 2)

    # Fallback: If no square found, return the whole image corners
    h, w = img.shape[:2]
    return np.array([[0,0], [w,0], [w,h], [0,h]], dtype="float32")

# ---------- Sticker Extraction ----------
def extract_stickers(img) -> List[np.ndarray]:
    """
    Warps the detected face into a flat 300x300 square and extracts 9 clean patches.
    """
    # 1. Get the face contour
    pts = get_face_contour(img)
    if pts is None:
        # Extreme fallback just in case
        h, w = img.shape[:2]
        pts = np.array([[0,0], [w,0], [w,h], [0,h]], dtype="float32")

    # 2. Perspective Warp to flat square
    rect = order_points(pts)
    dst_size = 300
    dst = np.array([
        [0, 0],
        [dst_size - 1, 0],
        [dst_size - 1, dst_size - 1],
        [0, dst_size - 1]], dtype="float32")

    M = cv2.getPerspectiveTransform(rect, dst)
    warped = cv2.warpPerspective(img, M, (dst_size, dst_size))

    # 3. Slice into 9 patches
    step = dst_size // 3
    patches = []

    # Safe margin: ignore the outer 25% of each sticker to avoid black borders
    margin = int(step * 0.25)

    for y in range(3):
        for x in range(3):
            y_start = y * step
            x_start = x * step
            
            # Crop the CENTER of the sticker only
            patch = warped[
                y_start + margin : y_start + step - margin,
                x_start + margin : x_start + step - margin
            ]
            patches.append(patch)

    if len(patches) != 9:
        raise ValueError("Failed to extract 9 sticker regions")

    return patches

# ---------- Color Logic ----------
def get_dominant_color(patch):
    """
    Convert patch to LAB and get mean color.
    LAB is perceptually uniform, making it better for color distance than RGB.
    """
    lab_patch = cv2.cvtColor(patch, cv2.COLOR_BGR2LAB)
    return np.mean(lab_patch.reshape(-1, 3), axis=0)

def classify_color(lab, center_labs):
    """
    Finds the closest center color using Euclidean distance in LAB space.
    """
    best_face, best_dist = None, float('inf')
    
    for face, ref_lab in center_labs.items():
        # Euclidean distance
        d = np.linalg.norm(lab - ref_lab)
        
        if d < best_dist:
            best_dist = d
            best_face = face
            
    return best_face

def build_kociemba_string(face_grids: Dict[str, list]) -> str:
    # U R F D L B order is standard for solvers
    order = ["U", "R", "F", "D", "L", "B"]
    return "".join("".join(row) for f in order for row in face_grids[f])

# ---------- Learned Sticker Classifier ----------
class StickerClassifier:
    def __init__(self, model_path: str, class_names: List[str]):
        try:
            import onnxruntime as ort
        except Exception:
            raise RuntimeError("Sticker classifier runtime not available")
        self.session = ort.InferenceSession(model_path, providers=["CPUExecutionProvider"])
        self.input_name = self.session.get_inputs()[0].name
        self.input_shape = self.session.get_inputs()[0].shape
        self.class_names = class_names
    def _preprocess(self, patch: np.ndarray) -> np.ndarray:
        h = self.input_shape[2] if isinstance(self.input_shape[2], int) else 64
        w = self.input_shape[3] if isinstance(self.input_shape[3], int) else 64
        img = cv2.cvtColor(patch, cv2.COLOR_BGR2RGB)
        img = cv2.resize(img, (w, h), interpolation=cv2.INTER_AREA)
        arr = img.astype(np.float32) / 255.0
        arr = np.transpose(arr, (2, 0, 1))
        return arr
    def predict_batch(self, patches: List[np.ndarray]) -> List[Tuple[str, float]]:
        import numpy as _np
        batch = _np.stack([self._preprocess(p) for p in patches], axis=0)
        outputs = self.session.run(None, {self.input_name: batch})[0]
        x = outputs - _np.max(outputs, axis=1, keepdims=True)
        e = _np.exp(x)
        probs = e / _np.sum(e, axis=1, keepdims=True)
        res: List[Tuple[str, float]] = []
        for i in range(probs.shape[0]):
            idx = int(_np.argmax(probs[i]))
            res.append((self.class_names[idx], float(probs[i][idx])))
        return res

# ---------- Global Constraint Enforcement ----------
def enforce_global_constraints(face_grids: Dict[str, List[List[str]]], confidences: Dict[str, List[List[float]]]) -> Tuple[Dict[str, List[List[str]]], Dict[str, List[List[float]]]]:
    classes = ["U", "R", "F", "D", "L", "B"]
    items: List[Dict[str, any]] = []
    for f in face_grids:
        for r in range(3):
            for c in range(3):
                items.append({"face": f, "r": r, "c": c, "label": face_grids[f][r][c], "conf": confidences[f][r][c], "locked": (r == 1 and c == 1)})
    counts = {k: 0 for k in classes}
    for it in items:
        counts[it["label"]] += 1
    target = {k: 9 for k in classes}
    surplus = {k: max(0, counts[k] - target[k]) for k in classes}
    shortage = {k: max(0, target[k] - counts[k]) for k in classes}
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
        raise ValueError("Inconsistent color counts across faces")
    new_faces: Dict[str, List[List[str]]] = {f: [["" for _ in range(3)] for _ in range(3)] for f in face_grids}
    new_confs: Dict[str, List[List[float]]] = {f: [[0.0 for _ in range(3)] for _ in range(3)] for f in face_grids}
    for it in items:
        new_faces[it["face"]][it["r"]][it["c"]] = it["label"]
        new_confs[it["face"]][it["r"]][it["c"]] = it["conf"] if not it["locked"] else 1.0
    return new_faces, new_confs
# ---------- Main Pipeline ----------
async def scan_cube_from_images(files):
    face_order = ["U", "R", "F", "D", "L", "B"]

    # 1. Read Images
    faces = {}
    for f in face_order:
        faces[f] = await read_image(files[f])

    # 2. Extract Patches (Geometry Phase)
    face_patches = {}
    for f in face_order:
        # Resize helps normalize contour detection area
        resized = imutils.resize(faces[f], width=600)
        face_patches[f] = extract_stickers(resized)

    # 3. PHASE 1 - COLOR CALIBRATION (Adaptive Agentic Logic)
    # "Identify ONLY the CENTER sticker... Determine its real-world cube color."
    center_labs = {}
    ui_palette = []
    
    for f in face_order:
        center_patch = face_patches[f][4] # Index 4 is the center (1,1)
        
        # LAB for internal calculation (perceptual distance)
        lab = get_dominant_color(center_patch)
        center_labs[f] = lab
        
        # RGB for frontend display (Phase 1 Output Requirement)
        bgr_mean = np.mean(center_patch.reshape(-1, 3), axis=0)
        rgb = bgr_mean[::-1].astype(int)
        hex_color = "#{:02x}{:02x}{:02x}".format(*rgb)
        
        # Standardize strictly to what frontend expects, but based on calibration
        ui_palette.append({
            "face": f, 
            "color": hex_color, 
            "label": f"{f} Face (Calibrated)"
        })

    # 4. PHASE 2 - FACE GRID EXTRACTION
    # "Using ONLY the calibrated color palette... Visually divide... determine which face color matches best."
    face_grids = {}
    face_confs = {}
    
    for f in face_order:
        grid = [["" for _ in range(3)] for _ in range(3)]
        confs = [[0.0 for _ in range(3)] for _ in range(3)]
        
        for i, patch in enumerate(face_patches[f]):
            row = i // 3
            col = i % 3
            
            # "The center cell MUST always match the face’s own letter."
            if row == 1 and col == 1:
                grid[row][col] = f
                confs[row][col] = 1.0
                continue
            
            lab = get_dominant_color(patch)
            best_face = classify_color(lab, center_labs)
            
            # Calculate a confidence score for the constraint solver
            dists = {k: np.linalg.norm(lab - v) for k, v in center_labs.items()}
            sorted_dists = sorted(dists.values())
            d1, d2 = sorted_dists[0], sorted_dists[1]
            conf = 1.0 - (d1 / (d2 + 1e-6)) 
            conf = max(0.0, min(1.0, conf))
            
            grid[row][col] = best_face
            confs[row][col] = conf
            
        face_grids[f] = grid
        face_confs[f] = confs

    # 5. GLOBAL CONSTRAINTS
    # "Exactly 9 stickers per color... Exactly 6 colors total."
    face_grids, face_confs = enforce_global_constraints(face_grids, face_confs)
    
    # 6. Final Formatting
    cube_string = build_kociemba_string(face_grids)
    all_confs = [face_confs[f][r][c] for f in face_order for r in range(3) for c in range(3)]
    conf_stats = {
        "min": float(np.min(all_confs)) if all_confs else 0.0, 
        "mean": float(np.mean(all_confs)) if all_confs else 0.0
    }
    
    return cube_string, face_grids, conf_stats, ui_palette
