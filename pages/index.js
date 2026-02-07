import { useState, useEffect } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
// Hapus import framer-motion
import { Search, Download, Music, Video, Image as ImageIcon, Loader2, Link as LinkIcon, Share2, Heart, MessageCircle, X, PlayCircle, Facebook, Instagram, Youtube } from 'lucide-react';

export default function Home({ triggerAd }) {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [data, setData] = useState(null);
  const [cache, setCache] = useState({});
  const [activePreview, setActivePreview] = useState(null);
  const [mediaError, setMediaError] = useState(false);

  useEffect(() => {
    let interval;
    if (loading) {
      setProgress(10);
      interval = setInterval(() => {
        setProgress((prev) => (prev < 90 ? prev + Math.random() * 10 : prev));
      }, 500);
    } else {
      setProgress(0);
    }
    return () => clearInterval(interval);
  }, [loading]);

  useEffect(() => {
    if (data) {
      setMediaError(false);
      setActivePreview(null);
    }
  }, [data]);

  const sanitizeFilename = (name) => {
    if (!name) return `media_${Date.now()}`;
    return name.replace(/[^a-zA-Z0-9\s-_]/g, '').trim().replace(/\s+/g, '_').substring(0, 60) || `media_${Date.now()}`;
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!url) return;

    if (cache[url]) {
      setData(cache[url]);
      return;
    }

    setLoading(true);
    setData(null);

    try {
      const response = await axios.post('/api/download', { url });
      setProgress(100);
      
      setTimeout(() => {
        if (response.data.success) {
          const resultData = response.data.data;
          setData(resultData);
          setCache(prev => ({ ...prev, [url]: resultData }));
        }
        setLoading(false);
      }, 500);
    } catch (error) {
      setLoading(false);
      Swal.fire({
        icon: 'error',
        title: 'Gagal',
        text: error.response?.data?.error || 'Terjadi kesalahan saat memproses URL.',
        confirmButtonColor: '#3B82F6',
        background: '#fff',
        color: '#1e293b',
        customClass: { popup: 'rounded-md' }
      });
    }
  };

  const executeDownload = (fileUrl, prefix, ext) => {
    const filename = `${sanitizeFilename(prefix)}.${ext}`;
    const link = document.createElement('a');
    link.href = `/api/proxy?url=${encodeURIComponent(fileUrl)}&filename=${filename}`;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const downloadFile = (fileUrl, prefix, ext) => {
    if (triggerAd) {
      triggerAd(() => executeDownload(fileUrl, prefix, ext));
    } else {
      executeDownload(fileUrl, prefix, ext);
    }
  };

  // Objek varian animasi dihapus

  const renderContent = () => {
    if (!data) return null;

    if (data.metadata && data.download) {
      return (
        <div className="flex flex-col gap-6">
          <div className="flex flex-col md:flex-row gap-6 items-center md:items-start">
            <div className="relative group shrink-0">
                <img src={data.metadata.images} alt={data.metadata.title} className="w-40 h-40 rounded-md shadow-lg object-cover" />
                <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-md">
                     <Music className="text-white/80" size={40} />
                </div>
            </div>
            <div className="flex-1 text-center md:text-left space-y-2 w-full">
              <h2 className="text-xl font-bold text-slate-900 line-clamp-2">{data.metadata.title}</h2>
              <p className="text-blue-500 font-medium">{data.metadata.artist}</p>
              
              <div className="w-full bg-slate-50 p-2 rounded-md mt-2 border border-slate-100">
                 <audio controls className="w-full h-8" src={data.download}>
                    Browser Anda tidak mendukung elemen audio.
                 </audio>
              </div>

              <button
                onClick={() => downloadFile(data.download, `${data.metadata.artist} - ${data.metadata.title}`, 'mp3')}
                className="w-full md:w-auto mt-4 px-6 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-md font-medium transition-all flex items-center justify-center gap-2 shadow-md"
              >
                <Download size={18} /> Download MP3
              </button>
            </div>
          </div>
          
          {data.metadata.lyrics && (
            <div className="bg-slate-50 p-6 rounded-md border border-slate-200">
              <h3 className="text-sm font-bold mb-3 text-slate-700 uppercase tracking-wider">Lirik Lagu</h3>
              <div className="whitespace-pre-wrap text-slate-600 leading-relaxed text-sm max-h-64 overflow-y-auto custom-scrollbar">
                {data.metadata.lyrics}
              </div>
            </div>
          )}
        </div>
      );
    }

    if (data.author && data.stats) {
      const noWmVideo = data.data.find(item => item.type === 'nowatermark' || item.type === 'nowatermark_hd');
      const audio = data.data.find(item => item.type === 'audio');
      const filenameBase = data.title || `TikTok_${data.author.unique_id || 'User'}`;

      return (
        <div className="space-y-6">
          <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-md border border-slate-200">
            <img src={data.author.avatar} alt={data.author.nickname} className="w-12 h-12 rounded-md border border-slate-300" />
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-slate-900 truncate">{data.author.nickname}</h3>
              <p className="text-xs text-slate-500 truncate">@{data.author.fullname}</p>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2 text-center text-xs text-slate-600">
            <div className="bg-slate-50 p-2 rounded-md border border-slate-100">
                <Video size={16} className="mx-auto mb-1 text-blue-500"/>{data.stats.views}
            </div>
            <div className="bg-slate-50 p-2 rounded-md border border-slate-100">
                <Heart size={16} className="mx-auto mb-1 text-red-500"/>{data.stats.likes}
            </div>
            <div className="bg-slate-50 p-2 rounded-md border border-slate-100">
                <MessageCircle size={16} className="mx-auto mb-1 text-green-500"/>{data.stats.comment}
            </div>
            <div className="bg-slate-50 p-2 rounded-md border border-slate-100">
                <Share2 size={16} className="mx-auto mb-1 text-yellow-500"/>{data.stats.share}
            </div>
          </div>

          <p className="text-sm text-slate-700 leading-relaxed p-3 bg-blue-50 rounded-md border-l-4 border-blue-500 line-clamp-3">
            {data.title}
          </p>

          {!mediaError && (data.cover || noWmVideo) ? (
            <div className="rounded-md overflow-hidden bg-black aspect-video flex items-center justify-center relative border border-slate-200 shadow-md">
                 {activePreview === 'tiktok' && noWmVideo ? (
                    <video 
                        controls 
                        autoPlay 
                        className="w-full h-full" 
                        src={noWmVideo.url} 
                        onError={() => setActivePreview(null)}
                    >
                        Browser tidak mendukung video.
                    </video>
                 ) : (
                    <div className="relative w-full h-full group">
                        <img 
                            src={data.cover} 
                            alt="Cover" 
                            className="w-full h-full object-contain bg-slate-100"
                            onError={(e) => {
                                e.target.onerror = null; 
                                setMediaError(true);
                            }}
                        />
                         {noWmVideo && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/10 group-hover:bg-black/20 transition-all">
                                <button 
                                    onClick={() => setActivePreview('tiktok')}
                                    className="bg-white/20 backdrop-blur-sm p-3 rounded-md text-white hover:bg-white/30 transition-all border border-white/50"
                                >
                                    <PlayCircle size={40} fill="currentColor" className="opacity-90" />
                                </button>
                            </div>
                        )}
                    </div>
                 )}
            </div>
          ) : null}

          <div className="grid gap-3">
            {noWmVideo && (
              <button
                onClick={() => downloadFile(noWmVideo.url, filenameBase, 'mp4')}
                className="w-full py-2.5 bg-blue-500 text-white rounded-md font-medium flex items-center justify-center gap-2 hover:bg-blue-600 transition-colors shadow-md"
              >
                <Video size={18} /> Download Video (No WM)
              </button>
            )}
            {audio && (
              <button
                onClick={() => downloadFile(audio.url, `${filenameBase}_Audio`, 'mp3')}
                className="w-full py-2.5 bg-white text-slate-700 border border-slate-300 rounded-md font-medium flex items-center justify-center gap-2 hover:bg-slate-50 transition-colors shadow-sm"
              >
                <Music size={18} /> Download Audio
              </button>
            )}
          </div>
        </div>
      );
    }

    if (data.medias) {
        const primaryVideo = data.medias.find(m => m.type === 'video');
        
        return (
          <div className="flex flex-col gap-6">
             {!mediaError && (
                 <div className="relative rounded-md border border-slate-200 bg-slate-100 overflow-hidden min-h-[150px] shadow-sm">
                   {activePreview === 'video' && primaryVideo ? (
                       <video 
                          controls 
                          autoPlay 
                          className="w-full h-full aspect-video bg-black" 
                          src={primaryVideo.url}
                          onError={() => setActivePreview(null)} 
                       />
                   ) : (
                      <div className="relative group w-full h-full">
                          <img 
                              src={data.thumbnail} 
                              alt={data.title} 
                              className="w-full h-auto max-h-[400px] object-contain mx-auto" 
                              onError={(e) => {
                                  e.target.onerror = null;
                                  setMediaError(true);
                              }}
                          />
                          {!mediaError && (
                              <>
                                  {primaryVideo && (
                                      <div className="absolute inset-0 flex items-center justify-center bg-black/10 group-hover:bg-black/20 transition-all">
                                          <button 
                                              onClick={() => setActivePreview('video')}
                                              className="bg-white/20 backdrop-blur-sm p-4 rounded-md text-white hover:bg-white/30 transition-all border border-white/50"
                                          >
                                              <PlayCircle size={48} fill="currentColor" className="opacity-90" />
                                          </button>
                                      </div>
                                  )}
                                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                                      <h3 className="text-white font-medium text-sm line-clamp-2">{data.title}</h3>
                                      {data.duration && <p className="text-slate-200 text-xs mt-1">{data.duration}</p>}
                                  </div>
                              </>
                          )}
                      </div>
                   )}
                 </div>
             )}
             
             <div className="space-y-2">
               {data.medias.map((res, idx) => (
                 <button
                   key={idx}
                   onClick={() => downloadFile(res.url, data.title || `Pinterest_Download`, res.extension)}
                   className="w-full flex items-center justify-between p-3 bg-white border border-slate-200 rounded-md hover:border-blue-400 transition-all group"
                 >
                   <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-md ${res.type === 'video' ? 'bg-blue-50 text-blue-600' : 'bg-pink-50 text-pink-600'}`}>
                         {res.type === 'video' ? <Video size={18} /> : <ImageIcon size={18} />}
                      </div>
                      <div className="text-left">
                         <span className="block font-bold text-slate-800 uppercase text-xs">{res.quality}</span>
                         <span className="text-xs text-slate-500 uppercase">{res.extension}</span>
                      </div>
                   </div>
                   <Download size={18} className="text-slate-300 group-hover:text-blue-500 transition-colors" />
                 </button>
               ))}
             </div>
          </div>
        );
    }

    if (Array.isArray(data) && data.length > 0) {
      return (
        <div className="grid grid-cols-1 gap-6">
          {data.map((item, idx) => (
            <div 
              key={idx} 
              className="bg-slate-50 p-4 rounded-md border border-slate-200 flex flex-col gap-3"
            >
               <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-md ${item.type === 'photo' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>
                    {item.type === 'photo' ? <ImageIcon size={20} /> : <Video size={20} />}
                  </div>
                  <span className="text-sm font-medium text-slate-700">Slide {idx + 1}</span>
               </div>
               
               <div className="w-full rounded-md overflow-hidden bg-slate-200 border border-slate-300 shadow-inner">
                   {item.type === 'photo' ? (
                        <img 
                            src={item.url} 
                            className="w-full h-auto max-h-80 object-contain" 
                            alt={`Instagram content ${idx}`}
                            onError={(e) => e.target.closest('.bg-slate-50').style.display = 'none'} 
                        />
                   ) : (
                        <video 
                            controls 
                            className="w-full max-h-80 bg-black" 
                            src={item.url}
                            onError={(e) => {
                                const parent = e.target.parentNode;
                                const img = document.createElement('img');
                                img.src = item.url;
                                img.className = "w-full h-auto max-h-80 object-contain";
                                img.onerror = () => parent.closest('.bg-slate-50').style.display = 'none';
                                parent.innerHTML = '';
                                parent.appendChild(img);
                            }}
                        />
                   )}
               </div>

              <button
                onClick={() => downloadFile(item.url, `Instagram_Post_${idx + 1}`, item.type === 'photo' ? 'jpg' : 'mp4')}
                className="w-full py-2 bg-white border border-blue-500 text-blue-600 rounded-md font-medium text-sm hover:bg-blue-50 transition-colors flex items-center justify-center gap-2 shadow-sm"
              >
                <Download size={14} /> Unduh
              </button>
            </div>
          ))}
        </div>
      );
    }

    if (data.results) {
      const primaryVideo = data.results.find(r => r.type === 'mp4');
      
      return (
        <div className="flex flex-col gap-6">
           {!mediaError && (
               <div className="relative rounded-md border border-slate-200 bg-slate-100 overflow-hidden min-h-[150px] shadow-sm">
                 {activePreview === 'video' && primaryVideo ? (
                     <video 
                        controls 
                        autoPlay 
                        className="w-full h-full aspect-video bg-black" 
                        src={primaryVideo.url}
                        onError={() => setActivePreview(null)} 
                     />
                 ) : (
                    <div className="relative group w-full h-full">
                        <img 
                            src={data.preview} 
                            alt={data.title} 
                            className="w-full h-auto max-h-[300px] object-contain mx-auto" 
                            onError={(e) => {
                                e.target.onerror = null;
                                setMediaError(true);
                            }}
                        />
                        {!mediaError && (
                            <>
                                {primaryVideo && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/10 group-hover:bg-black/20 transition-all">
                                        <button
                                            onClick={() => setActivePreview('video')}
                                            className="bg-white/20 backdrop-blur-sm p-4 rounded-md text-white hover:bg-white/30 transition-all border border-white/50"
                                        >
                                            <PlayCircle size={48} fill="currentColor" className="opacity-90" />
                                        </button>
                                    </div>
                                )}
                                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                                    <h3 className="text-white font-medium text-sm line-clamp-2">{data.title || data.caption}</h3>
                                </div>
                            </>
                        )}
                    </div>
                 )}
               </div>
           )}
           
           <div className="space-y-2">
             {data.results.map((res, idx) => (
               <button
                 key={idx}
                 onClick={() => downloadFile(res.url, data.title || `Video_Download`, res.type)}
                 className="w-full flex items-center justify-between p-3 bg-white border border-slate-200 rounded-md hover:border-blue-400 transition-all group"
               >
                 <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-md ${res.type === 'mp3' ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-600'}`}>
                       {res.type === 'mp3' ? <Music size={18} /> : <Video size={18} />}
                    </div>
                    <div className="text-left">
                       <span className="block font-bold text-slate-800 uppercase text-xs">{res.type}</span>
                       <span className="text-xs text-slate-500">{res.quality}</span>
                    </div>
                 </div>
               
  const itemVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { opacity: 1, scale: 1, transition: { type: 'spring', damping: 20 } }
  };

  const renderContent = () => {
    if (!data) return null;

    // Spotify/Music Style
    if (data.metadata && data.download) {
      return (
        <div className="space-y-6">
          <div className="flex flex-col items-center text-center space-y-4">
            <motion.div 
              whileHover={{ rotate: 5, scale: 1.05 }}
              className="relative w-48 h-48"
            >
              <img src={data.metadata.images} className="w-full h-full rounded-3xl shadow-2xl object-cover" alt="Cover" />
              <div className="absolute -bottom-2 -right-2 bg-indigo-600 p-3 rounded-2xl shadow-lg">
                <Music className="text-white" size={24} />
              </div>
            </motion.div>
            <div>
              <h2 className="text-2xl font-bold text-slate-800">{data.metadata.title}</h2>
              <p className="text-indigo-500 font-semibold">{data.metadata.artist}</p>
            </div>
          </div>

          <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
             <audio controls className="w-full" src={data.download} />
          </div>

          <button
            onClick={() => downloadFile(data.download, `${data.metadata.artist} - ${data.metadata.title}`, 'mp3')}
            className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold transition-all shadow-lg shadow-indigo-200 flex items-center justify-center gap-3"
          >
            <Download size={20} /> Unduh MP3
          </button>
        </div>
      );
    }

    // TikTok Style
    if (data.author && data.stats) {
      const noWmVideo = data.data.find(item => item.type === 'nowatermark' || item.type === 'nowatermark_hd');
      return (
        <div className="space-y-6">
          <div className="flex items-center gap-4 p-4 bg-white rounded-2xl shadow-sm border border-slate-100">
            <img src={data.author.avatar} className="w-14 h-14 rounded-full border-2 border-indigo-100" />
            <div className="flex-1">
              <h3 className="font-bold text-slate-800">@{data.author.unique_id}</h3>
              <p className="text-xs text-slate-500">{data.author.nickname}</p>
            </div>
          </div>

          <div className="aspect-[9/16] max-h-[500px] bg-black rounded-3xl overflow-hidden relative group shadow-2xl mx-auto">
            {activePreview === 'tiktok' ? (
              <video src={noWmVideo?.url} controls autoPlay className="w-full h-full object-contain" />
            ) : (
              <div className="relative w-full h-full cursor-pointer" onClick={() => setActivePreview('tiktok')}>
                <img src={data.cover} className="w-full h-full object-cover opacity-80" />
                <PlayCircle size={64} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white/90" />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => downloadFile(noWmVideo?.url, data.title, 'mp4')}
              className="py-4 bg-slate-900 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-black transition-all"
            >
              <Video size={20} /> Video
            </button>
            <button
              onClick={() => downloadFile(data.data.find(i => i.type === 'audio')?.url, data.title, 'mp3')}
              className="py-4 bg-indigo-50 text-indigo-600 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-100 transition-all"
            >
              <Music size={20} /> Audio
            </button>
          </div>
        </div>
      );
    }

    return <div className="text-center py-10 text-slate-400">Format didukung, memproses tampilan...</div>;
  };

  return (
    <div className="min-h-screen bg-[#FDFDFF] text-slate-900 selection:bg-indigo-100">
      {/* Background Ornaments */}
      <div className="fixed inset-0 overflow-hidden -z-10">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-indigo-50 rounded-full blur-[120px] opacity-60" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] bg-purple-50 rounded-full blur-[100px] opacity-60" />
      </div>

      <main className="max-w-2xl mx-auto px-6 pt-20 pb-32">
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-12"
        >
          {/* Header */}
          <div className="text-center space-y-4">
            <motion.div 
              initial={{ scale: 0 }} 
              animate={{ scale: 1 }} 
              className="inline-block p-4 bg-white shadow-xl shadow-indigo-100 rounded-[2rem] text-indigo-600 mb-2"
            >
              <Sparkles size={32} fill="currentColor" className="opacity-20" />
            </motion.div>
            <h1 className="text-5xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-900 via-indigo-900 to-slate-900">
              Media Saver
            </h1>
            <p className="text-slate-500 font-medium">Download video & musik favorit tanpa ribet.</p>
          </div>

          {/* Search Box */}
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-[2.5rem] blur opacity-20 group-hover:opacity-30 transition duration-1000"></div>
            <form 
              onSubmit={handleSearch}
              className="relative bg-white border border-slate-100 rounded-[2rem] p-2 flex items-center shadow-2xl shadow-indigo-100/50"
            >
              <div className="pl-6 text-slate-400">
                <LinkIcon size={20} />
              </div>
              <input
                type="text"
                placeholder="Tempel link video/musik di sini..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="flex-1 px-4 py-4 bg-transparent outline-none font-medium text-slate-700 placeholder:text-slate-300"
              />
              <button
                disabled={loading || !url}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 text-white p-4 rounded-[1.5rem] transition-all shadow-lg shadow-indigo-200 active:scale-95"
              >
                {loading ? <Loader2 className="animate-spin" size={24} /> : <Search size={24} />}
              </button>
            </form>
            
            <AnimatePresence>
              {loading && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  exit={{ opacity: 0 }}
                  className="absolute -bottom-8 left-6 right-6"
                >
                  <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                    <motion.div 
                      className="h-full bg-indigo-500"
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Platform Support Icons */}
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-4 opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
            {[Youtube, Instagram, Facebook, Music, Video, ImageIcon].map((Icon, i) => (
              <div key={i} className="flex justify-center p-4 bg-white border border-slate-50 rounded-2xl shadow-sm">
                <Icon size={20} />
              </div>
            ))}
          </div>
        </motion.div>
      </main>

      {/* Footer Signature */}
      <footer className="py-10 text-center">
        <a href="https://ariyo.my.id" className="text-xs font-bold tracking-widest text-slate-300 hover:text-indigo-400 transition-colors uppercase">
          Crafted by Ariyo
        </a>
      </footer>

      {/* Result Modal - Smooth Overlay */}
      <AnimatePresence>
        {data && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setData(null)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-[3rem] shadow-2xl max-h-[92vh] overflow-y-auto"
            >
              <div className="max-w-xl mx-auto px-6 pb-12">
                <div className="sticky top-0 bg-white pt-6 pb-4 mb-2 flex justify-between items-center border-b border-slate-50">
                  <span className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Hasil Pencarian</span>
                  <button onClick={() => setData(null)} className="p-2 bg-slate-50 rounded-full hover:bg-slate-100 transition-colors">
                    <X size={20} />
                  </button>
                </div>
                <div className="py-4">
                  {renderContent()}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
            <motion.div
              initial={{ y: "100%", opacity: 0.5 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 30, stiffness: 400 }}
              className={`
                fixed z-[70] bg-white shadow-2xl transform-gpu will-change-transform
                /* Mobile: Full Width di Bawah */
                bottom-0 left-0 right-0 rounded-t-[32px]
                /* Desktop: Center-Center */
                md:bottom-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 
                md:w-full md:max-w-md md:rounded-[32px]
                max-h-[90vh] overflow-hidden flex flex-col
              `}
            >
              {/* Handle Bar (Mobile Only) */}
              <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mt-4 mb-2 md:hidden" />

              <div className="p-6 overflow-y-auto custom-scrollbar">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest">Preview Media</h2>
                  <button onClick={() => setData(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                    <X size={20} className="text-slate-500" />
                  </button>
                </div>
                
                <ModalContent data={data} downloadFile={downloadFile} />
              </div>

              {/* Safe area filler for mobile */}
              <div className="h-6 md:hidden" />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

  const downloadFile = (fileUrl, prefix, ext) => {
    const execute = () => {
      const filename = `${prefix?.substring(0,20) || 'media'}.${ext}`;
      window.open(`/api/proxy?url=${encodeURIComponent(fileUrl)}&filename=${filename}`, '_blank');
    };
    triggerAd ? triggerAd(execute) : execute();
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] relative overflow-hidden flex flex-col">
      {/* Background Static (No Blur Animation) */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-blue-100/50 rounded-full blur-[100px] pointer-events-none" />
      
      <main className="flex-1 flex flex-col items-center justify-center p-6 z-10">
        <div className="w-full max-w-lg">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
            <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-2">Media Saver</h1>
            <p className="text-slate-500">Fast. Simple. No Lag.</p>
          </motion.div>

          <div className="bg-white p-2 rounded-2xl shadow-2xl shadow-blue-100 border border-slate-100">
            <form onSubmit={handleSearch} className="relative flex items-center">
              <input 
                type="text" 
                placeholder="Paste link here..."
                className="w-full p-4 pl-6 pr-14 bg-transparent outline-none font-medium text-slate-700"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
              <button disabled={loading} className="absolute right-2 p-3 bg-blue-600 text-white rounded-xl active:scale-95 transition-transform">
                {loading ? <Loader2 className="animate-spin" size={20} /> : <Search size={20} />}
              </button>
            </form>
            {loading && <ProgressBar progress={progress} />}
          </div>
        </div>
      </main>

      {/* FOOTER TETAP SAMA TAPI PAKAI MEMO DI LUAR */}

      <AnimatePresence>
        {data && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setData(null)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-[4px] z-40"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }} // Stiffness ditinggiin biar responsif
              className="fixed bottom-0 left-0 right-0 bg-white rounded-t-[32px] z-50 max-h-[85vh] overflow-y-auto shadow-2xl will-change-transform"
            >
              <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mt-4 mb-2" />
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-lg font-black text-slate-800">PREVIEW</h2>
                    <button onClick={() => setData(null)} className="p-2 bg-slate-100 rounded-full"><X size={20}/></button>
                </div>
                
                {/* INI KUNCINYA: Komponen konten dipisah lur */}
                <ModalContent 
                  data={data} 
                  downloadFile={downloadFile}
                  activePreview={activePreview}
                  setActivePreview={setActivePreview}
                  mediaError={mediaError}
                  setMediaError={setMediaError}
                />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
    }
    
          <div className="bg-white/80 backdrop-blur-md p-2 rounded-2xl shadow-xl border border-white/50">
            <form onSubmit={handleSearch} className="relative flex items-center">
              <div className="absolute left-4 text-slate-400"><LinkIcon size={20} /></div>
              <input
                type="text"
                placeholder="Tempel tautan di sini..."
                className="w-full pl-12 pr-16 py-4 bg-transparent outline-none"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
              <button 
                type="submit" 
                disabled={loading}
                className="absolute right-1.5 p-3 bg-blue-600 text-white rounded-xl disabled:bg-slate-300"
              >
                {loading ? <Loader2 className="animate-spin" size={20} /> : <Search size={20} />}
              </button>
            </form>
            {loading && <ProgressBar progress={progress} />}
          </div>
        </div>
      </main>

      <footer className="z-10 flex flex-col items-center pb-8 px-4">
          <a href="https://ariyo.my.id" target="_blank" className="text-sm text-slate-400 mb-6">Ariyo.</a>
          <FooterIcons />
      </footer>

      <AnimatePresence>
        {data && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setData(null)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40"
            />
            <motion.div
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl z-50 max-h-[90vh] overflow-y-auto"
            >
              <div className="sticky top-0 bg-white border-b p-5 flex justify-between items-center">
                <h2 className="font-bold">Preview Media</h2>
                <button onClick={() => setData(null)} className="p-2"><X size={20} /></button>
              </div>
              <div className="p-6">{/* Panggil renderContent() di sini */}</div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
    visible: {
      y: 0,
      opacity: 1,
      transition: { type: 'spring', stiffness: 300, damping: 24 }
    }
  };

  const overslide = {
    hidden: { y: '100%', opacity: 0, scale: 0.95 },
    visible: { 
      y: 0, 
      opacity: 1, 
      scale: 1,
      transition: { type: 'spring', damping: 25, stiffness: 200 } 
    },
    exit: { y: '100%', opacity: 0, scale: 0.95, transition: { duration: 0.2 } }
  };

  const floatingVariants = {
    start: { y: 0 },
    end: { y: -10 }
  };

  const renderContent = () => {
    if (!data) return null;

    if (data.metadata && data.download) {
      return (
        <div className="flex flex-col gap-6">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col md:flex-row gap-6 items-center md:items-start"
          >
            <div className="relative group shrink-0">
                <img src={data.metadata.images} alt={data.metadata.title} className="w-40 h-40 rounded-md shadow-lg object-cover transition-transform duration-300 group-hover:scale-105" />
                <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-md">
                     <Music className="text-white/80" size={40} />
                </div>
            </div>
            <div className="flex-1 text-center md:text-left space-y-2 w-full">
              <h2 className="text-xl font-bold text-slate-900 line-clamp-2">{data.metadata.title}</h2>
              <p className="text-blue-500 font-medium">{data.metadata.artist}</p>
              
              <div className="w-full bg-slate-50 p-2 rounded-md mt-2 border border-slate-100">
                 <audio controls className="w-full h-8" src={data.download}>
                    Browser Anda tidak mendukung elemen audio.
                 </audio>
              </div>

              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => downloadFile(data.download, `${data.metadata.artist} - ${data.metadata.title}`, 'mp3')}
                className="w-full md:w-auto mt-4 px-6 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-md font-medium transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
              >
                <Download size={18} /> Download MP3
              </motion.button>
            </div>
          </motion.div>
          
          {data.metadata.lyrics && (
            <motion.div 
               initial={{ opacity: 0, height: 0 }}
               animate={{ opacity: 1, height: 'auto' }}
               className="bg-slate-50 p-6 rounded-md border border-slate-200"
            >
              <h3 className="text-sm font-bold mb-3 text-slate-700 uppercase tracking-wider">Lirik Lagu</h3>
              <div className="whitespace-pre-wrap text-slate-600 leading-relaxed text-sm max-h-64 overflow-y-auto custom-scrollbar">
                {data.metadata.lyrics}
              </div>
            </motion.div>
          )}
        </div>
      );
    }

    if (data.author && data.stats) {
      const noWmVideo = data.data.find(item => item.type === 'nowatermark' || item.type === 'nowatermark_hd');
      const audio = data.data.find(item => item.type === 'audio');
      const filenameBase = data.title || `TikTok_${data.author.unique_id || 'User'}`;

      return (
        <div className="space-y-6">
          <motion.div 
             initial={{ x: -20, opacity: 0 }}
             animate={{ x: 0, opacity: 1 }}
             className="flex items-center gap-4 bg-slate-50 p-4 rounded-md border border-slate-200"
          >
            <img src={data.author.avatar} alt={data.author.nickname} className="w-12 h-12 rounded-md border border-slate-300" />
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-slate-900 truncate">{data.author.nickname}</h3>
              <p className="text-xs text-slate-500 truncate">@{data.author.fullname}</p>
            </div>
          </motion.div>

          <div className="grid grid-cols-4 gap-2 text-center text-xs text-slate-600">
            <motion.div whileHover={{ y: -5 }} className="bg-slate-50 p-2 rounded-md border border-slate-100 transition-all">
                <Video size={16} className="mx-auto mb-1 text-blue-500"/>{data.stats.views}
            </motion.div>
            <motion.div whileHover={{ y: -5 }} className="bg-slate-50 p-2 rounded-md border border-slate-100 transition-all">
                <Heart size={16} className="mx-auto mb-1 text-red-500"/>{data.stats.likes}
            </motion.div>
            <motion.div whileHover={{ y: -5 }} className="bg-slate-50 p-2 rounded-md border border-slate-100 transition-all">
                <MessageCircle size={16} className="mx-auto mb-1 text-green-500"/>{data.stats.comment}
            </motion.div>
            <motion.div whileHover={{ y: -5 }} className="bg-slate-50 p-2 rounded-md border border-slate-100 transition-all">
                <Share2 size={16} className="mx-auto mb-1 text-yellow-500"/>{data.stats.share}
            </motion.div>
          </div>

          <p className="text-sm text-slate-700 leading-relaxed p-3 bg-blue-50 rounded-md border-l-4 border-blue-500 line-clamp-3">
            {data.title}
          </p>

          {!mediaError && (data.cover || noWmVideo) ? (
            <div className="rounded-md overflow-hidden bg-black aspect-video flex items-center justify-center relative border border-slate-200 shadow-md">
                 {activePreview === 'tiktok' && noWmVideo ? (
                    <video 
                        controls 
                        autoPlay 
                        className="w-full h-full" 
                        src={noWmVideo.url} 
                        onError={() => setActivePreview(null)}
                    >
                        Browser tidak mendukung video.
                    </video>
                 ) : (
                    <div className="relative w-full h-full group">
                        <img 
                            src={data.cover} 
                            alt="Cover" 
                            className="w-full h-full object-contain bg-slate-100"
                            onError={(e) => {
                                e.target.onerror = null; 
                                setMediaError(true);
                            }}
                        />
                         {noWmVideo && (
                            <motion.div 
                              initial={{ opacity: 0 }} 
                              animate={{ opacity: 1 }}
                              className="absolute inset-0 flex items-center justify-center bg-black/10 group-hover:bg-black/20 transition-all"
                            >
                                <motion.button 
                                    whileTap={{ scale: 0.9 }}
                                    whileHover={{ scale: 1.1 }}
                                    onClick={() => setActivePreview('tiktok')}
                                    className="bg-white/20 backdrop-blur-sm p-3 rounded-md text-white hover:bg-white/30 transition-all border border-white/50"
                                >
                                    <PlayCircle size={40} fill="currentColor" className="opacity-90" />
                                </motion.button>
                            </motion.div>
                        )}
                    </div>
                 )}
            </div>
          ) : null}

          <div className="grid gap-3">
            {noWmVideo && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => downloadFile(noWmVideo.url, filenameBase, 'mp4')}
                className="w-full py-2.5 bg-blue-500 text-white rounded-md font-medium flex items-center justify-center gap-2 hover:bg-blue-600 transition-colors shadow-md"
              >
                <Video size={18} /> Download Video (No WM)
              </motion.button>
            )}
            {audio && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => downloadFile(audio.url, `${filenameBase}_Audio`, 'mp3')}
                className="w-full py-2.5 bg-white text-slate-700 border border-slate-300 rounded-md font-medium flex items-center justify-center gap-2 hover:bg-slate-50 transition-colors shadow-sm"
              >
                <Music size={18} /> Download Audio
              </motion.button>
            )}
          </div>
        </div>
      );
    }

    if (data.medias) {
        const primaryVideo = data.medias.find(m => m.type === 'video');
        const primaryImage = data.medias.find(m => m.type === 'image');
        
        return (
          <div className="flex flex-col gap-6">
             {!mediaError && (
                 <div className="relative rounded-md border border-slate-200 bg-slate-100 overflow-hidden min-h-[150px] shadow-sm">
                   {activePreview === 'video' && primaryVideo ? (
                       <motion.video 
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          controls 
                          autoPlay 
                          className="w-full h-full aspect-video bg-black" 
                          src={primaryVideo.url}
                          onError={() => setActivePreview(null)} 
                       />
                   ) : (
                      <div className="relative group w-full h-full">
                          <img 
                              src={data.thumbnail} 
                              alt={data.title} 
                              className="w-full h-auto max-h-[400px] object-contain mx-auto" 
                              onError={(e) => {
                                  e.target.onerror = null;
                                  setMediaError(true);
                              }}
                          />
                          {!mediaError && (
                              <>
                                  {primaryVideo && (
                                      <motion.div 
                                        initial={{ opacity: 0 }} 
                                        animate={{ opacity: 1 }}
                                        className="absolute inset-0 flex items-center justify-center bg-black/10 group-hover:bg-black/20 transition-all"
                                      >
                                          <motion.button 
                                              whileHover={{ scale: 1.1 }}
                                              whileTap={{ scale: 0.9 }}
                                              onClick={() => setActivePreview('video')}
                                              className="bg-white/20 backdrop-blur-sm p-4 rounded-md text-white hover:bg-white/30 transition-all border border-white/50"
                                          >
                                              <PlayCircle size={48} fill="currentColor" className="opacity-90" />
                                          </motion.button>
                                      </motion.div>
                                  )}
                                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                                      <h3 className="text-white font-medium text-sm line-clamp-2">{data.title}</h3>
                                      {data.duration && <p className="text-slate-200 text-xs mt-1">{data.duration}</p>}
                                  </div>
                              </>
                          )}
                      </div>
                   )}
                 </div>
             )}
             
             <div className="space-y-2">
               {data.medias.map((res, idx) => (
                 <motion.button
                   key={idx}
                   initial={{ x: -20, opacity: 0 }}
                   animate={{ x: 0, opacity: 1 }}
                   transition={{ delay: idx * 0.05 }}
                   whileHover={{ x: 5 }}
                   onClick={() => downloadFile(res.url, data.title || `Pinterest_Download`, res.extension)}
                   className="w-full flex items-center justify-between p-3 bg-white border border-slate-200 rounded-md hover:border-blue-400 hover:shadow-md transition-all group"
                 >
                   <div className="flex items-center gap-3">
                      <motion.div 
                        whileHover={{ rotate: 15 }}
                        className={`p-2 rounded-md ${res.type === 'video' ? 'bg-blue-50 text-blue-600' : 'bg-pink-50 text-pink-600'}`}
                      >
                         {res.type === 'video' ? <Video size={18} /> : <ImageIcon size={18} />}
                      </motion.div>
                      <div className="text-left">
                         <span className="block font-bold text-slate-800 uppercase text-xs">{res.quality}</span>
                         <span className="text-xs text-slate-500 uppercase">{res.extension}</span>
                      </div>
                   </div>
                   <Download size={18} className="text-slate-300 group-hover:text-blue-500 transition-colors" />
                 </motion.button>
               ))}
             </div>
          </div>
        );
    }

    if (Array.isArray(data) && data.length > 0) {
      return (
        <div className="grid grid-cols-1 gap-6">
          {data.map((item, idx) => (
            <motion.div 
              key={idx} 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="bg-slate-50 p-4 rounded-md border border-slate-200 flex flex-col gap-3"
            >
               <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-md ${item.type === 'photo' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>
                    {item.type === 'photo' ? <ImageIcon size={20} /> : <Video size={20} />}
                  </div>
                  <span className="text-sm font-medium text-slate-700">Slide {idx + 1}</span>
               </div>
               
               <div className="w-full rounded-md overflow-hidden bg-slate-200 border border-slate-300 shadow-inner">
                   {item.type === 'photo' ? (
                        <img 
                            src={item.url} 
                            className="w-full h-auto max-h-80 object-contain" 
                            alt={`Instagram content ${idx}`}
                            onError={(e) => e.target.closest('.bg-slate-50').style.display = 'none'} 
                        />
                   ) : (
                        <video 
                            controls 
                            className="w-full max-h-80 bg-black" 
                            src={item.url}
                            onError={(e) => {
                                const parent = e.target.parentNode;
                                const img = document.createElement('img');
                                img.src = item.url;
                                img.className = "w-full h-auto max-h-80 object-contain";
                                img.onerror = () => parent.closest('.bg-slate-50').style.display = 'none';
                                parent.innerHTML = '';
                                parent.appendChild(img);
                            }}
                        />
                   )}
               </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => downloadFile(item.url, `Instagram_Post_${idx + 1}`, item.type === 'photo' ? 'jpg' : 'mp4')}
                className="w-full py-2 bg-white border border-blue-500 text-blue-600 rounded-md font-medium text-sm hover:bg-blue-50 transition-colors flex items-center justify-center gap-2 shadow-sm"
              >
                <Download size={14} /> Unduh
              </motion.button>
            </motion.div>
          ))}
        </div>
      );
    }

    if (data.results) {
      const primaryVideo = data.results.find(r => r.type === 'mp4');
      
      return (
        <div className="flex flex-col gap-6">
           {!mediaError && (
               <div className="relative rounded-md border border-slate-200 bg-slate-100 overflow-hidden min-h-[150px] shadow-sm">
                 {activePreview === 'video' && primaryVideo ? (
                     <video 
                        controls 
                        autoPlay 
                        className="w-full h-full aspect-video bg-black" 
                        src={primaryVideo.url}
                        onError={() => setActivePreview(null)} 
                     />
                 ) : (
                    <div className="relative group w-full h-full">
                        <img 
                            src={data.preview} 
                            alt={data.title} 
                            className="w-full h-auto max-h-[300px] object-contain mx-auto" 
                            onError={(e) => {
                                e.target.onerror = null;
                                setMediaError(true);
                            }}
                        />
                        {!mediaError && (
                            <>
                                {primaryVideo && (
                                    <motion.div 
                                       initial={{ opacity: 0 }}
                                       animate={{ opacity: 1 }}
                                       className="absolute inset-0 flex items-center justify-center bg-black/10 group-hover:bg-black/20 transition-all"
                                    >
                                        <motion.button
                                            whileHover={{ scale: 1.1 }}
                                            whileTap={{ scale: 0.9 }}
                                            onClick={() => setActivePreview('video')}
                                            className="bg-white/20 backdrop-blur-sm p-4 rounded-md text-white hover:bg-white/30 transition-all border border-white/50"
                                        >
                                            <PlayCircle size={48} fill="currentColor" className="opacity-90" />
                                        </motion.button>
                                    </motion.div>
                                )}
                                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                                    <h3 className="text-white font-medium text-sm line-clamp-2">{data.title || data.caption}</h3>
                                </div>
                            </>
                        )}
                    </div>
                 )}
               </div>
           )}
           
           <div className="space-y-2">
             {data.results.map((res, idx) => (
               <motion.button
                 key={idx}
                 initial={{ x: -20, opacity: 0 }}
                 animate={{ x: 0, opacity: 1 }}
                 transition={{ delay: idx * 0.05 }}
                 whileHover={{ x: 5 }}
                 onClick={() => downloadFile(res.url, data.title || `Video_Download`, res.type)}
                 className="w-full flex items-center justify-between p-3 bg-white border border-slate-200 rounded-md hover:border-blue-400 hover:shadow-md transition-all group"
               >
                 <div className="flex items-center gap-3">
                    <motion.div
                       whileHover={{ rotate: 15 }}
                       className={`p-2 rounded-md ${res.type === 'mp3' ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-600'}`}
                    >
                       {res.type === 'mp3' ? <Music size={18} /> : <Video size={18} />}
                    </motion.div>
                    <div className="text-left">
                       <span className="block font-bold text-slate-800 uppercase text-xs">{res.type}</span>
                       <span className="text-xs text-slate-500">{res.quality}</span>
                    </div>
                 </div>
                 <Download size={18} className="text-slate-300 group-hover:text-blue-500 transition-colors" />
               </motion.button>
             ))}
           </div>
        </div>
      );
    }

    return <div className="text-center text-slate-500 text-sm py-4">Format media tidak dikenali.</div>;
  };

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden bg-[#F8FAFC]">
      <motion.div 
        animate={{ 
          x: [0, 100, 0],
          y: [0, -100, 0],
          scale: [1, 1.1, 1]
        }}
        transition={{ 
          duration: 20, 
          repeat: Infinity, 
          ease: "linear" 
        }}
        className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-blue-300/20 rounded-full blur-3xl pointer-events-none"
      />
      <motion.div 
        animate={{ 
          x: [0, -100, 0],
          y: [0, 100, 0],
          scale: [1, 1.2, 1]
        }}
        transition={{ 
          duration: 25, 
          repeat: Infinity, 
          ease: "linear" 
        }}
        className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-purple-300/20 rounded-full blur-3xl pointer-events-none"
      />

      <main className="flex-1 flex flex-col items-center justify-center p-4 md:p-8 relative z-10">
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="w-full max-w-lg space-y-6 z-10"
        >
          <motion.div variants={itemVariants} className="text-center space-y-2">
            <motion.div 
               variants={floatingVariants}
               animate="end"
               transition={{ duration: 2, repeat: Infinity, repeatType: "reverse" }}
               className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white mb-4 shadow-lg shadow-blue-500/30"
            >
               <LinkIcon size={32} />
            </motion.div>
            <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">Media Saver</h1>
            <p className="text-slate-500 text-base">Unduh konten favoritmu dalam satu klik.</p>
          </motion.div>

          <motion.div variants={overslide} className="bg-white/80 backdrop-blur-md p-2 rounded-2xl shadow-xl border border-white/50">
              <form onSubmit={handleSearch} className="relative flex items-center">
              <div className="absolute left-4 text-slate-400">
                  <LinkIcon size={20} />
              </div>
              <input
                  type="text"
                  placeholder="Tempel tautan di sini..."
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  disabled={loading}
                  className="w-full pl-12 pr-16 py-4 bg-transparent text-base text-slate-700 placeholder:text-slate-400 font-medium focus:outline-none disabled:opacity-50 rounded-xl"
              />
              <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  type="submit"
                  disabled={loading || !url}
                  className="absolute right-1.5 p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors disabled:bg-slate-300 shadow-md"
              >
                  {loading ? <Loader2 className="animate-spin" size={20} /> : <Search size={20} />}
              </motion.button>
              </form>
              
              {loading && (
                  <div className="mt-3 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                      <motion.div 
                          className="h-full bg-gradient-to-r from-blue-400 to-blue-600"
                          initial={{ width: 0 }}
                          animate={{ width: `${progress}%` }}
                          transition={{ ease: "linear" }}
                      />
                  </div>
              )}
          </motion.div>
        </motion.div>
      </main>

      <footer className="relative z-10 flex flex-col items-center pb-6 pt-2 px-4">
          <motion.a 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            href="https://ariyo.my.id" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-sm font-medium text-slate-400 hover:text-blue-500 transition-colors mb-6"
          >
              Ariyo.
          </motion.a>

          <motion.div 
             initial="hidden"
             animate="visible"
             variants={containerVariants}
             className="w-full max-w-md"
          >
            <div className="grid grid-cols-3 gap-3 sm:gap-4">
                {[
                  { icon: Video, name: 'TikTok', color: 'text-slate-600', hoverColor: 'hover:border-slate-800' },
                  { icon: Music, name: 'Spotify', color: 'text-slate-600', hoverColor: 'hover:border-green-500' },
                  { icon: Youtube, name: 'YouTube', color: 'text-slate-600', hoverColor: 'hover:border-red-500' },
                  { icon: Facebook, name: 'Facebook', color: 'text-slate-600', hoverColor: 'hover:border-blue-700' },
                  { icon: Instagram, name: 'Instagram', color: 'text-slate-600', hoverColor: 'hover:border-pink-500' },
                  { icon: ImageIcon, name: 'Pinterest', color: 'text-slate-600', hoverColor: 'hover:border-red-600' }
                ].map((platform, index) => (
                  <motion.div
                    key={index}
                    variants={itemVariants}
                    whileHover={{ y: -5 }}
                    className="flex flex-col items-center gap-2 p-4 bg-white/70 backdrop-blur-sm border border-slate-200 rounded-xl shadow-sm cursor-default transition-all group"
                  >
                    <platform.icon size={28} className={`${platform.color} group-hover:scale-110 transition-transform duration-300`} />
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{platform.name}</span>
                  </motion.div>
                ))}
            </div>
          </motion.div>
      </footer>

      <AnimatePresence>
        {data && (
          <>
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setData(null)}
                className="fixed inset-0 bg-slate-900/50 backdrop-blur-md z-40"
            />
            <motion.div
                key="result-modal"
                initial="hidden"
                animate="visible"
                exit="exit"
                variants={overslide}
                className="fixed bottom-0 left-0 right-0 md:top-auto md:left-1/2 md:bottom-auto md:-translate-x-1/2 md:translate-y-0 md:my-auto bg-white/90 backdrop-blur-xl rounded-t-2xl md:rounded-2xl shadow-2xl z-50 w-full md:max-w-xl max-h-[90vh] overflow-y-auto border border-white/20"
            >
                <div className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-slate-100 p-5 flex justify-between items-center z-20">
                    <h2 className="text-base font-bold text-slate-800 uppercase tracking-wide">Preview Media</h2>
                    <motion.button 
                       whileTap={{ scale: 0.9 }}
                       onClick={() => setData(null)} 
                       className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors"
                    >
                        <X size={20} />
                    </motion.button>
                </div>

                <div className="p-6 pb-12">
                    {renderContent()}
                </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
