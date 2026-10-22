import { addActivity } from "./modals.js";
import { render } from "./render.js";
import { PROVIDER_TYPES, saveState, state, text, toast, uid } from "./state.js";

// ============================================================================
// Importar proveedores en bloque
// ----------------------------------------------------------------------------
// La base de proveedores de una wedding planner no se construye a mano ficha a
// ficha: ya existe repartida entre los favoritos de bodas.net, la agenda del
// móvil, las facturas del año pasado y un Excel. Esto convierte cualquiera de
// esas listas en fichas, de una vez.
//
// Acepta lo que la gente pega de verdad, no un formato ideal:
//   · Copiado de Excel o Google Sheets (columnas separadas por tabulador)
//   · CSV con coma o punto y coma
//   · Texto suelto: "Floristería Serrat, Girona, 972 123 456, @florsdelserrat"
//
// Reconoce los campos por su forma, no por su posición: lo que lleva @ y punto
// es un email, lo que empieza por @ es Instagram, lo que tiene 9 dígitos es un
// teléfono. Así da igual el orden en que estén las columnas — que es justo lo
// que falla en los importadores que piden "columna 1: nombre, columna 2: tel".
// ============================================================================

/** Zonas habituales de trabajo, para sugerir al reconocer. */
const ZONAS = [
  "Barcelona", "Barcelonès", "Maresme", "Vallès Occidental", "Vallès Oriental",
  "Baix Llobregat", "Garraf", "Penedès", "Girona", "Costa Brava", "Empordà",
  "La Selva", "Osona", "Tarragona", "Lleida", "Otra",
];

const RE_EMAIL = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;
const RE_IG = /^@[\w.]+$/;
const RE_WEB = /^(https?:\/\/|www\.)|\.(com|es|cat|net|org|eu)(\/|$)/i;
const RE_TEL = /^[+()\d][\d\s().+-]{7,}$/;

/** Reparte una fila en campos según la forma de cada trozo. */
function reconocerFila(trozos) {
  const p = { name: "", type: "", contact: "", phone: "", email: "", instagram: "", web: "", zone: "", notes: "" };
  const sobrantes = [];

  trozos.forEach((bruto) => {
    const v = String(bruto || "").trim();
    if (!v) return;

    if (!p.email && RE_EMAIL.test(v)) return void (p.email = v);
    if (!p.instagram && RE_IG.test(v)) return void (p.instagram = v);
    if (!p.phone && RE_TEL.test(v) && (v.replace(/\D/g, "").length >= 9)) return void (p.phone = v);
    if (!p.web && RE_WEB.test(v) && !RE_EMAIL.test(v)) return void (p.web = v);

    // Categoría: se acepta si coincide con una de las nuestras, aunque venga
    // sin tildes o en minúsculas.
    const cat = PROVIDER_TYPES.find((t) => sinTildes(t) === sinTildes(v));
    if (!p.type && cat) return void (p.type = cat);

    const zona = ZONAS.find((z) => sinTildes(z) === sinTildes(v));
    if (!p.zone && zona) return void (p.zone = zona);

    sobrantes.push(v);
  });

  // El primer sobrante es el nombre; el resto, notas.
  p.name = sobrantes.shift() || "";
  if (sobrantes.length) p.notes = sobrantes.join(" · ");
  return p;
}

function sinTildes(v) {
  return String(v || "").toLowerCase().trim().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

/**
 * Trocea el texto pegado. Se elige el separador por línea, no global: en una
 * misma lista puede haber filas de Excel (tabuladores) y filas escritas a
 * mano (comas).
 */
function analizarTexto(texto) {
  return String(texto || "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .filter((l) => !/^(nombre|name|proveedor)\s*[;,\t]/i.test(l)) // cabecera de Excel
    .map((linea) => {
      const sep = linea.includes("\t") ? "\t" : linea.includes(";") ? ";" : ",";
      return reconocerFila(linea.split(sep));
    })
    .filter((p) => p.name);
}

// ---------------------------------------------------------------------------
// Pantalla
// ---------------------------------------------------------------------------
function abrirImportador() {
  state.importTexto = state.importTexto || "";
  state.view = "importar";
  saveState();
  render();
}

function cerrarImportador() {
  state.view = "providers";
  state.importTexto = "";
  saveState();
  render();
}

function actualizarImportTexto(valor) {
  state.importTexto = valor;
}

/** Nombres que ya existen: no se duplican, se avisa. */
function yaExiste(nombre) {
  const n = sinTildes(nombre);
  return state.providers.some((p) => sinTildes(p.name) === n);
}

function confirmarImportacion() {
  const filas = analizarTexto(state.importTexto);
  const nuevas = filas.filter((p) => !yaExiste(p.name));
  if (!nuevas.length) {
    toast(filas.length ? "Todos esos proveedores ya estaban en tu base." : "No hemos reconocido ningún proveedor en ese texto. Prueba con una línea por proveedor.");
    return;
  }

  nuevas.forEach((p) => {
    state.providers.push({
      id: uid("p"),
      weddingId: "",
      name: p.name,
      type: p.type || "Otros",
      contact: p.contact,
      phone: p.phone,
      email: p.email,
      instagram: p.instagram,
      web: p.web,
      zone: p.zone,
      status: "Pendiente",
      notes: p.notes,
      createdAt: new Date().toISOString(),
    });
  });

  addActivity(`Importó ${nuevas.length} proveedor${nuevas.length === 1 ? "" : "es"} a la base`, state.user?.name);
  state.importTexto = "";
  state.view = "providers";
  saveState();
  render();
  toast(`${nuevas.length} proveedores añadidos${filas.length - nuevas.length ? ` · ${filas.length - nuevas.length} ya estaban` : ""}`, 6000);
}

// Aquí vivían las «búsquedas preparadas»: cuatro enlaces que abrían Google,
// bodas.net, Instagram y Maps con la consulta ya escrita. Se han quedado sin
// sitio porque el buscador de proveedores en la web (src/buscador-proveedores.js)
// hace ese trabajo dentro de la aplicación y los mismos cuatro enlaces siguen
// ahí, al final de su panel, como plan B.

function renderImportador() {
  const filas = analizarTexto(state.importTexto || "");
  const nuevas = filas.filter((p) => !yaExiste(p.name));
  const repetidas = filas.length - nuevas.length;

  return `
    <nav class="volver-nav">
      <button class="link-btn" data-cerrar-import>← Volver a Proveedores</button>
    </nav>

    <section class="panel">
      <div class="section-title">
        <div>
          <h3>Importar proveedores</h3>
          <p>Pega aquí tu lista y se convierte en fichas. Vale copiado de Excel, un CSV o texto escrito a mano.</p>
        </div>
      </div>

      <div class="import-ayuda">
        <p><b>No hace falta ningún formato concreto.</b> Cada dato se reconoce por su forma: lo que lleva arroba y punto es un email, lo que empieza por @ es Instagram, lo que tiene nueve dígitos es un teléfono. Da igual el orden de las columnas.</p>
        <pre class="import-ejemplo">Flores del Ejemplo, Floristería, Girona, 600 000 123, @floresejemplo
Estudio Ejemplo; Fotografía; Barcelona; hola@example.com; www.example.com/estudio
Música Ejemplo	Música / DJ	Maresme	@musicaejemplo</pre>
      </div>

      <div class="field field-wide">
        <label for="import-texto">Tu lista</label>
        <textarea id="import-texto" data-import-texto rows="10" placeholder="Pega aquí una línea por proveedor…">${text(state.importTexto || "")}</textarea>
      </div>

      ${
        filas.length
          ? `<div class="import-previo">
              <h4>Se van a añadir ${nuevas.length} proveedor${nuevas.length === 1 ? "" : "es"}${repetidas ? ` · ${repetidas} ya estaban en la base y se omiten` : ""}</h4>
              <div class="table-wrap">
                <table class="data-table">
                  <thead><tr><th>Nombre</th><th>Categoría</th><th>Zona</th><th>Teléfono</th><th>Email</th><th>Instagram</th></tr></thead>
                  <tbody>
                    ${filas
                      .slice(0, 40)
                      .map(
                        (p) => `<tr class="${yaExiste(p.name) ? "fila-repetida" : ""}">
                          <td><strong>${text(p.name)}</strong>${yaExiste(p.name) ? ` <span class="pill">ya existe</span>` : ""}</td>
                          <td>${text(p.type || "Otros")}</td>
                          <td>${text(p.zone || "—")}</td>
                          <td>${text(p.phone || "—")}</td>
                          <td>${text(p.email || "—")}</td>
                          <td>${text(p.instagram || "—")}</td>
                        </tr>`
                      )
                      .join("")}
                  </tbody>
                </table>
              </div>
              ${filas.length > 40 ? `<p class="card-sub">Se muestran las 40 primeras; se importarán todas.</p>` : ""}
              <div class="actions" style="justify-content:flex-start;margin-top:16px">
                <button class="btn primary" data-confirmar-import ${nuevas.length ? "" : "disabled"}>Añadir ${nuevas.length} a la base</button>
                <button class="btn" data-cerrar-import>Cancelar</button>
              </div>
            </div>`
          : `<p class="card-sub" style="margin-top:14px">Pega tu lista y verás aquí abajo cómo quedará, antes de guardar nada.</p>`
      }
    </section>

    <section class="panel" style="margin-top:18px">
      <div class="section-title">
        <div>
          <h3>¿De dónde saco los datos?</h3>
          <p>Estas son las fuentes que de verdad tienen teléfonos correctos y actualizados.</p>
        </div>
      </div>
      <ul class="import-fuentes">
        <li><b>Tus propios contactos.</b> Los proveedores con los que ya has trabajado son los mejores datos que existen: están probados y el número es el bueno. Exporta los contactos del móvil o repasa las facturas del año pasado.</li>
        <li><b>bodas.net.</b> En tu perfil profesional tienes los proveedores con los que has coincidido. Cada ficha lleva teléfono y web publicados por el propio proveedor.</li>
        <li><b>Instagram.</b> Casi todos los proveedores de boda tienen su usuario como canal principal. El botón de mensaje de cada ficha te lleva directo a su perfil.</li>
        <li><b>La web del proveedor.</b> Es la única fuente que el propio proveedor mantiene al día. Un teléfono copiado de un directorio viejo es peor que no tener ninguno.</li>
      </ul>
      <p class="import-aviso">Los datos de contacto profesional son datos personales: se guardan para trabajar con esa empresa, no para hacer envíos masivos. Si alguien pide que le borres, se borra.</p>
    </section>
  `;
}

export {
  ZONAS,
  abrirImportador,
  actualizarImportTexto,
  analizarTexto,
  cerrarImportador,
  confirmarImportacion,
  reconocerFila,
  renderImportador,
};
