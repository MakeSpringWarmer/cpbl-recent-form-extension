(function exposeGameCount(root, factory) {
  const gameCount = factory();
  root.CPBLRFV = root.CPBLRFV || {};
  root.CPBLRFV.GameCount = gameCount;
  if (typeof module === "object" && module.exports) module.exports = gameCount;
})(typeof globalThis !== "undefined" ? globalThis : this, function createGameCount() {
  const CONFIG = {
    player: { key: "gameCount:player", options: [3, 5, 10], fallback: 5 },
    team: { key: "gameCount:team", options: [5, 10, 15], fallback: 10 }
  };

  async function load(mode, storage) {
    const config = modeConfig(mode);
    const stored = await storage.get([config.key, "gameCount"]);
    const preferred = stored[config.key] ?? stored.gameCount;
    return {
      count: normalize(preferred, config),
      options: config.options.slice()
    };
  }

  async function save(mode, count, storage) {
    const config = modeConfig(mode);
    const normalized = normalize(count, config);
    await storage.set({ [config.key]: normalized });
    return normalized;
  }

  function modeConfig(mode) {
    const config = CONFIG[mode];
    if (!config) throw new TypeError(`unknown game count mode: ${mode}`);
    if (!config.options.includes(config.fallback)) throw new Error(`invalid fallback for ${mode}`);
    return config;
  }

  function normalize(value, config) {
    const parsed = Number(value);
    return config.options.includes(parsed) ? parsed : config.fallback;
  }

  return { load, save };
});
