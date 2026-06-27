const test = require("node:test");
const assert = require("node:assert/strict");
const GameCount = require("../src/settings/game-count.js");

test("keeps player and team game counts independent", async () => {
  const storage = memoryStorage();
  await GameCount.save("player", 10, storage);
  await GameCount.save("team", 15, storage);

  assert.deepEqual(await GameCount.load("player", storage), { count: 10, options: [3, 5, 10] });
  assert.deepEqual(await GameCount.load("team", storage), { count: 15, options: [5, 10, 15] });
});

test("reads the legacy setting only when it is valid for the page", async () => {
  const storage = memoryStorage({ gameCount: 5 });
  assert.equal((await GameCount.load("player", storage)).count, 5);
  assert.equal((await GameCount.load("team", storage)).count, 5);
});

test("falls back when a legacy custom popup value is not supported inline", async () => {
  const storage = memoryStorage({ gameCount: 7 });
  assert.equal((await GameCount.load("player", storage)).count, 5);
  assert.equal((await GameCount.load("team", storage)).count, 10);
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
