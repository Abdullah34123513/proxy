# Hostinger Node.js Proxy Bridge

This project allows you to run a Node.js application on a Hostinger Shared Hosting plan without the official Node.js Selector.

## How to Deploy
1. Clone this repo into your `public_html/` folder.
2. Run `node setup.js`.
3. Visit your domain!

## Files
- `app.js`: The central Node.js proxy logic.
- `bridge.php`: Routes traffic from Port 80 to Port 3000.
- `.htaccess`: Redirects visitors to `bridge.php`.
- `setup.js`: One-click setup and process manager.
