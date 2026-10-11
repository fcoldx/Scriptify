import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:http";

function listen(server) {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve(server.address().port));
  });
}

function close(server) {
  return new Promise((resolve) => server.close(resolve));
}

async function waitForHealth(url, attempts = 30) {
  for (let index = 0; index < attempts; index += 1) {
    try {
      const response = await fetch(`${url}/api/health`);
      if (response.ok) return;
    } catch {
      // The child server may still be starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error("Server aplikasi tidak siap.");
}

test("alur API test dan generate bekerja dengan provider kompatibel", async (context) => {
  const requests = [];
  const provider = createServer(async (req, res) => {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    requests.push({ url: req.url, authorization: req.headers.authorization, body });

    const isTest = body.messages?.[0]?.content === "Reply with exactly: OK";
    const content = isTest
      ? "OK"
      : JSON.stringify({
          title: "Mengapa daya beli berubah",
          summary: "Naskah uji integrasi.",
          scenes: [
            {
              title: "Daya beli",
              estimatedDurationSeconds: 11,
              narration: "Bayangkan anggaran belanja Anda tetap sama, tetapi isi keranjang semakin sedikit.",
              visualPrompt: "Editorial documentary image of two grocery baskets, muted palette, 16:9, no text.",
            },
          ],
        });

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      id: "chatcmpl-test",
      model: "mock-model",
      choices: [{ message: { role: "assistant", content }, finish_reason: "stop" }],
      usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
    }));
  });

  const providerPort = await listen(provider);
  const appPort = providerPort + 1;
  const child = spawn(process.execPath, ["server.js"], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      PORT: String(appPort),
      OPENAI_BASE_URL: `http://localhost:${providerPort}/v1`,
      OPENAI_API_KEY: "test-secret",
      OPENAI_MODEL: "mock-model",
    },
    stdio: "ignore",
  });

  context.after(async () => {
    child.kill();
    await close(provider);
  });

  const appUrl = `http://127.0.0.1:${appPort}`;
  await waitForHealth(appUrl);

  const configResponse = await fetch(`${appUrl}/api/config`);
  const config = await configResponse.json();
  assert.equal(config.hasApiKey, true);
  assert.equal(config.model, "mock-model");
  assert.equal(Object.hasOwn(config, "apiKey"), false);

  const testResponse = await fetch(`${appUrl}/api/test`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  });
  const testPayload = await testResponse.json();
  assert.equal(testResponse.status, 200);
  assert.equal(testPayload.reply, "OK");

  const generateResponse = await fetch(`${appUrl}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      input: {
        topic: "Perubahan daya beli masyarakat",
        durationMinutes: 5,
        contentType: "Penjelasan finansial",
        audience: "Penonton umum",
        tone: "Informatif",
        visualType: "image",
        language: "Bahasa Indonesia",
      },
    }),
  });
  const generatePayload = await generateResponse.json();

  assert.equal(generateResponse.status, 200);
  assert.equal(generatePayload.meta.formatMode, "json_schema");
  assert.equal(generatePayload.result.scenes[0].id, "SC-001");
  assert.equal(generatePayload.result.scenes[0].estimatedDurationSeconds, 11);
  assert.equal(requests[0].authorization, "Bearer test-secret");
  assert.equal(requests[1].body.response_format.type, "json_schema");
  assert.equal(requests[1].url, "/v1/chat/completions");
});
