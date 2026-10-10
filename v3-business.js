import { randomUUID } from "node:crypto";
import { packages, taskSeeds } from "./public/v3-data.js";
export const freshV3 = () => ({
  profiles: {},
  orders: [],
  coupons: [],
  packageOrders: [],
  inquiries: [],
  qualifications: [],
  growthActive: false,
  growthCount: 0,
  tasks: structuredClone(taskSeeds),
});
const fail = (message, status = 400) => {
  throw Object.assign(Error(message), { status });
};
const validDevice = (device) => {
  if (!/^[a-zA-Z0-9_-]{8,80}$/.test(device || "")) fail("演示账号无效");
};
export function profileFor(state, device) {
  validDevice(device);
  return (state.v3.profiles[device] ||= {
    device,
    name: device === "demo-athlete-v3" ? "张*" : "演示观众",
    athlete: device === "demo-athlete-v3",
    memberPoints: 3260,
    memberEarned: 3260,
    rankAnnual: device === "demo-athlete-v3" ? 2360 : 0,
    rankTotal: device === "demo-athlete-v3" ? 4180 : 0,
    rank: device === "demo-athlete-v3" ? 4 : 1,
    firstUsed: false,
    ledger: [
      {
        id: "opening",
        account: "会员积分",
        value: 3260,
        balance: 3260,
        reason: "开场余额（含已计领票积分）",
        rule: "DEMO-2027-v3",
      },
    ],
  });
}
const points = (p, value, reason, order) => {
  p.memberPoints += value;
  if (value > 0 || reason === "退款冲减核销积分") p.memberEarned += value;
  p.ledger.unshift({
    id: randomUUID(),
    account: "会员积分",
    value,
    balance: p.memberPoints,
    reason,
    order,
    rule: "DEMO-2027-v3 · 核销固定200分",
  });
};
const rankPoints = (p, value, reason, order) => {
  p.rankAnnual += value;
  p.rankTotal += value;
  p.rankLedger ||= [];
  p.rankLedger.unshift({
    id: randomUUID(),
    account: "段位分",
    value,
    balance: p.rankTotal,
    reason,
    order,
    rule: "RANK-2027-v1",
  });
};
const amountOf = (value) => {
  const n = Number(value);
  if (
    !Number.isFinite(n) ||
    n <= 0 ||
    n > 100000 ||
    Math.abs(n * 100 - Math.round(n * 100)) > 1e-6
  )
    fail("消费金额须为0至100000之间，最多两位小数");
  return n;
};
const requireTicket = (state, device) => {
  const t = state.tickets.find((t) => t.device === device);
  if (!t) fail("请先领取有效票根");
  return t;
};
function record(
  state,
  t,
  amount,
  discount,
  source,
  order,
  merchant = "草原人家餐厅",
) {
  const r = {
    id: randomUUID(),
    ticket: t.id,
    device: t.device,
    offer: source === "票根买单" ? "food" : source,
    merchant,
    eventId: "kangbao",
    amount,
    discount,
    paid: Math.round((amount - discount) * 100) / 100,
    share: Math.round(amount * 3) / 100,
    source,
    order,
    paymentId: "HB-PAY-" + randomUUID().slice(0, 8),
    time: new Date().toISOString(),
    status: "已核销",
  };
  state.redemptions.unshift(r);
  state.billStatus = "待办赛方确认";
  points(profileFor(state, t.device), 200, "商户权益核销", order);
  return r;
}
export function commandV3(state, path, b) {
  state.v3 ||= freshV3();
  const v = state.v3;
  let result = {},
    action = "";
  if (path === "growth") {
    v.growthActive = !v.growthActive;
    result = { active: v.growthActive };
    action = "赛事日模拟增长：" + (v.growthActive ? "开始" : "暂停");
  } else if (path === "account") {
    result = { profile: profileFor(state, b.device) };
    action = "切换虚拟演示账号";
  } else if (path === "order") {
    const t = requireTicket(state, b.device);
    const amount = amountOf(b.amount);
    const used = state.redemptions.some(
      (r) => r.ticket === t.id && r.offer === "food" && r.status !== "已退款",
    );
    const discount = amount >= 200 && !used ? 30 : 0;
    const order = {
      id: randomUUID(),
      device: b.device,
      ticket: t.id,
      amount,
      discount,
      paid: Math.round((amount - discount) * 100) / 100,
      status: "待支付",
      merchant: "草原人家餐厅",
    };
    v.orders.unshift(order);
    result = { order };
    action = "创建票根买单订单（金额锁定）";
  } else if (path === "pay") {
    const o = v.orders.find((o) => o.id === b.order && o.device === b.device);
    if (!o) fail("订单不存在");
    if (o.status === "已支付")
      return {
        result: {
          order: o,
          record: state.redemptions.find((r) => r.order === o.id),
        },
        action: "",
      };
    if (o.status !== "待支付") fail("订单不可支付", 409);
    const t = requireTicket(state, b.device);
    if (
      o.discount &&
      state.redemptions.some(
        (r) => r.ticket === t.id && r.offer === "food" && r.status !== "已退款",
      )
    )
      fail("满减权益已使用，请重新创建买单订单", 409);
    const r = record(state, t, o.amount, o.discount, "票根买单", o.id);
    o.status = "已支付";
    o.paymentId = r.paymentId;
    result = { order: o, record: r };
    action = "和包模拟支付成功，自动核销与积分入账";
  } else if (path === "coupon-buy") {
    requireTicket(state, b.device);
    if (v.coupons.some((c) => c.device === b.device && c.status !== "已退款"))
      fail("已购买本权益券，请查看券码", 409);
    const coupon = {
      id: "HB-C-" + randomUUID().slice(0, 8).toUpperCase(),
      device: b.device,
      name: "草原人家双人套餐券",
      amount: 198,
      status: "待使用",
      paid: true,
    };
    v.coupons.unshift(coupon);
    result = { coupon };
    action = "模拟购券成功（待到店核销）";
  } else if (path === "coupon-redeem") {
    const c = v.coupons.find((c) => c.id === b.code);
    if (!c) fail("权益券码不存在");
    if (c.status !== "待使用") fail("权益券已使用或已退款", 409);
    const r = record(
      state,
      requireTicket(state, c.device),
      c.amount,
      0,
      "权益券",
      c.id,
    );
    c.status = "已使用";
    result = { coupon: c, record: r };
    action = "商户券码核销，金额取不可修改的券面价";
  } else if (path === "refund") {
    const o = v.orders.find((o) => o.id === b.order && o.device === b.device);
    if (!o || o.status !== "已支付") fail("无可退款的买单订单", 409);
    const r = state.redemptions.find((r) => r.order === o.id);
    r.status = "已退款";
    o.status = "已退款";
    points(profileFor(state, b.device), -200, "退款冲减核销积分", o.id);
    state.billStatus = "待办赛方确认";
    result = { order: o };
    action = "模拟退款，冲减消费、分成与积分";
  } else if (path === "first-register") {
    const p = profileFor(state, b.device);
    requireTicket(state, b.device);
    if (p.athlete || p.firstUsed)
      fail("首次报名抵扣仅限未参赛观众使用一次", 409);
    if (p.memberPoints < 3000) fail("可用积分不足3000");
    points(p, -3000, "首次报名抵扣", "FIRST-RUN");
    p.firstUsed = true;
    rankPoints(p, 50, "首次赛事报名", "FIRST-RUN");
    p.registration = {
      id: "HB-REG-" + randomUUID().slice(0, 8),
      name: "张家口城市欢乐跑 · 5km",
      points: 3000,
      fee: 60,
      paid: 30,
      status: "报名成功 · 待检录",
    };
    result = { registration: p.registration };
    action = "消耗3000会员积分抵扣首次报名；段位分独立增加50";
  } else if (path === "first-checkin") {
    const p = profileFor(state, b.device);
    if (!p.registration || p.checkedIn) fail("尚未报名或已完成检录", 409);
    p.checkedIn = true;
    rankPoints(p, 100, "现场检录", "FIRST-RUN");
    p.rank = 2;
    p.registration.status = "已检录 · 首次成为选手";
    result = { registration: p.registration };
    action = "模拟首次现场检录，观众转为选手，计入转化率";
  } else if (path === "qualify") {
    const p = profileFor(state, b.device);
    if (p.rank < 4) fail("暂未达到指导员申请条件");
    if (v.qualifications.some((q) => q.device === b.device))
      fail("资格申请已提交", 409);
    const q = {
      id: randomUUID(),
      device: b.device,
      name: p.name,
      type: "三级社会体育指导员",
      status: "待主管部门审核",
    };
    v.qualifications.unshift(q);
    result = { qualification: q };
    action = "提交指导员资格申请（非自动授证）";
  } else if (path === "qualify-review") {
    const q = v.qualifications.find((q) => q.id === b.id);
    if (!q || q.status !== "待主管部门审核") fail("申请不存在或已处理", 409);
    q.status = "演示审核通过";
    q.certificate = "DEMO-CERT-" + q.id.slice(0, 8);
    result = { qualification: q };
    action = "模拟主管部门审核资质；生成演示证书";
  } else if (path === "package-buy") {
    const p = packages.find((p) => p.id === b.package);
    if (!p || p.id === "team") fail("请选择参赛或亲友套餐");
    validDevice(b.device);
    if (!b.consent) fail("请确认使用预置实名资料");
    if (
      v.packageOrders.some((o) => o.device === b.device && o.packageId === p.id)
    )
      fail("该账号已购买此套餐", 409);
    const sold = v.packageOrders.filter((o) => o.quota).length;
    if (p.quota && sold >= 312) fail("保留名额已售罄", 409);
    let t = state.tickets.find((t) => t.device === b.device);
    if (!t) {
      t = {
        id: `HB2027-0006-${String(state.tickets.length + 15801).padStart(6, "0")}`,
        device: b.device,
        type: p.quota ? "参赛" : "观赛",
        eventId: "kangbao",
        issuedAt: new Date().toISOString(),
        name: "演示用户",
      };
      state.tickets.push(t);
    }
    const o = {
      id: "PKG-" + randomUUID().slice(0, 8).toUpperCase(),
      device: b.device,
      packageId: p.id,
      name: p.name,
      amount: p.price,
      quota: p.quota,
      channel: "C端",
      people: 1,
      ticket: t.id,
      status: "待入住",
      registration: p.quota
        ? "报名已同步 · 保留名额兑换凭证"
        : "观赛票根已签发",
      hotelAmount: 680,
    };
    v.packageOrders.unshift(o);
    result = { order: o };
    action = "模拟套餐支付，锁定名额、同步报名与住宿凭证";
  } else if (path === "checkin") {
    const o = v.packageOrders.find(
      (o) => o.id === b.code || o.ticket === b.code,
    );
    if (!o) fail("住宿凭证不存在");
    if (o.status !== "待入住") fail("该订单已入住", 409);
    const r = record(
      state,
      requireTicket(state, o.device),
      o.hotelAmount,
      0,
      "套餐入住",
      o.id,
      "康巴诺尔民宿",
    );
    o.status = "已入住";
    result = { order: o, record: r };
    action = "酒店入住核销，住宿履约分成归集赛事";
  } else if (path === "inquiry") {
    if (
      !String(b.company || "").trim() ||
      !Number.isInteger(Number(b.people)) ||
      Number(b.people) < 10 ||
      Number(b.people) > 500
    )
      fail("请填写单位名称与10至500人的团体规模");
    const inquiry = {
      id: "INQ-" + randomUUID().slice(0, 8),
      company: String(b.company).slice(0, 80),
      people: Number(b.people),
      date: "2027-08-09",
      invoice: String(b.invoice || "").slice(0, 80),
      needs: String(b.needs || "").slice(0, 200),
      status: "待供应方跟进",
    };
    v.inquiries.unshift(inquiry);
    result = { inquiry };
    action = "企业团建询价提交";
  } else if (path === "task") {
    const t = v.tasks.find((t) => t.id === b.id);
    if (!t) fail("任务不存在");
    if (t.executed) fail("本演示批次已执行，请勿重复触达", 409);
    if (t.id === "downgrade") fail("该任务计划12月1日启动");
    t.executed = true;
    t.status = "模拟执行完成";
    t.touched = t.audience;
    result = { task: t };
    action = "模拟执行运营任务，授权人群与每周2条频控（不发送真实消息）";
  } else fail("接口不存在", 404);
  return { result, action };
}
export function metricsV3(state) {
  const v = state.v3;
  const paid = state.redemptions.filter((r) => r.status !== "已退款");
  const conversions = Object.values(v.profiles).filter(
    (p) => p.checkedIn,
  ).length;
  const quotaSold = 288 + v.packageOrders.filter((o) => o.quota).length;
  return {
    users: 366373 + state.tickets.length,
    athletes: 74120 + conversions,
    viewers: 292253 + state.tickets.filter((t) => t.type === "观赛").length,
    converted: 14320 + conversions,
    conversion:
      ((14320 + conversions) /
        (292253 + state.tickets.filter((t) => t.type === "观赛").length)) *
      100,
    repeat: 21.6,
    active: 38.2,
    organizers: 126,
    activities: 418,
    quotaSold,
    quotaTotal: 600,
    packageSales: 651 + v.packageOrders.length,
    packagePeople: 700 + v.packageOrders.length,
    groupPeople: 52,
    groupShare: (52 / (700 + v.packageOrders.length)) * 100,
    checkin: 91,
    livePaid:
      paid.reduce(
        (s, r) => s + Math.round((r.paid ?? r.amount - r.discount) * 100),
        0,
      ) / 100,
  };
}
