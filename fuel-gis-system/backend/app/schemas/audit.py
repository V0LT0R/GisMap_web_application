from datetime import datetime
from pydantic import BaseModel


class AuditLogOut(BaseModel):
    id: int
    user_id: int | None = None
    user_email: str | None = None
    user_role: str | None = None
    action: str
    entity_type: str | None = None
    entity_id: str | None = None
    description: str | None = None
    meta_json: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class AuditLogListResponse(BaseModel):
    items: list[AuditLogOut]
    total: int
    limit: int
    offset: int
