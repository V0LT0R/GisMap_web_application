from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import require_super_admin
from app.core.database import get_db
from app.core.security import hash_password
from app.models.station import Station
from app.models.station_admin import StationAdmin
from app.models.user import User
from app.schemas.auth import MessageResponse
from app.schemas.user import AdminUserCreateRequest, AdminUserOut, ReplaceAdminStationsRequest
from app.utils.enums import UserRole

router = APIRouter(prefix="/api/admin/users", tags=["admin-users"])


@router.get("", response_model=list[AdminUserOut])
def list_admin_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_super_admin),
):
    admins = (
        db.query(User)
        .filter(User.role.in_([UserRole.SUPER_ADMIN.value, UserRole.ADMIN.value]))
        .order_by(User.role.asc(), User.created_at.desc())
        .all()
    )

    assignments = db.query(StationAdmin).all()
    station_ids = {assignment.station_id for assignment in assignments}
    stations = (
        db.query(Station)
        .filter(Station.id.in_(station_ids))
        .all()
        if station_ids
        else []
    )
    stations_map = {station.id: station for station in stations}

    assignments_map: dict[int, list[StationAdmin]] = {}
    for assignment in assignments:
        assignments_map.setdefault(assignment.admin_user_id, []).append(assignment)

    result = []
    for admin in admins:
        user_assignments = assignments_map.get(admin.id, [])
        assigned_station_ids = [item.station_id for item in user_assignments]
        assigned_stations = []
        for item in user_assignments:
            station = stations_map.get(item.station_id)
            if not station:
                continue
            assigned_stations.append(
                {
                    "id": station.id,
                    "name": station.name,
                    "address_name": station.address_name,
                    "full_address_name": station.full_address_name,
                }
            )

        result.append(
            {
                "id": admin.id,
                "email": admin.email,
                "role": admin.role,
                "is_active": admin.is_active,
                "is_email_verified": admin.is_email_verified,
                "created_at": admin.created_at,
                "assigned_station_ids": assigned_station_ids,
                "assigned_stations": assigned_stations,
            }
        )

    return result


@router.post("", response_model=AdminUserOut, status_code=status.HTTP_201_CREATED)
def create_admin_user(
    payload: AdminUserCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_super_admin),
):
    existing_user = db.query(User).filter(User.email == payload.email.lower()).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Пользователь с таким email уже существует",
        )

    user = User(
        email=payload.email.lower(),
        password_hash=hash_password(payload.password),
        role=UserRole.ADMIN.value,
        is_active=payload.is_active,
        is_email_verified=payload.is_email_verified,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    return {
        "id": user.id,
        "email": user.email,
        "role": user.role,
        "is_active": user.is_active,
        "is_email_verified": user.is_email_verified,
        "created_at": user.created_at,
        "assigned_station_ids": [],
        "assigned_stations": [],
    }


@router.put("/{admin_user_id}/stations", response_model=MessageResponse)
def replace_admin_stations(
    admin_user_id: int,
    payload: ReplaceAdminStationsRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_super_admin),
):
    admin_user = db.query(User).filter(User.id == admin_user_id).first()
    if not admin_user or admin_user.role not in [UserRole.ADMIN.value, UserRole.SUPER_ADMIN.value]:
        raise HTTPException(status_code=404, detail="Admin пользователь не найден")

    if admin_user.role == UserRole.SUPER_ADMIN.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Нельзя переназначать станции super admin через этот раздел",
        )

    station_ids = list({int(station_id) for station_id in payload.station_ids})
    if station_ids:
        stations = db.query(Station).filter(Station.id.in_(station_ids)).all()
        found_ids = {station.id for station in stations}
        missing_ids = [station_id for station_id in station_ids if station_id not in found_ids]
        if missing_ids:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Некоторые АЗС не найдены: {missing_ids}",
            )

    db.query(StationAdmin).filter(StationAdmin.admin_user_id == admin_user_id).delete()

    for station_id in station_ids:
        db.add(
            StationAdmin(
                station_id=station_id,
                admin_user_id=admin_user_id,
                assigned_by=current_user.id,
            )
        )

    db.commit()
    return {"message": f"Список АЗС обновлен. Назначено: {len(station_ids)}"}
