# Buscador de proveedores en la web

Puesta en marcha, de principio a fin. Son cuatro pasos y se hacen una sola vez.
Hasta que estén hechos, el buscador se ve pero avisa de que le falta la clave:
la aplicación no se rompe y los buscadores externos de siempre siguen ahí.

---

## Qué se ha montado

| Pieza | Dónde vive | Qué hace |
|---|---|---|
| `src/buscador-proveedores.js` | Aplicación | El panel, las tarjetas de resultado y el alta en la base. |
| `supabase/functions/buscar-proveedores/index.ts` | Servidor | Guarda la clave de Google, pregunta y limpia la respuesta. |
| `supabase/migrations/0008_buscador_proveedores.sql` | Base de datos | La caché que evita pagar dos veces por la misma búsqueda. |

La clave de Google **nunca** sale del servidor. La aplicación solo habla con
Supabase, que es lo único que su política de seguridad permite (ver el `<meta>`
de `index.html`). No hace falta tocar esa política.

---

## Paso 1 · Sacar la clave de Google

1. Entra en <https://console.cloud.google.com/> con tu cuenta de Google.
2. Crea un proyecto —vale «Events Planner»— o usa el que ya haya.
3. **Facturación → Vincular una cuenta de facturación.** Sin esto, Places
   devuelve `403` a todo, aunque la clave sea correcta. Google exige tarjeta
   incluso para el tramo gratuito.
4. **APIs y servicios → Biblioteca**, busca **Places API (New)** y pulsa
   *Habilitar*. Ojo: la *nueva*. La antigua «Places API» no sirve aquí.
5. **APIs y servicios → Credenciales → Crear credenciales → Clave de API.**
6. Edita la clave recién creada y ponle dos límites:
   - *Restricciones de aplicación*: **Ninguna**. La clave se usa desde el
     servidor de Supabase, no desde un navegador, así que restringirla por
     dominio la rompería.
   - *Restricciones de API*: **solo Places API (New)**. Si algún día se filtrara,
     que no sirva para nada más.
7. Copia la clave. Empieza por `AIza…`.

> **No la pegues en `app-config.js` ni en ningún archivo del proyecto.** Ese
> archivo se sirve al navegador tal cual: la clave quedaría a la vista de
> cualquiera que abra el inspector.

---

## Paso 2 · Guardar la clave en Supabase

Desde la carpeta del proyecto:

```bash
npx supabase login          # solo la primera vez
npx supabase link --project-ref TU_PROJECT_REF
npx supabase secrets set GOOGLE_PLACES_API_KEY=AIza...tu-clave
```

También se puede hacer desde el panel:
**Supabase → Edge Functions → Secrets → Add new secret.**

Para comprobar que está guardada:

```bash
npx supabase secrets list
```

---

## Paso 3 · Aplicar la migración y desplegar la función

```bash
npx supabase db push                          # crea la tabla de caché
npx supabase functions deploy buscar-proveedores
```

`SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` los inyecta Supabase sola: no hay
que configurarlas.

---

## Paso 4 · Probar

1. `npm run build` y `npm run dev`.
2. Entra en **Proveedores** del menú.
3. Pulsa uno de los ejemplos —«Floristería»— y espera un par de segundos.

Si sale el aviso **«Falta configurar GOOGLE_PLACES_API_KEY»**, la clave no ha
llegado a la función: repite el paso 2 y vuelve a desplegar.

Si sale **«Google ha rechazado la clave»**, es casi siempre la facturación sin
activar o la API antigua en vez de la nueva. Los detalles exactos están en los
registros: **Supabase → Edge Functions → buscar-proveedores → Logs**.

---

## Lo que cuesta

Google cobra por búsqueda y cobra más cuando se le piden las valoraciones —que
es justo lo que hace útil esto. En septiembre de 2026, pedir nota media y número
de reseñas entra en el tramo *Enterprise*: unos **35 $ por cada 1.000 búsquedas**,
con un margen gratuito mensual por encima del millar largo de llamadas.

Con un volumen de uso normal: aunque el equipo hiciera **veinte búsquedas al
día todos los días del mes**, serían 600 búsquedas — dentro del margen gratuito.
Y con la caché por medio, las repetidas no cuentan.

Aun así, conviene ponerle un techo el primer día:

**Google Cloud → Facturación → Presupuestos y alertas → Crear presupuesto.**
Con un aviso por correo a los 10 € se duerme tranquilo.

### La caché

Cada búsqueda se guarda catorce días en `public.busquedas_proveedores`. La misma
consulta hecha por otra persona del equipo esa semana no vuelve a pagarse, y la
tarjeta lo dice con la etiqueta **↺ guardada**.

Para vaciarla a mano:

```sql
select public.limpiar_busquedas_proveedores(14);
```

Nadie puede leer esa tabla desde la aplicación: tiene RLS activado y ninguna
política. Solo entra la función de servidor, que va con la clave de servicio.

---

## Decisiones de diseño, por si hay que retocarlas

**Por qué no se guardan las fotos de Google.** Cada foto es una llamada aparte y
se paga aparte, y las de Places suelen ser del local, no del trabajo del
proveedor —que es lo que interesa ver en una boda—. En su lugar se usa el icono
de su propia web, igual que en el resto de fichas de la aplicación. Si algún día
interesa, la función ya devuelve la posición de la foto y solo habría que
añadirla al `FieldMask`.

**Por qué la categoría no viene de Google.** Google clasifica en su vocabulario
(«Florist», «Wedding venue»). Si se guardara esa categoría, los filtros de la
base dejarían de cuadrar en una semana. Se guarda la categoría de Events Planner que estaba
seleccionada al buscar; la de Google se enseña como referencia y no se guarda.

**Por qué la búsqueda no se lanza al teclear.** En la base buscar mientras
escribes es gratis. Aquí cada pulsación sería una llamada de pago, y media
palabra da malos resultados. Se busca al pulsar, y punto.

**Por qué la dirección acaba en las notas del proveedor.** El modelo de
proveedor de Events Planner no tiene campo de dirección, y añadirlo obligaba a tocar el
formulario, el importador, el dossier y el portal. La dirección, la valoración
del día que se encontró y el enlace a Maps se guardan como texto en las notas,
que es donde el equipo ya mira. Si más adelante interesa un campo propio, el
sitio es `PROVIDER` en `src/modals.js`.

---

## Si algún día se cambia de fuente de datos

Toda la relación con Google vive en la función de servidor. La aplicación solo
sabe pedir `{ consulta, categoria, zona, minValoracion, pagina }` y recibir una
lista de fichas con estos campos:

```
idGoogle · nombre · categoria · categoriaGoogle · direccion · ciudad
telefono · web · dominio · maps · valoracion · resenas · situacion · lat · lng
```

Cambiar Google por otro proveedor de datos es reescribir esa función
respetando esa forma. La interfaz no se entera.
