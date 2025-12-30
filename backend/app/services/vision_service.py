import cv2
import numpy as np
from typing import Dict, Tuple
from sklearn.cluster import KMeans
import imutils

def extract_stickers(img):
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    blur = cv2.GaussianBlur(hsv, (7,7), 0)
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)
    l,a,b = cv2.split(lab)
    cla = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8,8))
    l2 = cla.apply(l)
    lab = cv2.merge((l2,a,b))
    img = cv2.cvtColor(lab, cv2.COLOR_LAB2BGR)

    edged = cv2.Canny(gray, 50, 150)

    cnts = cv2.findContours(edged, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    cnts = imutils.grab_contours(cnts)

    squares = []
    for c in cnts:
        peri = cv2.arcLength(c, True)
        approx = cv2.approxPolyDP(c, 0.04 * peri, True)
        area = cv2.contourArea(c)

        # sticker-like contour
        if len(approx) == 4 and 400 < area < 50000 and 0.7 < w/h < 1.3:
            x,y,w,h = cv2.boundingRect(approx)
            squares.append((x,y,w,h))

    if len(squares) < 9:
        # Try sorting best candidates (largest areas)
        squares = sorted(squares, key=lambda s: s[2]*s[3], reverse=True)[:9]

    if len(squares) != 9:
        raise ValueError(f"Detected {len(squares)} stickers, need 9. Adjust photo angle / lighting.")


    # sort top→bottom then left→right
    squares = sorted(squares, key=lambda s: (s[1], s[0]))

    patches = []
    for (x,y,w,h) in squares[:9]:
        # Take safe center region to avoid borders / reflection
        region = img[y+h//4:y+3*h//4, x+w//4:x+3*w//4]
        hsv = cv2.cvtColor(region, cv2.COLOR_BGR2HSV).reshape(-1,3).mean(axis=0)
        patches.append(hsv)

    return patches  # list of 9 HSV vectors



async def read_image(file) -> np.ndarray:
    data = await file.read()
    img = cv2.imdecode(np.frombuffer(data, np.uint8), cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError(f"Invalid image: {file.filename}")
    return img


def dominant_color_hsv(patch: np.ndarray) -> np.ndarray:
    hsv = cv2.cvtColor(patch, cv2.COLOR_BGR2HSV)
    data = hsv.reshape((-1, 3))
    kmeans = KMeans(n_clusters=1, n_init='auto').fit(data)
    return kmeans.cluster_centers_[0]


def build_kociemba_string(face_maps: Dict[str, list]) -> str:
    order = ["U", "R", "F", "D", "L", "B"]
    result = ""
    for f in order:
        for row in face_maps[f]:
            result += "".join(row)
    return result


async def scan_cube_from_images(files):
    faces = {f: await read_image(files[f]) for f in files}
    face_order = ["U","R","F","D","L","B"]

    # 1) Detect 9 stickers per face
    face_hsv = {}
    all_samples = []
    for f in face_order:
        hsv9 = extract_stickers(faces[f])
        face_hsv[f] = hsv9
        all_samples.extend(hsv9)

    # 2) Cluster all sampled stickers
    kmeans = KMeans(6, n_init="auto").fit(np.array(all_samples))

    # 3) Identify reference cluster for each face by its center sticker
    cluster_to_face = {}
    for f in face_order:
        center = np.array(face_hsv[f][4]).reshape(1,-1)
        idx = kmeans.predict(center)[0]
        cluster_to_face[idx] = f

    # 4) Assign every sticker
    face_grids = {}
    i = 0
    for f in face_order:
        grid = [["" for _ in range(3)] for _ in range(3)]
        for r in range(3):
            for c in range(3):
                hsv = np.array(face_hsv[f][3*r+c]).reshape(1,-1)
                cluster = kmeans.predict(hsv)[0]
                grid[r][c] = cluster_to_face.get(cluster, "?")
        face_grids[f] = grid

    # 5) Build solver string
    cube_string = build_kociemba_string(face_grids)

    # 6) Build palette
    palette = []
    for cluster, face in cluster_to_face.items():
        hsv = kmeans.cluster_centers_[cluster].astype(np.uint8)
        bgr = cv2.cvtColor(np.uint8([[hsv]]), cv2.COLOR_HSV2BGR)[0][0]
        hex_color = "#{:02x}{:02x}{:02x}".format(bgr[2],bgr[1],bgr[0])
        palette.append({"face": face, "color": hex_color})

    print(cube_string)
    print(face_grids)
    return cube_string, face_grids, palette
