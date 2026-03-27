import sys
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parents[1]))

from app.core.database import SessionLocal, Base, engine
from app.core.security import hash_password
from app.models.user import User
from app.utils.enums import UserRole


def main():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    email = "baa20.10.2005@gmail.com"
    password = "Admin123456"

    existing = db.query(User).filter(User.email == email).first()
    if existing:
        print(f"Super admin уже существует: {email}")
        db.close()
        return

    user = User(
        email=email,
        password_hash=hash_password(password),
        role=UserRole.SUPER_ADMIN.value,
        is_active=True,
        is_email_verified=True,
    )

    db.add(user)
    db.commit()
    db.refresh(user)
    db.close()

    print("Super admin создан успешно")
    print(f"Email: {email}")
    print(f"Password: {password}")


if __name__ == "__main__":
    main()