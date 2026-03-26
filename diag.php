<?php
$port = 3000;
$host = '127.0.0.1';

echo "<h1>Diagnostic: PHP to Node.js Connection</h1>";

echo "Checking if port $port is open...<br>";
$connection = @fsockopen($host, $port, $errno, $errstr, 2);

if (is_resource($connection)) {
    echo "<b style='color:green'>SUCCESS:</b> Connected to Node.js on port $port!<br>";
    fclose($connection);
} else {
    echo "<b style='color:red'>FAILURE:</b> Could not connect to Node.js on port $port.<br>";
    echo "Error Number: $errno<br>";
    echo "Error Message: $errstr<br>";
    echo "This usually means the Node.js process is not running or the port is blocked by the firewall.<br>";
}

echo "<h2>Environment Information</h2>";
echo "PHP version: " . PHP_VERSION . "<br>";
echo "Server Software: " . $_SERVER['SERVER_SOFTWARE'] . "<br>";
echo "Current File: " . __FILE__ . "<br>";
?>
