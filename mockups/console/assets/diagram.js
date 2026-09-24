/*
  Console diagram renderer — PRD-frontend-console.md §5.
  Same schema and interaction model as the Blueprint renderer (nodes/
  edges/annotations JSON, orthogonal routing, hover/focus reveals the
  decision, required text equivalent, linearized mobile renderer) —
  re-skinned to terminal panes + piped edges, typewriter node reveal
  instead of fade+scale, no continuous per-edge pulse (that ambient
  claim lives in the status strip instead, §6.2).
  Exposes window.BlueprintDiagram.mount(container, diagramData, opts).
*/

window.BlueprintDiagram = (function () {
  "use strict";

  var SVG_NS = "http://www.w3.org/2000/svg";

  var NODE_W = 140;
  var NODE_H = 52;
  var COL_W = 200;
  var ROW_H = 100;
  var MARGIN = 40;

  var TYPE_LABEL = {
    service: "service",
    datastore: "datastore",
    queue: "workflow / queue",
    external: "external",
    client: "client"
  };

  var EDGE_VERB = {
    sync: "calls",
    async: "emits an async event to",
    "data-read": "reads from",
    "data-write": "writes to",
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

  function nodeById(data, id) {
    for (var i = 0; i < data.nodes.length; i++) {
      if (data.nodes[i].id === id) return data.nodes[i];
    }
    return null;
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
     Node shapes — §5.2, terminal-pane treatment
  --------------------------------------------------------------- */

  function drawNodeShape(g, node, box) {
    var w = NODE_W,
      h = NODE_H,
      x = box.left,
      y = box.top;

    if (node.type === "external") {
      el("rect", { class: "node-shape", x: x, y: y, width: w, height: h }, g);
      return;
    }

    var rx = node.type === "client" ? 2 : 0;
    el("rect", { x: x, y: y, width: w, height: h, rx: rx, ry: rx }, g);

    if (node.type === "datastore") {
      // small stacked-disk glyph, top-left inside padding
      var gx = x + 8,
        gy = y + h / 2 - 6;
      el("line", { class: "node-disk", x1: gx, y1: gy, x2: gx + 10, y2: gy }, g);
      el("line", { class: "node-disk", x1: gx, y1: gy + 5, x2: gx + 10, y2: gy + 5 }, g);
      el("line", { class: "node-disk", x1: gx, y1: gy + 10, x2: gx + 10, y2: gy + 10 }, g);
    }

    if (node.type === "client") {
      // cursor-block glyph, echoes the monogram
      el(
        "rect",
        { class: "node-cursor", x: x + 8, y: y + h / 2 - 6, width: 4, height: 12 },
        g
      );
    }
  }

  function nodeLabelX(node, box) {
    if (node.type === "datastore") return box.left + 24;
    if (node.type === "client") return box.left + 18;
    return box.cx;
  }

  function nodeLabelAnchor(node) {
    return node.type === "datastore" || node.type === "client" ? "start" : "middle";
  }

  /* ---------------------------------------------------------------
     Orthogonal edge routing — §5.4, same geometry as Blueprint
  --------------------------------------------------------------- */

  function edgePath(a, b) {
    if (Math.abs(a.cy - b.cy) < 1) {
      var y = a.cy;
      var fromRight = a.cx < b.cx;
      var x1 = fromRight ? a.right : a.left;
      var x2 = fromRight ? b.left : b.right;
      return {
        d: "M " + x1 + " " + y + " L " + x2 + " " + y,
        mid: { x: (x1 + x2) / 2, y: y },
        length: Math.abs(x2 - x1)
      };
    }

    if (Math.abs(a.cx - b.cx) < 1) {
      var x = a.cx;
      var fromBottom = a.cy < b.cy;
      var y1 = fromBottom ? a.bottom : a.top;
      var y2 = fromBottom ? b.top : b.bottom;
      return {
        d: "M " + x + " " + y1 + " L " + x + " " + y2,
        mid: { x: x, y: (y1 + y2) / 2 },
        length: Math.abs(y2 - y1)
      };
    }

    var goingRight = a.cx < b.cx;
    var startX = goingRight ? a.right : a.left;
    var startY = a.cy;
    var endX = goingRight ? b.left : b.right;
    var endY = b.cy;
    var midX = (startX + endX) / 2;

    var d =
      "M " + startX + " " + startY + " L " + midX + " " + startY + " L " + midX + " " + endY + " L " + endX + " " + endY;

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
      { id: "cn-arrow-solid", viewBox: "0 0 10 10", refX: "8", refY: "5", markerWidth: "7", markerHeight: "7", orient: "auto-start-reverse" },
      defs
    );
    el("path", { d: "M 0 0 L 10 5 L 0 10 z", fill: "var(--ink-muted)" }, solid);

    var open = el(
      "marker",
      { id: "cn-arrow-open", viewBox: "0 0 10 10", refX: "8", refY: "5", markerWidth: "7", markerHeight: "7", orient: "auto-start-reverse" },
      defs
    );
    el("path", { d: "M 0 0 L 10 5 L 0 10", fill: "none", stroke: "var(--ink-muted)", "stroke-width": "1.5" }, open);
  }

  /* ---------------------------------------------------------------
     Text equivalent — §5.6, required
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
     Output pane (annotation) — appended log text
  --------------------------------------------------------------- */

  function renderAnnotation(panel, node) {
    if (!node) {
      panel.innerHTML = '<p class="bp-annotation__empty">$ hover or select a node to see the decision behind it_</p>';
      return;
    }
    var html = "";
    html += '<p class="bp-annotation__prompt">cat ' + node.label + "/README</p>";
    html += '<div class="bp-annotation__title">' + node.label + " — " + TYPE_LABEL[node.type] + "</div>";
    html +=
      '<div class="bp-annotation__block"><span class="bp-annotation__block-label">role</span><p>' +
      node.annotation.role +
      "</p></div>";
    if (node.annotation.reasoning) {
      html +=
        '<div class="bp-annotation__block"><span class="bp-annotation__block-label">why</span><p>' +
        node.annotation.reasoning +
        "</p></div>";
    }
    if (node.annotation.alternative) {
      html +=
        '<div class="bp-annotation__block"><span class="bp-annotation__block-label">rejected</span><p>' +
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
        "aria-label": "Architecture diagram. Use the text-equivalent control for a full description.",
        preserveAspectRatio: "xMidYMid meet"
      },
      host
    );

    ensureMarkers(svg);

    var boxes = {};
    data.nodes.forEach(function (n) {
      boxes[n.id] = nodeBox(n);
    });

    var edgeGroups = {};
    var edgeAnimData = [];
    data.edges.forEach(function (e) {
      var a = boxes[e.from],
        b = boxes[e.to];
      var route = edgePath(a, b);
      var isAuth = e.type === "auth";
      var g = el("g", { class: "bp-edge-group" + (isAuth ? " bp-edge-group--fade" : "") }, svg);

      var markerAttrs = {};
      var edgeClass = "bp-edge bp-edge--" + e.type;
      if (e.type === "sync") markerAttrs["marker-end"] = "url(#cn-arrow-solid)";
      if (e.type === "async") markerAttrs["marker-end"] = "url(#cn-arrow-open)";
      if (e.type === "data-write") markerAttrs["marker-end"] = "url(#cn-arrow-solid)";

      var pathAttrs = Object.assign({ class: edgeClass, d: route.d }, markerAttrs);
      var pathEl = el("path", pathAttrs, g);
      edgeAnimData.push({ el: pathEl, length: route.length, isAuth: isAuth });

      if (e.type === "auth") {
        var lg = el(
          "g",
          { class: "bp-edge-lock", transform: "translate(" + (route.mid.x - 4) + "," + (route.mid.y - 5) + ")" },
          g
        );
        el("rect", { x: 0, y: 4, width: 8, height: 6, rx: 1 }, lg);
        el("path", { d: "M 1.5 4 L 1.5 2.5 A 2.5 2.5 0 0 1 6.5 2.5 L 6.5 4", fill: "none", stroke: "currentColor", "stroke-width": 1.2 }, lg);
      }

      if (e.label) {
        el(
          "text",
          { class: "bp-edge-label", x: route.mid.x, y: route.mid.y - 6, "text-anchor": "middle" },
          g
        ).textContent = e.label;
      }

      edgeGroups[e.id] = g;
    });

    var nodeGroups = {};
    var typewriterData = [];
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

      var textEl = el(
        "text",
        { x: nodeLabelX(n, box), y: box.cy + 4, "text-anchor": nodeLabelAnchor(n) },
        g
      );
      typewriterData.push({ el: textEl, full: n.label, index: i });

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

    var reducedMotion =
      window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (!reducedMotion) {
      // hide non-auth edges via dashoffset until the entrance trigger
      edgeAnimData.forEach(function (ed) {
        if (!ed.isAuth && ed.length > 0) {
          ed.el.style.strokeDasharray = String(ed.length);
          ed.el.style.strokeDashoffset = String(ed.length);
        }
      });
    } else {
      // reduced motion: labels render immediately, full text, no typing
      typewriterData.forEach(function (td) {
        td.el.textContent = td.full;
      });
    }

    function typeLabel(td) {
      var cps = 40;
      var i = 0;
      var interval = setInterval(function () {
        i++;
        td.el.textContent = td.full.slice(0, i);
        if (i >= td.full.length) clearInterval(interval);
      }, 1000 / cps);
    }

    function playEntrance() {
      svg.classList.add("is-visible");
      if (reducedMotion) return;
      typewriterData.forEach(function (td) {
        setTimeout(function () {
          typeLabel(td);
        }, td.index * 150 + 160);
      });
      edgeAnimData.forEach(function (ed, idx) {
        if (ed.isAuth || ed.length <= 0) return;
        var delay = idx * 150 + 320;
        ed.el.animate(
          [{ strokeDashoffset: String(ed.length) }, { strokeDashoffset: "0" }],
          { duration: Math.max(250, ed.length), delay: delay, easing: "cubic-bezier(0.2,0,0,1)", fill: "forwards" }
        );
      });
    }

    if (!window.matchMedia || !("IntersectionObserver" in window)) {
      playEntrance();
    } else {
      var io = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              playEntrance();
              io.disconnect();
            }
          });
        },
        { threshold: 0.2 }
      );
      io.observe(svg);
    }

    host.addEventListener("keydown", function (evt) {
      if (evt.key === "Escape") {
        state.pinned = false;
        setActive(null);
      }
    });
  }

  /* ---------------------------------------------------------------
     Linearized renderer (<768px) — §5.7
  --------------------------------------------------------------- */

  function topoOrder(data) {
    var incoming = {};
    data.nodes.forEach(function (n) {
      incoming[n.id] = 0;
    });
    data.edges.forEach(function (e) {
      incoming[e.to] = (incoming[e.to] || 0) + 1;
    });
    return data.nodes.slice().sort(function (a, b) {
      return (incoming[a.id] || 0) - (incoming[b.id] || 0);
    });
  }

  function edgeBetween(data, aId, bId) {
    for (var i = 0; i < data.edges.length; i++) {
      var e = data.edges[i];
      if ((e.from === aId && e.to === bId) || (e.from === bId && e.to === aId)) return e;
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
        connector.textContent = e ? "-> " + (EDGE_VERB[e.type] || "connects to") : "->";
        wrap.appendChild(connector);
      }
    });

    host.appendChild(wrap);
  }

  /* ---------------------------------------------------------------
     Public mount
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
    window.addEventListener(
      "resize",
      debounce(function () {
        var nowDesktop = window.matchMedia("(min-width: 768px)").matches;
        if (nowDesktop !== lastState) {
          lastState = nowDesktop;
          paint();
        }
      }, 150)
    );

    if (textToggle && textPanel) {
      var eq = buildTextEquivalent(data);
      var html = "<ol>";
      eq.nodeLines.forEach(function (n) {
        html += "<li><strong>" + n.label + "</strong> — " + n.text + "</li>";
      });
      html += "</ol>";
      html += '<div class="diagram-text-equivalent__edges"><p style="margin-bottom:8px;color:var(--ink-muted);">connections</p><ol>';
      eq.edgeLines.forEach(function (line) {
        html += "<li>" + line + "</li>";
      });
      html += "</ol></div>";
      textPanel.innerHTML = html;

      textToggle.addEventListener("click", function () {
        var expanded = textToggle.getAttribute("aria-expanded") === "true";
        textToggle.setAttribute("aria-expanded", expanded ? "false" : "true");
        textPanel.hidden = expanded;
        textToggle.textContent = expanded ? "cat --text" : "hide text view";
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
