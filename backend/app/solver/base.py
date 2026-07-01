"""
CubeVision AI — Abstract Solver Interface

Base class for all Rubik's Cube solving algorithms.
Future solvers (IDA*, Cube Explorer, min2phase) implement this interface.
"""

from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional


class BaseSolver(ABC):
    """Abstract base class for cube solving algorithms."""

    @property
    @abstractmethod
    def name(self) -> str:
        """Human-readable solver name."""
        ...

    @property
    @abstractmethod
    def algorithm_id(self) -> str:
        """Unique identifier for this solver."""
        ...

    @abstractmethod
    def solve(self, cube_string: str) -> List[str]:
        """
        Solve the cube and return a list of moves.

        Args:
            cube_string: 54-char string in URFDLB face order.

        Returns:
            List of move strings, e.g. ["R", "U'", "F2", "D", ...]

        Raises:
            ValueError: If the cube string is invalid.
            RuntimeError: If the solver fails.
        """
        ...

    @abstractmethod
    def validate(self, cube_string: str) -> tuple:
        """
        Validate if a cube string represents a solvable cube.

        Returns:
            (is_valid: bool, error_message: str)
        """
        ...

    def get_difficulty(self, move_count: int) -> str:
        """Estimate solve difficulty based on move count."""
        if move_count <= 10:
            return "easy"
        elif move_count <= 16:
            return "medium"
        elif move_count <= 22:
            return "hard"
        else:
            return "expert"

    def parse_move(self, move: str) -> Dict[str, str]:
        """Parse a move notation string into structured data."""
        face = move[0]
        if len(move) == 1:
            return {
                "notation": move,
                "face": face,
                "direction": "clockwise",
                "explanation": f"Rotate the {self._face_name(face)} face 90° clockwise",
            }
        elif move[1] == "'":
            return {
                "notation": move,
                "face": face,
                "direction": "counterclockwise",
                "explanation": f"Rotate the {self._face_name(face)} face 90° counter-clockwise",
            }
        elif move[1] == "2":
            return {
                "notation": move,
                "face": face,
                "direction": "double",
                "explanation": f"Rotate the {self._face_name(face)} face 180°",
            }
        return {"notation": move, "face": face, "direction": "unknown", "explanation": ""}

    @staticmethod
    def _face_name(face: str) -> str:
        """Get the full name of a face from its letter."""
        names = {
            "U": "Up (top)",
            "D": "Down (bottom)",
            "F": "Front",
            "B": "Back",
            "L": "Left",
            "R": "Right",
        }
        return names.get(face, face)
