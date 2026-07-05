"""
Calorie Tracker API — FastAPI application entry point.

Initializes the database, creates the default user, and registers all routers.
Run with: uvicorn api.main:app --reload
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.database import Base, engine, SessionLocal
from api.models import User
from api.routers import analytics, body_metrics, food_items, food_logs, goals, users


def create_default_user():
    """Create the default user (ID=1) if it doesn't exist."""
    db = SessionLocal()
    try:
        existing = db.query(User).filter(User.id == 1).first()
        if not existing:
            default_user = User(id=1, name="Adell")
            db.add(default_user)
            db.commit()
            print("[OK] Default user 'Adell' (ID=1) created.")
        else:
            print("[OK] Default user 'Adell' (ID=1) already exists.")
    finally:
        db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan — runs on startup and shutdown."""
    # Startup: create tables and default user
    Base.metadata.create_all(bind=engine)
    create_default_user()
    print("[OK] Database initialized. Server ready.")
    yield
    # Shutdown: nothing to clean up
    print("Server shutting down.")


app = FastAPI(
    title="Calorie Tracker API",
    description="Personal calorie and protein tracking API with auto-learning food catalog.",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS — open for local development (Flutter app on same machine/network)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(users.router)
app.include_router(body_metrics.router)
app.include_router(food_items.router)
app.include_router(food_logs.router)
app.include_router(goals.router)
app.include_router(analytics.router)


@app.get("/", tags=["Health"])
def root():
    """Health check endpoint."""
    return {"status": "ok", "message": "Calorie Tracker API is running"}
