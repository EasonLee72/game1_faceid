# game1_faceid

## 在新電腦上執行

### 快速安裝：install.bat

把 `install.bat` 單獨複製到新電腦想放專案的資料夾，雙擊或在 cmd 執行。它會依序：

1. 檢查 Node.js（缺少時用 winget 安裝 Node.js LTS；版本過舊會提示升級）
2. 檢查 Git（缺少時用 winget 安裝）
3. 安裝 pnpm
4. `git clone` 專案到同資料夾下的 `game1_faceid\`（已存在則改為 `git pull`）
5. `pnpm install` 安裝套件

完成後執行 `game1_faceid\start.bat` 即可。若 winget 安裝 Node.js／Git 後指令仍找不到，關掉 cmd 重開再執行一次 `install.bat`。

以下為手動安裝步驟。

### 1. 安裝環境（只需一次）

1. 安裝 **Node.js 22 LTS**（<https://nodejs.org>）。本專案使用 Vite 8，需要 Node 20.19+ 或 22.12+。
2. 開啟 PowerShell，安裝 pnpm：

   ```
   npm install -g pnpm
   ```

### 2. 取得專案（擇一）

**方式 A：git clone（推薦）**

```
git clone https://github.com/EasonLee72/game1_faceid.git
```

之後有更新時，在專案資料夾執行 `git pull` 即可同步。

**方式 B：直接複製資料夾**

複製前請先刪除或排除 `node_modules`：

- 檔案量大，複製很慢。
- 內含與作業系統綁定的原生檔案，換電腦可能壞掉；而 `start.bat` 只在**沒有** `node_modules` 時才會重新安裝，帶過去壞的不會自動修復。

### 3. 啟動

雙擊 `start.bat`。

- 第一次執行會自動 `pnpm install`（需要網路），然後啟動伺服器並開啟瀏覽器。
- 之後執行會直接啟動。
- 使用期間請保持該視窗開啟；關閉視窗或按 `Ctrl+C` 即停止。

## 更新版本

雙擊專案資料夾裡的 `update.bat`，它會 `git pull` 取得最新版本並 `pnpm install` 同步套件，完成後再執行 `start.bat`。

若在管理頁改過照片或 `ans_order.md`，而 GitHub 上的新版本也改了同一批檔案，更新會中止並列出本機改過的檔案。這時先備份需要保留的檔案，再執行 `git checkout -- .` 捨棄本機修改，然後重新執行 `update.bat`。

## 注意事項

- **只能以開發模式（`pnpm dev`）執行，不能 build 成靜態網頁。** 讀寫 `face/` 與 `ans_order.md` 的 API 掛在 Vite 開發伺服器上（見 `vite.config.ts`），`pnpm build` 產生的 `dist` 沒有這個 API。
- **`face/.backup/` 不在 git 版控中。** 用 git clone 不會取得此資料夾，若需要請另外手動複製。
- **首次安裝需要網路。** 若新電腦會在離線環境使用，請先在該電腦連網執行一次 `start.bat`，完成套件安裝。
