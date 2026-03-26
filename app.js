const http = require('http');
const https = require('https');
const net = require('net');
const url = require('url');

const PORT = 3000;

const server = http.createServer((req, res) => {
  try {
    // --- Mode 1: Web-based proxy (?u=URL) ---
    const q = url.parse(req.url, true).query;
    if (q.u && q.u.startsWith('http')) {
      return forwardRequest(q.u, req, res);
    }

    // --- Mode 2: Standard HTTP forward proxy (absolute URL in request) ---
    if (req.url.startsWith('http://')) {
      return forwardRequest(req.url, req, res);
    }

    // --- Default: show landing page ---
    res.writeHead(200, { 'Content-Type': 'text/html' });
    return res.end(
      '<h1>Web Proxy Running</h1>' +
      '<p>Append <b>?u=URL</b> to your domain to browse.</p>' +
      '<p>Or configure your app to use this as an HTTP proxy.</p>'
    );
  } catch (err) {
    res.writeHead(500);
    res.end('Proxy Error');
  }
});

// --- Mode 3: HTTPS CONNECT tunneling ---
server.on('connect', (req, clientSocket, head) => {
  const [hostname, port] = req.url.split(':');
  const targetPort = parseInt(port) || 443;

  const serverSocket = net.connect(targetPort, hostname, () => {
    clientSocket.write(
      'HTTP/1.1 200 Connection Established\r\n' +
      'Proxy-Agent: NodeProxy\r\n' +
      '\r\n'
    );
    serverSocket.write(head);
    serverSocket.pipe(clientSocket);
    clientSocket.pipe(serverSocket);
  });

  serverSocket.on('error', (err) => {
    clientSocket.write('HTTP/1.1 502 Bad Gateway\r\n\r\n');
    clientSocket.end();
  });

  clientSocket.on('error', () => {
    serverSocket.destroy();
  });
});

// Helper: forward an HTTP/HTTPS request
function forwardRequest(targetUrl, req, res) {
  const opt = url.parse(targetUrl);
  opt.headers = Object.assign({}, req.headers);
  delete opt.headers.host;
  delete opt.headers['accept-encoding'];
  opt.method = req.method;

  const lib = targetUrl.startsWith('https') ? https : http;

  const pReq = lib.request(opt, (pRes) => {
    res.writeHead(pRes.statusCode, pRes.headers);
    pRes.pipe(res, { end: true });
  });

  pReq.on('error', (e) => {
    res.writeHead(502);
    res.end('Error fetching: ' + e.message);
  });
  req.pipe(pReq, { end: true });
}

server.listen(PORT, () => console.log('Proxy ready on port ' + PORT));
