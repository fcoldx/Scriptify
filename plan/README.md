# Scriptify Implementation Plan

Dokumen di folder ini memecah pengembangan Scriptify menjadi langkah yang dapat dikerjakan dan diverifikasi satu per satu. Urutan step bersifat wajib karena artefak pada satu step menjadi fondasi step berikutnya.

## Baseline saat ini

Repository sudah memiliki prototype lokal tanpa dependency pihak ketiga dengan kemampuan berikut:

- konfigurasi provider OpenAI-compatible melalui `.env`;
- pemeriksaan koneksi provider;
- generasi naskah long-form yang dibagi menjadi beberapa request;
- fallback Structured Outputs, JSON mode, dan prompt JSON;
- output narasi dan prompt gambar/video per scene;
- upload satu gambar referensi dan pembentukan character identity anchor melalui `VISION_OPENAI_MODEL`;
- validasi dasar, retry bagian terpotong, dan unit test provider.

Prototype belum memiliki akun pengguna, database, penyimpanan project, editor bertahap, antrean job persisten, atau deployment publik.

## Sasaran produk

Scriptify menjadi web app online untuk banyak pengguna yang mengubah brief menjadi paket produksi YouTube long-form: outline, naskah, scene, prompt visual, versi hasil, dan ekspor. Shorts, TTS, generasi gambar/video langsung, dan publikasi ke YouTube tidak termasuk sasaran awal.

## Urutan implementasi

| Step | Fokus | Hasil utama | Gate sebelum lanjut |
| --- | --- | --- | --- |
| [00](./00-product-decisions.md) | Keputusan produk dan teknis | Scope, stack, kontrak, dan metrik disepakati | Tidak ada keputusan penghambat implementasi |
| [01](./01-stabilize-prototype.md) | Stabilisasi prototype | Baseline teruji dan kontrak API terdokumentasi | Semua fixture provider dan validasi input lulus |
| [02](./02-application-foundation.md) | Fondasi aplikasi | Monorepo TypeScript, web, API, worker, konfigurasi | Local stack dapat dijalankan dan diobservasi |
| [03](./03-auth-and-project-data.md) | Akun dan data project | Auth, PostgreSQL, isolasi akun, CRUD project | Dua akun tidak dapat mengakses data silang |
| [04](./04-provider-and-jobs.md) | Provider dan job persisten | BYOK terenkripsi, adapter, queue, retry/resume | Job panjang pulih setelah worker dihentikan |
| [05](./05-editorial-pipeline.md) | Outline dan naskah | Brief → sumber → outline → naskah per bab | Naskah panjang tersimpan dan dapat direvisi |
| [06](./06-scenes-and-visuals.md) | Scene dan visual | Segmentasi lossless, prompt, character consistency | Seluruh narasi terpetakan tepat sekali |
| [07](./07-editor-versioning-export.md) | Editor dan ekspor | Lock, regenerate parsial, versioning, TXT/MD/CSV/JSON | Edit manual terlindungi dan ekspor konsisten |
| [08](./08-hardening-and-launch.md) | Keamanan dan rilis | Audit, kuota, backup, deployment, runbook | Checklist rilis dan uji pemulihan lulus |

## Aturan lintas step

- Satu pull request menangani satu hasil kerja yang dapat diuji.
- Migrasi database harus dapat maju dan mundur dengan prosedur yang terdokumentasi.
- Perubahan schema AI harus memiliki fixture untuk respons valid, invalid, dan terpotong.
- Secret tidak boleh muncul di browser, log, error, fixture, commit, atau ekspor.
- Setiap record pengguna memiliki ownership yang diperiksa di backend.
- Hasil AI selalu dianggap usulan yang dapat ditinjau; struktur dan relasi diverifikasi oleh kode.
- Perubahan upstream tidak menimpa edit manual atau hasil versi terbaru secara diam-diam.
- Tidak menambahkan fitur Shorts sebelum gate rilis MVP long-form selesai.

## Definition of done global

Sebuah step dianggap selesai jika:

1. Kriteria penerimaan pada dokumen step terpenuhi.
2. Unit, integration, dan end-to-end test yang relevan lulus.
3. Dokumentasi konfigurasi dan migrasi diperbarui.
4. Error memiliki pesan pengguna dan kode yang dapat ditelusuri di log.
5. Tidak ada secret atau data pengguna sensitif dalam telemetry.
6. Perubahan dapat dipulihkan atau memiliki prosedur rollback.

## Pelacakan

Status yang digunakan: `not-started`, `in-progress`, `blocked`, dan `done`. Perbarui tabel berikut ketika pekerjaan dimulai atau selesai.

| Step | Status | Catatan |
| --- | --- | --- |
| 00 | not-started | |
| 01 | not-started | Prototype menjadi baseline migrasi |
| 02 | not-started | |
| 03 | not-started | |
| 04 | not-started | |
| 05 | not-started | |
| 06 | not-started | |
| 07 | not-started | |
| 08 | not-started | |

