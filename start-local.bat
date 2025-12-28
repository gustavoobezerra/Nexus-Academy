@echo off
setlocal EnableDelayedExpansion

cd /d "%~dp0"

echo Matando processos na porta 5000 (backend)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5000.*LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
)

echo Matando processos na porta 5173 (frontend)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5173.*LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
)

echo Iniciando backend (porta 5000)...
start "Nexus Backend" cmd /k "cd /d %~dp0backend-core && npm run dev"

echo Iniciando frontend (porta 5173)...
start "Nexus Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo Pronto! Backend em http://localhost:5000 e Frontend em http://localhost:5173
echo.

endlocal
