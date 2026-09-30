/*
  Admin mockup — resource handlers. One handler per real admin endpoint
  (PRD-frontend-admin.md, verified against apps/api/src/modules/** per its
  own §2/§16 discipline — this mockup follows the same PRD, not a fresh
  guess at the shape). Handlers return ONLY through Api.ok()/Api.fail() —
  they never build an envelope themselves, which is what makes envelope
  parsing and 401 handling genuinely centralized in api.js rather than
  centralized by convention.

  Version/publish rule, applied uniformly across every draftable type
  (projects, posts, diagrams) — stated once here since PRD §9 states it
  explicitly only for diagrams, but nothing about the mechanism is
  diagram-specific: version increments on every SAVE (draft or live);
  publish never bumps it, only sets publishedVersion = version.
*/

(function () {
  "use strict";

  var Api = window.Api;
  var DB = window.AdminDB;
  var ok = Api.ok;
  var fail = Api.fail;

  function clone(x) {
    return DB.clone(x);
  }

  function nowIso() {
    return new Date().toISOString();
  }

  function findIndex(list, id) {
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return i;
    return -1;
  }

  function findById(list, id) {
    var i = findIndex(list, id);
    return i === -1 ? null : list[i];
  }

  /* -----------------------------------------------------------------
     Draft/publish mechanics — shared by projects, posts, diagrams.
     "Editing a published entity never touches the live version" (§8):
     the write lands in draftData; editing a never-published entity
     writes straight to the real columns, since there's no live version
     to protect yet.
  ----------------------------------------------------------------- */

  var BOOKKEEPING_KEYS = {
    id: 1, status: 1, version: 1, publishedVersion: 1, draftData: 1,
    createdAt: 1, updatedAt: 1
  };

  function snapshotOf(row) {
    var snap = {};
    Object.keys(row).forEach(function (k) {
      if (!BOOKKEEPING_KEYS[k]) snap[k] = row[k];
    });
    return snap;
  }

  function effective(row) {
    return Object.assign({}, row, row.draftData || {});
  }

  function pushRevision(entityType, entityId, row) {
    DB.state.revisions.unshift({
      id: DB.nextId("rev"),
      entityType: entityType,
      entityId: entityId,
      // "you" — §1.2/§11, there is exactly one admin, ever
      authorId: "you",
      snapshot: snapshotOf(effective(row)),
      createdAt: nowIso()
    });
    if (DB.state.revisions.length > 200) DB.state.revisions.length = 200; // §11 hard cap
  }

  function writeEntity(entityType, row, patch) {
    pushRevision(entityType, row.id, row); // snapshot BEFORE the patch lands
    row.version = (row.version || 1) + 1;
    if (row.status === "published") {
      row.draftData = Object.assign({}, row.draftData || snapshotOf(row), patch);
    } else {
      Object.assign(row, patch);
    }
    row.updatedAt = nowIso();
  }

  function publishEntity(row) {
    if (row.draftData) {
      Object.assign(row, row.draftData);
      row.draftData = null;
    }
    row.status = "published";
    row.publishedVersion = row.version;
    row.updatedAt = nowIso();
  }

  function slugCollision(list, slug, ownId) {
    return list.some(function (r) {
      return r.id !== ownId && effective(r).slug === slug;
    });
  }

  /* -----------------------------------------------------------------
     Auth — §4
  ----------------------------------------------------------------- */

  Api.route("POST", "/api/admin/auth/login", function (req) {
    if (Api.Session.isLockedOut()) return fail(429, Api.Session.lockMessage());
    var body = req.body || {};
    if (!body.email || !body.password) {
      return fail(401, "Invalid email or password");
    }
    // demo convention (documented in notes.html): password "wrong"
    // deliberately fails, so the 401 path stays organically reachable
    // without needing the fault panel.
    if (body.password === "wrong") {
      Api.Session.registerFailedLogin();
      return fail(401, "Invalid email or password");
    }
    var challengeId = Api.Session.createChallenge(body.email);
    return ok("Challenge issued.", { challengeId: challengeId });
  }, { anon: true });

  Api.route("POST", "/api/admin/auth/totp", function (req) {
    var body = req.body || {};
    var result = Api.Session.verifyChallenge(body.challengeId, body.code);
    if (!result.ok) {
      if (result.reason === "expired" || result.reason === "used") {
        return fail(401, "Code expired — start over.");
      }
      Api.Session.registerFailedLogin();
      return fail(401, "Incorrect code.");
    }
    Api.Session.start(result.email);
    return ok("Signed in.");
  }, { anon: true });

  Api.route("POST", "/api/admin/auth/logout", function () {
    Api.Session.end();
    return ok("Logged out.", { loggedOut: true });
  }, { anon: true });

  Api.route("GET", "/api/admin/auth/me", function () {
    return ok("OK", { email: DB.session.email });
  });

  /* -----------------------------------------------------------------
     Projects + case-study sections — §7, §7.1, §8
  ----------------------------------------------------------------- */

  Api.route("GET", "/api/admin/projects", function () {
    return ok("OK", clone(DB.state.projects));
  });

  Api.route("GET", "/api/admin/projects/:id", function (req) {
    var row = findById(DB.state.projects, req.params.id);
    if (!row) return fail(404, "Project not found.");
    return ok("OK", clone(row));
  });

  Api.route("PUT", "/api/admin/projects/:id", function (req) {
    var row = findById(DB.state.projects, req.params.id);
    if (!row) return fail(404, "Project not found.");
    var patch = req.body || {};
    if (patch.slug) {
      var eff = effective(row);
      if (patch.slug !== eff.slug && slugCollision(DB.state.projects, patch.slug, row.id)) {
        // Staging a draft never checks slug uniqueness (§8) — only publish
        // does. Saving here is allowed even with a colliding slug.
      }
    }
    writeEntity("project", row, patch);
    return ok("Saved.", clone(row));
  });

  Api.route("PUT", "/api/admin/projects/:id/sections/:kind", function (req) {
    var row = findById(DB.state.projects, req.params.id);
    if (!row) return fail(404, "Project not found.");
    var kind = req.params.kind;
    if (["context", "constraints", "decisions", "outcome"].indexOf(kind) === -1) {
      return fail(400, "Unknown section kind.");
    }
    var eff = effective(row);
    var sections = Object.assign({}, eff.sections);
    sections[kind] = { kind: kind, value: req.body.value };
    writeEntity("project", row, { sections: sections });
    // A section write is also, structurally, a caseStudySection write —
    // recorded as its own revision so §11's "501 on caseStudySection
    // restore" path is something that really happened, not simulated.
    pushRevision("caseStudySection", row.id + ":" + kind, row);
    return ok("Section saved.", clone(row));
  });

  Api.route("POST", "/api/admin/projects/:id/publish", function (req) {
    var row = findById(DB.state.projects, req.params.id);
    if (!row) return fail(404, "Project not found.");
    var eff = effective(row);
    if (slugCollision(DB.state.projects, eff.slug, row.id)) {
      return fail(409, 'This slug is already used by another project — change it before publishing.', { slug: ["Slug already in use."] });
    }
    publishEntity(row);
    return ok("Published.", clone(row));
  });

  Api.route("DELETE", "/api/admin/projects/:id", function (req) {
    var idx = findIndex(DB.state.projects, req.params.id);
    if (idx === -1) return fail(404, "Project not found.");
    DB.state.projects.splice(idx, 1);
    return ok("Deleted.");
  });

  /* -----------------------------------------------------------------
     Diagrams — §9. Owner-scoped, one per (ownerType, ownerId).
  ----------------------------------------------------------------- */

  window.AdminValidate = {
    diagram: function (nodes, edges) {
      var errors = {};
      var ids = {};
      (nodes || []).forEach(function (n) {
        if (n.id) ids[n.id] = true;
      });
      (edges || []).forEach(function (e, i) {
        if (!ids[e.from]) {
          errors["edges." + i + ".from"] = ['Edge references a nonexistent node id "' + e.from + '".'];
        }
        if (!ids[e.to]) {
          errors["edges." + i + ".to"] = ['Edge references a nonexistent node id "' + e.to + '".'];
        }
      });
      return Object.keys(errors).length ? errors : null;
    }
  };

  Api.route("GET", "/api/admin/diagrams", function (req) {
    var ownerId = req.query.ownerId;
    var row = DB.state.diagrams.filter(function (d) {
      return d.ownerId === ownerId;
    })[0];
    if (!row) return fail(404, "No diagram for this owner.");
    return ok("OK", clone(row));
  });

  Api.route("PUT", "/api/admin/diagrams/:id", function (req) {
    var row = findById(DB.state.diagrams, req.params.id);
    if (!row) return fail(404, "Diagram not found.");
    var body = req.body || {};
    var errors = window.AdminValidate.diagram(body.nodes, body.edges);
    if (errors) return fail(422, "Validation failed.", errors);
    // §2 divergence #1 — textEquivalent is always server-computed here,
    // never accepted from the client payload even if one were sent.
    var textEquivalent = window.BlueprintDiagram.buildTextEquivalent({ nodes: body.nodes, edges: body.edges });
    writeEntity("diagram", row, { nodes: body.nodes, edges: body.edges, groups: body.groups || [], textEquivalent: textEquivalent });
    return ok("Saved.", clone(row));
  });

  Api.route("POST", "/api/admin/diagrams/:id/publish", function (req) {
    var row = findById(DB.state.diagrams, req.params.id);
    if (!row) return fail(404, "Diagram not found.");
    publishEntity(row);
    return ok("Published.", clone(row));
  });

  /* -----------------------------------------------------------------
     Posts — §7, shares A2's draft/publish mechanics
  ----------------------------------------------------------------- */

  Api.route("GET", "/api/admin/posts", function () {
    return ok("OK", clone(DB.state.posts));
  });

  Api.route("GET", "/api/admin/posts/:id", function (req) {
    var row = findById(DB.state.posts, req.params.id);
    if (!row) return fail(404, "Post not found.");
    return ok("OK", clone(row));
  });

  Api.route("PUT", "/api/admin/posts/:id", function (req) {
    var row = findById(DB.state.posts, req.params.id);
    if (!row) return fail(404, "Post not found.");
    writeEntity("post", row, req.body || {});
    return ok("Saved.", clone(row));
  });

  Api.route("POST", "/api/admin/posts/:id/publish", function (req) {
    var row = findById(DB.state.posts, req.params.id);
    if (!row) return fail(404, "Post not found.");
    var eff = effective(row);
    if (slugCollision(DB.state.posts, eff.slug, row.id)) {
      return fail(409, "This slug is already used by another post — change it before publishing.", { slug: ["Slug already in use."] });
    }
    publishEntity(row);
    return ok("Published.", clone(row));
  });

  Api.route("DELETE", "/api/admin/posts/:id", function (req) {
    var idx = findIndex(DB.state.posts, req.params.id);
    if (idx === -1) return fail(404, "Post not found.");
    DB.state.posts.splice(idx, 1);
    return ok("Deleted.");
  });

  /* -----------------------------------------------------------------
     Pages — §2, §7: no draft/publish, no revisions. Every write is
     immediately live.
  ----------------------------------------------------------------- */

  Api.route("GET", "/api/admin/pages", function () {
    return ok("OK", clone(DB.state.pages));
  });

  Api.route("GET", "/api/admin/pages/:id", function (req) {
    var row = findById(DB.state.pages, req.params.id);
    if (!row) return fail(404, "Page not found.");
    return ok("OK", clone(row));
  });

  Api.route("PUT", "/api/admin/pages/:id", function (req) {
    var row = findById(DB.state.pages, req.params.id);
    if (!row) return fail(404, "Page not found.");
    Object.assign(row, req.body || {});
    row.updatedAt = nowIso();
    return ok("Saved — this is already live.", clone(row));
  });

  /* -----------------------------------------------------------------
     Tags — flat CRUD, 409 on duplicate (label, kind)
  ----------------------------------------------------------------- */

  Api.route("GET", "/api/admin/tags", function () {
    return ok("OK", clone(DB.state.tags));
  });

  Api.route("POST", "/api/admin/tags", function (req) {
    var body = req.body || {};
    var dup = DB.state.tags.some(function (t) {
      return t.label.toLowerCase() === (body.label || "").toLowerCase() && t.kind === body.kind;
    });
    if (dup) return fail(409, "A tag with this label and kind already exists.");
    var row = { id: DB.nextId("tag"), label: body.label, kind: body.kind };
    DB.state.tags.push(row);
    return ok("Created.", clone(row));
  });

  Api.route("DELETE", "/api/admin/tags/:id", function (req) {
    var idx = findIndex(DB.state.tags, req.params.id);
    if (idx === -1) return fail(404, "Tag not found.");
    DB.state.tags.splice(idx, 1);
    return ok("Deleted.");
  });

  /* -----------------------------------------------------------------
     Media — §12
  ----------------------------------------------------------------- */

  Api.route("GET", "/api/admin/media", function () {
    return ok("OK", clone(DB.state.media));
  });

  var MEDIA_MAX_BYTES = 8 * 1024 * 1024;

  Api.route("POST", "/api/admin/media", function (req) {
    var body = req.body || {};
    if (!body.sniffedType) {
      return fail(422, "Validation failed.", { file: ["Unsupported or unrecognized file type."] });
    }
    if (body.size > MEDIA_MAX_BYTES) {
      return fail(422, "Validation failed.", { file: ["File exceeds the 8 MiB limit."] });
    }
    var row = {
      id: DB.nextId("media"),
      filename: body.filename,
      mimeType: body.sniffedType,
      size: body.size,
      dimensions: body.dimensions || null,
      derivatives: {},
      objectUrl: body.objectUrl || null, // in-memory only — see notes.html
      uploadedAt: nowIso()
    };
    DB.state.media.unshift(row);
    return ok("Uploaded.", clone(row));
  });

  Api.route("DELETE", "/api/admin/media/:id", function (req) {
    var idx = findIndex(DB.state.media, req.params.id);
    if (idx === -1) return fail(404, "Media not found.");
    DB.state.media.splice(idx, 1);
    return ok("Deleted.");
  });

  /* -----------------------------------------------------------------
     CV — §7.2. Singleton profile with no `data` key when absent;
     sections have no draft/publish and enforce profile-first ordering.
  ----------------------------------------------------------------- */

  Api.route("GET", "/api/admin/cv/profile", function () {
    if (!DB.state.cvProfile) return ok("No profile yet.");
    return ok("OK", clone(DB.state.cvProfile));
  });

  Api.route("POST", "/api/admin/cv/profile", function (req) {
    DB.state.cvProfile = Object.assign(
      { id: "cv-profile" },
      DB.state.cvProfile,
      req.body || {},
      { updatedAt: nowIso() }
    );
    return ok("Saved.", clone(DB.state.cvProfile));
  });

  // Mockup-only convenience, not part of PRD §6's real contract — the
  // real API has no unpublish/delete-profile endpoint. Exists so the
  // §7.2 first-run "Create CV profile" state is demonstrable on demand
  // instead of only at first-ever page load.
  Api.route("DELETE", "/api/admin/cv/profile", function () {
    DB.state.cvProfile = null;
    DB.state.cvSections = [];
    return ok("Profile cleared (demo reset).");
  });

  Api.route("GET", "/api/admin/cv/sections", function () {
    return ok("OK", clone(DB.state.cvSections));
  });

  Api.route("POST", "/api/admin/cv/sections", function (req) {
    if (!DB.state.cvProfile) {
      return fail(404, "Create the CV profile before adding sections");
    }
    var body = req.body || {};
    var row = Object.assign(
      { id: DB.nextId("cv-section"), order: DB.state.cvSections.length, visibility: "public" },
      body
    );
    DB.state.cvSections.push(row);
    return ok("Created.", clone(row));
  });

  Api.route("PUT", "/api/admin/cv/sections/:id", function (req) {
    var row = findById(DB.state.cvSections, req.params.id);
    if (!row) return fail(404, "Section not found.");
    Object.assign(row, req.body || {});
    return ok("Saved.", clone(row));
  });

  Api.route("DELETE", "/api/admin/cv/sections/:id", function (req) {
    var idx = findIndex(DB.state.cvSections, req.params.id);
    if (idx === -1) return fail(404, "Section not found.");
    DB.state.cvSections.splice(idx, 1);
    return ok("Deleted.");
  });

  /* -----------------------------------------------------------------
     Revisions — §11
  ----------------------------------------------------------------- */

  var RESTORABLE = { project: 1, post: 1, diagram: 1 };
  var COLLECTION_BY_TYPE = {
    project: "projects",
    post: "posts",
    diagram: "diagrams"
  };

  Api.route("GET", "/api/admin/revisions", function (req) {
    var list = DB.state.revisions;
    if (req.query.entityType) {
      list = list.filter(function (r) {
        return r.entityType === req.query.entityType;
      });
    }
    if (req.query.entityId) {
      list = list.filter(function (r) {
        return r.entityId === req.query.entityId;
      });
    }
    return ok("OK", clone(list.slice(0, 200)));
  });

  Api.route("POST", "/api/admin/revisions/:id/restore", function (req) {
    var rev = findById(DB.state.revisions, req.params.id);
    if (!rev) return fail(404, "Revision not found.");
    if (!RESTORABLE[rev.entityType]) {
      return fail(501, 'Restore is not yet supported for entity type "' + rev.entityType + '".');
    }
    var collection = DB.state[COLLECTION_BY_TYPE[rev.entityType]];
    var row = findById(collection, rev.entityId);
    if (!row) return fail(404, "Entity not found.");
    var patch = Object.assign({}, rev.snapshot);
    if (rev.entityType === "diagram") {
      patch.textEquivalent = window.BlueprintDiagram.buildTextEquivalent({ nodes: patch.nodes, edges: patch.edges });
    }
    writeEntity(rev.entityType, row, patch);
    // restore is additive history, not a rewind — it never republishes
    // directly, even if the entity is currently published (§11).
    return ok("Restored to draft — publish to make it live.", clone(row));
  });
})();
