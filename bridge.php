<?php
$node_port = 3000;
$url = 'http://127.0.0.1:' . $node_port . $_SERVER['REQUEST_URI'];

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HEADER, true);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, false);
curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $_SERVER['REQUEST_METHOD']);

$headers = [];
foreach (getallheaders() as $key => $value) {
    if (strtolower($key) !== 'host') $headers[] = "$key: $value";
}
curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);

if (in_array($_SERVER['REQUEST_METHOD'], ['POST', 'PUT', 'PATCH'])) {
    curl_setopt($ch, CURLOPT_POSTFIELDS, file_get_contents('php://input'));
}

$response = curl_exec($ch);
$header_size = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
$res_headers = substr($response, 0, $header_size);
$res_body = substr($response, $header_size);
$http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($response === false) {
    http_response_code(502);
    die('Bridge Error: ' . curl_error($ch));
}

http_response_code($http_code);

foreach (explode("\r\n", $res_headers) as $h) {
    $lower = strtolower($h);
    // Strip headers that interfere with the bridge/web server relation
    if ($h && strpos($h, ':') !== false) {
        if (!preg_match('/^(transfer-encoding|content-length|connection|content-encoding|server):/i', $h)) {
            header($h);
        }
    }
}

echo $res_body;
