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
    if (url === "/team/getfollowscore") {
      return response({ json: { Success: true, FollowScore: JSON.stringify([{
        GameDate: "2026/6/27",
        FightTeamAbbrName: "兄弟",
        AtBatCnt: "4",
        HittingCnt: "2",
        TwoBaseHitCnt: "1",
        HomeRunCnt: "0",
        BasesONBallsCnt: "1"
      }]) } });
    }
    if (url.startsWith("/team/person")) {
      return response({ text: 'url: "/team/getbattingcareerscore", headers: { RequestVerificationToken: \'career-token\' }' });
    }
    return response({ json: { Success: true, BattingCareerScore: JSON.stringify([{
      TotalGames: 600,
      HitCnt: 2100,
      HittingCnt: 700,
      HomeRunCnt: 100,
      BasesONBallsCnt: 250,
      HitBYPitchCnt: 20,
      SacrificeFlyCnt: 30,
      TotalBases: 1120
    }]) } });
  };
  const cache = memoryStorage();
  const document = fakePlayerDocument("defendStation: '內野手'; year: '2026'", "打擊成績 投球成績");

  const source = await CpblSource.load({
    document,
    location: { pathname: "/team/follow", href: "https://cpbl.com.tw/team/follow?Acnt=42", origin: "https://cpbl.com.tw" },
    fetch,
    cache,
    now: new Date(2026, 5, 27).getTime()
  });

  assert.equal(source.kind, "player");
  assert.equal(source.playerType, "batter");
  assert.equal(source.seasonYear, "2026");
  assert.equal(source.career.appearances, 600);
  assert.equal(source.career.atBats, 2100);
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
  assert.equal(calls.length, 4);
  assert.equal(calls[1].options.headers.RequestVerificationToken, "token-123");
  assert.equal(calls[3].options.headers.RequestVerificationToken, "career-token");
});

test("explicit fielder position corrects a stale pitcher classification", async () => {
  const calls = [];
  const fetch = async (url) => {
    calls.push(url);
    if (url.startsWith("/team/person")) {
      return response({ text: 'url: "/team/getbattingcareerscore", headers: { RequestVerificationToken: \'career-token\' }' });
    }
    return response({ json: { Success: true, BattingCareerScore: JSON.stringify([{
      TotalGames: 600,
      HitCnt: 2100,
      HittingCnt: 700,
      TotalBases: 1120
    }]) } });
  };
  const cache = memoryStorage({
    "follow:42:A:2026:內野手": {
      updatedAt: new Date(2026, 5, 27).getTime(),
      context: { year: "2026", defendStation: "內野手", isPitcher: true },
      career: null,
      rows: [{ GameDate: "2026/06/26", AtBatCnt: "4", HittingCnt: "2" }]
    }
  });
  const source = await CpblSource.load({
    document: fakePlayerDocument("defendStation: '內野手'; year: '2026'", "投球成績"),
    location: { pathname: "/team/follow", href: "https://cpbl.com.tw/team/follow?Acnt=42", origin: "https://cpbl.com.tw" },
    fetch,
    cache,
    now: new Date(2026, 5, 27).getTime()
  });

  assert.equal(source.playerType, "batter");
  assert.equal(source.games[0].atBats, 4);
  assert.equal(source.games[0].hits, 2);
  assert.equal(source.career.atBats, 2100);
  assert.deepEqual(calls, ["/team/person?Acnt=42", "/team/getbattingcareerscore"]);
});

test("player adapter reuses a fresh cache entry", async () => {
  const cache = memoryStorage({
    "follow:42:A:2026:投手": {
      updatedAt: new Date(2026, 5, 27).getTime(),
      context: { year: "2026", defendStation: "投手", isPitcher: true },
      career: { TotalGames: 80, InningPitched: 120, InningPitchedDiv3: 2, PitchCnt: 1900 },
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
  assert.equal(source.career.inningsOuts, 362);
  assert.equal(source.career.appearances, 80);
});

test("player adapter falls back to stale cache after transient request failures", async () => {
  const oldTimestamp = new Date(2026, 5, 26).getTime();
  const cache = memoryStorage({
    "follow:42:A:2026:內野手": {
      updatedAt: oldTimestamp,
      context: { year: "2026", defendStation: "內野手", isPitcher: false },
      career: null,
      rows: [{ GameDate: "2026/06/25", AtBatCnt: "4", HittingCnt: "2", TotalBases: "3" }]
    }
  });
  let attempts = 0;
  const source = await CpblSource.load({
    document: fakePlayerDocument("defendStation: '內野手'; year: '2026'", "打擊成績"),
    location: { pathname: "/team/follow", href: "https://cpbl.com.tw/team/follow?Acnt=42", origin: "https://cpbl.com.tw" },
    fetch: async () => {
      attempts += 1;
      throw new TypeError("temporary network failure");
    },
    cache,
    wait: async () => {},
    now: new Date(2026, 5, 27).getTime()
  });

  assert.equal(attempts, 2);
  assert.equal(source.games[0].date, "2026/06/25");
  assert.equal(source.games[0].hits, 2);
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
