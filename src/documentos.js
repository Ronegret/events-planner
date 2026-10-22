import { icono } from "./iconos.js";
import { PLAZOS, plazosDe, totalPago } from "./budget.js";
import { storageBlobUrl } from "./modals.js";
import { byWeddingId, formatDate, state, text } from "./state.js";
import { formatPriceExact } from "./views.js";

// ============================================================================
// Documentos de la boda
// ----------------------------------------------------------------------------
// Aquí no se guarda nada. Esto es un ÍNDICE.
//
// Los archivos de una boda no nacen en un mismo sitio y no deberían: el
// justificante de un pago se sube en ese pago, porque es ahí donde uno está
// cuando lo tiene delante; el presupuesto de un proveedor se sube en su ficha;
// el contrato firmado, en el contrato. Obligar a subirlo todo dos veces —una
// donde toca y otra "en Documentos"— es lo que produce dos versiones de la
// misma factura y nadie sabiendo cuál vale.
//
// Así que Documentos no copia archivos: los lista, dice de dónde salen y
// lleva hasta allí. Un archivo, un sitio, muchas vistas.
//
// De cada documento interesa saber tres cosas, y en este orden:
//   ¿qué es?  ·  ¿de dónde sale?  ·  ¿lo pueden ver los novios?
// ============================================================================

/** Los orígenes posibles, con cómo se presentan y a dónde llevan. */
const ORIGENES = {
  presupuesto: { etiqueta: "Presupuesto", icono: "€", tab: "presupuesto" },
  proveedor: { etiqueta: "Proveedor", icono: "◇", tab: "proveedores" },
  contrato: { etiqueta: "Contrato", icono: "✎", tab: "contrato" },
  suelto: { etiqueta: "Subido a mano", icono: "▤", tab: "documentos" },
};

/**
 * Todo archivo de una boda, venga de donde venga.
 *
 * Devuelve entradas normalizadas para que la vista no tenga que saber que un
 * justificante vive dentro de `pago.justificante` y una propuesta dentro de
 * `provider.presupuesto`.
 */
function documentosDe(weddingId) {
  if (!weddingId) return [];
  const docs = [];

  // 1. Justificantes de pago — dentro de cada plazo de cada partida.
  byWeddingId("budget", weddingId).forEach((item) => {
    const plazos = plazosDe(item);
    PLAZOS.forEach(({ id, label }) => {
      const pago = plazos[id];
      if (!pago?.justificante) return;
      docs.push({
        id: `just-${item.id}-${id}`,
        nombre: pago.justificante.name || "Justificante",
        adjunto: pago.justificante,
        tipo: "Justificante de pago",
        origen: "presupuesto",
        procedencia: `${item.concepto} · ${label}`,
        importe: totalPago(pago),
        fecha: pago.vence || null,
        paraNovios: true,
        irA: "presupuesto",
      });
    });
  });

  // 2. Presupuestos y propuestas de proveedor — en la ficha del proveedor.
  byWeddingId("providers", weddingId).forEach((prov) => {
    if (!prov.presupuesto) return;
    docs.push({
      id: `prov-${prov.id}`,
      nombre: prov.presupuesto.name || `Presupuesto de ${prov.name}`,
      adjunto: prov.presupuesto,
      tipo: "Presupuesto de proveedor",
      origen: "proveedor",
      procedencia: `${prov.name}${prov.type ? ` · ${prov.type}` : ""}`,
      importe: Number(prov.presupuestoImporte) || 0,
      fecha: prov.presupuestoFecha || null,
      paraNovios: true,
      irA: "proveedores",
    });
  });

  // 3. Contrato firmado y lo que se haya subido en el circuito del contrato.
  byWeddingId("contracts", weddingId).forEach((contrato) => {
    (contrato.uploads || []).forEach((up) => {
      docs.push({
        id: `ctr-${up.id}`,
        nombre: up.name || "Contrato firmado",
        adjunto: up,
        tipo: "Contrato firmado",
        origen: "contrato",
        procedencia: up.uploadedBy ? `Subido por ${up.uploadedBy}` : "Contrato",
        importe: 0,
        fecha: up.uploadedAt || null,
        paraNovios: true,
        irA: "contrato",
      });
    });
  });

  // 4. Los que se suben directamente aquí, que siguen teniendo sentido:
  //    el seguro, un permiso del ayuntamiento, el plano de la finca.
  byWeddingId("documents", weddingId).forEach((doc) => {
    docs.push({
      id: doc.id,
      nombre: doc.name,
      adjunto: doc.attachment,
      tipo: doc.type || "Documento",
      origen: "suelto",
      procedencia: doc.notes || "Subido a Documentos",
      importe: 0,
      fecha: doc.date || null,
      paraNovios: /nov/i.test(String(doc.visibility || "")),
      irA: "documentos",
      editable: true,
    });
  });

  return docs.sort((a, b) => String(b.fecha || "").localeCompare(String(a.fecha || "")));
}

/** Cuántos documentos hay de cada origen, para los filtros. */
function conteoPorOrigen(docs) {
  return docs.reduce((acc, d) => {
    acc[d.origen] = (acc[d.origen] || 0) + 1;
    return acc;
  }, {});
}

function iconoDe(nombre = "", hayArchivo = true) {
  // Sin archivo no hay extensión que mirar, y el cuadro vacío que salía se
  // leía como una casilla de verificar. Mejor un guion, que no invita a nada.
  if (!hayArchivo) return { ico: "–", et: "—" };
  const partes = String(nombre).split(".");
  const ext = partes.length > 1 ? partes.pop().toLowerCase() : "";
  if (ext === "pdf") return { ico: "▤", et: "PDF" };
  if (["jpg", "jpeg", "png", "webp", "heic", "gif"].includes(ext)) return { ico: "▣", et: "Imagen" };
  if (["doc", "docx", "odt"].includes(ext)) return { ico: "▥", et: "Word" };
  if (["xls", "xlsx", "csv", "ods"].includes(ext)) return { ico: "▦", et: "Hoja" };
  return { ico: "▤", et: ext ? ext.toUpperCase() : "Archivo" };
}

/** Abre un documento del índice, esté guardado en el navegador o en Supabase. */
async function abrirDocumento(docId) {
  const weddingId = state.portalMode ? state.portalWeddingId : state.selectedWeddingId;
  const doc = documentosDe(weddingId).find((d) => d.id === docId);
  if (!doc?.adjunto) return;
  const url = doc.adjunto.dataUrl || (await storageBlobUrl(doc.adjunto));
  if (url) window.open(url, "_blank", "noopener");
}

/**
 * La vista. Un índice se lee filtrando, no leyendo de arriba abajo, así que
 * los filtros van primero y agrupado por origen.
 */
function renderDocumentos(soloLectura = false) {
  const weddingId = state.portalMode ? state.portalWeddingId : state.selectedWeddingId;
  const todos = documentosDe(weddingId);
  const visibles = soloLectura ? todos.filter((d) => d.paraNovios) : todos;
  const filtro = state.docsFiltro || "Todos";
  const lista = filtro === "Todos" ? visibles : visibles.filter((d) => d.origen === filtro);
  const conteo = conteoPorOrigen(visibles);

  const chip = (clave, etiqueta, n) =>
    `<button class="chip-toggle${filtro === clave ? " active" : ""}" data-docs-filtro="${clave}">${text(etiqueta)}${n != null ? ` <b>${n}</b>` : ""}</button>`;

  return `
    <section class="panel">
      <div class="panel-head">
        <div>
          <h3 class="card-title">${soloLectura ? "Vuestros documentos" : "Documentos de la boda"}</h3>
          <p class="card-sub">${
            soloLectura
              ? "Presupuestos, facturas y comprobantes de vuestra boda, con el enlace a cada archivo."
              : "Todo lo que se ha adjuntado en esta boda, venga de donde venga. Los archivos siguen viviendo donde se subieron: aquí se listan y se enlazan."
          }</p>
        </div>
        ${soloLectura ? "" : `<button class="btn primary" data-action="new-document"><span class="icon-btn">+</span> Subir documento</button>`}
      </div>

      ${
        visibles.length
          ? `<div class="docs-filtros" role="group" aria-label="Filtrar por origen">
              ${chip("Todos", "Todos", visibles.length)}
              ${Object.entries(ORIGENES)
                .filter(([clave]) => conteo[clave])
                .map(([clave, o]) => chip(clave, o.etiqueta, conteo[clave]))
                .join("")}
            </div>`
          : ""
      }

      ${
        !lista.length
          ? `<div class="empty empty-large">
              <h3>${visibles.length ? "Nada con este filtro" : "Todavía no hay documentos"}</h3>
              <p>${
                visibles.length
                  ? "Prueba con otro origen."
                  : "Los justificantes se suben en su pago, los presupuestos en la ficha del proveedor y el contrato en su pestaña. Todos aparecen aquí solos."
              }</p>
            </div>`
          : `<div class="docs-lista">
              ${lista
                .map((d) => {
                  const hayArchivo = d.adjunto?.dataUrl || d.adjunto?.storagePath;
                  const { ico, et } = iconoDe(d.nombre, !!hayArchivo);
                  const o = ORIGENES[d.origen];
                  return `<article class="doc-fila">
                    <span class="doc-icono" aria-hidden="true">${ico}</span>
                    <div class="doc-datos">
                      <h4>${text(d.nombre)}</h4>
                      <p class="doc-meta">
                        <span class="doc-origen doc-origen-${d.origen}">${o.icono} ${text(o.etiqueta)}</span>
                        <span>${text(d.procedencia)}</span>
                        ${d.importe ? `<span class="doc-importe">${text(formatPriceExact(d.importe))}</span>` : ""}
                        ${d.fecha ? `<span>${text(formatDate(d.fecha))}</span>` : ""}
                        <span class="doc-ext">${et}</span>
                        ${!soloLectura && !d.paraNovios ? `<span class="doc-privado">Solo equipo</span>` : ""}
                      </p>
                    </div>
                    <div class="doc-acciones">
                      ${hayArchivo ? `<button class="mini-btn" data-abrir-documento="${d.id}">👁 Abrir</button>` : `<span class="doc-sin-archivo">Sin archivo</span>`}
                      ${soloLectura || d.origen === "suelto" ? "" : `<button class="mini-btn" data-tab="${d.irA}" title="Ir a donde vive este archivo">↗ ${text(ORIGENES[d.origen].etiqueta)}</button>`}
                      ${!soloLectura && d.editable ? `<button class="mini-btn danger-text" data-delete-item="documents:${d.id}" aria-label="Borrar ${text(d.nombre)}">${icono("cerrar")}</button>` : ""}
                    </div>
                  </article>`;
                })
                .join("")}
            </div>`
      }
    </section>
  `;
}

export { ORIGENES, abrirDocumento, documentosDe, renderDocumentos };
