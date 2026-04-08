import { Check, User, Crown } from 'lucide-react';

export default function PlayerCard({ player, isSelected, isCaptain, onToggle, onCaptainToggle, disabled }) {

  return (
    <div
      onClick={() => {
        if (!disabled || isSelected) {
          onToggle();
        }
      }}
      className={`
        relative w-full text-left overflow-hidden rounded-xl border p-4 transition-all duration-300 ease-in-out group
        ${isSelected 
          ? 'bg-accent/5 border-accent ring-1 ring-accent shadow-md scale-[1.01]' 
          : 'bg-white border-neutral/30 hover:border-accent hover:bg-neutral-light/30'
        }
        ${(disabled && !isSelected) ? 'opacity-50 cursor-not-allowed grayscale-[0.5]' : 'cursor-pointer hover-shadow'}
      `}
    >
      <div className="flex items-center gap-4 relative z-10 w-full">
        <div className={`
          w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 flex-shrink-0
          ${isSelected 
            ? 'bg-accent text-white scale-110 shadow-sm' 
            : 'bg-neutral-light text-neutral group-hover:text-primary group-hover:bg-neutral/20 group-hover:scale-105'
          }
        `}>
          {isSelected ? <Check className="w-6 h-6 stroke-[3px]" /> : <User className="w-6 h-6" />}
        </div>
        
        <div className="flex-1 min-w-0 pr-2">
          <div className="flex justify-between items-start gap-2">
            <h3 className="font-black text-sm text-slate-900 leading-tight player-name-full">{player.nombre || player.name}</h3>
          </div>
          <p className="text-[10px] text-neutral font-bold uppercase tracking-widest mt-0.5">{player.posicion || 'Jugador'}</p>
        </div>
      </div>
      
      {isSelected && (
        <button 
          onClick={onCaptainToggle}
          className={`
            absolute bottom-0 right-0 p-3 pt-4 pl-4 rounded-tl-2xl z-20 transition-all duration-300 flex items-center justify-center
            ${isCaptain ? 'bg-yellow-400 text-white' : 'bg-neutral-light/80 text-neutral hover:bg-yellow-100 hover:text-yellow-600 border-t border-l border-neutral/10'}
          `}
          title={isCaptain ? 'Quitar Capitán' : 'Hacer Capitán (Puntos Dobles)'}
        >
          <Crown className={`w-5 h-5 ${isCaptain ? 'fill-yellow-400 drop-shadow-sm' : ''}`} />
        </button>
      )}

      {/* Decorative background gradient visible when selected */}
      <div className={`
        absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent transition-opacity duration-300 pointer-events-none
        ${isSelected ? 'opacity-100' : 'opacity-0'}
      `} />
    </div>
  );
}
