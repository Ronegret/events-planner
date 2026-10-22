import { icono } from "./iconos.js";
import { MANUAL_EQUIPO, MANUAL_NOVIOS } from "./manual.js";
import { render } from "./render.js";
import { saveState, state, text } from "./state.js";

// ============================================================================
// Asistente de ayuda
// ----------------------------------------------------------------------------
// Ayuda para el equipo, sin coste y sin servicios externos: toda la base de
// conocimiento vive en este archivo y la búsqueda se hace en el navegador.
// No es un chatbot de inteligencia artificial y no lo aparenta — es un manual
// que sabe encontrarse a sí mismo, que es lo que de verdad hace falta cuando
// alguien está montando un salón y no recuerda dónde estaba una opción.
//
// Cómo encuentra la respuesta: puntúa cada ficha por coincidencias de palabra
// en su título, sus etiquetas y su cuerpo, ignorando tildes y palabras vacías.
// Es sencillo, es instantáneo y funciona sin conexión.
// ============================================================================

// La base de conocimiento es la misma que el manual de la Guía. Se comparte
// a propósito: si el bot tuviera su propio texto, en tres meses diría cosas
// distintas a las del manual y el equipo dejaría de fiarse de los dos.
// El asistente sirve a dos públicos distintos con la misma máquina: dentro del
// portal responde con las fichas escritas para los novios, y en la app con las
// del equipo. Mezclarlas sería peor que no tenerlo: a una pareja no le sirve
// que le expliquen el modelo A/B del presupuesto.
const KB = MANUAL_EQUIPO;

function baseActual() {
  return state.portalMode ? MANUAL_NOVIOS : MANUAL_EQUIPO;
}

// Los atajos que se ofrecen antes de escribir nada: lo que más se pregunta,
// no las seis primeras fichas de la lista.
const SUGERENCIAS = ["crear-boda", "mesas", "tareas-rincon", "presupuesto", "contrato", "sin-cobertura"];
const SUGERENCIAS_NOVIOS = ["np-mesas", "np-invitados", "np-contrato", "np-pagos", "np-rincones", "np-dudas"];

const VACIAS = new Set([
  "como", "que", "para", "una", "uno", "unos", "unas", "los", "las", "del", "con", "por", "donde",
  "puedo", "puede", "hacer", "quiero", "necesito", "tengo", "hay", "esta", "este", "esto", "esa",
  "ese", "eso", "mas", "muy", "pero", "sus", "sin", "son", "soy", "les", "nos", "que", "cual",
  "cuando", "porque", "para", "desde", "hasta", "aqui", "alli", "the", "and", "how", "what",
]);

/**
 * Sinónimos y formas en que la gente pregunta de verdad.
 *
 * Nadie escribe "seating plan" cuando tiene prisa: escribe "sitting", "sentar"
 * o "quien va con quien". Sin esto, la búsqueda solo encuentra lo que ya sabes
 * cómo se llama — que es justo lo contrario de para lo que sirve un buscador.
 */
const SINONIMOS = {
  wasap: "whatsapp", wsp: "whatsapp", wapp: "whatsapp", guasap: "whatsapp",
  tlf: "telefono", movil: "telefono", celular: "telefono", numero: "telefono",
  sitting: "seating", sentar: "seating", sentados: "seating", mesa: "mesas",
  novia: "novios", novio: "novios", pareja: "novios", clientes: "novios",
  chuches: "chuches candy", chucherias: "chuches candy", golosinas: "chuches candy",
  precio: "presupuesto", coste: "presupuesto", costo: "presupuesto", gasto: "presupuesto",
  dinero: "presupuesto", euros: "presupuesto", factura: "presupuesto iva",
  imprimir: "pdf dossier", papel: "pdf dossier", descargar: "pdf dossier exportar",
  clave: "contraseña", password: "contraseña", pass: "contraseña", acceso: "entrar",
  borre: "borrar", borrado: "borrar", elimine: "borrar", perdi: "borrar recuperar",
  arreglar: "problema", falla: "problema", fallo: "problema", roto: "problema",
  internet: "offline conexion", cobertura: "offline conexion", wifi: "offline conexion",
  ayuda: "manual", tutorial: "manual", instrucciones: "manual", explicame: "manual",
  invitado: "invitados", alergico: "alergia", celiaco: "alergia gluten",
  comida: "menu", comidas: "menu", cena: "menu",
  foto: "fotos", fotografia: "fotos", imagenes: "fotos",
  copia: "backup", respaldo: "backup", seguridad: "backup",
};

function normaliza(s) {
  return String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/**
 * Distancia de edición acotada: sirve para que "presupeusto" encuentre
 * "presupuesto". Se corta en cuanto se pasa del máximo, que en palabras
 * cortas evita recorrer la matriz entera.
 */
function parecido(a, b, max = 2) {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let fila = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let anterior = fila[0];
    fila[0] = i;
    let mejor = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = fila[j];
      fila[j] = a[i - 1] === b[j - 1] ? anterior : Math.min(anterior, fila[j], fila[j - 1]) + 1;
      anterior = tmp;
      if (fila[j] < mejor) mejor = fila[j];
    }
    if (mejor > max) return max + 1;
  }
  return fila[b.length];
}

/** Trocea la consulta y la expande con sinónimos. */
function palabrasDe(consulta) {
  const base = normaliza(consulta)
    .split(/[^a-z0-9ñ]+/)
    .filter((w) => w.length > 2 && !VACIAS.has(w));
  const fuera = new Set(base);
  base.forEach((w) => {
    const syn = SINONIMOS[w];
    if (syn) syn.split(" ").forEach((x) => fuera.add(x));
  });
  return [...fuera];
}

/**
 * Busca en la base y devuelve las fichas más relevantes.
 *
 * Puntúa por dónde aparece cada palabra (etiqueta > título > resumen > cuerpo)
 * y admite errores de escritura de hasta dos letras. Si nada encaja bien,
 * devuelve lo más cercano igualmente: una respuesta aproximada es más útil
 * que un "no he encontrado nada" cuando alguien está montando un salón.
 */
function buscar(consulta) {
  const palabras = palabrasDe(consulta);
  if (!palabras.length) return [];

  const puntuadas = baseActual().map((ficha) => {
    const tags = ficha.tags.map(normaliza);
    const tokensTag = new Set(tags.join(" ").split(" ").filter(Boolean));
    const titulo = normaliza(ficha.title);
    const resumen = normaliza(ficha.resumen || "");
    const cuerpo = normaliza([...(ficha.steps || []), ficha.nota || ""].join(" "));

    let puntos = 0;
    palabras.forEach((w) => {
      if (tokensTag.has(w)) puntos += 12;
      else if (tags.some((t) => t.includes(w))) puntos += 7;
      else if ([...tokensTag].some((t) => parecido(t, w) <= (w.length > 6 ? 2 : 1))) puntos += 5;

      if (titulo.includes(w)) puntos += 6;
      if (resumen.includes(w)) puntos += 3;
      if (cuerpo.includes(w)) puntos += 1;
    });
    // Una ficha que cubre TODAS las palabras de la pregunta va antes que otra
    // que solo acierta una muy puntuada.
    const cubiertas = palabras.filter((w) => tokensTag.has(w) || titulo.includes(w) || cuerpo.includes(w)).length;
    puntos += cubiertas === palabras.length ? 8 : 0;
    return { ficha, puntos };
  }).sort((a, b) => b.puntos - a.puntos);

  const buenas = puntuadas.filter((r) => r.puntos >= 6);
  // Si no hay nada claro, se ofrece lo más cercano en vez de dejar a la
  // persona sin nada. Siempre es mejor una pista que un callejón sin salida.
  const elegidas = buenas.length ? buenas : puntuadas.filter((r) => r.puntos > 0);
  return elegidas.slice(0, 4).map((r) => r.ficha);
}

/** Anillos entrelazados: el símbolo de la marca, dibujado en SVG. */
function ringsIcon() {
  return `<svg class="asst-rings" viewBox="0 0 44 30" aria-hidden="true">
    <circle cx="16" cy="15" r="10.5" fill="none" stroke="currentColor" stroke-width="2.2" />
    <circle cx="28" cy="15" r="10.5" fill="none" stroke="currentColor" stroke-width="2.2" opacity="0.62" />
  </svg>`;
}

let onboardingStep = 0;

function onboardingKey() {
  if (state.portalMode) return `ep-onboarding-v1:portal:${state.user ? "equipo" : "novios"}`;
  return `ep-onboarding-v1:equipo:${state.user?.username || state.user?.name || "usuario"}`;
}

function onboardingSeen() {
  try {
    return localStorage.getItem(onboardingKey()) === "done";
  } catch {
    return false;
  }
}

function onboardingSteps() {
  if (state.portalMode) {
    return [
      {
        eyebrow: "Bienvenidos",
        title: "Vuestra boda, a vuestro ritmo",
        body: "Aquí podéis revisar invitados, mesas, proveedores y documentos cuando queráis. Todo en un solo sitio, sin perder mensajes ni versiones.",
      },
      {
        eyebrow: "Cambios compartidos",
        title: "Guardad al terminar",
        body: "Cuando una sección se pueda editar, veréis el botón para guardar. Al guardar, el equipo ve los cambios al momento.",
      },
      {
        eyebrow: "Estamos cerca",
        title: "Ayuda en cada sección",
        body: "Pulsad «Cómo funciona» o el botón de ayuda. Os lo explicamos en pocas líneas, y si os falta algo, el equipo está a un mensaje.",
      },
    ];
  }
  return [
    {
      eyebrow: "Primeros pasos",
      title: "Empieza por Inicio",
      body: "Ahí ves las próximas bodas, las tareas pendientes y lo que necesita atención. Es el mejor punto de partida de cada día.",
    },
    {
      eyebrow: "Trabajo ordenado",
      title: "Cada boda, su espacio",
      body: "En Bodas abre una pareja y trabaja por áreas: planificación, personas, producción, gestión y herramientas. Todo lo que hagas queda ligado a esa boda.",
    },
    {
      eyebrow: "Siempre disponible",
      title: "Pregunta al asistente",
      body: "El botón de ayuda siempre está a mano. Escribe lo que buscas y te lleva a la sección adecuada.",
    },
  ];
}

function renderOnboarding() {
  if ((!state.user && !state.portalMode) || onboardingSeen()) return "";
  // Con el portal aún cerrado no hay nada que guiar: la guía se pintaba encima
  // de la pantalla de contraseña y tapaba el botón «Entrar al portal», así que
  // una pareja que llegaba por su enlace no podía pasar de ahí.
  if (state.portalMode && !state.portalUnlocked && !state.user) return "";
  const steps = onboardingSteps();
  const current = steps[Math.min(onboardingStep, steps.length - 1)];
  const last = onboardingStep >= steps.length - 1;
  return `
    <div class="onboarding-layer">
      <section class="onboarding-card" role="dialog" aria-modal="true" aria-labelledby="onboarding-title" aria-describedby="onboarding-copy">
        <img src="./assets/brand/ep-logo.png?v=4" alt="Events Planner" />
        <span class="eyebrow">${text(current.eyebrow)}</span>
        <h2 id="onboarding-title">${text(current.title)}</h2>
        <p id="onboarding-copy">${text(current.body)}</p>
        <div class="onboarding-progress" role="img" aria-label="Paso ${onboardingStep + 1} de ${steps.length}">
          ${steps.map((_, index) => `<i class="${index === onboardingStep ? "active" : ""}"></i>`).join("")}
        </div>
        <div class="onboarding-actions">
          <button class="link-btn" type="button" data-onboarding-skip>Omitir guía</button>
          <button class="btn primary" type="button" data-onboarding-next>${last ? "Empezar" : "Siguiente"}</button>
        </div>
      </section>
    </div>
  `;
}

function completeOnboarding() {
  try {
    localStorage.setItem(onboardingKey(), "done");
  } catch {
    // La guía sigue siendo utilizable aunque el navegador bloquee el almacenamiento.
  }
  onboardingStep = 0;
  render();
}

function initOnboarding() {
  const layer = document.querySelector(".onboarding-layer");
  const next = document.querySelector("[data-onboarding-next]");
  document.querySelector("[data-onboarding-skip]")?.addEventListener("click", completeOnboarding);
  next?.addEventListener("click", () => {
    const last = onboardingStep >= onboardingSteps().length - 1;
    if (last) completeOnboarding();
    else {
      onboardingStep += 1;
      render();
    }
  });
  layer?.addEventListener("keydown", (event) => {
    if (event.key === "Escape") completeOnboarding();
  });
  next?.focus();
}

function renderAssistant() {
  // Solo para el equipo: los novios tienen su propia ayuda por sección.
  // En el portal también hay asistente: es donde más falta hace, porque los
  // novios no han usado esto nunca. Cambia la base de conocimiento y el tono,
  // no el mecanismo.
  if (!state.user && !state.portalMode) return "";
  const abierto = state.assistantOpen;
  const consulta = state.assistantQuery || "";
  const resultados = consulta ? buscar(consulta) : [];

  return `
    <div class="asst${abierto ? " open" : ""}">
      ${
        abierto
          ? `
        <section class="asst-panel" id="asst-panel" role="dialog" aria-label="Asistente de ayuda">
          <header class="asst-head">
            <span class="asst-avatar">${ringsIcon()}</span>
            <div>
              <strong>${state.portalMode ? "¿Os echamos una mano?" : "Asistente"}</strong>
              <small>${state.portalMode ? "Preguntad lo que sea, sin vergüenza" : "Aquí para echarte una mano"}</small>
            </div>
            <button class="asst-close" data-asst-close aria-label="Cerrar asistente">${icono("cerrar")}</button>
          </header>

          <div class="asst-body">
            ${
              consulta
                ? resultados.length
                  ? resultados.map(renderFicha).join("")
                  : `<div class="asst-empty">
                      <p>No encuentro nada sobre <b>${text(consulta)}</b>.</p>
                      <p>Prueba a decirlo de otra forma, o mira el manual completo:</p>
                      ${
                        state.portalMode
                          ? `<p>Si no lo encontráis, escribid al equipo por WhatsApp al (+34) 653 567 610. Preguntar nunca molesta.</p>`
                          : `<div class="asst-chips"><button class="asst-chip" data-asst-goto="guide">Abrir la Guía</button></div>`
                      }
                    </div>`
                : `<p class="asst-intro">${state.portalMode ? "¿En qué os echamos una mano? Escribid lo que necesitéis o elegid uno de estos:" : "¿En qué te echo una mano? Escribe lo que necesitas o elige uno de estos:"}</p>
                   <div class="asst-chips">
                     ${(state.portalMode ? SUGERENCIAS_NOVIOS : SUGERENCIAS).map((id) => baseActual().find((f) => f.id === id)).filter(Boolean).map((f) => `<button class="asst-chip" data-asst-topic="${f.id}">${text(f.title)}</button>`).join("")}
                   </div>`
            }
          </div>

          <div class="asst-search">
            <input data-asst-input value="${text(consulta)}" placeholder="${state.portalMode ? '¿Cómo pongo a la gente en las mesas?' : 'Pregunta lo que sea: ¿cómo pongo las mesas?'}" aria-label="Buscar ayuda" />
            ${consulta ? `<button class="asst-clear" data-asst-clear aria-label="Limpiar">${icono("cerrar")}</button>` : ""}
          </div>
        </section>`
          : ""
      }

      <button class="asst-fab" data-asst-toggle aria-expanded="${abierto}" aria-controls="asst-panel"
        aria-label="${abierto ? "Cerrar ayuda" : "Abrir ayuda"}" title="${state.portalMode ? "¿Necesitáis ayuda?" : "¿Necesitas ayuda?"}">
        ${abierto ? `<span class="asst-fab-x">${icono("cerrar")}</span>` : ringsIcon()}
      </button>
    </div>
  `;
}

function renderFicha(ficha) {
  return `
    <article class="asst-card">
      <h4>${text(ficha.title)}</h4>
      ${ficha.resumen ? `<p class="asst-resumen">${text(ficha.resumen)}</p>` : ""}
      <ol>${ficha.steps.map((s) => `<li>${s}</li>`).join("")}</ol>
      ${ficha.nota ? `<p class="asst-nota"><b>Ojo:</b> ${text(ficha.nota)}</p>` : ""}
      ${ficha.ir && !state.portalMode ? `<button class="asst-ir" data-asst-goto="${ficha.ir[0]}">${text(ficha.ir[1])} →</button>` : ""}
    </article>
  `;
}

function initAssistant() {
  // Escape cierra el asistente y devuelve el foco a su botón.
  document.querySelector(".asst")?.addEventListener("keydown", (e) => {
    if (e.key !== "Escape" || !state.assistantOpen) return;
    state.assistantOpen = false;
    state.assistantQuery = "";
    saveState();
    render();
    document.querySelector("[data-asst-toggle]")?.focus();
  });

  document.querySelector("[data-asst-toggle]")?.addEventListener("click", () => {
    state.assistantOpen = !state.assistantOpen;
    if (!state.assistantOpen) state.assistantQuery = "";
    saveState();
    render();
    document.querySelector("[data-asst-input]")?.focus();
  });

  document.querySelector("[data-asst-close]")?.addEventListener("click", () => {
    state.assistantOpen = false;
    state.assistantQuery = "";
    saveState();
    render();
  });

  document.querySelector("[data-asst-clear]")?.addEventListener("click", () => {
    state.assistantQuery = "";
    saveState();
    render();
    document.querySelector("[data-asst-input]")?.focus();
  });

  // "Llévame ahí": el asistente no solo explica, también lleva.
  document.querySelectorAll("[data-asst-goto]").forEach((button) =>
    button.addEventListener("click", () => {
      state.assistantOpen = false;
      state.view = button.dataset.asstGoto;
      saveState();
      render();
      window.scrollTo({ top: 0, behavior: "smooth" });
    })
  );

  document.querySelectorAll("[data-asst-topic]").forEach((button) =>
    button.addEventListener("click", () => {
      const ficha = baseActual().find((f) => f.id === button.dataset.asstTopic);
      state.assistantQuery = ficha ? ficha.title : "";
      saveState();
      render();
    })
  );

  const input = document.querySelector("[data-asst-input]");
  input?.addEventListener("input", (event) => {
    state.assistantQuery = event.target.value;
    const caret = event.target.selectionStart;
    saveState();
    render();
    // Devolver el foco y el cursor: sin esto se pierde en cada tecla.
    const next = document.querySelector("[data-asst-input]");
    if (next) {
      next.focus();
      next.setSelectionRange(caret, caret);
    }
  });
}

export { KB, buscar, initAssistant, initOnboarding, renderAssistant, renderOnboarding };
