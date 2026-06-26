# CPBL Recent Form Visualizer

Chrome extension MVP for CPBL official player pages.

## 功能

- 在 `cpbl.com.tw/team/person?Acnt=...` 球員頁與 `cpbl.com.tw/team/follow?Acnt=...` 逐場成績頁的表格上方插入「近期表現」面板。
- 預設取最近 5 場一軍例行賽，使用者可在 popup 調整 1 到 20 場。
- 打者顯示 `AVG`、`OBP`、`SLG`、`OPS`。
- 投手顯示 `ERA`、`WHIP`、總局數、平均用球，並列出近幾場用球數與登板間隔。
- 資料只取自 CPBL 官網公開頁面與官方逐場成績 endpoint，並在本機快取 6 小時。

## 開發安裝

1. 打開 `chrome://extensions`。
2. 開啟 Developer mode。
3. 選擇 Load unpacked，載入此資料夾。
4. 開啟 CPBL 官網球員頁測試。

## 上架注意

- 權限只使用 `storage` 與 CPBL 官網 host permissions。
- 沒有第三方 analytics、登入、遠端後端或個資收集。
- `www.cpbl.com.tw` 可能會重新導向，實際資料請求以目前頁面同源路徑執行。
