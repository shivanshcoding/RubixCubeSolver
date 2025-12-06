from typing import Dict, List, Tuple
import numpy as np
import cv2
from fastapi import UploadFile


async def scan_cube_from_images(face_files: Dict[str, UploadFile]) -> Tuple[str, Dict[str, List[List[str]]]]:
    """
    Very lightweight stub vision service that:
    - Reads each face image
    - Divides into a 3x3 grid
    - Samples per-sticker color (unused in stub mapping)
    - Uses center stickers to define canonical face letters
    - Produces a 54-char cube string in Kociemba order: U,R,F,D,L,B

    NOTE: This is a stub suitable for initial integration testing.
    It assumes images are captured face-on with roughly uniform sticker sizes.
    """

    async def _read_image(upload: UploadFile) -> np.ndarray:
        data = await upload.read()
        arr = np.frombuffer(data, dtype=np.uint8)
        img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
        if img is None:
            raise ValueError("Invalid image data")
        return img

    def _sample_face_grid(img: np.ndarray) -> List[List[Tuple[int, int, int]]]:
        h, w = img.shape[:2]
        cell_h = h // 3
        cell_w = w // 3
        colors_grid: List[List[Tuple[int, int, int]]] = []
        for r in range(3):
            row: List[Tuple[int, int, int]] = []
            for c in range(3):
                y0 = r * cell_h
                x0 = c * cell_w
                y1 = min((r + 1) * cell_h, h)
                x1 = min((c + 1) * cell_w, w)
                roi = img[y0:y1, x0:x1]
                # Sample mean color in BGR
                b, g, rch, *_ = cv2.mean(roi)
                row.append((int(rch), int(g), int(b)))  # Convert to RGB tuple
            colors_grid.append(row)
        return colors_grid

    # Read and sample all faces
    face_color_grids: Dict[str, List[List[Tuple[int, int, int]]]] = {}
    for face_letter in ["U", "R", "F", "D", "L", "B"]:
        img = await _read_image(face_files[face_letter])
        face_color_grids[face_letter] = _sample_face_grid(img)

    # Define canonical mapping using center sticker (row=1, col=1)
    canonical_centers: Dict[str, Tuple[int, int, int]] = {
        f: face_color_grids[f][1][1] for f in ["U", "R", "F", "D", "L", "B"]
    }

    def _nearest_face(rgb: Tuple[int, int, int]) -> str:
        # Euclidean distance to canonical centers
        ar = np.array(rgb, dtype=np.float32)
        best_face = None
        best_dist = 1e9
        for f, center in canonical_centers.items():
            cr = np.array(center, dtype=np.float32)
            d = float(np.linalg.norm(ar - cr))
            if d < best_dist:
                best_dist = d
                best_face = f
        return best_face or "U"

    # Map each sticker to nearest canonical face letter
    faces_labels: Dict[str, List[List[str]]] = {}
    for f in ["U", "R", "F", "D", "L", "B"]:
        labels_grid: List[List[str]] = []
        for r in range(3):
            row_labels: List[str] = []
            for c in range(3):
                rgb = face_color_grids[f][r][c]
                # Ensure center sticks keep their own face
                if r == 1 and c == 1:
                    row_labels.append(f)
                else:
                    row_labels.append(_nearest_face(rgb))
            labels_grid.append(row_labels)
        faces_labels[f] = labels_grid

    # Produce cube string in Kociemba order U,R,F,D,L,B, row-major
    def _flatten_face(face_grid: List[List[str]]) -> List[str]:
        return [face_grid[r][c] for r in range(3) for c in range(3)]

    cube_string = "".join(
        _flatten_face(faces_labels[f]) for f in ["U", "R", "F", "D", "L", "B"]
    )

    return cube_string, faces_labels
