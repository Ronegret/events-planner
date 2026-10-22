# Events Planner

**Ideas · Plan · Grandes momentos.** Herramienta web para planificar bodas y
eventos entre un equipo y las parejas: invitados, mesas, proveedores,
presupuesto, contratos, agenda y el día del evento, en un solo sitio.

Esta versión es una **demostración**: todos los datos (parejas, invitados,
proveedores, importes, teléfonos, correos) están inventados.

## Acceso de prueba

```
usuario:     admin
contraseña:  admin
```

Para el portal de las parejas, la clave de cada boda de ejemplo es `demo2026`.

## Qué incluye

- Panel de inicio con lo que necesita atención hoy.
- Bodas, agenda, y espacio de trabajo por boda (timeline, tareas, wedding day).
- Invitados, plano de mesas, menús y alergias.
- Proveedores reutilizables y catálogo de rincones con seguimiento de compra.
- Presupuesto por partidas y plazos, con parte facturada y no facturada.
- Contrato imprimible y portal privado para cada pareja.
- Dossieres para el equipo, las parejas o los proveedores.
- Funciona en móvil, tablet y escritorio; se instala como app y abre sin conexión.

## Cómo se trabaja

Sin framework: HTML, CSS y JavaScript con módulos ES (`src/`). Nada que instalar
para ver la web; para compilar el paquete publicable hace falta Node.

```bash
npm run build            # genera dist/ (incluye el paquete app.bundle.js)
npm run seed:portfolio   # regenera las bodas de demostración
python scripts/construir-marca.py "<carpeta con el material>"   # logo, iconos y fotos
```

- `scripts/build-static.mjs` une los módulos en un solo archivo y estampa cada
  compilación para que ningún móvil se quede con una copia antigua.
- `scripts/construir-marca.py` extrae el logo con transparencia, crea los iconos
  de la app, recorta y optimiza las fotos y regenera las imágenes del contrato.
- `scripts/gen-seed-portfolio.mjs` crea las tres bodas de ejemplo con una semilla
  fija. Sus fechas se desplazan al cargar, así que la demo no envejece.

## Documentación

- `docs/VOZ-DE-MARCA.md` — cómo se escribe cualquier texto de la aplicación.
- `docs/PORTFOLIO.md` — cómo se preparó la versión pública y cómo comprobarla.
- `IMPLEMENTATION_STATUS.md` — estado del producto fase a fase.

## Datos y privacidad

La versión de demostración no se conecta a ninguna nube: guarda en el navegador
de quien la visita y caduca a la semana. No contiene datos de personas reales.
