from typing import List, Dict, Optional
from pydantic import BaseModel


class SolveResponse(BaseModel):
    moves: List[str]
    moveCount: int
    solveTimeMs: int


class ScanResponse(BaseModel):
    cubeString: str
    faces: Optional[Dict[str, List[List[str]]]] = None  # Optional per-face color/label grid

