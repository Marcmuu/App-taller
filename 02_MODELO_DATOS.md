# Modelo de datos inicial

Modelo conceptual recomendado para el MVP.

## workshops

- id uuid PK
- name text
- slug text unique
- phone text
- email text
- address text
- created_at timestamptz

## profiles

Relacionado con `auth.users`.

- id uuid PK
- full_name text
- phone text
- role enum: `customer | workshop_admin | mechanic`
- workshop_id uuid nullable
- created_at timestamptz

## vehicles

- id uuid PK
- customer_id uuid
- workshop_id uuid nullable
- license_plate text
- make text
- model text
- year int nullable
- vin text nullable
- created_at timestamptz

## appointments

- id uuid PK
- workshop_id uuid
- vehicle_id uuid
- customer_id uuid
- scheduled_at timestamptz
- status enum:
  - requested
  - confirmed
  - cancelled
  - completed
- issue_category text nullable
- issue_description text nullable
- drivable_status enum nullable:
  - yes
  - no
  - unknown
- created_at timestamptz

## appointment_media

- id uuid PK
- appointment_id uuid
- uploaded_by uuid
- storage_path text
- media_type enum: image | video
- created_at timestamptz

## repair_orders

No debe comportarse como una orden ERP compleja; es la entidad de seguimiento de la reparación.

- id uuid PK
- workshop_id uuid
- vehicle_id uuid
- customer_id uuid
- appointment_id uuid nullable
- current_status repair_status
- opened_at timestamptz
- completed_at timestamptz nullable
- created_at timestamptz
- updated_at timestamptz

## repair_status

Enum:

1. appointment_confirmed
2. vehicle_received
3. diagnosis
4. estimate_pending
5. repair_in_progress
6. ready_for_pickup
7. closed

> Cambio respecto al diseño inicial: se eliminó `repair_completed`. Al terminar la reparación el coche pasa directamente a `ready_for_pickup` (un clic menos para el taller). `repair_orders.completed_at` se rellena en ese momento.

Opcional:
- cancelled

## repair_status_history

Nunca depender únicamente del estado actual.
Guardar historial.

- id uuid PK
- repair_order_id uuid
- from_status repair_status nullable
- to_status repair_status
- changed_by uuid
- note text nullable
- created_at timestamptz

## estimates

- id uuid PK
- workshop_id uuid
- repair_order_id uuid
- status enum:
  - draft
  - sent
  - accepted
  - rejected
  - question
- subtotal numeric
- tax_rate numeric
- tax_amount numeric
- total numeric
- sent_at timestamptz nullable
- accepted_at timestamptz nullable
- rejected_at timestamptz nullable
- version int default 1
- created_at timestamptz
- updated_at timestamptz

## estimate_items

- id uuid PK
- estimate_id uuid
- type enum:
  - labor
  - part
  - work
- description text
- quantity numeric
- unit_price numeric
- total numeric
- sort_order int

## messages

- id uuid PK
- workshop_id uuid
- repair_order_id uuid
- sender_id uuid
- body text
- created_at timestamptz
- read_at timestamptz nullable

## notifications

- id uuid PK
- user_id uuid
- repair_order_id uuid nullable
- type text
- title text
- body text
- read_at timestamptz nullable
- created_at timestamptz

## workshop_availability

MVP sencillo para reservar citas.

- id uuid PK
- workshop_id uuid
- weekday int
- start_time time
- end_time time
- slot_minutes int default 30
- is_active boolean

## Principio importante

No meter lógica de inventario o facturación dentro de `estimate_items`.
El presupuesto es únicamente una propuesta económica visible para el cliente.
