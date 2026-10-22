import { icono } from "./iconos.js";
import { IMG_CONTRATO } from "./data/contrato-imagenes.js";
import { addActivity, fileToAttachment, openFormModal, storageBlobUrl } from "./modals.js";
import { openPrintDocument } from "./print.js";
import { render } from "./render.js";
import { byWeddingId, formatDate, saveState, state, text, toast, uid } from "./state.js";
import { formatPrice } from "./views.js";
import { badge } from "./charts.js";

// ============================================================================
// Contrato de prestación de servicios + firma digital
// ----------------------------------------------------------------------------
// Un contrato por boda. La coordinadora lo genera (o regenera) a partir de los
// servicios marcados en esa boda -> queda una "fotografía" (servicesSnapshot)
// de título/precio/observación en el momento de generarlo, para que si luego
// se editan los servicios el contrato ya firmado no cambie retroactivamente.
// La firma ocurre del lado del portal: digital (canvas) o "en papel" (la coordinadora
// sube el escaneado como si fuera un documento).
// ============================================================================

function contractFor(weddingId) {
  return state.contracts.find((c) => c.weddingId === weddingId);
}

// ---------------------------------------------------------------------------
// Campos del contrato. La coordinadora los rellena ANTES de generar nada: un
// contrato con [DNI Novio] sin sustituir no sirve para firmar.
// ---------------------------------------------------------------------------
const CONTRACT_FIELDS = [
  { name: "novioNombre", label: "Nombre del novio", required: true },
  { name: "novioDni", label: "DNI del novio", required: true },
  { name: "novioTelefono", label: "Teléfono del novio" },
  { name: "novioEmail", label: "Email del novio", type: "email" },
  { name: "noviaNombre", label: "Nombre de la novia", required: true },
  { name: "noviaDni", label: "DNI de la novia", required: true },
  { name: "noviaTelefono", label: "Teléfono de la novia" },
  { name: "noviaEmail", label: "Email de la novia", type: "email" },
  { name: "domicilio", label: "Domicilio de la pareja", wide: true, required: true },
  { name: "importe", label: "Importe total con IVA (€)", type: "number" },
  { name: "fechaFirma", label: "Fecha de la firma", type: "date" },
];

/** Campos obligatorios que aún faltan por rellenar. */
function missingContractFields(contract) {
  const d = contract?.fields || {};
  return CONTRACT_FIELDS.filter((f) => f.required && !String(d[f.name] || "").trim());
}

function openContractForm(weddingId) {
  const wedding = state.weddings.find((w) => w.id === weddingId);
  if (!wedding) return;
  const contract = contractFor(weddingId);
  // Se precargan los datos que ya tenemos de la boda para no teclear dos veces.
  const previos = contract?.fields || {};
  const [n1, n2] = String(wedding.couple || "").split(/\s*[&y]\s*/i);
  openFormModal({
    intent: "contract-fields",
    itemId: weddingId,
    title: "Datos del contrato",
    kicker: "Contrato",
    submitLabel: "Guardar datos",
    values: {
      ...previos,
      novioNombre: previos.novioNombre || (n1 || "").trim(),
      noviaNombre: previos.noviaNombre || (n2 || "").trim(),
      fechaFirma: previos.fechaFirma || new Date().toISOString().slice(0, 10),
    },
    fields: CONTRACT_FIELDS,
  });
}

function saveContractFields(weddingId, values) {
  const wedding = state.weddings.find((w) => w.id === weddingId);
  if (!wedding) return;
  let contract = contractFor(weddingId);
  if (!contract) {
    contract = { id: uid("ctr"), weddingId, status: "Borrador", fields: {}, annexes: [], history: [] };
    state.contracts.push(contract);
  }
  contract.fields = { ...contract.fields, ...values };
  contract.history = contract.history || [];
  contract.history.push({ at: new Date().toISOString(), by: state.user?.name || "Equipo", what: "Actualizó los datos del contrato" });
  addActivity("Actualizó los datos del contrato", state.user?.name, weddingId);
  state.modal = null;
  saveState();
  render();
}

/** La coordinadora genera el contrato: a partir de aquí los novios ya lo ven. */
function generateContract(weddingId) {
  const wedding = state.weddings.find((w) => w.id === weddingId);
  if (!wedding) return;
  let contract = contractFor(weddingId);
  if (!contract) {
    contract = { id: uid("ctr"), weddingId, status: "Borrador", fields: {}, annexes: [], history: [] };
    state.contracts.push(contract);
  }

  const faltan = missingContractFields(contract);
  if (faltan.length) {
    toast(`Faltan datos para generar el contrato: ${faltan.map((f) => f.label).join(", ")}`, 6000);
    openContractForm(weddingId);
    return;
  }

  const servicios = byWeddingId("services", weddingId);
  contract.servicesSnapshot = servicios.map((s) => ({ title: s.title, price: s.price || 0, notes: s.notes || "" }));
  contract.total = contract.servicesSnapshot.reduce((sum, s) => sum + (Number(s.price) || 0), 0);
  contract.status = "Enviado";
  contract.generatedAt = new Date().toISOString();
  contract.visibleToCouple = true;
  contract.history = contract.history || [];
  contract.history.push({ at: contract.generatedAt, by: state.user?.name || "Equipo", what: "Generó el contrato y lo puso a disposición de los novios" });

  addActivity(`Generó el contrato (${formatPrice(contract.total)}) y ya es visible para los novios`, state.user?.name, weddingId);
  saveState();
  render();
  toast("Contrato generado. Los novios ya lo ven en su portal para firmarlo.", 5000);
}

// ---------------------------------------------------------------------------
// Anexos: servicios añadidos DESPUÉS de firmar. El contrato original no se
// toca nunca — se acumula un anexo con los puntos nuevos marcados.
// ---------------------------------------------------------------------------
function openAnnexForm(weddingId) {
  const contract = contractFor(weddingId);
  if (!contract) return;
  // Solo se ofrecen los servicios que NO estaban en el contrato firmado.
  const yaEnContrato = new Set((contract.servicesSnapshot || []).map((s) => s.title));
  (contract.annexes || []).forEach((a) => a.items.forEach((i) => yaEnContrato.add(i.title)));
  const nuevos = byWeddingId("services", weddingId).filter((s) => !yaEnContrato.has(s.title));

  if (!nuevos.length) {
    toast("No hay servicios nuevos que añadir. Créalos primero en la pestaña Servicios.", 5000);
    return;
  }
  state.annexDraft = nuevos.map((s) => ({ id: s.id, title: s.title, price: Number(s.price) || 0, notes: s.notes || "", checked: false }));
  state.modal = { type: "annex", weddingId };
  render();
}

function toggleAnnexItem(id) {
  const item = (state.annexDraft || []).find((i) => i.id === id);
  if (!item) return;
  item.checked = !item.checked;
  render();
}

function confirmAnnex(weddingId) {
  const contract = contractFor(weddingId);
  const elegidos = (state.annexDraft || []).filter((i) => i.checked);
  if (!contract || !elegidos.length) {
    toast("Marca al menos un servicio para incluirlo en el anexo");
    return;
  }
  contract.annexes = contract.annexes || [];
  contract.annexes.push({
    id: uid("anx"),
    date: new Date().toISOString(),
    items: elegidos.map(({ title, price, notes }) => ({ title, price, notes })),
    note: "",
    signatureDataUrl: null,
  });
  contract.history = contract.history || [];
  contract.history.push({
    at: new Date().toISOString(),
    by: state.user?.name || "Equipo",
    what: `Añadió el anexo ${contract.annexes.length} con ${elegidos.length} servicio${elegidos.length === 1 ? "" : "s"}`,
  });
  addActivity(`Creó el anexo ${contract.annexes.length} del contrato (${elegidos.length} servicios nuevos)`, state.user?.name, weddingId);
  state.annexDraft = null;
  state.modal = null;
  saveState();
  render();
  toast("Anexo creado. Los novios lo verán junto al contrato para firmarlo.", 5000);
}

// ---------------------------------------------------------------------------
// Entrega del contrato firmado
// ---------------------------------------------------------------------------
// Todo ocurre dentro del portal: los novios suben el documento firmado aquí y
// La coordinadora lo descarga desde la misma sección. Nada sale por correo — así el
// contrato vive en un único sitio y ninguna de las dos partes tiene que
// buscarlo en su bandeja de entrada meses después.

function openContractUpload(weddingId) {
  const contract = contractFor(weddingId);
  if (!contract) return;
  openFormModal({
    intent: "contract-upload",
    itemId: weddingId,
    title: "Subir el contrato firmado",
    kicker: "Contrato",
    submitLabel: "Subir documento",
    values: {},
    fields: [
      {
        name: "documento",
        label: "Documento firmado",
        type: "file",
        accept: ".pdf,.jpg,.jpeg,.png",
        wide: true,
        help: "Podéis subir el PDF firmado o una foto nítida de las hojas firmadas.",
      },
      { name: "nota", label: "¿Queréis añadir algo?", placeholder: "Opcional", wide: true },
    ],
  });
}

async function uploadSignedContract(weddingId, values) {
  const wedding = state.weddings.find((w) => w.id === weddingId);
  const contract = contractFor(weddingId);
  if (!wedding || !contract) return;

  const attachment = await fileToAttachment(values.documento, {
    storageWeddingId: weddingId,
    documentId: `contrato-${contract.id}`,
  });
  if (!attachment) {
    toast("Elige el archivo del contrato firmado para subirlo");
    return;
  }

  contract.uploads = contract.uploads || [];
  contract.uploads.push({
    id: uid("up"),
    ...attachment,
    note: String(values.nota || "").trim(),
    uploadedBy: state.portalMode ? wedding.couple : state.user?.name || "Equipo",
    uploadedAt: new Date().toISOString(),
  });
  contract.receivedAt = new Date().toISOString();
  contract.history = contract.history || [];
  contract.history.push({
    at: contract.receivedAt,
    by: state.portalMode ? wedding.couple : state.user?.name || "Equipo",
    what: "Subió el contrato firmado al portal",
  });

  addActivity(
    state.portalMode ? "Los novios han subido el contrato firmado al portal" : "Subió el contrato firmado",
    state.portalMode ? wedding.couple : state.user?.name,
    weddingId
  );
  state.modal = null;
  saveState();
  render();
  toast(
    state.portalMode
      ? "¡Recibido! El equipo de Events Planner ya tiene vuestro contrato firmado."
      : "Documento guardado en la ficha del contrato.",
    5000
  );
}

/** Descarga un documento subido, desde cualquiera de las dos partes. */
async function downloadContractUpload(ref) {
  const [weddingId, uploadId] = String(ref).split(":");
  const contract = contractFor(weddingId);
  const doc = (contract?.uploads || []).find((u) => u.id === uploadId);
  if (!doc) return;
  const url = doc.dataUrl || (await storageBlobUrl(doc));
  if (!url) {
    toast("No se encuentra el archivo");
    return;
  }
  const a = document.createElement("a");
  a.href = url;
  a.download = doc.name || "contrato-firmado";
  a.click();
}

function deleteContractUpload(ref) {
  const [weddingId, uploadId] = String(ref).split(":");
  const contract = contractFor(weddingId);
  if (!contract) return;
  contract.uploads = (contract.uploads || []).filter((u) => u.id !== uploadId);
  if (!contract.uploads.length) contract.receivedAt = null;
  saveState();
  render();
}

/** Lista de documentos subidos, común a las dos vistas. */
function renderContractUploads(wedding, contract, { canDelete = false } = {}) {
  const docs = contract.uploads || [];
  if (!docs.length) return "";
  return `
    <div class="contract-uploads">
      <h4 class="contract-uploads-title">Documentos firmados · ${docs.length}</h4>
      ${docs
        .map(
          (d) => `<div class="contract-upload">
            <span class="contract-upload-ico">▤</span>
            <div class="contract-upload-body">
              <strong>${text(d.name)}</strong>
              <small>Subido por ${text(d.uploadedBy)} · ${formatDate(d.uploadedAt)}</small>
              ${d.note ? `<small class="contract-upload-note">${text(d.note)}</small>` : ""}
            </div>
            <div class="inline-tools">
              <button class="mini-btn" data-download-contract="${wedding.id}:${d.id}" title="Descargar">↓ Descargar</button>
              ${canDelete ? `<button class="mini-btn danger-text" data-delete-contract-upload="${wedding.id}:${d.id}" title="Eliminar" aria-label="Eliminar ${text(d.name)}">${icono("cerrar")}</button>` : ""}
            </div>
          </div>`
        )
        .join("")}
    </div>
  `;
}

function markContractSent(weddingId) {
  const contract = contractFor(weddingId);
  if (!contract) return;
  if (contract.status === "Borrador") contract.status = "Enviado";
  addActivity("Marcó el contrato como enviado a los novios", state.user?.name, weddingId);
  saveState();
  render();
}

function signContractDigital(weddingId, dataUrl, signerName) {
  const contract = contractFor(weddingId);
  if (!contract) return;
  contract.status = "Firmado";
  contract.signature = { type: "digital", dataUrl, signedBy: signerName || "Novios", signedAt: new Date().toISOString() };
  addActivity(`Firmó el contrato digitalmente: ${signerName || "Novios"}`, state.portalUnlocked ? "Portal de novios" : state.user?.name, weddingId);
  saveState();
  render();
}

function markContractSignedPaper(weddingId) {
  const contract = contractFor(weddingId);
  if (!contract) return;
  contract.status = "Firmado";
  contract.signature = { type: "papel", dataUrl: null, signedBy: "Firma en papel", signedAt: new Date().toISOString() };
  addActivity("Marcó el contrato como firmado en papel", state.user?.name, weddingId);
  saveState();
  render();
}

// ============================================================================
// Contrato de prestación de servicios — Events Planner (DEMOSTRACIÓN)
// ----------------------------------------------------------------------------
// Texto genérico de ejemplo, sin valor legal. Las doce cláusulas viven en un
// solo sitio (clausulasHtml): solo se sustituyen los campos entre corchetes
// por los datos de cada boda. Si el texto cambia, se cambia aquí y en ningún
// otro sitio.
// ============================================================================

// DATOS DE DEMOSTRACIÓN. Ninguno es real.
//
// El DNI 00000000T es el ejemplo canónico (la letra corresponde, pero el número
// no está asignado a nadie) y el IBAN a ceros no pasa el dígito de control, así
// que ningún sistema lo aceptará por accidente.
const EP_LEGAL = {
  representante: "Doña Noa Ferrer Vilanova",
  dni: "00000000T",
  sede: "C/ Ejemplo 1, 08000 Barcelona",
  iban: "ES00 0000 0000 0000 0000 0000",
  titular: "Estudio Demo S.L.",
  email: "rodrigo.negrete.aros@gmail.com",
  emailGestion: "rodrigo.negrete.aros@gmail.com",
  telefono: "(+34) 653 567 610",
  web: "https://www.example.com",
  ciudadFirma: "BARCELONA",
};

/** Cuerpo del contrato: las doce cláusulas de demostración. */

/**
 * Las doce cláusulas del contrato de ejemplo de Events Planner.
 * Se usan tal cual en pantalla y en el documento impreso: una sola fuente de
 * verdad, porque si el texto se duplicara acabarían divergiendo.
 * Texto genérico de demostración: no es asesoramiento legal.
 */
function clausulasHtml(wedding, contract, campo) {
  const d = contract.fields || {};
  const servicios = byWeddingId("services", wedding.id);
  const importe = Number(d.importe) || servicios.reduce((s, x) => s + (Number(x.price) || 0), 0);
  return `
    <section class="c-cl">
      <h3><span>Primera</span>Objeto del contrato</h3>
      <p>El CLIENTE encarga a “Events Planner” la planificación, la coordinación y la supervisión de su boda o evento. Estos son los servicios contratados:</p>
      <div class="c-servicios">
        ${
          servicios.length
            ? `<ul>${servicios.map((s) => `<li>${text(s.title)}${s.notes ? ` — ${text(s.notes)}` : ""}</li>`).join("")}</ul>`
            : `<em class="c-hueco">[DETALLE SERVICIOS CONTRATADOS]</em>`
        }
      </div>
      <h4>Lugar y fecha de celebración</h4>
      <p>La celebración está prevista para el ${campo(wedding.date ? formatDate(wedding.date) : "", "FECHA BODA")} en ${campo(wedding.venue, "LUGAR BODA")}. Si cambiaran la fecha o el lugar, se aplicará lo dispuesto en la cláusula Séptima.</p>
    </section>

    <section class="c-cl">
      <h3><span>Segunda</span>Servicios incluidos y duración</h3>
      <p>Events Planner prestará únicamente los servicios indicados en la cláusula anterior y en los anexos que se firmen después. Lo que no figure por escrito se considera fuera del encargo.</p>
      <p>El trabajo empieza el día de la firma y termina cuando acaba la celebración. Durante ese tiempo, el equipo acordará con el CLIENTE un calendario de reuniones, presenciales o en línea, para ir cerrando los detalles paso a paso.</p>
      <p>El día del evento, el equipo estará presente desde la preparación hasta el cierre acordado en el plan de trabajo, para coordinar a los proveedores y cuidar que todo siga el timing previsto.</p>
      <p>El contrato empieza a producir efectos cuando se paga la reserva indicada en la cláusula siguiente.</p>
    </section>

    <section class="c-cl">
      <h3><span>Tercera</span>Precio y calendario de pagos</h3>
      <p>Por los servicios descritos, el CLIENTE pagará a Events Planner la cantidad de <b>${importe ? formatPrice(importe) : `<em class="c-hueco">[IMPORTE TOTAL CON IVA]</em>`}</b> (IVA incluido), repartida en dos pagos:</p>
      <ul>
        <li>40 % del total al firmar este contrato, como reserva de la fecha.</li>
        <li>60 % restante, 30 días antes de la celebración.</li>
      </ul>
      <p>Los pagos se harán por transferencia a la cuenta <b>${EP_LEGAL.iban}</b>, de la que es titular ${EP_LEGAL.titular}, indicando en el concepto el nombre de la pareja.</p>
      <p>Los servicios extra que el CLIENTE pida después de firmar se presupuestarán antes de empezar y se incorporarán por escrito mediante un anexo. Su importe se sumará al total anterior.</p>
      <p>Los gastos de desplazamiento, alojamiento y manutención del equipo fuera de la zona habitual de trabajo no están incluidos. Se comunicarán y se acordarán por escrito antes de incurrir en ellos.</p>
    </section>

    <section class="c-cl">
      <h3><span>Cuarta</span>Responsabilidades de Events Planner</h3>
      <p>Events Planner se compromete a:</p>
      <ul>
        <li>Prestar los servicios con la diligencia propia de un profesional del sector y en los plazos acordados.</li>
        <li>Mantener informado al CLIENTE del avance de la organización y de cualquier incidencia relevante.</li>
        <li>Preparar con el CLIENTE el timing del día y compartirlo con los proveedores implicados.</li>
        <li>Pedir autorización al CLIENTE antes de asumir cualquier gasto o compromiso en su nombre.</li>
      </ul>
      <p>Events Planner no responde de los retrasos, los fallos o los incumplimientos de proveedores que no haya contratado directamente, salvo que hayan sido causados por un error de su propia coordinación.</p>
    </section>

    <section class="c-cl">
      <h3><span>Quinta</span>Responsabilidades del cliente</h3>
      <p>El CLIENTE se compromete a:</p>
      <ul>
        <li>Facilitar a tiempo la información y las decisiones que el equipo necesite para avanzar.</li>
        <li>Pagar en las fechas acordadas el precio y los importes de los anexos.</li>
        <li>Avisar cuanto antes de cualquier cambio que afecte al plan, como el número de invitados, el horario o el lugar.</li>
        <li>Garantizar que tiene derecho a usar los materiales, las canciones o los objetos personales que aporte para la celebración.</li>
      </ul>
      <p>Si el CLIENTE tarda en decidir y eso retrasa la organización, Events Planner no responderá de las consecuencias de ese retraso.</p>
    </section>

    <section class="c-cl">
      <h3><span>Sexta</span>Proveedores externos</h3>
      <p>Events Planner puede proponer proveedores (espacio, catering, fotografía, música, flores u otros), pero es el CLIENTE quien decide si los contrata.</p>
      <p>Cada contrato con un proveedor se firma entre el CLIENTE y ese proveedor. El CLIENTE le paga directamente y es responsable de cumplir sus condiciones. Events Planner no es parte de esos contratos ni responde de su cumplimiento, aunque colabore en su coordinación.</p>
    </section>

    <section class="c-cl">
      <h3><span>Séptima</span>Modificaciones</h3>
      <p>Cualquier cambio sobre lo pactado (servicios, fecha, lugar, precio o calendario de pagos) debe acordarse por escrito entre las dos partes. Un mensaje o un correo electrónico de ambas partes sirve como constancia.</p>
      <p>Si el cambio supone más trabajo o más costes, Events Planner lo presupuestará antes de aplicarlo. Si el CLIENTE lo acepta, se recogerá en un anexo a este contrato.</p>
    </section>

    <section class="c-cl">
      <h3><span>Octava</span>Cancelación y desistimiento</h3>
      <p>El CLIENTE puede cancelar el contrato comunicándolo por escrito a ${EP_LEGAL.emailGestion}. Según cuándo lo haga, deberá abonar:</p>
      <ul>
        <li>Con más de 90 días de antelación a la celebración: la reserva ya abonada, que cubre el trabajo realizado y la fecha bloqueada.</li>
        <li>Entre 90 y 30 días antes: el 70 % del precio total.</li>
        <li>Con menos de 30 días: el 100 % del precio total.</li>
      </ul>
      <p>Si el contrato se firma a distancia, el CLIENTE, como consumidor, puede desistir sin dar explicaciones en los 14 días naturales siguientes a la firma, según la normativa de consumidores. Si ya ha pedido que el trabajo empiece dentro de ese plazo, deberá pagar la parte proporcional de lo prestado hasta que comunique su decisión.</p>
      <p>Si es Events Planner quien cancela, devolverá al CLIENTE todo lo recibido por los servicios que no se hayan prestado, y le ayudará a encontrar una alternativa.</p>
      <p>Cualquiera de las partes puede resolver el contrato si la otra incumple gravemente sus obligaciones y no lo remedia en un plazo de 10 días desde que se le avise por escrito.</p>
    </section>

    <section class="c-cl">
      <h3><span>Novena</span>Fuerza mayor</h3>
      <p>Ninguna de las partes responderá por no cumplir sus obligaciones si la causa es un hecho imprevisible o inevitable ajeno a su control, como una catástrofe natural, una orden de las autoridades, una pandemia, una huelga general o el cierre inesperado del espacio.</p>
      <p>La parte afectada avisará a la otra lo antes posible. Buscarán juntas una nueva fecha o una alternativa viable, y los pagos ya hechos se aplicarán a ella. Si no se llega a un acuerdo en 60 días, cualquiera de las partes podrá resolver el contrato, y Events Planner devolverá lo cobrado por los servicios aún no prestados.</p>
      <p>Si un miembro del equipo no puede asistir por enfermedad u otra causa justificada, Events Planner lo sustituirá por otra persona con experiencia equivalente.</p>
    </section>

    <section class="c-cl">
      <h3><span>Décima</span>Protección de datos y confidencialidad</h3>
      <p>Events Planner tratará los datos personales del CLIENTE conforme al Reglamento (UE) 2016/679 (RGPD) y a la Ley Orgánica 3/2018. La finalidad es ejecutar este contrato y cumplir las obligaciones legales; la base legal es la propia relación contractual.</p>
      <p>Los datos se conservarán mientras dure la relación y, después, durante los plazos que exija la ley. Solo se compartirán con terceros cuando sea imprescindible para prestar el servicio (por ejemplo, con los proveedores que el CLIENTE haya elegido) o cuando una norma lo exija.</p>
      <p>El CLIENTE puede ejercer sus derechos de acceso, rectificación, supresión, limitación, oposición y portabilidad escribiendo a ${EP_LEGAL.emailGestion}. También puede reclamar ante la Agencia Española de Protección de Datos (AEPD).</p>
      <p>Cada parte mantendrá en secreto la información privada que reciba de la otra y solo la usará para este encargo. Esta obligación continúa después de terminar el contrato.</p>
    </section>

    <section class="c-cl">
      <h3><span>Undécima</span>Derechos de imagen</h3>
      <p>Events Planner podrá usar fotografías y vídeos de la celebración en su portfolio, su web y sus redes sociales solo si el CLIENTE lo autoriza expresamente por escrito.</p>
      <p>El CLIENTE puede retirar esa autorización cuando quiera comunicándolo a ${EP_LEGAL.emailGestion}. Events Planner dejará de usar el material en los nuevos usos, sin que eso afecte a lo ya publicado antes de la retirada.</p>
    </section>

    <section class="c-cl">
      <h3><span>Duodécima</span>Ley aplicable y jurisdicción</h3>
      <p>Este contrato se rige por la legislación española. Las partes intentarán resolver cualquier desacuerdo hablando entre ellas durante un plazo de 30 días desde que una avise a la otra por escrito.</p>
      <p>Si no se resuelve, se someten a los juzgados y tribunales de Barcelona, sin perjuicio del fuero que corresponda al CLIENTE si tiene la condición de consumidor.</p>
      <p>Ninguna de las partes podrá ceder este contrato ni los derechos u obligaciones que de él se deriven sin el consentimiento escrito de la otra.</p>
    </section>
  `;
}

function contractBodyHtml(wedding, contract, { paraImprimir = false } = {}) {
  const d = contract.fields || {};
  const campo = (valor, marcador) => (valor ? text(valor) : `<em class="c-hueco">[${marcador}]</em>`);
  const servicios = byWeddingId("services", wedding.id);
  const importe = Number(d.importe) || servicios.reduce((s, x) => s + (Number(x.price) || 0), 0);

  return `
  <article class="contrato">
    <p class="c-aviso" role="note" style="margin:0 0 12px;padding:8px 12px;border:1px solid currentColor;border-radius:6px;font-size:.85em;text-align:center"><strong>Documento de demostración. No es un contrato real ni constituye asesoramiento legal.</strong></p>
    ${
      paraImprimir
        ? ""
        : `<header class="c-cab">
      <img class="c-logo" src="./assets/brand/ep-logo.png" alt="Events Planner" />
      <div class="c-cab-meta">
        <span>Contrato de prestación de servicios</span>
        <strong>${EP_LEGAL.ciudadFirma}, ${campo(d.fechaFirma ? formatDate(d.fechaFirma) : "", "FECHA")}</strong>
      </div>
    </header>`
    }

    <h2 class="c-tit">Reunidos</h2>

    <div class="c-partes">
      <section>
        <h3>De una parte</h3>
        <p><b>NOMBRE NOVIO:</b> ${campo(d.novioNombre, "Nombre Novio")}<br />
        <b>DNI:</b> ${campo(d.novioDni, "DNI Novio")}<br />
        <b>TELÉFONO:</b> ${campo(d.novioTelefono, "TELF NOVIO")}<br />
        <b>EMAIL:</b> ${campo(d.novioEmail, "mail novio")}</p>

        <p><b>NOMBRE NOVIA:</b> ${campo(d.noviaNombre, "Nombre Novia")}<br />
        <b>DNI:</b> ${campo(d.noviaDni, "DNI Novia")}<br />
        <b>TELÉFONO:</b> ${campo(d.noviaTelefono, "TELF NOVIA")}<br />
        <b>EMAIL:</b> ${campo(d.noviaEmail, "mail novia")}</p>

        <p>Mayores de edad, con domicilio en ${campo(d.domicilio, "Dirección")}, en adelante «EL CLIENTE»</p>
      </section>

      <section>
        <h3>Y de otra</h3>
        <p>${EP_LEGAL.representante} mayor de edad, con DNI ${EP_LEGAL.dni}, con sede en ${EP_LEGAL.sede} en adelante denominada “Events Planner”.</p>
      </section>
    </div>

    <h2 class="c-tit">Exponen</h2>
    <p>Las dos partes se reconocen capacidad legal suficiente para firmar este contrato y manifiestan que</p>
    <p>desean celebrar un contrato de PRESTACIÓN DE SERVICIOS de organización de bodas y eventos, que se regirá por las siguientes:</p>

    <h2 class="c-tit">Cláusulas</h2>

    ${clausulasHtml(wedding, contract, campo)}

    ${renderAnexos(wedding, contract)}

    ${paraImprimir ? "" : `<section class="c-firma">
      <h3>Aceptación del acuerdo</h3>
      <p>Y para que conste, lo firman por duplicado y a un solo efecto en lugar y fecha arriba indicados.</p>
      <div class="c-firmas">
        <div class="c-firma-box">
          <span class="c-firma-linea">${
            contract.signatureDataUrl
              ? `<img src="${text(contract.signatureDataUrl)}" alt="Firma del cliente" />`
              : contract.status === "Firmado en papel"
                ? `<em>Firmado en papel</em>`
                : `<em class="c-hueco">[FIRMA CLIENTE]</em>`
          }</span>
          <strong>LOS CLIENTES</strong>
          ${contract.signedAt ? `<small>${formatDate(contract.signedAt)}${contract.signedBy ? ` · ${text(contract.signedBy)}` : ""}</small>` : ""}
        </div>
        <div class="c-firma-box">
          <span class="c-firma-linea"><img src="./assets/brand/ep-logo.png" alt="Events Planner" class="c-firma-sello" /></span>
          <strong>EVENTS PLANNER</strong>
          <small>${EP_LEGAL.representante}</small>
        </div>
      </div>
    </section>`}

    <p class="c-aviso" role="note" style="margin:12px 0 0;padding:8px 12px;border:1px solid currentColor;border-radius:6px;font-size:.85em;text-align:center"><strong>Documento de demostración. No es un contrato real ni constituye asesoramiento legal.</strong></p>
    ${
      paraImprimir
        ? ""
        : `<footer class="c-pie">
      <div><span>Email</span><strong>${EP_LEGAL.email}</strong></div>
      <div><span>Teléfono</span><strong>${EP_LEGAL.telefono}</strong></div>
      <div><span>Web</span><strong>${EP_LEGAL.web}</strong></div>
    </footer>`
    }
  </article>
  `;
}

/** Anexos: los servicios añadidos después de firmar el contrato original. */
function renderAnexos(wedding, contract) {
  const anexos = contract.annexes || [];
  if (!anexos.length) return "";
  return anexos
    .map(
      (a, i) => `
    <section class="c-cl c-anexo">
      <h3><span>Anexo ${i + 1}</span>Ampliación de servicios</h3>
      <p>Con fecha ${formatDate(a.date)}, las partes acuerdan incorporar al contrato de prestación de servicios firmado los siguientes servicios adicionales, cuyo importe se suma a la totalidad ya pactada según la cláusula Tercera:</p>
      <table class="c-tabla">
        <thead><tr><th>Servicio añadido</th><th>Observaciones</th><th>Importe</th></tr></thead>
        <tbody>
          ${a.items.map((it) => `<tr><td>${text(it.title)}</td><td>${text(it.notes || "—")}</td><td>${formatPrice(it.price)}</td></tr>`).join("")}
          <tr class="c-tabla-total"><td colspan="2">Total del anexo</td><td>${formatPrice(a.items.reduce((s, x) => s + (Number(x.price) || 0), 0))}</td></tr>
        </tbody>
      </table>
      ${a.note ? `<p>${text(a.note)}</p>` : ""}
      <div class="c-firmas c-firmas-anexo">
        <div class="c-firma-box">
          <span class="c-firma-linea">${a.signatureDataUrl ? `<img src="${text(a.signatureDataUrl)}" alt="Firma del cliente" />` : `<em class="c-hueco">[FIRMA CLIENTE]</em>`}</span>
          <strong>LOS CLIENTES</strong>
        </div>
        <div class="c-firma-box">
          <span class="c-firma-linea"><img src="./assets/brand/ep-logo.png" alt="" class="c-firma-sello" /></span>
          <strong>EVENTS PLANNER</strong>
        </div>
      </div>
    </section>`
    )
    .join("");
}

function renderContractTab() {
  const wedding = state.weddings.find((w) => w.id === state.selectedWeddingId);
  if (!wedding) return "";
  const contract = contractFor(wedding.id);
  const faltan = missingContractFields(contract);
  const generado = Boolean(contract?.generatedAt);
  const firmado = contract?.status === "Firmado" || contract?.status === "Firmado en papel";

  return `
    <section class="panel">
      <div class="panel-head">
        <div>
          <h3 class="card-title">Contrato de prestación de servicios</h3>
          <p class="card-sub">Un contrato de ejemplo con las condiciones habituales. Rellena los datos, genéralo y los novios podrán firmarlo desde su portal.</p>
        </div>
      </div>

      ${
        // "Datos" y "Generar/Regenerar" son los dos pasos para tener el
        // documento listo (por eso van juntos, en ese orden, a la
        // izquierda); "Descargar PDF" es lo que se hace CON el documento ya
        // generado, así que va aparte y es el botón principal — es la
        // acción más repetida una vez el contrato existe.
        generado
          ? `<div class="contract-actions">
              <div class="contract-actions-setup">
                <button class="btn" data-contract-fields="${wedding.id}">${icono("editar")} Datos</button>
                <button class="btn" data-generate-contract="${wedding.id}">↻ Regenerar</button>
                ${firmado ? `<button class="btn" data-new-annex="${wedding.id}">+ Anexo</button>` : ""}
              </div>
              <button class="btn primary" data-print-contract="${wedding.id}" title="Se abre el diálogo de impresión del navegador — elige «Guardar como PDF» para descargarlo">↓ Descargar PDF</button>
            </div>`
          : `<div class="contract-actions">
              <div class="contract-actions-setup">
                <button class="btn" data-contract-fields="${wedding.id}">${icono("editar")} 1. Rellenar datos</button>
              </div>
              <button class="btn primary" data-generate-contract="${wedding.id}">2. Generar contrato</button>
            </div>`
      }

      ${renderContractSteps(wedding, contract, faltan)}

      ${
        faltan.length
          ? `<div class="contract-alert">
              <strong>Faltan datos obligatorios</strong>
              <p>Para poder generar el contrato necesitamos: ${faltan.map((f) => text(f.label)).join(", ")}.</p>
              <button class="btn primary btn-xs" data-contract-fields="${wedding.id}">Rellenar ahora</button>
            </div>`
          : ""
      }

      ${contract ? contractBodyHtml(wedding, contract) : `<div class="empty">Todavía no hay contrato para esta boda. Empieza por rellenar los datos.</div>`}

      ${contract && !firmado ? `<div class="actions" style="justify-content:flex-start;margin-top:16px"><button class="btn btn-outline" data-mark-contract-signed-paper="${wedding.id}">Marcar como firmado en papel</button></div>` : ""}

      ${
        contract && generado
          ? `<div class="contract-exchange">
              <h4 class="contract-uploads-title">Documentos firmados de los novios</h4>
              ${
                (contract.uploads || []).length
                  ? `<p class="card-sub">Los novios lo han subido a su portal. Descárgalo desde aquí — no llega nada por correo.</p>${renderContractUploads(wedding, contract)}`
                  : `<p class="card-sub">Todavía no han subido el contrato firmado. Aparecerá aquí en cuanto lo hagan, y también en Actividad reciente.</p>
                     <div class="actions" style="justify-content:flex-start;margin-top:12px">
                       <button class="btn btn-outline" data-upload-contract="${wedding.id}">↑ Subirlo yo (llegó en papel)</button>
                     </div>`
              }
            </div>`
          : ""
      }

      ${renderContractHistory(contract)}
    </section>
  `;
}

/** Los cuatro pasos del contrato, siempre visibles: dónde estamos. */
function renderContractSteps(wedding, contract, faltan) {
  const pasos = [
    { n: 1, label: "Datos", done: Boolean(contract) && !faltan.length },
    { n: 2, label: "Generado", done: Boolean(contract?.generatedAt) },
    { n: 3, label: "Firmado", done: contract?.status === "Firmado" || contract?.status === "Firmado en papel" },
    { n: 4, label: "Recibido", done: (contract?.uploads || []).length > 0 },
  ];
  return `
    <ol class="contract-steps">
      ${pasos
        .map(
          (p) => `<li class="${p.done ? "done" : ""}">
            <span class="contract-step-n">${p.done ? "✓" : p.n}</span>
            <span>${text(p.label)}</span>
          </li>`
        )
        .join("")}
    </ol>
  `;
}

/** Trazabilidad: quién hizo qué y cuándo. Nada se pierde. */
function renderContractHistory(contract) {
  const h = contract?.history || [];
  if (!h.length) return "";
  return `
    <details class="contract-history">
      <summary>Historial del contrato · ${h.length} ${h.length === 1 ? "cambio" : "cambios"}</summary>
      <ul>
        ${h
          .slice()
          .reverse()
          .map((e) => `<li><strong>${formatDate(e.at)}</strong> · ${text(e.by)} — ${text(e.what)}</li>`)
          .join("")}
      </ul>
    </details>
  `;
}

function renderPortalContract(wedding) {
  const contract = contractFor(wedding.id);

  // Solo se muestra cuando la coordinadora lo ha generado. Antes de eso, los novios
  // no deben ver un borrador con corchetes sin rellenar.
  if (!contract?.generatedAt || contract.visibleToCouple === false) {
    return `<section class="panel">
      <div class="panel-head"><h3 class="card-title">Vuestro contrato</h3></div>
      <div class="empty">Estamos preparando vuestro contrato. En cuanto esté listo aparecerá aquí y os avisaremos.</div>
    </section>`;
  }

  const firmado = contract.status === "Firmado" || contract.status === "Firmado en papel";

  return `
    <section class="panel portal-contract">
      <div class="panel-head">
        <div>
          <h3 class="card-title">Vuestro contrato</h3>
          <p class="card-sub">Leedlo con calma. Podéis firmarlo aquí mismo o imprimirlo para firmarlo a mano.</p>
        </div>
        ${badge(firmado ? "Firmado" : "Pendiente de firma", firmado ? "verde" : "mostaza")}
      </div>

      ${
        firmado
          ? `<div class="contract-signed-note">
              <strong>✓ Contrato firmado</strong>
              <p>Gracias. Queda guardado aquí para vosotros y para el equipo, siempre disponible.</p>
              <div class="actions" style="justify-content:flex-start;margin-top:12px">
                <button class="btn" data-print-contract="${wedding.id}">↓ Descargar PDF</button>
                <button class="btn primary" data-upload-contract="${wedding.id}">↑ Subir el contrato firmado</button>
              </div>
            </div>`
          : ""
      }

      <div class="contract-exchange">
        <h4 class="contract-uploads-title">Entrega del contrato</h4>
        <p class="card-sub">Todo se queda aquí, en vuestro portal: subís el contrato firmado y el equipo lo recoge desde el mismo sitio. No hace falta enviar nada por correo ni buscarlo meses después en la bandeja de entrada.</p>
        <div class="actions" style="justify-content:flex-start;margin-top:12px">
          <button class="btn primary" data-upload-contract="${wedding.id}">↑ Subir documento firmado</button>
        </div>
        ${renderContractUploads(wedding, contract, { canDelete: true })}
      </div>

      ${contractBodyHtml(wedding, contract)}

      ${
        !firmado
          ? `
            <div class="signature-pad-wrap">
              <label>Firma aquí con el dedo o el ratón</label>
              <canvas id="contract-signature-pad" width="600" height="180"></canvas>
              <div class="actions" style="justify-content:flex-start;margin-top:12px">
                <button class="btn" type="button" data-clear-signature>Borrar y repetir</button>
                <button class="btn primary" type="button" data-save-signature="${wedding.id}">Firmar contrato</button>
                <button class="btn btn-outline" type="button" data-print-contract="${wedding.id}">O imprimir para firmar a mano</button>
              </div>
            </div>
          `
          : ""
      }
    </section>
  `;
}

// ============================================================================
// Imágenes del contrato impreso
// ----------------------------------------------------------------------------
// Imágenes de la marca Events Planner guardadas aquí
// como data URI. Van incrustadas y no como archivos en /assets por dos motivos:
// el documento se imprime en una ventana creada con document.write, donde las
// rutas relativas no siempre resuelven; y así el contrato sale idéntico desde
// localhost, desde una copia en un pendrive o sin conexión.
// Están comprimidas al mínimo que aguanta una impresión A4 decente (~180 KB).
// ============================================================================

/**
 * Contrato impreso de demostración de Events Planner.
 *
 * No es "el contrato con estilos": es el mismo documento que ya usan, con su
 * banda de cabecera fotográfica, el logo arriba a la derecha, el bloque
 * "Reunidos" sobre verde a dos columnas, la firma manuscrita al pie de cada
 * página y la página final con la foto de la pareja y las tarjetas de contacto.
 * Las imágenes se extrajeron del PDF original, así que son literalmente las
 * suyas.
 *
 * La cabecera y la firma van en `position: fixed`: en impresión eso hace que
 * se repitan en todas las páginas sin tener que paginar a mano, que es lo que
 * antes obligaba a cuadrar alturas y acababa cortando texto.
 */
function printContract(weddingId) {
  const wedding = state.weddings.find((w) => w.id === weddingId);
  const contract = contractFor(weddingId);
  if (!wedding || !contract) return;

  // Las imágenes van incrustadas: la ventana de impresión se crea con
  // document.write y las rutas relativas no siempre resuelven ahí.
  const img = (n) => IMG_CONTRATO[n] || "";
  const d = contract.fields || {};
  const campo = (valor, marcador) => (valor ? text(valor) : `<em class="hueco">[${marcador}]</em>`);
  const fechaFirma = d.fechaFirma ? formatDate(d.fechaFirma) : "";

  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8">
<title>Contrato · ${text(wedding.couple)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,300;0,400;0,500;0,700;1,400&display=swap">
<style>
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    font-family: "DM Sans", Arial, sans-serif;
    font-size: 9pt; line-height: 1.55; color: #3a3a34;
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }

  /* Banda de cabecera: fija, así se repite en cada página impresa. */
  .cab {
    position: fixed; top: 0; left: 0; right: 0; height: 26mm; z-index: 5;
    background: url("${img("cabecera")}") center 42% / cover no-repeat #6d6d68;
    display: flex; align-items: center; justify-content: space-between;
    padding: 0 12mm 0 16mm;
  }
  .cab::after {
    content: ""; position: absolute; inset: 0;
    background: linear-gradient(90deg, rgba(30,30,26,.45), rgba(30,30,26,.15) 55%, rgba(30,30,26,.35));
  }
  .cab h1 {
    position: relative; z-index: 2; margin: 0;
    font-size: 14pt; font-weight: 400; font-style: italic; color: #fff;
    letter-spacing: .01em; text-shadow: 0 1px 6px rgba(0,0,0,.35);
  }
  .cab img { position: relative; z-index: 2; width: 27mm; }

  /* Firma manuscrita al pie de cada página, como en el original. */
  .aviso-cab { position: absolute; left: 16mm; right: 45mm; bottom: 2mm; z-index: 3; margin: 0; font-size: 7pt; color: #fff; text-shadow: 0 1px 4px rgba(0,0,0,.5); }
  .aviso-pie { position: fixed; bottom: 4mm; left: 16mm; right: 56mm; z-index: 5; margin: 0; font-size: 7pt; color: #56564e; }
  /* El monograma, pequeño y en el margen: así acompaña cada página sin tapar el texto. */
  .rubrica { position: fixed; bottom: 6mm; right: 14mm; width: 12mm; opacity: .6; z-index: 5; }

  .hoja { padding: 26mm 16mm 20mm; }

  /* ── Reunidos: bloque verde a dos columnas ───────────────────────────── */
  .reunidos {
    background: #9aa283; color: #f7f6f1;
    margin: 0 -16mm; padding: 9mm 16mm 10mm;
  }
  .reunidos h2 { margin: 0 0 5mm; font-size: 17pt; font-weight: 400; color: #fff; }
  .reunidos .cols { display: flex; gap: 12mm; }
  .reunidos .col { flex: 1; }
  .reunidos h3 {
    margin: 0 0 3mm; font-size: 9.5pt; font-weight: 500; color: #fff;
    text-transform: uppercase; letter-spacing: .06em;
    border-bottom: .4pt solid rgba(255,255,255,.5); padding-bottom: 1.5mm;
  }
  .reunidos p { margin: 0 0 4mm; font-size: 8.5pt; }
  .reunidos b { font-weight: 700; color: #fff; }
  .ciudad { text-align: right; font-size: 8.5pt; margin: 0 0 4mm; letter-spacing: .04em; }
  .hueco { font-style: italic; opacity: .85; }

  /* ── Cláusulas ───────────────────────────────────────────────────────── */
  .clausulas { padding-top: 9mm; }
  .clausulas > h2 {
    margin: 0 0 6mm; font-size: 10pt; font-weight: 400; color: #6f6f66;
    text-transform: uppercase; letter-spacing: .12em;
    border-bottom: .4pt solid #cfcabc; padding-bottom: 2mm;
  }
  /* Las cláusulas reutilizan el marcado de la vista (.c-cl) para no duplicar
     el texto legal; aquí solo cambia el vestido. */
  .c-cl { page-break-inside: avoid; margin-bottom: 8mm; }
  .c-cl h3 { margin: 0 0 2.5mm; font-size: 9.5pt; font-weight: 700; text-transform: uppercase; letter-spacing: .02em; }
  .c-cl h3 > span {
    display: block; font-size: 8pt; font-weight: 400; color: #8a8a80;
    text-transform: uppercase; letter-spacing: .12em;
    border-bottom: .4pt solid #cfcabc; padding-bottom: 1.5mm; margin-bottom: 3mm;
  }
  .c-cl h4 { margin: 5mm 0 2mm; font-size: 9pt; font-weight: 700; text-transform: uppercase; color: #56603f; }
  .c-cl p { margin: 0 0 2.5mm; }
  .c-cl ul { margin: 0 0 2.5mm; padding-left: 5mm; }
  .c-cl li { margin-bottom: 1mm; }
  .c-hueco, .hueco { font-style: italic; color: #8a8a80; }
  .c-servicios ul { margin: 0 0 2.5mm; padding-left: 5mm; }
  .c-anexo { page-break-inside: avoid; margin-bottom: 8mm; }
  table { width: 100%; border-collapse: collapse; font-size: 8.5pt; margin: 2mm 0 3mm; }
  th, td { padding: 1.8mm 2.5mm; border-bottom: .4pt solid #dcd7ca; text-align: left; }
  thead th { background: #9aa283; color: #fff; font-weight: 500; border: 0; }

  .banda-novios {
    height: 62mm; margin: 6mm -16mm 0;
    background: url("${img("novios")}") center 40% / cover no-repeat;
    page-break-inside: avoid;
  }

  /* ── Página final ────────────────────────────────────────────────────── */
  .cierre { page-break-before: always; position: relative; height: 297mm; overflow: hidden; }
  .cierre-foto {
    position: absolute; left: 0; right: 0; bottom: 0; height: 55%;
    background: url("${img("cierre")}") center 30% / cover no-repeat;
  }
  .aceptacion { position: relative; padding: 34mm 16mm 0; }
  .aceptacion h2 { margin: 0 0 3mm; font-size: 15pt; font-weight: 400; color: #3a3a34; }
  .aceptacion > p { margin: 0 0 10mm; font-size: 8pt; color: #6f6f66; max-width: 62mm; line-height: 1.5; }
  .firmas { display: flex; gap: 14mm; }
  .firma { flex: 1; }
  .firma .rotulo {
    display: block; padding-bottom: 2mm; border-bottom: .5pt solid #8f8f85;
    font-size: 9pt; letter-spacing: .04em; color: #4a4a42;
  }
  .firma.der .rotulo { text-align: right; }
  .firma .espacio {
    display: flex; align-items: center; justify-content: center;
    height: 22mm; margin-top: 3mm; font-size: 8.5pt; color: #6f6f66;
  }
  .firma .espacio img { max-height: 20mm; max-width: 100%; }

  .tarjetas {
    position: absolute; left: 18mm; bottom: 30mm; z-index: 2;
    display: grid; grid-template-columns: 32mm 32mm; gap: .6mm;
  }
  .tj { padding: 6mm 5mm; color: #fff; min-height: 30mm; }
  .tj .ico { font-size: 13pt; display: block; margin-bottom: 3mm; }
  .tj h4 { margin: 0 0 2mm; font-size: 10.5pt; font-weight: 400; border-bottom: .4pt solid rgba(255,255,255,.55); padding-bottom: 2mm; }
  .tj p { margin: 0; font-size: 7.5pt; }
  .tj-gris  { background: #9a9a90; }
  .tj-verde { background: #56603f; }
  .tj-arena { background: #c9ae78; }
  .tj-logo  { background: #f2f0e9; display: flex; align-items: center; justify-content: center; padding: 5mm; }
  .tj-logo img { width: 100%; }

  @media screen { body { background: #55554e; } .hoja, .cierre { background: #fff; width: 210mm; margin: 0 auto; box-shadow: 0 2px 18px rgba(0,0,0,.3); } }
</style></head><body>

<header class="cab">
  <h1>Contrato de prestación de servicios</h1>
  <p class="aviso-cab"><b>Documento de demostración. No es un contrato real ni constituye asesoramiento legal.</b></p>
  <img src="${img("logoBlanco")}" alt="Events Planner" />
</header>
<img class="rubrica" src="${img("firma")}" alt="" />
<p class="aviso-pie"><b>Documento de demostración. No es un contrato real ni constituye asesoramiento legal.</b></p>

<div class="hoja">
  <section class="reunidos">
    <h2>Reunidos</h2>
    <p class="ciudad">${EP_LEGAL.ciudadFirma}, ${campo(fechaFirma, "FECHA")}</p>
    <div class="cols">
      <div class="col">
        <h3>De una parte</h3>
        <p><b>NOMBRE NOVIO:</b> ${campo(d.novioNombre, "Nombre Novio")}<br>
        <b>DNI:</b> ${campo(d.novioDni, "DNI Novio")}<br>
        <b>TELÉFONO:</b> ${campo(d.novioTelefono, "TELF NOVIO")}<br>
        <b>EMAIL:</b> ${campo(d.novioEmail, "mail novio")}</p>
        <p><b>NOMBRE NOVIA:</b> ${campo(d.noviaNombre, "Nombre Novia")}<br>
        <b>DNI:</b> ${campo(d.noviaDni, "DNI Novia")}<br>
        <b>TELÉFONO:</b> ${campo(d.noviaTelefono, "TELF NOVIA")}<br>
        <b>EMAIL:</b> ${campo(d.noviaEmail, "mail novia")}</p>
        <p>Mayores de edad, con domicilio en ${campo(d.domicilio, "Dirección")}, en adelante «EL CLIENTE»</p>
      </div>
      <div class="col">
        <h3>Y de otra</h3>
        <p>${EP_LEGAL.representante} mayor de edad, con DNI ${EP_LEGAL.dni}, con sede en ${EP_LEGAL.sede} en adelante denominada “Events Planner”.</p>
        <h3 style="margin-top:6mm">Exponen</h3>
        <p>Las dos partes se reconocen capacidad legal suficiente para firmar este contrato y manifiestan que</p>
        <p>desean celebrar un contrato de PRESTACIÓN DE SERVICIOS de organización de bodas y eventos, que se regirá por las siguientes:</p>
      </div>
    </div>
  </section>

  <section class="clausulas">
    <h2>Cláusulas</h2>
    ${clausulasHtml(wedding, contract, campo)}
  </section>
</div>

<div class="banda-novios"></div>

<section class="cierre">
  <div class="aceptacion">
    <h2>Aceptación del acuerdo</h2>
    <p>Y para que conste, lo firman por duplicado y a un solo efecto en lugar y fecha arriba indicados.</p>
    <div class="firmas">
      <div class="firma">
        <span class="rotulo">LOS CLIENTES</span>
        <span class="espacio">${
          contract.signature?.dataUrl
            ? `<img src="${text(contract.signature.dataUrl)}" alt="Firma del cliente" />`
            : contract.status === "Firmado en papel"
              ? "Firmado en papel"
              : `<em class="hueco">[FIRMA CLIENTE]</em>`
        }</span>
      </div>
      <div class="firma der">
        <span class="rotulo">EVENTS PLANNER</span>
        <span class="espacio"><img src="${img("firma")}" alt="Events Planner" /></span>
      </div>
    </div>
  </div>

  <div class="cierre-foto"></div>
  <div class="tarjetas">
    <div class="tj tj-gris"><span class="ico">✆</span><h4>Teléfono</h4><p>${EP_LEGAL.telefono}</p></div>
    <div class="tj tj-verde"><span class="ico">⊕</span><h4>Web</h4><p>${EP_LEGAL.web}</p></div>
    <div class="tj tj-arena"><span class="ico">✉</span><h4>Email</h4><p>${EP_LEGAL.email}</p></div>
    <div class="tj tj-logo"><img src="${img("logoVerde")}" alt="Events Planner" /></div>
  </div>
</section>

<script>
  // Se espera a que carguen fotos y fuentes: imprimir antes deja la cabecera
  // en gris y la firma sin dibujar.
  Promise.all([
    document.fonts ? document.fonts.ready : Promise.resolve(),
    ...[...document.images].map((i) => i.complete ? Promise.resolve() : new Promise((r) => { i.onload = i.onerror = r; })),
  ]).then(() => setTimeout(() => window.print(), 120));
<\/script>
</body></html>`;

  openPrintDocument(html);
}

// ---- Firma en canvas: dibujo simple con raton/touch, sin librerias externas ----
function initSignaturePad() {
  const canvas = document.querySelector("#contract-signature-pad");
  if (!canvas) return;
  // En navegadores muy antiguos (o entornos sin canvas) getContext devuelve
  // null. Si eso pasa no debe romperse el portal entero: la pareja siempre
  // tiene la alternativa de imprimir, firmar y subir el documento.
  const ctx = canvas.getContext && canvas.getContext("2d");
  if (!ctx) {
    canvas.closest(".signature-pad-wrap")?.classList.add("signature-unsupported");
    return;
  }
  ctx.lineWidth = 2.4;
  ctx.lineCap = "round";
  ctx.strokeStyle = "#25251f";
  let drawing = false;

  const pos = (event) => {
    const rect = canvas.getBoundingClientRect();
    const point = event.touches ? event.touches[0] : event;
    return { x: ((point.clientX - rect.left) / rect.width) * canvas.width, y: ((point.clientY - rect.top) / rect.height) * canvas.height };
  };
  const start = (event) => {
    drawing = true;
    const { x, y } = pos(event);
    ctx.beginPath();
    ctx.moveTo(x, y);
    event.preventDefault();
  };
  const move = (event) => {
    if (!drawing) return;
    const { x, y } = pos(event);
    ctx.lineTo(x, y);
    ctx.stroke();
    event.preventDefault();
  };
  const end = () => {
    drawing = false;
  };

  canvas.addEventListener("mousedown", start);
  canvas.addEventListener("mousemove", move);
  window.addEventListener("mouseup", end);
  canvas.addEventListener("touchstart", start, { passive: false });
  canvas.addEventListener("touchmove", move, { passive: false });
  canvas.addEventListener("touchend", end);

  document.querySelector("[data-clear-signature]")?.addEventListener("click", () => ctx.clearRect(0, 0, canvas.width, canvas.height));
  document.querySelector("[data-save-signature]")?.addEventListener("click", (event) => {
    const blank = document.createElement("canvas");
    blank.width = canvas.width;
    blank.height = canvas.height;
    if (canvas.toDataURL() === blank.toDataURL()) {
      toast("Dibuja tu firma antes de confirmar");
      return;
    }
    const weddingId = event.currentTarget.dataset.saveSignature;
    const wedding = state.weddings.find((w) => w.id === weddingId);
    signContractDigital(weddingId, canvas.toDataURL("image/png"), wedding?.couple);
  });
}

export { IMG_CONTRATO, openContractUpload, uploadSignedContract, downloadContractUpload, deleteContractUpload, renderContractUploads, openContractForm, saveContractFields, openAnnexForm, toggleAnnexItem, confirmAnnex, missingContractFields, contractFor, generateContract, initSignaturePad, markContractSent, markContractSignedPaper, printContract, renderContractTab, renderPortalContract, signContractDigital };
