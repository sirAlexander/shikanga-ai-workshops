// Minimal Node.js API server for Bug Busters (in-memory, no frameworks)
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
let scores = [];
const MAX_LEADERBOARD = 10;

function withCors(headers = {}) {
  return Object.assign({
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  }, headers);
}

function send(res, code, data, contentType='application/json') {
  res.writeHead(code, withCors({'Content-Type': contentType}));
  res.end(contentType==='application/json' ? JSON.stringify(data) : data);
}

function parseBody(req, cb) {
  let body = '';
  req.on('data', chunk => body += chunk);
  req.on('end', () => {
    try { cb(JSON.parse(body)); } catch { cb(null); }
  });
}

function getLeaderboard() {
  return scores.sort((a, b) => b.score - a.score).slice(0, MAX_LEADERBOARD);
}

const server = http.createServer((req, res) => {
  // Static files (frontend)
  if (req.method === 'GET' && req.url === '/') {
    return fs.readFile(path.join(__dirname, '../frontend/index.html'), (err, html) => {
      if (err) return send(res, 500, 'Error!', 'text/plain');
      send(res, 200, html, 'text/html');
    });
  }
  if (req.method === 'GET' && req.url.startsWith('/styles.css')) {
    return fs.readFile(path.join(__dirname, '../frontend/styles.css'), (err, css) => {
      if (err) return send(res, 404, '', 'text/plain');
      send(res, 200, css, 'text/css');
    });
  }
  if (req.method === 'GET' && req.url.startsWith('/game.js')) {
    return fs.readFile(path.join(__dirname, '../frontend/game.js'), (err, js) => {
      if (err) return send(res, 404, '', 'text/plain');
      send(res, 200, js, 'application/javascript');
    });
  }

  // Health check
  if (req.method === 'GET' && req.url === '/health') {
    return send(res, 200, {status: 'OK'});
  }

  // CORS preflight for scores
  if (req.method === 'OPTIONS' && req.url === '/scores') {
    res.writeHead(204, withCors());
    return res.end();
  }

  // GET leaderboard
  if (req.method === 'GET' && req.url === '/scores') {
    return send(res, 200, getLeaderboard());
  }

  // POST score
  if (req.method === 'POST' && req.url === '/scores') {
    parseBody(req, body => {
      if (!body || typeof body.name !== 'string' || typeof body.score !== 'number') {
        return send(res, 400, {error: 'Invalid'});
      }
      const name = body.name.trim().slice(0,12) || 'Player';
      const scoreVal = Math.max(0, Math.floor(body.score));
      scores.push({ name, score: scoreVal });
      send(res, 200, getLeaderboard());
    });
    return;
  }

  // Fallback
  send(res, 404, {error: 'Not found'}, 'application/json');
});

server.listen(PORT, () => {
  console.log(`Bug Busters backend running: http://localhost:${PORT}`);
});
