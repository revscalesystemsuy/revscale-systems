export type PropertyOSUseCase = {
  slug: string;
  number: number;
  title: string;
  category: "Leads" | "Matching" | "Radar" | "Equipo" | "Marketing" | "Dirección" | "Enterprise";
  audience: string;
  productSurface: string;
  withoutRevScale: string;
  withRevScale: string;
  marketingMessage: string;
  ctaLabel: string;
  ctaHref: string;
};

export const propertyOSUseCases: PropertyOSUseCase[] = [
  {
    slug: "lead-portal-fuera-de-horario",
    number: 1,
    title: "Lead de portal a las 22:15",
    category: "Leads",
    audience: "Owner / Gerencia comercial",
    productSurface: "Qué hacer hoy + SLA + ficha de lead",
    withoutRevScale: "Entra la consulta. Un autoresponder puede salir, pero nadie toma ownership. Al día siguiente queda mezclada con otros chats y dirección no sabe cuánto demoró una persona en responder.",
    withRevScale: "El lead entra con fuente, responsable y SLA. Qué hacer hoy lo eleva si no hubo respuesta humana. La ficha conserva contexto y deja visible el próximo paso.",
    marketingMessage: "Automático no significa atendido.",
    ctaLabel: "Ver cómo se prioriza un lead",
    ctaHref: "/demos",
  },
  {
    slug: "nueva-propiedad-compatible",
    number: 2,
    title: "Nueva propiedad compatible",
    category: "Matching",
    audience: "Agente / Gerencia comercial",
    productSurface: "Matching + Opportunity Radar",
    withoutRevScale: "El agente publica la propiedad y espera consultas nuevas. Los compradores de hace semanas quedan quietos en la base aunque la nueva propiedad encaje con lo que buscaban.",
    withRevScale: "Matching detecta clientes existentes y explica por qué hay afinidad. Opportunity Radar ayuda a priorizar a quién vale la pena recontactar.",
    marketingMessage: "Cada propiedad nueva también es una campaña sobre tu propia base.",
    ctaLabel: "Probar el matching",
    ctaHref: "/demos",
  },
  {
    slug: "baja-de-precio-reactivacion",
    number: 3,
    title: "Baja de precio",
    category: "Radar",
    audience: "Agente / Gerencia comercial",
    productSurface: "Opportunity Radar",
    withoutRevScale: "Se actualiza el precio en el inventario. Solo algunos agentes recuerdan qué compradores eran sensibles a ese rango.",
    withRevScale: "El cambio vuelve relevantes oportunidades concretas y el agente puede recontactar con un motivo comercial real, no con un mensaje genérico.",
    marketingMessage: "No preguntes si sigue buscando. Dale una razón para responder.",
    ctaLabel: "Ver reactivación",
    ctaHref: "/demos",
  },
  {
    slug: "agente-licencia-reasignacion",
    number: 4,
    title: "Agente se toma licencia",
    category: "Equipo",
    audience: "Owner / Manager",
    productSurface: "Owner + historial + próxima acción + seguimiento",
    withoutRevScale: "Parte del contexto queda en WhatsApp personal, memoria o conversaciones difíciles de reconstruir. Reasignar significa empezar a investigar cada caso.",
    withRevScale: "Owner, historial, próxima acción y seguimiento permiten reasignar una cartera sin reconstruir desde cero el contexto de cada lead.",
    marketingMessage: "La cartera pertenece al proceso, no a la memoria.",
    ctaLabel: "Ver el flujo de seguimiento",
    ctaHref: "/demos",
  },
  {
    slug: "campana-meta-120-consultas",
    number: 5,
    title: "Campaña de Meta genera 120 consultas",
    category: "Marketing",
    audience: "Marketing / Dirección",
    productSurface: "Marketing ROI + pipeline",
    withoutRevScale: "Marketing ve CPL y ventas ve conversaciones, pero cuesta conectar claramente la campaña con visitas, etapas avanzadas y resultado comercial.",
    withRevScale: "Fuente, etapa, interacción y resultado alimentan la lectura de Marketing ROI para seguir el recorrido desde la consulta hasta el avance comercial.",
    marketingMessage: "Dejá de optimizar solo por lead.",
    ctaLabel: "Ver cómo se conectan las fuentes",
    ctaHref: "/demos",
  },
  {
    slug: "reunion-comercial-lunes",
    number: 6,
    title: "Reunión comercial del lunes",
    category: "Dirección",
    audience: "Manager / Owner",
    productSurface: "Manager + SLA + vencidos + riesgos",
    withoutRevScale: "Cada agente cuenta qué tiene y la reunión se concentra en los casos que alguien recuerda en ese momento.",
    withRevScale: "Manager puede revisar SLA, vencidos, riesgos, negociación y próximas acciones con una misma vista operativa.",
    marketingMessage: "La reunión empieza con evidencia.",
    ctaLabel: "Ver vista Manager",
    ctaHref: "/demos",
  },
  {
    slug: "lead-hot-sin-actividad",
    number: 7,
    title: "Lead HOT sin actividad 24h",
    category: "Leads",
    audience: "Agente / Manager",
    productSurface: "Prioridad + última interacción + vencimiento",
    withoutRevScale: "El lead sigue guardado, pero no genera una señal suficientemente visible para que el equipo actúe a tiempo.",
    withRevScale: "Prioridad, última interacción y vencimiento ayudan a elevar el caso para que el equipo vea que requiere acción.",
    marketingMessage: "Guardado no significa trabajado.",
    ctaLabel: "Ver Qué hacer hoy",
    ctaHref: "/demos",
  },
  {
    slug: "propiedad-vuelve-disponible",
    number: 8,
    title: "Propiedad vuelve a estar disponible",
    category: "Radar",
    audience: "Agente / Gerencia comercial",
    productSurface: "Opportunity Radar + Matching",
    withoutRevScale: "Se cambia el estado del inventario, pero la demanda anterior no vuelve automáticamente al radar del equipo.",
    withRevScale: "Opportunity Radar puede volver a mostrar leads que ya encajaban para que el agente evalúe si existe una nueva razón para contactarlos.",
    marketingMessage: "El inventario cambia. Tu base debería enterarse.",
    ctaLabel: "Ver Opportunity Radar",
    ctaHref: "/demos",
  },
  {
    slug: "por-que-cayo-el-mes",
    number: 9,
    title: "Dueño quiere saber por qué cayó el mes",
    category: "Dirección",
    audience: "Owner / Dirección",
    productSurface: "Volumen + SLA + follow-up + etapas + performance + fuentes",
    withoutRevScale: "Se mira facturación y se reconstruyen explicaciones desde opiniones, planillas o conversaciones sueltas.",
    withRevScale: "Dirección puede revisar volumen, SLA, follow-up, etapas, performance y fuentes para localizar dónde se frenó el sistema comercial.",
    marketingMessage: "No esperes al cierre del mes para descubrir el problema.",
    ctaLabel: "Diagnosticar mi operación",
    ctaHref: "/auditoria-fugas",
  },
  {
    slug: "nueva-sucursal-equipo",
    number: 10,
    title: "Nueva sucursal o equipo",
    category: "Enterprise",
    audience: "Dirección / Operaciones",
    productSurface: "Roles + equipos + asignación + visibilidad",
    withoutRevScale: "Cada equipo termina creando reglas, planillas y chats propios, haciendo más difícil sostener una operación común.",
    withRevScale: "Enterprise permite estructurar roles, equipos, asignación y visibilidad común para escalar el proceso sin multiplicar herramientas paralelas.",
    marketingMessage: "Escalar sin multiplicar el desorden.",
    ctaLabel: "Hablar sobre Enterprise",
    ctaHref: "/pricing",
  },
];

export function getPropertyOSUseCase(slug: string) {
  return propertyOSUseCases.find((item) => item.slug === slug);
}
