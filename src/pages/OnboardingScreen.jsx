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
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans relative overflow-hidden z-0">
      
      {/* Watermark 'H' de fondo */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-[-1] overflow-hidden opacity-[0.03]">
        <div className="text-[40rem] font-black leading-none text-slate-900 tracking-tighter transform -rotate-12 select-none">
          H
        </div>
      </div>

      {/* Navbar Minimalista */}
      <nav className="w-full bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-black text-xl tracking-tight text-slate-800 uppercase">
              Gran DT <span className="text-primary font-normal uppercase">UNI</span>
            </span>
          </div>
          <button 
            onClick={signOut}
            className="flex items-center gap-2 text-slate-500 hover:text-primary transition-colors text-sm font-semibold bg-slate-100/50 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100"
          >
            <LogOut className="w-4 h-4" /> Salir
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-3xl mx-auto px-4 py-8 md:py-12 relative z-10 flex flex-col items-center">
        
        {/* LOGO UNI TOP CENTER */}
        <div className="mb-6 bg-white p-1 rounded-full shadow-sm w-20 h-20 md:w-24 md:h-24 flex items-center justify-center overflow-hidden shrink-0 border border-slate-100">
           <img src="/escudo.jpg" alt="Logo UNI" className="w-full h-full object-contain" />
        </div>

        {/* EN REVISIÓN STATE */}
        {hasUploaded ? (
          <div className="bg-white border text-center border-slate-200 p-8 md:p-12 rounded-[2rem] shadow-sm relative overflow-hidden flex flex-col items-center justify-center w-full max-w-xl">
             <div className="w-20 h-20 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-6 animate-pulse">
                <FileCheck className="w-10 h-10" />
             </div>
             <h2 className="text-2xl md:text-3xl font-black text-slate-800 mb-4 tracking-tight">¡Comprobante en Revisión!</h2>
             <p className="text-slate-500 text-base max-w-md mx-auto mb-8">
               El Staff está verificando tu pago. En breve habilitaremos tu cuenta para que puedas armar tu equipo y entrar a la cancha.
             </p>
             <div className="flex items-center gap-2 text-primary font-bold bg-primary/5 px-5 py-2.5 rounded-xl border border-primary/20 shadow-sm">
               <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
               </span>
               Aguardando Aprobación
             </div>
          </div>
        ) : (
          <div className="w-full max-w-2xl flex flex-col gap-6">
            {/* Header Text */}
            <header className="text-center mb-2">
              <h1 className="text-3xl md:text-4xl font-black text-slate-800 tracking-tight mb-3">
                Bienvenido al Torneo
              </h1>
              <p className="text-slate-500 text-base max-w-lg mx-auto">
                Estás a un paso de la cancha. Repasá el reglamento rápido y completá tu pago de derecho a juego para habilitar tu cuenta.
              </p>
            </header>

            {/* SECCION 1: REGLAMENTO */}
            <section className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm relative overflow-hidden">
              <div className="flex items-center gap-3 mb-5 border-b border-slate-100 pb-4">
                <div className="p-2 bg-blue-50 rounded-xl text-blue-600">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-slate-800">Reglamento Básico</h3>
              </div>
              <ul className="space-y-4 text-slate-600 text-sm md:text-base">
                <li className="flex gap-3 items-start">
                  <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                  <p><strong>Formación 5-5-5:</strong> Debes armar tu equipo titular respetando tu presupuesto dictado por el sistema.</p>
                </li>
                <li className="flex gap-3 items-start">
                  <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                  <p><strong>Puntajes Reales:</strong> Los Tries y Tackles suman fuerte en tu equipo. Amarillas y rojas penalizan tu fecha.</p>
                </li>
                <li className="flex gap-3 items-start">
                  <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                  <p><strong>Doble Presión:</strong> Elegí a tu capitán sabiamente antes del inicio de la fecha. Su puntaje final valdrá x2.</p>
                </li>
              </ul>
            </section>

            {/* SECCION 2: INSCRIPCIÓN */}
            <section className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-5 border-b border-slate-100 pb-4">
                <div className="p-2 bg-green-50 rounded-xl text-green-600">
                  <CreditCard className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-slate-800">Datos de Pago</h3>
              </div>
              
              <div className="bg-slate-50 p-5 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-6 border border-slate-200 shadow-inner">
                <div className="flex flex-col gap-1 w-full text-center sm:text-left">
                  <span className="text-slate-400 text-xs font-bold uppercase tracking-wider hidden sm:block">Monto a Transferir</span>
                  <div className="text-4xl font-black text-slate-800">$5.000</div>
                  <p className="text-slate-500 text-xs sm:text-sm font-medium">Derecho a Juego - Edición 2026</p>
                </div>
                
                <div className="w-px h-16 bg-slate-200 hidden sm:block"></div>
                
                <div className="flex flex-col gap-2 w-full items-center sm:items-end">
                  <span className="text-slate-400 text-xs font-bold uppercase tracking-wider hidden sm:block">Alias Oficial</span>
                  <div className="bg-white border border-slate-300 px-4 py-2.5 rounded-xl text-lg font-mono font-bold text-slate-800 w-full sm:w-auto text-center shadow-sm select-all">
                    granDT.UNI2026
                  </div>
                  <span className="text-xs text-slate-500 flex items-center gap-1 font-medium mt-1">
                    <Info className="w-3.5 h-3.5" /> Universitario RC
                  </span>
                </div>
              </div>
            </section>

            {/* SECCION 3: CARGA */}
            <section className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm text-center">
              <div className="mb-5">
                <h3 className="text-lg font-bold text-slate-800">Cargar Comprobante</h3>
                <p className="text-slate-500 text-sm mt-1">Adjuntá una captura de la transferencia para que un Admin valide tu ingreso.</p>
              </div>
              
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-xl text-sm mb-4 font-medium flex items-center justify-center gap-2">
                  <ShieldAlert className="w-4 h-4" /> {error}
                </div>
              )}

              <label className={`
                flex flex-col items-center justify-center w-full h-36 border-2 border-dashed border-slate-300 rounded-2xl cursor-pointer 
                transition-all duration-300
                ${uploading 
                  ? 'opacity-60 cursor-not-allowed bg-slate-50' 
                  : 'hover:border-primary hover:bg-primary/5 bg-slate-50'}
              `}>
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  {uploading ? (
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mb-3"></div>
                  ) : (
                    <div className="p-3 bg-primary/10 rounded-full mb-3 text-primary">
                      <UploadCloud className="w-6 h-6" />
                    </div>
                  )}
                  <p className="text-sm text-slate-700 font-bold">
                    {uploading ? 'Aguardá un momento...' : 'Tocá acá para seleccionar tu comprobante'}
                  </p>
                  <p className="text-xs text-slate-400 mt-1 font-medium">Imágenes soportadas: JPG, PNG, WEBP (Max. 5MB)</p>
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
          </div>
        )}
      </main>
    </div>
  );
}
