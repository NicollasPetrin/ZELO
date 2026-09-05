import { createServer } from "node:http";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import sharp from "sharp";

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : "playwright");
const origin = "http://127.0.0.1:3000";
const browser = await chromium.launch({ headless: true, channel: process.env.BROWSER_CHANNEL || undefined });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
let server;
try {
  await page.goto(origin);
  const cssLinks = await page.locator('link[rel="stylesheet"]').evaluateAll((links) => links.map((link) => link.href));
  const font = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--font-manrope"));
  const allowed = new Set(["painel", "tarefas", "relatorios"]);
  server = createServer(async (req, res) => {
    const id = new URL(req.url, "http://localhost").pathname.slice(1);
    if (!allowed.has(id)) { res.writeHead(404).end(); return; }
    try {
      const content = await readFile(resolve(`.next/landing-captures/${id}.html`), "utf8");
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.end(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><base href="${origin}/">${cssLinks.map((href) => `<link rel="stylesheet" href="${href}">`).join("")}<style>:root{--font-manrope:${font}}body{margin:0}*{animation:none!important;transition:none!important}</style></head><body>${content}</body></html>`);
    } catch { res.writeHead(500).end("Generate the fixtures first."); }
  });
  await new Promise((done) => server.listen(3001, "127.0.0.1", done));
  for (const id of allowed) {
    await page.setViewportSize({ width: 1600, height: 1000 });
    await page.goto(`http://127.0.0.1:3001/${id}`, { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    const screenshot = await page.screenshot();
    await writeFile(resolve(`public/demo/zelo-${id}.webp`), await sharp(screenshot).webp({ quality: 90 }).toBuffer());
    if (id === "tarefas") {
      const table = page.locator("table").first();
      const firstColumn = await table.locator("th").first().boundingBox();
      const tableImage = await table.screenshot();
      const tableSize = await sharp(tableImage).metadata();
      const crop = { left: 0, top: 0, width: Math.floor(firstColumn.width), height: tableSize.height };
      await writeFile(resolve(`public/demo/zelo-${id}-mobile.webp`), await sharp(tableImage).extract(crop).resize(390, 560, { fit: "contain", position: "top", background: "#ffffff" }).webp({ quality: 92 }).toBuffer());
      console.log(`Captured ${id}: actual page, fictional data.`);
      continue;
    }
    await page.setViewportSize({ width: 390, height: 844 });
    const detail = id === "painel"
      ? page.getByRole("heading", { name: "Proximos prazos", exact: true }).locator("../..")
      : page.locator("main > div > section").first();
    const mobile = await detail.screenshot();
    const metadata = await sharp(mobile).metadata();
    const crop = { left: 0, top: 0, width: Math.min(metadata.width, 390), height: metadata.height };
    await writeFile(resolve(`public/demo/zelo-${id}-mobile.webp`), await sharp(mobile).extract(crop).resize(390, 560, { fit: "cover", position: "top" }).webp({ quality: 92 }).toBuffer());
    console.log(`Captured ${id}: actual page, fictional data.`);
  }
} finally {
  await browser.close();
  if (server) await new Promise((done) => server.close(done));
}
