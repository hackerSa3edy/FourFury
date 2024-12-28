from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from ..settings import settings


def get_db() -> AsyncIOMotorDatabase:
    client = AsyncIOMotorClient(settings.MONGO_URL)
    return client.get_database(settings.MONGO_DB)
