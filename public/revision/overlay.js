(function () {
  if (window.__printitRevisionOverlay) return;
  window.__printitRevisionOverlay = true;

  var WELCOME_KEY = "printit_revision_welcome_done";
  var SEEN_KEY = "printit_revision_last_seen_update";
  var STEPS = [
    {
      kicker: "Bienvenida",
      title: "Este es el catálogo",
      body: "Navega como siempre. El diseño es el de PRINT IT; aquí solo están las herramientas para revisarlo.",
    },
    {
      kicker: "Notas",
      title: "Deja una nota en el punto exacto",
      body: "Pulsa Añadir nota y después toca el lugar de la página. En el panel puedes verla, corregirla o borrarla.",
    },
    {
      kicker: "Novedades",
      title: "Te avisamos si algo cambia",
      body: "Novedades lleva un punto cuando el catálogo se ha actualizado. Ábrelo cuando quieras ver qué hay de nuevo.",
    },
  ];

  var host = document.createElement("div");
  host.id = "printit-rev-root";
  var shadow = host.attachShadow({ mode: "open" });
  var sheetLink = document.createElement("link");
  sheetLink.rel = "stylesheet";
  sheetLink.href = "/revision/overlay.css?v=4";
  shadow.appendChild(sheetLink);
  document.documentElement.appendChild(host);

  var marks = document.createElement("div");
  marks.id = "printit-rev-marks";
  marks.style.cssText = "position:absolute;top:0;left:0;width:100%;pointer-events:none;z-index:2147482000;";
  document.documentElement.appendChild(marks);
  var markerStyle = document.createElement("style");
  markerStyle.textContent =
    "#printit-rev-marks{font-family:Montserrat,system-ui,sans-serif}" +
    "#printit-rev-marks .printit-rev-marker{position:absolute;width:44px;height:44px;margin:-22px 0 0 -22px;border:0;padding:0;background:transparent;cursor:pointer;pointer-events:auto}" +
    "#printit-rev-marks .printit-rev-dot{position:absolute;left:15px;top:15px;width:14px;height:14px;border-radius:50%;background:#00b4d8;border:2px solid #fff;box-shadow:0 4px 12px rgba(0,0,0,.28)}" +
    "#printit-rev-marks .printit-rev-num{position:absolute;left:22px;top:0;min-width:16px;height:16px;padding:0 4px;background:#111113;color:#fff;font-size:10px;display:flex;align-items:center;justify-content:center}";
  document.head.appendChild(markerStyle);

  var notes = [];
  var picking = false;
  var sheetOpen = false;
  var activeId = "";
  var guide = null;
  var composer = null;
  var toastTimer = 0;
  var pointer = null;
  var swallowClick = false;

  var dock = el("div", "printit-rev-dock");
  var news = el("a", "printit-rev-tool");
  news.href = "/novedades";
  news.appendChild(document.createTextNode("Novedades"));
  var badge = el("span", "printit-rev-badge");
  badge.hidden = true;
  news.appendChild(badge);
  var notesBtn = el("button", "printit-rev-tool");
  notesBtn.type = "button";
  notesBtn.appendChild(document.createTextNode("Notas"));
  var count = el("span", "printit-rev-count");
  count.textContent = "0";
  notesBtn.appendChild(count);
  var fab = el("button", "printit-rev-tool printit-rev-fab");
  fab.type = "button";
  var fabLong = el("span", "printit-rev-long");
  var fabShort = el("span", "printit-rev-short");
  fab.appendChild(fabLong);
  fab.appendChild(fabShort);
  dock.appendChild(news);
  dock.appendChild(notesBtn);
  dock.appendChild(fab);
  shadow.appendChild(dock);

  var hint = el("div", "printit-rev-hint");
  hint.hidden = true;
  hint.textContent = "Toca el punto exacto de la página";
  shadow.appendChild(hint);

  var sheet = el("aside", "printit-rev-sheet");
  sheet.setAttribute("aria-label", "Notas de esta página");
  var sheetHead = el("div", "printit-rev-sheet-head");
  var sheetTitles = el("div");
  sheetTitles.innerHTML = '<p class="printit-rev-kicker">Esta página</p><h2 class="printit-rev-title">Notas</h2>';
  var sheetClose = mini("Cerrar", closeSheet);
  sheetHead.appendChild(sheetTitles);
  sheetHead.appendChild(sheetClose);
  var list = el("div", "printit-rev-list");
  sheet.appendChild(sheetHead);
  sheet.appendChild(list);
  shadow.appendChild(sheet);

  notesBtn.addEventListener("click", function () {
    sheetOpen = !sheetOpen;
    sheet.classList.toggle("is-open", sheetOpen);
    notesBtn.setAttribute("aria-expanded", sheetOpen ? "true" : "false");
  });
  fab.addEventListener("click", function () {
    setPicking(!picking);
  });

  document.addEventListener(
    "pointerdown",
    function (ev) {
      if (!picking) return;
      pointer = { x: ev.clientX, y: ev.clientY, id: ev.pointerId };
    },
    true
  );

  document.addEventListener(
    "pointerup",
    function (ev) {
      if (!picking || !pointer || pointer.id !== ev.pointerId) return;
      var dx = ev.clientX - pointer.x;
      var dy = ev.clientY - pointer.y;
      pointer = null;
      if (dx * dx + dy * dy > 144) return;
      if (insideChrome(ev.target)) return;
      ev.preventDefault();
      ev.stopPropagation();
      swallowClick = true;
      setPicking(false);
      openComposer({
        x: ev.pageX,
        y: ev.pageY,
        selector: cssPath(ev.target),
      });
    },
    true
  );

  document.addEventListener(
    "click",
    function (ev) {
      if (!swallowClick) return;
      swallowClick = false;
      ev.preventDefault();
      ev.stopPropagation();
    },
    true
  );

  document.addEventListener("keydown", function (ev) {
    if (ev.key !== "Escape") return;
    if (composer) closeComposer();
    else if (picking) setPicking(false);
    else if (guide) finishGuide();
  });

  window.addEventListener("resize", sizeMarks);
  syncTheme();
  new MutationObserver(syncTheme).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });
  setPicking(false);
  sizeMarks();
  loadNotes();
  loadBadge();
  maybeGuide();

  function setPicking(next) {
    picking = next;
    document.documentElement.classList.toggle("printit-rev-pick", picking);
    fab.classList.toggle("is-picking", picking);
    fabLong.textContent = picking ? "Cancelar" : "Añadir nota";
    fabShort.textContent = picking ? "Cancelar" : "Nota";
    hint.hidden = !picking;
    fab.setAttribute("aria-pressed", picking ? "true" : "false");
  }

  function closeSheet() {
    sheetOpen = false;
    sheet.classList.remove("is-open");
    notesBtn.setAttribute("aria-expanded", "false");
  }

  function loadNotes() {
    return fetch("/api/notes?pagina=" + encodeURIComponent(location.pathname))
      .then(function (r) {
        return r.json().then(function (body) {
          return { ok: r.ok, body: body };
        });
      })
      .then(function (res) {
        if (!res.ok) {
          toast(res.body.error || "No se han podido cargar las notas.");
          return;
        }
        notes = res.body.notes || [];
        count.textContent = String(notes.length);
        drawMarkers();
        drawList();
        sizeMarks();
      })
      .catch(function () {
        toast("No se han podido cargar las notas.");
      });
  }

  function loadBadge() {
    fetch("/api/updates")
      .then(function (r) {
        return r.json();
      })
      .then(function (data) {
        var newest = data.updates && data.updates[0] && data.updates[0].fecha;
        var seen = "";
        try {
          seen = localStorage.getItem(SEEN_KEY) || "";
        } catch (e) {
          seen = "";
        }
        badge.hidden = !newest || (seen && seen >= newest);
      })
      .catch(function () {
        badge.hidden = true;
      });
  }

  function ordered() {
    return notes.slice().sort(function (a, b) {
      return String(a.created_at).localeCompare(String(b.created_at));
    });
  }

  function drawMarkers() {
    marks.replaceChildren();
    var fresh = sessionStorage.getItem("printit_revision_fresh_note") || "";
    ordered().forEach(function (note, index) {
      if (note.posicion_x == null || note.posicion_y == null) return;
      var button = el("button", "printit-rev-marker");
      button.type = "button";
      if (note.id === fresh) button.classList.add("is-new");
      button.style.left = note.posicion_x + "px";
      button.style.top = note.posicion_y + "px";
      button.setAttribute("aria-label", "Nota " + (index + 1));
      var dot = el("span", "printit-rev-dot");
      var num = el("span", "printit-rev-num");
      num.textContent = String(index + 1);
      button.appendChild(dot);
      button.appendChild(num);
      button.addEventListener("click", function (ev) {
        ev.preventDefault();
        ev.stopPropagation();
        activeId = note.id;
        sheetOpen = true;
        sheet.classList.add("is-open");
        drawList();
        var row = list.querySelector('[data-id="' + cssAttr(note.id) + '"]');
        if (row && row.scrollIntoView) row.scrollIntoView({ block: "nearest" });
      });
      marks.appendChild(button);
    });
    if (fresh) sessionStorage.removeItem("printit_revision_fresh_note");
  }

  function drawList() {
    list.replaceChildren();
    if (!notes.length) {
      var empty = el("p", "printit-rev-empty");
      empty.textContent = "Todavía no hay notas en esta página.";
      list.appendChild(empty);
      return;
    }
    ordered()
      .slice()
      .reverse()
      .forEach(function (note, index, all) {
        var number = all.length - index;
        var card = el("article", "printit-rev-note");
        card.dataset.id = note.id;
        if (note.id === activeId) card.classList.add("is-active");
        var meta = el("div", "printit-rev-muted");
        meta.textContent = "Nota " + number + " · " + when(note.created_at);
        var text = el("p");
        text.textContent = note.texto;
        card.appendChild(meta);
        card.appendChild(text);
        var row = el("div", "printit-rev-row");
        row.appendChild(
          mini("Editar", function () {
            editNote(card, note);
          })
        );
        row.appendChild(
          mini("Borrar", function () {
            confirmDelete(card, note);
          })
        );
        card.appendChild(row);
        list.appendChild(card);
      });
  }

  function editNote(card, note) {
    var area = document.createElement("textarea");
    area.value = note.texto;
    var row = el("div", "printit-rev-row");
    row.appendChild(
      mini(
        "Guardar",
        function () {
          var texto = area.value.trim();
          if (!texto) {
            toast("Escribe la nota antes de guardarla.");
            area.focus();
            return;
          }
          send("/api/notes", "PATCH", { id: note.id, texto: texto }, "Nota actualizada");
        },
        true
      )
    );
    row.appendChild(mini("Cancelar", drawList));
    card.replaceChildren(area, row);
    area.focus();
  }

  function confirmDelete(card, note) {
    var ask = el("p");
    ask.textContent = "¿Borrar esta nota?";
    var row = el("div", "printit-rev-row");
    row.appendChild(
      mini(
        "Sí, borrar",
        function () {
          send("/api/notes?id=" + encodeURIComponent(note.id), "DELETE", null, "Nota borrada");
        },
        true
      )
    );
    row.appendChild(mini("No", drawList));
    card.replaceChildren(ask, row);
  }

  function openComposer(point) {
    closeComposer();
    composer = el("form", "printit-rev-composer");
    composer.addEventListener("submit", function (ev) {
      ev.preventDefault();
    });
    var title = el("strong");
    title.textContent = "Nueva nota";
    var area = document.createElement("textarea");
    area.placeholder = "Escribe la nota con tus palabras…";
    area.required = true;
    var error = el("p", "printit-rev-muted");
    error.hidden = true;
    var row = el("div", "printit-rev-row");
    row.appendChild(
      mini(
        "Guardar",
        function () {
          var texto = area.value.trim();
          if (!texto) {
            error.hidden = false;
            error.textContent = "Escribe la nota antes de guardarla.";
            area.focus();
            return;
          }
          fetch("/api/notes", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              pagina: location.pathname,
              texto: texto,
              elemento_selector: point.selector,
              posicion_x: point.x,
              posicion_y: point.y,
              autor: "reche@printitbcn.com",
            }),
          })
            .then(function (r) {
              return r.json().then(function (body) {
                return { ok: r.ok, body: body };
              });
            })
            .then(function (res) {
              if (!res.ok) {
                toast(res.body.error || "No se pudo guardar la nota.");
                return;
              }
              if (res.body.note && res.body.note.id) {
                sessionStorage.setItem("printit_revision_fresh_note", res.body.note.id);
                activeId = res.body.note.id;
              }
              closeComposer();
              sheetOpen = true;
              sheet.classList.add("is-open");
              toast("Nota guardada");
              loadNotes();
            })
            .catch(function () {
              toast("No se pudo guardar la nota.");
            });
        },
        true
      )
    );
    row.appendChild(mini("Cancelar", closeComposer));
    composer.appendChild(title);
    composer.appendChild(area);
    composer.appendChild(error);
    composer.appendChild(row);
    if (window.matchMedia("(max-width: 800px)").matches) {
      composer.style.left = "12px";
    } else {
      var left = Math.min(Math.max(12, point.x - window.scrollX), window.innerWidth - 336);
      var top = Math.min(Math.max(12, point.y - window.scrollY + 18), window.innerHeight - 230);
      composer.style.left = left + "px";
      composer.style.top = top + "px";
    }
    shadow.appendChild(composer);
    area.focus();
  }

  function closeComposer() {
    if (composer && composer.parentNode) composer.parentNode.removeChild(composer);
    composer = null;
  }

  function send(url, method, body, okMessage) {
    fetch(url, {
      method: method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    })
      .then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (payload) {
          return { ok: r.ok, body: payload };
        });
      })
      .then(function (res) {
        if (!res.ok) {
          toast(res.body.error || "No se pudo completar.");
          return;
        }
        toast(okMessage);
        loadNotes();
      })
      .catch(function () {
        toast("No se pudo completar.");
      });
  }

  function maybeGuide() {
    var done = false;
    try {
      done = localStorage.getItem(WELCOME_KEY) === "1";
    } catch (e) {
      done = true;
    }
    if (done) return;
    var step = 0;
    guide = el("div", "printit-rev-guide");
    guide.setAttribute("role", "dialog");
    guide.setAttribute("aria-modal", "true");
    var kicker = el("p", "printit-rev-kicker");
    var title = el("h2", "printit-rev-title");
    var body = el("p", "printit-rev-muted");
    var steps = el("div", "printit-rev-steps");
    var dots = [];
    STEPS.forEach(function () {
      var dot = document.createElement("i");
      dots.push(dot);
      steps.appendChild(dot);
    });
    var row = el("div", "printit-rev-row");
    var skip = mini("Saltar", finishGuide);
    var next = mini("Siguiente", advance, true);
    row.appendChild(skip);
    row.appendChild(next);
    guide.appendChild(kicker);
    guide.appendChild(title);
    guide.appendChild(body);
    guide.appendChild(steps);
    guide.appendChild(row);
    shadow.appendChild(guide);
    host.classList.add("is-guide");

    function paint() {
      kicker.textContent = STEPS[step].kicker;
      title.textContent = STEPS[step].title;
      body.textContent = STEPS[step].body;
      next.textContent = step === STEPS.length - 1 ? "Empezar" : "Siguiente";
      dots.forEach(function (dot, index) {
        dot.classList.toggle("is-on", index <= step);
      });
    }
    function advance() {
      if (step >= STEPS.length - 1) finishGuide();
      else {
        step += 1;
        paint();
      }
    }
    paint();
    next.focus();
  }

  function finishGuide() {
    try {
      localStorage.setItem(WELCOME_KEY, "1");
    } catch (e) {
      /* sin almacenamiento, la guía no se recuerda */
    }
    if (guide && guide.parentNode) guide.parentNode.removeChild(guide);
    guide = null;
    host.classList.remove("is-guide");
  }

  function toast(message) {
    var current = shadow.querySelector(".printit-rev-toast");
    if (current) current.remove();
    var node = el("div", "printit-rev-toast");
    node.setAttribute("role", "status");
    node.textContent = message;
    shadow.appendChild(node);
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function () {
      if (node.parentNode) node.parentNode.removeChild(node);
    }, 2800);
  }

  function syncTheme() {
    var light = document.documentElement.getAttribute("data-theme") === "light";
    host.dataset.theme = light ? "light" : "dark";
  }

  function sizeMarks() {
    var height = Math.max(
      document.documentElement.scrollHeight || 0,
      document.body ? document.body.scrollHeight : 0,
      window.innerHeight
    );
    marks.style.height = height + "px";
  }

  function insideChrome(target) {
    if (!target || !target.closest) return false;
    return target === host || Boolean(target.closest && (target.closest("#printit-rev-root") || target.closest(".printit-rev-marker")));
  }

  function cssPath(target) {
    var elNode = target && target.nodeType === 1 ? target : target && target.parentElement;
    if (!elNode || elNode === document.body) return "body";
    if (elNode.id) return "#" + CSS.escape(elNode.id);
    var parts = [];
    var node = elNode;
    while (node && node.nodeType === 1 && node !== document.body && parts.length < 5) {
      var part = node.tagName.toLowerCase();
      if (node.classList && node.classList.length) {
        part += "." + Array.from(node.classList).slice(0, 2).map(function (name) {
          return CSS.escape(name);
        }).join(".");
      }
      parts.unshift(part);
      node = node.parentElement;
    }
    return parts.join(" > ");
  }

  function when(iso) {
    var date = new Date(iso);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleString("es", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  }

  function el(tag, className) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    return node;
  }

  function mini(label, onClick, accent) {
    var button = el("button", accent ? "printit-rev-mini is-accent" : "printit-rev-mini");
    button.type = "button";
    button.textContent = label;
    button.addEventListener("click", onClick);
    return button;
  }

  function cssAttr(value) {
    if (window.CSS && CSS.escape) return CSS.escape(value);
    return String(value).replace(/"/g, "");
  }
})();
