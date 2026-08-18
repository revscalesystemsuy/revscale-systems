/**
 * DEMO DATA — Inmobiliaria Horizonte (Uruguay)
 *
 * Datos 100% ficticios y locales. NO se conecta a Supabase, base de datos,
 * ni ninguna fuente real. Todo /demo depende exclusivamente de este archivo.
 */

export const DEMO_COMPANY = {
  name: "Inmobiliaria Horizonte",
  market: "Uruguay",
  months: 8,
  zones: [
    "Pocitos",
    "Punta Carretas",
    "Carrasco",
    "Malvín",
    "Cordón",
    "Parque Miramar",
    "Buceo",
  ],
} as const

export type Temperature = "HOT" | "WARM" | "COLD"

export type PipelineStage =
  | "Nuevo lead"
  | "Contactado"
  | "Calificado"
  | "Visita"
  | "Negociación"
  | "Cierre"

export const PIPELINE_STAGES: PipelineStage[] = [
  "Nuevo lead",
  "Contactado",
  "Calificado",
  "Visita",
  "Negociación",
  "Cierre",
]

export type DemoLead = {
  id: string
  fullName: string
  email: string
  phone: string
  budgetUSD: number
  zone: string
  propertyType: string
  operation: string
  bedrooms: number
  stage: PipelineStage
  status: string
  score: number
  temperature: Temperature
  lastInteraction: string
  assignedAgentId: string
  nextAction: string
  features: string[]
}

export type DemoProperty = {
  id: string
  title: string
  priceUSD: number
  zone: string
  address: string
  type: string
  operation: string
  bedrooms: number
  bathrooms: number
  areaM2: number
  status: string
  features: string[]
  interested: number
  matches: number
  agentId: string
  demand: "Alta" | "Media" | "Baja"
}

export type DemoAgent = {
  id: string
  name: string
  role: string
  leadsAssigned: number
  hotLeads: number
  interactions: number
  visits: number
  opportunities: number
  conversions: number
  potentialValueUSD: number
}

export type DemoInteraction = {
  id: string
  leadId: string
  leadName: string
  channel: "WhatsApp" | "Llamada" | "Email" | "Visita" | "Nota" | "Follow-up"
  direction: "Entrante" | "Saliente"
  message: string
  actor: string
  date: string
}

export type DemoFollowup = {
  id: string
  leadId: string
  leadName: string
  agent: string
  date: string
  type: string
  priority: "Alta" | "Media" | "Baja"
  action: string
  bucket: "Vencido" | "Hoy" | "Pendiente" | "Próximo"
}

/* ------------------------------------------------------------------ */
/* AGENTES                                                            */
/* ------------------------------------------------------------------ */

export const DEMO_AGENTS: DemoAgent[] = [
  {
    id: "laura-fernandez",
    name: "Laura Fernández",
    role: "Senior",
    leadsAssigned: 42,
    hotLeads: 9,
    interactions: 128,
    visits: 21,
    opportunities: 14,
    conversions: 6,
    potentialValueUSD: 2_180_000,
  },
  {
    id: "santiago-perez",
    name: "Santiago Pérez",
    role: "Senior",
    leadsAssigned: 38,
    hotLeads: 7,
    interactions: 112,
    visits: 18,
    opportunities: 11,
    conversions: 5,
    potentialValueUSD: 1_720_000,
  },
  {
    id: "mariana-silva",
    name: "Mariana Silva",
    role: "Comercial",
    leadsAssigned: 35,
    hotLeads: 5,
    interactions: 94,
    visits: 14,
    opportunities: 9,
    conversions: 4,
    potentialValueUSD: 1_340_000,
  },
  {
    id: "diego-rodriguez",
    name: "Diego Rodríguez",
    role: "Comercial",
    leadsAssigned: 33,
    hotLeads: 4,
    interactions: 81,
    visits: 11,
    opportunities: 7,
    conversions: 3,
    potentialValueUSD: 980_000,
  },
]

export function getAgent(id: string) {
  return DEMO_AGENTS.find((a) => a.id === id)
}

export function agentName(id: string) {
  return getAgent(id)?.name ?? "Sin asignar"
}

/* ------------------------------------------------------------------ */
/* PROPIEDADES                                                        */
/* ------------------------------------------------------------------ */

export const DEMO_PROPERTIES: DemoProperty[] = [
  {
    id: "pocitos-premium",
    title: "Apartamento Pocitos Premium",
    priceUSD: 215_000,
    zone: "Pocitos",
    address: "Av. Brasil y Berro",
    type: "Apartamento",
    operation: "Venta",
    bedrooms: 2,
    bathrooms: 2,
    areaM2: 92,
    status: "Disponible",
    features: ["Garaje", "Balcón", "Piscina", "A estrenar"],
    interested: 12,
    matches: 9,
    agentId: "laura-fernandez",
    demand: "Alta",
  },
  {
    id: "punta-carretas-1",
    title: "Apartamento Punta Carretas",
    priceUSD: 268_000,
    zone: "Punta Carretas",
    address: "Ellauri y Solano García",
    type: "Apartamento",
    operation: "Venta",
    bedrooms: 3,
    bathrooms: 2,
    areaM2: 118,
    status: "Disponible",
    features: ["Garaje", "Vista al mar", "Seguridad 24h"],
    interested: 8,
    matches: 6,
    agentId: "santiago-perez",
    demand: "Alta",
  },
  {
    id: "carrasco-sur",
    title: "Casa Carrasco Sur",
    priceUSD: 495_000,
    zone: "Carrasco",
    address: "Av. Alberdi y Divina Comedia",
    type: "Casa",
    operation: "Venta",
    bedrooms: 4,
    bathrooms: 3,
    areaM2: 320,
    status: "Disponible",
    features: ["Jardín", "Piscina", "Garaje doble", "Parrillero"],
    interested: 6,
    matches: 4,
    agentId: "laura-fernandez",
    demand: "Media",
  },
  {
    id: "malvin-1",
    title: "Apartamento Malvín",
    priceUSD: 178_000,
    zone: "Malvín",
    address: "Av. Rivera y Michigan",
    type: "Apartamento",
    operation: "Venta",
    bedrooms: 2,
    bathrooms: 1,
    areaM2: 74,
    status: "Disponible",
    features: ["Balcón", "Cerca de la rambla"],
    interested: 7,
    matches: 5,
    agentId: "mariana-silva",
    demand: "Media",
  },
  {
    id: "cordon-1",
    title: "Apartamento Cordón",
    priceUSD: 142_000,
    zone: "Cordón",
    address: "Canelones y Tristán Narvaja",
    type: "Apartamento",
    operation: "Venta",
    bedrooms: 1,
    bathrooms: 1,
    areaM2: 52,
    status: "Disponible",
    features: ["A estrenar", "Amenities"],
    interested: 5,
    matches: 3,
    agentId: "diego-rodriguez",
    demand: "Media",
  },
  {
    id: "parque-miramar",
    title: "Casa Parque Miramar",
    priceUSD: 380_000,
    zone: "Parque Miramar",
    address: "Av. Giannattasio Km 15",
    type: "Casa",
    operation: "Venta",
    bedrooms: 3,
    bathrooms: 2,
    areaM2: 240,
    status: "Disponible",
    features: ["Jardín", "Parrillero", "Garaje"],
    interested: 4,
    matches: 3,
    agentId: "santiago-perez",
    demand: "Baja",
  },
  {
    id: "buceo-rambla",
    title: "Apartamento Buceo Rambla",
    priceUSD: 205_000,
    zone: "Buceo",
    address: "Rambla Armenia",
    type: "Apartamento",
    operation: "Venta",
    bedrooms: 2,
    bathrooms: 2,
    areaM2: 88,
    status: "Disponible",
    features: ["Vista al mar", "Garaje", "Balcón"],
    interested: 10,
    matches: 7,
    agentId: "mariana-silva",
    demand: "Alta",
  },
  {
    id: "carrasco-norte",
    title: "Casa Carrasco Norte",
    priceUSD: 620_000,
    zone: "Carrasco",
    address: "Bolonia y Costa Rica",
    type: "Casa",
    operation: "Venta",
    bedrooms: 5,
    bathrooms: 4,
    areaM2: 410,
    status: "Reservada",
    features: ["Piscina", "Jardín amplio", "Garaje doble", "Dependencia"],
    interested: 3,
    matches: 2,
    agentId: "laura-fernandez",
    demand: "Baja",
  },
  {
    id: "pocitos-nuevo",
    title: "Apartamento Pocitos Nuevo",
    priceUSD: 189_000,
    zone: "Pocitos",
    address: "26 de Marzo y Libertad",
    type: "Apartamento",
    operation: "Venta",
    bedrooms: 2,
    bathrooms: 1,
    areaM2: 70,
    status: "Disponible",
    features: ["A estrenar", "Balcón", "Amenities"],
    interested: 9,
    matches: 6,
    agentId: "santiago-perez",
    demand: "Alta",
  },
  {
    id: "penthouse-punta-carretas",
    title: "Penthouse Punta Carretas",
    priceUSD: 720_000,
    zone: "Punta Carretas",
    address: "21 de Setiembre y Williman",
    type: "Penthouse",
    operation: "Venta",
    bedrooms: 3,
    bathrooms: 3,
    areaM2: 165,
    status: "Disponible",
    features: ["Terraza", "Vista al mar", "Piscina privada", "Garaje doble"],
    interested: 6,
    matches: 3,
    agentId: "laura-fernandez",
    demand: "Media",
  },
  {
    id: "malvin-sur",
    title: "Apartamento Malvín Sur",
    priceUSD: 162_000,
    zone: "Malvín",
    address: "Amazonas y Concepción del Uruguay",
    type: "Apartamento",
    operation: "Venta",
    bedrooms: 2,
    bathrooms: 1,
    areaM2: 68,
    status: "Disponible",
    features: ["Balcón", "Luminoso"],
    interested: 5,
    matches: 4,
    agentId: "diego-rodriguez",
    demand: "Media",
  },
  {
    id: "punta-gorda",
    title: "Casa Punta Gorda",
    priceUSD: 540_000,
    zone: "Carrasco",
    address: "Rambla O'Higgins",
    type: "Casa",
    operation: "Venta",
    bedrooms: 4,
    bathrooms: 3,
    areaM2: 300,
    status: "Disponible",
    features: ["Vista al mar", "Piscina", "Jardín", "Parrillero"],
    interested: 7,
    matches: 4,
    agentId: "mariana-silva",
    demand: "Media",
  },
]

export function getProperty(id: string) {
  return DEMO_PROPERTIES.find((p) => p.id === id)
}

/* ------------------------------------------------------------------ */
/* LEADS                                                              */
/* ------------------------------------------------------------------ */

export const DEMO_LEADS: DemoLead[] = [
  {
    id: "martin-rodriguez",
    fullName: "Martín Rodríguez",
    email: "martin.rodriguez@email.com",
    phone: "+598 99 123 456",
    budgetUSD: 220_000,
    zone: "Pocitos",
    propertyType: "Apartamento",
    operation: "Compra",
    bedrooms: 2,
    stage: "Negociación",
    status: "Activo",
    score: 94,
    temperature: "HOT",
    lastInteraction: "Hace 2 horas",
    assignedAgentId: "laura-fernandez",
    nextAction: "Enviar Apartamento Pocitos Premium y coordinar visita",
    features: ["Garaje", "Balcón"],
  },
  {
    id: "sofia-fernandez",
    fullName: "Sofía Fernández",
    email: "sofia.fernandez@email.com",
    phone: "+598 99 234 567",
    budgetUSD: 280_000,
    zone: "Punta Carretas",
    propertyType: "Apartamento",
    operation: "Compra",
    bedrooms: 3,
    stage: "Visita",
    status: "Activo",
    score: 91,
    temperature: "HOT",
    lastInteraction: "Hace 5 horas",
    assignedAgentId: "santiago-perez",
    nextAction: "Coordinar segunda visita a Punta Carretas",
    features: ["Vista al mar", "Garaje", "Seguridad 24h"],
  },
  {
    id: "alejandro-silva",
    fullName: "Alejandro Silva",
    email: "alejandro.silva@email.com",
    phone: "+598 99 345 678",
    budgetUSD: 200_000,
    zone: "Buceo",
    propertyType: "Apartamento",
    operation: "Compra",
    bedrooms: 2,
    stage: "Calificado",
    status: "Activo",
    score: 87,
    temperature: "HOT",
    lastInteraction: "Ayer",
    assignedAgentId: "mariana-silva",
    nextAction: "Enviar opciones sobre la rambla",
    features: ["Vista al mar", "Balcón"],
  },
  {
    id: "camila-pereira",
    fullName: "Camila Pereira",
    email: "camila.pereira@email.com",
    phone: "+598 99 456 789",
    budgetUSD: 165_000,
    zone: "Malvín",
    propertyType: "Apartamento",
    operation: "Compra",
    bedrooms: 2,
    stage: "Contactado",
    status: "Activo",
    score: 78,
    temperature: "WARM",
    lastInteraction: "Hace 2 días",
    assignedAgentId: "diego-rodriguez",
    nextAction: "Enviar 3 propiedades en Malvín",
    features: ["Balcón", "Luminoso"],
  },
  {
    id: "nicolas-gomez",
    fullName: "Nicolás Gómez",
    email: "nicolas.gomez@email.com",
    phone: "+598 99 567 890",
    budgetUSD: 150_000,
    zone: "Cordón",
    propertyType: "Apartamento",
    operation: "Compra",
    bedrooms: 1,
    stage: "Contactado",
    status: "En riesgo",
    score: 61,
    temperature: "WARM",
    lastInteraction: "Hace 4 días",
    assignedAgentId: "diego-rodriguez",
    nextAction: "Reintentar follow-up (no respondió)",
    features: ["A estrenar", "Amenities"],
  },
  {
    id: "lucia-martinez",
    fullName: "Lucía Martínez",
    email: "lucia.martinez@email.com",
    phone: "+598 99 678 901",
    budgetUSD: 500_000,
    zone: "Carrasco",
    propertyType: "Casa",
    operation: "Compra",
    bedrooms: 4,
    stage: "Visita",
    status: "Activo",
    score: 89,
    temperature: "HOT",
    lastInteraction: "Hace 6 horas",
    assignedAgentId: "laura-fernandez",
    nextAction: "Preparar propuesta Casa Carrasco Sur",
    features: ["Jardín", "Piscina", "Garaje doble"],
  },
  {
    id: "federico-alvarez",
    fullName: "Federico Álvarez",
    email: "federico.alvarez@email.com",
    phone: "+598 99 789 012",
    budgetUSD: 195_000,
    zone: "Pocitos",
    propertyType: "Apartamento",
    operation: "Compra",
    bedrooms: 2,
    stage: "Calificado",
    status: "Activo",
    score: 82,
    temperature: "HOT",
    lastInteraction: "Ayer",
    assignedAgentId: "santiago-perez",
    nextAction: "Enviar Apartamento Pocitos Nuevo",
    features: ["A estrenar", "Balcón"],
  },
  {
    id: "valentina-mendez",
    fullName: "Valentina Méndez",
    email: "valentina.mendez@email.com",
    phone: "+598 99 890 123",
    budgetUSD: 260_000,
    zone: "Punta Carretas",
    propertyType: "Apartamento",
    operation: "Compra",
    bedrooms: 3,
    stage: "Nuevo lead",
    status: "Activo",
    score: 68,
    temperature: "WARM",
    lastInteraction: "Hace 3 días",
    assignedAgentId: "santiago-perez",
    nextAction: "Primer contacto por WhatsApp",
    features: ["Garaje", "Vista al mar"],
  },
  {
    id: "diego-cabrera",
    fullName: "Diego Cabrera",
    email: "diego.cabrera@email.com",
    phone: "+598 99 901 234",
    budgetUSD: 390_000,
    zone: "Parque Miramar",
    propertyType: "Casa",
    operation: "Compra",
    bedrooms: 3,
    stage: "Contactado",
    status: "Activo",
    score: 74,
    temperature: "WARM",
    lastInteraction: "Hace 2 días",
    assignedAgentId: "santiago-perez",
    nextAction: "Agendar visita Casa Parque Miramar",
    features: ["Jardín", "Parrillero", "Garaje"],
  },
  {
    id: "florencia-suarez",
    fullName: "Florencia Suárez",
    email: "florencia.suarez@email.com",
    phone: "+598 98 012 345",
    budgetUSD: 145_000,
    zone: "Cordón",
    propertyType: "Apartamento",
    operation: "Compra",
    bedrooms: 1,
    stage: "Nuevo lead",
    status: "Activo",
    score: 55,
    temperature: "COLD",
    lastInteraction: "Hace 6 días",
    assignedAgentId: "diego-rodriguez",
    nextAction: "Enviar opciones económicas en Cordón",
    features: ["Amenities"],
  },
  {
    id: "joaquin-torres",
    fullName: "Joaquín Torres",
    email: "joaquin.torres@email.com",
    phone: "+598 98 123 456",
    budgetUSD: 700_000,
    zone: "Punta Carretas",
    propertyType: "Penthouse",
    operation: "Compra",
    bedrooms: 3,
    stage: "Negociación",
    status: "Activo",
    score: 92,
    temperature: "HOT",
    lastInteraction: "Hace 3 horas",
    assignedAgentId: "laura-fernandez",
    nextAction: "Enviar contrapropuesta Penthouse Punta Carretas",
    features: ["Terraza", "Vista al mar", "Piscina privada"],
  },
  {
    id: "carolina-ramos",
    fullName: "Carolina Ramos",
    email: "carolina.ramos@email.com",
    phone: "+598 98 234 567",
    budgetUSD: 175_000,
    zone: "Malvín",
    propertyType: "Apartamento",
    operation: "Compra",
    bedrooms: 2,
    stage: "Calificado",
    status: "Activo",
    score: 79,
    temperature: "WARM",
    lastInteraction: "Ayer",
    assignedAgentId: "mariana-silva",
    nextAction: "Enviar Apartamento Malvín",
    features: ["Balcón", "Cerca de la rambla"],
  },
  {
    id: "sebastian-acosta",
    fullName: "Sebastián Acosta",
    email: "sebastian.acosta@email.com",
    phone: "+598 98 345 678",
    budgetUSD: 210_000,
    zone: "Buceo",
    propertyType: "Apartamento",
    operation: "Compra",
    bedrooms: 2,
    stage: "Visita",
    status: "Activo",
    score: 85,
    temperature: "HOT",
    lastInteraction: "Hace 8 horas",
    assignedAgentId: "mariana-silva",
    nextAction: "Confirmar visita Apartamento Buceo Rambla",
    features: ["Vista al mar", "Garaje"],
  },
  {
    id: "agustina-lopez",
    fullName: "Agustina López",
    email: "agustina.lopez@email.com",
    phone: "+598 98 456 789",
    budgetUSD: 155_000,
    zone: "Malvín",
    propertyType: "Apartamento",
    operation: "Compra",
    bedrooms: 2,
    stage: "Contactado",
    status: "Activo",
    score: 66,
    temperature: "WARM",
    lastInteraction: "Hace 3 días",
    assignedAgentId: "diego-rodriguez",
    nextAction: "Enviar Apartamento Malvín Sur",
    features: ["Balcón", "Luminoso"],
  },
  {
    id: "gonzalo-pereira",
    fullName: "Gonzalo Pereira",
    email: "gonzalo.pereira@email.com",
    phone: "+598 98 567 890",
    budgetUSD: 470_000,
    zone: "Carrasco",
    propertyType: "Casa",
    operation: "Compra",
    bedrooms: 4,
    stage: "Cierre",
    status: "Ganado",
    score: 96,
    temperature: "HOT",
    lastInteraction: "Hace 1 hora",
    assignedAgentId: "laura-fernandez",
    nextAction: "Firma de boleto de reserva",
    features: ["Jardín", "Piscina", "Parrillero"],
  },
]

export function getLead(id: string) {
  return DEMO_LEADS.find((l) => l.id === id)
}

/* ------------------------------------------------------------------ */
/* MATCHING IA                                                        */
/* ------------------------------------------------------------------ */

export type PropertyMatch = {
  property: DemoProperty
  percent: number
  reasons: string[]
}

/**
 * Calcula propiedades compatibles para un lead con un puntaje IA simulado.
 * El puntaje pondera presupuesto, zona, dormitorios, tipo y características.
 */
export function getMatchesForLead(leadId: string): PropertyMatch[] {
  const lead = getLead(leadId)
  if (!lead) return []

  const results = DEMO_PROPERTIES.map((property) => {
    let percent = 0
    const reasons: string[] = []

    // Presupuesto (0-34)
    const ratio = property.priceUSD / lead.budgetUSD
    if (ratio <= 1.0) {
      percent += 34
      reasons.push("Presupuesto compatible")
    } else if (ratio <= 1.06) {
      percent += 26
      reasons.push("Presupuesto compatible")
    } else if (ratio <= 1.15) {
      percent += 16
      reasons.push("Presupuesto levemente por encima")
    } else if (ratio <= 1.3) {
      percent += 7
    }

    // Zona (0-22)
    if (property.zone === lead.zone) {
      percent += 22
      reasons.push("Zona preferida")
    } else {
      percent += 6
    }

    // Dormitorios (0-16)
    if (property.bedrooms === lead.bedrooms) {
      percent += 16
      reasons.push("Cantidad de dormitorios exacta")
    } else if (Math.abs(property.bedrooms - lead.bedrooms) === 1) {
      percent += 7
    }

    // Tipo (0-14)
    if (property.type === lead.propertyType) {
      percent += 14
      reasons.push("Tipo de propiedad buscado")
    }

    // Características (0-10)
    const overlap = property.features.filter((f) =>
      lead.features.includes(f),
    )
    if (overlap.length) {
      percent += Math.min(10, overlap.length * 5)
      reasons.push(`Características buscadas (${overlap.join(", ")})`)
    }

    return {
      property,
      percent: Math.min(98, Math.round(percent)),
      reasons,
    }
  })

  return results
    .filter((r) => r.percent >= 60)
    .sort((a, b) => b.percent - a.percent)
    .slice(0, 4)
}

/* ------------------------------------------------------------------ */
/* INTERACCIONES                                                      */
/* ------------------------------------------------------------------ */

export const DEMO_INTERACTIONS: DemoInteraction[] = [
  {
    id: "int-1",
    leadId: "martin-rodriguez",
    leadName: "Martín Rodríguez",
    channel: "WhatsApp",
    direction: "Entrante",
    message: "Respondió por WhatsApp: le interesa coordinar visita al Apartamento Pocitos Premium.",
    actor: "Martín Rodríguez",
    date: "Hoy 09:40",
  },
  {
    id: "int-2",
    leadId: "sofia-fernandez",
    leadName: "Sofía Fernández",
    channel: "Llamada",
    direction: "Saliente",
    message: "Solicitó coordinar una segunda visita en Punta Carretas para el fin de semana.",
    actor: "Santiago Pérez",
    date: "Hoy 08:15",
  },
  {
    id: "int-3",
    leadId: "alejandro-silva",
    leadName: "Alejandro Silva",
    channel: "WhatsApp",
    direction: "Saliente",
    message: "Abrió la propiedad recomendada Apartamento Buceo Rambla enviada por el agente.",
    actor: "Mariana Silva",
    date: "Ayer 18:22",
  },
  {
    id: "int-4",
    leadId: "camila-pereira",
    leadName: "Camila Pereira",
    channel: "Email",
    direction: "Saliente",
    message: "Recibió 3 propiedades en Malvín dentro de su presupuesto.",
    actor: "Diego Rodríguez",
    date: "Ayer 16:05",
  },
  {
    id: "int-5",
    leadId: "nicolas-gomez",
    leadName: "Nicolás Gómez",
    channel: "Follow-up",
    direction: "Saliente",
    message: "No respondió al último follow-up. La IA sugiere reintentar por otro canal.",
    actor: "Diego Rodríguez",
    date: "Ayer 11:30",
  },
  {
    id: "int-6",
    leadId: "lucia-martinez",
    leadName: "Lucía Martínez",
    channel: "Visita",
    direction: "Entrante",
    message: "Realizó visita a Casa Carrasco Sur. Feedback muy positivo.",
    actor: "Laura Fernández",
    date: "Ayer 10:00",
  },
  {
    id: "int-7",
    leadId: "joaquin-torres",
    leadName: "Joaquín Torres",
    channel: "WhatsApp",
    direction: "Entrante",
    message: "Consultó por financiación del Penthouse Punta Carretas.",
    actor: "Joaquín Torres",
    date: "Hoy 07:50",
  },
  {
    id: "int-8",
    leadId: "gonzalo-pereira",
    leadName: "Gonzalo Pereira",
    channel: "Nota",
    direction: "Saliente",
    message: "Acordó firma de boleto de reserva para Casa Carrasco Norte.",
    actor: "Laura Fernández",
    date: "Hoy 09:05",
  },
  {
    id: "int-9",
    leadId: "sebastian-acosta",
    leadName: "Sebastián Acosta",
    channel: "Llamada",
    direction: "Saliente",
    message: "Confirmó interés en visitar Apartamento Buceo Rambla mañana.",
    actor: "Mariana Silva",
    date: "Hoy 08:40",
  },
  {
    id: "int-10",
    leadId: "federico-alvarez",
    leadName: "Federico Álvarez",
    channel: "Email",
    direction: "Saliente",
    message: "Recibió ficha del Apartamento Pocitos Nuevo con fotos y planos.",
    actor: "Santiago Pérez",
    date: "Ayer 15:10",
  },
  {
    id: "int-11",
    leadId: "carolina-ramos",
    leadName: "Carolina Ramos",
    channel: "WhatsApp",
    direction: "Entrante",
    message: "Preguntó por gastos comunes del Apartamento Malvín.",
    actor: "Carolina Ramos",
    date: "Ayer 12:35",
  },
  {
    id: "int-12",
    leadId: "diego-cabrera",
    leadName: "Diego Cabrera",
    channel: "Visita",
    direction: "Entrante",
    message: "Agendó visita a Casa Parque Miramar para el sábado.",
    actor: "Santiago Pérez",
    date: "Ayer 09:20",
  },
]

export function interactionsForLead(leadId: string) {
  return DEMO_INTERACTIONS.filter((i) => i.leadId === leadId)
}

/* ------------------------------------------------------------------ */
/* FOLLOW-UPS                                                         */
/* ------------------------------------------------------------------ */

export const DEMO_FOLLOWUPS: DemoFollowup[] = [
  {
    id: "fu-1",
    leadId: "martin-rodriguez",
    leadName: "Martín Rodríguez",
    agent: "Laura Fernández",
    date: "Hoy 15:00",
    type: "Llamada",
    priority: "Alta",
    action: "Cerrar coordinación de visita a Pocitos Premium",
    bucket: "Hoy",
  },
  {
    id: "fu-2",
    leadId: "nicolas-gomez",
    leadName: "Nicolás Gómez",
    agent: "Diego Rodríguez",
    date: "Ayer 10:00",
    type: "WhatsApp",
    priority: "Media",
    action: "Reintentar contacto tras follow-up sin respuesta",
    bucket: "Vencido",
  },
  {
    id: "fu-3",
    leadId: "sofia-fernandez",
    leadName: "Sofía Fernández",
    agent: "Santiago Pérez",
    date: "Hoy 17:30",
    type: "Visita",
    priority: "Alta",
    action: "Confirmar segunda visita en Punta Carretas",
    bucket: "Hoy",
  },
  {
    id: "fu-4",
    leadId: "camila-pereira",
    leadName: "Camila Pereira",
    agent: "Diego Rodríguez",
    date: "Mañana 11:00",
    type: "Email",
    priority: "Media",
    action: "Enviar comparativa de propiedades en Malvín",
    bucket: "Próximo",
  },
  {
    id: "fu-5",
    leadId: "joaquin-torres",
    leadName: "Joaquín Torres",
    agent: "Laura Fernández",
    date: "Hoy 12:00",
    type: "Llamada",
    priority: "Alta",
    action: "Negociar contrapropuesta del Penthouse",
    bucket: "Hoy",
  },
  {
    id: "fu-6",
    leadId: "diego-cabrera",
    leadName: "Diego Cabrera",
    agent: "Santiago Pérez",
    date: "Anteayer 16:00",
    type: "Llamada",
    priority: "Media",
    action: "Coordinar visita Casa Parque Miramar",
    bucket: "Vencido",
  },
  {
    id: "fu-7",
    leadId: "carolina-ramos",
    leadName: "Carolina Ramos",
    agent: "Mariana Silva",
    date: "Mañana 09:30",
    type: "WhatsApp",
    priority: "Media",
    action: "Enviar ficha Apartamento Malvín",
    bucket: "Próximo",
  },
  {
    id: "fu-8",
    leadId: "federico-alvarez",
    leadName: "Federico Álvarez",
    agent: "Santiago Pérez",
    date: "En 2 días 10:00",
    type: "Llamada",
    priority: "Baja",
    action: "Seguimiento sobre Pocitos Nuevo",
    bucket: "Pendiente",
  },
  {
    id: "fu-9",
    leadId: "sebastian-acosta",
    leadName: "Sebastián Acosta",
    agent: "Mariana Silva",
    date: "Mañana 18:00",
    type: "Visita",
    priority: "Alta",
    action: "Visita confirmada Buceo Rambla",
    bucket: "Próximo",
  },
  {
    id: "fu-10",
    leadId: "agustina-lopez",
    leadName: "Agustina López",
    agent: "Diego Rodríguez",
    date: "En 3 días 11:00",
    type: "Email",
    priority: "Baja",
    action: "Enviar Apartamento Malvín Sur",
    bucket: "Pendiente",
  },
]

/* ------------------------------------------------------------------ */
/* MÉTRICAS AGREGADAS (dashboard / reportes)                          */
/* ------------------------------------------------------------------ */

export const DEMO_METRICS = {
  totalLeads: 148,
  hotLeads: 23,
  interactionsThisMonth: 386,
  activeOpportunities: 41,
  pendingFollowups: 18,
  urgentLeads: 7,
  pipelineValueUSD: 6_940_000,
  conversionRate: 27,
  avgResponseMinutes: 12,
} as const

export const DEMO_AI_RECOMMENDATIONS = [
  {
    id: "rec-1",
    icon: "🔥",
    text: "Contactar hoy a Martín Rodríguez. Tiene alta intención y respondió a una propiedad en Pocitos.",
    leadId: "martin-rodriguez",
  },
  {
    id: "rec-2",
    icon: "🎯",
    text: "Sofía Fernández tiene 3 propiedades con más de 90% de compatibilidad.",
    leadId: "sofia-fernandez",
  },
  {
    id: "rec-3",
    icon: "⏰",
    text: "Hay 5 leads HOT sin interacción en las últimas 24 horas.",
    leadId: null,
  },
  {
    id: "rec-4",
    icon: "🏠",
    text: "La propiedad de Punta Carretas recibió 8 nuevas consultas esta semana.",
    leadId: null,
  },
]

/* Distribución mensual de leads (últimos 8 meses) */
export const DEMO_LEADS_BY_MONTH = [
  { month: "Jun", leads: 12 },
  { month: "Jul", leads: 16 },
  { month: "Ago", leads: 15 },
  { month: "Set", leads: 19 },
  { month: "Oct", leads: 22 },
  { month: "Nov", leads: 20 },
  { month: "Dic", leads: 18 },
  { month: "Ene", leads: 26 },
]

export const DEMO_LEADS_BY_SOURCE = [
  { source: "WhatsApp", value: 58 },
  { source: "Portal inmobiliario", value: 41 },
  { source: "Sitio web", value: 27 },
  { source: "Referidos", value: 14 },
  { source: "Redes sociales", value: 8 },
]

export const DEMO_TEMPERATURE_DISTRIBUTION = [
  { label: "HOT", value: 23, color: "text-blue-400" },
  { label: "WARM", value: 71, color: "text-amber-400" },
  { label: "COLD", value: 54, color: "text-slate-400" },
]

/* Helpers de formato */
export function formatUSD(value: number) {
  return `USD ${value.toLocaleString("en-US")}`
}

export function temperatureBadge(temp: Temperature) {
  switch (temp) {
    case "HOT":
      return "bg-blue-500/10 text-blue-400 border-blue-500/30"
    case "WARM":
      return "bg-amber-500/10 text-amber-400 border-amber-500/30"
    case "COLD":
      return "bg-slate-500/10 text-slate-400 border-slate-500/30"
  }
}
