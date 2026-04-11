import { useState } from 'react';
import { X, Trophy, BookOpen, Instagram, LogOut, Code, ChevronDown, ChevronUp, ShieldAlert, Zap, Users, CalendarDays, History, Activity } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useSearchParams } from 'react-router-dom';

export default function Sidebar({ isOpen, onClose }) {
  const { user, role, signOut } = useAuth();
  const [showRules, setShowRules] = useState(false);
  const navigate = useNavigate();
  const [, setSearchParams] = useSearchParams();

  // Animación para el panel lateral
  const slideClass = isOpen ? 'translate-x-0' : 'translate-x-full';
  
  if (!user) return null;

  const handleTabClick = (tabId) => {
    setSearchParams({ tab: tabId });
    onClose();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
      {/* Overlay oscuro */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-[60] transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Panel del Menú Lateral (Sidebar) */}
      <div className={`fixed top-0 right-0 h-full w-[85vw] max-w-sm bg-base border-l border-neutral/20 z-[70] transform transition-transform duration-300 ease-in-out flex flex-col shadow-2xl ${slideClass}`}>
        
        {/* Profile Header */}
        <div className="flex items-center justify-between p-5 border-b border-neutral/20 bg-primary text-white">
          <div className="flex flex-col">
            <span className="font-bold text-white text-lg tracking-tight">
              {user?.user_metadata?.full_name || user?.email?.split('@')[0]}
            </span>
            {role === 'admin' && (
              <span className="text-[10px] bg-white text-primary px-1.5 py-0.5 rounded uppercase font-bold tracking-widest mt-1 inline-block w-max shadow-sm">
                Administrador
              </span>
            )}
          </div>
          <button onClick={onClose} className="p-2 text-white/70 hover:text-white bg-white/10 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

         {/* Navigation Section (Mobile Exclusive) */}
        <div className="p-5 border-b border-neutral/20 bg-neutral-light/30">
           <h3 className="text-[10px] text-neutral/70 font-black uppercase tracking-[0.2em] mb-4">Navegación Principal</h3>
           <div className="grid grid-cols-1 gap-2">
              {/* ACCESO ADMIN (Solo si aplica) */}
              {role === 'admin' && (
                 <button
                  onClick={() => {
                    navigate('/admin');
                    onClose();
                  }}
                  className="flex items-center gap-3 p-3 bg-primary/5 border-2 border-primary/20 rounded-xl hover:border-primary transition-all group mb-2"
                >
                  <ShieldAlert className="w-5 h-5 text-primary" />
                  <span className="font-black text-primary text-sm uppercase tracking-tight">Panel Administrador</span>
                </button>
              )}

              <button
                onClick={() => { navigate('/resumenes'); onClose(); }}
                className="flex items-center gap-3 p-3 bg-white border border-neutral/10 rounded-xl hover:border-accent transition-all group active:scale-95"
              >
                <Activity className="w-5 h-5 text-accent" />
                <span className="font-black text-primary text-sm uppercase tracking-tight">Inicio (Resumen)</span>
              </button>

              {[
                { label: 'Mi Equipo', icon: Users, id: 'equipo' },
                { label: 'Jugadores', icon: Users, id: 'jugadores' },
                { label: 'Ranking', icon: Trophy, id: 'ranking' },
                { label: 'Fechas & Fixture', icon: CalendarDays, id: 'fechas' },
                { label: 'Historial', icon: History, id: 'historial' }
              ].map(item => (
                <button
                  key={item.id}
                  onClick={() => {
                    navigate(`/dashboard?tab=${item.id}`);
                    onClose();
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="flex items-center gap-3 p-3 bg-white border border-neutral/10 rounded-xl hover:border-accent transition-all group active:scale-95"
                >
                  <item.icon className="w-5 h-5 text-accent" />
                  <span className="font-black text-primary text-sm uppercase tracking-tight">{item.label}</span>
                </button>
              ))}
           </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          
          {/* Sección Mi Perfil */}
          <div>
            <h3 className="text-xs text-neutral font-bold uppercase tracking-widest mb-3 flex items-center gap-2">
              <Trophy className="w-4 h-4 text-accent" /> Mi Perfil
            </h3>
            <div className="bg-neutral-light border border-neutral/20 rounded-xl p-4 flex justify-between items-center shadow-sm">
              <div className="flex flex-col">
                <span className="text-sm text-neutral font-medium tracking-wide">Puntos Totales</span>
                <span className="text-2xl font-black text-primary">0</span>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-sm text-neutral font-medium tracking-wide">Posición</span>
                <span className="text-2xl font-black text-accent">#--</span>
              </div>
            </div>
          </div>

          {/* Sección Reglas (Collapsible) */}
          <div>
            <h3 className="text-xs text-neutral font-bold uppercase tracking-widest mb-3 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-accent" /> Reglamento
            </h3>
            <div className="bg-neutral-light border border-neutral/20 rounded-xl overflow-hidden shadow-sm">
              <button 
                onClick={() => setShowRules(!showRules)}
                className="w-full flex items-center justify-between p-4 text-left transition-colors hover:bg-gray-200/50"
              >
                <span className="font-bold text-primary text-sm">Ver Reglas de Juego</span>
                {showRules ? <ChevronUp className="w-4 h-4 text-accent" /> : <ChevronDown className="w-4 h-4 text-accent" />}
              </button>
              
              {showRules && (
                <div className="p-4 border-t border-neutral/20 bg-white space-y-4">
                  <div className="mb-4">
                    <h4 className="flex items-center gap-1.5 text-accent font-bold text-sm mb-1">
                      <ShieldAlert className="w-4 h-4" /> Regla 5-5-5
                    </h4>
                    <p className="text-xs text-neutral leading-relaxed">
                      Selección estricta de 15 jugadores equitativos: 5 de Primera, 5 de Intermedia y 5 de Pre-intermedia.
                    </p>
                  </div>
                  <div className="mb-4">
                    <h4 className="flex items-center gap-1.5 text-accent font-bold text-sm mb-1">
                      <CalendarDays className="w-4 h-4" /> Cierre de Equipos
                    </h4>
                    <p className="text-xs text-neutral leading-relaxed">
                      El equipo se podrá configurar o modificar hasta el viernes de cada fecha a las 23:59 hs.
                    </p>
                  </div>
                  <div>
                    <h4 className="flex items-center gap-1.5 text-accent font-bold text-sm mb-2">
                      <Zap className="w-4 h-4" /> Puntuación
                    </h4>
                    <ul className="text-xs text-gray-700 space-y-1.5 font-medium">
                      <li className="flex justify-between border-b mx-1 border-neutral/10 pb-1"><span>Try</span><span className="text-primary font-bold">+15 pts</span></li>
                      <li className="flex justify-between border-b mx-1 border-neutral/10 pb-1"><span>Conversión / Penal</span><span className="text-primary font-bold">+3 pts</span></li>
                      <li className="flex justify-between border-b mx-1 border-neutral/10 pb-1"><span>Drop</span><span className="text-primary font-bold">+5 pts</span></li>
                      <li className="flex justify-between border-b mx-1 border-neutral/10 pb-1"><span>Tackle</span><span className="text-primary font-bold">+2 pts</span></li>
                      <li className="flex justify-between border-b mx-1 border-neutral/10 pb-1"><span>Tackle Ofensivo</span><span className="text-primary font-bold">+5 pts</span></li>
                      <li className="flex justify-between border-b mx-1 border-neutral/10 pb-1"><span>Recuperación</span><span className="text-primary font-bold">+5 pts</span></li>
                      <li className="flex justify-between border-b mx-1 border-neutral/10 pb-1"><span>Asistencia</span><span className="text-primary font-bold">+5 pts</span></li>
                      <li className="flex justify-between border-b mx-1 border-neutral/10 pb-1"><span>Corte limpio</span><span className="text-primary font-bold">+3 pts</span></li>
                      <li className="flex justify-between border-b mx-1 border-neutral/10 pb-1"><span>Penal en contra</span><span className="text-red-500 font-bold">-5 pts</span></li>
                      <li className="flex justify-between border-b mx-1 border-neutral/10 pb-1"><span>Amarilla</span><span className="text-red-500 font-bold">-5 pts</span></li>
                      <li className="flex justify-between mx-1"><span>Roja</span><span className="text-red-600 font-bold">-10 pts</span></li>
                    </ul>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sección Institucional */}
          <div>
            <h3 className="text-xs text-neutral font-bold uppercase tracking-widest mb-3 flex items-center gap-2">
              <Code className="w-4 h-4 text-accent" /> Institucional
            </h3>
            <a 
              href="https://www.instagram.com/clubuniversitario.mdp/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-3 bg-gradient-to-r from-pink-50 to-purple-50 border border-pink-100 rounded-xl p-4 hover:from-pink-100 hover:to-purple-100 transition-colors shadow-sm"
            >
              <Instagram className="w-5 h-5 text-pink-600" />
              <span className="font-bold text-gray-800 text-sm">@clubuniversitario.mdp</span>
            </a>
          </div>

        </div>

        {/* Footer / Cerrar Sesión */}
        <div className="p-5 border-t border-neutral/20 bg-neutral-light">
          <button 
            onClick={() => {
              onClose();
              signOut();
            }}
            className="w-full flex items-center justify-center gap-2 bg-white text-red-600 font-bold py-3 rounded-xl hover:bg-gray-50 transition-colors border border-red-200 shadow-sm"
          >
            <LogOut className="w-4 h-4" />
            Cerrar Sesión
          </button>
        </div>

      </div>
    </>
  );
}
