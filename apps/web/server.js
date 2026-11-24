import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, URL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');
const API_SERVICE_URL = process.env.API_SERVICE_URL;

const server = http.createServer((req, res) => {
  // If the web service receives an /api/ request and has an internal service binding, proxy to it
  if (req.url.startsWith('/api/') && API_SERVICE_URL) {
    try {
      const targetUrl = new URL(req.url, API_SERVICE_URL);
      const proxyReq = http.request(
        targetUrl,
        {
          method: req.method,
          headers: {
            ...req.headers,
            host: targetUrl.host
          }
        },
        (proxyRes) => {
          res.writeHead(proxyRes.statusCode || 200, proxyRes.headers);
          proxyRes.pipe(res);
        }
      );

      proxyReq.on('error', (err) => {
        res.writeHead(502, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Bad Gateway connecting to internal api service', message: err.message }));
      });

      req.pipe(proxyReq);
      return;
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Internal Proxy Error', message: err.message }));
      return;
    }
  }

  const filePath = path.join(PUBLIC_DIR, req.url === '/' ? 'index.html' : req.url);

  fs.readFile(filePath, (err, data) => {
    if (err) {
      // Fallback to index.html for SPA
      fs.readFile(path.join(PUBLIC_DIR, 'index.html'), (err2, indexData) => {
        if (err2) {
          res.writeHead(404);
          res.end('Not Found');
        } else {
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(indexData);
        }
      });
      return;
    }

    const ext = path.extname(filePath);
    let contentType = 'text/html';
    if (ext === '.js') contentType = 'application/javascript';
    if (ext === '.css') contentType = 'text/css';
    if (ext === '.json') contentType = 'application/json';

    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`🌍 AI-Native OTA Web Dashboard running at: http://localhost:${PORT}`);
  if (API_SERVICE_URL) {
    console.log(`🔗 Connected to internal api service via binding: ${API_SERVICE_URL}`);
  }
});
