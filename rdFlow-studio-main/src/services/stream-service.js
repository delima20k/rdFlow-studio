const crypto = require("crypto");
const path = require("path");

class StreamService {
  constructor(streamRepository, envConfig) {
    this.streamRepository = streamRepository;
    this.envConfig = envConfig;
  }

  async createStream(title) {
    const now = new Date().toISOString();

    const streamData = {
      id: crypto.randomUUID(),
      title,
      streamKey: crypto.randomBytes(12).toString("hex"),
      status: "created",
      protocol: "rtmp",
      createdAt: now,
      updatedAt: now
    };

    return this.streamRepository.create(streamData);
  }

  async listStreams() {
    return this.streamRepository.findAll();
  }

  async getStreamById(streamId) {
    return this.streamRepository.findById(streamId);
  }

  async updateStatus(streamId, status) {
    await this.streamRepository.updateStatus(streamId, status);
  }

  buildIngestInfo(streamModel) {
    return {
      protocol: "rtmp",
      url: `rtmp://localhost:${this.envConfig.rtmpPort}/live/${streamModel.streamKey}`,
      streamKey: streamModel.streamKey,
      instructions: "No OBS, selecione Stream Custom e use a URL RTMP acima."
    };
  }

  buildHlsInfo(streamModel) {
    return {
      playlistUrl: `${this.envConfig.apiBaseUrl}/api/v1/streams/${streamModel.id}/hls/index.m3u8`,
      segmentBaseUrl: `${this.envConfig.apiBaseUrl}/api/v1/streams/${streamModel.id}/hls`
    };
  }

  getStreamOutputPath(streamModel) {
    return path.join(this.envConfig.hlsPath, streamModel.streamKey);
  }
}

module.exports = {
  StreamService
};
