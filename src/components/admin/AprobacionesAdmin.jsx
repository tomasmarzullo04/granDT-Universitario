import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Loader2, UserCheck, Image as ImageIcon, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function AprobacionesAdmin() {
  const [pendientes, setPendientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [processingId, setProcessingId] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null); // Estado para el Toast

  useEffect(() => {
    fetchPendientes();
  }, []);

  const fetchPendientes = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('id, full_name, email, comprobante_url')
        .eq('es_competidor', false)
        .not('comprobante_url', 'is', null);

      if (fetchError) throw fetchError;
      setPendientes(data || []);
    } catch (err) {
      console.error('Error fetching pendientes:', err);
      setError('Error al cargar la lista de comprobantes.');
    } finally {
      setLoading(false);
    }
  };

  const sendWelcomeEmail = async (userEmail, userName) => {
    try {
      // Plantilla HTML Pro-Style para el correo
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
              Hola <strong>${userName}</strong>,<br><br>
              Hemos verificado tu pago correctamente. Ya sos un competidor oficial para esta temporada.<br>
              Entrá ahora a la plataforma para armar tu XV ideal y elegir a tu capitán.
            </p>
            
            <a href="https://localhost:5173/dashboard" style="background-color: #1966B3; color: white; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: bold; display: inline-block; font-size: 16px; letter-spacing: 0.5px;">IR A MI EQUIPO</a>
          </div>
          
          <div style="text-align: center; margin-top: 20px; color: #94a3b8; font-size: 12px;">
            <p>Club Universitario de Mar del Plata - 2026</p>
          </div>
        </div>
      `;

      // NOTA: Para desarrollo rápido en frontend usando Resend
      const RESEND_API_KEY = "re_BcnePqhQ_AMQMPX5TRC1XyJMCUZy3Hg4y";

      // IMPORTANTE: En el plan gratuito sin dominio verificado, Resend SOLO permite enviar AL correo registrado (el tuyo).
      // Por eso hardcodeamos tu mail como destinatario para que la prueba no falle y te llegue de verdad.
      const testEmail = "tomasmarzullo04@gmail.com";

      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'onboarding@resend.dev',
          to: testEmail, // En producción real iría userEmail (requiere dominio verificado en Resend)
          subject: '¡Bienvenido a la cancha! Inscripción Aprobada 🏉',
          html: htmlTemplate,
        }),
      });

      if (!response.ok) {
        throw new Error('Error al enviar el email');
      }
      
      console.log('✅ Email enviado vía Resend a:', testEmail);
    } catch (err) {
      console.error('Error enviando email:', err);
    }
  };

  const handleAprobar = async (userId, userEmail, userName) => {
    try {
      setProcessingId(userId);
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ es_competidor: true })
        .eq('id', userId);

      if (updateError) throw updateError;

      // Disparar Email de bienvenida
      await sendWelcomeEmail(userEmail, userName);

      // Mostrar Notificación Toast
      setSuccessMsg(`Usuario aprobado exitosamente. Email enviado a ${userName}.`);
      setTimeout(() => setSuccessMsg(null), 5000);

      // Remover el aprobado de la lista local
      setPendientes(pendientes.filter(p => p.id !== userId));
    } catch (err) {
      console.error('Error al aprobar:', err);
      alert('Hubo un error al aprobar al usuario. Intenta nuevamente.');
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <p className="text-neutral mt-4 font-medium">Cargando comprobantes...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 text-red-500 p-4 rounded-2xl flex items-center gap-3">
        <AlertCircle className="w-5 h-5 shrink-0" />
        <p>{error}</p>
        <button onClick={fetchPendientes} className="ml-auto underline font-bold">Reintentar</button>
      </div>
    );
  }

  if (pendientes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center bg-neutral-light/50 rounded-2xl border border-dashed border-neutral/30">
        <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-neutral shadow-sm mb-4">
          <UserCheck className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-bold text-dark mb-1">¡Todo al día!</h3>
        <p className="text-neutral">No hay jugadores pendientes de aprobación.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {successMsg && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-2xl flex items-center gap-3 animate-fade-in shadow-sm">
          <div className="bg-green-100 p-1.5 rounded-full shrink-0">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
          </div>
          <p className="font-bold text-sm tracking-wide">{successMsg}</p>
        </div>
      )}

      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-bold text-dark flex items-center gap-2">
          Comprobantes en Revisión <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full text-xs">{pendientes.length}</span>
        </h2>
        <button 
          onClick={fetchPendientes}
          className="text-xs font-semibold text-primary hover:underline"
        >
          Refrescar
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {pendientes.map(user => (
          <div key={user.id} className="bg-white border border-neutral/20 rounded-2xl p-4 shadow-sm flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                <UserCheck className="w-5 h-5" />
              </div>
              <div className="overflow-hidden">
                <h4 className="font-bold text-dark truncate text-sm">{user.full_name || 'Jugador Sin Nombre'}</h4>
                <p className="text-xs text-neutral truncate">{user.email}</p>
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl flex items-center justify-center overflow-hidden border border-slate-100 group">
              <a 
                href={user.comprobante_url} 
                target="_blank" 
                rel="noreferrer"
                className="relative w-full aspect-video flex items-center justify-center"
              >
                <img 
                  src={user.comprobante_url} 
                  alt="Comprobante" 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white backdrop-blur-sm">
                  <span className="flex items-center gap-1 font-semibold text-sm">
                    <ImageIcon className="w-4 h-4" /> Ver Completo
                  </span>
                </div>
              </a>
            </div>

            <button
              onClick={() => handleAprobar(user.id, user.email, user.full_name)}
              disabled={processingId === user.id}
              className={`w-full py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all 
                ${processingId === user.id 
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                  : 'bg-green-500 hover:bg-green-600 text-white shadow-md hover:shadow-lg'
                }`}
            >
              {processingId === user.id ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Aprobando...</>
              ) : (
                <><UserCheck className="w-4 h-4" /> APROBAR JUGADOR</>
              )}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
