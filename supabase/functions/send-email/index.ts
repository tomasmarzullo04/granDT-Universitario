// supabase/functions/send-email/index.ts
//
// Edge Function "send-email" para Gran DT UNI.
// Reemplaza el llamado directo a Resend desde el frontend, manteniendo la
// API key del lado del servidor (Deno.env.get('RESEND_API_KEY')).
//
// Reglas:
//   - Solo usuarios autenticados (valida JWT).
//   - Solo admins pueden enviar a cualquier destinatario.
//     Usuarios no admin solo pueden enviar a su propio email (auto-envíos).
//   - Rate limit en memoria: máx 10 emails/min por usuario.
//
// Variables de entorno requeridas:
//   - RESEND_API_KEY
//   - SUPABASE_URL          (la inyecta Supabase automáticamente)
//   - SUPABASE_ANON_KEY     (la inyecta Supabase automáticamente)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");

// Origen del email. Mientras Resend no tenga el dominio verificado, usar
// onboarding@resend.dev (solo entrega al email del dueño de la cuenta Resend).
// Cuando se verifique grandtuni.com, cambiar a "Gran DT UNI <no-reply@grandtuni.com>".
const FROM_ADDRESS = "Gran DT UNI <onboarding@resend.dev>";

// ---- Rate limit en memoria (best-effort: se reinicia con cada cold start) ----
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 10;
const rateBuckets = new Map<string, number[]>();

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const recent = (rateBuckets.get(userId) ?? []).filter(
    (t) => now - t < RATE_WINDOW_MS,
  );
  if (recent.length >= RATE_MAX) {
    rateBuckets.set(userId, recent);
    return false;
  }
  recent.push(now);
  rateBuckets.set(userId, recent);
  return true;
}

// ---- CORS ----
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return json(401, { error: "Missing Authorization header" });
  }
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return json(500, { error: "Supabase env not configured" });
  }
  if (!RESEND_API_KEY) {
    return json(500, { error: "Email service not configured (RESEND_API_KEY)" });
  }

  // Validar JWT y obtener el usuario llamante
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return json(401, { error: "Invalid or expired JWT" });
  }

  // Rate limit
  if (!checkRateLimit(user.id)) {
    return json(429, { error: "Rate limit exceeded (max 10 emails/min)" });
  }

  // Parsear body
  let body: { to?: string; subject?: string; html?: string };
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "Invalid JSON body" });
  }
  const { to, subject, html } = body;
  if (!to || !subject || !html) {
    return json(400, { error: "Missing required fields: to, subject, html" });
  }
  if (typeof to !== "string" || typeof subject !== "string" || typeof html !== "string") {
    return json(400, { error: "Fields must be strings" });
  }

  // Permiso: admin puede enviar a cualquiera; resto solo a su propio email.
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role, email")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    return json(500, { error: "Could not load caller profile" });
  }

  const isAdmin = profile?.role === "admin";
  const isSelfEmail =
    profile?.email && profile.email.toLowerCase() === to.toLowerCase();

  if (!isAdmin && !isSelfEmail) {
    return json(403, {
      error: "Forbidden: only admins can email other users",
    });
  }

  // Llamar a Resend
  const resendResp = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM_ADDRESS,
      to,
      subject,
      html,
    }),
  });

  if (!resendResp.ok) {
    const errText = await resendResp.text();
    return json(502, { error: "Resend error", details: errText });
  }

  const data = await resendResp.json();
  return json(200, { ok: true, id: data?.id ?? null });
});
