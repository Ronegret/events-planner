// ============================================================================
// Service Worker de Events Planner
// ----------------------------------------------------------------------------
// Existe por un motivo muy concreto: la pestaña Wedding Day se abre en fincas
// con poca cobertura donde hay dos rayas de señal, y es justo el
// momento en el que no se puede recargar la página "a ver si ahora va".
//
// Estrategia por tipo de recurso:
//   · App shell (HTML, CSS, JS, fuentes, logos) → red primero y copia local
//     como respaldo. Así una actualización visual no queda oculta por una
//     hoja de estilos antigua, y la app sigue abriendo sin cobertura.
//   · Fotos de Unsplash y avatares → stale while revalidate. Se ve la versión
//     guardada al instante y se refresca si hay conexión.
//   · Supabase y cualquier API → SOLO red, nunca cache. Servir datos de boda
//     caducados sería peor que no servir nada: se tomarían decisiones
//     sobre un timeline viejo.
//   · Vídeo → SOLO red. Ver más abajo: un vídeo no se pide entero, se pide por
//     trozos, y eso no cabe en el almacén.
//
// El versionado de CACHE fuerza la limpieza al desplegar: al cambiar la
// constante, `activate` borra todo lo anterior.
// ============================================================================

const VERSION = "ep-v1";
const SHELL = `${VERSION}-shell`;
const MEDIA = `${VERSION}-media`;

// Lo mínimo imprescindible para que la app abra sin red.
const APP_SHELL = [
  "./",
  "./index.html",
  "./styles.css",
  "./styles-responsive.css",
  "./app-config.js",
  "./app.bundle.js",
  "./src/main.js",
  "./assets/brand/ep-logo.png",
  "./manifest.json",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL).then((cache) =>
      // addAll falla entero si un solo recurso falla. Se añaden de uno en uno
      // para que un asset renombrado no deje la app sin service worker.
      Promise.all(APP_SHELL.map((url) => cache.add(url).catch(() => null)))
    )
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/** Datos vivos: nunca se cachean. Mejor un error honesto que un dato viejo. */
function esApi(url) {
  return (
    url.hostname.includes("supabase.co") ||
    url.pathname.startsWith("/rest/") ||
    url.pathname.startsWith("/auth/") ||
    url.pathname.startsWith("/storage/")
  );
}

/**
 * Peticiones que el Service Worker NO debe tocar jamás.
 *
 * Aquí estuvo el fallo que dejó la aplicación sin vídeo de bienvenida en TODOS
 * los dispositivos, y conviene que quede escrito porque no es evidente:
 *
 * Un navegador no descarga un vídeo de una vez. Pide trozos («Range:
 * bytes=0-…») y el servidor contesta 206 Partial Content. Hasta ahí, normal.
 * Lo que no es normal es que `cache.put()` RECHAZA cualquier respuesta 206 —lo
 * dice la especificación—, y esa llamada estaba dentro del mismo `try` que el
 * `fetch`. Resultado: el intento de guardar la copia fallaba, el `catch` lo
 * recogía como si no hubiera red, y devolvía «Sin conexión 503». El vídeo daba
 * error y el telón se cerraba antes de verse.
 *
 * Y solo pasaba a partir de la SEGUNDA visita, porque en la primera el Service
 * Worker todavía no controla la página. Por eso al probarlo en un navegador
 * recién abierto se veía perfectamente.
 *
 * Dos cierres, y con cualquiera de los dos bastaría:
 *   · toda petición por trozos pasa directa a la red;
 *   · los vídeos, también, aunque se pidieran enteros — son 2,3 MB que no
 *     pintan nada en el almacén de la app.
 */
function esVideoOTrozo(req, url) {
  return req.headers.has("range") || /\.(mp4|webm|mov|m4v)$/i.test(url.pathname);
}

function esMedia(url) {
  return (
    url.hostname.includes("images.unsplash.com") ||
    url.hostname.includes("fonts.gstatic.com") ||
    /\.(png|jpe?g|webp|avif|woff2?)$/i.test(url.pathname)
  );
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (esApi(url)) return; // pasa directo a la red, sin tocar
  if (esVideoOTrozo(req, url)) return; // ídem: ver esVideoOTrozo

  if (esMedia(url)) {
    // Stale while revalidate: se pinta lo guardado y se refresca por detrás.
    event.respondWith(
      caches.open(MEDIA).then(async (cache) => {
        const guardado = await cache.match(req);
        const red = fetch(req)
          .then((res) => {
            // Mismo cuidado que en el app shell: guardar la copia nunca puede
            // estropear la respuesta que ya ha traído la red.
            if (res.ok && res.status === 200) {
              try {
                cache.put(req, res.clone()).catch(() => {});
              } catch {
                /* almacén lleno o respuesta no cacheable */
              }
            }
            return res;
          })
          .catch(() => guardado);
        return guardado || red;
      })
    );
    return;
  }

  // App shell: red primero. La copia local solo entra cuando no hay conexión;
  // no se ignoran los query strings de versión al elegir un recurso reciente.
  event.respondWith(
    caches.open(SHELL).then(async (cache) => {
      let res;
      try {
        res = await fetch(req);
      } catch {
        // Esto sí es quedarse sin red. Se tira de la copia local.
        const guardado = (await cache.match(req)) || (await cache.match(url.pathname));
        if (guardado) return guardado;
        if (req.mode === "navigate") {
          const shell = await cache.match("./index.html");
          if (shell) return shell;
        }
        return new Response("Sin conexión", { status: 503, statusText: "Sin conexión" });
      }

      // Guardar la copia es un extra, y como extra se trata: si falla, se
      // devuelve igualmente lo que ha traído la red. Meter esto en el mismo
      // `try` que el `fetch` fue justo lo que convirtió un fallo al guardar en
      // un «Sin conexión» que no era verdad.
      if (res.ok && res.status === 200 && url.origin === self.location.origin) {
        try {
          await cache.put(req, res.clone());
        } catch {
          /* almacén lleno, respuesta no cacheable… da igual: la red ya respondió */
        }
      }
      return res;
    })
  );
});
