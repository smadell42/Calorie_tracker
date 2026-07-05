"""
SQLAlchemy ORM models — 5 tables for the calorie tracker.
"""

from datetime import date, datetime

from sqlalchemy import (
    Column,
    Integer,
    Float,
    String,
    Date,
    Text,
    ForeignKey,
    UniqueConstraint,
    Index,
)
from sqlalchemy.orm import relationship

from api.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(255), nullable=True)
    gender = Column(String(20), nullable=True)
    date_of_birth = Column(Date, nullable=True)
    created_at = Column(String, default=lambda: datetime.utcnow().isoformat())
    updated_at = Column(
        String,
        default=lambda: datetime.utcnow().isoformat(),
        onupdate=lambda: datetime.utcnow().isoformat(),
    )

    # Relationships
    body_metrics = relationship("BodyMetric", back_populates="user", cascade="all, delete-orphan")
    food_items = relationship("FoodItem", back_populates="user", cascade="all, delete-orphan")
    food_logs = relationship("FoodLog", back_populates="user", cascade="all, delete-orphan")
    daily_goals = relationship("DailyGoal", back_populates="user", cascade="all, delete-orphan")


class BodyMetric(Base):
    __tablename__ = "body_metrics"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    height_cm = Column(Float, nullable=False)
    weight_kg = Column(Float, nullable=False)
    bmi = Column(Float, nullable=True)  # Auto-calculated
    recorded_at = Column(String, nullable=False)  # ISO 8601 timestamp

    # Relationships
    user = relationship("User", back_populates="body_metrics")

    # Indexes for time-range queries
    __table_args__ = (
        Index("ix_body_metrics_user_recorded", "user_id", "recorded_at"),
    )


class FoodItem(Base):
    __tablename__ = "food_items"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    calories_per_100g = Column(Float, nullable=False)
    protein_per_100g = Column(Float, nullable=False, default=0.0)
    category = Column(String(100), nullable=True)
    times_logged = Column(Integer, default=1)
    created_at = Column(String, default=lambda: datetime.utcnow().isoformat())
    updated_at = Column(
        String,
        default=lambda: datetime.utcnow().isoformat(),
        onupdate=lambda: datetime.utcnow().isoformat(),
    )

    # Relationships
    user = relationship("User", back_populates="food_items")
    food_logs = relationship("FoodLog", back_populates="food_item")

    # Unique constraint: each user has their own food catalog
    __table_args__ = (
        UniqueConstraint("user_id", "name", name="uq_user_food_name"),
        Index("ix_food_items_user_name", "user_id", "name"),
    )


class FoodLog(Base):
    __tablename__ = "food_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    food_item_id = Column(Integer, ForeignKey("food_items.id", ondelete="SET NULL"), nullable=True)
    quantity_grams = Column(Float, nullable=False)
    calories = Column(Float, nullable=False)  # Computed and stored at log time
    protein_grams = Column(Float, nullable=False, default=0.0)  # Computed and stored at log time
    logged_at = Column(String, nullable=False)  # ISO 8601 timestamp
    notes = Column(Text, nullable=True)

    # Relationships
    user = relationship("User", back_populates="food_logs")
    food_item = relationship("FoodItem", back_populates="food_logs")

    # Indexes for date-range and analytics queries
    __table_args__ = (
        Index("ix_food_logs_user_logged", "user_id", "logged_at"),
        Index("ix_food_logs_food_item", "food_item_id"),
    )


class DailyGoal(Base):
    __tablename__ = "daily_goals"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    calorie_goal = Column(Float, nullable=False)
    protein_goal_g = Column(Float, nullable=True)
    effective_from = Column(Date, nullable=False)
    effective_to = Column(Date, nullable=True)  # NULL = currently active goal
    created_at = Column(String, default=lambda: datetime.utcnow().isoformat())

    # Relationships
    user = relationship("User", back_populates="daily_goals")

    # Index for finding the current active goal
    __table_args__ = (
        Index("ix_daily_goals_user_dates", "user_id", "effective_from", "effective_to"),
    )
