from fastapi import FastAPI

app = FastAPI(title="FourFury")


@app.get("/")
async def root() -> dict[str, str]:
    return {"message": "Welcome to FourFury API"}
