# RSDK IPTV Player - REST API Specification

Dokumen ini mendefinisikan seluruh endpoint RESTful API yang digunakan untuk komunikasi antara client Android TV (STB) dan Web Admin Backend Server. Semua request dan response wajib menggunakan format **JSON** dengan header `Content-Type: application/json`.

---

## 📌 1. Registrasi Perangkat (Auto-Register)

Endpoint ini dipanggil pertama kali ketika aplikasi Android dibuka di perangkat STB baru, atau dipanggil setiap kali aplikasi pertama kali melakukan inisialisasi koneksi setelah booting.

*   **Endpoint:** `/api/device/register`
*   **Method:** `POST`
*   **Akses:** Terbuka (Tanpa Token/Auth untuk mempermudah Zero-Config)

### Request Payload:
```json
{
  "device_id": "STB-RSDK-A8F91C-9823-UUID",
  "device_name": "Living Room STB-X96",
  "app_version": "1.0.0",
  "android_version": "10",
  "mac_address": "00:1B:44:11:3A:B7", 
  "local_ip": "192.168.1.15"
}
```
*Note: `mac_address` bersifat opsional dan dikirim jika berhasil didapatkan, namun identifikasi utama wajib menggunakan UUID `device_id`.*

### Response (Perangkat Baru - Otomatis Aktif):
**HTTP Status:** `200 OK`
```json
{
  "status": true,
  "message": "Device registered and active",
  "data": {
    "device_id": "STB-RSDK-A8F91C-9823-UUID",
    "active": true,
    "sync_interval": 1800,
    "created_at": "2026-05-22T12:00:00+07:00"
  }
}
```

### Response (Perangkat Sudah Terdaftar tapi Dinonaktifkan Admin):
**HTTP Status:** `200 OK`
```json
{
  "status": false,
  "message": "Device has been deactivated by administrator",
  "data": {
    "device_id": "STB-RSDK-A8F91C-9823-UUID",
    "active": false,
    "sync_interval": 1800
  }
}
```

### Alur Logika Server:
1. Periksa apakah `device_id` sudah ada di tabel `devices`.
2. Jika **Belum Ada**:
   * Masukkan record baru ke database.
   * Atur kolom `is_active = 1` (Aktif secara default).
   * Atur profil konfigurasi global default ke perangkat tersebut.
   * Berikan response status `active = true`.
3. Jika **Sudah Ada**:
   * Perbarui kolom `last_online = NOW()`, `app_version`, `android_version`, `local_ip`, dan `mac_address`.
   * Periksa kolom `is_active`. Jika `is_active = 0`, return `active = false` agar perangkat diblokir di client.

---

## 📌 2. Konfigurasi Perangkat (Device Config)

Mendapatkan setelan pengaturan dinamis perangkat yang dikontrol penuh oleh Web Admin Panel.

*   **Endpoint:** `/api/device/config/{device_id}`
*   **Method:** `GET`

### Response Sukses:
**HTTP Status:** `200 OK`
```json
{
  "status": true,
  "message": "Config loaded successfully",
  "data": {
    "device_id": "STB-RSDK-A8F91C-9823-UUID",
    "active": true,
    "playlist_id": 1,
    "default_category": "National TV",
    "default_channel_id": 10,
    "aspect_ratio": "fit",
    "sync_interval": 1800,
    "start_screen": "live_tv",
    "lock_settings": true,
    "force_sync": false,
    "auto_start_on_boot": false,
    "technician_pin_enabled": true,
    "technician_pin": "2468"
  }
}
```

### Response Error (Perangkat Tidak Ditemukan):
**HTTP Status:** `404 Not Found`
```json
{
  "status": false,
  "message": "Device configuration not found",
  "data": null
}
```

### Keterangan Kolom Setelan:
| Key | Tipe | Deskripsi |
| :--- | :--- | :--- |
| `playlist_id` | Integer | ID playlist M3U aktif yang digunakan perangkat ini. |
| `default_category` | String | Nama kategori default yang otomatis dipilih saat pertama dibuka. |
| `default_channel_id`| Integer | ID Channel default yang langsung disetel/diputar saat start screen. |
| `aspect_ratio` | String | Pilihan rasio aspek video player (`fit`, `stretch`, `zoom`, `16_9`, `4_3`). |
| `sync_interval` | Integer | Interval sinkronisasi otomatis daftar channel dalam satuan detik (contoh: 1800s = 30 menit). |
| `start_screen` | String | Layar awal saat aplikasi terbuka (`live_tv`, `category_list`, `home_screen`). |
| `lock_settings` | Boolean | Jika `true`, memblokir akses menu konfigurasi lokal bagi user biasa. |
| `force_sync` | Boolean | Jika `true`, memaksa client menghapus cache lokal dan sinkronisasi ulang channel detik itu juga. |
| `auto_start_on_boot`| Boolean | Mengaktifkan/menonaktifkan fitur autostart setelah STB menyala. |
| `technician_pin` | String | PIN yang digunakan untuk masuk ke mode teknisi. Default `2468`. |

---

## 📌 3. Daftar Channel (Get Channels)

Mendapatkan semua daftar kategori dan channel TV yang telah di-parse oleh Web Admin dan ditugaskan ke perangkat ini berdasarkan `playlist_id` mereka.

*   **Endpoint:** `/api/device/channels/{device_id}`
*   **Method:** `GET`

### Response Sukses:
**HTTP Status:** `200 OK`
```json
{
  "status": true,
  "message": "Channels loaded successfully",
  "data": [
    {
      "id": 10,
      "name": "Trans TV HD",
      "logo": "http://10.55.1.5/rsdk-iptv/logos/transtv.png",
      "group": "National TV",
      "stream_url": "http://10.55.1.5/live/transtv/index.m3u8",
      "sort_order": 1,
      "active": true
    },
    {
      "id": 11,
      "name": "HBO Asia",
      "logo": "http://10.55.1.5/rsdk-iptv/logos/hbo.png",
      "group": "Movies",
      "stream_url": "http://10.55.1.5/live/hbo/index.m3u8",
      "sort_order": 2,
      "active": true
    },
    {
      "id": 12,
      "name": "Disney Channel",
      "logo": "http://10.55.1.5/rsdk-iptv/logos/disney.png",
      "group": "Kids",
      "stream_url": "http://10.55.1.5/live/disney/index.m3u8",
      "sort_order": 3,
      "active": false
    }
  ]
}
```
*Note: Hanya channel dengan status `active: true` yang akan ditampilkan di TV player utama client.*

---

## 📌 4. Detak Jantung / Status Heartbeat (Device Status)

Dikirim oleh client secara periodik (misal setiap 5-10 menit) untuk memperbarui indikator *Last Online*, memperbarui informasi IP, memantau channel apa yang sedang diputar, serta metrik kesehatan perangkat.

*   **Endpoint:** `/api/device/status`
*   **Method:** `POST`

### Request Payload:
```json
{
  "device_id": "STB-RSDK-A8F91C-9823-UUID",
  "current_channel_id": 10,
  "uptime_seconds": 3600,
  "memory_free_mb": 420,
  "cpu_usage_percent": 12.5,
  "local_ip": "192.168.1.15"
}
```

### Response Sukses:
**HTTP Status:** `200 OK`
```json
{
  "status": true,
  "message": "Heartbeat accepted",
  "data": {
    "force_sync": false,
    "lock_settings": true
  }
}
```

---

## 📌 5. Log Error Perangkat (Remote Logging)

Mengirimkan laporan error sistem, kendala pemutaran video stream (*playback error*), kegagalan koneksi database/API lokal dari client ke server Web Admin agar dapat di-troubleshoot dari jauh.

*   **Endpoint:** `/api/device/log`
*   **Method:** `POST`

### Request Payload:
```json
{
  "device_id": "STB-RSDK-A8F91C-9823-UUID",
  "error_type": "PLAYBACK_ERROR",
  "error_message": "ExoPlayer: BehindLiveWindowException - Source error occurred during playback",
  "channel_id": 11,
  "stream_url": "http://10.55.1.5/live/hbo/index.m3u8",
  "android_sdk": 29,
  "timestamp": "2026-05-22T12:05:40+07:00"
}
```

### Response Sukses:
**HTTP Status:** `200 OK`
```json
{
  "status": true,
  "message": "Error log recorded successfully"
}
```
