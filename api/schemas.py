"""
Pydantic schemas — request/response validation for all API endpoints.
"""

from datetime import date, datetime
from pydantic import BaseModel, Field


# ─── Users ────────────────────────────────────────────────────────────────────


class UserUpdate(BaseModel):
    name: str | None = None
    email: str | None = None
    gender: str | None = None
    date_of_birth: date | None = None


class UserResponse(BaseModel):
    id: int
    name: str
    email: str | None = None
    gender: str | None = None
    date_of_birth: date | None = None
    created_at: str
    updated_at: str

    model_config = {"from_attributes": True}


# ─── Body Metrics ─────────────────────────────────────────────────────────────


class BodyMetricCreate(BaseModel):
    height_cm: float = Field(..., gt=0, description="Height in centimeters")
    weight_kg: float = Field(..., gt=0, description="Weight in kilograms")
    recorded_at: str | None = Field(
        None, description="ISO 8601 timestamp. Defaults to now."
    )


class BodyMetricResponse(BaseModel):
    id: int
    height_cm: float
    weight_kg: float
    bmi: float | None
    recorded_at: str

    model_config = {"from_attributes": True}


# ─── Food Items ───────────────────────────────────────────────────────────────


class FoodItemUpdate(BaseModel):
    name: str | None = None
    calories_per_100g: float | None = None
    protein_per_100g: float | None = None
    category: str | None = None


class FoodItemResponse(BaseModel):
    id: int
    name: str
    calories_per_100g: float
    protein_per_100g: float
    category: str | None = None
    times_logged: int
    created_at: str
    updated_at: str

    model_config = {"from_attributes": True}


# ─── Food Logs ────────────────────────────────────────────────────────────────


class FoodLogCreate(BaseModel):
    """
    Two ways to log food:
    1. By food_item_id — just provide ID + quantity, system computes the rest.
    2. By name — provide name + quantity + calories + protein.
       System auto-creates or reuses a food item in the catalog.
    """

    food_item_id: int | None = Field(
        None, description="ID of existing food item. If provided, name/calories/protein are ignored."
    )
    name: str | None = Field(
        None, description="Food name. Used to auto-create or match existing food item."
    )
    quantity_grams: float = Field(..., gt=0, description="Amount consumed in grams")
    calories: float | None = Field(
        None, ge=0, description="Total calories for this quantity (not per 100g)"
    )
    protein_grams: float | None = Field(
        None, ge=0, description="Total protein in grams for this quantity (not per 100g)"
    )
    logged_at: str | None = Field(
        None, description="ISO 8601 timestamp. Defaults to now."
    )
    notes: str | None = None


class FoodLogUpdate(BaseModel):
    quantity_grams: float = Field(..., gt=0, description="New amount consumed in grams")
    notes: str | None = None


class FoodLogResponse(BaseModel):
    id: int
    food_item_id: int | None
    food_item_name: str | None = None
    quantity_grams: float
    calories: float
    protein_grams: float
    logged_at: str
    notes: str | None = None

    model_config = {"from_attributes": True}


# ─── Daily Goals ──────────────────────────────────────────────────────────────


class DailyGoalCreate(BaseModel):
    calorie_goal: float = Field(..., gt=0)
    protein_goal_g: float | None = Field(None, ge=0)
    effective_from: date | None = Field(
        None, description="Start date. Defaults to today."
    )


class DailyGoalResponse(BaseModel):
    id: int
    calorie_goal: float
    protein_goal_g: float | None
    effective_from: date
    effective_to: date | None
    created_at: str

    model_config = {"from_attributes": True}


# ─── Analytics ────────────────────────────────────────────────────────────────


class DailySummary(BaseModel):
    date: str
    total_calories: float
    total_protein_grams: float
    calorie_goal: float | None = None
    protein_goal_g: float | None = None
    calorie_progress_pct: float | None = None
    protein_progress_pct: float | None = None
    log_count: int


class WeeklySummary(BaseModel):
    from_date: str
    to_date: str
    avg_daily_calories: float
    avg_daily_protein_grams: float
    total_calories: float
    total_protein_grams: float
    daily_breakdown: list[DailySummary]


class WeightTrendPoint(BaseModel):
    recorded_at: str
    weight_kg: float
    bmi: float | None


class WeightTrendResponse(BaseModel):
    data_points: list[WeightTrendPoint]
    weight_change_kg: float | None = None
    bmi_change: float | None = None
