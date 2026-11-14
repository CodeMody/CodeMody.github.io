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
  byte counts across all nine repos (private flagship included)
- DigiBall as the featured project, all public repos as cards with live star
  counts and category filters (Games, Plugins & Tools, Embedded, Systems)
- Stats strip and star counts refresh from the GitHub API when online;
  static baked numbers when offline
- Light / dark **pill toggle** with a sliding knob — follows the OS on first
  visit, remembers your choice afterwards
- Scroll progress bar, nav scroll-spy, film grain, skip link, focus states;
  `prefers-reduced-motion` stops all motion without hiding content, and the
  page still works with JavaScript disabled
