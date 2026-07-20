# Chrome Web Store Listing - CPBL Recent Form Visualizer

> Last Updated: 2026-07-20

## Store Listing

**Extension Name**

CPBL Recent Form Visualizer

**Short Description**

在 CPBL 官網球員頁與球隊逐日戰績頁，直接顯示近期表現、投手登板月曆與球隊近況。

**Detailed Description**

瀏覽 CPBL 官網時，直接在原有頁面查看球員與球隊的近期表現。

打者顯示 AVG、OBP、SLG 與 OPS；投手顯示 ERA、WHIP、每場局數、平均用球與登板月曆。球員指標預設使用「近況」，也可切換「比較本季」或「比較生涯」；整季狀態圖以移動平均呈現打者 AVG、OPS 或投手 ERA、WHIP，圖表上方統一代表優於本季，下方代表低於本季，並搭配月份、日期提示與長出賽間隔輔助判讀。球隊逐日戰績頁比較近期與本季勝率、場均得失分及場均分差，以勝率狀態與得失分差折線呈現整季走勢。統計範圍可直接在面板上切換最近場數或自訂起訖日期。

安裝後開啟支援的 CPBL 球員頁或球隊逐日戰績頁，近期表現面板會自動出現在官方內容上方。

資料只來自 CPBL 官網公開數據。擴充功能沒有廣告、分析追蹤、登入系統或遠端後端。

本擴充功能為非官方工具，與中華職棒大聯盟及各球團無隸屬、合作或背書關係。網站內容與統計資料仍以 CPBL 官網顯示為準。

問題與建議：https://github.com/MakeSpringWarmer/cpbl-recent-form-extension/issues

**Category**

Sports

**Single Purpose**

在 CPBL 官網頁面視覺化球員與球隊的近期比賽表現。

**Primary Language**

Chinese (Traditional)

## Graphics & Assets

| Asset | Dimensions | Status | Filename |
|-------|-----------|--------|----------|
| Store Icon | 128x128 PNG | Ready | `icons/icon-128.png` |
| Screenshot 1 | 1280x800 PNG | Ready | `store-assets/batter0.png` - Batter recent form and season trends |
| Screenshot 2 | 1280x800 PNG | Ready | `store-assets/pitcher0.png` - Pitcher recent form and season trends |
| Screenshot 3 | 1280x800 PNG | Ready | `store-assets/pitcher1.png` - Pitcher appearance calendar |
| Screenshot 4 | 1280x800 PNG | Ready | `store-assets/team.png` - Team comparison, season trends, and recent results |
| Small Promo Tile | 440x280 PNG | Ready | `store-assets/small-promo-440x280.png` |

### Screenshot Notes

四張截圖已更新為 0.2.0 介面，涵蓋打者與投手近況及整季相對狀態、投手登板月曆，以及球隊比較、整季走勢與近期賽果。截圖亦呈現頁面內的統計場數與日期範圍控制。

## Permissions Justification

| Permission | Type | Justification |
|------------|------|---------------|
| `storage` | permissions | 保存近期場數、自訂日期範圍與球員比較方式，並在本機快取 CPBL 公開數據以減少重複請求。 |
| `https://cpbl.com.tw/*` | host_permissions | 在 CPBL 官網支援頁面顯示近期表現，並讀取同網站的官方公開比賽數據。 |
| `https://www.cpbl.com.tw/*` | host_permissions | 支援使用 `www` 網域開啟的 CPBL 官網頁面與同源公開數據。 |

## Privacy & Data Use

### Data Collection

**Does the extension collect user data?** No. The developer does not receive user data.

近期場數、自訂日期範圍與球員比較方式使用 Chrome Sync storage；啟用 Chrome Sync 時，Chrome 可能透過使用者的 Google 帳戶同步這些偏好。公開 CPBL 數據只在本機快取，且不傳送至開發者或第三方。

### Data Use Certification

- [x] Data is NOT sold to third parties
- [x] Data is NOT used for purposes unrelated to the extension's core functionality
- [x] Data is NOT used for creditworthiness or lending purposes

## Privacy Policy

**Privacy Policy URL**

https://makespringwarmer.github.io/cpbl-recent-form-extension/privacy.html

## Distribution

**Visibility**: Public

**Regions**: All regions

## Developer Info

**Publisher Name**: MakeSpringWarmer

**Contact Email**: averyhuang88@gmail.com

**Support URL**: https://github.com/MakeSpringWarmer/cpbl-recent-form-extension/issues

**Homepage URL**: https://github.com/MakeSpringWarmer/cpbl-recent-form-extension

## Version History

| Version | Date | Changes | Status |
|---------|------|---------|--------|
| 0.2.0 | 2026-07-20 | Added custom date-range statistics, clearer season-relative status trend charts, and more resilient CPBL data loading with retry and cached fallback. | Draft |
| 0.1.0 | 2026-07-16 | Initial release with player and team comparisons, season trends, pitcher calendar, and selectable recent-game statistics. | Published |

## Review Notes

### Known Issues / Limitations

- Only supported CPBL official player and daily-record pages are modified.
- Display depends on the current structure and availability of CPBL public data.

### Rejection History

None.
