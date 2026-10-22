import { icono } from "./iconos.js";
import { addActivity } from "./modals.js";
import { render } from "./render.js";
import { byWedding, byWeddingId, saveState, state, text } from "./state.js";
import { avatar } from "./charts.js";

// ============================================================================
// Plano del salón
// ----------------------------------------------------------------------------
// Cada mesa se dibuja como un círculo con sus asientos repartidos por el
// perímetro, igual que en el boceto: de un vistazo se ve cuánta gente hay
// sentada y dónde quedan huecos, sin abrir ninguna ficha.
//
// El color del borde comunica el estado de ocupación (leyenda arriba):
//   verde   = completa      · mostaza = pocas plazas
//   neutro  = disponible    · clay    = seleccionada
//
// Las mesas se arrastran para reproducir la disposición real del salón; la
// posición se guarda en table.x / table.y y es la que se imprime en el PDF.
// ============================================================================

let selectedTableId = null;

// ---------------------------------------------------------------------------
// El mismo plano sirve al equipo y a los novios
// ---------------------------------------------------------------------------
// Mantener dos planos distintos —uno en HTML para el equipo y otro en SVG para
// el portal— significaba que arrastrar una mesa solo funcionaba en uno de los
// dos, y que cualquier mejora había que hacerla dos veces. Es el mismo salón:
// es el mismo lienzo. Solo cambian el tono de los textos y quién firma en
// Actividad.
function bodaDelPlano() {
  return state.portalMode ? state.portalWeddingId : state.selectedWeddingId;
}

function mesasDelPlano() {
  return byWeddingId("tables", bodaDelPlano());
}

function invitadosDelPlano() {
  return byWeddingId("guests", bodaDelPlano());
}

/** Quién firma el cambio en Actividad: el equipo o la pareja. */
function autorDelCambio() {
  if (!state.portalMode) return state.user?.name;
  return state.weddings.find((w) => w.id === state.portalWeddingId)?.couple || "Novios";
}

/**
 * Tamaño de una mesa. Una presidencial de 14 y una de 6 no pueden dibujarse
 * iguales: el plano deja de parecerse al salón real, que es justo para lo que
 * sirve. El factor escala el círculo y el anillo de asientos.
 */
const TAMANOS = { pequena: 0.78, normal: 1, grande: 1.28, xl: 1.55 };
const TAMANO_ETIQUETA = { pequena: "Pequeña", normal: "Normal", grande: "Grande", xl: "Presidencial" };

function factorDe(table) {
  return TAMANOS[table?.tamano] || 1;
}

// Geometria del plano. La huella de una mesa NO es su circulo: es el circulo
// mas el anillo de asientos que lo rodea. Calcular la reticula sobre el
// diametro del circulo era lo que hacia que las mesas se pisaran entre si.
const TABLE_D = 116; // diametro del circulo
const SEAT_D = 26; // diametro de cada asiento
const SEAT_GAP = 13; // separacion entre el borde del circulo y el asiento
const SEAT_RING = TABLE_D / 2 + SEAT_GAP + SEAT_D / 2; // radio del anillo
const FOOTPRINT = SEAT_RING * 2 + SEAT_D; // huella real de una mesa
const GUTTER = 34; // aire entre huellas
const CELL = FOOTPRINT + GUTTER;
const PAD = 20;
const DRAG_THRESHOLD = 6;

/** Columnas segun el ancho disponible, para no forzar scroll horizontal. */
function columnsFor(count) {
  if (count <= 2) return count || 1;
  if (count <= 4) return 2;
  if (count <= 9) return 3;
  return 4;
}

function defaultPosition(table, index, cols) {
  if (typeof table.x === "number" && typeof table.y === "number") return { x: table.x, y: table.y };
  return { x: PAD + (index % cols) * CELL, y: PAD + Math.floor(index / cols) * CELL };
}

/** Huella real de una mesa según su tamaño. */
function huellaDe(table) {
  return Math.round(FOOTPRINT * factorDe(table));
}

/** Estado de ocupación de una mesa, que decide su color en el plano. */
function occupancyState(seated, capacity) {
  if (!capacity) return "libre";
  if (seated >= capacity) return "completa";
  if (capacity - seated <= 2) return "pocas";
  return "libre";
}

function renderVenueCanvas() {
  const tables = mesasDelPlano();
  if (!tables.length) {
    return `<section class="panel venue-panel">
      <div class="panel-head"><h3 class="card-title">Plano del salón</h3></div>
      <p class="chart-empty">Aún no hay mesas. Crea la primera y empieza a montar el plano.</p>
      <button class="btn primary" data-action="new-table"><span class="icon-btn">+</span> Nueva mesa</button>
    </section>`;
  }

  const guests = invitadosDelPlano();
  const cols = columnsFor(tables.length);
  const positions = tables.map((t, i) => defaultPosition(t, i, cols));
  // El lienzo se dimensiona sobre la huella completa, no sobre el circulo.
  const maxHuella = Math.max(FOOTPRINT, ...tables.map(huellaDe));
  const width = Math.max(...positions.map((p) => p.x)) + maxHuella + PAD;
  const height = Math.max(...positions.map((p) => p.y)) + maxHuella + PAD;

  // El lienzo crece con "Más espacio" para poder separar las mesas cuando
  // son muchas; el zoom permite verlo entero sin perder el detalle.
  const extra = Number(state.venueExtra) || 0;
  const zoom = Number(state.venueZoom) || 1;
  const lienzoW = Math.max(600, width) + extra * 260;
  const lienzoH = Math.max(340, height) + extra * 200;

  const selected = tables.find((t) => t.id === selectedTableId) || null;

  return `
    <div class="venue-layout">
      <section class="panel venue-panel">
        <div class="panel-head">
          <h3 class="card-title">Plano del salón</h3>
          <div class="actions venue-tools">
            <div class="venue-zoom" role="group" aria-label="Zoom del plano">
              <button data-venue-zoom="-" title="Alejar" aria-label="Alejar">−</button>
              <span class="venue-zoom-value">${Math.round(zoom * 100)}%</span>
              <button data-venue-zoom="+" title="Acercar" aria-label="Acercar">+</button>
              <button data-venue-zoom="fit" title="Ajustar a la pantalla" aria-label="Ajustar">⤢</button>
            </div>
            ${
              !state.portalMode && state.mesasView === "novios"
                ? ""
                : `<button class="mini-btn" data-venue-grow title="Ampliar el lienzo para separar más las mesas">⊞ Más espacio</button>
                   <button class="link-btn" data-venue-reset title="Recolocar las mesas en cuadrícula">Reordenar</button>
                   <button class="mini-btn" data-venue-full title="Ver a pantalla completa" aria-label="Ver plano a pantalla completa">⛶</button>
                   <button class="btn sage btn-xs" data-action="${state.portalMode ? "portal-nueva-mesa" : "new-table"}"><span class="icon-btn">+</span> Nueva mesa</button>`
            }
          </div>
        </div>

        <div class="venue-legend">
          <span><i class="dot-completa"></i>Mesas completas</span>
          <span><i class="dot-libre"></i>Disponible</span>
          <span><i class="dot-pocas"></i>Pocas plazas</span>
          <span><i class="dot-sel"></i>Mesa seleccionada</span>
        </div>

        <div class="venue-scroll" tabindex="0" role="region" aria-label="Plano de mesas">
          <div class="venue-stage" style="width:${Math.round(lienzoW * zoom)}px;height:${Math.round(lienzoH * zoom)}px">
            <div class="venue-canvas" id="venue-canvas"
                 style="width:${lienzoW}px;height:${lienzoH}px;transform:scale(${zoom});transform-origin:0 0"
                 data-zoom="${zoom}">
              ${tables.map((table, index) => renderVenueTable(table, positions[index], guests)).join("")}
            </div>
          </div>
        </div>
        <p class="venue-hint">${
          state.portalMode
            ? "Arrastrad las mesas para colocarlas como estarán en el salón · pulsad una para ver y sentar gente"
            : "Arrastra una mesa para colocarla · haz clic para ver y sentar invitados"
        }${extra > 0 ? ` · lienzo ampliado ${extra} ${extra === 1 ? "vez" : "veces"}` : ""}</p>
      </section>

      ${renderTablePanel(selected, guests, tables)}
    </div>
  `;
}

/** Una mesa: círculo central con nombre/ocupación y asientos alrededor. */
function renderVenueTable(table, pos, guests) {
  const seatedGuests = guests.filter((g) => g.table === table.name);
  const capacity = Number(table.capacity) || 0;
  const state_ = occupancyState(seatedGuests.length, capacity);
  const isSelected = table.id === selectedTableId;
  // Tope de asientos dibujados: por encima de 14 el anillo se vuelve ilegible,
  // asi que se muestra el resto como un contador "+N".
  const seatCount = Math.min(14, Math.max(capacity, seatedGuests.length));
  const hidden = Math.max(capacity, seatedGuests.length) - seatCount;

  // El contenedor mide la huella completa; el circulo va centrado dentro.
  // Todo se escala con el tamaño elegido para la mesa.
  const f = factorDe(table);
  const huella = huellaDe(table);
  const diam = TABLE_D * f;
  const anillo = SEAT_RING * f;
  const C = huella / 2;

  const seats = Array.from({ length: seatCount }, (_, i) => {
    const angle = (i / seatCount) * 2 * Math.PI - Math.PI / 2;
    const sx = C + anillo * Math.cos(angle);
    const sy = C + anillo * Math.sin(angle);
    const guest = seatedGuests[i];
    const initials = guest ? String(guest.name).split(/\s+/).slice(0, 2).map((w) => w[0] || "").join("").toUpperCase() : "";
    const title = guest ? `${text(guest.name)}${guest.menu ? ` · ${text(guest.menu)}` : ""}` : "Asiento libre";
    return `<span class="venue-seat${guest ? " taken" : ""}" style="left:${Math.round(sx)}px;top:${Math.round(sy)}px" title="${title}">${text(initials)}</span>`;
  }).join("");

  return `<div class="venue-table-wrap${isSelected ? " selected" : ""}" data-venue-table="${table.id}"
    style="left:${pos.x}px;top:${pos.y}px;width:${huella}px;height:${huella}px">
    ${seats}
    <div class="venue-table state-${state_}" style="width:${Math.round(diam)}px;height:${Math.round(diam)}px;left:${Math.round(C - diam / 2)}px;top:${Math.round(C - diam / 2)}px">
      <span class="venue-table-name">${text(table.name)}</span>
      <span class="venue-table-count">${seatedGuests.length}/${capacity || "—"}</span>
      ${hidden > 0 ? `<span class="venue-table-more">+${hidden}</span>` : ""}
    </div>
    ${isSelected ? `<span class="venue-selected-mark">✓</span>` : ""}
  </div>`;
}

/** Panel lateral de la mesa seleccionada: invitados, menús y alergias. */
function renderTablePanel(table, guests, tables) {
  if (!table) {
    return `<aside class="panel venue-side">
      <div class="venue-side-empty">
        <span class="venue-side-empty-icon">◎</span>
        <strong>Selecciona una mesa</strong>
        <p>Haz clic en una mesa del plano para ver quién se sienta en ella y gestionar sus invitados.</p>
      </div>
    </aside>`;
  }

  const seated = guests.filter((g) => g.table === table.name);
  const capacity = Number(table.capacity) || 0;
  const pct = capacity ? Math.round((seated.length / capacity) * 100) : 0;
  const unseated = guests.filter((g) => !g.table || !tables.some((t) => t.name === g.table));

  // Recuento de restricciones de esta mesa: lo que hay que avisar al servicio.
  const allergyCounts = {};
  seated.forEach((g) => {
    const v = String(g.allergy || "").trim();
    if (!v || /^(no|ninguna?|nada|n\/a|-|—)$/i.test(v)) return;
    v.split(/[,;]/).map((s) => s.trim()).filter(Boolean).forEach((a) => {
      allergyCounts[a] = (allergyCounts[a] || 0) + 1;
    });
  });
  const allergyRows = Object.entries(allergyCounts).sort((a, b) => b[1] - a[1]);

  // La vista "novios" del equipo es una previsualización de solo lectura.
  // El portal de verdad, en cambio, es editable: son sus mesas.
  const soloLectura = !state.portalMode && state.mesasView === "novios";
  const locked = Boolean(table.lockedAt);

  return `
    <aside class="panel venue-side">
      <div class="panel-head">
        <h3 class="card-title">${text(table.name)}${locked ? ` <span class="mesa-lock-icon" title="Mesa bloqueada">🔒</span>` : ""}</h3>
        ${soloLectura ? "" : `<button class="btn btn-outline btn-xs" data-edit-item="tables:${table.id}">${icono("editar")} Editar</button>`}
      </div>
      <p class="venue-side-owner">Responsable: ${text(table.owner || "Equipo")} · ${text(table.status || "Pendiente")}</p>

      <div class="venue-side-stats">
        <div><span>Capacidad</span><strong>${capacity || "—"} invitados</strong></div>
        <div><span>Ocupación</span><strong class="${seated.length >= capacity && capacity ? "full" : ""}">${seated.length} / ${capacity || "—"}</strong></div>
      </div>

      ${
        soloLectura
          ? ""
          : `<div class="venue-tamano">
              <span class="venue-tamano-label">Tamaño en el plano</span>
              <div class="venue-tamano-ops" role="group" aria-label="Tamaño de ${text(table.name)}">
                ${Object.keys(TAMANOS)
                  .map(
                    (k) => `<button class="venue-tamano-op${(table.tamano || "normal") === k ? " activo" : ""}"
                      data-venue-tamano="${table.id}:${k}" aria-pressed="${(table.tamano || "normal") === k}">
                      <i style="width:${Math.round(13 * TAMANOS[k])}px;height:${Math.round(13 * TAMANOS[k])}px"></i>
                      ${text(TAMANO_ETIQUETA[k])}
                    </button>`
                  )
                  .join("")}
              </div>
              <small>Solo cambia cómo se ve en el plano, no cuánta gente cabe.</small>
            </div>`
      }
      <div class="stat-bar"><div class="stat-bar-fill tone-verde" style="width:${pct}%"></div></div>

      <h4 class="venue-side-title">Invitados en esta mesa</h4>
      <div class="venue-guest-list">
        ${
          seated.map((g) => `<div class="venue-guest">
            ${avatar(g.name, "sm")}
            <span class="venue-guest-body">
              <strong>${text(g.name)}</strong>
              <small>Menú ${text(g.menu || "sin asignar")}${g.allergy && !/^(no|ninguna?|nada|n\/a|-|—)$/i.test(g.allergy.trim()) ? ` · ⚠ ${text(g.allergy)}` : ""}</small>
            </span>
            ${soloLectura ? "" : `<button class="mini-btn" data-venue-unseat="${g.id}" title="Quitar de la mesa" aria-label="Quitar a ${text(g.name)} de ${text(table.name)}">${icono("cerrar")}</button>`}
          </div>`).join("") || `<p class="chart-empty">Nadie sentado aquí todavía.</p>`
        }
      </div>

      ${
        soloLectura
          ? ""
          : unseated.length
            ? `<div class="field venue-seat-field">
                <label>Sentar invitado en esta mesa</label>
                <select data-venue-seat="${table.id}">
                  <option value="">Elegir invitado sin mesa...</option>
                  ${unseated.map((g) => `<option value="${g.id}">${text(g.name)}${g.group && g.group !== "Sin grupo" ? ` · ${text(g.group)}` : ""}</option>`).join("")}
                </select>
              </div>`
            : `<p class="chart-empty">No quedan invitados sin mesa.</p>`
      }

      ${
        allergyRows.length
          ? `<h4 class="venue-side-title">Notas y alergias en la mesa</h4>
             <ul class="venue-allergy-list">
               ${allergyRows.map(([name, count]) => `<li><span>⚠ ${text(name)}</span><strong>${count}</strong></li>`).join("")}
             </ul>`
          : ""
      }

      ${table.notes ? `<p class="mesa-notes">${text(table.notes)}</p>` : ""}

      ${
        soloLectura
          ? ""
          : `<div class="venue-side-actions">
              <button class="btn ${locked ? "sage done" : "btn-outline"} btn-xs" data-toggle-table-lock="${table.id}" title="${locked ? "Permitir cambios de asiento" : "Fijar los asientos de esta mesa"}">
                ${locked ? "🔒 Bloqueada" : "Bloquear mesa"}
              </button>
              <button class="mini-btn danger-text" data-delete-item="tables:${table.id}" title="Eliminar mesa">${icono("cerrar")} Eliminar</button>
            </div>`
      }
    </aside>
  `;
}

function seatGuest(tableId, guestId) {
  const table = state.tables.find((t) => t.id === tableId);
  const guest = state.guests.find((g) => g.id === guestId);
  if (!table || !guest) return;
  guest.table = table.name;
  addActivity(
    state.portalMode ? `Los novios sentaron a ${guest.name} en «${table.name}»` : `Sentó a ${guest.name} en ${table.name}`,
    autorDelCambio(),
    table.weddingId
  );
  saveState();
  render();
}

function unseatGuest(guestId) {
  const guest = state.guests.find((g) => g.id === guestId);
  if (!guest) return;
  const previous = guest.table;
  guest.table = "";
  addActivity(
    state.portalMode ? `Los novios levantaron a ${guest.name} de «${previous || "su mesa"}»` : `Quitó a ${guest.name} de ${previous || "su mesa"}`,
    autorDelCambio(),
    guest.weddingId
  );
  saveState();
  render();
}

let avisoMovimiento = null;


/** Cambia el tamaño con el que se dibuja una mesa en el plano. */
function setTableSize(ref) {
  const [id, tamano] = String(ref).split(":");
  const table = state.tables.find((t) => t.id === id);
  if (!table || !TAMANOS[tamano]) return;
  table.tamano = tamano;
  addActivity(
    state.portalMode
      ? `Los novios pusieron «${table.name}» en tamaño ${TAMANO_ETIQUETA[tamano].toLowerCase()}`
      : `Cambió el tamaño de ${table.name} a ${TAMANO_ETIQUETA[tamano].toLowerCase()}`,
    autorDelCambio(),
    table.weddingId
  );
  saveState();
  render();
}

function moveTable(tableId, x, y) {
  const table = state.tables.find((t) => t.id === tableId);
  if (!table) return;
  table.x = Math.round(x);
  table.y = Math.round(y);
  saveState();

  // Colocar el salón son veinte arrastres seguidos. Registrarlos uno a uno
  // llenaría Actividad de ruido, así que se agrupa: un solo apunte cuando la
  // persona deja de mover cosas.
  clearTimeout(avisoMovimiento);
  const weddingId = table.weddingId;
  const enPortal = state.portalMode;
  avisoMovimiento = setTimeout(() => {
    addActivity(
      enPortal ? "Los novios recolocaron las mesas en el plano" : "Recolocó las mesas en el plano",
      autorDelCambio(),
      weddingId
    );
    saveState();
  }, 4000);
}

/** Devuelve todas las mesas a la cuadrícula, sin solapes. */
function resetLayout() {
  const tables = mesasDelPlano();
  const cols = columnsFor(tables.length);
  tables.forEach((table, index) => {
    table.x = PAD + (index % cols) * CELL;
    table.y = PAD + Math.floor(index / cols) * CELL;
  });
  saveState();
  render();
}

function initVenueCanvas() {
  const canvas = document.querySelector("#venue-canvas");
  if (!canvas) return;

  document.querySelector("[data-venue-reset]")?.addEventListener("click", resetLayout);

  document.querySelectorAll("[data-venue-zoom]").forEach((button) =>
    button.addEventListener("click", () => {
      const modo = button.dataset.venueZoom;
      if (modo === "fit") {
        // Ajustar: el lienzo entero cabe en el ancho disponible.
        const scroll = document.querySelector(".venue-scroll");
        const lienzo = document.querySelector("#venue-canvas");
        if (scroll && lienzo) {
          const disponible = scroll.clientWidth - 20;
          state.venueZoom = Math.min(1, Math.max(0.35, disponible / lienzo.offsetWidth));
        }
      } else {
        const actual = Number(state.venueZoom) || 1;
        state.venueZoom = Math.min(1.6, Math.max(0.35, actual + (modo === "+" ? 0.15 : -0.15)));
      }
      saveState();
      render();
    })
  );

  document.querySelector("[data-venue-grow]")?.addEventListener("click", () => {
    state.venueExtra = (Number(state.venueExtra) || 0) + 1;
    saveState();
    render();
  });

  document.querySelector("[data-venue-full]")?.addEventListener("click", () => {
    const panel = document.querySelector(".venue-panel");
    if (!panel) return;
    // Pantalla completa nativa si el navegador la permite; si no, una clase
    // que ocupa toda la ventana — el resultado para quien monta es el mismo.
    if (document.fullscreenElement) document.exitFullscreen?.();
    else if (panel.requestFullscreen) panel.requestFullscreen().catch(() => panel.classList.toggle("venue-fake-full"));
    else panel.classList.toggle("venue-fake-full");
  });
  document.querySelector("[data-venue-seat]")?.addEventListener("change", (event) => {
    if (event.target.value) seatGuest(event.target.dataset.venueSeat, event.target.value);
  });
  document.querySelectorAll("[data-venue-unseat]").forEach((button) => button.addEventListener("click", () => unseatGuest(button.dataset.venueUnseat)));
  document.querySelectorAll("[data-venue-tamano]").forEach((button) => button.addEventListener("click", () => setTableSize(button.dataset.venueTamano)));

  let dragging = null;
  canvas.querySelectorAll("[data-venue-table]").forEach((el) => {
    el.addEventListener("pointerdown", (event) => {
      const rect = canvas.getBoundingClientRect();
      const z = Number(canvas.dataset.zoom) || 1;
      dragging = {
        id: el.dataset.venueTable,
        el,
        z,
        offX: (event.clientX - rect.left) / z - el.offsetLeft,
        offY: (event.clientY - rect.top) / z - el.offsetTop,
        startX: event.clientX,
        startY: event.clientY,
        moved: false,
      };
      el.setPointerCapture(event.pointerId);
    });

    el.addEventListener("pointermove", (event) => {
      if (!dragging || dragging.el !== el) return;
      if (!dragging.moved && Math.hypot(event.clientX - dragging.startX, event.clientY - dragging.startY) > DRAG_THRESHOLD) dragging.moved = true;
      if (!dragging.moved) return;
      // Coordenadas en el espacio del lienzo, no en el de la pantalla: sin
      // dividir por el zoom la mesa se iba del cursor al alejar o acercar.
      const rect = canvas.getBoundingClientRect();
      const z = dragging.z || 1;
      const x = Math.max(0, Math.min(canvas.offsetWidth - FOOTPRINT, (event.clientX - rect.left) / z - dragging.offX));
      const y = Math.max(0, Math.min(canvas.offsetHeight - FOOTPRINT, (event.clientY - rect.top) / z - dragging.offY));
      el.style.left = `${x}px`;
      el.style.top = `${y}px`;
    });

    const finishDrag = () => {
      if (!dragging || dragging.el !== el) return;
      if (dragging.moved) {
        moveTable(dragging.id, Number.parseFloat(el.style.left), Number.parseFloat(el.style.top));
      } else {
        // Un clic sin arrastre selecciona o deselecciona la mesa.
        selectedTableId = selectedTableId === dragging.id ? null : dragging.id;
        render();
      }
      dragging = null;
    };
    el.addEventListener("pointerup", finishDrag);
    el.addEventListener("pointercancel", finishDrag);
  });
}

/**
 * Geometría del plano, compartida con la impresión. Antes print.js tenía sus
 * propias constantes (132px de celda frente a los 194px reales de huella) y
 * por eso las mesas salían pisadas en el PDF aunque en pantalla estuvieran
 * bien colocadas. Una sola fuente de verdad evita que vuelvan a divergir.
 */
const VENUE_GEOMETRY = { TABLE_D, SEAT_D, SEAT_RING, FOOTPRINT, CELL, PAD, TAMANOS, columnsFor, defaultPosition, huellaDe, factorDe, occupancyState };

export { VENUE_GEOMETRY, TAMANOS, initVenueCanvas, renderVenueCanvas, setTableSize };
