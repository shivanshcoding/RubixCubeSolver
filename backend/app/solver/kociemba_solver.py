"""
CubeVision AI — Kociemba Solver

Primary solver implementation using the Kociemba two-phase algorithm.
Produces near-optimal solutions (typically ≤20 moves).
"""

from typing import List, Tuple
import kociemba

from app.solver.base import BaseSolver


class KociembaSolver(BaseSolver):
    """Kociemba two-phase solver implementation."""

    @property
    def name(self) -> str:
        return "Kociemba Two-Phase"

    @property
    def algorithm_id(self) -> str:
        return "kociemba"

    def solve(self, cube_string: str) -> List[str]:
        """
        Solve the cube using Kociemba's two-phase algorithm.

        Args:
            cube_string: 54-char string in URFDLB order.

        Returns:
            List of moves (e.g., ["R", "U'", "F2"]).
        """
        try:
            solution = kociemba.solve(cube_string)
            moves = [m.strip() for m in solution.split() if m.strip()]
            return moves
        except Exception as e:
            msg = str(e).strip()
            raise RuntimeError(f"Kociemba solver failed: {msg}")

    def validate(self, cube_string: str) -> Tuple[bool, str]:
        """
        Validate cube by attempting to solve it.
        Kociemba will throw on invalid/impossible configurations.
        """
        if len(cube_string) != 54:
            return False, f"Expected 54 characters, got {len(cube_string)}"

        valid_faces = set("URFDLB")
        for ch in cube_string:
            if ch not in valid_faces:
                return False, f"Invalid character '{ch}' in cube string"

        # Check 9 of each face
        for face in "URFDLB":
            count = cube_string.count(face)
            if count != 9:
                return False, f"Face {face}: expected 9 stickers, found {count}"

        # Try solving — Kociemba validates internally
        try:
            kociemba.solve(cube_string)
            return True, ""
        except Exception as e:
            msg = str(e).strip()
            if msg.lower().startswith("error:"):
                msg = msg[6:].strip()
            return False, f"Invalid cube: {msg}"
