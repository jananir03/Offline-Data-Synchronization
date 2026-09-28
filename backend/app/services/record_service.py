from uuid import UUID

from sqlalchemy import asc, desc, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.record import Record, RecordStatus
from app.models.user import User


async def create_record(
    db: AsyncSession,
    user: User,
    title: str,
    description: str | None,
    status: RecordStatus,
) -> Record:
    record = Record(
        title=title,
        description=description,
        status=status,
        version=1,
        created_by=user.id,
    )

    db.add(record)

    await db.commit()
    await db.refresh(record)

    return record


async def get_record(
    db: AsyncSession,
    user: User,
    record_id: UUID,
) -> Record | None:
    result = await db.execute(
        select(Record).where(
            Record.id == record_id,
            Record.created_by == user.id,
            Record.deleted_at.is_(None),
        )
    )

    return result.scalar_one_or_none()


async def list_records(
    db: AsyncSession,
    user: User,
    page: int,
    page_size: int,
    search: str | None = None,
    status: RecordStatus | None = None,
    sort_by: str = "updated_at",
    sort_order: str = "desc",
) -> tuple[list[Record], int]:
    """Return paginated, searchable records belonging to the current user."""

    filters = [
        Record.created_by == user.id,
        Record.deleted_at.is_(None),
    ]

    if search:
        search_value = f"%{search.strip()}%"
        filters.append(
            or_(
                Record.title.ilike(search_value),
                Record.description.ilike(search_value),
            )
        )

    if status is not None:
        filters.append(Record.status == status)

    total_result = await db.execute(
        select(func.count(Record.id)).where(*filters)
    )
    total = int(total_result.scalar_one())

    sort_columns = {
        "title": Record.title,
        "status": Record.status,
        "created_at": Record.created_at,
        "updated_at": Record.updated_at,
        "version": Record.version,
    }

    sort_column = sort_columns.get(
        sort_by,
        Record.updated_at,
    )

    order_expression = (
        asc(sort_column)
        if sort_order == "asc"
        else desc(sort_column)
    )

    offset = (page - 1) * page_size

    result = await db.execute(
        select(Record)
        .where(*filters)
        .order_by(order_expression)
        .offset(offset)
        .limit(page_size)
    )

    return list(result.scalars().all()), total


async def update_record(
    db: AsyncSession,
    record: Record,
    title: str | None,
    description: str | None,
    status: RecordStatus | None,
) -> Record:
    if title is not None:
        record.title = title

    if description is not None:
        record.description = description

    if status is not None:
        record.status = status

    record.version += 1

    await db.commit()
    await db.refresh(record)

    return record


async def delete_record(
    db: AsyncSession,
    record: Record,
) -> None:
    from datetime import datetime, timezone

    record.deleted_at = datetime.now(timezone.utc)
    record.version += 1

    await db.commit()
