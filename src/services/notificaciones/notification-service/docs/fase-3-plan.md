# Plan Fase 3

Completado:

- Persistencia Supabase para `notifications`.
- Persistencia Supabase para `processed_events`.
- Persistencia Supabase para `push_subscriptions`.
- Mantenimiento de endpoints actuales.
- Idempotencia por `eventId`.
- Pruebas locales exitosas con Supabase.

Pendiente:

- Configurar variables reales en Render si no estan.
- Redeploy Render.
- Validar endpoints en URL publica.
- Completar evidencia de Render.
- Web Push real.
- DLQ real.
- Integracion real por eventos si se exige despues.
- Workers reales.

## Criterios

La incorporacion de Supabase preserva el contrato HTTP actual. Los cambios internos de almacenamiento no obligan a otros grupos a modificar sus integraciones.

No se usa AWS, no se implementa autenticacion y no se versionan credenciales.
