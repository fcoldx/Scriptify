# Step 05 — Editorial Pipeline

## Tujuan

Membangun alur bertahap dari brief dan sumber menjadi outline yang dapat ditinjau lalu naskah panjang per bab.

## Tahapan pipeline

1. **Brief preparation** — normalisasi tujuan, audiens, sudut pandang, durasi, bahasa, nada, CTA, dan batas editorial.
2. **Evidence preparation** — pecah sumber teks menjadi bagian, beri source ID, dan catat klaim/angka/tanggal.
3. **Outline planning** — buat hook, bab, tujuan bab, alokasi durasi/kata, dan sumber terkait.
4. **Outline review** — pengguna mengedit dan mengunci outline yang disetujui.
5. **Script writing** — tulis per bab menggunakan outline global, glossary, sumber relevan, dan continuity summary.
6. **Script review** — tandai repetisi, transisi lemah, kontradiksi, serta klaim tanpa dukungan.
7. **Revision apply** — pengguna memilih revisi; sistem membuat versi baru.

## Pekerjaan

1. Buat schema `outline_versions`, `script_versions`, `narration_units`, `claims`, dan relasi sumber.
2. Berikan ID stabil pada bab dan unit narasi.
3. Hitung word budget dari durasi dan kecepatan bicara yang dapat dikonfigurasi.
4. Generate per bab untuk membatasi context dan output.
5. Simpan ringkasan kesinambungan, glossary, janji hook, dan fakta tetap antarbagian.
6. Tandai dengan jelas teks yang berasal dari sumber dan usulan model.
7. Jangan menganggap URL sudah dibaca jika pengguna hanya menempel URL tanpa konten.
8. Sediakan review outline dan naskah sebelum scene dibuat.

## Kriteria penerimaan

- Pengguna dapat mengedit outline sebelum penulisan naskah.
- Naskah 30 menit dapat selesai per bab dan dilanjutkan setelah kegagalan.
- Urutan bab, glossary, nama, angka, dan janji hook tetap konsisten.
- Klaim finansial menyimpan sumber, tanggal acuan, unit, mata uang, dan periode bila tersedia.
- Klaim tanpa bukti ditandai; model tidak membuat URL sumber.
- Edit menghasilkan versi baru dan tidak menghapus versi sebelumnya.

## Pengujian

- Fixture dokumenter dan penjelasan finansial untuk durasi 5, 15, dan 30 menit.
- Pemeriksaan otomatis panjang, repetisi, cakupan outline, serta penggunaan source ID.
- Evaluasi manusia untuk alur, kejelasan, ketepatan nada, dan dukungan klaim.

## Tidak termasuk

- Riset web otomatis, ekstraksi URL, dan pembacaan PDF.
- Penulisan Shorts.

