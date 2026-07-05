"""
Analytics endpoints — daily/weekly summaries, weight trends, goal progress.
"""

from datetime import date as date_type, datetime, timedelta
from collections import defaultdict

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from api.database import get_db
from api.models import BodyMetric, DailyGoal, FoodLog, User
from api.schemas import DailySummary, WeeklySummary, WeightTrendPoint, WeightTrendResponse

router = APIRouter(prefix="/api/users/{user_id}/analytics", tags=["Analytics"])


def _verify_user(user_id: int, db: Session):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


def _get_goal_for_date(user_id: int, target_date: date_type, db: Session) -> DailyGoal | None:
    """Find the active goal for a specific date."""
    return (
        db.query(DailyGoal)
        .filter(
            DailyGoal.user_id == user_id,
            DailyGoal.effective_from <= target_date,
            (DailyGoal.effective_to.is_(None)) | (DailyGoal.effective_to >= target_date),
        )
        .first()
    )


def _build_daily_summary(
    target_date: str,
    logs: list,
    goal: DailyGoal | None,
) -> DailySummary:
    """Build a daily summary from food logs and goal."""
    total_cal = sum(log.calories for log in logs)
    total_protein = sum(log.protein_grams for log in logs)

    cal_goal = goal.calorie_goal if goal else None
    protein_goal = goal.protein_goal_g if goal else None

    return DailySummary(
        date=target_date,
        total_calories=round(total_cal, 2),
        total_protein_grams=round(total_protein, 2),
        calorie_goal=cal_goal,
        protein_goal_g=protein_goal,
        calorie_progress_pct=round((total_cal / cal_goal) * 100, 1) if cal_goal else None,
        protein_progress_pct=round((total_protein / protein_goal) * 100, 1) if protein_goal else None,
        log_count=len(logs),
    )


@router.get("/daily", response_model=DailySummary)
def daily_summary(
    user_id: int,
    date: str | None = Query(None, description="Date (YYYY-MM-DD). Defaults to today."),
    db: Session = Depends(get_db),
):
    """
    Get daily summary: total calories, protein, goal progress percentage.
    """
    _verify_user(user_id, db)

    target_date = date or date_type.today().isoformat()

    # Get all food logs for this date
    logs = (
        db.query(FoodLog)
        .filter(
            FoodLog.user_id == user_id,
            FoodLog.logged_at.like(f"{target_date}%"),
        )
        .all()
    )

    # Get the active goal for this date
    try:
        parsed_date = datetime.strptime(target_date, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD.")

    goal = _get_goal_for_date(user_id, parsed_date, db)

    return _build_daily_summary(target_date, logs, goal)


@router.get("/weekly", response_model=WeeklySummary)
def weekly_summary(
    user_id: int,
    from_date: str | None = Query(
        None,
        alias="from",
        description="Start date (YYYY-MM-DD). Defaults to 7 days ago.",
    ),
    db: Session = Depends(get_db),
):
    """
    Get 7-day summary: daily breakdown, averages, and totals.
    """
    _verify_user(user_id, db)

    if from_date:
        try:
            start = datetime.strptime(from_date, "%Y-%m-%d").date()
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD.")
    else:
        start = date_type.today() - timedelta(days=6)

    end = start + timedelta(days=6)

    # Get all logs in the date range
    logs = (
        db.query(FoodLog)
        .filter(
            FoodLog.user_id == user_id,
            FoodLog.logged_at >= start.isoformat(),
            FoodLog.logged_at <= end.isoformat() + "T23:59:59",
        )
        .all()
    )

    # Group logs by date
    logs_by_date: dict[str, list] = defaultdict(list)
    for log in logs:
        log_date = log.logged_at[:10]  # Extract YYYY-MM-DD from ISO timestamp
        logs_by_date[log_date].append(log)

    # Build daily breakdowns for each day in the range
    daily_breakdowns = []
    total_cal = 0.0
    total_protein = 0.0
    days_with_data = 0

    current = start
    while current <= end:
        date_str = current.isoformat()
        day_logs = logs_by_date.get(date_str, [])
        goal = _get_goal_for_date(user_id, current, db)
        summary = _build_daily_summary(date_str, day_logs, goal)
        daily_breakdowns.append(summary)

        if day_logs:
            days_with_data += 1
            total_cal += summary.total_calories
            total_protein += summary.total_protein_grams

        current += timedelta(days=1)

    # Compute averages (avoid division by zero)
    divisor = max(days_with_data, 1)

    return WeeklySummary(
        from_date=start.isoformat(),
        to_date=end.isoformat(),
        avg_daily_calories=round(total_cal / divisor, 2),
        avg_daily_protein_grams=round(total_protein / divisor, 2),
        total_calories=round(total_cal, 2),
        total_protein_grams=round(total_protein, 2),
        daily_breakdown=daily_breakdowns,
    )


@router.get("/weight-trend", response_model=WeightTrendResponse)
def weight_trend(
    user_id: int,
    from_date: str | None = Query(None, alias="from", description="Start date"),
    to_date: str | None = Query(None, alias="to", description="End date"),
    db: Session = Depends(get_db),
):
    """
    Get weight and BMI trend over time.
    Returns data points and overall change (first → last).
    """
    _verify_user(user_id, db)

    query = db.query(BodyMetric).filter(BodyMetric.user_id == user_id)

    if from_date:
        query = query.filter(BodyMetric.recorded_at >= from_date)
    if to_date:
        query = query.filter(BodyMetric.recorded_at <= to_date)

    metrics = query.order_by(BodyMetric.recorded_at).all()

    data_points = [
        WeightTrendPoint(
            recorded_at=m.recorded_at,
            weight_kg=m.weight_kg,
            bmi=m.bmi,
        )
        for m in metrics
    ]

    weight_change = None
    bmi_change = None
    if len(metrics) >= 2:
        weight_change = round(metrics[-1].weight_kg - metrics[0].weight_kg, 2)
        if metrics[0].bmi and metrics[-1].bmi:
            bmi_change = round(metrics[-1].bmi - metrics[0].bmi, 2)

    return WeightTrendResponse(
        data_points=data_points,
        weight_change_kg=weight_change,
        bmi_change=bmi_change,
    )
