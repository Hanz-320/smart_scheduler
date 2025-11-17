@echo off
REM ML Model Training Script for Windows
REM This script installs dependencies and trains the ML model

echo.
echo ========================================
echo   SMART SCHEDULER ML MODEL TRAINING
echo ========================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python and add it to your PATH
    pause
    exit /b 1
)

echo [1/3] Installing dependencies...
pip install -r requirements.txt
if %errorlevel% neq 0 (
    echo ERROR: Failed to install dependencies
    pause
    exit /b 1
)

echo.
echo [2/3] Training ML model...
python train_model.py
if %errorlevel% neq 0 (
    echo ERROR: Model training failed
    pause
    exit /b 1
)

echo.
echo [3/3] Verifying generated files...
if exist model.pkl (
    echo ✓ model.pkl
) else (
    echo ✗ model.pkl NOT FOUND
)

if exist le_task_type.pkl (
    echo ✓ le_task_type.pkl
) else (
    echo ✗ le_task_type.pkl NOT FOUND
)

if exist le_skill.pkl (
    echo ✓ le_skill.pkl
) else (
    echo ✗ le_skill.pkl NOT FOUND
)

if exist le_workload.pkl (
    echo ✓ le_workload.pkl
) else (
    echo ✗ le_workload.pkl NOT FOUND
)

if exist le_user.pkl (
    echo ✓ le_user.pkl
) else (
    echo ✗ le_user.pkl NOT FOUND
)

echo.
echo ========================================
echo   NEXT STEPS:
echo ========================================
echo 1. Copy all .pkl files to backend folder
echo 2. Set GEMINI_API_KEY in backend/.env
echo 3. Run: python app.py (in backend folder)
echo 4. Run: npm run dev (in frontend folder)
echo.
pause
