import { icono } from "./iconos.js";
import { renderPortalContract } from "./contracts.js";
import { renderDocumentos } from "./documentos.js";
import { renderReceiptsPanel } from "./payments.js";
import { render } from "./render.js";
import { fotoSrc, addActivity, openFormModal, rinconGallery, openInfoModal } from "./modals.js";
import { renderDerechosPortal } from "./rgpd.js";
import { GUEST_GROUPS, apuntarFallo, esperaPorIntentos, limpiarIntentos, byWeddingId, daysUntil, formatDate, hashPassword, openPortalForWedding, paletteSwatches, saveState, sortedWeddings, state, text, toast, toastUndo, uid } from "./state.js";
import { formatPrice, renderDocument, renderMusic, renderShot } from "./views.js";
import { avatar, badge, statCard } from "./charts.js";
import { renderVenueCanvas } from "./venue.js";
import { renderReunionesPortal } from "./agenda.js";
import { PLAZOS, budgetItems, budgetSummary, costeDe, renderBudgetTab, totalPago } from "./budget.js";

// Fila de servicio contratado, version novios: sin botones de gestion interna,
// solo titulo + precio (lo que estan pagando) + observacion del equipo.
function renderPortalService(item) {
  return `<div class="row"><span class="icon-btn">✓</span><div><h4>${text(item.title)}${item.price ? ` <span class="pill">${formatPrice(item.price)}</span>` : ""}</h4>${item.notes ? `<p>${text(item.notes)}</p>` : ""}</div></div>`;
}

// Tarjeta de rincon para novios: foto + descripcion, SIN precio. En vez de
// mandarles a WhatsApp, pueden solicitarlo desde aqui: la peticion queda
// registrada y el equipo la aprueba o la descarta desde su panel.
const EP_WHATSAPP_NUMBER = "34653567610";

/**
 * Solicitud asociada a una ficha de rincón. Al aprobarse se crea una copia
 * con id nuevo, así que hay que mirar también su `sourceRinconId`: si no, la
 * tarjeta perdía el estado y volvía a ofrecer «Me interesa» sobre algo ya
 * aprobado.
 */
function requestState(item, weddingId) {
  const ids = typeof item === "string" ? [item] : [item.id, item.sourceRinconId].filter(Boolean);
  return state.rinconRequests.find((r) => r.weddingId === weddingId && ids.includes(r.rinconId)) || null;
}

function renderPortalRincon(item, wedding) {
  const fotos = rinconGallery(item);
  const catalogo = fotos.filter((p) => p.kind !== "propuesta");
  const propuestas = fotos.filter((p) => p.kind === "propuesta");
  const portada = catalogo[0] || propuestas.find((p) => p.approved) || propuestas[0];
  const req = requestState(item, wedding.id);
  const message = encodeURIComponent(`Hola! Somos ${wedding.couple}, nos gustaría preguntar por el rincón "${item.name}" para nuestra boda.`);

  const action = !req
    ? `<button class="btn sage" data-request-rincon="${item.id}">♡ Me interesa</button>`
    : req.status === "Pendiente"
      ? `<div class="rincon-req rincon-req-pending"><strong>Solicitado</strong><span>El equipo os escribirá para contaros todos los detalles.</span></div>`
      : req.status === "Aprobado"
        ? `<div class="rincon-req rincon-req-ok"><strong>✓ Añadido a vuestra boda</strong><span>El equipo lo ha confirmado. Ya forma parte de vuestros rincones.</span></div>`
        : `<div class="rincon-req rincon-req-no"><strong>No disponible</strong><span>${text(req.note || "El equipo os contará las alternativas.")}</span></div>`;

  return `
    <article class="panel rincon-card">
      ${portada ? `<button type="button" class="rincon-card-photo-btn" data-view-rincon-photo="${item.id}:${portada.id}" title="Ver en grande"><img class="rincon-card-photo" src="${text(fotoSrc(portada))}" alt="${text(item.name)}" loading="lazy" /><span class="rincon-card-photo-zoom">🔍 Ampliar</span></button>` : ""}
      <h4>${text(item.name)}</h4>
      <p>${text(item.description || "")}</p>

      ${
        catalogo.length > 1
          ? `<div class="portal-thumbs">${catalogo.slice(1, 5).map((p) => `<button type="button" data-view-rincon-photo="${item.id}:${p.id}"><img src="${text(fotoSrc(p))}" alt="" loading="lazy" /></button>`).join("")}</div>`
          : ""
      }

      ${
        propuestas.length
          ? `<div class="portal-proposals">
              <span class="portal-proposals-title">Propuesta a medida para vosotros</span>
              ${propuestas
                .map(
                  (p) => `<div class="portal-proposal">
                    <button type="button" class="portal-proposal-img" data-view-rincon-photo="${item.id}:${p.id}"><img src="${text(fotoSrc(p))}" alt="${text(p.caption || "Propuesta")}" loading="lazy" /></button>
                    <div class="portal-proposal-body">
                      ${p.caption ? `<p>${text(p.caption)}</p>` : ""}
                      ${
                        p.approved
                          ? `<span class="rincon-req rincon-req-ok"><strong>✓ Os ha gustado</strong><span>Lo tendremos en cuenta.</span></span>`
                          : `<button class="btn sage btn-xs" data-approve-photo="${item.id}:${p.id}">♡ Nos gusta, incluidla</button>`
                      }
                    </div>
                  </div>`
                )
                .join("")}
            </div>`
          : ""
      }

      ${action}
      ${!req ? `<a class="portal-wa-link" href="https://wa.me/${EP_WHATSAPP_NUMBER}?text=${message}" target="_blank" rel="noopener">o preguntar por WhatsApp</a>` : ""}
    </article>
  `;
}

/** Los novios solicitan un rincon: queda pendiente de aprobacion. */
function requestRincon(rinconId) {
  const wedding = state.weddings.find((w) => w.id === state.portalWeddingId);
  const rincon = state.rincones.find((r) => r.id === rinconId);
  if (!wedding || !rincon || requestState(rincon, wedding.id)) return;

  state.rinconRequests.push({
    id: uid("rq"),
    weddingId: wedding.id,
    rinconId,
    rinconName: rincon.name,
    status: "Pendiente",
    requestedAt: new Date().toISOString(),
    note: "",
  });
  addActivity(`Los novios han solicitado el rincón "${rincon.name}"`, wedding.couple, wedding.id);
  saveState();
  render();
  toast("Solicitud enviada. El equipo os contará todos los detalles.", 5000);
}

/** Cuenta atrás del portal: el dato que los novios miran cada vez que entran. */
function renderCountdown(date) {
  const dias = daysUntil(date);
  if (dias === null) return "";

  if (dias < 0) {
    return `<div class="portal-countdown celebrada">
      <strong>♡</strong>
      <span>Boda celebrada</span>
      <small>hace ${Math.abs(dias)} día${Math.abs(dias) === 1 ? "" : "s"}</small>
    </div>`;
  }
  if (dias === 0) {
    return `<div class="portal-countdown hoy">
      <strong>¡Hoy!</strong>
      <span>Es vuestro día</span>
      <small>Disfrutadlo</small>
    </div>`;
  }

  const semanas = Math.floor(dias / 7);
  const detalle = dias >= 14 ? `${semanas} semanas` : dias === 1 ? "mañana" : `poco más de ${Math.ceil(dias / 7)} semana${Math.ceil(dias / 7) === 1 ? "" : "s"}`;
  return `<div class="portal-countdown">
    <strong>${dias}</strong>
    <span>${dias === 1 ? "día" : "días"}</span>
    <small>${text(detalle)}</small>
  </div>`;
}

// ============================================================================
// Portal en pestañas
// ----------------------------------------------------------------------------
// Antes era una sola página larguísima: para ver el contrato había que bajar
// por invitados, mesas y rincones. Ahora cada área es una pestaña, se ve solo
// lo que se ha pedido ver, y cada una lleva su ayuda «¿Cómo funciona?».
// ============================================================================
const PORTAL_TABS = [
  {
    id: "resumen",
    label: "Resumen",
    icon: "◍",
    help: "Aquí veis de un vistazo cómo va todo: la cuenta atrás, cuántos invitados han confirmado y qué incluye vuestra boda. No hay nada que rellenar; es solo para que veáis cómo vais.",
  },
  {
    id: "invitados",
    label: "Invitados",
    icon: "◎",
    help: "Aquí actualizáis quién viene, qué menú quiere cada persona y si tiene alguna alergia. Cambiad lo que necesitéis y pulsad «Guardar cambios» al terminar. El equipo lo ve al momento y lo tiene en cuenta para el catering.",
  },
  {
    id: "mesas",
    label: "Mesas",
    icon: "▦",
    help: "Este es el plano de vuestro salón. Cada círculo es una mesa y a su alrededor veréis las iniciales de quien se sienta en ella. Si algo no os encaja, moved lo que queráis o avisad al equipo. Nada es definitivo.",
  },
  {
    id: "rincones",
    label: "Rincones",
    icon: "✧",
    help: "Son los espacios decorados que se pueden preparar para vuestra boda. Si alguno os gusta, pulsad «Me interesa» y el equipo os cuenta precio y detalles. Si hay una propuesta a medida, aquí podéis decirnos si os convence.",
  },
  {
    id: "contrato",
    label: "Contrato",
    icon: "▤",
    help: "Aquí está vuestro contrato, y nada más. Cuando esté listo para firmar, aparecerá solo. Podéis firmarlo desde el móvil o imprimirlo, firmarlo a mano y subirlo. Una vez firmado, queda guardado para vosotros y para el equipo.",
  },
  {
    id: "presupuesto",
    label: "Presupuesto",
    icon: "€",
    help: "El presupuesto y sus pagos, partida por partida. Para enviar un justificante, usad el botón «Subir comprobante» de la cabecera.",
  },
  {
    id: "proveedores",
    label: "Proveedores",
    icon: "◈",
    help: "Los profesionales que os proponemos para vuestra boda. Miradlos con calma —tenéis su web, su Instagram y su presupuesto— y decidnos si os gustan o si preferís buscar otra opción. Vuestra respuesta nos ahorra semanas.",
  },
  {
    id: "plan",
    label: "Plan",
    icon: "✓",
    help: "Lo que queda por hacer y el orden del día. Algunas tareas son vuestras y otras del equipo, para que sepáis de qué se encarga cada uno.",
  },
  {
    id: "detalles",
    label: "Detalles",
    icon: "♪",
    help: "Música, ubicaciones, documentos y las fotos que no pueden faltar. Podéis proponer canciones para cada momento: nos ayuda mucho saber qué os hace ilusión escuchar.",
  },
];

function portalTab() {
  return PORTAL_TABS.find((t) => t.id === state.portalTab) || PORTAL_TABS[0];
}

/** Pestañas visibles ahora mismo para esta pareja. */
function pestanasVisibles(wedding) {
  return PORTAL_TABS.filter((t) => {
    // El contrato no existe para los novios hasta que el equipo lo genera:
    // una pestaña vacía que dice "estamos preparándolo" solo genera preguntas.
    if (t.id === "contrato") {
      const c = state.contracts.find((x) => x.weddingId === wedding?.id);
      return Boolean(c?.generatedAt) && c.visibleToCouple !== false;
    }
    return true;
  });
}

function renderPortalNav(wedding) {
  const visibles = pestanasVisibles(wedding);
  if (!visibles.some((t) => t.id === state.portalTab)) state.portalTab = visibles[0].id;
  const activa = portalTab();
  return `
    <nav class="portal-nav" aria-label="Secciones del portal">
      <div class="portal-nav-inner">
        ${pestanasVisibles(wedding).map(
          (t) => `<button class="portal-nav-btn${t.id === activa.id ? " active" : ""}" data-portal-tab="${t.id}" aria-label="${text(t.label)}"${t.id === activa.id ? ' aria-current="page"' : ""}>
            <span class="portal-nav-ico" aria-hidden="true">${t.icon}</span>
            <span>${text(t.label)}</span>
          </button>`
        ).join("")}
      </div>
      ${renderPortalHelp()}
    </nav>
  `;
}

/** Ayuda de la pestaña: se abre y se cierra, y habla como habla el equipo. */
function renderPortalHelp() {
  const t = portalTab();
  const abierta = state.portalHelpOpen;
  return `
    <div class="portal-help${abierta ? " open" : ""}">
      <button class="portal-help-toggle" data-portal-help aria-expanded="${abierta}" aria-controls="portal-help-body"
              aria-label="Cómo funciona la sección ${text(t.label)}">
        <span class="portal-help-mark" aria-hidden="true">?</span>
        <span class="portal-help-texto">Cómo funciona</span>
      </button>
      ${abierta ? `<div class="portal-help-body" id="portal-help-body"><p>${text(t.help)}</p><p class="portal-help-sign">¿Alguna duda? Escribidnos, estamos para eso. — El equipo</p></div>` : ""}
    </div>
  `;
}

function renderPortal() {
  if (!state.weddings.length) {
    state.portalMode = false;
    state.view = "weddings";
    return "";
  }
  // Paso 1: elegir de que boda es el portal — nunca se hereda la boda que
  // estuviera abierta en el lado de equipo, para evitar entrar siempre al
  // portal de la primera boda creada.
  if (!state.portalWeddingId) {
    return `
      <main class="login">
        <section class="login-visual portal-login-visual">
          <div><span class="pill">Events Planner</span><h1>Portal de novios</h1><p>Elige la boda para entrar a su portal privado.</p></div>
        </section>
        <section class="login-panel">
          <div class="login-card panel form">
            <img class="login-logo-panel" src="./assets/brand/ep-logo.png?v=4" alt="Events Planner" />
            <span class="pill">Portal de novios</span>
            <h2>¿Qué boda?</h2>
            <div class="list portal-pick-list">
              ${sortedWeddings()
                .map(
                  (wedding) => `
                    <button type="button" class="portal-pick-row" data-open-portal-wedding="${wedding.id}">
                      <span class="icon-btn">♡</span>
                      <span class="portal-pick-info"><strong>${text(wedding.couple)}</strong><small>${formatDate(wedding.date)} · ${text(wedding.venue || "Lugar por definir")}</small></span>
                    </button>
                  `
                )
                .join("")}
            </div>
            <button class="btn primary" type="button" data-view="dashboard" style="margin-top:12px">← Volver al panel</button>
          </div>
        </section>
      </main>
    `;
  }
  const wedding = state.weddings.find((w) => w.id === state.portalWeddingId);
  if (!wedding) {
    state.portalWeddingId = null;
    return renderPortal();
  }
  // El equipo ya se ha identificado al entrar en el planner: pedirle otra
  // contraseña para mirar el portal de una boda suya es una barrera sin valor.
  // La contraseña queda solo para los novios, que llegan sin sesion.
  const staffPreview = Boolean(state.user);

  if (!state.portalUnlocked && !staffPreview) {
    return `
      <main class="login">
        <section class="login-visual portal-login-visual" style="background-image:linear-gradient(180deg,rgba(86, 96, 63,.16),rgba(32, 35, 13,.62)),url('${text(wedding.cover)}')">
          <div><span class="pill">Events Planner</span><h1>${text(wedding.couple)}</h1><p>Vuestro espacio privado para seguir la boda con calma.</p></div>
        </section>
        <section class="login-panel">
          <form class="login-card panel form" data-portal-login>
            <img class="login-logo-panel" src="./assets/brand/ep-logo.png?v=4" alt="Events Planner" />
            <span class="pill">Portal de novios</span>
            <h2>Acceso privado</h2>
            <p>Introducid la contraseña que os dio el equipo.</p>
            <div class="field"><label for="portal-password">Contraseña</label><input id="portal-password" name="portalPassword" type="password" autocomplete="current-password" required /></div>
            <button class="btn primary" type="submit">Entrar al portal</button>
          </form>
        </section>
      </main>
    `;
  }
  const guests = byWeddingId("guests", wedding.id);
  const tables = byWeddingId("tables", wedding.id);
  const confirmed = guests.filter((g) => /confirm/i.test(g.rsvp || "")).length;
  const seated = guests.filter((g) => g.table && tables.some((t) => t.name === g.table)).length;
  // Catalogo para los novios: lo ya asignado a su boda primero y, detras, lo
  // que aun pueden pedir. Se deduplica por nombre porque una copia asignada
  // conserva el nombre de la ficha del catalogo y salia dos veces.
  const asignados = byWeddingId("rincones", wedding.id).filter((r) => r.active !== "No");
  const vistos = new Set(asignados.map((r) => String(r.name || "").trim().toLowerCase()));
  const catalogRincones = [
    ...asignados,
    ...state.rincones.filter((r) => {
      if (r.weddingId || r.active === "No") return false;
      const key = String(r.name || "").trim().toLowerCase();
      if (vistos.has(key)) return false;
      vistos.add(key);
      return true;
    }),
  ];

  return `
    <main class="portal-shell" style="--couple-primary:${text(wedding.palettePrimary)};--couple-secondary:${text(wedding.paletteSecondary)};--couple-accent:${text(wedding.paletteAccent)}">
      ${
        staffPreview
          ? `<div class="portal-staff-bar">
              <span class="portal-staff-info">
                <span class="portal-staff-eye">${icono("ojo")}</span>
                <span>Estás viendo el portal de <strong>${text(wedding.couple)}</strong> como ${text(state.user.name)} — así lo ven los novios.</span>
              </span>
              <span class="portal-staff-actions">
                <select class="portal-staff-switch" data-portal-switch aria-label="Cambiar de boda">
                  ${sortedWeddings().map((w) => `<option value="${w.id}"${w.id === wedding.id ? " selected" : ""}>${text(w.couple)}</option>`).join("")}
                </select>
                <button class="btn btn-xs" data-copiar-enlace-portal="${wedding.id}" title="Copiar el enlace para enviárselo a los novios">⧉ Copiar enlace</button>
                <button class="btn primary btn-xs" data-view="dashboard">← Volver al panel</button>
              </span>
            </div>`
          : ""
      }
      <section class="portal-hero" style="background-image:url('${text(wedding.cover)}')">
        <div class="portal-hero-inner">
          <div class="portal-hero-text">
            <img class="portal-hero-logo" src="assets/brand/ep-logo-blanco.png" alt="Events Planner" />
            <span class="pill">Portal privado · Events Planner</span>
            <h1>${text(wedding.couple)}</h1>
            <p>${formatDate(wedding.date)} · ${text(wedding.venue)}</p>
          </div>
          ${renderCountdown(wedding.date)}
        </div>
      </section>

      ${renderPortalNav(wedding)}
      <section class="content portal-content">
        ${renderPortalTabBody(wedding, guests, tables, catalogRincones)}

        <section class="brand-closing">
          <div>
            <h3>Gracias por contar con nosotros</h3>
            <p>Todo lo que cambiéis aquí le llega al equipo al momento.</p>
            <span class="brand-closing-sign">Con cariño, el equipo ♡</span>
          </div>
        </section>
      </section>
    </main>
  `;
}

/** Contenido de la pestaña activa. Solo se pinta lo que se está mirando. */
function renderPortalTabBody(wedding, guests, tables, catalogRincones) {
  const t = portalTab().id;
  const confirmed = guests.filter((g) => /confirm/i.test(g.rsvp || "")).length;
  const seated = guests.filter((g) => g.table && tables.some((x) => x.name === g.table)).length;

  if (t === "resumen") {
    return `
      <div class="portal-summary stat-row">
        ${statCard({ icon: "♡", tone: "verde", label: "Vuestro gran día", value: formatDate(wedding.date), sub: wedding.venue || "Lugar por confirmar" })}
        ${statCard({ icon: "◎", tone: "clay", label: "Invitados", value: guests.length, sub: `${confirmed} confirmados`, progress: guests.length ? (confirmed / guests.length) * 100 : 0 })}
        ${statCard({ icon: "▦", tone: "rosa", label: "Mesas", value: tables.length, sub: seated ? `${seated} personas sentadas` : "Sin asignar todavía" })}
        ${statCard({ icon: "✧", tone: "mostaza", label: "Rincones", value: byWeddingId("rincones", wedding.id).filter((r) => r.active !== "No").length, sub: "en vuestra boda" })}
      </div>

      ${renderResumenPresupuesto(wedding)}

      <section class="panel">
        <div class="panel-head"><h3 class="card-title">Vuestra paleta</h3></div>
        <div class="palette-block"><div><p>${text(wedding.paletteNotes)}</p></div>${paletteSwatches(wedding)}</div>
      </section>

      <section class="panel">
        <div class="panel-head"><h3 class="card-title">Servicios contratados</h3></div>
        <p class="card-sub">Esto es lo que incluye vuestra boda.</p>
        <div class="list">${byWeddingId("services", wedding.id).map(renderPortalService).join("") || `<div class="empty">Aquí aparecerán los servicios contratados cuando el equipo los añada.</div>`}</div>
      </section>
    `;
  }

  if (t === "invitados") return renderPortalInvitados(wedding, guests);

  if (t === "mesas") return renderPortalMesas(wedding, tables, guests);

  if (t === "rincones") {
    return `
      <section class="panel">
        <div class="panel-head"><h3 class="card-title">Rincones</h3></div>
        <p class="card-sub">Espacios ambientados para vuestra boda. Si alguno os gusta, pulsad «Me interesa» y el equipo os cuenta los detalles.</p>
        <div class="grid cols-3 rincon-grid">${catalogRincones.map((item) => renderPortalRincon(item, wedding)).join("") || `<div class="empty">Aquí aparecerán los rincones disponibles cuando el equipo los añada.</div>`}</div>
      </section>
    `;
  }

  // El contrato queda separado; presupuesto y sus plazos comparten contexto.
  if (t === "contrato") return renderPortalContract(wedding);
  if (t === "presupuesto") return `${renderPortalPresupuesto(wedding)}${renderReceiptsPanel(wedding, false)}`;
  if (t === "proveedores") return renderPortalProveedores(wedding);
  if (t === "plan") return renderPortalPlan(wedding);

  // detalles
  return `
    <div class="grid cols-2">
      <section class="panel">
        <div class="panel-head"><h3 class="card-title">Música y preferencias</h3></div>
        <p class="card-sub">Canciones por momento para revisar con el equipo.</p>
        <div class="list">${byWeddingId("music", wedding.id).map(renderMusic).join("") || `<div class="empty">Aún no hay canciones. Podéis proponer las vuestras.</div>`}</div>
        <div class="actions" style="justify-content:flex-start;margin-top:14px"><button class="btn sage" data-action="new-music"><span class="icon-btn">+</span> Proponer canción</button></div>
      </section>
      <section class="panel">
        <div class="panel-head"><h3 class="card-title">Ubicaciones</h3></div>
        <p><strong>Ceremonia:</strong> ${text(wedding.ceremony)}${wedding.ceremonyAddress ? ` · ${text(wedding.ceremonyAddress)}` : ""}</p>
        <p><strong>Celebración:</strong> ${text(wedding.venue)}${wedding.venueAddress ? ` · ${text(wedding.venueAddress)}` : ""}</p>
        <div class="actions" style="justify-content:flex-start;margin-top:16px">
          <button class="btn" data-map-search="${text(wedding.ceremonyAddress || wedding.ceremony)}">◈ Ir a ceremonia</button>
          <button class="btn" data-map-search="${text(wedding.venueAddress || wedding.venue)}">◈ Ir a celebración</button>
        </div>
      </section>
    </div>

    ${
      // El índice completo, no solo lo subido a mano: presupuestos de
      // proveedor, justificantes de pago y el contrato firmado salen aquí
      // solos, con el importe y el enlace al archivo.
      renderDocumentos(true)
    }

    <section class="panel">
      <div class="panel-head"><h3 class="card-title">Fotos importantes</h3></div>
      <div class="list">${byWeddingId("shotList", wedding.id).slice(0, 6).map(renderShot).join("") || `<div class="empty">El listado de fotos aparecerá cuando el equipo lo prepare.</div>`}</div>
    </section>


    ${renderDerechosPortal(wedding)}
  `;
}

// ---------------------------------------------------------------------------
// Plano de mesas para los novios: solo lectura. Ven dónde se sienta cada
// invitado sin poder mover nada — el montaje lo decide el equipo.
// ---------------------------------------------------------------------------

/** Las cifras del presupuesto en el resumen, con enlace al detalle. */

/**
 * Presupuesto para los novios.
 *
 * Antes esta pestaña reutilizaba tal cual `renderBudgetTab()`, el componente
 * del equipo: una tabla de gestión con sus controles de edición y su lenguaje
 * de trabajo. Servía para llevar la contabilidad, no para que una pareja
 * entienda en veinte segundos cuánto cuesta su boda, cuánto llevan pagado y
 * qué les queda.
 *
 * Esta vista responde a esas tres preguntas por orden, y sólo después entra en
 * el detalle. El reparto A/B se mantiene —es la forma en que la agencia y la
 * pareja hablan de los pagos— pero deja de ser el titular: pasa a ser una
 * línea de reparto dentro del total, con su pagado y su pendiente al lado.
 */
function renderPortalPresupuesto(wedding) {
  const r = budgetSummary(wedding.id);
  if (!r.items.length) {
    return `<section class="panel"><div class="empty">
      <h3>Todavía no hay presupuesto</h3>
      <p>En cuanto cerremos las primeras partidas las veréis aquí, con sus plazos y lo que queda por pagar.</p>
    </div></section>`;
  }

  const pct = r.total ? Math.min(100, Math.round((r.pagado / r.total) * 100)) : 0;
  const canal = (etiqueta, nota, total, pagado, pendiente) => `
    <div class="pp-canal">
      <div class="pp-canal-cab">
        <strong>${etiqueta}</strong>
        <span class="pp-canal-total">${formatPrice(total)}</span>
      </div>
      <p class="pp-canal-nota">${nota}</p>
      <div class="pp-canal-cifras">
        <span><i class="pp-punto pp-punto-ok"></i>Pagado <b>${formatPrice(pagado)}</b></span>
        <span><i class="pp-punto pp-punto-falta"></i>Pendiente <b>${formatPrice(pendiente)}</b></span>
      </div>
    </div>`;

  return `
    <section class="panel pp-resumen">
      <div class="panel-head">
        <div>
          <h3 class="card-title">Cuánto cuesta vuestra boda</h3>
          <p class="card-sub">Las mismas cifras que lleva el equipo. No hay dos cuentas.</p>
        </div>
      </div>

      <div class="pp-grandes">
        <div class="pp-grande pp-grande-total">
          <span class="pp-etq">Total</span>
          <strong>${formatPrice(r.total)}</strong>
          <small>${r.items.length} partida${r.items.length === 1 ? "" : "s"}</small>
        </div>
        <div class="pp-grande pp-grande-pagado">
          <span class="pp-etq">Ya pagado</span>
          <strong>${formatPrice(r.pagado)}</strong>
          <small>${pct}% del total</small>
        </div>
        <div class="pp-grande pp-grande-queda">
          <span class="pp-etq">Queda por pagar</span>
          <strong>${formatPrice(r.pendiente)}</strong>
          <small>${(() => {
            // `proximos` sólo trae los que aún no han vencido. Si el plazo ya
            // pasó, decir "sin fecha pendiente" con dinero por pagar es
            // justo lo contrario de lo que ocurre: se avisa del vencido.
            const vencido = r.vencidos[0];
            if (vencido) return `Venció el ${formatDate(vencido.pago.vence)}`;
            if (r.proximos[0]) return `Siguiente: ${formatDate(r.proximos[0].pago.vence)}`;
            return r.pendiente ? "Pendiente de fecha" : "Todo al día";
          })()}</small>
        </div>
      </div>

      <div class="pp-barra" role="img" aria-label="Pagado el ${pct}% de ${formatPrice(r.total)}">
        <div class="pp-barra-relleno" style="width:${pct}%"></div>
      </div>

      <div class="pp-canales">
        ${canal("A · Facturado", "Lo que va con factura de cada proveedor.", r.facturado, r.facturadoPagado, r.facturadoPendiente)}
        ${canal("B · No facturado", "Lo que se acordó por la vía directa.", r.noFacturado, r.noFacturadoPagado, r.noFacturadoPendiente)}
      </div>
    </section>

    <section class="panel">
      <div class="panel-head"><div>
        <h3 class="card-title">Partida por partida</h3>
        <p class="card-sub">Qué es cada cifra y en qué estado está.</p>
      </div></div>
      <div class="pp-lista">
        ${budgetItems(wedding.id).map(renderPortalPartida).join("")}
      </div>
    </section>
  `;
}

/** Una partida vista por los novios: qué es, cuánto y qué queda. */
function renderPortalPartida(item) {
  const coste = costeDe(item);
  const total = totalPago(coste);
  const plazos = PLAZOS.map((plazo) => item.plazos?.[plazo.id]).filter((p) => p && totalPago(p) > 0);
  const pagado = plazos.filter((p) => p.estado === "Pagado").reduce((suma, p) => suma + totalPago(p), 0);
  const queda = Math.max(0, total - pagado);
  const alDia = queda < 1;

  return `
    <article class="pp-partida${alDia ? " pp-partida-ok" : ""}">
      <div class="pp-partida-cab">
        <div class="pp-partida-que">
          <strong>${text(item.concepto)}</strong>
          ${item.proveedor ? `<small>${text(item.proveedor)}</small>` : ""}
        </div>
        <div class="pp-partida-cifra">
          <b>${formatPrice(total)}</b>
          <span class="pp-estado ${alDia ? "pp-estado-ok" : "pp-estado-falta"}">
            ${alDia ? "Pagada" : `Quedan ${formatPrice(queda)}`}
          </span>
        </div>
      </div>
      ${
        plazos.length > 1
          ? `<ol class="pp-plazos">
              ${plazos
                .map((p) => {
                  const hecho = p.estado === "Pagado";
                  return `<li class="${hecho ? "hecho" : ""}">
                    <span class="pp-plazo-marca" aria-hidden="true">${hecho ? "✓" : "○"}</span>
                    <span class="pp-plazo-importe">${formatPrice(totalPago(p))}</span>
                    <span class="pp-plazo-fecha">${p.vence ? formatDate(p.vence) : "Sin fecha"}</span>
                    <span class="pp-plazo-estado">${hecho ? "Pagado" : "Pendiente"}</span>
                  </li>`;
                })
                .join("")}
            </ol>`
          : ""
      }
    </article>`;
}

function renderResumenPresupuesto(wedding) {
  const r = budgetSummary(wedding.id);
  if (!r.items.length) return "";
  const proximo = r.proximos[0] || r.vencidos[0];

  return `
    <section class="panel">
      <div class="panel-head">
        <div>
          <h3 class="card-title">Vuestro presupuesto</h3>
          <p class="card-sub">Estas son las mismas cifras que lleva el equipo. No hay dos cuentas.</p>
        </div>
        <button class="link-btn" data-portal-tab="presupuesto">Ver el detalle →</button>
      </div>
      <div class="portal-summary stat-row">
        ${statCard({ icon: "€", tone: "verde", label: "Coste total", value: formatPrice(r.total), sub: `${r.items.length} partidas` })}
        ${statCard({ icon: "✓", tone: "clay", label: "Ya pagado", value: formatPrice(r.pagado), sub: r.pendiente ? `Quedan ${formatPrice(r.pendiente)}` : "Todo al día", progress: r.total ? (r.pagado / r.total) * 100 : 0 })}
        ${
          // «Pagos vencidos: 8» es la cifra de un panel de control, y en el
          // portal se leía como un reproche. A ellos les interesa qué es lo
          // siguiente y cuánto es, no cuántos plazos llevan pasados.
          statCard({
            icon: "◷",
            tone: r.vencidos.length ? "rosa" : "mostaza",
            label: "Lo siguiente",
            value: proximo ? formatPrice(totalPago(proximo.pago)) : r.pendiente ? formatPrice(r.pendiente) : "—",
            sub: proximo ? `${proximo.item.concepto} · ${formatDate(proximo.pago.vence)}` : r.pendiente ? "Pendiente de fecha" : "Nada a la vista",
          })
        }
      </div>
    </section>
  `;
}

/**
 * Proveedores propuestos, para que la pareja decida.
 *
 * Ven la ficha entera —web, Instagram, teléfono, presupuesto— porque salió de
 * la base de la agencia, no de un campo escrito a mano. Y las dos respuestas
 * pesan igual: descartar tiene el mismo tamaño de botón que aceptar, porque un
 * "este no" a tiempo vale tanto como un sí.
 */
function renderPortalProveedores(wedding) {
  const props = byWeddingId("providers", wedding.id);
  if (!props.length) {
    return `<section class="panel">
      <div class="panel-head"><h3 class="card-title">Vuestros proveedores</h3></div>
      <div class="empty">Todavía no os hemos propuesto ninguno. En cuanto tengamos candidatos os los enseñamos por aquí.</div>
    </section>`;
  }

  const pendientes = props.filter((p) => p.validacion !== "Aceptado" && p.validacion !== "Descartado");
  const aceptados = props.filter((p) => p.validacion === "Aceptado");
  const descartados = props.filter((p) => p.validacion === "Descartado");

  const ficha = (p) => {
    const ig = String(p.instagram || "").replace(/^@/, "").trim();
    return `<article class="prov-card ${p.validacion === "Aceptado" ? "ok" : p.validacion === "Descartado" ? "no" : ""}">
      <div class="prov-card-cab">
        <div>
          <h4>${text(p.name)}</h4>
          <p>${text(p.type || "Proveedor")}${p.zone ? ` · ${text(p.zone)}` : ""}</p>
        </div>
        ${p.presupuesto?.importe ? `<span class="val-pres">${text(formatPrice(p.presupuesto.importe))}</span>` : ""}
      </div>
      ${p.description ? `<p class="prov-descripcion">${text(p.description)}</p>` : ""}
      ${p.presupuesto?.nota ? `<p class="prov-incluye"><strong>Incluye:</strong> ${text(p.presupuesto.nota)}</p>` : ""}

      ${
        // La ficha entera, no solo el Instagram. Si van a decidir sobre un
        // proveedor, tienen que poder mirarlo: su web, a quién llamar y qué
        // presupuesto ha pasado. Pedirles que elijan a ciegas no es elegir.
        p.web || p.email || p.phone || p.contact
          ? `<dl class="prov-ficha">
              ${p.contact ? `<div><dt>Contacto</dt><dd>${text(p.contact)}</dd></div>` : ""}
              ${p.phone ? `<div><dt>Teléfono</dt><dd><a href="tel:${text(String(p.phone).replace(/\s/g, ""))}">${text(p.phone)}</a></dd></div>` : ""}
              ${p.email ? `<div><dt>Correo</dt><dd><a href="mailto:${text(p.email)}">${text(p.email)}</a></dd></div>` : ""}
              ${p.web ? `<div><dt>Web</dt><dd><a href="${text(/^https?:/.test(p.web) ? p.web : `https://${p.web}`)}" target="_blank" rel="noopener noreferrer">${text(String(p.web).replace(/^https?:\/\//, ""))}</a></dd></div>` : ""}
            </dl>`
          : ""
      }

      <div class="contact-chips">
        ${p.web ? `<a class="contact-chip" href="${text(/^https?:/.test(p.web) ? p.web : `https://${p.web}`)}" target="_blank" rel="noopener noreferrer">↗ Su web</a>` : ""}
        ${ig ? `<a class="contact-chip chip-ig" href="https://instagram.com/${text(ig)}" target="_blank" rel="noopener noreferrer">◎ @${text(ig)}</a>` : ""}
        ${
          p.presupuesto?.attachment
            ? `<button class="contact-chip chip-propuesta" data-ver-presupuesto="${p.id}">▤ Ver su propuesta</button>`
            : `<span class="contact-chip chip-vacio">Propuesta pendiente de recibir</span>`
        }
      </div>
      <div class="prov-decision">
        <button class="btn ${p.validacion === "Aceptado" ? "primary" : "btn-outline"}" data-decidir-proveedor="${p.id}:${p.validacion === "Aceptado" ? "pendiente" : "aceptado"}">
          ${p.validacion === "Aceptado" ? "👍 ✓ Nos gusta" : "👍 Nos gusta"}
        </button>
        <button class="btn ${p.validacion === "Descartado" ? "danger" : "btn-outline"}" data-decidir-proveedor="${p.id}:${p.validacion === "Descartado" ? "pendiente" : "descartado"}">
          ${p.validacion === "Descartado" ? "👎 Descartado" : "👎 Este no"}
        </button>
      </div>
    </article>`;
  };

  return `
    <section class="panel">
      <div class="panel-head">
        <div>
          <h3 class="card-title">Vuestros proveedores</h3>
          <p class="card-sub">Estos son los que os proponemos. Decidnos cuáles os gustan — si alguno no os convence, decidlo sin problema y buscamos otra cosa.</p>
        </div>
        <span class="pill">${aceptados.length} de ${props.length} elegidos</span>
      </div>

      ${
        pendientes.length
          ? `<h4 class="prov-grupo">Esperando vuestra opinión · ${pendientes.length}</h4>
             <div class="prov-grid">${pendientes.map(ficha).join("")}</div>`
          : `<p class="card-sub">Ya nos habéis dicho qué os parece de todos. Gracias — así vamos mucho más rápido.</p>`
      }
      ${aceptados.length ? `<h4 class="prov-grupo">Os gustan · ${aceptados.length}</h4><div class="prov-grid">${aceptados.map(ficha).join("")}</div>` : ""}
      ${descartados.length ? `<h4 class="prov-grupo">Descartados · ${descartados.length}</h4><div class="prov-grid">${descartados.map(ficha).join("")}</div>` : ""}
    </section>
  `;
}

/**
 * Plan: lo pendiente y el orden del día.
 *
 * Las tareas asignadas a la pareja se separan del resto, porque lo primero que
 * quieren saber al entrar aquí es de qué se encargan ellos.
 */
function renderPortalPlan(wedding) {
  const tareas = byWeddingId("tasks", wedding.id);
  const mias = tareas.filter((t) => /novi|parej/i.test(t.owner || ""));
  const nuestras = tareas.filter((t) => !/novi|parej/i.test(t.owner || ""));
  const hecha = (t) => /listo|hecho|complet/i.test(t.status || "");
  const timeline = byWeddingId("timeline", wedding.id).slice().sort((a, b) => String(a.time).localeCompare(String(b.time)));

  const fila = (t) => `<div class="plan-tarea${hecha(t) ? " hecha" : ""}">
      <span class="plan-check">${hecha(t) ? "✓" : "○"}</span>
      <div>
        <strong>${text(t.title)}</strong>
        <small>${t.due ? `Para el ${text(formatDate(t.due))}` : "Sin fecha"}${t.owner ? ` · ${text(t.owner)}` : ""}</small>
      </div>
      ${badge(t.status || "Pendiente", hecha(t) ? "verde" : "mostaza")}
    </div>`;

  return `
    ${renderReunionesPortal(wedding)}

    <section class="panel">
      <div class="panel-head">
        <div>
          <h3 class="card-title">De qué os encargáis vosotros</h3>
          <p class="card-sub">${mias.length ? "Estas son las cosas que quedaron de vuestra parte." : "Ahora mismo no hay nada pendiente de vuestro lado."}</p>
        </div>
        ${mias.length ? `<span class="pill mostaza">${mias.filter((t) => !hecha(t)).length} sin hacer</span>` : ""}
      </div>
      ${mias.length ? `<div class="plan-lista">${mias.map(fila).join("")}</div>` : `<div class="empty">Nada pendiente por aquí. Si surge algo os lo apuntamos y os avisamos.</div>`}
    </section>

    <section class="panel">
      <div class="panel-head">
        <div>
          <h3 class="card-title">De qué se encarga el equipo</h3>
          <p class="card-sub">Para que sepáis por dónde va la organización, aunque no tengáis que hacer nada.</p>
        </div>
        <span class="pill">${nuestras.filter((t) => !hecha(t)).length} en marcha</span>
      </div>
      ${nuestras.length ? `<div class="plan-lista">${nuestras.slice(0, 12).map(fila).join("")}</div>` : `<div class="empty">Todavía no hay tareas.</div>`}
    </section>

    <section class="panel">
      <div class="panel-head">
        <div>
          <h3 class="card-title">El orden del día</h3>
          <p class="card-sub">Cómo va a ir la jornada, hora a hora. Puede cambiar hasta el final, pero esta es la idea.</p>
        </div>
      </div>
      ${
        timeline.length
          ? `<div class="plan-timeline">${timeline
              .map(
                (t) => `<div class="plan-hito">
                  <span class="plan-hora">${text(t.time || "--:--")}</span>
                  <div><strong>${text(t.title)}</strong>${t.note ? `<small>${text(t.note)}</small>` : ""}</div>
                </div>`
              )
              .join("")}</div>`
          : `<div class="empty">Estamos montando el timing. Aparecerá aquí en cuanto lo tengamos.</div>`
      }
    </section>
  `;
}

/**
 * Mesas en el portal.
 *
 * Usa EL MISMO lienzo que el equipo (venue.js), no una copia en SVG. Mantener
 * dos planos distintos significaba que arrastrar una mesa solo funcionaba en
 * el lado del equipo y que cualquier mejora había que hacerla dos veces. Es
 * el mismo salón: es el mismo plano.
 */
function renderPortalMesas(wedding, tables, guests) {
  if (!tables.length) {
    return `
      ${explicacionMesas(wedding, 0)}
      <section class="panel">
        <div class="panel-head"><h3 class="card-title">Vuestras mesas</h3></div>
        <div class="empty empty-large">
          <h3>Aún no hay ninguna mesa</h3>
          <p>Empezad creando la primera. No hace falta que sea perfecto: se puede cambiar mil veces, y el equipo lo ve todo al momento.</p>
          <button class="btn primary" data-portal-nueva-mesa><span class="icon-btn">+</span> Crear la primera mesa</button>
        </div>
      </section>`;
  }

  const sinSitio = guests.filter((g) => /confirm/i.test(g.rsvp || "") && !g.table);

  return `
    ${explicacionMesas(wedding, tables.length)}
    ${renderVenueCanvas()}
    ${renderRepartoMesas(wedding, tables, guests, sinSitio)}
  `;
}

/**
 * Explicación de cómo funciona el reparto.
 *
 * Va arriba del todo y en un lenguaje que no da por sabido nada: la mayoría de
 * las parejas no ha hecho un seating plan en su vida y lo que necesita oír
 * primero es que no se puede romper nada.
 */
function explicacionMesas(wedding, cuantas) {
  return `
    <section class="panel mesas-intro">
      <h3 class="card-title">El sitio de cada invitado lo decidís vosotros</h3>
      <p>Nadie conoce a vuestra gente como vosotros: quién se lleva bien con quién, a quién conviene sentar cerca de la puerta y qué tíos es mejor que no coincidan. Por eso el reparto lo hacéis vosotros y el equipo lo monta tal cual.</p>
      <ol class="mesas-pasos">
        <li><b>Crear las mesas.</b> Pulsad «Nueva mesa», ponedle un nombre —vale «Mesa 1», pero también «Amigos de la uni» o «Los primos»— y cuánta gente cabe.</li>
        <li><b>Colocarlas como estarán.</b> Arrastrad cada mesa por el plano con el ratón o con el dedo hasta que se parezca a vuestro salón. También podéis cambiarle el tamaño (una presidencial no es como una de seis).</li>
        <li><b>Sentar a la gente.</b> Pulsad una mesa: al lado veis quién está y podéis sacar a alguien o añadir a los que aún no tienen sitio.</li>
        <li><b>O usar la lista de abajo</b> si preferís ir persona por persona. Las dos formas hacen lo mismo.</li>
      </ol>
      <p class="mesas-tranquilo">Podéis cambiarlo tantas veces como queráis hasta la semana de la boda. No hay forma de estropear nada, y si os liais, escribid al equipo y lo arreglamos en un momento.${cuantas ? "" : " Empezad por crear una mesa y lo veréis clarísimo."}</p>
    </section>
  `;
}

/**
 * Reparto de invitados. Un desplegable por persona, sin arrastrar nada: en el
 * móvil arrastrar es un suplicio y esto lo van a hacer en el sofá.
 */
function renderRepartoMesas(wedding, tables, guests, sinSitio) {
  const confirmados = guests.filter((g) => /confirm/i.test(g.rsvp || ""));
  if (!confirmados.length) {
    return `<section class="panel">
      <div class="panel-head"><h3 class="card-title">¿Quién se sienta dónde?</h3></div>
      <div class="empty">Cuando tengáis invitados confirmados en la pestaña «Invitados» aparecerán aquí para repartirlos.</div>
    </section>`;
  }

  const porMesa = (nombre) => guests.filter((g) => g.table === nombre).length;

  return `
    <section class="panel">
      <div class="panel-head">
        <div>
          <h3 class="card-title">¿Quién se sienta dónde?</h3>
          <p class="card-sub">Elegid la mesa de cada persona. Se guarda al momento.</p>
        </div>
        ${sinSitio.length ? `<span class="pill mostaza">${sinSitio.length} sin sitio</span>` : `<span class="pill">Todos sentados</span>`}
      </div>

      <div class="reparto-lista">
        ${confirmados
          .map(
            (g) => `<label class="reparto-fila${g.table ? "" : " sin-sitio"}">
              <span class="reparto-nombre">${text(g.name)}${g.group && g.group !== "Sin grupo" ? `<small>${text(g.group)}</small>` : ""}</span>
              <select data-portal-mesa="${g.id}" aria-label="Mesa de ${text(g.name)}">
                <option value=""${g.table ? "" : " selected"}>— Sin mesa —</option>
                ${tables
                  .map((t) => {
                    const ocupadas = porMesa(t.name);
                    const cap = Number(t.capacity) || 0;
                    const llena = cap && ocupadas >= cap && g.table !== t.name;
                    return `<option value="${text(t.name)}"${g.table === t.name ? " selected" : ""}${llena ? " disabled" : ""}>${text(t.name)}${cap ? ` · ${ocupadas}/${cap}${llena ? " (completa)" : ""}` : ""}</option>`;
                  })
                  .join("")}
              </select>
            </label>`
          )
          .join("")}
      </div>

      <div class="reparto-mesas">
        <h4>Vuestras mesas</h4>
        ${tables
          .map(
            (t) => `<div class="reparto-mesa">
              <span><b>${text(t.name)}</b> · ${porMesa(t.name)}/${Number(t.capacity) || "—"}</span>
              <div class="inline-tools">
                <button class="mini-btn" data-portal-editar-mesa="${t.id}" title="Cambiar nombre o plazas" aria-label="Editar ${text(t.name)}">${icono("editar")}</button>
                <button class="mini-btn danger-text" data-portal-borrar-mesa="${t.id}" title="Quitar la mesa" aria-label="Quitar ${text(t.name)}">${icono("cerrar")}</button>
              </div>
            </div>`
          )
          .join("")}
      </div>
    </section>
  `;
}

// ---------------------------------------------------------------------------
// Invitados editables por los novios. Los cambios se guardan en un borrador
// local y solo se envían al pulsar «Guardar cambios», que deja constancia en
// la actividad del equipo.
// ---------------------------------------------------------------------------
function renderPortalInvitados(wedding, guests) {
  const dirty = Object.keys(state.portalDraft || {}).length > 0;
  const val = (g, field) => (state.portalDraft?.[g.id]?.[field] ?? g[field] ?? "");

  return `
    <section class="panel portal-guests" id="p-invitados">
      <div class="panel-head">
        <div>
          <h3 class="card-title">Vuestros invitados</h3>
          <p class="card-sub">Esta lista es vuestra: añadid gente, cambiad lo que haga falta y borrad a quien al final no venga. Cuando terminéis, pulsad <b>Guardar cambios</b> abajo.</p>
        </div>
        <span class="pill">${guests.length}</span>
      </div>

      <div class="table-scroll">
        <table class="data-table portal-guests-table tabla-fichas">
          <thead><tr><th>Invitado</th><th>Grupo</th><th>Confirmación</th><th>Menú</th><th>Alergias o restricciones</th><th>Acompañante</th><th>Mesa</th><th></th></tr></thead>
          <tbody>
            ${
              guests
                .map(
                  (g) => `<tr${state.portalDraft?.[g.id] ? ' class="row-edited"' : ""}>
                <td class="cell-guest" data-col="Invitado">
                  ${avatar(val(g, "name") || g.name, "sm")}
                  <input class="portal-input portal-input-nombre" data-portal-guest="${g.id}" data-portal-field="name" value="${text(val(g, "name"))}" placeholder="Nombre y apellidos" aria-label="Nombre" />
                  ${/*
                    Sólo se ve en móvil (ver .ficha-abrir en styles.css). Con
                    18 invitados y siete campos cada uno, la lista medía trece
                    pantallas: para llegar al último había que recorrer toda la
                    boda. Plegada, cada persona ocupa una línea con lo que se
                    consulta de un vistazo —si viene y qué menú— y se despliega
                    entera al tocarla. No se quita ningún campo.
                  */ ""}
                  <span class="ficha-resumen" aria-hidden="true">${text(val(g, "rsvp") || "Pendiente")}${val(g, "menu") ? ` · ${text(val(g, "menu"))}` : ""}${val(g, "table") ? ` · ${text(val(g, "table"))}` : ""}</span>
                  <button type="button" class="ficha-abrir" data-ficha-toggle
                          aria-expanded="false" aria-label="Ver y editar todos los datos de ${text(val(g, "name") || g.name)}">
                    <span aria-hidden="true">▾</span>
                  </button>
                </td>
                <td data-col="Grupo">
                  <select class="portal-input" data-portal-guest="${g.id}" data-portal-field="group" aria-label="Grupo">
                    ${GUEST_GROUPS.map((o) => `<option${o === val(g, "group") ? " selected" : ""}>${text(o)}</option>`).join("")}
                  </select>
                </td>
                <td data-col="Confirmación">
                  <select class="portal-input" data-portal-guest="${g.id}" data-portal-field="rsvp" aria-label="Confirmación">
                    ${["Pendiente", "Confirmado", "No asiste"].map((o) => `<option${o === val(g, "rsvp") ? " selected" : ""}>${o}</option>`).join("")}
                  </select>
                </td>
                <td data-col="Menú">
                  <select class="portal-input" data-portal-guest="${g.id}" data-portal-field="menu" aria-label="Menú">
                    ${["Carne", "Pescado", "Vegetariano", "Vegano", "Infantil"].map((o) => `<option${o === val(g, "menu") ? " selected" : ""}>${o}</option>`).join("")}
                  </select>
                </td>
                <td data-col="Alergias"><input class="portal-input" data-portal-guest="${g.id}" data-portal-field="allergy" value="${text(val(g, "allergy"))}" placeholder="Ninguna" aria-label="Alergias" /></td>
                <td data-col="Acompañante"><input class="portal-input" data-portal-guest="${g.id}" data-portal-field="companion" value="${text(val(g, "companion"))}" placeholder="—" aria-label="Acompañante" /></td>
                <td data-col="Mesa">
                  <select class="portal-input" data-portal-guest="${g.id}" data-portal-field="table" aria-label="Mesa">
                    <option value=""${val(g, "table") ? "" : " selected"}>— Sin mesa —</option>
                    ${byWeddingId("tables", wedding.id)
                      .map((t) => `<option value="${text(t.name)}"${val(g, "table") === t.name ? " selected" : ""}>${text(t.name)}</option>`)
                      .join("")}
                  </select>
                </td>
                <td class="cell-quitar">
                  <button class="mini-btn danger-text" data-portal-borrar-invitado="${g.id}" title="Quitar a ${text(g.name)} de la lista" aria-label="Quitar a ${text(g.name)} de la lista">${icono("cerrar")}</button>
                </td>
              </tr>`
                )
                .join("") ||
              `<tr><td colspan="8" class="chart-empty">Todavía no hay nadie en la lista. Pulsad «Añadir invitado» para empezar — podéis ir metiéndolos poco a poco.</td></tr>`
            }
          </tbody>
        </table>
      </div>

      <div class="portal-save-bar${dirty ? " active" : ""}">
        <span>${dirty ? `${Object.keys(state.portalDraft).length} invitado${Object.keys(state.portalDraft).length === 1 ? "" : "s"} con cambios sin guardar` : "Todo guardado"}</span>
        <div class="actions">
          <button class="btn" data-action="portal-add-guest"><span class="icon-btn">+</span> Añadir invitado</button>
          <button class="btn primary" data-portal-save ${dirty ? "" : "disabled"}>Guardar cambios</button>
        </div>
      </div>
    </section>
  `;
}

// ---------------------------------------------------------------------------
// Guardado de los novios
// ---------------------------------------------------------------------------

/** Anota un cambio en el borrador sin repintar (no perder el foco al teclear). */
function setPortalDraft(guestId, field, value) {
  if (!state.portalDraft) state.portalDraft = {};
  const guest = state.guests.find((g) => g.id === guestId);
  if (!guest) return;

  const entry = state.portalDraft[guestId] || {};
  if (String(guest[field] ?? "") === String(value)) delete entry[field];
  else entry[field] = value;

  if (Object.keys(entry).length) state.portalDraft[guestId] = entry;
  else delete state.portalDraft[guestId];

  // Solo se refresca la barra de guardado, no la tabla entera.
  const bar = document.querySelector(".portal-save-bar");
  if (bar) {
    const n = Object.keys(state.portalDraft).length;
    bar.classList.toggle("active", n > 0);
    bar.querySelector("span").textContent = n ? `${n} invitado${n === 1 ? "" : "s"} con cambios sin guardar` : "Todo guardado";
    bar.querySelector("[data-portal-save]").disabled = n === 0;
  }
}

/**
 * Aplica el borrador a los invitados y deja constancia en la actividad, que
 * es lo que ve el equipo. Un unico registro con el resumen, no uno por campo.
 */

// ---------------------------------------------------------------------------
// Mesas gestionadas por los novios
// ---------------------------------------------------------------------------
// Todo lo que hacen aquí queda en Actividad reciente con su nombre. No es
// vigilancia: es que el equipo tiene que enterarse de que anoche movieron a
// doce personas de mesa antes de mandarle el plano definitivo al catering.

function portalNuevaMesa() {
  const wedding = state.weddings.find((w) => w.id === state.portalWeddingId);
  if (!wedding) return;
  const n = byWeddingId("tables", wedding.id).length + 1;
  openFormModal({
    intent: "portal-nueva-mesa",
    title: "Nueva mesa",
    kicker: "Vuestras mesas",
    submitLabel: "Crear la mesa",
    values: { name: `Mesa ${n}`, capacity: 10 },
    fields: [
      { name: "name", label: "¿Cómo se llama?", required: true, wide: true, help: "Vale «Mesa 1», pero también «Amigos de la uni» o «Los primos de Girona»." },
      { name: "capacity", label: "¿Cuánta gente cabe?", type: "number", help: "Si no lo sabéis seguro, poned una aproximación: se puede cambiar." },
    ],
  });
}

function portalCrearMesa(values) {
  const wedding = state.weddings.find((w) => w.id === state.portalWeddingId);
  if (!wedding) return;
  const name = String(values.name || "").trim();
  if (!name) {
    toast("Ponle un nombre a la mesa");
    return;
  }
  if (byWeddingId("tables", wedding.id).some((t) => t.name.toLowerCase() === name.toLowerCase())) {
    toast("Ya tenéis una mesa con ese nombre");
    return;
  }
  state.tables.push({
    id: uid("m"),
    weddingId: wedding.id,
    name,
    capacity: Number(values.capacity) || 10,
    owner: "",
    status: "Pendiente",
    names: "",
    notes: "",
    creadaPorNovios: true,
  });
  addActivity(`Los novios crearon la mesa «${name}»`, wedding.couple, wedding.id);
  state.modal = null;
  saveState();
  render();
  toast("Mesa creada. Ahora podéis ir sentando gente en ella.", 4000);
}

function portalEditarMesa(id) {
  const mesa = state.tables.find((t) => t.id === id);
  if (!mesa) return;
  openFormModal({
    intent: "portal-editar-mesa",
    itemId: id,
    title: "Cambiar la mesa",
    kicker: "Vuestras mesas",
    submitLabel: "Guardar",
    values: { name: mesa.name, capacity: mesa.capacity },
    fields: [
      { name: "name", label: "Nombre", required: true, wide: true },
      { name: "capacity", label: "Plazas", type: "number" },
    ],
  });
}

function portalGuardarMesa(id, values) {
  const mesa = state.tables.find((t) => t.id === id);
  const wedding = state.weddings.find((w) => w.id === state.portalWeddingId);
  if (!mesa || !wedding) return;
  const antes = mesa.name;
  const nuevo = String(values.name || "").trim() || antes;

  // Si cambia el nombre hay que arrastrar a quien ya estaba sentado ahí, o se
  // quedarían todos huérfanos sin que nadie lo note.
  if (nuevo !== antes) {
    state.guests.filter((g) => g.weddingId === wedding.id && g.table === antes).forEach((g) => { g.table = nuevo; });
  }
  mesa.name = nuevo;
  mesa.capacity = Number(values.capacity) || mesa.capacity;

  addActivity(
    antes === nuevo ? `Los novios cambiaron las plazas de «${nuevo}» a ${mesa.capacity}` : `Los novios renombraron la mesa «${antes}» como «${nuevo}»`,
    wedding.couple,
    wedding.id
  );
  state.modal = null;
  saveState();
  render();
}

function portalBorrarMesa(id) {
  const mesa = state.tables.find((t) => t.id === id);
  const wedding = state.weddings.find((w) => w.id === state.portalWeddingId);
  if (!mesa || !wedding) return;

  const sentados = state.guests.filter((g) => g.weddingId === wedding.id && g.table === mesa.name);
  const copia = { ...mesa };
  const nombres = sentados.map((g) => g.id);

  sentados.forEach((g) => { g.table = ""; });
  state.tables = state.tables.filter((t) => t.id !== id);
  addActivity(
    `Los novios quitaron la mesa «${mesa.name}»${sentados.length ? ` y ${sentados.length} invitado${sentados.length === 1 ? " se quedó" : "s se quedaron"} sin sitio` : ""}`,
    wedding.couple,
    wedding.id
  );
  saveState();
  render();

  toastUndo(`Mesa «${mesa.name}» eliminada`, () => {
    state.tables.push(copia);
    nombres.forEach((gid) => {
      const g = state.guests.find((x) => x.id === gid);
      if (g) g.table = copia.name;
    });
    addActivity(`Los novios recuperaron la mesa «${copia.name}»`, wedding.couple, wedding.id);
    saveState();
    render();
  });
}


/** Sentar (o levantar) a un invitado. Se guarda al momento, sin botón. */
function portalSentarInvitado(guestId, mesa) {
  const guest = state.guests.find((g) => g.id === guestId);
  const wedding = state.weddings.find((w) => w.id === state.portalWeddingId);
  if (!guest || !wedding) return;
  const antes = guest.table || "";
  if (antes === mesa) return;
  guest.table = mesa;

  addActivity(
    mesa
      ? `Los novios sentaron a ${guest.name} en «${mesa}»${antes ? ` (antes en «${antes}»)` : ""}`
      : `Los novios levantaron a ${guest.name} de «${antes}»`,
    wedding.couple,
    wedding.id
  );
  saveState();
  render();
}


/** Los novios quitan a alguien de su lista. Con deshacer y con registro. */
function portalBorrarInvitado(id) {
  const guest = state.guests.find((g) => g.id === id);
  const wedding = state.weddings.find((w) => w.id === state.portalWeddingId);
  if (!guest || !wedding) return;

  const posicion = state.guests.indexOf(guest);
  const copia = { ...guest };
  state.guests = state.guests.filter((g) => g.id !== id);
  if (state.portalDraft) delete state.portalDraft[id];

  addActivity(`Los novios quitaron a ${copia.name} de la lista de invitados`, wedding.couple, wedding.id);
  saveState();
  render();

  toastUndo(`${copia.name} fuera de la lista`, () => {
    state.guests.splice(Math.max(0, posicion), 0, copia);
    addActivity(`Los novios recuperaron a ${copia.name} en la lista`, wedding.couple, wedding.id);
    saveState();
    render();
  });
}

function savePortalChanges() {
  const draft = state.portalDraft || {};
  const ids = Object.keys(draft);
  if (!ids.length) return;

  const wedding = state.weddings.find((w) => w.id === state.portalWeddingId);
  const detalle = [];

  ids.forEach((id) => {
    const guest = state.guests.find((g) => g.id === id);
    if (!guest) return;
    Object.entries(draft[id]).forEach(([field, value]) => {
      const etiqueta = {
        rsvp: "confirmación",
        menu: "menú",
        allergy: "alergias",
        name: "nombre",
        group: "grupo",
        companion: "acompañante",
        table: "mesa",
      }[field] || field;
      detalle.push(`${guest.name}: ${etiqueta} → ${value || "sin datos"}`);
      guest[field] = value;
    });
  });

  state.portalDraft = {};
  addActivity(
    `Los novios actualizaron ${ids.length} invitado${ids.length === 1 ? "" : "s"} — ${detalle.slice(0, 3).join(" · ")}${detalle.length > 3 ? ` y ${detalle.length - 3} cambio${detalle.length - 3 === 1 ? "" : "s"} más` : ""}`,
    wedding?.couple || "Novios",
    state.portalWeddingId
  );
  saveState();
  render();
  toast("Cambios guardados. El equipo ya los puede ver.", 4500);
}

/**
 * Copia el enlace del portal de una boda al portapapeles.
 *
 * Es la pieza que faltaba para que el portal exista de verdad: hasta ahora no
 * había forma de que una pareja llegara a él (ver abrirDesdeEnlace en main.js).
 * El identificador de la boda va en la dirección y la contraseña sigue siendo
 * lo que protege el contenido, así que el enlace se puede mandar por WhatsApp
 * sin problema — pero la clave se envía aparte, nunca en el mismo mensaje.
 */
async function copiarEnlacePortal(weddingId) {
  const boda = state.weddings.find((w) => w.id === weddingId);
  if (!boda) return;
  const enlace = `${window.location.origin}${window.location.pathname}?boda=${encodeURIComponent(weddingId)}`;
  try {
    await navigator.clipboard.writeText(enlace);
    toast(`Enlace del portal de ${boda.couple} copiado. La contraseña, mejor en otro mensaje.`, 7000);
  } catch {
    // Sin permiso de portapapeles (http, navegador antiguo): se muestra para
    // copiarlo a mano, que es mejor que un fallo silencioso.
    openInfoModal({
      kicker: "Portal de novios",
      title: `Enlace para ${boda.couple}`,
      rows: [
        { label: "Enlace", value: enlace },
        { label: "Contraseña", value: "La que se fijó en la ficha de la boda — envíala en un mensaje aparte." },
      ],
    });
  }
}

async function portalLogin(event) {
  event.preventDefault();
  const password = new FormData(event.currentTarget).get("portalPassword");
  const wedding = state.weddings.find((w) => w.id === state.portalWeddingId);
  // El mismo freno que en el acceso del equipo. Aquí importa más todavía: la
  // contraseña del portal es corta y adivinable por diseño (LAURA2026), y
  // detrás hay nombres de invitados y alergias.
  const espera = esperaPorIntentos(`portal:${state.portalWeddingId}`);
  if (espera) {
    toast(`Demasiados intentos. Espera ${espera} segundo${espera === 1 ? "" : "s"}.`, 6000);
    return;
  }
  // Se compara contra el hash de la boda; el valor en claro no se persiste.
  const ok = wedding && (wedding.portalPasswordHash ? wedding.portalPasswordHash === (await hashPassword(password)) : Boolean(wedding.portalPassword) && wedding.portalPassword === password);
  if (!ok) {
    const reg = apuntarFallo(`portal:${state.portalWeddingId}`);
    const quedan = 5 - reg.fallos;
    toast(quedan > 0 && quedan <= 2 ? `Contraseña incorrecta. Quedan ${quedan} intento${quedan === 1 ? "" : "s"}.` : "Contraseña incorrecta");
    return;
  }
  limpiarIntentos(`portal:${state.portalWeddingId}`);
  state.portalUnlocked = true;
  saveState();
  render();
}

export { copiarEnlacePortal, portalBorrarInvitado, portalNuevaMesa, portalCrearMesa, portalEditarMesa, portalGuardarMesa, portalBorrarMesa, portalSentarInvitado, portalLogin, renderPortal, requestRincon, savePortalChanges, setPortalDraft };
