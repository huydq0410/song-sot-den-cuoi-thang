import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the financial game loading state and metadata", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<html lang="vi">/i);
  assert.match(html, /<title>Sống Sót Đến Cuối Tháng<\/title>/i);
  assert.match(html, /Mini game quản lý tài chính/);
  assert.match(html, /class="loading-screen"/);
  assert.match(html, /Đang mở sổ tháng này…/);
  assert.match(html, /property="og:image"/);
});

test("wires unique scenario generation through API, UI, and Supabase", async () => {
  const [engine, route, page, runMigration, scenarioMigration] =
    await Promise.all([
      readFile(new URL("../lib/scenario-engine.ts", import.meta.url), "utf8"),
      readFile(new URL("../app/api/game/run/route.ts", import.meta.url), "utf8"),
      readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
      readFile(
        new URL(
          "../supabase/migrations/20260726152000_create_unique_game_runs.sql",
          import.meta.url,
        ),
        "utf8",
      ),
      readFile(
        new URL(
          "../supabase/migrations/20260726153500_prevent_scenario_reuse.sql",
          import.meta.url,
        ),
        "utf8",
      ),
    ]);

  assert.match(engine, /generateScenarioDeck/);
  assert.match(engine, /createSchedule/);
  assert.match(engine, /scenarioLogicFingerprintPayload/);
  assert.match(route, /crypto\.subtle\.digest/);
  assert.match(route, /OPENAI_API_KEY/);
  assert.match(route, /json_schema/);
  assert.match(route, /reserve_game_run/);
  assert.match(page, /fetch\("\/api\/game\/run"/);
  assert.match(page, /game\.scenarios\?\.\[game\.day - 1\]/);
  assert.match(page, /generateScenarioDeck\(profileId, seed\)/);
  assert.match(runMigration, /fingerprint text not null unique/);
  assert.match(scenarioMigration, /unique \(profile_id, fingerprint\)/);
  assert.match(scenarioMigration, /jsonb_array_length\(p_scenario_fingerprints\) <> 30/);
});
