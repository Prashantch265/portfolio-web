/*
  Admin mockup — seed data.
  Adapts window.SITE_DATA (mockups/schematic/assets/data.js, copied here as
  seed-content.js — same four real case studies, posts, CV, and diagram
  JSON already used by every public mockup) into admin row shapes.

  One deliberate simplification, stated once here rather than re-explained
  per file: PRD §7.1 gives each case-study section (context/constraints/
  decisions/outcome) its own PUT endpoint and implies its own draft state.
  This mockup stages all of a project's field edits — core fields AND
  section edits — into ONE draftData patch per project, publishing them
  together. It's a smaller state machine than four independently-draftable
  sections, but it doesn't change what §8's draft/publish contract *looks
  like* to the user, which is the thing this mockup exists to make
  inspectable. A caseStudySection revision is still written on every
  section-touching save (see db.js) so the §11 "501 on caseStudySection
  restore" path stays real, not simulated.
*/

window.AdminSeed = (function () {
  "use strict";

  var SEED_VERSION = 1;

  function nowIso() {
    return new Date().toISOString();
  }

  function buildProjects(content) {
    return content.projects.map(function (p, i) {
      return {
        id: "project-" + p.slug,
        slug: p.slug,
        title: p.title,
        kicker: p.kicker,
        summary: p.summary,
        years: p.years,
        featured: p.featured,
        order: i,
        stackTags: p.stack.slice(),
        diagramId: p.diagram ? "diagram-" + p.slug : null,
        sections: {
          context: { kind: "context", value: p.context },
          constraints: { kind: "constraints", value: p.constraints.slice() },
          decisions: {
            kind: "decisions",
            value: p.decisions.map(function (d) {
              return { heading: d.heading, body: d.body, emphasis: !!d.emphasis };
            })
          },
          outcome: { kind: "outcome", value: p.outcome }
        },
        status: "published",
        version: 1,
        publishedVersion: 1,
        draftData: null,
        createdAt: nowIso(),
        updatedAt: nowIso()
      };
    });
  }

  function buildDiagrams(content, projectRows) {
    var rows = [];
    projectRows.forEach(function (row) {
      if (!row.diagramId) return;
      var src =
        row.slug === "document-verification-platform"
          ? content.diagrams.realEstate
          : row.slug === "agent-platform"
          ? content.diagrams.agentPlatform
          : null;
      if (!src) return;
      rows.push({
        id: row.diagramId,
        ownerType: "project",
        ownerId: row.id,
        schemaVersion: src.schemaVersion,
        nodes: JSON.parse(JSON.stringify(src.nodes)),
        edges: JSON.parse(JSON.stringify(src.edges)),
        groups: [],
        // §2 divergence #1 — always server-computed, never a client input
        textEquivalent: window.BlueprintDiagram.buildTextEquivalent(src),
        status: "published",
        version: 1,
        publishedVersion: 1,
        draftData: null,
        createdAt: nowIso(),
        updatedAt: nowIso()
      });
    });
    return rows;
  }

  function buildPosts(content) {
    return content.posts.map(function (p) {
      return {
        id: "post-" + p.slug,
        slug: p.slug,
        title: p.title,
        summary: p.summary,
        // §14.3 — postSchema has no public `body` field yet; the admin
        // can author it anyway (real column, real endpoint), it just has
        // nowhere on the public site to render yet. Seed a plausible body
        // so the editor isn't demoing an empty textarea.
        body: p.summary + "\n\n(Full post body — authored here, not yet rendered on the public site; see PRD-frontend-admin.md §14.3.)",
        date: p.date,
        readingMinutes: p.readingMinutes,
        tags: p.tags.slice(),
        status: "published",
        version: 1,
        publishedVersion: 1,
        draftData: null,
        createdAt: nowIso(),
        updatedAt: nowIso()
      };
    });
  }

  function buildPages() {
    // No "page" content exists in seed-content.js — the public site's
    // pages content type (docs/README.md "now/uses/credentials") has no
    // fixture anywhere else in this project, so this is authored fresh,
    // matching that locked-decisions line rather than inventing new scope.
    return [
      {
        id: "page-now",
        slug: "now",
        title: "Now",
        body: "What I'm currently working on: the agent platform's retrieval layer, and this portfolio's own admin CMS.",
        updatedAt: nowIso()
      },
      {
        id: "page-uses",
        slug: "uses",
        title: "Uses",
        body: "Editor, terminal, and infra tooling I actually use day to day.",
        updatedAt: nowIso()
      },
      {
        id: "page-credentials",
        slug: "credentials",
        title: "Credentials",
        body: "Certifications and accomplishments — the public-safe subset also shown on the CV page.",
        updatedAt: nowIso()
      }
    ];
  }

  function buildTags(content) {
    var rows = [];
    var seen = {};
    function add(label, kind) {
      var key = kind + ":" + label;
      if (seen[key]) return;
      seen[key] = true;
      rows.push({ id: "tag-" + rows.length, label: label, kind: kind });
    }
    content.projects.forEach(function (p) {
      p.stack.forEach(function (s) {
        add(s, "project");
      });
    });
    content.posts.forEach(function (p) {
      p.tags.forEach(function (t) {
        add(t, "post");
      });
    });
    return rows;
  }

  function buildCv(content) {
    var cv = content.cv;
    var sections = [];
    var order = 0;
    function pushAll(kind, items, visibility) {
      items.forEach(function (it) {
        sections.push({
          id: "cv-section-" + sections.length,
          kind: kind,
          title: it.title,
          subtitle: it.subtitle || "",
          dates: it.dates || "",
          body: it.body || "",
          visibility: visibility,
          order: order++
        });
      });
    }
    pushAll("experience", cv.experience, "public");
    pushAll("education", cv.education, "public");
    // Arbitrary for this mockup only — demonstrates the visibility
    // toggle (§7.2); nothing about these two rows is actually sensitive.
    pushAll("certification", cv.certifications, "gated");
    pushAll("accomplishment", cv.accomplishments, "public");

    return {
      profile: {
        id: "cv-profile",
        headline: cv.headline,
        location: cv.location,
        yearsExperience: cv.yearsExperience,
        summary: cv.summary,
        updatedAt: nowIso()
      },
      sections: sections
    };
  }

  function build() {
    var content = window.SITE_DATA;
    var projects = buildProjects(content);
    var diagrams = buildDiagrams(content, projects);
    var posts = buildPosts(content);
    var pages = buildPages();
    var tags = buildTags(content);
    var cv = buildCv(content);

    return {
      seedVersion: SEED_VERSION,
      admin: { email: "prashantchy265@gmail.com" },
      projects: projects,
      diagrams: diagrams,
      posts: posts,
      pages: pages,
      tags: tags,
      cvProfile: cv.profile,
      cvSections: cv.sections,
      media: [],
      revisions: [],
      faults: [],
      // §6.2's statusStrip fixture, reused verbatim for the admin
      // dashboard's own build/deploy line.
      statusStrip: content.statusStrip
    };
  }

  return { SEED_VERSION: SEED_VERSION, build: build };
})();
