const http = require('http');
const https = require('https');
const net = require('net');
const url = require('url');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const LOG_FILE = path.join(__dirname, 'proxy.log');

// Log to file for debugging on Hostinger
function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  fs.appendFileSync(LOG_FILE, line);
  console.log(msg);
}

// Browsers-like headers
const SPOOF_HEADERS = {
  'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36',
  'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
  'accept-language': 'en-US,en;q=0.9',
  'cache-control': 'max-age=0'
};

const server = http.createServer((req, res) => {
  try {
    log(`Request: ${req.method} ${req.url}`);

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
    return res.end('<h1>Web Proxy Running</h1><p>Append <b>?u=URL</b> to your domain to browse.</p>');
  } catch (err) {
    log(`Server Error: ${err.message}`);
    res.writeHead(500);
    res.end('<h1>Proxy Server Error</h1><p>' + err.message + '</p>');
  }
});

// Mode 3: HTTPS CONNECT tunneling
server.on('connect', (req, clientSocket, head) => {
  const [hostname, port] = req.url.split(':');
  const targetPort = parseInt(port) || 443;
  log(`CONNECT: ${hostname}:${targetPort}`);

  const serverSocket = net.connect(targetPort, hostname, () => {
    clientSocket.write('HTTP/1.1 200 Connection Established\r\n\r\n');
    serverSocket.write(head);
    serverSocket.pipe(clientSocket);
    clientSocket.pipe(serverSocket);
  });

  serverSocket.on('error', (err) => {
    log(`CONNECT Error: ${err.message}`);
    clientSocket.write('HTTP/1.1 502 Bad Gateway\r\n\r\n');
    clientSocket.end();
  });

  clientSocket.on('error', () => {
    serverSocket.destroy();
  });
});

function forwardRequest(targetUrl, req, res) {
  const opt = url.parse(targetUrl);
  opt.headers = Object.assign({}, SPOOF_HEADERS, req.headers);
  
  opt.headers.host = opt.host;
  delete opt.headers['accept-encoding'];
  delete opt.headers['connection'];
  delete opt.headers['content-length'];
  
  opt.method = req.method;
  opt.rejectUnauthorized = false; // Bypass SSL certificate issues

  const lib = targetUrl.startsWith('https') ? https : http;

  const pReq = lib.request(opt, (pRes) => {
    // Rewrite redirects for Web Mode (/?u=)
    if (pRes.headers.location && req.url.includes('?u=')) {
      const proxyDomain = req.headers['x-forwarded-host'] || req.headers.host || 'vpn.abdullahsourcing.com';
      const proto = req.headers['x-forwarded-proto'] || (req.connection.encrypted ? 'https' : 'http');
      const absoluteLocation = url.resolve(targetUrl, pRes.headers.location);
      pRes.headers.location = `${proto}://${proxyDomain}/?u=${absoluteLocation}`;
      log(`Redirect rewritten: ${pRes.headers.location}`);
    }

    // HTML Rewriting for sub-resources (links, images, scripts)
    const isHtml = pRes.headers['content-type'] && pRes.headers['content-type'].includes('text/html');
    const proxyDomain = req.headers['x-forwarded-host'] || req.headers.host || 'vpn.abdullahsourcing.com';
    const proto = req.headers['x-forwarded-proto'] || (req.connection.encrypted ? 'https' : 'http');
    const proxyBase = `${proto}://${proxyDomain}/?u=`;

    if (isHtml && req.url.includes('?u=')) {
      delete pRes.headers['content-length']; // Length will change after rewrite
      res.writeHead(pRes.statusCode, pRes.headers);
      
      pRes.on('data', (chunk) => {
        let html = chunk.toString();
        // Regex to find href, src, action attributes and prepend the proxy URL
        // It uses url.resolve to handle relative vs absolute paths correctly
        html = html.replace(/(href|src|action)=["']([^"']+)["']/gi, (match, attr, contentUrl) => {
          if (contentUrl.startsWith('data:') || contentUrl.startsWith('javascript:') || contentUrl.startsWith('#')) {
            return match; // Ignore data URIs and anchor links
          }
          const absoluteUrl = url.resolve(targetUrl, contentUrl);
          return `${attr}="${proxyBase}${absoluteUrl}"`;
        });
        res.write(html);
      });
      pRes.on('end', () => res.end());
    } else {
      res.writeHead(pRes.statusCode, pRes.headers);
      pRes.pipe(res, { end: true });
    }
  });

  pReq.on('error', (e) => {
    log(`Fetch Error (${targetUrl}): ${e.message}`);
    res.writeHead(502);
    res.end('<h1>Proxy Fetch Error</h1><p>' + e.message + '</p>');
  });

  req.pipe(pReq, { end: true });
}

server.listen(PORT, () => log('Proxy listening on port ' + PORT));
