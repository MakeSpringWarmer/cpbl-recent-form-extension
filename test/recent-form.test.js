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
  assert.equal(result.baseline, "none");
  assert.equal(result.title, "近 5 場表現");
  assert.ok(result.metrics.every((metric) => !metric.comparison));
  assert.equal(result.comparisonSummary, "");
  assert.match(result.summary, /3 支安打、1 次保送/);
  assert.match(result.summary, /其中 1 支全壘打/);
  assert.equal(result.trends.playerType, "batter");
  assert.equal(result.trends.windowSize, 2);
  assert.equal(result.trends.seasonGameCount, 2);
  assert.equal(result.trends.points.length, 1);
  assert.deepEqual(result.trends.timeline.map(({ gameNumber, date }) => ({ gameNumber, date })), [
    { gameNumber: 1, date: "2026/06/25" },
    { gameNumber: 2, date: "2026/06/27" }
  ]);
  assert.equal(result.trends.points[0].windowStartDate, "2026/06/25");
  assert.equal(result.trends.points[0].windowEndDate, "2026/06/27");
  assert.ok(Math.abs(result.trends.points[0].avg - (3 / 7)) < 0.000001);
  assert.ok(Math.abs(result.trends.points[0].ops - (14 / 9)) < 0.000001);
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
  assert.equal(result.trends.playerType, "pitcher");
  assert.equal(result.trends.windowSize, 2);
  assert.deepEqual(result.trends.points.map((point) => point.gameNumber), [2, 3]);
  assert.ok(Math.abs(result.trends.points[1].era - (27 / 7)) < 0.000001);
  assert.ok(Math.abs(result.trends.points[1].whip - (9 / 7)) < 0.000001);
});

test("normalizes player trends so upward always means better", () => {
  const result = RecentForm.build({
    kind: "player",
    playerType: "pitcher",
    games: [
      { date: "2026/05/01", inningsOuts: 9, earnedRuns: 3, hitsAllowed: 5, walks: 2 },
      { date: "2026/05/08", inningsOuts: 9, earnedRuns: 0, hitsAllowed: 1, walks: 0 },
      { date: "2026/05/15", inningsOuts: 9, earnedRuns: 0, hitsAllowed: 1, walks: 0 }
    ]
  }, { count: 1 });

  assert.ok(result.trends.points[0].eraForm < 0);
  assert.ok(result.trends.points[2].eraForm > 0);
  assert.ok(result.trends.points[2].whipForm > 0);
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
  assert.equal(result.title, "近 1 場｜比較本季");
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

  assert.equal(result.title, "近 1 場｜比較生涯");
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
  assert.deepEqual(result.metrics.map(({ label, value }) => ({ label, value })), [
    { label: "勝率", value: "1.000" },
    { label: "場均得分", value: "4.5" },
    { label: "場均失分", value: "2.5" },
    { label: "場均分差", value: "+2.0" }
  ]);
  assert.equal(result.metrics[0].comparison.baselineValue, ".667");
  assert.equal(result.metrics[0].comparison.tone, "positive");
  assert.equal(result.metrics[2].comparison.tone, "positive");
  assert.equal(result.metrics[3].comparison.label, "較佳 +1.3");
  assert.match(result.comparisonSummary, /相較本季/);
  assert.equal(result.trends.windowSize, 2);
  assert.deepEqual(result.trends.points.map((point) => ({
    gameNumber: point.gameNumber,
    winPercentage: point.winPercentage,
    runsPerGame: point.runsPerGame,
    runsAllowedPerGame: point.runsAllowedPerGame
  })), [
    { gameNumber: 2, winPercentage: 0.5, runsPerGame: 2.5, runsAllowedPerGame: 3 },
    { gameNumber: 3, winPercentage: 1, runsPerGame: 4.5, runsAllowedPerGame: 2.5 }
  ]);
  assert.deepEqual(result.trends.observations.map(({ gameNumber, result, runsFor, runsAgainst, isRecent }) => ({
    gameNumber,
    result,
    runsFor,
    runsAgainst,
    isRecent
  })), [
    { gameNumber: 1, result: "L", runsFor: 1, runsAgainst: 3, isRecent: false },
    { gameNumber: 2, result: "W", runsFor: 4, runsAgainst: 3, isRecent: true },
    { gameNumber: 3, result: "W", runsFor: 5, runsAgainst: 2, isRecent: true }
  ]);
  assert.equal(result.trends.points[1].runDifferentialPerGame, 2);
  assert.ok(result.trends.points[1].winForm > 0);
  assert.match(result.summary, /目前2連勝/);
});

test("compares team run differential when the season baseline is zero", () => {
  const result = RecentForm.build({
    kind: "team",
    games: [
      { date: "2026/06/20", result: "L", runsFor: 2, runsAgainst: 3 },
      { date: "2026/06/21", result: "W", runsFor: 4, runsAgainst: 3 }
    ]
  }, { count: 1 });

  assert.equal(result.metrics[3].comparison.baselineValue, "0.0");
  assert.equal(result.metrics[3].comparison.tone, "positive");
  assert.equal(result.metrics[3].comparison.label, "較佳 +1.0");
});

test("filters statistics by an inclusive custom date range", () => {
  const result = RecentForm.build({
    kind: "player",
    playerType: "batter",
    games: [
      { date: "2026/05/01", atBats: 4, hits: 0, totalBases: 0 },
      { date: "2026/05/10", atBats: 4, hits: 2, totalBases: 3 },
      { date: "2026/05/20", atBats: 4, hits: 4, totalBases: 6 },
      { date: "2026/06/01", atBats: 4, hits: 1, totalBases: 1 }
    ]
  }, {
    count: 2,
    baseline: "season",
    dateRange: { mode: "date", startDate: "2026-05-10", endDate: "2026-05-20" }
  });

  assert.equal(result.scopeMode, "date");
  assert.equal(result.scopeLabel, "期間 2 場");
  assert.equal(result.dateRange, "2026/05/10 - 2026/05/20");
  assert.deepEqual(result.games.map((game) => game.date), ["2026/05/20", "2026/05/10"]);
  assert.equal(result.metrics[0].value, ".750");
  assert.equal(result.metrics[0].comparison.baselineText, "本季 .438");
  assert.equal(result.trends.windowSize, 2);
  assert.equal(result.trends.recentStartGame, 2);
  assert.equal(result.trends.recentEndGame, 3);
  assert.match(result.title, /2026\/05\/10 - 2026\/05\/20｜2 場｜比較本季/);
});

test("rejects unknown source kinds at the interface", () => {
  assert.throws(() => RecentForm.build({ kind: "unknown", games: [] }), TypeError);
});

test("returns an empty state when CPBL has no game rows", () => {
  const player = RecentForm.build({ kind: "player", playerType: "batter", games: [] }, { count: 5 });
  const team = RecentForm.build({ kind: "team", games: [] }, { count: 10 });

  assert.equal(player.hasData, false);
  assert.equal(player.trends.points.length, 0);
  assert.equal(team.hasData, false);
  assert.equal(team.trends.points.length, 0);
});
