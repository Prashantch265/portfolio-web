/*
  Blueprint diagram renderer — PRD-frontend.md §5.
  Diagrams are data (nodes/edges/annotations JSON), rendered here into
  either an orthogonal-routed SVG (>=768px) or a linearized, vertically
  stacked node list (<768px) — same JSON, two renderers, per §5.7.
  Exposes window.BlueprintDiagram.mount(container, diagramData, opts).
*/

window.BlueprintDiagram = (function () {
  "use strict";

  var SVG_NS = "http://www.w3.org/2000/svg";

  var NODE_W = 152;
  var NODE_H = 56;
  var COL_W = 208;
  var ROW_H = 104;
  var MARGIN = 40;

  var TYPE_LABEL = {
    service: "Service",
    datastore: "Datastore",
    queue: "Workflow / queue",
    external: "External",
    client: "Client"
  };

  var EDGE_VERB = {
    sync: "calls",
    async: "sends an asynchronous event to",
    "data-read": "reads data from",
    "data-write": "reads and writes data to",
    auth: "checks authorization against"
  };

  function el(tag, attrs, parent) {
    var node = document.createElementNS(SVG_NS, tag);
    for (var k in attrs) {
      if (Object.prototype.hasOwnProperty.call(attrs, k)) {
        node.setAttribute(k, attrs[k]);
      }
    }
    if (parent) parent.appendChild(node);
    return node;
  }

  // greedy word-wrap so long labels (e.g. "Agent Execution Runtimes")
  // stay inside the node box instead of overflowing past its edges
  // into the incoming edge's arrowhead
  function wrapLabel(label, maxChars) {
    var words = label.split(" ");
    var lines = [];
    var cur = "";
    words.forEach(function (w) {
      var test = cur ? cur + " " + w : w;
      if (test.length > maxChars && cur) {
        lines.push(cur);
        cur = w;
      } else {
        cur = test;
      }
    });
    if (cur) lines.push(cur);
    return lines;
  }

  function drawNodeLabel(g, box, label) {
    var maxChars = 17;
    var lineHeight = 14;
    var lines = wrapLabel(label, maxChars);
    var startY = box.cy + 4 - ((lines.length - 1) * lineHeight) / 2;
    var textEl = el("text", { x: box.cx, y: startY, "text-anchor": "middle" }, g);
    lines.forEach(function (line, idx) {
      var tspan = document.createElementNS(SVG_NS, "tspan");
      tspan.setAttribute("x", box.cx);
      tspan.setAttribute("dy", idx === 0 ? 0 : lineHeight);
      tspan.textContent = line;
      textEl.appendChild(tspan);
    });
  }

  function nodeById(data, id) {
    for (var i = 0; i < data.nodes.length; i++) {
      if (data.nodes[i].id === id) return data.nodes[i];
    }
    return null;
  }

  function nodeCenter(node) {
    return {
      x: MARGIN + node.col * COL_W + NODE_W / 2,
      y: MARGIN + node.row * ROW_H + NODE_H / 2
    };
  }

  function nodeBox(node) {
    return {
      left: MARGIN + node.col * COL_W,
      top: MARGIN + node.row * ROW_H,
      right: MARGIN + node.col * COL_W + NODE_W,
      bottom: MARGIN + node.row * ROW_H + NODE_H,
      cx: MARGIN + node.col * COL_W + NODE_W / 2,
      cy: MARGIN + node.row * ROW_H + NODE_H / 2
    };
  }

  /* ---------------------------------------------------------------
     Node shapes — §5.2
  --------------------------------------------------------------- */

  function drawNodeShape(g, node, box) {
    var w = NODE_W,
      h = NODE_H,
      x = box.left,
      y = box.top;

    if (node.type === "client") {
      el("rect", { x: x, y: y, width: w, height: h, rx: 2, ry: 2 }, g);
      return;
    }

    if (node.type === "datastore") {
      el("rect", { x: x, y: y, width: w, height: h }, g);
      el(
        "line",
        { class: "node-cap", x1: x, y1: y + 6, x2: x + w, y2: y + 6 },
        g
      );
      return;
    }

    if (node.type === "external") {
      // cut sized against node height (not a fixed small px) so it
      // stays legible at the diagram's actual render scale — an 8px
      // cut against a ~150px box reads as a rendering glitch, not a
      // deliberate corner treatment
      var cut = 18;
      var pts = [
        [x, y],
        [x + w - cut, y],
        [x + w, y + cut],
        [x + w, y + h],
        [x, y + h]
      ]
        .map(function (p) {
          return p[0] + "," + p[1];
        })
        .join(" ");
      el("polygon", { class: "node-shape", points: pts }, g);
      return;
    }

    // service and queue share the base rect; queue gets a dashed
    // stroke via CSS (.bp-node--queue rect), service gets a corner
    // tick mark
    el("rect", { x: x, y: y, width: w, height: h }, g);

    if (node.type === "service") {
      el(
        "line",
        { class: "node-tick", x1: x, y1: y, x2: x + 10, y2: y },
        g
      );
      el(
        "line",
        { class: "node-tick", x1: x, y1: y, x2: x, y2: y + 10 },
        g
      );
    }
  }

  /* ---------------------------------------------------------------
     Orthogonal edge routing — §5.4. Horizontal/vertical segments
     only, never diagonal.
  --------------------------------------------------------------- */

  function edgePath(a, b) {
    var boxA = a,
      boxB = b;

    // same row: straight horizontal segment, edge-to-edge
    if (Math.abs(boxA.cy - boxB.cy) < 1) {
      var y = boxA.cy;
      var fromRight = boxA.cx < boxB.cx;
      var x1 = fromRight ? boxA.right : boxA.left;
      var x2 = fromRight ? boxB.left : boxB.right;
      return {
        d: "M " + x1 + " " + y + " L " + x2 + " " + y,
        mid: { x: (x1 + x2) / 2, y: y },
        length: Math.abs(x2 - x1)
      };
    }

    // same column: straight vertical segment
    if (Math.abs(boxA.cx - boxB.cx) < 1) {
      var x = boxA.cx;
      var fromBottom = boxA.cy < boxB.cy;
      var y1 = fromBottom ? boxA.bottom : boxA.top;
      var y2 = fromBottom ? boxB.top : boxB.bottom;
      return {
        d: "M " + x + " " + y1 + " L " + x + " " + y2,
        mid: { x: x, y: (y1 + y2) / 2 },
        length: Math.abs(y2 - y1)
      };
    }

    // general case: Z-shaped Manhattan route — exit horizontally,
    // bend vertically at the midpoint, enter horizontally
    var goingRight = boxA.cx < boxB.cx;
    var startX = goingRight ? boxA.right : boxA.left;
    var startY = boxA.cy;
    var endX = goingRight ? boxB.left : boxB.right;
    var endY = boxB.cy;
    var midX = (startX + endX) / 2;

    var d =
      "M " +
      startX +
      " " +
      startY +
      " L " +
      midX +
      " " +
      startY +
      " L " +
      midX +
      " " +
      endY +
      " L " +
      endX +
      " " +
      endY;

    return {
      d: d,
      // label sits on the vertical trunk (plenty of clearance there)
      // but at the TARGET's own row, not the average of start/end —
      // that's what spreads labels from a fanned-out source (one
      // source, several vertically-stacked targets) apart by row
      // instead of clustering them at a shared midpoint. Placing it on
      // the horizontal run into the target instead would put it too
      // close to the node — the column gap is narrow enough that the
      // opaque node fill paints over most of the label text.
      mid: { x: midX, y: endY },
      length: Math.abs(midX - startX) + Math.abs(endY - startY) + Math.abs(endX - midX)
    };
  }

  function ensureMarkers(svg) {
    var defs = el("defs", {}, svg);

    var solid = el(
      "marker",
      {
        id: "bp-arrow-solid",
        viewBox: "0 0 10 10",
        refX: "8",
        refY: "5",
        markerWidth: "7",
        markerHeight: "7",
        orient: "auto-start-reverse"
      },
      defs
    );
    el(
      "path",
      { d: "M 0 0 L 10 5 L 0 10 z", fill: "var(--ink-muted)" },
      solid
    );

    var open = el(
      "marker",
      {
        id: "bp-arrow-open",
        viewBox: "0 0 10 10",
        refX: "8",
        refY: "5",
        markerWidth: "7",
        markerHeight: "7",
        orient: "auto-start-reverse"
      },
      defs
    );
    el(
      "path",
      {
        d: "M 0 0 L 10 5 L 0 10",
        fill: "none",
        stroke: "var(--ink-muted)",
        "stroke-width": "1.5"
      },
      open
    );
  }

  /* ---------------------------------------------------------------
     Text equivalent — §5.6, required, drives both the disclosure
     panel and the linearized renderer's accessible structure.
  --------------------------------------------------------------- */

  function buildTextEquivalent(data) {
    var nodeLines = data.nodes.map(function (n) {
      var parts = [TYPE_LABEL[n.type] + ".", n.annotation.role];
      if (n.annotation.reasoning) parts.push(n.annotation.reasoning);
      return { label: n.label, text: parts.join(" ") };
    });

    var edgeLines = data.edges.map(function (e) {
      var from = nodeById(data, e.from);
      var to = nodeById(data, e.to);
      var verb = EDGE_VERB[e.type] || "connects to";
      return from.label + " " + verb + " " + to.label + ".";
    });

    return { nodeLines: nodeLines, edgeLines: edgeLines };
  }

  /* ---------------------------------------------------------------
     Interaction + annotation panel (shared by SVG + linearized)
  --------------------------------------------------------------- */

  function renderAnnotation(panel, node) {
    if (!node) {
      panel.innerHTML =
        '<p class="bp-annotation__empty">Hover or select a node to see the decision behind it.</p>';
      return;
    }
    var html = "";
    html +=
      '<div class="label bp-annotation__type">' +
      TYPE_LABEL[node.type] +
      "</div>";
    html += '<div class="bp-annotation__title">' + node.label + "</div>";
    html +=
      '<div class="bp-annotation__block"><span class="label bp-annotation__block-label">Role</span><p>' +
      node.annotation.role +
      "</p></div>";
    if (node.annotation.reasoning) {
      html +=
        '<div class="bp-annotation__block"><span class="label bp-annotation__block-label">Why it’s shaped this way</span><p>' +
        node.annotation.reasoning +
        "</p></div>";
    }
    if (node.annotation.alternative) {
      html +=
        '<div class="bp-annotation__block"><span class="label bp-annotation__block-label">Alternative considered</span><p>' +
        node.annotation.alternative +
        "</p></div>";
    }
    panel.innerHTML = html;
  }

  /* ---------------------------------------------------------------
     SVG renderer (>=768px)
  --------------------------------------------------------------- */

  function renderSVG(host, data, panel) {
    host.innerHTML = "";

    var maxCol = 0,
      maxRow = 0;
    data.nodes.forEach(function (n) {
      if (n.col > maxCol) maxCol = n.col;
      if (n.row > maxRow) maxRow = n.row;
    });

    var width = MARGIN * 2 + maxCol * COL_W + NODE_W;
    var height = MARGIN * 2 + maxRow * ROW_H + NODE_H;

    var svg = el(
      "svg",
      {
        viewBox: "0 0 " + width + " " + height,
        role: "group",
        "aria-label": "Architecture diagram. Use the View as text control for a full description.",
        preserveAspectRatio: "xMidYMid meet"
      },
      host
    );

    ensureMarkers(svg);

    var boxes = {};
    data.nodes.forEach(function (n) {
      boxes[n.id] = nodeBox(n);
    });

    // edges first, under nodes
    var edgeGroups = {};
    var edgeAnimData = [];
    data.edges.forEach(function (e) {
      var a = boxes[e.from],
        b = boxes[e.to];
      var route = edgePath(a, b);
      var isAuth = e.type === "auth";
      // auth edges (dotted) fade in like before — a dotted line
      // "drawing itself" reads as a glitch, not a trace. Every other
      // edge type gets the pen-trace entrance instead (below).
      var g = el("g", { class: "bp-edge-group" + (isAuth ? " bp-edge-group--fade" : "") }, svg);

      var markerAttrs = {};
      var edgeClass = "bp-edge bp-edge--" + e.type;
      if (e.type === "sync") markerAttrs["marker-end"] = "url(#bp-arrow-solid)";
      if (e.type === "async") markerAttrs["marker-end"] = "url(#bp-arrow-open)";
      if (e.type === "data-write") markerAttrs["marker-end"] = "url(#bp-arrow-solid)";

      var pathAttrs = Object.assign({ class: edgeClass, d: route.d }, markerAttrs);
      var pathEl = el("path", pathAttrs, g);
      edgeAnimData.push({ el: pathEl, length: route.length, isAuth: isAuth, type: e.type, routeD: route.d });

      if (e.type === "auth") {
        // small lock glyph at the route midpoint
        var lg = el(
          "g",
          {
            class: "bp-edge-lock",
            transform: "translate(" + (route.mid.x - 4) + "," + (route.mid.y - 5) + ")"
          },
          g
        );
        el("rect", { x: 0, y: 4, width: 8, height: 6, rx: 1 }, lg);
        el(
          "path",
          { d: "M 1.5 4 L 1.5 2.5 A 2.5 2.5 0 0 1 6.5 2.5 L 6.5 4", fill: "none", stroke: "currentColor", "stroke-width": 1.2 },
          lg
        );
      }

      if (e.label) {
        el(
          "text",
          {
            class: "bp-edge-label",
            x: route.mid.x,
            y: route.mid.y - 6,
            "text-anchor": "middle"
          },
          g
        ).textContent = e.label;
      }

      edgeGroups[e.id] = g;
    });

    // nodes
    var nodeGroups = {};
    data.nodes.forEach(function (n, i) {
      var box = boxes[n.id];
      var g = el(
        "g",
        {
          class: "bp-node bp-node--" + n.type,
          tabindex: "0",
          role: "button",
          "aria-label": n.label + ", " + TYPE_LABEL[n.type],
          style: "--node-index:" + i
        },
        svg
      );

      drawNodeShape(g, n, box);
      drawNodeLabel(g, box, n.label);

      // generous hit target, >=44x44 regardless of visual node size
      el(
        "rect",
        {
          class: "bp-node-hit",
          x: box.left - 4,
          y: box.top - 4,
          width: Math.max(NODE_W + 8, 44),
          height: Math.max(NODE_H + 8, 44)
        },
        g
      );

      nodeGroups[n.id] = g;

      function activate() {
        setActive(n.id);
      }
      function deactivate() {
        if (!state.pinned) setActive(null);
      }

      g.addEventListener("mouseenter", activate);
      g.addEventListener("mouseleave", deactivate);
      g.addEventListener("focus", activate);
      g.addEventListener("blur", deactivate);
      g.addEventListener("keydown", function (evt) {
        if (evt.key === "Enter" || evt.key === " ") {
          evt.preventDefault();
          state.pinned = true;
          setActive(n.id);
        } else if (evt.key === "Escape") {
          state.pinned = false;
          setActive(null);
        }
      });
      g.addEventListener("click", function () {
        state.pinned = !state.pinned || state.activeId !== n.id;
        setActive(n.id);
      });
    });

    var state = { activeId: null, pinned: false };

    function setActive(id) {
      state.activeId = id;
      Object.keys(nodeGroups).forEach(function (nid) {
        var g = nodeGroups[nid];
        g.classList.toggle("is-active", nid === id);
        g.classList.toggle("is-dimmed", !!id && nid !== id);
      });
      Object.keys(edgeGroups).forEach(function (eid) {
        edgeGroups[eid].classList.toggle("is-dimmed", !!id);
      });
      renderAnnotation(panel, id ? nodeById(data, id) : null);
    }

    setActive(null);

    // System motion, §6 — node draw-in, edge trace-in, and a
    // continuous ambient flow-pulse, all gated by reduced-motion and
    // scoped to diagrams only (nothing else on the site animates
    // beyond the ≤120ms opacity/border-color rule).
    var reducedMotion =
      window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    var pulseAnimations = [];

    if (!reducedMotion) {
      // hide non-auth edges via stroke-dashoffset up front so the
      // trace-in has something to animate from; auth edges keep the
      // plain opacity fade (.bp-edge-group--fade) set up in CSS
      edgeAnimData.forEach(function (ed) {
        if (!ed.isAuth && ed.length > 0) {
          ed.el.style.strokeDasharray = String(ed.length);
          ed.el.style.strokeDashoffset = String(ed.length);
        }
      });

      // continuous flow-pulse: a small dot riding the edge's own path
      // via the CSS motion-path spec, looping only while the diagram
      // is actually on screen (paused otherwise, see pulseIO below)
      if (CSS && CSS.supports && CSS.supports("offset-path", "path('M0 0')")) {
        edgeAnimData.forEach(function (ed) {
          if (ed.isAuth || ed.length <= 0) return;
          var pulse = el("circle", { r: 3, class: "bp-edge-pulse bp-edge-pulse--" + ed.type }, svg);
          pulse.style.offsetPath = "path('" + ed.routeD + "')";
          pulse.style.offsetRotate = "0deg";
          var speed = 70; // px/sec — slow and calm, a heartbeat, not a race
          var duration = Math.max(1400, (ed.length / speed) * 1000);
          var anim = pulse.animate(
            [{ offsetDistance: "0%" }, { offsetDistance: "100%" }],
            {
              duration: duration,
              iterations: Infinity,
              easing: "linear",
              direction: ed.type === "data-read" ? "reverse" : "normal"
            }
          );
          anim.pause();
          pulseAnimations.push(anim);
        });
      }
    }

    // one-shot entrance: node draw-in (CSS, existing) + edge trace-in
    // (WAAPI, since each edge's length differs)
    function playEntrance() {
      svg.classList.add("is-visible");
      if (reducedMotion) return;
      edgeAnimData.forEach(function (ed, idx) {
        if (ed.isAuth || ed.length <= 0) return;
        var delay = idx * 40 + 200;
        ed.el.animate(
          [{ strokeDashoffset: String(ed.length) }, { strokeDashoffset: "0" }],
          {
            duration: Math.max(300, ed.length * 1.2),
            delay: delay,
            easing: "cubic-bezier(0.2,0,0,1)",
            fill: "forwards"
          }
        );
      });
    }

    if (!window.matchMedia || !("IntersectionObserver" in window)) {
      // no visibility detection available — play immediately rather
      // than leave the pulses paused forever
      playEntrance();
      pulseAnimations.forEach(function (a) {
        a.play();
      });
    } else {
      var entranceIO = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              playEntrance();
              entranceIO.disconnect();
            }
          });
        },
        { threshold: 0.2 }
      );
      entranceIO.observe(svg);

      // persistent: the flow-pulse runs only while the diagram is
      // actually in the viewport, paused otherwise
      if (pulseAnimations.length) {
        var pulseIO = new IntersectionObserver(
          function (entries) {
            entries.forEach(function (entry) {
              pulseAnimations.forEach(function (a) {
                if (entry.isIntersecting) a.play();
                else a.pause();
              });
            });
          },
          { threshold: 0 }
        );
        pulseIO.observe(svg);
      }
    }

    // global Escape unpins even if focus has moved to the panel
    host.addEventListener("keydown", function (evt) {
      if (evt.key === "Escape") {
        state.pinned = false;
        setActive(null);
      }
    });
  }

  /* ---------------------------------------------------------------
     Linearized renderer (<768px) — §5.7. Same JSON, topologically
     ordered (source nodes first), tap to expand annotation.
  --------------------------------------------------------------- */

  function topoOrder(data) {
    var incoming = {};
    data.nodes.forEach(function (n) {
      incoming[n.id] = 0;
    });
    data.edges.forEach(function (e) {
      incoming[e.to] = (incoming[e.to] || 0) + 1;
    });
    var ordered = data.nodes.slice().sort(function (a, b) {
      return (incoming[a.id] || 0) - (incoming[b.id] || 0);
    });
    return ordered;
  }

  function edgeBetween(data, aId, bId) {
    for (var i = 0; i < data.edges.length; i++) {
      var e = data.edges[i];
      if (
        (e.from === aId && e.to === bId) ||
        (e.from === bId && e.to === aId)
      ) {
        return e;
      }
    }
    return null;
  }

  function renderLinearized(host, data) {
    host.innerHTML = "";
    var wrap = document.createElement("div");
    wrap.className = "diagram-linear";

    var ordered = topoOrder(data);

    ordered.forEach(function (node, i) {
      var block = document.createElement("div");
      block.className = "diagram-linear__node";
      block.dataset.open = "false";

      var head = document.createElement("button");
      head.type = "button";
      head.className = "diagram-linear__node-head";
      head.setAttribute("aria-expanded", "false");
      head.innerHTML =
        '<span><span class="diagram-linear__node-label">' +
        node.label +
        '</span> <span class="diagram-linear__node-type">— ' +
        TYPE_LABEL[node.type] +
        "</span></span>" +
        '<svg class="diagram-linear__chevron" width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M3 5 L7 9 L11 5" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>';

      var body = document.createElement("div");
      body.className = "diagram-linear__annotation";
      renderAnnotation(body, node);

      head.addEventListener("click", function () {
        var open = block.dataset.open === "true";
        block.dataset.open = open ? "false" : "true";
        head.setAttribute("aria-expanded", open ? "false" : "true");
      });

      block.appendChild(head);
      block.appendChild(body);
      wrap.appendChild(block);

      if (i < ordered.length - 1) {
        var next = ordered[i + 1];
        var e = edgeBetween(data, node.id, next.id);
        var connector = document.createElement("div");
        connector.className = "diagram-linear__connector";
        connector.textContent = e
          ? "↓ " + (EDGE_VERB[e.type] || "connects to")
          : "↓";
        wrap.appendChild(connector);
      }
    });

    host.appendChild(wrap);
  }

  /* ---------------------------------------------------------------
     Public mount — chooses renderer, wires text-equivalent toggle
  --------------------------------------------------------------- */

  function mount(rootEl, data, opts) {
    opts = opts || {};
    var canvasHost = rootEl.querySelector("[data-diagram-canvas]");
    var panel = rootEl.querySelector("[data-diagram-panel]");
    var textToggle = rootEl.querySelector("[data-diagram-text-toggle]");
    var textPanel = rootEl.querySelector("[data-diagram-text-panel]");

    function paint() {
      var isDesktop = window.matchMedia("(min-width: 768px)").matches;
      if (isDesktop) {
        renderSVG(canvasHost, data, panel);
      } else {
        renderAnnotation(panel, null);
        renderLinearized(canvasHost, data);
      }
    }

    paint();

    var lastState = window.matchMedia("(min-width: 768px)").matches;
    window.addEventListener("resize", debounce(function () {
      var nowDesktop = window.matchMedia("(min-width: 768px)").matches;
      if (nowDesktop !== lastState) {
        lastState = nowDesktop;
        paint();
      }
    }, 150));

    if (textToggle && textPanel) {
      var eq = buildTextEquivalent(data);
      var html = "<ol>";
      eq.nodeLines.forEach(function (n) {
        html += "<li><strong>" + n.label + "</strong> — " + n.text + "</li>";
      });
      html += "</ol>";
      html +=
        '<div class="diagram-text-equivalent__edges"><p class="label" style="margin-bottom:8px;">Connections</p><ol>';
      eq.edgeLines.forEach(function (line) {
        html += "<li>" + line + "</li>";
      });
      html += "</ol></div>";
      textPanel.innerHTML = html;

      textToggle.addEventListener("click", function () {
        var expanded = textToggle.getAttribute("aria-expanded") === "true";
        textToggle.setAttribute("aria-expanded", expanded ? "false" : "true");
        textPanel.hidden = expanded;
        textToggle.textContent = expanded ? "View as text" : "Hide text view";
      });
    }
  }

  function debounce(fn, ms) {
    var t;
    return function () {
      clearTimeout(t);
      var args = arguments;
      t = setTimeout(function () {
        fn.apply(null, args);
      }, ms);
    };
  }

  return { mount: mount, buildTextEquivalent: buildTextEquivalent };
})();
