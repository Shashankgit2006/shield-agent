import os
from pathlib import Path
from pydantic import BaseModel
from dotenv import load_dotenv

# Load .env file from backend root
env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

class Settings(BaseModel):
    PROJECT_NAME: str = "Shield-Agent Backend API"
    VERSION: str = "1.0.0"
    DESCRIPTION: str = "Privacy-Preserving Vision AI Browser Agent Backend with Production Auth"
    
    AI_PROVIDER: str = os.getenv("AI_PROVIDER", "mock").lower()
    AI_API_KEY: str = os.getenv("AI_API_KEY") or os.getenv("GEMINI_API_KEY") or os.getenv("OPENAI_API_KEY") or ""
    AI_MODEL: str = os.getenv("AI_MODEL", "")
    
    @property
    def effective_model(self) -> str:
        if self.AI_MODEL:
            return self.AI_MODEL
        if self.AI_PROVIDER in ("gemini", "cloud"):
            return "gemini-1.5-flash"
        if self.AI_PROVIDER == "openai":
            return "gpt-4o-mini"
        return "mock-vlm-v1"

    def set_ai_config(self, provider: str, api_key: str = "", model: str = ""):
        self.AI_PROVIDER = provider.lower()
        if api_key is not None:
            self.AI_API_KEY = api_key.strip()
        if model is not None and model.strip():
            self.AI_MODEL = model.strip()

    
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./shield_agent.db")
    
    # JWT Authentication
    JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", "shield_agent_super_secret_cyber_jwt_key_2026_change_in_production")
    JWT_ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))
    REFRESH_TOKEN_EXPIRE_DAYS: int = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7"))
    
    # Demo Account
    DEMO_ACCOUNT_ENABLED: bool = os.getenv("DEMO_ACCOUNT_ENABLED", "True").lower() in ("true", "1", "yes")
    DEMO_USER_NAME: str = os.getenv("DEMO_USER_NAME", "Shashank")
    DEMO_USER_EMAIL: str = os.getenv("DEMO_USER_EMAIL", "demo@shieldagent.local")
    DEMO_USER_PASSWORD: str = os.getenv("DEMO_USER_PASSWORD", "DemoShield#2026!")

    CORS_ORIGINS: list[str] = [
        origin.strip() 
        for origin in os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173").split(",")
        if origin.strip()
    ]
    
    HOST: str = os.getenv("HOST", "127.0.0.1")
    PORT: int = int(os.getenv("PORT", "8000"))
    DEBUG: bool = os.getenv("DEBUG", "True").lower() in ("true", "1", "yes")

settings = Settings()
