# Calorie Tracker

Personal calorie and protein tracking API with an auto-learning food catalog.

## Tech Stack

- **FastAPI** — Python web framework
- **SQLAlchemy 2.0** — ORM
- **SQLite** — Local database
- **Pydantic v2** — Validation

## Quick Start

```bash
# Create virtual environment
python -m venv venv
venv\Scripts\activate        # Windows

# Install dependencies
pip install -r requirements.txt

# Run the server
uvicorn api.main:app --reload
```

API docs available at: **http://localhost:8000/docs**

## Features

- **Auto-learning food catalog** — log "200g chicken = 300 kcal" and the system auto-creates a food item with normalized per-100g values
- **Body metrics tracking** — height, weight, auto-calculated BMI
- **Daily goals** — set calorie and protein targets, track progress
- **Analytics** — daily/weekly summaries, weight trends
- **Multi-user ready** — schema supports multiple users, default user (ID=1) auto-created on startup