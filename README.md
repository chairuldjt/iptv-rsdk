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

### Sisi Web Admin Backend:
*   [ ] **Dashboard Device**: Memantau status perangkat (*Online*, *Offline*, *Disabled*, *Last IP*, *App Version*) dengan filter status.
*   [ ] **M3U Playlist Parser**: Parsing link/file M3U menjadi database kategori dan channel terstruktur.
*   [ ] **Remote Management**: Mengubah aspek rasio, interval sinkronisasi, status aktif, dan reset setting dari jauh secara terpusat per perangkat atau global.
*   [ ] **Remote Toggle Lock Settings**: Mengunci pengaturan lokal di STB agar pengguna biasa tidak bisa mengubah konfigurasi secara tidak sengaja.
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

### Relay IPTV UDP Multicast ke HLS

Jika playlist berisi URL `udp://@238.x.x.x:1234`, browser dan client di luar VLAN IPTV perlu HLS relay. Server Ubuntu dapat menjalankan relay otomatis dari M3U:

```bash
sudo env APP_DIR=/var/www/html/iptv-rsdk \
  M3U_URL=http://10.0.0.1/iptv/iptv_rsdk.m3u \
  LOCALADDR=10.0.0.199 \
  OUTPUT_ROOT=/var/www/html/landingpage/relay \
  ./scripts/iptv-relay-install.sh

sudo systemctl start iptv-relay-all
journalctl -u iptv-relay-all -f
```

Dashboard Devices -> `HLS Relay Base URL` harus mengarah ke root relay, contoh:

```text
http://10.55.1.5/relay
```
