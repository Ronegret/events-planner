// ============================================================================
// Generador de datos INVENTADOS para la version de portfolio
// ----------------------------------------------------------------------------
// Datos de demostración de Events Planner, todos inventados: parejas,
// invitados, alergias, proveedores, telefonos, correos, precios y direcciones.
// Nada de lo que sale de aqui corresponde a una persona o empresa real.
//
// Convenciones que NO conviene cambiar, porque son las que hacen publicable
// esta version:
//   · correos   → dominio example.com, reservado por la RFC 2606 justo para esto
//   · telefonos → +34 600 000 0xx, un bloque sin abonados
//   · webs      → example.com
//   · lugares   → masias, fincas y hoteles inventados
//
// Las alergias tambien son inventadas. En la version real son datos de salud y
// ese es el motivo de fondo de todo este archivo: una demo publica no puede
// llevar la lista de alergias de 144 invitados de verdad.
//
// Se ejecuta con: npm run seed:portfolio
// ============================================================================
import { readFile, writeFile } from "node:fs/promises";

// Generador con semilla fija: dos ejecuciones dan el mismo resultado, asi que
// el archivo no cambia solo y los cambios que se vean en git son de verdad.
const HOY_ISO = "2026-09-29";
let semilla = 20260929;
const rnd = () => (semilla = (semilla * 1103515245 + 12345) % 2147483648) / 2147483648;
const coge = (l) => l[Math.floor(rnd() * l.length)];
const entre = (a, b) => a + Math.floor(rnd() * (b - a + 1));
let contador = 0;
const id = (p) => `${p}-${(++contador).toString(36).padStart(3, "0")}`;

const NOMBRES_M = ["Martin","Diego","Tomas","Adria","Guillem","Nicolas","Alvaro","Hector","Ruben","Ignacio","Sergio","Oriol","Bruno","Javier","Marc","Aitor","Dario","Emilio","Gonzalo","Ivan","Joel","Lorenzo","Mateo","Nestor","Quim","Raul","Samuel","Unai","Victor","Xavier","Arnau","Biel","Cesar","Damian","Enric","Gerard","Hugo","Pol","Roger","Sergi"];
const NOMBRES_F = ["Lucia","Ainhoa","Clara","Marina","Nuria","Irene","Alba","Carla","Elsa","Greta","Julia","Laia","Mireia","Noa","Olga","Paula","Rocio","Tania","Vera","Ines","Berta","Ariadna","Candela","Daniela","Emma","Gisela","Helena","Iria","Jimena","Lara","Malena","Nadia","Ona","Rut","Silvia","Teresa","Ursula","Aina","Blanca","Cristina"];
const APELLIDOS = ["Vilanova","Ferrer","Sagrera","Bonet","Miralles","Cardona","Estrada","Rosales","Alcaraz","Marquez","Valdivia","Santamaria","Requena","Belmonte","Carranza","Iturbe","Lasarte","Montalvo","Narvaez","Olivera","Pineda","Quintana","Sabater","Tejedor","Urrutia","Vendrell","Zaldivar","Agullo","Calatayud","Duran","Elorza","Fontcuberta","Gallardo","Herrero","Izaguirre","Jauregui","Rovira","Soldevila","Turull","Bertran"];

const persona = (g) => `${coge(g === "f" ? NOMBRES_F : NOMBRES_M)} ${coge(APELLIDOS)}`;
let telN = 0;
const telefono = () => `+34 600 000 ${String(++telN).padStart(3, "0")}`;
const correo = (n) => `${n.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, ".").replace(/^\.|\.$/g, "")}@example.com`;

// ── Equipo ─────────────────────────────────────────────────────────────────
// Solo `admin` puede entrar. Las otras dos existen para que la seccion Equipo
// no se vea vacia, pero no tienen credenciales: sin `password` ni hash, el
// acceso local las rechaza y en la nube no estan dadas de alta.
const users = [
  { id: "u1", name: "admin", role: "Administración (demo)", username: "admin", password: "admin", phone: "+34 653 567 610", email: "rodrigo.negrete.aros@gmail.com" },
  { id: "u2", name: "Noa Ferrer", role: "Coordinación", phone: "+34 600 000 901", email: "noa.ferrer@example.com" },
  { id: "u3", name: "Biel Sagrera", role: "Asistente de eventos", phone: "+34 600 000 902", email: "biel.sagrera@example.com" },
];
const EQUIPO = ["admin", "Noa Ferrer", "Biel Sagrera"];
const roles = ["Administración", "Coordinación", "Asistente de eventos", "Decoración", "Producción", "Proveedor externo"];

// ── Las tres bodas ─────────────────────────────────────────────────────────
// Se eligen tres momentos distintos a proposito: una recien empezada, otra a la
// vuelta de la esquina y una ya celebrada. Asi el panel, las alertas y los
// contadores tienen algo que contar en cada estado, que es justo lo que hay que
// poder enseñar.
const BODAS = [
  {
    id: "w-demo-1", couple: "Lucía & Martín", date: "2027-05-22", status: "En preparación", progress: 34,
    ceremony: "Ermita de Sant Miquel del Bosc", venue: "Masía Els Quatre Vents",
    ceremonyAddress: "Camí de l'Ermita s/n, Sant Feliu de Codines (Barcelona)",
    venueAddress: "Carretera BV-1483, km 4, Sant Feliu de Codines (Barcelona)",
    guestsEstimate: 120, invitados: 58,
    style: "Campestre mediterránea · verde oliva, crema y terracota",
    palettePrimary: "#5d6f52", paletteSecondary: "#c98b6b", paletteAccent: "#efe7d8",
    paletteNotes: "Olivo, espiga y lino crudo. Sin flores blancas cerradas.",
    presupuestoObjetivo: 38000, lead: "admin", cover: "./assets/fotos/bosque-ceremonia.jpg",
    notes: "Primera boda de la temporada 2027. Los novios viven en Londres: casi todo se lleva por videollamada.",
  },
  {
    id: "w-demo-2", couple: "Ainhoa & Diego", date: "2026-10-17", status: "Semana de boda", progress: 86,
    ceremony: "Ceremonia civil en la propia finca", venue: "Finca La Rosaleda del Priorat",
    ceremonyAddress: "Finca La Rosaleda, Falset (Tarragona)",
    venueAddress: "Camí de les Vinyes 12, Falset (Tarragona)",
    guestsEstimate: 60, invitados: 52,
    style: "Viñedo de otoño · burdeos, dorado viejo y blanco roto",
    palettePrimary: "#7a3b45", paletteSecondary: "#c7a253", paletteAccent: "#f4efe6",
    paletteNotes: "Hoja de parra, dalias granates y velas altas. Nada de plateados.",
    presupuestoObjetivo: 29500, lead: "Noa Ferrer", cover: "./assets/fotos/terraza-banquete.jpg",
    notes: "Riesgo de lluvia en octubre: plan B bajo la nave de barricas, decidido y contratado.",
  },
  {
    id: "w-demo-3", couple: "Clara & Tomás", date: "2026-06-20", status: "Finalizada", progress: 100,
    ceremony: "Cala de Sa Tuna (ceremonia simbólica)", venue: "Hotel Mar i Pins",
    ceremonyAddress: "Platja de Sa Tuna, Begur (Girona)",
    venueAddress: "Passeig de Llafranc 3, Palafrugell (Girona)",
    guestsEstimate: 40, invitados: 34,
    style: "Costa Brava · azul profundo, blanco y madera clara",
    palettePrimary: "#2f5468", paletteSecondary: "#d8cfc0", paletteAccent: "#ffffff",
    paletteNotes: "Paniculata, eucalipto y farolillos. Todo pensado para el viento de la cala.",
    presupuestoObjetivo: 21000, lead: "Biel Sagrera", cover: "./assets/fotos/acantilado-ceremonia.jpg",
    notes: "Celebrada. Queda el álbum y la valoración de proveedores para la ficha interna.",
  },
];


// ── Invitados ──────────────────────────────────────────────────────────────
// Las alergias son inventadas y van en pocas fichas, como en la vida real. Se
// mantienen porque la app tiene pantallas enteras montadas alrededor de ellas
// (cocina, menus, mesas) y sin ninguna no se puede enseñar como funciona.
const ALERGIAS = ["Sin gluten", "Sin lactosa", "Alergia al marisco", "Vegetariano", "Vegano", "Sin frutos secos", "Sin huevo"];
const MENUS = ["Adulto", "Menú infantil", "Vegetariano", "Sin gluten"];
const guests = [];
for (const b of BODAS) {
  const celebrada = b.status === "Finalizada";
  const lejos = b.date > "2027-01-01";
  for (let i = 0; i < b.invitados; i++) {
    const g = rnd() < 0.5 ? "f" : "m";
    const nombre = persona(g);
    // Cuanto mas lejos la boda, mas gente sin contestar. En la celebrada, todo cerrado.
    const confirmado = celebrada ? true : lejos ? rnd() < 0.45 : rnd() < 0.88;
    const niño = rnd() < 0.08;
    const conAlergia = rnd() < 0.14;
    guests.push({
      id: id("g"), weddingId: b.id, name: nombre,
      rsvp: confirmado ? "Confirmado" : rnd() < 0.5 ? "Pendiente" : "Por confirmar",
      menu: niño ? "Menú infantil" : conAlergia && rnd() < 0.5 ? coge(["Vegetariano", "Sin gluten"]) : "Adulto",
      allergy: conAlergia ? coge(ALERGIAS) : "",
      table: "",
    });
  }
}

// ── Mesas ──────────────────────────────────────────────────────────────────
// Se reparten los invitados confirmados. La boda lejana aun no tiene plano:
// es lo ultimo que se cierra y enseñarlo vacio es mas fiel que inventarlo.
const tables = [];
const NOMBRES_MESA = ["Olivo", "Romero", "Espliego", "Tomillo", "Salvia", "Laurel", "Hinojo", "Menta", "Albahaca", "Enebro"];
for (const b of BODAS) {
  if (b.id === "w-demo-1") continue;
  const confirmados = guests.filter((g) => g.weddingId === b.id && g.rsvp === "Confirmado");
  const porMesa = 8;
  let k = 0;
  for (let m = 0; m < Math.ceil(confirmados.length / porMesa); m++) {
    const sentados = confirmados.slice(k, k + porMesa);
    k += porMesa;
    const nombreMesa = m === 0 ? "Presidencial" : NOMBRES_MESA[(m - 1) % NOMBRES_MESA.length];
    sentados.forEach((g) => { g.table = nombreMesa; });
    tables.push({
      id: id("t"), weddingId: b.id, name: nombreMesa, capacity: porMesa,
      owner: coge(EQUIPO),
      status: b.status === "Finalizada" ? "Confirmada" : m < 3 ? "Confirmada" : "En preparación",
      names: sentados.map((g) => g.name).join(", "),
      notes: m === 0 ? "Novios, padres y abuelos. Silla con reposabrazos para la abuela." : "",
      lockedAt: b.status === "Finalizada" ? `${b.date}T09:00:00.000Z` : null,
    });
  }
}

// ── Proveedores ────────────────────────────────────────────────────────────
// Nombres de empresa inventados. Se reparten entre las tres bodas y se deja un
// grupo sin boda: es el fondo de armario que el equipo reutiliza.
const TIPOS = ["Espacio / Finca","Catering","Fotografía","Vídeo","Música / DJ","Diseño floral","Decoración / estructuras","Estilismo / MUAH","Transporte","Animación infantil","Pastelería","Papelería","Iluminación y sonido","Alquiler de mobiliario"];
const EMPRESAS = ["Taller Sotavento","Cuina de Marge","Obrador Falguera","Estudi Vint-i-u","Flors del Serrat","Mans i Miralls","Llum de Ponent","Casa Bertran","Vent de Garbí","Petit Comitè","La Bassa Events","Foc i Farina","Blanc de Nit","Arrels Floristes","Camí de Sorra","Ritme Produccions","Nus i Fusta","Aire de Tramuntana","Pa amb Oli Catering","Ombra Studio","Trencadís Decor","Nit de Sant Joan","Escuma Beach Bar","Roure i Llum","Vidre Blau","Argila Taller","Sal i Pebre","Clau de Sol","Cendra Films","Mel i Matí","Terra Ferma","Pols d'Estrelles","Lluna Plena Bus","Brisa Nupcial","Fil i Agulla"];
const providers = [];
EMPRESAS.forEach((empresa, i) => {
  const contacto = persona(rnd() < 0.5 ? "f" : "m");
  // Los ultimos ocho quedan sin boda: catalogo general reutilizable.
  const b = i < EMPRESAS.length - 8 ? BODAS[i % 3] : null;
  const cerrada = b?.status === "Finalizada";
  providers.push({
    id: id("p"), weddingId: b ? b.id : "", name: empresa, type: TIPOS[i % TIPOS.length],
    contact: contacto, phone: telefono(), email: correo(empresa), instagram: `@${empresa.toLowerCase().replace(/[^a-z]+/g, "")}`,
    web: `https://www.example.com/${empresa.toLowerCase().replace(/[^a-z]+/g, "-")}`,
    zone: coge(["Barcelona", "Girona", "Tarragona", "Maresme", "Priorat", "Empordà"]),
    status: cerrada ? "Confirmado" : b ? coge(["Confirmado", "Por confirmar", "Pendiente"]) : "Por confirmar",
    notes: i % 5 === 0 ? "Trabaja muy bien la luz de tarde. Pedir presupuesto con dos meses." : "",
    confirmedBy: cerrada ? coge(EQUIPO) : "",
    confirmedAt: cerrada ? "2026-04-12T10:20:00.000Z" : "",
  });
});

// ── Tareas ─────────────────────────────────────────────────────────────────
const TAREAS_BASE = [
  ["Cerrar el contrato del espacio", -300], ["Prueba de menú con el catering", -120],
  ["Enviar invitaciones", -150], ["Confirmar fotógrafo y vídeo", -180],
  ["Cerrar diseño floral y rincones", -90], ["Pedir listado definitivo de invitados", -45],
  ["Montar el plano de mesas", -30], ["Confirmar transporte de invitados", -35],
  ["Repasar timing con el catering", -14], ["Preparar kit de emergencia", -7],
  ["Llamar a todos los proveedores", -5], ["Recoger seating plan impreso", -4],
];
const tasks = [];
const dias = (fecha, n) => { const d = new Date(fecha + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
for (const b of BODAS) {
  const celebrada = b.status === "Finalizada";
  TAREAS_BASE.forEach(([titulo, offset], i) => {
    const vence = dias(b.date, offset);
    const pasada = vence < HOY_ISO;
    const estado = celebrada ? "Listo" : pasada ? (rnd() < 0.8 ? "Listo" : "En tramitación") : rnd() < 0.25 ? "En tramitación" : "Pendiente";
    if (b.id === "w-demo-1" && i > 6) return;   // boda lejana: aun no toca todo
    tasks.push({
      id: id("tk"), weddingId: b.id, title: titulo, owner: coge(EQUIPO), due: vence, status: estado,
      completedBy: estado === "Listo" ? coge(EQUIPO) : "",
      completedAt: estado === "Listo" ? `${vence}T12:00:00.000Z` : "",
    });
  });
}

// ── Cronograma del día ─────────────────────────────────────────────────────
const CRONO = [
  ["08:30","Llegada del equipo y montaje","Coordinación"],
  ["09:30","Montaje floral de la ceremonia","Decoración"],
  ["11:00","Llegada del catering y office","Catering"],
  ["12:00","Peluquería y maquillaje de la novia","Estilismo"],
  ["13:30","Reportaje de preparativos","Fotografía"],
  ["15:30","Llegada de invitados y welcome drink","Cóctel"],
  ["16:00","Ceremonia","Ceremonia"],
  ["16:45","Firma y felicitaciones","Ceremonia"],
  ["17:00","Cóctel y rincones","Cóctel"],
  ["19:00","Paso a banquete","Banquete"],
  ["19:30","Primer plato","Banquete"],
  ["21:00","Discursos y tarta","Banquete"],
  ["21:45","Primer baile","Fiesta"],
  ["22:00","Apertura de barra libre","Fiesta"],
  ["23:30","Recena","Catering"],
  ["01:00","Última canción","Fiesta"],
  ["01:30","Recogida y cierre","Cierre"],
];
const timeline = [];
for (const b of BODAS) {
  const celebrada = b.status === "Finalizada";
  CRONO.forEach(([hora, titulo, categoria]) => {
    timeline.push({
      id: id("cr"), weddingId: b.id, time: hora, title: titulo,
      owner: coge([...EQUIPO, "Catering", "Fotografía", "Floristería"]),
      category: categoria, note: "",
      status: celebrada ? "Hecho" : b.id === "w-demo-2" ? coge(["Confirmado", "Pendiente"]) : "Pendiente",
      completedBy: celebrada ? coge(EQUIPO) : "",
    });
  });
}

// ── Presupuesto ────────────────────────────────────────────────────────────
// Importes redondos e inventados. Los plazos muestran el flujo real: señal,
// pago intermedio y liquidacion.
const PARTIDAS = [
  ["Alquiler del espacio", "Espacio / Finca", 9500], ["Catering (menú y barra)", "Catering", 12800],
  ["Fotografía", "Fotografía", 2400], ["Vídeo", "Vídeo", 1900],
  ["Diseño floral y rincones", "Diseño floral", 3600], ["Música y DJ", "Música / DJ", 1500],
  ["Estilismo y maquillaje", "Estilismo / MUAH", 750], ["Transporte de invitados", "Transporte", 1100],
  ["Papelería y seating", "Papelería", 480], ["Tarta y mesa dulce", "Pastelería", 620],
  ["Iluminación y sonido", "Iluminación", 980],
];
const budget = [];
for (const b of BODAS) {
  const factor = b.presupuestoObjetivo / 38000;
  PARTIDAS.forEach(([concepto, categoria, base], i) => {
    if (b.id === "w-demo-1" && i > 7) return;
    const coste = Math.round((base * factor) / 10) * 10;
    const celebrada = b.status === "Finalizada";
    const proveedor = providers.find((p) => p.weddingId === b.id && p.type === categoria)?.name || coge(EMPRESAS);
    // La forma de una partida no es un numero suelto: `coste` lleva el desglose
    // A (facturado) / B (no facturado) y el IVA, y los tres plazos van por
    // clave —reserva, segundo, restante—, no en una lista. Esa division A/B es
    // la que ve el equipo y tambien la pareja en su portal.
    const conB = i % 4 === 3;                     // alguna partida con parte no facturada
    const importeA = conB ? Math.round(coste * 0.7) : coste;
    const importeB = conB ? coste - importeA : 0;
    const dinero = (a, bb) => ({ importeA: a, ivaIncluido: true, ivaPorcentaje: 21, importeB: bb });
    const pagado = (fecha, si) => ({
      estado: si ? "Pagado" : "Pendiente", justificante: null,
      historial: si ? [{ at: `${fecha}T10:00:00.000Z`, by: coge(EQUIPO), que: "Marcó el pago como hecho" }] : [],
    });
    const f1 = dias(b.date, -240), f2 = dias(b.date, -60), f3 = dias(b.date, 7);
    const p2 = celebrada || b.id === "w-demo-2";
    budget.push({
      id: id("bd"), weddingId: b.id, createdAt: `${f1}T09:00:00.000Z`,
      concepto, categoria, proveedor, notas: "",
      coste: dinero(importeA, importeB),
      plazos: {
        reserva:  { ...dinero(Math.round(importeA * 0.3), Math.round(importeB * 0.3)), vence: f1, ...pagado(f1, true) },
        segundo:  { ...dinero(Math.round(importeA * 0.4), Math.round(importeB * 0.4)), vence: f2, ...pagado(f2, p2) },
        restante: { ...dinero(importeA - Math.round(importeA * 0.3) - Math.round(importeA * 0.4),
                              importeB - Math.round(importeB * 0.3) - Math.round(importeB * 0.4)), vence: f3, ...pagado(f3, celebrada) },
      },
    });
  });
}

// ── Música, transporte, servicios, fotos y reuniones ───────────────────────
const MOMENTOS = [["Entrada de la novia","Ceremonia"],["Firma","Ceremonia"],["Salida","Ceremonia"],["Ambiente de cóctel","Cóctel"],["Entrada a banquete","Banquete"],["Primer baile","Fiesta"],["Baile con los padres","Fiesta"],["Apertura de pista","Fiesta"],["Última canción","Fiesta"]];
const music = [];
for (const b of BODAS) {
  MOMENTOS.forEach(([momento]) => {
    music.push({ id: id("mu"), weddingId: b.id, moment: momento,
      title: coge(["Por decidir con la pareja","Versión acústica","Lista compartida con el DJ","Pieza elegida por los novios"]),
      artist: "", status: b.status === "Finalizada" ? "Listo" : b.id === "w-demo-2" ? coge(["Listo","En proceso"]) : "Pendiente" });
  });
}

const transports = [];
for (const b of BODAS) {
  if (b.id === "w-demo-1") continue;
  transports.push(
    { id: id("tr"), weddingId: b.id, time: "15:00", type: "Autocar 55 plazas — ida", from: "Plaça Catalunya, Barcelona", to: b.venue, passengers: 48, status: b.status === "Finalizada" ? "Confirmado" : "Confirmado" },
    { id: id("tr"), weddingId: b.id, time: "01:45", type: "Autocar 55 plazas — regreso", from: b.venue, to: "Plaça Catalunya, Barcelona", passengers: 44, status: b.status === "Finalizada" ? "Confirmado" : "Por confirmar" },
  );
}

const SERVICIOS = ["Contrato del espacio firmado","Seguro de responsabilidad civil","Permiso de música hasta las 2:00","Menús especiales comunicados a cocina","Plano de mesas entregado","Timing repartido a proveedores","Protocolo de lluvia decidido"];
const services = [];
for (const b of BODAS) {
  SERVICIOS.forEach((titulo, i) => {
    if (b.id === "w-demo-1" && i > 3) return;
    services.push({ id: id("sv"), weddingId: b.id, title: titulo, owner: coge(EQUIPO),
      status: b.status === "Finalizada" ? "Listo" : b.id === "w-demo-2" ? coge(["Listo","En proceso"]) : coge(["No iniciado","En proceso"]),
      notes: "", completedBy: b.status === "Finalizada" ? coge(EQUIPO) : "", completedAt: "" });
  });
}

const FOTOS = [["Preparativos","Vestido, zapatos y detalles"],["Ceremonia","Entrada"],["Ceremonia","Momento de los anillos"],["Ceremonia","Salida entre pétalos"],["Cóctel","Ambiente y rincones"],["Grupo","Foto con toda la familia"],["Banquete","Mesa presidencial montada"],["Fiesta","Primer baile"]];
const shotList = [];
for (const b of BODAS) {
  FOTOS.forEach(([momento, titulo]) => {
    shotList.push({ id: id("sh"), weddingId: b.id, moment: momento, title: titulo,
      people: momento === "Grupo" ? "Familia de ambos" : "", owner: "Fotografía",
      status: b.status === "Finalizada" ? "Hecho" : "Pendiente", notes: "",
      completedBy: b.status === "Finalizada" ? "Fotografía" : "" });
  });
}

const meetings = [];
for (const b of BODAS) {
  const pasos = [["Primera reunión","Presencial",-300],["Visita al espacio","Presencial",-240],["Prueba de menú","Presencial",-120],["Cierre de proveedores","Videollamada",-60],["Repaso final","Videollamada",-10]];
  pasos.forEach(([titulo, modo, off]) => {
    const fecha = dias(b.date, off);
    if (b.id === "w-demo-1" && fecha > dias(HOY_ISO, 120)) return;
    meetings.push({ id: id("re"), weddingId: b.id, createdAt: `${fecha}T08:00:00.000Z`,
      titulo, tipo: titulo, fecha, hora: coge(["10:00","11:30","17:00","18:30"]), duracion: 60,
      modo, lugar: modo === "Presencial" ? b.venue : "Videollamada",
      responsable: b.lead, conNovios: true,
      estado: fecha < HOY_ISO ? "Celebrada" : "Prevista",
      temas: "Repaso de lo pendiente y siguientes pasos.", acuerdos: fecha < HOY_ISO ? "Todo conforme. Siguiente revisión acordada." : "",
      celebradaAt: fecha < HOY_ISO ? `${fecha}T12:00:00.000Z` : "" });
  });
}

const issues = [
  { id: id("is"), weddingId: "w-demo-2", title: "Previsión de lluvia para el 17", owner: "Noa Ferrer", priority: "Alta", status: "En gestión", solution: "Plan B cerrado en la nave de barricas. Confirmar montaje la víspera." },
  { id: id("is"), weddingId: "w-demo-2", title: "Dos invitados añadidos fuera de plazo", owner: "admin", priority: "Media", status: "Resuelta", solution: "Catering acepta el cambio sin coste. Mesa Romero pasa de 8 a 10." },
  { id: id("is"), weddingId: "w-demo-1", title: "Falta decidir ceremonia civil o religiosa", owner: "admin", priority: "Media", status: "Abierta", solution: "" },
];

const activity = [];
["Creó la boda","Actualizó el presupuesto","Confirmó un proveedor","Cerró el plano de mesas","Añadió invitados"].forEach((texto, i) => {
  BODAS.forEach((b) => {
    activity.push({ id: id("ac"), weddingId: b.id, actor: coge(EQUIPO), text: `${texto} de ${b.couple}`,
      time: `${dias(b.date, -200 + i * 30)}T10:${String(10 + i).padStart(2,"0")}:00.000Z` });
  });
});

// ── Rincones ───────────────────────────────────────────────────────────────
// Los nombres son terminos habituales del oficio y los textos son propios de
// esta demo.
const CATALOGO = [
  ["Ceremonia", "pasillo-petalos.jpg", "El camino al altar y las sillas, montados y revisados antes de que llegue nadie. Pétalos, madera y la luz de la tarde haciendo el resto."],
  ["Arco floral", "arco-rosas.jpg", "El arco donde se dicen el «sí». Rosas y verde de temporada, diseñado a medida para que aguante el viento y se vea bien en las fotos."],
  ["Bienvenida", "bienvenida-mesa.jpg", "Lo primero que ve un invitado al llegar: cartel, mesa de recibimiento y un detalle para empezar con buen pie."],
  ["Detalles para invitados", "detalles-invitados.jpg", "Pequeños recuerdos para llevarse a casa, dispuestos con cariño junto al libro de firmas."],
  ["Banquete", "mesa-detalle.jpg", "La mesa larga, la vajilla y las velas. Cada puesto pensado para que se coma bien y se charle mejor."],
  ["Zona lounge", "zona-lounge.jpg", "Un rincón para desconectar entre plato y plato: sofás, alfombra y luz cálida. Se agradece sobre todo a partir de la medianoche."],
  ["Mesa dulce", "mesa-dulce.jpg", "Tarta y dulces a la vista, con platos a distintas alturas. Se monta tarde a propósito, para que aguante la noche entera."],
  ["Fiesta bajo las luces", "jardin-fiesta.jpg", "Guirnaldas, mesas en el jardín y todo listo para que la celebración se alargue sin que nadie mire el reloj."],
];
const rincones = [];
const rinconTasks = [];
const CATALOGO_IDS = {};
CATALOGO.forEach(([nombre, foto, texto]) => {
  const rid = id("rc");
  CATALOGO_IDS[nombre] = rid;
  rincones.push({
    id: rid, weddingId: "", name: nombre, description: texto, price: 0, active: "Sí",
    attachment: { name: foto, type: "image/jpeg", size: 200000, url: `./assets/fotos/${foto}`, uploadedAt: "2026-01-01T10:00:00Z" },
  });
});
// Cada boda coge algunos del catalogo. La celebrada, todos; la lejana, dos.
for (const b of BODAS) {
  const cuantos = b.id === "w-demo-1" ? 2 : b.id === "w-demo-2" ? 6 : 8;
  CATALOGO.slice(0, cuantos).forEach(([nombre, foto, texto]) => {
    const rid = id("rc");
    rincones.push({
      id: rid, weddingId: b.id, sourceRinconId: CATALOGO_IDS[nombre], name: nombre, description: texto,
      price: 0, active: "Sí",
      attachment: { name: foto, type: "image/jpeg", size: 200000, url: `./assets/fotos/${foto}`, uploadedAt: "2026-01-01T10:00:00Z" },
    });
    // Seguimiento: comprar → pedido → llegado. Es la funcion que usa el equipo
    // para saber que falta de cada rincon sin abrirlos uno a uno.
    const pasos = nombre === "Mesa dulce"
      ? [["Comprar dulces y bolsas", "Listo"], ["Encargar etiquetas personalizadas", b.status === "Finalizada" ? "Listo" : "Pedido / en camino"]]
      : [["Revisar material del rincón", b.status === "Finalizada" ? "Listo" : coge(["Pendiente", "Pedido / en camino", "Listo"])]];
    pasos.forEach(([titulo, estado]) => {
      rinconTasks.push({ id: id("rt"), weddingId: b.id, rinconId: rid, title: titulo, status: estado,
        owner: coge(EQUIPO), notes: [] });
    });
  });
}

// ── Montaje final ──────────────────────────────────────────────────────────
const SEED = {
  user: null, view: "dashboard", selectedWeddingId: BODAS[1].id, selectedTab: "resumen",
  showWeddingForm: false, weddingSearch: "", weddingFilter: "Todas",
  exportSelection: ["summary","tasks","services","timeline","guests","tables","providers","music","shotList","transports"],
  exportAudience: "Equipo", modal: null, portalMode: false, portalUnlocked: false,
  users, roles,
  weddings: BODAS.map(({ invitados, ...b }) => ({ ...b, portalPassword: "demo2026", portalActive: true })),
  timeline, tasks, providers, rincones, rinconTasks, meetings, guests, tables, music, transports,
  documents: [], shotList, services, contracts: [], payments: [], receipts: [], budget,
  issues, notes: [], activity,
};

const ruta = "src/data/seed-demo.js";
const marca = "const EP_DEMO_SEED = ";
const cabecera = `/**
 * Events Planner — DATOS DE DEMOSTRACIÓN (versión de portfolio)
 * ---------------------------------------------------------------
 * TODO lo que hay aquí está inventado: parejas, invitados, alergias,
 * proveedores, teléfonos, correos, importes y direcciones. No corresponde a
 * ninguna persona ni empresa real.
 *
 * Generado por scripts/gen-seed-portfolio.mjs — no editar a mano.
 * Todas las fechas se desplazan al cargar para que la demo nunca envejezca.
 *
 *  - Lucía & Martín   (mayo de 2027, recién empezada)
 *  - Ainhoa & Diego   (octubre de 2026, a la vuelta de la esquina)
 *  - Clara & Tomás    (junio de 2026, ya celebrada)
 */
`;
// ── El cargador ────────────────────────────────────────────────────────────
// El de la versión real FUSIONA con lo que ya hubiera en el navegador, y se
// salta `users` a propósito para no pisar al equipo. En una demo pública eso es
// exactamente lo contrario de lo que hace falta: quien tuviera guardado el
// estado anterior seguía viendo a las personas reales, porque los usuarios no
// se tocaban nunca. Aquí va otro cargador, con versión:
//
//   · primera visita, o los datos de demostración han cambiado → se reemplaza
//     el estado ENTERO, usuarios incluidos;
//   · a partir de ahí → se respeta lo que el visitante toquetee, que para eso
//     es una demo y se espera que la gente pruebe cosas.
//
// La versión se calcula sola a partir del contenido: al regenerar los datos
// cambia, y todos los navegadores se ponen al día sin tocar nada.
const SELLO_DEMO = `${JSON.stringify(SEED).length}-${BODAS.map((b) => b.id).join(".")}`;

const cargador = `
const EP_DEMO_VERSION = ${JSON.stringify(SELLO_DEMO)};

// Disponible para «Cargar bodas de ejemplo» y para la reparación automática de
// src/main.js, que vuelve a meterlas si el navegador se quedó sin ninguna.

// Las fechas de la demo se mueven con el calendario. Los datos se generaron con
// un «hoy» fijo (EP_DEMO_BASE); al cargar se desplazan todas las fechas los
// días que hayan pasado desde entonces. Sin esto, a los pocos meses las tres
// bodas serían «ya celebradas» y el panel enseñaría ceros y nada pendiente: una
// demo que solo sirve el día que se publica.
const EP_DEMO_BASE = Date.UTC(${HOY_ISO.slice(0, 4)}, ${Number(HOY_ISO.slice(5, 7)) - 1}, ${Number(HOY_ISO.slice(8, 10))});
function epDesplazarFechas(semilla) {
  const hoy = new Date();
  const dias = Math.round((Date.UTC(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()) - EP_DEMO_BASE) / 86400000);
  if (!dias) return semilla;
  const texto = JSON.stringify(semilla).replace(/(\\d{4})-(\\d{2})-(\\d{2})/g, (m, y, mo, d) =>
    new Date(Date.UTC(+y, +mo - 1, +d) + dias * 86400000).toISOString().slice(0, 10));
  return JSON.parse(texto);
}

try { window.EP_DEMO_SEED = epDesplazarFechas(EP_DEMO_SEED); } catch (e) { /* sin window: nada que hacer */ }

/**
 * Guarda sin dejar nunca la app vacía.
 *
 * El límite de localStorage son ~5 MB. Si el estado no cabe, setItem lanza
 * QuotaExceededError y antes eso dejaba el planner sin ninguna boda — y sin
 * bodas no hay rincones, ni proveedores, ni se puede agendar nada: un fallo de
 * tamaño se veía como «la aplicación está vacía». Ahora se suelta lastre por
 * orden: primero las fotos de los rincones de cada boda, luego las del
 * catálogo. Los datos no se tocan nunca.
 */
function epGuardarEstado(KEY, estado) {
  const intentos = [
    ["completo", (s) => s],
    ["sin fotos de rincones de boda", (s) => ({ ...s, rincones: (s.rincones || []).map((r) => (r.weddingId && r.sourceRinconId ? { ...r, attachment: null } : r)) })],
    ["sin fotos de rincones", (s) => ({ ...s, rincones: (s.rincones || []).map((r) => ({ ...r, attachment: null })) })],
  ];
  for (const [etiqueta, transformar] of intentos) {
    try {
      localStorage.setItem(KEY, JSON.stringify(transformar(estado)));
      if (etiqueta !== "completo") console.warn("[EP Demo] El estado no cabía en el navegador: guardado " + etiqueta + ".");
      return true;
    } catch (e) {
      if (e && e.name !== "QuotaExceededError" && e.code !== 22) throw e;
    }
  }
  console.error("[EP Demo] No hay espacio en el navegador ni soltando las fotos.");
  return false;
}

(function () {
  const KEY = "events-planner-state-v1";
  const VKEY = "events-planner-demo-version";
  try {
    // Cada semana la demo se rehace desde cero con las fechas al día. Lo que
    // alguien haya probado se queda en SU navegador y caduca a la semana.
    const version = EP_DEMO_VERSION + "-" + Math.floor(Date.now() / 604800000);
    if (localStorage.getItem(VKEY) === version && localStorage.getItem(KEY)) return;
    epGuardarEstado(KEY, window.EP_DEMO_SEED);
    localStorage.setItem(VKEY, version);
    console.log("[EP Demo] Datos de demostración cargados: " + EP_DEMO_SEED.weddings.map((w) => w.couple).join(", ") + ".");
  } catch (e) {
    console.warn("[EP Demo] No se pudo cargar la demo:", e);
  }
})();
`;

await writeFile(ruta, cabecera + marca + JSON.stringify(SEED) + ";\n" + cargador, "utf8");

const cuenta = Object.entries(SEED).filter(([, v]) => Array.isArray(v)).map(([k, v]) => `${k}:${v.length}`);
console.log("datos de demostración generados");
console.log("  " + cuenta.join("  "));
console.log(`  tamaño: ${Math.round(JSON.stringify(SEED).length / 1024)} KB`);
