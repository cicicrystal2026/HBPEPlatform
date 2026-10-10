import test from "node:test";
import assert from "node:assert/strict";
import { freshV3, commandV3 } from "../v3-business.js";
import { makeV3 } from "../public/v3-ui.js";
import { readFileSync } from "node:fs";
test("one user retains scores, ticket and orders across spectator and athlete identity views", () => {
  const device = "identity-test";
  const state = {
    v3: freshV3(),
    tickets: [{ id: "same-ticket", device }],
    redemptions: [],
  };
  commandV3(state, "account", { device });
  const p = state.v3.profiles[device];
  p.memberPoints = 860;
  p.rank = 2;
  p.rankTotal = 150;
  p.rankAnnual = 150;
  const before = JSON.stringify(state);
  const ctx = { state, device, tab: "me", ticket: state.tickets[0] };
  const spectator = makeV3({ ...ctx, identityView: "spectator" });
  const athlete = makeV3({ ...ctx, identityView: "athlete" });
  assert.match(spectator, /观众积分 · 可积可兑/);
  assert.doesNotMatch(spectator, /累计段位分/);
  assert.match(athlete, /累计段位分/);
  assert.match(athlete, /荣誉勋章/);
  assert.doesNotMatch(athlete, /spectator-points/);
  assert.ok(spectator.includes(p.name) && athlete.includes(p.name));
  assert.equal(JSON.stringify(state), before);
  commandV3(state, "account", { device });
  assert.equal(state.v3.profiles[device], p);
  assert.equal(p.memberPoints, 860);
  const wall = makeV3({ ...ctx, tab: "rank", identityView: "athlete" });
  assert.equal((wall.match(/class="honor-item /g) || []).length, 9);
  assert.equal((wall.match(/class="honor-item earned"/g) || []).length, 2);
  const app = readFileSync(
    new URL("../public/app.js", import.meta.url),
    "utf8",
  );
  assert.doesNotMatch(app, /demo-athlete-v3|spectatorDevice/);
});
