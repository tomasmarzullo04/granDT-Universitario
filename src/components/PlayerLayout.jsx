import { LogOut, Trophy, Users, CalendarDays, Menu } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import Sidebar from './Sidebar';

export default function PlayerLayout({ children }) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <header className="bg-primary text-white shadow-md sticky top-0 z-50 h-[60px] flex items-center">
        <div className="w-full max-w-4xl mx-auto px-4 flex justify-between items-center">
          {/* Logo (Left) */}
          <div className="flex items-center gap-2">
            <div className="bg-white p-0.5 rounded-full shadow-sm w-9 h-9 md:w-11 md:h-11 flex items-center justify-center overflow-hidden shrink-0">
               <img src="/escudo.jpg" alt="Escudo" className="w-full h-full object-contain" />
            </div>
            <div className="hidden sm:block">
              <h1 className="font-black text-xs md:text-lg leading-tight tracking-tight uppercase">Gran DT UNI</h1>
              <p className="text-[7px] md:text-[9px] text-white/80 font-bold tracking-[0.2em] uppercase">Edición 2026</p>
            </div>
          </div>

          {/* Title (Center - Mobile Only) */}
          <div className="sm:hidden flex flex-col items-center">
            <h1 className="font-black text-sm leading-tight tracking-tighter uppercase whitespace-nowrap">Gran DT UNI</h1>
            <p className="text-[7px] text-white/60 font-bold tracking-[0.3em] uppercase">2026</p>
          </div>
          
          {/* Menu Button (Right) */}
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 hover:bg-white/10 rounded-xl transition-all"
            aria-label="Menú"
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>
      </header>

      <main className="flex-1 w-full max-w-4xl mx-auto p-4 pb-24">
        {children}
      </main>

      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
    </div>
  );
}
