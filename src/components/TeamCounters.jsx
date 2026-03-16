export default function TeamCounters({ counts }) {
  const categories = [
    { id: 'primera', label: 'Primera', count: counts.primera, target: 5 },
    { id: 'intermedia', label: 'Intermedia', count: counts.intermedia, target: 5 },
    { id: 'pre', label: 'Pre-inter', count: counts.pre, target: 5 }
  ];

  return (
    <div className="flex justify-between md:justify-around items-center bg-white/95 backdrop-blur-sm p-4 rounded-xl border border-neutral/20 shadow-sm mb-6 sticky top-[76px] z-40">
      {categories.map((cat) => {
        const isComplete = cat.count === cat.target;
        return (
          <div key={cat.id} className="flex flex-col items-center gap-2 group">
            <div className={`
              w-16 h-16 rounded-full flex flex-col items-center justify-center font-bold text-lg border-2 shadow-inner transition-all duration-500
              ${isComplete 
                ? 'bg-primary border-primary text-white shadow-md' 
                : 'bg-transparent border-neutral/30 text-primary'
              }
            `}>
              <span>{cat.count}</span>
              <span className={`text-xs font-normal border-t px-1 opacity-80 ${isComplete ? 'border-primary' : 'border-neutral/30'}`}>5</span>
            </div>
            <span className="text-xs md:text-sm uppercase tracking-wider font-semibold text-neutral">
              {cat.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
