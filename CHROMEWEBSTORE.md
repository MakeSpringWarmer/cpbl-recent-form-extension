# Chrome Web Store Listing - CPBL Recent Form Visualizer

> Last Updated: 2026-06-28

## Store Listing

**Extension Name**

CPBL Recent Form Visualizer

**Short Description**

在 CPBL 官網球員頁與球隊逐日戰績頁，直接顯示近期表現、投手登板月曆與球隊近況。

**Detailed Description**

瀏覽 CPBL 官網時，直接在原有頁面查看球員與球隊的近期表現。

打者顯示 AVG、OBP、SLG 與 OPS；投手顯示 ERA、WHIP、每場局數、平均用球與登板月曆。每項近期指標都會以中央基準差異刻度呈現相對本季或生涯較佳、較差、較多或較少。球隊逐日戰績頁顯示近期勝敗、得失分、場均得失分與賽果走勢，近期場數可直接在面板上調整。

安裝後開啟支援的 CPBL 球員頁或球隊逐日戰績頁，近期表現面板會自動出現在官方內容上方。

資料只來自 CPBL 官網公開數據。擴充功能沒有廣告、分析追蹤、登入系統或遠端後端。

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
| Store Icon | 128x128 PNG | Not created | |
| Screenshot 1 | 1280x800 or 640x400 | Needs update | Player benchmark comparisons |
| Screenshot 2 | 1280x800 or 640x400 | Needs update | Pitcher calendar |
| Screenshot 3 | 1280x800 or 640x400 | Needs update | Team Form |
| Small Promo Tile | 440x280 | Not created | |

### Screenshot Notes

截圖需分別呈現球員相對本季／生涯的中央基準差異刻度、投手登板月曆與球隊近期賽果，並包含頁面內的場數控制。

## Permissions Justification

| Permission | Type | Justification |
|------------|------|---------------|
| `storage` | permissions | 保存球員與球隊的近期場數選擇，並在本機快取 CPBL 公開數據以減少重複請求。 |
| `https://cpbl.com.tw/*` | host_permissions | 在 CPBL 官網支援頁面顯示近期表現，並讀取同網站的官方公開比賽數據。 |
| `https://www.cpbl.com.tw/*` | host_permissions | 支援使用 `www` 網域開啟的 CPBL 官網頁面與同源公開數據。 |

## Privacy & Data Use

### Data Collection

**Does the extension collect user data?** No. The developer does not receive user data.

近期場數偏好使用 Chrome Sync storage；啟用 Chrome Sync 時，Chrome 可能透過使用者的 Google 帳戶同步該偏好。公開 CPBL 數據只在本機快取，且不傳送至開發者或第三方。

### Data Use Certification

- [x] Data is NOT sold to third parties
- [x] Data is NOT used for purposes unrelated to the extension's core functionality
- [x] Data is NOT used for creditworthiness or lending purposes

## Privacy Policy

**Privacy Policy URL**

TODO: publish `PRIVACY.md` at a publicly accessible URL before submission.

## Distribution

**Visibility**: Public

**Regions**: All regions

## Developer Info

**Publisher Name**: MakeSpringWarmer

**Contact Email**: TODO before submission

**Support URL**: https://github.com/MakeSpringWarmer/cpbl-recent-form-extension/issues

**Homepage URL**: https://github.com/MakeSpringWarmer/cpbl-recent-form-extension

## Version History

| Version | Date | Changes | Status |
|---------|------|---------|--------|
| 0.1.0 | 2026-06-28 | Initial release with centered benchmark comparisons against season and career performance. | Draft |

## Review Notes

### Known Issues / Limitations

- Only supported CPBL official player and daily-record pages are modified.
- Display depends on the current structure and availability of CPBL public data.
- Store icon, current screenshots, contact email, and public privacy-policy URL remain required before submission.

### Rejection History

None.
