from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_super_admin
from app.core.database import get_db
from app.models.user import User
from app.schemas.auth import (
    LoginRequest,
    RegisterUserRequest,
    RegisterAdminRequest,
    VerifyEmailRequest,
    ResendCodeRequest,
    TokenResponse,
    MessageResponse,
    CreateAdminInviteRequest,
    CreateAdminInviteResponse,
)
from app.schemas.user import UserOut
from app.services.auth_service import AuthService

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register-user", response_model=MessageResponse)
def register_user(payload: RegisterUserRequest, db: Session = Depends(get_db)):
    service = AuthService(db)
    return service.register_user(payload.email, payload.password)


@router.post("/register-admin", response_model=MessageResponse)
def register_admin(payload: RegisterAdminRequest, db: Session = Depends(get_db)):
    service = AuthService(db)
    return service.register_admin(payload.invite_code, payload.email, payload.password)


@router.post("/verify-email", response_model=MessageResponse)
def verify_email(payload: VerifyEmailRequest, db: Session = Depends(get_db)):
    service = AuthService(db)
    return service.verify_email(payload.email, payload.code)


@router.post("/resend-code", response_model=MessageResponse)
def resend_code(payload: ResendCodeRequest, db: Session = Depends(get_db)):
    service = AuthService(db)
    return service.resend_code(payload.email)


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    service = AuthService(db)
    token = service.login(payload.email, payload.password)
    return TokenResponse(access_token=token)


@router.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)):
    return current_user


@router.post("/admin/invite", response_model=CreateAdminInviteResponse)
def create_admin_invite(
    payload: CreateAdminInviteRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_super_admin),
):
    service = AuthService(db)
    invite = service.create_admin_invite(
        current_user=current_user,
        assigned_email=payload.assigned_email,
        expires_in_hours=payload.expires_in_hours,
    )

    return CreateAdminInviteResponse(
        code=invite.code,
        assigned_email=invite.assigned_email,
        expires_at=invite.expires_at.isoformat(),
        role=invite.role,
    )