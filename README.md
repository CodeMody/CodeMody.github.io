# CodeMody.github.io

Personal site for [CodeMody](https://github.com/CodeMody) — built straight from the GitHub repos.
Handwritten HTML, CSS and JS: no frameworks, no build step, no dependencies.

**Keynote edition.** The page is staged like an Apple product film: full-viewport
black panels, oversized display type, blue pill buttons, and a couple of white
cutaway panels.

Live at <https://codemody.github.io> — pushing to `main` redeploys via GitHub Pages.

## Run it

Open `index.html` in a browser, or serve the folder:

```bash
python3 -m http.server
```

Security headers: GitHub Pages sends no custom response headers — a
long-standing limitation — so the page enforces what it can on its own: a
`<meta http-equiv="Content-Security-Policy">` in the `<head>`, written for
this page as it is: same-origin scripts and styles plus Google Fonts, the
GitHub API call via `connect-src`, and `'unsafe-inline'` only for scripts —
the inline head script needs it (a meta CSP can't carry a nonce), and every
style now lives in `styles.css`, so styles need no exception at all. `_headers` holds the full target set — CSP, `nosniff`,
`Referrer-Policy`, `X-Frame-Options` — and takes effect as-is the day the
site lands on a `_headers`-aware host or a CDN with header rules (browsers
also ignore `frame-ancestors` and `report-uri` inside a meta CSP, so framing
stays unrestricted on plain Pages). `_config.yml` exists only because Jekyll
drops underscore-prefixed files from the Pages build.

Static SEO plumbing ships alongside: `robots.txt`, `sitemap.xml`, a design-matched `404.html`, a small `favicon.png` cut from the
avatar, Person JSON-LD in the head, and a 1200×630 `og-image.png` — with
`og:image:width`/`height`/`alt` — behind `og:image` and `twitter:image`
(`summary_large_image`).

## The page

- Full-viewport **keynote panels**, one statement per screen — black, with
  two white cutaways (About, Stack) in Apple's `#f5f5f7` grey
- **Frosted hairline nav** (blurred, 12px links) with scroll-spy — below
  720px it folds into two rows (links under the logo and CTA) instead of
  hiding the links away
- **Hero** — *Play. Build. Ship.* staged out one line at a time, gradient
  accent word, spotlight glow, and a **stats strip** that counts up; the
  avatar ships as WebP with a 2× (176 px) PNG fallback (and for JSON-LD)
- **DigiBall** as the featured product: chip, gradient tagline
  *"A ball that plays along."* and a grid of **spec tiles**
  (core, sampling, BLE frames…)
- **The lineup**: every public repo as a rounded card with live star counts
  and hover lift — the **whole card is the link** to GitHub (the circular ↗
  is the visual cue); **pill filters** hide empty tabs
- **Stack**: language bars filled with real language-detector byte counts —
  a snapshot as of the last push, not a live feed — with an Apple-style
  footnote marker
- Screen-reader niceties: `aria-pressed` filter pills, and a polite live
  region that announces the live stats **once** — not per animation frame
- Scroll-triggered **reveals** with staggered delays;
  `prefers-reduced-motion` stops all motion without hiding content, and the
  page still works with JavaScript disabled (the filter row is hidden instead)
- Dark by design — no theme toggle, no localStorage (the live-data cache uses sessionStorage)


## Dev tooling — headless browser verification

The hover/reveal/scroll-spy fixes are verified in a headless Chromium by a small
dev-only harness in **`.verify/`** (never deployed — Jekyll ignores the dot-dir).

```bash
cd .verify
npm install                          # playwright driver (dev-only)
npx playwright install chromium      # downloads browser to ~/.cache/ms-playwright
node verify.mjs                      # 24 checks + screenshots in .verify/out/
```

The browser itself lives in the standard Playwright cache
(`~/.cache/ms-playwright`) — that's where Playwright looks for it automatically,
and the same command works on any machine with a network connection. `.verify/`
keeps `node_modules/` and the screenshot output untracked.

## Live GitHub data

When online, the hero **stats strip** (projects, stars, languages, shipping
since) and the **star counts on the cards** read straight off the GitHub
profile:

- star counts, project totals and the stats strip **tick to reality** on
  every visit
- the last good API payload is cached in `sessionStorage`, so a
  rate-limited (the unauthenticated API allows 60 requests/hour per IP) or
  offline reload still shows this session's live numbers
- offline from the start, or rate-limited with no cache? The numbers baked
  into `index.html` stand — open `index.html` from disk with no network and
  the page still works

Rules of the sync, all in `script.js`:

- **Forks are not projects** — neither counted nor carded
- This site's own repo (`CodeMody.github.io`) is **counted but not carded**
- DigiBall is private, so the project count, star total, first-ship year and
  its two languages are fed in by hand via the `DIGIBALL` constant; once it
  goes public, the API row takes over automatically — no code change needed

### Adding a repo?

Push it public and the numbers follow. The keynote edition does **not**
mint cards on its own yet, so give the new repo a card in the grid in
`index.html` — copy any `<article class="card">` block and set
`data-repo`, `data-category`, the star placeholder, language dot and link.
Tag it on GitHub with one of the topics `games`, `tools`, `embedded` or
`systems` so it lands under the right filter.
