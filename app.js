const http = require('http');
const url = require('url');

const PORT = 3000;

const server = http.createServer((req, res) => {
  try {
    const q = url.parse(req.url, true).query;
    const t = q.u || req.url;

    if (!t.startsWith('http')) {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      return res.end('<h1>Web Proxy Running</h1><p>Append <b>?u=URL</b> to your domain to browse.</p>');
    }

    const opt = url.parse(t);
    opt.headers = req.headers;
    delete opt.headers.host;
    opt.method = req.method;

    const pReq = http.request(opt, (pRes) => {
      res.writeHead(pRes.statusCode, pRes.headers);
      pRes.pipe(res, { end: true });
    });

    pReq.on('error', (e) => res.end('Error fetching: ' + e.message));
    req.pipe(pReq, { end: true });
  } catch (err) {
    res.end('Proxy Error');
  }
});

server.listen(PORT, () => console.log('Node is ready on port ' + PORT));
