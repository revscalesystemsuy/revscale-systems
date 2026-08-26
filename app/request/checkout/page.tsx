import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { PaddleCheckoutButton } from "@/components/paddle-checkout-button";
import { PLAN_CATALOG, getPlanPrice, normalizePaidPlan, type BillingCycle, type PaidPlanName } from "@/lib/plan-catalog";

function getPriceId(plan: PaidPlanName, cycle: BillingCycle) {
  const key = `NEXT_PUBLIC_PADDLE_PRICE_${plan}_${cycle}` as
    | "NEXT_PUBLIC_PADDLE_PRICE_STARTER_MONTHLY"
    | "NEXT_PUBLIC_PADDLE_PRICE_STARTER_ANNUAL"
    | "NEXT_PUBLIC_PADDLE_PRICE_PROFESSIONAL_MONTHLY"
    | "NEXT_PUBLIC_PADDLE_PRICE_PROFESSIONAL_ANNUAL"
    | "NEXT_PUBLIC_PADDLE_PRICE_ENTERPRISE_MONTHLY"
    | "NEXT_PUBLIC_PADDLE_PRICE_ENTERPRISE_ANNUAL";
  return process.env[key] || "";
}

export default async function CheckoutPage({ searchParams }: { searchParams: Promise<{ id?: string; plan?: string; cycle?: string }> }) {
  const params = await searchParams;
  const requestId = String(params.id || "");
  const plan = normalizePaidPlan(params.plan);
  const cycle: BillingCycle = String(params.cycle || "MONTHLY").toUpperCase() === "ANNUAL" ? "ANNUAL" : "MONTHLY";
  const planMeta = PLAN_CATALOG[plan];
  const price = getPlanPrice(plan, cycle);
  const clientToken = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN || "";
  const environment = process.env.NEXT_PUBLIC_PADDLE_ENV === "production" ? "production" : "sandbox";
  const priceId = getPriceId(plan, cycle);
  const ready = Boolean(requestId && clientToken && priceId);

  return (
    <main className="min-h-screen bg-[#efe6d8] p-6 text-[#292722] md:p-10">
      <div className="mx-auto max-w-xl">
        <Link href="/" className="flex items-baseline gap-2"><span className="font-serif text-2xl">RevScale</span><span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8a714d]">PropertyOS</span></Link>

        <div className="mt-12 rounded-2xl border border-[#d5c8b6] bg-[#f7f1e8] p-7 shadow-[0_24px_70px_rgba(70,58,42,.08)]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#8a714d]">Checkout seguro · {planMeta.stage}</p>
          <h1 className="mt-3 font-serif text-4xl font-medium">Confirmá tu suscripción</h1>
          <p className="mt-3 text-sm leading-6 text-[#716a61]">{planMeta.title}: {planMeta.description}</p>

          <div className="mt-7 rounded-xl border border-[#d5c8b6] bg-[#eee4d6] p-5">
            <div className="flex items-start justify-between gap-5">
              <div><p className="text-[10px] uppercase tracking-[0.16em] text-[#81796e]">Plan</p><p className="mt-1 font-serif text-2xl text-[#302b25]">{planMeta.title}</p><p className="mt-1 text-xs text-[#756c60]">{planMeta.audience}</p></div>
              <div className="text-right"><p className="text-[10px] uppercase tracking-[0.16em] text-[#81796e]">Total</p><p className="mt-1 font-serif text-2xl text-[#302b25]">USD {price.toLocaleString("en-US")}</p><p className="mt-1 text-xs text-[#756c60]">{cycle === "ANNUAL" ? "12 meses · 2 meses bonificados" : "Renovación mensual"}</p></div>
            </div>
          </div>

          <div className="mt-6 flex items-start gap-3 rounded-xl border border-[#d5c8b6] bg-[#fffaf2] p-4 text-sm leading-6 text-[#625d55]">
            <ShieldCheck className="mt-0.5 shrink-0 text-[#786448]" size={19} />
            <p>RevScale no guarda los datos de tu tarjeta. El cobro y las renovaciones se procesan en el checkout del proveedor de pagos.</p>
          </div>

          <div className="mt-6">
            {requestId ? (
              <PaddleCheckoutButton requestId={requestId} plan={plan} billingCycle={cycle} priceId={priceId} clientToken={clientToken} environment={environment} />
            ) : (
              <p className="rounded-xl border border-[#d6b8b2] bg-[#f7e8e4] p-4 text-sm text-[#8b4c43]">La solicitud de pago no es válida. Volvé a elegir el plan.</p>
            )}
          </div>

          {!ready && requestId && (
            <p className="mt-4 text-xs leading-5 text-[#81796e]">La infraestructura de cobro está preparada, pero el checkout permanece bloqueado si falta el token o el identificador de precio de Paddle. No se genera ningún cargo mientras permanezca así.</p>
          )}

          <Link href={`/pricing?cycle=${cycle}`} className="mt-6 block text-center text-sm text-[#78674e] hover:text-[#4a4238]">Volver a los planes</Link>
        </div>
      </div>
    </main>
  );
}
