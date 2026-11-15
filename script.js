/* ==========================================================================
   CodeMody portfolio — redesign script
   Original interactions (theme, reveal, filters, live stats) plus the motion
   layer borrowed from codemody-site: mesh canvas, mouse glow, typed terminal,
   count-up stats, kicker decode, scroll-spy, and a scroll progress bar.
   Everything degrades: no JS → static page; reduced motion → no animation.
   ========================================================================== */
(function () {
  "use strict";

  var root = document.documentElement;
  var RM = window.matchMedia("(prefers-reduced-motion: reduce)");

  /* ---------- Theme toggle (knob rides the active side via CSS) ---------- */
  var toggle = document.getElementById("theme-toggle");
  var meshColors = null; // canvas palette cache, dropped on theme change

  function applyTheme(theme) {
    root.setAttribute("data-theme", theme);
    var light = theme === "light";
    toggle.setAttribute("aria-pressed", light ? "true" : "false");
    toggle.setAttribute(
      "aria-label",
      "Switch to " + (light ? "dark" : "light") + " theme"
    );
  }

  toggle.addEventListener("click", function () {
    var next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
    localStorage.setItem("theme", next);
    applyTheme(next);
    meshColors = null;
  });

  // Follow the OS only while the user has not chosen a theme manually.
  var media = window.matchMedia("(prefers-color-scheme: dark)");
  media.addEventListener("change", function (e) {
    if (!localStorage.getItem("theme")) {
      applyTheme(e.matches ? "dark" : "light");
      meshColors = null;
    }
  });

  applyTheme(root.getAttribute("data-theme") || "light");

  /* ---------- Stagger indexes: --i on numbered children ---------- */
  document.querySelectorAll("[data-stagger]").forEach(function (group) {
    Array.prototype.forEach.call(group.children, function (child, i) {
      child.style.setProperty("--i", i);
    });
  });

  /* ---------- Scroll reveal ---------- */
  var revealables = document.querySelectorAll("[data-reveal]");

  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -24px 0px" }
    );
    revealables.forEach(function (el) {
      io.observe(el);
    });
  } else {
    revealables.forEach(function (el) {
      el.classList.add("is-visible");
    });
  }

  /* ---------- Kicker decode: letters resolve from scramble ---------- */
  var kicker = document.getElementById("kicker");

  if (kicker && !RM.matches) {
    // Wrap the leading text node so the pulse-dot span survives.
    var textNode = null;
    Array.prototype.forEach.call(kicker.childNodes, function (n) {
      if (!textNode && n.nodeType === 3 && n.textContent.trim()) textNode = n;
    });
    if (textNode) {
      var target = document.createElement("span");
      target.textContent = textNode.textContent;
      kicker.replaceChild(target, textNode);

      var txt = target.textContent;
      var step = 0;
      var iv = setInterval(function () {
        target.textContent =
          txt.slice(0, step) +
          txt.slice(step).replace(/[A-Za-z0-9]/g, function (ch) {
            var pool = /[A-Z]/.test(ch)
              ? "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
              : /[0-9]/.test(ch)
                ? "0123456789"
                : "abcdefghijklmnopqrstuvwxyz";
            return pool[Math.floor(Math.random() * pool.length)];
          });
        step++;
        if (step > txt.length) {
          clearInterval(iv);
          target.textContent = txt;
        }
      }, 42);
    }
  }

  /* ---------- Count-up stats ---------- */
  function countUp(el) {
    var to = +el.dataset.count || 0;
    el.dataset.counted = "1";
    if (RM.matches) {
      el.textContent = to;
      return;
    }
    var t0 = performance.now();
    var dur = 1000;
    (function step(t) {
      var p = Math.min(1, (t - t0) / dur);
      var e = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(to * e);
      if (p < 1) requestAnimationFrame(step);
    })(t0);
  }

  if ("IntersectionObserver" in window) {
    var cio = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            countUp(entry.target);
            cio.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.6 }
    );
    document.querySelectorAll(".stat-num[data-count]").forEach(function (n) {
      cio.observe(n);
    });
  }

  /* ---------- Terminal: typed commands, popped-in output ---------- */
  var term = document.getElementById("term");
  var LINES = [
    { cmd: "whoami" },
    { out: [["t-out", "CodeMody — developer & tinkerer"]] },
    {},
    { cmd: "cat focus.json" },
    { out: [["t-brace", "{ "], ["t-key", '"games"'], ["t-out", ": "], ["t-str", '"Godot · Pygame"'], ["t-out", ","]] },
    { out: [["t-out", "  "], ["t-key", '"embedded"'], ["t-out", ": "], ["t-str", '"MicroPython · BLE"'], ["t-out", ","]] },
    { out: [["t-out", "  "], ["t-key", '"tooling"'], ["t-out", ": "], ["t-str", '"DSH · OpenCode"'], ["t-out", " "], ["t-brace", "}"]] },
    {},
    { cmd: "gh api repos/CodeMody/DigiBall -q .desc" },
    { out: [["t-out", '"A ball that plays along."']] }
  ];

  function appendLine(segments) {
    segments.forEach(function (seg) {
      var s = document.createElement("span");
      if (seg[0]) s.className = seg[0];
      s.textContent = seg[1] || " ";
      term.appendChild(s);
    });
    term.appendChild(document.createTextNode("\n"));
  }

  function paintAll() {
    term.textContent = "";
    LINES.forEach(function (l) {
      if (!l.cmd && !l.out) {
        term.appendChild(document.createTextNode("\n"));
      } else if (l.cmd) {
        appendLine([["t-prompt", "$ "], ["", l.cmd]]);
      } else {
        appendLine(l.out);
      }
    });
  }

  function typeTerminal() {
    if (RM.matches) {
      paintAll();
      return;
    }
    term.textContent = "";
    var i = 0;
    (function next() {
      if (i >= LINES.length) {
        var caret = document.createElement("span");
        caret.className = "caret";
        caret.textContent = "▊";
        term.appendChild(caret);
        return;
      }
      var l = LINES[i];
      if (l.cmd) {
        var prompt = document.createElement("span");
        prompt.className = "t-prompt";
        prompt.textContent = "$ ";
        var typed = document.createElement("span");
        term.appendChild(prompt);
        term.appendChild(typed);
        term.appendChild(document.createTextNode("\n"));
        var j = 0;
        var iv = setInterval(function () {
          typed.textContent = l.cmd.slice(0, ++j);
          if (j >= l.cmd.length) {
            clearInterval(iv);
            i++;
            setTimeout(next, 140);
          }
        }, 28);
      } else if (l.out) {
        appendLine(l.out);
        i++;
        setTimeout(next, 150);
      } else {
        term.appendChild(document.createTextNode("\n"));
        i++;
        setTimeout(next, 90);
      }
    })();
  }

  if (term) {
    if ("IntersectionObserver" in window) {
      var tio = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              typeTerminal();
              tio.disconnect();
            }
          });
        },
        { threshold: 0.3 }
      );
      tio.observe(term.closest(".terminal"));
    } else {
      typeTerminal();
    }
  }

  /* ---------- Mesh canvas: drifting, connected telemetry motes ---------- */
  var cv = document.getElementById("mesh");
  var ctx = cv && cv.getContext ? cv.getContext("2d") : null;
  var TAGS = ["BLE", "20 Hz", "18-byte", "throw", "catch", "flight", "sha256",
              "v0.1.1", "Godot", "FEVER", "PR #1", "seed 7919"];
  var N = window.innerWidth < 760 ? 20 : 42;
  var nodes = [];
  var mouse = { x: 0.7, y: 0.25 };
  var running = true;

  function css(v) {
    return getComputedStyle(root).getPropertyValue(v).trim();
  }

  function cols() {
    return meshColors ||
      (meshColors = { a: css("--mesh-a"), b: css("--mesh-b"), m: css("--mesh-line") });
  }

  function size() {
    var r = cv.getBoundingClientRect();
    var d = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = r.width * d;
    cv.height = r.height * d;
    cv._w = r.width;
    cv._h = r.height;
    ctx.setTransform(d, 0, 0, d, 0, 0);
  }

  function seed() {
    N = window.innerWidth < 760 ? 20 : 42;
    nodes = [];
    for (var i = 0; i < N; i++) {
      var y = Math.random();
      nodes.push({
        x: Math.random(), y: y,
        vx: (Math.random() - 0.5) * 0.00042,
        vy: (Math.random() - 0.5) * 0.00042,
        r: Math.random() * 1.6 + 0.7,
        k: i % 3,
        c: i % 8 === 0 && y < 0.5 ? TAGS[i % TAGS.length] : "",
        d: Math.random() * 0.4 + 0.3
      });
    }
  }

  function frame() {
    var c = cols(), w = cv._w, h = cv._h;
    ctx.clearRect(0, 0, w, h);
    var px = mouse.x * w, py = mouse.y * h;
    for (var i = 0; i < nodes.length; i++) {
      var n = nodes[i];
      if (!RM.matches) {
        n.x += n.vx;
        n.y += n.vy;
        if (n.x < 0 || n.x > 1) n.vx *= -1;
        if (n.y < 0 || n.y > 1) n.vy *= -1;
        n.x = Math.max(-0.02, Math.min(1.02, n.x));
        n.y = Math.max(-0.02, Math.min(1.02, n.y));
      }
      var x = n.x * w + ((px - w * 0.5) / w) * 22 * n.d;
      var y = n.y * h + ((py - h * 0.5) / h) * 22 * n.d;
      for (var j = i + 1; j < nodes.length; j++) {
        var m = nodes[j];
        var mx = m.x * w + ((px - w * 0.5) / w) * 22 * m.d;
        var my = m.y * h + ((py - h * 0.5) / h) * 22 * m.d;
        var dd = Math.hypot(mx - x, my - y);
        if (dd < 135) {
          ctx.globalAlpha = (1 - dd / 135) * 0.28;
          ctx.strokeStyle = c.m;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(mx, my);
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 0.85;
      ctx.fillStyle = n.k === 0 ? c.a : n.k === 1 ? c.b : c.m;
      ctx.beginPath();
      ctx.arc(x, y, n.r, 0, 6.283);
      ctx.fill();
      if (n.c) {
        ctx.globalAlpha = 0.5;
        ctx.font = "9px JetBrains Mono, monospace";
        ctx.fillStyle = c.m;
        ctx.fillText(n.c, x + 6, y + 3);
      }
    }
    ctx.globalAlpha = 1;
    if (running && !RM.matches) requestAnimationFrame(frame);
  }

  if (cv && ctx) {
    size();
    seed();
    if (RM.matches) {
      frame(0);
    } else {
      requestAnimationFrame(frame);
    }
    window.addEventListener("resize", function () {
      size();
      seed();
      if (RM.matches) frame(0);
    }, { passive: true });
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) {
        running = false;
      } else {
        running = true;
        if (!RM.matches) requestAnimationFrame(frame);
      }
    });
    // The glow and the motes follow the mouse anywhere on the page.
    if (!RM.matches && matchMedia("(pointer:fine)").matches) {
      addEventListener("mousemove", function (e) {
        mouse.x = e.clientX / innerWidth;
        mouse.y = e.clientY / innerHeight;
        root.style.setProperty("--mx", (mouse.x * 100).toFixed(1) + "%");
        root.style.setProperty("--my", (mouse.y * 100).toFixed(1) + "%");
      }, { passive: true });
    }
  }

  /* ---------- Scroll-spy: nav link for the section in view ---------- */
  var navLinks = Array.prototype.slice.call(
    document.querySelectorAll('.nav-links a[href^="#"]')
  );
  var secs = navLinks
    .map(function (a) { return document.querySelector(a.getAttribute("href")); })
    .filter(Boolean);

  if ("IntersectionObserver" in window && secs.length) {
    var spy = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          navLinks.forEach(function (a) {
            a.classList.toggle("on", a.getAttribute("href") === "#" + entry.target.id);
          });
        });
      },
      { threshold: 0, rootMargin: "-45% 0px -50% 0px" }
    );
    secs.forEach(function (s) {
      spy.observe(s);
    });
  }

  /* ---------- Scroll progress bar ---------- */
  var prog = document.getElementById("prog");

  if (prog) {
    addEventListener("scroll", function () {
      var m = document.documentElement.scrollHeight - innerHeight;
      prog.style.width = (m > 0 ? (scrollY / m) * 100 : 0) + "%";
    }, { passive: true });
  }

  /* ---------- Project filters ---------- */
  var filterBtns = document.querySelectorAll(".filter-btn");
  var currentFilter = "all";

  function applyFilter(card) {
    var show = currentFilter === "all" || card.dataset.category === currentFilter;
    card.classList.toggle("is-hidden", !show);
    if (show) card.classList.add("is-visible");
  }

  filterBtns.forEach(function (btn) {
    btn.addEventListener("click", function () {
      currentFilter = btn.dataset.filter;

      filterBtns.forEach(function (b) {
        b.classList.toggle("is-active", b === btn);
      });

      // Re-queried, not cached: the grid gains and loses cards live.
      document.querySelectorAll("#project-grid .card").forEach(applyFilter);
    });
  });

  /* ---------- Live GitHub data (progressive enhancement) ----------
     Static first: the baked HTML works offline. A successful API answer
     then upgrades it — the stats strip (projects, stars, languages,
     shipping-since) counts straight off the profile, star counts tick to
     reality, and the project grid keeps itself in sync: new public repos
     gain a card, deleted or renamed ones lose theirs.

     Rules: forks are not projects and never get carded; this site's own
     repo is counted but not carded; DigiBall is private, so it is fed in
     by hand below — and if it ever goes public, the API row wins over
     the baked-in one automatically. */
  function refreshStat(el, value) {
    if (!el) return;
    el.dataset.count = value;
    if (el.dataset.counted) el.textContent = value;
  }

  var USER = "CodeMody";
  var SITE_REPO = "CodeMody.github.io";
  var DIGIBALL = { name: "DigiBall", stars: 0, since: 2026, langs: ["C", "TypeScript"] };
  var CATS = ["games", "tools", "embedded", "systems"]; // must match data-filter
  var LANG_COLORS = {
    JavaScript: "#f1e05a", Python: "#3572A5", HTML: "#e34c26", CSS: "#663399",
    TypeScript: "#3178c6", GDScript: "#80bcff", C: "#6f7681", "C++": "#f34b7d",
    TeX: "#3D6117", Makefile: "#427819", Batchfile: "#C1F12E", Shell: "#89e051",
    Rust: "#dea584", Go: "#00ADD8", JSON: "#cbcb41", "C#": "#178600",
    Java: "#b07219", MDX: "#fcb32c", Markdown: "#485f17"
  };
  var STAR_SVG =
    '<svg class="star" viewBox="0 0 16 16" width="14" height="14" fill="currentColor" aria-hidden="true">' +
    '<path d="M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 ' +
    '.416 1.279l-3.046 2.97.719 4.192a.75.75 0 0 1-1.088.791L8 12.347l-3.766 ' +
    '1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l' +
    '4.21-.611L7.327.668A.75.75 0 0 1 8 .25z"/></svg>';

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  // A repo files itself by carrying one of CATS as a GitHub topic;
  // untagged newcomers fall back to a language guess, else Tools.
  function categoryOf(repo) {
    for (var i = 0; i < CATS.length; i++) {
      if (repo.topics && repo.topics.indexOf(CATS[i]) !== -1) return CATS[i];
    }
    return repo.language === "GDScript" ? "games" : "tools";
  }

  function makeCard(repo) {
    var card = document.createElement("article");
    card.className = "card";
    card.setAttribute("data-reveal", "");
    card.dataset.category = categoryOf(repo);
    card.dataset.repo = repo.name;
    var lang = repo.language;
    card.innerHTML =
      '<header class="card-head"><h3>' + esc(repo.name) + "</h3>" + STAR_SVG +
      '<span class="star-count">' + repo.stargazers_count + "</span></header>" +
      '<p class="card-desc">' + esc(repo.description ||
        "Fresh off the workbench — description still brewing. Watch this space.") + "</p>" +
      '<footer class="card-foot">' +
      (lang ? '<span class="lang"><span class="lang-dot" style="--lang-color:' +
        (LANG_COLORS[lang] || "#8b949e") + '"></span>' + esc(lang) + "</span>" : "<span></span>") +
      '<a class="card-link" href="' + esc(repo.html_url) +
      '" target="_blank" rel="noopener">GitHub <span class="arr" aria-hidden="true">→</span></a></footer>';
    return card;
  }

  var grid = document.getElementById("project-grid");

  function syncGrid(mine) {
    var live = {};
    mine.forEach(function (r) { live[r.name] = true; });

    // Repos that vanished — deleted, renamed, made private: cards follow.
    Array.prototype.slice.call(grid.querySelectorAll(".card")).forEach(function (card) {
      if (card.dataset.repo && !live[card.dataset.repo]) card.remove();
    });

    // Repos nobody has carded yet: each gains one, staggered in at the end.
    mine.forEach(function (r) {
      if (r.name === SITE_REPO || grid.querySelector('[data-repo="' + r.name + '"]')) return;
      var card = makeCard(r);
      card.style.setProperty("--i", grid.children.length);
      grid.appendChild(card);
      if (io) io.observe(card);
      else card.classList.add("is-visible");
      applyFilter(card);
    });

    // A filter tab only earns its place while a card could match it.
    filterBtns.forEach(function (btn) {
      var f = btn.dataset.filter;
      btn.hidden = f !== "all" && !grid.querySelector('.card[data-category="' + f + '"]');
    });
  }

  fetch("https://api.github.com/users/" + USER + "/repos?per_page=100", {
    headers: { Accept: "application/vnd.github+json" },
  })
    .then(function (res) {
      if (!res.ok) throw new Error("GitHub API unavailable");
      return res.json();
    })
    .then(function (repos) {
      // DigiBall is counted even while private; once public, its live
      // stars and creation year flow in through this branch instead.
      var digi = null;
      var mine = repos.filter(function (r) {
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
        var slot = grid.querySelector('[data-repo="' + r.name + '"] .star-count');
        if (slot) slot.textContent = r.stargazers_count;
      });

      refreshStat(document.getElementById("stat-repos"), mine.length + 1);
      refreshStat(document.getElementById("stat-stars"), stars);
      refreshStat(document.getElementById("stat-langs"), Object.keys(langs).length);
      refreshStat(document.getElementById("stat-since"), since);

      syncGrid(mine);
    })
    .catch(function () {
      /* offline or rate-limited: the baked numbers stay */
    });

  /* ---------- Footer year ---------- */
  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();
})();
