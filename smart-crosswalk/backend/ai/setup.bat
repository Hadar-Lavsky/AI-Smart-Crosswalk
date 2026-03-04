@echo off
echo ============================================
echo  Smart Crosswalk - AI Service Setup
echo ============================================
echo.

:: Check Python is installed
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Python is not installed or not in PATH.
    echo Please install Python 3.10+ from https://www.python.org/downloads/
    echo Make sure to check "Add Python to PATH" during installation.
    echo.
    pause
    exit /b 1
)

echo Found Python:
python --version
echo.

:: Create virtual environment if it doesn't exist
if not exist "venv" (
    echo Creating virtual environment...
    python -m venv venv
    echo Virtual environment created.
) else (
    echo Virtual environment already exists.
)
echo.

:: Activate virtual environment and install dependencies
echo Installing dependencies...
call venv\Scripts\activate
pip install -r requirements.txt

echo.
echo ============================================
echo  Setup complete!
echo ============================================
echo.
echo To activate the environment, run:
echo   cd backend\ai
echo   venv\Scripts\activate
echo.
echo To run the detection script:
echo   python main.py
echo.
pause
