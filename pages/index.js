import { useState, useEffect } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import { Search, Download, Music, Video, Image as ImageIcon, Loader2, Link as LinkIcon, Share2, Heart, MessageCircle, X, PlayCircle, Facebook, Instagram, Youtube } from 'lucide-react';

export default function Home({ triggerAd }) {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(false);
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

    // 1. YouTube / Universal Media (Format baru dari scraper ytmp3.gg)
    if (data.status && data.download) {
      const isVideo = data.format === 'mp4';
      return (
        <div className="flex flex-col gap-6">
          <div className="relative rounded-md border border-slate-200 bg-slate-100 overflow-hidden shadow-sm">
            {activePreview === 'video' ? (
              <video controls autoPlay className="w-full h-full aspect-video bg-black" src={data.download} />
            ) : (
              <div className="relative group w-full">
                <img src={data.thumb} alt={data.title} className="w-full h-auto max-h-[300px] object-contain mx-auto" />
                <div className="absolute inset-0 flex items-center justify-center bg-black/10">
                  {isVideo ? (
                    <button onClick={() => setActivePreview('video')} className="bg-white/20 backdrop-blur-md p-4 rounded-full text-white hover:bg-white/40 transition-all">
                      <PlayCircle size={48} fill="currentColor" />
                    </button>
                  ) : (
                    <div className="bg-white/20 backdrop-blur-md p-4 rounded-full text-white"><Music size={40} /></div>
                  )}
                </div>
              </div>
            )}
          </div>
          <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl flex items-center justify-between">
             <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${isVideo ? 'bg-blue-500' : 'bg-green-500'} text-white`}>
                   {isVideo ? <Video size={20} /> : <Music size={20} />}
                </div>
                <div className="text-left">
                   <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">{data.format}</p>
                   <p className="text-sm font-bold text-slate-800">{data.quality}</p>
                </div>
             </div>
             <button onClick={() => downloadFile(data.download, data.title, data.format)} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg font-bold flex items-center gap-2 transition-all active:scale-95">
                <Download size={18} /> Unduh
             </button>
          </div>
        </div>
      );
    }

    // 2. Spotify
    if (data.metadata && data.download) {
      return (
        <div className="flex flex-col gap-6">
          <div className="flex flex-col md:flex-row gap-6 items-center">
            <img src={data.metadata.images} className="w-40 h-40 rounded-md shadow-lg object-cover" />
            <div className="flex-1 text-center md:text-left space-y-2">
              <h2 className="text-xl font-bold text-slate-900">{data.metadata.title}</h2>
              <p className="text-blue-500 font-medium">{data.metadata.artist}</p>
              <audio controls className="w-full h-8 mt-2" src={data.download} />
              <button onClick={() => downloadFile(data.download, `${data.metadata.artist} - ${data.metadata.title}`, 'mp3')} className="w-full md:w-auto mt-4 px-6 py-2.5 bg-green-600 text-white rounded-md font-medium flex items-center justify-center gap-2">
                <Download size={18} /> Download MP3
              </button>
            </div>
          </div>
          {data.metadata.lyrics && (
            <div className="bg-slate-50 p-4 rounded-md border text-sm max-h-40 overflow-y-auto">{data.metadata.lyrics}</div>
          )}
        </div>
      );
    }

    // 3. TikTok
    if (data.author && data.stats) {
        const video = data.data.find(i => i.type === 'nowatermark' || i.type === 'nowatermark_hd');
        return (
            <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                    <img src={data.author.avatar} className="w-10 h-10 rounded-full" />
                    <div className="text-left"><p className="font-bold text-sm">{data.author.nickname}</p><p className="text-xs text-slate-500">@{data.author.fullname}</p></div>
                </div>
                <img src={data.cover} className="w-full rounded-lg aspect-video object-cover" />
                <button onClick={() => downloadFile(video.url, data.title, 'mp4')} className="w-full py-3 bg-black text-white rounded-xl font-bold flex items-center justify-center gap-2">
                    <Video size={20} /> Download Video
                </button>
            </div>
        );
    }

    // 4. Instagram / Pinterest Carousel
    if (Array.isArray(data) || data.medias) {
        const list = Array.isArray(data) ? data : data.medias;
        return (
            <div className="grid grid-cols-1 gap-4">
                {list.map((item, i) => (
                    <div key={i} className="p-3 border rounded-xl flex items-center justify-between bg-white">
                        <div className="flex items-center gap-3">
                            {item.type === 'video' ? <Video size={20} /> : <ImageIcon size={20} />}
                            <span className="text-sm font-bold">Media {i+1}</span>
                        </div>
                        <button onClick={() => downloadFile(item.url, `Media_${i}`, 'mp4')} className="p-2 text-blue-600"><Download size={20}/></button>
                    </div>
                ))}
            </div>
        );
    }

    return <div className="text-center text-slate-500 py-4">Konten tidak didukung.</div>;
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center p-4">
      <main className="w-full max-w-lg mt-20 space-y-8">
        <div className="text-center space-y-4">
          <div className="w-20 h-20 bg-blue-600 rounded-3xl flex items-center justify-center text-white mx-auto shadow-xl shadow-blue-200">
            <LinkIcon size={40} />
          </div>
          <h1 className="text-4xl font-black text-slate-900">Media Saver</h1>
          <p className="text-slate-500 font-medium">Download anything from YouTube, Spotify, TikTok, etc.</p>
        </div>

        <div className="bg-white p-2 rounded-2xl shadow-xl border border-slate-100">
          <form onSubmit={handleSearch} className="relative flex">
            <input 
              type="text" value={url} onChange={(e) => setUrl(e.target.value)} 
              placeholder="Paste link here..." 
              className="w-full px-6 py-4 bg-transparent outline-none font-medium"
            />
            <button type="submit" disabled={loading} className="bg-blue-600 text-white p-4 rounded-xl hover:bg-blue-700 transition-all">
              {loading ? <Loader2 className="animate-spin" size={24} /> : <Search size={24} />}
            </button>
          </form>
          {loading && <div className="mt-2 h-1 w-full bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-blue-500 transition-all duration-300" style={{ width: `${progress}%` }} /></div>}
        </div>
      </main>

      {data && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setData(null)} />
          <div className="relative bg-white w-full max-w-xl rounded-t-3xl md:rounded-3xl shadow-2xl overflow-hidden max-h-[85vh] overflow-y-auto">
            <div className="p-6 border-b flex justify-between items-center sticky top-0 bg-white/90 backdrop-blur-md z-10">
                <h2 className="font-black text-slate-800 uppercase tracking-widest">Media Preview</h2>
                <button onClick={() => setData(null)} className="p-2 bg-slate-100 rounded-full"><X size={20}/></button>
            </div>
            <div className="p-6">{renderContent()}</div>
          </div>
        </div>
      )}
    </div>
  );
}
