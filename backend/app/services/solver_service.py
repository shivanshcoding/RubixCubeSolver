from typing import Tuple, List

VALID_FACES = set(["U", "R", "F", "D", "L", "B"])


def validate_cube_string(cube_string: str) -> Tuple[bool, str]:
    try:
        import kociemba
        _ = kociemba.solve(cube_string)
    except Exception as e:
        msg = str(e).strip()
        if msg.lower().startswith("error:"):
            msg = msg[6:].strip()
        return False, f"Invalid cube: {'Cube configuration is not physically possible.'}"

    return True, ""


def solve_cube(cube_string: str) -> List[str]:
    """Solve the cube using the Kociemba algorithm and return a list of moves."""
    import kociemba

    solution = kociemba.solve(cube_string)
    # kociemba returns a space-separated move string
    moves = [m.strip() for m in solution.split() if m.strip()]
    return moves
