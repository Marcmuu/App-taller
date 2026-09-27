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
| Jorge Díaz | Cliente | Audi A3 terminado + cita confirmada mañana |
| Nuria Vidal | Cliente | Recién registrada, sin coches |

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
- **«Solicitar cita»** e **Historial** (las citas anuladas aparecen como «Anulada»).
- Sin coches → invita a añadir uno. Sin citas → explica cómo pedirla.

### 3.3 Mis vehículos
- Lista de coches. **«Añadir»**: matrícula (se pone sola en formato «1234 ABC»), marca, modelo y año opcional.
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

Queda **«Pendiente de confirmar»** hasta que el taller la acepte. Si el taller no puede, recibes un aviso con el motivo.

### 3.5 Seguimiento de la reparación (la pantalla principal)
- **Estado actual en grande** con una frase sencilla, última actualización y, si existe, **«Listo aproximadamente: …»** (orientativo; si cambia, llega un aviso).
- **Línea de tiempo** con los 7 pasos (hechos con día y hora, el actual resaltado, los pendientes en gris). Si algún paso no se hizo (por ejemplo, el coche se devolvió sin reparar), sale tachado como **«No realizado»**.
- Botones: el principal según el momento, **«Contactar con el taller»** y, mientras la cita está confirmada y el coche aún no ha llegado, **«Anular cita»** (la hora queda libre).
- **Se actualiza solo**, sin recargar.

### 3.6 Presupuesto
- Desglose: **Trabajos · Piezas · Mano de obra · Subtotal · IVA · Total**, y la **fecha aproximada** en la que estaría listo.
- **«ACEPTAR PRESUPUESTO»** (pide confirmación; queda registrada la versión aceptada y cuándo).
- **«RECHAZAR / CONSULTAR»**: *Tengo una duda* · *Quiero hablar con el taller* · *No quiero realizar la reparación*.
- **¿Cambias de opinión?** Si lo rechazaste, aparece **«He cambiado de opinión: aceptar»** mientras el taller no te haya devuelto el coche. Con una consulta abierta también puedes aceptar directamente.
- Si el taller envía una **nueva versión**, la anterior avisa y solo se responde a la última.
- Aceptar **no** inicia la reparación automáticamente: la inicia el taller.

### 3.7 Mensajes
Conversación sencilla ligada a la reparación, con los cambios de estado y presupuestos intercalados. Botón para **llamar** al taller.

### 3.8 Listo para recoger
Horario del taller, dirección con «Cómo llegar», **trabajos realizados y total**, o bien **«Sin reparación»** si se devolvió sin reparar. Botones **Llamar** y **Mensaje**.

### 3.9 Avisos y perfil
- **Campana**: cita confirmada o rechazada, coche recibido, diagnóstico, presupuesto, reparación iniciada/terminada, listo para recoger, **nueva fecha estimada** y mensajes. Además aparece un aviso emergente al llegar.
- **Perfil**: tus datos, los del taller y cerrar sesión.

---

## 4. Panel del taller (ordenador / tablet)

Menú superior: **Vehículos · Calendario · Comunicaciones · Horario**, campana de avisos y menú de usuario. En el móvil se muestran solo los iconos.

### 4.1 Panel de vehículos
**Solicitudes de cita** arriba: coche, cliente, día y hora, motivo, descripción, si se puede conducir y fotos. **«CONFIRMAR CITA»** o **«No puedo»** (con mensaje para el cliente).

**Filtros**: Todos · Citas · Recibidos · Diagnóstico · Presupuesto · Reparación · Listos · **Rechazados**. Los rechazados van aparte para que no abulten los pendientes; en «Todos» salen al final.

**Tarjetas**: coche, matrícula, cliente, hora, estado (con matiz: *Rechazado*, *Consulta*, *Aceptado*), entrega prevista si la hay y **el botón de la siguiente acción**.
- Borde **ámbar** = necesita atención (el cliente aceptó o preguntó). Fondo **rojo suave** = rechazado.

### 4.2 La siguiente acción (un clic por paso)

| Estado actual | Botón | Qué pasa |
| --- | --- | --- |
| Cita confirmada | **MARCAR RECIBIDO** | El cliente ve «Vehículo recibido» |
| Vehículo recibido | **INICIAR DIAGNÓSTICO** | El cliente ve «Diagnóstico» |
| Diagnóstico | **CREAR PRESUPUESTO** | Abre el editor |
| Presupuesto enviado | *Esperando al cliente* | Nada que hacer |
| Cliente aceptó | **INICIAR REPARACIÓN** | El cliente ve «Reparación iniciada» |
| Cliente preguntó | **REVISAR PRESUPUESTO** | Crea una nueva versión (y se responde en la conversación) |
| Cliente rechazó | **NUEVO PRESUPUESTO** · **DEVOLVER SIN REPARAR** | Otra versión, o el coche pasa a «Listo para recoger» sin reparar |
| Reparación iniciada | **FINALIZAR REPARACIÓN** | «Reparación terminada» |
| Reparación terminada | **LISTO PARA RECOGER** | Aviso destacado al cliente |
| Listo para recoger | **ENTREGAR Y CERRAR** | Pide confirmación y pasa al historial |

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
Todas las conversaciones con buscador y contador de no leídos. La campana reúne solicitudes, **citas anuladas por el cliente**, presupuestos aceptados/rechazados/consultas, cambios de opinión y mensajes.

---

## 5. Recorrido completo recomendado (5–10 minutos)

| # | Quién | Qué hacer |
| --- | --- | --- |
| 1 | Cliente (Carlos) | **Solicitar cita** → Toyota Yaris → motivo → describe → foto → en el calendario fíjate en el día **Lleno**, el **festivo** y la hora **Completo** de mañana a las 10:00 → elige otra → **Enviar** |
| 2 | Taller (Laura) | La solicitud aparece sola → **CONFIRMAR CITA** → mírala en **Calendario** |
| 3 | Taller | En la tarjeta del Yaris: **MARCAR RECIBIDO** → **INICIAR DIAGNÓSTICO** → **CREAR PRESUPUESTO** → atajos + **plazo estimado «Mañana»** → **Enviar** |
| 4 | Cliente | **Ver presupuesto** (con la fecha aproximada) → **ACEPTAR** |
| 5 | Taller | **INICIAR REPARACIÓN** → **FINALIZAR** → **LISTO PARA RECOGER** |
| 6 | Cliente | «¡Listo para recoger!» → **Ver recogida** |
| 7 | Taller | **Horario** → sube a 3 los coches por franja de las mañanas → Guardar |
| 8 | Cliente | Vuelve a pedir cita: mañana a las 10:00 ya tiene «Última plaza» |
| 9 | Cliente (David) | Presupuesto rechazado → **He cambiado de opinión: aceptar** |
| 10 | Taller | El Focus sale de **Rechazados** y aparece **INICIAR REPARACIÓN** |

Prueba también: rechazar el presupuesto del Seat León (Carlos) y **Devolver sin reparar**, **Anular** una cita, «Corregir estado», «Deshacer», cerrar un **día festivo**, **crear una cuenta** nueva.

---

## 6. Preguntas frecuentes

**¿Se guarda lo que hago?** Solo en tu navegador (es una demo). Otro dispositivo u otro navegador empieza desde cero.

**¿Qué pasa si dos clientes quieren la última plaza a la vez?** Se la queda el primero que envía. El segundo recibe un aviso y elige otra hora.

**¿La fecha estimada es un compromiso?** No, es orientativa. El taller puede cambiarla y el cliente recibe un aviso.

**¿Por qué los cambios aparecen solos?** Cliente y taller están conectados en tiempo real.

**¿Se puede instalar?** Sí: en el móvil, menú del navegador → «Añadir a pantalla de inicio».

**¿Límites de la demo?** Los vídeos subidos pueden ocupar hasta 2 MB. En la versión real, los archivos irán a un almacenamiento en la nube y los datos a una base de datos compartida.
