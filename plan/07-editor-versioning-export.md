# Step 07 — Editor, Versioning, and Export

## Tujuan

Memberi pengguna kontrol editorial penuh tanpa kehilangan hasil lama atau menimpa edit manual.

## Pekerjaan editor

1. Workspace memiliki tab Brief, Sumber, Outline, Naskah, Scene & Visual, dan Ekspor.
2. Editor menampilkan struktur di kiri, konten aktif di tengah, serta metadata/sumber/temuan di kanan.
3. Autosave memakai optimistic concurrency melalui version/revision token.
4. Bagian dapat dikunci agar regenerate tidak mengubahnya.
5. Regenerate bekerja pada bab, unit narasi, scene, atau prompt terpilih.
6. Hasil regenerate muncul sebagai proposal diff sebelum diterapkan.
7. Perubahan upstream menandai artefak downstream sebagai stale tanpa menghapusnya.
8. Riwayat versi dapat dibandingkan dan dipulihkan.

## Format ekspor MVP

- TXT: naskah utuh atau blok scene.
- Markdown: judul, ringkasan, scene, narasi, dan prompt.
- CSV: satu baris per scene/shot dengan kolom yang stabil.
- JSON: paket produksi lengkap dengan versi dan relasi.

Format blok scene utama:

```text
Scene: SC-004 — Daya beli (estimasi 10–12 detik)
Narasi: "..."
Prompt gambar: "..."
```

## Kriteria penerimaan

- Dua tab browser yang mengedit revision lama tidak menimpa revision baru.
- Lock melindungi konten dari regenerate massal.
- Pengguna dapat melihat dan menerima/menolak perubahan AI.
- Restore membuat versi baru dan tidak menghapus histori.
- Ekspor mengambil satu snapshot versi yang konsisten.
- Ekspor menandai artefak stale atau meminta pengguna memperbaruinya.
- CSV dan JSON memiliki schema version.

## Pengujian

- Concurrent edit dan conflict resolution.
- Regenerate parsial dengan bagian terkunci.
- Snapshot test setiap format ekspor.
- Round-trip JSON untuk memastikan relasi versi tidak hilang.
- Test formula/CSV injection pada field yang berasal dari pengguna atau model.

## Tidak termasuk

- DOCX/PDF, integrasi editor video, TTS, dan publikasi YouTube.

