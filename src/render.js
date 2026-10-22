import { editBudgetItem, editarPago, newBudgetItem, setBudgetTarget, togglePagado, verJustificante } from "./budget.js";
import { confirmAnnex, deleteContractUpload, downloadContractUpload, generateContract, initSignaturePad, markContractSignedPaper, openAnnexForm, openContractForm, openContractUpload, printContract, toggleAnnexItem } from "./contracts.js";
import { autoSeat, exportGuests, exportJson, resetDemo, saveNow } from "./main.js";
import { markPaymentPaid, markReceiptReviewed, newPayment, newReceipt, openReceiptAttachment } from "./payments.js";
import { apuntarEnTarea, editarMiPerfil, addDraftRincon, addDraftService, addExistingProvider, addExistingRincon, approveRinconRequest, approveRinconPhoto, deleteRinconPhoto, newRinconPhoto, rejectRinconRequest, cancelWeddingForm, removeDraftRincon, removeDraftService, updateDraftField, closeModal, completeTimeline, confirmModal, createWeddingFromForm, deleteItem, deleteUser, deleteWedding, downloadDocumentAttachment, editItem, editUser, editWedding, newDocument, newGuest, newIssue, newMusic, newProvider, newRincon, newRinconTask, newService, newShot, newTable, newTask, newTimeline, newTransport, newUser, newWedding, openCoverPicker, openDocumentAttachment, pickCover, renderModal, submitModalForm, toggleProvider, toggleRinconTask, toggleService, toggleShot, toggleTableLock, toggleTask, uploadCoverPhoto, viewDocument, viewRinconPhoto, viewRinconTaskPhoto, decidirProveedor, subirPresupuestoProveedor, verPresupuestoProveedor, duplicarBodaForm, volverAlListado} from "./modals.js";
import { copiarEnlacePortal, portalBorrarInvitado, portalBorrarMesa, portalEditarMesa, portalNuevaMesa, portalSentarInvitado, portalLogin, renderPortal, requestRincon, savePortalChanges, setPortalDraft } from "./portal.js";
import { allowedReportSectionKeys, confirmPrintOptions, exportDossierWord, printDossier, printSection, toggleExportAll } from "./print.js";
import { forgotPassword, login, logout, onRender, setLoginError, openGoogleMaps, openPortalForWedding, saveState, selectWedding, setView, state, toggleForgotPassword } from "./state.js";
import { initVenueCanvas } from "./venue.js";
import { initAssistant, initOnboarding, renderAssistant, renderOnboarding } from "./assistant.js";
import { anotarAcuerdos, borrarReunion, cambiarVistaAgenda, descargarIcs, editarReunion, irAgendaHoy, moverMesAgenda, nuevaReunion, seleccionarFechaAgenda } from "./agenda.js";
import { abrirImportador, actualizarImportTexto, cerrarImportador, confirmarImportacion } from "./importar.js";
import { initBuscadorWeb } from "./buscador-proveedores.js";
import { abrirRestaurarCopia, aceptarAviso, descargarCopiaSeguridad, descargarRegistroTratamiento, exportarDatosPareja, renderAvisoTratamiento } from "./rgpd.js";
import { abrirDocumento } from "./documentos.js";
import { cerrarBoda, reabrirBoda, regenerarClavePortal } from "./cierre.js";
import { aligerarEstado } from "./peso.js";
import { cargarReferencia, quitarReferencia } from "./referencia.js";
import { abrirManualPortal } from "./manual-portal.js";
import { renderAvisoDemo, renderAvisoNube, renderCurrentView, renderLogin, renderSidebar, renderTopbar } from "./views.js";

// ---------------------------------------------------------------------------
// Cuándo animar
// ---------------------------------------------------------------------------
// La app repinta el #app entero en cada interacción. Si las animaciones de
// entrada viven en los elementos, se disparan TODAS en cada clic: los paneles
// vuelven a subir, las filas se deslizan y las barras de progreso crecen desde
// cero otra vez. El resultado es que la página parece temblar.
//
// Una animación de entrada solo tiene sentido cuando de verdad se entra en algo
// nuevo. Así que se guarda una firma de dónde estamos y solo se marca el
// contenedor con .vista-nueva cuando esa firma cambia. El CSS cuelga de ahí.
let firmaVista = "";

function firmaActual() {
  return [state.view, state.selectedTab, state.selectedWeddingId, state.portalMode ? "p" : "", state.portalTab].join("|");
}

/** Marca el contenedor solo si hemos cambiado de sitio. */
function marcarEntrada(nodo) {
  if (!nodo) return;
  const firma = firmaActual();
  if (firma === firmaVista) return;
  firmaVista = firma;
  nodo.classList.add("vista-nueva");
  // Se quita al terminar para que el siguiente repintado del mismo sitio
  // (marcar una tarea, escribir en un campo) no vuelva a animar nada.
  setTimeout(() => nodo.classList.remove("vista-nueva"), 700);
}


// ---------------------------------------------------------------------------
// Diálogos: foco, teclado y fondo
// ---------------------------------------------------------------------------
// Un diálogo modal tiene tres obligaciones que aquí no se cumplían:
//
//   1. Llevarse el foco al abrirse. Sin esto, quien navega con teclado o con
//      lector de pantalla abre el diálogo y sigue "de pie" en la página de
//      detrás, sin enterarse de que ha pasado nada.
//   2. Retener el foco mientras está abierto. Tabulando dentro del formulario
//      de una reunión se salía a la barra de navegación y al contenido del
//      fondo — el diálogo se leía como si no existiera.
//   3. Cerrarse con Escape. Es lo primero que prueba cualquiera.
//
// Y el fondo no debe desplazarse: en iOS, con el teclado abierto, la página de
// detrás se movía bajo el diálogo.
let dialogoPreparado = null;

/** Lo que se puede enfocar dentro del diálogo, en orden de tabulación. */
function focoDentro(raiz) {
  return [...raiz.querySelectorAll(
    'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
  )].filter((el) => !el.disabled && el.offsetParent !== null);
}

let contadorCampo = 0;

/**
 * Asocia cada etiqueta con su campo.
 *
 * En toda la app el patrón es `<div class="field"><label>Texto</label><input>`:
 * la etiqueta se VE al lado del campo, pero no está unida a él. Para un lector
 * de pantalla ese campo no tiene nombre, y al tocar la etiqueta en el móvil no
 * pasa nada — cuando debería enfocar el campo y ampliar la zona de acierto.
 *
 * Se hace aquí, después de pintar, en lugar de a mano en cada plantilla: son
 * decenas de formularios y así queda resuelto también en los que se añadan.
 */
function asociarEtiquetas() {
  document.querySelectorAll(".field > label:not([for]), .login-card label:not([for])").forEach((etiqueta) => {
    if (etiqueta.querySelector("input, select, textarea")) return; // ya lo envuelve
    const campo = etiqueta.parentElement?.querySelector("input, select, textarea");
    if (!campo) return;
    if (!campo.id) campo.id = `campo-${(contadorCampo += 1)}`;
    etiqueta.setAttribute("for", campo.id);
  });

  // Botones que sólo llevan un icono y se apoyan en `title`. En una pantalla
  // táctil el `title` no se muestra nunca: para el dedo es un botón mudo y
  // para un lector de pantalla, un botón sin nombre.
  document.querySelectorAll("button[title]:not([aria-label])").forEach((boton) => {
    if ((boton.textContent || "").trim().length > 2) return;
    boton.setAttribute("aria-label", boton.getAttribute("title"));
  });
}

function initDialogo() {
  const fondo = document.querySelector(".modal-backdrop");
  const clave = state.modal ? `${state.modal.type}:${state.modal.intent || ""}:${state.modal.itemId || ""}` : null;

  if (!fondo) {
    if (dialogoPreparado !== null) desbloquearFondo();
    dialogoPreparado = null;
    return;
  }

  // La app repinta entera en cada tecla: sólo se prepara cuando el diálogo es
  // otro, no en cada repintado (si no, robaría el foco mientras se escribe).
  if (clave === dialogoPreparado) return;
  dialogoPreparado = clave;

  bloquearFondo();

  // El foco entra al diálogo. Si hay campos, al primero; si no, al propio
  // recuadro, para que el lector de pantalla lea el título y el mensaje.
  const tarjeta = fondo.querySelector(".modal-card");
  const enfocables = focoDentro(fondo);
  const primerCampo = enfocables.find((el) => /INPUT|SELECT|TEXTAREA/.test(el.tagName));
  // Con el dedo no se enfoca un campo de texto: abriría el teclado y taparía
  // el diálogo antes de que se pueda leer.
  const conDedo = window.matchMedia?.("(pointer: coarse)").matches;
  if (primerCampo && !conDedo) primerCampo.focus();
  else if (tarjeta) {
    tarjeta.setAttribute("tabindex", "-1");
    tarjeta.focus({ preventScroll: true });
  }

  fondo.addEventListener("keydown", (evento) => {
    if (evento.key === "Escape") {
      evento.preventDefault();
      closeModal();
      return;
    }
    if (evento.key !== "Tab") return;
    // Cerrojo de tabulación: del último se salta al primero y al revés.
    const lista = focoDentro(fondo);
    if (!lista.length) return;
    const primero = lista[0];
    const ultimo = lista[lista.length - 1];
    if (evento.shiftKey && (document.activeElement === primero || !fondo.contains(document.activeElement))) {
      evento.preventDefault();
      ultimo.focus();
    } else if (!evento.shiftKey && document.activeElement === ultimo) {
      evento.preventDefault();
      primero.focus();
    }
  });
}

/**
 * Congela el fondo. `position: fixed` con el desplazamiento guardado es la
 * única forma fiable en iOS: `overflow: hidden` a secas no impide el arrastre.
 */
function bloquearFondo() {
  if (document.body.classList.contains("con-dialogo")) return;
  const y = window.scrollY;
  document.body.dataset.desplazamiento = String(y);
  document.body.style.top = `-${y}px`;
  document.body.classList.add("con-dialogo");
}

function desbloquearFondo() {
  if (!document.body.classList.contains("con-dialogo")) return;
  const y = Number(document.body.dataset.desplazamiento || 0);
  document.body.classList.remove("con-dialogo");
  document.body.style.top = "";
  delete document.body.dataset.desplazamiento;
  window.scrollTo(0, y);
  // El elemento que abrió el diálogo ya no existe: la app repinta el árbol
  // entero. Se devuelve el foco al contenido, que es el punto de partida
  // razonable para seguir con el teclado.
  document.querySelector("#contenido")?.focus?.({ preventScroll: true });
}

function render() {
  const app = document.querySelector("#app");
  if (!state.user && !state.portalMode) {
    // El aviso también en el login: es la primera pantalla.
    app.innerHTML = renderAvisoDemo() + renderLogin();
    document.querySelector("#login-form")?.addEventListener("submit", login);
    document.querySelector("#forgot-form")?.addEventListener("submit", forgotPassword);
    document.querySelector("#forgot-password-link")?.addEventListener("click", () => toggleForgotPassword(true));
    document.querySelector("#back-to-login-link")?.addEventListener("click", () => toggleForgotPassword(false));
    // La etiqueta del botón sigue a la vía elegida: pulsar «Enviarme un
    // correo» y recibir un SMS —o al revés— es exactamente la clase de duda
    // que no debe tener quien ya ha perdido el acceso.
    document.querySelectorAll('#forgot-form [name="via"]').forEach((op) =>
      op.addEventListener("change", () => {
        const etiqueta = document.querySelector(".login-submit-label");
        if (etiqueta) etiqueta.textContent = op.value === "sms" ? "Enviarme un SMS" : "Enviarme un correo";
      })
    );
    bindLoginHelpers();
    return;
  }

  if (state.portalMode) {
    app.innerHTML = `${renderAvisoDemo()}${renderPortal()}${renderModal()}${renderAssistant()}${renderAvisoTratamiento()}${renderOnboarding()}`;
    bindActions();
    initSignaturePad();
    initPortalNav();
    initVenueCanvas();
    initAssistant();
    initOnboarding();
    initDialogo();
    asociarEtiquetas();
    marcarEntrada(document.querySelector(".portal-content"));
    return;
  }

  // Landmarks y salto al contenido: un lector de pantalla puede ir directo
  // a lo que importa sin recorrer las diez entradas del menu cada vez.
  app.innerHTML = `
    <a class="skip-link" href="#contenido">Saltar al contenido</a>
    ${renderAvisoDemo()}
    <div class="app-shell">
      ${renderSidebar()}
      <main class="main">
        ${renderTopbar()}
        ${renderAvisoNube()}
        <section class="content" id="contenido" tabindex="-1">${renderCurrentView()}</section>
      </main>
    </div>
    ${renderModal()}
    ${renderAssistant()}
    ${renderAvisoTratamiento()}
    ${renderOnboarding()}
  `;
  bindActions();
  initBuscadorWeb();
  initVenueCanvas();
  initAssistant();
  initOnboarding();
  initDialogo();
  asociarEtiquetas();
  marcarEntrada(document.querySelector("#contenido"));
}


/**
 * Detalles de la pantalla de acceso: mostrar la contraseña, avisar de Bloq
 * Mayús y limpiar el error al volver a escribir. Son pequeños, pero son la
 * diferencia entre reintentar a ciegas y saber qué está pasando.
 */
/**
 * Navegación del portal: salto suave a cada sección y marcado de la sección
 * visible. Se usa IntersectionObserver en vez de escuchar el scroll para no
 * recalcular en cada píxel — en móvil eso se nota.
 */
function initPortalNav() {
  document.querySelectorAll("[data-portal-tab]").forEach((button) =>
    button.addEventListener("click", () => {
      state.portalTab = button.dataset.portalTab;
      // La ayuda se cierra al cambiar de pestaña: cada seccion tiene la suya
      // y dejarla abierta mostraria el texto de la anterior un instante.
      state.portalHelpOpen = false;
      saveState();
      render();
      window.scrollTo({ top: 0, behavior: "smooth" });
    })
  );
  document.querySelector("[data-portal-help]")?.addEventListener("click", () => {
    state.portalHelpOpen = !state.portalHelpOpen;
    saveState();
    render();
  });
}

function bindLoginHelpers() {
  document.querySelectorAll("[data-toggle-password]").forEach((button) => {
    button.addEventListener("click", () => {
      const input = document.querySelector(`#${button.dataset.togglePassword}`);
      if (!input) return;
      const visible = input.type === "text";
      input.type = visible ? "password" : "text";
      button.textContent = visible ? "👁" : "🙈";
      button.setAttribute("aria-label", visible ? "Mostrar contraseña" : "Ocultar contraseña");
      button.title = button.getAttribute("aria-label");
      input.focus();
    });
  });

  const caps = document.querySelector("#caps-warning");
  const pass = document.querySelector("#login-pass");
  if (caps && pass) {
    const check = (event) => {
      if (typeof event.getModifierState !== "function") return;
      caps.hidden = !event.getModifierState("CapsLock");
    };
    pass.addEventListener("keyup", check);
    pass.addEventListener("keydown", check);
    pass.addEventListener("blur", () => { caps.hidden = true; });
  }

  // El error desaparece en cuanto se corrige algo: dejarlo fijo hace pensar
  // que el nuevo intento tambien ha fallado.
  document.querySelectorAll("#login-form input, #forgot-form input").forEach((input) =>
    input.addEventListener("input", () => setLoginError(""))
  );

  // Foco en el primer campo vacio.
  const first = document.querySelector("#login-form input[value=''], #login-form input:not([value]), #forgot-user");
  (document.querySelector("#login-user")?.value ? document.querySelector("#login-pass") : first || document.querySelector("#login-user"))?.focus();
}

function bindActions() {
  // Fundido de las portadas: antes se hacía con `onload=""` en el HTML, pero
  // la Content-Security-Policy de producción bloquea los manejadores en línea
  // y las fotos se quedaban invisibles (opacity:0). Ahora se conecta aquí.
  document.querySelectorAll("img[data-fade-img]").forEach((img) => {
    if (img.complete && img.naturalWidth > 0) {
      img.classList.add("is-loaded");
    } else if (img.complete) {
      img.classList.add("is-failed");
    } else {
      img.addEventListener("load", () => img.classList.add("is-loaded"), { once: true });
      img.addEventListener("error", () => img.classList.add("is-failed"), { once: true });
    }
  });

  // Iconos de proveedor (favicon de su web): si no llega, se quita y queda la
  // inicial de la empresa. Antes iba con `onerror=""` y la CSP lo bloqueaba,
  // así que quedaba el icono roto encima de la inicial.
  document.querySelectorAll("img[data-hide-on-error]").forEach((img) => {
    if (img.complete && img.naturalWidth === 0) img.remove();
    else img.addEventListener("error", () => img.remove(), { once: true });
  });

  document.querySelector("[data-mobile-menu]")?.addEventListener("click", () => {
    state.mobileMenuOpen = !state.mobileMenuOpen;
    render();
    document.querySelector(".mobile-more-close")?.focus();
  });
  // La hoja «Más» es un diálogo modal: el foco no puede escaparse a la página de
  // detrás y Escape tiene que cerrarla (antes, ni una cosa ni la otra).
  document.querySelector(".mobile-more-layer")?.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      state.mobileMenuOpen = false;
      render();
      document.querySelector("[data-mobile-menu]")?.focus();
      return;
    }
    if (e.key !== "Tab") return;
    const focos = [...document.querySelectorAll(".mobile-more-sheet button")].filter((b) => b.offsetParent !== null);
    if (!focos.length) return;
    const primero = focos[0], ultimo = focos[focos.length - 1];
    if (e.shiftKey && document.activeElement === primero) { e.preventDefault(); ultimo.focus(); }
    else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primero.focus(); }
  });
  document.querySelectorAll("[data-mobile-menu-close]").forEach((button) =>
    button.addEventListener("click", () => {
      state.mobileMenuOpen = false;
      render();
      document.querySelector("[data-mobile-menu]")?.focus();
    })
  );
  document.querySelectorAll("[data-view]").forEach((button) => button.addEventListener("click", () => setView(button.dataset.view)));
  document.querySelectorAll("[data-select-wedding]").forEach((button) => button.addEventListener("click", () => selectWedding(button.dataset.selectWedding)));
  // El lápiz de portada vive DENTRO de la zona clicable que abre la boda
  // (data-select-wedding): sin stopPropagation, cambiar la foto también
  // abriría la boda de golpe.
  document.querySelectorAll("[data-open-cover-picker]").forEach((button) =>
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      openCoverPicker(button.dataset.openCoverPicker);
    })
  );
  document.querySelectorAll("[data-pick-cover]").forEach((button) => button.addEventListener("click", () => pickCover(state.modal?.weddingId, button.dataset.pickCover)));
  document.querySelectorAll("[data-cover-upload]").forEach((input) =>
    input.addEventListener("change", (event) => {
      const file = event.target.files?.[0];
      if (file) uploadCoverPhoto(input.dataset.coverUpload, file);
    })
  );
  document.querySelectorAll("[data-open-portal-wedding]").forEach((button) => button.addEventListener("click", () => openPortalForWedding(button.dataset.openPortalWedding)));
  document.querySelector("[data-portal-switch]")?.addEventListener("change", (event) => openPortalForWedding(event.target.value));
  document.querySelectorAll("[data-copiar-enlace-portal]").forEach((b) => b.addEventListener("click", () => copiarEnlacePortal(b.dataset.copiarEnlacePortal)));

  // Portal de novios: edicion en linea, guardado y peticion de rincones.
  document.querySelectorAll("[data-portal-guest]").forEach((el) =>
    el.addEventListener(el.tagName === "SELECT" ? "change" : "input", () => setPortalDraft(el.dataset.portalGuest, el.dataset.portalField, el.value))
  );
  // Fichas de invitado plegables (sólo móvil). Se hace aquí, sin repintar,
  // igual que la edición en línea: repintar perdería lo que se esté
  // escribiendo en otra ficha abierta.
  document.querySelectorAll("[data-ficha-toggle]").forEach((boton) =>
    boton.addEventListener("click", () => {
      const fila = boton.closest("tr");
      if (!fila) return;
      const abierta = fila.classList.toggle("ficha-abierta");
      boton.setAttribute("aria-expanded", String(abierta));
    })
  );
  document.querySelector("[data-portal-save]")?.addEventListener("click", savePortalChanges);
  document.querySelectorAll("[data-request-rincon]").forEach((b) => b.addEventListener("click", () => requestRincon(b.dataset.requestRincon)));

  // Lado equipo: resolver las peticiones que llegan del portal.
  document.querySelectorAll("[data-approve-request]").forEach((b) => b.addEventListener("click", () => approveRinconRequest(b.dataset.approveRequest)));
  document.querySelectorAll("[data-reject-request]").forEach((b) => b.addEventListener("click", () => rejectRinconRequest(b.dataset.rejectRequest)));
  document.querySelectorAll("[data-open-wedding-tab]").forEach((button) =>
    button.addEventListener("click", () => {
      const [weddingId, tab] = button.dataset.openWeddingTab.split(":");
      state.selectedWeddingId = weddingId;
      state.selectedTab = tab || "resumen";
      state.view = "wedding";
      saveState();
      render();
      window.scrollTo(0, 0);
    })
  );
  document.querySelectorAll("[data-wedding-day]").forEach((button) =>
    button.addEventListener("click", () => {
      state.selectedWeddingId = button.dataset.weddingDay;
      state.selectedTab = "weddingday";
      state.view = "wedding";
      saveState();
      render();
      window.scrollTo(0, 0);
    })
  );
  document.querySelectorAll("[data-tab]").forEach((button) =>
    button.addEventListener("click", () => {
      state.selectedTab = button.dataset.tab;
      saveState();
      render();
      window.scrollTo(0, 0);
    })
  );
  document.querySelectorAll("[data-action]").forEach((button) => button.addEventListener("click", () => handleAction(button.dataset.action)));
  document.querySelectorAll("[data-complete]").forEach((button) => button.addEventListener("click", () => completeTimeline(button.dataset.complete)));
  document.querySelectorAll("[data-toggle-task]").forEach((button) => button.addEventListener("click", () => toggleTask(button.dataset.toggleTask)));
  document.querySelectorAll("[data-toggle-service]").forEach((button) => button.addEventListener("click", () => toggleService(button.dataset.toggleService)));
  document.querySelectorAll("[data-toggle-shot]").forEach((button) => button.addEventListener("click", () => toggleShot(button.dataset.toggleShot)));
  document.querySelectorAll("[data-toggle-provider]").forEach((button) => button.addEventListener("click", () => toggleProvider(button.dataset.toggleProvider)));
  document.querySelectorAll("[data-edit-wedding]").forEach((button) => button.addEventListener("click", () => editWedding(button.dataset.editWedding)));
  document.querySelectorAll("[data-delete-wedding]").forEach((button) => button.addEventListener("click", () => deleteWedding(button.dataset.deleteWedding)));
  document.querySelector("[data-editar-mi-perfil]")?.addEventListener("click", () => editarMiPerfil());
  document.querySelectorAll("[data-edit-user]").forEach((button) => button.addEventListener("click", () => editUser(button.dataset.editUser)));
  document.querySelectorAll("[data-delete-user]").forEach((button) => button.addEventListener("click", () => deleteUser(button.dataset.deleteUser)));
  document.querySelectorAll("[data-edit-item]").forEach((button) => button.addEventListener("click", () => editItem(button.dataset.editItem)));
  document.querySelectorAll("[data-delete-item]").forEach((button) => button.addEventListener("click", () => deleteItem(button.dataset.deleteItem)));
  document.querySelectorAll("[data-toggle-table-lock]").forEach((button) => button.addEventListener("click", () => toggleTableLock(button.dataset.toggleTableLock)));
  document.querySelectorAll("[data-view-document]").forEach((button) => button.addEventListener("click", () => viewDocument(button.dataset.viewDocument)));
  document.querySelectorAll("[data-open-document]").forEach((button) => button.addEventListener("click", () => openDocumentAttachment(button.dataset.openDocument)));
  document.querySelectorAll("[data-download-document]").forEach((button) => button.addEventListener("click", () => downloadDocumentAttachment(button.dataset.downloadDocument)));
  document.querySelectorAll("[data-map-search]").forEach((button) => button.addEventListener("click", () => openGoogleMaps(button.dataset.mapSearch)));
  document.querySelectorAll("[data-contract-fields]").forEach((b) => b.addEventListener("click", () => openContractForm(b.dataset.contractFields)));
  document.querySelectorAll("[data-new-annex]").forEach((b) => b.addEventListener("click", () => openAnnexForm(b.dataset.newAnnex)));
  document.querySelectorAll("[data-annex-item]").forEach((b) => b.addEventListener("change", () => toggleAnnexItem(b.dataset.annexItem)));
  document.querySelectorAll("[data-confirm-annex]").forEach((b) => b.addEventListener("click", () => confirmAnnex(b.dataset.confirmAnnex)));
  document.querySelectorAll("[data-new-budget]").forEach((b) => b.addEventListener("click", () => newBudgetItem()));
  document.querySelectorAll("[data-edit-budget]").forEach((b) => b.addEventListener("click", () => editBudgetItem(b.dataset.editBudget)));
  // Agenda de reuniones.
  document.querySelectorAll("[data-nueva-reunion]").forEach((b) => b.addEventListener("click", () => nuevaReunion(b.dataset.nuevaReunion, b.dataset.reunionFecha || "")));
  document.querySelectorAll("[data-editar-reunion]").forEach((b) => b.addEventListener("click", () => editarReunion(b.dataset.editarReunion)));
  document.querySelectorAll("[data-borrar-reunion]").forEach((b) => b.addEventListener("click", () => borrarReunion(b.dataset.borrarReunion)));
  document.querySelectorAll("[data-acuerdos-reunion]").forEach((b) => b.addEventListener("click", () => anotarAcuerdos(b.dataset.acuerdosReunion)));
  document.querySelectorAll("[data-ics-reunion]").forEach((b) => b.addEventListener("click", () => descargarIcs(b.dataset.icsReunion)));
  document.querySelectorAll("[data-agenda-vista]").forEach((b) => b.addEventListener("click", () => cambiarVistaAgenda(b.dataset.agendaVista)));
  document.querySelectorAll("[data-agenda-mes]").forEach((b) => b.addEventListener("click", () => moverMesAgenda(b.dataset.agendaMes)));
  document.querySelectorAll("[data-agenda-fecha]").forEach((b) => b.addEventListener("click", () => seleccionarFechaAgenda(b.dataset.agendaFecha)));
  document.querySelector("[data-agenda-hoy]")?.addEventListener("click", () => irAgendaHoy());
  // Buscador de acuerdos: filtra según se escribe y devuelve el foco al
  // final del texto, porque cada tecla repinta la vista entera.
  document.querySelector("[data-acuerdos-query]")?.addEventListener("input", (e) => {
    state.acuerdosQuery = e.target.value;
    render();
    const campo = document.querySelector("[data-acuerdos-query]");
    if (campo) {
      campo.focus();
      campo.setSelectionRange(campo.value.length, campo.value.length);
    }
  });
  document.querySelector("[data-agenda-filtro]")?.addEventListener("change", (e) => {
    state.agendaFiltro = e.target.value;
    saveState();
    render();
  });
  document.querySelector("[data-agenda-pasadas]")?.addEventListener("change", (e) => {
    state.agendaSoloFuturas = /vienen/i.test(e.target.value);
    saveState();
    render();
  });

  document.querySelectorAll("[data-decidir-proveedor]").forEach((b) => b.addEventListener("click", () => decidirProveedor(b.dataset.decidirProveedor)));
  document.querySelectorAll("[data-subir-presupuesto]").forEach((b) => b.addEventListener("click", () => subirPresupuestoProveedor(b.dataset.subirPresupuesto)));
  document.querySelectorAll("[data-ver-presupuesto]").forEach((b) => b.addEventListener("click", () => verPresupuestoProveedor(b.dataset.verPresupuesto)));
  document.querySelectorAll("[data-editar-pago]").forEach((b) => b.addEventListener("click", () => editarPago(b.dataset.editarPago)));
  document.querySelectorAll("[data-toggle-pago]").forEach((b) => b.addEventListener("click", () => togglePagado(b.dataset.togglePago)));
  document.querySelectorAll("[data-ver-justificante]").forEach((b) => b.addEventListener("click", () => verJustificante(b.dataset.verJustificante)));
  document.querySelectorAll("[data-ver-proveedor]").forEach((b) =>
    b.addEventListener("click", () => {
      state.view = "providers";
      state.providerSearch = state.providers.find((p) => p.id === b.dataset.verProveedor)?.name || "";
      saveState();
      render();
    })
  );
  document.querySelectorAll("[data-budget-target]").forEach((b) => b.addEventListener("click", () => setBudgetTarget(b.dataset.budgetTarget)));
  document.querySelectorAll("[data-portal-borrar-invitado]").forEach((b) =>
    b.addEventListener("click", () => portalBorrarInvitado(b.dataset.portalBorrarInvitado))
  );

  // Mesas gestionadas por los novios desde su portal.
  document.querySelectorAll("[data-portal-nueva-mesa]").forEach((b) => b.addEventListener("click", () => portalNuevaMesa()));
  document.querySelectorAll("[data-portal-editar-mesa]").forEach((b) => b.addEventListener("click", () => portalEditarMesa(b.dataset.portalEditarMesa)));
  document.querySelectorAll("[data-portal-borrar-mesa]").forEach((b) => b.addEventListener("click", () => portalBorrarMesa(b.dataset.portalBorrarMesa)));
  document.querySelectorAll("[data-portal-mesa]").forEach((sel) =>
    sel.addEventListener("change", (event) => portalSentarInvitado(sel.dataset.portalMesa, event.target.value))
  );

  const ds = document.querySelector("[data-doc-search]");
  ds?.addEventListener("input", (event) => {
    state.docSearch = event.target.value;
    const caret = event.target.selectionStart;
    saveState();
    render();
    const next = document.querySelector("[data-doc-search]");
    if (next) {
      next.focus();
      next.setSelectionRange(caret, caret);
    }
  });
  document.querySelector("[data-doc-wedding]")?.addEventListener("change", (event) => {
    const opt = event.target.selectedOptions[0];
    state.docFilterWedding = opt.value && opt.value !== opt.text ? opt.value : opt.text;
    saveState();
    render();
  });
  document.querySelector("[data-doc-visibility]")?.addEventListener("change", (event) => {
    state.docFilterVisibility = event.target.value;
    saveState();
    render();
  });

  document.querySelector("[data-abrir-import]")?.addEventListener("click", () => abrirImportador());
  document.querySelectorAll("[data-cerrar-import]").forEach((b) => b.addEventListener("click", () => cerrarImportador()));
  document.querySelector("[data-confirmar-import]")?.addEventListener("click", () => confirmarImportacion());
  const imp = document.querySelector("[data-import-texto]");
  imp?.addEventListener("input", (event) => {
    actualizarImportTexto(event.target.value);
    const caret = event.target.selectionStart;
    render();
    const next = document.querySelector("[data-import-texto]");
    if (next) {
      next.focus();
      next.setSelectionRange(caret, caret);
    }
  });

  document.querySelector("[data-provider-zone]")?.addEventListener("change", (event) => {
    state.providerFilterZone = event.target.value;
    saveState();
    render();
  });

  // Buscador y temas del manual.
  const gs = document.querySelector("[data-guide-search]");
  gs?.addEventListener("input", (event) => {
    state.guideSearch = event.target.value;
    const caret = event.target.selectionStart;
    saveState();
    render();
    const next = document.querySelector("[data-guide-search]");
    if (next) {
      next.focus();
      next.setSelectionRange(caret, caret);
    }
  });
  document.querySelector("[data-guide-clear]")?.addEventListener("click", () => {
    state.guideSearch = "";
    saveState();
    render();
  });
  document.querySelectorAll("[data-guide-area]").forEach((b) =>
    b.addEventListener("click", () => {
      state.guideArea = b.dataset.guideArea;
      state.guideSearch = "";
      saveState();
      render();
    })
  );

  document.querySelectorAll("[data-duplicar-boda]").forEach((b) => b.addEventListener("click", () => duplicarBodaForm(b.dataset.duplicarBoda)));
  document.querySelectorAll("[data-aceptar-aviso]").forEach((b) => b.addEventListener("click", () => aceptarAviso()));
  document.querySelectorAll("[data-descargar-rat]").forEach((b) => b.addEventListener("click", () => descargarRegistroTratamiento()));
  document.querySelectorAll("[data-exportar-datos]").forEach((b) => b.addEventListener("click", () => exportarDatosPareja(b.dataset.exportarDatos)));
  document.querySelectorAll("[data-upload-contract]").forEach((b) => b.addEventListener("click", () => openContractUpload(b.dataset.uploadContract)));
  document.querySelectorAll("[data-download-contract]").forEach((b) => b.addEventListener("click", () => downloadContractUpload(b.dataset.downloadContract)));
  document.querySelectorAll("[data-delete-contract-upload]").forEach((b) => b.addEventListener("click", () => deleteContractUpload(b.dataset.deleteContractUpload)));
  document.querySelectorAll("[data-generate-contract]").forEach((button) => button.addEventListener("click", () => generateContract(button.dataset.generateContract)));
  document.querySelectorAll("[data-mark-contract-signed-paper]").forEach((button) => button.addEventListener("click", () => markContractSignedPaper(button.dataset.markContractSignedPaper)));
  document.querySelectorAll("[data-print-contract]").forEach((button) => button.addEventListener("click", () => printContract(button.dataset.printContract)));
  document.querySelectorAll("[data-mark-payment-paid]").forEach((button) => button.addEventListener("click", () => markPaymentPaid(button.dataset.markPaymentPaid)));
  document.querySelectorAll("[data-open-receipt]").forEach((button) => button.addEventListener("click", () => openReceiptAttachment(button.dataset.openReceipt)));
  document.querySelectorAll("[data-mark-receipt-reviewed]").forEach((button) => button.addEventListener("click", () => markReceiptReviewed(button.dataset.markReceiptReviewed)));
  document.querySelectorAll("[data-print-section]").forEach((button) => button.addEventListener("click", () => printSection(button.dataset.printSection)));
  document.querySelectorAll("[data-export-section]").forEach((input) => input.addEventListener("change", () => {
    const section = input.dataset.exportSection;
    state.exportSelection = input.checked ? [...new Set([...state.exportSelection, section])] : state.exportSelection.filter((item) => item !== section);
    render();
  }));
  document.querySelectorAll("[data-export-audience]").forEach((button) => button.addEventListener("click", () => {
    state.exportAudience = button.dataset.exportAudience;
    const allowed = allowedReportSectionKeys(state.exportAudience);
    state.exportSelection = state.exportSelection.filter((section) => allowed.includes(section));
    render();
  }));
  document.querySelector("[data-provider-picker]")?.addEventListener("change", (event) => addExistingProvider(event.target.value));
  document.querySelector("[data-rincon-picker]")?.addEventListener("change", (event) => addExistingRincon(event.target.value));
  document.querySelectorAll("[data-view-rincon-photo]").forEach((button) => button.addEventListener("click", () => viewRinconPhoto(button.dataset.viewRinconPhoto)));
  document.querySelectorAll("[data-budget-vista]").forEach((b) =>
    b.addEventListener("click", () => {
      state.budgetVista = b.dataset.budgetVista;
      saveState();
      render();
    })
  );
  document.querySelectorAll("[data-partida-abrir]").forEach((b) =>
    b.addEventListener("click", () => {
      // Solo una abierta a la vez: si se pudieran abrir todas volveríamos
      // exactamente a la pantalla eterna de la que venimos.
      state.partidaAbierta = state.partidaAbierta === b.dataset.partidaAbrir ? null : b.dataset.partidaAbrir;
      render();
    })
  );
  // querySelectorAll, no querySelector: el botón está en Ajustes Y en el
  // listado de Bodas. Con el singular solo respondía el primero de los dos,
  // que es la clase de fallo que se descubre pulsando y no pasando nada.
  document.querySelector("[data-manual-portal]")?.addEventListener("click", () => abrirManualPortal());
  document.querySelectorAll("[data-cargar-referencia]").forEach((b) => b.addEventListener("click", () => cargarReferencia()));
  document.querySelectorAll("[data-quitar-referencia]").forEach((b) => b.addEventListener("click", () => quitarReferencia()));
  document.querySelector("[data-aligerar]")?.addEventListener("click", () => aligerarEstado());
  document.querySelectorAll("[data-abrir-documento]").forEach((b) => b.addEventListener("click", () => abrirDocumento(b.dataset.abrirDocumento)));
  document.querySelectorAll("[data-cerrar-boda]").forEach((b) => b.addEventListener("click", () => cerrarBoda(b.dataset.cerrarBoda)));
  document.querySelectorAll("[data-reabrir-boda]").forEach((b) => b.addEventListener("click", () => reabrirBoda(b.dataset.reabrirBoda)));
  document.querySelectorAll("[data-regenerar-clave]").forEach((b) => b.addEventListener("click", () => regenerarClavePortal(b.dataset.regenerarClave)));
  document.querySelectorAll("[data-abrir-portal]").forEach((b) => b.addEventListener("click", () => openPortalForWedding(b.dataset.abrirPortal)));
  document.querySelectorAll("[data-docs-filtro]").forEach((b) =>
    b.addEventListener("click", () => {
      state.docsFiltro = b.dataset.docsFiltro;
      saveState();
      render();
    })
  );
  document.querySelectorAll("[data-view-rincon-task-photo]").forEach((button) => button.addEventListener("click", () => viewRinconTaskPhoto(button.dataset.viewRinconTaskPhoto)));
  document.querySelectorAll("[data-new-rincon-task]").forEach((button) => button.addEventListener("click", () => newRinconTask(button.dataset.newRinconTask)));
  // Galeria de rincones: añadir fotos, mandar propuestas y aprobarlas.
  document.querySelectorAll("[data-new-rincon-photo]").forEach((b) => b.addEventListener("click", () => newRinconPhoto(b.dataset.newRinconPhoto, "catalogo")));
  document.querySelectorAll("[data-new-rincon-proposal]").forEach((b) => b.addEventListener("click", () => newRinconPhoto(b.dataset.newRinconProposal, "propuesta")));
  document.querySelectorAll("[data-delete-rincon-photo]").forEach((b) => b.addEventListener("click", () => deleteRinconPhoto(b.dataset.deleteRinconPhoto)));
  document.querySelectorAll("[data-approve-photo]").forEach((b) => b.addEventListener("click", () => approveRinconPhoto(b.dataset.approvePhoto)));
  document.querySelectorAll("[data-apuntar-tarea]").forEach((b) => b.addEventListener("click", () => apuntarEnTarea(b.dataset.apuntarTarea)));
  document.querySelectorAll("[data-ver-apuntes]").forEach((b) =>
    b.addEventListener("click", () => {
      state.apuntesAbiertos = b.dataset.verApuntes || null;
      render();
    })
  );
  document.querySelectorAll("[data-toggle-rincon-task]").forEach((button) => button.addEventListener("click", () => toggleRinconTask(button.dataset.toggleRinconTask)));
  // Alta de boda: desplegables de catalogo y edicion en linea del borrador.
  document.querySelector("[data-add-service]")?.addEventListener("change", (event) => {
    if (event.target.value !== "") addDraftService(event.target.value);
  });
  document.querySelector("[data-add-rincon]")?.addEventListener("change", (event) => {
    if (event.target.value) addDraftRincon(event.target.value);
  });
  document.querySelectorAll("[data-remove-service]").forEach((b) => b.addEventListener("click", () => removeDraftService(b.dataset.removeService)));
  document.querySelectorAll("[data-remove-rincon]").forEach((b) => b.addEventListener("click", () => removeDraftRincon(b.dataset.removeRincon)));
  document.querySelectorAll("[data-service-price]").forEach((i) => i.addEventListener("input", () => updateDraftField("draftServices", i.dataset.servicePrice, "price", i.value)));
  document.querySelectorAll("[data-service-note]").forEach((i) => i.addEventListener("input", () => updateDraftField("draftServices", i.dataset.serviceNote, "notes", i.value)));
  document.querySelectorAll("[data-rincon-price]").forEach((i) => i.addEventListener("input", () => updateDraftField("draftRincones", i.dataset.rinconPrice, "price", i.value)));
  document.querySelectorAll("[data-rincon-note]").forEach((i) => i.addEventListener("input", () => updateDraftField("draftRincones", i.dataset.rinconNote, "notes", i.value)));

  // Filtros de la tabla de invitados.
  const bindFilter = (attr, key) =>
    document.querySelector(`[${attr}]`)?.addEventListener("change", (event) => {
      state[key] = event.target.value;
      saveState();
      render();
    });
  bindFilter("data-filter-table", "guestFilterTable");
  bindFilter("data-filter-rsvp", "guestFilterRsvp");
  bindFilter("data-filter-group", "guestFilterGroup");
  bindFilter("data-filter-menu", "guestFilterMenu");
  document.querySelector("[data-filter-allergies]")?.addEventListener("click", () => {
    state.guestOnlyAllergies = !state.guestOnlyAllergies;
    saveState();
    render();
  });
  document.querySelector("[data-filter-clear]")?.addEventListener("click", () => {
    Object.assign(state, {
      guestSearch: "",
      guestFilterTable: "Todas",
      guestFilterRsvp: "Todos",
      guestFilterGroup: "Todos",
      guestFilterMenu: "Todos",
      guestOnlyAllergies: false,
    });
    saveState();
    render();
  });
  document.querySelectorAll("[data-mesas-view]").forEach((b) =>
    b.addEventListener("click", () => {
      state.mesasView = b.dataset.mesasView;
      saveState();
      render();
    })
  );

  // Buscador y filtro de la base de proveedores.
  document.querySelector("[data-provider-filter]")?.addEventListener("change", (event) => {
    state.providerFilterType = event.target.value;
    saveState();
    render();
  });
  document.querySelector("[data-provider-clear]")?.addEventListener("click", () => {
    state.providerSearch = "";
    state.providerFilterType = "Todas";
    saveState();
    render();
  });
  document.querySelector("[data-provider-search]")?.addEventListener("input", (event) => {
    state.providerSearch = event.target.value;
    const caret = event.target.selectionStart;
    saveState();
    render();
    const next = document.querySelector("[data-provider-search]");
    if (next) { next.focus(); next.setSelectionRange(caret, caret); }
  });

  document.querySelector("[data-guest-search]")?.addEventListener("input", (event) => {
    state.guestSearch = event.target.value;
    const caret = event.target.selectionStart;
    saveState();
    render();
    // Devolver el foco y el cursor: sin esto, cada tecla pierde el input.
    const next = document.querySelector("[data-guest-search]");
    if (next) {
      next.focus();
      next.setSelectionRange(caret, caret);
    }
  });
  document.querySelector("[data-wedding-search]")?.addEventListener("input", (event) => {
    state.weddingSearch = event.target.value;
    saveState();
    render();
  });
  document.querySelector("[data-wedding-filter]")?.addEventListener("change", (event) => {
    state.weddingFilter = event.target.value;
    saveState();
    render();
  });
  document.querySelector("[data-portal-login]")?.addEventListener("submit", portalLogin);
  document.querySelector("[data-wedding-form]")?.addEventListener("submit", createWeddingFromForm);
  document.querySelector("[data-modal-form]")?.addEventListener("submit", submitModalForm);

  // Confirmaciones que piden escribir una palabra (BORRAR, VACIAR…). El botón
  // refleja en todo momento si la acción puede ejecutarse: apagado mientras la
  // palabra no coincide, encendido en cuanto coincide. Se deja pulsable a
  // propósito —así explica qué falta en vez de no hacer nada— pero se ve que
  // aún no está listo, que es lo que antes no se veía por ninguna parte.
  const campoPalabra = document.querySelector("[data-confirm-word]");
  if (campoPalabra) {
    const botonConfirmar = document.querySelector('[data-action="confirm-modal"]');
    const avisoPalabra = document.querySelector("[data-confirm-word-error]");
    const palabra = state.modal?.confirmWord || "";
    const revisar = () => {
      const vale = ((campoPalabra.value ?? "")).trim() === palabra;
      // data-incompleto, no aria-disabled: se atenúa para que se vea que aún
      // no toca, pero el botón sigue siendo pulsable y enfocable. Un botón
      // deshabilitado no explica qué falta y el teclado no llega a él.
      if (vale) botonConfirmar?.removeAttribute("data-incompleto");
      else botonConfirmar?.setAttribute("data-incompleto", "true");
      if (vale && avisoPalabra) avisoPalabra.hidden = true;
    };
    campoPalabra.addEventListener("input", revisar);
    revisar();
    // Con ratón se enfoca el campo (es lo único que hay que hacer ahí). Con
    // dedo no: abrir el teclado tapa el propio diálogo y la persona pierde de
    // vista lo que estaba a punto de borrar.
    if (window.matchMedia?.("(pointer: fine)").matches) campoPalabra.focus();
  }
}

function handleAction(action) {
  const map = {
    logout,
    "new-wedding": newWedding,
    "cancel-wedding-form": cancelWeddingForm,
    "new-task": newTask,
    "new-timeline": newTimeline,
    "new-guest": newGuest,
    "new-table": newTable,
    "new-provider": newProvider,
    "new-rincon": newRincon,
    "new-payment": newPayment,
    "new-receipt": newReceipt,
    "new-shot": newShot,
    "new-service": newService,
    "new-music": newMusic,
    "new-transport": newTransport,
    "new-document": newDocument,
    "new-issue": newIssue,
    "new-user": newUser,
    "close-modal": closeModal,
    "cancelar-boda-nueva": volverAlListado,
    backup: descargarCopiaSeguridad,
    restore: abrirRestaurarCopia,
    "confirm-modal": confirmModal,
    "portal-add-guest": newGuest,
    "portal-nueva-mesa": portalNuevaMesa,
    print: () => window.print(),
    "print-dossier": printDossier,
    "confirm-print-options": confirmPrintOptions,
    "toggle-export-all": toggleExportAll,
    "export-json": exportJson,
    "export-guests": exportGuests,
    "export-word": exportDossierWord,
    "save-now": saveNow,
    "auto-seat": autoSeat,
    reset: resetDemo,
  };
  map[action]?.();
}

// La capa de datos no importa esta capa: se le pasa el renderizador aqui,
// al cargarse el modulo. Asi el grafo de imports deja de tener el ciclo raiz
// state → render → ... → state.
onRender(render);

export { bindActions, handleAction, render };
