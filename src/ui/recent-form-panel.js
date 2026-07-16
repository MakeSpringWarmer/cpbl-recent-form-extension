(function exposeRecentFormPanel(root, factory) {
  const recentFormPanel = factory();
  root.CPBLRFV = root.CPBLRFV || {};
  root.CPBLRFV.RecentFormPanel = recentFormPanel;
  if (typeof module === "object" && module.exports) module.exports = recentFormPanel;
})(typeof globalThis !== "undefined" ? globalThis : this, function createRecentFormPanel() {
  const PANEL_ID = "cpbl-rfv-panel";

  function mount({ document, mode, countOptions, onCountChange, onDateRangeChange, onBaselineChange }) {
    if (document.getElementById(PANEL_ID)) return null;
    const mountPoint = findMountPoint(document, mode);
    if (!mountPoint) return null;

    const panel = document.createElement("section");
    panel.id = PANEL_ID;
    panel.className = "cpbl-rfv-panel";
    panel.setAttribute("aria-live", "polite");
    mountPoint.element.insertAdjacentElement(mountPoint.position, panel);

    return {
      update(state) {
        if (!state || state.status === "loading") {
          renderMessage(panel, mode, mode === "team" ? "正在讀取球隊近況..." : "正在讀取近期表現...");
          return;
        }
        if (state.status === "error") {
          renderMessage(panel, mode, state.message || "暫時無法讀取 CPBL 數據。", true);
          return;
        }
        if (state.status === "ready") {
          renderReady(panel, state.data, countOptions, onCountChange, onDateRangeChange, onBaselineChange);
          return;
        }
        throw new TypeError(`unknown panel status: ${state.status}`);
      }
    };
  }

  function findMountPoint(document, mode) {
    if (mode === "team") {
      const playerHeader = document.querySelector(".PlayerHeader");
      if (playerHeader) return { element: playerHeader, position: "afterend" };
    }

    const contentHeader = document.querySelector(".ContHeader");
    if (contentHeader) return { element: contentHeader, position: "afterend" };
    const tableTitle = document.querySelector("#bindVue .DistTitle");
    if (tableTitle) return { element: tableTitle, position: "beforebegin" };
    const tableWrap = document.querySelector(".RecordTableWrap");
    if (tableWrap) return { element: tableWrap, position: "beforebegin" };
    const bindVue = document.querySelector("#bindVue");
    return bindVue ? { element: bindVue, position: "afterbegin" } : null;
  }

  function renderMessage(panel, mode, text, isError = false) {
    const document = panel.ownerDocument;
    panel.innerHTML = "";
    const header = document.createElement("div");
    header.className = "cpbl-rfv-header";
    header.innerHTML = `
      <div>
        <div class="cpbl-rfv-eyebrow">${mode === "team" ? "CPBL Team Form" : "CPBL Player Form"}</div>
        <div class="cpbl-rfv-title">${mode === "team" ? "球隊近況" : "球員表現"}</div>
      </div>
      <div class="cpbl-rfv-subtitle">資料來源：CPBL 官網</div>
    `;
    const message = document.createElement("div");
    message.className = `cpbl-rfv-message${isError ? " cpbl-rfv-error" : ""}`;
    message.textContent = text;
    panel.append(header, message);
  }

  function renderReady(panel, data, countOptions, onCountChange, onDateRangeChange, onBaselineChange) {
    const document = panel.ownerDocument;
    panel.innerHTML = "";
    const header = renderHeader(document, data);
    panel.appendChild(header);
    if (data.kind === "team") {
      const scopeBar = renderTeamScopeBar(document, data, countOptions);
      panel.appendChild(scopeBar);
      attachScopeControl(scopeBar, data, onDateRangeChange);
      attachCountControl(scopeBar, onCountChange);
    } else {
      const scopeBar = renderScopeBar(document, data, countOptions);
      panel.appendChild(scopeBar);
      attachScopeControl(scopeBar, data, onDateRangeChange);
      attachCountControl(scopeBar, onCountChange);
      attachBaselineControl(scopeBar, onBaselineChange);
    }

    if (!data.hasData) {
      const message = document.createElement("div");
      message.className = "cpbl-rfv-message";
      message.textContent = data.emptyMessage || (data.kind === "team"
        ? "目前沒有可計算的近期比賽。"
        : "近期沒有可計算的出賽資料。可以直接調整上方場數再查看。");
      panel.appendChild(message);
      return;
    }

    panel.appendChild(renderSummary(document, data));
    panel.appendChild(renderMetrics(document, data.metrics, data));
    if (data.kind === "team") renderTeamDetails(panel, data);
    else {
      renderPlayerTrends(panel, data);
      if (data.showDetails) renderPlayerDetails(panel, data);
    }
  }

  function renderHeader(document, data) {
    const header = document.createElement("div");
    header.className = "cpbl-rfv-header";
    const isTeam = data.kind === "team";
    header.innerHTML = `
      <div>
        <div class="cpbl-rfv-eyebrow">${isTeam ? "CPBL Team Form" : "CPBL Player Form"}</div>
        <div class="cpbl-rfv-title">${isTeam ? `${escapeHtml(data.teamName)} ${escapeHtml(displayScopeLabel(data))}` : escapeHtml(data.title)}</div>
      </div>
      <div class="cpbl-rfv-toolbar">
        <div class="cpbl-rfv-meta">
          ${isTeam
            ? `<span>${escapeHtml(data.dateRange)}</span><span>逐日戰績</span>`
            : `<span>${escapeHtml(data.playerTypeLabel)}</span><span>一軍例行賽</span>`}
        </div>
      </div>
    `;
    return header;
  }

  function renderScopeBar(document, data, countOptions) {
    const scopeBar = document.createElement("div");
    scopeBar.className = "cpbl-rfv-scope-bar";
    scopeBar.innerHTML = `
      <div class="cpbl-rfv-baseline-control" role="group" aria-label="球員分析方式">
        <span class="cpbl-rfv-baseline-label">分析方式</span>
        <div class="cpbl-rfv-baseline-options">
          ${data.baselineOptions.map((baseline) => `
            <button
              type="button"
              class="cpbl-rfv-baseline-button${baseline.value === data.baseline ? " is-active" : ""}"
              data-baseline="${escapeHtml(baseline.value)}"
              aria-pressed="${baseline.value === data.baseline}"
              ${baseline.available ? "" : 'disabled title="生涯資料暫時無法取得"'}
            >${escapeHtml(baseline.label)}</button>
          `).join("")}
        </div>
      </div>
      <div class="cpbl-rfv-scope-actions">
        <div class="cpbl-rfv-range-stamp">${escapeHtml(data.dateRange)}</div>
        ${renderScopeControl(data, countOptions)}
      </div>
    `;
    return scopeBar;
  }

  function renderTeamScopeBar(document, data, countOptions) {
    const scopeBar = document.createElement("div");
    scopeBar.className = "cpbl-rfv-scope-bar is-team";
    scopeBar.innerHTML = `
      <div class="cpbl-rfv-range-stamp">${escapeHtml(data.dateRange)}</div>
      <div class="cpbl-rfv-scope-actions">${renderScopeControl(data, countOptions)}</div>
    `;
    return scopeBar;
  }

  function renderSummary(document, data) {
    const summary = document.createElement("div");
    summary.className = "cpbl-rfv-summary";
    summary.innerHTML = `
      <div class="cpbl-rfv-summary-label">${data.kind === "team" ? "球隊摘要" : "近況摘要"}</div>
      <div class="cpbl-rfv-summary-content">
        ${data.comparisonSummary ? `<div class="cpbl-rfv-summary-insight">${escapeHtml(data.comparisonSummary)}</div>` : ""}
        <div class="cpbl-rfv-summary-text">${escapeHtml(data.summary)}</div>
      </div>
    `;
    return summary;
  }

  function renderMetrics(document, metrics, data) {
    const body = document.createElement("div");
    body.className = "cpbl-rfv-body";
    const grid = document.createElement("div");
    grid.className = `cpbl-rfv-grid${data.kind === "player" ? " is-player-comparison" : ""}`;
    metrics.forEach((metric) => grid.appendChild(renderMetricCard(document, metric, data)));
    body.appendChild(grid);
    return body;
  }

  function renderMetricCard(document, metric, data) {
    const card = document.createElement("div");
    const comparison = metric.comparison || null;
    card.className = `cpbl-rfv-card${comparison ? ` is-${escapeHtml(comparison.tone)}` : ""}`;
    card.innerHTML = comparison
      ? renderBenchmarkCard(metric, comparison, displayScopeLabel(data))
      : `
        <div class="cpbl-rfv-label">${escapeHtml(metric.label)}</div>
        <div class="cpbl-rfv-value">${escapeHtml(metric.value)}</div>
        <div class="cpbl-rfv-note">${escapeHtml(metric.note)}</div>
      `;
    return card;
  }

  function renderBenchmarkCard(metric, comparison, scopeLabel) {
    const position = Math.min(90, Math.max(10, Number(comparison.position) || 50));
    const deltaStart = Math.min(position, 50);
    const deltaWidth = Math.abs(position - 50);
    const direction = comparisonDirection(comparison, position);
    const description = `${metric.label}，${comparison.baselineText}，${scopeLabel} ${metric.value}，${comparison.label}`;
    return `
      <div class="cpbl-rfv-card-heading">
        <div class="cpbl-rfv-label">${escapeHtml(metric.label)}</div>
        <div class="cpbl-rfv-compare-status"><span aria-hidden="true">${direction}</span>${escapeHtml(comparison.label)}</div>
      </div>
      <div class="cpbl-rfv-current-value">
        <span>${escapeHtml(scopeLabel)}</span>
        <strong>${escapeHtml(metric.value)}</strong>
      </div>
      <div
        class="cpbl-rfv-benchmark"
        style="--rfv-marker-x: ${position}%; --rfv-delta-start: ${deltaStart}%; --rfv-delta-width: ${deltaWidth}%"
        role="img"
        aria-label="${escapeHtml(description)}"
      >
        <div class="cpbl-rfv-benchmark-track" aria-hidden="true">
          <span class="cpbl-rfv-benchmark-delta"></span>
          <span class="cpbl-rfv-benchmark-baseline"></span>
          <span class="cpbl-rfv-benchmark-marker"></span>
        </div>
        <div class="cpbl-rfv-benchmark-labels" aria-hidden="true">
          <span>${escapeHtml(comparison.lowLabel)}</span>
          <span class="cpbl-rfv-benchmark-reference">${escapeHtml(comparison.baselineLabel)} <strong>${escapeHtml(comparison.baselineValue)}</strong></span>
          <span>${escapeHtml(comparison.highLabel)}</span>
        </div>
      </div>
      <div class="cpbl-rfv-note">${escapeHtml(metric.note)}</div>
    `;
  }

  function comparisonDirection(comparison, position) {
    if (comparison.tone === "unavailable") return "·";
    if (comparison.tone === "even") return "=";
    if (comparison.tone === "positive") return "↑";
    if (comparison.tone === "negative") return "↓";
    if (position > 50) return "↑";
    if (position < 50) return "↓";
    return "→";
  }

  function renderTeamDetails(panel, data) {
    const document = panel.ownerDocument;
    renderTeamTrends(panel, data.trends);

    const stripHeader = document.createElement("div");
    stripHeader.className = "cpbl-rfv-strip-header";
    stripHeader.innerHTML = '<div class="cpbl-rfv-strip-title">近期走勢</div><div class="cpbl-rfv-strip-meta">左舊右新</div>';
    panel.appendChild(stripHeader);

    const strip = document.createElement("div");
    strip.className = "cpbl-rfv-team-strip";
    strip.innerHTML = data.games.slice().reverse().map(renderTeamGameChip).join("");
    panel.appendChild(strip);

    const details = createDetails(document, `${displayScopeLabel(data)}明細`, data.dateRange);
    const games = document.createElement("div");
    games.className = "cpbl-rfv-games";
    games.innerHTML = renderTeamGameTable(data.games);
    details.appendChild(games);
    panel.appendChild(details);
  }

  function renderTeamTrends(panel, trends) {
    if (!trends || trends.points.length < 2) return;
    const document = panel.ownerDocument;
    const latest = trends.points[trends.points.length - 1];
    const winFormMaximum = formChartMaximum(trends.points.map((point) => point.winForm));
    const runValues = trends.points.map((point) => point.runDifferentialPerGame)
      .concat([trends.season.runDifferentialPerGame])
      .filter(Number.isFinite);
    const runMaximum = Math.max(2, Math.ceil(Math.max(...runValues.map(Math.abs)) + 0.5));
    const winStatus = trendStatus(latest.winForm);
    const runStatus = trendStatus(latest.runDifferentialPerGame, { threshold: 0.25, unit: "runs" });
    const section = document.createElement("section");
    section.className = "cpbl-rfv-trends";
    section.innerHTML = `
      <div class="cpbl-rfv-trends-heading">
        <div>
          <div class="cpbl-rfv-trends-title">整季走勢</div>
          <div class="cpbl-rfv-trends-caption">折線為近 ${escapeHtml(trends.windowSize)} 場移動平均；圖表上方一律代表狀態較佳</div>
        </div>
        <div class="cpbl-rfv-trends-meta">本季 ${escapeHtml(trends.seasonGameCount)} 場</div>
      </div>
      <div class="cpbl-rfv-trend-grid">
        <figure class="cpbl-rfv-trend-card">
          <figcaption>
            <div class="cpbl-rfv-trend-title-group">
              <strong>勝率狀態</strong>
              <span class="cpbl-rfv-trend-status is-${winStatus.tone}">${escapeHtml(winStatus.label)}</span>
            </div>
            <div class="cpbl-rfv-trend-legend">
              <span class="cpbl-rfv-trend-key is-form">最新 ${escapeHtml(formatTrendRate(latest.winPercentage))}</span>
              <span class="cpbl-rfv-trend-key is-season">本季 ${escapeHtml(formatTrendRate(trends.season.winPercentage))}</span>
            </div>
          </figcaption>
          ${renderTrendSvg({
            points: trends.points,
            observations: [],
            seasonGameCount: trends.seasonGameCount,
            recentStartGame: trends.recentStartGame,
            recentEndGame: trends.recentEndGame,
            minimum: -winFormMaximum,
            maximum: winFormMaximum,
            label: `近 ${trends.windowSize} 場勝率狀態，${winStatus.label}，最新 ${formatTrendRate(latest.winPercentage)}，本季 ${formatTrendRate(trends.season.winPercentage)}`,
            performanceBand: 0.05,
            guideLabels: ["較佳", "本季", "較差"],
            series: [{
              className: "is-form",
              value: (point) => point.winForm,
              title: (point) => `${point.date} vs ${point.opponent || "-"}；近 ${trends.windowSize} 場勝率 ${formatTrendRate(point.winPercentage)}，${trendStatus(point.winForm).label}`
            }],
            observationSeries: []
          })}
          ${renderTrendAxis(trends.seasonGameCount)}
        </figure>
        <figure class="cpbl-rfv-trend-card">
          <figcaption>
            <div class="cpbl-rfv-trend-title-group">
              <strong>得失分差</strong>
              <span class="cpbl-rfv-trend-status is-${runStatus.tone}">${escapeHtml(runStatus.label)}</span>
            </div>
            <div class="cpbl-rfv-trend-legend">
              <span class="cpbl-rfv-trend-key is-form">最新 ${escapeHtml(formatSignedTrendDecimal(latest.runDifferentialPerGame))}</span>
              <span class="cpbl-rfv-trend-key is-season">本季 ${escapeHtml(formatSignedTrendDecimal(trends.season.runDifferentialPerGame))}</span>
            </div>
          </figcaption>
          ${renderTrendSvg({
            points: trends.points,
            observations: [],
            seasonGameCount: trends.seasonGameCount,
            recentStartGame: trends.recentStartGame,
            recentEndGame: trends.recentEndGame,
            minimum: -runMaximum,
            maximum: runMaximum,
            baseline: trends.season.runDifferentialPerGame,
            label: `近 ${trends.windowSize} 場場均得失分差 ${formatSignedTrendDecimal(latest.runDifferentialPerGame)}，本季 ${formatSignedTrendDecimal(trends.season.runDifferentialPerGame)}`,
            performanceBand: 0.25,
            guideLabels: ["正分差", "0", "負分差"],
            series: [{
              className: "is-form",
              value: (point) => point.runDifferentialPerGame,
              title: (point) => `${point.date} vs ${point.opponent || "-"}；近 ${trends.windowSize} 場場均得失分差 ${formatSignedTrendDecimal(point.runDifferentialPerGame)}`
            }],
            observationSeries: []
          })}
          ${renderTrendAxis(trends.seasonGameCount)}
        </figure>
      </div>
    `;
    panel.appendChild(section);
  }

  function renderPlayerTrends(panel, data) {
    const trends = data.trends;
    if (!trends || trends.points.length < 2) return;
    const document = panel.ownerDocument;
    const timeline = Array.isArray(trends.timeline) ? trends.timeline : trends.points;
    const definitions = trends.playerType === "pitcher"
      ? [
        { title: "ERA 狀態", key: "era", formKey: "eraForm", format: formatTrendPitching },
        { title: "WHIP 狀態", key: "whip", formKey: "whipForm", format: formatTrendPitching }
      ]
      : [
        { title: "打擊率狀態", key: "avg", formKey: "avgForm", format: formatTrendRate },
        { title: "OPS 狀態", key: "ops", formKey: "opsForm", format: formatTrendRate }
      ];
    const recentEndGame = Number.isFinite(trends.recentEndGame)
      ? trends.recentEndGame
      : trends.seasonGameCount;
    const recentTimeline = timeline.slice(
      Math.max(0, trends.recentStartGame - 1),
      Math.max(0, recentEndGame)
    );
    const recentDateRange = formatCompactDateRange(recentTimeline);
    const hasLongGap = findTrendGaps(timeline).length > 0;
    const section = document.createElement("section");
    section.className = "cpbl-rfv-trends";
    section.innerHTML = `
      <div class="cpbl-rfv-trends-heading">
        <div>
          <div class="cpbl-rfv-trends-title">整季走勢</div>
          <div class="cpbl-rfv-trends-caption">上方代表優於本季，下方代表低於本季；折線為近 ${escapeHtml(trends.windowSize)} 場移動平均${hasLongGap ? "，圖中標記 14 天以上間隔" : ""}</div>
        </div>
        <div class="cpbl-rfv-trends-meta">${trends.scopeMode === "date" ? "所選" : "近期"} ${escapeHtml(recentDateRange)} · 本季 ${escapeHtml(trends.seasonGameCount)} 場</div>
      </div>
      <div class="cpbl-rfv-trend-grid">
        ${definitions.map((definition, index) => renderPlayerTrendCard({ ...trends, timeline }, definition, index === 0)).join("")}
      </div>
    `;
    panel.appendChild(section);
  }

  function renderPlayerTrendCard(trends, definition, showGapMarkers) {
    const latest = trends.points[trends.points.length - 1];
    const maximum = formChartMaximum(trends.points.map((point) => point[definition.formKey]));
    const currentValue = definition.format(latest[definition.key]);
    const seasonValue = definition.format(trends.season[definition.key]);
    const latestStatus = trendStatus(latest[definition.formKey]);
    return `
      <figure class="cpbl-rfv-trend-card">
        <figcaption>
          <div class="cpbl-rfv-trend-title-group">
            <strong>${escapeHtml(definition.title)}</strong>
            <span class="cpbl-rfv-trend-status is-${latestStatus.tone}">${escapeHtml(latestStatus.label)}</span>
          </div>
          <div class="cpbl-rfv-trend-legend">
            <span class="cpbl-rfv-trend-key is-form">最新 ${escapeHtml(currentValue)}</span>
            <span class="cpbl-rfv-trend-key is-season">本季 ${escapeHtml(seasonValue)}</span>
          </div>
        </figcaption>
        ${renderTrendSvg({
          points: trends.points,
          observations: [],
          observationSeries: [],
          seasonGameCount: trends.seasonGameCount,
          recentStartGame: trends.recentStartGame,
          recentEndGame: trends.recentEndGame,
          minimum: -maximum,
          maximum,
          label: `近 ${trends.windowSize} 場${definition.title}，${latestStatus.label}，最新 ${currentValue}，本季 ${seasonValue}`,
          performanceBand: 0.05,
          guideLabels: ["較佳", "本季", "較差"],
          gapTimeline: showGapMarkers ? trends.timeline : [],
          series: [{
            className: "is-form",
            value: (point) => point[definition.formKey],
            title: (point) => `${formatCompactDate(point.date)} vs ${point.opponent || "-"}；${formatCompactDateRange([point.windowStartDate, point.windowEndDate])} 近 ${trends.windowSize} 場${definition.title.replace("狀態", "").trim()} ${definition.format(point[definition.key])}，${trendStatus(point[definition.formKey]).label}`
          }]
        })}
        ${renderTrendTimeAxis(trends.timeline, trends.seasonGameCount)}
      </figure>
    `;
  }

  function renderTrendSvg({
    points,
    observations,
    seasonGameCount,
    recentStartGame,
    recentEndGame = seasonGameCount,
    minimum,
    maximum,
    baseline,
    label,
    series,
    observationSeries,
    gapTimeline = [],
    performanceBand = null,
    guideLabels = []
  }) {
    const width = 600;
    const height = 132;
    const inset = { top: 10, right: 10, bottom: 10, left: 10 };
    const plotWidth = width - inset.left - inset.right;
    const plotHeight = height - inset.top - inset.bottom;
    const x = (gameNumber) => inset.left + ((gameNumber - 1) / Math.max(1, seasonGameCount - 1)) * plotWidth;
    const y = (value) => {
      const clampedValue = Math.min(maximum, Math.max(minimum, value));
      return inset.top + ((maximum - clampedValue) / Math.max(0.0001, maximum - minimum)) * plotHeight;
    };
    const highlightStart = recentStartGame <= 1 ? inset.left : (x(recentStartGame - 1) + x(recentStartGame)) / 2;
    const highlightEnd = recentEndGame >= seasonGameCount
      ? inset.left + plotWidth
      : (x(recentEndGame) + x(recentEndGame + 1)) / 2;
    const highlightWidth = Math.max(0, highlightEnd - highlightStart);
    const gridLines = [0, 0.5, 1]
      .map((ratio) => `<line class="cpbl-rfv-trend-gridline" x1="${inset.left}" y1="${inset.top + ratio * plotHeight}" x2="${inset.left + plotWidth}" y2="${inset.top + ratio * plotHeight}"></line>`)
      .join("");
    const performanceZones = Number.isFinite(performanceBand)
      ? renderPerformanceZones(y, inset, plotWidth, plotHeight, performanceBand)
      : "";
    const centerLine = minimum < 0 && maximum > 0
      ? `<line class="cpbl-rfv-trend-centerline" x1="${inset.left}" y1="${y(0)}" x2="${inset.left + plotWidth}" y2="${y(0)}"></line>`
      : "";
    const baselineLine = Number.isFinite(baseline)
      ? `<line class="cpbl-rfv-trend-baseline" x1="${inset.left}" y1="${y(baseline)}" x2="${inset.left + plotWidth}" y2="${y(baseline)}"></line>`
      : "";
    const guides = guideLabels.length === 3
      ? `
        <text class="cpbl-rfv-trend-guide is-better" x="${inset.left + 5}" y="${inset.top + 12}">${escapeHtml(guideLabels[0])}</text>
        <text class="cpbl-rfv-trend-guide is-baseline" x="${inset.left + 5}" y="${y(0) - 5}">${escapeHtml(guideLabels[1])}</text>
        <text class="cpbl-rfv-trend-guide is-worse" x="${inset.left + 5}" y="${inset.top + plotHeight - 5}">${escapeHtml(guideLabels[2])}</text>
      `
      : "";
    const observationPoints = renderObservationPoints(observations, observationSeries, x, y, minimum, maximum);
    const gapMarkers = renderTrendGapMarkers(gapTimeline, x, inset, plotHeight);
    const paths = series.map((item) => {
      const path = chartPath(points, item.value, x, y);
      const latestValue = item.value(points[points.length - 1]);
      const latestGameNumber = points[points.length - 1].gameNumber;
      const hitPoints = item.title ? renderTrendHitPoints(points, item, x, y) : "";
      return `
        <path class="cpbl-rfv-trend-line ${escapeHtml(item.className)}" d="${path}"></path>
        ${Number.isFinite(latestValue) ? `<circle class="cpbl-rfv-trend-point ${escapeHtml(item.className)}" cx="${x(latestGameNumber)}" cy="${y(latestValue)}" r="4"></circle>` : ""}
        ${hitPoints}
      `;
    }).join("");
    return `
      <svg class="cpbl-rfv-trend-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeHtml(label)}">
        ${performanceZones}
        <rect class="cpbl-rfv-trend-highlight" x="${highlightStart}" y="${inset.top}" width="${highlightWidth}" height="${plotHeight}"></rect>
        ${gridLines}${centerLine}${baselineLine}${guides}${gapMarkers}${observationPoints}${paths}
      </svg>
    `;
  }

  function renderPerformanceZones(y, inset, plotWidth, plotHeight, band) {
    const betterEnd = y(band);
    const worseStart = y(-band);
    return `
      <rect class="cpbl-rfv-trend-zone is-better" x="${inset.left}" y="${inset.top}" width="${plotWidth}" height="${Math.max(0, betterEnd - inset.top)}"></rect>
      <rect class="cpbl-rfv-trend-zone is-steady" x="${inset.left}" y="${betterEnd}" width="${plotWidth}" height="${Math.max(0, worseStart - betterEnd)}"></rect>
      <rect class="cpbl-rfv-trend-zone is-worse" x="${inset.left}" y="${worseStart}" width="${plotWidth}" height="${Math.max(0, inset.top + plotHeight - worseStart)}"></rect>
    `;
  }

  function renderTrendHitPoints(points, series, x, y) {
    return points.map((point, index) => {
      const value = series.value(point);
      if (!Number.isFinite(value)) return "";
      const title = series.title(point);
      return `
        <g class="cpbl-rfv-trend-hit" tabindex="${index === points.length - 1 ? "0" : "-1"}" role="img" aria-label="${escapeHtml(title)}">
          <title>${escapeHtml(title)}</title>
          <circle class="cpbl-rfv-trend-hit-target" cx="${x(point.gameNumber)}" cy="${y(value)}" r="10"></circle>
          <circle class="cpbl-rfv-trend-hit-focus" cx="${x(point.gameNumber)}" cy="${y(value)}" r="3"></circle>
        </g>
      `;
    }).join("");
  }

  function renderTrendGapMarkers(timeline, x, inset, plotHeight) {
    return findTrendGaps(timeline).map((gap) => {
      const markerX = (x(gap.previous.gameNumber) + x(gap.current.gameNumber)) / 2;
      return `
        <g class="cpbl-rfv-trend-gap" aria-label="${escapeHtml(`${formatCompactDate(gap.previous.date)} 至 ${formatCompactDate(gap.current.date)}，相隔 ${gap.days} 天`)}">
          <line x1="${markerX}" y1="${inset.top}" x2="${markerX}" y2="${inset.top + plotHeight}"></line>
          <text x="${markerX}" y="${inset.top + 11}">相隔 ${gap.days} 天</text>
        </g>
      `;
    }).join("");
  }

  function findTrendGaps(timeline = []) {
    const gaps = [];
    for (let index = 1; index < timeline.length; index += 1) {
      const previous = timeline[index - 1];
      const current = timeline[index];
      const days = calendarDaysBetween(previous.date, current.date);
      if (days >= 14) gaps.push({ previous, current, days });
    }
    return gaps.sort((a, b) => b.days - a.days).slice(0, 2)
      .sort((a, b) => a.current.gameNumber - b.current.gameNumber);
  }

  function renderObservationPoints(observations, series, x, y, minimum, maximum) {
    return observations.flatMap((game) => series.map((item) => {
      const value = item.value(game);
      if (!Number.isFinite(value)) return "";
      const className = typeof item.className === "function" ? item.className(game) : item.className;
      const shape = typeof item.shape === "function" ? item.shape(game) : item.shape;
      const clippedClass = value < minimum || value > maximum ? " is-clipped" : "";
      const classes = `cpbl-rfv-trend-observation ${escapeHtml(className)}${game.isRecent ? " is-recent" : ""}${clippedClass}`;
      const pointX = x(game.gameNumber);
      const pointY = y(value);
      const title = `<title>${escapeHtml(item.title(game))}</title>`;
      if (shape === "square") {
        return `<rect class="${classes}" x="${pointX - 3}" y="${pointY - 3}" width="6" height="6">${title}</rect>`;
      }
      if (shape === "diamond") {
        return `<rect class="${classes}" x="${pointX - 3}" y="${pointY - 3}" width="6" height="6" transform="rotate(45 ${pointX} ${pointY})">${title}</rect>`;
      }
      return `<circle class="${classes}" cx="${pointX}" cy="${pointY}" r="3">${title}</circle>`;
    })).join("");
  }

  function chartPath(points, valueOf, x, y) {
    let drawing = false;
    return points.map((point) => {
      const value = valueOf(point);
      if (!Number.isFinite(value)) {
        drawing = false;
        return "";
      }
      const command = drawing ? "L" : "M";
      drawing = true;
      return `${command}${x(point.gameNumber).toFixed(2)},${y(value).toFixed(2)}`;
    }).filter(Boolean).join(" ");
  }

  function renderTrendAxis(seasonGameCount) {
    return `<div class="cpbl-rfv-trend-axis"><span>第 1 場</span><span>第 ${escapeHtml(seasonGameCount)} 場</span></div>`;
  }

  function renderTrendTimeAxis(timeline, seasonGameCount) {
    if (!timeline.length) return renderTrendAxis(seasonGameCount);
    let ticks = timeline.filter((item, index) => {
      if (index === 0) return true;
      return monthKey(item.date) !== monthKey(timeline[index - 1].date);
    });
    while (ticks.length > 6) {
      ticks = ticks.filter((_tick, index) => index === 0 || index === ticks.length - 1 || index % 2 === 0);
    }
    return `
      <div class="cpbl-rfv-trend-time-axis" aria-label="時間軸，依出賽場次等距">
        ${ticks.map((tick) => {
          const position = ((tick.gameNumber - 1) / Math.max(1, seasonGameCount - 1)) * 100;
          const edgeClass = position <= 0 ? " is-start" : position >= 100 ? " is-end" : "";
          return `<span class="cpbl-rfv-trend-time-tick${edgeClass}" style="--rfv-time-x: ${position}%">${escapeHtml(formatMonth(tick.date))}</span>`;
        }).join("")}
      </div>
    `;
  }

  function formatCompactDateRange(values) {
    const dates = values.map((value) => parseChartDate(typeof value === "string" ? value : value.date)).filter(Boolean);
    if (!dates.length) return "日期未知";
    const oldest = new Date(Math.min(...dates));
    const newest = new Date(Math.max(...dates));
    return oldest.getTime() === newest.getTime()
      ? formatCompactDate(oldest)
      : `${formatCompactDate(oldest)}–${formatCompactDate(newest)}`;
  }

  function formatCompactDate(value) {
    const date = parseChartDate(value);
    return date ? `${date.getMonth() + 1}/${date.getDate()}` : "日期未知";
  }

  function formatMonth(value) {
    const date = parseChartDate(value);
    return date ? `${date.getMonth() + 1}月` : "";
  }

  function monthKey(value) {
    const date = parseChartDate(value);
    return date ? `${date.getFullYear()}-${date.getMonth()}` : "";
  }

  function calendarDaysBetween(startValue, endValue) {
    const start = parseChartDate(startValue);
    const end = parseChartDate(endValue);
    return start && end ? Math.max(0, Math.round((end - start) / 86400000)) : 0;
  }

  function parseChartDate(value) {
    if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
    const match = String(value || "").match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
    if (!match) return null;
    const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function formatTrendRate(value) {
    return Number.isFinite(value) ? value.toFixed(3).replace(/^0/, "") : "-";
  }

  function formatTrendDecimal(value) {
    return Number.isFinite(value) ? value.toFixed(1) : "-";
  }

  function formatSignedTrendDecimal(value) {
    if (!Number.isFinite(value)) return "-";
    const formatted = value.toFixed(1);
    return value > 0 ? `+${formatted}` : formatted;
  }

  function formatTrendPitching(value) {
    return Number.isFinite(value) ? value.toFixed(2) : "-";
  }

  function formChartMaximum(values) {
    const finiteValues = values.filter(Number.isFinite).map(Math.abs);
    const observedMaximum = finiteValues.length ? Math.max(...finiteValues) : 0;
    return Math.min(1, Math.max(0.25, Math.ceil(observedMaximum * 10) / 10));
  }

  function trendStatus(value, options = {}) {
    const threshold = Number.isFinite(options.threshold) ? options.threshold : 0.05;
    if (!Number.isFinite(value)) return { tone: "unavailable", label: "資料不足" };
    if (options.unit === "runs") {
      if (Math.abs(value) < threshold) return { tone: "even", label: "攻守持平" };
      return value > 0
        ? { tone: "positive", label: `正分差 ${formatSignedTrendDecimal(value)}` }
        : { tone: "negative", label: `負分差 ${formatSignedTrendDecimal(value)}` };
    }
    if (Math.abs(value) < threshold) return { tone: "even", label: "接近本季" };
    const percent = `${Math.round(Math.abs(value) * 100)}%`;
    return value > 0
      ? { tone: "positive", label: `狀態佳 +${percent}` }
      : { tone: "negative", label: `狀態偏低 -${percent}` };
  }

  function renderPlayerDetails(panel, data) {
    const document = panel.ownerDocument;
    const details = createDetails(document, "逐場數據", `${data.games.length} 場 · ${data.dateRange}`);
    if (data.playerType === "pitcher") {
      const calendar = document.createElement("div");
      calendar.className = "cpbl-rfv-calendar";
      calendar.innerHTML = renderPitcherCalendar(data.games, data.todayKey);
      details.appendChild(calendar);
    }
    const games = document.createElement("div");
    games.className = "cpbl-rfv-games";
    games.innerHTML = data.playerType === "pitcher" ? renderPitcherTable(data.games) : renderBatterTable(data.games);
    details.appendChild(games);
    panel.appendChild(details);
  }

  function createDetails(document, title, meta) {
    const details = document.createElement("details");
    details.className = "cpbl-rfv-details";
    details.innerHTML = `
      <summary>
        <span class="cpbl-rfv-details-title">${escapeHtml(title)}</span>
        <span class="cpbl-rfv-details-meta">${escapeHtml(meta)}</span>
      </summary>
    `;
    return details;
  }

  function renderTeamGameChip(game) {
    return `
      <div class="cpbl-rfv-team-chip is-${escapeHtml(game.resultTone)}">
        <div class="cpbl-rfv-team-chip-result">${escapeHtml(game.result)}</div>
        <div class="cpbl-rfv-team-chip-score">${escapeHtml(`${game.runsFor}-${game.runsAgainst}`)}</div>
        <div class="cpbl-rfv-team-chip-date">${escapeHtml(shortDate(game.date))}</div>
        <div class="cpbl-rfv-team-chip-opponent">${escapeHtml(game.homeAway)} ${escapeHtml(game.opponent)}</div>
      </div>
    `;
  }

  function renderTeamGameTable(games) {
    const rows = games.map((game) => `
      <tr><td>${escapeHtml(formatDate(game.date))}</td><td>${escapeHtml(game.opponent)}</td><td>${escapeHtml(game.homeAway)}</td><td>${escapeHtml(game.result)}</td><td>${escapeHtml(`${game.runsFor}-${game.runsAgainst}`)}</td><td>${escapeHtml(game.field)}</td><td>${escapeHtml(game.duration)}</td></tr>
    `).join("");
    return `<table><thead><tr><th>日期</th><th>對戰</th><th>主客</th><th>結果</th><th>比分</th><th>球場</th><th>時間</th></tr></thead><tbody>${rows}</tbody></table>`;
  }

  function renderBatterTable(games) {
    const rows = games.map((game) => `
      <tr><td>${escapeHtml(formatDate(game.date))}</td><td>${escapeHtml(game.opponent)}</td><td>${numberValue(game.plateAppearances)}</td><td>${numberValue(game.atBats)}</td><td>${numberValue(game.hits)}</td><td>${numberValue(game.homeRuns)}</td><td>${numberValue(game.walks)}</td></tr>
    `).join("");
    return `<table><thead><tr><th>日期</th><th>對戰</th><th>PA</th><th>AB</th><th>H</th><th>HR</th><th>BB</th></tr></thead><tbody>${rows}</tbody></table>`;
  }

  function renderPitcherTable(games) {
    const rows = games.map((game) => `
      <tr><td>${escapeHtml(formatDate(game.date))}</td><td>${escapeHtml(game.opponent)}</td><td>${escapeHtml(game.restDaysLabel)}</td><td>${escapeHtml(game.innings)}</td><td>${numberValue(game.pitches)}</td><td>${numberValue(game.hitsAllowed)}</td><td>${numberValue(game.earnedRuns)}</td><td>${numberValue(game.walks)}</td></tr>
    `).join("");
    return `<table><thead><tr><th>日期</th><th>對戰</th><th>登板間隔</th><th>IP</th><th>用球</th><th>H</th><th>ER</th><th>BB</th></tr></thead><tbody>${rows}</tbody></table>`;
  }

  function renderPitcherCalendar(games, todayKey) {
    const months = buildCalendarMonths(games.slice().reverse(), todayKey);
    return `
      <div class="cpbl-rfv-calendar-header">
        <div><div class="cpbl-rfv-calendar-title">登板月曆</div><div class="cpbl-rfv-calendar-caption">空白日期代表未登板；有登板的日期會標示角色、對戰與用球數。</div></div>
        <div class="cpbl-rfv-calendar-legend"><span>低用球</span><span>中用球</span><span>高用球</span></div>
      </div>
      <div class="cpbl-rfv-calendar-months" aria-label="投手近期登板月曆">${months.map((month) => renderCalendarMonth(month, todayKey)).join("")}</div>
    `;
  }

  function buildCalendarMonths(games, todayKey) {
    if (games.length === 0) return [];
    const dates = games.map((game) => parseDate(game.date)).filter(Boolean);
    if (dates.length === 0) return [];
    const gamesByDate = new Map();
    games.forEach((game) => {
      if (!gamesByDate.has(game.date)) gamesByDate.set(game.date, []);
      gamesByDate.get(game.date).push(game);
    });
    const first = new Date(Math.min(...dates));
    const last = new Date(Math.max(...dates));
    const today = parseDate(todayKey);
    const shouldIncludeToday = today && today.getFullYear() === last.getFullYear() && today > last;
    const endBase = shouldIncludeToday ? today : last;
    const cursor = new Date(first.getFullYear(), first.getMonth(), 1);
    const end = new Date(endBase.getFullYear(), endBase.getMonth(), 1);
    const months = [];
    while (cursor <= end) {
      months.push({ year: cursor.getFullYear(), month: cursor.getMonth(), gamesByDate });
      cursor.setMonth(cursor.getMonth() + 1);
    }
    return months;
  }

  function renderCalendarMonth({ year, month, gamesByDate }, todayKey) {
    const weekdays = ["日", "一", "二", "三", "四", "五", "六"];
    const firstWeekday = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const padding = Array.from({ length: firstWeekday }, () => '<div class="cpbl-rfv-calendar-cell is-pad"></div>').join("");
    const days = Array.from({ length: totalDays }, (_, index) => {
      const day = index + 1;
      const key = `${year}/${pad(month + 1)}/${pad(day)}`;
      return renderCalendarDay(day, gamesByDate.get(key) || [], key, key === todayKey);
    }).join("");
    return `
      <div class="cpbl-rfv-calendar-month">
        <div class="cpbl-rfv-calendar-month-title">${year}/${pad(month + 1)}</div>
        <div class="cpbl-rfv-calendar-weekdays">${weekdays.map((weekday) => `<div>${weekday}</div>`).join("")}</div>
        <div class="cpbl-rfv-calendar-grid">${padding}${days}</div>
      </div>
    `;
  }

  function renderCalendarDay(day, games, key, isToday) {
    const todayClass = isToday ? " is-today" : "";
    const todayLabel = isToday ? '<span class="cpbl-rfv-calendar-today">今日</span>' : "";
    if (games.length === 0) {
      return `<div class="cpbl-rfv-calendar-cell${todayClass}"><span class="cpbl-rfv-calendar-day">${day}</span>${todayLabel}</div>`;
    }
    const game = games[0];
    const load = pitchLoad(game.pitches);
    const more = games.length > 1 ? ` +${games.length - 1}` : "";
    const title = `${key} ${game.role} vs ${game.opponent}，${game.pitches} 球`;
    return `
      <div class="cpbl-rfv-calendar-cell has-game is-load-${load}${todayClass}" title="${escapeHtml(title)}">
        <span class="cpbl-rfv-calendar-day">${day}</span>${todayLabel}
        <span class="cpbl-rfv-calendar-role">${escapeHtml(game.role)}${escapeHtml(more)}</span>
        <strong>${escapeHtml(game.pitches)} 球</strong><span class="cpbl-rfv-calendar-team">${escapeHtml(game.opponent)}</span>
      </div>
    `;
  }

  function renderCountControl(count, options) {
    return `
      <div class="cpbl-rfv-count-control" role="group" aria-label="統計場數">
        <span class="cpbl-rfv-count-label">統計場數</span>
        <div class="cpbl-rfv-count-options">${options.map((option) => `<button type="button" class="cpbl-rfv-count-button${option === count ? " is-active" : ""}" data-game-count="${option}" aria-pressed="${option === count}">${option}</button>`).join("")}</div>
      </div>
    `;
  }

  function renderScopeControl(data, countOptions) {
    const isDate = data.scopeMode === "date";
    return `
      <div class="cpbl-rfv-stat-scope">
        <div class="cpbl-rfv-scope-switch" role="group" aria-label="統計範圍類型">
          <button type="button" class="cpbl-rfv-scope-button${isDate ? "" : " is-active"}" data-scope-mode="count" aria-pressed="${!isDate}">近幾場</button>
          <button type="button" class="cpbl-rfv-scope-button${isDate ? " is-active" : ""}" data-scope-mode="date" aria-pressed="${isDate}">日期範圍</button>
        </div>
        ${isDate ? renderDateRangeControl(data) : renderCountControl(data.count, countOptions)}
      </div>
    `;
  }

  function displayScopeLabel(data) {
    return data.scopeLabel || `近 ${data.games?.length || data.count || 0} 場`;
  }

  function renderDateRangeControl(data) {
    return `
      <div class="cpbl-rfv-date-control" role="group" aria-label="自訂日期範圍">
        <label><span>開始</span><input type="date" data-date-start value="${escapeHtml(data.scopeStartDate)}" min="${escapeHtml(data.availableStartDate)}" max="${escapeHtml(data.availableEndDate)}"></label>
        <span class="cpbl-rfv-date-separator" aria-hidden="true">至</span>
        <label><span>結束</span><input type="date" data-date-end value="${escapeHtml(data.scopeEndDate)}" min="${escapeHtml(data.availableStartDate)}" max="${escapeHtml(data.availableEndDate)}"></label>
        <button type="button" class="cpbl-rfv-date-apply" data-date-range-apply>套用</button>
      </div>
    `;
  }

  function attachCountControl(root, onCountChange) {
    root.querySelectorAll("[data-game-count]").forEach((button) => {
      button.addEventListener("click", async () => {
        const count = Number(button.dataset.gameCount);
        if (!Number.isFinite(count) || button.classList.contains("is-active")) return;
        try {
          await onCountChange(count);
        } catch (error) {
          console.debug("[CPBL RFV] unable to change game count", error);
        }
      });
    });
  }

  function attachScopeControl(root, data, onDateRangeChange) {
    if (typeof onDateRangeChange !== "function") return;
    root.querySelectorAll("[data-scope-mode]").forEach((button) => {
      button.addEventListener("click", async () => {
        const mode = button.dataset.scopeMode;
        if (!mode || button.classList.contains("is-active")) return;
        const nextValue = mode === "date"
          ? {
            mode: "date",
            startDate: data.scopeStartDate || data.defaultStartDate,
            endDate: data.scopeEndDate || data.defaultEndDate
          }
          : { mode: "count" };
        try {
          await onDateRangeChange(nextValue);
        } catch (error) {
          console.debug("[CPBL RFV] unable to change statistic scope", error);
        }
      });
    });

    root.querySelectorAll("[data-date-range-apply]").forEach((button) => {
      button.addEventListener("click", async () => {
        const control = button.closest(".cpbl-rfv-date-control");
        const startInput = control?.querySelector("[data-date-start]");
        const endInput = control?.querySelector("[data-date-end]");
        if (!startInput?.value || !endInput?.value || startInput.value > endInput.value) {
          if (startInput?.value > endInput?.value) {
            endInput.setCustomValidity("結束日期不能早於開始日期");
          }
          (startInput?.value ? endInput : startInput)?.reportValidity();
          return;
        }
        endInput.setCustomValidity("");
        try {
          await onDateRangeChange({
            mode: "date",
            startDate: startInput.value,
            endDate: endInput.value
          });
        } catch (error) {
          console.debug("[CPBL RFV] unable to apply date range", error);
        }
      });
    });
  }

  function attachBaselineControl(root, onBaselineChange) {
    root.querySelectorAll("[data-baseline]").forEach((button) => {
      button.addEventListener("click", async () => {
        const baseline = button.dataset.baseline;
        if (!baseline || button.disabled || button.classList.contains("is-active")) return;
        try {
          await onBaselineChange(baseline);
        } catch (error) {
          console.debug("[CPBL RFV] unable to change comparison baseline", error);
        }
      });
    });
  }

  function pitchLoad(pitches) {
    if (pitches >= 80) return "high";
    if (pitches >= 45) return "medium";
    return "low";
  }

  function parseDate(value) {
    const match = String(value || "").match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
    if (!match) return null;
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  }

  function formatDate(value) {
    const date = parseDate(value);
    return date ? `${date.getFullYear()}/${pad(date.getMonth() + 1)}/${pad(date.getDate())}` : String(value || "-");
  }

  function shortDate(value) {
    const date = parseDate(value);
    return date ? `${pad(date.getMonth() + 1)}/${pad(date.getDate())}` : String(value || "-");
  }

  function pad(value) {
    return String(value).padStart(2, "0");
  }

  function numberValue(value) {
    return escapeHtml(String(value ?? 0));
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  return { mount };
});
