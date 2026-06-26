const DEFAULT_GAME_COUNT = 5;
const input = document.getElementById("gameCount");
const status = document.getElementById("status");
const presetButtons = Array.from(document.querySelectorAll("[data-count]"));

load();
input.addEventListener("change", save);
presetButtons.forEach((button) => {
  button.addEventListener("click", async () => {
    input.value = button.dataset.count;
    await save();
  });
});

async function load() {
  const stored = await chrome.storage.sync.get({ gameCount: DEFAULT_GAME_COUNT });
  input.value = stored.gameCount;
  updateActivePreset(stored.gameCount);
}

async function save() {
  const value = Math.min(20, Math.max(1, Math.round(Number(input.value) || DEFAULT_GAME_COUNT)));
  input.value = value;
  await chrome.storage.sync.set({ gameCount: value });
  updateActivePreset(value);
  status.textContent = "已儲存。重新整理球員頁後套用。";
}

function updateActivePreset(value) {
  presetButtons.forEach((button) => {
    button.classList.toggle("is-active", Number(button.dataset.count) === Number(value));
  });
}
