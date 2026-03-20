export default function TeamCounters({ counts, activeCategory, budget }) {
  const categories = [
    { id: 'primera', label: 'Primera', count: counts.primera, target: 5 },
    { id: 'intermedia', label: 'Intermedia', count: counts.intermedia, target: 5 },
    { id: 'pre', label: 'Pre-inter', count: counts.pre, target: 5 }
  ];

  const isLowBudget = budget?.remaining < 10000000;

  return (
    <div className="bg-white/95 backdrop-blur-sm rounded-2xl border border-neutral/20 shadow-lg mb-6 sticky top-[60px] z-40 overflow-hidden">
      <div className="flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-neutral/10">
        {/* Categories Section */}
        <div className="flex-1 flex justify-around items-center p-3 md:p-4">
          {categories.map((cat) => {
            const isComplete = cat.count === cat.target;
            return (
              <div key={cat.id} className="flex flex-col items-center gap-1 group">
                <div className={`
                  w-10 h-10 md:w-12 md:h-12 rounded-full flex flex-col items-center justify-center font-black text-xs md:text-sm border-2 shadow-inner transition-all duration-500
                  ${isComplete 
                    ? 'bg-primary border-primary text-white shadow-md' 
                    : activeCategory === cat.id
                      ? 'bg-white border-accent text-accent ring-2 ring-accent/20'
                      : 'bg-transparent border-neutral/30 text-primary'
                  }
                `}>
                  <span>{cat.count}</span>
                  <span className={`text-[8px] md:text-[9px] font-normal border-t px-1 opacity-80 ${isComplete ? 'border-primary' : 'border-neutral/30'}`}>5</span>
                </div>
                <span className="text-[9px] md:text-[10px] uppercase tracking-wider font-black text-neutral">
                  {cat.id === 'pre' ? 'Pre' : cat.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Budget Section */}
        {budget && (
          <div className="bg-neutral-light/30 px-6 py-4 flex flex-col justify-center min-w-[240px]">
            <div className="flex justify-between items-center mb-1">
              <span className="text-[10px] font-black text-neutral uppercase tracking-widest">Saldo Restante</span>
              <span className={`text-sm font-black ${isLowBudget ? 'text-red-600 animate-pulse' : 'text-primary'}`}>
                ${budget.remaining.toLocaleString()}
              </span>
            </div>
            
            <div className="w-full h-1.5 bg-neutral/10 rounded-full overflow-hidden mb-2">
              <div 
                className={`h-full transition-all duration-1000 ${isLowBudget ? 'bg-red-500' : 'bg-accent'}`}
                style={{ width: `${Math.max(0, Math.min(100, (budget.remaining / budget.total) * 100))}%` }}
              ></div>
            </div>

            <div className="flex justify-between text-[9px] font-bold text-neutral/60 uppercase">
              <span>Gasto: ${budget.spent.toLocaleString()}</span>
              <span>Total: $100M</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

