from uuid import UUID

from sqlalchemy import asc, desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit_log import AuditLog


async def list_audit_logs(
    db: AsyncSession,
    page: int,
    page_size: int,
    action: str | None = None,
    entity: str | None = None,
    sort_by: str = "created_at",
    sort_order: str = "desc",
) -> tuple[list[AuditLog], int]:
    """
    Return paginated audit logs.

    Audit log access is restricted at the route level
    to administrators.
    """

    filters = []

    # ---------------------------------------------------------
    # Filters
    # ---------------------------------------------------------

    if action:
        filters.append(
            AuditLog.action == action
        )

    if entity:
        filters.append(
            AuditLog.entity == entity
        )

    # ---------------------------------------------------------
    # Total count
    # ---------------------------------------------------------

    total_result = await db.execute(
        select(
            func.count(AuditLog.id)
        ).where(*filters)
    )

    total = int(
        total_result.scalar_one()
    )

    # ---------------------------------------------------------
    # Sorting
    # ---------------------------------------------------------

    sort_columns = {
        "created_at": AuditLog.created_at,
        "action": AuditLog.action,
        "entity": AuditLog.entity,
        "entity_id": AuditLog.entity_id,
    }

    sort_column = sort_columns.get(
        sort_by,
        AuditLog.created_at,
    )

    order_expression = (
        asc(sort_column)
        if sort_order == "asc"
        else desc(sort_column)
    )

    # ---------------------------------------------------------
    # Pagination
    # ---------------------------------------------------------

    offset = (page - 1) * page_size

    result = await db.execute(
        select(AuditLog)
        .where(*filters)
        .order_by(order_expression)
        .offset(offset)
        .limit(page_size)
    )

    items = list(
        result.scalars().all()
    )

    return items, total


async def get_audit_log_by_id(
    db: AsyncSession,
    audit_log_id: UUID,
) -> AuditLog | None:
    """
    Return one audit log by ID.
    """

    result = await db.execute(
        select(AuditLog).where(
            AuditLog.id == audit_log_id
        )
    )

    return result.scalar_one_or_none()