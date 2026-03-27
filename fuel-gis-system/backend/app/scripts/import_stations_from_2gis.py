from app.core.config import settings
from app.core.database import SessionLocal, Base, engine
from app.services.station_import_service import StationImportService


def main():
    Base.metadata.create_all(bind=engine)

    print("DGIS_API_KEY:", settings.DGIS_API_KEY[:6] + "..." if settings.DGIS_API_KEY else "EMPTY")
    print("DGIS_BASE_URL:", settings.DGIS_BASE_URL)

    db = SessionLocal()

    service = StationImportService(db)
    result = service.import_from_grid()

    db.close()
    print("Import finished:")
    print(result)


if __name__ == "__main__":
    main()