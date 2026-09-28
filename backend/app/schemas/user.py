from pydantic import BaseModel, ConfigDict, EmailStr, Field


class UserProfileResponse(BaseModel):
    model_config = ConfigDict(
        from_attributes=True,
    )

    id: str
    username: str
    email: EmailStr
    role: str
    is_active: bool


class UserProfileUpdate(BaseModel):
    email: EmailStr | None = None

    password: str | None = Field(
        default=None,
        min_length=8,
        max_length=128,
    )