export type SeoPage = {
  slug: string;
  title: string;
  description: string;
  eyebrow: string;
  h1: string;
  intro: string;
  primaryKeyword: string;
  secondaryKeywords: string[];
  problems: { title: string; body: string }[];
  sections: { title: string; body: string }[];
  ctaLabel: string;
  ctaHref: string;
  relatedUseCases: string[];
};

export const seoPages: Record<string, SeoPage> = {
  "crm-inmobiliario-uruguay": {
    slug: "crm-inmobiliario-uruguay",
    title: "CRM inmobiliario en Uruguay | RevScale PropertyOS",
    description: "CRM e inteligencia comercial para inmobiliarias en Uruguay: leads, seguimiento, matching, WhatsApp, pipeline y control de próximas acciones.",
    eyebrow: "CRM inmobiliario Uruguay",
    h1: "Un CRM inmobiliario sirve cuando cada consulta termina en una próxima acción.",
    intro: "RevScale PropertyOS centraliza la operación comercial inmobiliaria y ayuda a priorizar qué lead mover, quién es responsable, qué seguimiento vence y qué propiedad puede encajar. Está pensado para equipos que necesitan control operativo, no otra base de datos que dependa de memoria.",
    primaryKeyword: "crm inmobiliario uruguay",
    secondaryKeywords: ["crm inmobiliario", "crm para inmobiliarias", "crm leads inmobiliarios", "software inmobiliario uruguay"],
    problems: [
      { title: "Leads guardados pero sin movimiento", body: "Una consulta puede existir en el CRM y aun así quedar sin owner, próxima acción o vencimiento claro." },
      { title: "Seguimiento disperso", body: "Cuando el contexto queda entre WhatsApp, planillas y memoria, dirección pierde trazabilidad y el agente pierde tiempo reconstruyendo cada caso." },
      { title: "Inventario y demanda desconectados", body: "Publicar una propiedad nueva no debería significar esperar consultas nuevas si ya existe demanda compatible en la base." },
    ],
    sections: [
      { title: "Qué debería resolver un CRM inmobiliario", body: "Leads, pipeline y propiedades son la base. El valor operativo aparece cuando cada oportunidad tiene responsable, prioridad, contexto y siguiente paso; cuando los seguimientos vencidos son visibles; y cuando matching y reactivación convierten datos existentes en trabajo comercial." },
      { title: "CRM no significa reemplazar todo de un día para otro", body: "RevScale puede convivir durante una migración y enfocarse primero en el flujo comercial. La implementación parte de leads activos, responsables, pipeline, SLA y Qué hacer hoy antes de sumar automatizaciones o integraciones más profundas." },
      { title: "Cómo evaluar si el problema está en el CRM o en el proceso", body: "Antes de comprar software, medí cuántos leads activos tienen owner y próxima acción, cuánto tarda la primera respuesta humana y cuántos seguimientos vencidos revisa el manager. Si esos puntos están sanos, quizá no necesitás otra capa. Si no lo están, hay una fuga operativa concreta para diagnosticar." },
    ],
    ctaLabel: "Diagnosticar mi operación",
    ctaHref: "/auditoria-fugas",
    relatedUseCases: ["lead-portal-fuera-de-horario", "reunion-comercial-lunes", "lead-hot-sin-actividad"],
  },
  "software-inmobiliario": {
    slug: "software-inmobiliario",
    title: "Software inmobiliario para equipos comerciales | RevScale",
    description: "Software inmobiliario para organizar leads, propiedades, seguimiento, matching, pipeline y visibilidad de dirección sin depender de memoria o planillas paralelas.",
    eyebrow: "Software inmobiliario",
    h1: "Software inmobiliario para mover oportunidades, no solo almacenarlas.",
    intro: "La operación comercial de una inmobiliaria suele combinar portales, WhatsApp, propiedades, tareas y conversaciones internas. RevScale PropertyOS concentra el trabajo que ocurre después de que entra la consulta y lo convierte en una cola operativa con prioridad y próxima acción.",
    primaryKeyword: "software inmobiliario",
    secondaryKeywords: ["software para inmobiliarias", "sistema inmobiliario", "gestión inmobiliaria software", "crm inmobiliario"],
    problems: [
      { title: "Demasiadas herramientas paralelas", body: "El dato vive en un sistema, la conversación en otro y el seguimiento en memoria o planillas." },
      { title: "Dirección ve actividad, no proceso", body: "Un dashboard sirve poco si no muestra vencimientos, SLA, riesgo, etapa y siguiente acción." },
      { title: "La base no genera nuevas oportunidades", body: "Compradores anteriores y propiedades nuevas rara vez se conectan automáticamente en el momento adecuado." },
    ],
    sections: [
      { title: "Qué funciones importan de verdad", body: "CRM de leads, propiedades, pipeline, tareas, usuarios y reportes son esperables. Para la operación diaria, RevScale pone el foco en Qué hacer hoy, matching con razones visibles, Opportunity Radar, WhatsApp con handoff y vistas de Manager/Marketing ROI." },
      { title: "Software que entra en la rutina", body: "La implementación no termina al importar datos. Termina cuando el equipo usa la cola diaria, deja próximas acciones, revisa vencidos y dirección hace una revisión semanal con evidencia." },
      { title: "Cómo probarlo sin migrar toda la empresa", body: "El Revenue Recovery Pilot usa una muestra real, define baseline, activa el flujo en siete días y mide durante 45 días si el sistema entra en la operación." },
    ],
    ctaLabel: "Ver cómo funciona en 7 minutos",
    ctaHref: "/demos",
    relatedUseCases: ["nueva-propiedad-compatible", "agente-licencia-reasignacion", "nueva-sucursal-equipo"],
  },
  "seguimiento-leads-inmobiliarios": {
    slug: "seguimiento-leads-inmobiliarios",
    title: "Seguimiento de leads inmobiliarios | Cómo evitar fugas",
    description: "Cómo organizar el seguimiento de leads inmobiliarios con owner, próxima acción, SLA, vencimientos, prioridad y revisión semanal de dirección.",
    eyebrow: "Seguimiento de leads inmobiliarios",
    h1: "El lead no se pierde cuando desaparece. Se pierde cuando nadie sabe qué hacer después.",
    intro: "El seguimiento inmobiliario falla cuando una consulta queda sin responsable, próxima acción o fecha clara. Un autoresponder puede responder en segundos y aun así el lead puede seguir comercialmente desatendido.",
    primaryKeyword: "seguimiento leads inmobiliarios",
    secondaryKeywords: ["cómo hacer seguimiento de leads inmobiliarios", "leads sin seguimiento", "tiempo de respuesta leads inmobiliarios", "crm leads inmobiliarios"],
    problems: [
      { title: "Owner ambiguo", body: "Si nadie es claramente responsable, el lead entra en una zona gris aunque esté registrado." },
      { title: "Próxima acción inexistente", body: "Una nota histórica no sustituye definir qué debe pasar después y cuándo." },
      { title: "Respuesta automática confundida con atención", body: "El SLA que importa debe distinguir autoresponder de primera respuesta humana." },
    ],
    sections: [
      { title: "Un seguimiento útil tiene cinco elementos", body: "Responsable, etapa, última interacción, próxima acción y fecha. Sobre esa base se puede agregar prioridad, temperatura o señales de riesgo sin confundirlas con la etapa comercial." },
      { title: "Qué revisar cada día", body: "Leads de intención alta sin actividad, seguimientos vencidos, oportunidades con SLA en riesgo, visitas o negociaciones sin próximo paso y casos reactivados por un motivo nuevo." },
      { title: "Qué debería revisar un manager cada semana", body: "SLA, vencidos, pipeline, oportunidades estancadas, actividad del equipo y fuentes. La reunión comercial mejora cuando empieza con evidencia y no con casos recordados al azar." },
    ],
    ctaLabel: "Analizar mis últimos leads",
    ctaHref: "/auditoria-fugas",
    relatedUseCases: ["lead-portal-fuera-de-horario", "lead-hot-sin-actividad", "reunion-comercial-lunes"],
  },
  "whatsapp-inmobiliarias": {
    slug: "whatsapp-inmobiliarias",
    title: "WhatsApp para inmobiliarias + CRM | RevScale PropertyOS",
    description: "Cómo integrar WhatsApp al proceso comercial inmobiliario sin convertir el chat en la base de datos: contexto, owner, handoff, seguimiento y próxima acción.",
    eyebrow: "WhatsApp para inmobiliarias",
    h1: "WhatsApp puede ser el canal. No debería ser tu pipeline.",
    intro: "En inmobiliarias, WhatsApp es parte natural de la venta. El problema aparece cuando el chat también se convierte en la memoria del equipo, el historial comercial y el único lugar donde vive el próximo paso.",
    primaryKeyword: "whatsapp inmobiliarias crm",
    secondaryKeywords: ["crm whatsapp inmobiliaria", "cómo organizar whatsapp inmobiliaria", "whatsapp inmobiliarias", "seguimiento whatsapp inmobiliaria"],
    problems: [
      { title: "Contexto atrapado en chats", body: "Cuando un agente se ausenta, reasignar una cartera puede requerir reconstruir conversaciones una por una." },
      { title: "Autoresponder sin ownership", body: "Un mensaje automático no garantiza que una persona haya tomado la oportunidad." },
      { title: "Sin próxima acción estructurada", body: "El chat dice qué se habló; no siempre deja claro qué debe ocurrir después." },
    ],
    sections: [
      { title: "Qué debería quedar fuera del chat", body: "Owner, etapa, prioridad, próxima acción, fecha, preferencias del lead y resultado comercial necesitan estructura para que puedan sobrevivir a cambios de agente, volumen y crecimiento." },
      { title: "Dónde sí ayuda la automatización", body: "Puede confirmar recepción, organizar contexto, sugerir prioridad o detectar señales. La conversación sensible y la decisión comercial siguen siendo humanas; la automatización debería acelerar el proceso, no esconder que nadie respondió." },
      { title: "Handoff sin perder contexto", body: "Cuando el equipo necesita intervenir, el historial relevante y el próximo paso deben quedar disponibles para que una persona continúe sin empezar de cero." },
    ],
    ctaLabel: "Ver flujo Inbox + Lead",
    ctaHref: "/demos",
    relatedUseCases: ["lead-portal-fuera-de-horario", "agente-licencia-reasignacion", "lead-hot-sin-actividad"],
  },
};
