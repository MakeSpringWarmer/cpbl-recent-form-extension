const test = require("node:test");
const assert = require("node:assert/strict");
const RecentForm = require("../src/core/recent-form.js");

test("builds batter metrics from one normalized total", () => {
  const result = RecentForm.build({
    kind: "player",
    playerType: "batter",
    games: [
      { date: "2026/06/27", atBats: 4, hits: 2, walks: 1, totalBases: 3, homeRuns: 0 },
      { date: "2026/06/25", atBats: 3, hits: 1, hitByPitch: 1, totalBases: 4, homeRuns: 1 }
    ]
  }, { count: 5, now: new Date(2026, 5, 27) });

  assert.deepEqual(result.metrics.map(({ label, value }) => ({ label, value })), [
    { label: "AVG", value: ".429" },
    { label: "OBP", value: ".556" },
    { label: "SLG", value: "1.000" },
    { label: "OPS", value: "1.556" }
  ]);
  assert.match(result.summary, /3 支安打、1 次保送/);
  assert.match(result.summary, /其中 1 支全壘打/);
});

test("excludes today's appearance when describing the previous pitching date", () => {
  const result = RecentForm.build({
    kind: "player",
    playerType: "pitcher",
    games: [
      { date: "2026/06/20", inningsOuts: 3, pitches: 18, hitsAllowed: 1, earnedRuns: 0, walks: 0 },
      { date: "2026/06/24", inningsOuts: 18, pitches: 90, hitsAllowed: 5, earnedRuns: 2, walks: 2 },
      { date: "2026/06/27", inningsOuts: 3, pitches: 15, hitsAllowed: 1, earnedRuns: 1, walks: 1 }
    ]
  }, { count: 2, now: new Date(2026, 5, 27) });

  assert.equal(result.games[0].restDaysLabel, "3 天");
  assert.match(result.summary, /今日已登板；上次登板 2026\/06\/24，休息 3 天/);
  assert.deepEqual(result.metrics.map((metric) => metric.value), ["3.86", "1.29", "3.5", "53"]);
});

test("compares recent batter metrics against the full current season", () => {
  const source = {
    kind: "player",
    playerType: "batter",
    seasonYear: "2026",
    games: [
      { date: "2026/06/27", atBats: 4, hits: 2, totalBases: 3 },
      { date: "2026/06/25", atBats: 3, hits: 1, totalBases: 1 },
      { date: "2026/06/20", atBats: 3, hits: 0, totalBases: 0 }
    ]
  };

  const result = RecentForm.build(source, { count: 1, baseline: "season" });

  assert.equal(result.metrics[0].value, ".500");
  assert.equal(result.metrics[0].comparison.baselineText, "本季 .300");
  assert.equal(result.metrics[0].comparison.tone, "positive");
  assert.equal(result.metrics[0].comparison.label, "較佳 67%");
  assert.equal(result.title, "近期 1 場 vs 本季");
  assert.match(result.comparisonSummary, /相較本季/);
});

test("compares recent batter metrics against the official career aggregate", () => {
  const result = RecentForm.build({
    kind: "player",
    playerType: "batter",
    seasonYear: "2026",
    games: [{ date: "2026/06/27", atBats: 4, hits: 2, walks: 0, totalBases: 3 }],
    career: {
      appearances: 600,
      atBats: 2100,
      hits: 700,
      walks: 250,
      hitByPitch: 20,
      sacrificeFlies: 30,
      totalBases: 1120,
      homeRuns: 100
    }
  }, { count: 1, baseline: "career" });

  assert.equal(result.title, "近期 1 場 vs 生涯");
  assert.equal(result.hasData, true);
  assert.equal(result.showDetails, true);
  assert.equal(result.metrics[0].value, ".500");
  assert.equal(result.metrics[0].comparison.baselineText, "生涯 .333");
  assert.equal(result.metrics[0].comparison.tone, "positive");
});

test("treats lower ERA as better and pitching workload as neutral", () => {
  const result = RecentForm.build({
    kind: "player",
    playerType: "pitcher",
    games: [{ date: "2026/06/27", inningsOuts: 18, pitches: 90, hitsAllowed: 4, earnedRuns: 1, walks: 1 }],
    career: {
      appearances: 80,
      inningsOuts: 360,
      pitches: 1920,
      hitsAllowed: 100,
      earnedRuns: 40,
      walks: 32
    }
  }, { count: 1, baseline: "career", now: new Date(2026, 5, 27) });

  assert.deepEqual(result.metrics.map((metric) => metric.value), ["1.50", "0.83", "6.0", "90"]);
  assert.equal(result.metrics[0].comparison.baselineText, "生涯 3.00");
  assert.equal(result.metrics[0].comparison.tone, "positive");
  assert.equal(result.metrics[2].comparison.tone, "neutral");
  assert.equal(result.metrics[2].comparison.lowLabel, "較少");
  assert.equal(result.metrics[2].comparison.highLabel, "較多");
});

test("sorts team games newest first before calculating form", () => {
  const result = RecentForm.build({
    kind: "team",
    teamName: "測試隊",
    games: [
      { date: "2026/06/20", result: "L", runsFor: 1, runsAgainst: 3, homeAway: "客", opponent: "A" },
      { date: "2026/06/26", result: "W", runsFor: 5, runsAgainst: 2, homeAway: "主", opponent: "B" },
      { date: "2026/06/24", result: "W", runsFor: 4, runsAgainst: 3, homeAway: "主", opponent: "C" }
    ]
  }, { count: 2 });

  assert.deepEqual(result.games.map((game) => game.date), ["2026/06/26", "2026/06/24"]);
  assert.equal(result.metrics[0].value, "2W-0L");
  assert.deepEqual(result.metrics.slice(2), [
    { label: "場均得分", value: "4.5", note: "總得分 9" },
    { label: "場均失分", value: "2.5", note: "總失分 5" }
  ]);
  assert.match(result.summary, /目前2連勝/);
});

test("rejects unknown source kinds at the interface", () => {
  assert.throws(() => RecentForm.build({ kind: "unknown", games: [] }), TypeError);
});
