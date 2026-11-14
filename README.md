# CodeMody.github.io

Personal site for [CodeMody](https://github.com/CodeMody) — built straight from the GitHub repos.
Handwritten HTML, CSS and JS: no frameworks, no build step, no dependencies.

## Run locally

Just open `index.html` in a browser, or serve the folder:

```bash
python3 -m http.server
```

## Features

- Light / dark theme toggle — follows the OS on first visit, remembers your choice afterwards
- DigiBall as the featured project, all public repos as cards with live language dots and star counts
- Project filter by category (Games, Plugins & Tools, Embedded, Systems)
- Stats strip refreshed from the GitHub API when online; static fallback when offline
- Scroll-reveal animations, reduced-motion friendly

## Deploy

Pushing to `main` publishes via GitHub Pages at <https://codemody.github.io>.
