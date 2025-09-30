import React, { useState, useMemo } from 'react';
import { Search, Filter, Upload, User, PlayCircle, Clock, Calendar, Eye, School, X, Menu, LogOut, Video, ChevronDown } from 'lucide-react';

// Funzione helper per estrarre ID video YouTube
const getYouTubeID = (url) => {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
};

// Dati di esempio con URL YouTube reali
const mockVideos = [
  {
    id: 1,
    title: "Effetti dell'alcool sul cervello adolescente",
    youtubeUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    thumbnail: "https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg",
    duration: "8:30",
    year: 2023,
    views: 1245,
    format: "orizzontale",
    tema: "Alcool",
    natura: "Informativi",
    prodottoScuola: false,
    description: "Documentario scientifico sugli effetti dell'alcool sul cervello in via di sviluppo."
  },
  {
    id: 2,
    title: "Non giocarti il futuro - Campagna azzardo",
    youtubeUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    thumbnail: "https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg",
    duration: "0:45",
    year: 2024,
    views: 3421,
    format: "verticale",
    tema: "Azzardo",
    natura: "Spot Sociali",
    prodottoScuola: false,
    description: "Spot sociale sulla prevenzione del gioco d'azzardo tra i giovani."
  },
  {
    id: 3,
    title: "Dipendenza digitale: riconoscerla e affrontarla",
    youtubeUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    thumbnail: "https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg",
    duration: "15:20",
    year: 2023,
    views: 892,
    format: "orizzontale",
    tema: "Digitale",
    natura: "Informativi",
    prodottoScuola: true,
    description: "Video educativo prodotto da studenti sul tema della dipendenza da smartphone."
  },
  {
    id: 4,
    title: "Sostanze stupefacenti: miti e realtà",
    youtubeUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    thumbnail: "https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg",
    duration: "22:15",
    year: 2022,
    views: 2156,
    format: "orizzontale",
    tema: "Sostanze",
    natura: "Film",
    prodottoScuola: false,
    description: "Cortometraggio che sfata i miti più comuni sulle sostanze stupefacenti."
  },
  {
    id: 5,
    title: "Social media e salute mentale",
    youtubeUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    thumbnail: "https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg",
    duration: "5:40",
    year: 2024,
    views: 4532,
    format: "verticale",
    tema: "Digitale",
    natura: "Web e Social",
    prodottoScuola: false,
    description: "Contenuto virale sui social che esplora il rapporto tra social media e benessere psicologico."
  },
  {
    id: 6,
    title: "Bevi responsabile - Campagna prevenzione",
    youtubeUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    thumbnail: "https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg",
    duration: "1:30",
    year: 2023,
    views: 1876,
    format: "orizzontale",
    tema: "Alcool",
    natura: "Spot adv",
    prodottoScuola: false,
    description: "Spot pubblicitario sulla sensibilizzazione al consumo responsabile di alcool."
  },
  {
    id: 7,
    title: "Il gioco che non diverte",
    youtubeUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    thumbnail: "https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg",
    duration: "12:00",
    year: 2024,
    views: 678,
    format: "orizzontale",
    tema: "Azzardo",
    natura: "Cortometraggi",
    prodottoScuola: true,
    description: "Cortometraggio realizzato da studenti sul tema della ludopatia."
  },
  {
    id: 8,
    title: "Connessi ma soli",
    youtubeUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    thumbnail: "https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg",
    duration: "18:45",
    year: 2023,
    views: 3245,
    format: "orizzontale",
    tema: "Digitale",
    natura: "Sequenze",
    prodottoScuola: false,
    description: "Serie di sequenze sulla solitudine nell'era digitale."
  }
];

const tematiche = ["Tutte", "Alcool", "Azzardo", "Digitale", "Sostanze"];
const nature = ["Tutte", "Informativi", "Spot adv", "Spot Sociali", "Film", "Cortometraggi", "Sequenze", "Web e Social"];
const formati = ["Tutti", "orizzontale", "verticale"];

const VideoCard = ({ video, onClick }) => (
  <div 
    onClick={onClick}
    className="group cursor-pointer bg-zinc-900 rounded-lg overflow-hidden transition-all duration-300 transform hover:scale-105"
  >
    <div className="relative overflow-hidden aspect-video">
      <img 
        src={video.thumbnail} 
        alt={video.title}
        className="w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-60 transition-all duration-300 flex items-center justify-center">
        <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <PlayCircle className="text-white" size={56} strokeWidth={1.5} />
        </div>
      </div>
      <div className="absolute bottom-3 right-3 bg-black bg-opacity-80 text-white text-xs px-2 py-1 rounded font-medium">
        {video.duration}
      </div>
      {video.prodottoScuola && (
        <div className="absolute top-3 left-3 bg-purple-600 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1 font-medium">
          <School size={12} />
          <span>Scuola</span>
        </div>
      )}
    </div>
    <div className="p-4">
      <h3 className="font-medium text-white mb-2 line-clamp-2 text-sm group-hover:text-purple-400 transition-colors">
        {video.title}
      </h3>
      <div className="flex items-center justify-between text-xs text-zinc-400">
        <div className="flex items-center gap-3">
          <span>{video.year}</span>
          <span className="flex items-center gap-1">
            <Eye size={12} />
            {video.views}
          </span>
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
            <iframe
              className="absolute top-0 left-0 w-full h-full"
              src={`https://www.youtube.com/embed/${videoId}?autoplay=0&rel=0&modestbranding=1`}
              title={video.title}
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
          <button 
            onClick={onClose}
            className="absolute top-6 right-6 bg-black bg-opacity-80 text-white p-2 rounded-full hover:bg-opacity-100 transition-all z-10"
          >
            <X size={24} />
          </button>
        </div>
        <div className="p-8">
          <h2 className="text-3xl font-bold text-white mb-4">{video.title}</h2>
          <div className="flex flex-wrap gap-6 mb-6 text-sm text-zinc-400">
            <div className="flex items-center gap-2">
              <Clock size={16} />
              <span>{video.duration}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar size={16} />
              <span>{video.year}</span>
            </div>
            <div className="flex items-center gap-2">
              <Eye size={16} />
              <span>{video.views} visualizzazioni</span>
            </div>
            <div className="flex items-center gap-2">
              <Video size={16} />
              <span>{video.format}</span>
            </div>
            {video.prodottoScuola && (
              <div className="flex items-center gap-2 text-purple-400">
                <School size={16} />
                <span>Prodotto da scuole</span>
              </div>
            )}
          </div>
          <div className="flex gap-3 mb-6">
            <span className="bg-purple-600/20 text-purple-400 px-3 py-1.5 rounded-full text-sm font-medium border border-purple-600/30">
              {video.tema}
            </span>
            <span className="bg-blue-600/20 text-blue-400 px-3 py-1.5 rounded-full text-sm font-medium border border-blue-600/30">
              {video.natura}
            </span>
          </div>
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-white mb-3">Descrizione</h3>
            <p className="text-zinc-400 leading-relaxed">{video.description}</p>
          </div>
          <a 
            href={video.youtubeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 transition-colors"
          >
            <span>Guarda su YouTube</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </div>
      </div>
    </div>
  );
};

const UploadModal = ({ onClose }) => {
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tema, setTema] = useState('Alcool');
  const [natura, setNatura] = useState('Informativi');
  const [formato, setFormato] = useState('orizzontale');
  const [year, setYear] = useState(new Date().getFullYear());
  const [prodottoScuola, setProdottoScuola] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    alert('Video inviato per approvazione! Un amministratore lo revisionerà presto.');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-95 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-zinc-900 rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-3xl font-bold text-white">Segnala un Video</h2>
            <button 
              onClick={onClose}
              className="text-zinc-400 hover:text-white transition-colors"
            >
              <X size={24} />
            </button>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                URL YouTube
              </label>
              <input
                type="url"
                required
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 text-white rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent placeholder-zinc-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Titolo
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Inserisci il titolo del video"
                className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 text-white rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent placeholder-zinc-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Descrizione
              </label>
              <textarea
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descrivi brevemente il contenuto del video"
                rows={4}
                className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 text-white rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent placeholder-zinc-500 resize-none"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Tematica
                </label>
                <select
                  value={tema}
                  onChange={(e) => setTema(e.target.value)}
                  className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 text-white rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                >
                  {tematiche.filter(t => t !== 'Tutte').map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Natura
                </label>
                <select
                  value={natura}
                  onChange={(e) => setNatura(e.target.value)}
                  className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 text-white rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                >
                  {nature.filter(n => n !== 'Tutte').map(n => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Formato
                </label>
                <select
                  value={formato}
                  onChange={(e) => setFormato(e.target.value)}
                  className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 text-white rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                >
                  {formati.filter(f => f !== 'Tutti').map(f => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Anno produzione
                </label>
                <select
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 text-white rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                >
                  {Array.from({ length: new Date().getFullYear() - 1988 + 1 }, (_, i) => new Date().getFullYear() - i).map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={prodottoScuola}
                  onChange={(e) => setProdottoScuola(e.target.checked)}
                  className="w-5 h-5 text-purple-600 border-zinc-700 rounded focus:ring-purple-600 bg-zinc-900"
                />
                <span className="text-sm text-zinc-300">Prodotto da scuole</span>
              </label>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-6 py-3 border border-zinc-700 text-zinc-300 rounded-lg hover:bg-zinc-800 transition-colors font-medium"
              >
                Annulla
              </button>
              <button
                type="submit"
                className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-3 rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all font-medium"
              >
                Invia per Approvazione
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [selectedTema, setSelectedTema] = useState('Tutte');
  const [selectedNatura, setSelectedNatura] = useState('Tutte');
  const [selectedFormato, setSelectedFormato] = useState('Tutti');
  const [maxDuration, setMaxDuration] = useState('');
  const [minYear, setMinYear] = useState('');
  const [soloScuole, setSoloScuole] = useState(false);

  const filteredVideos = useMemo(() => {
    return mockVideos.filter(video => {
      if (selectedTema !== 'Tutte' && video.tema !== selectedTema) return false;
      if (selectedNatura !== 'Tutte' && video.natura !== selectedNatura) return false;
      if (selectedFormato !== 'Tutti' && video.format !== selectedFormato) return false;
      if (soloScuole && !video.prodottoScuola) return false;
      if (searchQuery && !video.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      
      const [mins, secs] = video.duration.split(':').map(Number);
      const totalMins = mins + secs / 60;
      if (maxDuration && totalMins > Number(maxDuration)) return false;
      
      if (minYear && video.year !== Number(minYear)) return false;
      
      return true;
    });
  }, [selectedTema, selectedNatura, selectedFormato, soloScuole, searchQuery, maxDuration, minYear]);

  const resetFilters = () => {
    setSelectedTema('Tutte');
    setSelectedNatura('Tutte');
    setSelectedFormato('Tutti');
    setMaxDuration('');
    setMinYear('');
    setSoloScuole(false);
    setSearchQuery('');
  };

  const activeFiltersCount = [
    selectedTema !== 'Tutte',
    selectedNatura !== 'Tutte',
    selectedFormato !== 'Tutti',
    soloScuole,
    maxDuration,
    minYear
  ].filter(Boolean).length;

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-purple-900 to-zinc-900 flex items-center justify-center p-4">
        <div className="bg-zinc-900/80 backdrop-blur-xl rounded-2xl shadow-2xl p-10 max-w-md w-full border border-zinc-800">
          <div className="text-center mb-8">
            <div className="inline-block bg-gradient-to-r from-purple-600 to-blue-600 text-white p-5 rounded-2xl mb-6">
              <PlayCircle size={56} strokeWidth={1.5} />
            </div>
            <h1 className="text-4xl font-bold text-white mb-2">ADAM</h1>
            <p className="text-xl text-purple-400 font-medium mb-3">Archivio Digitale Addiction e Media</p>
            <p className="text-zinc-400 text-sm">Piattaforma per operatori sociali, studenti e insegnanti</p>
          </div>
          <div className="space-y-4">
            <input 
              type="email" 
              placeholder="Email"
              className="w-full px-4 py-4 bg-zinc-800 border border-zinc-700 text-white rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent placeholder-zinc-500"
            />
            <input 
              type="password" 
              placeholder="Password"
              className="w-full px-4 py-4 bg-zinc-800 border border-zinc-700 text-white rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent placeholder-zinc-500"
            />
            <button 
              onClick={() => setIsLoggedIn(true)}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-4 rounded-lg font-semibold hover:from-purple-700 hover:to-blue-700 transition-all"
            >
              Accedi
            </button>
            <p className="text-center text-sm text-zinc-400">
              Non hai un account? <a href="#" className="text-purple-400 font-medium hover:text-purple-300 transition-colors">Registrati</a>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <header className="bg-zinc-900/95 backdrop-blur-lg border-b border-zinc-800 sticky top-0 z-40">
        <div className="max-w-[1600px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between gap-6">
            <div className="flex items-center gap-3 flex-shrink-0">
              <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-2 rounded-xl">
                <PlayCircle size={24} strokeWidth={1.5} />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white leading-none">ADAM</h1>
                <p className="text-[10px] text-zinc-400">Archivio Digitale Addiction e Media</p>
              </div>
            </div>

            <div className="flex-1 max-w-2xl">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-zinc-500" size={18} />
                <input 
                  type="text"
                  placeholder="Cerca video..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-11 pr-4 py-2.5 bg-zinc-800 border border-zinc-700 text-white rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent placeholder-zinc-500 text-sm"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 flex-shrink-0">
              <button 
                onClick={() => setShowFilters(!showFilters)}
                className="relative flex items-center gap-2 px-4 py-2.5 bg-zinc-800 border border-zinc-700 text-white rounded-lg hover:border-purple-600 transition-all text-sm font-medium"
              >
                <Filter size={18} />
                <span className="hidden lg:inline">Filtri</span>
                {activeFiltersCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-purple-600 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
                    {activeFiltersCount}
                  </span>
                )}
              </button>
              <button 
                onClick={() => setShowUploadModal(true)}
                className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white px-4 py-2.5 rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all font-medium text-sm"
              >
                <Upload size={18} />
                <span className="hidden md:inline">Segnala</span>
              </button>
              <div className="relative">
                <button 
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 flex items-center justify-center text-white hover:from-purple-700 hover:to-blue-700 transition-all"
                >
                  <User size={20} />
                </button>
                {showUserMenu && (
                  <div className="absolute right-0 mt-3 w-56 bg-zinc-900 border border-zinc-800 rounded-lg shadow-2xl py-2 overflow-hidden">
                    <a href="#" className="block px-4 py-3 text-zinc-300 hover:bg-zinc-800 transition-colors">Il mio profilo</a>
                    <a href="#" className="block px-4 py-3 text-zinc-300 hover:bg-zinc-800 transition-colors">I miei video</a>
                    <a href="#" className="block px-4 py-3 text-zinc-300 hover:bg-zinc-800 transition-colors">Impostazioni</a>
                    <hr className="my-2 border-zinc-800" />
                    <button 
                      onClick={() => setIsLoggedIn(false)}
                      className="w-full text-left px-4 py-3 text-red-400 hover:bg-zinc-800 transition-colors flex items-center gap-2"
                    >
                      <LogOut size={16} />
                      Esci
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-[1600px] mx-auto px-6 py-10">
        <div className="mb-8">
          {showFilters && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-2">Tematica</label>
                  <select 
                    value={selectedTema}
                    onChange={(e) => setSelectedTema(e.target.value)}
                    className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 text-white rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                  >
                    {tematiche.map(tema => (
                      <option key={tema} value={tema}>{tema}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-2">Natura</label>
                  <select 
                    value={selectedNatura}
                    onChange={(e) => setSelectedNatura(e.target.value)}
                    className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 text-white rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                  >
                    {nature.map(natura => (
                      <option key={natura} value={natura}>{natura}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-2">Formato</label>
                  <select 
                    value={selectedFormato}
                    onChange={(e) => setSelectedFormato(e.target.value)}
                    className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 text-white rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                  >
                    {formati.map(formato => (
                      <option key={formato} value={formato}>{formato}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-2">Anno produzione</label>
                  <select 
                    value={minYear}
                    onChange={(e) => setMinYear(e.target.value)}
                    className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 text-white rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                  >
                    <option value="">Tutti gli anni</option>
                    {Array.from({ length: new Date().getFullYear() - 1988 + 1 }, (_, i) => new Date().getFullYear() - i).map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-2">Durata (max)</label>
                  <input 
                    type="number" 
                    placeholder="Durata massima (min)"
                    value={maxDuration}
                    onChange={(e) => setMaxDuration(e.target.value)}
                    className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 text-white rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent placeholder-zinc-500"
                  />
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-3 cursor-pointer bg-zinc-800 px-4 py-3 rounded-lg w-full hover:bg-zinc-700 transition-colors">
                    <input 
                      type="checkbox"
                      checked={soloScuole}
                      onChange={(e) => setSoloScuole(e.target.checked)}
                      className="w-5 h-5 text-purple-600 border-zinc-700 rounded focus:ring-purple-600 bg-zinc-900"
                    />
                    <span className="text-sm text-zinc-300 font-medium">Solo prodotti da scuole</span>
                  </label>
                </div>
                <div className="flex items-end lg:col-span-2">
                  <button 
                    onClick={resetFilters}
                    className="w-full px-4 py-3 text-zinc-300 border border-zinc-700 rounded-lg hover:bg-zinc-800 transition-colors font-medium"
                  >
                    Reimposta filtri
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">
            {filteredVideos.length} {filteredVideos.length === 1 ? 'video trovato' : 'video trovati'}
          </h2>
          {activeFiltersCount > 0 && (
            <span className="text-sm text-zinc-400">
              {activeFiltersCount} {activeFiltersCount === 1 ? 'filtro attivo' : 'filtri attivi'}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredVideos.map(video => (
            <VideoCard 
              key={video.id} 
              video={video} 
              onClick={() => setSelectedVideo(video)}
            />
          ))}
        </div>

        {filteredVideos.length === 0 && (
          <div className="text-center py-20">
            <div className="inline-block bg-zinc-900 p-8 rounded-2xl mb-6">
              <Video size={64} className="text-zinc-700" strokeWidth={1.5} />
            </div>
            <h3 className="text-2xl font-bold text-white mb-3">Nessun video trovato</h3>
            <p className="text-zinc-400 mb-6">Prova a modificare i filtri di ricerca</p>
            <button 
              onClick={resetFilters}
              className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
            >
              Reimposta filtri
            </button>
          </div>
        )}
      </div>

      {selectedVideo && (
        <VideoModal video={selectedVideo} onClose={() => setSelectedVideo(null)} />
      )}

      {showUploadModal && (
        <UploadModal onClose={() => setShowUploadModal(false)} />
      )}
    </div>
  );
}

export default App;
