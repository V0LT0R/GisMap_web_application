from pydantic import BaseModel, EmailStr, Field


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class RegisterUserRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)


class RegisterAdminRequest(BaseModel):
    invite_code: str
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)


class VerifyEmailRequest(BaseModel):
    email: EmailStr
    code: str = Field(min_length=6, max_length=6)


class ResendCodeRequest(BaseModel):
    email: EmailStr


class CreateAdminInviteRequest(BaseModel):
    assigned_email: EmailStr | None = None
    expires_in_hours: int = Field(default=48, ge=1, le=168)


class CreateAdminInviteResponse(BaseModel):
    code: str
    assigned_email: EmailStr | None = None
    expires_at: str
    role: str


class MessageResponse(BaseModel):
    message: str