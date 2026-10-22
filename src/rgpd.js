import { addActivity } from "./modals.js";
import { render } from "./render.js";
import { byWeddingId, formatDate, replaceState, saveState, state, text, toast } from "./state.js";

// ============================================================================
// Cumplimiento RGPD / LOPDGDD — parte operativa
// ----------------------------------------------------------------------------
// El panel informativo de Ajustes explica la normativa. Esto es lo que la hace
// cumplible en el día a día:
//
//   1. Aviso de tratamiento la primera vez que se entra (equipo y novios).
//   2. Alerta cuando hay alergias registradas sin consentimiento del invitado.
//   3. Registro de Actividades de Tratamiento (art. 30), descargable.
//   4. Portabilidad (art. 20): la pareja se descarga todos sus datos.
//
// Datos del responsable. En la version real salen de la politica de privacidad
// publicada por la empresa; aqui son de demostracion (ver abajo).
// el responsable figura en la política de privacidad.
// ============================================================================

// DATOS DE DEMOSTRACIÓN. En la versión real aquí van la razón social, el
// domicilio y los contactos de verdad del responsable del tratamiento. En una
// versión publicada no tiene sentido: no hay datos personales que tratar, y
// dejar una dirección y un teléfono reales solo sirve para que alguien los use.
const RESPONSABLE = {
  razonSocial: "Estudio Demo S.L.",
  marca: "Events Planner · Wedding + Events",
  domicilio: "C/ Ejemplo 1 · 08000 Barcelona",
  ejercicioDerechos: "C/ Ejemplo 1 · 08000 Barcelona",
  email: "rodrigo.negrete.aros@gmail.com",
  telefono: "+34 653 567 610",
  politica: "https://www.example.com/politica-de-privacidad",
};

const CONSENT_KEY = "events-planner::aviso-tratamiento";

/** ¿Ya se mostró el aviso de tratamiento a este usuario en este navegador? */
function avisoAceptado() {
  try {
    return localStorage.getItem(CONSENT_KEY) === "1";
  } catch {
    return true;
  }
}

function aceptarAviso() {
  try {
    localStorage.setItem(CONSENT_KEY, "1");
  } catch {
    /* navegación privada: se volverá a mostrar, que es lo correcto */
  }
  render();
}

/**
 * Aviso de tratamiento. No es un banner de cookies: Events Planner no pone
 * cookies de terceros ni analítica, solo almacenamiento local imprescindible
 * para que la app funcione — eso no requiere consentimiento previo (art. 22.2
 * LSSI). Lo que sí exige el art. 13 RGPD es informar de qué se trata y por
 * qué, y eso es exactamente lo que hace este aviso.
 */
function renderAvisoTratamiento() {
  if (avisoAceptado()) return "";
  // Con el portal cerrado, este aviso se pintaba ENCIMA del formulario de
  // contraseña y lo tapaba entero (medido: aviso 426-844, formulario 387-710).
  // Además de estorbar, llegaba a destiempo: informa de cómo se tratan los
  // datos de SU boda, y todavía no han podido entrar a verla. Se muestra en
  // cuanto están dentro.
  if (state.portalMode && !state.portalUnlocked && !state.user) return "";
  const paraNovios = state.portalMode;
  return `
    <div class="rgpd-aviso" role="dialog" aria-labelledby="rgpd-aviso-t" aria-modal="false">
      <div class="rgpd-aviso-body">
        <h2 id="rgpd-aviso-t">Cómo cuidamos los datos</h2>
        <p>
          ${
            paraNovios
              ? `Este portal guarda los datos de vuestra boda —invitados, mesas, menús y documentos— para poder organizarla. El responsable es <strong>${text(RESPONSABLE.razonSocial)}</strong>, y la base legal es el contrato de servicios que habéis firmado.`
              : `Esta herramienta guarda datos personales de parejas, invitados y proveedores para organizar cada boda. El responsable del tratamiento es <strong>${text(RESPONSABLE.razonSocial)}</strong>`
          }
        </p>
        <p class="rgpd-aviso-sub">
          No hay cookies de terceros ni analítica: la información se guarda en este navegador y, si está configurado, en la base de datos del equipo. Esta es una versión de demostración: los datos del responsable son de ejemplo y no sustituyen asesoramiento legal.
          ${paraNovios ? "Podéis pedir acceso, rectificación o supresión cuando queráis." : "Las alergias de los invitados son datos de salud y solo pueden registrarse con su permiso."}
        </p>
        <div class="actions" style="justify-content:flex-start">
          <button class="btn primary" data-aceptar-aviso="1">Entendido</button>
          <a class="btn btn-outline" href="${RESPONSABLE.politica}" target="_blank" rel="noopener noreferrer">Leer la política ↗</a>
        </div>
      </div>
    </div>
  `;
}

// ---------------------------------------------------------------------------
// Alergias sin consentimiento
// ---------------------------------------------------------------------------
/** Invitados con alergia anotada y sin permiso registrado del propio invitado. */
function alergiasSinConsentimiento(weddingId) {
  return byWeddingId("guests", weddingId).filter(
    (g) => String(g.allergy || "").trim() && !/^Sí/i.test(String(g.consentimientoSalud || ""))
  );
}

/** Invitados que se han opuesto: su alergia no debe salir en ningún listado. */
function alergiasBloqueadas(weddingId) {
  return byWeddingId("guests", weddingId).filter((g) => /se opone/i.test(String(g.consentimientoSalud || "")));
}

/**
 * Aviso dentro de la pestaña Mesas. Deliberadamente no bloquea: si un invitado
 * llama la víspera diciendo que es celíaco, el equipo tiene que poder anotarlo
 * en ese momento. Lo que hace es dejar constancia de que falta el permiso y
 * recordarlo hasta que se regularice.
 */
function renderAvisoAlergias(weddingId) {
  const sin = alergiasSinConsentimiento(weddingId);
  const opuestos = alergiasBloqueadas(weddingId);
  if (!sin.length && !opuestos.length) return "";
  return `
    <div class="rgpd-alerta" role="status">
      <span class="rgpd-alerta-ico">⚠</span>
      <div>
        ${
          sin.length
            ? `<strong>${sin.length} alergia${sin.length === 1 ? "" : "s"} sin consentimiento del invitado</strong>
               <p>Una alergia es un dato de salud (art. 9 RGPD) y el permiso lo tiene que dar la persona, no la pareja. Pendientes: ${sin.slice(0, 6).map((g) => text(g.name)).join(", ")}${sin.length > 6 ? "…" : ""}. Abre la ficha del invitado y anota cómo lo dio.</p>`
            : ""
        }
        ${
          opuestos.length
            ? `<p class="rgpd-alerta-bloqueo"><strong>${opuestos.length} invitado${opuestos.length === 1 ? " se ha opuesto" : "s se han opuesto"}</strong>: su alergia no se incluye en el dossier ni en las hojas de cocina.</p>`
            : ""
        }
      </div>
    </div>
  `;
}

/**
 * Alergias que SÍ pueden salir en documentos que se entregan a terceros
 * (catering, sala). Quien se ha opuesto queda fuera — de nada sirve pedir el
 * consentimiento si luego el dossier lo ignora.
 */
function alergiasPublicables(weddingId) {
  return byWeddingId("guests", weddingId).filter(
    (g) => String(g.allergy || "").trim() && !/se opone/i.test(String(g.consentimientoSalud || ""))
  );
}

// ---------------------------------------------------------------------------
// Registro de Actividades de Tratamiento (art. 30 RGPD)
// ---------------------------------------------------------------------------
const TRATAMIENTOS = [
  {
    nombre: "Gestión de clientes (parejas)",
    categorias: "Identificativos, contacto, datos económicos del servicio",
    base: "Ejecución del contrato (art. 6.1.b)",
    plazo: "Duración de la relación + plazos de prescripción legal",
    destinatarios: "Proveedores estrictamente necesarios para la prestación",
  },
  {
    nombre: "Gestión de invitados",
    categorias: "Nombre, grupo, confirmación de asistencia, menú",
    base: "Interés legítimo del responsable y de la pareja (art. 6.1.f)",
    plazo: "Hasta 12 meses después de la celebración",
    destinatarios: "Catering y espacio, solo lo imprescindible",
  },
  {
    nombre: "Alergias e intolerancias",
    categorias: "Datos de salud — categoría especial (art. 9)",
    base: "Consentimiento explícito del invitado (art. 9.2.a)",
    plazo: "Se suprime tras la celebración",
    destinatarios: "Exclusivamente catering y servicio de sala",
  },
  {
    nombre: "Gestión de proveedores",
    categorias: "Contacto profesional, datos de facturación",
    base: "Ejecución del contrato y obligación legal fiscal",
    plazo: "6 años (art. 30 Código de Comercio)",
    destinatarios: "Asesoría fiscal y Administración tributaria",
  },
  {
    nombre: "Imágenes de la boda",
    categorias: "Imagen de las personas asistentes",
    base: "Consentimiento (cláusula duodécima del contrato)",
    plazo: "Hasta la retirada del consentimiento",
    destinatarios: "Web y redes sociales de la marca",
  },
];

function renderRegistroTratamiento() {
  return `
    <section class="panel" style="margin-top:18px">
      <div class="section-title compact">
        <div>
          <h3 class="card-title">Registro de actividades de tratamiento</h3>
          <p class="card-sub">Obligatorio según el art. 30 del RGPD. Es lo que hay que enseñar si la AEPD lo pide. En esta versión de demostración los datos son de ejemplo.</p>
        </div>
        <button class="btn" data-descargar-rat="1">↓ Descargar</button>
      </div>
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr><th>Tratamiento</th><th>Categorías de datos</th><th>Base jurídica</th><th>Conservación</th><th>Destinatarios</th></tr>
          </thead>
          <tbody>
            ${TRATAMIENTOS.map(
              (t) => `<tr>
                <td><strong>${text(t.nombre)}</strong></td>
                <td>${text(t.categorias)}</td>
                <td>${text(t.base)}</td>
                <td>${text(t.plazo)}</td>
                <td>${text(t.destinatarios)}</td>
              </tr>`
            ).join("")}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function descargarRegistroTratamiento() {
  const filas = TRATAMIENTOS.map((t) => [t.nombre, t.categorias, t.base, t.plazo, t.destinatarios]);
  const csv = [
    ["REGISTRO DE ACTIVIDADES DE TRATAMIENTO — art. 30 RGPD"],
    [`Responsable: ${RESPONSABLE.razonSocial} (${RESPONSABLE.marca})`],
    [`Domicilio: ${RESPONSABLE.domicilio}`],
    [`Ejercicio de derechos: ${RESPONSABLE.ejercicioDerechos} · ${RESPONSABLE.email}`],
    [`Generado el ${new Date().toLocaleDateString("es-ES")}`],
    [],
    ["Tratamiento", "Categorías de datos", "Base jurídica", "Conservación", "Destinatarios"],
    ...filas,
  ]
    .map((fila) => fila.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";"))
    .join("\n");

  descargar(`registro-tratamiento-${new Date().toISOString().slice(0, 10)}.csv`, "﻿" + csv, "text/csv;charset=utf-8");
  toast("Registro de tratamiento descargado.");
}

// ---------------------------------------------------------------------------
// Portabilidad y acceso (arts. 15 y 20)
// ---------------------------------------------------------------------------
/**
 * La pareja se descarga todo lo suyo en un JSON legible por máquina, que es
 * literalmente lo que pide el art. 20. Sin tener que escribir un correo y
 * esperar un mes.
 */
function exportarDatosPareja(weddingId) {
  const wedding = state.weddings.find((w) => w.id === weddingId);
  if (!wedding) return;

  const paquete = {
    generado: new Date().toISOString(),
    responsable: RESPONSABLE,
    derecho: "Portabilidad y acceso (arts. 15 y 20 del Reglamento (UE) 2016/679)",
    boda: wedding,
    invitados: byWeddingId("guests", weddingId),
    mesas: byWeddingId("tables", weddingId),
    timeline: byWeddingId("timeline", weddingId),
    servicios: byWeddingId("services", weddingId),
    presupuesto: byWeddingId("budget", weddingId),
    pagos: byWeddingId("payments", weddingId),
    documentos: byWeddingId("documents", weddingId).map(({ attachment, ...resto }) => resto),
    rincones: byWeddingId("rincones", weddingId),
    musica: byWeddingId("music", weddingId),
    transportes: byWeddingId("transports", weddingId),
  };

  descargar(
    `datos-boda-${String(wedding.couple || "boda").toLowerCase().replace(/[^a-z0-9]+/g, "-")}.json`,
    JSON.stringify(paquete, null, 2),
    "application/json"
  );
  addActivity("Descargó todos los datos de la boda (derecho de portabilidad)", state.portalMode ? wedding.couple : state.user?.name, weddingId);
  saveState();
  toast("Datos descargados. Es una copia completa y legible de todo lo vuestro.", 5000);
}

/** Bloque de derechos dentro del portal de novios. */
function renderDerechosPortal(wedding) {
  return `
    <section class="panel rgpd-derechos">
      <div class="panel-head">
        <div>
          <h3 class="card-title">Vuestros datos</h3>
          <p class="card-sub">Todo lo que guardamos de vuestra boda es vuestro, y podéis llevároslo cuando queráis.</p>
        </div>
      </div>
      <p>Los trata <strong>${text(RESPONSABLE.razonSocial)}</strong> para organizar la boda, según el contrato que hemos firmado. No los cedemos a nadie que no haga falta para el evento.</p>
      <p class="card-sub">Tenéis derecho a acceder a ellos, corregirlos, llevároslos a otro sitio, limitar su uso o pedir que los borremos. El botón de abajo os descarga una copia completa al momento; para lo demás escribid a ${text(RESPONSABLE.email)} o a ${text(RESPONSABLE.ejercicioDerechos)}.</p>
      <div class="actions" style="justify-content:flex-start;margin-top:14px">
        <button class="btn primary" data-exportar-datos="${wedding.id}">↓ Descargar todos nuestros datos</button>
        <a class="btn btn-outline" href="${RESPONSABLE.politica}" target="_blank" rel="noopener noreferrer">Política de privacidad ↗</a>
      </div>
    </section>
  `;
}


// ---------------------------------------------------------------------------
// Copia de seguridad completa
// ---------------------------------------------------------------------------
// Supabase hace sus propias copias, pero una copia que solo existe dentro del
// mismo servicio no es una copia: si se pierde el acceso a la cuenta, se
// pierde todo a la vez. Esto baja un archivo que el equipo guarda donde quiera.
// Las contraseñas no se incluyen — ni las del equipo ni las de los portales.

function descargarCopiaSeguridad() {
  const { users, weddings, ...resto } = state;
  const copia = {
    formato: "events-planner-backup",
    version: 1,
    generado: new Date().toISOString(),
    generadoPor: state.user?.name || "",
    datos: {
      ...resto,
      user: null,
      modal: null,
      users: users.map(({ password, passwordHash, ...u }) => u),
      weddings: weddings.map(({ portalPassword, portalPasswordHash, ...w }) => w),
    },
  };
  descargar(`events-planner-copia-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(copia), "application/json");
  toast("Copia descargada. Guárdala fuera del ordenador: en Drive, un disco externo o el correo.", 6000);
}

/**
 * Restaurar pide el archivo y avisa de lo que va a pasar. No hay confirmación
 * doble porque el flujo ya es deliberado (hay que elegir un archivo a mano),
 * pero sí se descarga antes una copia del estado actual: si alguien restaura
 * el archivo equivocado, no se queda sin nada.
 */
function abrirRestaurarCopia() {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "application/json,.json";
  input.addEventListener("change", async () => {
    const file = input.files?.[0];
    if (!file) return;
    try {
      const texto = await file.text();
      const copia = JSON.parse(texto);
      if (copia?.formato !== "events-planner-backup" || !copia.datos) {
        toast("Ese archivo no es una copia de Events Planner. Elige una copia descargada desde aquí.");
        return;
      }
      descargarCopiaSeguridad(); // red de seguridad antes de sustituir nada
      replaceState(copia.datos);
      toast(`Copia del ${new Date(copia.generado).toLocaleDateString("es-ES")} restaurada. Se ha descargado antes el estado anterior.`, 8000);
    } catch {
      toast("No hemos podido leer el archivo. Comprueba que es la copia completa y vuelve a probar.");
    }
  });
  input.click();
}

function descargar(nombre, contenido, tipo) {
  const blob = new Blob([contenido], { type: tipo });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nombre;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export {
  abrirRestaurarCopia,
  descargarCopiaSeguridad,
  RESPONSABLE,
  TRATAMIENTOS,
  aceptarAviso,
  alergiasBloqueadas,
  alergiasPublicables,
  alergiasSinConsentimiento,
  avisoAceptado,
  descargarRegistroTratamiento,
  exportarDatosPareja,
  renderAvisoAlergias,
  renderAvisoTratamiento,
  renderDerechosPortal,
  renderRegistroTratamiento,
};
