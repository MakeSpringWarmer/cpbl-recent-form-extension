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
    const baselineLabel = baseline === "career" ? "生涯" : "本季";
    const baselineOptions = [
      { value: "season", label: "本季", available: true },
      { value: "career", label: "生涯", available: Boolean(source.career) }
    ];
    const common = {
      kind: "player",
      playerType,
      playerTypeLabel: playerType === "pitcher" ? "投手" : "打者",
      baseline,
      baselineLabel,
      baselineOptions,
      title: `近期 ${count} 場 vs ${baselineLabel}`,
      count,
      hasData: recentGames.length > 0,
      showDetails: true,
      emptyMessage: "近期沒有可計算的出賽資料。可以直接調整上方場數再查看。",
      dateRange: formatDateRange(recentGames),
      todayKey: dateKey(now)
    };

    if (playerType === "pitcher") {
      const displayGames = addRestDays(recentGames, sortedGames);
      const recentTotals = pitcherTotals(displayGames);
      const baselineData = pitcherBaseline(source, sortedGames, baseline);
      const metrics = compareMetrics(
        pitcherMetrics(displayGames.length, recentTotals),
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
    const baselineTotals = batterBaseline(source, sortedGames, baseline);
    const metrics = compareMetrics(batterMetrics(recentTotals), batterMetrics(baselineTotals), baselineLabel);
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

  function buildTeam(source, count) {
    const games = sortNewest(source.games).slice(0, count);
    const totals = teamTotals(games);
    const metrics = teamMetrics(games, totals);
    return {
      kind: "team",
      teamName: source.teamName || "球隊",
      count,
      hasData: games.length > 0,
      games,
      dateRange: formatDateRange(games),
      metrics,
      summary: summarizeTeam(games, metrics)
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

    if (baseline === 0) {
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

    const rawDelta = (current - baseline) / Math.abs(baseline);
    const performanceDelta = metric.direction === "lower" ? -rawDelta : rawDelta;
    const displayDelta = metric.direction === "neutral" ? rawDelta : performanceDelta;
    const isEven = Math.abs(displayDelta) < 0.01;
    const tone = metric.direction === "neutral"
      ? "neutral"
      : isEven ? "even" : performanceDelta > 0 ? "positive" : "negative";
    const label = metric.direction === "neutral"
      ? isEven ? "接近基準" : `${rawDelta > 0 ? "較多" : "較少"} ${formatPercent(rawDelta)}`
      : isEven ? "接近基準" : `${performanceDelta > 0 ? "較佳" : "較差"} ${formatPercent(performanceDelta)}`;
    return {
      tone,
      label,
      baselineLabel,
      baselineValue: baselineMetric.value,
      baselineText: `${baselineLabel} ${baselineMetric.value}`,
      position: 50 + (clamp(displayDelta, -0.5, 0.5) * 80),
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
    return [
      { label: "近況", value: formatRecord(totals.wins, totals.losses, totals.ties), note: `近 ${games.length} 場` },
      { label: "得失分", value: `${totals.runsFor}-${totals.runsAgainst}`, note: `分差 ${formatRunDiff(totals.runsFor - totals.runsAgainst)}` },
      { label: "場均得分", value: formatDecimal(divide(totals.runsFor, games.length), 1), note: `總得分 ${totals.runsFor}` },
      { label: "場均失分", value: formatDecimal(divide(totals.runsAgainst, games.length), 1), note: `總失分 ${totals.runsAgainst}` }
    ];
  }

  function summarizeTeam(games, metrics) {
    if (games.length === 0) return "近期沒有可計算的比賽。";
    const latest = games[0];
    return `近 ${games.length} 場 ${metrics[0].value}，得失分 ${metrics[1].value}；目前${teamStreak(games)}，最近一場 ${formatDate(latest.date)} ${latest.homeAway}場對 ${latest.opponent} ${latest.result} ${latest.runsFor}-${latest.runsAgainst}。`;
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
    return value === "career" && source.career ? "career" : "season";
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function formatPercent(value) {
    const percent = Math.abs(value) * 100;
    return percent < 1 ? "<1%" : `${Math.round(percent)}%`;
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
