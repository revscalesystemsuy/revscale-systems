# WhatsApp LIVE — activación segura

## Estado del producto

RevScale incluye la infraestructura de WhatsApp Business para Professional y Enterprise: webhook firmado de Meta, inbox, creación/actualización de leads, historial, Qualification Agent, handoff humano, estados de entrega y envío humano autenticado.

La existencia del código no significa que una organización esté conectada. El canal se considera **LIVE** solo cuando esa organización tiene un `whatsapp_connections` con `status=CONNECTED`, `phone_number_id` real, webhook `VERIFIED` y su `whatsapp_ai_settings.mode=LIVE` con auto-reply habilitado.

## Secretos

Nunca guardar tokens o App Secrets en tablas ni exponerlos en UI. Se configuran como secretos de Supabase Edge Functions:

- `META_WHATSAPP_VERIFY_TOKEN`
- `META_APP_SECRET`
- `META_WHATSAPP_ACCESS_TOKEN`
- `OPENAI_API_KEY`
- opcional: `META_GRAPH_API_VERSION`
- opcional: `OPENAI_WHATSAPP_MODEL`

## Webhook

Callback de Meta:

`https://pctcbawzeflnyeeiidqi.supabase.co/functions/v1/whatsapp-webhook`

La función GET resuelve el challenge de Meta. POST valida `x-hub-signature-256` con HMAC SHA-256 antes de procesar el payload.

## Flujo de activación de una organización

1. La inmobiliaria dispone de un WABA y número de WhatsApp Business apto para Cloud API.
2. RevScale configura los secretos backend; nunca se ingresan desde el navegador del cliente.
3. Registrar la conexión de la organización con WABA ID, Phone Number ID, número visible y nombre verificado. Mantenerla `PENDING` hasta completar pruebas.
4. Suscribir la app al WABA y verificar el webhook en Meta.
5. Marcar `whatsapp_connections.status=CONNECTED` solo después de confirmar activos reales.
6. Recibir un evento de prueba válido; RevScale actualizará `webhook_status=VERIFIED` y `last_webhook_at`.
7. Dirección revisa configuración, handoff y horario comercial.
8. Recién entonces usar **Activar WhatsApp LIVE**. La acción está bloqueada si conexión/webhook no cumplen el contrato.
9. Probar un mensaje entrante, una respuesta de IA segura, un handoff y una respuesta humana.

## Reglas de seguridad comercial

- La IA solo recibe propiedades AVAILABLE que provienen del matching real del lead.
- Un `context_property_id` devuelto por IA se descarta si no pertenece a ese conjunto.
- Negociación, legal, reclamos, reserva/seña, pedido de humano o baja confianza disparan handoff.
- En handoff se pausa la automatización de esa conversación.
- Un mensaje humano mantiene la IA pausada hasta que el usuario elige explícitamente reactivarla.
- Si el proveedor de IA falla o devuelve una clasificación insegura, el sistema deriva a humano; no inventa una respuesta.
- Si Meta rechaza un envío humano, RevScale no persiste un mensaje ficticio como enviado.

## SLA

Los mensajes salientes se reflejan también en `interactions`:

- `actor=AI` cuenta como primera respuesta automática pero no humana.
- `actor=AGENT|MANAGER|OWNER` cuenta como primera respuesta humana y alimenta el SLA del Paquete 1.

## Multi-tenant

`whatsapp_webhook_events` es backend-only. Conversaciones y mensajes siguen el acceso del lead mediante `private.can_access_lead`, incluido el aislamiento por equipos y asignación en Enterprise.
