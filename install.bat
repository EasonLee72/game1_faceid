@echo off
setlocal
cd /d "%~dp0"

set "REPO_URL=https://github.com/EasonLee72/game1_faceid.git"
set "APP_DIR=%~dp0game1_faceid"
rem If this script already sits inside the project, update in place instead of nesting a clone.
if exist "%~dp0.git" if exist "%~dp0package.json" set "APP_DIR=%~dp0"

rem Make freshly installed tools visible to this session without reopening cmd.
set "PATH=%ProgramFiles%\nodejs;%ProgramFiles%\Git\cmd;%APPDATA%\npm;%PATH%"

echo [1/5] Checking Node.js...
where node >nul 2>nul
if errorlevel 1 (
  call :winget_install OpenJS.NodeJS.LTS "Node.js LTS"
  if errorlevel 1 exit /b 1
)
node -e "const [a,b]=process.versions.node.split('.').map(Number);process.exit(a>22||(a===22&&b>=12)||(a===20&&b>=19)?0:1)"
if errorlevel 1 (
  echo [ERROR] Node.js 20.19+ or 22.12+ is required. Current version:
  node -v
  echo Please install Node.js 22 LTS from https://nodejs.org and run this script again.
  pause
  exit /b 1
)

echo [2/5] Checking Git...
where git >nul 2>nul
if errorlevel 1 (
  call :winget_install Git.Git "Git"
  if errorlevel 1 exit /b 1
)

echo [3/5] Checking pnpm...
where pnpm >nul 2>nul
if errorlevel 1 (
  call npm install -g pnpm
  if errorlevel 1 (
    echo [ERROR] Failed to install pnpm.
    pause
    exit /b 1
  )
)

echo [4/5] Getting source code...
if exist "%APP_DIR%\.git" (
  git -C "%APP_DIR%" pull
  if errorlevel 1 echo [WARN] git pull failed. Continuing with the existing copy.
) else (
  git clone "%REPO_URL%" "%APP_DIR%"
  if errorlevel 1 (
    echo [ERROR] git clone failed. Check the network connection and repository access.
    pause
    exit /b 1
  )
)

echo [5/5] Installing dependencies...
pushd "%APP_DIR%"
call pnpm install
if errorlevel 1 (
  popd
  echo [ERROR] pnpm install failed.
  pause
  exit /b 1
)
popd

echo.
echo Done. To start the game, run:
echo   "%APP_DIR%\start.bat"
pause
exit /b 0

:winget_install
where winget >nul 2>nul
if errorlevel 1 (
  echo [ERROR] %~2 is not installed and winget is unavailable.
  echo Please install %~2 manually, then run this script again.
  pause
  exit /b 1
)
echo Installing %~2 via winget...
winget install -e --id %1 --accept-source-agreements --accept-package-agreements
if errorlevel 1 (
  echo [ERROR] Failed to install %~2.
  pause
  exit /b 1
)
exit /b 0
