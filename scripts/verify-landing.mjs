import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

// Importado por caminho absoluto, o playwright chega como modulo CJS e o
// chromium fica em `default`; como especificador simples, vem nomeado.
const playwright = await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : "playwright");
const { chromium } = playwright.chromium ? playwright : playwright.default;
const browser = await chromium.launch({ headless: true, channel: process.env.BROWSER_CHANNEL || undefined });
const output = resolve(".next/landing-review");
await mkdir(output, { recursive: true });
const results = [];
const errors = [];
try {
  for (const [width, height] of [[1440, 1000], [1280, 720], [1920, 1080], [768, 1024], [724, 725], [540, 720], [414, 896], [390, 844], [360, 740]]) {
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
    const imageHeights = [];
    for (const tab of ["Tarefas", "Relatórios", "Painel"]) {
      await page.getByRole("tab", { name: tab, exact: true }).click();
      assert.equal(await page.getByRole("tab", { name: tab, exact: true }).getAttribute("aria-selected"), "true");
      assert.equal(await page.getByRole("tabpanel").count(), 1);
      const preview = page.getByRole("tabpanel").locator("img");
      await preview.evaluate((img) => img.decode());
      const imageInfo = await preview.evaluate((img) => ({ src: img.currentSrc, width: img.getBoundingClientRect().width, height: img.getBoundingClientRect().height, fit: getComputedStyle(img).objectFit }));
      imageHeights.push(imageInfo.height);
      assert.equal(imageInfo.fit, "contain");
      // No telefone a landing mostra o recorte legivel do painel; no desktop, a tela inteira.
      // A captura completa continua acessivel pelo botao de ampliar, verificado adiante.
      assert.equal(imageInfo.src.includes("-mobile.webp"), width < 768, `Wrong capture variant at ${width}`);
      assert(Math.abs(imageInfo.width / imageInfo.height - (width < 768 ? 780 / 1000 : 8 / 5)) < .01, `Wrong aspect ratio at ${width}`);
      if (width < 768) {
        assert(Math.abs(imageInfo.width - (width - 42)) < 2, `Preview is not filling its mobile container at ${width}`);
        await page.getByRole("tabpanel").screenshot({ path: resolve(output, `preview-${tab}-${width}.png`) });
      }
    }
    assert(Math.max(...imageHeights) - Math.min(...imageHeights) < 1, `Image shifts between tabs at ${width}`);
    await page.getByRole("tab", { name: "Painel", exact: true }).focus();
    await page.keyboard.press("ArrowRight");
    assert.equal(await page.getByRole("tab", { name: "Tarefas", exact: true }).getAttribute("aria-selected"), "true");
    await page.keyboard.press("Home");
    assert.equal(await page.getByRole("tab", { name: "Painel", exact: true }).getAttribute("aria-selected"), "true");
    await page.getByRole("button", { name: "Ampliar tela de Painel", exact: true }).click();
    assert(await page.getByRole("dialog").isVisible());
    assert.equal(await page.evaluate(() => document.body.style.overflow), "hidden");
    const expandedImage = page.getByRole("dialog").locator("picture img");
    await expandedImage.evaluate((img) => img.decode());
    assert(!(await expandedImage.evaluate((img) => img.currentSrc)).includes("-mobile.webp"));
    if (width < 768) {
      assert.equal(await page.getByRole("button", { name: "Tela completa", exact: true }).getAttribute("aria-pressed"), "true");
      await page.screenshot({ path: resolve(output, `expanded-mobile-${width}.png`) });
      await page.getByRole("button", { name: "Detalhe", exact: true }).click();
      await expandedImage.evaluate((img) => img.decode());
      assert((await expandedImage.evaluate((img) => img.currentSrc)).endsWith("-mobile.webp"));
      await page.getByRole("button", { name: "Ampliar imagem", exact: true }).click();
      await page.getByRole("button", { name: "Tela completa", exact: true }).click();
      assert(await page.getByRole("button", { name: "Ampliar imagem", exact: true }).isVisible());
      await expandedImage.evaluate((img) => img.decode());
      assert(!(await expandedImage.evaluate((img) => img.currentSrc)).includes("-mobile.webp"));
    }
    await page.getByRole("button", { name: "Ampliar imagem", exact: true }).click();
    await page.getByRole("button", { name: "Ajustar à tela", exact: true }).click();
    await page.keyboard.press("Escape");
    assert.equal(await page.getByRole("dialog").count(), 0);
    assert.equal(await page.evaluate(() => document.body.style.overflow), "");
    assert(await page.getByRole("button", { name: "Ampliar tela de Painel", exact: true }).evaluate((button) => document.activeElement === button));
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
    if (width < 768) {
      // Botao fixo de teste: some enquanto o do topo esta visivel, aparece
      // depois, e nunca pode cobrir o ultimo conteudo do rodape.
      await page.evaluate(() => scrollTo(0, 0));
      await page.waitForFunction(() => !document.querySelector("[data-sticky-cta]")?.checkVisibility({ visibilityProperty: true }) || document.querySelector("[data-sticky-cta]")?.getBoundingClientRect().top >= innerHeight - 1);
      await page.evaluate(() => scrollTo(0, document.body.scrollHeight));
      await page.waitForFunction(() => document.querySelector("[data-sticky-cta]").getBoundingClientRect().top < innerHeight - 1);
      const overlap = await page.evaluate(() => {
        const rect = document.querySelector("[data-sticky-cta]").getBoundingClientRect();
        const last = [...document.querySelectorAll("footer a, footer p")].map((node) => node.getBoundingClientRect()).filter((box) => box.height > 0);
        return Math.max(...last.map((box) => box.bottom)) - rect.top;
      });
      assert(overlap <= 0, `Sticky trial button covers the footer by ${Math.round(overlap)}px at ${width}`);
      await page.screenshot({ path: resolve(output, `sticky-${width}.png`) });
      await page.evaluate(() => scrollTo(0, 0));
    }
    results.push({ width, height, ...dimensions, imagesLoaded: true, tabs: "passed", modal: "passed", faq: "passed", pricing: "passed" });
    await page.close();
  }
  assert.deepEqual(errors, []);
  await writeFile(resolve(output, "results.json"), JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));
} finally { await browser.close(); }
