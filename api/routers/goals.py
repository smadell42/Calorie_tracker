"""
Daily goals endpoints — set and track calorie/protein targets.
"""

from datetime import date as date_type, datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import desc
from sqlalchemy.orm import Session

from api.database import get_db
from api.models import DailyGoal, User

from api.schemas import DailyGoalCreate, DailyGoalResponse

router = APIRouter(prefix="/api/users/{user_id}/goals", tags=["Daily Goals"])


def _verify_user(user_id: int, db: Session):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.post("", response_model=DailyGoalResponse, status_code=201)
def create_goal(user_id: int, data: DailyGoalCreate, db: Session = Depends(get_db)):
    """
    Set a new daily goal. Automatically closes the previous active goal
    by setting its effective_to date to yesterday.
    """
    _verify_user(user_id, db)

    effective_from = data.effective_from or date_type.today()

    # Close any currently active goal (effective_to is NULL)
    active_goal = (
        db.query(DailyGoal)
        .filter(
            DailyGoal.user_id == user_id,
            DailyGoal.effective_to.is_(None),
        )
        .first()
    )
    if active_goal:
        # End the previous goal the day before the new one starts
        from datetime import timedelta

        active_goal.effective_to = effective_from - timedelta(days=1)

    goal = DailyGoal(
        user_id=user_id,
        calorie_goal=data.calorie_goal,
        protein_goal_g=data.protein_goal_g,
        effective_from=effective_from,
        effective_to=None,  # Active until a new goal is set
    )
    db.add(goal)
    db.commit()
    db.refresh(goal)
    return goal


@router.get("/current", response_model=DailyGoalResponse)
def get_current_goal(user_id: int, db: Session = Depends(get_db)):
    """Get the currently active daily goal."""
    _verify_user(user_id, db)

    goal = (
        db.query(DailyGoal)
        .filter(
            DailyGoal.user_id == user_id,
            DailyGoal.effective_to.is_(None),
        )
        .first()
    )
    if not goal:
        raise HTTPException(status_code=404, detail="No active goal set")
    return goal


@router.get("", response_model=list[DailyGoalResponse])
def get_goals(user_id: int, db: Session = Depends(get_db)):
    """Get all goals (current and historical)."""
    _verify_user(user_id, db)

    return (
        db.query(DailyGoal)
        .filter(DailyGoal.user_id == user_id)
        .order_by(desc(DailyGoal.effective_from))
        .all()
    )
