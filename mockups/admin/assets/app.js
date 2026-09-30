/*
  Admin mockup — shell + auth gate + re-auth modal.

  Deliberate convention difference from the public mockups: those
  duplicate header markup by hand on every page (fine for content pages
  that rarely change). The admin topbar/sidebar are structural chrome
  repeated identically across 13 screens — exactly what
  apps/web/src/app/admin/layout.tsx (PRD §3) exists to factor out in the
  real build. Rendering it here from one place, instead of copy-pasting
  it 13 times, is the honest static-mockup equivalent of that layout.
*/

window.AdminApp = (function () {
  "use strict";

  var UI = window.AdminUI;
  var Api = window.Api;
  var THEME_KEY = "blueprint-theme"; // reused from the public mockups on purpose — the admin follows the same theme choice

  var NAV = [
    { key: "dashboard", label: "Dashboard", href: "index.html" },
    { key: "projects", label: "Projects", href: "projects.html", count: "projects" },
    { key: "posts", label: "Posts", href: "posts.html", count: "posts" },
    { key: "pages", label: "Pages", href: "pages.html", count: "pages" },
    { key: "tags", label: "Tags", href: "tags.html", count: "tags" },
    { key: "media", label: "Media", href: "media.html", count: "media" },
    { key: "cv", label: "CV", href: "cv.html" },
    { key: "notes", label: "Design notes", href: "notes.html" }
  ];

  var COUNT_ENDPOINT = {
    projects: "/api/admin/projects",
    posts: "/api/admin/posts",
    pages: "/api/admin/pages",
    tags: "/api/admin/tags",
    media: "/api/admin/media"
  };

  /* -----------------------------------------------------------------
     Theme — identical mechanism to the public mockups (app.js there)
  ----------------------------------------------------------------- */

  function currentResolvedTheme() {
    var explicit = document.documentElement.getAttribute("data-theme");
    if (explicit) return explicit;
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }

  function applyTheme(theme) {
    if (theme === "dark" || theme === "light") {
      document.documentElement.setAttribute("data-theme", theme);
    } else {
      document.documentElement.removeAttribute("data-theme");
    }
  }

  function initTheme() {
    var stored = null;
    try {
      stored = localStorage.getItem(THEME_KEY);
    } catch (e) {}
    if (stored) applyTheme(stored);
  }

  function wireThemeToggle(btn) {
    btn.addEventListener("click", function () {
      var next = currentResolvedTheme() === "dark" ? "light" : "dark";
      applyTheme(next);
      try {
        localStorage.setItem(THEME_KEY, next);
      } catch (e) {}
    });
  }

  var THEME_TOGGLE_SVG =
    '<svg class="icon-sun" viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="3" fill="none" stroke="currentColor" stroke-width="1.3"/><g stroke="currentColor" stroke-width="1.3"><line x1="8" y1="0.5" x2="8" y2="2.5"/><line x1="8" y1="13.5" x2="8" y2="15.5"/><line x1="0.5" y1="8" x2="2.5" y2="8"/><line x1="13.5" y1="8" x2="15.5" y2="8"/><line x1="2.6" y1="2.6" x2="4" y2="4"/><line x1="12" y1="12" x2="13.4" y2="13.4"/><line x1="2.6" y1="13.4" x2="4" y2="12"/><line x1="12" y1="4" x2="13.4" y2="2.6"/></g></svg>' +
    '<svg class="icon-moon" viewBox="0 0 16 16" aria-hidden="true"><path d="M13.5 9.5A6 6 0 1 1 6.5 2.5a5 5 0 0 0 7 7z" fill="none" stroke="currentColor" stroke-width="1.3"/></svg>';

  /* -----------------------------------------------------------------
     Re-auth modal — §4.3. Api.onUnauthorized is installed here so a
     401 arriving from ANY mutating request on ANY page opens the same
     modal over whatever the visitor was doing, without navigating away
     and without touching the underlying form's DOM.
  ----------------------------------------------------------------- */

  function initReauth() {
    Api.onUnauthorized = function () {
      return new Promise(function (resolve) {
        openReauthModal(resolve);
      });
    };
  }

  function openReauthModal(resolve) {
    var lastEmail = window.AdminDB.session.email || "";
    var m = UI.modal({
      title: "Session expired",
      dismissible: false,
      bodyHtml:
        '<p>Your session timed out. Sign in again to continue — nothing you were editing has been lost.</p>' +
        '<form data-reauth-form>' +
        UI.field({ name: "email", label: "Email", type: "email", value: lastEmail }) +
        UI.field({ name: "password", label: "Password", type: "password", value: "" }) +
        '<div class="modal__actions" style="margin-top:var(--space-4);">' +
        '<button type="button" class="btn" data-reauth-cancel>Cancel</button>' +
        '<button type="submit" class="btn btn--primary">Continue</button>' +
        "</div></form>"
    });
    var form = UI.qs("[data-reauth-form]", m.box);

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var body = UI.readForm(form, ["email", "password"]);
      UI.clearFieldErrors(form);
      Api.request("POST", "/api/admin/auth/login", body).then(
        function (env) {
          showReauthTotp(m, resolve, env.data.challengeId, body.email);
        },
        function (err) {
          UI.applyFieldErrors(form, err);
        }
      );
    });

    UI.qs("[data-reauth-cancel]", m.box).addEventListener("click", function () {
      UI.confirmDialog({
        title: "Leave without saving?",
        message: "You'll need to sign in again from the login page, and this specific edit will be lost.",
        confirmLabel: "Sign out",
        danger: true
      }).then(function (leave) {
        if (leave) {
          m.close();
          Api.Session.end();
          location.href = "login.html";
          resolve(false);
        }
      });
    });
  }

  function showReauthTotp(m, resolve, challengeId, email) {
    m.box.innerHTML =
      "<h2>Enter your code</h2>" +
      "<p>A 6-digit code from your authenticator app. It expires in 5 minutes.</p>" +
      '<form data-reauth-totp-form>' +
      UI.field({ name: "code", label: "Code", type: "text", value: "" }) +
      '<div class="modal__actions" style="margin-top:var(--space-4);">' +
      '<button type="submit" class="btn btn--primary">Verify</button>' +
      "</div></form>";
    var form = UI.qs("[data-reauth-totp-form]", m.box);
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var body = UI.readForm(form, ["code"]);
      UI.clearFieldErrors(form);
      Api.request("POST", "/api/admin/auth/totp", { challengeId: challengeId, code: body.code }).then(
        function () {
          m.close();
          UI.toast("Signed in again — retrying your last action…", "success");
          resolve(true);
        },
        function (err) {
          UI.applyFieldErrors(form, err);
        }
      );
    });
    UI.qs("input", form).focus();
  }

  /* -----------------------------------------------------------------
     Shell mount — §3, §5
  ----------------------------------------------------------------- */

  function topbarHtml(pageTitle) {
    return (
      '<div class="admin-topbar__title">' + UI.escapeHtml(pageTitle) + "</div>" +
      '<div class="admin-topbar__actions">' +
      '<span class="admin-topbar__title" data-admin-email></span>' +
      '<button type="button" class="admin-theme-toggle" data-theme-toggle aria-label="Toggle color theme">' + THEME_TOGGLE_SVG + "</button>" +
      '<button type="button" class="btn btn--small" data-devtools-open title="Fault injection panel — Ctrl+Shift+D">Dev</button>' +
      '<button type="button" class="btn btn--small" data-logout>Log out</button>' +
      "</div>"
    );
  }

  function sidebarHtml(activeKey) {
    var html = '<a class="admin-sidebar__wordmark" href="index.html">PRASHANT CHAUDHARY — Admin</a><nav>';
    NAV.forEach(function (item) {
      html +=
        '<a href="' + item.href + '"' + (item.key === activeKey ? ' aria-current="page"' : "") + ">" +
        "<span>" + item.label + "</span>" +
        (item.count ? '<span class="admin-sidebar__count" data-count="' + item.count + '">–</span>' : "") +
        "</a>";
    });
    html += "</nav>";
    return html;
  }

  function initSidebarCounts() {
    Object.keys(COUNT_ENDPOINT).forEach(function (key) {
      var el = UI.qs('[data-count="' + key + '"]');
      if (!el) return;
      Api.send("GET", COUNT_ENDPOINT[key])
        .then(function (env) {
          el.textContent = env.data.length;
        })
        .catch(function () {
          el.textContent = "–";
        });
    });
  }

  function mountShell(activeKey, pageTitle) {
    initTheme();
    initReauth();

    var topbar = UI.qs("[data-admin-topbar]");
    var sidebar = UI.qs("[data-admin-sidebar]");
    if (topbar) topbar.innerHTML = topbarHtml(pageTitle || "Admin");
    if (sidebar) sidebar.innerHTML = sidebarHtml(activeKey);

    var themeToggle = UI.qs("[data-theme-toggle]");
    if (themeToggle) wireThemeToggle(themeToggle);

    var logoutBtn = UI.qs("[data-logout]");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", function () {
        Api.send("POST", "/api/admin/auth/logout").then(function () {
          location.href = "login.html";
        });
      });
    }

    var devBtn = UI.qs("[data-devtools-open]");
    if (devBtn && window.AdminDevtools) {
      devBtn.addEventListener("click", window.AdminDevtools.open);
    }

    // §3's server-side gate, faked: nothing in [data-admin-shell] is
    // revealed until Api.me() resolves. There is no real cookie or
    // server here — this is the honest static-mockup stand-in, and the
    // source says so rather than pretending the security property is real.
    var shell = UI.qs("[data-admin-shell]");
    var gateNotice = UI.qs("[data-admin-gate-notice]");
    Api.me()
      .then(function (env) {
        if (shell) shell.hidden = false;
        if (gateNotice) gateNotice.remove();
        var emailEl = UI.qs("[data-admin-email]");
        if (emailEl && env.data) emailEl.textContent = env.data.email;
        initSidebarCounts();
      })
      .catch(function () {
        location.href = "login.html";
      });
  }

  return { mountShell: mountShell, applyTheme: applyTheme, currentResolvedTheme: currentResolvedTheme, THEME_KEY: THEME_KEY };
})();
