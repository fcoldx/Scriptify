# Scriptify

Prototype generator naskah YouTube long-form dengan output narasi dan prompt visual per scene. Aplikasi menggunakan endpoint Chat Completions yang kompatibel dengan OpenAI.

## Menjalankan

Syarat: Node.js 20.6 atau lebih baru. Tidak ada package pihak ketiga yang perlu dipasang.

Salin atau edit `.env`, kemudian isi konfigurasi provider:

```dotenv
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_API_KEY=isi-api-key-anda
OPENAI_MODEL=gpt-4o-mini
ENHANCE_OPENAI_MODEL=gpt-4o
VISION_OPENAI_MODEL=gpt-4o-mini
OPENAI_TIMEOUT_MS=600000
OPENAI_MAX_TOKENS=12000
```

`OPENAI_TIMEOUT_MS` memakai milidetik. Nilai default 600000 memberi waktu hingga 10 menit untuk generasi long-form; tes koneksi tetap dibatasi 30 detik.

`OPENAI_MAX_TOKENS` adalah batas maksimum, bukan jumlah token yang selalu diminta. Scriptify menghitung budget aktual setiap bagian berdasarkan target durasi, jumlah scene, jenis prompt visual, dan penggunaan character identity anchor. Jika draft atau enhancement terpotong, budget dinaikkan bertahap sampai batas ini sebelum bagian dipecah otomatis. Analisis gambar memakai strategi bertahap yang sama.

Timeout gateway provider (`408`, `504`, atau `524`) juga memicu pemecahan bagian otomatis. Halaman error HTML dari proxy atau CDN disaring agar UI hanya menampilkan penyebab dan langkah lanjut yang relevan.

`OPENAI_MODEL` membuat draft awal naskah sekaligus prompt visual. `ENHANCE_OPENAI_MODEL` menjalankan tahap kedua untuk memperhalus bahasa narasi dan memperkuat kecocokan prompt visual terhadap isi scene. Tahap enhancement mempertahankan urutan, jumlah scene, tipe visual, dan durasi dari draft. Kosongkan `ENHANCE_OPENAI_MODEL` jika ingin memakai hasil draft tanpa tahap kedua.

`VISION_OPENAI_MODEL` harus berisi model pada provider yang sama yang mendukung input gambar melalui Chat Completions. Variabel ini hanya digunakan ketika gambar referensi karakter dilampirkan.

```powershell
npm start
```

Buka `http://localhost:3000`. Seluruh konfigurasi provider dibaca dari `.env`; tidak ada input API key atau penggantian model melalui browser. Gunakan tombol **Cek koneksi** untuk memastikan endpoint, key, dan model dapat digunakan sebelum generate.

## Fitur prototype

- Tes koneksi langsung ke provider OpenAI-compatible.
- Generate naskah dari topik, durasi, audiens, gaya narasi, dan arahan tambahan.
- Model draft dan model enhancement dapat dipilih terpisah melalui `.env`.
- Narasi memakai Bahasa Indonesia percakapan sehari-hari dengan humanization pass: ritme kalimat bervariasi, transisi berbasis gagasan, mudah dibacakan, menghindari pola tulisan AI, dan tetap menjaga ketepatan istilah.
- Gambar referensi JPEG, PNG, atau WebP hingga 5 MB dianalisis oleh `VISION_OPENAI_MODEL` menjadi identity anchor agar ciri karakter konsisten di setiap prompt visual.
- Generasi long-form dibagi otomatis menjadi bagian maksimal sekitar empat menit. Jika suatu bagian masih mencapai batas output model, hanya bagian itu yang dipecah lagi dan dicoba ulang; seluruh scene kemudian digabung dan dinomori ulang.
- Output per scene: judul, estimasi durasi, narasi, dan prompt gambar/video.
- Durasi visual per scene disesuaikan dengan jenis output: 3–4 detik untuk gambar dan 8–12 detik untuk video.
- Mode Campuran memakai dua scene video 8–12 detik sebagai hook pembuka, kemudian beralih ke gambar 3–4 detik untuk scene berikutnya.
- Prompt visual memakai urutan terstruktur: gaya, karakter, aksi/ekspresi, lokasi, objek cerita, komposisi/kamera, pencahayaan, palet, dan render constraints; tulisan, logo, watermark, serta overlay UI dilarang.
- Preset 1 menit tersedia untuk menguji kualitas prompt visual dengan biaya dan waktu lebih rendah sebelum membuat naskah panjang.
- Structured Outputs dengan fallback ke JSON mode dan prompt JSON untuk provider yang lebih sederhana.
- Tombol salin untuk narasi, prompt, atau seluruh scene.
- Validasi respons model, timeout, batas request, dan perlindungan dasar endpoint kustom.

## Catatan keamanan

Prototype ini ditujukan untuk pengujian lokal. API key diteruskan oleh backend hanya saat request dan tidak dicatat atau disimpan. Untuk deployment publik multi-user, ikuti [implementation plan](./plan/README.md); konteks produk dan arsitektur lengkap tetap tersedia di [PLANNING.md](./PLANNING.md).

## Tes

```powershell
npm test
```
