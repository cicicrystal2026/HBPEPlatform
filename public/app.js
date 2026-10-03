import { merchants } from "./data.js";
let state,
  geo,
  connected = false,
  screen = "overview",
  selected = "kangbao",
  city = "张家口",
  adminTab = "工作台",
  detailTab = "报名数据",
  mobileTab = "home",
  merchantTab = "scan",
  mapMode = false,
  filter = "全部",
  month = 8,
  rank = "real",
  step = 0;
const $ = (s) => document.querySelector(s),
  fmt = (n) => Number(n).toLocaleString("zh-CN"),
  money = (n) =>
    Number(n).toLocaleString("zh-CN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }),
  esc = (s) =>
    String(s).replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
let device = localStorage.getItem("hb-device");
if (!device) {
  device = crypto.randomUUID?.() || "demo_" + Date.now();
  localStorage.setItem("hb-device", device);
}
const route = () => location.hash.slice(1) || "screen";
const event = () =>
  state.events.find((e) => e.id === selected) || state.events[5];
const ticket = () => state.tickets.find((t) => t.device === device);
const ownRecords = () =>
  state.redemptions.filter((r) => r.ticket === ticket()?.id);
const icon = (name) =>
  ({ screen: "◈", admin: "▦", mobile: "◉", merchant: "▣" })[name] || "↗";
function toast(s) {
  $("#toast").textContent = s;
  $("#toast").classList.add("show");
  setTimeout(() => $("#toast").classList.remove("show"), 3500);
}
async function api(path, data) {
  const r = await fetch("/api/" + path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const v = await r.json();
  if (!r.ok) throw Error(v.error);
  return v;
}
function nav() {
  return `<nav class="global-nav"><a class="brand" href="#screen"><b class="brand-mark">冀</b><span>冀动 <small>HEBEI SPORTS</small></span></a><div class="nav-links">${[
    ["screen", "赛事数据舱"],
    ["admin", "运营管理"],
    ["mobile", "观众端"],
    ["merchant", "商户端"],
  ]
    .map(
      ([k, v]) =>
        `<a class="${route() === k ? "active" : ""}" href="#${k}">${icon(k)} ${v}</a>`,
    )
    .join(
      "",
    )}</div><div class="nav-end"><span class="connection ${connected ? "on" : ""}">${connected ? "实时同步" : "连接中"}</span><button data-action="guide" class="quiet">演示导览</button><button data-action="reset" class="quiet" title="重置所有演示记录">↻ 重置</button></div></nav>`;
}
const panel = (title, sub, content, cls = "") =>
  `<section class="panel ${cls}"><div class="panel-heading"><h3>${title}</h3><span>${sub}</span></div>${content}</section>`;
function bars(values, labels, color = "") {
  return `<div class="bars">${values.map((v, i) => `<div><span>${labels[i]}</span><i><b style="width:${v}%;${color ? "background:" + color : ""}"></b></i><strong>${v}%</strong></div>`).join("")}</div>`;
}
function spark() {
  return `<svg class="spark" viewBox="0 0 400 110" preserveAspectRatio="none"><defs><linearGradient id="fade" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#42e8c0" stop-opacity=".3"/><stop offset="1" stop-color="#42e8c0" stop-opacity="0"/></linearGradient></defs><path d="M0 95L35 83L70 86L105 64L140 71L175 43L210 52L245 26L280 34L315 20L350 30L400 8V110H0Z" fill="url(#fade)"/><path d="M0 95L35 83L70 86L105 64L140 71L175 43L210 52L245 26L280 34L315 20L350 30L400 8" fill="none" stroke="#42e8c0" stroke-width="3"/></svg>`;
}
function map() {
  if (!geo) return "<p>地图载入中</p>";
  const project = ([x, y]) => [(x - 113.4) * 98 + 25, (42.7 - y) * 112 + 15];
  const totals = {};
  state.events.forEach(
    (e) => (totals[e.city] = (totals[e.city] || 0) + e.real),
  );
  const paths = geo.features
    .map((f) => {
      const name = f.properties.name.replace("市", "");
      const polygons =
        f.geometry.type === "MultiPolygon"
          ? f.geometry.coordinates
          : [f.geometry.coordinates];
      const d = polygons
        .flatMap((p) =>
          p.map(
            (r) =>
              r
                .map(
                  (xy, i) =>
                    (i ? "L" : "M") +
                    project(xy)
                      .map((n) => n.toFixed(1))
                      .join(","),
                )
                .join(" ") + "Z",
          ),
        )
        .join(" ");
      const p = project(f.properties.centroid || f.properties.center);
      const intensity = (totals[name] || 0) / 155000;
      return `<g class="map-city" tabindex="0" role="button" aria-label="查看${name}数据" data-city="${name}"><path d="${d}" fill="hsl(184 58% ${17 + intensity * 17}%)"/><text x="${p[0]}" y="${p[1]}">${name}</text></g>`;
    })
    .join("");
  return `<svg class="hebei-map" viewBox="0 0 650 730" aria-label="河北省11地市赛事分布地图"><defs><filter id="glow"><feGaussianBlur stdDeviation="5"/></filter></defs><g class="map-shadow" aria-hidden="true">${paths.replaceAll('tabindex="0"', "").replaceAll('role="button"', "")}</g>${paths}<text x="333" y="358" class="neighbor">北京</text><text x="410" y="410" class="neighbor">天津</text><text x="548" y="465" class="sea">渤 海</text><g class="event-pin" data-event="kangbao" tabindex="0" role="button" aria-label="打开康保草原马拉松"><circle cx="166" cy="151" r="26" class="pulse-ring"/><circle cx="166" cy="151" r="8"/><path d="M174 151H217V110H267"/><rect x="238" y="79" width="205" height="57" rx="5"/><text x="253" y="102">● 正在进行</text><text x="253" y="124" class="pin-title">康保草原马拉松 ↗</text></g><g class="event-pin secondary" data-event="xingtai" tabindex="0" role="button" aria-label="打开邢台轮滑"><circle cx="209" cy="600" r="7"/><text x="227" y="604">邢台轮滑 · 数据关注</text></g></svg>`;
}
function compare(es = state.events) {
  return `<div class="compare-head"><span>赛事 / 人数口径</span><span>测算</span><span>上报</span><span>实名</span></div><div class="compare-rows">${es.map((e) => `<button class="compare-row" data-event="${e.id}"><span><b>${e.name.replace("市速度轮滑精英邀请赛", "轮滑邀请赛").replace("中国马术场地障碍冠军杯赛", "马术场地障碍冠军杯赛").replace("全国帆船锦标赛暨全国青少年帆船冠军赛", "全国青少年帆船冠军赛")}</b><small>${e.city} · ${e.real && Math.abs((e.reported - e.real) / e.real) > 0.3 ? "<em>● 偏差 " + (((e.reported - e.real) / e.real) * 100).toFixed(1) + "%</em>" : "口径持续校验"}</small></span><span>${fmt(e.estimated)}</span><span class="${e.real && Math.abs((e.reported - e.real) / e.real) > 0.3 ? "warn" : ""}">${fmt(e.reported)}</span><strong>${e.real ? fmt(e.real) : "待开始"}</strong></button>`).join("")}</div>`;
}
function metrics() {
  return `<div class="metrics">${[
    ["年度重点赛事", "11", "场", "全省 11 地市统一视图"],
    [
      "赛事实名人数合计",
      fmt(state.totals.real),
      "人",
      "按赛事去重 · 跨赛事可重复",
    ],
    ["观赛票根", fmt(state.totals.tickets), "张", "康保试点 · 实时签发"],
    ["权益核销", fmt(state.totals.redemptions), "笔", "康保试点 · 每笔可追溯"],
    [
      "带动消费",
      money(state.totals.consumption / 10000),
      "万元",
      "康保试点 · 实际录入金额",
    ],
    ["试点合作商户", "6", "家", "住宿 · 餐饮 · 景区 · 零售"],
  ]
    .map(
      ([l, n, u, d]) =>
        `<div class="metric"><label>${l}</label><div><strong>${n}</strong><span>${u}</span></div><small>${d}</small></div>`,
    )
    .join("")}</div>`;
}
function screenPage() {
  const e = event();
  return `<main class="cockpit"><header class="screen-header"><div><span class="eyebrow">HEBEI · SPORTS INTELLIGENCE</span><h1>河北省体育赛事<span>数智服务平台</span></h1></div><div class="screen-date"><b>2027 / 08 / 09</b><span>星期一 · 赛事日 <i>演示数据</i></span></div></header><div class="screen-tabs"><div>${[
    ["overview", "全省总览"],
    ["event", "单场赛事"],
    ["city", "地市洞察"],
  ]
    .map(
      ([k, v]) =>
        `<button data-screen="${k}" class="${screen === k ? "active" : ""}">${v}</button>`,
    )
    .join(
      "",
    )}</div><div><span class="dot"></span> ${connected ? "数据链路已连接" : "等待重连"} <button class="quiet" data-action="fullscreen">⛶ 全屏演示</button></div></div>${screen === "overview" ? overview() : screen === "event" ? eventScreen(e) : cityScreen()}<footer class="screen-footer"><span>河北省体育局 · 赛事经济专题</span><span>演示数据｜业务日期固定为 2027.08.09｜个人信息默认脱敏</span><span>数据归集 → 票根连接 → 消费可核</span></footer></main>`;
}
function overview() {
  const ranking = Object.entries(
    state.events.reduce(
      (a, e) => ((a[e.city] = (a[e.city] || 0) + e.real), a),
      {},
    ),
  ).sort((a, b) => b[1] - a[1]);
  return `${metrics()}<div class="overview-grid"><div class="left-column">${panel("全省赛事节奏", "2027 赛历", `<div class="month-strip">${[5, 6, 7, 8, 9].map((m) => `<button data-month="${m}" class="${month === m ? "active" : ""}">${m}月</button>`).join("")}</div><div class="timeline"><div><i></i><small>${month}月 ${month === 8 ? "09" : "18"}日</small><h4>${month === 8 ? "康保草原马拉松" : "重点赛事筹备与数据归集"}</h4><span class="pill">${month === 8 ? "● 赛事进行中" : "计划赛历 · 模拟"}</span></div><div><i></i><small>${month}月 下旬</small><h4>${month === 8 ? "沧州青少年围棋名人战" : "地市群众体育赛事"}</h4><span>即将开始 · 赛事预告</span></div></div>`)}${panel("赛事项目分布", "11 场重点赛事", `<div class="distribution"><div class="donut"><div><strong>11</strong><span>赛事项目</span></div></div><div class="legend"><p><i></i>路跑 / 越野 <b>3</b></p><p><i></i>水上运动 <b>2</b></p><p><i></i>其他项目 <b>6</b></p></div></div>`)}${panel(
    "地市实名规模",
    "赛事人数合计",
    `<div class="ranking">${ranking
      .slice(0, 5)
      .map(
        ([c, n], i) =>
          `<button data-city="${c}"><b>0${i + 1}</b><span>${c}<i style="width:${n / 1600}%"></i></span><strong>${fmt(n)}</strong></button>`,
      )
      .join("")}</div>`,
  )}</div><div class="map-column"><div class="map-title"><span class="eyebrow">ONE PROVINCE · ONE VIEW</span><h2>一张图，看见赛事的力量</h2><p>11 地市协同 · 全链路数据归集</p></div>${map()}<div class="map-legend"><span><i></i>进行中</span><span><i></i>已结束</span><span>点击地市 / 赛事下钻 ↗</span></div><div class="map-note"><b>01</b><span>从“估算人流”到“实名参与”<small>多源报名 + 观赛票根 · 数据有据可循</small></span></div></div><div class="right-column">${panel("三口径数据对照", "单位：人", compare())}${panel("消费归集趋势", "康保试点 · 示意趋势", `<div class="trend-number"><strong>¥ ${money(state.totals.consumption)}</strong><span>核销消费累计</span></div>${spark()}<div class="axis"><span>08:00</span><span>10:00</span><span>12:00</span><span>14:00</span></div>`)}</div></div><div class="live-feed"><span class="live-label"><i class="dot"></i> 实时核销</span>${
    state.redemptions.length
      ? state.redemptions
          .slice(0, 3)
          .map(
            (r) =>
              `<span class="feed-item">${new Date(r.time).toLocaleTimeString("zh-CN")}　草原**餐厅 <b>¥${money(r.amount)}</b>　→ 康保草原马拉松</span>`,
          )
          .join("")
      : "<span>草原**餐厅　¥258.00　　康巴**民宿　¥680.00　　北疆**超市　¥120.00　 <small>预置示例记录 · 现场核销后实时更新</small></span>"
  }</div>`;
}
function eventScreen(e) {
  const isK = e.id === "kangbao";
  return `<div class="detail-title"><button class="back" data-screen="overview">← 返回全省</button><div><span class="eyebrow">EVENT INTELLIGENCE / ${e.city}</span><h2>${e.name}</h2><p>${e.city} · ${e.sport} · ${isK ? "2027.08.09 · 康保草原文化广场" : "2027 重点赛事 · 预置演示"}</p></div><span class="pill">${e.live ? "● 正在进行" : e.upcoming ? "即将开始" : "已结束"}</span></div><div class="event-stats">${[
    ["模型测算", e.estimated, "含参赛者、观众与游客"],
    ["地市上报", e.reported, "逐级报送人数"],
    ["实名参与", e.real, "报名 + 票根，赛事内去重"],
    [
      "上报偏差",
      e.real ? (((e.reported - e.real) / e.real) * 100).toFixed(1) + "%" : "—",
      "（上报 − 实名）÷ 实名",
    ],
  ]
    .map(
      ([l, v, d]) =>
        `<div><span>${l}</span><strong>${typeof v === "number" ? fmt(v) : v}</strong><small>${d}</small></div>`,
    )
    .join(
      "",
    )}</div><div class="insight-banner"><span>◈ 数据洞察</span>${isK ? "三渠道汇入 6,150 条，去重后 6,000 名参赛者；观赛票根让游客也有了实名记录。" : `上报与实名差异显著，建议核验统计范围、统计周期与观赛人群口径。`}</div><div class="event-panels">${panel("客源地分布", "模拟画像", bars([38, 24, 16, 12, 10], ["河北", "北京", "天津", "山西", "其他"]))}${panel("年龄与参与画像", "模拟画像", `<div class="profile-chart">${[15, 33, 36, 16].map((n, i) => `<div><i style="height:${n * 3}px"></i><b>${n}%</b><span>${["18–24", "25–34", "35–44", "45+"][i]}</span></div>`).join("")}</div><p class="muted">省外来客 62%　｜　复参率 24%</p>`)}${panel("赛事消费与收益", isK ? "实时联动" : "未接入消费试点", `<div class="big-value">${isK ? "¥ " + money(state.totals.consumption) : "—"}</div><p class="muted">已核销消费金额</p>${bars(isK ? [42, 31, 18, 9] : [0, 0, 0, 0], ["餐饮", "住宿", "零售", "其他"])}${isK ? '<button class="text-button" data-action="open-bill">查看归集账单 →</button>' : '<p class="muted">消费试点暂未覆盖该赛事</p>'}`)}</div><div class="event-bottom">${panel("赛事数据链路", "聚合，不替换", `<div class="flow">${["运营方报名", "实名去重", "票根签发", "商户核销", "赛事账单"].map((s, i) => `<div><b>0${i + 1}</b><span>${s}</span><small>${["标准接口归集", "一人一档", "观众与参赛者", "一笔一记录", "赛后 7 日内"][i]}</small></div>`).join("")}</div>`)}</div>`;
}
function cityScreen() {
  const es = state.events.filter((e) => e.city === city);
  return `<div class="detail-title"><button class="back" data-screen="overview">← 返回全省</button><div><span class="eyebrow">CITY INTELLIGENCE</span><h2>${city} · 赛事经济洞察</h2><p>赛事归集与实名参与 · 点击下表进入单场赛事</p></div><select id="city-select">${["张家口", "承德", "秦皇岛", "唐山", "廊坊", "保定", "石家庄", "沧州", "衡水", "邢台", "邯郸"].map((c) => `<option ${c === city ? "selected" : ""}>${c}</option>`).join("")}</select></div><div class="event-stats">${[
    ["重点赛事", es.length + " 场"],
    ["赛事实名合计", fmt(es.reduce((s, e) => s + e.real, 0))],
    ["全省赛事均值", fmt(Math.round(state.totals.real / 11))],
    [
      "本市赛事均值",
      es.length
        ? fmt(Math.round(es.reduce((s, e) => s + e.real, 0) / es.length))
        : "—",
    ],
  ]
    .map(
      ([l, v]) =>
        `<div><span>${l}</span><strong>${v}</strong><small>演示统计口径</small></div>`,
    )
    .join(
      "",
    )}</div>${panel("本市赛事数据", "三口径对照", es.length ? compare(es) : '<div class="empty">暂无已接入的重点赛事数据</div>')}${panel("商户覆盖", "试点分布", `<p class="muted">${city === "张家口" ? "康保试点已接入 6 家商户，覆盖餐饮、住宿、景区、零售与交通。" : "该地市尚未接入演示商户。"}</p>`)}`;
}
function adminPage() {
  const menus = [
    "工作台",
    "赛事管理",
    "数据接入",
    "实名档案",
    "票根管理",
    "商户管理",
    "结算中心",
    "数据报告",
    "系统设置",
  ];
  return `<div class="admin-layout"><aside class="sidebar"><div class="workspace-label">省级运营空间 <span>PROVINCE</span></div>${menus.map((m, i) => `<button data-admin="${m}" class="${adminTab === m ? "active" : ""}"><span>${["▦", "⚑", "⇄", "◉", "▤", "▧", "◇", "▥", "⚙"][i]}</span>${m}${m === "结算中心" ? "<i>1</i>" : ""}</button>`).join("")}<div class="sidebar-bottom"><div class="avatar">冀</div><b>省局演示管理员<small>全省统计 · 脱敏视图</small></b></div></aside><main class="admin-main"><div class="breadcrumb">工作空间 / <b>${adminTab}</b><span>● 演示环境　2027年8月9日</span></div>${adminContent()}</main></div>`;
}
function adminHeading(title, desc, button = "") {
  return `<div class="admin-heading"><div><span class="eyebrow">HEBEI SPORTS / MANAGEMENT</span><h1>${title}</h1><p>${desc}</p></div>${button}</div>`;
}
function eventTable() {
  return `<div class="table-wrap"><table><thead><tr><th>赛事名称</th><th>地市</th><th>测算人数</th><th>上报人数</th><th>实名人数</th><th>状态</th><th></th></tr></thead><tbody>${state.events
    .filter((e) => filter === "全部" || e.city === filter)
    .map(
      (e) =>
        `<tr><td><b>${e.name}</b><small>${e.sport} · 2027重点赛事</small></td><td>${e.city}</td><td>${fmt(e.estimated)}</td><td>${fmt(e.reported)}</td><td class="green">${e.real ? fmt(e.real) : "—"}</td><td><span class="badge ${e.live ? "green" : ""}">${e.live ? "进行中" : e.upcoming ? "未开始" : "已结束"}</span></td><td><button class="text-button" data-admin-event="${e.id}">详情 ↗</button></td></tr>`,
    )
    .join("")}</tbody></table></div>`;
}
function adminContent() {
  if (adminTab === "工作台")
    return `${adminHeading("每一场赛事，都有据可循。", "全省赛事数据统一归集，连接参与、消费与收益。", '<button class="primary" data-action="open-screen">进入数据舱 ↗</button>')}<div class="admin-stats">${[
      ["重点赛事", "11", "全省统一归集"],
      ["赛事实名合计", fmt(state.totals.real), "赛事内去重"],
      ["试点带动消费", "¥" + money(state.totals.consumption), "核销实时同步"],
      [
        "待确认账单",
        state.billStatus === "已确认" ? "0" : "1",
        "可追溯到每笔核销",
      ],
    ]
      .map(
        ([l, n, d]) =>
          `<div><span>${l}</span><strong>${n}</strong><small>${d}</small></div>`,
      )
      .join(
        "",
      )}</div><div class="work-grid"><section class="white-panel"><div class="section-title"><h2>今日重点</h2><span class="badge green">● 赛事日</span></div><div class="event-feature"><div class="landscape mini"></div><div><small>张家口 · 票根消费试点</small><h2>2027 康保草原马拉松</h2><p>3 个报名渠道 / 6,000 名参赛者 / 6 家合作商户</p><button class="primary" data-admin-event="kangbao">管理赛事 →</button></div></div></section><section class="white-panel"><div class="section-title"><h2>运营待办</h2><small>下一步行动</small></div><button class="todo" data-admin="数据接入"><span>01</span><div><b>跨渠道报名归集</b><small>6,150条原始记录 · 150条重复已合并</small></div>↗</button><button class="todo" data-admin="结算中心"><span>02</span><div><b>康保赛事收益账单</b><small>${state.billStatus} · 归集收入 ¥${money(income())}</small></div>↗</button></section></div><section class="white-panel"><div class="section-title"><h2>全省重点赛事</h2><button class="text-button" data-admin="赛事管理">查看全部 →</button></div>${eventTable()}</section>`;
  if (adminTab === "赛事管理")
    return `${adminHeading("赛事管理", "全省一张表，连接不同运营方的赛事数据。")}<section class="white-panel"><div class="section-title"><h2>赛事列表 <small>11</small></h2><select id="event-filter">${["全部", "张家口", "邢台", "秦皇岛", "邯郸", "承德", "唐山", "沧州", "石家庄"].map((c) => `<option ${filter === c ? "selected" : ""}>${c}</option>`).join("")}</select></div>${eventTable()}</section>`;
  if (adminTab === "赛事详情") return adminDetail();
  if (adminTab === "数据接入")
    return `${adminHeading("多源归集，一个真实的赛事档案", "康保草原马拉松 · 保留运营方现有报名系统，通过标准接口回传。")}<div class="channel-grid">${[
      ["最酷", "ZUICOOL", "3,100"],
      ["赛会通", "SAIHUITONG", "1,800"],
      ["汇跑官网", "HUIPAO", "1,250"],
    ]
      .map(
        ([n, en, count], i) =>
          `<section class="white-panel channel"><span class="channel-icon">${["Z", "S", "H"][i]}</span><span class="badge green">● 连接正常 · 模拟</span><h2>${n}</h2><small>${en}</small><strong>${count}<span>条报名</span></strong><p>最近同步 2027-08-09 09:42</p><div>成功率 <b>100%</b>　失败 <b>0</b></div></section>`,
      )
      .join(
        "",
      )}</div><section class="white-panel"><div class="section-title"><h2>跨源去重结果</h2><span class="badge green">已完成归集</span></div><div class="dedup"><div><strong>6,150</strong><span>三渠道原始报名</span></div><b>−</b><div><strong>150</strong><span>跨渠道重复记录</span></div><b>=</b><div><strong class="green">6,000</strong><span>去重后参赛者</span></div></div><div class="notice">按证件号哈希合并，同一参赛者在不同平台的报名归入同一档案。以下仅展示脱敏模拟记录。</div><table><thead><tr><th>姓名</th><th>证件号</th><th>来源渠道</th><th>归集结果</th></tr></thead><tbody><tr><td>张**</td><td>130***********0021</td><td>最酷 / 赛会通</td><td><span class="badge green">已合并为 1 人</span></td></tr><tr><td>李**</td><td>110***********0815</td><td>最酷 / 汇跑</td><td><span class="badge green">已合并为 1 人</span></td></tr></tbody></table></section>`;
  if (adminTab === "结算中心") return billPage();
  if (adminTab === "商户管理")
    return `${adminHeading("商户与消费记录", "6 家虚构商户参与康保试点，现场核销记录实时归集。")}<div class="merchant-cards">${merchants.map((m) => `<section class="white-panel"><span class="merchant-icon">${m.icon}</span><h3>${m.name}</h3><p>${m.type} · ${m.distance} 公里</p><span class="badge green">${m.offer}</span></section>`).join("")}</div><section class="white-panel"><div class="section-title"><h2>现场核销明细</h2></div>${recordsTable()}</section>`;
  if (adminTab === "票根管理" || adminTab === "实名档案")
    return `${adminHeading(adminTab, adminTab === "票根管理" ? "现场签发的票根在此实时显示；每人每场限领一张。" : "演示身份按设备去重，不采集真实身份证和手机号。")}<section class="white-panel"><table><thead><tr><th>票根编号</th><th>用户</th><th>类型</th><th>赛事</th><th>状态</th></tr></thead><tbody>${state.tickets.map((t) => `<tr><td>${t.id}</td><td>演示**</td><td>${t.type}</td><td>康保草原马拉松</td><td><span class="badge green">可用</span></td></tr>`).join("") || '<tr><td colspan="5" class="empty">尚无现场签发记录，请到观众端领取票根。</td></tr>'}</tbody></table></section>`;
  if (adminTab === "数据报告")
    return `${adminHeading("赛事经济报告", "报告使用当前演示数据，支持浏览器打印并另存为 PDF。")}<div class="channel-grid">${["康保草原马拉松报告", "2027年8月试点月报", "2027年度重点赛事概览"].map((n, i) => `<section class="white-panel report-card"><span>REPORT / 0${i + 1}</span><h2>${n}</h2><p>赛事参与 · 数据偏差 · 消费归集</p><button class="primary" data-report="${i}">预览与导出 →</button></section>`).join("")}</div>`;
  return `${adminHeading("操作审计", "所有演示导出、票根签发、核销与账单变更均留痕。")}<section class="white-panel"><table><thead><tr><th>操作时间</th><th>操作内容</th><th>环境</th></tr></thead><tbody>${state.audit.map((a) => `<tr><td>${esc(new Date(a.time).toLocaleString("zh-CN"))}</td><td>${esc(a.action)}</td><td>Demo · 非生产权限</td></tr>`).join("") || '<tr><td colspan="3" class="empty">暂无操作记录</td></tr>'}</tbody></table></section>`;
}
function adminDetail() {
  const e = event();
  return `${adminHeading(e.name, e.city + " · " + e.sport + " · 赛事完整数据链路", '<button class="outline" data-admin="赛事管理">返回赛事列表</button>')}<div class="admin-stats">${[
    ["测算人数", fmt(e.estimated)],
    ["地市上报", fmt(e.reported)],
    ["实名参与", fmt(e.real)],
    [
      "上报偏差",
      e.real ? (((e.reported - e.real) / e.real) * 100).toFixed(1) + "%" : "—",
    ],
  ]
    .map(([l, n]) => `<div><span>${l}</span><strong>${n}</strong></div>`)
    .join(
      "",
    )}</div><section class="white-panel"><div class="detail-tabs">${["报名数据", "票根", "商户", "账单"].map((t) => `<button data-detail-tab="${t}" class="${t === detailTab ? "active" : ""}">${t}</button>`).join("")}</div>${e.id !== "kangbao" ? `<div class="notice">该赛事已接入实名统计，尚未接入本次消费试点。</div>${compare([e])}` : detailTab === "报名数据" ? '<div class="dedup"><div><strong>6,150</strong><span>原始记录</span></div><div><strong>150</strong><span>重复合并</span></div><div><strong>6,000</strong><span>实名参赛者</span></div></div><button class="primary" data-admin="数据接入">查看三渠道归集 →</button>' : detailTab === "票根" ? `<h2>${fmt(state.totals.tickets)} 张观赛票根</h2><p>观众实名领取后自动签发；票根本身不会因权益使用而失效。</p><button class="primary" data-action="open-mobile">打开观众端</button>` : detailTab === "商户" ? merchants.map((m) => `<div class="line-item"><b>${m.name}</b><span>${m.type}</span><span>${m.offer}</span></div>`).join("") : `<div class="dedup"><div><strong>¥ ${money(income())}</strong><span>赛事归集收入</span></div><div><strong>${state.billStatus}</strong><span>当前账单状态</span></div></div><button class="primary" data-admin="结算中心">查看完整账单 →</button>`}</section>`;
}
function income() {
  return (
    Math.round((state.totals.consumption * 0.03 + 50000 - 315) * 100) / 100
  );
}
function recordsTable() {
  return `<div class="table-wrap"><table><thead><tr><th>核销时间</th><th>商户 / 票根</th><th>消费金额</th><th>优惠金额</th><th>分成 3%</th><th>归属赛事</th></tr></thead><tbody>${state.redemptions.map((r) => `<tr><td>${new Date(r.time).toLocaleTimeString("zh-CN")}</td><td>${r.merchant}<small>${r.ticket}</small></td><td>¥${money(r.amount)}</td><td>¥${money(r.discount)}</td><td class="green">¥${money(r.share)}</td><td>康保草原马拉松</td></tr>`).join("") || '<tr><td colspan="6" class="empty">等待现场第一笔核销。预置汇总 1,260 笔 / ¥315,000。</td></tr>'}</tbody></table></div>`;
}
function billPage() {
  return `${adminHeading("一场赛事，一份可核的收益账单", "2027 康保草原马拉松 · 账单编号 HB-ST-2027-0006", '<button class="outline" data-action="export-bill">↓ 导出账单 CSV</button>')}<section class="bill-hero"><div><span>本场赛事归集收入</span><strong>¥ ${money(income())}</strong><p>核销消费 × 商户分成比例 + 赞助收入 − 支付通道费</p></div><div><span class="badge">${state.billStatus}</span><small>演示账单 · 比赛日预览</small></div></section><div class="bill-parts">${[
    ["商户分成收入", state.totals.consumption * 0.03, "核销消费 × 3%"],
    ["赞助到账", 50000, "草原体育品牌 · 模拟合同"],
    ["支付通道费", 315, "预置示例固定费用"],
  ]
    .map(
      ([l, n, d]) =>
        `<div><span>${l}</span><strong>¥${money(n)}</strong><small>${d}</small></div>`,
    )
    .join(
      "",
    )}</div><section class="white-panel"><div class="section-title"><h2>确认与收益去向</h2><span>资金不经局方账户</span></div><div class="approval-flow"><span class="done">✓ 账单生成</span><i>→</i><span class="${state.billStatus !== "待办赛方确认" ? "done" : ""}">办赛方确认</span><i>→</i><span class="${state.billStatus === "已确认" ? "done" : ""}">省局确认</span></div><div class="bill-actions"><select id="destination">${["冲减次年运营服务费", "注入赛事扶持资金池"].map((v) => `<option ${state.destination === v ? "selected" : ""}>${v}</option>`).join("")}</select>${state.billStatus === "已确认" ? '<span class="badge green">✓ 两级确认完成</span>' : `<button class="primary" data-bill="${state.billStatus === "对账中" ? "resolve" : "confirm"}">${state.billStatus === "对账中" ? "完成对账，重新提交" : state.billStatus === "待办赛方确认" ? "模拟办赛方确认" : "模拟省局确认"}</button>`}<button class="outline" data-bill="dispute">发起对账</button></div><p class="muted">新增核销会重新打开确认流程。当前确认仅演示，不产生真实资金划拨。</p></section><section class="white-panel"><div class="section-title"><h2>核销明细 · 每笔可追溯</h2><span>现场新增 ${state.redemptions.length} 笔</span></div>${recordsTable()}</section>`;
}
function landscape() {
  return `<div class="landscape"><div class="sun"></div><div class="hill back-hill"></div><div class="hill front-hill"></div><div class="track"></div><div class="runner">↗</div><span>RUN INTO<br>THE WILD.</span><small>KANGBAO · 2027</small></div>`;
}
function mobilePage(merchant = false) {
  return `<main class="mobile-stage"><aside class="mobile-intro"><span class="eyebrow">${merchant ? "MERCHANT SERVICES" : "RUN. EXPLORE. CONNECT."}</span><h1>${merchant ? "每一次核销，<br>都连接赛事价值。" : "跑过草原，<br>把精彩留在河北。"}</h1><p>${merchant ? "3步完成权益核销，消费实时归集到赛事，经营效果清晰可见。" : "一张电子票根，连接一场赛事与一座城市。报名、领票、享权益，让赛事体验持续发生。"}</p><div class="device-spec">iPhone 15 <span>393 × 852</span></div><div class="demo-path"><span class="${ticket() ? "done" : ""}">01　实名领票</span><span class="${state.redemptions.length ? "done" : ""}">02　商户核销</span><span class="${state.redemptions.length ? "done" : ""}">03　数据回流</span></div><p class="small-note">同一局域网的手机打开电脑地址即可联动。<br>当前为演示环境，不采集真实个人信息。</p></aside><div class="phone-shell"><div class="phone-status"><b>9:41</b><div class="island"></div><span>▮▮▮  ▰</span></div><div class="phone-content">${merchant ? merchantContent() : consumerContent()}</div><nav class="phone-nav">${(merchant
    ? [
        ["scan", "▣", "核销"],
        ["records", "▥", "经营数据"],
      ]
    : [
        ["home", "⌂", "赛事"],
        ["benefits", "⌖", "权益"],
        ["tickets", "▤", "票根"],
        ["records", "◉", "我的"],
      ]
  )
    .map(
      ([k, i, n]) =>
        `<button data-${merchant ? "merchant" : "mobile"}="${k}" class="${(merchant ? merchantTab : mobileTab) === k ? "active" : ""}"><span>${i}</span>${n}</button>`,
    )
    .join(
      "",
    )}</nav><div class="home-indicator"></div></div><aside class="mobile-side-note"><span>LIVE DEMO</span><h3>${merchant ? "核销即归集" : "从赛场，走进城市"}</h3><p>${merchant ? "录入消费 258 元<br>享受满 200 减 30<br>赛事归集增加 7.74 元" : "6 家试点商户<br>5 类城市体验<br>1 张专属电子票根"}</p><button class="text-button" data-action="${merchant ? "open-screen" : "open-merchant"}">${merchant ? "查看大屏变化" : "前往商户核销"} →</button></aside></main>`;
}
function phoneHeader(title, sub = "") {
  return `<header class="phone-header"><div><small>${sub || "冀动 · 赛事服务"}</small><h2>${title}</h2></div><span class="phone-demo">演示</span></header>`;
}
function consumerContent() {
  const t = ticket();
  if (mobileTab === "home")
    return `${phoneHeader("去草原，跑一场。", "你好，运动生活家")}<div class="mobile-hero">${landscape()}<div class="hero-caption"><span class="badge">2027.08.09 · 正在进行</span><h1>康保草原<br>马拉松</h1><p>42.195km 的自由，与草原不期而遇</p></div></div><div class="phone-padded"><div class="location-row"><span>⌖ 张家口 · 康保草原文化广场</span><b>↗</b></div><button class="primary wide" data-mobile="${t ? "ticket" : "claim"}">${t ? "查看我的电子票根" : "免费领取观赛票根"} →</button><button class="text-button full" data-action="register">参赛报名入口 · 模拟报名与签发</button><div class="section-title"><h3>一张票根，畅享康保</h3><button data-mobile="benefits" class="text-button">全部 →</button></div><div class="benefit-mini"><div><span>¥30</span><b>餐饮满减</b><small>草原人家餐厅</small></div><div><span>8折</span><b>品质住宿</b><small>康巴诺尔民宿</small></div><div><span>半价</span><b>草原漫游</b><small>草原风光景区</small></div></div><p class="muted small">观赛也精彩，领取票根后即可享受周边权益。</p></div>`;
  if (mobileTab === "claim")
    return `${phoneHeader("领取你的赛事记忆")}<div class="phone-padded"><div class="claim-event"><span>01 / 实名确认</span><h2>2027 康保草原马拉松</h2><p>观赛票根 · 2027.08.09—08.12</p></div><div class="notice">使用预置虚拟身份体验，不填写真实身份证或手机号。</div><form id="claim-form"><label>体验身份<input value="演示观众" readonly></label><label>模拟手机验证<div class="input-row"><input value="138****2027" readonly><button type="button" class="outline" data-action="verify">模拟验证</button></div></label><label>模拟验证码<input name="code" placeholder="点击模拟验证获取" inputmode="numeric" maxlength="6" required></label><label class="check"><input type="checkbox" name="consent" required><span>我同意使用演示身份体验实名领票与权益核销，了解本次不处理真实个人信息。</span></label><button class="primary wide" type="submit">确认并领取票根 →</button></form><p class="muted small">同一演示身份每场限领一张 · 票根权益独立计次</p></div>`;
  if (mobileTab === "tickets")
    return `${phoneHeader("我的票根", "把每一次出发，珍藏起来")}<div class="phone-padded">${t ? `<button class="wallet-ticket" data-mobile="ticket"><small>KANGBAO MARATHON 2027</small><h2>康保草原马拉松</h2><p>${t.type}票根 · ${t.id}</p><div><span>● 权益可用</span><b>查看票根 →</b></div></button>` : '<div class="empty">你还没有票根<br><button class="primary" data-mobile="home">去发现赛事</button></div>'}</div>`;
  if (mobileTab === "ticket")
    return t
      ? `${phoneHeader("我的电子票根")}<div class="phone-padded"><div class="digital-ticket"><div class="ticket-top"><small>KANGBAO MARATHON</small><h2>2027 康保草原马拉松</h2><span>${t.type}票根 · 演示观众</span></div><div class="ticket-code"><span class="badge green">● 权益有效期内</span><div class="visual-code" aria-label="演示动态码图案，不用于真实扫码">${Array.from({ length: 121 }, (_, i) => `<i class="${(i * 37 + (i % 7) * 13) % 11 < 6 ? "black" : ""}"></i>`).join("")}</div><strong id="dynamic-code"></strong><small>演示动态码 · <b id="countdown">60</b> 秒后刷新</small><p class="ticket-id">${t.id}</p><button class="text-button" data-action="copy-ticket">复制票根号 · 商户输入备用</button></div><div class="ticket-bottom"><span>权益有效期</span><b>08.09 — ${t.type === "参赛" ? "08.16" : "08.12"}</b></div></div><p class="muted small center">码图为视觉演示；本 Demo 使用票根号完成核销。</p><button class="primary wide" data-mobile="benefits">查看附近权益 →</button><button class="text-button full" data-mobile="records">查看权益使用记录</button></div>`
      : emptyTicket();
  if (mobileTab === "benefits")
    return `${phoneHeader("跑完，还能逛一逛。", "康保 · 赛事专属权益")}<div class="phone-padded"><div class="segmented"><button data-map="false" class="${!mapMode ? "active" : ""}">附近列表</button><button data-map="true" class="${mapMode ? "active" : ""}">权益地图</button></div>${
      mapMode
        ? `<div class="benefit-map"><div class="map-road"></div><b class="map-start">⚑ 赛事起点</b>${merchants
            .slice(0, 5)
            .map(
              (m, i) =>
                `<button style="left:${15 + ((i * 29) % 65)}%;top:${20 + ((i * 19) % 63)}%" data-offer="${m.id}">${m.icon}</button>`,
            )
            .join("")}<small>周边位置示意 · 非导航地图</small></div>`
        : ""
    }${merchants.map((m) => `<button class="offer-card" data-offer="${m.id}"><span class="merchant-icon">${m.icon}</span><div><h3>${m.name}</h3><p>${m.type} · 距起点 ${m.distance} km</p><b>${m.offer}</b></div><span>›</span></button>`).join("")}</div>`;
  return `${phoneHeader("我的权益记录")}<div class="phone-padded"><div class="savings"><span>已为你节省</span><strong>¥ ${money(ownRecords().reduce((s, r) => s + r.discount, 0))}</strong><small>让每一份热爱，都有回响。</small></div>${
    ownRecords()
      .map(
        (r) =>
          `<div class="record-card"><span class="badge green">已核销</span><h3>${r.merchant}</h3><p>满200减30 · 消费 ¥${money(r.amount)}</p><small>${new Date(r.time).toLocaleString("zh-CN")}</small><div>优惠 <b>¥30.00</b></div></div>`,
      )
      .join("") ||
    '<div class="empty">暂无使用记录<br>领取票根后，前往合作商户享权益。</div>'
  }<button class="outline wide" data-mobile="benefits">去看看附近权益</button></div>`;
}
function emptyTicket() {
  return `${phoneHeader("我的电子票根")}<div class="empty">请先领取本场赛事票根<button class="primary" data-mobile="claim">立即领取</button></div>`;
}
function merchantContent() {
  if (merchantTab === "records")
    return `${phoneHeader("今日经营", "草原人家餐厅 · 商户服务")}<div class="phone-padded"><div class="savings"><span>现场核销消费</span><strong>¥${money(state.redemptions.reduce((s, r) => s + r.amount, 0))}</strong><small>新增 ${state.redemptions.length} 笔 · 康保草原马拉松</small></div>${state.redemptions.map((r) => `<div class="record-card"><span class="badge green">核销成功</span><h3>满200减30</h3><p>消费 ¥${money(r.amount)} · 优惠 ¥30</p><small>${r.ticket}</small><div>赛事归集 <b>¥${money(r.share)}</b></div></div>`).join("") || '<div class="empty">暂无现场核销，去完成第一笔消费吧。</div>'}</div>`;
  if (merchantTab === "success")
    return `${phoneHeader("核销结果")}<div class="phone-padded"><div class="success-mark">✓</div><h2 class="center">核销成功</h2><p class="center muted">已归集到康保草原马拉松</p><div class="receipt"><span>草原人家餐厅</span><strong>¥${money(state.redemptions[0]?.amount || 0)}</strong><p>满200减30 · 优惠 ¥30.00</p><div class="line-item"><span>赛事分成</span><b>¥${money(state.redemptions[0]?.share || 0)}</b></div><div class="line-item"><span>同步状态</span><b class="green">大屏 / 后台已更新</b></div></div><button class="primary wide" data-merchant="records">查看今日经营</button><button class="text-button full" data-merchant="scan">继续核销</button></div>`;
  return `${phoneHeader("扫码核销", "草原人家餐厅 · 店员工作台")}<div class="phone-padded"><div class="scan-visual"><div class="scan-corners"></div><span>▦</span><p>核验赛事票根 · 享专属权益</p></div><div class="notice">演示采用票根号核销，请粘贴观众端复制的号码。</div><form id="redeem-form"><label>票根编号<input name="ticket" placeholder="HB2027-0006-015801" required autocomplete="off"></label><button type="button" class="text-button" data-action="latest-ticket">填入最新演示票根</button><label>核销权益<select name="offer"><option>草原人家餐厅 · 满200减30</option></select></label><label>消费金额（元）<input name="amount" value="258" type="number" min="200" max="100000" step="0.01" required></label><div class="discount-row"><span>本次优惠</span><b>− ¥30.00</b></div><button type="submit" class="primary wide">核对并确认核销 →</button><p class="muted small">每人限用 1 次 · 分成比例 3% · 不产生真实交易</p></form></div>`;
}
function render() {
  if (!state) return;
  const r = route();
  document.body.className = r === "screen" ? "dark" : "light";
  $("#app").innerHTML =
    nav() +
    (r === "screen"
      ? screenPage()
      : r === "admin"
        ? adminPage()
        : r === "mobile"
          ? mobilePage()
          : r === "merchant"
            ? mobilePage(true)
            : screenPage());
  updateCode();
}
function updateCode() {
  const node = $("#dynamic-code");
  if (node) {
    const period = Math.floor(Date.now() / 60000);
    node.textContent = String((period * 73 + 15801) % 1000000)
      .padStart(6, "0")
      .replace(/(\d{3})/, "$1 ");
    $("#countdown").textContent = 60 - (Math.floor(Date.now() / 1000) % 60);
  }
}
function modal(html) {
  const el = document.createElement("div");
  el.className = "modal-backdrop";
  el.innerHTML = `<section class="modal" role="dialog" aria-modal="true"><button class="modal-close" data-action="close">×</button>${html}</section>`;
  document.body.append(el);
  el.querySelector("button")?.focus();
}
function guide() {
  modal(
    `<span class="eyebrow">20 MINUTES / LEADERSHIP DEMO</span><h2>从一场赛事，看见完整价值。</h2><p>按顺序体验四端，现场新增数据会同步到所有设备。</p><div class="guide-list">${[
      ["全省总览", "3分钟 · 11场赛事与三口径对照"],
      ["邢台轮滑", "2分钟 · 识别上报与实名偏差"],
      ["多源归集", "3分钟 · 三渠道回传与150人去重"],
      ["实名领票", "4分钟 · 观众游客领取电子票根"],
      ["商户核销", "3分钟 · 消费258元，优惠30元"],
      ["实时大屏", "2分钟 · 新增核销与消费金额同步"],
      ["收益账单", "3分钟 · 下钻明细与两级确认"],
    ]
      .map(
        ([n, d], i) =>
          `<button data-guide="${i}"><b>0${i + 1}</b><div><strong>${n}</strong><small>${d}</small></div>→</button>`,
      )
      .join(
        "",
      )}</div><p class="muted small">使用完可点击右上角“重置”恢复开场数据。移动端通过同一服务地址联动。</p><button class="text-button" data-action="extensions">可选能力：直播制播与运动员数字档案 →</button>`,
  );
}
function openReport(i) {
  const n = [
    "康保草原马拉松赛事报告",
    "2027年8月试点月报",
    "2027年度重点赛事概览",
  ][i];
  modal(
    `<article id="print-report"><span class="eyebrow">HEBEI SPORTS / REPORT</span><h1>${n}</h1><p>演示数据 · 业务日期 2027年8月9日</p><h2>参与与归集</h2><p>康保三渠道回传 6,150 条报名，合并 150 条重复，形成 6,000 名参赛者。</p><p>观赛票根 ${fmt(state.totals.tickets)} 张；康保实名参与 ${fmt(state.events[5].real)} 人。</p><h2>消费与收益</h2><p>核销 ${fmt(state.totals.redemptions)} 笔；带动消费 ¥${money(state.totals.consumption)}。</p><p>归集收入 ¥${money(income())}；状态：${state.billStatus}；去向：${state.destination}。</p><h2>数据口径说明</h2><p>实名按赛事内去重；全省赛事人数合计非全省自然人去重。消费采用核销录入值；省内其他赛事消费未接入试点。所有身份、商户、消费均为模拟。</p></article><button class="primary" data-action="print">打印 / 另存 PDF</button>`,
  );
}
document.addEventListener("click", async (ev) => {
  const b = ev.target.closest("button,a,[data-event],[data-city]");
  if (!b) return;
  try {
    if (b.dataset.screen) {
      screen = b.dataset.screen;
      render();
    }
    if (b.dataset.event) {
      selected = b.dataset.event;
      screen = "event";
      render();
    }
    if (b.dataset.city) {
      city = b.dataset.city;
      screen = "city";
      render();
    }
    if (b.dataset.admin) {
      adminTab = b.dataset.admin;
      render();
    }
    if (b.dataset.adminEvent) {
      selected = b.dataset.adminEvent;
      adminTab = "赛事详情";
      render();
    }
    if (b.dataset.detailTab) {
      detailTab = b.dataset.detailTab;
      render();
    }
    if (b.dataset.mobile) {
      mobileTab = b.dataset.mobile;
      render();
    }
    if (b.dataset.merchant) {
      merchantTab = b.dataset.merchant;
      render();
    }
    if (b.dataset.map) {
      mapMode = b.dataset.map === "true";
      render();
    }
    if (b.dataset.month) {
      month = Number(b.dataset.month);
      render();
    }
    if (b.dataset.offer) {
      const m = merchants.find((m) => m.id === b.dataset.offer);
      modal(
        `<span class="eyebrow">KANGBAO / CITY BENEFITS</span><h2>${m.name}</h2><p>${m.type} · 距赛事起点 ${m.distance} 公里</p><div class="offer-detail">${m.offer}</div><p>凭康保草原马拉松有效票根到店享受。每人限用一次，使用后票根继续有效。</p><p class="muted">商户与位置为虚构演示；不提供真实导航。</p><button class="primary" data-action="use-offer">${ticket() ? "出示我的票根" : "先领取赛事票根"}</button>`,
      );
    }
    if (b.dataset.bill) {
      state = await api("bill", { action: b.dataset.bill });
      render();
      toast("账单状态已更新");
    }
    if (b.dataset.report !== undefined) openReport(Number(b.dataset.report));
    if (b.dataset.guide !== undefined) {
      step = Number(b.dataset.guide);
      $(".modal-backdrop")?.remove();
      if ([0, 1, 5].includes(step)) {
        screen = step === 1 ? "event" : "overview";
        selected = "xingtai";
        location.hash = "screen";
      } else if ([2, 6].includes(step)) {
        adminTab = step === 2 ? "数据接入" : "结算中心";
        location.hash = "admin";
      } else {
        location.hash = step === 3 ? "mobile" : "merchant";
        mobileTab = "home";
        merchantTab = "scan";
      }
      render();
    }
    switch (b.dataset.action) {
      case "guide":
        guide();
        break;
      case "close":
        $(".modal-backdrop")?.remove();
        break;
      case "reset":
        modal(
          '<h2>重置本次演示？</h2><p>现场领取的票根、核销和账单确认将清空，所有设备恢复开场模拟数据。</p><button class="primary" data-action="confirm-reset">确认重置</button>',
        );
        break;
      case "confirm-reset":
        state = await api("reset", {});
        $(".modal-backdrop")?.remove();
        mobileTab = "home";
        merchantTab = "scan";
        render();
        toast("已恢复开场数据");
        break;
      case "fullscreen":
        if (document.fullscreenElement) await document.exitFullscreen();
        else await document.documentElement.requestFullscreen();
        break;
      case "open-bill":
        adminTab = "结算中心";
        location.hash = "admin";
        break;
      case "open-screen":
        location.hash = "screen";
        screen = "overview";
        render();
        break;
      case "open-mobile":
        location.hash = "mobile";
        break;
      case "open-merchant":
        location.hash = "merchant";
        break;
      case "verify":
        $("#claim-form [name=code]").value = "202708";
        toast("模拟验证成功，验证码已填入");
        break;
      case "register":
        modal(
          '<h2>免费报名 · 演示入口</h2><p>康保草原马拉松 / 欢乐跑组。使用预置演示身份报名，自动签发参赛票根。</p><p class="muted">三方正式报名系统保持原有流程；此处用于演示平台免费报名工具。</p><button class="primary" data-action="register-confirm">模拟报名并签发票根</button>',
        );
        break;
      case "register-confirm": {
        const v = await api("tickets", { device, type: "参赛", consent: true });
        state = v.state;
        $(".modal-backdrop")?.remove();
        mobileTab = "ticket";
        render();
        toast("报名成功，电子票根已签发");
        break;
      }
      case "copy-ticket":
        try {
          await navigator.clipboard.writeText(ticket().id);
          toast("票根号已复制");
        } catch {
          toast("请手动复制票根号：" + ticket().id);
        }
        break;
      case "latest-ticket": {
        const t = state.tickets.at(-1);
        if (t) $("#redeem-form [name=ticket]").value = t.id;
        else toast("请先在观众端领取票根");
        break;
      }
      case "use-offer":
        $(".modal-backdrop")?.remove();
        mobileTab = ticket() ? "ticket" : "claim";
        render();
        break;
      case "export-bill": {
        await api("audit", {});
        const text =
          "\uFEFF账单,赛事,核销消费,商户分成,赞助,通道费,归集收入,状态,去向\r\n" +
          [
            "HB-ST-2027-0006",
            "康保草原马拉松",
            state.totals.consumption,
            (state.totals.consumption * 0.03).toFixed(2),
            50000,
            315,
            income(),
            state.billStatus,
            state.destination,
          ].join(",") +
          "\r\n\r\n票根,商户,消费,优惠,分成\r\n" +
          state.redemptions
            .map((r) =>
              [r.ticket, r.merchant, r.amount, r.discount, r.share].join(","),
            )
            .join("\r\n");
        const url = URL.createObjectURL(
          new Blob([text], { type: "text/csv;charset=utf-8" }),
        );
        const a = document.createElement("a");
        a.href = url;
        a.download = "康保赛事收益账单.csv";
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        toast("账单已导出，操作已留痕");
        break;
      }
      case "extensions":
        document.querySelector(".modal-backdrop")?.remove();
        modal(
          '<span class="eyebrow">OPTIONAL CAPABILITIES / ROADMAP</span><h2>从赛事服务，延伸更多可能。</h2><div class="white-panel"><h3>直播制播</h3><p>预留重点赛事直播聚合与回看入口，后续对接赛事信号、版权与制播服务。当前为能力说明，不提供模拟直播。</p></div><div class="white-panel"><h3>运动员数字档案</h3><p>在授权和数据接口明确后，汇集参赛经历与运动成绩。保留现有计时、成绩系统，不替代“户外在河北”的积分、战队与证书。</p></div><span class="badge">可选扩展 · 不在本次主线交付范围</span>',
        );
        break;
      case "print":
        await api("audit", {});
        window.print();
        break;
    }
  } catch (e) {
    toast(e.message);
  }
});
document.addEventListener("change", async (ev) => {
  try {
    if (ev.target.id === "city-select") {
      city = ev.target.value;
      render();
    }
    if (ev.target.id === "event-filter") {
      filter = ev.target.value;
      render();
    }
    if (ev.target.id === "destination") {
      state = await api("bill", {
        action: "destination",
        value: ev.target.value,
      });
      render();
      toast("收益去向已更新");
    }
  } catch (e) {
    toast(e.message);
  }
});
document.addEventListener("submit", async (ev) => {
  ev.preventDefault();
  const f = ev.target;
  const b = f.querySelector("[type=submit]");
  b.disabled = true;
  try {
    const data = new FormData(f);
    if (f.id === "claim-form") {
      if (data.get("code") !== "202708")
        throw Error("请点击模拟验证获取演示验证码");
      const v = await api("tickets", {
        device,
        type: "观赛",
        consent: data.get("consent") === "on",
      });
      state = v.state;
      mobileTab = "ticket";
      render();
      toast("领取成功，实名数据已同步");
    }
    if (f.id === "redeem-form") {
      const v = await api("redeem", {
        ticket: data.get("ticket").trim(),
        amount: data.get("amount"),
      });
      state = v.state;
      merchantTab = "success";
      render();
      toast("核销成功，大屏与账单已更新");
    }
  } catch (e) {
    toast(e.message);
    b.disabled = false;
  }
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") $(".modal-backdrop")?.remove();
  if (e.key === "Enter" && e.target.matches("[data-city],[data-event]"))
    e.target.click();
});
window.addEventListener("hashchange", render);
try {
  [state, geo] = await Promise.all([
    fetch("/api/state").then((r) => r.json()),
    fetch("/hebei.json").then((r) => r.json()),
  ]);
  render();
  const stream = new EventSource("/api/stream");
  stream.onopen = () => {
    connected = true;
    render();
  };
  stream.onmessage = (e) => {
    const next = JSON.parse(e.data);
    const changed = state.revision !== next.revision;
    state = next;
    if (changed) {
      const focused = document.activeElement;
      const editing = focused?.matches("input,select");
      if (!editing) render();
    }
  };
  stream.onerror = () => {
    connected = false;
    document.querySelectorAll(".connection").forEach((el) => {
      el.textContent = "连接中";
      el.classList.remove("on");
    });
  };
  setInterval(updateCode, 1000);
} catch (e) {
  $("#app").innerHTML =
    '<main class="empty"><h1>服务连接失败</h1><p>请先运行 npm start，再访问 http://localhost:3000</p><button onclick="location.reload()">重新连接</button></main>';
}
