/* ==========================================================================
   CodeMody — keynote preview script
   Reveals, stagger, count-up stats, filters, scroll-spy and the same live
   GitHub sync rules as index.html (forks don't count, DigiBall is fed in
   by hand until it goes public, baked numbers hold when offline).
   Degrades: no JS → static page; reduced motion → no animation.
   ========================================================================== */
(function () {
  "use strict";

  var RM = window.matchMedia("(prefers-reduced-motion: reduce)");
  var grid = document.getElementById("project-grid");

  /* ---------- Year ---------- */
  var year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();

  /* ---------- Stagger delays ---------- */
  document.querySelectorAll("[data-stagger]").forEach(function (group) {
    group.querySelectorAll("[data-reveal]").forEach(function (child, i) {
      child.style.setProperty("--d", Math.min(i, 8));
    });
  });
  // The hero stages itself out one line at a time.
  document.querySelectorAll(".hero [data-reveal]").forEach(function (el, i) {
    el.style.setProperty("--d", Math.min(i, 8));
  });

  /* ---------- Reveal on scroll ---------- */
  var reveals = document.querySelectorAll("[data-reveal]");
  if (!("IntersectionObserver" in window) || RM.matches) {
    reveals.forEach(function (el) { el.classList.add("in"); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          en.target.classList.add("in");
          io.unobserve(en.target);
        }
      });
    }, { threshold: 0.15, rootMargin: "0px 0px -8% 0px" });
    reveals.forEach(function (el) { io.observe(el); });
  }

  /* ---------- Count-up stats ---------- */
  function setNum(el, to) { if (el) el.textContent = to; }
  function animateNum(el, to) {
    if (!el) return;
    var from = parseInt(el.textContent, 10) || 0;
    if (RM.matches || from === to) { el.textContent = to; return; }
    var t0 = performance.now();
    (function tick(now) {
      var p = Math.min(1, (now - t0) / 1200);
      var e = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(from + (to - from) * e);
      if (p < 1) requestAnimationFrame(tick);
    })(t0);
  }

  /* ---------- Filters ---------- */
  var pills = document.querySelectorAll(".pill");
  var cards = grid ? grid.querySelectorAll(".card") : [];

  // Filters with no cards hide themselves (Embedded until DigiBall goes public).
  pills.forEach(function (btn) {
    var f = btn.getAttribute("data-filter");
    if (f === "all") return;
    var has = Array.prototype.some.call(cards, function (c) {
      return c.getAttribute("data-category") === f;
    });
    if (!has) btn.style.display = "none";
  });

  pills.forEach(function (btn) {
    btn.addEventListener("click", function () {
      pills.forEach(function (b) {
        b.classList.toggle("is-active", b === btn);
        b.setAttribute("aria-pressed", b === btn ? "true" : "false");
      });
      var f = btn.getAttribute("data-filter");
      var shown = 0;
      Array.prototype.forEach.call(cards, function (c) {
        var match = f === "all" || c.getAttribute("data-category") === f;
        c.classList.toggle("is-hidden", !match);
        if (match) {
          c.style.setProperty("--d", Math.min(shown, 8)); // same stagger cap as the initial reveal
          shown++;
          if (!RM.matches) {
            c.classList.remove("in");
            void c.offsetWidth; // restart the rise for the new lineup
          }
          c.classList.add("in");
        }
      });
    });
  });

  /* ---------- Scroll-spy on the nav ---------- */
  if ("IntersectionObserver" in window) {
    var links = document.querySelectorAll(".nav-links a");
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        links.forEach(function (a) {
          a.classList.toggle("is-active", a.getAttribute("href") === "#" + en.target.id);
        });
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    ["about", "projects", "stack", "contact"].forEach(function (id) {
      var sec = document.getElementById(id);
      if (sec) spy.observe(sec);
    });
  }

  /* ---------- Live GitHub data ----------
     Same rules as before: forks are not projects, CodeMody.github.io is
     counted but not carded, and DIGIBALL stands in until DigiBall goes
     public. Three hardenings against the "numbers never tick" failure:
     the stats are rewritten unconditionally when data arrives, the last
     good payload is cached in sessionStorage so a rate-limited or offline
     reload still shows this session's live numbers, and a stalled request
     is aborted after 8s (guarded — browsers without AbortController just
     skip the timeout). */
  var DIGIBALL = { name: "DigiBall", stars: 0, since: 2026, langs: ["C", "TypeScript"] };
  var API = "https://api.github.com/users/CodeMody/repos?per_page=100";
  var CACHE_KEY = "codemody-repos";

  function render(rows) {
    if (!Array.isArray(rows)) return;
    var digi = null;
    var mine = rows.filter(function (r) {
      if (r.name === DIGIBALL.name) { digi = r; return false; }
      return !r.fork;
    });

    var stars = digi ? digi.stargazers_count : DIGIBALL.stars;
    var since = digi ? +digi.created_at.slice(0, 4) : DIGIBALL.since;
    var langs = {};
    DIGIBALL.langs.forEach(function (l) { langs[l] = true; });

    mine.forEach(function (r) {
      stars += r.stargazers_count;
      since = Math.min(since, +r.created_at.slice(0, 4));
      if (r.language) langs[r.language] = true;
      var slot = grid && grid.querySelector(
        '[data-repo="' + r.name.replace(/["\\]/g, "\\$&") + '"] .star-count'
      );
      if (slot) slot.textContent = r.stargazers_count;
    });

    animateNum(document.getElementById("stat-repos"), mine.length + 1);
    animateNum(document.getElementById("stat-stars"), stars);
    animateNum(document.getElementById("stat-langs"), Object.keys(langs).length);
    setNum(document.getElementById("stat-since"), since); // year: no count-up

    // One clean screen-reader announcement per render, not one per animation frame.
    var live = document.getElementById("stats-live");
    if (live) live.textContent =
      mine.length + 1 + " projects, " + stars + " GitHub stars, " +
      Object.keys(langs).length + " languages, shipping since " + since;
  }

  function readCache() {
    try {
      var json = sessionStorage.getItem(CACHE_KEY);
      return json ? JSON.parse(json) : null;
    } catch (e) { return null; }
  }

  var controller = typeof AbortController !== "undefined" ? new AbortController() : null;
  var timeout = controller ? setTimeout(function () { controller.abort(); }, 8000) : null;
  var opts = { headers: { Accept: "application/vnd.github+json" } };
  if (controller) opts.signal = controller.signal;
  fetch(API, opts)
    .then(function (r) {
      if (!r.ok) throw new Error("GitHub said " + r.status);
      return r.json();
    })
    .then(function (rows) {
      try { sessionStorage.setItem(CACHE_KEY, JSON.stringify(rows)); } catch (e) {}
      render(rows);
      if (timeout) clearTimeout(timeout);
    })
    .catch(function () {
      var cached = readCache(); // rate-limited or offline: keep this session's live numbers
      if (cached) render(cached);
      if (timeout) clearTimeout(timeout);
    });
})();
