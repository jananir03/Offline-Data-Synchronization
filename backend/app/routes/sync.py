from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.sync import (
    ConflictListResponse,
    ConflictResponse,
    SyncBatchRequest,
    SyncBatchResponse,
    SyncHistoryListResponse,
    SyncHistoryResponse,
)
from app.services.sync_service import sync_service


# ============================================================
# SYNCHRONIZATION ROUTER
# ============================================================

sync_router = APIRouter(
    prefix="/api/sync",
    tags=["Synchronization"],
)


@sync_router.post(
    "/batch",
    response_model=SyncBatchResponse,
)
async def synchronize_batch(
    request: SyncBatchRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> SyncBatchResponse:

    results = []

    for operation in request.operations:
        result = await sync_service.process_operation(
            db=db,
            user=current_user,
            operation=operation,
        )

        results.append(result)

    successful_operations = sum(
        1
        for result in results
        if result.status == "SUCCESS"
    )

    failed_operations = sum(
        1
        for result in results
        if result.status == "FAILED"
    )

    conflict_operations = sum(
        1
        for result in results
        if result.status == "CONFLICT"
    )

    return SyncBatchResponse(
        total_operations=len(results),
        successful_operations=successful_operations,
        failed_operations=failed_operations,
        conflict_operations=conflict_operations,
        results=results,
    )


# ============================================================
# SYNC HISTORY
# ============================================================

@sync_router.get(
    "/history",
    response_model=SyncHistoryListResponse,
)
async def get_sync_history(
    page: int = Query(
        default=1,
        ge=1,
    ),
    page_size: int = Query(
        default=20,
        ge=1,
        le=100,
    ),
    status_filter: str | None = Query(
        default=None,
        alias="status",
        pattern="^(SUCCESS|FAILED|CONFLICT)$",
    ),
    operation_type: str | None = Query(
        default=None,
        pattern="^(CREATE|UPDATE|DELETE)$",
    ),
    conflict_status: str | None = Query(
        default=None,
        pattern="^(NONE|DETECTED|RESOLVED)$",
    ),
    sort_by: str = Query(
        default="timestamp",
        pattern="^(timestamp|operation_type|status|conflict_status)$",
    ),
    sort_order: str = Query(
        default="desc",
        pattern="^(asc|desc)$",
    ),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> SyncHistoryListResponse:

    items, total = await sync_service.get_sync_history(
        db=db,
        user=current_user,
        page=page,
        page_size=page_size,
        status=status_filter,
        operation_type=operation_type,
        conflict_status=conflict_status,
        sort_by=sort_by,
        sort_order=sort_order,
    )

    total_pages = (total + page_size - 1) // page_size

    return SyncHistoryListResponse(
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
        items=[
            SyncHistoryResponse.model_validate(item)
            for item in items
        ],
    )


# ============================================================
# CONFLICTS ROUTER
# ============================================================

conflicts_router = APIRouter(
    prefix="/api/sync",
    tags=["Conflicts"],
)


@conflicts_router.get(
    "/conflicts",
    response_model=ConflictListResponse,
)
async def get_conflicts(
    page: int = Query(
        default=1,
        ge=1,
    ),
    page_size: int = Query(
        default=20,
        ge=1,
        le=100,
    ),
    status_filter: str | None = Query(
        default=None,
        alias="status",
        pattern="^(OPEN|RESOLVED)$",
    ),
    resolution: str | None = Query(
        default=None,
        pattern="^(SERVER_WINS|CLIENT_WINS|MANUAL)$",
    ),
    sort_by: str = Query(
        default="created_at",
        pattern="^(created_at|client_version|server_version|status|resolution)$",
    ),
    sort_order: str = Query(
        default="desc",
        pattern="^(asc|desc)$",
    ),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ConflictListResponse:

    # IMPORTANT:
    # The service returns:
    #
    #     (items, total)
    #
    # So we unpack the tuple first.

    items, total = await sync_service.get_conflicts(
        db=db,
        user=current_user,
        page=page,
        page_size=page_size,
        status=status_filter,
        resolution=resolution,
        sort_by=sort_by,
        sort_order=sort_order,
    )

    total_pages = (total + page_size - 1) // page_size

    return ConflictListResponse(
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
        items=[
            ConflictResponse.model_validate(item)
            for item in items
        ],
    )


@conflicts_router.get(
    "/conflicts/{conflict_id}",
    response_model=ConflictResponse,
)
async def get_conflict(
    conflict_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ConflictResponse:

    conflict = await sync_service.get_conflict_by_id(
        db=db,
        user=current_user,
        conflict_id=conflict_id,
    )

    if not conflict:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conflict not found.",
        )

    return ConflictResponse.model_validate(conflict)