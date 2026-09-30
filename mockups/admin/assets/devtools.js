/*
  Admin mockup — fault injection panel. NOT part of the PRD's real
  contract; a demo affordance so §10's error states and §4.3's re-auth
  flow are inspectable on demand rather than only when they happen to
  occur naturally. Kept in its own file so it visibly reads as "not the
  spec" to anyone reading the source.

  Open with Ctrl+Shift+D, the "Dev" button in the topbar, or a
  `?fail=STATUS&on=METHOD` URL param (one-shot, deep-linkable).
*/

window.AdminDevtools = (function () {
  "use strict";

  var UI = window.AdminUI;
  var DB = window.AdminDB;
  var panel = null;

  function push(status, method, pathPattern, message, source) {
    DB.faults.push({ status: status, method: method, pathPattern: pathPattern, once: true, message: message, source: source });
    UI.toast("Queued: next " + (method || "any") + " " + pathPattern + " → " + status, "info");
    render();
  }

  function queuedListHtml() {
    var list = DB.faults.list();
    if (!list.length) return '<p style="color:var(--ink-muted);font-size:0.8rem;">Nothing queued.</p>';
    return (
      '<ul class="list-simple">' +
      list
        .map(function (f) {
          return "<li><span>" + f.status + " · " + (f.method || "any") + " " + UI.escapeHtml(f.pathPattern) + "</span></li>";
        })
        .join("") +
      "</ul>"
    );
  }

  function render() {
    if (!panel) return;
    panel.innerHTML =
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-3);">' +
      "<strong>Fault injection (dev only)</strong>" +
      '<button type="button" class="btn btn--small" data-dev-close>Close</button>' +
      "</div>" +
      '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:var(--space-3);">' +
      '<button type="button" class="btn btn--small" data-dev-fault="401-put">401 on next save</button>' +
      '<button type="button" class="btn btn--small" data-dev-fault="422-put">422 on next save</button>' +
      '<button type="button" class="btn btn--small" data-dev-fault="409-publish">409 on next publish</button>' +
      '<button type="button" class="btn btn--small" data-dev-fault="501-restore">501 on next restore</button>' +
      '<button type="button" class="btn btn--small" data-dev-lockout>Trigger 429 lockout</button>' +
      "</div>" +
      "<strong style=\"font-size:0.8rem;\">Queued</strong>" +
      queuedListHtml() +
      '<div style="margin-top:var(--space-3);display:flex;gap:6px;">' +
      '<button type="button" class="btn btn--small" data-dev-expire-session>Expire session now</button>' +
      '<button type="button" class="btn btn--small btn--danger" data-dev-reset>Reset all data</button>' +
      "</div>";

    UI.qs("[data-dev-close]", panel).addEventListener("click", close);
    UI.qs('[data-dev-fault="401-put"]', panel).addEventListener("click", function () {
      push(401, "PUT", "/api/admin/*", "Unauthorized.");
    });
    UI.qs('[data-dev-fault="422-put"]', panel).addEventListener("click", function () {
      push(422, "PUT", "/api/admin/*", "Validation failed.", { _root: ["Forced by the dev panel — no real validation ran."] });
    });
    UI.qs('[data-dev-fault="409-publish"]', panel).addEventListener("click", function () {
      push(409, "POST", "/api/admin/*/publish", "This slug is already used by another project — change it before publishing.", { slug: ["Forced by the dev panel."] });
    });
    UI.qs('[data-dev-fault="501-restore"]', panel).addEventListener("click", function () {
      push(501, "POST", "/api/admin/revisions/*/restore", 'Restore is not yet supported for entity type "caseStudySection".');
    });
    UI.qs("[data-dev-lockout]", panel).addEventListener("click", function () {
      DB.session.lockUntil = Date.now() + 12 * 60 * 1000;
      DB.persistSession();
      UI.toast("Locked out for 12 minutes (dev).", "info");
    });
    UI.qs("[data-dev-expire-session]", panel).addEventListener("click", function () {
      DB.session.expiresAt = 0;
      DB.persistSession();
      UI.toast("Session expired — next request will 401 for real.", "info");
    });
    UI.qs("[data-dev-reset]", panel).addEventListener("click", function () {
      UI.confirmDialog({
        title: "Reset all admin data?",
        message: "Clears every draft, publish, tag, and uploaded file back to the seed content. Cannot be undone.",
        danger: true,
        confirmLabel: "Reset"
      }).then(function (yes) {
        if (yes) {
          DB.reset();
          location.href = "login.html";
        }
      });
    });
  }

  function open() {
    if (panel) return;
    panel = document.createElement("div");
    panel.className = "modal";
    panel.style.cssText = "position:fixed;bottom:16px;right:16px;width:320px;z-index:600;max-height:70vh;overflow-y:auto;";
    document.body.appendChild(panel);
    render();
  }

  function close() {
    if (panel) {
      panel.remove();
      panel = null;
    }
  }

  document.addEventListener("keydown", function (e) {
    if (e.ctrlKey && e.shiftKey && (e.key === "D" || e.key === "d")) {
      e.preventDefault();
      panel ? close() : open();
    }
  });

  // One-shot deep-linkable demo: ?fail=422&on=PUT
  (function fromUrl() {
    var params = new URLSearchParams(location.search);
    var status = params.get("fail");
    var on = params.get("on");
    if (status) {
      DB.faults.push({ status: Number(status), method: on || undefined, pathPattern: "/api/admin/*", once: true });
    }
  })();

  return { open: open, close: close };
})();
