@echo off
chcp 65001 >nul
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo [錯誤] 找不到 Node.js。請執行 install.bat，或到 https://nodejs.org 安裝 Node.js 22 LTS。
  pause
  exit /b 1
)
node -e "const [a,b]=process.versions.node.split('.').map(Number);process.exit(a>22||(a===22&&b>=12)||(a===20&&b>=19)?0:1)"
if errorlevel 1 (
  echo [錯誤] Node.js 版本太舊，需要 20.19 或 22.12 以上。目前版本：
  node -v
  echo 請到 https://nodejs.org 安裝 Node.js 22 LTS 後再執行一次。
  pause
  exit /b 1
)

where pnpm >nul 2>nul
if errorlevel 1 (
  echo [錯誤] 找不到 pnpm。請執行 install.bat，或執行：npm install -g pnpm
  pause
  exit /b 1
)

echo 檢查套件...
rem confirmModulesPurge=false：node_modules 來自別台電腦或別版 pnpm 時，直接重建而不跳出 Y/n 詢問
call pnpm install --config.confirmModulesPurge=false
if errorlevel 1 (
  if not exist node_modules (
    echo [錯誤] 套件安裝失敗，請確認網路連線後再執行一次。
    pause
    exit /b 1
  )
  echo [警告] 套件檢查失敗（可能沒有網路），改用現有套件啟動。
)

rem pnpm install 只比對紀錄、不檢查實際檔案；實際載入 vite 才抓得到檔案缺損或 CPU 架構不符
node -e "import('vite').catch(()=>process.exit(1))" >nul 2>nul
if errorlevel 1 (
  echo [警告] 套件已損壞，重新安裝中...
  rmdir /s /q node_modules
  call pnpm install
  if errorlevel 1 (
    echo [錯誤] 套件重新安裝失敗，請確認網路連線後再執行一次。
    pause
    exit /b 1
  )
)

echo 啟動中... 關閉此視窗或按 Ctrl+C 即停止。
call pnpm dev --open
pause
