# Step 06 — Scenes and Visual Consistency

## Tujuan

Memetakan versi naskah yang disetujui menjadi scene tanpa kehilangan atau mengubah narasi, kemudian menghasilkan prompt visual yang relevan dan konsisten.

## Model data minimum

- `scene_versions`
- `scene_ranges`
- `shots`
- `visual_prompt_versions`
- `character_profiles`
- `reference_assets`

## Pekerjaan segmentasi

1. Scene mengacu pada rentang unit narasi dari satu `script_version_id`.
2. Validator membuktikan setiap unit/rentang tercakup tepat sekali dan urutannya tidak berubah.
3. Durasi dihitung dari jumlah kata, kecepatan bicara, dan jeda; timestamp tetap diberi label estimasi.
4. Scene dapat dibagi menjadi beberapa shot tanpa mengubah narasi.
5. Perubahan naskah menandai scene dan prompt terkait sebagai stale.

## Pekerjaan visual

1. Simpan visual style global: medium, palet, periode, aspect ratio, mood, dan negative constraints.
2. Dukung prompt gambar statis dan prompt video dengan aksi, kamera, tempo, serta durasi shot.
3. Analisis gambar referensi dengan model dari profil vision dan simpan identity anchor berversi.
4. Prompt yang menampilkan karakter wajib memakai anchor versi yang sama.
5. Simpan hubungan prompt dengan character profile dan reference asset yang digunakan.
6. Validasi bahwa prompt tidak memuat angka/label finansial yang dikarang.
7. Grafik finansial memakai spesifikasi data deterministik; generator gambar bukan sumber angka.

## Kriteria penerimaan

- Concatenation seluruh rentang scene sama dengan naskah sumber dalam urutan yang benar.
- Tidak ada unit narasi hilang, ganda, atau diubah diam-diam.
- Setiap scene memiliki judul, narasi, estimasi durasi, dan prompt jenis yang dipilih.
- Karakter berulang merujuk identity anchor yang sama di semua prompt relevan.
- Mengganti gambar referensi membuat versi character profile baru dan menandai prompt lama sebagai stale.
- Prompt video memiliki aksi/pergerakan; prompt gambar memiliki komposisi statis.

## Pengujian

- Property test untuk range tanpa gap dan overlap.
- Fixture karakter yang muncul, tidak muncul, dan beberapa karakter.
- Test vision error, gambar invalid, dan model vision tidak dikonfigurasi.
- Evaluasi manusia untuk relevansi scene, continuity karakter, dan kelayakan produksi.

## Batas yang harus dijelaskan di UI

Identity anchor meningkatkan konsistensi deskripsi, tetapi generator visual eksternal masih dapat menghasilkan variasi. Seed atau parameter khusus provider tidak dianggap portable lintas provider.

