"""
CubeVision AI — Cube API Routes

Cube validation, solving, state management, and scanning endpoints.
All Computer Vision logic is delegated to ``app.cv.pipeline``.
"""

from fastapi import APIRouter, Depends, HTTPException, File, UploadFile, WebSocket, WebSocketDisconnect, Body
from typing import Optional, Dict
import base64
import numpy as np
import cv2
import json

from app.core.dependencies import get_db, get_current_user, get_optional_user
from app.models.cube import (
    CubeStateRequest,
    SaveSolutionRequest,
    CubeValidationResponse,
    SolveRequest,
    ScanResponse,
)
from app.services.cube_state_service import CubeStateService
from app.services.solver_service import SolverService
from app.cv.pipeline import (
    validate_palette,
    process_patches,
    scan_single_face,
    scan_cube_from_images,
    read_image,
    TemporalSmoother,
    PaletteCache,
)
from app.cv.llm_provider import get_llm_provider, is_llm_available

router = APIRouter(prefix="/api/cube", tags=["Cube"])


# ─── Validation ───────────────────────────────────────────────────

@router.post("/validate")
async def validate_cube(request: CubeStateRequest):
    """Validate a cube state."""
    color_mapping = None
    if request.color_mapping:
        color_mapping = request.color_mapping.model_dump()

    service = CubeStateService(color_mapping=color_mapping)
    is_valid, errors, warnings = service.validate(request.faces)

    cube_string = None
    if is_valid:
        cube_string = service.to_kociemba_string(request.faces)

    return {
        "valid": is_valid,
        "errors": errors,
        "warnings": warnings,
        "cube_string": cube_string,
    }


@router.post("/validate-string")
async def validate_cube_string_endpoint(request: SolveRequest):
    """Validate a 54-char cube string."""
    solver_service = SolverService()
    result = solver_service.validate(request.cube_string)
    return result


@router.post("/validate-palette")
async def validate_palette_endpoint(palette: Dict[str, str] = Body(...)):
    """Validate that 6 selected colours have sufficient perceptual separation."""
    return validate_palette(palette)


# ─── Solving ──────────────────────────────────────────────────────

@router.post("/solve")
async def solve_cube(
    request: SolveRequest,
    user: Optional[dict] = Depends(get_optional_user),
    db=Depends(get_db),
):
    """Solve a cube and return the solution."""
    solver_service = SolverService()
    result = solver_service.solve(
        cube_string=request.cube_string,
        solver_id=request.solver,
    )

    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result)

    return result


@router.post("/solve-faces")
async def solve_from_faces(
    request: CubeStateRequest,
    user: Optional[dict] = Depends(get_optional_user),
    db=Depends(get_db),
):
    """Solve a cube from face notation."""
    solver_service = SolverService()
    result = solver_service.solve_from_faces(request.faces)

    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result)

    return result


@router.get("/solvers")
async def list_solvers():
    """List available solver algorithms."""
    solver_service = SolverService()
    return {"solvers": solver_service.list_solvers()}


# ─── Scanning (Image Upload) ─────────────────────────────────────

@router.post("/scan")
async def scan_cube(
    faceU: UploadFile = File(...),
    faceR: UploadFile = File(...),
    faceF: UploadFile = File(...),
    faceD: UploadFile = File(...),
    faceL: UploadFile = File(...),
    faceB: UploadFile = File(...),
):
    """Scan 6 face images and detect cube state."""
    files = {"U": faceU, "R": faceR, "F": faceF, "D": faceD, "L": faceL, "B": faceB}

    # Try LLM provider first if available
    if is_llm_available():
        try:
            provider = get_llm_provider()
            images_bytes = {}
            for f in ["U", "R", "F", "D", "L", "B"]:
                await files[f].seek(0)
                images_bytes[f] = await files[f].read()

            result = provider.analyze_cube_images(images_bytes)
            faces_grids = result["faces"]
            palette_map = result["palette"]

            palette = [
                {"face": k, "color": v, "label": f"{k} Face (AI)"}
                for k, v in palette_map.items()
            ]

            cube_string = "".join(
                "".join(row)
                for f in ["U", "R", "F", "D", "L", "B"]
                for row in faces_grids[f]
            )

            return {
                "cube_string": cube_string,
                "faces": faces_grids,
                "confidence": {"min": 0.99, "mean": 0.99},
                "palette": palette,
                "method": "llm",
            }
        except Exception as e:
            print(f"LLM scan failed: {e}. Falling back to CV...")
            for f in ["U", "R", "F", "D", "L", "B"]:
                await files[f].seek(0)

    # Classical CV pipeline
    try:
        cube_string, faces_data, conf_stats, palette = await scan_cube_from_images(files)

        return {
            "cube_string": cube_string,
            "faces": faces_data,
            "confidence": conf_stats,
            "palette": palette,
            "method": "cv",
        }
    except Exception as e:
        raise HTTPException(status_code=422, detail={"error": str(e)})


@router.post("/scan/single")
async def scan_single_face_endpoint(
    image: UploadFile = File(...),
    palette: Optional[str] = None,
):
    """Scan a single cube face image and return the detected colours."""
    try:
        img = await read_image(image)

        palette_hex = None
        if palette:
            try:
                palette_hex = json.loads(palette)
            except Exception:
                pass

        result = scan_single_face(img, palette_hex)
        return result
    except Exception:
        raise HTTPException(
            status_code=422,
            detail={"error": "Cube face not found. Lighting might be too dark, "
                    "there is too much glare, or the cube is partially outside "
                    "the image. Please try again."},
        )


# ─── WebSocket Live Scanning ─────────────────────────────────────

@router.websocket("/scan/live")
async def live_scan_websocket(websocket: WebSocket):
    """WebSocket endpoint for live webcam scanning.

    Decodes frames and delegates all CV to ``process_patches()``.
    """
    await websocket.accept()
    smoother = TemporalSmoother()
    palette_cache = PaletteCache()
    saved_coords = None

    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)

            frame_b64 = message.get("frame", "")

            # Decode base64 frame
            img_data = base64.b64decode(frame_b64)
            img_array = np.frombuffer(img_data, np.uint8)
            frame = cv2.imdecode(img_array, cv2.IMREAD_COLOR)

            if frame is None:
                await websocket.send_json({"error": "Invalid frame"})
                continue

            if "overlay_coords" in message:
                saved_coords = message["overlay_coords"]

            if not saved_coords:
                await websocket.send_json({"error": "Waiting for overlay coordinates"})
                continue

            hex_palette = message.get("palette", {})
            if not hex_palette:
                await websocket.send_json({"error": "No palette provided"})
                continue

            # Run the entire CV pipeline
            try:
                result = process_patches(
                    frame=frame,
                    overlay_coords=saved_coords,
                    palette_hex=hex_palette,
                    smoother=smoother,
                    palette_cache=palette_cache,
                )
                result["fps"] = message.get("fps", 0)
                await websocket.send_json(result)
            except Exception as e:
                await websocket.send_json({
                    "status": "error",
                    "stickers": [{"color": "unknown", "confidence": 0.0, "stable": False} for _ in range(9)],
                    "diagnostics": {"lighting": 0, "sharpness": 0, "angle": 0, "glare": 0},
                    "fps": 0,
                    "face_stable": False,
                    "square_stable": [False] * 9,
                })

    except WebSocketDisconnect:
        pass
    except Exception as e:
        try:
            await websocket.send_json({"error": str(e)})
        except Exception:
            pass


# ─── State Management ────────────────────────────────────────────

@router.post("/save")
async def save_cube_state(
    request: CubeStateRequest,
    user=Depends(get_current_user),
    db=Depends(get_db),
):
    """Save a cube state to user's history."""
    from datetime import datetime, timezone

    service = CubeStateService()
    cube_string = service.to_kociemba_string(request.faces)

    doc = {
        "user_id": user["id"],
        "faces": request.faces,
        "cube_string": cube_string,
        "color_mapping": request.color_mapping.model_dump() if request.color_mapping else None,
        "source": "manual",
        "created_at": datetime.now(timezone.utc),
    }

    result = await db.cube_states.insert_one(doc)

    return {
        "success": True,
        "id": str(result.inserted_id),
        "cube_string": cube_string,
    }


@router.post("/save-solution")
async def save_solution(
    request: SaveSolutionRequest,
    user=Depends(get_current_user),
    db=Depends(get_db),
):
    """Save a full solution and update user statistics."""
    from datetime import datetime, timezone
    from bson import ObjectId

    service = CubeStateService()
    cube_string = service.to_kociemba_string(request.faces)

    # 1. Save the cube state (optional, but good for history tracking)
    state_doc = {
        "user_id": user["id"],
        "faces": request.faces,
        "cube_string": cube_string,
        "color_mapping": request.color_mapping.model_dump() if request.color_mapping else None,
        "source": "manual",
        "created_at": datetime.now(timezone.utc),
    }
    state_result = await db.cube_states.insert_one(state_doc)

    # 2. Save the solution
    solution_doc = {
        "user_id": user["id"],
        "cube_state_id": str(state_result.inserted_id),
        "cube_string": cube_string,
        "moves": request.moves,
        "move_count": request.move_count,
        "solve_time_ms": request.solve_time_ms,
        "difficulty": request.difficulty,
        "solver_used": request.solver_used,
        "created_at": datetime.now(timezone.utc),
    }
    await db.saved_solutions.insert_one(solution_doc)

    # 3. Update User Statistics
    user_doc = await db.users.find_one({"_id": ObjectId(user["id"])})
    if user_doc:
        old_total = user_doc.get("total_solves", 0)
        old_avg_moves = user_doc.get("avg_move_count", 0.0)
        old_avg_time = user_doc.get("avg_solve_time_ms", 0.0)

        new_total = old_total + 1
        new_avg_moves = ((old_avg_moves * old_total) + request.move_count) / new_total
        new_avg_time = ((old_avg_time * old_total) + request.solve_time_ms) / new_total

        await db.users.update_one(
            {"_id": ObjectId(user["id"])},
            {
                "$set": {
                    "total_solves": new_total,
                    "avg_move_count": round(new_avg_moves, 2),
                    "avg_solve_time_ms": round(new_avg_time, 2)
                }
            }
        )

    return {
        "success": True,
        "cube_state_id": str(state_result.inserted_id),
    }


@router.get("/history")
async def get_cube_history(
    user=Depends(get_current_user),
    db=Depends(get_db),
    limit: int = 20,
    skip: int = 0,
):
    """Get user's cube history."""
    cursor = db.cube_states.find(
        {"user_id": user["id"]}
    ).sort("created_at", -1).skip(skip).limit(limit)

    cubes = []
    async for doc in cursor:
        doc["id"] = str(doc.pop("_id"))
        cubes.append(doc)

    return {"cubes": cubes, "total": len(cubes)}


@router.get("/recent-solutions")
async def get_recent_solutions(
    user=Depends(get_current_user),
    db=Depends(get_db),
    limit: int = 10,
):
    """Get user's recent saved solutions."""
    cursor = db.saved_solutions.find(
        {"user_id": user["id"]}
    ).sort("created_at", -1).limit(limit)

    solutions = []
    async for doc in cursor:
        doc["id"] = str(doc.pop("_id"))
        doc["cube_state_id"] = str(doc.pop("cube_state_id")) if "cube_state_id" in doc else None
        solutions.append(doc)

    return {"solutions": solutions}
