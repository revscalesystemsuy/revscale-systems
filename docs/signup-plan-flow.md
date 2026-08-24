# Signup and plan-selection flow

Public customer journey:

1. `/` — commercial homepage.
2. `/auth/login` — sign in with the same warm cream visual language as PropertyOS.
3. `/auth/sign-up` — create a RevScale account.
4. Successful sign-up redirects to `/pricing?email=<email>&new=1`.
5. `/pricing` — choose Starter, Professional, or Enterprise.
6. Plan CTA redirects to `/request?plan=<plan>&email=<email>`.
7. `/request` — submit company/contact information with email prefilled when available.
8. `/request/success` — confirms the plan request and points the user to email confirmation / login.

`/request` must remain public so unauthenticated newly registered users can complete plan selection. Account confirmation returns to `/auth/login?confirmed=1`; access to `/protected` remains gated by membership/subscription activation.
