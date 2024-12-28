import importlib
from typing import Any, cast

from fastapi import FastAPI
from motor.motor_asyncio import AsyncIOMotorCollection, AsyncIOMotorDatabase
from pymongo.results import InsertOneResult

from fourfury.api.models import Game


class MongoDBClient:
    __instance = None
    mongo_db: AsyncIOMotorDatabase

    def __new__(cls) -> "MongoDBClient":
        if cls.__instance is None:
            cls.__instance = super().__new__(cls)
            app = get_current_app()
            cls.__instance.mongo_db = app.state.mongo_db
        return cls.__instance

    def get_collection(self, model_cls: type[Game]) -> AsyncIOMotorCollection:
        collection_name = model_cls.get_collection_name()
        return self.mongo_db.get_collection(collection_name)

    async def insert(
        self, model_cls: type[Game], data: dict[str, Any]
    ) -> InsertOneResult:
        collection = self.get_collection(model_cls)
        return await collection.insert_one(data)

    async def get(self, model_cls: type[Game], id: str) -> dict[str, Any]:
        collection = self.get_collection(model_cls)
        result = cast(dict[str, Any], await collection.find_one({"_id": id}))
        return result | {"id": result.pop("_id")}


def get_current_app() -> FastAPI:
    module = importlib.import_module("fourfury.run")
    field = "app"
    return cast(FastAPI, getattr(module, field))
