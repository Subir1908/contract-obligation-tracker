from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from app.core.config import settings
from app.core.database import engine, Base
import app.models # Ensure all models are registered

# Create database tables automatically
Base.metadata.create_all(bind=engine)

# Ensure newly added columns exist on existing SQLite tables
with engine.connect() as conn:
    cols = [row[1] for row in conn.execute(text("PRAGMA table_info(users)")).fetchall()]
    if "phone" not in cols:
        conn.execute(text("ALTER TABLE users ADD COLUMN phone VARCHAR(30)"))
        conn.commit()

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="FastAPI Backend for Contract Obligation Tracker (COT)",
    version="1.0.0"
)

# CORS configuration to allow Next.js / Vite React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins or ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Import and mount routers
from app.api.auth import router as auth_router
from app.api.contracts import router as contracts_router
from app.api.obligations import router as obligations_router
from app.api.dashboard import router as dashboard_router

app.include_router(auth_router)
app.include_router(contracts_router)
app.include_router(obligations_router)
app.include_router(dashboard_router)

@app.get("/api/health", tags=["Health"])
def health_check():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": "1.0.0"
    }

@app.get("/", tags=["Root"])
def root():
    return {
        "message": f"Welcome to {settings.PROJECT_NAME} API. Visit /docs for OpenAPI documentation."
    }
