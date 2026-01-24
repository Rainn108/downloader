import { instagramDl, tiktokDl, facebookDl, scrapeSpotify, youtubeDl, pinterestDl } from '../../lib/scraper';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  
  const { url } = req.body;
  
  const cleanUrl = url ? url.trim() : '';

  if (!cleanUrl || typeof cleanUrl !== 'string' || !cleanUrl.startsWith('http')) {
    return res.status(400).json({ success: false, error: 'Invalid URL provided.' });
  }

  try {
    let result;
    const urlObj = new URL(cleanUrl);
    const hostname = urlObj.hostname.toLowerCase();
    
    if (hostname.includes('instagram.com')) {
        result = await instagramDl(cleanUrl);
    } else if (hostname.includes('tiktok.com')) {
        result = await tiktokDl(cleanUrl);
    } else if (hostname.includes('facebook.com') || hostname.includes('fb.watch')) {
        result = await facebookDl(cleanUrl);
    } else if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) {
        result = await youtubeDl(cleanUrl);
    } else if (hostname.includes('spotify.com') || (cleanUrl.includes('spotify') && cleanUrl.includes('googleusercontent'))) {
        result = await scrapeSpotify(cleanUrl);
    } else if (hostname.includes('pinterest.com') || hostname.includes('pin.it')) {
        result = await pinterestDl(cleanUrl);
    } else {
        return res.status(400).json({ success: false, error: 'Platform not supported.' });
    }
    
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message || 'Server processing error.' });
  }
}
