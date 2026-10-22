import { icono } from "./iconos.js";
import { badge, distribucionBars, lineChart, statCard } from "./charts.js";
import { addActivity, fileToAttachment, openFormModal, storageBlobUrl } from "./modals.js";
import { render } from "./render.js";
import { PROVIDER_TYPES, byWeddingId, cuando, fechaHora, formatDate, saveState, state, text, toast, uid } from "./state.js";
import { formatPrice, formatPriceExact } from "./views.js";

// ============================================================================
// Presupuesto de una boda
// ----------------------------------------------------------------------------
// Antes había dos sitios donde se hablaba de dinero —"Presupuesto" y "Pagos"—
// y decían cosas distintas sobre lo mismo. Ahora hay uno solo.
//
// La unidad es la PARTIDA (el fotógrafo, el catering, las flores), y tiene
// dos capas que conviene no confundir:
//
//   COSTE  — lo que cuesta. Es un dato del acuerdo con el proveedor.
//   PAGOS  — cómo se paga. Es un calendario.
//
// Durante mucho tiempo aquí solo existía la segunda: el coste se deducía
// sumando los tres pagos. Parecía cómodo y estaba mal, porque convertía una
// cifra contratada en una consecuencia de haber tecleado bien. Si alguien se
// equivocaba en un plazo, el presupuesto total de la boda cambiaba en
// silencio y no había contra qué contrastarlo. Y lo peor: el dinero
// contratado que todavía no estaba repartido en ningún plazo era invisible
// hasta que el proveedor llamaba a reclamarlo.
//
// Ahora la partida guarda su coste:
//   Importe A → lo que va con factura. Se puede meter con el IVA ya incluido
//               o sin él, y el sistema calcula lo que falte.
//   Importe B → lo que no va facturado (efectivo, acuerdos directos).
//   Total de la partida = A + IVA de A + B
//
// Mezclar todo en una cifra es lo que hace que a mitad de año no cuadre nada:
// si el fotógrafo cobra 1.200 € + IVA y el DJ 400 € de suplidos, eso no son
// 1.600 € — son 1.852 €.
//
// Y ese coste se reparte en los tres pagos como se paga de verdad en este
// sector:
//
//   1. Reserva          la señal, al cerrar con el proveedor
//   2. Segundo pago     normalmente a mitad de camino
//   3. Restante         los días previos al evento
//
// El reparto puede no cuadrar con el coste, y eso NO es un error que haya que
// impedir: es información. «Quedan 4.092 € sin fecha» es exactamente lo que
// hay que saber en marzo. La app lo dice, no lo corrige.
//
// Cada pago guarda su vencimiento, su justificante y quién lo tocó por última
// vez. Eso último no es burocracia: cuando dos personas llevan la misma boda,
// "¿esto lo marcaste tú como pagado?" es una pregunta que se hace mucho.
// ============================================================================

const IVA_POR_DEFECTO = 21;
const ESTADOS_PAGO = ["Pendiente", "Pagado", "Anulado"];

/** Los tres momentos de pago, en el orden en que ocurren. */
const PLAZOS = [
  { id: "reserva", label: "Reserva", ayuda: "La señal que se paga al cerrar con el proveedor." },
  { id: "segundo", label: "Segundo pago", ayuda: "El pago intermedio, si el proveedor lo pide." },
  { id: "restante", label: "Restante", ayuda: "Lo que queda, normalmente los días previos a la boda." },
];

/** Estructura vacía de los tres pagos de una partida nueva. */
function plazosVacios() {
  return PLAZOS.reduce((acc, p) => {
    acc[p.id] = {
      importeA: 0,
      ivaIncluido: false,
      ivaPorcentaje: IVA_POR_DEFECTO,
      importeB: 0,
      vence: null,
      estado: "Pendiente",
      justificante: null,
      historial: [],
    };
    return acc;
  }, {});
}

/** Compatibilidad con partidas creadas antes de los tres plazos. */
function plazosDe(item) {
  if (item?.plazos) return item.plazos;
  const p = plazosVacios();
  // Lo que hubiera en el modelo anterior se conserva como Reserva, para no
  // perder importes ya introducidos.
  p.reserva.importeA = Number(item?.importeA) || 0;
  p.reserva.importeB = Number(item?.importeB) || 0;
  p.reserva.ivaPorcentaje = Number(item?.ivaPorcentaje ?? IVA_POR_DEFECTO);
  p.reserva.vence = item?.fechaLimitePago || null;
  p.reserva.estado = item?.estadoPago === "Pagado" ? "Pagado" : "Pendiente";
  return p;
}

// ---------------------------------------------------------------------------
// Cálculo
// ---------------------------------------------------------------------------
/**
 * Base imponible de un pago. Si el importe se metió con el IVA ya incluido,
 * hay que sacarlo hacia atrás: 1.452 € al 21 % son 1.200 € de base.
 */
function baseA(pago) {
  const a = Number(pago?.importeA) || 0;
  const iva = Number(pago?.ivaPorcentaje ?? IVA_POR_DEFECTO) || 0;
  return pago?.ivaIncluido ? a / (1 + iva / 100) : a;
}

function ivaDe(pago) {
  const iva = Number(pago?.ivaPorcentaje ?? IVA_POR_DEFECTO) || 0;
  return baseA(pago) * (iva / 100);
}

/** Lo que hay que pagar por este plazo: A + su IVA + B. */
function totalPago(pago) {
  return baseA(pago) + ivaDe(pago) + (Number(pago?.importeB) || 0);
}

/** Parte facturada de un pago, ya con IVA. */
function facturadoPago(pago) {
  return baseA(pago) + ivaDe(pago);
}

// ---------------------------------------------------------------------------
// El coste de la partida
// ---------------------------------------------------------------------------
// Usa la misma forma que un pago (importeA / ivaIncluido / ivaPorcentaje /
// importeB) a propósito: así baseA(), ivaDe() y totalPago() valen para los dos
// y no hay dos aritméticas del IVA que puedan desviarse con el tiempo.

/**
 * Deriva un coste a partir de los pagos ya introducidos. Se usa UNA vez, al
 * migrar: a partir de ahí el coste es un dato propio de la partida.
 *
 * Si se recalculara cada vez, el coste seguiría siendo una consecuencia de los
 * pagos y no habríamos arreglado nada: tocar un plazo cambiaría el total de la
 * boda, que es justo el problema del que venimos.
 */
function derivarCoste(item) {
  const p = plazosDe(item);
  const vivos = PLAZOS.map(({ id }) => p[id]).filter((pago) => pago && pago.estado !== "Anulado");
  return {
    importeA: vivos.reduce((s, pago) => s + baseA(pago), 0),
    ivaIncluido: false,
    ivaPorcentaje: Number(vivos.find((pago) => baseA(pago))?.ivaPorcentaje ?? IVA_POR_DEFECTO),
    importeB: vivos.reduce((s, pago) => s + (Number(pago.importeB) || 0), 0),
    derivado: true,
  };
}

/** El coste contratado de la partida, en la misma forma que un pago. */
function costeDe(item) {
  if (item?.coste) return item.coste;
  // Partida anterior al coste explícito: se deriva y SE GUARDA, para que
  // ninguna cifra se mueva el día del cambio y para que a partir de ese
  // momento el total ya no dependa de los plazos. Queda marcada como
  // derivada hasta que alguien la confirme editando la partida.
  if (item && typeof item === "object") {
    item.coste = derivarCoste(item);
    return item.coste;
  }
  return derivarCoste(item);
}

/** ¿El coste se dedujo de los pagos porque la partida es anterior al cambio? */
function costeDerivado(item) {
  return !!costeDe(item).derivado;
}

/** Lo que cuesta la partida: A + IVA + B. Ya no depende de los pagos. */
function totalPartida(item) {
  return totalPago(costeDe(item));
}

/** Lo que suman los tres pagos. Puede no llegar al coste, o pasarse. */
function repartidoPartida(item) {
  const p = plazosDe(item);
  return PLAZOS.reduce((s, { id }) => s + (p[id]?.estado === "Anulado" ? 0 : totalPago(p[id])), 0);
}

/**
 * La diferencia entre lo contratado y lo repartido en pagos.
 * Positiva = queda dinero sin fecha. Negativa = los pagos se pasan del coste.
 */
function sinRepartir(item) {
  return totalPartida(item) - repartidoPartida(item);
}

// ---------------------------------------------------------------------------
// Migración: avisos de pago del sistema anterior → partidas de presupuesto
// ---------------------------------------------------------------------------
// "Pagos" era antes su propia pestaña, con avisos sueltos (concepto + importe
// + fecha + Pendiente/Pagado, guardados en `state.payments`) y sus
// comprobantes en `state.receipts`. Al unificar todo en Presupuesto esa
// pestaña dejó de pintarse — pero nadie borró los avisos: seguían en el
// estado, ahora sin ningún sitio donde mostrarse. Un aviso ya marcado
// "Pagado" es, literalmente, un pago entregado; que desaparezca de la vista
// es peor que si nunca hubiera existido, porque parece que ese dinero ya
// cobrado no se ha cobrado.
//
// Se ejecuta una vez al arrancar (ver main.js initApp()): cada aviso se
// convierte en una partida con un solo plazo relleno ("Reserva"), copiando
// también su comprobante si lo tenía. Cada aviso queda marcado para no
// migrarse dos veces; los avisos de una boda que ya no existe también se
// marcan, para no reintentar en cada carga sin generar nada.
function migrarAvisosDePago() {
  const pendientes = state.payments.filter((p) => !p.migradoAPresupuesto);
  if (!pendientes.length) return;

  pendientes.forEach((pago) => {
    pago.migradoAPresupuesto = true;
    if (!state.weddings.some((w) => w.id === pago.weddingId)) return;

    // El aviso antiguo era un importe suelto, sin distinguir factura de
    // efectivo. Meterlo en A inventaría un 21 % de IVA que nunca formó parte
    // de esa cifra y el total dejaría de coincidir con lo que de verdad se
    // cobró. Va en B (no facturado): así el total migrado es exactamente el
    // importe original, sin dar por hecho un dato fiscal que no existía.
    const importe = Number(pago.importe) || 0;
    const plazos = plazosVacios();
    plazos.reserva.importeB = importe;
    plazos.reserva.vence = pago.fecha || null;
    plazos.reserva.estado = pago.estado === "Pagado" ? "Pagado" : "Pendiente";
    plazos.reserva.historial = [
      { at: pago.notificadoAt || new Date().toISOString(), by: pago.creadoPor || "Equipo", que: "Migrado desde el antiguo aviso de pago" },
    ];
    // Si el aviso ya tenía un comprobante subido (equipo o novios desde el
    // portal), se enlaza directamente al plazo para no dejarlo suelto.
    const comprobante = state.receipts.find((r) => r.paymentId === pago.id);
    if (comprobante?.attachment) plazos.reserva.justificante = comprobante.attachment;

    state.budget.push({
      id: uid("bdg"),
      weddingId: pago.weddingId,
      createdAt: pago.notificadoAt || new Date().toISOString(),
      concepto: pago.concepto || "Pago migrado",
      categoria: "Otros",
      proveedor: "",
      notas: "Migrado automáticamente del antiguo aviso de pago. Revisa si el importe va facturado (A) o no (B) — se puso en B por no dar por hecho un IVA que los avisos anteriores no registraban.",
      coste: { importeA: 0, ivaIncluido: false, ivaPorcentaje: IVA_POR_DEFECTO, importeB: importe },
      plazos,
    });
  });

  saveState({ skipRemote: true });
}

function budgetItems(weddingId) {
  return byWeddingId("budget", weddingId);
}

/** Todo lo que hace falta para pintar el presupuesto de una boda. */
function budgetSummary(weddingId) {
  const wedding = state.weddings.find((w) => w.id === weddingId);
  const items = budgetItems(weddingId);
  const objetivo = Number(wedding?.presupuestoObjetivo) || 0;

  const acc = {
    // Contratado: sale del COSTE de cada partida. Es el Total Budget.
    facturado: 0,
    noFacturado: 0,
    iva: 0,
    // Pagado: sale de los PAGOS marcados como hechos.
    facturadoPagado: 0,
    noFacturadoPagado: 0,
    // Repartido: lo que suman los tres plazos, cuadre o no con el coste.
    repartido: 0,
  };
  const vencidos = [];
  const proximos = [];
  const descuadres = [];

  items.forEach((item) => {
    const coste = costeDe(item);
    acc.facturado += facturadoPago(coste);
    acc.noFacturado += Number(coste.importeB) || 0;
    acc.iva += ivaDe(coste);
    acc.repartido += repartidoPartida(item);

    const resto = sinRepartir(item);
    if (Math.abs(resto) >= 1) descuadres.push({ item, resto });

    const p = plazosDe(item);
    PLAZOS.forEach(({ id, label }) => {
      const pago = p[id];
      if (!pago || pago.estado === "Anulado") return;
      const tot = totalPago(pago);
      if (!tot) return;

      if (pago.estado === "Pagado") {
        acc.facturadoPagado += facturadoPago(pago);
        acc.noFacturadoPagado += Number(pago.importeB) || 0;
      } else if (esVencido(pago)) vencidos.push({ item, label, pago });
      else if (esProximo(pago)) proximos.push({ item, label, pago });
    });
  });

  // A + B = Total, por construcción y no por casualidad: las tres cifras
  // salen del mismo sitio en lugar de calcularse por caminos distintos.
  const total = acc.facturado + acc.noFacturado;
  const pagado = acc.facturadoPagado + acc.noFacturadoPagado;

  return {
    items,
    objetivo,
    ...acc,
    total,
    pagado,
    pendiente: total - pagado,
    facturadoPendiente: acc.facturado - acc.facturadoPagado,
    noFacturadoPendiente: acc.noFacturado - acc.noFacturadoPagado,
    sinRepartir: total - acc.repartido,
    descuadres,
    desvio: objetivo ? total - objetivo : 0,
    consumo: objetivo ? (total / objetivo) * 100 : 0,
    vencidos,
    proximos,
  };
}

function esVencido(pago) {
  if (!pago?.vence || pago.estado !== "Pendiente") return false;
  return new Date(pago.vence) < new Date(new Date().toDateString());
}

function esProximo(pago) {
  if (!pago?.vence || pago.estado !== "Pendiente") return false;
  const dias = (new Date(pago.vence) - new Date(new Date().toDateString())) / 86400000;
  return dias >= 0 && dias <= 15;
}

// ---------------------------------------------------------------------------
// Alta y edición de partidas
// ---------------------------------------------------------------------------
/** Proveedores de la base, para elegir en vez de teclear. */
function opcionesProveedor(categoria) {
  const vistos = new Map();
  state.providers.forEach((p) => {
    const nombre = String(p.name || "").trim();
    if (!nombre) return;
    if (categoria && categoria !== "Todas" && p.type && p.type !== categoria) return;
    if (!vistos.has(nombre.toLowerCase())) vistos.set(nombre.toLowerCase(), nombre);
  });
  return ["Sin asignar", ...[...vistos.values()].sort((a, b) => a.localeCompare(b, "es"))];
}

const CAMPOS_PARTIDA = [
  { name: "concepto", label: "Concepto", required: true, wide: true, placeholder: "Ej. Fotógrafo, catering, flores del altar…" },
  { name: "categoria", label: "Categoría", options: PROVIDER_TYPES },
  {
    name: "proveedor",
    label: "Proveedor",
    options: () => opcionesProveedor(),
    help: "Se elige de tu base de proveedores. Si no está, créalo antes en Proveedores.",
  },
  // El coste va en el alta, no se deduce de los pagos. Es lo primero que se
  // sabe de una partida —lo dice el presupuesto del proveedor— y lo último
  // que se decide es cómo se reparte.
  {
    name: "costeA",
    label: "Coste facturado (A)",
    type: "number",
    step: "0.01",
    placeholder: "0",
    help: "Lo que va con factura, tal como te lo dé el proveedor.",
  },
  {
    name: "ivaIncluido",
    label: "Esa cifra…",
    options: ["No lleva el IVA (es la base)", "Ya lleva el IVA incluido"],
  },
  { name: "ivaPorcentaje", label: "IVA %", type: "number", step: "1", placeholder: String(IVA_POR_DEFECTO) },
  {
    name: "costeB",
    label: "Coste no facturado (B)",
    type: "number",
    step: "0.01",
    placeholder: "0",
    help: "Suplidos o pagos directos al proveedor, sin IVA. Déjalo en 0 si no hay.",
  },
  { name: "notas", label: "Notas", wide: true, placeholder: "Opcional" },
];

function newBudgetItem() {
  const weddingId = state.portalMode ? state.portalWeddingId : state.selectedWeddingId;
  if (!weddingId) return;
  openFormModal({
    intent: "create-budget",
    title: "Nueva partida",
    kicker: "Presupuesto",
    submitLabel: "Crear partida",
    values: { categoria: PROVIDER_TYPES[0], proveedor: "Sin asignar", ivaIncluido: "No lleva el IVA (es la base)", ivaPorcentaje: IVA_POR_DEFECTO },
    fields: CAMPOS_PARTIDA,
  });
}

function editBudgetItem(id) {
  const item = state.budget.find((i) => i.id === id);
  if (!item) return;
  const coste = costeDe(item);
  openFormModal({
    intent: "update-budget",
    itemId: id,
    title: "Editar partida",
    kicker: "Presupuesto",
    submitLabel: "Guardar",
    values: {
      ...item,
      costeA: coste.importeA || "",
      costeB: coste.importeB || "",
      ivaPorcentaje: coste.ivaPorcentaje ?? IVA_POR_DEFECTO,
      ivaIncluido: coste.ivaIncluido ? "Ya lleva el IVA incluido" : "No lleva el IVA (es la base)",
    },
    fields: CAMPOS_PARTIDA,
  });
}

function datosPartida(values) {
  return {
    concepto: String(values.concepto || "").trim() || "Partida",
    categoria: values.categoria || PROVIDER_TYPES[0],
    proveedor: values.proveedor === "Sin asignar" ? "" : String(values.proveedor || "").trim(),
    notas: String(values.notas || "").trim(),
    // Al guardar deja de ser derivado: alguien lo ha mirado y confirmado.
    coste: {
      importeA: Number(values.costeA) || 0,
      ivaIncluido: /incluido/i.test(String(values.ivaIncluido || "")),
      ivaPorcentaje: Number(values.ivaPorcentaje ?? IVA_POR_DEFECTO) || 0,
      importeB: Number(values.costeB) || 0,
    },
  };
}

function createBudgetFromModal(values) {
  const weddingId = state.portalMode ? state.portalWeddingId : state.selectedWeddingId;
  const item = {
    id: uid("bdg"),
    weddingId,
    createdAt: new Date().toISOString(),
    plazos: plazosVacios(),
    ...datosPartida(values),
  };
  state.budget.push(item);
  addActivity(`Añadió al presupuesto la partida "${item.concepto}"`, state.user?.name, weddingId);
  state.modal = null;
  saveState();
  render();
  toast("Partida creada. Ahora rellena sus tres pagos.", 5000);
}

function updateBudgetFromModal(id, values) {
  const item = state.budget.find((i) => i.id === id);
  if (!item) return;
  Object.assign(item, datosPartida(values));
  addActivity(`Actualizó la partida "${item.concepto}"`, state.user?.name, item.weddingId);
  state.modal = null;
  saveState();
  render();
}

// ---------------------------------------------------------------------------
// Los tres pagos
// ---------------------------------------------------------------------------
function editarPago(ref) {
  const [itemId, plazoId] = String(ref).split(":");
  const item = state.budget.find((i) => i.id === itemId);
  const plazo = PLAZOS.find((p) => p.id === plazoId);
  if (!item || !plazo) return;
  const pago = plazosDe(item)[plazoId];

  openFormModal({
    intent: "budget-pago",
    itemId: ref,
    title: `${plazo.label} · ${item.concepto}`,
    kicker: "Pago",
    submitLabel: "Guardar el pago",
    values: {
      importeA: pago.importeA || "",
      ivaIncluido: pago.ivaIncluido ? "El importe ya lleva el IVA" : "El importe es la base, sin IVA",
      ivaPorcentaje: pago.ivaPorcentaje ?? IVA_POR_DEFECTO,
      importeB: pago.importeB || "",
      vence: pago.vence || "",
      estado: pago.estado || "Pendiente",
    },
    fields: [
      { name: "aviso", label: plazo.label, type: "readonly", wide: true, value: plazo.ayuda },
      { name: "importeA", label: "Importe A · facturado (€)", type: "number" },
      {
        name: "ivaIncluido",
        label: "Ese importe…",
        options: ["El importe es la base, sin IVA", "El importe ya lleva el IVA"],
        help: "Da igual cómo te lo dé el proveedor: calculamos nosotros la parte que falte.",
      },
      { name: "ivaPorcentaje", label: "IVA (%)", type: "number", help: "21 % general · 10 % en algunos servicios de hostelería." },
      { name: "importeB", label: "Importe B · no facturado (€)", type: "number", help: "Suplidos o pagos directos al proveedor. No lleva IVA." },
      { name: "vence", label: "Fecha de vencimiento", type: "date" },
      { name: "estado", label: "Estado", options: ESTADOS_PAGO },
      {
        name: "justificanteFile",
        label: "Justificante",
        type: "file",
        accept: ".pdf,.jpg,.jpeg,.png,.webp",
        wide: true,
        help: "La captura o el PDF de la transferencia. Opcional, pero es lo que evita el «¿esto lo pagamos?» de dentro de tres meses.",
      },
    ],
  });
}

async function guardarPago(ref, values) {
  const [itemId, plazoId] = String(ref).split(":");
  const item = state.budget.find((i) => i.id === itemId);
  const plazo = PLAZOS.find((p) => p.id === plazoId);
  if (!item || !plazo) return;

  item.plazos = plazosDe(item);
  const pago = item.plazos[plazoId];
  const antes = { ...pago };

  pago.importeA = Number(values.importeA) || 0;
  pago.ivaIncluido = /ya lleva/i.test(String(values.ivaIncluido || ""));
  pago.ivaPorcentaje = values.ivaPorcentaje === "" || values.ivaPorcentaje == null ? IVA_POR_DEFECTO : Number(values.ivaPorcentaje) || 0;
  pago.importeB = Number(values.importeB) || 0;
  pago.vence = values.vence || null;
  pago.estado = values.estado || "Pendiente";

  const wedding = state.weddings.find((w) => w.id === item.weddingId);
  const adjunto = await fileToAttachment(values.justificanteFile, {
    storageWeddingId: wedding?.storageWeddingId,
    documentId: `${item.id}-${plazoId}`,
  });
  if (adjunto) pago.justificante = adjunto;

  // Traza: qué cambió, quién y cuándo. Es lo que responde al «¿esto lo
  // marcaste tú como pagado?» que se pregunta cuando dos personas llevan la
  // misma boda.
  const cambios = [];
  if (antes.estado !== pago.estado) cambios.push(`estado ${antes.estado} → ${pago.estado}`);
  if (totalPago(antes) !== totalPago(pago)) cambios.push(`importe ${formatPriceExact(totalPago(antes))} → ${formatPriceExact(totalPago(pago))}`);
  if (antes.vence !== pago.vence) cambios.push(`vencimiento ${antes.vence ? formatDate(antes.vence) : "sin fecha"} → ${pago.vence ? formatDate(pago.vence) : "sin fecha"}`);
  if (adjunto) cambios.push("adjuntó justificante");

  pago.historial = pago.historial || [];
  if (cambios.length) {
    pago.historial.unshift({
      at: new Date().toISOString(),
      by: state.portalMode ? wedding?.couple || "Novios" : state.user?.name || "Equipo",
      que: cambios.join(" · "),
    });
    addActivity(`${plazo.label} de "${item.concepto}": ${cambios.join(" · ")}`, state.user?.name, item.weddingId);
  }

  state.modal = null;
  saveState();
  render();
}

/** Marcar un pago como hecho es el gesto más repetido: un solo toque. */
function togglePagado(ref) {
  const [itemId, plazoId] = String(ref).split(":");
  const item = state.budget.find((i) => i.id === itemId);
  const plazo = PLAZOS.find((p) => p.id === plazoId);
  if (!item || !plazo) return;

  item.plazos = plazosDe(item);
  const pago = item.plazos[plazoId];
  if (!totalPago(pago)) {
    toast("Este pago no tiene importe todavía. Ábrelo y rellénalo.");
    return;
  }
  pago.estado = pago.estado === "Pagado" ? "Pendiente" : "Pagado";
  pago.historial = pago.historial || [];
  pago.historial.unshift({
    at: new Date().toISOString(),
    by: state.user?.name || "Equipo",
    que: pago.estado === "Pagado" ? "marcó el pago como hecho" : "reabrió el pago",
  });
  addActivity(
    `${plazo.label} de "${item.concepto}" ${pago.estado === "Pagado" ? "pagado" : "reabierto"} (${formatPriceExact(totalPago(pago))})`,
    state.user?.name,
    item.weddingId
  );
  saveState();
  render();
}

async function verJustificante(ref) {
  const [itemId, plazoId] = String(ref).split(":");
  const item = state.budget.find((i) => i.id === itemId);
  const pago = item && plazosDe(item)[plazoId];
  const url = pago?.justificante?.dataUrl || (await storageBlobUrl(pago?.justificante));
  if (!url) {
    toast("Este pago no tiene justificante. Puedes adjuntarlo al editar el pago.");
    return;
  }
  window.open(url, "_blank", "noopener");
}

function setBudgetTarget(weddingId) {
  const wedding = state.weddings.find((w) => w.id === weddingId);
  if (!wedding) return;
  openFormModal({
    intent: "budget-target",
    itemId: weddingId,
    title: "Presupuesto objetivo",
    kicker: "Presupuesto",
    submitLabel: "Guardar objetivo",
    values: { presupuestoObjetivo: wedding.presupuestoObjetivo || "" },
    fields: [
      {
        name: "presupuestoObjetivo",
        label: "Objetivo total de la boda (€)",
        type: "number",
        wide: true,
        help: "La cifra que la pareja no quiere superar. Sirve de referencia para avisar cuando el gasto se acerca.",
      },
    ],
  });
}

function saveBudgetTarget(weddingId, values) {
  const wedding = state.weddings.find((w) => w.id === weddingId);
  if (!wedding) return;
  wedding.presupuestoObjetivo = Number(values.presupuestoObjetivo) || 0;
  addActivity(`Fijó el presupuesto objetivo en ${formatPrice(wedding.presupuestoObjetivo)}`, state.user?.name, weddingId);
  state.modal = null;
  saveState();
  render();
}

// ---------------------------------------------------------------------------
// Series por mes, sobre fechas reales
// ---------------------------------------------------------------------------
const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

function mesesRecientes(n = 6) {
  const hoy = new Date();
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(hoy.getFullYear(), hoy.getMonth() - (n - 1 - i), 1);
    return { label: MESES[d.getMonth()], fin: new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59) };
  });
}

/**
 * Comprometido y pagado, acumulados mes a mes sobre fechas reales.
 *
 * Antes las dos series salían de los mismos plazos, así que en el fondo
 * dibujaban lo mismo con dos nombres. Ahora **comprometido** es el coste de
 * la partida desde el día que se dio de alta —lo que firmaste— y **pagado**
 * es lo que ha salido de la cuenta. Que se separen es justo la información:
 * la distancia entre las dos líneas es lo que aún debes.
 */
function evolucionPresupuesto(weddingId = null, n = 6) {
  const meses = mesesRecientes(n);
  const items = weddingId ? budgetItems(weddingId) : state.budget;

  const real = [];
  const pagado = [];
  meses.forEach((m) => {
    let c = 0;
    let p = 0;
    items.forEach((item) => {
      const alta = new Date(item.createdAt || Date.now());
      // Comprometido: el coste entero cuenta desde que la partida existe.
      if (alta <= m.fin) c += totalPartida(item);

      const plazos = plazosDe(item);
      PLAZOS.forEach(({ id }) => {
        const pago = plazos[id];
        if (!pago || pago.estado !== "Pagado") return;
        const tot = totalPago(pago);
        if (!tot) return;
        const cuandoSePago = (pago.historial || []).find((h) => /pagado|hecho/i.test(h.que));
        if (!cuandoSePago || new Date(cuandoSePago.at) <= m.fin) p += tot;
      });
    });
    real.push(Math.round(c));
    pagado.push(Math.round(p));
  });

  return { etiquetas: meses.map((m) => m.label), real, pagado };
}

function objetivoGlobal() {
  return state.weddings.reduce((s, w) => s + (Number(w.presupuestoObjetivo) || 0), 0);
}

/** Resumen global para el panel de Inicio. */
function budgetGlobalSummary() {
  const acc = { facturado: 0, noFacturado: 0, facturadoPagado: 0, noFacturadoPagado: 0 };
  state.budget.forEach((item) => {
    // Contratado: del coste. Pagado: de los plazos hechos. Igual que en la
    // boda, para que Inicio y el detalle no puedan contar cosas distintas.
    const coste = costeDe(item);
    acc.facturado += facturadoPago(coste);
    acc.noFacturado += Number(coste.importeB) || 0;

    const p = plazosDe(item);
    PLAZOS.forEach(({ id }) => {
      const pago = p[id];
      if (!pago || pago.estado !== "Pagado") return;
      acc.facturadoPagado += facturadoPago(pago);
      acc.noFacturadoPagado += Number(pago.importeB) || 0;
    });
  });
  const total = acc.facturado + acc.noFacturado;
  const pagado = acc.facturadoPagado + acc.noFacturadoPagado;
  return {
    ...acc,
    total,
    pagado,
    pendiente: total - pagado,
    facturadoPendiente: acc.facturado - acc.facturadoPagado,
    noFacturadoPendiente: acc.noFacturado - acc.noFacturadoPagado,
    objetivo: objetivoGlobal(),
  };
}

// ---------------------------------------------------------------------------
// Vista
// ---------------------------------------------------------------------------
function renderBudgetTab() {
  const weddingId = state.portalMode ? state.portalWeddingId : state.selectedWeddingId;
  const wedding = state.weddings.find((w) => w.id === weddingId);
  if (!wedding) return "";
  const r = budgetSummary(weddingId);
  const ev = evolucionPresupuesto(weddingId);
  const soloLectura = state.portalMode;
  // Tabla por defecto: con 19 partidas, las fichas obligaban a recorrer metros
  // de pantalla para comparar dos cifras.
  const vista = state.budgetVista === "fichas" ? "fichas" : "tabla";

  const porCategoria = PROVIDER_TYPES.map((cat) => ({
    label: cat,
    value: Math.round(r.items.filter((i) => i.categoria === cat).reduce((s, i) => s + totalPartida(i), 0)),
  }));

  return `
    <section class="panel">
      <div class="panel-head">
        <div>
          <h3 class="card-title">${soloLectura ? "Vuestro presupuesto" : "Presupuesto de la boda"}</h3>
          <p class="card-sub">${
            soloLectura
              ? "Partidas, plazos y pagos de vuestra boda, con la misma información que ve el equipo."
              : "Cada partida reúne presupuesto, reserva, segundo pago, restante, vencimientos y justificantes."
          }</p>
        </div>
        <div class="actions">
          <button class="btn" data-action="new-receipt">↑ Subir comprobante</button>
          ${
            soloLectura
              ? ""
              : `<button class="btn" data-budget-target="${wedding.id}">◎ Objetivo</button>
                 <button class="btn primary" data-new-budget="1"><span class="icon-btn">+</span> Partida</button>`
          }
        </div>
      </div>

      ${renderCuadroMando(r, soloLectura)}

      <div class="dash-grid-2 budget-graficos">
        <article class="card">
          <h4 class="card-title">Evolución del gasto</h4>
          <p class="card-sub">Lo contratado frente a lo que ha salido de la cuenta, mes a mes.</p>
          ${lineChart(
            ev.etiquetas,
            [
              { nombre: "Comprometido", valores: ev.real },
              { nombre: "Pagado", valores: ev.pagado },
            ],
            formatPrice,
            {
              titulo: "Todavía no hay gasto que seguir",
              texto: soloLectura
                ? "En cuanto se cierren los primeros proveedores, aquí veréis cómo avanza el gasto mes a mes."
                : "Crea la primera partida con su coste y esta gráfica empezará a contar la historia de la boda.",
              accion: soloLectura ? "" : `<button class="btn btn-xs primary" data-new-budget="1">+ Crear partida</button>`,
            }
          )}
        </article>
        <article class="card">
          <h4 class="card-title">Reparto por categoría</h4>
          <p class="card-sub">Dónde se va el dinero de esta boda.</p>
          ${distribucionBars(porCategoria, formatPrice)}
        </article>
      </div>

      ${renderAvisos(r, soloLectura)}
      ${
        r.items.length
          ? `<div class="partidas-cab">
              <h4>${r.items.length} partida${r.items.length === 1 ? "" : "s"}</h4>
              <div class="budget-vista-switch" role="group" aria-label="Cómo ver las partidas">
                <button class="${vista === "tabla" ? "active" : ""}" data-budget-vista="tabla" aria-pressed="${vista === "tabla"}">☰ Tabla</button>
                <button class="${vista === "fichas" ? "active" : ""}" data-budget-vista="fichas" aria-pressed="${vista === "fichas"}">▤ Fichas</button>
              </div>
            </div>
            ${
              vista === "tabla"
                ? renderTablaPartidas(r, soloLectura)
                : `<div class="partidas">${r.items.map((item) => renderPartida(item, soloLectura, true)).join("")}</div>`
            }`
          : `<div class="empty empty-large">
              <h3>Todavía no hay partidas</h3>
              <p>Empieza por las grandes: espacio, catering y fotografía suelen ser el 70 % de una boda.</p>
              ${soloLectura ? "" : `<button class="btn primary" data-new-budget="1"><span class="icon-btn">+</span> Crear la primera partida</button>`}
            </div>`
      }
    </section>
  `;
}

/**
 * El cuadro de mando del presupuesto.
 *
 * Está ordenado por las preguntas que se hace la pareja, en el orden en que se
 * las hace:
 *
 *   1. ¿Cuánto dije que me iba a gastar?   → el objetivo
 *   2. ¿Cuánto llevo contratado de verdad? → el coste de las partidas
 *   3. ¿Qué he dado a cuenta, en A y en B? → los pagos hechos
 *   4. ¿Qué me queda por dar?              → lo pendiente de cada uno
 *
 * El objetivo estuvo un tiempo oculto en el portal por una suposición mía
 * equivocada: lo tomé por una cifra de trabajo de la agencia. No lo es. Es el
 * presupuesto que se fijó la pareja, y es lo PRIMERO que quieren mirar. Sin
 * él, «llevas 37.764 €» no significa nada: la cifra que le da sentido es la
 * que ellos dijeron al principio.
 *
 * Y la regla que ordena la aritmética: A + B tiene que dar el contratado,
 * siempre. Se cumple por construcción, pero se enseña escrito de todos modos.
 * Que cuadre no sirve de nada si quien mira no puede comprobarlo.
 */
function renderCuadroMando(r, soloLectura) {
  const pct = (v) => (r.total ? Math.round((v / r.total) * 100) : 0);
  const bloque = (clave, titulo, sub, contratado, pagado, pendiente, extra) => `
    <article class="kpi-ab kpi-ab-${clave}">
      <header>
        <h4>${text(titulo)}</h4>
        <p>${text(sub)}</p>
      </header>
      <div class="kpi-ab-total">
        <span>Contratado</span>
        <strong>${text(formatPriceExact(contratado))}</strong>
        <em>${pct(contratado)} % del total</em>
      </div>
      <div class="kpi-ab-split">
        <div class="kpi-ab-hecho">
          <span>${soloLectura ? "Dado a cuenta" : "Realizado"}</span>
          <strong>${text(formatPriceExact(pagado))}</strong>
        </div>
        <div class="kpi-ab-falta">
          <span>Pendiente</span>
          <strong>${text(formatPriceExact(pendiente))}</strong>
        </div>
      </div>
      <div class="kpi-ab-barra" role="img" aria-label="${pct(pagado)} % pagado">
        <i style="width:${contratado ? Math.round((pagado / contratado) * 100) : 0}%"></i>
      </div>
      ${extra ? `<small>${extra}</small>` : ""}
    </article>`;

  const desvio = r.objetivo ? r.total - r.objetivo : 0;

  return `
    <div class="budget-mando">
      <article class="kpi-total">
        ${
          // 1. Lo que se fijaron gastar. Va ARRIBA del contratado porque es la
          //    cifra contra la que se lee todo lo demás.
          r.objetivo
            ? `<div class="kpi-objetivo">
                <span>${soloLectura ? "Lo que os fijasteis gastar" : "Presupuesto de la pareja"}</span>
                <strong>${text(formatPriceExact(r.objetivo))}</strong>
              </div>`
            : ""
        }
        <span class="kpi-total-eti">${r.objetivo ? "Contratado hasta ahora" : "Total del presupuesto"}</span>
        <strong class="kpi-total-cifra">${text(formatPriceExact(r.total))}</strong>
        ${
          r.objetivo
            ? `<p class="kpi-desvio ${desvio > 0 ? "pasa" : "cabe"}">
                ${
                  desvio > 0
                    ? `${text(formatPriceExact(desvio))} por encima ${soloLectura ? "de lo que os fijasteis" : "del objetivo"}`
                    : `Quedan ${text(formatPriceExact(-desvio))} de margen`
                }
                <i>${Math.round(r.consumo)} %</i>
              </p>`
            : ""
        }
        <p class="kpi-total-suma">
          <b>${text(formatPriceExact(r.facturado))}</b> en A
          <i aria-hidden="true">+</i>
          <b>${text(formatPriceExact(r.noFacturado))}</b> en B
          <i aria-hidden="true">=</i>
          <b>${text(formatPriceExact(r.total))}</b>
        </p>
        <div class="kpi-total-pie">
          <span>${soloLectura ? "Dado a cuenta" : "Pagado"} <b>${text(formatPriceExact(r.pagado))}</b></span>
          <span>${soloLectura ? "Os queda por dar" : "Pendiente"} <b>${text(formatPriceExact(r.pendiente))}</b></span>
        </div>
      </article>
      ${bloque("a", "A · Facturado", "Con factura e IVA", r.facturado, r.facturadoPagado, r.facturadoPendiente, `IVA soportado ${text(formatPriceExact(r.iva))}`)}
      ${bloque("b", "B · No facturado", "Suplidos y pagos directos", r.noFacturado, r.noFacturadoPagado, r.noFacturadoPendiente, "")}
    </div>`;
}

/**
 * Los avisos del presupuesto, en una línea cada uno.
 *
 * Antes enumeraban en prosa los nueve pagos vencidos con su concepto, su
 * plazo y su fecha, y salía un muro de texto de cuatro líneas que nadie lee
 * entero. Lo que hace falta saber de un aviso es CUÁNTOS y CUÁNTO; el detalle
 * ya está en la tabla, donde cada plazo vencido va marcado con «!».
 */
function renderAvisos(r, soloLectura) {
  const sumar = (lista) => lista.reduce((s, v) => s + totalPago(v.pago), 0);
  const avisos = [];

  if (!soloLectura && r.objetivo && r.desvio > 0) {
    avisos.push({
      tono: "alerta",
      titulo: `${formatPrice(r.desvio)} por encima del objetivo`,
      detalle: `Objetivo ${formatPrice(r.objetivo)} · contratado ${formatPrice(r.total)}. Conviene hablarlo con la pareja antes de cerrar nada más.`,
    });
  }
  if (r.vencidos.length) {
    avisos.push({
      tono: "alerta",
      titulo: soloLectura
        ? `${r.vencidos.length} pago${r.vencidos.length === 1 ? "" : "s"} pendiente${r.vencidos.length === 1 ? "" : "s"} de fecha · ${formatPrice(sumar(r.vencidos))}`
        : `${r.vencidos.length} pago${r.vencidos.length === 1 ? " vencido" : "s vencidos"} · ${formatPrice(sumar(r.vencidos))}`,
      detalle: soloLectura
        ? "Si ya los habéis hecho, subid el comprobante y lo damos por cerrado."
        : `El más antiguo: ${r.vencidos[0].item.concepto} · ${r.vencidos[0].label} · ${formatDate(r.vencidos[0].pago.vence)}.`,
    });
  }
  if (r.proximos.length) {
    avisos.push({
      tono: "aviso",
      titulo: `${soloLectura ? "Lo que toca" : "Vence"} en los próximos 15 días · ${formatPrice(sumar(r.proximos))}`,
      detalle: r.proximos.map((v) => `${v.item.concepto} (${formatDate(v.pago.vence)})`).join(" · "),
    });
  }
  if (!soloLectura && Math.abs(r.sinRepartir) >= 1) {
    avisos.push({
      tono: "aviso",
      titulo:
        r.sinRepartir > 0
          ? `${formatPrice(r.sinRepartir)} contratados sin repartir en pagos`
          : `Los pagos se pasan ${formatPrice(-r.sinRepartir)} del coste contratado`,
      detalle: r.descuadres.map((d) => d.item.concepto).join(" · "),
    });
  }

  if (!avisos.length) return "";
  return `<div class="budget-avisos">
    ${avisos
      .map(
        (a) => `<div class="budget-aviso ${a.tono}" role="status">
          <strong>${text(a.titulo)}</strong>
          <span>${text(a.detalle)}</span>
        </div>`
      )
      .join("")}
  </div>`;
}

// ---------------------------------------------------------------------------
// Vista de tabla
// ---------------------------------------------------------------------------
// «Se hace eterno». Con 19 partidas y tres pagos cada una, las fichas
// obligaban a desplazarse durante metros para responder a algo tan simple
// como «¿cuánto llevamos pagado del catering?».
//
// Su Excel resuelve eso con una línea por proveedor, y tiene razón: para
// COMPARAR partidas hace falta que estén una debajo de otra, alineadas por
// columna. Lo que no resuelve el Excel es el detalle —vencimiento,
// justificante, quién lo tocó—, así que aquí la fila se despliega.
//
// Densidad para comparar, detalle bajo demanda. Las fichas siguen ahí para
// cuando trabajas una sola partida a fondo.

/** El estado de un plazo, en una marca que se lee de un vistazo. */
function marcaPlazo(pago) {
  if (!pago || !totalPago(pago)) return { m: "·", cls: "vacia", t: "Sin importe" };
  if (pago.estado === "Anulado") return { m: "✕", cls: "anulada", t: "Anulado" };
  if (pago.estado === "Pagado") return { m: "✓", cls: "hecha", t: "Pagado" };
  if (esVencido(pago)) return { m: "!", cls: "tarde", t: `Vencido el ${formatDate(pago.vence)}` };
  return { m: "○", cls: "espera", t: pago.vence ? `Vence el ${formatDate(pago.vence)}` : "Pendiente" };
}

function renderTablaPartidas(r, soloLectura) {
  const abierta = state.partidaAbierta;

  const fila = (item) => {
    const plazos = plazosDe(item);
    const coste = costeDe(item);
    const a = facturadoPago(coste);
    const b = Number(coste.importeB) || 0;
    const total = a + b;
    const pagado = PLAZOS.reduce((s, { id }) => s + (plazos[id]?.estado === "Pagado" ? totalPago(plazos[id]) : 0), 0);
    const resto = sinRepartir(item);
    const abierto = abierta === item.id;

    // `data-col` no es decorativo: en móvil la tabla deja de ser tabla y cada
    // celda se convierte en una fila «etiqueta → valor». El nombre de la
    // columna sale de ahí, porque una cifra suelta sin su cabecera no se
    // puede leer cuando ya no hay cabecera encima.
    const celdasPlazo = PLAZOS.map(({ id, label }) => {
      const pago = plazos[id];
      const { m, cls, t } = marcaPlazo(pago);
      const imp = totalPago(pago);
      // La fecha estaba solo en el tooltip: para verla había que pasar el ratón
      // por encima celda a celda, y en el móvil no hay ratón. Ahora se lee
      // debajo del importe, que es la pregunta que se hace en cada reunión:
      // cuánto y cuándo.
      // Fecha corta: «04 feb 2026». La larga ocupaba media columna y empujaba
      // el resto de la tabla, y aquí lo que se busca es el mes, no la frase.
      const corta = (iso) => {
        const d = new Date(iso);
        return Number.isNaN(d.getTime())
          ? formatDate(iso)
          : d.toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" }).replace(/\./g, "");
      };
      const cuando = pago?.vence
        ? `${pago.estado === "Pagado" ? "pagado" : pago.estado === "Anulado" ? "anulado" : "vence"} ${corta(pago.vence)}`
        : imp
          ? "sin fecha"
          : "";
      return `<td class="num pl pl-${cls}" data-col="${text(label)}" title="${text(label)}: ${text(t)}">
        <span class="pl-imp">${imp ? text(formatPrice(imp)) : "—"} <i aria-hidden="true">${m}</i></span>
        ${cuando ? `<small class="pl-fecha">${text(cuando)}</small>` : ""}
      </td>`;
    }).join("");

    return `
      <tr class="fila-partida${abierto ? " abierta" : ""}${resto >= 1 ? " descuadra" : ""}">
        <td class="col-concepto">
          <button class="fila-toggle" data-partida-abrir="${item.id}" aria-expanded="${abierto}">
            <span class="fila-flecha" aria-hidden="true">${abierto ? "▾" : "▸"}</span>
            <span>
              <strong>${text(item.concepto)}</strong>
              <small>${text(item.categoria || "Otros")}${resto >= 1 ? ` · faltan ${text(formatPrice(resto))} por repartir` : ""}</small>
            </span>
          </button>
        </td>
        <td class="col-prov" data-col="Proveedor">${item.proveedor ? text(item.proveedor) : `<span class="team-phone-vacio">—</span>`}</td>
        ${celdasPlazo}
        <td class="num" data-col="A · facturado">${text(formatPrice(a))}</td>
        <td class="num" data-col="B · no facturado">${b ? text(formatPrice(b)) : "—"}</td>
        <td class="num col-total" data-col="Total"><strong>${text(formatPrice(total))}</strong></td>
        <td class="num col-pagado" data-col="Pagado">${text(formatPrice(pagado))}</td>
        <td class="num col-falta" data-col="Pendiente">${total - pagado > 0 ? text(formatPrice(total - pagado)) : "—"}</td>
        ${soloLectura ? "" : `<td class="col-tools"><button class="mini-btn" data-edit-budget="${item.id}" aria-label="Editar ${text(item.concepto)}">${icono("editar")}</button><button class="mini-btn danger-text" data-delete-item="budget:${item.id}" aria-label="Borrar ${text(item.concepto)}">${icono("cerrar")}</button></td>`}
      </tr>
      ${
        abierto
          ? `<tr class="fila-detalle"><td colspan="${soloLectura ? 10 : 11}">
              <div class="plazos">${PLAZOS.map(({ id, label }) => renderPlazo(item, id, label, plazos[id], soloLectura)).join("")}</div>
            </td></tr>`
          : ""
      }`;
  };

  return `
    <div class="table-wrap budget-tabla-wrap">
      <table class="data-table budget-tabla">
        <thead>
          <tr>
            <th>Partida</th>
            <th>Proveedor</th>
            ${PLAZOS.map(({ label }) => `<th class="num">${text(label)}</th>`).join("")}
            <th class="num">A</th>
            <th class="num">B</th>
            <th class="num">Total</th>
            <th class="num">Pagado</th>
            <th class="num">Pendiente</th>
            ${soloLectura ? "" : "<th></th>"}
          </tr>
        </thead>
        <tbody>${r.items.map(fila).join("")}</tbody>
        <tfoot>
          <tr>
            <td colspan="2">TOTAL · ${r.items.length} partida${r.items.length === 1 ? "" : "s"}</td>
            <td colspan="3" class="num tfoot-nota">${r.sinRepartir >= 1 ? `${text(formatPrice(r.sinRepartir))} sin repartir` : ""}</td>
            <td class="num">${text(formatPrice(r.facturado))}</td>
            <td class="num">${text(formatPrice(r.noFacturado))}</td>
            <td class="num col-total"><strong>${text(formatPrice(r.total))}</strong></td>
            <td class="num col-pagado">${text(formatPrice(r.pagado))}</td>
            <td class="num col-falta">${text(formatPrice(r.pendiente))}</td>
            ${soloLectura ? "" : "<td></td>"}
          </tr>
        </tfoot>
      </table>
    </div>
    <p class="tabla-leyenda"><b>✓</b> pagado · <b>!</b> vencido · <b>○</b> pendiente · pulsa una partida para ver sus pagos</p>
  `;
}

/** Una partida con sus tres pagos, uno debajo de otro. */
function renderPartida(item, soloLectura, mostrarPlazos = true) {
  const plazos = plazosDe(item);
  const coste = costeDe(item);
  const total = totalPartida(item);
  const repartido = repartidoPartida(item);
  const resto = sinRepartir(item);
  const pagado = PLAZOS.reduce((s, { id }) => s + (plazos[id]?.estado === "Pagado" ? totalPago(plazos[id]) : 0), 0);
  const proveedor = item.proveedor
    ? state.providers.find((p) => String(p.name).toLowerCase() === String(item.proveedor).toLowerCase())
    : null;

  return `
    <article class="partida">
      <header class="partida-cab">
        <div>
          <h4>${text(item.concepto)}</h4>
          <p class="partida-meta">
            <span class="tipo-chip">${text(item.categoria || "Otros")}</span>
            ${
              item.proveedor
                ? proveedor
                  ? `<button class="link-btn" data-ver-proveedor="${proveedor.id}" title="Abrir la ficha de ${text(item.proveedor)}">${text(item.proveedor)} ↗</button>`
                  : `<span>${text(item.proveedor)}</span>`
                : `<span class="partida-sin-prov">Sin proveedor asignado</span>`
            }
            ${!soloLectura && costeDerivado(item) ? `<span class="coste-derivado" title="Este coste se dedujo de los pagos ya introducidos. Edita la partida para confirmarlo.">≈ coste deducido</span>` : ""}
          </p>
          ${item.notas ? `<p class="partida-notas">${text(item.notas)}</p>` : ""}
        </div>
        <div class="partida-total">
          <strong>${text(formatPriceExact(total))}</strong>
          <small>${text(formatPriceExact(facturadoPago(coste)))} en A · ${text(formatPriceExact(Number(coste.importeB) || 0))} en B</small>
          <small>${pagado >= total && total ? "Pagado del todo" : `${text(formatPrice(pagado))} pagado`}</small>
          ${soloLectura ? "" : `<div class="inline-tools"><button class="mini-btn" data-edit-budget="${item.id}" title="Editar la partida" aria-label="Editar ${text(item.concepto)}">${icono("editar")}</button><button class="mini-btn danger-text" data-delete-item="budget:${item.id}" title="Borrar la partida" aria-label="Borrar ${text(item.concepto)}">${icono("cerrar")}</button></div>`}
        </div>
      </header>

      ${
        // La línea que antes no existía: contratado frente a repartido. Si no
        // cuadra se dice aquí, junto a los pagos, que es donde se arregla.
        mostrarPlazos && Math.abs(resto) >= 1
          ? `<p class="partida-reparto${resto > 0 ? " falta" : " sobra"}">
              Repartido en pagos <b>${text(formatPriceExact(repartido))}</b> de <b>${text(formatPriceExact(total))}</b> —
              ${resto > 0 ? `quedan <b>${text(formatPriceExact(resto))}</b> sin asignar a ningún plazo` : `los plazos suman <b>${text(formatPriceExact(-resto))}</b> más que el coste`}
            </p>`
          : ""
      }

      ${mostrarPlazos ? `<div class="plazos">${PLAZOS.map(({ id, label }) => renderPlazo(item, id, label, plazos[id], soloLectura)).join("")}</div>` : ""}
    </article>
  `;
}

function renderPlazo(item, plazoId, label, pago, soloLectura) {
  const tot = totalPago(pago);
  const vacio = !tot;
  const pagado = pago?.estado === "Pagado";
  const anulado = pago?.estado === "Anulado";
  const tarde = esVencido(pago);
  const ultimo = (pago?.historial || [])[0];

  return `
    <div class="plazo${pagado ? " pagado" : ""}${tarde ? " tarde" : ""}${anulado ? " anulado" : ""}${vacio ? " vacio" : ""}">
      <div class="plazo-cab">
        <span class="plazo-nombre">${text(label)}</span>
        ${vacio ? `<span class="plazo-vacio">Sin importe</span>` : badge(pago.estado, pagado ? "verde" : tarde ? "rojo" : "mostaza")}
      </div>

      ${
        vacio
          ? `<p class="plazo-nada">${soloLectura ? "Todavía sin definir." : "Todavía no se ha definido este pago."}</p>`
          : `<div class="plazo-cifras">
              <div><span>A · facturado</span><strong>${text(formatPriceExact(facturadoPago(pago)))}</strong><small>base ${text(formatPriceExact(baseA(pago)))} + ${text(pago.ivaPorcentaje ?? IVA_POR_DEFECTO)} % IVA</small></div>
              <div><span>B · no facturado</span><strong>${text(formatPriceExact(Number(pago.importeB) || 0))}</strong></div>
              <div class="plazo-total"><span>Total</span><strong>${text(formatPriceExact(tot))}</strong></div>
            </div>
            <p class="plazo-vence ${tarde ? "rt-tarde" : ""}">${
              pago.vence ? `${tarde ? "Debía pagarse el" : "Vence el"} ${text(formatDate(pago.vence))}` : "Sin fecha de vencimiento"
            }</p>`
      }

      <div class="plazo-pie">
        ${
          pago?.justificante
            ? `<button class="mini-btn" data-ver-justificante="${item.id}:${plazoId}" title="${text(pago.justificante.name || "Justificante")}">▤ Justificante</button>`
            : `<span class="plazo-sin-just">Sin justificante</span>`
        }
        ${
          soloLectura
            ? ""
            : `<div class="inline-tools">
                ${vacio ? "" : `<button class="mini-btn ${pagado ? "sage done" : ""}" data-toggle-pago="${item.id}:${plazoId}">${pagado ? "↺ Reabrir" : "✓ Pagado"}</button>`}
                <button class="mini-btn" data-editar-pago="${item.id}:${plazoId}" title="Rellenar o cambiar este pago" aria-label="Editar ${text(label)} de ${text(item.concepto)}">${icono("editar")}</button>
              </div>`
        }
      </div>

      ${
        ultimo
          ? `<p class="plazo-traza" title="${text(fechaHora(ultimo.at))}">${text(ultimo.by)} · ${text(ultimo.que)} · ${text(cuando(ultimo.at))}</p>`
          : ""
      }
    </div>
  `;
}

export {
  IVA_POR_DEFECTO,
  ESTADOS_PAGO,
  PLAZOS,
  baseA,
  budgetGlobalSummary,
  budgetItems,
  budgetSummary,
  costeDe,
  costeDerivado,
  createBudgetFromModal,
  editBudgetItem,
  editarPago,
  esProximo,
  esVencido,
  evolucionPresupuesto,
  facturadoPago,
  guardarPago,
  ivaDe,
  migrarAvisosDePago,
  newBudgetItem,
  objetivoGlobal,
  opcionesProveedor,
  plazosDe,
  renderBudgetTab,
  saveBudgetTarget,
  setBudgetTarget,
  togglePagado,
  totalPago,
  totalPartida,
  updateBudgetFromModal,
  verJustificante,
};
