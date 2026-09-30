/*
  Admin mockup — persistence layer.
  Owns localStorage load/save/reset, deep clone, id generation, and the
  persisted fault-injection queue. Knows nothing about HTTP semantics or
  envelopes — that's api.js/routes.js. A fault queue that lived only in a
  JS variable would die on the next page navigation, and this is a
  multi-page mockup: "401 mid-edit, then re-auth, then auto-retry" (§4.3)
  has to survive whatever navigation got the visitor to this page in the
  first place, so it's persisted exactly like every other row.
*/

window.AdminDB = (function () {
  "use strict";

  var STORAGE_KEY = "admin.db.v" + window.AdminSeed.SEED_VERSION;
  var SESSION_KEY = "admin.session.v" + window.AdminSeed.SEED_VERSION;

  var state = null;
  var session = null;

  function clone(x) {
    return x === undefined ? x : JSON.parse(JSON.stringify(x));
  }

  function safeGet(key) {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      return null;
    }
  }

  function safeSet(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      /* private mode / quota — mockup degrades to in-memory-only for this tab */
    }
  }

  function safeRemove(key) {
    try {
      localStorage.removeItem(key);
    } catch (e) {}
  }

  function load() {
    var raw = safeGet(STORAGE_KEY);
    if (raw) {
      try {
        state = JSON.parse(raw);
        return state;
      } catch (e) {
        /* corrupt — fall through to reseed */
      }
    }
    state = window.AdminSeed.build();
    persist();
    return state;
  }

  function persist() {
    safeSet(STORAGE_KEY, JSON.stringify(state));
  }

  function loadSession() {
    var raw = safeGet(SESSION_KEY);
    if (raw) {
      try {
        session = JSON.parse(raw);
        return session;
      } catch (e) {}
    }
    session = { sid: null, expiresAt: 0, lockUntil: 0, failedCount: 0, challenge: null };
    persistSession();
    return session;
  }

  function persistSession() {
    safeSet(SESSION_KEY, JSON.stringify(session));
  }

  function ensureLoaded() {
    if (!state) load();
    if (!session) loadSession();
  }

  var idCounters = {};
  function nextId(prefix) {
    idCounters[prefix] = (idCounters[prefix] || 0) + 1;
    return prefix + "-" + Date.now().toString(36) + "-" + idCounters[prefix];
  }

  function cid() {
    // correlationId — §10 envelopes carry one on every response
    return "req_" + Math.random().toString(36).slice(2, 10);
  }

  /* -----------------------------------------------------------------
     Fault queue — a demo affordance, not part of the real API surface.
     Entries: { id, status, method, pathPattern, once, source }.
     pathPattern is matched with simple "*" glob segments so a rule can
     target "POST /api/admin/projects/*" without regex in the caller.
  ----------------------------------------------------------------- */

  function globToRegExp(pattern) {
    var esc = pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
    return new RegExp("^" + esc + "$");
  }

  function faultsList() {
    ensureLoaded();
    return clone(state.faults);
  }

  function faultsPush(fault) {
    ensureLoaded();
    fault.id = nextId("fault");
    state.faults.push(fault);
    persist();
    return clone(fault);
  }

  function faultsClear() {
    ensureLoaded();
    state.faults = [];
    persist();
  }

  function faultsTake(method, path) {
    ensureLoaded();
    for (var i = 0; i < state.faults.length; i++) {
      var f = state.faults[i];
      if (f.method && f.method !== method) continue;
      var rx = globToRegExp(f.pathPattern);
      if (!rx.test(path)) continue;
      if (f.once) {
        state.faults.splice(i, 1);
        persist();
      }
      return f;
    }
    return null;
  }

  return {
    STORAGE_KEY: STORAGE_KEY,
    ensureLoaded: ensureLoaded,
    get state() {
      ensureLoaded();
      return state;
    },
    get session() {
      ensureLoaded();
      return session;
    },
    persist: persist,
    persistSession: persistSession,
    clone: clone,
    nextId: nextId,
    cid: cid,
    reset: function () {
      safeRemove(STORAGE_KEY);
      safeRemove(SESSION_KEY);
      state = null;
      session = null;
    },
    faults: {
      list: faultsList,
      push: faultsPush,
      clear: faultsClear,
      take: faultsTake
    }
  };
})();
