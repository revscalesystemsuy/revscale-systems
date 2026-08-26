export type DemoSlaScenario = {
  sourceChannel: string;
  sourceProvider: string;
  sourceCampaign: string;
  firstAiResponseMinutes: number | null;
  firstHumanResponseMinutes: number | null;
  slaMinutes: number;
};

export const DEMO_SLA_BY_LEAD: Record<string, DemoSlaScenario> = {
  "martin-rodriguez": { sourceChannel: "PORTAL", sourceProvider: "InfoCasas", sourceCampaign: "Pocitos venta", firstAiResponseMinutes: 1, firstHumanResponseMinutes: 6, slaMinutes: 15 },
  "sofia-fernandez": { sourceChannel: "PORTAL", sourceProvider: "Mercado Libre", sourceCampaign: "Punta Carretas 3D", firstAiResponseMinutes: 2, firstHumanResponseMinutes: 11, slaMinutes: 15 },
  "alejandro-silva": { sourceChannel: "META", sourceProvider: "Instagram", sourceCampaign: "Rambla Buceo", firstAiResponseMinutes: 1, firstHumanResponseMinutes: 19, slaMinutes: 15 },
  "camila-pereira": { sourceChannel: "WEB", sourceProvider: "Web", sourceCampaign: "Formulario Malvín", firstAiResponseMinutes: null, firstHumanResponseMinutes: 8, slaMinutes: 15 },
  "nicolas-gomez": { sourceChannel: "META", sourceProvider: "Meta", sourceCampaign: "Apartamentos Cordón", firstAiResponseMinutes: 1, firstHumanResponseMinutes: 34, slaMinutes: 15 },
  "lucia-martinez": { sourceChannel: "PORTAL", sourceProvider: "InfoCasas", sourceCampaign: "Casas Carrasco", firstAiResponseMinutes: 2, firstHumanResponseMinutes: 7, slaMinutes: 15 },
  "federico-alvarez": { sourceChannel: "WEB", sourceProvider: "Web", sourceCampaign: "Pocitos nuevo", firstAiResponseMinutes: null, firstHumanResponseMinutes: 13, slaMinutes: 15 },
  "valentina-mendez": { sourceChannel: "META", sourceProvider: "Instagram", sourceCampaign: "Vista al mar", firstAiResponseMinutes: 1, firstHumanResponseMinutes: null, slaMinutes: 15 },
  "diego-cabrera": { sourceChannel: "PORTAL", sourceProvider: "Mercado Libre", sourceCampaign: "Casas Parque Miramar", firstAiResponseMinutes: 3, firstHumanResponseMinutes: 22, slaMinutes: 15 },
  "florencia-suarez": { sourceChannel: "WEB", sourceProvider: "Web", sourceCampaign: "Cordón inversión", firstAiResponseMinutes: null, firstHumanResponseMinutes: null, slaMinutes: 15 },
  "joaquin-torres": { sourceChannel: "META", sourceProvider: "Meta", sourceCampaign: "Penthouse premium", firstAiResponseMinutes: 1, firstHumanResponseMinutes: 4, slaMinutes: 15 },
  "carolina-ramos": { sourceChannel: "PORTAL", sourceProvider: "InfoCasas", sourceCampaign: "Malvín 2D", firstAiResponseMinutes: 2, firstHumanResponseMinutes: 9, slaMinutes: 15 },
  "sebastian-acosta": { sourceChannel: "META", sourceProvider: "Instagram", sourceCampaign: "Buceo rambla", firstAiResponseMinutes: 1, firstHumanResponseMinutes: 17, slaMinutes: 15 },
  "agustina-lopez": { sourceChannel: "WEB", sourceProvider: "Web", sourceCampaign: "Malvín formulario", firstAiResponseMinutes: null, firstHumanResponseMinutes: 12, slaMinutes: 15 },
  "gonzalo-pereira": { sourceChannel: "REFERIDO", sourceProvider: "Referido", sourceCampaign: "Base clientes", firstAiResponseMinutes: null, firstHumanResponseMinutes: 5, slaMinutes: 15 },
};

export function getDemoSla(id: string) {
  return DEMO_SLA_BY_LEAD[id] || { sourceChannel: "WEB", sourceProvider: "Web", sourceCampaign: "Sin campaña", firstAiResponseMinutes: null, firstHumanResponseMinutes: null, slaMinutes: 15 };
}

export function demoSlaLabel(id: string) {
  const item = getDemoSla(id);
  if (item.firstHumanResponseMinutes === null) return "Sin respuesta humana";
  return item.firstHumanResponseMinutes <= item.slaMinutes ? `Cumplido · ${item.firstHumanResponseMinutes} min` : `Incumplido · ${item.firstHumanResponseMinutes} min`;
}
