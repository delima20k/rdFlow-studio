import { createServer } from 'http';
import { readFileSync } from 'fs';
import { extname, join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { networkInterfaces } from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PORT = process.env.PORT || 8080;

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon'
};

const server = createServer((req, res) => {
  let filePath = req.url === '/' ? '/index.html' : req.url;
  
  filePath = join(__dirname, filePath);
  
  const ext = extname(filePath);
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  try {
    const content = readFileSync(filePath);
    
    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': ext === '.js' && filePath.includes('sw.js') 
        ? 'public, max-age=0, must-revalidate'
        : 'public, max-age=3600'
    });
    
    res.end(content);
  } catch (error) {
    if (error.code === 'ENOENT') {
      res.writeHead(404, { 'Content-Type': 'text/html' });
      res.end('<h1>404 - Arquivo não encontrado</h1>');
    } else {
      res.writeHead(500, { 'Content-Type': 'text/html' });
      res.end('<h1>500 - Erro interno do servidor</h1>');
    }
  }
});

server.listen(PORT, () => {
  console.log(`🚀 Servidor rodando em:`);
  console.log(`   Local:    http://localhost:${PORT}`);
  console.log(`   Rede:     http://${getLocalIP()}:${PORT}`);
  console.log(``);
  console.log(`📱 Para conectar o celular:`);
  console.log(`   Abra no navegador: http://${getLocalIP()}:${PORT}`);
  console.log(``);
  console.log(`⚠️  Para instalar como PWA, use HTTPS (GitHub Pages, Vercel, etc.)`);
  console.log(``);
  console.log(`🛑 Pressione Ctrl+C para parar o servidor`);
});

function getLocalIP() {
  const nets = networkInterfaces();
  
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  
  return 'localhost';
}
