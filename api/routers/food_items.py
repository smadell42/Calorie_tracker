"""
Food items catalog endpoints — browse, search, update, delete.
Food items are auto-created by the food_logs router; these endpoints manage the catalog.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import desc
from sqlalchemy.orm import Session

from api.database import get_db
from api.models import FoodItem, User
from api.schemas import FoodItemResponse, FoodItemUpdate

router = APIRouter(prefix="/api/users/{user_id}/food-items", tags=["Food Items"])


def _verify_user(user_id: int, db: Session):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.get("", response_model=list[FoodItemResponse])
def list_food_items(
    user_id: int,
    search: str | None = Query(None, description="Search food items by name"),
    category: str | None = Query(None, description="Filter by category"),
    db: Session = Depends(get_db),
):
    """
    List food items in the user's catalog.
    Supports search (partial name match) and category filter.
    Results sorted by times_logged descending (most used first — for autofill).
    """
    _verify_user(user_id, db)

    query = db.query(FoodItem).filter(FoodItem.user_id == user_id)

    if search:
        query = query.filter(FoodItem.name.ilike(f"%{search}%"))
    if category:
        query = query.filter(FoodItem.category == category)

    return query.order_by(desc(FoodItem.times_logged)).all()


@router.get("/{item_id}", response_model=FoodItemResponse)
def get_food_item(user_id: int, item_id: int, db: Session = Depends(get_db)):
    """Get a specific food item by ID."""
    _verify_user(user_id, db)

    item = (
        db.query(FoodItem)
        .filter(FoodItem.id == item_id, FoodItem.user_id == user_id)
        .first()
    )
    if not item:
        raise HTTPException(status_code=404, detail="Food item not found")
    return item


@router.put("/{item_id}", response_model=FoodItemResponse)
def update_food_item(
    user_id: int, item_id: int, data: FoodItemUpdate, db: Session = Depends(get_db)
):
    """Manually update a food item's nutritional data or name."""
    _verify_user(user_id, db)

    item = (
        db.query(FoodItem)
        .filter(FoodItem.id == item_id, FoodItem.user_id == user_id)
        .first()
    )
    if not item:
        raise HTTPException(status_code=404, detail="Food item not found")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(item, key, value)

    db.commit()
    db.refresh(item)
    return item


@router.delete("/{item_id}", status_code=204)
def delete_food_item(user_id: int, item_id: int, db: Session = Depends(get_db)):
    """Delete a food item from the catalog."""
    _verify_user(user_id, db)

    item = (
        db.query(FoodItem)
        .filter(FoodItem.id == item_id, FoodItem.user_id == user_id)
        .first()
    )
    if not item:
        raise HTTPException(status_code=404, detail="Food item not found")

    db.delete(item)
    db.commit()
