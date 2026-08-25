# Executive dashboard

The OWNER-only `/protected/executive` view tracks monthly sales goals, current-month WON events, opportunity aging and currency-safe forecast.

Forecast only includes open leads with `expected_close_date` inside the current month and uses the shared stage probabilities from `lib/pipeline-metrics.ts`.

Sales goals can be defined for the organization, a team or an agent. RLS restricts writes to active OWNER members and limits reads by role/team scope.
