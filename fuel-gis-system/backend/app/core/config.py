from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    DGIS_API_KEY: str = ""
    DGIS_BASE_URL: str = "https://catalog.api.2gis.com/3.0"

    model_config = SettingsConfigDict(
        env_file=".env",
        extra="ignore",
    )


settings = Settings()