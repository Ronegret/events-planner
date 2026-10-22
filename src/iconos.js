// Iconos de la navegación, dibujados como SVG con un único trazo.
//
// Antes eran símbolos Unicode (⌂ ♡ ▣ ▦ ◎ ◇ ❖…). Cada sistema los dibuja con su
// propia tipografía —en un Android se ven de un grosor, en un iPhone de otro, y
// algunos se convierten en emoji a color—, así que el menú, que es lo primero
// que se mira, no tenía un aspecto propio. Aquí el trazo es el mismo en todos
// (1,7 px sobre 24, extremos redondeados) y hereda el color del texto.
const TRAZOS = {
  inicio: '<path d="M3.5 10.5 12 3.5l8.5 7"/><path d="M5.5 9.5V20h4.5v-5.5h4V20h4.5V9.5"/>',
  bodas: '<path d="M12 20.5s-7.5-4.6-7.5-10.2A4.2 4.2 0 0 1 12 7.8a4.2 4.2 0 0 1 7.5 2.5c0 5.6-7.5 10.2-7.5 10.2Z"/>',
  agenda: '<rect x="4" y="5" width="16" height="15" rx="2.5"/><path d="M4 10h16M8.5 3v4M15.5 3v4"/>',
  // Dos alianzas entrelazadas: la boda en la que se está trabajando.
  boda: '<circle cx="9" cy="14.5" r="5"/><circle cx="15.5" cy="14.5" r="5"/><path d="m8 6.5 1-2.2h2.2l1 2.2"/>',
  equipo: '<circle cx="9" cy="8.5" r="3.2"/><path d="M3 20c0-3.4 2.7-5.6 6-5.6s6 2.2 6 5.6"/><circle cx="17" cy="9.5" r="2.4"/><path d="M16.8 14.6c2.6.2 4.2 2 4.2 4.9"/>',
  proveedores: '<path d="m4 9.5 1.6-5.5h12.8L20 9.5"/><path d="M4 9.5a2.7 2.7 0 0 0 5.3 0 2.7 2.7 0 0 0 5.4 0 2.7 2.7 0 0 0 5.3 0"/><path d="M5.5 12v8h13v-8M10 20v-4.5h4V20"/>',
  rincones: '<path d="m12 3.5 2 5.3 5.3 2-5.3 2-2 5.4-2-5.4-5.3-2 5.3-2Z"/><path d="m18.5 16.5.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7Z"/>',
  documentos: '<path d="M6.5 3h7.8l4.2 4.2V21h-12Z"/><path d="M14 3v4.5h4.5M9.5 12.5h5M9.5 16h5"/>',
  novios: '<path d="M14.5 4H20v5.5M20 4l-8.5 8.5"/><path d="M17.5 14v5a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 19V8A1.5 1.5 0 0 1 5 6.5h5"/>',
  guia: '<path d="M3.5 5.8c2.3-1 5.7-.8 8.5 1.2 2.8-2 6.2-2.2 8.5-1.2V19c-2.3-1-5.7-.8-8.5 1.2-2.8-2-6.2-2.2-8.5-1.2Z"/><path d="M12 7v13.2"/>',
  ajustes: '<path d="M4 7h8.5M17 7h3M4 17h3M11.5 17H20"/><circle cx="14.8" cy="7" r="2.3"/><circle cx="9.2" cy="17" r="2.3"/>',
  mas: '<circle cx="5.5" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="18.5" cy="12" r="1.2"/>',
  ojo: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="2.8"/>',
  editar: '<path d="m4 20 1-4L16.5 4.5a2.1 2.1 0 0 1 3 3L8 19Z"/><path d="m14.5 6.5 3 3"/>',
  cerrar: '<path d="m6 6 12 12M18 6 6 18"/>',
  salir: '<path d="M14 4h4.5A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5H14"/><path d="M10 8.5 5.5 12 10 15.5M5.5 12H15"/>',
};

/** SVG listo para insertar. Decorativo (`aria-hidden`): el texto del botón lo nombra. */
function icono(nombre) {
  return `<svg class="icono" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${TRAZOS[nombre] || ""}</svg>`;
}

export { icono };
