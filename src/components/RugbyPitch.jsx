import React from 'react';

// Generates a proper absolute position for each of the 15 players on a vertical pitch
// Coordinates are in percentages % (x, y) starting top-left
const pitchPositions = [
  // Forwards (The Pack) - Row 1
  { top: '10%', left: '26%' }, // 1 Pilar 1
  { top: '10%', left: '50%' }, // 2 Hooker
  { top: '10%', left: '74%' }, // 3 Pilar 3
  // Forwards - Row 2
  { top: '19%', left: '38%' }, // 4 Segunda 4
  { top: '19%', left: '62%' }, // 5 Segunda 5
  // Forwards - Row 3
  { top: '28%', left: '20%' }, // 6 Tercera 6
  { top: '28%', left: '80%' }, // 7 Tercera 7
  { top: '32%', left: '50%' }, // 8 Octavo
  // Backs - The Diagonal
  { top: '44%', left: '46%' }, // 9 Medio Scrum
  { top: '54%', left: '58%' }, // 10 Apertura
  { top: '75%', left: '12%' }, // 11 Wing Izq
  { top: '64%', left: '70%' }, // 12 1er Centro
  { top: '74%', left: '82%' }, // 13 2do Centro
  { top: '75%', left: '92%' }, // 14 Wing Der
  { top: '92%', left: '50%' }, // 15 Fullback
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
                lineHeight: '1',
                maxWidth: '65px',
                fontSize: '8px',
                textShadow: '1px 1px 1px #000, -1px -1px 1px #000, 1px -1px 1px #000, -1px 1px 1px #000, 0 2px 4px rgba(0,0,0,0.8)'
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
