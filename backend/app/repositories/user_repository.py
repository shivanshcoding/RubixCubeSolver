"""
CubeVision AI — User Repository

Data access layer for user operations in MongoDB.
"""

from typing import Optional, List
from datetime import datetime, timezone
from bson import ObjectId


class UserRepository:
    """MongoDB operations for the users collection."""

    def __init__(self, db):
        self.collection = db.users

    async def create(self, user_data: dict) -> dict:
        """Create a new user document."""
        user_data["created_at"] = datetime.now(timezone.utc)
        user_data["updated_at"] = datetime.now(timezone.utc)

        # Set defaults
        user_data.setdefault("contest_rating", 1200)
        user_data.setdefault("total_solves", 0)
        user_data.setdefault("avg_solve_time_ms", 0)
        user_data.setdefault("avg_move_count", 0)
        user_data.setdefault("daily_streak", 0)
        user_data.setdefault("best_streak", 0)
        user_data.setdefault("total_scans", 0)
        user_data.setdefault("achievements", [])
        user_data.setdefault("display_name", user_data.get("username", ""))
        user_data.setdefault("avatar_url", None)
        user_data.setdefault("country", None)
        user_data.setdefault("bio", None)
        user_data.setdefault("is_setup_complete", True)

        result = await self.collection.insert_one(user_data)
        user_data["_id"] = result.inserted_id
        return self._serialize(user_data)

    async def find_by_id(self, user_id: str) -> Optional[dict]:
        """Find user by ID."""
        try:
            user = await self.collection.find_one({"_id": ObjectId(user_id)})
            return self._serialize(user) if user else None
        except Exception:
            return None

    async def find_by_email(self, email: str) -> Optional[dict]:
        """Find user by email address."""
        user = await self.collection.find_one({"email": email.lower()})
        return self._serialize(user) if user else None

    async def find_by_username(self, username: str) -> Optional[dict]:
        """Find user by username."""
        user = await self.collection.find_one({"username": username.lower()})
        return self._serialize(user) if user else None

    async def update(self, user_id: str, update_data: dict) -> Optional[dict]:
        """Update user fields."""
        update_data["updated_at"] = datetime.now(timezone.utc)
        result = await self.collection.find_one_and_update(
            {"_id": ObjectId(user_id)},
            {"$set": update_data},
            return_document=True,
        )
        return self._serialize(result) if result else None

    async def increment_stats(
        self,
        user_id: str,
        solve_time_ms: int = 0,
        move_count: int = 0,
    ) -> Optional[dict]:
        """Increment solve stats after a successful solve."""
        user = await self.find_by_id(user_id)
        if not user:
            return None

        total = user.get("total_solves", 0)
        old_avg_time = user.get("avg_solve_time_ms", 0)
        old_avg_moves = user.get("avg_move_count", 0)

        # Running average calculation
        new_total = total + 1
        new_avg_time = int(((old_avg_time * total) + solve_time_ms) / new_total)
        new_avg_moves = int(((old_avg_moves * total) + move_count) / new_total)

        update_data = {
            "total_solves": new_total,
            "avg_solve_time_ms": new_avg_time,
            "avg_move_count": new_avg_moves,
            "updated_at": datetime.now(timezone.utc),
        }

        result = await self.collection.find_one_and_update(
            {"_id": ObjectId(user_id)},
            {"$set": update_data},
            return_document=True,
        )
        return self._serialize(result) if result else None

    async def update_rating(self, user_id: str, new_rating: int) -> Optional[dict]:
        """Update user's contest rating."""
        return await self.update(user_id, {"contest_rating": new_rating})

    async def update_streak(self, user_id: str, streak: int) -> Optional[dict]:
        """Update daily streak."""
        user = await self.find_by_id(user_id)
        if not user:
            return None

        best = max(user.get("best_streak", 0), streak)
        return await self.update(user_id, {
            "daily_streak": streak,
            "best_streak": best,
        })

    async def add_achievement(self, user_id: str, achievement_id: str) -> Optional[dict]:
        """Add an achievement to user's list."""
        result = await self.collection.find_one_and_update(
            {"_id": ObjectId(user_id)},
            {
                "$addToSet": {"achievements": achievement_id},
                "$set": {"updated_at": datetime.now(timezone.utc)},
            },
            return_document=True,
        )
        return self._serialize(result) if result else None

    async def get_leaderboard(self, limit: int = 50, skip: int = 0) -> List[dict]:
        """Get users sorted by contest rating."""
        cursor = self.collection.find(
            {},
            {
                "password_hash": 0,  # Exclude sensitive data
            },
        ).sort("contest_rating", -1).skip(skip).limit(limit)

        users = []
        async for user in cursor:
            users.append(self._serialize(user))
        return users

    async def get_user_rank(self, user_id: str) -> int:
        """Get user's rank by contest rating."""
        user = await self.find_by_id(user_id)
        if not user:
            return -1

        count = await self.collection.count_documents({
            "contest_rating": {"$gt": user.get("contest_rating", 1200)},
        })
        return count + 1

    @staticmethod
    def _serialize(doc: dict) -> dict:
        """Convert MongoDB document to JSON-serializable dict."""
        if doc and "_id" in doc:
            doc["id"] = str(doc.pop("_id"))
        return doc
