import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Search, Upload, User, PlayCircle, Clock, Calendar, Eye, School, X, LogOut, Video, ChevronLeft, ChevronRight, Shuffle, Menu, Smartphone, Monitor, Plus, Check, List, Play, SkipBack, SkipForward, Home, LayoutGrid, TrendingUp, Zap, Sparkles, ArrowUpDown, SlidersHorizontal, ChevronDown, Send, ShieldCheck, AlertCircle, Loader2, LogIn, Film, BookOpen, Pencil, Trash2, Save, RotateCcw, Archive } from 'lucide-react';
import Lottie from 'lottie-react';
import { supabase } from './supabase';
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
  @keyframes fadeSlideIn {
    from { opacity: 0; transform: translateY(8px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .tagline-word {
    opacity: 0;
    animation: fadeSlideIn 0.5s ease forwards;
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
  .btn-aggiungi-adam {
    background-color: #FFDA2A;
    color: #000;
  }
  .btn-aggiungi-adam span {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    transition: transform 0.15s ease;
  }
  .btn-aggiungi-adam:hover:not(:disabled) span {
    transform: scale(1.06);
  }
  .btn-aggiungi-adam:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
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

const extractYouTubeId = (url) => {
  if (!url) return null;
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/))([^&\n?#]+)/);
  return m ? m[1] : null;
};

const mapDbVideo = (v) => ({
  id: v.id,
  title: v.title,
  youtubeUrl: v.youtube_url || '',
  thumbnail: v.thumbnail || '',
  duration: v.duration || '0:00',
  year: v.year,
  views: v.views || 0,
  format: v.formato || 'orizzontale',
  tema: v.tema || '',
  natura: v.natura || '',
  prodottoScuola: v.prodotto_scuola || false,
  description: v.description || '',
  dataInserimento: v.data_inserimento || '',
  codice: v.codice || '',
});

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
const DUR_MAX = 5400; // 90 minuti — copre il massimo del dataset (film ~88 min)

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

const HeroSection = ({ onVideoClick, videos = [] }) => {
  const [heroVideo, setHeroVideo] = useState(null);
  const [logoAnim, setLogoAnim] = useState(null);
  const lottieRef = useRef(null);

  useEffect(() => {
    fetch('/logo-animation.json')
      .then(response => response.json())
      .then(data => setLogoAnim(data))
      .catch(err => console.error('Errore caricamento logo:', err));
  }, []);

  useEffect(() => {
    if (!heroVideo && videos.length > 0) {
      const eligible = videos.filter(v => {
        const ytId = getYouTubeID(v.youtubeUrl);
        return ytId && ytId !== PLACEHOLDER_VIDEO_ID && v.duration && v.duration !== '0:00';
      });
      const pool = eligible.length > 0 ? eligible : videos;
      setHeroVideo(pool[Math.floor(Math.random() * pool.length)]);
    }
  }, [videos.length]); // eslint-disable-line react-hooks/exhaustive-deps

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
    {['ARCHIVIO', 'DIGITALE', 'ADDICTION E', 'MEDIA'].map((word, i) => (
      <span
        key={word}
        className="tagline-word text-white/50 text-[11px] md:text-[13px] tracking-[0.25em] uppercase leading-tight font-light"
        style={{ animationDelay: `${0.8 + i * 0.15}s` }}
      >
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

const InspireSection = ({ onVideoClick, onAddToPlaylist, isInPlaylist, videos = [] }) => {
  const [inspireVideo, setInspireVideo] = useState(null);

  const getRandomVideo = () => {
    if (videos.length > 0) {
      const eligible = videos.filter(v => {
        const ytId = getYouTubeID(v.youtubeUrl);
        return ytId && ytId !== PLACEHOLDER_VIDEO_ID && v.duration && v.duration !== '0:00';
      });
      const pool = eligible.length > 0 ? eligible : videos;
      setInspireVideo(pool[Math.floor(Math.random() * pool.length)]);
    }
  };

  useEffect(() => {
    if (!inspireVideo && videos.length > 0) getRandomVideo();
  }, [videos.length]); // eslint-disable-line react-hooks/exhaustive-deps

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

const FiltersSection = ({ onFilterChange, currentFilters, searchQuery, onSearchChange, onSearchSubmit, videos = [] }) => {
  const nature = ['Tutti', 'Cortometraggio', 'Film', 'Info', 'Sequenza', 'Spot commerciale', 'Spot sociale', 'Videoclip', 'Web e social'];
  const years = ['Tutti', ...new Set(videos.map(v => v.year).filter(Boolean).sort((a, b) => b - a))];
  const [hoveredTema, setHoveredTema] = useState(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const activeTema = currentFilters.tema;
  const activeBorderColor = TEMA_COLORS[activeTema]?.border || '#3f3f46';
  const accentColor = TEMA_COLORS[activeTema]?.border ?? '#FFDA2A';

  // Conta filtri avanzati attivi
  const durActive = currentFilters.durationMin !== SNAP_POINTS[0] || currentFilters.durationMax !== SNAP_POINTS[SNAP_POINTS.length - 1];
  const advancedCount = [
    currentFilters.natura !== 'Tutti',
    currentFilters.year !== 'Tutti',
    currentFilters.scuola !== 'Tutti',
    durActive,
  ].filter(Boolean).length;

  const hasAnyFilter = activeTema !== 'Tutti' || advancedCount > 0 || searchQuery;

  const resetAll = () => {
    onFilterChange({ tema: 'Tutti', natura: 'Tutti', year: 'Tutti', scuola: 'Tutti', durationMin: SNAP_POINTS[0], durationMax: SNAP_POINTS[SNAP_POINTS.length - 1] });
    onSearchChange('');
  };

  // Chips filtri avanzati attivi (visibili anche col pannello chiuso)
  const activeChips = [];
  if (currentFilters.natura !== 'Tutti') activeChips.push({ label: currentFilters.natura, clear: () => onFilterChange({ ...currentFilters, natura: 'Tutti' }) });
  if (currentFilters.year !== 'Tutti') activeChips.push({ label: `Anno: ${currentFilters.year}`, clear: () => onFilterChange({ ...currentFilters, year: 'Tutti' }) });
  if (currentFilters.scuola !== 'Tutti') activeChips.push({ label: currentFilters.scuola === 'Scuole' ? 'Solo Scuole' : 'Escl. Scuole', clear: () => onFilterChange({ ...currentFilters, scuola: 'Tutti' }) });
  if (durActive) activeChips.push({ label: `${formatDuration(currentFilters.durationMin)} – ${formatDuration(currentFilters.durationMax)}`, clear: () => onFilterChange({ ...currentFilters, durationMin: SNAP_POINTS[0], durationMax: SNAP_POINTS[SNAP_POINTS.length - 1] }) });

  return (
    <div className="mb-8">
      <div>
        <div className={`bg-zinc-900 overflow-hidden transition-all duration-300 ${showAdvanced ? 'rounded-t-xl' : 'rounded-xl'}`}>
          {/* Striscia colorata tema */}
          <div className="h-[3px] transition-colors duration-300" style={{ backgroundColor: activeTema !== 'Tutti' ? activeBorderColor : 'transparent' }} />
          <div className="p-6">
            {/* Campo di ricerca libera */}
            <div className="relative mb-5">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') onSearchSubmit?.(); }}
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
          </div>
        </div>
      </div>

      {/* Pannello avanzato — NON sticky, scorre con la pagina */}
      {showAdvanced && (
        <div className="bg-zinc-900 rounded-b-xl px-6 pb-6">
          <div className="pt-5 border-t border-zinc-800 space-y-5">
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
        </div>
      )}
    </div>
  );
};

const NatureCarousel = ({ onSelectNature, selectedNatura, videos = [] }) => {
  const [currentSlide, setCurrentSlide] = useState(0);

  const natureData = [
    { name: 'Cortometraggio', image: '/images/nature/cortometraggio.jpg', key: 'Cortometraggio' },
    { name: 'Film', image: '/images/nature/film.jpg', key: 'Film' },
    { name: 'Info', image: '/images/nature/info.jpg', key: 'Info' },
    { name: 'Sequenze', image: '/images/nature/sequenza.jpg', key: 'Sequenze' },
    { name: 'Spot ADV', image: '/images/nature/spot-adv.jpg', key: 'Spot commerciale' },
    { name: 'Spot Sociale', image: '/images/nature/spot-sociale.jpg', key: 'Spot sociale' },
    { name: 'Videoclip', image: '/images/nature/videoclip.jpg', key: 'Videoclip' },
    { name: 'Web e Social', image: '/images/nature/web-social.jpg', key: 'Web e social' }
  ];

  const videoCounts = useMemo(() => {
    const counts = {};
    natureData.forEach(nat => {
      counts[nat.key] = videos.filter(v => v.natura === nat.key).length;
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
const PlaylistSidebar = ({
  user,
  onOpenAuth,
  onClose,
  isOpen,
  // Playlist locale (anonimi)
  localPlaylist,
  onLocalRemove,
  onLocalReorder,
  onLocalPlay,
  // Playlist Supabase (loggati)
  playlists,
  activePlaylistId,
  onSetActive,
  onCreatePlaylist,
  onDeletePlaylist,
  onRenamePlaylist,
  onRemoveVideo,
  onReorder,
  onPlay,
  getVideosForPlaylist,
}) => {
  const [dragId, setDragId] = useState(null); // solo per effetto visivo (dim)
  const dragIdRef = useRef(null);             // per la logica drag (no re-render)
  const [creatingNew, setCreatingNew] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState('');

  const activePlaylist = playlists.find(p => p.id === activePlaylistId);
  const activeVideos = getVideosForPlaylist(activePlaylist);

  const startDrag = (videoId) => { dragIdRef.current = videoId; setDragId(videoId); };
  const endDrag   = ()        => { dragIdRef.current = null;    setDragId(null);    };

  // Riordina su DROP (non dragOver) → zero re-render durante il drag
  const doReorder = (targetId, list, commitFn) => {
    const fromId = dragIdRef.current;
    if (!fromId || fromId === targetId) return;
    const from = list.findIndex(v => v.id === fromId);
    const to   = list.findIndex(v => v.id === targetId);
    if (from === -1 || to === -1) return;
    const next = [...list];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    commitFn(next);
  };

  const handleCreate = async () => {
    const name = newPlaylistName.trim() || 'La mia playlist';
    await onCreatePlaylist(name);
    setCreatingNew(false);
    setNewPlaylistName('');
  };

  if (!isOpen) return null;

  // Renderizza una riga video drag&drop (JSX inline, non componente — evita rimount)
  const renderVideoRow = (video, index, list, onRemove, onDropFn) => (
    <div
      key={video.id}
      draggable
      onDragStart={() => startDrag(video.id)}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => { e.preventDefault(); onDropFn(video.id, list); endDrag(); }}
      onDragEnd={endDrag}
      className={`bg-zinc-800 rounded-lg overflow-hidden flex gap-3 p-3 group transition-colors cursor-move ${dragId === video.id ? 'opacity-40 scale-95' : 'hover:bg-zinc-750'}`}
    >
      <div className="relative w-24 h-16 flex-shrink-0 rounded overflow-hidden">
        <VideoThumbnail youtubeUrl={video.youtubeUrl} title={video.title} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center">
          <span className="text-white text-xs font-bold">{index + 1}</span>
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-white text-sm font-medium line-clamp-2 mb-1">{video.title}</h3>
        <p className="text-zinc-400 text-xs">{video.duration || 'N/D'} • {video.year}</p>
      </div>
      <button onClick={() => onRemove(video.id)} className="text-zinc-500 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0">
        <X size={18} />
      </button>
    </div>
  );

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-full md:w-96 bg-zinc-900 z-50 flex flex-col">

        {/* === Non loggato: playlist locale === */}
        {!user ? (
          <>
            <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2"><List size={22} />La mia Playlist</h2>
                <p className="text-zinc-400 text-sm mt-1">{localPlaylist.length} video</p>
              </div>
              <button onClick={onClose} className="text-zinc-400 hover:text-white transition-colors"><X size={24} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 modal-scrollbar" style={{'--scrollbar-color': '#52525b'}}>
              {localPlaylist.length === 0 ? (
                <div className="text-center py-16">
                  <List size={40} className="text-zinc-700 mx-auto mb-3" />
                  <p className="text-zinc-400 text-sm">Nessun video in playlist</p>
                  <p className="text-zinc-600 text-xs mt-1">Aggiungi video con il pulsante "+"</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {localPlaylist.map((video, index) => renderVideoRow(
                    video, index, localPlaylist, onLocalRemove,
                    (targetId, list) => doReorder(targetId, list, onLocalReorder)
                  ))}
                </div>
              )}
            </div>
            <div className="border-t border-zinc-800">
              {localPlaylist.length > 0 && (
                <div className="p-4 pb-3 flex gap-2">
                  <button
                    onClick={onLocalPlay}
                    className="flex-1 flex items-center justify-center gap-1.5 text-black py-3 rounded-lg font-semibold hover:bg-yellow-600 transition-all text-sm"
                    style={{ backgroundColor: '#FFDA2A' }}
                  >
                    <Play size={16} /> Riproduci
                  </button>
                  <button
                    onClick={() => { onClose(); onOpenAuth(); }}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 text-white py-3 rounded-lg font-semibold transition-all text-sm"
                  >
                    <Save size={16} /> Salva Playlist
                  </button>
                </div>
              )}
              <div className="px-4 py-3 flex items-center gap-2 bg-zinc-800/40">
                <LogIn size={15} className="text-zinc-300 flex-shrink-0" />
                <p className="text-zinc-300 text-xs font-medium">Accedi per salvare le tue playlist</p>
                {localPlaylist.length === 0 && (
                  <button
                    onClick={() => { onClose(); onOpenAuth(); }}
                    className="ml-auto text-xs text-black px-3 py-1.5 rounded-lg font-semibold flex-shrink-0 hover:brightness-110 transition-all"
                    style={{ backgroundColor: '#FFDA2A' }}
                  >
                    Accedi
                  </button>
                )}
              </div>
            </div>
          </>

        ) : activePlaylistId === null ? (
          /* === Vista 1: Lista playlist === */
          <>
            <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white flex items-center gap-2"><List size={22} />Le mie Playlist</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setCreatingNew(true); setNewPlaylistName(''); }}
                  className="text-xs bg-zinc-800 hover:bg-zinc-700 text-white px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors"
                >
                  <Plus size={14} /> Nuova
                </button>
                <button onClick={onClose} className="text-zinc-400 hover:text-white transition-colors"><X size={24} /></button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 modal-scrollbar" style={{'--scrollbar-color': '#52525b'}}>
              {creatingNew && (
                <div className="bg-zinc-800 rounded-lg p-3 flex gap-2">
                  <input
                    autoFocus
                    type="text"
                    value={newPlaylistName}
                    onChange={e => setNewPlaylistName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') setCreatingNew(false); }}
                    placeholder="Nome playlist..."
                    className="flex-1 bg-zinc-700 text-white text-sm rounded px-3 py-1.5 outline-none placeholder-zinc-500"
                  />
                  <button onClick={handleCreate} className="text-black px-3 py-1.5 rounded text-sm font-medium" style={{ backgroundColor: '#FFDA2A' }}>Crea</button>
                  <button onClick={() => setCreatingNew(false)} className="text-zinc-400 hover:text-white px-2"><X size={16} /></button>
                </div>
              )}
              {playlists.length === 0 && !creatingNew && (
                <div className="text-center py-16">
                  <List size={40} className="text-zinc-700 mx-auto mb-3" />
                  <p className="text-zinc-400 text-sm">Nessuna playlist ancora</p>
                  <p className="text-zinc-600 text-xs mt-1">Clicca "Nuova" per iniziare</p>
                </div>
              )}
              {playlists.map(pl => {
                const videos = getVideosForPlaylist(pl);
                const isEditing = editingId === pl.id;
                return (
                  <div key={pl.id} className="bg-zinc-800 rounded-lg p-4">
                    {isEditing ? (
                      <div className="flex gap-2">
                        <input
                          autoFocus
                          type="text"
                          value={editingName}
                          onChange={e => setEditingName(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') { onRenamePlaylist(pl.id, editingName || pl.name); setEditingId(null); }
                            if (e.key === 'Escape') setEditingId(null);
                          }}
                          className="flex-1 bg-zinc-700 text-white text-sm rounded px-2 py-1 outline-none"
                        />
                        <button onClick={() => { onRenamePlaylist(pl.id, editingName || pl.name); setEditingId(null); }} className="text-[#FFDA2A] text-xs px-2">Salva</button>
                        <button onClick={() => setEditingId(null)} className="text-zinc-400 hover:text-white px-1"><X size={14} /></button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div className="min-w-0 flex-1">
                          <p className="text-white font-medium text-sm truncate">{pl.name}</p>
                          <p className="text-zinc-500 text-xs">{videos.length} video</p>
                        </div>
                        <div className="flex items-center gap-0.5 flex-shrink-0 ml-2">
                          <button onClick={() => onPlay(pl.id)} className="p-1.5 rounded-md hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors" title="Riproduci">
                            <Play size={14} />
                          </button>
                          <button onClick={() => onSetActive(pl.id)} className="p-1.5 rounded-md hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors" title="Apri">
                            <ChevronRight size={14} />
                          </button>
                          <button onClick={() => { setEditingId(pl.id); setEditingName(pl.name); }} className="p-1.5 rounded-md hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors" title="Rinomina">
                            <Pencil size={14} />
                          </button>
                          <button onClick={() => onDeletePlaylist(pl.id)} className="p-1.5 rounded-md hover:bg-zinc-700 text-zinc-400 hover:text-red-400 transition-colors" title="Elimina">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>

        ) : (
          /* === Vista 2: Video di una playlist === */
          <>
            <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <button onClick={() => onSetActive(null)} className="text-zinc-400 hover:text-white transition-colors flex-shrink-0">
                  <ChevronLeft size={20} />
                </button>
                <h2 className="text-xl font-bold text-white truncate">{activePlaylist?.name}</h2>
              </div>
              <button onClick={onClose} className="text-zinc-400 hover:text-white transition-colors flex-shrink-0 ml-2"><X size={24} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 modal-scrollbar" style={{'--scrollbar-color': '#52525b'}}>
              {activeVideos.length === 0 ? (
                <div className="text-center py-16">
                  <List size={40} className="text-zinc-700 mx-auto mb-3" />
                  <p className="text-zinc-400 text-sm">Nessun video in questa playlist</p>
                  <p className="text-zinc-600 text-xs mt-1">Aggiungi video con il pulsante "+"</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {activeVideos.map((video, index) => renderVideoRow(
                    video, index, activeVideos, (id) => onRemoveVideo(activePlaylistId, id),
                    (targetId, list) => doReorder(targetId, list, (next) => onReorder(activePlaylistId, next.map(v => v.id)))
                  ))}
                </div>
              )}
            </div>
            {activeVideos.length > 0 && (
              <div className="p-4 border-t border-zinc-800">
                <button
                  onClick={() => onPlay(activePlaylistId)}
                  className="w-full flex items-center justify-center gap-2 text-black py-3 rounded-lg font-semibold hover:bg-yellow-600 transition-all"
                  style={{ backgroundColor: '#FFDA2A' }}
                >
                  <Play size={20} /> Riproduci Playlist
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
};

const PickPlaylistModal = ({ video, playlists, onAdd, onClose, onCreatePlaylist }) => {
  const [creatingNew, setCreatingNew] = useState(false);
  const [newName, setNewName] = useState('');

  const handleCreate = async () => {
    const pl = await onCreatePlaylist(newName.trim() || 'La mia playlist');
    if (pl) { onAdd(pl.id, video.id); onClose(); }
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-bold text-lg">Aggiungi a playlist</h3>
          <button onClick={onClose} className="text-zinc-400 hover:text-white transition-colors"><X size={20} /></button>
        </div>
        <p className="text-zinc-400 text-sm mb-4 truncate">{video.title}</p>
        <div className="space-y-2 mb-4">
          {playlists.map(pl => (
            <button
              key={pl.id}
              onClick={() => { onAdd(pl.id, video.id); onClose(); }}
              className="w-full text-left bg-zinc-800 hover:bg-zinc-700 rounded-lg px-4 py-3 transition-colors flex items-center justify-between"
            >
              <span className="text-white text-sm">{pl.name}</span>
              <span className="text-zinc-500 text-xs">{pl.video_ids.length} video</span>
            </button>
          ))}
        </div>
        {creatingNew ? (
          <div className="flex gap-2">
            <input
              autoFocus
              type="text"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') setCreatingNew(false); }}
              placeholder="Nome nuova playlist..."
              className="flex-1 bg-zinc-800 text-white text-sm rounded-lg px-3 py-2 outline-none placeholder-zinc-500"
            />
            <button onClick={handleCreate} className="text-black px-3 py-2 rounded-lg text-sm font-medium" style={{ backgroundColor: '#FFDA2A' }}>Crea</button>
          </div>
        ) : (
          <button
            onClick={() => setCreatingNew(true)}
            className="w-full flex items-center gap-2 text-zinc-400 hover:text-white transition-colors text-sm py-2"
          >
            <Plus size={16} /> Crea nuova playlist
          </button>
        )}
      </div>
    </div>
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

// ─── AuthModal ────────────────────────────────────────────────────────────────
const AuthModal = ({ mode: initialMode, onClose }) => {
  const [mode, setMode] = useState(initialMode || 'login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nome, setNome] = useState('');
  const [org, setOrg] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [registered, setRegistered] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError(error.message === 'Invalid login credentials' ? 'Email o password errati.' : error.message);
    else onClose();
    setLoading(false);
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      setError(error.message);
    } else {
      if (data.user) {
        await supabase.from('profiles').upsert({ id: data.user.id, nome: nome || null, organizzazione: org || null, email: data.user.email }, { onConflict: 'id' });
      }
      setRegistered(true);
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 max-w-md w-full shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex gap-2">
            {['login', 'register'].map(m => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(null); setRegistered(false); }}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
                style={{ backgroundColor: mode === m ? '#27272a' : 'transparent', color: mode === m ? '#FFDA2A' : '#71717a', border: mode === m ? '1px solid #3f3f46' : '1px solid transparent' }}
              >
                {m === 'login' ? 'Accedi' : 'Registrati'}
              </button>
            ))}
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors"><X size={20} /></button>
        </div>

        {registered ? (
          <div className="text-center py-8">
            <ShieldCheck size={48} className="text-[#FFDA2A] mx-auto mb-4" />
            <h3 className="text-white font-bold text-xl mb-2">Registrazione completata!</h3>
            <p className="text-zinc-400 text-sm">Controlla la tua email per confermare l'account, poi accedi.</p>
            <button onClick={() => { setMode('login'); setRegistered(false); }} className="mt-6 text-[#FFDA2A] text-sm hover:underline">Vai al login</button>
          </div>
        ) : (
          <form onSubmit={mode === 'login' ? handleLogin : handleRegister} className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 bg-red-900/30 border border-red-800 text-red-400 px-4 py-3 rounded-lg text-sm">
                <AlertCircle size={16} className="flex-shrink-0" />
                {error}
              </div>
            )}
            {mode === 'register' && (
              <>
                <div>
                  <label className="block text-sm text-zinc-400 mb-1.5">Nome e cognome</label>
                  <input type="text" value={nome} onChange={e => setNome(e.target.value)} placeholder="Mario Rossi" className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-4 py-3 text-sm placeholder-zinc-500 outline-none focus:border-zinc-500" />
                </div>
                <div>
                  <label className="block text-sm text-zinc-400 mb-1.5">Organizzazione / Scuola</label>
                  <input type="text" value={org} onChange={e => setOrg(e.target.value)} placeholder="es. Liceo Berchet, Milano" className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-4 py-3 text-sm placeholder-zinc-500 outline-none focus:border-zinc-500" />
                </div>
              </>
            )}
            <div>
              <label className="block text-sm text-zinc-400 mb-1.5">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="nome@email.it" className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-4 py-3 text-sm placeholder-zinc-500 outline-none focus:border-zinc-500" />
            </div>
            <div>
              <label className="block text-sm text-zinc-400 mb-1.5">Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="Minimo 6 caratteri" className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-4 py-3 text-sm placeholder-zinc-500 outline-none focus:border-zinc-500" />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-lg font-semibold text-black transition-all hover:brightness-110 disabled:opacity-50"
              style={{ backgroundColor: '#FFDA2A' }}
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : mode === 'login' ? <LogIn size={18} /> : <Send size={18} />}
              {mode === 'login' ? 'Accedi' : 'Crea account'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

// ─── SubmitVideoSection ────────────────────────────────────────────────────────
const NATURE_OPTIONS = ['Cortometraggio', 'Film', 'Info', 'Sequenze', 'Spot commerciale', 'Spot sociale', 'Videoclip', 'Web e social'];
const TEMI_OPTIONS = ['Alcool', 'Azzardo', 'Digitale', 'Sostanze'];

const SubmitVideoSection = ({ user, userProfile, onOpenAuth, onBack, onDraftSaved }) => {
  const [form, setForm] = useState({ title: '', youtube_url: '', tema: '', description: '', prodotto_scuola: false });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [successType, setSuccessType] = useState('pending');
  const [error, setError] = useState(null);

  const f = (field, val) => setForm(prev => ({ ...prev, [field]: val }));
  const resetForm = () => setForm({ title: '', youtube_url: '', tema: '', description: '', prodotto_scuola: false });

  const handleSubmit = async (statusTarget) => {
    if (!form.youtube_url.trim()) { setError('Il link YouTube è obbligatorio.'); return; }
    if (!form.title.trim()) { setError('Il titolo è obbligatorio.'); return; }
    if (statusTarget === 'pending' && !form.tema) { setError('Seleziona un tema.'); return; }
    setLoading(true);
    setError(null);
    const { error: err } = await supabase.from('video_submissions').insert({
      user_id: user.id,
      tipo: 'youtube',
      title: form.title.trim(),
      youtube_url: form.youtube_url.trim(),
      tema: form.tema || null,
      description: form.description.trim() || null,
      prodotto_scuola: form.prodotto_scuola,
      status: statusTarget,
    });
    if (err) setError(err.message);
    else {
      setSuccessType(statusTarget);
      if (statusTarget === 'draft') {
        onDraftSaved?.();
      } else {
        setSuccess(true);
      }
    }
    setLoading(false);
  };

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto py-24 text-center">
        <Upload size={64} className="text-zinc-700 mx-auto mb-6" strokeWidth={1.5} />
        <h2 className="text-3xl font-bold text-white mb-4">Segnala un Video</h2>
        <p className="text-zinc-400 mb-8 leading-relaxed">Hai trovato un video interessante su YouTube? Hai prodotto contenuti educativi con i tuoi ragazzi?<br />Condividi con la community ADAM — dopo una revisione, verrà aggiunto all'archivio.</p>
        <button onClick={onOpenAuth} className="text-black px-8 py-3 rounded-lg font-semibold hover:brightness-110 transition-all" style={{ backgroundColor: '#FFDA2A' }}>
          Accedi per segnalare
        </button>
      </div>
    );
  }

  if (success) {
    return (
      <div className="max-w-2xl mx-auto py-24 text-center">
        <ShieldCheck size={64} className="text-[#FFDA2A] mx-auto mb-6" strokeWidth={1.5} />
        <h2 className="text-3xl font-bold text-white mb-4">Segnalazione inviata!</h2>
        <p className="text-zinc-400 mb-8">Grazie! Esamineremo il tuo contributo e lo aggiungeremo all'archivio ADAM se appropriato.</p>
        <button onClick={() => { setSuccess(false); resetForm(); }}
          className="text-black px-8 py-3 rounded-lg font-semibold hover:brightness-110 transition-all" style={{ backgroundColor: '#FFDA2A' }}>
          Segnala un altro
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-8">
      <button onClick={onBack} className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors text-sm mb-6">
        <ChevronLeft size={18} /> Torna all'archivio
      </button>
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-white mb-2">Segnala un Video</h2>
        <p className="text-zinc-400">Condividi un video YouTube utile per l'educazione — lo esamineremo e, se appropriato, lo aggiungeremo all'archivio.</p>
      </div>

      <form onSubmit={e => { e.preventDefault(); handleSubmit('pending'); }} className="space-y-5">
        {error && (
          <div className="flex items-center gap-2 bg-red-900/30 border border-red-800 text-red-400 px-4 py-3 rounded-lg text-sm">
            <AlertCircle size={16} className="flex-shrink-0" />{error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1.5">Link YouTube *</label>
          <input type="url" value={form.youtube_url} onChange={e => f('youtube_url', e.target.value)} placeholder="https://youtu.be/..." className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-4 py-3 text-sm placeholder-zinc-500 outline-none focus:border-zinc-500" />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1.5">Titolo *</label>
          <input type="text" value={form.title} onChange={e => f('title', e.target.value)} placeholder="Titolo del video" className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-4 py-3 text-sm placeholder-zinc-500 outline-none focus:border-zinc-500" />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1.5">Tema *</label>
          <div className="flex flex-wrap gap-2">
            {TEMI_OPTIONS.map(tema => {
              const c = TEMA_COLORS[tema];
              const active = form.tema === tema;
              return (
                <button
                  key={tema}
                  type="button"
                  onClick={() => f('tema', active ? '' : tema)}
                  className="px-4 py-2 rounded-lg text-sm font-medium transition-all text-white"
                  style={{
                    backgroundColor: active ? c.solid : 'transparent',
                    border: `2px solid ${c.border}`,
                    opacity: 1,
                  }}
                >
                  {tema}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1.5">Descrizione <span className="text-zinc-500 font-normal">(opzionale)</span></label>
          <textarea value={form.description} onChange={e => f('description', e.target.value)} rows={6} placeholder="Descrivi brevemente il contenuto..." className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-4 py-3 text-sm placeholder-zinc-500 outline-none focus:border-zinc-500 resize-none" />
        </div>

        <div>
          <button type="button" onClick={() => f('prodotto_scuola', !form.prodotto_scuola)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all border-2"
            style={{ backgroundColor: form.prodotto_scuola ? '#27272a' : 'transparent', borderColor: form.prodotto_scuola ? '#FFDA2A' : '#3f3f46', color: form.prodotto_scuola ? '#FFDA2A' : '#a1a1aa' }}>
            <School size={16} /> Prodotto da studenti / scuola
            {form.prodotto_scuola && <Check size={14} />}
          </button>
        </div>

        <div className="flex gap-3">
          <button type="button" onClick={() => handleSubmit('draft')} disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-semibold text-zinc-300 border border-zinc-600 hover:bg-zinc-800 transition-all disabled:opacity-50">
            {loading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
            Salva bozza
          </button>
          <button type="submit" disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-semibold text-black hover:brightness-110 transition-all disabled:opacity-50"
            style={{ backgroundColor: '#FFDA2A' }}>
            {loading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
            Invia all'admin
          </button>
        </div>
      </form>
    </div>
  );
};

// ─── MyVideosSection ───────────────────────────────────────────────────────────
const MyVideosSection = ({ user, onNewVideo }) => {
  const [mySubmissions, setMySubmissions] = useState([]);
  const [myLoading, setMyLoading] = useState(true);
  const [myEditForms, setMyEditForms] = useState({});
  const [myEditingId, setMyEditingId] = useState(null);
  const [mySendError, setMySendError] = useState(null);
  const [myDeleteConfirmId, setMyDeleteConfirmId] = useState(null);
  const [mySavingId, setMySavingId] = useState(null);
  const [myDeletingId, setMyDeletingId] = useState(null);
  const [mySendingId, setMySendingId] = useState(null);

  const mef = (id, field, val) => setMyEditForms(prev => ({ ...prev, [id]: { ...(prev[id] || {}), [field]: val } }));

  useEffect(() => {
    if (!user) return;
    supabase.from('video_submissions').select('*')
      .eq('user_id', user.id)
      .order('submitted_at', { ascending: false })
      .then(({ data }) => { setMySubmissions(data || []); setMyLoading(false); });
  }, [user]);

  const handleSaveDraft = async (sub) => {
    const ef = myEditForms[sub.id] || {};
    setMySavingId(sub.id);
    const { error } = await supabase.from('video_submissions').update({
      youtube_url: ef.youtube_url ?? sub.youtube_url,
      title: ef.title ?? sub.title,
      tema: ef.tema ?? sub.tema,
      description: ef.description ?? sub.description,
      prodotto_scuola: ef.prodotto_scuola ?? sub.prodotto_scuola,
    }).eq('id', sub.id).eq('status', 'draft');
    if (!error) {
      setMySubmissions(prev => prev.map(s => s.id === sub.id ? { ...s, ...ef } : s));
      setMyEditingId(null);
      setMyEditForms(prev => { const n = { ...prev }; delete n[sub.id]; return n; });
    }
    setMySavingId(null);
  };

  const handleSendDraft = async (sub) => {
    setMySendingId(sub.id);
    setMySendError(null);
    const { error } = await supabase.from('video_submissions').update({ status: 'pending' }).eq('id', sub.id);
    if (!error) setMySubmissions(prev => prev.map(s => s.id === sub.id ? { ...s, status: 'pending' } : s));
    else setMySendError(sub.id + ':' + error.message);
    setMySendingId(null);
  };

  const handleDeleteDraft = async (sub) => {
    setMyDeletingId(sub.id);
    const { error } = await supabase.from('video_submissions').delete().eq('id', sub.id);
    if (!error) {
      setMySubmissions(prev => prev.filter(s => s.id !== sub.id));
      setMyDeleteConfirmId(null);
    }
    setMyDeletingId(null);
  };

  if (myLoading) return (
    <div className="flex items-center justify-center py-20"><Loader2 size={28} className="animate-spin text-zinc-500" /></div>
  );

  const STATUS_BADGE = {
    draft:    { label: 'Bozza',     color: '#a1a1aa', bg: '#27272a' },
    pending:  { label: 'In attesa', color: '#FFDA2A', bg: 'rgba(255,218,42,0.12)' },
    approved: { label: 'Approvato', color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
    rejected: { label: 'Rifiutato', color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
  };

  const renderCard = (sub, isDraft) => {
    const isEditing = myEditingId === sub.id;
    const ef = myEditForms[sub.id] || {};
    const isDeleteConfirm = myDeleteConfirmId === sub.id;
    const ytId = extractYouTubeId(sub.youtube_url);
    const badge = STATUS_BADGE[sub.status] || { label: sub.status, color: '#a1a1aa', bg: '#27272a' };

    return (
      <div key={sub.id} className="bg-zinc-800 rounded-xl overflow-hidden border border-zinc-700">
        <div className="p-4">
          <div className="flex items-start gap-3">
            {ytId && (
              <div className="flex-shrink-0 w-20 h-14 rounded overflow-hidden">
                <img src={`https://img.youtube.com/vi/${ytId}/mqdefault.jpg`} alt={sub.title} className="w-full h-full object-cover" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 mb-1">
                <p className="text-white font-semibold text-sm">{sub.title || '(senza titolo)'}</p>
                <span className="text-xs px-2 py-0.5 rounded-full font-semibold flex-shrink-0"
                  style={{ color: badge.color, backgroundColor: badge.bg }}>{badge.label}</span>
              </div>
              {sub.tema && (() => { const c = TEMA_COLORS[sub.tema]; return (
                <span className="inline-block text-xs px-2 py-0.5 rounded font-semibold mr-1" style={{ backgroundColor: c?.solid || '#52525b', color: '#fff' }}>{sub.tema}</span>
              ); })()}
              {sub.youtube_url && (
                <a href={sub.youtube_url} target="_blank" rel="noopener noreferrer"
                  className="text-xs text-blue-400 hover:underline mt-1 block truncate">{sub.youtube_url}</a>
              )}
              <p className="text-xs text-zinc-500 mt-1">{new Date(sub.submitted_at).toLocaleDateString('it-IT')}</p>
            </div>
          </div>

          {isDraft && !isEditing && (
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              <button onClick={() => setMyEditingId(sub.id)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-700 hover:bg-zinc-600 text-white transition-all">
                <Pencil size={12} /> Modifica
              </button>
              <button onClick={() => handleSendDraft(sub)} disabled={mySendingId === sub.id}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-black disabled:opacity-50 transition-all"
                style={{ backgroundColor: '#FFDA2A' }}>
                {mySendingId === sub.id ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />} Invia
              </button>
              {mySendError?.startsWith(sub.id + ':') && (
                <span className="text-xs text-red-400 flex items-center gap-1">
                  <AlertCircle size={11} /> {mySendError.slice(sub.id.length + 1)}
                </span>
              )}
              {isDeleteConfirm ? (
                <>
                  <span className="text-xs text-zinc-400">Eliminare?</span>
                  <button onClick={() => handleDeleteDraft(sub)} disabled={myDeletingId === sub.id}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-600 hover:bg-red-500 text-white transition-all disabled:opacity-50">
                    {myDeletingId === sub.id ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} Sì
                  </button>
                  <button onClick={() => setMyDeleteConfirmId(null)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-zinc-600 text-zinc-300 hover:text-white transition-all">
                    No
                  </button>
                </>
              ) : (
                <button onClick={() => setMyDeleteConfirmId(sub.id)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-red-400 hover:text-red-300 hover:bg-zinc-700 transition-all">
                  <Trash2 size={12} /> Elimina
                </button>
              )}
            </div>
          )}

          {isDraft && isEditing && (
            <div className="mt-4 space-y-3 border-t border-zinc-700 pt-4">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Link YouTube</label>
                <input type="url" value={ef.youtube_url ?? sub.youtube_url ?? ''} onChange={e => mef(sub.id, 'youtube_url', e.target.value)}
                  placeholder="https://youtu.be/..." className="w-full bg-zinc-900 border border-zinc-600 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-zinc-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Titolo</label>
                <input type="text" value={ef.title ?? sub.title ?? ''} onChange={e => mef(sub.id, 'title', e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-600 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-zinc-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Tema</label>
                <div className="flex flex-wrap gap-2">
                  {TEMI_OPTIONS.map(tema => {
                    const c = TEMA_COLORS[tema];
                    const active = (ef.tema ?? sub.tema) === tema;
                    return (
                      <button key={tema} type="button" onClick={() => mef(sub.id, 'tema', tema)}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-all"
                        style={{ backgroundColor: active ? c.solid : 'transparent', border: `2px solid ${c.border}` }}>
                        {tema}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Descrizione</label>
                <textarea value={ef.description ?? sub.description ?? ''} onChange={e => mef(sub.id, 'description', e.target.value)}
                  rows={4} className="w-full bg-zinc-900 border border-zinc-600 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-zinc-500 resize-none" />
              </div>
              <div>
                <button type="button" onClick={() => mef(sub.id, 'prodotto_scuola', !(ef.prodotto_scuola ?? sub.prodotto_scuola))}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all border-2"
                  style={{ borderColor: (ef.prodotto_scuola ?? sub.prodotto_scuola) ? '#FFDA2A' : '#3f3f46', color: (ef.prodotto_scuola ?? sub.prodotto_scuola) ? '#FFDA2A' : '#a1a1aa' }}>
                  <School size={14} /> Prodotto da scuola {(ef.prodotto_scuola ?? sub.prodotto_scuola) && <Check size={12} />}
                </button>
              </div>
              <div className="flex gap-2 justify-end">
                <button onClick={() => { setMyEditingId(null); setMyEditForms(prev => { const n = { ...prev }; delete n[sub.id]; return n; }); }}
                  className="px-3 py-2 rounded-lg text-xs font-medium text-zinc-400 hover:text-white border border-zinc-700 hover:border-zinc-500 transition-all">
                  Annulla
                </button>
                <button onClick={() => handleSaveDraft(sub)} disabled={mySavingId === sub.id}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-black disabled:opacity-50"
                  style={{ backgroundColor: '#FFDA2A' }}>
                  {mySavingId === sub.id ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} Salva
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const drafts   = mySubmissions.filter(s => s.status === 'draft');
  const pending  = mySubmissions.filter(s => s.status === 'pending');
  const approved = mySubmissions.filter(s => s.status === 'approved');
  const rejected = mySubmissions.filter(s => s.status === 'rejected');

  return (
    <div className="max-w-3xl mx-auto py-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-3xl font-bold text-white">I miei video</h2>
        <button onClick={onNewVideo}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg font-semibold text-black hover:brightness-110 transition-all text-sm"
          style={{ backgroundColor: '#FFDA2A' }}>
          <Plus size={16} /> Nuovo video
        </button>
      </div>

      {mySubmissions.length === 0 ? (
        <div className="text-center py-20">
          <Upload size={64} className="text-zinc-700 mx-auto mb-4" strokeWidth={1.5} />
          <p className="text-zinc-400 mb-4">Non hai ancora segnalato nessun video.</p>
          <button onClick={onNewVideo}
            className="text-black px-6 py-3 rounded-lg font-semibold hover:brightness-110 transition-all"
            style={{ backgroundColor: '#FFDA2A' }}>
            Segnala il primo
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          {drafts.length > 0 && (
            <div>
              <h3 className="text-base font-semibold text-zinc-400 mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-zinc-500 inline-block" />
                Bozze ({drafts.length})
              </h3>
              <div className="space-y-3">{drafts.map(s => renderCard(s, true))}</div>
            </div>
          )}
          {pending.length > 0 && (
            <div>
              <h3 className="text-base font-semibold text-zinc-400 mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: '#FFDA2A' }} />
                In attesa di revisione ({pending.length})
              </h3>
              <div className="space-y-3">{pending.map(s => renderCard(s, false))}</div>
            </div>
          )}
          {approved.length > 0 && (
            <div>
              <h3 className="text-base font-semibold text-zinc-400 mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                Approvati ({approved.length})
              </h3>
              <div className="space-y-3">{approved.map(s => renderCard(s, false))}</div>
            </div>
          )}
          {rejected.length > 0 && (
            <div>
              <h3 className="text-base font-semibold text-zinc-400 mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
                Rifiutati ({rejected.length})
              </h3>
              <div className="space-y-3">{rejected.map(s => renderCard(s, false))}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ─── AdminSection ──────────────────────────────────────────────────────────────
const AdminSection = ({ userProfile, onVideoApproved, allVideos = [] }) => {
  const [submissions, setSubmissions] = useState([]);
  const [loadingSubs, setLoadingSubs] = useState(true);
  const [form, setForm] = useState({
    title: '', youtube_url: '', tema: '', natura: '',
    year: new Date().getFullYear(), description: '',
    prodotto_scuola: false, formato: 'orizzontale', duration: '', codice: '',
  });
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [editForms, setEditForms] = useState({});
  const [actionLoading, setActionLoading] = useState(null);
  const [approveError, setApproveError] = useState(null);

  // Tab
  const [activeTab, setActiveTab] = useState('add');

  // Rifiutati
  const [rejectedSubs, setRejectedSubs] = useState([]);
  const [loadingRejected, setLoadingRejected] = useState(false);
  const [selectedRejected, setSelectedRejected] = useState(new Set());
  const [deletingRejected, setDeletingRejected] = useState(false);
  const [deleteRejectedConfirm, setDeleteRejectedConfirm] = useState(false);

  // Conferma rifiuto (pending tab)
  const [rejectConfirmId, setRejectConfirmId] = useState(null);

  // Archivio
  const [archiveVideos, setArchiveVideos] = useState([]);
  const [archiveLoading, setArchiveLoading] = useState(false);
  const [archiveLoaded, setArchiveLoaded] = useState(false);
  const [archiveSearch, setArchiveSearch] = useState('');
  const [archiveTema, setArchiveTema] = useState('');
  const [archiveNatura, setArchiveNatura] = useState('');
  const [archiveScuola, setArchiveScuola] = useState(false);
  const [archiveSortDesc, setArchiveSortDesc] = useState(true);
  const [editingVideoId, setEditingVideoId] = useState(null);
  const [editVideoForms, setEditVideoForms] = useState({});
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [savingVideoId, setSavingVideoId] = useState(null);
  const [deletingVideoId, setDeletingVideoId] = useState(null);
  const [selectedArchive, setSelectedArchive] = useState(new Set());
  const [deleteArchiveConfirm, setDeleteArchiveConfirm] = useState(false);
  const [deletingArchive, setDeletingArchive] = useState(false);

  // Utenti
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [usersLoaded, setUsersLoaded] = useState(false);
  const [changingRoleId, setChangingRoleId] = useState(null);
  const [deleteUserConfirmId, setDeleteUserConfirmId] = useState(null);
  const [deletingUserId, setDeletingUserId] = useState(null);
  const [editingUserId, setEditingUserId] = useState(null);
  const [editUserForms, setEditUserForms] = useState({});
  const [savingUserId, setSavingUserId] = useState(null);

  const f = (field, val) => setForm(prev => ({ ...prev, [field]: val }));
  const ef = (subId, field, val) => setEditForms(prev => ({ ...prev, [subId]: { ...(prev[subId] || {}), [field]: val } }));
  const evf = (videoId, field, val) => setEditVideoForms(prev => ({ ...prev, [videoId]: { ...(prev[videoId] || {}), [field]: val } }));

  useEffect(() => {
    if (userProfile?.role !== 'admin') return;
    supabase.from('video_submissions').select('*').in('status', ['pending', 'admin_draft']).order('submitted_at', { ascending: false })
      .then(({ data }) => { setSubmissions(data || []); setLoadingSubs(false); });
    loadRejected();
    loadUsers();
  }, [userProfile]); // eslint-disable-line react-hooks/exhaustive-deps

  // Aggiorna archivio quando allVideos cambia (es. dopo approvazione)
  useEffect(() => {
    if (archiveLoaded) loadArchive();
  }, [allVideos]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadRejected = async () => {
    setLoadingRejected(true);
    const { data } = await supabase.from('video_submissions').select('*').eq('status', 'rejected').order('submitted_at', { ascending: false });
    setRejectedSubs(data || []);
    setLoadingRejected(false);
  };

  // Converte allVideos (camelCase) nel formato snake_case usato nell'archivio
  const toArchiveFormat = (v) => ({
    id: v.id,
    title: v.title,
    youtube_url: v.youtubeUrl || '',
    thumbnail: v.thumbnail || '',
    duration: v.duration || '0:00',
    year: v.year,
    views: v.views || 0,
    formato: v.format || v.formato || 'orizzontale',
    tema: v.tema || '',
    natura: v.natura || '',
    prodotto_scuola: v.prodottoScuola ?? v.prodotto_scuola ?? false,
    description: v.description || '',
    data_inserimento: v.dataInserimento || v.data_inserimento || '',
    codice: v.codice || v.id || '',
  });

  const loadArchive = () => {
    const sorted = allVideos.map(toArchiveFormat).sort((a, b) => {
      const da = a.data_inserimento || '';
      const db = b.data_inserimento || '';
      return db.localeCompare(da);
    });
    setArchiveVideos(sorted);
    setArchiveLoaded(true);
  };

  const loadPending = async () => {
    setLoadingSubs(true);
    const { data } = await supabase.from('video_submissions').select('*').in('status', ['pending', 'admin_draft']).order('submitted_at', { ascending: false });
    setSubmissions(data || []);
    setLoadingSubs(false);
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === 'pending') loadPending();
    if (tab === 'rejected') loadRejected();
    if (tab === 'archive' && !archiveLoaded) loadArchive();
    if (tab === 'users' && !usersLoaded) loadUsers();
  };

  const handleApprove = async (sub) => {
    const edited = { ...sub, ...(editForms[sub.id] || {}) };
    console.log('[handleApprove] edited:', edited);
    if (!edited.codice?.trim()) { setApproveError(sub.id + ':Il campo Codice ID è obbligatorio'); return; }
    const ytId = extractYouTubeId(edited.youtube_url);
    setActionLoading(sub.id + '_approve');
    setApproveError(null);
    // 1. Inserisci il video
    const { error: vidErr } = await supabase.from('videos').upsert({
      id: edited.codice.trim(),
      title: edited.title,
      youtube_url: edited.youtube_url || null,
      thumbnail: ytId ? `https://img.youtube.com/vi/${ytId}/maxresdefault.jpg` : null,
      duration: edited.duration || '0:00',
      year: edited.year ? parseInt(edited.year) : null,
      views: 0,
      formato: edited.formato || 'orizzontale',
      tema: edited.tema || null,
      natura: edited.natura || null,
      prodotto_scuola: edited.prodotto_scuola || false,
      description: edited.description || null,
      codice: edited.codice.trim(),
      data_inserimento: new Date().toISOString().split('T')[0],
    });
    if (vidErr) {
      setApproveError(sub.id + ':' + (vidErr.code === '23505' ? `Il Codice ID "${edited.codice.trim()}" esiste già nell'archivio.` : 'Errore inserimento video: ' + vidErr.message));
      setActionLoading(null);
      return;
    }
    // 2. Solo se il video è stato salvato, aggiorna lo status della segnalazione
    const { error: subErr } = await supabase.from('video_submissions').update({ status: 'approved' }).eq('id', sub.id);
    if (subErr) {
      setApproveError(sub.id + ':Video salvato, ma errore aggiornamento segnalazione: ' + subErr.message);
    } else {
      setSubmissions(prev => prev.filter(s => s.id !== sub.id));
      onVideoApproved?.();
    }
    setActionLoading(null);
  };

  const handleReject = async (sub) => {
    setActionLoading(sub.id + '_reject');
    const { error } = await supabase.from('video_submissions').update({ status: 'rejected' }).eq('id', sub.id);
    if (!error) setSubmissions(prev => prev.filter(s => s.id !== sub.id));
    setRejectConfirmId(null);
    setActionLoading(null);
  };

  const handleDeleteRejected = async () => {
    if (selectedRejected.size === 0) return;
    setDeletingRejected(true);
    const ids = [...selectedRejected];
    const { error } = await supabase.from('video_submissions').delete().in('id', ids);
    if (!error) {
      setRejectedSubs(prev => prev.filter(s => !selectedRejected.has(s.id)));
      setSelectedRejected(new Set());
      setDeleteRejectedConfirm(false);
    }
    setDeletingRejected(false);
  };

  const handleRestoreRejected = async (sub) => {
    const { error } = await supabase.from('video_submissions').update({ status: 'pending' }).eq('id', sub.id);
    if (!error) {
      setRejectedSubs(prev => prev.filter(s => s.id !== sub.id));
      setSubmissions(prev => [{ ...sub, status: 'pending' }, ...prev]);
    }
  };

  const handleSaveVideo = async (video) => {
    const vf = editVideoForms[video.id] || {};
    setSavingVideoId(video.id);
    const newUrl = vf.youtube_url ?? video.youtube_url;
    const ytId = newUrl ? extractYouTubeId(newUrl) : null;
    const fullRecord = {
      id: video.id,
      title: vf.title ?? video.title,
      youtube_url: newUrl || null,
      thumbnail: ytId ? `https://img.youtube.com/vi/${ytId}/maxresdefault.jpg` : (video.thumbnail || null),
      duration: vf.duration ?? video.duration ?? '0:00',
      year: vf.year !== undefined ? (vf.year ? parseInt(vf.year) : null) : (video.year || null),
      formato: vf.formato ?? video.formato ?? 'orizzontale',
      tema: vf.tema !== undefined ? (vf.tema || null) : (video.tema || null),
      natura: vf.natura !== undefined ? (vf.natura || null) : (video.natura || null),
      prodotto_scuola: vf.prodotto_scuola ?? video.prodotto_scuola ?? false,
      description: vf.description ?? video.description ?? null,
      codice: vf.codice !== undefined ? (vf.codice || null) : (video.codice || null),
      views: vf.views !== undefined ? vf.views : (video.views || 0),
      data_inserimento: vf.data_inserimento ?? video.data_inserimento ?? new Date().toISOString().split('T')[0],
    };
    const { error } = await supabase.from('videos').upsert(fullRecord, { onConflict: 'id' });
    if (!error) {
      setArchiveVideos(prev => prev.map(v => v.id === video.id ? { ...v, ...fullRecord } : v));
      setEditingVideoId(null);
      setEditVideoForms(prev => { const n = { ...prev }; delete n[video.id]; return n; });
    }
    setSavingVideoId(null);
  };

  const handleDeleteVideo = async (video) => {
    setDeletingVideoId(video.id);
    const { error } = await supabase.from('videos').delete().eq('id', video.id);
    if (!error) {
      setArchiveVideos(prev => prev.filter(v => v.id !== video.id));
      setDeleteConfirmId(null);
      onVideoApproved?.();
    }
    setDeletingVideoId(null);
  };

  const handleDeleteSelected = async () => {
    if (selectedArchive.size === 0) return;
    setDeletingArchive(true);
    const ids = [...selectedArchive];
    const { error } = await supabase.from('videos').delete().in('id', ids);
    if (!error) {
      setArchiveVideos(prev => prev.filter(v => !selectedArchive.has(v.id)));
      setSelectedArchive(new Set());
      setDeleteArchiveConfirm(false);
      onVideoApproved?.();
    }
    setDeletingArchive(false);
  };

  const loadUsers = async () => {
    setLoadingUsers(true);
    const { data } = await supabase.from('profiles').select('*').order('nome');
    setUsers(data || []);
    setLoadingUsers(false);
    setUsersLoaded(true);
  };

  const handleChangeRole = async (u) => {
    const newRole = u.role === 'admin' ? 'user' : 'admin';
    setChangingRoleId(u.id);
    const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', u.id);
    if (!error) setUsers(prev => prev.map(x => x.id === u.id ? { ...x, role: newRole } : x));
    setChangingRoleId(null);
  };

  const handleDeleteUser = async (u) => {
    setDeletingUserId(u.id);
    await supabase.from('video_submissions').delete().eq('user_id', u.id);
    await supabase.from('playlists').delete().eq('user_id', u.id);
    const { error } = await supabase.from('profiles').delete().eq('id', u.id);
    if (!error) {
      setUsers(prev => prev.filter(x => x.id !== u.id));
      setDeleteUserConfirmId(null);
    }
    setDeletingUserId(null);
  };

  const handleSaveUser = async (u) => {
    const uf = editUserForms[u.id] || {};
    setSavingUserId(u.id);
    const payload = {
      nome: uf.nome ?? u.nome,
      organizzazione: uf.organizzazione ?? u.organizzazione,
      email: uf.email ?? u.email,
    };
    const { error } = await supabase.from('profiles').update(payload).eq('id', u.id);
    if (!error) {
      setUsers(prev => prev.map(x => x.id === u.id ? { ...x, ...payload } : x));
      setEditingUserId(null);
      setEditUserForms(prev => { const n = { ...prev }; delete n[u.id]; return n; });
    } else {
      alert('Errore salvataggio: ' + error.message);
    }
    setSavingUserId(null);
  };

  const uef = (id, field, val) => setEditUserForms(prev => ({ ...prev, [id]: { ...(prev[id] || {}), [field]: val } }));

  const filteredArchive = useMemo(() => archiveVideos.filter(v => {
    const s = archiveSearch.toLowerCase();
    return (!s || v.title?.toLowerCase().includes(s) || v.description?.toLowerCase().includes(s))
      && (!archiveTema || v.tema === archiveTema)
      && (!archiveNatura || v.natura === archiveNatura)
      && (!archiveScuola || v.prodotto_scuola);
  }).sort((a, b) => {
    const da = a.data_inserimento || '';
    const db = b.data_inserimento || '';
    return archiveSortDesc ? db.localeCompare(da) : da.localeCompare(db);
  }), [archiveVideos, archiveSearch, archiveTema, archiveNatura, archiveScuola, archiveSortDesc]);

  const handleEditSave = async (sub) => {
    const ef_val = editForms[sub.id] || {};
    setActionLoading(sub.id + '_edit');
    const { error } = await supabase.from('video_submissions').update({
      youtube_url: ef_val.youtube_url ?? sub.youtube_url,
      title: ef_val.title ?? sub.title,
      tema: ef_val.tema ?? sub.tema,
      natura: ef_val.natura ?? sub.natura,
      year: ef_val.year ?? sub.year,
      formato: ef_val.formato ?? sub.formato,
      duration: ef_val.duration ?? sub.duration,
      description: ef_val.description ?? sub.description,
      prodotto_scuola: ef_val.prodotto_scuola ?? sub.prodotto_scuola,
      codice: ef_val.codice ?? sub.codice ?? null,
    }).eq('id', sub.id);
    if (!error) {
      setSubmissions(prev => prev.map(s => s.id === sub.id ? { ...s, ...ef_val } : s));
      setExpandedId(null);
      setEditForms(prev => { const n = { ...prev }; delete n[sub.id]; return n; });
    }
    setActionLoading(null);
  };

  const handleDirectSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) { setSaveMsg({ type: 'error', text: 'Titolo obbligatorio.' }); return; }
    if (!form.codice.trim()) { setSaveMsg({ type: 'error', text: 'Codice ID obbligatorio.' }); return; }
    if (!form.youtube_url.trim()) { setSaveMsg({ type: 'error', text: 'URL YouTube obbligatorio.' }); return; }
    if (!form.tema) { setSaveMsg({ type: 'error', text: 'Tema obbligatorio.' }); return; }
    if (!form.natura) { setSaveMsg({ type: 'error', text: 'Natura obbligatoria.' }); return; }
    if (!form.year) { setSaveMsg({ type: 'error', text: 'Anno obbligatorio.' }); return; }
    if (!form.duration.trim()) { setSaveMsg({ type: 'error', text: 'Durata obbligatoria.' }); return; }
    if (!form.description.trim()) { setSaveMsg({ type: 'error', text: 'Descrizione obbligatoria.' }); return; }
    setSaving(true);
    setSaveMsg(null);
    const ytId = extractYouTubeId(form.youtube_url.trim());
    const { error } = await supabase.from('videos').insert({
      id: form.codice.trim(),
      title: form.title.trim(),
      youtube_url: form.youtube_url.trim() || null,
      thumbnail: ytId ? `https://img.youtube.com/vi/${ytId}/maxresdefault.jpg` : null,
      tema: form.tema || null,
      natura: form.natura || null,
      year: form.year ? parseInt(form.year) : null,
      description: form.description.trim() || null,
      prodotto_scuola: form.prodotto_scuola,
      formato: form.formato,
      duration: form.duration || '0:00',
      codice: form.codice.trim() || null,
      views: 0,
      data_inserimento: new Date().toISOString().split('T')[0],
    });
    if (error) setSaveMsg({ type: 'error', text: error.code === '23505' ? `Il Codice ID "${form.codice.trim()}" esiste già nell'archivio.` : error.message });
    else {
      setSaveMsg({ type: 'success', text: 'Video aggiunto all\'archivio.' });
      setForm({ title: '', youtube_url: '', tema: '', natura: '', year: new Date().getFullYear(), description: '', prodotto_scuola: false, formato: 'orizzontale', duration: '', codice: '' });
      onVideoApproved?.();
    }
    setSaving(false);
  };

  const handleSaveForLater = async () => {
    if (!form.title.trim()) { setSaveMsg({ type: 'error', text: 'Titolo obbligatorio per salvare la bozza.' }); return; }
    setSaving(true);
    setSaveMsg(null);
    const { error } = await supabase.from('video_submissions').insert({
      user_id: userProfile.id,
      title: form.title.trim(),
      youtube_url: form.youtube_url.trim() || null,
      tema: form.tema || null,
      natura: form.natura || null,
      year: form.year ? parseInt(form.year) : null,
      description: form.description.trim() || null,
      prodotto_scuola: form.prodotto_scuola,
      codice: form.codice.trim() || null,
      status: 'admin_draft',
      submitted_at: new Date().toISOString(),
    });
    if (error) {
      setSaveMsg({ type: 'error', text: error.message });
      setSaving(false);
    } else {
      setForm({ title: '', youtube_url: '', tema: '', natura: '', year: new Date().getFullYear(), description: '', prodotto_scuola: false, formato: 'orizzontale', duration: '', codice: '' });
      setActiveTab('pending');
      loadPending();
      setSaving(false);
    }
  };

  if (userProfile?.role !== 'admin') {
    return (
      <div className="max-w-xl mx-auto py-24 text-center">
        <ShieldCheck size={64} className="text-zinc-700 mx-auto mb-6" strokeWidth={1.5} />
        <h2 className="text-2xl font-bold text-white mb-3">Accesso riservato</h2>
        <p className="text-zinc-400">Questa sezione è riservata agli amministratori ADAM.</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <ShieldCheck size={28} className="text-[#FFDA2A]" />
        <div>
          <h2 className="text-3xl font-bold text-white">Pannello Admin</h2>
          <p className="text-zinc-400 text-sm">Inserimento diretto e gestione segnalazioni</p>
        </div>
      </div>

      {/* Tab navigation */}
      <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded-xl p-1">
        {[
          { id: 'add', label: 'Aggiungi', icon: Plus },
          { id: 'pending', label: 'In attesa', count: submissions.length, showCount: !loadingSubs },
          { id: 'rejected', label: 'Rifiutati', count: rejectedSubs.length, showCount: !loadingRejected },
          { id: 'archive', label: 'Archivio', count: allVideos.length, showCount: true },
          { id: 'users', label: 'Utenti', count: users.length, showCount: !loadingUsers, icon: User },
        ].map(tab => (
          <button key={tab.id} onClick={() => handleTabChange(tab.id)}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold transition-all"
            style={activeTab === tab.id ? { backgroundColor: '#FFDA2A', color: '#000' } : { color: '#a1a1aa' }}>
            {tab.icon && <tab.icon size={14} />}
            {tab.label}
            {tab.showCount && tab.count > 0 && (
              <span className="text-xs font-bold px-1.5 py-0.5 rounded-full"
                style={activeTab === tab.id ? { backgroundColor: '#000', color: '#FFDA2A' } : { backgroundColor: '#3f3f46', color: '#fff' }}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab: Aggiungi */}
      {activeTab === 'add' && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <form onSubmit={handleDirectSubmit} className="space-y-4">
            {saveMsg && (
              <div className={`flex items-center gap-2 px-4 py-3 rounded-lg text-sm border ${saveMsg.type === 'error' ? 'bg-red-900/30 border-red-800 text-red-400' : 'bg-green-900/30 border-green-800 text-green-400'}`}>
                {saveMsg.type === 'error' ? <AlertCircle size={16} /> : <Check size={16} />}{saveMsg.text}
              </div>
            )}
            {/* Row 1: Codice ID + Prodotto da scuola */}
            <div className="grid grid-cols-2 gap-4 items-start">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1.5">Codice ID *</label>
                <input type="text" value={form.codice} onChange={e => f('codice', e.target.value)} placeholder="es. HD245"
                  className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-4 py-3 text-sm font-mono placeholder-zinc-500 outline-none focus:border-[#FFDA2A]"
                  style={{ borderColor: form.codice.trim() && allVideos.some(v => v.id === form.codice.trim()) ? '#ef4444' : undefined }} />
                {form.codice.trim() && allVideos.some(v => v.id === form.codice.trim()) && (
                  <p className="text-xs text-red-400 mt-1 flex items-center gap-1"><AlertCircle size={11} /> ID già presente nell'archivio</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1.5">Tipo</label>
                <button type="button" onClick={() => f('prodotto_scuola', !form.prodotto_scuola)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium transition-all border-2"
                  style={{ backgroundColor: form.prodotto_scuola ? '#27272a' : 'transparent', borderColor: form.prodotto_scuola ? '#FFDA2A' : '#3f3f46', color: form.prodotto_scuola ? '#FFDA2A' : '#a1a1aa' }}>
                  <School size={16} /> Prodotto da scuola
                  {form.prodotto_scuola && <Check size={14} />}
                </button>
              </div>
            </div>
            {/* Row 2: URL YouTube */}
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">URL YouTube *</label>
              <input type="url" value={form.youtube_url} onChange={e => f('youtube_url', e.target.value)} placeholder="https://youtu.be/..." className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-4 py-3 text-sm placeholder-zinc-500 outline-none focus:border-zinc-500" />
            </div>
            {/* Row 3: Titolo */}
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">Titolo *</label>
              <input type="text" value={form.title} onChange={e => f('title', e.target.value)} required placeholder="Titolo del video" className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-4 py-3 text-sm placeholder-zinc-500 outline-none focus:border-zinc-500" />
            </div>
            {/* Row 4: Tema buttons + Natura */}
            <div className="grid gap-4" style={{ gridTemplateColumns: 'auto 1fr' }}>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1.5">Tema *</label>
                <div className="flex gap-1.5">
                  {TEMI_OPTIONS.map(t => {
                    const c = TEMA_COLORS[t];
                    const isSelected = form.tema === t;
                    return (
                      <button key={t} type="button" onClick={() => f('tema', isSelected ? '' : t)}
                        className="px-3 py-2 rounded-lg text-xs font-semibold transition-all border-2"
                        style={isSelected
                          ? { backgroundColor: c.solid, borderColor: c.solid, color: '#fff' }
                          : { backgroundColor: 'transparent', borderColor: c.border, color: '#fff', opacity: 0.6 }}>
                        {t}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1.5">Natura *</label>
                <CustomSelect value={form.natura || ''} onChange={v => f('natura', v)} accentColor="#FFDA2A"
                  options={[{ value: '', label: 'Non specificato' }, ...NATURE_OPTIONS.map(n => ({ value: n, label: n }))]} />
              </div>
            </div>
            {/* Row 5: Anno + Durata + Formato */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1.5">Anno *</label>
                <input type="number" value={form.year} onChange={e => f('year', e.target.value)} min="1990" max={new Date().getFullYear()} className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-4 py-3 text-sm outline-none focus:border-zinc-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1.5">Durata * (MM:SS)</label>
                <input type="text" value={form.duration} onChange={e => f('duration', e.target.value)} placeholder="es. 2:13" className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-4 py-3 text-sm placeholder-zinc-500 outline-none focus:border-zinc-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1.5">Formato</label>
                <CustomSelect value={form.formato} onChange={v => f('formato', v)} accentColor="#FFDA2A"
                  options={[{ value: 'orizzontale', label: 'Orizzontale' }, { value: 'verticale', label: 'Verticale' }]} />
              </div>
            </div>
            {/* Row 6: Descrizione */}
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">Descrizione *</label>
              <textarea value={form.description} onChange={e => f('description', e.target.value)} rows={5} placeholder="Descrizione del video..." className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-4 py-3 text-sm placeholder-zinc-500 outline-none focus:border-zinc-500 resize-none" />
            </div>
            {/* Row 7: Action buttons */}
            {(() => {
              const codicieDuplicato = form.codice.trim() && allVideos.some(v => v.id === form.codice.trim());
              return (
                <div className="flex gap-3 pt-1">
                  <button type="submit" disabled={saving || !!codicieDuplicato} className="btn-aggiungi-adam flex-1 flex items-center justify-center py-3 rounded-lg font-semibold">
                    <span>{saving ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />} Aggiungi ad ADAM</span>
                  </button>
                  <button type="button" disabled={saving || !!codicieDuplicato} onClick={handleSaveForLater}
                    className="flex items-center justify-center gap-2 px-5 py-3 rounded-lg text-sm font-semibold border-2 border-zinc-600 text-zinc-300 hover:border-zinc-400 hover:text-white transition-all disabled:opacity-50">
                    <BookOpen size={16} /> Salva per dopo
                  </button>
                </div>
              );
            })()}
          </form>
        </div>
      )}

      {/* Tab: In attesa */}
      {activeTab === 'pending' && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <h3 className="text-xl font-bold text-white mb-5 flex items-center gap-2">
            <BookOpen size={20} className="text-[#FFDA2A]" />
            Segnalazioni in attesa
          </h3>
          {loadingSubs ? (
            <div className="flex items-center justify-center py-10"><Loader2 size={24} className="animate-spin text-zinc-500" /></div>
          ) : submissions.length === 0 ? (
            <p className="text-zinc-500 text-sm py-4">Nessuna segnalazione in attesa.</p>
          ) : (
            <div className="space-y-3">
              {submissions.map(sub => {
                const isExpanded = expandedId === sub.id;
                const subForm = editForms[sub.id] || {};
                const isRejectConfirm = rejectConfirmId === sub.id;
                return (
                  <div key={sub.id} className="bg-zinc-800 rounded-xl overflow-hidden border border-zinc-700">
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex-1 min-w-0">
                          {/* Riga 1: Codice ID + Prodotto scuola + Bozza Admin */}
                          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                            {(subForm.codice ?? sub.codice) && (
                              <span className="text-xs font-mono font-bold text-[#FFDA2A]">{subForm.codice ?? sub.codice}</span>
                            )}
                            {(sub.prodotto_scuola ?? subForm.prodotto_scuola) && (
                              <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-zinc-700 text-zinc-300"><School size={9} /> Scuola</span>
                            )}
                            {sub.status === 'admin_draft' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border"
                                style={{ backgroundColor: 'rgba(255,218,42,0.12)', borderColor: 'rgba(255,218,42,0.4)', color: '#FFDA2A' }}>
                                <Pencil size={9} /> Bozza Admin
                              </span>
                            )}
                          </div>
                          {/* Riga 2: Titolo */}
                          <p className="text-white font-semibold text-sm mb-1">{subForm.title ?? sub.title}</p>
                          {/* Riga 3: Tema + Natura + Anno */}
                          <div className="flex flex-wrap gap-2 text-xs">
                            {(subForm.tema ?? sub.tema) && (() => { const c = TEMA_COLORS[subForm.tema ?? sub.tema]; return (
                              <span className="px-2 py-0.5 rounded font-semibold" style={{ backgroundColor: c?.solid || '#52525b', color: '#fff' }}>{subForm.tema ?? sub.tema}</span>
                            ); })()}
                            {(subForm.natura ?? sub.natura) && <span className="px-2 py-0.5 rounded font-medium bg-blue-600/20 border border-blue-600/30 text-white">{subForm.natura ?? sub.natura}</span>}
                            {(subForm.year ?? sub.year) && <span className="text-zinc-400">{subForm.year ?? sub.year}</span>}
                          </div>
                          {sub.youtube_url && (
                            <a href={sub.youtube_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:underline mt-1.5 block truncate">{sub.youtube_url}</a>
                          )}
                        </div>
                        <span className="text-xs text-zinc-500 flex-shrink-0">{new Date(sub.submitted_at).toLocaleDateString('it-IT')}</span>
                      </div>
                      {/* Action buttons */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {isRejectConfirm ? (
                          <>
                            <span className="text-xs text-zinc-400">Confermi il rifiuto?</span>
                            <button onClick={() => handleReject(sub)} disabled={actionLoading === sub.id + '_reject'}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-600 hover:bg-red-500 text-white transition-all disabled:opacity-50">
                              {actionLoading === sub.id + '_reject' ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} Sì
                            </button>
                            <button onClick={() => setRejectConfirmId(null)}
                              className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-zinc-600 text-zinc-300 hover:text-white hover:border-zinc-400 transition-all">
                              No
                            </button>
                          </>
                        ) : (
                          <>
                            {(() => {
                              const codiceVal = (subForm.codice ?? sub.codice ?? '').trim();
                              const hasCodice = codiceVal.length > 0;
                              const codiceEsiste = hasCodice && allVideos.some(v => v.id === codiceVal);
                              return (
                                <>
                                  <button onClick={() => handleApprove(sub)}
                                    disabled={actionLoading === sub.id + '_approve' || !hasCodice || codiceEsiste}
                                    title={!hasCodice ? 'Imposta il Codice ID prima di approvare' : codiceEsiste ? 'Codice ID già presente nell\'archivio' : ''}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-[#FFDA2A] text-white hover:bg-[#FFDA2A]/10 transition-all disabled:opacity-40 disabled:cursor-not-allowed">
                                    {actionLoading === sub.id + '_approve' ? <Loader2 size={12} className="animate-spin text-[#FFDA2A]" /> : <Check size={12} className="text-[#FFDA2A]" />}
                                    Approva{!hasCodice && <span className="text-[10px] text-zinc-500 ml-0.5">(codice mancante)</span>}
                                    {codiceEsiste && <span className="text-[10px] text-red-400 ml-0.5">(ID duplicato)</span>}
                                  </button>
                                </>
                              );
                            })()}
                            <button onClick={() => { setExpandedId(isExpanded ? null : sub.id); if (!editForms[sub.id]) setEditForms(prev => ({ ...prev, [sub.id]: {} })); }}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-[#FFDA2A] text-white hover:bg-[#FFDA2A]/10 transition-all"
                              style={{ backgroundColor: isExpanded ? 'rgba(255,218,42,0.1)' : 'transparent' }}>
                              <Pencil size={12} className="text-[#FFDA2A]" /> Modifica
                            </button>
                            <button onClick={() => setRejectConfirmId(sub.id)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-zinc-600 text-zinc-400 hover:border-red-600 hover:text-red-400 transition-all">
                              <X size={12} /> Rifiuta
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                    {/* Edit form */}
                    {isExpanded && (
                      <div className="border-t border-zinc-700 bg-zinc-900 p-4 space-y-3">
                        {/* Riga 1: Codice ID + Prodotto scuola */}
                        <div className="grid grid-cols-2 gap-3 items-start">
                          <div>
                            <label className="block text-xs font-medium text-zinc-400 mb-1">Codice ID <span className="text-red-400">*</span></label>
                            {(() => {
                              const codiceVal = (subForm.codice ?? sub.codice ?? '').trim();
                              const codiceExists = codiceVal && allVideos.some(v => v.id === codiceVal);
                              return (
                                <>
                                  <input type="text" value={subForm.codice ?? sub.codice ?? ''} onChange={e => ef(sub.id, 'codice', e.target.value)}
                                    placeholder="es. HD245"
                                    className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm font-mono placeholder-zinc-500 outline-none focus:border-[#FFDA2A]"
                                    style={{ borderColor: codiceExists ? '#ef4444' : codiceVal ? '#3f3f46' : '#7f1d1d' }} />
                                  {codiceExists && (
                                    <p className="text-xs text-red-400 mt-1 flex items-center gap-1"><AlertCircle size={11} /> ID già presente nell'archivio</p>
                                  )}
                                </>
                              );
                            })()}
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-zinc-400 mb-1">Tipo</label>
                            <button type="button" onClick={() => ef(sub.id, 'prodotto_scuola', !(subForm.prodotto_scuola ?? sub.prodotto_scuola))}
                              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all border-2"
                              style={{ borderColor: (subForm.prodotto_scuola ?? sub.prodotto_scuola) ? '#FFDA2A' : '#3f3f46', color: (subForm.prodotto_scuola ?? sub.prodotto_scuola) ? '#FFDA2A' : '#a1a1aa' }}>
                              <School size={13} /> Prodotto da scuola {(subForm.prodotto_scuola ?? sub.prodotto_scuola) && <Check size={11} />}
                            </button>
                          </div>
                        </div>
                        {/* Riga 2: URL YouTube */}
                        <div>
                          <label className="block text-xs font-medium text-zinc-400 mb-1">Link YouTube</label>
                          <input type="url" value={subForm.youtube_url ?? sub.youtube_url ?? ''} onChange={e => ef(sub.id, 'youtube_url', e.target.value)}
                            placeholder="https://youtu.be/..." className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm placeholder-zinc-500 outline-none focus:border-zinc-500" />
                        </div>
                        {/* Riga 3: Titolo */}
                        <div>
                          <label className="block text-xs font-medium text-zinc-400 mb-1">Titolo</label>
                          <input type="text" value={subForm.title ?? sub.title} onChange={e => ef(sub.id, 'title', e.target.value)}
                            className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-zinc-500" />
                        </div>
                        {/* Riga 4: Tema + Natura */}
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-zinc-400 mb-1">Tema</label>
                            <CustomSelect value={subForm.tema ?? sub.tema ?? ''} onChange={v => ef(sub.id, 'tema', v)} accentColor="#FFDA2A"
                              options={[{ value: '', label: 'Non specificato' }, ...TEMI_OPTIONS.map(t => ({ value: t, label: t }))]} />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-zinc-400 mb-1">Natura</label>
                            <CustomSelect value={subForm.natura ?? sub.natura ?? ''} onChange={v => ef(sub.id, 'natura', v)} accentColor="#FFDA2A"
                              options={[{ value: '', label: 'Non specificato' }, ...NATURE_OPTIONS.map(n => ({ value: n, label: n }))]} />
                          </div>
                        </div>
                        {/* Riga 5: Anno + Durata + Formato */}
                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-zinc-400 mb-1">Anno</label>
                            <input type="number" value={subForm.year ?? sub.year ?? ''} onChange={e => ef(sub.id, 'year', e.target.value)}
                              min="1990" max={new Date().getFullYear()} className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-zinc-500" />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-zinc-400 mb-1">Durata (MM:SS)</label>
                            <input type="text" value={subForm.duration ?? sub.duration ?? ''} onChange={e => ef(sub.id, 'duration', e.target.value)}
                              placeholder="es. 2:13" className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm placeholder-zinc-500 outline-none focus:border-zinc-500" />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-zinc-400 mb-1">Formato</label>
                            <CustomSelect value={subForm.formato ?? sub.formato ?? 'orizzontale'} onChange={v => ef(sub.id, 'formato', v)} accentColor="#FFDA2A"
                              options={[{ value: 'orizzontale', label: 'Orizzontale' }, { value: 'verticale', label: 'Verticale' }]} />
                          </div>
                        </div>
                        {/* Riga 6: Descrizione */}
                        <div>
                          <label className="block text-xs font-medium text-zinc-400 mb-1">Descrizione</label>
                          <textarea value={subForm.description ?? sub.description ?? ''} onChange={e => ef(sub.id, 'description', e.target.value)}
                            rows={5} className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-zinc-500 resize-none" />
                        </div>
                        {approveError?.startsWith(sub.id + ':') && (
                          <div className="text-xs text-red-400 bg-red-900/20 border border-red-800/40 rounded-lg px-3 py-2">
                            {approveError.slice(sub.id.length + 1)}
                          </div>
                        )}
                        {/* Bottoni */}
                        <div className="flex gap-2 justify-end pt-1">
                          <button onClick={() => { setExpandedId(null); setEditForms(prev => { const n = { ...prev }; delete n[sub.id]; return n; }); }}
                            className="px-4 py-2 rounded-lg text-xs font-medium text-zinc-400 hover:text-white border border-zinc-700 hover:border-zinc-500 transition-all">
                            Annulla
                          </button>
                          <button onClick={() => handleEditSave(sub)} disabled={actionLoading === sub.id + '_edit'}
                            className="flex items-center gap-1.5 px-5 py-2 rounded-lg text-xs font-semibold text-black disabled:opacity-50 transition-all"
                            style={{ backgroundColor: '#FFDA2A' }}>
                            {actionLoading === sub.id + '_edit' ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} Salva
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab: Rifiutati */}
      {activeTab === 'rejected' && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <X size={20} className="text-red-400" />
              Segnalazioni rifiutate
            </h3>
            {selectedRejected.size > 0 && (
              deleteRejectedConfirm ? (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-zinc-400">Eliminare definitivamente {selectedRejected.size} elementi?</span>
                  <button onClick={handleDeleteRejected} disabled={deletingRejected}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-600 hover:bg-red-500 text-white transition-all disabled:opacity-50">
                    {deletingRejected ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />} Sì, elimina
                  </button>
                  <button onClick={() => setDeleteRejectedConfirm(false)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-zinc-600 text-zinc-300 hover:text-white transition-all">
                    Annulla
                  </button>
                </div>
              ) : (
                <button onClick={() => setDeleteRejectedConfirm(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-red-600/50 text-red-400 hover:bg-red-600/10 transition-all">
                  <Trash2 size={12} /> Elimina selezionati ({selectedRejected.size})
                </button>
              )
            )}
          </div>
          {loadingRejected ? (
            <div className="flex items-center justify-center py-10"><Loader2 size={24} className="animate-spin text-zinc-500" /></div>
          ) : rejectedSubs.length === 0 ? (
            <p className="text-zinc-500 text-sm py-4">Nessuna segnalazione rifiutata.</p>
          ) : (
            <>
              <div className="flex items-center gap-3 mb-3 pb-3 border-b border-zinc-800">
                <input type="checkbox"
                  checked={selectedRejected.size === rejectedSubs.length && rejectedSubs.length > 0}
                  onChange={e => setSelectedRejected(e.target.checked ? new Set(rejectedSubs.map(s => s.id)) : new Set())}
                  className="w-4 h-4 accent-[#FFDA2A]" />
                <span className="text-xs text-zinc-400">Seleziona tutti</span>
              </div>
              <div className="space-y-2">
                {rejectedSubs.map(sub => (
                  <div key={sub.id} className="flex items-center gap-3 py-2.5 px-3 bg-zinc-800 rounded-lg border border-zinc-700">
                    <input type="checkbox"
                      checked={selectedRejected.has(sub.id)}
                      onChange={e => {
                        const next = new Set(selectedRejected);
                        e.target.checked ? next.add(sub.id) : next.delete(sub.id);
                        setSelectedRejected(next);
                      }}
                      className="w-4 h-4 accent-[#FFDA2A] flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">{sub.title}</p>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {sub.tema && (() => { const c = TEMA_COLORS[sub.tema]; return (
                          <span className="text-xs px-1.5 py-0.5 rounded font-semibold" style={{ backgroundColor: c?.solid || '#52525b', color: '#fff' }}>{sub.tema}</span>
                        ); })()}
                        {sub.natura && <span className="text-xs px-1.5 py-0.5 rounded bg-blue-600/20 border border-blue-600/30 text-white">{sub.natura}</span>}
                      </div>
                    </div>
                    <span className="text-xs text-zinc-500 flex-shrink-0">{new Date(sub.submitted_at).toLocaleDateString('it-IT')}</span>
                    <button onClick={() => handleRestoreRejected(sub)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-zinc-600 text-zinc-300 hover:border-[#FFDA2A] hover:text-[#FFDA2A] transition-all flex-shrink-0">
                      <RotateCcw size={12} /> Ripristina
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Tab: Archivio */}
      {activeTab === 'archive' && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <h3 className="text-xl font-bold text-white mb-5 flex items-center gap-2">
            <Archive size={20} className="text-[#FFDA2A]" />
            Archivio video
            {archiveLoaded && <span className="text-sm font-normal text-zinc-400">({filteredArchive.length} / {archiveVideos.length})</span>}
          </h3>
          {/* Filters */}
          <div className="flex gap-2 mb-3 flex-wrap items-center">
            {['', ...TEMI_OPTIONS].map(t => {
              const active = archiveTema === t;
              const c = TEMA_COLORS[t];
              const style = t === ''
                ? active
                  ? { backgroundColor: '#52525b', borderColor: '#52525b', color: '#fff' }
                  : { backgroundColor: 'transparent', borderColor: '#3f3f46', color: '#71717a' }
                : active
                  ? { backgroundColor: c?.solid, borderColor: c?.solid, color: '#fff' }
                  : { backgroundColor: 'transparent', borderColor: c?.border, color: '#fff' };
              return (
                <button key={t || 'tutti'} onClick={() => setArchiveTema(t)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all"
                  style={style}>
                  {t || 'Tutti'}
                </button>
              );
            })}
            <button onClick={() => setArchiveScuola(v => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all"
              style={archiveScuola
                ? { backgroundColor: '#FFDA2A', borderColor: '#FFDA2A', color: '#000' }
                : { backgroundColor: 'transparent', borderColor: '#3f3f46', color: '#a1a1aa' }}>
              <School size={12} /> Prodotto dalle scuole
            </button>
          </div>
          <div className="flex gap-3 mb-4 flex-wrap">
            <input type="text" value={archiveSearch} onChange={e => setArchiveSearch(e.target.value)}
              placeholder="Cerca per titolo o descrizione..."
              className="flex-1 min-w-48 bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2.5 text-sm placeholder-zinc-500 outline-none focus:border-zinc-500" />
            <div className="w-44">
              <CustomSelect value={archiveNatura} onChange={setArchiveNatura} accentColor="#FFDA2A"
                options={[{ value: '', label: 'Tutte le nature' }, ...NATURE_OPTIONS.map(n => ({ value: n, label: n }))]} />
            </div>
          </div>
          {archiveLoading ? (
            <div className="flex items-center justify-center py-10"><Loader2 size={24} className="animate-spin text-zinc-500" /></div>
          ) : filteredArchive.length === 0 ? (
            <p className="text-zinc-500 text-sm py-4">{archiveVideos.length === 0 ? 'Nessun video nell\'archivio.' : 'Nessun risultato per i filtri selezionati.'}</p>
          ) : (
            <>
              {/* Barra selezione multipla */}
              <div className="flex items-center gap-3 mb-3 pb-3 border-b border-zinc-800">
                {(() => {
                  const allChecked = selectedArchive.size === filteredArchive.length && filteredArchive.length > 0;
                  return (
                    <label className="flex-shrink-0 cursor-pointer">
                      <input type="checkbox" className="sr-only"
                        checked={allChecked}
                        onChange={e => setSelectedArchive(e.target.checked ? new Set(filteredArchive.map(v => v.id)) : new Set())} />
                      <div className="w-4 h-4 rounded border-2 flex items-center justify-center transition-all"
                        style={allChecked ? { backgroundColor: '#FFDA2A', borderColor: '#FFDA2A' } : { backgroundColor: 'transparent', borderColor: '#52525b' }}>
                        {allChecked && <Check size={10} className="text-black" strokeWidth={3} />}
                      </div>
                    </label>
                  );
                })()}
                <span className="text-xs text-zinc-400 flex-1">
                  {selectedArchive.size > 0 ? `${selectedArchive.size} selezionati` : 'Seleziona tutti'}
                </span>
                <button onClick={() => setArchiveSortDesc(v => !v)}
                  title={archiveSortDesc ? 'Più vecchi prima' : 'Più recenti prima'}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs border border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-white transition-all">
                  <ArrowUpDown size={12} />
                  {archiveSortDesc ? 'Recenti' : 'Vecchi'}
                </button>
                {selectedArchive.size > 0 && (
                  deleteArchiveConfirm ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-zinc-400">Eliminare definitivamente {selectedArchive.size} video?</span>
                      <button onClick={handleDeleteSelected} disabled={deletingArchive}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-600 hover:bg-red-500 text-white transition-all disabled:opacity-50">
                        {deletingArchive ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />} Sì, elimina
                      </button>
                      <button onClick={() => setDeleteArchiveConfirm(false)}
                        className="px-3 py-1.5 rounded-lg text-xs border border-zinc-600 text-zinc-300 hover:text-white transition-all">
                        Annulla
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => setDeleteArchiveConfirm(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-red-600/50 text-red-400 hover:bg-red-600/10 transition-all">
                      <Trash2 size={12} /> Elimina selezionati ({selectedArchive.size})
                    </button>
                  )
                )}
              </div>
              <div className="space-y-2">
              {filteredArchive.map(video => {
                const isEditing = editingVideoId === video.id;
                const vf = editVideoForms[video.id] || {};
                const isDeleteConfirm = deleteConfirmId === video.id;
                const isSelected = selectedArchive.has(video.id);
                return (
                  <div key={video.id} className="bg-zinc-800 rounded-xl overflow-hidden border border-zinc-700"
                    style={isSelected ? { borderColor: '#FFDA2A33' } : {}}>
                    {/* Row */}
                    <div className="flex items-stretch gap-3 p-3">
                      <label className="flex-shrink-0 self-center cursor-pointer">
                        <input type="checkbox" className="sr-only" checked={isSelected}
                          onChange={e => {
                            const next = new Set(selectedArchive);
                            e.target.checked ? next.add(video.id) : next.delete(video.id);
                            setSelectedArchive(next);
                            setDeleteArchiveConfirm(false);
                          }} />
                        <div className="w-4 h-4 rounded border-2 flex items-center justify-center transition-all"
                          style={isSelected ? { backgroundColor: '#FFDA2A', borderColor: '#FFDA2A' } : { backgroundColor: 'transparent', borderColor: '#52525b' }}>
                          {isSelected && <Check size={10} className="text-black" strokeWidth={3} />}
                        </div>
                      </label>
                      {(() => {
                        const ytId = extractYouTubeId(video.youtube_url);
                        if (!ytId) return (
                          <div className="w-[90px] h-[67px] rounded flex-shrink-0 bg-zinc-700 flex items-center justify-center">
                            <Video size={16} className="text-zinc-500" />
                          </div>
                        );
                        return (
                          <img
                            src={`https://img.youtube.com/vi/${ytId}/hqdefault.jpg`}
                            alt=""
                            className="w-[90px] object-cover rounded flex-shrink-0 bg-zinc-700"
                            onError={e => {
                              if (e.target.src.includes('hqdefault')) e.target.src = `https://img.youtube.com/vi/${ytId}/mqdefault.jpg`;
                              else if (e.target.src.includes('mqdefault')) e.target.src = `https://img.youtube.com/vi/${ytId}/default.jpg`;
                              else { e.target.style.display = 'none'; }
                            }}
                          />
                        );
                      })()}
                      <div className="flex-1 min-w-0 flex flex-col justify-between gap-1 py-0.5">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            {video.codice && (
                              <span className="text-xs font-mono font-bold text-[#FFDA2A] flex-shrink-0">{video.codice}</span>
                            )}
                            <p className="text-white text-sm font-medium truncate">{video.title}</p>
                          </div>
                          <div className="flex flex-wrap gap-1.5 items-center">
                            {video.tema && (() => { const c = TEMA_COLORS[video.tema]; return (
                              <span className="text-xs px-1.5 py-0.5 rounded font-semibold"
                                style={{ backgroundColor: c?.solid || '#52525b', color: '#fff' }}>{video.tema}</span>
                            ); })()}
                            {video.natura && <span className="text-xs px-1.5 py-0.5 rounded bg-blue-600/20 border border-blue-600/30 text-white">{video.natura}</span>}
                            {video.prodotto_scuola && (
                              <span className="text-xs px-1.5 py-0.5 rounded bg-zinc-700 text-zinc-300 flex items-center gap-1">
                                <School size={10} /> Scuola
                              </span>
                            )}
                            {video.year && <span className="text-xs text-zinc-400">{video.year}</span>}
                            {video.data_inserimento && <span className="text-xs text-zinc-500">{new Date(video.data_inserimento).toLocaleDateString('it-IT')}</span>}
                            <span className="text-xs text-zinc-400 flex items-center gap-0.5"><Eye size={10} />{video.views ?? 0}</span>
                          </div>
                        </div>
                        {video.youtube_url && (
                          <a href={video.youtube_url} target="_blank" rel="noopener noreferrer"
                            className="text-xs text-blue-400 hover:underline truncate block">{video.youtube_url}</a>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0 self-center">
                        {isDeleteConfirm ? (
                          <>
                            <span className="text-xs text-zinc-400">Eliminare?</span>
                            <button onClick={() => handleDeleteVideo(video)} disabled={deletingVideoId === video.id}
                              className="flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold bg-red-600 hover:bg-red-500 text-white transition-all disabled:opacity-50">
                              {deletingVideoId === video.id ? <Loader2 size={10} className="animate-spin" /> : <Check size={10} />} Sì
                            </button>
                            <button onClick={() => setDeleteConfirmId(null)}
                              className="px-2 py-1 rounded text-xs border border-zinc-600 text-zinc-300 hover:text-white transition-all">
                              No
                            </button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => {
                              setEditingVideoId(isEditing ? null : video.id);
                              if (!editVideoForms[video.id]) setEditVideoForms(prev => ({ ...prev, [video.id]: {} }));
                              setDeleteConfirmId(null);
                            }}
                              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-zinc-600 hover:border-[#FFDA2A] text-zinc-300 hover:text-[#FFDA2A] transition-all"
                              style={isEditing ? { borderColor: '#FFDA2A', color: '#FFDA2A', backgroundColor: 'rgba(255,218,42,0.05)' } : {}}>
                              <Pencil size={12} /> Modifica
                            </button>
                            <button onClick={() => { setDeleteConfirmId(video.id); setEditingVideoId(null); }}
                              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-zinc-600 hover:border-red-600 text-zinc-400 hover:text-red-400 transition-all">
                              <Trash2 size={12} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                    {/* Inline edit form */}
                    {isEditing && (
                      <div className="border-t border-zinc-700 bg-zinc-900 p-4 space-y-3">
                        {/* Row 1: Codice ID + Prodotto scuola */}
                        <div className="grid grid-cols-2 gap-3 items-start">
                          <div>
                            <label className="block text-xs font-medium text-zinc-400 mb-1">Codice ID</label>
                            <input type="text" value={vf.codice ?? video.codice ?? ''} onChange={e => evf(video.id, 'codice', e.target.value)}
                              placeholder="es. HD245" className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm font-mono placeholder-zinc-500 outline-none focus:border-[#FFDA2A]" />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-zinc-400 mb-1">Tipo</label>
                            <button type="button" onClick={() => evf(video.id, 'prodotto_scuola', !(vf.prodotto_scuola ?? video.prodotto_scuola))}
                              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all border-2"
                              style={{ borderColor: (vf.prodotto_scuola ?? video.prodotto_scuola) ? '#FFDA2A' : '#3f3f46', color: (vf.prodotto_scuola ?? video.prodotto_scuola) ? '#FFDA2A' : '#a1a1aa' }}>
                              <School size={13} /> Prodotto da scuola {(vf.prodotto_scuola ?? video.prodotto_scuola) && <Check size={11} />}
                            </button>
                          </div>
                        </div>
                        {/* Row 2: URL YouTube */}
                        <div>
                          <label className="block text-xs font-medium text-zinc-400 mb-1">URL YouTube</label>
                          <input type="url" value={vf.youtube_url ?? video.youtube_url ?? ''} onChange={e => evf(video.id, 'youtube_url', e.target.value)}
                            placeholder="https://youtu.be/..." className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm placeholder-zinc-500 outline-none focus:border-zinc-500" />
                        </div>
                        {/* Row 3: Titolo */}
                        <div>
                          <label className="block text-xs font-medium text-zinc-400 mb-1">Titolo</label>
                          <input type="text" value={vf.title ?? video.title ?? ''} onChange={e => evf(video.id, 'title', e.target.value)}
                            className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-zinc-500" />
                        </div>
                        {/* Row 4: Tema + Natura */}
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-zinc-400 mb-1">Tema</label>
                            <CustomSelect value={vf.tema ?? video.tema ?? ''} onChange={v => evf(video.id, 'tema', v)} accentColor="#FFDA2A"
                              options={[{ value: '', label: 'Non specificato' }, ...TEMI_OPTIONS.map(t => ({ value: t, label: t }))]} />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-zinc-400 mb-1">Natura</label>
                            <CustomSelect value={vf.natura ?? video.natura ?? ''} onChange={v => evf(video.id, 'natura', v)} accentColor="#FFDA2A"
                              options={[{ value: '', label: 'Non specificato' }, ...NATURE_OPTIONS.map(n => ({ value: n, label: n }))]} />
                          </div>
                        </div>
                        {/* Row 5: Anno + Durata + Formato */}
                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-zinc-400 mb-1">Anno</label>
                            <input type="number" value={vf.year ?? video.year ?? ''} onChange={e => evf(video.id, 'year', e.target.value)}
                              min="1990" max={new Date().getFullYear()} className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-zinc-500" />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-zinc-400 mb-1">Durata (MM:SS)</label>
                            <input type="text" value={vf.duration ?? video.duration ?? ''} onChange={e => evf(video.id, 'duration', e.target.value)}
                              placeholder="es. 2:13" className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm placeholder-zinc-500 outline-none focus:border-zinc-500" />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-zinc-400 mb-1">Formato</label>
                            <CustomSelect value={vf.formato ?? video.formato ?? 'orizzontale'} onChange={v => evf(video.id, 'formato', v)} accentColor="#FFDA2A"
                              options={[{ value: 'orizzontale', label: 'Orizzontale' }, { value: 'verticale', label: 'Verticale' }]} />
                          </div>
                        </div>
                        {/* Row 6: Descrizione */}
                        <div>
                          <label className="block text-xs font-medium text-zinc-400 mb-1">Descrizione</label>
                          <textarea value={vf.description ?? video.description ?? ''} onChange={e => evf(video.id, 'description', e.target.value)}
                            rows={5} className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-zinc-500 resize-none" />
                        </div>
                        {/* Row 7: Data inserimento + Visualizzazioni */}
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-zinc-400 mb-1">Data inserimento</label>
                            <input type="date" value={vf.data_inserimento ?? video.data_inserimento ?? ''} onChange={e => evf(video.id, 'data_inserimento', e.target.value)}
                              className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-zinc-500" />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-zinc-400 mb-1">Visualizzazioni</label>
                            <input type="number" min="0" value={vf.views ?? video.views ?? 0} onChange={e => evf(video.id, 'views', parseInt(e.target.value) || 0)}
                              className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-[#FFDA2A]" />
                          </div>
                        </div>
                        {/* Row 8: Buttons */}
                        <div className="flex gap-2 justify-end pt-1">
                          <button onClick={() => { setEditingVideoId(null); setEditVideoForms(prev => { const n = { ...prev }; delete n[video.id]; return n; }); }}
                            className="px-4 py-2 rounded-lg text-xs font-medium text-zinc-400 hover:text-white border border-zinc-700 hover:border-zinc-500 transition-all">
                            Annulla
                          </button>
                          <button onClick={() => handleSaveVideo(video)} disabled={savingVideoId === video.id}
                            className="flex items-center gap-1.5 px-5 py-2 rounded-lg text-xs font-semibold text-black disabled:opacity-50 transition-all"
                            style={{ backgroundColor: '#FFDA2A' }}>
                            {savingVideoId === video.id ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} Salva
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              </div>
            </>
          )}
        </div>
      )}
      {/* Tab: Utenti */}
      {activeTab === 'users' && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <h3 className="text-xl font-bold text-white mb-5 flex items-center gap-2">
            <User size={20} className="text-[#FFDA2A]" />
            Utenti registrati {usersLoaded && `(${users.length})`}
          </h3>
          {loadingUsers ? (
            <div className="flex items-center justify-center py-10"><Loader2 size={24} className="animate-spin text-zinc-500" /></div>
          ) : users.length === 0 ? (
            <p className="text-zinc-500 text-sm py-4">Nessun utente registrato.</p>
          ) : (
            <div className="space-y-3">
              {users.map(u => {
                const initials = (u.nome || u.email || '?').slice(0, 2).toUpperCase();
                const isCurrentUser = u.id === userProfile.id;
                const isDeleteConfirm = deleteUserConfirmId === u.id;
                const isEditing = editingUserId === u.id;
                const uf = editUserForms[u.id] || {};
                return (
                  <div key={u.id} className="bg-zinc-800 rounded-xl overflow-hidden border border-zinc-700">
                    {/* Riga principale */}
                    <div className="p-4 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-zinc-700 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                        {initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-semibold truncate">{u.nome || '(senza nome)'}</p>
                        <p className="text-zinc-400 text-xs truncate">{u.email || '—'}</p>
                        <p className="text-zinc-500 text-xs truncate">{u.organizzazione || '—'}</p>
                      </div>
                      <span className="text-xs px-2 py-0.5 rounded-full font-semibold flex-shrink-0"
                        style={{
                          backgroundColor: u.role === 'admin' ? 'rgba(255,218,42,0.15)' : '#27272a',
                          color: u.role === 'admin' ? '#FFDA2A' : '#a1a1aa',
                          border: u.role === 'admin' ? '1px solid rgba(255,218,42,0.3)' : '1px solid #3f3f46',
                        }}>
                        {u.role === 'admin' ? 'Admin' : 'User'}
                      </span>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button onClick={() => { setEditingUserId(isEditing ? null : u.id); setEditUserForms(prev => ({ ...prev, [u.id]: { nome: u.nome || '', email: u.email || '', organizzazione: u.organizzazione || '' } })); }}
                          className="text-zinc-400 hover:text-white transition-colors p-1.5"
                          title="Modifica">
                          <Pencil size={15} />
                        </button>
                        <button onClick={() => handleChangeRole(u)} disabled={isCurrentUser || changingRoleId === u.id}
                          className="text-xs px-3 py-1.5 rounded-lg border border-zinc-600 text-zinc-300 hover:text-white hover:border-zinc-400 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1">
                          {changingRoleId === u.id ? <Loader2 size={12} className="animate-spin" /> : null}
                          Cambia ruolo
                        </button>
                        {isDeleteConfirm ? (
                          <>
                            <button onClick={() => handleDeleteUser(u)} disabled={deletingUserId === u.id}
                              className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-semibold bg-red-600 hover:bg-red-500 text-white disabled:opacity-50">
                              {deletingUserId === u.id ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                            </button>
                            <button onClick={() => setDeleteUserConfirmId(null)}
                              className="px-2 py-1.5 rounded-lg text-xs font-semibold border border-zinc-600 text-zinc-300 hover:text-white transition-all">
                              <X size={12} />
                            </button>
                          </>
                        ) : (
                          <button onClick={() => setDeleteUserConfirmId(u.id)} disabled={isCurrentUser}
                            className="text-zinc-500 hover:text-red-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed p-1.5">
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                    {/* Form modifica inline */}
                    {isEditing && (
                      <div className="border-t border-zinc-700 p-4 space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-zinc-400 mb-1">Nome</label>
                            <input type="text" value={uf.nome ?? ''} onChange={e => uef(u.id, 'nome', e.target.value)}
                              className="w-full bg-zinc-900 border border-zinc-600 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-zinc-400" />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-zinc-400 mb-1">Email</label>
                            <input type="email" value={uf.email ?? ''} onChange={e => uef(u.id, 'email', e.target.value)}
                              className="w-full bg-zinc-900 border border-zinc-600 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-zinc-400" />
                          </div>
                          <div className="sm:col-span-2">
                            <label className="block text-xs font-medium text-zinc-400 mb-1">Organizzazione</label>
                            <input type="text" value={uf.organizzazione ?? ''} onChange={e => uef(u.id, 'organizzazione', e.target.value)}
                              className="w-full bg-zinc-900 border border-zinc-600 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-zinc-400" />
                          </div>
                        </div>
                        <div className="flex gap-2 justify-end">
                          <button onClick={() => setEditingUserId(null)}
                            className="px-3 py-2 rounded-lg text-xs font-medium text-zinc-400 hover:text-white border border-zinc-700 hover:border-zinc-500 transition-all">
                            Annulla
                          </button>
                          <button onClick={() => handleSaveUser(u)} disabled={savingUserId === u.id}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-black disabled:opacity-50"
                            style={{ backgroundColor: '#FFDA2A' }}>
                            {savingUserId === u.id ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} Salva
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ─── App ───────────────────────────────────────────────────────────────────────
function App() {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSection, setActiveSection] = useState('home');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [selectedTemaTag, setSelectedTemaTag] = useState(null);
  const [tagWidth, setTagWidth] = useState(0);
  const [naturaTagWidth, setNaturaTagWidth] = useState(0);
  const headerSearchRef = useRef(null);
  const userMenuRef = useRef(null);
  const filtersSectionRef = useRef(null);
  const [filtersInView, setFiltersInView] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);
  const [selectedNatura, setSelectedNatura] = useState('Tutte');
  const [schoolsSort, setSchoolsSort] = useState('date'); // 'date' | 'views'
  const [filters, setFilters] = useState({
    tema: 'Tutti',
    natura: 'Tutti',
    year: 'Tutti',
    scuola: 'Tutti',
    durationMin: SNAP_POINTS[0],
    durationMax: SNAP_POINTS[SNAP_POINTS.length - 1],
  });
  const [localPlaylist, setLocalPlaylist] = useState([]);
  const [playingLocalPlaylist, setPlayingLocalPlaylist] = useState(false);
  const [playlists, setPlaylists] = useState([]);
  const [activePlaylistId, setActivePlaylistId] = useState(null);
  const [pickPlaylistFor, setPickPlaylistFor] = useState(null);
  const [playingPlaylistId, setPlayingPlaylistId] = useState(null);
  const [showPlaylist, setShowPlaylist] = useState(false);
  const [currentPlaylistIndex, setCurrentPlaylistIndex] = useState(0);
  const [dbVideos, setDbVideos] = useState([]);

  // ─── IntersectionObserver: mostra header search quando FiltersSection esce dal viewport ──
  useEffect(() => {
    if (activeSection !== 'home') { setFiltersInView(true); return; }
    const el = filtersSectionRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => setFiltersInView(entry.isIntersecting),
      { threshold: 0.5 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [activeSection]);

  // ─── Carica tutti i video da Supabase ─────────────────────────────────────────
  const loadVideos = async () => {
    const { data } = await supabase.from('videos').select('*');
    if (data?.length) setDbVideos(data.map(mapDbVideo));
  };

  useEffect(() => { loadVideos(); }, []);

  // Sync selectedTemaTag con filters.tema (es. click bottoni FiltersSection in home)
  useEffect(() => {
    const TEMA_TAG_COLORS = { Alcool: '#D97706', Azzardo: '#BE123C', Digitale: '#3b82f6', Sostanze: '#10b981' };
    if (filters.tema !== 'Tutti') {
      setSelectedTemaTag({ label: filters.tema, color: TEMA_TAG_COLORS[filters.tema] });
    } else {
      setSelectedTemaTag(null);
      setTagWidth(0);
    }
  }, [filters.tema]);

  // ─── Apre il modal e incrementa le visualizzazioni ────────────────────────────
  const handleVideoClick = (video) => {
    setSelectedVideo(video);
    const newViews = (video.views || 0) + 1;
    // Aggiornamento ottimistico locale
    setDbVideos(prev => prev.map(v => v.id === video.id ? { ...v, views: newViews } : v));
    // Persist su Supabase (fire and forget)
    supabase.from('videos').update({ views: newViews }).eq('id', video.id);
  };

  const allVideos = useMemo(() => dbVideos.length > 0 ? dbVideos : mockVideos, [dbVideos]);

  // ─── Auth Supabase ────────────────────────────────────────────────────────────
  const loadProfile = async (userId, userEmail) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
    if (data && !data.email && userEmail) {
      supabase.from('profiles').update({ email: userEmail }).eq('id', userId);
      data.email = userEmail;
    }
    setUserProfile(data || null);
  };

  const loadPlaylists = async (userId) => {
    const { data } = await supabase.from('playlists').select('*').eq('user_id', userId).order('created_at');
    setPlaylists(data || []);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) { loadProfile(session.user.id, session.user.email); loadPlaylists(session.user.id); }
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) { loadProfile(session.user.id, session.user.email); loadPlaylists(session.user.id); }
      else { setUserProfile(null); setPlaylists([]); }
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setShowUserMenu(false);
    setActiveSection('home');
  };
  // ─── Fine Auth ────────────────────────────────────────────────────────────────

  // Scroll ai risultati — posizione calcolata dinamicamente sotto header + FiltersSection sticky

  // Carica/salva playlist locale (anonimi) in localStorage
  useEffect(() => {
    try { const s = localStorage.getItem('adam-local-playlist'); if (s) setLocalPlaylist(JSON.parse(s)); } catch {}
  }, []);
  useEffect(() => {
    localStorage.setItem('adam-local-playlist', JSON.stringify(localPlaylist));
  }, [localPlaylist]);

  // ─── Supabase playlist functions ─────────────────────────────────────────────
  const createPlaylist = async (name) => {
    const { data, error } = await supabase.from('playlists')
      .insert({ user_id: user.id, name, video_ids: [] }).select().single();
    if (error) { console.error('❌ createPlaylist:', error.message); return null; }
    if (data) setPlaylists(prev => [...prev, data]);
    return data;
  };

  const addVideoToPlaylist = async (playlistId, videoId) => {
    const pl = playlists.find(p => p.id === playlistId);
    if (!pl || pl.video_ids.includes(videoId)) return;
    const newIds = [...pl.video_ids, videoId];
    const { error } = await supabase.from('playlists').update({ video_ids: newIds, updated_at: new Date() }).eq('id', playlistId);
    if (error) { console.error('❌ addVideoToPlaylist:', error.message); return; }
    setPlaylists(prev => prev.map(p => p.id === playlistId ? { ...p, video_ids: newIds } : p));
  };

  const removeVideoFromPlaylist = async (playlistId, videoId) => {
    const pl = playlists.find(p => p.id === playlistId);
    if (!pl) return;
    const newIds = pl.video_ids.filter(id => id !== videoId);
    await supabase.from('playlists').update({ video_ids: newIds, updated_at: new Date() }).eq('id', playlistId);
    setPlaylists(prev => prev.map(p => p.id === playlistId ? { ...p, video_ids: newIds } : p));
  };

  const reorderPlaylist = async (playlistId, newVideoIds) => {
    await supabase.from('playlists').update({ video_ids: newVideoIds, updated_at: new Date() }).eq('id', playlistId);
    setPlaylists(prev => prev.map(p => p.id === playlistId ? { ...p, video_ids: newVideoIds } : p));
  };

  const renamePlaylist = async (playlistId, newName) => {
    await supabase.from('playlists').update({ name: newName, updated_at: new Date() }).eq('id', playlistId);
    setPlaylists(prev => prev.map(p => p.id === playlistId ? { ...p, name: newName } : p));
  };

  const deletePlaylist = async (playlistId) => {
    await supabase.from('playlists').delete().eq('id', playlistId);
    setPlaylists(prev => prev.filter(p => p.id !== playlistId));
    if (activePlaylistId === playlistId) setActivePlaylistId(null);
    if (playingPlaylistId === playlistId) setPlayingPlaylistId(null);
  };

  const getVideosForPlaylist = (pl) =>
    (pl?.video_ids || []).map(id => allVideos.find(v => v.id === id)).filter(Boolean);

  const isInPlaylist = (videoId) => {
    if (user) return playlists.some(p => p.video_ids.includes(videoId));
    return localPlaylist.some(v => v.id === videoId);
  };

  const handleAddToPlaylist = (video) => {
    if (!user) {
      // Anonimo: aggiunge alla playlist locale
      if (!localPlaylist.find(v => v.id === video.id)) {
        setLocalPlaylist(prev => [...prev, video]);
      }
      return;
    }
    // Loggato: Supabase
    if (playlists.length === 0) {
      createPlaylist('La mia playlist').then(pl => { if (pl) addVideoToPlaylist(pl.id, video.id); });
    } else if (playlists.length === 1) {
      addVideoToPlaylist(playlists[0].id, video.id);
    } else {
      setPickPlaylistFor(video);
    }
  };
  // ─── Fine playlist functions ───────────────────────────────────────────────

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [activeSection]);


  const filteredVideos = useMemo(() => {
    let filtered = allVideos;
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
    if (filters.natura !== 'Tutti') { const naturaVal = filters.natura === 'Sequenza' ? 'Sequenze' : filters.natura; filtered = filtered.filter(v => v.natura === naturaVal); }
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
  }, [allVideos, searchQuery, activeSection, selectedNatura, filters, schoolsSort]);

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
      <li className="pt-2 mt-2 border-t border-zinc-800">
        {user && (
          <button
            onClick={() => { setActiveSection('myvideos'); setIsMobileMenuOpen(false); }}
            className={`w-full text-left px-4 py-3 rounded-lg transition-colors flex items-center gap-3 ${activeSection === 'myvideos' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'}`}
          >
            <List size={18} className="flex-shrink-0" />
            <span>I miei video</span>
          </button>
        )}
        <button
          onClick={() => { setActiveSection('submit'); setIsMobileMenuOpen(false); }}
          className={`w-full text-left px-4 py-3 rounded-lg transition-colors flex items-center gap-3 ${activeSection === 'submit' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'}`}
        >
          <Upload size={18} className="flex-shrink-0" />
          <span>Segnala un Video</span>
        </button>
      </li>
      {userProfile?.role === 'admin' && (
        <li>
          <button
            onClick={() => { setActiveSection('admin'); setIsMobileMenuOpen(false); }}
            className={`w-full text-left px-4 py-3 rounded-lg transition-colors flex items-center gap-3 ${activeSection === 'admin' ? 'bg-zinc-800 text-[#FFDA2A]' : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'}`}
          >
            <ShieldCheck size={18} className="flex-shrink-0" />
            <span>Admin</span>
          </button>
        </li>
      )}
    </ul>
  </nav>
</aside>
      <div className="lg:ml-64 flex-1">
        <header className="bg-black sticky top-0 z-40">
  <div className="px-4 lg:px-8 py-4 flex items-center justify-between gap-2 lg:gap-6">
    <button
      onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      className="lg:hidden text-white p-2"
    >
      <Menu size={24} />
    </button>
    {/* Search bar — invisibile in home finché FiltersSection è in vista */}
    <div
      className="flex-1 max-w-2xl hidden md:block"
      style={{ opacity: (activeSection === 'home' && filtersInView) ? 0 : 1, pointerEvents: (activeSection === 'home' && filtersInView) ? 'none' : 'auto', transition: 'opacity 0.3s' }}
    >
      <div className="relative">
        {isSearchFocused && (
          <div className="absolute top-full left-0 mt-2 bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl py-2 min-w-[160px] z-50">
            {[
              { label: 'Alcool',   color: '#D97706' },
              { label: 'Azzardo',  color: '#BE123C' },
              { label: 'Digitale', color: '#3b82f6' },
              { label: 'Sostanze', color: '#10b981' },
            ].map(({ label, color }) => (
              <button
                key={label}
                onClick={() => { setFilters(f => ({ ...f, tema: label })); setIsSearchFocused(false); setTimeout(() => headerSearchRef.current?.focus(), 50); }}
                className="w-full text-left px-4 py-2 text-white hover:bg-zinc-800 transition-colors text-sm flex items-center gap-2"
              >
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                {label}
              </button>
            ))}
          </div>
        )}
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
        {selectedTemaTag && (
          <span
            ref={el => { if (el) setTagWidth(el.offsetWidth); }}
            className="absolute left-10 top-1/2 -translate-y-1/2 flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-md z-10 whitespace-nowrap"
            style={{ backgroundColor: selectedTemaTag.color, color: '#fff' }}
          >
            {selectedTemaTag.label}
            <button
              onMouseDown={(e) => { e.preventDefault(); setSelectedTemaTag(null); setTagWidth(0); setFilters(f => ({ ...f, tema: 'Tutti' })); }}
              className="hover:opacity-70"
            ><X size={10} /></button>
          </span>
        )}
        {activeSection === 'formats' && selectedNatura !== 'Tutte' && (
          <span
            ref={el => { if (el) setNaturaTagWidth(el.offsetWidth); }}
            className="absolute top-1/2 -translate-y-1/2 flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-md z-10 whitespace-nowrap"
            style={{ left: selectedTemaTag ? `${tagWidth + 52}px` : '40px', backgroundColor: '#3f3f46', color: '#fff' }}
          >
            {selectedNatura}
            <button
              onMouseDown={(e) => { e.preventDefault(); setSelectedNatura('Tutte'); setNaturaTagWidth(0); }}
              className="hover:opacity-70"
            ><X size={10} /></button>
          </span>
        )}
        {(searchQuery || selectedTemaTag || (activeSection === 'formats' && selectedNatura !== 'Tutte')) && (
          <button
            onClick={() => { setSearchQuery(''); setSelectedTemaTag(null); setTagWidth(0); setFilters(f => ({ ...f, tema: 'Tutti' })); setSelectedNatura('Tutte'); setNaturaTagWidth(0); }}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        )}
        <input
          type="text"
          placeholder={
            activeSection === 'formats' && selectedNatura !== 'Tutte' ? `Cerca in ${selectedNatura}...` :
            selectedTemaTag ? `Cerca in ${selectedTemaTag.label}...` : 'Cerca video...'
          }
          value={searchQuery}
          onChange={(e) => { setSearchQuery(e.target.value); if (activeSection === 'submit' || activeSection === 'admin') setActiveSection('home'); }}
          onFocus={() => setIsSearchFocused(true)}
          onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
          ref={headerSearchRef}
          className="w-full text-white rounded-lg placeholder-zinc-500 text-sm outline-none"
          style={{ backgroundColor: '#262626', paddingLeft: (selectedTemaTag || (activeSection === 'formats' && selectedNatura !== 'Tutte')) ? `${(tagWidth || 0) + (activeSection === 'formats' && selectedNatura !== 'Tutte' ? (naturaTagWidth || 0) + 4 : 0) + 48}px` : '44px', paddingRight: '40px', paddingTop: '10px', paddingBottom: '10px' }}
        />
      </div>
      {/* Pillole filtri avanzati attivi — visibili solo quando FiltersSection è fuori viewport */}
      {activeSection === 'home' && !filtersInView && (() => {
        const durActive = filters.durationMin !== SNAP_POINTS[0] || filters.durationMax !== SNAP_POINTS[SNAP_POINTS.length - 1];
        const chips = [
          filters.natura !== 'Tutti' && { label: filters.natura, clear: () => setFilters(f => ({ ...f, natura: 'Tutti' })) },
          filters.year !== 'Tutti' && { label: String(filters.year), clear: () => setFilters(f => ({ ...f, year: 'Tutti' })) },
          filters.scuola === 'Scuole' && { label: 'Solo scuole', clear: () => setFilters(f => ({ ...f, scuola: 'Tutti' })) },
          filters.scuola === 'Altri' && { label: 'Escl. scuole', clear: () => setFilters(f => ({ ...f, scuola: 'Tutti' })) },
          durActive && { label: `${formatDuration(filters.durationMin)} – ${formatDuration(filters.durationMax)}`, clear: () => setFilters(f => ({ ...f, durationMin: SNAP_POINTS[0], durationMax: SNAP_POINTS[SNAP_POINTS.length - 1] })) },
        ].filter(Boolean);
        return chips.length > 0 ? (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {chips.map(chip => (
              <span key={chip.label} className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-md bg-zinc-800 border border-zinc-700 text-zinc-300">
                {chip.label}
                <button onMouseDown={(e) => { e.preventDefault(); chip.clear(); }} className="hover:text-white transition-colors"><X size={10} /></button>
              </span>
            ))}
          </div>
        ) : null;
      })()}
    </div>
    <div className="flex items-center gap-2 lg:gap-3">
  <button
    onClick={() => setShowPlaylist(true)}
    className="relative flex items-center gap-2 bg-zinc-800 text-zinc-300 px-3 lg:px-4 py-2.5 rounded-lg hover:bg-zinc-700 hover:text-white transition-all font-medium text-sm"
  >
    <List size={18} />
    <span className="hidden sm:inline">Playlist</span>
    {(() => { const n = user ? playlists.reduce((s, p) => s + p.video_ids.length, 0) : localPlaylist.length; return n > 0 && <span className="absolute -top-1 -right-1 text-black text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold" style={{ backgroundColor: '#FFDA2A' }}>{n}</span>; })()}
 </button>
  <button
    onClick={() => setActiveSection('submit')}
    className="flex items-center gap-2 text-black px-3 lg:px-4 py-2.5 rounded-lg hover:bg-yellow-500 transition-all font-medium text-sm"
    style={{ backgroundColor: '#FFDA2A' }}>
    <Upload size={18} />
    <span className="hidden sm:inline">Segnala</span>
  </button>
  {user ? (
    <div className="relative" ref={userMenuRef}>
      <button onClick={() => setShowUserMenu(!showUserMenu)} className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-white hover:bg-zinc-700 transition-all" title={user.email}>
        <User size={20} />
      </button>
      {showUserMenu && (
        <div className="absolute right-0 mt-3 w-64 bg-zinc-900 border border-zinc-800 rounded-lg shadow-2xl py-2 z-50">
          <div className="px-4 py-2 border-b border-zinc-800 mb-1">
            <p className="text-white text-sm font-medium truncate">{userProfile?.nome || user.email}</p>
            {userProfile?.organizzazione && <p className="text-zinc-500 text-xs truncate">{userProfile.organizzazione}</p>}
            {userProfile?.role === 'admin' && <span className="text-xs text-[#FFDA2A] font-semibold">Admin</span>}
          </div>
          <button onClick={() => { setActiveSection('myvideos'); setShowUserMenu(false); }} className="block w-full text-left px-4 py-3 text-zinc-300 hover:bg-zinc-800 transition-colors text-sm flex items-center gap-2">
            <List size={15} /> I miei video
          </button>
          <button onClick={() => { setActiveSection('submit'); setShowUserMenu(false); }} className="block w-full text-left px-4 py-3 text-zinc-300 hover:bg-zinc-800 transition-colors text-sm flex items-center gap-2">
            <Upload size={15} /> Segnala un video
          </button>
          {userProfile?.role === 'admin' && (
            <button onClick={() => { setActiveSection('admin'); setShowUserMenu(false); }} className="block w-full text-left px-4 py-3 text-zinc-300 hover:bg-zinc-800 transition-colors text-sm flex items-center gap-2">
              <ShieldCheck size={15} /> Pannello Admin
            </button>
          )}
          <hr className="my-1 border-zinc-800" />
          <button onClick={handleLogout} className="w-full text-left px-4 py-3 text-red-400 hover:bg-zinc-800 transition-colors flex items-center gap-2 text-sm">
            <LogOut size={15} /> Esci
          </button>
        </div>
      )}
    </div>
  ) : (
    <button
      onClick={() => { setAuthMode('login'); setShowAuthModal(true); }}
      className="flex items-center gap-2 bg-zinc-800 text-zinc-300 px-3 lg:px-4 py-2.5 rounded-lg hover:bg-zinc-700 hover:text-white transition-all font-medium text-sm"
    >
      <LogIn size={18} />
      <span className="hidden sm:inline">Accedi</span>
    </button>
  )}
            </div>
          </div>
        </header>
        <main className="p-4 md:p-8 bg-black">
          {activeSection === 'home' && (
  <>
    <HeroSection onVideoClick={handleVideoClick} videos={allVideos} />
    <div ref={filtersSectionRef}><FiltersSection onFilterChange={setFilters} currentFilters={filters} searchQuery={searchQuery} onSearchChange={setSearchQuery} onSearchSubmit={() => {}} videos={allVideos} /></div>
  </>
)}
{activeSection === 'formats' && <NatureCarousel onSelectNature={(natura) => setSelectedNatura(natura)} selectedNatura={selectedNatura} videos={allVideos} />}
          {activeSection === 'inspire' && <InspireSection onVideoClick={handleVideoClick} onAddToPlaylist={handleAddToPlaylist} isInPlaylist={isInPlaylist} videos={allVideos} />}
          {activeSection === 'submit' && <SubmitVideoSection user={user} userProfile={userProfile} onOpenAuth={() => { setAuthMode('login'); setShowAuthModal(true); }} onBack={() => setActiveSection('home')} onDraftSaved={() => setActiveSection('myvideos')} />}
          {activeSection === 'admin' && <AdminSection userProfile={userProfile} onVideoApproved={loadVideos} allVideos={allVideos} />}
          {activeSection === 'myvideos' && <MyVideosSection user={user} onNewVideo={() => setActiveSection('submit')} />}
          {activeSection !== 'submit' && activeSection !== 'admin' && activeSection !== 'myvideos' && (
          <>
          <div className="mb-6">
            <div className="flex items-center justify-between">
              {!(activeSection === 'formats' && selectedNatura !== 'Tutte') && (
              <h2 className="text-2xl font-bold text-white">
                {activeSection === 'home' && 'Esplora i Video'}
                {activeSection === 'most-viewed' && 'I Più Visti'}
                {activeSection === 'recent' && 'Nuovi Inseriti'}
                {activeSection === 'schools' && 'Prodotti dalle Scuole'}
                {activeSection === 'inspire' && 'Esplora i Video'}
                {activeSection === 'formats' && 'Tutti i Video'}
                {activeSection === 'all' && selectedNatura !== 'Tutte' && selectedNatura}
                {activeSection === 'all' && selectedNatura === 'Tutte' && 'Tutti i Video'}
              </h2>
              )}
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
            {filteredVideos.map(video => <VideoCard key={video.id} video={video} onClick={() => handleVideoClick(video)} onAddToPlaylist={handleAddToPlaylist} isInPlaylist={isInPlaylist(video.id)} />)}
          </div>
          {filteredVideos.length === 0 && (
            <div className="text-center py-12">
              <div className="inline-block bg-zinc-900 p-8 rounded-2xl mb-6"><Video size={64} className="text-zinc-700" strokeWidth={1.5} /></div>
              <h3 className="text-2xl font-bold text-white mb-3">Nessun video trovato</h3>
              <p className="text-zinc-400">Prova con una ricerca diversa</p>
            </div>
          )}
          </>
          )}
        </main>
      </div>
      {selectedVideo && (() => {
        window.videoModalAddToPlaylist = handleAddToPlaylist;
        window.videoModalIsInPlaylist = isInPlaylist;
        return <VideoModal video={selectedVideo} onClose={() => setSelectedVideo(null)} />;
      })()}
      
      {/* Playlist Sidebar */}
      <PlaylistSidebar
        user={user}
        onOpenAuth={() => { setAuthMode('login'); setShowAuthModal(true); }}
        onClose={() => setShowPlaylist(false)}
        isOpen={showPlaylist}
        localPlaylist={localPlaylist}
        onLocalRemove={(videoId) => setLocalPlaylist(prev => prev.filter(v => v.id !== videoId))}
        onLocalReorder={setLocalPlaylist}
        onLocalPlay={() => { if (localPlaylist.length > 0) { setPlayingLocalPlaylist(true); setCurrentPlaylistIndex(0); setShowPlaylist(false); } }}
        playlists={playlists}
        activePlaylistId={activePlaylistId}
        onSetActive={setActivePlaylistId}
        onCreatePlaylist={createPlaylist}
        onDeletePlaylist={deletePlaylist}
        onRenamePlaylist={renamePlaylist}
        onRemoveVideo={removeVideoFromPlaylist}
        onReorder={reorderPlaylist}
        onPlay={(playlistId) => {
          const pl = playlists.find(p => p.id === playlistId);
          if (pl && pl.video_ids.length > 0) { setPlayingPlaylistId(playlistId); setCurrentPlaylistIndex(0); setShowPlaylist(false); }
        }}
        getVideosForPlaylist={getVideosForPlaylist}
      />
      
      {/* Playlist Player — locale (anonimi) */}
      {playingLocalPlaylist && (
        <PlaylistPlayer
          playlist={localPlaylist}
          currentIndex={currentPlaylistIndex}
          onClose={() => { setPlayingLocalPlaylist(false); setCurrentPlaylistIndex(0); }}
          onNext={() => { if (currentPlaylistIndex < localPlaylist.length - 1) setCurrentPlaylistIndex(p => p + 1); else { setPlayingLocalPlaylist(false); setCurrentPlaylistIndex(0); } }}
          onPrevious={() => { if (currentPlaylistIndex > 0) setCurrentPlaylistIndex(p => p - 1); }}
        />
      )}

      {/* Playlist Player — Supabase (loggati) */}
      {playingPlaylistId !== null && (() => {
        const playingVideos = getVideosForPlaylist(playlists.find(p => p.id === playingPlaylistId));
        return (
          <PlaylistPlayer
            playlist={playingVideos}
            currentIndex={currentPlaylistIndex}
            onClose={() => { setPlayingPlaylistId(null); setCurrentPlaylistIndex(0); }}
            onNext={() => { if (currentPlaylistIndex < playingVideos.length - 1) setCurrentPlaylistIndex(p => p + 1); else { setPlayingPlaylistId(null); setCurrentPlaylistIndex(0); } }}
            onPrevious={() => { if (currentPlaylistIndex > 0) setCurrentPlaylistIndex(p => p - 1); }}
          />
        );
      })()}

      {/* Pick Playlist Modal */}
      {pickPlaylistFor && (
        <PickPlaylistModal
          video={pickPlaylistFor}
          playlists={playlists}
          onAdd={addVideoToPlaylist}
          onClose={() => setPickPlaylistFor(null)}
          onCreatePlaylist={createPlaylist}
        />
      )}

      {/* Auth Modal */}
      {showAuthModal && (
        <AuthModal
          mode={authMode}
          onClose={() => setShowAuthModal(false)}
        />
      )}
    </div>
  );
}

export default App;
