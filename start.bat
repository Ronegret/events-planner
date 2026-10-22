@echo off
setlocal
chcp 65001 >nul
title Events Planner - Servidor local

REM Situarse SIEMPRE en la carpeta de este archivo. Sin esto, si Windows
REM ejecuta el .bat desde otro directorio (acceso directo, doble clic con
REM otra carpeta activa), "node server.mjs" no encuentra el archivo y la
REM ventana se cierra sin decir nada.
cd /d "%~dp0"

echo.
echo   ============================================
echo      Events Planner - Servidor local
echo   ============================================
echo.

REM 1. Comprobar que Node esta instalado
where node >nul 2>nul
if errorlevel 1 (
  echo   [X] No se encuentra Node.js en este equipo.
  echo.
  echo   Events Planner necesita Node.js para arrancar.
  echo   Descargalo en:  https://nodejs.org  ^(version LTS^)
  echo   Instalalo, cierra esta ventana y vuelve a abrir start.bat
  echo.
  pause
  exit /b 1
)

for /f "tokens=*" %%v in ('node --version') do set NODEVER=%%v
echo   [OK] Node.js %NODEVER%

REM 2. Comprobar que estamos en la carpeta correcta
if not exist "server.mjs" (
  echo   [X] No encuentro server.mjs en:
  echo       %CD%
  echo.
  echo   Mueve start.bat a la carpeta del proyecto Events Planner y vuelve a intentarlo.
  echo.
  pause
  exit /b 1
)
echo   [OK] Proyecto encontrado en %CD%

REM 3. Avisar si el puerto 3000 ya esta ocupado
netstat -ano | findstr /r /c:"LISTENING" | findstr ":3000 " >nul 2>nul
if not errorlevel 1 (
  echo   [!] El puerto 3000 ya esta en uso.
  echo       Puede ser otra ventana de Events Planner ya abierta.
  echo       Prueba primero a ir a  http://localhost:3000
  echo.
)

echo.
echo   Abriendo http://localhost:3000
echo   Deja ESTA ventana abierta mientras uses la aplicacion.
echo   Para detener el servidor: cierra la ventana o pulsa Ctrl+C
echo.
echo   --------------------------------------------
echo.

node server.mjs

REM Si node termina, algo fallo: mantener la ventana para poder leerlo
echo.
echo   --------------------------------------------
echo   El servidor se ha detenido.
echo.
pause
