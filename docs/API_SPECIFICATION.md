# RSDK IPTV Player - REST API Specification

Dokumen ini mendefinisikan endpoint REST yang dipakai Android TV Client, Web Admin, update APK, remote control, dan relay stream. Semua endpoint JSON memakai `Content-Type: application/json`, kecuali upload APK dan file download.

---

## 1. Device Registration

**Endpoint:** `POST /api/device/register`  
**Akses:** Terbuka untuk Zero-Config client.

### Request
```json
{
  "device_id": "STB-RSDK-A8F91C-9823-UUID",
  "device_name": "Living Room STB-X96",
  "app_version": "v1.2.3",
  "android_version": "10",
  "mac_address": "00:1B:44:11:3A:B7",
  "local_ip": "192.168.1.15"
}
```

`device_id` wajib. Field lain opsional, tetapi Android client mengirimnya bila tersedia.

### Response
```json
{
  "status": true,
  "message": "Device registered and active",
  "data": {
    "device_id": "STB-RSDK-A8F91C-9823-UUID",
    "active": true,
    "sync_interval": 1800
  }
}
```

Untuk device yang sudah terdaftar tetapi dinonaktifkan admin, endpoint tetap mengembalikan HTTP `200` dengan `status: true`, `data.active: false`, dan message `Device registered but inactive`. Client memakai `active` untuk menampilkan status blokir.

Server juga mencoba mencocokkan `mac_address` saat `device_id` baru belum ditemukan, supaya reinstall APK bisa mempertahankan record/config device lama.

---

## 2. Device Config

**Endpoint:** `GET /api/device/config/{device_id}`

### Response Sukses
```json
{
  "status": true,
  "message": "Config loaded",
  "data": {
    "device_id": "STB-RSDK-A8F91C-9823-UUID",
    "active": true,
    "playlist_id": null,
    "sync_mode": "custom",
    "custom_m3u_url": "http://10.0.0.1/iptv/iptv_rsdk.m3u",
    "default_category": "National TV",
    "default_channel_id": null,
    "aspect_ratio": "fit",
    "sync_interval": 1800,
    "start_screen": "live_tv",
    "lock_settings": true,
    "force_sync": false,
    "clear_cache_trigger": false,
    "auto_start_on_boot": false,
    "technician_pin_enabled": true,
    "technician_pin": "2468",
    "education_video_path": "\\\\10.45.128.129\\edukasi",
    "education_smb_username": "",
    "education_smb_password": "",
    "education_smb_domain": "",
    "education_repeat_mode": "all",
    "education_play_order": "alphabetical",
    "education_source": "smb",
    "education_playback_mode": "copy",
    "education_force_sync": false
  }
}
```

### Response Error
Device tidak ditemukan mengembalikan HTTP `404` dengan message `Device not found`. Device inactive mengembalikan HTTP `403` dengan message `Device is inactive`.

### Keterangan Field Penting
| Key | Tipe | Deskripsi |
| --- | --- | --- |
| `sync_mode` | String | `custom`, `api`, atau `api_relay`. |
| `custom_m3u_url` | String | URL M3U yang dipakai saat `sync_mode = custom`. |
| `playlist_id` | Integer/null | ID global playlist saat mode API, atau `null` untuk custom. |
| `force_sync` | Boolean | Trigger sekali pakai untuk sync channel. Di-reset server setelah dikirim. |
| `clear_cache_trigger` | Boolean | Trigger sekali pakai untuk menghapus cache channel lokal. Di-reset server setelah dikirim. |
| `education_force_sync` | Boolean | Trigger sekali pakai untuk sync ulang cache video edukasi. Di-reset server setelah dikirim. |
| `education_source` | String | Sumber video edukasi (`smb` atau `web`). |
| `education_playback_mode` | String | Mode putar video edukasi (`copy` ke lokal atau `stream` langsung). |
| `education_*` | String | Path SMB, kredensial, repeat mode, dan urutan playlist edukasi. |
---

## 3. Device Channels

**Endpoint:** `GET /api/device/channels/{device_id}`

Jika `sync_mode = custom`, server mengembalikan `data: []`; client mengambil playlist dari `custom_m3u_url` pada config.

Jika `sync_mode = api`, server mengirim URL stream asli dari global playlist. Jika `sync_mode = api_relay`, URL stream UDP/remote dipetakan menjadi URL HLS relay on-demand.

### Response
```json
{
  "status": true,
  "message": "Channels loaded",
  "data": [
    {
      "id": 10,
      "name": "Trans TV HD",
      "logo": "http://10.55.1.5/logos/transtv.png",
      "group": "National TV",
      "stream_url": "https://iptv.teknisirsdk.my.id/api/stream/udp-hls/10/index.m3u8",
      "sort_order": 1,
      "active": true
    }
  ]
}
```

Hanya channel aktif dari global playlist yang dikirim oleh server.

---

## 4. Device Heartbeat

**Endpoint:** `POST /api/device/status`

### Request
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

### Response
```json
{
  "status": true,
  "message": "Heartbeat accepted",
  "data": {
    "force_sync": false,
    "lock_settings": true,
    "active": true
  }
}
```

Device tidak ditemukan mengembalikan HTTP `404`; client versi terbaru akan mencoba register ulang otomatis.

---

## 5. Device Logging

**Endpoint:** `POST /api/device/log`

### Request
```json
{
  "device_id": "STB-RSDK-A8F91C-9823-UUID",
  "error_type": "PLAYBACK_ERROR",
  "error_message": "ExoPlayer source error",
  "channel_id": 11,
  "stream_url": "http://10.55.1.5/live/hbo/index.m3u8",
  "android_sdk": 29,
  "timestamp": "2026-05-22T12:05:40+07:00"
}
```

`timestamp` dikirim client untuk konteks, tetapi waktu penyimpanan utama memakai `createdAt` database server.

---

## 6. App Update

### Check Update
**Endpoint:** `GET /api/app-update/check?versionCode={currentVersionCode}`

Response saat ada APK deployed yang lebih baru:
```json
{
  "status": true,
  "update_available": true,
  "version_name": "v1.2.3",
  "version_code": 123,
  "apk_url": "https://iptv.teknisirsdk.my.id/uploads/apk/app-release.apk",
  "apk_file_name": "app-release.apk",
  "is_mandatory": false,
  "changelog": "Perbaikan playback"
}
```

### Upload APK
**Endpoint:** `POST /api/app-update/upload`  
**Akses:** Web Admin.  
**Format:** `multipart/form-data` berisi file APK dan metadata versi. File tersimpan di `public/uploads/apk`.

### Download APK
**Endpoint:** `GET /uploads/apk/{filename}`  
Mengirim file APK yang sudah di-upload untuk proses update client.

---

## 7. Remote Control

Remote command memakai queue in-memory di proses Next.js. Queue akan hilang saat proses server restart, sehingga fitur ini cocok untuk kontrol langsung, bukan job permanen.

### Queue Command dari Web Admin
**Endpoint:** `POST /api/device/remote/send`

```json
{
  "deviceId": "STB-RSDK-A8F91C-9823-UUID",
  "command": "NAVIGATE_TV",
  "value": null
}
```

Command yang dipakai client saat ini:
`NAVIGATE_HOME`, `NAVIGATE_TV`, `NAVIGATE_EDUCATION`, `NAVIGATE_SETTINGS`, dan `PLAY_CHANNEL`.

### Poll Command dari Android
**Endpoint:** `GET /api/device/remote/poll?deviceId={deviceId}`

```json
{
  "status": true,
  "capture_screenshot": false,
  "commands": [
    {
      "command": "PLAY_CHANNEL",
      "value": "10"
    }
  ]
}
```

### Screenshot Remote
**Endpoint:** `POST /api/device/remote/screenshot`  
Web Admin menyalakan/mematikan permintaan screenshot aktif.

**Endpoint:** `GET /api/device/remote/screenshot?deviceId={deviceId}`  
Web Admin mengambil frame screenshot terbaru.

**Endpoint:** `POST /api/device/remote/screenshot/upload`  
Android mengirim screenshot base64:
```json
{
  "deviceId": "STB-RSDK-A8F91C-9823-UUID",
  "image": "data:image/jpeg;base64,..."
}
```

---

## 8. Stream Relay

### UDP HLS Manifest
**Endpoint:** `GET /api/stream/udp-hls/{channelId}/index.m3u8`

Memulai atau memakai ulang proses ffmpeg on-demand untuk channel UDP lalu mengembalikan manifest HLS.

### UDP HLS Segment
**Endpoint:** `GET /api/stream/udp-hls/{channelId}/segments/{fileName}`

Mengirim segment `.ts` hasil relay dari output root yang dikonfigurasi.

### Generic Relay
**Endpoint:** `GET /api/stream/relay?url={encodedUrl}`

Proxy ringan untuk preview stream HTTP/HLS tertentu dari dashboard.

---

## 9. Auth Web Admin

**Endpoint:** `POST /api/auth/login`  
Membuat cookie `admin_session` bila username/password valid.

**Endpoint:** `POST /api/auth/logout`  
Menghapus cookie `admin_session`.

Route `/dashboard/*` diproteksi oleh `src/proxy.ts` sesuai konvensi Next.js 16.

---

## 10. Education Videos Repository (Web)

Endpoint CRUD untuk mengelola video edukasi yang disimpan di repository web (Next.js server).

### Get Video List
**Endpoint:** `GET /api/education/videos`  
**Akses:** Terbuka untuk Android client dan Web Admin.

**Response:**
```json
{
  "status": true,
  "message": "Videos loaded",
  "folders": [
    {
      "id": 1,
      "name": "Pencegahan Infeksi",
      "video_count": 4
    }
  ],
  "data": [
    {
      "id": 1,
      "title": "Edukasi Kebersihan Gigi",
      "video_url": "/uploads/videos/1716301293_gigi.mp4",
      "thumbnail_url": "/uploads/video-thumbnails/1716301293_gigi.jpg",
      "folder_id": 1,
      "folder_name": "Pencegahan Infeksi",
      "createdAt": "2026-05-24T06:50:00.000Z"
    }
  ]
}
```

---

## 11. Entertainment Items

Endpoint untuk daftar item menu Hiburan Android. Item yang `isActive=false` atau URL kosong tidak dikirim ke client.

### Get Entertainment Items
**Endpoint:** `GET /api/entertainment/items`

**Response:**
```json
{
  "status": true,
  "message": "Entertainment items loaded",
  "data": [
    {
      "id": 1,
      "title": "SoundCloud",
      "subtitle": "Musik dan audio streaming",
      "url": "https://soundcloud.com",
      "content_type": "webview",
      "thumbnail_url": "/uploads/entertainment-thumbnails/default-soundcloud.svg",
      "sort_order": 10
    }
  ]
}
```

`content_type` mendukung `webview`, `media_player`, dan `m3u_player`.

### Add New Video
**Endpoint:** `POST /api/education/videos`  
**Format:** `multipart/form-data`  
**Payload:**
- `title` (String): Judul video.
- `folderId` (Int, opsional): Folder galeri tujuan.
- `videoUrl` (String, opsional): Link URL video jika beraliran langsung eksternal.
- `videoFile` (File, opsional): File MP4 video untuk diunggah ke server lokal.
- `thumbnailUrl` (String, opsional): URL thumbnail eksternal.
- `thumbnailFile` (File, opsional): Gambar thumbnail untuk diunggah ke server lokal.

### Update Video
**Endpoint:** `PUT /api/education/videos/{id}`  
**Format:** `multipart/form-data`  
**Payload:** Sama dengan POST, plus `removeThumbnail=on` untuk menghapus thumbnail.

### Delete Video
**Endpoint:** `DELETE /api/education/videos/{id}`  
**Akses:** Web Admin.  
**Response:**
```json
{
  "status": true,
  "message": "Video berhasil dihapus dari repository!"
}
```
