"""
Body metrics endpoints — log height/weight, track BMI over time.
"""

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import desc
from sqlalchemy.orm import Session

from api.database import get_db
from api.models import BodyMetric, User
from api.schemas import BodyMetricCreate, BodyMetricResponse
from api.utils import calculate_bmi

router = APIRouter(prefix="/api/users/{user_id}/body-metrics", tags=["Body Metrics"])


def _verify_user(user_id: int, db: Session):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.post("", response_model=BodyMetricResponse, status_code=201)
def create_body_metric(user_id: int, data: BodyMetricCreate, db: Session = Depends(get_db)):
    """Log a height/weight measurement. BMI is auto-calculated."""
    _verify_user(user_id, db)

    bmi = calculate_bmi(data.height_cm, data.weight_kg)
    recorded_at = data.recorded_at or datetime.utcnow().isoformat()

    metric = BodyMetric(
        user_id=user_id,
        height_cm=data.height_cm,
        weight_kg=data.weight_kg,
        bmi=bmi,
        recorded_at=recorded_at,
    )
    db.add(metric)
    db.commit()
    db.refresh(metric)
    return metric


@router.get("", response_model=list[BodyMetricResponse])
def get_body_metrics(
    user_id: int,
    from_date: str | None = Query(None, alias="from", description="ISO date filter start"),
    to_date: str | None = Query(None, alias="to", description="ISO date filter end"),
    db: Session = Depends(get_db),
):
    """Get body metrics history with optional date range filter."""
    _verify_user(user_id, db)

    query = db.query(BodyMetric).filter(BodyMetric.user_id == user_id)

    if from_date:
        query = query.filter(BodyMetric.recorded_at >= from_date)
    if to_date:
        query = query.filter(BodyMetric.recorded_at <= to_date)

    return query.order_by(desc(BodyMetric.recorded_at)).all()


@router.get("/latest", response_model=BodyMetricResponse)
def get_latest_body_metric(user_id: int, db: Session = Depends(get_db)):
    """Get the most recent body measurement."""
    _verify_user(user_id, db)

    metric = (
        db.query(BodyMetric)
        .filter(BodyMetric.user_id == user_id)
        .order_by(desc(BodyMetric.recorded_at))
        .first()
    )
    if not metric:
        raise HTTPException(status_code=404, detail="No body metrics recorded yet")
    return metric
