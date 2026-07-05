"""
Utility functions — BMI calculation, date helpers.
"""

from datetime import date, datetime


def calculate_bmi(height_cm: float, weight_kg: float) -> float | None:
    """
    Calculate BMI from height (cm) and weight (kg).
    Formula: weight / (height_in_meters ^ 2)
    Returns None if inputs are invalid.
    """
    if height_cm <= 0 or weight_kg <= 0:
        return None
    height_m = height_cm / 100.0
    return round(weight_kg / (height_m ** 2), 2)


def get_today() -> date:
    """Return today's date."""
    return date.today()


def parse_date(date_str: str) -> date:
    """Parse a date string in YYYY-MM-DD format."""
    return datetime.strptime(date_str, "%Y-%m-%d").date()


def normalize_per_100g(total_value: float, quantity_grams: float) -> float:
    """
    Normalize a nutritional value to per-100g.
    E.g., 300 kcal for 200g → 150 kcal per 100g.
    """
    if quantity_grams <= 0:
        return 0.0
    return round((total_value / quantity_grams) * 100, 2)


def compute_from_100g(value_per_100g: float, quantity_grams: float) -> float:
    """
    Compute actual nutritional value from per-100g data and quantity.
    E.g., 150 kcal/100g * 200g → 300 kcal.
    """
    return round((value_per_100g * quantity_grams) / 100, 2)
