# Scriptify

Prototype generator naskah YouTube long-form dengan output narasi dan prompt visual per scene. Aplikasi menggunakan endpoint Chat Completions yang kompatibel dengan OpenAI.

## Menjalankan

Syarat: Node.js 20.6 atau lebih baru. Tidak ada package pihak ketiga yang perlu dipasang.

Salin atau edit `.env`, kemudian isi konfigurasi provider:

```dotenv
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_API_KEY=isi-api-key-anda
OPENAI_MODEL=gpt-4o-mini
VISION_OPENAI_MODEL=gpt-4o-mini
OPENAI_TIMEOUT_MS=600000
OPENAI_MAX_TOKENS=12000
```

`OPENAI_TIMEOUT_MS` memakai milidetik. Nilai default 600000 memberi waktu hingga 10 menit untuk generasi long-form; tes koneksi tetap dibatasi 30 detik.

`VISION_OPENAI_MODEL` harus berisi model pada provider yang sama yang mendukung input gambar melalui Chat Completions. Variabel ini hanya digunakan ketika gambar referensi karakter dilampirkan.

```powershell
npm start
```

Buka `http://localhost:3000`. Seluruh konfigurasi provider dibaca dari `.env`; tidak ada input API key atau penggantian model melalui browser. Gunakan tombol **Cek koneksi** untuk memastikan endpoint, key, dan model dapat digunakan sebelum generate.

## Fitur prototype

- Tes koneksi langsung ke provider OpenAI-compatible.
- Generate naskah dari topik, durasi, audiens, gaya narasi, dan arahan tambahan.
- Gambar referensi JPEG, PNG, atau WebP hingga 5 MB dianalisis oleh `VISION_OPENAI_MODEL` menjadi identity anchor agar ciri karakter konsisten di setiap prompt visual.
- Generasi long-form dibagi otomatis menjadi bagian maksimal sekitar empat menit. Jika suatu bagian masih mencapai batas output model, hanya bagian itu yang dipecah lagi dan dicoba ulang; seluruh scene kemudian digabung dan dinomori ulang.
- Output per scene: judul, estimasi durasi, narasi, dan prompt gambar/video.
- Structured Outputs dengan fallback ke JSON mode dan prompt JSON untuk provider yang lebih sederhana.
- Tombol salin untuk narasi, prompt, atau seluruh scene.
- Validasi respons model, timeout, batas request, dan perlindungan dasar endpoint kustom.

## Catatan keamanan

Prototype ini ditujukan untuk pengujian lokal. API key diteruskan oleh backend hanya saat request dan tidak dicatat atau disimpan. Untuk deployment publik multi-user, tambahkan autentikasi, penyimpanan secret terenkripsi, database, antrean job, pembatasan berbasis akun, dan kontrol egress jaringan sesuai [PLANNING.md](./PLANNING.md).

## Tes

```powershell
npm test
```
