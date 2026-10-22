import { IMG_CONTRATO } from "./contracts.js";
import { addActivity } from "./modals.js";
import { openPrintDocument } from "./print.js";
import { state, text } from "./state.js";

// ============================================================================
// Manual de uso de Events Planner · para el equipo
// ----------------------------------------------------------------------------
// Un manual que nadie lee no sirve de nada, así que este está escrito con tres
// reglas:
//
//   1. Se lee en diagonal. Títulos que dicen lo que hay debajo, párrafos
//      cortos, y las cosas importantes en tablas o en cajas.
//   2. Enseña, no describe. Cada apartado lleva un caso real —«llega una
//      pareja nueva», «se equivocaron con un invitado»— en vez de una lista
//      de campos.
//   3. Se imprime bien. Formato A4 con saltos de página cuidados: ningún
//      apartado se corta por la mitad, cada capítulo empieza en página nueva,
//      y el pie lleva el número y el logo.
//
// Las ilustraciones se dibujan en SVG dentro del propio documento, no son
// capturas: así no se ven borrosas al imprimir, pesan nada, y no se quedan
// desactualizadas cada vez que se cambia un color de la interfaz.
// ============================================================================

const VERDE = "#56603f";
const VERDE_HONDO = "#2f3a24";
const MOSTAZA = "#d6b36b";
const CREMA = "#f4efe4";
const PAPEL = "#fbf8f1";
const LINEA = "#d8d2bd";
const TINTA = "#20230d";
const SUAVE = "#5f6e64";

/* ---------------------------------------------------------------------------
   Ilustraciones
   Dibujadas a mano en SVG. Son esquemas, no capturas: enseñan la ESTRUCTURA
   de cada pantalla, que es lo que hay que entender. Una captura envejece con
   el primer cambio de color; un esquema aguanta.
--------------------------------------------------------------------------- */

/** El portal visto por encima: cabecera, pestañas y contenido. */
function ilustracionPortal() {
  return `<svg viewBox="0 0 520 300" class="ilu" role="img" aria-label="Esquema del portal de novios">
    <rect x="0" y="0" width="520" height="300" rx="10" fill="${PAPEL}" stroke="${LINEA}"/>
    <rect x="0" y="0" width="520" height="70" rx="10" fill="${VERDE}"/>
    <rect x="0" y="55" width="520" height="15" fill="${VERDE}"/>
    <text x="22" y="30" font-size="13" fill="#fff" font-weight="700">Lucía &amp; Martín</text>
    <text x="22" y="48" font-size="9" fill="#cfd8d2">22 de mayo de 2027 · Masía Els Quatre Vents</text>
    <rect x="430" y="18" width="70" height="36" rx="8" fill="rgba(255,255,255,.16)"/>
    <text x="465" y="34" font-size="15" fill="#fff" text-anchor="middle" font-weight="700">16</text>
    <text x="465" y="46" font-size="7" fill="#cfd8d2" text-anchor="middle">DÍAS</text>
    ${["Resumen", "Invitados", "Mesas", "Rincones", "Presupuesto", "Proveedores", "Plan", "Detalles"]
      .map((t, i) => {
        const x = 16 + i * 62;
        const activa = i === 1;
        return `<rect x="${x}" y="84" width="56" height="20" rx="10" fill="${activa ? VERDE : "#fff"}" stroke="${activa ? VERDE : LINEA}"/>
          <text x="${x + 28}" y="97" font-size="7" fill="${activa ? "#fff" : SUAVE}" text-anchor="middle">${t}</text>`;
      })
      .join("")}
    <rect x="16" y="118" width="488" height="26" rx="6" fill="#fff" stroke="${LINEA}"/>
    <circle cx="30" cy="131" r="6" fill="${VERDE}"/>
    <text x="44" y="134" font-size="8" fill="${SUAVE}">¿Cómo funciona esta sección?</text>
    ${[0, 1, 2].map((i) => `<rect x="16" y="${156 + i * 44}" width="488" height="36" rx="6" fill="#fff" stroke="${LINEA}"/>
      <circle cx="36" cy="${174 + i * 44}" r="9" fill="${CREMA}"/>
      <rect x="54" y="${168 + i * 44}" width="120" height="6" rx="3" fill="${TINTA}" opacity=".65"/>
      <rect x="54" y="${180 + i * 44}" width="200" height="5" rx="2.5" fill="${SUAVE}" opacity=".4"/>
      <rect x="410" y="${168 + i * 44}" width="78" height="18" rx="9" fill="${CREMA}"/>`).join("")}
  </svg>`;
}

/** Qué ve la pareja y qué no: dos columnas enfrentadas. */
function ilustracionPermisos() {
  const fila = (t, x, y, si) =>
    `<rect x="${x}" y="${y}" width="220" height="24" rx="6" fill="#fff" stroke="${LINEA}"/>
     <circle cx="${x + 16}" cy="${y + 12}" r="7" fill="${si ? VERDE : "#c9c4b0"}"/>
     <text x="${x + 16}" y="${y + 15.5}" font-size="8" fill="#fff" text-anchor="middle">${si ? "✓" : "✕"}</text>
     <text x="${x + 32}" y="${y + 16}" font-size="8.5" fill="${TINTA}">${t}</text>`;
  return `<svg viewBox="0 0 480 250" class="ilu" role="img" aria-label="Qué ve y qué no ve la pareja">
    <text x="10" y="14" font-size="10" font-weight="700" fill="${VERDE}">LO QUE VEN Y TOCAN</text>
    <text x="250" y="14" font-size="10" font-weight="700" fill="#8a7f5f">LO QUE NO VEN</text>
    ${["Sus invitados, y los editan", "Su plano de mesas", "Su presupuesto (solo leer)", "Proveedores propuestos", "Sus citas y tareas", "Su contrato"].map((t, i) => fila(t, 10, 26 + i * 32, true)).join("")}
    ${["El objetivo interno de gasto", "Precios de coste de rincones", "Las notas del equipo", "Otras bodas", "Consentimiento de alergias", "La actividad del equipo"].map((t, i) => fila(t, 250, 26 + i * 32, false)).join("")}
  </svg>`;
}

/** El circuito de un proveedor propuesto. */
function ilustracionFlujo() {
  const paso = (n, t, x) => `
    <circle cx="${x}" cy="34" r="17" fill="${n === 4 ? VERDE : "#fff"}" stroke="${VERDE}" stroke-width="1.5"/>
    <text x="${x}" y="39" font-size="14" fill="${n === 4 ? "#fff" : VERDE}" text-anchor="middle" font-weight="700">${n}</text>
    <text x="${x}" y="68" font-size="8" fill="${TINTA}" text-anchor="middle">${t}</text>`;
  return `<svg viewBox="0 0 520 88" class="ilu ilu-flujo" role="img" aria-label="Circuito de un proveedor">
    <line x1="60" y1="34" x2="460" y2="34" stroke="${LINEA}" stroke-width="1.5" stroke-dasharray="4,4"/>
    ${paso(1, "El equipo lo propone", 60)}
    ${paso(2, "La pareja lo ve", 193)}
    ${paso(3, "Deciden sí o no", 326)}
    ${paso(4, "Va al presupuesto", 460)}
  </svg>`;
}

/** La pantalla de la aplicación: menú, cabecera y contenido. */
function ilustracionApp() {
  return `<svg viewBox="0 0 520 250" class="ilu" role="img" aria-label="Las tres zonas de la pantalla">
    <rect x="0" y="0" width="520" height="250" rx="8" fill="#fff" stroke="${LINEA}"/>
    <rect x="0" y="0" width="118" height="250" rx="8" fill="${CREMA}"/>
    <rect x="110" y="0" width="8" height="250" fill="${CREMA}"/>
    <text x="16" y="26" font-size="11" font-family="Italiana, serif" fill="${VERDE}">Planner</text>
    ${["Inicio","Bodas","Agenda","Boda actual","Proveedores","Rincones","Documentos","Equipo","Portal de novios","Guía","Ajustes"]
      .map((t,i)=>{const y=44+i*17; const act=i===0;
        return `<rect x="8" y="${y-9}" width="102" height="15" rx="7" fill="${act?"#fff":"none"}" stroke="${act?LINEA:"none"}"/>
        <circle cx="20" cy="${y-1.5}" r="3" fill="${act?VERDE:SUAVE}" opacity="${act?1:.5}"/>
        <text x="30" y="${y+1.5}" font-size="7.5" fill="${act?TINTA:SUAVE}">${t}</text>`}).join("")}
    <rect x="130" y="14" width="150" height="9" rx="4" fill="${TINTA}" opacity=".7"/>
    <rect x="130" y="29" width="230" height="6" rx="3" fill="${SUAVE}" opacity=".35"/>
    <rect x="404" y="12" width="100" height="22" rx="11" fill="${VERDE}"/>
    <line x1="130" y1="48" x2="504" y2="48" stroke="${LINEA}"/>
    ${[0,1,2].map(i=>`<rect x="${130+i*126}" y="60" width="116" height="58" rx="6" fill="${PAPEL}" stroke="${LINEA}"/>
      <rect x="${140+i*126}" y="72" width="46" height="5" rx="2.5" fill="${SUAVE}" opacity=".5"/>
      <rect x="${140+i*126}" y="86" width="66" height="12" rx="3" fill="${VERDE}" opacity=".8"/>`).join("")}
    <rect x="130" y="130" width="374" height="104" rx="6" fill="${PAPEL}" stroke="${LINEA}"/>
    ${[0,1,2,3].map(i=>`<rect x="142" y="${146+i*22}" width="${200-i*18}" height="6" rx="3" fill="${SUAVE}" opacity=".3"/>
      <rect x="440" y="${144+i*22}" width="52" height="10" rx="5" fill="${CREMA}"/>`).join("")}
    <text x="24" y="243" font-size="7" fill="${SUAVE}">MENÚ</text>
    <text x="200" y="243" font-size="7" fill="${SUAVE}">CABECERA · CONTENIDO</text>
  </svg>`;
}

/** Las seis áreas de una boda. */
function ilustracionAreas() {
  const areas = [["Resumen","◍"],["Planificación","✓"],["Personas","◎"],["Producción","◇"],["Gestión","€"],["Herramientas","↗"]];
  return `<svg viewBox="0 0 520 120" class="ilu ilu-flujo" role="img" aria-label="Las seis áreas de una boda">
    <rect x="0" y="0" width="520" height="120" rx="8" fill="${PAPEL}" stroke="${LINEA}"/>
    ${areas.map(([t,i],k)=>{const x=14+k*83; const act=k===4;
      return `<rect x="${x}" y="14" width="76" height="52" rx="8" fill="${act?VERDE:"#fff"}" stroke="${act?VERDE:LINEA}"/>
      <text x="${x+38}" y="38" font-size="14" fill="${act?"#fff":VERDE}" text-anchor="middle">${i}</text>
      <text x="${x+38}" y="55" font-size="7" fill="${act?"#fff":TINTA}" text-anchor="middle">${t}</text>`}).join("")}
    ${["Servicios","Presupuesto","Contrato","Incidencias","Documentos"].map((t,k)=>{const x=14+k*100; const act=k===1;
      return `<rect x="${x}" y="82" width="92" height="20" rx="10" fill="${act?CREMA:"none"}" stroke="${act?VERDE:LINEA}"/>
      <text x="${x+46}" y="95" font-size="7.5" fill="${TINTA}" text-anchor="middle">${t}</text>`}).join("")}
    <path d="M 375 66 L 128 82" stroke="${VERDE}" stroke-width="1" stroke-dasharray="3,3" fill="none"/>
  </svg>`;
}

/** El presupuesto: coste arriba, pagos debajo. */
function ilustracionPresupuesto() {
  return `<svg viewBox="0 0 520 190" class="ilu" role="img" aria-label="Coste y pagos de una partida">
    <rect x="0" y="0" width="520" height="190" rx="8" fill="#fff" stroke="${LINEA}"/>
    <text x="16" y="22" font-size="10" font-weight="700" fill="${TINTA}">Catering · 110 comensales</text>
    <rect x="16" y="32" width="488" height="52" rx="6" fill="${CREMA}"/>
    <text x="28" y="48" font-size="7.5" fill="${SUAVE}">COSTE CONTRATADO</text>
    <text x="28" y="68" font-size="9" fill="${TINTA}">A · facturado</text>
    <text x="150" y="68" font-size="10" font-weight="700" fill="${TINTA}">12.990,00 €</text>
    <text x="260" y="68" font-size="9" fill="${TINTA}">B · no facturado</text>
    <text x="380" y="68" font-size="10" font-weight="700" fill="${TINTA}">650,00 €</text>
    <text x="460" y="48" font-size="7.5" fill="${SUAVE}">TOTAL</text>
    <text x="460" y="68" font-size="11" font-weight="700" fill="${VERDE}">13.640 €</text>
    <text x="16" y="102" font-size="7.5" fill="${SUAVE}">REPARTO EN PAGOS</text>
    ${[["Reserva","5.456 €","Pagado",true],["Segundo pago","4.092 €","Vencido",false],["Restante","4.092 €","Pendiente",null]]
      .map(([t,i,e,ok],k)=>{const x=16+k*164;
      return `<rect x="${x}" y="110" width="156" height="58" rx="6" fill="${PAPEL}" stroke="${ok===false?"#a84f42":LINEA}"/>
      <text x="${x+12}" y="126" font-size="7.5" fill="${SUAVE}">${t.toUpperCase()}</text>
      <text x="${x+12}" y="145" font-size="11" font-weight="700" fill="${TINTA}">${i}</text>
      <text x="${x+12}" y="160" font-size="7.5" fill="${ok===true?VERDE:ok===false?"#a84f42":SUAVE}">${e}</text>`}).join("")}
    <text x="16" y="184" font-size="7" fill="${SUAVE}">El coste no cambia aunque se toquen los pagos</text>
  </svg>`;
}

/* ---------------------------------------------------------------------------
   El contenido
--------------------------------------------------------------------------- */

const CAPITULOS = [
  {
    n: "01",
    titulo: "Empezar: entrar y entender la pantalla",
    ilustracion: ilustracionApp(),
    bloques: [
      {
        tipo: "texto",
        html: `<p>Events Planner se abre en el navegador. Cada persona del equipo entra con <strong>su usuario y su contraseña</strong>, así queda claro quién hace cada cosa.</p>
        <p>La pantalla tiene tres zonas y no cambian nunca: el <strong>menú de la izquierda</strong> para moverse, la <strong>cabecera</strong> que dice dónde estás, y el <strong>contenido</strong>. Si alguna vez te pierdes, el menú siempre te devuelve a sitio conocido.</p>`,
      },
    ],
    bloques2: [
      {
        tipo: "tabla",
        titulo: "El menú, de arriba abajo",
        cols: ["Entrada", "Qué encuentras"],
        filas: [
          ["Inicio", "El resumen del día: qué bodas vienen, qué tareas hay y qué necesita atención."],
          ["Bodas", "El listado de todas. Desde aquí se crea una nueva y se entra en cualquiera."],
          ["Agenda", "Todas las reuniones de todas las bodas, en un calendario."],
          ["Boda actual", "La boda que tengas abierta. Es donde se hace el trabajo."],
          ["Equipo", "El equipo al completo. Sus teléfonos y su WhatsApp."],
          ["Proveedores", "La base de datos de proveedores, común a todas las bodas."],
          ["Rincones", "El catálogo de rincones con sus fotos."],
          ["Documentos", "Todos los archivos, ordenados por boda."],
          ["Portal de novios", "Ver el portal como lo ven ellos."],
          ["Guía", "La ayuda y este manual."],
          ["Ajustes", "Accesos, copias de seguridad y protección de datos."],
        ],
      },
      {
        tipo: "porque",
        titulo: "El asistente de los anillos",
        html: `Abajo a la derecha hay un botón redondo con dos anillos. Es un buscador de ayuda: escribe lo que necesites <strong>como te salga</strong> —«chuches», «he borrado algo», «wasap», «sin cobertura»— y te lleva a la explicación. Entiende faltas de ortografía, así que no hace falta acertar con la palabra exacta.`,
      },
    ],
  },

  {
    n: "02",
    titulo: "Inicio: qué mirar cada mañana",
    bloques: [
      {
        tipo: "texto",
        html: `<p>Inicio no es un adorno: está montado para responder en diez segundos a «¿qué tengo hoy?».</p>`,
      },
      {
        tipo: "tabla",
        titulo: "Lo que verás, y para qué sirve",
        cols: ["Bloque", "Qué te está diciendo"],
        filas: [
          ["Las cifras de arriba", "Bodas activas, invitados confirmados y dinero gestionado. Es la foto general."],
          ["Próximas bodas", "Ordenadas por fecha. La más cercana primero, con su cuenta atrás."],
          ["Tareas pendientes", "Lo que está sin hacer, de todas las bodas juntas."],
          ["Evolución económica", "Lo contratado frente a lo pagado, mes a mes."],
          ["Actividad reciente", "Quién ha tocado qué y cuándo, incluida la pareja desde su portal."],
        ],
      },
      {
        tipo: "caso",
        titulo: "Lunes por la mañana",
        pasos: [
          "Abre <strong>Inicio</strong> y mira <strong>Próximas bodas</strong>: la de arriba es la que más corre.",
          "Baja a <strong>Tareas pendientes</strong> y fíjate en las que llevan fecha pasada.",
          "Echa un ojo a <strong>Actividad reciente</strong>: si una pareja movió sus mesas el finde, aparece ahí.",
          "Entra en la boda que más apriete pulsando su tarjeta.",
        ],
      },
    ],
  },

  {
    n: "03",
    titulo: "Crear y organizar bodas",
    bloques: [
      {
        tipo: "caso",
        titulo: "Dar de alta una boda nueva",
        pasos: [
          "<strong>Bodas → Nueva boda</strong>. Se abre una página entera, no un desplegable: son bastantes campos y conviene verlos todos.",
          "Rellena la pareja, la fecha, los lugares y el responsable. Lo demás se puede completar después.",
          "Elige su <strong>paleta de colores</strong> y sube una <strong>foto de portada</strong> si la tienes. Si no, se dibuja un monograma con sus iniciales sobre su paleta.",
          "Al guardar te pregunta si quieres entrar en la boda ya o volver al listado.",
          "<strong>Apunta la contraseña del portal</strong>: se enseña una sola vez.",
        ],
      },
      {
        tipo: "aviso",
        titulo: "Duplicar ahorra muchísimo tiempo",
        html: `Si una boda se parece a otra —mismo espacio, mismos rincones—, usa <strong>Duplicar</strong> en la tarjeta. Copia servicios, rincones y estructura sin copiar invitados ni importes, que es justo lo que quieres.`,
      },
    ],
    bloques2: [
      {
        tipo: "tabla",
        titulo: "Los estados de una boda",
        cols: ["Estado", "Qué significa"],
        filas: [
          ["En preparación", "Lo normal. Se está trabajando en ella."],
          ["Semana de boda", "La semana de la boda. Todo se acelera."],
          ["Finalizada", "Ya pasó y está terminada del todo. Deja de aparecer entre las activas."],
        ],
      },
      {
        tipo: "porque",
        titulo: "Por qué se ordenan así",
        html: `Las que vienen pronto van primero y las celebradas al final. Una boda de hace ocho meses no debería pesar lo mismo en la lista que la del mes que viene — y por eso también conviene <strong>cerrarlas</strong> cuando toca.`,
      },
    ],
  },

  {
    n: "04",
    titulo: "Dentro de una boda: las seis áreas",
    ilustracion: ilustracionAreas(),
    bloques: [
      {
        tipo: "texto",
        html: `<p>Al entrar en una boda aparecen seis pestañas grandes. Cada una agrupa lo que se hace en un mismo momento del trabajo, así no hay que recordar dónde estaba cada cosa.</p>`,
      },
      {
        tipo: "tabla",
        titulo: "Qué hay en cada área",
        cols: ["Área", "Contiene"],
        filas: [
          ["Resumen", "La portada de la boda: cuenta atrás, cifras y lo siguiente que toca."],
          ["Planificación", "Tareas, Calendario, Acuerdos, Timeline y Wedding Day."],
          ["Personas", "Invitados, Mesas y Transportes."],
          ["Producción", "Proveedores, Rincones, Música y Lista de fotos."],
          ["Gestión", "Servicios, Presupuesto, Contrato, Incidencias y Documentos."],
          ["Herramientas", "Actividad, Exportar dossier y el cierre de la boda."],
        ],
      },
      {
        tipo: "porque",
        titulo: "Guardar",
        html: `Arriba a la derecha hay un botón <strong>Guardar</strong>, pero la aplicación guarda sola en cuanto cambias algo. El botón está por tranquilidad. Si estáis varios trabajando y alguien guardó antes que tú, te avisa y trae sus cambios en vez de pisarlos.`,
      },
    ],
  },

  {
    n: "05",
    titulo: "Planificación: tareas, reuniones y acuerdos",
    bloques: [
      {
        tipo: "tabla",
        titulo: "Las cinco pestañas",
        cols: ["Pestaña", "Para qué"],
        filas: [
          ["Tareas", "Lo que hay que hacer, con responsable y fecha. Se marcan al terminarlas."],
          ["Calendario", "Las reuniones con la pareja: cuándo, dónde y de qué se habla."],
          ["Acuerdos", "Lo que se decidió en cada reunión, todo junto y buscable."],
          ["Timeline", "El horario del día de la boda, hora a hora."],
          ["Wedding Day", "El mismo timeline, en versión para ir marcando ese día."],
        ],
      },
      {
        tipo: "caso",
        titulo: "Después de una reunión",
        pasos: [
          "En <strong>Calendario</strong>, busca la reunión y pulsa <strong>Acuerdos</strong>.",
          "Escribe lo que se decidió, con nombres y cifras: «postre cambiado al de frutos rojos, 8 menús sin gluten».",
          "Al guardar, la reunión se marca como celebrada.",
          "Eso aparece en <strong>Acuerdos</strong>, donde se busca por palabra sin tener que abrir reunión por reunión.",
        ],
      },
      {
        tipo: "porque",
        titulo: "Por qué insistimos tanto con los acuerdos",
        html: `Agendar una reunión sin apuntar qué se decidió pierde la mitad del valor. Dentro de tres meses nadie recuerda si el ramo era de peonías o de ranúnculos — y si quien estuvo en esa reunión está de vacaciones, no hay a quién preguntar.`,
      },
    ],
    bloques2: [
      {
        tipo: "aviso",
        titulo: "Llevar una reunión al calendario del móvil",
        html: `Cada reunión tiene <strong>+ Google</strong> y <strong>Archivo</strong>. El primero la añade a Google Calendar; el segundo descarga un archivo que vale para Outlook o Apple. También hay botón de WhatsApp con el recordatorio ya escrito, para revisarlo antes de enviarlo.`,
      },
    ],
  },

  {
    n: "06",
    titulo: "Personas: invitados, mesas y transportes",
    bloques: [
      {
        tipo: "caso",
        titulo: "Montar la lista de invitados",
        pasos: [
          "En <strong>Invitados</strong> se añaden uno a uno, o se pegan de golpe con <strong>Importar</strong>.",
          "Al importar da igual el orden de las columnas: reconoce el correo por la arroba y el teléfono por su forma.",
          "Se filtra por grupo, confirmación, menú o mesa; y hay un filtro para ver <strong>solo los que tienen alergias</strong>.",
          "Lo normal es que la lista la rellene la pareja desde su portal, y aquí solo se repase.",
        ],
      },
      {
        tipo: "aviso",
        titulo: "Las alergias son datos de salud",
        html: `Legalmente son categoría especial. La aplicación pide el consentimiento del invitado y, si se opone, <strong>su alergia no sale en ningún documento impreso</strong> — tampoco en el dossier del catering. Pedir el consentimiento y luego ignorarlo sería peor que no pedirlo.`,
      },
      {
        tipo: "caso",
        titulo: "Sentar a la gente",
        pasos: [
          "En <strong>Mesas</strong>, crea las que hagan falta y arrástralas por el plano.",
          "Cada mesa puede ser pequeña, normal, grande o XL: se cambia desde su ficha.",
          "Pulsa una mesa para ver quién está sentado y sentar a más gente.",
          "El plano se puede ampliar y ponerlo a pantalla completa para el día de la boda.",
        ],
      },
      {
        tipo: "porque",
        titulo: "Deja que el seating lo hagan ellos",
        html: `Nadie sabe mejor que la pareja quién no puede sentarse con quién. Que lo resuelvan desde su portal ahorra la conversación más larga de toda la organización — y el resultado suele ser mejor.`,
      },
    ],
  },

  {
    n: "07",
    titulo: "Producción: proveedores y rincones",
    ilustracion: ilustracionFlujo(),
    bloques: [
      {
        tipo: "caso",
        titulo: "Cerrar un proveedor",
        pasos: [
          "En la boda → <strong>Proveedores</strong>, elige uno de la base con el desplegable. Se copia su ficha entera: web, Instagram, teléfono.",
          "Adjunta su presupuesto si ya lo ha mandado, con el importe y qué incluye.",
          "La pareja lo ve en su portal y responde <strong>Nos gusta</strong> o <strong>Este no</strong>.",
          "Con los aceptados, crea la partida en <strong>Presupuesto</strong> y reparte sus tres pagos.",
        ],
      },
      {
        tipo: "aviso",
        titulo: "Los proveedores se eligen, no se escriben",
        html: `Siempre desde la base. Escribiendo el nombre a mano se acaban teniendo tres fichas del mismo fotógrafo con datos distintos, y el día que hay que llamarle nadie sabe cuál es la buena. Si no está en la base, créalo primero en <strong>Proveedores</strong>.`,
      },
      {
        tipo: "tabla",
        titulo: "Rincones",
        cols: ["Qué", "Cómo"],
        filas: [
          ["Añadir uno a la boda", "Se elige del catálogo, con su foto y su descripción."],
          ["Tareas de preparación", "Cada rincón admite tareas con todo el detalle: «4 kg de chuches sin gelatina de cerdo, en el súper del pueblo»."],
          ["Propuesta a medida", "Se sube una foto marcada como propuesta y la pareja la aprueba desde su portal."],
          ["Peticiones de la pareja", "Si piden uno del catálogo, llega aquí para aprobarlo o explicar la alternativa."],
        ],
      },
    ],
  },

  {
    n: "08",
    titulo: "Gestión: el presupuesto",
    ilustracion: ilustracionPresupuesto(),
    bloques: [
      {
        tipo: "texto",
        html: `<p>Esta es una de las pantallas más importantes. Conviene entender dos ideas y el resto sale solo.</p>`,
      },
      {
        tipo: "tabla",
        titulo: "Las dos ideas",
        cols: ["Concepto", "Qué es"],
        filas: [
          ["El coste", "Lo que cuesta esa partida. Es un dato del acuerdo con el proveedor: se pone al crearla."],
          ["Los pagos", "Cómo se paga: reserva, segundo pago y restante. Es un calendario."],
        ],
      },
      
    ],
    bloques2: [
      {
        tipo: "caso",
        titulo: "Crear una partida",
        pasos: [
          "<strong>+ Partida</strong>. Pon el concepto, la categoría y el proveedor.",
          "Escribe el <strong>coste facturado (A)</strong> tal como te lo dé el proveedor, e indica si esa cifra ya lleva el IVA o es la base. La app calcula lo que falte.",
          "Si hay parte en suplidos o pagos directos al proveedor, va en <strong>coste no facturado (B)</strong>.",
          "Después reparte ese coste en los tres pagos, con sus fechas.",
          "Al pagar uno, márcalo y sube el justificante: aparecerá solo en Documentos.",
        ],
      },
    ],
    bloques3: [
      {
        tipo: "tabla",
        titulo: "Las cifras de arriba",
        cols: ["Cifra", "Qué responde"],
        filas: [
          ["Presupuesto de la pareja", "Lo que se fijaron gastar al principio."],
          ["Contratado hasta ahora", "La suma de todas las partidas."],
          ["A · facturado", "Lo que va con factura, con lo pagado y lo pendiente."],
          ["B · no facturado", "Suplidos y pagos directos, igual."],
        ],
      },
      {
        tipo: "aviso",
        titulo: "A + B siempre suma el total",
        html: `Está escrito en pantalla debajo de la cifra grande, para que se pueda comprobar de un vistazo. Si alguna vez no cuadrara, sería un error — y por eso se enseña.`,
      },
    ],
  },

  {
    n: "09",
    titulo: "Gestión: servicios, contrato y documentos",
    bloques: [
      {
        tipo: "tabla",
        titulo: "Qué es cada cosa",
        cols: ["Pestaña", "Qué contiene"],
        filas: [
          ["Servicios", "Lo que se ofrece a la pareja, con su precio. Es lo que alimenta el contrato."],
          ["Presupuesto", "Todo el dinero de la boda, incluido lo que se paga a terceros."],
          ["Contrato", "El documento, su firma y el circuito de entrega."],
          ["Incidencias", "Los problemas y su plan B."],
          ["Documentos", "El índice de todos los archivos de la boda."],
        ],
      },
      {
        tipo: "caso",
        titulo: "Generar y entregar el contrato",
        pasos: [
          "En <strong>Contrato</strong>, comprueba que los servicios contratados y sus precios son los correctos.",
          "<strong>Generar contrato</strong>: se crea con los datos de la boda y las cláusulas del equipo.",
          "<strong>Imprimir</strong> da el PDF con el formato de siempre, con las imágenes y el cierre.",
          "La pareja lo firma y sube el firmado <strong>desde su portal</strong>. No hace falta correo.",
          "Aparece en Documentos con su procedencia, y desde ahí se descarga.",
        ],
      },
      {
        tipo: "porque",
        titulo: "Documentos es un índice, no una carpeta",
        html: `Cada archivo se sube donde tiene sentido: el justificante en su pago, el presupuesto en la ficha del proveedor, el contrato en su pestaña. Documentos <strong>los lista todos</strong> con su origen y un enlace. Si se copiaran, en tres meses habría dos versiones de la misma factura y nadie sabría cuál vale.`,
      },
    ],
  },

  {
    n: "10",
    titulo: "El portal de los novios",
    ilustracion: ilustracionPortal(),
    bloques: [
      {
        tipo: "texto",
        html: `<p>El portal es la parte que ve la pareja. Entra con su usuario y contraseña, y solo ve <strong>su boda</strong>. No es un escaparate: es donde ellos trabajan.</p>`,
      },
    ],
    bloques2: [
      {
        tipo: "tabla",
        titulo: "Sus nueve pestañas",
        cols: ["Pestaña", "Qué hacen ahí"],
        filas: [
          ["Resumen", "Miran: cuenta atrás, confirmados y cómo va el dinero."],
          ["Invitados", "Escriben: añaden, corrigen menús y alergias, y guardan."],
          ["Mesas", "Arrastran: colocan mesas y sientan a la gente."],
          ["Rincones", "Piden los que les gustan."],
          ["Presupuesto", "Consultan y suben comprobantes. No editan."],
          ["Proveedores", "Deciden: «Nos gusta» o «Este no»."],
          ["Plan", "Sus citas, sus tareas y el orden del día."],
          ["Contrato", "Lo ven y suben el firmado."],
          ["Detalles", "Música, ubicaciones, documentos y sus derechos sobre los datos."],
        ],
      },
    ],
    bloques3: [
      {
        tipo: "caso",
        titulo: "Dar acceso a una pareja",
        pasos: [
          "La contraseña se genera al crear la boda y se enseña <strong>una sola vez</strong>.",
          "Si se te pasó: <strong>Ajustes → Acceso de las parejas → Nueva contraseña</strong>.",
          "El usuario sale de su nombre: «Lucía &amp; Martín» → <code>lucia.martin</code>. Está en esa misma tabla.",
          "Para ver su portal como ellos: <strong>Portal de novios</strong> en el menú. Sale una barra verde avisando de que estás previsualizando — esa barra solo la ve el equipo.",
        ],
      },
      {
        tipo: "porque",
        titulo: "El tono importa tanto como el dato",
        html: `Un aviso escrito para el equipo —«8 pagos vencidos»— dicho a una pareja suena a reproche. En su portal el mismo dato sale como «lo siguiente que toca», con su importe y su fecha. Misma información, otra conversación.`,
      },
    ],
  },

  {
    n: "11",
    titulo: "Qué ven y qué no ven los novios",
    ilustracion: ilustracionPermisos(),
    bloques: [
      {
        tipo: "texto",
        html: `<p>La pregunta que más se repite. En corto: <strong>ven su boda entera, pero no el trabajo interno del equipo</strong>.</p>`,
      },
    ],
    bloques2: [
      {
        tipo: "tabla",
        titulo: "Los casos que generan dudas",
        cols: ["¿Lo ven?", "Detalle"],
        filas: [
          ["El presupuesto, sí", "Con las mismas cifras: total, dado a cuenta y lo que queda, separado en A y B."],
          ["Su objetivo, también", "Es el presupuesto que ellos se fijaron. Es lo primero que quieren mirar."],
          ["Los precios de coste, no", "Lo que le cuesta al equipo montar un rincón no sale por ningún lado."],
          ["Las notas del equipo, no", "Los apuntes internos de una boda son internos."],
          ["Las alergias, sí", "Son sus invitados. Lo que no ven es el registro de consentimiento."],
          ["Otras bodas, jamás", "Comprobado pestaña por pestaña."],
        ],
      },
      {
        tipo: "aviso",
        titulo: "Todo queda registrado",
        html: `Cada cambio que hacen aparece en <strong>Actividad</strong> con su nombre y su hora: «Lucía &amp; Martín actualizaron 12 invitados». No es vigilancia — es poder responder a «¿esto lo cambiaste tú o ellos?».`,
      },
    ],
  },

  {
    n: "12",
    titulo: "Herramientas: dossier y cierre",
    bloques: [
      {
        tipo: "caso",
        titulo: "Preparar un dossier",
        pasos: [
          "<strong>Herramientas → Exportar</strong>.",
          "Elige para quién es: <strong>Equipo</strong>, <strong>Novios</strong> o <strong>Proveedores</strong>. Cada uno recibe lo que le corresponde.",
          "Marca las secciones. El presupuesto va justo después del resumen.",
          "Genera el PDF: sale con portada, la paleta de la boda y todo paginado.",
        ],
      },
      {
        tipo: "aviso",
        titulo: "El dossier de proveedores lleva menos",
        html: `No incluye incidencias, ni actividad, ni el presupuesto. Y las alergias de quien no dio su consentimiento tampoco salen. No es que se nos olvide: es a propósito.`,
      },
      {
        tipo: "caso",
        titulo: "Cerrar una boda",
        pasos: [
          "<strong>Herramientas → Actividad</strong>, y abajo está el <strong>Cierre de la boda</strong>.",
          "Verás cinco comprobaciones: pagos liquidados, documentación, contrato, tareas e incidencias.",
          "Se puede cerrar aunque falte algo, pero <strong>queda anotado</strong> qué faltaba.",
          "Al cerrarla deja de aparecer entre las activas. Se puede reabrir cuando quieras.",
        ],
      },
    ],
  },

  {
    n: "13",
    titulo: "Ajustes: accesos, copias y datos",
    bloques: [
      {
        tipo: "tabla",
        titulo: "Qué hay en Ajustes",
        cols: ["Bloque", "Para qué"],
        filas: [
          ["Acceso de las parejas", "El usuario de cada una y el botón de nueva contraseña."],
          ["Bodas de referencia", "Cargar o quitar las bodas de ejemplo."],
          ["Peso de los datos", "Cuánto ocupa todo y el botón para aligerarlo si hace falta."],
          ["Copia de seguridad", "Descargar y restaurar. Conviene bajarse una de vez en cuando."],
          ["Vaciar datos de trabajo", "Deja el planner limpio conservando la sesión. Con cuidado."],
          ["Protección de datos", "Quién es responsable, para qué se tratan y el registro descargable."],
        ],
      },
      {
        tipo: "aviso",
        titulo: "Las contraseñas no se pueden recuperar",
        html: `Se guardan cifradas: ni el equipo ni nadie puede leerlas. Si una se pierde, se genera otra. Es más seguro, y es la razón de que exista ese botón.`,
      },
      {
        tipo: "porque",
        titulo: "Las bodas de ejemplo son inventadas",
        html: `Las que se cargan para aprender son bodas inventadas. Salen con la etiqueta <strong>Ejemplo</strong> para no confundirlas con la que se esté gestionando, y se pueden quitar cuando el equipo ya maneja la herramienta.`,
      },
    ],
  },

  {
    n: "14",
    titulo: "Dudas frecuentes",
    bloques: [
      {
        tipo: "faq",
        items: [
          ["He borrado algo sin querer", "Sale un aviso con <strong>Deshacer</strong> durante unos segundos. Si ya pasó, mira en <strong>Actividad</strong> quién lo borró y cuándo; y siempre queda la copia de seguridad de Ajustes."],
          ["¿Funciona sin cobertura?", "Sí. En una finca sin señal la aplicación abre igual con lo último que cargó, y los cambios suben al recuperar la conexión. Sale un aviso en pantalla mientras tanto."],
          ["¿Y en el móvil?", "Sí, y es donde más se usa el día de la boda. Las tablas se convierten en fichas y los botones son grandes para el dedo."],
          ["Dos personas a la vez, ¿nos pisamos?", "No. Si alguien guardó mientras trabajabas, la aplicación trae sus cambios y avisa, en vez de sobrescribirlos en silencio."],
          ["Una pareja no puede entrar", "Comprueba su usuario en <strong>Ajustes → Acceso de las parejas</strong>. Si falla la contraseña, genera otra. Tras cinco intentos fallidos el acceso se bloquea un minuto: es a propósito."],
        ],
      },
    ],
    bloques2: [
      {
        tipo: "faq",
        items: [
          ["¿Dónde están los justificantes que subí?", "En <strong>Documentos</strong> de esa boda, con la etiqueta <em>Presupuesto</em> y un enlace que lleva al pago del que salieron."],
          ["No me cuadra el presupuesto", "Mira si hay aviso de «sin repartir»: significa que hay dinero contratado que aún no está en ningún pago. El total no cambia; lo que falta es la fecha."],
          ["¿Cómo cambio la foto de una boda?", "Edítala y sube la foto de portada. Si no pones ninguna, se dibuja un monograma con las iniciales de la pareja."],
          ["El asistente no encuentra algo", "Escríbelo como te salga, que entiende faltas. Si aun así no está, dilo y se añade — el asistente y este manual salen del mismo sitio."],
          ["¿Puedo imprimir cualquier sección?", "Casi todas tienen un botón <strong>PDF</strong> arriba. Para algo completo, usa el dossier de Herramientas."],
        ],
      },
    ],
  },
];

/* ---------------------------------------------------------------------------
   Composición del documento
--------------------------------------------------------------------------- */

function bloqueHtml(b) {
  if (b.tipo === "texto") return `<div class="txt">${b.html}</div>`;

  if (b.tipo === "porque")
    return `<aside class="porque">
      <h4>${text(b.titulo)}</h4>
      <p>${b.html}</p>
    </aside>`;

  if (b.tipo === "aviso")
    return `<aside class="aviso">
      <h4>${text(b.titulo)}</h4>
      <p>${b.html}</p>
    </aside>`;

  if (b.tipo === "caso")
    return `<div class="caso">
      <h4><span>Caso</span>${text(b.titulo)}</h4>
      <ol>${b.pasos.map((p) => `<li>${p}</li>`).join("")}</ol>
    </div>`;

  if (b.tipo === "tabla")
    return `<div class="tabla-bloque">
      <h4>${text(b.titulo)}</h4>
      <table>
        <thead><tr>${b.cols.map((c) => `<th>${text(c)}</th>`).join("")}</tr></thead>
        <tbody>${b.filas.map((f) => `<tr>${f.map((c, i) => `<td class="${i === 0 ? "primera" : ""}">${c}</td>`).join("")}</tr>`).join("")}</tbody>
      </table>
    </div>`;

  if (b.tipo === "faq")
    return `<dl class="faq">${b.items.map(([p, r]) => `<div class="faq-item"><dt>${text(p)}</dt><dd>${r}</dd></div>`).join("")}</dl>`;

  return "";
}

/**
 * Reparte un capítulo en las hojas que haga falta.
 *
 * `.hoja` tiene `overflow: hidden` para que nada se derrame de una página a
 * otra — pero eso significa que lo que no cabe NO se ve. Dos capítulos se
 * pasaban de los 297 mm y su última tabla se perdía en la impresión sin que
 * nadie lo notara al mirarlo en pantalla.
 *
 * Los capítulos que lo necesitan declaran `bloques2` y `bloques3`: su
 * continuación va a otra hoja con el título repetido y un «(continúa)», que es
 * como se hace en un manual de papel. Se midió hoja por hoja en el navegador
 * hasta que ninguna pasaba de 297 mm.
 */
function hojasDeCapitulo(c, logo) {
  const pie = (sufijo = "") =>
    `<div class="pie"><span>${c.n} · ${text(c.titulo)}${sufijo}</span>${logo ? `<img src="${logo}" alt="" />` : ""}</div>`;

  const continuaciones = [c.bloques2, c.bloques3].filter((b) => b?.length);

  return `<div class="hoja">${capituloHtml(c)}${pie()}</div>` +
    continuaciones
      .map(
        (bloques) => `<div class="hoja">
    <section class="cap cap-sigue">
      <header class="cap-cab">
        <span class="cap-n">${c.n}</span>
        <h2>${text(c.titulo)} <em>(continúa)</em></h2>
      </header>
      ${bloques.map(bloqueHtml).join("")}
    </section>
    ${pie(" · continuación")}
  </div>`,
      )
      .join("");
}

function capituloHtml(c) {
  return `<section class="cap">
    <header class="cap-cab">
      <span class="cap-n">${c.n}</span>
      <h2>${text(c.titulo)}</h2>
    </header>
    ${c.ilustracion ? `<figure class="ilu-wrap">${c.ilustracion}</figure>` : ""}
    ${c.bloques.map(bloqueHtml).join("")}
  </section>`;
}

/** Genera el manual y abre el diálogo de impresión del navegador. */
function abrirManual() {
  const hoy = new Date().toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" });
  const logo = IMG_CONTRATO?.logoVerde || "";
  const portada = IMG_CONTRATO?.novios || "";

  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8">
<title>Manual de uso · Events Planner</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Italiana&family=DM+Sans:wght@300;400;500;700&display=swap">
<style>
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    background: ${PAPEL};
    color: ${TINTA};
    font-family: "DM Sans", system-ui, sans-serif;
    font-size: 10.5pt;
    line-height: 1.6;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  /* Cada hoja es una página A4 real, con su margen dentro. Así lo que se ve
     en pantalla es exactamente lo que sale por la impresora. */
  .hoja {
    position: relative;
    width: 210mm;
    min-height: 297mm;
    padding: 22mm 20mm 26mm;
    margin: 0 auto;
    background: ${PAPEL};
    page-break-after: always;
    overflow: hidden;
  }
  .hoja:last-child { page-break-after: auto; }

  /* ── Portada ── */
  .portada { padding: 0; display: flex; flex-direction: column; }
  .portada-img { position: relative; height: 148mm; overflow: hidden; background: ${VERDE_HONDO}; }
  .portada-img img { width: 100%; height: 100%; object-fit: cover; object-position: center 38%; opacity: 1; }
  .portada-velo { position: absolute; inset: 0; background: linear-gradient(180deg, rgba(47, 58, 36,.55) 0%, rgba(47, 58, 36,.78) 45%, rgba(35,48,42,.94) 100%); }
  .portada-marca { position: absolute; top: 18mm; left: 20mm; color: #fff; }
  .portada-marca .nombre { font-family: "Italiana", Georgia, serif; font-size: 15pt; letter-spacing: .18em; text-transform: uppercase; line-height: 1; }
  .portada-marca .sub { display: block; margin-top: 2mm; font-size: 7pt; letter-spacing: .34em; text-transform: uppercase; opacity: .78; }
  .portada-tit h1 { text-shadow: 0 2px 14px rgba(0,0,0,.35); }
  .portada-tit { position: absolute; left: 20mm; right: 20mm; bottom: 16mm; color: #fff; }
  .portada-tit .eyebrow { font-size: 9pt; letter-spacing: .28em; text-transform: uppercase; opacity: .8; }
  .portada-tit h1 { font-family: "Italiana", Georgia, serif; font-size: 38pt; font-weight: 400; margin: 6px 0 0; line-height: 1.05; }
  .portada-cuerpo { flex: 1; padding: 16mm 20mm; }
  .portada-cuerpo p { max-width: 120mm; font-size: 11pt; color: ${SUAVE}; }
  .portada-meta { margin-top: auto; display: flex; gap: 10mm; padding: 0 20mm 18mm; font-size: 9pt; color: ${SUAVE}; }
  .portada-meta b { display: block; color: ${TINTA}; font-size: 10pt; }

  /* ── Índice ── */
  .indice h2 { font-family: "Italiana", Georgia, serif; font-size: 26pt; font-weight: 400; margin: 0 0 4mm; }
  .indice ol { list-style: none; margin: 0; padding: 0; }
  .indice li { display: flex; align-items: baseline; gap: 4mm; padding: 2.4mm 0; border-bottom: 1px solid ${LINEA}; }
  .indice .n { font-size: 13pt; font-weight: 700; color: ${VERDE}; min-width: 12mm; }
  .indice .t { flex: 1; font-size: 11pt; }

  /* ── Capítulos ── */
  .cap { page-break-before: always; }
  .cap:first-of-type { page-break-before: avoid; }
  .cap-cab { display: flex; align-items: baseline; gap: 5mm; margin-bottom: 6mm; padding-bottom: 3mm; border-bottom: 2px solid ${VERDE}; }
  .cap-n { font-family: "Italiana", Georgia, serif; font-size: 30pt; color: ${VERDE}; line-height: 1; }
  .cap h2 { font-family: "Italiana", Georgia, serif; font-size: 21pt; font-weight: 400; margin: 0; }
  .cap h2 em { font-family: "DM Sans", sans-serif; font-size: 10pt; font-style: normal; color: ${SUAVE}; }

  .txt p { margin: 0 0 3.5mm; }
  .txt strong { font-weight: 700; }

  /* Ningún bloque se parte entre dos páginas: leer media caja y buscar el
     resto en la hoja siguiente es la forma más rápida de abandonar un manual. */
  .caso, .porque, .aviso, .tabla-bloque, .faq-item, .ilu-wrap { page-break-inside: avoid; }

  /* Las ilustraciones medían 103 y 94 mm y hacían que dos capítulos se
     salieran del alto A4 —357 mm en uno—, con lo que la última tabla acababa
     partida en la impresión. Se limitan por altura: siguen leyéndose y el
     capítulo cabe entero en su hoja. */
  .ilu-wrap { margin: 0 0 5mm; padding: 4mm; border: 1px solid ${LINEA}; border-radius: 3mm; background: #fff; }
  .ilu { width: 100%; height: auto; max-height: 62mm; display: block; }
  .ilu-flujo { max-height: 24mm; }

  .caso { margin: 0 0 5mm; padding: 5mm 6mm; border-left: 3px solid ${VERDE}; border-radius: 0 2mm 2mm 0; background: rgba(86, 96, 63,.06); }
  .caso h4 { display: flex; align-items: center; gap: 3mm; margin: 0 0 3mm; font-size: 11pt; }
  .caso h4 span { padding: .6mm 2.4mm; border-radius: 6mm; background: ${VERDE}; color: #fff; font-size: 7.5pt; letter-spacing: .1em; text-transform: uppercase; }
  .caso ol { margin: 0; padding-left: 5mm; }
  .caso li { margin-bottom: 2.2mm; }
  .caso code { padding: .3mm 1.4mm; border-radius: 1mm; background: ${CREMA}; font-family: ui-monospace, Menlo, monospace; font-size: 9pt; }

  .porque { margin: 0 0 5mm; padding: 4.5mm 6mm; border-radius: 2mm; background: ${CREMA}; }
  .porque h4 { margin: 0 0 2mm; font-size: 10pt; color: ${VERDE}; }
  .porque p { margin: 0; font-size: 10pt; color: ${SUAVE}; }

  .aviso { margin: 0 0 5mm; padding: 4.5mm 6mm; border-left: 3px solid ${MOSTAZA}; border-radius: 0 2mm 2mm 0; background: rgba(214, 179, 107,.12); }
  .aviso h4 { margin: 0 0 2mm; font-size: 10pt; }
  .aviso p { margin: 0; font-size: 10pt; }

  .tabla-bloque { margin: 0 0 5mm; }
  .tabla-bloque h4 { margin: 0 0 2.5mm; font-size: 10pt; color: ${VERDE}; letter-spacing: .04em; text-transform: uppercase; }
  .tabla-bloque table { width: 100%; border-collapse: collapse; font-size: 9.5pt; }
  .tabla-bloque th { padding: 2.4mm 3mm; border-bottom: 1.5px solid ${VERDE}; background: ${CREMA}; text-align: left; font-size: 8.5pt; letter-spacing: .05em; text-transform: uppercase; color: ${SUAVE}; }
  .tabla-bloque td { padding: 2.6mm 3mm; border-bottom: 1px solid ${LINEA}; vertical-align: top; }
  .tabla-bloque td.primera { width: 34%; font-weight: 700; }

  .faq { margin: 0; }
  .faq-item { padding: 3.6mm 0; border-bottom: 1px solid ${LINEA}; }
  .faq-item:last-child { border-bottom: 0; }
  .faq dt { margin-bottom: 1.6mm; font-size: 10.5pt; font-weight: 700; color: ${VERDE_HONDO}; }
  .faq dd { margin: 0; font-size: 10pt; color: ${SUAVE}; }

  /* ── Pie ── */
  .pie { position: absolute; left: 20mm; right: 20mm; bottom: 12mm; display: flex; align-items: center; justify-content: space-between; padding-top: 3mm; border-top: 1px solid ${LINEA}; font-size: 8pt; color: ${SUAVE}; }
  .pie img { width: 24mm; opacity: .55; }

  @media screen {
    body { background: #e8e5d8; padding: 20px 0; }
    .hoja { box-shadow: 0 10px 40px rgba(0,0,0,.14); margin-bottom: 20px; }
    .barra { position: sticky; top: 0; z-index: 9; display: flex; justify-content: center; gap: 10px; padding: 12px; background: ${VERDE}; }
    .barra button { padding: 9px 20px; border: 0; border-radius: 999px; background: #fff; color: ${VERDE}; font: inherit; font-weight: 700; font-size: 13px; cursor: pointer; }
    .barra span { color: #cfd8d2; font-size: 13px; align-self: center; }
  }
  @media print { .barra { display: none; } }
</style></head><body>

<div class="barra">
  <button data-imprimir type="button">Descargar en PDF</button>
  <span>En el diálogo, elige «Guardar como PDF». Márgenes: ninguno.</span>
</div>

<!-- Portada -->
<div class="hoja portada">
  <div class="portada-img">
    ${portada ? `<img src="${portada}" alt="" />` : ""}
    <div class="portada-velo"></div>
    <div class="portada-marca"><span class="nombre">Events Planner</span><span class="sub">Wedding + Events</span></div>
    <div class="portada-tit">
      <span class="eyebrow">Guía completa para el equipo</span>
      <h1>Manual<br/>de uso</h1>
    </div>
  </div>
  <div class="portada-cuerpo">
    <p>Todo Events Planner explicado paso a paso: el día a día, las bodas, el presupuesto, el portal de los novios y las dudas que más se repiten. Sin tecnicismos.</p>
  </div>
  <div class="portada-meta">
    <div><b>Para</b>El equipo de Events Planner</div>
    <div><b>Actualizado</b>${text(hoy)}</div>
    <div><b>Preparado por</b>${text(state.user?.name || "Events Planner")}</div>
  </div>
</div>

<!-- Índice -->
<div class="hoja indice">
  <h2>Contenido</h2>
  <ol>
    ${CAPITULOS.map((c) => `<li><span class="n">${c.n}</span><span class="t">${text(c.titulo)}</span></li>`).join("")}
  </ol>
  <div style="margin-top:6mm">
    <aside class="porque">
      <h4>Cómo leer este manual</h4>
      <p>Los apartados marcados como <strong>Caso</strong> son situaciones paso a paso: lo primero que mirar si tienes una pareja delante. Las cajas <strong>en crema</strong> explican el porqué de cada decisión.</p>
    </aside>
  </div>
  <div class="pie"><span>Manual de uso · Events Planner</span>${logo ? `<img src="${logo}" alt="" />` : ""}</div>
</div>

${CAPITULOS.map((c) => hojasDeCapitulo(c, logo)).join("")}

</body></html>`;

  if (openPrintDocument(html)) {
    addActivity("Abrió el manual de uso para descargar", state.user?.name, "");
  }
}

export { abrirManual, abrirManual as abrirManualPortal };
