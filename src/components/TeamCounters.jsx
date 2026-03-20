export default function TeamCounters({ counts, activeCategory }) {
  const categories = [
    { id: 'primera', label: 'Primera', count: counts?.primera || 0, target: 5 },
    { id: 'intermedia', label: 'Intermedia', count: counts?.intermedia || 0, target: 5 },
    { id: 'pre', label: 'Pre-inter', count: counts?.pre || 0, target: 5 }
  ];

  return (
    <div className="bg-white/95 backdrop-blur-sm rounded-2xl border border-neutral/20 shadow-lg mb-6 sticky top-[60px] z-40 overflow-hidden">
      <div className="flex justify-around items-center p-3 md:p-6 divide-x divide-neutral/10">
        {categories.map((cat) => {
          const isComplete = cat.count === cat.target;
          return (
            <div key={cat.id} className="flex-1 flex flex-col items-center gap-1 group">
              <div className={`
                w-10 h-10 md:w-14 md:h-14 rounded-full flex flex-col items-center justify-center font-black text-xs md:text-base border-2 shadow-inner transition-all duration-500
                ${isComplete 
                  ? 'bg-primary border-primary text-white shadow-md' 
                  : activeCategory === cat.id
                    ? 'bg-white border-accent text-accent ring-2 ring-accent/20'
                    : 'bg-transparent border-neutral/30 text-primary'
                }
              `}>
                <span>{Number(cat.count) || 0}</span>
                <span className={`text-[8px] md:text-[10px] font-normal border-t px-2 opacity-80 ${isComplete ? 'border-primary' : 'border-neutral/30'}`}>5</span>
              </div>
              <span className="text-[9px] md:text-[11px] uppercase tracking-wider font-black text-neutral">
                {cat.id === 'pre' ? 'Pre' : cat.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

