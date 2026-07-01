"""
CubeVision AI — User Models

Pydantic models for user-related request/response schemas.
"""

from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List
from datetime import datetime


# ─── Request Models ───────────────────────────────────────────────

class SignupRequest(BaseModel):
    """User registration request."""
    username: str = Field(..., min_length=3, max_length=30, pattern=r"^[a-zA-Z0-9_]+$")
    email: str = Field(..., min_length=5, max_length=100)
    password: str = Field(..., min_length=8, max_length=128)
    display_name: Optional[str] = Field(None, max_length=50)
    country: Optional[str] = Field(None, max_length=50)


class LoginRequest(BaseModel):
    """User login request."""
    email: str = Field(...)
    password: str = Field(...)


class RefreshTokenRequest(BaseModel):
    """Token refresh request."""
    refresh_token: str


class ForgotPasswordRequest(BaseModel):
    """Forgot password request."""
    email: str


class UpdateProfileRequest(BaseModel):
    """Profile update request."""
    display_name: Optional[str] = Field(None, max_length=50)
    country: Optional[str] = Field(None, max_length=50)
    bio: Optional[str] = Field(None, max_length=500)
    avatar_url: Optional[str] = None


class SetupProfileRequest(BaseModel):
    """Setup profile for new OAuth users."""
    username: str = Field(..., min_length=3, max_length=30, pattern=r"^[a-zA-Z0-9_]+$")
    country: Optional[str] = Field(None, max_length=50)
    bio: Optional[str] = Field(None, max_length=500)


class ChangePasswordRequest(BaseModel):
    """Password change request."""
    current_password: str
    new_password: str = Field(..., min_length=8, max_length=128)


# ─── Response Models ──────────────────────────────────────────────

class TokenResponse(BaseModel):
    """JWT token pair response."""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int  # seconds


class UserPublicResponse(BaseModel):
    """Public user profile (visible to others)."""
    id: str
    username: str
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None
    country: Optional[str] = None
    is_setup_complete: bool = True
    contest_rating: int = 1200
    total_solves: int = 0
    created_at: Optional[datetime] = None


class UserProfileResponse(BaseModel):
    """Full user profile (visible to self)."""
    id: str
    username: str
    email: str
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None
    country: Optional[str] = None
    bio: Optional[str] = None
    is_setup_complete: bool = True
    contest_rating: int = 1200
    total_solves: int = 0
    avg_solve_time_ms: int = 0
    avg_move_count: int = 0
    daily_streak: int = 0
    best_streak: int = 0
    achievements: List[str] = []
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class UserStatsResponse(BaseModel):
    """User statistics for dashboard."""
    total_solves: int = 0
    avg_solve_time_ms: int = 0
    avg_move_count: int = 0
    best_solve_time_ms: int = 0
    contest_rating: int = 1200
    daily_streak: int = 0
    best_streak: int = 0
    total_scans: int = 0
    favorite_method: Optional[str] = None
    recent_activity: List[dict] = []
