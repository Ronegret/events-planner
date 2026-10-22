import { createPaymentFromModal, createReceiptFromModal } from "./payments.js";
import { renderReportChecklist } from "./print.js";
import { borrarReunionConfirmada, crearReunion, guardarAcuerdos, guardarReunion } from "./agenda.js";
import { cerrarBodaConfirmada } from "./cierre.js";
import { quitarReferenciaConfirmado } from "./referencia.js";
import { createBudgetFromModal, guardarPago, saveBudgetTarget, updateBudgetFromModal } from "./budget.js";
import { saveContractFields, uploadSignedContract } from "./contracts.js";
import { portalCrearMesa, portalGuardarMesa } from "./portal.js";
import { render } from "./render.js";
import { EP_SERVICE_CATALOG, COVER_GALLERY, GUEST_GROUPS, PROVIDER_TYPES, byWedding, byWeddingId, canManageUsers, confirmationStatuses, getWedding, hashPassword, isReady, isWeddingDayDone, nextFrom, nextStatus, processStatuses, resetDemoConfirmed, rinconTaskStatuses, saveState, serviceStatuses, state, supabaseClient, text, toast, uid, weddingDayStatuses, toastUndo} from "./state.js";

function renderModal() {
  if (!state.modal) return "";
  const modal = state.modal;
  if (modal.type === "confirm") {
    return `
      <div class="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="confirm-modal-title">
        <section class="modal-card panel">
          <div class="section-title">
            <div>
              <span class="pill">${text(modal.kicker || "Confirmación")}</span>
              <h3 id="confirm-modal-title">${text(modal.title)}</h3>
            </div>
            <button class="mini-btn" data-action="close-modal" aria-label="Cerrar diálogo">Cerrar</button>
          </div>
          <p class="modal-message">${text(modal.message || "")}</p>
          ${
            modal.confirmWord
              ? `<div class="field">
                   <label for="confirm-word">Escribe <b>${text(modal.confirmWord)}</b> para confirmar</label>
                   <input id="confirm-word" data-confirm-word autocomplete="off" autocapitalize="characters"
                          spellcheck="false" aria-describedby="confirm-word-error" />
                 </div>
                 <p class="confirm-word-error" id="confirm-word-error" data-confirm-word-error role="alert" hidden></p>`
              : ""
          }
          <div class="actions" style="justify-content:flex-start;margin-top:18px">
            <!-- Se marca "incompleto" para atenuarlo, NO aria-disabled: un botón
                 deshabilitado no puede decir qué le falta, y un lector de pantalla
                 lo salta. Sigue siendo pulsable y, al pulsarlo, explica. -->
            <button class="btn ${modal.tono === "neutro" ? "primary" : "danger"}" data-action="confirm-modal"
                    ${modal.confirmWord ? `data-incompleto="true"` : ""}>${text(modal.confirmLabel || "Confirmar")}</button>
            <button class="btn" data-action="${modal.intent === "abrir-boda-nueva" ? "cancelar-boda-nueva" : "close-modal"}">${text(modal.cancelLabel || "Cancelar")}</button>
          </div>
        </section>
      </div>
    `;
  }
  if (modal.type === "info") {
    return `
      <div class="modal-backdrop" role="dialog" aria-modal="true">
        <section class="modal-card panel">
          <div class="section-title">
            <div>
              <span class="pill">${text(modal.kicker || "Detalle")}</span>
              <h3>${text(modal.title)}</h3>
            </div>
            <button class="mini-btn" data-action="close-modal">Cerrar</button>
          </div>
          <div class="detail-list">${modal.rows.map((row) => `<p><strong>${text(row.label)}:</strong> ${text(row.value || "Sin definir")}</p>`).join("")}</div>
          <div class="actions" style="justify-content:flex-start;margin-top:18px">
            <button class="btn primary" data-action="close-modal">Aceptar</button>
          </div>
        </section>
      </div>
    `;
  }
  if (modal.type === "annex") {
    const items = state.annexDraft || [];
    const total = items.filter((i) => i.checked).reduce((sum, i) => sum + (Number(i.price) || 0), 0);
    return `
      <div class="modal-backdrop" role="dialog" aria-modal="true">
        <section class="modal-card panel">
          <div class="section-title">
            <div>
              <span class="pill">Contrato</span>
              <h3>Nuevo anexo de servicios</h3>
            </div>
            <button class="mini-btn" data-action="close-modal">Cerrar</button>
          </div>
          <p class="card-sub">El contrato firmado no se modifica. Marca los servicios nuevos y se creará un anexo que se suma al importe original.</p>
          <div class="annex-list">
            ${items
              .map(
                (i) => `<label class="annex-item${i.checked ? " checked" : ""}">
                  <input type="checkbox" data-annex-item="${i.id}" ${i.checked ? "checked" : ""} />
                  <span class="check-mark">✓</span>
                  <span class="annex-body"><strong>${text(i.title)}</strong>${i.notes ? `<small>${text(i.notes)}</small>` : ""}</span>
                  <span class="annex-price">${Number(i.price).toLocaleString("es-ES")} €</span>
                </label>`
              )
              .join("") || `<p class="chart-empty">No hay servicios nuevos.</p>`}
          </div>
          <div class="annex-total"><span>Total del anexo</span><strong>${total.toLocaleString("es-ES")} €</strong></div>
          <div class="actions" style="justify-content:flex-start;margin-top:18px">
            <button class="btn primary" data-confirm-annex="${modal.weddingId}">Crear anexo</button>
            <button class="btn" data-action="close-modal">Cancelar</button>
          </div>
        </section>
      </div>
    `;
  }
  if (modal.type === "print-options") {
    const wedding = getWedding();
    return `
      <div class="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="print-options-title">
        <section class="modal-card panel print-options-modal" style="--print-primary:${text(wedding?.palettePrimary || "#56603f")};--print-secondary:${text(wedding?.paletteSecondary || "#d6b36b")};--print-accent:${text(wedding?.paletteAccent || "#f4efe4")}">
          <div class="section-title">
            <div class="print-options-heading">
              <img class="print-options-logo" src="./assets/brand/ep-logo.png" alt="Events Planner" />
              <div>
              <span class="pill">Configurar informe</span>
              <h3 id="print-options-title">¿Qué quieres incluir?</h3>
              <p>Revisa el destinatario y marca solo la información que debe aparecer en el PDF.</p>
              </div>
            </div>
            <button class="mini-btn" data-action="close-modal">Cerrar</button>
          </div>
          <div class="print-options-audience">
            <strong>Destinatario</strong>
            <div class="audience-control" role="group" aria-label="Destinatario del informe">
              ${["Equipo", "Novios", "Proveedores"].map((audience) => `<button class="${state.exportAudience === audience ? "active" : ""}" data-export-audience="${audience}">${audience}</button>`).join("")}
            </div>
          </div>
          <div class="section-title compact"><div><h3>Contenido del informe</h3><p>${state.exportSelection.length} secciones seleccionadas</p></div><button class="btn" data-action="toggle-export-all">Seleccionar todo</button></div>
          ${renderReportChecklist()}
          <div class="actions print-options-actions">
            <button class="btn primary" data-action="confirm-print-options">Generar informe PDF</button>
            <button class="btn" data-action="close-modal">Cancelar</button>
          </div>
        </section>
      </div>
    `;
  }
  if (modal.type === "cover-picker") {
    const wedding = state.weddings.find((w) => w.id === modal.weddingId);
    if (!wedding) return "";
    return `
      <div class="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="cover-picker-title">
        <section class="modal-card panel cover-picker-modal">
          <div class="section-title">
            <div>
              <span class="pill">Portada</span>
              <h3 id="cover-picker-title">Foto de portada · ${text(wedding.couple)}</h3>
              <p>Se usa en la tarjeta de la boda y en la portada del informe impreso. Elige una foto o sube una propia.</p>
            </div>
            <button class="mini-btn" data-action="close-modal" aria-label="Cerrar diálogo">Cerrar</button>
          </div>
          <div class="cover-picker-grid">
            ${COVER_GALLERY.map(
              (item) => `
              <button type="button" class="cover-picker-option${wedding.cover === item.path ? " selected" : ""}" data-pick-cover="${text(item.path)}" title="${text(item.label)}">
                <img src="${text(item.path)}" alt="${text(item.label)}" loading="lazy" />
                <span>${text(item.label)}</span>
                ${wedding.cover === item.path ? `<span class="cover-picker-check" aria-hidden="true">✓</span>` : ""}
              </button>`
            ).join("")}
          </div>
          <div class="field" style="margin-top:14px">
            <label for="cover-upload-input">O sube una foto propia</label>
            <input id="cover-upload-input" type="file" accept=".jpg,.jpeg,.png,.webp" data-cover-upload="${text(wedding.id)}" />
            <small>Máximo recomendado: 3 MB.</small>
          </div>
          <div class="actions" style="justify-content:flex-start;margin-top:16px">
            <button class="btn" type="button" data-action="close-modal">Cerrar</button>
          </div>
        </section>
      </div>
    `;
  }
  const fields = modal.fields || [];
  return `
    <div class="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="form-modal-title">
      <section class="modal-card panel">
        <div class="section-title">
          <div>
            <span class="pill">${text(modal.kicker || "Events Planner")}</span>
            <h3 id="form-modal-title">${text(modal.title)}</h3>
          </div>
          <button class="mini-btn" data-action="close-modal" aria-label="Cerrar diálogo">Cerrar</button>
        </div>
        <form class="form modal-form" data-modal-form>
          <div class="grid cols-2">
            ${fields.map(renderModalField).join("")}
          </div>
          <div class="actions" style="justify-content:flex-start;margin-top:18px">
            <button class="btn primary" type="submit">${text(modal.submitLabel || "Guardar")}</button>
            <button class="btn" type="button" data-action="close-modal">Cancelar</button>
          </div>
        </form>
      </section>
    </div>
  `;
}

function renderModalField(field) {
  const value = state.modal.values?.[field.name] ?? field.value ?? "";
  const required = field.required ? "required" : "";
  const inputType = field.type || "text";
  const wide = field.wide ? " field-wide" : "";
  const fieldId = `modal-field-${String(field.name).replace(/[^a-z0-9_-]/gi, "-")}`;
  if (field.options) {
    // Las opciones pueden ser una función: así el desplegable de responsables
    // refleja el Equipo de ahora mismo, no el de cuando se escribió el código.
    const opciones = typeof field.options === "function" ? field.options() : field.options;
    return `<div class="field${wide}"><label for="${fieldId}">${text(field.label)}</label><select id="${fieldId}" name="${text(field.name)}" ${required}>${opciones.map((option) => `<option${option === value ? " selected" : ""}>${text(option)}</option>`).join("")}</select></div>`;
  }
  // Campo informativo: explica una consecuencia del formulario sin pedir nada.
  // Se usa, por ejemplo, para dejar claro qué se copia al duplicar una boda.
  if (inputType === "readonly") {
    return `<div class="field${wide} field-nota"><label>${text(field.label)}</label><p>${text(value)}</p></div>`;
  }
  if (inputType === "file") {
    const current = state.modal.values?.attachment?.name ? `<span class="file-hint">Archivo actual: ${text(state.modal.values.attachment.name)}</span>` : "";
    return `<div class="field${wide}"><label for="${fieldId}">${text(field.label)}</label><input id="${fieldId}" name="${text(field.name)}" type="file" ${field.accept ? `accept="${text(field.accept)}"` : ""} />${current}<small>${text(field.help || "")}</small></div>`;
  }
  if (inputType === "textarea") {
    return `<div class="field${wide}"><label for="${fieldId}">${text(field.label)}</label><textarea id="${fieldId}" name="${text(field.name)}" ${required} rows="4">${text(value)}</textarea></div>`;
  }
  return `<div class="field${wide}"><label for="${fieldId}">${text(field.label)}</label><input id="${fieldId}" name="${text(field.name)}" type="${text(inputType)}" value="${text(value)}" ${required} /></div>`;
}

function openFormModal(config) {
  state.modal = { type: "form", ...config };
  render();
}

function openConfirmModal(config) {
  state.modal = { type: "confirm", ...config };
  render();
}

function openInfoModal(config) {
  state.modal = { type: "info", ...config };
  render();
}

function closeModal() {
  state.modal = null;
  render();
}

// ---------------------------------------------------------------------------
// Portada de boda (foto de fondo de la tarjeta y del dossier impreso)
// ---------------------------------------------------------------------------
function openCoverPicker(weddingId) {
  state.modal = { type: "cover-picker", weddingId };
  render();
}

function pickCover(weddingId, path) {
  const wedding = state.weddings.find((w) => w.id === weddingId);
  if (!wedding || !path) return;
  wedding.cover = path;
  addActivity(`Cambió la foto de portada`, state.user?.name, weddingId);
  state.modal = null;
  saveState();
  render();
}

async function uploadCoverPhoto(weddingId, file) {
  const wedding = state.weddings.find((w) => w.id === weddingId);
  if (!wedding || !file) return;
  // Una foto de portada pesa más que cualquier justificante. Sin contexto de
  // Storage se guardaría dentro del estado en base64, que es exactamente cómo
  // se llegó a los 4,2 MB. Va a la nube como todo lo demás.
  const attachment = await fileToAttachment(file, {
    storageWeddingId: weddingId,
    documentId: `portada-${weddingId}`,
  });
  if (!attachment?.dataUrl && !attachment?.url) return;
  wedding.cover = attachment.url || attachment.dataUrl;
  addActivity(`Subió una foto de portada propia`, state.user?.name, weddingId);
  state.modal = null;
  saveState();
  render();
}

function modalValues(event) {
  const formData = new FormData(event.currentTarget);
  const values = Object.fromEntries(formData.entries());
  event.currentTarget.querySelectorAll('input[type="file"]').forEach((input) => {
    values[input.name] = input.files?.[0] || null;
  });
  return values;
}


/**
 * Registro de actividad.
 *
 * Guardaba literalmente la cadena "Ahora", así que un apunte de hace tres
 * semanas seguía diciendo "Ahora" para siempre. Ahora se guarda la fecha real
 * y el texto se calcula al pintar: es la única forma de que el registro sirva
 * para lo que sirve un registro, que es saber cuándo pasó algo.
 */
/**
 * Quién puede ser responsable de algo. Sale del Equipo, no se escribe a mano:
 * teclear "Noa" y "noa" creaba dos personas distintas para los filtros y
 * los recuentos, y nadie se daba cuenta hasta que un dossier salía con la
 * tarea sin asignar.
 */
function opcionesEquipo() {
  const nombres = state.users.map((u) => u.name).filter(Boolean);
  return ["Sin asignar", ...nombres, "Equipo", "Novios"];
}

function addActivity(text, actor = state.user?.name || "Portal de novios", weddingId = state.selectedWeddingId || "") {
  const at = new Date().toISOString();
  state.activity.unshift({ id: uid("a"), weddingId, actor, text, at, time: at });
}

function requireWedding() {
  // En el portal la boda es portalWeddingId, no selectedWeddingId. Sin esta
  // distinción, una pareja que pulsaba «Añadir invitado» acababa expulsada de
  // su propio portal a la pantalla de bodas del equipo.
  if (state.portalMode) {
    if (state.portalWeddingId && state.weddings.some((w) => w.id === state.portalWeddingId)) return true;
    toast("No encontramos vuestra boda. Escribid al equipo y lo revisamos juntos.");
    return false;
  }
  if (state.selectedWeddingId && getWedding()) return true;
  toast("Antes de seguir, crea una boda o elige una de la lista.");
  state.view = "weddings";
  state.portalMode = false;
  saveState();
  render();
  return false;
}

/** El alta de una boda ocupa su propia pantalla, no un desplegable. */
function newWedding() {
  state.view = "wedding-new";
  state.showWeddingForm = true;
  state.portalMode = false;
  state.destacarNuevaBoda = false;
  state.draftServices = [];
  state.draftRincones = [];
  saveState();
  render();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function cancelWeddingForm() {
  state.showWeddingForm = false;
  state.view = "weddings";
  state.draftServices = [];
  state.draftRincones = [];
  saveState();
  render();
}


// ---------------------------------------------------------------------------
// Duplicar una boda como plantilla
// ---------------------------------------------------------------------------
// El timeline de una boda catalana estándar es prácticamente el mismo cada
// vez: llegada del equipo, preparativos, ceremonia, cóctel, banquete, baile.
// Reescribirlo desde cero veinte veces al año no aporta nada y es donde se
// cuelan los olvidos.
//
// Se copia SOLO la estructura de trabajo. Nunca invitados, ni presupuesto, ni
// pagos, ni contrato, ni las contraseñas del portal: son de esa pareja y de
// nadie más. Y todo vuelve a estado "no iniciado" — heredar una tarea marcada
// como hecha es la forma más rápida de dar una boda por preparada sin estarlo.

/** Qué se copia y qué no. Explícito a propósito: es una decisión, no un bug. */
const PLANTILLA_COLECCIONES = ["timeline", "tasks", "services", "shotList", "rincones"];

function duplicarBodaForm(weddingId) {
  const origen = state.weddings.find((w) => w.id === weddingId);
  if (!origen) return;
  const resumen = PLANTILLA_COLECCIONES.map((c) => `${byWeddingId(c, weddingId).length} ${labelColeccion(c)}`)
    .filter((t) => !t.startsWith("0 "))
    .join(" · ");

  openFormModal({
    intent: "duplicar-boda",
    itemId: weddingId,
    title: "Duplicar como plantilla",
    kicker: `A partir de ${origen.couple}`,
    submitLabel: "Crear la boda",
    values: { couple: "", date: "", copiarRincones: "Sí" },
    fields: [
      { name: "couple", label: "Nombre de la nueva pareja", required: true, wide: true, placeholder: "Ej. Lucía & Martín" },
      { name: "date", label: "Fecha de la boda", type: "date" },
      { name: "copiarRincones", label: "¿Copiar también los rincones?", options: ["Sí", "No"] },
      {
        name: "aviso",
        label: "Qué se copia",
        type: "readonly",
        wide: true,
        value: `Se copian ${resumen || "las listas de trabajo"}, todo en estado pendiente. No se copian invitados, mesas, presupuesto, pagos ni contrato.`,
      },
    ],
  });
}

function labelColeccion(c) {
  return { timeline: "pasos de timeline", tasks: "tareas", services: "servicios", shotList: "fotos", rincones: "rincones" }[c] || c;
}

async function duplicarBoda(weddingId, values) {
  const origen = state.weddings.find((w) => w.id === weddingId);
  const couple = String(values.couple || "").trim();
  if (!origen || !couple) {
    toast("Escribe el nombre de la nueva pareja para continuar.");
    return;
  }

  const id = uid("w");
  const portalPassword = couple.replace(/[^A-Za-z]/g, "").toUpperCase().slice(0, 8) + new Date().getFullYear();

  // Se hereda el estilo de trabajo (paleta, notas, responsable), no los datos
  // de la otra pareja.
  state.weddings.push({
    ...origen,
    id,
    couple,
    date: values.date || "",
    status: "En preparación",
    progress: 0,
    presupuestoObjetivo: 0,
    portalPasswordHash: await hashPassword(portalPassword),
    portalActive: false,
    notes: `Creada a partir de la plantilla de ${origen.couple}.`,
    firstMeetingNotes: "",
  });

  const copiar = PLANTILLA_COLECCIONES.filter((c) => c !== "rincones" || values.copiarRincones !== "No");
  let copiados = 0;
  copiar.forEach((coleccion) => {
    byWeddingId(coleccion, weddingId).forEach((item) => {
      const nuevo = { ...item, id: uid(item.id.replace(/[^a-z]/gi, "").slice(0, 3) || "x"), weddingId: id };
      // Todo arranca en blanco: sin responsable asignado, sin completar y sin
      // el importe que se negoció con la otra pareja.
      delete nuevo.completedAt;
      delete nuevo.completedBy;
      delete nuevo.attachment;
      if ("status" in nuevo) nuevo.status = coleccion === "services" ? "No iniciado" : "Pendiente";
      if ("price" in nuevo) nuevo.price = 0;
      if ("done" in nuevo) nuevo.done = false;
      state[coleccion].push(nuevo);
      copiados += 1;
    });
  });

  state.selectedWeddingId = id;
  state.view = "wedding";
  state.selectedTab = "resumen";
  state.modal = null;
  addActivity(`Creó la boda ${couple} a partir de la plantilla de ${origen.couple}`, state.user?.name, id);
  saveState();
  render();
  toast(`Boda creada con ${copiados} elementos copiados. Contraseña del portal: ${portalPassword}. Anótala ahora: no se podrá volver a ver.`, 10000);
}

async function createWeddingFromForm(event) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const couple = form.get("couple")?.toString().trim();
  if (!couple) {
    toast("Escribe el nombre de la pareja para continuar.");
    return;
  }
  const id = uid("w");
  const portalPassword = form.get("portalPassword")?.toString().trim() || couple.replace(/[^A-Za-z]/g, "").toUpperCase().slice(0, 8) + "2026";
  state.weddings.push({
    id,
    couple,
    date: form.get("date")?.toString() || "",
    status: form.get("status")?.toString() || "En preparación",
    progress: 10,
    ceremony: form.get("ceremony")?.toString() || "Por definir",
    venue: form.get("venue")?.toString() || "Por definir",
    ceremonyAddress: form.get("ceremonyAddress")?.toString() || "",
    venueAddress: form.get("venueAddress")?.toString() || "",
    guestsEstimate: Number(form.get("guestsEstimate")) || 0,
    style: form.get("style")?.toString() || "Por definir",
    palettePrimary: form.get("palettePrimary")?.toString() || "#56603f",
    paletteSecondary: form.get("paletteSecondary")?.toString() || "#d6b36b",
    paletteAccent: form.get("paletteAccent")?.toString() || "#f4efe4",
    paletteNotes: form.get("paletteNotes")?.toString() || "Musgo, oro y crema.",
    lead: form.get("lead")?.toString() || state.user.name,
    // Solo el hash queda guardado. El valor legible se muestra una vez al
    // crear la boda para que el equipo pueda comunicarselo a los novios.
    portalPasswordHash: await hashPassword(portalPassword),
    portalActive: false,
    cover: "./assets/fotos/jardin-fiesta.jpg",
    notes: form.get("notes")?.toString() || "Boda nueva, creada en Events Planner.",
    firstMeetingNotes: "",
  });
  createServicesFromForm(id);
  seedWeddingOperatingLists(id);
  state.showWeddingForm = false;
  addActivity(`Creo la boda ${couple}`);
  saveState();

  // Guardar no decide por ti a dónde vas. A veces se da de alta una pareja
  // para empezar a trabajarla en ese momento, y a veces se están metiendo tres
  // seguidas después de una feria — y en ese caso entrar en la ficha obliga a
  // volver atrás cada vez.
  state.modal = {
    type: "confirm",
    intent: "abrir-boda-nueva",
    itemId: id,
    title: "Boda creada",
    message: `${couple} ya está creada.\n\nContraseña del portal de los novios: ${portalPassword}\nAnótala ahora: por seguridad solo se guarda cifrada y no podrás volver a verla.`,
    tono: "neutro",
    kicker: "Nueva boda",
    confirmLabel: "Abrir la boda",
    cancelLabel: "Seguir en el listado",
  };
  render();
}

/** Respuesta a la pregunta de después de crear una boda. */
function abrirBodaNueva(weddingId) {
  state.modal = null;
  state.selectedWeddingId = weddingId;
  state.view = "wedding";
  state.selectedTab = "resumen";
  saveState();
  render();
}

/** Se queda en el listado y se señala el botón para dar de alta la siguiente. */
function volverAlListado() {
  state.modal = null;
  state.view = "weddings";
  state.destacarNuevaBoda = true;
  saveState();
  render();
  // El resalte se apaga solo: es una señal de "sigue por aquí", no un estado.
  setTimeout(() => {
    state.destacarNuevaBoda = false;
    render();
  }, 4000);
}

// Vuelca a la boda recien creada los servicios y rincones que se fueron
// acumulando con los desplegables del formulario (state.draftServices /
// state.draftRincones), en vez de leer 30 campos sueltos del <form>.
function createServicesFromForm(weddingId) {
  state.draftServices.forEach((row) => {
    state.services.push({
      id: uid("svc"),
      weddingId,
      title: row.title,
      owner: "Equipo",
      status: "No iniciado",
      price: Number(row.price) || 0,
      notes: String(row.notes || "").trim() || row.defaultNotes || "",
    });
  });

  state.draftRincones.forEach((row) => {
    const source = state.rincones.find((r) => r.id === row.sourceId);
    state.rincones.push({
      ...(source || {}),
      id: uid("rc"),
      weddingId,
      sourceRinconId: row.sourceId,
      name: row.title,
      price: Number(row.price) || 0,
      description: String(row.notes || "").trim() || source?.description || "",
    });
  });

  state.draftServices = [];
  state.draftRincones = [];
}

/** Añade un servicio del catalogo al borrador del alta. */
function addDraftService(index) {
  const entry = EP_SERVICE_CATALOG[Number(index)];
  if (!entry) return;
  const [title, defaultNotes] = entry;
  if (state.draftServices.some((row) => row.title === title)) return;
  state.draftServices.push({ title, price: 0, notes: defaultNotes, defaultNotes });
  render();
}

/** Añade un rincon del catalogo al borrador del alta, con su precio base. */
function addDraftRincon(id) {
  const rincon = state.rincones.find((r) => r.id === id);
  if (!rincon || state.draftRincones.some((row) => row.sourceId === id)) return;
  state.draftRincones.push({ sourceId: id, title: rincon.name, price: Number(rincon.price) || 0, notes: rincon.description || "" });
  render();
}

function removeDraftService(index) {
  state.draftServices.splice(Number(index), 1);
  render();
}

function removeDraftRincon(index) {
  state.draftRincones.splice(Number(index), 1);
  render();
}

/** Actualiza precio/observacion sin re-renderizar (no perder el foco al teclear). */
function updateDraftField(collection, index, field, value) {
  const row = state[collection]?.[Number(index)];
  if (!row) return;
  row[field] = field === "price" ? Number(value) || 0 : value;
  if (field === "price") updateDraftTotals();
}

/** Recalcula los totales visibles sin volver a pintar el formulario entero. */
function updateDraftTotals() {
  document.querySelectorAll(".picker-block").forEach((block) => {
    const rows = [...block.querySelectorAll(".picker-row-price input")];
    const total = rows.reduce((sum, input) => sum + (Number(input.value) || 0), 0);
    const target = block.querySelector(".picker-total strong");
    if (target) target.textContent = `${total.toLocaleString("es-ES")} €`;
  });
}

function seedWeddingOperatingLists(weddingId) {
  const photoTemplates = [
    ["Detalles", "Vestido, zapatos, alianzas, ramo, invitación y perfume", "Novios", "Fotografía"],
    ["Preparativos", "Novia con familia y accesorios", "Novia, madre, hermana, hijos", "Fotografía"],
    ["Preparativos", "Novio con familia y accesorios", "Novio, hermano, hijos", "Fotografía"],
    ["Ceremonia", "Entrada de la pareja y momento anillos", "Pareja, familia, hijos", "Fotografía"],
    ["Ceremonia", "Beso, salida y pétalos", "Pareja e invitados", "Fotografía"],
    ["Cóctel", "Rincones, juegos y ambiente", "Invitados y decoración", "Fotografía"],
    ["Pareja", "Golden hour / retratos pareja", "Novios", "Fotografía"],
    ["Fiesta", "Primer baile y pista abierta", "Pareja, hijos, invitados", "Fotografía"],
  ];
  photoTemplates.forEach(([moment, title, people, owner], index) => {
    state.shotList.push({ id: `${weddingId}-shot-${index + 1}`, weddingId, moment, title, people, owner, status: "Pendiente", notes: "" });
  });
}

/** El equipo aprueba una solicitud: el rincón pasa a la boda de los novios. */
function approveRinconRequest(requestId) {
  const req = state.rinconRequests.find((r) => r.id === requestId);
  if (!req || req.status !== "Pendiente") return;
  const source = state.rincones.find((r) => r.id === req.rinconId);
  if (!source) return;

  // Solo se copia si no lo tenían ya asignado.
  const yaAsignado = state.rincones.some((r) => r.weddingId === req.weddingId && (r.sourceRinconId === source.id || r.name === source.name));
  if (!yaAsignado) {
    state.rincones.push({ ...source, id: uid("rc"), weddingId: req.weddingId, sourceRinconId: source.id });
  }

  req.status = "Aprobado";
  req.resolvedAt = new Date().toISOString();
  addActivity(`Aprobó el rincón "${req.rinconName}" solicitado por los novios`, state.user?.name, req.weddingId);
  saveState();
  render();
  toast(`"${req.rinconName}" añadido a la boda. Los novios ya lo ven en su portal.`, 4000);
}

/** El equipo descarta una solicitud, con motivo visible para los novios. */
function rejectRinconRequest(requestId) {
  const req = state.rinconRequests.find((r) => r.id === requestId);
  if (!req || req.status !== "Pendiente") return;
  openFormModal({
    intent: "reject-request",
    itemId: requestId,
    title: `Descartar "${req.rinconName}"`,
    kicker: "Solicitud de los novios",
    submitLabel: "Enviar respuesta",
    values: { note: "" },
    fields: [{ name: "note", label: "Motivo para los novios", type: "textarea", placeholder: "Ej. No está disponible para esa fecha, pero podemos ofreceros una alternativa." }],
  });
}

function rejectRinconRequestConfirmed(requestId, values) {
  const req = state.rinconRequests.find((r) => r.id === requestId);
  if (!req) return;
  req.status = "Descartado";
  req.note = String(values.note || "").trim();
  req.resolvedAt = new Date().toISOString();
  addActivity(`Descartó el rincón "${req.rinconName}" solicitado por los novios`, state.user?.name, req.weddingId);
  state.modal = null;
  saveState();
  render();
}

// ============================================================================
// Galería de rincones
// ----------------------------------------------------------------------------
// Un rincón tiene varias fotos, no una. Además hay dos tipos distintos:
//   · catálogo   — ejemplos de cómo queda ese rincón, los ve cualquiera
//   · propuesta  — un diseño hecho a medida para ESA pareja. El equipo lo
//                  sube, los novios lo aprueban desde su portal y, una vez
//                  aprobado, entra en el dossier impreso.
// ============================================================================

/** Todas las fotos de un rincón, con la antigua `attachment` incluida. */
/**
 * De dónde sale la imagen de una foto o de un adjunto.
 *
 * Hay tres formas de guardar una imagen en esta app, y conviene saber por qué:
 *
 *   · `url`       — la ruta de un archivo que ya viaja dentro de la aplicación,
 *                   como el catálogo de rincones (`./assets/fotos/…`). Es la
 *                   más barata: no ocupa nada en los datos y el navegador la
 *                   guarda en su memoria como cualquier otra imagen de la web.
 *   · `storagePath` — el archivo vive en Supabase Storage, el disco en la nube.
 *                   Es lo que se usa para lo que sube el equipo. Hay que
 *                   descargarlo, así que se resuelve aparte (storageBlobUrl).
 *   · `dataUrl`   — la imagen entera convertida a texto y metida DENTRO de los
 *                   datos. Es el último recurso: una foto de 250 KB se
 *                   convierte en ~340 KB de texto que viaja en cada guardado.
 *
 * Esta función devuelve las dos que se pueden usar directamente en un <img>.
 */
function fotoSrc(foto) {
  return foto?.dataUrl || foto?.url || "";
}

function rinconGallery(rincon) {
  const gallery = Array.isArray(rincon.gallery) ? rincon.gallery : [];
  // La foto del catálogo no se duplica en cada boda que usa el rincón (eran
  // ~250 KB en base64 por copia y hacían que el estado no cupiera en
  // localStorage): la copia de boda solo guarda `sourceRinconId` y aquí se
  // resuelve la imagen desde la ficha global.
  const attachment =
    fotoSrc(rincon.attachment)
      ? rincon.attachment
      : rincon.sourceRinconId
        ? state.rincones.find((r) => r.id === rincon.sourceRinconId)?.attachment
        : null;
  const src = fotoSrc(attachment);
  if (src && !gallery.some((p) => fotoSrc(p) === src)) {
    return [{ id: `${rincon.id}-main`, kind: "catalogo", approved: true, ...attachment }, ...gallery];
  }
  return gallery;
}

function newRinconPhoto(rinconId, kind = "catalogo") {
  const rincon = state.rincones.find((r) => r.id === rinconId);
  if (!rincon) return;
  openFormModal({
    intent: "add-rincon-photo",
    itemId: rinconId,
    title: kind === "propuesta" ? `Propuesta a medida para ${rincon.name}` : `Añadir foto a ${rincon.name}`,
    kicker: "Rincones",
    submitLabel: "Añadir",
    values: { kind },
    fields: [
      { name: "photo", label: "Imagen", type: "file", accept: ".jpg,.jpeg,.png,.webp", wide: true, help: "Máximo recomendado: 3 MB." },
      { name: "caption", label: "Descripción", placeholder: kind === "propuesta" ? "Propuesta de photocall con flores secas" : "Detalle, montaje, ambiente...", wide: true },
      {
        name: "kind",
        label: "Tipo",
        options: ["catalogo", "propuesta"],
        help: "«propuesta» se envía a los novios para que la aprueben y, si les gusta, se incluye en el informe.",
      },
    ],
  });
}

async function addRinconPhotoFromModal(rinconId, values) {
  const rincon = state.rincones.find((r) => r.id === rinconId);
  if (!rincon) return;
  // Las fotos de rincón eran el 96 % del peso del estado —3,6 MB de los
  // 3,8— porque esta era la única llamada que no pasaba contexto de Storage,
  // así que siempre acababan como base64 dentro del propio JSON. Con
  // Supabase activo eso significaba volver a subir todas las fotos del
  // catálogo en cada guardado. Ahora van al bucket como el resto.
  const fotoId = uid("ph");
  const attachment = await fileToAttachment(values.photo, {
    storageWeddingId: rincon.weddingId || "catalogo",
    documentId: `rincon-${rincon.id}-${fotoId}`,
  });
  if (!attachment) {
    toast("Elige primero una imagen para añadirla.");
    return;
  }
  const esPropuesta = values.kind === "propuesta";
  if (!Array.isArray(rincon.gallery)) rincon.gallery = [];
  rincon.gallery.push({
    id: fotoId,
    ...attachment,
    caption: String(values.caption || "").trim(),
    kind: esPropuesta ? "propuesta" : "catalogo",
    // Las de catálogo entran directas; las propuestas esperan a los novios.
    approved: !esPropuesta,
    addedAt: new Date().toISOString(),
  });
  addActivity(
    esPropuesta ? `Envió una propuesta a medida de "${rincon.name}" a los novios` : `Añadió una foto a "${rincon.name}"`,
    state.user?.name,
    rincon.weddingId
  );
  state.modal = null;
  saveState();
  render();
  if (esPropuesta) toast("Propuesta enviada. Los novios la verán en su portal para aprobarla.", 4500);
}

function deleteRinconPhoto(ref) {
  const [rinconId, photoId] = String(ref).split(":");
  const rincon = state.rincones.find((r) => r.id === rinconId);
  if (!rincon || !Array.isArray(rincon.gallery)) return;
  rincon.gallery = rincon.gallery.filter((p) => p.id !== photoId);
  saveState();
  render();
}

/** Los novios aprueban una propuesta: pasa a salir en el dossier. */
function approveRinconPhoto(ref) {
  const [rinconId, photoId] = String(ref).split(":");
  const rincon = state.rincones.find((r) => r.id === rinconId);
  const photo = rinconGallery(rincon || {}).find((p) => p.id === photoId);
  if (!rincon || !photo) return;
  photo.approved = true;
  addActivity(`Los novios aprobaron la propuesta de "${rincon.name}"`, "Novios", rincon.weddingId);
  saveState();
  render();
  toast("¡Nos alegra que os guste! El equipo la incluirá en vuestro informe.", 4500);
}

/**
 * Asigna a la boda un proveedor que ya está en la base.
 *
 * Se copia la ficha para que la pareja vea todos sus datos —teléfono, web,
 * Instagram, zona— sin tener que volver a teclearlos, y se guarda de dónde
 * salió (sourceProviderId) para poder abrir la ficha original.
 */
function addExistingProvider(id) {
  if (!id || !requireWedding()) return;
  const provider = state.providers.find((item) => item.id === id);
  if (!provider) return;
  const weddingId = state.portalMode ? state.portalWeddingId : state.selectedWeddingId;
  if (state.providers.some((p) => p.weddingId === weddingId && String(p.name).toLowerCase() === String(provider.name).toLowerCase())) {
    toast("Ese proveedor ya está en esta boda. No hace falta añadirlo otra vez.");
    return;
  }
  const copy = {
    ...provider,
    id: uid("p"),
    weddingId,
    sourceProviderId: provider.sourceProviderId || provider.id,
    status: "Pendiente",
    validacion: "Pendiente de que la pareja decida",
    presupuesto: null,
  };
  state.providers.push(copy);
  addActivity(`Propuso a la pareja el proveedor ${copy.name}`, state.user?.name, weddingId);
  saveState();
  render();
  toast(`${copy.name} añadido. Los novios ya lo ven en su portal para valorarlo.`, 5000);
}

/**
 * Decisión de la pareja sobre un proveedor propuesto.
 *
 * Aceptar y descartar son las dos caras: hasta ahora solo se podía confirmar,
 * y un proveedor descartado se quedaba «pendiente» para siempre sin que nadie
 * supiera si es que no habían contestado o es que no les gustaba.
 */
function decidirProveedor(ref) {
  const [id, decision] = String(ref).split(":");
  const item = state.providers.find((p) => p.id === id);
  if (!item) return;
  const wedding = state.weddings.find((w) => w.id === item.weddingId);
  const quien = state.portalMode ? wedding?.couple || "Novios" : state.user?.name || "Equipo";

  if (decision === "aceptado") {
    item.validacion = "Aceptado";
    item.status = "Confirmado";
    item.confirmedBy = quien;
    item.confirmedAt = new Date().toISOString();
  } else if (decision === "descartado") {
    item.validacion = "Descartado";
    item.status = "Descartado";
    item.descartadoPor = quien;
    item.descartadoAt = new Date().toISOString();
  } else {
    item.validacion = "Pendiente de que la pareja decida";
    item.status = "Pendiente";
    delete item.confirmedBy;
    delete item.descartadoPor;
  }

  addActivity(
    state.portalMode
      ? `Los novios ${decision === "aceptado" ? "aceptaron" : decision === "descartado" ? "descartaron" : "dejaron pendiente"} a ${item.name}`
      : `${decision === "aceptado" ? "Aceptó" : decision === "descartado" ? "Descartó" : "Reabrió"} el proveedor ${item.name}`,
    quien,
    item.weddingId
  );
  saveState();
  render();
}

/** Presupuesto que manda el proveedor, adjunto a su ficha de esta boda. */
function subirPresupuestoProveedor(id) {
  const item = state.providers.find((p) => p.id === id);
  if (!item) return;
  openFormModal({
    intent: "presupuesto-proveedor",
    itemId: id,
    title: `Presupuesto de ${item.name}`,
    kicker: "Proveedor",
    submitLabel: "Guardar presupuesto",
    values: { importe: item.presupuesto?.importe || "", nota: item.presupuesto?.nota || "" },
    fields: [
      { name: "archivo", label: "Documento del presupuesto", type: "file", accept: ".pdf,.jpg,.jpeg,.png,.doc,.docx", wide: true, help: "El PDF que os ha mandado el proveedor." },
      { name: "importe", label: "Importe presupuestado (€)", type: "number" },
      { name: "nota", label: "Qué incluye", wide: true, placeholder: "Ej. 8 h de cobertura, 400 fotos editadas, álbum aparte" },
    ],
  });
}

async function guardarPresupuestoProveedor(id, values) {
  const item = state.providers.find((p) => p.id === id);
  if (!item) return;
  const wedding = state.weddings.find((w) => w.id === item.weddingId);
  const adjunto = await fileToAttachment(values.archivo, { storageWeddingId: wedding?.storageWeddingId, documentId: id });
  item.presupuesto = {
    ...(item.presupuesto || {}),
    importe: Number(values.importe) || 0,
    nota: String(values.nota || "").trim(),
    ...(adjunto ? { attachment: adjunto } : {}),
    at: new Date().toISOString(),
    by: state.user?.name || "Equipo",
  };
  addActivity(`Añadió el presupuesto de ${item.name}`, state.user?.name, item.weddingId);
  state.modal = null;
  saveState();
  render();
}

async function verPresupuestoProveedor(id) {
  const item = state.providers.find((p) => p.id === id);
  const adj = item?.presupuesto?.attachment;
  const url = adj?.dataUrl || (await storageBlobUrl(adj));
  if (!url) {
    toast("Este proveedor aún no tiene presupuesto adjunto. Súbelo desde su ficha.");
    return;
  }
  window.open(url, "_blank", "noopener");
}

function addExistingRincon(id) {
  if (!id || !requireWedding()) return;
  const rincon = state.rincones.find((item) => item.id === id);
  if (!rincon) return;
  const copy = { ...rincon, id: uid("rc"), weddingId: state.selectedWeddingId, sourceRinconId: rincon.id };
  state.rincones.push(copy);
  addActivity(`Añadió rincón a la boda: ${copy.name}`);
  saveState();
  render();
}

const numericFields = new Set(["capacity", "guestsEstimate", "progress", "price"]);

const fieldLabels = {
  title: "Título",
  owner: "Responsable",
  due: "Fecha límite",
  status: "Estado",
  time: "Hora",
  category: "Categoría",
  note: "Nota",
  name: "Nombre",
  rsvp: "RSVP",
  menu: "Menu",
  allergy: "Alergias",
  table: "Mesa",
  capacity: "Capacidad",
  type: "Tipo",
  phone: "Teléfono",
  email: "Email",
  instagram: "Instagram",
  notes: "Notas",
  moment: "Momento",
  artist: "Artista",
  from: "Origen",
  to: "Destino",
  passengers: "Pasajeros",
  visibility: "Visibilidad",
  date: "Fecha",
  concept: "Concepto",
  priority: "Prioridad",
  solution: "Plan B / solucion",
};

function editableFields(collection) {
  return {
    tasks: ["title", "owner", "due", "status"],
    timeline: ["time", "title", "owner", "category", "status", "note"],
    guests: ["name", "rsvp", "menu", "allergy", "consentimientoSalud", "table"],
    tables: ["name", "capacity"],
    providers: ["name", "type", "phone", "email", "instagram", "status", "paid", "notes"],
    music: ["moment", "title", "artist", "status"],
    shotList: ["moment", "title", "people", "owner", "status", "notes"],
    services: ["title", "owner", "status", "notes"],
    transports: ["time", "type", "from", "to", "passengers", "status"],
    documents: ["name", "type", "visibility", "date"],
    issues: ["title", "owner", "priority", "status", "solution"],
  }[collection] || [];
}

function displayName(item) {
  return item.name || item.title || item.moment || item.type || item.id;
}

function completeTimeline(id) {
  const item = state.timeline.find((t) => t.id === id);
  if (!item) return;
  item.status = nextStatus(item.status);
  addActivity(`Actualizó el timeline a ${item.status}: ${item.title}`);
  saveState();
  render();
}

function toggleTask(id) {
  const item = state.tasks.find((t) => t.id === id);
  if (!item) return;
  item.status = nextStatus(item.status);
  if (isReady(item.status)) {
    item.completedBy = state.user?.name || "Equipo";
    item.completedAt = new Date().toISOString();
  }
  addActivity(`Actualizó la tarea a ${item.status}: ${item.title}`);
  saveState();
  render();
}

function toggleService(id) {
  const item = state.services.find((service) => service.id === id);
  if (!item) return;
  item.status = nextFrom(serviceStatuses, item.status);
  if (item.status === "Listo") {
    item.completedBy = state.user?.name || "Equipo";
    item.completedAt = new Date().toISOString();
  }
  addActivity(`Actualizó el proceso a ${item.status}: ${item.title}`, state.user?.name, item.weddingId);
  saveState();
  render();
}

function toggleShot(id) {
  const item = state.shotList.find((shot) => shot.id === id);
  if (!item) return;
  item.status = nextFrom(weddingDayStatuses, item.status);
  if (isWeddingDayDone(item.status)) {
    item.completedBy = state.user?.name || "Equipo";
    item.completedAt = new Date().toISOString();
  }
  addActivity(`Actualizó la foto a ${item.status}: ${item.title}`, state.user?.name, item.weddingId);
  saveState();
  render();
}

function toggleProvider(id) {
  const item = state.providers.find((provider) => provider.id === id);
  if (!item) return;
  item.status = nextFrom(confirmationStatuses, item.status);
  if (item.status === "Confirmado") {
    item.confirmedBy = state.user?.name || "Equipo";
    item.confirmedAt = new Date().toISOString();
  }
  addActivity(`Actualizó el proveedor a ${item.status}: ${item.name}`, state.user?.name, item.weddingId || "");
  saveState();
  render();
}

function toggleTableLock(id) {
  const table = state.tables.find((item) => item.id === id);
  if (!table) return;
  table.lockedAt = table.lockedAt ? "" : new Date().toISOString();
  addActivity(`${table.lockedAt ? "Bloqueó" : "Desbloqueó"} la mesa: ${table.name}`, state.user?.name, table.weddingId);
  saveState();
  render();
}


const itemModalConfig = {
  tasks: {
    prefix: "k",
    title: "Nueva tarea",
    editTitle: "Editar tarea",
    fields: [
      { name: "title", label: "Tarea", required: true, wide: true },
      { name: "owner", label: "Responsable", options: () => opcionesEquipo() },
      { name: "due", label: "Fecha límite", type: "date" },
      { name: "status", label: "Estado", options: processStatuses },
    ],
    defaults: () => ({ owner: state.user?.name || "", due: "", status: "Pendiente" }),
    activity: (item) => `Añadió tarea: ${item.title}`,
  },
  timeline: {
    prefix: "t",
    title: "Nuevo punto de timeline",
    editTitle: "Editar timeline",
    fields: [
      { name: "time", label: "Hora", type: "time", required: true },
      { name: "title", label: "Título", required: true },
      { name: "owner", label: "Responsable", options: () => opcionesEquipo() },
      { name: "category", label: "Categoría" },
      { name: "status", label: "Estado", options: weddingDayStatuses },
      { name: "note", label: "Nota", type: "textarea", wide: true },
    ],
    defaults: () => ({ time: "10:00", owner: state.user?.name || "", category: "General", status: "Pendiente", note: "" }),
    activity: (item) => `Añadió timeline: ${item.time} ${item.title}`,
  },
  guests: {
    prefix: "g",
    title: "Nuevo invitado",
    editTitle: "Editar invitado",
    fields: [
      { name: "name", label: "Nombre completo", required: true },
      { name: "email", label: "Email", placeholder: "nombre@email.com" },
      { name: "group", label: "Grupo", options: GUEST_GROUPS },
      { name: "rsvp", label: "Confirmación", options: ["Pendiente", "Confirmado", "No asiste"] },
      { name: "menu", label: "Menú", options: ["Carne", "Pescado", "Vegetariano", "Vegano", "Infantil"] },
      { name: "companion", label: "Acompañante", placeholder: "Nombre del acompañante, si lo hay" },
      { name: "allergy", label: "Alergias o restricciones", placeholder: "Sin gluten, lácteos, frutos secos..." },
      // Una alergia es un dato de salud: categoría especial del art. 9 RGPD.
      // El consentimiento de la pareja NO vale — tiene que darlo el propio
      // invitado. Registrar cómo y cuándo lo dio es lo que convierte esto en
      // un tratamiento defendible ante una inspección, no una buena intención.
      {
        name: "consentimientoSalud",
        label: "Consentimiento del invitado para tratar sus alergias",
        options: ["No registrado", "Sí, por escrito (formulario/email)", "Sí, verbalmente", "El invitado se opone"],
        help: "Solo rellena las alergias si el invitado ha dado su permiso. Es un dato de salud (art. 9 RGPD).",
      },
      { name: "table", label: "Mesa" },
    ],
    defaults: () => ({ rsvp: "Pendiente", menu: "Carne", group: "Sin grupo", email: "", companion: "", allergy: "", consentimientoSalud: "No registrado", table: "" }),
    activity: (item) => `Añadió invitado: ${item.name}`,
  },
  tables: {
    prefix: "m",
    title: "Nueva mesa",
    editTitle: "Editar mesa",
    fields: [
      { name: "name", label: "Nombre de la mesa", required: true },
      { name: "capacity", label: "Capacidad", type: "number" },
      { name: "owner", label: "Responsable", options: () => opcionesEquipo() },
      { name: "status", label: "Estado", options: processStatuses },
      { name: "names", label: "Nombres incluidos en la mesa", type: "textarea", wide: true },
      { name: "notes", label: "Notas de mesa", type: "textarea", wide: true },
    ],
    defaults: () => ({ name: "Mesa " + (byWedding("tables").length + 1), capacity: 10, owner: state.user?.name || "", status: "Pendiente", names: "", notes: "" }),
    activity: (item) => `Creo mesa: ${item.name}`,
  },
  providers: {
    prefix: "p",
    title: "Nuevo proveedor",
    editTitle: "Editar proveedor",
    fields: [
      { name: "name", label: "Nombre del proveedor", required: true },
      { name: "type", label: "Categoría", options: PROVIDER_TYPES },
      { name: "contact", label: "Persona de contacto" },
      { name: "phone", label: "Teléfono" },
      { name: "email", label: "Email", type: "email" },
      { name: "instagram", label: "Instagram" },
      { name: "web", label: "Web" },
      { name: "zone", label: "Zona" },
      { name: "status", label: "Estado", options: confirmationStatuses },
      { name: "notes", label: "Notas", type: "textarea", wide: true },
    ],
    defaults: () => ({ type: "Proveedor", contact: "", phone: "", email: "", instagram: "", web: "", zone: "", status: "Pendiente", notes: "" }),
    activity: (item) => `Añadió proveedor: ${item.name}`,
    allowGlobal: true,
  },
  rincones: {
    prefix: "rc",
    title: "Nuevo rincón",
    editTitle: "Editar rincón",
    fields: [
      { name: "name", label: "Nombre del rincón", required: true, wide: true },
      { name: "description", label: "Descripción", type: "textarea", wide: true, help: "Los novios ven esta descripción en su portal." },
      { name: "price", label: "Precio (€)", type: "number", help: "Solo lo ve el equipo. Los novios verán un botón para preguntar por WhatsApp." },
      { name: "attachmentFile", label: "Foto del rincón", type: "file", accept: ".jpg,.jpeg,.png,.webp", help: "Máximo recomendado: 3 MB.", wide: true },
      { name: "active", label: "Activo", options: ["Sí", "No"] },
    ],
    defaults: () => ({ description: "", price: 0, active: "Sí" }),
    activity: (item) => `Añadió rincón: ${item.name}`,
    allowGlobal: true,
  },
  rinconTasks: {
    prefix: "rct",
    title: "Nueva tarea del rincón",
    editTitle: "Editar tarea del rincón",
    fields: [
      { name: "title", label: "Tarea", required: true, wide: true, help: "Ej. Comprar las chuches del candy bar, encargar el neón, alquilar el espejo..." },
      {
        name: "notes",
        label: "Qué hace falta exactamente",
        type: "textarea",
        wide: true,
        help: "Escríbelo con todo el detalle que quieras: marcas, colores, medidas, cantidades, dónde se compra, qué NO vale. Quien lo ejecute puede no ser quien lo apuntó.",
      },
      { name: "cantidad", label: "Cantidad o medidas", placeholder: "Ej. 4 kg · 2 m × 1,5 m · 12 uds" },
      { name: "owner", label: "Responsable", options: () => opcionesEquipo() },
      { name: "due", label: "Para cuándo", type: "date" },
      { name: "status", label: "Estado", options: rinconTaskStatuses },
      {
        name: "attachmentFile",
        label: "Foto de referencia",
        type: "file",
        accept: ".jpg,.jpeg,.png,.webp",
        wide: true,
        help: "Opcional. La foto de cómo tiene que quedar ahorra media conversación.",
      },
    ],
    defaults: () => ({ owner: "", status: "Pendiente", notes: "", cantidad: "", due: "" }),
    activity: (item) => `Añadió tarea de rincón: ${item.title}`,
  },
  music: {
    prefix: "s",
    title: "Nueva canción",
    editTitle: "Editar música",
    fields: [
      { name: "moment", label: "Momento", required: true },
      { name: "title", label: "Canción", required: true },
      { name: "artist", label: "Artista" },
      { name: "status", label: "Estado", options: processStatuses },
    ],
    defaults: () => ({ moment: "Entrada ceremonia", artist: "", status: "Pendiente" }),
    activity: (item) => `Añadió cancion: ${item.title}`,
  },
  shotList: {
    prefix: "f",
    title: "Nueva foto clave",
    editTitle: "Editar foto clave",
    fields: [
      { name: "moment", label: "Bloque / momento", required: true },
      { name: "title", label: "Foto a realizar", required: true },
      { name: "people", label: "Personas incluidas" },
      { name: "owner", label: "Responsable", options: () => opcionesEquipo() },
      { name: "status", label: "Estado", options: weddingDayStatuses },
      { name: "notes", label: "Notas", type: "textarea", wide: true },
    ],
    defaults: () => ({ moment: "Preparativos", title: "", people: "", owner: "Fotografía", status: "Pendiente", notes: "" }),
    activity: (item) => `Añadió foto clave: ${item.title}`,
  },
  services: {
    prefix: "svc",
    title: "Servicio contratado",
    editTitle: "Editar servicio contratado",
    fields: [
      {
        name: "title",
        label: "Qué han contratado",
        required: true,
        wide: true,
        options: () => EP_SERVICE_CATALOG.map(([nombre]) => nombre),
        help: "Los paquetes del catálogo. Si es algo a medida, elige «Servicio adicional» y descríbelo abajo.",
      },
      { name: "price", label: "Precio que paga la pareja (€)", type: "number", help: "Lo que se factura por este servicio. Es el importe que sale en el contrato." },
      {
        name: "notes",
        label: "Qué incluye",
        type: "textarea",
        wide: true,
        help: "Se lo ven los novios en su portal y aparece en el contrato. Concreta lo que entra y lo que no.",
      },
    ],
    defaults: () => ({ title: EP_SERVICE_CATALOG[0][0], price: 0, notes: EP_SERVICE_CATALOG[0][1], status: "Contratado", owner: "Equipo" }),
    activity: (item) => `Añadió el servicio contratado: ${item.title}`,
  },
  transports: {
    prefix: "r",
    title: "Nuevo transporte",
    editTitle: "Editar transporte",
    fields: [
      { name: "time", label: "Hora", type: "time", required: true },
      { name: "type", label: "Tipo", required: true },
      { name: "from", label: "Origen" },
      { name: "to", label: "Destino" },
      { name: "passengers", label: "Pasajeros" },
      { name: "status", label: "Estado", options: processStatuses },
    ],
    defaults: () => ({ time: "21:30", type: "Taxi", from: "", to: "", passengers: "", status: "Pendiente" }),
    activity: (item) => `Añadió transporte: ${item.type} ${item.time}`,
  },
  documents: {
    prefix: "d",
    title: "Nuevo documento",
    editTitle: "Editar documento",
    fields: [
      { name: "name", label: "Nombre del documento", required: true },
      { name: "type", label: "Tipo" },
      { name: "visibility", label: "Visibilidad" },
      { name: "date", label: "Fecha", type: "date" },
      { name: "attachmentFile", label: "Adjuntar archivo", type: "file", accept: ".pdf,.doc,.docx,.xls,.xlsx,.csv,.jpg,.jpeg,.png,.webp,.txt", help: "Máximo recomendado: 3 MB.", wide: true },
      { name: "notes", label: "Notas", type: "textarea", wide: true },
    ],
    defaults: () => ({ type: "Archivo", visibility: "Interno", date: new Date().toISOString().slice(0, 10), notes: "" }),
    activity: (item) => `Añadió documento: ${item.name}`,
    allowGlobal: true,
  },
  issues: {
    prefix: "i",
    title: "Nueva incidencia",
    editTitle: "Editar incidencia",
    fields: [
      { name: "title", label: "Incidencia o contingencia", required: true, wide: true },
      { name: "owner", label: "Responsable", options: () => opcionesEquipo() },
      { name: "priority", label: "Prioridad" },
      { name: "status", label: "Estado" },
      { name: "solution", label: "Plan de solución", type: "textarea", wide: true },
    ],
    defaults: () => ({ owner: state.user?.name || "", priority: "Media", status: "Abierta", solution: "" }),
    activity: (item) => `Registro incidencia: ${item.title}`,
  },
};

function openItemForm(collection, item = null) {
  const config = itemModalConfig[collection];
  if (!config) return;
  if (!config.allowGlobal && !requireWedding()) return;
  const values = item ? { ...item } : config.defaults();
  // Los novios no ven los campos internos del equipo. El consentimiento de
  // salud es el caso claro: lo tiene que dar el propio invitado y lo registra
  // quien lo recoge, no la pareja marcando una casilla por él.
  const fields = state.portalMode ? config.fields.filter((f) => f.name !== "consentimientoSalud") : config.fields;
  openFormModal({
    intent: item ? "edit-item" : "create-item",
    collection,
    itemId: item?.id || null,
    title: item ? config.editTitle : config.title,
    kicker: item ? "Editar información" : "Crear información",
    submitLabel: item ? "Guardar cambios" : "Crear",
    fields,
    values,
  });
}

async function submitModalForm(event) {
  event.preventDefault();
  const modal = state.modal;
  const values = modalValues(event);
  if (!modal) return;
  if (modal.intent === "create-item") return createItemFromModal(modal.collection, values);
  if (modal.intent === "edit-item") return updateItemFromModal(modal.collection, modal.itemId, values);
  if (modal.intent === "create-user") return createUserFromModal(values);
  if (modal.intent === "edit-user") return updateUserFromModal(modal.itemId, values);
  if (modal.intent === "edit-wedding") return updateWeddingFromModal(modal.itemId, values);
  if (modal.intent === "reject-request") return rejectRinconRequestConfirmed(modal.itemId, values);
  if (modal.intent === "add-rincon-photo") return addRinconPhotoFromModal(modal.itemId, values);
  if (modal.intent === "contract-fields") return saveContractFields(modal.itemId, values);
  if (modal.intent === "contract-upload") return uploadSignedContract(modal.itemId, values);
  if (modal.intent === "duplicar-boda") return duplicarBoda(modal.itemId, values);
  if (modal.intent === "portal-nueva-mesa") return portalCrearMesa(values);
  if (modal.intent === "portal-editar-mesa") return portalGuardarMesa(modal.itemId, values);
  if (modal.intent === "create-budget") return createBudgetFromModal(values);
  if (modal.intent === "update-budget") return updateBudgetFromModal(modal.itemId, values);
  if (modal.intent === "budget-target") return saveBudgetTarget(modal.itemId, values);
  if (modal.intent === "presupuesto-proveedor") return guardarPresupuestoProveedor(modal.itemId, values);
  if (modal.intent === "crear-reunion") return crearReunion(modal.itemId, values);
  if (modal.intent === "apunte-rincon") return guardarApunte(modal.itemId, values);
  if (modal.intent === "editar-mi-perfil") return guardarMiPerfil(modal.itemId, values);
  if (modal.intent === "editar-reunion") return guardarReunion(modal.itemId, values);
  if (modal.intent === "acuerdos-reunion") return guardarAcuerdos(modal.itemId, values);
  if (modal.intent === "budget-pago") return guardarPago(modal.itemId, values);
  if (modal.intent === "create-payment") return createPaymentFromModal(values);
  if (modal.intent === "create-receipt") return createReceiptFromModal(values);
}

function normalizeModalValue(field, value) {
  return numericFields.has(field) ? Number(value) || 0 : value;
}

/**
 * Convierte un archivo elegido en el navegador en un adjunto guardable.
 *
 * Hay dos destinos posibles y NO son equivalentes:
 *
 *   · Storage — el archivo va al bucket y aquí solo queda su ruta. Es lo
 *     correcto siempre que haya nube.
 *   · base64 — el archivo entero se mete como texto dentro del estado. Es el
 *     recurso de emergencia cuando no hay nube, y tiene un coste que no se ve
 *     hasta que es tarde: el estado se sube ENTERO en cada guardado, así que
 *     una foto de 2 MB son 2 MB de subida cada vez que alguien toca una coma.
 *
 * Llegamos a tener 4,2 MB de estado con el 96 % en base64 porque UNA de las
 * siete llamadas se escribió sin pasar contexto de Storage. No fue una mala
 * decisión: fue un descuido silencioso, porque la función lo aceptaba sin
 * rechistar. Ahora no: si falta el contexto habiendo nube, se avisa por
 * consola y la prueba `subidas.mjs` falla al añadir una llamada nueva sin él.
 *
 * @param {File} file
 * @param {{storageWeddingId?: string, documentId?: string}} context
 */
async function fileToAttachment(file, context = {}) {
  if (!file || !file.name) return null;
  const uploadedAt = new Date().toISOString();

  if (supabaseClient && (!context.storageWeddingId || !context.documentId)) {
    console.warn(
      "[EP] fileToAttachment sin contexto de Storage: este archivo acabará como base64 dentro del estado y se subirá entero en cada guardado.",
      { archivo: file.name, contexto: context }
    );
  }

  if (supabaseClient && context.storageWeddingId && context.documentId) {
    const safeName = file.name.replace(/[^\w.\-]+/g, "-");
    const storagePath = `${context.storageWeddingId}/${context.documentId}/${Date.now()}-${safeName}`;
    const { error } = await supabaseClient.storage.from("ep-documents").upload(storagePath, file, {
      contentType: file.type || "application/octet-stream",
      upsert: true,
    });
    if (!error) {
      return {
        name: file.name,
        type: file.type || "application/octet-stream",
        size: file.size,
        storagePath,
        uploadedAt,
      };
    }
    console.error(error);
    toast("No hemos podido subir el archivo a la nube. Lo guardamos en este dispositivo; vuelve a intentarlo luego.");
  }
  const maxSize = 3 * 1024 * 1024;
  if (file.size > maxSize) {
    toast("El archivo pesa más de 3 MB y no se ha subido. Prueba con uno más ligero.");
    return null;
  }
  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
  return {
    name: file.name,
    type: file.type || "application/octet-stream",
    size: file.size,
    dataUrl,
    uploadedAt,
  };
}

async function createItemFromModal(collection, values) {
  const config = itemModalConfig[collection];
  const activeWeddingId = state.portalMode ? state.portalWeddingId : state.selectedWeddingId;
  const linkedWedding = config.allowGlobal && state.view !== "wedding" && !state.portalMode ? "" : activeWeddingId;
  const item = { id: uid(config.prefix), weddingId: linkedWedding };
  config.fields.forEach((field) => {
    if (field.type === "file") return;
    item[field.name] = normalizeModalValue(field.name, values[field.name]);
  });
  if (collection === "documents" || collection === "rincones" || collection === "rinconTasks") {
    const wedding = state.weddings.find((entry) => entry.id === linkedWedding);
    item.attachment = await fileToAttachment(values.attachmentFile, { storageWeddingId: wedding?.storageWeddingId, documentId: item.id });
  }
  if (collection === "rinconTasks") item.rinconId = state.activeRinconId || "";
  state[collection].push(item);
  addActivity(config.activity(item), state.portalUnlocked ? "Portal de novios" : state.user?.name, linkedWedding);
  state.modal = null;
  saveState();
  render();
}

async function updateItemFromModal(collection, id, values) {
  const item = state[collection]?.find((entry) => entry.id === id);
  const config = itemModalConfig[collection];
  if (!item || !config) return;
  config.fields.forEach((field) => {
    if (field.type === "file") return;
    item[field.name] = normalizeModalValue(field.name, values[field.name]);
  });
  if ((collection === "documents" || collection === "rincones" || collection === "rinconTasks") && values.attachmentFile?.name) {
    const wedding = state.weddings.find((entry) => entry.id === item.weddingId);
    item.attachment = await fileToAttachment(values.attachmentFile, { storageWeddingId: wedding?.storageWeddingId, documentId: item.id });
  }
  addActivity(`Edito ${collection}: ${displayName(item)}`, state.user?.name, item.weddingId || "");
  state.modal = null;
  saveState();
  render();
}

function confirmModal() {
  const modal = state.modal;
  if (!modal) return;
  const campo = document.querySelector("[data-confirm-word]");
  const typed = campo?.value || "";
  if (modal.confirmWord && typed !== modal.confirmWord) {
    // El aviso va DENTRO del diálogo y el foco vuelve al campo. Antes sólo
    // salía un toast al pie de la pantalla: en un móvil queda fuera de la
    // vista con el diálogo abierto, así que parecía que el botón no hacía
    // nada. Un botón que no acusa el toque se lee como un botón roto.
    const aviso = document.querySelector("[data-confirm-word-error]");
    if (aviso) {
      aviso.textContent = typed
        ? `Has escrito «${typed}». Escribe ${modal.confirmWord} exactamente, en mayúsculas.`
        : `Escribe ${modal.confirmWord} para poder continuar.`;
      aviso.hidden = false;
    }
    campo?.focus();
    campo?.select();
    toast(`Escribe ${modal.confirmWord} para confirmar.`);
    return;
  }
  if (modal.intent === "delete-wedding") return deleteWeddingConfirmed(modal.itemId);
  if (modal.intent === "delete-user") return deleteUserConfirmed(modal.itemId);
  if (modal.intent === "delete-item") return deleteItemConfirmed(modal.collection, modal.itemId);
  if (modal.intent === "delete-meeting") return borrarReunionConfirmada(modal.itemId);
  if (modal.intent === "reset") return resetDemoConfirmed();
  if (modal.intent === "abrir-boda-nueva") return abrirBodaNueva(modal.itemId);
  if (modal.intent === "cerrar-boda") return cerrarBodaConfirmada(modal.itemId);
  if (modal.intent === "quitar-referencia") return quitarReferenciaConfirmado();
}

function editWedding(id) {
  const wedding = state.weddings.find((item) => item.id === id);
  if (!wedding) return;
  openFormModal({
    intent: "edit-wedding",
    itemId: id,
    title: "Editar datos de boda",
    kicker: "Boda",
    submitLabel: "Guardar boda",
    // Sin la contraseña: ya no existe en claro, y precargarla vacia deja
    // claro que solo se cambia si se escribe una nueva.
    values: { ...wedding, portalPassword: "" },
    fields: [
      { name: "couple", label: "Nombre pareja", required: true },
      { name: "date", label: "Fecha", type: "date" },
      { name: "status", label: "Estado" },
      { name: "progress", label: "Progreso 0-100", type: "number" },
      { name: "ceremony", label: "Lugar ceremonia" },
      { name: "venue", label: "Lugar celebración" },
      { name: "ceremonyAddress", label: "Dirección ceremonia" },
      { name: "venueAddress", label: "Dirección celebración" },
      { name: "guestsEstimate", label: "Invitados estimados", type: "number" },
      { name: "style", label: "Estilo / concepto" },
      { name: "palettePrimary", label: "Color principal", type: "color" },
      { name: "paletteSecondary", label: "Color secundario", type: "color" },
      { name: "paletteAccent", label: "Color acento", type: "color" },
      { name: "paletteNotes", label: "Concepto de paleta", wide: true },
      {
        name: "coverFile",
        label: "Foto de portada",
        type: "file",
        accept: "image/*",
        wide: true,
        help: "La que sale en la tarjeta de la boda y en su portal. Si no pones ninguna, se dibuja un monograma con sus iniciales.",
      },
      { name: "lead", label: "Responsable" },
      { name: "portalPassword", label: "Contraseña del portal de novios", placeholder: "Dejar vacío para no cambiarla" },
      { name: "firstMeetingNotes", label: "Apuntes primera reunión", type: "textarea", wide: true, help: "Lo más importante que habéis hablado con la pareja. Solo lo ve el equipo." },
      { name: "notes", label: "Notas", type: "textarea", wide: true },
    ],
  });
}

async function updateWeddingFromModal(id, values) {
  const wedding = state.weddings.find((item) => item.id === id);
  if (!wedding) return;
  ["couple", "date", "status", "ceremony", "venue", "ceremonyAddress", "venueAddress", "style", "palettePrimary", "paletteSecondary", "paletteAccent", "paletteNotes", "lead", "notes"].forEach((field) => {
    wedding[field] = values[field] || "";
  });
  // La contraseña del portal solo se reemplaza si se escribe una nueva;
  // dejar el campo vacio conserva la que ya tenian los novios.
  if (values.portalPassword) {
    wedding.portalPasswordHash = await hashPassword(values.portalPassword);
    delete wedding.portalPassword;
  }
  wedding.progress = Number(values.progress) || 0;
  wedding.guestsEstimate = Number(values.guestsEstimate) || 0;

  // La portada va a Storage como cualquier otro archivo: si acabara dentro del
  // estado como texto, una foto de boda por cada pareja engordaría todos los
  // guardados de todo el equipo.
  if (values.coverFile) {
    const adjunto = await fileToAttachment(values.coverFile, {
      storageWeddingId: wedding.storageWeddingId || wedding.id,
      documentId: `portada-${wedding.id}`,
    });
    if (adjunto) {
      if (adjunto.dataUrl) wedding.cover = adjunto.dataUrl;
      else {
        wedding.coverStoragePath = adjunto.storagePath;
        wedding.cover = (await storageBlobUrl(adjunto)) || "";
      }
      addActivity(`Cambió la foto de portada de ${wedding.couple}`, state.user?.name, wedding.id);
    }
  }

  addActivity(`Edito la boda ${wedding.couple}`);
  state.modal = null;
  saveState();
  render();
}

function deleteWedding(id) {
  const wedding = state.weddings.find((item) => item.id === id);
  if (!wedding) return;
  openConfirmModal({
    intent: "delete-wedding",
    itemId: id,
    title: `Borrar ${wedding.couple}`,
    message: "Se eliminará la boda con todos sus datos. Esta acción no se puede deshacer.",
    confirmWord: "BORRAR",
    confirmLabel: "Borrar boda",
  });
}

function deleteWeddingConfirmed(id) {
  const wedding = state.weddings.find((item) => item.id === id);
  if (!wedding) return;
  ["timeline", "tasks", "providers", "rincones", "rinconTasks", "guests", "tables", "music", "transports", "documents", "shotList", "services", "contracts", "payments", "receipts", "budget", "issues", "notes", "activity"].forEach((collection) => {
    state[collection] = state[collection].filter((item) => item.weddingId !== id);
  });
  state.weddings = state.weddings.filter((item) => item.id !== id);
  state.selectedWeddingId = state.weddings[0]?.id || null;
  state.view = "weddings";
  state.modal = null;
  toast(`Boda borrada: ${wedding.couple}`);
  saveState();
  render();
}

function newUser() {
  if (!canManageUsers()) {
    toast("Solo administración puede crear personas del equipo.");
    return;
  }
  openFormModal({
    intent: "create-user",
    title: "Crear persona del equipo",
    kicker: "Equipo",
    submitLabel: "Crear persona",
    values: { role: "Asistente de eventos", username: "", password: "admin" },
    fields: [
      { name: "name", label: "Nombre", required: true },
      { name: "role", label: "Cargo", required: true },
      { name: "phone", label: "Teléfono móvil", placeholder: "+34 600 000 000", help: "Sirve para llamar o escribir por WhatsApp desde su ficha." },
      { name: "email", label: "Correo electrónico", type: "email", placeholder: "nombre@example.com", help: "Correo de contacto del equipo. Queda guardado en su ficha." },
      { name: "username", label: "Usuario", required: true },
      { name: "password", label: "Contraseña", required: true },
    ],
  });
}

async function createUserFromModal(values) {
  const username = values.username.trim().toLowerCase();
  if (state.users.some((user) => user.username === username)) {
    toast("Ese usuario ya existe. Prueba con otro nombre.");
    return;
  }
  // Solo se guarda el hash: la contraseña en claro no llega ni a memoria
  // persistente ni al respaldo del navegador.
  state.users.push({ id: uid("u"), name: values.name.trim(), role: values.role.trim(), phone: String(values.phone || "").trim(), email: String(values.email || "").trim().toLowerCase(), username, passwordHash: await hashPassword(values.password) });
  if (values.role && !state.roles.includes(values.role)) state.roles.push(values.role);
  addActivity(`Creo miembro del equipo: ${values.name}`);
  state.modal = null;
  saveState();
  render();
}

/**
 * Editar los datos de uno mismo. A diferencia de `editUser`, no exige ser
 * administración: cualquiera puede mantener su propio correo y su teléfono, que
 * es de lo que depende poder recuperar su acceso. Lo que NO se puede cambiar
 * aquí es el cargo ni el usuario: eso sigue siendo cosa de administración.
 */
function editarMiPerfil() {
  const yo = state.user ? state.users.find((u) => u.id === state.user.id) : null;
  if (!yo) return;
  openFormModal({
    intent: "editar-mi-perfil",
    itemId: yo.id,
    title: "Mis datos",
    kicker: "Mi perfil",
    submitLabel: "Guardar mis datos",
    values: { name: yo.name, email: yo.email || "", phone: yo.phone || "", password: "" },
    fields: [
      { name: "name", label: "Nombre", required: true, wide: true },
      { name: "email", label: "Correo electrónico", type: "email", wide: true, placeholder: "nombre@example.com", help: "Tu correo de contacto dentro del equipo." },
      { name: "phone", label: "Teléfono móvil", placeholder: "+34 600 000 000", help: "Para que el equipo pueda llamarte o escribirte por WhatsApp." },
      { name: "password", label: "Nueva contraseña", type: "password", placeholder: "Dejar vacío para no cambiarla" },
    ],
  });
}

async function guardarMiPerfil(id, values) {
  const yo = state.users.find((u) => u.id === id);
  if (!yo || !state.user || state.user.id !== id) return;

  const correo = String(values.email || "").trim().toLowerCase();
  // Validación mínima pero real: un correo mal escrito aquí es un acceso
  // perdido más adelante, y no se nota hasta que hace falta.
  if (correo && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(correo)) {
    toast("Ese correo no parece correcto. Revísalo antes de guardar.", 6000);
    return;
  }

  yo.name = String(values.name || "").trim() || yo.name;
  yo.email = correo;
  yo.phone = String(values.phone || "").trim();
  if (values.password) {
    yo.passwordHash = await hashPassword(values.password);
    delete yo.password;
  }
  state.user = { ...state.user, name: yo.name };
  addActivity("Actualizó sus datos de perfil", yo.name);
  state.modal = null;
  saveState();
  render();
  toast(values.password ? "Datos y contraseña actualizados." : "Datos actualizados.");
}

function editUser(id) {
  if (!canManageUsers()) {
    toast("Solo administración puede editar personas del equipo.");
    return;
  }
  const user = state.users.find((item) => item.id === id);
  if (!user) return;
  openFormModal({
    intent: "edit-user",
    itemId: id,
    title: "Editar persona",
    kicker: "Equipo",
    submitLabel: "Guardar persona",
    values: { ...user, password: "" },
    fields: [
      { name: "name", label: "Nombre", required: true },
      { name: "role", label: "Cargo", required: true },
      { name: "phone", label: "Teléfono móvil", placeholder: "+34 600 000 000", help: "Sirve para llamar o escribir por WhatsApp desde su ficha." },
      { name: "email", label: "Correo electrónico", type: "email", placeholder: "nombre@example.com", help: "Correo de contacto del equipo. Queda guardado en su ficha." },
      { name: "username", label: "Usuario", required: true },
      { name: "password", label: "Contraseña", placeholder: "Dejar vacío para no cambiarla" },
    ],
  });
}

async function updateUserFromModal(id, values) {
  const user = state.users.find((item) => item.id === id);
  if (!user) return;
  const username = values.username.trim().toLowerCase();
  if (state.users.some((item) => item.id !== id && item.username === username)) {
    toast("Ese usuario ya existe. Prueba con otro nombre.");
    return;
  }
  user.name = values.name.trim();
  user.role = values.role.trim();
  user.phone = String(values.phone || "").trim();
  user.email = String(values.email || "").trim().toLowerCase();
  user.username = username;
  if (values.password) {
    user.passwordHash = await hashPassword(values.password);
    delete user.password;
  }
  if (user.role && !state.roles.includes(user.role)) state.roles.push(user.role);
  addActivity(`Actualizó el miembro del equipo: ${user.name}`);
  state.modal = null;
  saveState();
  render();
}

function deleteUser(id) {
  const user = state.users.find((item) => item.id === id);
  if (!canManageUsers() || !user) return;
  if (state.users.length <= 1) {
    toast("Tiene que quedar al menos una persona con acceso.");
    return;
  }
  openConfirmModal({
    intent: "delete-user",
    itemId: id,
    title: `Borrar a ${user.name}`,
    message: "Esta persona perderá el acceso a Events Planner.",
    confirmLabel: "Borrar persona",
  });
}

function deleteUserConfirmed(id) {
  const user = state.users.find((item) => item.id === id);
  if (!user) return;
  state.users = state.users.filter((item) => item.id !== id);
  addActivity(`Borro miembro del equipo: ${user.name}`);
  if (state.user?.id === id) state.user = null;
  state.modal = null;
  saveState();
  render();
}

function editItem(token) {
  const [collection, id] = token.split(":");
  const item = state[collection]?.find((entry) => entry.id === id);
  if (!item) return;
  openItemForm(collection, item);
}

function deleteItem(token) {
  const [collection, id] = token.split(":");
  const item = state[collection]?.find((entry) => entry.id === id);
  if (!item) return;
  openConfirmModal({
    intent: "delete-item",
    collection,
    itemId: id,
    title: `Borrar ${displayName(item)}`,
    message: "Se quitará de la lista. Tendrás unos segundos para recuperarlo con Deshacer.",
    confirmLabel: "Borrar",
  });
}

function deleteItemConfirmed(collection, id) {
  const item = state[collection]?.find((entry) => entry.id === id);
  if (!item) return;
  // Se guarda la posición exacta para que al deshacer vuelva a su sitio en la
  // lista, no al final. Si vuelve descolocado, no parece lo mismo.
  const posicion = state[collection].findIndex((entry) => entry.id === id);
  state[collection] = state[collection].filter((entry) => entry.id !== id);

  // Las tareas de preparación de un rincón (materiales, pedidos...) no tienen
  // sentido sin el rincón al que pertenecen, así que se van con él — y vuelven
  // con él si se deshace.
  const tareasRincon = collection === "rincones" ? state.rinconTasks.filter((t) => t.rinconId === id) : [];
  if (tareasRincon.length) state.rinconTasks = state.rinconTasks.filter((t) => t.rinconId !== id);

  addActivity(`Borro ${collection}: ${displayName(item)}`, state.user?.name, item.weddingId || "");
  state.modal = null;
  saveState();
  render();

  toastUndo(`Se ha borrado "${displayName(item)}"`, () => {
    state[collection].splice(Math.max(0, posicion), 0, item);
    if (tareasRincon.length) state.rinconTasks.push(...tareasRincon);
    addActivity(`Recuperó ${collection}: ${displayName(item)}`, state.user?.name, item.weddingId || "");
    saveState();
    render();
    toast("Recuperado.");
  });
}

function newTask() {
  openItemForm("tasks");
}

function newTimeline() {
  openItemForm("timeline");
}

function newGuest() {
  openItemForm("guests");
}

function newTable() {
  openItemForm("tables");
}

function newProvider() {
  openItemForm("providers");
}

function newRincon() {
  openItemForm("rincones");
}

function newRinconTask(rinconId) {
  state.activeRinconId = rinconId;
  openItemForm("rinconTasks");
}

/**
 * Deja constancia de algo en una tarea de rincon.
 *
 * El seguimiento de un rincon no es un si/no: son varios pasos separados en el
 * tiempo —«hay que comprar las chuches», «pedido hecho, llegan el jueves», «ya
 * han llegado»— y normalmente los da gente distinta. Con un solo campo de
 * notas, cada persona borraba lo que habia escrito la anterior.
 *
 * Por eso los apuntes se ACUMULAN, con quien y cuando. Cambiar el estado deja
 * su propio apunte sin que nadie tenga que escribirlo.
 */
function apuntar(task, texto, estado) {
  if (!Array.isArray(task.apuntes)) task.apuntes = [];
  task.apuntes.push({
    id: uid("ap"),
    at: new Date().toISOString(),
    by: state.user?.name || "Equipo",
    texto: String(texto || "").trim(),
    estado: estado || "",
  });
}

function toggleRinconTask(id) {
  const item = state.rinconTasks.find((task) => task.id === id);
  if (!item) return;
  item.status = nextFrom(rinconTaskStatuses, item.status);
  // El cambio de estado se apunta solo: es el 90 % de lo que hay que contar.
  apuntar(item, "", item.status);
  addActivity(`Actualizó tarea de rincón a ${item.status}: ${item.title}`, state.user?.name, item.weddingId || "");
  saveState();
  render();
}

/** Añadir un apunte escrito a mano. */
function apuntarEnTarea(id) {
  const item = state.rinconTasks.find((task) => task.id === id);
  if (!item) return;
  openFormModal({
    intent: "apunte-rincon",
    itemId: id,
    title: "Dejar un apunte",
    kicker: item.title,
    submitLabel: "Guardar apunte",
    values: { texto: "" },
    fields: [
      {
        name: "texto",
        label: "¿Qué hay que contar?",
        type: "textarea",
        wide: true,
        required: true,
        help: "Lo verá el resto del equipo. Ej.: «Pedidas 4 bolsas en el súper, llegan el jueves» · «Han llegado, están en el almacén» · «Falta el color rosa, lo miro mañana».",
      },
    ],
  });
}

function guardarApunte(id, values) {
  const item = state.rinconTasks.find((task) => task.id === id);
  if (!item) return;
  const texto = String(values.texto || "").trim();
  if (!texto) return;
  apuntar(item, texto, "");
  addActivity(`Apuntó en «${item.title}»: ${texto.slice(0, 60)}`, state.user?.name, item.weddingId || "");
  state.modal = null;
  saveState();
  render();
}

function newMusic() {
  openItemForm("music");
}

function newShot() {
  openItemForm("shotList");
}

function newService() {
  openItemForm("services");
}

function newTransport() {
  openItemForm("transports");
}

function newDocument() {
  openItemForm("documents");
}

function newIssue() {
  openItemForm("issues");
}

/**
 * Abre una foto de rincón. Acepta "idRincon" (primera foto) o
 * "idRincon:idFoto" desde la galería.
 */
function viewRinconPhoto(ref) {
  const [rinconId, photoId] = String(ref).split(":");
  const item = state.rincones.find((r) => r.id === rinconId);
  if (!item) return;
  const fotos = rinconGallery(item);
  const foto = photoId ? fotos.find((p) => p.id === photoId) : fotos[0];
  const url = fotoSrc(foto) || fotoSrc(item.attachment);
  if (!url) {
    toast("Este rincón aún no tiene foto. Puedes añadirla al editarlo.");
    return;
  }
  window.open(url, "_blank", "noopener");
}

/** Abre la foto de referencia de una tarea de rincón a tamaño completo. */
function viewRinconTaskPhoto(id) {
  const task = state.rinconTasks.find((t) => t.id === id);
  const url = fotoSrc(task?.attachment);
  if (!url) {
    toast("Esta tarea no tiene foto de referencia todavía.");
    return;
  }
  window.open(url, "_blank", "noopener");
}

function viewDocument(id) {
  const item = state.documents.find((document) => document.id === id);
  if (!item) return;
  openInfoModal({
    title: item.name,
    kicker: "Documento",
    rows: [
      { label: "Tipo", value: item.type },
      { label: "Visibilidad", value: item.visibility },
      { label: "Fecha", value: item.date },
      { label: "Archivo adjunto", value: item.attachment?.name || "Sin archivo adjunto" },
      { label: "Tamaño", value: item.attachment?.size ? `${Math.round(item.attachment.size / 1024)} KB` : "" },
      { label: "Notas", value: item.notes || "Sin notas" },
    ],
  });
  addActivity(`Consulto documento: ${item.name}`, state.user?.name, item.weddingId || "");
  saveState();
}

async function storageBlobUrl(attachment) {
  if (!supabaseClient || !attachment?.storagePath) return "";
  const { data, error } = await supabaseClient.storage.from("ep-documents").download(attachment.storagePath);
  if (error) {
    console.error(error);
    toast("No hemos podido abrir el archivo. Inténtalo de nuevo en unos segundos.");
    return "";
  }
  return URL.createObjectURL(data);
}

async function openDocumentAttachment(id) {
  const item = state.documents.find((document) => document.id === id);
  const url = item?.attachment?.dataUrl || (await storageBlobUrl(item?.attachment));
  if (!url) {
    toast("Este documento no tiene archivo adjunto. Puedes subirlo al editarlo.");
    return;
  }
  window.open(url, "_blank", "noopener");
}

async function downloadDocumentAttachment(id) {
  const item = state.documents.find((document) => document.id === id);
  const url = item?.attachment?.dataUrl || (await storageBlobUrl(item?.attachment));
  if (!url) {
    toast("Este documento no tiene archivo adjunto. Puedes subirlo al editarlo.");
    return;
  }
  const link = document.createElement("a");
  link.href = url;
  link.download = item.attachment.name || `${item.name}.archivo`;
  link.click();
}

export { apuntarEnTarea, guardarApunte, fotoSrc, editarMiPerfil, guardarMiPerfil, decidirProveedor, subirPresupuestoProveedor, guardarPresupuestoProveedor, verPresupuestoProveedor, opcionesEquipo, abrirBodaNueva, volverAlListado, duplicarBoda, duplicarBodaForm, addActivity, openCoverPicker, pickCover, uploadCoverPhoto, addDraftRincon, addDraftService, addRinconPhotoFromModal, approveRinconPhoto, deleteRinconPhoto, newRinconPhoto, rinconGallery, addExistingProvider, addExistingRincon, approveRinconRequest, rejectRinconRequest, cancelWeddingForm, removeDraftRincon, removeDraftService, updateDraftField, closeModal, completeTimeline, confirmModal, createItemFromModal, createUserFromModal, createWeddingFromForm, deleteItem, deleteItemConfirmed, deleteUser, deleteUserConfirmed, deleteWedding, deleteWeddingConfirmed, displayName, downloadDocumentAttachment, editItem, editUser, editWedding, editableFields, fieldLabels, fileToAttachment, itemModalConfig, modalValues, newDocument, newGuest, newIssue, newMusic, newProvider, newRincon, newRinconTask, newService, newShot, newTable, newTask, newTimeline, newTransport, newUser, newWedding, normalizeModalValue, numericFields, openConfirmModal, openDocumentAttachment, openFormModal, openInfoModal, openItemForm, renderModal, renderModalField, requireWedding, seedWeddingOperatingLists, storageBlobUrl, submitModalForm, toggleProvider, toggleRinconTask, toggleService, toggleShot, toggleTableLock, toggleTask, updateItemFromModal, updateUserFromModal, updateWeddingFromModal, viewDocument, viewRinconPhoto, viewRinconTaskPhoto };
