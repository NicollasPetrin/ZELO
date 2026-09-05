import { createServer } from "node:http";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import sharp from "sharp";

// Importado por caminho absoluto, o playwright chega como modulo CJS e o
// chromium fica em `default`; como especificador simples, vem nomeado.
const playwright = await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : "playwright");
const { chromium } = playwright.chromium ? playwright : playwright.default;
const origin = "http://127.0.0.1:3000";
const browser = await chromium.launch({ headless: true, channel: process.env.BROWSER_CHANNEL || undefined });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
const mobilePage = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const mobileOnly = process.argv.includes("--mobile-only");
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
    if (!mobileOnly) {
      await page.goto(`http://127.0.0.1:3001/${id}`, { waitUntil: "networkidle" });
      await page.evaluate(() => document.fonts.ready);
      const screenshot = await page.screenshot();
      await writeFile(resolve(`public/demo/zelo-${id}.webp`), await sharp(screenshot).webp({ quality: 90 }).toBuffer());
    }
    await mobilePage.setViewportSize({ width: id === "tarefas" ? 1600 : 390, height: id === "tarefas" ? 1000 : 844 });
    await mobilePage.goto(`http://127.0.0.1:3001/${id}`, { waitUntil: "networkidle" });
    await mobilePage.evaluate(() => document.fonts.ready);
    // A sticky navigation bar must not cover the component being captured.
    await mobilePage.addStyleTag({ content: ".sticky { position: static !important; }" });
    let mobile;
    if (id === "tarefas") {
      const table = mobilePage.locator("table").first();
      const firstColumn = await table.locator("th").first().boundingBox();
      const tableImage = await table.screenshot();
      const tableSize = await sharp(tableImage).metadata();
      mobile = await sharp(tableImage).extract({ left: 0, top: 0, width: Math.floor(firstColumn.width * 2), height: tableSize.height }).toBuffer();
    } else {
      const detail = id === "painel"
        ? mobilePage.getByRole("heading", { name: "Proximos prazos", exact: true }).locator("../..")
        : mobilePage.locator("main > div > section").first();
      await detail.scrollIntoViewIfNeeded();
      mobile = await detail.screenshot();
      if (id === "relatorios") {
        const bounds = await detail.boundingBox();
        const lastCard = await detail.locator(":scope > div").nth(2).boundingBox();
        const size = await sharp(mobile).metadata();
        // End on a complete indicator, instead of cutting the following card.
        mobile = await sharp(mobile).extract({ left: 0, top: 0, width: size.width, height: Math.min(size.height, Math.ceil((lastCard.y + lastCard.height - bounds.y) * 2)) }).toBuffer();
      }
    }
    await writeFile(resolve(`public/demo/zelo-${id}-mobile.webp`), await sharp(mobile).resize(780, 1000, { fit: "contain", position: "top", background: "#f8fafc" }).webp({ quality: 92 }).toBuffer());
    console.log(`Captured ${id}: actual page, fictional data.`);
  }
} finally {
  await browser.close();
  if (server) await new Promise((done) => server.close(done));
}
