from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from app.ai_routes import router as ai_router
from app.database import get_connection, init_db
from app.routes import router

STATIC_DIR = Path(__file__).resolve().parent.parent / "static"


@asynccontextmanager
async def lifespan(app: FastAPI):
    conn = get_connection()
    try:
        init_db(conn)
    finally:
        conn.close()
    yield


app = FastAPI(lifespan=lifespan)


@app.get("/api/hello")
def hello() -> dict[str, str]:
    return {"message": "Hello from the API"}


app.include_router(router)
app.include_router(ai_router)

app.mount("/", StaticFiles(directory=STATIC_DIR, html=True), name="static")
