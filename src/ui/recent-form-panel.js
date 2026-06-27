(function exposeRecentFormPanel(root, factory) {
  const recentFormPanel = factory();
  root.CPBLRFV = root.CPBLRFV || {};
  root.CPBLRFV.RecentFormPanel = recentFormPanel;
  if (typeof module === "object" && module.exports) module.exports = recentFormPanel;
})(typeof globalThis !== "undefined" ? globalThis : this, function createRecentFormPanel() {
  const PANEL_ID = "cpbl-rfv-panel";

  function mount({ document, mode, countOptions, onCountChange, onBaselineChange }) {
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
          renderReady(panel, state.data, countOptions, onCountChange, onBaselineChange);
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

  function renderReady(panel, data, countOptions, onCountChange, onBaselineChange) {
    const document = panel.ownerDocument;
    panel.innerHTML = "";
    const header = renderHeader(document, data, countOptions);
    panel.appendChild(header);
    if (data.kind === "team") attachCountControl(header, onCountChange);
    else {
      const scopeBar = renderScopeBar(document, data, countOptions);
      panel.appendChild(scopeBar);
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
    else if (data.showDetails) renderPlayerDetails(panel, data);
  }

  function renderHeader(document, data, countOptions) {
    const header = document.createElement("div");
    header.className = "cpbl-rfv-header";
    const isTeam = data.kind === "team";
    header.innerHTML = `
      <div>
        <div class="cpbl-rfv-eyebrow">${isTeam ? "CPBL Team Form" : "CPBL Player Form"}</div>
        <div class="cpbl-rfv-title">${isTeam ? `${escapeHtml(data.teamName)} 近 ${data.games.length} 場` : escapeHtml(data.title)}</div>
      </div>
      <div class="cpbl-rfv-toolbar">
        <div class="cpbl-rfv-meta">
          ${isTeam
            ? `<span>${escapeHtml(data.dateRange)}</span><span>逐日戰績</span>`
            : `<span>${escapeHtml(data.playerTypeLabel)}</span><span>一軍例行賽</span>`}
        </div>
        ${isTeam ? renderCountControl(data.count, countOptions) : ""}
      </div>
    `;
    return header;
  }

  function renderScopeBar(document, data, countOptions) {
    const scopeBar = document.createElement("div");
    scopeBar.className = "cpbl-rfv-scope-bar";
    scopeBar.innerHTML = `
      <div class="cpbl-rfv-baseline-control" role="group" aria-label="比較基準">
        <span class="cpbl-rfv-baseline-label">比較基準</span>
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
        ${renderCountControl(data.count, countOptions)}
      </div>
    `;
    return scopeBar;
  }

  function renderSummary(document, data) {
    const summary = document.createElement("div");
    summary.className = "cpbl-rfv-summary";
    summary.innerHTML = `
      <div class="cpbl-rfv-summary-label">${data.kind === "team" ? "球隊速記" : "球探速記"}</div>
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
    const comparison = data.kind === "player" ? metric.comparison : null;
    card.className = `cpbl-rfv-card${comparison ? ` is-${escapeHtml(comparison.tone)}` : ""}`;
    card.innerHTML = comparison
      ? renderBenchmarkCard(metric, comparison, data.count)
      : `
        <div class="cpbl-rfv-label">${escapeHtml(metric.label)}</div>
        <div class="cpbl-rfv-value">${escapeHtml(metric.value)}</div>
        <div class="cpbl-rfv-note">${escapeHtml(metric.note)}</div>
      `;
    return card;
  }

  function renderBenchmarkCard(metric, comparison, count) {
    const position = Math.min(90, Math.max(10, Number(comparison.position) || 50));
    const deltaStart = Math.min(position, 50);
    const deltaWidth = Math.abs(position - 50);
    const direction = comparisonDirection(comparison, position);
    const description = `${metric.label}，${comparison.baselineText}，近 ${count} 場 ${metric.value}，${comparison.label}`;
    return `
      <div class="cpbl-rfv-card-heading">
        <div class="cpbl-rfv-label">${escapeHtml(metric.label)}</div>
        <div class="cpbl-rfv-compare-status"><span aria-hidden="true">${direction}</span>${escapeHtml(comparison.label)}</div>
      </div>
      <div class="cpbl-rfv-current-value">
        <span>近 ${escapeHtml(count)} 場</span>
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
    const stripHeader = document.createElement("div");
    stripHeader.className = "cpbl-rfv-strip-header";
    stripHeader.innerHTML = '<div class="cpbl-rfv-strip-title">近期走勢</div><div class="cpbl-rfv-strip-meta">左舊右新</div>';
    panel.appendChild(stripHeader);

    const strip = document.createElement("div");
    strip.className = "cpbl-rfv-team-strip";
    strip.innerHTML = data.games.slice().reverse().map(renderTeamGameChip).join("");
    panel.appendChild(strip);

    const details = createDetails(document, `近 ${data.games.length} 場明細`, data.dateRange);
    const games = document.createElement("div");
    games.className = "cpbl-rfv-games";
    games.innerHTML = renderTeamGameTable(data.games);
    details.appendChild(games);
    panel.appendChild(details);
  }

  function renderPlayerDetails(panel, data) {
    const document = panel.ownerDocument;
    const details = createDetails(document, "逐場表現", `${data.games.length} 場 · ${data.dateRange}`);
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
      <div class="cpbl-rfv-count-control" role="group" aria-label="近期場數">
        <span class="cpbl-rfv-count-label">近況場數</span>
        <div class="cpbl-rfv-count-options">${options.map((option) => `<button type="button" class="cpbl-rfv-count-button${option === count ? " is-active" : ""}" data-game-count="${option}" aria-pressed="${option === count}">${option}</button>`).join("")}</div>
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
