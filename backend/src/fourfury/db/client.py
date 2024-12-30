import importlib
from typing import Any, cast

from fastapi import FastAPI
from motor.motor_asyncio import AsyncIOMotorCollection, AsyncIOMotorDatabase
from pymongo.results import DeleteResult, InsertOneResult

from ..api.fields import PyObjectId
from ..api.models import MongoDBModel


class MongoDBClient:
    __instance = None
    mongo_db: AsyncIOMotorDatabase

    def __new__(cls) -> "MongoDBClient":
        if cls.__instance is None:
            cls.__instance = super().__new__(cls)
            app = get_current_app()
            cls.__instance.mongo_db = app.state.mongo_db
        return cls.__instance

    def get_collection(
        self, model_cls: type[MongoDBModel]
    ) -> AsyncIOMotorCollection:
        collection_name = model_cls.get_collection_name()
        return self.mongo_db.get_collection(collection_name)

    async def insert(
        self, model_cls: type[MongoDBModel], data: dict[str, Any]
    ) -> InsertOneResult:
        collection = self.get_collection(model_cls)
        return await collection.insert_one(data)

    async def get(
        self, model_cls: type[MongoDBModel], id: PyObjectId
    ) -> dict[str, Any] | None:
        collection = self.get_collection(model_cls)
        result = await collection.find_one({"_id": id})
        if result is None:
            return None

        result = cast(dict[str, Any], result)
        return result | {"id": result.pop("_id")}

    async def list(
        self, model_cls: type[MongoDBModel]
    ) -> list[dict[str, Any]]:
        collection = self.get_collection(model_cls)
        results = collection.find({})
        container = []
        async for result in results:
            result = cast(dict[str, Any], result)
            container.append(result | {"id": result.pop("_id")})

        return container

    async def delete_all(self, model_cls: type[MongoDBModel]) -> DeleteResult:
        collection = self.get_collection(model_cls)
        return await collection.delete_many({})


def get_current_app() -> FastAPI:
    module = importlib.import_module("src.fourfury.run")
    field = "app"
    return cast(FastAPI, getattr(module, field))
