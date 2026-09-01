# Paso 81 — Escalado paid con gates

## Objetivo

Escalar paid media únicamente cuando la adquisición de PropertyOS ya sea repetible. El paso no activa gasto ni modifica presupuestos en Google Ads o Meta Ads: registra una decisión auditable y mantiene el cambio externo como acción manual.

## Gates obligatorios

1. Al menos 10 clientes pagos verificados (`stage=PAID` y `paid_at` real).
2. Al menos 3 casos de estudio en estado `READY`.
3. Una review del Paso 80 con gasto real y al menos una demo calificada atribuida.
4. Calidad de tráfico `CLEAN`.
5. Beneficio bruto esperado del primer año informado.
6. CPQD / beneficio bruto esperado <= 25%.
7. Volumen adicional confirmado con evidencia verificable antes de aumentar presupuesto.

## Guardrails económicos

- `<=25%`: puede quedar `READY_TO_SCALE` si todos los demás gates pasan.
- `>25% y <=30%`: no escalar; optimizar primero.
- `>30%`: no escalar. Si el exceso se repite en reviews consecutivas, reestructurar campaña/targeting/mensaje antes de seguir invirtiendo.

## Canales

El Paso 81 aplica únicamente a los dos canales ya preparados:

- Google Search high intent.
- Meta Retargeting first-party.

LinkedIn Ads permanece fuera del loop y no se habilita desde este paso.

## Estado de arranque

Al implementar el paso, producción registra 1 cliente pago verificado, 0 casos `READY`, 0 reviews de optimización paid y 0 filas de spend. Por diseño, cualquier evaluación actual debe quedar bloqueada hasta reunir evidencia suficiente.

## Trazabilidad

Cada evaluación se guarda en `b2b_paid_scaling_decisions` con snapshot de evidencia, presupuesto actual/propuesto, métricas del review, conteos de fundamento, señal de volumen y veredicto. `manual_ads_change_required` siempre debe ser `true`.
