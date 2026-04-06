import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { LogOut, UploadCloud, FileCheck, Info, CreditCard, ShieldAlert, CheckCircle2 } from 'lucide-react';
import Layout from '../components/Layout';

export default function OnboardingScreen() {
  const { user, profile, signOut } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  // Consideramos que ya subió comprobante si el campo "comprobante_url" tiene valor
  const hasUploaded = !!profile?.comprobante_url;

  const handleUpload = async (event) => {
    try {
      setUploading(true);
      setError(null);

      const file = event.target.files[0];
      if (!file) return;

      if (!file.type.startsWith('image/')) {
        throw new Error('Por favor, selecciona una imagen válida.');
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}_${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      // 1. Subir al bucket 'comprobantes'
      const { error: uploadError } = await supabase.storage
        .from('comprobantes')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      // 2. Obtener URL pública (o guardamos solo el path)
      const { data: { publicUrl } } = supabase.storage
        .from('comprobantes')
        .getPublicUrl(filePath);

      // 3. Actualizar tabla profiles
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ comprobante_url: publicUrl })
        .eq('id', user.id);

      if (updateError) {
        throw updateError;
      }

      // El realtime de authContext debería detectar el update pero sólo se actualizará 
      // comprobante_url, lo que causará un re-render y `hasUploaded` será true.

    } catch (err) {
      console.error('Error in upload:', err);
      setError(err.message || 'Error al subir el comprobante. Intenta nuevamente.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans relative overflow-hidden">
      {/* Background Decorators */}
      <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-primary/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 bg-accent-primary/20 rounded-full blur-3xl pointer-events-none" />
      
      {/* Navbar Minimalista */}
      <nav className="w-full bg-slate-900/80 backdrop-blur-md border-b border-slate-700/50 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center font-black text-xl text-white shadow-lg shadow-primary/20">
              G
            </div>
            <span className="font-black text-xl tracking-tight text-white">Gran DT <span className="text-primary font-normal">Universitario</span></span>
          </div>
          <button 
            onClick={signOut}
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm font-semibold bg-slate-800/50 px-3 py-1.5 rounded-lg border border-slate-700/50 hover:bg-slate-700"
          >
            <LogOut className="w-4 h-4" /> Salir
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-3xl mx-auto px-4 py-8 relative z-10 flex flex-col gap-6">
        
        {/* EN REVISIÓN STATE */}
        {hasUploaded ? (
          <div className="bg-slate-800/80 backdrop-blur-xl border border-primary/50 p-8 rounded-3xl shadow-2xl relative overflow-hidden text-center flex flex-col items-center justify-center min-h-[400px]">
             <div className="absolute top-0 right-0 p-32 bg-primary/10 rounded-full blur-3xl" />
             <div className="w-24 h-24 bg-primary/20 text-primary rounded-full flex items-center justify-center mb-6 animate-pulse">
                <FileCheck className="w-12 h-12" />
             </div>
             <h2 className="text-3xl font-black text-white mb-4">¡Comprobante en Revisión!</h2>
             <p className="text-slate-300 text-lg max-w-md mx-auto mb-8">
               El Staff está verificando tu pago. En breve habilitaremos tu cuenta para que puedas armar tu equipo y entrar a la cancha.
             </p>
             <div className="flex items-center gap-2 text-primary font-bold bg-primary/10 px-4 py-2 rounded-xl">
               <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
               </span>
               Aguardando Aprobación
             </div>
          </div>
        ) : (
          <>
            {/* Header Text */}
            <header className="text-center mb-4">
              <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight mb-3">
                Bienvenido al Torneo
              </h1>
              <p className="text-slate-400 text-lg">
                Para completar tu inscripción y competir, revisa las reglas y abona el derecho a juego.
              </p>
            </header>

            {/* SECCION 1: REGLAMENTO */}
            <section className="bg-slate-800/50 backdrop-blur-md border border-slate-700 rounded-3xl p-6 shadow-xl">
              <div className="flex items-center gap-3 mb-5 border-b border-slate-700 pb-4">
                <div className="p-2 bg-slate-700/50 rounded-xl text-blue-400">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-white">Reglamento Básico</h3>
              </div>
              <ul className="space-y-4 text-slate-300">
                <li className="flex gap-3 items-start">
                  <CheckCircle2 className="w-5 h-5 text-accent-primary mt-0.5 shrink-0" />
                  <p><strong>Formación 5-5-5:</strong> Debes armar tu equipo titular respetando tu presupuesto dictado.</p>
                </li>
                <li className="flex gap-3 items-start">
                  <CheckCircle2 className="w-5 h-5 text-accent-primary mt-0.5 shrink-0" />
                  <p><strong>Puntuación en Cancha:</strong> Los Tries, Conversiones y Tackles exitosos suman puntos clave. Infracciones o tarjetas restan puntaje.</p>
                </li>
                <li className="flex gap-3 items-start">
                  <CheckCircle2 className="w-5 h-5 text-accent-primary mt-0.5 shrink-0" />
                  <p><strong>Capitán Doble:</strong> Recuerda elegir bien a tu capitán antes de empezar la fecha, ¡sus puntos valen doble!</p>
                </li>
              </ul>
            </section>

            {/* SECCION 2: INSCRIPCIÓN */}
            <section className="bg-slate-800/50 backdrop-blur-md border border-slate-700 rounded-3xl p-6 shadow-xl">
              <div className="flex items-center gap-3 mb-5 border-b border-slate-700 pb-4">
                <div className="p-2 bg-slate-700/50 rounded-xl text-green-400">
                  <CreditCard className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-white">Datos de Inscripción</h3>
              </div>
              <div className="bg-slate-900/50 p-5 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-6 border border-slate-700/50">
                <div className="flex flex-col gap-2 w-full">
                  <span className="text-slate-400 text-sm font-semibold uppercase tracking-wider">Monto a Transferir</span>
                  <div className="text-4xl font-black text-white">$5.000</div>
                  <p className="text-slate-500 text-sm">Derecho a juego Torneo 2026</p>
                </div>
                <div className="flex flex-col gap-2 w-full md:items-end">
                  <span className="text-slate-400 text-sm font-semibold uppercase tracking-wider">Alias (Banco)</span>
                  <div className="bg-slate-800 border border-slate-600 px-4 py-2 rounded-xl text-lg font-mono font-bold text-green-400 w-full text-center md:text-right">
                    granDT.UNI2026
                  </div>
                  <span className="text-xs text-slate-500 flex items-center gap-1">
                    <Info className="w-3 h-3" /> Cuenta a nombre de Universitario RC
                  </span>
                </div>
              </div>
            </section>

            {/* SECCION 3: CARGA */}
            <section className="bg-primary/5 backdrop-blur-md border border-primary/20 rounded-3xl p-6 shadow-xl text-center">
              <div className="mb-4">
                <h3 className="text-xl font-bold text-white">Subir Comprobante</h3>
                <p className="text-slate-400 text-sm mt-1">Una vez abonado, adjunta aquí el ticket para habilitar tu cuenta.</p>
              </div>
              
              {error && (
                <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded-lg text-sm mb-4">
                  {error}
                </div>
              )}

              <label className={`
                flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-2xl cursor-pointer 
                transition-all duration-200
                ${uploading ? 'opacity-50 cursor-not-allowed border-slate-600 bg-slate-800' : 'border-primary/50 hover:border-primary hover:bg-primary/10 bg-slate-800/30'}
              `}>
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  {uploading ? (
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-2"></div>
                  ) : (
                    <UploadCloud className="w-8 h-8 text-primary mb-2" />
                  )}
                  <p className="text-sm text-slate-300 font-semibold">
                    {uploading ? 'Subiendo comprobante...' : 'Click para buscar tu imagen'}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">PNG, JPG, JPEG (Max. 5MB)</p>
                </div>
                <input 
                  type="file" 
                  className="hidden" 
                  accept="image/*"
                  onChange={handleUpload}
                  disabled={uploading}
                />
              </label>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
