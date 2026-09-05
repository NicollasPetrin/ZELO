import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : "playwright");
const browser = await chromium.launch({ headless: true, channel: process.env.BROWSER_CHANNEL || undefined });
const output = resolve(".next/landing-review");
await mkdir(output, { recursive: true });
const results = [];
const errors = [];
try {
  for (const [width, height] of [[1440, 1000], [1280, 720], [1920, 1080], [768, 1024], [390, 844], [360, 740]]) {
    const page = await browser.newPage({ viewport: { width, height }, reducedMotion: "reduce" });
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("http://127.0.0.1:3000", { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    const dimensions = await page.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth, demoTop: document.querySelector("#demonstracao").getBoundingClientRect().top }));
    assert(dimensions.scrollWidth <= dimensions.width, `Horizontal overflow at ${width}`);
    assert(dimensions.demoTop < height, `Product missing from first viewport at ${width}`);
    await page.locator("footer").scrollIntoViewIfNeeded();
    await page.locator("footer img").evaluate((img) => img.decode());
    await page.getByRole("link", { name: "Zelo, página inicial", exact: true }).scrollIntoViewIfNeeded();
    const images = await page.locator('img').evaluateAll((items) => items.filter((img) => img.getBoundingClientRect().height > 0).map((img) => ({ src: img.currentSrc, loaded: img.complete && img.naturalWidth > 0 })));
    assert(images.every((img) => img.loaded), `Missing image at ${width}: ${JSON.stringify(images)}`);
    await page.screenshot({ path: resolve(output, `landing-${width}.png`), fullPage: true });
    await page.screenshot({ path: resolve(output, `hero-${width}.png`) });
    for (const tab of ["Tarefas", "Relatórios", "Painel"]) {
      await page.getByRole("tab", { name: tab, exact: true }).click();
      assert.equal(await page.getByRole("tab", { name: tab, exact: true }).getAttribute("aria-selected"), "true");
      assert.equal(await page.getByRole("tabpanel").count(), 1);
    }
    await page.getByRole("tab", { name: "Painel", exact: true }).focus();
    await page.keyboard.press("ArrowRight");
    assert.equal(await page.getByRole("tab", { name: "Tarefas", exact: true }).getAttribute("aria-selected"), "true");
    await page.keyboard.press("Home");
    assert.equal(await page.getByRole("tab", { name: "Painel", exact: true }).getAttribute("aria-selected"), "true");
    await page.getByRole("button", { name: "Ampliar tela de Painel", exact: true }).click();
    assert(await page.getByRole("dialog").isVisible());
    await page.getByRole("button", { name: "Ampliar imagem", exact: true }).click();
    await page.getByRole("button", { name: "Ajustar à tela", exact: true }).click();
    await page.keyboard.press("Escape");
    assert.equal(await page.getByRole("dialog").count(), 0);
    await page.getByText("Comparar todos os recursos", { exact: true }).click();
    assert.equal(await page.locator("#planos details").getAttribute("open"), "");
    assert(await page.getByText("Mensalidade base", { exact: true }).filter({ visible: true }).isVisible());
    const comparisonWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    assert(comparisonWidth <= width, `Comparison overflow at ${width}`);
    await page.getByText("Comparar todos os recursos", { exact: true }).click();
    await page.getByText("Como funciona o teste de 30 dias?", { exact: true }).click();
    assert(await page.getByText("Escolha um plano e conclua a contratação", { exact: false }).isVisible());
    await page.getByText("Como funciona o teste de 30 dias?", { exact: true }).click();
    for (const code of ["BASIC", "MANAGEMENT", "COMPLETE"]) {
      assert.equal(await page.locator(`[data-plan="${code}"]`).getByRole("link", { name: "Testar 30 dias grátis", exact: true }).getAttribute("href"), `/signup?plano=${code}&teste=1`);
    }
    if (width >= 768) {
      const tops = await page.locator('[data-plan] a[href*="teste=1"]').evaluateAll((links) => links.map((link) => link.getBoundingClientRect().top));
      assert(Math.max(...tops) - Math.min(...tops) < 2, `Unaligned pricing buttons at ${width}`);
    }
    await page.locator("#planos").scrollIntoViewIfNeeded();
    await page.screenshot({ path: resolve(output, `plans-${width}.png`) });
    results.push({ width, height, ...dimensions, imagesLoaded: true, tabs: "passed", modal: "passed", faq: "passed", pricing: "passed" });
    await page.close();
  }
  assert.deepEqual(errors, []);
  await writeFile(resolve(output, "results.json"), JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));
} finally { await browser.close(); }
