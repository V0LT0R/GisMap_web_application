from datetime import datetime, timedelta, timezone
from uuid import uuid4

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.mail import send_email_code
from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    create_email_code,
)
from app.models.user import User
from app.models.admin_invite import AdminInvite
from app.models.email_verification import EmailVerificationCode
from app.utils.enums import UserRole, VerificationPurpose


class AuthService:
    def __init__(self, db: Session):
        self.db = db

    def _get_user_by_email(self, email: str) -> User | None:
        return self.db.query(User).filter(User.email == email.lower()).first()

    def _create_verification_code(
        self,
        email: str,
        user_id: int | None,
        purpose: str = VerificationPurpose.REGISTER.value,
        expires_minutes: int = 10,
    ) -> str:
        code = create_email_code()

        verification = EmailVerificationCode(
            email=email.lower(),
            user_id=user_id,
            code=code,
            purpose=purpose,
            is_used=False,
            expires_at=datetime.now(timezone.utc) + timedelta(minutes=expires_minutes),
        )
        self.db.add(verification)
        self.db.commit()

        send_email_code(email, code, purpose=purpose)
        return code

    def register_user(self, email: str, password: str) -> dict:
        existing_user = self._get_user_by_email(email)
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Пользователь с таким email уже существует",
            )

        user = User(
            email=email.lower(),
            password_hash=hash_password(password),
            role=UserRole.USER.value,
            is_active=False,
            is_email_verified=False,
        )
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)

        self._create_verification_code(email=email, user_id=user.id)

        return {"message": "Код подтверждения отправлен на email"}

    def register_admin(self, invite_code: str, email: str, password: str) -> dict:
        invite = (
            self.db.query(AdminInvite)
            .filter(AdminInvite.code == invite_code)
            .first()
        )

        if not invite:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Неверный invite code",
            )

        if invite.is_used:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Этот invite code уже использован",
            )

        now = datetime.now(timezone.utc)
        if invite.expires_at < now:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Срок действия invite code истек",
            )

        if invite.assigned_email and invite.assigned_email.lower() != email.lower():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Этот invite code привязан к другому email",
            )

        existing_user = self._get_user_by_email(email)
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Пользователь с таким email уже существует",
            )

        user = User(
            email=email.lower(),
            password_hash=hash_password(password),
            role=UserRole.ADMIN.value,
            is_active=False,
            is_email_verified=False,
        )
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)

        invite.is_used = True
        self.db.commit()

        self._create_verification_code(email=email, user_id=user.id)

        return {"message": "Регистрация admin начата. Код подтверждения отправлен на email"}

    def verify_email(self, email: str, code: str) -> dict:
        verification = (
            self.db.query(EmailVerificationCode)
            .filter(
                EmailVerificationCode.email == email.lower(),
                EmailVerificationCode.code == code,
                EmailVerificationCode.is_used.is_(False),
                EmailVerificationCode.purpose == VerificationPurpose.REGISTER.value,
            )
            .order_by(EmailVerificationCode.created_at.desc())
            .first()
        )

        if not verification:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Неверный код подтверждения",
            )

        now = datetime.now(timezone.utc)
        if verification.expires_at < now:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Срок действия кода истек",
            )

        user = self._get_user_by_email(email)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Пользователь не найден",
            )

        verification.is_used = True
        user.is_email_verified = True
        user.is_active = True

        self.db.commit()

        return {"message": "Email успешно подтвержден. Аккаунт активирован"}

    def resend_code(self, email: str) -> dict:
        user = self._get_user_by_email(email)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Пользователь не найден",
            )

        if user.is_email_verified:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email уже подтвержден",
            )

        self._create_verification_code(email=email, user_id=user.id)

        return {"message": "Новый код подтверждения отправлен на email"}

    def login(self, email: str, password: str) -> str:
        user = self._get_user_by_email(email)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Неверный email или пароль",
            )

        if not verify_password(password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Неверный email или пароль",
            )

        if not user.is_email_verified or not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Аккаунт не активирован. Подтвердите email",
            )

        token = create_access_token(
            {
                "sub": str(user.id),
                "email": user.email,
                "role": user.role,
            }
        )
        return token

    def create_admin_invite(
        self,
        current_user: User,
        assigned_email: str | None = None,
        expires_in_hours: int = 48,
    ) -> AdminInvite:
        if current_user.role != UserRole.SUPER_ADMIN.value:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Только super admin может создавать приглашения",
            )

        code = uuid4().hex[:12].upper()

        invite = AdminInvite(
            code=code,
            role=UserRole.ADMIN.value,
            assigned_email=assigned_email.lower() if assigned_email else None,
            is_used=False,
            created_by=current_user.id,
            expires_at=datetime.now(timezone.utc) + timedelta(hours=expires_in_hours),
        )
        self.db.add(invite)
        self.db.commit()
        self.db.refresh(invite)

        return invite