import cv2
import numpy as np
from typing import Dict, Tuple
from sklearn.cluster import KMeans


# Helper: Convert UploadFile to OpenCV image
async def read_image(file) -> np.ndarray:
    data = await file.read()
    img = cv2.imdecode(np.frombuffer(data, np.uint8), cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError(f"Invalid image: {file.filename}")
    return img


# Extract dominant color of each patch region
def dominant_color(patch: np.ndarray) -> np.ndarray:
    data = patch.reshape((-1, 3))
    kmeans = KMeans(n_clusters=1, n_init='auto').fit(data)
    return kmeans.cluster_centers_[0]


# Build cube string from faces
def build_kociemba_string(face_maps: Dict[str, list]) -> str:
    order = ["U", "R", "F", "D", "L", "B"]
    result = ""
    for f in order:
        for row in face_maps[f]:
            result += "".join(row)
    return result


# Main entry for /api/scan
async def scan_cube_from_images(files: Dict[str, object]) -> Tuple[str, dict]:
    face_grids = {f: [["?" for _ in range(3)] for _ in range(3)] for f in files.keys()}
    color_vectors = []

    # Read all faces
    faces_opencv = {label: await read_image(file) for label, file in files.items()}

    # Process each face image
    for label, img in faces_opencv.items():
        h, w = img.shape[:2]
        cell_h, cell_w = h // 3, w // 3

        for r in range(3):
            for c in range(3):
                y1, y2 = r * cell_h, (r + 1) * cell_h
                x1, x2 = c * cell_w, (c + 1) * cell_w
                patch = img[y1:y2, x1:x2]

                col = dominant_color(patch)
                color_vectors.append(col)

    # Cluster for 6 colors
    kmeans = KMeans(n_clusters=6, n_init="auto").fit(np.array(color_vectors))
    centers = kmeans.cluster_centers_

    # Assign cluster labels to face letters by center sticker rule
    cluster_to_face = {}
    for face in files.keys():
        img = faces_opencv[face]
        h, w = img.shape[:2]
        center = img[h//3:h*2//3, w//3:w*2//3]  # center patch
        center_color = dominant_color(center).reshape(1,-1)
        idx = kmeans.predict(center_color)[0]
        cluster_to_face[idx] = face

    # Reconstruct 3x3 grids with proper labels
    idx = 0
    for face in ["U","R","F","D","L","B"]:
        img = faces_opencv[face]
        h, w = img.shape[:2]
        cell_h, cell_w = h // 3, w // 3
        for r in range(3):
            for c in range(3):
                y1, y2 = r * cell_h, (r + 1) * cell_h
                x1, x2 = c * cell_w, (c + 1) * cell_w
                patch = img[y1:y2, x1:x2]
                col = dominant_color(patch).reshape(1,-1)
                cluster = kmeans.predict(col)[0]
                face_grids[face][r][c] = cluster_to_face.get(cluster, "?")
                idx += 1

    # Build cube string for solver (URFDLB order)
    cube_string = build_kociemba_string(face_grids)

    return cube_string, face_grids
