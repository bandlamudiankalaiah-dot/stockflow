"""StockFlow API entrypoint.

Run locally:
    uvicorn main:app --reload
"""

import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

import models  # noqa: F401  (register ORM models)
from auth import router as auth_router
from dashboard import router as dashboard_router
from database import DATABASE_URL, init_db
from products import router as products_router
from settings import router as settings_router


def _cors_origins() -> list[str]:
    raw = os.getenv(
        "CORS_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173,"
        "http://localhost:3002,http://127.0.0.1:3002,"
        "http://localhost:4173,http://127.0.0.1:4173",
    )
    return [origin.strip() for origin in raw.split(",") if origin.strip()]


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(
    title="StockFlow API",
    description=(
        "Multi-tenant inventory management API. Every product belongs to an "
        "organization and is only reachable with that organization's JWT."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins(),
    allow_origin_regex=os.getenv("CORS_ORIGIN_REGEX", r"https://.*\.(style\.dev|vercel\.app)"),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(products_router)
app.include_router(dashboard_router)
app.include_router(settings_router)


@app.get("/", tags=["Health"])
def root():
    database_kind = "sqlite" if DATABASE_URL.startswith("sqlite") else "postgresql"
    return {"service": "StockFlow API", "status": "ok", "database": database_kind}


@app.get("/health", tags=["Health"])
def health():
    return {"status": "healthy"}
