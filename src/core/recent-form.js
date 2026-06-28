(function exposeRecentForm(root, factory) {
  const recentForm = factory();
  root.CPBLRFV = root.CPBLRFV || {};
  root.CPBLRFV.RecentForm = recentForm;
  if (typeof module === "object" && module.exports) module.exports = recentForm;
})(typeof globalThis !== "undefined" ? globalThis : this, function createRecentForm() {
  function build(source, options = {}) {
    if (!source || !["player", "team"].includes(source.kind)) {
      throw new TypeError("RecentForm.build requires a player or team source");
    }

    const count = positiveInteger(options.count, 5);
    const now = validDate(options.now) || new Date();
    return source.kind === "team"
      ? buildTeam(source, count)
      : buildPlayer(source, count, now, options.baseline);
  }

  function buildPlayer(source, count, now, requestedBaseline) {
    const sortedGames = sortNewest(source.games);
    const recentGames = sortedGames.slice(0, count);
    const playerType = source.playerType === "pitcher" ? "pitcher" : "batter";
    const baseline = normalizeBaseline(requestedBaseline, source);
    const baselineLabel = baseline === "career" ? "生涯" : baseline === "season" ? "本季" : "";
    const baselineOptions = [
      { value: "none", label: "近況", available: true },
      { value: "season", label: "比較本季", available: true },
      { value: "career", label: "比較生涯", available: Boolean(source.career) }
    ];
    const common = {
      kind: "player",
      playerType,
      playerTypeLabel: playerType === "pitcher" ? "投手" : "打者",
      baseline,
      baselineLabel,
      baselineOptions,
      title: baseline === "none" ? `近 ${count} 場表現` : `近 ${count} 場｜比較${baselineLabel}`,
      count,
      hasData: recentGames.length > 0,
      showDetails: true,
      emptyMessage: "近期沒有可計算的出賽資料。可以直接調整上方場數再查看。",
      dateRange: formatDateRange(recentGames),
      todayKey: dateKey(now),
      trends: playerTrends(sortedGames, count, playerType)
    };

    if (playerType === "pitcher") {
      const displayGames = addRestDays(recentGames, sortedGames);
      const recentTotals = pitcherTotals(displayGames);
      const recentMetrics = pitcherMetrics(displayGames.length, recentTotals);
      if (baseline === "none") {
        return {
          ...common,
          summary: summarizePitcher(displayGames, recentTotals, `近 ${displayGames.length} 場`, displayGames.length, now),
          comparisonSummary: "",
          metrics: recentMetrics,
          games: displayGames
        };
      }
      const baselineData = pitcherBaseline(source, sortedGames, baseline);
      const metrics = compareMetrics(
        recentMetrics,
        pitcherMetrics(baselineData.appearances, baselineData.totals),
        baselineLabel
      );
      const comparisonSummary = summarizeComparison(metrics, baselineLabel);
      return {
        ...common,
        summary: summarizePitcher(displayGames, recentTotals, `近 ${displayGames.length} 場`, displayGames.length, now),
        comparisonSummary,
        metrics,
        games: displayGames
      };
    }

    const recentTotals = batterTotals(recentGames);
    const recentMetrics = batterMetrics(recentTotals);
    if (baseline === "none") {
      return {
        ...common,
        summary: summarizeBatter(recentTotals, `近 ${recentGames.length} 場`),
        comparisonSummary: "",
        metrics: recentMetrics,
        games: recentGames
      };
    }
    const baselineTotals = batterBaseline(source, sortedGames, baseline);
    const metrics = compareMetrics(recentMetrics, batterMetrics(baselineTotals), baselineLabel);
    const comparisonSummary = summarizeComparison(metrics, baselineLabel);
    return {
      ...common,
      summary: summarizeBatter(recentTotals, `近 ${recentGames.length} 場`),
      comparisonSummary,
      metrics,
      games: recentGames
    };
  }

  function batterBaseline(source, seasonGames, baseline) {
    return baseline === "career" && source.career
      ? batterTotals([source.career])
      : batterTotals(seasonGames);
  }

  function pitcherBaseline(source, seasonGames, baseline) {
    if (baseline === "career" && source.career) {
      return {
        appearances: number(source.career.appearances),
        totals: pitcherTotals([source.career])
      };
    }
    return {
      appearances: seasonGames.length,
      totals: pitcherTotals(seasonGames)
    };
  }

  function playerTrends(seasonGames, count, playerType) {
    const chronologicalGames = seasonGames.slice().reverse();
    const windowSize = Math.min(count, chronologicalGames.length);
    const points = [];
    for (let index = windowSize - 1; index < chronologicalGames.length; index += 1) {
      const windowGames = chronologicalGames.slice(index - windowSize + 1, index + 1);
      const metrics = playerType === "pitcher"
        ? pitcherMetrics(windowGames.length, pitcherTotals(windowGames))
        : batterMetrics(batterTotals(windowGames));
      points.push(playerTrendPoint(index + 1, chronologicalGames[index], metrics, playerType));
    }
    const seasonMetrics = playerType === "pitcher"
      ? pitcherMetrics(chronologicalGames.length, pitcherTotals(chronologicalGames))
      : batterMetrics(batterTotals(chronologicalGames));
    const seasonGameCount = chronologicalGames.length;
    return {
      playerType,
      windowSize,
      seasonGameCount,
      recentStartGame: Math.max(1, seasonGameCount - count + 1),
      season: playerTrendValues(seasonMetrics, playerType),
      points
    };
  }

  function playerTrendPoint(gameNumber, game, metrics, playerType) {
    return {
      gameNumber,
      date: game.date,
      opponent: game.opponent,
      ...playerTrendValues(metrics, playerType)
    };
  }

  function playerTrendValues(metrics, playerType) {
    return playerType === "pitcher"
      ? { era: metrics[0].rawValue, whip: metrics[1].rawValue }
      : { avg: metrics[0].rawValue, ops: metrics[3].rawValue };
  }

  function buildTeam(source, count) {
    const seasonGames = sortNewest(source.games);
    const games = seasonGames.slice(0, count);
    const totals = teamTotals(games);
    const seasonTotals = teamTotals(seasonGames);
    const metrics = compareMetrics(
      teamMetrics(games, totals),
      teamMetrics(seasonGames, seasonTotals),
      "本季"
    );
    return {
      kind: "team",
      teamName: source.teamName || "球隊",
      count,
      hasData: games.length > 0,
      games,
      seasonGameCount: seasonGames.length,
      dateRange: formatDateRange(games),
      metrics,
      comparisonSummary: summarizeComparison(metrics, "本季"),
      trends: teamTrends(seasonGames, count, seasonTotals),
      summary: summarizeTeam(games, totals)
    };
  }

  function batterTotals(games) {
    return games.reduce((totals, game) => {
      totals.ab += number(game.atBats);
      totals.h += number(game.hits);
      totals.bb += number(game.walks);
      totals.hbp += number(game.hitByPitch);
      totals.sf += number(game.sacrificeFlies);
      totals.tb += number(game.totalBases);
      totals.hr += number(game.homeRuns);
      return totals;
    }, { ab: 0, h: 0, bb: 0, hbp: 0, sf: 0, tb: 0, hr: 0 });
  }

  function batterMetrics(totals) {
    const avg = divide(totals.h, totals.ab);
    const obp = divide(totals.h + totals.bb + totals.hbp, totals.ab + totals.bb + totals.hbp + totals.sf);
    const slg = divide(totals.tb, totals.ab);
    const ops = Number.isFinite(obp + slg) ? obp + slg : NaN;
    return [
      { label: "AVG", value: formatRate(avg), rawValue: avg, direction: "higher", note: `${totals.h} H / ${totals.ab} AB` },
      { label: "OBP", value: formatRate(obp), rawValue: obp, direction: "higher", note: `${totals.bb} BB · ${totals.hbp} HBP` },
      { label: "SLG", value: formatRate(slg), rawValue: slg, direction: "higher", note: `${totals.tb} TB` },
      { label: "OPS", value: formatRate(ops), rawValue: ops, direction: "higher", note: "OBP + SLG" }
    ];
  }

  function summarizeBatter(totals, scopeLabel) {
    const avg = formatRate(divide(totals.h, totals.ab));
    const obp = divide(totals.h + totals.bb + totals.hbp, totals.ab + totals.bb + totals.hbp + totals.sf);
    const slg = divide(totals.tb, totals.ab);
    const ops = Number.isFinite(obp + slg) ? formatRate(obp + slg) : "-";
    const powerText = totals.hr > 0 ? `，其中 ${totals.hr} 支全壘打` : "";
    return `${scopeLabel}合計 ${totals.h} 支安打、${totals.bb} 次保送，打擊率 ${avg}、OPS ${ops}${powerText}。`;
  }

  function pitcherTotals(games) {
    return games.reduce((totals, game) => {
      totals.outs += number(game.inningsOuts);
      totals.er += number(game.earnedRuns);
      totals.bb += number(game.walks);
      totals.h += number(game.hitsAllowed);
      totals.pitches += number(game.pitches);
      return totals;
    }, { outs: 0, er: 0, bb: 0, h: 0, pitches: 0 });
  }

  function pitcherMetrics(appearances, totals) {
    const innings = totals.outs / 3;
    const inningsPerGame = divide(innings, appearances);
    const pitchesPerGame = divide(totals.pitches, appearances);
    const era = divide(totals.er * 9, innings);
    const whip = divide(totals.bb + totals.h, innings);
    return [
      { label: "ERA", group: "effect", value: formatDecimal(era), rawValue: era, direction: "lower", note: `${totals.er} ER` },
      { label: "WHIP", group: "effect", value: formatDecimal(whip), rawValue: whip, direction: "lower", note: `${totals.h} H · ${totals.bb} BB` },
      { label: "局數／場", group: "workload", value: formatDecimal(inningsPerGame, 1), rawValue: inningsPerGame, direction: "neutral", note: `${outsToInnings(totals.outs)} IP · ${appearances} 場` },
      { label: "平均用球", group: "workload", value: formatDecimal(pitchesPerGame, 0), rawValue: pitchesPerGame, direction: "neutral", note: "每場平均" }
    ];
  }

  function compareMetrics(recentMetrics, baselineMetrics, baselineLabel) {
    return recentMetrics.map((metric, index) => {
      const baselineMetric = baselineMetrics[index];
      const comparison = compareMetric(metric, baselineMetric, baselineLabel);
      return { ...metric, comparison };
    });
  }

  function compareMetric(metric, baselineMetric, baselineLabel) {
    const current = metric.rawValue;
    const baseline = baselineMetric?.rawValue;
    const unavailable = !Number.isFinite(current) || !Number.isFinite(baseline);
    if (unavailable) {
      return {
        tone: "unavailable",
        label: "資料不足",
        baselineLabel,
        baselineValue: baselineMetric?.value || "-",
        baselineText: `${baselineLabel} ${baselineMetric?.value || "-"}`,
        position: 50,
        lowLabel: metric.direction === "neutral" ? "較少" : "較差",
        highLabel: metric.direction === "neutral" ? "較多" : "較佳"
      };
    }

    const usesDifference = metric.comparisonType === "difference";
    if (baseline === 0 && !usesDifference) {
      const isEqual = current === 0;
      return {
        tone: isEqual ? "even" : "unavailable",
        label: isEqual ? "接近基準" : "無法比較",
        baselineLabel,
        baselineValue: baselineMetric.value,
        baselineText: `${baselineLabel} ${baselineMetric.value}`,
        position: 50,
        lowLabel: metric.direction === "neutral" ? "較少" : "較差",
        highLabel: metric.direction === "neutral" ? "較多" : "較佳"
      };
    }

    const rawDelta = usesDifference ? current - baseline : (current - baseline) / Math.abs(baseline);
    const performanceDelta = metric.direction === "lower" ? -rawDelta : rawDelta;
    const displayDelta = metric.direction === "neutral" ? rawDelta : performanceDelta;
    const isEven = Math.abs(displayDelta) < 0.01;
    const tone = metric.direction === "neutral"
      ? "neutral"
      : isEven ? "even" : performanceDelta > 0 ? "positive" : "negative";
    const label = metric.direction === "neutral"
      ? isEven ? "接近基準" : `${rawDelta > 0 ? "較多" : "較少"} ${formatComparisonDelta(rawDelta, usesDifference)}`
      : isEven ? "接近基準" : `${performanceDelta > 0 ? "較佳" : "較差"} ${formatComparisonDelta(performanceDelta, usesDifference)}`;
    const positionDelta = usesDifference ? displayDelta / number(metric.comparisonScale || 1) : displayDelta;
    return {
      tone,
      label,
      baselineLabel,
      baselineValue: baselineMetric.value,
      baselineText: `${baselineLabel} ${baselineMetric.value}`,
      position: 50 + (clamp(positionDelta, -0.5, 0.5) * 80),
      lowLabel: metric.direction === "neutral" ? "較少" : "較差",
      highLabel: metric.direction === "neutral" ? "較多" : "較佳"
    };
  }

  function summarizeComparison(metrics, baselineLabel) {
    const performanceMetrics = metrics.filter((metric) => metric.direction !== "neutral" && metric.comparison.tone !== "unavailable");
    if (performanceMetrics.length === 0) return `目前沒有足夠資料與${baselineLabel}比較。`;
    const better = performanceMetrics.filter((metric) => metric.comparison.tone === "positive").length;
    const worse = performanceMetrics.filter((metric) => metric.comparison.tone === "negative").length;
    if (better === performanceMetrics.length) return `相較${baselineLabel}，近期指標全數較佳。`;
    if (worse === performanceMetrics.length) return `相較${baselineLabel}，近期指標全數較差。`;
    const parts = [];
    if (better > 0) parts.push(`${better} 項較佳`);
    if (worse > 0) parts.push(`${worse} 項較差`);
    const even = performanceMetrics.length - better - worse;
    if (even > 0) parts.push(`${even} 項接近基準`);
    return `相較${baselineLabel}，${parts.join("、")}。`;
  }

  function summarizePitcher(games, totals, scopeLabel, appearances, now) {
    const averagePitches = formatDecimal(divide(totals.pitches, appearances), 0);
    const restText = now ? `；${pitcherRestSummary(games, now)}` : "";
    return `${scopeLabel}登板合計 ${outsToInnings(totals.outs)} 局、${totals.er} 自責分，平均 ${averagePitches} 球${restText}。`;
  }

  function pitcherRestSummary(games, now) {
    const todayKey = dateKey(now);
    const latestGame = games[0];
    const pitchedToday = latestGame && dateKey(latestGame.date) === todayKey;
    const previousGame = pitchedToday
      ? games.find((game) => dateKey(game.date) !== todayKey)
      : latestGame;

    if (!previousGame) return pitchedToday ? "今日已登板" : "上次登板日期未知";

    const daysSincePrevious = daysBetween(previousGame.date, now);
    const restText = daysSincePrevious === null ? "休息天數未知" : `休息 ${daysSincePrevious} 天`;
    const prefix = pitchedToday ? "今日已登板；" : "";
    return `${prefix}上次登板 ${formatDate(previousGame.date)}，${restText}`;
  }

  function addRestDays(games, allGames) {
    return games.map((game) => {
      const currentDate = validDate(game.date);
      const previous = allGames.find((candidate) => {
        const candidateDate = validDate(candidate.date);
        return currentDate && candidateDate && candidateDate < currentDate;
      });
      const restDays = previous ? daysBetween(previous.date, game.date) : null;
      return {
        ...game,
        restDays,
        restDaysLabel: restDays === null ? "本季首次" : `${restDays} 天`
      };
    });
  }

  function teamTotals(games) {
    return games.reduce((totals, game) => {
      if (game.result === "W") totals.wins += 1;
      if (game.result === "L") totals.losses += 1;
      if (game.result === "T") totals.ties += 1;
      totals.runsFor += number(game.runsFor);
      totals.runsAgainst += number(game.runsAgainst);
      return totals;
    }, {
      wins: 0, losses: 0, ties: 0,
      runsFor: 0, runsAgainst: 0
    });
  }

  function teamMetrics(games, totals) {
    const winPercentage = divide(totals.wins, totals.wins + totals.losses);
    const runsPerGame = divide(totals.runsFor, games.length);
    const runsAllowedPerGame = divide(totals.runsAgainst, games.length);
    const runDifferentialPerGame = divide(totals.runsFor - totals.runsAgainst, games.length);
    return [
      { label: "勝率", value: formatRate(winPercentage), rawValue: winPercentage, direction: "higher", note: formatRecord(totals.wins, totals.losses, totals.ties) },
      { label: "場均得分", value: formatDecimal(runsPerGame, 1), rawValue: runsPerGame, direction: "higher", note: `總得分 ${totals.runsFor}` },
      { label: "場均失分", value: formatDecimal(runsAllowedPerGame, 1), rawValue: runsAllowedPerGame, direction: "lower", note: `總失分 ${totals.runsAgainst}` },
      {
        label: "場均分差",
        value: formatSignedDecimal(runDifferentialPerGame, 1),
        rawValue: runDifferentialPerGame,
        direction: "higher",
        comparisonType: "difference",
        comparisonScale: 4,
        note: `得失分 ${totals.runsFor}-${totals.runsAgainst}`
      }
    ];
  }

  function teamTrends(seasonGames, count, seasonTotals) {
    const chronologicalGames = seasonGames.slice().reverse();
    const windowSize = Math.min(count, chronologicalGames.length);
    const points = [];
    for (let index = windowSize - 1; index < chronologicalGames.length; index += 1) {
      const windowGames = chronologicalGames.slice(index - windowSize + 1, index + 1);
      const totals = teamTotals(windowGames);
      points.push({
        gameNumber: index + 1,
        date: chronologicalGames[index].date,
        opponent: chronologicalGames[index].opponent,
        winPercentage: divide(totals.wins, totals.wins + totals.losses),
        runsPerGame: divide(totals.runsFor, windowGames.length),
        runsAllowedPerGame: divide(totals.runsAgainst, windowGames.length)
      });
    }
    const seasonGameCount = chronologicalGames.length;
    const recentStartGame = Math.max(1, seasonGameCount - count + 1);
    const observations = chronologicalGames.map((game, index) => ({
      gameNumber: index + 1,
      date: game.date,
      opponent: game.opponent,
      result: game.result,
      runsFor: number(game.runsFor),
      runsAgainst: number(game.runsAgainst),
      isRecent: index + 1 >= recentStartGame
    }));
    return {
      windowSize,
      seasonGameCount,
      recentStartGame,
      season: {
        winPercentage: divide(seasonTotals.wins, seasonTotals.wins + seasonTotals.losses),
        runsPerGame: divide(seasonTotals.runsFor, seasonGameCount),
        runsAllowedPerGame: divide(seasonTotals.runsAgainst, seasonGameCount)
      },
      points,
      observations
    };
  }

  function summarizeTeam(games, totals) {
    if (games.length === 0) return "近期沒有可計算的比賽。";
    const latest = games[0];
    return `近 ${games.length} 場 ${formatRecord(totals.wins, totals.losses, totals.ties)}，得失分 ${totals.runsFor}-${totals.runsAgainst}；目前${teamStreak(games)}，最近一場 ${formatDate(latest.date)} ${latest.homeAway}場對 ${latest.opponent} ${latest.result} ${latest.runsFor}-${latest.runsAgainst}。`;
  }

  function teamStreak(games) {
    const firstResult = games[0] && games[0].result;
    if (!firstResult) return "無連續紀錄";
    let count = 0;
    for (const game of games) {
      if (game.result !== firstResult) break;
      count += 1;
    }
    const label = firstResult === "W" ? "連勝" : firstResult === "L" ? "連敗" : "連和";
    return `${count}${label}`;
  }

  function sortNewest(games) {
    return Array.isArray(games)
      ? games.slice().filter((game) => validDate(game.date)).sort((a, b) => validDate(b.date) - validDate(a.date))
      : [];
  }

  function validDate(value) {
    if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : new Date(value.getTime());
    const match = String(value || "").match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
    if (match) {
      const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
      return Number.isNaN(date.getTime()) ? null : date;
    }
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function formatDateRange(games) {
    if (games.length === 0) return "無近期資料";
    const dates = games.map((game) => validDate(game.date)).filter(Boolean);
    if (dates.length === 0) return "日期未知";
    const newest = new Date(Math.max(...dates));
    const oldest = new Date(Math.min(...dates));
    return newest.getTime() === oldest.getTime()
      ? formatDate(newest)
      : `${formatDate(oldest)} - ${formatDate(newest)}`;
  }

  function formatDate(value) {
    const date = validDate(value);
    if (!date) return String(value || "-");
    return `${date.getFullYear()}/${pad(date.getMonth() + 1)}/${pad(date.getDate())}`;
  }

  function dateKey(value) {
    const date = validDate(value);
    return date ? formatDate(date) : "";
  }

  function daysBetween(startValue, endValue) {
    const startDate = validDate(startValue);
    const endDate = validDate(endValue);
    if (!startDate || !endDate) return null;
    const start = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
    const end = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
    return Math.max(0, Math.round((end - start) / 86400000));
  }

  function number(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function divide(numerator, denominator) {
    return denominator > 0 ? numerator / denominator : NaN;
  }

  function positiveInteger(value, fallback) {
    const parsed = Math.round(Number(value));
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  }

  function normalizeBaseline(value, source) {
    if (value === "season") return "season";
    if (value === "career" && source.career) return "career";
    return "none";
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function formatPercent(value) {
    const percent = Math.abs(value) * 100;
    return percent < 1 ? "<1%" : `${Math.round(percent)}%`;
  }

  function formatComparisonDelta(value, usesDifference) {
    return usesDifference ? formatSignedDecimal(value, 1) : formatPercent(value);
  }

  function outsToInnings(outs) {
    const innings = Math.floor(outs / 3);
    const remainder = outs % 3;
    return remainder ? `${innings}.${remainder}` : String(innings);
  }

  function formatRate(value) {
    return Number.isFinite(value) ? value.toFixed(3).replace(/^0/, "") : "-";
  }

  function formatDecimal(value, digits = 2) {
    return Number.isFinite(value) ? value.toFixed(digits) : "-";
  }

  function formatSignedDecimal(value, digits = 1) {
    if (!Number.isFinite(value)) return "-";
    const formatted = value.toFixed(digits);
    return value > 0 ? `+${formatted}` : formatted;
  }

  function formatRecord(wins, losses, ties) {
    return ties > 0 ? `${wins}W-${losses}L-${ties}T` : `${wins}W-${losses}L`;
  }

  function formatRunDiff(value) {
    return value > 0 ? `+${value}` : String(value);
  }

  function pad(value) {
    return String(value).padStart(2, "0");
  }

  return { build };
});
