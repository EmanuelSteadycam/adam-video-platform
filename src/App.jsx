import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Search, Upload, User, PlayCircle, Clock, Calendar, Eye, School, X, LogOut, Video, ChevronLeft, ChevronRight, Shuffle, Menu, Smartphone, Monitor, Plus, Check, List, Play, SkipBack, SkipForward } from 'lucide-react';
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
      <div className="absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-black from-0% via-black via-70% to-transparent to-100%">
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
</div>
  )}
</div>
    </div>
  );
};

const InspireSection = ({ onVideoClick }) => {
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
      <div className="bg-zinc-900 rounded-xl">
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
              className="bg-zinc-800 text-zinc-300 p-4 rounded-full font-semibold hover:bg-zinc-700 hover:text-white transition-all mt-12 mb-5"
            >
              <Shuffle size={32} />
            </button>
            <div className="mt-[30px]">
              <span className={`${getTemaColor(inspireVideo.tema)} text-white text-xs px-3 py-1 rounded-full font-medium`}>
                {inspireVideo.tema}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const FiltersSection = ({ onFilterChange, currentFilters }) => {
  const temi = ['Tutti', ...new Set(mockVideos.map(v => v.tema))];
  const nature = ['Tutte', 'Cortometraggio', 'Film', 'Info', 'Sequenza', 'Spot commerciale', 'Spot sociale', 'Videoclip', 'Web e social'];
  const years = ['Tutti', ...new Set(mockVideos.map(v => v.year).sort((a, b) => b - a))];

  return (
    <div className="bg-zinc-900 rounded-xl p-6 mb-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-2">Tema</label>
          <select 
            value={currentFilters.tema}
            onChange={(e) => onFilterChange({ ...currentFilters, tema: e.target.value })}
            className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-[#FFDA2A]"
          >
            {temi.map(tema => <option key={tema} value={tema}>{tema}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-2">Formato</label>
          <select 
            value={currentFilters.natura}
            onChange={(e) => onFilterChange({ ...currentFilters, natura: e.target.value })}
            className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-[#FFDA2A]"
          >
            {nature.map(natura => <option key={natura} value={natura}>{natura}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-2">Anno</label>
          <select 
            value={currentFilters.year}
            onChange={(e) => onFilterChange({ ...currentFilters, year: e.target.value })}
            className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-[#FFDA2A]"
          >
            {years.map(year => <option key={year} value={year}>{year}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-2">Prodotto da</label>
          <select 
            value={currentFilters.scuola}
            onChange={(e) => onFilterChange({ ...currentFilters, scuola: e.target.value })}
            className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-[#FFDA2A]"
          >
            <option value="Tutti">Tutti</option>
            <option value="Scuole">Solo Scuole</option>
            <option value="Altri">Altri</option>
          </select>
        </div>
      </div>
    </div>
  );
};

const NatureCarousel = ({ onSelectNature }) => {
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
            <span className="bg-[#FFDA2A]/20 text-[#FFDA2A] px-3 py-1.5 rounded-full text-sm font-medium border border-purple-600/30">{video.tema}</span>
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
                  className="bg-zinc-800 rounded-lg overflow-hidden flex gap-3 p-3 group hover:bg-zinc-750 transition-colors"
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
  const [key, setKey] = useState(0);
  const [player, setPlayer] = useState(null);
  const currentVideo = playlist[currentIndex];
  const playerRef = useRef(null);

  useEffect(() => {
    setKey(prev => prev + 1);
  }, [currentIndex]);

  // Inizializza YouTube Player
  useEffect(() => {
    if (!currentVideo || currentVideo.source === 'nas') return;

    const videoId = getYouTubeID(currentVideo.youtubeUrl);
    
    const initPlayer = () => {
      if (window.YT && window.YT.Player) {
        const newPlayer = new window.YT.Player(`youtube-player-${key}`, {
          videoId: videoId,
          playerVars: {
            autoplay: 1,
            mute: 0,
            rel: 0,
            modestbranding: 1
          },
          events: {
            onStateChange: (event) => {
              // 0 = video finito
              if (event.data === 0) {
                onNext();
              }
            }
          }
        });
        setPlayer(newPlayer);
      }
    };

    // Aspetta che YT sia caricato
    if (window.YT) {
      initPlayer();
    } else {
      window.onYouTubeIframeAPIReady = initPlayer;
    }

    return () => {
      if (player) {
        player.destroy();
      }
    };
  }, [currentVideo, key]);

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
                id={`youtube-player-${key}`}
                className="w-full h-full"
              />
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
  const [selectedNatura, setSelectedNatura] = useState('Tutte');
  const [filters, setFilters] = useState({
    tema: 'Tutti',
    natura: 'Tutte',
    year: 'Tutti',
    scuola: 'Tutti'
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

  const filteredVideos = useMemo(() => {
    let filtered = mockVideos;
    if (searchQuery) filtered = filtered.filter(video => video.title.toLowerCase().includes(searchQuery.toLowerCase()));
    if (activeSection === 'most-viewed') filtered = [...filtered].sort((a, b) => b.views - a.views).slice(0, 20);
    else if (activeSection === 'recent') filtered = [...filtered].slice(0, 5);
    else if (activeSection === 'schools') filtered = filtered.filter(v => v.prodottoScuola);
    if (selectedNatura !== 'Tutte') filtered = filtered.filter(v => v.natura === selectedNatura);
    
    // Applica filtri avanzati
    if (filters.tema !== 'Tutti') filtered = filtered.filter(v => v.tema === filters.tema);
    if (filters.natura !== 'Tutte') filtered = filtered.filter(v => v.natura === filters.natura);
    if (filters.year !== 'Tutti') filtered = filtered.filter(v => v.year === parseInt(filters.year));
    if (filters.scuola === 'Scuole') filtered = filtered.filter(v => v.prodottoScuola);
    else if (filters.scuola === 'Altri') filtered = filtered.filter(v => !v.prodottoScuola);
    
    return filtered;
  }, [searchQuery, activeSection, selectedNatura, filters]);

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
        <p className="text-[10px] text-zinc-400">Archivio Digitale Addiction e Media</p>
      </div>
    </div>
  </div>
  <nav className="flex-1 p-4 overflow-y-auto">
    <ul className="space-y-2">
      <li><button onClick={() => { setActiveSection('home'); setSelectedNatura('Tutte'); setIsMobileMenuOpen(false); }} className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${activeSection === 'home' ? 'bg-zinc-800 text-zinc-300' : 'text-zinc-300 hover:bg-zinc-800 hover:text-white'}`}>Home</button></li>
      <li><button onClick={() => { setActiveSection('formats'); setSelectedNatura('Tutte'); setIsMobileMenuOpen(false); }} className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${activeSection === 'formats' ? 'bg-zinc-800 text-zinc-300' : 'text-zinc-300 hover:bg-zinc-800 hover:text-white'}`}>I Formati ADAM</button></li>
      <li><button onClick={() => { setActiveSection('most-viewed'); setSelectedNatura('Tutte'); setIsMobileMenuOpen(false); }} className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${activeSection === 'most-viewed' ? 'bg-zinc-800 text-zinc-300' : 'text-zinc-300 hover:bg-zinc-800 hover:text-white'}`}>I Più Visti</button></li>
      <li><button onClick={() => { setActiveSection('recent'); setSelectedNatura('Tutte'); setIsMobileMenuOpen(false); }} className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${activeSection === 'recent' ? 'bg-zinc-800 text-zinc-300' : 'text-zinc-300 hover:bg-zinc-800 hover:text-white'}`}>Nuovi Inseriti</button></li>
      <li><button onClick={() => { setActiveSection('schools'); setSelectedNatura('Tutte'); setIsMobileMenuOpen(false); }} className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${activeSection === 'schools' ? 'bg-zinc-800 text-zinc-300' : 'text-zinc-300 hover:bg-zinc-800 hover:text-white'}`}>Prodotti dalle Scuole</button></li>
      <li><button onClick={() => { setActiveSection('inspire'); setSelectedNatura('Tutte'); setIsMobileMenuOpen(false); }} className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${activeSection === 'inspire' ? 'bg-zinc-800 text-zinc-300' : 'text-zinc-300 hover:bg-zinc-800 hover:text-white'}`}>Lasciati Ispirare</button></li>
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
          <div className="flex-1 max-w-2xl hidden md:block">
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
    <NatureCarousel onSelectNature={(natura) => { setSelectedNatura(natura); setActiveSection('all'); }} />
    <FiltersSection onFilterChange={setFilters} currentFilters={filters} />
  </>
)}
{activeSection === 'formats' && <NatureCarousel onSelectNature={(natura) => { setSelectedNatura(natura); setActiveSection('all'); }} />}
          {activeSection === 'inspire' && <InspireSection onVideoClick={setSelectedVideo} />}
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-white">
              {activeSection === 'home' && 'Esplora i Video'}
              {activeSection === 'most-viewed' && 'I Più Visti'}
              {activeSection === 'recent' && 'Nuovi Inseriti'}
              {activeSection === 'schools' && 'Prodotti dalle Scuole'}
              {activeSection === 'inspire' && 'Lasciati Ispirare'}
              {(activeSection === 'all' || activeSection === 'formats') && selectedNatura !== 'Tutte' && selectedNatura}
              {activeSection === 'all' && selectedNatura === 'Tutte' && 'Tutti i Video'}
            </h2>
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
