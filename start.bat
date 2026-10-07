@echo off
cd /d "%~dp0"

where pnpm >nul 2>nul
if errorlevel 1 (
  echo [ERROR] pnpm not found. Install Node.js, then run: npm install -g pnpm
  pause
  exit /b 1
)

if not exist node_modules (
  echo Installing dependencies...
  call pnpm install
  if errorlevel 1 (
    echo [ERROR] pnpm install failed.
    pause
    exit /b 1
  )
)

echo Starting dev server... Close this window or press Ctrl+C to stop.
call pnpm dev --open
pause
