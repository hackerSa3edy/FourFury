from contextlib import asynccontextmanager

from fastapi import FastAPI

from .api.views import router as api_router
from .db.utils import get_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        # Setup MongoDB connection
        mongo_db = get_db()
        app.state.mongo_db = mongo_db
        yield
    finally:
        # Close MongoDB connection
        app.state.mongo_db.client.close()


app = FastAPI(title="FourFury", lifespan=lifespan)
app.include_router(api_router)


@app.get("/")
async def root() -> dict[str, str]:
    return {"message": "Welcome to FourFury API"}
