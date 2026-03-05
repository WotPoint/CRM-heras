@echo off
title CRM-heras Stop

echo.
echo  ============================================
echo   CRM-heras - Stopping servers
echo  ============================================
echo.
echo  Data is saved in SQLite (backend\prisma\prisma\dev.db)
echo.

echo  Stopping Backend...
taskkill /FI "WINDOWTITLE eq CRM Backend" /T /F >nul 2>&1

echo  Stopping Frontend...
taskkill /FI "WINDOWTITLE eq CRM Frontend" /T /F >nul 2>&1

:: Kill anything still on port 3001
for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr ":3001 "') do (
    taskkill /PID %%a /F >nul 2>&1
)

echo  Done. Both servers stopped.
echo.
pause >nul
