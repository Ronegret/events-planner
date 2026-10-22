// ============================================================================
// Buscador de proveedores · función de servidor
// ----------------------------------------------------------------------------
// Lo que hace: recibe «floristería en Girona», se lo pregunta a Google Places y
// devuelve fichas ya limpias, con la forma que la aplicación usa para un
// proveedor. Nombre, dirección, teléfono, web, nota media y nº de reseñas.
//
// Por qué vive AQUÍ y no en el navegador:
//
//   1. La clave de Google. Si la búsqueda se hiciera desde la página, la clave
//      viajaría dentro del JavaScript y cualquiera podría copiarla y gastar
//      dinero de la cuenta de Google Cloud del proyecto. Aquí no sale nunca del servidor.
//   2. El gasto. Google cobra por búsqueda, y pedir las valoraciones sube el
//      precio de tramo. Con una caché de por medio, buscar tres veces seguidas
//      «catering Barcelona» se paga una sola vez.
//   3. La política de seguridad de la app (ver el <meta> de index.html) solo
//      deja hablar con supabase.co. Pasar por aquí evita tener que abrirla a
//      googleapis.com, que es exactamente el tipo de agujero que no interesa
//      abrir en una herramienta con datos de invitados dentro.
//
// Quién puede llamarla: solo alguien con sesión abierta en Events Planner. Sin
// token válido, 401 y no se gasta una sola llamada a Google.
// ============================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

/** Días que se guarda una búsqueda antes de volver a preguntar a Google. */
const CACHE_DIAS = 14;

/**
 * Cómo se dice cada categoría de Events Planner en el idioma de un buscador.
 *
 * «Estilismo / MUAH» es como lo llamamos nosotras; nadie da de alta su negocio
 * con ese nombre. Lo que hay en Google es «maquillaje y peluquería de novia».
 * Esta tabla es la traducción de nuestro vocabulario al suyo, y es la
 * diferencia entre traer cuatro resultados y traer veinte buenos.
 */
const TERMINOS: Record<string, string> = {
  "Espacio / Finca": "finca para bodas masía celebraciones",
  "Catering": "catering para bodas",
  "Fotografía": "fotógrafo de bodas",
  "Vídeo": "vídeo de bodas videógrafo",
  "Música / DJ": "dj para bodas",
  "Música en directo": "grupo de música en directo para bodas",
  "Floristería": "floristería decoración floral bodas",
  "Decoración": "decoración de bodas y eventos",
  "Estilismo / MUAH": "maquillaje y peluquería de novia",
  "Vestido y traje": "vestidos de novia atelier",
  "Joyería y alianzas": "joyería alianzas de boda",
  "Tarta y repostería": "tartas de boda repostería",
  "Transporte": "alquiler de coches y autocares para bodas",
  "Papelería": "invitaciones de boda papelería",
  "Photobooth": "fotomatón photobooth para bodas",
  "Animación infantil": "animación infantil para bodas",
  "Mobiliario / alquiler": "alquiler de mobiliario para eventos",
  "Iluminación y sonido": "iluminación y sonido para eventos",
  "Oficiante": "oficiante de ceremonias civiles",
  "Wedding Planner": "wedding planner organización de bodas",
};

/** Campos que se le piden a Google. Cada uno cuesta: no se pide de más. */
const CAMPOS = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.shortFormattedAddress",
  "places.location",
  "places.googleMapsUri",
  "places.websiteUri",
  "places.nationalPhoneNumber",
  "places.internationalPhoneNumber",
  "places.primaryTypeDisplayName",
  "places.businessStatus",
  // Estos dos son los que suben el tramo de precio. Son también la razón de
  // ser de todo esto: sin valoraciones, esto es una lista de direcciones.
  "places.rating",
  "places.userRatingCount",
  "nextPageToken",
].join(",");

function json(cuerpo: unknown, status = 200) {
  return new Response(JSON.stringify(cuerpo), {
    status,
    headers: { ...CORS, "Content-Type": "application/json; charset=utf-8" },
  });
}

function sinTildes(v: string) {
  return String(v || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

/**
 * La ciudad, sacada de la dirección completa.
 *
 * Google devuelve «Carrer de Bailèn, 112, L'Eixample, 08009 Barcelona, España».
 * Para una ficha de proveedor lo que importa es «Barcelona»: es lo que se filtra
 * después por zona. Se localiza por el código postal, que en España son siempre
 * cinco cifras justo antes del municipio.
 */
function ciudadDe(direccion: string) {
  const m = String(direccion || "").match(/\b\d{5}\s+([^,]+)/);
  if (m) return m[1].trim();
  const trozos = String(direccion || "").split(",").map((t) => t.trim()).filter(Boolean);
  return trozos.length >= 2 ? trozos[trozos.length - 2] : "";
}

function dominioDe(web: string) {
  try {
    return new URL(web).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

/** Una ficha de Google, con la forma que usa Events Planner. */
function aFicha(p: any, categoria: string) {
  const direccion = p.formattedAddress || p.shortFormattedAddress || "";
  return {
    idGoogle: p.id || "",
    nombre: p.displayName?.text || "",
    categoria: categoria && categoria !== "Todas" ? categoria : "",
    categoriaGoogle: p.primaryTypeDisplayName?.text || "",
    direccion,
    ciudad: ciudadDe(direccion),
    telefono: p.nationalPhoneNumber || p.internationalPhoneNumber || "",
    web: p.websiteUri || "",
    dominio: dominioDe(p.websiteUri || ""),
    maps: p.googleMapsUri || "",
    valoracion: typeof p.rating === "number" ? p.rating : null,
    resenas: typeof p.userRatingCount === "number" ? p.userRatingCount : 0,
    // OPERATIONAL / CLOSED_TEMPORARILY / CLOSED_PERMANENTLY. Un negocio cerrado
    // se devuelve igual, pero marcado: es información útil, no ruido.
    situacion: p.businessStatus || "",
    lat: p.location?.latitude ?? null,
    lng: p.location?.longitude ?? null,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "metodo" }, 405);

  const CLAVE_GOOGLE = Deno.env.get("GOOGLE_PLACES_API_KEY");
  if (!CLAVE_GOOGLE) {
    // 424 y no 500: no es que se haya roto, es que falta un paso de la puesta
    // en marcha. La aplicación distingue los dos casos y lo cuenta distinto.
    return json({ error: "sin_clave", mensaje: "Falta configurar GOOGLE_PLACES_API_KEY." }, 424);
  }

  // ── Quién llama ──────────────────────────────────────────────────────────
  const auth = req.headers.get("Authorization") || "";
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const claveServicio = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, claveServicio, { auth: { persistSession: false } });

  const token = auth.replace(/^Bearer\s+/i, "");
  const { data: sesion } = token ? await supabase.auth.getUser(token) : { data: { user: null } };
  if (!sesion?.user) {
    return json({ error: "sin_sesion", mensaje: "Entra en Events Planner para poder buscar." }, 401);
  }

  // ── Qué se busca ─────────────────────────────────────────────────────────
  let cuerpo: any = {};
  try {
    cuerpo = await req.json();
  } catch {
    return json({ error: "peticion" }, 400);
  }

  const libre = String(cuerpo.consulta || "").trim().slice(0, 120);
  const categoria = String(cuerpo.categoria || "").trim();
  const zona = String(cuerpo.zona || "").trim();
  const minimo = Number(cuerpo.minValoracion) || 0;
  const pagina = String(cuerpo.pagina || "").trim();

  const termino = libre || TERMINOS[categoria] || categoria || "proveedores para bodas";
  const consulta = `${termino}${zona ? ` en ${zona}` : ""}`.trim();
  if (!consulta) return json({ error: "vacio", mensaje: "Escribe qué estás buscando." }, 400);

  // ── ¿Ya la habíamos preguntado? ──────────────────────────────────────────
  const clave = [sinTildes(consulta), minimo, pagina].join("|");
  const desde = new Date(Date.now() - CACHE_DIAS * 864e5).toISOString();

  if (!pagina) {
    const { data: guardada } = await supabase
      .from("busquedas_proveedores")
      .select("resultados, creado_at")
      .eq("clave", clave)
      .gte("creado_at", desde)
      .maybeSingle();
    if (guardada?.resultados) {
      return json({ ...guardada.resultados, desdeCache: true, guardadaEl: guardada.creado_at });
    }
  }

  // ── Preguntar a Google ───────────────────────────────────────────────────
  const peticion: Record<string, unknown> = {
    textQuery: consulta,
    languageCode: "es",
    regionCode: "ES",
    pageSize: 20,
  };
  if (minimo > 0) peticion.minRating = minimo;
  if (pagina) peticion.pageToken = pagina;

  let respuesta: Response;
  try {
    respuesta = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": CLAVE_GOOGLE,
        "X-Goog-FieldMask": CAMPOS,
      },
      body: JSON.stringify(peticion),
    });
  } catch (e) {
    return json({ error: "red", mensaje: "No se ha podido contactar con el buscador." }, 502);
  }

  if (!respuesta.ok) {
    const detalle = await respuesta.text();
    console.error("[buscar-proveedores] Google respondió", respuesta.status, detalle.slice(0, 400));
    // 403 casi siempre es la clave: sin facturación, sin Places API activada o
    // restringida a otro dominio. Merece un mensaje propio porque la solución
    // no está en la aplicación sino en la consola de Google.
    if (respuesta.status === 403) {
      return json({ error: "clave", mensaje: "Google ha rechazado la clave. Revisa que la API Places (New) esté activada y con facturación." }, 424);
    }
    return json({ error: "google", mensaje: "El buscador no ha podido responder ahora mismo." }, 502);
  }

  const datos = await respuesta.json();
  const resultados = (datos.places || []).map((p: any) => aFicha(p, categoria));
  const salida = { resultados, siguiente: datos.nextPageToken || "", consulta };

  // ── Guardar para la próxima ──────────────────────────────────────────────
  if (!pagina) {
    await supabase
      .from("busquedas_proveedores")
      .upsert({ clave, consulta, resultados: salida, creado_at: new Date().toISOString() })
      .then(undefined, (e) => console.error("[buscar-proveedores] no se pudo cachear:", e));
  }

  return json({ ...salida, desdeCache: false });
});
