(function exposeComparisonMode(root, factory) {
  const comparisonMode = factory();
  root.CPBLRFV = root.CPBLRFV || {};
  root.CPBLRFV.ComparisonMode = comparisonMode;
  if (typeof module === "object" && module.exports) module.exports = comparisonMode;
})(typeof globalThis !== "undefined" ? globalThis : this, function createComparisonMode() {
  const KEY = "comparisonMode:player";
  const OPTIONS = ["none", "season", "career"];

  async function load(storage) {
    const stored = await storage.get([KEY]);
    return normalize(stored[KEY]);
  }

  async function save(value, storage) {
    const normalized = normalize(value);
    await storage.set({ [KEY]: normalized });
    return normalized;
  }

  function normalize(value) {
    return OPTIONS.includes(value) ? value : "none";
  }

  return { load, save };
});
