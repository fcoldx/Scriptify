import test from "node:test";
import assert from "node:assert/strict";
import { AppError, ProviderError, buildMessages, buildVisionMessages, chatCompletionsUrl, extractContent, isRetryableFormatError, mergePackages, normalizePackage, parseJsonContent, planSegments, requestCompletion, splitDuration, validateReferenceImage } from "../lib/provider.js";

test("menormalkan base URL menjadi endpoint chat completions", () => {
  assert.equal(chatCompletionsUrl("https://api.example.com/v1"), "https://api.example.com/v1/chat/completions");
  assert.equal(
    chatCompletionsUrl("https://api.example.com/v1/chat/completions"),
    "https://api.example.com/v1/chat/completions",
  );
});

test("mengizinkan HTTP hanya untuk localhost", () => {
  assert.equal(chatCompletionsUrl("http://localhost:11434/v1"), "http://localhost:11434/v1/chat/completions");
  assert.throws(() => chatCompletionsUrl("http://example.com/v1"), /HTTPS/);
  assert.throws(() => chatCompletionsUrl("https://192.168.1.2/v1"), /privat/);
});

test("membaca JSON di dalam code fence", () => {
  assert.deepEqual(parseJsonContent('```json\n{"title":"Tes","scenes":[]}\n```'), { title: "Tes", scenes: [] });
});

test("memperbaiki newline mentah dan trailing comma dari model", () => {
  const parsed = parseJsonContent('{"title":"Tes","summary":"Baris satu\nbaris dua", "scenes": [],}');
  assert.equal(parsed.summary, "Baris satu\nbaris dua");
});

test("mengambil objek JSON pertama dari reasoning dan teks tambahan", () => {
  const parsed = parseJsonContent('<think>analisis internal</think> Hasil:\n{"title":"Tes","scenes":[]}\nSelesai.');
  assert.equal(parsed.title, "Tes");
});

test("menerima array scene dan alias field yang umum", () => {
  const result = normalizePackage([
    { judul: "Pembuka", durasi: 9, narasi: "Narasi pembuka.", visual_prompt: "Documentary opening shot." },
  ]);
  assert.equal(result.scenes[0].title, "Pembuka");
  assert.equal(result.scenes[0].visualPrompt, "Documentary opening shot.");
});

test("mendeteksi respons yang terpotong", () => {
  assert.throws(
    () => extractContent({ choices: [{ finish_reason: "length", message: { content: "{\"title\":" } }] }),
    (error) => error instanceof AppError && error.code === "TRUNCATED_MODEL_RESPONSE",
  );
});

test("memvalidasi gambar referensi dan membangun pesan vision", () => {
  const image = "data:image/png;base64,iVBORw0KGgo=";
  assert.equal(validateReferenceImage(image), image);
  assert.equal(validateReferenceImage(""), null);
  assert.throws(
    () => validateReferenceImage("data:image/svg+xml;base64,PHN2Zz4="),
    (error) => error instanceof AppError && error.code === "INVALID_REFERENCE_IMAGE",
  );

  const messages = buildVisionMessages(image);
  assert.equal(messages[1].content[1].type, "image_url");
  assert.equal(messages[1].content[1].image_url.url, image);
});

test("mengizinkan fallback ketika format model tidak valid", () => {
  const error = new AppError("bad json", 502, "INVALID_MODEL_JSON");
  assert.equal(isRetryableFormatError(error), true);
});

test("membagi durasi panjang menjadi bagian maksimal empat menit", () => {
  const segments = planSegments(10);
  assert.deepEqual(segments, [3.33, 3.33, 3.34]);
  assert.equal(segments.reduce((sum, value) => sum + value, 0), 10);
  assert.ok(segments.every((value) => value <= 4));
});

test("membagi ulang bagian terpotong tanpa kehilangan durasi", () => {
  assert.deepEqual(splitDuration(3.33), [1.66, 1.67]);
  assert.deepEqual(splitDuration(1.25), [0.62, 0.63]);
});

test("mempertahankan posisi alur ketika satu bagian dipecah adaptif", () => {
  const input = {
    topic: "Inflasi",
    durationMinutes: 3,
    contentType: "Dokumenter",
    audience: "Umum",
    tone: "Informatif",
    visualType: "image",
    language: "Bahasa Indonesia",
    notes: "",
  };
  const messages = buildMessages(input, {
    index: 0,
    total: 1,
    durationMinutes: 1.5,
    isFirst: true,
    isLast: false,
    label: "1 dari 1 · A",
  });
  assert.match(messages[0].content, /bagian pembuka/i);
  assert.match(messages[1].content, /1 dari 1 · A/);
});

test("menyertakan identity anchor dalam arahan prompt visual", () => {
  const input = {
    topic: "Petualangan karakter",
    durationMinutes: 3,
    contentType: "Dokumenter",
    audience: "Umum",
    tone: "Sinematik",
    visualType: "image",
    language: "Bahasa Indonesia",
    notes: "",
    characterProfile: "A young woman with a round face, short black bob hair, amber eyes, and a rust-orange jacket.",
  };
  const messages = buildMessages(input);
  assert.match(messages[0].content, /tidak boleh mengubah wajah/i);
  assert.match(messages[1].content, /CHARACTER IDENTITY ANCHOR/);
  assert.match(messages[1].content, /rust-orange jacket/);
});

test("menggabungkan paket dan menomori ulang scene", () => {
  const merged = mergePackages([
    { title: "Tes", summary: "Ringkasan", scenes: [{ id: "SC-001", title: "A", estimatedDurationSeconds: 8, narration: "A", visualPrompt: "A" }] },
    { title: "Tes bagian 2", summary: "", scenes: [{ id: "SC-001", title: "B", estimatedDurationSeconds: 9, narration: "B", visualPrompt: "B" }] },
  ]);
  assert.equal(merged.scenes[0].id, "SC-001");
  assert.equal(merged.scenes[1].id, "SC-002");
  assert.equal(merged.estimatedTotalSeconds, 17);
});

test("menormalkan scene dan menghitung total durasi", () => {
  const result = normalizePackage({
    title: "Inflasi",
    summary: "Penjelasan singkat",
    scenes: [
      { title: "Daya beli", estimatedDurationSeconds: 12, narration: "Narasi pertama.", visualPrompt: "A market." },
      { title: "Harga", estimatedDurationSeconds: 9, narration: "Narasi kedua.", visualPrompt: "Price tags." },
    ],
  });
  assert.equal(result.estimatedTotalSeconds, 21);
  assert.equal(result.scenes[0].id, "SC-001");
  assert.equal(result.scenes[1].id, "SC-002");
});

test("menolak scene yang tidak lengkap", () => {
  assert.throws(
    () => normalizePackage({ title: "Tes", scenes: [{ title: "Kosong", narration: "Ada narasi" }] }),
    /tidak memiliki narasi atau prompt visual/,
  );
});

test("mengubah kegagalan jaringan menjadi error provider yang jelas", async (context) => {
  const originalFetch = globalThis.fetch;
  context.after(() => { globalThis.fetch = originalFetch; });
  globalThis.fetch = async () => {
    const error = new TypeError("fetch failed");
    error.cause = { code: "EACCES" };
    throw error;
  };

  await assert.rejects(
    requestCompletion({
      baseUrl: "https://api.example.com/v1",
      apiKey: "test-key",
      model: "test-model",
      body: { messages: [] },
    }),
    (error) => error instanceof ProviderError && error.status === 502 && /izin mengakses jaringan/.test(error.message),
  );
});
