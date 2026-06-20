from __future__ import annotations

from sqlalchemy import select

from app.core.config import get_settings
from app.core.database import SessionLocal, init_database
from app.core.security import hash_password
from app.models.user import User


def main() -> None:
    settings = get_settings()
    admin_email = settings.admin_email
    admin_password = settings.admin_password

    if not admin_email or not admin_password:
        raise SystemExit("ADMIN_EMAIL and ADMIN_PASSWORD must be set before seeding an admin account.")

    init_database()

    with SessionLocal() as db:
        existing_user = db.scalar(select(User).where(User.email == admin_email.lower()))
        if existing_user is not None:
            print(f"Admin account already exists for {existing_user.email}.")
            return

        admin_user = User(
            email=admin_email.lower(),
            hashed_password=hash_password(admin_password),
            full_name="Tiqmo Administrator",
            role="admin",
            is_active=True,
        )
        db.add(admin_user)
        db.commit()
        print(f"Created admin account for {admin_user.email}.")


if __name__ == "__main__":
    main()
