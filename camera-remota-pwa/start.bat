@echo off
REM Script de inicialização rápida do PWA Câmera Remota (Windows)
REM Uso: start.bat

echo.
echo 🚀 Iniciando Câmera Remota PWA...
echo.

REM Verificar se está no diretório correto
if not exist "index.html" (
  echo ❌ Erro: Execute este script dentro da pasta camera-remota-pwa
  pause
  exit /b 1
)

REM Verificar se Python está instalado
where python >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
  echo ❌ Erro: Python não encontrado. Instale Python ou use Node.js
  echo.
  echo Baixe Python em: https://www.python.org/downloads/
  pause
  exit /b 1
)

REM Obter IP local
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4"') do (
  set LOCAL_IP=%%a
  goto :found_ip
)

:found_ip
set LOCAL_IP=%LOCAL_IP:~1%

REM Porta padrão
set PORT=8080

echo ✅ Servidor será iniciado em:
echo    Local:    http://localhost:%PORT%
echo    Rede:     http://%LOCAL_IP%:%PORT%
echo.
echo 📱 Para conectar o celular:
echo    1. Certifique-se de que está na mesma WiFi
echo    2. Abra no celular: http://%LOCAL_IP%:%PORT%
echo.
echo ⚠️  Para instalar como PWA, use HTTPS (GitHub Pages, Vercel, etc.)
echo.
echo 🛑 Pressione Ctrl+C para parar o servidor
echo.

REM Iniciar servidor HTTP
python -m http.server %PORT%
