from typing import Tuple, List

VALID_FACES = set(["U", "R", "F", "D", "L", "B"])


def validate_cube_string(cube_string: str) -> Tuple[bool, str]:
    if len(cube_string) != 54:
        return False, "Cube string must be 54 characters."

    for ch in cube_string:
        if ch not in VALID_FACES:
            return False, "Cube string contains invalid face letters. Allowed: U,R,F,D,L,B."

    # Each face letter must appear exactly 9 times
    counts = {face: cube_string.count(face) for face in VALID_FACES}
    for face, count in counts.items():
        if count != 9:
            return False, f"Letter '{face}' must appear exactly 9 times (found {count})."

    return True, ""


def solve_cube(cube_string: str) -> List[str]:
    """Solve the cube using the Kociemba algorithm and return a list of moves."""
    import kociemba

    solution = kociemba.solve(cube_string)
    # kociemba returns a space-separated move string
    moves = [m.strip() for m in solution.split() if m.strip()]
    return moves

