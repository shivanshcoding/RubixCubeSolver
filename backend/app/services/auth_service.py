"""
CubeVision AI — Auth Service

Business logic for authentication operations.
"""

from typing import Optional, Dict, Any
from fastapi import HTTPException, status

from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_token,
)
from app.core.config import settings
from app.repositories.user_repository import UserRepository


class AuthService:
    """Handles user authentication business logic."""

    def __init__(self, db):
        self.user_repo = UserRepository(db)

    async def signup(self, username: str, email: str, password: str, **extra) -> Dict[str, Any]:
        """Register a new user and return tokens."""
        # Normalize
        email = email.lower().strip()
        username = username.lower().strip()

        # Check if email exists
        existing = await self.user_repo.find_by_email(email)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Email already registered",
            )

        # Check if username exists
        existing = await self.user_repo.find_by_username(username)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Username already taken",
            )

        # Create user
        user_data = {
            "username": username,
            "email": email,
            "password_hash": hash_password(password),
            **{k: v for k, v in extra.items() if v is not None},
        }

        user = await self.user_repo.create(user_data)

        # Generate tokens
        tokens = self._create_tokens(user["id"])

        return {
            "user": self._sanitize_user(user),
            "tokens": tokens,
        }

    async def login(self, email: str, password: str) -> Dict[str, Any]:
        """Authenticate user and return tokens."""
        email = email.lower().strip()

        user = await self.user_repo.find_by_email(email)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password",
            )

        if not verify_password(password, user.get("password_hash", "")):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password",
            )

        tokens = self._create_tokens(user["id"])

        return {
            "user": self._sanitize_user(user),
            "tokens": tokens,
        }

    async def refresh(self, refresh_token: str) -> Dict[str, Any]:
        """Refresh access token using refresh token."""
        payload = decode_token(refresh_token)

        if not payload or payload.get("type") != "refresh":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid refresh token",
            )

        user_id = payload.get("sub")
        user = await self.user_repo.find_by_id(user_id)

        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found",
            )

        tokens = self._create_tokens(user["id"])

        return {
            "user": self._sanitize_user(user),
            "tokens": tokens,
        }

    async def get_profile(self, user_id: str) -> Dict[str, Any]:
        """Get full user profile."""
        user = await self.user_repo.find_by_id(user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found",
            )
        return self._sanitize_user(user)

    async def update_profile(self, user_id: str, update_data: dict) -> Dict[str, Any]:
        """Update user profile fields."""
        # Remove None values
        clean_data = {k: v for k, v in update_data.items() if v is not None}
        if not clean_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No fields to update",
            )

        user = await self.user_repo.update(user_id, clean_data)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found",
            )

        return self._sanitize_user(user)

    async def change_password(
        self, user_id: str, current_password: str, new_password: str
    ) -> bool:
        """Change user password."""
        user = await self.user_repo.find_by_id(user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found",
            )

        if not verify_password(current_password, user.get("password_hash", "")):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Current password is incorrect",
            )

        await self.user_repo.update(user_id, {
            "password_hash": hash_password(new_password),
        })

        return True

    def _create_tokens(self, user_id: str) -> Dict[str, Any]:
        """Create access and refresh token pair."""
        access_token = create_access_token(data={"sub": user_id})
        refresh_token = create_refresh_token(data={"sub": user_id})

        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "expires_in": settings.jwt_access_token_expire_minutes * 60,
        }

    @staticmethod
    def _sanitize_user(user: dict) -> dict:
        """Remove sensitive fields from user data."""
        sanitized = {k: v for k, v in user.items() if k != "password_hash"}
        return sanitized
