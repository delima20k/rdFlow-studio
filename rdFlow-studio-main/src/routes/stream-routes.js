const { Router } = require("express");
const { validationMiddleware } = require("../middlewares/validation-middleware");
const { createStreamSchema } = require("../validators/stream-validator");

function createStreamRoutes(streamController) {
  const router = Router();

  router.post("/streams", validationMiddleware(createStreamSchema), streamController.createStream);
  router.get("/streams", streamController.listStreams);
  router.get("/streams/:streamId", streamController.getStreamById);

  return router;
}

module.exports = {
  createStreamRoutes
};
