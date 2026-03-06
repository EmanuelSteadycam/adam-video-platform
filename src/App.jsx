import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Search, Upload, User, PlayCircle, Clock, Calendar, Eye, School, X, LogOut, Video, ChevronLeft, ChevronRight, Shuffle, Menu, Smartphone, Monitor, Plus, Check, List, Play, SkipBack, SkipForward, Home, LayoutGrid, TrendingUp, Zap, Sparkles, ArrowUpDown, SlidersHorizontal, ChevronDown } from 'lucide-react';
import Lottie from 'lottie-react';
import { videos as videosData } from './videosData';

// Aggiungi gli stili per la scrollbar custom
const styles = document.createElement('style');
styles.textContent = `
  .modal-scrollbar::-webkit-scrollbar {
    width: 8px;
  }
  .modal-scrollbar::-webkit-scrollbar-track {
    background: #18181b;
    border-radius: 4px;
  }
  .modal-scrollbar::-webkit-scrollbar-thumb {
    background: var(--scrollbar-color, #7c3aed);
    border-radius: 4px;
  }
  .modal-scrollbar::-webkit-scrollbar-thumb:hover {
    opacity: 0.8;
  }
  @keyframes drawArrow {
    from { stroke-dashoffset: 40; }
    to   { stroke-dashoffset: 0; }
  }
  .shuffle-anim svg * {
    stroke-dasharray: 40;
    stroke-dashoffset: 40;
    stroke: var(--arrow-color) !important;
  }
  .shuffle-anim svg :nth-child(1),
  .shuffle-anim svg :nth-child(2) {
    animation: drawArrow 0.6s linear forwards;
  }
  .shuffle-anim svg :nth-child(3),
  .shuffle-anim svg :nth-child(4),
  .shuffle-anim svg :nth-child(5) {
    animation: drawArrow 0.6s linear 0.6s forwards;
  }
  .dur-range {
    -webkit-appearance: none;
    appearance: none;
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    background: transparent;
    cursor: pointer;
  }
  .dur-range:focus { outline: none; }
  .dur-range::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 0; height: 0;
  }
  .dur-range::-webkit-slider-runnable-track { background: transparent; }
`;
document.head.appendChild(styles);

const getYouTubeID = (url) => {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
};

const VideoThumbnail = ({ youtubeUrl, title, className = "" }) => {
  const [thumbnailIndex, setThumbnailIndex] = useState(0);
  const [isError, setIsError] = useState(false);
  
  const videoId = getYouTubeID(youtubeUrl);
  
  const thumbnailOptions = [
    `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
    `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
    `https://img.youtube.com/vi/${videoId}/default.jpg`
  ];

  const handleError = () => {
    if (thumbnailIndex < thumbnailOptions.length - 1) {
      setThumbnailIndex(prev => prev + 1);
    } else {
      setIsError(true);
    }
  };

  if (isError) {
    return (
      <div className="w-full h-full bg-gradient-to-br from-purple-900 to-blue-900 flex items-center justify-center relative">
        <div className="absolute inset-0 bg-black/40" />
        <PlayCircle className="text-white/50 relative z-10" size={80} strokeWidth={1.5} />
      </div>
    );
  }

  return (
    <img 
      src={thumbnailOptions[thumbnailIndex]}
      alt={title} 
      className={className}
      onError={handleError}
    />
  );
};

const addRandomViews = (videos) => {
  return videos.map(video => ({
    ...video,
    views: video.views || Math.floor(Math.random() * 500) + 50
  }));
};

const mockVideos = addRandomViews(videosData);

const parseDuration = (dur) => {
  if (!dur) return 0;
  const parts = dur.split(':');
  return parseInt(parts[0]) * 60 + (parseInt(parts[1]) || 0);
};
const formatDuration = (secs) => {
  if (secs < 60) return `${secs}s`;
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  if (m >= 10 || s === 0) return `${m}m`;
  return `${m}m ${s}s`;
};
const _allDur = mockVideos.map(v => parseDuration(v.duration)).filter(d => d > 0);
const DUR_MAX = Math.max(..._allDur);

// ID del video placeholder "non disponibile" (usato per ~19 video censurati)
const PLACEHOLDER_VIDEO_ID = 'IbHF-SOVYJU';

// Snap points dello slider: 15s step fino a 1m, 30s step fino a 10m, 1m step oltre
const SNAP_POINTS = (() => {
  const pts = [15, 30, 45, 60];
  for (let s = 90; s <= Math.min(600, DUR_MAX); s += 30) pts.push(s);
  for (let s = 660; s <= DUR_MAX; s += 60) pts.push(s);
  if (pts[pts.length - 1] < DUR_MAX) pts.push(DUR_MAX);
  return pts;
})();

const HeroSection = ({ onVideoClick }) => {
  const [heroVideo, setHeroVideo] = useState(null);
  const [logoAnim, setLogoAnim] = useState(null);
  const lottieRef = useRef(null);
  
  useEffect(() => {
    setHeroVideo(mockVideos[Math.floor(Math.random() * mockVideos.length)]);
    fetch('/logo-animation.json')
      .then(response => response.json())
      .then(data => setLogoAnim(data))
      .catch(err => console.error('Errore caricamento logo:', err));
  }, []);

  if (!heroVideo) return null;

  const videoId = getYouTubeID(heroVideo.youtubeUrl);

  return (
    <div className="relative h-[30vh] md:h-[50vh] w-full overflow-hidden mb-4 md:mb-8">
      <div className="absolute inset-0 overflow-hidden">
        <iframe
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[177.77vh] h-[56.25vw] min-h-full min-w-full"
          src={`https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&controls=0&loop=1&playlist=${videoId}&modestbranding=1&rel=0`}
          title={heroVideo.title}
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
      {/* Gradiente bottom */}
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black to-transparent" />
      {/* Gradiente left — nero pieno sul logo, si dissolve dopo */}
      <div className="absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-black from-50% to-transparent" />
      <div className="absolute inset-0">
  {logoAnim && (
    <div className="absolute left-4 md:left-8 top-[20%] -translate-y-1/2 w-48 md:w-80">
  <Lottie
    animationData={logoAnim}
    loop={true}
    autoplay={true}
    lottieRef={lottieRef}
    onComplete={() => {
      if (lottieRef.current) {
        lottieRef.current.setDirection(lottieRef.current.playDirection * -1);
      }
    }}
  />
  <div className="mt-2 pl-1 flex flex-col gap-0.5">
    {['ARCHIVIO', 'DIGITALE', 'ADDICTION E', 'MEDIA'].map((word) => (
      <span key={word} className="text-white/50 text-[11px] md:text-[13px] tracking-[0.25em] uppercase leading-tight font-light">
        <span style={{ color: '#FFDA2A' }}>{word[0]}</span>{word.slice(1)}
      </span>
    ))}
  </div>
</div>
  )}
      </div>
    </div>
  );
};

const InspireSection = ({ onVideoClick, onAddToPlaylist, isInPlaylist }) => {
  const [inspireVideo, setInspireVideo] = useState(null);
  
  const getRandomVideo = () => {
    setInspireVideo(mockVideos[Math.floor(Math.random() * mockVideos.length)]);
  };

  useEffect(() => {
    getRandomVideo();
  }, []);

  if (!inspireVideo) return null;

  const videoId = getYouTubeID(inspireVideo.youtubeUrl);

const getTemaColor = (tema) => {
    const colors = {
      'Alcool': '#D97706',
      'Azzardo': '#BE123C',
      'Digitale': '#1e3a8a',
      'Sostanze': '#065f46'
    };
    return colors[tema] || '#6b7280';
  };

 const getBorderColor = (tema) => {
    const colors = {
      'Alcool': 'border-amber-700',
      'Azzardo': 'border-rose-900',
      'Digitale': 'border-blue-900',
      'Sostanze': 'border-emerald-800'
    };
    return colors[tema] || 'border-gray-500';
  };

return (
    <div className="w-full mb-8">
      <div className="bg-black rounded-xl">
        <div className="grid grid-cols-1 lg:grid-cols-2">
          <div className={`aspect-video overflow-hidden border-2 rounded-xl ${getBorderColor(inspireVideo.tema)}`}>
  <iframe
    className="w-full h-full rounded-xl"
              src={`https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&rel=0&modestbranding=1`}
              title={inspireVideo.title}
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
          <div className="flex flex-col items-center justify-center p-8">
            <h2 className="text-2xl md:text-3xl font-bold text-white">Lasciati Ispirare</h2>
            <button
              onClick={getRandomVideo}
              className="bg-zinc-800 p-4 rounded-full font-semibold hover:bg-zinc-700 transition-all mt-12 mb-5"
            >
              <div className="relative" style={{ width: 32, height: 32 }}>
                {/* Frecce grigie sempre visibili */}
                <Shuffle size={32} className="text-zinc-500" />
                {/* Frecce colorate animate sopra */}
                <div
                  key={inspireVideo.id}
                  className="shuffle-anim absolute inset-0"
                  style={{ '--arrow-color': getTemaColor(inspireVideo.tema) }}
                >
                  <Shuffle size={32} />
                </div>
              </div>
            </button>
            <div className="mt-[30px] flex flex-col items-center gap-4">
              <span
                className="text-white text-xs px-3 py-1 rounded-full font-semibold"
                style={{ backgroundColor: getTemaColor(inspireVideo.tema) }}
              >
                {inspireVideo.tema}
              </span>
              <button
                onClick={() => onAddToPlaylist(inspireVideo)}
                className="p-2 rounded-full transition-all"
                style={{
                  backgroundColor: isInPlaylist(inspireVideo.id) ? '#FFDA2A' : '#27272a',
                  color: isInPlaylist(inspireVideo.id) ? '#000' : '#d4d4d8',
                }}
                title={isInPlaylist(inspireVideo.id) ? 'In playlist' : 'Aggiungi a playlist'}
              >
                {isInPlaylist(inspireVideo.id) ? <Check size={20} /> : <Plus size={20} />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const TEMA_COLORS = {
  'Alcool':   { solid: '#D97706', border: '#D97706', dim: 'rgba(217,119,6,0.15)' },
  'Azzardo':  { solid: '#BE123C', border: '#BE123C', dim: 'rgba(190,18,60,0.15)' },
  'Digitale': { solid: '#1e3a8a', border: '#3b82f6', dim: 'rgba(59,130,246,0.15)' },
  'Sostanze': { solid: '#065f46', border: '#10b981', dim: 'rgba(16,185,129,0.15)' },
};

const DualRangeSlider = ({ min, max, valueMin, valueMax, onChange, accentColor = '#FFDA2A' }) => {
  const trackRef = useRef(null);
  const draggingRef = useRef(null);
  const valuesRef = useRef({ valueMin, valueMax, onChange, min, max });
  useEffect(() => { valuesRef.current = { valueMin, valueMax, onChange, min, max }; });

  const getVal = (clientX) => {
    const rect = trackRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const { min, max } = valuesRef.current;
    return Math.round(min + ratio * (max - min));
  };

  const apply = (val) => {
    const { valueMin, valueMax, onChange } = valuesRef.current;
    if (draggingRef.current === 'min') onChange(Math.min(val, valueMax - 1), valueMax);
    else onChange(valueMin, Math.max(val, valueMin + 1));
  };

  const onPointerDown = (e) => {
    const val = getVal(e.clientX);
    const { valueMin, valueMax } = valuesRef.current;
    draggingRef.current = Math.abs(val - valueMin) <= Math.abs(val - valueMax) ? 'min' : 'max';
    apply(val);
    e.preventDefault();
  };

  useEffect(() => {
    const onMove = (e) => { if (draggingRef.current) apply(getVal(e.clientX)); };
    const onUp = () => { draggingRef.current = null; };
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
    return () => { document.removeEventListener('pointermove', onMove); document.removeEventListener('pointerup', onUp); };
  }, []);

  const pct = (v) => ((v - min) / (max - min)) * 100;
  const minPct = pct(valueMin);
  const maxPct = pct(valueMax);

  return (
    <div
      ref={trackRef}
      className="relative select-none"
      style={{ height: 28, cursor: 'pointer', touchAction: 'none' }}
      onPointerDown={onPointerDown}
    >
      <div className="absolute top-1/2 -translate-y-1/2 w-full h-1 bg-zinc-700 rounded-full" />
      <div
        className="absolute top-1/2 -translate-y-1/2 h-1 rounded-full"
        style={{ left: `${minPct}%`, right: `${100 - maxPct}%`, backgroundColor: accentColor }}
      />
      <div className="absolute top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-zinc-900 rounded-full pointer-events-none" style={{ left: `calc(${minPct}% - 8px)`, backgroundColor: accentColor }} />
      <div className="absolute top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-zinc-900 rounded-full pointer-events-none" style={{ left: `calc(${maxPct}% - 8px)`, backgroundColor: accentColor }} />
    </div>
  );
};

const CustomSelect = ({ value, onChange, options, accentColor = '#FFDA2A' }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selected = options.find(o => o.value === value);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between bg-zinc-800 border border-zinc-700 text-white rounded-lg px-4 py-2.5 hover:bg-zinc-700 transition-colors"
      >
        <span className="text-sm truncate">{selected?.label ?? value}</span>
        <ChevronDown
          size={16}
          className="text-zinc-400 flex-shrink-0 ml-2 transition-transform duration-200"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
        />
      </button>
      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-zinc-800 border border-zinc-700 rounded-lg overflow-hidden shadow-xl max-h-60 overflow-y-auto modal-scrollbar" style={{'--scrollbar-color': '#52525b'}}>
          {options.map(o => (
            <button
              key={o.value}
              onClick={() => { onChange(o.value); setOpen(false); }}
              className="w-full text-left px-4 py-2.5 text-sm hover:bg-zinc-700 transition-colors flex items-center justify-between"
              style={{ color: o.value === value ? accentColor : '#ffffff' }}
            >
              {o.label}
              {o.value === value && <Check size={14} className="flex-shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const FiltersSection = ({ onFilterChange, currentFilters, searchQuery, onSearchChange }) => {
  const nature = ['Tutte', 'Cortometraggio', 'Film', 'Info', 'Sequenza', 'Spot commerciale', 'Spot sociale', 'Videoclip', 'Web e social'];
  const years = ['Tutti', ...new Set(mockVideos.map(v => v.year).sort((a, b) => b - a))];
  const [hoveredTema, setHoveredTema] = useState(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const activeTema = currentFilters.tema;
  const activeBorderColor = TEMA_COLORS[activeTema]?.border || '#3f3f46';
  const accentColor = TEMA_COLORS[activeTema]?.border ?? '#FFDA2A';

  // Conta filtri avanzati attivi
  const durActive = currentFilters.durationMin !== SNAP_POINTS[0] || currentFilters.durationMax !== SNAP_POINTS[SNAP_POINTS.length - 1];
  const advancedCount = [
    currentFilters.natura !== 'Tutte',
    currentFilters.year !== 'Tutti',
    currentFilters.scuola !== 'Tutti',
    durActive,
  ].filter(Boolean).length;

  const hasAnyFilter = activeTema !== 'Tutti' || advancedCount > 0 || searchQuery;

  const resetAll = () => {
    onFilterChange({ tema: 'Tutti', natura: 'Tutte', year: 'Tutti', scuola: 'Tutti', durationMin: SNAP_POINTS[0], durationMax: SNAP_POINTS[SNAP_POINTS.length - 1] });
    onSearchChange('');
  };

  // Chips filtri avanzati attivi (visibili anche col pannello chiuso)
  const activeChips = [];
  if (currentFilters.natura !== 'Tutte') activeChips.push({ label: currentFilters.natura, clear: () => onFilterChange({ ...currentFilters, natura: 'Tutte' }) });
  if (currentFilters.year !== 'Tutti') activeChips.push({ label: `Anno: ${currentFilters.year}`, clear: () => onFilterChange({ ...currentFilters, year: 'Tutti' }) });
  if (currentFilters.scuola !== 'Tutti') activeChips.push({ label: currentFilters.scuola === 'Scuole' ? 'Solo Scuole' : 'Escl. Scuole', clear: () => onFilterChange({ ...currentFilters, scuola: 'Tutti' }) });
  if (durActive) activeChips.push({ label: `${formatDuration(currentFilters.durationMin)} – ${formatDuration(currentFilters.durationMax)}`, clear: () => onFilterChange({ ...currentFilters, durationMin: SNAP_POINTS[0], durationMax: SNAP_POINTS[SNAP_POINTS.length - 1] }) });

  return (
    <div
      className="bg-zinc-900 rounded-xl p-6 mb-8 transition-all duration-300 sticky z-30"
      style={{ top: 64, borderTop: `3px solid ${activeTema !== 'Tutti' ? activeBorderColor : 'transparent'}` }}
    >
      {/* Campo di ricerca libera */}
      <div className="relative mb-5">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Cerca video"
          className="w-full bg-zinc-800 border border-zinc-700 rounded-lg pl-11 pr-10 py-2.5 text-sm text-white placeholder-zinc-500 outline-none focus:border-zinc-500 transition-colors"
        />
        {searchQuery && (
          <button onClick={() => onSearchChange('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors">
            <X size={16} />
          </button>
        )}
      </div>

      {/* Tema + toggle filtri avanzati sulla stessa riga */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => onFilterChange({ ...currentFilters, tema: 'Tutti' })}
            onMouseEnter={() => setHoveredTema('Tutti')}
            onMouseLeave={() => setHoveredTema(null)}
            className="px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 text-white"
            style={{
              backgroundColor: activeTema === 'Tutti' ? '#52525b' : hoveredTema === 'Tutti' ? '#3f3f46' : 'transparent',
              border: '2px solid #52525b',
            }}
          >
            Tutti
          </button>
          {['Alcool', 'Azzardo', 'Digitale', 'Sostanze'].map(tema => {
            const c = TEMA_COLORS[tema];
            const noVideos = tema === 'Sostanze';
            return (
              <button
                key={tema}
                onClick={() => onFilterChange({ ...currentFilters, tema })}
                onMouseEnter={() => setHoveredTema(tema)}
                onMouseLeave={() => setHoveredTema(null)}
                className="px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 text-white"
                style={{
                  backgroundColor: activeTema === tema ? c.solid : hoveredTema === tema ? c.dim : 'transparent',
                  border: `2px solid ${c.border}`,
                }}
                title={noVideos ? 'Nessun video disponibile' : ''}
              >
                {tema}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          {/* Bottone Filtri avanzati */}
          <button
            onClick={() => setShowAdvanced(v => !v)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200"
            style={{
              backgroundColor: showAdvanced || advancedCount > 0 ? '#27272a' : 'transparent',
              border: '2px solid #3f3f46',
              color: '#a1a1aa',
            }}
          >
            <SlidersHorizontal size={16} style={{ color: showAdvanced ? accentColor : 'inherit' }} />
            <span>Filtri avanzati</span>
            {advancedCount > 0 && (
              <span className="text-black text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: accentColor }}>
                {advancedCount}
              </span>
            )}
            <ChevronDown size={14} className="transition-transform duration-200" style={{ transform: showAdvanced ? 'rotate(180deg)' : 'rotate(0deg)' }} />
          </button>

          {/* Azzera tutto */}
          {hasAnyFilter && (
            <button
              onClick={resetAll}
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-lg text-sm font-medium text-zinc-400 transition-colors"
              style={{ border: '2px solid #3f3f46' }}
            >
              <X size={14} style={{ color: accentColor }} />
              Azzera
            </button>
          )}
        </div>
      </div>

      {/* Chips filtri avanzati attivi */}
      {activeChips.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3">
          {activeChips.map((chip) => (
            <span
              key={chip.label}
              className="flex items-center gap-1.5 text-xs px-3 py-1 rounded-full bg-zinc-800 border border-zinc-700"
              style={{ color: accentColor }}
            >
              {chip.label}
              <button onClick={chip.clear} className="hover:text-white transition-colors">
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Filtri avanzati espandibili */}
      {showAdvanced && (
        <div className="mt-5 pt-5 border-t border-zinc-800 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              {
                label: 'Formato',
                value: currentFilters.natura,
                onChange: (v) => onFilterChange({ ...currentFilters, natura: v }),
                options: nature.map(n => ({ value: n, label: n })),
              },
              {
                label: 'Anno',
                value: currentFilters.year,
                onChange: (v) => onFilterChange({ ...currentFilters, year: v }),
                options: years.map(y => ({ value: y, label: y })),
              },
            ].map(({ label, value, onChange, options }) => (
              <div key={label}>
                <label className="block text-sm font-medium text-zinc-400 mb-2">{label}</label>
                <CustomSelect value={value} onChange={onChange} options={options} accentColor={accentColor} />
              </div>
            ))}

            {/* Prodotto dalle scuole — toggle visivo */}
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">Prodotto dalle scuole</label>
              <div className="flex gap-2">
                {[
                  { value: 'Tutti', label: 'Tutti' },
                  { value: 'Scuole', label: 'Sì', icon: <School size={14} /> },
                  { value: 'Altri', label: 'No', icon: <School size={14} className="opacity-40" /> },
                ].map(({ value, label, icon }) => {
                  const active = currentFilters.scuola === value;
                  return (
                    <button
                      key={value}
                      onClick={() => onFilterChange({ ...currentFilters, scuola: value })}
                      className="flex items-center gap-1.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200"
                      style={{
                        backgroundColor: active ? '#27272a' : 'transparent',
                        border: `2px solid ${active ? accentColor : '#3f3f46'}`,
                        color: active ? accentColor : '#a1a1aa',
                      }}
                    >
                      {icon}
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Slider durata */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-zinc-400">Durata</label>
              <span className="text-sm font-medium" style={{ color: accentColor }}>
                {formatDuration(currentFilters.durationMin)} – {formatDuration(currentFilters.durationMax)}
              </span>
            </div>
            <DualRangeSlider
              min={0}
              max={SNAP_POINTS.length - 1}
              valueMin={Math.max(0, SNAP_POINTS.indexOf(currentFilters.durationMin))}
              valueMax={SNAP_POINTS.indexOf(currentFilters.durationMax) === -1 ? SNAP_POINTS.length - 1 : SNAP_POINTS.indexOf(currentFilters.durationMax)}
              onChange={(mn, mx) => onFilterChange({ ...currentFilters, durationMin: SNAP_POINTS[mn], durationMax: SNAP_POINTS[mx] })}
              accentColor={accentColor}
            />
            <div className="flex justify-between mt-2 text-xs text-zinc-500">
              <span>{formatDuration(SNAP_POINTS[0])}</span>
              <span>{formatDuration(SNAP_POINTS[SNAP_POINTS.length - 1])}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const NatureCarousel = ({ onSelectNature, selectedNatura }) => {
  const [currentSlide, setCurrentSlide] = useState(0);

  const natureData = [
    { name: 'Cortometraggio', image: '/images/nature/cortometraggio.jpg', key: 'Cortometraggio' },
    { name: 'Film', image: '/images/nature/film.jpg', key: 'Film' },
    { name: 'Info', image: '/images/nature/info.jpg', key: 'Info' },
    { name: 'Sequenza', image: '/images/nature/sequenza.jpg', key: 'Sequenze' },
    { name: 'Spot ADV', image: '/images/nature/spot-adv.jpg', key: 'Spot commerciale' },
    { name: 'Spot Sociale', image: '/images/nature/spot-sociale.jpg', key: 'Spot sociale' },
    { name: 'Videoclip', image: '/images/nature/videoclip.jpg', key: 'Videoclip' },
    { name: 'Web e Social', image: '/images/nature/web-social.jpg', key: 'Web e social' }
  ];

  const videoCounts = useMemo(() => {
    const counts = {};
    natureData.forEach(nat => {
      counts[nat.key] = mockVideos.filter(v => v.natura === nat.key).length;
    });
    return counts;
  }, []);

  const nextSlide = () => setCurrentSlide(prev => (prev + 1) % 2);
  const prevSlide = () => setCurrentSlide(prev => (prev - 1 + 2) % 2);

  // Vista con formato selezionato: tutte le card piccole, attiva evidenziata
  if (selectedNatura && selectedNatura !== 'Tutte') {
    return (
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-5">
          <button
            onClick={() => onSelectNature('Tutte')}
            className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors"
          >
            <ChevronLeft size={20} />
            <span className="text-sm">Tutti i Formati</span>
          </button>
          <h2 className="text-2xl font-bold text-white">
            {natureData.find(n => n.key === selectedNatura)?.name}
          </h2>
        </div>
        <div className="flex gap-3 overflow-x-auto py-3 px-1">
          {natureData.map((nat) => {
            const isActive = nat.key === selectedNatura;
            return (
              <div
                key={nat.key}
                onClick={() => onSelectNature(nat.key)}
                className="flex-shrink-0 cursor-pointer rounded-xl overflow-hidden transition-all duration-300 hover:scale-110"
                style={{
                  width: '80px',
                  outline: isActive ? '2px solid #FFDA2A' : '2px solid transparent',
                  opacity: isActive ? 1 : 0.45,
                }}
              >
                <div className="relative aspect-[9/16]">
                  <img src={nat.image} alt={nat.name} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                  <div className="absolute bottom-2 left-1 right-1">
                    <p className="text-white font-semibold text-[10px] text-center leading-tight">{nat.name}</p>
                  </div>
                  {isActive && (
                    <div className="absolute top-1.5 left-1.5 bg-[#FFDA2A] text-black text-[9px] px-1.5 py-0.5 rounded-full font-bold">
                      {videoCounts[nat.key] || 0}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Vista carosello normale
  return (
    <div className="mb-12">
      <h2 className="text-2xl font-bold text-white mb-6">I Formati ADAM</h2>
      <div className="relative">
        <button onClick={prevSlide} disabled={currentSlide === 0} className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-zinc-800/80 hover:bg-zinc-700 text-white p-3 rounded-full transition-all">
          <ChevronLeft size={24} />
        </button>
        <div className="overflow-hidden">
          <div className="flex transition-transform duration-500 ease-out" style={{ transform: `translateX(-${currentSlide * 100}%)` }}>
            {[0, 1].map(slideIndex => (
              <div key={slideIndex} className="min-w-full grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-6 px-4 md:px-12">
                {natureData.slice(slideIndex * 4, slideIndex * 4 + 4).map((nat) => (
                  <div key={nat.key} onClick={() => onSelectNature(nat.key)} className="group cursor-pointer bg-zinc-900 rounded-xl overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-2xl">
                    <div className="relative aspect-[9/16]">
                      <img src={nat.image} alt={nat.name} className="w-full h-full object-cover" />
                      <div className="absolute top-3 left-3 bg-[#FFDA2A] text-black text-xs px-3 py-1 rounded-full font-bold">{videoCounts[nat.key] || 0} video</div>
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                      <div className="absolute bottom-4 left-4 right-4">
                        <h3 className="text-white font-semibold text-lg md:text-[32px] text-center">{nat.name}</h3>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
        <button onClick={nextSlide} disabled={currentSlide === 1} className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-zinc-800/80 hover:bg-zinc-700 text-white p-3 rounded-full transition-all">
          <ChevronRight size={24} />
        </button>
      </div>
    </div>
  );
};

const VideoCard = ({ video, onClick, onAddToPlaylist, isInPlaylist }) => {
  const getTemaColor = (tema) => {
    const colors = {
      'Alcool': '#b45309',
      'Azzardo': '#881337',
      'Digitale': '#1e3a8a',
      'Sostanze': '#065f46'
    };
    return colors[tema] || '#6b7280';
  };

  const getFormatIcon = (natura) => {
    // Ritorna orientamento: vertical per 9:16, horizontal per 16:9
    const verticalFormats = ['Cortometraggio', 'Sequenze', 'Videoclip', 'Web e social'];
    return verticalFormats.includes(natura) ? 'vertical' : 'horizontal';
  };

  return (
    <div onClick={onClick} className="group cursor-pointer bg-zinc-900 rounded-lg overflow-hidden transition-all duration-300 transform hover:scale-105">
      <div className="relative overflow-hidden aspect-video">
        <VideoThumbnail 
          youtubeUrl={video.youtubeUrl}
          title={video.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-60 transition-all duration-300 flex items-center justify-center">
          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <PlayCircle className="text-white" size={56} strokeWidth={1.5} />
          </div>
        </div>
        <div className="absolute bottom-3 right-3 bg-black bg-opacity-80 text-white text-xs px-2 py-1 rounded font-medium">{video.duration || 'N/D'}</div>
        {video.prodottoScuola && (
          <div className="absolute top-3 left-3 text-black text-xs px-2 py-1 rounded-full flex items-center gap-1 font-medium" style={{ backgroundColor: '#FFDA2A' }}>
            <School size={12} />
            <span>Scuola</span>
          </div>
        )}
      </div>
      
      {/* Linea colorata tematica */}
      <div className="h-1" style={{ backgroundColor: getTemaColor(video.tema) }}></div>
      
      {/* Pulsante Playlist */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onAddToPlaylist(video);
        }}
        className="absolute top-3 right-3 bg-black bg-opacity-80 hover:bg-opacity-100 text-white p-2 rounded-full transition-all z-10"
        title={isInPlaylist ? "In playlist" : "Aggiungi a playlist"}
      >
        {isInPlaylist ? (
          <Check size={16} style={{ color: '#FFDA2A' }} />
        ) : (
          <Plus size={16} />
        )}
      </button>
      
      <div className="p-4">
        <h3 className="font-medium text-white mb-2 line-clamp-2 text-sm group-hover:text-zinc-300 transition-colors">{video.title}</h3>
        <div className="flex items-center justify-between text-xs text-zinc-400 mb-2">
          <div className="flex items-center gap-3">
            <span>{video.year}</span>
            <span className="flex items-center gap-1"><Eye size={12} />{video.views}</span>
          </div>
         {/* Icona formato */}
          <div className="flex items-center gap-1 text-zinc-400" title={video.format}>
            {video.format === 'verticale' ? (
              <Smartphone size={12} />
            ) : (
              <Monitor size={12} />
            )}
          </div>
        </div>
        {/* Info Natura */}
        <div className="text-xs text-zinc-500">{video.natura}</div>
      </div>
    </div>
  );
};

const VideoModal = ({ video, onClose }) => {
  const videoId = getYouTubeID(video.youtubeUrl);
  const [key, setKey] = useState(0);

  const getTemaScrollbarColor = (tema) => {
    const colors = {
      'Alcool': '#D97706',
      'Azzardo': '#BE123C',
      'Digitale': '#1e3a8a',
      'Sostanze': '#065f46'
    };
    return colors[tema] || '#FFD700';
  };

  useEffect(() => {
    // Forza il ricaricamento dell'iframe quando il modal si apre
    setKey(prev => prev + 1);
  }, [video]);

  const scrollbarColor = getTemaScrollbarColor(video.tema);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div 
        className="bg-zinc-900 rounded-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto modal-scrollbar" 
        onClick={e => e.stopPropagation()}
        style={{
          scrollbarWidth: 'thin',
          scrollbarColor: `${scrollbarColor} #18181b`,
          '--scrollbar-color': scrollbarColor
        }}
      >
        <div className="relative">
          <div className="relative w-full" style={{ paddingTop: '56.25%' }}>
            <iframe 
              key={key}
              className="absolute top-0 left-0 w-full h-full" 
              src={`https://www.youtube.com/embed/${videoId}?autoplay=1&mute=0&rel=0&modestbranding=1`} 
              title={video.title} 
              frameBorder="0" 
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
              allowFullScreen 
            />
          </div>
          <button onClick={onClose} className="absolute top-16 md:top-20 right-6 bg-black bg-opacity-80 text-white p-2 rounded-full hover:bg-opacity-100 transition-all z-10"><X size={24} /></button>
        </div>
        <div className="p-8">
          <h2 className="text-3xl font-bold text-white mb-4">{video.title}</h2>
         <div className="flex flex-wrap gap-6 mb-6 text-sm text-zinc-400">
            <div className="flex items-center gap-2"><Clock size={16} /><span>{video.duration || 'N/D'}</span></div>
            <div className="flex items-center gap-2"><Calendar size={16} /><span>{video.year}</span></div>
            <div className="flex items-center gap-2"><Eye size={16} /><span>{video.views} visualizzazioni</span></div>
            <div className="flex items-center gap-2">
              {video.format === 'verticale' ? (
                <Smartphone size={16} />
              ) : (
                <Monitor size={16} />
              )}
              <span>{video.format}</span>
            </div>
            {video.prodottoScuola && <div className="flex items-center gap-2 text-purple-400"><School size={16} /><span>Prodotto da scuole</span></div>}
          </div>
          
          {/* Pulsante Aggiungi a Playlist */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              window.videoModalAddToPlaylist?.(video);
            }}
            className="mb-6 flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all"
            style={{ 
              backgroundColor: window.videoModalIsInPlaylist?.(video.id) ? '#FFDA2A' : '#27272a',
              color: window.videoModalIsInPlaylist?.(video.id) ? '#000' : '#d4d4d8'
            }}
          >
            {window.videoModalIsInPlaylist?.(video.id) ? (
              <>
                <Check size={16} />
                <span>In Playlist</span>
              </>
            ) : (
              <>
                <Plus size={16} />
                <span>Aggiungi a Playlist</span>
              </>
            )}
          </button>
          <div className="flex gap-3 mb-6">
            <span
              className="px-3 py-1.5 rounded-full text-sm font-semibold"
              style={{
                backgroundColor: TEMA_COLORS[video.tema]?.solid || '#FFDA2A',
                color: '#ffffff',
                border: 'none',
              }}
            >{video.tema}</span>
            <span className="bg-blue-600/20 text-blue-400 px-3 py-1.5 rounded-full text-sm font-medium border border-blue-600/30">{video.natura}</span>
          </div>
          <div className="mb-6">
            <p className="text-zinc-400 leading-relaxed">{video.description}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
const PlaylistSidebar = ({ playlist, onRemove, onPlay, onClose, isOpen, onReorder }) => {
  const [draggedIndex, setDraggedIndex] = useState(null);

  const handleDragStart = (index) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    
    // Riordina array
    const newPlaylist = [...playlist];
    const draggedItem = newPlaylist[draggedIndex];
    newPlaylist.splice(draggedIndex, 1);
    newPlaylist.splice(index, 0, draggedItem);
    
    onReorder(newPlaylist);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={onClose}
      />
      
      {/* Sidebar */}
      <div className="fixed right-0 top-0 h-full w-full md:w-96 bg-zinc-900 z-50 transform transition-transform duration-300 flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <List size={24} />
              La mia Playlist
            </h2>
            <p className="text-zinc-400 text-sm mt-1">{playlist.length} video</p>
          </div>
          <button 
            onClick={onClose}
            className="text-zinc-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Lista video */}
        <div className="flex-1 overflow-y-auto p-4">
          {playlist.length === 0 ? (
            <div className="text-center py-20">
              <List size={48} className="text-zinc-700 mx-auto mb-4" />
              <p className="text-zinc-400">Nessun video in playlist</p>
              <p className="text-zinc-500 text-sm mt-2">Aggiungi video per creare la tua playlist</p>
            </div>
          ) : (
            <div className="space-y-3">
              {playlist.map((video, index) => (
                <div 
                  key={video.id}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                  className={`bg-zinc-800 rounded-lg overflow-hidden flex gap-3 p-3 group hover:bg-zinc-750 transition-colors cursor-move ${
                    draggedIndex === index ? 'opacity-50' : ''
                  }`}
                >
                  {/* Thumbnail */}
                  <div className="relative w-24 h-16 flex-shrink-0 rounded overflow-hidden">
                    <VideoThumbnail 
                      youtubeUrl={video.youtubeUrl}
                      title={video.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center">
                      <span className="text-white text-xs font-bold">{index + 1}</span>
                    </div>
                  </div>
                  
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white text-sm font-medium line-clamp-2 mb-1">{video.title}</h3>
                    <p className="text-zinc-400 text-xs">{video.duration || 'N/D'} • {video.year}</p>
                  </div>
                  
                  {/* Rimuovi */}
                  <button
                    onClick={() => onRemove(video.id)}
                    className="text-zinc-500 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <X size={18} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer con pulsante Play */}
        {playlist.length > 0 && (
          <div className="p-4 border-t border-zinc-800">
            <button
              onClick={onPlay}
              className="w-full flex items-center justify-center gap-2 text-black py-3 rounded-lg font-semibold hover:bg-yellow-600 transition-all"
              style={{ backgroundColor: '#FFDA2A' }}
            >
              <Play size={20} />
              Riproduci Playlist
            </button>
          </div>
        )}
      </div>
    </>
  );
};

const PlaylistPlayer = ({ playlist, currentIndex, onClose, onNext, onPrevious }) => {
  const currentVideo = playlist[currentIndex];
  const playerRef = useRef(null);
  const onNextRef = useRef(onNext);
  const containerRef = useRef(null);

  useEffect(() => { onNextRef.current = onNext; }, [onNext]);

  // Inizializza YouTube Player
  useEffect(() => {
    if (!currentVideo || currentVideo.source === 'nas') return;

    const videoId = getYouTubeID(currentVideo.youtubeUrl);

    const initPlayer = () => {
      if (!window.YT || !window.YT.Player) return;

      // Distruggi il player precedente
      if (playerRef.current) {
        try { playerRef.current.destroy(); } catch (e) {}
        playerRef.current = null;
      }

      // Ricrea il div contenitore per evitare conflitti con l'API
      if (containerRef.current) {
        containerRef.current.innerHTML = '<div id="yt-playlist-player" style="width:100%;height:100%"></div>';
      }

      playerRef.current = new window.YT.Player('yt-playlist-player', {
        videoId,
        playerVars: { autoplay: 1, rel: 0, modestbranding: 1 },
        events: {
          onStateChange: (event) => {
            if (event.data === 0) onNextRef.current();
          }
        }
      });
    };

    if (window.YT && window.YT.Player) {
      initPlayer();
    } else {
      window.onYouTubeIframeAPIReady = initPlayer;
    }

    return () => {
      if (playerRef.current) {
        try { playerRef.current.destroy(); } catch (e) {}
        playerRef.current = null;
      }
    };
  }, [currentIndex]);

  if (!currentVideo) return null;

  const videoId = getYouTubeID(currentVideo.youtubeUrl);
  const getTemaColor = (tema) => {
    const colors = {
      'Alcool': '#D97706',
      'Azzardo': '#BE123C',
      'Digitale': '#1e3a8a',
      'Sostanze': '#065f46'
    };
    return colors[tema] || '#6b7280';
  };

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Header */}
      <div className="bg-zinc-900 px-6 py-3 flex items-center justify-between border-b border-zinc-800">
        <div className="flex items-center gap-6">
          <div>
            <h3 className="text-white font-semibold">Riproduzione Playlist</h3>
            <p className="text-zinc-400 text-sm">{currentIndex + 1} di {playlist.length}</p>
          </div>
        </div>
        
        {/* Controlli */}
        <div className="flex items-center gap-6">
          <button
            onClick={onPrevious}
            disabled={currentIndex === 0}
            className="text-white hover:text-zinc-300 disabled:text-zinc-600 disabled:cursor-not-allowed transition-colors"
          >
            <SkipBack size={32} />
          </button>
          <button
            onClick={onNext}
            disabled={currentIndex === playlist.length - 1}
            className="text-white hover:text-zinc-300 disabled:text-zinc-600 disabled:cursor-not-allowed transition-colors"
          >
            <SkipForward size={32} />
          </button>
          <button 
            onClick={onClose}
            className="text-zinc-400 hover:text-white transition-colors ml-4"
          >
            <X size={32} />
          </button>
        </div>
      </div>

      {/* Video Player */}
      <div className="flex-1 flex items-center justify-center bg-black">
        <div className="w-full h-full max-w-7xl">
          <div className="relative w-full h-full">
            {currentVideo.source === 'nas' ? (
              <video 
                key={key}
                className="w-full h-full"
                src={currentVideo.videoUrl}
                controls
                autoPlay
                onEnded={onNext}
              />
            ) : (
              <div
                ref={containerRef}
                className="w-full h-full"
              >
                <div id="yt-playlist-player" style={{ width: '100%', height: '100%' }} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Info Video Corrente */}
      <div className="bg-zinc-900 px-6 py-3 border-t border-zinc-800">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <div 
              className="w-1 h-10 rounded-full flex-shrink-0"
              style={{ backgroundColor: getTemaColor(currentVideo.tema) }}
            />
            <div className="flex-1">
              <h2 className="text-white font-semibold text-base mb-0.5">{currentVideo.title}</h2>
              <div className="flex items-center gap-4 text-sm text-zinc-400">
                <span>{currentVideo.tema}</span>
                <span>•</span>
                <span>{currentVideo.natura}</span>
                <span>•</span>
                <span>{currentVideo.year}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSection, setActiveSection] = useState('home');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [selectedTemaTag, setSelectedTemaTag] = useState(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [headerSearchVisible, setHeaderSearchVisible] = useState(true);
  const carouselRef = useRef(null);
  const [selectedNatura, setSelectedNatura] = useState('Tutte');
  const [schoolsSort, setSchoolsSort] = useState('date'); // 'date' | 'views'
  const [filters, setFilters] = useState({
    tema: 'Tutti',
    natura: 'Tutte',
    year: 'Tutti',
    scuola: 'Tutti',
    durationMin: SNAP_POINTS[0],
    durationMax: SNAP_POINTS[SNAP_POINTS.length - 1],
  });
  const [playlist, setPlaylist] = useState([]);
  const [showPlaylist, setShowPlaylist] = useState(false);
  const [playingPlaylist, setPlayingPlaylist] = useState(false);
  const [currentPlaylistIndex, setCurrentPlaylistIndex] = useState(0);

  // Carica playlist all'avvio
  useEffect(() => {
    const loadPlaylist = async () => {
      try {
        const data = await window.storage.get('user-playlist');
        if (data && data.value) {
          setPlaylist(JSON.parse(data.value));
        }
      } catch (err) {
        console.log('Nessuna playlist salvata');
      }
    };
    loadPlaylist();
  }, []);

  // Salva playlist quando cambia
  useEffect(() => {
    const savePlaylist = async () => {
      try {
        await window.storage.set('user-playlist', JSON.stringify(playlist));
      } catch (err) {
        console.error('Errore salvataggio playlist:', err);
      }
    };
    if (playlist.length > 0) {
      savePlaylist();
    }
  }, [playlist]);

  const addToPlaylist = (video) => {
    if (!playlist.find(v => v.id === video.id)) {
      setPlaylist([...playlist, video]);
    }
  };

  const removeFromPlaylist = (videoId) => {
    setPlaylist(playlist.filter(v => v.id !== videoId));
  };

  const isInPlaylist = (videoId) => {
    return playlist.some(v => v.id === videoId);
  };

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [activeSection]);

  useEffect(() => {
    if (activeSection !== 'home') { setHeaderSearchVisible(true); return; }
    const onScroll = () => {
      const el = carouselRef.current;
      const threshold = el ? el.offsetTop + el.offsetHeight / 2 : 400;
      setHeaderSearchVisible(window.scrollY < threshold);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [activeSection]);

  const filteredVideos = useMemo(() => {
    let filtered = mockVideos;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(video =>
        video.title.toLowerCase().includes(q) ||
        (video.description && video.description.toLowerCase().includes(q))
      );
    }
    if (activeSection === 'most-viewed') filtered = [...filtered].sort((a, b) => b.views - a.views).slice(0, 20);
    else if (activeSection === 'recent') filtered = [...filtered].sort((a, b) => new Date(b.dataInserimento) - new Date(a.dataInserimento)).slice(0, 12);
    else if (activeSection === 'schools') {
      filtered = filtered.filter(v => v.prodottoScuola);
      filtered = schoolsSort === 'views'
        ? [...filtered].sort((a, b) => b.views - a.views)
        : [...filtered].sort((a, b) => new Date(b.dataInserimento) - new Date(a.dataInserimento));
    }
    if (selectedNatura !== 'Tutte') filtered = filtered.filter(v => v.natura === selectedNatura);
    
    // Applica filtri avanzati
    if (filters.tema !== 'Tutti') filtered = filtered.filter(v => v.tema === filters.tema);
    if (filters.natura !== 'Tutte') filtered = filtered.filter(v => v.natura === filters.natura);
    if (filters.year !== 'Tutti') filtered = filtered.filter(v => v.year === parseInt(filters.year));
    if (filters.scuola === 'Scuole') filtered = filtered.filter(v => v.prodottoScuola);
    else if (filters.scuola === 'Altri') filtered = filtered.filter(v => !v.prodottoScuola);
    const durMinActive = filters.durationMin > SNAP_POINTS[0];
    const durMaxActive = filters.durationMax < SNAP_POINTS[SNAP_POINTS.length - 1];
    if (durMinActive || durMaxActive) {
      filtered = filtered.filter(v => {
        const d = parseDuration(v.duration);
        if (d === 0) return false; // durata 0:00 = video eliminato/privato
        if (getYouTubeID(v.youtubeUrl) === PLACEHOLDER_VIDEO_ID) return false; // video non disponibile
        if (durMinActive && d < filters.durationMin) return false;
        if (durMaxActive && d > filters.durationMax) return false;
        return true;
      });
      filtered = [...filtered].sort((a, b) => parseDuration(a.duration) - parseDuration(b.duration));
    }

    return filtered;
  }, [searchQuery, activeSection, selectedNatura, filters, schoolsSort]);

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-purple-900 to-zinc-900 flex items-center justify-center p-4">
        <div className="bg-zinc-900/80 backdrop-blur-xl rounded-2xl shadow-2xl p-10 max-w-md w-full border border-zinc-800">
          <div className="text-center mb-8">
            <div className="inline-block bg-zinc-800 text-zinc-300 p-5 rounded-2xl mb-6"><PlayCircle size={56} strokeWidth={1.5} /></div>
            <h1 className="text-4xl font-bold text-white mb-2">ADAM</h1>
            <p className="text-xl text-[#FFDA2A] font-medium mb-3">Archivio Digitale Addiction e Media</p>
            <p className="text-zinc-400 text-sm">Piattaforma per operatori sociali, studenti e insegnanti</p>
          </div>
          <div className="space-y-4">
            <input type="email" placeholder="Email" className="w-full px-4 py-4 bg-zinc-800 border border-zinc-700 text-white rounded-lg focus:ring-2 focus:ring-[#FFDA2A] focus:border-transparent placeholder-zinc-500" />
            <input type="password" placeholder="Password" className="w-full px-4 py-4 bg-zinc-800 border border-zinc-700 text-white rounded-lg focus:ring-2 focus:ring-[#FFDA2A] focus:border-transparent placeholder-zinc-500" />
            <button onClick={() => setIsLoggedIn(true)} className="w-full bg-zinc-800 text-zinc-300 py-4 rounded-lg font-semibold hover:bg-white hover:text-black transition-all">Accedi</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex">
      
{isMobileMenuOpen && (
  <div 
    className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
    onClick={() => setIsMobileMenuOpen(false)}
  />
)}
<aside className={`w-64 bg-zinc-900 border-r border-zinc-800 fixed left-0 top-0 h-full flex flex-col z-50 transition-transform duration-300 lg:translate-x-0 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
  <div className="p-6 border-b border-zinc-800">
    <div className="flex items-center gap-3">
      <div className="bg-zinc-800 text-zinc-300 p-2 rounded-xl"><PlayCircle size={28} strokeWidth={1.5} /></div>
      <div>
        <h1 className="text-2xl font-bold text-white">ADAM</h1>
        <p className="text-[10px] text-zinc-400 tracking-wide uppercase leading-tight">Archivio Digitale<br/>Addiction e Media</p>
      </div>
    </div>
  </div>
  <nav className="flex-1 p-4 overflow-y-auto">
    <ul className="space-y-1">
      {[
        { section: 'home',        label: 'Home',                icon: Home },
        { section: 'formats',     label: 'I Formati ADAM',      icon: LayoutGrid },
        { section: 'most-viewed', label: 'I Più Visti',         icon: TrendingUp },
        { section: 'recent',      label: 'Nuovi Inseriti',      icon: Clock },
        { section: 'schools',     label: 'Prodotti dalle Scuole', icon: School },
        { section: 'inspire',     label: 'Lasciati Ispirare',   icon: Sparkles },
        { section: 'wow',         label: 'WOW',                 icon: Zap },
      ].map(({ section, label, icon: Icon }) => (
        <li key={section}>
          <button
            onClick={() => { setActiveSection(section); setSelectedNatura('Tutte'); setFilters(f => ({ ...f, tema: 'Tutti' })); setSelectedTemaTag(null); setIsMobileMenuOpen(false); }}
            className={`w-full text-left px-4 py-3 rounded-lg transition-colors flex items-center gap-3 ${activeSection === section ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'}`}
          >
            <Icon size={18} className="flex-shrink-0" />
            <span>{label}</span>
          </button>
        </li>
      ))}
    </ul>
  </nav>
</aside>
      <div className="lg:ml-64 flex-1">
        <header className="bg-black sticky top-0 z-40">
  <div className="px-4 lg:px-8 py-4 flex items-center justify-between gap-2 lg:gap-6 relative">
    <button 
  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
  className="lg:hidden text-white p-2"
>
  <Menu size={24} />
</button>
          <div
            className="flex-1 max-w-2xl hidden md:block transition-all duration-500"
            style={{ opacity: headerSearchVisible ? 1 : 0, pointerEvents: headerSearchVisible ? 'auto' : 'none' }}
          >
  <div className="relative">
    {isSearchFocused && (
      <div className="absolute top-full left-0 mt-2 bg-zinc-900 rounded-lg shadow-xl py-2 min-w-[150px] z-50">
        <button 
          onClick={() => {
            setSelectedTemaTag('Alcool');
            setFilters({...filters, tema: 'Alcool'});
          }}
          className="w-full text-left px-4 py-2 text-white hover:bg-zinc-800 transition-colors text-sm flex items-center justify-between"
        >
          Alcool
          {selectedTemaTag === 'Alcool' && <span className="text-yellow-500">✓</span>}
        </button>
        <button 
          onClick={() => {
            setSelectedTemaTag('Azzardo');
            setFilters({...filters, tema: 'Azzardo'});
          }}
          className="w-full text-left px-4 py-2 text-white hover:bg-zinc-800 transition-colors text-sm flex items-center justify-between"
        >
          Azzardo
          {selectedTemaTag === 'Azzardo' && <span className="text-red-500">✓</span>}
        </button>
        <button 
          onClick={() => {
            setSelectedTemaTag('Digitale');
            setFilters({...filters, tema: 'Digitale'});
          }}
          className="w-full text-left px-4 py-2 text-white hover:bg-zinc-800 transition-colors text-sm flex items-center justify-between"
        >
          Digitale
          {selectedTemaTag === 'Digitale' && <span className="text-blue-500">✓</span>}
        </button>
        <button 
          onClick={() => {
            setSelectedTemaTag('Sostanze');
            setFilters({...filters, tema: 'Sostanze'});
          }}
          className="w-full text-left px-4 py-2 text-white hover:bg-zinc-800 transition-colors text-sm flex items-center justify-between"
        >
          Sostanze
          {selectedTemaTag === 'Sostanze' && <span className="text-green-500">✓</span>}
        </button>
      </div>
    )}
   <div className={`relative transition-all duration-300 ${selectedTemaTag && !searchQuery ? 'w-full md:w-[400px]' : 'w-full'}`}>
  {selectedTemaTag && (
    <button 
      onClick={(e) => {
        e.stopPropagation();
        setIsSearchFocused(!isSearchFocused);
      }}
      className="absolute left-4 top-1/2 transform -translate-y-1/2 flex items-center gap-2 bg-zinc-800 px-2 py-1 rounded text-xs font-medium z-10"
      style={{ 
        color: selectedTemaTag === 'Alcool' ? '#eab308' : 
               selectedTemaTag === 'Azzardo' ? '#ef4444' : 
               selectedTemaTag === 'Digitale' ? '#3b82f6' : '#22c55e'
      }}
    >
      {selectedTemaTag}
      <ChevronLeft size={12} className="rotate-[-90deg]" />
    </button>
  )}
  <Search className={`absolute ${selectedTemaTag ? 'left-[120px]' : 'left-4'} top-1/2 transform -translate-y-1/2 text-zinc-500 z-10`} size={18} />
  {(selectedTemaTag || searchQuery) && (
    <button
      onClick={(e) => {
        setSelectedTemaTag(null);
        setSearchQuery('');
        setFilters({...filters, tema: 'Tutti'});
      }}
      className="absolute right-4 top-1/2 transform -translate-y-1/2 text-zinc-500 hover:text-white transition-colors z-10"
    >
      <X size={18} />
    </button>
  )}
  <input 
    type="text" 
    placeholder={selectedTemaTag ? `Cerca video a tema ${selectedTemaTag}` : "Cerca video..."} 
    value={searchQuery} 
    onChange={(e) => setSearchQuery(e.target.value)} 
    onFocus={(e) => {
      e.target.parentElement.classList.remove('w-[400px]');
      e.target.parentElement.classList.add('w-full');
      if (!selectedTemaTag) setIsSearchFocused(true);
    }}
    onBlur={(e) => {
      if (!searchQuery && !selectedTemaTag) {
        e.target.parentElement.classList.remove('w-full');
        e.target.parentElement.classList.add('w-[400px]');
      }
      setTimeout(() => setIsSearchFocused(false), 200);
    }}
    className="w-full text-white rounded-lg placeholder-zinc-500 text-sm transition-all duration-300 outline-none"
    style={{ 
      backgroundColor: '#262626',
      paddingLeft: selectedTemaTag ? '155px' : '44px',
      paddingRight: '40px',
      paddingTop: '10px',
      paddingBottom: '10px'
    }}
  />
</div>
  </div>
</div>
           <div className="flex items-center gap-2 lg:gap-3">
  <button 
    onClick={() => setShowPlaylist(true)}
    className="relative flex items-center gap-2 bg-zinc-800 text-zinc-300 px-3 lg:px-4 py-2.5 rounded-lg hover:bg-zinc-700 hover:text-white transition-all font-medium text-sm"
  >
    <List size={18} />
    <span className="hidden sm:inline">Playlist</span>
    {playlist.length > 0 && (
      <span className="absolute -top-1 -right-1 text-black text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold" style={{ backgroundColor: '#FFDA2A' }}>
        {playlist.length}
      </span>
    )}
 </button>
  <button className="flex items-center gap-2 text-black px-3 lg:px-4 py-2.5 rounded-lg hover:bg-yellow-600 transition-all font-medium text-sm" style={{ backgroundColor: '#FFDA2A' }}>
    <Upload size={18} />
    <span className="hidden sm:inline">Segnala</span>
  </button>
  <div className="relative">
                <button onClick={() => setShowUserMenu(!showUserMenu)} className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-white hover:bg-zinc-700 hover:text-white transition-all"><User size={20} /></button>
                {showUserMenu && (
                  <div className="absolute right-0 mt-3 w-56 bg-zinc-900 border border-zinc-800 rounded-lg shadow-2xl py-2">
                    <button className="block w-full text-left px-4 py-3 text-zinc-300 hover:bg-zinc-800 transition-colors">Il mio profilo</button>
                    <button className="block w-full text-left px-4 py-3 text-zinc-300 hover:bg-zinc-800 transition-colors">Impostazioni</button>
                    <hr className="my-2 border-zinc-800" />
                    <button onClick={() => setIsLoggedIn(false)} className="w-full text-left px-4 py-3 text-red-400 hover:bg-zinc-800 transition-colors flex items-center gap-2"><LogOut size={16} />Esci</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>
        <main className="p-4 md:p-8 bg-black">
          {activeSection === 'home' && (
  <>
    <HeroSection onVideoClick={setSelectedVideo} />
    <div className="md:hidden mb-6">
      <div className="relative">
        {isSearchFocused && (
          <div className="absolute top-full left-0 mt-2 bg-zinc-900 rounded-lg shadow-xl py-2 min-w-[150px] z-50">
            <button 
              onClick={() => {
                setSelectedTemaTag('Alcool');
                setFilters({...filters, tema: 'Alcool'});
              }}
              className="w-full text-left px-4 py-2 text-white hover:bg-zinc-800 transition-colors text-sm flex items-center justify-between"
            >
              Alcool
              {selectedTemaTag === 'Alcool' && <span className="text-yellow-500">✓</span>}
            </button>
            <button 
              onClick={() => {
                setSelectedTemaTag('Azzardo');
                setFilters({...filters, tema: 'Azzardo'});
              }}
              className="w-full text-left px-4 py-2 text-white hover:bg-zinc-800 transition-colors text-sm flex items-center justify-between"
            >
              Azzardo
              {selectedTemaTag === 'Azzardo' && <span className="text-red-500">✓</span>}
            </button>
            <button 
              onClick={() => {
                setSelectedTemaTag('Digitale');
                setFilters({...filters, tema: 'Digitale'});
              }}
              className="w-full text-left px-4 py-2 text-white hover:bg-zinc-800 transition-colors text-sm flex items-center justify-between"
            >
              Digitale
              {selectedTemaTag === 'Digitale' && <span className="text-blue-500">✓</span>}
            </button>
            <button 
              onClick={() => {
                setSelectedTemaTag('Sostanze');
                setFilters({...filters, tema: 'Sostanze'});
              }}
              className="w-full text-left px-4 py-2 text-white hover:bg-zinc-800 transition-colors text-sm flex items-center justify-between"
            >
              Sostanze
              {selectedTemaTag === 'Sostanze' && <span className="text-green-500">✓</span>}
            </button>
          </div>
        )}
        <div className={`relative transition-all duration-300 w-full`}>
          {selectedTemaTag && (
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setIsSearchFocused(!isSearchFocused);
              }}
              className="absolute left-4 top-1/2 transform -translate-y-1/2 flex items-center gap-2 bg-zinc-800 px-2 py-1 rounded text-xs font-medium z-10"
              style={{ 
                color: selectedTemaTag === 'Alcool' ? '#eab308' : 
                       selectedTemaTag === 'Azzardo' ? '#ef4444' : 
                       selectedTemaTag === 'Digitale' ? '#3b82f6' : '#22c55e'
              }}
            >
              {selectedTemaTag}
              <ChevronLeft size={12} className="rotate-[-90deg]" />
            </button>
          )}
          <Search className={`absolute ${selectedTemaTag ? 'left-[120px]' : 'left-4'} top-1/2 transform -translate-y-1/2 text-zinc-500 z-10`} size={18} />
          {(selectedTemaTag || searchQuery) && (
            <button
              onClick={(e) => {
                setSelectedTemaTag(null);
                setSearchQuery('');
                setFilters({...filters, tema: 'Tutti'});
              }}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 text-zinc-500 hover:text-white transition-colors z-10"
            >
              <X size={18} />
            </button>
          )}
          <input 
            type="text" 
            placeholder={selectedTemaTag ? `Cerca video a tema ${selectedTemaTag}` : "Cerca video..."} 
            value={searchQuery} 
            onChange={(e) => setSearchQuery(e.target.value)} 
            onFocus={(e) => {
              e.target.parentElement.classList.remove('w-[400px]');
              e.target.parentElement.classList.add('w-full');
              if (!selectedTemaTag) setIsSearchFocused(true);
            }}
            onBlur={(e) => {
              if (!searchQuery && !selectedTemaTag) {
                e.target.parentElement.classList.remove('w-full');
                e.target.parentElement.classList.add('w-[400px]');
              }
              setTimeout(() => setIsSearchFocused(false), 200);
            }}
            className="w-full text-white rounded-lg placeholder-zinc-500 text-sm transition-all duration-300 outline-none"
            style={{ 
              backgroundColor: '#262626',
              paddingLeft: selectedTemaTag ? '155px' : '44px',
              paddingRight: '40px',
              paddingTop: '10px',
              paddingBottom: '10px'
            }}
          />
        </div>
      </div>
    </div>
    <div ref={carouselRef}><NatureCarousel onSelectNature={(natura) => { setSelectedNatura(natura); setActiveSection('all'); }} /></div>
    <FiltersSection onFilterChange={setFilters} currentFilters={filters} searchQuery={searchQuery} onSearchChange={setSearchQuery} />
  </>
)}
{activeSection === 'formats' && <NatureCarousel onSelectNature={(natura) => setSelectedNatura(natura)} selectedNatura={selectedNatura} />}
          {activeSection === 'inspire' && <InspireSection onVideoClick={setSelectedVideo} onAddToPlaylist={addToPlaylist} isInPlaylist={isInPlaylist} />}
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white">
                {activeSection === 'home' && 'Esplora i Video'}
                {activeSection === 'most-viewed' && 'I Più Visti'}
                {activeSection === 'recent' && 'Nuovi Inseriti'}
                {activeSection === 'schools' && 'Prodotti dalle Scuole'}
                {activeSection === 'inspire' && 'Esplora i Video'}
                {activeSection === 'formats' && selectedNatura !== 'Tutte' && `Formato dei video: ${selectedNatura}`}
                {activeSection === 'formats' && selectedNatura === 'Tutte' && 'Tutti i Video'}
                {activeSection === 'all' && selectedNatura !== 'Tutte' && selectedNatura}
                {activeSection === 'all' && selectedNatura === 'Tutte' && 'Tutti i Video'}
              </h2>
              {activeSection === 'schools' && (
                <div className="flex items-center gap-1 bg-zinc-900 p-1 rounded-lg">
                  <button
                    onClick={() => setSchoolsSort('date')}
                    className="p-2 rounded-md transition-all"
                    style={{ color: schoolsSort === 'date' ? '#FFDA2A' : '#71717a' }}
                    title="Ordina per data inserimento"
                  >
                    <Clock size={18} />
                  </button>
                  <button
                    onClick={() => setSchoolsSort('views')}
                    className="p-2 rounded-md transition-all"
                    style={{ color: schoolsSort === 'views' ? '#FFDA2A' : '#71717a' }}
                    title="Ordina per visualizzazioni"
                  >
                    <Eye size={18} />
                  </button>
                </div>
              )}
            </div>
            <p className="text-zinc-400 mt-2">{filteredVideos.length} video trovati</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredVideos.map(video => <VideoCard key={video.id} video={video} onClick={() => setSelectedVideo(video)} onAddToPlaylist={addToPlaylist} isInPlaylist={isInPlaylist(video.id)} />)}
          </div>
          {filteredVideos.length === 0 && (
            <div className="text-center py-20">
              <div className="inline-block bg-zinc-900 p-8 rounded-2xl mb-6"><Video size={64} className="text-zinc-700" strokeWidth={1.5} /></div>
              <h3 className="text-2xl font-bold text-white mb-3">Nessun video trovato</h3>
              <p className="text-zinc-400">Prova con una ricerca diversa</p>
            </div>
          )}
        </main>
      </div>
      {selectedVideo && (() => {
        window.videoModalAddToPlaylist = addToPlaylist;
        window.videoModalIsInPlaylist = isInPlaylist;
        return <VideoModal video={selectedVideo} onClose={() => setSelectedVideo(null)} />;
      })()}
      
      {/* Playlist Sidebar */}
      <PlaylistSidebar 
        playlist={playlist}
        onRemove={removeFromPlaylist}
        onReorder={setPlaylist}
        onPlay={() => {
          if (playlist.length > 0) {
            setPlayingPlaylist(true);
            setCurrentPlaylistIndex(0);
            setShowPlaylist(false);
          }
        }}
        onClose={() => setShowPlaylist(false)}
        isOpen={showPlaylist}
      />
      
      {/* Playlist Player */}
      {playingPlaylist && (
        <PlaylistPlayer 
          playlist={playlist}
          currentIndex={currentPlaylistIndex}
          onClose={() => {
            setPlayingPlaylist(false);
            setCurrentPlaylistIndex(0);
          }}
          onNext={() => {
            if (currentPlaylistIndex < playlist.length - 1) {
              setCurrentPlaylistIndex(prev => prev + 1);
            } else {
              // Fine playlist
              setPlayingPlaylist(false);
              setCurrentPlaylistIndex(0);
            }
          }}
          onPrevious={() => {
            if (currentPlaylistIndex > 0) {
              setCurrentPlaylistIndex(prev => prev - 1);
            }
          }}
        />
      )}
    </div>
  );
}

export default App;
