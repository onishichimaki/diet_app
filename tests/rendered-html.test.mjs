import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

test("includes the complete Habi dashboard experience", async () => {
  const source = await readFile(new URL("../app/HabiApp.tsx", import.meta.url), "utf8");
  assert.match(source, /Habi/);
  assert.match(source, /今日のカロリー/);
  assert.match(source, /さっと記録/);
  assert.match(source, /食事を記録/);
  assert.match(source, /からだの記録/);
  assert.match(source, /あなたのレポート/);
  assert.match(source, /目標と設定/);
  assert.doesNotMatch(source, /codex-preview|Your site is taking shape|Building your site/);
});

test("ships site-specific metadata and removes starter dependencies", async () => {
  const [layout, page, packageJson] = await Promise.all([
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);

  assert.match(layout, /Habi — 今日を、ちょっといい日に。/);
  assert.match(layout, /openGraph/);
  assert.match(layout, /\/og\.png/);
  assert.match(page, /<HabiApp \/>/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
  await access(new URL("../public/og.png", import.meta.url));
});
