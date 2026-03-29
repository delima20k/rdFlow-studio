const path = require("path");

function toBoolean(value, defaultValue) {
  if (value === undefined) {
    return defaultValue;
  }

  return value === "true";
}

function loadEnv() {
  return {
    nodeEnv: process.env.NODE_ENV || "development",
    port: Number(process.env.PORT || 3000),
    corsOrigin: process.env.CORS_ORIGIN || "*",
    apiBaseUrl: process.env.API_BASE_URL || "http://localhost:3000",
    rtmpPort: Number(process.env.RTMP_PORT || 1935),
    hlsPath: path.resolve(process.cwd(), process.env.HLS_PATH || "./media/live"),
    hlsFragment: Number(process.env.HLS_FRAGMENT || 3),
    hlsListSize: Number(process.env.HLS_LIST_SIZE || 3),
    hlsCleanup: toBoolean(process.env.HLS_CLEANUP, true),
    dbPath: path.resolve(process.cwd(), process.env.DB_PATH || "./data/streaming.sqlite"),
    ffmpegPath: process.env.FFMPEG_PATH || "ffmpeg"
  };
}

module.exports = {
  loadEnv
};
