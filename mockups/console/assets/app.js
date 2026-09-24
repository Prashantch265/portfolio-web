/*
  Console mockup — shared chrome behavior.
  Theme resolution/persistence, mobile nav, line-rail numbering,
  one-time wordmark cursor blink, the command palette (real fuzzy
  filter, keyboard nav, mandatory visible-nav fallback per PRD §1.2),
  the status strip (real-shaped fixture data), and the contact / CV
  form state machines.
*/

(function () {
  "use strict";

  /* -----------------------------------------------------------------
     Theme — dark is default and design-of-record, §4.4.
  ----------------------------------------------------------------- */

  var THEME_KEY = "console-theme";

  function applyTheme(theme) {
    if (theme === "dark" || theme === "light") {
      document.documentElement.setAttribute("data-theme", theme);
    } else {
      document.documentElement.removeAttribute("data-theme");
    }
  }

  function currentResolvedTheme() {
    var attr = document.documentElement.getAttribute("data-theme");
    if (attr) return attr;
    var prefersLight =
      window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches;
    return prefersLight ? "light" : "dark";
  }

  function initTheme() {
    var stored = null;
    try {
      stored = localStorage.getItem(THEME_KEY);
    } catch (e) {
      /* ignore */
    }
    if (stored) applyTheme(stored);

    var toggle = document.querySelector("[data-theme-toggle]");
    if (!toggle) return;
    toggle.textContent = currentResolvedTheme();

    toggle.addEventListener("click", function () {
      var next = currentResolvedTheme() === "dark" ? "light" : "dark";
      applyTheme(next);
      toggle.textContent = next;
      try {
        localStorage.setItem(THEME_KEY, next);
      } catch (e) {
        /* ignore */
      }
    });
  }

  /* -----------------------------------------------------------------
     Mobile nav
  ----------------------------------------------------------------- */

  function initMobileNav() {
    var toggle = document.querySelector("[data-nav-toggle]");
    var panel = document.querySelector("[data-mobile-nav]");
    if (!toggle || !panel) return;

    toggle.addEventListener("click", function () {
      var open = panel.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      toggle.textContent = open ? "close" : "menu";
    });

    var paletteBtn = panel.querySelector("[data-mobile-palette-open]");
    if (paletteBtn) {
      paletteBtn.addEventListener("click", function () {
        panel.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
        toggle.textContent = "menu";
        openPalette();
      });
    }
  }

  /* -----------------------------------------------------------------
     Scrolled header
  ----------------------------------------------------------------- */

  function initScrolledHeader() {
    var header = document.querySelector("[data-site-header]");
    if (!header) return;
    function onScroll() {
      header.classList.toggle("is-scrolled", window.scrollY > 8);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  /* -----------------------------------------------------------------
     Wordmark cursor — one non-repeating blink, homepage, first visit
     in a session. §3.1.
  ----------------------------------------------------------------- */

  function initWordmarkCursor() {
    var cursor = document.querySelector("[data-wordmark-cursor]");
    if (!cursor) return;
    var reduced =
      window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    var SEEN_KEY = "console-cursor-seen";
    var seen = false;
    try {
      seen = sessionStorage.getItem(SEEN_KEY) === "1";
    } catch (e) {
      seen = false;
    }
    if (seen || !document.body.hasAttribute("data-home")) return;

    cursor.classList.add("is-blinking");
    try {
      sessionStorage.setItem(SEEN_KEY, "1");
    } catch (e) {
      /* ignore */
    }
  }

  /* -----------------------------------------------------------------
     Line-rail numbering — §4.1. Real numbers, computed from actual
     block order, aria-hidden.
  ----------------------------------------------------------------- */

  function initLineRail() {
    var rails = document.querySelectorAll("[data-line-rail]");
    rails.forEach(function (rail) {
      var frame = rail.closest(".frame");
      if (!frame) return;
      var targets = frame.querySelectorAll("[data-rail-line]");
      targets.forEach(function (t, i) {
        var num = document.createElement("span");
        num.className = "line-rail__num";
        num.setAttribute("aria-hidden", "true");
        num.style.top = t.offsetTop + "px";
        num.textContent = String(i + 1).padStart(2, "0");
        rail.appendChild(num);
      });
    });
  }

  /* -----------------------------------------------------------------
     Status strip — §6.2. Real, checkable facts only. One slow pulse
     on the glyph when passing, paused off-screen, killed under
     reduced-motion.
  ----------------------------------------------------------------- */

  function initStatusStrip() {
    var el = document.querySelector("[data-status-strip]");
    if (!el || !window.SITE_DATA) return;
    var s = window.SITE_DATA.statusStrip;
    var passing = s.build === "passing";

    el.innerHTML =
      '<span class="status-strip__item"><span class="status-strip__glyph' +
      (passing ? " is-pulsing" : " is-failing") +
      '" data-status-glyph></span>build: ' +
      s.build +
      "</span>" +
      '<span class="status-strip__item">last deploy ' +
      s.lastDeploy +
      "</span>" +
      '<span class="status-strip__item">uptime ' +
      s.uptimeDays +
      "d</span>";

    var glyph = el.querySelector("[data-status-glyph]");
    if (!glyph || !passing) return;

    if (!("IntersectionObserver" in window)) return;
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          glyph.style.animationPlayState = entry.isIntersecting ? "running" : "paused";
        });
      },
      { threshold: 0 }
    );
    io.observe(el);
  }

  /* -----------------------------------------------------------------
     Command palette — §7, §8. Real fuzzy filter, keyboard nav.
     Never the only way to navigate — the header/footer/mobile nav
     stay visible and functional regardless (PRD §1.2's non-negotiable
     success criterion).
  ----------------------------------------------------------------- */

  var PAGES = [
    { label: "home", path: "index.html" },
    { label: "work", path: "work.html" },
    { label: "writing", path: "writing.html" },
    { label: "cv", path: "cv.html" },
    { label: "stack", path: "stack.html" },
    { label: "design notes", path: "brand.html" }
  ];

  function fuzzyScore(query, target) {
    query = query.toLowerCase();
    target = target.toLowerCase();
    if (!query) return 0;
    var ti = 0,
      score = 0,
      consecutive = 0;
    for (var qi = 0; qi < query.length; qi++) {
      var ch = query[qi];
      var found = target.indexOf(ch, ti);
      if (found === -1) return -1;
      if (found === ti) consecutive++;
      else consecutive = 0;
      score += found - ti + 1 - consecutive * 0.5;
      ti = found + 1;
    }
    return score;
  }

  function buildCommandList() {
    var commands = PAGES.map(function (p) {
      return { label: p.label, path: p.path, searchText: p.label, kind: "page" };
    });
    if (window.SITE_DATA && window.SITE_DATA.projects) {
      window.SITE_DATA.projects.forEach(function (p) {
        commands.push({
          label: p.title,
          path: "case-study.html?slug=" + p.slug,
          searchText: p.title + " " + p.stack.join(" ") + " " + p.summary,
          kind: "project"
        });
      });
    }
    return commands;
  }

  var paletteState = {
    open: false,
    activeIndex: 0,
    results: [],
    commands: []
  };

  function ensurePaletteDOM() {
    if (document.querySelector(".palette-overlay")) return;
    var root = document.body;
    var overlay = document.createElement("div");
    overlay.className = "palette-overlay";
    overlay.hidden = true;
    overlay.innerHTML =
      '<div class="palette" role="dialog" aria-modal="true" aria-label="Command palette">' +
      '<input class="palette__input" type="text" placeholder="Type a page, project, or tech name..." aria-label="Search" autocomplete="off" />' +
      '<ul class="palette__results" role="listbox"></ul>' +
      '<div class="palette__empty" hidden>no matches</div>' +
      "</div>";
    root.appendChild(overlay);

    overlay.addEventListener("click", function (evt) {
      if (evt.target === overlay) closePalette();
    });
  }

  function renderPaletteResults() {
    var overlay = document.querySelector(".palette-overlay");
    var list = overlay.querySelector(".palette__results");
    var empty = overlay.querySelector(".palette__empty");
    list.innerHTML = "";

    if (paletteState.results.length === 0) {
      empty.hidden = false;
      return;
    }
    empty.hidden = true;

    paletteState.results.forEach(function (r, i) {
      var li = document.createElement("li");
      li.className = "palette__result" + (i === paletteState.activeIndex ? " is-active" : "");
      li.setAttribute("role", "option");
      li.setAttribute("aria-selected", i === paletteState.activeIndex ? "true" : "false");
      li.innerHTML =
        '<span class="palette__result-kind">' +
        r.kind +
        "</span>" +
        '<span class="palette__result-label">' +
        r.label +
        "</span>";
      li.addEventListener("mouseenter", function () {
        paletteState.activeIndex = i;
        renderPaletteResults();
      });
      li.addEventListener("click", function () {
        navigateTo(r.path);
      });
      list.appendChild(li);
    });
  }

  function filterPalette(query) {
    var scored = paletteState.commands
      .map(function (c) {
        return { cmd: c, score: fuzzyScore(query, c.searchText) };
      })
      .filter(function (s) {
        return s.score >= 0;
      })
      .sort(function (a, b) {
        return a.score - b.score;
      })
      .slice(0, 8)
      .map(function (s) {
        return s.cmd;
      });

    paletteState.results = query ? scored : paletteState.commands.slice(0, 8);
    paletteState.activeIndex = 0;
    renderPaletteResults();
  }

  function navigateTo(path) {
    window.location.href = path;
  }

  function openPalette() {
    ensurePaletteDOM();
    if (!paletteState.commands.length) paletteState.commands = buildCommandList();

    var overlay = document.querySelector(".palette-overlay");
    var input = overlay.querySelector(".palette__input");
    overlay.hidden = false;
    paletteState.open = true;
    filterPalette("");
    input.value = "";
    setTimeout(function () {
      input.focus();
    }, 0);

    input.oninput = function () {
      filterPalette(input.value);
    };

    input.onkeydown = function (evt) {
      if (evt.key === "ArrowDown") {
        evt.preventDefault();
        paletteState.activeIndex = Math.min(paletteState.activeIndex + 1, paletteState.results.length - 1);
        renderPaletteResults();
      } else if (evt.key === "ArrowUp") {
        evt.preventDefault();
        paletteState.activeIndex = Math.max(paletteState.activeIndex - 1, 0);
        renderPaletteResults();
      } else if (evt.key === "Enter") {
        evt.preventDefault();
        var r = paletteState.results[paletteState.activeIndex];
        if (r) navigateTo(r.path);
      } else if (evt.key === "Escape") {
        closePalette();
      }
    };
  }

  function closePalette() {
    var overlay = document.querySelector(".palette-overlay");
    if (!overlay) return;
    overlay.hidden = true;
    paletteState.open = false;
  }

  function initPalette() {
    var hints = document.querySelectorAll("[data-palette-hint]");
    hints.forEach(function (hint) {
      hint.addEventListener("click", function () {
        openPalette();
      });
    });

    document.addEventListener("keydown", function (evt) {
      var isMod = evt.metaKey || evt.ctrlKey;
      if (isMod && evt.key.toLowerCase() === "k") {
        evt.preventDefault();
        if (paletteState.open) closePalette();
        else openPalette();
      }
    });
  }

  /* -----------------------------------------------------------------
     Form state machine
  ----------------------------------------------------------------- */

  function initForm(selector, opts) {
    var form = document.querySelector(selector);
    if (!form) return;

    var statusEl = form.querySelector("[data-form-status]");
    var submitBtn = form.querySelector('[type="submit"]');
    var submitLabel = submitBtn ? submitBtn.textContent : "";

    function setStatus(kind, message) {
      if (!statusEl) return;
      statusEl.className = "form-status is-visible form-status--" + kind;
      statusEl.textContent = message;
    }

    function clearStatus() {
      if (!statusEl) return;
      statusEl.className = "form-status";
      statusEl.textContent = "";
    }

    var submitCount = 0;

    form.addEventListener("submit", function (evt) {
      evt.preventDefault();
      clearStatus();

      var honeypot = form.querySelector("[data-honeypot]");
      if (honeypot && honeypot.value) {
        setStatus("success", opts.successMessage);
        form.reset();
        return;
      }

      var required = form.querySelectorAll("[required]");
      var valid = true;
      required.forEach(function (field) {
        var fieldWrap = field.closest(".field");
        if (!field.value.trim() || (field.type === "email" && !/.+@.+\..+/.test(field.value))) {
          valid = false;
          if (fieldWrap) fieldWrap.classList.add("field--error");
        } else if (fieldWrap) {
          fieldWrap.classList.remove("field--error");
        }
      });

      if (!valid) {
        setStatus("error", "check the highlighted fields and try again");
        return;
      }

      submitCount += 1;
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = "sending...";
      }

      setTimeout(function () {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = submitLabel;
        }
        if (submitCount > 2) {
          setStatus("rate-limited", opts.rateLimitMessage);
          return;
        }
        setStatus("success", opts.successMessage);
        form.reset();
      }, 700);
    });
  }

  function initFooterYear() {
    var el = document.querySelector("[data-year]");
    if (el) el.textContent = String(new Date().getFullYear());
  }

  document.addEventListener("DOMContentLoaded", function () {
    initTheme();
    initMobileNav();
    initScrolledHeader();
    initWordmarkCursor();
    initFooterYear();
    initStatusStrip();
    initPalette();
    initLineRail();

    initForm("[data-contact-form]", {
      successMessage: "message sent. reply comes from prashant@—— within a couple of days",
      rateLimitMessage: "too many messages this session — try again later"
    });

    initForm("[data-cv-form]", {
      successMessage: "check your email — an expiring link to the full CV is on its way",
      rateLimitMessage: "too many requests this session — try again later"
    });
  });
})();
