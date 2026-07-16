(async function bootstrapRecentForm() {
  const { RecentForm, CpblSource, RecentFormPanel, GameCount, DateRange, ComparisonMode } = globalThis.CPBLRFV || {};
  if (!RecentForm || !CpblSource || !RecentFormPanel || !GameCount || !DateRange || !ComparisonMode) {
    console.debug("[CPBL RFV] modules were not loaded");
    return;
  }

  const mode = location.pathname.toLowerCase() === "/team/dailyrecord" ? "team" : "player";
  let source = null;
  let currentCount = null;
  let currentDateRange = { mode: "count", startDate: "", endDate: "" };
  let currentBaseline = "none";
  let panel = null;

  try {
    const [settings, dateRange, comparisonMode] = await Promise.all([
      GameCount.load(mode, chrome.storage.sync),
      DateRange.load(mode, chrome.storage.sync),
      mode === "player" ? ComparisonMode.load(chrome.storage.sync) : Promise.resolve("none")
    ]);
    currentCount = settings.count;
    currentDateRange = dateRange;
    currentBaseline = comparisonMode;
    panel = RecentFormPanel.mount({
      document,
      mode,
      countOptions: settings.options,
      async onCountChange(nextCount) {
        currentCount = await GameCount.save(mode, nextCount, chrome.storage.sync);
        currentDateRange = await DateRange.save(mode, { mode: "count" }, chrome.storage.sync);
        render();
      },
      async onDateRangeChange(nextDateRange) {
        currentDateRange = await DateRange.save(mode, nextDateRange, chrome.storage.sync);
        render();
      },
      async onBaselineChange(nextBaseline) {
        currentBaseline = await ComparisonMode.save(nextBaseline, chrome.storage.sync);
        render();
      }
    });
    if (!panel) return;

    panel.update({ status: "loading" });
    source = await CpblSource.load({
      document,
      location,
      fetch: globalThis.fetch.bind(globalThis),
      cache: chrome.storage.local,
      now: Date.now()
    });
    render();
  } catch (error) {
    panel?.update({
      status: "error",
      message: mode === "team" ? "暫時無法讀取逐日戰績。" : "暫時無法讀取 CPBL 數據。"
    });
    console.debug("[CPBL RFV]", error);
  }

  function render() {
    if (!source || !panel) return;
    panel.update({
      status: "ready",
      data: RecentForm.build(source, {
        count: currentCount,
        dateRange: currentDateRange,
        baseline: currentBaseline,
        now: new Date()
      })
    });
  }
})();
