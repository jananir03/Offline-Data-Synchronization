from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class SyncOperationRequest(BaseModel):
    operation_id: UUID
    record_id: UUID

    operation_type: str = Field(
        ...,
        pattern="^(CREATE|UPDATE|DELETE)$",
    )

    base_version: int = Field(
        default=0,
        ge=0,
    )

    payload: dict[str, Any] = Field(
        default_factory=dict,
    )


class SyncBatchRequest(BaseModel):
    operations: list[SyncOperationRequest] = Field(
        ...,
        min_length=1,
        max_length=100,
    )


class SyncOperationResult(BaseModel):
    operation_id: UUID
    record_id: UUID
    operation_type: str

    status: str
    conflict: bool = False

    message: str

    server_version: int | None = None

    processed_at: datetime | None = None


class SyncBatchResponse(BaseModel):
    total_operations: int

    successful_operations: int
    failed_operations: int
    conflict_operations: int

    results: list[SyncOperationResult]


class SyncHistoryResponse(BaseModel):
    sync_id: UUID
    operation_id: UUID
    record_id: UUID
    operation_type: str
    status: str
    conflict_status: str
    error_details: str | None
    timestamp: datetime

    model_config = ConfigDict(
        from_attributes=True,
    )


class SyncHistoryListResponse(BaseModel):
    total: int
    page: int
    page_size: int
    total_pages: int
    items: list[SyncHistoryResponse]


class ConflictResponse(BaseModel):
    id: UUID
    record_id: UUID
    operation_id: UUID

    client_version: int
    server_version: int

    client_payload: dict[str, Any]
    server_payload: dict[str, Any]

    resolution: str
    status: str

    created_at: datetime
    resolved_at: datetime | None

    model_config = ConfigDict(
        from_attributes=True,
    )


class ConflictListResponse(BaseModel):
    total: int
    page: int
    page_size: int
    total_pages: int
    items: list[ConflictResponse]
