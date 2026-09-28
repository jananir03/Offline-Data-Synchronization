from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.dependencies import get_current_user
from app.models.record import RecordStatus
from app.models.user import User
from app.schemas.record import (
    RecordCreate,
    RecordListResponse,
    RecordResponse,
    RecordUpdate,
)
from app.services.record_service import (
    create_record,
    delete_record,
    get_record,
    list_records,
    update_record,
)


router = APIRouter(
    prefix="/api/records",
    tags=["Records"],
)


@router.post(
    "",
    response_model=RecordResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create(
    payload: RecordCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> RecordResponse:
    return await create_record(
        db=db,
        user=current_user,
        title=payload.title,
        description=payload.description,
        status=payload.status,
    )


@router.get(
    "",
    response_model=RecordListResponse,
)
async def list_all(
    page: int = Query(
        default=1,
        ge=1,
    ),
    page_size: int = Query(
        default=10,
        ge=1,
        le=100,
    ),
    search: str | None = Query(
        default=None,
        max_length=200,
    ),
    record_status: RecordStatus | None = Query(
        default=None,
        alias="status",
    ),
    sort_by: str = Query(
        default="updated_at",
        pattern="^(title|status|created_at|updated_at|version)$",
    ),
    sort_order: str = Query(
        default="desc",
        pattern="^(asc|desc)$",
    ),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> RecordListResponse:
    items, total = await list_records(
        db=db,
        user=current_user,
        page=page,
        page_size=page_size,
        search=search,
        status=record_status,
        sort_by=sort_by,
        sort_order=sort_order,
    )

    total_pages = (total + page_size - 1) // page_size

    return RecordListResponse(
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
        items=[
            RecordResponse.model_validate(item)
            for item in items
        ],
    )


@router.get(
    "/{record_id}",
    response_model=RecordResponse,
)
async def get_one(
    record_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> RecordResponse:
    record = await get_record(
        db=db,
        user=current_user,
        record_id=record_id,
    )

    if record is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Record not found.",
        )

    return record


@router.put(
    "/{record_id}",
    response_model=RecordResponse,
)
async def update(
    record_id: UUID,
    payload: RecordUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> RecordResponse:
    record = await get_record(
        db=db,
        user=current_user,
        record_id=record_id,
    )

    if record is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Record not found.",
        )

    return await update_record(
        db=db,
        record=record,
        title=payload.title,
        description=payload.description,
        status=payload.status,
    )


@router.delete(
    "/{record_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete(
    record_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    record = await get_record(
        db=db,
        user=current_user,
        record_id=record_id,
    )

    if record is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Record not found.",
        )

    await delete_record(
        db=db,
        record=record,
    )

    return None
