const test = require("node:test");
const assert = require("node:assert/strict");
const ComparisonMode = require("../src/settings/comparison-mode.js");

test("defaults to plain metrics and remembers a comparison choice", async () => {
  const storage = memoryStorage();

  assert.equal(await ComparisonMode.load(storage), "none");
  assert.equal(await ComparisonMode.save("career", storage), "career");
  assert.equal(await ComparisonMode.load(storage), "career");
});

test("normalizes an unknown comparison choice to plain metrics", async () => {
  const storage = memoryStorage({ "comparisonMode:player": "unknown" });
  assert.equal(await ComparisonMode.load(storage), "none");
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
