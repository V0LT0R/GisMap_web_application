from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class StationFuel(Base):
    __tablename__ = "station_fuels"
    __table_args__ = (
        UniqueConstraint("station_id", "fuel_type_id", name="uq_station_fuel_unique"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    station_id: Mapped[int] = mapped_column(ForeignKey("stations.id"), nullable=False)
    fuel_type_id: Mapped[int] = mapped_column(ForeignKey("fuel_types.id"), nullable=False)

    is_available: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    price: Mapped[float | None] = mapped_column(Float, nullable=True)

    updated_by: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )