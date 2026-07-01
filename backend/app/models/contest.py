"""
CubeVision AI — Contest Models

Pydantic models for contests, leaderboards, and achievements.
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, date


# ─── Daily Scramble ───────────────────────────────────────────────

class DailyScramble(BaseModel):
    """Daily scramble challenge."""
    id: Optional[str] = None
    date: str  # ISO date string YYYY-MM-DD
    scramble: str  # Space-separated move sequence
    scramble_string: str  # 54-char cube state after scramble
    created_at: Optional[datetime] = None


class DailyScrambleResponse(BaseModel):
    """Daily scramble for frontend."""
    date: str
    scramble: str
    scramble_moves: List[str]
    has_submitted: bool = False
    best_time_ms: Optional[int] = None
    leaderboard_position: Optional[int] = None


# ─── Contest ──────────────────────────────────────────────────────

class WeekendContest(BaseModel):
    """Weekend contest with 3 scrambles."""
    id: Optional[str] = None
    start_date: str
    end_date: str
    scrambles: List[dict]  # List of {scramble, scramble_string}
    is_active: bool = True
    created_at: Optional[datetime] = None


class ContestSubmission(BaseModel):
    """User's submission to a contest."""
    id: Optional[str] = None
    user_id: str
    contest_id: str  # daily scramble date or weekend contest ID
    contest_type: str  # "daily" | "weekend"
    solve_time_ms: int
    move_count: int
    moves: List[str]
    hints_used: int = 0
    accuracy: float = 1.0
    rating_before: int = 1200
    rating_after: int = 1200
    created_at: Optional[datetime] = None


class SubmitContestRequest(BaseModel):
    """Submit a contest solve."""
    contest_id: str
    contest_type: str  # "daily" | "weekend"
    solve_time_ms: int
    move_count: int
    moves: List[str]
    hints_used: int = 0


# ─── Leaderboard ──────────────────────────────────────────────────

class LeaderboardEntry(BaseModel):
    """Single leaderboard entry."""
    rank: int
    user_id: str
    username: str
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None
    country: Optional[str] = None
    solve_time_ms: int
    move_count: int
    rating: int = 1200


class LeaderboardResponse(BaseModel):
    """Leaderboard for a contest."""
    contest_id: str
    contest_type: str
    entries: List[LeaderboardEntry]
    total_participants: int
    user_position: Optional[int] = None


# ─── Achievements ─────────────────────────────────────────────────

class Achievement(BaseModel):
    """Achievement definition."""
    id: str
    name: str
    description: str
    icon: str  # emoji or icon name
    category: str  # speed | accuracy | streak | contest | milestone
    threshold: int  # Value needed to unlock
    points: int = 10


class UserAchievement(BaseModel):
    """User's earned achievement."""
    achievement_id: str
    earned_at: datetime
    progress: int = 0  # Current progress toward threshold


# Default achievements
DEFAULT_ACHIEVEMENTS = [
    Achievement(id="first_solve", name="First Steps", description="Solve your first cube", icon="🎯", category="milestone", threshold=1, points=10),
    Achievement(id="ten_solves", name="Getting Serious", description="Solve 10 cubes", icon="🔥", category="milestone", threshold=10, points=25),
    Achievement(id="fifty_solves", name="Cube Master", description="Solve 50 cubes", icon="👑", category="milestone", threshold=50, points=50),
    Achievement(id="hundred_solves", name="Centurion", description="Solve 100 cubes", icon="💯", category="milestone", threshold=100, points=100),
    Achievement(id="speed_demon", name="Speed Demon", description="Solve under 20 moves", icon="⚡", category="speed", threshold=20, points=30),
    Achievement(id="minimalist", name="Minimalist", description="Solve under 15 moves", icon="✨", category="speed", threshold=15, points=50),
    Achievement(id="streak_3", name="Hat Trick", description="3-day solve streak", icon="🎩", category="streak", threshold=3, points=15),
    Achievement(id="streak_7", name="Week Warrior", description="7-day solve streak", icon="⚔️", category="streak", threshold=7, points=30),
    Achievement(id="streak_30", name="Monthly Legend", description="30-day solve streak", icon="🏆", category="streak", threshold=30, points=100),
    Achievement(id="first_contest", name="Competitor", description="Enter your first contest", icon="🏅", category="contest", threshold=1, points=15),
    Achievement(id="top_10", name="Elite", description="Finish in top 10 of a contest", icon="🥇", category="contest", threshold=1, points=50),
    Achievement(id="scanner_pro", name="Eagle Eye", description="Scan 10 cubes with camera", icon="📸", category="milestone", threshold=10, points=25),
    Achievement(id="rating_1400", name="Rising Star", description="Reach 1400 rating", icon="⭐", category="contest", threshold=1400, points=40),
    Achievement(id="rating_1600", name="Grandmaster", description="Reach 1600 rating", icon="💎", category="contest", threshold=1600, points=75),
]
