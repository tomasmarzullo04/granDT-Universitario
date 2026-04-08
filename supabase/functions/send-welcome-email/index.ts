import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*' } });
  }

  try {
    const payload = await req.json();
    const { record, old_record, type } = payload;
    
    // Solo disparamos si es un UPDATE y es_competidor pasó de false a true
    if (type !== "UPDATE" || !record.es_competidor || old_record.es_competidor) {
      return new Response(JSON.stringify({ message: "No action required" }), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      });
    }

    const { email, full_name } = record;

    const htmlTemplate = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8fafc; padding: 20px; border-radius: 12px; border: 1px solid #e2e8f0;">
        <div style="text-align: center; margin-bottom: 20px;">
          <div style="background-color: #1966B3; padding: 15px; border-radius: 8px;">
             <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 900; letter-spacing: 1px;">GRAN DT UNI</h1>
          </div>
        </div>
        
        <div style="background-color: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); text-align: center;">
          <h2 style="color: #1e293b; margin-top: 0; font-size: 22px;">¡Tu inscripción fue aprobada!</h2>
          <p style="color: #475569; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
            Hola <strong>${full_name}</strong>,<br><br>
            Hemos verificado tu pago correctamente. Ya sos un competidor oficial para esta temporada.<br>
            Entrá ahora a la plataforma para armar tu XV ideal y elegir a tu capitán.
          </p>
          
          <a href="https://grandtuni.com" style="background-color: #1966B3; color: white; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: bold; display: inline-block; font-size: 16px; letter-spacing: 0.5px;">IR A MI EQUIPO</a>
        </div>
        
        <div style="text-align: center; margin-top: 20px; color: #94a3b8; font-size: 12px;">
          <p>Club Universitario de Mar del Plata - 2026</p>
        </div>
      </div>
    `;

    // Resend free tier restriction: only owner email allowed until domain verified
    const recipientEmail = "tomasmarzullo04@gmail.com"; 

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Gran DT UNI <onboarding@resend.dev>",
        to: [recipientEmail],
        subject: "¡Bienvenido a la cancha! Inscripción Aprobada 🏉",
        html: htmlTemplate,
      }),
    });

    const data = await res.json();
    return new Response(JSON.stringify(data), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { "Content-Type": "application/json" },
      status: 400,
    });
  }
})
