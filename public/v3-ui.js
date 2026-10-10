import { honorMedal } from "./honors.js";
import { packages, rankLevels, rankCounts, groupOrders } from "./v3-data.js";
const money = (n) =>
  Number(n).toLocaleString("zh-CN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
const fmt = (n) => Number(n).toLocaleString("zh-CN");
const esc = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const head = (t, sub = "冀动 · 赛事与城市生活") =>
  `<header class="phone-header"><div><small>${sub}</small><h2>${t}</h2></div><span class="phone-demo">演示</span></header>`;
const button = (tab, text, style = "primary wide") =>
  `<button class="${style}" data-mobile="${tab}">${text}</button>`;
const row = (a, b) =>
  `<div class="line-item"><span>${a}</span><b>${b}</b></div>`;
export function makeV3(ctx) {
  const { state, device, ticket, tab, orderId, packageId } = ctx;
  const p = state.v3.profiles[device] || {
    name: "演示用户",
    memberPoints: 3260,
    memberEarned: 3260,
    rank: 1,
    rankAnnual: 0,
    rankTotal: 0,
    ledger: [],
  };
  const v = state.v3,
    ops = state.ops;
  const shell = (title, content, sub) =>
    `${head(title, sub)}<div class="phone-padded v3-content">${content}</div>`;
  const athleteView = ctx.identityView === "athlete";
  if (tab === "me")
    return shell(
      "让热爱，持续发生。",
      `<div class="profile-hero"><div class="avatar">冀</div><div><h2>${esc(p.name)}</h2><span>${athleteView ? "选手身份 · 运动荣誉" : "观众身份 · 银卡会员"}</span></div></div><div class="account-switch"><button data-v3-account="spectator" class="${!athleteView ? "active" : ""}">观众身份</button><button data-v3-account="athlete" class="${athleteView ? "active" : ""}">选手身份</button></div><p class="identity-note">同一用户 · 身份切换保留票根与订单</p>${athleteView ? `<button class="honor-summary" data-mobile="rank">${honorMedal(p.rank)}<div><small>我的荣誉勋章</small><h2>Lv.${p.rank} ${rankLevels[p.rank - 1]}</h2><strong>${fmt(p.rankTotal)} <small>累计段位分</small></strong><span>只积不兑 · 查看荣誉墙 →</span></div></button>` : `<div class="spectator-points"><small>观众积分 · 可积可兑</small><strong>${fmt(p.memberPoints)}</strong><p>银卡会员 · 积分兑换与报名抵扣</p>${button("member", "查看积分与权益 →")}</div>`}<div class="profile-links">${athleteView ? button("rank", "◈　我的荣誉 · 段位与勋章", "profile-link") : button("member", "◇　积分中心 · 积分抵首次报名", "profile-link")}${button("package-orders", "▤　旅居订单与住宿凭证", "profile-link")}${button("coupons", "▧　我的权益券", "profile-link")}${button("records", "↗　买单与权益记录", "profile-link")}${button("home", "⌂　回到赛事", "profile-link")}</div><p class="muted small">观众积分可积可兑；选手段位分代表运动荣誉，只积不兑。两类分数独立记录，不互转。</p>`,
    );
  if (tab === "member")
    return shell(
      "会员中心",
      `<div class="membership-card"><small>HEBEI SPORTS CLUB</small><span>银卡会员</span><h2>${p.name}</h2><div><strong>${fmt(p.memberPoints)}</strong><small>可用会员积分</small></div><p>年度获取 ${fmt(p.memberEarned)} 分 · 下一级金卡 5,000 分</p></div><div class="progress"><i style="width:${Math.min((p.memberEarned / 5000) * 100, 100)}%"></i></div><p class="muted small">距金卡还需 ${fmt(Math.max(5000 - p.memberEarned, 0))} 年度积分</p><div class="first-run-card"><span>下一次，试试自己上场。</span><h2>首赛欢乐跑</h2><p>5km零门槛组 · 消耗3,000积分<br>报名费¥60，实付¥30</p>${button("first-run", p.firstUsed ? "查看首次报名订单" : "积分抵首次报名 →")}</div><h3>我的银卡权益</h3><div class="member-benefits"><div>⌖<b>景区门票8折</b><small>合作景区提供</small></div><div>▣<b>咪咕视频月卡</b><small>权益说明 · 待正式接入</small></div></div><h3>积分流水</h3>${p.ledger.map((x) => `<div class="points-row"><div><b>${esc(x.reason)}</b><small>${esc(x.rule)}${x.order ? " · " + esc(x.order) : ""}</small></div><strong class="${x.value > 0 ? "green" : ""}">${x.value > 0 ? "+" : ""}${fmt(x.value)}</strong></div>`).join("")}<p class="muted small">Demo按现场脚本核销固定+200分；正式倍率规则待配置。积分不提现、不转让。年度等级按获取积分评定。</p>${button("me", "返回我的", "outline wide")}`,
    );
  if (tab === "rank")
    return shell(
      "我的段位",
      `<div class="rank-card"><small>HEBEI ATHLETE HONORS</small>${honorMedal(p.rank)}<h1>${rankLevels[p.rank - 1]}</h1><p>${p.rank >= 4 ? "年度完赛率 86% · 已达80%硬条件" : "每一次参赛，积累属于你的运动荣誉"}</p></div><div class="dual-accounts"><div><small>年度段位分</small><strong>${fmt(p.rankAnnual)}</strong></div><div><small>累计段位分</small><strong>${fmt(p.rankTotal)}</strong></div></div><h3>我的荣誉墙</h3><div class="honor-wall">${rankLevels.map((name, i) => `<div class="honor-item ${i + 1 > p.rank ? "locked" : "earned"}">${honorMedal(i + 1)}<b>Lv.${i + 1}</b><span>${name}</span><small>${i + 1 <= p.rank ? "已获得" : "待解锁"}</small></div>`).join("")}</div><h3>晋级进度</h3><div class="progress"><i style="width:${Math.min((p.rankAnnual / 5000) * 100, 100)}%"></i></div><p>${p.rank >= 4 ? "年度进度按段位分记录，勋章代表运动荣誉" : "报名、检录与完赛分别记录，会员积分不转入段位分"}</p><div class="qualification"><span class="badge green">${p.rank >= 4 ? "已解锁 · 可申请" : "待解锁"}</span><h3>三级社会体育指导员</h3><p>年度≥2,000分且完赛率≥80%。平台流转申请，资格认定由体育主管部门与协会完成。</p>${p.rank >= 4 ? `<button class="primary wide" data-v3="qualify">${v.qualifications.some((q) => q.device === device) ? "查看申请状态" : "提交模拟资格申请 →"}</button>` : ""}</div><h3>段位分来源</h3>${row("年度参赛、检录与成绩", fmt(p.rankAnnual) + " 分")}${row("户外在河北 · 历史折算", p.athlete ? "820 分" : "0 分")}${(p.rankLedger || []).map((x) => `<div class="points-row"><div><b>${esc(x.reason)}</b><small>${x.account} · ${x.rule} · ${x.order}</small></div><strong>+${x.value}</strong></div>`).join("")}<p class="muted small">只积不兑 · 段位只升不降 · Lv.7—Lv.9经年度评定与局方确认</p>${button("me", "返回我的", "outline wide")}`,
    );
  if (tab === "first-run")
    return shell(
      "首次报名抵扣",
      p.firstUsed
        ? `<div class="success-mark">✓</div><h2 class="center">报名成功</h2><div class="receipt"><h3>${p.registration.name}</h3>${row("消耗会员积分", "3,000分")}${row("实付报名费", "¥30.00")}${row("报名状态", p.registration.status)}${row("订单号", esc(p.registration.id))}</div><p class="notice">报名成功不等于成为选手；首次检录后计入观众→选手转化。段位分独立增加50分。</p>${!p.checkedIn ? '<button class="primary wide" data-v3="first-checkin">模拟首次现场检录 →</button>' : '<span class="badge green">已检录 · 转化数据已上屏</span>'}${button("member", "返回会员中心")}`
        : `<div class="next-race"><small>YOUR FIRST START LINE</small><h1>张家口城市<br>欢乐跑 · 5km</h1><p>2027.09.12 · 零门槛欢乐组</p></div><div class="receipt">${row("报名费", "¥60.00")}${row("消耗积分", "3,000分")}${row("报名抵扣", "− ¥30.00")}${row("实付金额", "¥30.00")}</div><p class="notice">仅限此前有观赛记录且从未参赛的用户，每人限一次；模拟支付，不收取真实费用。</p><button class="primary wide" data-v3="first-register" ${p.athlete ? "disabled" : ""}>确认抵扣并模拟报名</button>${button("member", "返回会员中心", "text-button full")}`,
    );
  if (tab === "pay")
    return shell(
      "票根买单",
      `<div class="pay-merchant"><span>♨</span><h2>草原人家餐厅</h2><p>康保草原马拉松 · 票根专属优惠</p></div>${ticket ? `<form id="pay-form"><label>账单消费金额（元）<input name="amount" type="number" min="0.01" max="100000" step="0.01" value="258" required></label><div class="auto-offer"><span>自动匹配最优优惠</span><b>满200减30 · 每人一次</b><small>金额来自你确认的账单；商户无法修改</small></div><button class="primary wide" type="submit">核对订单 →</button></form><p class="muted small">和包模拟支付 · 资金直达商户 · 不经平台账户</p>` : button("claim", "先领取票根")}${button("benefits", "返回附近权益", "text-button full")}`,
    );
  if (tab === "pay-confirm" || tab === "pay-result") {
    const o =
      v.orders.find((o) => o.id === orderId && o.device === device) ||
      v.orders.find((o) => o.device === device);
    if (!o) return shell("票根买单", button("pay", "开始买单"));
    return shell(
      tab === "pay-confirm" ? "确认买单" : "支付结果",
      `${o.status === "已支付" ? '<div class="success-mark">✓</div><h2 class="center">支付成功，权益已核销</h2>' : ""}<div class="receipt"><h3>${o.merchant}</h3>${row("消费总额", "¥" + money(o.amount))}${row("自动匹配优惠", "− ¥" + money(o.discount))}${row("实付金额", "¥" + money(o.paid))}${row("支付方式", "和包 · 模拟支付")}${row("订单状态", o.status)}</div>${o.status === "待支付" ? `<button class="primary wide" data-v3="pay" data-order="${o.id}">确认模拟支付 ¥${money(o.paid)}</button>` : `<div class="notice">消费已计入康保赛事，商户实时到账。会员积分+200，分成¥${money(Math.round(o.amount * 3) / 100)}进入赛事账单。</div>${button("member", "查看积分入账 →")}`}${button("records", "查看买单记录", "text-button full")}`,
    );
  }
  if (tab === "coupons" && !ticket)
    return shell(
      "我的权益券",
      `<div class="next-race"><h2>先领票，再享专属权益</h2><p>购券需有效赛事票根。完成模拟领票后，会自动回到本页继续购券。</p></div><button class="primary wide" data-action="claim-for-coupon">领取票根并继续购券 →</button>`,
    );
  if (tab === "coupons")
    return shell(
      "我的权益券",
      `<div class="coupon-card"><span>票根专享 · 草原人家餐厅</span><h2>草原双人套餐</h2><strong>¥198 <small>券面价</small></strong><p>主食双人份 + 特色菜 + 奶茶<br>在线购券，到店核销；每人限购一张</p><button class="primary wide" data-v3="coupon-buy" ${v.coupons.some((c) => c.device === device && c.status !== "已退款") ? "disabled" : ""}>${v.coupons.some((c) => c.device === device && c.status !== "已退款") ? "已购券，请使用下方券码" : "模拟支付 ¥198 购券"}</button></div>${v.coupons
        .filter((c) => c.device === device)
        .map(
          (c) =>
            `<div class="record-card"><span class="badge green">${c.status}</span><h3>${c.name}</h3><strong class="voucher-code">${c.id}</strong><p>已支付¥198 · 券面价自动带出</p><small>核销后计入消费；完整券码已生成</small>${c.status === "待使用" ? `<button class="primary wide" data-action="handoff-coupon" data-code="${c.id}">带券码去商户核销 →</button>` : ""}<button class="text-button" data-action="copy-credential" data-code="${c.id}">复制完整券码</button></div>`,
        )
        .join("")}${button("me", "返回我的", "outline wide")}`,
    );
  if (tab === "packages")
    return shell(
      "跟着赛事，住进风景。",
      `<div class="travel-hero"><small>STAY FOR THE EXPERIENCE</small><h1>跑一场，<br>多留两天。</h1><p>康保草原 · 赛事旅居计划</p></div><div class="quota-card"><span>保留名额已售</span><strong>${ops.quotaSold}<small> / 600</small></strong><div class="progress"><i style="width:${ops.quotaSold / 6}%"></i></div><small>全马200 / 半马400 · 未售名额在报名截止前7天释放（历史销售回放）</small></div><p class="notice">其余名额照常公开报名，不设“订房才能参赛”门槛。</p>${packages.map((p, i) => `<button class="package-card" data-package="${p.id}"><div class="package-art art-${i}"><span>${p.type}</span><b>${["RUN", "EXPLORE", "TOGETHER"][i]}</b></div><div><h3>${p.name}</h3><p>${p.tag}</p><strong>¥${fmt(p.price)}<small>${p.id === "team" ? "/人起" : "起"}</small></strong><span>详情 ↗</span></div></button>`).join("")}${button("package-orders", "我的旅居订单", "outline wide")}`,
    );
  if (tab === "package-detail") {
    const pack = packages.find((x) => x.id === packageId) || packages[0];
    return shell(
      "赛事旅居套餐",
      `<div class="travel-hero"><small>${pack.type}</small><h1>${pack.name}</h1></div><h2>¥${fmt(pack.price)}<small>起${pack.id === "team" ? " / 人" : ""}</small></h2><p>${pack.quota ? "保留名额剩余 " + (600 - ops.quotaSold) + " 个" : "亲友套餐不占参赛名额"}</p><h3>套餐包含</h3>${pack.items.map((x) => row(x, "✓")).join("")}<h3>供应与退改</h3><p>康保草原旅行社（虚构演示供应方）收款、开票。住宿履约金额¥680计入消费，参赛费单列。</p><p>${pack.refund}</p><p class="muted small">完赛合影为自愿参与，不承诺具体运动员人选。</p>${pack.id === "team" ? button("inquiry", "企业团建询价 →") : v.packageOrders.some((o) => o.device === device && o.packageId === pack.id) ? button("package-orders", "查看已购套餐与入住状态 →") : `<form id="package-form"><input name="package" type="hidden" value="${pack.id}"><label>参赛 / 入住人<input value="演示实名用户 · 138****2027" readonly></label><label class="check"><input name="consent" type="checkbox" required><span>确认使用预置身份，了解支付、报名与库存均为演示。</span></label><button class="primary wide" type="submit">模拟支付并生成凭证 ¥${fmt(pack.price)}</button></form>`}${button("packages", "返回套餐列表", "text-button full")}`,
    );
  }
  if (tab === "package-orders")
    return shell(
      "旅居订单与住宿凭证",
      v.packageOrders
        .filter((o) => o.device === device)
        .map(
          (o) =>
            `<div class="record-card"><span class="badge green">${o.status}</span><h3>${o.name}</h3><strong>¥${money(o.amount)}</strong><p>${o.registration}</p><p>入住：康巴诺尔民宿<br>住宿履约金额¥680，酒店核销后归集</p><strong class="voucher-code">${o.id}</strong><small>住宿凭证 · 酒店端可直接带入</small>${o.status === "待入住" ? `<button class="primary wide" data-action="handoff-package" data-code="${o.id}">带凭证去酒店办理入住 →</button>` : ""}<button class="text-button" data-action="copy-credential" data-code="${o.id}">复制住宿凭证</button><p class="small">关联票根 ${o.ticket}</p></div>`,
        )
        .join("") ||
        `<div class="empty">暂无旅居订单${button("packages", "选一个草原假期")}</div>`,
    );
  if (tab === "inquiry")
    return shell(
      "企业团建询价",
      `<div class="notice">10人起 · 和美乡途团体客源与企业采购<br>不发送真实询价，由虚构供应方跟进。</div><form id="inquiry-form"><label>单位名称<input name="company" required maxlength="80" placeholder="请输入演示单位名称"></label><label>团体人数<input name="people" type="number" min="10" max="500" value="24" required></label><label>发票抬头<input name="invoice" maxlength="80" placeholder="演示单位抬头"></label><label>对公采购需求<textarea name="needs" maxlength="200" placeholder="住宿、餐饮、团建与开票要求"></textarea></label><button class="primary wide" type="submit">提交模拟询价</button></form>${button("packages", "返回套餐", "text-button full")}`,
    );
  return null;
}
export function adminV3(state, tab, heading, recordsTable) {
  const v = state.v3,
    o = state.ops;
  const stats = (items) =>
    `<div class="admin-stats v3-stats">${items.map(([l, n, d]) => `<div><span>${l}</span><strong>${n}</strong><small>${d || "模拟口径"}</small></div>`).join("")}</div>`;
  if (tab === "用户运营")
    return `${heading("把参与，变成持续的热爱。", "先测新增体育人口，再连接荣誉、权益与下一场赛事。")}<div class="ops-feature"><div><span class="eyebrow">SPECTATOR → ATHLETE</span><h1>${o.conversion.toFixed(1)}<small>%</small></h1><h3>观众→选手转化率</h3><p>${fmt(o.converted)} 名观众首次参赛 / ${fmt(o.viewers)} 名观众</p></div><div><span>实名用户档案</span><strong>${fmt(o.users)}</strong><p>选手 ${fmt(o.athletes)} · 观众历史记录 ${fmt(o.viewers)}</p><small>全省去重档案；现场转化后两身份可重叠，与赛事人数合计分开统计</small></div></div>${stats(
      [
        ["年内复参率", "21.6%", "≥2场检录选手 / 年内选手"],
        ["会员活跃率", "38.2%", "年内获积分或核销"],
        ["认证组织者", "126", "已发起418场民间活动"],
        [
          "保留名额使用率",
          (o.quotaSold / 6).toFixed(1) + "%",
          "已售" + o.quotaSold + " / 600",
        ],
      ],
    )}<div class="ops-grid"><section class="white-panel"><div class="section-title"><h2>转化漏斗</h2><small>五级转化 · 含触达入口共六阶段</small></div><div class="funnel">${[
      ["路人触达", 1820000],
      ["观众", o.viewers],
      ["选手", o.athletes],
      ["复参选手", 16010],
      ["达人", 1280],
      ["组织者", 126],
    ]
      .map(
        ([l, n], i) =>
          `<div style="--funnel-width:${100 - i * 12}%"><span>${l}</span><strong>${fmt(n)}</strong></div>`,
      )
      .join(
        "",
      )}</div></section><section class="white-panel"><div class="section-title"><h2>九级段位结构</h2><small>开场选手74,120人</small></div><div class="rank-distribution">${rankCounts.map((n, i) => `<div><label>Lv.${i + 1} ${rankLevels[i]}</label><i style="width:${n / 316}%"></i><b>${fmt(n)}</b></div>`).join("")}</div><div class="member-structure">基础232,100 · 银卡48,600<br>金卡10,200 · 钻石1,353</div></section></div><section class="white-panel"><div class="section-title"><h2>运营任务与效果</h2><span class="badge">授权人群 · 每周最多2条</span></div><table><thead><tr><th>任务 / 圈选规则</th><th>人群</th><th>渠道</th><th>状态</th><th>点击 / 转化</th><th></th></tr></thead><tbody>${v.tasks.map((t) => `<tr><td><b>${t.name}</b><small>${t.rule}</small></td><td>${fmt(t.audience)}</td><td>${t.channel}</td><td>${t.status}</td><td>${fmt(t.clicks)} / ${fmt(t.conversions)}</td><td><button class="${t.executed ? "outline" : "primary"}" data-v3-task="${t.id}" ${t.executed || t.id === "downgrade" ? "disabled" : ""}>${t.executed ? "批次已执行" : "模拟执行"}</button></td></tr>`).join("")}</tbody></table><p class="muted small">预置任务效果来自模拟样本；点击执行只记录本批次，不发送短信或5G消息。首次报名后须检录才计入转化。</p></section>`;
  if (tab === "旅居套餐")
    return `${heading("赛事是起点，旅居让价值留下。", "名额池、住宿履约与团体客源共用一条可核的数据链路。")}${stats(
      [
        ["保留名额", o.quotaSold + " / 600", "全马200 · 半马400"],
        ["套餐订单数", fmt(o.packageSales), "参赛236份 · 观赛412份 · 团体3单"],
        ["套餐入住核销率", "91%", "开场预置值；现场新增单独列示"],
        [
          "团体客源占比",
          o.groupShare.toFixed(1) + "%",
          "和美乡途与企业订单人数 / 套餐人数",
        ],
      ],
    )}<section class="white-panel quota-admin"><div><span class="eyebrow">RESERVED, NEVER REQUIRED</span><h2>保留名额池</h2><p>已售${o.quotaSold}个，剩余${600 - o.quotaSold}个。占总名额10%，其余名额照常报名。</p><div class="progress"><i style="width:${o.quotaSold / 6}%"></i></div></div><div><strong>报名截止前7天</strong><p>未售名额自动释放至公开报名<br>当前业务日已过释放日，名额池展示历史销售口径；新增购买为回放演示。</p></div></section><section class="white-panel"><div class="section-title"><h2>和美乡途 · 团体订单回传</h2><span class="badge green">模拟名单已归集</span></div><table><thead><tr><th>订单</th><th>客源渠道</th><th>单位（模拟）</th><th>人数</th><th>金额</th><th>履约状态</th></tr></thead><tbody>${groupOrders.map((o) => `<tr><td>${o.id}</td><td>${o.channel}</td><td>${o.company}</td><td>${o.people}</td><td>¥${money(o.amount)}</td><td>${o.status}</td></tr>`).join("")}</tbody></table></section><section class="white-panel"><div class="section-title"><h2>C端现场旅居订单</h2><span>报名同步 · 票根签发 · 酒店核销</span></div><table><thead><tr><th>订单 / 套餐</th><th>人数</th><th>价款</th><th>报名与票根</th><th>入住状态</th></tr></thead><tbody>${v.packageOrders.map((o) => `<tr><td>${o.id}<small>${o.name}</small></td><td>1</td><td>¥${money(o.amount)}</td><td>${o.registration}<small>${o.ticket}</small></td><td>${o.status}</td></tr>`).join("") || '<tr><td colspan="5" class="empty">等待C端模拟下单</td></tr>'}</tbody></table></section><section class="white-panel"><h2>企业询价</h2>${v.inquiries.map((i) => `<div class="line-item"><b>${esc(i.company)}</b><span>${i.people}人</span><span>${esc(i.invoice)}</span><span>${i.status}</span></div>`).join("") || '<p class="muted">暂无现场询价，请从C端企业套餐入口提交。</p>'}</section>`;
  if (tab === "积分与会员")
    return `${heading("荣誉和实惠，分别记账。", "段位分只积不兑，会员积分可抵首次报名；规则快照可追溯。")}${stats(
      [
        ["段位选手", "74,120", "九级段位"],
        ["会员档案", "292,253", "基础 / 银 / 金 / 钻"],
        ["演示核销积分", "+200", "规则版本DEMO-2027-v3"],
        ["首次报名抵扣", "3,000分", "每人一次 · 最大抵30元"],
      ],
    )}<section class="white-panel"><div class="section-title"><h2>资质申请审核</h2><span>主管部门确认后授予 · Demo不产生真实资格</span></div>${v.qualifications.map((q) => `<div class="qualification-row"><div><h3>${q.name} · ${q.type}</h3><p>${q.status}${q.certificate ? " · " + q.certificate : ""}</p></div><button class="primary" data-v3-review="${q.id}" ${q.status !== "待主管部门审核" ? "disabled" : ""}>模拟主管部门审核</button></div>`).join("") || '<div class="empty">请切换C端选手账号，在我的段位提交申请。</div>'}</section><section class="white-panel"><h2>双账户规则与现场流水</h2><div class="notice">不提供账户互转。核销200积分与首次抵扣3000积分沿用V3演示脚本；正式银卡倍率按配置执行。</div><table><thead><tr><th>演示用户</th><th>会员可用积分</th><th>年度 / 累计段位分</th><th>首次抵扣</th></tr></thead><tbody>${Object.values(
      v.profiles,
    )
      .map(
        (p) =>
          `<tr><td>${p.name}</td><td>${fmt(p.memberPoints)}</td><td>${p.rankAnnual} / ${p.rankTotal}</td><td>${p.firstUsed ? "已使用" : "未使用"}</td></tr>`,
      )
      .join("")}</tbody></table></section>`;
  return null;
}
export function merchantV3(state, tab, selection = {}) {
  const v = state.v3,
    records = state.redemptions.filter((r) => r.status !== "已退款");
  const wrap = (t, html) =>
    `${head(t, "草原人家餐厅 · 康巴诺尔民宿演示联营")}<div class="phone-padded v3-content">${html}</div>`;
  if (tab === "home")
    return wrap(
      "每笔到账，实时可见。",
      `<div class="merchant-arrival"><small>TODAY'S LIVE RECEIPTS</small><h1>¥${money(records.filter((r) => r.merchant === "草原人家餐厅").reduce((s, r) => s + (r.paid ?? r.amount - r.discount), 0))}</h1><p>现场餐厅到账 · ${records.filter((r) => r.merchant === "草原人家餐厅").length}笔</p><span class="badge">持牌机构直达商户 · 模拟支付</span></div><div class="merchant-shortcuts"><button data-merchant="coupon">▣<b>权益券核销</b><small>金额自动带出</small></button><button data-merchant="hotel">⌂<b>套餐入住</b><small>凭证核验履约</small></button></div><h3>实时到账列表</h3>${records.map((r) => `<div class="arrival-row"><div><b>${r.merchant}</b><small>${r.source || "历史演示核销"} · ${new Date(r.time).toLocaleTimeString("zh-CN")}</small></div><strong>+¥${money(r.paid ?? r.amount - r.discount)}</strong></div>`).join("") || '<div class="empty">等待观众端买单，支付成功自动进入列表。</div>'}<button class="outline wide" data-merchant="records">查看经营数据</button><p class="muted small">买单订单由用户确认，商户不录入、不修改金额。<button class="text-button" data-action="merchant-sound">开启 / 关闭到账语音</button></p>`,
    );
  if (tab === "success") {
    const r = state.redemptions.find((r) => r.id === selection.resultId);
    if (r)
      return wrap(
        r.source === "套餐入住" ? "入住核销成功" : "权益券核销成功",
        `<div class="success-mark">✓</div><h2 class="center">${r.source === "套餐入住" ? "已完成入住" : "权益券已使用"}</h2><div class="receipt"><h3>${r.merchant}</h3>${row("归集消费", "¥" + money(r.amount))}${row("赛事分成", "¥" + money(r.share))}${row("关联凭证", esc(r.order))}</div><div class="notice">记录已同步到账列表、观众端订单、赛事账单和大屏。</div><button class="primary wide" data-merchant="home">查看实时到账 →</button><button class="outline wide" data-merchant="${r.source === "套餐入住" ? "hotel" : "coupon"}">继续核销</button>`,
      );
  }
  if (tab === "coupon" || tab === "scan") {
    const pending = v.coupons.filter((c) => c.status === "待使用");
    const c = pending.find((c) => c.id === selection.couponCode) || pending[0];
    if (!c)
      return wrap(
        "权益券核销",
        `<div class="next-race"><small>01 购券 → 02 出示券码 → 03 商户核销</small><h2>${v.coupons.length ? "本次权益券已完成核销" : "还没有待使用的权益券"}</h2><p>258元票根买单已自动核销，不需要在这里再输入票根或验证码。此入口用于198元双人套餐券。</p></div><div class="notice">先在观众端购买权益券；购券后可一键带券码返回此页。</div><button class="primary wide" data-action="go-buy-coupon">${v.coupons.length ? "查看观众端权益券" : "去观众端购券 →"}</button><button class="outline wide" data-merchant="home">查看买单自动到账</button>`,
      );
    return wrap(
      "权益券核销",
      `<div class="handoff-steps"><span class="done">✓ 已购券</span><span>02 确认券码</span><span>03 核销成功</span></div><div class="auto-offer"><span>已支付 · 待使用</span><b>${c.name} · ¥${money(c.amount)}</b><small>券面价自动带出，不可修改</small></div><form id="coupon-form" novalidate><label>权益券码<input name="code" value="${esc(c.id)}" autocomplete="off" placeholder="选择待用券或粘贴完整券码"></label><p class="muted small">已自动填入真实演示券码，不是验证码。</p><div class="credential-list">${pending.map((x) => `<button type="button" class="credential-choice" data-fill-coupon="${x.id}">${x.name}<small>${x.id}</small></button>`).join("")}</div><p class="form-error" role="alert" hidden></p><button class="primary wide" type="submit">确认核销 ¥${money(c.amount)}</button></form><button class="text-button full" data-action="go-buy-coupon">查看观众端已购权益券</button>`,
    );
  }
  if (tab === "hotel") {
    const pending = v.packageOrders.filter((o) => o.status === "待入住");
    const o = pending.find((o) => o.id === selection.packageCode) || pending[0];
    if (!o)
      return wrap(
        "套餐入住核销",
        `<div class="next-race"><small>01 购买套餐 → 02 生成凭证 → 03 入住核销</small><h2>${v.packageOrders.length ? "本次套餐已完成入住" : "还没有待入住的订单"}</h2><p>购买旅居套餐后，系统才会生成住宿凭证。普通观赛票根或4位验证码不能直接办理入住。</p></div><div class="notice">先选择参赛或亲友旅居套餐，模拟支付成功后，一键带凭证返回酒店端。</div><button class="primary wide" data-action="${v.packageOrders.length ? "go-package-orders" : "go-buy-package"}">${v.packageOrders.length ? "查看已入住订单" : "去观众端选旅居套餐 →"}</button><button class="outline wide" data-merchant="home">返回商户工作台</button>`,
      );
    return wrap(
      "套餐入住核销",
      `<div class="handoff-steps"><span class="done">✓ 套餐已支付</span><span>02 确认凭证</span><span>03 办理入住</span></div><div class="next-race"><small>康巴诺尔民宿 · 待入住</small><h2>${o.name}</h2><p>${o.registration}</p></div><form id="hotel-form" novalidate><label>住宿凭证 / 关联票根<input name="code" value="${esc(o.id)}" autocomplete="off" placeholder="选择订单或粘贴完整住宿凭证"></label><p class="muted small">已自动带出已支付订单的完整凭证，不是手机验证码。</p><div class="credential-list">${pending.map((x) => `<button type="button" class="credential-choice" data-fill-package="${x.id}">${x.name}<small>${x.id}</small></button>`).join("")}</div><div class="notice">住宿履约¥${money(o.hotelAmount)}，核销后分成¥${money(Math.round(o.hotelAmount * 3) / 100)}归集赛事。</div><p class="form-error" role="alert" hidden></p><button class="primary wide" type="submit">确认模拟入住</button></form>`,
    );
  }
  if (tab === "records")
    return wrap(
      "经营数据",
      `<div class="merchant-arrival"><span>现场核销消费</span><h1>¥${money(records.reduce((s, r) => s + r.amount, 0))}</h1><p>${records.length}笔 · 餐厅与住宿联营演示汇总</p></div>${records.map((r) => `<div class="record-card"><span class="badge green">${r.status || "已核销"}</span><h3>${r.merchant}</h3><p>${r.source} · 消费¥${money(r.amount)}</p>${row("实付 / 到账", "¥" + money(r.paid ?? r.amount - r.discount))}${row("赛事分成", "¥" + money(r.share))}<small>支付流水 ${r.paymentId || "历史演示"}</small></div>`).join("")}`,
    );
  return null;
}
