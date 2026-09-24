/*
  Ledger diagram renderer — PRD-frontend-ledger.md §5.
  Same schema and orthogonal-routing geometry as both sibling
  renderers. The structural difference: the annotation content is
  printed as an always-visible numbered footnote list below the
  figure (renderFootnotes), not gated behind hover — the optional
  hover/focus interaction (dim others, highlight active) still works
  for the visitor who wants it, bidirectionally synced with the
  footnote list. No entrance-animation code lives here at all: the
  one fade the whole direction allows is handled generically by
  app.js's initFadeIns() against any .fade-in element, diagrams
  included.
  Exposes window.BlueprintDiagram.mount(container, diagramData, opts).
*/

window.BlueprintDiagram = (function () {
  "use strict";

  var SVG_NS = "http://www.w3.org/2000/svg";
  var SUPERSCRIPT = ["", "¹", "²", "³", "⁴", "⁵", "⁶", "⁷", "⁸", "⁹", "¹⁰", "¹¹", "¹²"];

  var NODE_W = 156;
  var NODE_H = 54;
  var COL_W = 210;
  var ROW_H = 100;
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

  function drawNodeShape(g, node, box) {
    var w = NODE_W,
      h = NODE_H,
      x = box.left,
      y = box.top;

    el("rect", { x: x, y: y, width: w, height: h }, g);

    if (node.type === "datastore") {
      el("line", { class: "node-cap", x1: x, y1: y + 6, x2: x + w, y2: y + 6 }, g);
    }
  }

  function edgePath(a, b) {
    if (Math.abs(a.cy - b.cy) < 1) {
      var y = a.cy;
      var fromRight = a.cx < b.cx;
      var x1 = fromRight ? a.right : a.left;
      var x2 = fromRight ? b.left : b.right;
      return { d: "M " + x1 + " " + y + " L " + x2 + " " + y, mid: { x: (x1 + x2) / 2, y: y }, length: Math.abs(x2 - x1) };
    }
    if (Math.abs(a.cx - b.cx) < 1) {
      var x = a.cx;
      var fromBottom = a.cy < b.cy;
      var y1 = fromBottom ? a.bottom : a.top;
      var y2 = fromBottom ? b.top : b.bottom;
      return { d: "M " + x + " " + y1 + " L " + x + " " + y2, mid: { x: x, y: (y1 + y2) / 2 }, length: Math.abs(y2 - y1) };
    }
    var goingRight = a.cx < b.cx;
    var startX = goingRight ? a.right : a.left;
    var startY = a.cy;
    var endX = goingRight ? b.left : b.right;
    var endY = b.cy;
    var midX = (startX + endX) / 2;
    var d = "M " + startX + " " + startY + " L " + midX + " " + startY + " L " + midX + " " + endY + " L " + endX + " " + endY;
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
    var solid = el("marker", { id: "lg-arrow-solid", viewBox: "0 0 10 10", refX: "8", refY: "5", markerWidth: "7", markerHeight: "7", orient: "auto-start-reverse" }, defs);
    el("path", { d: "M 0 0 L 10 5 L 0 10 z", fill: "var(--ink-muted)" }, solid);
    var open = el("marker", { id: "lg-arrow-open", viewBox: "0 0 10 10", refX: "8", refY: "5", markerWidth: "7", markerHeight: "7", orient: "auto-start-reverse" }, defs);
    el("path", { d: "M 0 0 L 10 5 L 0 10", fill: "none", stroke: "var(--ink-muted)", "stroke-width": "1.5" }, open);
  }

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

  /* -----------------------------------------------------------------
     The always-visible footnote list — the structural difference.
  ----------------------------------------------------------------- */

  function renderFootnotes(container, data, syncState) {
    var html = '<p class="text-small diagram-footnotes__intro">Every element of this figure is described below, in the order it appears — hovering or selecting a node in the diagram above highlights its entry here, but reading the list top to bottom is the primary way to take this in.</p>';
    html += "<ol>";
    data.nodes.forEach(function (n, i) {
      html += '<li data-footnote-for="' + n.id + '">';
      html +=
        '<span class="diagram-footnotes__term">' +
        n.label +
        '</span> <span class="diagram-footnotes__type">— ' +
        TYPE_LABEL[n.type] +
        "</span>";
      html += '<div class="diagram-footnotes__block"><p>' + n.annotation.role + "</p></div>";
      if (n.annotation.reasoning) {
        html +=
          '<div class="diagram-footnotes__block"><span class="label diagram-footnotes__block-label">Why it’s shaped this way</span><p>' +
          n.annotation.reasoning +
          "</p></div>";
      }
      if (n.annotation.alternative) {
        html +=
          '<div class="diagram-footnotes__block"><span class="label diagram-footnotes__block-label">Alternative considered</span><p>' +
          n.annotation.alternative +
          "</p></div>";
      }
      html += "</li>";
    });
    html += "</ol>";
    container.innerHTML = html;

    if (syncState) {
      container.querySelectorAll("[data-footnote-for]").forEach(function (li) {
        li.addEventListener("mouseenter", function () {
          syncState.setActive(li.getAttribute("data-footnote-for"), false);
        });
        li.addEventListener("mouseleave", function () {
          if (!syncState.isPinned()) syncState.setActive(null, false);
        });
      });
    }
  }

  /* -----------------------------------------------------------------
     SVG renderer (>=768px) — no entrance-animation logic; everything
     renders in its final state immediately, per §6.
  ----------------------------------------------------------------- */

  function renderSVG(host, data, footnoteContainer) {
    host.innerHTML = "";

    var maxCol = 0,
      maxRow = 0;
    data.nodes.forEach(function (n) {
      if (n.col > maxCol) maxCol = n.col;
      if (n.row > maxRow) maxRow = n.row;
    });

    var width = MARGIN * 2 + maxCol * COL_W + NODE_W;
    var height = MARGIN * 2 + maxRow * ROW_H + NODE_H;

    var svg = el("svg", { viewBox: "0 0 " + width + " " + height, role: "group", "aria-label": "Architecture figure. The numbered list below describes every element.", preserveAspectRatio: "xMidYMid meet" }, host);

    ensureMarkers(svg);

    var boxes = {};
    data.nodes.forEach(function (n) {
      boxes[n.id] = nodeBox(n);
    });

    var edgeGroups = {};
    data.edges.forEach(function (e) {
      var a = boxes[e.from],
        b = boxes[e.to];
      var route = edgePath(a, b);
      var g = el("g", { class: "bp-edge-group" }, svg);

      var markerAttrs = {};
      var edgeClass = "bp-edge bp-edge--" + e.type;
      if (e.type === "sync") markerAttrs["marker-end"] = "url(#lg-arrow-solid)";
      if (e.type === "async") markerAttrs["marker-end"] = "url(#lg-arrow-open)";
      if (e.type === "data-write") markerAttrs["marker-end"] = "url(#lg-arrow-solid)";

      el("path", Object.assign({ class: edgeClass, d: route.d }, markerAttrs), g);

      if (e.type === "auth") {
        var lg = el("g", { class: "bp-edge-lock", transform: "translate(" + (route.mid.x - 4) + "," + (route.mid.y - 5) + ")" }, g);
        el("rect", { x: 0, y: 4, width: 8, height: 6, rx: 1 }, lg);
        el("path", { d: "M 1.5 4 L 1.5 2.5 A 2.5 2.5 0 0 1 6.5 2.5 L 6.5 4", fill: "none", stroke: "currentColor", "stroke-width": 1.2 }, lg);
      }

      if (e.label) {
        el("text", { class: "bp-edge-label", x: route.mid.x, y: route.mid.y - 6, "text-anchor": "middle" }, g).textContent = e.label;
      }

      edgeGroups[e.id] = g;
    });

    var nodeGroups = {};
    data.nodes.forEach(function (n, i) {
      var box = boxes[n.id];
      var g = el("g", { class: "bp-node bp-node--" + n.type, tabindex: "0", role: "button", "aria-label": n.label + ", " + TYPE_LABEL[n.type] + ", described in list item " + (i + 1) + " below" }, svg);

      drawNodeShape(g, n, box);

      el("text", { x: box.cx, y: box.cy + 4, "text-anchor": "middle" }, g).textContent = n.label;

      el("text", { class: "node-footnote", x: box.right - 6, y: box.top + 14, "text-anchor": "end" }, g).textContent = SUPERSCRIPT[i + 1] || String(i + 1);

      el("rect", { class: "bp-node-hit", x: box.left - 4, y: box.top - 4, width: Math.max(NODE_W + 8, 44), height: Math.max(NODE_H + 8, 44) }, g);

      nodeGroups[n.id] = g;
    });

    var state = { activeId: null, pinned: false };

    function setActive(id, pin) {
      if (pin !== undefined) state.pinned = pin;
      state.activeId = id;
      Object.keys(nodeGroups).forEach(function (nid) {
        var g = nodeGroups[nid];
        g.classList.toggle("is-active", nid === id);
        g.classList.toggle("is-dimmed", !!id && nid !== id);
      });
      Object.keys(edgeGroups).forEach(function (eid) {
        edgeGroups[eid].classList.toggle("is-dimmed", !!id);
      });
      if (footnoteContainer) {
        footnoteContainer.querySelectorAll("[data-footnote-for]").forEach(function (li) {
          li.classList.toggle("is-highlighted", li.getAttribute("data-footnote-for") === id);
        });
      }
    }

    var syncState = {
      setActive: setActive,
      isPinned: function () {
        return state.pinned;
      }
    };

    data.nodes.forEach(function (n) {
      var g = nodeGroups[n.id];
      function activate() {
        setActive(n.id, undefined);
      }
      function deactivate() {
        if (!state.pinned) setActive(null, undefined);
      }
      g.addEventListener("mouseenter", activate);
      g.addEventListener("mouseleave", deactivate);
      g.addEventListener("focus", activate);
      g.addEventListener("blur", deactivate);
      g.addEventListener("keydown", function (evt) {
        if (evt.key === "Enter" || evt.key === " ") {
          evt.preventDefault();
          setActive(n.id, true);
        } else if (evt.key === "Escape") {
          setActive(null, false);
        }
      });
      g.addEventListener("click", function () {
        setActive(n.id, !(state.pinned && state.activeId === n.id));
      });
    });

    setActive(null, false);

    host.addEventListener("keydown", function (evt) {
      if (evt.key === "Escape") setActive(null, false);
    });

    return syncState;
  }

  /* -----------------------------------------------------------------
     Linearized renderer (<768px)
  ----------------------------------------------------------------- */

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
      block.innerHTML = node.label + ' <span class="diagram-linear__type">— ' + TYPE_LABEL[node.type] + "</span>";
      wrap.appendChild(block);

      if (i < ordered.length - 1) {
        var next = ordered[i + 1];
        var e = edgeBetween(data, node.id, next.id);
        var connector = document.createElement("div");
        connector.className = "diagram-linear__connector";
        connector.textContent = e ? "↓ " + (EDGE_VERB[e.type] || "connects to") : "↓";
        wrap.appendChild(connector);
      }
    });

    host.appendChild(wrap);
  }

  /* -----------------------------------------------------------------
     Public mount
  ----------------------------------------------------------------- */

  function mount(rootEl, data, opts) {
    opts = opts || {};
    var canvasHost = rootEl.querySelector("[data-diagram-canvas]");
    var footnoteContainer = rootEl.querySelector("[data-diagram-footnotes]");

    function paint() {
      var isDesktop = window.matchMedia("(min-width: 768px)").matches;
      if (isDesktop) {
        var syncState = renderSVG(canvasHost, data, footnoteContainer);
        if (footnoteContainer) renderFootnotes(footnoteContainer, data, syncState);
      } else {
        renderLinearized(canvasHost, data);
        if (footnoteContainer) renderFootnotes(footnoteContainer, data, null);
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
