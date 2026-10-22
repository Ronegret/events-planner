import { addActivity, fileToAttachment, openFormModal, storageBlobUrl } from "./modals.js";
import { render } from "./render.js";
import { byWeddingId, formatDate, saveState, state, text, toast, uid } from "./state.js";
import { formatPrice } from "./views.js";

// ============================================================================
// Pagos + comprobantes
// ----------------------------------------------------------------------------
// "payments"  = avisos de un importe a pagar que crea el equipo (NO es una
//               pasarela de cobro real, es un registro + notificacion).
// "receipts"  = comprobantes (transferencia, efectivo...) que puede subir
//               tanto el equipo como los propios novios desde el portal,
//               opcionalmente enlazados a un aviso de pago concreto.
// Ambos son visibles para equipo Y novios — es dinero de la boda, ambos lados
// deben ver lo mismo.
// ============================================================================

function newPayment() {
  if (!state.selectedWeddingId && !state.portalWeddingId) return;
  openFormModal({
    intent: "create-payment",
    title: "Nuevo aviso de pago",
    kicker: "Pagos",
    submitLabel: "Crear aviso",
    values: { fecha: new Date().toISOString().slice(0, 10) },
    fields: [
      { name: "concepto", label: "Concepto", required: true, placeholder: "Ej. Segundo plazo, señal, extra flores..." },
      { name: "importe", label: "Importe (€)", type: "number", required: true },
      { name: "fecha", label: "Fecha límite", type: "date" },
    ],
  });
}

function createPaymentFromModal(values) {
  const weddingId = state.portalMode ? state.portalWeddingId : state.selectedWeddingId;
  const payment = {
    id: uid("pay"),
    weddingId,
    concepto: values.concepto?.toString().trim() || "Pago",
    importe: Number(values.importe) || 0,
    fecha: values.fecha?.toString() || "",
    estado: "Pendiente",
    creadoPor: state.user?.name || "Equipo",
    notificadoAt: new Date().toISOString(),
  };
  state.payments.push(payment);
  addActivity(`Creó aviso de pago: ${payment.concepto} (${formatPrice(payment.importe)})`, state.user?.name, weddingId);
  state.modal = null;
  saveState();
  render();
}

function markPaymentPaid(id) {
  const payment = state.payments.find((p) => p.id === id);
  if (!payment) return;
  payment.estado = payment.estado === "Pagado" ? "Pendiente" : "Pagado";
  addActivity(`${payment.estado === "Pagado" ? "Marcó como pagado" : "Reabrió"}: ${payment.concepto}`, state.portalUnlocked ? "Portal de novios" : state.user?.name, payment.weddingId);
  saveState();
  render();
}

function newReceipt() {
  if (!state.selectedWeddingId && !state.portalWeddingId) return;
  const weddingId = state.portalMode ? state.portalWeddingId : state.selectedWeddingId;
  const pendingPayments = byWeddingId("payments", weddingId).filter((p) => p.estado === "Pendiente");
  openFormModal({
    intent: "create-receipt",
    title: "Subir comprobante",
    kicker: "Pagos",
    submitLabel: "Guardar comprobante",
    values: { fecha: new Date().toISOString().slice(0, 10), tipo: "Transferencia" },
    fields: [
      { name: "concepto", label: "Concepto", required: true, placeholder: "Ej. Transferencia señal boda" },
      { name: "importe", label: "Importe (€)", type: "number", required: true },
      { name: "tipo", label: "Tipo", options: ["Transferencia", "Efectivo", "Otro"] },
      { name: "fecha", label: "Fecha", type: "date" },
      ...(pendingPayments.length ? [{ name: "paymentConcepto", label: "Aviso de pago relacionado (opcional)", options: ["", ...pendingPayments.map((p) => p.concepto)] }] : []),
      { name: "attachmentFile", label: "Adjuntar comprobante (foto o PDF)", type: "file", accept: ".pdf,.jpg,.jpeg,.png,.webp", required: true, wide: true, help: "Máximo recomendado: 3 MB." },
      { name: "notes", label: "Observación (opcional)", type: "textarea", wide: true, help: "Ej. \"Transferencia hecha hoy, tarda 1-2 días en aparecer\"." },
    ],
  });
}

async function createReceiptFromModal(values) {
  const weddingId = state.portalMode ? state.portalWeddingId : state.selectedWeddingId;
  const id = uid("rcp");
  const wedding = state.weddings.find((w) => w.id === weddingId);
  const attachment = await fileToAttachment(values.attachmentFile, { storageWeddingId: wedding?.storageWeddingId, documentId: id });
  const linkedPayment = values.paymentConcepto ? state.payments.find((p) => p.weddingId === weddingId && p.concepto === values.paymentConcepto && p.estado === "Pendiente") : null;
  const fromPortal = state.portalMode;
  const receipt = {
    id,
    weddingId,
    paymentId: linkedPayment?.id || "",
    concepto: values.concepto?.toString().trim() || "Comprobante",
    importe: Number(values.importe) || 0,
    tipo: values.tipo?.toString() || "Transferencia",
    fecha: values.fecha?.toString() || "",
    notes: values.notes?.toString().trim() || "",
    subidoPor: fromPortal ? `${wedding?.couple || "Novios"} (portal)` : state.user?.name || "Equipo",
    // Si lo suben los novios desde el portal, queda marcado como "sin revisar"
    // para que el equipo lo vea como alerta hasta confirmarlo.
    reviewed: !fromPortal,
    attachment,
  };
  state.receipts.push(receipt);
  if (linkedPayment) linkedPayment.estado = "Pagado";
  addActivity(`Subió comprobante: ${receipt.concepto} (${formatPrice(receipt.importe)})`, receipt.subidoPor, weddingId);
  state.modal = null;
  saveState();
  render();
}

async function openReceiptAttachment(id) {
  const item = state.receipts.find((r) => r.id === id);
  const url = item?.attachment?.dataUrl || (await storageBlobUrl(item?.attachment));
  if (!url) {
    toast("Este comprobante no tiene ningún archivo adjunto.");
    return;
  }
  window.open(url, "_blank", "noopener");
}

function renderPaymentRow(item, editable) {
  const paid = item.estado === "Pagado";
  return `<div class="row"><span class="icon-btn">€</span><div><h4>${text(item.concepto)} <span class="pill">${formatPrice(item.importe)}</span></h4><p>${item.fecha ? `Vence ${formatDate(item.fecha)} · ` : ""}${text(item.estado)}</p></div><div class="inline-tools">${editable ? `<button class="mini-btn ${paid ? "sage done" : "warn"}" data-mark-payment-paid="${item.id}">${paid ? "✓ Pagado" : "Marcar pagado"}</button>` : `<span class="pill">${paid ? "✓ Pagado" : "Pendiente"}</span>`}</div></div>`;
}

function markReceiptReviewed(id) {
  const receipt = state.receipts.find((r) => r.id === id);
  if (!receipt) return;
  receipt.reviewed = true;
  addActivity(`Revisó comprobante: ${receipt.concepto}`, state.user?.name, receipt.weddingId);
  saveState();
  render();
}

function renderReceiptRow(item, staffSide) {
  const unreviewed = staffSide && item.reviewed === false;
  return `<div class="row ${unreviewed ? "rincon-task-list" : ""}"><span class="icon-btn">🧾</span><div><h4>${text(item.concepto)} <span class="pill">${formatPrice(item.importe)}</span>${unreviewed ? ` <span class="pill" style="background:var(--gold);color:#4a3a12">Nuevo</span>` : ""}</h4><p>${text(item.tipo)} · ${formatDate(item.fecha)} · Subido por ${text(item.subidoPor)}${item.notes ? ` · "${text(item.notes)}"` : ""}</p></div><div class="inline-tools">${unreviewed ? `<button class="mini-btn sage" data-mark-receipt-reviewed="${item.id}">✓ Marcar visto</button>` : ""}<button class="btn" data-open-receipt="${item.id}">👁 Ver</button></div></div>`;
}

function renderPaymentsTab() {
  const wedding = state.weddings.find((w) => w.id === state.selectedWeddingId);
  if (!wedding) return "";
  const payments = byWeddingId("payments", wedding.id);
  const receipts = byWeddingId("receipts", wedding.id);
  const unreviewedCount = receipts.filter((r) => r.reviewed === false).length;
  const pendingTotal = payments.filter((p) => p.estado === "Pendiente").reduce((sum, p) => sum + (Number(p.importe) || 0), 0);
  return `
    <section class="panel">
      <div class="section-title">
        <div>
          <h3>Pagos y comprobantes</h3>
          <p>Avisos de pago y justificantes de transferencias o efectivo. Los novios también los ven en su portal.</p>
        </div>
        <div class="actions"><button class="btn" data-action="new-receipt">↑ Comprobante</button><button class="btn primary" data-action="new-payment"><span class="icon-btn">+</span> Nuevo pago</button></div>
      </div>
      ${unreviewedCount ? `<div class="empty" style="border-color:var(--gold);background:rgba(170,162,99,.12)"><strong>${unreviewedCount} comprobante${unreviewedCount > 1 ? "s" : ""} nuevo${unreviewedCount > 1 ? "s" : ""} subido${unreviewedCount > 1 ? "s" : ""} desde el portal</strong>, sin revisar todavía.</div>` : ""}
      ${pendingTotal ? `<div class="empty" style="border-color:var(--gold);background:rgba(170,162,99,.12)"><strong>${formatPrice(pendingTotal)}</strong> pendientes de pago.</div>` : ""}
      <div class="grid cols-2" style="margin-top:16px">
        <section class="subpanel">
          <h4>Avisos de pago</h4>
          <div class="list">${payments.map((p) => renderPaymentRow(p, true)).join("") || `<div class="empty">Aún no hay avisos de pago. Crea el primero cuando toque cobrar algo.</div>`}</div>
        </section>
        <section class="subpanel">
          <h4>Comprobantes subidos</h4>
          <div class="list">${receipts.map((r) => renderReceiptRow(r, true)).join("") || `<div class="empty">Aún no hay comprobantes. Aparecerán aquí cuando se suban.</div>`}</div>
        </section>
      </div>
    </section>
  `;
}

function renderPortalPayments(wedding) {
  const payments = byWeddingId("payments", wedding.id);
  const receipts = byWeddingId("receipts", wedding.id);
  const pending = payments.filter((p) => p.estado === "Pendiente");
  return `
    <section class="panel" style="margin-top:18px">
      <div class="section-title compact">
        <div><h3>Pagos y comprobantes</h3><p>Lo que os pide el equipo y los justificantes que subís de cada pago.</p></div>
        <button class="btn" data-action="new-receipt">Subir comprobante</button>
      </div>
      ${pending.length ? `<div class="empty" style="border-color:var(--gold);background:rgba(170,162,99,.12);margin-top:10px"><strong>Tenéis ${pending.length} pago${pending.length > 1 ? "s" : ""} pendiente${pending.length > 1 ? "s" : ""}</strong> por un total de ${formatPrice(pending.reduce((s, p) => s + (Number(p.importe) || 0), 0))}.</div>` : ""}
      <div class="grid cols-2" style="margin-top:12px">
        <div>
          <h4 style="margin:0 0 8px">Avisos de pago</h4>
          <div class="list">${payments.map((p) => renderPaymentRow(p, false)).join("") || `<div class="empty">No tenéis avisos de pago por ahora.</div>`}</div>
        </div>
        <div>
          <h4 style="margin:0 0 8px">Comprobantes</h4>
          <div class="list">${receipts.map((r) => renderReceiptRow(r, false)).join("") || `<div class="empty">Aún no habéis subido comprobantes.</div>`}</div>
        </div>
      </div>
    </section>
  `;
}

/** Lista compacta: la acción de subida vive arriba, en Presupuesto. */
function renderReceiptsPanel(wedding, staffSide = false) {
  const receipts = byWeddingId("receipts", wedding.id);
  if (!receipts.length) return "";
  const unreviewed = staffSide ? receipts.filter((r) => r.reviewed === false).length : 0;
  return `<section class="panel budget-receipts">
    <div class="panel-head">
      <div><h3 class="card-title">Comprobantes</h3><p class="card-sub">Archivos vinculados a los pagos de esta boda.</p></div>
      <span class="pill">${receipts.length}${unreviewed ? ` · ${unreviewed} sin revisar` : ""}</span>
    </div>
    <div class="list">${receipts.map((r) => renderReceiptRow(r, staffSide)).join("")}</div>
  </section>`;
}

export { createPaymentFromModal, createReceiptFromModal, markPaymentPaid, markReceiptReviewed, newPayment, newReceipt, openReceiptAttachment, renderPaymentsTab, renderPortalPayments, renderReceiptsPanel };
