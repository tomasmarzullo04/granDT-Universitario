import React from 'react';

// Generates a proper absolute position for each of the 15 players on a vertical pitch
// Coordinates are in percentages % (x, y) starting top-left
const pitchPositions = [
  // Forwards
  { top: '15%', left: '25%' }, // 1 Pilar 1
  { top: '15%', left: '50%' }, // 2 Hooker
  { top: '15%', left: '75%' }, // 3 Pilar 3
  { top: '24%', left: '38%' }, // 4 Segunda 4
  { top: '24%', left: '62%' }, // 5 Segunda 5
  { top: '35%', left: '25%' }, // 6 Tercera 6
  { top: '35%', left: '75%' }, // 7 Tercera 7
  { top: '38%', left: '50%' }, // 8 Octavo
  // Backs
  { top: '48%', left: '45%' }, // 9 Medio Scrum
  { top: '56%', left: '65%' }, // 10 Apertura
  { top: '70%', left: '16%' }, // 11 Wing Izq
  { top: '65%', left: '42%' }, // 12 1er Centro
  { top: '74%', left: '72%' }, // 13 2do Centro
  { top: '82%', left: '86%' }, // 14 Wing Der
  { top: '90%', left: '50%' }, // 15 Fullback
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
            className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center transition-all group"
            style={{ top: pos.top, left: pos.left }}
          >
            <div className={`
              w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center text-xs md:text-sm font-black shadow-md border-2
              ${player ? 'bg-primary text-white border-white' : 'bg-white/20 border-white/30 text-white/50 border-dashed'}
            `}>
              {index + 1}
            </div>
            
            <div className="mt-1 bg-black/60 px-2 py-0.5 rounded text-[10px] md:text-xs text-white font-bold max-w-[80px] truncate text-center backdrop-blur-sm">
              {(() => {
                if (!player) return 'Vacío';
                const p = Array.isArray(player) ? player[0] : player;
                const name = p?.nombre || p?.name || 'Jugador';
                return name.split(' ')[0];
              })()}
            </div>
          </div>
        );
      })}
    </div>
  );
}
