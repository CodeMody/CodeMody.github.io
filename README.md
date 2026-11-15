# CodeMody.github.io

Personal site for [CodeMody](https://github.com/CodeMody) — built straight from the GitHub repos.
Handwritten HTML, CSS and JS: no frameworks, no build step, no dependencies.

Live at <https://codemody.github.io> — pushing to `main` redeploys via GitHub Pages.

## Run it

Open `index.html` in a browser, or serve the folder:

```bash
python3 -m http.server
```

## The page

- Hero with a drifting **particle mesh** (canvas), telemetry word tags and
  **mouse parallax**; a fixed background layer carries the grid, ambient tints
  and a **glow that follows the cursor** across the whole page
- **Typed terminal** — commands type out char-by-char, a blinking caret lands
- **Mask-line headings**, staggered card reveals, **count-up stats** and a
  scramble-decode kicker with a pulsing status dot
- Dual **marquee** strips; **language bars** filled with real language-detector
  byte counts across all nine repos (private flagship included) — a snapshot
  of the bytes as of the last push, not a live feed
- DigiBall as the featured project; every public repo gets a card with live
  star counts and category filters (Games, Plugins & Tools, Embedded, Systems)
- Light / dark **pill toggle** with a sliding knob — follows the OS on first
  visit, remembers your choice afterwards
- Scroll progress bar, nav scroll-spy, film grain, skip link, focus states;
  `prefers-reduced-motion` stops all motion without hiding content, and the
  page still works with JavaScript disabled

## Live GitHub data

When online, the hero **stats strip** (projects, stars, languages, shipping
since) and the **project grid** read straight off the GitHub profile:

- a new public repo **gains a card** on the next visit (its description comes
  from the repo, its language dot from the language detector)
- a deleted, renamed or made-private repo **loses its card**
- star counts, project totals and the stats strip **tick to reality**
- offline or rate-limited? The numbers baked into `index.html` stand — open
  `index.html` from disk with no network and the page still works

Rules of the sync, all in `script.js`:

- **Forks are not projects** — neither counted nor carded
- This site's own repo (`CodeMody.github.io`) is **counted but not carded**
- DigiBall is private, so the project count, star total, first-ship year and
  its two languages are fed in by hand via the `DIGIBALL` constant; once it
  goes public, the API row takes over automatically — no code change needed

### Adding a repo?

Push it public and it shows up by itself. Tag it with one of the GitHub
topics `games`, `tools`, `embedded` or `systems` so it lands under the right
filter — untagged repos default to Plugins & Tools (GDScript ones guess
themselves into Games). If a filter ever ends up with no cards, its tab
hides itself.
