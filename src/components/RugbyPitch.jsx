import { PITCH_POSITIONS } from '../constants/pitchPositions';

export default function RugbyPitch({ players }) {
  // Ensure we always have 15 slots rendering, even if some players are missing
  const slots = Array.from({ length: 15 }).map((_, i) => players[i] || null);

  return (
    <div className="relative w-full aspect-[2/3] max-w-md mx-auto pitch-grass rounded-xl overflow-hidden shadow-[inset_0_0_20px_rgba(0,0,0,0.5)] border-2 border-[#12362b]">
      {/* Pitch Markings (Chalk Lines) */}
      <div className="absolute inset-x-2 inset-y-2 border-2 border-white/85 shadow-[0_0_2px_rgba(255,255,255,0.4)] pointer-events-none z-0"></div>
      <div className="absolute inset-x-2 top-1/2 -mt-[1px] border-t-2 border-white/85 shadow-[0_0_2px_rgba(255,255,255,0.4)] pointer-events-none z-0"></div>
      
      {/* 10m lines */}
      <div className="absolute inset-x-2 top-[40%] border-t-[1.5px] border-dashed border-white/60 pointer-events-none z-0"></div>
      <div className="absolute inset-x-2 top-[60%] border-t-[1.5px] border-dashed border-white/60 pointer-events-none z-0"></div>

      {/* 22m lines */}
      <div className="absolute inset-x-2 top-[22%] border-t-2 border-white/85 shadow-[0_0_2px_rgba(255,255,255,0.4)] pointer-events-none z-0"></div>
      <div className="absolute inset-x-2 top-[78%] border-t-2 border-white/85 shadow-[0_0_2px_rgba(255,255,255,0.4)] pointer-events-none z-0"></div>
      
      {/* 5m lines (dashed) */}
      <div className="absolute inset-x-2 top-[5%] border-t border-dashed border-white/50 pointer-events-none z-0"></div>
      <div className="absolute inset-x-2 top-[95%] border-t border-dashed border-white/50 pointer-events-none z-0"></div>
      
      {/* Numbering */}
      <span className="absolute top-[22%] left-4 text-white/30 font-bebas text-2xl -translate-y-1/2 pointer-events-none z-0 select-none">22</span>
      <span className="absolute top-[78%] left-4 text-white/30 font-bebas text-2xl -translate-y-1/2 rotate-180 pointer-events-none z-0 select-none">22</span>
      <span className="absolute top-[40%] left-4 text-white/20 font-bebas text-xl -translate-y-1/2 pointer-events-none z-0 select-none">10</span>
      <span className="absolute top-[60%] left-4 text-white/20 font-bebas text-xl -translate-y-1/2 rotate-180 pointer-events-none z-0 select-none">10</span>
      <span className="absolute top-[50%] left-4 text-white/20 font-bebas text-xl -translate-y-1/2 pointer-events-none z-0 select-none">50</span>

        {slots.map((player, index) => {
          const pos = PITCH_POSITIONS[index];
        return (
          <div 
            key={index}
            className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center transition-all group z-10 cursor-pointer hover:z-30 scale-100 hover:scale-110 active:scale-95 glow-hover"
            style={{ top: pos.top, left: pos.left }}
          >
            <div className={`
              w-6 h-6 md:w-8 md:h-8 rounded-full flex items-center justify-center text-[11px] md:text-[15px] shadow-[0_4px_6px_rgba(0,0,0,0.6)] border-[2.5px] transition-all duration-300 font-bebas tracking-wide
              ${player ? 'bg-primary text-white border-white' : 'bg-black/40 border-white/60 text-white/70 border-dashed group-hover:bg-white/20 group-hover:text-white'}
            `}>
              {index + 1}
            </div>
            
            <div 
              className="mt-1 font-bold text-center transition-all player-name-full uppercase tracking-tight"
              style={{ 
                color: '#FFFFFF',
                lineHeight: '1.1',
                maxWidth: '75px',
                fontSize: '9px',
                textShadow: '0px 1px 3px rgba(0,0,0,0.9), 0px 0px 2px rgba(0,0,0,1), 1px 1px 1px rgba(0,0,0,1)'
              }}
            >
              {(() => {
                if (!player) return <span className="text-white/40 text-[7px] uppercase tracking-tighter">Vacío</span>;
                const p = Array.isArray(player) ? player[0] : player;
                return p?.nombre || p?.name || 'Jugador';
              })()}
            </div>
          </div>
        );
      })}
    </div>
  );
}
