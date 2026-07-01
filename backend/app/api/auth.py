"""
CubeVision AI — Auth API Routes

Authentication endpoints: signup, login, refresh, profile.
"""

from fastapi import APIRouter, Depends, HTTPException

from app.core.dependencies import get_db, get_current_user
from app.models.user import (
    SignupRequest,
    LoginRequest,
    RefreshTokenRequest,
    UpdateProfileRequest,
    ChangePasswordRequest,
    TokenResponse,
    UserProfileResponse,
)
from app.services.auth_service import AuthService

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


@router.post("/signup")
async def signup(request: SignupRequest, db=Depends(get_db)):
    """Register a new user account."""
    service = AuthService(db)
    result = await service.signup(
        username=request.username,
        email=request.email,
        password=request.password,
        display_name=request.display_name,
        country=request.country,
    )
    return {
        "success": True,
        "user": result["user"],
        "tokens": result["tokens"],
    }


@router.post("/login")
async def login(request: LoginRequest, db=Depends(get_db)):
    """Authenticate and receive tokens."""
    service = AuthService(db)
    result = await service.login(
        email=request.email,
        password=request.password,
    )
    return {
        "success": True,
        "user": result["user"],
        "tokens": result["tokens"],
    }


@router.post("/refresh")
async def refresh_token(request: RefreshTokenRequest, db=Depends(get_db)):
    """Refresh access token using refresh token."""
    service = AuthService(db)
    result = await service.refresh(refresh_token=request.refresh_token)
    return {
        "success": True,
        "user": result["user"],
        "tokens": result["tokens"],
    }


@router.get("/me")
async def get_me(current_user=Depends(get_current_user), db=Depends(get_db)):
    """Get current user's profile."""
    service = AuthService(db)
    profile = await service.get_profile(current_user["id"])
    return {
        "success": True,
        "user": profile,
    }


@router.put("/me")
async def update_me(
    request: UpdateProfileRequest,
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    """Update current user's profile."""
    service = AuthService(db)
    updated = await service.update_profile(
        user_id=current_user["id"],
        update_data=request.model_dump(exclude_unset=True),
    )
    return {
        "success": True,
        "user": updated,
    }


@router.post("/change-password")
async def change_password(
    request: ChangePasswordRequest,
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    """Change current user's password."""
    service = AuthService(db)
    await service.change_password(
        user_id=current_user["id"],
        current_password=request.current_password,
        new_password=request.new_password,
    )
    return {
        "success": True,
        "message": "Password changed successfully",
    }


@router.get("/check-username/{username}")
async def check_username(username: str, db=Depends(get_db)):
    """Check if a username is available."""
    from app.repositories.user_repository import UserRepository
    user_repo = UserRepository(db)
    existing = await user_repo.find_by_username(username.lower().strip())
    return {"available": existing is None, "username": username}


@router.get("/check-email/{email}")
async def check_email(email: str, db=Depends(get_db)):
    """Check if email is available."""
    from app.repositories.user_repository import UserRepository
    repo = UserRepository(db)
    user = await repo.find_by_email(email)
    return {"available": user is None}


import os
import httpx
from urllib.parse import urlencode
from app.repositories.user_repository import UserRepository
from app.core.security import create_access_token, create_refresh_token
from datetime import timedelta
import random
import string

@router.get("/google")
async def google_auth():
    """Initiate Google OAuth flow."""
    client_id = os.getenv("GOOGLE_CLIENT_ID")
    redirect_uri = os.getenv("GOOGLE_REDIRECT_URI", "http://localhost:3000/auth/google/callback")
    
    if not client_id:
        # Fallback for development if no client id is provided
        return {"auth_url": "/auth/google/callback?code=mock_dev_code"}
        
    params = {
        "client_id": client_id,
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": "openid email profile",
        "access_type": "offline",
        "prompt": "consent",
    }
    url = f"https://accounts.google.com/o/oauth2/v2/auth?{urlencode(params)}"
    return {"auth_url": url}


@router.post("/google/callback")
async def google_auth_callback(request: dict, db=Depends(get_db)):
    """Handle Google OAuth callback and fetch user data."""
    code = request.get("code")
    client_id = os.getenv("GOOGLE_CLIENT_ID")
    client_secret = os.getenv("GOOGLE_CLIENT_SECRET")
    redirect_uri = os.getenv("GOOGLE_REDIRECT_URI", "http://localhost:3000/auth/google/callback")
    
    user_info = None
    
    if code == "mock_dev_code" or not client_id:
        user_info = {
            "email": "mockuser@google.com",
            "name": "Mock User",
            "picture": "https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y"
        }
    else:
        # Exchange code for token
        async with httpx.AsyncClient() as client:
            token_res = await client.post("https://oauth2.googleapis.com/token", data={
                "client_id": client_id,
                "client_secret": client_secret,
                "code": code,
                "grant_type": "authorization_code",
                "redirect_uri": redirect_uri,
            })
            
            if token_res.status_code != 200:
                raise HTTPException(status_code=400, detail="Failed to exchange Google token")
                
            token_data = token_res.json()
            access_token = token_data.get("access_token")
            
            # Fetch user info
            user_res = await client.get("https://www.googleapis.com/oauth2/v2/userinfo", headers={
                "Authorization": f"Bearer {access_token}"
            })
            
            if user_res.status_code != 200:
                raise HTTPException(status_code=400, detail="Failed to fetch Google profile")
                
            user_info = user_res.json()
            
    repo = UserRepository(db)
    email = user_info.get("email").lower()
    user = await repo.get_user_by_email(email)
    
    is_new_user = False
    
    if not user:
        is_new_user = True
        # Generate random username for now
        random_suffix = ''.join(random.choices(string.digits, k=5))
        temp_username = f"user_{random_suffix}"
        
        user = await repo.create_user({
            "username": temp_username,
            "email": email,
            "password_hash": "", # No password for OAuth
            "display_name": user_info.get("name"),
            "avatar_url": user_info.get("picture"),
            "is_setup_complete": False,
        })
    elif not user.get("avatar_url"):
        # Update avatar if missing
        await repo.update(str(user["_id"]), {"avatar_url": user_info.get("picture")})
        user["avatar_url"] = user_info.get("picture")
        
    acc_token = create_access_token(
        data={"sub": str(user["_id"])},
        expires_delta=timedelta(minutes=60),
    )
    ref_token = create_refresh_token(
        data={"sub": str(user["_id"])}
    )
    
    return {
        "success": True,
        "is_new_user": is_new_user,
        "user": {
            "id": str(user["_id"]),
            "username": user["username"],
            "email": user["email"],
            "display_name": user["display_name"],
            "avatar_url": user.get("avatar_url"),
            "country": user.get("country"),
            "bio": user.get("bio"),
            "is_setup_complete": user.get("is_setup_complete", True),
        },
        "tokens": {
            "access_token": acc_token,
            "refresh_token": ref_token,
        }
    }


from app.models.user import SetupProfileRequest

@router.post("/setup-profile", response_model=UserProfileResponse)
async def setup_profile(
    request: SetupProfileRequest,
    user: dict = Depends(get_current_user),
    db=Depends(get_db),
):
    """Complete profile setup for new OAuth users."""
    from app.repositories.user_repository import UserRepository
    repo = UserRepository(db)
    
    # Check if username is taken (and not by this user)
    existing = await repo.find_by_username(request.username)
    if existing and existing["id"] != user["id"]:
        raise HTTPException(status_code=400, detail="Username is already taken")
        
    updated = await repo.update(user["id"], {
        "username": request.username,
        "country": request.country,
        "bio": request.bio,
        "is_setup_complete": True,
    })
    
    if not updated:
        raise HTTPException(status_code=404, detail="User not found")
        
    return updated