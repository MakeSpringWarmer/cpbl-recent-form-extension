const test = require("node:test");
const assert = require("node:assert/strict");
const RecentFormPanel = require("../src/ui/recent-form-panel.js");

test("mounts once and owns loading and ready states", () => {
  const document = new FakeDocument();
  const panel = RecentFormPanel.mount({
    document,
    mode: "player",
    countOptions: [3, 5, 10],
    onCountChange: async () => {}
  });

  assert.ok(panel);
  assert.equal(document.mount.inserted.id, "cpbl-rfv-panel");

  panel.update({ status: "loading" });
  assert.match(document.mount.inserted.children[1].textContent, /正在讀取近期表現/);

  panel.update({
    status: "ready",
    data: {
      kind: "player",
      playerType: "batter",
      playerTypeLabel: "打者",
      count: 5,
      dateRange: "2026/06/20 - 2026/06/27",
      summary: "近期測試摘要。",
      metrics: [{ label: "AVG", value: ".300", note: "3 H / 10 AB" }],
      games: [{ date: "2026/06/27", opponent: "測試隊", plateAppearances: 4, atBats: 3, hits: 1, homeRuns: 0, walks: 1 }]
    }
  });

  const html = collectHtml(document.mount.inserted);
  assert.match(html, /近期 5 場表現/);
  assert.match(html, /近期測試摘要/);
  assert.match(html, /測試隊/);
});

class FakeDocument {
  constructor() {
    this.mount = new FakeElement(this);
  }

  getElementById() {
    return null;
  }

  querySelector(selector) {
    return selector === ".ContHeader" ? this.mount : null;
  }

  createElement() {
    return new FakeElement(this);
  }
}

class FakeElement {
  constructor(ownerDocument) {
    this.ownerDocument = ownerDocument;
    this.children = [];
    this.innerHTML = "";
    this.textContent = "";
    this.className = "";
    this.id = "";
  }

  setAttribute() {}

  insertAdjacentElement(_position, element) {
    this.inserted = element;
  }

  appendChild(element) {
    this.children.push(element);
    return element;
  }

  append(...elements) {
    this.children.push(...elements);
  }

  querySelectorAll() {
    return [];
  }
}

function collectHtml(element) {
  return [element.innerHTML, element.textContent, ...element.children.map(collectHtml)].join(" ");
}
