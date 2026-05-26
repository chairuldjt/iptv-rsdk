# Server-Driven Updates untuk Meminimalkan Reinstall APK

Dokumen ini menjelaskan bagaimana proyek **RSDK IPTV Player** dapat dimaksimalkan agar perubahan harian cukup dikirim dari **Web Admin / API Server**, sementara APK Android diperlakukan sebagai **shell stabil** yang jarang di-update.

Tujuan utamanya:
- Mengurangi kebutuhan download APK ulang.
- Mengurangi proses install/update manual di STB.
- Memindahkan sebanyak mungkin perubahan ke jalur sinkronisasi file, metadata, dan konfigurasi dari server.
- Menetapkan batas yang jelas antara **perubahan konten** dan **perubahan engine aplikasi**.

---

## 1. Prinsip Dasar

Arsitektur target:

```text
APK Android = shell / engine stabil
Server Web   = sumber konten, asset, dan konfigurasi dinamis
```

Artinya:
- APK hanya memuat kemampuan inti: player, navigasi utama, sinkronisasi, cache, update checker, dan fallback minimal.
- Semua hal yang sering berubah diusahakan datang dari server dalam bentuk file, metadata, atau konfigurasi JSON.
- OTA APK tetap dipakai, tetapi hanya untuk perubahan yang memang membutuhkan kode Android baru.

---

## 2. Kondisi Repo Saat Ini

Fondasi server-driven di repo ini sebenarnya sudah mulai ada:

- **Config perangkat** sudah diambil dari backend melalui endpoint device config.
- **Channel list** sudah disinkronkan dari backend dan disimpan ke Room untuk cache offline.
- **Video edukasi** sudah bisa disalin dari SMB atau diunduh dari web repository melalui `EducationSyncManager`.
- **OTA APK** sudah terpisah melalui `/api/app-update/check` dan `UpdateManager`.

Komponen terkait saat ini:
- Android sync video edukasi: [EducationSyncManager.kt](/e:/Project/xampp/htdocs/iptv-rsdk/android-client/app/src/main/java/com/example/rsdkiptvplayer/util/EducationSyncManager.kt)
- Android OTA APK: [UpdateManager.kt](/e:/Project/xampp/htdocs/iptv-rsdk/android-client/app/src/main/java/com/example/rsdkiptvplayer/util/UpdateManager.kt)
- Endpoint check update APK: [route.ts](/e:/Project/xampp/htdocs/iptv-rsdk/src/app/api/app-update/check/route.ts)
- Arsitektur Android saat ini: [ANDROID_ARCHITECTURE.md](/e:/Project/xampp/htdocs/iptv-rsdk/docs/ANDROID_ARCHITECTURE.md)

Kesimpulannya: sistem belum sepenuhnya server-driven, tetapi pola dasarnya sudah cocok untuk diperluas.

---

## 3. Batasan Penting

Tidak semua perubahan bisa dilakukan dari server.

### Bisa server-driven
- Logo channel
- Thumbnail entertainment
- Background home/menu
- Video edukasi
- Playlist/channel data
- Teks, label, subtitle, deskripsi
- Urutan menu
- Visibility menu
- Tema sederhana seperti warna, overlay, dan image choice
- Default config per device atau global
- Daftar item entertainment berbasis URL/media/webview

### Tetap butuh APK baru
- Screen Compose baru yang belum didukung shell
- Tipe menu baru yang belum dikenal app
- Perubahan flow navigasi inti
- Bugfix Kotlin/Java
- Perubahan permission Android
- Perubahan service, receiver, atau background worker
- Integrasi hardware baru
- Perubahan cara kerja ExoPlayer / Media3
- Library native, anti-crash, anti-cheat, DRM, atau security patch

Aturan praktis:

```text
Kalau perubahan hanya mengganti isi, file, angka, urutan, atau metadata:
usahakan lewat server.

Kalau perubahan menambah kemampuan baru pada aplikasi:
butuh APK baru.
```

---

## 4. Target Arsitektur Server-Driven

### A. APK sebagai shell stabil

Shell Android sebaiknya hanya memuat:
- registrasi device
- pengambilan config device
- cache Room/DataStore
- player TV / video / webview yang sudah ada
- downloader dan cache manager
- asset resolver
- fallback asset minimal bawaan `res/`
- OTA APK untuk update mayor

### B. Server sebagai control center

Backend Next.js menjadi pusat untuk:
- metadata konten
- asset manifest
- file hosting
- versioning konten
- rollout per device atau per grup
- invalidasi cache

### C. Jalur update dibagi dua

1. **Server-driven sync**
   Untuk perubahan harian, branding, menu, konten, dan media.

2. **OTA APK**
   Untuk perubahan engine inti, fitur baru native, dan bugfix aplikasi.

---

## 5. Kategori yang Sebaiknya Dipindah ke Server

### Prioritas tinggi

#### 1. Home background dan artwork menu
Saat ini home screen masih memakai resource bawaan seperti `R.drawable.home_bg_tv`.

Target:
- background tiap menu dibaca dari server manifest
- file diunduh ke local storage
- UI memakai file lokal jika ada
- fallback ke drawable bawaan jika belum ada cache

Manfaat:
- ganti branding rumah sakit/hotel/titik instalasi tanpa build APK
- bisa beda per customer atau per grup device

#### 2. Logo channel
Logo sudah lebih dekat ke model dinamis karena data channel datang dari server.

Target:
- seluruh logo mengarah ke URL server/public uploads
- optional caching lokal untuk akses lebih cepat/offline

#### 3. Thumbnail entertainment
Ini sudah cocok menjadi full server-driven karena item entertainment memang dikelola dari dashboard.

Target:
- thumbnail, title, subtitle, target URL, dan tipe playback dikirim dari API
- client hanya merender

#### 4. Video edukasi
Bagian ini paling dekat dengan arsitektur patch system.

Status sekarang:
- sudah bisa copy dari SMB atau web
- hanya file yang belum ada / beda ukuran yang diunduh

Langkah peningkatan:
- tambah hash checksum, bukan hanya ukuran file
- tambah manifest version
- tambah cleanup yang lebih aman

### Prioritas menengah

#### 5. Home menu config
Urutan menu, label, icon choice, default focus, dan visibility menu dapat dipindah ke JSON server.

Contoh:
- tampilkan menu `TV`, `Edukasi`, `Hiburan`, `Informasi`
- sembunyikan `Settings` untuk device tertentu
- ubah label menu tanpa update APK

Catatan:
- tipe menu harus tetap berasal dari daftar yang sudah didukung shell
- jika ingin tipe baru, tetap butuh APK

#### 6. Informasi halaman statis
Misalnya:
- banner informasi rumah sakit
- running text
- pesan maintenance
- nomor bantuan
- konten informasi umum

Ini sangat cocok server-driven karena hanya data presentasi.

#### 7. Tema sederhana
Misalnya:
- warna utama
- overlay opacity
- background per section
- logo customer

Catatan:
- jangan memaksa layout Compose kompleks menjadi “layout builder” penuh
- cukup server-driven untuk variasi ringan yang stabil

---

## 6. Desain Teknis yang Direkomendasikan

### A. Asset Manifest

Buat satu endpoint manifest, misalnya:

```text
GET /api/device/assets/{deviceId}
```

Contoh response:

```json
{
  "status": true,
  "manifest_version": 12,
  "generated_at": "2026-05-27T10:00:00Z",
  "assets": [
    {
      "key": "home.background.tv",
      "category": "image",
      "url": "https://example.com/uploads/assets/home-tv.webp",
      "hash": "sha256:abc123",
      "size": 312045,
      "required": false
    },
    {
      "key": "menu.config",
      "category": "json",
      "url": "https://example.com/uploads/assets/menu-config.json",
      "hash": "sha256:def456",
      "size": 5210,
      "required": true
    }
  ]
}
```

Field minimum yang direkomendasikan:
- `key`: nama unik logical asset
- `category`: image, video, json, subtitle, audio
- `url`: lokasi download
- `hash`: checksum isi file
- `size`: ukuran file
- `required`: apakah app boleh fallback jika gagal download

### B. Penyimpanan Lokal di Android

Simpan file hasil sync ke folder khusus, misalnya:

```text
Android/data/<package>/files/server_assets/
```

Struktur yang disarankan:

```text
server_assets/
  manifest.json
  home/
  logos/
  entertainment/
  education/
  info/
```

Metadata lokal:
- manifest version terakhir
- hash terakhir per asset
- waktu sync terakhir
- daftar asset yang gagal diunduh

### C. Asset Resolver di Android

Tambahkan satu lapisan resolver:

```text
UI -> AssetResolver -> file lokal -> fallback bawaan APK
```

Perilaku:
- jika file hasil sync tersedia dan valid, gunakan file lokal
- jika belum ada atau rusak, gunakan fallback `R.drawable` / default URL
- jangan membuat UI bergantung penuh pada network saat render

### D. Sync Strategy

Urutan kerja yang direkomendasikan:

1. Client ambil manifest asset.
2. Client cocokkan `hash` atau `size` dengan file lokal.
3. Client unduh hanya asset yang berubah.
4. Client simpan ke file sementara `.tmp`.
5. Setelah selesai dan checksum cocok, rename ke file final.
6. Asset lama yang tidak lagi ada di manifest ditandai lalu dihapus.

Prinsip penting:
- hindari overwrite langsung file aktif
- gunakan atomic replace bila memungkinkan
- checksum lebih aman daripada hanya `size`

---

## 7. Kategori Fitur untuk Repo Ini

### Sudah cukup siap jadi server-driven
- device config
- channel list
- logo channel berbasis URL
- entertainment items
- video edukasi dari web
- video edukasi dari SMB copy mode

### Bisa ditingkatkan jadi server-driven dengan effort moderat
- home background
- branding customer
- menu ordering / visibility
- halaman info statis
- cache image lokal
- tema ringan berbasis JSON

### Sebaiknya tetap APK-driven
- penambahan screen baru di Compose
- perubahan interaction model remote/D-pad
- perubahan dialog kompleks
- perubahan engine player
- perubahan struktur navigasi inti

---

## 8. Roadmap Implementasi Bertahap

### Tahap 1: Rapikan yang sudah ada
- Pertahankan OTA APK hanya untuk update engine inti.
- Jadikan `EducationSyncManager` referensi pola umum sync asset.
- Tambahkan checksum `sha256` untuk video edukasi web.
- Pastikan dashboard menyimpan metadata file yang konsisten.

### Tahap 2: Tambahkan general asset manifest
- Buat endpoint `GET /api/device/assets/{deviceId}`.
- Tambahkan tabel atau metadata source untuk asset non-video.
- Buat `AssetSyncManager.kt` generik di Android.

### Tahap 3: Ubah home background dan branding
- Pindahkan background home dari hardcoded drawable ke resolver dinamis.
- Simpan fallback drawable minimal di APK.
- Tambahkan config branding per customer/per device group.

### Tahap 4: Pindahkan menu config
- Buat JSON untuk urutan menu, visibility, label, dan icon preset.
- Shell Android hanya menerima menu type yang sudah dikenal.
- Jangan dulu membuat layout builder yang terlalu fleksibel.

### Tahap 5: Tambahkan cache image dan cleanup policy
- Download logo/thumbnail ke cache lokal.
- Tambahkan cleanup untuk asset tidak terpakai.
- Tambahkan retry policy dan status sync untuk diagnostik teknisi.

---

## 9. Contoh Pembagian Tanggung Jawab

### APK shell bertanggung jawab atas
- rendering UI
- player dan playback
- fokus remote
- penyimpanan lokal
- download manager
- validasi file hasil sync
- fallback saat offline

### Backend bertanggung jawab atas
- manifest asset
- source of truth metadata
- upload dan penghapusan file
- relasi asset ke device/customer/group
- publish workflow
- rollback ke manifest sebelumnya

---

## 10. Risiko dan Mitigasi

### Risiko: file berubah tetapi nama tetap
Mitigasi:
- gunakan checksum hash, jangan hanya nama file

### Risiko: file korup saat download
Mitigasi:
- simpan ke `.tmp`, verifikasi hash, baru rename

### Risiko: device offline saat manifest berubah
Mitigasi:
- semua render penting harus punya fallback lokal

### Risiko: terlalu banyak hal dibuat dinamis
Mitigasi:
- batasi hanya konten, asset, dan config ringan
- fitur native baru tetap lewat APK

### Risiko: manifest salah dan menyebabkan UI kosong
Mitigasi:
- dukung fallback default
- manifest `required=false` untuk asset non-kritis
- simpan manifest terakhir yang masih valid

---

## 11. Rekomendasi Praktis untuk Proyek Ini

Untuk repo `iptv-rsdk`, target realistis yang paling bernilai adalah:

1. Pertahankan APK sebagai shell stabil.
2. Maksimalkan server-driven untuk:
   - channel/logo
   - entertainment items
   - video edukasi
   - home background
   - branding/logo customer
   - menu ordering dan visibility
   - info page content
3. Gunakan OTA APK hanya untuk:
   - fitur Android baru
   - bugfix native
   - perubahan engine player
   - perubahan permission / manifest / service

Dengan pendekatan ini, mayoritas perubahan operasional harian dapat dikirim dari server tanpa reinstall APK.

---

## 12. Definisi Selesai

Arsitektur ini dianggap berhasil bila:
- perubahan branding tidak perlu build APK
- perubahan konten hiburan/edukasi tidak perlu build APK
- perubahan urutan menu tidak perlu build APK
- perubahan logo/background tidak perlu build APK
- device offline tetap bisa memakai cache terakhir
- update APK tinggal dipakai untuk perubahan fitur inti

Jika ingin melanjutkan implementasi, dokumen ini sebaiknya dipasangkan dengan pekerjaan teknis berikut:
- endpoint asset manifest di backend
- `AssetSyncManager.kt` generik di Android
- `AssetResolver` untuk background/logo/image lokal
- dashboard publish flow untuk asset non-APK
