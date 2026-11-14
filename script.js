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
  var cards = document.querySelectorAll("#project-grid .card");

  filterBtns.forEach(function (btn) {
    btn.addEventListener("click", function () {
      var filter = btn.dataset.filter;

      filterBtns.forEach(function (b) {
        b.classList.toggle("is-active", b === btn);
      });

      cards.forEach(function (card) {
        var show = filter === "all" || card.dataset.category === filter;
        card.classList.toggle("is-hidden", !show);
        if (show) card.classList.add("is-visible");
      });
    });
  });

  /* ---------- Live GitHub refresh (progressive enhancement) ---------- */
  // Keeps the page working offline; refreshes numbers when the API answers.
  function refreshStat(el, value) {
    if (!el) return;
    el.dataset.count = value;
    if (el.dataset.counted) el.textContent = value;
  }

  fetch("https://api.github.com/users/CodeMody/repos?per_page=100", {
    headers: { Accept: "application/vnd.github+json" },
  })
    .then(function (res) {
      if (!res.ok) throw new Error("GitHub API unavailable");
      return res.json();
    })
    .then(function (repos) {
      var totalStars = 0;
      repos.forEach(function (r) { totalStars += r.stargazers_count; });

      // +1 for DigiBall, the private flagship the public API does not count.
      refreshStat(document.getElementById("stat-repos"), repos.length + 1);
      refreshStat(document.getElementById("stat-stars"), totalStars);

      // Per-card star counts, where the repo is public and known.
      repos.forEach(function (r) {
        var slot = document.querySelector('[data-stars-for="' + r.name + '"]');
        if (slot) slot.textContent = r.stargazers_count;
      });
    })
    .catch(function () {
      /* offline or rate-limited: the static numbers stay */
    });

  /* ---------- Footer year ---------- */
  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();
})();
