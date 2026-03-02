@echo off
title CRM-heras Dev Server
color 0A

cd /d "%~dp0"

echo ============================================
echo   CRM-heras — запуск локального сервера
echo ============================================
echo.

:: Проверка наличия Node.js
where node >nul 2>&1
if errorlevel 1 (
    color 0C
    echo [ОШИБКА] Node.js не найден. Установите Node.js с https://nodejs.org
    pause
    exit /b 1
)

:: Проверка node_modules
if not exist "node_modules" (
    echo [INFO] node_modules не найден — устанавливаем зависимости...
    echo.
    npm install --include=dev
    if errorlevel 1 (
        color 0C
        echo [ОШИБКА] Не удалось установить зависимости.
        pause
        exit /b 1
    )
    echo.
)

:: Отображение адресов доступа
echo [INFO] Сервер запускается...
echo [INFO] Режим: --host 0.0.0.0 (доступно через VPN и локальную сеть)
echo.
echo  Адреса после запуска:
echo   Local:    http://localhost:5173
echo   Network:  http://<ваш IP>:5173
echo   VPN:      http://<VPN IP>:5173
echo.
echo  Для остановки нажмите Ctrl+C
echo ============================================
echo.

:: Запуск Vite с привязкой ко всем сетевым интерфейсам (включая VPN)
npx vite --host 0.0.0.0 --port 5173

echo.
echo Сервер остановлен.
pause
