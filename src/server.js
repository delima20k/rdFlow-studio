const { buildApplication } = require("./app");
const os = require('os');

function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const iface of Object.values(interfaces)) {
    for (const config of iface) {
      if (config.family === 'IPv4' && !config.internal) {
        return config.address;
      }
    }
  }
  return 'localhost';
}

async function startServer() {
  const app = await buildApplication();
  const { port } = app.locals.envConfig;
  const localIP = getLocalIP();

  const server = app.listen(port, '0.0.0.0', () => {
    console.log('\n🚀 Servidor de Streaming Iniciado!\n');
    console.log(`📱 Acesso Local:    http://localhost:${port}`);
    console.log(`🌐 Acesso na Rede:  http://${localIP}:${port}`);
    console.log(`\n💡 Use o IP da rede para testar no celular\n`);
  });

  const shutdown = async () => {
    server.close(async () => {
      await app.locals.closeResources();
      process.exit(0);
    });
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

startServer().catch((error) => {
  console.error("Falha ao iniciar servidor:", error);
  process.exit(1);
});
