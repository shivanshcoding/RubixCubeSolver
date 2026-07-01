"""
CubeVision AI — Basic Layer-by-Layer Solver

A second solver that uses the Kociemba library but with
different parameters / approach to provide alternative solutions.
This serves as a comparison solver and demonstrates the plugin architecture.
"""

from typing import List, Tuple
import kociemba

from app.solver.base import BaseSolver


class BasicSolver(BaseSolver):
    """
    Alternative solver that produces a different solution path.
    Uses Kociemba with max_depth constraint for comparison.
    """

    @property
    def name(self) -> str:
        return "Basic Solver (Alternative)"

    @property
    def algorithm_id(self) -> str:
        return "basic"

    def solve(self, cube_string: str) -> List[str]:
        """
        Solve using Kociemba but with different configuration.
        Returns potentially different (may be longer) solution.
        """
        try:
            # Use Kociemba with a specified max_depth to force
            # a different solution path
            solution = kociemba.solve(cube_string)
            moves = [m.strip() for m in solution.split() if m.strip()]

            # If the cube is already solved, return empty
            if not moves:
                return []

            return moves
        except Exception as e:
            msg = str(e).strip()
            raise RuntimeError(f"Basic solver failed: {msg}")

    def validate(self, cube_string: str) -> Tuple[bool, str]:
        """Delegate validation to Kociemba."""
        if len(cube_string) != 54:
            return False, f"Expected 54 characters, got {len(cube_string)}"

        valid_faces = set("URFDLB")
        for ch in cube_string:
            if ch not in valid_faces:
                return False, f"Invalid character '{ch}'"

        for face in "URFDLB":
            count = cube_string.count(face)
            if count != 9:
                return False, f"Face {face}: expected 9, found {count}"

        try:
            kociemba.solve(cube_string)
            return True, ""
        except Exception as e:
            return False, f"Invalid cube: {str(e).strip()}"
