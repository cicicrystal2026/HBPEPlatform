import http from "node:http";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve, extname } from "node:path";
import { randomUUID } from "node:crypto";
import { events } from "./public/data.js";
import { calculateSettlement } from "./public/settlement.js";
import { freshV3, commandV3, metricsV3 } from "./v3-business.js";
const port = Number(process.env.PORT || 3000),
  root = resolve("public");
const dir = resolve(process.env.DATA_DIR || ".data");
mkdirSync(dir, { recursive: true });
const file = resolve(dir, "state.json");
const fresh = () => ({
  v3: freshV3(),
  tickets: [],
  redemptions: [],
  billStatus: "待办赛方确认",
  destination: "冲减次年运营服务费",
  audit: [],
  revision: 0,
});
let state = existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : fresh();
state.v3 ||= freshV3();
const clients = new Set();
function snapshot() {
  return {
    ...state,
    ops: metricsV3(state),
    events: events.map((e) => ({
      ...e,
      real:
        e.real +
        (e.id === "kangbao"
          ? state.tickets.length + (state.v3.growthCount || 0)
          : 0),
    })),
    totals: {
      real:
        events.reduce((s, e) => s + e.real, 0) +
        state.tickets.length +
        (state.v3.growthCount || 0),
      ...calculateSettlement(
        state.redemptions.filter((r) => r.status !== "已退款"),
      ),
      redemptions:
        1260 + state.redemptions.filter((r) => r.status !== "已退款").length,
      tickets:
        15800 +
        state.tickets.filter((t) => t.type === "观赛").length +
        (state.v3.growthCount || 0),
    },
    serverTime: Date.now(),
  };
}
function save(action) {
  state.revision++;
  state.audit.unshift({ action, time: new Date().toISOString() });
  state.audit = state.audit.slice(0, 100);
  writeFileSync(file, JSON.stringify(state));
  for (const c of clients) c.write(`data: ${JSON.stringify(snapshot())}\n\n`);
}
function json(res, data, status = 200) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(JSON.stringify(data));
}
async function body(req) {
  let raw = "";
  for await (const part of req) {
    raw += part;
    if (raw.length > 10000) throw Error("请求过大");
  }
  return JSON.parse(raw || "{}");
}
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://localhost");
    if (url.pathname === "/api/state") return json(res, snapshot());
    if (url.pathname === "/api/stream") {
      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      });
      res.write(`data: ${JSON.stringify(snapshot())}\n\n`);
      clients.add(res);
      req.on("close", () => clients.delete(res));
      return;
    }
    if (req.method === "POST" && url.pathname.startsWith("/api/")) {
      const b = await body(req);
      if (url.pathname === "/api/tickets") {
        if (!b.consent || !["参赛", "观赛"].includes(b.type))
          return json(res, { error: "请同意演示授权并选择票根类型" }, 400);
        if (!/^[a-zA-Z0-9_-]{8,80}$/.test(b.device || ""))
          return json(res, { error: "演示身份无效" }, 400);
        let ticket = state.tickets.find((t) => t.device === b.device);
        if (!ticket) {
          ticket = {
            id: `HB2027-0006-${String(state.tickets.length + 15801).padStart(6, "0")}`,
            device: b.device,
            name: "演示观众",
            type: b.type,
            eventId: "kangbao",
            issuedAt: new Date().toISOString(),
          };
          state.tickets.push(ticket);
          save("模拟实名去重与票根签发");
        }
        return json(res, { ticket, state: snapshot() });
      }
      if (url.pathname.startsWith("/api/v3/")) {
        const { result, action } = commandV3(state, url.pathname.slice(8), b);
        if (action) save(action);
        return json(res, { ...result, state: snapshot() });
      }
      if (url.pathname === "/api/redeem")
        return json(
          res,
          { error: "商户不可手工录入消费，请使用票根买单或权益券核销" },
          410,
        );
      if (url.pathname === "/api/bill") {
        if (b.action === "confirm") {
          if (state.billStatus === "待办赛方确认")
            state.billStatus = "待省局确认";
          else if (state.billStatus === "待省局确认")
            state.billStatus = "已确认";
          else return json(res, { error: "账单已完成确认" }, 409);
        } else if (b.action === "dispute") state.billStatus = "对账中";
        else if (b.action === "resolve" && state.billStatus === "对账中")
          state.billStatus = "待办赛方确认";
        else if (
          b.action === "destination" &&
          ["冲减次年运营服务费", "注入赛事扶持资金池"].includes(b.value)
        )
          state.destination = b.value;
        else return json(res, { error: "无效账单操作" }, 400);
        save("演示账单操作：" + b.action);
        return json(res, snapshot());
      }
      if (url.pathname === "/api/audit") {
        save("导出脱敏演示数据");
        return json(res, { ok: true });
      }
      if (url.pathname === "/api/reset") {
        const previousRevision = state.revision;
        state = fresh();
        state.revision = previousRevision;
        save("重置演示数据");
        return json(res, snapshot());
      }
      return json(res, { error: "接口不存在" }, 404);
    }
    const path = resolve(
      root,
      "." +
        decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname),
    );
    if (!path.startsWith(root + "\\") && !path.startsWith(root + "/"))
      return json(res, { error: "禁止访问" }, 403);
    try {
      const data = readFileSync(path);
      res.writeHead(200, {
        "Content-Type":
          {
            ".html": "text/html; charset=utf-8",
            ".js": "text/javascript; charset=utf-8",
            ".css": "text/css; charset=utf-8",
            ".svg": "image/svg+xml",
            ".json": "application/json",
          }[extname(path)] || "application/octet-stream",
      });
      res.end(data);
    } catch {
      return json(res, { error: "文件不存在" }, 404);
    }
  } catch (e) {
    json(res, { error: e.message }, e.status || 400);
  }
});
setInterval(() => {
  if (state.v3.growthActive) {
    state.v3.growthCount = (state.v3.growthCount || 0) + 1;
    save("模拟观众入场增长（独立标记）");
  }
}, 2000).unref();
setInterval(() => {
  for (const c of clients) c.write(": heartbeat\n\n");
}, 15000).unref();
server.listen(port, "0.0.0.0", () =>
  console.log(`Hebei demo http://localhost:${port}`),
);
