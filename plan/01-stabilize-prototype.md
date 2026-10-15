# Step 01 — Stabilize the Prototype

## Tujuan

Menjadikan prototype saat ini sebagai baseline yang terukur sebelum dipindahkan ke arsitektur multi-user.

## Pekerjaan

1. Dokumentasikan kontrak endpoint `/api/config`, `/api/test`, dan `/api/generate` beserta semua kode error.
2. Pisahkan schema request/response dari implementasi HTTP agar dapat dipakai kembali oleh API baru dan test.
3. Tambahkan validasi environment saat startup tanpa mencetak nilai secret.
4. Tambahkan fixture provider untuk:
   - Structured Outputs berhasil;
   - provider hanya mendukung JSON mode;
   - provider hanya mengikuti prompt JSON;
   - autentikasi gagal, rate limit, timeout, respons terpotong, dan schema invalid;
   - vision menerima data URL dan vision menolak format gambar.
5. Pastikan retry hanya dilakukan untuk error yang aman dicoba ulang.
6. Ukur jumlah request, token, durasi, dan jumlah adaptive split pada hasil generate.
7. Tambahkan batas total scene, total ukuran respons, dan total percobaan satu job.
8. Perbarui dokumentasi fitur yang sudah ada dan batas konsistensi karakter berbasis identity anchor.

## Urutan pengerjaan

1. Bekukan contoh request/response sebagai fixture.
2. Ekstrak schema dan validator.
3. Rapikan error taxonomy.
4. Tambahkan test provider dan vision.
5. Tambahkan metadata observability.
6. Jalankan evaluasi manual pada naskah 5, 10, dan 30 menit.

## Kriteria penerimaan

- Semua jalur kompatibilitas provider memiliki test deterministik.
- Input gambar hanya menerima JPEG/PNG/WebP dalam batas yang ditentukan.
- Respons terpotong menghasilkan split terbatas, bukan loop tanpa akhir.
- Satu kegagalan bagian tidak mengulang bagian yang telah berhasil.
- Tidak ada API key, gambar Base64, atau isi naskah penuh di log.
- Baseline kualitas dan latensi terdokumentasi untuk model teks dan vision target.

## Pengujian

- Unit test parser, schema, URL provider, image data URL, dan segment planner.
- Integration test terhadap mock provider lokal.
- Snapshot kontrak JSON tanpa menyimpan konten rahasia.
- Uji manual dengan provider target di environment development.

## Risiko

- Provider yang mengaku OpenAI-compatible dapat berbeda pada `response_format`, parameter token, atau payload vision.
- Deskripsi teks dari gambar membantu konsistensi, tetapi tidak menjamin identitas visual yang pixel-identical pada generator lain.

