import { budgetSummary } from "./budget.js";
import { documentosDe } from "./documentos.js";
import { addActivity, openConfirmModal } from "./modals.js";
import { render } from "./render.js";
import { byWeddingId, formatDate, hashPassword, saveState, sortedWeddings, state, text, toast, weddingTasks } from "./state.js";

// ============================================================================
// Ciclo de vida de una boda y acceso de las parejas
// ----------------------------------------------------------------------------
// Dos preguntas que no tenían respuesta en la aplicación:
//
//   «¿Cómo se da por cerrada una boda?»
//   «Veo la contraseña de la pareja pero no el usuario.»
//
// La primera no era un detalle: sin un cierre explícito, una boda de hace ocho
// meses sigue pesando en el panel igual que la del mes que viene. El equipo
// acaba filtrando con la vista, que es la forma más cara de filtrar.
//
// El cierre no se inventa un estado nuevo por gusto: comprueba lo que de
// verdad tiene que estar hecho —que no quede dinero por pagar, que estén los
// documentos, que no haya incidencias abiertas— y lo enseña ANTES de cerrar.
// Se puede cerrar con avisos, porque la realidad manda; pero se cierra
// sabiendo qué queda, no por accidente.
// ============================================================================

const ESTADOS_BODA = ["En preparacion", "Wedding week", "Celebrada", "Cerrada", "Cancelada"];

function estaCerrada(w) {
  return /cerrada|cancelada/i.test(String(w?.status || ""));
}

function estaCelebrada(w) {
  return !!w?.date && new Date(w.date) < new Date(new Date().toDateString());
}

/**
 * Lo que falta para poder cerrar. Devuelve avisos, no prohibiciones: una boda
 * puede cerrarse con un fleco pendiente si alguien lo decide a sabiendas.
 */
function revisionDeCierre(weddingId) {
  const r = budgetSummary(weddingId);
  const tareas = weddingTasks(weddingId).filter((t) => !/hecho|listo|completa/i.test(String(t.status || "")));
  const incidencias = byWeddingId("issues", weddingId).filter((i) => !/cerrada|resuelta|listo/i.test(String(i.status || "")));
  const docs = documentosDe(weddingId);
  const contrato = byWeddingId("contracts", weddingId)[0];

  return [
    {
      clave: "pagos",
      titulo: "Todos los pagos liquidados",
      ok: r.pendiente < 1,
      detalle: r.pendiente < 1 ? "No queda nada pendiente" : `Quedan ${Math.round(r.pendiente).toLocaleString("es-ES")} € por pagar`,
    },
    {
      clave: "justificantes",
      titulo: "Documentación archivada",
      ok: docs.length > 0,
      detalle: docs.length ? `${docs.length} documento${docs.length === 1 ? "" : "s"} en el índice` : "No hay ningún documento adjunto",
    },
    {
      clave: "contrato",
      titulo: "Contrato firmado y recibido",
      ok: !!contrato?.receivedAt,
      detalle: contrato?.receivedAt ? `Recibido el ${formatDate(contrato.receivedAt.slice(0, 10))}` : "No consta el contrato firmado",
    },
    {
      clave: "tareas",
      titulo: "Sin tareas pendientes",
      ok: !tareas.length,
      detalle: tareas.length ? `${tareas.length} tarea${tareas.length === 1 ? "" : "s"} sin cerrar` : "Todo hecho",
    },
    {
      clave: "incidencias",
      titulo: "Sin incidencias abiertas",
      ok: !incidencias.length,
      detalle: incidencias.length ? `${incidencias.length} sin resolver` : "Ninguna abierta",
    },
  ];
}

function cerrarBoda(weddingId) {
  const w = state.weddings.find((x) => x.id === weddingId);
  if (!w) return;
  const revision = revisionDeCierre(weddingId);
  const flecos = revision.filter((p) => !p.ok);

  openConfirmModal({
    intent: "cerrar-boda",
    itemId: weddingId,
    tono: flecos.length ? undefined : "neutro",
    title: `Cerrar la boda de ${w.couple}`,
    message: flecos.length
      ? `Quedan ${flecos.length} cosa${flecos.length === 1 ? "" : "s"} sin rematar: ${flecos.map((f) => f.titulo.toLowerCase()).join(", ")}. Se puede cerrar igualmente, pero quedará anotado en la actividad.`
      : "Todo está en orden. La boda pasará a Cerrada y dejará de aparecer entre las activas del panel. Sus datos se conservan y se puede reabrir cuando quieras.",
    confirmLabel: flecos.length ? "Cerrar de todas formas" : "Cerrar la boda",
  });
}

/** El cierre de verdad, ya confirmado. */
function cerrarBodaConfirmada(weddingId) {
  const w = state.weddings.find((x) => x.id === weddingId);
  if (!w) return;
  const flecos = revisionDeCierre(weddingId).filter((p) => !p.ok);
  w.status = "Cerrada";
  w.closedAt = new Date().toISOString();
  w.closedBy = state.user?.name || "Equipo";
  w.closedPending = flecos.map((f) => f.titulo);
  addActivity(
    flecos.length ? `Cerró la boda con ${flecos.length} punto(s) pendiente(s): ${flecos.map((f) => f.titulo).join(", ")}` : "Cerró la boda con todo en orden",
    state.user?.name,
    weddingId
  );
  state.modal = null;
  saveState();
  render();
  toast(`Boda de ${w.couple} cerrada.`, 5000);
}

function reabrirBoda(weddingId) {
  const w = state.weddings.find((x) => x.id === weddingId);
  if (!w) return;
  w.status = estaCelebrada(w) ? "Celebrada" : "En preparacion";
  delete w.closedAt;
  delete w.closedPending;
  addActivity("Reabrió la boda", state.user?.name, weddingId);
  saveState();
  render();
  toast(`Boda de ${w.couple} reabierta.`);
}

/** El panel de cierre, dentro de Herramientas. */
function renderCierre() {
  const weddingId = state.selectedWeddingId;
  const w = state.weddings.find((x) => x.id === weddingId);
  if (!w) return "";
  const revision = revisionDeCierre(weddingId);
  const listos = revision.filter((p) => p.ok).length;
  const cerrada = estaCerrada(w);

  return `
    <section class="panel">
      <div class="panel-head">
        <div>
          <h3 class="card-title">Cierre de la boda</h3>
          <p class="card-sub">${
            cerrada
              ? `Cerrada el ${text(formatDate(String(w.closedAt || "").slice(0, 10)))} por ${text(w.closedBy || "el equipo")}.`
              : "Lo que conviene tener rematado antes de dar la boda por terminada. Se puede cerrar con flecos, pero quedan anotados."
          }</p>
        </div>
        <span class="pill">${listos} de ${revision.length}</span>
      </div>

      <ul class="cierre-lista">
        ${revision
          .map(
            (p) => `<li class="cierre-punto${p.ok ? " ok" : ""}">
              <span class="cierre-marca" aria-hidden="true">${p.ok ? "✓" : "○"}</span>
              <div>
                <strong>${text(p.titulo)}</strong>
                <span>${text(p.detalle)}</span>
              </div>
            </li>`
          )
          .join("")}
      </ul>

      ${
        cerrada && (w.closedPending || []).length
          ? `<div class="budget-soon" role="status"><strong>Se cerró con pendientes</strong><p>${w.closedPending.map(text).join(" — ")}</p></div>`
          : ""
      }

      <div class="actions cierre-acciones">
        ${
          cerrada
            ? `<button class="btn" data-reabrir-boda="${w.id}">↺ Reabrir la boda</button>`
            : `<button class="btn primary" data-cerrar-boda="${w.id}">✓ Dar la boda por cerrada</button>`
        }
      </div>
    </section>
  `;
}

// ---------------------------------------------------------------------------
// Acceso de las parejas
// ---------------------------------------------------------------------------
/** El usuario del portal se deriva del nombre de la pareja, no se inventa. */
function usuarioPortal(w) {
  return (
    w.portalUser ||
    String(w.couple || "")
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^A-Za-z]+/g, ".")
      .replace(/^\.|\.$/g, "")
      .toLowerCase()
  );
}

function nuevaClavePortal(w) {
  const base = String(w.couple || "boda").replace(/[^A-Za-z]/g, "").toUpperCase().slice(0, 8);
  return `${base}${new Date().getFullYear()}${Math.floor(Math.random() * 90 + 10)}`;
}

async function regenerarClavePortal(weddingId) {
  const w = state.weddings.find((x) => x.id === weddingId);
  if (!w) return;
  const clave = nuevaClavePortal(w);
  w.portalPasswordHash = await hashPassword(clave);
  w.portalUser = usuarioPortal(w);
  addActivity("Regeneró la contraseña del portal", state.user?.name, weddingId);
  saveState();
  render();
  // Se enseña una vez y no se guarda en claro: si se pierde, se regenera.
  toast(`Nueva contraseña de ${w.couple}: ${clave}. Apúntala ahora: no se podrá volver a ver.`, 15000);
}

/** Panel de Ajustes con el acceso de cada pareja. */
function renderUsuariosParejas() {
  const bodas = sortedWeddings();
  return `
    <section class="panel">
      <div class="panel-head">
        <div>
          <h3 class="card-title">Acceso de las parejas</h3>
          <p class="card-sub">Con qué usuario entra cada pareja a su portal. Las contraseñas no se guardan en claro en ningún sitio: si una se pierde, puedes generar otra nueva.</p>
        </div>
      </div>

      ${
        bodas.length
          ? `<div class="table-wrap">
              <table class="data-table tabla-fichas">
                <thead><tr><th>Pareja</th><th>Usuario</th><th>Contraseña</th><th>Portal</th><th></th></tr></thead>
                <tbody>
                  ${bodas
                    .map(
                      (w) => `<tr>
                        <td data-col="Pareja"><strong>${text(w.couple)}</strong><br /><small>${text(formatDate(w.date))}</small></td>
                        <td data-col="Usuario"><code>${text(usuarioPortal(w))}</code></td>
                        <td data-col="Contraseña">${w.portalPasswordHash ? `<span class="doc-privado">Guardada cifrada</span>` : `<span class="team-phone-vacio">Sin contraseña</span>`}</td>
                        <td data-col="Portal">${estaCerrada(w) ? `<span class="team-phone-vacio">Boda cerrada</span>` : `<span class="doc-origen doc-origen-presupuesto">Abierto</span>`}</td>
                        <td class="data-table-actions">
                          <button class="mini-btn" data-abrir-portal="${w.id}">↗ Ver su portal</button>
                          <button class="mini-btn" data-regenerar-clave="${w.id}">↻ Nueva contraseña</button>
                        </td>
                      </tr>`
                    )
                    .join("")}
                </tbody>
              </table>
            </div>`
          : `<div class="empty">Todavía no hay bodas creadas.</div>`
      }
    </section>
  `;
}

export { ESTADOS_BODA, cerrarBoda, cerrarBodaConfirmada, estaCerrada, reabrirBoda, regenerarClavePortal, renderCierre, renderUsuariosParejas, revisionDeCierre, usuarioPortal };
