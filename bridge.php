<?php
$node_port = 3000;
$url = 'http://127.0.0.1:' . $node_port . $_SERVER['REQUEST_URI'];

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, false);
curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $_SERVER['REQUEST_METHOD']);

// Filter and forward incoming request headers
$req_headers = [];
foreach (getallheaders() as $key => $value) {
    if (strtolower($key) !== 'host') $req_headers[] = "$key: $value";
}
curl_setopt($ch, CURLOPT_HTTPHEADER, $req_headers);

if (in_array($_SERVER['REQUEST_METHOD'], ['POST', 'PUT', 'PATCH'])) {
    curl_setopt($ch, CURLOPT_POSTFIELDS, file_get_contents('php://input'));
}

// Handle Response Headers carefully to avoid HTTP/2 protocol errors
curl_setopt($ch, CURLOPT_HEADERFUNCTION, function($ch, $header) {
    $len = strlen($header);
    $h = trim($header);
    
    // Skip empty lines and full status lines (PHP handles the status separately)
    if (!$h || strpos($h, 'HTTP/') === 0) {
        return $len;
    }

    $lower = strtolower($h);
    // CRITICAL: Strip headers that are illegal or problematic in HTTP/2 / Proxying
    $blocked = [
        'transfer-encoding:',
        'content-length:',
        'connection:',
        'content-encoding:',
        'server:',
        'proxy-',
        'host:',
        'expect-ct:',
        'alt-svc:'
    ];

    foreach ($blocked as $b) {
        if (strpos($lower, $b) === 0) return $len;
    }

    header($h, false); // Add header without replacing
    return $len;
});

$response = curl_exec($ch);
$http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$error = curl_error($ch);
curl_close($ch);

if ($response === false) {
    http_response_code(502);
    die('Bridge Error: ' . $error);
}

http_response_code($http_code);
echo $response;
