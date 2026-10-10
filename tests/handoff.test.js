import test from "node:test";
import assert from "node:assert/strict";
import { commandV3, freshV3, metricsV3 } from "../v3-business.js";
import { makeV3, merchantV3 } from "../public/v3-ui.js";
const seed = () => ({
  v3: freshV3(),
  tickets: [{ id: "HB2027-0006-015801", device: "handoff-user", type: "观赛" }],
  redemptions: [],
});
test("coupon empty state leads to purchase; paid coupon carries actual code into merchant form and receipt", () => {
  const s = seed();
  assert.match(merchantV3(s, "coupon"), /data-action="go-buy-coupon"/);
  assert.doesNotMatch(merchantV3(s, "coupon"), /id="coupon-form"/);
  assert.match(
    makeV3({ state: s, device: "handoff-user", tab: "coupons" }),
    /claim-for-coupon/,
  );
  const c = commandV3(s, "coupon-buy", { device: "handoff-user" }).result
    .coupon;
  const consumer = makeV3({
    state: s,
    device: "handoff-user",
    ticket: s.tickets[0],
    tab: "coupons",
  });
  assert.ok(
    consumer.includes(`data-action="handoff-coupon" data-code="${c.id}"`),
  );
  const merchant = merchantV3(s, "coupon", { couponCode: c.id });
  assert.ok(merchant.includes(`value="${c.id}"`));
  assert.match(merchant, /novalidate/);
  assert.throws(
    () => commandV3(s, "coupon-redeem", { code: "0790" }),
    /票根与验证码/,
  );
  const { record } = commandV3(s, "coupon-redeem", {
    code: " " + c.id.toLowerCase() + " ",
  }).result;
  assert.match(
    merchantV3(s, "success", { resultId: record.id }),
    /权益券核销成功/,
  );
  assert.match(merchantV3(s, "success", { resultId: record.id }), /198.00/);
  assert.doesNotMatch(merchantV3(s, "coupon"), /id="coupon-form"/);
});
test("hotel purchase hands off complete credential; ticket lookup chooses a pending order and receipt", () => {
  const s = seed();
  s.ops = metricsV3(s);
  assert.match(merchantV3(s, "hotel"), /data-action="go-buy-package"/);
  assert.doesNotMatch(merchantV3(s, "hotel"), /id="hotel-form"/);
  const order = commandV3(s, "package-buy", {
    device: "handoff-user",
    package: "runner",
    consent: true,
  }).result.order;
  const html = makeV3({
    state: s,
    device: "handoff-user",
    ticket: s.tickets[0],
    tab: "package-orders",
  });
  assert.ok(
    html.includes(`data-action="handoff-package" data-code="${order.id}"`),
  );
  assert.ok(
    merchantV3(s, "hotel", { packageCode: order.id }).includes(
      `value="${order.id}"`,
    ),
  );
  assert.throws(
    () => commandV3(s, "checkin", { code: "0790" }),
    /不是4位手机验证码/,
  );
  const { record } = commandV3(s, "checkin", {
    code: order.id.toLowerCase(),
  }).result;
  assert.match(
    merchantV3(s, "success", { resultId: record.id }),
    /入住核销成功/,
  );
  commandV3(s, "package-buy", {
    device: "handoff-user",
    package: "family",
    consent: true,
  });
  commandV3(s, "checkin", { code: s.tickets[0].id });
  assert.ok(s.v3.packageOrders.every((o) => o.status === "已入住"));
});
