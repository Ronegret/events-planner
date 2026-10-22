/**
 * Events Planner — Servidor local
 * Uso: node server.mjs
 * Accede en: http://localhost:3000
 */

import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { join, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { exec } from "node:child_process";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const PORT = 3000;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css":  "text/css; charset=utf-8",
  ".js":   "text/javascript; charset=utf-8",
  ".mjs":  "text/javascript; charset=utf-8",
  ".svg":  "image/svg+xml; charset=utf-8",
  ".png":  "image/png",
  ".jpg":  "image/jpeg",
  ".ico":  "image/x-icon",
  ".json": "application/json; charset=utf-8",
  ".woff2":"font/woff2",
  ".woff": "font/woff",
};

const server = createServer(async (req, res) => {
  // Limpia query strings y trailing slash
  let pathname = req.url.split("?")[0].replace(/\/+$/, "") || "/";

  // Mapea "/" a "index.html"
  let filePath = join(__dirname, pathname === "/" ? "index.html" : pathname);

  try {
    const info = await stat(filePath);
    if (info.isDirectory()) filePath = join(filePath, "index.html");

    const data = await readFile(filePath);
    const ext  = extname(filePath).toLowerCase();
    const mime = MIME[ext] || "application/octet-stream";

    // Servidor de desarrollo: nada de cache. Los modulos ES (./src/*.js) no
    // llevan sufijo de version, asi que con "max-age" el navegador se quedaba
    // con el JavaScript viejo aunque el CSS si se refrescara — de ahi que los
    // cambios de estructura no se vieran y la web pareciera la misma.
    const isAsset = [".png", ".jpg", ".jpeg", ".svg", ".ico", ".woff", ".woff2"].includes(ext);
    res.writeHead(200, {
      "Content-Type":  mime,
      "Cache-Control": isAsset ? "public, max-age=3600" : "no-store, must-revalidate",
      "X-Content-Type-Options": "nosniff",
    });
    res.end(data);
  } catch {
    // SPA fallback → index.html
    try {
      const data = await readFile(join(__dirname, "index.html"));
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" });
      res.end(data);
    } catch {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("404 Not found");
    }
  }
});

server.listen(PORT, "127.0.0.1", () => {
  const url = `http://localhost:${PORT}`;
  console.log("");
  console.log("  ╔══════════════════════════════════════╗");
  console.log("  ║     Events Planner — Servidor local     ║");
  console.log("  ╠══════════════════════════════════════╣");
  console.log(`  ║  🌐  ${url}            ║`);
  console.log("  ║  ⌨️   Ctrl+C para detener             ║");
  console.log("  ╚══════════════════════════════════════╝");
  console.log("");

  // Abre el navegador automáticamente en Windows
  exec(`start ${url}`, (err) => {
    if (err) console.log(`  → Abre manualmente: ${url}`);
  });
});

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`\n  ✗ El puerto ${PORT} ya está en uso. Cierra la otra instancia o cambia PORT.\n`);
  } else {
    console.error("\n  ✗ Error al iniciar el servidor:", err.message, "\n");
  }
  process.exit(1);
});
