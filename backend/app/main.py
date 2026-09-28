from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.routes import (
    audit_logs,
    auth,
    dashboard,
    records,
    sync,
    users,
)


app = FastAPI(
    title=settings.app_name,
    description=(
        "Offline-first data synchronization platform "
        "with authentication, local synchronization, "
        "optimistic concurrency, conflict resolution, "
        "record management, dashboard summaries, "
        "and audit logging."
    ),
    version="0.6.0",
)


# ============================================================
# CORS
# ============================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# API ROUTES
# ============================================================

app.include_router(
    auth.router
)

app.include_router(
    users.router
)

app.include_router(
    records.router
)

app.include_router(
    sync.sync_router
)

app.include_router(
    sync.conflicts_router
)

app.include_router(
    dashboard.router
)

app.include_router(
    audit_logs.router
)


# ============================================================
# HEALTH
# ============================================================

@app.get(
    "/",
    tags=["Health"],
)
async def root() -> dict[str, str]:
    return {
        "message": settings.app_name,
        "status": "running",
        "version": "0.6.0",
    }


@app.get(
    "/health",
    tags=["Health"],
)
async def health_check() -> dict[str, str]:
    return {
        "status": "healthy",
    }