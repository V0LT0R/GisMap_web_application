from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.core.config import settings
from app.core.database import Base, engine

from app.models.user import User
from app.models.admin_invite import AdminInvite
from app.models.email_verification import EmailVerificationCode
from app.models.station import Station
from app.models.station_details import StationDetails
from app.models.station_admin import StationAdmin
from app.models.fuel_type import FuelType
from app.models.station_fuel import StationFuel

app = FastAPI(title="Fuel GIS Backend")


@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)


@app.get("/")
def root():
    return {"message": "Fuel GIS Backend is running"}


allowed_origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    settings.FRONTEND_URL.rstrip("/"),
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=list(dict.fromkeys(allowed_origins)),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)