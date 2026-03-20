import { useState, useEffect, useCallback } from 'react';
import {
  getAllFechas,
  getConvocados,
  getEstadisticasPartido,
  upsertEstadisticasCategoria,
  publicarResultadosFecha,
  calcularPuntosJugador,
  SCORING,
} from '../../lib/api';
import {
  Save, Loader2, FileBarChart, ChevronDown, CheckCircle,
  AlertCircle, TrendingUp, Zap, AlertTriangle, X,
} from 'lucide-react';

const CATEGORIES = ['Primera', 'Intermedia', 'Pre-intermedia'];
const CAT_KEY = { 'Primera': 'primera', 'Intermedia': 'intermedia', 'Pre-intermedia': 'pre' };

const STAT_FIELDS = [
  { key: 'tries',       label: 'Try',    pts: SCORING.TRY,        color: 'text-green-600',  bg: 'bg-green-50',  border: 'border-green-200' },
  { key: 'conversiones',label: 'Conv',   pts: SCORING.CONVERSION, color: 'text-blue-600',   bg: 'bg-blue-50',   border: 'border-blue-200' },
  { key: 'penales',     label: 'Penal',  pts: SCORING.PENAL,      color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-200' },
  { key: 'drops',       label: 'Drop',   pts: SCORING.DROP,       color: 'text-violet-600', bg: 'bg-violet-50', border: 'border-violet-200' },
  { key: 'amarillas',   label: 'Ama.',   pts: SCORING.AMARILLA,   color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-200' },
  { key: 'rojas',       label: 'Roja',   pts: SCORING.ROJA,       color: 'text-red-600',    bg: 'bg-red-50',    border: 'border-red-200' },
];

// ─── StatBox Component ──────────────────────────────────────────────────────
function StatBox({ field, value, onInc, onDec }) {
  return (
    <div className={`flex flex-col items-center gap-1 px-2 py-2 rounded-xl border ${field.bg} ${field.border} min-w-[52px]`}>
      <span className={`text-[9px] font-black uppercase tracking-widest ${field.color}`}>{field.label}</span>
      <span className="text-[8px] font-bold text-neutral opacity-60">
        {field.pts > 0 ? `+${field.pts}` : field.pts}
      </span>
      <button
        onClick={onInc}
        className="w-6 h-6 rounded-lg bg-white border border-neutral/20 flex items-center justify-center font-black text-sm text-primary hover:bg-primary hover:text-white hover:border-primary hover-shadow transition-all shadow-sm"
      >
        +
      </button>
      <span className={`text-base font-black leading-none ${value > 0 ? field.color : 'text-neutral/40'}`}>
        {value}
      </span>
      <button
        onClick={onDec}
        disabled={value <= 0}
        className="w-6 h-6 rounded-lg bg-white border border-neutral/20 flex items-center justify-center font-black text-sm text-neutral hover:bg-red-50 hover:text-red-500 hover:border-red-200 hover-shadow transition-all shadow-sm disabled:opacity-30 disabled:cursor-not-allowed"
      >
        −
      </button>
    </div>
  );
}

// ─── ConfirmPublishModal ────────────────────────────────────────────────────
function ConfirmPublishModal({ onConfirm, onCancel, loading }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border border-neutral/20 animate-fade-in">
        <div className="flex items-center justify-between mb-6">
          <div className="w-14 h-14 bg-accent/10 rounded-2xl flex items-center justify-center">
            <Zap className="w-7 h-7 text-accent" />
          </div>
          <button onClick={onCancel} className="p-2 rounded-xl text-neutral hover:bg-neutral-light transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <h2 className="text-2xl font-black text-primary mb-2">¿Publicar Resultados Finales?</h2>
        <p className="text-sm text-neutral font-medium leading-relaxed mb-6">
          Esto guardará las estadísticas de todas las categorías, recalculará el ranking de todos los participantes y marcará esta fecha como <strong>finalizada</strong>. Esta acción no se puede deshacer fácilmente.
        </p>
        <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 flex items-start gap-3 mb-6">
          <AlertTriangle className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
          <p className="text-xs font-bold text-yellow-700">
            Asegurate de haber guardado las estadísticas de todas las categorías antes de publicar.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3 px-4 rounded-2xl border border-neutral/20 font-black text-neutral hover:bg-neutral-light transition-all"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 py-3 px-4 rounded-2xl bg-accent text-white font-black shadow-lg hover:scale-[1.02] transition-all disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />}
            {loading ? 'Publicando...' : '¡PUBLICAR!'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────
export default function ResultadosAdmin() {
  const [fechas, setFechas] = useState([]);
  const [selectedFecha, setSelectedFecha] = useState('');
  const [selectedFechaObj, setSelectedFechaObj] = useState(null);
  const [activeCategory, setActiveCategory] = useState('Primera');

  // stats[jugadorId] = { tries, conversiones, penales, drops, amarillas, rojas }
  const [stats, setStats] = useState({});
  // playersByCategory[cat] = [player, ...]
  const [playersByCategory, setPlayersByCategory] = useState({
    Primera: [], Intermedia: [], 'Pre-intermedia': [],
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [savedCategories, setSavedCategories] = useState(new Set());
  const [statusMsg, setStatusMsg] = useState({ type: '', text: '' });

  // ── Load fechas on mount ───────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      const data = await getAllFechas();
      setFechas(data);
      if (data.length > 0) {
        setSelectedFecha(data[0].id.toString());
        setSelectedFechaObj(data[0]);
      }
      setLoading(false);
    }
    load();
  }, []);

  // ── When fecha changes, reload players + existing stats ───────────────
  useEffect(() => {
    async function loadDataForFecha() {
      if (!selectedFecha) return;
      setLoading(true);
      setStatusMsg({ type: '', text: '' });
      setSavedCategories(new Set());

      try {
        const fechaId = parseInt(selectedFecha);
        const obj = fechas.find(f => f.id === fechaId);
        setSelectedFechaObj(obj || null);

        const [convocadosData, prevStats] = await Promise.all([
          getConvocados(fechaId),
          getEstadisticasPartido(fechaId),
        ]);

        console.log('DEBUG: Carga de datos para Fecha ID:', fechaId);
        console.log('DEBUG: Convocados crudos:', convocadosData);

        // Group players by category
        const grouped = { Primera: [], Intermedia: [], 'Pre-intermedia': [] };
        convocadosData.forEach(p => {
          // Normalización para evitar fallos por espacios o mayúsculas
          const cat = p.categoria ? p.categoria.trim() : 'Sin Categoría';
          if (grouped[cat]) {
            grouped[cat].push(p);
          } else if (cat.toLowerCase() === 'primera') {
            grouped.Primera.push(p);
          } else if (cat.toLowerCase() === 'intermedia') {
            grouped.Intermedia.push(p);
          } else if (cat.toLowerCase() === 'pre-intermedia' || cat.toLowerCase() === 'pre') {
            grouped['Pre-intermedia'].push(p);
          }
        });
        setPlayersByCategory(grouped);
        console.log('DEBUG: Convocados agrupados:', grouped);

        // Initialize stats map for ALL convocados
        const initStats = {};
        convocadosData.forEach(p => {
          const pre = prevStats.find(s => s.jugador_id === p.id);
          initStats[p.id] = {
            tries:        pre?.tries        ?? 0,
            conversiones: pre?.conversiones ?? 0,
            penales:      pre?.penales      ?? 0,
            drops:        pre?.drops        ?? 0,   // handle NULL from DB
            amarillas:    pre?.amarillas    ?? 0,
            rojas:        pre?.rojas        ?? 0,
          };
        });
        setStats(initStats);

      } catch (err) {
        console.error(err);
        setStatusMsg({ type: 'error', text: 'Error al cargar los datos.' });
      } finally {
        setLoading(false);
      }
    }
    if (fechas.length > 0) loadDataForFecha();
  }, [selectedFecha, fechas]);

  // ── Update a single stat ───────────────────────────────────────────────
  const updateStat = useCallback((jugadorId, field, delta) => {
    setStats(prev => ({
      ...prev,
      [jugadorId]: {
        ...prev[jugadorId],
        [field]: Math.max(0, (prev[jugadorId]?.[field] || 0) + delta),
      },
    }));
  }, []);

  // ── Build stats array for a category ──────────────────────────────────
  const buildStatsArray = (cat) => {
    const fechaId = parseInt(selectedFecha);
    return playersByCategory[cat].map(p => ({
      fecha_id:     fechaId,
      jugador_id:   p.id,
      tries:        stats[p.id]?.tries        || 0,
      conversiones: stats[p.id]?.conversiones || 0,
      penales:      stats[p.id]?.penales      || 0,
      drops:        stats[p.id]?.drops        || 0,
      amarillas:    stats[p.id]?.amarillas    || 0,
      rojas:        stats[p.id]?.rojas        || 0,
    }));
  };

  // ── Save single category ───────────────────────────────────────────────
  const handleSaveCategory = async () => {
    if (!selectedFecha) return;
    setSaving(true);
    setStatusMsg({ type: '', text: '' });
    try {
      await upsertEstadisticasCategoria(buildStatsArray(activeCategory));
      setSavedCategories(prev => new Set([...prev, activeCategory]));
      setStatusMsg({ type: 'success', text: `✓ Estadísticas de ${activeCategory} guardadas correctamente.` });
    } catch (err) {
      console.error(err);
      setStatusMsg({ type: 'error', text: `Error al guardar ${activeCategory}: ${err.message}` });
    } finally {
      setSaving(false);
    }
  };

  // ── Publish final results ──────────────────────────────────────────────
  const handlePublish = async () => {
    if (!selectedFecha) return;
    setPublishing(true);
    setStatusMsg({ type: '', text: '' });
    try {
      const fechaId = parseInt(selectedFecha);
      // Merge all stats from the 3 categories
      const allStats = [
        ...buildStatsArray('Primera'),
        ...buildStatsArray('Intermedia'),
        ...buildStatsArray('Pre-intermedia'),
      ];
      await publicarResultadosFecha(fechaId, allStats);
      setShowConfirm(false);
      setSavedCategories(new Set(['Primera', 'Intermedia', 'Pre-intermedia']));
      setStatusMsg({
        type: 'success',
        text: '🏆 ¡Resultados publicados! El ranking de todos los participantes ha sido actualizado.',
      });
      // Refresh fechas to reflect the new state
      const updated = await getAllFechas();
      setFechas(updated);
    } catch (err) {
      console.error(err);
      setStatusMsg({ type: 'error', text: `Error al publicar: ${err.message}` });
      setShowConfirm(false);
    } finally {
      setPublishing(false);
    }
  };

  const isFinalizada = selectedFechaObj?.estado === 'finalizada';
  const activePlayers = playersByCategory[activeCategory] || [];
  const totalPlayersAll = CATEGORIES.reduce((s, c) => s + (playersByCategory[c]?.length || 0), 0);

  return (
    <>
      {showConfirm && (
        <ConfirmPublishModal
          onConfirm={handlePublish}
          onCancel={() => setShowConfirm(false)}
          loading={publishing}
        />
      )}

      <div className="space-y-6 animate-fade-in">

        {/* ── Header ───────────────────────────────────────────────────── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral/10 pb-6">
          <div>
            <h2 className="text-2xl font-black text-primary flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-accent" /> CARGA DE ESTADÍSTICAS (ACTUALIZADO)
            </h2>
            <p className="text-xs font-black text-neutral uppercase tracking-widest mt-1">
              {isFinalizada
                ? '✓ Fecha Finalizada — Resultados Publicados'
                : 'Cargá las stats por categoría y publicá los resultados finales'}
            </p>
          </div>

          {/* Fecha selector */}
          <div className="relative min-w-[260px]">
            <select
              value={selectedFecha}
              onChange={e => setSelectedFecha(e.target.value)}
              className="w-full bg-neutral-light border border-neutral/20 rounded-xl px-4 py-3 text-sm font-bold text-primary appearance-none focus:ring-2 focus:ring-primary/20 outline-none"
            >
              {fechas.map(f => (
                <option key={f.id} value={f.id}>
                  Fecha {f.numero_fecha} — vs {f.rival}
                  {f.estado === 'finalizada' ? ' ✓' : f.estado === 'abierta' ? ' 🔴 ABIERTA' : ''}
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 absolute right-4 top-1/2 -translate-y-1/2 text-neutral pointer-events-none" />
          </div>
        </div>

        {/* ── Status Message ────────────────────────────────────────────── */}
        {statusMsg.text && (
          <div className={`p-4 rounded-2xl flex items-center gap-3 border shadow-sm animate-fade-in ${
            statusMsg.type === 'error'
              ? 'bg-red-50 border-red-200 text-red-600'
              : 'bg-green-50 border-green-200 text-green-700'
          }`}>
            {statusMsg.type === 'error'
              ? <AlertCircle className="w-5 h-5 shrink-0" />
              : <CheckCircle className="w-5 h-5 shrink-0" />
            }
            <p className="text-sm font-bold">{statusMsg.text}</p>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center p-20">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
          </div>
        ) : totalPlayersAll === 0 ? (
          <div className="bg-neutral-light/50 rounded-3xl p-12 text-center border-2 border-dashed border-neutral/20">
            <FileBarChart className="w-12 h-12 text-neutral/30 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-neutral">No hay jugadores convocados</h3>
            <p className="text-sm text-neutral/60 mt-1">
              Cargá el plantel en la pestaña "Armado" antes de registrar estadísticas.
            </p>
          </div>
        ) : (
          <>
            {/* ── Category Tabs ──────────────────────────────────────── */}
            <div className="flex gap-2 p-1 bg-neutral-light rounded-2xl border border-neutral/20 max-w-fit">
              {CATEGORIES.map(cat => {
                const count = playersByCategory[cat]?.length || 0;
                const saved = savedCategories.has(cat);
                return (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black tracking-wide transition-all ${
                      activeCategory === cat
                        ? 'bg-primary text-white shadow-md'
                        : 'text-neutral hover:bg-white/70 hover:text-primary hover-shadow'
                    }`}
                  >
                    {cat}
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                      saved
                        ? 'bg-green-500 text-white'
                        : count > 0
                        ? 'bg-accent text-white'
                        : 'bg-neutral/20 text-neutral'
                    }`}>
                      {saved ? '✓' : count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* ── Players Table ──────────────────────────────────────── */}
            {activePlayers.length === 0 ? (
              <div className="bg-neutral-light/30 rounded-2xl p-8 text-center border border-dashed border-neutral/20">
                <p className="text-sm font-black text-neutral uppercase tracking-widest">
                  No hay convocados en {activeCategory} para esta fecha
                </p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl overflow-hidden border border-neutral/20 shadow-sm">
                {/* Table head */}
                <div className="grid bg-primary/5 border-b border-neutral/20 px-4 py-3"
                  style={{ gridTemplateColumns: '1fr repeat(6, auto) 80px' }}>
                  <div className="text-[10px] font-black text-neutral uppercase tracking-widest">
                    Jugador
                  </div>
                  {STAT_FIELDS.map(f => (
                    <div key={f.key} className={`text-[10px] font-black uppercase tracking-widest text-center px-2 ${f.color}`}>
                      {f.label}
                      <br />
                      <span className="text-[8px] opacity-60">{f.pts > 0 ? `+${f.pts}` : f.pts} pts</span>
                    </div>
                  ))}
                  <div className="text-[10px] font-black text-neutral uppercase tracking-widest text-right">
                    Total
                  </div>
                </div>

                {/* Table rows */}
                <div className="divide-y divide-neutral/10">
                  {activePlayers.map((player, idx) => {
                    const pStats = stats[player.id] || {};
                    const pts = calcularPuntosJugador(pStats);
                    const initials = player.nombre?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?';

                    return (
                      <div
                        key={player.id}
                        className={`grid items-center px-4 py-3 hover:bg-neutral-light/20 transition-colors ${
                          idx % 2 === 0 ? 'bg-white' : 'bg-neutral-light/10'
                        }`}
                        style={{ gridTemplateColumns: '1fr repeat(6, auto) 80px' }}
                      >
                        {/* Player info */}
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                            <span className="text-[11px] font-black text-primary">{initials}</span>
                          </div>
                          <div className="min-w-0">
                            <p className="font-black text-sm text-primary truncate leading-tight">{player.nombre}</p>
                            <p className="text-[9px] font-bold text-neutral uppercase tracking-widest truncate">
                              {player.posicion || 'Jugador'}
                            </p>
                          </div>
                        </div>

                        {/* Stat boxes */}
                        {STAT_FIELDS.map(f => (
                          <div key={f.key} className="flex justify-center px-1">
                            <StatBox
                              field={f}
                              value={pStats[f.key] || 0}
                              onInc={() => updateStat(player.id, f.key, 1)}
                              onDec={() => updateStat(player.id, f.key, -1)}
                            />
                          </div>
                        ))}

                        {/* Total points */}
                        <div className="text-right">
                          <span className={`text-xl font-black ${pts > 0 ? 'text-primary' : pts < 0 ? 'text-red-500' : 'text-neutral/40'}`}>
                            {pts}
                          </span>
                          <p className="text-[9px] text-neutral font-bold">pts</p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Category total footer */}
                <div className="bg-primary/5 border-t-2 border-primary/10 px-4 py-3 flex items-center justify-between">
                  <span className="text-xs font-black text-neutral uppercase tracking-widest">
                    Total puntos generados — {activeCategory}
                  </span>
                  <span className="text-2xl font-black text-primary">
                    {activePlayers.reduce((sum, p) => sum + calcularPuntosJugador(stats[p.id] || {}), 0)}
                  </span>
                </div>
              </div>
            )}

            {/* ── Action Buttons ──────────────────────────────────────── */}
            <div className="flex flex-col sm:flex-row gap-4 pt-2">
              {/* Guardar Categoría */}
              <button
                onClick={handleSaveCategory}
                disabled={saving || activePlayers.length === 0 || isFinalizada}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-white border-2 border-primary text-primary font-black rounded-2xl hover:bg-primary/5 hover-shadow transition-all shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {saving
                  ? <Loader2 className="w-5 h-5 animate-spin" />
                  : <Save className="w-5 h-5" />
                }
                Guardar {activeCategory}
              </button>

              {/* Publicar Resultados Finales */}
              <button
                onClick={() => setShowConfirm(true)}
                disabled={totalPlayersAll === 0 || isFinalizada}
                className="flex-1 flex items-center justify-center gap-2 px-8 py-3 bg-accent text-white font-black rounded-2xl shadow-xl hover:scale-[1.02] hover-shadow transition-all disabled:opacity-40 disabled:hover:scale-100 disabled:cursor-not-allowed"
              >
                <Zap className="w-5 h-5" />
                {isFinalizada ? '✓ RESULTADOS YA PUBLICADOS' : 'PUBLICAR RESULTADOS FINALES'}
              </button>
            </div>

            {/* Hint sobre proceso */}
            {!isFinalizada && (
              <p className="text-[11px] text-neutral font-bold text-center opacity-60">
                Guardá cada categoría por separado para no perder datos, luego presioná "PUBLICAR RESULTADOS FINALES" para actualizar el ranking.
              </p>
            )}
          </>
        )}
      </div>
    </>
  );
}
