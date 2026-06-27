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
      baseline: "season",
      baselineOptions: [
        { value: "season", label: "本季", available: true },
        { value: "career", label: "生涯", available: true }
      ],
      title: "近期 5 場 vs 本季",
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

  const html = collectHtml(document.mount.inserted);
  assert.match(html, /近期 5 場 vs 本季/);
  assert.match(html, /比較基準/);
  assert.match(html, /data-baseline="career"/);
  assert.match(html, /較佳 20%/);
  assert.match(html, /相較本季，3 項較佳、1 項較差/);
  assert.match(html, /cpbl-rfv-benchmark/);
  assert.match(html, /--rfv-marker-x: 66%/);
  assert.match(html, /↑/);
  assert.match(html, /較差/);
  assert.match(html, /本季 \.250/);
  assert.match(html, /較佳/);
  assert.match(html, /近 5 場/);
  assert.match(html, /近期測試摘要/);
  assert.match(html, /測試隊/);

  panel.update({
    status: "ready",
    data: {
      kind: "player",
      playerType: "batter",
      playerTypeLabel: "打者",
      baseline: "career",
      baselineOptions: [
        { value: "season", label: "本季", available: true },
        { value: "career", label: "生涯", available: true }
      ],
      title: "近期 5 場 vs 生涯",
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
  assert.match(careerHtml, /近期 5 場 vs 生涯/);
  assert.match(careerHtml, /生涯 \.320/);
  assert.match(careerHtml, /--rfv-marker-x: 45%/);
  assert.match(careerHtml, /↓/);
  assert.match(careerHtml, /data-game-count/);
  assert.match(careerHtml, /逐場表現/);

  panel.update({
    status: "ready",
    data: {
      kind: "player",
      playerType: "pitcher",
      playerTypeLabel: "投手",
      baseline: "season",
      baselineOptions: [{ value: "season", label: "本季", available: true }],
      title: "近期 5 場 vs 本季",
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
      games: []
    }
  });

  const pitcherHtml = collectHtml(document.mount.inserted);
  assert.match(pitcherHtml, /ERA/);
  assert.match(pitcherHtml, /WHIP/);
  assert.match(pitcherHtml, /局數／場/);
  assert.match(pitcherHtml, /平均用球/);
  assert.match(pitcherHtml, /較多 11%/);
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
