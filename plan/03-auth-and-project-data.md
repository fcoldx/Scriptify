# Step 03 — Authentication and Project Data

## Tujuan

Menambahkan akun pengguna, workspace pribadi, PostgreSQL, dan penyimpanan project dengan isolasi data yang dapat dibuktikan.

## Model data minimum

- `users`
- `workspaces`
- `workspace_members`
- `projects`
- `briefs`
- `sources`
- `visual_styles`
- `reference_assets`
- `audit_events`

Semua resource domain memiliki `workspace_id`, timestamp, dan status penghapusan bila soft delete digunakan. Backend mengambil identitas pemilik dari sesi, bukan dari body request.

## Pekerjaan

1. Integrasikan registrasi, login, verifikasi email, logout, dan pemulihan akun.
2. Buat workspace pribadi otomatis ketika akun dibuat.
3. Terapkan middleware session, CSRF sesuai mekanisme auth, dan pembatasan origin.
4. Buat migration awal dan repository/service layer yang selalu membutuhkan konteks workspace.
5. Implementasikan create, list, read, update, duplicate, archive, dan delete project.
6. Simpan brief, sumber teks, panduan visual, dan metadata gambar referensi.
7. Gunakan object storage privat untuk file; jangan jadikan bucket publik.
8. Tambahkan audit event untuk perubahan sensitif dan penghapusan.
9. Implementasikan penghapusan akun sesuai retensi yang diputuskan pada Step 00.

## Kriteria penerimaan

- Dua akun uji tidak dapat membaca, mengubah, menebak, atau mengekspor resource satu sama lain.
- Semua query domain dibatasi workspace di sisi server.
- Session aman, dapat dicabut, dan memiliki masa berlaku.
- Project tetap tersedia setelah restart aplikasi.
- Asset privat hanya dapat dibaca pemilik melalui URL berumur pendek.
- Penghapusan project/akun menghentikan akses dan mengikuti kebijakan retensi.

## Pengujian

- Integration test untuk semua operasi CRUD dan ownership.
- Test IDOR dengan ID valid milik akun lain.
- Test file access tanpa signature, signature kedaluwarsa, dan workspace salah.
- Test migration pada database kosong dan database berisi fixture.

## Risiko

- Filter ownership yang tersebar mudah terlupakan; gunakan abstraction wajib atau row-level security sebagai lapisan tambahan.
- Soft delete tanpa filtering konsisten dapat membocorkan data terhapus.

