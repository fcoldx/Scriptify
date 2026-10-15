# Step 08 — Hardening and Launch

## Tujuan

Menyiapkan Scriptify untuk pengguna nyata dengan batas kapasitas, keamanan, observability, backup, dan prosedur operasi yang telah diuji.

## Keamanan

1. Threat model untuk auth, BYOK, SSRF, upload, IDOR, prompt injection, dan ekspor.
2. Review seluruh endpoint terhadap ownership dan least privilege.
3. Scan dependency, secret, container, dan konfigurasi deployment.
4. Validasi MIME berdasarkan konten file, bukan hanya ekstensi/header browser.
5. Malware scanning atau karantina asset sesuai risiko hosting.
6. Rate limit per akun/IP, batas job aktif, dan kuota pemakaian.
7. CSP, security headers, cookie policy, dan CORS final.

## Operasional

1. Dashboard queue depth, latency per stage, error rate, token usage, dan retry rate.
2. Alert untuk worker macet, backlog, provider error spike, database, dan object storage.
3. Backup database dan asset privat dengan retensi terdefinisi.
4. Uji restore ke environment terisolasi.
5. Runbook incident, rotasi encryption key, provider outage, dan rollback deployment.
6. Cleanup job untuk export sementara, asset kedaluwarsa, dan data terhapus.
7. Staging soak test sebelum production.

## Quality gate produk

- Skenario dokumenter dan finansial menyelesaikan alur brief hingga ekspor.
- Evaluasi manusia memenuhi ambang kualitas yang ditetapkan pada Step 00.
- P95 latency UI non-AI dan waktu antre job berada dalam target.
- Tidak ada akses data silang pada suite keamanan.
- Worker pulih dari crash dan deployment tanpa menggandakan artefak.
- Backup dapat dipulihkan dan hasilnya diverifikasi.
- Halaman privasi menjelaskan provider tujuan, BYOK, retensi, dan penghapusan.

## Strategi rilis

1. Internal alpha dengan fixture dan provider terbatas.
2. Closed beta dengan allowlist pengguna dan kuota rendah.
3. Evaluasi biaya, kegagalan provider, kualitas naskah, dan support load.
4. Perbaiki blocker dan ulangi soak test.
5. Buka MVP secara bertahap dengan kill switch untuk generasi baru.

## Kriteria selesai MVP

- Semua gate Step 00–08 berstatus `done`.
- Tidak ada issue keamanan kritis/tinggi yang terbuka.
- Runbook, backup restore, dan rollback pernah dijalankan.
- Owner operasional dan jalur respons insiden ditetapkan.
- Scope yang dirilis tetap long-form; fitur setelah MVP tercatat di backlog terpisah.

