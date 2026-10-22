import { addActivity } from "./modals.js";
import { render } from "./render.js";
import { PROVIDER_TYPES, saveState, state, supabaseClient, text, toast, toastUndo, uid } from "./state.js";

// ============================================================================
// Buscador de proveedores en la web
// ----------------------------------------------------------------------------
// Hasta ahora, «buscar proveedores nuevos» era salir de Events Planner: cuatro
// enlaces que abrían Google, bodas.net, Instagram y Maps en otra pestaña. A
// partir de ahí, todo a mano — abrir cada web, copiar el teléfono, volver,
// pegarlo en una ficha nueva. Diez minutos por proveedor y tres ventanas
// abiertas para no perder el hilo.
//
// Esto hace ese trabajo aquí dentro. Se escribe qué se busca y dónde, y salen
// fichas ya montadas: nombre, dirección, teléfono, web, la nota media que tiene
// en Google y cuántas personas la han puesto. Un botón y esa empresa está en la
// base, o propuesta a una pareja.
//
// DOS DECISIONES QUE CONVIENE CONOCER
//
//   1. Esto NO busca en tu base de proveedores. La base tiene su propio buscador justo
//      debajo y son dos preguntas distintas: «¿con quién he trabajado ya?» y
//      «¿quién más hay ahí fuera?». Mezclarlas en un solo campo obliga a
//      explicar cada vez de dónde sale cada resultado.
//
//   2. La búsqueda se lanza al pulsar, no al teclear. En la base buscar
//      mientras escribes es gratis y se agradece; aquí cada pulsación sería una
//      llamada de pago a Google. Además, media palabra da malos resultados.
//
// El estado vive en este módulo y no en `state`, a propósito: los resultados
// son de usar y tirar. Si se guardaran en `state` acabarían en el navegador y
// en la copia compartida del equipo, engordando cada guardado con cosas que a
// nadie le sirven mañana.
// ============================================================================

const busqueda = {
  contexto: "base",      // "base" (Proveedores del menú) o "boda" (dentro de una boda)
  ayudaAbierta: false,
  consulta: "",
  categoria: "Todas",
  zona: "",
  minValoracion: "0",
  orden: "relevancia",
  cargando: false,
  error: null,           // { tipo, mensaje }
  resultados: [],
  siguiente: "",
  buscada: "",           // lo que se buscó de verdad, para la cabecera de resultados
  desdeCache: false,
  anadidos: new Set(),   // idGoogle de lo añadido en esta sesión, para el "hecho"
};

/** Zonas que se ofrecen: primero las que ya usa la base, luego las de casa. */
const ZONAS_CASA = [
  "Barcelona", "Maresme", "Vallès", "Baix Llobregat", "Penedès",
  "Costa Brava", "Girona", "Empordà", "Tarragona", "Sitges", "Lleida",
];

function zonasDisponibles() {
  const propias = [...new Set(state.providers.map((p) => String(p.zone || "").trim()).filter(Boolean))];
  return [...new Set([...propias, ...ZONAS_CASA])].sort((a, b) => a.localeCompare(b, "es"));
}

function sinTildes(v) {
  return String(v || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

function dominioDe(url) {
  try {
    return new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

/**
 * ¿Esta empresa ya la tenemos?
 *
 * Se compara por nombre sin tildes y por dominio de la web. El dominio importa:
 * «Floristeria Flores del Ejemplo» y «Flores del Ejemplo Floristeria» son la misma empresa escrita
 * de dos maneras, y la web es la misma. Sin esto se acaban teniendo dos fichas
 * del mismo florista, que es justo el problema que la base venía a resolver.
 */
function yaEnLaBase(ficha) {
  const nombre = sinTildes(ficha.nombre);
  const dominio = ficha.dominio;
  return state.providers.find((p) => {
    if (!p.name) return false;
    if (sinTildes(p.name) === nombre) return true;
    return Boolean(dominio) && dominioDe(p.web) === dominio;
  }) || null;
}

/** ¿Y en ESTA boda? Distinto de estar en la base: puede estar y no proponerse. */
function yaEnLaBoda(ficha, weddingId) {
  if (!weddingId) return null;
  const nombre = sinTildes(ficha.nombre);
  return state.providers.find((p) => p.weddingId === weddingId && sinTildes(p.name) === nombre) || null;
}

function bodaActiva() {
  return state.portalMode ? state.portalWeddingId : state.selectedWeddingId;
}

// ---------------------------------------------------------------------------
// Llamada al servidor
// ---------------------------------------------------------------------------
// Se habla con la función `buscar-proveedores`, que es quien guarda la clave de
// Google. Aquí no hay ninguna clave ni ninguna dirección de Google: si algún día
// se cambia de proveedor de datos, esta parte no se entera.

async function lanzarBusqueda({ pagina = "" } = {}) {
  if (!supabaseClient) {
    busqueda.error = {
      tipo: "sin_conexion",
      mensaje: "El buscador no puede conectar con el servidor en este momento. Inténtalo en unos minutos; mientras tanto, puedes usar los buscadores externos de aquí abajo.",
    };
    render();
    return;
  }

  busqueda.cargando = true;
  busqueda.error = null;
  if (!pagina) busqueda.resultados = [];
  render();

  try {
    const { data, error } = await supabaseClient.functions.invoke("buscar-proveedores", {
      body: {
        consulta: busqueda.consulta.trim(),
        categoria: busqueda.categoria,
        zona: busqueda.zona,
        minValoracion: Number(busqueda.minValoracion) || 0,
        pagina,
      },
    });

    if (error) {
      // El cuerpo del error trae el motivo exacto que puso la función. Merece
      // la pena leerlo: «falta la clave» y «se ha caído Google» se arreglan en
      // sitios distintos, y decir «ha fallado algo» obliga a adivinar.
      let detalle = null;
      try {
        detalle = await error.context?.json?.();
      } catch { /* la respuesta no era JSON */ }
      busqueda.error = {
        tipo: detalle?.error || "desconocido",
        mensaje: detalle?.mensaje || "El buscador no ha podido responder. Vuelve a intentarlo en un momento.",
      };
      busqueda.cargando = false;
      render();
      return;
    }

    const nuevos = (data?.resultados || []).filter((r) => r.nombre);
    busqueda.resultados = pagina ? [...busqueda.resultados, ...nuevos] : nuevos;
    busqueda.siguiente = data?.siguiente || "";
    busqueda.buscada = data?.consulta || busqueda.consulta;
    busqueda.desdeCache = Boolean(data?.desdeCache);
  } catch (e) {
    console.error("[buscador] ", e);
    busqueda.error = {
      tipo: "red",
      mensaje: "No hay manera de contactar con el buscador. Comprueba la conexión y vuelve a intentarlo.",
    };
  }

  busqueda.cargando = false;
  render();
}

// ---------------------------------------------------------------------------
// Pasar una ficha encontrada a proveedor propio
// ---------------------------------------------------------------------------

/** La ficha de Google, con la forma exacta que tiene un proveedor aquí. */
function aProveedor(ficha, weddingId = "") {
  // La categoría sale de lo que se estaba buscando. Google devuelve la suya
  // («Florist», «Wedding venue»), pero es la de Google y no la nuestra: si se
  // guardara esa, los filtros de la base dejarían de cuadrar en una semana.
  const categoria = ficha.categoria || (busqueda.categoria !== "Todas" ? busqueda.categoria : "") || "Otros";
  return {
    id: uid("p"),
    weddingId,
    name: ficha.nombre,
    type: categoria,
    contact: "",
    phone: ficha.telefono || "",
    email: "",
    instagram: "",
    web: ficha.web || "",
    zone: ficha.ciudad || busqueda.zona || "",
    status: "Pendiente",
    // Lo que Google sabe y nosotras no vamos a recordar dentro de tres meses:
    // dónde está exactamente y qué reputación tenía el día que lo encontramos.
    notes: [
      ficha.direccion ? `Dirección: ${ficha.direccion}` : "",
      ficha.valoracion ? `Valoración en Google: ${String(ficha.valoracion).replace(".", ",")} sobre 5 (${ficha.resenas} reseñas, ${new Date().toLocaleDateString("es-ES")})` : "",
      ficha.maps ? `Ficha en Maps: ${ficha.maps}` : "",
    ].filter(Boolean).join("\n"),
    origen: "buscador-web",
    googlePlaceId: ficha.idGoogle || "",
    ...(weddingId ? { validacion: "Pendiente de que la pareja decida", presupuesto: null } : {}),
  };
}

function anadirALaBase(idGoogle) {
  const ficha = busqueda.resultados.find((r) => r.idGoogle === idGoogle);
  if (!ficha) return;
  const repetido = yaEnLaBase(ficha);
  if (repetido) {
    toast(`${repetido.name} ya estaba en tu base de proveedores`);
    return;
  }
  const nuevo = aProveedor(ficha);
  state.providers.push(nuevo);
  busqueda.anadidos.add(idGoogle);
  addActivity(`Añadió a la base el proveedor ${nuevo.name} (encontrado en la web)`, state.user?.name);
  saveState();
  render();
  toastUndo(`${nuevo.name} añadido a tu base`, () => {
    state.providers = state.providers.filter((p) => p.id !== nuevo.id);
    busqueda.anadidos.delete(idGoogle);
    saveState();
    render();
  });
}

function proponerALaBoda(idGoogle) {
  const weddingId = bodaActiva();
  if (!weddingId) {
    toast("Abre primero la boda a la que quieres proponerlo");
    return;
  }
  const ficha = busqueda.resultados.find((r) => r.idGoogle === idGoogle);
  if (!ficha) return;
  if (yaEnLaBoda(ficha, weddingId)) {
    toast("Ese proveedor ya está propuesto en esta boda");
    return;
  }

  // Se guarda también en la base, aunque no estuviera: un proveedor que se
  // propone a una pareja es un proveedor con el que se cuenta, y la próxima vez
  // tiene que salir en el desplegable sin volver a buscarlo fuera.
  const enBase = yaEnLaBase(ficha) || (() => {
    const base = aProveedor(ficha);
    state.providers.push(base);
    return base;
  })();

  const propuesta = { ...aProveedor(ficha, weddingId), sourceProviderId: enBase.id };
  state.providers.push(propuesta);
  busqueda.anadidos.add(idGoogle);
  addActivity(`Propuso a la pareja el proveedor ${propuesta.name} (encontrado en la web)`, state.user?.name, weddingId);
  saveState();
  render();
  toast(`${propuesta.name} propuesto. Los novios ya lo ven en su portal para valorarlo.`, 5000);
}

// ---------------------------------------------------------------------------
// Pintado
// ---------------------------------------------------------------------------

/**
 * Las cinco estrellas de una valoración.
 *
 * Se dibujan dos filas superpuestas —una gris entera y otra dorada recortada al
 * porcentaje— en vez de redondear a media estrella. Un 4,3 y un 4,7 se ven
 * distintos, que es lo que se quiere: la diferencia entre esas dos notas es
 * exactamente la razón de mirarlas.
 */
function estrellas(valor) {
  const pct = Math.max(0, Math.min(100, (Number(valor) / 5) * 100));
  return `<span class="bw-estrellas" role="img" aria-label="${String(valor).replace(".", ",")} sobre 5">
    <span class="bw-estrellas-fondo">★★★★★</span>
    <span class="bw-estrellas-lleno" style="width:${pct}%">★★★★★</span>
  </span>`;
}

function tarjeta(ficha) {
  const enBase = yaEnLaBase(ficha);
  const weddingId = busqueda.contexto === "boda" ? bodaActiva() : "";
  const enBoda = weddingId ? yaEnLaBoda(ficha, weddingId) : null;
  const recienAnadido = busqueda.anadidos.has(ficha.idGoogle);
  const cerrado = /CLOSED/.test(ficha.situacion || "");

  const acciones = [
    ficha.telefono ? `<a class="contact-chip" href="tel:${text(String(ficha.telefono).replace(/\s+/g, ""))}" title="Llamar a ${text(ficha.nombre)}">☎ ${text(ficha.telefono)}</a>` : "",
    ficha.web ? `<a class="contact-chip" href="${text(ficha.web)}" target="_blank" rel="noopener noreferrer" title="Abrir su web">↗ Web</a>` : "",
    ficha.maps ? `<a class="contact-chip" href="${text(ficha.maps)}" target="_blank" rel="noopener noreferrer" title="Ver en Google Maps con sus reseñas">◉ Maps</a>` : "",
  ].filter(Boolean).join("");

  return `<article class="bw-card${cerrado ? " bw-card-cerrado" : ""}">
    <div class="bw-card-cab">
      <span class="bw-logo">
        
        <span class="bw-logo-inicial">${text(String(ficha.nombre || "?").trim().charAt(0).toUpperCase())}</span>
      </span>
      <div class="bw-card-id">
        <h4>${text(ficha.nombre)}</h4>
        <p class="bw-card-tipo">
          ${ficha.categoriaGoogle ? `<span class="tipo-chip">${text(ficha.categoriaGoogle)}</span>` : ""}
          ${ficha.ciudad ? `<span class="zona-chip">◈ ${text(ficha.ciudad)}</span>` : ""}
        </p>
      </div>
      ${
        ficha.valoracion
          ? `<div class="bw-nota">
              ${estrellas(ficha.valoracion)}
              <strong>${text(String(ficha.valoracion).replace(".", ","))}</strong>
              <small>${ficha.resenas} reseña${ficha.resenas === 1 ? "" : "s"}</small>
            </div>`
          : `<div class="bw-nota bw-nota-vacia"><small>Sin valoraciones<br>todavía</small></div>`
      }
    </div>

    ${ficha.direccion ? `<p class="bw-direccion">◈ ${text(ficha.direccion)}</p>` : ""}
    ${cerrado ? `<p class="bw-cerrado">⚠ Google lo da por cerrado. Confírmalo antes de contar con ellos.</p>` : ""}
    ${acciones ? `<div class="contact-chips bw-chips">${acciones}</div>` : ""}

    <div class="bw-card-pie">
      ${
        enBoda
          ? `<span class="bw-hecho">✓ Ya propuesto en esta boda</span>`
          : busqueda.contexto === "boda"
            ? `<button class="btn primary btn-xs" data-bw-proponer="${text(ficha.idGoogle)}"
                       aria-label="Proponer ${text(ficha.nombre)} a esta boda">
                 <span class="icon-btn">+</span> Proponer a esta boda
               </button>
               ${enBase ? `<span class="bw-nota-base">Ya está en tu base</span>` : ""}`
            : enBase
              ? `<span class="bw-hecho">✓ Ya está en tu base${recienAnadido ? " · recién añadido" : ""}</span>`
              : `<button class="btn primary btn-xs" data-bw-anadir="${text(ficha.idGoogle)}"
                         aria-label="Añadir ${text(ficha.nombre)} a mi base de proveedores">
                   <span class="icon-btn">+</span> Añadir a mi base
                 </button>`
      }
    </div>
  </article>`;
}

function ordenar(lista) {
  const copia = [...lista];
  if (busqueda.orden === "nota") {
    return copia.sort((a, b) => (b.valoracion || 0) - (a.valoracion || 0) || (b.resenas || 0) - (a.resenas || 0));
  }
  if (busqueda.orden === "resenas") {
    return copia.sort((a, b) => (b.resenas || 0) - (a.resenas || 0));
  }
  return copia; // relevancia: el orden en que lo devuelve el buscador
}

function ayuda() {
  if (!busqueda.ayudaAbierta) return "";
  return `<div class="bw-ayuda" id="bw-ayuda">
    <ol class="bw-pasos">
      <li><b>Di qué buscas y dónde.</b> Elige la categoría y la zona, o escribe con tus palabras: «photobooth vintage», «catering vegano Girona».</li>
      <li><b>Mira las valoraciones.</b> La nota media y el número de reseñas vienen de Google. Un 4,9 con seis reseñas dice menos que un 4,6 con trescientas.</li>
      <li><b>Guárdalo con un botón.</b> Se crea la ficha con su dirección, su teléfono y su web ya rellenos. Después la completas con la persona de contacto y su Instagram.</li>
    </ol>
    <p class="bw-ayuda-pie">Lo que encuentres aquí no se comparte con nadie hasta que tú lo propongas a una pareja.</p>
  </div>`;
}

function estadoVacio() {
  const ejemplos = ["Floristería", "Fotografía", "Catering", "Música / DJ", "Photobooth"];
  return `<div class="bw-vacio">
    <span class="bw-vacio-ico" aria-hidden="true">⌕</span>
    <h4>Encuentra proveedores nuevos sin salir de aquí</h4>
    <p>Elige una categoría y una zona, y pulsa <b>Buscar</b>. Verás su dirección, su teléfono y las valoraciones que tienen, y podrás guardarlos en tu base con un clic.</p>
    <div class="bw-ejemplos">
      <span>Prueba con:</span>
      ${ejemplos.map((e) => `<button type="button" class="bw-chip-ejemplo" data-bw-ejemplo="${text(e)}">${text(e)}</button>`).join("")}
    </div>
  </div>`;
}

function estadoCargando() {
  return `<div class="bw-resultados" aria-busy="true">
    ${Array.from({ length: 4 }, () => `<div class="bw-card bw-esqueleto" aria-hidden="true">
      <div class="bw-card-cab"><span class="bw-logo"></span><div class="bw-card-id"><span class="bw-linea bw-linea-larga"></span><span class="bw-linea"></span></div></div>
      <span class="bw-linea bw-linea-media"></span>
      <span class="bw-linea bw-linea-corta"></span>
    </div>`).join("")}
  </div>`;
}

function estadoError() {
  const e = busqueda.error;
  // Cada motivo se arregla en un sitio distinto, así que cada motivo tiene su
  // frase. «Ha ocurrido un error» obliga a quien lo lee a adivinar.
  const guia = {
    sin_clave: "Falta conectar la clave de Google. Pide a quien administre la app que active la búsqueda de Google.",
    clave: "La clave de Google existe pero está rechazando las peticiones. Suele ser la facturación sin activar o una restricción de dominio.",
    sin_sesion: "Tu sesión ha caducado. Sal y vuelve a entrar, y se arregla.",
    red: "Parece cosa de la conexión. Los buscadores externos de aquí abajo siguen funcionando.",
  }[e.tipo];
  return `<div class="bw-error" role="alert">
    <strong>No hemos podido buscar</strong>
    <p>${text(e.mensaje)}</p>
    ${guia ? `<p class="bw-error-guia">${text(guia)}</p>` : ""}
    <button class="btn btn-xs" data-bw-buscar>Volver a intentarlo</button>
  </div>`;
}

function resultados() {
  if (busqueda.cargando && !busqueda.resultados.length) return estadoCargando();
  if (busqueda.error) return estadoError();
  if (!busqueda.buscada) return estadoVacio();
  if (!busqueda.resultados.length) {
    return `<div class="bw-vacio">
      <span class="bw-vacio-ico" aria-hidden="true">◌</span>
      <h4>Sin resultados para «${text(busqueda.buscada)}»</h4>
      <p>Prueba con una palabra más general o amplía la zona. Muchos proveedores de bodas no están dados de alta en Google: para esos, los buscadores de aquí abajo van mejor.</p>
    </div>`;
  }

  const lista = ordenar(busqueda.resultados);
  const nuevos = lista.filter((r) => !yaEnLaBase(r)).length;

  return `
    <div class="bw-res-cab">
      <p class="bw-res-cuenta">
        <strong>${lista.length}</strong> resultado${lista.length === 1 ? "" : "s"} para «${text(busqueda.buscada)}»
        · <strong>${nuevos}</strong> que todavía no tienes
        ${busqueda.desdeCache ? `<span class="bw-cache" title="Esta misma búsqueda ya se había hecho hace poco: se reutiliza el resultado y no se vuelve a pagar">↺ guardada</span>` : ""}
      </p>
      <label class="filter-field bw-orden">
        <span>Ordenar por</span>
        <select data-bw-orden>
          <option value="relevancia"${busqueda.orden === "relevancia" ? " selected" : ""}>Relevancia</option>
          <option value="nota"${busqueda.orden === "nota" ? " selected" : ""}>Mejor valorados</option>
          <option value="resenas"${busqueda.orden === "resenas" ? " selected" : ""}>Más reseñas</option>
        </select>
      </label>
    </div>
    <div class="bw-resultados">${lista.map(tarjeta).join("")}</div>
    ${
      busqueda.siguiente
        ? `<div class="bw-mas">
            <button class="btn" data-bw-mas ${busqueda.cargando ? "disabled" : ""}>
              ${busqueda.cargando ? "Buscando…" : "Ver más resultados"}
            </button>
          </div>`
        : ""
    }`;
}

/** Buscadores externos, por si lo que se busca no está en Google. */
function externos() {
  const cat = busqueda.categoria !== "Todas" ? busqueda.categoria : busqueda.consulta || "proveedores boda";
  const zon = busqueda.zona || "Barcelona";
  const q = encodeURIComponent(`${cat} bodas ${zon}`);
  const enlaces = [
    { label: "bodas.net", url: `https://www.bodas.net/busc/?q=${encodeURIComponent(`${cat} ${zon}`)}` },
    { label: "Instagram", url: `https://www.instagram.com/explore/tags/${encodeURIComponent(sinTildes(`${cat}${zon}`).replace(/[^a-z0-9]/g, ""))}/` },
    { label: "Google", url: `https://www.google.com/search?q=${q}` },
    { label: "Maps", url: `https://www.google.com/maps/search/${q}` },
  ];
  return `<div class="bw-externos">
    <span class="bw-externos-txt">¿No lo encuentras? Busca también en</span>
    ${enlaces.map((b) => `<a class="buscar-web-btn" href="${text(b.url)}" target="_blank" rel="noopener noreferrer">${text(b.label)} ↗</a>`).join("")}
  </div>`;
}

/**
 * El panel entero.
 * @param {"base"|"boda"} contexto Dónde se está pintando, que cambia el botón
 *        principal de cada tarjeta: guardar en la base o proponer a la pareja.
 */
function renderBuscadorWeb(contexto = "base") {
  busqueda.contexto = contexto;
  const zonas = zonasDisponibles();

  return `
    <section class="panel bw-panel">
      <div class="bw-cab">
        <div>
          <span class="eyebrow">Buscar fuera de tu base</span>
          <h3 class="card-title">Proveedores en la web</h3>
          <p class="card-sub">
            ${
              contexto === "boda"
                ? "Busca profesionales nuevos y proponlos directamente a esta pareja. Verás dónde están y qué valoración tienen antes de decidir."
                : "Busca profesionales que todavía no tienes fichados. Vienen con su dirección, su teléfono y las valoraciones que tienen en Google."
            }
          </p>
        </div>
        <button class="btn btn-xs bw-ayuda-btn" type="button" data-bw-ayuda
                aria-expanded="${busqueda.ayudaAbierta}" aria-controls="bw-ayuda">
          <span class="icon-btn">?</span> Cómo funciona
        </button>
      </div>

      ${ayuda()}

      <form class="bw-form" data-bw-form>
        <div class="search-wrap bw-search">
          <span class="search-icon">⌕</span>
          <input class="guest-search" data-bw-consulta value="${text(busqueda.consulta)}"
                 placeholder="Floristería, photobooth, catering vegano…"
                 aria-label="Qué proveedor buscas" />
        </div>
        <label class="filter-field">
          <span>Categoría</span>
          <select data-bw-categoria>
            ${["Todas", ...PROVIDER_TYPES].map((o) => `<option${o === busqueda.categoria ? " selected" : ""}>${text(o)}</option>`).join("")}
          </select>
        </label>
        <label class="filter-field">
          <span>Zona</span>
          <select data-bw-zona>
            <option value="">Cualquiera</option>
            ${zonas.map((o) => `<option${o === busqueda.zona ? " selected" : ""}>${text(o)}</option>`).join("")}
          </select>
        </label>
        <label class="filter-field">
          <span>Valoración</span>
          <select data-bw-nota>
            <option value="0"${busqueda.minValoracion === "0" ? " selected" : ""}>Todas</option>
            <option value="4"${busqueda.minValoracion === "4" ? " selected" : ""}>4,0 o más</option>
            <option value="4.5"${busqueda.minValoracion === "4.5" ? " selected" : ""}>4,5 o más</option>
          </select>
        </label>
        <button class="btn primary bw-buscar" type="submit" ${busqueda.cargando ? "disabled" : ""}>
          ${busqueda.cargando ? "Buscando…" : "Buscar"}
        </button>
      </form>

      <div class="bw-zona-resultados" aria-live="polite" aria-atomic="false">
        ${resultados()}
      </div>
      ${externos()}
    </section>
  `;
}

// ---------------------------------------------------------------------------
// Cableado
// ---------------------------------------------------------------------------
// Los campos NO repintan la pantalla al cambiar: se guardan en el objeto y ya.
// Repintar en cada tecla obligaría a devolver el foco y el cursor a mano —como
// pasa en los otros buscadores de la app— y aquí no hace falta, porque hasta
// que no se pulsa Buscar no cambia nada de lo que se ve.

function initBuscadorWeb() {
  const form = document.querySelector("[data-bw-form]");
  if (!form) return;

  const campo = document.querySelector("[data-bw-consulta]");
  campo?.addEventListener("input", (e) => { busqueda.consulta = e.target.value; });
  document.querySelector("[data-bw-categoria]")?.addEventListener("change", (e) => { busqueda.categoria = e.target.value; });
  document.querySelector("[data-bw-zona]")?.addEventListener("change", (e) => { busqueda.zona = e.target.value; });
  document.querySelector("[data-bw-nota]")?.addEventListener("change", (e) => { busqueda.minValoracion = e.target.value; });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    busqueda.siguiente = "";
    lanzarBusqueda();
  });

  document.querySelector("[data-bw-ayuda]")?.addEventListener("click", () => {
    busqueda.ayudaAbierta = !busqueda.ayudaAbierta;
    render();
  });

  document.querySelector("[data-bw-orden]")?.addEventListener("change", (e) => {
    busqueda.orden = e.target.value;
    render();
  });

  document.querySelector("[data-bw-buscar]")?.addEventListener("click", () => lanzarBusqueda());
  document.querySelector("[data-bw-mas]")?.addEventListener("click", () => lanzarBusqueda({ pagina: busqueda.siguiente }));

  document.querySelectorAll("[data-bw-ejemplo]").forEach((b) =>
    b.addEventListener("click", () => {
      busqueda.categoria = b.dataset.bwEjemplo;
      busqueda.consulta = "";
      lanzarBusqueda();
    })
  );

  document.querySelectorAll("[data-bw-anadir]").forEach((b) =>
    b.addEventListener("click", () => anadirALaBase(b.dataset.bwAnadir))
  );
  document.querySelectorAll("[data-bw-proponer]").forEach((b) =>
    b.addEventListener("click", () => proponerALaBoda(b.dataset.bwProponer))
  );
}

/** Para las pruebas y para poder precargar resultados sin llamar a Google. */
function _estadoBuscador() {
  return busqueda;
}

export { initBuscadorWeb, renderBuscadorWeb, _estadoBuscador };
