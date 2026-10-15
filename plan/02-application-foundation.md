# Step 02 — Application Foundation

## Tujuan

Membangun fondasi TypeScript yang memisahkan web, API, worker, schema bersama, dan adapter provider tanpa menghentikan prototype sebelum penggantinya siap.

## Struktur yang diusulkan

```text
apps/
  web/
  api/
  worker/
packages/
  contracts/
  provider-adapter/
  config/
  observability/
infra/
  migrations/
  deployment/
```

## Pekerjaan

1. Buat workspace package dan konfigurasi TypeScript bersama.
2. Pindahkan schema API serta tipe domain ke `packages/contracts`.
3. Pindahkan request provider, parser, fallback, dan vision analyzer ke `packages/provider-adapter`.
4. Buat API health/readiness endpoint yang memeriksa dependency penting.
5. Siapkan web shell, routing, error boundary, dan API client bertipe.
6. Siapkan worker process terpisah dengan graceful shutdown.
7. Tambahkan structured logging dengan request ID, user ID tersamarkan, project ID, dan job ID.
8. Buat konfigurasi development/staging/production dan validasi environment.
9. Pertahankan prototype lama sampai parity minimum tercapai, lalu hapus melalui PR terpisah.

## Kriteria penerimaan

- Web, API, dan worker dapat dibangun secara independen.
- Contract yang sama digunakan oleh client, API, dan worker.
- Startup gagal cepat saat environment wajib tidak lengkap.
- Health check membedakan proses hidup dari dependency siap.
- Log tidak mengandung API key, authorization header, data URL, atau isi prompt penuh.
- CI menjalankan lint, typecheck, unit test, dan build.

## Pengujian

- Contract test antara web dan API.
- Unit test adapter hasil migrasi harus mempertahankan perilaku Step 01.
- Smoke test local stack tanpa melakukan request ke provider berbayar.

## Tidak termasuk

- UI editor lengkap.
- Akun pengguna dan database domain lengkap; keduanya masuk Step 03.

