from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.models.record import RecordStatus


class RecordCreate(BaseModel):
    title: str = Field(
        min_length=1,
        max_length=200,
    )

    description: str | None = None

    status: RecordStatus = RecordStatus.PENDING


class RecordUpdate(BaseModel):
    title: str | None = Field(
        default=None,
        min_length=1,
        max_length=200,
    )

    description: str | None = None

    status: RecordStatus | None = None


class RecordResponse(BaseModel):
    model_config = ConfigDict(
        from_attributes=True,
    )

    id: UUID
    title: str
    description: str | None
    status: RecordStatus
    version: int
    created_by: UUID
    created_at: datetime
    updated_at: datetime
    deleted_at: datetime | None


class RecordListResponse(BaseModel):
    total: int
    page: int
    page_size: int
    total_pages: int
    items: list[RecordResponse]
