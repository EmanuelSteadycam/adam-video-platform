import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Search, Upload, User, PlayCircle, Clock, Calendar, Eye, School, X, LogOut, Video, ChevronLeft, ChevronRight, Shuffle } from 'lucide-react';
import { videos as videosData } from './videosData';

const getYouTubeID = (url) => {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
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
  
  useEffect(() => {
    setHeroVideo(mockVideos[Math.floor(Math.random() * mockVideos.length)]);
  }, []);

  if (!heroVideo) return null;

  const videoId = getYouTubeID(heroVideo.youtubeUrl);

  return (
    <div className="relative h-[50vh] w-full overflow-hidden mb-8">
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
      <div className="absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-black from-0% via-black via-70% to-transparent to-100%" />
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
      'Alcool': 'bg-yellow-500',
      'Azzardo': 'bg-red-500',
      'Digitale': 'bg-blue-500',
      'Sostanze': 'bg-green-500'
    };
    return colors[tema] || 'bg-gray-500';
  };

 const getBorderColor = (tema) => {
    const colors = {
      'Alcool': 'border-yellow-500',
      'Azzardo': 'border-red-500',
      'Digitale': 'border-blue-500',
      'Sostanze': 'border-green-500'
    };
    return colors[tema] || 'border-gray-500';
  };

return (
    <div className="w-full mb-8">
      <div className="bg-zinc-900 rounded-xl">
        <div className="grid grid-cols-2">
          <div className={`aspect-video overflow-hidden border-2 rounded-xl ${getBorderColor(inspireVideo.tema)}`}>
  <iframe
    className="w-full h-full rounded-xl"
              src={`https://www.youtube.com/embed/${videoId}?autoplay=1&mute=0&rel=0&modestbranding=1`}
              title={inspireVideo.title}
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
          <div className="flex flex-col items-center justify-center p-8">
            <h2 className="text-3xl font-bold text-white">Lasciati Ispirare</h2>
            <button 
              onClick={getRandomVideo}
              className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-4 rounded-full font-semibold hover:from-purple-700 hover:to-blue-700 transition-all mt-12 mb-5"
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
  const nature = ['Tutte', 'Cortometraggi', 'Film', 'Informativi', 'Sequenze', 'Spot adv', 'Spot Sociali', 'Videoclip', 'Web e Social'];
  const years = ['Tutti', ...new Set(mockVideos.map(v => v.year).sort((a, b) => b - a))];

  return (
    <div className="bg-zinc-900 rounded-xl p-6 mb-8">
      <div className="grid grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-2">Tema</label>
          <select 
            value={currentFilters.tema}
            onChange={(e) => onFilterChange({ ...currentFilters, tema: e.target.value })}
            className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-purple-600"
          >
            {temi.map(tema => <option key={tema} value={tema}>{tema}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-2">Formato</label>
          <select 
            value={currentFilters.natura}
            onChange={(e) => onFilterChange({ ...currentFilters, natura: e.target.value })}
            className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-purple-600"
          >
            {nature.map(natura => <option key={natura} value={natura}>{natura}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-2">Anno</label>
          <select 
            value={currentFilters.year}
            onChange={(e) => onFilterChange({ ...currentFilters, year: e.target.value })}
            className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-purple-600"
          >
            {years.map(year => <option key={year} value={year}>{year}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-2">Prodotto da</label>
          <select 
            value={currentFilters.scuola}
            onChange={(e) => onFilterChange({ ...currentFilters, scuola: e.target.value })}
            className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-purple-600"
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
    { name: 'Web & Social', image: '/images/nature/web-social.jpg', key: 'Web e social' }
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
              <div key={slideIndex} className="min-w-full grid grid-cols-4 gap-6 px-12">
                {natureData.slice(slideIndex * 4, slideIndex * 4 + 4).map((nat) => (
                  <div key={nat.key} onClick={() => onSelectNature(nat.key)} className="group cursor-pointer bg-zinc-900 rounded-xl overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-2xl">
  <div className="relative aspect-[9/16]">
                      <img src={nat.image} alt={nat.name} className="w-full h-full object-cover" />
                      <div className="absolute top-3 left-3 bg-purple-600 text-white text-xs px-3 py-1 rounded-full font-bold">{videoCounts[nat.key] || 0} video</div>
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                      <div className="absolute bottom-4 left-4 right-4">
  <h3 className="text-white font-semibold text-[32px] text-center">{nat.name}</h3>
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

const VideoCard = ({ video, onClick }) => (
  <div onClick={onClick} className="group cursor-pointer bg-zinc-900 rounded-lg overflow-hidden transition-all duration-300 transform hover:scale-105">
    <div className="relative overflow-hidden aspect-video">
      <img src={video.thumbnail} alt={video.title} className="w-full h-full object-cover" />
      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-60 transition-all duration-300 flex items-center justify-center">
        <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <PlayCircle className="text-white" size={56} strokeWidth={1.5} />
        </div>
      </div>
      <div className="absolute bottom-3 right-3 bg-black bg-opacity-80 text-white text-xs px-2 py-1 rounded font-medium">{video.duration || 'N/D'}</div>
      {video.prodottoScuola && (
        <div className="absolute top-3 left-3 bg-purple-600 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1 font-medium">
          <School size={12} />
          <span>Scuola</span>
        </div>
      )}
    </div>
    <div className="p-4">
      <h3 className="font-medium text-white mb-2 line-clamp-2 text-sm group-hover:text-purple-400 transition-colors">{video.title}</h3>
      <div className="flex items-center justify-between text-xs text-zinc-400">
        <div className="flex items-center gap-3">
          <span>{video.year}</span>
          <span className="flex items-center gap-1"><Eye size={12} />{video.views}</span>
        </div>
      </div>
    </div>
  </div>
);

const VideoModal = ({ video, onClose }) => {
  const videoId = getYouTubeID(video.youtubeUrl);
  return (
    <div className="fixed inset-0 bg-black bg-opacity-95 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-zinc-900 rounded-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="relative">
          <div className="relative w-full" style={{ paddingTop: '56.25%' }}>
            <iframe className="absolute top-0 left-0 w-full h-full" src={`https://www.youtube.com/embed/${videoId}?autoplay=0&rel=0&modestbranding=1`} title={video.title} frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
          </div>
          <button onClick={onClose} className="absolute top-6 right-6 bg-black bg-opacity-80 text-white p-2 rounded-full hover:bg-opacity-100 transition-all z-10"><X size={24} /></button>
        </div>
        <div className="p-8">
          <h2 className="text-3xl font-bold text-white mb-4">{video.title}</h2>
          <div className="flex flex-wrap gap-6 mb-6 text-sm text-zinc-400">
            <div className="flex items-center gap-2"><Clock size={16} /><span>{video.duration || 'N/D'}</span></div>
            <div className="flex items-center gap-2"><Calendar size={16} /><span>{video.year}</span></div>
            <div className="flex items-center gap-2"><Eye size={16} /><span>{video.views} visualizzazioni</span></div>
            <div className="flex items-center gap-2"><Video size={16} /><span>{video.format}</span></div>
            {video.prodottoScuola && <div className="flex items-center gap-2 text-purple-400"><School size={16} /><span>Prodotto da scuole</span></div>}
          </div>
          <div className="flex gap-3 mb-6">
            <span className="bg-purple-600/20 text-purple-400 px-3 py-1.5 rounded-full text-sm font-medium border border-purple-600/30">{video.tema}</span>
            <span className="bg-blue-600/20 text-blue-400 px-3 py-1.5 rounded-full text-sm font-medium border border-blue-600/30">{video.natura}</span>
          </div>
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-white mb-3">Descrizione</h3>
            <p className="text-zinc-400 leading-relaxed">{video.description}</p>
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
  const [selectedNatura, setSelectedNatura] = useState('Tutte');
  const [filters, setFilters] = useState({
    tema: 'Tutti',
    natura: 'Tutte',
    year: 'Tutti',
    scuola: 'Tutti'
  });

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
            <div className="inline-block bg-gradient-to-r from-purple-600 to-blue-600 text-white p-5 rounded-2xl mb-6"><PlayCircle size={56} strokeWidth={1.5} /></div>
            <h1 className="text-4xl font-bold text-white mb-2">ADAM</h1>
            <p className="text-xl text-purple-400 font-medium mb-3">Archivio Digitale Addiction e Media</p>
            <p className="text-zinc-400 text-sm">Piattaforma per operatori sociali, studenti e insegnanti</p>
          </div>
          <div className="space-y-4">
            <input type="email" placeholder="Email" className="w-full px-4 py-4 bg-zinc-800 border border-zinc-700 text-white rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent placeholder-zinc-500" />
            <input type="password" placeholder="Password" className="w-full px-4 py-4 bg-zinc-800 border border-zinc-700 text-white rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent placeholder-zinc-500" />
            <button onClick={() => setIsLoggedIn(true)} className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-4 rounded-lg font-semibold hover:from-purple-700 hover:to-blue-700 transition-all">Accedi</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex">
      <aside className="w-64 bg-zinc-900 border-r border-zinc-800 fixed left-0 top-0 h-full flex flex-col z-50">
        <div className="p-6 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-2 rounded-xl"><PlayCircle size={28} strokeWidth={1.5} /></div>
            <div>
              <h1 className="text-2xl font-bold text-white">ADAM</h1>
              <p className="text-[10px] text-zinc-400">Archivio Digitale Addiction e Media</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-4 overflow-y-auto">
          <ul className="space-y-2">
            <li><button onClick={() => { setActiveSection('home'); setSelectedNatura('Tutte'); }} className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${activeSection === 'home' ? 'bg-purple-600 text-white' : 'text-zinc-300 hover:bg-zinc-800'}`}>Home</button></li>
            <li><button onClick={() => { setActiveSection('formats'); setSelectedNatura('Tutte'); }} className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${activeSection === 'formats' ? 'bg-purple-600 text-white' : 'text-zinc-300 hover:bg-zinc-800'}`}>I Formati ADAM</button></li>
            <li><button onClick={() => { setActiveSection('most-viewed'); setSelectedNatura('Tutte'); }} className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${activeSection === 'most-viewed' ? 'bg-purple-600 text-white' : 'text-zinc-300 hover:bg-zinc-800'}`}>I Più Visti</button></li>
            <li><button onClick={() => { setActiveSection('recent'); setSelectedNatura('Tutte'); }} className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${activeSection === 'recent' ? 'bg-purple-600 text-white' : 'text-zinc-300 hover:bg-zinc-800'}`}>Nuovi Inseriti</button></li>
            <li><button onClick={() => { setActiveSection('schools'); setSelectedNatura('Tutte'); }} className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${activeSection === 'schools' ? 'bg-purple-600 text-white' : 'text-zinc-300 hover:bg-zinc-800'}`}>Prodotti dalle Scuole</button></li>
            <li><button onClick={() => { setActiveSection('inspire'); setSelectedNatura('Tutte'); }} className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${activeSection === 'inspire' ? 'bg-purple-600 text-white' : 'text-zinc-300 hover:bg-zinc-800'}`}>Lasciati Ispirare</button></li>
          </ul>
        </nav>
      </aside>
      <div className="ml-64 flex-1">
        <header className="bg-black sticky top-0 z-40">
          <div className="px-8 py-4 flex items-center justify-between gap-6">
          <div className="flex-1 max-w-2xl">
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
    <div className="relative">
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
    const input = e.target.closest('.relative').querySelector('input');
    input.style.width = '400px';
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
  e.target.style.width = '100%';
  if (!selectedTemaTag) setIsSearchFocused(true);
}}
onBlur={(e) => {
  if (!searchQuery && !selectedTemaTag) e.target.style.width = '400px';
  setTimeout(() => setIsSearchFocused(false), 200);
}}
className={`${selectedTemaTag || searchQuery ? 'w-full' : 'w-[400px]'} text-white rounded-lg placeholder-zinc-500 text-sm transition-all duration-300 outline-none`}
        style={{ 
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
            <div className="flex items-center gap-3">
              <button className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white px-4 py-2.5 rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all font-medium text-sm"><Upload size={18} /><span>Segnala</span></button>
              <div className="relative">
                <button onClick={() => setShowUserMenu(!showUserMenu)} className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 flex items-center justify-center text-white hover:from-purple-700 hover:to-blue-700 transition-all"><User size={20} /></button>
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
        <main className="p-8 bg-black">
          {activeSection === 'home' && (
  <>
    <HeroSection onVideoClick={setSelectedVideo} />
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
            {filteredVideos.map(video => <VideoCard key={video.id} video={video} onClick={() => setSelectedVideo(video)} />)}
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
      {selectedVideo && <VideoModal video={selectedVideo} onClose={() => setSelectedVideo(null)} />}
    </div>
  );
}

export default App;
