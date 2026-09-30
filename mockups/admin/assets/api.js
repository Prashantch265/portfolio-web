/*
  Admin mockup — fake API transport. This is the ONLY file that knows how
  to build a §10 envelope, throw an ApiError, or check the session. A
  route handler (routes.js) never touches any of that directly — it can
  only return through ok()/fail(), which is what makes "the client is the
  single place envelope parsing and 401 interception live" (PRD §6) a
  structural fact about this codebase rather than a claim about it.
*/

window.Api = (function () {
  "use strict";

  var ROUTES = [];

  /* -----------------------------------------------------------------
     Envelopes — §10. The no-`data`-key case is enforced by arguments
     arity, not remembered per call site: `ok(msg)` never has a `data`
     key at all; `ok(msg, x)` always does, even if x is null/[]/{}.
  ----------------------------------------------------------------- */

  function ok(message) {
    var env = { success: true, statusCode: 200, message: message };
    if (arguments.length > 1) env.data = arguments[1];
    return env;
  }

  function fail(status, message, source) {
    return {
      success: false,
      statusCode: status,
      message: message,
      source: source === undefined ? null : source,
      correlationId: window.AdminDB.cid(),
      timestamp: new Date().toISOString()
    };
  }

  function ApiError(env) {
    this.name = "ApiError";
    this.statusCode = env.statusCode;
    this.message = env.message;
    this.source = env.source;
    this.correlationId = env.correlationId;
    this.timestamp = env.timestamp;
  }
  ApiError.prototype = Object.create(Error.prototype);

  /* -----------------------------------------------------------------
     Session — §4. Deliberately exposes no timestamp anywhere in its
     public surface (valid/touch/start/end/me only) so no screen can
     build the countdown §4.2 explicitly forbids, even by accident.
     Internally it does track expiresAt/lockUntil — enforcement needs a
     real clock — the constraint is on what's OBSERVABLE, not on how
     the fake session is implemented.
  ----------------------------------------------------------------- */

  var SESSION_TTL_MS = 30 * 60 * 1000;
  var CHALLENGE_TTL_MS = 5 * 60 * 1000;
  var LOCKOUT_AFTER = 5;
  var LOCKOUT_MS = 12 * 60 * 1000;

  var Session = {
    valid: function () {
      var s = window.AdminDB.session;
      return !!s.sid && Date.now() < s.expiresAt;
    },
    touch: function () {
      var s = window.AdminDB.session;
      if (!s.sid) return;
      s.expiresAt = Date.now() + SESSION_TTL_MS;
      window.AdminDB.persistSession();
    },
    start: function (email) {
      var s = window.AdminDB.session;
      s.sid = window.AdminDB.nextId("sid");
      s.email = email;
      s.expiresAt = Date.now() + SESSION_TTL_MS;
      s.failedCount = 0;
      s.lockUntil = 0;
      s.challenge = null;
      window.AdminDB.persistSession();
    },
    end: function () {
      var s = window.AdminDB.session;
      s.sid = null;
      s.email = null;
      s.expiresAt = 0;
      window.AdminDB.persistSession();
    },
    me: function () {
      var s = window.AdminDB.session;
      return this.valid() ? { email: s.email } : null;
    },
    isLockedOut: function () {
      return Date.now() < window.AdminDB.session.lockUntil;
    },
    lockMessage: function () {
      var s = window.AdminDB.session;
      var minutes = Math.max(1, Math.ceil((s.lockUntil - Date.now()) / 60000));
      return "Too many failed attempts. Try again in " + minutes + " minutes.";
    },
    registerFailedLogin: function () {
      var s = window.AdminDB.session;
      s.failedCount = (s.failedCount || 0) + 1;
      if (s.failedCount >= LOCKOUT_AFTER) {
        s.lockUntil = Date.now() + LOCKOUT_MS;
      }
      window.AdminDB.persistSession();
    },
    createChallenge: function (email) {
      var s = window.AdminDB.session;
      s.challenge = {
        id: window.AdminDB.nextId("chal"),
        email: email,
        expiresAt: Date.now() + CHALLENGE_TTL_MS,
        used: false
      };
      window.AdminDB.persistSession();
      return s.challenge.id;
    },
    verifyChallenge: function (challengeId, code) {
      var s = window.AdminDB.session;
      var c = s.challenge;
      if (!c || c.id !== challengeId) return { ok: false, reason: "invalid" };
      if (c.used) return { ok: false, reason: "used" };
      if (Date.now() > c.expiresAt) return { ok: false, reason: "expired" };
      // demo convention, same shape as Blueprint/Console's dev-content
      // conventions elsewhere: any 6-digit code passes except "000000",
      // so the wrong-code path stays organically reachable.
      if (code === "000000") return { ok: false, reason: "wrong" };
      c.used = true;
      window.AdminDB.persistSession();
      return { ok: true, email: c.email };
    }
  };

  /* -----------------------------------------------------------------
     Route registration + dispatch
  ----------------------------------------------------------------- */

  function compileRoute(pattern) {
    var keys = [];
    var rx = pattern.replace(/:[^/]+/g, function (m) {
      keys.push(m.slice(1));
      return "([^/]+)";
    });
    return { regex: new RegExp("^" + rx + "$"), keys: keys };
  }

  function route(method, pattern, handler, opts) {
    var compiled = compileRoute(pattern);
    ROUTES.push({
      method: method,
      pattern: pattern,
      regex: compiled.regex,
      keys: compiled.keys,
      handler: handler,
      anon: !!(opts && opts.anon)
    });
  }

  function parseQuery(search) {
    var q = {};
    if (!search) return q;
    search
      .replace(/^\?/, "")
      .split("&")
      .forEach(function (pair) {
        if (!pair) return;
        var idx = pair.indexOf("=");
        var k = decodeURIComponent(idx === -1 ? pair : pair.slice(0, idx));
        var v = idx === -1 ? "" : decodeURIComponent(pair.slice(idx + 1));
        q[k] = v;
      });
    return q;
  }

  function findRoute(method, pathname) {
    for (var i = 0; i < ROUTES.length; i++) {
      var r = ROUTES[i];
      if (r.method !== method) continue;
      var m = pathname.match(r.regex);
      if (m) {
        var params = {};
        r.keys.forEach(function (k, idx) {
          params[k] = decodeURIComponent(m[idx + 1]);
        });
        return { route: r, params: params };
      }
    }
    return null;
  }

  function invoke(method, path, body) {
    var qIdx = path.indexOf("?");
    var pathname = qIdx === -1 ? path : path.slice(0, qIdx);
    var search = qIdx === -1 ? "" : path.slice(qIdx);
    var found = findRoute(method, pathname);
    if (!found) return fail(404, "No such admin route: " + method + " " + pathname);
    if (!found.route.anon && !Session.valid()) return fail(401, "Unauthorized");
    try {
      return found.route.handler({ params: found.params, query: parseQuery(search), body: body });
    } catch (e) {
      // a handler bug should read as a real 500 in the demo panel, not
      // silently swallow — but never leak the raw error message, exactly
      // like a real API wouldn't.
      return fail(500, "Internal error.");
    }
  }

  /* -----------------------------------------------------------------
     Public transport — latency, fault interception, 401 retry
  ----------------------------------------------------------------- */

  var onUnauthorized = null; // installed by app.js: function () -> Promise<boolean>

  function request(method, path, body) {
    return new Promise(function (resolve, reject) {
      var qIdx = path.indexOf("?");
      var pathname = qIdx === -1 ? path : path.slice(0, qIdx);
      var forced = window.AdminDB.faults.take(method, pathname);
      var delay = 140 + Math.random() * 260;
      setTimeout(function () {
        var env = forced
          ? fail(forced.status, forced.message || defaultFaultMessage(forced.status), forced.source)
          : invoke(method, path, body);
        if (env.success) {
          Session.touch();
          // Every route handler mutates the in-memory state object
          // directly (push/splice/Object.assign) rather than calling
          // persist() itself — that would mean remembering to do it in
          // every single handler in routes.js. Flushing once, here,
          // after every successful non-forced write is what actually
          // makes a save survive a page navigation, which every
          // multi-page flow in this mockup depends on.
          if (!forced && method !== "GET") window.AdminDB.persist();
          resolve(env);
        } else {
          reject(new ApiError(env));
        }
      }, delay);
    });
  }

  function defaultFaultMessage(status) {
    return (
      {
        401: "Unauthorized.",
        422: "Validation failed.",
        409: "Conflict.",
        429: Session.isLockedOut() ? Session.lockMessage() : "Too many requests.",
        501: "Not yet supported."
      }[status] || "Request failed."
    );
  }

  // Api.send is what every screen actually calls. It owns the §4.3
  // retry: `body` may be passed as a thunk (a zero-arg function) rather
  // than a plain value specifically so a retry after re-auth re-reads
  // the form as it exists AT RETRY TIME, not as it was when the
  // original request was first made.
  function send(method, path, body) {
    return request(method, path, typeof body === "function" ? body() : body).catch(function (err) {
      if (err.statusCode !== 401 || !onUnauthorized) throw err;
      return onUnauthorized().then(function (reauthed) {
        if (!reauthed) throw err;
        return request(method, path, typeof body === "function" ? body() : body);
      });
    });
  }

  return {
    ok: ok,
    fail: fail,
    ApiError: ApiError,
    Session: Session,
    route: route,
    request: request,
    send: send,
    me: function () {
      return send("GET", "/api/admin/auth/me");
    },
    set onUnauthorized(fn) {
      onUnauthorized = fn;
    },
    get onUnauthorized() {
      return onUnauthorized;
    }
  };
})();
