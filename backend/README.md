# Contract Obligation Tracker (COT) — Backend Service

FastAPI-powered backend for ingesting contract documents (.pdf, .docx), extracting key contractual obligations, calculating deadline urgency and risk severity, and exporting structured milestone reports.

Built according to the Software Requirements Specification (SRS v1.0) and Technical Design Report for CSMC502 (Tezpur University).

---

## 🏗️ Architecture & Module Organization

```text
backend/
├── app/
│   ├── main.py              # FastAPI app factory, CORS, exception handlers
│   ├── core/
│   │   ├── config.py        # Settings & environment configuration
│   │   ├── security.py      # Bcrypt (work factor >= 12) & JWT session issuance
│   │   └── database.py      # SQLAlchemy session & SQLite/Postgres connection
│   ├── models/              # Relational models: User, Contract, Obligation
│   ├── schemas/             # Pydantic v2 DTOs (Request / Response validation)
│   ├── api/                 # REST endpoints (/auth, /contracts, /obligations, /dashboard)
│   └── services/
│       ├── document_parser.py # PDF/DOCX parsing & file constraint validation
│       ├── deadline_tracker.py# Upcoming, Due Today, Overdue computation
│       ├── risk_scorer.py   # Low, Medium, High severity scoring
│       └── exporter.py      # CSV, Excel (.xlsx), and iCalendar (.ics) generation
├── nlp/
│   ├── schema.py            # ExtractedObligationItem data structure
│   └── extractor.py         # Open-source NLP extraction pipeline (5 core fields)
├── storage/uploads/         # Isolated runtime file storage
├── tests/                   # Pytest test cases
├── requirements.txt
└── .env.example
```

---

## 🚀 Quickstart Guide

### 1. Create and Activate Virtual Environment
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
```

### 2. Install Dependencies
```bash
pip install -r requirements.txt
```

### 3. Environment Configuration
```bash
cp .env.example .env
```

### 4. Run the Backend Server
```bash
uvicorn app.main:app --reload --port 8000
```
- Interactive API Documentation: [http://localhost:8000/docs](http://localhost:8000/docs)
- Alternative Redoc: [http://localhost:8000/redoc](http://localhost:8000/redoc)
- Health check: `GET http://localhost:8000/api/health`

### 5. Run Tests
```bash
pytest
```

---

## 📡 REST API Summary

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Register new user account |
| `POST` | `/api/auth/login` | Authenticate and obtain JWT token |
| `GET` | `/api/auth/me` | Fetch authenticated user profile |
| `POST` | `/api/contracts/upload` | Upload `.pdf` / `.docx` file and trigger extraction |
| `GET` | `/api/contracts` | List all contracts uploaded by authenticated user |
| `GET` | `/api/contracts/{id}` | Get contract status and metadata |
| `GET` | `/api/contracts/{id}/preview` | Stream file for side-by-side frontend preview |
| `GET` | `/api/contracts/{id}/obligations` | List extracted obligations (supports search & filters) |
| `POST` | `/api/obligations` | Manually add a custom obligation |
| `PUT` | `/api/obligations/{id}` | Inline edit obligation fields |
| `DELETE`| `/api/obligations/{id}` | Delete an obligation row |
| `PATCH`| `/api/obligations/{id}/verify`| Toggle verified status |
| `GET` | `/api/dashboard` | Dashboard metrics (deadlines, risk levels, financial exposure) |
| `GET` | `/api/contracts/{id}/export` | Export obligations as `?format=csv`, `xlsx`, or `ics` |
