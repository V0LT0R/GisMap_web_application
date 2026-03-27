from sqlalchemy.orm import Session

from app.core.database import SessionLocal, Base, engine
from app.models.fuel_type import FuelType


DEFAULT_FUEL_TYPES = [
    {"code": "AI_80", "name": "АИ-80", "sort_order": 10},
    {"code": "AI_92", "name": "АИ-92", "sort_order": 20},
    {"code": "AI_95", "name": "АИ-95", "sort_order": 30},
    {"code": "AI_98", "name": "АИ-98", "sort_order": 40},
    {"code": "DT", "name": "ДТ", "sort_order": 50},
    {"code": "GAS", "name": "Газ", "sort_order": 60},
    {"code": "LPG", "name": "LPG", "sort_order": 70},
    {"code": "EV", "name": "Электрозарядка", "sort_order": 80},
]


def main():
    Base.metadata.create_all(bind=engine)
    db: Session = SessionLocal()

    for item in DEFAULT_FUEL_TYPES:
        exists = db.query(FuelType).filter(FuelType.code == item["code"]).first()
        if exists:
            continue

        db.add(FuelType(**item, is_active=True))

    db.commit()
    db.close()
    print("Fuel types seeded successfully")


if __name__ == "__main__":
    main()