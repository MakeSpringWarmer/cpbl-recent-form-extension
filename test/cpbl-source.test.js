const test = require("node:test");
const assert = require("node:assert/strict");
const CpblSource = require("../src/adapters/cpbl-source.js");

test("player adapter hides fetch, token and official field names", async () => {
  const calls = [];
  const fetch = async (url, options) => {
    calls.push({ url, options });
    if (url.startsWith("/team/follow")) {
      return response({ text: "getFollowScore RequestVerificationToken: 'token-123' defendStation: '內野手' year: '2026'" });
    }
    return response({ json: { Success: true, FollowScore: JSON.stringify([{
      GameDate: "2026/6/27",
      FightTeamAbbrName: "兄弟",
      AtBatCnt: "4",
      HittingCnt: "2",
      TwoBaseHitCnt: "1",
      HomeRunCnt: "0",
      BasesONBallsCnt: "1"
    }]) } });
  };
  const cache = memoryStorage();
  const document = fakePlayerDocument("defendStation: '內野手'; year: '2026'");

  const source = await CpblSource.load({
    document,
    location: { pathname: "/team/follow", href: "https://cpbl.com.tw/team/follow?Acnt=42", origin: "https://cpbl.com.tw" },
    fetch,
    cache,
    now: new Date(2026, 5, 27).getTime()
  });

  assert.equal(source.kind, "player");
  assert.equal(source.playerType, "batter");
  assert.deepEqual(source.games[0], {
    date: "2026/06/27",
    opponent: "兄弟",
    plateAppearances: 0,
    atBats: 4,
    hits: 2,
    homeRuns: 0,
    walks: 1,
    hitByPitch: 0,
    sacrificeFlies: 0,
    totalBases: 3
  });
  assert.equal(calls.length, 2);
  assert.equal(calls[1].options.headers.RequestVerificationToken, "token-123");
});

test("player adapter reuses a fresh cache entry", async () => {
  const cache = memoryStorage({
    "follow:42:A:2026:投手": {
      updatedAt: new Date(2026, 5, 27).getTime(),
      context: { year: "2026", defendStation: "投手", isPitcher: true },
      rows: [{ GameDate: "2026/06/26", InningPitchedCnt: "1.2", PitchCnt: "24" }]
    }
  });
  const source = await CpblSource.load({
    document: fakePlayerDocument("defendStation: '投手'; year: '2026'", "投球成績"),
    location: { pathname: "/team/follow", href: "https://cpbl.com.tw/team/follow?Acnt=42", origin: "https://cpbl.com.tw" },
    fetch: async () => { throw new Error("fetch should not run"); },
    cache,
    now: new Date(2026, 5, 27).getTime()
  });

  assert.equal(source.playerType, "pitcher");
  assert.equal(source.games[0].inningsOuts, 5);
  assert.equal(source.games[0].pitches, 24);
});

test("team adapter hides table positions and normalizes the result", async () => {
  const cells = ["001", "洲際", "2026/6/26", "03:01", "測試隊", "5", "對手隊", "2", "測試隊"];
  const table = { querySelectorAll: () => [{ querySelectorAll: () => cells.map((textContent) => ({ textContent })) }] };
  const document = {
    querySelector(selector) {
      if (selector === "#bindVue .RecordTable table") return table;
      if (selector === ".ContHeader") return { textContent: "測試隊" };
      return null;
    }
  };

  const source = await CpblSource.load({
    document,
    location: { pathname: "/team/dailyrecord" },
    wait: async () => {}
  });

  assert.deepEqual(source, {
    kind: "team",
    teamName: "測試隊",
    games: [{
      gameNo: "001",
      field: "洲際",
      date: "2026/06/26",
      duration: "03:01",
      opponent: "對手隊",
      homeAway: "客",
      runsFor: 5,
      runsAgainst: 2,
      result: "W",
      resultTone: "win"
    }]
  });
});

function response({ text = "", json = null }) {
  return {
    ok: true,
    status: 200,
    async text() { return text; },
    async json() { return json; }
  };
}

function fakePlayerDocument(scriptText, bodyText = "") {
  return {
    body: { textContent: bodyText },
    scripts: [{ textContent: scriptText }],
    querySelector() { return null; }
  };
}

function memoryStorage(initial = {}) {
  const values = { ...initial };
  return {
    async get(key) { return { [key]: values[key] }; },
    async set(entries) { Object.assign(values, entries); }
  };
}
