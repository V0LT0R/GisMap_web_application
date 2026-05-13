from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import require_super_admin
from app.core.database import get_db
from app.models.user import User
from app.schemas.audit import AuditLogListResponse
from app.services.audit_service import AuditService

router = APIRouter(prefix="/api/admin/audit", tags=["audit"])


@router.get("", response_model=AuditLogListResponse)
def list_audit_logs(
    search: str | None = Query(default=None),
    action: str | None = Query(default=None),
    limit: int = Query(default=100, ge=1, le=300),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_super_admin),
):
    service = AuditService(db)
    return service.list_logs(search=search, action=action, limit=limit, offset=offset)
