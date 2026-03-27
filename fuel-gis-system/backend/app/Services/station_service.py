from sqlalchemy.orm import Session
from sqlalchemy import or_

from fastapi import HTTPException, status

from app.models.user import User
from app.models.station import Station
from app.models.station_details import StationDetails
from app.models.station_admin import StationAdmin
from app.models.fuel_type import FuelType
from app.models.station_fuel import StationFuel
from app.utils.enums import UserRole


class StationService:
    def __init__(self, db: Session):
        self.db = db

    def _ensure_station_exists(self, station_id: int) -> Station:
        station = self.db.query(Station).filter(Station.id == station_id).first()
        if not station:
            raise HTTPException(status_code=404, detail="АЗС не найдена")
        return station

    def _get_or_create_details(self, station_id: int) -> StationDetails:
        details = (
            self.db.query(StationDetails)
            .filter(StationDetails.station_id == station_id)
            .first()
        )
        if not details:
            details = StationDetails(station_id=station_id)
            self.db.add(details)
            self.db.commit()
            self.db.refresh(details)
        return details

    def _can_edit_station(self, current_user: User, station_id: int) -> bool:
        if current_user.role == UserRole.SUPER_ADMIN.value:
            return True

        if current_user.role != UserRole.ADMIN.value:
            return False

        assignment = (
            self.db.query(StationAdmin)
            .filter(
                StationAdmin.station_id == station_id,
                StationAdmin.admin_user_id == current_user.id,
            )
            .first()
        )
        return assignment is not None

    def _get_station_fuel_codes_map(self, station_ids: list[int]) -> dict[int, list[str]]:
        if not station_ids:
            return {}

        rows = (
            self.db.query(StationFuel.station_id, FuelType.code)
            .join(FuelType, FuelType.id == StationFuel.fuel_type_id)
            .filter(
                StationFuel.station_id.in_(station_ids),
                StationFuel.is_available.is_(True),
            )
            .all()
        )

        result: dict[int, list[str]] = {}
        for station_id, fuel_code in rows:
            result.setdefault(station_id, []).append(fuel_code)

        return result

    def list_stations(self, search: str | None = None) -> list[dict]:
        query = self.db.query(Station, StationDetails).outerjoin(
            StationDetails, Station.id == StationDetails.station_id
        )

        if search:
            like_value = f"%{search}%"
            query = query.filter(
                or_(
                    Station.name.ilike(like_value),
                    Station.full_name.ilike(like_value),
                    Station.brand.ilike(like_value),
                    Station.address_name.ilike(like_value),
                    Station.full_address_name.ilike(like_value),
                )
            )

        rows = query.order_by(Station.id.desc()).all()
        station_ids = [station.id for station, _ in rows]
        fuel_codes_map = self._get_station_fuel_codes_map(station_ids)

        result = []
        for station, details in rows:
            result.append(
                {
                    "id": station.id,
                    "name": station.name,
                    "full_name": station.full_name,
                    "address_name": station.address_name,
                    "full_address_name": station.full_address_name,
                    "brand": station.brand,
                    "latitude": station.latitude,
                    "longitude": station.longitude,
                    "is_operational": details.is_operational if details else True,
                    "working_hours": details.working_hours if details else None,
                    "columns_count": details.columns_count if details else None,
                    "main_photo_url": details.main_photo_url if details else None,
                    "fuel_codes": fuel_codes_map.get(station.id, []),
                }
            )
        return result

    def list_my_stations(self, current_user: User, search: str | None = None) -> list[dict]:
        if current_user.role == UserRole.SUPER_ADMIN.value:
            return self.list_stations(search=search)

        query = (
            self.db.query(Station, StationDetails)
            .join(StationAdmin, StationAdmin.station_id == Station.id)
            .outerjoin(StationDetails, Station.id == StationDetails.station_id)
            .filter(StationAdmin.admin_user_id == current_user.id)
        )

        if search:
            like_value = f"%{search}%"
            query = query.filter(
                or_(
                    Station.name.ilike(like_value),
                    Station.full_name.ilike(like_value),
                    Station.brand.ilike(like_value),
                    Station.address_name.ilike(like_value),
                    Station.full_address_name.ilike(like_value),
                )
            )

        rows = query.order_by(Station.id.desc()).all()
        station_ids = [station.id for station, _ in rows]
        fuel_codes_map = self._get_station_fuel_codes_map(station_ids)

        result = []
        for station, details in rows:
            result.append(
                {
                    "id": station.id,
                    "name": station.name,
                    "full_name": station.full_name,
                    "address_name": station.address_name,
                    "full_address_name": station.full_address_name,
                    "brand": station.brand,
                    "latitude": station.latitude,
                    "longitude": station.longitude,
                    "is_operational": details.is_operational if details else True,
                    "working_hours": details.working_hours if details else None,
                    "columns_count": details.columns_count if details else None,
                    "main_photo_url": details.main_photo_url if details else None,
                    "fuel_codes": fuel_codes_map.get(station.id, []),
                }
            )
        return result

    def get_station_public(self, station_id: int) -> dict:
        station = self._ensure_station_exists(station_id)
        details = self._get_or_create_details(station_id)

        fuel_rows = (
            self.db.query(StationFuel, FuelType)
            .join(FuelType, FuelType.id == StationFuel.fuel_type_id)
            .filter(
                StationFuel.station_id == station_id,
                StationFuel.is_available.is_(True),
            )
            .order_by(FuelType.sort_order.asc(), FuelType.id.asc())
            .all()
        )

        fuels = []
        for station_fuel, fuel_type in fuel_rows:
            fuels.append(
                {
                    "fuel_type_id": fuel_type.id,
                    "code": fuel_type.code,
                    "name": fuel_type.name,
                    "is_available": station_fuel.is_available,
                    "price": station_fuel.price,
                }
            )

        return {
            "station": station,
            "details": details,
            "fuels": fuels,
        }

    def get_station_full(self, station_id: int, current_user: User) -> dict:
        station = self._ensure_station_exists(station_id)

        if current_user.role == UserRole.ADMIN.value and not self._can_edit_station(
            current_user, station_id
        ):
            raise HTTPException(status_code=403, detail="Нет доступа к этой АЗС")

        details = self._get_or_create_details(station_id)

        fuel_rows = (
            self.db.query(StationFuel, FuelType)
            .join(FuelType, FuelType.id == StationFuel.fuel_type_id)
            .filter(StationFuel.station_id == station_id)
            .order_by(FuelType.sort_order.asc(), FuelType.id.asc())
            .all()
        )

        fuels = []
        for station_fuel, fuel_type in fuel_rows:
            fuels.append(
                {
                    "fuel_type_id": fuel_type.id,
                    "code": fuel_type.code,
                    "name": fuel_type.name,
                    "is_available": station_fuel.is_available,
                    "price": station_fuel.price,
                }
            )

        return {
            "station": station,
            "details": details,
            "fuels": fuels,
        }

    def update_station_details(self, station_id: int, current_user: User, payload) -> dict:
        self._ensure_station_exists(station_id)

        if not self._can_edit_station(current_user, station_id):
            raise HTTPException(status_code=403, detail="Нет прав на редактирование этой АЗС")

        details = self._get_or_create_details(station_id)
        details.is_operational = payload.is_operational
        details.working_hours = payload.working_hours
        details.columns_count = payload.columns_count
        details.main_photo_url = payload.main_photo_url
        details.updated_by = current_user.id

        self.db.commit()
        self.db.refresh(details)

        return {"message": "Детали АЗС обновлены"}

    def update_station_fuels(self, station_id: int, current_user: User, items: list) -> dict:
        self._ensure_station_exists(station_id)

        if not self._can_edit_station(current_user, station_id):
            raise HTTPException(status_code=403, detail="Нет прав на редактирование этой АЗС")

        fuel_type_ids = [item.fuel_type_id for item in items]
        existing_fuel_types = (
            self.db.query(FuelType)
            .filter(FuelType.id.in_(fuel_type_ids), FuelType.is_active.is_(True))
            .all()
        )
        valid_ids = {ft.id for ft in existing_fuel_types}

        for item in items:
            if item.fuel_type_id not in valid_ids:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Неверный fuel_type_id: {item.fuel_type_id}",
                )

            row = (
                self.db.query(StationFuel)
                .filter(
                    StationFuel.station_id == station_id,
                    StationFuel.fuel_type_id == item.fuel_type_id,
                )
                .first()
            )

            if not row:
                row = StationFuel(
                    station_id=station_id,
                    fuel_type_id=item.fuel_type_id,
                )
                self.db.add(row)

            row.is_available = item.is_available
            row.price = item.price if item.is_available else None
            row.updated_by = current_user.id

        self.db.commit()
        return {"message": "Топливо и цены обновлены"}

    def assign_stations_to_admin(self, admin_user_id: int, station_ids: list[int], current_user: User) -> dict:
        if current_user.role != UserRole.SUPER_ADMIN.value:
            raise HTTPException(status_code=403, detail="Только super admin может назначать АЗС")

        admin_user = self.db.query(User).filter(User.id == admin_user_id).first()
        if not admin_user or admin_user.role != UserRole.ADMIN.value:
            raise HTTPException(status_code=404, detail="Admin пользователь не найден")

        unique_station_ids = list(set(station_ids))
        stations = self.db.query(Station).filter(Station.id.in_(unique_station_ids)).all()
        found_ids = {station.id for station in stations}

        missing_ids = [sid for sid in unique_station_ids if sid not in found_ids]
        if missing_ids:
            raise HTTPException(
                status_code=400,
                detail=f"Некоторые АЗС не найдены: {missing_ids}",
            )

        added_count = 0
        for station_id in unique_station_ids:
            existing = (
                self.db.query(StationAdmin)
                .filter(
                    StationAdmin.station_id == station_id,
                    StationAdmin.admin_user_id == admin_user_id,
                )
                .first()
            )
            if existing:
                continue

            assignment = StationAdmin(
                station_id=station_id,
                admin_user_id=admin_user_id,
                assigned_by=current_user.id,
            )
            self.db.add(assignment)
            added_count += 1

        self.db.commit()
        return {"message": f"Назначение завершено. Добавлено связей: {added_count}"}

    def list_fuel_types(self) -> list[FuelType]:
        return (
            self.db.query(FuelType)
            .filter(FuelType.is_active.is_(True))
            .order_by(FuelType.sort_order.asc(), FuelType.id.asc())
            .all()
        )