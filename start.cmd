@echo off
setlocal
chcp 65001 >nul
title PixelSoft
cd /d "%~dp0"

echo.
echo   ============================================================
echo    PIXELSOFT  -  tus IAs locales jugando a ser una empresa
echo   ============================================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo   [X] No encuentro Node.js. Instalalo desde https://nodejs.org
  echo.
  pause
  exit /b 1
)

echo   Comprobando si tu servidor de modelos esta escuchando...
powershell -NoProfile -Command "try { $r = Invoke-RestMethod 'http://127.0.0.1:8080/v1/models' -Headers @{Authorization='Bearer local-llama'} -TimeoutSec 4; Write-Host ('   [OK] LM Studio responde. ' + $r.data.Count + ' modelos disponibles.') } catch { Write-Host '   [!]  No responde el puerto 8080.'; Write-Host '        Abre LM Studio - pestana Developer - Start Server.'; Write-Host '        El juego arrancara igual, pero los empleados no podran pensar.' }"

echo.
echo   Arrancando el juego... (Ctrl+C para parar)
echo.

start "" http://127.0.0.1:3777
node server.js

echo.
echo   El juego se ha parado.
pause
