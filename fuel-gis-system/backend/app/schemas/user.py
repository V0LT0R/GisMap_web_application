from datetime import datetime
from pydantic import BaseModel, EmailStr


class UserOut(BaseModel):
    id: int
    email: EmailStr
    role: str
    is_active: bool
    is_email_verified: bool
    created_at: datetime

    model_config = {
        "from_attributes": True
    }