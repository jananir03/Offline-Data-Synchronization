from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.conflict import Conflict
from app.models.local_sync_operation import (
    LocalSyncOperation,
    SyncOperationStatus,
)
from app.models.record import Record, RecordStatus
from app.models.user import User


async def get_dashboard_summary(
    db: AsyncSession,
    user: User,
) -> dict:
    """Return dashboard counts scoped to the current user."""

    record_base_filters = [
        Record.created_by == user.id,
        Record.deleted_at.is_(None),
    ]

    total_records_result = await db.execute(
        select(func.count(Record.id)).where(
            *record_base_filters
        )
    )
    total_records = int(total_records_result.scalar_one())

    status_result = await db.execute(
        select(
            Record.status,
            func.count(Record.id),
        )
        .where(*record_base_filters)
        .group_by(Record.status)
    )

    status_counts = {
        status: 0
        for status in RecordStatus
    }

    for record_status, count in status_result.all():
        status_counts[record_status] = int(count)

    sync_result = await db.execute(
        select(
            LocalSyncOperation.status,
            func.count(LocalSyncOperation.id),
        )
        .where(
            LocalSyncOperation.user_id == user.id
        )
        .group_by(LocalSyncOperation.status)
    )

    sync_counts = {
        status: 0
        for status in SyncOperationStatus
    }

    for operation_status, count in sync_result.all():
        sync_counts[operation_status] = int(count)

    conflict_result = await db.execute(
        select(func.count(Conflict.id))
        .join(
            LocalSyncOperation,
            Conflict.operation_id
            == LocalSyncOperation.operation_id,
        )
        .where(
            LocalSyncOperation.user_id == user.id
        )
    )

    total_conflicts = int(conflict_result.scalar_one())

    return {
        "total_records": total_records,
        "record_status": {
            "pending": status_counts[RecordStatus.PENDING],
            "in_progress": status_counts[RecordStatus.IN_PROGRESS],
            "completed": status_counts[RecordStatus.COMPLETED],
            "cancelled": status_counts[RecordStatus.CANCELLED],
        },
        "sync": {
            "total_operations": sum(sync_counts.values()),
            "successful_operations": sync_counts[
                SyncOperationStatus.SUCCESS
            ],
            "failed_operations": sync_counts[
                SyncOperationStatus.FAILED
            ],
            "conflict_operations": sync_counts[
                SyncOperationStatus.CONFLICT
            ],
        },
        "total_conflicts": total_conflicts,
    }
