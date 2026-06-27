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
  assert.deepEqual(result.metrics.map((metric) => metric.value), ["3.86", "1.29", "7", "53"]);
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
  assert.match(result.summary, /目前2連勝/);
});

test("rejects unknown source kinds at the interface", () => {
  assert.throws(() => RecentForm.build({ kind: "unknown", games: [] }), TypeError);
});
