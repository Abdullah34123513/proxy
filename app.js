const http = require('http');
const https = require('https');
const net = require('net');
const url = require('url');

const PORT = 3000;

// Browsers-like headers to avoid being blocked
const SPOOF_HEADERS = {
  'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36',
  'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
  'accept-language': 'en-US,en;q=0.9',
  'cache-control': 'max-age=0',
  'sec-ch-ua': '"Chromium";v="110", "Not A(Brand";v="24", "Google Chrome";v="110"',
  'sec-ch-ua-mobile': '?0',
  'sec-ch-ua-platform': '"Windows"',
  'sec-fetch-dest': 'document',
  'sec-fetch-mode': 'navigate',
  'sec-fetch-site': 'none',
  'sec-fetch-user': '?1',
  'upgrade-insecure-requests': '1'
};

const server = http.createServer((req, res) => {
  try {
    // Mode 1: Web-based proxy (?u=URL)
    const q = url.parse(req.url, true).query;
    if (q.u && q.u.startsWith('http')) {
      return forwardRequest(q.u, req, res);
    }

    // Mode 2: Standard HTTP forward proxy
    if (req.url.startsWith('http://') || req.url.startsWith('https://')) {
      return forwardRequest(req.url, req, res);
    }

    // Default: show landing page
    res.writeHead(200, { 'Content-Type': 'text/html' });
    return res.end(
      '<h1>Web Proxy Running</h1>' +
      '<p>Append <b>?u=URL</b> to your domain to browse.</p>' +
      '<p>Or configure your app to use this as an HTTP proxy.</p>'
    );
  } catch (err) {
    console.error('Proxy Server Error:', err);
    res.writeHead(500);
    res.end('Proxy Server Error: ' + err.message);
  }
});

// Mode 3: HTTPS CONNECT tunneling
server.on('connect', (req, clientSocket, head) => {
  const [hostname, port] = req.url.split(':');
  const targetPort = parseInt(port) || 443;

  const serverSocket = net.connect(targetPort, hostname, () => {
    clientSocket.write('HTTP/1.1 200 Connection Established\r\n\r\n');
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

function forwardRequest(targetUrl, req, res) {
  const opt = url.parse(targetUrl);
  
  // Merge spoofed headers with original headers
  opt.headers = Object.assign({}, SPOOF_HEADERS, req.headers);
  
  // Important cleanup
  opt.headers.host = opt.host;
  delete opt.headers['accept-encoding']; // Stay uncompressed for stability through bridge
  delete opt.headers['connection'];
  delete opt.headers['content-length']; // Let Node recalculate if needed
  
  opt.method = req.method;
  opt.rejectUnauthorized = false; // Bypass SSL certificate issues

  const lib = targetUrl.startsWith('https') ? https : http;

  const pReq = lib.request(opt, (pRes) => {
    // Forward status and headers
    res.writeHead(pRes.statusCode, pRes.headers);
    
    // Pipe the response body
    pRes.pipe(res, { end: true });
  });

  pReq.on('error', (e) => {
    console.error('Forward Error:', targetUrl, e.message);
    res.writeHead(502);
    res.end('<h1>Proxy Fetch Error</h1><p>Target: ' + targetUrl + '</p><p>Error: ' + e.message + '</p>');
  });

  // Pipe the request body (for POST, etc)
  req.pipe(pReq, { end: true });
}

server.listen(PORT, () => console.log('Improved Proxy ready on port ' + PORT));
