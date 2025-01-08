from pydantic_settings import BaseSettings


class AppSettings(BaseSettings):
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        env_prefix = "app_"

    ALLOWED_ORIGINS: list[str]
    MONGODB_URL: str
    MONGODB_DB_NAME: str

    # Redis settings
    REDIS_HOST: str
    REDIS_PORT: int
    REDIS_DB: int

    # Cache settings
    CACHE_TTL: int = 3600  # 1 hour


settings = AppSettings()
