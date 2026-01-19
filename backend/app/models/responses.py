from typing import List, Dict, Optional, Any
from pydantic import BaseModel


class SolveResponse(BaseModel):
    moves: List[str]
    moveCount: int
    solveTimeMs: int


class ScanResponse(BaseModel):
    cubeString: str
    faces: Dict[str, Any]
    palette: Optional[List[Dict[str, str]]] = None
    confidence: Optional[Dict[str, float]] = None


class ValidateResponse(BaseModel):
    valid: bool
    error: Optional[str] = None
