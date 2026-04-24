from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
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


# Дополнительный CORS-слой: браузер иногда показывает ошибку CORS
# вместо реального 401/403 ответа. Этот middleware принудительно добавляет
# CORS-заголовки ко всем ответам, включая ошибки авторизации.
@app.middleware("http")
async def add_cors_headers(request, call_next):
    origin = request.headers.get("origin")
    allowed_origins = {
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    }

    if request.method == "OPTIONS":
        from starlette.responses import Response

        response = Response(status_code=204)
    else:
        response = await call_next(request)

    if origin in allowed_origins or (origin and origin.startswith("http://localhost:")) or (origin and origin.startswith("http://127.0.0.1:")):
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"
        response.headers["Access-Control-Allow-Methods"] = "GET,POST,PUT,PATCH,DELETE,OPTIONS"
        response.headers["Access-Control-Allow-Headers"] = "Authorization,Content-Type,Accept,Origin"
        response.headers["Vary"] = "Origin"

    return response


@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)


@app.get("/")
def root():
    return {"message": "Fuel GIS Backend is running"}


app.add_middleware(
    CORSMiddleware,
    # Разрешаем оба варианта адреса frontend, потому что браузер может открывать
    # страницу как localhost:3000, а API вызываться на 127.0.0.1:8000.
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)