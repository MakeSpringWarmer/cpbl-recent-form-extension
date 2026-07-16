(function exposeDateRange(root, factory) {
  const dateRange = factory();
  root.CPBLRFV = root.CPBLRFV || {};
  root.CPBLRFV.DateRange = dateRange;
  if (typeof module === "object" && module.exports) module.exports = dateRange;
})(typeof globalThis !== "undefined" ? globalThis : this, function createDateRange() {
  const KEYS = {
    player: "dateRange:player",
    team: "dateRange:team"
  };

  async function load(mode, storage) {
    const key = modeKey(mode);
    const stored = await storage.get([key]);
    return normalize(stored[key]);
  }

  async function save(mode, value, storage) {
    const key = modeKey(mode);
    const normalized = normalize(value);
    await storage.set({ [key]: normalized });
    return normalized;
  }

  function modeKey(mode) {
    const key = KEYS[mode];
    if (!key) throw new TypeError(`unknown date range mode: ${mode}`);
    return key;
  }

  function normalize(value) {
    if (!value || value.mode !== "date") {
      return { mode: "count", startDate: "", endDate: "" };
    }
    const startDate = normalizeDate(value.startDate);
    const endDate = normalizeDate(value.endDate);
    if (!startDate || !endDate || startDate > endDate) {
      return { mode: "count", startDate: "", endDate: "" };
    }
    return { mode: "date", startDate, endDate };
  }

  function normalizeDate(value) {
    const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return "";
    const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    const valid = date.getFullYear() === Number(match[1]) &&
      date.getMonth() === Number(match[2]) - 1 &&
      date.getDate() === Number(match[3]);
    return valid ? match[0] : "";
  }

  return { load, save };
});
