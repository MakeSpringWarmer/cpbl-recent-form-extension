const test = require("node:test");
const assert = require("node:assert/strict");
const DateRange = require("../src/settings/date-range.js");

test("keeps player and team date ranges independent", async () => {
  const storage = memoryStorage();
  await DateRange.save("player", {
    mode: "date",
    startDate: "2026-05-01",
    endDate: "2026-05-31"
  }, storage);
  await DateRange.save("team", { mode: "count" }, storage);

  assert.deepEqual(await DateRange.load("player", storage), {
    mode: "date",
    startDate: "2026-05-01",
    endDate: "2026-05-31"
  });
  assert.deepEqual(await DateRange.load("team", storage), {
    mode: "count",
    startDate: "",
    endDate: ""
  });
});

test("falls back to game count mode for invalid ranges", async () => {
  const storage = memoryStorage({
    "dateRange:player": {
      mode: "date",
      startDate: "2026-06-30",
      endDate: "2026-06-01"
    }
  });

  assert.deepEqual(await DateRange.load("player", storage), {
    mode: "count",
    startDate: "",
    endDate: ""
  });
});

function memoryStorage(initial = {}) {
  const values = { ...initial };
  return {
    async get(keys) {
      return Object.fromEntries(keys.filter((key) => key in values).map((key) => [key, values[key]]));
    },
    async set(entries) {
      Object.assign(values, entries);
    }
  };
}
