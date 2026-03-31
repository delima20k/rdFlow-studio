const { Router } = require("express");

function createPhoneCameraRoutes(phoneCameraController) {
  const router = Router();

  router.post("/phone-camera/sessions", phoneCameraController.createSession);
  router.get("/phone-camera/sessions/:sessionId/status", phoneCameraController.getSessionStatus);
  router.post("/phone-camera/sessions/:sessionId/offer", phoneCameraController.receiveOffer);
  router.post("/phone-camera/sessions/:sessionId/answer", phoneCameraController.sendAnswer);

  return router;
}

module.exports = {
  createPhoneCameraRoutes
};
