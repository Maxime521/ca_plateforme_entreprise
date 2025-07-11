const http = require('http');

const server = http.createServer((req, res) => {
  res.writeHead(200, {'Content-Type': 'text/html'});
  res.end(`
    <html>
      <head><title>Test Server</title></head>
      <body>
        <h1>🎉 Server is Working!</h1>
        <p>Time: ${new Date().toLocaleString()}</p>
        <p>URL: ${req.url}</p>
        <p>Method: ${req.method}</p>
      </body>
    </html>
  `);
});

server.listen(3000, '0.0.0.0', () => {
  console.log('Server running on http://0.0.0.0:3000');
});