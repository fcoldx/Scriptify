import test from "node:test";
import assert from "node:assert/strict";
import { AppError, ProviderError, buildEnhanceMessages, buildMessages, buildVisionMessages, chatCompletionsUrl, estimateSegmentMaxTokens, extractContent, isAdaptiveSplitError, isRetryableFormatError, mergePackages, normalizePackage, parseJsonContent, planGenerationTokenBudgets, planSegments, planVisualScenes, planVisionTokenBudgets, requestCompletion, splitDuration, validateReferenceImage, visualTiming } from "../lib/provider.js";

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
  assert.match(messages[0].content, /visual consistency anchor/i);
  assert.match(messages[0].content, /overlay UI/i);
  assert.equal(messages[1].content[1].type, "image_url");
  assert.equal(messages[1].content[1].image_url.url, image);
});

test("mengizinkan fallback ketika format model tidak valid", () => {
  const error = new AppError("bad json", 502, "INVALID_MODEL_JSON");
  assert.equal(isRetryableFormatError(error), true);
});

test("memecah bagian pada truncation dan timeout provider", () => {
  assert.equal(isAdaptiveSplitError(new AppError("cut", 502, "TRUNCATED_MODEL_RESPONSE")), true);
  assert.equal(isAdaptiveSplitError(new ProviderError("timeout", 524)), true);
  assert.equal(isAdaptiveSplitError(new ProviderError("gateway timeout", 504)), true);
  assert.equal(isAdaptiveSplitError(new ProviderError("unavailable", 503)), false);
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

test("menghitung budget token berdasarkan durasi dan kompleksitas visual", () => {
  const oneMinute = estimateSegmentMaxTokens(1, { ceiling: 50000, visualType: "image" });
  const fourMinutes = estimateSegmentMaxTokens(4, { ceiling: 50000, visualType: "image" });
  const video = estimateSegmentMaxTokens(4, { ceiling: 50000, visualType: "video" });
  const mixed = estimateSegmentMaxTokens(4, { ceiling: 50000, visualType: "mixed", isFirst: true });
  const character = estimateSegmentMaxTokens(4, {
    ceiling: 50000,
    visualType: "image",
    hasCharacterProfile: true,
  });

  assert.ok(oneMinute < fourMinutes);
  assert.ok(video < fourMinutes);
  assert.ok(video < mixed);
  assert.ok(mixed < fourMinutes);
  assert.ok(fourMinutes < character);
  assert.equal(estimateSegmentMaxTokens(30, { ceiling: 4000, visualType: "video" }), 4000);
});

test("menggunakan durasi visual berbeda untuk gambar dan video", () => {
  assert.deepEqual(visualTiming("image"), { minimumSeconds: 3, maximumSeconds: 4, targetSeconds: 3.5 });
  assert.deepEqual(visualTiming("video"), { minimumSeconds: 8, maximumSeconds: 12, targetSeconds: 10 });

  const raw = {
    title: "Timing",
    scenes: [{ title: "A", estimatedDurationSeconds: 20, narration: "Narasi.", visualPrompt: "Visual." }],
  };
  assert.equal(normalizePackage(raw, { visualType: "image" }).scenes[0].estimatedDurationSeconds, 4);
  assert.equal(normalizePackage(raw, { visualType: "video" }).scenes[0].estimatedDurationSeconds, 12);
});

test("merencanakan video pembuka lalu gambar pada mode campuran", () => {
  assert.deepEqual(planVisualScenes(1, "mixed", true), {
    targetScenes: 14,
    videoScenes: 2,
    imageScenes: 12,
  });
  assert.deepEqual(planVisualScenes(1, "mixed", false), {
    targetScenes: 18,
    videoScenes: 0,
    imageScenes: 18,
  });

  const raw = {
    title: "Campuran",
    scenes: [
      { title: "Hook", estimatedDurationSeconds: 3, visualType: "image", narration: "Hook.", visualPrompt: "Hook visual." },
      { title: "Lanjut", estimatedDurationSeconds: 10, visualType: "video", narration: "Lanjut.", visualPrompt: "Still visual." },
    ],
  };
  const result = normalizePackage(raw, { visualType: "mixed", mixedVideoScenes: 1 });
  assert.equal(result.scenes[0].visualType, "video");
  assert.equal(result.scenes[0].estimatedDurationSeconds, 8);
  assert.equal(result.scenes[1].visualType, "image");
  assert.equal(result.scenes[1].estimatedDurationSeconds, 4);
});

test("menaikkan budget vision bertahap sampai ceiling", () => {
  assert.deepEqual(planVisionTokenBudgets(12000), [800, 1600, 3200, 6400, 12000]);
  assert.deepEqual(planVisionTokenBudgets(2500), [800, 1600, 2500]);
  assert.deepEqual(planVisionTokenBudgets(500), [500]);
});

test("menaikkan budget generasi bertahap sebelum memecah bagian", () => {
  assert.deepEqual(planGenerationTokenBudgets(4000, 8192), [4000, 6000, 8192]);
  assert.deepEqual(planGenerationTokenBudgets(6000, 8192), [6000, 8192]);
  assert.deepEqual(planGenerationTokenBudgets(8192, 8192), [8192]);
  assert.deepEqual(planGenerationTokenBudgets(12000, 8192), [8192]);
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
  assert.match(messages[0].content, /bahasa Indonesia sehari-hari/i);
  assert.match(messages[0].content, /nggak, cuma, bikin, kok/i);
  assert.match(messages[0].content, /terasa ditulis manusia, bukan dirakit dari template/i);
  assert.match(messages[0].content, /Variasikan ritme secara alami/i);
  assert.match(messages[0].content, /Pernah nggak sih, Bayangkan, Coba bayangin/i);
  assert.match(messages[0].content, /Hindari ciri tulisan AI/i);
  assert.match(messages[1].content, /Bahasa Indonesia percakapan sehari-hari/i);
  assert.match(messages[1].content, /silent read-aloud pass/i);
  assert.match(messages[0].content, /3–4 detik/);
  assert.match(messages[0].content, /satu focal point/i);
  assert.match(messages[0].content, /60–90 kata/i);
  assert.match(messages[0].content, /lokasi, subjek, aksi utama, objek tujuan/i);
  assert.match(messages[0].content, /antre membeli bensin di Bali/i);
  assert.match(messages[0].content, /Antrean di jalan tanpa fasilitas pengisian tidak cukup/i);
  assert.match(messages[1].content, /apakah lokasi spesifik terlihat/i);
  assert.match(messages[1].content, /1 dari 1 · A/);
});

test("memberi instruksi scene video 8–12 detik", () => {
  const input = {
    topic: "Inflasi",
    durationMinutes: 3,
    contentType: "Dokumenter",
    audience: "Umum",
    tone: "Informatif",
    visualType: "video",
    language: "Bahasa Indonesia",
    notes: "",
  };
  const systemPrompt = buildMessages(input)[0].content;
  assert.match(systemPrompt, /8–12 detik/);
  assert.match(systemPrompt, /pergerakan kamera/i);
  assert.match(systemPrompt, /80–120 kata/i);
});

test("memberi instruksi mode campuran video pembuka lalu gambar", () => {
  const input = {
    topic: "Inflasi",
    durationMinutes: 1,
    contentType: "Dokumenter",
    audience: "Umum",
    tone: "Informatif",
    visualType: "mixed",
    language: "Bahasa Indonesia",
    notes: "",
  };
  const systemPrompt = buildMessages(input)[0].content;
  assert.match(systemPrompt, /Mode campuran/i);
  assert.match(systemPrompt, /video untuk 2 scene paling awal/i);
  assert.match(systemPrompt, /Jangan kembali ke video/i);
  assert.match(systemPrompt, /field visualType/i);
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
  assert.match(messages[0].content, /bentuk kepala\/wajah/i);
  assert.match(messages[0].content, /overlay aplikasi atau UI/i);
  assert.match(messages[1].content, /CHARACTER VISUAL ANCHOR/);
  assert.match(messages[1].content, /rust-orange jacket/);
});

test("membangun tahap enhancement yang menjaga struktur draft", () => {
  const input = {
    topic: "Antrean bensin di Bali",
    durationMinutes: 1,
    contentType: "Dokumenter",
    audience: "Umum",
    tone: "Santai",
    visualType: "mixed",
    language: "Bahasa Indonesia",
    notes: "",
    characterProfile: "Minimalist round-headed stick figure with a blue scarf.",
  };
  const draft = {
    title: "Bali dan BBM",
    summary: "Draft",
    scenes: [{
      id: "SC-001",
      title: "Antrean",
      estimatedDurationSeconds: 10,
      visualType: "video",
      narration: "Orang lagi antre bensin di Bali.",
      visualPrompt: "A queue on a road.",
    }],
  };
  const messages = buildEnhanceMessages(input, { index: 0, total: 1, label: "1 dari 1" }, draft);

  assert.match(messages[0].content, /editor enhancement/i);
  assert.match(messages[0].content, /Pertahankan jumlah dan urutan scene, visualType, serta estimatedDurationSeconds/);
  assert.match(messages[0].content, /natural, sehari-hari/i);
  assert.match(messages[0].content, /humanization pass/i);
  assert.match(messages[0].content, /Jangan sengaja membuat typo/i);
  assert.match(messages[1].content, /voice actor manusia/i);
  assert.match(messages[0].content, /lokasi, subjek, aksi, objek tujuan\/penyebab/i);
  assert.match(messages[1].content, /CHARACTER VISUAL ANCHOR/);
  assert.match(messages[1].content, /Antrean bensin di Bali/);
  assert.match(messages[1].content, /\"visualType\":\"video\"/);
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

test("menyaring halaman HTML dari error timeout provider", async (context) => {
  const originalFetch = globalThis.fetch;
  context.after(() => { globalThis.fetch = originalFetch; });
  globalThis.fetch = async () => new Response(
    "<!DOCTYPE html><html><head><title>524: A timeout occurred</title></head><body>Cloudflare</body></html>",
    { status: 524, headers: { "Content-Type": "text/html" } },
  );

  await assert.rejects(
    requestCompletion({
      baseUrl: "https://api.example.com/v1",
      apiKey: "test-key",
      model: "test-model",
      body: { messages: [] },
    }),
    (error) => error instanceof ProviderError
      && error.status === 524
      && error.message === "Provider melewati batas waktu gateway (HTTP 524)."
      && !error.message.includes("<!DOCTYPE"),
  );
});
