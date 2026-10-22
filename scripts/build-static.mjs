import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { execSync } from "node:child_process";

const root = process.cwd();
const dist = join(root, "dist");

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });

// ---------------------------------------------------------------------------
// Sello de compilación
// ---------------------------------------------------------------------------
// Mientras la herramienta está en cambio constante, el problema no es publicar:
// es que el móvil del equipo siga viendo lo de ayer. Entre el Service Worker y
// la caché del navegador, se subían arreglos y en el teléfono no cambiaba nada,
// y había que ir a "borrar datos del sitio" a mano en cada dispositivo.
//
// La solución es que cada compilación tenga un sello propio y que ese sello
// entre en TODAS las direcciones que carga la app: hojas de estilo, módulos y
// Service Worker. Una dirección nueva es un archivo nuevo para el navegador —
// no hay caché que valga— y así deja de hacer falta tocar nada en el móvil.
const SELLO = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14);

// `app.bundle.js` NO está en esta lista a propósito: no se copia, se genera más
// abajo con esbuild. Copiarlo era arrastrar el de la vez anterior.
for (const file of ["index.html", "styles.css", "styles-responsive.css", "app-config.js", "manifest.json", "sw.js", "favicon.ico", "README.md", ".htaccess"]) {
  await cp(join(root, file), join(dist, file));
}

// index.html: se reescribe cada ?v=… con el sello de esta compilación.
const indice = (await readFile(join(dist, "index.html"), "utf8"))
  .replace(/\?v=[\w.-]+/g, `?v=${SELLO}`);
await writeFile(join(dist, "index.html"), indice);

// sw.js: la constante VERSION gobierna el borrado de cachés antiguas al
// activarse (ver el manejador `activate`). Con el sello, cada despliegue
// limpia lo anterior sin excepción.
const worker = (await readFile(join(dist, "sw.js"), "utf8"))
  .replace(/const VERSION = "[^"]*"/, `const VERSION = "ep-${SELLO}"`);
await writeFile(join(dist, "sw.js"), worker);

// sw-registro.js: la dirección del worker también lleva el sello, para que el
// navegador se descargue el archivo nuevo en vez de dar por bueno el guardado.
const registro = (await readFile(join(root, "src/sw-registro.js"), "utf8"))
  .replace(/const SW_URL = "[^"]*"/, `const SW_URL = "./sw.js?v=${SELLO}"`);

await cp(join(root, "src"), join(dist, "src"), { recursive: true });
await writeFile(join(dist, "src/sw-registro.js"), registro);
await cp(join(root, "assets"), join(dist, "assets"), { recursive: true });
await cp(join(root, ".openai"), join(dist, ".openai"), { recursive: true });

// ---------------------------------------------------------------------------
// Un solo archivo de JavaScript
// ---------------------------------------------------------------------------
// La aplicacion esta escrita en modulos (`import`/`export`), que es lo correcto
// para trabajar. Pero servidos sueltos dependen de que el hosting devuelva cada
// uno con el tipo exacto `text/javascript`: si uno solo llega mal etiquetado,
// el navegador se niega a ejecutarlo y la pagina queda EN BLANCO, sin nada que
// lo explique. Son veinticuatro archivos y veinticuatro ocasiones de fallar.
//
// Por eso el despliegue lleva los modulos unidos en un unico archivo clasico.
//
// Y se GENERA aqui, en cada compilacion, a proposito: cuando se creo a mano una
// vez, `dist` se quedo con el index.html apuntando a un archivo que no existia
// y la web se quedo en blanco. Un paso manual que hay que acordarse de repetir
// es un paso que algun dia no se repite.
console.log("empaquetando modulos...");
execSync(
  `npx --yes esbuild src/main.js --bundle --format=iife --charset=utf8 --legal-comments=none --outfile="${join(dist, "app.bundle.js")}"`,
  { stdio: ["ignore", "ignore", "inherit"], cwd: root }
);
// Tambien en la raiz, para que `npm run dev` sirva siempre lo mismo que se
// despliega y no haya dos verdades.
await cp(join(dist, "app.bundle.js"), join(root, "app.bundle.js"));

const serverDir = join(dist, "server");
await mkdir(serverDir, { recursive: true });

// Recorre src/ recursivamente para incluir todos los modulos ES en el bundle del servidor.
async function collectJsFiles(dir) {
  const { readdir } = await import("node:fs/promises");
  const entries = await readdir(join(root, dir), { withFileTypes: true });
  const out = {};
  for (const entry of entries) {
    const rel = `${dir}/${entry.name}`;
    if (entry.isDirectory()) {
      Object.assign(out, await collectJsFiles(rel));
    } else if (entry.name.endsWith(".js")) {
      out[`/${rel}`] = { body: await readFile(join(root, rel), "utf8"), type: "text/javascript; charset=utf-8" };
    }
  }
  return out;
}

const files = {
  "/": {
    body: await readFile(join(root, "index.html"), "utf8"),
    type: "text/html; charset=utf-8",
  },
  "/index.html": {
    body: await readFile(join(root, "index.html"), "utf8"),
    type: "text/html; charset=utf-8",
  },
  "/styles.css": {
    body: await readFile(join(root, "styles.css"), "utf8"),
    type: "text/css; charset=utf-8",
  },
  "/styles-responsive.css": {
    body: await readFile(join(root, "styles-responsive.css"), "utf8"),
    type: "text/css; charset=utf-8",
  },
  "/app-config.js": {
    body: await readFile(join(root, "app-config.js"), "utf8"),
    type: "text/javascript; charset=utf-8",
  },
  "/manifest.json": {
    body: await readFile(join(root, "manifest.json"), "utf8"),
    type: "application/manifest+json; charset=utf-8",
  },
  "/sw.js": {
    body: await readFile(join(root, "sw.js"), "utf8"),
    type: "text/javascript; charset=utf-8",
  },
  ...(await collectJsFiles("src")),
};

await writeFile(
  join(serverDir, "index.js"),
  `const files = ${JSON.stringify(files)};\n\nexport default {\n  async fetch(request) {\n    const url = new URL(request.url);\n    const pathname = url.pathname.endsWith("/") && url.pathname !== "/" ? url.pathname.slice(0, -1) : url.pathname;\n    const file = files[pathname] || files["/"];\n    return new Response(file.body, {\n      headers: {\n        "content-type": file.type,\n        "cache-control": pathname === "/" || pathname === "/index.html" ? "no-store" : "public, max-age=3600",\n      },\n    });\n  },\n};\n`
);

console.log(`sello de compilacion: ${SELLO}`);
