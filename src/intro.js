// ============================================================================
// Vídeo de bienvenida
// ----------------------------------------------------------------------------
// Se ve SIEMPRE al abrir la aplicación. Es la carta de presentación de la
// marca y así se ha decidido que abra.
//
// Por eso el botón «Saltar» no es un adorno: quien entra veinte veces al día
// tiene que poder pasar de largo en un toque. Está visible desde el primer
// fotograma y Escape también sirve.
//
// Va como script clásico (no como módulo) y aparte del resto de la aplicación
// a propósito: así se pinta en cuanto llega el HTML, sin esperar a que cargue
// el grafo de módulos, que es justo cuando tiene que estar en pantalla.
//
// Tres cosas que no son opcionales:
//
//   · SIN SONIDO. Además de ser lo pedido, ningún navegador deja arrancar solo
//     un vídeo con audio: sin `muted` el `play()` se rechaza y no se ve nada.
//   · `playsinline`. Sin ese atributo, Safari en iPhone abre el vídeo a
//     pantalla completa en su propio reproductor, con sus controles encima.
//   · Que nunca bloquee. Si el archivo no está, tarda o el navegador se niega,
//     la aplicación sigue: el telón se levanta igual.
// ============================================================================
// El botón de emergencia del aviso de arranque. Se engancha desde aquí porque
// este archivo es un script normal: se ejecuta aunque el resto de la aplicación
// (que son módulos) no llegue a cargar, que es justo cuando hace falta.
(function () {
  function limpiarYReintentar() {
    try {
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.getRegistrations().then(function (regs) {
          regs.forEach(function (r) { r.unregister(); });
        });
      }
      if (window.caches && caches.keys) {
        caches.keys().then(function (ks) { ks.forEach(function (k) { caches.delete(k); }); });
      }
    } catch (e) {
      /* si no se puede limpiar, al menos se recarga */
    }
    window.setTimeout(function () { window.location.reload(); }, 600);
  }
  function enganchar() {
    var limpiar = document.getElementById("arranque-limpiar");
    if (limpiar) limpiar.addEventListener("click", limpiarYReintentar);
    // Nada de `onclick=` en el HTML: la política de seguridad de esta app
    // prohíbe el JavaScript en línea, así que un botón así no haría nada.
    var recargar = document.getElementById("arranque-recargar");
    if (recargar) recargar.addEventListener("click", function () { window.location.reload(); });
  }
  window.addEventListener("error", function (e) {
    var caja = document.querySelector("#arranque-fallido .arranque-caja");
    if (caja) {
      var errEl = document.getElementById("arranque-error-detalles");
      if (!errEl) {
        errEl = document.createElement("pre");
        errEl.id = "arranque-error-detalles";
        errEl.style.cssText = "background:#2b2220;color:#ff9999;padding:12px;border-radius:8px;font-size:12px;overflow:auto;max-width:100%;text-align:left;margin-top:14px;white-space:pre-wrap;border:1px solid #773333;";
        caja.appendChild(errEl);
      }
      errEl.textContent = (e.message || e.error || "Error") + (e.filename ? "\n" + e.filename + ":" + e.lineno : "");
    }
  });
  window.addEventListener("unhandledrejection", function (e) {
    var caja = document.querySelector("#arranque-fallido .arranque-caja");
    if (caja) {
      var errEl = document.getElementById("arranque-error-detalles");
      if (!errEl) {
        errEl = document.createElement("pre");
        errEl.id = "arranque-error-detalles";
        errEl.style.cssText = "background:#2b2220;color:#ff9999;padding:12px;border-radius:8px;font-size:12px;overflow:auto;max-width:100%;text-align:left;margin-top:14px;white-space:pre-wrap;border:1px solid #773333;";
        caja.appendChild(errEl);
      }
      errEl.textContent = "Error asíncrono: " + (e.reason?.message || e.reason || "Fallo en promesa");
    }
  });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", enganchar);
  else enganchar();
})();

// ── Vídeo de bienvenida ──────────────────────────────────────────────────────
// Un solo vídeo, horizontal (1280×720, 8 s, sin sonido, 2 MB):
//   assets/intro/bienvenida.mp4
//
// OJO CON LA DURACIÓN: está recortado a propósito y NO se puede alargar. El
// original dura 10 s y, a partir de los 8, tras un destello de luz, enseña un
// mockup de una web con texto sin sentido («OUR BOMY PLANNGS»). Se corta en el
// fotograma 192, en pleno destello, y ese destello da paso a la aplicación.
//
// Se ve en tablet y escritorio (≥768 px, el mismo corte que usa la interfaz).
// En móvil NO se muestra: el vídeo es apaisado y en una pantalla vertical o se
// recorta el logo o queda una franja diminuta. Cuando exista un montaje
// vertical, basta con devolver su ruta desde elegirVideo() para el caso móvil.
//
// Interruptor general: INTRO_ACTIVA. Todo lo demás (botón «Saltar», Escape,
// tope de 12 s, «menos movimiento», un solo vídeo descargado) ya está resuelto.
var INTRO_ACTIVA = true;

(function () {
  // El vídeo dura 8 s; pasado este tiempo se sigue de todos modos, aunque el
  // vídeo se haya quedado colgado.
  var ESPERA_MAXIMA = 12000;

  /** Ruta del vídeo para esta pantalla, o null si en ella no se enseña. */
  function elegirVideo() {
    var anchoGrande = true;
    try {
      anchoGrande = window.matchMedia("(min-width: 768px)").matches;
    } catch (e) {
      // Si matchMedia fallara, se mira el ancho a pelo.
      anchoGrande = (window.innerWidth || document.documentElement.clientWidth || 0) >= 768;
    }
    return anchoGrande ? "./assets/intro/bienvenida.mp4?v=1" : null;
  }

  if (!INTRO_ACTIVA) return;
  var ARCHIVO = elegirVideo();
  if (!ARCHIVO) return;

  // Quien pide menos movimiento no quiere una animación a pantalla completa.
  try {
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  } catch (e) {
    /* matchMedia siempre existe en los navegadores objetivo */
  }

  function montar() {
    var capa = document.createElement("div");
    capa.className = "intro-capa";
    capa.setAttribute("role", "dialog");
    capa.setAttribute("aria-label", "Presentación de Events Planner");

    var video = document.createElement("video");
    video.className = "intro-video";
    video.src = ARCHIVO;
    video.muted = true;            // sin sonido, y sin esto no arranca solo
    video.defaultMuted = true;
    video.autoplay = true;
    video.playsInline = true;
    video.setAttribute("muted", "");
    video.setAttribute("playsinline", "");
    video.setAttribute("webkit-playsinline", "");
    video.setAttribute("aria-hidden", "true");
    video.preload = "auto";

    var saltar = document.createElement("button");
    saltar.className = "intro-saltar";
    saltar.type = "button";
    saltar.textContent = "Saltar";

    capa.appendChild(video);
    capa.appendChild(saltar);
    document.body.appendChild(capa);
    document.body.classList.add("con-intro");

    var cerrado = false;
    function cerrar() {
      if (cerrado) return;
      cerrado = true;
      capa.classList.add("intro-saliendo");
      document.body.classList.remove("con-intro");
      window.setTimeout(function () {
        try {
          video.pause();
          video.removeAttribute("src");
          video.load();   // suelta el archivo: 2,3 MB que no hacen falta ya
        } catch (e) {
          /* da igual, la capa se va de todas formas */
        }
        if (capa.parentNode) capa.parentNode.removeChild(capa);
      }, 520);
    }

    saltar.addEventListener("click", cerrar);
    video.addEventListener("ended", cerrar);
    video.addEventListener("error", cerrar);
    // Escape también la cierra: es una capa a pantalla completa.
    document.addEventListener("keydown", function (evento) {
      if (evento.key === "Escape") cerrar();
    });
    // Red de seguridad: si el vídeo se queda colgado, la app no se queda con él.
    window.setTimeout(cerrar, ESPERA_MAXIMA);

    var promesa = video.play();
    if (promesa && typeof promesa.catch === "function") {
      promesa.catch(function () {
        // Si el navegador rechaza la reproducción automática pese a estar
        // silenciado (algunos ahorros de batería lo hacen), no se deja una
        // pantalla negra: se cierra y se entra a la aplicación.
        cerrar();
      });
    }
    // El foco va al botón para que se pueda salir con el teclado desde el
    // primer instante.
    saltar.focus({ preventScroll: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", montar);
  } else {
    montar();
  }
})();
