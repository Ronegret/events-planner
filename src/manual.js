// ============================================================================
// Manual de Events Planner
// ----------------------------------------------------------------------------
// Una sola base de conocimiento para dos sitios: la pantalla "Guía", que
// se lee como un manual, y el asistente (el botón de los anillos), que la busca.
//
// Están juntos a propósito. Si el manual y el bot tuvieran cada uno su texto,
// en tres meses dirían cosas distintas y el equipo dejaría de fiarse de los
// dos. Aquí se escribe una vez y aparece en los dos sitios.
//
// Cada ficha lleva:
//   id       identificador estable (se usa en enlaces "ver más")
//   area     agrupa el manual en bloques navegables
//   title    cómo se llama la cosa
//   resumen  una frase: qué es y para qué sirve
//   tags     palabras con las que alguien la buscaría, incluidas las que NO
//            usamos en la interfaz (la gente busca "sitting", no "seating")
//   steps    los pasos, en el orden en que se hacen
//   nota     el detalle que solo se aprende equivocándose una vez
//   ir       [vista, etiqueta] para llevar directamente ahí
// ============================================================================

const AREAS = [
  { id: "empezar", label: "Primeros pasos", icon: "◍" },
  { id: "bodas", label: "Bodas", icon: "♡" },
  { id: "personas", label: "Invitados y mesas", icon: "◎" },
  { id: "produccion", label: "Producción", icon: "◇" },
  { id: "dinero", label: "Dinero y contrato", icon: "€" },
  { id: "novios", label: "Portal de novios", icon: "❋" },
  { id: "dia", label: "El día de la boda", icon: "⚡" },
  { id: "salida", label: "Dossier y exportar", icon: "↗" },
  { id: "cuidado", label: "Datos y seguridad", icon: "⚿" },
];

const MANUAL = [
  // ── Para los novios (solo se ven dentro de su portal) ───────────────────
  {
    id: "np-mesas",
    area: "novios-portal",
    paraNovios: true,
    title: "Cómo repartir a los invitados por mesas",
    resumen: "Vosotros decidís quién se sienta dónde, y se puede cambiar cuantas veces haga falta.",
    tags: ["mesa", "mesas", "sitting", "seating", "sentar", "reparto", "quien se sienta", "distribucion", "plano", "salon", "pulsar mesa", "cambiar sitio", "mover", "arrastrar", "colocar", "tamaño", "grande", "presidencial", "zoom", "quitar de la mesa", "quien esta"],
    steps: [
      "Entrad en la pestaña <b>Mesas</b>.",
      "Pulsad <b>Nueva mesa</b> y ponedle nombre. Vale «Mesa 1», pero también «Amigos de la uni» o «Los primos» — como os resulte más fácil acordaros.",
      "Decid cuánta gente cabe. Si no lo sabéis seguro, poned una aproximación.",
      "<b>Arrastrad las mesas</b> por el plano con el ratón o con el dedo hasta colocarlas como estarán en el salón de verdad.",
      "<b>Pulsad una mesa</b>: al lado se abre su ficha con quién se sienta ahí. Desde ahí sacáis a alguien con la ✕ o sentáis a los que aún no tienen sitio.",
      "En esa misma ficha podéis cambiar el <b>tamaño</b> con el que se dibuja: una presidencial no es como una de seis. Eso no cambia cuánta gente cabe, solo cómo se ve.",
      "Con <b>+ Más espacio</b> y el zoom podéis separar las mesas si se os quedan apretadas.",
      "Si preferís ir uno a uno, más abajo está la lista completa con un desplegable por persona. Las dos formas hacen lo mismo.",
    ],
    nota: "No hay forma de romper nada. Podéis cambiarlo tantas veces como queráis hasta la semana de la boda, y el equipo ve cada cambio al momento.",
  },
  {
    id: "np-invitados",
    area: "novios-portal",
    paraNovios: true,
    title: "Actualizar la lista de invitados",
    resumen: "Quién viene, qué come y si tiene alguna alergia.",
    tags: ["invitados", "lista", "confirmar", "rsvp", "menu", "alergia", "viene", "no viene", "acompañante"],
    steps: [
      "Pestaña <b>Invitados</b>.",
      "Cambiad lo que necesitéis: confirmación, menú, alergias.",
      "Al terminar, pulsad <b>Guardar cambios</b>. El equipo lo ve al momento.",
    ],
    nota: "Las alergias son importantes de verdad: es lo que se pasa al catering. Si dudáis, preguntad a esa persona antes de apuntar nada.",
  },
  {
    id: "np-contrato",
    area: "novios-portal",
    paraNovios: true,
    title: "Firmar el contrato",
    resumen: "Se firma en el móvil o se imprime, se firma a mano y se sube.",
    tags: ["contrato", "firmar", "firma", "documento", "subir", "papel"],
    steps: [
      "La pestaña <b>Contrato</b> aparece cuando el equipo lo tiene listo. Antes de eso no existe.",
      "Leedlo con calma. Si algo no os cuadra, preguntad antes de firmar.",
      "Podéis firmar con el dedo en el recuadro y pulsar <b>Firmar contrato</b>.",
      "O imprimirlo, firmarlo a mano, hacerle una foto y subirlo con <b>Subir documento firmado</b>.",
    ],
    nota: "No hace falta mandar nada por correo ni por WhatsApp: todo se queda aquí, y dentro de un año seguirá en el mismo sitio.",
  },
  {
    id: "np-pagos",
    area: "novios-portal",
    paraNovios: true,
    title: "Subir un justificante de pago",
    resumen: "Los plazos y los comprobantes están en la pestaña Presupuesto.",
    tags: ["pago", "pagos", "transferencia", "justificante", "comprobante", "recibo", "plazo", "señal", "pagar"],
    steps: [
      "Pestaña <b>Presupuesto</b>.",
      "Ahí veis los plazos acordados y cuáles están al día.",
      "El equipo adjunta a cada plazo la captura o el PDF del banco para que quede todo reunido.",
    ],
    nota: "El botón «Subir comprobante» está siempre arriba; los archivos que ya habéis enviado aparecen al final.",
  },
  {
    id: "np-rincones",
    area: "novios-portal",
    paraNovios: true,
    title: "Pedir un rincón decorado",
    resumen: "Si algo os gusta, lo decís y el equipo os cuenta los detalles.",
    tags: ["rincon", "rincones", "decoracion", "candy bar", "photocall", "me interesa", "pedir", "quiero"],
    steps: [
      "Pestaña <b>Rincones</b>: ahí están los espacios decorados que se pueden preparar.",
      "Si alguno os gusta, pulsad <b>Me interesa</b>.",
      "El equipo recibe la petición y os cuenta precio y detalles.",
    ],
    nota: "Pedir información no compromete a nada.",
  },
  {
    id: "np-dudas",
    area: "novios-portal",
    paraNovios: true,
    title: "Una duda que no encontráis aquí",
    resumen: "Escribid al equipo. Preguntar nunca molesta.",
    tags: ["duda", "ayuda", "pregunta", "no entiendo", "contactar", "hablar", "whatsapp", "llamar", "problema"],
    steps: [
      "En cada pestaña hay un <b>?</b> arriba que explica esa sección.",
      "Si aun así no lo veis claro, escribid al equipo por WhatsApp al (+34) 653 567 610.",
      "O al correo rodrigo.negrete.aros@gmail.com.",
    ],
    nota: "En serio: para eso estamos. Mejor una pregunta hoy que un malentendido la semana de la boda.",
  },
  {
    id: "np-presupuesto",
    area: "novios-portal",
    paraNovios: true,
    title: "Ver el presupuesto de vuestra boda",
    resumen: "Las mismas cifras que lleva el equipo. No hay dos cuentas.",
    tags: ["presupuesto", "dinero", "coste", "precio", "cuanto", "pagos", "pagar", "gasto", "cuentas", "factura"],
    steps: [
      "Pestaña <b>Presupuesto</b>.",
      "Cada partida —el catering, las flores, la finca— se paga en tres veces: reserva, segundo pago y restante.",
      "De cada pago veis el importe, cuándo vence y si está pagado.",
      "En vuestro resumen tenéis el total y qué queda por pagar.",
    ],
    nota: "El presupuesto lo lleva el equipo: aquí lo veis, pero no hace falta que toquéis nada. Si algo no os cuadra, decídnoslo.",
  },
  {
    id: "np-proveedores",
    area: "novios-portal",
    paraNovios: true,
    title: "Decidir sobre los proveedores que os proponemos",
    resumen: "Miradlos y decidnos cuáles os gustan. Un «este no» a tiempo vale tanto como un sí.",
    tags: ["proveedor", "proveedores", "elegir", "aceptar", "descartar", "validar", "fotografo", "catering", "floristeria", "nos gusta"],
    steps: [
      "Pestaña <b>Proveedores</b>.",
      "De cada uno tenéis su web, su Instagram y, si ya nos lo ha mandado, su presupuesto.",
      "Pulsad <b>Nos gusta</b> si os convence, o <b>Este no</b> si preferís buscar otra opción.",
      "Podéis cambiar de opinión: pulsando otra vez vuelve a quedar pendiente.",
    ],
    nota: "Decir que no cuanto antes nos ahorra semanas. Nadie se ofende, al revés: para eso os los enseñamos.",
  },
  {
    id: "np-plan",
    area: "novios-portal",
    paraNovios: true,
    title: "Qué queda por hacer y las próximas citas",
    resumen: "Lo vuestro, lo del equipo y el orden del día.",
    tags: ["plan", "tareas", "pendiente", "reunion", "cita", "calendario", "que falta", "timeline", "orden del dia", "horario"],
    steps: [
      "Pestaña <b>Plan</b>.",
      "Arriba están las próximas citas con el equipo, con un botón para añadirlas a vuestro calendario.",
      "Después, lo que queda de vuestra parte, separado de lo que lleva el equipo.",
      "Y abajo, el orden del día de la boda hora a hora.",
    ],
    nota: "Si algo de «lo vuestro» no lo veis claro, preguntad. Mejor una pregunta hoy que un malentendido la semana de la boda.",
  },
  // ── Primeros pasos ──────────────────────────────────────────────────────
  {
    id: "que-es",
    area: "empezar",
    title: "Qué es Events Planner y cómo se organiza",
    resumen: "Aquí vive toda la información de cada boda, en lugar de repartirse entre el móvil, el correo y una libreta.",
    tags: ["events planner", "guia", "que es", "para que sirve", "empezar", "introduccion", "como funciona", "primera vez", "ayuda", "manual", "aprender"],
    steps: [
      "A la izquierda está el menú principal: <b>Inicio</b> con el resumen de todo, <b>Bodas</b> con cada pareja, y las bases compartidas (Equipo, Proveedores, Rincones, Documentos).",
      "Dentro de una boda hay seis áreas: Resumen, Planificación, Personas, Producción, Gestión y Cierre. Cada área agrupa sus pestañas.",
      "Todo lo que se toca se guarda solo. No hay que buscar un botón de guardar.",
      "Cada cambio queda registrado en <b>Actividad</b>, con quién lo hizo y cuándo.",
    ],
    nota: "Si te pierdes, el botón de los anillos, abajo a la derecha, te trae aquí desde cualquier pantalla.",
    ir: ["dashboard", "Ir a Inicio"],
  },
  {
    id: "entrar",
    area: "empezar",
    title: "Entrar y cambiar la contraseña",
    resumen: "Cada persona del equipo tiene su usuario, y por eso la actividad sabe quién hizo cada cosa.",
    tags: ["entrar", "acceso", "login", "contraseña", "clave", "password", "usuario", "no puedo entrar", "olvide"],
    steps: [
      "Se entra con tu nombre de usuario, no con el correo. Si no lo tienes, pídeselo a quien administra el equipo.",
      "Para cambiar una contraseña: <b>Equipo</b> → Editar en la ficha → campo Contraseña.",
      "Si el navegador rellena solo los campos, haz clic en cada uno antes de entrar: por seguridad Chrome no deja leer una contraseña autorrellenada hasta que tocas el campo.",
      "Las contraseñas se guardan cifradas. Ni siquiera desde dentro se pueden leer, solo cambiar.",
    ],
    nota: "Si alguien deja el equipo, bórrale el usuario el mismo día. Es lo único que le corta el acceso.",
    ir: ["team", "Ir a Equipo"],
  },
  {
    id: "equipo-telefonos",
    area: "empezar",
    title: "Llamar o escribir a alguien del equipo",
    resumen: "Cada ficha del equipo tiene el móvil con botón de WhatsApp y de llamada.",
    tags: ["telefono", "movil", "whatsapp", "wasap", "wsp", "llamar", "contactar", "equipo", "numero", "escribir"],
    steps: [
      "Entra en <b>Equipo</b>. Cada ficha muestra el móvil de esa persona.",
      "El botón verde <b>WhatsApp</b> abre la conversación con un saludo ya escrito.",
      "El botón <b>Llamar</b> marca directamente desde el móvil o la tablet.",
      "Para añadir o cambiar un número: Editar en la ficha → campo Teléfono móvil.",
    ],
    nota: "Vale cualquier formato: 600000900, +34 600 000 900 o 0034600000900 acaban en el mismo enlace.",
    ir: ["team", "Ir a Equipo"],
  },

  // ── Bodas ───────────────────────────────────────────────────────────────
  {
    id: "crear-boda",
    area: "bodas",
    title: "Dar de alta una boda nueva",
    resumen: "El alta abre su propia pantalla y al guardar te pregunta si quieres entrar ya en la boda.",
    tags: ["crear", "nueva boda", "alta", "pareja", "nuevos novios", "añadir boda", "empezar boda", "registrar"],
    steps: [
      "<b>Bodas</b> → botón <b>Nueva boda</b> arriba a la derecha.",
      "Rellena los datos base: pareja, fecha, lugares, responsable y paleta de color. Solo el nombre es obligatorio.",
      "Abajo puedes ir añadiendo los servicios contratados y los rincones desde los desplegables.",
      "Al guardar te pregunta si abrir la boda o seguir en el listado — útil si estás dando de alta varias seguidas.",
      "Ahí se muestra <b>una única vez</b> la contraseña del portal de los novios. Anótala en ese momento.",
    ],
    nota: "La contraseña del portal solo se guarda cifrada. Si se pierde, hay que generar otra desde Editar boda.",
    ir: ["weddings", "Ir a Bodas"],
  },
  {
    id: "duplicar-boda",
    area: "bodas",
    title: "Duplicar una boda como plantilla",
    resumen: "Copia el timeline, las tareas y los servicios de otra boda, sin llevarse nada de la otra pareja.",
    tags: ["duplicar", "copiar", "plantilla", "template", "repetir", "clonar", "reutilizar", "igual que"],
    steps: [
      "En <b>Bodas</b>, en la tarjeta de la boda que quieres usar de base, pulsa <b>⧉ Duplicar</b>.",
      "Escribe el nombre de la nueva pareja y la fecha.",
      "Elige si copiar también los rincones.",
      "Se copian timeline, tareas, servicios y fotos, todo en estado pendiente y sin precios.",
    ],
    nota: "Nunca se copian invitados, mesas, presupuesto, pagos, contrato ni la contraseña del portal: son de esa pareja y de nadie más.",
    ir: ["weddings", "Ir a Bodas"],
  },
  {
    id: "orden-bodas",
    area: "bodas",
    title: "En qué orden salen las bodas",
    resumen: "Primero las que vienen, de la más próxima a la más lejana. Las celebradas, al final.",
    tags: ["orden", "ordenar", "listado", "primero", "celebradas", "pasadas", "no encuentro", "buscar boda", "filtrar"],
    steps: [
      "Las bodas pendientes salen primero, empezando por la más cercana en el calendario.",
      "Las ya celebradas van al final, de la más reciente hacia atrás.",
      "Arriba tienes buscador por pareja, lugar o responsable, y filtro por estado.",
    ],
    ir: ["weddings", "Ir a Bodas"],
  },
  {
    id: "tareas",
    area: "bodas",
    title: "Tareas de una boda",
    resumen: "Cada pendiente con responsable, fecha y estado. Lo que no está aquí, se olvida.",
    tags: ["tarea", "tareas", "pendiente", "todo", "checklist", "recordatorio", "asignar", "responsable", "fecha limite"],
    steps: [
      "Dentro de la boda: <b>Planificación → Tareas</b>.",
      "<b>+ Nueva tarea</b>, con responsable y fecha límite.",
      "Se cambia de estado pulsando la pastilla de la derecha: Pendiente → En tramitación → Listo.",
      "Las tareas que vencen esta semana salen en Inicio, en «Tareas de hoy».",
    ],
    nota: "Una tarea sin fecha no aparece en ningún aviso. Si importa, ponle fecha.",
    ir: ["weddings", "Abrir una boda"],
  },
  {
    id: "timeline",
    area: "bodas",
    title: "Timeline del día",
    resumen: "El minuto a minuto de la boda, con responsable en cada paso.",
    tags: ["timeline", "timing", "horario", "cronograma", "minutado", "hora", "orden del dia", "programa"],
    steps: [
      "<b>Planificación → Timeline</b>.",
      "Cada paso lleva hora, título, responsable y categoría.",
      "Se ordena solo por hora, así que puedes meterlos en cualquier orden.",
      "Este es el timeline que sale en el dossier de proveedores.",
    ],
    nota: "Incluye la llegada del equipo y del montaje, no solo la ceremonia. Es lo que más se olvida y lo que más se pregunta.",
    ir: ["weddings", "Abrir una boda"],
  },

  {
    id: "agenda",
    area: "bodas",
    title: "Agenda de reuniones",
    resumen: "Todas las reuniones de todas las bodas, y lo que se acordó en cada una.",
    tags: ["agenda", "calendario", "reunion", "reuniones", "cita", "seguimiento", "quedar", "google calendar", "ics", "outlook", "acuerdos"],
    steps: [
      "<b>Agenda</b> en el menú de la izquierda muestra las reuniones de todas las bodas, agrupadas por mes.",
      "Dentro de una boda: <b>Planificación → Calendario</b>, solo las suyas.",
      "Al crear una reunión, marca <b>¿Vienen los novios?</b> para que la vean en su portal.",
      "El botón <b>G</b> la añade a Google Calendar; el <b>↓</b> descarga un .ics para Outlook o Apple; el <b>✆</b> abre un WhatsApp con el recordatorio ya escrito.",
      "Cuando la reunión pase, pulsa <b>✎ Acuerdos</b> y anota lo que se decidió.",
    ],
    nota: "Los acuerdos son la mitad que se pierde si solo se agenda la reunión. Dentro de tres meses nadie recordará si el ramo era de peonías o de ranúnculos.",
    ir: ["agenda", "Ir a la Agenda"],
  },
  {
    id: "presupuesto-pagos",
    area: "dinero",
    title: "Los tres pagos de cada partida",
    resumen: "Reserva, segundo pago y restante — que es como se paga de verdad en este sector.",
    tags: ["pago", "pagos", "reserva", "señal", "plazo", "segundo pago", "restante", "justificante", "vencimiento", "iva", "a y b", "traza"],
    steps: [
      "Cada partida del presupuesto tiene sus tres pagos, uno al lado del otro.",
      "Pulsa <b>✎</b> en el pago que quieras rellenar.",
      "En <b>Importe A</b> pon lo que va facturado, y di si esa cifra ya lleva el IVA o es la base: la app calcula lo que falte.",
      "En <b>Importe B</b> lo que son suplidos o pagos directos al proveedor.",
      "Pon la fecha de vencimiento y, cuando pagues, adjunta el justificante.",
      "El botón <b>✓ Pagado</b> lo marca de un toque.",
    ],
    nota: "Cada cambio deja constancia de quién y cuándo. Cuando dos personas llevan la misma boda, «¿esto lo marcaste tú?» es una pregunta que se hace mucho.",
    ir: ["weddings", "Abrir una boda"],
  },
  {
    id: "proveedores-validacion",
    area: "produccion",
    title: "Proponer proveedores a la pareja",
    resumen: "Se eligen de tu base y la pareja los acepta o los descarta desde su portal.",
    tags: ["proveedor", "proponer", "validar", "aceptar", "descartar", "base", "elegir", "presupuesto proveedor"],
    steps: [
      "Boda → <b>Producción → Proveedores</b>.",
      "En el desplegable eliges de tu base: se copia su ficha entera, así la pareja ve su web, su Instagram y su teléfono sin que teclees nada.",
      "Adjunta su presupuesto con <b>＋ Presupuesto</b>: importe, qué incluye y el PDF que te mandó.",
      "La pareja lo ve en su portal y decide. Tú también puedes aceptarlo o descartarlo desde aquí.",
      "Los aceptados son los que luego asignas a las partidas del presupuesto.",
    ],
    nota: "En la base general no hay que confirmar nada: es un fichero de empresas, no una decisión. La validación solo existe dentro de una boda.",
    ir: ["providers", "Ir a Proveedores"],
  },
  // ── Invitados y mesas ───────────────────────────────────────────────────
  {
    id: "invitados",
    area: "personas",
    title: "Invitados, confirmaciones y menús",
    resumen: "La lista de quién viene, qué come y qué no puede comer.",
    tags: ["invitado", "invitados", "lista", "rsvp", "confirmacion", "confirmados", "menu", "asistentes", "cuantos vienen"],
    steps: [
      "<b>Personas → Invitados</b>.",
      "Cada invitado tiene grupo, confirmación, menú, acompañante y mesa.",
      "Arriba hay buscador y filtros por grupo, confirmación y menú.",
      "El contador de confirmados se actualiza solo y es el que ve el catering.",
    ],
    ir: ["weddings", "Abrir una boda"],
  },
  {
    id: "alergias",
    area: "personas",
    title: "Alergias y consentimiento",
    resumen: "Una alergia es un dato de salud y necesita el permiso del propio invitado, no el de la pareja.",
    tags: ["alergia", "alergias", "intolerancia", "celiaco", "gluten", "salud", "consentimiento", "rgpd", "permiso", "dieta"],
    steps: [
      "Se anota en la ficha del invitado, campo <b>Alergias o restricciones</b>.",
      "Justo debajo, marca cómo dio el permiso: por escrito, verbalmente, o si se ha opuesto.",
      "En <b>Personas → Mesas</b> aparece un aviso con las alergias que aún no tienen permiso registrado.",
      "Quien se opone deja de aparecer con su alergia en el dossier y en las hojas de cocina.",
    ],
    nota: "El aviso no bloquea nada: si un invitado llama la víspera diciendo que es celíaco, apúntalo y ya regularizarás el permiso.",
    ir: ["weddings", "Abrir una boda"],
  },
  {
    id: "mesas",
    area: "personas",
    title: "Plano de mesas y seating",
    resumen: "El plano se arrastra con el ratón, tiene zoom y se puede ampliar si hay muchas mesas.",
    tags: ["mesa", "mesas", "seating", "sitting", "plano", "distribucion", "sentar", "sitio", "banquete", "colocar"],
    steps: [
      "<b>Personas → Mesas</b>.",
      "<b>+ Nueva mesa</b> con nombre y capacidad.",
      "Arrastra las mesas por el plano para colocarlas como en la sala real.",
      "Los controles de zoom y <b>+ Espacio</b> sirven cuando hay muchas mesas y se quedan apretadas.",
      "Cada invitado se asigna a su mesa desde su ficha, o con el asignado automático.",
    ],
    nota: "El plano que ves es el mismo que sale impreso en el dossier y el que ven los novios en su portal.",
    ir: ["weddings", "Abrir una boda"],
  },

  // ── Producción ──────────────────────────────────────────────────────────
  {
    id: "rincones",
    area: "produccion",
    title: "Rincones decorados",
    resumen: "Los espacios decorados que se preparan para cada boda: bienvenida, candy bar, photocall, seating…",
    tags: ["rincon", "rincones", "decoracion", "decorado", "photocall", "espacios", "catalogo rincones", "crear rincon"],
    steps: [
      "Hay un catálogo general en <b>Rincones</b> (menú izquierdo) y los rincones concretos de cada boda en <b>Producción → Rincones</b>.",
      "Desde la boda puedes añadir uno del catálogo o crear uno a medida.",
      "Cada rincón admite varias fotos y una descripción que ven los novios en su portal.",
      "Los novios pueden pedir un rincón desde su portal, y el equipo lo aprueba o lo descarta.",
    ],
    ir: ["rincones", "Ver el catálogo"],
  },
  {
    id: "tareas-rincon",
    area: "produccion",
    title: "Tareas de preparación de un rincón",
    resumen: "Cada rincón puede llevar su lista de lo que hay que comprar, alquilar o montar, con todo el detalle y una foto.",
    tags: [
      "tarea rincon", "tareas rincon", "preparacion", "preparar", "comprar", "compra", "chuches", "candy",
      "materiales", "montaje", "encargar", "pedir", "alquilar", "detalle", "detallado", "foto referencia",
      "que necesito", "que hace falta", "lista compra", "espejo", "carteles", "cartel", "tela", "neon",
      "apuntar", "anotar", "recordar", "pendiente montaje",
    ],
    steps: [
      "Abre la boda → <b>Producción → Rincones</b>.",
      "En el rincón que quieras, pulsa <b>+ Tarea</b>.",
      "En <b>Qué hace falta exactamente</b> escribe con todo el detalle: marcas, colores, medidas, dónde se compra y qué NO vale.",
      "Puedes añadir cantidad o medidas, responsable, fecha y una foto de cómo tiene que quedar.",
      "Se marca el avance pulsando la pastilla: Pendiente → Pedido / en camino → Listo.",
    ],
    nota: "Es opcional: un rincón puede no tener ninguna tarea. Pero quien va a comprar puede no ser quien lo apuntó — «4 kg surtido sin gelatina de cerdo, en el súper del pueblo» sirve; «comprar chuches» no.",
    ir: ["weddings", "Abrir una boda"],
  },
  {
    id: "proveedores",
    area: "produccion",
    title: "Proveedores",
    resumen: "La base de con quién se trabaja, reutilizable entre bodas.",
    tags: ["proveedor", "proveedores", "contacto", "floristeria", "catering", "fotografo", "dj", "empresa", "telefono proveedor"],
    steps: [
      "<b>Proveedores</b> en el menú izquierdo tiene la base completa, con buscador y filtro por categoría.",
      "Dentro de una boda, <b>Producción → Proveedores</b> muestra los de esa boda.",
      "Se puede añadir uno ya existente de la base o crear uno nuevo.",
      "Cada ficha guarda teléfono, email, Instagram, estado y notas.",
    ],
    ir: ["providers", "Ir a Proveedores"],
  },
  {
    id: "buscador-proveedores",
    area: "produccion",
    title: "Buscar proveedores nuevos en la web",
    resumen: "Encuentra empresas que todavía no tienes, con su dirección y su valoración, sin salir de la aplicación.",
    tags: [
      "buscar proveedor", "proveedor nuevo", "encontrar", "buscador", "google", "valoracion",
      "valoraciones", "resenas", "reseñas", "estrellas", "nota", "opiniones", "direccion",
      "donde esta", "telefono", "maps", "no lo tengo", "gente nueva", "alternativa",
    ],
    steps: [
      "Ve a <b>Proveedores</b> en el menú, o a <b>Producción → Proveedores</b> dentro de una boda.",
      "Arriba del todo está <b>Proveedores en la web</b>. Elige categoría y zona, o escribe con tus palabras: «photobooth vintage», «catering vegano Girona».",
      "Pulsa <b>Buscar</b>. Cada resultado trae dirección, teléfono, web, la nota media que tiene en Google y cuántas reseñas la sostienen.",
      "Ordena por <b>Mejor valorados</b> o por <b>Más reseñas</b> según lo que te interese comparar.",
      "Desde la base, <b>Añadir a mi base</b> crea la ficha. Desde una boda, <b>Proponer a esta boda</b> la crea y además se la enseña a la pareja en su portal.",
      "Los que ya tienes salen marcados como <b>Ya está en tu base</b>: no se duplica nada.",
    ],
    nota: "Una nota alta con pocas reseñas dice poco: un 4,9 con seis opiniones es más frágil que un 4,6 con trescientas. Y ojo con los marcados como cerrados — Google tarda en enterarse, pero cuando lo dice suele tener razón.",
    ir: ["providers", "Ir a Proveedores"],
  },
  {
    id: "fotos",
    area: "produccion",
    title: "Lista de fotos imprescindibles",
    resumen: "Lo que no puede faltar en el reportaje, por momentos.",
    tags: ["fotos", "shotlist", "fotografo", "reportaje", "imprescindibles", "momentos", "imagenes"],
    steps: [
      "<b>Producción → Fotos</b>.",
      "Cada línea lleva momento, qué se fotografía, quién sale y responsable.",
      "Va en el dossier del fotógrafo.",
    ],
    ir: ["weddings", "Abrir una boda"],
  },

  // ── Dinero y contrato ───────────────────────────────────────────────────
  {
    id: "presupuesto",
    area: "dinero",
    title: "Presupuesto con importes A y B",
    resumen: "A es lo facturado (base + IVA) y B lo no facturado. El coste real es la suma, no una cifra a ojo.",
    tags: ["presupuesto", "dinero", "coste", "gasto", "importe", "iva", "factura", "cuentas", "cuanto cuesta", "objetivo", "a y b"],
    steps: [
      "Abre la boda → <b>Gestión → Presupuesto</b>.",
      "<b>+ Partida</b> por cada concepto: finca, catering, flores…",
      "En <b>Importe A</b> pon la base facturada SIN IVA, y al lado el porcentaje (21 % general, 10 % en algunos servicios de hostelería).",
      "En <b>Importe B</b> lo que son suplidos o pagos directos al proveedor, que no lleva IVA.",
      "Con <b>◎ Objetivo</b> fijas la cifra que la pareja no quiere superar y la app avisa si se pasa.",
      "Marca cada partida como pagada con el botón ✓.",
    ],
    nota: "Si el fotógrafo cobra 1.200 € + IVA y el DJ 400 € de suplidos pagados directamente, eso no son 1.600 €: son 1.852 €. Mezclarlo en un solo campo es lo que hace que a mitad de año no cuadre nada.",
    ir: ["weddings", "Abrir una boda"],
  },
  {
    id: "vencimientos",
    area: "dinero",
    title: "Pagos vencidos y próximos",
    resumen: "La app avisa antes de que se pase una fecha de pago, no después.",
    tags: ["vencimiento", "vencido", "pago", "pagar", "plazo", "fecha limite", "deuda", "pendiente de pago", "aviso"],
    steps: [
      "Cada partida de presupuesto puede llevar <b>fecha límite de pago</b>.",
      "Las que ya han vencido salen marcadas en rojo en la tabla.",
      "Arriba aparece un aviso con las que vencen en los próximos 15 días.",
      "En <b>Gestión → Presupuesto</b> aparecen los tres vencimientos y sus justificantes.",
    ],
    ir: ["weddings", "Abrir una boda"],
  },
  {
    id: "servicios",
    area: "dinero",
    title: "Servicios contratados",
    resumen: "Lo que la pareja te ha contratado y lo que paga por ello. Nada más.",
    tags: ["servicio", "servicios", "contratado", "pvp", "precio", "paquete", "integral", "wedding day", "destination", "decoracion", "asesoramiento", "que cobramos"],
    steps: [
      "Boda → <b>Gestión → Servicios</b>.",
      "<b>+ Añadir servicio</b> y elige del catálogo: organización integral, Wedding Day, destination, decoración personalizada o asesoramiento.",
      "Pon el precio que paga esa pareja y concreta qué incluye.",
      "El total de abajo es lo que se factura a la pareja, y es el importe que sale en el contrato.",
    ],
    nota: "Aquí solo va producto. El trabajo interno —cerrar proveedores, montar el timeline, revisar alergias— son tareas, y viven en Planificación → Tareas.",
    ir: ["weddings", "Abrir una boda"],
  },
  {
    id: "contrato",
    area: "dinero",
    title: "Generar y firmar el contrato",
    resumen: "El contrato de la boda, con sus cláusulas y su diseño.",
    tags: ["contrato", "firmar", "firma", "clausulas", "documento", "legal", "generar contrato", "pdf contrato", "imprimir contrato"],
    steps: [
      "Abre la boda → <b>Gestión → Contrato</b>.",
      "<b>✎ Datos</b>: rellena nombres, DNI, teléfonos, emails, domicilio e importe. Sin los obligatorios no deja generar.",
      "<b>Generar contrato</b>: a partir de ese momento los novios lo ven en su portal.",
      "Los novios lo firman en pantalla o lo imprimen, lo firman a mano y lo suben al portal.",
      "<b>↓ PDF</b> imprime el documento con su diseño.",
    ],
    nota: "Nada del contrato sale por correo. Los novios lo suben a su portal y el equipo lo descarga del mismo sitio, así siempre está en un único lugar.",
    ir: ["weddings", "Abrir una boda"],
  },
  {
    id: "anexo",
    area: "dinero",
    title: "Añadir servicios después de firmar",
    resumen: "No se toca el contrato firmado: se crea un anexo con los puntos nuevos.",
    tags: ["anexo", "añadir servicio", "ampliar", "modificar contrato", "extra", "despues de firmar", "cambio"],
    steps: [
      "Crea primero el servicio nuevo en <b>Gestión → Servicios</b>.",
      "Vuelve a <b>Contrato</b> y pulsa <b>+ Anexo</b>.",
      "Marca con casillas los servicios que entran en el anexo.",
      "El anexo queda dentro del mismo documento, detrás de las cláusulas.",
    ],
    nota: "Solo se ofrecen los servicios que NO estaban ya en el contrato ni en anexos anteriores.",
    ir: ["weddings", "Abrir una boda"],
  },

  // ── Portal de novios ────────────────────────────────────────────────────
  {
    id: "portal",
    area: "novios",
    title: "El portal de los novios",
    resumen: "Lo que ve la pareja: su boda, sus invitados, su plano, su contrato.",
    tags: ["portal", "novios", "pareja", "clientes", "acceso novios", "que ven", "compartir", "contraseña portal"],
    steps: [
      "Desde la ficha de la boda o desde <b>Portal de novios</b> en el menú.",
      "El equipo entra con su usuario; los novios necesitan la clave de su portal.",
      "El portal tiene pestañas para el resumen, invitados, mesas, rincones, contrato, presupuesto, proveedores, plan y detalles.",
      "El botón <b>Volver</b> devuelve al equipo a la app normal.",
      "En cada pestaña hay un <b>?</b> que explica esa sección con palabras normales.",
    ],
    nota: "Los novios ven el presupuesto compartido y sus plazos, pero no las notas internas ni los precios de los rincones.",
    ir: ["portal", "Abrir el portal"],
  },
  {
    id: "peticion-rincon",
    area: "novios",
    title: "Cuando los novios piden un rincón",
    resumen: "La petición llega al equipo, que la aprueba o la descarta con un motivo.",
    tags: ["peticion", "solicitud", "me interesa", "rincon novios", "aprobar", "rechazar", "piden"],
    steps: [
      "Los novios pulsan <b>Me interesa</b> en un rincón de su portal.",
      "La petición aparece en <b>Producción → Rincones</b> de esa boda.",
      "Al aprobarla, el rincón se añade a la boda automáticamente.",
      "Si se descarta, se escribe un motivo que los novios ven en su portal.",
    ],
    ir: ["weddings", "Abrir una boda"],
  },

  // ── El día de la boda ───────────────────────────────────────────────────
  {
    id: "wedding-day",
    area: "dia",
    title: "Wedding Day",
    resumen: "La pantalla del día: una lista vertical que se va marcando conforme pasa todo.",
    tags: ["wedding day", "dia de la boda", "el dia", "ejecutar", "check", "marcar", "en directo", "control"],
    steps: [
      "Desde la tarjeta de la boda, botón <b>⚡ Wedding Day</b>.",
      "Cada punto se marca al completarse y queda registrado quién lo confirmó.",
      "Está pensado para el móvil: los botones son grandes a propósito.",
    ],
    ir: ["weddings", "Ir a Bodas"],
  },
  {
    id: "sin-cobertura",
    area: "dia",
    title: "Trabajar sin cobertura",
    resumen: "La app funciona en una finca sin 4G. Lo que apuntes no se pierde.",
    tags: ["offline", "sin internet", "sin cobertura", "sin conexion", "4g", "wifi", "se pierde", "no carga", "finca"],
    steps: [
      "Abre la app <b>al menos una vez con internet</b> en el dispositivo que vayas a usar. Con eso se guarda sola.",
      "Si se cae la conexión, arriba aparece <b>Sin conexión · se guarda en este dispositivo</b>.",
      "Sigue trabajando con normalidad: todo se guarda en el móvil.",
      "Cuando vuelve la señal, se sincroniza solo y el aviso desaparece.",
    ],
    nota: "El aviso también dice cuántos cambios quedan por subir, para que sepas que no se ha perdido nada.",
  },
  {
    id: "incidencias",
    area: "dia",
    title: "Incidencias",
    resumen: "Lo que se tuerce, anotado con su solución, para que no se repita.",
    tags: ["incidencia", "problema", "error", "fallo", "imprevisto", "plan b", "se ha roto"],
    steps: [
      "<b>Gestión → Incidencias</b> dentro de la boda.",
      "Cada una con prioridad, responsable y la solución que se dio.",
      "Sirve de memoria para las siguientes bodas en el mismo espacio.",
    ],
    ir: ["weddings", "Abrir una boda"],
  },

  // ── Dossieres ───────────────────────────────────────────────────────────
  {
    id: "dossier",
    area: "salida",
    title: "Generar el dossier",
    resumen: "Un documento distinto para el equipo, los novios o cada proveedor.",
    tags: ["dossier", "exportar", "pdf", "imprimir", "word", "documento", "entregar", "compartir", "informe"],
    steps: [
      "Abre la boda → <b>Cierre → Exportar</b>.",
      "Elige para quién es: Equipo, Novios o Proveedores.",
      "Marca solo las secciones que necesita esa persona.",
      "<b>PDF</b> abre la vista de impresión; <b>Word</b> descarga un documento editable.",
    ],
    nota: "El dossier de proveedores oculta las alergias y los datos que no les corresponden. No es lo mismo lo que ve el catering que lo que ve el DJ.",
    ir: ["weddings", "Abrir una boda"],
  },

  // ── Datos y seguridad ───────────────────────────────────────────────────
  {
    id: "deshacer",
    area: "cuidado",
    title: "He borrado algo sin querer",
    resumen: "Tienes unos segundos para recuperarlo con el botón Deshacer.",
    tags: ["borrar", "borre", "eliminar", "deshacer", "recuperar", "sin querer", "error", "he perdido", "restaurar"],
    steps: [
      "Justo después de borrar aparece abajo un aviso con el botón <b>Deshacer</b> y una barra de tiempo.",
      "Pulsa Deshacer y vuelve a su sitio exacto en la lista.",
      "Si ya se cerró el aviso: <b>Ajustes → Restaurar copia</b>, si tienes una copia de seguridad.",
    ],
    nota: "Al borrar un rincón se van sus tareas, y al deshacer vuelven con él.",
  },
  {
    id: "copia",
    area: "cuidado",
    title: "Copia de seguridad",
    resumen: "Un archivo con todo, que guardas donde quieras.",
    tags: ["copia", "backup", "seguridad", "guardar", "respaldo", "exportar todo", "restaurar", "perder datos"],
    steps: [
      "<b>Ajustes → Descargar copia</b> baja un único archivo con toda la información.",
      "Guárdalo fuera del ordenador: en Drive, un disco externo o el correo.",
      "Para volver atrás: <b>Ajustes → Restaurar copia</b>.",
      "Antes de restaurar se descarga automáticamente el estado actual, por si te equivocas de archivo.",
    ],
    nota: "Hazlo una vez al mes y siempre la semana antes de una boda grande. La copia no incluye contraseñas.",
    ir: ["settings", "Ir a Ajustes"],
  },
  {
    id: "datos-novios",
    area: "cuidado",
    title: "Qué derechos tienen los novios sobre sus datos",
    resumen: "Pueden descargarse todo lo suyo cuando quieran, desde su propio portal.",
    tags: ["rgpd", "datos", "privacidad", "derechos", "portabilidad", "borrar datos", "lopd", "proteccion de datos", "descargar datos"],
    steps: [
      "En el portal, pestaña <b>Detalles</b>, hay un bloque <b>Vuestros datos</b>.",
      "El botón descarga una copia completa y legible de todo lo de su boda.",
      "Para rectificar o suprimir, escriben a rodrigo.negrete.aros@gmail.com.",
      "El responsable figura en Ajustes, en Protección de datos.",
    ],
    nota: "En Ajustes está el registro de actividades de tratamiento, que es lo que hay que enseñar si la AEPD pregunta.",
    ir: ["settings", "Ir a Ajustes"],
  },
  {
    id: "no-se-ve",
    area: "cuidado",
    title: "No veo los últimos cambios",
    resumen: "Casi siempre es el navegador, que se ha quedado con la versión anterior.",
    tags: [
      "no se ve", "no aparece", "no carga", "antiguo", "viejo", "actualizar", "refrescar", "no funciona",
      "sigue igual", "cache", "nuevo", "novedades", "cambios", "lo nuevo", "no cambia", "version",
      "recargar", "no salen", "desactualizado",
    ],
    steps: [
      "Recarga forzando: <b>Ctrl + Shift + R</b> (en Mac, Cmd + Shift + R).",
      "Si sigue igual, cierra la pestaña y vuelve a abrir Events Planner.",
      "Comprueba que no tienes otra pestaña antigua abierta con la misma web.",
    ],
  },
];

/** Manual del equipo: todo menos lo que es exclusivo del portal de novios. */
const MANUAL_EQUIPO = MANUAL.filter((f) => !f.paraNovios);

/** Manual de los novios: solo lo suyo, escrito en su idioma. */
const MANUAL_NOVIOS = MANUAL.filter((f) => f.paraNovios);

/** Fichas de un área, en el orden en que están escritas. */
function manualPorArea(areaId) {
  return MANUAL_EQUIPO.filter((f) => f.area === areaId);
}

function fichaPorId(id) {
  return MANUAL.find((f) => f.id === id);
}

export { AREAS, MANUAL, MANUAL_EQUIPO, MANUAL_NOVIOS, manualPorArea, fichaPorId };
