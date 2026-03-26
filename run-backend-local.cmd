@echo off
cd /d C:\Users\user\Desktop\SOMPO\backend
set DATABASE_URL=sqlite:///./dev.db
set STORAGE_BACKEND=local
set LOCAL_STORAGE_PATH=./.data/artifacts
set OPENCLAW_RUNTIME_MODE=mock
set AUTO_SEED_DEMO_ON_EMPTY=true
uv run uvicorn backend.main:app --host 0.0.0.0 --port 8000
