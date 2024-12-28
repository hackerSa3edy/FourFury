from contextlib import asynccontextmanager

from fastapi import FastAPI


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        # Setup MongoDB connection
        yield
    finally:
        # Close MongoDB connection
        pass


app = FastAPI(title="FourFury", lifespan=lifespan)


@app.get("/")
async def root() -> dict[str, str]:
    return {"message": "Welcome to FourFury API"}
