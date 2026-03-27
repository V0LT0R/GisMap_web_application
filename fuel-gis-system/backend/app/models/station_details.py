from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class StationDetails(Base):
    __tablename__ = "station_details"
    __table_args__ = (
        UniqueConstraint("station_id", name="uq_station_details_station_id"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    station_id: Mapped[int] = mapped_column(ForeignKey("stations.id"), nullable=False)

    is_operational: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    working_hours: Mapped[str | None] = mapped_column(String(255), nullable=True)
    columns_count: Mapped[int | None] = mapped_column(Integer, nullable=True)

    main_photo_url: Mapped[str | None] = mapped_column(String(1000), nullable=True)

    updated_by: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )