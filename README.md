# RSDK IPTV Player - Zero-Config IPTV System

Sistem IPTV Player pintar berbasis Android TV / STB yang dirancang khusus untuk deployment massal tanpa konfigurasi manual di sisi client (**Zero-Config Client**). Dengan konsep **Auto-Active by Default**, setelah aplikasi di-install di STB/Android TV, aplikasi langsung dapat menyinkronkan channel dan memutar siaran TV tanpa memerlukan aktivasi manual dari Web Admin maupun input URL manual dari pengguna.

---

## 📌 Alur Produksi & Zero-Config Flow

```mermaid
sequenceDiagram
    autonumber
    actor Admin as Admin Web / Teknisi
    actor Client as Android STB / TV
    participant Server as Web Admin & API Server
    
    Note over Admin, Server: 1. Persiapan Server & Data
    Admin->>Server: Deploy Web Admin & API
    Admin->>Server: Upload M3U Playlist & Parse ke Database
    
    Note over Client, Server: 2. Pemasangan & Auto-Registrasi
    Admin->>Client: Build APK dengan default API URL
    Admin->>Client: Install APK di STB Client
    Client->>Client: Buka Aplikasi pertama kali
    Client->>Client: Generate UUID (Device ID) & Simpan di DataStore
    
    Client->>Server: POST /api/device/register (Kirim Device ID)
    Note over Server: Server mendeteksi Device baru<br/>Otomatis set status ACTIVE = true
    Server-->>Client: Response: Device registered & active
    
    Note over Client, Server: 3. Sinkronisasi & Pemutaran
    Client->>Server: GET /api/device/config/{device_id}
    Server-->>Client: Kirim Konfigurasi Device (Aspect Ratio, Sync Interval, dll)
    Client->>Server: GET /api/device/channels/{device_id}
    Server-->>Client: Kirim Kategori & Daftar Channel TV
    Client->>Client: Simpan Cache Lokal (Room Database / Preferences)
    Client->>Client: Masuk Live TV & Putar Channel Default (ExoPlayer)
```

### Penjelasan Flow
1. **Deployment Backend**: Deploy backend (Web Admin Panel + API) ke server tujuan (lokal/cloud). Admin mengunggah playlist M3U melalui Web Admin Panel, dan server memprosesnya menjadi kategori serta channel.
2. **Build & Install Client**: APK Android dibuat dengan default API URL yang tertanam pada `BuildConfig` (default production saat ini: `https://iptv.teknisirsdk.my.id`; contoh LAN: `http://10.55.1.5:9000`).
3. **Instalasi & Inisialisasi**: APK di-install pada perangkat STB/Android TV. Begitu aplikasi dibuka, ia secara otomatis memeriksa database lokal untuk `Device ID`. Jika belum ada, UUID baru di-generate dan disimpan secara permanen di DataStore.
4. **Auto-Register & Auto-Activate**: Aplikasi mendaftarkan Device ID ke backend melalui endpoint `/api/device/register`. Backend mendeteksi perangkat baru dan **langsung menandainya sebagai aktif** (`active = true`) di database tanpa menunggu persetujuan admin.
5. **Sync & Play**: Aplikasi mengunduh konfigurasi perangkat, daftar kategori, dan channel dari server, menyimpannya di cache lokal, lalu masuk ke Live TV untuk langsung memutar siaran.

---

## 📂 Struktur Dokumentasi Sistem

Untuk mempermudah pengembangan backend (Web Admin & API) serta frontend (Android TV Client), seluruh detail teknis dibagi menjadi beberapa dokumen spesifik:

1. **[Panduan Memulai (Getting Started Guide)](docs/GETTING_STARTED.md)**  
   Langkah-langkah lengkap dari kloning repo, setup database, hingga aplikasi berjalan di STB.

2. **[Spesifikasi API & Endpoint](docs/API_SPECIFICATION.md)**  
   Mendokumentasikan seluruh kontrak endpoint REST API yang digunakan untuk interaksi antara Android TV Client dan backend server, lengkap dengan contoh request dan response JSON.
   
3. **[Arsitektur Client Android TV](docs/ANDROID_ARCHITECTURE.md)**  
   Menjelaskan struktur aplikasi Android, pustaka yang digunakan (Jetpack Room, DataStore, Media3 ExoPlayer), mekanisme *fallback offline*, integrasi *auto-start on boot*, serta konfigurasi cleartext HTTP.
   
4. **[Skema Database & Spesifikasi Web Admin](docs/BACKEND_DATABASE.md)**  
   Membahas rancangan database relasional (tabel `devices`, `channels`, `categories`, `playlists`, dll) serta fitur-fitur wajib yang harus dimiliki oleh Web Admin Panel untuk mengelola perangkat dan konten.
   
5. **[Panduan Mode Teknisi (Technician Mode)](docs/TECHNICIAN_MODE.md)**  
   Menjelaskan fitur tersembunyi untuk teknisi lokal di lapangan, termasuk skema bypass PIN, tombol remote trigger, override URL server, uji koneksi, dan manajemen log lokal.

6. **[Panduan Konfigurasi Default & Build](docs/CONFIGURATION_AND_BUILD.md)**  
   Mendokumentasikan lokasi variabel default dalam kode sumber untuk kustomisasi APK massal serta langkah-langkah build dan instalasi via ADB.

7. **[Arsitektur Infrastruktur](docs/INFRASTRUCTURE.md)**  
   Menjelaskan topologi jaringan kantor/rumah, server IPTV lokal, mode direct vs relay on-demand, dan checklist troubleshooting playback.

---

## 🛠️ Ringkasan Fitur Wajib (MVP Checklist)

### Sisi Android TV Client:
*   [ ] **Zero-Config Onboarding**: Buka langsung jalan, tanpa setup URL manual bagi pengguna akhir.
*   [ ] **Static API Fallback**: Fallback ke static URL dari `BuildConfig` jika tidak ada override.
*   [ ] **Default Custom M3U Mode**: APK saat ini default ke mode `custom` dengan fallback playlist `http://10.0.0.1/iptv/iptv_rsdk.m3u`; mode API tetap tersedia dari Settings/Web Admin.
*   [ ] **UUID Device ID Generator**: Generate ID unik berbasis hardware-independent UUID, disimpan aman di DataStore.
*   [ ] **Auto-Registration Client**: Mendaftarkan diri otomatis secara background.
*   [ ] **Local SQLite Cache (Room)**: Caching seluruh channel dan kategori untuk menjamin *offline mode* yang mulus.
*   [ ] **Media3 ExoPlayer Integration**: Dukungan HLS (`.m3u8`), MP4, DASH, dll., lengkap dengan pemilihan aspek rasio dinamis (*fit*, *stretch*, *zoom*, *16:9*, *4:3*).
*   [ ] **Technician Mode**: Akses terproteksi PIN (`2468`) atau kombinasi D-pad remote untuk administrasi lokal.
*   [ ] **Remote Numeric PIN Input**: PIN teknisi bisa dimasukkan langsung memakai tombol angka remote `0-9`.
*   [ ] **Network Security Config**: Mendukung koneksi HTTP non-HTTPS untuk server lokal/intranet.
*   [ ] **Auto-Start On Boot**: Broadcast receiver untuk menjalankan aplikasi secara otomatis setelah perangkat STB menyala.
*   [ ] **Dual Education Sources**: Mendukung sumber video edukasi dari SMB share lokal maupun portal terpusat (Web Repository).
*   [ ] **Stream vs Copy Playback**: Pilihan memutar video edukasi langsung secara online (Stream) atau mengunduh ke storage lokal STB terlebih dahulu (Copy) menggunakan `DelegatingDataSource` internal.

### Sisi Web Admin Backend:
*   [ ] **Dashboard Device**: Memantau status perangkat (*Online*, *Offline*, *Disabled*, *Last IP*, *App Version*) dengan filter status.
*   [ ] **M3U Playlist Parser**: Parsing link/file M3U menjadi database kategori dan channel terstruktur.
*   [ ] **Web Video Repository Gallery**: Galeri video edukasi dengan folder, rename folder, upload MP4, direct URL stream, dan thumbnail per video untuk didistribusikan ke STB.
*   [ ] **Remote Management**: Mengubah aspek rasio, interval sinkronisasi, status aktif, dan reset setting dari jauh secara terpusat per perangkat atau global.
*   [ ] **Remote Toggle Lock Settings**: Mengunci pengaturan lokal di STB agar pengguna biasa tidak bisa mengubah konfigurasi secara tidak sengaja.
*   [ ] **Remote Entertainment Content**: Mengatur beberapa item menu Hiburan Android dari dashboard web, termasuk WebView, media player, M3U player, thumbnail, judul, sub teks, serta default SoundCloud dan YouTube yang bisa diubah.
*   [ ] **Auto-Active Default Rule**: Pendaftaran perangkat baru otomatis diberi hak akses langsung aktif.
*   [ ] **Device Blacklisting**: Kemampuan menonaktifkan perangkat dari dashboard web, yang secara instan akan memblokir akses STB dan menampilkan pesan pemblokiran.
*   [ ] **Offline Cleanup**: Threshold auto-delete device offline lama, dengan pengecualian untuk device yang sengaja dinonaktifkan.

---

## 🚀 Deploy Production Cepat

Server production menggunakan Next.js di port `9000` dan PM2.

```bash
git pull origin master
./deploy.sh
```

Pastikan `.env` server berisi:
```env
DATABASE_URL="mysql://username:password@localhost:3306/iptv_rsdk"
SESSION_SECRET="isi-random-panjang-minimal-32-karakter"
```

Default konfigurasi untuk STB baru bisa diset lewat dashboard `Setup Defaults`. Jika belum ada nilai yang disimpan dari dashboard, backend akan memakai fallback dari `.env` berikut:

```env
IPTV_DEFAULT_SYNC_MODE="api_relay"
IPTV_DEFAULT_CUSTOM_M3U_URL="http://10.0.0.1/iptv/iptv_rsdk.m3u"
IPTV_DEFAULT_ASPECT_RATIO="fit"
IPTV_DEFAULT_SYNC_INTERVAL="1800"
IPTV_DEFAULT_START_SCREEN="home_screen"
IPTV_DEFAULT_CATEGORY="Semua"
IPTV_DEFAULT_CHANNEL_ID=""
IPTV_DEFAULT_LOCK_SETTINGS="true"
IPTV_DEFAULT_AUTO_START_ON_BOOT="true"
IPTV_DEFAULT_TECHNICIAN_PIN="2468"
IPTV_DEFAULT_EDUCATION_VIDEO_PATH=""
IPTV_DEFAULT_EDUCATION_SMB_USERNAME=""
IPTV_DEFAULT_EDUCATION_SMB_PASSWORD=""
IPTV_DEFAULT_EDUCATION_SMB_DOMAIN=""
IPTV_DEFAULT_EDUCATION_REPEAT_MODE="all"
IPTV_DEFAULT_EDUCATION_PLAY_ORDER="alphabetical"
IPTV_DEFAULT_EDUCATION_SOURCE="smb"
IPTV_DEFAULT_EDUCATION_PLAYBACK_MODE="copy"
IPTV_HLS_RELAY_BASE_URL="http://10.55.1.5/relay"
```

Value penting yang valid:
- `IPTV_DEFAULT_SYNC_MODE`: `api`, `api_relay`, `custom`
- `IPTV_DEFAULT_ASPECT_RATIO`: `fit`, `stretch`, `zoom`, `16_9`, `4_3`
- `IPTV_DEFAULT_START_SCREEN`: `live_tv`, `category_list`, `home_screen`
- `IPTV_DEFAULT_EDUCATION_REPEAT_MODE`: `all`, `one`, `none`
- `IPTV_DEFAULT_EDUCATION_PLAY_ORDER`: `alphabetical`, `random`, `shuffle`
- `IPTV_DEFAULT_EDUCATION_SOURCE`: `smb`, `web`
- `IPTV_DEFAULT_EDUCATION_PLAYBACK_MODE`: `copy`, `stream`

Praktiknya:
- `api` dipakai kalau STB bisa mengakses URL stream asli langsung.
- `api_relay` dipakai kalau stream perlu diproxy/diubah dulu oleh relay server, terutama untuk UDP multicast.
- `custom` dipakai kalau device harus memakai playlist M3U khusus.

### Relay IPTV UDP Multicast ke HLS (Mode Relay)

Jika playlist siaran TV Anda berisi URL UDP Multicast (seperti `udp://@238.x.x.x:1234`), browser web dashboard dan perangkat client di luar VLAN IPTV memerlukan relay ke format HLS (`.m3u8`). Sistem mendukung dua metode relay:

#### 1. On-Demand HLS Relay (Sangat Direkomendasikan & Bawaan Aplikasi)
Sistem Next.js akan mendeteksi request client secara otomatis ke endpoint `/api/stream/udp-hls/{channelId}/index.m3u8` dan menjalankan subprocess `ffmpeg` untuk melakukan transcoding HLS secara dinamis **hanya ketika siaran ditonton**. Subprocess akan mati otomatis setelah beberapa menit jika tidak ada client yang aktif (idle).

*   **Setup**: Cukup sesuaikan konfigurasi default di dashboard **Setup Defaults** pada bagian **On-Demand HLS Relay Runtime** (menentukan path biner `ffmpeg`, port, directory penyimpanan segment sementara `/public/relay`, dan timeout idle).
*   Tidak membutuhkan konfigurasi service tambahan di sistem Linux.

#### 2. Background Continuous Relay (Legacy / Pre-run Service)
Metode lama di mana seluruh channel UDP yang ada di M3U ditranscoding sekaligus secara terus-menerus di latar belakang menggunakan `systemd` service:

```bash
sudo env APP_DIR=/var/www/html/iptv-rsdk \
  M3U_URL=http://10.0.0.1/iptv/iptv_rsdk.m3u \
  LOCALADDR=10.0.0.199 \
  OUTPUT_ROOT=/var/www/html/landingpage/relay \
  ./scripts/iptv-relay-install.sh

sudo systemctl start iptv-relay-all
journalctl -u iptv-relay-all -f
```

Jika menggunakan metode legacy ini, arahkan **HLS Relay Base URL** di dashboard Setup ke folder root output tersebut, misalnya: `http://10.55.1.5/relay`.

---

## 📦 Build & OTA APK Ringkas

Android client sekarang memakai satu package utama tanpa flavor update channel. `versionCode` diambil otomatis dari jumlah commit Git, sedangkan `versionName` dari `git describe --tags --always`. Build release membutuhkan signing env di `android-client/.env`.

Contoh env release signing:

```env
DEFAULT_API_BASE_URL=http://10.55.1.5:9000
HOME_LOW_EFFECT_MODE=true
KEYSTORE_FILE=app/keystore/rsdk-release.jks
KEYSTORE_STORE_PASSWORD=...
KEYSTORE_KEY_ALIAS=rsdk-release
KEYSTORE_KEY_PASSWORD=...
```

Keterangan:
- `DEFAULT_API_BASE_URL` = base URL API bawaan yang ditanam ke APK saat build, disimpan di `.env` root proyek.
- `HOME_LOW_EFFECT_MODE` = `true` untuk efek home lebih ringan, `false` untuk efek lebih penuh, juga disimpan di `.env` root proyek.
- `KEYSTORE_*` = tetap disimpan di `android-client/.env` untuk kebutuhan signing release.
- Untuk jaringan lokal, jangan pakai `localhost`; gunakan IP/hostname server yang benar-benar bisa diakses STB.

```powershell
cd android-client
./gradlew assembleDebug
./gradlew assembleRelease
```

Output:
- Debug: `android-client/app/build/outputs/apk/debug/app-debug.apk`
- Release: `android-client/app/build/outputs/apk/release/app-release.apk`

Dashboard **Updates** membaca metadata manifest APK otomatis, menyimpan upload sebagai draft, lalu hanya versi yang diklik **Deploy Version** yang menjadi OTA aktif untuk endpoint `/api/app-update/check`.
