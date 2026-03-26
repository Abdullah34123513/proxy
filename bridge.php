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
    if (strtolower($key) !== 'host') {
        $req_headers[] = "$key: $value";
    } else {
        $req_headers[] = "X-Forwarded-Host: $value";
    }
}
$req_headers[] = "X-Forwarded-Proto: " . (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? "https" : "http");
curl_setopt($ch, CURLOPT_HTTPHEADER, $req_headers);

if (in_array($_SERVER['REQUEST_METHOD'], ['POST', 'PUT', 'PATCH'])) {
    curl_setopt($ch, CURLOPT_POSTFIELDS, file_get_contents('php://input'));
}

// We will capture headers into an array first, then process them
$res_headers = [];
curl_setopt($ch, CURLOPT_HEADERFUNCTION, function($ch, $header) use (&$res_headers) {
    $res_headers[] = $header;
    return strlen($header);
});

$response = curl_exec($ch);
$http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($response === false) {
    http_response_code(502);
    die('Bridge Error');
}

// Set status code first
http_response_code($http_code);

// Only forward safe/essential headers
foreach ($res_headers as $h) {
    $h = trim($h);
    if (!$h || stripos($h, 'HTTP/') === 0) continue;
    
    $lower = strtolower($h);
    $is_safe = false;
    $safe_prefixes = ['content-type:', 'location:', 'set-cookie:', 'cache-control:', 'pragma:', 'expires:'];
    
    foreach ($safe_prefixes as $prefix) {
        if (strpos($lower, $prefix) === 0) {
            $is_safe = true;
            break;
        }
    }
    
    if ($is_safe) {
        $replace = (strpos($lower, 'set-cookie:') === 0) ? false : true;
        header($h, $replace);
    }
}

echo $response;
