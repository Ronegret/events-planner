import { render } from "./render.js";
import { descargarCopiaSeguridad } from "./rgpd.js";
import { pesoDelEstado, saveState, state, supabaseClient, text, toast } from "./state.js";

// ============================================================================
// Peso del estado y aligerado
// ----------------------------------------------------------------------------
// El estado entero se sube a Supabase en CADA guardado. Mientras dentro solo
// hay datos —nombres, fechas, importes— eso son unos cientos de kilobytes y no
// molesta a nadie. Lo que lo dispara son los archivos guardados como texto
// (`data:image/jpeg;base64,…`): una foto de 2 MB significa 2 MB de subida cada
// vez que alguien cambia una coma.
//
// Llegamos a 4,2 MB con el 96 % en archivos sin que nadie se diera cuenta,
// porque el peso no se veía por ningún sitio. Que un problema sea invisible es
// la mitad del problema: aquí se mide, se enseña y se puede arreglar con un
// botón, sin pegar código en la consola.
// ============================================================================

const KB = 1024;
const MB = 1024 * 1024;

function formatoPeso(bytes) {
  if (bytes >= MB) return `${(bytes / MB).toFixed(2)} MB`;
  if (bytes >= KB) return `${Math.round(bytes / KB)} KB`;
  return `${bytes} B`;
}

/** Convierte un `data:` en Blob para poder subirlo. */
function aBlob(dataUrl) {
  const [cabecera, b64] = String(dataUrl).split(",");
  const tipo = (cabecera.match(/data:([^;]+)/) || [])[1] || "application/octet-stream";
  const binario = atob(b64);
  const bytes = new Uint8Array(binario.length);
  for (let i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i);
  return new Blob([bytes], { type: tipo });
}

/**
 * Sube al bucket todos los archivos que hoy viven como texto dentro del
 * estado y deja en su lugar la ruta.
 *
 * Es todo o nada: si falla un solo archivo NO se guarda nada, para no dejar
 * el estado a medias —con unos apuntando al bucket y otros no— que es la
 * forma más rápida de perder una foto sin saber cuál.
 */
async function aligerarEstado() {
  if (!supabaseClient) {
    toast("Para aligerar los datos hace falta conexión con la nube. Sin ella, los archivos se quedan donde están.", 7000);
    return;
  }

  const antes = pesoDelEstado();
  if (!antes.cuantos) {
    toast("No hay archivos que mover: tus datos ya están ligeros.");
    return;
  }

  // Red de seguridad antes de tocar nada.
  descargarCopiaSeguridad();

  const boton = document.querySelector("[data-aligerar]");
  if (boton) {
    boton.disabled = true;
    boton.textContent = "Moviendo archivos…";
  }

  let movidos = 0;
  const fallos = [];
  // Se trabaja sobre una copia: el estado real solo se toca si sale todo bien.
  const cambios = [];

  const recorrer = async (nodo, ruta) => {
    if (!nodo || typeof nodo !== "object") return;
    if (Array.isArray(nodo)) {
      for (let i = 0; i < nodo.length; i++) await recorrer(nodo[i], `${ruta}-${i}`);
      return;
    }
    if (typeof nodo.dataUrl === "string" && nodo.dataUrl.startsWith("data:")) {
      try {
        const blob = aBlob(nodo.dataUrl);
        const nombre = String(nodo.name || "archivo").replace(/[^\w.\-]+/g, "-");
        const destino = `migrado/${ruta}/${Date.now()}-${nombre}`;
        const { error } = await supabaseClient.storage
          .from("ep-documents")
          .upload(destino, blob, { contentType: blob.type, upsert: true });
        if (error) throw error;
        cambios.push({ nodo, destino, tipo: blob.type });
        movidos++;
        if (boton) boton.textContent = `Moviendo… ${movidos} de ${antes.cuantos}`;
      } catch (e) {
        fallos.push(`${nodo.name || ruta}: ${e.message}`);
      }
      return;
    }
    for (const [clave, valor] of Object.entries(nodo)) {
      if (valor && typeof valor === "object") await recorrer(valor, `${ruta}-${clave}`);
    }
  };

  for (const coleccion of ["rincones", "documents", "budget", "providers", "contracts", "receipts", "shotList"]) {
    await recorrer(state[coleccion], coleccion);
  }

  if (boton) {
    boton.disabled = false;
    boton.textContent = "↓ Mover los archivos a la nube";
  }

  if (fallos.length) {
    console.error("[EP] Fallos al aligerar:", fallos);
    toast(`No se han movido ${fallos.length} archivo(s), así que no hemos cambiado nada. Inténtalo de nuevo; si sigue fallando, avisa al equipo técnico.`, 12000);
    return;
  }

  // Todo bien: ahora sí se aplica.
  cambios.forEach(({ nodo, destino, tipo }) => {
    delete nodo.dataUrl;
    nodo.storagePath = destino;
    nodo.type = nodo.type || tipo;
  });

  saveState();
  const despues = pesoDelEstado();
  render();
  toast(
    `Hecho: ${movidos} archivos movidos. Tus datos han pasado de ${formatoPeso(antes.total)} a ${formatoPeso(despues.total)}: ahora cada guardado pesa mucho menos.`,
    14000
  );
}

/** El panel de Ajustes: qué pesa, por qué, y qué hacer. */
function renderPeso() {
  const p = pesoDelEstado();
  const pctDatos = p.total ? Math.max(2, Math.round((p.datos / p.total) * 100)) : 100;

  return `
    <section class="panel" style="margin-top:18px">
      <div class="section-title compact">
        <div>
          <h3 class="card-title">Peso de los datos</h3>
          <p class="card-sub">${
            supabaseClient
              ? "Esto es lo que se sube a la nube cada vez que se guarda algo."
              : "Esto es lo que ocupa Events Planner en este navegador."
          }</p>
        </div>
        <span class="pill">${text(formatoPeso(p.total))}</span>
      </div>

      <div class="peso-barra" role="img" aria-label="${pctDatos} % datos, ${100 - pctDatos} % archivos">
        <i class="peso-datos" style="width:${pctDatos}%"></i>
        <i class="peso-archivos" style="width:${100 - pctDatos}%"></i>
      </div>
      <div class="peso-leyenda">
        <span><b class="peso-punto datos"></b> Datos · ${text(formatoPeso(p.datos))}</span>
        <span><b class="peso-punto archivos"></b> Archivos dentro del texto · ${text(formatoPeso(p.enArchivos))} (${p.cuantos})</span>
      </div>

      ${
        p.conviéneAligerar
          ? `<div class="budget-aviso alerta" role="status" style="margin-top:14px">
              <strong>${p.porcentaje} % del peso son archivos metidos como texto</strong>
              <span>Cada guardado sube ${text(formatoPeso(p.total))} enteros, aunque solo hayas cambiado una fecha. Moviéndolos a la nube quedaría en ${text(formatoPeso(p.datos))}.</span>
            </div>
            <div class="actions" style="margin-top:14px">
              <button class="btn primary" data-aligerar>↓ Mover los archivos a la nube</button>
            </div>
            <p class="card-sub" style="margin-top:8px">Antes de mover nada se descarga una copia de seguridad. Si falla algún archivo, no se cambia nada.</p>`
          : `<p class="card-sub" style="margin-top:12px">${
              p.cuantos
                ? `Hay ${p.cuantos} archivo(s) guardados como texto, pero ocupan poco (${text(formatoPeso(p.enArchivos))}). No hace falta hacer nada.`
                : "Todos los archivos están en la nube y aquí solo queda su dirección. Así es como tiene que estar."
            }</p>`
      }
    </section>
  `;
}

export { aligerarEstado, formatoPeso, renderPeso };
