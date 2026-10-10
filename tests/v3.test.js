import test from "node:test";
import assert from "node:assert/strict";
import { commandV3, freshV3, metricsV3 } from "../v3-business.js";
import { calculateSettlement } from "../public/settlement.js";
const seed = () => ({
  v3: freshV3(),
  tickets: [{ id: "T1", device: "spectator-test", type: "观赛" }],
  redemptions: [],
});
test("payment locked amount, callback idempotency, coupon face price and refund ledger", () => {
  const s = seed(),
    run = (path, b) => commandV3(s, path, { device: "spectator-test", ...b });
  const { order } = run("order", { amount: 258 }).result;
  assert.equal(order.paid, 228);
  assert.equal(order.discount, 30);
  const { record } = run("pay", {
    order: order.id,
    amount: 10000,
    discount: 10000,
  }).result;
  assert.equal(record.amount, 258);
  assert.equal(record.paid, 228);
  assert.equal(record.share, 7.74);
  assert.equal(s.v3.profiles["spectator-test"].memberPoints, 3460);
  run("pay", { order: order.id });
  assert.equal(s.redemptions.length, 1);
  assert.equal(s.v3.profiles["spectator-test"].memberPoints, 3460);
  const other = run("order", { amount: 258 }).result.order;
  assert.equal(other.discount, 0);
  const c = run("coupon-buy", {}).result.coupon;
  assert.throws(() => run("coupon-buy", {}), /已购买/);
  run("coupon-redeem", { code: c.id, amount: 1 });
  assert.equal(s.redemptions[0].amount, 198);
  assert.throws(() => run("coupon-redeem", { code: c.id }), /已使用/);
  run("refund", { order: order.id });
  assert.equal(record.status, "已退款");
  assert.equal(s.v3.profiles["spectator-test"].memberPoints, 3460);
  assert.equal(
    calculateSettlement(s.redemptions.filter((r) => r.status !== "已退款"))
      .consumption,
    315198,
  );
  assert.throws(() => run("refund", { order: order.id }), /无可退款/);
});
test("first registration deduction is separate from rank; conversion only after checkin", () => {
  const s = seed(),
    run = (path) => commandV3(s, path, { device: "spectator-test" });
  run("first-register");
  const p = s.v3.profiles["spectator-test"];
  assert.equal(p.memberPoints, 260);
  assert.equal(p.rankTotal, 50);
  assert.equal(metricsV3(s).converted, 14320);
  assert.throws(() => run("first-register"), /限未参赛观众/);
  run("first-checkin");
  assert.equal(p.rankTotal, 150);
  assert.equal(p.rankLedger.length, 2);
  assert.ok(p.rankLedger.every((x) => x.account === "段位分"));
  assert.ok(p.ledger.every((x) => x.account === "会员积分"));
  assert.equal(metricsV3(s).converted, 14321);
  assert.throws(() => run("first-checkin"), /已完成检录/);
  assert.throws(() => run("qualify"), /暂未达到/);
  commandV3(s, "qualify", { device: "demo-athlete-v3" });
  const q = s.v3.qualifications[0];
  assert.equal(q.status, "待主管部门审核");
  commandV3(s, "qualify-review", { id: q.id });
  assert.ok(q.certificate.startsWith("DEMO-CERT-"));
});
test("package creates tickets, quota and immutable accommodation redemption; tasks and inquiry", () => {
  const s = seed();
  const result = commandV3(s, "package-buy", {
    device: "new-package-user",
    package: "runner",
    consent: true,
  }).result;
  assert.equal(s.tickets.length, 2);
  assert.equal(metricsV3(s).quotaSold, 289);
  assert.equal(result.order.amount, 1280);
  const check = commandV3(s, "checkin", {
    code: result.order.id,
    amount: 1,
  }).result;
  assert.equal(check.record.amount, 680);
  assert.equal(check.record.share, 20.4);
  assert.throws(
    () => commandV3(s, "checkin", { code: result.order.id }),
    /已入住/,
  );
  assert.throws(
    () =>
      commandV3(s, "package-buy", {
        device: "new-package-user",
        package: "runner",
        consent: true,
      }),
    /已购买/,
  );
  commandV3(s, "task", { id: "first" });
  assert.equal(s.v3.tasks[1].touched, 12430);
  assert.throws(() => commandV3(s, "task", { id: "first" }), /已执行/);
  assert.throws(
    () => commandV3(s, "inquiry", { company: "示例单位", people: 9 }),
    /10至500/,
  );
  commandV3(s, "inquiry", { company: "示例工会", people: 24 });
  assert.equal(s.v3.inquiries[0].people, 24);
});
