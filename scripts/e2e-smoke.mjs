import { spawn } from "node:child_process";

const port = 3210;
const baseUrl = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-p", String(port)], {
  stdio: ["ignore", "pipe", "pipe"],
  env: { ...process.env, PORT: String(port) },
});

let logs = "";
server.stdout.on("data", (chunk) => { logs += chunk.toString(); });
server.stderr.on("data", (chunk) => { logs += chunk.toString(); });

async function waitForServer() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/pricing`, { redirect: "manual" });
      if (response.status === 200) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Next server did not become ready.\n${logs}`);
}

async function expectPage(path, expectedText) {
  const response = await fetch(`${baseUrl}${path}`, { redirect: "manual" });
  if (response.status !== 200) throw new Error(`${path} returned ${response.status}`);
  const html = await response.text();
  for (const text of expectedText) {
    if (!html.includes(text)) throw new Error(`${path} did not contain expected text: ${text}`);
  }
}

async function expectProtectedRedirect(path) {
  const response = await fetch(`${baseUrl}${path}`, { redirect: "manual" });
  if (![302, 303, 307, 308].includes(response.status)) throw new Error(`${path} should redirect unauthenticated users, got ${response.status}`);
  const location = response.headers.get("location") || "";
  if (!location.includes("/auth/login")) throw new Error(`${path} redirected to unexpected location: ${location}`);
}

try {
  await waitForServer();
  await expectPage("/pricing", ["Starter", "Professional", "Enterprise", "Mensual", "Anual"]);
  await expectPage("/pricing?cycle=ANNUAL", ["990", "2,490", "4,990"]);
  await expectPage("/request?plan=PROFESSIONAL&cycle=ANNUAL", ["PROFESSIONAL", "2,490", "Continuar al pago"]);
  await expectPage("/request/checkout?plan=STARTER&cycle=MONTHLY", ["Confirmá tu suscripción", "La solicitud de pago no es válida"]);

  await expectPage("/demo/leads", ["Fuera SLA", "InfoCasas", "Mercado Libre"]);
  await expectPage("/demo/analytics", ["Cumplimiento SLA", "SLA por fuente", "Primera respuesta humana"]);
  await expectPage("/demo/today", ["SLA que requiere atención", "Objetivo 15 min", "primera respuesta humana"]);
  await expectPage("/demo/executive", ["Cumplimiento SLA", "Orígenes con menor SLA", "Sin respuesta humana"]);
  await expectPage("/demo/agents", ["SLA objetivo 15 minutos", "Mediana", "Fuera SLA"]);
  await expectPage("/demo/notifications", ["SLA incumplido", "SLA escalado", "SLA por vencer"]);
  await expectPage("/demo/reports", ["Cumplimiento SLA", "SLA por origen", "Mediana respuesta"]);
  await expectPage("/demo/leads/martin-rodriguez", ["Origen y velocidad", "InfoCasas", "Primera respuesta humana"]);
  await expectPage("/demo/inbox", ["Inbox WhatsApp", "Datos de demostración", "IA atendiendo", "Espera humana"]);
  await expectPage("/demo/inbox?conversation=valentina-mendez", ["Handoff automático", "negociar una seña"]);
  await expectPage("/demo/integrations?plan=enterprise", ["WhatsApp Business", "Preparado", "WABA/número real"]);

  await expectProtectedRedirect("/protected/billing");
  await expectProtectedRedirect("/protected/analytics");
  await expectProtectedRedirect("/protected/reports");
  await expectProtectedRedirect("/protected/executive");
  await expectProtectedRedirect("/protected/today");
  await expectProtectedRedirect("/protected/inbox");
  await expectProtectedRedirect("/protected/calendar");
  await expectProtectedRedirect("/protected/executive/monthly");
  await expectProtectedRedirect("/protected/settings/sla");
  console.log("E2E smoke checks passed");
} finally {
  server.kill("SIGTERM");
}
