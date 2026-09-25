/*
  Blueprint mockup — shared chrome behavior.
  Theme resolution/persistence, mobile nav, one-time header rule
  extension, scrolled header state, and the contact / gated-CV form
  state machines (idle -> submitting -> success/error/rate-limited).
*/

(function () {
  "use strict";

  /* -----------------------------------------------------------------
     Theme — §4.4. Explicit choice > prefers-color-scheme > light.
  ----------------------------------------------------------------- */

  var THEME_KEY = "blueprint-theme";

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
    var prefersDark =
      window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    return prefersDark ? "dark" : "light";
  }

  function initTheme() {
    var stored = null;
    try {
      stored = localStorage.getItem(THEME_KEY);
    } catch (e) {
      /* private mode / storage disabled — fall through to system pref */
    }
    if (stored) applyTheme(stored);

    var toggle = document.querySelector("[data-theme-toggle]");
    if (!toggle) return;

    toggle.addEventListener("click", function () {
      var next = currentResolvedTheme() === "dark" ? "light" : "dark";
      applyTheme(next);
      try {
        localStorage.setItem(THEME_KEY, next);
      } catch (e) {
        /* ignore */
      }
    });
  }

  /* -----------------------------------------------------------------
     Mobile nav disclosure — §7 header component
  ----------------------------------------------------------------- */

  function initMobileNav() {
    var toggle = document.querySelector("[data-nav-toggle]");
    var panel = document.querySelector("[data-mobile-nav]");
    if (!toggle || !panel) return;

    toggle.addEventListener("click", function () {
      var open = panel.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      toggle.textContent = open ? "CLOSE" : "MENU";
    });

    var paletteBtn = panel.querySelector("[data-mobile-palette-open]");
    if (paletteBtn) {
      paletteBtn.addEventListener("click", function () {
        panel.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
        toggle.textContent = "MENU";
        openPalette();
      });
    }
  }

  /* -----------------------------------------------------------------
     Scrolled header state
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
     Header rule extension — §6 motion, used exactly once, homepage,
     first visit in a session only.
  ----------------------------------------------------------------- */

  function initRuleExtension() {
    var rule = document.querySelector("[data-rule-extend]");
    if (!rule) return;

    var reduced =
      window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    var SEEN_KEY = "blueprint-rule-seen";
    var seen = false;
    try {
      seen = sessionStorage.getItem(SEEN_KEY) === "1";
    } catch (e) {
      seen = false;
    }

    if (reduced || seen) {
      rule.style.width = "100%";
      rule.style.left = "0";
      return;
    }

    requestAnimationFrame(function () {
      rule.style.transition = "width 300ms cubic-bezier(0.2,0,0,1), left 300ms cubic-bezier(0.2,0,0,1)";
      rule.style.width = "100%";
      rule.style.left = "0";
    });

    try {
      sessionStorage.setItem(SEEN_KEY, "1");
    } catch (e) {
      /* ignore */
    }
  }

  /* -----------------------------------------------------------------
     Form state machine — contact + gated-CV request, §7
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

      // honeypot — silently drop, mirrors backend PRD §9 spam defense
      var honeypot = form.querySelector('[data-honeypot]');
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
        setStatus("error", "Check the highlighted fields and try again.");
        return;
      }

      submitCount += 1;
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = "Sending…";
      }

      // simulated network round-trip, mirrors the real API call
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

  /* -----------------------------------------------------------------
     Footer year
  ----------------------------------------------------------------- */

  function initFooterYear() {
    var el = document.querySelector("[data-year]");
    if (el) el.textContent = String(new Date().getFullYear());
  }

  /* -----------------------------------------------------------------
     Grid-guides drift — §6. The visible drafting-layer grid (§4.1)
     moves a few px slower than page content on scroll: a depth cue
     in the brand's own vocabulary (you're looking through the grid
     at content moving past it), not a borrowed hero-image parallax.
     One shared CSS custom property drives every .grid-guides
     instance on the page in lockstep. Skipped entirely under
     prefers-reduced-motion — this is scroll-driven motion like any
     other and gets the same hard opt-out.
  ----------------------------------------------------------------- */

  function initGridParallax() {
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }
    var DRIFT_FACTOR = 0.18; // guides lag content by 18% of scroll delta
    var ticking = false;

    function update() {
      ticking = false;
      var y = Math.round(window.scrollY * DRIFT_FACTOR);
      document.documentElement.style.setProperty("--scroll-parallax", y + "px");
    }

    function onScroll() {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    }

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  /* -----------------------------------------------------------------
     Ambient-motion coordinator — §6.3. "At most one continuous
     ambient loop animates in the viewport at any time." The diagram
     system (diagram.js) reports in/out via setDiagramActive(); the
     status strip checks canPulse() before running its own pulse.
  ----------------------------------------------------------------- */

  window.SchematicAmbientMotion = (function () {
    var diagramActive = false;
    return {
      setDiagramActive: function (v) {
        diagramActive = v;
      },
      canPulse: function () {
        return !diagramActive;
      }
    };
  })();

  /* -----------------------------------------------------------------
     Status strip — §6.2, adapted from Console. Two real fields only
     (build, last deploy — uptime dropped). "Passing" uses the
     --success token, never --signal (§4.4's single-accent rule).
     Renders into whichever placement variant is present on the page:
     the homepage-prominent block, or the footer block elsewhere.
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
      "</span>";

    var glyph = el.querySelector("[data-status-glyph]");
    if (!glyph || !passing) return;
    if (!("IntersectionObserver" in window)) return;

    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          var coordinator = window.SchematicAmbientMotion;
          var allowed = entry.isIntersecting && (!coordinator || coordinator.canPulse());
          glyph.style.animationPlayState = allowed ? "running" : "paused";
        });
      },
      { threshold: 0 }
    );
    io.observe(el);

    // re-check every couple of seconds while in view, in case a
    // diagram scrolls into view afterward and should take precedence
    var pollId = setInterval(function () {
      var rect = el.getBoundingClientRect();
      var inView = rect.top < window.innerHeight && rect.bottom > 0;
      if (!inView) return;
      var coordinator = window.SchematicAmbientMotion;
      var allowed = !coordinator || coordinator.canPulse();
      glyph.style.animationPlayState = allowed ? "running" : "paused";
    }, 1500);
    window.addEventListener("beforeunload", function () {
      clearInterval(pollId);
    });
  }

  /* -----------------------------------------------------------------
     Command palette — §7, §8.2. SECONDARY nav surface — never the
     only way to navigate; the header/footer nav stay visible and
     functional regardless (§1.2's non-negotiable success criterion).
     Real fuzzy filter, keyboard nav, adapted from Console's palette.
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
    var overlay = document.createElement("div");
    overlay.className = "palette-overlay";
    overlay.hidden = true;
    overlay.innerHTML =
      '<div class="palette" role="dialog" aria-modal="true" aria-label="Command palette">' +
      '<input class="palette__input" type="text" placeholder="Search pages, projects, tech..." aria-label="Search" autocomplete="off" />' +
      '<ul class="palette__results" role="listbox"></ul>' +
      '<div class="palette__empty" hidden>No matches.</div>' +
      "</div>";
    document.body.appendChild(overlay);

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

  document.addEventListener("DOMContentLoaded", function () {
    initTheme();
    initMobileNav();
    initScrolledHeader();
    initRuleExtension();
    initFooterYear();
    initGridParallax();
    initStatusStrip();
    initPalette();

    initForm("[data-contact-form]", {
      successMessage: "Message sent. I'll reply from prashant@—— within a couple of days.",
      rateLimitMessage: "Too many messages from this session — please try again later."
    });

    initForm("[data-cv-form]", {
      successMessage: "Check your email — an expiring link to the full CV is on its way.",
      rateLimitMessage: "Too many requests from this session — please try again later."
    });
  });
})();
