@echo off
echo Starting Smart Crosswalk System...
echo.

:: Check if port 3000 is in use
echo Checking if port 3000 is available...
netstat -ano | findstr ":3000" | findstr "LISTENING" >nul
if %errorlevel%==0 (
    echo.
    echo WARNING: Port 3000 is already in use!
    echo A backend server is already running.
    echo.
    echo Please close the existing backend server window first,
    echo or press Ctrl+C to cancel and stop the existing server.
    echo.
    pause
    exit /b 1
)

echo Starting Backend Server...
start "Backend Server" cmd /k "cd backend && npm start"
timeout /t 5 /nobreak >nul

echo Starting Frontend Server...
start "Frontend Server" cmd /k "cd frontend && npm run dev"
echo.
echo Both servers are starting in separate windows!
echo Backend: http://localhost:3000
echo Frontend: http://localhost:5173
echo.
echo To stop the servers, close their respective windows.
pause
