import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

test("four-terminal lifecycle, deduplication, validation, SSE, settlement and reset", async () => {
  const dir = mkdtempSync(join(tmpdir(), "hb-demo-test-"));
  const proc = spawn(process.execPath, ["server.js"], {
    env: { ...process.env, PORT: "3011", DATA_DIR: dir },
    stdio: ["ignore", "pipe", "pipe"],
  });
  await new Promise((resolve, reject) => {
    proc.stdout.once("data", resolve);
    proc.once("error", reject);
    proc.once("exit", (code) => reject(Error("server exit " + code)));
  });
  const get = async () =>
    await (await fetch("http://127.0.0.1:3011/api/state")).json();
  const post = async (p, b) => {
    const r = await fetch("http://127.0.0.1:3011/api/" + p, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(b),
    });
    return { status: r.status, body: await r.json() };
  };
  const controller = new AbortController();
  try {
    const initial = await get();
    assert.equal(initial.events.length, 11);
    assert.equal(initial.totals.real, 366300);
    assert.equal(
      initial.events.reduce((s, e) => s + e.reported, 0),
      376008,
    );
    assert.equal(
      initial.events.reduce((s, e) => s + e.estimated, 0),
      391328,
    );
    const stream = await fetch("http://127.0.0.1:3011/api/stream", {
      signal: controller.signal,
    });
    const reader = stream.body.getReader();
    assert.match(
      new TextDecoder().decode((await reader.read()).value),
      /366300/,
    );
    assert.equal(
      (
        await post("tickets", {
          device: "demo-test-user",
          type: "观赛",
          consent: false,
        })
      ).status,
      400,
    );
    const created = await post("tickets", {
      device: "demo-test-user",
      type: "观赛",
      consent: true,
    });
    assert.equal(created.status, 200);
    const ticket = created.body.ticket;
    assert.equal(created.body.state.totals.real, 366301);
    const update = new TextDecoder().decode((await reader.read()).value);
    assert.match(update, /366301/);
    assert.equal(
      (
        await post("tickets", {
          device: "demo-test-user",
          type: "观赛",
          consent: true,
        })
      ).body.ticket.id,
      ticket.id,
    );
    assert.equal((await get()).tickets.length, 1);
    assert.equal(
      (await post("redeem", { ticket: "missing", amount: 258 })).status,
      410,
    );
    assert.equal(
      (await post("v3/order", { device: "demo-test-user", amount: "NaN" }))
        .status,
      400,
    );
    assert.equal(
      (await post("v3/order", { device: "demo-test-user", amount: -1 })).status,
      400,
    );
    const locked = await post("v3/order", {
      device: "demo-test-user",
      amount: 258,
    });
    assert.equal(locked.body.order.paid, 228);
    const redeemed = await post("v3/pay", {
      device: "demo-test-user",
      order: locked.body.order.id,
      amount: 999,
    });
    assert.equal(redeemed.status, 200);
    assert.equal(redeemed.body.record.share, 7.74);
    assert.equal(redeemed.body.state.totals.consumption, 315258);
    assert.equal(redeemed.body.state.totals.redemptions, 1261);
    assert.equal(redeemed.body.state.totals.merchantShare, 9457.74);
    assert.equal(redeemed.body.state.totals.income, 59142.74);
    assert.equal(
      (
        await post("v3/pay", {
          device: "demo-test-user",
          order: locked.body.order.id,
        })
      ).body.record.id,
      redeemed.body.record.id,
    );
    assert.equal(
      (await post("bill", { action: "confirm" })).body.billStatus,
      "待省局确认",
    );
    assert.equal(
      (await post("bill", { action: "confirm" })).body.billStatus,
      "已确认",
    );
    assert.equal((await post("bill", { action: "confirm" })).status, 409);
    assert.equal(
      (await post("bill", { action: "dispute" })).body.billStatus,
      "对账中",
    );
    assert.equal(
      (await post("bill", { action: "resolve" })).body.billStatus,
      "待办赛方确认",
    );
    assert.equal(
      (
        await post("bill", {
          action: "destination",
          value: "注入赛事扶持资金池",
        })
      ).body.destination,
      "注入赛事扶持资金池",
    );
    await post("audit", {});
    assert.ok((await get()).audit.some((a) => a.action === "导出脱敏演示数据"));
    const participant = await post("tickets", {
      device: "demo-participant",
      type: "参赛",
      consent: true,
    });
    assert.equal(participant.body.state.totals.tickets, 15801);
    assert.equal(participant.body.state.totals.real, 366302);
    const beforeReset = (await get()).revision;
    const reset = await post("reset", {});
    assert.ok(reset.body.revision > beforeReset);
    assert.equal(reset.body.totals.consumption, 315000);
    assert.equal(reset.body.tickets.length, 0);
    assert.equal(reset.body.redemptions.length, 0);
  } finally {
    controller.abort();
    proc.kill();
    await new Promise((resolve) => proc.once("exit", resolve));
    rmSync(dir, { recursive: true, force: true });
  }
});
