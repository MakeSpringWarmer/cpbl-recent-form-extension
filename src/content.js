(async function bootstrapRecentForm() {
  const { RecentForm, CpblSource, RecentFormPanel, GameCount } = globalThis.CPBLRFV || {};
  if (!RecentForm || !CpblSource || !RecentFormPanel || !GameCount) {
    console.debug("[CPBL RFV] modules were not loaded");
    return;
  }

  const mode = location.pathname.toLowerCase() === "/team/dailyrecord" ? "team" : "player";
  let source = null;
  let currentCount = null;
  let currentBaseline = "season";
  let panel = null;

  try {
    const settings = await GameCount.load(mode, chrome.storage.sync);
    currentCount = settings.count;
    panel = RecentFormPanel.mount({
      document,
      mode,
      countOptions: settings.options,
      async onCountChange(nextCount) {
        currentCount = await GameCount.save(mode, nextCount, chrome.storage.sync);
        render();
      },
      async onBaselineChange(nextBaseline) {
        currentBaseline = nextBaseline;
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
      data: RecentForm.build(source, { count: currentCount, baseline: currentBaseline, now: new Date() })
    });
  }
})();
