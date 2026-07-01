"""
CubeVision AI — Cube State Service

Central service for all cube state operations.
Handles color ↔ face conversion, validation, Kociemba string generation,
and state synchronization. NO other module should implement conversion logic.
"""

from typing import Dict, List, Tuple, Optional
from copy import deepcopy

FACE_ORDER = ["U", "R", "F", "D", "L", "B"]
VALID_FACES = set(FACE_ORDER)

# Standard Western color scheme
DEFAULT_COLOR_MAPPING = {
    "U": "#FFFFFF",  # White
    "D": "#FFFF00",  # Yellow
    "F": "#00FF00",  # Green
    "B": "#0000FF",  # Blue
    "R": "#FF0000",  # Red
    "L": "#FFA500",  # Orange
}


class CubeStateService:
    """
    Central cube state management.

    Responsibilities:
    - Center color mapping
    - Color → Face conversion
    - Face → Color conversion
    - Cube validation (sticker counts, centers, parity, permutation)
    - Kociemba string generation
    - State synchronization
    - Import/Export of cube states
    """

    def __init__(self, color_mapping: Optional[Dict[str, str]] = None):
        """
        Initialize with a color mapping.

        Args:
            color_mapping: Dict mapping face letters to hex colors.
                           e.g., {"U": "#FFFFFF", "D": "#FFFF00", ...}
        """
        self.color_mapping = color_mapping or DEFAULT_COLOR_MAPPING.copy()
        # Build reverse mapping: color hex → face letter
        self._rebuild_reverse_map()

    def _rebuild_reverse_map(self):
        """Build color → face reverse lookup."""
        self.reverse_mapping = {
            v.upper(): k for k, v in self.color_mapping.items()
        }

    def set_color_mapping(self, mapping: Dict[str, str]):
        """Update the color mapping and rebuild reverse lookup."""
        self.color_mapping = mapping
        self._rebuild_reverse_map()

    # ─── Conversion ───────────────────────────────────────────

    def color_to_face(self, hex_color: str) -> Optional[str]:
        """Convert a hex color to its face letter."""
        return self.reverse_mapping.get(hex_color.upper())

    def face_to_color(self, face: str) -> Optional[str]:
        """Convert a face letter to its hex color."""
        return self.color_mapping.get(face)

    def colors_to_faces(
        self, color_grid: List[List[str]]
    ) -> List[List[str]]:
        """Convert a 3x3 grid of colors to face notation."""
        return [
            [self.color_to_face(c) or "?" for c in row]
            for row in color_grid
        ]

    def faces_to_colors(
        self, face_grid: List[List[str]]
    ) -> List[List[str]]:
        """Convert a 3x3 grid of face notation to colors."""
        return [
            [self.face_to_color(f) or "#000000" for f in row]
            for row in face_grid
        ]

    def convert_all_faces_to_notation(
        self, color_faces: Dict[str, List[List[str]]]
    ) -> Dict[str, List[List[str]]]:
        """Convert all 6 faces from color to face notation."""
        return {
            face: self.colors_to_faces(grid)
            for face, grid in color_faces.items()
        }

    def convert_all_faces_to_colors(
        self, face_data: Dict[str, List[List[str]]]
    ) -> Dict[str, List[List[str]]]:
        """Convert all 6 faces from face notation to colors."""
        return {
            face: self.faces_to_colors(grid)
            for face, grid in face_data.items()
        }

    # ─── Kociemba String ──────────────────────────────────────

    def to_kociemba_string(
        self, faces: Dict[str, List[List[str]]]
    ) -> str:
        """
        Convert face notation dict to 54-char Kociemba string.
        Order: U R F D L B (row by row, left-to-right, top-to-bottom).
        """
        result = []
        for face in FACE_ORDER:
            grid = faces.get(face)
            if not grid:
                raise ValueError(f"Missing face: {face}")
            for row in grid:
                for cell in row:
                    if cell not in VALID_FACES:
                        raise ValueError(
                            f"Invalid face letter '{cell}' on face {face}"
                        )
                    result.append(cell)
        return "".join(result)

    def from_kociemba_string(
        self, cube_string: str
    ) -> Dict[str, List[List[str]]]:
        """
        Convert 54-char Kociemba string back to face notation dict.
        """
        if len(cube_string) != 54:
            raise ValueError(f"Expected 54 chars, got {len(cube_string)}")

        faces = {}
        idx = 0
        for face in FACE_ORDER:
            grid = []
            for r in range(3):
                row = []
                for c in range(3):
                    row.append(cube_string[idx])
                    idx += 1
                grid.append(row)
            faces[face] = grid
        return faces

    # ─── Validation ───────────────────────────────────────────

    def validate(
        self, faces: Dict[str, List[List[str]]]
    ) -> Tuple[bool, List[str], List[str]]:
        """
        Comprehensive cube validation.

        Returns:
            (is_valid, errors, warnings)
        """
        errors = []
        warnings = []

        # Check all 6 faces present
        for face in FACE_ORDER:
            if face not in faces:
                errors.append(f"Missing face: {face}")

        if errors:
            return False, errors, warnings

        # Check each face is 3x3
        for face in FACE_ORDER:
            grid = faces[face]
            if len(grid) != 3:
                errors.append(f"Face {face}: expected 3 rows, got {len(grid)}")
                continue
            for r, row in enumerate(grid):
                if len(row) != 3:
                    errors.append(
                        f"Face {face} row {r}: expected 3 cols, got {len(row)}"
                    )

        if errors:
            return False, errors, warnings

        # Check center stickers
        for face in FACE_ORDER:
            center = faces[face][1][1]
            if center != face:
                errors.append(
                    f"Face {face}: center must be '{face}', found '{center}'"
                )

        # Check sticker counts (exactly 9 of each)
        counts = {f: 0 for f in FACE_ORDER}
        for face in FACE_ORDER:
            for row in faces[face]:
                for cell in row:
                    if cell not in VALID_FACES:
                        errors.append(f"Invalid sticker '{cell}' on face {face}")
                    else:
                        counts[cell] += 1

        for face in FACE_ORDER:
            if counts[face] != 9:
                errors.append(
                    f"Color {face}: expected 9 stickers, found {counts[face]}"
                )

        if errors:
            return False, errors, warnings

        # Structural validation via Kociemba
        try:
            cube_string = self.to_kociemba_string(faces)
            import kociemba
            kociemba.solve(cube_string)
        except Exception as e:
            msg = str(e).strip()
            errors.append(f"Cube is not solvable: {msg}")

        return len(errors) == 0, errors, warnings

    def validate_sticker_counts(
        self, faces: Dict[str, List[List[str]]]
    ) -> Dict[str, int]:
        """Get sticker counts per face letter."""
        counts = {f: 0 for f in FACE_ORDER}
        for face in FACE_ORDER:
            if face not in faces:
                continue
            for row in faces[face]:
                for cell in row:
                    if cell in counts:
                        counts[cell] += 1
        return counts

    # ─── State Helpers ────────────────────────────────────────

    @staticmethod
    def empty_faces() -> Dict[str, List[List[str]]]:
        """Create a solved cube state (all faces uniform)."""
        return {
            face: [[face] * 3 for _ in range(3)]
            for face in FACE_ORDER
        }

    @staticmethod
    def clone_faces(
        faces: Dict[str, List[List[str]]]
    ) -> Dict[str, List[List[str]]]:
        """Deep clone a faces dict."""
        return deepcopy(faces)

    def get_palette_list(self) -> List[Dict[str, str]]:
        """Get color mapping as a list for frontend consumption."""
        face_labels = {
            "U": "Up", "D": "Down", "F": "Front",
            "B": "Back", "L": "Left", "R": "Right",
        }
        return [
            {
                "face": face,
                "color": self.color_mapping[face],
                "label": f"{face_labels[face]} ({face})",
            }
            for face in FACE_ORDER
        ]

    def export_state(
        self, faces: Dict[str, List[List[str]]]
    ) -> Dict:
        """Export cube state for serialization."""
        return {
            "faces": faces,
            "cube_string": self.to_kociemba_string(faces),
            "color_mapping": self.color_mapping,
            "palette": self.get_palette_list(),
        }
