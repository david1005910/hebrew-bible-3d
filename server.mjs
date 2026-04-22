import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = 3001;
const SUBTITLES_PATH = path.join(__dirname, 'public', 'subtitles.json');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
};

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

const server = http.createServer((req, res) => {
  cors(res);

  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // GET /subtitles.json — 자막 데이터 읽기
  if (req.method === 'GET' && req.url === '/subtitles.json') {
    try {
      const data = fs.readFileSync(SUBTITLES_PATH, 'utf-8');
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(data);
    } catch (err) {
      res.writeHead(404);
      res.end(JSON.stringify({ error: 'subtitles.json not found' }));
    }
    return;
  }

  // POST /api/save — 자막 데이터 저장
  if (req.method === 'POST' && req.url === '/api/save') {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => {
      try {
        // JSON 유효성 검증
        const parsed = JSON.parse(body);
        const pretty = JSON.stringify(parsed, null, 2) + '\n';
        fs.writeFileSync(SUBTITLES_PATH, pretty, 'utf-8');
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ ok: true, saved: new Date().toISOString() }));
        console.log(`[${new Date().toLocaleTimeString()}] subtitles.json saved`);
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // Static file serving (editor.html, etc.)
  let filePath;
  if (req.url === '/' || req.url === '/editor.html') {
    filePath = path.join(__dirname, 'editor.html');
  } else {
    filePath = path.join(__dirname, req.url);
  }

  const ext = path.extname(filePath);
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  try {
    // 보안: __dirname 밖으로 나가지 못하도록
    const resolved = path.resolve(filePath);
    if (!resolved.startsWith(__dirname)) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }
    const data = fs.readFileSync(resolved);
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  } catch {
    res.writeHead(404);
    res.end('Not Found');
  }
});

server.listen(PORT, () => {
  console.log(`\n  자막 에디터 서버 실행 중`);
  console.log(`  http://localhost:${PORT}/editor.html\n`);
});
