import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import {
  AppError,
  ProviderError,
  SCRIPT_SCHEMA,
  buildMessages,
  buildVisionMessages,
  extractContent,
  isRetryableFormatError,
  mergePackages,
  normalizePackage,
  parseJsonContent,
  planSegments,
  requestCompletion,
  splitDuration,
  validateReferenceImage,
} from "./lib/provider.js";

const root = fileURLToPath(new URL("./public/", import.meta.url));
const port = Number(process.env.PORT || 3000);
const providerTimeoutMs = boundedNumber(process.env.OPENAI_TIMEOUT_MS, 600000, 5000, 1800000);
const providerMaxTokens = boundedNumber(process.env.OPENAI_MAX_TOKENS, 12000, 256, 50000);
const maxRequestBytes = 8_000_000;
const buckets = new Map();

const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
};

function securityHeaders(extra = {}) {
  return {
    "Cache-Control": "no-store",
    "Content-Security-Policy": "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: blob:; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'",
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    ...extra,
  };
}

function sendJson(res, status, payload) {
  res.writeHead(status, securityHeaders({ "Content-Type": "application/json; charset=utf-8" }));
  res.end(JSON.stringify(payload));
}

async function readJson(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > maxRequestBytes) throw new AppError("Request terlalu besar.", 413, "PAYLOAD_TOO_LARGE");
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
  } catch {
    throw new AppError("Body request harus berupa JSON valid.");
  }
}

function rateLimit(req) {
  const key = req.socket.remoteAddress || "unknown";
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || now - bucket.startedAt > 60_000) {
    buckets.set(key, { startedAt: now, count: 1 });
    return;
  }
  bucket.count += 1;
  if (bucket.count > 30) throw new AppError("Terlalu banyak request. Tunggu sebentar.", 429, "RATE_LIMITED");
}

function boundedNumber(value, fallback, minimum, maximum) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(maximum, Math.max(minimum, Math.round(number))) : fallback;
}

function credentials() {
  return {
    baseUrl: process.env.OPENAI_BASE_URL,
    apiKey: process.env.OPENAI_API_KEY,
    model: process.env.OPENAI_MODEL,
    timeoutMs: providerTimeoutMs,
  };
}

function validateGenerateInput(input) {
  const topic = String(input?.topic || "").trim();
  if (topic.length < 5) throw new AppError("Topik minimal 5 karakter.");
  if (topic.length > 500) throw new AppError("Topik maksimal 500 karakter.");

  const durationMinutes = Number(input.durationMinutes);
  if (!Number.isFinite(durationMinutes) || durationMinutes < 3 || durationMinutes > 30) {
    throw new AppError("Durasi harus antara 3 dan 30 menit.");
  }

  return {
    topic,
    durationMinutes,
    contentType: String(input.contentType || "Dokumenter").slice(0, 80),
    audience: String(input.audience || "Penonton umum").slice(0, 160),
    tone: String(input.tone || "Informatif dan sinematik").slice(0, 160),
    visualType: input.visualType === "video" ? "video" : "image",
    language: String(input.language || "Bahasa Indonesia").slice(0, 80),
    notes: String(input.notes || "").trim().slice(0, 6000),
    referenceImageDataUrl: validateReferenceImage(input.referenceImageDataUrl),
  };
}

async function testProvider(body) {
  const startedAt = Date.now();
  const payload = await requestCompletion({
    ...credentials(),
    timeoutMs: Math.min(providerTimeoutMs, 30000),
    body: {
      messages: [{ role: "user", content: "Reply with exactly: OK" }],
      max_tokens: 8,
      temperature: 0,
    },
  });
  const reply = extractContent(payload);
  return { ok: true, reply, latencyMs: Date.now() - startedAt, model: payload.model || process.env.OPENAI_MODEL };
}

async function generateSegment(input, segment) {
  const messages = buildMessages(input, segment);
  const common = {
    messages,
    temperature: 0.45,
    max_tokens: providerMaxTokens,
  };
  const attempts = [
    {
      mode: "json_schema",
      response_format: {
        type: "json_schema",
        json_schema: { name: "scriptify_package", strict: true, schema: SCRIPT_SCHEMA },
      },
    },
    { mode: "json_object", response_format: { type: "json_object" } },
    { mode: "prompt_json" },
  ];

  let lastError;
  for (let index = 0; index < attempts.length; index += 1) {
    const attempt = attempts[index];
    try {
      const payload = await requestCompletion({
        ...credentials(),
        body: { ...common, ...(attempt.response_format ? { response_format: attempt.response_format } : {}) },
      });
      const result = normalizePackage(parseJsonContent(extractContent(payload)));
      return {
        result,
        meta: {
          model: payload.model || process.env.OPENAI_MODEL,
          formatMode: attempt.mode,
          usage: payload.usage || null,
        },
      };
    } catch (error) {
      lastError = error;
      const mayFallback = index < attempts.length - 1 && isRetryableFormatError(error);
      if (!mayFallback) throw error;
    }
  }
  throw lastError;
}

async function analyzeReferenceImage(imageDataUrl) {
  if (!imageDataUrl) return null;

  const visionModel = String(process.env.VISION_OPENAI_MODEL || "").trim();
  if (!visionModel) {
    throw new AppError(
      "Gambar referensi memerlukan VISION_OPENAI_MODEL di file .env.",
      400,
      "VISION_MODEL_NOT_CONFIGURED",
    );
  }

  const payload = await requestCompletion({
    ...credentials(),
    model: visionModel,
    body: {
      messages: buildVisionMessages(imageDataUrl),
      temperature: 0.15,
      max_tokens: 500,
    },
  });
  const profile = extractContent(payload)
    .replace(/^```(?:text)?\s*/i, "")
    .replace(/\s*```$/, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 1500);
  if (profile.length < 20) {
    throw new AppError("Model vision tidak menghasilkan deskripsi karakter yang dapat digunakan.", 502, "INVALID_VISION_RESPONSE");
  }

  return {
    model: payload.model || visionModel,
    profile,
    usage: payload.usage || null,
  };
}

function mergeUsage(current, usage) {
  if (!usage) return current;
  const result = { ...(current || {}) };
  for (const key of ["prompt_tokens", "completion_tokens", "total_tokens"]) {
    if (Number.isFinite(usage[key])) result[key] = (result[key] || 0) + usage[key];
  }
  return result;
}

function resultEnding(result) {
  return result.scenes.at(-1)?.narration.slice(-600) || "";
}

async function generateAdaptiveSegment(input, segment, depth = 0) {
  try {
    const generated = await generateSegment(input, segment);
    return { generated: [generated], ending: resultEnding(generated.result) };
  } catch (error) {
    const canSplit = error instanceof AppError
      && error.code === "TRUNCATED_MODEL_RESPONSE"
      && segment.durationMinutes > 0.6
      && depth < 4;

    if (!canSplit) throw error;

    const [firstDuration, secondDuration] = splitDuration(segment.durationMinutes);
    const parentLabel = segment.label || `${segment.index + 1} dari ${segment.total}`;
    const first = await generateAdaptiveSegment(input, {
      ...segment,
      durationMinutes: firstDuration,
      isLast: false,
      label: `${parentLabel} · A`,
    }, depth + 1);
    const second = await generateAdaptiveSegment(input, {
      ...segment,
      durationMinutes: secondDuration,
      previousEnding: first.ending,
      isFirst: false,
      label: `${parentLabel} · B`,
    }, depth + 1);

    return {
      generated: [...first.generated, ...second.generated],
      ending: second.ending,
    };
  }
}

async function generate(body) {
  const input = validateGenerateInput(body.input || {});
  let characterReference = null;
  try {
    characterReference = await analyzeReferenceImage(input.referenceImageDataUrl);
  } catch (error) {
    error.message = `Gambar referensi gagal dibaca: ${error.message}`;
    throw error;
  }
  input.characterProfile = characterReference?.profile || "";
  delete input.referenceImageDataUrl;

  const durations = planSegments(input.durationMinutes);
  const packages = [];
  const formatModes = [];
  let usage = mergeUsage(null, characterReference?.usage);
  let model = process.env.OPENAI_MODEL;
  let previousEnding = "";

  for (let index = 0; index < durations.length; index += 1) {
    try {
      const chunk = await generateAdaptiveSegment(input, {
        index,
        total: durations.length,
        durationMinutes: durations[index],
        previousEnding,
        isFirst: index === 0,
        isLast: index === durations.length - 1,
        label: `${index + 1} dari ${durations.length}`,
      });
      for (const generated of chunk.generated) {
        packages.push(generated.result);
        formatModes.push(generated.meta.formatMode);
        usage = mergeUsage(usage, generated.meta.usage);
        model = generated.meta.model || model;
      }
      previousEnding = chunk.ending;
    } catch (error) {
      error.message = `Bagian ${index + 1}/${durations.length} gagal: ${error.message}`;
      throw error;
    }
  }

  return {
    ok: true,
    result: mergePackages(packages),
    meta: {
      model,
      segmentCount: packages.length,
      formatMode: [...new Set(formatModes)].join(" + "),
      usage,
      visionModel: characterReference?.model || null,
      characterProfile: characterReference?.profile || null,
    },
  };
}

async function handleApi(req, res, pathname) {
  rateLimit(req);
  if (req.method !== "POST") throw new AppError("Method tidak didukung.", 405, "METHOD_NOT_ALLOWED");
  const body = await readJson(req);
  const result = pathname === "/api/test" ? await testProvider(body) : await generate(body);
  sendJson(res, 200, result);
}

function serveStatic(res, pathname) {
  const requested = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
  const filePath = normalize(join(root, requested));
  if (!filePath.startsWith(root) || !existsSync(filePath) || !statSync(filePath).isFile()) {
    sendJson(res, 404, { error: { code: "NOT_FOUND", message: "Halaman tidak ditemukan." } });
    return;
  }
  res.writeHead(200, securityHeaders({
    "Content-Type": types[extname(filePath)] || "application/octet-stream",
    "Cache-Control": "no-store, max-age=0",
    Pragma: "no-cache",
    Expires: "0",
  }));
  createReadStream(filePath).pipe(res);
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
  try {
    if (url.pathname === "/api/health") return sendJson(res, 200, { ok: true });
    if (url.pathname === "/api/config" && req.method === "GET") {
      return sendJson(res, 200, {
        baseUrl: process.env.OPENAI_BASE_URL || "",
        model: process.env.OPENAI_MODEL || "",
        visionModel: process.env.VISION_OPENAI_MODEL || "",
        hasApiKey: Boolean(String(process.env.OPENAI_API_KEY || "").trim()),
        maxTokens: providerMaxTokens,
      });
    }
    if (url.pathname === "/api/test" || url.pathname === "/api/generate") {
      return await handleApi(req, res, url.pathname);
    }
    return serveStatic(res, url.pathname);
  } catch (error) {
    const status = error instanceof AppError ? error.status : error instanceof ProviderError ? error.status || 502 : 500;
    const safeStatus = status >= 400 && status < 600 ? status : 500;
    const code = error.code || (error instanceof ProviderError ? "PROVIDER_ERROR" : "INTERNAL_ERROR");
    const message = safeStatus === 500 ? "Terjadi kesalahan pada server." : error.message;
    if (safeStatus === 500) console.error(error);
    sendJson(res, safeStatus, { error: { code, message } });
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Scriptify siap di http://localhost:${port}`);
});
