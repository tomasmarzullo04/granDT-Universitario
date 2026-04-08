import { Shield, LogOut, LayoutDashboard, ClipboardCheck } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';

export default function AdminLayout({ children }) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <header className="bg-primary text-white p-2 md:p-4 shadow-lg sticky top-0 z-50 h-14 md:h-20 flex items-center">
        <div className="max-w-7xl mx-auto flex justify-between items-center w-full">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="bg-white p-0.5 rounded-full shadow-sm w-8 h-8 md:w-10 md:h-10 flex items-center justify-center overflow-hidden">
              <img src="/escudo.jpg" alt="Escudo" className="w-full h-full object-contain" />
            </div>
            <div>
              <h1 className="font-bold text-sm md:text-lg leading-tight uppercase tracking-tighter">Admin Portal</h1>
              <p className="hidden md:block text-[10px] text-white/70 font-bold tracking-[0.2em] uppercase">Club Universitario</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 md:gap-4">
            <div className="hidden sm:flex items-center gap-1 bg-white/10 px-2 md:px-3 py-1 md:py-1.5 rounded-full border border-white/20">
              <Shield className="w-3 h-3 md:w-3.5 md:h-3.5 text-accent" />
              <span className="text-[10px] md:text-xs font-bold uppercase tracking-wider">{user?.email?.split('@')[0]}</span>
            </div>
            <button 
              onClick={handleSignOut}
              className="p-1.5 md:p-2 hover:bg-white/10 rounded-full transition-colors text-white/80 hover:text-white"
              title="Cerrar Sesión"
            >
              <LogOut className="w-4 h-4 md:w-5 md:h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-7xl mx-auto px-2 md:px-6 py-4 md:py-8 pb-28 md:pb-8">
        {children}
      </main>
      
      {/* Footer Nav for Mobile (Optional, but pro) */}
      <nav className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-md border border-neutral/20 rounded-2xl shadow-xl px-6 py-3 flex gap-8 z-50">
         <button className="text-primary opacity-40 hover:opacity-100 transition-opacity"><LayoutDashboard className="w-6 h-6" /></button>
         <button className="text-primary opacity-40 hover:opacity-100 transition-opacity"><ClipboardCheck className="w-6 h-6" /></button>
      </nav>
    </div>
  );
}
