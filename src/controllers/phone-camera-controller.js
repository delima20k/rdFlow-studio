class PhoneCameraController {
  constructor(phoneCameraService) {
    this.phoneCameraService = phoneCameraService;
  }

  createSession = async (_request, response, next) => {
    try {
      const session = await this.phoneCameraService.createSession();

      return response.status(201).json(session);
    } catch (error) {
      return next(error);
    }
  };

  getSessionStatus = async (request, response, next) => {
    try {
      const { sessionId } = request.params;
      const status = await this.phoneCameraService.getSessionStatus(sessionId);

      return response.json(status);
    } catch (error) {
      return next(error);
    }
  };

  receiveOffer = async (request, response, next) => {
    try {
      const { sessionId } = request.params;
      const { offer } = request.body;

      await this.phoneCameraService.receiveOffer(sessionId, offer);

      const answer = await this.phoneCameraService.getAnswer(sessionId);

      return response.json({ success: true, answer });
    } catch (error) {
      return next(error);
    }
  };

  sendAnswer = async (request, response, next) => {
    try {
      const { sessionId } = request.params;
      const { answer } = request.body;

      await this.phoneCameraService.sendAnswer(sessionId, answer);

      return response.json({ success: true });
    } catch (error) {
      return next(error);
    }
  };
}

module.exports = {
  PhoneCameraController
};
