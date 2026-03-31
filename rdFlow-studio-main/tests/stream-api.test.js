const path = require("path");
const os = require("os");
const request = require("supertest");

let app;
let streamId;

beforeAll(async () => {
  process.env.DB_PATH = path.join(os.tmpdir(), `streaming-test-${Date.now()}.sqlite`);
  process.env.HLS_PATH = path.join(os.tmpdir(), `streaming-hls-${Date.now()}`);
  process.env.API_BASE_URL = "http://localhost:3000";

  const { buildApplication } = require("../src/app");
  app = await buildApplication();
});

afterAll(async () => {
  await app.locals.closeResources();
});

describe("Streaming API", () => {
  it("deve responder no healthcheck", async () => {
    const response = await request(app).get("/health");

    expect(response.statusCode).toBe(200);
    expect(response.body.status).toBe("ok");
  });

  it("deve criar stream com dados de ingestao e hls", async () => {
    const response = await request(app)
      .post("/api/v1/streams")
      .send({ title: "Minha stream local" });

    expect(response.statusCode).toBe(201);
    expect(response.body.stream.id).toBeTruthy();
    expect(response.body.ingest.protocol).toBe("rtmp");
    expect(response.body.hls.playlistUrl).toContain("index.m3u8");

    streamId = response.body.stream.id;
  });

  it("deve listar streams criadas", async () => {
    const response = await request(app).get("/api/v1/streams");

    expect(response.statusCode).toBe(200);
    expect(Array.isArray(response.body.streams)).toBe(true);
    expect(response.body.streams.length).toBeGreaterThan(0);
  });

  it("deve retornar 404 para manifest inexistente", async () => {
    const response = await request(app).get(`/api/v1/streams/${streamId}/hls/index.m3u8`);

    expect(response.statusCode).toBe(404);
  });
});
