"""
Food logging endpoints — the core of the app.
Includes auto-learning logic: logs auto-create food items in the catalog.
"""

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import desc
from sqlalchemy.orm import Session

from api.database import get_db
from api.models import FoodItem, FoodLog, User
from api.schemas import FoodLogCreate, FoodLogResponse, FoodLogUpdate
from api.utils import compute_from_100g, normalize_per_100g

router = APIRouter(prefix="/api/users/{user_id}/food-logs", tags=["Food Logs"])


def _verify_user(user_id: int, db: Session):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


def _build_response(log: FoodLog) -> FoodLogResponse:
    """Build response with food item name included."""
    return FoodLogResponse(
        id=log.id,
        food_item_id=log.food_item_id,
        food_item_name=log.food_item.name if log.food_item else None,
        quantity_grams=log.quantity_grams,
        calories=log.calories,
        protein_grams=log.protein_grams,
        logged_at=log.logged_at,
        notes=log.notes,
    )


@router.post("", response_model=FoodLogResponse, status_code=201)
def create_food_log(user_id: int, data: FoodLogCreate, db: Session = Depends(get_db)):
    """
    Log a food entry. Two modes:

    **Mode 1 — By food_item_id (autofill):**
    Provide `food_item_id` + `quantity_grams`. Calories and protein are
    auto-computed from the food item's per-100g data.

    **Mode 2 — By name (auto-learn):**
    Provide `name` + `quantity_grams` + `calories` + `protein_grams`.
    If the food item doesn't exist, it's auto-created in the catalog
    with nutritional values normalized to per-100g.
    If it already exists, it's reused and `times_logged` is incremented.
    """
    _verify_user(user_id, db)
    logged_at = data.logged_at or datetime.utcnow().isoformat()

    if data.food_item_id:
        # ── Mode 1: Log by existing food item ID ──
        food_item = (
            db.query(FoodItem)
            .filter(FoodItem.id == data.food_item_id, FoodItem.user_id == user_id)
            .first()
        )
        if not food_item:
            raise HTTPException(status_code=404, detail="Food item not found")

        calories = compute_from_100g(food_item.calories_per_100g, data.quantity_grams)
        protein = compute_from_100g(food_item.protein_per_100g, data.quantity_grams)

        # Increment usage counter
        food_item.times_logged = (food_item.times_logged or 0) + 1

    elif data.name:
        # ── Mode 2: Log by name (auto-learn) ──
        if data.calories is None:
            raise HTTPException(
                status_code=400,
                detail="When logging by name, 'calories' is required.",
            )

        calories = data.calories
        protein = data.protein_grams or 0.0

        # Normalize to per-100g
        cal_per_100g = normalize_per_100g(calories, data.quantity_grams)
        protein_per_100g = normalize_per_100g(protein, data.quantity_grams)

        # Check if food item already exists for this user
        food_item = (
            db.query(FoodItem)
            .filter(
                FoodItem.user_id == user_id,
                FoodItem.name.ilike(data.name.strip()),
            )
            .first()
        )

        if food_item:
            # Existing item — increment counter
            food_item.times_logged = (food_item.times_logged or 0) + 1
        else:
            # New item — auto-create with normalized values
            food_item = FoodItem(
                user_id=user_id,
                name=data.name.strip(),
                calories_per_100g=cal_per_100g,
                protein_per_100g=protein_per_100g,
                times_logged=1,
            )
            db.add(food_item)
            db.flush()  # Get the ID without committing

    else:
        raise HTTPException(
            status_code=400,
            detail="Either 'food_item_id' or 'name' must be provided.",
        )

    # Create the food log entry
    log = FoodLog(
        user_id=user_id,
        food_item_id=food_item.id,
        quantity_grams=data.quantity_grams,
        calories=calories,
        protein_grams=protein,
        logged_at=logged_at,
        notes=data.notes,
    )
    db.add(log)
    db.commit()
    db.refresh(log)

    return _build_response(log)


@router.get("", response_model=list[FoodLogResponse])
def get_food_logs(
    user_id: int,
    date: str | None = Query(None, description="Filter by date (YYYY-MM-DD)"),
    from_date: str | None = Query(None, alias="from", description="Start date"),
    to_date: str | None = Query(None, alias="to", description="End date"),
    db: Session = Depends(get_db),
):
    """Get food logs with optional date filters."""
    _verify_user(user_id, db)

    query = db.query(FoodLog).filter(FoodLog.user_id == user_id)

    if date:
        # Filter logs for a specific date (match the date portion of the ISO timestamp)
        query = query.filter(FoodLog.logged_at.like(f"{date}%"))
    else:
        if from_date:
            query = query.filter(FoodLog.logged_at >= from_date)
        if to_date:
            query = query.filter(FoodLog.logged_at <= to_date + "T23:59:59")

    logs = query.order_by(desc(FoodLog.logged_at)).all()
    return [_build_response(log) for log in logs]


@router.get("/{log_id}", response_model=FoodLogResponse)
def get_food_log(user_id: int, log_id: int, db: Session = Depends(get_db)):
    """Get a specific food log entry."""
    _verify_user(user_id, db)

    log = (
        db.query(FoodLog)
        .filter(FoodLog.id == log_id, FoodLog.user_id == user_id)
        .first()
    )
    if not log:
        raise HTTPException(status_code=404, detail="Food log not found")
    return _build_response(log)


@router.put("/{log_id}", response_model=FoodLogResponse)
def update_food_log(user_id: int, log_id: int, data: FoodLogUpdate, db: Session = Depends(get_db)):
    """Update quantity of an existing food log and recalculate macros."""
    _verify_user(user_id, db)

    log = (
        db.query(FoodLog)
        .filter(FoodLog.id == log_id, FoodLog.user_id == user_id)
        .first()
    )
    if not log:
        raise HTTPException(status_code=404, detail="Food log not found")

    # If the food item is linked, recalculate calories and protein
    if log.food_item:
        log.calories = compute_from_100g(log.food_item.calories_per_100g, data.quantity_grams)
        log.protein_grams = compute_from_100g(log.food_item.protein_per_100g, data.quantity_grams)
    else:
        # Fallback if no underlying food_item (e.g. legacy logs), scale linearly
        ratio = data.quantity_grams / log.quantity_grams if log.quantity_grams else 1
        log.calories = log.calories * ratio
        log.protein_grams = (log.protein_grams or 0) * ratio

    log.quantity_grams = data.quantity_grams
    if data.notes is not None:
        log.notes = data.notes

    db.commit()
    db.refresh(log)
    return _build_response(log)


@router.delete("/{log_id}", status_code=204)
def delete_food_log(user_id: int, log_id: int, db: Session = Depends(get_db)):
    """Delete a food log entry."""
    _verify_user(user_id, db)

    log = (
        db.query(FoodLog)
        .filter(FoodLog.id == log_id, FoodLog.user_id == user_id)
        .first()
    )
    if not log:
        raise HTTPException(status_code=404, detail="Food log not found")

    db.delete(log)
    db.commit()
