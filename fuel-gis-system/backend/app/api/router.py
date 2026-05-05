from fastapi import APIRouter

from app.api.routes.auth import router as auth_router
from app.api.routes.stations import router as stations_router
from app.api.routes.admin_stations import router as admin_stations_router
from app.api.routes.admin_users import router as admin_users_router
from app.api.routes.navigation import router as navigation_router

api_router = APIRouter()
api_router.include_router(auth_router)
api_router.include_router(stations_router)
api_router.include_router(admin_stations_router)
api_router.include_router(admin_users_router)
api_router.include_router(navigation_router)
