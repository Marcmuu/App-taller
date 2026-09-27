/**
 * Contenido de la guía de uso (/guia). Las imágenes son capturas reales de
 * la app guardadas en public/guia/.
 */

export interface GuideStep {
  id: string;
  title: string;
  text: string;
  tips?: string[];
  image: string;
  /** "phone" = captura móvil (estrecha), "desktop" = captura de escritorio. */
  frame: "phone" | "desktop";
}

export const CUSTOMER_STEPS: GuideStep[] = [
  {
    id: "c-login",
    title: "Entrar",
    text: "El cliente entra con su email y contraseña. En la demo basta con pulsar una de las cuentas de prueba.",
    image: "c-login",
    frame: "phone",
  },
  {
    id: "c-registro",
    title: "Crear cuenta",
    text: "Un cliente nuevo se registra en un minuto: nombre, teléfono, email y contraseña. Después la app le pide añadir su coche.",
    image: "c-registro",
    frame: "phone",
  },
  {
    id: "c-inicio",
    title: "Inicio: tu coche de un vistazo",
    text: "La pantalla de inicio muestra cada coche que está en el taller, en qué paso va (p. ej. «Paso 4 de 7») y un único botón con lo siguiente que hay que hacer.",
    tips: [
      "Botón naranja «Ver presupuesto»: el taller espera tu decisión.",
      "Botón verde «Ver recogida»: el coche está listo.",
      "Si no hay nada pendiente: «Ver seguimiento».",
      "Debajo: solicitudes de cita enviadas, botón «Solicitar cita» e historial de reparaciones.",
    ],
    image: "c-inicio",
    frame: "phone",
  },
  {
    id: "c-vehiculos",
    title: "Mis vehículos",
    text: "Lista de coches del cliente con su matrícula. Desde aquí se añade un coche nuevo o se pide cita directamente para uno.",
    tips: [
      "La matrícula se valida según el país: España (1234 BCD, sin vocales), España antigua (M 1234 AB), Portugal, Francia, Italia, Alemania u otro país.",
      "No se puede registrar una matrícula que ya tiene otra cuenta.",
    ],
    image: "c-vehiculos",
    frame: "phone",
  },
  {
    id: "c-cita-motivo",
    title: "Pedir cita · 1. Coche y motivo",
    text: "Asistente de 6 pasos, una pregunta por pantalla. Primero se elige el coche y después el motivo: avería, mantenimiento, testigo encendido, ruido extraño u otro. Con un toque se pasa al siguiente paso.",
    image: "c-cita-motivo",
    frame: "phone",
  },
  {
    id: "c-averia",
    title: "Pedir cita · 2. Qué le pasa",
    text: "El cliente lo cuenta con sus palabras, indica desde cuándo pasa y si el coche se puede conducir (sí / no / no sé). No es un diagnóstico técnico.",
    image: "c-averia",
    frame: "phone",
  },
  {
    id: "c-fotos",
    title: "Pedir cita · 3. Fotos y vídeos",
    text: "Opcional: fotos del testigo, vídeo del ruido… Se ven en miniatura y se pueden quitar. También se puede saltar este paso.",
    image: "c-fotos",
    frame: "phone",
  },
  {
    id: "c-fecha",
    title: "Pedir cita · 4. Día y hora",
    text: "Calendario de las próximas 3 semanas con el horario real del taller. Solo se puede elegir lo que tiene plaza libre.",
    tips: [
      "Días en rojo «Lleno»: no queda ninguna plaza. Días en gris: cerrado o festivo.",
      "Horas tachadas «Completo»: ya tienen todos los coches que el taller admite en esa franja.",
      "«Última plaza»: solo queda un hueco en esa hora.",
      "Si otra persona reserva la última plaza mientras decides, la app te avisa y te deja elegir otra.",
    ],
    image: "c-fecha",
    frame: "phone",
  },
  {
    id: "c-resumen",
    title: "Pedir cita · 5. Revisar y enviar",
    text: "Resumen de todo con opción de «Cambiar» cada dato. Al enviar, la solicitud llega al taller al instante y queda «Pendiente de confirmar» hasta que el taller la acepte. Mientras el coche no haya llegado, el cliente puede anular la solicitud o la cita y la hora queda libre.",
    image: "c-resumen",
    frame: "phone",
  },
  {
    id: "c-seguimiento",
    title: "Seguimiento de la reparación",
    text: "La pantalla principal del producto, como el seguimiento de un pedido: arriba el estado actual en grande, debajo la línea de tiempo con los 7 pasos y la hora de cada uno. Se actualiza sola, sin recargar.",
    tips: [
      "Cita confirmada → Vehículo recibido → Diagnóstico → Presupuesto pendiente → Reparación iniciada → Listo para recoger.",
      "Cuando el taller da una fecha estimada, aparece «Listo aproximadamente: …» (orientativa; si cambia, llega un aviso).",
      "También muestra lo que el cliente contó al pedir la cita y sus fotos.",
    ],
    image: "c-seguimiento",
    frame: "phone",
  },
  {
    id: "c-presupuesto",
    title: "Presupuesto",
    text: "Desglose claro: trabajos, piezas, mano de obra, subtotal, IVA y total, y la fecha aproximada en la que estaría listo. Dos botones grandes: «Aceptar presupuesto» (pide confirmación) y «Rechazar / Consultar».",
    tips: ["Aceptar no inicia la reparación solo: el taller la inicia cuando pulsa su botón."],
    image: "c-presupuesto",
    frame: "phone",
  },
  {
    id: "c-consultar",
    title: "Rechazar o consultar",
    text: "Tres opciones: «Tengo una duda» (escribe la pregunta), «Quiero hablar con el taller» (el taller recibe el aviso para llamarte) o «No quiero realizar la reparación». El taller se entera al momento.",
    image: "c-consultar",
    frame: "phone",
  },
  {
    id: "c-rechazado",
    title: "¿Cambias de opinión?",
    text: "Si el cliente rechazó el presupuesto pero luego lo quiere hacer, puede aceptarlo con «He cambiado de opinión: aceptar», mientras el taller no le haya devuelto el coche. El taller lo ve al momento como aceptado.",
    image: "c-rechazado",
    frame: "phone",
  },
  {
    id: "c-mensajes",
    title: "Mensajes con el taller",
    text: "Icono de mensajes arriba (con contador): una consulta general con el taller, aunque no tengas ninguna reparación, y una conversación por cada reparación con sus cambios de estado y presupuestos. Responde cualquier persona del taller y ves «Visto» cuando han leído tu mensaje.",
    image: "c-mensajes",
    frame: "phone",
  },
  {
    id: "c-chat-foto",
    title: "Fotos en el chat",
    text: "Con el botón de la cámara se adjunta una foto a cualquier conversación, sola o con texto: un testigo del salpicadero, un ruido que se ve, la pieza que te han cambiado… Tocándola se ve en grande.",
    image: "c-chat-foto",
    frame: "phone",
  },
  {
    id: "c-recogida",
    title: "Listo para recoger",
    text: "Cuando el coche está listo: horario del taller, dirección con enlace a «Cómo llegar», trabajos realizados, total a pagar y botones para llamar o escribir.",
    image: "c-recogida",
    frame: "phone",
  },
  {
    id: "c-avisos",
    title: "Avisos, cita rechazada y perfil",
    text: "La campana muestra los avisos (cita confirmada, presupuesto recibido, coche listo…) y aparece un aviso emergente al llegar. Si el taller no puede atenderte a la hora pedida, en Inicio sale su motivo y el botón «Elegir otra fecha»: solo eliges la nueva hora, sin repetir la solicitud. En Perfil están tus datos, los del taller y «Escribir al taller».",
    image: "c-avisos",
    frame: "phone",
  },
  {
    id: "c-propuesta",
    title: "El taller te propone otra hora",
    text: "Si el taller no puede a la hora que pediste, puede proponerte otra. En Inicio sale su mensaje y la hora propuesta: «Aceptar esta hora» y la cita queda confirmada con un toque. Si no te viene bien, «Prefiero elegir otra fecha». Una cita ya confirmada también se puede mover con «Cambiar fecha» desde el seguimiento.",
    tips: ["Al entregar el coche aparece «¿Qué tal ha ido?» con un botón para dejar una reseña del taller."],
    image: "c-propuesta",
    frame: "phone",
  },
];

export const WORKSHOP_STEPS: GuideStep[] = [
  {
    id: "t-login",
    title: "Entrar",
    text: "Acceso con email y contraseña para el personal del taller: administrador y mecánicos.",
    image: "t-login",
    frame: "desktop",
  },
  {
    id: "t-dashboard",
    title: "Panel de vehículos",
    text: "La pantalla principal del taller. Cada tarjeta muestra coche, matrícula, cliente, hora de la cita, estado y un botón con la siguiente acción. Se puede trabajar sin abrir cada coche.",
    tips: [
      "Filtros rápidos: Todos, Citas, Recibidos, Diagnóstico, Presupuesto, Reparación, Listos y Rechazados, con su contador.",
      "Las tarjetas con borde ámbar necesitan atención (el cliente aceptó o preguntó por el presupuesto).",
    ],
    image: "t-dashboard",
    frame: "desktop",
  },
  {
    id: "t-solicitud",
    title: "Solicitudes de cita",
    text: "Las citas que piden los clientes aparecen solas arriba del panel, con el motivo, la descripción y las fotos. «Confirmar cita» avisa al cliente y abre el seguimiento; «No puedo» rechaza la solicitud con un mensaje.",
    image: "t-solicitud",
    frame: "desktop",
  },
  {
    id: "t-proponer",
    title: "«No puedo» y proponer otra hora",
    text: "Al pulsar «No puedo» se escribe un mensaje al cliente y, marcando «Proponer otra hora», se elige un hueco libre en el calendario. El cliente la acepta con un toque, sin tener que pedir la cita de nuevo.",
    image: "t-proponer",
    frame: "desktop",
  },
  {
    id: "t-calendario",
    title: "Calendario de citas",
    text: "Vista semanal con los coches que llegan cada día y en qué franja. Cada franja indica su ocupación (p. ej. 2/2 = llena). Tocando un coche se abre su ficha. En el móvil se ve día a día.",
    tips: [
      "Discontinua ámbar: solicitud sin confirmar. Azul: cita confirmada. Verde: el coche ya está en el taller.",
      "Arriba: citas de la semana, pendientes de confirmar y plazas libres.",
    ],
    image: "t-calendario",
    frame: "desktop",
  },
  {
    id: "t-horario",
    title: "Horario y capacidad",
    text: "El taller decide qué días y horas se pueden traer coches, la duración de cada franja (15, 30 o 60 min) y cuántos coches admite por franja en cada tramo. Es exactamente lo que ven los clientes al reservar.",
    tips: [
      "Ejemplo: mañanas con 2 coches por franja y tardes con 1. Con 2, una hora se ofrece hasta que tiene 2 reservas.",
      "«Días cerrados»: festivos o vacaciones; desaparecen del calendario de los clientes.",
      "Pueden cambiarlo tanto el administrador como los mecánicos.",
    ],
    image: "t-horario",
    frame: "desktop",
  },
  {
    id: "t-detalle",
    title: "Ficha del vehículo",
    text: "Todo en una pantalla: estado, botón de siguiente acción, problema que contó el cliente con sus fotos, resumen del presupuesto, historial de estados (quién y cuándo), datos de contacto y la conversación.",
    tips: [
      "Siguiente acción, un clic: MARCAR RECIBIDO → INICIAR DIAGNÓSTICO → CREAR PRESUPUESTO → (el cliente acepta) → INICIAR REPARACIÓN → TERMINADO · LISTO PARA RECOGER → ENTREGADO AL CLIENTE.",
      "Al terminar basta un clic: el coche pasa a «Listo para recoger» y el cliente recibe el aviso.",
      "«Reparar sin presupuesto» (en diagnóstico) para trabajos ya acordados, como un mantenimiento a precio cerrado.",
      "Tras cada clic aparece «Deshacer» por si fue un error.",
      "«Entrega prevista»: la fecha orientativa que ve el cliente; se puede cambiar en cualquier momento (le llega un aviso).",
    ],
    image: "t-detalle",
    frame: "desktop",
  },
  {
    id: "t-corregir",
    title: "Corregir estado",
    text: "Opción secundaria para arreglar errores: permite poner cualquier estado y escribir el motivo. Queda registrado en el historial como corrección manual.",
    image: "t-corregir",
    frame: "desktop",
  },
  {
    id: "t-presupuesto",
    title: "Crear presupuesto",
    text: "Líneas separadas en trabajos, piezas y mano de obra (cantidad × precio). Los totales e IVA se calculan solos. Los atajos («+ Diagnosis electrónica», «+ Mano de obra»…) añaden líneas habituales de un toque.",
    tips: [
      "«Plazo estimado de entrega»: Hoy, Mañana, En 2 días… o una fecha y hora exactas. Es orientativo.",
      "«Guardar» deja un borrador que el cliente no ve.",
    ],
    image: "t-presupuesto",
    frame: "desktop",
  },
  {
    id: "t-preview",
    title: "Vista previa y envío",
    text: "«Vista previa» muestra el presupuesto tal como lo verá el cliente. «Enviar al cliente» le avisa y la reparación pasa a «Presupuesto pendiente».",
    image: "t-preview",
    frame: "desktop",
  },
  {
    id: "t-aceptado",
    title: "Respuesta del cliente y versiones",
    text: "El taller ve al momento si el cliente acepta, rechaza o pregunta. Para cambiar un presupuesto ya enviado se crea una nueva versión, que el cliente tendrá que aceptar de nuevo. La aceptación queda ligada a una versión concreta.",
    image: "t-aceptado",
    frame: "desktop",
  },
  {
    id: "t-rechazados",
    title: "Presupuestos rechazados",
    text: "Los rechazados tienen su propio filtro para no mezclarse con los pendientes. Desde ahí: «Nuevo presupuesto» (otra versión) o «Devolver sin reparar», que deja el coche listo para recoger y avisa al cliente. Si el cliente cambia de opinión y acepta, sale solo de Rechazados.",
    image: "t-rechazados",
    frame: "desktop",
  },
  {
    id: "t-comunicaciones",
    title: "Comunicaciones",
    text: "Todas las conversaciones, las más recientes primero, con buscador y contador de no leídos: consultas generales de clientes (aunque no tengan coche en el taller) y la conversación de cada reparación. Todo el equipo ve y responde las mismas conversaciones.",
    image: "t-comunicaciones",
    frame: "desktop",
  },
  {
    id: "t-avisos",
    title: "Avisos del taller",
    text: "La campana reúne lo importante: nuevas solicitudes de cita, presupuestos aceptados, rechazados o con consulta y mensajes nuevos. Cada aviso lleva a su vehículo.",
    image: "t-avisos",
    frame: "desktop",
  },
  {
    id: "t-tarjetas",
    title: "Mi taller y tarjetas QR",
    text: "En el menú de usuario → «Mi taller» están los datos que ven los clientes y el enlace de reseñas de Google. Debajo, las tarjetas QR listas para imprimir en A4 (10 por hoja de 85 × 55 mm): una abre la app y otra lleva a dejar una reseña.",
    tips: [
      "«Mitad y mitad», «Solo app» o «Solo reseñas». Mejor en cartulina gruesa.",
      "Déjalas en el mostrador o dentro del coche al entregarlo.",
    ],
    image: "t-tarjetas",
    frame: "desktop",
  },
];

export const STATUS_TABLE: Array<{ status: string; who: string; how: string }> = [
  { status: "Cita confirmada", who: "Taller", how: "Pulsa «Confirmar cita» en la solicitud." },
  { status: "Vehículo recibido", who: "Taller", how: "«MARCAR RECIBIDO» cuando el cliente deja el coche." },
  { status: "Diagnóstico", who: "Taller", how: "«INICIAR DIAGNÓSTICO»." },
  { status: "Presupuesto pendiente", who: "Taller → Cliente", how: "El taller envía el presupuesto (con fecha estimada); el cliente acepta, rechaza o consulta. Si rechaza, el taller puede hacer otro o devolver el coche sin reparar." },
  { status: "Reparación iniciada", who: "Taller", how: "«INICIAR REPARACIÓN» (si el cliente aceptó) o «Reparar sin presupuesto» si el trabajo ya estaba acordado." },
  { status: "Listo para recoger", who: "Taller", how: "«TERMINADO · LISTO PARA RECOGER»: un solo clic y el cliente recibe el aviso." },
  { status: "Entregado (cerrado)", who: "Taller", how: "«ENTREGADO AL CLIENTE» cuando se lo lleva (con «Deshacer» por si acaso)." },
];

export const DEMO_ACCOUNTS = [
  { role: "Taller · Administradora", name: "Laura Martínez", email: "laura@tallerdemo.es" },
  { role: "Taller · Mecánico", name: "Javier Ruiz", email: "javier@tallerdemo.es" },
  { role: "Cliente · presupuesto pendiente", name: "Carlos López", email: "carlos@demo.es" },
  { role: "Cliente · en reparación", name: "Ana García", email: "ana@demo.es" },
  { role: "Cliente · listo para recoger", name: "Marta Fernández", email: "marta@demo.es" },
  { role: "Cliente · presupuesto rechazado", name: "David Romero", email: "david@demo.es" },
  { role: "Cliente nueva · sin coches", name: "Nuria Vidal", email: "nuria@demo.es" },
];
