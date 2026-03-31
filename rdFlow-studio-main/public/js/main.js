import { streamApiService } from "./services/stream-api-service.js";

const titleInput = document.querySelector("#stream-title");
const streamIdInput = document.querySelector("#stream-id");
const createButton = document.querySelector("#create-stream");
const startButton = document.querySelector("#start-ingest");
const stopButton = document.querySelector("#stop-ingest");
const playButton = document.querySelector("#play-stream");
const resultBox = document.querySelector("#result");
const player = document.querySelector("#live-player");

function setResult(message) {
  resultBox.textContent = message;
}

function playHls(playlistUrl) {
  if (window.Hls && window.Hls.isSupported()) {
    const hls = new window.Hls({
      lowLatencyMode: true
    });

    hls.loadSource(playlistUrl);
    hls.attachMedia(player);
    return;
  }

  if (player.canPlayType("application/vnd.apple.mpegurl")) {
    player.src = playlistUrl;
    return;
  }

  setResult("Este navegador nao suporta HLS sem hls.js.");
}

createButton.addEventListener("click", async () => {
  try {
    const title = titleInput.value.trim();

    if (!title) {
      setResult("Informe um titulo para a transmissao.");
      return;
    }

    const payload = await streamApiService.createStream(title);
    streamIdInput.value = payload.stream.id;

    setResult(
      `Stream criada. RTMP: ${payload.ingest.url} | Playlist: ${payload.hls.playlistUrl}`
    );
  } catch (error) {
    setResult(error.message);
  }
});

startButton.addEventListener("click", async () => {
  try {
    const streamId = streamIdInput.value.trim();

    if (!streamId) {
      setResult("Informe o streamId.");
      return;
    }

    const payload = await streamApiService.startRtmpIngest(streamId);
    setResult(`${payload.message} Endpoint RTMP: ${payload.ingest.url}`);
  } catch (error) {
    setResult(error.message);
  }
});

stopButton.addEventListener("click", async () => {
  try {
    const streamId = streamIdInput.value.trim();

    if (!streamId) {
      setResult("Informe o streamId.");
      return;
    }

    const payload = await streamApiService.stopRtmpIngest(streamId);
    setResult(payload.message);
  } catch (error) {
    setResult(error.message);
  }
});

playButton.addEventListener("click", async () => {
  try {
    const streamId = streamIdInput.value.trim();

    if (!streamId) {
      setResult("Informe o streamId.");
      return;
    }

    const payload = await streamApiService.getStream(streamId);
    playHls(payload.hls.playlistUrl);
    setResult("Tentando reproduzir stream ao vivo...");
  } catch (error) {
    setResult(error.message);
  }
});
