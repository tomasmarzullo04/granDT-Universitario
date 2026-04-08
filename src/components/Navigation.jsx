import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { LayoutDashboard, Users, Trophy, History, Shield, CalendarDays } from 'lucide-react';

export default function Navigation() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const activeTab = searchParams.get('tab');
  const isResumenes = location.pathname === '/resumenes';

  const items = [
    { 
      id: 'inicio', 
      label: 'INICIO', 
      icon: LayoutDashboard, 
      to: '/resumenes',
      active: isResumenes 
    },
    { 
      id: 'equipo', 
      label: 'MI EQUIPO', 
      icon: Shield, 
      to: '/dashboard?tab=equipo',
      active: !isResumenes && (activeTab === 'equipo' || !activeTab)
    },
    { 
      id: 'jugadores', 
      label: 'JUGADORES', 
      icon: Users, 
      to: '/dashboard?tab=jugadores',
      active: !isResumenes && activeTab === 'jugadores'
    },
    { 
      id: 'ranking', 
      label: 'RANKING', 
      icon: Trophy, 
      to: '/dashboard?tab=ranking',
      active: !isResumenes && activeTab === 'ranking'
    },
    { 
      id: 'fechas', 
      label: 'FECHAS', 
      icon: CalendarDays, 
      to: '/dashboard?tab=fechas',
      active: !isResumenes && activeTab === 'fechas'
    },
    { 
      id: 'historial', 
      label: 'HISTORIAL', 
      icon: History, 
      to: '/dashboard?tab=historial',
      active: !isResumenes && activeTab === 'historial'
    }
  ];

  return (
    <div className="hidden md:flex bg-white p-1 rounded-2xl border border-neutral/20 shadow-sm sticky top-[72px] z-40 overflow-x-auto no-scrollbar mb-6">
      <div className="flex w-full min-w-max md:min-w-0">
        {items.map(item => (
          <Link
            key={item.id}
            to={item.to}
            className={`flex-1 flex items-center justify-center gap-2 px-3 md:px-5 py-2.5 md:py-3.5 rounded-xl text-[10px] md:text-sm font-black transition-all whitespace-nowrap ${
              item.active 
                ? 'bg-primary text-white shadow-lg scale-[1.02]' 
                : 'text-neutral/60 hover:text-primary hover:bg-neutral-light'
            }`}
          >
            <item.icon className={`w-3.5 h-3.5 md:w-4 h-4 ${item.active ? 'text-white' : 'text-accent'}`} />
            {item.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
