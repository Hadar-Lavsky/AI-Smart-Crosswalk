@echo off
echo Stopping all Node.js servers...
echo.

:: Kill all node processes
taskkill /F /IM node.exe >nul 2>&1

if %errorlevel%==0 (
    echo All Node.js servers stopped successfully.
) else (
    echo No Node.js servers were running.
)

echo.
echo You can now run start-all.bat to start fresh servers.
pause
