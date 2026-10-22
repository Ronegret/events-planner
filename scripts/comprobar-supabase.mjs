// ============================================================================
// Comprobar Supabase
// ----------------------------------------------------------------------------
// Dice, en castellano, qué está montado y qué falta. No cambia nada: solo mira.
//
//   npm run supabase:comprobar
//
// Con la clave secreta puesta comprueba además los usuarios y el almacén de
// archivos. Sin ella hace lo que puede y avisa de lo que no ha podido mirar.
// ============================================================================
import { readFileSync } from "node:fs";
import { join } from "node:path";

// ---------------------------------------------------------------------------
// Configuración: variables de entorno o, si no, el .env.local del proyecto
// ---------------------------------------------------------------------------
function leerEnvLocal() {
  try {
    const texto = readFileSync(join(process.cwd(), ".env.local"), "utf8");
    return Object.fromEntries(
      texto
        .split("\n")
        .map((linea) => linea.trim())
        .filter((linea) => linea && !linea.startsWith("#") && linea.includes("="))
        .map((linea) => {
          const i = linea.indexOf("=");
          return [linea.slice(0, i).trim(), linea.slice(i + 1).trim()];
        })
    );
  } catch {
    return {};
  }
}

const env = { ...leerEnvLocal(), ...process.env };
const URL_BASE = env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
const CLAVE_PUBLICA = env.SUPABASE_PUBLISHABLE_KEY || env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const CLAVE_SECRETA = env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY;

const OK = "  \x1b[32m✓\x1b[0m";
const NO = "  \x1b[31m✗\x1b[0m";
const DUDA = "  \x1b[33m?\x1b[0m";
const pendientes = [];

function apunta(queHacer) {
  pendientes.push(queHacer);
}

async function pedir(ruta, opciones = {}) {
  const clave = opciones.conSecreta && CLAVE_SECRETA ? CLAVE_SECRETA : CLAVE_PUBLICA;
  try {
    const respuesta = await fetch(`${URL_BASE}${ruta}`, {
      ...opciones,
      headers: { apikey: clave, Authorization: `Bearer ${clave}`, ...(opciones.headers || {}) },
    });
    let cuerpo = null;
    try {
      cuerpo = await respuesta.json();
    } catch {
      /* respuestas vacías (HEAD, 204) */
    }
    return { estado: respuesta.status, cuerpo };
  } catch (e) {
    return { estado: 0, error: e.cause?.code || e.message };
  }
}

console.log("\n═══ Comprobación de Supabase ═══\n");

// --- 1. ¿Tenemos con qué conectar? -----------------------------------------
console.log("1 · Configuración local (.env.local)");
if (!URL_BASE) {
  console.log(`${NO} Falta SUPABASE_URL — sin esto no hay nada que comprobar.`);
  process.exit(1);
}
console.log(`${OK} Proyecto: ${URL_BASE}`);
if (CLAVE_PUBLICA) console.log(`${OK} Clave pública (la que usa la app en el navegador)`);
else {
  console.log(`${NO} Falta la clave pública`);
  apunta("Copia la Publishable key desde Supabase › Project Settings › API a SUPABASE_PUBLISHABLE_KEY");
}
if (CLAVE_SECRETA) console.log(`${OK} Clave secreta (solo para tareas de administración)`);
else {
  console.log(`${DUDA} Sin clave secreta: no podré comprobar usuarios ni almacén de archivos`);
  apunta("Para crear usuarios: pon la Secret key en SUPABASE_SECRET_KEY (nunca la subas al hosting)");
}
if (!env.SUPABASE_DB_PASSWORD) {
  console.log(`${DUDA} SUPABASE_DB_PASSWORD está vacío — hace falta para aplicar migraciones`);
  apunta("Pon la contraseña de la base de datos en SUPABASE_DB_PASSWORD (Supabase › Settings › Database)");
}

// --- 2. ¿Responde el proyecto? ---------------------------------------------
console.log("\n2 · Conexión");
const raiz = await pedir("/rest/v1/");
if (raiz.estado === 0) {
  console.log(`${NO} No se puede contactar con el proyecto (${raiz.error})`);
  console.log("     Revisa que tengas internet y que la dirección del proyecto sea correcta.\n");
  process.exit(1);
}
console.log(`${OK} El proyecto responde (HTTP ${raiz.estado})`);

// --- 3. ¿Están las tablas? --------------------------------------------------
// PostgREST distingue: si la tabla no existe da PGRST205; si existe pero las
// reglas de acceso (RLS) no dejan leer sin sesión, da 401 o una lista vacía.
// Las dos cosas son buenas noticias distintas.
async function miraTabla(tabla, deQueMigracion) {
  const r = await pedir(`/rest/v1/${tabla}?select=*&limit=1`);
  const texto = JSON.stringify(r.cuerpo || {});
  if (/PGRST205|Could not find the table|does not exist/i.test(texto)) {
    console.log(`${NO} ${tabla.padEnd(14)} no existe`);
    apunta(`Aplica la migración ${deQueMigracion} (falta la tabla ${tabla})`);
    return false;
  }
  if (r.estado === 401 || r.estado === 403) {
    console.log(`${OK} ${tabla.padEnd(14)} existe y está protegida (pide sesión)`);
    return true;
  }
  console.log(`${OK} ${tabla.padEnd(14)} existe`);
  if (r.estado === 200 && Array.isArray(r.cuerpo) && r.cuerpo.length) {
    console.log(`${DUDA} ${" ".repeat(14)} …y se puede leer SIN sesión. Revisa las reglas de acceso.`);
    apunta(`Revisa las políticas RLS de ${tabla}: hoy cualquiera con la clave pública puede leerla`);
  }
  return true;
}

console.log("\n3 · Tablas");
await miraTabla("profiles", "0001");
await miraTabla("weddings", "0001");
await miraTabla("app_state", "0004");
await miraTabla("portal_access", "0003");

// --- 4. ¿Está la función que evita que dos personas se pisen? --------------
console.log("\n4 · Guardado sin pisarse (migración 0006)");
const rpc = await pedir("/rest/v1/rpc/guardar_app_state", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ p_data: {}, p_version: -1 }),
});
const textoRpc = JSON.stringify(rpc.cuerpo || {});
if (/PGRST202|Could not find the function/i.test(textoRpc)) {
  console.log(`${NO} La función guardar_app_state NO está`);
  console.log("     Sin ella, si dos personas guardan a la vez una pierde su trabajo sin enterarse.");
  apunta("Aplica la migración 0006_app_state_concurrencia.sql — es la que evita perder trabajo");
} else {
  console.log(`${OK} La función existe (respuesta ${rpc.estado})`);
}

// --- 5. Archivos y usuarios (necesitan clave secreta) ----------------------
console.log("\n5 · Almacén de archivos y usuarios");
if (!CLAVE_SECRETA) {
  console.log(`${DUDA} Sin clave secreta no puedo comprobarlo.`);
} else {
  const cubos = await pedir("/storage/v1/bucket", { conSecreta: true });
  if (Array.isArray(cubos.cuerpo)) {
    const nombres = cubos.cuerpo.map((c) => c.name);
    if (nombres.includes("ep-documents")) console.log(`${OK} Almacén «ep-documents» listo`);
    else {
      console.log(`${NO} Falta el almacén «ep-documents» — ahí van documentos y fotos que suba el equipo`);
      apunta("Crea el bucket «ep-documents» (privado) o aplica la migración 0003");
    }
  } else {
    console.log(`${DUDA} No pude leer los almacenes (HTTP ${cubos.estado})`);
  }

  const usuarios = await pedir("/auth/v1/admin/users?per_page=50", { conSecreta: true });
  const lista = usuarios.cuerpo?.users;
  if (Array.isArray(lista)) {
    if (!lista.length) {
      console.log(`${NO} No hay ningún usuario creado`);
      apunta("Ejecuta: npm run supabase:bootstrap-users");
    } else {
      console.log(`${OK} ${lista.length} usuario(s):`);
      lista.forEach((u) => console.log(`       · ${u.email}${u.email_confirmed_at ? "" : "  (SIN confirmar — no podrá entrar)"}`));
      if (lista.some((u) => !u.email_confirmed_at)) {
        apunta("Confirma los correos pendientes en Supabase › Authentication › Users, o recrea con Auto Confirm");
      }
      if (lista.some((u) => /@example\.invalid$/i.test(u.email || ""))) {
        console.log(`${DUDA} Hay cuentas con @example.invalid — ese dominio no existe, no recibirán ningún correo.`);
        apunta("Vuelve a ejecutar supabase:bootstrap-users: ahora usa correos reales");
      }
    }
  } else {
    console.log(`${DUDA} No pude leer los usuarios (HTTP ${usuarios.estado})`);
  }
}

// --- Resumen ----------------------------------------------------------------
console.log("\n═══ Qué falta ═══\n");
if (!pendientes.length) {
  console.log("  Nada. Está todo montado.\n");
  console.log("  La prueba que de verdad importa: abre la app en dos navegadores");
  console.log("  distintos, entra con dos usuarios y cambia algo en cada uno.");
  console.log("  Los dos tienen que ver el cambio del otro.\n");
} else {
  pendientes.forEach((p, i) => console.log(`  ${i + 1}. ${p}`));
  console.log("");
}
