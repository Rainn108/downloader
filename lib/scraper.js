import axios from 'axios';
import * as cheerio from 'cheerio';

const SPOTIFY_BASE_URL = "https://spotmate.online";
const SPOTIFY_USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36";
const GENIUS_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36";

// --- HELPERS ---
async function getToken() {
    const res = await axios.get(SPOTIFY_BASE_URL, {
        headers: { "User-Agent": SPOTIFY_USER_AGENT }
    });
    const html = res.data;
    const match = html.match(/<meta[^>]+(csrf[-_]?token|csrf|csrf_token)[^>]+content=["']([^"']+)["']/);
    if (!match) throw new Error("Token CSRF tidak ditemukan");
    const token = match[2];
    const cookie = (res.headers["set-cookie"] || []).map((c) => c.split(";")[0]).join("; ");
    return { token, cookie };
}

function formatTime(ms) {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

// --- YOUTUBE DL (UPGRADED VERSION) ---
/**
 * Fungsi baru pengganti ymCDN untuk kualitas HD & Audio jernih
 */
async function youtubeDl(url, type = 'mp4', resolution = '1080') {
    const videoQualities = ['1080', '720', '480', '360'];
    const audioQualities = ['320', '256', '128'];

    const videoId = url.match(/(?:v=|\/)([0-9A-Za-z_-]{11})/)?.[1];
    if (!videoId) throw new Error("URL YouTube tidak valid!");

    const hr = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://ytmp3.gg/',
        'Origin': 'https://ytmp3.gg'
    };

    let queue = (type === 'mp4' || type === 'video') ? videoQualities : audioQualities;
    let format = (type === 'mp4' || type === 'video') ? 'mp4' : (type === 'wav' ? 'wav' : 'mp3');
    
    // Auto-fallback logic
    for (let q of queue) {
        try {
            const init = await axios.get(`https://api.ytmp3.gg/v1/convert?v=${videoId}&f=${format}&q=${q}`, { headers: hr });
            if (!init.data?.jobId) continue;

            const jobId = init.data.jobId;
            let downloadUrl = null;
            let attempts = 0;

            while (attempts < 15) {
                const check = await axios.get(`https://api.ytmp3.gg/v1/status?jobId=${jobId}`, { headers: hr });
                if (check.data.status === 'completed' && check.data.downloadUrl) {
                    downloadUrl = check.data.downloadUrl;
                    break;
                }
                if (check.data.status === 'failed') break;
                attempts++;
                await new Promise(r => setTimeout(r, 1500));
            }

            if (downloadUrl) {
                return {
                    status: true,
                    title: init.data.title || "YouTube Media",
                    quality: (format === 'mp4') ? q + 'p' : q + 'kbps',
                    format: format,
                    thumb: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
                    url: downloadUrl
                };
            }
        } catch (e) { continue; }
    }
    throw new Error("Gagal mendapatkan link download.");
}

// --- SPOTIFY SCRAPER ---
async function fetchLyrics(artist, title) {
    const artistSlug = artist.split(" ").join("-").toLowerCase();
    const titleSlug = title.split(" ").join("-").toLowerCase();
    const url = `https://genius.com/${artistSlug}-${titleSlug}-lyrics`;
    const { data } = await axios.get(url, {
        headers: { "User-Agent": GENIUS_UA },
        maxRedirects: 5,
        validateStatus(status) { return status >= 200 && status < 400; }
    }).catch((e) => e.response);
    const $ = cheerio.load(data);
    const lyricsContainers = $('[data-lyrics-container="true"]');
    let lyrics = "";
    lyricsContainers.each((i, container) => {
        const containerText = $(container).html();
        const textWithBreaks = containerText.replace(/<br\s*\/?>/gi, "\n").replace(/<\/div>/gi, "\n").replace(/<[^>]+>/g, "");
        lyrics += textWithBreaks + "\n";
    });
    return lyrics.split("\n").map((line) => line.trim()).filter((line) => line.length > 0).join("\n").split(";").pop() || "Lyrics not found";
}

function buildCdnUrl(id, title, artist) {
    return `https://cdn-spotify-247.zm.io.vn/download/${id}/track?name=${encodeURIComponent(title)}&artist=${encodeURIComponent(artist)}`;
}

async function scrapeSpotify(spotifyUrl) {
    if (!spotifyUrl) throw new Error("URL tidak valid");
    try {
        const { token, cookie } = await getToken();
        const headers = {
            "Content-Type": "application/json",
            "X-CSRF-TOKEN": token,
            Cookie: cookie,
            Referer: `${SPOTIFY_BASE_URL}/`,
            "X-Requested-With": "XMLHttpRequest",
            "User-Agent": SPOTIFY_USER_AGENT
        };
        const metaRes = await axios.post(`${SPOTIFY_BASE_URL}/getTrackData`, { spotify_url: spotifyUrl }, { headers }).catch((e) => e.response);
        if (!metaRes || metaRes.status !== 200) throw new Error("Gagal ambil data metadata");
        const meta = metaRes.data;
        const metadata = {
            title: meta.name,
            id: meta.id,
            images: meta.album.images[0].url,
            duration: formatTime(meta.duration_ms),
            artist: meta.artists[0].name
        };
        const lyrics = await fetchLyrics(metadata.artist, metadata.title);
        metadata.lyrics = lyrics;
        const download = buildCdnUrl(metadata.id, metadata.title, metadata.artist);
        return { metadata, download };
    } catch (error) {
        throw new Error("Failed to fetch Spotify data.");
    }
}

// --- INSTAGRAM, TIKTOK, FB, PINTEREST ---
async function instagramDl(url) {
    try {
        const { data } = await axios.post('https://yt1s.io/api/ajaxSearch', new URLSearchParams({ q: url, w: '', p: 'home', lang: 'en' }), {
            headers: {
                'Accept': '*/*',
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                'Origin': 'https://yt1s.io',
                'Referer': 'https://yt1s.io/',
                'User-Agent': 'Postify/1.0.0',
            }
        });
        if (data.status !== 'ok') throw new Error("API Error");
        const $ = cheerio.load(data.data);
        let result = $('a.abutton').map((_, b) => {
            const href = $(b).attr('href');
            if (!href) return null;
            let type = 'mp4';
            const text = $(b).text().toLowerCase();
            const titleLower = ($(b).attr('title') || '').toLowerCase();
            if (text.includes('photo') || text.includes('image') || titleLower.includes('thumbnail') || href.match(/\.(jpeg|jpg|png|webp)/i)) {
                type = 'photo';
            }
            return { title: $(b).attr('title') || 'Instagram Media', url: href, type, quality: 'Auto' };
        }).get().filter(item => item !== null);
        return result;
    } catch (e) { throw new Error("Gagal mengambil data Instagram."); }
}

async function tiktokDl(url) {
    try {
        let data = [];
        const domain = 'https://www.tikwm.com/api/';
        let res = await (await axios.post(domain, {}, {
            params: { url: url, hd: 1 }
        })).data.data;

        if (res && res.images) {
            res.images.map(v => { data.push({ type: 'photo', url: v }); });
        } else {
            if (res.play) data.push({ type: 'nowatermark', url: res.play, quality: 'HD' });
            if (res.music) data.push({ type: 'audio', url: res.music, quality: 'Audio' });
        }
        return { status: true, title: res.title, cover: res.cover, data: data };
    } catch (e) { throw new Error("Failed to fetch TikTok data."); }
}

async function facebookDl(url) {
    try {
        const { data } = await axios.post('https://getmyfb.com/process', new URLSearchParams({ id: decodeURIComponent(url), locale: 'en' }), {
            headers: { 'hx-request': 'true', 'hx-trigger': 'form', 'hx-target': '#target' }
        });
        const $ = cheerio.load(data);
        return {
            caption: $('.results-item-text').text().trim(),
            results: $('.results-list-item').get().map(el => ({
                quality: $(el).text().trim().includes('HD') ? 'HD' : 'SD',
                url: $(el).find('a').attr('href') || '',
            }))
        };
    } catch (e) { throw new Error("Failed to fetch Facebook data."); }
}

async function pinterestDl(pinUrl) {
    try {
        const home = await axios.get("https://pindown.cc/en/");
        const $home = cheerio.load(home.data);
        const csrfToken = $home('input[name="csrf_token"]').val();
        const cookies = home.headers['set-cookie']?.join('; ');

        const download = await axios.post("https://pindown.cc/en/download", new URLSearchParams({ 'csrf_token': csrfToken, 'url': pinUrl }), {
            headers: { 'Cookie': cookies, 'Referer': 'https://pindown.cc/en/' }
        });

        const $ = cheerio.load(download.data);
        const medias = [];
        $('.square-box-btn a').each((i, el) => {
            medias.push({ type: $(el).text().includes('Video') ? 'video' : 'image', url: $(el).attr('href') });
        });
        return { title: $('.font-weight-bold').first().text().trim(), medias };
    } catch (error) { throw new Error("Failed to fetch Pinterest data."); }
}

export { instagramDl, tiktokDl, facebookDl, scrapeSpotify, youtubeDl, pinterestDl };
            
