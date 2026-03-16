import React from 'react';

// Generates a proper absolute position for each of the 15 players on a vertical pitch
// Coordinates are in percentages % (x, y) starting top-left
const pitchPositions = [
  // Front Row (1, 2, 3)
  { top: '15%', left: '20%' },
  { top: '15%', left: '50%' },
  { top: '15%', left: '80%' },
  // Second Row (4, 5)
  { top: '25%', left: '35%' },
  { top: '25%', left: '65%' },
  // Back Row (6, 8, 7)
  { top: '35%', left: '25%' },
  { top: '38%', left: '50%' }, // Number 8 slightly deeper
  { top: '35%', left: '75%' },
  // Half backs (9, 10)
  { top: '48%', left: '45%' }, // Scrum-half
  { top: '56%', left: '60%' }, // Fly-half
  // Centers (12, 13)
  { top: '65%', left: '40%' },
  { top: '65%', left: '75%' },
  // Wings (11, 14)
  { top: '75%', left: '15%' },
  { top: '75%', left: '85%' },
  // Fullback (15)
  { top: '88%', left: '50%' },
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
              {player ? (player.nombre || player.name).split(' ')[0] : 'Vacío'}
            </div>
          </div>
        );
      })}
    </div>
  );
}
