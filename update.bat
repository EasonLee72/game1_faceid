@echo off
setlocal
cd /d "%~dp0"

where git >nul 2>nul
if errorlevel 1 (
  echo [ERROR] git not found. Run install.bat first.
  pause
  exit /b 1
)
where pnpm >nul 2>nul
if errorlevel 1 (
  echo [ERROR] pnpm not found. Run install.bat first.
  pause
  exit /b 1
)

echo [1/2] Pulling latest version...
git pull --ff-only
if errorlevel 1 (
  echo.
  echo [ERROR] Update failed. Files changed on this computer:
  git status --short
  echo.
  echo Photos or ans_order.md edited on the manage page may conflict with the update.
  echo Back up those files, discard the changes with "git checkout -- ." and run update.bat again.
  pause
  exit /b 1
)

echo [2/2] Installing dependencies...
call pnpm install
if errorlevel 1 (
  echo [ERROR] pnpm install failed.
  pause
  exit /b 1
)

echo.
echo Update complete. Run start.bat to start the game.
pause
