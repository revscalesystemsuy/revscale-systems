import Link from "next/link"
import { Check } from "lucide-react"

export default async function PricingPage({ searchParams }: { searchParams: Promise<{ email?: string; new?: string }> }) {
  const params = await searchParams
  const email = String(params.email || "").trim()
  const plans = [
    { name: "STARTER", title: "Starter", price: "99", description: "Para inmobiliarias pequeñas que quieren ordenar su operación comercial.", features: ["3 agentes", "500 leads", "100 propiedades", "Gestión comercial de leads", "Seguimientos y tareas"] },
    { name: "PROFESSIONAL", title: "Professional", price: "249", description: "Para equipos que necesitan priorizar oportunidades y crecer con más control.", popular: true, features: ["15 agentes", "Leads ilimitados", "Matching inteligente", "Analítica avanzada", "Reportes comerciales", "WhatsApp IA preparado"] },
    { name: "ENTERPRISE", title: "Enterprise", price: "499", description: "Para inmobiliarias con equipos grandes, automatizaciones y procesos más complejos.", features: ["Agentes ilimitados", "Multi equipo", "Roles y asignación automática", "Integraciones", "WhatsApp IA preparado", "Soporte prioritario"] },
  ]

  return (
    <main className="min-h-screen bg-[#efe6d8] px-6 py-8 text-[#292722] md:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex items-center justify-between border-b border-[#d5c8b6] pb-5">
          <Link href="/" className="flex items-baseline gap-2"><span className="font-serif text-2xl tracking-tight">RevScale</span><span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8a714d]">PropertyOS</span></Link>
          <Link href="/auth/login" className="text-sm text-[#625d55] transition hover:text-[#292722]">Iniciar sesión</Link>
        </div>

        <div className="mx-auto mt-16 max-w-3xl text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8a714d]">Planes</p>
          <h1 className="mt-4 font-serif text-5xl font-medium tracking-tight text-[#29251f] md:text-6xl">Elegí el nivel de operación que necesita tu equipo.</h1>
          <p className="mt-5 text-base leading-7 text-[#6d665d]">{params.new === "1" ? "Tu cuenta fue creada. Ahora elegí el plan que querés activar." : "Elegí el plan y completá la solicitud de activación."}</p>
        </div>

        <section className="mt-14 grid gap-5 md:grid-cols-3">
          {plans.map((plan) => {
            const requestHref = `/request?plan=${plan.name}${email ? `&email=${encodeURIComponent(email)}` : ""}`
            return (
              <div key={plan.name} className={`rounded-2xl border p-6 shadow-[0_18px_50px_rgba(70,58,42,.05)] ${plan.popular ? "border-[#a99270] bg-[#e5d7c3]" : "border-[#d5c8b6] bg-[#f7f1e8]"}`}>
                <div className="flex min-h-7 items-center justify-between gap-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8a714d]">{plan.name}</p>
                  {plan.popular && <span className="rounded-full border border-[#bda98a] bg-[#f0e6d8] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#705d43]">Más elegido</span>}
                </div>
                <h2 className="mt-5 font-serif text-3xl font-medium text-[#302b25]">{plan.title}</h2>
                <p className="mt-3 min-h-16 text-sm leading-6 text-[#716a61]">{plan.description}</p>
                <div className="mt-7 border-y border-[#d3c6b4] py-6"><span className="font-serif text-5xl font-medium tracking-tight text-[#2d2923]">${plan.price}</span><span className="ml-1 text-sm text-[#787168]">/mes</span></div>
                <ul className="mt-6 space-y-3 text-sm text-[#5f5951]">{plan.features.map((feature) => <li key={feature} className="flex gap-2.5"><Check className="mt-0.5 h-4 w-4 shrink-0 text-[#816d4f]" strokeWidth={1.8} /><span>{feature}</span></li>)}</ul>
                <Link href={requestHref} className={`mt-8 block rounded-md px-5 py-3 text-center text-sm font-medium transition ${plan.popular ? "bg-[#302b25] text-[#f5eee4] hover:bg-[#211e1a]" : "border border-[#b9aa94] text-[#3c3730] hover:bg-[#e9dece]"}`}>Elegir {plan.title}</Link>
              </div>
            )
          })}
        </section>
      </div>
    </main>
  )
}
