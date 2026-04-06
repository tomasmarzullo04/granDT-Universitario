import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { LogOut, UploadCloud, FileCheck, Info, CreditCard, ShieldAlert, CheckCircle2, User, Coins, Layout, Medal, Activity, Trophy, Copy, Check, Menu } from 'lucide-react';
import Sidebar from '../components/Sidebar';

export default function OnboardingScreen() {
  const { user, profile, signOut } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showScoring, setShowScoring] = useState(false);

  // Consideramos que ya subió comprobante si el campo "comprobante_url" tiene valor
  const hasUploaded = !!profile?.comprobante_url;

  const handleCopyAlias = () => {
    navigator.clipboard.writeText('UNIMDP.GRAN.DT');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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

      // 2. Obtener URL pública
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

    } catch (err) {
      console.error('Error in upload:', err);
      setError(err.message || 'Error al subir el comprobante.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans relative overflow-x-hidden z-0">
      
      {/* Watermarks de fondo */}
      <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-[-1] overflow-hidden opacity-[0.03]">
        <div className="text-[40rem] font-black leading-none text-slate-900 tracking-tighter transform -rotate-12 select-none absolute">
          H
        </div>
        <img 
          src="/logo-buho.png" 
          alt="Búho Watermark" 
          className="w-[50rem] opacity-30 transform rotate-12"
        />
      </div>

      {/* NAVBAR OFICIAL (Copiado de PlayerLayout) */}
      <header className="bg-primary text-white shadow-md sticky top-0 z-50 h-[60px] flex items-center">
        <div className="w-full max-w-4xl mx-auto px-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="bg-white p-0.5 rounded-full shadow-sm w-9 h-9 md:w-11 md:h-11 flex items-center justify-center overflow-hidden shrink-0">
               <img src="/escudo.jpg" alt="Escudo" className="w-full h-full object-contain" />
            </div>
            <div className="hidden sm:block">
              <h1 className="font-black text-xs md:text-lg leading-tight tracking-tight uppercase">Gran DT UNI</h1>
              <p className="text-[7px] md:text-[9px] text-white/80 font-bold tracking-[0.2em] uppercase">Edición 2026</p>
            </div>
          </div>

          <div className="sm:hidden flex flex-col items-center">
            <h1 className="font-black text-sm leading-tight tracking-tighter uppercase whitespace-nowrap">Gran DT UNI</h1>
            <p className="text-[7px] text-white/60 font-bold tracking-[0.3em] uppercase">2026</p>
          </div>
          
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 hover:bg-white/10 rounded-xl transition-all"
            aria-label="Menú"
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-4xl mx-auto px-4 py-8 md:py-12 relative z-10 flex flex-col items-center space-y-8">
        
        {/* HERO TITLE STATIUM PRO */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl md:text-6xl font-black text-primary tracking-tighter uppercase leading-none">
            BIENVENIDO A <br/>
            <span className="text-slate-800">GRAN DT UNI</span>
          </h1>
          <p className="text-slate-500 font-bold text-sm md:text-lg tracking-[0.1em] uppercase">Preparate para entrar a la cancha</p>
        </div>

        {/* CONTAINER CARD PRINCIPAL */}
        <div className="w-full max-w-3xl bg-white/80 backdrop-blur-sm border border-slate-200 rounded-[2.5rem] shadow-2xl p-6 md:p-10 space-y-12">
          
          {/* SECCION 1: CÓMO JUGAR - 4 BLOQUES */}
          <div className="space-y-6">
            <h2 className="text-xl md:text-2xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-3">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white text-sm">1</div>
              Pasos hacia la victoria
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 flex gap-4 items-start hover:shadow-md transition-shadow">
                <div className="p-3 bg-blue-100 text-blue-600 rounded-xl shadow-inner">
                  <User className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-extrabold text-slate-800 uppercase text-sm tracking-wide">1. Registrate & Aboná</h4>
                  <p className="text-xs text-slate-500 leading-relaxed font-medium">Crea tu cuenta y abona la inscripción <strong>($5.000)</strong> para validar tu participación.</p>
                </div>
              </div>

              <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 flex gap-4 items-start hover:shadow-md transition-shadow">
                <div className="p-3 bg-green-100 text-green-600 rounded-xl shadow-inner">
                  <Layout className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-extrabold text-slate-800 uppercase text-sm tracking-wide">2. Armá tu 15 Ideal</h4>
                  <p className="text-xs text-slate-500 leading-relaxed font-medium">
                    Una vez que el Staff de Entrenadores publica los planteles, se habilita la selección. <br/>
                    <strong className="text-primary uppercase text-[10px] block mt-1">OBLIGATORIO: 5 Primera + 5 Inter + 5 Pre.</strong>
                    <span className="opacity-80 block mt-1 text-[10px]">Cierre: 23:59 hs del día previo al partido.</span>
                  </p>
                </div>
              </div>

              <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 flex gap-4 items-start hover:shadow-md transition-shadow">
                <div className="p-3 bg-yellow-100 text-yellow-600 rounded-xl shadow-inner">
                  <Medal className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-extrabold text-slate-800 uppercase text-sm tracking-wide">3. Elegí tu Capitán</h4>
                  <p className="text-xs text-slate-500 leading-relaxed font-medium">
                    Tu capitán designado suma <strong>DOBLE (x2)</strong> en cada fecha. ¡Elegí la pieza clave para ganar la jornada!
                  </p>
                </div>
              </div>

              <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 flex gap-4 items-start hover:shadow-md transition-shadow cursor-pointer group" onClick={() => setShowScoring(!showScoring)}>
                <div className="p-3 bg-purple-100 text-purple-600 rounded-xl shadow-inner group-hover:scale-110 transition-transform">
                  <Activity className="w-6 h-6" />
                </div>
                <div className="space-y-1 flex-1">
                  <h4 className="font-extrabold text-slate-800 uppercase text-sm tracking-wide flex items-center justify-between">
                    4. Seguí los Puntajes
                    {showScoring ? <CheckCircle2 className="w-4 h-4 text-primary" /> : <Info className="w-4 h-4 text-purple-400" />}
                  </h4>
                  <p className="text-xs text-slate-500 leading-relaxed font-medium">
                    Sumá puntos reales según el rendimiento en cancha. 
                    <span className="text-primary font-black underline block mt-1 uppercase text-[10px]">Ver Scoring Engine completo ↓</span>
                  </p>
                </div>
              </div>
            </div>

            {/* SCORING ENGINE (COLLAPSIBLE) */}
            {showScoring && (
              <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6 shadow-inner animate-fade-in space-y-6">
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                   <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2 underline decoration-primary decoration-4 underline-offset-4">
                     <Trophy className="w-4 h-4 text-primary" /> The Scoring Engine
                   </h3>
                   <span className="text-[10px] text-slate-400 font-bold uppercase italic">Valores Oficiales 2026</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Positivas */}
                  <div className="space-y-3">
                    <span className="text-[10px] font-black text-green-600 bg-green-50 px-2.5 py-1 rounded-full uppercase tracking-widest border border-green-100">Acciones Positivas</span>
                    <ul className="space-y-2 font-bold text-xs text-slate-700">
                      <li className="flex justify-between border-b border-slate-100 pb-1"><span>Try</span><span className="text-primary">+5 Pts</span></li>
                      <li className="flex justify-between border-b border-slate-100 pb-1"><span>Conversión / Penal</span><span className="text-primary">+2 Pts</span></li>
                      <li className="flex justify-between border-b border-slate-100 pb-1"><span>Tackle Ganado</span><span className="text-primary">+1 Pt</span></li>
                      <li className="flex justify-between border-b border-slate-100 pb-1"><span>Asistencia de Try</span><span className="text-primary">+2 Pts</span></li>
                      <li className="flex justify-between border-b border-slate-100 pb-1"><span>Line Robado</span><span className="text-primary">+2 Pts</span></li>
                      <li className="flex justify-between text-primary/60 italic pt-1"><span>Capitán en Fecha</span><span className="font-black">Puntaje x2</span></li>
                    </ul>
                  </div>
                  {/* Negativas */}
                  <div className="space-y-3">
                    <span className="text-[10px] font-black text-red-600 bg-red-50 px-2.5 py-1 rounded-full uppercase tracking-widest border border-red-100">Acciones Negativas</span>
                    <ul className="space-y-2 font-bold text-xs text-slate-700">
                      <li className="flex justify-between border-b border-slate-100 pb-1"><span>Knock-on</span><span className="text-red-500">-1 Pt</span></li>
                      <li className="flex justify-between border-b border-slate-100 pb-1"><span>Penal Cometido</span><span className="text-red-500">-2 Pts</span></li>
                      <li className="flex justify-between border-b border-slate-100 pb-1"><span>Tarjeta Amarilla</span><span className="text-red-500 font-black">-5 Pts</span></li>
                      <li className="flex justify-between border-b border-slate-100 pb-1"><span>Tarjeta Roja</span><span className="text-red-600 font-black">-10 Pts</span></li>
                    </ul>
                  </div>
                </div>
                
                <p className="text-[10px] text-slate-400 font-bold text-center uppercase tracking-tighter">
                   * Los puntos se computan según el rendimiento real en cancha validado por el Staff.
                </p>
              </div>
            )}
          </div>

          {/* SECCION 2: PREMIOS */}
          <div className="space-y-6">
            <h2 className="text-xl md:text-2xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-3">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white text-sm">2</div>
              Premios de Temporada
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* 2do Puesto */}
              <div className="order-2 md:order-1 bg-slate-50 rounded-2xl p-6 border-b-4 border-slate-300 text-center space-y-3 relative overflow-hidden flex flex-col justify-center">
                 <div className="absolute top-0 right-0 p-8 bg-slate-200/20 rounded-full -mr-4 -mt-4" />
                 <span className="text-3xl font-black text-slate-400">2º</span>
                 <h4 className="font-bold text-slate-700 text-sm uppercase">Premio Efectivo</h4>
                 <p className="text-2xl font-black text-slate-900">$30.000</p>
              </div>
              
              {/* 1er Puesto */}
              <div className="order-1 md:order-2 bg-gradient-to-b from-primary to-primary/90 rounded-3xl p-8 border-b-8 border-primary/30 text-center space-y-4 shadow-xl transform md:scale-110 relative overflow-hidden">
                 <div className="absolute top-0 left-0 p-12 bg-white/10 rounded-full -ml-6 -mt-6" />
                 <Trophy className="w-12 h-12 text-yellow-400 mx-auto drop-shadow-lg" />
                 <span className="text-4xl font-black text-white">1º</span>
                 <h4 className="font-bold text-white text-sm uppercase tracking-wide">Botines Gama Alta</h4>
                 <p className="text-xs text-white/80 font-bold uppercase">(A elección del ganador)</p>
              </div>

              {/* 3er Puesto */}
              <div className="order-3 md:order-3 bg-slate-50 rounded-2xl p-6 border-b-4 border-orange-200 text-center space-y-3 relative overflow-hidden flex flex-col justify-center">
                 <div className="absolute top-0 right-0 p-8 bg-orange-100/10 rounded-full -mr-4 -mt-4" />
                 <span className="text-3xl font-black text-orange-400">3º</span>
                 <h4 className="font-bold text-slate-700 text-sm uppercase">Premio Efectivo</h4>
                 <p className="text-2xl font-black text-slate-900">$15.000</p>
              </div>
            </div>
          </div>

          {/* SECCION 3: PAGO & INSCRIPCIÓN */}
          <div className="space-y-6">
            <h2 className="text-xl md:text-2xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-3">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white text-sm">3</div>
              Derecho a Juego
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-6 md:p-8 rounded-3xl border border-slate-100 shadow-inner">
               <div className="space-y-2 text-center md:text-left">
                  <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">Inscripción Única</span>
                  <div className="text-5xl font-black text-slate-800 tracking-tighter">$5.000</div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Torneo Gran DT UNI 2026</p>
               </div>
               
               <div className="flex flex-col items-center md:items-end justify-center space-y-3">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Alias Cuenta Oficial</span>
                  <button 
                    onClick={handleCopyAlias}
                    className="group relative flex items-center gap-3 bg-white px-5 py-3 rounded-2xl border-2 border-primary/20 hover:border-primary transition-all shadow-sm active:scale-95"
                  >
                    <span className="font-mono text-lg font-black text-primary">UNIMDP.GRAN.DT</span>
                    {copied ? <Check className="w-5 h-5 text-green-500 animate-bounce" /> : <Copy className="w-5 h-5 text-slate-400 group-hover:text-primary transition-colors" />}
                    
                    {copied && (
                      <span className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] font-bold px-2 py-1 rounded shadow-lg">
                        ¡COPIADO!
                      </span>
                    )}
                  </button>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Club Universitario MDP</p>
               </div>
            </div>

            {/* CARGA DE COMPROBANTE - REVISIÓN STATE */}
            {hasUploaded ? (
              <div className="bg-primary/5 border-2 border-primary/20 p-8 rounded-[2rem] text-center space-y-4">
                 <div className="w-16 h-16 bg-primary/20 text-primary rounded-full flex items-center justify-center mx-auto animate-pulse">
                    <FileCheck className="w-8 h-8" />
                 </div>
                 <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Comprobante en Revisión</h2>
                 <p className="text-sm text-slate-500 font-bold max-w-sm mx-auto leading-relaxed uppercase">
                   Una vez subido el comprobante, el Staff lo revisará y tu app se habilitará automáticamente.
                 </p>
                 <p className="text-xs text-primary font-black animate-pulse">
                   Mientras tanto, prepará tu estrategia y andá pensando tu 15 ideal.
                 </p>
              </div>
            ) : (
              <div className="space-y-4">
                <label className={`
                  flex flex-col items-center justify-center w-full h-44 border-4 border-dashed border-slate-200 rounded-3xl cursor-pointer 
                  transition-all duration-300
                  ${uploading ? 'opacity-60 cursor-not-allowed bg-slate-50' : 'hover:border-primary hover:bg-primary/5 bg-slate-50/50 group'}
                `}>
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    {uploading ? (
                      <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-primary mb-3"></div>
                    ) : (
                      <div className="p-4 bg-white rounded-2xl shadow-sm mb-4 group-hover:scale-110 transition-transform">
                        <UploadCloud className="w-8 h-8 text-primary" />
                      </div>
                    )}
                    <p className="text-sm text-slate-800 font-black uppercase tracking-tight">
                      {uploading ? 'Procesando archivo...' : 'Click acá para subir tu comprobante'}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-2 font-bold uppercase tracking-widest leading-none">JPG o PNG (máx. 5MB)</p>
                  </div>
                  <input type="file" className="hidden" accept="image/*" onChange={handleUpload} disabled={uploading} />
                </label>
                
                {error && (
                  <div className="flex items-center gap-2 justify-center text-red-500 text-xs font-bold uppercase">
                    <ShieldAlert className="w-4 h-4" /> {error}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer Minimalista */}
        <div className="flex flex-col items-center gap-4 text-slate-400 font-bold text-[10px] tracking-widest uppercase">
          <span>Club Universitario de Mar del Plata - 2026</span>
          <button 
            onClick={signOut}
            className="flex items-center gap-1.5 hover:text-primary transition-colors hover:scale-105 active:scale-95"
          >
            <LogOut className="w-3 h-3" /> Salir de la cuenta
          </button>
        </div>
      </main>

      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
    </div>
  );
}
