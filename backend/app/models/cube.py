"""
CubeVision AI — Cube Models

Pydantic models for cube state, solver, and validation.
"""

from pydantic import BaseModel, Field
from typing import Optional, List, Dict
from datetime import datetime


# ─── Cube State ───────────────────────────────────────────────────

class ColorMapping(BaseModel):
    """Maps physical colors to face notation."""
    F: str = "#00FF00"   # Front → Green
    B: str = "#0000FF"   # Back → Blue
    L: str = "#FFA500"   # Left → Orange
    R: str = "#FF0000"   # Right → Red
    U: str = "#FFFFFF"   # Up → White
    D: str = "#FFFF00"   # Down → Yellow


class CubeStateRequest(BaseModel):
    """Cube state from frontend (face notation)."""
    faces: Dict[str, List[List[str]]] = Field(
        ...,
        description="6 faces (U/R/F/D/L/B), each a 3x3 grid of face letters",
    )
    color_mapping: Optional[ColorMapping] = None


class SaveSolutionRequest(BaseModel):
    """Request to save a fully solved solution and state."""
    faces: Dict[str, List[List[str]]]
    color_mapping: Optional[ColorMapping] = None
    moves: List[str]
    move_count: int
    solve_time_ms: int
    difficulty: str = "unknown"
    solver_used: str = "kociemba"


class CubeValidationResponse(BaseModel):
    """Cube validation result."""
    valid: bool
    errors: List[str] = []
    warnings: List[str] = []
    cube_string: Optional[str] = None


# ─── Solver ───────────────────────────────────────────────────────

class SolveRequest(BaseModel):
    """Solve request with cube string."""
    cube_string: str = Field(
        ...,
        min_length=54,
        max_length=54,
        description="54-char Kociemba cube string (URFDLB order)",
    )
    solver: str = Field(
        default="kociemba",
        description="Solver algorithm to use: kociemba | min2phase",
    )


class SolutionMove(BaseModel):
    """Individual move in a solution."""
    notation: str         # e.g. "R", "U'", "F2"
    face: str             # e.g. "R", "U", "F"
    direction: str        # "clockwise" | "counterclockwise" | "double"
    explanation: str = "" # Human-readable explanation


class SolutionResponse(BaseModel):
    """Solver response."""
    success: bool
    solution: Optional[str] = None          # Space-separated moves
    moves: List[SolutionMove] = []
    move_count: int = 0
    solve_time_ms: int = 0
    difficulty: str = "unknown"             # easy | medium | hard | expert
    solver_used: str = "kociemba"
    alternative_solutions: List[dict] = []  # Other solutions if available


# ─── Scan ─────────────────────────────────────────────────────────

class ScanResponse(BaseModel):
    """Computer vision scan result."""
    cube_string: str
    faces: Dict[str, List[List[str]]]
    confidence: Dict[str, float]
    palette: List[Dict[str, str]]
    warnings: List[str] = []


class LiveScanFrame(BaseModel):
    """Single frame from live webcam scan."""
    image_data: str  # Base64 encoded frame
    face_index: int  # Which face is being scanned (0-5)


class LiveScanResult(BaseModel):
    """Result of processing a single live frame."""
    stickers: List[List[str]]          # 3x3 detected colors
    confidences: List[List[float]]     # 3x3 confidence scores
    all_confident: bool                # All 9 stickers above threshold
    stable: bool                       # Colors stable across frames


# ─── Saved Cube ───────────────────────────────────────────────────

class SavedCubeState(BaseModel):
    """Stored cube state in database."""
    id: Optional[str] = None
    user_id: str
    faces: Dict[str, List[List[str]]]
    cube_string: str
    color_mapping: ColorMapping = ColorMapping()
    source: str = "manual"  # manual | scan | contest
    created_at: Optional[datetime] = None


class SavedSolution(BaseModel):
    """Stored solution in database."""
    id: Optional[str] = None
    user_id: str
    cube_state_id: str
    moves: List[str]
    move_count: int
    solve_time_ms: int
    difficulty: str = "unknown"
    solver_used: str = "kociemba"
    created_at: Optional[datetime] = None
