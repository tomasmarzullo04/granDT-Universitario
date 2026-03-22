import { LogOut, Trophy, Users, CalendarDays, Menu } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Sidebar from './Sidebar';

export default function PlayerLayout({ children }) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300);
    };
    window.addEventListener('scroll', handleScroll);
    // Verificar estado inicial
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans relative z-0">
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

      <main className="flex-1 w-full max-w-4xl mx-auto p-4 pb-24 relative z-10">
        {children}
      </main>

      {/* Scroll to Top Rugby Ball */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-6 right-6 z-50 w-16 h-16 md:w-20 md:h-20 bg-white rounded-full border-4 border-primary hover:border-accent hover:scale-110 active:scale-95 transition-all shadow-xl hover:shadow-2xl animate-fade-in flex items-center justify-center overflow-hidden p-1 sm:p-2 group"
          aria-label="Volver arriba"
        >
          <img 
            src="/rugby_ball.jpg" 
            alt="Arriba" 
            className="w-[120%] h-[120%] object-contain transform -rotate-[30deg] group-hover:rotate-0 transition-transform duration-300 pointer-events-none scale-110" 
          />
        </button>
      )}

      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
    </div>
  );
}
