"""
CubeVision AI — MongoDB Connection

Async MongoDB connection using Motor driver.
"""

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from app.core.config import settings

_client: AsyncIOMotorClient = None
_database: AsyncIOMotorDatabase = None


async def connect_to_database():
    """Initialize MongoDB connection. Called on app startup."""
    global _client, _database
    _client = AsyncIOMotorClient(settings.mongodb_url)
    _database = _client[settings.mongodb_db_name]

    # Create indexes
    await _create_indexes()

    print(f"✓ Connected to MongoDB: {settings.mongodb_db_name}")


async def close_database_connection():
    """Close MongoDB connection. Called on app shutdown."""
    global _client
    if _client:
        _client.close()
        print("✓ MongoDB connection closed")


def get_database() -> AsyncIOMotorDatabase:
    """Get the database instance. Used as a FastAPI dependency."""
    return _database


async def _create_indexes():
    """Create MongoDB indexes for performance."""
    db = _database

    # Users: unique email and username
    await db.users.create_index("email", unique=True)
    await db.users.create_index("username", unique=True)

    # Cube states: user lookup
    await db.cube_states.create_index("user_id")
    await db.cube_states.create_index("created_at")

    # Solutions: user lookup and timing
    await db.solutions.create_index("user_id")
    await db.solutions.create_index("created_at")

    # Daily scrambles: date lookup
    await db.daily_scrambles.create_index("date", unique=True)

    # Contest submissions: compound index
    await db.contest_submissions.create_index([
        ("contest_id", 1),
        ("user_id", 1),
    ])

    # Leaderboard: rating descending
    await db.users.create_index([("contest_rating", -1)])

    # Scans: user lookup
    await db.scans.create_index("user_id")

    # Analytics: timestamp
    await db.analytics.create_index("timestamp")
