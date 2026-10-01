const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, 'public');
const types = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.mp3':'audio/mpeg','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.ico':'image/x-icon','.md':'text/plain; charset=utf-8'};
const server = http.createServer((req, res) => {
  if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405, {Allow:'GET, HEAD'}).end(); return; }
  let url, pathname;
  try { url = new URL(req.url, 'http://localhost'); pathname = decodeURIComponent(url.pathname); }
  catch { res.writeHead(400).end('Bad request'); return; }
  if (pathname === '/' || pathname === '/fps') {
    res.writeHead(302, {Location:'/fps/' + url.search}).end(); return;
  }
  if (pathname.endsWith('/')) pathname += 'index.html';
  const file = path.resolve(root, '.' + pathname);
  if (!file.startsWith(root + path.sep) || pathname.includes('\0')) { res.writeHead(403).end('Forbidden'); return; }
  fs.readFile(file, (error, data) => {
    if (error) { res.writeHead(error.code === 'ENOENT' || error.code === 'EISDIR' ? 404 : 500).end('File unavailable'); return; }
    res.writeHead(200, {'Content-Type':types[path.extname(file)] || 'application/octet-stream', 'Content-Length':data.length, 'X-Content-Type-Options':'nosniff'});
    res.end(req.method === 'HEAD' ? undefined : data);
  });
});
if (require.main === module) server.listen(Number(process.env.PORT) || 3001, '127.0.0.1', () => console.log(`Antagonized 3D: http://localhost:${server.address().port}/`));
module.exports = server;
