# Guía de uso — App del taller

> **Demo online:** https://marcmuu.github.io/App-taller/
> **Guía visual con vídeo:** https://marcmuu.github.io/App-taller/guia/
> **Cliente y taller a la vez (ordenador):** https://marcmuu.github.io/App-taller/demo/

---

## 1. Qué es

Una app que conecta un taller mecánico con sus clientes:

- **El cliente**, desde el móvil, pide cita eligiendo un hueco libre en el calendario del taller, explica la avería con fotos, sigue la reparación paso a paso (como el seguimiento de un pedido), ve cuándo estará listo y acepta o rechaza el presupuesto con un botón.
- **El taller**, desde el ordenador o la tablet, ve la agenda de citas, configura su horario y cuántos coches admite por franja, avanza cada reparación con un solo clic, envía presupuestos con fecha estimada y habla con el cliente.

**No es un ERP**: no hay facturación, stock, proveedores ni contabilidad. Solo la comunicación entre taller y cliente.

### El flujo completo

```
Cliente pide cita (hueco libre) → Taller confirma → Cliente deja el coche → Diagnóstico
→ Taller envía presupuesto + fecha estimada → Cliente acepta → Reparación → Listo para recoger → Entregado
```

---

## 2. Cómo probar la demo

La demo trae **datos de prueba** (un taller, empleados, clientes, coches en todos los estados, citas de esta semana…). Lo que hagas se guarda **solo en tu navegador**: nadie más lo ve y puedes romper lo que quieras.

**Cuentas de prueba** (contraseña de todas: `demo1234`, o simplemente pulsa el nombre en la pantalla de entrada):

| Quién | Rol | Situación inicial |
| --- | --- | --- |
| Laura Martínez | Taller · administradora | — |
| Javier Ruiz / Pablo Sánchez | Taller · mecánicos | — |
| Carlos López | Cliente | Seat León con presupuesto pendiente + Toyota Yaris libre |
| Ana García | Cliente | Renault Clio en reparación (con fecha estimada) + cita solicitada |
| Marta Fernández | Cliente | Peugeot 308 listo para recoger + cita el sábado |
| David Romero | Cliente | Ford Focus con el presupuesto **rechazado** |
| Jorge Díaz | Cliente | Audi A3 en reparación + cita confirmada mañana |
| Sergio Gil | Cliente | BMW recibido + una solicitud que el taller **no pudo atender** (para elegir otra fecha) |
| Nuria Vidal | Cliente | Recién registrada, sin coches, con una **consulta general** al taller |

Situaciones del calendario ya preparadas: **mañana a las 10:00 la franja está llena**, **el próximo sábado está completo** y hay **un festivo** dentro de unos días.

**La forma más fácil de verlo todo:** en un ordenador, abre **«Cliente y taller a la vez»** (`/demo`): a la izquierda el móvil del cliente, a la derecha el panel del taller. Entra como **Carlos** y como **Laura** y sigue el recorrido de la sección 5. En el móvil: dos pestañas, una como cliente y otra como taller.

**Reiniciar:** botón **«Reiniciar»** en la vista doble, o **«Demo» → «Reiniciar datos de prueba»** dentro de la app. El botón **«Demo»** también sirve para cambiar de usuario al momento (entre cliente y taller).

---

## 3. App del cliente (móvil)

Abajo siempre hay tres pestañas: **Inicio · Vehículos · Perfil**. Arriba, la **campana** con los avisos.

### 3.1 Crear cuenta y entrar
- **Entrar**: email y contraseña.
- **Crear cuenta** (desde la pantalla de entrada): nombre, teléfono, email y contraseña (mínimo 8 caracteres). No se puede repetir un email. Tras registrarse, la app le pide añadir su coche.

### 3.2 Inicio
- Una **tarjeta por cada coche en el taller**: estado actual en grande, «Paso X de 7», barra de progreso y, si el taller la ha dado, **«Listo aprox.: …»**.
- **Un único botón** con lo que toca hacer:
  - **Naranja «Ver presupuesto»**: el taller espera tu decisión.
  - **Verde «Ver recogida»**: el coche está listo.
  - **«Ver seguimiento»**: no tienes que hacer nada.
- **Solicitudes enviadas** (pendientes de confirmar), con botón **«Anular»**.
- Si el taller no puede a esa hora, aparece un aviso con su mensaje. Si **te propone otra hora**, la aceptas con **«Aceptar esta hora»** (un toque y queda confirmada) o eliges otra con «Prefiero elegir otra fecha».
- **«Solicitar cita»** e **Historial** (las citas anuladas aparecen como «Anulada»).
- Sin coches → invita a añadir uno. Sin citas → explica cómo pedirla.

### 3.3 Mis vehículos
- Lista de coches. **«Añadir»**: país de la matrícula, matrícula, marca, modelo y año opcional.
- **La matrícula se valida según el país** y no se puede guardar si no cumple el formato: España (4 números y 3 letras sin vocales, p. ej. 1234 BCD), España antigua (M 1234 AB), Portugal (AB-12-CD), Francia (AB-123-CD), Italia (AB 123 CD), Alemania (B AB 1234) u otro país. Se guarda con el formato correcto aunque la escribas en minúsculas o sin espacios.
- No se puede registrar una matrícula que ya está en otra cuenta.
- En cada coche: su estado si está en el taller, o **«Pedir cita para este coche»**.

### 3.4 Solicitar cita (6 pasos, una pregunta por pantalla)
1. **¿Qué coche traes?**
2. **¿Qué necesitas?** Avería · Mantenimiento · Testigo encendido · Ruido extraño · Otro.
3. **Cuéntanos qué pasa**: con tus palabras, desde cuándo y si **se puede conducir**.
4. **Fotos y vídeos** (opcional, se puede saltar).
5. **Día y hora — calendario de 3 semanas** con el horario real del taller:
   - Días en **rojo «Lleno»**: no queda ninguna plaza. Días en **gris**: cerrado o festivo. No se pueden elegir.
   - Horas **tachadas «Completo»**: esa franja ya tiene todos los coches que el taller admite. **«Última plaza»**: solo queda un hueco.
   - Si otra persona coge la última plaza mientras decides, la app te avisa y te deja elegir otra. Y si ocurre justo al enviar, te devuelve a este paso.
6. **Revisa y envía**.

Queda **«Pendiente de confirmar»** hasta que el taller la acepte.

**Si el taller no puede atenderte**, en Inicio aparece un aviso con su motivo y el botón **«Elegir otra fecha»**: solo eliges la nueva hora en el calendario; se mantienen el motivo, la descripción y las fotos. También puedes **«Descartar»** el aviso.

### 3.5 Seguimiento de la reparación (la pantalla principal)
- **Estado actual en grande** con una frase sencilla, última actualización y, si existe, **«Listo aproximadamente: …»** (orientativo; si cambia, llega un aviso).
- **Línea de tiempo** con los 6 pasos (Cita confirmada → Vehículo recibido → Diagnóstico → Presupuesto → Reparación iniciada → Listo para recoger) (hechos con día y hora, el actual resaltado, los pendientes en gris). Si algún paso no se hizo (por ejemplo, el coche se devolvió sin reparar), sale tachado como **«No realizado»**.
- Botones: el principal según el momento, **«Contactar con el taller»** y, mientras la cita está confirmada y el coche aún no ha llegado, **«Cambiar fecha»** (eliges otra hora libre y la cita sigue confirmada; el taller recibe un aviso) y **«Anular cita»** (la hora queda libre).
- Cuando el coche se entrega, si el taller tiene enlace de reseñas, aparece **«¿Qué tal ha ido?» → Dejar una reseña**.
- **Se actualiza solo**, sin recargar.

### 3.6 Presupuesto
- Desglose: **Trabajos · Piezas · Mano de obra · Subtotal · IVA · Total**, y la **fecha aproximada** en la que estaría listo.
- **«ACEPTAR PRESUPUESTO»** (pide confirmación; queda registrada la versión aceptada y cuándo).
- **«RECHAZAR / CONSULTAR»**: *Tengo una duda* · *Quiero hablar con el taller* · *No quiero realizar la reparación*.
- **¿Cambias de opinión?** Si lo rechazaste, aparece **«He cambiado de opinión: aceptar»** mientras el taller no te haya devuelto el coche. Con una consulta abierta también puedes aceptar directamente.
- Si el taller envía una **nueva versión**, la anterior avisa y solo se responde a la última.
- Aceptar **no** inicia la reparación automáticamente: la inicia el taller.

### 3.7 Mensajes
- **Icono de mensajes** arriba (junto a la campana) con el número de mensajes sin leer.
- **Consulta con el taller**: para preguntar lo que quieras aunque no tengas ninguna reparación (precios, dudas, citas…).
- **Una conversación por reparación**, con los cambios de estado y presupuestos intercalados.
- Responde cualquier persona del taller; tus mensajes muestran **«Visto»** cuando los han leído. Botón para **llamar**.
- **Fotos**: con el botón de la cámara adjuntas una foto (se puede enviar sola o con texto). Tocándola se ve en grande.
- Acceso también desde **Perfil → Escribir al taller** y desde «Contactar con el taller» en el seguimiento.

### 3.8 Listo para recoger
Horario del taller, dirección con «Cómo llegar», **trabajos realizados y total**, o bien **«Sin reparación»** si se devolvió sin reparar. Botones **Llamar** y **Mensaje**.

### 3.9 Avisos y perfil
- **Campana**: cita confirmada o rechazada (con «Elegir otra fecha»), coche recibido, diagnóstico, presupuesto, reparación iniciada/terminada, listo para recoger, **nueva fecha estimada** y mensajes. Además aparece un aviso emergente al llegar.
- **Perfil**: tus datos, los del taller y cerrar sesión.

---

## 4. Panel del taller (ordenador / tablet)

Menú superior: **Vehículos · Calendario · Comunicaciones · Horario**, campana de avisos y menú de usuario. En el móvil se muestran solo los iconos.

### 4.1 Panel de vehículos
**Solicitudes de cita** arriba: coche, cliente, día y hora, motivo, descripción, si se puede conducir y fotos. **«CONFIRMAR CITA»** o **«No puedo»**: escribes un mensaje al cliente y, si quieres, marcas **«Proponer otra hora»** y eliges una en el calendario. El cliente la acepta con un toque.

**Filtros**: Todos · Citas · Recibidos · Diagnóstico · Presupuesto · Reparación · Listos · **Rechazados**. Los rechazados van aparte para que no abulten los pendientes; en «Todos» salen al final.

**Tarjetas**: coche, matrícula, cliente, hora, estado (con matiz: *Rechazado*, *Consulta*, *Aceptado*), entrega prevista si la hay y **el botón de la siguiente acción**.
- Borde **ámbar** = necesita atención (el cliente aceptó o preguntó). Fondo **rojo suave** = rechazado.

### 4.2 La siguiente acción (un clic por paso)

| Estado actual | Botón | Qué pasa |
| --- | --- | --- |
| Cita confirmada | **MARCAR RECIBIDO** | El cliente ve «Vehículo recibido» |
| Vehículo recibido | **INICIAR DIAGNÓSTICO** | El cliente ve «Diagnóstico» |
| Diagnóstico | **CREAR PRESUPUESTO** · *Reparar sin presupuesto* | Abre el editor, o empieza a reparar si el trabajo ya estaba acordado (pide confirmación) |
| Presupuesto enviado | *Esperando al cliente* | Nada que hacer |
| Cliente aceptó | **INICIAR REPARACIÓN** | El cliente ve «Reparación iniciada» |
| Cliente preguntó | **REVISAR PRESUPUESTO** | Crea una nueva versión (y se responde en la conversación) |
| Cliente rechazó | **NUEVO PRESUPUESTO** · **DEVOLVER SIN REPARAR** | Otra versión, o el coche pasa a «Listo para recoger» sin reparar |
| Reparación iniciada | **TERMINADO · LISTO PARA RECOGER** | Un solo clic: el cliente recibe el aviso para recogerlo |
| Listo para recoger | **ENTREGADO AL CLIENTE** | Pasa al historial (con «Deshacer») |

Los estados se simplificaron: antes había «Reparación terminada» y «Listo para recoger» por separado (dos clics). Ahora al terminar el coche queda directamente listo y el filtro «Reparación» solo muestra lo que se está reparando.

Tras cada clic aparece **«Deshacer»**. **«Corregir estado»** permite arreglar errores con un motivo (queda en el historial).

### 4.3 Ficha del vehículo
Estado, siguiente acción, **entrega prevista** (se puede poner o cambiar en cualquier momento; el cliente recibe un aviso), problema con fotos, presupuesto, historial (quién y cuándo), datos del cliente y conversación.

### 4.4 Crear y enviar presupuesto
- Bloques **Trabajos, Piezas y Mano de obra** (cantidad × precio, total automático) con atajos para las líneas habituales. Si falta algo, la línea explica qué.
- **Plazo estimado de entrega**: Hoy, Mañana, En 2 días, En 3 días, En 1 semana, una fecha y hora exactas o «Sin fecha». Es orientativo y el cliente lo ve con el presupuesto.
- **IVA** editable (21 % por defecto) y totales en tiempo real.
- **Guardar** (borrador invisible para el cliente), **Vista previa** y **Enviar al cliente**.

### 4.5 Respuesta del cliente y versiones
Se ve al momento si el cliente acepta, rechaza, pregunta o **cambia de opinión** (aviso «El cliente ha cambiado de opinión»). Un presupuesto enviado no se edita: **«Crear nueva versión»** copia las líneas y el cliente debe aceptar la nueva.

### 4.6 Calendario de citas
- **Vista semanal** (ordenador) o **día a día** (móvil), con flechas para cambiar de semana y «Hoy».
- Cada franja muestra su **ocupación** (p. ej. **2/2** = llena, en rojo) y los coches: discontinua ámbar = solicitud sin confirmar, azul = confirmada, verde = el coche ya está en el taller. Tocando un coche se abre su ficha.
- Resumen: citas de la semana, pendientes de confirmar y plazas libres.
- Las citas a horas que ya no encajan en el horario (si se cambió después) aparecen como **«Fuera de horario»**.

### 4.7 Horario y capacidad (lo que ven los clientes)
- **Duración de cada franja**: 15 min, 30 min o 1 hora.
- **Horario semanal**: cada día se abre o cierra con un interruptor y tiene uno o varios **tramos** (p. ej. 08:30–13:30 y 15:30–18:30).
- **Coches por franja** en cada tramo (1 a 20). Con 2, cada hora se ofrece a los clientes hasta que tiene 2 reservas; con la tercera ya sale «Completo».
- «Copiar a martes–viernes» para no repetir el lunes. Resumen de franjas y plazas por día y por semana.
- La app no deja guardar tramos que se solapan o demasiado cortos.
- **Días cerrados**: festivos o vacaciones con motivo; desaparecen del calendario del cliente. Se pueden volver a abrir.
- Si al cambiar el horario ya había citas que no encajan, se mantienen y la app avisa para revisarlas.
- Lo pueden cambiar el administrador y los mecánicos.

### 4.8 Comunicaciones y avisos
Se pueden enviar **fotos** en cualquier conversación (botón de la cámara). Todas las conversaciones con buscador y contador de no leídos: **consultas generales** de clientes (aunque no tengan coche en el taller, marcadas como «Consulta general») y la conversación de **cada reparación**. Todo el equipo ve y responde las mismas conversaciones; los mensajes del taller salen a la derecha con el nombre de quien escribió. La campana reúne solicitudes, **citas anuladas por el cliente**, presupuestos aceptados/rechazados/consultas, cambios de opinión y mensajes.

### 4.9 Mi taller y tarjetas QR
Desde el **menú de usuario (tus iniciales) → Mi taller**:
- **Datos del taller**: nombre, teléfono, email, dirección y **enlace para dejar reseñas** (el de tu ficha de Google). Solo los cambia el administrador.
- **Tarjetas QR** para imprimir en A4 (10 tarjetas de 85 × 55 mm con guías de corte):
  - **Tarjeta de la app** (azul): el QR abre la app para pedir cita y seguir el coche.
  - **Tarjeta de reseñas** (crema, con estrellas): el QR lleva a dejar una opinión.
  - Eliges «Mitad y mitad», «Solo app» o «Solo reseñas» y pulsas **Imprimir**. Mejor en cartulina de 250-300 g. Tienes «Probar enlace» para comprobar a dónde lleva cada una.

---

## 5. Recorrido completo recomendado (5–10 minutos)

| # | Quién | Qué hacer |
| --- | --- | --- |
| 1 | Cliente (Carlos) | **Solicitar cita** → Toyota Yaris → motivo → describe → foto → en el calendario fíjate en el día **Lleno**, el **festivo** y la hora **Completo** de mañana a las 10:00 → elige otra → **Enviar** |
| 2 | Taller (Laura) | La solicitud aparece sola → **CONFIRMAR CITA** → mírala en **Calendario** |
| 3 | Taller | En la tarjeta del Yaris: **MARCAR RECIBIDO** → **INICIAR DIAGNÓSTICO** → **CREAR PRESUPUESTO** → atajos + **plazo estimado «Mañana»** → **Enviar** |
| 4 | Cliente | **Ver presupuesto** (con la fecha aproximada) → **ACEPTAR** |
| 5 | Taller | **INICIAR REPARACIÓN** → **TERMINADO · LISTO PARA RECOGER** |
| 6 | Cliente | «¡Listo para recoger!» → **Ver recogida** |
| 7 | Taller | **Horario** → sube a 3 los coches por franja de las mañanas → Guardar |
| 8 | Cliente | Vuelve a pedir cita: mañana a las 10:00 ya tiene «Última plaza» |
| 9 | Cliente (David) | Presupuesto rechazado → **He cambiado de opinión: aceptar** |
| 10 | Taller | El Focus sale de **Rechazados** y aparece **INICIAR REPARACIÓN** |

Prueba también: en la solicitud de **Ana** pulsa **No puedo → Proponer otra hora** y acéptala desde Ana; como **Jorge**, **Cambiar fecha** de su Polo; envía una **foto** por el chat; imprime las **tarjetas QR** desde Mi taller; entra como **Nuria** y escribe al taller desde Mensajes, luego entra como **Laura** y respóndele; entra como **Sergio** y usa **«Elegir otra fecha»**; añade un coche con una matrícula inventada (con vocales no te dejará); rechazar el presupuesto del Seat León (Carlos) y **Devolver sin reparar**, **Anular** una cita, «Corregir estado», «Deshacer», cerrar un **día festivo**, **crear una cuenta** nueva.

---

## 6. Preguntas frecuentes

**¿Se guarda lo que hago?** Solo en tu navegador (es una demo). Otro dispositivo u otro navegador empieza desde cero.

**¿Qué pasa si dos clientes quieren la última plaza a la vez?** Se la queda el primero que envía. El segundo recibe un aviso y elige otra hora.

**¿La fecha estimada es un compromiso?** No, es orientativa. El taller puede cambiarla y el cliente recibe un aviso.

**¿Por qué los cambios aparecen solos?** Cliente y taller están conectados en tiempo real.

**¿El chat funciona entre dos móviles distintos?** En la demo de GitHub Pages no: los datos viven en cada navegador, así que cliente y taller tienen que estar en el mismo navegador (dos pestañas, la vista doble o cerrando sesión y entrando con la otra cuenta). La versión con base de datos (Supabase) ya está hecha: ahí funciona entre cualquier dispositivo y en directo. Ver [DESPLIEGUE_Y_COSTES.md](DESPLIEGUE_Y_COSTES.md).

**¿Se puede instalar?** Sí: en el móvil, menú del navegador → «Añadir a pantalla de inicio».

**¿Límites de la demo?** En la demo del navegador los vídeos pueden ocupar hasta 2 MB. Con Supabase, hasta 50 MB (fotos 10 MB, que se reducen antes de subir).
