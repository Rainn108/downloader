import { useState, useEffect } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
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

  const renderContent = () => {
    if (!data) return null;

    if (data.metadata && data.download) {
      return (
        <div className="flex flex-col gap-6">
          <div className="flex flex-col md:flex-row gap-6 items-center md:items-start">
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

              <button
                onClick={() => downloadFile(data.download, `${data.metadata.artist} - ${data.metadata.title}`, 'mp3')}
                className="w-full md:w-auto mt-4 px-6 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-md font-medium transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg active:scale-95"
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
            <div>
              <h3 className="font-bold text-slate-800">{data.author.nickname}</h3>
              <p className="text-xs text-slate-500">@{data.author.unique_id}</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="text-slate-700 text-sm leading-relaxed bg-slate-50 p-4 rounded-md border border-slate-200">
              {data.title}
            </div>
            <div className="flex items-center gap-6 text-xs text-slate-500">
              <div className="flex items-center gap-1.5">
                <Heart size={14} className="text-red-500" />
                <span className="font-medium">{data.stats.likeCount?.toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <MessageCircle size={14} className="text-blue-500" />
                <span className="font-medium">{data.stats.commentCount?.toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Share2 size={14} className="text-purple-500" />
                <span className="font-medium">{data.stats.shareCount?.toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <PlayCircle size={14} className="text-green-500" />
                <span className="font-medium">{data.stats.playCount?.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {noWmVideo && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Preview Video</h4>
              {!mediaError ? (
                <div className="relative rounded-md overflow-hidden border border-slate-200 bg-black max-h-[400px]">
                  <video 
                    controls 
                    className="w-full max-h-[400px] object-contain"
                    onError={() => setMediaError(true)}
                    preload="metadata"
                  >
                    <source src={noWmVideo.url} type="video/mp4" />
                    Browser Anda tidak mendukung video.
                  </video>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-8 bg-slate-50 rounded-md border border-slate-200 text-center">
                  <Video size={40} className="text-slate-300 mb-3" />
                  <p className="text-sm text-slate-500 mb-3">Pratinjau video tidak dapat dimuat</p>
                  <button
                    onClick={() => downloadFile(noWmVideo.url, filenameBase, 'mp4')}
                    className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md text-sm font-medium transition-colors flex items-center gap-2"
                  >
                    <Download size={16} /> Download Video
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pilihan Download</h4>
            {data.data.map((res, idx) => (
              <button
                key={idx}
                onClick={() => downloadFile(res.url, filenameBase, res.type)}
                className="w-full flex items-center justify-between p-3 bg-white border border-slate-200 rounded-md hover:border-blue-400 hover:shadow-md transition-all group"
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
                <Download size={18} className="text-slate-300 group-hover:text-blue-500 transition-colors" />
              </button>
            ))}
          </div>
        </div>
      );
    }

    if (data.url && Array.isArray(data.url)) {
      return (
        <div className="space-y-6">
          <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-md border border-slate-200">
            <img src={data.ownerPicture} alt={data.ownerUsername} className="w-12 h-12 rounded-md border border-slate-300" />
            <div>
              <h3 className="font-bold text-slate-800">{data.ownerFullName}</h3>
              <p className="text-xs text-slate-500">@{data.ownerUsername}</p>
            </div>
          </div>

          <div className="text-slate-700 text-sm leading-relaxed bg-slate-50 p-4 rounded-md border border-slate-200">
            {data.caption || 'Tidak ada deskripsi.'}
          </div>

          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Gambar ({data.url.length})</h4>
            <div className="grid grid-cols-2 gap-3">
              {data.url.map((imgUrl, idx) => (
                <div key={idx} className="relative group">
                  <img 
                    src={imgUrl} 
                    alt={`Image ${idx + 1}`} 
                    className="w-full aspect-square object-cover rounded-md border border-slate-200 cursor-pointer"
                    onClick={() => setActivePreview({ type: 'image', url: imgUrl })}
                  />
                  <button
                    onClick={() => downloadFile(imgUrl, `${data.ownerUsername}_${idx + 1}`, 'jpg')}
                    className="absolute bottom-2 right-2 p-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Download size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    if (data.medias) {
      return (
        <div className="space-y-6">
           <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-md border border-slate-200">
             <div>
               <h3 className="font-bold text-slate-800">{data.title || 'Konten Instagram'}</h3>
             </div>
           </div>

           <div className="space-y-3">
             <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pilihan Download</h4>
             {data.medias.map((res, idx) => (
               <button
                 key={idx}
                 onClick={() => downloadFile(res.url, data.title || `Video_Download`, res.type)}
                 className="w-full flex items-center justify-between p-3 bg-white border border-slate-200 rounded-md hover:border-blue-400 hover:shadow-md transition-all group"
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
                 <Download size={18} className="text-slate-300 group-hover:text-blue-500 transition-colors" />
               </button>
             ))}
           </div>
        </div>
      );
    }

    return <div className="text-center text-slate-500 text-sm py-4">Format media tidak dikenali.</div>;
  };

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden bg-[#F8FAFC]">
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-blue-300/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-purple-300/20 rounded-full blur-3xl pointer-events-none" />

      <main className="flex-1 flex flex-col items-center justify-center p-4 md:p-8 relative z-10">
        <div className="w-full max-w-lg space-y-6 z-10">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white mb-4 shadow-lg shadow-blue-500/30">
               <LinkIcon size={32} />
            </div>
            <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">Media Saver</h1>
            <p className="text-slate-500 text-base">Unduh konten favoritmu dalam satu klik.</p>
          </div>

          <div className="bg-white/80 backdrop-blur-md p-2 rounded-2xl shadow-xl border border-white/50">
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
              <button
                  type="submit"
                  disabled={loading || !url}
                  className="absolute right-1.5 p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors disabled:bg-slate-300 shadow-md active:scale-95"
              >
                  {loading ? <Loader2 className="animate-spin" size={20} /> : <Search size={20} />}
              </button>
              </form>
              
              {loading && (
                  <div className="mt-3 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div 
                          className="h-full bg-gradient-to-r from-blue-400 to-blue-600 transition-all duration-300"
                          style={{ width: `${progress}%` }}
                      />
                  </div>
              )}
          </div>
        </div>
      </main>

      <footer className="relative z-10 flex flex-col items-center pb-6 pt-2 px-4">
          <a 
            href="https://ariyo.my.id" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-sm font-medium text-slate-400 hover:text-blue-500 transition-colors mb-6"
          >
              Ariyo.
          </a>

          <div className="w-full max-w-md">
            <div className="grid grid-cols-3 gap-3 sm:gap-4">
                {[
                  { icon: Video, name: 'TikTok', color: 'text-slate-600', hoverColor: 'hover:border-slate-800' },
                  { icon: Music, name: 'Spotify', color: 'text-slate-600', hoverColor: 'hover:border-green-500' },
                  { icon: Youtube, name: 'YouTube', color: 'text-slate-600', hoverColor: 'hover:border-red-500' },
                  { icon: Facebook, name: 'Facebook', color: 'text-slate-600', hoverColor: 'hover:border-blue-700' },
                  { icon: Instagram, name: 'Instagram', color: 'text-slate-600', hoverColor: 'hover:border-pink-500' },
                  { icon: ImageIcon, name: 'Pinterest', color: 'text-slate-600', hoverColor: 'hover:border-red-600' }
                ].map((platform, index) => (
                  <div
                    key={index}
                    className="flex flex-col items-center gap-2 p-4 bg-white/70 backdrop-blur-sm border border-slate-200 rounded-xl shadow-sm cursor-default transition-all hover:-translate-y-1"
                  >
                    <platform.icon size={28} className={`${platform.color} hover:scale-110 transition-transform duration-300`} />
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{platform.name}</span>
                  </div>
                ))}
            </div>
          </div>
      </footer>

      {data && (
        <>
          <div 
              onClick={() => setData(null)}
              className="fixed inset-0 bg-slate-900/50 backdrop-blur-md z-40"
          />
          <div className="fixed bottom-0 left-0 right-0 md:top-auto md:left-1/2 md:bottom-auto md:-translate-x-1/2 md:translate-y-0 md:my-auto bg-white/90 backdrop-blur-xl rounded-t-2xl md:rounded-2xl shadow-2xl z-50 w-full md:max-w-xl max-h-[90vh] overflow-y-auto border border-white/20">
              <div className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-slate-100 p-5 flex justify-between items-center z-20">
                  <h2 className="text-base font-bold text-slate-800 uppercase tracking-wide">Preview Media</h2>
                  <button 
                     onClick={() => setData(null)} 
                     className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors active:scale-90"
                  >
                      <X size={20} />
                  </button>
              </div>

              <div className="p-6 pb-12">
                  {renderContent()}
              </div>
          </div>
        </>
      )}

      {activePreview && (
        <>
          <div 
            onClick={() => setActivePreview(null)}
            className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          >
            <button 
              onClick={() => setActivePreview(null)}
              className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
            >
              <X size={24} />
            </button>
            <img 
              src={activePreview.url} 
              alt="Preview" 
              className="max-w-full max-h-full object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </>
      )}
    </div>
  );
}
