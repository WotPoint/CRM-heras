@echo off
title CRM-heras Launcher

set NODE_TLS_REJECT_UNAUTHORIZED=0
set NODE_NO_WARNINGS=1
set ROOT=%~dp0

echo.
echo  ============================================
echo   CRM-heras   Backend + Frontend
echo  ============================================
echo.

:: --- Backend deps ---
if not exist "%ROOT%backend\node_modules\.bin\tsx.cmd" (
    echo [1/5] Installing backend dependencies...
    cd /d "%ROOT%backend"
    call npm install --include=dev
    if errorlevel 1 goto :error
    echo.
)

:: --- .env check ---
if not exist "%ROOT%backend\.env" (
    echo [!] backend\.env not found - copying from .env.example
    echo     IMPORTANT: Edit backend\.env and set a strong JWT_SECRET before using in production!
    copy "%ROOT%backend\.env.example" "%ROOT%backend\.env" >nul
    echo.
)

:: --- Database init ---
:: Real DB path: backend\prisma\prisma\dev.db
:: (Prisma resolves file:./prisma/dev.db relative to schema.prisma location)
if not exist "%ROOT%backend\prisma\prisma\dev.db" (
    echo [2/5] Creating SQLite database and generating Prisma client...
    cd /d "%ROOT%backend"
    call npx prisma migrate deploy
    if errorlevel 1 (
        echo   migrate failed, trying db push...
        call npx prisma db push
        if errorlevel 1 goto :error
    )
    call npx prisma generate
    if errorlevel 1 goto :error
    echo [3/5] Seeding initial data...
    call npx tsx prisma\seed.ts
    if errorlevel 1 goto :error
    echo.
) else (
    echo [2/5] Database OK - skipping seed.
    echo.
)

:: --- Frontend deps ---
if not exist "%ROOT%frontend\node_modules" (
    echo [4/5] Installing frontend dependencies...
    cd /d "%ROOT%frontend"
    call npm install --include=dev
    if errorlevel 1 goto :error
    echo.
)

:: --- Launch ---
echo [5/5] Starting servers...
echo  Starting backend  (http://localhost:3001) ...
start "CRM Backend"  /d "%ROOT%backend"  cmd /k "set NODE_TLS_REJECT_UNAUTHORIZED=0 && set NODE_NO_WARNINGS=1 && npm run dev"

ping -n 3 127.0.0.1 >nul

echo  Starting frontend (http://localhost:5173) ...
start "CRM Frontend" /d "%ROOT%frontend" cmd /k "set NODE_TLS_REJECT_UNAUTHORIZED=0 && set NODE_NO_WARNINGS=1 && npm run dev"

goto :done

:error
echo.
echo  *** ERROR. See message above. ***
echo.
pause
exit /b 1

:done
echo.
echo  ============================================
echo   Backend:   http://localhost:3001
echo   Frontend:  http://localhost:5173
echo   Stop:      run stop.bat
echo  ============================================
echo.
pause >nul
