const fs = require("fs");
const path = require("path");

class IngestController {
  constructor(streamService, ffmpegIngestService) {
    this.streamService = streamService;
    this.ffmpegIngestService = ffmpegIngestService;
  }

  startRtmpIngest = async (request, response, next) => {
    try {
      const stream = await this.streamService.getStreamById(request.body.streamId);

      if (!stream) {
        return response.status(404).json({ message: "Transmissao nao encontrada." });
      }

      const startResult = await this.ffmpegIngestService.startRtmpIngest(stream);

      return response.json({
        message: startResult.alreadyRunning
          ? "Ingestao ja estava ativa para esta transmissao."
          : "Aguardando sinal RTMP no endpoint informado.",
        ingest: this.streamService.buildIngestInfo(stream),
        hls: this.streamService.buildHlsInfo(stream)
      });
    } catch (error) {
      return next(error);
    }
  };

  stopRtmpIngest = async (request, response, next) => {
    try {
      const stream = await this.streamService.getStreamById(request.body.streamId);

      if (!stream) {
        return response.status(404).json({ message: "Transmissao nao encontrada." });
      }

      const stopped = await this.ffmpegIngestService.stopRtmpIngest(stream.id);

      return response.json({
        message: stopped
          ? "Ingestao RTMP finalizada."
          : "Nao havia ingestao ativa para esta transmissao."
      });
    } catch (error) {
      return next(error);
    }
  };

  getHlsManifest = async (request, response, next) => {
    try {
      const stream = await this.streamService.getStreamById(request.params.streamId);

      if (!stream) {
        return response.status(404).json({ message: "Transmissao nao encontrada." });
      }

      const playlistPath = path.join(this.streamService.getStreamOutputPath(stream), "index.m3u8");

      if (!fs.existsSync(playlistPath)) {
        return response.status(404).json({
          message: "Playlist HLS indisponivel. Inicie o ingestao e envie sinal de video."
        });
      }

      response.setHeader("Content-Type", "application/vnd.apple.mpegurl");
      return response.sendFile(playlistPath);
    } catch (error) {
      return next(error);
    }
  };

  getHlsChunk = async (request, response, next) => {
    try {
      const stream = await this.streamService.getStreamById(request.params.streamId);

      if (!stream) {
        return response.status(404).json({ message: "Transmissao nao encontrada." });
      }

      const safeSegmentName = path.basename(request.params.segmentName);
      const segmentPath = path.join(this.streamService.getStreamOutputPath(stream), safeSegmentName);

      if (!fs.existsSync(segmentPath)) {
        return response.status(404).json({ message: "Chunk HLS nao encontrado." });
      }

      return response.sendFile(segmentPath);
    } catch (error) {
      return next(error);
    }
  };
}

module.exports = {
  IngestController
};
