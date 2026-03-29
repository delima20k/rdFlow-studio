const path = require("path");
const { spawn } = require("child_process");
const { mkdir } = require("fs/promises");

class FfmpegIngestService {
  constructor(envConfig, streamService, onStatusChange) {
    this.envConfig = envConfig;
    this.streamService = streamService;
    this.onStatusChange = onStatusChange;
    this.processes = new Map();
  }

  async startRtmpIngest(streamModel) {
    if (this.processes.has(streamModel.id)) {
      return { alreadyRunning: true };
    }

    const outputDirectory = this.streamService.getStreamOutputPath(streamModel);
    await mkdir(outputDirectory, { recursive: true });

    const inputUrl = `rtmp://0.0.0.0:${this.envConfig.rtmpPort}/live/${streamModel.streamKey}`;
    const outputPlaylistPath = path.join(outputDirectory, "index.m3u8");
    const outputSegmentPattern = path.join(outputDirectory, "segment_%03d.ts");

    const hlsFlags = this.envConfig.hlsCleanup
      ? "delete_segments+append_list+omit_endlist"
      : "append_list+omit_endlist";

    const args = [
      "-hide_banner",
      "-loglevel",
      "warning",
      "-listen",
      "1",
      "-i",
      inputUrl,
      "-c:v",
      "copy",
      "-c:a",
      "aac",
      "-ar",
      "44100",
      "-ac",
      "2",
      "-f",
      "hls",
      "-hls_time",
      String(this.envConfig.hlsFragment),
      "-hls_list_size",
      String(this.envConfig.hlsListSize),
      "-hls_flags",
      hlsFlags,
      "-hls_segment_filename",
      outputSegmentPattern,
      outputPlaylistPath
    ];

    const ffmpegProcess = spawn(this.envConfig.ffmpegPath, args, {
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"]
    });

    ffmpegProcess.stdout.on("data", () => {
      this.onStatusChange(streamModel.id, "live").catch(() => {});
    });

    ffmpegProcess.stderr.on("data", () => {
      this.onStatusChange(streamModel.id, "waiting_input").catch(() => {});
    });

    ffmpegProcess.on("close", () => {
      this.processes.delete(streamModel.id);
      this.onStatusChange(streamModel.id, "offline").catch(() => {});
    });

    this.processes.set(streamModel.id, ffmpegProcess);
    await this.onStatusChange(streamModel.id, "waiting_input");

    return { alreadyRunning: false };
  }

  async stopRtmpIngest(streamId) {
    const processRef = this.processes.get(streamId);

    if (!processRef) {
      return false;
    }

    processRef.kill("SIGINT");
    this.processes.delete(streamId);
    await this.onStatusChange(streamId, "offline");

    return true;
  }

  stopAll() {
    for (const [, processRef] of this.processes.entries()) {
      processRef.kill("SIGINT");
    }

    this.processes.clear();
  }
}

module.exports = {
  FfmpegIngestService
};
