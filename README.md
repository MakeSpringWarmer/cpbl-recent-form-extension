# CPBL Recent Form Visualizer

在 CPBL 官網直接查看球員與球隊近期表現的 Chrome extension。

## 功能

- 在 `cpbl.com.tw/team/person?Acnt=...` 球員頁與 `cpbl.com.tw/team/follow?Acnt=...` 逐場成績頁的表格上方插入「近期表現」面板。
- 球員預設取最近 5 場，球隊預設取最近 10 場；場數可直接在頁面面板調整。
- 打者顯示 `AVG`、`OBP`、`SLG`、`OPS`。
- 投手顯示 `ERA`、`WHIP`、總局數、平均用球，並列出近幾場用球數與登板間隔。
- 在球隊逐日戰績頁顯示勝敗、得失分、主場戰績與近期賽果。
- 資料只取自 CPBL 官網公開頁面與官方逐場成績 endpoint，並在本機快取 6 小時。

## 架構

```text
src/content.js                    bootstrap，只串接 modules
src/adapters/cpbl-source.js       Player Source / Team Source adapters
src/core/recent-form.js           Recent Form 計算與日期政策
src/ui/recent-form-panel.js       面板 mount、狀態與 rendering
src/settings/game-count.js        Player / Team 場數政策
src/content.css                   注入頁面的視覺樣式
```

各 module 透過 `globalThis.CPBLRFV` 提供小型 interface，並由 `manifest.json` 依相依順序載入。

## 測試

需要 Node.js 18 以上版本：

```bash
npm test
```

## 開發安裝

1. 打開 `chrome://extensions`。
2. 開啟 Developer mode。
3. 選擇 Load unpacked，載入此資料夾。
4. 開啟 CPBL 官網球員頁或球隊逐日戰績頁測試。

## 上架注意

- 權限只使用 `storage` 與 CPBL 官網 host permissions。
- 沒有第三方 analytics、登入、遠端後端或個資收集。
- `www.cpbl.com.tw` 可能會重新導向，實際資料請求以目前頁面同源路徑執行。
