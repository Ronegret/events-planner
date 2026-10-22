// Registro del Service Worker.
//
// Vivía como <script> dentro de index.html, pero la política de contenido
// (CSP) tiene que poder decir `script-src 'self'` sin `unsafe-inline`: si se
// permite el JavaScript en línea, cualquier texto que llegara a colarse en el
// HTML podría ejecutarse, y en esta aplicación hay nombres de invitados y
// alergias. Un archivo aparte cuesta nada y cierra esa puerta.
//
// El Service Worker hace que la app abra sin cobertura, que es la situación
// normal en una finca el día de la boda. Solo se registra el de Events Planner: si el
// navegador arrastra uno de otro proyecto que corriera antes en este mismo
// puerto, se desregistra para que no secuestre las cargas de esta app.
const SW_URL = "./sw.js?v=9";

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.getRegistrations().then((regs) => {
    regs.forEach((reg) => {
      if (!reg.active || !reg.active.scriptURL.endsWith(SW_URL.replace("./", "/"))) reg.unregister();
    });
  });

  // Al desplegar una versión nueva, el móvil que ya tenía la app instalada
  // seguía abriendo la copia guardada: se subían los arreglos y en el teléfono
  // no se veía nada distinto. Con esto, cada arranque comprueba si hay versión
  // nueva y, cuando el nuevo Service Worker toma el control, se recarga una
  // sola vez para que lo que se ve sea siempre lo último publicado.
  // Sólo se recarga cuando SUSTITUYE a un Service Worker anterior, es decir
  // cuando de verdad hay una versión nueva. En la primera visita no había
  // ninguno: `clients.claim()` dispara igualmente este evento y recargar ahí
  // sería una recarga gratuita nada más abrir la app.
  const habiaVersionPrevia = Boolean(navigator.serviceWorker.controller);
  let recargando = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (!habiaVersionPrevia || recargando) return;
    recargando = true;
    window.location.reload();
  });

  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register(SW_URL)
      .then((reg) => reg.update().catch(() => {}))
      .catch(() => {
        /* file:// o navegación privada: la app sigue funcionando online */
      });
  });
}
