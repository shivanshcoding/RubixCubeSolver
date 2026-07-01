"""
CubeVision AI — FastAPI Dependencies

Shared dependencies for dependency injection in routes.
"""

from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from app.core.security import decode_token
from app.database.connection import get_database

security_scheme = HTTPBearer(auto_error=False)


async def get_db():
    """Dependency: returns the MongoDB database instance."""
    return get_database()


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme),
    db=Depends(get_db),
) -> dict:
    """
    Dependency: extracts and validates the current user from JWT token.
    Raises 401 if token is missing or invalid.
    """
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = decode_token(credentials.credentials)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
        )

    # Fetch user from database
    from app.repositories.user_repository import UserRepository
    user_repo = UserRepository(db)
    user = await user_repo.find_by_id(user_id)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )

    return user


async def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme),
    db=Depends(get_db),
) -> Optional[dict]:
    """
    Dependency: returns current user if authenticated, None otherwise.
    Does not raise errors for unauthenticated requests.
    """
    if credentials is None:
        return None

    payload = decode_token(credentials.credentials)
    if payload is None:
        return None

    user_id = payload.get("sub")
    if not user_id:
        return None

    from app.repositories.user_repository import UserRepository
    user_repo = UserRepository(db)
    return await user_repo.find_by_id(user_id)
