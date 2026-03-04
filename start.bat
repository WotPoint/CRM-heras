@echo off
title CRM-heras Launcher

set NODE_TLS_REJECT_UNAUTHORIZED=0
set NODE_NO_WARNINGS=1
set ROOT=%~dp0

echo.
echo  ============================================
echo   CRM-heras   Backend + Frontend
echo  ============================================
echo   ROOT: %ROOT%
echo.

:: ---------- Backend deps ----------
if not exist "%ROOT%backend\node_modules" (
    echo [1/4] Installing backend dependencies...
    cd /d "%ROOT%backend"
    call npm install
    if errorlevel 1 goto :error
    echo.
)

:: ---------- Database init ----------
if not exist "%ROOT%backend\prisma\dev.db" (
    echo [2/4] Creating SQLite database...
    cd /d "%ROOT%backend"
    call npx prisma migrate deploy
    if errorlevel 1 (
        echo   migrate failed, trying db push...
        call npx prisma db push
        if errorlevel 1 goto :error
    )
    echo [3/4] Seeding initial data...
    call npx tsx prisma\seed.ts
    if errorlevel 1 goto :error
    echo.
)

:: ---------- Frontend deps ----------
if not exist "%ROOT%frontend\node_modules" (
    echo [4/4] Installing frontend dependencies...
    cd /d "%ROOT%frontend"
    call npm install
    if errorlevel 1 goto :error
    echo.
)

:: ---------- Launch servers ----------
echo [1/2] Starting backend  (http://localhost:3001)...
start "CRM Backend"  /d "%ROOT%backend"  cmd /k "set PATH=%ROOT%backend\node_modules\.bin;%PATH% && set NODE_TLS_REJECT_UNAUTHORIZED=0 && set NODE_NO_WARNINGS=1 && npm run dev"

ping -n 2 127.0.0.1 >nul

echo [2/2] Starting frontend (http://localhost:5173)...
start "CRM Frontend" /d "%ROOT%frontend" cmd /k "set NODE_TLS_REJECT_UNAUTHORIZED=0 && set NODE_NO_WARNINGS=1 && npm run dev"

goto :done

:error
echo.
echo  *** ERROR on line above. Window will stay open. ***
echo.

:done
echo.
echo  ============================================
echo   Backend:   http://localhost:3001
echo   Frontend:  http://localhost:5173
echo   API Test:  backend\test.html
echo  ============================================
echo.
echo  Press any key to close this window...
pause >nul
