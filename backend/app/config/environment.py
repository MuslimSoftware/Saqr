from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    """Application settings."""
    PROJECT_NAME: str = "Saqr Backend"
    PROJECT_DESCRIPTION: str = "Backend for the project"
    PROJECT_VERSION: str = "1.0.0"
    PRODUCTION: bool = False
    PORT: int = 8000
    HOST: str = "0.0.0.0"

    # LangWatch API Settings
    LANGWATCH_API_KEY: str = "langwatch_api_key"
    LANGWATCH_PROJECT: str = "langwatch_project_id"

    # API Settings
    API_URL: str = "http://localhost:8000"
    API_PREFIX: str = "/api"
    API_VERSION_PREFIX: str = "/v1"

    # OpenAI API Settings
    OPENAI_API_KEY: str = "sk-proj-00000000000000000000000000000000"
    AI_AGENT_MODEL: str = "gpt-4o"
    BROWSER_EXECUTION_MODEL: str = "gpt-4o"
    BROWSER_PLANNER_MODEL: str = "gpt-4o"

    # Sakila MySQL Database Settings  
    EXTERNAL_SQL_DB_HOST: str = "sakila-mysql"
    EXTERNAL_SQL_DB_PORT: int = 3306
    EXTERNAL_SQL_DB_USER: str = "root"
    EXTERNAL_SQL_DB_PASSWORD: str = "rootpass"
    EXTERNAL_SQL_DB_NAME: str = "sakila"
    EXTERNAL_SQL_DB_POOL_SIZE: int = 5
    EXTERNAL_SQL_DB_MAX_OVERFLOW: int = 10
    EXTERNAL_SQL_DB_ECHO: bool = True

    # Redis Settings
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_DB: int = 0

    # Internal MongoDB Settings
    MONGODB_URL: str = "mongodb://localhost:27017"
    MONGODB_DB_NAME: str = "saqr"

    # Security
    JWT_SECRET_KEY: str = "your-super-secret-key-change-this-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # --- Saqr Settings --- #
    
    class Config:
        env_file = ".env"
        env_file_encoding = 'utf-8'
        case_sensitive = True

environment = Settings() 