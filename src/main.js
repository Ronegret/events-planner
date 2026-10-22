import { migrarAvisosDePago } from "./budget.js";
import { addActivity, openConfirmModal } from "./modals.js";
import { render } from "./render.js";
import { cargarReferencia } from "./referencia.js";
import { onPlannerVacio, byWedding, loadRemoteState, migratePasswords, saveRemoteState, saveState, state, supabaseClient, toast } from "./state.js";

function saveNow() {
  saveState();
  saveRemoteState()
    .then(() => toast("Guardado y sincronizado."))
    .catch(() => toast("Guardado en este dispositivo. Revisa la conexión y se sincronizará después."));
}


function exportJson() {
  download("events-planner-backup.json", JSON.stringify(state, null, 2), "application/json");
}

function exportGuests() {
  const csv = ["Nombre,RSVP,Menu,Alergias,Mesa"].concat(byWedding("guests").map((g) => [g.name, g.rsvp, g.menu, g.allergy, g.table].map(csvEscape).join(","))).join("\n");
  download("invitados-events-planner.csv", csv, "text/csv");
}

function csvEscape(value) {
  return `"${String(value || "").replaceAll('"', '""')}"`;
}

function download(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}


/**
 * Reparte los invitados sin mesa en las plazas libres, manteniendo juntos a
 * los del mismo grupo: es como se sienta de verdad en una boda. No toca a
 * nadie ya sentado ni las mesas bloqueadas.
 */
function autoSeat() {
  const tables = byWedding("tables").filter((t) => !t.lockedAt);
  const guests = byWedding("guests");
  if (!tables.length) {
    toast("Crea al menos una mesa antes de asignar invitados.");
    return;
  }

  const freeBy = new Map(
    tables.map((t) => [t.id, (Number(t.capacity) || 0) - guests.filter((g) => g.table === t.name).length])
  );
  const pending = guests
    .filter((g) => !g.table || !tables.some((t) => t.name === g.table))
    .sort((a, b) => String(a.group || "").localeCompare(String(b.group || "")) || String(a.name).localeCompare(String(b.name)));

  let placed = 0;
  for (const guest of pending) {
    // Mesa con más sitio libre: reparte en vez de amontonar.
    const target = tables
      .filter((t) => (freeBy.get(t.id) || 0) > 0)
      .sort((a, b) => (freeBy.get(b.id) || 0) - (freeBy.get(a.id) || 0))[0];
    if (!target) break;
    guest.table = target.name;
    freeBy.set(target.id, (freeBy.get(target.id) || 0) - 1);
    placed++;
  }

  if (!placed) {
    toast(pending.length ? "No quedan plazas libres en las mesas. Añade una mesa o amplía alguna." : "Todos los invitados ya tienen mesa");
    return;
  }
  addActivity(`Asignó automáticamente ${placed} invitado${placed === 1 ? "" : "s"} a sus mesas`, state.user?.name, state.selectedWeddingId);
  saveState();
  render();
  toast(`${placed} invitado${placed === 1 ? "" : "s"} sentado${placed === 1 ? "" : "s"}${pending.length > placed ? ` · ${pending.length - placed} sin plaza` : ""}`);
}

function resetDemo() {
  openConfirmModal({
    intent: "reset",
    title: "Vaciar datos de trabajo",
    message: "Se eliminarán bodas, invitados, proveedores, documentos y actividad compartida. Las personas del equipo se mantienen. Esta acción no se puede deshacer.",
    confirmWord: "VACIAR",
    confirmLabel: "Vaciar datos",
  });
}


/**
 * Entrada por enlace.
 *
 * Hasta ahora el portal de novios sólo existía dentro de la sesión del equipo:
 * `portalMode` se reinicia en cada carga (ver loadState en state.js) y la app
 * no miraba la dirección. Es decir, la pantalla de contraseña estaba escrita y
 * funcionaba, pero era inalcanzable — ninguna pareja podía llegar a su portal
 * desde un enlace. El portal era, en la práctica, una vista previa interna.
 *
 *   ?boda=w-demo-1   abre ese portal y pide la contraseña
 *   ?ir=agenda|bodas    atajos de la app instalada (ver manifest.json)
 *
 * El identificador de la boda no es un secreto: lo que protege el contenido es
 * la contraseña. Se limpia de la barra de direcciones al entrar para que no se
 * quede en el historial ni se comparta por accidente.
 */
function abrirDesdeEnlace() {
  let parametros;
  try {
    parametros = new URLSearchParams(window.location.search);
  } catch {
    return;
  }
  if (![...parametros.keys()].length) return;

  const bodaPedida = parametros.get("boda");
  const irA = parametros.get("ir");
  let reconocido = false;

  if (bodaPedida && state.weddings.some((w) => w.id === bodaPedida)) {
    state.portalMode = true;
    state.portalWeddingId = bodaPedida;
    state.portalUnlocked = false;   // la contraseña se pide igual
    state.portalTab = "resumen";
    state.view = "portal";
    reconocido = true;
  } else if (irA) {
    const destinos = { panel: "dashboard", bodas: "weddings", agenda: "agenda", portal: "portal" };
    if (destinos[irA]) {
      state.view = destinos[irA];
      state.portalMode = irA === "portal";
      reconocido = true;
    }
  }

  if (reconocido) {
    saveState({ skipRemote: true });
    window.history.replaceState({}, "", window.location.pathname);
  }
}

async function initApp() {
  // Convierte a hash cualquier contraseña en claro heredada de versiones
  // anteriores antes de que se vuelva a escribir nada en el navegador.
  await migratePasswords();
  // Recupera los avisos de pago del sistema anterior como partidas de
  // presupuesto, para que ningún pago ya entregado quede invisible tras la
  // unificación en la pestaña Presupuesto (ver budget.js).
  migrarAvisosDePago();
  if (supabaseClient) {
    const { data } = await supabaseClient.auth.getSession();
    if (data?.session && state.user) {
      try {
        await loadRemoteState();
      } catch (error) {
        console.error(error);
        toast("No hemos podido cargar tus datos de la nube. Mostramos la copia de este dispositivo.");
      }
    } else if (!data?.session && state.user) {
      state.user = null;
      saveState({ skipRemote: true });
    }
  }
  repararPlannerVacio();
  abrirDesdeEnlace();
  render();
}

/**
 * Red de seguridad: si el planner se ha quedado sin ninguna boda, vuelve a
 * cargar las tres de referencia.
 *
 * Sin bodas la herramienta parece rota entera y no solo a medias: los rincones
 * y los proveedores cuelgan de una boda, y «Nueva reunión» ni siquiera abre el
 * formulario (ver nuevaReunion en agenda.js). Un navegador que se quedó sin
 * espacio, unos datos del sitio borrados a mano o un «Quitar las de referencia»
 * llevaban a esa pantalla en blanco sin manera evidente de salir.
 *
 * Solo actúa cuando NO hay absolutamente ninguna boda: en cuanto haya una —de
 * referencia o creada por el equipo— no vuelve a tocar nada.
 */
function repararPlannerVacio() {
  if (state.weddings.length || !window.EP_DEMO_SEED) return;
  // Si el equipo las quitó a propósito desde Ajustes, se respeta: ahí queda el
  // botón «Cargar bodas de referencia» para volver a traerlas cuando quieran.
  if (state.referenciaRetirada) return;
  try {
    cargarReferencia();
  } catch (error) {
    console.error("[EP] No se pudieron restaurar las bodas de referencia:", error);
  }
}

// Si al traer los datos de la nube el planner se queda sin bodas, se restauran
// las de referencia. Se registra aquí porque state.js no puede llamar a la
// capa de vista directamente.
onPlannerVacio(repararPlannerVacio);

initApp();

export { autoSeat, csvEscape, download, exportGuests, exportJson, initApp, resetDemo, saveNow };
