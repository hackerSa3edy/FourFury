from pydantic_settings import BaseSettings


class AppSettings(BaseSettings):
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        env_prefix = "app_"

    MONGO_DB: str
    MONGO_URL: str
    ALLOWED_ORIGINS: list[str]


settings = AppSettings()
