class StreamController {
  constructor(streamService) {
    this.streamService = streamService;
  }

  createStream = async (request, response, next) => {
    try {
      const stream = await this.streamService.createStream(request.body.title);

      return response.status(201).json({
        stream: stream.toPublic(),
        ingest: this.streamService.buildIngestInfo(stream),
        hls: this.streamService.buildHlsInfo(stream)
      });
    } catch (error) {
      return next(error);
    }
  };

  listStreams = async (_request, response, next) => {
    try {
      const streams = await this.streamService.listStreams();

      return response.json({
        streams: streams.map((stream) => stream.toPublic())
      });
    } catch (error) {
      return next(error);
    }
  };

  getStreamById = async (request, response, next) => {
    try {
      const stream = await this.streamService.getStreamById(request.params.streamId);

      if (!stream) {
        return response.status(404).json({ message: "Transmissao nao encontrada." });
      }

      return response.json({
        stream: stream.toPublic(),
        ingest: this.streamService.buildIngestInfo(stream),
        hls: this.streamService.buildHlsInfo(stream)
      });
    } catch (error) {
      return next(error);
    }
  };
}

module.exports = {
  StreamController
};
