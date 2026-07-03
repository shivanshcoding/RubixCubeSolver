import pytest
import numpy as np
from app.cv.pipeline import generate_hsv_ranges, classify_patch_hsv, PipelineConfig, delta_e_76
import app.cv.pipeline as pipeline

def test_generate_hsv_ranges():
    config = PipelineConfig()
    
    palette_hex = {
        "U": "#ffffff", # White
        "D": "#ffd500", # Yellow
        "F": "#009e60", # Green
        "B": "#0051ba", # Blue
        "R": "#c41e3a", # Red (Hue 349 -> ~174)
        "L": "#ff5800", # Orange
    }
    
    labs = pipeline.convert_palette_to_lab(palette_hex)
    ranges, white_face, base_hsvs, _ = generate_hsv_ranges(palette_hex, labs, config)
    
    assert white_face == "U"
    
    # Check Red Wraps
    red_ranges = ranges["R"]
    assert len(red_ranges) == 2, "Red should generate two ranges due to wrapping"
    
    # Check Orange clamped
    orange_ranges = ranges["L"]
    assert len(orange_ranges) == 1, "Orange should not wrap"
    
    # Assert lower <= upper
    for f, f_ranges in ranges.items():
        for r in f_ranges:
            assert r[0][0] <= r[1][0], f"Lower hue > Upper hue for face {f}"

def test_classify_patch_hsv_tie_break():
    config = PipelineConfig(min_valid_pixels=10)
    
    bgr_patch = np.zeros((10, 10, 3), dtype=np.uint8)
    hsv_patch = np.zeros((10, 10, 3), dtype=np.uint8)
    mask = np.ones((10, 10), dtype=np.uint8) * 255
    
    palette_hex = {
        "U": "#ffffff", "R": "#c41e3a", "L": "#ff5800", 
        "D": "#ffd500", "F": "#009e60", "B": "#0051ba"
    }
    labs = pipeline.convert_palette_to_lab(palette_hex)
    ranges, white_face, base_hsvs, _ = generate_hsv_ranges(palette_hex, labs, config)
    
    red_h = int(base_hsvs["R"][0])
    orange_h = 15
    
    hsv_patch[:5, :, 0] = red_h
    hsv_patch[:5, :, 1] = 200
    hsv_patch[:5, :, 2] = 200
    
    hsv_patch[5:, :, 0] = orange_h
    hsv_patch[5:, :, 1] = 200
    hsv_patch[5:, :, 2] = 200
    
    orange_bgr = pipeline.hex_to_rgb(palette_hex["L"])[::-1]
    bgr_patch[:, :] = orange_bgr
    
    cls = classify_patch_hsv(
        bgr_patch, hsv_patch, mask,
        ranges, white_face, labs, base_hsvs, config
    )
    
    print("CLASSIFICATION RESULT:", cls)
    
    assert cls["face"] == "L"
    assert "Tie Break" in cls["reason"]
