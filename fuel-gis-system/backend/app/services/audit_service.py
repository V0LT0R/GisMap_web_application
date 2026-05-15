import json
from typing import Any

from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.models.audit_log import AuditLog
from app.models.user import User


class AuditService:
    def __init__(self, db: Session):
        self.db = db

    def log(
        self,
        *,
        user: User | None,
        action: str,
        entity_type: str | None = None,
        entity_id: str | int | None = None,
        description: str | None = None,
        meta: dict[str, Any] | None = None,
        commit: bool = False,
    ) -> AuditLog:
        row = AuditLog(
            user_id=user.id if user else None,
            user_email=user.email if user else None,
            user_role=user.role if user else None,
            action=action,
            entity_type=entity_type,
            entity_id=str(entity_id) if entity_id is not None else None,
            description=description,
            meta_json=json.dumps(meta, ensure_ascii=False, default=str) if meta else None,
        )
        self.db.add(row)
        if commit:
            self.db.commit()
            self.db.refresh(row)
        return row

    def list_logs(
        self,
        *,
        search: str | None = None,
        action: str | None = None,
        limit: int = 100,
        offset: int = 0,
    ) -> dict:
        limit = min(max(limit, 1), 300)
        offset = max(offset, 0)

        query = self.db.query(AuditLog)

        if action:
            query = query.filter(AuditLog.action == action)

        if search:
            like = f"%{search}%"
            query = query.filter(
                or_(
                    AuditLog.user_email.ilike(like),
                    AuditLog.action.ilike(like),
                    AuditLog.entity_type.ilike(like),
                    AuditLog.entity_id.ilike(like),
                    AuditLog.description.ilike(like),
                )
            )

        total = query.count()
        items = query.order_by(AuditLog.created_at.desc()).offset(offset).limit(limit).all()
        return {"items": items, "total": total, "limit": limit, "offset": offset}
