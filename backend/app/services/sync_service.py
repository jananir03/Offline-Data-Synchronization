from datetime import datetime, timezone
from typing import Any
from uuid import UUID

from redis.exceptions import RedisError
from sqlalchemy import asc, desc, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.redis import redis_client
from app.models.audit_log import AuditLog
from app.models.conflict import (
    Conflict,
    ConflictResolution,
    ConflictState,
)
from app.models.local_sync_operation import (
    LocalSyncOperation,
    SyncOperationStatus,
)
from app.models.record import Record
from app.models.sync_history import (
    ConflictStatus,
    SyncHistory,
    SyncHistoryStatus,
)
from app.models.user import User
from app.schemas.sync import (
    SyncOperationRequest,
    SyncOperationResult,
)


class SyncService:
    """
    Service responsible for processing offline synchronization
    operations.

    Synchronization strategy:

    1. Check operation_id for idempotency.
    2. Acquire a Redis lock for the record.
    3. Process CREATE / UPDATE / DELETE.
    4. Validate optimistic concurrency.
    5. Store sync history.
    6. Store conflicts when required.
    7. Store audit logs.
    8. Commit the transaction.
    9. Release the Redis lock.
    """

    LOCK_EXPIRY_SECONDS = 30

    async def _acquire_lock(
        self,
        record_id: UUID,
    ) -> str | None:
        lock_key = f"sync:record:{record_id}"

        token = (
            f"{record_id}:"
            f"{datetime.now(timezone.utc).timestamp()}"
        )

        try:
            acquired = await redis_client.set(
                lock_key,
                token,
                nx=True,
                ex=self.LOCK_EXPIRY_SECONDS,
            )
        except RedisError:
            raise

        if acquired:
            return token

        return None

    async def _release_lock(
        self,
        record_id: UUID,
        token: str,
    ) -> None:
        lock_key = f"sync:record:{record_id}"

        try:
            current_token = await redis_client.get(lock_key)

            if current_token == token:
                await redis_client.delete(lock_key)

        except RedisError:
            # The main database transaction has already completed.
            # Redis cleanup failure should not change the result
            # of the completed synchronization operation.
            pass

    async def _find_existing_operation(
        self,
        db: AsyncSession,
        operation_id: UUID,
    ) -> LocalSyncOperation | None:
        result = await db.execute(
            select(LocalSyncOperation).where(
                LocalSyncOperation.operation_id
                == operation_id
            )
        )

        return result.scalar_one_or_none()

    async def get_sync_history(
        self,
        db: AsyncSession,
        user: User,
        page: int,
        page_size: int,
        status: str | None = None,
        operation_type: str | None = None,
        conflict_status: str | None = None,
        sort_by: str = "timestamp",
        sort_order: str = "desc",
    ) -> tuple[list[SyncHistory], int]:
        """Return paginated sync history belonging only to the current user."""
        filters = [LocalSyncOperation.user_id == user.id]

        if status:
            filters.append(SyncHistory.status == status)

        if operation_type:
            filters.append(SyncHistory.operation_type == operation_type)

        if conflict_status:
            filters.append(SyncHistory.conflict_status == conflict_status)

        total_result = await db.execute(
            select(func.count(SyncHistory.sync_id))
            .join(
                LocalSyncOperation,
                SyncHistory.operation_id == LocalSyncOperation.operation_id,
            )
            .where(*filters)
        )
        total = int(total_result.scalar_one())

        sort_columns = {
            "timestamp": SyncHistory.timestamp,
            "operation_type": SyncHistory.operation_type,
            "status": SyncHistory.status,
            "conflict_status": SyncHistory.conflict_status,
        }
        sort_column = sort_columns.get(sort_by, SyncHistory.timestamp)
        order_expression = (
            asc(sort_column) if sort_order == "asc" else desc(sort_column)
        )

        offset = (page - 1) * page_size

        result = await db.execute(
            select(SyncHistory)
            .join(
                LocalSyncOperation,
                SyncHistory.operation_id == LocalSyncOperation.operation_id,
            )
            .where(*filters)
            .order_by(order_expression)
            .offset(offset)
            .limit(page_size)
        )

        return list(result.scalars().all()), total

    async def get_conflicts(
        self,
        db: AsyncSession,
        user: User,
        page: int,
        page_size: int,
        status: str | None = None,
        resolution: str | None = None,
        sort_by: str = "created_at",
        sort_order: str = "desc",
    ) -> tuple[list[Conflict], int]:
        """Return paginated conflicts belonging only to the current user."""
        filters = [LocalSyncOperation.user_id == user.id]

        if status:
            filters.append(Conflict.status == status)

        if resolution:
            filters.append(Conflict.resolution == resolution)

        total_result = await db.execute(
            select(func.count(Conflict.id))
            .join(
                LocalSyncOperation,
                Conflict.operation_id == LocalSyncOperation.operation_id,
            )
            .where(*filters)
        )
        total = int(total_result.scalar_one())

        sort_columns = {
            "created_at": Conflict.created_at,
            "client_version": Conflict.client_version,
            "server_version": Conflict.server_version,
            "status": Conflict.status,
            "resolution": Conflict.resolution,
        }
        sort_column = sort_columns.get(sort_by, Conflict.created_at)
        order_expression = (
            asc(sort_column) if sort_order == "asc" else desc(sort_column)
        )

        offset = (page - 1) * page_size

        result = await db.execute(
            select(Conflict)
            .join(
                LocalSyncOperation,
                Conflict.operation_id == LocalSyncOperation.operation_id,
            )
            .where(*filters)
            .order_by(order_expression)
            .offset(offset)
            .limit(page_size)
        )

        return list(result.scalars().all()), total

    async def get_conflict_by_id(
        self,
        db: AsyncSession,
        user: User,
        conflict_id: UUID,
    ) -> Conflict | None:
        """Return one conflict only if it belongs to the current user."""
        result = await db.execute(
            select(Conflict)
            .join(
                LocalSyncOperation,
                Conflict.operation_id == LocalSyncOperation.operation_id,
            )
            .where(
                Conflict.id == conflict_id,
                LocalSyncOperation.user_id == user.id,
            )
        )
        return result.scalar_one_or_none()

    async def _create_sync_history(
        self,
        db: AsyncSession,
        operation: SyncOperationRequest,
        status: SyncHistoryStatus,
        conflict_status: ConflictStatus,
        error_details: str | None = None,
    ) -> SyncHistory:
        history = SyncHistory(
            sync_id=operation.operation_id,
            operation_id=operation.operation_id,
            record_id=operation.record_id,
            operation_type=operation.operation_type,
            status=status,
            conflict_status=conflict_status,
            error_details=error_details,
        )

        db.add(history)

        return history

    async def _create_conflict(
        self,
        db: AsyncSession,
        operation: SyncOperationRequest,
        record: Record,
    ) -> Conflict:
        conflict = Conflict(
            record_id=record.id,
            operation_id=operation.operation_id,
            client_version=operation.base_version,
            server_version=record.version,
            client_payload=operation.payload,
            server_payload={
                "id": str(record.id),
                "title": record.title,
                "description": record.description,
                "status": record.status,
                "version": record.version,
                "created_by": str(record.created_by),
                "created_at": (
                    record.created_at.isoformat()
                    if record.created_at
                    else None
                ),
                "updated_at": (
                    record.updated_at.isoformat()
                    if record.updated_at
                    else None
                ),
                "deleted_at": (
                    record.deleted_at.isoformat()
                    if record.deleted_at
                    else None
                ),
            },
            resolution=ConflictResolution.SERVER_WINS,
            status=ConflictState.RESOLVED,
            resolved_at=datetime.now(timezone.utc),
        )

        db.add(conflict)

        return conflict

    async def _create_audit_log(
        self,
        db: AsyncSession,
        user_id: UUID,
        action: str,
        record_id: UUID,
        details: dict[str, Any],
    ) -> None:
        audit_log = AuditLog(
            user_id=user_id,
            action=action,
            entity="record",
            entity_id=str(record_id),
            details=details,
        )

        db.add(audit_log)

    async def process_operation(
        self,
        db: AsyncSession,
        user: User,
        operation: SyncOperationRequest,
    ) -> SyncOperationResult:
        """
        Process a single synchronization operation.
        """

        # ---------------------------------------------------------
        # 1. Idempotency check
        # ---------------------------------------------------------
        existing_operation = await self._find_existing_operation(
            db,
            operation.operation_id,
        )

        if existing_operation:
            if (
                existing_operation.status
                == SyncOperationStatus.SUCCESS
            ):
                return SyncOperationResult(
                    operation_id=operation.operation_id,
                    record_id=operation.record_id,
                    operation_type=operation.operation_type,
                    status="SUCCESS",
                    conflict=False,
                    message=(
                        "Operation was already processed "
                        "successfully."
                    ),
                    server_version=None,
                    processed_at=(
                        existing_operation.processed_at
                    ),
                )

            if (
                existing_operation.status
                == SyncOperationStatus.CONFLICT
            ):
                return SyncOperationResult(
                    operation_id=operation.operation_id,
                    record_id=operation.record_id,
                    operation_type=operation.operation_type,
                    status="CONFLICT",
                    conflict=True,
                    message=(
                        "Operation was already processed "
                        "as a conflict."
                    ),
                    server_version=None,
                    processed_at=(
                        existing_operation.processed_at
                    ),
                )

        # ---------------------------------------------------------
        # 2. Create local operation record
        # ---------------------------------------------------------
        operation_record = LocalSyncOperation(
            operation_id=operation.operation_id,
            record_id=operation.record_id,
            user_id=user.id,
            operation_type=operation.operation_type,
            base_version=operation.base_version,
            payload=operation.payload,
            status=SyncOperationStatus.PROCESSING,
            retry_count=0,
        )

        db.add(operation_record)

        try:
            await db.flush()

        except IntegrityError:
            await db.rollback()

            existing_operation = (
                await self._find_existing_operation(
                    db,
                    operation.operation_id,
                )
            )

            if existing_operation:
                return SyncOperationResult(
                    operation_id=operation.operation_id,
                    record_id=operation.record_id,
                    operation_type=operation.operation_type,
                    status=existing_operation.status,
                    conflict=(
                        existing_operation.status
                        == SyncOperationStatus.CONFLICT
                    ),
                    message=(
                        "Operation was already received "
                        "by the server."
                    ),
                    server_version=None,
                    processed_at=(
                        existing_operation.processed_at
                    ),
                )

            raise

        # ---------------------------------------------------------
        # 3. Acquire Redis lock
        # ---------------------------------------------------------
        try:
            lock_token = await self._acquire_lock(
                operation.record_id
            )

        except RedisError as exc:
            operation_record.status = (
                SyncOperationStatus.FAILED
            )
            operation_record.error_details = (
                f"Redis lock error: {exc}"
            )
            operation_record.processed_at = (
                datetime.now(timezone.utc)
            )

            await db.commit()

            return SyncOperationResult(
                operation_id=operation.operation_id,
                record_id=operation.record_id,
                operation_type=operation.operation_type,
                status="FAILED",
                conflict=False,
                message=(
                    "Unable to acquire synchronization "
                    "lock because Redis is unavailable."
                ),
                processed_at=operation_record.processed_at,
            )

        if not lock_token:
            operation_record.status = (
                SyncOperationStatus.FAILED
            )
            operation_record.error_details = (
                "Another synchronization operation is "
                "currently processing this record."
            )
            operation_record.processed_at = (
                datetime.now(timezone.utc)
            )

            await db.commit()

            return SyncOperationResult(
                operation_id=operation.operation_id,
                record_id=operation.record_id,
                operation_type=operation.operation_type,
                status="FAILED",
                conflict=False,
                message=(
                    "Another synchronization operation is "
                    "currently processing this record. "
                    "Please retry."
                ),
                processed_at=operation_record.processed_at,
            )

        try:
            # -----------------------------------------------------
            # 4. Process operation
            # -----------------------------------------------------
            if operation.operation_type == "CREATE":
                result = await self._process_create(
                    db=db,
                    user=user,
                    operation=operation,
                    operation_record=operation_record,
                )

            elif operation.operation_type == "UPDATE":
                result = await self._process_update(
                    db=db,
                    user=user,
                    operation=operation,
                    operation_record=operation_record,
                )

            elif operation.operation_type == "DELETE":
                result = await self._process_delete(
                    db=db,
                    user=user,
                    operation=operation,
                    operation_record=operation_record,
                )

            else:
                raise ValueError(
                    "Unsupported synchronization operation."
                )

            await db.commit()

            return result

        except Exception as exc:
            await db.rollback()

            return SyncOperationResult(
                operation_id=operation.operation_id,
                record_id=operation.record_id,
                operation_type=operation.operation_type,
                status="FAILED",
                conflict=False,
                message=(
                    f"Synchronization failed: {exc}"
                ),
            )

        finally:
            await self._release_lock(
                operation.record_id,
                lock_token,
            )

    # =============================================================
    # CREATE
    # =============================================================

    async def _process_create(
        self,
        db: AsyncSession,
        user: User,
        operation: SyncOperationRequest,
        operation_record: LocalSyncOperation,
    ) -> SyncOperationResult:
        result = await db.execute(
            select(Record).where(
                Record.id == operation.record_id
            )
        )

        existing_record = result.scalar_one_or_none()

        if existing_record:
            operation_record.status = (
                SyncOperationStatus.CONFLICT
            )
            operation_record.processed_at = (
                datetime.now(timezone.utc)
            )
            operation_record.error_details = (
                "A record with this ID already exists."
            )

            conflict = await self._create_conflict(
                db=db,
                operation=operation,
                record=existing_record,
            )

            await self._create_sync_history(
                db=db,
                operation=operation,
                status=SyncHistoryStatus.CONFLICT,
                conflict_status=ConflictStatus.DETECTED,
                error_details=(
                    "Record already exists."
                ),
            )

            await self._create_audit_log(
                db=db,
                user_id=user.id,
                action="SYNC_CONFLICT",
                record_id=operation.record_id,
                details={
                    "operation_id": str(
                        operation.operation_id
                    ),
                    "operation_type": "CREATE",
                    "conflict_id": str(conflict.id),
                    "resolution": "SERVER_WINS",
                },
            )

            return SyncOperationResult(
                operation_id=operation.operation_id,
                record_id=operation.record_id,
                operation_type="CREATE",
                status="CONFLICT",
                conflict=True,
                message=(
                    "Create operation conflicts with "
                    "an existing server record."
                ),
                server_version=existing_record.version,
                processed_at=operation_record.processed_at,
            )

        title = operation.payload.get("title")

        if not title:
            raise ValueError(
                "CREATE operation requires 'title'."
            )

        record = Record(
            id=operation.record_id,
            title=str(title),
            description=operation.payload.get(
                "description"
            ),
            status=operation.payload.get(
                "status",
                "PENDING",
            ),
            version=1,
            created_by=user.id,
        )

        db.add(record)

        operation_record.status = (
            SyncOperationStatus.SUCCESS
        )
        operation_record.processed_at = (
            datetime.now(timezone.utc)
        )

        await self._create_sync_history(
            db=db,
            operation=operation,
            status=SyncHistoryStatus.SUCCESS,
            conflict_status=ConflictStatus.NONE,
        )

        await self._create_audit_log(
            db=db,
            user_id=user.id,
            action="SYNC_CREATE",
            record_id=record.id,
            details={
                "operation_id": str(
                    operation.operation_id
                ),
                "version": record.version,
            },
        )

        return SyncOperationResult(
            operation_id=operation.operation_id,
            record_id=record.id,
            operation_type="CREATE",
            status="SUCCESS",
            conflict=False,
            message="Record created successfully.",
            server_version=record.version,
            processed_at=operation_record.processed_at,
        )

    # =============================================================
    # UPDATE
    # =============================================================

    async def _process_update(
        self,
        db: AsyncSession,
        user: User,
        operation: SyncOperationRequest,
        operation_record: LocalSyncOperation,
    ) -> SyncOperationResult:
        result = await db.execute(
            select(Record).where(
                Record.id == operation.record_id
            )
        )

        record = result.scalar_one_or_none()

        if not record:
            operation_record.status = (
                SyncOperationStatus.FAILED
            )
            operation_record.processed_at = (
                datetime.now(timezone.utc)
            )
            operation_record.error_details = (
                "Record not found."
            )

            await self._create_sync_history(
                db=db,
                operation=operation,
                status=SyncHistoryStatus.FAILED,
                conflict_status=ConflictStatus.NONE,
                error_details="Record not found.",
            )

            return SyncOperationResult(
                operation_id=operation.operation_id,
                record_id=operation.record_id,
                operation_type="UPDATE",
                status="FAILED",
                conflict=False,
                message="Record not found on server.",
                processed_at=operation_record.processed_at,
            )

        if record.created_by != user.id:
            raise ValueError(
                "You are not allowed to modify this record."
            )

        # ---------------------------------------------------------
        # Optimistic concurrency check
        # ---------------------------------------------------------
        if record.version != operation.base_version:
            operation_record.status = (
                SyncOperationStatus.CONFLICT
            )
            operation_record.processed_at = (
                datetime.now(timezone.utc)
            )
            operation_record.error_details = (
                "Optimistic concurrency conflict."
            )

            conflict = await self._create_conflict(
                db=db,
                operation=operation,
                record=record,
            )

            await self._create_sync_history(
                db=db,
                operation=operation,
                status=SyncHistoryStatus.CONFLICT,
                conflict_status=ConflictStatus.DETECTED,
                error_details=(
                    "Record version mismatch."
                ),
            )

            await self._create_audit_log(
                db=db,
                user_id=user.id,
                action="SYNC_CONFLICT",
                record_id=record.id,
                details={
                    "operation_id": str(
                        operation.operation_id
                    ),
                    "client_version": (
                        operation.base_version
                    ),
                    "server_version": record.version,
                    "conflict_id": str(conflict.id),
                    "resolution": "SERVER_WINS",
                },
            )

            return SyncOperationResult(
                operation_id=operation.operation_id,
                record_id=record.id,
                operation_type="UPDATE",
                status="CONFLICT",
                conflict=True,
                message=(
                    "Version conflict detected. "
                    "Server version was retained."
                ),
                server_version=record.version,
                processed_at=operation_record.processed_at,
            )

        # ---------------------------------------------------------
        # Apply update
        # ---------------------------------------------------------
        allowed_fields = {
            "title",
            "description",
            "status",
        }

        for field, value in operation.payload.items():
            if field in allowed_fields and value is not None:
                setattr(record, field, value)

        record.version += 1
        record.updated_at = datetime.now(timezone.utc)

        operation_record.status = (
            SyncOperationStatus.SUCCESS
        )
        operation_record.processed_at = (
            datetime.now(timezone.utc)
        )

        await self._create_sync_history(
            db=db,
            operation=operation,
            status=SyncHistoryStatus.SUCCESS,
            conflict_status=ConflictStatus.NONE,
        )

        await self._create_audit_log(
            db=db,
            user_id=user.id,
            action="SYNC_UPDATE",
            record_id=record.id,
            details={
                "operation_id": str(
                    operation.operation_id
                ),
                "version": record.version,
            },
        )

        return SyncOperationResult(
            operation_id=operation.operation_id,
            record_id=record.id,
            operation_type="UPDATE",
            status="SUCCESS",
            conflict=False,
            message="Record updated successfully.",
            server_version=record.version,
            processed_at=operation_record.processed_at,
        )

    # =============================================================
    # DELETE
    # =============================================================

    async def _process_delete(
        self,
        db: AsyncSession,
        user: User,
        operation: SyncOperationRequest,
        operation_record: LocalSyncOperation,
    ) -> SyncOperationResult:
        result = await db.execute(
            select(Record).where(
                Record.id == operation.record_id
            )
        )

        record = result.scalar_one_or_none()

        if not record:
            operation_record.status = (
                SyncOperationStatus.FAILED
            )
            operation_record.processed_at = (
                datetime.now(timezone.utc)
            )
            operation_record.error_details = (
                "Record not found."
            )

            await self._create_sync_history(
                db=db,
                operation=operation,
                status=SyncHistoryStatus.FAILED,
                conflict_status=ConflictStatus.NONE,
                error_details="Record not found.",
            )

            return SyncOperationResult(
                operation_id=operation.operation_id,
                record_id=operation.record_id,
                operation_type="DELETE",
                status="FAILED",
                conflict=False,
                message="Record not found on server.",
                processed_at=operation_record.processed_at,
            )

        if record.created_by != user.id:
            raise ValueError(
                "You are not allowed to delete this record."
            )

        # ---------------------------------------------------------
        # Optimistic concurrency check
        # ---------------------------------------------------------
        if record.version != operation.base_version:
            operation_record.status = (
                SyncOperationStatus.CONFLICT
            )
            operation_record.processed_at = (
                datetime.now(timezone.utc)
            )
            operation_record.error_details = (
                "Optimistic concurrency conflict."
            )

            conflict = await self._create_conflict(
                db=db,
                operation=operation,
                record=record,
            )

            await self._create_sync_history(
                db=db,
                operation=operation,
                status=SyncHistoryStatus.CONFLICT,
                conflict_status=ConflictStatus.DETECTED,
                error_details=(
                    "Record version mismatch."
                ),
            )

            await self._create_audit_log(
                db=db,
                user_id=user.id,
                action="SYNC_CONFLICT",
                record_id=record.id,
                details={
                    "operation_id": str(
                        operation.operation_id
                    ),
                    "client_version": (
                        operation.base_version
                    ),
                    "server_version": record.version,
                    "conflict_id": str(conflict.id),
                    "resolution": "SERVER_WINS",
                },
            )

            return SyncOperationResult(
                operation_id=operation.operation_id,
                record_id=record.id,
                operation_type="DELETE",
                status="CONFLICT",
                conflict=True,
                message=(
                    "Delete operation conflicted with "
                    "a newer server version."
                ),
                server_version=record.version,
                processed_at=operation_record.processed_at,
            )

        # ---------------------------------------------------------
        # Soft delete
        # ---------------------------------------------------------
        now = datetime.now(timezone.utc)

        record.deleted_at = now
        record.version += 1
        record.updated_at = now

        operation_record.status = (
            SyncOperationStatus.SUCCESS
        )
        operation_record.processed_at = now

        await self._create_sync_history(
            db=db,
            operation=operation,
            status=SyncHistoryStatus.SUCCESS,
            conflict_status=ConflictStatus.NONE,
        )

        await self._create_audit_log(
            db=db,
            user_id=user.id,
            action="SYNC_DELETE",
            record_id=record.id,
            details={
                "operation_id": str(
                    operation.operation_id
                ),
                "version": record.version,
            },
        )

        return SyncOperationResult(
            operation_id=operation.operation_id,
            record_id=record.id,
            operation_type="DELETE",
            status="SUCCESS",
            conflict=False,
            message="Record deleted successfully.",
            server_version=record.version,
            processed_at=operation_record.processed_at,
        )


sync_service = SyncService()