<?php
$node_port = 3000;
$url = 'http://127.0.0.1:' . $node_port . $_SERVER['REQUEST_URI'];

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, false);
curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $_SERVER['REQUEST_METHOD']);

$req_headers = [];
foreach (getallheaders() as $key => $value) {
    if (strtolower($key) !== 'host') $req_headers[] = "$key: $value";
}
curl_setopt($ch, CURLOPT_HTTPHEADER, $req_headers);

if (in_array($_SERVER['REQUEST_METHOD'], ['POST', 'PUT', 'PATCH'])) {
    curl_setopt($ch, CURLOPT_POSTFIELDS, file_get_contents('php://input'));
}

// Handle Response Headers
curl_setopt($ch, CURLOPT_HEADERFUNCTION, function($ch, $header) {
    $len = strlen($header);
    $h = trim($header);
    
    if (!$h) return $len;

    // Handle Status Line
    if (preg_match('/^HTTP\/\d\.\d\s+(\d+)/i', $h, $matches)) {
        http_response_code(intval($matches[1]));
        return $len;
    }

    $lower = strtolower($h);
    // Block list for HTTP/2 compatibility and proxy stability
    $blocked = [
        'transfer-encoding:',
        'content-length:',
        'connection:',
        'content-encoding:',
        'server:',
        'proxy-',
        'expect-ct:',
        'alt-svc:',
        'host:'
    ];

    foreach ($blocked as $b) {
        if (strpos($lower, $b) === 0) return $len;
    }

    // Set-Cookie must be appended, others should be replaced to avoid duplicates
    $replace = (strpos($lower, 'set-cookie:') === 0) ? false : true;
    header($h, $replace);
    
    return $len;
});

$response = curl_exec($ch);
$error = curl_error($ch);
curl_close($ch);

if ($response === false) {
    http_response_code(502);
    die('Bridge Error: ' . $error);
}

echo $response;
