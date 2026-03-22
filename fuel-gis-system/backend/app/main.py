from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List

app = FastAPI(title="Fuel GIS API")


app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class Station(BaseModel):
    id: int
    name: str
    brand: str
    latitude: float
    longitude: float
    address: str


stations_data = [
    Station(
        id=1,
        name="АЗС №1",
        brand="KazFuel",
        latitude=44.8488,
        longitude=65.4823,
        address="Кызылорда, ул. Абая, 15",
    ),
    Station(
        id=2,
        name="АЗС №2",
        brand="PetroLine",
        latitude=44.8535,
        longitude=65.5098,
        address="Кызылорда, пр. Назарбаева, 88",
    ),
    Station(
        id=3,
        name="АЗС №3",
        brand="EnergyOil",
        latitude=44.8362,
        longitude=65.4952,
        address="Кызылорда, ул. Жибек Жолы, 41",
    ),
]


@app.get("/")
def read_root():
    return {"message": "Fuel GIS API is running"}


@app.get("/api/stations", response_model=List[Station])
def get_stations():
    return stations_data