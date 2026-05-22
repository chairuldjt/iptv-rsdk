# RSDK IPTV Player - Backend Database & Web Admin Specifications

Dokumen ini mendokumentasikan desain database relasional (SQL) serta spesifikasi fungsional untuk sistem **Web Admin Panel & API Backend** (berbasis PHP/Laravel, Node.js, atau platform backend lainnya).

---

## 🗄️ 1. Desain Skema Database (ERD & SQL Tables)

Database menggunakan mesin **MySQL/MariaDB** yang sangat kompatibel dengan server lokal (misalnya XAMPP).

```
  ┌───────────────┐          ┌─────────────────┐
  │   playlists   │◄─────────┤   categories    │
  └───────┬───────┘          └────────┬────────┘
          │                           │
          │     ┌──────────────┐      │
          └────►│   channels   │◄─────┘
                └──────────────┘
                       ▲
                       │ stream_url/logo details
  ┌───────────────┐    │
  │    devices    │◄───┘ (reference key)
  └───────┬───────┘
          ├─────────────────────────┐
          ▼                         ▼
  ┌───────────────┐         ┌───────────────┐
  │device_configs │         │  device_logs  │
  └───────────────┘         └───────────────┘
```

### 1.1. Tabel `playlists`
Menyimpan file playlist M3U yang diunggah oleh admin untuk di-parse.
```sql
CREATE TABLE `playlists` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(150) NOT NULL,
  `file_path` VARCHAR(255) DEFAULT NULL, -- Path file lokal jika diunggah
  `source_url` VARCHAR(255) DEFAULT NULL, -- URL eksternal jika di-sync dari web lain
  `total_channels` INT DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### 1.2. Tabel `categories`
Kategori/Group TV yang didapatkan dari hasil parsing file M3U (tag `group-title`).
```sql
CREATE TABLE `categories` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `playlist_id` INT NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `sort_order` INT DEFAULT 0,
  `is_active` TINYINT(1) DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`playlist_id`) REFERENCES `playlists`(`id`) ON DELETE CASCADE
);
```

### 1.3. Tabel `channels`
Detail channel siaran TV yang diekstrak dari playlist M3U.
```sql
CREATE TABLE `channels` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `playlist_id` INT NOT NULL,
  `category_id` INT DEFAULT NULL,
  `name` VARCHAR(150) NOT NULL,
  `logo_url` VARCHAR(255) DEFAULT NULL, -- Tag tvg-logo
  `stream_url` VARCHAR(255) NOT NULL,
  `sort_order` INT DEFAULT 0,
  `is_active` TINYINT(1) DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`playlist_id`) REFERENCES `playlists`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON DELETE SET NULL
);
```

### 1.4. Tabel `devices`
Data perangkat STB yang terdaftar secara otomatis saat aplikasi dibuka.
```sql
CREATE TABLE `devices` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `device_id` VARCHAR(100) UNIQUE NOT NULL, -- UUID bentukan client
  `device_name` VARCHAR(100) DEFAULT 'Android STB',
  `is_active` TINYINT(1) DEFAULT 1, -- Default 1 (Auto-Active)
  `playlist_id` INT DEFAULT NULL, -- Null berarti memakai playlist default sistem
  `app_version` VARCHAR(20) DEFAULT NULL,
  `android_version` VARCHAR(15) DEFAULT NULL,
  `last_ip` VARCHAR(45) DEFAULT NULL,
  `mac_address` VARCHAR(50) DEFAULT NULL,
  `last_online` TIMESTAMP NULL DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`playlist_id`) REFERENCES `playlists`(`id`) ON DELETE SET NULL
);
```

### 1.5. Tabel `device_configs`
Pengaturan khusus per perangkat. Jika entry perangkat tidak ditemukan, sistem API akan menggunakan profil konfigurasi "Global Default" (record dengan `device_id = NULL`).
```sql
CREATE TABLE `device_configs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `device_id` VARCHAR(100) UNIQUE DEFAULT NULL, -- NULL = Default Global
  `default_category` VARCHAR(100) DEFAULT 'National TV',
  `default_channel_id` INT DEFAULT NULL,
  `aspect_ratio` ENUM('fit', 'stretch', 'zoom', '16_9', '4_3') DEFAULT 'fit',
  `sync_interval` INT DEFAULT 1800, -- Satuan detik
  `start_screen` ENUM('live_tv', 'category_list', 'home_screen') DEFAULT 'live_tv',
  `lock_settings` TINYINT(1) DEFAULT 1, -- Default Terkunci untuk keamanan
  `force_sync` TINYINT(1) DEFAULT 0,
  `auto_start_on_boot` TINYINT(1) DEFAULT 0,
  `technician_pin` VARCHAR(10) DEFAULT '2468',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`device_id`) REFERENCES `devices`(`device_id`) ON DELETE CASCADE
);
```

### 1.6. Tabel `device_logs`
Tempat menampung log error playback dan kendala sistem dari client untuk remote troubleshooting.
```sql
CREATE TABLE `device_logs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `device_id` VARCHAR(100) NOT NULL,
  `error_type` VARCHAR(50) NOT NULL,
  `error_message` TEXT NOT NULL,
  `channel_id` INT DEFAULT NULL,
  `stream_url` VARCHAR(255) DEFAULT NULL,
  `android_sdk` INT DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`device_id`) REFERENCES `devices`(`device_id`) ON DELETE CASCADE
);
```

---

## 🖥️ 2. Fitur Fungsional Web Admin Panel

Web Admin Panel dirancang dengan antarmuka berbasis web responsif modern untuk memudahkan operator mengontrol seluruh armada STB.

### 2.1. Parsing Playlist M3U Otomatis
*   **Fungsi**: Admin mengunggah file `.m3u` atau menempelkan link eksternal.
*   **Algoritma Parser**:
    1. Membaca tag `#EXTM3U` sebagai tanda file valid.
    2. Mencari tag `#EXTINF` untuk mengekstrak data channel:
       *   `tvg-logo="..."` -> Logo Channel.
       *   `group-title="..."` -> Nama Kategori.
       *   Nama Channel (teks setelah koma `,`).
    3. Baris berikutnya dibaca sebagai `stream_url`.
    4. **Proses Penyimpanan**: Kategori baru akan otomatis dibuat jika belum ada di tabel `categories`, lalu channel akan dimasukkan ke tabel `channels` dan dihubungkan ke kategori tersebut.

### 2.2. Panel Manajemen Perangkat (Device Management)
*   **Daftar Perangkat**: Menampilkan seluruh STB dalam bentuk tabel dengan indikator status online/offline real-time.
    *   *Status Online*: Jika `last_online` kurang dari (waktu sekarang - 2x `sync_interval`).
    *   *Status Offline*: Jika `last_online` melebihi batas detak jantung tersebut.
*   **Aktivasi / Deaktivasi**: Satu klik tombol toggle untuk menonaktifkan perangkat (`is_active = 0`). STB yang dideaktivasi akan langsung menampilkan layar blokir di TV-nya saat melakukan *handshake* atau *heartbeat* berikutnya.
*   **Custom Override Config**: Admin dapat memilih perangkat tertentu dan menimpa (override) konfigurasinya berbeda dengan setelan global (misal: memberikan aspek rasio `stretch` hanya untuk STB tipe lama, atau mengubah PIN teknisi khusus perangkat tertentu).

### 2.3. Manajemen Channel & Kategori
*   **Toggle Status**: Menonaktifkan channel rusak secara instan agar hilang dari daftar TV pengguna tanpa harus mengunggah ulang playlist M3U.
*   **Urutan Tontonan (Sort Order)**: Mengatur urutan nomor urut channel dengan mudah (drag-and-drop atau input nomor) agar siaran favorit selalu tampil paling atas.

### 2.4. Remote Monitoring & Log Viewer
*   **Live Error Monitor**: Menampilkan tabel log error dari seluruh STB. Admin dapat dengan mudah melihat pesan error ExoPlayer seperti `BehindLiveWindowException` (siaran putus) atau `Source Error` (URL mati) beserta info channel dan IP STB pelapor.
*   **IP Tracker**: Memantau alamat IP terakhir STB untuk mencocokkan segmen jaringan area distribusi lokal.
