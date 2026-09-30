/*
  Admin mockup — shared UI primitives (PRD §6's inventory table): Field,
  DataTable, RepeatableList, Toolbar wiring, Modal, Toast, SplitPane
  structure, DirtyBadge. Plain DOM + string templates, matching every
  sibling mockup's convention — no framework, no build step.
*/

window.AdminUI = (function () {
  "use strict";

  function qs(sel, root) {
    return (root || document).querySelector(sel);
  }
  function qsa(sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  }

  function escapeHtml(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function formatDate(iso) {
    if (!iso) return "—";
    var d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
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

  /* -----------------------------------------------------------------
     Draft/publish adaptation — §7/§8. List and detail endpoints return
     raw rows carrying draftData verbatim; hasPendingDraft is ALWAYS
     derived here, never trusted from the server, reproducing the real
     asymmetry rather than smoothing over it.
  ----------------------------------------------------------------- */

  function adaptRow(row) {
    var hasPendingDraft = row.draftData !== null && row.draftData !== undefined;
    var eff = Object.assign({}, row, hasPendingDraft ? row.draftData : {});
    eff._hasPendingDraft = hasPendingDraft;
    eff._raw = row;
    return eff;
  }

  function dirtyBadgeHtml(hasPendingDraft) {
    return hasPendingDraft ? '<span class="dirty-badge">Unpublished changes</span>' : "";
  }

  function statusPillHtml(status) {
    return '<span class="status-pill status-pill--' + status + '">' + status + "</span>";
  }

  /* -----------------------------------------------------------------
     Toast
  ----------------------------------------------------------------- */

  var toastStack;
  function ensureToastStack() {
    if (toastStack) return toastStack;
    toastStack = document.createElement("div");
    toastStack.className = "toast-stack";
    toastStack.setAttribute("role", "status");
    toastStack.setAttribute("aria-live", "polite");
    document.body.appendChild(toastStack);
    return toastStack;
  }

  function toast(message, type) {
    var stack = ensureToastStack();
    var el = document.createElement("div");
    el.className = "toast" + (type ? " toast--" + type : "");
    el.textContent = message;
    stack.appendChild(el);
    requestAnimationFrame(function () {
      el.classList.add("is-visible");
    });
    setTimeout(function () {
      el.classList.remove("is-visible");
      setTimeout(function () {
        el.remove();
      }, 200);
    }, 3500);
  }

  /* -----------------------------------------------------------------
     Modal
  ----------------------------------------------------------------- */

  function modal(opts) {
    var overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    var box = document.createElement("div");
    box.className = "modal";
    box.setAttribute("role", "dialog");
    box.setAttribute("aria-modal", "true");
    if (opts.title) box.setAttribute("aria-label", opts.title);
    box.innerHTML =
      (opts.title ? "<h2>" + escapeHtml(opts.title) + "</h2>" : "") +
      (opts.bodyHtml || (opts.body ? "<p>" + escapeHtml(opts.body) + "</p>" : ""));
    overlay.appendChild(box);
    document.body.appendChild(overlay);

    function close() {
      overlay.remove();
      document.removeEventListener("keydown", onKey);
    }
    function onKey(e) {
      if (e.key === "Escape" && opts.dismissible !== false) close();
    }
    document.addEventListener("keydown", onKey);
    if (opts.dismissible !== false) {
      overlay.addEventListener("click", function (e) {
        if (e.target === overlay) close();
      });
    }

    if (opts.actions && opts.actions.length) {
      var actionsRow = document.createElement("div");
      actionsRow.className = "modal__actions";
      opts.actions.forEach(function (a) {
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "btn" + (a.variant ? " btn--" + a.variant : "");
        btn.textContent = a.label;
        btn.addEventListener("click", function () {
          a.onClick && a.onClick(close);
        });
        actionsRow.appendChild(btn);
      });
      box.appendChild(actionsRow);
    }

    var firstInput = qs("input, textarea, select, button", box);
    if (firstInput) firstInput.focus();

    return { close: close, box: box, overlay: overlay };
  }

  function confirmDialog(opts) {
    return new Promise(function (resolve) {
      var m = modal({
        title: opts.title || "Are you sure?",
        body: opts.message,
        dismissible: true,
        actions: [
          { label: opts.cancelLabel || "Cancel", onClick: function (close) { close(); resolve(false); } },
          { label: opts.confirmLabel || "Confirm", variant: opts.danger ? "danger" : "primary", onClick: function (close) { close(); resolve(true); } }
        ]
      });
      m.overlay.addEventListener("click", function (e) {
        if (e.target === m.overlay) resolve(false);
      });
    });
  }

  /* -----------------------------------------------------------------
     Field templates — Field/Label/FieldError + the controlled inputs
  ----------------------------------------------------------------- */

  function fieldHtml(opts) {
    // opts: {name, label, type, value, textarea, rows, options:[{value,label}], checked}
    var id = "f-" + opts.name.replace(/[^a-zA-Z0-9]/g, "-");
    var wrapClass = "field" + (opts.checkbox ? " field--checkbox" : "");
    var inner = "";
    if (opts.checkbox) {
      inner =
        '<input type="checkbox" id="' + id + '" data-field="' + opts.name + '"' + (opts.checked ? " checked" : "") + " />" +
        '<label for="' + id + '">' + escapeHtml(opts.label) + "</label>";
    } else if (opts.textarea) {
      inner =
        '<label for="' + id + '">' + escapeHtml(opts.label) + "</label>" +
        '<textarea id="' + id + '" data-field="' + opts.name + '"' + (opts.rows ? ' rows="' + opts.rows + '"' : "") + ">" +
        escapeHtml(opts.value) +
        "</textarea>" +
        '<div class="field__error" data-field-error="' + opts.name + '" hidden></div>';
    } else if (opts.select) {
      inner =
        '<label for="' + id + '">' + escapeHtml(opts.label) + "</label>" +
        '<select id="' + id + '" data-field="' + opts.name + '">' +
        opts.options
          .map(function (o) {
            return '<option value="' + escapeHtml(o.value) + '"' + (o.value === opts.value ? " selected" : "") + ">" + escapeHtml(o.label) + "</option>";
          })
          .join("") +
        "</select>" +
        '<div class="field__error" data-field-error="' + opts.name + '" hidden></div>';
    } else {
      inner =
        '<label for="' + id + '">' + escapeHtml(opts.label) + "</label>" +
        '<input type="' + (opts.type || "text") + '" id="' + id + '" data-field="' + opts.name + '" value="' + escapeHtml(opts.value) + '"' + (opts.readonly ? " readonly" : "") + " />" +
        '<div class="field__error" data-field-error="' + opts.name + '" hidden></div>';
    }
    return '<div class="' + wrapClass + '" data-field-wrap="' + opts.name + '">' + inner + "</div>";
  }

  function readForm(rootEl, keys) {
    var out = {};
    keys.forEach(function (k) {
      var el = qs('[data-field="' + k + '"]', rootEl);
      if (!el) return;
      out[k] = el.type === "checkbox" ? el.checked : el.value;
    });
    return out;
  }

  function clearFieldErrors(rootEl) {
    qsa("[data-field-wrap]", rootEl).forEach(function (w) {
      w.classList.remove("field--error");
    });
    qsa("[data-field-error]", rootEl).forEach(function (e) {
      e.hidden = true;
      e.textContent = "";
    });
    var banner = qs("[data-form-banner]", rootEl);
    if (banner) banner.remove();
  }

  // §10's error contract, applied generically: dot-paths with numeric
  // segments ("edges.0.to") address a RepeatableList row rather than a
  // flat field; a "_root" key is a form-level banner, not attached to
  // any input; a null `source` (400/404/409/429) renders `message` as
  // the banner and never crashes trying to iterate it.
  function applyFieldErrors(rootEl, apiError) {
    clearFieldErrors(rootEl);
    if (!apiError.source) {
      showFormBanner(rootEl, apiError.message);
      return;
    }
    var handledAny = false;
    Object.keys(apiError.source).forEach(function (key) {
      if (key === "_root") {
        showFormBanner(rootEl, apiError.source[key].join(" "));
        handledAny = true;
        return;
      }
      var wrap = qs('[data-field-wrap="' + key + '"]', rootEl);
      var errBox = qs('[data-field-error="' + key + '"]', rootEl);
      if (wrap && errBox) {
        wrap.classList.add("field--error");
        errBox.hidden = false;
        errBox.textContent = apiError.source[key].join(" ");
        handledAny = true;
        return;
      }
      // dot-path with a numeric segment: let the caller (a repeatable
      // list) claim it via a custom event, since the row DOM is
      // structure the caller owns, not this generic form reader.
      rootEl.dispatchEvent(new CustomEvent("admin:field-error", { detail: { path: key, messages: apiError.source[key] } }));
      handledAny = true;
    });
    if (!handledAny) showFormBanner(rootEl, apiError.message);
  }

  function showFormBanner(rootEl, message) {
    var existing = qs("[data-form-banner]", rootEl);
    if (existing) {
      existing.textContent = message;
      return;
    }
    var banner = document.createElement("div");
    banner.className = "form-banner";
    banner.setAttribute("data-form-banner", "");
    banner.setAttribute("role", "alert");
    banner.textContent = message;
    rootEl.insertBefore(banner, rootEl.firstChild);
  }

  /* -----------------------------------------------------------------
     RepeatableList — add/remove/reorder rows
  ----------------------------------------------------------------- */

  function repeatableList(container, items, renderRowFields, opts) {
    opts = opts || {};
    var list = items.slice();

    function render() {
      container.innerHTML = "";
      var wrap = document.createElement("div");
      wrap.className = "rlist";
      list.forEach(function (item, i) {
        var row = document.createElement("div");
        row.className = "rlist__row";
        row.dataset.index = i;
        var fields = document.createElement("div");
        fields.className = "rlist__row-fields";
        fields.innerHTML = renderRowFields(item, i);
        var removeBtn = document.createElement("button");
        removeBtn.type = "button";
        removeBtn.className = "rlist__row-remove";
        removeBtn.setAttribute("aria-label", "Remove row " + (i + 1));
        removeBtn.textContent = "×";
        removeBtn.addEventListener("click", function () {
          list.splice(i, 1);
          render();
        });
        row.appendChild(fields);
        row.appendChild(removeBtn);
        wrap.appendChild(row);
      });
      container.appendChild(wrap);
      var addBtn = document.createElement("button");
      addBtn.type = "button";
      addBtn.className = "btn btn--small rlist__add";
      addBtn.textContent = opts.addLabel || "+ Add row";
      addBtn.addEventListener("click", function () {
        list.push(opts.blank ? opts.blank() : {});
        render();
      });
      container.appendChild(addBtn);
    }

    render();

    return {
      getValues: function () {
        return qsa(".rlist__row", container).map(function (row) {
          var idx = Number(row.dataset.index);
          var out = Object.assign({}, list[idx]);
          qsa("[data-rfield]", row).forEach(function (el) {
            var key = el.dataset.rfield;
            out[key] = el.type === "checkbox" ? el.checked : el.value;
          });
          return out;
        });
      },
      setRowError: function (index, key, message) {
        var row = qs('.rlist__row[data-index="' + index + '"]', container);
        if (!row) return;
        var el = qs('[data-rfield="' + key + '"]', row);
        if (el) el.style.borderColor = "var(--danger)";
        var note = document.createElement("div");
        note.className = "field__error";
        note.textContent = message;
        row.appendChild(note);
      }
    };
  }

  /* -----------------------------------------------------------------
     DataTable — sortable-by-header, client-side filter, row click
  ----------------------------------------------------------------- */

  function dataTable(container, opts) {
    // opts: {columns:[{key,label,sortable}], rows, onRowClick, filterFn(row,q), emptyMessage}
    var sortKey = null;
    var sortDir = 1;
    var query = "";

    function matches(row) {
      if (!query) return true;
      return opts.filterFn(row, query.toLowerCase());
    }

    function sorted(rows) {
      if (!sortKey) return rows;
      var copy = rows.slice();
      copy.sort(function (a, b) {
        var av = a[sortKey],
          bv = b[sortKey];
        if (av == null) av = "";
        if (bv == null) bv = "";
        if (av < bv) return -1 * sortDir;
        if (av > bv) return 1 * sortDir;
        return 0;
      });
      return copy;
    }

    function render() {
      var rows = sorted(opts.rows.filter(matches));
      var html = '<div class="admin-toolbar-row">';
      html += '<input type="text" class="admin-filter-input" placeholder="' + (opts.filterPlaceholder || "Filter…") + '" value="' + escapeHtml(query) + '" data-table-filter />';
      if (opts.toolbarHtml) html += opts.toolbarHtml;
      html += "</div>";
      html += '<table class="data-table"><thead><tr>';
      opts.columns.forEach(function (col) {
        var ariaSort = sortKey === col.key ? (sortDir === 1 ? "ascending" : "descending") : "none";
        html += '<th data-sort-key="' + col.key + '" aria-sort="' + ariaSort + '">' + escapeHtml(col.label) + "</th>";
      });
      html += "</tr></thead><tbody>";
      if (!rows.length) {
        html += '<tr><td colspan="' + opts.columns.length + '" class="data-table__empty">' + (opts.emptyMessage || "Nothing here yet.") + "</td></tr>";
      } else {
        rows.forEach(function (row) {
          html += '<tr tabindex="0" data-row-id="' + row.id + '">';
          opts.columns.forEach(function (col) {
            html += "<td>" + (col.render ? col.render(row) : escapeHtml(row[col.key])) + "</td>";
          });
          html += "</tr>";
        });
      }
      html += "</tbody></table>";
      container.innerHTML = html;

      var filterInput = qs("[data-table-filter]", container);
      filterInput.addEventListener(
        "input",
        debounce(function () {
          query = filterInput.value;
          var caret = filterInput.selectionStart;
          render();
          var again = qs("[data-table-filter]", container);
          again.focus();
          again.setSelectionRange(caret, caret);
        }, 120)
      );
      qsa("th[data-sort-key]", container).forEach(function (th) {
        th.addEventListener("click", function () {
          var key = th.dataset.sortKey;
          if (sortKey === key) sortDir = -sortDir;
          else {
            sortKey = key;
            sortDir = 1;
          }
          render();
        });
      });
      qsa("tbody tr[data-row-id]", container).forEach(function (tr) {
        function activate() {
          var row = opts.rows.filter(function (r) { return String(r.id) === tr.dataset.rowId; })[0];
          opts.onRowClick(row);
        }
        tr.addEventListener("click", activate);
        tr.addEventListener("keydown", function (e) {
          if (e.key === "Enter") activate();
        });
      });
    }

    render();
    return {
      setRows: function (rows) {
        opts.rows = rows;
        render();
      }
    };
  }

  return {
    qs: qs,
    qsa: qsa,
    escapeHtml: escapeHtml,
    formatDate: formatDate,
    debounce: debounce,
    adaptRow: adaptRow,
    dirtyBadgeHtml: dirtyBadgeHtml,
    statusPillHtml: statusPillHtml,
    toast: toast,
    modal: modal,
    confirmDialog: confirmDialog,
    field: fieldHtml,
    readForm: readForm,
    clearFieldErrors: clearFieldErrors,
    applyFieldErrors: applyFieldErrors,
    showFormBanner: showFormBanner,
    repeatableList: repeatableList,
    dataTable: dataTable
  };
})();
