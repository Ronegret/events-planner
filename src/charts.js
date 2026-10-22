import { text } from "./state.js";

// ============================================================================
// Piezas de dashboard estilo "KPI + gráfico ligero" (inspiradas en el panel
// de referencia de ALGOEN_2: tarjetas MiniStat + barras de distribución en
// SVG/HTML puro, sin librerías externas). Pensadas para reutilizarse en
// cualquier vista, no solo en el dashboard principal.
// ============================================================================

/** Tarjeta KPI: etiqueta pequeña en mayúsculas + número grande + sub-línea opcional. */
function miniStat(label, value, sub) {
  return `
    <article class="kpi-card">
      <span class="kpi-label">${text(label)}</span>
      <strong class="kpi-value">${text(value)}</strong>
      ${sub ? `<span class="kpi-sub">${text(sub)}</span>` : ""}
    </article>
  `;
}

/**
 * Barras de distribución horizontales con etiqueta + valor formateado a la
 * derecha — para rankings o repartos cortos (estado de bodas, invitados por
 * RSVP, pagado vs. pendiente...).
 */
/**
 * Estado vacío de un gráfico.
 *
 * «Sin datos todavía» en un párrafo suelto dentro de una tarjeta alta deja un
 * hueco enorme y no dice qué hacer. Un vacío bien resuelto explica por qué
 * está vacío y, si se puede, ofrece la acción que lo llena.
 */
function estadoVacio({ icono = "◌", titulo = "Todavía no hay datos", texto = "", accion = "" } = {}) {
  return `<div class="chart-vacio">
    <span class="chart-vacio-ico" aria-hidden="true">${icono}</span>
    <strong>${text(titulo)}</strong>
    ${texto ? `<p>${text(texto)}</p>` : ""}
    ${accion || ""}
  </div>`;
}

function distribucionBars(items, formatValue = (v) => String(v)) {
  const clean = items.filter((item) => item && item.value > 0);
  if (!clean.length) {
    return estadoVacio({
      icono: "▤",
      titulo: "Sin reparto que enseñar",
      texto: "Cuando haya partidas con importe, aquí se verá en qué se va el dinero.",
    });
  }
  const max = Math.max(1, ...clean.map((item) => item.value));
  return `
    <div class="distbar-list">
      ${clean
        .map(
          (item) => `
        <div class="distbar-row">
          <div class="distbar-head"><span>${text(item.label)}</span><strong>${text(formatValue(item.value))}</strong></div>
          <div class="distbar-track"><div class="distbar-fill" style="width:${Math.max(4, Math.round((item.value / max) * 100))}%;background:${text(item.color || "var(--ep-green)")}"></div></div>
        </div>
      `
        )
        .join("")}
    </div>
  `;
}

// ============================================================================
// Grafico de lineas en SVG puro — port directo de SimpleChart.tsx de
// ALGOEN_2 (mismas medidas, mismos paddings, mismos colores de rejilla).
// Pensado para series mensuales cortas (6-12 puntos).
// ============================================================================

const ALTO = 200;
const ANCHO = 640;
const PAD_IZQ = 44;
const PAD_DER = 12;
const PAD_SUP = 16;
const PAD_INF = 28;

/**
 * @param {string[]} etiquetas  Etiquetas del eje X (ej. meses).
 * @param {{nombre:string,color:string,valores:number[],discontinua?:boolean}[]} series
 * @param {(v:number)=>string} formatoY
 */
function lineChart(etiquetas, series, formatoY = (v) => String(v), vacio = {}) {
  const n = etiquetas.length;
  const todos = series.flatMap((s) => s.valores);
  // Con todo a cero se dibujaba una línea plana pegada al suelo y el eje
  // repetía «1 €» tres veces, porque el máximo se forzaba a 1 y luego se
  // redondeaba: 0,25 → 0; 0,5 → 1; 0,75 → 1; 1 → 1. Un gráfico que no dice
  // nada es peor que no poner gráfico: ocupa el mismo sitio y encima confunde.
  const hayAlgo = todos.some((v) => Number(v) > 0);
  if (!n || !series.length || !hayAlgo) {
    return estadoVacio({
      icono: "◔",
      titulo: vacio.titulo || "Todavía no hay nada que dibujar",
      texto: vacio.texto || "En cuanto haya movimiento, esta gráfica se llena sola.",
      accion: vacio.accion,
    });
  }
  const max = Math.max(1, ...todos);
  const min = Math.min(0, ...todos);
  const x = (i) => PAD_IZQ + (i / Math.max(1, n - 1)) * (ANCHO - PAD_IZQ - PAD_DER);
  const y = (v) => ALTO - PAD_INF - ((v - min) / (max - min || 1)) * (ALTO - PAD_SUP - PAD_INF);
  const lineasY = 4;

  const rejilla = Array.from({ length: lineasY + 1 }, (_, i) => {
    const valor = min + ((max - min) * i) / lineasY;
    const yy = y(valor);
    return `<line x1="${PAD_IZQ}" y1="${yy}" x2="${ANCHO - PAD_DER}" y2="${yy}" stroke="var(--borde-suave)" stroke-width="1" /><text x="${PAD_IZQ - 6}" y="${yy + 3}" text-anchor="end" font-size="9" fill="var(--tinta-suave)">${text(formatoY(Math.round(valor)))}</text>`;
  }).join("");

  const ejeX = etiquetas
    .map((et, i) => `<text x="${x(i)}" y="${ALTO - 8}" text-anchor="middle" font-size="9" fill="var(--tinta-suave)">${text(et)}</text>`)
    .join("");

  // Sin color, `stroke=""` no pinta NADA: quedaban los puntos sueltos —que sí
  // se veían, en negro por defecto— y ninguna línea uniéndolos. Por eso el
  // gráfico parecía una nube de puntos. La serie puede traer su color; si no,
  // se le da uno de la paleta.
  const PALETA = ["#56603f", "#b8923f", "#c7a696", "#8b8c70"];
  const lineas = series
    .map((s, idx) => {
      const color = s.color || PALETA[idx % PALETA.length];
      const puntos = s.valores.map((v, i) => `${x(i)},${y(v)}`).join(" ");
      // Halo blanco bajo el punto: donde las dos series se cruzan, sin él no
      // se distingue cuál está delante.
      const marcas = s.discontinua
        ? ""
        : s.valores
            .map((v, i) => `<circle cx="${x(i)}" cy="${y(v)}" r="4.5" fill="#fbf8f1" /><circle cx="${x(i)}" cy="${y(v)}" r="3.2" fill="${text(color)}"><title>${text(etiquetas[i])}: ${text(formatoY(v))}</title></circle>`)
            .join("");
      return `<polyline points="${puntos}" fill="none" stroke="${text(color)}" stroke-width="2.2"${s.discontinua ? ' stroke-dasharray="5,4"' : ""} stroke-linejoin="round" stroke-linecap="round" />${marcas}`;
    })
    .join("");

  const svg = `<svg viewBox="0 0 ${ANCHO} ${ALTO}" class="line-chart" role="img" aria-label="Gráfico de líneas con la evolución mes a mes" preserveAspectRatio="xMidYMid meet">${rejilla}${ejeX}${lineas}</svg>`;
  // Dos series sin leyenda no se pueden leer: hay que saber cuál es cuál.
  const conNombre = series.filter((s) => s.nombre);
  return conNombre.length > 1 ? `${svg}${leyendaChart(series.map((s, i) => ({ ...s, color: s.color || PALETA[i % PALETA.length] })))}` : svg;
}

/** Leyenda de series: punto de color + nombre. */
function leyendaChart(series) {
  return `<div class="chart-legend">${series
    .map((s) => `<span><i style="background:${text(s.color)}"></i>${text(s.nombre)}</span>`)
    .join("")}</div>`;
}

/** Insignia de estado con los 4 tonos del Badge de ALGOEN_2. */
function badge(label, tono = "neutro") {
  return `<span class="badge ${text(tono)}">${text(label)}</span>`;
}

// ============================================================================
// Piezas del rediseño (boceto de Dashboard y Mesas). Todo en SVG/HTML puro:
// cero dependencias, imprimible y sin coste de carga.
// ============================================================================

/** Paleta de series: verde de marca primero, mostaza como acento. */
const CLAROS = ["#d6b36b", "#c7a696", "#8d9279"]; // sobre estos, la inicial va en oscuro (contraste)
const SERIE_COLORS = ["#56603f", "#d6b36b", "#96654e", "#8d9279", "#c7a696", "#2f3a24"];

/**
 * Tarjeta KPI con chip de icono, valor grande, sub-linea y barra o
 * minigrafico opcional. Es la unidad de cabecera de las dos pantallas.
 */
function statCard({ icon, label, value, sub, tone = "verde", progress = null, spark = null }) {
  return `
    <article class="stat-card">
      <span class="stat-icon tone-${text(tone)}">${icon}</span>
      <span class="stat-label">${text(label)}</span>
      <strong class="stat-value">${text(value)}</strong>
      ${sub ? `<span class="stat-sub">${text(sub)}</span>` : ""}
      ${progress !== null ? `<div class="stat-bar"><div class="stat-bar-fill tone-${text(tone)}" style="width:${Math.max(0, Math.min(100, progress))}%"></div></div>` : ""}
      ${spark ? sparkline(spark, tone) : ""}
    </article>
  `;
}

/** Minigrafico de linea para el pie de una tarjeta KPI. */
function sparkline(values, tone = "verde") {
  if (!values || values.length < 2) return "";
  const W = 120;
  const H = 28;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const span = max - min || 1;
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * W},${H - ((v - min) / span) * (H - 4) - 2}`);
  const color = { verde: "#56603f", mostaza: "#d6b36b", clay: "#a6745c", rosa: "#c7a696" }[tone] || "#56603f";
  return `<svg class="stat-spark" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true">
    <polyline points="${pts.join(" ")}" fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
  </svg>`;
}

/**
 * Grafico de anillo con el total en el centro y leyenda con valor y
 * porcentaje. Para repartos de una sola dimension (presupuesto por partida).
 */
function donutChart(items, formatValue = (v) => String(v), centerLabel = "Total") {
  const clean = items.filter((i) => i && Number(i.value) > 0);
  if (!clean.length) return estadoVacio({ icono: "◍", titulo: "Sin importes todavía" });
  const total = clean.reduce((s, i) => s + Number(i.value), 0);
  const R = 68;
  const STROKE = 26;
  const C = 2 * Math.PI * R;
  let offset = 0;

  const arcs = clean
    .map((item, index) => {
      const frac = Number(item.value) / total;
      const dash = frac * C;
      const seg = `<circle class="donut-arc" cx="100" cy="100" r="${R}" fill="none"
        stroke="${text(item.color || SERIE_COLORS[index % SERIE_COLORS.length])}" stroke-width="${STROKE}"
        stroke-dasharray="${dash - 2} ${C - dash + 2}" stroke-dashoffset="${-offset}"
        transform="rotate(-90 100 100)"><title>${text(item.label)}: ${text(formatValue(item.value))}</title></circle>`;
      offset += dash;
      return seg;
    })
    .join("");

  const legend = clean
    .map(
      (item, index) => `<li>
        <i style="background:${text(item.color || SERIE_COLORS[index % SERIE_COLORS.length])}"></i>
        <span class="donut-legend-label">${text(item.label)}</span>
        <span class="donut-legend-value">${text(formatValue(item.value))}</span>
        <span class="donut-legend-pct">${Math.round((Number(item.value) / total) * 100)}%</span>
      </li>`
    )
    .join("");

  return `
    <div class="donut-wrap">
      <svg class="donut" viewBox="0 0 200 200" role="img" aria-label="${text(centerLabel)}: ${text(formatValue(total))}">
        ${arcs}
        <text x="100" y="96" text-anchor="middle" class="donut-total">${text(formatValue(total))}</text>
        <text x="100" y="116" text-anchor="middle" class="donut-caption">${text(centerLabel)}</text>
      </svg>
      <ul class="donut-legend">${legend}</ul>
    </div>
  `;
}

/** Grafico de area con degradado bajo la linea, para tendencias. */
function areaChart(etiquetas, valores, formatoY = (v) => String(v)) {
  const n = etiquetas.length;
  if (!n || !valores?.length || !valores.some((v) => Number(v) > 0)) return estadoVacio({ icono: "◔", titulo: "Sin movimiento todavía" });
  const W = 640;
  const H = 200;
  const PAD_L = 38;
  const PAD_R = 10;
  const PAD_T = 14;
  const PAD_B = 26;
  const max = Math.max(1, ...valores);
  const min = Math.min(0, ...valores);
  const x = (i) => PAD_L + (i / Math.max(1, n - 1)) * (W - PAD_L - PAD_R);
  const y = (v) => H - PAD_B - ((v - min) / (max - min || 1)) * (H - PAD_T - PAD_B);

  const grid = Array.from({ length: 5 }, (_, i) => {
    const val = min + ((max - min) * i) / 4;
    const yy = y(val);
    return `<line x1="${PAD_L}" y1="${yy}" x2="${W - PAD_R}" y2="${yy}" stroke="var(--borde-suave)" stroke-width="1" />
            <text x="${PAD_L - 6}" y="${yy + 3}" text-anchor="end" font-size="9" fill="var(--tinta-suave)">${text(formatoY(Math.round(val)))}</text>`;
  }).join("");

  const line = valores.map((v, i) => `${x(i)},${y(v)}`).join(" ");
  const area = `${PAD_L},${H - PAD_B} ${line} ${x(n - 1)},${H - PAD_B}`;
  const labels = etiquetas.map((et, i) => `<text x="${x(i)}" y="${H - 8}" text-anchor="middle" font-size="9" fill="var(--tinta-suave)">${text(et)}</text>`).join("");
  const dots = valores.map((v, i) => `<circle cx="${x(i)}" cy="${y(v)}" r="3" fill="#56603f" />`).join("");

  return `<svg class="area-chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Gráfico de área con la evolución mes a mes" preserveAspectRatio="xMidYMid meet">
    <defs><linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#56603f" stop-opacity="0.28" />
      <stop offset="100%" stop-color="#56603f" stop-opacity="0.02" />
    </linearGradient></defs>
    ${grid}${labels}
    <polygon points="${area}" fill="url(#areaFill)" />
    <polyline points="${line}" fill="none" stroke="#56603f" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round" />
    ${dots}
  </svg>`;
}

/** Avatar de iniciales con color estable derivado del nombre. */
function avatar(name, size = "md") {
  const clean = String(name || "?").trim();
  const initials = clean.split(/\s+/).slice(0, 2).map((w) => w[0] || "").join("").toUpperCase() || "?";
  let hash = 0;
  for (let i = 0; i < clean.length; i++) hash = (hash * 31 + clean.charCodeAt(i)) >>> 0;
  const color = SERIE_COLORS[hash % SERIE_COLORS.length];
  return `<span class="avatar avatar-${text(size)}" style="--avatar-bg:${color}${CLAROS.includes(color) ? ";color:#20230d" : ""}" title="${text(clean)}">${text(initials)}</span>`;
}

/** Control segmentado (conmutador de vistas). */
function segmented(options, activeValue, attr) {
  return `<div class="segmented" role="group">${options
    .map((o) => `<button class="segmented-btn${o.value === activeValue ? " active" : ""}" ${attr}="${text(o.value)}">${text(o.label)}</button>`)
    .join("")}</div>`;
}

export {
  estadoVacio, SERIE_COLORS, areaChart, avatar, badge, distribucionBars, donutChart, leyendaChart, lineChart, miniStat, segmented, sparkline, statCard };
