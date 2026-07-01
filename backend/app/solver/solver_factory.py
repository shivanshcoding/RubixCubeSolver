"""
CubeVision AI — Solver Factory

Factory pattern for creating solver instances.
Supports multiple solver backends with runtime selection.
"""

from typing import Dict, Type, List

from app.solver.base import BaseSolver
from app.solver.kociemba_solver import KociembaSolver
from app.solver.basic_solver import BasicSolver


# Registry of all available solvers
_SOLVER_REGISTRY: Dict[str, Type[BaseSolver]] = {
    "kociemba": KociembaSolver,
    "basic": BasicSolver,
}


def get_solver(algorithm_id: str = "kociemba") -> BaseSolver:
    """
    Get a solver instance by algorithm ID.

    Args:
        algorithm_id: The solver to use (kociemba, basic).

    Returns:
        An instance of the requested solver.

    Raises:
        ValueError: If the solver ID is not registered.
    """
    solver_class = _SOLVER_REGISTRY.get(algorithm_id)
    if solver_class is None:
        available = ", ".join(_SOLVER_REGISTRY.keys())
        raise ValueError(
            f"Unknown solver '{algorithm_id}'. Available: {available}"
        )
    return solver_class()


def get_available_solvers() -> List[Dict[str, str]]:
    """List all registered solvers with their metadata."""
    solvers = []
    for algorithm_id, solver_class in _SOLVER_REGISTRY.items():
        instance = solver_class()
        solvers.append({
            "id": algorithm_id,
            "name": instance.name,
        })
    return solvers


def register_solver(algorithm_id: str, solver_class: Type[BaseSolver]):
    """
    Register a new solver implementation.
    Use this to add custom solvers at runtime.
    """
    _SOLVER_REGISTRY[algorithm_id] = solver_class
