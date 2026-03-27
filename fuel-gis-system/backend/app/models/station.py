from datetime import datetime, timezone

from sqlalchemy import String, DateTime, Float, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class Station(Base):
    __tablename__ = "stations"
    __table_args__ = (
        UniqueConstraint("external_id", "source", name="uq_station_external_source"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)

    external_id: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    source: Mapped[str] = mapped_column(String(50), nullable=False, default="2gis")

    name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    full_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    address_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    full_address_name: Mapped[str | None] = mapped_column(String(500), nullable=True)
    brand: Mapped[str | None] = mapped_column(String(255), nullable=True)
    org_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    description: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    schedule_text_api: Mapped[str | None] = mapped_column(String(255), nullable=True)
    rubrics_json: Mapped[str | None] = mapped_column(String(2000), nullable=True)

    latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    longitude: Mapped[float | None] = mapped_column(Float, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )