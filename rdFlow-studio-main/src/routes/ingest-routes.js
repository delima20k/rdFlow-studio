const { Router } = require("express");
const { validationMiddleware } = require("../middlewares/validation-middleware");
const { startIngestSchema } = require("../validators/stream-validator");

function createIngestRoutes(ingestController) {
  const router = Router();

  router.post("/ingest/rtmp/start", validationMiddleware(startIngestSchema), ingestController.startRtmpIngest);
  router.post("/ingest/rtmp/stop", validationMiddleware(startIngestSchema), ingestController.stopRtmpIngest);
  router.get("/streams/:streamId/hls/index.m3u8", ingestController.getHlsManifest);
  router.get("/streams/:streamId/hls/:segmentName", ingestController.getHlsChunk);

  return router;
}

module.exports = {
  createIngestRoutes
};
