import { useState } from 'react';
import { Shield, Menu } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import Sidebar from './Sidebar';

export default function Layout({ children }) {
  const { user, role } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  return (
    <div className="min-h-screen bg-base text-neutral-800 flex flex-col font-sans">
      <header className="bg-primary text-white p-4 shadow-md sticky top-0 z-50">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-white p-0.5 rounded-full shadow-sm flex items-center justify-center overflow-hidden w-12 h-12 flex-shrink-0">
              <img 
                src="/escudo.jpg" 
                alt="Escudo Club Universitario" 
                className="w-full h-full object-contain"
                onError={(e) => {
                  e.target.onerror = null; 
                  e.target.src = 'https://via.placeholder.com/150?text=UNI';
                }}
              />
            </div>
            <div>
              <h1 className="font-bold text-xl leading-tight tracking-wide">Club Universitario</h1>
              <p className="text-xs text-white/90 font-bold tracking-widest uppercase">Gran DT</p>
            </div>
          </div>
          <nav className="flex items-center gap-2">
            {role === 'admin' && (
              <a href="/admin" className="text-xs font-bold bg-white text-primary px-3 py-1.5 rounded-md hover:bg-neutral-light transition-colors mr-2">
                ADMIN
              </a>
            )}
            {user && (
               <button 
                 onClick={() => setIsSidebarOpen(true)} 
                 className="flex items-center gap-2 text-white hover:text-white/80 transition-colors p-2 rounded-md hover:bg-white/10"
                 title="Abrir Menú"
               >
                 <Menu className="w-6 h-6" />
               </button>
            )}
          </nav>
        </div>
      </header>
      <main className="flex-1 max-w-4xl mx-auto w-full p-4 pb-24 relative">
        {children}
      </main>
      
      {/* Barra Lateral / Menú Hamburguesa */}
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
    </div>
  );
}
