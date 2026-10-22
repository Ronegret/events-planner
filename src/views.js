import { icono } from "./iconos.js";
import { budgetGlobalSummary, budgetSummary, evolucionPresupuesto, renderBudgetTab, totalPartida } from "./budget.js";
import { renderAcuerdos, renderAgendaGlobal, renderCalendarioBoda } from "./agenda.js";
import { renderDocumentos } from "./documentos.js";
import { renderCierre, renderUsuariosParejas } from "./cierre.js";
import { renderPeso } from "./peso.js";
import { bodasDeReferencia, renderReferencia } from "./referencia.js";
import { AREAS, manualPorArea } from "./manual.js";
import { renderBuscadorWeb } from "./buscador-proveedores.js";
import { renderImportador } from "./importar.js";
import { buscar as buscarManual } from "./assistant.js";
import { renderAvisoAlergias, renderRegistroTratamiento } from "./rgpd.js";
import { areaChart, avatar, badge, distribucionBars, donutChart, leyendaChart, lineChart, miniStat, segmented, statCard } from "./charts.js";
import { renderContractTab } from "./contracts.js";
import { renderReceiptsPanel } from "./payments.js";
import { renderExport } from "./print.js";
import { fotoSrc, rinconGallery } from "./modals.js";
import { estadoSincronizacion, RECUPERACION_ACTIVA, cuando, fechaHora, estadoConexion, whatsappUrl, telUrl, EP_SERVICE_CATALOG, byWedding, byWeddingId, canManageUsers, daysUntil, isWeddingClosed, openTasks, formatDate, getWedding, isReady, isWeddingDayDone, paletteSwatches, pendingWeddingTasks, sortedWeddings, state, statusClass, text, weddingReadiness, weddingRisks, weddingTasks } from "./state.js";
import { renderVenueCanvas } from "./venue.js";
function renderLogin() {
  return `
    <main class="login">
      <section class="login-visual">
        <div class="login-visual-inner">
          <img class="login-visual-logo" src="./assets/brand/ep-logo-blanco.png?v=5" alt="" aria-hidden="true" />
          <h1>Cada boda,<br />paso a paso</h1>
          <p>Invitados, proveedores y el día del evento, en un solo sitio. Ideas, plan y grandes momentos.</p>
          <ul class="login-points">
            <li><span>◍</span>Ve cómo avanza la preparación de cada boda</li>
            <li><span>▦</span>Plano de mesas, menús y alergias listos para el catering</li>
            <li><span>♡</span>Un portal privado para que la pareja siga su boda</li>
          </ul>
        </div>
        <span class="login-visual-credit">Wedding + Events · Ideas · Plan · Grandes momentos</span>
      </section>

      <section class="login-panel">
        <div class="login-panel-inner">
          <img class="login-logo-panel" src="./assets/brand/ep-logo.png?v=5" alt="Events Planner" />
          ${RECUPERACION_ACTIVA && state.showForgotPassword ? renderForgotPasswordForm() : renderLoginForm()}
          <footer class="login-foot">
            <a href="https://www.example.com/politica-de-privacidad" target="_blank" rel="noopener noreferrer">Política de privacidad</a>
            <span>·</span>
            <span>Estudio Demo S.L.</span>
          </footer>
        </div>
      </section>
    </main>
  `;
}

function renderLoginForm() {
  // El usuario se recuerda entre sesiones (no la contraseña): en un equipo de
  // tres personas que entran a diario, ahorra escribirlo cada vez.
  const recordado = text(state.lastUsername || "");
  // En la demo el acceso viene puesto y anunciado: quien entra no tiene forma
  // de adivinar un usuario y una contraseña. Con la nube configurada esto no
  // aparece: cada persona tiene su propio acceso.
  const demo = !estadoSincronizacion().configurado;

  return `
    <form class="login-card" id="login-form" novalidate>
      <div class="login-head">
        <h2>Entrar</h2>
        <p>${demo ? "Versión de demostración. El acceso ya está puesto: solo tienes que entrar." : "Entra con tu usuario y tu contraseña del equipo."}</p>
      </div>

      ${demo ? `
      <p class="login-demo">
        <b>Acceso de prueba</b>
        usuario <code>admin</code> · contraseña <code>admin</code>
      </p>` : ""}

      <div class="field">
        <label for="login-user">Usuario</label>
        <input id="login-user" name="username" autocomplete="username" required
               autocapitalize="none" spellcheck="false" value="${demo ? "admin" : recordado}"
               placeholder="${demo ? "admin" : "usuario"}" aria-describedby="login-error" />
      </div>

      <div class="field">
        <label for="login-pass">Contraseña</label>
        <div class="input-with-action">
          <input id="login-pass" name="password" type="password" autocomplete="current-password"
                 required value="${demo ? "admin" : ""}" placeholder="••••••••" aria-describedby="login-error" />
          <button type="button" class="input-action" data-toggle-password="login-pass"
                  aria-label="Mostrar contraseña" title="Mostrar contraseña">👁</button>
        </div>
        <small class="caps-warning" id="caps-warning" hidden>⇪ Bloq Mayús está activado</small>
      </div>

      <p class="login-error" id="login-error" role="alert" hidden></p>

      <button class="btn primary login-submit" type="submit">
        <span class="login-submit-label">Entrar a Events Planner</span>
      </button>

      ${
        // Mientras la recuperación automática esté apagada (ver
        // RECUPERACION_ACTIVA en state.js) no se ofrece un botón que no puede
        // cumplir: se dice quién sí puede resolverlo.
        RECUPERACION_ACTIVA
          ? `<button class="link-btn login-forgot" type="button" id="forgot-password-link">¿Olvidaste tu contraseña?</button>`
          : demo
            ? ""   // en la demo no hay a quién pedírsela: el acceso está a la vista
            : `<p class="login-ayuda">¿Has olvidado la contraseña? Pídele a quien administre el equipo que te la restablezca desde Equipo.</p>`
      }
    </form>
  `;
}

function renderForgotPasswordForm() {
  return `
    <form class="login-card" id="forgot-form" novalidate>
      <div class="login-head">
        <h2>Recuperar acceso</h2>
        <p>Dinos quién eres y por dónde prefieres que te escribamos.</p>
      </div>

      <div class="field">
        <label for="forgot-user">Usuario, correo o teléfono</label>
        <input id="forgot-user" name="username" autocomplete="username" required
               autocapitalize="none" spellcheck="false" placeholder="tu usuario" />
      </div>

      <fieldset class="via-recuperacion">
        <legend>¿Por dónde te escribimos?</legend>
        <label class="via-op">
          <input type="radio" name="via" value="email" checked />
          <span class="via-ico" aria-hidden="true">✉</span>
          <span class="via-txt"><strong>Por correo</strong><small>Te llega un enlace para poner una contraseña nueva.</small></span>
        </label>
        <label class="via-op">
          <input type="radio" name="via" value="sms" />
          <span class="via-ico" aria-hidden="true">✆</span>
          <span class="via-txt"><strong>Por SMS</strong><small>Te llega un código al móvil que tengas guardado.</small></span>
        </label>
      </fieldset>

      <p class="login-error" id="login-error" role="alert" hidden></p>

      <button class="btn primary login-submit" type="submit">
        <span class="login-submit-label">Enviarme un correo</span>
      </button>

      <button class="link-btn login-forgot" type="button" id="back-to-login-link">← Volver a entrar</button>
    </form>
  `;
}

function renderSidebar() {
  // [vista, etiqueta, icono]. Los iconos son SVG propios (ver iconos.js): antes
  // eran símbolos Unicode que cada sistema dibujaba a su manera.
  const items = [
    ["dashboard", "Inicio", "inicio"],
    ["weddings", "Bodas", "bodas"],
    ["agenda", "Agenda", "agenda"],
    ["wedding", "Boda actual", "boda"],
    ["providers", "Proveedores", "proveedores"],
    ["rincones", "Rincones", "rincones"],
    ["documents", "Documentos", "documentos"],
    ["team", "Equipo", "equipo"],
    ["portal", "Portal de novios", "novios"],
    ["guide", "Guía", "guia"],
    ["settings", "Ajustes", "ajustes"],
  ];
  // Once destinos en fila son una lista que hay que leer entera cada vez. En
  // cuatro grupos se encuentra el sitio por la zona, no por la palabra.
  const grupos = [
    ["Planificar", ["dashboard", "weddings", "agenda", "wedding"]],
    ["Gestionar", ["providers", "rincones", "documents"]],
    ["Personas", ["team", "portal"]],
    ["Ayuda", ["guide", "settings"]],
  ];
  const itemDe = (view) => items.find(([id]) => id === view);
  const mobilePrimary = ["dashboard", "weddings", "agenda", "wedding"];
  const mobileExtra = items.filter(([view]) => !mobilePrimary.includes(view));
  const activeBoda = getWedding();
  const esActivo = (view) => state.view === view;

  // El botón «Boda actual» dice de qué boda se trata: sin eso hay que entrar
  // para saber qué hay detrás de la palabra.
  const sub = (view) => (view === "wedding" && activeBoda ? `<small class="nav-sub">${text(activeBoda.couple)}</small>` : "");
  const nombreAccesible = (view, label) => (view === "wedding" && activeBoda ? `${label} ${activeBoda.couple}` : label);
  const botonEscritorio = ([view, label, ico]) =>
    `<button class="${esActivo(view) ? "active" : ""}" data-view="${view}" data-label="${text(label)}" aria-label="${text(nombreAccesible(view, label))}"${esActivo(view) ? ' aria-current="page"' : ""}><span class="ico" aria-hidden="true">${icono(ico)}</span><span class="nav-text"><span>${label}</span>${sub(view)}</span></button>`;
  const botonMovil = ([view, label, ico]) =>
    `<button class="${esActivo(view) ? "active" : ""}" data-view="${view}"${esActivo(view) ? ' aria-current="page"' : ""}><span class="ico" aria-hidden="true">${icono(ico)}</span><span>${label}</span></button>`;
  const extraIsActive = mobileExtra.some(([view]) => esActivo(view));
  const iniciales = String(state.user.name || "?").trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase();

  return `
    <aside class="sidebar">
      <div class="brand">
        <img class="brand-logo" src="./assets/brand/ep-logo.png?v=4" alt="Events Planner" />
        <img class="brand-mono" src="./assets/brand/ep-monograma.png?v=4" alt="" aria-hidden="true" />
      </div>
      <nav class="nav desktop-nav" aria-label="Navegación principal">
        ${grupos
          .map(
            ([titulo, vistas]) => `<div class="nav-grupo" role="group" aria-label="${titulo}">
              <p class="nav-titulo" aria-hidden="true">${titulo}</p>
              ${vistas.map((v) => botonEscritorio(itemDe(v))).join("")}
            </div>`
          )
          .join("")}
      </nav>
      <nav class="mobile-nav" aria-label="Navegación principal móvil">
        ${botonMovil(itemDe("dashboard"))}
        ${botonMovil(itemDe("weddings"))}
        ${botonMovil(itemDe("agenda"))}
        ${botonMovil(itemDe("wedding"))}
        <button class="mobile-nav-more${extraIsActive || state.mobileMenuOpen ? " active" : ""}" type="button" data-mobile-menu aria-expanded="${Boolean(state.mobileMenuOpen)}" aria-controls="mobile-more-sheet" aria-haspopup="dialog">
          <span class="ico mobile-nav-more-icon" aria-hidden="true">${icono("mas")}</span>
          <span>Más</span>
        </button>
      </nav>
      <div class="sidebar-footer">
        <div class="user-chip">
          <span class="user-avatar" aria-hidden="true">${text(iniciales)}</span>
          <span class="user-text"><strong>${text(state.user.name)}</strong><small>${text(state.user.role)}</small></span>
        </div>
        <button class="btn sidebar-logout-btn" data-action="logout" aria-label="Salir de Events Planner" title="Salir">${icono("salir")}</button>
      </div>
    </aside>
    ${state.mobileMenuOpen ? `
      <div class="mobile-more-layer">
        <button class="mobile-more-backdrop" type="button" data-mobile-menu-close aria-label="Cerrar el menú"></button>
        <section class="mobile-more-sheet" id="mobile-more-sheet" role="dialog" aria-modal="true" aria-labelledby="mobile-more-title">
          <header class="mobile-more-head">
            <h2 id="mobile-more-title">Más</h2>
            <button class="mini-btn mobile-more-close" type="button" data-mobile-menu-close aria-label="Cerrar el menú">${icono("cerrar")}</button>
          </header>
          <div class="mobile-more-grid">
            ${mobileExtra.map(botonMovil).join("")}
          </div>
          <footer class="mobile-more-footer">
            <span class="user-chip"><span class="user-avatar" aria-hidden="true">${text(iniciales)}</span><span class="user-text"><strong>${text(state.user.name)}</strong><small>${text(state.user.role)}</small></span></span>
            <button class="btn" data-action="logout">Salir</button>
          </footer>
        </section>
      </div>
    ` : ""}
  `;
}

/**
 * Estado de conexión. Solo aparece cuando hay algo que decir — si todo va bien
 * y está sincronizado, no ocupa sitio. El día de la boda lo que importa es
 * saber que lo que se apunta no se está perdiendo, no ver un icono verde.
 */
function renderEstadoConexion() {
  const { online, pendientes, sincroniza } = estadoConexion();
  if (online && !pendientes) return "";

  if (!online) {
    return `<div class="conexion conexion-off" role="status" title="Sin conexión">
      <span class="conexion-punto"></span>
      <span class="conexion-txt">Sin conexión${pendientes && sincroniza ? ` · ${pendientes} por subir` : ""}</span>
      <span class="conexion-sub">Se guarda en este dispositivo</span>
    </div>`;
  }
  return `<div class="conexion conexion-pend" role="status" title="Pendiente de sincronizar">
    <span class="conexion-punto"></span>
    <span class="conexion-txt">${pendientes} cambio${pendientes === 1 ? "" : "s"} por subir</span>
  </div>`;
}

// ---------------------------------------------------------------------------
// Aviso de versión de demostración
// ---------------------------------------------------------------------------
// Esta franja NO es decorativa y no debe quitarse de la versión publicada.
//
// Todas las bodas, invitados, alergias, proveedores e importes que hay dentro
// están inventados. Una aplicación con aspecto de producto real encima de
// datos falsos, sin avisar, es exactamente la clase de cosa que hace que
// alguien tome por bueno lo que no lo es.
//
// Va arriba del todo, en todas las pantallas, y no se puede cerrar: si se
// pudiera, se cerraría en el primer minuto y ya no lo vería nadie más.
//
// Se muestra solo cuando NO hay nube configurada (versión de demostración).
function renderAvisoDemo() {
  if (estadoSincronizacion().configurado) return "";
  return `
    <div class="aviso-demo" role="region" aria-label="Aviso de demostración">
      <strong>Demostración</strong>
      <span>Datos de ejemplo. Ninguna boda, invitado, proveedor ni importe de esta pantalla es real.</span>
    </div>
  `;
}

// ---------------------------------------------------------------------------
// Aviso de que la nube no responde
// ---------------------------------------------------------------------------
// Esto existe porque el aviso vivía SOLO dentro de Ajustes, y nadie entra en
// Ajustes mientras trabaja. Con el proyecto de Supabase caído, la aplicación
// seguía funcionando con total normalidad —guardando en el propio móvil— sin
// decir una palabra. Tres personas podían pasarse el día apuntando cosas que
// las otras dos no verían nunca, y enterarse la víspera de la boda.
//
// La franja aparece SOLO cuando hay algo que contar. Si la nube va bien no se
// ve nada: un aviso permanente se vuelve parte del decorado y deja de leerse.
function renderAvisoNube() {
  const sinc = estadoSincronizacion();
  if (!sinc.configurado) return "";        // sin nube configurada, no hay nada que prometer
  if (sinc.conectado && !sinc.pendientes) return "";

  // La hora de la última subida solo se enseña si la hubo. «Última vez: nunca»
  // es ruido; lo que hace falta saber es si hay que preocuparse o no.
  const hora = sinc.ultima
    ? ` Última subida a las ${new Date(sinc.ultima).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}.`
    : "";

  // Dos situaciones distintas y conviene no confundirlas: o no se ha llegado a
  // conectar nunca, o se conectó y ahora hay cosas sin subir.
  const nuncaConecto = !sinc.conectado;

  // El texto es corto a propósito. En un móvil, cada línea de más empuja el
  // panel fuera de la pantalla, y un aviso que estorba se aprende a ignorar.
  const titulo = nuncaConecto
    ? "Solo en este dispositivo"
    : `${sinc.pendientes} cambio${sinc.pendientes === 1 ? "" : "s"} sin subir`;
  const detalle = nuncaConecto
    ? "El equipo no ve estos cambios. No se pierde nada: suben solos cuando vuelva la nube."
    : "Se reintenta solo. Mientras tanto quedan a salvo en este navegador.";

  return `
    <div class="aviso-nube" role="status">
      <span class="aviso-nube-icono" aria-hidden="true">${nuncaConecto ? "⚠" : "↑"}</span>
      <p><strong>${titulo}</strong>${text(detalle + hora)}</p>
      <button class="btn small" data-action="save-now">Reintentar</button>
    </div>
  `;
}

function renderTopbar() {
  const selectedWedding = getWedding();
  // text() en los dos valores que vienen de datos guardados (nombre de la
  // pareja y nombre de usuario): sin escapar, un nombre con etiquetas HTML
  // se ejecutaria al pintar la cabecera.
  const title = {
    // El saludo vive SOLO en el panel de Inicio, no aquí. Estaban los dos, y
    // encima se contradecían: la cabecera decía «Buenos días» fijo —escrito a
    // pelo, sin mirar la hora— mientras el panel decía «Buenas tardes» porque
    // ese sí la miraba. Saludar dos veces ya es raro; saludar dos veces
    // discrepando en la hora parece un error, y lo era.
    dashboard: "Inicio",
    weddings: "Bodas",
    agenda: "Agenda",
    wedding: selectedWedding ? text(selectedWedding.couple) : "Boda actual",
    team: "Equipo",
    providers: "Proveedores",
    rincones: "Rincones",
    documents: "Documentos",
    guide: "Guía",
    settings: "Ajustes",
  }[state.view] || "Events Planner";

  const subtitle =
    state.view === "wedding" && selectedWedding
      ? `${formatDate(selectedWedding.date)} · ${text(selectedWedding.venue || "Lugar por confirmar")}`
      : state.view === "dashboard"
        ? "" // el panel ya se presenta solo, con su saludo y su resumen
        : {
            weddings: "Todas tus bodas, de la más próxima a la más lejana.",
            agenda: "Reuniones y citas de todas las bodas.",
            team: "Quién hace qué en tu equipo.",
            providers: "Tu agenda de proveedores, lista para reutilizar.",
            rincones: "Los ambientes que ofreces y cómo va su preparación.",
            documents: "Contratos, presupuestos y archivos en un solo sitio.",
            guide: "Respuestas rápidas para cada pantalla.",
            settings: "Tu cuenta, las copias de seguridad y la privacidad.",
          }[state.view] || "Ideas, plan y grandes momentos.";

  const readiness = state.view === "wedding" && selectedWedding ? weddingReadiness(selectedWedding) : null;

  return `
    <header class="topbar">
      <div class="topbar-left">
        <h1>${title}</h1>
        ${subtitle ? `<p>${subtitle}</p>` : ""}
      </div>
      <div class="topbar-right actions">
        ${renderEstadoConexion()}
        ${state.view === "wedding" && selectedWedding ? `
          <div class="topbar-readiness" title="Preparación de la boda">
            <div class="topbar-readiness-ring">
              <svg viewBox="0 0 36 36" width="36" height="36">
                <circle cx="18" cy="18" r="14" fill="none" stroke="var(--ep-green-soft)" stroke-width="3"/>
                <circle cx="18" cy="18" r="14" fill="none" stroke="var(--ep-green)" stroke-width="3"
                  stroke-dasharray="${Math.round((readiness?.score || 0) * 0.88)} 88"
                  stroke-linecap="round" transform="rotate(-90 18 18)"/>
              </svg>
              <span>${readiness?.score || 0}%</span>
            </div>
          </div>
          <button class="btn primary" data-action="save-now" id="topbar-save-btn" title="Guardar y sincronizar" aria-label="Guardar y sincronizar cambios">
            <span class="save-indicator" id="save-indicator">✓</span><span class="save-btn-text">Guardar</span>
          </button>
          <button class="btn" data-open-wedding-tab="${selectedWedding.id}:exportar" title="Generar dossier">↗ Dossier</button>
        ` : ""}
      </div>
    </header>
  `;
}

function renderCurrentView() {
  if (state.view === "dashboard") return renderDashboard();
  if (state.view === "weddings") return renderWeddings();
  if (state.view === "wedding-new") return renderWeddingForm();
  if (state.view === "importar") return renderImportador();
  if (state.view === "agenda") return renderAgendaGlobal();
  if (state.view === "wedding") return renderWeddingDetail();
  if (state.view === "team") return renderTeam();
  if (state.view === "providers") return renderProvidersGlobal();
  if (state.view === "rincones") return renderRinconesGlobal();
  if (state.view === "documents") return renderDocumentsGlobal();
  if (state.view === "guide") return renderGuide();
  if (state.view === "settings") return renderSettings();
  return renderDashboard();
}

function renderDashboard() {
  const weddings = sortedWeddings();
  const next = weddings[0];
  const risks = next ? weddingRisks(next) : [];

  // --- Metricas de cabecera -------------------------------------------------
  // Una boda deja de estar activa cuando se marca como finalizada O cuando ya
  // ha pasado su fecha. Antes solo se miraba el texto del estado, y como ese
  // texto se queda en «En preparacion» para siempre, el panel anunciaba tres
  // bodas activas cuando las tres ya se habian celebrado. Un indicador que
  // miente es peor que no tenerlo: se deja de mirar el panel entero.
  // `isWeddingClosed` ya resolvia esto bien —es lo que hace que la ficha ponga
  // «Celebrada»—, solo que este contador no lo usaba.
  const activeWeddings = state.weddings.filter((w) => !isWeddingClosed(w)).length;
  const celebradas = state.weddings.length - activeWeddings;
  const pendingTasks = openTasks().length;
  const dueThisWeek = openTasks().filter((t) => withinDays(t.due, 7)).length;
  const nextMonth = weddings.filter((w) => withinDays(w.date, 30)).length;

  // El dinero sale del presupuesto real (modelo A/B), no de los avisos de pago:
  // los avisos son solo los plazos que el equipo ha comunicado, y suelen ir muy
  // por detrás de lo que la boda ya tiene comprometido.
  const dinero = budgetGlobalSummary();
  const budgetTotal = dinero.total;
  const paidTotal = dinero.pagado;
  const paidPct = budgetTotal ? Math.round((paidTotal / budgetTotal) * 100) : 0;

  const allGuests = state.guests;
  const confirmedGuests = allGuests.filter((g) => badgeTone(g.rsvp) === "verde").length;
  const guestPct = allGuests.length ? Math.round((confirmedGuests / allGuests.length) * 100) : 0;

  return `
    ${renderDashHeader()}

    <div class="stat-row">
      ${statCard({
        icon: "▦", tone: "verde", label: "Bodas activas", value: activeWeddings,
        sub: nextMonth
          ? `${nextMonth} en los próximos 30 días`
          : celebradas
            ? `${celebradas} ya ${celebradas === 1 ? "celebrada" : "celebradas"}`
            : "Ninguna este mes",
        spark: monthlySeries(state.weddings, () => true).total,
      })}
      ${statCard({
        icon: "✓", tone: "rosa", label: "Tareas pendientes", value: pendingTasks,
        sub: dueThisWeek ? `${dueThisWeek} vencen esta semana` : "Ninguna urgente",
        spark: monthlySeries(state.tasks, (t) => !isReady(t.status)).hechos,
      })}
      ${statCard({
        icon: "€", tone: "mostaza", label: "Presupuesto total", value: formatPrice(budgetTotal),
        sub: dinero.total ? `${paidPct} % ya pagado · ${formatPrice(dinero.noFacturado)} sin facturar` : `${paidPct}% pagado`,
        progress: paidPct,
      })}
      ${statCard({
        icon: "◎", tone: "clay", label: "Invitados confirmados", value: confirmedGuests,
        sub: `de ${allGuests.length} invitados`, progress: guestPct,
      })}
    </div>

    <div class="dash-grid-2">
      ${renderProximasBodas(weddings)}
      ${renderTareasHoy()}
    </div>

    <div class="dash-grid-2">
      ${renderResumenGeneral()}
      ${renderDistribucionPresupuesto()}
    </div>

    ${renderEvolucionEconomica()}

    <div class="dash-grid-2">
      ${renderCronogramaDia(next)}
      ${renderActividadYRecordatorios(risks, next)}
    </div>

    <section class="brand-closing">
      <div>
        <h3>Cada boda es una historia única</h3>
        <p>Estamos aquí para ayudarte a hacerla inolvidable.</p>
        <span class="brand-closing-sign">Con cariño, el equipo ♡</span>
      </div>
    </section>
  `;
}

/** Saludo + buscador global, segun el boceto. */
function renderDashHeader() {
  const hour = new Date().getHours();
  const greeting = hour < 13 ? "Buenos días" : hour < 20 ? "Buenas tardes" : "Buenas noches";
  return `
    <header class="dash-header">
      <div>
        <h2 class="dash-title">¡${text(greeting)}, ${text(String(state.user.name || "").split(" ")[0])}!</h2>
        <p class="dash-sub">Aquí tienes el resumen de tus bodas y tareas de hoy.</p>
      </div>
    </header>
  `;
}

/** ¿La fecha cae dentro de los proximos N dias? */
function withinDays(date, days) {
  const d = daysUntil(date);
  return d !== null && d >= 0 && d <= days;
}

function renderProximasBodas(weddings) {
  return `
    <section class="panel">
      <div class="panel-head">
        <h3 class="card-title">Próximas bodas</h3>
        <button class="link-btn" data-view="weddings">Ver todas</button>
      </div>
      <div class="wed-list">
        ${
          weddings.slice(0, 4).map((w) => {
            const r = weddingReadiness(w);
            const d = daysUntil(w.date);
            return `<article class="wed-item">
              <button class="wed-item-open" data-select-wedding="${w.id}" title="Abrir ${text(w.couple)}">
                <span class="wed-thumb">${coverImage(w, "thumb")}</span>
                <span class="wed-body">
                  <span class="wed-top">
                    <strong>${text(w.couple)}</strong>
                    ${badge(displayStatus(w), statusTone(displayStatus(w)))}
                  </span>
                  <span class="wed-meta">${formatDate(w.date)}${d !== null && d >= 0 ? ` · ${d === 0 ? "¡Hoy!" : `faltan ${d} días`}` : ""}</span>
                  <span class="wed-meta">${text(w.venue || "Lugar por definir")}</span>
                  <span class="wed-progress-row">
                    <span class="wed-pct">${r.score}% completado</span>
                    <span class="progress"><span style="width:${r.score}%"></span></span>
                  </span>
                </span>
              </button>
              <button class="row-menu-btn" data-open-wedding-tab="${w.id}:tareas" title="Ver tareas de ${text(w.couple)}" aria-label="Tareas de ${text(w.couple)}">⋮</button>
            </article>`;
          }).join("") || `<p class="chart-empty">Aún no hay bodas creadas.</p>`
        }
      </div>
    </section>
  `;
}

/** Tareas con vencimiento hoy o ya pasado, de toda la cartera. */
function renderTareasHoy() {
  // Solo tareas de bodas todavia abiertas: las de una boda ya celebrada no
  // son "de hoy", por muy vencida que este su fecha.
  const abiertas = openTasks();
  const items = abiertas
    .filter((t) => {
      const d = daysUntil(t.due);
      return d !== null && d <= 0;
    })
    .concat(abiertas.filter((t) => daysUntil(t.due) === null))
    .slice(0, 6);
  const list = items.length ? items : openTasks().slice(0, 6);

  return `
    <section class="panel">
      <div class="panel-head">
        <h3 class="card-title">Tareas de hoy</h3>
        <button class="link-btn" data-view="weddings">Ver todas</button>
      </div>
      <div class="today-list">
        ${
          list.map((t) => {
            const done = isReady(t.status);
            const w = state.weddings.find((x) => x.id === t.weddingId);
            return `<div class="today-item${done ? " done" : ""}">
              <button class="today-check" data-toggle-task="${t.id}" title="${done ? "Marcar como pendiente" : "Marcar como hecha"}" aria-label="${done ? "Hecha" : "Pendiente"}">${done ? "✓" : ""}</button>
              <div class="today-body">
                <strong>${text(t.title)}</strong>
                <small>${text(w?.couple || "Sin boda")}</small>
              </div>
              <span class="today-when ${done ? "ok" : ""}">${done ? "Completada" : text(t.due ? formatDate(t.due) : "Sin fecha")}</span>
            </div>`;
          }).join("") || `<p class="chart-empty">No hay tareas pendientes. 🎉</p>`
        }
      </div>
      <button class="add-inline-btn" data-action="new-task">+ Añadir nueva tarea</button>
    </section>
  `;
}

function renderResumenGeneral() {
  const serie = monthlySeries(state.tasks, (t) => isReady(t.status));
  // Mismo criterio que en el panel: finalizada o con la fecha ya pasada.
  const activeWeddings = state.weddings.filter((w) => !isWeddingClosed(w)).length;
  const pendingTasks = openTasks().length;
  const budgetTotal = budgetGlobalSummary().total;
  const confirmed = state.guests.filter((g) => badgeTone(g.rsvp) === "verde").length;
  return `
    <section class="panel chart-card">
      <div class="panel-head">
        <h3 class="card-title">Resumen general</h3>
        <span class="pill">Últimos 6 meses</span>
      </div>
      ${areaChart(serie.etiquetas, serie.total)}
      <div class="summary-strip">
        <div><strong>${activeWeddings}</strong><span>Bodas activas</span></div>
        <div><strong>${pendingTasks}</strong><span>Tareas pendientes</span></div>
        <div><strong>${formatPrice(budgetTotal)}</strong><span>Presupuesto</span></div>
        <div><strong>${confirmed}</strong><span>Confirmados</span></div>
      </div>
    </section>
  `;
}

function renderDistribucionPresupuesto() {
  // El reparto sale de la única fuente económica vigente: Presupuesto.
  // Mantener aquí los antiguos avisos de pago hacía que el resumen y la ficha
  // de la boda pudieran mostrar cifras distintas.
  const byConcept = {};
  const add = (label, amount) => {
    const value = Number(amount) || 0;
    if (!value) return;
    const key = String(label || "Otros").trim() || "Otros";
    byConcept[key] = (byConcept[key] || 0) + value;
  };
  state.budget.forEach((item) => add(item.categoria || item.concepto, totalPartida(item)));

  const rows = Object.entries(byConcept)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([label, value]) => ({ label, value }));

  const target = state.selectedWeddingId || sortedWeddings()[0]?.id || "";

  return `
    <section class="panel chart-card">
      <div class="panel-head">
        <h3 class="card-title">Distribución del presupuesto</h3>
        ${target ? `<button class="link-btn" data-open-wedding-tab="${target}:presupuesto">Ver detalle</button>` : ""}
      </div>
      ${
        rows.length
          ? donutChart(rows, (v) => formatPrice(v), "Total")
          : `<div class="budget-empty">
              <span class="budget-empty-icon">€</span>
              <strong>Todavía no hay importes</strong>
              <p>Crea las partidas del presupuesto de cada boda para ver aquí su reparto.</p>
              ${target ? `<button class="btn primary btn-xs" data-open-wedding-tab="${target}:presupuesto">Crear partidas</button>` : ""}
            </div>`
      }
    </section>
  `;
}

/**
 * Evolución económica real de la agencia.
 *
 * No es una gráfica decorativa: cada punto se calcula sobre las fechas reales
 * de las partidas (fecha de acuerdo, o de alta si no la hay) y sobre la fecha
 * en que se marcaron pagadas. La distancia entre las dos líneas es el dinero
 * comprometido que todavía está por salir — que es exactamente el número por
 * el que una se despierta a las tres de la mañana.
 */
function renderEvolucionEconomica() {
  const ev = evolucionPresupuesto(null, 6);
  const dinero = budgetGlobalSummary();
  const hayDatos = ev.real.some((v) => v > 0);

  const reparto = [
    { label: "Facturado (A + IVA)", value: Math.round(dinero.facturado) },
    { label: "No facturado (B)", value: Math.round(dinero.noFacturado) },
  ];

  return `
    <div class="dash-grid-2">
      <section class="panel chart-card">
        <div class="panel-head">
          <div>
            <h3 class="card-title">Evolución económica</h3>
            <p class="card-sub">Comprometido frente a pagado, acumulado mes a mes.</p>
          </div>
        </div>
        ${
          hayDatos
            ? `${lineChart(ev.etiquetas, [{ nombre: "Comprometido", valores: ev.real.map(Math.round) }, { nombre: "Pagado", valores: ev.pagado.map(Math.round) }], formatPrice)}
               <p class="chart-foot">Pendiente de salir: <strong>${text(formatPrice(dinero.total - dinero.pagado))}</strong>${dinero.objetivo ? ` · objetivo conjunto ${text(formatPrice(dinero.objetivo))}` : ""}</p>`
            : `<div class="budget-empty">
                <span class="budget-empty-icon">€</span>
                <strong>Sin partidas de presupuesto</strong>
                <p>Anota las partidas de cada boda en su pestaña Presupuesto y esta gráfica se llenará sola.</p>
              </div>`
        }
      </section>

      <section class="panel chart-card">
        <div class="panel-head">
          <div>
            <h3 class="card-title">Facturado y no facturado</h3>
            <p class="card-sub">El reparto A/B de todo lo gestionado.</p>
          </div>
        </div>
        ${
          hayDatos
            ? `${donutChart(reparto, formatPrice, "Total")}
               <div class="pendiente-grid" style="margin-top:16px">
                 <article class="pendiente-card">
                   <h4>Facturado</h4>
                   <div class="pendiente-cifras"><div class="pend"><span>Pendiente de pago (A)</span><strong>${text(formatPrice(dinero.facturadoPendiente))}</strong></div></div>
                 </article>
                 <article class="pendiente-card">
                   <h4>No facturado</h4>
                   <div class="pendiente-cifras"><div class="pend"><span>Pendiente de pago (B)</span><strong>${text(formatPrice(dinero.noFacturadoPendiente))}</strong></div></div>
                 </article>
               </div>`
            : `<p class="chart-empty">Sin datos todavía.</p>`
        }
      </section>
    </div>
  `;
}

function renderCronogramaDia(next) {
  const items = next ? byWeddingId("timeline", next.id).slice().sort((a, b) => String(a.time).localeCompare(String(b.time))).slice(0, 5) : [];
  return `
    <section class="panel">
      <div class="panel-head">
        <div>
          <h3 class="card-title">Cronograma del día</h3>
          <p class="card-sub">${next ? text(next.couple) : "Sin boda seleccionada"}</p>
        </div>
        ${next ? `<button class="link-btn" data-open-wedding-tab="${next.id}:timeline">Ver completo</button>` : ""}
      </div>
      <ol class="timeline-list">
        ${
          items.map((i) => `<li class="timeline-item">
            <span class="timeline-time">${text(i.time)}</span>
            <span class="timeline-dot"></span>
            <span class="timeline-body">
              <strong>${text(i.title)}</strong>
              <small>${text(i.owner || "Equipo")}${i.note ? ` · ${text(i.note)}` : ""}</small>
            </span>
            <span class="pill pill-sm">${text(i.category || i.status || "Evento")}</span>
          </li>`).join("") || `<p class="chart-empty">Todavía no hay eventos en el cronograma.</p>`
        }
      </ol>
    </section>
  `;
}

function renderActividadYRecordatorios(risks, next) {
  return `
    <div class="dash-stack">
      <section class="panel">
        <div class="panel-head"><h3 class="card-title">Actividad reciente</h3></div>
        <div class="dash-activity">
          ${state.activity.slice(0, 4).map((a) => `<div class="dash-activity-item">
            <p>${text(a.text)}</p><small>${text(a.actor)} · ${text(cuando(a.at || a.time))}</small>
          </div>`).join("") || `<p class="chart-empty">Sin actividad todavía.</p>`}
        </div>
      </section>

      <section class="panel reminders-panel">
        <div class="panel-head"><h3 class="card-title">Recordatorios importantes</h3></div>
        <div class="risk-list">
          ${
            risks.length
              ? risks.slice(0, 4).map((r) => `<button class="risk-item ${r.level}" data-open-wedding-tab="${next.id}:${r.tab}">
                  <span></span><strong>${text(r.label)}</strong><small>Abrir</small>
                </button>`).join("")
              : `<p class="chart-empty">Nada urgente. Todo en orden.</p>`
          }
        </div>
      </section>
    </div>
  `;
}

/** Reparte registros por mes (ultimos 6) y devuelve acumulados total/hechos. */
function monthlySeries(items, isDone) {
  const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  const hoy = new Date();
  const etiquetas = [];
  const total = [];
  const hechos = [];
  let accTotal = 0;
  let accHechos = 0;
  for (let i = 5; i >= 0; i--) {
    const ref = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
    const fin = new Date(hoy.getFullYear(), hoy.getMonth() - i + 1, 1);
    etiquetas.push(MESES[ref.getMonth()]);
    const enMes = items.filter((it) => {
      const f = new Date(it.createdAt || it.date || 0);
      return f >= ref && f < fin;
    });
    accTotal += enMes.length;
    accHechos += enMes.filter(isDone).length;
    total.push(accTotal);
    hechos.push(accHechos);
  }
  // Si no hay fechas utiles, se reparte el total actual de forma plana para
  // que el grafico comunique volumen en vez de quedarse en cero.
  if (accTotal === 0 && items.length) {
    const t = items.length;
    const h = items.filter(isDone).length;
    return { etiquetas, total: etiquetas.map((_, i) => Math.round((t * (i + 1)) / 6)), hechos: etiquetas.map((_, i) => Math.round((h * (i + 1)) / 6)) };
  }
  return { etiquetas, total, hechos };
}

/** Serie de cobros: real acumulado vs. objetivo lineal hasta el total. */
function monthlyPaymentSeries() {
  const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  const hoy = new Date();
  const etiquetas = [];
  for (let i = 5; i >= 0; i--) etiquetas.push(MESES[new Date(hoy.getFullYear(), hoy.getMonth() - i, 1).getMonth()]);
  const pagado = state.payments.filter((p) => p.estado === "Pagado").reduce((s, p) => s + (Number(p.importe) || 0), 0);
  const totalComprometido = state.payments.reduce((s, p) => s + (Number(p.importe) || 0), 0);
  return {
    etiquetas,
    real: etiquetas.map((_, i) => Math.round((pagado * (i + 1)) / 6)),
    objetivo: etiquetas.map((_, i) => Math.round((totalComprometido * (i + 1)) / 6)),
  };
}

/**
 * Estado que se muestra de la boda. Si la fecha ya pasó, manda la fecha por
 * encima de lo que ponga el campo: una boda de junio no puede seguir
 * anunciándose como "En preparación" en agosto.
 */
function displayStatus(wedding) {
  if (!wedding) return "";
  if (/finaliz|cancel/i.test(wedding.status || "")) return wedding.status;
  const remaining = daysUntil(wedding.date);
  if (remaining !== null && remaining < 0) return "Celebrada";
  const status = wedding.status || "Sin estado";
  return status
    .replace(/^En preparacion$/i, "En preparación")
    .replace(/^Primera reunion$/i, "Primera reunión");
}

/** Mapea el estado comercial de una boda a los 4 tonos del Badge. */
function statusTone(status) {
  if (/celebrada/i.test(String(status || ""))) return "neutro";
  const v = String(status || "").toLowerCase();
  if (/finaliz/.test(v)) return "neutro";
  if (/semana|preparacion|preparación/.test(v)) return "rojo";
  if (/contratada/.test(v)) return "verde";
  if (/propuesta|reunion|reunión/.test(v)) return "mostaza";
  return "neutro";
}

function renderWeddingTaskSummary(summary) {
  const preview = summary.pending.slice(0, 2);
  const statusText = summary.pending.length ? `${summary.pending.length} pendientes` : "Todo listo";
  return `
    <div class="task-summary">
      <div class="section-title compact">
        <div>
          <h4>${text(summary.wedding.couple)}</h4>
          <p>${formatDate(summary.wedding.date)} · ${text(summary.wedding.lead || "Equipo")}</p>
        </div>
        <span class="pill">${statusText}</span>
      </div>
      <div class="task-preview">
        ${preview.length ? preview.map((task) => `<span>${text(task.title)} · ${text(task.owner || "Equipo")} · ${text(task.status || "Pendiente")}</span>`).join("") : `<span>Sin tareas pendientes para esta boda.</span>`}
      </div>
      <button class="btn sage" data-open-wedding-tab="${summary.wedding.id}:tareas">Ver tareas</button>
    </div>
  `;
}

function renderWeddings() {
  const filtered = filteredWeddings();
  const total = state.weddings.length;
  // El alta de una boda es una pantalla aparte (vista "wedding-new"), no un
  // desplegable dentro de esta: son quince campos, varios servicios y una
  // paleta, y desplegarlos bajo las tarjetas obligaba a hacer scroll a ciegas
  // sin saber cuánto quedaba.
  return `
    <div class="section-title page-actions">
      <div>
        <h3>Parejas${total ? ` · ${total}` : ""}</h3>
        <p>Ordenadas por fecha: la próxima boda aparece primero.</p>
      </div>
      <div class="actions">
        ${
          // Las bodas de referencia se buscan AQUÍ, no en Ajustes. Estaban
          // solo allí y no había forma humana de dar con ellas.
          bodasDeReferencia().length
            ? `<button class="btn" data-quitar-referencia>${icono("cerrar")} Quitar las de ejemplo</button>`
            : `<button class="btn" data-cargar-referencia title="Bodas de ejemplo, ya celebradas o en curso, para aprender la herramienta con datos de muestra.">◇ Cargar bodas de ejemplo</button>`
        }
        <button class="btn primary${state.destacarNuevaBoda ? " destacado" : ""}" data-action="new-wedding"><span class="icon-btn">+</span> Nueva boda</button>
      </div>
    </div>
    ${total ? renderWeddingFilters() : ""}
    ${
      filtered.length
        ? `<div class="grid weddings-grid">${filtered.map(renderWeddingCard).join("")}</div>`
        : total
          ? `<section class="empty empty-large"><h3>Ninguna pareja coincide con el filtro</h3><p>Prueba a limpiar la búsqueda o cambiar el estado seleccionado.</p></section>`
          : `<section class="empty empty-large">
              <h3>Todavía no hay bodas creadas</h3>
              <p>Añade la primera pareja con sus datos, paleta y servicios, o carga las bodas de ejemplo para ver la herramienta en marcha. Llevan la etiqueta «Referencia» y puedes quitarlas cuando quieras.</p>
              <div class="actions" style="justify-content:center">
                <button class="btn primary" data-action="new-wedding"><span class="icon-btn">+</span> Crear la primera boda</button>
                <button class="btn" data-cargar-referencia>◇ Cargar bodas de ejemplo</button>
              </div>
            </section>`
    }
  `;
}

function filteredWeddings() {
  const query = state.weddingSearch.trim().toLowerCase();
  return sortedWeddings().filter((wedding) => {
    const textMatch = !query || [wedding.couple, wedding.venue, wedding.ceremony, wedding.status, wedding.lead].some((value) => String(value || "").toLowerCase().includes(query));
    // Se filtra por el estado visible, no por el campo guardado: si en
    // pantalla pone "Celebrada", filtrar por "Celebrada" tiene que encontrarla.
    const filterMatch = state.weddingFilter === "Todas" || displayStatus(wedding) === state.weddingFilter;
    return textMatch && filterMatch;
  });
}

function renderWeddingFilters() {
  const statuses = ["Todas", ...new Set(state.weddings.map(displayStatus).filter(Boolean))];
  return `
    <section class="panel toolbar-panel">
      <div class="field search-field">
        <label>Buscar boda</label>
        <input data-wedding-search value="${text(state.weddingSearch)}" placeholder="Pareja, lugar, responsable..." />
      </div>
      <div class="field">
        <label>Filtrar estado</label>
        <select data-wedding-filter>${statuses.map((status) => `<option${status === state.weddingFilter ? " selected" : ""}>${text(status)}</option>`).join("")}</select>
      </div>
    </section>
  `;
}

function renderEmpty(title, text, action, labelText) {
  return `
    <section class="empty empty-large">
      <h3>${title}</h3>
      <p>${text}</p>
      ${action ? `<button class="btn primary" data-action="${action}">${labelText}</button>` : ""}
    </section>
  `;
}

function renderWeddingForm() {
  return `
    <nav class="volver-nav">
      <button class="link-btn" data-action="cancel-wedding-form">← Volver a las bodas</button>
    </nav>
    <section class="panel form-panel">
      <div class="section-title">
        <div>
          <h3>Nueva boda</h3>
          <p>Completa la información base. Después podrás añadir timeline, invitados, mesas, proveedores, documentos y Wedding Day.</p>
        </div>
        <button class="btn" data-action="cancel-wedding-form">Cancelar</button>
      </div>
      <form class="form wedding-form" data-wedding-form>
        <div class="grid cols-3">
          <div class="field"><label>Nombre pareja</label><input name="couple" required placeholder="Ej. Lucía & Martín" /></div>
          <div class="field"><label>Fecha boda</label><input name="date" type="date" required /></div>
          <div class="field"><label>Estado</label><select name="status"><option>Lead</option><option>Primera reunión</option><option>Propuesta enviada</option><option>Contratada</option><option>En preparación</option><option>Semana de boda</option><option>Finalizada</option></select></div>
        </div>
        <div class="grid cols-3">
          <div class="field"><label>Lugar ceremonia</label><input name="ceremony" placeholder="Iglesia, finca, playa..." /></div>
          <div class="field"><label>Lugar celebración</label><input name="venue" placeholder="Finca, hotel, restaurante..." /></div>
          <div class="field"><label>Invitados estimados</label><input name="guestsEstimate" type="number" min="0" value="0" /></div>
        </div>
        <div class="grid cols-2">
          <div class="field"><label>Dirección ceremonia</label><input name="ceremonyAddress" placeholder="Calle, ciudad o enlace de ubicación" /></div>
          <div class="field"><label>Dirección celebración</label><input name="venueAddress" placeholder="Calle, ciudad o enlace de ubicación" /></div>
        </div>
        <div class="grid cols-3">
          <div class="field"><label>Responsable principal</label><select name="lead">${state.users.map((user) => `<option>${text(user.name)}</option>`).join("")}</select></div>
          <div class="field"><label>Contraseña del portal de novios</label><input name="portalPassword" placeholder="Ej. LUCIA2027" /></div>
        </div>
        <div class="palette-editor">
          <div class="field"><label>Color principal</label><input name="palettePrimary" type="color" value="#56603f" /></div>
          <div class="field"><label>Color secundario</label><input name="paletteSecondary" type="color" value="#d6b36b" /></div>
          <div class="field"><label>Color acento</label><input name="paletteAccent" type="color" value="#f4efe4" /></div>
          <div class="field palette-note"><label>Concepto de paleta</label><input name="paletteNotes" placeholder="Musgo, oro y crema" /></div>
        </div>
        <div class="grid cols-2">
          <div class="field"><label>Estilo / concepto</label><textarea name="style" placeholder="Mediterránea, elegante, editorial, natural..."></textarea></div>
          <div class="field"><label>Notas iniciales</label><textarea name="notes" placeholder="Necesidades, prioridades, dudas, proveedores ya elegidos..."></textarea></div>
        </div>
        ${renderPickerBlock({
          title: "Servicios contratados",
          hint: "Elige del catálogo lo que incluye esta boda. Es lo que verá la pareja en su portal y en el contrato.",
          selectAttr: "data-add-service",
          placeholder: "Añadir servicio del catálogo...",
          options: EP_SERVICE_CATALOG.map(([title], i) => ({ value: String(i), label: title })).filter((o) => !state.draftServices.some((d) => d.title === o.label)),
          rows: state.draftServices,
          removeAttr: "data-remove-service",
          priceAttr: "data-service-price",
          noteAttr: "data-service-note",
          emptyText: "Todavía no has añadido ningún servicio. Usa el desplegable de arriba.",
        })}

        ${renderPickerBlock({
          title: "Rincones",
          hint: "Espacios ambientados que se incluyen desde el inicio. Podrás añadir más luego desde la boda.",
          selectAttr: "data-add-rincon",
          placeholder: "Añadir rincón del catálogo...",
          options: state.rincones
            .filter((r) => !r.weddingId && !state.draftRincones.some((d) => d.title === r.name))
            .map((r) => ({ value: r.id, label: r.name })),
          rows: state.draftRincones,
          removeAttr: "data-remove-rincon",
          priceAttr: "data-rincon-price",
          noteAttr: "data-rincon-note",
          emptyText: "Todavía no has añadido ningún rincón.",
        })}
        <div class="actions" style="justify-content:flex-start">
          <button class="btn primary" type="submit">Crear boda</button>
          <button class="btn" type="button" data-action="cancel-wedding-form">Cancelar</button>
        </div>
      </form>
    </section>
  `;
}

// ============================================================================
// Bloque "elegir de catalogo y acumular": un desplegable arriba y debajo la
// lista de lo ya añadido, cada linea con su precio editable y un total vivo.
// Sustituye al muro de 10 servicios con checkbox que salia siempre desplegado.
// ============================================================================
function renderPickerBlock({ title, hint, selectAttr, placeholder, options, rows, removeAttr, priceAttr, noteAttr, emptyText }) {
  const total = rows.reduce((sum, row) => sum + (Number(row.price) || 0), 0);
  return `
    <section class="picker-block">
      <div class="picker-head">
        <div>
          <h3>${text(title)}</h3>
          <p>${text(hint)}</p>
        </div>
        <span class="picker-count">${rows.length}</span>
      </div>

      <select class="picker-select" ${selectAttr}>
        <option value="">${text(placeholder)}</option>
        ${options.map((o) => `<option value="${text(o.value)}">${text(o.label)}</option>`).join("")}
      </select>

      <div class="picker-rows">
        ${
          rows.length
            ? rows
                .map(
                  (row, index) => `
          <div class="picker-row">
            <div class="picker-row-main">
              <strong>${text(row.title)}</strong>
              <input class="picker-note" ${noteAttr}="${index}" value="${text(row.notes || "")}" placeholder="Observación para los novios" />
            </div>
            <div class="picker-row-price">
              <input type="number" min="0" step="10" ${priceAttr}="${index}" value="${Number(row.price) || 0}" aria-label="Precio de ${text(row.title)}" />
              <span>€</span>
            </div>
            <button type="button" class="picker-remove" ${removeAttr}="${index}" title="Quitar ${text(row.title)}" aria-label="Quitar ${text(row.title)}">${icono("cerrar")}</button>
          </div>
        `
                )
                .join("")
            : `<p class="picker-empty">${text(emptyText)}</p>`
        }
      </div>

      ${rows.length ? `<div class="picker-total"><span>Total</span><strong>${formatPrice(total)}</strong></div>` : ""}
    </section>
  `;
}

function countdownLabel(date) {
  const remaining = daysUntil(date);
  if (remaining === null) return "Sin fecha";
  if (remaining < 0) return "Celebrada";
  if (remaining === 0) return "¡Es hoy!";
  return `${remaining} día${remaining === 1 ? "" : "s"}`;
}

/**
 * Portada de una boda. Se usa <img> en vez de background-image para poder
 * diferir la carga (`loading="lazy"`) y decodificarla fuera del hilo
 * principal; mientras llega se ve un degradado de la paleta de la pareja en
 * lugar de un hueco gris, y si falla la imagen el degradado se queda.
 */
/**
 * Portada de una boda.
 *
 * Sin foto, aquí solo había un degradado plano de dos colores. Con cuatro
 * bodas en pantalla eso son cuatro manchas grises que no dicen nada y hacen
 * que el listado parezca a medio hacer.
 *
 * Ahora, mientras no haya foto, se dibuja un degradado con la paleta propia
 * de la boda (más dos círculos decorativos). Se sigue distinguiendo una boda
 * de otra de un vistazo y no da la sensación de que falte algo — que es lo
 * que pasa con un hueco vacío. Antes llevaba también las iniciales de la
 * pareja escritas muy grandes encima del degradado, pero esa franja es la
 * misma donde `.wedding-cover-foot` pinta el nombre completo: con la tarjeta
 * a su altura real (no el rectángulo cuadrado con el que se diseñó el SVG)
 * las dos caían una encima de la otra y quedaban ilegibles, montadas la una
 * sobre la otra — el nombre solo hace falta escribirlo una vez.
 */
function coverImage(wedding, variant = "cover") {
  const alt = `Portada de ${text(wedding.couple)}`;
  const p1 = text(wedding.palettePrimary || "#56603f");
  const p2 = text(wedding.paletteSecondary || "#d6b36b");
  const p3 = text(wedding.paletteAccent || "#f4efe4");
  const tint = `linear-gradient(135deg, ${p1}, ${p2})`;

  // El monograma no es solo el caso «no hay foto»: va SIEMPRE debajo, y la
  // foto se pinta encima. Así, si la foto tarda, falla o el sitio está sin
  // cobertura, lo que se ve es el degradado de la pareja — nunca un hueco.
  // Antes el `onerror` quitaba la imagen y dejaba un degradado vacío, que es
  // justo lo que se veía en el listado de bodas.
  const uid = text(wedding.id);
  const monograma = `<svg class="cover-mono" viewBox="0 0 400 260" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id="g-${uid}" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="${p1}"/>
          <stop offset="100%" stop-color="${p2}"/>
        </linearGradient>
      </defs>
      <rect width="400" height="260" fill="url(#g-${uid})"/>
      <circle cx="330" cy="40" r="86" fill="${p3}" opacity=".16"/>
      <circle cx="60" cy="220" r="64" fill="${p3}" opacity=".12"/>
    </svg>`;

  const foto = text(wedding.cover || "");
  if (foto) {
    return `<span class="cover-media cover-${text(variant)} cover-con-foto" style="--cover-tint:${tint}" role="img" aria-label="${alt}">
      ${monograma}
      <img src="${foto}" data-cover-boda="${uid}" data-fade-img alt="" loading="lazy" decoding="async" />
    </span>`;
  }

  return `<span class="cover-media cover-${text(variant)} cover-monograma" style="--cover-tint:${tint}" role="img" aria-label="${alt}">
    ${monograma}
  </span>`;
}


function renderWeddingCard(wedding) {
  const pending = pendingWeddingTasks(wedding.id);
  const readiness = weddingReadiness(wedding);
  // Zona clickable abre la boda. Acciones separadas en dos niveles:
  // primarias (visibles siempre) y secundarias/peligrosas (separadas visualmente).
  return `
    <article class="card wedding-card">
      <div class="wedding-cover" data-select-wedding="${wedding.id}" title="Abrir ${text(wedding.couple)}">
        ${coverImage(wedding, "cover")}
        <button type="button" class="cover-edit-btn" data-open-cover-picker="${wedding.id}" title="Cambiar foto de portada" aria-label="Cambiar foto de portada de ${text(wedding.couple)}">${icono("editar")}</button>
        ${
          // Hay que distinguir a simple vista «la boda que estoy gestionando»
          // de «la que tengo abierta para aprender». Las dos son reales.
          wedding.esReferencia ? `<span class="chip-referencia" title="Boda de ejemplo, inventada">Ejemplo</span>` : ""
        }
        <span class="wedding-countdown">${text(countdownLabel(wedding.date))}</span>
        <div class="wedding-cover-foot">
          <h3>${text(wedding.couple)}</h3>
          <span class="wedding-readiness-badge">${readiness.score}%</span>
        </div>
      </div>
      <div class="wedding-body">
        <div class="wedding-body-clickable" data-select-wedding="${wedding.id}" title="Abrir ${text(wedding.couple)}">
          <div class="meta">
            <span class="pill">${formatDate(wedding.date)}</span>
            <span class="pill status-pill-${text(displayStatus(wedding)).toLowerCase().replace(/\s+/g, "-")}">${text(displayStatus(wedding))}</span>
            <span class="pill">${wedding.guestsEstimate || 0} inv.</span>
          </div>
          <p class="wedding-venue-name">${text(wedding.venue || "Lugar por confirmar")}</p>
          <div class="task-badge ${pending.length ? "" : "done"}">
            <strong>${isWeddingClosed(wedding) ? "✓" : pending.length}</strong>
            <span>${isWeddingClosed(wedding) ? "boda celebrada" : pending.length === 1 ? "tarea pendiente" : pending.length === 0 ? "todo listo" : "tareas pendientes"}</span>
          </div>
          <div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${readiness.score}" aria-label="Preparación"><div style="width:${readiness.score}%"></div></div>
        </div>
        <div class="wedding-card-actions">
          <div class="wedding-card-primary-actions">
            <button class="btn sage wedding-card-btn" data-open-wedding-tab="${wedding.id}:tareas" title="Ver tareas pendientes">
              <span class="icon-btn">✓</span> Tareas
            </button>
            <button class="btn wedding-card-btn" data-wedding-day="${wedding.id}" title="Control del día de la boda">
              ⚡ Wedding Day
            </button>
          </div>
          <div class="wedding-card-secondary-actions">
            <button class="mini-btn" data-edit-wedding="${wedding.id}" title="Editar datos de la boda">${icono("editar")} Editar</button>
            <button class="mini-btn" data-duplicar-boda="${wedding.id}" title="Usar esta boda como plantilla para una nueva">⧉ Duplicar</button>
            <button class="mini-btn danger-text" data-delete-wedding="${wedding.id}" title="Eliminar boda" aria-label="Eliminar boda de ${text(wedding.couple)}">${icono("cerrar")}</button>
          </div>
        </div>
      </div>
    </article>
  `;
}

// ============================================================================
// Navegación del workspace en dos niveles. 18 pestañas a la vez son 18
// decisiones cada vez que entras; agrupadas en 6 áreas son una decisión y
// luego otra pequeña. El área activa se deduce de la pestaña abierta, así
// que enlaces como "Ver timeline" siguen funcionando sin tocar nada.
// ============================================================================
const WEDDING_AREAS = [
  { id: "resumen", label: "Resumen", icon: "◍", tabs: ["resumen"] },
  { id: "plan", label: "Planificación", icon: "✓", tabs: ["tareas", "calendario", "acuerdos", "timeline", "weddingday"] },
  { id: "personas", label: "Personas", icon: "◎", tabs: ["invitados", "mesas", "transportes"] },
  { id: "produccion", label: "Producción", icon: "◇", tabs: ["proveedores", "rincones", "musica", "fotos"] },
  { id: "gestion", label: "Gestión", icon: "€", tabs: ["servicios", "presupuesto", "contrato", "incidencias", "documentos"] },
  // "Cierre" no describía lo que hay dentro: exportadores y registro son
  // herramientas, y se usan durante toda la boda, no al terminarla.
  { id: "herramientas", label: "Herramientas", icon: "↗", tabs: ["actividad", "exportar"] },
];

function areaOf(tab) {
  return WEDDING_AREAS.find((a) => a.tabs.includes(tab)) || WEDDING_AREAS[0];
}

function renderWeddingDetail() {
  if (!getWedding()) return renderEmpty("Selecciona o crea una boda", "Cada boda tiene su propio espacio con equipo, invitados, proveedores, timeline y Wedding Day.", "", "");

  const area = areaOf(state.selectedTab);

  return `
    <nav class="area-nav" aria-label="Áreas de la boda">
      ${WEDDING_AREAS.map(
        (a) => `<button class="area-btn${a.id === area.id ? " active" : ""}" data-tab="${a.tabs[0]}" aria-current="${a.id === area.id}">
          <span class="area-ico">${a.icon}</span>
          <span class="area-label">${text(a.label)}</span>
          ${a.tabs.length > 1 ? `<span class="area-count">${a.tabs.length}</span>` : ""}
        </button>`
      ).join("")}
    </nav>

    ${
      area.tabs.length > 1
        ? `<div class="subtab-nav" aria-label="Secciones de ${text(area.label)}">
            ${area.tabs.map((tab) => `<button class="subtab-btn${state.selectedTab === tab ? " active" : ""}" data-tab="${tab}">${label(tab)}</button>`).join("")}
          </div>`
        : ""
    }

    <div class="tab-panel" key="${text(state.selectedTab)}">${renderWeddingTab()}</div>
  `;
}

function label(value) {
  return {
    resumen: "Resumen",
    tareas: "Tareas",
    calendario: "Calendario",
    acuerdos: "Acuerdos",
    servicios: "Servicios",
    presupuesto: "Presupuesto",
    timeline: "Timeline",
    weddingday: "Wedding Day",
    invitados: "Invitados",
    mesas: "Mesas",
    proveedores: "Proveedores",
    rincones: "Rincones",
    musica: "Música",
    fotos: "Fotos",
    transportes: "Transportes",
    contrato: "Contrato",
    incidencias: "Incidencias",
    documentos: "Documentos",
    actividad: "Actividad",
    exportar: "Exportar",
  }[value] || value;
}

function renderWeddingTab() {
  const wedding = getWedding();
  if (state.selectedTab === "resumen") return renderResumenTab(wedding);
  if (state.selectedTab === "tareas") return renderTasksPanel();
  if (state.selectedTab === "calendario") return renderCalendarioBoda();
  if (state.selectedTab === "servicios") return renderServices();
  if (state.selectedTab === "presupuesto") return `${renderBudgetTab()}${renderReceiptsPanel(wedding, true)}`;
  if (state.selectedTab === "timeline") return renderTimelineTab();
  if (state.selectedTab === "weddingday") return renderWeddingDay();
  if (state.selectedTab === "invitados") return renderCollection("Invitados", "new-guest", byWedding("guests").map(renderGuest).join(""), "guests");
  if (state.selectedTab === "mesas") return renderMesasTab();
  if (state.selectedTab === "proveedores") return renderProvidersWedding();
  if (state.selectedTab === "rincones") return `${renderRinconRequests()}${renderRinconesWedding()}`;
  if (state.selectedTab === "contrato") return renderContractTab();
  if (state.selectedTab === "musica") return renderCollection("Música por momentos", "new-music", byWedding("music").map(renderMusic).join(""), "music");
  if (state.selectedTab === "fotos") return renderCollection("Lista de fotos", "new-shot", byWedding("shotList").map(renderShot).join(""), "shotList");
  if (state.selectedTab === "transportes") return renderCollection("Transportes", "new-transport", byWedding("transports").map(renderTransport).join(""), "transports");
  if (state.selectedTab === "incidencias") return renderCollection("Incidencias y contingencias", "new-issue", byWedding("issues").map(renderIssue).join(""), "issues");
  if (state.selectedTab === "documentos") return renderDocumentos(false);
  if (state.selectedTab === "actividad")
    return `<section class="panel">${renderSectionToolbar("Actividad", "activity")}<div class="list">${byWedding("activity").map(renderActivity).join("")}</div></section>${renderCierre()}`;
  if (state.selectedTab === "acuerdos") return renderAcuerdos();
  if (state.selectedTab === "exportar") return renderExport();
  // Una pestaña que ya no existe (un enlace viejo, una copia restaurada de una
  // versión anterior) devolvía `undefined` y se pintaba la palabra en pantalla.
  return renderEmpty("Esta sección ya no existe", "Puede que venga de un enlace antiguo. Elige una de las áreas de arriba para seguir.", "", "");
}

// ============================================================================
// Resumen de boda: la portada operativa. Responde de un vistazo a "¿cómo va
// esto?" — cuánto falta, qué está preparado, qué se cobra, quién viene y qué
// es lo siguiente que toca. Todo lo demás vive en su pestaña.
// ============================================================================
function renderResumenTab(wedding) {
  const pending = pendingWeddingTasks(wedding.id);
  const readiness = weddingReadiness(wedding);
  const risks = weddingRisks(wedding);
  const dias = daysUntil(wedding.date);
  const cerrada = isWeddingClosed(wedding);

  const guests = byWedding("guests");
  const confirmed = guests.filter((g) => badgeTone(g.rsvp) === "verde").length;
  const tables = byWedding("tables");
  const providers = byWedding("providers");
  const providersOk = providers.filter((p) => isReady(p.status)).length;
  const services = byWedding("services");
  const presupuesto = budgetSummary(wedding.id);
  const timeline = byWedding("timeline").slice().sort((a, b) => String(a.time).localeCompare(String(b.time)));
  const siguiente = timeline.find((i) => !isReady(i.status)) || timeline[0];

  return `
    <div class="resumen-hero">
      <div class="resumen-hero-main">
        <span class="eyebrow">${text(displayStatus(wedding))}</span>
        <h2>${text(wedding.couple)}</h2>
        <p>${formatDate(wedding.date)} · ${text(wedding.venue || "Lugar por confirmar")}</p>
        <div class="resumen-hero-meta">
          ${wedding.ceremony ? `<span class="pill">${text(wedding.ceremony)}</span>` : ""}
          ${wedding.style ? `<span class="pill">${text(wedding.style)}</span>` : ""}
          <span class="pill">${text(wedding.lead || "Equipo")}</span>
        </div>
      </div>
      <div class="resumen-hero-count ${cerrada ? "cerrada" : dias === 0 ? "hoy" : ""}">
        ${
          dias === null
            ? `<strong>—</strong><span>sin fecha</span>`
            : cerrada
              ? `<strong>♡</strong><span>celebrada</span>`
              : dias === 0
                ? `<strong>¡Hoy!</strong><span>es el día</span>`
                : `<strong>${dias}</strong><span>${dias === 1 ? "día" : "días"}</span>`
        }
      </div>
    </div>

    <div class="stat-row">
      ${statCard({ icon: "◍", tone: "verde", label: "Preparación", value: `${readiness.score}%`, sub: `${readiness.ready} de ${readiness.total} bloques`, progress: readiness.score })}
      ${statCard({ icon: "◎", tone: "clay", label: "Invitados", value: guests.length, sub: `${confirmed} confirmados · ${tables.length} mesas`, progress: guests.length ? (confirmed / guests.length) * 100 : 0 })}
      ${statCard({ icon: "◇", tone: "rosa", label: "Proveedores", value: providers.length, sub: `${providersOk} confirmados`, progress: providers.length ? (providersOk / providers.length) * 100 : 0 })}
      ${statCard({ icon: "€", tone: "mostaza", label: "Presupuesto", value: presupuesto.total ? formatPrice(presupuesto.total) : "Sin definir", sub: presupuesto.total ? `${Math.round((presupuesto.pagado / presupuesto.total) * 100)} % pagado` : "Crea las partidas", progress: presupuesto.total ? (presupuesto.pagado / presupuesto.total) * 100 : 0 })}
    </div>

    <div class="dash-grid-2">
      <section class="panel">
        <div class="panel-head">
          <h3 class="card-title">La boda</h3>
          <button class="btn btn-outline btn-xs" data-edit-wedding="${wedding.id}">${icono("editar")} Editar datos</button>
        </div>

        ${wedding.notes ? `<p class="resumen-notes">${text(wedding.notes)}</p>` : ""}

        <dl class="resumen-datos">
          <div><dt>Ceremonia</dt><dd>${text(wedding.ceremony || "Por definir")}</dd></div>
          <div><dt>Celebración</dt><dd>${text(wedding.venue || "Por definir")}</dd></div>
          <div><dt>Responsable</dt><dd>${text(wedding.lead || "Equipo")}</dd></div>
          <div><dt>Invitados previstos</dt><dd>${wedding.guestsEstimate || guests.length || "—"}</dd></div>
        </dl>

        <div class="actions" style="justify-content:flex-start;margin:14px 0">
          <button class="btn btn-outline btn-xs" data-map-search="${text(wedding.ceremonyAddress || wedding.ceremony)}">◈ Ceremonia</button>
          <button class="btn btn-outline btn-xs" data-map-search="${text(wedding.venueAddress || wedding.venue)}">◈ Celebración</button>
        </div>

        <div class="resumen-paleta">
          <div>
            <span class="eyebrow">Paleta de la pareja</span>
            <p>${text(wedding.paletteNotes)}</p>
          </div>
          ${paletteSwatches(wedding)}
        </div>

        <div class="subpanel resumen-apuntes">
          <span class="eyebrow">Apuntes de la primera reunión</span>
          <p>${wedding.firstMeetingNotes ? text(wedding.firstMeetingNotes) : `<em>Sin apuntes todavía. Se añaden al editar los datos de la boda.</em>`}</p>
          <small>Solo para el equipo · no lo ven los novios.</small>
        </div>
      </section>

      <div class="dash-stack">
        ${
          siguiente
            ? `<section class="panel resumen-next">
                <span class="eyebrow">Siguiente en el timeline</span>
                <div class="resumen-next-body">
                  <strong class="resumen-next-time">${text(siguiente.time || "--:--")}</strong>
                  <div>
                    <h4>${text(siguiente.title)}</h4>
                    <p>${text(siguiente.owner || "Equipo")}${siguiente.note ? ` · ${text(siguiente.note)}` : ""}</p>
                  </div>
                </div>
                <button class="btn btn-outline btn-xs" data-open-wedding-tab="${wedding.id}:timeline">Ver timeline completo</button>
              </section>`
            : `<section class="panel resumen-next">
                <span class="eyebrow">Timeline</span>
                <p class="chart-empty">Todavía no hay momentos. Empieza por la llegada del equipo.</p>
                <button class="btn primary btn-xs" data-open-wedding-tab="${wedding.id}:timeline">Crear el timeline</button>
              </section>`
        }

        <section class="panel">
          <div class="panel-head">
            <h3 class="card-title">Tareas pendientes</h3>
            <span class="badge ${pending.length ? "mostaza" : "verde"}">${cerrada ? "Cerrada" : pending.length || "Al día"}</span>
          </div>
          <div class="list">${pending.slice(0, 4).map(renderTask).join("") || `<p class="chart-empty">${cerrada ? "La boda ya se celebró." : "No queda nada pendiente."}</p>`}</div>
          ${pending.length > 4 ? `<button class="link-btn" data-open-wedding-tab="${wedding.id}:tareas" style="margin-top:10px">Ver las ${pending.length} tareas</button>` : ""}
        </section>

        <section class="panel">
          <div class="panel-head"><h3 class="card-title">Atención prioritaria</h3></div>
          <div class="risk-list">${risks.length ? risks.slice(0, 4).map((r) => `<button class="risk-item ${r.level}" data-open-wedding-tab="${wedding.id}:${r.tab}"><span></span><strong>${text(r.label)}</strong><small>Abrir</small></button>`).join("") : `<p class="chart-empty">Nada urgente en esta boda.</p>`}</div>
        </section>

        <section class="panel">
          <div class="panel-head"><h3 class="card-title">Ir a</h3></div>
          <div class="resumen-jumps">
            <button data-open-wedding-tab="${wedding.id}:invitados"><span>◎</span>Invitados<small>${guests.length}</small></button>
            <button data-open-wedding-tab="${wedding.id}:mesas"><span>▦</span>Mesas<small>${tables.length}</small></button>
            <button data-open-wedding-tab="${wedding.id}:proveedores"><span>◇</span>Proveedores<small>${providers.length}</small></button>
            <button data-open-wedding-tab="${wedding.id}:weddingday"><span>⚡</span>Wedding Day<small>${timeline.length}</small></button>
            <button data-open-wedding-tab="${wedding.id}:presupuesto"><span>€</span>Presupuesto<small>${presupuesto.items.length}</small></button>
            <button data-open-wedding-tab="${wedding.id}:exportar"><span>↗</span>Exportar<small></small></button>
          </div>
        </section>
      </div>
    </div>
  `;
}

function renderTasksPanel() {
  const wedding = getWedding();
  const tasks = weddingTasks(wedding.id);
  const pending = tasks.filter((task) => !isReady(task.status));
  const ready = tasks.filter((task) => isReady(task.status));
  return `
    <section class="panel">
      <div class="section-title">
        <div>
          <h3>Tareas de ${text(wedding.couple)}</h3>
          <p>La lista de tareas de la boda: pendientes, en trámite y listas, con responsable y fecha.</p>
        </div>
        <div class="actions">
          <button class="btn" data-print-section="tasks" title="Generar PDF">↓ PDF</button>
          <button class="btn primary" data-action="new-task"><span class="icon-btn">+</span> Nueva tarea</button>
        </div>
      </div>
      <div class="grid cols-3 task-stats">
        <article><span>Pendientes</span><strong>${pending.length}</strong></article>
        <article><span>Listas</span><strong>${ready.length}</strong></article>
        <article><span>Total</span><strong>${tasks.length}</strong></article>
      </div>
      <div class="grid cols-2 task-board" style="margin-top:16px">
        <section class="subpanel">
          <h4>Pendientes y en tramitación</h4>
          <div class="list">${pending.map(renderTask).join("") || `<div class="empty">No quedan tareas pendientes para esta boda.</div>`}</div>
        </section>
        <section class="subpanel">
          <h4>Completadas</h4>
          <div class="list">${ready.map(renderTask).join("") || `<div class="empty">Cuando una tarea esté lista aparecerá aquí.</div>`}</div>
        </section>
      </div>
    </section>
    ${renderTareasDeRincones(wedding)}
  `;
}

/**
 * La preparación de los rincones, dentro de Tareas.
 *
 * Vive aparte de las tareas generales a propósito, no por comodidad: «comprar
 * las chuches del candy bar» y «enviar el contrato» son trabajos distintos, con
 * responsables distintos y en momentos distintos. Mezclarlas dejaba la lista
 * ilegible justo la semana en que más se consulta.
 *
 * Pero tampoco pueden vivir SOLO dentro de cada ficha de rincón: allí no se ven
 * si no entras rincón por rincón, y lo que hace falta la víspera es una lista
 * de la compra de toda la boda de un vistazo.
 *
 * Esto NO se muestra en el portal: es trabajo interno del equipo.
 */
function renderTareasDeRincones(wedding) {
  const rincones = byWeddingId("rincones", wedding.id);
  const todas = state.rinconTasks.filter((t) => rincones.some((r) => r.id === t.rinconId));
  if (!todas.length) {
    return `
      <section class="panel">
        <div class="section-title"><div>
          <h3>Preparación de los rincones</h3>
          <p>Lo que hay que comprar, encargar o montar para cada rincón. Solo lo ve el equipo.</p>
        </div></div>
        <div class="empty">
          <h3>Todavía no hay nada apuntado</h3>
          <p>Entra en <b>Producción › Rincones</b> y usa «+ Tarea» en el rincón que sea: comprar las chuches, encargar el neón, alquilar el espejo…</p>
        </div>
      </section>`;
  }

  const lista = (tareas) =>
    tareas.length
      ? tareas
          .map((t) => {
            const rincon = rincones.find((r) => r.id === t.rinconId);
            return `<div class="tr-fila">
              <span class="tr-rincon">${text(rincon?.name || "Rincón")}</span>
              ${renderRinconTaskRow(t)}
            </div>`;
          })
          .join("")
      : "";

  const pendientes = todas.filter((t) => t.status !== "Listo");
  const listas = todas.filter((t) => t.status === "Listo");

  return `
    <section class="panel" style="margin-top:16px">
      <div class="section-title"><div>
        <h3>Preparación de los rincones</h3>
        <p>Lo que hay que comprar, encargar o montar. Solo lo ve el equipo — los novios no ven nada de esto.</p>
      </div></div>
      <div class="grid cols-3 task-stats">
        <article><span>Por hacer</span><strong>${todas.filter((t) => t.status === "Pendiente").length}</strong></article>
        <article><span>Pedido / en camino</span><strong>${todas.filter((t) => t.status === "Pedido / en camino").length}</strong></article>
        <article><span>Listas</span><strong>${listas.length}</strong></article>
      </div>
      <div class="grid cols-2 task-board" style="margin-top:16px">
        <section class="subpanel">
          <h4>Pendientes y en camino</h4>
          <div class="list">${lista(pendientes) || `<div class="empty">Todo preparado.</div>`}</div>
        </section>
        <section class="subpanel">
          <h4>Listas</h4>
          <div class="list">${lista(listas) || `<div class="empty">Cuando algo esté listo aparecerá aquí.</div>`}</div>
        </section>
      </div>
    </section>
  `;
}

function renderSectionToolbar(title, section) {
  return `
    <div class="section-title print-toolbar">
      <div><h3>${title}</h3></div>
      <div class="actions">
        ${section ? `<button class="btn" data-print-section="${section}" title="Generar PDF imprimible">↓ PDF</button>` : ""}
      </div>
    </div>
  `;
}

function renderCollection(title, action, rows, section = "") {
  return `
    <section class="panel">
      <div class="section-title">
        <h3>${title}</h3>
        <div class="actions">
          ${section ? `<button class="btn" data-print-section="${section}" title="Generar PDF">↓ PDF</button>` : ""}
          <button class="btn primary" data-action="${action}"><span class="icon-btn">+</span> Añadir</button>
        </div>
      </div>
      <div class="list">${rows || `<div class="empty">Todavía no hay información en esta sección.</div>`}</div>
    </section>
  `;
}

// ============================================================================
// Timeline con eje central e hitos alternos (boceto "wedding timeline").
// Cada momento lleva su icono, hora destacada y las acciones escondidas
// hasta que se pasa por encima, para que el eje se lea limpio.
// ============================================================================

/** Icono por tipo de momento, deducido del titulo o la categoria. */
function timelineIcon(item) {
  const v = `${item.category || ""} ${item.title || ""}`.toLowerCase();
  if (/peinado|maquilla|muah|estilis|preparativ/.test(v)) return "✻";
  if (/ceremonia|novi|anillo|altar/.test(v)) return "♡";
  if (/foto|reportaje|photocall/.test(v)) return "◉";
  if (/coctel|cóctel|aperitiv|bienvenid/.test(v)) return "◇";
  if (/banquete|comida|cena|catering|menú|menu/.test(v)) return "▦";
  if (/tarta|postre|pastel/.test(v)) return "✿";
  if (/baile|fiesta|dj|música|musica|barra/.test(v)) return "♪";
  if (/bus|coche|traslado|transport|llegada|salida/.test(v)) return "→";
  if (/montaje|desmontaje|proveedor/.test(v)) return "⚒";
  return "•";
}

function renderTimelineTab() {
  const items = byWedding("timeline").slice().sort((a, b) => String(a.time).localeCompare(String(b.time)));
  const done = items.filter((i) => isReady(i.status)).length;

  return `
    <section class="panel">
      <div class="panel-head">
        <div>
          <h3 class="card-title">Timeline del día</h3>
          <p class="card-sub">${items.length} momentos · ${done} confirmados</p>
        </div>
        <div class="actions">
          <button class="btn" data-print-section="timeline" title="Generar PDF">↓ PDF</button>
          <button class="btn primary" data-action="new-timeline"><span class="icon-btn">+</span> Añadir momento</button>
        </div>
      </div>

      ${
        items.length
          ? `<ol class="tl">${items.map(renderTimelineMilestone).join("")}</ol>`
          : `<div class="empty">Todavía no hay momentos. Empieza por la llegada del equipo y ve añadiendo hasta el desmontaje.</div>`
      }
    </section>
  `;
}

/**
 * Un hito del timeline. Una sola columna: hora, eje con el nodo y la tarjeta
 * — se lee de arriba abajo como la escaleta real del día. El zigzag obligaba
 * a saltar la vista de lado a lado en cada línea.
 */
function renderTimelineMilestone(item) {
  const ready = isReady(item.status);
  return `
    <li class="tl-item${ready ? " done" : ""}">
      <span class="tl-time">${text(item.time || "--:--")}</span>
      <span class="tl-rail"><span class="tl-node"><span class="tl-icon">${timelineIcon(item)}</span></span></span>
      <div class="tl-card">
        <div class="tl-card-head">
          <h4>${text(item.title)}</h4>
          <div class="tl-card-tools">
            ${badge(item.status || "Pendiente", badgeTone(item.status))}
            <button class="mini-btn" data-edit-item="timeline:${item.id}" title="Editar momento" aria-label="Editar ${text(item.title)}">${icono("editar")}</button>
            <button class="mini-btn danger-text" data-delete-item="timeline:${item.id}" title="Eliminar momento" aria-label="Eliminar ${text(item.title)}">${icono("cerrar")}</button>
          </div>
        </div>
        <p class="tl-meta">
          ${item.owner ? `<span class="tl-owner">${text(item.owner)}</span>` : ""}
          ${item.category ? `<span class="tl-cat">${text(item.category)}</span>` : ""}
        </p>
        ${item.note ? `<p class="tl-note">${text(item.note)}</p>` : ""}
      </div>
    </li>
  `;
}

function renderTimeline(item) {
  return `
    <div class="row task-row">
      <div class="time">${text(item.time)}</div>
      <div>
        <h4>${text(item.title)}</h4>
        <p>${text(item.category)} · Responsable: ${text(item.owner)} · ${text(item.note)}</p>
      </div>
      <div class="inline-tools"><span class="status-dot ${statusClass(item.status)}"></span><span class="pill">${text(item.status || "Pendiente")}</span><button class="mini-btn" data-edit-item="timeline:${item.id}">Editar</button><button class="mini-btn" data-delete-item="timeline:${item.id}">Borrar</button></div>
    </div>
  `;
}

function renderWeddingDay() {
  const items = byWedding("timeline").sort((a, b) => a.time.localeCompare(b.time));
  const next = items.find((item) => !isWeddingDayDone(item.status)) || items[0];
  return `
    <section class="panel">
      <div class="section-title">
        <div>
          <h3>Control del Wedding Day</h3>
          <p>Próximo evento: <strong>${text(next?.time || "--:--")} ${text(next?.title || "Sin eventos")}</strong></p>
        </div>
        <div class="actions"><button class="btn" data-print-section="weddingday" title="Generar PDF del día">↓ PDF</button></div>
      </div>
      <div class="list">
        ${items
          .map(
            (item) => `
              <div class="row">
                <div class="time">${text(item.time)}</div>
                <div>
                  <h4>${text(item.title)}</h4>
                  <p>${text(item.owner)} · ${text(item.note)}</p>
                </div>
                <div class="inline-tools">${item.completedBy ? `<span class="pill pill-sm">${text(item.completedBy)}</span>` : ""}<button class="btn ${isWeddingDayDone(item.status) ? "sage done" : "warn"}" data-complete="${item.id}">${isWeddingDayDone(item.status) ? "✓ Hecho" : "Confirmar"}</button></div>
              </div>
            `
          )
          .join("")}
      </div>
    </section>
  `;
}

/**
 * Servicios contratados para la boda.
 *
 * Solo producto: lo que la pareja ha contratado y lo que paga por ello. Antes
 * esta pantalla mezclaba eso con procesos internos ("Gestión de proveedores",
 * "Timeline y planning"), y el resultado era una lista de tareas con precio —
 * que además acababa saliendo tal cual en el contrato, con líneas que la
 * pareja nunca había firmado.
 *
 * El trabajo interno vive en Tareas, que es su sitio.
 */
function renderServices() {
  const services = byWedding("services");
  const wedding = getWedding();
  const total = services.reduce((s, x) => s + (Number(x.price) || 0), 0);
  const contrato = state.contracts.find((c) => c.weddingId === wedding?.id);

  return `
    <section class="panel">
      <div class="section-title">
        <div>
          <h3>Servicios contratados</h3>
          <p>Lo que ${wedding ? text(wedding.couple) : "la pareja"} ha contratado, con su precio. Es exactamente lo que sale en el contrato.</p>
        </div>
        <div class="actions">
          <button class="btn" data-print-section="services" title="Generar PDF">↓ PDF</button>
          <button class="btn primary" data-action="new-service"><span class="icon-btn">+</span> Añadir servicio</button>
        </div>
      </div>

      ${
        services.length
          ? `<div class="servicios-lista">${services.map(renderService).join("")}</div>
             <div class="servicios-total">
               <span>Total contratado</span>
               <strong>${text(formatPrice(total))}</strong>
             </div>
             ${
               contrato?.generatedAt
                 ? `<p class="servicios-nota">Estos servicios están recogidos en el contrato generado el ${text(formatDate(contrato.generatedAt))}. Si añades o quitas alguno ahora, hazlo con un <b>anexo</b> desde la pestaña Contrato — el contrato firmado no se toca.</p>`
                 : `<p class="servicios-nota">Cuando generes el contrato, estos servicios y estos importes serán los que aparezcan en él.</p>`
             }`
          : `<div class="empty empty-large">
              <h3>Todavía no hay servicios contratados</h3>
              <p>Añade lo que esta pareja ha contratado: organización integral, Wedding Day, decoración… con el precio que paga por cada cosa.</p>
              <button class="btn primary" data-action="new-service"><span class="icon-btn">+</span> Añadir el primero</button>
            </div>`
      }
    </section>
  `;
}

function renderService(item) {
  return `
    <div class="servicio">
      <div class="servicio-cuerpo">
        <h4>${text(item.title)}</h4>
        ${item.notes ? `<p>${text(item.notes)}</p>` : ""}
      </div>
      <div class="servicio-pvp">
        <strong>${item.price ? text(formatPrice(item.price)) : "Sin precio"}</strong>
        <div class="inline-tools">
          <button class="mini-btn" data-edit-item="services:${item.id}" title="Editar" aria-label="Editar ${text(item.title)}">${icono("editar")}</button>
          <button class="mini-btn danger-text" data-delete-item="services:${item.id}" title="Quitar" aria-label="Quitar ${text(item.title)}">${icono("cerrar")}</button>
        </div>
      </div>
    </div>
  `;
}

/**
 * Dinero para leer de un vistazo: euros enteros, sin céntimos.
 * Antes salían cosas como "98.348,5 €" — el IVA genera decimales y
 * toLocaleString los arrastraba tal cual. En un panel eso se lee como un
 * error de la app, no como una cifra.
 */
// `useGrouping: "always"` no es un capricho: por defecto el español omite el
// separador en los números de cuatro cifras, así que en una misma pantalla
// salía «3764,00 €» junto a «37.764,00 €» y parecían de dos sistemas
// distintos. En una columna de euros eso se nota mucho.
function formatPrice(value) {
  const n = Number(value) || 0;
  return `${n.toLocaleString("es-ES", { maximumFractionDigits: 0, useGrouping: "always" })} €`;
}

/** Dinero para cuadrar cuentas: siempre dos decimales (tablas, contrato). */
function formatPriceExact(value) {
  const n = Number(value) || 0;
  return `${n.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: "always" })} €`;
}

function renderTask(task) {
  const done = isReady(task.status);
  return `
    <div class="row">
      <span class="status-dot ${statusClass(task.status)}"></span>
      <div>
        <h4>${text(task.title)}</h4>
        <p>${text(task.owner || "Equipo")} · ${task.due ? formatDate(task.due) : "Sin fecha"} · ${text(task.status || "Pendiente")}${task.completedBy ? ` · Confirmó ${text(task.completedBy)}` : ""}</p>
      </div>
      <div class="inline-tools"><button class="btn ${done ? "sage done" : "warn"}" data-toggle-task="${task.id}">${done ? "✓ Listo" : "Avanzar"}</button><button class="mini-btn" data-edit-item="tasks:${task.id}">Editar</button><button class="mini-btn" data-delete-item="tasks:${task.id}">Borrar</button></div>
    </div>
  `;
}

function renderGuest(guest) {
  return `<div class="row"><span class="icon-btn">G</span><div><h4>${text(guest.name)}</h4><p>${text(guest.rsvp)} · ${text(guest.menu)} · ${text(guest.allergy || "Sin alergias")} · ${text(guest.table || "Sin mesa")}</p></div><div class="inline-tools"><span class="pill">${text(guest.table || "Pendiente")}</span><button class="mini-btn" data-edit-item="guests:${guest.id}">Editar</button><button class="mini-btn" data-delete-item="guests:${guest.id}">Borrar</button></div></div>`;
}

// Tono semantico por estado de RSVP/mesa — mismo criterio de "Badge" del
// proyecto de referencia ALGOEN_2 (verde = confirmado, mostaza = pendiente,
// rojo = declinado, gris = sin dato), reutilizado por la tabla de invitados.
function badgeTone(value) {
  const v = String(value || "").toLowerCase();
  if (/confirm|listo|pagado/.test(v)) return "verde";
  if (/declin|cancel|rechaz/.test(v)) return "rojo";
  if (/pend|proceso|espera/.test(v)) return "mostaza";
  return "neutro";
}

// ============================================================================
// Pestaña Mesas (boceto)
// ----------------------------------------------------------------------------
// Orden de lectura pensado para el montaje real de un salón:
//   1. KPIs      — cuánta gente hay y cuántas plazas quedan
//   2. Acciones  — lo que se hace desde aquí (exportar, imprimir seating)
//   3. Plano     — dónde se sienta cada uno, con panel de la mesa elegida
//   4. Cocina    — qué se cocina y quién lleva restricción
//   5. Tabla     — el detalle nominal, filtrable
// ============================================================================
function renderMesasTab() {
  const guests = byWedding("guests");
  const tables = byWedding("tables");
  const seated = guests.filter((g) => g.table && tables.some((t) => t.name === g.table)).length;
  const capacity = tables.reduce((s, t) => s + (Number(t.capacity) || 0), 0);
  const freeSeats = Math.max(0, capacity - seated);
  const fullTables = tables.filter((t) => {
    const c = Number(t.capacity) || 0;
    return c > 0 && guests.filter((g) => g.table === t.name).length >= c;
  }).length;

  const confirmed = guests.filter((g) => badgeTone(g.rsvp) === "verde").length;
  const pendingRsvp = guests.filter((g) => badgeTone(g.rsvp) === "mostaza").length;

  // "Vista novios" es una previsualizacion real: enseña lo que verán ellos en
  // su portal (plano y quién se sienta dónde) y esconde el trabajo interno —
  // recuento de catering, tabla editable y gestión de mesas.
  const esVistaNovios = state.mesasView === "novios";

  return `
    <div class="stat-row stat-row-5">
      ${statCard({ icon: "◎", tone: "verde", label: "Total invitados", value: guests.length, sub: `${seated} con mesa` })}
      ${statCard({ icon: "✓", tone: "verde", label: "Confirmados", value: confirmed, sub: guests.length ? `${Math.round((confirmed / guests.length) * 100)}% del total` : "—", progress: guests.length ? (confirmed / guests.length) * 100 : 0 })}
      ${statCard({ icon: "◷", tone: "mostaza", label: "Pendientes", value: pendingRsvp, sub: pendingRsvp ? "Falta su respuesta" : "Nadie pendiente" })}
      ${statCard({ icon: "▦", tone: "clay", label: "Mesas creadas", value: tables.length, sub: `${fullTables} completas` })}
      ${statCard({ icon: "◇", tone: "rosa", label: "Plazas libres", value: freeSeats, sub: `de ${capacity} plazas` })}
    </div>

    <section class="panel toolbar-row">
      ${segmented(
        [
          { value: "planner", label: "Vista equipo" },
          { value: "novios", label: "Vista novios" },
        ],
        state.mesasView || "planner",
        "data-mesas-view"
      )}
      <div class="actions">
        ${
          esVistaNovios
            ? `<span class="view-hint">Así lo ven los novios en su portal</span>`
            : `<button class="btn" data-action="auto-seat" title="Reparte los invitados sin mesa en las plazas libres">✧ Asignación automática</button>
               <button class="btn" data-action="export-guests" title="Descargar la lista en CSV">↓ Exportar lista</button>
               <button class="btn" data-print-section="plano" title="Imprimir el plano del salón">⎙ Imprimir seating</button>`
        }
      </div>
    </section>

    ${renderVenueCanvas()}
    ${esVistaNovios ? "" : `${renderCocinaBreakdown(guests)}${renderGuestsDataTable(guests)}`}
  `;
}

function renderMesasSummary(guests) {
  const confirmed = guests.filter((g) => badgeTone(g.rsvp) === "verde").length;
  const unseated = guests.filter((g) => !g.table).length;
  const withAllergies = guests.filter((g) => hasAllergy(g)).length;
  const capacity = byWedding("tables").reduce((s, t) => s + (Number(t.capacity) || 0), 0);
  return `
    <div class="grid cols-4 kpi-row" style="margin-bottom:16px">
      ${miniStat("Invitados", guests.length, capacity ? `${capacity} plazas creadas` : "Sin mesas creadas")}
      ${miniStat("Confirmados", confirmed, guests.length ? `${Math.round((confirmed / guests.length) * 100)}% del total` : "")}
      ${miniStat("Sin mesa asignada", unseated, unseated ? "Requiere acción" : "Todos sentados")}
      ${miniStat("Alergias / restricciones", withAllergies, withAllergies ? "Avisar al catering" : "Ninguna registrada")}
    </div>
  `;
}

/** Una restriccion real, ignorando los "no", "ninguna", "-" que ensucian el dato. */
function hasAllergy(guest) {
  const v = String(guest.allergy || "").trim().toLowerCase();
  return Boolean(v) && !/^(no|ninguna?|nada|n\/a|-|—)$/.test(v);
}

// ============================================================================
// Desglose de cocina: es el dato que de verdad se envia al catering. Un
// recuento por tipo de menu (para el pedido) y el listado nominal de cada
// restriccion con su mesa (para el servicio en sala). Sustituye al ejercicio
// de contar a mano sobre la lista.
// ============================================================================
function renderCocinaBreakdown(guests) {
  const attending = guests.filter((g) => badgeTone(g.rsvp) !== "rojo");

  const menuCounts = {};
  attending.forEach((g) => {
    const key = String(g.menu || "").trim() || "Sin menú asignado";
    menuCounts[key] = (menuCounts[key] || 0) + 1;
  });
  const menuRows = Object.entries(menuCounts).sort((a, b) => b[1] - a[1]);
  const menuColors = ["var(--ep-green)", "var(--mostaza)", "var(--tinta-suave)", "var(--clay)", "var(--rose)", "var(--ep-green-deep)"];

  const allergyGuests = attending.filter(hasAllergy).sort((a, b) => String(a.table || "￿").localeCompare(String(b.table || "￿")));

  return `
    <div class="grid cols-2 cocina-grid">
      <section class="panel">
        <div class="section-title compact">
          <div><h3 class="card-title">Recuento de menús</h3><p class="card-sub">Sobre ${attending.length} asistentes (excluye los que han declinado). Este es el pedido al catering.</p></div>
        </div>
        ${distribucionBars(menuRows.map(([label, value], i) => ({ label, value, color: menuColors[i % menuColors.length] })))}
        <div class="cocina-total"><span>Total a servir</span><strong>${attending.length}</strong></div>
      </section>

      <section class="panel allergy-panel">
        <div class="section-title compact">
          <div><h3 class="card-title">Alergias y restricciones</h3><p class="card-sub">Listado nominal con mesa, para el servicio en sala.</p></div>
          ${allergyGuests.length ? `<span class="badge rojo">${allergyGuests.length}</span>` : `<span class="badge verde">0</span>`}
        </div>
        ${
          allergyGuests.length
            ? `<div class="table-scroll"><table class="data-table allergy-table">
                <thead><tr><th>Invitado</th><th>Mesa</th><th>Restricción</th></tr></thead>
                <tbody>${allergyGuests
                  .map(
                    (g) => `<tr>
                      <td>${text(g.name)}</td>
                      <td>${g.table ? text(g.table) : `<em class="warn-text">Sin mesa</em>`}</td>
                      <td class="allergy-cell">${text(g.allergy)}</td>
                    </tr>`
                  )
                  .join("")}</tbody>
              </table></div>`
            : `<p class="chart-empty">Ningún invitado ha registrado alergias ni restricciones alimentarias.</p>`
        }
        ${allergyGuests.length ? `<p class="legal-note">Dato de salud (art. 9 RGPD): compártelo solo con el catering y el servicio de sala.</p>` : ""}
        ${renderAvisoAlergias(state.selectedWeddingId)}
      </section>
    </div>
  `;
}

function renderGuestsDataTable(guests) {
  const query = String(state.guestSearch || "").trim().toLowerCase();
  const fGroup = state.guestFilterGroup || "Todos";
  const fRsvp = state.guestFilterRsvp || "Todos";
  const fMenu = state.guestFilterMenu || "Todos";
  const fTable = state.guestFilterTable || "Todas";
  const onlyAllergies = Boolean(state.guestOnlyAllergies);

  const matching = guests.filter((g) => {
    if (query && ![g.name, g.email, g.table, g.menu, g.allergy, g.group, g.companion].some((v) => String(v || "").toLowerCase().includes(query))) return false;
    if (fGroup !== "Todos" && (g.group || "Sin grupo") !== fGroup) return false;
    if (fRsvp !== "Todos" && (g.rsvp || "Pendiente") !== fRsvp) return false;
    if (fMenu !== "Todos" && (g.menu || "") !== fMenu) return false;
    if (fTable !== "Todas" && (g.table || "") !== fTable) return false;
    if (onlyAllergies && !hasAllergy(g)) return false;
    return true;
  });

  const tableNames = [...new Set(guests.map((g) => g.table).filter(Boolean))].sort((a, b) => a.localeCompare(b, "es", { numeric: true }));
  const menus = [...new Set(guests.map((g) => g.menu).filter(Boolean))].sort();
  const groups = [...new Set(guests.map((g) => g.group || "Sin grupo"))].sort();
  const anyFilter = query || fGroup !== "Todos" || fRsvp !== "Todos" || fMenu !== "Todos" || fTable !== "Todas" || onlyAllergies;

  const sorted = [...matching].sort(
    (a, b) =>
      String(a.table || "￿").localeCompare(String(b.table || "￿"), "es", { numeric: true }) ||
      String(a.name || "").localeCompare(String(b.name || ""), "es")
  );

  const select = (attr, value, options, allLabel) =>
    `<label class="filter-field"><span>${text(allLabel)}</span><select ${attr}>${options
      .map((o) => `<option${o === value ? " selected" : ""}>${text(o)}</option>`)
      .join("")}</select></label>`;

  return `
    <section class="panel guests-panel">
      <div class="panel-head">
        <div>
          <h3 class="card-title">Lista de invitados</h3>
          <p class="card-sub">Agrupados por mesa, con subtotal y las restricciones marcadas.</p>
        </div>
        <span class="pill">${matching.length} de ${guests.length}</span>
      </div>

      <div class="filters-row">
        <div class="search-wrap">
          <span class="search-icon">⌕</span>
          <input class="guest-search" data-guest-search value="${text(state.guestSearch || "")}" placeholder="Buscar por nombre, email, mesa o alergia..." aria-label="Buscar invitado" />
        </div>
        ${select("data-filter-table", fTable, ["Todas", ...tableNames], "Mesa")}
        ${select("data-filter-rsvp", fRsvp, ["Todos", "Confirmado", "Pendiente", "No asiste"], "RSVP")}
        ${select("data-filter-group", fGroup, ["Todos", ...groups], "Grupo")}
        ${select("data-filter-menu", fMenu, ["Todos", ...menus], "Menú")}
        <button class="chip-toggle${onlyAllergies ? " active" : ""}" data-filter-allergies title="Mostrar solo invitados con restricciones">⚠ Alergias</button>
        ${anyFilter ? `<button class="link-btn" data-filter-clear>Limpiar filtros</button>` : ""}
      </div>

      <div class="table-scroll">
        <table class="data-table guests-table">
          <thead><tr>
            <th>Invitado</th><th>Grupo</th><th>RSVP</th><th>Mesa</th><th>Menú</th><th>Acompañante</th><th>Alergias</th><th></th>
          </tr></thead>
          <tbody>
            ${
              sorted
                .map(
                  (g) => `<tr${hasAllergy(g) ? ' class="row-allergy"' : ""}>
                <td class="cell-guest">
                  ${avatar(g.name, "sm")}
                  <span class="cell-guest-body">
                    <strong>${text(g.name)}</strong>
                    ${g.email ? `<small>${text(g.email)}</small>` : ""}
                  </span>
                </td>
                <td>${g.group && g.group !== "Sin grupo" ? `<span class="badge neutro">${text(g.group)}</span>` : "—"}</td>
                <td><span class="badge ${badgeTone(g.rsvp)}">${text(g.rsvp || "Pendiente")}</span></td>
                <td>${g.table ? text(g.table) : `<em class="warn-text">Sin mesa</em>`}</td>
                <td>${text(g.menu || "—")}</td>
                <td>${g.companion ? `Sí · ${text(g.companion)}` : "No"}</td>
                <td class="allergy-cell">${hasAllergy(g) ? `<span class="allergy-flag">⚠</span> ${text(g.allergy)}` : "—"}</td>
                <td class="data-table-actions">
                  <button class="mini-btn" data-edit-item="guests:${g.id}" title="Editar invitado" aria-label="Editar a ${text(g.name)}">${icono("editar")}</button>
                  <button class="mini-btn danger-text" data-delete-item="guests:${g.id}" title="Eliminar invitado" aria-label="Eliminar a ${text(g.name)}">${icono("cerrar")}</button>
                </td>
              </tr>`
                )
                .join("") ||
              `<tr><td colspan="8" class="chart-empty">${anyFilter ? "Ningún invitado coincide con los filtros." : "Todavía no hay invitados en esta boda."}</td></tr>`
            }
          </tbody>
        </table>
      </div>

      <div class="actions" style="justify-content:flex-start;margin-top:14px">
        <button class="btn primary" data-action="new-guest"><span class="icon-btn">+</span> Añadir invitado</button>
        <button class="btn" data-print-section="guests" title="Generar PDF">↓ PDF invitados</button>
      </div>
    </section>
  `;
}

function renderTables() {
  const tables = byWedding("tables");
  return `
    <section class="panel">
      <div class="section-title">
        <h3>Mesas</h3>
        <div class="actions">
          <button class="btn" data-print-section="tables" title="Generar PDF de mesas">↓ PDF</button>
          <button class="btn primary" data-action="new-table"><span class="icon-btn">+</span> Nueva mesa</button>
        </div>
      </div>
      ${tables.length === 0 ? `<div class="empty">Crea la primera mesa para empezar a asignar invitados desde el plano de arriba.</div>` : ""}
      <div class="grid cols-3">
        ${tables
          .map((table) => {
            const guests = byWedding("guests").filter((g) => g.table === table.name);
            const manualNames = String(table.names || "").split(/\r?\n|,/).map((n) => n.trim()).filter(Boolean);
            const allNames = [...new Set([...manualNames, ...guests.map((g) => g.name)])];
            const locked = Boolean(table.lockedAt);
            const capacity = Number(table.capacity) || 0;
            const occupancy = capacity ? Math.min(100, Math.round((allNames.length / capacity) * 100)) : 0;
            const isFull = capacity > 0 && allNames.length >= capacity;
            return `
              <article class="panel mesa-card${locked ? " locked-panel" : ""}${isFull ? " mesa-full" : ""}">
                <div class="mesa-card-header">
                  <div class="mesa-card-title">
                    <h4>${text(table.name)}</h4>
                    ${locked ? `<span class="mesa-lock-icon" title="Mesa bloqueada — asientos fijos">🔒</span>` : ""}
                  </div>
                  <span class="pill${isFull ? " pill-full" : ""}">${allNames.length}/${capacity || "—"}</span>
                </div>
                ${capacity > 0 ? `
                  <div class="mesa-capacity-bar" title="${occupancy}% ocupada">
                    <div class="mesa-capacity-fill${isFull ? " full" : ""}" style="width:${occupancy}%"></div>
                  </div>
                ` : ""}
                <p class="mesa-owner">Responsable: ${text(table.owner || "Equipo")} · <em>${text(table.status || "Pendiente")}</em></p>
                <div class="mesa-names">
                  ${allNames.map((name) => `<span class="pill pill-sm">${text(name)}</span>`).join("") || `<span class="mesa-empty-names">Sin nombres aún</span>`}
                </div>
                ${table.notes ? `<p class="mesa-notes">${text(table.notes)}</p>` : ""}
                <div class="mesa-card-actions">
                  <button class="btn${locked ? " sage done" : " btn-outline"}" data-toggle-table-lock="${table.id}" title="${locked ? "Quitar bloqueo" : "Bloquear asientos"}">
                    ${locked ? "🔒 Bloqueada" : "Bloquear"}
                  </button>
                  <button class="mini-btn" data-edit-item="tables:${table.id}" title="Editar nombre, capacidad, responsable">${icono("editar")} Editar</button>
                  <button class="mini-btn danger-text" data-delete-item="tables:${table.id}" title="Eliminar mesa" aria-label="Eliminar ${text(table.name)}">${icono("cerrar")}</button>
                </div>
              </article>
            `;
          })
          .join("")}
      </div>
    </section>
  `;
}

/** Añade https:// si falta, para que el enlace abra bien. */
function normalizeUrl(url) {
  const v = String(url || "").trim();
  if (!v) return "";
  return /^https?:\/\//i.test(v) ? v : `https://${v}`;
}

/**
 * Dominio del proveedor, para pedir su favicon y usarlo como logo. Sale de
 * su web o, si no la hay, del Instagram. Si no hay ninguno se muestra la
 * inicial y no se hace ninguna petición externa.
 */
function providerDomain(provider) {
  if (provider.web) {
    try {
      return new URL(normalizeUrl(provider.web)).hostname;
    } catch {
      return "";
    }
  }
  return "";
}

function renderProvider(provider) {
  const done = isReady(provider.status);
  // Sin pildora de estado: el propio boton ya dice si esta confirmado o no.
  // Los datos de contacto son accionables (llamar, escribir, abrir web) en
  // vez de texto plano que hay que copiar a mano.
  const dominio = providerDomain(provider);
  const ig = String(provider.instagram || "").replace(/^@/, "").trim();

  // Cada dato de contacto se ve Y se puede usar en un toque. El número no es
  // decorativo: si hay que llamar al florista desde el coche, el gesto tiene
  // que ser tocar, no seleccionar-copiar-abrir-marcador.
  const contactos = [
    provider.phone
      ? `<a class="contact-chip chip-wa" href="${whatsappUrl(provider.phone, `Hola, soy ${state.user?.name || "del equipo"} de Events Planner.`)}" target="_blank" rel="noopener noreferrer" title="Escribir por WhatsApp a ${text(provider.name)}">✆ WhatsApp</a>`
      : "",
    provider.phone ? `<a class="contact-chip" href="${telUrl(provider.phone)}" title="Llamar a ${text(provider.name)}">☎ ${text(provider.phone)}</a>` : "",
    provider.email ? `<a class="contact-chip" href="mailto:${text(provider.email)}" title="Escribir a ${text(provider.email)}">✉ ${text(provider.email)}</a>` : "",
    ig ? `<a class="contact-chip chip-ig" href="https://ig.me/m/${text(ig)}" target="_blank" rel="noopener noreferrer" title="Mensaje directo en Instagram">◎ DM @${text(ig)}</a>` : "",
    ig ? `<a class="contact-chip" href="https://instagram.com/${text(ig)}" target="_blank" rel="noopener noreferrer" title="Ver el perfil">Perfil</a>` : "",
    provider.web ? `<a class="contact-chip" href="${text(normalizeUrl(provider.web))}" target="_blank" rel="noopener noreferrer" title="Abrir la web">↗ Web</a>` : "",
  ]
    .filter(Boolean)
    .join("");

  const sinContacto = !provider.phone && !provider.email && !ig && !provider.web;

  return `<div class="row provider-row">
    <span class="provider-logo">
      
      <span class="provider-logo-fallback">${text(String(provider.name || "?").trim().charAt(0).toUpperCase())}</span>
    </span>
    <div>
      <h4>${text(provider.name)}</h4>
      <p class="provider-meta">
        ${provider.zone ? `<span class="zona-chip">◈ ${text(provider.zone)}</span>` : ""}
        ${provider.type ? `<span class="tipo-chip">${text(provider.type)}</span>` : ""}
        ${provider.contact ? `<span>${text(provider.contact)}</span>` : ""}
        ${provider.usos > 1 ? `<span><strong>${provider.usos} bodas</strong></span>` : ""}
        ${
          provider.weddingId
            ? provider.validacion === "Aceptado"
              ? `<span class="val-ok">◉ Aceptado por la pareja${provider.confirmedAt ? ` · ${text(cuando(provider.confirmedAt))}` : ""}</span>`
              : provider.validacion === "Descartado"
                ? `<span class="val-no">${icono("cerrar")} Descartado${provider.descartadoAt ? ` · ${text(cuando(provider.descartadoAt))}` : ""}</span>`
                : `<span class="val-esp">◌ Esperando respuesta de la pareja</span>`
            : ""
        }
        ${provider.presupuesto?.importe ? `<span class="val-pres">Presupuesto ${text(formatPrice(provider.presupuesto.importe))}</span>` : ""}
      </p>
      ${contactos ? `<div class="contact-chips">${contactos}</div>` : ""}
      ${sinContacto ? `<p class="provider-sin-contacto">Sin datos de contacto — añádelos con ✎ para poder llamar o escribir desde aquí.</p>` : ""}
    </div>
    <div class="inline-tools">
      ${
        // El estado de validación solo tiene sentido en un proveedor asignado a
        // una boda. En la base general no hay nada que confirmar: es un
        // fichero de empresas, no una decisión.
        provider.weddingId
          ? `${
              provider.presupuesto?.attachment
                ? `<button class="mini-btn" data-ver-presupuesto="${provider.id}" title="Ver el presupuesto${provider.presupuesto.importe ? ` · ${text(formatPrice(provider.presupuesto.importe))}` : ""}">▤ Presupuesto</button>`
                : `<button class="mini-btn" data-subir-presupuesto="${provider.id}" title="Adjuntar su presupuesto">＋ Presupuesto</button>`
            }
            <button class="mini-btn ${provider.validacion === "Aceptado" ? "sage done" : ""}" data-decidir-proveedor="${provider.id}:${provider.validacion === "Aceptado" ? "pendiente" : "aceptado"}" title="${provider.validacion === "Aceptado" ? "Volver a dejarlo pendiente" : "Aceptar este proveedor"}">${provider.validacion === "Aceptado" ? "✓ Aceptado" : "Aceptar"}</button>
            <button class="mini-btn ${provider.validacion === "Descartado" ? "warn" : ""}" data-decidir-proveedor="${provider.id}:${provider.validacion === "Descartado" ? "pendiente" : "descartado"}" title="${provider.validacion === "Descartado" ? "Volver a dejarlo pendiente" : "Descartar este proveedor"}">${provider.validacion === "Descartado" ? "Descartado" : "Descartar"}</button>`
          : ""
      }
      <button class="mini-btn" data-edit-item="providers:${provider.id}" title="Editar proveedor" aria-label="Editar ${text(provider.name)}">${icono("editar")}</button>
      <button class="mini-btn danger-text" data-delete-item="providers:${provider.id}" title="Eliminar proveedor" aria-label="Eliminar ${text(provider.name)}">${icono("cerrar")}</button>
    </div>
  </div>`;
}

function renderProvidersWedding() {
  const providers = byWedding("providers");
  // La base son las EMPRESAS, no las asignaciones: el mismo florista puede
  // estar en cinco bodas y aquí debe poder elegirse igual. Antes solo se
  // ofrecían los que no tenían boda, y como casi todos la tienen, el
  // desplegable salía prácticamente vacío y había que recrearlos a mano.
  const yaEn = new Set(providers.map((p) => String(p.name).toLowerCase()));
  const porNombre = new Map();
  state.providers.forEach((p) => {
    const clave = String(p.name || "").trim().toLowerCase();
    if (!clave || yaEn.has(clave)) return;
    const previo = porNombre.get(clave);
    const completitud = (x) => [x.contact, x.phone, x.email, x.web, x.instagram, x.zone].filter(Boolean).length;
    if (!previo || completitud(p) > completitud(previo)) porNombre.set(clave, p);
  });
  const reusable = [...porNombre.values()].sort((a, b) => String(a.name).localeCompare(String(b.name), "es"));

  const aceptados = providers.filter((p) => p.validacion === "Aceptado").length;
  const descartados = providers.filter((p) => p.validacion === "Descartado").length;
  const esperando = providers.length - aceptados - descartados;
  return `
    <section class="panel">
      <div class="section-title">
        <div>
          <h3>Proveedores de esta boda</h3>
          <p>Los que propones a la pareja. Ellos los ven en su portal y deciden.${
            providers.length
              ? ` · <strong>${aceptados}</strong> aceptados · <strong>${descartados}</strong> descartados${esperando ? ` · ${esperando} esperando respuesta` : ""}`
              : ""
          }</p>
        </div>
        <div class="actions"><button class="btn" data-print-section="providers" title="Generar PDF">↓ PDF</button><button class="btn primary" data-action="new-provider"><span class="icon-btn">+</span> Añadir proveedor</button></div>
      </div>
      <div class="field" style="margin-bottom:12px">
        <label>Añadir de tu base de proveedores (${reusable.length} disponibles)</label>
        <select data-provider-picker>
          <option value="">Elige un proveedor de la base…</option>
          ${reusable.map((provider) => `<option value="${provider.id}">${text(provider.name)} · ${text(provider.type || "Proveedor")}${provider.zone ? ` · ${text(provider.zone)}` : ""}</option>`).join("")}
        </select>
      </div>
      <div class="list">${providers.map(renderProvider).join("") || `<div class="empty">Todavía no hay proveedores asignados.</div>`}</div>
    </section>

    ${renderBuscadorWeb("boda")}
  `;
}

/**
 * Fila de una tarea de rincón.
 *
 * El detalle importa tanto como el título: "comprar chuches" no le dice nada a
 * quien va al súper, y "4 kg surtido sin gelatina de cerdo, nada de regaliz
 * negro, en el súper del pueblo" sí. Por eso el detalle se ve entero debajo, no
 * escondido tras un clic — el objetivo es que se pueda leer de un vistazo y
 * salir a hacerlo.
 */
function renderRinconTaskRow(task) {
  const done = task.status === "Listo";
  const ordered = task.status === "Pedido / en camino";
  const cls = done ? "sage done" : ordered ? "warn" : "";
  const foto = task.attachment?.dataUrl;
  const vence = task.due ? formatDate(task.due) : "";
  const tarde = task.due && !done && new Date(task.due) < new Date(new Date().toDateString());

  return `
    <div class="rincon-task-row${done ? " hecha" : ""}">
      ${foto ? `<button type="button" class="rt-foto" data-view-rincon-task-photo="${task.id}" title="Ver la foto de referencia"><img src="${text(foto)}" alt="" /></button>` : ""}
      <div class="rt-cuerpo">
        <span class="rt-titulo">${text(task.title)}</span>
        ${task.notes ? `<p class="rt-detalle">${text(task.notes)}</p>` : ""}
        <div class="rt-meta">
          ${task.cantidad ? `<span class="rt-chip">${text(task.cantidad)}</span>` : ""}
          ${task.owner ? `<span>${text(task.owner)}</span>` : ""}
          ${vence ? `<span class="${tarde ? "rt-tarde" : ""}">${tarde ? "Debía estar el " : "Para el "}${text(vence)}</span>` : ""}
        </div>
        ${renderApuntes(task)}
      </div>
      <div class="rt-acciones">
        <button class="mini-btn ${cls}" data-toggle-rincon-task="${task.id}">${text(task.status)}</button>
        <button class="mini-btn" data-apuntar-tarea="${task.id}" title="Dejar un apunte para el equipo">${icono("editar")} Apunte</button>
        <button class="mini-btn" data-edit-item="rinconTasks:${task.id}" title="Editar la tarea" aria-label="Editar ${text(task.title)}">⚙</button>
        <button class="mini-btn danger-text" data-delete-item="rinconTasks:${task.id}" title="Borrar la tarea" aria-label="Borrar ${text(task.title)}">${icono("cerrar")}</button>
      </div>
    </div>
  `;
}

/**
 * El hilo de apuntes de una tarea de rincón.
 *
 * Se lee de arriba abajo como una conversación corta: quién, cuándo y qué. Los
 * cambios de estado aparecen como una línea propia, porque «pedido, en camino»
 * ES la información — no hace falta que nadie la escriba.
 *
 * Se muestran los tres últimos. El historial completo rara vez hace falta y
 * ocupa toda la tarjeta; el resto queda a un clic.
 */
function renderApuntes(task) {
  const apuntes = Array.isArray(task.apuntes) ? task.apuntes : [];
  if (!apuntes.length) return "";
  const abierto = state.apuntesAbiertos === task.id;
  const visibles = abierto ? apuntes : apuntes.slice(-3);
  const ocultos = apuntes.length - visibles.length;

  return `
    <div class="rt-apuntes">
      ${
        ocultos > 0
          ? `<button class="rt-apuntes-mas" data-ver-apuntes="${task.id}">↑ Ver ${ocultos} apunte${ocultos === 1 ? "" : "s"} anterior${ocultos === 1 ? "" : "es"}</button>`
          : ""
      }
      ${visibles
        .map(
          (a) => `<div class="rt-apunte${a.estado ? " rt-apunte-estado" : ""}">
            <span class="rt-apunte-quien">${text(a.by)}</span>
            <span class="rt-apunte-cuando">${text(cuando(a.at))}</span>
            <span class="rt-apunte-texto">${a.estado ? `→ ${text(a.estado)}` : text(a.texto)}</span>
          </div>`
        )
        .join("")}
      ${abierto ? `<button class="rt-apuntes-mas" data-ver-apuntes="">↓ Ver solo los últimos</button>` : ""}
    </div>
  `;
}

/** Tira de fotos de un rincón, con su estado si es una propuesta a medida. */
function renderRinconGallery(item) {
  const fotos = rinconGallery(item);
  const esDeBoda = Boolean(item.weddingId);
  return `
    <div class="rincon-gallery">
      ${fotos
        .map(
          (p) => `<figure class="rincon-shot${p.kind === "propuesta" ? " propuesta" : ""}${p.approved ? " aprobada" : ""}">
            <button type="button" class="rincon-shot-btn" data-view-rincon-photo="${item.id}:${p.id}" title="${text(p.caption || item.name)}">
              <img src="${text(fotoSrc(p))}" alt="${text(p.caption || item.name)}" loading="lazy" />
            </button>
            ${p.kind === "propuesta" ? `<figcaption>${p.approved ? "✓ Aprobada" : "⏳ Esperando a los novios"}</figcaption>` : ""}
            ${String(p.id).endsWith("-main") ? "" : `<button class="rincon-shot-del" data-delete-rincon-photo="${item.id}:${p.id}" title="Quitar foto" aria-label="Quitar foto">${icono("cerrar")}</button>`}
          </figure>`
        )
        .join("")}
      <button type="button" class="rincon-shot-add" data-new-rincon-photo="${item.id}" title="Añadir foto">
        <span>+</span><small>Foto</small>
      </button>
      ${esDeBoda ? `<button type="button" class="rincon-shot-add propuesta" data-new-rincon-proposal="${item.id}" title="Enviar una propuesta a medida a los novios"><span>${icono("editar")}</span><small>Propuesta</small></button>` : ""}
    </div>
  `;
}

function renderRincon(item) {
  const photo = item.attachment?.dataUrl;
  // Las tareas de preparacion (materiales, flores, pedidos...) solo aplican a
  // una instancia de rincon ya asignada a una boda concreta, no al catalogo global.
  const tasks = item.weddingId ? state.rinconTasks.filter((task) => task.rinconId === item.id) : [];
  const pendingTasks = tasks.filter((task) => task.status !== "Listo").length;
  return `
    <article class="panel rincon-card">
      ${renderRinconGallery(item)}
      <h4>${text(item.name)}${item.active === "No" ? ` <span class="pill">Inactivo</span>` : ""}</h4>
      <p>${text(item.description || "Sin descripción")}</p>
      ${
        item.weddingId
          ? `
            <div class="rincon-task-list">
              <div class="rincon-task-list-title"><span>Preparación${tasks.length ? ` · ${pendingTasks} pendiente${pendingTasks === 1 ? "" : "s"}` : ""}</span><button class="mini-btn" data-new-rincon-task="${item.id}">+ Tarea</button></div>
              ${tasks.map(renderRinconTaskRow).join("") || `<p class="rincon-task-empty">Sin tareas todavía. Añade lo que haga falta preparar: materiales, compras, alquileres, montaje… con todo el detalle que quieras y una foto de cómo tiene que quedar.</p>`}
            </div>
          `
          : ""
      }
      <div class="rincon-card-footer">
        <span class="pill">${item.price ? formatPrice(item.price) : "Sin precio fijo"}</span>
        <div class="inline-tools">
          <button class="mini-btn" data-edit-item="rincones:${item.id}">${icono("editar")} Editar</button>
          <button class="mini-btn" data-delete-item="rincones:${item.id}">Borrar</button>
        </div>
      </div>
    </article>
  `;
}

/**
 * Peticiones de rincón que llegan del portal de los novios. El equipo las
 * aprueba (y el rincón se añade a la boda) o las descarta con un motivo que
 * los novios verán en su portal.
 */
function renderRinconRequests() {
  const pending = state.rinconRequests.filter((r) => r.weddingId === state.selectedWeddingId && r.status === "Pendiente");
  if (!pending.length) return "";
  return `
    <section class="panel requests-panel">
      <div class="panel-head">
        <div>
          <h3 class="card-title">Solicitudes de los novios</h3>
          <p class="card-sub">Han pedido información sobre estos rincones desde su portal.</p>
        </div>
        <span class="badge mostaza">${pending.length}</span>
      </div>
      <div class="list">
        ${pending
          .map(
            (r) => `<div class="row">
              <span class="icon-btn">♡</span>
              <div>
                <h4>${text(r.rinconName)}</h4>
                <p>Solicitado el ${formatDate(r.requestedAt)} · pendiente de tu respuesta</p>
              </div>
              <div class="inline-tools">
                <button class="btn sage btn-xs" data-approve-request="${r.id}">✓ Aprobar y añadir</button>
                <button class="mini-btn danger-text" data-reject-request="${r.id}" title="Descartar solicitud" aria-label="Descartar solicitud de ${text(r.rinconName || "rincón")}">${icono("cerrar")}</button>
              </div>
            </div>`
          )
          .join("")}
      </div>
    </section>
  `;
}

function renderRinconesWedding() {
  const rincones = byWedding("rincones");
  const reusable = state.rincones.filter((rincon) => !rincon.weddingId && !rincones.some((item) => item.sourceRinconId === rincon.id || item.name === rincon.name));
  return `
    <section class="panel">
      <div class="section-title">
        <div>
          <h3>Rincones de esta boda</h3>
          <p>Espacios ambientados a medida: photobooth, candy bar, chill out y similares. Los novios los ven en su portal sin precio.</p>
        </div>
        <div class="actions"><button class="btn" data-print-section="rincones" title="Generar PDF">↓ PDF</button><button class="btn primary" data-action="new-rincon"><span class="icon-btn">+</span> Añadir rincón</button></div>
      </div>
      <div class="field" style="margin-bottom:12px">
        <label>Usar rincón del catálogo</label>
        <select data-rincon-picker>
          <option value="">Seleccionar rincón del catálogo...</option>
          ${reusable.map((rincon) => `<option value="${rincon.id}">${text(rincon.name)}</option>`).join("")}
        </select>
      </div>
      <div class="grid cols-3 rincon-grid">${rincones.map(renderRincon).join("") || `<div class="empty">Todavía no hay rincones asignados a esta boda.</div>`}</div>
    </section>
  `;
}

function renderRinconesGlobal() {
  // Solo el catalogo (sin weddingId): las copias ya asignadas a una boda
  // concreta (weddingId) se ven en la pestaña Rincones de esa boda, no aqui
  // — mostrar ambos a la vez es lo que causaba que cada rincon pareciera
  // duplicado en el catalogo global.
  const catalog = state.rincones.filter((rincon) => !rincon.weddingId);
  return `
    <section class="panel">
      <div class="section-title">
        <div>
          <h3>Catálogo de rincones</h3>
          <p>Los espacios que ofreces: foto, descripción y precio. Desde cada boda puedes añadirlos a esa boda concreta.</p>
        </div>
        <div class="actions"><button class="btn primary" data-action="new-rincon"><span class="icon-btn">+</span> Crear rincón</button></div>
      </div>
      <div class="grid cols-3 rincon-grid">${catalog.map(renderRincon).join("") || `<div class="empty">Todavía no hay rincones en el catálogo.</div>`}</div>
    </section>
  `;
}

function renderShot(item) {
  const done = isReady(item.status);
  return `<div class="row">
    <span class="icon-btn">◎</span>
    <div>
      <h4>${text(item.title)}</h4>
      <p>${text(item.moment || "Momento")} · ${text(item.people || "Personas por definir")} · ${text(item.owner || "Fotografía")}${item.completedBy ? ` · confirmó ${text(item.completedBy)}` : ""}</p>
      ${item.notes ? `<p>${text(item.notes)}</p>` : ""}
    </div>
    <div class="inline-tools">
      <button class="mini-btn ${done ? "sage done" : "warn"}" data-toggle-shot="${item.id}">${done ? "✓ Hecha" : "Pendiente"}</button>
      <button class="mini-btn" data-edit-item="shotList:${item.id}" title="Editar" aria-label="Editar foto ${text(item.title)}">${icono("editar")}</button>
      <button class="mini-btn danger-text" data-delete-item="shotList:${item.id}" title="Eliminar" aria-label="Eliminar foto ${text(item.title)}">${icono("cerrar")}</button>
    </div>
  </div>`;
}

function renderMusic(item) {
  return `<div class="row">
    <span class="icon-btn">♪</span>
    <div><h4>${text(item.moment)}</h4><p>${text(item.title)}${item.artist ? ` · ${text(item.artist)}` : ""}</p></div>
    <div class="inline-tools">
      ${badge(item.status || "Pendiente", badgeTone(item.status))}
      <button class="mini-btn" data-edit-item="music:${item.id}" title="Editar" aria-label="Editar música de ${text(item.moment)}">${icono("editar")}</button>
      <button class="mini-btn danger-text" data-delete-item="music:${item.id}" title="Eliminar" aria-label="Eliminar música de ${text(item.moment)}">${icono("cerrar")}</button>
    </div>
  </div>`;
}

function renderTransport(item) {
  return `<div class="row">
    <div class="time">${text(item.time)}</div>
    <div><h4>${text(item.type)}: ${text(item.from)} → ${text(item.to)}</h4><p>${text(item.passengers)}</p></div>
    <div class="inline-tools">
      ${badge(item.status || "Pendiente", badgeTone(item.status))}
      <button class="mini-btn" data-map-search="${text(item.to)}" title="Ver destino en el mapa">◈ Mapa</button>
      <button class="mini-btn" data-edit-item="transports:${item.id}" title="Editar" aria-label="Editar transporte a ${text(item.to)}">${icono("editar")}</button>
      <button class="mini-btn danger-text" data-delete-item="transports:${item.id}" title="Eliminar" aria-label="Eliminar transporte a ${text(item.to)}">${icono("cerrar")}</button>
    </div>
  </div>`;
}

function renderIssue(item) {
  return `<div class="row">
    <span class="icon-btn">!</span>
    <div><h4>${text(item.title)}</h4><p>${text(item.owner)} · ${text(item.priority)} · ${text(item.solution || "Sin solución definida")}</p></div>
    <div class="inline-tools">
      ${badge(item.status || "Pendiente", badgeTone(item.status))}
      <button class="mini-btn" data-edit-item="issues:${item.id}" title="Editar" aria-label="Editar incidencia ${text(item.title)}">${icono("editar")}</button>
      <button class="mini-btn danger-text" data-delete-item="issues:${item.id}" title="Eliminar" aria-label="Eliminar incidencia ${text(item.title)}">${icono("cerrar")}</button>
    </div>
  </div>`;
}

/** Icono y color según el tipo de archivo: se distingue de un vistazo. */
function iconoArchivo(nombre) {
  const ext = String(nombre || "").split(".").pop().toLowerCase();
  if (["pdf"].includes(ext)) return { ico: "▤", clase: "doc-pdf", et: "PDF" };
  if (["doc", "docx", "odt"].includes(ext)) return { ico: "▤", clase: "doc-word", et: "Word" };
  if (["xls", "xlsx", "csv", "ods"].includes(ext)) return { ico: "▦", clase: "doc-excel", et: "Hoja" };
  if (["jpg", "jpeg", "png", "webp", "gif", "heic"].includes(ext)) return { ico: "▣", clase: "doc-img", et: "Imagen" };
  if (["ppt", "pptx"].includes(ext)) return { ico: "▥", clase: "doc-ppt", et: "Slides" };
  return { ico: "▢", clase: "doc-otro", et: ext ? ext.toUpperCase() : "Archivo" };
}

function pesoArchivo(bytes) {
  const n = Number(bytes) || 0;
  if (!n) return "";
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

function renderDocument(item) {
  const adj = item.attachment;
  const hasFile = adj?.dataUrl || adj?.storagePath;
  const { ico, clase, et } = iconoArchivo(adj?.name);
  const boda = state.weddings.find((w) => w.id === item.weddingId);
  const paraNovios = /nov/i.test(String(item.visibility || ""));

  return `
    <div class="row doc-row">
      <span class="doc-ico ${clase}" title="${text(et)}">${ico}</span>
      <div class="doc-cuerpo">
        <h4>${text(item.name)}</h4>
        <p class="doc-meta">
          <span class="doc-tipo">${text(item.type || et)}</span>
          ${boda ? `<span>${text(boda.couple)}</span>` : `<span class="doc-general">General</span>`}
          <span class="${paraNovios ? "doc-visible-novios" : ""}">${paraNovios ? "◉ Lo ven los novios" : "⚿ Solo equipo"}</span>
          ${item.date ? `<span>${text(formatDate(item.date))}</span>` : ""}
          ${adj?.size ? `<span>${text(pesoArchivo(adj.size))}</span>` : ""}
        </p>
        ${hasFile ? `<p class="doc-archivo">${text(adj.name)}</p>` : `<p class="doc-sin-archivo">Ficha sin archivo adjunto</p>`}
      </div>
      <div class="inline-tools">
        ${hasFile ? `<button class="mini-btn" data-open-document="${item.id}" title="Abrir en una pestaña" aria-label="Abrir ${text(item.name)} en una pestaña">↗ Abrir</button>` : ""}
        ${hasFile ? `<button class="mini-btn" data-download-document="${item.id}" title="Descargar" aria-label="Descargar ${text(item.name)}">↓</button>` : ""}
        <button class="mini-btn" data-view-document="${item.id}" title="Ver la ficha" aria-label="Ver ficha de ${text(item.name)}">👁</button>
        <button class="mini-btn" data-edit-item="documents:${item.id}" title="Editar" aria-label="Editar ${text(item.name)}">${icono("editar")}</button>
        <button class="mini-btn danger-text" data-delete-item="documents:${item.id}" title="Borrar" aria-label="Borrar ${text(item.name)}">${icono("cerrar")}</button>
      </div>
    </div>
  `;
}

function renderActivity(item) {
  const momento = item.at || item.time;
  return `<div class="row actividad-row">
    <span class="icon-btn">${text(String(item.actor || "?").trim().charAt(0).toUpperCase())}</span>
    <div>
      <h4>${text(item.actor)}</h4>
      <p>${text(item.text)}</p>
    </div>
    <span class="pill" title="${text(fechaHora(momento))}">${text(cuando(momento))}</span>
  </div>`;
}


/**
 * Ficha de una persona del equipo. El teléfono no es decorativo: el día de la
 * boda hace falta poder llamar o escribir en dos toques, sin salir a buscar el
 * número en la agenda del móvil. Por eso WhatsApp y llamada son botones y no
 * texto suelto.
 */
function renderTeamCard(u) {
  const wa = whatsappUrl(u.phone, `Hola ${String(u.name || "").split(" ")[0]}, soy ${state.user?.name || "del equipo"}.`);
  const tel = telUrl(u.phone);
  return `
    <article class="panel team-card">
      <div>
        <span class="role-chip">${text(u.role)}</span>
        <h3 style="margin-top:14px">${text(u.name)}</h3>
        <p>Usuario: ${text(u.username)}</p>
        ${u.phone ? `<p class="team-phone">${text(u.phone)}</p>` : `<p class="team-phone team-phone-vacio">Sin teléfono</p>`}
      </div>
      ${
        u.phone
          ? `<div class="team-contacto">
              <a class="btn btn-wa" href="${wa}" target="_blank" rel="noopener noreferrer" title="Escribir a ${text(u.name)} por WhatsApp">
                <span class="wa-ico" aria-hidden="true">✆</span> WhatsApp
              </a>
              <a class="btn" href="${tel}" title="Llamar a ${text(u.name)}">Llamar</a>
            </div>`
          : ""
      }
      ${
        canManageUsers()
          ? `<div class="actions" style="justify-content:flex-start">
              <button class="btn" data-edit-user="${u.id}">Editar</button>
              <button class="btn danger" data-delete-user="${u.id}">Borrar</button>
            </div>`
          : `<span class="pill">Solo administración puede editar</span>`
      }
    </article>
  `;
}

function renderTeam() {
  return `
    <section class="panel" style="margin-bottom:18px">
      <div class="section-title">
        <div>
          <h3>Tu equipo</h3>
          <p>Cada persona tiene su usuario y su móvil. El teléfono permite llamar o escribir por WhatsApp desde su ficha.</p>
        </div>
        <div class="actions">${canManageUsers() ? `<button class="btn primary" data-action="new-user"><span class="icon-btn">+</span> Nuevo miembro</button>` : ""}</div>
      </div>
    </section>
    <div class="grid cols-3">${state.users.map(renderTeamCard).join("")}</div>
  `;
}

/**
 * Base de proveedores con buscador y filtro por categoría. Con 40 fichas la
 * lista plana deja de servir: aquí se busca por nombre, contacto o zona y se
 * acota por tipo antes de mirar nada.
 */
function renderProvidersGlobal() {
  const query = String(state.providerSearch || "").trim().toLowerCase();
  const tipo = state.providerFilterType || "Todas";

  // La base es el listado de empresas distintas, no de asignaciones: el
  // mismo florista puede estar en cinco bodas y aquí debe salir una sola vez,
  // con el recuento de en cuántas se ha trabajado con él.
  const porNombre = new Map();
  state.providers.forEach((p) => {
    const key = String(p.name || "").trim().toLowerCase();
    if (!key) return;
    const previo = porNombre.get(key);
    if (!previo) {
      porNombre.set(key, { ...p, weddingId: "", usos: p.weddingId ? 1 : 0 });
      return;
    }
    // Se conserva la ficha más completa y se suma el uso.
    const completitud = (x) => [x.contact, x.phone, x.email, x.web, x.instagram, x.zone].filter(Boolean).length;
    if (completitud(p) > completitud(previo)) porNombre.set(key, { ...p, usos: previo.usos });
    porNombre.get(key).usos += p.weddingId ? 1 : 0;
    // En la base se muestra la EMPRESA, no su asignación a una boda: sin
    // weddingId no salen los botones de aceptar/descartar, que aquí no
    // significan nada.
    porNombre.get(key).weddingId = "";
  });
  const base = [...porNombre.values()].sort((a, b) => String(a.name).localeCompare(String(b.name), "es"));

  const zona = state.providerFilterZone || "Todas";
  // La búsqueda ignora tildes: "Girona" y "girona", "Maresme" y "maresmé"
  // tienen que encontrar lo mismo. Y busca también en las notas, que es donde
  // acaba escrito "el que trabaja bien en fincas sin luz".
  const sinTildes = (v) => String(v || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const q = sinTildes(query);

  const filtrados = base.filter((p) => {
    if (tipo !== "Todas" && (p.type || "Otros") !== tipo) return false;
    if (zona !== "Todas" && (p.zone || "Sin zona") !== zona) return false;
    if (!q) return true;
    return [p.name, p.type, p.contact, p.phone, p.email, p.zone, p.instagram, p.web, p.notes].some((v) => sinTildes(v).includes(q));
  });

  // Solo se ofrecen en los filtros las categorías y zonas que existen de verdad.
  const usados = [...new Set(base.map((p) => p.type).filter(Boolean))].sort();
  const zonas = [...new Set(base.map((p) => p.zone).filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b), "es"));
  const conContacto = filtrados.filter((p) => p.phone || p.email || p.instagram).length;
  const porTipo = {};
  filtrados.forEach((p) => {
    const k = p.type || "Otros";
    (porTipo[k] = porTipo[k] || []).push(p);
  });
  const grupos = Object.keys(porTipo).sort();

  return `
    ${renderBuscadorWeb("base")}

    <section class="panel">
      <div class="panel-head">
        <div>
          <h3 class="card-title">Base de proveedores</h3>
          <p class="card-sub">${base.length} empresas · ${conContacto} con datos de contacto directo. Se reutilizan en cualquier boda desde su pestaña Proveedores.</p>
        </div>
        <div class="actions">
          <button class="btn" data-abrir-import>↥ Importar lista</button>
          <button class="btn primary" data-action="new-provider"><span class="icon-btn">+</span> Nuevo proveedor</button>
        </div>
      </div>

      <div class="filters-row">
        <div class="search-wrap">
          <span class="search-icon">⌕</span>
          <input class="guest-search" data-provider-search value="${text(state.providerSearch || "")}" placeholder="Nombre, contacto, zona, Instagram o notas…" aria-label="Buscar proveedor" />
        </div>
        <label class="filter-field">
          <span>Zona</span>
          <select data-provider-zone>
            ${["Todas", ...zonas].map((o) => `<option${o === zona ? " selected" : ""}>${text(o)}</option>`).join("")}
          </select>
        </label>
        <label class="filter-field">
          <span>Categoría</span>
          <select data-provider-filter>
            ${["Todas", ...usados].map((o) => `<option${o === tipo ? " selected" : ""}>${text(o)}</option>`).join("")}
          </select>
        </label>
        ${query || tipo !== "Todas" ? `<button class="link-btn" data-provider-clear>Limpiar</button>` : ""}
        <span class="filters-count">${filtrados.length} de ${base.length}</span>
      </div>

      ${
        filtrados.length
          ? grupos
              .map(
                (g) => `<div class="provider-group">
                  <h4 class="provider-group-title">${text(g)} <span>${porTipo[g].length}</span></h4>
                  <div class="list">${porTipo[g].map(renderProvider).join("")}</div>
                </div>`
              )
              .join("")
          : `<div class="empty">${base.length ? "Ningún proveedor coincide con la búsqueda." : "Todavía no hay proveedores. Añade el primero para empezar tu base."}</div>`
      }
    </section>
  `;
}

/**
 * Todos los documentos, ordenados.
 *
 * Antes era una lista plana: con cuarenta archivos entre contratos, facturas,
 * permisos del ayuntamiento y planos, encontrar uno era ir bajando y leyendo.
 * Ahora se busca, se acota por boda y por quién puede verlo, y se agrupa por
 * boda — que es como se piensa cuando buscas algo: "el permiso ese de la boda
 * de Sara", no "el documento tipo permiso".
 */
function renderDocumentsGlobal() {
  const q = String(state.docSearch || "").trim().toLowerCase();
  const filtroBoda = state.docFilterWedding || "Todas";
  const filtroVis = state.docFilterVisibility || "Todas";

  const sinTildes = (v) => String(v || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const query = sinTildes(q);

  const filtrados = state.documents.filter((d) => {
    if (filtroBoda !== "Todas" && (d.weddingId || "") !== (filtroBoda === "Generales" ? "" : filtroBoda)) return false;
    const paraNovios = /nov/i.test(String(d.visibility || ""));
    if (filtroVis === "Solo equipo" && paraNovios) return false;
    if (filtroVis === "Visibles para novios" && !paraNovios) return false;
    if (!query) return true;
    const boda = state.weddings.find((w) => w.id === d.weddingId);
    return [d.name, d.type, d.visibility, d.notes, d.attachment?.name, boda?.couple].some((v) => sinTildes(v).includes(query));
  });

  // Agrupados por boda, con los generales al final.
  const grupos = new Map();
  filtrados.forEach((d) => {
    const boda = state.weddings.find((w) => w.id === d.weddingId);
    const clave = boda ? boda.couple : "Documentos generales";
    if (!grupos.has(clave)) grupos.set(clave, []);
    grupos.get(clave).push(d);
  });
  const ordenados = [...grupos.entries()].sort((a, b) => (a[0] === "Documentos generales" ? 1 : b[0] === "Documentos generales" ? -1 : a[0].localeCompare(b[0], "es")));

  const conArchivo = filtrados.filter((d) => d.attachment?.dataUrl || d.attachment?.storagePath).length;
  const peso = filtrados.reduce((s2, d) => s2 + (Number(d.attachment?.size) || 0), 0);

  return `
    <section class="panel">
      <div class="panel-head">
        <div>
          <h3 class="card-title">Documentos</h3>
          <p class="card-sub">${state.documents.length} fichas · ${conArchivo} con archivo${peso ? ` · ${pesoArchivo(peso)}` : ""}. Contratos, permisos, facturas, planos y todo lo que haya que guardar.</p>
        </div>
        <button class="btn primary" data-action="new-document"><span class="icon-btn">+</span> Nuevo documento</button>
      </div>

      <div class="filters-row">
        <div class="search-wrap">
          <span class="search-icon">⌕</span>
          <input class="guest-search" data-doc-search value="${text(state.docSearch || "")}" placeholder="Nombre, tipo, boda o nombre del archivo…" aria-label="Buscar documento" />
        </div>
        <label class="filter-field">
          <span>Boda</span>
          <select data-doc-wedding>
            <option${filtroBoda === "Todas" ? " selected" : ""}>Todas</option>
            <option${filtroBoda === "Generales" ? " selected" : ""}>Generales</option>
            ${sortedWeddings().map((w) => `<option value="${w.id}"${filtroBoda === w.id ? " selected" : ""}>${text(w.couple)}</option>`).join("")}
          </select>
        </label>
        <label class="filter-field">
          <span>Quién lo ve</span>
          <select data-doc-visibility>
            ${["Todas", "Solo equipo", "Visibles para novios"].map((o) => `<option${o === filtroVis ? " selected" : ""}>${text(o)}</option>`).join("")}
          </select>
        </label>
      </div>

      ${
        filtrados.length
          ? ordenados
              .map(
                ([titulo, docs]) => `
                  <div class="doc-grupo">
                    <h4 class="doc-grupo-titulo">${text(titulo)} <span>${docs.length}</span></h4>
                    <div class="list">${docs.map(renderDocument).join("")}</div>
                  </div>`
              )
              .join("")
          : `<div class="empty">${state.documents.length ? "Ningún documento coincide con la búsqueda." : "Todavía no hay documentos. Sube aquí contratos firmados, permisos, facturas y planos."}</div>`
      }
    </section>
  `;
}

/**
 * Guía: el manual de uso de la aplicación.
 *
 * No es una página de metodología —eso ya lo saben— sino la respuesta a "¿cómo
 * se hace esto aquí?". Comparte texto con el asistente (el botón de los anillos): se
 * escribe una vez en manual.js y aparece en los dos sitios, para que nunca
 * digan cosas distintas.
 */
function renderGuide() {
  const consulta = String(state.guideSearch || "").trim();
  const encontradas = consulta ? buscarManual(consulta) : null;
  const areaActiva = state.guideArea || "empezar";

  const fichas = encontradas || manualPorArea(areaActiva);
  const areaNombre = AREAS.find((a) => a.id === areaActiva)?.label || "";

  return `
    <section class="guide-hero panel">
      <div>
        <span class="eyebrow">Manual de uso</span>
        <h3>Cómo se hace cada cosa en Events Planner</h3>
        <p>Busca lo que necesites o entra por temas. Es el mismo manual que responde el asistente (el botón de los anillos), así que si algo no está aquí, tampoco lo sabrá él. Avísanos y lo añadimos.</p>
      </div>
    </section>

    <article class="panel manual-descarga">
      <div class="manual-descarga-ico" aria-hidden="true">▤</div>
      <div class="manual-descarga-txt">
        <h4>Manual completo de Events Planner</h4>
        <p>Catorce capítulos con toda la aplicación: el día a día en Inicio, cómo se crea y organiza una boda, las seis áreas de trabajo, el presupuesto al detalle, el portal de los novios y las dudas frecuentes. Sin tecnicismos, con ejemplos. Se abre listo para guardar en PDF o imprimir.</p>
      </div>
      <button class="btn primary" data-manual-portal>↓ Descargar en PDF</button>
    </article>

    <div class="guide-buscador">
      <input
        type="search"
        data-guide-search
        value="${text(consulta)}"
        placeholder="Buscar: mesas, chuches, contrato, sin cobertura, he borrado algo…"
        aria-label="Buscar en el manual"
      />
      ${consulta ? `<button class="mini-btn" data-guide-clear>Limpiar</button>` : ""}
    </div>

    ${
      encontradas
        ? `<p class="guide-resultado">${encontradas.length ? `${encontradas.length} resultado${encontradas.length === 1 ? "" : "s"} para «${text(consulta)}»` : `Nada sobre «${text(consulta)}». Prueba con otra palabra o entra por temas.`}</p>`
        : `<nav class="guide-areas" aria-label="Temas del manual">
            ${AREAS.map(
              (a) => `<button class="guide-area${a.id === areaActiva ? " activa" : ""}" data-guide-area="${a.id}" aria-current="${a.id === areaActiva}">
                <span class="guide-area-ico" aria-hidden="true">${a.icon}</span>
                <span>${text(a.label)}</span>
              </button>`
            ).join("")}
          </nav>
          <h3 class="guide-area-titulo">${text(areaNombre)}</h3>`
    }

    <div class="guide-fichas">
      ${fichas.map(renderFichaManual).join("") || ""}
    </div>
  `;
}

/** Una entrada del manual, con sus pasos y el atajo a la pantalla que resuelve. */
function renderFichaManual(f) {
  return `
    <article class="panel guide-ficha" id="manual-${text(f.id)}">
      <h4>${text(f.title)}</h4>
      <p class="guide-ficha-resumen">${text(f.resumen)}</p>
      <ol class="guide-ficha-pasos">${f.steps.map((paso) => `<li>${paso}</li>`).join("")}</ol>
      ${f.nota ? `<p class="guide-ficha-nota"><b>Ojo:</b> ${text(f.nota)}</p>` : ""}
      ${f.ir ? `<div class="actions" style="justify-content:flex-start"><button class="btn" data-view="${text(f.ir[0])}">${text(f.ir[1])} →</button></div>` : ""}
    </article>
  `;
}

/**
 * Mi perfil.
 *
 * Cada persona mantiene sus propios datos de contacto sin depender de que
 * administración se los cambie: cómo se llama, con qué usuario entra y por
 * dónde se le localiza.
 *
 * Correo y teléfono se guardan aunque la recuperación automática de contraseña
 * esté apagada (ver RECUPERACION_ACTIVA en state.js): son los datos de contacto
 * del equipo, y estarán listos el día que se active.
 */
function renderMiPerfil() {
  const yo = state.user ? state.users.find((u) => u.id === state.user.id) : null;
  if (!yo) return "";
  const falta = !yo.email || !yo.phone;
  return `
    <section class="panel perfil-panel">
      <div class="panel-head">
        <div>
          <h3 class="card-title">Mi perfil</h3>
          <p class="card-sub">Tus datos dentro del equipo. Puedes cambiarlos cuando quieras.</p>
        </div>
        <button class="btn primary" data-editar-mi-perfil>${icono("editar")} Editar mis datos</button>
      </div>
      <dl class="perfil-datos">
        <div><dt>Nombre</dt><dd>${text(yo.name)}</dd></div>
        <div><dt>Usuario</dt><dd>${text(yo.username)}</dd></div>
        <div><dt>Cargo</dt><dd>${text(yo.role)}</dd></div>
        <div><dt>Correo</dt><dd>${yo.email ? text(yo.email) : `<span class="perfil-falta">Sin correo</span>`}</dd></div>
        <div><dt>Teléfono</dt><dd>${yo.phone ? text(yo.phone) : `<span class="perfil-falta">Sin teléfono</span>`}</dd></div>
      </dl>
      ${
        falta
          ? `<p class="perfil-aviso">Te falta un dato de contacto. Conviene tenerlo al día para que el equipo pueda localizarte.</p>`
          : ""
      }
    </section>
  `;
}

function renderSettings() {
  return `
    ${renderMiPerfil()}
    <div class="grid cols-2">
      <section class="panel">
        <h3 class="card-title">Copia de seguridad</h3>
        ${(() => {
          // Este texto afirmaba la sincronización pasara lo que pasara. Ahora
          // dice lo que de verdad está ocurriendo: es la diferencia entre que
          // el equipo comparta una boda o que cada una lleve la suya sin saberlo.
          const { configurado, conectado } = estadoSincronizacion();
          if (conectado) {
            return `<p>La información se sincroniza con la nube: lo que apunta una persona lo ven las demás. El navegador guarda además una copia por si hay un corte de conexión.</p>`;
          }
          if (configurado) {
            return `<p class="aviso-local">⚠ <strong>Todavía no se ha sincronizado en esta sesión.</strong> Hay conexión configurada, pero aún no se ha leído ni escrito nada en la nube. Si sigue así, lo que apuntes se queda solo en este dispositivo.</p>`;
          }
          return `<p class="aviso-local">⚠ <strong>Los datos se guardan solo en este dispositivo.</strong> La nube no está configurada todavía, así que lo que apuntes aquí no lo ven las demás — y cada persona tendría su propia copia sin saberlo. Descarga una copia de seguridad a menudo hasta que esté montada.</p>`;
        })()}
        <p class="card-sub">Aun así, conviene guardar una copia propia una vez al mes y siempre la semana antes de una boda grande. Se descarga un único archivo con todo.</p>
        <div class="actions" style="justify-content:flex-start;margin-top:12px">
          <button class="btn primary" data-action="backup">↓ Descargar copia</button>
          <button class="btn" data-action="restore">↑ Restaurar copia</button>
        </div>
      </section>
      <section class="panel">
        <h3 class="card-title">Vaciar datos de trabajo</h3>
        <p>Elimina bodas, invitados, proveedores, documentos y actividad compartida. Mantiene los usuarios base del equipo.</p>
        <button class="btn danger" data-action="reset" style="margin-top:12px">Vaciar datos</button>
      </section>
    </div>

    ${renderLegalPanel()}
    ${renderRegistroTratamiento()}
  `;
}

// ============================================================================
// Bloque de proteccion de datos. Los textos siguen la politica publicada en
// Politica de privacidad publicada — el responsable del tratamiento
// figura en la política de privacidad.
// ============================================================================
function renderLegalPanel() {
  return `
    ${renderUsuariosParejas()}
    ${renderReferencia()}
    ${renderPeso()}

    <section class="panel legal-panel" style="margin-top:18px">
      <div class="section-title compact">
        <div>
          <h3 class="card-title">Protección de datos y cumplimiento</h3>
          <p class="card-sub">Reglamento (UE) 2016/679 (RGPD) y Ley 34/2002 (LSSI). Textos de demostración: no son asesoramiento legal.</p>
        </div>
        <span class="badge verde">RGPD</span>
      </div>

      <div class="legal-grid">
        <article class="legal-item">
          <h4>Responsable del tratamiento</h4>
          <p><strong>Estudio Demo S.L.</strong><br />
          C/ Ejemplo 1 · 08000 Barcelona<br />
          Tel. +34 653 567 610</p>
        </article>

        <article class="legal-item">
          <h4>Base jurídica</h4>
          <p>Ejecución del contrato de servicios de organización de bodas y consentimiento libre, específico, informado e inequívoco de la persona interesada.</p>
        </article>

        <article class="legal-item">
          <h4>Conservación</h4>
          <p>Mientras se mantenga la relación comercial o hasta que se solicite la supresión, y durante el plazo en que puedan derivarse responsabilidades legales.</p>
        </article>

        <article class="legal-item">
          <h4>Derechos de los interesados</h4>
          <p>Acceso, rectificación, supresión, oposición, limitación y portabilidad, ejerciéndolos por correo electrónico o en la dirección postal indicada.</p>
        </article>
      </div>

      <div class="legal-alert">
        <span class="legal-alert-icon">⚠</span>
        <div>
          <strong>Alergias y restricciones alimentarias: datos de salud</strong>
          <p>Los datos de alergias que se registran en la pestaña Mesas son <em>categoría especial</em> según el artículo 9 del RGPD. Requieren consentimiento explícito de cada invitado, no basta el de la pareja. Trátalos solo con el catering, no los incluyas en documentos para proveedores que no los necesiten y no los conserves más allá de la boda.</p>
        </div>
      </div>

      <div class="actions" style="justify-content:flex-start;margin-top:14px">
        <a class="btn" href="https://www.example.com/politica-de-privacidad" target="_blank" rel="noopener noreferrer">Ver política de privacidad completa ↗</a>
      </div>
    </section>
  `;
}

export { renderAvisoDemo, renderAvisoNube, renderMiPerfil, renderFichaManual, filteredWeddings, formatPrice, formatPriceExact, label, renderActivity, renderCollection, renderCurrentView, renderDashboard, renderDocument, renderDocumentsGlobal, renderEmpty, renderGuest, renderGuide, renderIssue, renderLogin, renderMusic, renderProvider, renderProvidersGlobal, renderProvidersWedding, renderRincon, renderRinconesGlobal, renderRinconesWedding, renderSectionToolbar, renderService, renderServices, renderSettings, renderShot, renderSidebar, renderTables, renderTask, renderTasksPanel, renderTeam, renderTimeline, renderTopbar, renderTransport, renderWeddingCard, renderWeddingDay, renderWeddingDetail, renderWeddingFilters, renderWeddingForm, renderWeddingTab, renderWeddingTaskSummary, renderWeddings };
