import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, URL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');
const INDEX_HTML_PATH = path.join(__dirname, 'public', 'index.html');

const server = http.createServer(async (req, res) => {
  const reqPath = (req.url || '/').split('?')[0];

  // Read internal service binding at runtime (Vercel injects API_SERVICE_URL in functions)
  const apiServiceUrl = process.env.API_SERVICE_URL || (!process.env.VERCEL ? 'http://localhost:4000' : '');

  // Proxy /api/* requests to internal/bound api service using fetch (supports both http and https)
  if (reqPath.startsWith('/api/') && apiServiceUrl) {
    try {
      const targetUrl = new URL(req.url || reqPath, apiServiceUrl);

      let bodyBuffer;
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        if (req.body !== undefined) {
          bodyBuffer = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
        } else {
          const chunks = [];
          for await (const chunk of req) {
            chunks.push(chunk);
          }
          if (chunks.length > 0) {
            bodyBuffer = Buffer.concat(chunks);
          }
        }
      }

      const headers = { ...req.headers };
      delete headers.host;
      delete headers['content-length'];

      const proxyRes = await fetch(targetUrl, {
        method: req.method,
        headers,
        body: bodyBuffer
      });

      const resBuffer = Buffer.from(await proxyRes.arrayBuffer());
      const resHeaders = Object.fromEntries(proxyRes.headers.entries());
      delete resHeaders['content-encoding'];
      delete resHeaders['content-length'];

      res.writeHead(proxyRes.status, resHeaders);
      res.end(resBuffer);
      return;
    } catch (err) {
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Bad Gateway connecting to internal api service', message: err.message }));
      return;
    }
  }

  // Static asset handling with path-traversal protection and SPA fallback
  const safeRelative = path.normalize(reqPath).replace(/^(\.\.[/\\])+/, '');
  const requestedFile = safeRelative === '/' || safeRelative === '.' ? INDEX_HTML_PATH : path.join(PUBLIC_DIR, safeRelative);

  fs.readFile(requestedFile, (err, data) => {
    if (err) {
      fs.readFile(INDEX_HTML_PATH, (err2, indexData) => {
        if (err2) {
          res.writeHead(404);
          res.end('Not Found');
        } else {
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(indexData);
        }
      });
      return;
    }

    const ext = path.extname(requestedFile);
    let contentType = 'text/html; charset=utf-8';
    if (ext === '.js') contentType = 'application/javascript';
    if (ext === '.css') contentType = 'text/css';
    if (ext === '.json') contentType = 'application/json';
    if (ext === '.svg') contentType = 'image/svg+xml';
    if (ext === '.png') contentType = 'image/png';

    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
});

if (!process.env.VERCEL) {
  server.listen(PORT, () => {
    console.log(`🌍 AI-Native OTA Web Dashboard running at: http://localhost:${PORT}`);
    if (process.env.API_SERVICE_URL) {
      console.log(`🔗 Connected to internal api service via binding: ${process.env.API_SERVICE_URL}`);
    }
  });
}

export default server;
