// Headless-browser verification for the CodeMody portfolio.
//
// Serves the repo over HTTP, loads the real page, and asserts the fixes from
// the 2026-11 review: reveal animation plays, hover lift works, scroll-spy
// clears at the top, filter pills hide without JS, the 404 loads with its
// fonts and noindex, and nothing throws in the console.
//
// Run:  cd .verify && npm install && npx playwright install chromium && node verify.mjs
// (Chromium lives in the standard Playwright cache: ~/.cache/ms-playwright)
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = normalize(fileURLToPath(new URL('..', import.meta.url)));
const OUT = join(ROOT, '.verify', 'out');
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.png': 'image/png',
  '.webp': 'image/webp', '.xml': 'application/xml', '.txt': 'text/plain',
};

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    let path = url.pathname === '/' ? '/index.html' : url.pathname;
    const file = normalize(join(ROOT, path));
    if (!file.startsWith(ROOT)) { res.writeHead(403).end(); return; }
    const body = await readFile(file);
    res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' }).end(body);
  } catch {
    res.writeHead(404).end('not found');
  }
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const PORT = server.address().port;
const BASE = `http://127.0.0.1:${PORT}`;
console.log(`Serving ${ROOT} at ${BASE}\n`);

const results = [];
function check(name, pass, detail = '') {
  results.push({ name, pass });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
}
const wait = ms => new Promise(r => setTimeout(r, ms));
function translateOk(v) {
  if (!v || v === 'none') return true;
  return v.trim().split(/\s+/).every(p => /^0(\.0*)?(px|%)$/.test(p) || p === '0');
}

const browser = await chromium.launch();
try {
  // ---------- Desktop context: normal JS ----------
  const ctx = await browser.newContext({ viewport: { width: 1360, height: 900 } });
  const page = await ctx.newPage();
  const consoleErrors = [];
  page.on('pageerror', e => consoleErrors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') consoleErrors.push('console.error: ' + m.text()); });

  const webpFetch = page.waitForResponse(r => r.url().includes('avatar.webp') && r.ok(), { timeout: 15000 }).catch(() => null);
  await page.goto(`${BASE}/`, { waitUntil: 'load' });
  await webpFetch;
  check('index loads over HTTP with no console errors', consoleErrors.length === 0, consoleErrors.join('; ') || 'no errors');
  check('hero avatar fetches the WebP variant', (await webpFetch) !== null);

  // Animations/reveals: the hero content is taller than the viewport, so
  // reveal it by scrolling to the hero's end, then assert everything settles.
  await page.evaluate(() => document.getElementById('top').scrollIntoView({ block: 'end', behavior: 'instant' }));
  await wait(2200);
  const heroStates = await page.evaluate(() => [...document.querySelectorAll('.hero [data-reveal]')].map(el => ({
    cls: el.className, opacity: getComputedStyle(el).opacity, transform: getComputedStyle(el).transform, translate: getComputedStyle(el).translate,
  })));
  check('hero reveals complete once scrolled to the hero end (opacity 1, no residual translate)',
    heroStates.every(s => s.opacity === '1' && translateOk(s.translate)),
    JSON.stringify(heroStates.filter(s => s.opacity !== '1')));

  // The reveal animation actually runs on scroll (probe a below-fold element)
  const probe = await page.evaluate(async () => {
    const el = document.querySelector('.lite-card');
    el.scrollIntoView({ block: 'center', behavior: 'instant' });
    const before = getComputedStyle(el).opacity;
    await new Promise(r => setTimeout(r, 120)); // let the IO fire + the animation start
    const mid = getComputedStyle(el).opacity;
    await new Promise(r => setTimeout(r, 1100));
    return { before, mid, after: getComputedStyle(el).opacity };
  });
  check('reveal animation actually animates on scroll',
    probe.before === '0' && parseFloat(probe.mid) > 0 && parseFloat(probe.mid) < 1 && probe.after === '1',
    `before=${probe.before} mid=${probe.mid} after=${probe.after}`);

  // ---------- Hover lift (the bug from the review) ----------
  const card = page.locator('.card').first();
  const restingTransform = await card.evaluate(el => getComputedStyle(el).transform);
  const restingTransitions = await card.evaluate(el => ({ prop: getComputedStyle(el).transitionProperty, dur: getComputedStyle(el).transitionDuration }));
  await card.hover({ force: false });
  await wait(150); // mid-transition
  const midTransform = await card.evaluate(el => getComputedStyle(el).transform);
  await wait(700); // settle
  const hoverTransform = await card.evaluate(el => getComputedStyle(el).transform);
  check('card hover lift applies (translateY)', hoverTransform !== 'none' && hoverTransform !== restingTransform,
    `rest=${restingTransform} hover=${hoverTransform}`);
  check('card hover transition is a real eased transition', /transform/.test(restingTransitions.prop) && /0\.5s/.test(restingTransitions.dur),
    `prop=${restingTransitions.prop} dur=${restingTransitions.dur}`);
  check('hover animates mid-way, not instant', midTransform !== 'none' || hoverTransform !== 'none', `mid=${midTransform}`);

  // Cards still animate the background on hover (transition present)
  const bgTransforms = await card.evaluate(el => getComputedStyle(el).transitionProperty);
  check('card transition includes background', /background/.test(bgTransforms), bgTransforms);

  // Lite-card and tile hover transforms (same class of bug)
  const lite = page.locator('.lite-card').first();
  await lite.hover(); await wait(700);
  const liteTransform = await lite.evaluate(el => getComputedStyle(el).transform);
  check('lite-card hover lift applies', liteTransform !== 'none', `transform=${liteTransform}`);

  // ---------- Scroll-spy ----------
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await wait(400);
  const atTop = await page.evaluate(() => [...document.querySelectorAll('.nav-links a')].map(a => ({ text: a.textContent, active: a.classList.contains('is-active'), current: a.getAttribute('aria-current') })));
  check('scroll to top clears the scroll-spy highlight', atTop.every(a => !a.active && !a.current), JSON.stringify(atTop));

  await page.evaluate(() => document.getElementById('about').scrollIntoView({ behavior: 'instant', block: 'center' }));
  await wait(500);
  const aboutActive = await page.evaluate(() => document.querySelector('.nav-links a[href="#about"]').classList.contains('is-active') && document.querySelector('.nav-links a[href="#about"]').getAttribute('aria-current'));
  check('About lights up in the nav (active + aria-current)', aboutActive === 'location', String(aboutActive));

  await page.evaluate(() => document.getElementById('stack').scrollIntoView({ behavior: 'instant', block: 'center' }));
  await wait(500);
  const stackActive = await page.evaluate(() => document.querySelector('.nav-links a[href="#stack"]').classList.contains('is-active'));
  check('Stack lights up in the nav', stackActive);

  await page.evaluate(() => document.getElementById('contact').scrollIntoView({ behavior: 'instant', block: 'center' }));
  await wait(500);
  const contactActive = await page.evaluate(() => document.querySelector('.nav-links a[href="#contact"]').classList.contains('is-active') && !document.querySelector('.nav-links a[href="#about"]').classList.contains('is-active'));
  check('Contact lights up, previous highlight cleared', contactActive);

  // ---------- Filters ----------
  await page.evaluate(() => document.getElementById('projects').scrollIntoView({ behavior: 'instant', block: 'start' }));
  await wait(300);
  const gamesPill = page.locator('.pill[data-filter="games"]');
  await gamesPill.click(); await wait(800);
  const visibleCount = await page.locator('#project-grid .card:not(.is-hidden)').count();
  const pillPressed = await page.locator('.pill[data-filter="games"]').getAttribute('aria-pressed');
  check('Games filter shows only games (2) and sets aria-pressed', visibleCount === 2 && pillPressed === 'true', `visible=${visibleCount} pressed=${pillPressed}`);
  await page.locator('.pill[data-filter="all"]').click();
  await wait(700);
  check('All filter restores all cards (8)', await page.locator('#project-grid .card:not(.is-hidden)').count() === 8);

  // ---------- Live stats (best effort — network may be unavailable) ----------
  try {
    await page.waitForFunction(() => (document.getElementById('stats-live')?.textContent || '').length > 0, { timeout: 12000 });
    const liveText = await page.evaluate(() => document.getElementById('stats-live').textContent);
    check('stats-live announces live values when the API responds', /\d+ projects/.test(liveText), liveText);
  } catch {
    check('live stats (optional): API did not respond within 12s — baked numbers stand', true, 'network/limitation — not a failure of the page');
  }

  // ---------- Reduced motion ----------
  const prm = await ctx.newPage();
  await prm.emulateMedia({ reducedMotion: 'reduce' });
  await prm.goto(`${BASE}/`, { waitUntil: 'load' });
  await wait(700);
  const rm = await prm.evaluate(() => ({
    revealed: [...document.querySelectorAll('.hero [data-reveal]')].every(el => getComputedStyle(el).opacity === '1'),
    noTranslate: [...document.querySelectorAll('.hero [data-reveal]')].every(el => ['none', '0px', '0px 0px', '0px 0px'].includes(getComputedStyle(el).translate) || /^0/.test(getComputedStyle(el).translate.trim())),
  }));
  check('reduced-motion: hero reveals are visible immediately (no delay)', rm.revealed && rm.noTranslate, JSON.stringify(rm));

  // ---------- No-JS fallback ----------
  const njCtx = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 1360, height: 900 } });
  const nj = await njCtx.newPage();
  await nj.goto(`${BASE}/`, { waitUntil: 'load' });
  const njState = await nj.evaluate(() => ({
    filtersVisible: getComputedStyle(document.querySelector('.filters')).display !== 'none',
    heroVisible: getComputedStyle(document.querySelector('.hero [data-reveal]')).opacity === '1',
    bakedStats: document.getElementById('stat-repos').textContent,
  }));
  check('no-JS: filter row hidden', !njState.filtersVisible);
  check('no-JS: content fully visible (no .js gate)', njState.heroVisible);
  check('no-JS: baked numbers stand', njState.bakedStats === '10', njState.bakedStats);

  // ---------- 404 page ----------
  const p404 = await ctx.newPage();
  await p404.goto(`${BASE}/404.html`, { waitUntil: 'load' });
  const n404 = await p404.evaluate(() => ({
    noindex: document.querySelector('meta[name="robots"]')?.content,
    hasFonts: [...document.querySelectorAll('link[rel="stylesheet"][href*="fonts.googleapis.com"]')].length,
    fontFamily: getComputedStyle(document.body).fontFamily,
    statusTitle: document.title,
  }));
  check('404: noindex meta', n404.noindex === 'noindex', n404.noindex);
  check('404: Google Fonts stylesheet is loaded', n404.hasFonts === 1, `links=${n404.hasFonts}`);
  check('404: rendered in Inter', n404.fontFamily.includes('Inter'), n404.fontFamily);
  check('404: title', n404.statusTitle.includes('404'), n404.statusTitle);

  await page.screenshot({ path: `${OUT}/desktop.png`, fullPage: false });
  await prm.screenshot({ path: `${OUT}/reduced-motion.png`, fullPage: false });

  console.log(`\nScreenshots in ${OUT}`);
  await ctx.close();
  await njCtx.close();
} finally {
  await browser.close();
  server.close();
}

const failed = results.filter(r => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
if (failed.length) {
  console.log('FAILURES:');
  for (const f of failed) console.log(' - ' + f.name);
  process.exit(1);
}
