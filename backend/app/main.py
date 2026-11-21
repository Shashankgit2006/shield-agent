"""
Shield-Agent Backend Application Entrypoint.
Privacy-Preserving Vision AI Browser Agent with Production Authentication.
"""

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import logging
from .config import settings
from .api.routes import router
from .api.auth_routes import auth_router
from .database import init_db

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] [Shield-Agent] %(message)s"
)
logger = logging.getLogger("shield_agent")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description=settings.DESCRIPTION,
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configure CORS for Dashboard and Chrome Extension
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows browser extension, localhost dev, and dashboard
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global Exception Handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Internal error processing request: {str(exc)}")
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal Shield-Agent server error.", "error": str(exc)}
    )

# Register API Routers
app.include_router(auth_router)
app.include_router(router)

@app.on_event("startup")
async def on_startup():
    init_db()

@app.get("/")
def root():
    return {
        "project": "Shield-Agent",
        "description": "Privacy-Preserving Vision AI Browser Agent with Production Auth",
        "status": "ONLINE",
        "auth_enabled": True,
        "privacy_rule": "RAW SENSITIVE INFORMATION MUST NEVER BE SENT TO THE SERVER.",
        "docs": "/docs"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=settings.DEBUG)
