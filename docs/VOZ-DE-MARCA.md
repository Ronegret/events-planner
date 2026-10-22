# Events Planner · voz de marca y reglas de redacción

Este documento es la referencia para escribir cualquier texto de la aplicación.
Lo siguen las personas y los agentes que tocan copy.

## Quiénes somos

**Events Planner** es una herramienta para planificar bodas y eventos entre un
equipo y las parejas. La línea de marca, tal como aparece en el logotipo, es:

> **Wedding + Events · Ideas · Plan · Grandes momentos**

No hay ninguna otra empresa detrás de este nombre. No hay que usar nombres de otras empresas ni de personas reales en ningún texto.

## Cómo suena

| Sí | No |
|---|---|
| Cálida, clara y práctica. Una persona que sabe del oficio y te lo cuenta fácil. | Corporativa, solemne o de manual de instrucciones. |
| Frases cortas. Un verbo de acción al principio de los botones. | Párrafos largos, subordinadas encadenadas. |
| «Tu equipo», «tu boda», «vuestro gran día». | «El usuario», «la entidad», «el sistema». |
| Dice lo que pasa y lo que viene después. | Esconde el siguiente paso. |
| Español de España, natural. | Anglicismos innecesarios (workspace, dossier, onboarding…). |

**Tratamiento.** Al equipo se le habla de **tú**. A las parejas (portal de
novios) se les habla de **vosotros**, con cercanía.

**Ejemplos de la dirección, no para copiar:**

- Antes: «El sistema con el que la empresa coordina invitados, proveedores,
  timing y el día del evento — en un solo sitio.»
  Ahora: «Invitados, proveedores y el día del evento, en un solo sitio. Ideas,
  plan y grandes momentos.»
- Antes: «Se ha producido un error al guardar.»
  Ahora: «No hemos podido guardar. Tus cambios siguen aquí; inténtalo de nuevo.»
- Antes: «Cada boda, bajo control.»
  Ahora: «Cada boda, paso a paso.»

## Nombres propios y términos

- El producto se llama **Events Planner**. Donde haga falta algo más corto
  (un botón, una cabecera estrecha) se puede usar **EP**, pero nunca como único
  nombre en un texto largo.
- El equipo es **el equipo de Events Planner** o, dentro de la propia app,
  simplemente **el equipo**.
- Se conservan los términos del oficio que usa cualquier planner de bodas:
  **rincones**, **timing**, **seating**, **catering**, **photocall**.
- Cuando haya que referirse a una persona concreta del equipo sin nombre, usa
  «el equipo» o «tu coordinador/a». No hay ninguna persona real detrás: los
  nombres que salen en los datos de ejemplo son inventados.

## Lo que NO se toca nunca (rompe la aplicación)

Cambiar el **texto que ve la persona** es el trabajo. Cambiar cualquiera de estas
cosas, no:

1. Código: lógica, nombres de funciones, variables, imports, exports.
2. Atributos y selectores: `class`, `id`, `data-*`, `name`, `for`, `href`
   internos, `aria-labelledby`/`describedby` (los ids a los que apuntan).
3. Claves de objeto y valores que el código **compara o usa como clave**:
   estados («Pendiente», «Confirmado», «Listo», «En proceso»…), audiencias
   («Equipo», «Novios», «Proveedores»), roles, tipos, nombres de colección.
   Regla práctica: si una cadena aparece dentro de un `===`, `!==`, `includes`,
   `case`, un array de valores permitidos, una clave de objeto o un `data-*`,
   **no se cambia**.
4. Las expresiones `${...}` dentro de plantillas y su estructura HTML.
5. Las secuencias de escape y los acentos: se mantiene la ortografía española
   correcta (tildes, ñ, ¿ ¡).

Solo se reescribe el **texto que se muestra**: contenido de plantillas HTML,
`title`, `placeholder`, `aria-label`, mensajes de aviso (`toast`), textos de
ayuda, párrafos del manual.

## Medida y tono por tipo de pieza

- **Botones y etiquetas:** 1–3 palabras. No más largos que el original +20 %
  (el diseño está ajustado a esa medida).
- **Avisos y errores:** qué ha pasado + qué puede hacer la persona. Sin culpar.
- **Estados vacíos:** invitan a empezar («Aún no hay invitados. Añade el primero
  o importa tu lista.»).
- **Ayuda y manual:** pasos numerados cortos; un solo consejo por paso.
- **Textos legales y de privacidad:** claros y sin adornos. Los de esta versión
  son **de demostración** y así se indica; no son asesoramiento legal.
