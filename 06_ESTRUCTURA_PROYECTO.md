# Estructura sugerida del proyecto

```text
src/
  app/
    (public)/
      login/
    (customer)/
      app/
        page.tsx
        vehicles/
        appointments/
        repairs/
          [id]/
        estimates/
          [id]/
    (workshop)/
      taller/
        page.tsx
        vehicles/
          [id]/
        estimates/
          [id]/
        communications/

  components/
    ui/
    customer/
    workshop/
    repair/
    estimate/

  lib/
    supabase/
      client.ts
      server.ts
    auth/
    permissions/
    validators/
    constants/

  actions/
    appointments.ts
    repairs.ts
    estimates.ts
    messages.ts

  types/
    database.ts
    domain.ts

supabase/
  migrations/
  seed.sql

public/
```

## Componentes importantes

### RepairStatusTimeline
Usado en cliente.

### RepairCard
Usado en dashboard taller.

### NextRepairActionButton
Calcula y muestra la acción primaria según estado.

### EstimateSummary
Resumen reutilizable.

### MediaUploader
Fotos/vídeos.

### CommunicationTimeline
Mezcla eventos relevantes y mensajes.

## URLs sugeridas

Cliente:
- `/app`
- `/app/vehicles`
- `/app/appointments/new`
- `/app/repairs/[id]`
- `/app/estimates/[id]`

Taller:
- `/taller`
- `/taller/vehicles/[repairId]`
- `/taller/estimates/[estimateId]`
