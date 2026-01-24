import axios from 'axios';
import * as cheerio from 'cheerio';

const SPOTIFY_BASE_URL = "https://spotmate.online";
const SPOTIFY_USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36";
const GENIUS_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36";

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

async function ymCDN(url, format = 'mp3') {
    return new Promise(async (resolve, reject) => {
        const isYouTubeUrl = /^(?:(?:https?:)?\/\/)?(?:(?:(?:www|m(?:usic)?)\.)?youtu(?:\.be|be\.com)\/(?:shorts\/|live\/|v\/e(?:mbed)?\/|watch(?:\/|\?(?:\S+=\S+&)*v=)|oembed\?url=https?%3A\/\/(?:www|m(?:usic)?)\.youtube\.com\/watch\?(?:\S+=\S+&)*v%3D|attribution_link\?(?:\S+=\S+&)*u=(?:\/|%2F)watch(?:\?|%3F)v(?:=|%3D))?|www\.youtube-nocookie\.com\/embed\/)(([\w-]{11}))[\?&#]?\S*$/;
        if (!isYouTubeUrl.test(url)) return resolve({ status: false, mess: "URL YouTube tidak valid." });
        const id = url.match(isYouTubeUrl)?.[2];
        const hr = {
            'Accept': 'application/json, text/plain, */*',
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
            'Referer': 'https://id.ytmp3.mobi/',
        };
        try {
            const init = await axios.get(`https://d.ymcdn.org/api/v1/init?p=y&23=1llum1n471&_=${Math.random()}`, { headers: hr });
            if (!init.data.convertURL) return resolve({ status: false, mess: "Gagal memulai proses konversi." });
            const convert = await axios.get(`${init.data.convertURL}&v=${id}&f=${format}&_=${Math.random()}`, { headers: hr }).then(x => x.data);
            if (!convert.progressURL || !convert.downloadURL) return resolve({ status: false, mess: "Gagal mendapatkan URL progres atau unduhan." });
            let currentProgress = 0;
            let title = '';
            while (currentProgress < 3) {
                const response = await axios.get(convert.progressURL, { headers: hr });
                const data = response.data;
                if (data.error > 0) return resolve({ status: false, mess: `Terjadi error pada server konversi: ${data.error}` });
                currentProgress = data.progress;
                title = data.title;
                if (currentProgress < 3) await new Promise(resolve => setTimeout(resolve, 300));
            }
            resolve({ status: true, title: title, dl: convert.downloadURL, id: id });
        } catch (error) {
            resolve({ status: false, mess: 'Terjadi kesalahan saat berkomunikasi dengan server konversi.' });
        }
    });
}

async function youtubeDl(url) {
    try {
        const [mp4, mp3] = await Promise.all([ymCDN(url, 'mp4'), ymCDN(url, 'mp3')]);
        if (!mp4.status && !mp3.status) throw new Error(mp4.mess || "Failed to fetch YouTube data.");
        const results = [];
        if (mp4.status) results.push({ quality: 'HD', type: 'mp4', url: mp4.dl });
        if (mp3.status) results.push({ quality: '128kbps', type: 'mp3', url: mp3.dl });
        const primary = mp4.status ? mp4 : mp3;
        return {
            title: primary.title,
            preview: `https://i.ytimg.com/vi/${primary.id}/hqdefault.jpg`,
            results: results
        };
    } catch (e) {
        throw new Error("Failed to fetch YouTube data.");
    }
}

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
            const text = $(b).text().toLowerCase();
            
            if (!href) return null;

            let type = 'mp4';
            const titleLower = ($(b).attr('title') || '').toLowerCase();
            if (text.includes('photo') || text.includes('image') || titleLower.includes('thumbnail') || href.match(/\.(jpeg|jpg|png|webp)/i)) {
                type = 'photo';
            }

            return {
                title: $(b).attr('title') || 'Instagram Media',
                url: href,
                type: type,
                quality: 'Auto'
            };
        }).get().filter(item => item !== null);

        if (result.length === 0) throw new Error("No media found");
        
        return result;
    } catch (e) {
        throw new Error("Gagal mengambil data Instagram. Pastikan akun tidak privat.");
    }
}

async function tiktokDl(url) {
    try {
        let data = [];
        function formatNumber(integer) {
            return Number(parseInt(integer)).toLocaleString().replace(/,/g, '.');
        }
        function formatDate(n, locale = 'en') {
            return new Date(n).toLocaleDateString(locale, {
                weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric'
            });
        }
        let domain = 'https://www.tikwm.com/api/';
        let res = await (await axios.post(domain, {}, {
            headers: {
                'Accept': 'application/json, text/javascript, */*; q=0.01',
                'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                'Origin': 'https://www.tikwm.com',
                'Referer': 'https://www.tikwm.com/',
                'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36',
                'X-Requested-With': 'XMLHttpRequest'
            },
            params: { url: url, hd: 1 }
        })).data.data;

        if (res && !res.size && !res.wm_size && !res.hd_size) {
            res.images.map(v => { data.push({ type: 'photo', url: v }); });
        } else {
            if (res && res.wmplay) data.push({ type: 'watermark', url: res.wmplay, quality: 'SD' });
            if (res && res.play) data.push({ type: 'nowatermark', url: res.play, quality: 'HD' });
            if (res && res.hdplay) data.push({ type: 'nowatermark_hd', url: res.hdplay, quality: 'FHD' });
            if (res && (res.music || (res.music_info && res.music_info.play))) {
                data.push({ 
                    type: 'audio', 
                    url: res.music || res.music_info.play, 
                    quality: 'Audio' 
                });
            }
        }
        let json = {
            status: true,
            title: res.title,
            taken_at: formatDate(res.create_time).replace('1970', ''),
            region: res.region,
            id: res.id,
            durations: res.duration,
            duration: res.duration + ' Seconds',
            cover: res.cover,
            size_wm: res.wm_size,
            size_nowm: res.size,
            size_nowm_hd: res.hd_size,
            data: data,
            music_info: {
                id: res.music_info.id,
                title: res.music_info.title,
                author: res.music_info.author,
                album: res.music_info.album ? res.music_info.album : null,
                url: res.music || res.music_info.play
            },
            stats: {
                views: formatNumber(res.play_count),
                likes: formatNumber(res.digg_count),
                comment: formatNumber(res.comment_count),
                share: formatNumber(res.share_count),
                download: formatNumber(res.download_count)
            },
            author: {
                id: res.author.id,
                fullname: res.author.unique_id,
                nickname: res.author.nickname,
                avatar: res.author.avatar
            }
        };
        return json;
    } catch (e) {
        throw new Error("Failed to fetch TikTok data.");
    }
}

async function facebookDl(url) {
    try {
        const { data } = await axios.post('https://getmyfb.com/process', new URLSearchParams({
            id: decodeURIComponent(url),
            locale: 'en',
        }), {
            headers: {
                'hx-current-url': 'https://getmyfb.com/',
                'hx-request': 'true',
                'hx-target': url.includes('share') ? '#private-video-downloader' : '#target',
                'hx-trigger': 'form',
                'hx-post': '/process',
                'hx-swap': 'innerHTML',
            }
        });
        const $ = cheerio.load(data);
        return {
            caption: $('.results-item-text').length > 0 ? $('.results-item-text').text().trim() : '',
            preview: $('.results-item-image').attr('src') || '',
            results: $('.results-list-item').get().map(el => ({
                quality: parseInt($(el).text().trim()) || 'SD',
                type: $(el).text().includes('HD') ? 'mp4' : 'mp4',
                url: $(el).find('a').attr('href') || '',
            }))
        };
    } catch (e) {
        throw new Error("Failed to fetch Facebook data.");
    }
}

async function pinterestDl(pinUrl) {
    const CONFIG = {
        BASE_URL: "https://pindown.cc",
        ENDPOINTS: {
            HOME: "/en/",
            DOWNLOAD: "/en/download"
        },
        HEADERS: {
            "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
            "Accept-Encoding": "gzip, deflate, br",
            "Cache-Control": "max-age=0",
            "Upgrade-Insecure-Requests": "1",
            "Origin": "https://pindown.cc",
            "Referer": "https://pindown.cc/en/",
            "Sec-Fetch-Site": "same-origin",
            "Sec-Fetch-Mode": "navigate",
            "Sec-Fetch-Dest": "document",
            "Priority": "u=0, i"
        }
    };

    const cleanText = (str) => {
        return str ? str.replace(/\s+/g, ' ').trim() : '';
    };

    try {
        if (!pinUrl) throw new Error('URL Pinterest tidak boleh kosong.');
        const homeResponse = await axios.get(CONFIG.BASE_URL + CONFIG.ENDPOINTS.HOME, {
            headers: CONFIG.HEADERS
        });

        const cookies = homeResponse.headers['set-cookie'];
        const sessionCookie = cookies ? cookies.join('; ') : '';
        const $home = cheerio.load(homeResponse.data);
        const csrfToken = $home('input[name="csrf_token"]').val();

        if (!csrfToken) {
            throw new Error('Gagal mendapatkan CSRF Token.');
        }

        const postData = new URLSearchParams({
            'csrf_token': csrfToken,
            'url': pinUrl
        });

        const downloadResponse = await axios.post(
            CONFIG.BASE_URL + CONFIG.ENDPOINTS.DOWNLOAD,
            postData,
            {
                headers: {
                    ...CONFIG.HEADERS,
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Cookie': sessionCookie,
                    'Referer': CONFIG.BASE_URL + CONFIG.ENDPOINTS.HOME
                }
            }
        );

        const $ = cheerio.load(downloadResponse.data);
        const alertError = $('.alert-danger').text();
        if (alertError) {
            throw new Error(cleanText(alertError));
        }

        const resultContainer = $('.square-box');
        if (resultContainer.length === 0) {
            throw new Error('Konten tidak ditemukan atau URL tidak valid.');
        }

        const title = cleanText(resultContainer.find('.font-weight-bold').text());
        const duration = cleanText(resultContainer.find('.text-muted').text());
        const thumbnail = resultContainer.find('.square-box-img img').attr('src');
        
        const result = {
            title: title,
            duration: duration || null,
            thumbnail: thumbnail,
            medias: []
        };

        resultContainer.find('.square-box-btn a').each((i, el) => {
            const link = $(el).attr('href');
            const text = cleanText($(el).text());

            let type = 'unknown';
            if (text.includes('Video')) type = 'video';
            else if (text.includes('Image')) type = 'image';
            else if (text.includes('GIF')) type = 'gif';

            let ext = 'jpg';
            if (link.includes('.mp4')) ext = 'mp4';
            else if (link.includes('.gif')) ext = 'gif';
            else if (link.includes('.png')) ext = 'png';

            result.medias.push({
                type: type,
                extension: ext,
                quality: text.replace('Download ', ''),
                url: link
            });
        });

        return result;

    } catch (error) {
        throw new Error(error.message || "Failed to fetch Pinterest data.");
    }
}

export { instagramDl, tiktokDl, facebookDl, scrapeSpotify, youtubeDl, pinterestDl };

