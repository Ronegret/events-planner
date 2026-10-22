import { icono } from "./iconos.js";
import { render } from "./render.js";
import { addActivity, openConfirmModal } from "./modals.js";
import { descargarCopiaSeguridad } from "./rgpd.js";
import { replaceState, saveState, state, text, toast } from "./state.js";

// ============================================================================
// Bodas de ejemplo
// ----------------------------------------------------------------------------
// Las tres bodas de demostración (una por empezar, una inminente y una ya
// celebrada) vienen cargadas de serie. Este módulo permite quitarlas y volver a
// cargarlas a mano, y marca como «Referencia» las que se cargan así, para que
// nadie confunda «la boda que estoy gestionando» con «una boda abierta para
// mirar cómo funciona».
//
// Todos los datos son inventados. En una versión con clientes reales, cargar o
// borrar bodas ya no es «limpiar la demo»: es tocar un expediente, y los datos
// personales que contiene exigen saber cuánto se conservan y para qué.
// ============================================================================

// Vacío a propósito: las bodas de demostración llegan como bodas normales y solo
// pasan a ser «de referencia» cuando se cargan desde el botón.
const IDS_REFERENCIA = [];

/** Las bodas de referencia que hay ahora mismo cargadas. */
function bodasDeReferencia() {
  return state.weddings.filter((w) => w.esReferencia || IDS_REFERENCIA.includes(w.id));
}

/** Colecciones que cuelgan de una boda y hay que limpiar con ella. */
const COLECCIONES = [
  "timeline", "tasks", "providers", "rincones", "rinconTasks", "rinconRequests",
  "guests", "tables", "music", "transports", "documents", "shotList", "services",
  "contracts", "payments", "receipts", "budget", "meetings", "issues", "notes", "activity",
];

function cargarReferencia() {
  const semilla = window.EP_DEMO_SEED;
  if (!semilla) {
    toast("No hemos encontrado las bodas de ejemplo. Recarga la página y vuelve a intentarlo.", 8000);
    return;
  }

  const yaEstan = new Set(state.weddings.map((w) => w.id));
  const nuevas = (semilla.weddings || []).filter((w) => !yaEstan.has(w.id));
  if (!nuevas.length) {
    toast("Las bodas de ejemplo ya están cargadas.");
    return;
  }

  const idsNuevos = new Set(nuevas.map((w) => w.id));
  state.referenciaRetirada = false;
  state.weddings.push(...nuevas.map((w) => ({ ...w, esReferencia: true })));

  // Y todo lo que cuelga de ellas, sin tocar lo que ya hubiera.
  COLECCIONES.forEach((col) => {
    if (!Array.isArray(semilla[col])) return;
    const existentes = new Set((state[col] || []).map((x) => x.id));
    const suyos = semilla[col].filter((x) => !existentes.has(x.id) && (idsNuevos.has(x.weddingId) || x.weddingId === ""));
    if (suyos.length) state[col] = [...(state[col] || []), ...suyos.map((x) => ({ ...x, esReferencia: true }))];
  });

  addActivity(`Cargó ${nuevas.length} bodas de referencia`, state.user?.name, "");
  saveState();
  render();
  toast(`${nuevas.length} bodas de ejemplo cargadas: ${nuevas.map((w) => w.couple).join(", ")}. Salen marcadas como «Referencia» para no confundirlas con la boda que estés gestionando.`, 10000);
}

function quitarReferencia() {
  const refs = bodasDeReferencia();
  if (!refs.length) {
    toast("Ahora mismo no hay bodas de ejemplo cargadas.");
    return;
  }
  openConfirmModal({
    intent: "quitar-referencia",
    tono: "neutro",
    title: `Quitar ${refs.length} boda${refs.length === 1 ? "" : "s"} de referencia`,
    // Son bodas reales: conviene decirlo con todas las letras antes de borrar.
    message: `Se quitarán de la aplicación ${refs.map((w) => w.couple).join(", ")} con sus invitados, mesas, proveedores y documentos. Son bodas de ejemplo; antes se descarga una copia de seguridad por si hiciera falta recuperarlas. El resto de bodas no se tocan.`,
    confirmLabel: "Quitarlas de la aplicación",
  });
}

function quitarReferenciaConfirmado() {
  const refs = bodasDeReferencia();
  const ids = new Set(refs.map((w) => w.id));
  if (!ids.size) return;

  descargarCopiaSeguridad();

  state.weddings = state.weddings.filter((w) => !ids.has(w.id));
  COLECCIONES.forEach((col) => {
    if (!Array.isArray(state[col])) return;
    // Se borra lo que pertenece a esas bodas y lo global marcado como referencia.
    state[col] = state[col].filter((x) => !(ids.has(x.weddingId) || (x.esReferencia && x.weddingId === "")));
  });

  if (ids.has(state.selectedWeddingId)) state.selectedWeddingId = state.weddings[0]?.id || null;
  if (ids.has(state.portalWeddingId)) state.portalWeddingId = null;

  // Se deja constancia de que la retirada fue deliberada, para que la red de
  // seguridad de main.js (repararPlannerVacio) no las vuelva a meter sola.
  state.referenciaRetirada = true;

  addActivity(`Quitó ${refs.length} bodas de referencia`, state.user?.name, "");
  state.modal = null;
  saveState();
  render();
  toast(`Quitadas. Quedan ${state.weddings.length} boda${state.weddings.length === 1 ? "" : "s"}.`, 6000);
}

/** El panel de Ajustes. */
function renderReferencia() {
  const refs = bodasDeReferencia();
  const enCurso = state.weddings.length - refs.length;

  return `
    <section class="panel" style="margin-top:18px">
      <div class="section-title compact">
        <div>
          <h3 class="card-title">Bodas de ejemplo</h3>
          <p class="card-sub">Tres bodas inventadas, en momentos distintos, para probar la herramienta con datos completos.</p>
        </div>
        <span class="pill">${refs.length ? `${refs.length} cargadas` : "Ninguna"}</span>
      </div>

      <div class="referencia-estado">
        <div>
          <strong>${enCurso}</strong>
          <span>boda${enCurso === 1 ? "" : "s"} en gestión</span>
        </div>
        <div class="${refs.length ? "hay" : ""}">
          <strong>${refs.length}</strong>
          <span>de referencia</span>
        </div>
      </div>

      ${
        refs.length
          ? `<p class="card-sub" style="margin-top:12px">Cargadas: ${text(refs.map((w) => w.couple).join(", "))}. Salen con la etiqueta <span class="chip-referencia">Ejemplo</span> en el listado, para no confundir «la boda que estoy gestionando» con «la que tengo abierta para mirar cómo se hizo».</p>
             <div class="actions" style="margin-top:14px">
               <button class="btn" data-quitar-referencia>${icono("cerrar")} Quitar las de referencia</button>
             </div>`
          : `<p class="card-sub" style="margin-top:12px">Ahora mismo no hay ninguna cargada.</p>
             <div class="actions" style="margin-top:14px">
               <button class="btn primary" data-cargar-referencia>+ Cargar las bodas de referencia</button>
             </div>`
      }

      ${
        // Esto no estaba, y con bodas reales hace falta. No es un adorno
        // legal: son nombres, teléfonos y alergias de personas que confiaron
        // sus datos para organizar su boda, no para que sirvieran de material
        // de formación indefinidamente.
        refs.length
          ? `<div class="budget-aviso" role="note" style="margin-top:16px">
              <strong>Son datos de ejemplo</strong>
              <span>Cuando trabajes con bodas reales, conviene decidir cuánto tiempo se conservan una vez celebradas: el RGPD pide no guardarlos más de lo necesario para la finalidad con la que se recogieron (art. 5.1.e). Si solo hacen falta para aprender la herramienta, se pueden quitar cuando el equipo ya la maneje.</span>
            </div>`
          : ""
      }
    </section>
  `;
}

export { bodasDeReferencia, cargarReferencia, quitarReferencia, quitarReferenciaConfirmado, renderReferencia };
