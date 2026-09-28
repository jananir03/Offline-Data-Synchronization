from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import (
    create_access_token,
    hash_password,
    verify_password,
)
from app.models.user import User, UserRole


async def register_user(
    db: AsyncSession,
    username: str,
    email: str,
    password: str,
) -> User:

    existing_user = await db.execute(
        select(User).where(
            (User.username == username)
            | (User.email == email)
        )
    )

    if existing_user.scalar_one_or_none():
        raise ValueError(
            "Username or email is already registered."
        )

    user = User(
        username=username,
        email=email,
        password_hash=hash_password(password),
        role=UserRole.USER,
        is_active=True,
    )

    db.add(user)

    await db.commit()
    await db.refresh(user)

    return user


async def authenticate_user(
    db: AsyncSession,
    username: str,
    password: str,
) -> str | None:

    result = await db.execute(
        select(User).where(
            User.username == username
        )
    )

    user = result.scalar_one_or_none()

    if user is None:
        return None

    if not user.is_active:
        return None

    if not verify_password(
        password,
        user.password_hash,
    ):
        return None

    return create_access_token(user.id)