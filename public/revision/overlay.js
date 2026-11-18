(function () {
  if (window.__printitRevisionOverlay) return;
  window.__printitRevisionOverlay = true;

  var root = document.createElement("div");
  root.id = "printit-rev-root";
  document.documentElement.appendChild(root);

  var link = document.createElement("a");
  link.className = "printit-rev-link";
  link.href = "/novedades";
  link.textContent = "Novedades";
  root.appendChild(link);

  var fab = document.createElement("button");
  fab.type = "button";
  fab.className = "printit-rev-fab";
  fab.textContent = "Añadir nota";
  root.appendChild(fab);

  var picking = false;
  var panel = null;
  var pending = null;

  function cssPath(el) {
    if (!el || el === document.body) return "body";
    if (el.id) return "#" + CSS.escape(el.id);
    var parts = [];
    while (el && el.nodeType === 1 && el !== document.body) {
      var part = el.tagName.toLowerCase();
      if (el.classList && el.classList.length) {
        part += "." + Array.from(el.classList).slice(0, 2).map(function (c) {
          return CSS.escape(c);
        }).join(".");
      }
      var parent = el.parentElement;
      if (parent) {
        var siblings = Array.from(parent.children).filter(function (c) {
          return c.tagName === el.tagName;
        });
        if (siblings.length > 1) {
          part += ":nth-of-type(" + (siblings.indexOf(el) + 1) + ")";
        }
      }
      parts.unshift(part);
      el = parent;
    }
    return parts.join(" > ");
  }

  function closePanel() {
    if (panel && panel.parentNode) panel.parentNode.removeChild(panel);
    panel = null;
    pending = null;
  }

  function openPanel(data) {
    closePanel();
    pending = data;
    panel = document.createElement("div");
    panel.className = "printit-rev-panel";
    panel.innerHTML =
      '<div><strong>Nueva nota</strong></div>' +
      '<div class="muted">' +
      (data.selector || "posición libre") +
      "</div>" +
      '<textarea placeholder="Escribe la nota…"></textarea>' +
      '<button type="button">Guardar</button>' +
      '<button type="button" data-cancel="1" style="background:#333;color:#fff">Cancelar</button>';
    root.appendChild(panel);
    var ta = panel.querySelector("textarea");
    panel.querySelector("[data-cancel]").onclick = closePanel;
    panel.querySelector("button:not([data-cancel])").onclick = function () {
      var texto = (ta.value || "").trim();
      if (!texto) return;
      fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pagina: location.pathname,
          texto: texto,
          elemento_selector: data.selector,
          posicion_x: data.x,
          posicion_y: data.y,
          autor: "reche@printitbcn.com",
        }),
      })
        .then(function (r) {
          return r.json().then(function (j) {
            return { ok: r.ok, j: j };
          });
        })
        .then(function (res) {
          if (!res.ok) {
            alert(res.j.error || "No se pudo guardar (¿Supabase?)");
            return;
          }
          closePanel();
          renderMarkers();
        })
        .catch(function () {
          alert("Error de red al guardar la nota");
        });
    };
    ta.focus();
  }

  fab.addEventListener("click", function () {
    picking = !picking;
    document.documentElement.classList.toggle("printit-rev-pick", picking);
    fab.textContent = picking ? "Haz clic en la página…" : "Añadir nota";
  });

  document.addEventListener(
    "click",
    function (ev) {
      if (!picking) return;
      if (ev.target.closest && ev.target.closest("#printit-rev-root")) return;
      ev.preventDefault();
      ev.stopPropagation();
      picking = false;
      document.documentElement.classList.remove("printit-rev-pick");
      fab.textContent = "Añadir nota";
      var x = ev.pageX;
      var y = ev.pageY;
      var selector = cssPath(ev.target);
      openPanel({ x: x, y: y, selector: selector });
    },
    true
  );

  function renderMarkers() {
    root.querySelectorAll(".printit-rev-marker").forEach(function (n) {
      n.remove();
    });
    fetch("/api/notes?pagina=" + encodeURIComponent(location.pathname))
      .then(function (r) {
        return r.json();
      })
      .then(function (data) {
        (data.notes || []).forEach(function (note) {
          if (note.posicion_x == null || note.posicion_y == null) return;
          var m = document.createElement("button");
          m.type = "button";
          m.className = "printit-rev-marker";
          m.title = note.texto;
          m.style.left = note.posicion_x + "px";
          m.style.top = note.posicion_y + "px";
          m.onclick = function () {
            alert("[" + note.estado + "] " + note.texto);
          };
          root.appendChild(m);
        });
      })
      .catch(function () {});
  }

  renderMarkers();
})();
