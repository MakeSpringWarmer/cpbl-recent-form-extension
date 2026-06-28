# Domain Glossary

## Recent Form

依指定場數整理出的近期棒球表現，包含日期區間、統計指標、摘要與逐場資料。

## Player Form

球員的 Recent Form。打者使用 AVG、OBP、SLG、OPS；投手使用 ERA、WHIP、局數、用球數與登板日期。整季趨勢依 Game Count 計算移動平均，打者追蹤 AVG、OPS，投手追蹤 ERA、WHIP，並與本季平均並列。

## Team Form

球隊逐日戰績的 Recent Form，包含近期與本季比較、逐場資料點、移動勝率、攻守走勢、連勝敗與近期賽果。

## Player Source

從 CPBL 球員頁與官方逐場資料取得並正規化的球員比賽資料。CPBL 原始欄位名稱只存在於此 adapter。

## Team Source

從 CPBL 逐日戰績表格取得並正規化的球隊比賽資料。表格 selector 與欄位位置只存在於此 adapter。

## Game Count

使用者選擇的 Recent Form 場數。Player Form 與 Team Form 各自保存選擇。

## Comparison Baseline

Player Form 預設使用「近況」，不套用比較基準；使用者也可選「比較本季」或「比較生涯」。效能指標標示較佳或較差；投球工作量只標示較多或較少。
