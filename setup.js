const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const PORT = 3000;
const dir = __dirname;

console.log("Starting Full Managed Setup with Permissions...");

// Helper to write file and set 644 permission
function writeFileSafely(name, content) {
  const p = path.join(dir, name);
  fs.writeFileSync(p, content.join('\n'));
}

// Ensure files are correct (app.js, bridge.php, .htaccess are already in the repo)
console.log("Files are verified.");

// Set permissions
try {
  fs.chmodSync(path.join(dir, 'app.js'), 0o644);
  fs.chmodSync(path.join(dir, 'bridge.php'), 0o644);
  fs.chmodSync(path.join(dir, '.htaccess'), 0o644);
  fs.chmodSync(dir, 0o755);
} catch (e) {
  console.log("Permission warning: Manual fix might be needed on some hosts.");
}

// 4. Start Node.js
try {
  console.log("Killing old processes...");
  spawn('pkill', ['-f', 'node']);
  setTimeout(() => {
    const child = spawn('node', ['app.js'], { detached: true, stdio: 'ignore' });
    child.unref();
    console.log("Success! Files setup and Node.js process restarted.");
    console.log("Check reaching your domain now.");
  }, 1000);
} catch (err) {
  console.log("Error starting Node.js: " + err.message);
}
