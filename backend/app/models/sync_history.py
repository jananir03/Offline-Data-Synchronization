import uuid
from datetime import datetime
from enum import Enum

from sqlalchemy import DateTime, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class SyncHistoryStatus(str, Enum):
    SUCCESS = "SUCCESS"
    FAILED = "FAILED"
    CONFLICT = "CONFLICT"


class ConflictStatus(str, Enum):
    NONE = "NONE"
    DETECTED = "DETECTED"
    RESOLVED = "RESOLVED"


class SyncHistory(Base):
    __tablename__ = "sync_history"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True,
        default=uuid.uuid4,
    )

    sync_id: Mapped[uuid.UUID] = mapped_column(
        unique=True,
        nullable=False,
        index=True,
    )

    operation_id: Mapped[uuid.UUID] = mapped_column(
        nullable=False,
        index=True,
    )

    record_id: Mapped[uuid.UUID] = mapped_column(
        nullable=False,
        index=True,
    )

    operation_type: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
    )

    status: Mapped[SyncHistoryStatus] = mapped_column(
        String(20),
        nullable=False,
        index=True,
    )

    conflict_status: Mapped[ConflictStatus] = mapped_column(
        String(20),
        default=ConflictStatus.NONE,
        nullable=False,
    )

    error_details: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        index=True,
    )