# Step 00 — Product and Technical Decisions

## Tujuan

Menutup keputusan yang memengaruhi schema data, keamanan, biaya, dan arsitektur sebelum migrasi prototype dimulai.

## Keputusan yang harus ditetapkan

1. Model bisnis MVP: BYOK sebagai default; tentukan apakah kuota yang dibayar aplikasi ditunda sampai setelah MVP.
2. Provider autentikasi dan metode verifikasi email/pemulihan akun.
3. Hosting web, API, worker, PostgreSQL, object storage, dan secret manager.
4. Provider/model teks dan vision pertama yang menjadi target uji resmi.
5. Batas produk: durasi 3–30 menit, ukuran sumber, ukuran gambar referensi, project per akun, dan job aktif.
6. Kebijakan retensi project terhapus, log, backup, dan file ekspor sementara.
7. Bahasa awal: UI Bahasa Indonesia; tentukan bahasa output tambahan pada MVP.
8. Apakah gambar referensi disimpan secara privat atau hanya diproses sementara lalu dihapus.

## Rekomendasi awal

- Pertahankan BYOK untuk MVP.
- Gunakan React + TypeScript untuk web, Node.js + TypeScript untuk API/worker, dan PostgreSQL.
- Gunakan queue berbasis PostgreSQL terlebih dahulu agar operasi sederhana; evaluasi Redis ketika throughput membutuhkannya.
- Simpan gambar referensi di object storage privat dengan URL bertanda tangan dan retensi yang eksplisit.
- Pertahankan Chat Completions sebagai kontrak provider awal; simpan capability flags per model.
- Gunakan ID acak yang tidak berurutan untuk resource publik.

## Artefak

- `docs/adr/` berisi Architecture Decision Record untuk setiap keputusan di atas.
- Daftar environment development, staging, production.
- Matriks kemampuan provider: structured output, JSON mode, vision, streaming, dan token parameter.
- Anggaran awal untuk request teks, vision, penyimpanan, dan worker.

## Kriteria penerimaan

- Tidak ada pilihan stack atau layanan inti yang masih ambigu.
- Setiap keputusan mencatat alasan, alternatif, konsekuensi, dan cara menggantinya.
- Batas ukuran, konkurensi, retensi, dan kuota memiliki angka awal.
- Kebijakan gambar referensi dan secret disetujui sebelum data pengguna disimpan.

## Tidak termasuk

- Implementasi fitur.
- Desain billing berlangganan lengkap.
- Pemilihan provider untuk generasi gambar/video langsung.

