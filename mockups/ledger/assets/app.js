/*
  Ledger mockup — shared chrome behavior.
  Theme resolution/persistence (light default), mobile nav, the one
  generic entrance-fade utility that is this direction's entire
  motion budget (PRD §6 — applies uniformly to diagrams, pull-quotes,
  and section breaks), and the contact / CV form state machines.
*/

(function () {
  "use strict";

  /* -----------------------------------------------------------------
     Theme — light is default and design-of-record, §4.4.
  ----------------------------------------------------------------- */

  var THEME_KEY = "ledger-theme";

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
    var prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    return prefersDark ? "dark" : "light";
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
     Mobile nav
  ----------------------------------------------------------------- */

  function initMobileNav() {
    var toggle = document.querySelector("[data-nav-toggle]");
    var panel = document.querySelector("[data-mobile-nav]");
    if (!toggle || !panel) return;

    toggle.addEventListener("click", function () {
      var open = panel.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      toggle.textContent = open ? "Close" : "Menu";
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
     Entrance fade — §6, the entire motion budget beyond hover states.
     Applied uniformly to any .fade-in element: diagrams, pull-quotes,
     section breaks. One moment, one duration, no per-element
     variation. Reduced-motion drops straight to final state via the
     CSS rule in base.css.
  ----------------------------------------------------------------- */

  function initFadeIns() {
    var targets = document.querySelectorAll(".fade-in");
    if (!targets.length) return;

    if (!window.matchMedia || !("IntersectionObserver" in window)) {
      targets.forEach(function (t) {
        t.classList.add("is-visible");
      });
      return;
    }

    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );

    targets.forEach(function (t) {
      io.observe(t);
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
        setStatus("error", "Please check the highlighted fields and try again.");
        return;
      }

      submitCount += 1;
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = "Sending…";
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

  // minimal public surface: pages that inject content dynamically
  // (diagrams, teaser lists) after DOMContentLoaded has already fired
  // call this directly to pick up new .fade-in targets, rather than
  // re-dispatching DOMContentLoaded — which would re-attach every
  // listener above a second time (duplicate form submits, duplicate
  // nav-toggle clicks) instead of just re-scanning for fade targets
  window.LedgerApp = { initFadeIns: initFadeIns };

  document.addEventListener("DOMContentLoaded", function () {
    initTheme();
    initMobileNav();
    initScrolledHeader();
    initFooterYear();
    initFadeIns();

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
