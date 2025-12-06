from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional
import time

from .models.requests import SolveRequest
from .models.responses import SolveResponse, ScanResponse
from .services.solver_service import validate_cube_string, solve_cube
from .services.vision_service import scan_cube_from_images


app = FastAPI(title="Rubik's Cube Solver API", version="0.1.0")

# Allow local development origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.post("/api/solve", response_model=SolveResponse)
def solve(request: SolveRequest) -> SolveResponse:
    is_valid, error_msg = validate_cube_string(request.cubeString)
    if not is_valid:
        raise HTTPException(status_code=400, detail={"error": error_msg})

    start = time.perf_counter()
    try:
        moves: List[str] = solve_cube(request.cubeString)
    except Exception as e:
        raise HTTPException(status_code=422, detail={"error": f"Solver failed: {str(e)}"})
    elapsed_ms = int((time.perf_counter() - start) * 1000)

    return SolveResponse(moves=moves, moveCount=len(moves), solveTimeMs=elapsed_ms)


@app.post("/api/scan", response_model=ScanResponse)
async def scan(
    faceU: UploadFile = File(...),
    faceR: UploadFile = File(...),
    faceF: UploadFile = File(...),
    faceD: UploadFile = File(...),
    faceL: UploadFile = File(...),
    faceB: UploadFile = File(...),
) -> ScanResponse:
    try:
        cube_string, faces_data = await scan_cube_from_images(
            {
                "U": faceU,
                "R": faceR,
                "F": faceF,
                "D": faceD,
                "L": faceL,
                "B": faceB,
            }
        )
    except Exception as e:
        raise HTTPException(status_code=422, detail={"error": f"Scan failed: {str(e)}"})

    # Validate generated cube string before returning
    is_valid, error_msg = validate_cube_string(cube_string)
    if not is_valid:
        raise HTTPException(status_code=400, detail={"error": f"Invalid scanned cube: {error_msg}"})

    return ScanResponse(cubeString=cube_string, faces=faces_data)

