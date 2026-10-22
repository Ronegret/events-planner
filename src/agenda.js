import { icono } from "./iconos.js";
import { badge } from "./charts.js";
import { addActivity, opcionesEquipo, openConfirmModal, openFormModal } from "./modals.js";
import { render } from "./render.js";
import { byWeddingId, cuando, formatDate, saveState, sortedWeddings, state, text, toast, uid } from "./state.js";

// ============================================================================
// Agenda de reuniones
// ----------------------------------------------------------------------------
// Una boda no se organiza en una reunión: se organiza en ocho o diez, cada una
// con su tema, y lo que se decide en cada una es lo que hace avanzar el resto.
// Hasta ahora eso vivía en el calendario del móvil de la coordinadora, así que si
// entraba otra persona no sabía ni cuándo era la próxima ni qué se había
// acordado en la anterior.
//
// Dos vistas de lo mismo:
//   · Agenda global — todas las bodas juntas, para ver la semana de un vistazo.
//   · Dentro de la boda — solo las suyas, con lo que se acordó en cada una.
//   · Y en el portal, la pareja ve las que vienen.
//
// Sobre Google Calendar: en lugar de montar OAuth —que obliga a un servidor,
// a credenciales y a un consentimiento que caduca—, cada reunión genera un
// enlace de "Añadir a Google Calendar" y un archivo .ics. Funciona hoy, sin
// infraestructura, y sirve igual para Google, Outlook o Apple. Cuando esto
// esté en un servidor de verdad se puede automatizar del todo.
// ============================================================================

const TIPOS_REUNION = [
  "Primera reunión",
  "Seguimiento",
  "Prueba de menú",
  "Visita al espacio",
  "Cierre de proveedores",
  "Prueba de peluquería y maquillaje",
  "Repaso final",
  "Otra",
];

const ESTADOS_REUNION = ["Propuesta", "Confirmada", "Celebrada", "Cancelada"];
const MODOS = ["Videollamada", "Presencial", "Teléfono"];

function reunionesDe(weddingId) {
  return byWeddingId("meetings", weddingId).slice().sort(porFecha);
}

function porFecha(a, b) {
  return `${a.fecha || "9999"} ${a.hora || "99:99"}`.localeCompare(`${b.fecha || "9999"} ${b.hora || "99:99"}`);
}

/** Todas las reuniones de todas las bodas, en orden. */
function todasLasReuniones() {
  return state.meetings.slice().sort(porFecha);
}

function esFutura(r) {
  if (!r.fecha) return false;
  const cuandoEs = new Date(`${r.fecha}T${r.hora || "23:59"}`);
  return cuandoEs >= new Date(new Date().toDateString()) && r.estado !== "Cancelada" && r.estado !== "Celebrada";
}

/** La próxima reunión de una boda, que es lo que casi siempre se busca. */
function proximaReunion(weddingId) {
  return reunionesDe(weddingId).find(esFutura) || null;
}

// ---------------------------------------------------------------------------
// Alta y edición
// ---------------------------------------------------------------------------
const CAMPOS = [
  { name: "titulo", label: "De qué va", required: true, wide: true, placeholder: "Ej. Cerrar flores y decoración" },
  { name: "tipo", label: "Tipo", options: TIPOS_REUNION },
  { name: "fecha", label: "Día", type: "date", required: true },
  { name: "hora", label: "Hora", type: "time" },
  { name: "duracion", label: "Duración (min)", type: "number" },
  { name: "modo", label: "Cómo", options: MODOS },
  { name: "lugar", label: "Dónde o enlace", wide: true, placeholder: "Meet, Zoom, la finca, una cafetería…" },
  { name: "responsable", label: "Por parte del equipo", options: () => opcionesEquipo() },
  { name: "conNovios", label: "¿Vienen los novios?", options: ["Sí", "No"] },
  { name: "estado", label: "Estado", options: ESTADOS_REUNION },
  { name: "temas", label: "Qué hay que tratar", type: "textarea", wide: true, placeholder: "El guion de la reunión. Lo que no se apunta, se olvida." },
];

function nuevaReunion(weddingId, fecha = "") {
  const esAgendaGlobal = weddingId === "agenda-global";
  const id = esAgendaGlobal ? "" : weddingId || state.selectedWeddingId;
  const bodas = sortedWeddings();
  if (!id && !bodas.length) {
    toast("Crea una boda primero y luego agenda la reunión.");
    return;
  }
  const bodaInicial = state.weddings.find((w) => w.id === id) || bodas[0];
  const fields = id
    ? CAMPOS
    : [{ name: "boda", label: "Boda", required: true, wide: true, options: bodas.map((w) => w.couple) }, ...CAMPOS];
  openFormModal({
    intent: "crear-reunion",
    itemId: id || "agenda-global",
    title: "Nueva reunión",
    kicker: "Agenda",
    submitLabel: "Añadir a la agenda",
    values: {
      tipo: "Seguimiento",
      modo: "Videollamada",
      duracion: 60,
      hora: "18:00",
      fecha,
      boda: bodaInicial?.couple || "",
      conNovios: "Sí",
      estado: "Propuesta",
      responsable: state.user?.name || "Equipo",
    },
    fields,
  });
}

function editarReunion(id) {
  const r = state.meetings.find((m) => m.id === id);
  if (!r) return;
  openFormModal({
    intent: "editar-reunion",
    itemId: id,
    title: "Editar reunión",
    kicker: "Agenda",
    submitLabel: "Guardar",
    values: { ...r },
    fields: CAMPOS,
  });
}

function datosReunion(values) {
  return {
    titulo: String(values.titulo || "").trim() || "Reunión",
    tipo: values.tipo || "Seguimiento",
    fecha: values.fecha || "",
    hora: values.hora || "",
    duracion: Number(values.duracion) || 60,
    modo: values.modo || "Videollamada",
    lugar: String(values.lugar || "").trim(),
    responsable: values.responsable === "Sin asignar" ? "" : String(values.responsable || "").trim(),
    conNovios: values.conNovios !== "No",
    estado: values.estado || "Propuesta",
    temas: String(values.temas || "").trim(),
  };
}

function crearReunion(weddingId, values) {
  if (weddingId === "agenda-global") {
    weddingId = state.weddings.find((w) => w.couple === values.boda)?.id || "";
  }
  if (!weddingId) {
    toast("Elige la boda a la que pertenece esta reunión.");
    return;
  }
  const datos = datosReunion(values);
  const r = { id: uid("mt"), weddingId, createdAt: new Date().toISOString(), acuerdos: "", ...datos };
  state.meetings.push(r);
  addActivity(`Agendó «${r.titulo}» para el ${formatDate(r.fecha)}${r.hora ? ` a las ${r.hora}` : ""}`, state.user?.name, weddingId);
  state.modal = null;
  saveState();
  render();
  toast(r.conNovios ? "Reunión agendada. Los novios ya la ven en su portal." : "Reunión agendada.", 5000);
}

function guardarReunion(id, values) {
  const r = state.meetings.find((m) => m.id === id);
  if (!r) return;
  const antes = `${r.fecha} ${r.hora}`;
  Object.assign(r, datosReunion(values));
  const cambioFecha = antes !== `${r.fecha} ${r.hora}`;
  addActivity(
    cambioFecha ? `Movió «${r.titulo}» al ${formatDate(r.fecha)}${r.hora ? ` a las ${r.hora}` : ""}` : `Actualizó la reunión «${r.titulo}»`,
    state.user?.name,
    r.weddingId
  );
  state.modal = null;
  saveState();
  render();
}

/** Lo que se acordó. Es la mitad que se pierde si solo se agenda la reunión. */
function anotarAcuerdos(id) {
  const r = state.meetings.find((m) => m.id === id);
  if (!r) return;
  openFormModal({
    intent: "acuerdos-reunion",
    itemId: id,
    title: `Qué se acordó · ${r.titulo}`,
    kicker: "Agenda",
    submitLabel: "Guardar y marcar como celebrada",
    values: { acuerdos: r.acuerdos || "" },
    fields: [
      {
        name: "acuerdos",
        label: "Acuerdos de la reunión",
        type: "textarea",
        wide: true,
        help: "Lo que se decidió, con nombres y cifras. Dentro de tres meses nadie recordará si el ramo era de peonías o de ranúnculos.",
      },
    ],
  });
}

function guardarAcuerdos(id, values) {
  const r = state.meetings.find((m) => m.id === id);
  if (!r) return;
  r.acuerdos = String(values.acuerdos || "").trim();
  r.estado = "Celebrada";
  r.celebradaAt = new Date().toISOString();
  addActivity(`Anotó los acuerdos de «${r.titulo}»`, state.user?.name, r.weddingId);
  state.modal = null;
  saveState();
  render();
}

function borrarReunion(id) {
  const r = state.meetings.find((m) => m.id === id);
  if (!r) return;
  openConfirmModal({
    intent: "delete-meeting",
    itemId: id,
    kicker: "Agenda",
    title: "¿Quitar esta reunión?",
    message: `Se quitará «${r.titulo}» de la agenda. Esta acción quedará registrada en la actividad de la boda.`,
    confirmLabel: "Sí, quitar reunión",
  });
}

function borrarReunionConfirmada(id) {
  const r = state.meetings.find((m) => m.id === id);
  if (!r) return;
  state.meetings = state.meetings.filter((m) => m.id !== id);
  addActivity(`Quitó de la agenda «${r.titulo}»`, state.user?.name, r.weddingId);
  state.modal = null;
  saveState();
  render();
}

// ---------------------------------------------------------------------------
// Llevarla al calendario de verdad
// ---------------------------------------------------------------------------
function marcasDeTiempo(r) {
  const ini = new Date(`${r.fecha}T${r.hora || "10:00"}`);
  const fin = new Date(ini.getTime() + (Number(r.duracion) || 60) * 60000);
  const fmt = (d) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  return { ini: fmt(ini), fin: fmt(fin) };
}

function descripcionReunion(r) {
  const boda = state.weddings.find((w) => w.id === r.weddingId);
  return [
    boda ? `Boda de ${boda.couple}` : "",
    r.temas ? `\nA tratar:\n${r.temas}` : "",
    r.responsable ? `\nPor parte del equipo: ${r.responsable}` : "",
  ]
    .filter(Boolean)
    .join("");
}

/**
 * Enlace de «Añadir a Google Calendar». Es un enlace normal: no hace falta
 * OAuth, ni servidor, ni permisos que caducan. Se abre, se acepta y queda.
 */
function urlGoogleCalendar(r) {
  if (!r.fecha) return "";
  const { ini, fin } = marcasDeTiempo(r);
  const boda = state.weddings.find((w) => w.id === r.weddingId);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: `${r.titulo}${boda ? ` · ${boda.couple}` : ""}`,
    dates: `${ini}/${fin}`,
    details: descripcionReunion(r),
    location: r.lugar || "",
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/** Archivo .ics: vale para Outlook, Apple y cualquier otro calendario. */
function descargarIcs(id) {
  const r = state.meetings.find((m) => m.id === id);
  if (!r?.fecha) {
    toast("A esta reunión le falta la fecha. Añádela para descargar el archivo.");
    return;
  }
  const { ini, fin } = marcasDeTiempo(r);
  const boda = state.weddings.find((w) => w.id === r.weddingId);
  const esc = (v) => String(v || "").replace(/([,;\\])/g, "\\$1").replace(/\n/g, "\\n");
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Events Planner//Events Planner//ES",
    "BEGIN:VEVENT",
    `UID:${r.id}@eventsplanner`,
    `DTSTAMP:${marcasDeTiempo({ fecha: new Date().toISOString().slice(0, 10), hora: "12:00", duracion: 1 }).ini}`,
    `DTSTART:${ini}`,
    `DTEND:${fin}`,
    `SUMMARY:${esc(`${r.titulo}${boda ? ` · ${boda.couple}` : ""}`)}`,
    `DESCRIPTION:${esc(descripcionReunion(r))}`,
    r.lugar ? `LOCATION:${esc(r.lugar)}` : "",
    "BEGIN:VALARM",
    "TRIGGER:-PT1H",
    "ACTION:DISPLAY",
    "DESCRIPTION:Recordatorio",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ]
    .filter(Boolean)
    .join("\r\n");

  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${r.titulo.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.ics`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Aviso por WhatsApp a la pareja, con el texto ya escrito. */
function avisarPorWhatsapp(id) {
  const r = state.meetings.find((m) => m.id === id);
  const boda = r && state.weddings.find((w) => w.id === r.weddingId);
  if (!r || !boda) return "";
  const texto = `¡Hola! Os recordamos que tenemos ${r.titulo.toLowerCase()} el ${formatDate(r.fecha)}${r.hora ? ` a las ${r.hora}` : ""}${r.lugar ? ` · ${r.lugar}` : ""}. ¡Nos vemos! — Events Planner`;
  return `https://wa.me/?text=${encodeURIComponent(texto)}`;
}

// ---------------------------------------------------------------------------
// Vistas
// ---------------------------------------------------------------------------
/** Una reunión, tal como se ve en cualquiera de las tres pantallas. */
function renderReunion(r, { conBoda = false, soloLectura = false } = {}) {
  const boda = state.weddings.find((w) => w.id === r.weddingId);
  const pasada = r.estado === "Celebrada";
  const cancelada = r.estado === "Cancelada";
  const hoy = r.fecha === new Date().toISOString().slice(0, 10);

  return `
    <article class="reunion${pasada ? " pasada" : ""}${cancelada ? " cancelada" : ""}${hoy ? " hoy" : ""}">
      <div class="reunion-fecha">
        <span class="reunion-dia">${r.fecha ? new Date(r.fecha + "T12:00").getDate() : "—"}</span>
        <span class="reunion-mes">${r.fecha ? new Date(r.fecha + "T12:00").toLocaleDateString("es-ES", { month: "short" }) : ""}</span>
        ${r.hora ? `<span class="reunion-hora">${text(r.hora)}</span>` : ""}
      </div>

      <div class="reunion-cuerpo">
        <h4>${text(r.titulo)}${hoy ? ` <span class="reunion-hoy">hoy</span>` : ""}</h4>
        <p class="reunion-meta">
          <span>${text(r.tipo)}</span>
          <span>${text(r.modo)}${r.lugar ? ` · ${text(r.lugar)}` : ""}</span>
          ${conBoda && boda ? `<span class="reunion-boda">${text(boda.couple)}</span>` : ""}
          ${r.responsable ? `<span>${text(r.responsable)}</span>` : ""}
          ${r.conNovios ? `<span class="reunion-connovios">con los novios</span>` : ""}
        </p>
        ${r.temas ? `<p class="reunion-temas">${text(r.temas)}</p>` : ""}
        ${r.acuerdos ? `<div class="reunion-acuerdos"><strong>Se acordó:</strong> ${text(r.acuerdos)}</div>` : ""}
      </div>

      <div class="reunion-lado">
        ${badge(r.estado, pasada ? "verde" : cancelada ? "rojo" : r.estado === "Confirmada" ? "verde" : "mostaza")}
        ${
          soloLectura
            ? r.fecha
              ? `<a class="mini-btn" href="${urlGoogleCalendar(r)}" target="_blank" rel="noopener noreferrer" title="Añadir a vuestro calendario">＋ Calendario</a>`
              : ""
            : `<div class="inline-tools">
                <a class="mini-btn agenda-action" href="${urlGoogleCalendar(r)}" target="_blank" rel="noopener noreferrer" title="Añadir a Google Calendar"><span aria-hidden="true">＋</span> Google</a>
                <button class="mini-btn agenda-action" data-ics-reunion="${r.id}" title="Descargar para Outlook o Apple"><span aria-hidden="true">↓</span> Archivo</button>
                ${r.conNovios ? `<a class="mini-btn agenda-action" href="${avisarPorWhatsapp(r.id)}" target="_blank" rel="noopener noreferrer" title="Recordárselo por WhatsApp"><span aria-hidden="true">↗</span> WhatsApp</a>` : ""}
                ${pasada ? "" : `<button class="mini-btn agenda-action agenda-action-emphasis" data-acuerdos-reunion="${r.id}" title="Anotar lo que se acordó"><span aria-hidden="true">${icono("editar")}</span> Acuerdos</button>`}
                <button class="mini-btn agenda-action" data-editar-reunion="${r.id}" title="Editar reunión"><span aria-hidden="true">${icono("editar")}</span> Editar</button>
                <button class="mini-btn agenda-action agenda-action-delete" data-borrar-reunion="${r.id}" title="Quitar de la agenda" aria-label="Quitar ${text(r.titulo)} de la agenda"><span aria-hidden="true">${icono("cerrar")}</span></button>
              </div>`
        }
      </div>
    </article>
  `;
}

function fechaLocalISO(fecha = new Date()) {
  const year = fecha.getFullYear();
  const month = String(fecha.getMonth() + 1).padStart(2, "0");
  const day = String(fecha.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function mesAgendaDate() {
  const value = /^\d{4}-\d{2}$/.test(state.agendaMes || "") ? state.agendaMes : fechaLocalISO().slice(0, 7);
  const [year, month] = value.split("-").map(Number);
  return new Date(year, month - 1, 1, 12);
}

function moverMesAgenda(delta) {
  const date = mesAgendaDate();
  date.setMonth(date.getMonth() + Number(delta || 0));
  state.agendaMes = fechaLocalISO(date).slice(0, 7);
  state.agendaFecha = "";
  saveState();
  render();
}

function irAgendaHoy() {
  state.agendaMes = fechaLocalISO().slice(0, 7);
  state.agendaFecha = fechaLocalISO();
  saveState();
  render();
}

function seleccionarFechaAgenda(fecha) {
  state.agendaFecha = state.agendaFecha === fecha ? "" : fecha;
  saveState();
  render();
}

function cambiarVistaAgenda(vista) {
  state.agendaVista = vista === "lista" ? "lista" : "mes";
  state.agendaFecha = "";
  saveState();
  render();
}

function renderResumenAgenda(reuniones) {
  const hoy = fechaLocalISO();
  const futuras = reuniones.filter(esFutura);
  const estaSemana = futuras.filter((r) => {
    const dias = (new Date(`${r.fecha}T12:00`) - new Date(`${hoy}T12:00`)) / 86400000;
    return dias >= 0 && dias <= 7;
  });
  const items = [
    [reuniones.filter((r) => r.fecha === hoy && r.estado !== "Cancelada").length, "Hoy"],
    [estaSemana.length, "Próximos 7 días"],
    [futuras.filter((r) => r.estado === "Confirmada").length, "Confirmadas"],
    [futuras.filter((r) => r.estado === "Propuesta").length, "Por confirmar"],
  ];
  return `<div class="agenda-summary" aria-label="Resumen de agenda">${items
    .map(([value, label]) => `<div class="agenda-summary-item"><strong>${value}</strong><span>${label}</span></div>`)
    .join("")}</div>`;
}

function renderCalendarioMensual(reuniones) {
  const monthDate = mesAgendaDate();
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstOffset = (monthDate.getDay() + 6) % 7;
  const gridStart = new Date(year, month, 1 - firstOffset, 12);
  const hoy = fechaLocalISO();
  const monthKey = fechaLocalISO(monthDate).slice(0, 7);
  const meetingsByDate = new Map();
  reuniones.forEach((r) => {
    if (!r.fecha) return;
    if (!meetingsByDate.has(r.fecha)) meetingsByDate.set(r.fecha, []);
    meetingsByDate.get(r.fecha).push(r);
  });
  const days = Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);
    const iso = fechaLocalISO(date);
    const dayMeetings = meetingsByDate.get(iso) || [];
    const outside = iso.slice(0, 7) !== monthKey;
    const selected = state.agendaFecha === iso;
    const label = date.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" });
    return `<button class="agenda-day${outside ? " outside" : ""}${iso === hoy ? " today" : ""}${selected ? " selected" : ""}${dayMeetings.length ? " has-events" : ""}"
      data-agenda-fecha="${iso}" aria-label="${text(label)}${dayMeetings.length ? `, ${dayMeetings.length} reunión${dayMeetings.length === 1 ? "" : "es"}` : ", sin reuniones"}"${iso === hoy ? ' aria-current="date"' : ""}${selected ? ' aria-pressed="true"' : ' aria-pressed="false"'}>
      <span class="agenda-day-number">${date.getDate()}</span>
      <span class="agenda-day-events" aria-hidden="true">${dayMeetings.slice(0, 2).map((r) => `<i class="${r.estado.toLowerCase()}"></i>`).join("")}</span>
      ${dayMeetings.length ? `<span class="agenda-day-count">${dayMeetings.length}</span>` : ""}
    </button>`;
  }).join("");
  const title = monthDate.toLocaleDateString("es-ES", { month: "long", year: "numeric" });
  return `<section class="agenda-calendar" aria-label="Calendario de ${text(title)}">
    <div class="agenda-calendar-head">
      <div>
        <span class="agenda-calendar-kicker">Vista mensual</span>
        <h4>${text(title.charAt(0).toUpperCase() + title.slice(1))}</h4>
      </div>
      <div class="agenda-calendar-nav" aria-label="Navegar por meses">
        <button class="mini-btn icon-only" data-agenda-mes="-1" aria-label="Mes anterior" title="Mes anterior">‹</button>
        <button class="mini-btn" data-agenda-hoy>Hoy</button>
        <button class="mini-btn icon-only" data-agenda-mes="1" aria-label="Mes siguiente" title="Mes siguiente">›</button>
      </div>
    </div>
    <div class="agenda-weekdays" aria-hidden="true">${["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((d) => `<span>${d}</span>`).join("")}</div>
    <div class="agenda-days">${days}</div>
    <div class="agenda-calendar-legend" aria-label="Leyenda"><span><i class="confirmada"></i> Confirmada</span><span><i class="propuesta"></i> Propuesta</span><span><i class="celebrada"></i> Celebrada</span></div>
  </section>`;
}

/** Agenda global: todas las bodas juntas, agrupadas por mes. */
function renderAgendaGlobal() {
  const filtro = state.agendaFiltro || "Todas";
  // Por defecto solo se muestran las que vienen; pero si no hay ninguna futura
  // (todas las bodas ya se celebraron, como las de referencia), se muestran
  // también las pasadas para que la lista no aparezca vacía. En cuanto se elige
  // una opción del desplegable, esa elección manda.
  const soloFuturas =
    state.agendaSoloFuturas === undefined
      ? todasLasReuniones().some(esFutura)
      : state.agendaSoloFuturas !== false;
  const vista = state.agendaVista === "lista" ? "lista" : "mes";

  let reunionesBase = todasLasReuniones();
  if (filtro !== "Todas") reunionesBase = reunionesBase.filter((r) => r.weddingId === filtro);
  let reuniones = reunionesBase.slice();
  if (soloFuturas && vista === "lista") reuniones = reuniones.filter(esFutura);
  if (vista === "mes") {
    const monthKey = fechaLocalISO(mesAgendaDate()).slice(0, 7);
    reuniones = reuniones.filter((r) => (state.agendaFecha ? r.fecha === state.agendaFecha : r.fecha?.slice(0, 7) === monthKey));
  }

  const grupos = new Map();
  reuniones.forEach((r) => {
    const clave = r.fecha ? new Date(r.fecha + "T12:00").toLocaleDateString("es-ES", { month: "long", year: "numeric" }) : "Sin fecha";
    if (!grupos.has(clave)) grupos.set(clave, []);
    grupos.get(clave).push(r);
  });

  const estaSemana = reunionesBase.filter((r) => {
    if (!esFutura(r)) return false;
    const dias = (new Date(`${r.fecha}T12:00`) - new Date(new Date().toDateString())) / 86400000;
    return dias <= 7;
  });

  return `
    <section class="panel agenda-panel">
      <div class="panel-head">
        <div>
          <h3 class="card-title">Reuniones</h3>
          <p class="card-sub">Las reuniones de todas las bodas.${estaSemana.length ? ` <strong>${estaSemana.length}</strong> esta semana.` : " Nada en los próximos siete días."}</p>
        </div>
        <button class="btn primary" data-nueva-reunion="agenda-global"><span class="icon-btn">+</span> Nueva reunión</button>
      </div>

      ${renderResumenAgenda(reunionesBase)}

      <div class="agenda-toolbar">
        <div class="agenda-view-switch" role="group" aria-label="Vista de agenda">
          <button class="${vista === "mes" ? "active" : ""}" data-agenda-vista="mes" aria-pressed="${vista === "mes"}">▦ Mes</button>
          <button class="${vista === "lista" ? "active" : ""}" data-agenda-vista="lista" aria-pressed="${vista === "lista"}">☷ Lista</button>
        </div>
        <div class="filters-row">
        <label class="filter-field">
          <span>Boda</span>
          <select data-agenda-filtro>
            <option value="Todas"${filtro === "Todas" ? " selected" : ""}>Todas las bodas</option>
            ${sortedWeddings().map((w) => `<option value="${w.id}"${filtro === w.id ? " selected" : ""}>${text(w.couple)}</option>`).join("")}
          </select>
        </label>
        ${
          // En vista de mes el filtro es el mes: mover este selector no cambiaba
          // nada en pantalla y parecía averiado. Ahí decide el calendario.
          vista === "lista"
            ? `<label class="filter-field">
          <span>Mostrar</span>
          <select data-agenda-pasadas>
            <option${soloFuturas ? " selected" : ""}>Solo las que vienen</option>
            <option${soloFuturas ? "" : " selected"}>También las pasadas</option>
          </select>
        </label>`
            : ""
        }
        </div>
      </div>

      ${vista === "mes" ? renderCalendarioMensual(reunionesBase) : ""}
      ${vista === "mes" && state.agendaFecha ? `<div class="agenda-selection-head"><div><span>Fecha seleccionada</span><strong>${text(formatDate(state.agendaFecha))}</strong></div><button class="mini-btn" data-nueva-reunion="agenda-global" data-reunion-fecha="${state.agendaFecha}">+ Agendar este día</button></div>` : ""}

      ${
        reuniones.length
          ? [...grupos.entries()]
              .map(
                ([mes, lista]) => `<div class="agenda-mes">
                  <h4 class="agenda-mes-titulo">${vista === "mes" && state.agendaFecha ? `Reuniones del ${text(formatDate(state.agendaFecha))}` : text(mes)}</h4>
                  <div class="reuniones">${lista.map((r) => renderReunion(r, { conBoda: filtro === "Todas" })).join("")}</div>
                </div>`
              )
              .join("")
          : `<div class="empty empty-large">
              <h3>${vista === "mes" ? "Este periodo está libre" : soloFuturas ? "No hay reuniones a la vista" : "Todavía no hay reuniones"}</h3>
              <p>${vista === "mes" ? "Selecciona otro día o crea una reunión desde aquí." : "Agenda aquí las reuniones de seguimiento de cada boda. Los novios verán las suyas en su portal."}</p>
              <button class="btn primary" data-nueva-reunion="agenda-global"${state.agendaFecha ? ` data-reunion-fecha="${state.agendaFecha}"` : ""}><span class="icon-btn">+</span> Nueva reunión</button>
            </div>`
      }
    </section>
  `;
}

/** Calendario dentro de una boda. */
function renderCalendarioBoda() {
  const weddingId = state.selectedWeddingId;
  const wedding = state.weddings.find((w) => w.id === weddingId);
  if (!wedding) return "";
  const reuniones = reunionesDe(weddingId);
  const proxima = proximaReunion(weddingId);
  const celebradas = reuniones.filter((r) => r.estado === "Celebrada");
  const conAcuerdos = reuniones.filter((r) => (r.acuerdos || "").trim()).slice().reverse();
  const monthKey = fechaLocalISO(mesAgendaDate()).slice(0, 7);
  const reunionesVisibles = state.agendaFecha ? reuniones.filter((r) => r.fecha === state.agendaFecha) : reuniones.filter((r) => r.fecha?.slice(0, 7) === monthKey);

  return `
    <section class="panel">
      <div class="panel-head">
        <div>
          <h3 class="card-title">Calendario de la boda</h3>
          <p class="card-sub">Las reuniones de seguimiento y lo que se acordó en cada una. Las que marques «con los novios» las ven ellos en su portal.</p>
        </div>
        <button class="btn primary" data-nueva-reunion="${weddingId}"><span class="icon-btn">+</span> Nueva reunión</button>
      </div>

      ${
        proxima
          ? `<div class="proxima-reunion">
              <span class="proxima-eti">La próxima</span>
              <strong>${text(proxima.titulo)}</strong>
              <span>${text(formatDate(proxima.fecha))}${proxima.hora ? ` · ${text(proxima.hora)}` : ""}${proxima.lugar ? ` · ${text(proxima.lugar)}` : ""}</span>
              <a class="btn btn-xs" href="${urlGoogleCalendar(proxima)}" target="_blank" rel="noopener noreferrer">＋ A mi calendario</a>
            </div>`
          : ""
      }

      ${renderCalendarioMensual(reuniones)}
      ${state.agendaFecha ? `<div class="agenda-selection-head"><div><span>Fecha seleccionada</span><strong>${text(formatDate(state.agendaFecha))}</strong></div><button class="mini-btn" data-nueva-reunion="${weddingId}" data-reunion-fecha="${state.agendaFecha}">+ Agendar este día</button></div>` : ""}

      ${
        reuniones.length
          ? reunionesVisibles.length
            ? `<div class="reuniones">${reunionesVisibles.map((r) => renderReunion(r)).join("")}</div>`
            : `<div class="empty agenda-empty-day"><h3>No hay reuniones en este periodo</h3><p>Selecciona un día con indicador o agenda una nueva reunión.</p></div>`
          : `<div class="empty empty-large">
              <h3>Sin reuniones agendadas</h3>
              <p>Una boda se organiza en ocho o diez reuniones. Agendarlas desde el principio evita el «¿cuándo quedamos?» de cada semana.</p>
              <button class="btn primary" data-nueva-reunion="${weddingId}"><span class="icon-btn">+</span> Agendar la primera</button>
            </div>`
      }

      ${
        // Los acuerdos no dependen del mes que estés mirando. Antes solo se
        // anunciaba «2 reuniones ya celebradas, con sus acuerdos anotados» y
        // había que navegar el calendario hacia atrás para leerlos: lo que se
        // decidió sobre las flores en julio hace falta en agosto, no en julio.
        conAcuerdos.length
          ? `<h4 class="prov-grupo">Lo que se fue acordando</h4>
             <div class="reuniones">${conAcuerdos.map((r) => renderReunion(r, { soloLectura: true })).join("")}</div>`
          : celebradas.length
            ? `<p class="card-sub" style="margin-top:14px">${celebradas.length} reunión${celebradas.length === 1 ? "" : "es"} ya celebrada${celebradas.length === 1 ? "" : "s"}, todavía sin acuerdos anotados.</p>`
            : ""
      }
    </section>
  `;
}

/**
 * Todos los acuerdos de la boda en una sola página.
 *
 * Existe porque lo que se decidió en una reunión es la memoria del proyecto,
 * y estaba repartido reunión a reunión: para recordar de qué color eran las
 * flores había que abrir el calendario, ir a julio y leer la ficha. Aquí se
 * lee todo de una vez, de lo más reciente a lo más antiguo, y se busca.
 */
function renderAcuerdos() {
  const weddingId = state.selectedWeddingId;
  const wedding = state.weddings.find((w) => w.id === weddingId);
  if (!wedding) return "";

  const busca = String(state.acuerdosQuery || "").trim().toLowerCase();
  const todas = reunionesDe(weddingId).filter((r) => (r.acuerdos || "").trim());
  const conAcuerdos = todas.slice().reverse();
  const visibles = busca
    ? conAcuerdos.filter((r) => `${r.titulo} ${r.acuerdos} ${r.responsable || ""} ${r.tipo || ""}`.toLowerCase().includes(busca))
    : conAcuerdos;

  const sinAnotar = reunionesDe(weddingId).filter((r) => r.estado === "Celebrada" && !(r.acuerdos || "").trim());

  return `
    <section class="panel">
      <div class="panel-head">
        <div>
          <h3 class="card-title">Acuerdos</h3>
          <p class="card-sub">Lo que se decidió en cada reunión, de lo más reciente a lo más antiguo. Sin tener que abrirlas una a una.</p>
        </div>
        <button class="btn" data-tab="calendario">◷ Ver el calendario</button>
      </div>

      ${
        todas.length
          ? `<div class="field search-field acuerdos-buscador">
              <label for="buscar-acuerdo">Buscar en los acuerdos</label>
              <input id="buscar-acuerdo" type="search" data-acuerdos-query value="${text(state.acuerdosQuery || "")}"
                placeholder="flores, menú, timing, transporte…" autocomplete="off" />
            </div>`
          : ""
      }

      ${
        sinAnotar.length
          ? `<div class="budget-soon" role="status">
              <strong>${sinAnotar.length} reunión${sinAnotar.length === 1 ? "" : "es"} celebrada${sinAnotar.length === 1 ? "" : "s"} sin acuerdos anotados</strong>
              <p>${sinAnotar.map((r) => text(r.titulo)).join(" — ")}. Lo que no se apunta se discute otra vez.</p>
            </div>`
          : ""
      }

      ${
        !todas.length
          ? `<div class="empty empty-large">
              <h3>Todavía no hay acuerdos anotados</h3>
              <p>Cuando termines una reunión, pulsa «Acuerdos» en su ficha y escribe lo que se decidió. Dentro de tres meses nadie recuerda si el ramo era de peonías o de ranúnculos.</p>
              <button class="btn primary" data-tab="calendario">Ir al calendario</button>
            </div>`
          : !visibles.length
            ? `<div class="empty"><h3>Nada con «${text(state.acuerdosQuery)}»</h3><p>Prueba con otra palabra.</p></div>`
            : `<ol class="acuerdos-lista">
                ${visibles
                  .map(
                    (r) => `<li class="acuerdo-item">
                      <div class="acuerdo-fecha">
                        <strong>${text(formatDate(r.fecha).split(" de ")[0])}</strong>
                        <span>${text((formatDate(r.fecha).split(" de ")[1] || "").slice(0, 3))}</span>
                        <em>${text(String(r.fecha || "").slice(0, 4))}</em>
                      </div>
                      <div class="acuerdo-cuerpo">
                        <h4>${text(r.titulo)}</h4>
                        <p class="acuerdo-meta">${text(r.tipo || "Reunión")}${r.responsable ? ` · ${text(r.responsable)}` : ""}${r.conNovios ? " · con los novios" : ""}</p>
                        <p class="acuerdo-texto">${text(r.acuerdos)}</p>
                        <button class="mini-btn" data-acuerdos-reunion="${r.id}">${icono("editar")} Corregir</button>
                      </div>
                    </li>`
                  )
                  .join("")}
              </ol>`
      }
    </section>
  `;
}

/** Las reuniones que ve la pareja en su portal. */
function renderReunionesPortal(wedding) {
  const suyas = reunionesDe(wedding.id).filter((r) => r.conNovios && r.estado !== "Cancelada");
  const proximas = suyas.filter(esFutura);
  const pasadas = suyas.filter((r) => !esFutura(r));

  if (!suyas.length) return "";

  return `
    <section class="panel">
      <div class="panel-head">
        <div>
          <h3 class="card-title">Nuestras próximas citas</h3>
          <p class="card-sub">Las reuniones que tenemos con vosotros. Podéis añadirlas a vuestro calendario con un toque.</p>
        </div>
      </div>
      ${
        proximas.length
          ? `<div class="reuniones">${proximas.map((r) => renderReunion(r, { soloLectura: true })).join("")}</div>`
          : `<div class="empty">Ahora mismo no hay ninguna cita puesta. En cuanto agendemos la siguiente aparecerá aquí.</div>`
      }
      ${
        pasadas.filter((r) => r.acuerdos).length
          ? `<h4 class="prov-grupo">Lo que fuimos acordando</h4>
             <div class="reuniones">${pasadas.filter((r) => r.acuerdos).map((r) => renderReunion(r, { soloLectura: true })).join("")}</div>`
          : ""
      }
    </section>
  `;
}

export {
  ESTADOS_REUNION,
  MODOS,
  TIPOS_REUNION,
  anotarAcuerdos,
  avisarPorWhatsapp,
  borrarReunion,
  borrarReunionConfirmada,
  crearReunion,
  descargarIcs,
  editarReunion,
  esFutura,
  guardarAcuerdos,
  guardarReunion,
  nuevaReunion,
  cambiarVistaAgenda,
  irAgendaHoy,
  moverMesAgenda,
  proximaReunion,
  renderAcuerdos,
  renderAgendaGlobal,
  renderCalendarioBoda,
  renderReunionesPortal,
  seleccionarFechaAgenda,
  reunionesDe,
  todasLasReuniones,
  urlGoogleCalendar,
};
