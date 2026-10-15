# Step 04 — Provider Profiles and Persistent Jobs

## Tujuan

Memindahkan generasi panjang dari request halaman ke job persisten dan menyediakan profil provider BYOK yang aman per pengguna.

## Model data minimum

- `provider_profiles`
- `provider_capabilities`
- `generation_jobs`
- `stage_runs`
- `usage_records`
- `job_events`

## Pekerjaan provider

1. Simpan base URL, model teks, model vision, timeout, dan batas output pada profil.
2. Enkripsi API key menggunakan kunci aplikasi dari secret manager yang terpisah dari database.
3. Tampilkan key dalam bentuk masked; penggantian key membutuhkan input baru.
4. Tes koneksi teks dan vision secara terpisah.
5. Simpan capability flags berdasarkan hasil tes, bukan asumsi nama model.
6. Terapkan allowlist host awal dan validasi DNS/redirect untuk mencegah SSRF.
7. Pastikan worker membuka secret hanya untuk pemilik job.

## Pekerjaan job

1. Endpoint generate membuat job dan segera mengembalikan ID.
2. Worker mengambil job secara atomik memakai lease dan heartbeat.
3. Simpan checkpoint per stage dan bagian naskah.
4. Terapkan retry dengan backoff untuk error sementara serta batas terpisah untuk perbaikan format.
5. Implementasikan cancel dan resume tanpa menggandakan artefak.
6. Simpan token usage per attempt jika tersedia.
7. Terapkan batas job aktif, token/job, attempt, dan output per akun.
8. UI memantau progress berdasarkan job milik pengguna.

## Kriteria penerimaan

- API key tidak pernah dikirim kembali ke browser atau ditulis ke log.
- Job tetap ada setelah API/worker restart.
- Worker lain dapat mengambil job setelah lease kedaluwarsa.
- Cancel mencegah stage selanjutnya berjalan.
- Resume dimulai dari checkpoint valid terakhir.
- Job dari versi input lama tidak dapat menimpa versi project terbaru.
- Endpoint provider kustom tidak dapat mencapai jaringan privat atau metadata cloud.

## Pengujian

- Simulasi worker mati di tengah stage dan recovery oleh worker kedua.
- Simulasi timeout, 429, 5xx, schema invalid, dan auth failure.
- Test concurrency dua worker terhadap satu job.
- Test egress untuk IP privat, redirect, DNS rebinding, dan URL berkredensial.
- Test redaction terhadap log dan telemetry.

