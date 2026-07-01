"""
CubeVision AI — FastAPI Application

Main entry point for the backend server.
Configures middleware, routers, startup/shutdown events.
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from app.core.config import settings
from app.database.connection import connect_to_database, close_database_connection
from app.api.auth import router as auth_router
from app.api.cube import router as cube_router
from app.api.contest import router as contest_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifecycle: startup and shutdown events."""
    # Startup
    await connect_to_database()

    # Create upload directory
    os.makedirs(settings.upload_dir, exist_ok=True)

    print("=" * 50)
    print("  CubeVision AI — Backend Server")
    print(f"  MongoDB: {settings.mongodb_db_name}")
    print(f"  Debug: {settings.debug}")
    print(f"  LLM: {settings.llm_provider}")
    print("=" * 50)

    yield

    # Shutdown
    await close_database_connection()


app = FastAPI(
    title="CubeVision AI",
    description="Production-grade Rubik's Cube platform with CV, solving, and gamification",
    version="1.0.0",
    lifespan=lifespan,
)

# ─── CORS Middleware ──────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Routers ─────────────────────────────────────────────────────
app.include_router(auth_router)
app.include_router(cube_router)
app.include_router(contest_router)


# ─── Health Check ─────────────────────────────────────────────────

@app.get("/health", tags=["System"])
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "CubeVision AI",
        "version": "1.0.0",
    }


@app.get("/api/info", tags=["System"])
async def api_info():
    """API information."""
    from app.solver.solver_factory import get_available_solvers
    from app.cv.llm_provider import is_llm_available

    return {
        "name": "CubeVision AI",
        "version": "1.0.0",
        "solvers": get_available_solvers(),
        "llm_available": is_llm_available(),
        "features": [
            "manual_entry",
            "camera_scan",
            "live_scan",
            "3d_preview",
            "solution_player",
            "contests",
            "leaderboard",
            "achievements",
        ],
    }
