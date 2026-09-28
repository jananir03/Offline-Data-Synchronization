from uuid import UUID

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Query,
    status,
)
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.dependencies import require_admin
from app.models.user import User
from app.schemas.audit_log import (
    AuditLogListResponse,
    AuditLogResponse,
)
from app.services.audit_log_service import (
    get_audit_log_by_id,
    list_audit_logs,
)


router = APIRouter(
    prefix="/api/audit-logs",
    tags=["Audit Logs"],
)


# ============================================================
# LIST AUDIT LOGS
# ============================================================

@router.get(
    "",
    response_model=AuditLogListResponse,
)
async def get_audit_logs(
    page: int = Query(
        default=1,
        ge=1,
    ),
    page_size: int = Query(
        default=20,
        ge=1,
        le=100,
    ),
    action: str | None = Query(
        default=None,
        max_length=100,
    ),
    entity: str | None = Query(
        default=None,
        max_length=100,
    ),
    sort_by: str = Query(
        default="created_at",
        pattern=(
            "^(created_at|action|entity|entity_id)$"
        ),
    ),
    sort_order: str = Query(
        default="desc",
        pattern="^(asc|desc)$",
    ),
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> AuditLogListResponse:

    items, total = await list_audit_logs(
        db=db,
        page=page,
        page_size=page_size,
        action=action,
        entity=entity,
        sort_by=sort_by,
        sort_order=sort_order,
    )

    total_pages = (
        (total + page_size - 1)
        // page_size
    )

    return AuditLogListResponse(
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
        items=[
            AuditLogResponse.model_validate(item)
            for item in items
        ],
    )


# ============================================================
# GET ONE AUDIT LOG
# ============================================================

@router.get(
    "/{audit_log_id}",
    response_model=AuditLogResponse,
)
async def get_audit_log(
    audit_log_id: UUID,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> AuditLogResponse:

    audit_log = await get_audit_log_by_id(
        db=db,
        audit_log_id=audit_log_id,
    )

    if audit_log is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Audit log not found.",
        )

    return AuditLogResponse.model_validate(
        audit_log
    )