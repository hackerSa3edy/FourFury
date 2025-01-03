from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api.views import router as api_router
from .db.utils import get_db_client
from .settings import settings


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    try:
        # Setup MongoDB connection
        client = get_db_client()
        db = client.get_database(settings.MONGO_DB)
        app.state.mongo_db = db
        yield
    finally:
        # Close MongoDB connection
        app.state.mongo_db.client.close()


app = FastAPI(title="FourFury", lifespan=lifespan)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,  # Add your frontend URLs
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

app.include_router(api_router)


@app.get("/")
async def root() -> dict[str, str]:
    return {"message": "Welcome to FourFury API"}
