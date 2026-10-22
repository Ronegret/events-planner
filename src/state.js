// ============================================================================
// state.js es la capa de datos y NO debe importar la capa de vista: hacerlo
// creaba un ciclo state → render → (todo) → state que dejaba el orden de
// evaluacion de modulos al azar. En su lugar, render.js se suscribe con
// onRender() y aqui solo se notifica.
// ============================================================================
let renderCallback = () => {};

/** Registra el renderizador. Lo llama render.js al cargarse. */
function onRender(callback) {
  renderCallback = typeof callback === "function" ? callback : () => {};
}

/** Notifica que el estado cambio y hay que repintar. */
function render() {
  renderCallback();
}

// ---------------------------------------------------------------------------
// Qué hacer si el planner se queda sin ninguna boda
// ---------------------------------------------------------------------------
// Esto pasa de dos maneras y las dos acaban igual de mal:
//
//   · el navegador se quedó sin espacio y no guardó nada;
//   · o la nube está vacía y, al entrar, sobrescribe lo que había en local.
//
// El segundo caso es el que muerde al montar Supabase: el equipo entra, la
// tabla compartida está a cero, y las tres bodas desaparecen de su pantalla.
// La reparación vive en main.js (necesita cargarReferencia, que a su vez pinta),
// así que aquí solo se guarda el aviso — state.js no puede depender de la vista.
let repararVacioCallback = () => {};

/** Registra qué hacer cuando el planner se queda sin bodas. Lo llama main.js. */
function onPlannerVacio(callback) {
  repararVacioCallback = typeof callback === "function" ? callback : () => {};
}

﻿const STORAGE_KEY = "events-planner-state-v1";

// ---------------------------------------------------------------------------
// Recuperar la contraseña: apagado por ahora
// ---------------------------------------------------------------------------
// El flujo está escrito y probado (ver forgotPassword más abajo y
// renderForgotPasswordForm en views.js), pero enviar de verdad depende de
// configurar Supabase: SMTP para el correo y un proveedor de SMS de pago para
// el teléfono. Hasta que eso esté, ofrecer el botón sería prometer algo que no
// ocurre — y quien se queda fuera de la app es justo a quien no se le puede
// fallar.
//
// Mientras tanto, la contraseña la restablece administración desde
// Ajustes › Equipo. Para volver a activarlo: poner esto en `true`.
const RECUPERACION_ACTIVA = false;

const demoState = {
  user: null,
  view: "dashboard",
  selectedWeddingId: null,
  selectedTab: "resumen",
  showWeddingForm: false,
  destacarNuevaBoda: false,
  providerFilterZone: "Todas",
  importTexto: "",
  portalMesaSel: null,
  agendaFiltro: "Todas",
  // Sin fijar a propósito: la Agenda decide el valor inicial según haya o no
  // reuniones futuras (ver renderAgendaGlobal en agenda.js). En cuanto se elige
  // una opción del desplegable, esa elección se guarda aquí como booleano.
  agendaSoloFuturas: undefined,
  acuerdosQuery: "",
  docsFiltro: "Todos",
  budgetVista: "tabla",
  partidaAbierta: null,
  agendaVista: "mes",
  agendaMes: "",
  agendaFecha: "",
  docSearch: "",
  docFilterWedding: "Todas",
  docFilterVisibility: "Todas",
  guideSearch: "",
  guideArea: "empezar",
  showForgotPassword: false,
  // Ultimo usuario que entro, para precargarlo. Nunca la contraseña.
  lastUsername: "",
  weddingSearch: "",
  guestSearch: "",
  // Filtros de la tabla de invitados y vista activa del plano.
  // Peticiones de rincon hechas por los novios desde su portal, pendientes
  // de que el equipo las revise y apruebe.
  rinconRequests: [],
  guestFilterGroup: "Todos",
  guestFilterRsvp: "Todos",
  guestFilterMenu: "Todos",
  guestFilterTable: "Todas",
  guestOnlyAllergies: false,
  mesasView: "planner",
  venueZoom: 1,
  venueExtra: 0,
  providerSearch: "",
  providerFilterType: "Todas",
  // Borradores del formulario de alta: lo que se va acumulando con los
  // desplegables de servicios y rincones antes de crear la boda.
  draftServices: [],
  draftRincones: [],
  annexDraft: null,
  assistantOpen: false,
  assistantQuery: "",
  mobileMenuOpen: false,
  weddingFilter: "Todas",
  exportSelection: ["summary", "tasks", "services", "timeline", "guests", "tables", "providers", "music", "shotList", "transports"],
  exportAudience: "Equipo",
  modal: null,
  portalMode: false,
  portalWeddingId: null,
  portalUnlocked: false,
  portalTab: "resumen",
  portalHelpOpen: false,
  lastReflectionIndex: -1,
  activeRinconId: null,
  // El correo es la vía de recuperación de acceso: sin él, «he olvidado la
  // contraseña» no tiene a dónde escribir. Los tres comparten buzón por ahora,
  // a peticion de administracion.
  users: [
    // VERSIÓN DE DEMOSTRACIÓN: un solo acceso, admin / admin.
    // Una demo no lleva datos de nadie.
    // Las dos compañeras existen para que la sección Equipo no salga vacía,
    // pero no tienen contraseña: sin ella no se puede entrar con su usuario.
    { id: "u1", name: "admin", role: "Administración (demo)", username: "admin", password: "admin", phone: "+34 653 567 610", email: "rodrigo.negrete.aros@gmail.com" },
    { id: "u2", name: "Noa Ferrer", role: "Coordinación", phone: "+34 600 000 901", email: "noa.ferrer@example.com" },
    { id: "u3", name: "Biel Sagrera", role: "Asistente de eventos", phone: "+34 600 000 902", email: "biel.sagrera@example.com" },
  ],
  roles: ["Administración", "Coordinación", "Asistente de eventos", "Decoración", "Producción", "Proveedor externo"],
  weddings: [],
  timeline: [],
  tasks: [],
  providers: [],
  rincones: [],
  rinconTasks: [],
  contracts: [],
  payments: [],
  receipts: [],
  guests: [],
  tables: [],
  music: [],
  transports: [],
  documents: [],
  shotList: [],
  services: [],
  budget: [],
  meetings: [],
  issues: [],
  notes: [],
  activity: [],
};

const EP_CONFIG = window.EP_CONFIG || {};
let supabaseClient = null;
try {
  if (window.supabase && EP_CONFIG.supabaseUrl && EP_CONFIG.supabasePublishableKey) {
    supabaseClient = window.supabase.createClient(EP_CONFIG.supabaseUrl, EP_CONFIG.supabasePublishableKey);
  }
} catch (e) {
  console.warn("[EP] Supabase no disponible, modo local activado:", e.message);
}
const persistedCollections = ["users", "roles", "weddings", "timeline", "tasks", "providers", "rincones", "rinconTasks", "rinconRequests", "guests", "tables", "music", "transports", "documents", "shotList", "services", "contracts", "payments", "receipts", "budget", "meetings", "issues", "notes", "activity"];
let remoteReady = false;
let applyingRemote = false;
let remoteSaveTimer = null;

let state = loadState();

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return structuredClone(demoState);
  try {
    const merged = { ...structuredClone(demoState), ...JSON.parse(saved) };
    const restored = normalizeState(merged);
    // Cada sesion arranca en Inicio. La vista es estado de navegacion, no
    // dato de trabajo: reabrir la app en una pestaña concreta de una boda que
    // se miro hace tres dias desorienta. Los datos si se conservan.
    restored.view = "dashboard";
    restored.selectedTab = "resumen";
    restored.portalMode = false;
    restored.portalTab = "resumen";
    restored.portalHelpOpen = false;
    restored.assistantOpen = false;
    restored.assistantQuery = "";
    restored.mobileMenuOpen = false;
    restored.showWeddingForm = false;
    restored.guestSearch = "";
    restored.guestFilterGroup = "Todos";
    restored.guestFilterRsvp = "Todos";
    restored.guestFilterMenu = "Todos";
    restored.guestFilterTable = "Todas";
    restored.guestOnlyAllergies = false;
    restored.providerSearch = "";
    restored.providerFilterType = "Todas";
    restored.draftServices = [];
    restored.draftRincones = [];
    return restored;
  } catch {
    return structuredClone(demoState);
  }
}

function normalizeState(nextState) {
  const collections = ["users", "roles", "weddings", "timeline", "tasks", "providers", "rincones", "rinconTasks", "rinconRequests", "guests", "tables", "music", "transports", "documents", "shotList", "services", "contracts", "payments", "receipts", "budget", "meetings", "issues", "notes", "activity"];
  collections.forEach((collection) => {
    if (!Array.isArray(nextState[collection])) nextState[collection] = structuredClone(demoState[collection]);
  });
  nextState.users = nextState.users.map((user) => {
    // Aqui vivia un parche que reescribia cualquier usuario con id "u2" a un
    // Restore missing password from defaults (old localStorage may lack this field)
    if (!user.password) {
      const def = demoState.users.find((u) => u.id === user.id);
      if (def) user = { ...user, password: def.password };
    }
    // Correo y teléfono se incorporaron después: sin rellenarlos, quien ya
    // tuviera la app abierta se quedaba sin forma de recuperar su acceso.
    if (!user.email) {
      const def = demoState.users.find((u) => u.id === user.id);
      user = { ...user, email: def?.email || "" };
    }
    if (typeof user.phone !== "string") {
      const def = demoState.users.find((u) => u.id === user.id);
      user = { ...user, phone: def?.phone || "" };
    }
    return user;
  });
  nextState.weddings = nextState.weddings.map((wedding) => {
    // Portada: si no tiene, o si apunta a una URL externa que la CSP actual
    // bloquea (así quedaron las bodas creadas antes de este cambio — se veía
    // el hueco en blanco tanto en la tarjeta como en la portada del dossier
    // impreso), se repara con una foto local de la galería. Una vez asignada
    // aquí queda guardada en el estado, así que esto solo repara una vez.
    const cover = wedding.cover && !isBlockedCoverUrl(wedding.cover) ? wedding.cover : defaultCoverFor(wedding);
    return {
      ...wedding,
      palettePrimary: wedding.palettePrimary || "#56603f",
      paletteSecondary: wedding.paletteSecondary || "#d6b36b",
      paletteAccent: wedding.paletteAccent || "#f4efe4",
      paletteNotes: wedding.paletteNotes || "Musgo, oro y crema.",
      firstMeetingNotes: wedding.firstMeetingNotes || "",
      cover,
    };
  });
  if (!nextState.selectedWeddingId || !nextState.weddings.some((wedding) => wedding.id === nextState.selectedWeddingId)) {
    nextState.selectedWeddingId = nextState.weddings[0]?.id || null;
  }
  if (nextState.portalWeddingId && !nextState.weddings.some((wedding) => wedding.id === nextState.portalWeddingId)) {
    nextState.portalWeddingId = null;
  }
  // Saneado del catalogo de rincones: versiones antiguas duplicaban las
  // fichas globales al asignarlas a una boda. Se conserva la primera de cada
  // nombre y se descartan las copias sueltas, para que el catalogo no crezca
  // solo. Las copias con weddingId (las de cada boda) no se tocan.
  const seenCatalogRincones = new Set();
  const seenRinconIds = new Set();
  nextState.rincones = nextState.rincones.filter((rincon) => {
    if (seenRinconIds.has(rincon.id)) return false;
    seenRinconIds.add(rincon.id);
    if (rincon.weddingId) return true;
    const key = String(rincon.name || "").trim().toLowerCase();
    if (!key) return true;
    if (seenCatalogRincones.has(key)) return false;
    seenCatalogRincones.add(key);
    return true;
  });

  // Campos de invitado incorporados despues: se rellenan al vuelo para que
  // las fichas antiguas no dejen huecos en la tabla ni rompan los filtros.
  nextState.guests = nextState.guests.map((guest) => ({
    ...guest,
    email: guest.email || "",
    group: guest.group || "Sin grupo",
    companion: guest.companion || "",
  }));

  if (!nextState.selectedTab) nextState.selectedTab = "resumen";
  if (!nextState.weddingSearch) nextState.weddingSearch = "";
  if (typeof nextState.guestSearch !== "string") nextState.guestSearch = "";
  if (!nextState.guestFilterGroup) nextState.guestFilterGroup = "Todos";
  if (!nextState.guestFilterRsvp) nextState.guestFilterRsvp = "Todos";
  if (!nextState.guestFilterMenu) nextState.guestFilterMenu = "Todos";
  if (!nextState.guestFilterTable) nextState.guestFilterTable = "Todas";
  if (typeof nextState.guestOnlyAllergies !== "boolean") nextState.guestOnlyAllergies = false;
  if (!nextState.mesasView) nextState.mesasView = "planner";
  if (typeof nextState.venueZoom !== "number") nextState.venueZoom = 1;
  if (typeof nextState.venueExtra !== "number") nextState.venueExtra = 0;
  if (!nextState.portalTab) nextState.portalTab = "resumen";
  if (typeof nextState.portalHelpOpen !== "boolean") nextState.portalHelpOpen = false;
  if (typeof nextState.mobileMenuOpen !== "boolean") nextState.mobileMenuOpen = false;
  if (typeof nextState.providerSearch !== "string") nextState.providerSearch = "";
  if (!nextState.providerFilterType) nextState.providerFilterType = "Todas";
  if (!Array.isArray(nextState.draftServices)) nextState.draftServices = [];
  if (!Array.isArray(nextState.draftRincones)) nextState.draftRincones = [];
  if (!nextState.weddingFilter) nextState.weddingFilter = "Todas";
  if (!Array.isArray(nextState.exportSelection)) nextState.exportSelection = structuredClone(demoState.exportSelection);
  if (!nextState.exportAudience) nextState.exportAudience = "Equipo";
  if (typeof nextState.lastReflectionIndex !== "number") nextState.lastReflectionIndex = -1;
  nextState.modal = null;
  if (nextState.view === "wedding" && !nextState.selectedWeddingId) nextState.view = "weddings";
  if (nextState.view === "portal" && !nextState.weddings.length) nextState.view = "dashboard";
  if (!nextState.view) nextState.view = "dashboard";
  if (nextState.user && !nextState.users.some((user) => user.id === nextState.user.id)) nextState.user = null;
  return nextState;
}

// ============================================================================
// Credenciales
// ----------------------------------------------------------------------------
// Las contraseñas nunca se escriben en localStorage ni se envian a la nube:
// solo viaja un hash SHA-256 con sal fija de aplicacion. No sustituye a
// Supabase Auth (que sigue siendo la via principal); protege el respaldo
// local para que abrir las DevTools no revele las claves del equipo.
// ============================================================================
const PASSWORD_SALT = "events-planner::v1";

/**
 * PBKDF2 con 150.000 iteraciones.
 *
 * Antes era un SHA-256 de una sola pasada. Un SHA-256 se calcula tantos
 * millones de veces por segundo que probar un diccionario entero contra el
 * hash guardado es cuestión de minutos. PBKDF2 con muchas iteraciones hace
 * que cada intento cueste, y eso es lo único que protege una contraseña si
 * alguien llega a leer el almacenamiento del navegador — que aquí, hasta que
 * esto viva en Supabase, es un archivo en el disco de un ordenador.
 *
 * Los hashes antiguos siguen validando (ver verifyPassword) y se actualizan
 * al siguiente inicio de sesión, para no dejar a nadie fuera.
 */
const PBKDF2_ITERACIONES = 150000;

async function hashPassword(plain) {
  const value = String(plain ?? "");
  if (!value) return "";
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) return "";
  try {
    const clave = await subtle.importKey("raw", new TextEncoder().encode(value), "PBKDF2", false, ["deriveBits"]);
    const bits = await subtle.deriveBits(
      { name: "PBKDF2", salt: new TextEncoder().encode(PASSWORD_SALT), iterations: PBKDF2_ITERACIONES, hash: "SHA-256" },
      clave,
      256
    );
    return `pbkdf2$${PBKDF2_ITERACIONES}$${[...new Uint8Array(bits)].map((b) => b.toString(16).padStart(2, "0")).join("")}`;
  } catch {
    return hashPasswordHeredado(value);
  }
}

/** El esquema anterior. Solo para validar lo ya guardado, nunca para crear. */
async function hashPasswordHeredado(plain) {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) return "";
  const bytes = new TextEncoder().encode(PASSWORD_SALT + String(plain ?? ""));
  const digest = await subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// ---------------------------------------------------------------------------
// Freno a los intentos de acceso
// ---------------------------------------------------------------------------
// Sin esto, se pueden probar contraseñas tan rápido como el navegador permita.
// No evita un ataque decidido —eso pide servidor—, pero convierte «probar el
// diccionario entero» en «probar unas pocas al minuto», que es la diferencia
// entre entrar y no entrar cuando la contraseña es del tipo LAURA2026.
const INTENTOS = new Map();
const MAX_INTENTOS = 5;
const ESPERA_MS = 60000;

/** ¿Cuántos segundos hay que esperar antes de volver a probar? */
function esperaPorIntentos(clave) {
  const reg = INTENTOS.get(clave);
  if (!reg || reg.fallos < MAX_INTENTOS) return 0;
  const restante = reg.hasta - Date.now();
  return restante > 0 ? Math.ceil(restante / 1000) : 0;
}

function apuntarFallo(clave) {
  const reg = INTENTOS.get(clave) || { fallos: 0, hasta: 0 };
  reg.fallos += 1;
  // La espera crece con cada tanda de fallos: 1 min, 2 min, 4 min…
  if (reg.fallos >= MAX_INTENTOS) {
    const tandas = Math.floor(reg.fallos / MAX_INTENTOS);
    reg.hasta = Date.now() + ESPERA_MS * 2 ** (tandas - 1);
  }
  INTENTOS.set(clave, reg);
  return reg;
}

function limpiarIntentos(clave) {
  INTENTOS.delete(clave);
}

/** Comprueba una contraseña contra el hash guardado, con respaldo al valor
 *  en claro heredado de datos antiguos o del seed de ejemplo. */
async function verifyPassword(stored, plain) {
  if (!stored) return false;
  if (stored.passwordHash) {
    if (stored.passwordHash === (await hashPassword(plain))) return true;
    // Hash del esquema viejo: se acepta una vez y se reescribe con PBKDF2,
    // para que nadie se quede fuera al actualizar.
    if (!String(stored.passwordHash).startsWith("pbkdf2$") && stored.passwordHash === (await hashPasswordHeredado(plain))) {
      stored.passwordHash = await hashPassword(plain);
      return true;
    }
    return false;
  }
  return Boolean(stored.password) && stored.password === plain;
}

/** Convierte a hash cualquier contraseña en claro que quede de versiones
 *  anteriores, y borra el valor original. Se ejecuta al arrancar y cada vez
 *  que llega un estado nuevo desde la nube. */
async function migratePasswords() {
  let changed = false;
  for (const user of state.users) {
    if (user.password && !user.passwordHash) {
      user.passwordHash = await hashPassword(user.password);
      changed = true;
    }
  }
  for (const wedding of state.weddings) {
    if (wedding.portalPassword && !wedding.portalPasswordHash) {
      wedding.portalPasswordHash = await hashPassword(wedding.portalPassword);
      changed = true;
    }
  }
  if (changed) saveState({ skipRemote: true });
}

/** Copia del estado apta para persistir: sin contraseñas en claro. */
function persistableState() {
  return {
    ...state,
    // La sesion solo necesita identificar a la persona. Se recorta aqui
    // ademas de en login() para que ninguna ruta futura pueda colar la
    // ficha completa del usuario —con su clave— en el respaldo local.
    user: state.user ? { id: state.user.id, name: state.user.name, role: state.user.role } : null,
    users: state.users.map(({ password, ...rest }) => rest),
    weddings: state.weddings.map(({ portalPassword, ...rest }) => rest),
  };
}

function saveState(options = {}) {
  state = normalizeState(state);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(persistableState()));
  if (!options.skipRemote) scheduleRemoteSave();
}

// Only this module may rebind the `state` identifier itself: named imports of a
// `let` binding are live but read-only in the importing module. Callers elsewhere
// that need to replace the whole object go through this setter instead.
function replaceState(nextState) {
  state = nextState;
  return state;
}

/** Vacia los datos de trabajo conservando la sesion actual. */
function resetDemoConfirmed() {
  const currentUser = state.user;
  replaceState(structuredClone(demoState));
  state.user = currentUser;
  state.modal = null;
  saveState();
  render();
}

/**
 * La dirección con la que esa persona existe en Supabase Auth.
 *
 * Tiene que coincidir EXACTAMENTE con la que crea
 * `scripts/bootstrap-supabase-users.mjs`, o el inicio de sesión contra
 * Supabase falla y todo el mundo entra por el respaldo local sin enterarse.
 *
 * La regla es la misma en los dos sitios:
 *   · Si el correo de la persona es sólo suyo, se usa tal cual.
 *   · Si varias comparten buzón, se distingue con «+usuario».
 *     Gmail entrega nombre+usuario@gmail.com al mismo sitio que la
 *     dirección base, pero para Supabase son cuentas distintas, que es lo que
 *     exige para poder crear una por persona.
 *   · Sin correo guardado, se cae al dominio interno de siempre.
 */
function authEmail(username) {
  const persona = state?.users?.find((u) => String(u.username || "").toLowerCase() === String(username || "").toLowerCase());
  const correo = String(persona?.email || "").trim().toLowerCase();
  if (!correo) return `${username}@${EP_CONFIG.authEmailDomain || "eventsplanner.app"}`;

  const compartido = state.users.filter((u) => String(u.email || "").trim().toLowerCase() === correo).length > 1;
  if (!compartido) return correo;

  const [antes, dominio] = correo.split("@");
  return dominio ? `${antes}+${String(username).toLowerCase()}@${dominio}` : correo;
}

function snapshotFromState() {
  const snapshot = {};
  persistedCollections.forEach((collection) => {
    snapshot[collection] = state[collection] || [];
  });
  // Nunca subir contraseñas en claro a la tabla compartida `app_state`: con
  // Supabase Auth activo (ver login()) ese campo ya no se usa para entrar, y
  // dejarlo en el snapshot lo haria legible por cualquier usuario autenticado
  // (la politica RLS actual concede lectura a cualquier `authenticated`, sin
  // distinguir rol — ver docs/PRODUCTION_ROADMAP.md).
  snapshot.users = (snapshot.users || []).map(({ password, passwordHash, ...rest }) => rest);
  // De la boda se elimina la clave en claro. El hash SI viaja: los novios
  // entran al portal desde su propio dispositivo y necesitan poder validarla;
  // un hash con sal no es reversible y el equipo ya tiene acceso a la boda.
  snapshot.weddings = (snapshot.weddings || []).map(({ portalPassword, ...rest }) => rest);
  snapshot.selectedWeddingId = state.selectedWeddingId;
  return snapshot;
}

/**
 * Cuánto ocupa el estado y cuánto de eso son archivos metidos como texto.
 *
 * El estado entero se sube en cada guardado. Mientras lo único que hay dentro
 * son datos —nombres, fechas, importes— eso pesa unos cientos de kilobytes y
 * da igual. Lo que lo dispara son los archivos en base64: una sola foto de
 * 2 MB significa 2 MB de subida cada vez que alguien cambia una coma.
 *
 * Esto no se veía por ningún sitio, y por eso llegamos a 4,2 MB sin enterarnos.
 */
function pesoDelEstado() {
  const snapshot = snapshotFromState();
  const total = JSON.stringify(snapshot).length;

  let enArchivos = 0;
  let cuantos = 0;
  const recorrer = (nodo) => {
    if (!nodo || typeof nodo !== "object") return;
    if (Array.isArray(nodo)) return nodo.forEach(recorrer);
    for (const valor of Object.values(nodo)) {
      if (typeof valor === "string" && valor.startsWith("data:")) {
        enArchivos += valor.length;
        cuantos++;
      } else if (valor && typeof valor === "object") recorrer(valor);
    }
  };
  recorrer(snapshot);

  return {
    total,
    enArchivos,
    cuantos,
    datos: total - enArchivos,
    porcentaje: total ? Math.round((enArchivos / total) * 100) : 0,
    // Por debajo de medio mega no merece la pena molestar a nadie.
    conviéneAligerar: enArchivos > 512 * 1024,
  };
}

function applyRemoteSnapshot(snapshot) {
  if (!snapshot || Object.keys(snapshot).length === 0) return false;
  applyingRemote = true;
  persistedCollections.forEach((collection) => {
    if (Array.isArray(snapshot[collection])) state[collection] = snapshot[collection];
  });
  if (snapshot.selectedWeddingId) state.selectedWeddingId = snapshot.selectedWeddingId;
  state = normalizeState(state);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(persistableState()));
  applyingRemote = false;
  // La copia de la nube puede traer todavía el hash de la contraseña antigua y
  // acabaría pisando la migración hecha al arrancar. Se vuelve a pasar. No se
  // espera al resultado a propósito: esto no debe retrasar el pintado, y si el
  // repaso cambia algo, guarda él solo.
  migratePasswords();
  return true;
}

// ---------------------------------------------------------------------------
// Conexión y sincronización
// ---------------------------------------------------------------------------
// El día de la boda la cobertura va y viene. Cuando no hay red, los cambios NO
// se pierden: siguen guardándose en el navegador y queda constancia de que hay
// algo pendiente de subir. En cuanto vuelve la conexión se sincroniza solo.
let sinRed = typeof navigator !== "undefined" && navigator.onLine === false;
let cambiosPendientes = 0;

function estadoConexion() {
  return {
    online: !sinRed,
    pendientes: cambiosPendientes,
    // Sin Supabase configurado no hay nada que sincronizar: la app es local y
    // no tiene sentido asustar con un aviso de "pendiente de subir".
    sincroniza: Boolean(supabaseClient),
  };
}

/**
 * En qué estado está de verdad la sincronización con la nube.
 *
 * Hace falta distinguir dos cosas que no son lo mismo:
 *
 *   · `configurado` — hay biblioteca de Supabase y credenciales. Significa que
 *     la app VA A INTENTAR sincronizar, no que lo consiga.
 *   · `conectado`   — ya se ha leído o escrito en la nube con éxito al menos
 *     una vez en esta sesión. Esto sí significa que el equipo comparte datos.
 *
 * Sin esta distinción, Ajustes afirmaba «la información se sincroniza con
 * Supabase» pasara lo que pasara. Con Supabase sin montar eso era falso: cada
 * persona iba construyendo su propia copia en su propio navegador creyendo que
 * trabajaba sobre la misma. Es la clase de cosa que se descubre la semana antes
 * de una boda.
 */
// Cuándo se leyó o escribió por última vez en la nube DE VERDAD. No es un
// adorno: sin esto la única señal de guardado era un «✓» en la barra, que se
// pinta igual esté la nube arriba o abajo. Alguien puede pasarse una tarde
// entera trabajando convencida de que el equipo lo está viendo.
let ultimaSincronizacion = null;
function marcarSincronizado() {
  ultimaSincronizacion = Date.now();
}

function estadoSincronizacion() {
  return {
    configurado: Boolean(supabaseClient),
    conectado: Boolean(supabaseClient && remoteReady),
    ultima: ultimaSincronizacion,
    pendientes: cambiosPendientes,
  };
}

function marcarConexion(online) {
  const cambio = sinRed === online; // venía al revés
  sinRed = !online;
  if (online && cambiosPendientes) {
    saveRemoteState()
      .then(() => {
        cambiosPendientes = 0;
        toast("Conexión recuperada. Todo sincronizado.", 4000);
        render();
      })
      .catch(() => render());
    return;
  }
  if (cambio) render();
}

if (typeof window !== "undefined" && window.addEventListener) {
  window.addEventListener("online", () => marcarConexion(true));
  window.addEventListener("offline", () => marcarConexion(false));
}

function scheduleRemoteSave() {
  if (!supabaseClient || !remoteReady || applyingRemote || !state.user) return;
  clearTimeout(remoteSaveTimer);
  remoteSaveTimer = setTimeout(() => {
    saveRemoteState()
      .then(() => {
        if (cambiosPendientes) {
          cambiosPendientes = 0;
          render();
        }
      })
      .catch((error) => {
        console.error(error);
        // Sin red no se avisa con un toast en cada tecla: molesta y no aporta.
        // Basta con contar lo pendiente y enseñarlo en la barra superior.
        cambiosPendientes += 1;
        if (!sinRed) toast("No hemos podido sincronizar. Tus cambios siguen en este dispositivo.");
        render();
      });
  }, 450);
}

// La versión del estado compartido que tiene este navegador. Se usa para no
// pisar el trabajo de otra persona: ver 0006_app_state_concurrencia.sql.
let versionRemota = 0;
// Para no repetir el aviso en cada guardado automático.
let avisadoSinVersion = false;

async function saveRemoteState() {
  if (!supabaseClient || !state.user) return;

  const { data, error } = await supabaseClient.rpc("guardar_app_state", {
    p_data: snapshotFromState(),
    p_version: versionRemota,
  });

  // Si la función no está disponible (migración 0006 sin aplicar, o PostgREST
  // con el esquema cacheado), se guarda como antes para no dejar a nadie sin
  // poder trabajar. Pero eso significa guardar SIN control de versión, que es
  // exactamente el escenario en el que dos personas se pisan sin enterarse:
  // así que se avisa en pantalla, no solo en la consola. Un aviso que solo ve
  // quien abre las herramientas de desarrollo no es un aviso.
  if (error && /guardar_app_state|does not exist|schema cache|PGRST202/i.test(`${error.message} ${error.code || ""}`)) {
    console.warn("[EP] guardar_app_state no disponible:", error.message);
    const { data: sessionData } = await supabaseClient.auth.getSession();
    const userId = sessionData?.session?.user?.id || null;
    const { error: e2 } = await supabaseClient
      .from("app_state")
      .upsert({ id: "main", data: snapshotFromState(), updated_by: userId }, { onConflict: "id" });
    if (e2) throw e2;
    if (!avisadoSinVersion) {
      avisadoSinVersion = true;
      toast("Guardado, pero sin protección contra cambios simultáneos. Si hay más gente editando, avisa antes de guardar.", 14000);
    }
    return;
  }
  if (error) throw error;

  const res = Array.isArray(data) ? data[0] : data;
  if (!res) return;

  if (res.ok) {
    versionRemota = Number(res.version) || versionRemota + 1;
    marcarSincronizado();
    return;
  }

  // Alguien guardó mientras tanto. No se pisa: se trae lo suyo y se avisa.
  // Perder datos es malo; perderlos sin saberlo es peor.
  versionRemota = Number(res.version) || versionRemota;
  if (res.data) {
    applyRemoteSnapshot(res.data);
    render();
  }
  toast("Otra persona del equipo guardó cambios antes que tú. Hemos traído su versión para no pisarla — revisa lo que estabas haciendo y vuelve a guardarlo.", 12000);
}

// ---------------------------------------------------------------------------
// Enterarse de lo que hacen las demás, sin recargar
// ---------------------------------------------------------------------------
// Hasta ahora el estado compartido solo se traía al abrir la página o al
// entrar. Con tres personas sobre la misma boda —que es justo el día que más
// importa— eso da esta escena, medida en pruebas:
//
//   Alguien marca una tarea      → la sube.
//   Otra, con la app abierta      → sigue viendo lo de antes: no se entera.
//   Marca otra tarea              → al guardar, choca. La protección de la
//                                   migración 0006 impide que pise a la otra,
//                                   pero el precio es que SU cambio se deshace
//                                   y tiene que volver a hacerlo.
//
// No se perdían datos, pero se perdía trabajo, y una y otra vez. Escuchando los
// cambios de la tabla compartida, lo que apunta una aparece en la pantalla de
// las otras en el momento — y de paso desaparece el choque, porque cuando la
// segunda guarda ya viene de la versión buena.
let canalEstado = null;

function escucharCambiosRemotos() {
  if (!supabaseClient || canalEstado) return;
  try {
    canalEstado = supabaseClient
      .channel("ep-app-state")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "app_state" }, (aviso) => {
        const versionNueva = Number(aviso?.new?.version) || 0;
        // El aviso llega también cuando la que ha guardado eres tú: si la
        // versión no es mayor que la que ya tienes, no hay nada que traer.
        if (!versionNueva || versionNueva <= versionRemota) return;

        // El aviso trae la fila entera, pero el estado crece con cada boda y
        // los avisos en vivo tienen un tamaño máximo. Si viene completo se usa;
        // si no, se piden los datos. Así esto sigue funcionando dentro de dos
        // años y cuarenta bodas.
        const traer = aviso?.new?.data
          ? Promise.resolve(applyRemoteSnapshot(aviso.new.data))
          : loadRemoteState();

        Promise.resolve(traer)
          .then(() => {
            versionRemota = Math.max(versionRemota, versionNueva);
            render();
            // Un aviso corto y sin alarma: es lo normal cuando se trabaja a varias.
            toast("Alguien del equipo ha guardado cambios. Ya los tienes en pantalla.", 5000);
          })
          .catch((e) => console.warn("[EP] No se pudo traer el cambio del equipo:", e.message));
      })
      .subscribe();
  } catch (e) {
    // Sin escucha en vivo la app sigue funcionando: se ve al recargar.
    console.warn("[EP] No se pudo escuchar los cambios del equipo:", e.message);
  }
}

/** Deja de escuchar (al cerrar sesión). */
function dejarDeEscuchar() {
  if (!canalEstado) return;
  try {
    supabaseClient.removeChannel(canalEstado);
  } catch (e) {
    /* si ya estaba cerrado, da igual */
  }
  canalEstado = null;
}

async function loadRemoteState() {
  if (!supabaseClient) return false;
  // Se lee también la versión: es la que se devolverá al guardar para
  // demostrar que se venía de ahí y no se está pisando a nadie.
  let fila = null;
  const conVersion = await supabaseClient.from("app_state").select("data, version").eq("id", "main").maybeSingle();
  if (conVersion.error) {
    // Migración 0006 sin aplicar: la columna `version` todavía no existe.
    const soloDatos = await supabaseClient.from("app_state").select("data").eq("id", "main").maybeSingle();
    if (soloDatos.error) throw soloDatos.error;
    fila = soloDatos.data;
  } else {
    fila = conVersion.data;
  }
  versionRemota = Number(fila?.version) || 0;
  const loaded = applyRemoteSnapshot(fila?.data);
  remoteReady = true;
  marcarSincronizado();
  escucharCambiosRemotos();
  if (!loaded) await saveRemoteState();
  return loaded;
}


/**
 * Deja un teléfono en el formato que necesitan los enlaces: solo dígitos y,
 * si falta, el prefijo de España. Un número escrito como "600 000 900",
 * "+34600000900" o "0034 600000900" acaba siendo el mismo enlace.
 */
function phoneDigits(phone) {
  let n = String(phone || "").replace(/[^\d+]/g, "");
  if (n.startsWith("+")) n = n.slice(1);
  else if (n.startsWith("00")) n = n.slice(2);
  else if (n.length === 9) n = "34" + n;
  return n;
}

/** Enlace de WhatsApp, con mensaje inicial opcional. */
function whatsappUrl(phone, mensaje = "") {
  const n = phoneDigits(phone);
  if (!n) return "";
  return `https://wa.me/${n}${mensaje ? `?text=${encodeURIComponent(mensaje)}` : ""}`;
}

function telUrl(phone) {
  const n = phoneDigits(phone);
  return n ? `tel:+${n}` : "";
}


/**
 * Cuándo pasó algo, en lenguaje humano. "Hace 20 minutos" es más útil que una
 * fecha para lo reciente, y una fecha con hora es más útil que "hace 23 días"
 * para lo viejo. Se cambia de registro a los dos días.
 */
function cuando(valor) {
  if (!valor) return "";
  if (valor === "Ahora") return "Hace un momento"; // apuntes de versiones antiguas
  const d = new Date(valor);
  if (Number.isNaN(d.getTime())) return String(valor);

  const min = Math.round((Date.now() - d.getTime()) / 60000);
  if (min < 1) return "Hace un momento";
  if (min < 60) return `Hace ${min} min`;
  const horas = Math.round(min / 60);
  if (horas < 24) return `Hace ${horas} h`;
  if (horas < 48) return `Ayer, ${d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}`;
  return d.toLocaleDateString("es-ES", { day: "numeric", month: "short" }) + ", " + d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
}

/** Fecha y hora completas, para el detalle y los tooltips. */
function fechaHora(valor) {
  if (!valor || valor === "Ahora") return "";
  const d = new Date(valor);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) +
    " a las " + d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
}

function uid(prefix) {
  return `${prefix}${Math.random().toString(36).slice(2, 9)}`;
}

function formatDate(value) {
  if (!value) return "Sin fecha";
  return new Intl.DateTimeFormat("es-ES", { day: "2-digit", month: "long", year: "numeric" }).format(new Date(value));
}

function getWedding(id = state.selectedWeddingId) {
  return state.weddings.find((w) => w.id === id) || state.weddings[0] || null;
}

/**
 * Orden del listado de bodas.
 *
 * Primero lo que queda por hacer: las bodas pendientes, de la más próxima a la
 * más lejana. Las ya celebradas van al final, y entre ellas de la más reciente
 * a la más antigua — si se vuelve a una boda pasada casi siempre es a la
 * última, para recuperar un proveedor o una factura.
 *
 * Antes se ordenaba solo por fecha ascendente, así que las bodas de mayo y
 * junio ya celebradas ocupaban las dos primeras tarjetas y la única boda viva
 * quedaba la tercera. Justo al revés de lo que hace falta.
 */
function sortedWeddings(items = state.weddings) {
  return [...items].sort((a, b) => {
    const cerradaA = isWeddingClosed(a);
    const cerradaB = isWeddingClosed(b);
    if (cerradaA !== cerradaB) return cerradaA ? 1 : -1;

    const fechaA = a.date || "9999-12-31";
    const fechaB = b.date || "9999-12-31";
    const orden = cerradaA ? fechaB.localeCompare(fechaA) : fechaA.localeCompare(fechaB);
    return orden || String(a.couple || "").localeCompare(String(b.couple || ""));
  });
}

function byWedding(collection) {
  if (!state.selectedWeddingId) return [];
  return state[collection].filter((item) => item.weddingId === state.selectedWeddingId);
}

function byWeddingId(collection, weddingId) {
  return state[collection].filter((item) => item.weddingId === weddingId);
}

function weddingTasks(weddingId) {
  return byWeddingId("tasks", weddingId).sort((a, b) => {
    const readyA = isReady(a.status) ? 1 : 0;
    const readyB = isReady(b.status) ? 1 : 0;
    return readyA - readyB || String(a.due || "9999-12-31").localeCompare(String(b.due || "9999-12-31")) || String(a.title || "").localeCompare(String(b.title || ""));
  });
}

/**
 * Una boda ya celebrada o marcada como Finalizada esta cerrada: sus tareas
 * dejan de ser "pendientes" porque ya no hay nada que preparar. Se siguen
 * viendo dentro de la boda, pero no ensucian los contadores del panel.
 */
function isWeddingClosed(wedding) {
  if (!wedding) return false;
  if (/finaliz|cancel/i.test(wedding.status || "")) return true;
  const remaining = daysUntil(wedding.date);
  return remaining !== null && remaining < 0;
}

function pendingWeddingTasks(weddingId) {
  const wedding = state.weddings.find((item) => item.id === weddingId);
  if (isWeddingClosed(wedding)) return [];
  return weddingTasks(weddingId).filter((task) => !isReady(task.status));
}

/** Tareas pendientes de toda la cartera, ya descontadas las bodas cerradas. */
function openTasks() {
  return state.weddings.filter((w) => !isWeddingClosed(w)).flatMap((w) => pendingWeddingTasks(w.id));
}

function daysUntil(date) {
  if (!date) return null;
  const target = new Date(`${date}T12:00:00`);
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  return Math.ceil((target - today) / 86400000);
}

function weddingReadiness(wedding) {
  if (!wedding) return { score: 0, ready: 0, total: 0 };
  const checks = [
    Boolean(wedding.date),
    Boolean(wedding.ceremony && wedding.ceremony !== "Por definir"),
    Boolean(wedding.venue && wedding.venue !== "Por definir"),
    Boolean(wedding.ceremonyAddress),
    Boolean(wedding.venueAddress),
    byWeddingId("timeline", wedding.id).length >= 6,
    byWeddingId("providers", wedding.id).length >= 4,
    byWeddingId("guests", wedding.id).length > 0,
    byWeddingId("tables", wedding.id).length > 0,
    byWeddingId("transports", wedding.id).length > 0,
    byWeddingId("documents", wedding.id).length > 0,
    pendingWeddingTasks(wedding.id).length === 0,
  ];
  const ready = checks.filter(Boolean).length;
  return { score: Math.round((ready / checks.length) * 100), ready, total: checks.length };
}

function weddingRisks(wedding) {
  if (!wedding) return [];
  const weddingId = wedding.id;
  const guests = byWeddingId("guests", weddingId);
  const tables = byWeddingId("tables", weddingId);
  const providers = byWeddingId("providers", weddingId);
  const tasks = pendingWeddingTasks(weddingId);
  const overdue = tasks.filter((task) => task.due && new Date(`${task.due}T23:59:59`) < new Date());
  const unseated = guests.filter((guest) => !guest.table || /sin mesa|pendiente/i.test(guest.table));
  const openIssues = byWeddingId("issues", weddingId).filter((issue) => !/cerrada|resuelta|listo/i.test(issue.status || ""));
  const unreviewedReceipts = byWeddingId("receipts", weddingId).filter((receipt) => receipt.reviewed === false);
  const risks = [];
  if (unreviewedReceipts.length) risks.push({ level: "high", label: `${unreviewedReceipts.length} comprobante${unreviewedReceipts.length === 1 ? "" : "s"} nuevo${unreviewedReceipts.length === 1 ? "" : "s"} sin revisar`, tab: "pagos" });
  if (overdue.length) risks.push({ level: "high", label: `${overdue.length} tareas vencidas`, tab: "tareas" });
  if (openIssues.length) risks.push({ level: "high", label: `${openIssues.length} incidencias abiertas`, tab: "incidencias" });
  if (unseated.length) risks.push({ level: "medium", label: `${unseated.length} invitados sin mesa`, tab: "mesas" });
  if (providers.some((provider) => !isReady(provider.status))) risks.push({ level: "medium", label: "Proveedores por confirmar", tab: "proveedores" });
  if (!tables.length) risks.push({ level: "medium", label: "Seating sin preparar", tab: "mesas" });
  if (!byWeddingId("timeline", weddingId).length) risks.push({ level: "high", label: "Timeline sin crear", tab: "timeline" });
  if (!risks.length) risks.push({ level: "ok", label: "Sin alertas críticas", tab: "resumen" });
  return risks;
}

function paletteSwatches(wedding, compact = false) {
  const colors = [wedding.palettePrimary, wedding.paletteSecondary, wedding.paletteAccent];
  return `<div class="palette-swatches ${compact ? "compact" : ""}" aria-label="Paleta de la boda">${colors.map((color) => `<span style="--swatch:${text(color)}" title="${text(color)}"></span>`).join("")}</div>`;
}

// Catalogo de servicios de ejemplo. El equipo marca cuales aplican a cada
// boda al crearla (o los edita despues desde la pestaña Servicios), poniendo
// precio y una observacion — eso es justo lo que ven los novios en su portal
// y lo que se usara para el contrato al firmar.
/**
 * Los servicios que contrata la pareja.
 *
 * Antes esta lista mezclaba dos cosas distintas: los servicios que la pareja
 * contrata ("Organización integral") y los procesos internos de trabajo
 * ("Gestión de proveedores", "Timeline y planning"). Eso hacía que la pestaña
 * Servicios pareciera una lista de tareas con precio, y que el contrato
 * saliera con líneas que la pareja nunca había contratado.
 *
 * Aquí solo hay producto: lo que se firma y lo que se factura. El trabajo
 * interno vive en Tareas, que es su sitio.
 *
 * Los nombres y las descripciones son los servicios habituales de un estudio de bodas y eventos (datos de demostración).
 */
/**
 * Galería de portadas: fotos de ejemplo de bodas (las mismas de las que salen
 * las fotos de Rincones), ya recortadas y alojadas en el propio proyecto. La política de seguridad de la app solo
 * permite imágenes del propio origen (`img-src 'self' data: blob:`), así que
 * una URL externa (Unsplash, etc.) se queda en blanco — de ahí que antes
 * varias bodas no mostraran portada. Estas rutas locales siempre cargan,
 * también sin conexión.
 */
const COVER_GALLERY = [
  { id: "bosque-ceremonia", label: "Ceremonia en el bosque", path: "./assets/fotos/bosque-ceremonia.jpg" },
  { id: "acantilado-ceremonia", label: "Ceremonia frente al mar", path: "./assets/fotos/acantilado-ceremonia.jpg" },
  { id: "arco-rosas", label: "Arco de rosas al atardecer", path: "./assets/fotos/arco-rosas.jpg" },
  { id: "pasillo-petalos", label: "Pasillo de pétalos", path: "./assets/fotos/pasillo-petalos.jpg" },
  { id: "invernadero-banquete", label: "Banquete en el invernadero", path: "./assets/fotos/invernadero-banquete.jpg" },
  { id: "terraza-banquete", label: "Banquete en la terraza", path: "./assets/fotos/terraza-banquete.jpg" },
  { id: "jardin-iluminado", label: "Jardín iluminado", path: "./assets/fotos/jardin-iluminado.jpg" },
  { id: "jardin-fiesta", label: "Fiesta en el jardín", path: "./assets/fotos/jardin-fiesta.jpg" },
  { id: "masia-lounge", label: "Masía y zona lounge", path: "./assets/fotos/masia-lounge.jpg" },
  { id: "patio-mediterraneo", label: "Patio mediterráneo", path: "./assets/fotos/patio-mediterraneo.jpg" },
];

// Cada boda de demostración tiene su portada asignada a mano. Cualquier otra
// —incluidas las que cree quien pruebe la app— recibe un reparto estable (no
// aleatorio) de la galería, para que siempre tenga portada aunque nadie se la
// haya puesto.
const DEFAULT_COVER_BY_WEDDING_ID = {
  "w-demo-1": "./assets/fotos/bosque-ceremonia.jpg",
  "w-demo-2": "./assets/fotos/terraza-banquete.jpg",
  "w-demo-3": "./assets/fotos/acantilado-ceremonia.jpg",
};

function defaultCoverFor(wedding) {
  if (DEFAULT_COVER_BY_WEDDING_ID[wedding.id]) return DEFAULT_COVER_BY_WEDDING_ID[wedding.id];
  const genericas = COVER_GALLERY;
  let hash = 0;
  for (const char of String(wedding.id || wedding.couple || "")) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return genericas[hash % genericas.length].path;
}

/** ¿Es una URL que la CSP actual (`img-src 'self' data: blob:`) va a bloquear? */
function isBlockedCoverUrl(url) {
  return /^https?:\/\//i.test(String(url || ""));
}

const EP_SERVICE_CATALOG = [
  [
    "Organización integral",
    "Te acompañamos de principio a fin: diseño del evento, búsqueda y gestión de proveedores, reuniones de seguimiento y coordinación el día de la boda.",
  ],
  [
    "Wedding Day · Coordinación",
    "Vosotros organizáis y el equipo se ocupa del gran día: timing, coordinación de proveedores, montaje y que todo salga como estaba previsto.",
  ],
  [
    "Destination wedding",
    "Bodas en otra ciudad o país, o con invitados de lejos: logística, alojamiento, traslados y coordinación a distancia.",
  ],
  [
    "Decoración personalizada",
    "Concepto visual y rincones ambientados a medida: bienvenida, seating, photocall, candy bar y todo lo que se diseñe para esa boda.",
  ],
  [
    "Sesiones de asesoramiento",
    "Reuniones sueltas para resolver dudas, revisar presupuestos o decidir un punto concreto con ayuda del equipo.",
  ],
  [
    "Servicio adicional",
    "Cualquier extra acordado con la pareja que no esté en los servicios anteriores.",
  ],
];

/**
 * Categorías de proveedor de boda. Cerrar la lista permite filtrar, agrupar
 * y contar; con texto libre cada persona escribía "Foto", "Fotógrafo" o
 * "Fotografía" y no había manera de agrupar nada.
 */
const PROVIDER_TYPES = [
  "Espacio / Finca",
  "Catering",
  "Fotografía",
  "Vídeo",
  "Música / DJ",
  "Música en directo",
  "Floristería",
  "Decoración",
  "Estilismo / MUAH",
  "Vestido y traje",
  "Joyería y alianzas",
  "Tarta y repostería",
  "Papelería e invitaciones",
  "Photobooth",
  "Transporte",
  "Animación infantil",
  "Iluminación y sonido",
  "Mobiliario y carpas",
  "Oficiante de ceremonia",
  "Alojamiento",
  "Otros",
];

/** Grupos de invitados: agrupan la lista y el seating por bloques sociales. */
const GUEST_GROUPS = ["Familia novia", "Familia novio", "Amigos cercanos", "Amigos", "Trabajo", "Sin grupo"];

const processStatuses = ["Pendiente", "En tramitación", "Listo"];
const confirmationStatuses = ["Pendiente", "Por confirmar", "Confirmado"];
const weddingDayStatuses = ["Pendiente", "Confirmado", "Hecho"];
const serviceStatuses = ["No iniciado", "En proceso", "Listo"];
// Flujo de preparacion de un rincon: materiales/flores por comprar, pedido ya
// hecho y en camino, o ya recibido/listo para el montaje.
const rinconTaskStatuses = ["Pendiente", "Pedido / en camino", "Listo"];

function statusClass(status) {
  if (status === "Listo" || status === "done" || status === "Confirmado") return "done";
  if (status === "En tramitación" || status === "En tramitacion") return "progressing";
  if (status === "Cancelado") return "cancelled";
  return "pending";
}

function nextStatus(status) {
  const normalized = status === "done" ? "Listo" : status === "pending" ? "Pendiente" : status === "En tramitacion" ? "En tramitación" : status || "Pendiente";
  const index = processStatuses.indexOf(normalized);
  return processStatuses[(index + 1) % processStatuses.length];
}

function isReady(status) {
  return status === "Listo" || status === "done" || status === "Confirmado";
}

function isWeddingDayDone(status) {
  return status === "Hecho" || status === "Listo" || status === "done";
}

function nextFrom(list, status) {
  const index = list.indexOf(status || list[0]);
  return list[(index + 1) % list.length];
}

function mapsUrl(query) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query || "")}`;
}

function openGoogleMaps(query) {
  if (!query) {
    toast("Añade una dirección primero");
    return;
  }
  window.open(mapsUrl(query), "_blank", "noopener");
}

function text(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function setView(view) {
  state.mobileMenuOpen = false;
  if (view === "portal") {
    if (!state.weddings.length) {
      toast("Crea una boda antes de abrir el portal de novios");
      view = "weddings";
    } else {
      // Cada vez que se entra al portal desde el menu lateral se pide elegir
      // la boda otra vez (no se hereda la boda que estuviera abierta en el
      // lado de equipo), y se vuelve a pedir la contraseña de esa boda.
      state.portalWeddingId = null;
      state.portalUnlocked = false;
    }
  }
  state.view = view;
  state.portalMode = view === "portal";
  saveState();
  render();
  window.scrollTo(0, 0);
}

function openPortalForWedding(id) {
  state.view = "portal";
  state.portalWeddingId = id;
  state.portalUnlocked = false;
  saveState();
  render();
}

function selectWedding(id) {
  state.selectedWeddingId = id;
  state.selectedTab = "resumen";
  state.view = "wedding";
  saveState();
  render();
  window.scrollTo(0, 0);
}

/**
 * Aviso flotante. Se anuncia con `role="status"` para que un lector de
 * pantalla lo lea sin interrumpir lo que el usuario esté haciendo — que es
 * justo la diferencia entre "status" y "alert".
 */
function toast(message, duration = 2400) {
  const node = document.createElement("div");
  node.className = "toast";
  node.setAttribute("role", "status");
  node.setAttribute("aria-live", "polite");
  node.textContent = message;
  document.body.appendChild(node);
  setTimeout(() => node.remove(), duration);
}

/**
 * Aviso con botón de deshacer. Se usa después de borrar: en lugar de pedir
 * confirmación antes (que se acaba pulsando en automático) se borra y se da
 * una ventana real para arrepentirse. Es el patrón de Gmail, y para alguien
 * que trabaja con prisa la víspera de una boda vale mucho más que un diálogo.
 */
function toastUndo(message, onUndo, duration = 9000) {
  const node = document.createElement("div");
  node.className = "toast toast-undo";
  node.setAttribute("role", "status");
  node.setAttribute("aria-live", "polite");

  const txt = document.createElement("span");
  txt.textContent = message;
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "toast-undo-btn";
  btn.textContent = "Deshacer";

  let vivo = true;
  const cerrar = () => {
    if (!vivo) return;
    vivo = false;
    node.remove();
  };
  btn.addEventListener("click", () => {
    cerrar();
    onUndo();
  });

  node.append(txt, btn);
  document.body.appendChild(node);
  // La barra de progreso hace visible cuánto tiempo queda: sin ella la gente
  // no sabe si tiene un segundo o diez para reaccionar.
  node.style.setProperty("--undo-dur", `${duration}ms`);
  setTimeout(cerrar, duration);
  return cerrar;
}

function canManageUsers() {
  return String(state.user?.role || "").startsWith("Administración");
}


/**
 * Muestra un error dentro del formulario en vez de en un aviso flotante: el
 * mensaje se queda al lado del campo hasta que se corrige, que es lo que
 * espera cualquiera que acaba de fallar la contraseña.
 */
function setLoginError(message) {
  const box = document.querySelector("#login-error");
  if (!box) return;
  box.textContent = message || "";
  box.hidden = !message;
}

/** Activa o desactiva el estado de carga del boton de un formulario. */
function setLoginBusy(form, busy, label) {
  const button = form?.querySelector("button[type='submit']");
  if (!button) return;
  button.disabled = busy;
  button.classList.toggle("is-busy", busy);
  const span = button.querySelector(".login-submit-label");
  if (span && label) span.textContent = label;
}

async function login(event) {
  event.preventDefault();
  const formEl = event.currentTarget;
  const form = new FormData(formEl);
  // Chrome (y los gestores de contraseñas) a veces rellenan los campos sin
  // disparar los eventos que FormData necesita: el usuario ve el formulario
  // relleno y la app lo ve vacío. Por eso, si FormData viene sin nada, se lee
  // el valor directamente del input antes de dar por hecho que falta algo.
  const leer = (name) => (form.get(name)?.toString() || formEl.querySelector(`[name="${name}"]`)?.value || "");
  const username = leer("username").trim().toLowerCase();
  const password = leer("password");
  setLoginError("");

  const espera = esperaPorIntentos(`equipo:${username}`);
  if (espera) {
    setLoginError(`Demasiados intentos fallidos. Espera ${espera} segundo${espera === 1 ? "" : "s"} y vuelve a probar.`);
    return;
  }

  if (!username || !password) {
    setLoginError("Escribe tu usuario y tu contraseña. Si los ves ya rellenos por el navegador, haz clic en cada campo antes de entrar.");
    return;
  }

  setLoginBusy(formEl, true, "Entrando…");
  let user = state.users.find((item) => item.username === username);
  if (supabaseClient) {
    let supabaseOk = false;
    try {
      const { error } = await supabaseClient.auth.signInWithPassword({ email: authEmail(username), password });
      if (!error) {
        supabaseOk = true;
        try {
          await loadRemoteState();
          user = state.users.find((item) => item.username === username) || user;
        } catch (e) {
          console.error(e);
          toast("Has entrado, pero no hemos podido cargar la nube. Usamos la copia de este dispositivo.");
        }
      } else {
        // Log detallado en consola para poder diagnosticar (credenciales vs
        // usuario no aprovisionado en Supabase vs error de red/config) sin
        // exponer nada sensible en la interfaz.
        console.warn("[EP] Supabase Auth rechazo el login:", error.message);
      }
    } catch (e) {
      console.warn("[EP] Error de conexion con Supabase, intentando login local:", e.message);
    }
    if (!supabaseOk) {
      // Fallback local: solo compara contra la copia en memoria del propio
      // navegador (nunca se sube a la nube, ver snapshotFromState). Sirve
      // para poder entrar cuando el usuario aun no esta aprovisionado en
      // Supabase Auth o hay un problema de conexion.
      if (!(await verifyPassword(user, password))) {
        apuntarFallo(`equipo:${username}`);
        setLoginBusy(formEl, false, "Entrar a Events Planner");
        setLoginError("Usuario o contraseña incorrectos.");
        return;
      }
    }
  } else if (!(await verifyPassword(user, password))) {
    apuntarFallo(`equipo:${username}`);
    setLoginBusy(formEl, false, "Entrar a Events Planner");
    setLoginError("Usuario o contraseña incorrectos.");
    return;
  }
  if (!user) {
    setLoginBusy(formEl, false, "Entrar a Events Planner");
    setLoginError("Las credenciales son válidas, pero falta tu perfil en Events Planner. Pide a administración que lo cree y vuelve a entrar.");
    return;
  }
  limpiarIntentos(`equipo:${username}`);
  state.user = { id: user.id, name: user.name, role: user.role };
  state.lastUsername = username;
  saveState({ skipRemote: true });

  // La nube puede venir vacía —recién montada, o alguien guardó un estado sin
  // bodas— y entonces `applyRemoteSnapshot` deja el planner a cero: entrar
  // equivale a borrar la pantalla.
  //
  // Va AQUÍ, después de asignar `state.user`, y no junto a loadRemoteState:
  // sin usuario, `scheduleRemoteSave` se sale de largo y las bodas restauradas
  // se quedaban solo en este navegador — la nube seguía vacía y al siguiente
  // que entrara le volvía a pasar lo mismo. Al reparar aquí, el guardado que
  // hace cargarReferencia() sí sube, y la nube queda poblada para el resto.
  repararVacioCallback();
  render();
}

async function logout() {
  dejarDeEscuchar();
  if (supabaseClient) await supabaseClient.auth.signOut();
  state.user = null;
  remoteReady = false;
  saveState({ skipRemote: true });
  render();
}

function toggleForgotPassword(show) {
  state.showForgotPassword = RECUPERACION_ACTIVA ? show : false;
  render();
}

/**
 * Busca a una persona del equipo por lo que recuerde: su usuario, su correo o
 * su teléfono. Quien ha perdido el acceso no siempre recuerda cuál de los tres
 * escribió al darse de alta.
 */
function usuarioPorIdentificador(valor) {
  const v = String(valor || "").trim().toLowerCase();
  if (!v) return null;
  const digitos = phoneDigits(v);
  return (
    state.users.find((u) => String(u.username || "").toLowerCase() === v) ||
    state.users.find((u) => String(u.email || "").toLowerCase() === v) ||
    (digitos.length >= 9 ? state.users.find((u) => phoneDigits(u.phone) === digitos) : null) ||
    null
  );
}

/**
 * Teléfono en formato internacional (E.164), que es el que exige el SMS.
 * `phoneDigits` ya deja el número internacional sin el «+» (y antepone 34 a
 * los de nueve cifras), así que aquí sólo falta el signo.
 */
function telefonoE164(telefono) {
  const digitos = phoneDigits(telefono);
  return digitos ? `+${digitos}` : "";
}

/** «nombre.apellido@example.com» → «no•••@example.com» */
function taparCorreo(correo) {
  const [antes, dominio] = String(correo || "").split("@");
  if (!dominio) return "tu correo";
  return `${antes.slice(0, 2)}${"•".repeat(Math.max(3, antes.length - 2))}@${dominio}`;
}

/** «+34 600 000 900» → «••• ••• 900» */
function taparTelefono(telefono) {
  const d = phoneDigits(telefono);
  return d ? `••• ••• ${d.slice(-3)}` : "tu teléfono";
}

/**
 * Recuperar el acceso, por correo o por SMS.
 *
 * Antes esto no podía funcionar de ninguna manera: se pedía el reseteo contra
 * `usuario@eventsplanner.app`, un dominio que no existe, así que el correo no
 * llegaba a ningún buzón. Ahora se usa la dirección real de cada persona, la
 * que se puede cambiar desde Ajustes › Mi perfil.
 *
 * El mensaje de vuelta es el mismo exista o no la persona: si dijera «ese
 * usuario no existe», cualquiera podría averiguar quién trabaja aquí probando
 * nombres.
 */
async function forgotPassword(event) {
  event.preventDefault();
  const formEl = event.currentTarget;
  const datos = new FormData(formEl);
  const identificador = datos.get("username")?.toString().trim() || "";
  const via = datos.get("via")?.toString() === "sms" ? "sms" : "email";
  setLoginError("");

  if (!identificador) {
    setLoginError("Escribe tu usuario, tu correo o tu teléfono para poder ayudarte.");
    return;
  }

  const persona = usuarioPorIdentificador(identificador);

  // Comprobaciones que SÍ se pueden contar sin revelar nada: si la persona
  // existe pero no tiene ese dato, no hay forma de escribirle.
  if (persona && via === "email" && !persona.email) {
    setLoginError("Esa cuenta no tiene correo guardado. Pide a administración que lo añada en Ajustes › Equipo.");
    return;
  }
  if (persona && via === "sms" && !persona.phone) {
    setLoginError("Esa cuenta no tiene teléfono guardado. Pide a administración que lo añada en Ajustes › Equipo.");
    return;
  }

  if (!supabaseClient) {
    setLoginError("Sin conexión con el servidor no se puede enviar el aviso. Pide a administración que restablezca tu acceso.");
    return;
  }

  setLoginBusy(formEl, true, "Enviando…");
  let destino = "";
  let fallo = null;
  try {
    if (persona && via === "email") {
      // Se pide contra la dirección con la que la cuenta existe en Supabase
      // (ver authEmail), no contra la que se muestra: si no coinciden,
      // Supabase no encuentra la cuenta y no envía nada — y encima sin dar
      // error, porque no revela qué direcciones están registradas.
      destino = taparCorreo(persona.email);
      const { error } = await supabaseClient.auth.resetPasswordForEmail(authEmail(persona.username), { redirectTo: window.location.href });
      if (error) fallo = error;
    } else if (persona && via === "sms") {
      destino = taparTelefono(persona.phone);
      const { error } = await supabaseClient.auth.signInWithOtp({ phone: telefonoE164(persona.phone) });
      if (error) fallo = error;
    }
  } catch (e) {
    fallo = e;
  }
  setLoginBusy(formEl, false, via === "sms" ? "Enviarme un SMS" : "Enviarme un correo");

  // Si el envío ha fallado NO se dice que se ha enviado.
  //
  // El mensaje genérico existe para no revelar qué usuarios son válidos, y eso
  // se mantiene. Pero un fallo de red o de configuración no dice nada sobre si
  // la cuenta existe: es información nuestra, no suya. Callarlo dejaba a quien
  // se ha quedado fuera esperando un correo que no iba a llegar nunca — que es
  // exactamente el peor momento para mentirle a alguien.
  if (fallo) {
    console.warn("[EP] No se pudo enviar la recuperación:", fallo.message || fallo);
    const sinRed = /fetch|network|timeout/i.test(String(fallo.message || ""));
    setLoginError(
      sinRed
        ? "No hemos podido contactar con el servidor. Comprueba la conexión y vuelve a intentarlo; si sigue igual, pide a administración que te restablezca el acceso."
        : via === "sms"
          ? "No se ha podido enviar el SMS. Prueba con el correo o avisa a administración."
          : "No se ha podido enviar el correo. Avisa a administración para que te restablezca el acceso."
    );
    return;
  }

  toast(
    via === "sms"
      ? `Si la cuenta existe, te hemos enviado un SMS a ${destino || "tu teléfono"}.`
      : `Si la cuenta existe, te hemos enviado un correo a ${destino || "tu correo"}.`,
    8000
  );
  state.showForgotPassword = false;
  render();
}

export { escucharCambiosRemotos, dejarDeEscuchar, onPlannerVacio, estadoSincronizacion, RECUPERACION_ACTIVA, usuarioPorIdentificador, telefonoE164, taparCorreo, taparTelefono, EP_CONFIG, cuando, fechaHora, phoneDigits, whatsappUrl, telUrl, estadoConexion, marcarConexion, EP_SERVICE_CATALOG, COVER_GALLERY, defaultCoverFor, isBlockedCoverUrl, GUEST_GROUPS, PROVIDER_TYPES, STORAGE_KEY, applyRemoteSnapshot, applyingRemote, authEmail, byWedding, byWeddingId, canManageUsers, confirmationStatuses, daysUntil, demoState, forgotPassword, formatDate, getWedding, isReady, isWeddingClosed, isWeddingDayDone, openTasks, hashPassword, esperaPorIntentos, apuntarFallo, limpiarIntentos, pesoDelEstado, loadRemoteState, loadState, login, logout, mapsUrl, migratePasswords, nextFrom, nextStatus, normalizeState, onRender, setLoginError, setLoginBusy, openGoogleMaps, openPortalForWedding, paletteSwatches, pendingWeddingTasks, persistedCollections, processStatuses, remoteReady, remoteSaveTimer, replaceState, resetDemoConfirmed, rinconTaskStatuses, saveRemoteState, saveState, scheduleRemoteSave, selectWedding, serviceStatuses, setView, snapshotFromState, sortedWeddings, state, statusClass, supabaseClient, text, toast, toggleForgotPassword, toastUndo, uid, weddingDayStatuses, weddingReadiness, weddingRisks, weddingTasks };
