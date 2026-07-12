import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

const projectRoot = process.cwd();
const root = path.resolve(process.env.GEOTALENT_DOCS || path.join(projectRoot, 'docs'));
const outputRoot = path.resolve(process.env.GEOTALENT_QA_OUT || projectRoot);
const types = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8', '.json':'application/json', '.geojson':'application/geo+json', '.svg':'image/svg+xml', '.png':'image/png', '.webp':'image/webp', '.csv':'text/csv; charset=utf-8', '.md':'text/markdown; charset=utf-8', '.parquet':'application/octet-stream' };
const browserCandidates = [process.env.CHROMIUM_PATH, '/usr/bin/chromium', '/usr/lib/chromium/chromium'].filter(Boolean);
let executablePath;
for (const candidate of browserCandidates) {
  try { await fs.access(candidate); executablePath = candidate; break; } catch { /* use Playwright-managed Chromium */ }
}
const browser = await chromium.launch({
  headless: true,
  ...(executablePath ? { executablePath } : {}),
  args: ['--no-sandbox','--disable-dev-shm-usage','--disable-setuid-sandbox','--no-zygote','--disable-features=LocalNetworkAccessChecks,BlockInsecurePrivateNetworkRequests'],
});
const context = await browser.newContext();
await context.route('**/*', async (route) => {
  const url = new URL(route.request().url());
  if (url.hostname === 'fonts.googleapis.com') {
    await route.fulfill({ status: 200, body: '/* offline QA: system font fallback */', contentType: 'text/css; charset=utf-8' });
    return;
  }
  if (url.hostname === 'fonts.gstatic.com') {
    await route.fulfill({ status: 204, body: '' });
    return;
  }
  if (url.hostname !== 'geotalent.test') {
    await route.abort();
    return;
  }
  let relative = decodeURIComponent(url.pathname.replace(/^\//, '')) || 'index.html';
  const filePath = path.join(root, relative);
  try {
    const body = await fs.readFile(filePath);
    await route.fulfill({ status: 200, body, contentType: types[path.extname(filePath)] || 'application/octet-stream' });
  } catch {
    const body = await fs.readFile(path.join(root, 'index.html'));
    await route.fulfill({ status: 200, body, contentType: 'text/html; charset=utf-8' });
  }
});

const page = await context.newPage();
await page.setViewportSize({ width: 1440, height: 1000 });
const errors = [];
const failed = [];
page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });
page.on('pageerror', (err) => errors.push(err.message));
page.on('requestfailed', (request) => { if (!request.url().includes('fonts.googleapis.com') && !request.url().includes('fonts.gstatic.com')) failed.push(`${request.url()} :: ${request.failure()?.errorText}`); });
await page.goto('http://geotalent.test/', { waitUntil: 'networkidle', timeout: 120000 });
await page.waitForSelector('h1');
await page.screenshot({ path: path.join(outputRoot, 'preview-top.png'), fullPage: false });

const metrics = await page.evaluate(() => ({
  title: document.title,
  h1: document.querySelector('h1')?.textContent,
  bodyWidth: document.body.scrollWidth,
  viewportWidth: window.innerWidth,
  bodyHeight: document.body.scrollHeight,
  chartCount: document.querySelectorAll('.echart').length,
  sectionCount: document.querySelectorAll('.page-section').length,
}));

await page.locator('#geography').scrollIntoViewIfNeeded();
await page.getByRole('tab', { name: 'EURES' }).click();
const mapGroupSelect = page.locator('#geography select').nth(1);
await mapGroupSelect.selectOption('ICT');
await page.waitForTimeout(800);
await page.screenshot({ path: path.join(outputRoot, 'preview-map.png'), fullPage: false });

await page.locator('#companies').scrollIntoViewIfNeeded();
await page.waitForFunction(() => document.body.innerText.includes('В текущем срезе:'), null, { timeout: 120000 });
await page.getByRole('button', { name: 'Без вероятных посредников' }).click();
await page.waitForTimeout(450);
await page.screenshot({ path: path.join(outputRoot, 'preview-companies.png'), fullPage: false });

await page.locator('#explorer').scrollIntoViewIfNeeded();
await page.getByRole('tab', { name: /Компании и объявления/ }).click();
await page.waitForFunction(() => document.body.innerText.includes('Загружено полностью'), null, { timeout: 120000 });
const explorerText = await page.locator('#explorer').innerText();
await page.screenshot({ path: path.join(outputRoot, 'preview-explorer.png'), fullPage: false });

await page.locator('#project').scrollIntoViewIfNeeded();
await page.waitForTimeout(350);
await page.screenshot({ path: path.join(outputRoot, 'preview-project.png'), fullPage: false });

await page.getByRole('button', { name: 'Методология' }).first().click();
await page.getByRole('dialog').waitFor();
await page.keyboard.press('Escape');
await page.locator('#top').scrollIntoViewIfNeeded();
await page.waitForTimeout(250);
await page.screenshot({ path: path.join(outputRoot, 'preview-desktop.png'), fullPage: true });

const mobile = await context.newPage();
await mobile.setViewportSize({ width: 390, height: 844 });
const mobileErrors = [];
mobile.on('console', (msg) => { if (msg.type() === 'error') mobileErrors.push(msg.text()); });
mobile.on('pageerror', (err) => mobileErrors.push(err.message));
await mobile.goto('http://geotalent.test/', { waitUntil: 'networkidle', timeout: 120000 });
await mobile.waitForSelector('h1');
await mobile.screenshot({ path: path.join(outputRoot, 'preview-mobile.png'), fullPage: true });
const mobileMetrics = await mobile.evaluate(() => ({ bodyWidth: document.body.scrollWidth, viewportWidth: window.innerWidth, bodyHeight: document.body.scrollHeight }));
await mobile.getByRole('button', { name: 'Меню' }).click();
await mobile.getByRole('button', { name: 'Карта' }).click();
await mobile.waitForTimeout(400);

console.log(JSON.stringify({ metrics, mobileMetrics, errors, failed, mobileErrors, explorerLoaded: explorerText.includes('Загружено полностью') && (explorerText.includes('21 424') || explorerText.includes('21424') || explorerText.includes('21\u00a0424')) }, null, 2));
await browser.close();
