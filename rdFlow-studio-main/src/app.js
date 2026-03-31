require("dotenv").config();

const express = require("express");
const cors = require("cors");
const morgan = require("morgan");

const { loadEnv } = require("./config/env");
const { initializeDatabase } = require("./config/database");
const { StreamRepository } = require("./repositories/stream-repository");
const { PhoneCameraSessionRepository } = require("./repositories/phone-camera-session-repository");
const { StreamService } = require("./services/stream-service");
const { FfmpegIngestService } = require("./services/ffmpeg-ingest-service");
const { PhoneCameraService } = require("./services/phone-camera-service");
const { StreamController } = require("./controllers/stream-controller");
const { IngestController } = require("./controllers/ingest-controller");
const { PhoneCameraController } = require("./controllers/phone-camera-controller");
const { createStreamRoutes } = require("./routes/stream-routes");
const { createIngestRoutes } = require("./routes/ingest-routes");
const { createPhoneCameraRoutes } = require("./routes/phone-camera-routes");
const { notFoundHandler } = require("./middlewares/not-found-handler");
const { errorHandler } = require("./middlewares/error-handler");

async function buildApplication() {
  const envConfig = loadEnv();
  const database = await initializeDatabase(envConfig.dbPath);

  const streamRepository = new StreamRepository(database);
  const phoneCameraSessionRepository = new PhoneCameraSessionRepository(database);

  await phoneCameraSessionRepository.initialize();

  const streamService = new StreamService(streamRepository, envConfig);
  const phoneCameraService = new PhoneCameraService(phoneCameraSessionRepository, envConfig);
  const ffmpegIngestService = new FfmpegIngestService(
    envConfig,
    streamService,
    async (streamId, status) => streamService.updateStatus(streamId, status)
  );

  const streamController = new StreamController(streamService);
  const ingestController = new IngestController(streamService, ffmpegIngestService);
  const phoneCameraController = new PhoneCameraController(phoneCameraService);

  const app = express();

  app.use(cors({ origin: envConfig.corsOrigin }));
  app.use(express.json());
  app.use(morgan("dev"));
  
  // Headers necessários para SharedArrayBuffer (FFmpeg.wasm)
  app.use((req, res, next) => {
    res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
    res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
    next();
  });
  
  app.use(express.static("public", { etag: false, lastModified: false, setHeaders: (res) => { res.setHeader('Cache-Control', 'no-store'); } }));
  
  // Favicon - evitar erro 404
  app.get("/favicon.ico", (req, res) => res.status(204).end());
  
  // Rotas para PWA da câmera do celular
  app.get("/camera", (req, res) => {
    res.sendFile("phone-camera.html", { root: "camera-remota-pwa" });
  });

  app.get("/camera/manifest.json", (req, res) => {
    res.setHeader("Content-Type", "application/manifest+json");
    res.sendFile("manifest.json", { root: "camera-remota-pwa" });
  });

  app.get("/camera/sw-camera.js", (req, res) => {
    res.setHeader("Content-Type", "application/javascript");
    res.setHeader("Service-Worker-Allowed", "/");
    res.sendFile("sw-camera.js", { root: "camera-remota-pwa" });
  });

  app.get("/health", (_request, response) => {
    response.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  app.use("/api/v1", createStreamRoutes(streamController));
  app.use("/api/v1", createIngestRoutes(ingestController));
  app.use("/api/v1", createPhoneCameraRoutes(phoneCameraController));

  app.use(notFoundHandler);
  app.use(errorHandler);

  app.locals.envConfig = envConfig;
  app.locals.closeResources = async () => {
    ffmpegIngestService.stopAll();
    await database.close();
  };

  return app;
}

module.exports = {
  buildApplication
};
