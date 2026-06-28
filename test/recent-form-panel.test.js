const test = require("node:test");
const assert = require("node:assert/strict");
const RecentFormPanel = require("../src/ui/recent-form-panel.js");

test("mounts once and owns loading and ready states", () => {
  const document = new FakeDocument();
  const panel = RecentFormPanel.mount({
    document,
    mode: "player",
    countOptions: [3, 5, 10],
    onCountChange: async () => {},
    onBaselineChange: async () => {}
  });

  assert.ok(panel);
  assert.equal(document.mount.inserted.id, "cpbl-rfv-panel");

  panel.update({ status: "loading" });
  assert.match(document.mount.inserted.children[1].textContent, /正在讀取近期表現/);

  panel.update({
    status: "ready",
    data: {
      kind: "player",
      playerType: "batter",
      playerTypeLabel: "打者",
      baseline: "none",
      baselineOptions: [
        { value: "none", label: "近況", available: true },
        { value: "season", label: "比較本季", available: true },
        { value: "career", label: "比較生涯", available: true }
      ],
      title: "近 5 場表現",
      count: 5,
      hasData: true,
      showDetails: true,
      dateRange: "2026/06/20 - 2026/06/27",
      summary: "近期測試摘要。",
      comparisonSummary: "",
      metrics: [{
        label: "AVG",
        value: ".300",
        note: "3 H / 10 AB"
      }],
      trends: {
        playerType: "batter",
        windowSize: 2,
        seasonGameCount: 4,
        recentStartGame: 3,
        season: { avg: 0.275, ops: 0.72 },
        points: [
          { gameNumber: 2, avg: 0.25, ops: 0.65 },
          { gameNumber: 3, avg: 0.3, ops: 0.76 },
          { gameNumber: 4, avg: 0.325, ops: 0.81 }
        ]
      },
      games: [{ date: "2026/06/27", opponent: "測試隊", plateAppearances: 4, atBats: 3, hits: 1, homeRuns: 0, walks: 1 }]
    }
  });

  const html = collectHtml(document.mount.inserted);
  assert.match(html, /近 5 場表現/);
  assert.match(html, /分析方式/);
  assert.match(html, /data-baseline="none"/);
  assert.match(html, /近況/);
  assert.match(html, /\.300/);
  assert.match(html, /整季走勢/);
  assert.match(html, /打擊率/);
  assert.match(html, /OPS/);
  assert.match(html, /cpbl-rfv-trend-line is-player/);
  assert.match(html, /目前 \.325/);
  assert.match(html, /本季 \.275/);
  assert.match(html, /第 4 場/);
  assert.doesNotMatch(html, /cpbl-rfv-benchmark/);

  panel.update({
    status: "ready",
    data: {
      kind: "player",
      playerType: "batter",
      playerTypeLabel: "打者",
      baseline: "season",
      baselineOptions: [
        { value: "none", label: "近況", available: true },
        { value: "season", label: "比較本季", available: true },
        { value: "career", label: "比較生涯", available: true }
      ],
      title: "近 5 場｜比較本季",
      count: 5,
      hasData: true,
      showDetails: true,
      dateRange: "2026/06/20 - 2026/06/27",
      summary: "近期測試摘要。",
      comparisonSummary: "相較本季，3 項較佳、1 項較差。",
      metrics: [{
        label: "AVG",
        value: ".300",
        note: "3 H / 10 AB",
        comparison: { tone: "positive", label: "較佳 20%", baselineLabel: "本季", baselineValue: ".250", baselineText: "本季 .250", position: 66, lowLabel: "較差", highLabel: "較佳" }
      }],
      games: [{ date: "2026/06/27", opponent: "測試隊", plateAppearances: 4, atBats: 3, hits: 1, homeRuns: 0, walks: 1 }]
    }
  });

  const comparisonHtml = collectHtml(document.mount.inserted);
  assert.match(comparisonHtml, /近 5 場｜比較本季/);
  assert.match(comparisonHtml, /data-baseline="career"/);
  assert.match(comparisonHtml, /較佳 20%/);
  assert.match(comparisonHtml, /相較本季，3 項較佳、1 項較差/);
  assert.match(comparisonHtml, /cpbl-rfv-benchmark/);
  assert.match(comparisonHtml, /--rfv-marker-x: 66%/);
  assert.match(comparisonHtml, /↑/);
  assert.match(comparisonHtml, /較差/);
  assert.match(comparisonHtml, /本季 \.250/);
  assert.match(comparisonHtml, /較佳/);
  assert.match(comparisonHtml, /近 5 場/);
  assert.match(comparisonHtml, /近期測試摘要/);
  assert.match(comparisonHtml, /測試隊/);

  panel.update({
    status: "ready",
    data: {
      kind: "player",
      playerType: "batter",
      playerTypeLabel: "打者",
      baseline: "career",
      baselineOptions: [
        { value: "none", label: "近況", available: true },
        { value: "season", label: "比較本季", available: true },
        { value: "career", label: "比較生涯", available: true }
      ],
      title: "近 5 場｜比較生涯",
      count: 5,
      hasData: true,
      showDetails: true,
      dateRange: "2026/06/20 - 2026/06/27",
      summary: "生涯比較摘要。",
      comparisonSummary: "相較生涯，1 項較差。",
      metrics: [{
        label: "AVG",
        value: ".300",
        note: "3 H / 10 AB",
        comparison: { tone: "negative", label: "較差 6%", baselineLabel: "生涯", baselineValue: ".320", baselineText: "生涯 .320", position: 45, lowLabel: "較差", highLabel: "較佳" }
      }],
      games: [{ date: "2026/06/27", opponent: "測試隊", plateAppearances: 4, atBats: 3, hits: 1, homeRuns: 0, walks: 1 }]
    }
  });

  const careerHtml = collectHtml(document.mount.inserted);
  assert.match(careerHtml, /近 5 場｜比較生涯/);
  assert.match(careerHtml, /生涯 \.320/);
  assert.match(careerHtml, /--rfv-marker-x: 45%/);
  assert.match(careerHtml, /↓/);
  assert.match(careerHtml, /data-game-count/);
  assert.match(careerHtml, /逐場數據/);

  panel.update({
    status: "ready",
    data: {
      kind: "player",
      playerType: "pitcher",
      playerTypeLabel: "投手",
      baseline: "season",
      baselineOptions: [
        { value: "none", label: "近況", available: true },
        { value: "season", label: "比較本季", available: true },
        { value: "career", label: "比較生涯", available: false }
      ],
      title: "近 5 場｜比較本季",
      count: 5,
      hasData: true,
      showDetails: false,
      dateRange: "2026/06/20 - 2026/06/27",
      summary: "近期投球摘要。",
      comparisonSummary: "相較本季，2 項較佳。",
      metrics: [
        comparisonMetric("ERA", "effect", "2.50", "本季", "3.20", "positive", "較佳 22%", 68),
        comparisonMetric("WHIP", "effect", "1.10", "本季", "1.20", "positive", "較佳 8%", 57),
        comparisonMetric("局數／場", "workload", "5.0", "本季", "4.5", "neutral", "較多 11%", 59),
        comparisonMetric("平均用球", "workload", "80", "本季", "72", "neutral", "較多 11%", 59)
      ],
      trends: {
        playerType: "pitcher",
        windowSize: 2,
        seasonGameCount: 3,
        recentStartGame: 2,
        season: { era: 3.2, whip: 1.2 },
        points: [
          { gameNumber: 2, era: 3.5, whip: 1.3 },
          { gameNumber: 3, era: 2.5, whip: 1.1 }
        ]
      },
      games: []
    }
  });

  const pitcherHtml = collectHtml(document.mount.inserted);
  assert.match(pitcherHtml, /ERA/);
  assert.match(pitcherHtml, /WHIP/);
  assert.match(pitcherHtml, /局數／場/);
  assert.match(pitcherHtml, /平均用球/);
  assert.match(pitcherHtml, /較多 11%/);
  assert.match(pitcherHtml, /目前 2\.50/);
  assert.match(pitcherHtml, /本季 3\.20/);
  assert.match(pitcherHtml, /目前 1\.10/);
});

test("renders team season comparisons and rolling trend charts", () => {
  const document = new FakeDocument();
  const panel = RecentFormPanel.mount({
    document,
    mode: "team",
    countOptions: [5, 10, 15],
    onCountChange: async () => {}
  });

  panel.update({
    status: "ready",
    data: {
      kind: "team",
      teamName: "測試隊",
      count: 5,
      hasData: true,
      dateRange: "2026/06/20 - 2026/06/27",
      summary: "近 5 場 4W-1L。",
      comparisonSummary: "相較本季，4 項較佳。",
      metrics: [
        comparisonMetric("勝率", "result", ".800", "本季", ".600", "positive", "較佳 33%", 76),
        comparisonMetric("場均得分", "scoring", "5.2", "本季", "4.3", "positive", "較佳 21%", 67),
        comparisonMetric("場均失分", "scoring", "3.1", "本季", "4.0", "positive", "較佳 23%", 68),
        comparisonMetric("場均分差", "scoring", "+2.1", "本季", "+0.3", "positive", "較佳 +1.8", 86)
      ],
      trends: {
        windowSize: 5,
        seasonGameCount: 8,
        recentStartGame: 4,
        season: { winPercentage: 0.625, runsPerGame: 4.3, runsAllowedPerGame: 3.8 },
        points: [
          { gameNumber: 5, winPercentage: 0.6, runsPerGame: 4.0, runsAllowedPerGame: 3.8 },
          { gameNumber: 6, winPercentage: 0.6, runsPerGame: 4.4, runsAllowedPerGame: 3.6 },
          { gameNumber: 7, winPercentage: 0.8, runsPerGame: 4.8, runsAllowedPerGame: 3.2 },
          { gameNumber: 8, winPercentage: 0.8, runsPerGame: 5.2, runsAllowedPerGame: 3.1 }
        ],
        observations: [
          { gameNumber: 1, date: "2026/05/01", opponent: "A", result: "W", runsFor: 5, runsAgainst: 2, isRecent: false },
          { gameNumber: 2, date: "2026/05/02", opponent: "B", result: "L", runsFor: 2, runsAgainst: 4, isRecent: false },
          { gameNumber: 3, date: "2026/05/03", opponent: "C", result: "T", runsFor: 3, runsAgainst: 3, isRecent: false },
          { gameNumber: 4, date: "2026/05/04", opponent: "D", result: "W", runsFor: 6, runsAgainst: 1, isRecent: true },
          { gameNumber: 5, date: "2026/05/05", opponent: "E", result: "W", runsFor: 4, runsAgainst: 2, isRecent: true },
          { gameNumber: 6, date: "2026/05/06", opponent: "F", result: "L", runsFor: 1, runsAgainst: 5, isRecent: true },
          { gameNumber: 7, date: "2026/05/07", opponent: "G", result: "W", runsFor: 5, runsAgainst: 3, isRecent: true },
          { gameNumber: 8, date: "2026/05/08", opponent: "H", result: "W", runsFor: 5, runsAgainst: 2, isRecent: true }
        ]
      },
      games: [
        { date: "2026/06/27", opponent: "A", homeAway: "主", result: "W", resultTone: "win", runsFor: 5, runsAgainst: 2 },
        { date: "2026/06/26", opponent: "B", homeAway: "客", result: "W", resultTone: "win", runsFor: 4, runsAgainst: 3 }
      ]
    }
  });

  const html = collectHtml(document.mount.inserted);
  assert.match(html, /相較本季，4 項較佳/);
  assert.match(html, /整季走勢/);
  assert.match(html, /移動勝率/);
  assert.match(html, /攻守走勢/);
  assert.match(html, /cpbl-rfv-trend-line is-win/);
  assert.match(html, /cpbl-rfv-trend-line is-scored/);
  assert.match(html, /cpbl-rfv-trend-line is-allowed/);
  assert.match(html, /cpbl-rfv-trend-observation is-result-w/);
  assert.match(html, /cpbl-rfv-trend-observation is-result-l/);
  assert.match(html, /cpbl-rfv-trend-observation is-result-t/);
  assert.match(html, /cpbl-rfv-trend-observation is-scored is-recent/);
  assert.match(html, /cpbl-rfv-trend-observation is-allowed is-recent/);
  assert.doesNotMatch(html, /cpbl-rfv-trend-observation is-scored"/);
  assert.doesNotMatch(html, /cpbl-rfv-trend-observation is-allowed"/);
  assert.match(html, /攻守資料點僅顯示近期場次/);
  assert.match(html, /2026\/05\/08 vs H/);
  assert.match(html, /d="M/);
  assert.match(html, /本季 \.625/);
  assert.match(html, /第 1 場/);
  assert.match(html, /第 8 場/);
});

function comparisonMetric(label, group, value, baselineLabel, baselineValue, tone, status, position) {
  return {
    label,
    group,
    value,
    note: "測試",
    comparison: {
      tone,
      label: status,
      baselineLabel,
      baselineValue,
      baselineText: `${baselineLabel} ${baselineValue}`,
      position,
      lowLabel: "較差",
      highLabel: "較佳"
    }
  };
}

class FakeDocument {
  constructor() {
    this.mount = new FakeElement(this);
  }

  getElementById() {
    return null;
  }

  querySelector(selector) {
    return selector === ".ContHeader" ? this.mount : null;
  }

  createElement() {
    return new FakeElement(this);
  }
}

class FakeElement {
  constructor(ownerDocument) {
    this.ownerDocument = ownerDocument;
    this.children = [];
    this._innerHTML = "";
    this.textContent = "";
    this.className = "";
    this.id = "";
    this.classList = { add: (...names) => { this.className = [this.className, ...names].filter(Boolean).join(" "); } };
  }

  set innerHTML(value) {
    this._innerHTML = value;
    if (value === "") this.children = [];
  }

  get innerHTML() {
    return this._innerHTML;
  }

  setAttribute() {}

  insertAdjacentElement(_position, element) {
    this.inserted = element;
  }

  appendChild(element) {
    this.children.push(element);
    return element;
  }

  append(...elements) {
    this.children.push(...elements);
  }

  querySelectorAll() {
    return [];
  }
}

function collectHtml(element) {
  return [element.innerHTML, element.textContent, ...element.children.map(collectHtml)].join(" ");
}
