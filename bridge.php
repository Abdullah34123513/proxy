<?php
$node_port = 3000;
$url = 'http://127.0.0.1:' . $node_port . $_SERVER['REQUEST_URI'];

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HEADER, true); // We want to capture headers from Node
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, false); // Let the client handle redirects
curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $_SERVER['REQUEST_METHOD']);

$headers = [];
foreach (getallheaders() as $key => $value) {
    if (strtolower($key) != 'host') $headers[] = "$key: $value";
}
curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);

if ($_SERVER['REQUEST_METHOD'] == 'POST' || $_SERVER['REQUEST_METHOD'] == 'PUT') {
    curl_setopt($ch, CURLOPT_POSTFIELDS, file_get_contents('php://input'));
}

$response = curl_exec($ch);
$header_size = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
$res_headers = substr($response, 0, $header_size);
$res_body = substr($response, $header_size);
$error = curl_error($ch);
curl_close($ch);

if ($error) {
    die('Bridge Error: ' . $error);
}

// Forward Response Headers
foreach (explode("\r\n", $res_headers) as $h) {
    if ($h && !preg_match('/^Transfer-Encoding:/i', $h) && !preg_match('/^Content-Length:/i', $h)) {
        header($h);
    }
}

echo $res_body;
