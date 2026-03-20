import React from 'react';

// Generates a proper absolute position for each of the 15 players on a vertical pitch
// Coordinates are in percentages % (x, y) starting top-left
const pitchPositions = [
  // Forwards (Spread out more)
  { top: '10%', left: '22%' }, // 1 Pilar 1
  { top: '10%', left: '50%' }, // 2 Hooker
  { top: '10%', left: '78%' }, // 3 Pilar 3
  { top: '22%', left: '35%' }, // 4 Segunda 4
  { top: '22%', left: '65%' }, // 5 Segunda 5
  { top: '34%', left: '20%' }, // 6 Tercera 6
  { top: '34%', left: '80%' }, // 7 Tercera 7
  { top: '42%', left: '50%' }, // 8 Octavo
  // Backs (Spread out more)
  { top: '54%', left: '42%' }, // 9 Medio Scrum
  { top: '62%', left: '68%' }, // 10 Apertura
  { top: '74%', left: '12%' }, // 11 Wing Izq
  { top: '70%', left: '40%' }, // 12 1er Centro
  { top: '78%', left: '70%' }, // 13 2do Centro
  { top: '84%', left: '88%' }, // 14 Wing Der
  { top: '94%', left: '50%' }, // 15 Fullback
];

export default function RugbyPitch({ players }) {
  // Ensure we always have 15 slots rendering, even if some players are missing
  const slots = Array.from({ length: 15 }).map((_, i) => players[i] || null);

  return (
    <div className="relative w-full aspect-[2/3] max-w-md mx-auto bg-green-700/90 rounded-xl overflow-hidden shadow-inner border border-green-800">
      {/* Pitch Markings */}
      <div className="absolute inset-x-2 inset-y-2 border-2 border-white/40"></div>
      <div className="absolute inset-x-2 top-1/2 -mt-[1px] border-t-2 border-white/40"></div>
      <div className="absolute inset-x-2 top-[15%] border-t border-dashed border-white/30"></div>
      <div className="absolute inset-x-2 top-[30%] border-t-2 border-white/30"></div>
      <div className="absolute inset-x-2 top-[70%] border-t-2 border-white/30"></div>
      <div className="absolute inset-x-2 top-[85%] border-t border-dashed border-white/30"></div>
      
      {/* 22m Numbering */}
      <span className="absolute top-[30%] left-4 text-white/20 font-black text-2xl -translate-y-1/2">22</span>
      <span className="absolute top-[70%] left-4 text-white/20 font-black text-2xl -translate-y-1/2 rotate-180">22</span>

      {/* Players */}
      {slots.map((player, index) => {
        const pos = pitchPositions[index];
        return (
          <div 
            key={index}
            className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center transition-all group cursor-pointer hover:z-20 scale-100 hover:scale-110 active:scale-95"
            style={{ top: pos.top, left: pos.left }}
          >
            <div className={`
              w-6 h-6 md:w-8 md:h-8 rounded-full flex items-center justify-center text-[10px] md:text-sm font-black shadow-md border-2 transition-all duration-300
              ${player ? 'bg-primary text-white border-white' : 'bg-white/20 border-white/30 text-white/50 border-dashed group-hover:bg-white/40 group-hover:border-white/50 group-hover:text-white'}
            `}>
              {index + 1}
            </div>
            
            <div 
              className="mt-0.5 text-white font-black text-center transition-all player-name-full"
              style={{ 
                lineHeight: '1.1',
                maxWidth: '65px',
                fontSize: '9px',
                textShadow: '0 1px 3px rgba(0,0,0,0.9), 0 0 2px rgba(0,0,0,0.5)'
              }}
            >
              {(() => {
                if (!player) return <span className="opacity-40 text-[7px] uppercase tracking-tighter">Vacío</span>;
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
