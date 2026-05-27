# RSDK IPTV Player - Backend Database & Web Admin Specifications

Dokumen ini menjelaskan skema database aktual yang dipakai backend Next.js + Prisma. Database production memakai MySQL/MariaDB sesuai `prisma/schema.prisma`.

---

## 1. Ringkasan Relasi

```text
playlists
  ├─ categories
  └─ channels

devices
  ├─ device_configs
  └─ device_logs

education_folders
  └─ education_videos

entertainment_items
app_settings
app_updates
users
```

`playlists`, `categories`, dan `channels` menyimpan hasil parsing M3U. `devices` dan `device_configs` menyimpan status serta konfigurasi per STB. `education_folders` dan `education_videos` mengelola repository video edukasi web. `entertainment_items` menyimpan item menu Hiburan Android. `app_settings` adalah key/value generic untuk konfigurasi global runtime (default device baru, runtime relay, NTP, home experience profiles, device groups, running text profiles, video broadcast profiles, dll). `app_updates` menyimpan metadata APK yang di-upload dari dashboard.

---

## 2. Tabel Konten IPTV

### `playlists`
Menyimpan sumber playlist M3U.

| Kolom | Tipe | Catatan |
| --- | --- | --- |
| `id` | Int | Primary key autoincrement. |
| `name` | String | Nama playlist. |
| `filePath` | String/null | Path file upload lokal bila ada. |
| `sourceUrl` | Text/null | URL M3U eksternal bila playlist berasal dari URL. |
| `totalChannels` | Int | Jumlah channel hasil parse. |
| `isGlobal` | Boolean/null | Playlist global aktif untuk mode `api`. |
| `relayEnabled` | Boolean | Mengaktifkan on-demand relay untuk playlist ini. |
| `relayConfig` | Text/null | Override JSON untuk runtime relay playlist; field kosong mengikuti setting global. |
| `createdAt` / `updatedAt` | DateTime | Timestamp Prisma. |

Index penting: `isGlobal`, `updatedAt`.

### `categories`
Kategori dari tag M3U `group-title`.

| Kolom | Tipe | Catatan |
| --- | --- | --- |
| `id` | Int | Primary key. |
| `playlistId` | Int | Foreign key ke `playlists`, cascade delete. |
| `name` | String | Nama kategori. |
| `sortOrder` | Int | Urutan tampilan. |
| `isActive` | Boolean | Status kategori. |

Index penting: `(playlistId, sortOrder)`.

### `channels`
Daftar channel hasil parsing.

| Kolom | Tipe | Catatan |
| --- | --- | --- |
| `id` | Int | Primary key. |
| `playlistId` | Int | Foreign key ke `playlists`, cascade delete. |
| `categoryId` | Int/null | Foreign key ke `categories`, set null saat kategori dihapus. |
| `name` | String | Nama channel. |
| `logoUrl` | Text/null | URL logo dari `tvg-logo`. |
| `streamUrl` | Text | URL stream asli, termasuk HTTP/HLS/UDP. |
| `sortOrder` | Int | Urutan tampilan. |
| `isActive` | Boolean | Hanya channel aktif dikirim ke client. |

Index penting: `(playlistId, isActive, sortOrder)`, `categoryId`.

### `education_videos`
Daftar video edukasi di repository web terpusat. Schema lengkap diuraikan di bagian `EducationVideo` di bawah.

---

## 3. Tabel Device

### `devices`
Record STB yang register otomatis dari Android.

| Kolom | Tipe | Catatan |
| --- | --- | --- |
| `id` | Int | Primary key. |
| `deviceId` | String unique | UUID dari client, contoh `STB-RSDK-...`. |
| `deviceName` | String | Default `Android STB`. |
| `isActive` | Boolean | Default `true`; dipakai untuk blokir device. |
| `playlistId` | Int/null | Relasi lama/opsional; channel aktif saat ini memakai global playlist. |
| `appVersion` | String/null | Versi APK yang dilaporkan Android. |
| `androidVersion` | String/null | Versi Android device. |
| `lastIp` | String/null | IP lokal terakhir dari register/heartbeat. |
| `macAddress` | String/null | Dipakai juga untuk mencocokkan device setelah reinstall. |
| `lastOnline` | DateTime/null | Basis status online/offline dashboard. |

Index penting: `(isActive, lastOnline)`, `lastOnline`, `macAddress`.

### `device_configs`
Konfigurasi per device. Setiap device baru dibuatkan config dari default global saat register.

| Kolom | Tipe | Catatan |
| --- | --- | --- |
| `deviceId` | String unique/null | Relasi ke `devices.deviceId`, cascade delete. |
| `defaultCategory` | String | Default `National TV`. |
| `defaultChannelId` | Int/null | Channel awal opsional. |
| `aspectRatio` | String | `fit`, `stretch`, `zoom`, `16_9`, `4_3`. |
| `syncInterval` | Int | Detik, default 1800. |
| `syncMode` | String/null | `custom` atau `api`; default `custom`. Nilai lama `api_relay` diperlakukan sebagai alias `api`. |
| `customM3uUrl` | Text/null | URL M3U untuk mode custom. |
| `startScreen` | String | `live_tv`, `category_list`, `home_screen`. |
| `lockSettings` | Boolean | Mengunci Settings Android. |
| `forceSync` | Boolean | Trigger sync channel sekali pakai. |
| `clearCacheTrigger` | Boolean/null | Trigger clear cache channel sekali pakai. |
| `autoStartOnBoot` | Boolean | Autostart Android. |
| `technicianPin` | String | Default `2468`. |
| `educationVideoPath` | String | SMB path video edukasi. |
| `educationSmbUsername` | String | Username SMB. |
| `educationSmbPassword` | String | Password SMB. |
| `educationSmbDomain` | String | Domain/workgroup SMB. |
| `educationRepeatMode` | String | `all`, `one`, `none`. |
| `educationPlayOrder` | String | `alphabetical`, `random`, `shuffle`. |
| `educationSource` | String | Sumber video edukasi (`smb` atau `web`). |
| `educationPlaybackMode` | String | Mode putar video (`copy` atau `stream`). |
| `educationForceSync` | Boolean | Trigger sync edukasi sekali pakai. |

Catatan: default global **tidak** lagi disimpan sebagai `device_configs.deviceId = NULL`. Default global disimpan di `app_settings` dengan key `device.defaultConfig`, lalu disalin ke `device_configs` saat device baru register.

### `EducationFolder`
Folder galeri untuk mengelompokkan video edukasi Web Repository.

| Kolom | Tipe | Catatan |
| --- | --- | --- |
| `id` | Int | Primary key autoincrement. |
| `name` | String unique | Nama folder yang tampil di dashboard. |
| `isPublished` | Boolean | Jika `false`, semua video dalam folder ini disembunyikan dari playlist Video Edukasi. |
| `createdAt` | DateTime | Timestamp pembuatan. |
| `updatedAt` | DateTime | Timestamp perubahan terakhir. |

### `EducationVideo`
Daftar video edukasi Web Repository yang dapat diputar client Android saat `educationSource=web`.

| Kolom | Tipe | Catatan |
| --- | --- | --- |
| `id` | Int | Primary key autoincrement. |
| `folderId` | Int/null | Relasi opsional ke `EducationFolder`, `SET NULL` saat folder dihapus. |
| `title` | String | Judul video. |
| `videoUrl` | Text | URL eksternal atau path lokal `/uploads/videos/...`. |
| `thumbnailUrl` | Text/null | URL eksternal atau path lokal `/uploads/video-thumbnails/...`. |
| `isPublished` | Boolean | Toggle link video ke playlist Video Edukasi Web Repository. Video juga tidak dikirim jika foldernya nonaktif. |
| `createdAt` | DateTime | Timestamp pembuatan. |
| `updatedAt` | DateTime | Timestamp perubahan terakhir. |

### `EntertainmentItem`
Daftar item menu Hiburan Android. Item nonaktif atau URL kosong akan disembunyikan dari client.

| Kolom | Tipe | Catatan |
| --- | --- | --- |
| `id` | Int | Primary key autoincrement. |
| `title` | String | Judul item. |
| `subtitle` | String | Sub teks pada kartu Android. |
| `url` | Text/null | URL WebView, media langsung, atau playlist M3U. |
| `contentType` | String | `webview`, `media_player`, atau `m3u_player`. |
| `thumbnailUrl` | Text/null | Thumbnail custom atau default. |
| `isActive` | Boolean | Toggle tampil/sembunyi. |
| `sortOrder` | Int | Urutan tampil di aplikasi. |
| `createdAt` | DateTime | Timestamp pembuatan. |
| `updatedAt` | DateTime | Timestamp perubahan terakhir. |

### `device_logs`
Log error dari Android.

| Kolom | Tipe | Catatan |
| --- | --- | --- |
| `deviceId` | String | Relasi ke `devices.deviceId`, cascade delete. |
| `errorType` | String | Kategori error. |
| `errorMessage` | String | Detail error. |
| `channelId` | Int/null | Channel terkait bila ada. |
| `streamUrl` | Text/null | URL yang gagal diputar. |
| `androidSdk` | Int/null | SDK Android client. |
| `createdAt` | DateTime | Timestamp server. |

---

## 4. Tabel Admin, Setting, dan Update

### `users`
Menyimpan akun Web Admin.

| Kolom | Tipe | Catatan |
| --- | --- | --- |
| `username` | String unique | Username login. |
| `password` | String | Password hash. |
| `role` | String | Default `admin`. |

### `app_settings`
Key/value untuk konfigurasi global runtime. Tabel ini bersifat generic — value disimpan sebagai string (umumnya JSON) dan dipakai oleh berbagai modul.

Key yang dipakai kode saat ini:

| Key | Isi |
| --- | --- |
| `device.defaultConfig` | JSON default config untuk device baru (lihat `src/lib/defaultDeviceConfig.ts`). |
| `device.offlineAutoDeleteDays` | Threshold auto-delete device offline lama (0 = nonaktif). |
| `device.groups` | Array JSON daftar device group (id, name, description, color). |
| `device.groupAssignments` | Map JSON `{ deviceId: groupId }`. |
| `app.publicOrigin` | Origin publik untuk URL absolut yang dikirim ke client. |
| `app.primaryNtpServer` | NTP server utama yang dikirim ke Android, default `0.id.pool.ntp.org`. |
| `stream.onDemandHlsRelayConfig` | JSON runtime ffmpeg/on-demand relay (binary path, localaddr, output root, hls time, fifo size, idle timeout). |
| `homeExperience.profiles` | Array metadata profile home experience. |
| `homeExperience.profile.<id>` | JSON patch config home experience untuk profile tertentu. |
| `homeExperience.globalProfileId` | ID profile yang dipakai sebagai global. |
| `homeExperience.groupProfileMap` | Map JSON `{ groupId: profileId }`. |
| `homeExperience.deviceProfileMap` | Map JSON `{ deviceId: profileId }`. |
| `homeExperience.global` / `homeExperience.group.<id>` / `homeExperience.device.<id>` | Patch config legacy (dipakai sebagai fallback bila tidak ada profile mapping). |
| `runningText.profiles` / `runningText.profile.<id>` / `runningText.globalProfileId` / `runningText.groupProfileMap` / `runningText.deviceProfileMap` | Profile management running text. |
| `videoBroadcast.profiles` / `videoBroadcast.profile.<id>` / `videoBroadcast.globalProfileId` / `videoBroadcast.groupProfileMap` / `videoBroadcast.deviceProfileMap` | Profile management video broadcast. |

Jika key belum ada, backend memakai fallback dari `.env` dan konstanta kode.

### `app_updates`
Metadata APK update dari dashboard Updates.

| Kolom | Tipe | Catatan |
| --- | --- | --- |
| `versionCode` | Int unique | Dibandingkan dengan APK client. |
| `versionName` | String | Nama versi tampil. |
| `apkFileName` | String | File di `public/uploads/apk`. |
| `changelog` | Text/null | Catatan rilis. |
| `isMandatory` | Boolean | Saat ini upload dashboard mengisi `true` secara default. |
| `isDeployed` | Boolean | Hanya versi deployed aktif yang dipakai endpoint check. |

Alur dashboard:
- Upload APK membaca `versionCode` dan `versionName` dari manifest APK di browser, lalu menyimpan record sebagai draft.
- Deploy version mengubah semua record lain menjadi `isDeployed=false`, lalu mengaktifkan satu record pilihan.
- Delete update menghapus record database dan file APK di `public/uploads/apk`.

---

## 5. Fitur Web Admin Aktual

- Dashboard device dengan status online/offline/disabled, filter, pagination, search, dan auto-delete offline.
- Aktivasi/deaktivasi device tanpa menghapus config.
- Edit config per device: sync mode, custom M3U, aspect ratio, sync interval, lock settings, PIN, autostart, dan edukasi SMB.
- Clear cache, force sync channel, dan force sync edukasi dari dashboard.
- Playlist upload/sync M3U, parse category/channel, global playlist, dan toggle relay per playlist.
- Preview stream direct/relay dan konfigurasi HLS relay on-demand.
- Upload APK dengan auto-detect manifest, draft history, deploy satu versi aktif, download, dan delete APK update.
- Remote control device via polling command dan screenshot streaming (in-memory queue).
- Log viewer untuk error yang dikirim Android.
- Manajemen device group beserta assignment device ke group.
- Manajemen profile Home Experience, Running Text, dan Video Broadcast dengan inheritance global → group → device.
- Setup Defaults: konfigurasi default device baru, NTP server utama, dan runtime ffmpeg/HLS relay on-demand.
