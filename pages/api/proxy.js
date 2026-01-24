import axios from 'axios';

export const config = {
  api: { responseLimit: false },
};

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).send('Method Not Allowed');
  const { url, filename } = req.query;
  if (!url) return res.status(400).send('URL missing');

  try {
    const response = await axios({
      method: 'GET',
      url: decodeURIComponent(url),
      responseType: 'stream',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    const contentType = response.headers['content-type'];
    const contentLength = response.headers['content-length'];

    res.setHeader('Content-Type', contentType || 'application/octet-stream');
    if (contentLength) res.setHeader('Content-Length', contentLength);
    res.setHeader('Content-Disposition', `attachment; filename="${filename || 'download'}"`);
    
    response.data.pipe(res);
  } catch (error) {
    res.status(500).send('Proxy error');
  }
}
