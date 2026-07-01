"""
CubeVision AI — Solver Service

Business logic for cube solving operations.
Orchestrates solver selection, validation, and solution formatting.
"""

import time
from typing import Dict, Any, List, Optional

from app.solver.solver_factory import get_solver, get_available_solvers
from app.services.cube_state_service import CubeStateService


class SolverService:
    """Orchestrates cube solving with multiple solver backends."""

    def __init__(self):
        self.cube_state = CubeStateService()

    def solve(
        self,
        cube_string: str,
        solver_id: str = "kociemba",
    ) -> Dict[str, Any]:
        """
        Solve a cube and return structured solution data.

        Args:
            cube_string: 54-char Kociemba string.
            solver_id: Which solver to use.

        Returns:
            Solution dict with moves, timing, difficulty, etc.
        """
        solver = get_solver(solver_id)

        # Validate first
        is_valid, error_msg = solver.validate(cube_string)
        if not is_valid:
            return {
                "success": False,
                "error": error_msg,
            }

        # Solve with timing
        start = time.perf_counter()
        try:
            moves = solver.solve(cube_string)
        except Exception as e:
            return {
                "success": False,
                "error": f"Solver failed: {str(e)}",
            }
        elapsed_ms = int((time.perf_counter() - start) * 1000)

        # Parse moves into structured data
        parsed_moves = [solver.parse_move(m) for m in moves]
        difficulty = solver.get_difficulty(len(moves))

        # Try to get alternative solutions from other solvers
        alternatives = self._get_alternative_solutions(cube_string, solver_id)

        return {
            "success": True,
            "solution": " ".join(moves),
            "moves": parsed_moves,
            "move_count": len(moves),
            "solve_time_ms": elapsed_ms,
            "difficulty": difficulty,
            "solver_used": solver.name,
            "solver_id": solver_id,
            "alternative_solutions": alternatives,
        }

    def validate(self, cube_string: str) -> Dict[str, Any]:
        """Validate a cube string using the primary solver."""
        solver = get_solver("kociemba")
        is_valid, error_msg = solver.validate(cube_string)
        return {
            "valid": is_valid,
            "error": error_msg if not is_valid else None,
        }

    def solve_from_faces(
        self,
        faces: Dict[str, list],
        solver_id: str = "kociemba",
    ) -> Dict[str, Any]:
        """Solve from face notation dict."""
        try:
            cube_string = self.cube_state.to_kociemba_string(faces)
        except ValueError as e:
            return {"success": False, "error": str(e)}

        return self.solve(cube_string, solver_id)

    def list_solvers(self) -> List[Dict[str, str]]:
        """List available solver algorithms."""
        return get_available_solvers()

    def _get_alternative_solutions(
        self,
        cube_string: str,
        primary_solver_id: str,
    ) -> List[Dict[str, Any]]:
        """Try other solvers for alternative solutions."""
        alternatives = []
        available = get_available_solvers()

        for solver_info in available:
            sid = solver_info["id"]
            if sid == primary_solver_id:
                continue

            try:
                solver = get_solver(sid)
                start = time.perf_counter()
                moves = solver.solve(cube_string)
                elapsed = int((time.perf_counter() - start) * 1000)

                alternatives.append({
                    "solver_id": sid,
                    "solver_name": solver.name,
                    "solution": " ".join(moves),
                    "move_count": len(moves),
                    "solve_time_ms": elapsed,
                    "difficulty": solver.get_difficulty(len(moves)),
                })
            except Exception:
                # Silently skip failed alternatives
                continue

        return alternatives
