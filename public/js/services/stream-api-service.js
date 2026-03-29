import { API_CONFIG } from "../config/api-config.js";
import { httpClient } from "../helpers/http-client.js";

class StreamApiService {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
  }

  createStream(title) {
    return httpClient(`${this.baseUrl}${API_CONFIG.versionPrefix}/streams`, {
      method: "POST",
      body: JSON.stringify({ title })
    });
  }

  startRtmpIngest(streamId) {
    return httpClient(`${this.baseUrl}${API_CONFIG.versionPrefix}/ingest/rtmp/start`, {
      method: "POST",
      body: JSON.stringify({ streamId })
    });
  }

  stopRtmpIngest(streamId) {
    return httpClient(`${this.baseUrl}${API_CONFIG.versionPrefix}/ingest/rtmp/stop`, {
      method: "POST",
      body: JSON.stringify({ streamId })
    });
  }

  getStream(streamId) {
    return httpClient(`${this.baseUrl}${API_CONFIG.versionPrefix}/streams/${streamId}`);
  }
}

const streamApiService = new StreamApiService(API_CONFIG.baseUrl);

export { streamApiService };
