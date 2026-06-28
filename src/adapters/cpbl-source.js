(function exposeCpblSource(root, factory) {
  const cpblSource = factory();
  root.CPBLRFV = root.CPBLRFV || {};
  root.CPBLRFV.CpblSource = cpblSource;
  if (typeof module === "object" && module.exports) module.exports = cpblSource;
})(typeof globalThis !== "undefined" ? globalThis : this, function createCpblSource() {
  const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

  async function load(dependencies) {
    const { document, location } = dependencies || {};
    if (!document || !location) throw new TypeError("CpblSource.load requires document and location");

    if (location.pathname.toLowerCase() === "/team/dailyrecord") {
      return loadTeamSource(document, dependencies.wait);
    }
    return loadPlayerSource(dependencies);
  }

  async function loadPlayerSource({ document, location, fetch: fetcher, cache, now = Date.now() }) {
    if (typeof fetcher !== "function" || !cache) {
      throw new TypeError("Player source requires fetch and cache adapters");
    }

    const acnt = new URL(location.href).searchParams.get("Acnt");
    if (!acnt) throw new Error("missing player account");

    const pageContext = extractPlayerContext(document, now);
    const cacheKey = `follow:${acnt}:A:${pageContext.year}:${pageContext.defendStation}`;
    const cached = await cache.get(cacheKey);
    const cachedEntry = cached && cached[cacheKey];
    const cacheIsFresh = cachedEntry && now - cachedEntry.updatedAt < CACHE_TTL_MS;
    let context = cacheIsFresh ? normalizePlayerContext(cachedEntry.context || pageContext) : null;
    let rows = cacheIsFresh ? cachedEntry.rows : null;
    let career = cacheIsFresh && Object.hasOwn(cachedEntry, "career") ? cachedEntry.career : undefined;

    if (!rows || !context) {
      const followPage = await fetchText(fetcher, `/team/follow?Acnt=${encodeURIComponent(acnt)}`, {
        credentials: "include"
      }, "follow page");
      const token = extractFollowToken(followPage);
      context = {
        defendStation: matchFirst(followPage, /defendStation:\s*'([^']+)'/) || pageContext.defendStation,
        year: matchFirst(followPage, /year:\s*'(\d{4})'/) || pageContext.year,
        isPitcher: pageContext.isPitcher
      };
      context = normalizePlayerContext(context);
      rows = await fetchPlayerRows(fetcher, location, acnt, token, context);
    }

    if (career === undefined) {
      try {
        career = await fetchPlayerCareer(fetcher, location, acnt, context);
      } catch (error) {
        career = null;
        console.debug("[CPBL RFV] career data unavailable", error);
      }
    }

    await cache.set({ [cacheKey]: { rows, context, career, updatedAt: now } });
    return normalizePlayerSource(rows, context, career);
  }

  async function loadTeamSource(document, wait = defaultWait) {
    const rows = await waitForTeamRows(document, wait);
    const teamName = getCurrentTeamName(document);
    return {
      kind: "team",
      teamName,
      games: rows.map((cells) => parseTeamGame(cells, teamName)).filter(Boolean)
    };
  }

  async function fetchPlayerRows(fetcher, location, acnt, token, context) {
    const body = new URLSearchParams({
      acnt,
      defendStation: context.defendStation,
      year: context.year,
      kindCode: "A"
    });
    const response = await fetcher("/team/getfollowscore", {
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

  async function fetchPlayerCareer(fetcher, location, acnt, context) {
    const personPage = await fetchText(fetcher, `/team/person?Acnt=${encodeURIComponent(acnt)}`, {
      credentials: "include"
    }, "person page");
    const isPitcher = context.isPitcher || context.defendStation.includes("投手");
    const endpoint = isPitcher ? "/team/getpitchcareerscore" : "/team/getbattingcareerscore";
    const resultKey = isPitcher ? "PitchCareerScore" : "BattingCareerScore";
    const token = extractEndpointToken(personPage, endpoint);
    const response = await fetcher(endpoint, {
      method: "POST",
      credentials: "include",
      referrer: `${location.origin}/team/person?Acnt=${encodeURIComponent(acnt)}`,
      headers: {
        "Accept": "application/json, text/javascript, */*; q=0.01",
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        "RequestVerificationToken": token,
        "X-Requested-With": "XMLHttpRequest"
      },
      body: new URLSearchParams({ acnt, kindCode: "A" })
    });
    if (!response.ok) throw new Error(`career score ${response.status}`);
    const result = await response.json();
    if (!result.Success) throw new Error("career score unsuccessful");
    return JSON.parse(result[resultKey] || "[]")[0] || null;
  }

  async function fetchText(fetcher, url, options, label) {
    const response = await fetcher(url, options);
    if (!response.ok) throw new Error(`${label} ${response.status}`);
    return response.text();
  }

  function extractPlayerContext(document, now) {
    const bodyText = document.body && document.body.textContent || "";
    const scriptText = Array.from(document.scripts || []).map((script) => script.textContent || "").join("\n");
    const defendStation = matchFirst(scriptText, /defendStation:\s*'([^']+)'/) ||
      document.querySelector(".PlayerBrief .pos .desc")?.textContent?.trim() || "";
    const year = matchFirst(scriptText, /year:\s*'(\d{4})'/) || String(new Date(now).getFullYear());
    return normalizePlayerContext({
      defendStation,
      year,
      isPitcher: bodyText.includes("投球成績")
    });
  }

  function normalizePlayerContext(context = {}) {
    const defendStation = normalizeText(context.defendStation);
    return {
      ...context,
      defendStation,
      isPitcher: defendStation ? defendStation.includes("投手") : Boolean(context.isPitcher)
    };
  }

  function extractFollowToken(html) {
    const token = matchFirst(html, /getFollowScore[\s\S]*?RequestVerificationToken:\s*'([^']+)'/);
    if (!token) throw new Error("missing follow score token");
    return token;
  }

  function extractEndpointToken(html, endpoint) {
    const escapedEndpoint = endpoint.replaceAll("/", "\\/");
    const pattern = new RegExp(`url:\\s*["']${escapedEndpoint}["'][\\s\\S]*?RequestVerificationToken:\\s*'([^']+)'`);
    const token = matchFirst(html, pattern);
    if (!token) throw new Error(`missing token for ${endpoint}`);
    return token;
  }

  function normalizePlayerSource(rows, context, careerRow = null) {
    const playerType = context.isPitcher || context.defendStation.includes("投手") ? "pitcher" : "batter";
    return {
      kind: "player",
      playerType,
      seasonYear: context.year,
      career: normalizeCareer(careerRow, playerType),
      games: (Array.isArray(rows) ? rows : []).map((row) => normalizePlayerGame(row, playerType)).filter(Boolean)
    };
  }

  function normalizeCareer(row, playerType) {
    if (!row) return null;
    if (playerType === "pitcher") {
      return {
        appearances: number(row.TotalGames),
        inningsOuts: aggregateInningsToOuts(row),
        pitches: number(row.PitchCnt),
        hitsAllowed: number(row.HittingCnt),
        earnedRuns: number(row.EarnedRunCnt),
        walks: number(row.BasesONBallsCnt)
      };
    }
    return {
      appearances: number(row.TotalGames),
      atBats: number(row.HitCnt),
      hits: number(row.HittingCnt),
      homeRuns: number(row.HomeRunCnt),
      walks: number(row.BasesONBallsCnt),
      hitByPitch: number(row.HitBYPitchCnt),
      sacrificeFlies: number(row.SacrificeFlyCnt),
      totalBases: number(row.TotalBases)
    };
  }

  function normalizePlayerGame(row, playerType) {
    const date = normalizeDate(row && row.GameDate);
    if (!date) return null;

    if (playerType === "pitcher") {
      return {
        date,
        opponent: normalizeText(row.FightTeamAbbrName) || "-",
        role: normalizeText(row.RoleType) || "登板",
        inningsOuts: inningsToOuts(row.InningPitchedCnt),
        innings: String(row.InningPitchedCnt ?? "-"),
        pitches: number(row.PitchCnt),
        hitsAllowed: number(row.HittingCnt),
        earnedRuns: number(row.EarnedRunCnt),
        walks: number(row.BasesONBallsCnt)
      };
    }

    const hits = number(row.HittingCnt);
    const doubles = number(row.TwoBaseHitCnt);
    const triples = number(row.ThreeBaseHitCnt);
    const homeRuns = number(row.HomeRunCnt);
    return {
      date,
      opponent: normalizeText(row.FightTeamAbbrName) || "-",
      plateAppearances: number(row.PlateAppearances),
      atBats: number(row.AtBatCnt ?? row.HitCnt),
      hits,
      homeRuns,
      walks: number(row.BasesONBallsCnt),
      hitByPitch: number(row.HitBYPitchCnt),
      sacrificeFlies: number(row.SacrificeFlyCnt),
      totalBases: number(row.TotalBases) || hits + doubles + (triples * 2) + (homeRuns * 3)
    };
  }

  async function waitForTeamRows(document, wait) {
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const rows = readTeamRows(document);
      if (rows.length > 0) return rows;
      await wait(250);
    }
    throw new Error("daily record rows not found");
  }

  function readTeamRows(document) {
    const table = document.querySelector("#bindVue .RecordTable table") || document.querySelector(".RecordTable table");
    if (!table) return [];
    return Array.from(table.querySelectorAll("tr"))
      .map((row) => Array.from(row.querySelectorAll("td")).map((cell) => normalizeText(cell.textContent)))
      .filter((cells) => cells.length >= 9);
  }

  function parseTeamGame(cells, teamName) {
    const awayTeam = cells[4];
    const awayScore = Number(cells[5]);
    const homeTeam = cells[6];
    const homeScore = Number(cells[7]);
    const winner = cells[8];
    const date = normalizeDate(cells[2]);
    if (!date || !Number.isFinite(awayScore) || !Number.isFinite(homeScore)) return null;

    const isHome = sameTeamName(homeTeam, teamName);
    const isAway = sameTeamName(awayTeam, teamName);
    if (!isHome && !isAway) return null;
    const runsFor = isHome ? homeScore : awayScore;
    const runsAgainst = isHome ? awayScore : homeScore;
    const result = runsFor === runsAgainst || !winner ? "T" : runsFor > runsAgainst ? "W" : "L";
    return {
      gameNo: cells[0],
      field: cells[1],
      date,
      duration: cells[3],
      opponent: isHome ? awayTeam : homeTeam,
      homeAway: isHome ? "主" : "客",
      runsFor,
      runsAgainst,
      result,
      resultTone: result === "W" ? "win" : result === "L" ? "loss" : "tie"
    };
  }

  function getCurrentTeamName(document) {
    const title = document.querySelector(".PageTitle h2");
    if (title) {
      const clone = title.cloneNode(true);
      clone.querySelectorAll(".en").forEach((node) => node.remove());
      const text = normalizeText(clone.textContent);
      if (text) return text;
    }
    return normalizeText(document.querySelector(".ContHeader")?.textContent) || "球隊";
  }

  function sameTeamName(value, teamName) {
    return normalizeTeamName(value) === normalizeTeamName(teamName);
  }

  function normalizeTeamName(value) {
    return normalizeText(value)
      .replace(/Monkeys|Brothers|Lions|Guardians|Dragons|TSG Hawks/gi, "")
      .replace(/\s+/g, "");
  }

  function normalizeDate(value) {
    const match = String(value || "").match(/(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
    if (!match) return null;
    return `${match[1]}/${match[2].padStart(2, "0")}/${match[3].padStart(2, "0")}`;
  }

  function inningsToOuts(value) {
    const [whole, partial = "0"] = String(value ?? "0").split(".");
    return (Number.parseInt(whole, 10) || 0) * 3 + (Number.parseInt(partial, 10) || 0);
  }

  function aggregateInningsToOuts(row) {
    if (row.InningPitchedDiv3 !== undefined && row.InningPitchedDiv3 !== null) {
      return Math.floor(number(row.InningPitched)) * 3 + number(row.InningPitchedDiv3);
    }
    return inningsToOuts(row.InningPitched);
  }

  function number(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function normalizeText(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function matchFirst(text, pattern) {
    return String(text || "").match(pattern)?.[1] || "";
  }

  function defaultWait(milliseconds) {
    return new Promise((resolve) => setTimeout(resolve, milliseconds));
  }

  return { load };
});
