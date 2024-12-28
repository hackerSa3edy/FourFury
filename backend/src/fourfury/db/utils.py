from motor.motor_asyncio import AsyncIOMotorClient

from ..settings import settings


def get_db_client() -> AsyncIOMotorClient:
    return AsyncIOMotorClient(settings.MONGO_URL)
