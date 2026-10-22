import { PLAZOS, budgetSummary, costeDe, facturadoPago, totalPago } from "./budget.js";
import { fotoSrc, addActivity } from "./modals.js";
import { render } from "./render.js";
import { byWedding, fechaHora, formatDate, getWedding, paletteSwatches, pendingWeddingTasks, saveState, state, text, toast, weddingTasks } from "./state.js";
import { label } from "./views.js";
import { VENUE_GEOMETRY } from "./venue.js";
import { rinconGallery } from "./modals.js";

// Mensaje de cierre para los novios al final de cada dossier. Rota en orden
// (nunca se repite el mismo dos veces seguidas) para que cada informe entregado
// se sienta cuidado y distinto, no una plantilla repetida.
const REFLECTION_QUOTES = [
  "Una boda no la hace perfecta que todo salga exactamente como estaba escrito, sino un equipo que cuida cada detalle como si fuera propio.",
  "Detrás de cada gran celebración hay un equipo que trabajó en silencio para que vosotros solo tuvierais que vivir el momento.",
  "El mejor regalo que podemos haceros no es un evento sin errores, es una experiencia que se sienta completamente vuestra.",
  "Cuando dos personas construyen su vida juntas, cada detalle cuenta una historia. Gracias por dejarnos contar la vuestra.",
  "Trabajar en equipo no es solo coordinar tareas: es compartir una misma ilusión hasta el último minuto del día.",
  "No organizamos bodas, cuidamos momentos que no se repiten. Gracias por confiarnos el vuestro.",
  "La magia de un buen equipo está en que nadie note el esfuerzo, solo la emoción del resultado.",
  "Cada pareja nos enseña algo distinto sobre lo que significa el amor, la paciencia y la ilusión de empezar algo nuevo.",
  "Un gran día no se improvisa: se construye con cariño, con tiempo, y con la confianza de quienes lo hacen posible.",
  "La mejor experiencia no es la más perfecta, es la que se recuerda con una sonrisa durante toda una vida.",
  "Detrás de cada mesa bien puesta, cada canción a tiempo y cada sonrisa tranquila, hay un equipo que eligió cuidar los detalles.",
  "Celebrar en equipo — familia, amigos y el equipo que lo coordina — es la manera más bonita de empezar un nuevo capítulo.",
  "Gracias por dejarnos ser parte de vuestra historia. Cuidar vuestra boda ha sido, también, un privilegio para todo el equipo.",
  "El amor se celebra mejor cuando todo un equipo, con el corazón puesto en ello, trabaja para que solo tengáis que disfrutar.",
];

function nextReflectionQuote() {
  const nextIndex = (state.lastReflectionIndex + 1) % REFLECTION_QUOTES.length;
  state.lastReflectionIndex = nextIndex;
  return REFLECTION_QUOTES[nextIndex];
}

function reportSections() {
  return [
    ["summary", "Resumen general", "Pareja, fecha, lugares, responsable y paleta"],
    // El presupuesto faltaba en el dossier, y es lo que más se enseña en una
    // reunión. Va justo después del resumen, no al final.
    ["budget", "Presupuesto", "Partidas, coste, reparto A/B y lo ya pagado"],
    ["tasks", "Tareas", "Qué falta, quién lo lleva y qué está confirmado"],
    ["services", "Servicios", "Lista de servicios y su preparación"],
    ["timeline", "Timeline", "El orden del día, hora a hora"],
    ["weddingday", "Wedding Day", "Versión para el día, con casillas de comprobación"],
    ["guests", "Invitados", "Asistencia, menú, alergias y mesa"],
    ["tables", "Mesas", "Plazas y quién se sienta en cada mesa"],
    ["plano", "Plano de mesas", "La distribución dibujada, tal como la ves en pantalla"],
    ["providers", "Proveedores", "Contactos y estado de cada uno"],
    ["rincones", "Rincones", "Espacios ambientados, con foto y descripción"],
    ["music", "Música", "Canciones para cada momento"],
    ["shotList", "Lista de fotos", "Fotos imprescindibles y quién sale en ellas"],
    ["transports", "Transportes", "Rutas, horarios y quién viaja"],
    ["issues", "Incidencias", "Solo para el equipo"],
    ["documents", "Documentos", "Índice de archivos"],
    ["activity", "Actividad", "Qué ha hecho el equipo y cuándo"],
  ];
}

function allowedReportSectionKeys(audience = state.exportAudience) {
  const all = reportSections().map(([section]) => section);
  if (audience === "Equipo") return all;
  if (audience === "Proveedores") return ["summary", "timeline", "weddingday", "providers", "shotList", "transports", "plano"];
  return all.filter((section) => !["issues", "activity"].includes(section));
}

function renderReportChecklist() {
  const allowed = allowedReportSectionKeys();
  return `<div class="export-checklist">${reportSections().filter(([key]) => allowed.includes(key)).map(([key, title, detail]) => `<label class="export-option"><input type="checkbox" data-export-section="${key}" ${state.exportSelection.includes(key) ? "checked" : ""} /><span class="check-mark">✓</span><span><strong>${title}</strong><small>${detail}</small></span></label>`).join("")}</div>`;
}

function renderExport() {
  return `
    <section class="export-studio">
      <div class="export-intro panel">
        <span class="eyebrow">Dossier de boda</span>
        <h3>Prepara exactamente el documento que necesitas</h3>
        <p>Elige qué incluir y para quién es. Te preparamos un PDF con portada, logo y los colores de la boda.</p>
        <div class="audience-control" role="group" aria-label="Destinatario">
          ${["Equipo", "Novios", "Proveedores"].map((audience) => `<button class="${state.exportAudience === audience ? "active" : ""}" data-export-audience="${audience}">${audience}</button>`).join("")}
        </div>
        <div class="export-preview-card" style="--preview-primary:${text(getWedding().palettePrimary)};--preview-secondary:${text(getWedding().paletteSecondary)}">
          <img src="./assets/brand/ep-logo.png" alt="Events Planner" />
          <div><span>${text(state.exportAudience)}</span><h4>${text(getWedding().couple)}</h4><p>${formatDate(getWedding().date)} · ${text(getWedding().venue)}</p></div>
          ${paletteSwatches(getWedding(), true)}
        </div>
        <div class="actions export-formats"><button class="btn primary export-main-action" data-action="print-dossier">↓ Dossier en PDF</button><button class="btn btn-outline" data-action="export-word">↓ Dossier en Word</button></div>
      </div>
      <section class="panel export-options">
        <div class="section-title"><div><h3>Contenido</h3><p>${state.exportSelection.length} secciones seleccionadas</p></div><button class="btn" data-action="toggle-export-all">Seleccionar todo</button></div>
        ${renderReportChecklist()}
        <div class="actions export-secondary-actions"><button class="btn" data-action="export-guests">Descargar invitados CSV</button><button class="btn" data-action="export-json">Descargar copia de seguridad</button></div>
      </section>
    </section>
  `;
}


/**
 * El presupuesto para el dossier: una fila por partida y una final con los
 * totales, para que el documento cuadre solo y no haya que sumar a mano
 * delante de la pareja.
 */
function filasPresupuesto(weddingId) {
  if (!weddingId) return [];
  const r = budgetSummary(weddingId);
  const eur = (n) => `${(Math.round(n * 100) / 100).toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;

  // Cada plazo se cuenta en una celda: importe, estado y fecha. En el dossier
  // solo salían las columnas A y B, y era justo lo que la pareja pregunta en
  // la reunión —«¿qué he pagado ya y cuándo vence lo siguiente?»—, así que
  // había que buscarlo en pantalla mientras ellos esperaban.
  const celdaPlazo = (pago) => {
    const imp = totalPago(pago);
    if (!imp) return "—";
    const cuando = pago?.vence ? formatDate(pago.vence) : "sin fecha";
    if (pago?.estado === "Pagado") return `${eur(imp)} · pagado ${cuando}`;
    if (pago?.estado === "Anulado") return `${eur(imp)} · anulado`;
    const vencido = pago?.vence && new Date(pago.vence) < new Date();
    return `${eur(imp)} · ${vencido ? "VENCIDO" : "vence"} ${cuando}`;
  };

  const filas = r.items.map((item) => {
    const coste = costeDe(item);
    const a = facturadoPago(coste);
    const b = Number(coste.importeB) || 0;
    const total = a + b;
    const plazos = item.plazos || {};
    const pagado = PLAZOS.reduce((s, { id }) => s + (plazos[id]?.estado === "Pagado" ? totalPago(plazos[id]) : 0), 0);
    return [
      item.concepto,
      item.proveedor || "Sin asignar",
      ...PLAZOS.map(({ id }) => celdaPlazo(plazos[id])),
      eur(a),
      eur(b),
      eur(total),
      eur(pagado),
      eur(total - pagado),
    ];
  });

  // El total de cada plazo suma solo lo que sigue vivo: un pago anulado no es
  // dinero que nadie vaya a mover.
  const totalPlazo = (id) =>
    r.items.reduce((s, item) => {
      const pago = item.plazos?.[id];
      return s + (pago && pago.estado !== "Anulado" ? totalPago(pago) : 0);
    }, 0);

  filas.push([
    "TOTAL",
    "",
    ...PLAZOS.map(({ id }) => eur(totalPlazo(id))),
    eur(r.facturado),
    eur(r.noFacturado),
    eur(r.total),
    eur(r.pagado),
    eur(r.pendiente),
  ]);
  return filas;
}

function sectionRows(section) {
  const wedding = getWedding();
  const map = {
    summary: [
      ["Pareja", wedding?.couple],
      ["Fecha", formatDate(wedding?.date)],
      ["Ceremonia", wedding?.ceremony],
      ["Celebración", wedding?.venue],
      ["Invitados estimados", wedding?.guestsEstimate],
      ["Responsable", wedding?.lead],
      ["Tareas pendientes", pendingWeddingTasks(wedding?.id).length],
      ["Paleta", `${wedding?.palettePrimary || ""} · ${wedding?.paletteSecondary || ""} · ${wedding?.paletteAccent || ""}`],
      ["Concepto visual", wedding?.paletteNotes],
      ["Notas", wedding?.notes],
      ["Apuntes primera reunión", wedding?.firstMeetingNotes],
    ],
    budget: filasPresupuesto(wedding?.id),
    tasks: weddingTasks(wedding?.id).map((item) => [item.status || "Pendiente", item.title, item.owner, item.due || "Sin fecha", item.completedBy || ""]),
    services: byWedding("services").map((item) => [item.status, item.title, item.price ? `${item.price} €` : "", item.owner, item.notes]),
    timeline: byWedding("timeline").sort((a, b) => a.time.localeCompare(b.time)).map((item) => [item.time, item.title, item.owner, item.status, item.note]),
    weddingday: byWedding("timeline").sort((a, b) => a.time.localeCompare(b.time)).map((item) => [item.time, item.title, item.owner, item.status, item.completedBy || ""]),
    // Quien se ha opuesto a que tratemos su alergia no aparece con ella en
    // ningún documento impreso. Pedir el consentimiento y luego ignorarlo en
    // el dossier sería peor que no pedirlo.
    guests: byWedding("guests").map((item) => [
      item.name,
      item.rsvp,
      item.menu,
      /se opone/i.test(String(item.consentimientoSalud || "")) ? "—" : item.allergy,
      item.table,
    ]),
    tables: byWedding("tables").map((item) => [item.name, item.capacity, item.owner, item.status, item.names || ""]),
    providers: byWedding("providers").map((item) => [item.name, item.type, item.contact, item.phone, item.status]),
    rincones: byWedding("rincones").map((item) => [item.name, item.description, item.price ? `${item.price} €` : "", item.active || "Sí"]),
    music: byWedding("music").map((item) => [item.moment, item.title, item.artist, item.status, item.notes || ""]),
    shotList: byWedding("shotList").map((item) => [item.moment, item.title, item.people, item.owner, item.status]),
    transports: byWedding("transports").map((item) => [item.time, item.type, item.from, item.to, item.passengers, item.status]),
    issues: byWedding("issues").map((item) => [item.priority, item.title, item.owner, item.status, item.solution]),
    documents: byWedding("documents").map((item) => [item.name, item.type, item.visibility, item.date, item.attachment?.name || ""]),
    activity: byWedding("activity").map((item) => [fechaHora(item.at || item.time) || item.time, item.actor, item.text]),
  };
  return map[section] || [];
}

function sectionHeaders(section) {
  return {
    summary: ["Campo", "Valor"],
    budget: ["Partida", "Proveedor", ...PLAZOS.map(({ label }) => label), "A · facturado", "B · no facturado", "Total", "Pagado", "Pendiente"],
    tasks: ["Estado", "Tarea", "Responsable", "Fecha", "Confirmado por"],
    services: ["Estado", "Proceso", "Precio", "Responsable", "Observación"],
    timeline: ["Hora", "Momento", "Responsable", "Estado", "Notas"],
    weddingday: ["Hora", "Momento", "Responsable", "Estado", "Confirmado por"],
    guests: ["Nombre", "RSVP", "Menú", "Alergias", "Mesa"],
    tables: ["Mesa", "Capacidad", "Responsable", "Estado", "Nombres"],
    providers: ["Proveedor", "Categoría", "Contacto", "Teléfono", "Estado"],
    rincones: ["Rincón", "Descripción", "Precio", "Activo"],
    music: ["Momento", "Canción", "Artista", "Estado", "Notas"],
    shotList: ["Bloque", "Foto", "Personas", "Responsable", "Estado"],
    transports: ["Hora", "Tipo", "Origen", "Destino", "Pasajeros", "Estado"],
    issues: ["Prioridad", "Incidencia", "Responsable", "Estado", "Plan"],
    documents: ["Documento", "Tipo", "Visibilidad", "Fecha", "Archivo"],
    activity: ["Hora", "Actor", "Actividad"],
  }[section] || ["Dato"];
}

function printTitle(section) {
  return {
    summary: "Resumen",
    budget: "Presupuesto",
    tasks: "Tareas",
    services: "Servicios",
    timeline: "Timeline",
    weddingday: "Wedding Day",
    guests: "Invitados",
    tables: "Mesas",
    plano: "Plano de mesas",
    providers: "Proveedores",
    rincones: "Rincones",
    music: "Música",
    shotList: "Lista de fotos",
    transports: "Transportes",
    issues: "Incidencias",
    documents: "Documentos",
    activity: "Actividad",
  }[section] || label(section);
}

// ============================================================================
// Plano de mesas para el dossier: reproduce en SVG la misma distribucion que
// se ve en la pestaña Mesas (mismas constantes de rejilla que src/venue.js),
// para que lo que el equipo coloca en pantalla sea lo que sale impreso.
// ============================================================================
function planoMesasSvg() {
  const tables = byWedding("tables");
  if (!tables.length) return "";
  const guests = byWedding("guests");
  const G = VENUE_GEOMETRY;

  // Misma retícula que la pantalla: si el equipo colocó las mesas a mano,
  // el PDF reproduce esa colocación exacta; si no, la cuadrícula por defecto.
  const cols = G.columnsFor(tables.length);
  const pos = tables.map((t, i) => G.defaultPosition(t, i, cols));

  const ancho = Math.max(...pos.map((p) => p.x)) + G.FOOTPRINT + G.PAD;
  const alto = Math.max(...pos.map((p) => p.y)) + G.FOOTPRINT + G.PAD;

  const mesas = tables
    .map((table, index) => {
      const { x, y } = pos[index];
      const sentados = guests.filter((g) => g.table === table.name);
      const capacidad = Number(table.capacity) || 0;
      const estado = G.occupancyState(sentados.length, capacidad);
      const borde = estado === "completa" ? "#56603f" : estado === "pocas" ? "#d6b36b" : "#b9b7a6";

      const cx = x + G.FOOTPRINT / 2;
      const cy = y + G.FOOTPRINT / 2;

      // Asientos alrededor, con iniciales — igual que en pantalla, para que
      // el plano impreso sirva de verdad para montar el salón.
      const total = Math.min(16, Math.max(capacidad, sentados.length));
      const asientos = Array.from({ length: total }, (_, i) => {
        const ang = (i / total) * 2 * Math.PI - Math.PI / 2;
        const sx = cx + G.SEAT_RING * Math.cos(ang);
        const sy = cy + G.SEAT_RING * Math.sin(ang);
        const invitado = sentados[i];
        const ini = invitado
          ? String(invitado.name).split(/\s+/).slice(0, 2).map((w) => w[0] || "").join("").toUpperCase()
          : "";
        return `<g><circle cx="${sx}" cy="${sy}" r="${G.SEAT_D / 2}" fill="${invitado ? "#56603f" : "#ffffff"}" stroke="${invitado ? "#56603f" : "#cfcdbc"}" stroke-width="1" />${
          ini ? `<text x="${sx}" y="${sy + 3}" text-anchor="middle" font-size="8" font-weight="bold" fill="#ffffff">${text(ini)}</text>` : ""
        }</g>`;
      }).join("");

      return `<g>
        ${asientos}
        <circle cx="${cx}" cy="${cy}" r="${G.TABLE_D / 2}" fill="#ffffff" stroke="${borde}" stroke-width="2" />
        <text x="${cx}" y="${cy - 2}" text-anchor="middle" font-size="13" font-weight="bold" fill="#25251f">${text(table.name)}</text>
        <text x="${cx}" y="${cy + 14}" text-anchor="middle" font-size="10.5" fill="#858a72">${sentados.length}/${capacidad || "\u2014"}</text>
      </g>`;
    })
    .join("");

  return `<svg class="plano-svg" viewBox="0 0 ${Math.round(ancho)} ${Math.round(alto)}" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet">
    <rect x="0" y="0" width="${Math.round(ancho)}" height="${Math.round(alto)}" fill="#faf9f2" stroke="#ded6c0" stroke-width="1" rx="10" />
    ${mesas}
  </svg>`;
}

/** Leyenda del plano: totales de ocupacion para leerlo de un vistazo. */
function planoResumen() {
  const tables = byWedding("tables");
  const guests = byWedding("guests");
  const sentados = guests.filter((g) => g.table && tables.some((t) => t.name === g.table)).length;
  const capacidad = tables.reduce((s, t) => s + (Number(t.capacity) || 0), 0);
  return `<div class="plano-resumen">
    <span><strong>${tables.length}</strong> mesas</span>
    <span><strong>${sentados}</strong> invitados sentados</span>
    <span><strong>${guests.length - sentados}</strong> sin mesa</span>
    <span><strong>${capacidad}</strong> plazas totales</span>
  </div>`;
}

function printSection(section) {
  if (!getWedding()) return;
  state.exportSelection = [section];
  state.exportAudience = "Equipo";
  state.modal = { type: "print-options", sourceSection: section };
  render();
}

function openPrintDocument(html) {
  const win = window.open("", "_blank");
  if (!win) {
    toast("El navegador ha bloqueado la ventana de impresión. Permite las ventanas emergentes para Events Planner y vuelve a intentarlo.");
    return false;
  }
  win.document.open();
  win.document.write(html);
  win.document.close();

  // El botón «Descargar en PDF» llevaba un onclick escrito dentro del HTML, y
  // la política de contenido de la aplicación no permite código en línea: el
  // navegador lo descartaba sin decir nada y el botón no hacía nada al pulsarlo.
  // Se conecta desde aquí, que es la misma ventana y no necesita permiso.
  try {
    win.document.querySelectorAll("[data-imprimir]").forEach((boton) => {
      boton.addEventListener("click", () => win.print());
    });
  } catch (_) {
    /* si el navegador no deja tocar la ventana, queda Ctrl+P */
  }
  return true;
}

function toggleExportAll() {
  const allowed = allowedReportSectionKeys();
  state.exportSelection = state.exportSelection.length === allowed.length ? [] : allowed;
  render();
}

function confirmPrintOptions() {
  state.modal = null;
  printDossier();
  render();
}

function exportRowsForAudience(section, audience) {
  if (section === "documents" && audience === "Novios") {
    return byWedding("documents")
      .filter((item) => String(item.visibility || "").toLowerCase().includes("nov"))
      .map((item) => [item.name, item.type, item.visibility, item.date, item.attachment?.name || ""]);
  }
  const rows = sectionRows(section);
  // Minimizacion de datos (art. 5.1.c RGPD): las alergias son datos de salud
  // y no tienen por que salir en el dossier que se entrega a proveedores.
  if (section === "guests" && audience === "Proveedores") return rows.map((row) => [row[0], row[1], row[2], "—", row[4]]);
  if (section === "summary" && audience !== "Equipo") return rows.filter((row) => row[0] !== "Notas" && row[0] !== "Apuntes primera reunión");
  if (section === "rincones" && audience !== "Equipo") return rows.map((row) => [row[0], row[1], "Preguntar al equipo", row[3]]);
  return rows;
}


/**
 * Dossier en Word (.docx editable). No hace falta librería: Word abre HTML
 * empaquetado como documento y respeta tablas, estilos y saltos de página.
 * Es la forma de que el equipo pueda retocar el texto antes de entregarlo.
 */
function exportDossierWord() {
  const wedding = getWedding();
  if (!wedding) return;
  const allowed = allowedReportSectionKeys();
  const sections = state.exportSelection.filter((s) => allowed.includes(s));
  if (!sections.length) {
    toast("Elige al menos una sección para generar el documento.");
    return;
  }

  const P = text(wedding.palettePrimary || "#56603f");
  const S = text(wedding.paletteSecondary || "#d6b36b");

  const cuerpo = sections
    .map((section, index) => {
      const titulo = printTitle(section);
      if (section === "plano") {
        const t = byWedding("tables");
        const g = byWedding("guests");
        return `<h1>${String(index + 1).padStart(2, "0")} · ${text(titulo)}</h1>
          <table class="t"><tr><th>Mesa</th><th>Capacidad</th><th>Sentados</th><th>Invitados</th></tr>
          ${t
            .map((x) => {
              const en = g.filter((y) => y.table === x.name);
              return `<tr><td><b>${text(x.name)}</b></td><td>${text(x.capacity || "-")}</td><td>${en.length}</td><td>${en.map((y) => text(y.name)).join(", ") || "-"}</td></tr>`;
            })
            .join("")}</table>
          <p class="nota">El plano dibujado está en la versión PDF del dossier.</p>`;
      }
      const rows = exportRowsForAudience(section, state.exportAudience);
      const headers = sectionHeaders(section);
      if (!rows.length) return `<h1>${String(index + 1).padStart(2, "0")} · ${text(titulo)}</h1><p class="nota">Sin información registrada todavía.</p>`;
      return `<h1>${String(index + 1).padStart(2, "0")} · ${text(titulo)}</h1>
        <table class="t">
          <tr>${headers.map((h) => `<th>${text(h)}</th>`).join("")}</tr>
          ${rows.map((r) => `<tr>${r.map((c) => `<td>${text(c || "")}</td>`).join("")}</tr>`).join("")}
        </table>`;
    })
    .join('<br clear="all" style="page-break-before:always" />');

  const doc = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="utf-8"><title>${text(wedding.couple)} — Dossier de boda</title>
<!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom></w:WordDocument></xml><![endif]-->
<style>
@page{size:A4;margin:2.2cm}
body{font-family:Georgia,serif;font-size:10.5pt;color:#25251f;line-height:1.5}
.portada{text-align:center;padding-top:5cm}
.portada .marca{font-size:9pt;letter-spacing:4pt;text-transform:uppercase;color:${P}}
.portada h1{font-size:34pt;font-weight:normal;margin:1.2cm 0 0.4cm}
.portada .rule{border-top:1px solid ${S};width:5cm;margin:0.8cm auto}
.portada .fecha{font-size:13pt;color:#5f6e64}
.portada .claim{margin-top:2.4cm;font-style:italic;font-size:11pt;color:${P}}
h1{font-size:17pt;font-weight:normal;color:${P};border-bottom:1.5pt solid ${S};padding-bottom:5pt;margin:0 0 12pt}
table.t{width:100%;border-collapse:collapse;margin-bottom:14pt}
table.t th{background:${P};color:#fff;padding:6pt;text-align:left;font-size:8.5pt;font-family:Arial,sans-serif}
table.t td{border-bottom:0.5pt solid #d9d4c6;padding:6pt;font-size:9pt;vertical-align:top}
.nota{color:#5f6e64;font-style:italic;font-size:9.5pt}
</style></head>
<body>
<div class="portada">
  <div class="marca">Events Planner · Wedding + Events</div>
  <h1>${text(wedding.couple)}</h1>
  <div class="rule"></div>
  <div class="fecha">${formatDate(wedding.date)}<br />${text(wedding.venue || "Lugar por definir")}</div>
  <div class="claim">Ideas · Plan · Grandes momentos</div>
</div>
<br clear="all" style="page-break-before:always" />
${cuerpo}
</body></html>`;

  // El BOM es lo que hace que Word respete los acentos al abrirlo.
  const blob = new Blob(["\ufeff", doc], { type: "application/msword" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Dossier ${wedding.couple.replace(/[^\p{L}\p{N}\s&-]/gu, "")}.doc`;
  a.click();
  URL.revokeObjectURL(url);

  addActivity(`Descargó el dossier en Word (${sections.length} secciones)`, state.user?.name, wedding.id);
  saveState();
  toast("Dossier descargado en Word. Puedes editarlo antes de entregarlo.", 4500);
}

function printDossier() {
  const wedding = getWedding();
  if (!wedding) return;
  const allowed = allowedReportSectionKeys();
  const sections = state.exportSelection.filter((section) => allowed.includes(section));
  if (!sections.length) {
    toast("Selecciona al menos una sección para generar el dossier");
    return;
  }
  const logo = new URL("./assets/brand/ep-logo.png", location.href).href;
  // Igual que el logo: la ventana de impresión es un documento nuevo y una
  // ruta relativa suelta ("./assets/...") puede no resolver contra el mismo
  // origen. Una URL absoluta funciona siempre. Las fotos ya en dataURL
  // (subidas a mano) empiezan por "data:" y se dejan tal cual.
  const coverPhoto = wedding.cover?.startsWith("data:") ? wedding.cover : new URL(wedding.cover || "./assets/fotos/acantilado-ceremonia.jpg", location.href).href;
  const rinconesForPrint = byWedding("rincones").filter((item) => item.active !== "No");
  const reportPages = sections.flatMap((section) => {
    if (section === "plano") return [{ section, plano: true, chunkIndex: 0, chunkTotal: 1 }];
    if (section === "rincones") {
      const pageSize = 4; // grid 2x2 de tarjetas con foto y miniaturas
      const chunks = rinconesForPrint.length ? Array.from({ length: Math.ceil(rinconesForPrint.length / pageSize) }, (_, index) => rinconesForPrint.slice(index * pageSize, (index + 1) * pageSize)) : [[]];
      return chunks.map((pageItems, chunkIndex) => ({ section, items: pageItems, chunkIndex, chunkTotal: chunks.length }));
    }
    const rows = exportRowsForAudience(section, state.exportAudience);
    const headers = sectionHeaders(section);
    // Filas por pagina, calculadas sobre el alto util real de una A4 con esta
    // maqueta (~210mm de zona de tabla). Los valores son conservadores a
    // proposito: una celda larga (alergias, notas) envuelve a 2-3 lineas y
    // antes desbordaba la pagina, que es lo que cortaba el diseño.
    const pageSize = headers.length >= 6 ? 11 : section === "guests" || section === "timeline" ? 13 : 15;
    const chunks = rows.length ? Array.from({ length: Math.ceil(rows.length / pageSize) }, (_, index) => rows.slice(index * pageSize, (index + 1) * pageSize)) : [[]];
    return chunks.map((pageRows, chunkIndex) => ({ section, headers, rows: pageRows, chunkIndex, chunkTotal: chunks.length }));
  });
  const totalPages = reportPages.length + 2; // portada + paginas de contenido + cierre con reflexion
  const reflectionQuote = nextReflectionQuote();
  const showPrice = state.exportAudience === "Equipo";
  const sectionHtml = reportPages.map((page, pageIndex) => `
    <section class="report-page">
      <header class="report-header">
        <img src="${logo}" alt="Events Planner" />
        <div><strong>${text(wedding.couple)}</strong><span>${formatDate(wedding.date)} · ${text(wedding.venue || "Lugar por definir")}</span></div>
      </header>
      <div class="section-heading" data-n="${String(sections.indexOf(page.section) + 1).padStart(2, "0")}">
        <span>Documento para ${text(state.exportAudience)}</span>
        <h2>${text(printTitle(page.section))}${page.chunkTotal > 1 ? ` <small>${page.chunkIndex + 1} de ${page.chunkTotal}</small>` : ""}</h2>
        <div class="section-rule"></div>
      </div>
      <div class="report-body">
      ${
        page.section === "plano"
          ? planoMesasSvg()
            ? `<div class="plano-wrap">${planoMesasSvg()}${planoResumen()}</div>`
            : `<div class="empty-print"><strong>Aún no hay mesas creadas</strong><p>Crea las mesas en la pestaña Mesas y colócalas en el plano. Aparecerán dibujadas aquí.</p></div>`
          : page.section === "rincones"
          ? page.items.length
            ? `<div class="rincon-print-grid">${page.items.map((item) => {
              const fotos = rinconGallery(item).filter((f) => f.kind !== "propuesta" || f.approved);
              const portada = fotos[0];
              const extra = fotos.slice(1, 3);
              const aMedida = fotos.some((f) => f.kind === "propuesta" && f.approved);
              return `<article class="rincon-print-card">
                ${portada ? `<img src="${text(fotoSrc(portada))}" alt="${text(item.name)}" />` : `<div class="rincon-print-noimg">Sin foto</div>`}
                ${extra.length ? `<div class="rincon-print-strip">${extra.map((f) => `<img src="${text(fotoSrc(f))}" alt="" />`).join("")}</div>` : ""}
                <h3>${text(item.name)}${showPrice && item.price ? ` · ${item.price} €` : ""}</h3>
                ${aMedida ? `<span class="rincon-print-tag">Diseño a medida para vosotros</span>` : ""}
                <p>${text(item.description || "")}</p>
              </article>`;
            }).join("")}</div>`
            : `<div class="empty-print"><strong>Aún no hay rincones registrados</strong><p>Añádelos y vuelve a generar el dossier para verlos aquí.</p></div>`
          : page.rows.length
            ? `<table><thead><tr>${page.headers.map((head) => `<th>${text(head)}</th>`).join("")}</tr></thead><tbody>${page.rows.map((row) => `<tr>${row.map((cell) => `<td>${text(cell || "")}</td>`).join("")}</tr>`).join("")}</tbody></table>`
            : `<div class="empty-print"><strong>Aún no hay información registrada</strong><p>Rellena este apartado y vuelve a generar el dossier para verlo aquí.</p></div>`
      }
      </div>
      <footer class="report-footer"><span>EVENTS PLANNER</span><div class="footer-palette"><i></i><i></i><i></i></div><span>Página ${pageIndex + 2} de ${totalPages}</span></footer>
    </section>
  `).join("");
  const contents = sections.map((section, index) => `<li><b>${String(index + 1).padStart(2, "0")}</b> ${text(printTitle(section))}</li>`).join("");
  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${text(wedding.couple)} - Dossier de boda</title><style>
    :root{--primary:${text(wedding.palettePrimary)};--secondary:${text(wedding.paletteSecondary)};--accent:${text(wedding.paletteAccent)};--ep:#33473f;--ink:#25251f;--muted:#706d63;--line:#d9d4c6}
    *{box-sizing:border-box;overflow-wrap:anywhere}html,body{margin:0;background:#ece9e1;color:var(--ink);font-family:Arial,sans-serif}body{-webkit-print-color-adjust:exact;print-color-adjust:exact}.cover,.report-page{position:relative;display:flex;flex-direction:column;width:210mm;height:297mm;margin:0 auto 10mm;background:#fff;page-break-after:always;page-break-inside:avoid;overflow:hidden}.report-page:last-of-type,.closing{page-break-after:auto}.cover{position:relative;padding:0;overflow:hidden;background:#f4efe4}.cover-photo{position:absolute;inset:0 0 50% 0;background-size:cover;background-position:center;background-color:var(--primary)}.cover-photo:after{content:'';position:absolute;inset:0;background:linear-gradient(180deg,rgba(32, 35, 13,.34) 0%,rgba(32, 35, 13,.06) 45%,rgba(244, 239, 228,.9) 88%,#f4efe4 100%)}.cover-mark{position:absolute;top:16mm;left:0;right:0;text-align:center;z-index:2}.cover-mark img{width:44mm;height:auto;filter:brightness(0) invert(1)}.cover-audience{position:absolute;top:16mm;right:18mm;z-index:2;padding:2.6mm 5mm;border:1px solid rgba(255,255,255,.55);border-radius:20mm;color:#fff;font-size:7.5pt;font-weight:700;letter-spacing:.14em;text-transform:uppercase}.cover-body{position:absolute;left:18mm;right:18mm;top:53%;z-index:2;text-align:center}.cover-kicker{display:block;margin-bottom:7mm;color:var(--primary);font-size:8pt;font-weight:700;letter-spacing:.3em;text-transform:uppercase}.cover h1{margin:0;font:normal 44pt/1.06 Georgia,serif;color:var(--ink);letter-spacing:.01em}.cover-rule{width:22mm;height:1px;margin:8mm auto;background:var(--secondary)}.cover-date{margin:0;color:var(--muted);font-size:11.5pt;line-height:1.85}.cover-date b{display:block;margin-bottom:2mm;color:var(--ep);font-size:13pt;font-weight:normal;font-family:Georgia,serif}.cover-foot{position:absolute;left:18mm;right:18mm;bottom:12mm;z-index:2;display:flex;flex-direction:column;align-items:center;gap:7mm}.cover-claim{margin:0;text-align:center;font:italic 11pt/1.6 Georgia,serif;color:var(--ep)}.cover-palette{display:flex;justify-content:center;gap:4mm}.cover-palette i{display:block;width:10mm;height:10mm;border-radius:50%;border:1.5px solid #fff;box-shadow:0 1mm 3mm rgba(32, 35, 13,.16)}.cover-index{width:100%;margin:0;padding:6mm 0 0;display:flex;flex-wrap:wrap;justify-content:center;gap:2.4mm 5mm;border-top:1px solid var(--line)}.cover-index li{list-style:none;color:var(--muted);font-size:7.5pt;letter-spacing:.04em}.cover-index li b{color:var(--primary);font-weight:700}.cover-footer{width:100%;display:flex;justify-content:space-between;margin-top:1mm;z-index:2;display:flex;justify-content:space-between;color:var(--muted);font-size:6.8pt;letter-spacing:.1em;text-transform:uppercase}.report-page{padding:15mm 15mm 0;background:#fff}.report-page:before{content:'';position:absolute;left:0;top:0;right:0;height:2.5mm;background:linear-gradient(90deg,var(--primary) 0%,var(--primary) 46%,var(--secondary) 46%,var(--secondary) 74%,var(--accent) 74%,var(--accent) 100%)}.report-header{display:flex;align-items:center;justify-content:space-between;padding-bottom:5mm;border-bottom:1px solid var(--line)}.report-header img{width:33mm;height:auto}.report-header div{text-align:right}.report-header strong,.report-header span{display:block}.report-header strong{font:normal 13pt Georgia,serif}.report-header span{margin-top:1.5mm;color:var(--muted);font-size:7.5pt}.section-heading{position:relative;margin:12mm 0 9mm;text-align:center}.section-heading:before{content:attr(data-n);position:absolute;top:-9mm;left:0;right:0;font:normal 40pt Georgia,serif;color:var(--accent);opacity:.55;z-index:0}.section-heading>*{position:relative;z-index:1}.section-heading>span{display:block;color:var(--primary);font-size:7pt;font-weight:700;text-transform:uppercase;letter-spacing:.2em}.section-heading h2{margin:2.5mm 0 0;font:normal 25pt Georgia,serif;color:var(--ink)}.section-heading h2 small{color:var(--muted);font:normal 9pt Arial,sans-serif}.section-rule{width:16mm;height:1px;margin:4mm auto 0;background:var(--secondary)}.report-body{flex:1 1 auto;min-height:0;overflow:hidden}.report-body>table,.report-body>.plano-wrap,.report-body>.rincon-print-grid,.report-body>.empty-print{margin-top:2mm}table{width:100%;border-collapse:collapse;table-layout:fixed;background:white;page-break-inside:auto}thead{display:table-header-group}tfoot{display:table-footer-group}th{padding:3.4mm 2.5mm;background:var(--primary);border-right:1px solid #ffffff33;color:#fff;text-align:left;font-size:7pt;font-weight:700;letter-spacing:.09em;text-transform:uppercase}td{padding:2.9mm 2.5mm;border:0;border-bottom:1px solid var(--line);font-size:7.6pt;line-height:1.4;vertical-align:top;overflow-wrap:anywhere}tbody tr:nth-child(even) td{background:#faf9f4;background:color-mix(in srgb,var(--accent) 18%,white)}tbody tr td:first-child{font-weight:700;color:var(--ep)}tr{page-break-inside:avoid;break-inside:avoid}.plano-wrap{display:flex;flex-direction:column;gap:6mm;align-items:center}.plano-svg{width:100%;max-width:170mm;max-height:170mm;height:auto;display:block}.plano-resumen{display:flex;flex-wrap:wrap;justify-content:center;gap:3mm 8mm;width:100%;padding:4mm;border:1px solid var(--line);background:#faf9f4}.plano-resumen span{color:var(--muted);font-size:8.5pt;line-height:1.5}.plano-resumen strong{color:var(--ep);font-size:11pt}.empty-print{padding:12mm;border:1px solid var(--line);border-left:3mm solid var(--secondary);background:color-mix(in srgb,var(--accent) 22%,white)}.empty-print strong{display:block;margin-bottom:3mm;font:normal 15pt Georgia,serif}.empty-print p{margin:0;color:var(--muted);font-size:9pt;line-height:1.6}.report-footer{flex:0 0 auto;margin-top:auto;display:grid;grid-template-columns:1fr auto 1fr;align-items:center;padding:3mm 0 9mm;border-top:1px solid var(--line);color:var(--muted);font-size:6.8pt}.report-footer>span:last-child{text-align:right}.footer-palette{display:flex;width:24mm;height:2mm}.footer-palette i{flex:1}.footer-palette i:nth-child(1){background:var(--primary)}.footer-palette i:nth-child(2){background:var(--secondary)}.footer-palette i:nth-child(3){background:var(--accent)}.rincon-print-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:6mm}.rincon-print-card{border:1px solid var(--line);border-radius:2mm;overflow:hidden;background:white;page-break-inside:avoid}.rincon-print-card img{width:100%;height:38mm;object-fit:cover;display:block}.rincon-print-noimg{width:100%;height:38mm;display:flex;align-items:center;justify-content:center;background:color-mix(in srgb,var(--accent) 30%,white);color:var(--muted);font-size:8pt}.rincon-print-strip{display:flex;gap:1mm;padding:1mm 1mm 0}.rincon-print-strip img{flex:1;height:14mm;object-fit:cover;border-radius:1mm;display:block}.rincon-print-tag{display:inline-block;margin:0 4mm 1mm;padding:1mm 3mm;border-radius:10mm;background:var(--accent);color:var(--ep);font-size:6.8pt;font-weight:700;letter-spacing:.06em;text-transform:uppercase}.rincon-print-card h3{margin:3.5mm 4mm 2mm;font:normal 11pt Georgia,serif;line-height:1.3}.rincon-print-card p{margin:0 4mm 4.5mm;color:var(--muted);font-size:8pt;line-height:1.55}.closing{display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:20mm}.closing:before{content:'';position:absolute;left:0;top:0;bottom:0;width:3mm;background:var(--primary)}.closing-mark{width:11mm;height:11mm;border-radius:50%;background:var(--primary);margin-bottom:10mm}.closing blockquote{margin:0;max-width:130mm;font:italic normal 17pt/1.55 Georgia,serif;color:var(--ink)}.closing blockquote:before{content:'“'}.closing blockquote:after{content:'”'}.closing cite{display:block;margin-top:10mm;font:normal 8pt Arial,sans-serif;color:var(--primary);text-transform:uppercase;letter-spacing:.16em;font-style:normal}@page{size:A4;margin:0}@media print{html,body{background:white}.cover,.report-page,.closing{margin:0;width:210mm;min-height:297mm}}
  </style></head><body><section class="cover"><div class="cover-photo" style="background-image:url('${text(coverPhoto)}')"></div><div class="cover-mark"><img src="${logo}" alt="Events Planner"></div><span class="cover-audience">${text(state.exportAudience)}</span><div class="cover-body"><span class="cover-kicker">Dossier de boda</span><h1>${text(wedding.couple)}</h1><div class="cover-rule"></div><p class="cover-date"><b>${formatDate(wedding.date)}</b>${text(wedding.venue || "Lugar por definir")}</p></div><div class="cover-foot"><p class="cover-claim">Ideas, plan y<br>grandes momentos.</p><div class="cover-palette"><i style="background:var(--primary)"></i><i style="background:var(--secondary)"></i><i style="background:var(--accent)"></i></div><ul class="cover-index">${contents}</ul><div class="cover-footer"><span>Events Planner · Wedding + Events</span><span>Ideas · Plan · Grandes momentos</span></div></div></section>${sectionHtml}<section class="closing report-page"><div class="closing"><span class="closing-mark"></span><blockquote>${text(reflectionQuote)}</blockquote><cite>Events Planner · ${text(wedding.couple)}</cite></div><footer class="report-footer"><span>EVENTS PLANNER</span><div class="footer-palette"><i></i><i></i><i></i></div><span>Página ${totalPages} de ${totalPages}</span></footer></section><script>window.addEventListener('load',()=>window.print())<\/script></body></html>`;
  if (openPrintDocument(html)) {
    addActivity(`Generó dossier para ${state.exportAudience}: ${sections.map(printTitle).join(", ")}`, state.user?.name, wedding.id);
    saveState();
  }
}

export { allowedReportSectionKeys, exportDossierWord, confirmPrintOptions, exportRowsForAudience, openPrintDocument, printDossier, printSection, printTitle, renderExport, renderReportChecklist, reportSections, sectionHeaders, sectionRows, toggleExportAll };
