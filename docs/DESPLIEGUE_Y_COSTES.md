# Despliegue y costes

Cómo pasar de la demo a la app real con base de datos, y cuánto cuesta tenerla para un cliente.

- [1. Qué hay ahora](#1-qué-hay-ahora)
- [2. Demo real en Vercel + Supabase (gratis)](#2-demo-real-en-vercel--supabase-gratis)
- [3. Versión 100 % real para un cliente](#3-versión-100--real-para-un-cliente)
- [4. Costes](#4-costes)
- [5. Seguridad: qué está hecho y qué revisar](#5-seguridad-qué-está-hecho-y-qué-revisar)
- [6. Comandos útiles](#6-comandos-útiles)

---

## 1. Qué hay ahora

La app funciona con dos «motores». Se cambia con una variable, sin tocar código:

| `NEXT_PUBLIC_BACKEND` | Dónde se guardan los datos | Para qué |
|---|---|---|
| `mock` | En el navegador de cada persona (localStorage) | Demo de GitHub Pages. Cada móvil ve sus propios datos |
| `supabase` | Base de datos Postgres en Supabase, fotos en Supabase Storage | App real: todos los móviles comparten datos y el chat funciona en directo |

`NEXT_PUBLIC_DEMO_MODE=true` muestra las cuentas demo, el botón **Demo** y **Reiniciar datos**. Con `false` desaparece todo eso y queda la app limpia para un cliente.

La web es estática: no hay servidor propio. El navegador habla directamente con Supabase y la seguridad la aplica la base de datos (RLS, ver [sección 5](#5-seguridad-qué-está-hecho-y-qué-revisar)). Por eso sirve cualquier hosting de webs estáticas.

---

## 2. Demo real en Vercel + Supabase (gratis)

Tiempo aproximado: 20 minutos. Solo tienes que crear las cuentas; el resto son comandos.

### 2.1 Supabase

1. Entra en <https://supabase.com> y crea un proyecto:
   - **Region**: *West EU (Paris)* o *Central EU (Frankfurt)*. Los datos quedan en la UE (RGPD).
   - **Database password**: guárdala, se pide en el paso 3.
2. En **Project Settings → API** copia:
   - `Project URL`
   - `Publishable key` (o `anon`): es pública, va en la web.
   - `Secret key` (o `service_role`): es secreta, **solo para tu ordenador**.
3. En tu ordenador, dentro del proyecto:

   ```bash
   npx supabase login
   npx supabase link --project-ref <ref-del-proyecto>   # el ref sale en la URL del panel
   npx supabase db push                                  # crea tablas, seguridad, funciones y el bucket de fotos
   ```

4. Crea un archivo `.env.production.local` (no se sube a GitHub) con los datos de la nube:

   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=<secret key>
   ```

   Después carga los datos demo en la nube:

   ```bash
   npx tsx --env-file=.env.production.local scripts/db-admin.ts reset
   ```

5. En **Authentication → URL Configuration**:
   - **Site URL**: la URL de Vercel (paso 2.2), p. ej. `https://app-taller.vercel.app`
   - **Redirect URLs**: la misma URL con `/**` al final

6. En **Authentication → Sign In / Providers → Email** decide:
   - Para la demo, desactiva **Confirm email**: así tu amigo se registra y entra al momento.
   - Para un cliente real, déjalo activado (ver 3.3).

### 2.2 Vercel

1. En <https://vercel.com> → **Add New → Project** → importa `Marcmuu/App-taller`.
2. En **Environment Variables** añade:

   | Variable | Valor |
   |---|---|
   | `NEXT_PUBLIC_BACKEND` | `supabase` |
   | `NEXT_PUBLIC_SUPABASE_URL` | `https://<ref>.supabase.co` |
   | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | la publishable key |
   | `NEXT_PUBLIC_DEMO_MODE` | `true` |

   **No** añadas la secret key: la web no la necesita. Si alguien la consigue, se salta toda la seguridad.
3. Pulsa **Deploy**. Cada `git push` a `main` vuelve a publicar la web solo.

Ya puedes abrir la URL en dos móviles, entrar con cuentas distintas y hablar por el chat.

> **Aviso sobre la demo gratuita:** Supabase pausa los proyectos gratis tras 7 días sin uso. Se reactiva con un clic en el panel. Las fechas de los datos demo son relativas al día de carga: si pasan semanas, pulsa **Demo → Reiniciar datos**.

---

## 3. Versión 100 % real para un cliente

### 3.1 Un proyecto por taller (recomendado para empezar)

Cada taller cliente tiene su propio proyecto de Supabase y su propia web, con su dominio. Ventajas:

- Datos totalmente separados. Si un taller se va, le das su base de datos y borras el proyecto.
- Si un taller tiene un problema, no afecta a los demás.
- Nada que cambiar en el código.

La base de datos ya está preparada para tener varios talleres en un mismo proyecto (todo lleva `workshop_id`). Cuando tengas 5-10 talleres, puede compensar pasar a un único proyecto compartido con un solo plan de pago. Para eso faltaría que cada cliente elija su taller al registrarse (hoy se asigna al taller por defecto).

### 3.2 Pasos

1. **Supabase**: proyecto nuevo en la UE, `supabase link` y `supabase db push` (igual que en 2.1).
2. **Quitar la demo y crear el taller real**:

   ```bash
   npx tsx --env-file=.env.production.local scripts/db-admin.ts purge
   npx tsx --env-file=.env.production.local scripts/db-admin.ts create-workshop "Taller Pérez" admin@tallerperez.es "Ana Pérez" "+34 600 000 000"
   ```

   `purge` borra usuarios, taller, fotos y mensajes demo, y desactiva el modo demo en la base de datos. `create-workshop` imprime una contraseña temporal para el administrador. Con eso entra y configura:
   - **Mi taller**: nombre, teléfono, dirección y enlace de reseñas de Google.
   - **Horario**: días, horas y coches por franja.
   - **Tarjetas QR**: se imprimen desde el menú de usuario.

3. **Web**: proyecto de Vercel (o Cloudflare Pages, ver costes) con `NEXT_PUBLIC_DEMO_MODE=false`.
4. **Dominio**: cómpralo (p. ej. `app.tallerperez.es`, o un subdominio del suyo) y añádelo en **Vercel → Settings → Domains**. Vercel te dice qué registro DNS poner. Después cambia la **Site URL** de Supabase al dominio.
5. **Emails** (ver 3.3).
6. **Mecánicos**: por ahora se crean desde el panel de Supabase (**Authentication → Add user**) y se les pone `role = 'mechanic'` y `workshop_id` en la tabla `profiles`. Una pantalla para invitar empleados desde la app es la siguiente mejora recomendada.

### 3.3 Emails

El envío de emails que trae Supabase es de prueba: pocos emails por hora y solo para el equipo del proyecto. Para clientes reales:

1. Crea una cuenta en un proveedor SMTP. Por ejemplo, [Resend](https://resend.com): gratis hasta 3.000 emails/mes.
2. Verifica el dominio del taller en el proveedor.
3. Configúralo en **Supabase → Authentication → Emails → SMTP Settings**.
4. Traduce al español las plantillas (confirmación, recuperar contraseña) en **Authentication → Emails → Templates**.

### 3.4 Legal (España / UE)

- **Política de privacidad y aviso legal** en la web. El taller es el responsable de los datos y tú eres el encargado del tratamiento: firma con él un contrato de encargado.
- Supabase y Vercel ofrecen su **DPA** (acuerdo de tratamiento de datos) en sus paneles. Acéptalos.
- **Cookies**: la app solo guarda la sesión, que es técnica y no necesita banner. Si añades analítica, sí haría falta.
- Los datos (matrículas, teléfonos, fotos) se quedan en la UE si eliges esa región al crear el proyecto.

---

## 4. Costes

Precios orientativos a septiembre de 2026 (IVA no incluido). Compruébalos en la web de cada servicio antes de dar un presupuesto.

### 4.1 Servicios

| Servicio | Gratis | De pago | Cuándo pagar |
|---|---|---|---|
| **Supabase** (BBDD, usuarios, fotos, tiempo real) | 500 MB BBDD, 1 GB fotos, 5 GB de transferencia/mes, 2 proyectos. Se pausa tras 7 días sin uso. Sin copias de seguridad | **Pro: 25 $/mes** por organización. 8 GB BBDD, 100 GB fotos, 250 GB transferencia, copia diaria (7 días), sin pausas. Incluye 10 $/mes de computación (1 proyecto pequeño gratis; cada proyecto extra, unos 10 $/mes) | En cuanto haya un cliente real: por las copias de seguridad y para que no se pause |
| **Vercel** (web) | Hobby: gratis, **solo uso no comercial** | Pro: 20 $/mes por miembro | Para un cliente que paga, Hobby no está permitido |
| **Cloudflare Pages** (web, alternativa) | Gratis, **uso comercial permitido**, ancho de banda ilimitado | — | Alternativa a Vercel para no pagar hosting (la app es estática, funciona igual) |
| **Dominio** | — | `.es`: 7-15 €/año · `.com`: 10-15 €/año | Siempre para un cliente |
| **Email SMTP** (Resend u otro) | 3.000 emails/mes | 20 $/mes (50.000) | Un taller pequeño no pasa del gratis |

### 4.2 Cuánto ocupa un taller

Las fotos se reducen en el móvil antes de subirlas (máximo 1280 px, unos 200-300 KB). Un taller con **15 coches a la semana** y unas 6 fotos por coche:

- Fotos: unos 1,2 GB al año. Los vídeos (hasta 50 MB) son lo que más ocupa: conviene recomendar vídeos cortos.
- Base de datos (citas, mensajes, presupuestos): menos de 50 MB al año.

En resumen, el plan gratis se queda corto de fotos en un año, pero el Pro (100 GB) da para decenas de talleres.

### 4.3 Escenarios

| Escenario | Mensual | Anual aprox. |
|---|---|---|
| Demo para enseñar (Supabase Free + Vercel Hobby) | 0 € | 0 € |
| **1 taller real** (Supabase Pro + Cloudflare Pages + dominio + Resend free) | ~23 € | **~290 €** |
| 1 taller con Vercel Pro en vez de Cloudflare | ~42 € | ~515 € |
| 5 talleres, un proyecto cada uno (1 org Pro + 4 proyectos extra × ~10 $) | ~60 € | ~730 € (~145 € por taller) |
| 5 talleres en un proyecto compartido | ~23 € + dominios | ~350 € |

Precio de venta orientativo para un taller: 29-49 €/mes cubre los costes con margen desde el primer cliente.

---

## 5. Seguridad: qué está hecho y qué revisar

**Hecho y probado** (`npm run test:db` y la batería e2e contra Supabase):

- **RLS en todas las tablas.** Sin sesión solo se ve la ficha pública del taller, el horario y la ocupación de horas (sin nombres). Un cliente solo ve sus coches, citas, reparaciones, presupuestos enviados, mensajes y avisos. El taller ve lo de su taller.
- **No se escribe directamente en las tablas.** Todo cambio pasa por funciones de la base de datos (RPC) que comprueban quién eres, si puedes hacerlo y si el paso tiene sentido. Por ejemplo, no se puede pasar de «cita» a «entregado», ni confirmar una hora llena: dos clientes a la vez a por la última plaza se resuelven con un bloqueo.
- **Fotos en un bucket privado.** Se sirven con enlaces temporales. Cada cliente solo puede subir y ver lo de sus citas y su chat. Un cliente no puede adjuntar la foto de otro.
- La secret key nunca va a la web. Las funciones internas y las de administración (`purge_demo`) no se pueden llamar desde la app.
- Las cuentas demo solo existen mientras el modo demo está activo en la base de datos.

**Antes de un cliente real:**

- [ ] `NEXT_PUBLIC_DEMO_MODE=false` y `db-admin purge` hecho.
- [ ] Confirmación de email activada y SMTP propio.
- [ ] **Authentication → Attack Protection**: activar la protección contra contraseñas filtradas y el CAPTCHA en el registro si aparecen registros basura.
- [ ] Plan Pro, por las copias de seguridad diarias.
- [ ] Revisar **Advisors** en el panel de Supabase: avisa de tablas sin RLS o índices que faltan.

---

## 6. Comandos útiles

```bash
# Local con Supabase en Docker
npx supabase start                    # arranca la BBDD local
npm run db:demo -- reset              # datos demo con fechas de hoy
npm run dev                           # http://localhost:3000

# Tests
npm test                              # dominio + app completa (mock)
npm run test:e2e:supabase             # la misma batería contra Supabase local
npm run test:db                       # seguridad RLS

# Nube (con .env.production.local)
npx supabase db push                  # aplica migraciones nuevas
npx tsx --env-file=.env.production.local scripts/db-admin.ts reset|purge|create-workshop ...
```
