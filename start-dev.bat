@echo off
echo.
echo ========================================
echo   NEXUS ACADEMY - Iniciando Dev Mode
echo ========================================
echo.

REM Verificar se as dependencias estao instaladas
if not exist "backend-core\node_modules" (
    echo [BACKEND] Instalando dependencias...
    cd backend-core
    call npm install
    cd ..
)

if not exist "frontend\node_modules" (
    echo [FRONTEND] Instalando dependencias...
    cd frontend
    call npm install
    cd ..
)

echo.
echo [INFO] Iniciando Backend na porta 5000...
echo [INFO] Iniciando Frontend na porta 5173...
echo.
echo ========================================
echo   Acesse: http://localhost:5173
echo   API Docs: http://localhost:5000/api-docs
echo   Health: http://localhost:5000/api/health
echo ========================================
echo.
echo Pressione Ctrl+C para parar os servidores
echo.

REM Iniciar backend e frontend em paralelo
start "Nexus Backend" cmd /k "cd backend-core && npm run dev"
timeout /t 3 /nobreak > nul
start "Nexus Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo [OK] Servidores iniciados em janelas separadas!
echo.
pause
