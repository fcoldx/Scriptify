const $ = (selector) => document.querySelector(selector);

const state = {
  result: null,
  configReady: false,
  model: "",
  enhanceModel: "",
  visionModel: "",
  referencePreviewUrl: "",
};

const elements = {
  checkConnection: $("#checkConnection"),
  connectionLabel: $("#connectionLabel"),
  statusLight: $("#statusLight"),
  generatorForm: $("#generatorForm"),
  generateButton: $("#generateButton"),
  resultArea: $("#resultArea"),
  topic: $("#topic"),
  topicCount: $("#topicCount"),
  duration: $("#durationMinutes"),
  estimate: $("#estimate"),
  toast: $("#toast"),
  referenceImage: $("#referenceImage"),
  referencePreview: $("#referencePreview"),
  referencePreviewImage: $("#referencePreviewImage"),
  referenceFileName: $("#referenceFileName"),
  referenceFileSize: $("#referenceFileSize"),
  removeReference: $("#removeReference"),
  visionStatus: $("#visionStatus"),
};

const allowedReferenceTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const maxReferenceBytes = 5_000_000;

async function loadServerConfig() {
  try {
    const response = await fetch("/api/config", { cache: "no-store" });
    if (!response.ok) throw new Error("Konfigurasi server tidak dapat dibaca.");
    const config = await response.json();
    state.configReady = Boolean(config.baseUrl && config.model && config.hasApiKey);
    state.model = config.model || "";
    state.enhanceModel = config.enhanceModel || "";
    state.visionModel = config.visionModel || "";
    elements.connectionLabel.textContent = state.configReady
      ? `Cek koneksi · ${state.model}${state.enhanceModel ? ` + ${state.enhanceModel}` : ""}`
      : "Cek konfigurasi .env";
    elements.visionStatus.textContent = state.visionModel
      ? `Vision terkonfigurasi · ${state.visionModel}`
      : "Tambahkan VISION_OPENAI_MODEL di .env untuk memakai gambar.";
    elements.visionStatus.classList.toggle("ready", Boolean(state.visionModel));
  } catch {
    state.configReady = false;
    state.enhanceModel = "";
    state.visionModel = "";
    elements.connectionLabel.textContent = "Cek konfigurasi .env";
    elements.visionStatus.textContent = "Konfigurasi vision belum dapat dibaca.";
  }
}

async function api(path, body) {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.error?.message || `Request gagal (HTTP ${response.status}).`);
  return payload;
}

elements.checkConnection.addEventListener("click", async () => {
  elements.checkConnection.disabled = true;
  elements.connectionLabel.textContent = "Mengecek…";
  elements.statusLight.classList.remove("connected", "failed");
  try {
    const result = await api("/api/test", {});
    elements.statusLight.classList.add("connected");
    elements.connectionLabel.textContent = result.enhanceModel
      ? `${result.model} ${result.latencyMs} ms · ${result.enhanceModel} ${result.enhanceLatencyMs} ms`
      : `${result.model} · ${result.latencyMs} ms`;
    showToast("Koneksi provider berhasil.");
  } catch (error) {
    elements.statusLight.classList.add("failed");
    elements.connectionLabel.textContent = "Koneksi gagal";
    showToast(error.message);
  } finally {
    elements.checkConnection.disabled = false;
  }
});

function updateEstimate() {
  elements.estimate.textContent = `±${(Number(elements.duration.value) * 140).toLocaleString("id-ID")} kata narasi`;
}

elements.topic.addEventListener("input", () => {
  elements.topicCount.textContent = elements.topic.value.length;
});
elements.duration.addEventListener("change", updateEstimate);

function clearReferenceImage() {
  elements.referenceImage.value = "";
  elements.referencePreview.hidden = true;
  elements.referencePreviewImage.removeAttribute("src");
  elements.referenceFileName.textContent = "";
  elements.referenceFileSize.textContent = "";
  if (state.referencePreviewUrl) URL.revokeObjectURL(state.referencePreviewUrl);
  state.referencePreviewUrl = "";
}

elements.referenceImage.addEventListener("change", () => {
  const file = elements.referenceImage.files?.[0];
  if (!file) return clearReferenceImage();
  if (!allowedReferenceTypes.has(file.type)) {
    clearReferenceImage();
    showToast("Gunakan gambar JPEG, PNG, atau WebP.");
    return;
  }
  if (file.size > maxReferenceBytes) {
    clearReferenceImage();
    showToast("Ukuran gambar maksimal 5 MB.");
    return;
  }

  if (state.referencePreviewUrl) URL.revokeObjectURL(state.referencePreviewUrl);
  state.referencePreviewUrl = URL.createObjectURL(file);
  elements.referencePreviewImage.src = state.referencePreviewUrl;
  elements.referenceFileName.textContent = file.name;
  elements.referenceFileSize.textContent = `${(file.size / 1_000_000).toFixed(2)} MB`;
  elements.referencePreview.hidden = false;
});

elements.removeReference.addEventListener("click", clearReferenceImage);

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Gambar referensi tidak dapat dibaca oleh browser."));
    reader.readAsDataURL(file);
  });
}

elements.generatorForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!state.configReady) {
    renderError("Konfigurasi .env belum lengkap. Isi OPENAI_BASE_URL, OPENAI_API_KEY, dan OPENAI_MODEL lalu restart server.");
    return;
  }

  const data = new FormData(elements.generatorForm);
  const input = Object.fromEntries(data.entries());
  const referenceFile = elements.referenceImage.files?.[0];
  delete input.referenceImage;
  input.durationMinutes = Number(input.durationMinutes);

  if (referenceFile && !state.visionModel) {
    renderError("Gambar referensi memerlukan VISION_OPENAI_MODEL di file .env lalu restart server.");
    return;
  }

  if (referenceFile) {
    try {
      input.referenceImageDataUrl = await readFileAsDataUrl(referenceFile);
    } catch (error) {
      renderError(error.message);
      return;
    }
  }

  setGenerating(true);
  renderLoading();
  try {
    const response = await api("/api/generate", { input });
    state.result = response;
    renderResult(response);
    showToast(`${response.result.scenes.length} scene berhasil dibuat.`);
  } catch (error) {
    renderError(error.message);
  } finally {
    setGenerating(false);
  }
});

function setGenerating(active) {
  elements.generateButton.disabled = active;
  elements.generateButton.firstElementChild.textContent = active ? "Sedang menulis…" : "Generate naskah";
}

function renderLoading() {
  elements.resultArea.innerHTML = `
    <div class="loading-state" aria-label="Sedang membuat naskah">
      <div class="skeleton"></div>
      <div class="skeleton"></div>
      <div class="skeleton"></div>
    </div>`;
}

function renderError(message) {
  elements.resultArea.replaceChildren();
  const box = document.createElement("div");
  box.className = "error-state";
  const title = document.createElement("h3");
  title.textContent = "Generate belum berhasil";
  const detail = document.createElement("p");
  detail.textContent = message;
  box.append(title, detail);
  elements.resultArea.append(box);
}

function durationLabel(seconds) {
  if (seconds < 60) return `${seconds} detik`;
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes} menit${remainder ? ` ${remainder} detik` : ""}`;
}

function sceneVisualType(scene, fallback = "image") {
  if (scene.visualType === "video" || scene.visualType === "image") return scene.visualType;
  return fallback === "video" ? "video" : "image";
}

function sceneText(scene, fallbackVisualType) {
  const visualType = sceneVisualType(scene, fallbackVisualType);
  const visualLabel = visualType === "video" ? "Prompt video" : "Prompt gambar";
  return `Scene: ${scene.id} — ${scene.title} (estimasi ${durationLabel(scene.estimatedDurationSeconds)})\n\nNarasi: "${scene.narration}"\n\n${visualLabel}: "${scene.visualPrompt}"`;
}

function renderResult(response) {
  const { result, meta } = response;
  const visualType = elements.generatorForm.elements.visualType.value;
  elements.resultArea.replaceChildren();

  const head = document.createElement("div");
  head.className = "result-head";
  const intro = document.createElement("div");
  const title = document.createElement("h3");
  title.textContent = result.title;
  const summary = document.createElement("p");
  summary.textContent = result.summary || `${result.scenes.length} scene siap ditinjau.`;
  intro.append(title, summary);
  const metaBox = document.createElement("div");
  metaBox.className = "result-meta";
  metaBox.textContent = `${result.scenes.length} SCENE · ${durationLabel(result.estimatedTotalSeconds).toUpperCase()}`;
  head.append(intro, metaBox);

  const scenes = document.createElement("div");
  scenes.className = "scenes";
  result.scenes.forEach((scene) => scenes.append(createScene(scene, visualType)));

  const characterProfile = meta.characterProfile
    ? createDefinition("Visual consistency anchor", meta.characterProfile, "identity-anchor")
    : null;

  const footer = document.createElement("p");
  footer.className = "result-meta";
  footer.style.marginTop = "18px";
  footer.textContent = `${meta.model}${meta.enhanceModel ? ` · ENHANCE ${meta.enhanceModel}` : ""} · ${meta.formatMode}${meta.segmentCount > 1 ? ` · ${meta.segmentCount} BAGIAN` : ""}${meta.visionModel ? ` · VISION ${meta.visionModel}` : ""}`;
  elements.resultArea.append(head);
  if (characterProfile) elements.resultArea.append(characterProfile);
  elements.resultArea.append(scenes, footer);
}

function createScene(scene, fallbackVisualType) {
  const visualType = sceneVisualType(scene, fallbackVisualType);
  const article = document.createElement("article");
  article.className = "scene";

  const heading = document.createElement("div");
  heading.className = "scene-heading";
  const h3 = document.createElement("h3");
  h3.textContent = `${scene.id} — ${scene.title}`;
  const duration = document.createElement("span");
  duration.textContent = `${visualType === "video" ? "VIDEO" : "GAMBAR"} · estimasi ${durationLabel(scene.estimatedDurationSeconds)}`;
  heading.append(h3, duration);

  const narration = createDefinition("Narasi", scene.narration, "scene-block");
  const label = visualType === "video" ? "Prompt video" : "Prompt gambar";
  const prompt = createDefinition(label, scene.visualPrompt, "scene-block prompt");

  const actions = document.createElement("div");
  actions.className = "scene-actions";
  actions.append(
    copyButton("Salin narasi", scene.narration),
    copyButton("Salin prompt", scene.visualPrompt),
    copyButton("Salin scene", sceneText(scene, visualType)),
  );
  article.append(heading, narration, prompt, actions);
  return article;
}

function createDefinition(label, value, className) {
  const list = document.createElement("dl");
  list.className = className;
  const term = document.createElement("dt");
  term.textContent = label;
  const description = document.createElement("dd");
  description.textContent = value;
  list.append(term, description);
  return list;
}

function copyButton(label, value) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "copy-button";
  button.textContent = label;
  button.addEventListener("click", async () => {
    await navigator.clipboard.writeText(value);
    showToast(`${label} berhasil.`);
  });
  return button;
}

let toastTimer;
function showToast(message) {
  clearTimeout(toastTimer);
  elements.toast.textContent = message;
  elements.toast.classList.add("visible");
  toastTimer = setTimeout(() => elements.toast.classList.remove("visible"), 2200);
}

updateEstimate();
loadServerConfig();
