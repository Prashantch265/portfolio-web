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

  document.addEventListener("DOMContentLoaded", function () {
    initTheme();
    initMobileNav();
    initScrolledHeader();
    initRuleExtension();
    initFooterYear();
    initGridParallax();

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
