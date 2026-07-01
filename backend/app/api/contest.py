"""
CubeVision AI — Contest API Routes

Daily scrambles, weekend contests, leaderboard endpoints.
"""

from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime, timezone, date, timedelta
import random
from typing import Optional

from app.core.dependencies import get_db, get_current_user, get_optional_user
from app.models.contest import SubmitContestRequest

router = APIRouter(prefix="/api/contest", tags=["Contest"])

# Standard Rubik's Cube moves for scramble generation
SCRAMBLE_MOVES = ["U", "U'", "U2", "D", "D'", "D2", "R", "R'", "R2",
                  "L", "L'", "L2", "F", "F'", "F2", "B", "B'", "B2"]


def generate_scramble(length: int = 20) -> str:
    """Generate a random scramble sequence."""
    moves = []
    last_face = ""

    for _ in range(length):
        # Avoid consecutive moves on the same face
        available = [m for m in SCRAMBLE_MOVES if m[0] != last_face]
        move = random.choice(available)
        moves.append(move)
        last_face = move[0]

    return " ".join(moves)


# ─── Daily Scramble ───────────────────────────────────────────────

@router.get("/daily")
async def get_daily_scramble(
    user: Optional[dict] = Depends(get_optional_user),
    db=Depends(get_db),
):
    """Get today's daily scramble (creates one if it doesn't exist)."""
    today = date.today().isoformat()

    # Check if scramble exists
    scramble = await db.daily_scrambles.find_one({"date": today})

    if not scramble:
        # Generate new daily scramble
        scramble_str = generate_scramble(20)
        scramble = {
            "date": today,
            "scramble": scramble_str,
            "created_at": datetime.now(timezone.utc),
        }
        await db.daily_scrambles.insert_one(scramble)

    # Check if user has submitted
    has_submitted = False
    user_best = None
    if user:
        submission = await db.contest_submissions.find_one({
            "user_id": user["id"],
            "contest_id": today,
            "contest_type": "daily",
        })
        has_submitted = submission is not None
        if submission:
            user_best = submission.get("solve_time_ms")

    return {
        "date": today,
        "scramble": scramble["scramble"],
        "scramble_moves": scramble["scramble"].split(),
        "has_submitted": has_submitted,
        "best_time_ms": user_best,
    }


@router.post("/daily/submit")
async def submit_daily(
    request: SubmitContestRequest,
    user=Depends(get_current_user),
    db=Depends(get_db),
):
    """Submit a daily scramble solve."""
    today = date.today().isoformat()

    # Check if already submitted
    existing = await db.contest_submissions.find_one({
        "user_id": user["id"],
        "contest_id": today,
        "contest_type": "daily",
    })
    if existing:
        raise HTTPException(status_code=409, detail="Already submitted today")

    # Save submission
    submission = {
        "user_id": user["id"],
        "contest_id": today,
        "contest_type": "daily",
        "solve_time_ms": request.solve_time_ms,
        "move_count": request.move_count,
        "moves": request.moves,
        "hints_used": request.hints_used,
        "rating_before": user.get("contest_rating", 1200),
        "created_at": datetime.now(timezone.utc),
    }

    await db.contest_submissions.insert_one(submission)

    # Update user streak
    from app.repositories.user_repository import UserRepository
    user_repo = UserRepository(db)
    current_streak = user.get("daily_streak", 0) + 1
    await user_repo.update_streak(user["id"], current_streak)

    return {
        "success": True,
        "message": "Daily solve submitted!",
        "streak": current_streak,
    }


# ─── Weekend Contest ──────────────────────────────────────────────

@router.get("/weekend")
async def get_weekend_contest(
    user: Optional[dict] = Depends(get_optional_user),
    db=Depends(get_db),
):
    """Get the current weekend contest."""
    today = date.today()
    # Find the most recent Saturday
    days_since_saturday = (today.weekday() - 5) % 7
    saturday = today - timedelta(days=days_since_saturday)
    sunday = saturday + timedelta(days=1)

    contest_id = saturday.isoformat()

    contest = await db.weekend_contests.find_one({"start_date": contest_id})

    if not contest:
        # Generate 3 scrambles
        scrambles = [
            {"scramble": generate_scramble(20), "index": i}
            for i in range(3)
        ]
        contest = {
            "start_date": contest_id,
            "end_date": sunday.isoformat(),
            "scrambles": scrambles,
            "is_active": today <= sunday,
            "created_at": datetime.now(timezone.utc),
        }
        await db.weekend_contests.insert_one(contest)

    # Check user submission
    has_submitted = False
    if user:
        submission = await db.contest_submissions.find_one({
            "user_id": user["id"],
            "contest_id": contest_id,
            "contest_type": "weekend",
        })
        has_submitted = submission is not None

    contest.pop("_id", None)
    contest["has_submitted"] = has_submitted

    return contest


# ─── Leaderboard ──────────────────────────────────────────────────

@router.get("/leaderboard/{contest_type}/{contest_id}")
async def get_leaderboard(
    contest_type: str,
    contest_id: str,
    user: Optional[dict] = Depends(get_optional_user),
    db=Depends(get_db),
    limit: int = 50,
):
    """Get leaderboard for a specific contest."""
    cursor = db.contest_submissions.find({
        "contest_id": contest_id,
        "contest_type": contest_type,
    }).sort("solve_time_ms", 1).limit(limit)

    entries = []
    rank = 1
    async for doc in cursor:
        # Get user info
        from bson import ObjectId
        user_doc = await db.users.find_one({"_id": ObjectId(doc["user_id"])})

        entries.append({
            "rank": rank,
            "user_id": doc["user_id"],
            "username": user_doc.get("username", "Unknown") if user_doc else "Unknown",
            "display_name": user_doc.get("display_name") if user_doc else None,
            "avatar_url": user_doc.get("avatar_url") if user_doc else None,
            "country": user_doc.get("country") if user_doc else None,
            "solve_time_ms": doc["solve_time_ms"],
            "move_count": doc["move_count"],
            "rating": user_doc.get("contest_rating", 1200) if user_doc else 1200,
        })
        rank += 1

    # Get user's position
    user_position = None
    if user:
        all_submissions = await db.contest_submissions.count_documents({
            "contest_id": contest_id,
            "contest_type": contest_type,
        })
        user_sub = await db.contest_submissions.find_one({
            "user_id": user["id"],
            "contest_id": contest_id,
            "contest_type": contest_type,
        })
        if user_sub:
            faster = await db.contest_submissions.count_documents({
                "contest_id": contest_id,
                "contest_type": contest_type,
                "solve_time_ms": {"$lt": user_sub["solve_time_ms"]},
            })
            user_position = faster + 1

    return {
        "contest_id": contest_id,
        "contest_type": contest_type,
        "entries": entries,
        "total_participants": len(entries),
        "user_position": user_position,
    }


@router.get("/leaderboard/global")
async def get_global_leaderboard(
    db=Depends(get_db),
    limit: int = 50,
):
    """Get global rating leaderboard."""
    from app.repositories.user_repository import UserRepository
    user_repo = UserRepository(db)
    users = await user_repo.get_leaderboard(limit=limit)

    entries = []
    for i, u in enumerate(users):
        entries.append({
            "rank": i + 1,
            "user_id": u.get("id"),
            "username": u.get("username"),
            "display_name": u.get("display_name"),
            "avatar_url": u.get("avatar_url"),
            "country": u.get("country"),
            "rating": u.get("contest_rating", 1200),
            "total_solves": u.get("total_solves", 0),
        })

    return {"entries": entries}
