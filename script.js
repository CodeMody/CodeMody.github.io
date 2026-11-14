/* ==========================================================================
   CodeMody portfolio — interactions
   ========================================================================== */
(function () {
  "use strict";

  var root = document.documentElement;

  /* ---------- Theme toggle ---------- */
  var toggle = document.getElementById("theme-toggle");

  function applyTheme(theme) {
    root.setAttribute("data-theme", theme);
    toggle.setAttribute(
      "aria-label",
      theme === "dark" ? "Switch to light mode" : "Switch to dark mode"
    );
  }

  toggle.addEventListener("click", function () {
    var next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
    localStorage.setItem("theme", next);
    applyTheme(next);
  });

  // Follow the OS only while the user has not chosen a theme manually.
  var media = window.matchMedia("(prefers-color-scheme: dark)");
  media.addEventListener("change", function (e) {
    if (!localStorage.getItem("theme")) {
      applyTheme(e.matches ? "dark" : "light");
    }
  });

  applyTheme(root.getAttribute("data-theme") || "light");

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

  /* ---------- Live GitHub stats (progressive enhancement) ---------- */
  // Keeps the page working offline; refreshes the numbers when the API answers.
  fetch("https://api.github.com/users/CodeMody/repos?per_page=100", {
    headers: { Accept: "application/vnd.github+json" },
  })
    .then(function (res) {
      if (!res.ok) throw new Error("GitHub API unavailable");
      return res.json();
    })
    .then(function (repos) {
      var totalStars = repos.reduce(function (sum, r) {
        return sum + r.stargazers_count;
      }, 0);

      // +1 for DigiBall, the private flagship not counted by the public API.
      var reposEl = document.getElementById("stat-repos");
      var starsEl = document.getElementById("stat-stars");
      if (reposEl) reposEl.textContent = repos.length + 1;
      if (starsEl) starsEl.textContent = totalStars;
    })
    .catch(function () {
      /* offline or rate-limited: the static numbers stay */
    });

  /* ---------- Footer year ---------- */
  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();
})();
