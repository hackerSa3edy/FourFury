from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api.models import Game
from .api.socketio_manager import socket_app
from .api.views import router as api_router
from .db.client import MongoDBClient
from .db.utils import get_db_client
from .settings import settings


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    try:
        # Setup MongoDB connection
        client = get_db_client()
        db = client.get_database(settings.MONGODB_DB_NAME)
        app.state.mongo_db = db

        # Initialize MongoDB client and create indexes
        mongodb_client = MongoDBClient()
        await mongodb_client.init_indexes(Game)

        yield
    finally:
        # Close MongoDB connection
        app.state.mongo_db.client.close()


app = FastAPI(
    title="FourFury",
    description="""
    FourFury Game API

    This API provides endpoints for managing Connect Four games with various modes:
    * Human vs Human
    * Human vs AI
    * Online multiplayer

    All endpoints require session authentication via cookies.
    """,
    version="1.0.0",
    lifespan=lifespan,
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,  # Ensure frontend URLs are included
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

# Add prefixes to routes
API_PREFIX = "/api"
SOCKET_PREFIX = "/socket.io"

app.include_router(api_router, prefix=API_PREFIX)
app.mount(SOCKET_PREFIX, socket_app, name="socketio")


# @app.get("/")
# async def root() -> dict[str, str]:
#     return {"message": "Welcome to FourFury API"}
