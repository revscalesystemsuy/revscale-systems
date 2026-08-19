import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const authorization = req.headers.get("Authorization") || "";
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userData, error: userError } = await userClient.auth.getUser();
  const actorId = userData.user?.id;
  if (userError || !actorId) return Response.json({ error: "Sesión inválida" }, { status: 401 });

  let body: { name?: string; email?: string; phone?: string; role?: string; team_id?: string | null };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Solicitud inválida" }, { status: 400 });
  }

  const name = String(body.name || "").trim().slice(0, 160);
  const email = String(body.email || "").trim().toLowerCase().slice(0, 320);
  const phone = String(body.phone || "").trim().slice(0, 60) || null;
  const requestedRole = String(body.role || "AGENT").toUpperCase();
  const requestedTeamId = body.team_id || null;
  if (!name || !email) return Response.json({ error: "Nombre y email son obligatorios" }, { status: 400 });

  const { data: actor } = await admin.from("organization_members")
    .select("id,organization_id,role,status,team_id")
    .eq("user_id", actorId).eq("status", "ACTIVE").maybeSingle();
  if (!actor || !["OWNER", "MANAGER"].includes(actor.role)) {
    return Response.json({ error: "Acceso no autorizado" }, { status: 403 });
  }

  const { data: subscription } = await admin.from("subscriptions")
    .select("plan,status,max_agents")
    .eq("organization_id", actor.organization_id).maybeSingle();
  if (!subscription || String(subscription.status).toUpperCase() !== "ACTIVE" || String(subscription.plan).toUpperCase() !== "ENTERPRISE") {
    return Response.json({ error: "La gestión de equipos requiere Enterprise activo" }, { status: 403 });
  }

  let role = requestedRole;
  let teamId = requestedTeamId;
  if (actor.role === "MANAGER") {
    role = "AGENT";
    teamId = actor.team_id;
    if (!teamId) return Response.json({ error: "El Gerente debe tener un equipo asignado" }, { status: 400 });
  } else if (!["OWNER", "MANAGER", "AGENT"].includes(role)) {
    return Response.json({ error: "Rol inválido" }, { status: 400 });
  }

  if ((role === "MANAGER" || role === "AGENT") && teamId) {
    const { data: team } = await admin.from("teams").select("id")
      .eq("id", teamId).eq("organization_id", actor.organization_id).maybeSingle();
    if (!team) return Response.json({ error: "Equipo inválido" }, { status: 400 });
  }
  if (role === "MANAGER" && !teamId) {
    return Response.json({ error: "Un Gerente debe tener un equipo asignado" }, { status: 400 });
  }

  const { count } = await admin.from("organization_members")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", actor.organization_id).eq("status", "ACTIVE");
  if (count !== null && Number(subscription.max_agents) > 0 && count >= Number(subscription.max_agents)) {
    return Response.json({ error: "Tu plan alcanzó el límite de miembros activos" }, { status: 409 });
  }

  const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { full_name: name },
  });
  if (inviteError || !invited.user) {
    return Response.json({ error: inviteError?.message || "No se pudo enviar la invitación" }, { status: 400 });
  }

  const newUserId = invited.user.id;
  const { error: profileError } = await admin.from("profiles").upsert({ id: newUserId, full_name: name, phone }, { onConflict: "id" });
  if (profileError) {
    await admin.auth.admin.deleteUser(newUserId);
    return Response.json({ error: profileError.message }, { status: 400 });
  }

  const { error: memberError } = await admin.from("organization_members").insert({
    organization_id: actor.organization_id,
    user_id: newUserId,
    role,
    status: "ACTIVE",
    team_id: teamId,
  });
  if (memberError) {
    await admin.auth.admin.deleteUser(newUserId);
    return Response.json({ error: memberError.message }, { status: 400 });
  }

  return Response.json({ ok: true, user_id: newUserId });
});
