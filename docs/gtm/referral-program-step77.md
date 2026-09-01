# Paso 77 — Referral Program

## Programa
RevScale Network.

## Reglas
- Pedir referral después del primer “aha” o una business review positiva, nunca el día de compra.
- Cliente que refiere: crédito equivalente al 50% de una mensualidad.
- El crédito se vuelve elegible solo después de la segunda mensualidad paga del referido.
- Crédito, no cash, para clientes.
- Nuevo cliente: onboarding estándar bonificado o sesión de optimización adicional.
- No combinar con descuentos permanentes.
- Tracking por código RevScale Network y oportunidad B2B con `acquisition_source=REFERRAL`.
- El máximo anual de créditos debe configurarse antes de aprobar recompensas; mientras esté vacío el sistema bloquea aprobación para no inventar una cifra no definida por estrategia.
- La aplicación real del crédito de facturación requiere una referencia auditable y no se marca automáticamente.

## Flujo
1. Admin habilita a un cliente tras evidencia de aha/review positiva.
2. Se genera código `RSN-XXXXXXXX`.
3. Referido se registra en `/referir`.
4. Se crea oportunidad B2B y queda atribuida a RevScale Network.
5. Admin vincula la organización del referido cuando corresponda.
6. `refresh_customer_referral_eligibility` cuenta transacciones `transaction.completed` del customer del referido.
7. Después del segundo pago pasa a `ELIGIBLE_REWARD`.
8. Antes de aprobar: cap anual configurado + ausencia de conflicto con descuento permanente.
9. Crédito aprobado.
10. Una vez aplicado en billing, admin registra referencia y pasa a `CREDIT_APPLIED`.

## Estados
`SUBMITTED → QUALIFIED → PAID_MONTH_1 → ELIGIBLE_REWARD → REWARD_APPROVED → CREDIT_APPLIED`

Salida alternativa: `DISQUALIFIED` con motivo obligatorio.

## Mensaje para pedir referral
“Ya vimos una mejora concreta en la rutina y quería preguntarte algo simple: ¿conocés otra inmobiliaria que tenga este mismo problema de seguimiento, ownership o visibilidad comercial? Si la referís con tu código de RevScale Network y termina activándose y completando su segunda mensualidad, te acreditamos el 50% de una mensualidad. La inmobiliaria referida recibe onboarding estándar bonificado o una sesión extra de optimización.”
