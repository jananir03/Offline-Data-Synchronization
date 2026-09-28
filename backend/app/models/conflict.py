import uuid
from datetime import datetime
from enum import Enum

from sqlalchemy import DateTime, Integer, JSON, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class ConflictResolution(str, Enum):
    SERVER_WINS = "SERVER_WINS"
    CLIENT_WINS = "CLIENT_WINS"
    MANUAL = "MANUAL"


class ConflictState(str, Enum):
    OPEN = "OPEN"
    RESOLVED = "RESOLVED"


class Conflict(Base):
    __tablename__ = "conflicts"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True,
        default=uuid.uuid4,
    )

    record_id: Mapped[uuid.UUID] = mapped_column(
        nullable=False,
        index=True,
    )

    operation_id: Mapped[uuid.UUID] = mapped_column(
        nullable=False,
        index=True,
    )

    client_version: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
    )

    server_version: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )

    client_payload: Mapped[dict] = mapped_column(
        JSON,
        nullable=False,
    )

    server_payload: Mapped[dict] = mapped_column(
        JSON,
        nullable=False,
    )

    resolution: Mapped[ConflictResolution] = mapped_column(
        String(20),
        nullable=False,
    )

    status: Mapped[ConflictState] = mapped_column(
        String(20),
        default=ConflictState.OPEN,
        nullable=False,
        index=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    resolved_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )