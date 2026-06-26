const CPBL_RFV_ID = "cpbl-rfv-panel";
const DEFAULT_GAME_COUNT = 5;
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

init();

async function init() {
  if (document.getElementById(CPBL_RFV_ID)) return;

  const acnt = new URL(location.href).searchParams.get("Acnt");
  if (!acnt) return;

  const mount = findMountPoint();
  if (!mount) return;

  const panel = createPanel();
  mount.insertAdjacentElement("beforebegin", panel);
  renderMessage(panel, "正在讀取近期表現...");

  try {
    const settings = await getSettings();
    const context = extractPageContext();
    const data = await getRecentFollowScore(acnt, context, settings.gameCount);
    renderStats(panel, data, settings.gameCount);
  } catch (error) {
    renderMessage(panel, "暫時無法讀取 CPBL 數據。", true);
    console.debug("[CPBL RFV]", error);
  }
}

function findMountPoint() {
  return document.querySelector("#bindVue .DistTitle") ||
    document.querySelector(".RecordTableWrap") ||
    document.querySelector("#bindVue");
}

function createPanel() {
  const panel = document.createElement("section");
  panel.id = CPBL_RFV_ID;
  panel.className = "cpbl-rfv-panel";
  panel.setAttribute("aria-live", "polite");
  return panel;
}

function renderMessage(panel, text, isError = false) {
  panel.innerHTML = "";
  const header = document.createElement("div");
  header.className = "cpbl-rfv-header";
  header.innerHTML = `
    <div>
      <div class="cpbl-rfv-eyebrow">CPBL Recent Form</div>
      <div class="cpbl-rfv-title">近期表現</div>
    </div>
    <div class="cpbl-rfv-subtitle">資料來源：CPBL 官網</div>
  `;
  const message = document.createElement("div");
  message.className = `cpbl-rfv-message${isError ? " cpbl-rfv-error" : ""}`;
  message.textContent = text;
  panel.append(header, message);
}

function renderStats(panel, data, gameCount) {
  panel.innerHTML = "";

  const header = document.createElement("div");
  header.className = "cpbl-rfv-header";
  header.innerHTML = `
    <div>
      <div class="cpbl-rfv-eyebrow">CPBL Recent Form</div>
      <div class="cpbl-rfv-title">近期 ${gameCount} 場表現</div>
    </div>
    <div class="cpbl-rfv-meta">
      <span>${escapeHtml(data.playerTypeLabel)}</span>
      <span>一軍例行賽</span>
      <span>${escapeHtml(data.dateRange)}</span>
    </div>
  `;
  panel.appendChild(header);

  if (data.games.length === 0) {
    const message = document.createElement("div");
    message.className = "cpbl-rfv-message";
    message.textContent = "近期沒有可計算的出賽資料。可以在 popup 調整近期場數後重新整理頁面。";
    panel.appendChild(message);
    return;
  }

  const summary = document.createElement("div");
  summary.className = "cpbl-rfv-summary";
  summary.innerHTML = `
    <div class="cpbl-rfv-summary-label">球探速記</div>
    <div class="cpbl-rfv-summary-text">${escapeHtml(data.summary)}</div>
  `;
  panel.appendChild(summary);

  const body = document.createElement("div");
  body.className = "cpbl-rfv-body";

  const grid = document.createElement("div");
  grid.className = "cpbl-rfv-grid";
  data.metrics.forEach((metric) => {
    const card = document.createElement("div");
    card.className = "cpbl-rfv-card";
    card.innerHTML = `
      <div class="cpbl-rfv-label">${escapeHtml(metric.label)}</div>
      <div class="cpbl-rfv-value">${escapeHtml(metric.value)}</div>
      <div class="cpbl-rfv-note">${escapeHtml(metric.note)}</div>
    `;
    grid.appendChild(card);
  });
  body.appendChild(grid);
  panel.appendChild(body);

  const details = document.createElement("details");
  details.className = "cpbl-rfv-details";
  details.innerHTML = `
    <summary>
      <span class="cpbl-rfv-details-title">逐場表現</span>
      <span class="cpbl-rfv-details-meta">${escapeHtml(data.games.length)} 場 · ${escapeHtml(data.dateRange)}</span>
    </summary>
  `;

  const games = document.createElement("div");
  games.className = "cpbl-rfv-games";
  games.innerHTML = data.playerType === "pitcher" ? renderPitcherTable(data.games) : renderBatterTable(data.games);
  if (data.playerType === "pitcher") {
    const calendar = document.createElement("div");
    calendar.className = "cpbl-rfv-calendar";
    calendar.innerHTML = renderPitcherCalendar(data.games);
    details.appendChild(calendar);
  }
  details.appendChild(games);
  panel.appendChild(details);
}

function renderBatterTable(games) {
  const rows = games.map((game) => `
    <tr>
      <td>${escapeHtml(formatDate(game.GameDate))}</td>
      <td>${escapeHtml(game.FightTeamAbbrName || "-")}</td>
      <td>${numberValue(game.PlateAppearances)}</td>
      <td>${numberValue(atBats(game))}</td>
      <td>${numberValue(game.HittingCnt)}</td>
      <td>${numberValue(game.HomeRunCnt)}</td>
      <td>${numberValue(game.BasesONBallsCnt)}</td>
    </tr>
  `).join("");

  return `
    <table>
      <thead>
        <tr><th>日期</th><th>對戰</th><th>PA</th><th>AB</th><th>H</th><th>HR</th><th>BB</th></tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function renderPitcherTable(games) {
  const rows = games.map((game) => `
    <tr>
      <td>${escapeHtml(formatDate(game.GameDate))}</td>
      <td>${escapeHtml(game.FightTeamAbbrName || "-")}</td>
      <td>${escapeHtml(String(game.restDaysLabel))}</td>
      <td>${escapeHtml(String(game.InningPitchedCnt ?? "-"))}</td>
      <td>${numberValue(game.PitchCnt)}</td>
      <td>${numberValue(game.HittingCnt)}</td>
      <td>${numberValue(game.EarnedRunCnt)}</td>
      <td>${numberValue(game.BasesONBallsCnt)}</td>
    </tr>
  `).join("");

  return `
    <table>
      <thead>
        <tr><th>日期</th><th>對戰</th><th>登板間隔</th><th>IP</th><th>用球</th><th>H</th><th>ER</th><th>BB</th></tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function renderPitcherCalendar(games) {
  const chronologicalGames = games.slice().reverse();
  const months = buildCalendarMonths(chronologicalGames);
  const monthPanels = months.map(renderCalendarMonth).join("");

  return `
    <div class="cpbl-rfv-calendar-header">
      <div>
        <div class="cpbl-rfv-calendar-title">登板月曆</div>
        <div class="cpbl-rfv-calendar-caption">空白日期代表未登板；有登板的日期會標示角色、對戰與用球數。</div>
      </div>
      <div class="cpbl-rfv-calendar-legend">
        <span>低用球</span>
        <span>中用球</span>
        <span>高用球</span>
      </div>
    </div>
    <div class="cpbl-rfv-calendar-months" aria-label="投手近期登板月曆">
      ${monthPanels}
    </div>
  `;
}

function buildCalendarMonths(games) {
  if (games.length === 0) return [];
  const dates = games.map((game) => new Date(game.GameDate)).filter((date) => !Number.isNaN(date.getTime()));
  if (dates.length === 0) return [];

  const byDate = new Map();
  games.forEach((game) => {
    const key = dateKey(new Date(game.GameDate));
    if (!byDate.has(key)) byDate.set(key, []);
    byDate.get(key).push(game);
  });

  const first = new Date(Math.min(...dates));
  const last = new Date(Math.max(...dates));
  const today = new Date();
  const months = [];
  const cursor = new Date(first.getFullYear(), first.getMonth(), 1);
  const shouldIncludeToday = today.getFullYear() === last.getFullYear() && today > last;
  const endBase = shouldIncludeToday ? today : last;
  const end = new Date(endBase.getFullYear(), endBase.getMonth(), 1);

  while (cursor <= end) {
    months.push({
      year: cursor.getFullYear(),
      month: cursor.getMonth(),
      gamesByDate: byDate
    });
    cursor.setMonth(cursor.getMonth() + 1);
  }

  return months;
}

function renderCalendarMonth(monthData) {
  const { year, month, gamesByDate } = monthData;
  const todayKey = dateKey(new Date());
  const weekdays = ["日", "一", "二", "三", "四", "五", "六"];
  const firstWeekday = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();
  const paddingCells = Array.from({ length: firstWeekday }, () => '<div class="cpbl-rfv-calendar-cell is-pad"></div>').join("");
  const dayCells = Array.from({ length: totalDays }, (_, index) => {
    const day = index + 1;
    const key = dateKey(new Date(year, month, day));
    const games = gamesByDate.get(key) || [];
    return renderCalendarDay(day, games, key, key === todayKey);
  }).join("");

  return `
    <div class="cpbl-rfv-calendar-month">
      <div class="cpbl-rfv-calendar-month-title">${year}/${String(month + 1).padStart(2, "0")}</div>
      <div class="cpbl-rfv-calendar-weekdays">
        ${weekdays.map((weekday) => `<div>${weekday}</div>`).join("")}
      </div>
      <div class="cpbl-rfv-calendar-grid">
        ${paddingCells}${dayCells}
      </div>
    </div>
  `;
}

function renderCalendarDay(day, games, key, isToday) {
  const todayClass = isToday ? " is-today" : "";
  const todayLabel = isToday ? '<span class="cpbl-rfv-calendar-today">今日</span>' : "";

  if (games.length === 0) {
    return `
      <div class="cpbl-rfv-calendar-cell${todayClass}">
        <span class="cpbl-rfv-calendar-day">${day}</span>
        ${todayLabel}
      </div>
    `;
  }

  const game = games[0];
  const pitches = n(game.PitchCnt);
  const load = getPitchLoad(pitches);
  const role = game.RoleType || "登板";
  const team = game.FightTeamAbbrName || "-";
  const more = games.length > 1 ? ` +${games.length - 1}` : "";
  return `
    <div class="cpbl-rfv-calendar-cell has-game is-load-${load.tone}${todayClass}" title="${escapeHtml(`${key} ${role} vs ${team}，${pitches} 球`)}">
      <span class="cpbl-rfv-calendar-day">${day}</span>
      ${todayLabel}
      <span class="cpbl-rfv-calendar-role">${escapeHtml(role)}${escapeHtml(more)}</span>
      <strong>${escapeHtml(String(pitches))} 球</strong>
      <span class="cpbl-rfv-calendar-team">${escapeHtml(team)}</span>
    </div>
  `;
}

function getPitchLoad(pitches) {
  if (pitches >= 80) return { tone: "high", label: "高用球" };
  if (pitches >= 45) return { tone: "medium", label: "中用球" };
  return { tone: "low", label: "低用球" };
}

async function getSettings() {
  const stored = await chrome.storage.sync.get({ gameCount: DEFAULT_GAME_COUNT });
  const gameCount = clampNumber(stored.gameCount, 1, 20, DEFAULT_GAME_COUNT);
  return { gameCount };
}

function extractPageContext() {
  const text = document.body.textContent || "";
  const scriptText = Array.from(document.scripts).map((script) => script.textContent || "").join("\n");
  const defendStation = matchFirst(scriptText, /defendStation:\s*'([^']+)'/) ||
    document.querySelector(".PlayerBrief .pos .desc")?.textContent?.trim() ||
    "";
  const year = matchFirst(scriptText, /year:\s*'(\d{4})'/) ||
    String(new Date().getFullYear());
  return {
    defendStation,
    isPitcher: defendStation.includes("投手") || text.includes("投球成績"),
    year
  };
}

async function getRecentFollowScore(acnt, context, gameCount) {
  const cacheKey = `follow:${acnt}:A:${context.year}:${context.defendStation}`;
  const cached = await chrome.storage.local.get(cacheKey);
  const cachedEntry = cached[cacheKey];
  if (cachedEntry && Date.now() - cachedEntry.updatedAt < CACHE_TTL_MS) {
    return buildRecentData(cachedEntry.rows, context, gameCount);
  }

  const followPage = await fetchFollowPage(acnt);
  const token = extractFollowToken(followPage);
  const rowContext = {
    defendStation: matchFirst(followPage, /defendStation:\s*'([^']+)'/) || context.defendStation,
    year: matchFirst(followPage, /year:\s*'(\d{4})'/) || context.year
  };
  const rows = await fetchFollowScore(acnt, token, rowContext);
  await chrome.storage.local.set({
    [cacheKey]: {
      rows,
      updatedAt: Date.now()
    }
  });

  return buildRecentData(rows, rowContext, gameCount);
}

async function fetchFollowPage(acnt) {
  const response = await fetch(`/team/follow?Acnt=${encodeURIComponent(acnt)}`, {
    credentials: "include"
  });
  if (!response.ok) throw new Error(`follow page ${response.status}`);
  return response.text();
}

function extractFollowToken(html) {
  const token = matchFirst(html, /getFollowScore[\s\S]*?RequestVerificationToken:\s*'([^']+)'/);
  if (!token) throw new Error("missing follow score token");
  return token;
}

async function fetchFollowScore(acnt, token, context) {
  const body = new URLSearchParams({
    acnt,
    defendStation: context.defendStation,
    year: context.year,
    kindCode: "A"
  });
  const response = await fetch("/team/getfollowscore", {
    method: "POST",
    credentials: "include",
    referrer: `${location.origin}/team/follow?Acnt=${encodeURIComponent(acnt)}`,
    headers: {
      "Accept": "application/json, text/javascript, */*; q=0.01",
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      "RequestVerificationToken": token,
      "X-Requested-With": "XMLHttpRequest"
    },
    body
  });
  if (!response.ok) throw new Error(`follow score ${response.status}`);

  const result = await response.json();
  if (!result.Success) throw new Error("follow score unsuccessful");
  return JSON.parse(result.FollowScore || "[]");
}

function buildRecentData(rows, context, gameCount) {
  const playerType = context.defendStation.includes("投手") ? "pitcher" : "batter";
  const sortedRows = rows
    .slice()
    .filter((row) => row && row.GameDate)
    .sort((a, b) => new Date(b.GameDate) - new Date(a.GameDate));
  const games = sortedRows.slice(0, gameCount);

  if (playerType === "pitcher") {
    const gamesWithRest = addRestDays(games, sortedRows);
    return {
      playerType,
      playerTypeLabel: "投手",
      dateRange: formatDateRange(gamesWithRest),
      summary: summarizePitcher(gamesWithRest),
      metrics: calculatePitcherMetrics(gamesWithRest),
      games: gamesWithRest
    };
  }

  return {
    playerType,
    playerTypeLabel: "打者",
    dateRange: formatDateRange(games),
    summary: summarizeBatter(games),
    metrics: calculateBatterMetrics(games),
    games
  };
}

function summarizeBatter(games) {
  const hits = games.reduce((sum, game) => sum + n(game.HittingCnt), 0);
  const ab = games.reduce((sum, game) => sum + atBats(game), 0);
  const bb = games.reduce((sum, game) => sum + n(game.BasesONBallsCnt), 0);
  const hbp = games.reduce((sum, game) => sum + n(game.HitBYPitchCnt), 0);
  const sf = games.reduce((sum, game) => sum + n(game.SacrificeFlyCnt), 0);
  const tb = games.reduce((sum, game) => {
    const hitsInGame = n(game.HittingCnt);
    const doubles = n(game.TwoBaseHitCnt);
    const triples = n(game.ThreeBaseHitCnt);
    const homers = n(game.HomeRunCnt);
    return sum + (n(game.TotalBases) || hitsInGame + doubles + (triples * 2) + (homers * 3));
  }, 0);
  const hr = games.reduce((sum, game) => sum + n(game.HomeRunCnt), 0);
  const avg = formatRate(divide(hits, ab));
  const obp = divide(hits + bb + hbp, ab + bb + hbp + sf);
  const slg = divide(tb, ab);
  const ops = Number.isFinite(obp + slg) ? formatRate(obp + slg) : "-";
  const powerText = hr > 0 ? `，其中 ${hr} 支全壘打` : "";
  return `近 ${games.length} 場合計 ${hits} 支安打、${bb} 次保送，打擊率 ${avg}、OPS ${ops}${powerText}。`;
}

function summarizePitcher(games) {
  const outs = games.reduce((sum, game) => sum + inningsToOuts(game.InningPitchedCnt), 0);
  const er = games.reduce((sum, game) => sum + n(game.EarnedRunCnt), 0);
  const pitches = games.reduce((sum, game) => sum + n(game.PitchCnt), 0);
  const avgPitches = formatDecimal(divide(pitches, games.length), 0);
  return `近 ${games.length} 場登板合計 ${outsToInnings(outs)} 局、${er} 自責分，平均 ${avgPitches} 球；${summarizePitcherRest(games)}。`;
}

function summarizePitcherRest(games) {
  const today = new Date();
  const todayKey = dateKey(today);
  const latestGame = games[0];
  const latestGameDate = latestGame ? new Date(latestGame.GameDate) : null;
  const pitchedToday = latestGameDate && dateKey(latestGameDate) === todayKey;
  const previousGame = pitchedToday ? games.find((game) => dateKey(new Date(game.GameDate)) !== todayKey) : latestGame;

  if (!previousGame) return pitchedToday ? "今日已登板" : "上次登板日期未知";

  const previousDate = new Date(previousGame.GameDate);
  const daysSincePrevious = daysBetween(previousDate, today);
  const restText = daysSincePrevious === null ? "休息天數未知" : `休息 ${daysSincePrevious} 天`;
  const prefix = pitchedToday ? "今日已登板；" : "";
  return `${prefix}上次登板 ${formatDate(previousDate)}，${restText}`;
}

function calculateBatterMetrics(games) {
  const totals = games.reduce((sum, game) => {
    const hits = n(game.HittingCnt);
    const doubles = n(game.TwoBaseHitCnt);
    const triples = n(game.ThreeBaseHitCnt);
    const homers = n(game.HomeRunCnt);
    sum.ab += atBats(game);
    sum.h += hits;
    sum.bb += n(game.BasesONBallsCnt);
    sum.hbp += n(game.HitBYPitchCnt);
    sum.sf += n(game.SacrificeFlyCnt);
    sum.tb += n(game.TotalBases) || hits + doubles + (triples * 2) + (homers * 3);
    return sum;
  }, { ab: 0, h: 0, bb: 0, hbp: 0, sf: 0, tb: 0 });

  const avg = divide(totals.h, totals.ab);
  const obp = divide(totals.h + totals.bb + totals.hbp, totals.ab + totals.bb + totals.hbp + totals.sf);
  const slg = divide(totals.tb, totals.ab);
  const ops = Number.isFinite(obp + slg) ? obp + slg : NaN;

  return [
    { label: "AVG", value: formatRate(avg), note: `${totals.h} H / ${totals.ab} AB` },
    { label: "OBP", value: formatRate(obp), note: `${totals.bb} BB · ${totals.hbp} HBP` },
    { label: "SLG", value: formatRate(slg), note: `${totals.tb} TB` },
    { label: "OPS", value: formatRate(ops), note: "OBP + SLG" }
  ];
}

function calculatePitcherMetrics(games) {
  const totals = games.reduce((sum, game) => {
    sum.ip += inningsToOuts(game.InningPitchedCnt);
    sum.er += n(game.EarnedRunCnt);
    sum.bb += n(game.BasesONBallsCnt);
    sum.h += n(game.HittingCnt);
    return sum;
  }, { ip: 0, er: 0, bb: 0, h: 0 });

  const innings = totals.ip / 3;
  return [
    { label: "ERA", value: formatDecimal(divide(totals.er * 9, innings)), note: `${totals.er} ER` },
    { label: "WHIP", value: formatDecimal(divide(totals.bb + totals.h, innings)), note: `${totals.h} H · ${totals.bb} BB` },
    { label: "總局數", value: outsToInnings(totals.ip), note: `${games.length} 場登板` },
    { label: "平均用球", value: formatDecimal(divide(games.reduce((sum, game) => sum + n(game.PitchCnt), 0), games.length), 0), note: "每場平均" }
  ];
}

function addRestDays(games, sortedRows) {
  return games.map((game) => {
    const currentDate = new Date(game.GameDate);
    const previous = sortedRows.find((candidate) => new Date(candidate.GameDate) < currentDate);
    const restDays = previous ? Math.round((currentDate - new Date(previous.GameDate)) / 86400000) : null;
    return {
      ...game,
      restDays,
      restDaysLabel: restDays === null ? "本季首次" : `${restDays} 天`
    };
  });
}

function inningsToOuts(value) {
  const text = String(value ?? "0");
  const [whole, partial = "0"] = text.split(".");
  return (Number.parseInt(whole, 10) || 0) * 3 + (Number.parseInt(partial, 10) || 0);
}

function outsToInnings(outs) {
  const innings = Math.floor(outs / 3);
  const remainder = outs % 3;
  return remainder ? `${innings}.${remainder}` : String(innings);
}

function n(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function atBats(game) {
  return n(game.AtBatCnt ?? game.HitCnt);
}

function numberValue(value) {
  return escapeHtml(String(value ?? 0));
}

function divide(numerator, denominator) {
  return denominator > 0 ? numerator / denominator : NaN;
}

function formatRate(value) {
  return Number.isFinite(value) ? value.toFixed(3).replace(/^0/, "") : "-";
}

function formatDecimal(value, digits = 2) {
  return Number.isFinite(value) ? value.toFixed(digits) : "-";
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value ?? "-");
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}/${month}/${day}`;
}

function formatDateRange(games) {
  if (games.length === 0) return "無近期資料";
  const dates = games.map((game) => new Date(game.GameDate)).filter((date) => !Number.isNaN(date.getTime()));
  if (dates.length === 0) return "日期未知";
  const newest = new Date(Math.max(...dates));
  const oldest = new Date(Math.min(...dates));
  if (newest.getTime() === oldest.getTime()) return formatDate(newest);
  return `${formatDate(oldest)} - ${formatDate(newest)}`;
}

function dateKey(date) {
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}/${month}/${day}`;
}

function daysBetween(startDate, endDate) {
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return null;
  const start = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  const end = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
  return Math.max(0, Math.round((end - start) / 86400000));
}

function matchFirst(text, pattern) {
  return text.match(pattern)?.[1] || "";
}

function clampNumber(value, min, max, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.round(parsed)));
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
