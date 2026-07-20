@echo off
REM ===================================================================
REM  The Worlds - local launcher (Windows)
REM
REM  Double-click this file to run the documentary on THIS PC. It
REM  installs dependencies the first time, starts the local web server,
REM  and opens Episode 1 in your browser.
REM
REM  Requires Node.js (https://nodejs.org - the LTS installer is fine).
REM ===================================================================

setlocal
title The Worlds - Documentary
cd /d "%~dp0"

echo.
echo   THE WORLDS - starting up...
echo.

REM --- 1. Make sure Node.js is available ------------------------------
where node >nul 2>nul
if errorlevel 1 (
  echo   [!] Node.js was not found on this PC.
  echo.
  echo       Install it from https://nodejs.org  ^(pick the LTS version^),
  echo       then double-click this file again.
  echo.
  pause
  exit /b 1
)

REM --- 2. Install the movie's dependencies (first run only) -----------
cd movie
if not exist "node_modules\" (
  echo   Installing dependencies. This happens once and may take a minute...
  echo.
  call npm install
  if errorlevel 1 (
    echo.
    echo   [!] Dependency install failed. Scroll up for the error.
    pause
    exit /b 1
  )
)

REM --- 3. Build the tree library (only needed for the Surface view; ---
REM ---    the documentary runs fine without it, so failure is OK) -----
if not exist "..\ez-tree\build\" (
  echo   Preparing the tree library ^(optional, for the surface view^)...
  pushd ..\ez-tree
  if not exist "node_modules\" call npm install
  call npm run build:lib
  popd
)

REM --- 4. Launch the server in its own window, then open the browser --
echo.
echo   Starting the local server...
start "The Worlds - server (close this window to stop)" cmd /k "npm run dev"

echo   Waiting for the server to come up...
timeout /t 6 /nobreak >nul

echo   Opening the hub in your browser...
start "" "http://localhost:5180/"

echo.
echo   ================================================================
echo    The hub is opening at:  http://localhost:5180/
echo.
echo    - Click "Begin" to start ^(browsers need a click before audio^).
echo    - Refresh the page for a brand-new universe.
echo    - The set browser is at:  http://localhost:5180/set.html
echo.
echo    To STOP everything, close the "server" window that opened.
echo   ================================================================
echo.
pause
endlocal
